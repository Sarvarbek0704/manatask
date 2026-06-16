import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Task } from './task.entity';

@Entity('attachments')
@Index(['taskId'])
export class Attachment extends BaseEntity {
  @Column('uuid')
  taskId: string;

  @ManyToOne(() => Task, (t) => t.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column()
  filename: string;

  @Column()
  storageKey: string;

  @Column({ type: 'bigint', default: 0 })
  size: number;

  @Column({ default: 'application/octet-stream' })
  mimeType: string;

  @Column('uuid')
  uploadedById: string;
}
