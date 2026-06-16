'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Hash, Folder, MessageSquare, CornerDownLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/primitives';
import { useI18n } from '@/lib/i18n';

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q), 200);
    return () => clearTimeout(id);
  }, [q]);

  // Keyboard: "/" or Cmd/Ctrl+K opens search (unless typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onOpenChange]);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debounced],
    enabled: open && debounced.trim().length >= 2,
    queryFn: async () => (await api.get('/search', { params: { q: debounced } })).data,
  });

  const go = (path: string) => {
    onOpenChange(false);
    setQ('');
    router.push(path);
  };

  const hasResults =
    data && (data.tasks?.length || data.projects?.length || data.comments?.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" hideClose className="top-[15%] translate-y-0 p-0">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-[18px] w-[18px] shrink-0 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks, projects, comments…"
            className="h-14 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted/70"
          />
          {isFetching && <Spinner className="h-4 w-4" />}
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2 scroll-area">
          {debounced.trim().length < 2 && (
            <p className="px-3 py-8 text-center text-sm text-muted">Type at least 2 characters to search.</p>
          )}
          {debounced.trim().length >= 2 && !isFetching && !hasResults && (
            <p className="px-3 py-8 text-center text-sm text-muted">No results for “{debounced}”.</p>
          )}

          {data?.projects?.length > 0 && (
            <Group label={t('nav.projects')}>
              {data.projects.map((p: any) => (
                <Row key={p.id} icon={<Folder className="h-4 w-4" style={{ color: p.color }} />} onClick={() => go(`/projects/${p.id}`)}>
                  <span className="truncate">{p.name}</span>
                  <span className="ml-auto font-mono text-xs text-muted">{p.key}</span>
                </Row>
              ))}
            </Group>
          )}

          {data?.tasks?.length > 0 && (
            <Group label="Tasks">
              {data.tasks.map((task: any) => (
                <Row
                  key={task.id}
                  icon={<Hash className="h-4 w-4 text-muted" />}
                  onClick={() => go(`/projects/${task.projectId}?task=${task.id}`)}
                >
                  <span className="truncate">{task.title}</span>
                  <span className="ml-auto text-xs text-muted">#{task.number}</span>
                </Row>
              ))}
            </Group>
          )}

          {data?.comments?.length > 0 && (
            <Group label={t('task.comments')}>
              {data.comments.map((c: any) => (
                <Row key={c.id} icon={<MessageSquare className="h-4 w-4 text-muted" />} onClick={() => go(`/projects?task=${c.taskId}`)}>
                  <span className="truncate text-muted">{c.snippet}</span>
                </Row>
              ))}
            </Group>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      {children}
    </div>
  );
}

function Row({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-2"
    >
      {icon}
      {children}
      <CornerDownLeft className="ml-2 h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
