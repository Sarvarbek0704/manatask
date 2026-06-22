import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusCategory } from '@manatask/shared';
import { Project, ProjectStatus, Task } from '../../database/entities';
import { toProject, toStatus } from '../../common/mappers';
import { defaultStatuses } from '../../common/util';
import {
  CreateProjectBody,
  UpdateProjectBody,
  CreateStatusBody,
  UpdateStatusBody,
} from './dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(ProjectStatus) private statuses: Repository<ProjectStatus>,
    @InjectRepository(Task) private tasks: Repository<Task>,
  ) {}

  async create(workspaceId: string, body: CreateProjectBody) {
    const key = body.key.toUpperCase();
    const dup = await this.projects.findOne({ where: { workspaceId, key } });
    if (dup) throw new ConflictException(`Project key "${key}" already exists.`);

    const project = await this.projects.save(
      this.projects.create({
        workspaceId,
        name: body.name,
        key,
        description: body.description ?? null,
        color: body.color ?? '#6366f1',
      }),
    );
    const statuses = defaultStatuses().map((s) =>
      this.statuses.create({
        projectId: project.id,
        name: s.name,
        category: s.category as StatusCategory,
        color: s.color,
        order: s.order,
      }),
    );
    await this.statuses.save(statuses);
    return this.getOne(workspaceId, project.id);
  }

  async list(workspaceId: string, includeArchived = false) {
    const projects = await this.projects.find({
      where: includeArchived ? { workspaceId } : { workspaceId, archived: false },
      relations: { statuses: true },
      order: { createdAt: 'ASC' },
    });
    return projects.map(toProject);
  }

  async getOne(workspaceId: string, id: string) {
    const project = await this.projects.findOne({
      where: { id, workspaceId },
      relations: { statuses: true },
    });
    if (!project) throw new NotFoundException('Project not found.');
    return toProject(project);
  }

  async getEntity(workspaceId: string, id: string): Promise<Project> {
    const project = await this.projects.findOne({ where: { id, workspaceId } });
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  async update(workspaceId: string, id: string, body: UpdateProjectBody) {
    await this.getEntity(workspaceId, id);
    await this.projects.update({ id, workspaceId }, body);
    return this.getOne(workspaceId, id);
  }

  async setArchived(workspaceId: string, id: string, archived: boolean) {
    await this.getEntity(workspaceId, id);
    await this.projects.update({ id, workspaceId }, { archived });
    return this.getOne(workspaceId, id);
  }

  /**
   * Permanently delete a project and everything inside it. Tasks are removed
   * first (cascading to their comments/checklist/time/deps) so the project
   * delete doesn't trip the task→status RESTRICT constraint; the project delete
   * then cascades its statuses and sprints.
   */
  async remove(workspaceId: string, id: string) {
    await this.getEntity(workspaceId, id);
    await this.tasks.delete({ projectId: id });
    await this.projects.delete({ id, workspaceId });
    return { ok: true };
  }

  // ---- Statuses ----
  async addStatus(workspaceId: string, projectId: string, body: CreateStatusBody) {
    await this.getEntity(workspaceId, projectId);
    const max = await this.statuses
      .createQueryBuilder('s')
      .where('s.projectId = :projectId', { projectId })
      .select('COALESCE(MAX(s.order), -1)', 'max')
      .getRawOne<{ max: number }>();
    const saved = await this.statuses.save(
      this.statuses.create({
        projectId,
        name: body.name,
        category: body.category,
        color: body.color ?? '#94a3b8',
        order: Number(max?.max ?? -1) + 1,
      }),
    );
    return toStatus(saved);
  }

  async updateStatus(workspaceId: string, projectId: string, statusId: string, body: UpdateStatusBody) {
    await this.getEntity(workspaceId, projectId);
    const status = await this.statuses.findOne({ where: { id: statusId, projectId } });
    if (!status) throw new NotFoundException('Status not found.');
    Object.assign(status, body);
    await this.statuses.save(status);
    return toStatus(status);
  }

  async deleteStatus(workspaceId: string, projectId: string, statusId: string) {
    await this.getEntity(workspaceId, projectId);
    const count = await this.statuses.count({ where: { projectId } });
    if (count <= 1) {
      throw new ConflictException('A project must keep at least one status.');
    }
    await this.statuses.delete({ id: statusId, projectId });
    return { ok: true };
  }
}
