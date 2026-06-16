import {
  UserPublic,
  Workspace as WorkspaceDto,
  WorkspaceMember as MemberDto,
  Project as ProjectDto,
  ProjectStatus as StatusDto,
  Label as LabelDto,
  Sprint as SprintDto,
  Task as TaskDto,
  Comment as CommentDto,
  Notification as NotificationDto,
  Locale,
} from '@manatask/shared';
import {
  User,
  Workspace,
  WorkspaceMember,
  Project,
  ProjectStatus,
  Label,
  Sprint,
  Task,
  Comment,
  Notification,
} from '../database/entities';

const iso = (d: Date | null | undefined): string | null =>
  d ? new Date(d).toISOString() : null;

export function toUserPublic(u: User | null): UserPublic | null {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl ?? null,
    locale: (u.locale ?? 'uz') as Locale,
    emailVerified: !!u.emailVerified,
  };
}

export function toWorkspace(w: Workspace): WorkspaceDto {
  return {
    id: w.id,
    name: w.name,
    slug: w.slug,
    logoUrl: w.logoUrl ?? null,
    createdAt: new Date(w.createdAt).toISOString(),
  };
}

export function toMember(m: WorkspaceMember): MemberDto {
  return {
    id: m.id,
    role: m.role,
    user: toUserPublic(m.user)!,
    joinedAt: new Date(m.createdAt).toISOString(),
  };
}

export function toStatus(s: ProjectStatus): StatusDto {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    color: s.color,
    order: s.order,
  };
}

export function toProject(p: Project): ProjectDto {
  return {
    id: p.id,
    workspaceId: p.workspaceId,
    name: p.name,
    key: p.key,
    description: p.description ?? null,
    color: p.color,
    archived: p.archived,
    statuses: (p.statuses ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(toStatus),
    createdAt: new Date(p.createdAt).toISOString(),
  };
}

export function toLabel(l: Label): LabelDto {
  return { id: l.id, name: l.name, color: l.color };
}

export function toSprint(s: Sprint): SprintDto {
  return {
    id: s.id,
    name: s.name,
    goal: s.goal ?? null,
    state: s.state,
    startDate: iso(s.startDate),
    endDate: iso(s.endDate),
  };
}

export interface TaskCounts {
  subtaskCount?: number;
  commentCount?: number;
  attachmentCount?: number;
  spentMinutes?: number;
}

export function toTask(t: Task, counts: TaskCounts = {}): TaskDto {
  return {
    id: t.id,
    number: t.number,
    projectId: t.projectId,
    parentId: t.parentId ?? null,
    title: t.title,
    description: t.description ?? null,
    statusId: t.statusId,
    statusCategory: t.status?.category,
    priority: t.priority,
    assignee: toUserPublic(t.assignee),
    assignees: (t.assignees ?? []).map((u) => toUserPublic(u)!),
    reporter: toUserPublic(t.reporter),
    sprintId: t.sprintId ?? null,
    dueDate: iso(t.dueDate),
    startDate: iso(t.startDate),
    estimateMinutes: t.estimateMinutes ?? null,
    spentMinutes: counts.spentMinutes ?? 0,
    order: t.order,
    labels: (t.labels ?? []).map(toLabel),
    customFields: t.customFields ?? null,
    checklist: (t.checklist ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ id: c.id, text: c.text, done: c.done, order: c.order })),
    dependencies: [],
    subtaskCount: counts.subtaskCount ?? 0,
    commentCount: counts.commentCount ?? 0,
    attachmentCount: counts.attachmentCount ?? 0,
    version: t.version ?? 0,
    createdAt: new Date(t.createdAt).toISOString(),
    updatedAt: new Date(t.updatedAt).toISOString(),
  };
}

export function toComment(c: Comment): CommentDto {
  return {
    id: c.id,
    body: c.body,
    author: toUserPublic(c.author)!,
    createdAt: new Date(c.createdAt).toISOString(),
    updatedAt: new Date(c.updatedAt).toISOString(),
  };
}

export function toNotification(n: Notification): NotificationDto {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    read: n.read,
    data: n.data ?? null,
    createdAt: new Date(n.createdAt).toISOString(),
  };
}
