import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Workspace } from './workspace.entity';

@Entity('labels')
@Index(['workspaceId'])
export class Label extends BaseEntity {
  @Column('uuid')
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column()
  name: string;

  @Column({ default: '#64748b' })
  color: string;
}
