'use client';

import { useState } from 'react';
import { Mail, Copy, Check, UserPlus, Clock } from 'lucide-react';
import { WorkspaceRole } from '@manatask/shared';
import { useMembers, useInvitations, useInvite } from '@/lib/hooks';
import { apiErrorMessage } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Card, Badge, Separator, Spinner } from '@/components/ui/primitives';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const ROLE_VARIANT: Record<string, 'accent' | 'success' | 'neutral' | 'warning'> = {
  owner: 'accent',
  admin: 'success',
  member: 'neutral',
  guest: 'warning',
};

export default function MembersPage() {
  const { t } = useI18n();
  const { data: members, isLoading } = useMembers();
  const { data: invitations } = useInvitations();
  const invite = useInvite();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>(WorkspaceRole.MEMBER);
  const [error, setError] = useState('');
  const [lastLink, setLastLink] = useState('');
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res: any = await invite.mutateAsync({ email: email.trim(), role });
      setLastLink(res.link ?? '');
      setEmail('');
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.members')}</h1>
        <p className="mt-1 text-sm text-muted">Invite teammates and manage their roles.</p>
      </div>

      <Card>
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <UserPlus className="h-[18px] w-[18px] text-muted" />
          <h2 className="font-semibold">{t('members.invite')}</h2>
        </div>
        <div className="p-6">
          {error && (
            <div className="mb-3 rounded-lg border border-danger/20 bg-danger/8 px-3 py-2 text-sm text-danger">{error}</div>
          )}
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="invite-email">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="teammate@company.com" className="pl-9" />
              </div>
            </div>
            <div className="w-full sm:w-36">
              <Label>{t('members.role')}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as WorkspaceRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={WorkspaceRole.ADMIN}>Admin</SelectItem>
                  <SelectItem value={WorkspaceRole.MEMBER}>Member</SelectItem>
                  <SelectItem value={WorkspaceRole.GUEST}>Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" loading={invite.isPending}>{t('members.invite')}</Button>
          </form>

          {lastLink && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-surface-2/60 px-3 py-2">
              <span className="truncate text-sm text-muted">{lastLink}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(lastLink); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="ml-auto flex shrink-0 items-center gap-1 text-sm font-medium text-accent"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-semibold">Members {members?.length ? <span className="text-muted">· {members.length}</span> : ''}</h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : (
          <div className="divide-y divide-border">
            {members?.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-6 py-3.5">
                <Avatar name={m.user.name} url={m.user.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.user.name}</p>
                  <p className="truncate text-xs text-muted">{m.user.email}</p>
                </div>
                <Badge variant={ROLE_VARIANT[m.role] ?? 'neutral'} size="md" className="capitalize">{m.role}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {invitations && invitations.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 border-b border-border px-6 py-4">
            <Clock className="h-[18px] w-[18px] text-muted" />
            <h2 className="font-semibold">{t('members.pending')}</h2>
          </div>
          <div className="divide-y divide-border">
            {invitations.map((inv: any) => (
              <div key={inv.id} className="flex items-center gap-3 px-6 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted">
                  <Mail className="h-4 w-4" />
                </div>
                <span className="flex-1 truncate text-sm">{inv.email}</span>
                <Badge variant="outline" size="md" className="capitalize">{inv.role}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
