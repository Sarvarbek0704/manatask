import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AuthResponse, WorkspaceRole } from '@manatask/shared';
import { User, Workspace, WorkspaceMember } from '../../database/entities';
import { toUserPublic } from '../../common/mappers';
import { slugify } from '../../common/util';
import { SessionsService, SessionContext } from './sessions.service';
import { VerificationService } from './verification.service';
import { RegisterBody } from './dto';

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private dataSource: DataSource,
    private sessions: SessionsService,
    private verification: VerificationService,
  ) {}

  async register(body: RegisterBody, ctx: SessionContext): Promise<AuthResponse> {
    const email = body.email.toLowerCase().trim();
    if (await this.users.findOne({ where: { email } })) {
      throw new ConflictException('Email already registered.');
    }
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await this.users.save(
      this.users.create({
        email,
        passwordHash,
        name: body.name,
        locale: body.locale ?? 'uz',
      }),
    );
    if (body.workspaceName) {
      await this.createWorkspaceForOwner(user.id, body.workspaceName);
    }
    // Fire-and-forget OTP email (never blocks signup).
    this.verification.sendEmailOtp(user).catch((e) =>
      this.logger.warn(`Verification email failed: ${e.message}`),
    );
    return this.respond(user, ctx);
  }

  async login(email: string, password: string, ctx: SessionContext): Promise<AuthResponse> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: email.toLowerCase().trim() })
      .getOne();
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    return this.respond(user, ctx);
  }

  async loginWithGoogle(profile: GoogleProfile, ctx: SessionContext): Promise<AuthResponse> {
    if (!profile.email) throw new UnauthorizedException('Google account has no email.');
    const email = profile.email.toLowerCase();
    let user = await this.users.findOne({ where: { email } });
    if (!user) {
      user = await this.users.save(
        this.users.create({
          email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          googleId: profile.googleId,
          emailVerified: true, // Google already verified the address.
          locale: 'uz',
        }),
      );
    } else if (!user.googleId) {
      user.googleId = profile.googleId;
      user.emailVerified = true;
      await this.users.save(user);
    }
    return this.respond(user, ctx);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const { tokens, user } = await this.sessions.rotate(refreshToken);
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: toUserPublic(user)! };
  }

  async logout(sid: string): Promise<void> {
    if (sid) await this.sessions.revoke(sid);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessions.revokeAll(userId);
  }

  async revokeSession(userId: string, sid: string): Promise<void> {
    const ok = await this.sessions.revokeOwned(userId, sid);
    if (!ok) throw new NotFoundException('Session not found.');
  }

  listSessions(userId: string, currentSid?: string) {
    return this.sessions.list(userId, currentSid);
  }

  // ---- Email verification ----
  async resendVerification(userId: string): Promise<void> {
    const user = await this.users.findOneByOrFail({ id: userId });
    if (user.emailVerified) return;
    await this.verification.sendEmailOtp(user);
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.verification.verifyEmail(token);
    await this.users.update({ id: userId }, { emailVerified: true });
  }

  /** Verify the 6-digit OTP for the current user and mark them verified. */
  async verifyEmailOtp(userId: string, code: string): Promise<{ user: ReturnType<typeof toUserPublic> }> {
    await this.verification.verifyOtp(userId, code);
    await this.users.update({ id: userId }, { emailVerified: true });
    const user = await this.users.findOneByOrFail({ id: userId });
    return { user: toUserPublic(user) };
  }

  // ---- Password reset ----
  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findOne({ where: { email: email.toLowerCase().trim() } });
    // Never reveal whether the email exists.
    if (user) await this.verification.sendPasswordReset(user);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.verification.consumePasswordReset(token);
    await this.users.update({ id: userId }, { passwordHash: await bcrypt.hash(newPassword, 10) });
    // Invalidate every existing session after a password change.
    await this.sessions.revokeAll(userId);
  }

  private async respond(user: User, ctx: SessionContext): Promise<AuthResponse> {
    const tokens = await this.sessions.createForLogin(user, ctx);
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: toUserPublic(user)! };
  }

  private async createWorkspaceForOwner(userId: string, name: string) {
    await this.dataSource.transaction(async (mgr) => {
      const repo = mgr.getRepository(Workspace);
      const slug = await this.uniqueSlug(repo, slugify(name));
      const ws = await repo.save(repo.create({ name, slug }));
      await mgr.getRepository(WorkspaceMember).save(
        mgr.getRepository(WorkspaceMember).create({
          workspaceId: ws.id,
          userId,
          role: WorkspaceRole.OWNER,
        }),
      );
    });
  }

  private async uniqueSlug(repo: Repository<Workspace>, base: string): Promise<string> {
    let slug = base || 'workspace';
    let i = 1;
    while (await repo.findOne({ where: { slug } })) slug = `${base}-${i++}`;
    return slug;
  }
}
