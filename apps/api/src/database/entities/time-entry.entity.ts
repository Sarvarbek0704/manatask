import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Task } from './task.entity';
import { User } from './user.entity';

@Entity('time_entries')
@Index(['taskId'])
export class TimeEntry extends BaseEntity {
  @Column('uuid')
  taskId: string;

  @ManyToOne(() => Task, (t) => t.timeEntries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int' })
  minutes: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'date' })
  spentOn: string;
}
