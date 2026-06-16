'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useCreateProject } from '@/lib/hooks';
import { apiErrorMessage } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/cn';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

export function CreateProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const create = useCreateProject();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState('');
  const [keyEdited, setKeyEdited] = useState(false);

  const onName = (v: string) => {
    setName(v);
    if (!keyEdited) setKey(v.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase());
  };

  const submit = async () => {
    setError('');
    try {
      const project = await create.mutateAsync({
        name: name.trim(),
        key: key.trim().toUpperCase() || name.slice(0, 4).toUpperCase(),
        description: description.trim() || undefined,
        color,
      });
      onOpenChange(false);
      setName(''); setKey(''); setDescription(''); setKeyEdited(false);
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t('project.new')}</DialogTitle>
          <DialogDescription>Projects organize tasks, sprints and boards.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/8 px-3 py-2 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="p-name">{t('project.name')}</Label>
              <Input id="p-name" value={name} onChange={(e) => onName(e.target.value)} autoFocus placeholder="Marketing Site" />
            </div>
            <div className="w-24">
              <Label htmlFor="p-key">{t('project.key')}</Label>
              <Input
                id="p-key"
                value={key}
                onChange={(e) => { setKeyEdited(true); setKey(e.target.value.toUpperCase().slice(0, 10)); }}
                placeholder="MKT"
                className="font-mono uppercase"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="p-desc">{t('task.description')}</Label>
            <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optional" />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-7 w-7 rounded-full transition-transform hover:scale-110',
                    color === c && 'ring-2 ring-offset-2 ring-offset-elevated',
                  )}
                  style={{ background: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{t('task.cancel')}</Button>
          <Button onClick={submit} loading={create.isPending} disabled={!name.trim()}>{t('common.create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
