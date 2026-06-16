import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import IORedis, { Redis } from 'ioredis';
import { MailService } from '../mail/mail.service';

export interface EmailJob {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends email through a durable BullMQ queue when REDIS_URL is set (retries,
 * backoff, survives restarts). Without Redis it falls back to sending inline —
 * so the app works in dev/simple deploys with zero extra infra.
 */
@Injectable()
export class EmailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueService.name);
  private connection?: Redis;
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    private config: ConfigService,
    private mail: MailService,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('redisUrl');
    if (!url) {
      this.logger.log('Email queue: inline mode (no REDIS_URL)');
      return;
    }
    // BullMQ requires maxRetriesPerRequest: null. Cast: bullmq bundles its own
    // ioredis typings which differ structurally from the `ioredis` package.
    this.connection = new IORedis(url, { maxRetriesPerRequest: null });
    const connection = this.connection as any;
    this.queue = new Queue('email', { connection });
    this.worker = new Worker(
      'email',
      async (job) => {
        const { to, subject, html } = job.data as EmailJob;
        await this.mail.send(to, subject, html);
      },
      { connection },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(`Email job ${job?.id} failed: ${err.message}`),
    );
    this.logger.log('Email queue: BullMQ mode (Redis connected)');
  }

  async add(job: EmailJob): Promise<void> {
    if (this.queue) {
      await this.queue.add('send', job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      });
    } else {
      // Inline fallback — never block the request on transient mail failures.
      this.mail.send(job.to, job.subject, job.html).catch((e) =>
        this.logger.warn(`Inline email send failed: ${e.message}`),
      );
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    this.connection?.disconnect();
  }
}
