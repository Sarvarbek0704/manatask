import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, Project, Comment } from '../../database/entities';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(Comment) private comments: Repository<Comment>,
  ) {}

  async search(workspaceId: string, q: string) {
    const term = (q ?? '').trim();
    if (term.length < 2) return { tasks: [], projects: [], comments: [] };
    const like = `%${term}%`;

    const tasks = await this.tasks
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.status', 'status')
      .where('t.workspaceId = :ws', { ws: workspaceId })
      .andWhere('(t.title ILIKE :like OR t.description ILIKE :like)', { like })
      .orderBy('t.updatedAt', 'DESC')
      .take(20)
      .getMany();

    const projects = await this.projects
      .createQueryBuilder('p')
      .where('p.workspaceId = :ws', { ws: workspaceId })
      .andWhere('(p.name ILIKE :like OR p.key ILIKE :like)', { like })
      .take(10)
      .getMany();

    const comments = await this.comments
      .createQueryBuilder('c')
      .innerJoin('c.task', 't')
      .where('t.workspaceId = :ws', { ws: workspaceId })
      .andWhere('c.body ILIKE :like', { like })
      .orderBy('c.createdAt', 'DESC')
      .take(20)
      .getMany();

    return {
      tasks: tasks.map((t) => ({
        id: t.id,
        number: t.number,
        title: t.title,
        projectId: t.projectId,
        statusCategory: t.status?.category,
      })),
      projects: projects.map((p) => ({ id: p.id, name: p.name, key: p.key, color: p.color })),
      comments: comments.map((c) => ({ id: c.id, taskId: c.taskId, snippet: c.body.slice(0, 160) })),
    };
  }
}
