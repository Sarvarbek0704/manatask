import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';
import {
  NotificationType,
  ActivityAction,
  RT_EVENTS,
  Paginated,
  Task as TaskDto,
  WorkspaceRole,
} from '@manatask/shared';
import {
  Task,
  Project,
  ProjectStatus,
  Label,
  Comment,
  Attachment,
  TimeEntry,
  TaskDependency,
  User,
} from '../../database/entities';
import { DependencyType } from '@manatask/shared';
import { toTask, TaskCounts } from '../../common/mappers';
import { ORDER_STEP, sanitizeRichText } from '../../common/util';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { AutomationService } from '../automation/automation.service';
import { CreateTaskBody, UpdateTaskBody, MoveTaskBody, TaskQueryParams } from './dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(ProjectStatus) private statuses: Repository<ProjectStatus>,
    @InjectRepository(Label) private labels: Repository<Label>,
    @InjectRepository(Comment) private comments: Repository<Comment>,
    @InjectRepository(Attachment) private attachments: Repository<Attachment>,
    @InjectRepository(TimeEntry) private timeEntries: Repository<TimeEntry>,
    @InjectRepository(TaskDependency) private dependencies: Repository<TaskDependency>,
    @InjectRepository(User) private users: Repository<User>,
    private dataSource: DataSource,
    private realtime: RealtimeGateway,
    private notifications: NotificationsService,
    private activity: ActivityService,
    private webhooks: WebhooksService,
    private automation: AutomationService,
  ) {}

  async create(workspaceId: string, actorId: string, body: CreateTaskBody): Promise<TaskDto> {
    const project = await this.projects.findOne({
      where: { id: body.projectId, workspaceId },
      relations: { statuses: true },
    });
    if (!project) throw new NotFoundException('Project not found.');

    const statusId = body.statusId ?? this.firstStatusId(project);
    if (!statusId) throw new BadRequestException('Project has no statuses.');

    const order = await this.nextOrder(body.projectId, statusId);
    const labels = body.labelIds?.length
      ? await this.labels.findBy({ id: In(body.labelIds), workspaceId })
      : [];
    const assignees = body.assigneeIds?.length
      ? await this.users.findBy({ id: In(body.assigneeIds) })
      : [];

    // Counter increment + insert in one transaction so a failed insert doesn't
    // burn a task number (no gaps in PROJ-N sequences).
    const task = await this.dataSource.transaction(async (mgr) => {
      const inc = await mgr
        .createQueryBuilder()
        .update(Project)
        .set({ taskCounter: () => '"taskCounter" + 1' })
        .where('id = :id', { id: project.id })
        .returning('"taskCounter"')
        .execute();
      const number: number = inc.raw[0].taskCounter;
      return mgr.getRepository(Task).save(
        mgr.getRepository(Task).create({
          workspaceId,
          projectId: body.projectId,
          number,
          title: body.title,
          description: sanitizeRichText(body.description) ?? null,
          statusId,
          priority: body.priority ?? undefined,
          assigneeId: body.assigneeId ?? null,
          reporterId: actorId,
          sprintId: body.sprintId ?? null,
          parentId: body.parentId ?? null,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          startDate: body.startDate ? new Date(body.startDate) : null,
          estimateMinutes: body.estimateMinutes ?? null,
          order,
          labels,
          assignees,
          customFields: body.customFields ?? null,
        }),
      );
    });

    const full = await this.getEntity(workspaceId, task.id);
    const dto = toTask(full);

    await this.activity.record({
      workspaceId,
      actorId,
      action: ActivityAction.CREATED,
      entityType: 'task',
      entityId: task.id,
      meta: { title: task.title },
    });
    this.realtime.emitToWorkspace(workspaceId, RT_EVENTS.TASK_CREATED, dto);
    void this.webhooks.dispatch(workspaceId, RT_EVENTS.TASK_CREATED, dto);
    void this.automation.evaluate(full, 'task.created');
    if (task.assigneeId && task.assigneeId !== actorId) {
      await this.notifyAssignment(workspaceId, full);
    }
    return dto;
  }

  async query(workspaceId: string, q: TaskQueryParams): Promise<Paginated<TaskDto>> {
    const page = Math.max(1, Number(q.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || 100));

    const qb = this.tasks
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.status', 'status')
      .leftJoinAndSelect('t.assignee', 'assignee')
      .leftJoinAndSelect('t.reporter', 'reporter')
      .leftJoinAndSelect('t.labels', 'labels')
      .where('t.workspaceId = :workspaceId', { workspaceId });

    if (q.projectId) qb.andWhere('t.projectId = :projectId', { projectId: q.projectId });
    if (q.assigneeId) qb.andWhere('t.assigneeId = :assigneeId', { assigneeId: q.assigneeId });
    if (q.sprintId) qb.andWhere('t.sprintId = :sprintId', { sprintId: q.sprintId });
    if (q.priority) qb.andWhere('t.priority = :priority', { priority: q.priority });
    if (q.statusCategory) qb.andWhere('status.category = :cat', { cat: q.statusCategory });
    if (q.parentId === 'null') qb.andWhere('t.parentId IS NULL');
    else if (q.parentId) qb.andWhere('t.parentId = :parentId', { parentId: q.parentId });
    if (q.dueBefore) qb.andWhere('t.dueDate <= :dueBefore', { dueBefore: q.dueBefore });
    if (q.labelId) qb.andWhere('labels.id = :labelId', { labelId: q.labelId });
    if (q.search) {
      qb.andWhere('(t.title ILIKE :s OR t.description ILIKE :s)', { s: `%${q.search}%` });
    }

    qb.orderBy('t.order', 'ASC').addOrderBy('t.createdAt', 'DESC');

    const [rows, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const counts = await this.computeCounts(rows.map((r) => r.id));
    return {
      items: rows.map((t) => toTask(t, counts[t.id])),
      total,
      page,
      pageSize,
    };
  }

  async getOne(workspaceId: string, id: string): Promise<TaskDto> {
    const task = await this.getEntity(workspaceId, id);
    const counts = await this.computeCounts([id]);
    const dto = toTask(task, counts[id]);
    dto.checklist = (task.checklist ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ id: c.id, text: c.text, done: c.done, order: c.order }));

    // Populate dependencies (the list mapper leaves these empty for performance).
    const deps = await this.dependencies.find({
      where: { sourceTaskId: id },
      relations: { targetTask: true },
    });
    dto.dependencies = deps.map((d) => ({
      id: d.id,
      type: d.type as DependencyType,
      targetTaskId: d.targetTaskId,
      targetTaskNumber: d.targetTask?.number ?? 0,
      targetTitle: d.targetTask?.title ?? '',
    }));
    return dto;
  }

  async update(
    workspaceId: string,
    actorId: string,
    role: WorkspaceRole,
    id: string,
    body: UpdateTaskBody,
  ): Promise<TaskDto> {
    const task = await this.getEntity(workspaceId, id);
    // Optimistic concurrency: reject stale writes when the client sent a version.
    if (body.version !== undefined && body.version !== task.version) {
      throw new ConflictException('Task was modified by someone else. Please reload.');
    }
    // Changing status is restricted to the assignee (owner/admin exempt).
    if (body.statusId !== undefined && body.statusId !== task.statusId) {
      await this.assertCanSetStatus(workspaceId, id, actorId, role);
    }
    const prevAssignee = task.assigneeId;
    const prevStatus = task.statusId;
    // Snapshot auditable fields BEFORE mutation for an old→new diff.
    const before: Record<string, unknown> = {
      title: task.title,
      statusId: task.statusId,
      priority: task.priority,
      assigneeId: task.assigneeId,
      sprintId: task.sprintId,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
      estimateMinutes: task.estimateMinutes,
    };

    if (body.title !== undefined) task.title = body.title;
    if (body.description !== undefined) task.description = sanitizeRichText(body.description);
    if (body.priority !== undefined) task.priority = body.priority;
    if (body.assigneeId !== undefined) task.assigneeId = body.assigneeId;
    if (body.sprintId !== undefined) task.sprintId = body.sprintId;
    if (body.dueDate !== undefined) task.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.startDate !== undefined) task.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.estimateMinutes !== undefined) task.estimateMinutes = body.estimateMinutes;
    if (body.statusId !== undefined) {
      const status = await this.assertStatus(task.projectId, body.statusId);
      task.status = status;
      task.statusId = status.id;
    }
    if (body.labelIds !== undefined) {
      task.labels = body.labelIds.length
        ? await this.labels.findBy({ id: In(body.labelIds), workspaceId })
        : [];
    }
    if (body.assigneeIds !== undefined) {
      task.assignees = body.assigneeIds.length
        ? await this.users.findBy({ id: In(body.assigneeIds) })
        : [];
    }
    if (body.customFields !== undefined) {
      task.customFields = { ...(task.customFields ?? {}), ...body.customFields };
    }

    await this.tasks.save(task);
    const full = await this.getEntity(workspaceId, id);
    const counts = await this.computeCounts([id]);
    const dto = toTask(full, counts[id]);

    // Build a field-level old→new diff for the audit trail.
    const after: Record<string, unknown> = {
      title: full.title,
      statusId: full.statusId,
      priority: full.priority,
      assigneeId: full.assigneeId,
      sprintId: full.sprintId,
      dueDate: full.dueDate ? new Date(full.dueDate).toISOString() : null,
      estimateMinutes: full.estimateMinutes,
    };
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(before)) {
      if (before[key] !== after[key]) changes[key] = { from: before[key], to: after[key] };
    }

    await this.activity.record({
      workspaceId,
      actorId,
      action: prevStatus !== full.statusId ? ActivityAction.STATUS_CHANGED : ActivityAction.UPDATED,
      entityType: 'task',
      entityId: id,
      meta: { changes },
    });
    this.realtime.emitToWorkspace(workspaceId, RT_EVENTS.TASK_UPDATED, dto);
    this.realtime.emitToTask(id, RT_EVENTS.TASK_UPDATED, dto);
    void this.webhooks.dispatch(workspaceId, RT_EVENTS.TASK_UPDATED, dto);
    void this.automation.evaluate(full, 'task.updated');

    if (full.assigneeId && full.assigneeId !== prevAssignee && full.assigneeId !== actorId) {
      await this.notifyAssignment(workspaceId, full);
    }
    return dto;
  }

  async move(
    workspaceId: string,
    actorId: string,
    role: WorkspaceRole,
    id: string,
    body: MoveTaskBody,
  ): Promise<TaskDto> {
    const task = await this.getEntity(workspaceId, id);
    await this.assertCanSetStatus(workspaceId, id, actorId, role);
    const status = await this.assertStatus(task.projectId, body.statusId);
    // `status` is eager-loaded — update the relation too, otherwise TypeORM
    // writes the stale relation's id back and the move silently reverts.
    task.status = status;
    task.statusId = status.id;
    task.order = body.order;
    await this.tasks.save(task);
    const dto = toTask(await this.getEntity(workspaceId, id), await this.singleCounts(id));

    await this.activity.record({
      workspaceId,
      actorId,
      action: ActivityAction.MOVED,
      entityType: 'task',
      entityId: id,
      meta: { statusId: body.statusId },
    });
    this.realtime.emitToWorkspace(workspaceId, RT_EVENTS.TASK_UPDATED, dto);
    return dto;
  }

  async remove(workspaceId: string, actorId: string, id: string) {
    const task = await this.getEntity(workspaceId, id);
    // Soft delete — keeps history/audit; excluded from normal queries.
    await this.tasks.softRemove(task);
    await this.activity.record({
      workspaceId,
      actorId,
      action: ActivityAction.DELETED,
      entityType: 'task',
      entityId: id,
    });
    this.realtime.emitToWorkspace(workspaceId, RT_EVENTS.TASK_DELETED, { id });
    void this.webhooks.dispatch(workspaceId, RT_EVENTS.TASK_DELETED, { id });
    return { ok: true };
  }

  async listActivity(workspaceId: string, id: string) {
    await this.getEntity(workspaceId, id);
    return this.activity.forEntity(workspaceId, 'task', id);
  }

  async listTrash(workspaceId: string, projectId?: string) {
    const rows = await this.tasks.find({
      where: { workspaceId, deletedAt: Not(IsNull()), ...(projectId ? { projectId } : {}) },
      withDeleted: true,
      order: { deletedAt: 'DESC' },
      take: 200,
    });
    const counts = await this.computeCounts(rows.map((r) => r.id));
    return rows.map((t) => toTask(t, counts[t.id]));
  }

  async restore(workspaceId: string, actorId: string, id: string): Promise<TaskDto> {
    const task = await this.tasks.findOne({ where: { id, workspaceId }, withDeleted: true });
    if (!task) throw new NotFoundException('Task not found.');
    await this.tasks.restore({ id, workspaceId });
    await this.activity.record({
      workspaceId,
      actorId,
      action: ActivityAction.UPDATED,
      entityType: 'task',
      entityId: id,
      meta: { restored: true },
    });
    return this.getOne(workspaceId, id);
  }

  async listSubtasks(workspaceId: string, parentId: string) {
    await this.getEntity(workspaceId, parentId);
    const rows = await this.tasks.find({
      where: { workspaceId, parentId },
      order: { order: 'ASC' },
    });
    const counts = await this.computeCounts(rows.map((r) => r.id));
    return rows.map((t) => toTask(t, counts[t.id]));
  }

  // ---- helpers ----
  async getEntity(workspaceId: string, id: string): Promise<Task> {
    const task = await this.tasks.findOne({
      where: { id, workspaceId },
      relations: { checklist: true },
    });
    if (!task) throw new NotFoundException('Task not found.');
    return task;
  }

  /**
   * Only the task's assignee may change its status. Owners and admins are
   * exempt (they manage the whole board).
   */
  private async assertCanSetStatus(
    workspaceId: string,
    id: string,
    actorId: string,
    role: WorkspaceRole,
  ): Promise<void> {
    if (role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN) return;
    const t = await this.tasks.findOne({
      where: { id, workspaceId },
      relations: { assignees: true },
    });
    const isAssignee =
      !!t && (t.assigneeId === actorId || (t.assignees ?? []).some((a) => a.id === actorId));
    if (!isAssignee) {
      throw new ForbiddenException(
        'Only the assignee or an admin can change this task’s status.',
      );
    }
  }

  private firstStatusId(project: Project): string | undefined {
    const sorted = (project.statuses ?? []).slice().sort((a, b) => a.order - b.order);
    return sorted[0]?.id;
  }

  private async assertStatus(projectId: string, statusId: string): Promise<ProjectStatus> {
    const ok = await this.statuses.findOne({ where: { id: statusId, projectId } });
    if (!ok) throw new BadRequestException('Status does not belong to this project.');
    return ok;
  }

  private async nextOrder(projectId: string, statusId: string): Promise<number> {
    const row = await this.tasks
      .createQueryBuilder('t')
      .where('t.projectId = :projectId AND t.statusId = :statusId', { projectId, statusId })
      .select('COALESCE(MAX(t.order), 0)', 'max')
      .getRawOne<{ max: number }>();
    return Number(row?.max ?? 0) + ORDER_STEP;
  }

  private async notifyAssignment(workspaceId: string, task: Task) {
    if (!task.assigneeId) return;
    await this.notifications.create(task.assigneeId, {
      workspaceId,
      type: NotificationType.TASK_ASSIGNED,
      title: `Assigned: ${task.title}`,
      body: `You were assigned a task.`,
      data: { taskId: task.id, projectId: task.projectId },
    });
  }

  private async singleCounts(id: string): Promise<TaskCounts> {
    return (await this.computeCounts([id]))[id] ?? {};
  }

  /** Batched counts (comments, attachments, subtasks, time) keyed by task id. */
  private async computeCounts(ids: string[]): Promise<Record<string, TaskCounts>> {
    const result: Record<string, TaskCounts> = {};
    if (!ids.length) return result;
    ids.forEach((id) => (result[id] = { subtaskCount: 0, commentCount: 0, attachmentCount: 0, spentMinutes: 0 }));

    const group = async (
      repo: Repository<any>,
      column: string,
      agg: string,
      key: keyof TaskCounts,
    ) => {
      const rows = await repo
        .createQueryBuilder('x')
        .select(`x.${column}`, 'k')
        .addSelect(agg, 'v')
        .where(`x.${column} IN (:...ids)`, { ids })
        .groupBy(`x.${column}`)
        .getRawMany<{ k: string; v: string }>();
      rows.forEach((r) => {
        if (result[r.k]) (result[r.k][key] as number) = Number(r.v);
      });
    };

    await group(this.comments, 'taskId', 'COUNT(*)', 'commentCount');
    await group(this.attachments, 'taskId', 'COUNT(*)', 'attachmentCount');
    await group(this.timeEntries, 'taskId', 'COALESCE(SUM(x.minutes),0)', 'spentMinutes');
    await group(this.tasks, 'parentId', 'COUNT(*)', 'subtaskCount');
    return result;
  }
}
