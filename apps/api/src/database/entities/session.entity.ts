import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * One row per device login. Refresh tokens are rotated on every use; each
 * rotation updates `tokenHash`. Presenting an old (already-rotated) token is
 * treated as theft and revokes the whole `familyId`.
 */
@Entity('sessions')
@Index(['userId'])
@Index(['familyId'])
export class Session extends BaseEntity {
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Constant across rotations of the same login chain. */
  @Column('uuid')
  familyId: string;

  /** bcrypt hash of the current valid refresh token. */
  @Column({ type: 'varchar', select: false })
  tokenHash: string;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;
}
