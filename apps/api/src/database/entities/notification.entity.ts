import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { NotificationType } from '@manatask/shared';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('notifications')
@Index(['userId', 'read'])
export class Notification extends BaseEntity {
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  workspaceId: string | null;

  // Stored as varchar (not a PG enum) so new notification types need no enum migration.
  @Column({ type: 'varchar' })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  @Column({ default: false })
  read: boolean;
}
