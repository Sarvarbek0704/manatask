import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { InvitationStatus, WorkspaceRole } from '@manatask/shared';
import { BaseEntity } from './base.entity';
import { Workspace } from './workspace.entity';

@Entity('invitations')
@Index(['token'], { unique: true })
@Index(['workspaceId', 'email'])
export class Invitation extends BaseEntity {
  @Column('uuid')
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column()
  email: string;

  @Column({ type: 'enum', enum: WorkspaceRole, default: WorkspaceRole.MEMBER })
  role: WorkspaceRole;

  @Column()
  token: string;

  @Column({ type: 'enum', enum: InvitationStatus, default: InvitationStatus.PENDING })
  status: InvitationStatus;

  @Column('uuid')
  invitedById: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;
}
