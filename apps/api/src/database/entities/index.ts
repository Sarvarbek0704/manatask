import { User } from './user.entity';
import { Workspace } from './workspace.entity';
import { WorkspaceMember } from './workspace-member.entity';
import { Invitation } from './invitation.entity';
import { Project } from './project.entity';
import { ProjectStatus } from './project-status.entity';
import { Label } from './label.entity';
import { Sprint } from './sprint.entity';
import { Task } from './task.entity';
import { ChecklistItem } from './checklist-item.entity';
import { Comment } from './comment.entity';
import { Attachment } from './attachment.entity';
import { TimeEntry } from './time-entry.entity';
import { TaskDependency } from './task-dependency.entity';
import { Notification } from './notification.entity';
import { Activity } from './activity.entity';
import { Session } from './session.entity';
import { VerificationToken } from './verification-token.entity';
import { ApiKey } from './api-key.entity';
import { Webhook } from './webhook.entity';
import { TaskWatcher } from './task-watcher.entity';
import { CustomFieldDefinition } from './custom-field.entity';
import { SavedView } from './saved-view.entity';
import { TaskTemplate } from './task-template.entity';
import { RecurringTask } from './recurring-task.entity';
import { AutomationRule } from './automation-rule.entity';
import { PublicShare } from './public-share.entity';
import { WorkLog } from './work-log.entity';
import { Team, TeamMember } from './team.entity';
import { Challenge } from './challenge.entity';

export {
  User,
  Workspace,
  WorkspaceMember,
  Invitation,
  Project,
  ProjectStatus,
  Label,
  Sprint,
  Task,
  ChecklistItem,
  Comment,
  Attachment,
  TimeEntry,
  TaskDependency,
  Notification,
  Activity,
  Session,
  VerificationToken,
  ApiKey,
  Webhook,
  TaskWatcher,
  CustomFieldDefinition,
  SavedView,
  TaskTemplate,
  RecurringTask,
  AutomationRule,
  PublicShare,
  WorkLog,
  Challenge,
  Team,
  TeamMember,
};
export { VerificationTokenType } from './verification-token.entity';
export { CustomFieldType } from './custom-field.entity';
export { RecurrenceFrequency } from './recurring-task.entity';

/** Registered with TypeORM in app.module.ts. */
export const ALL_ENTITIES = [
  User,
  Workspace,
  WorkspaceMember,
  Invitation,
  Project,
  ProjectStatus,
  Label,
  Sprint,
  Task,
  ChecklistItem,
  Comment,
  Attachment,
  TimeEntry,
  TaskDependency,
  Notification,
  Activity,
  Session,
  VerificationToken,
  ApiKey,
  Webhook,
  TaskWatcher,
  CustomFieldDefinition,
  SavedView,
  TaskTemplate,
  RecurringTask,
  AutomationRule,
  PublicShare,
  WorkLog,
  Challenge,
  Team,
  TeamMember,
];
