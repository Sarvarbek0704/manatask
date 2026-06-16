import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { customAlphabet } from 'nanoid';
import * as bcrypt from 'bcryptjs';
import {
  User,
  VerificationToken,
  VerificationTokenType,
} from '../../database/entities';
import { EmailQueueService } from '../jobs/email-queue.service';

const secretGen = customAlphabet(
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789',
  40,
);
const otpGen = customAlphabet('0123456789', 6);
const OTP_TTL_MIN = 10;

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    @InjectRepository(VerificationToken) private tokens: Repository<VerificationToken>,
    private config: ConfigService,
    private email: EmailQueueService,
  ) {}

  /** Issues a single-use token of the form `<rowId>.<secret>` (only the hash is stored). */
  private async issue(userId: string, type: VerificationTokenType, ttlHours: number): Promise<string> {
    const secret = secretGen();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);
    const row = await this.tokens.save(
      this.tokens.create({
        userId,
        type,
        tokenHash: await bcrypt.hash(secret, 10),
        expiresAt,
      }),
    );
    return `${row.id}.${secret}`;
  }

  private async consume(token: string, type: VerificationTokenType): Promise<string> {
    const [id, secret] = (token ?? '').split('.');
    if (!id || !secret) throw new BadRequestException('Invalid token.');
    const row = await this.tokens
      .createQueryBuilder('t')
      .addSelect('t.tokenHash')
      .where('t.id = :id AND t.type = :type', { id, type })
      .getOne();
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new BadRequestException('Token invalid or expired.');
    }
    if (!(await bcrypt.compare(secret, row.tokenHash))) {
      throw new BadRequestException('Invalid token.');
    }
    row.usedAt = new Date();
    await this.tokens.save(row);
    return row.userId;
  }

  private webUrl(): string {
    return this.config.get<string>('webOrigin') ?? 'http://localhost:3000';
  }

  async sendEmailVerification(user: User): Promise<void> {
    const token = await this.issue(user.id, VerificationTokenType.EMAIL_VERIFY, 48);
    const link = `${this.webUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    await this.email.add({
      to: user.email,
      subject: 'Verify your email · manaTask',
      html: `<p>Welcome to manaTask!</p><p><a href="${link}">Verify your email address</a></p>`,
    });
  }

  async verifyEmail(token: string): Promise<string> {
    return this.consume(token, VerificationTokenType.EMAIL_VERIFY);
  }

  // ---- OTP (6-digit code) email verification ----

  /** Sends a fresh 6-digit code, invalidating any previous unused codes. */
  async sendEmailOtp(user: User): Promise<void> {
    // Invalidate previous unused codes so only the latest works.
    await this.tokens.update(
      { userId: user.id, type: VerificationTokenType.EMAIL_VERIFY, usedAt: IsNull() },
      { usedAt: new Date() },
    );
    const code = otpGen();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_TTL_MIN);
    await this.tokens.save(
      this.tokens.create({
        userId: user.id,
        type: VerificationTokenType.EMAIL_VERIFY,
        tokenHash: await bcrypt.hash(code, 10),
        expiresAt,
      }),
    );
    await this.email.add({
      to: user.email,
      subject: `${code} is your manaTask verification code`,
      html: `<p>Your manaTask verification code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:12px 0">${code}</p>
        <p>It expires in ${OTP_TTL_MIN} minutes. If you didn't request this, ignore this email.</p>`,
    });
    this.logger.log(`OTP issued for ${user.email}`);
  }

  /** Verifies a 6-digit code for the user. Throws on invalid/expired. */
  async verifyOtp(userId: string, code: string): Promise<void> {
    const row = await this.tokens
      .createQueryBuilder('t')
      .addSelect('t.tokenHash')
      .where('t.userId = :userId AND t.type = :type', {
        userId,
        type: VerificationTokenType.EMAIL_VERIFY,
      })
      .andWhere('t.usedAt IS NULL')
      .orderBy('t.createdAt', 'DESC')
      .getOne();

    if (!row || row.expiresAt < new Date()) {
      throw new BadRequestException('Code expired. Request a new one.');
    }
    if (!(await bcrypt.compare((code ?? '').trim(), row.tokenHash))) {
      throw new BadRequestException('Incorrect code.');
    }
    row.usedAt = new Date();
    await this.tokens.save(row);
  }

  async sendPasswordReset(user: User): Promise<void> {
    const token = await this.issue(user.id, VerificationTokenType.PASSWORD_RESET, 2);
    const link = `${this.webUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    await this.email.add({
      to: user.email,
      subject: 'Reset your password · manaTask',
      html: `<p>We received a request to reset your password.</p>
       <p><a href="${link}">Reset password</a> (valid for 2 hours)</p>
       <p>If you didn't request this, you can ignore this email.</p>`,
    });
  }

  async consumePasswordReset(token: string): Promise<string> {
    return this.consume(token, VerificationTokenType.PASSWORD_RESET);
  }
}
