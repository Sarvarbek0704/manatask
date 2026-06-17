import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Workspace } from './workspace.entity';

/**
 * A time-boxed "X-day" challenge. Members log work daily; owners/admins accept
 * entries, and each accepted day counts toward `target` (e.g. 100).
 */
@Entity('challenges')
@Index(['workspaceId'])
export class Challenge extends BaseEntity {
  @Column('uuid')
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column({ default: '100-Day Challenge' })
  title: string;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'int', default: 100 })
  target: number;

  @Column({ default: true })
  active: boolean;
}
