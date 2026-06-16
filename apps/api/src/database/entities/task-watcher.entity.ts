import { Column, Entity, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Task } from './task.entity';
import { User } from './user.entity';

@Entity('task_watchers')
@Unique(['taskId', 'userId'])
@Index(['taskId'])
@Index(['userId'])
export class TaskWatcher extends BaseEntity {
  @Column('uuid')
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
