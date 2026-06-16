import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ActivityAction } from '@manatask/shared';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('activities')
@Index(['workspaceId', 'entityType', 'entityId'])
export class Activity extends BaseEntity {
  @Column('uuid')
  workspaceId: string;

  @Column('uuid')
  actorId: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actorId' })
  actor: User;

  @Column({ type: 'enum', enum: ActivityAction })
  action: ActivityAction;

  /** e.g. 'task', 'project', 'comment' */
  @Column()
  entityType: string;

  @Column('uuid')
  entityId: string;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, unknown> | null;
}
