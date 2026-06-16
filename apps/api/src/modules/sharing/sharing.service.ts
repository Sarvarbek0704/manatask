import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, MoreThan } from 'typeorm';
import { customAlphabet } from 'nanoid';
import { TaskPriority } from '@manatask/shared';
import { Task, Project, PublicShare } from '../../database/entities';
import { TasksService } from '../tasks/tasks.service';

const tokenGen = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 24);

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Minimal CSV parser supporting quoted fields. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

@Injectable()
export class SharingService {
  constructor(
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(PublicShare) private shares: Repository<PublicShare>,
    private tasksService: TasksService,
  ) {}

  // ---- CSV export ----
  async exportTasksCsv(workspaceId: string, projectId: string): Promise<string> {
    const project = await this.projects.findOne({ where: { id: projectId, workspaceId } });
    if (!project) throw new NotFoundException('Project not found.');
    const tasks = await this.tasks.find({
      where: { workspaceId, projectId },
      relations: { status: true, assignee: true, labels: true },
      order: { number: 'ASC' },
    });
    const header = ['Key', 'Title', 'Status', 'Priority', 'Assignee', 'DueDate', 'Labels'];
    const lines = [header.join(',')];
    for (const t of tasks) {
      lines.push(
        [
          `${project.key}-${t.number}`,
          t.title,
          t.status?.name ?? '',
          t.priority,
          t.assignee?.email ?? '',
          t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : '',
          (t.labels ?? []).map((l) => l.name).join('; '),
        ].map(csvEscape).join(','),
      );
    }
    return lines.join('\n');
  }

  // ---- CSV import ----
  async importTasksCsv(workspaceId: string, actorId: string, projectId: string, csv: string) {
    const project = await this.projects.findOne({ where: { id: projectId, workspaceId } });
    if (!project) throw new NotFoundException('Project not found.');
    const rows = parseCsv(csv);
    if (rows.length < 2) throw new BadRequestException('CSV has no data rows.');
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);
    const ti = idx('title');
    if (ti < 0) throw new BadRequestException('CSV must have a "Title" column.');
    const pi = idx('priority');
    const di = idx('duedate');
    const desci = idx('description');

    const validPriorities = Object.values(TaskPriority) as string[];
    let created = 0;
    for (const row of rows.slice(1)) {
      const title = row[ti]?.trim();
      if (!title) continue;
      const priority = pi >= 0 && validPriorities.includes(row[pi]?.trim()) ? (row[pi].trim() as TaskPriority) : undefined;
      const due = di >= 0 && row[di]?.trim() ? new Date(row[di].trim()).toISOString() : undefined;
      await this.tasksService.create(workspaceId, actorId, {
        projectId,
        title,
        description: desci >= 0 ? row[desci]?.trim() : undefined,
        priority,
        dueDate: due,
      } as any);
      created++;
    }
    return { created };
  }

  // ---- Public sharing ----
  async createShare(
    workspaceId: string,
    userId: string,
    resourceType: 'task' | 'project',
    resourceId: string,
    expiresAt?: string,
  ) {
    // Validate the resource belongs to the workspace.
    if (resourceType === 'task') {
      const ok = await this.tasks.findOne({ where: { id: resourceId, workspaceId } });
      if (!ok) throw new NotFoundException('Task not found.');
    } else {
      const ok = await this.projects.findOne({ where: { id: resourceId, workspaceId } });
      if (!ok) throw new NotFoundException('Project not found.');
    }
    const share = await this.shares.save(
      this.shares.create({
        workspaceId,
        resourceType,
        resourceId,
        token: tokenGen(),
        createdById: userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }),
    );
    return {
      id: share.id,
      token: share.token,
      url: `${process.env.WEB_ORIGIN ?? 'http://localhost:3000'}/public/${share.token}`,
      resourceType,
      resourceId,
      expiresAt: share.expiresAt?.toISOString() ?? null,
    };
  }

  async listShares(workspaceId: string) {
    const rows = await this.shares.find({ where: { workspaceId }, order: { createdAt: 'DESC' } });
    return rows.map((s) => ({
      id: s.id,
      token: s.token,
      resourceType: s.resourceType,
      resourceId: s.resourceId,
      expiresAt: s.expiresAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  async revokeShare(workspaceId: string, id: string) {
    await this.shares.delete({ id, workspaceId });
    return { ok: true };
  }

  /** Public, unauthenticated read of a shared resource. */
  async getPublic(token: string) {
    const share = await this.shares.findOne({ where: { token } });
    if (!share) throw new NotFoundException('Share not found.');
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new NotFoundException('Share expired.');
    }
    if (share.resourceType === 'task') {
      const t = await this.tasks.findOne({
        where: { id: share.resourceId },
        relations: { status: true, assignee: true, labels: true },
      });
      if (!t) throw new NotFoundException('Task not found.');
      return {
        type: 'task',
        task: {
          title: t.title,
          number: t.number,
          description: t.description,
          status: t.status?.name,
          priority: t.priority,
          assignee: t.assignee ? { name: t.assignee.name } : null,
          labels: (t.labels ?? []).map((l) => ({ name: l.name, color: l.color })),
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
        },
      };
    }
    const project = await this.projects.findOne({
      where: { id: share.resourceId },
      relations: { statuses: true },
    });
    if (!project) throw new NotFoundException('Project not found.');
    const tasks = await this.tasks.find({
      where: { projectId: project.id },
      relations: { status: true },
      order: { order: 'ASC' },
    });
    return {
      type: 'project',
      project: { name: project.name, key: project.key },
      statuses: (project.statuses ?? []).sort((a, b) => a.order - b.order).map((s) => ({ id: s.id, name: s.name })),
      tasks: tasks.map((t) => ({ number: t.number, title: t.title, statusId: t.statusId, priority: t.priority })),
    };
  }
}
