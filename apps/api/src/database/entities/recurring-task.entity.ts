import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Project } from './project.entity';

export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

/** Spawns a new task on a schedule from a stored payload. */
@Entity('recurring_tasks')
@Index(['projectId'])
@Index(['nextRunAt'])
export class RecurringTask extends BaseEntity {
  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  workspaceId: string;

  @Column({ type: 'enum', enum: RecurrenceFrequency })
  frequency: RecurrenceFrequency;

  /** Every N periods (e.g. every 2 weeks). */
  @Column({ type: 'int', default: 1 })
  interval: number;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload: Record<string, unknown>;

  @Column({ type: 'timestamptz' })
  nextRunAt: Date;

  @Column({ default: true })
  active: boolean;
}
