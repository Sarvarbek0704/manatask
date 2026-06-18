import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { WorkspaceMember } from './workspace-member.entity';
import { Project } from './project.entity';

@Entity('workspaces')
export class Workspace extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'varchar', nullable: true })
  logoUrl: string | null;

  /** Shared secret for verifying inbound GitHub webhooks. */
  @Column({ type: 'varchar', nullable: true, select: false })
  githubSecret: string | null;

  @OneToMany(() => WorkspaceMember, (m) => m.workspace)
  members: WorkspaceMember[];

  @OneToMany(() => Project, (p) => p.workspace)
  projects: Project[];
}
