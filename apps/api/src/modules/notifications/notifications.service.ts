import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType, RT_EVENTS } from '@manatask/shared';
import { Notification } from '../../database/entities';
import { toNotification } from '../../common/mappers';
import { RealtimeGateway } from '../realtime/realtime.gateway';

interface CreateNotificationInput {
  workspaceId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private repo: Repository<Notification>,
    private realtime: RealtimeGateway,
  ) {}

  async create(userId: string, input: CreateNotificationInput) {
    const saved = await this.repo.save(
      this.repo.create({
        userId,
        workspaceId: input.workspaceId ?? null,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        data: input.data ?? null,
      }),
    );
    this.realtime.emitToUser(userId, RT_EVENTS.NOTIFICATION, toNotification(saved));
    return toNotification(saved);
  }

  async list(userId: string, onlyUnread = false) {
    const items = await this.repo.find({
      where: onlyUnread ? { userId, read: false } : { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return items.map(toNotification);
  }

  async unreadCount(userId: string) {
    return this.repo.count({ where: { userId, read: false } });
  }

  async markRead(userId: string, id: string) {
    await this.repo.update({ id, userId }, { read: true });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.repo.update({ userId, read: false }, { read: true });
    return { ok: true };
  }
}
