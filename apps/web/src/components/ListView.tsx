'use client';

import { format, isPast, isToday } from 'date-fns';
import type { Project, Task } from '@manatask/shared';
import { Avatar } from '@/components/ui/avatar';
import { PRIORITY_META, CATEGORY_META } from '@/lib/task-meta';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';

export function ListView({
  project,
  tasks,
  onOpen,
}: {
  project: Project;
  tasks: Task[];
  onOpen: (t: Task) => void;
}) {
  const { t } = useI18n();
  const statusOf = (id: string) => project.statuses.find((s) => s.id === id);

  return (
    <div className="px-4 py-4">
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-[1fr_140px_140px_110px] items-center gap-3 border-b border-border bg-surface-2/50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <span>{t('task.title')}</span>
          <span>{t('task.status')}</span>
          <span>{t('task.assignee')}</span>
          <span>{t('task.dueDate')}</span>
        </div>
        {tasks.map((task) => {
          const status = statusOf(task.statusId);
          const meta = status ? CATEGORY_META[status.category] : null;
          const prio = PRIORITY_META[task.priority];
          const PrioIcon = prio.icon;
          const overdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.statusCategory !== 'done';
          return (
            <button
              key={task.id}
              onClick={() => onOpen(task)}
              className="grid w-full grid-cols-[1fr_140px_140px_110px] items-center gap-3 border-b border-border/60 px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-surface-2/60"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <PrioIcon className={cn('h-4 w-4 shrink-0', prio.className)} />
                <span className="shrink-0 font-mono text-[11px] text-muted">{project.key}-{task.number}</span>
                <span className="truncate text-sm font-medium">{task.title}</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted">
                <span className={cn('h-2 w-2 rounded-full', meta?.dot ?? 'bg-slate-400')} />
                <span className="truncate">{status?.name}</span>
              </span>
              <span className="min-w-0">
                {task.assignee ? (
                  <span className="flex items-center gap-2">
                    <Avatar name={task.assignee.name} url={task.assignee.avatarUrl} size="xs" />
                    <span className="truncate text-sm">{task.assignee.name}</span>
                  </span>
                ) : (
                  <span className="text-sm text-muted">—</span>
                )}
              </span>
              <span className={cn('text-sm', overdue ? 'font-medium text-danger' : 'text-muted')}>
                {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}
              </span>
            </button>
          );
        })}
        {!tasks.length && <div className="px-4 py-14 text-center text-sm text-muted">{t('common.empty')}</div>}
      </div>
    </div>
  );
}
