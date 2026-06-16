import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Project } from './project.entity';

/**
 * When a trigger matches a task event, run the actions.
 * trigger: { event: 'task.created'|'task.updated', statusCategory?, priority? }
 * actions: [{ type: 'assign'|'set_status'|'set_priority'|'add_label'|'notify', value }]
 */
@Entity('automation_rules')
@Index(['projectId'])
export class AutomationRule extends BaseEntity {
  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  workspaceId: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb' })
  trigger: Record<string, unknown>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  actions: Record<string, unknown>[];

  @Column({ default: true })
  active: boolean;
}
