import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvitationStatus, NotificationType, StatusCategory } from '@manatask/shared';
import { Task, Invitation } from '../../database/entities';
import { NotificationsService } from '../notifications/notifications.service';
import { SessionsService } from '../auth/sessions.service';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(Invitation) private invitations: Repository<Invitation>,
    private notifications: NotificationsService,
    private sessions: SessionsService,
  ) {}

  /** Notify assignees about tasks due within the next 24h. Runs every morning. */
  @Cron('0 8 * * *', { name: 'due-soon' })
  async notifyDueSoon() {
    const now = new Date();
    const soon = new Date(now);
    soon.setHours(soon.getHours() + 24);

    const due = await this.tasks
      .createQueryBuilder('t')
      .leftJoin('t.status', 'status')
      .where('t.assigneeId IS NOT NULL')
      .andWhere('t.dueDate BETWEEN :now AND :soon', { now, soon })
      .andWhere('status.category IN (:...cats)', {
        cats: [StatusCategory.BACKLOG, StatusCategory.TODO, StatusCategory.IN_PROGRESS],
      })
      .getMany();

    for (const task of due) {
      await this.notifications.create(task.assigneeId!, {
        workspaceId: task.workspaceId,
        type: NotificationType.TASK_DUE_SOON,
        title: `Due soon: ${task.title}`,
        body: 'This task is due within 24 hours.',
        data: { taskId: task.id, projectId: task.projectId },
      });
    }
    if (due.length) this.logger.log(`Sent ${due.length} due-soon notifications`);
  }

  /** Mark expired pending invitations. Runs hourly. */
  @Cron(CronExpression.EVERY_HOUR, { name: 'expire-invites' })
  async expireInvitations() {
    const res = await this.invitations.update(
      { status: InvitationStatus.PENDING, expiresAt: LessThan(new Date()) },
      { status: InvitationStatus.EXPIRED },
    );
    if (res.affected) this.logger.log(`Expired ${res.affected} invitations`);
  }

  /** Remove long-expired sessions. Runs nightly. */
  @Cron('0 3 * * *', { name: 'purge-sessions' })
  async purgeSessions() {
    const removed = await this.sessions.purgeExpired();
    if (removed) this.logger.log(`Purged ${removed} expired sessions`);
  }

  /** Hard-delete tasks that have been in the trash for over 30 days. */
  @Cron('0 4 * * *', { name: 'purge-trash' })
  async purgeTrash() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const res = await this.tasks
      .createQueryBuilder()
      .delete()
      .from(Task)
      .where('"deletedAt" IS NOT NULL AND "deletedAt" < :cutoff', { cutoff })
      .execute();
    if (res.affected) this.logger.log(`Purged ${res.affected} trashed tasks`);
  }
}
