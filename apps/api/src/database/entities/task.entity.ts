import {
  Column,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  DeleteDateColumn,
  VersionColumn,
} from 'typeorm';
import { TaskPriority, StatusCategory } from '@manatask/shared';
import { BaseEntity } from './base.entity';
import { Project } from './project.entity';
import { ProjectStatus } from './project-status.entity';
import { User } from './user.entity';
import { Sprint } from './sprint.entity';
import { Label } from './label.entity';
import { ChecklistItem } from './checklist-item.entity';
import { Comment } from './comment.entity';
import { Attachment } from './attachment.entity';
import { TimeEntry } from './time-entry.entity';

@Entity('tasks')
@Index(['workspaceId'])
@Index(['projectId', 'statusId'])
@Index(['assigneeId'])
@Index(['dueDate'])
@Index(['projectId', 'sprintId'])
export class Task extends BaseEntity {
  /** Denormalized tenant key — every tenant-scoped query filters on this. */
  @Column('uuid')
  workspaceId: string;

  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  /** Per-project sequential number (PROJ-<number>). */
  @Column({ type: 'int' })
  number: number;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Task, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: Task | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column('uuid')
  statusId: string;

  @ManyToOne(() => ProjectStatus, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'statusId' })
  status: ProjectStatus;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.NONE })
  priority: TaskPriority;

  @Column({ type: 'uuid', nullable: true })
  assigneeId: string | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigneeId' })
  assignee: User | null;

  @Column({ type: 'uuid', nullable: true })
  reporterId: string | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reporterId' })
  reporter: User | null;

  @Column({ type: 'uuid', nullable: true })
  sprintId: string | null;

  @ManyToOne(() => Sprint, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sprintId' })
  sprint: Sprint | null;

  @Column({ type: 'timestamptz', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  startDate: Date | null;

  @Column({ type: 'int', nullable: true })
  estimateMinutes: number | null;

  /** Float order within its status column for fractional drag-and-drop. */
  @Column({ type: 'double precision', default: 1000 })
  order: number;

  @ManyToMany(() => Label, { eager: true })
  @JoinTable({ name: 'task_labels' })
  labels: Label[];

  /** Additional assignees (beyond the primary `assignee`). */
  @ManyToMany(() => User, { eager: true })
  @JoinTable({ name: 'task_assignees' })
  assignees: User[];

  /** Per-project custom field values, keyed by field definition id. */
  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, unknown> | null;

  @OneToMany(() => ChecklistItem, (c) => c.task, { cascade: true })
  checklist: ChecklistItem[];

  @OneToMany(() => Comment, (c) => c.task)
  comments: Comment[];

  @OneToMany(() => Attachment, (a) => a.task)
  attachments: Attachment[];

  @OneToMany(() => TimeEntry, (t) => t.task)
  timeEntries: TimeEntry[];

  /** Set when the task is archived (manually or auto for long-done tasks). Hidden from the board by default. */
  @Column({ type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  /** Soft delete — rows with deletedAt set are excluded from normal queries. */
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  /** Incremented on every save — enables optimistic concurrency checks. */
  @VersionColumn()
  version: number;
}
