import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskWatcher } from '../../database/entities';
import { toUserPublic } from '../../common/mappers';

@Injectable()
export class WatchersService {
  constructor(
    @InjectRepository(TaskWatcher) private watchers: Repository<TaskWatcher>,
    @InjectRepository(Task) private tasks: Repository<Task>,
  ) {}

  private async assertTask(workspaceId: string, taskId: string) {
    const t = await this.tasks.findOne({ where: { id: taskId, workspaceId } });
    if (!t) throw new NotFoundException('Task not found.');
  }

  async watch(workspaceId: string, userId: string, taskId: string) {
    await this.assertTask(workspaceId, taskId);
    const existing = await this.watchers.findOne({ where: { taskId, userId } });
    if (!existing) await this.watchers.save(this.watchers.create({ taskId, userId }));
    return { ok: true };
  }

  async unwatch(workspaceId: string, userId: string, taskId: string) {
    await this.assertTask(workspaceId, taskId);
    await this.watchers.delete({ taskId, userId });
    return { ok: true };
  }

  async list(workspaceId: string, taskId: string) {
    await this.assertTask(workspaceId, taskId);
    const rows = await this.watchers.find({ where: { taskId }, relations: { user: true } });
    return rows.map((w) => toUserPublic(w.user)!);
  }

  /** User ids watching a task (used to fan out notifications). */
  async watcherIds(taskId: string): Promise<string[]> {
    const rows = await this.watchers.find({ where: { taskId }, select: { userId: true } });
    return rows.map((r) => r.userId);
  }
}
