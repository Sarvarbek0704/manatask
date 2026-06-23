'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, List as ListIcon, Calendar as CalIcon, Plus, Search, Download, MoreHorizontal, Pencil, Archive, Trash2, Users, AlertTriangle, CalendarClock, Rocket } from 'lucide-react';
import { RT_EVENTS } from '@manatask/shared';
import type { Task } from '@manatask/shared';
import { useProject, useTasks, useMembers, useMyWorkspaces, useArchiveProject, useDeleteProject, useSprints } from '@/lib/hooks';
import { useAuth, useWorkspace } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { API_URL } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/primitives';
import { Tooltip } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { KanbanBoard } from '@/components/KanbanBoard';
import { ListView } from '@/components/ListView';
import { CalendarView } from '@/components/CalendarView';
import { TaskDetailDialog } from '@/components/TaskDetailDialog';
import { CreateTaskDialog } from '@/components/CreateTaskDialog';
import { EditProjectDialog } from '@/components/EditProjectDialog';

type View = 'kanban' | 'list' | 'calendar';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspaceId } = useWorkspace();
  const { data: workspaces } = useMyWorkspaces();
  const { data: project, isLoading } = useProject(id);
  const { data: members } = useMembers();
  const [search, setSearch] = useState('');
  const [sprintFilter, setSprintFilter] = useState<string>('all'); // 'all' | 'active' | 'backlog'
  const [dateFilter, setDateFilter] = useState<string>('all'); // 'all' | 'overdue' | 'today' | 'week' | 'none'
  const [showArchived, setShowArchived] = useState(false);
  const { data: sprints } = useSprints(id);
  const activeSprint = useMemo(() => sprints?.find((s) => s.state === 'active'), [sprints]);

  const taskParams = useMemo(() => {
    const p: Record<string, string | undefined> = { projectId: id, search, pageSize: '200' };
    if (sprintFilter === 'active') p.sprintId = activeSprint?.id ?? '__none__';
    else if (sprintFilter === 'backlog') p.sprintId = 'null';
    // Local day boundaries for the date filter.
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const endToday = new Date(start); endToday.setDate(endToday.getDate() + 1);
    const endWeek = new Date(start); endWeek.setDate(endWeek.getDate() + 7);
    if (dateFilter === 'overdue') p.dueBefore = start.toISOString();
    else if (dateFilter === 'today') { p.dueAfter = start.toISOString(); p.dueBefore = endToday.toISOString(); }
    else if (dateFilter === 'week') { p.dueAfter = start.toISOString(); p.dueBefore = endWeek.toISOString(); }
    else if (dateFilter === 'none') p.dueSet = 'none';
    if (showArchived) p.archived = 'true';
    return p;
  }, [id, search, sprintFilter, activeSprint?.id, dateFilter, showArchived]);

  const { data: tasksPage } = useTasks(taskParams);

  const role = workspaces?.find((w) => w.id === currentWorkspaceId)?.role;
  const isOwner = role === 'owner';
  const isLeader = role === 'owner' || role === 'admin';

  const [view, setView] = useState<View>('kanban');
  const [assignee, setAssignee] = useState<string>('all'); // 'all' | 'mine' | userId
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | undefined>();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const archiveProject = useArchiveProject();
  const deleteProject = useDeleteProject();

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

  const tasks = tasksPage?.items ?? [];
  // NOTE: keep all hooks above the early return below — moving useMemo after it
  // changes the hook count between renders and crashes the page.
  const visibleTasks = useMemo(() => {
    if (assignee === 'all') return tasks;
    const uid = assignee === 'mine' ? user?.id : assignee;
    return tasks.filter(
      (task) => task.assignee?.id === uid || (task.assignees ?? []).some((a) => a.id === uid),
    );
  }, [tasks, assignee, user?.id]);

  if (isLoading || !project) {
    return <div className="flex h-full items-center justify-center"><Spinner className="h-6 w-6" /></div>;
  }

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

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={sprintFilter} onValueChange={setSprintFilter}>
            <SelectTrigger className="h-9 w-auto gap-1.5 text-sm">
              <Rocket className="h-4 w-4 text-muted" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filter.allSprints')}</SelectItem>
              <SelectItem value="active" disabled={!activeSprint}>
                {activeSprint ? activeSprint.name : t('filter.activeSprint')}
              </SelectItem>
              <SelectItem value="backlog">{t('filter.backlog')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="h-9 w-auto gap-1.5 text-sm">
              <CalendarClock className="h-4 w-4 text-muted" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filter.anyDate')}</SelectItem>
              <SelectItem value="overdue">{t('filter.overdue')}</SelectItem>
              <SelectItem value="today">{t('filter.dueToday')}</SelectItem>
              <SelectItem value="week">{t('filter.dueWeek')}</SelectItem>
              <SelectItem value="none">{t('filter.noDueDate')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger className="h-9 w-auto gap-1.5 text-sm">
              <Users className="h-4 w-4 text-muted" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filter.all')}</SelectItem>
              <SelectItem value="mine">{t('filter.mine')}</SelectItem>
              {(members ?? []).map((m) => (
                <SelectItem key={m.user.id} value={m.user.id}>{m.user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.search')} className="h-9 w-44 pl-8" />
          </div>
          <Tooltip content={t('filter.archived')}>
            <button
              onClick={() => setShowArchived((v) => !v)}
              aria-pressed={showArchived}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-md border transition-colors',
                showArchived
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border text-muted hover:bg-surface-2 hover:text-foreground',
              )}
            >
              <Archive className="h-4 w-4" />
            </button>
          </Tooltip>
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
          {isLeader && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted transition-colors hover:bg-surface-2 hover:text-foreground" aria-label="Project actions">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setEditing(true)}><Pencil /> {t('project.edit')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => archiveProject.mutate({ id: project.id, archived: !project.archived })}>
                  <Archive /> {project.archived ? t('project.unarchive') : t('project.archive')}
                </DropdownMenuItem>
                {isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive onClick={() => setConfirmDelete(true)}><Trash2 /> {t('project.delete')}</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {tasksPage && tasksPage.total > tasks.length && (
        <div className="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-1.5 text-xs text-foreground/80">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          {t('filter.moreHidden').replace('{n}', String(tasksPage.total - tasks.length))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {view === 'kanban' && (
          <KanbanBoard
            project={project}
            tasks={visibleTasks}
            members={members}
            onOpen={(task) => setOpenTaskId(task.id)}
            onAdd={(statusId) => { setCreateStatus(statusId); setCreating(true); }}
            currentUserId={user?.id}
            canManageAll={isLeader}
          />
        )}
        {view === 'list' && <div className="h-full overflow-auto scroll-area"><ListView project={project} tasks={visibleTasks} onOpen={(task) => setOpenTaskId(task.id)} /></div>}
        {view === 'calendar' && <div className="h-full overflow-auto scroll-area"><CalendarView project={project} tasks={visibleTasks} onOpen={(task) => setOpenTaskId(task.id)} /></div>}
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
      {editing && <EditProjectDialog project={project} open={editing} onOpenChange={setEditing} />}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent size="md">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-danger/10 text-danger">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle>{t('project.delete')}</DialogTitle>
            <DialogDescription>{t('project.deleteConfirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>{t('task.cancel')}</Button>
            <Button
              variant="danger"
              loading={deleteProject.isPending}
              onClick={async () => {
                await deleteProject.mutateAsync(project.id);
                setConfirmDelete(false);
                router.push('/dashboard');
              }}
            >
              {t('project.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
