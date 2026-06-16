/** Roles inside a workspace (tenant). Ordered from most to least privileged. */
export enum WorkspaceRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest',
}

/** Privilege ranking — higher number = more power. Used by RBAC checks. */
export const ROLE_RANK: Record<WorkspaceRole, number> = {
  [WorkspaceRole.OWNER]: 4,
  [WorkspaceRole.ADMIN]: 3,
  [WorkspaceRole.MEMBER]: 2,
  [WorkspaceRole.GUEST]: 1,
};

export enum TaskPriority {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/** Built-in status categories. Each project may define custom statuses mapped to a category. */
export enum StatusCategory {
  BACKLOG = 'backlog',
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum SprintState {
  PLANNED = 'planned',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export enum DependencyType {
  BLOCKS = 'blocks',
  BLOCKED_BY = 'blocked_by',
  RELATES_TO = 'relates_to',
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMMENTED = 'task_commented',
  TASK_STATUS_CHANGED = 'task_status_changed',
  TASK_DUE_SOON = 'task_due_soon',
  MENTIONED = 'mentioned',
  INVITED = 'invited',
  WORKLOG_POSTED = 'worklog_posted',
}

export enum ActivityAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  STATUS_CHANGED = 'status_changed',
  ASSIGNED = 'assigned',
  COMMENTED = 'commented',
  MOVED = 'moved',
}

export enum ProjectViewType {
  KANBAN = 'kanban',
  LIST = 'list',
  CALENDAR = 'calendar',
}

export type Locale = 'uz' | 'ru' | 'en';

/** Socket.io real-time event names (shared by server gateway & web client). */
export const RT_EVENTS = {
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_DELETED: 'task.deleted',
  COMMENT_CREATED: 'comment.created',
  NOTIFICATION: 'notification.new',
  PRESENCE: 'presence.update',
  WORKLOG_CREATED: 'worklog.created',
} as const;
