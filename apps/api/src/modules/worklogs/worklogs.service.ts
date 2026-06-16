import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  WorkspaceRole,
  NotificationType,
  RT_EVENTS,
  WorkLog as WorkLogDto,
} from '@manatask/shared';
import { WorkLog, WorkspaceMember } from '../../database/entities';
import { toUserPublic } from '../../common/mappers';
import { sanitizeRichText } from '../../common/util';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateWorkLogBody, UpdateWorkLogBody, WorkLogQuery } from './dto';

@Injectable()
export class WorkLogsService {
  constructor(
    @InjectRepository(WorkLog) private logs: Repository<WorkLog>,
    @InjectRepository(WorkspaceMember) private members: Repository<WorkspaceMember>,
    private realtime: RealtimeGateway,
    private notifications: NotificationsService,
  ) {}

  private toDto(w: WorkLog): WorkLogDto {
    return {
      id: w.id,
      author: toUserPublic(w.user)!,
      projectId: w.projectId ?? null,
      projectName: w.project?.name ?? null,
      projectColor: w.project?.color ?? null,
      taskId: w.taskId ?? null,
      title: w.title,
      body: w.body ?? null,
      minutes: w.minutes ?? null,
      workedOn: w.workedOn,
      createdAt: new Date(w.createdAt).toISOString(),
    };
  }

  async create(workspaceId: string, userId: string, body: CreateWorkLogBody) {
    const saved = await this.logs.save(
      this.logs.create({
        workspaceId,
        userId,
        projectId: body.projectId ?? null,
        taskId: body.taskId ?? null,
        title: body.title.trim(),
        body: sanitizeRichText(body.body) ?? null,
        minutes: body.minutes ?? null,
        workedOn: body.workedOn ?? new Date().toISOString().slice(0, 10),
      }),
    );
    const full = await this.logs.findOne({ where: { id: saved.id }, relations: { project: true } });
    const dto = this.toDto(full!);

    this.realtime.emitToWorkspace(workspaceId, RT_EVENTS.WORKLOG_CREATED, dto);

    // Notify owners & admins so management gets visibility automatically.
    const leaders = await this.members.find({
      where: { workspaceId, role: In([WorkspaceRole.OWNER, WorkspaceRole.ADMIN]) },
    });
    await Promise.all(
      leaders
        .filter((m) => m.userId !== userId)
        .map((m) =>
          this.notifications.create(m.userId, {
            workspaceId,
            type: NotificationType.WORKLOG_POSTED,
            title: `${dto.author.name} logged work`,
            body: dto.title,
            data: { workLogId: dto.id, userId },
          }),
        ),
    );
    return dto;
  }

  async list(workspaceId: string, q: WorkLogQuery) {
    const page = Math.max(1, Number(q.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(q.pageSize) || 20));
    const qb = this.logs
      .createQueryBuilder('w')
      .leftJoinAndSelect('w.user', 'user')
      .leftJoinAndSelect('w.project', 'project')
      .where('w.workspaceId = :workspaceId', { workspaceId });

    if (q.userId) qb.andWhere('w.userId = :userId', { userId: q.userId });
    if (q.projectId) qb.andWhere('w.projectId = :projectId', { projectId: q.projectId });
    if (q.from) qb.andWhere('w.workedOn >= :from', { from: q.from });
    if (q.to) qb.andWhere('w.workedOn <= :to', { to: q.to });

    const [rows, total] = await qb
      .orderBy('w.workedOn', 'DESC')
      .addOrderBy('w.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { items: rows.map((r) => this.toDto(r)), total, page, pageSize };
  }

  /** Per-member rollup (entries, minutes, last activity) for an optional range. */
  async summary(workspaceId: string, q: { from?: string; to?: string }) {
    const qb = this.logs
      .createQueryBuilder('w')
      .leftJoin('w.user', 'u')
      .where('w.workspaceId = :workspaceId', { workspaceId });
    if (q.from) qb.andWhere('w.workedOn >= :from', { from: q.from });
    if (q.to) qb.andWhere('w.workedOn <= :to', { to: q.to });

    const rows = await qb
      .select('u.id', 'id')
      .addSelect('u.name', 'name')
      .addSelect('u.email', 'email')
      .addSelect('u.avatarUrl', 'avatarUrl')
      .addSelect('u.locale', 'locale')
      .addSelect('COUNT(*)', 'entries')
      .addSelect('COALESCE(SUM(w.minutes),0)', 'minutes')
      .addSelect('MAX(w.workedOn)', 'lastWorkedOn')
      .groupBy('u.id')
      .addGroupBy('u.name')
      .addGroupBy('u.email')
      .addGroupBy('u.avatarUrl')
      .addGroupBy('u.locale')
      .orderBy('entries', 'DESC')
      .getRawMany<any>();

    return rows.map((r) => ({
      user: { id: r.id, name: r.name, email: r.email, avatarUrl: r.avatarUrl ?? null, locale: r.locale ?? 'uz' },
      entries: Number(r.entries),
      minutes: Number(r.minutes),
      lastWorkedOn: r.lastWorkedOn ?? null,
    }));
  }

  async update(workspaceId: string, userId: string, id: string, body: UpdateWorkLogBody) {
    const log = await this.logs.findOne({ where: { id, workspaceId } });
    if (!log) throw new NotFoundException('Work log not found.');
    if (log.userId !== userId) throw new ForbiddenException('You can only edit your own work logs.');
    if (body.title !== undefined) log.title = body.title.trim();
    if (body.body !== undefined) log.body = sanitizeRichText(body.body) ?? null;
    if (body.minutes !== undefined) log.minutes = body.minutes;
    if (body.projectId !== undefined) log.projectId = body.projectId;
    if (body.workedOn !== undefined) log.workedOn = body.workedOn;
    await this.logs.save(log);
    const full = await this.logs.findOne({ where: { id }, relations: { project: true } });
    return this.toDto(full!);
  }

  async remove(workspaceId: string, userId: string, role: WorkspaceRole, id: string) {
    const log = await this.logs.findOne({ where: { id, workspaceId } });
    if (!log) throw new NotFoundException('Work log not found.');
    const isLeader = role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;
    if (log.userId !== userId && !isLeader) {
      throw new ForbiddenException('Not allowed.');
    }
    await this.logs.remove(log);
    return { ok: true };
  }
}
