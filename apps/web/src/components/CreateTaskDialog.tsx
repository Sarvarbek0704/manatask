'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { TaskPriority } from '@manatask/shared';
import type { Project, WorkspaceMember } from '@manatask/shared';
import { useCreateTask } from '@/lib/hooks';
import { apiErrorMessage } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PRIORITY_META, CATEGORY_META } from '@/lib/task-meta';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/cn';

export function CreateTaskDialog({
  open,
  onOpenChange,
  project,
  members,
  defaultStatusId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: Project;
  members?: WorkspaceMember[];
  defaultStatusId?: string;
}) {
  const { t } = useI18n();
  const create = useCreateTask();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusId, setStatusId] = useState(defaultStatusId ?? project.statuses[0]?.id);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [assigneeId, setAssigneeId] = useState('unassigned');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  const reset = () => { setTitle(''); setDescription(''); setError(''); setAssigneeId('unassigned'); setDueDate(''); };

  const submit = async () => {
    setError('');
    try {
      await create.mutateAsync({
        projectId: project.id,
        title: title.trim(),
        description: description.trim() || undefined,
        statusId,
        priority,
        assigneeId: assigneeId === 'unassigned' ? null : assigneeId,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
      onOpenChange(false);
      reset();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('task.new')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/8 px-3 py-2 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
            </div>
          )}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('task.title')}
            autoFocus
            className="h-11 border-0 bg-transparent px-0 text-lg font-medium focus-visible:ring-0"
          />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('task.description')} rows={4} />

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Field label={t('task.status')}>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {project.statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', CATEGORY_META[s.category].dot)} />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('task.priority')}>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(TaskPriority).map((p) => {
                    const Icon = PRIORITY_META[p].icon;
                    return (
                      <SelectItem key={p} value={p}>
                        <span className="flex items-center gap-2">
                          <Icon className={cn('h-3.5 w-3.5', PRIORITY_META[p].className)} />
                          {t(PRIORITY_META[p].labelKey)}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('task.assignee')}>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">{t('task.unassigned')}</SelectItem>
                  {members?.map((m) => (
                    <SelectItem key={m.user.id} value={m.user.id}>
                      <span className="flex items-center gap-2">
                        <Avatar name={m.user.name} url={m.user.avatarUrl} size="xs" />
                        {m.user.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('task.dueDate')}>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{t('task.cancel')}</Button>
          <Button onClick={submit} loading={create.isPending} disabled={!title.trim()}>{t('task.create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
    </div>
  );
}
