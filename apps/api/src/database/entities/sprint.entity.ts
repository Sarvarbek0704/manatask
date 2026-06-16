import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { SprintState } from '@manatask/shared';
import { BaseEntity } from './base.entity';
import { Project } from './project.entity';

@Entity('sprints')
@Index(['projectId'])
export class Sprint extends BaseEntity {
  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  goal: string | null;

  @Column({ type: 'enum', enum: SprintState, default: SprintState.PLANNED })
  state: SprintState;

  @Column({ type: 'timestamptz', nullable: true })
  startDate: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endDate: Date | null;
}
