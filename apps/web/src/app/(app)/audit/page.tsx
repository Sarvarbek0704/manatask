'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeftRight,
  UserPlus,
  MessageSquare,
  Move,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useActivity, useMyWorkspaces } from '@/lib/hooks';
import { useWorkspace } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { Card, Spinner, Badge } from '@/components/ui/primitives';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const ACTION_META: Record<string, { icon: typeof Plus; cls: string; label: string }> = {
  created: { icon: Plus, cls: 'text-success bg-success/12', label: 'created' },
  updated: { icon: Pencil, cls: 'text-accent bg-accent-soft', label: 'updated' },
  deleted: { icon: Trash2, cls: 'text-danger bg-danger/10', label: 'deleted' },
  status_changed: { icon: ArrowLeftRight, cls: 'text-sky-500 bg-sky-500/12', label: 'changed status of' },
  assigned: { icon: UserPlus, cls: 'text-violet-500 bg-violet-500/12', label: 'assigned' },
  commented: { icon: MessageSquare, cls: 'text-muted bg-surface-2', label: 'commented on' },
  moved: { icon: Move, cls: 'text-warning bg-warning/12', label: 'moved' },
};

export default function AuditPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { currentWorkspaceId } = useWorkspace();
  const { data: workspaces } = useMyWorkspaces();
  const role = workspaces?.find((w) => w.id === currentWorkspaceId)?.role;
  const isLeader = role === 'owner' || role === 'admin';

  useEffect(() => {
    if (workspaces && !isLeader) router.replace('/dashboard');
  }, [workspaces, isLeader, router]);

  const [page, setPage] = useState(1);
  const { data, isLoading } = useActivity(page);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <History className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('audit.title')}</h1>
          <p className="text-sm text-muted">{t('audit.subtitle')}</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : data?.items.length ? (
          <div className="divide-y divide-border">
            {data.items.map((a) => {
              const meta = ACTION_META[a.action] ?? ACTION_META.updated;
              const Icon = meta.icon;
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.cls}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <Avatar name={a.actor.name} url={a.actor.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">{a.actor.name}</span>{' '}
                      <span className="text-muted">{meta.label}</span>{' '}
                      <Badge variant="neutral" size="sm">{a.entityType}</Badge>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-4 py-12 text-center text-sm text-muted">{t('common.empty')}</p>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="secondary" size="icon-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted tabular-nums">{page} / {totalPages}</span>
          <Button variant="secondary" size="icon-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
