'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, Building2 } from 'lucide-react';
import { useMyWorkspaces, useCreateWorkspace } from '@/lib/hooks';
import { useWorkspace } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

function WorkspaceMark({ name, className }: { name?: string; className?: string }) {
  return (
    <span className={`flex items-center justify-center rounded-md bg-accent font-semibold text-accent-foreground ${className}`}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </span>
  );
}

export function WorkspaceSwitcher() {
  const { data: workspaces } = useMyWorkspaces();
  const { currentWorkspaceId, setWorkspace } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const current = workspaces?.find((w) => w.id === currentWorkspaceId);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface px-2.5 py-2 text-left transition-colors hover:bg-surface-2">
            <WorkspaceMark name={current?.name} className="h-7 w-7 text-sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{current?.name ?? 'Workspace'}</p>
              <p className="truncate text-xs capitalize text-muted">{(current as any)?.role ?? ''}</p>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[15rem]">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces?.map((w) => (
            <DropdownMenuItem
              key={w.id}
              onClick={() => {
                if (w.id !== currentWorkspaceId) {
                  setWorkspace(w.id);
                  window.location.reload();
                }
              }}
            >
              <WorkspaceMark name={w.name} className="h-5 w-5 text-[10px]" />
              <span className="flex-1 truncate">{w.name}</span>
              {w.id === currentWorkspaceId && <Check className="h-4 w-4 text-accent" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreating(true)}>
            <Plus />
            <span>New workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}

function CreateWorkspaceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const create = useCreateWorkspace();
  const setWorkspace = useWorkspace((s) => s.setWorkspace);

  const submit = async () => {
    if (!name.trim()) return;
    const ws = await create.mutateAsync(name.trim());
    setWorkspace(ws.id);
    window.location.href = '/dashboard';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New workspace</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Label htmlFor="ws-name">{t('auth.workspaceName')}</Label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus className="pl-9" placeholder="Acme Inc." onKeyDown={(e) => e.key === 'Enter' && submit()} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{t('task.cancel')}</Button>
          <Button onClick={submit} loading={create.isPending}>{t('common.create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
