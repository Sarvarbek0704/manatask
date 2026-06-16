import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Project } from './project.entity';

/** A reusable task blueprint (title/description/priority/labels/checklist). */
@Entity('task_templates')
@Index(['projectId'])
export class TaskTemplate extends BaseEntity {
  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  name: string;

  /** Serialized CreateTask payload (title, description, priority, labelIds, checklist[]). */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload: Record<string, unknown>;
}
