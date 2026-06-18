import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, IsNull, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { User, Task } from '../../database/entities';

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function toIcsDate(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}
function escapeIcs(s: string) {
  return (s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    private config: ConfigService,
  ) {}

  private feedUrl(token: string) {
    const api = this.config.get<string>('apiUrl') ?? 'http://localhost:4000/api';
    return `${api}/calendar/${token}/manatask.ics`;
  }

  async getFeed(userId: string) {
    const user = await this.users.findOneByOrFail({ id: userId });
    if (!user.calendarToken) {
      user.calendarToken = randomUUID();
      await this.users.save(user);
    }
    return { token: user.calendarToken, url: this.feedUrl(user.calendarToken) };
  }

  async regenerate(userId: string) {
    const user = await this.users.findOneByOrFail({ id: userId });
    user.calendarToken = randomUUID();
    await this.users.save(user);
    return { token: user.calendarToken, url: this.feedUrl(user.calendarToken) };
  }

  /** Builds an iCal feed of the user's due-dated tasks across all workspaces. */
  async buildIcs(token: string): Promise<string> {
    const user = await this.users.findOne({ where: { calendarToken: token } });
    if (!user) throw new NotFoundException('Calendar not found.');

    const tasks = await this.tasks.find({
      where: { assigneeId: user.id, dueDate: Not(IsNull()) },
      relations: { project: true, status: true },
      take: 1000,
    });

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//manaTask//Tasks//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:manaTask',
      'NAME:manaTask',
    ];
    for (const t of tasks) {
      const due = new Date(t.dueDate as unknown as string);
      const end = new Date(due);
      end.setUTCDate(end.getUTCDate() + 1);
      const key = t.project ? `${t.project.key}-${t.number}` : `#${t.number}`;
      lines.push(
        'BEGIN:VEVENT',
        `UID:${t.id}@manatask`,
        `DTSTAMP:${toIcsDate(new Date())}T000000Z`,
        `DTSTART;VALUE=DATE:${toIcsDate(due)}`,
        `DTEND;VALUE=DATE:${toIcsDate(end)}`,
        `SUMMARY:${escapeIcs(`${key} ${t.title}`)}`,
        `STATUS:${t.status?.category === 'done' ? 'COMPLETED' : 'CONFIRMED'}`,
        'END:VEVENT',
      );
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
}
