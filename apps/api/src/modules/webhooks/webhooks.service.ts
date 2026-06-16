import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { customAlphabet } from 'nanoid';
import { Queue, Worker } from 'bullmq';
import IORedis, { Redis } from 'ioredis';
import { Webhook } from '../../database/entities';

const secretGen = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz0123456789', 40);

interface DeliveryJob {
  webhookId: string;
  url: string;
  secret: string;
  event: string;
  body: string;
}

@Injectable()
export class WebhooksService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhooksService.name);
  private connection?: Redis;
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @InjectRepository(Webhook) private webhooks: Repository<Webhook>,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('redisUrl');
    if (!url) return;
    this.connection = new IORedis(url, { maxRetriesPerRequest: null });
    const connection = this.connection as any;
    this.queue = new Queue('webhooks', { connection });
    this.worker = new Worker(
      'webhooks',
      async (job) => this.deliver(job.data as DeliveryJob),
      { connection },
    );
    this.logger.log('Webhook delivery: BullMQ mode (retries enabled)');
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    this.connection?.disconnect();
  }

  async create(workspaceId: string, url: string, events: string[]) {
    const secret = `whsec_${secretGen()}`;
    const saved = await this.webhooks.save(
      this.webhooks.create({ workspaceId, url, events, secret, active: true }),
    );
    return { id: saved.id, url: saved.url, events: saved.events, active: saved.active, secret };
  }

  async list(workspaceId: string) {
    const rows = await this.webhooks.find({ where: { workspaceId }, order: { createdAt: 'DESC' } });
    return rows.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      active: w.active,
      lastDeliveryAt: w.lastDeliveryAt?.toISOString() ?? null,
      failureCount: w.failureCount,
      createdAt: w.createdAt.toISOString(),
    }));
  }

  async remove(workspaceId: string, id: string) {
    const wh = await this.webhooks.findOne({ where: { id, workspaceId } });
    if (!wh) throw new NotFoundException('Webhook not found.');
    await this.webhooks.remove(wh);
    return { ok: true };
  }

  /** Fan out an event to subscribed endpoints (queued with retries when Redis is on). */
  async dispatch(workspaceId: string, event: string, data: unknown): Promise<void> {
    const subs = await this.webhooks.find({ where: { workspaceId, active: true } });
    const targets = subs.filter((w) => w.events.includes(event) || w.events.includes('*'));
    if (!targets.length) return;

    const body = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    for (const wh of targets) {
      const job: DeliveryJob = { webhookId: wh.id, url: wh.url, secret: wh.secret, event, body };
      if (this.queue) {
        await this.queue.add('deliver', job, {
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 1000,
          removeOnFail: 1000,
        });
      } else {
        // Inline best-effort (no retries without Redis).
        this.deliver(job).catch(() => undefined);
      }
    }
  }

  private async deliver(job: DeliveryJob): Promise<void> {
    const signature = createHmac('sha256', job.secret).update(job.body).digest('hex');
    try {
      const res = await fetch(job.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Manatask-Event': job.event,
          'X-Manatask-Signature': `sha256=${signature}`,
        },
        body: job.body,
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await this.webhooks.update({ id: job.webhookId }, { lastDeliveryAt: new Date(), failureCount: 0 });
    } catch (e) {
      await this.webhooks.increment({ id: job.webhookId }, 'failureCount', 1);
      // Auto-disable flaky endpoints after repeated failures.
      const wh = await this.webhooks.findOne({ where: { id: job.webhookId } });
      if (wh && wh.failureCount >= 15) {
        await this.webhooks.update({ id: job.webhookId }, { active: false });
      }
      throw e; // let BullMQ retry
    }
  }
}
