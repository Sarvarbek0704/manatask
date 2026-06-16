import { Column, Entity, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { DependencyType } from '@manatask/shared';
import { BaseEntity } from './base.entity';
import { Task } from './task.entity';

@Entity('task_dependencies')
@Unique(['sourceTaskId', 'targetTaskId', 'type'])
@Index(['sourceTaskId'])
export class TaskDependency extends BaseEntity {
  @Column('uuid')
  sourceTaskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sourceTaskId' })
  sourceTask: Task;

  @Column('uuid')
  targetTaskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'targetTaskId' })
  targetTask: Task;

  @Column({ type: 'enum', enum: DependencyType })
  type: DependencyType;
}
