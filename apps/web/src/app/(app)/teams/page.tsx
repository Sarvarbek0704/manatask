'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Trash2, X, UserPlus } from 'lucide-react';
import { useTeams, useTeamMutations, useMembers, useMyWorkspaces } from '@/lib/hooks';
import { useWorkspace } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { Card, Spinner, Badge } from '@/components/ui/primitives';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown';

const COLORS = ['#138067', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#0ea5e9', '#ef4444'];

export default function TeamsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { currentWorkspaceId } = useWorkspace();
  const { data: workspaces } = useMyWorkspaces();
  const role = workspaces?.find((w) => w.id === currentWorkspaceId)?.role;
  const isLeader = role === 'owner' || role === 'admin';

  useEffect(() => {
    if (workspaces && !isLeader) router.replace('/dashboard');
  }, [workspaces, isLeader, router]);

  const { data: teams, isLoading } = useTeams();
  const { data: members } = useMembers();
  const m = useTeamMutations();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const create = async () => {
    if (!name.trim()) return;
    await m.create.mutateAsync({ name: name.trim(), color });
    setCreating(false); setName(''); setColor(COLORS[0]);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('nav.teams')}</h1>
            <p className="text-sm text-muted">{t('teams.subtitle')}</p>
          </div>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> {t('teams.new')}</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : teams?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((team) => {
            const memberIds = new Set(team.members.map((u) => u.id));
            const available = (members ?? []).filter((wm) => !memberIds.has(wm.user.id));
            return (
              <Card key={team.id} className="p-5">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full" style={{ background: team.color }} />
                  <h2 className="flex-1 truncate font-semibold">{team.name}</h2>
                  <Badge variant="neutral" size="sm">{team.members.length}</Badge>
                  <button onClick={() => m.remove.mutate(team.id)} className="rounded p-1 text-muted hover:bg-surface-2 hover:text-danger" aria-label="Delete team">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {team.members.map((u) => (
                    <div key={u.id} className="group flex items-center gap-2.5 rounded-md px-1 py-1">
                      <Avatar name={u.name} url={u.avatarUrl} size="sm" />
                      <span className="flex-1 truncate text-sm">{u.name}</span>
                      <button
                        onClick={() => m.removeMember.mutate({ id: team.id, userId: u.id })}
                        className="rounded p-0.5 text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                        aria-label="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {!team.members.length && <p className="px-1 py-2 text-xs text-muted">{t('teams.noMembers')}</p>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-1.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-foreground" disabled={!available.length}>
                      <UserPlus className="h-3.5 w-3.5" /> {t('teams.addMember')}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-64 w-56 overflow-y-auto scroll-area">
                    {available.map((wm) => (
                      <DropdownMenuItem key={wm.user.id} onClick={() => m.addMember.mutate({ id: team.id, userId: wm.user.id })}>
                        <Avatar name={wm.user.name} url={wm.user.avatarUrl} size="xs" /> {wm.user.name}
                      </DropdownMenuItem>
                    ))}
                    {!available.length && <p className="px-2.5 py-2 text-sm text-muted">{t('teams.allAdded')}</p>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-muted"><Users className="h-6 w-6" /></div>
          <p className="text-sm text-muted">{t('teams.empty')}</p>
          <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> {t('teams.new')}</Button>
        </Card>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>{t('teams.new')}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('teams.namePlaceholder')} autoFocus onKeyDown={(e) => e.key === 'Enter' && create()} />
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className="h-7 w-7 rounded-full transition-transform hover:scale-110" style={{ background: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }} aria-label={c} />
              ))}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreating(false)}>{t('task.cancel')}</Button>
            <Button onClick={create} loading={m.create.isPending} disabled={!name.trim()}>{t('common.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
