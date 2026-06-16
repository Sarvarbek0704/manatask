import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Project } from './project.entity';

export enum CustomFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  URL = 'url',
}

@Entity('custom_field_definitions')
@Index(['projectId'])
export class CustomFieldDefinition extends BaseEntity {
  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: CustomFieldType, default: CustomFieldType.TEXT })
  type: CustomFieldType;

  /** Options for SELECT type. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  options: string[];

  @Column({ type: 'int', default: 0 })
  order: number;
}
