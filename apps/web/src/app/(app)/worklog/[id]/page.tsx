'use client';

import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Check, X, Clock, CalendarDays, FolderKanban } from 'lucide-react';
import { WorkLogStatus } from '@manatask/shared';
import { useWorkLog, useReviewWorkLog, useMyWorkspaces } from '@/lib/hooks';
import { useWorkspace } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { Card, Badge, Spinner } from '@/components/ui/primitives';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const STATUS_BADGE: Record<string, { variant: 'success' | 'warning' | 'danger'; key: string }> = {
  accepted: { variant: 'success', key: 'worklog.accepted' },
  pending: { variant: 'warning', key: 'worklog.pending' },
  rejected: { variant: 'danger', key: 'worklog.rejected' },
};

function fmtMinutes(m: number | null) {
  if (!m) return null;
  const h = Math.floor(m / 60);
  return h ? `${h}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`;
}

export default function WorkLogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { data: log, isLoading } = useWorkLog(id);
  const review = useReviewWorkLog();
  const { currentWorkspaceId } = useWorkspace();
  const { data: workspaces } = useMyWorkspaces();
  const role = workspaces?.find((w) => w.id === currentWorkspaceId)?.role;
  const isLeader = role === 'owner' || role === 'admin';

  if (isLoading || !log) {
    return <div className="flex h-full items-center justify-center"><Spinner className="h-6 w-6" /></div>;
  }

  const badge = STATUS_BADGE[log.status] ?? STATUS_BADGE.pending;
  const mins = fmtMinutes(log.minutes);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t('nav.worklog')}
      </button>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={log.author.name} url={log.author.avatarUrl} size="lg" className="h-11 w-11" />
            <div>
              <p className="font-semibold">{log.author.name}</p>
              <p className="text-xs text-muted">{format(parseISO(log.createdAt), 'PPp')}</p>
            </div>
          </div>
          <Badge variant={badge.variant} size="md">{t(badge.key)}</Badge>
        </div>

        <h1 className="mt-5 text-xl font-semibold tracking-tight">{log.title}</h1>
        {log.body && <p className="mt-3 whitespace-pre-wrap leading-relaxed text-foreground/90">{log.body}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium">
            <CalendarDays className="h-3.5 w-3.5 text-muted" /> {format(parseISO(log.workedOn), 'PP')}
          </span>
          {log.projectName && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium">
              <FolderKanban className="h-3.5 w-3.5" style={{ color: log.projectColor ?? undefined }} /> {log.projectName}
            </span>
          )}
          {mins && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
              <Clock className="h-3.5 w-3.5" /> {mins}
            </span>
          )}
        </div>

        {log.status !== WorkLogStatus.PENDING && log.reviewedByName && (
          <p className="mt-4 text-sm text-muted">
            {t('worklog.reviewedBy')} <span className="font-medium text-foreground">{log.reviewedByName}</span>
            {log.reviewedAt ? ` · ${format(parseISO(log.reviewedAt), 'PP')}` : ''}
          </p>
        )}

        {isLeader && log.status === WorkLogStatus.PENDING && (
          <div className="mt-5 flex gap-2 border-t border-border pt-5">
            <Button loading={review.isPending} onClick={() => review.mutate({ id: log.id, decision: 'accept' })}>
              <Check className="h-4 w-4" /> {t('worklog.accept')}
            </Button>
            <Button variant="outline" className="text-danger" onClick={() => review.mutate({ id: log.id, decision: 'reject' })}>
              <X className="h-4 w-4" /> {t('worklog.reject')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
