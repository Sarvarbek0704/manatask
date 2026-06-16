import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { WorkspaceRole } from '@manatask/shared';
import { BaseEntity } from './base.entity';
import { Workspace } from './workspace.entity';

/** Machine credential scoped to a workspace. Only the SHA-256 hash is stored. */
@Entity('api_keys')
@Index(['workspaceId'])
@Index(['keyHash'], { unique: true })
export class ApiKey extends BaseEntity {
  @Column('uuid')
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column()
  name: string;

  /** First chars of the key, shown in the UI to identify it. */
  @Column()
  keyPrefix: string;

  @Column({ select: false })
  keyHash: string;

  /** Effective permission level for requests using this key. */
  @Column({ type: 'enum', enum: WorkspaceRole, default: WorkspaceRole.MEMBER })
  role: WorkspaceRole;

  @Column('uuid')
  createdById: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;
}
