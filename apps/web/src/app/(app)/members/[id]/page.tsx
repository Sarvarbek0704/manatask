'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Flame, CheckCircle2, NotebookPen, ListTodo, Clock } from 'lucide-react';
import { WorkLogStatus } from '@manatask/shared';
import { useMembers, useChallengeProgress, useWorkLogs, useTasks } from '@/lib/hooks';
import { useI18n } from '@/lib/i18n';
import { Card, Skeleton, Badge } from '@/components/ui/primitives';
import { Avatar } from '@/components/ui/avatar';
import { ContributionCalendar } from '@/components/ContributionCalendar';
import { cn } from '@/lib/cn';

const STATUS_BADGE: Record<string, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
  accepted: { variant: 'success', label: 'Accepted' },
  pending: { variant: 'warning', label: 'Pending' },
  rejected: { variant: 'danger', label: 'Rejected' },
};

function fmtMinutes(m: number | null) {
  if (!m) return '0h';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h ? `${h}h${min ? ` ${min}m` : ''}` : `${min}m`;
}

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { data: members } = useMembers();
  const { data: progress, isLoading } = useChallengeProgress(id);
  const { data: logs } = useWorkLogs({ userId: id, pageSize: '20' });
  const { data: tasksPage } = useTasks({ assigneeId: id });

  const member = members?.find((m) => m.user.id === id);
  const minutes = (logs?.items ?? []).reduce((s, l) => s + (l.minutes ?? 0), 0);

  const stats = [
    { icon: Flame, label: t('challenge.accepted'), value: progress ? `${progress.accepted}/${progress.target}` : '—', tint: 'text-accent bg-accent-soft' },
    { icon: NotebookPen, label: t('worklog.entries'), value: logs?.total ?? 0, tint: 'text-sky-500 bg-sky-500/12' },
    { icon: ListTodo, label: t('nav.projects'), value: tasksPage?.total ?? 0, tint: 'text-violet-500 bg-violet-500/12' },
    { icon: Clock, label: t('analytics.timeLogged'), value: fmtMinutes(minutes), tint: 'text-success bg-success/12' },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/members" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t('nav.members')}
      </Link>

      <div className="mb-6 flex items-center gap-4">
        <Avatar name={member?.user.name} url={member?.user.avatarUrl} size="lg" className="h-16 w-16 text-lg" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{member?.user.name ?? '—'}</h1>
            {member && <Badge variant="neutral" size="md" className="capitalize">{member.role}</Badge>}
          </div>
          <p className="truncate text-sm text-muted">{member?.user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', s.tint)}>
              <s.icon className="h-[18px] w-[18px]" />
            </div>
            {isLoading ? <Skeleton className="mt-4 h-7 w-14" /> : (
              <p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums">{s.value}</p>
            )}
            <p className="mt-0.5 text-sm text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-5">
        <h2 className="mb-4 text-sm font-semibold">{t('challenge.title')}</h2>
        {progress ? (
          <ContributionCalendar days={progress.days} />
        ) : (
          <Skeleton className="h-32 w-full" />
        )}
      </Card>

      <Card className="mt-6">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">{t('nav.worklog')}</h2>
        </div>
        <div className="divide-y divide-border">
          {logs?.items.length ? logs.items.map((l) => {
            const badge = STATUS_BADGE[l.status] ?? STATUS_BADGE.pending;
            return (
              <Link key={l.id} href={`/worklog/${l.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.title}</p>
                  <p className="text-xs text-muted">{format(parseISO(l.workedOn), 'MMM d, yyyy')}{l.minutes ? ` · ${fmtMinutes(l.minutes)}` : ''}</p>
                </div>
                <Badge variant={badge.variant} size="sm">{t(`worklog.${l.status}`)}</Badge>
              </Link>
            );
          }) : (
            <p className="px-5 py-10 text-center text-sm text-muted">{t('worklog.empty')}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
