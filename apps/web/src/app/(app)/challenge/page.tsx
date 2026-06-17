'use client';

import { useState } from 'react';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';
import { Flame, CheckCircle2, Clock, CalendarRange, Target } from 'lucide-react';
import { useChallenge, useChallengeProgress, useMembers } from '@/lib/hooks';
import { useAuth } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { Card, Skeleton } from '@/components/ui/primitives';
import { Avatar } from '@/components/ui/avatar';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ContributionCalendar } from '@/components/ContributionCalendar';
import { cn } from '@/lib/cn';

export default function ChallengePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: members } = useMembers();
  const { data: challenge } = useChallenge();

  const [userId, setUserId] = useState<string>('me');
  const targetUserId = userId === 'me' ? undefined : userId;
  const { data: progress, isLoading } = useChallengeProgress(targetUserId);

  const target = progress?.target ?? challenge?.target ?? 100;
  const accepted = progress?.accepted ?? 0;
  const pending = progress?.pending ?? 0;
  const pct = Math.min(100, Math.round((accepted / target) * 100));
  const daysLeft = challenge ? Math.max(0, differenceInCalendarDays(parseISO(challenge.endDate), new Date())) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{challenge?.title ?? t('challenge.title')}</h1>
            <p className="text-sm text-muted">
              {challenge ? `${format(parseISO(challenge.startDate), 'MMM d, yyyy')} – ${format(parseISO(challenge.endDate), 'MMM d, yyyy')}` : t('challenge.subtitle')}
            </p>
          </div>
        </div>

        {/* Member switcher */}
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="me">
              <span className="flex items-center gap-2"><Avatar name={user?.name} url={user?.avatarUrl} size="xs" /> {user?.name}</span>
            </SelectItem>
            {members?.filter((m) => m.user.id !== user?.id).map((m) => (
              <SelectItem key={m.user.id} value={m.user.id}>
                <span className="flex items-center gap-2"><Avatar name={m.user.name} url={m.user.avatarUrl} size="xs" /> {m.user.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Big progress */}
      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold tabular-nums tracking-tight text-accent">{accepted}</span>
            <span className="text-2xl font-semibold text-muted">/ {target}</span>
            <span className="ml-2 text-sm text-muted">{t('challenge.accepted').toLowerCase()}</span>
          </div>
          <div className="flex gap-5 text-sm">
            <Stat icon={CheckCircle2} value={accepted} label={t('challenge.accepted')} cls="text-accent" />
            <Stat icon={Clock} value={pending} label={t('challenge.pending')} cls="text-warning" />
            <Stat icon={CalendarRange} value={daysLeft} label={t('challenge.daysLeft')} cls="text-muted" />
          </div>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-right text-xs text-muted">{pct}%</p>
      </Card>

      {/* Calendar */}
      <Card className="mt-6 overflow-x-auto p-6">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-muted" />
          <h2 className="text-sm font-semibold">
            {progress?.user?.name ?? ''} · {challenge?.startDate?.slice(0, 4)}
          </h2>
        </div>
        {isLoading || !progress ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <ContributionCalendar days={progress.days} />
        )}
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, value, label, cls }: { icon: any; value: number; label: string; cls: string }) {
  return (
    <div className="text-center">
      <div className={cn('flex items-center justify-center gap-1 text-lg font-semibold tabular-nums', cls)}>
        <Icon className="h-4 w-4" /> {value}
      </div>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
