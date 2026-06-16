import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { StatusCategory } from '@manatask/shared';
import { BaseEntity } from './base.entity';
import { Project } from './project.entity';

@Entity('project_statuses')
@Index(['projectId'])
export class ProjectStatus extends BaseEntity {
  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, (p) => p.statuses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: StatusCategory, default: StatusCategory.TODO })
  category: StatusCategory;

  @Column({ default: '#94a3b8' })
  color: string;

  @Column({ type: 'int', default: 0 })
  order: number;
}
