'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ListTodo,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  FolderKanban,
} from 'lucide-react';
import { useDashboard, useProjects, useMyWorkspaces } from '@/lib/hooks';
import { useI18n } from '@/lib/i18n';
import { useAuth, useWorkspace } from '@/lib/store';
import { Card, Skeleton } from '@/components/ui/primitives';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CreateProjectDialog } from '@/components/CreateProjectDialog';
import { cn } from '@/lib/cn';

export default function DashboardPage() {
  const { t } = useI18n();
  const { data: summary, isLoading } = useDashboard();
  const { data: projects } = useProjects();
  const { user } = useAuth();
  const { currentWorkspaceId } = useWorkspace();
  const { data: workspaces } = useMyWorkspaces();
  const role = workspaces?.find((w) => w.id === currentWorkspaceId)?.role;
  const isLeader = role === 'owner' || role === 'admin';
  const [creating, setCreating] = useState(false);

  const stats = [
    { icon: ListTodo, label: t('dashboard.total'), value: summary?.totalTasks, tint: 'text-accent bg-accent-soft' },
    { icon: AlertTriangle, label: t('dashboard.overdue'), value: summary?.overdue, tint: 'text-danger bg-danger/10' },
    { icon: CalendarClock, label: t('dashboard.dueWeek'), value: summary?.dueThisWeek, tint: 'text-warning bg-warning/12' },
    { icon: CheckCircle2, label: t('dashboard.completedWeek'), value: summary?.completedThisWeek, tint: 'text-success bg-success/12' },
  ];

  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {firstName ? `Welcome back, ${firstName}` : t('nav.dashboard')}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isLeader ? t('dashboard.subtitleTeam') : t('dashboard.subtitleSelf')}
          </p>
        </div>
        {isLeader && (
          <Button onClick={() => setCreating(true)} variant="secondary">
            <Plus className="h-4 w-4" /> {t('project.new')}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', s.tint)}>
              <s.icon className="h-[18px] w-[18px]" />
            </div>
            {isLoading ? (
              <Skeleton className="mt-4 h-8 w-12" />
            ) : (
              <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{s.value ?? 0}</p>
            )}
            <p className="mt-0.5 text-sm text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Projects */}
        <Card className={isLeader ? 'lg:col-span-3' : 'lg:col-span-5'}>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold">{t('nav.projects')}</h2>
            {isLeader && (
              <button onClick={() => setCreating(true)} className="flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                <Plus className="h-4 w-4" /> {t('project.new')}
              </button>
            )}
          </div>
          <div className="p-2">
            {projects?.length ? (
              projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="group flex items-center gap-3.5 rounded-lg px-3 py-3 transition-colors hover:bg-surface-2"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: p.color }}>
                    <FolderKanban className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted">{p.statuses.length} columns · {p.key}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))
            ) : isLeader ? (
              <EmptyProjects onCreate={() => setCreating(true)} label={t('project.new')} />
            ) : (
              <p className="px-4 py-12 text-center text-sm text-muted">{t('common.empty')}</p>
            )}
          </div>
        </Card>

        {/* Team workload — leaders only */}
        {isLeader && (
        <Card className="lg:col-span-2">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">{t('dashboard.workload')}</h2>
          </div>
          <div className="space-y-4 p-5">
            {summary?.byAssignee.length ? (
              summary.byAssignee.map((row) => {
                const total = row.open + row.done;
                const pct = total ? Math.round((row.done / total) * 100) : 0;
                return (
                  <div key={row.user.id}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={row.user.name} url={row.user.avatarUrl} size="sm" />
                      <span className="flex-1 truncate text-sm font-medium">{row.user.name}</span>
                      <span className="text-xs text-muted tabular-nums">{row.done}/{total}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-6 text-center text-sm text-muted">{t('common.empty')}</p>
            )}
          </div>
        </Card>
        )}
      </div>

      {isLeader && <CreateProjectDialog open={creating} onOpenChange={setCreating} />}
    </div>
  );
}

function EmptyProjects({ onCreate, label }: { onCreate: () => void; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-muted">
        <FolderKanban className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-medium">No projects yet</p>
        <p className="text-sm text-muted">Create your first project to get started.</p>
      </div>
      <Button size="sm" onClick={onCreate}><Plus className="h-4 w-4" /> {label}</Button>
    </div>
  );
}
