import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationType,
  ActivityAction,
  RT_EVENTS,
  DependencyType,
} from '@manatask/shared';
import {
  Task,
  Comment,
  ChecklistItem,
  TimeEntry,
  TaskDependency,
  WorkspaceMember,
} from '../../database/entities';
import { toComment } from '../../common/mappers';
import { sanitizeRichText, parseMentions } from '../../common/util';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import {
  CreateCommentBody,
  CreateChecklistItemBody,
  UpdateChecklistItemBody,
  CreateDependencyBody,
  LogTimeBody,
} from './dto';

@Injectable()
export class TaskItemsService {
  constructor(
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(Comment) private comments: Repository<Comment>,
    @InjectRepository(ChecklistItem) private checklist: Repository<ChecklistItem>,
    @InjectRepository(TimeEntry) private timeEntries: Repository<TimeEntry>,
    @InjectRepository(TaskDependency) private deps: Repository<TaskDependency>,
    @InjectRepository(WorkspaceMember) private members: Repository<WorkspaceMember>,
    private realtime: RealtimeGateway,
    private notifications: NotificationsService,
    private activity: ActivityService,
  ) {}

  private async getTask(workspaceId: string, taskId: string): Promise<Task> {
    const task = await this.tasks.findOne({ where: { id: taskId, workspaceId } });
    if (!task) throw new NotFoundException('Task not found.');
    return task;
  }

  // ---- Comments ----
  async listComments(workspaceId: string, taskId: string) {
    await this.getTask(workspaceId, taskId);
    const items = await this.comments.find({
      where: { taskId },
      order: { createdAt: 'ASC' },
    });
    return items.map(toComment);
  }

  async addComment(workspaceId: string, actorId: string, taskId: string, body: CreateCommentBody) {
    const task = await this.getTask(workspaceId, taskId);
    const saved = await this.comments.save(
      this.comments.create({ taskId, authorId: actorId, body: sanitizeRichText(body.body)! }),
    );
    const full = await this.comments.findOneOrFail({ where: { id: saved.id } });
    const dto = toComment(full);

    await this.activity.record({
      workspaceId,
      actorId,
      action: ActivityAction.COMMENTED,
      entityType: 'task',
      entityId: taskId,
    });
    this.realtime.emitToTask(taskId, RT_EVENTS.COMMENT_CREATED, dto);
    this.realtime.emitToWorkspace(workspaceId, RT_EVENTS.COMMENT_CREATED, { taskId, comment: dto });

    // Notify the assignee (if it isn't the commenter).
    if (task.assigneeId && task.assigneeId !== actorId) {
      await this.notifications.create(task.assigneeId, {
        workspaceId,
        type: NotificationType.TASK_COMMENTED,
        title: `New comment on ${task.title}`,
        body: body.body.slice(0, 140),
        data: { taskId, projectId: task.projectId },
      });
    }

    // @mentions — notify mentioned users who are workspace members (not the author/assignee already pinged).
    const mentioned = parseMentions(body.body).filter(
      (uid) => uid !== actorId && uid !== task.assigneeId,
    );
    if (mentioned.length) {
      const members = await this.members.find({
        where: mentioned.map((userId) => ({ workspaceId, userId })),
      });
      for (const m of members) {
        await this.notifications.create(m.userId, {
          workspaceId,
          type: NotificationType.MENTIONED,
          title: `You were mentioned on ${task.title}`,
          body: body.body.slice(0, 140),
          data: { taskId, projectId: task.projectId },
        });
      }
    }
    return dto;
  }

  async deleteComment(workspaceId: string, taskId: string, commentId: string) {
    await this.getTask(workspaceId, taskId);
    await this.comments.delete({ id: commentId, taskId });
    return { ok: true };
  }

  // ---- Checklist ----
  async addChecklistItem(workspaceId: string, taskId: string, body: CreateChecklistItemBody) {
    await this.getTask(workspaceId, taskId);
    const row = await this.checklist
      .createQueryBuilder('c')
      .where('c.taskId = :taskId', { taskId })
      .select('COALESCE(MAX(c.order), -1)', 'max')
      .getRawOne<{ max: number }>();
    const saved = await this.checklist.save(
      this.checklist.create({ taskId, text: body.text, order: Number(row?.max ?? -1) + 1 }),
    );
    this.realtime.emitToTask(taskId, RT_EVENTS.TASK_UPDATED, { id: taskId });
    return { id: saved.id, text: saved.text, done: saved.done, order: saved.order };
  }

  async updateChecklistItem(workspaceId: string, taskId: string, itemId: string, body: UpdateChecklistItemBody) {
    await this.getTask(workspaceId, taskId);
    const item = await this.checklist.findOne({ where: { id: itemId, taskId } });
    if (!item) throw new NotFoundException('Checklist item not found.');
    if (body.text !== undefined) item.text = body.text;
    if (body.done !== undefined) item.done = body.done;
    await this.checklist.save(item);
    this.realtime.emitToTask(taskId, RT_EVENTS.TASK_UPDATED, { id: taskId });
    return { id: item.id, text: item.text, done: item.done, order: item.order };
  }

  async deleteChecklistItem(workspaceId: string, taskId: string, itemId: string) {
    await this.getTask(workspaceId, taskId);
    await this.checklist.delete({ id: itemId, taskId });
    return { ok: true };
  }

  // ---- Time tracking ----
  async logTime(workspaceId: string, actorId: string, taskId: string, body: LogTimeBody) {
    await this.getTask(workspaceId, taskId);
    const saved = await this.timeEntries.save(
      this.timeEntries.create({
        taskId,
        userId: actorId,
        minutes: body.minutes,
        note: body.note ?? null,
        spentOn: body.spentOn ?? new Date().toISOString().slice(0, 10),
      }),
    );
    this.realtime.emitToWorkspace(workspaceId, RT_EVENTS.TASK_UPDATED, { id: taskId });
    return {
      id: saved.id,
      userId: saved.userId,
      minutes: saved.minutes,
      note: saved.note,
      spentOn: saved.spentOn,
    };
  }

  async listTime(workspaceId: string, taskId: string) {
    await this.getTask(workspaceId, taskId);
    const items = await this.timeEntries.find({ where: { taskId }, order: { spentOn: 'DESC' } });
    return items.map((t) => ({
      id: t.id,
      userId: t.userId,
      minutes: t.minutes,
      note: t.note,
      spentOn: t.spentOn,
    }));
  }

  // ---- Dependencies ----
  async addDependency(workspaceId: string, taskId: string, body: CreateDependencyBody) {
    await this.getTask(workspaceId, taskId);
    if (body.targetTaskId === taskId) {
      throw new BadRequestException('A task cannot depend on itself.');
    }
    await this.getTask(workspaceId, body.targetTaskId);
    const saved = await this.deps.save(
      this.deps.create({
        sourceTaskId: taskId,
        targetTaskId: body.targetTaskId,
        type: body.type,
      }),
    );
    this.realtime.emitToWorkspace(workspaceId, RT_EVENTS.TASK_UPDATED, { id: taskId });
    return this.getDependency(saved.id);
  }

  async listDependencies(workspaceId: string, taskId: string) {
    await this.getTask(workspaceId, taskId);
    const items = await this.deps.find({
      where: { sourceTaskId: taskId },
      relations: { targetTask: true },
    });
    return items.map((d) => ({
      id: d.id,
      type: d.type as DependencyType,
      targetTaskId: d.targetTaskId,
      targetTaskNumber: d.targetTask?.number ?? 0,
      targetTitle: d.targetTask?.title ?? '',
    }));
  }

  async removeDependency(workspaceId: string, taskId: string, depId: string) {
    await this.getTask(workspaceId, taskId);
    await this.deps.delete({ id: depId, sourceTaskId: taskId });
    return { ok: true };
  }

  private async getDependency(id: string) {
    const d = await this.deps.findOneOrFail({ where: { id }, relations: { targetTask: true } });
    return {
      id: d.id,
      type: d.type as DependencyType,
      targetTaskId: d.targetTaskId,
      targetTaskNumber: d.targetTask?.number ?? 0,
      targetTitle: d.targetTask?.title ?? '',
    };
  }
}
