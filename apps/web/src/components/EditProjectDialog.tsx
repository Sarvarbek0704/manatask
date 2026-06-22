'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { Project } from '@manatask/shared';
import { useUpdateProject } from '@/lib/hooks';
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
import { cn } from '@/lib/cn';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useI18n();
  const update = useUpdateProject(project.id);
  const [name, setName] = useState(project.name);
  const [key, setKey] = useState(project.key);
  const [description, setDescription] = useState(project.description ?? '');
  const [color, setColor] = useState(project.color);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    try {
      await update.mutateAsync({
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim() || undefined,
        color,
      });
      onOpenChange(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t('project.edit')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/8 px-3 py-2 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="ep-name">{t('project.name')}</Label>
              <Input id="ep-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="w-24">
              <Label htmlFor="ep-key">{t('project.key')}</Label>
              <Input
                id="ep-key"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase().slice(0, 10))}
                className="font-mono uppercase"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ep-desc">{t('task.description')}</Label>
            <Textarea id="ep-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn('h-7 w-7 rounded-full transition-transform hover:scale-110')}
                  style={{ background: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{t('task.cancel')}</Button>
          <Button onClick={submit} loading={update.isPending} disabled={!name.trim()}>{t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
