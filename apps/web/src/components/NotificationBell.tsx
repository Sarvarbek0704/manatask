'use client';

import { useEffect } from 'react';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { RT_EVENTS } from '@manatask/shared';
import { useNotifications, useMarkAllRead } from '@/lib/hooks';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown';
import { cn } from '@/lib/cn';

export function NotificationBell() {
  const { data } = useNotifications();
  const markAll = useMarkAllRead();
  const qc = useQueryClient();
  const unread = data?.filter((n) => !n.read).length ?? 0;

  useEffect(() => {
    const s = getSocket();
    const handler = () => qc.invalidateQueries({ queryKey: ['notifications'] });
    s.on(RT_EVENTS.NOTIFICATION, handler);
    return () => {
      s.off(RT_EVENTS.NOTIFICATION, handler);
    };
  }, [qc]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground ring-2 ring-surface">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              onClick={() => markAll.mutate()}
              className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[24rem] overflow-y-auto scroll-area">
          {!data?.length && (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <BellOff className="h-7 w-7 text-muted/50" />
              <p className="text-sm text-muted">You're all caught up</p>
            </div>
          )}
          {data?.map((n) => (
            <div
              key={n.id}
              className={cn(
                'flex gap-3 border-b border-border/60 px-4 py-3 last:border-0',
                !n.read && 'bg-accent-soft/40',
              )}
            >
              <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-accent')} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                {n.body && <p className="truncate text-xs text-muted">{n.body}</p>}
                <p className="mt-0.5 text-[11px] text-muted/80">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
