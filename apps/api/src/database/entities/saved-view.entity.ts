import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ProjectViewType } from '@manatask/shared';
import { BaseEntity } from './base.entity';
import { Workspace } from './workspace.entity';

/** A saved filter/sort/view configuration, personal or shared with the workspace. */
@Entity('saved_views')
@Index(['workspaceId'])
export class SavedView extends BaseEntity {
  @Column('uuid')
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column({ type: 'uuid', nullable: true })
  projectId: string | null;

  @Column('uuid')
  ownerId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ProjectViewType, default: ProjectViewType.KANBAN })
  viewType: ProjectViewType;

  /** Serialized filters/sort/grouping. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  config: Record<string, unknown>;

  @Column({ default: false })
  shared: boolean;
}
