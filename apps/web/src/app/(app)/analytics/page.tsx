'use client';

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  ListTodo,
  CheckCircle2,
  PlusCircle,
  AlertTriangle,
  Trophy,
  Clock,
} from 'lucide-react';
import { StatusCategory, TaskPriority } from '@manatask/shared';
import { useAnalytics, useProjects, useVelocity } from '@/lib/hooks';
import { useChartColors } from '@/lib/chart-colors';
import { useI18n } from '@/lib/i18n';
import { Card, Skeleton } from '@/components/ui/primitives';
import { Avatar } from '@/components/ui/avatar';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ChartCard, ChartEmpty } from '@/components/analytics/ChartCard';
import { cn } from '@/lib/cn';

const STATUS_HEX: Record<StatusCategory, string> = {
  [StatusCategory.BACKLOG]: '#94a3b8',
  [StatusCategory.TODO]: '#64748b',
  [StatusCategory.IN_PROGRESS]: '#6366f1',
  [StatusCategory.DONE]: '#22c55e',
  [StatusCategory.CANCELLED]: '#ef4444',
};
const STATUS_LABEL: Record<StatusCategory, string> = {
  backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', done: 'Done', cancelled: 'Cancelled',
};
const PRIORITY_HEX: Record<TaskPriority, string> = {
  none: '#94a3b8', low: '#0ea5e9', medium: '#f59e0b', high: '#f97316', urgent: '#ef4444',
};

function fmtMinutes(m: number) {
  if (!m) return '0h';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h ? `${h}h${min ? ` ${min}m` : ''}` : `${min}m`;
}

const tooltipStyle = {
  background: 'hsl(var(--elevated))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 10,
  fontSize: 12,
  boxShadow: '0 8px 28px -6px hsl(var(--shadow-color) / 0.2)',
  color: 'hsl(var(--foreground))',
};

export default function AnalyticsPage() {
  const { t } = useI18n();
  const c = useChartColors();
  const { data: projects } = useProjects();
  const [projectId, setProjectId] = useState('all');
  const [days, setDays] = useState(30);

  const pid = projectId === 'all' ? undefined : projectId;
  const { data, isLoading } = useAnalytics({ projectId: pid, days });
  const { data: velocity } = useVelocity(pid);

  const stats = [
    { icon: ListTodo, label: t('dashboard.total'), value: data?.totals.total, tint: 'text-accent bg-accent-soft' },
    { icon: CheckCircle2, label: t('analytics.completed'), value: data?.totals.completedInRange, tint: 'text-success bg-success/12' },
    { icon: PlusCircle, label: t('analytics.created'), value: data?.totals.createdInRange, tint: 'text-sky-500 bg-sky-500/12' },
    { icon: AlertTriangle, label: t('dashboard.overdue'), value: data?.totals.overdue, tint: 'text-danger bg-danger/10' },
  ];

  const statusData = useMemo(
    () => (data?.statusDistribution ?? []).filter((s) => s.count > 0).map((s) => ({
      name: STATUS_LABEL[s.category], value: s.count, fill: STATUS_HEX[s.category],
    })),
    [data],
  );
  const priorityData = useMemo(
    () => (data?.priorityDistribution ?? []).map((p) => ({
      name: t(`priority.${p.priority}`), value: p.count, fill: PRIORITY_HEX[p.priority],
    })),
    [data, t],
  );
  const memberBar = useMemo(
    () => (data?.members ?? []).slice(0, 8).map((m) => ({
      name: m.user.name.split(' ')[0], done: m.completedInRange, full: m.user.name,
    })),
    [data],
  );
  const topDone = Math.max(1, ...(data?.members ?? []).map((m) => m.done));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('analytics.title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('analytics.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('analytics.allProjects')}</SelectItem>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', s.tint)}>
              <s.icon className="h-[18px] w-[18px]" />
            </div>
            {isLoading ? <Skeleton className="mt-4 h-8 w-12" /> : (
              <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{s.value ?? 0}</p>
            )}
            <p className="mt-0.5 text-sm text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Trend */}
      <div className="mt-6">
        <ChartCard title={t('analytics.trend')}>
          <div className="h-72">
            {data ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.series} margin={{ left: -18, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c.success} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={c.success} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c.accent} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: c.muted, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(d) => format(parseISO(d), days > 31 ? 'MMM' : 'MMM d')}
                    minTickGap={24}
                  />
                  <YAxis tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                  <RTooltip contentStyle={tooltipStyle} labelFormatter={(d) => format(parseISO(d as string), 'PPP')} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: c.muted }} />
                  <Area type="monotone" dataKey="completed" name={t('analytics.completed')} stroke={c.success} strokeWidth={2} fill="url(#gCompleted)" />
                  <Area type="monotone" dataKey="created" name={t('analytics.created')} stroke={c.accent} strokeWidth={2} fill="url(#gCreated)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <ChartEmpty label={t('common.loading')} />}
          </div>
        </ChartCard>
      </div>

      {/* Distributions */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title={t('analytics.byStatus')}>
          <div className="h-64">
            {statusData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2} strokeWidth={0}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <RTooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: c.muted }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <ChartEmpty label={t('analytics.noData')} />}
          </div>
        </ChartCard>

        <ChartCard title={t('analytics.byMember')}>
          <div className="h-64">
            {memberBar.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberBar} margin={{ left: -18, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                  <RTooltip contentStyle={tooltipStyle} cursor={{ fill: c.accent, fillOpacity: 0.06 }} labelFormatter={(_l, p) => p?.[0]?.payload?.full ?? ''} />
                  <Bar dataKey="done" name={t('analytics.completed')} fill={c.accent} radius={[6, 6, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            ) : <ChartEmpty label={t('analytics.noData')} />}
          </div>
        </ChartCard>
      </div>

      {/* Velocity (project only) + Priority */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title={t('analytics.byPriority')}>
          <div className="h-56">
            {priorityData.some((p) => p.value) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={priorityData} margin={{ left: 12, right: 16 }}>
                  <XAxis type="number" tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={false} width={72} />
                  <RTooltip contentStyle={tooltipStyle} cursor={{ fill: c.accent, fillOpacity: 0.06 }} />
                  <Bar dataKey="value" name="Tasks" radius={[0, 6, 6, 0]} maxBarSize={26}>
                    {priorityData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <ChartEmpty label={t('analytics.noData')} />}
          </div>
        </ChartCard>

        <ChartCard title={t('analytics.velocity')}>
          <div className="h-56">
            {pid && velocity?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocity} margin={{ left: -18, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                  <RTooltip contentStyle={tooltipStyle} cursor={{ fill: c.accent, fillOpacity: 0.06 }} />
                  <Bar dataKey="completed" name={t('analytics.completed')} fill={c.success} radius={[6, 6, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            ) : <ChartEmpty label={pid ? t('analytics.noData') : t('analytics.allProjects')} />}
          </div>
        </ChartCard>
      </div>

      {/* Leaderboard */}
      <div className="mt-6">
        <ChartCard title={t('analytics.leaderboard')} action={<Trophy className="h-4 w-4 text-warning" />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <th className="px-2 pb-2 font-semibold">{t('analytics.member')}</th>
                  <th className="px-2 pb-2 text-right font-semibold">{t('analytics.assigned')}</th>
                  <th className="px-2 pb-2 text-right font-semibold">{t('view.list')}</th>
                  <th className="px-2 pb-2 text-right font-semibold">{t('analytics.completed')}</th>
                  <th className="hidden px-2 pb-2 text-right font-semibold sm:table-cell">{t('analytics.timeLogged')}</th>
                  <th className="w-40 px-2 pb-2 font-semibold">{t('dashboard.workload')}</th>
                </tr>
              </thead>
              <tbody>
                {data?.members.length ? data.members.map((m) => {
                  const pct = Math.round((m.done / topDone) * 100);
                  return (
                    <tr key={m.user.id} className="border-t border-border/60">
                      <td className="px-2 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <Avatar name={m.user.name} url={m.user.avatarUrl} size="sm" />
                          <span className="truncate font-medium">{m.user.name}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted">{m.assigned}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted">{m.open}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums font-medium text-success">{m.done}</td>
                      <td className="hidden px-2 py-2.5 text-right tabular-nums text-muted sm:table-cell">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{fmtMinutes(m.minutesLogged)}</span>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={6} className="px-2 py-10 text-center text-muted">{t('analytics.noData')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
