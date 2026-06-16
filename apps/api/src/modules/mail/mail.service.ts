import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Sends transactional mail. If SMTP is not configured (dev), it logs the
 * message to the console instead of failing — so invitations still produce a
 * usable link locally.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('mail.host');
    const port = this.config.get<number>('mail.port') ?? 587;
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
        requireTLS: port !== 465,
        auth: {
          user: this.config.get<string>('mail.user'),
          pass: this.config.get<string>('mail.pass'),
        },
        // Fail fast instead of hanging if the host blocks outbound SMTP.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      });
    }
  }

  /** Verify SMTP connectivity at boot so misconfig/port-blocking is obvious in logs. */
  async onModuleInit() {
    if (!this.transporter) {
      this.logger.warn('SMTP not configured — emails will be logged to console only.');
      return;
    }
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified — email sending is ready.');
    } catch (e) {
      this.logger.error(`SMTP verify FAILED: ${(e as Error).message}`);
    }
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    const from = this.config.get<string>('mail.from');
    if (!this.transporter) {
      this.logger.log(`[DEV MAIL] To: ${to} | ${subject}\n${html}`);
      return;
    }
    try {
      const info = await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Email sent to ${to} (id: ${info.messageId})`);
    } catch (e) {
      this.logger.error(`Email to ${to} FAILED: ${(e as Error).message}`);
      throw e;
    }
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
