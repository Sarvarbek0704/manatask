'use client';

import { MessageSquare, CheckSquare, Paperclip, GitBranch, CalendarDays } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import type { Task } from '@manatask/shared';
import { Avatar } from '@/components/ui/avatar';
import { PRIORITY_META } from '@/lib/task-meta';
import { cn } from '@/lib/cn';

export function TaskCard({
  task,
  projectKey,
  onClick,
  dragging,
}: {
  task: Task;
  projectKey: string;
  onClick?: () => void;
  dragging?: boolean;
}) {
  const prio = PRIORITY_META[task.priority];
  const PrioIcon = prio.icon;
  const overdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.statusCategory !== 'done';
  const checklistDone = task.checklist.filter((c) => c.done).length;
  const assignees = task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : [];

  return (
    <div
      onClick={onClick}
      className={cn(
        'group cursor-pointer rounded-lg border border-border bg-surface p-3 shadow-xs transition-all',
        'hover:border-border-strong hover:shadow-sm',
        dragging && 'rotate-1 shadow-lg ring-1 ring-accent/30',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-medium text-muted">
          {projectKey}-{task.number}
        </span>
        <PrioIcon className={cn('h-3.5 w-3.5', prio.className)} />
      </div>

      <p className="text-sm font-medium leading-snug text-foreground">{task.title}</p>

      {task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.labels.map((l) => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: `${l.color}1f`, color: l.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: l.color }} />
              {l.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-muted">
          {task.dueDate && (
            <span className={cn('inline-flex items-center gap-1 text-[11px]', overdue ? 'font-medium text-danger' : '')}>
              <CalendarDays className="h-3 w-3" />
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
          {task.commentCount > 0 && <Meta icon={MessageSquare} value={task.commentCount} />}
          {task.checklist.length > 0 && <Meta icon={CheckSquare} value={`${checklistDone}/${task.checklist.length}`} />}
          {task.attachmentCount > 0 && <Meta icon={Paperclip} value={task.attachmentCount} />}
          {task.subtaskCount > 0 && <Meta icon={GitBranch} value={task.subtaskCount} />}
        </div>
        {assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {assignees.slice(0, 3).map((a) => (
              <Avatar key={a.id} name={a.name} url={a.avatarUrl} size="xs" className="ring-2 ring-surface" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Meta({ icon: Icon, value }: { icon: typeof MessageSquare; value: number | string }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] tabular-nums">
      <Icon className="h-3 w-3" /> {value}
    </span>
  );
}
