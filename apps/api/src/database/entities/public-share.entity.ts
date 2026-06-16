import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Workspace } from './workspace.entity';

/** A read-only public link to a task (or project board). */
@Entity('public_shares')
@Index(['token'], { unique: true })
export class PublicShare extends BaseEntity {
  @Column('uuid')
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  /** 'task' | 'project' */
  @Column()
  resourceType: string;

  @Column('uuid')
  resourceId: string;

  @Column()
  token: string;

  @Column('uuid')
  createdById: string;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;
}
