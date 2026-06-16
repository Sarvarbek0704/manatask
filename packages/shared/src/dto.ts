import {
  WorkspaceRole,
  TaskPriority,
  StatusCategory,
  DependencyType,
  Locale,
} from './enums';

export interface CreateWorkLogDto {
  title: string;
  body?: string;
  projectId?: string | null;
  taskId?: string | null;
  minutes?: number | null;
  workedOn?: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  /** Optional: name a brand-new workspace to create on signup. */
  workspaceName?: string;
  locale?: Locale;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateWorkspaceDto {
  name: string;
  slug?: string;
}

export interface InviteMemberDto {
  email: string;
  role: WorkspaceRole;
}

export interface CreateProjectDto {
  name: string;
  key: string;
  description?: string;
  color?: string;
}

export interface CreateTaskDto {
  projectId: string;
  title: string;
  description?: string;
  statusId?: string;
  priority?: TaskPriority;
  assigneeId?: string | null;
  sprintId?: string | null;
  parentId?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  estimateMinutes?: number | null;
  labelIds?: string[];
  assigneeIds?: string[];
  customFields?: Record<string, unknown>;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string | null;
  statusId?: string;
  priority?: TaskPriority;
  assigneeId?: string | null;
  sprintId?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  estimateMinutes?: number | null;
  labelIds?: string[];
  assigneeIds?: string[];
  customFields?: Record<string, unknown>;
  /** If provided and stale, the update is rejected with 409 (optimistic lock). */
  version?: number;
}

/** Drag-and-drop reorder / move between columns. */
export interface MoveTaskDto {
  statusId: string;
  /** Float order key computed client-side from neighbours. */
  order: number;
}

export interface TaskQuery {
  projectId?: string;
  assigneeId?: string;
  sprintId?: string;
  statusCategory?: StatusCategory;
  priority?: TaskPriority;
  search?: string;
  labelId?: string;
  dueBefore?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCommentDto {
  body: string;
}

export interface CreateChecklistItemDto {
  text: string;
}

export interface CreateSprintDto {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateLabelDto {
  name: string;
  color: string;
}

export interface CreateDependencyDto {
  type: DependencyType;
  targetTaskId: string;
}

export interface LogTimeDto {
  minutes: number;
  note?: string;
  spentOn?: string;
}
