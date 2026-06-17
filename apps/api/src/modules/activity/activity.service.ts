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
    return items.map((a) => this.toDto(a));
  }

  /** Workspace-wide audit feed (admins/owners). */
  async forWorkspace(workspaceId: string, page = 1, pageSize = 40) {
    const [items, total] = await this.repo.findAndCount({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items: items.map((a) => this.toDto(a)), total, page, pageSize };
  }

  private toDto(a: Activity) {
    return {
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      actor: {
        id: a.actor?.id ?? null,
        name: a.actor?.name ?? 'Unknown',
        avatarUrl: a.actor?.avatarUrl ?? null,
      },
      meta: a.meta,
      createdAt: a.createdAt.toISOString(),
    };
  }
}
