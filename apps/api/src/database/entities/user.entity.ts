import { Column, Entity, OneToMany } from 'typeorm';
import { Locale } from '@manatask/shared';
import { BaseEntity } from './base.entity';
import { WorkspaceMember } from './workspace-member.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  passwordHash: string | null;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', length: 5, default: 'uz' })
  locale: Locale;

  /** Set when the user signs in via Google OAuth. */
  @Column({ type: 'varchar', nullable: true })
  googleId: string | null;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  /** Capability token for the personal iCal calendar feed (rotatable). */
  @Column({ type: 'varchar', nullable: true })
  calendarToken: string | null;

  @OneToMany(() => WorkspaceMember, (m) => m.user)
  memberships: WorkspaceMember[];
}
