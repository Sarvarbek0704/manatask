import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { customAlphabet } from 'nanoid';
import { Session, User } from '../../database/entities';

const jtiGen = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 16);

/**
 * SHA-256 (hex) of the refresh token. Refresh tokens are high-entropy signed
 * JWTs, so a fast full-length hash is correct here — bcrypt would silently
 * truncate at 72 bytes and make distinct tokens collide.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

export interface SessionContext {
  userAgent?: string | null;
  ip?: string | null;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  sid: string;
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session) private sessions: Repository<Session>,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  /** Create a brand-new session (new device login) and return its tokens. */
  async createForLogin(user: User, ctx: SessionContext): Promise<IssuedTokens> {
    const session = await this.sessions.save(
      this.sessions.create({
        userId: user.id,
        familyId: randomUUID(),
        tokenHash: '',
        userAgent: ctx.userAgent ?? null,
        ip: ctx.ip ?? null,
        expiresAt: this.refreshExpiry(),
        lastUsedAt: new Date(),
      }),
    );
    return this.signAndStore(user, session);
  }

  /** Validate a refresh token, rotate it, and return fresh tokens + user. */
  async rotate(refreshToken: string): Promise<{ tokens: IssuedTokens; user: User }> {
    let payload: { sub: string; email: string; sid: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const session = await this.sessions
      .createQueryBuilder('s')
      .addSelect('s.tokenHash')
      .leftJoinAndSelect('s.user', 'user')
      .where('s.id = :id', { id: payload.sid })
      .getOne();

    if (!session) throw new UnauthorizedException('Session not found.');

    // Reuse of a revoked token → likely theft → nuke the whole family.
    if (session.revokedAt) {
      await this.revokeFamily(session.familyId);
      throw new UnauthorizedException('Session revoked.');
    }
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired.');
    }
    if (!safeEqualHex(hashToken(refreshToken), session.tokenHash)) {
      await this.revokeFamily(session.familyId);
      throw new UnauthorizedException('Refresh token reuse detected.');
    }

    session.lastUsedAt = new Date();
    const tokens = await this.signAndStore(session.user, session);
    return { tokens, user: session.user };
  }

  async revoke(sid: string): Promise<void> {
    await this.sessions.update({ id: sid }, { revokedAt: new Date() });
  }

  /** Revoke a specific session, but only if it belongs to the given user. */
  async revokeOwned(userId: string, sid: string): Promise<boolean> {
    const res = await this.sessions.update({ id: sid, userId }, { revokedAt: new Date() });
    return (res.affected ?? 0) > 0;
  }

  async revokeAll(userId: string): Promise<void> {
    await this.sessions.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.sessions.update({ familyId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async list(userId: string, currentSid?: string) {
    const rows = await this.sessions.find({
      where: { userId, revokedAt: IsNull() },
      order: { lastUsedAt: 'DESC' },
    });
    return rows
      .filter((s) => s.expiresAt > new Date())
      .map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        ip: s.ip,
        current: s.id === currentSid,
        lastUsedAt: s.lastUsedAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      }));
  }

  /** Housekeeping — remove long-expired sessions (called by scheduler). */
  async purgeExpired(): Promise<number> {
    const res = await this.sessions.delete({ expiresAt: LessThan(new Date()) });
    return res.affected ?? 0;
  }

  private async signAndStore(user: User, session: Session): Promise<IssuedTokens> {
    const base = { sub: user.id, email: user.email, sid: session.id };
    const accessToken = await this.jwt.signAsync(base, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessTtl'),
    });
    const refreshToken = await this.jwt.signAsync(
      { ...base, jti: jtiGen() },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshTtl'),
      },
    );
    session.tokenHash = hashToken(refreshToken);
    await this.sessions.save(session);
    return { accessToken, refreshToken, sid: session.id };
  }

  private refreshExpiry(): Date {
    // Mirror JWT_REFRESH_TTL roughly (default 30d) for DB-side expiry.
    const ttl = this.config.get<string>('jwt.refreshTtl') ?? '30d';
    const days = /(\d+)d/.exec(ttl)?.[1];
    const d = new Date();
    d.setDate(d.getDate() + (days ? parseInt(days, 10) : 30));
    return d;
  }
}
