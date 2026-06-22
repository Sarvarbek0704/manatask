'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import type { Project, Task, WorkspaceMember } from '@manatask/shared';
import { TaskCard } from './TaskCard';
import { useMoveTask } from '@/lib/hooks';
import { CATEGORY_META } from '@/lib/task-meta';
import { cn } from '@/lib/cn';

type Columns = Record<string, Task[]>;

export function KanbanBoard({
  project,
  tasks,
  onOpen,
  onAdd,
  currentUserId,
  canManageAll = false,
}: {
  project: Project;
  tasks: Task[];
  members?: WorkspaceMember[];
  onOpen: (t: Task) => void;
  onAdd: (statusId: string) => void;
  currentUserId?: string;
  /** Owners/admins may move any task; others only their own. */
  canManageAll?: boolean;
}) {
  const move = useMoveTask();
  const [columns, setColumns] = useState<Columns>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const canMove = (task: Task) =>
    canManageAll ||
    task.assignee?.id === currentUserId ||
    (task.assignees ?? []).some((a) => a.id === currentUserId);

  useEffect(() => {
    const next: Columns = {};
    project.statuses.forEach((s) => (next[s.id] = []));
    tasks.forEach((t) => {
      if (!next[t.statusId]) next[t.statusId] = [];
      next[t.statusId].push(t);
    });
    Object.values(next).forEach((list) => list.sort((a, b) => a.order - b.order));
    setColumns(next);
  }, [tasks, project.statuses]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const allTasks = useMemo(() => Object.values(columns).flat(), [columns]);
  const active = allTasks.find((t) => t.id === activeId);

  const findColumn = (id: string): string | undefined => {
    if (columns[id]) return id;
    return Object.keys(columns).find((sid) => columns[sid].some((t) => t.id === id));
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const fromCol = findColumn(active.id as string);
    const toCol = findColumn(over.id as string);
    if (!fromCol || !toCol) return;
    const activeTask = columns[fromCol].find((t) => t.id === active.id);
    if (!activeTask) return;
    // Only the assignee (or a manager) may change a task's status.
    if (!canMove(activeTask)) return;

    const target = [...columns[toCol].filter((t) => t.id !== active.id)];
    const overIndex = target.findIndex((t) => t.id === over.id);
    const insertAt = overIndex >= 0 ? overIndex : target.length;
    target.splice(insertAt, 0, activeTask);

    const prev = target[insertAt - 1];
    const next = target[insertAt + 1];
    let order: number;
    if (prev && next) order = (prev.order + next.order) / 2;
    else if (prev) order = prev.order + 1000;
    else if (next) order = next.order - 1000;
    else order = 1000;

    setColumns((cols) => ({
      ...cols,
      [fromCol]: cols[fromCol].filter((t) => t.id !== active.id),
      [toCol]: target.map((t) => (t.id === activeTask.id ? { ...t, order, statusId: toCol } : t)),
    }));
    move.mutate({ id: activeTask.id, statusId: toCol, order });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full gap-3 overflow-x-auto p-4 scroll-area">
        {project.statuses.map((status) => (
          <Column
            key={status.id}
            status={status}
            tasks={columns[status.id] ?? []}
            projectKey={project.key}
            onOpen={onOpen}
            onAdd={() => onAdd(status.id)}
            canMove={canMove}
          />
        ))}
      </div>
      <DragOverlay>
        {active ? (
          <div className="w-72">
            <TaskCard task={active} projectKey={project.key} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  tasks,
  projectKey,
  onOpen,
  onAdd,
  canMove,
}: {
  status: Project['statuses'][number];
  tasks: Task[];
  projectKey: string;
  onOpen: (t: Task) => void;
  onAdd: () => void;
  canMove: (t: Task) => boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  const meta = CATEGORY_META[status.category];

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={cn('h-2.5 w-2.5 rounded-full', meta.dot)} />
        <span className="text-sm font-semibold text-foreground">{status.name}</span>
        <span className="rounded-full bg-surface-2 px-1.5 text-xs font-medium text-muted tabular-nums">{tasks.length}</span>
        <button
          onClick={onAdd}
          className="ml-auto rounded p-1 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          aria-label="Add task"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 rounded-xl border border-transparent p-1.5 transition-colors',
          isOver ? 'border-accent/40 bg-accent-soft/40' : 'bg-surface-2/40',
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableCard key={task.id} task={task} projectKey={projectKey} onOpen={() => onOpen(task)} draggable={canMove(task)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <button
            onClick={onAdd}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-6 text-xs text-muted transition-colors hover:border-border-strong hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Add task
          </button>
        )}
      </div>
    </div>
  );
}

function SortableCard({ task, projectKey, onOpen, draggable }: { task: Task; projectKey: string; onOpen: () => void; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !draggable,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        cursor: draggable ? undefined : 'pointer',
      }}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} projectKey={projectKey} onClick={onOpen} />
    </div>
  );
}
