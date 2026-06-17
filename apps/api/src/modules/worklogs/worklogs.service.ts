import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import {
  WorkspaceRole,
  WorkLogStatus,
  NotificationType,
  RT_EVENTS,
  WorkLog as WorkLogDto,
  Challenge as ChallengeDto,
  ChallengeProgress,
  ChallengeCalendarDay,
} from '@manatask/shared';
import { WorkLog, WorkspaceMember, Challenge } from '../../database/entities';
import { toUserPublic } from '../../common/mappers';
import { sanitizeRichText } from '../../common/util';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateWorkLogBody, UpdateWorkLogBody, WorkLogQuery } from './dto';

// Default challenge if none configured: 2026-06-18 → 2026-12-31, 100 days.
const DEFAULT_CHALLENGE = { title: '100-Day Challenge', startDate: '2026-06-18', endDate: '2026-12-31', target: 100 };

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(start + 'T00:00:00Z');
  const last = new Date(end + 'T00:00:00Z');
  while (d <= last) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

@Injectable()
export class WorkLogsService {
  constructor(
    @InjectRepository(WorkLog) private logs: Repository<WorkLog>,
    @InjectRepository(WorkspaceMember) private members: Repository<WorkspaceMember>,
    @InjectRepository(Challenge) private challenges: Repository<Challenge>,
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
      status: w.status,
      reviewedAt: w.reviewedAt ? new Date(w.reviewedAt).toISOString() : null,
      reviewedByName: w.reviewedBy?.name ?? null,
      createdAt: new Date(w.createdAt).toISOString(),
    };
  }

  async getOne(workspaceId: string, id: string): Promise<WorkLogDto> {
    const log = await this.logs.findOne({
      where: { id, workspaceId },
      relations: { user: true, project: true, reviewedBy: true },
    });
    if (!log) throw new NotFoundException('Work log not found.');
    return this.toDto(log);
  }

  // ---- Challenge ----
  private toChallengeDto(c: Challenge): ChallengeDto {
    return { id: c.id, title: c.title, startDate: c.startDate, endDate: c.endDate, target: c.target, active: c.active };
  }

  /** The active challenge, auto-creating the default one on first access. */
  async getOrCreateChallenge(workspaceId: string): Promise<Challenge> {
    let c = await this.challenges.findOne({ where: { workspaceId, active: true }, order: { createdAt: 'DESC' } });
    if (!c) {
      c = await this.challenges.save(this.challenges.create({ workspaceId, ...DEFAULT_CHALLENGE, active: true }));
    }
    return c;
  }

  async getChallenge(workspaceId: string): Promise<ChallengeDto> {
    return this.toChallengeDto(await this.getOrCreateChallenge(workspaceId));
  }

  async upsertChallenge(
    workspaceId: string,
    body: { title?: string; startDate?: string; endDate?: string; target?: number },
  ): Promise<ChallengeDto> {
    const c = await this.getOrCreateChallenge(workspaceId);
    if (body.title !== undefined) c.title = body.title;
    if (body.startDate !== undefined) c.startDate = body.startDate;
    if (body.endDate !== undefined) c.endDate = body.endDate;
    if (body.target !== undefined) c.target = body.target;
    await this.challenges.save(c);
    return this.toChallengeDto(c);
  }

  /** Per-day calendar + accepted count for a user across the challenge window. */
  async progress(workspaceId: string, userId: string): Promise<ChallengeProgress> {
    const challenge = await this.getOrCreateChallenge(workspaceId);
    const member = await this.members.findOne({ where: { workspaceId, userId } });
    const rows = await this.logs.find({
      where: { workspaceId, userId, workedOn: Between(challenge.startDate, challenge.endDate) },
    });

    // Reduce each day to a single status (accepted > pending > rejected).
    const byDay = new Map<string, { accepted: number; pending: number; rejected: number }>();
    for (const r of rows) {
      const e = byDay.get(r.workedOn) ?? { accepted: 0, pending: 0, rejected: 0 };
      e[r.status] += 1;
      byDay.set(r.workedOn, e);
    }

    const days: ChallengeCalendarDay[] = eachDay(challenge.startDate, challenge.endDate).map((date) => {
      const e = byDay.get(date);
      let status: WorkLogStatus | 'none' = 'none';
      let count = 0;
      if (e) {
        count = e.accepted + e.pending + e.rejected;
        status = e.accepted ? WorkLogStatus.ACCEPTED : e.pending ? WorkLogStatus.PENDING : WorkLogStatus.REJECTED;
      }
      return { date, status, count };
    });

    const accepted = days.filter((d) => d.status === WorkLogStatus.ACCEPTED).length;
    const pending = days.filter((d) => d.status === WorkLogStatus.PENDING).length;

    return {
      challenge: this.toChallengeDto(challenge),
      user: toUserPublic(member?.user ?? null) ?? { id: userId, name: '', email: '', avatarUrl: null, locale: 'uz', emailVerified: false },
      accepted,
      pending,
      target: challenge.target,
      days,
    };
  }

  /** Accept/reject a work log. Owners/admins only. */
  async review(workspaceId: string, reviewerId: string, id: string, decision: 'accept' | 'reject') {
    const log = await this.logs.findOne({ where: { id, workspaceId }, relations: { user: true, project: true } });
    if (!log) throw new NotFoundException('Work log not found.');
    log.status = decision === 'accept' ? WorkLogStatus.ACCEPTED : WorkLogStatus.REJECTED;
    log.reviewedById = reviewerId;
    log.reviewedAt = new Date();
    await this.logs.save(log);
    const full = await this.logs.findOne({ where: { id }, relations: { user: true, project: true, reviewedBy: true } });
    const dto = this.toDto(full!);

    this.realtime.emitToWorkspace(workspaceId, RT_EVENTS.WORKLOG_REVIEWED, dto);

    // Tell the worker (with their updated streak count) — unless they reviewed their own.
    if (log.userId !== reviewerId) {
      const accepted = decision === 'accept' ? (await this.progress(workspaceId, log.userId)).accepted : null;
      await this.notifications.create(log.userId, {
        workspaceId,
        type: NotificationType.WORKLOG_REVIEWED,
        title: decision === 'accept' ? `Work accepted (${accepted}/${(await this.getOrCreateChallenge(workspaceId)).target})` : 'Work needs revision',
        body: log.title,
        data: { workLogId: log.id, status: log.status },
      });
    }
    return dto;
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
      .leftJoinAndSelect('w.reviewedBy', 'reviewedBy')
      .where('w.workspaceId = :workspaceId', { workspaceId });

    if (q.userId) qb.andWhere('w.userId = :userId', { userId: q.userId });
    if (q.status) qb.andWhere('w.status = :status', { status: q.status });
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
