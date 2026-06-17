'use client';

import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { WorkLogStatus } from '@manatask/shared';
import type { ChallengeCalendarDay } from '@manatask/shared';
import { cn } from '@/lib/cn';

const STATUS_CLASS: Record<string, string> = {
  accepted: 'bg-accent',
  pending: 'bg-warning/70',
  rejected: 'bg-danger/35',
  none: 'bg-surface-2 hover:bg-border',
};

const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

/** GitHub-style contribution grid: columns = weeks (Mon-start), rows = weekdays. */
export function ContributionCalendar({
  days,
  onDayClick,
}: {
  days: ChallengeCalendarDay[];
  onDayClick?: (day: ChallengeCalendarDay) => void;
}) {
  const { weeks, monthLabels } = useMemo(() => {
    if (!days.length) return { weeks: [] as (ChallengeCalendarDay | null)[][], monthLabels: [] as { col: number; label: string }[] };
    const first = parseISO(days[0].date);
    const lead = (first.getUTCDay() + 6) % 7; // 0 = Monday
    const cells: (ChallengeCalendarDay | null)[] = [...Array(lead).fill(null), ...days];
    const weeks: (ChallengeCalendarDay | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    const monthLabels: { col: number; label: string }[] = [];
    let lastMonth = '';
    weeks.forEach((w, col) => {
      const firstReal = w.find(Boolean);
      if (!firstReal) return;
      const m = format(parseISO(firstReal.date), 'MMM');
      if (m !== lastMonth) {
        monthLabels.push({ col, label: m });
        lastMonth = m;
      }
    });
    return { weeks, monthLabels };
  }, [days]);

  return (
    <div className="inline-flex flex-col gap-1.5">
      <div className="flex gap-[3px] pl-7 text-[10px] text-muted">
        {weeks.map((_, col) => {
          const lbl = monthLabels.find((m) => m.col === col);
          return (
            <div key={col} className="w-[13px]">
              {lbl ? <span>{lbl.label}</span> : null}
            </div>
          );
        })}
      </div>
      <div className="flex gap-[3px]">
        {/* Weekday labels */}
        <div className="mr-1 flex w-6 flex-col gap-[3px] text-[10px] leading-[13px] text-muted">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="h-[13px]">{d}</div>
          ))}
        </div>
        {weeks.map((week, col) => (
          <div key={col} className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }).map((_, row) => {
              const day = week[row] ?? null;
              if (!day) return <div key={row} className="h-[13px] w-[13px]" />;
              const title = `${format(parseISO(day.date), 'PPP')} — ${day.status === 'none' ? 'no entry' : day.status}`;
              return (
                <button
                  key={row}
                  title={title}
                  onClick={() => onDayClick?.(day)}
                  className={cn(
                    'h-[13px] w-[13px] rounded-[3px] transition-transform hover:scale-125 hover:ring-1 hover:ring-foreground/20',
                    STATUS_CLASS[day.status] ?? STATUS_CLASS.none,
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-1 flex items-center gap-3 pl-7 text-[11px] text-muted">
        <span className="flex items-center gap-1"><i className={cn('h-[11px] w-[11px] rounded-[3px]', STATUS_CLASS.accepted)} /> {WorkLogStatus.ACCEPTED}</span>
        <span className="flex items-center gap-1"><i className={cn('h-[11px] w-[11px] rounded-[3px]', STATUS_CLASS.pending)} /> {WorkLogStatus.PENDING}</span>
        <span className="flex items-center gap-1"><i className={cn('h-[11px] w-[11px] rounded-[3px]', STATUS_CLASS.rejected)} /> {WorkLogStatus.REJECTED}</span>
      </div>
    </div>
  );
}
