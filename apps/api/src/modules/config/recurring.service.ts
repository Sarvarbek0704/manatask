import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurringTask, RecurrenceFrequency } from '../../database/entities';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(
    @InjectRepository(RecurringTask) private recurring: Repository<RecurringTask>,
    private tasks: TasksService,
  ) {}

  list(projectId: string) {
    return this.recurring.find({ where: { projectId }, order: { createdAt: 'DESC' } });
  }

  create(
    workspaceId: string,
    projectId: string,
    userId: string,
    dto: { frequency: RecurrenceFrequency; interval?: number; payload: Record<string, unknown>; startAt?: string },
  ) {
    return this.recurring.save(
      this.recurring.create({
        workspaceId,
        projectId,
        frequency: dto.frequency,
        interval: dto.interval ?? 1,
        // Stamp the creator so spawned tasks have a valid reporter.
        payload: { ...(dto.payload ?? {}), reporterId: userId },
        nextRunAt: dto.startAt ? new Date(dto.startAt) : new Date(),
        active: true,
      }),
    );
  }

  async remove(projectId: string, id: string) {
    await this.recurring.delete({ id, projectId });
    return { ok: true };
  }

  private advance(date: Date, freq: RecurrenceFrequency, interval: number): Date {
    const d = new Date(date);
    if (freq === RecurrenceFrequency.DAILY) d.setDate(d.getDate() + interval);
    else if (freq === RecurrenceFrequency.WEEKLY) d.setDate(d.getDate() + 7 * interval);
    else d.setMonth(d.getMonth() + interval);
    return d;
  }

  /** Spawn tasks for any due recurrences. Runs hourly. */
  @Cron(CronExpression.EVERY_HOUR, { name: 'recurring-tasks' })
  async runDue() {
    const due = await this.recurring.find({
      where: { active: true, nextRunAt: LessThanOrEqual(new Date()) },
    });
    for (const rec of due) {
      try {
        const payload: any = { ...rec.payload, projectId: rec.projectId };
        if (!payload.title) payload.title = 'Recurring task';
        await this.tasks.create(rec.workspaceId, rec.payload.reporterId as string, payload);
        rec.nextRunAt = this.advance(rec.nextRunAt, rec.frequency, rec.interval);
        await this.recurring.save(rec);
      } catch (e) {
        this.logger.warn(`Recurring ${rec.id} failed: ${(e as Error).message}`);
      }
    }
    if (due.length) this.logger.log(`Spawned ${due.length} recurring tasks`);
  }
}
