import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { WorkLogStatus } from '@manatask/shared';
import { BaseEntity } from './base.entity';
import { Workspace } from './workspace.entity';
import { User } from './user.entity';
import { Project } from './project.entity';

/**
 * A self-reported work update: "here's what I did". Lets workers record their
 * daily progress in detail so admins/owners get visibility without nagging.
 */
@Entity('work_logs')
@Index(['workspaceId', 'workedOn'])
@Index(['workspaceId', 'userId'])
export class WorkLog extends BaseEntity {
  @Column('uuid')
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Optional link to the project the work relates to. */
  @Column({ type: 'uuid', nullable: true })
  projectId: string | null;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'projectId' })
  project: Project | null;

  /** Optional link to a specific task. */
  @Column({ type: 'uuid', nullable: true })
  taskId: string | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  /** Optional time spent, in minutes. */
  @Column({ type: 'int', nullable: true })
  minutes: number | null;

  /** The day the work was done. */
  @Column({ type: 'date' })
  workedOn: string;

  /** Review status — owners/admins accept or reject; accepted days count toward the challenge. */
  @Column({ type: 'enum', enum: WorkLogStatus, default: WorkLogStatus.PENDING })
  status: WorkLogStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;
}
