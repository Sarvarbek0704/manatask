import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Sends transactional mail. If SMTP is not configured (dev), it logs the
 * message to the console instead of failing — so invitations still produce a
 * usable link locally.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('mail.host');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('mail.port'),
        secure: false,
        auth: {
          user: this.config.get<string>('mail.user'),
          pass: this.config.get<string>('mail.pass'),
        },
      });
    }
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    const from = this.config.get<string>('mail.from');
    if (!this.transporter) {
      this.logger.log(`[DEV MAIL] To: ${to} | ${subject}\n${html}`);
      return;
    }
    await this.transporter.sendMail({ from, to, subject, html });
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
