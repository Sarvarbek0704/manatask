'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, List as ListIcon, Calendar as CalIcon, Plus, Search, Download } from 'lucide-react';
import { RT_EVENTS } from '@manatask/shared';
import type { Task } from '@manatask/shared';
import { useProject, useTasks, useMembers } from '@/lib/hooks';
import { getSocket } from '@/lib/socket';
import { API_URL } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/primitives';
import { Tooltip } from '@/components/ui/tooltip';
import { KanbanBoard } from '@/components/KanbanBoard';
import { ListView } from '@/components/ListView';
import { CalendarView } from '@/components/CalendarView';
import { TaskDetailDialog } from '@/components/TaskDetailDialog';
import { CreateTaskDialog } from '@/components/CreateTaskDialog';

type View = 'kanban' | 'list' | 'calendar';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: project, isLoading } = useProject(id);
  const { data: members } = useMembers();
  const [search, setSearch] = useState('');
  const { data: tasksPage } = useTasks({ projectId: id, search });

  const [view, setView] = useState<View>('kanban');
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | undefined>();

  // Deep-link: ?task=<id> opens the detail dialog.
  useEffect(() => {
    const taskParam = params.get('task');
    if (taskParam) setOpenTaskId(taskParam);
  }, [params]);

  useEffect(() => {
    const s = getSocket();
    const refresh = () => qc.invalidateQueries({ queryKey: ['tasks'] });
    s.on(RT_EVENTS.TASK_CREATED, refresh);
    s.on(RT_EVENTS.TASK_UPDATED, refresh);
    s.on(RT_EVENTS.TASK_DELETED, refresh);
    return () => {
      s.off(RT_EVENTS.TASK_CREATED, refresh);
      s.off(RT_EVENTS.TASK_UPDATED, refresh);
      s.off(RT_EVENTS.TASK_DELETED, refresh);
    };
  }, [qc]);

  if (isLoading || !project) {
    return <div className="flex h-full items-center justify-center"><Spinner className="h-6 w-6" /></div>;
  }

  const tasks = tasksPage?.items ?? [];
  const views: { key: View; label: string; icon: typeof LayoutGrid }[] = [
    { key: 'kanban', label: t('view.kanban'), icon: LayoutGrid },
    { key: 'list', label: t('view.list'), icon: ListIcon },
    { key: 'calendar', label: t('view.calendar'), icon: CalIcon },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="h-7 w-7 rounded-lg" style={{ background: project.color }} />
          <div>
            <h1 className="text-base font-semibold leading-tight tracking-tight">{project.name}</h1>
            <p className="font-mono text-xs text-muted">{project.key}</p>
          </div>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as View)} className="ml-1">
          <TabsList>
            {views.map((v) => (
              <TabsTrigger key={v.key} value={v.key}>
                <v.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{v.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.search')} className="h-9 w-44 pl-8" />
          </div>
          <Tooltip content="Export CSV">
            <a
              href={`${API_URL}/projects/${project.id}/export.csv`}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <Download className="h-4 w-4" />
            </a>
          </Tooltip>
          <Button onClick={() => { setCreateStatus(undefined); setCreating(true); }}>
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t('task.new')}</span>
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {view === 'kanban' && (
          <KanbanBoard
            project={project}
            tasks={tasks}
            members={members}
            onOpen={(task) => setOpenTaskId(task.id)}
            onAdd={(statusId) => { setCreateStatus(statusId); setCreating(true); }}
          />
        )}
        {view === 'list' && <div className="h-full overflow-auto scroll-area"><ListView project={project} tasks={tasks} onOpen={(task) => setOpenTaskId(task.id)} /></div>}
        {view === 'calendar' && <div className="h-full overflow-auto scroll-area"><CalendarView project={project} tasks={tasks} onOpen={(task) => setOpenTaskId(task.id)} /></div>}
      </div>

      {openTaskId && (
        <TaskDetailDialog
          taskId={openTaskId}
          project={project}
          members={members}
          onClose={() => {
            setOpenTaskId(null);
            if (params.get('task')) router.replace(`/projects/${id}`);
          }}
        />
      )}
      {creating && (
        <CreateTaskDialog open={creating} onOpenChange={setCreating} project={project} members={members} defaultStatusId={createStatus} />
      )}
    </div>
  );
}
