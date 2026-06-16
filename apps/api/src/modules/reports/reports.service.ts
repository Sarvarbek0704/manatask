import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusCategory, TaskPriority, DashboardSummary } from '@manatask/shared';
import { Task, TimeEntry, Sprint } from '../../database/entities';

const OPEN_CATS = [StatusCategory.BACKLOG, StatusCategory.TODO, StatusCategory.IN_PROGRESS];

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(TimeEntry) private timeEntries: Repository<TimeEntry>,
    @InjectRepository(Sprint) private sprints: Repository<Sprint>,
  ) {}

  async dashboard(workspaceId: string, projectId?: string): Promise<DashboardSummary> {
    const base = () => {
      const qb = this.tasks
        .createQueryBuilder('t')
        .leftJoin('t.status', 'status')
        .where('t.workspaceId = :workspaceId', { workspaceId });
      if (projectId) qb.andWhere('t.projectId = :projectId', { projectId });
      return qb;
    };

    const totalTasks = await base().getCount();

    const categoryRows = await base()
      .select('status.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('status.category')
      .getRawMany<{ category: StatusCategory; count: string }>();

    const byCategory = {
      [StatusCategory.BACKLOG]: 0,
      [StatusCategory.TODO]: 0,
      [StatusCategory.IN_PROGRESS]: 0,
      [StatusCategory.DONE]: 0,
      [StatusCategory.CANCELLED]: 0,
    } as Record<StatusCategory, number>;
    categoryRows.forEach((r) => (byCategory[r.category] = Number(r.count)));

    const now = new Date();
    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const openCategories = [
      StatusCategory.BACKLOG,
      StatusCategory.TODO,
      StatusCategory.IN_PROGRESS,
    ];

    const overdue = await base()
      .andWhere('t.dueDate < :now', { now })
      .andWhere('status.category IN (:...cats)', { cats: openCategories })
      .getCount();

    const dueThisWeek = await base()
      .andWhere('t.dueDate BETWEEN :now AND :weekAhead', { now, weekAhead })
      .andWhere('status.category IN (:...cats)', { cats: openCategories })
      .getCount();

    const completedThisWeek = await base()
      .andWhere('status.category = :done', { done: StatusCategory.DONE })
      .andWhere('t.updatedAt >= :weekAgo', { weekAgo })
      .getCount();

    const assigneeRows = await base()
      .leftJoin('t.assignee', 'assignee')
      .andWhere('t.assigneeId IS NOT NULL')
      .select('assignee.id', 'id')
      .addSelect('assignee.name', 'name')
      .addSelect('assignee.email', 'email')
      .addSelect('assignee.avatarUrl', 'avatarUrl')
      .addSelect('assignee.locale', 'locale')
      .addSelect(
        `SUM(CASE WHEN status.category = 'done' THEN 1 ELSE 0 END)`,
        'done',
      )
      .addSelect(
        `SUM(CASE WHEN status.category IN ('backlog','todo','in_progress') THEN 1 ELSE 0 END)`,
        'open',
      )
      .groupBy('assignee.id')
      .addGroupBy('assignee.name')
      .addGroupBy('assignee.email')
      .addGroupBy('assignee.avatarUrl')
      .addGroupBy('assignee.locale')
      .getRawMany<any>();

    const byAssignee = assigneeRows.map((r) => ({
      user: {
        id: r.id,
        name: r.name,
        email: r.email,
        avatarUrl: r.avatarUrl ?? null,
        locale: r.locale ?? 'uz',
        emailVerified: true,
      },
      open: Number(r.open),
      done: Number(r.done),
    }));

    return {
      totalTasks,
      byCategory,
      overdue,
      dueThisWeek,
      completedThisWeek,
      byAssignee,
    };
  }

  /** Logged time grouped by user and by day, within an optional date range. */
  async timeReport(workspaceId: string, opts: { projectId?: string; from?: string; to?: string }) {
    const qb = this.timeEntries
      .createQueryBuilder('te')
      .innerJoin('te.task', 't')
      .where('t.workspaceId = :ws', { ws: workspaceId });
    if (opts.projectId) qb.andWhere('t.projectId = :pid', { pid: opts.projectId });
    if (opts.from) qb.andWhere('te.spentOn >= :from', { from: opts.from });
    if (opts.to) qb.andWhere('te.spentOn <= :to', { to: opts.to });

    const byUser = await qb
      .clone()
      .leftJoin('te.user', 'u')
      .select('u.id', 'userId')
      .addSelect('u.name', 'name')
      .addSelect('COALESCE(SUM(te.minutes),0)', 'minutes')
      .groupBy('u.id')
      .addGroupBy('u.name')
      .getRawMany<{ userId: string; name: string; minutes: string }>();

    const byDay = await qb
      .clone()
      .select('te.spentOn', 'day')
      .addSelect('COALESCE(SUM(te.minutes),0)', 'minutes')
      .groupBy('te.spentOn')
      .orderBy('te.spentOn', 'ASC')
      .getRawMany<{ day: string; minutes: string }>();

    const totalMinutes = byUser.reduce((s, r) => s + Number(r.minutes), 0);
    return {
      totalMinutes,
      byUser: byUser.map((r) => ({ userId: r.userId, name: r.name, minutes: Number(r.minutes) })),
      byDay: byDay.map((r) => ({ day: r.day, minutes: Number(r.minutes) })),
    };
  }

  /** Approximate sprint burndown: remaining open tasks per day vs an ideal line. */
  async burndown(workspaceId: string, sprintId: string) {
    const sprint = await this.sprints.findOne({ where: { id: sprintId } });
    if (!sprint) throw new NotFoundException('Sprint not found.');
    const tasks = await this.tasks.find({
      where: { workspaceId, sprintId },
      relations: { status: true },
      withDeleted: false,
    });
    const total = tasks.length;
    const start = sprint.startDate ? new Date(sprint.startDate) : new Date(tasks[0]?.createdAt ?? Date.now());
    const end = sprint.endDate ? new Date(sprint.endDate) : new Date();
    const days: { day: string; remaining: number; ideal: number }[] = [];
    const totalDays = Math.max(1, Math.ceil((+end - +start) / 86400000));
    for (let i = 0; i <= totalDays; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      const doneByDay = tasks.filter(
        (t) => t.status?.category === StatusCategory.DONE && new Date(t.updatedAt) <= day,
      ).length;
      days.push({
        day: day.toISOString().slice(0, 10),
        remaining: total - doneByDay,
        ideal: Math.round(total * (1 - i / totalDays)),
      });
    }
    return { sprint: { id: sprint.id, name: sprint.name }, total, days };
  }

  /** Velocity: completed task count + estimate per sprint (recent sprints). */
  async velocity(workspaceId: string, projectId: string) {
    const sprints = await this.sprints.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
      take: 8,
    });
    const result: { sprintId: string; name: string; completed: number; estimateMinutes: number }[] = [];
    for (const s of sprints) {
      const rows = await this.tasks
        .createQueryBuilder('t')
        .leftJoin('t.status', 'status')
        .where('t.workspaceId = :ws AND t.sprintId = :sid', { ws: workspaceId, sid: s.id })
        .andWhere("status.category = 'done'")
        .select('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(t.estimateMinutes),0)', 'minutes')
        .getRawOne<{ count: string; minutes: string }>();
      result.push({
        sprintId: s.id,
        name: s.name,
        completed: Number(rows?.count ?? 0),
        estimateMinutes: Number(rows?.minutes ?? 0),
      });
    }
    return result.reverse();
  }

  /**
   * Comprehensive analytics for the analytics page: totals, distributions,
   * created-vs-completed daily series, and per-member productivity.
   */
  async analytics(workspaceId: string, opts: { projectId?: string; days?: number }) {
    const days = Math.min(180, Math.max(7, opts.days ?? 30));
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const scope = <T extends ReturnType<Repository<any>['createQueryBuilder']>>(qb: T): T => {
      qb.andWhere('t.workspaceId = :ws', { ws: workspaceId });
      if (opts.projectId) qb.andWhere('t.projectId = :pid', { pid: opts.projectId });
      return qb;
    };

    // ---- Totals ----
    const totalQb = scope(this.tasks.createQueryBuilder('t').leftJoin('t.status', 's'));
    const total = await totalQb.getCount();

    const catRows = await scope(
      this.tasks.createQueryBuilder('t').leftJoin('t.status', 's'),
    )
      .select('s.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('s.category')
      .getRawMany<{ category: StatusCategory; count: string }>();

    const statusDistribution = Object.values(StatusCategory).map((category) => ({
      category,
      count: Number(catRows.find((r) => r.category === category)?.count ?? 0),
    }));
    const done = statusDistribution.find((s) => s.category === StatusCategory.DONE)?.count ?? 0;
    const open = statusDistribution
      .filter((s) => OPEN_CATS.includes(s.category))
      .reduce((a, b) => a + b.count, 0);

    const priRows = await scope(this.tasks.createQueryBuilder('t'))
      .select('t.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.priority')
      .getRawMany<{ priority: TaskPriority; count: string }>();
    const priorityDistribution = Object.values(TaskPriority).map((priority) => ({
      priority,
      count: Number(priRows.find((r) => r.priority === priority)?.count ?? 0),
    }));

    const overdue = await scope(this.tasks.createQueryBuilder('t').leftJoin('t.status', 's'))
      .andWhere('t.dueDate < :now', { now: end })
      .andWhere('s.category IN (:...cats)', { cats: OPEN_CATS })
      .getCount();

    // ---- Daily created vs completed series ----
    const completedRows = await scope(this.tasks.createQueryBuilder('t').leftJoin('t.status', 's'))
      .andWhere("s.category = 'done'")
      .andWhere('t.updatedAt BETWEEN :start AND :end', { start, end })
      .select("to_char(date_trunc('day', t.\"updatedAt\"), 'YYYY-MM-DD')", 'day')
      .addSelect('COUNT(*)', 'count')
      .groupBy('day')
      .getRawMany<{ day: string; count: string }>();

    const createdRows = await scope(this.tasks.createQueryBuilder('t'))
      .andWhere('t.createdAt BETWEEN :start AND :end', { start, end })
      .select("to_char(date_trunc('day', t.\"createdAt\"), 'YYYY-MM-DD')", 'day')
      .addSelect('COUNT(*)', 'count')
      .groupBy('day')
      .getRawMany<{ day: string; count: string }>();

    const completedMap = new Map(completedRows.map((r) => [r.day, Number(r.count)]));
    const createdMap = new Map(createdRows.map((r) => [r.day, Number(r.count)]));
    const series: { date: string; created: number; completed: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = dayKey(d);
      series.push({ date: key, created: createdMap.get(key) ?? 0, completed: completedMap.get(key) ?? 0 });
    }
    const completedInRange = series.reduce((a, b) => a + b.completed, 0);
    const createdInRange = series.reduce((a, b) => a + b.created, 0);

    // ---- Per-member productivity ----
    const memberRows = await scope(
      this.tasks.createQueryBuilder('t').leftJoin('t.status', 's').leftJoin('t.assignee', 'u'),
    )
      .andWhere('t.assigneeId IS NOT NULL')
      .select('u.id', 'id')
      .addSelect('u.name', 'name')
      .addSelect('u.email', 'email')
      .addSelect('u.avatarUrl', 'avatarUrl')
      .addSelect('COUNT(*)', 'assigned')
      .addSelect("SUM(CASE WHEN s.category = 'done' THEN 1 ELSE 0 END)", 'done')
      .addSelect(
        "SUM(CASE WHEN s.category IN ('backlog','todo','in_progress') THEN 1 ELSE 0 END)",
        'open',
      )
      .addSelect(
        `SUM(CASE WHEN s.category = 'done' AND t."updatedAt" BETWEEN :start AND :end THEN 1 ELSE 0 END)`,
        'recent',
      )
      .setParameters({ start, end })
      .groupBy('u.id')
      .addGroupBy('u.name')
      .addGroupBy('u.email')
      .addGroupBy('u.avatarUrl')
      .getRawMany<any>();

    // Minutes logged per user in range.
    const timeRows = await this.timeEntries
      .createQueryBuilder('te')
      .innerJoin('te.task', 't')
      .where('t.workspaceId = :ws', { ws: workspaceId })
      .andWhere(opts.projectId ? 't.projectId = :pid' : '1=1', opts.projectId ? { pid: opts.projectId } : {})
      .andWhere('te.spentOn BETWEEN :s AND :e', { s: dayKey(start), e: dayKey(end) })
      .select('te.userId', 'userId')
      .addSelect('COALESCE(SUM(te.minutes),0)', 'minutes')
      .groupBy('te.userId')
      .getRawMany<{ userId: string; minutes: string }>();
    const minutesMap = new Map(timeRows.map((r) => [r.userId, Number(r.minutes)]));

    const members = memberRows
      .map((r) => ({
        user: { id: r.id, name: r.name, email: r.email, avatarUrl: r.avatarUrl ?? null },
        assigned: Number(r.assigned),
        done: Number(r.done),
        open: Number(r.open),
        completedInRange: Number(r.recent),
        minutesLogged: minutesMap.get(r.id) ?? 0,
      }))
      .sort((a, b) => b.completedInRange - a.completedInRange || b.done - a.done);

    return {
      range: { from: dayKey(start), to: dayKey(end), days },
      totals: { total, done, open, overdue, completedInRange, createdInRange },
      statusDistribution,
      priorityDistribution,
      series,
      members,
    };
  }
}
