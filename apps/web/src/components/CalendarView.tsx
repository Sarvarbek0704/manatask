'use client';

import { useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Project, Task } from '@manatask/shared';
import { Button } from '@/components/ui/button';
import { PRIORITY_META } from '@/lib/task-meta';
import { cn } from '@/lib/cn';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarView({
  project,
  tasks,
  onOpen,
}: {
  project: Project;
  tasks: Task[];
  onOpen: (t: Task) => void;
}) {
  const [month, setMonth] = useState(new Date());
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const tasksOn = (day: Date) => tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day));

  return (
    <div className="px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">{format(month, 'MMMM yyyy')}</h3>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="icon-sm" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="secondary" size="sm" onClick={() => setMonth(new Date())}>Today</Button>
          <Button variant="secondary" size="icon-sm" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-7 border-b border-border bg-surface-2/50">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayTasks = tasksOn(day);
            const inMonth = isSameMonth(day, month);
            const today = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'min-h-[7rem] border-b border-r border-border/60 p-1.5 [&:nth-child(7n)]:border-r-0',
                  !inMonth && 'bg-surface-2/30',
                )}
              >
                <div className="mb-1 flex justify-end">
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                      today ? 'bg-accent font-semibold text-accent-foreground' : inMonth ? 'text-foreground' : 'text-muted/50',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => {
                    const prio = PRIORITY_META[task.priority];
                    const PrioIcon = prio.icon;
                    return (
                      <button
                        key={task.id}
                        onClick={() => onOpen(task)}
                        className="flex w-full items-center gap-1 truncate rounded-md border border-border bg-surface px-1.5 py-1 text-left text-[11px] transition-colors hover:bg-surface-2"
                      >
                        <PrioIcon className={cn('h-3 w-3 shrink-0', prio.className)} />
                        <span className="truncate">{task.title}</span>
                      </button>
                    );
                  })}
                  {dayTasks.length > 3 && <p className="px-1 text-[10px] text-muted">+{dayTasks.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
