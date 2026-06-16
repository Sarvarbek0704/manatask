import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RT_EVENTS, NotificationType } from '@manatask/shared';
import { Task, AutomationRule } from '../../database/entities';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @InjectRepository(AutomationRule) private rules: Repository<AutomationRule>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    private realtime: RealtimeGateway,
    private notifications: NotificationsService,
  ) {}

  // ---- CRUD ----
  async list(workspaceId: string, projectId: string) {
    return this.rules.find({ where: { workspaceId, projectId }, order: { createdAt: 'ASC' } });
  }

  async create(workspaceId: string, projectId: string, dto: Partial<AutomationRule>) {
    return this.rules.save(
      this.rules.create({
        workspaceId,
        projectId,
        name: dto.name ?? 'Rule',
        trigger: dto.trigger ?? {},
        actions: dto.actions ?? [],
        active: dto.active ?? true,
      }),
    );
  }

  async update(workspaceId: string, id: string, dto: Partial<AutomationRule>) {
    const rule = await this.rules.findOne({ where: { id, workspaceId } });
    if (!rule) throw new NotFoundException('Rule not found.');
    Object.assign(rule, dto);
    return this.rules.save(rule);
  }

  async remove(workspaceId: string, id: string) {
    await this.rules.delete({ id, workspaceId });
    return { ok: true };
  }

  // ---- Engine ----
  /** Evaluate rules for a task event and apply matching actions. Fire-and-forget. */
  async evaluate(task: Task, event: 'task.created' | 'task.updated'): Promise<void> {
    try {
      const rules = await this.rules.find({
        where: { projectId: task.projectId, active: true },
      });
      const patch: Record<string, unknown> = {};
      for (const rule of rules) {
        const t = rule.trigger as any;
        if (t.event && t.event !== event) continue;
        if (t.statusCategory && task.status?.category !== t.statusCategory) continue;
        if (t.priority && task.priority !== t.priority) continue;

        for (const action of rule.actions as any[]) {
          switch (action.type) {
            case 'set_priority':
              patch.priority = action.value;
              break;
            case 'set_status':
              patch.statusId = action.value;
              break;
            case 'assign':
              patch.assigneeId = action.value;
              break;
            case 'notify':
              if (action.value) {
                await this.notifications.create(action.value, {
                  workspaceId: task.workspaceId,
                  type: NotificationType.TASK_ASSIGNED,
                  title: `Automation: ${task.title}`,
                  body: `Rule "${rule.name}" triggered.`,
                  data: { taskId: task.id, projectId: task.projectId },
                });
              }
              break;
          }
        }
      }
      if (Object.keys(patch).length) {
        await this.tasks.update({ id: task.id }, patch);
        this.realtime.emitToWorkspace(task.workspaceId, RT_EVENTS.TASK_UPDATED, { id: task.id });
      }
    } catch (e) {
      this.logger.warn(`Automation evaluation failed for task ${task.id}: ${(e as Error).message}`);
    }
  }
}
