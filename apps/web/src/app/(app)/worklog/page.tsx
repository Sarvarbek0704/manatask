'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format, isToday, isYesterday, parseISO, startOfWeek } from 'date-fns';
import { Send, Clock, Trash2, NotebookPen, Filter } from 'lucide-react';
import { RT_EVENTS } from '@manatask/shared';
import type { WorkLog } from '@manatask/shared';
import {
  useWorkLogs,
  useCreateWorkLog,
  useDeleteWorkLog,
  useWorkLogSummary,
  useProjects,
  useMembers,
  useMyWorkspaces,
} from '@/lib/hooks';
import { useAuth, useWorkspace } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { useI18n } from '@/lib/i18n';
import { Card, Skeleton } from '@/components/ui/primitives';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/cn';

function fmtMinutes(m: number | null) {
  if (!m) return null;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h ? `${h}h${min ? ` ${min}m` : ''}` : `${min}m`;
}

function dateHeading(d: string) {
  const date = parseISO(d);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMM d');
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function WorkLogPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspaceId } = useWorkspace();
  const { data: workspaces } = useMyWorkspaces();
  const { data: projects } = useProjects();
  const { data: members } = useMembers();

  const role = workspaces?.find((w) => w.id === currentWorkspaceId)?.role;
  const isLeader = role === 'owner' || role === 'admin';

  const [memberFilter, setMemberFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  const { data: page, isLoading } = useWorkLogs({
    userId: memberFilter === 'all' ? undefined : memberFilter,
    projectId: projectFilter === 'all' ? undefined : projectFilter,
    pageSize: '50',
  });
  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().slice(0, 10), []);
  const { data: summary } = useWorkLogSummary({ from: weekStart });

  // Realtime: any new update refreshes the feed + summary.
  useEffect(() => {
    const s = getSocket();
    const refresh = () => {
      qc.invalidateQueries({ queryKey: ['worklogs'] });
      qc.invalidateQueries({ queryKey: ['worklog-summary'] });
    };
    s.on(RT_EVENTS.WORKLOG_CREATED, refresh);
    return () => { s.off(RT_EVENTS.WORKLOG_CREATED, refresh); };
  }, [qc]);

  const grouped = useMemo(() => {
    const map = new Map<string, WorkLog[]>();
    (page?.items ?? []).forEach((w) => {
      const arr = map.get(w.workedOn) ?? [];
      arr.push(w);
      map.set(w.workedOn, arr);
    });
    return [...map.entries()];
  }, [page]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <NotebookPen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('worklog.title')}</h1>
          <p className="text-sm text-muted">{t('worklog.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_17rem]">
        <div className="min-w-0 space-y-5">
          <Composer projects={projects ?? []} />

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted" />
            <Select value={memberFilter} onValueChange={setMemberFilter}>
              <SelectTrigger className="h-8 w-40 text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('worklog.allMembers')}</SelectItem>
                {members?.map((m) => (
                  <SelectItem key={m.user.id} value={m.user.id}>
                    <span className="flex items-center gap-2"><Avatar name={m.user.name} url={m.user.avatarUrl} size="xs" />{m.user.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-8 w-40 text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('analytics.allProjects')}</SelectItem>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Feed */}
          {isLoading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : grouped.length ? (
            <div className="space-y-6">
              {grouped.map(([day, items]) => (
                <div key={day}>
                  <div className="mb-2.5 flex items-center gap-3">
                    <span className="text-sm font-semibold">{dateHeading(day)}</span>
                    <span className="text-xs text-muted">{format(parseISO(day), 'MMM d, yyyy')}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="space-y-3">
                    {items.map((w) => (
                      <WorkLogItem key={w.id} log={w} canDelete={w.author.id === user?.id || isLeader} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-muted">
                <NotebookPen className="h-6 w-6" />
              </div>
              <p className="text-sm text-muted">{t('worklog.empty')}</p>
            </Card>
          )}
        </div>

        {/* Weekly activity */}
        <div className="hidden lg:block">
          <Card className="sticky top-4">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">{t('worklog.thisWeek')}</h2>
            </div>
            <div className="space-y-1 p-2">
              {summary?.length ? summary.map((s) => (
                <div key={s.user.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2">
                  <Avatar name={s.user.name} url={s.user.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.user.name}</p>
                    <p className="text-xs text-muted">
                      {s.entries} {t('worklog.entries')}{s.minutes ? ` · ${fmtMinutes(s.minutes)}` : ''}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="px-2 py-6 text-center text-sm text-muted">{t('analytics.noData')}</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Composer({ projects }: { projects: { id: string; name: string; color: string }[] }) {
  const { t } = useI18n();
  const create = useCreateWorkLog();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [projectId, setProjectId] = useState('none');
  const [minutes, setMinutes] = useState('');
  const [workedOn, setWorkedOn] = useState(todayStr());

  const submit = async () => {
    if (title.trim().length < 2) return;
    await create.mutateAsync({
      title: title.trim(),
      body: body.trim() || undefined,
      projectId: projectId === 'none' ? null : projectId,
      minutes: minutes ? Number(minutes) : null,
      workedOn,
    });
    setTitle(''); setBody(''); setProjectId('none'); setMinutes(''); setWorkedOn(todayStr()); setOpen(false);
  };

  return (
    <Card className="p-4">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={t('worklog.composer')}
        className="h-11 border-0 bg-transparent px-0 text-[15px] font-medium focus-visible:ring-0"
      />
      {open && (
        <div className="mt-2 space-y-3 border-t border-border pt-3 animate-slide-up">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={t('worklog.detailsPlaceholder')} className="bg-surface-2/40" />
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[10rem] flex-1">
              <Label className="text-xs">{t('worklog.project')}</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('worklog.noProject')}</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28">
              <Label className="text-xs">{t('worklog.minutes')}</Label>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                <Input type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="min" className="pl-8" />
              </div>
            </div>
            <div className="w-40">
              <Label className="text-xs">{t('worklog.date')}</Label>
              <Input type="date" value={workedOn} max={todayStr()} onChange={(e) => setWorkedOn(e.target.value)} />
            </div>
            <Button onClick={submit} loading={create.isPending} disabled={title.trim().length < 2} className="ml-auto">
              <Send className="h-4 w-4" /> {t('worklog.post')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function WorkLogItem({ log, canDelete }: { log: any; canDelete: boolean }) {
  const del = useDeleteWorkLog();
  const mins = fmtMinutes(log.minutes);
  return (
    <Card className="group p-4">
      <div className="flex gap-3">
        <Avatar name={log.author.name} url={log.author.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{log.author.name}</span>
            <span className="text-xs text-muted">{format(parseISO(log.createdAt), 'HH:mm')}</span>
            {canDelete && (
              <button
                onClick={() => del.mutate(log.id)}
                className="ml-auto rounded p-1 text-muted opacity-0 transition-opacity hover:bg-surface-2 hover:text-danger group-hover:opacity-100"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="mt-0.5 font-medium text-foreground">{log.title}</p>
          {log.body && <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/85">{log.body}</p>}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {log.projectName && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium">
                <span className="h-2 w-2 rounded-full" style={{ background: log.projectColor ?? '#94a3b8' }} />
                {log.projectName}
              </span>
            )}
            {mins && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                <Clock className="h-3 w-3" /> {mins}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
