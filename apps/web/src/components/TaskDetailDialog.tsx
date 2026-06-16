'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Send, Trash2, Plus, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { RT_EVENTS, TaskPriority } from '@manatask/shared';
import type { Project, WorkspaceMember } from '@manatask/shared';
import {
  useTask,
  useComments,
  useAddComment,
  useUpdateTask,
  useDeleteTask,
  useAddChecklist,
  useToggleChecklist,
} from '@/lib/hooks';
import { getSocket } from '@/lib/socket';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/primitives';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PRIORITY_META, CATEGORY_META } from '@/lib/task-meta';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';

export function TaskDetailDialog({
  taskId,
  project,
  members,
  onClose,
}: {
  taskId: string;
  project: Project;
  members?: WorkspaceMember[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: task, isLoading } = useTask(taskId);
  const { data: comments } = useComments(taskId);
  const addComment = useAddComment(taskId);
  const update = useUpdateTask();
  const del = useDeleteTask();
  const addCheck = useAddChecklist(taskId);
  const toggleCheck = useToggleChecklist(taskId);

  const [comment, setComment] = useState('');
  const [newCheck, setNewCheck] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (task) { setTitle(task.title); setDescription(task.description ?? ''); }
  }, [task]);

  useEffect(() => {
    const s = getSocket();
    s.emit('task.join', taskId);
    const onComment = () => qc.invalidateQueries({ queryKey: ['comments', taskId] });
    const onUpdate = () => qc.invalidateQueries({ queryKey: ['task', taskId] });
    s.on(RT_EVENTS.COMMENT_CREATED, onComment);
    s.on(RT_EVENTS.TASK_UPDATED, onUpdate);
    return () => {
      s.emit('task.leave', taskId);
      s.off(RT_EVENTS.COMMENT_CREATED, onComment);
      s.off(RT_EVENTS.TASK_UPDATED, onUpdate);
    };
  }, [taskId, qc]);

  const patch = (body: any) => update.mutate({ id: taskId, body });
  const remove = async () => { await del.mutateAsync(taskId); onClose(); };
  const checklistDone = task?.checklist.filter((c) => c.done).length ?? 0;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl" className="p-0">
        {isLoading || !task ? (
          <div className="flex justify-center py-20"><Spinner className="h-6 w-6" /></div>
        ) : (
          <div className="grid max-h-[90vh] grid-cols-1 md:grid-cols-[1fr_18rem]">
            {/* Main */}
            <div className="overflow-y-auto px-6 py-6 scroll-area">
              <span className="font-mono text-xs font-medium text-muted">{project.key}-{task.number}</span>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => title.trim() && title !== task.title && patch({ title: title.trim() })}
                className="mt-1 h-auto border-0 bg-transparent px-0 text-xl font-semibold focus-visible:ring-0"
              />

              <div className="mt-4">
                <p className="mb-1.5 text-xs font-medium text-muted">{t('task.description')}</p>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => description !== (task.description ?? '') && patch({ description })}
                  rows={4}
                  placeholder="Add a description…"
                  className="border-border bg-surface-2/40"
                />
              </div>

              {/* Checklist */}
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-muted">{t('task.checklist')}</p>
                  {task.checklist.length > 0 && (
                    <span className="text-xs text-muted tabular-nums">{checklistDone}/{task.checklist.length}</span>
                  )}
                </div>
                {task.checklist.length > 0 && (
                  <div className="mb-2 h-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full bg-success transition-all" style={{ width: `${task.checklist.length ? (checklistDone / task.checklist.length) * 100 : 0}%` }} />
                  </div>
                )}
                <div className="space-y-1">
                  {task.checklist.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggleCheck.mutate({ itemId: c.id, done: !c.done })}
                      className="flex w-full items-center gap-2.5 rounded-md px-1 py-1 text-left text-sm transition-colors hover:bg-surface-2"
                    >
                      <span className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        c.done ? 'border-accent bg-accent text-accent-foreground' : 'border-border-strong',
                      )}>
                        {c.done && <Check className="h-3 w-3" />}
                      </span>
                      <span className={cn(c.done && 'text-muted line-through')}>{c.text}</span>
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); if (newCheck.trim()) addCheck.mutate(newCheck.trim()); setNewCheck(''); }}
                  className="mt-2 flex items-center gap-2 rounded-md px-1"
                >
                  <Plus className="h-4 w-4 text-muted" />
                  <input
                    value={newCheck}
                    onChange={(e) => setNewCheck(e.target.value)}
                    placeholder="Add an item"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
                  />
                </form>
              </div>

              {/* Comments */}
              <div className="mt-7">
                <p className="mb-3 text-xs font-medium text-muted">{t('task.comments')}</p>
                <div className="space-y-4">
                  {comments?.map((c) => (
                    <div key={c.id} className="flex gap-2.5">
                      <Avatar name={c.author.name} url={c.author.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">{c.author.name}</span>
                          <span className="text-[11px] text-muted">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-foreground/90">{c.body}</p>
                      </div>
                    </div>
                  ))}
                  {!comments?.length && <p className="text-sm text-muted">No comments yet.</p>}
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); if (comment.trim()) addComment.mutate(comment.trim()); setComment(''); }}
                  className="mt-4 flex gap-2"
                >
                  <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('task.addComment')} />
                  <Button type="submit" size="icon" disabled={!comment.trim()}><Send className="h-4 w-4" /></Button>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4 overflow-y-auto border-t border-border bg-surface-2/40 px-5 py-6 scroll-area md:border-l md:border-t-0">
              <SideField label={t('task.status')}>
                <Select value={task.statusId} onValueChange={(v) => patch({ statusId: v })}>
                  <SelectTrigger className="bg-surface"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {project.statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2"><span className={cn('h-2 w-2 rounded-full', CATEGORY_META[s.category].dot)} />{s.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SideField>

              <SideField label={t('task.assignee')}>
                <Select value={task.assignee?.id ?? 'unassigned'} onValueChange={(v) => patch({ assigneeId: v === 'unassigned' ? null : v })}>
                  <SelectTrigger className="bg-surface"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">{t('task.unassigned')}</SelectItem>
                    {members?.map((m) => (
                      <SelectItem key={m.user.id} value={m.user.id}>
                        <span className="flex items-center gap-2"><Avatar name={m.user.name} url={m.user.avatarUrl} size="xs" />{m.user.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SideField>

              <SideField label={t('task.priority')}>
                <Select value={task.priority} onValueChange={(v) => patch({ priority: v as TaskPriority })}>
                  <SelectTrigger className="bg-surface"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(TaskPriority).map((p) => {
                      const Icon = PRIORITY_META[p].icon;
                      return (
                        <SelectItem key={p} value={p}>
                          <span className="flex items-center gap-2"><Icon className={cn('h-3.5 w-3.5', PRIORITY_META[p].className)} />{t(PRIORITY_META[p].labelKey)}</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </SideField>

              <SideField label={t('task.dueDate')}>
                <Input
                  type="date"
                  value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                  onChange={(e) => patch({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="bg-surface"
                />
              </SideField>

              {task.labels.length > 0 && (
                <SideField label={t('task.labels')}>
                  <div className="flex flex-wrap gap-1">
                    {task.labels.map((l) => (
                      <span key={l.id} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: `${l.color}1f`, color: l.color }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: l.color }} />{l.name}
                      </span>
                    ))}
                  </div>
                </SideField>
              )}

              <div className="border-t border-border pt-4 text-xs text-muted">
                Created {format(new Date(task.createdAt), 'MMM d, yyyy')}
              </div>

              <Button variant="outline" onClick={remove} className="w-full text-danger">
                <Trash2 className="h-4 w-4" /> {t('task.delete')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SideField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted">{label}</p>
      {children}
    </div>
  );
}
