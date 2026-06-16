import {
  Column,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
  DeleteDateColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Workspace } from './workspace.entity';
import { ProjectStatus } from './project-status.entity';

@Entity('projects')
@Index(['workspaceId'])
export class Project extends BaseEntity {
  @Column('uuid')
  workspaceId: string;

  @ManyToOne(() => Workspace, (w) => w.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column()
  name: string;

  /** Short uppercase key used as task prefix, e.g. "PROJ" -> PROJ-12. */
  @Column({ length: 10 })
  key: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: '#6366f1' })
  color: string;

  @Column({ default: false })
  archived: boolean;

  /** Running counter for per-project task numbers. */
  @Column({ type: 'int', default: 0 })
  taskCounter: number;

  @OneToMany(() => ProjectStatus, (s) => s.project, { cascade: true })
  statuses: ProjectStatus[];

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
