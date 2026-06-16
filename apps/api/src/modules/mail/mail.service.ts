import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type Mode = 'brevo' | 'resend' | 'smtp' | 'console';

/**
 * Transactional email. Prefers an HTTP provider (Brevo/Resend) because many
 * hosts (Render, etc.) block outbound SMTP ports — HTTP/443 always works.
 * Falls back to SMTP, then to console logging (dev).
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private mode: Mode = 'console';
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const port = this.config.get<number>('mail.port') ?? 587;
    if (this.config.get<string>('mail.brevoApiKey')) {
      this.mode = 'brevo';
    } else if (this.config.get<string>('mail.resendApiKey')) {
      this.mode = 'resend';
    } else if (this.config.get<string>('mail.host')) {
      this.mode = 'smtp';
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('mail.host'),
        port,
        secure: port === 465,
        requireTLS: port !== 465,
        auth: {
          user: this.config.get<string>('mail.user'),
          pass: this.config.get<string>('mail.pass'),
        },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      });
    }
  }

  async onModuleInit() {
    this.logger.log(`Email transport: ${this.mode}`);
    if (this.mode === 'smtp' && this.transporter) {
      try {
        await this.transporter.verify();
        this.logger.log('SMTP connection verified.');
      } catch (e) {
        this.logger.error(`SMTP verify FAILED: ${(e as Error).message}`);
      }
    }
  }

  /** Parse `Name <email@host>` (or a bare address) into parts. */
  private parseFrom(): { name: string; email: string } {
    const raw = this.config.get<string>('mail.from') ?? 'manaTask <no-reply@manatask.app>';
    const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(raw);
    if (m) return { name: m[1] || 'manaTask', email: m[2] };
    return { name: 'manaTask', email: raw.trim() };
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    try {
      if (this.mode === 'brevo') await this.sendBrevo(to, subject, html);
      else if (this.mode === 'resend') await this.sendResend(to, subject, html);
      else if (this.mode === 'smtp' && this.transporter) {
        const info = await this.transporter.sendMail({ from: this.config.get('mail.from'), to, subject, html });
        this.logger.log(`Email sent to ${to} (id: ${info.messageId})`);
      } else {
        this.logger.log(`[DEV MAIL] To: ${to} | ${subject}\n${html}`);
        return;
      }
      this.logger.log(`Email sent to ${to} via ${this.mode}`);
    } catch (e) {
      this.logger.error(`Email to ${to} FAILED (${this.mode}): ${(e as Error).message}`);
      throw e;
    }
  }

  private async sendBrevo(to: string, subject: string, html: string) {
    const from = this.parseFrom();
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': this.config.get<string>('mail.brevoApiKey')!,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: from,
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
  }

  private async sendResend(to: string, subject: string, html: string) {
    const from = this.parseFrom();
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.config.get<string>('mail.resendApiKey')}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from: `${from.name} <${from.email}>`, to, subject, html }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }

  async sendInvitation(to: string, workspaceName: string, link: string) {
    await this.send(
      to,
      `You're invited to ${workspaceName} on manaTask`,
      `<p>You have been invited to join <b>${workspaceName}</b>.</p>
       <p><a href="${link}">Accept the invitation</a></p>`,
    );
  }
}
