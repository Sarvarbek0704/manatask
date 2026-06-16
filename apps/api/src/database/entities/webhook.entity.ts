import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Workspace } from './workspace.entity';

/** Outgoing webhook subscription. Payloads are signed with HMAC-SHA256(secret). */
@Entity('webhooks')
@Index(['workspaceId'])
export class Webhook extends BaseEntity {
  @Column('uuid')
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column()
  url: string;

  /** Event names this endpoint subscribes to (e.g. task.created). */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  events: string[];

  @Column()
  secret: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastDeliveryAt: Date | null;

  @Column({ type: 'int', default: 0 })
  failureCount: number;
}
