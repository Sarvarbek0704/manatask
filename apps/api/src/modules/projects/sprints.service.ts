import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, Sprint } from '../../database/entities';
import { toSprint } from '../../common/mappers';
import { CreateSprintBody, UpdateSprintBody } from './dto';

@Injectable()
export class SprintsService {
  constructor(
    @InjectRepository(Sprint) private sprints: Repository<Sprint>,
    @InjectRepository(Project) private projects: Repository<Project>,
  ) {}

  private async assertProject(workspaceId: string, projectId: string) {
    const p = await this.projects.findOne({ where: { id: projectId, workspaceId } });
    if (!p) throw new NotFoundException('Project not found.');
  }

  async list(workspaceId: string, projectId: string) {
    await this.assertProject(workspaceId, projectId);
    const sprints = await this.sprints.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
    return sprints.map(toSprint);
  }

  async create(workspaceId: string, projectId: string, body: CreateSprintBody) {
    await this.assertProject(workspaceId, projectId);
    const saved = await this.sprints.save(
      this.sprints.create({
        projectId,
        name: body.name,
        goal: body.goal ?? null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      }),
    );
    return toSprint(saved);
  }

  async update(workspaceId: string, projectId: string, id: string, body: UpdateSprintBody) {
    await this.assertProject(workspaceId, projectId);
    const sprint = await this.sprints.findOne({ where: { id, projectId } });
    if (!sprint) throw new NotFoundException('Sprint not found.');
    if (body.name !== undefined) sprint.name = body.name;
    if (body.goal !== undefined) sprint.goal = body.goal;
    if (body.state !== undefined) sprint.state = body.state;
    if (body.startDate !== undefined) sprint.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) sprint.endDate = body.endDate ? new Date(body.endDate) : null;
    await this.sprints.save(sprint);
    return toSprint(sprint);
  }

  async remove(workspaceId: string, projectId: string, id: string) {
    await this.assertProject(workspaceId, projectId);
    await this.sprints.delete({ id, projectId });
    return { ok: true };
  }
}
