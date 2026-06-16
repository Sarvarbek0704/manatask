import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityAction } from '@manatask/shared';
import { Activity } from '../../database/entities';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity) private repo: Repository<Activity>,
  ) {}

  async record(input: {
    workspaceId: string;
    actorId: string;
    action: ActivityAction;
    entityType: string;
    entityId: string;
    meta?: Record<string, unknown> | null;
  }) {
    await this.repo.save(this.repo.create({ ...input, meta: input.meta ?? null }));
  }

  async forEntity(workspaceId: string, entityType: string, entityId: string) {
    const items = await this.repo.find({
      where: { workspaceId, entityType, entityId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return items.map((a) => ({
      id: a.id,
      action: a.action,
      actor: {
        id: a.actor.id,
        name: a.actor.name,
        avatarUrl: a.actor.avatarUrl ?? null,
      },
      meta: a.meta,
      createdAt: a.createdAt.toISOString(),
    }));
  }
}
