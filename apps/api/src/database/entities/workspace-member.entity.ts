import { Column, Entity, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { WorkspaceRole } from '@manatask/shared';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Workspace } from './workspace.entity';

@Entity('workspace_members')
@Unique(['workspaceId', 'userId'])
@Index(['workspaceId'])
export class WorkspaceMember extends BaseEntity {
  @Column('uuid')
  workspaceId: string;

  @ManyToOne(() => Workspace, (w) => w.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (u) => u.memberships, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: WorkspaceRole, default: WorkspaceRole.MEMBER })
  role: WorkspaceRole;
}
