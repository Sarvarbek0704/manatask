import {
  WorkspaceRole,
  TaskPriority,
  StatusCategory,
  SprintState,
  DependencyType,
  InvitationStatus,
  NotificationType,
  WorkLogStatus,
  Locale,
} from './enums';

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  locale: Locale;
  emailVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: UserPublic;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  role: WorkspaceRole;
  user: UserPublic;
  joinedAt: string;
}

export interface ProjectStatus {
  id: string;
  name: string;
  category: StatusCategory;
  color: string;
  order: number;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  key: string;
  description: string | null;
  color: string;
  archived: boolean;
  statuses: ProjectStatus[];
  createdAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  state: SprintState;
  startDate: string | null;
  endDate: string | null;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  order: number;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  body: string;
  author: UserPublic;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  minutes: number;
  note: string | null;
  spentOn: string;
}

export interface TaskDependency {
  id: string;
  type: DependencyType;
  targetTaskId: string;
  targetTaskNumber: number;
  targetTitle: string;
}

export interface Task {
  id: string;
  /** Per-project sequential number, e.g. PROJ-42 */
  number: number;
  projectId: string;
  parentId: string | null;
  title: string;
  description: string | null;
  statusId: string;
  statusCategory: StatusCategory;
  priority: TaskPriority;
  assignee: UserPublic | null;
  assignees: UserPublic[];
  reporter: UserPublic | null;
  sprintId: string | null;
  dueDate: string | null;
  startDate: string | null;
  estimateMinutes: number | null;
  spentMinutes: number;
  /** Float order within its status column for drag-and-drop. */
  order: number;
  labels: Label[];
  customFields: Record<string, unknown> | null;
  checklist: ChecklistItem[];
  dependencies: TaskDependency[];
  subtaskCount: number;
  commentCount: number;
  attachmentCount: number;
  /** Optimistic-concurrency version; pass back in UpdateTaskDto to detect conflicts. */
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  read: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export interface DashboardSummary {
  totalTasks: number;
  byCategory: Record<StatusCategory, number>;
  overdue: number;
  dueThisWeek: number;
  completedThisWeek: number;
  byAssignee: { user: UserPublic; open: number; done: number }[];
}

export interface Team {
  id: string;
  name: string;
  color: string;
  members: UserPublic[];
  createdAt: string;
}

export interface WorkLog {
  id: string;
  author: UserPublic;
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
  taskId: string | null;
  title: string;
  body: string | null;
  minutes: number | null;
  workedOn: string;
  status: WorkLogStatus;
  reviewedAt: string | null;
  reviewedByName: string | null;
  reviewNote: string | null;
  createdAt: string;
}

export interface Challenge {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  target: number;
  active: boolean;
}

export interface ChallengeCalendarDay {
  date: string;
  status: WorkLogStatus | 'none';
  count: number;
}

export interface ChallengeProgress {
  challenge: Challenge | null;
  user: UserPublic;
  accepted: number;
  pending: number;
  target: number;
  days: ChallengeCalendarDay[];
}

export interface WorkLogSummary {
  user: UserPublic;
  entries: number;
  minutes: number;
  lastWorkedOn: string | null;
}

export interface AnalyticsReport {
  range: { from: string; to: string; days: number };
  totals: {
    total: number;
    done: number;
    open: number;
    overdue: number;
    completedInRange: number;
    createdInRange: number;
  };
  statusDistribution: { category: StatusCategory; count: number }[];
  priorityDistribution: { priority: TaskPriority; count: number }[];
  series: { date: string; created: number; completed: number }[];
  members: {
    user: UserPublic;
    assigned: number;
    done: number;
    open: number;
    completedInRange: number;
    minutesLogged: number;
  }[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
