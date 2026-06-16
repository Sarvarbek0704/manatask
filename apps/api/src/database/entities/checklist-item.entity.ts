import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Task } from './task.entity';

@Entity('checklist_items')
@Index(['taskId'])
export class ChecklistItem extends BaseEntity {
  @Column('uuid')
  taskId: string;

  @ManyToOne(() => Task, (t) => t.checklist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column()
  text: string;

  @Column({ default: false })
  done: boolean;

  @Column({ type: 'int', default: 0 })
  order: number;
}
