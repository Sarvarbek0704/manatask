import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskTemplate } from '../../database/entities';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(TaskTemplate) private templates: Repository<TaskTemplate>,
    private tasks: TasksService,
  ) {}

  list(projectId: string) {
    return this.templates.find({ where: { projectId }, order: { name: 'ASC' } });
  }

  create(projectId: string, dto: { name: string; payload: Record<string, unknown> }) {
    return this.templates.save(
      this.templates.create({ projectId, name: dto.name, payload: dto.payload ?? {} }),
    );
  }

  async remove(projectId: string, id: string) {
    await this.templates.delete({ id, projectId });
    return { ok: true };
  }

  /** Create a real task from a template. */
  async instantiate(workspaceId: string, actorId: string, projectId: string, id: string, overrides: Record<string, unknown> = {}) {
    const tpl = await this.templates.findOne({ where: { id, projectId } });
    if (!tpl) throw new NotFoundException('Template not found.');
    const payload: any = { ...tpl.payload, ...overrides, projectId };
    if (!payload.title) payload.title = tpl.name;
    return this.tasks.create(workspaceId, actorId, payload);
  }
}
