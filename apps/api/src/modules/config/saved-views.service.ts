import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectViewType } from '@manatask/shared';
import { SavedView } from '../../database/entities';

@Injectable()
export class SavedViewsService {
  constructor(@InjectRepository(SavedView) private views: Repository<SavedView>) {}

  /** Views visible to a user: their own + shared ones (optionally project-scoped). */
  async list(workspaceId: string, userId: string, projectId?: string) {
    const qb = this.views
      .createQueryBuilder('v')
      .where('v.workspaceId = :workspaceId', { workspaceId })
      .andWhere('(v.ownerId = :userId OR v.shared = true)', { userId });
    if (projectId) qb.andWhere('(v.projectId = :projectId OR v.projectId IS NULL)', { projectId });
    return qb.orderBy('v.createdAt', 'DESC').getMany();
  }

  create(
    workspaceId: string,
    userId: string,
    dto: { name: string; projectId?: string; viewType?: ProjectViewType; config?: Record<string, unknown>; shared?: boolean },
  ) {
    return this.views.save(
      this.views.create({
        workspaceId,
        ownerId: userId,
        name: dto.name,
        projectId: dto.projectId ?? null,
        viewType: dto.viewType ?? ProjectViewType.KANBAN,
        config: dto.config ?? {},
        shared: dto.shared ?? false,
      }),
    );
  }

  async update(workspaceId: string, userId: string, id: string, dto: Partial<SavedView>) {
    const view = await this.views.findOne({ where: { id, workspaceId } });
    if (!view) throw new NotFoundException('View not found.');
    if (view.ownerId !== userId) throw new ForbiddenException('Not your view.');
    Object.assign(view, dto);
    return this.views.save(view);
  }

  async remove(workspaceId: string, userId: string, id: string) {
    const view = await this.views.findOne({ where: { id, workspaceId } });
    if (!view) throw new NotFoundException('View not found.');
    if (view.ownerId !== userId) throw new ForbiddenException('Not your view.');
    await this.views.remove(view);
    return { ok: true };
  }
}
