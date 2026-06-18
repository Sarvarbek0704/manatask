'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sun, Moon, Monitor, Monitor as Device, Trash2, LogOut, Check, KeyRound, AlertCircle, Lock, Building2, CalendarDays, Github, Copy, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth, useWorkspace } from '@/lib/store';
import { useMyWorkspaces, useUpdateWorkspace, useCalendarFeed, useRegenerateCalendar, useGithubConfig, useGithubMutations } from '@/lib/hooks';
import { useI18n, LOCALES } from '@/lib/i18n';
import type { Locale } from '@manatask/shared';
import { Card, Separator, Spinner } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input, Label, PasswordInput } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/cn';

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];
const LOCALE_LABELS: Record<Locale, string> = { uz: "O'zbekcha", ru: 'Русский', en: 'English' };

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { user, setUser } = useAuth();
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => { if (user) setName(user.name); }, [user]);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => (await api.get('/auth/sessions')).data as any[],
  });

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/users/me', { name: name.trim(), locale });
      setUser(data);
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (id: string) => {
    await api.delete(`/auth/sessions/${id}`);
    qc.invalidateQueries({ queryKey: ['sessions'] });
  };

  const logoutAll = async () => {
    await api.post('/auth/logout-all');
    window.location.href = '/login';
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.settings')}</h1>
        <p className="mt-1 text-sm text-muted">Manage your profile, appearance and active sessions.</p>
      </div>

      <WorkspaceSection />

      <Section title="Profile">
        <div className="flex items-center gap-4">
          <Avatar name={user?.name} url={user?.avatarUrl} size="lg" className="h-14 w-14 text-base" />
          <div className="flex-1 space-y-3">
            <div>
              <Label htmlFor="name">{t('auth.name')}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm" />
            </div>
          </div>
        </div>
        <Separator className="my-5" />
        <div>
          <Label>Language</Label>
          <div className="flex flex-wrap gap-2">
            {LOCALES.map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-sm transition-colors',
                  locale === l ? 'border-accent bg-accent-soft text-accent' : 'border-border text-foreground hover:bg-surface-2',
                )}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={saveProfile} loading={saving}>{t('common.save')}</Button>
        </div>
      </Section>

      <Section title="Appearance" description="Customize how manaTask looks on this device.">
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((opt) => {
            const active = mounted && theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border px-4 py-4 text-sm transition-colors',
                  active ? 'border-accent bg-accent-soft text-accent' : 'border-border text-foreground hover:bg-surface-2',
                )}
              >
                <opt.icon className="h-5 w-5" />
                {opt.label}
                {active && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      </Section>

      <CalendarSection />

      <GithubSection />

      <ChangePasswordSection />

      <Section title="Active sessions" description="Devices currently signed in to your account.">
        {isLoading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : (
          <div className="space-y-2">
            {sessions?.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border px-3.5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-muted">
                  <Device className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {s.userAgent?.split(')')[0]?.split('(')[1] ?? s.userAgent ?? 'Unknown device'}
                    {s.current && <span className="ml-2 rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-medium text-success">This device</span>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {s.ip ?? 'unknown ip'} · {s.lastUsedAt ? `active ${formatDistanceToNow(new Date(s.lastUsedAt), { addSuffix: true })}` : ''}
                  </p>
                </div>
                {!s.current && (
                  <Button variant="ghost" size="icon-sm" onClick={() => revoke(s.id)} aria-label="Revoke">
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        <Separator className="my-5" />
        <Button variant="outline" onClick={logoutAll} className="text-danger">
          <LogOut className="h-4 w-4" /> Sign out of all devices
        </Button>
      </Section>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 rounded-md border border-input bg-surface-2/60 px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-xs">{value}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

function CalendarSection() {
  const { t } = useI18n();
  const { data } = useCalendarFeed();
  const regen = useRegenerateCalendar();
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <CalendarDays className="h-[18px] w-[18px] text-muted" />
        <h2 className="font-semibold">{t('settings.calendar')}</h2>
      </div>
      <div className="space-y-4 p-6">
        <p className="text-sm text-muted">{t('settings.calendarDesc')}</p>
        {data && <CopyRow label="iCal URL" value={data.url} />}
        <Button variant="outline" onClick={() => regen.mutate()} loading={regen.isPending}>
          <RefreshCw className="h-4 w-4" /> {t('settings.regenerate')}
        </Button>
      </div>
    </Card>
  );
}

function GithubSection() {
  const { t } = useI18n();
  const { currentWorkspaceId } = useWorkspace();
  const { data: workspaces } = useMyWorkspaces();
  const role = workspaces?.find((w) => w.id === currentWorkspaceId)?.role;
  const isLeader = role === 'owner' || role === 'admin';
  const { data: cfg } = useGithubConfig(isLeader);
  const gh = useGithubMutations();
  if (!isLeader) return null;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <Github className="h-[18px] w-[18px] text-muted" />
        <h2 className="font-semibold">{t('settings.github')}</h2>
      </div>
      <div className="space-y-4 p-6">
        <p className="text-sm text-muted">{t('settings.githubDesc')}</p>
        {cfg?.connected ? (
          <>
            <CopyRow label={t('settings.webhookUrl')} value={cfg.webhookUrl} />
            {cfg.secret && <CopyRow label={t('settings.secret')} value={cfg.secret} />}
            <p className="rounded-lg bg-surface-2/60 px-3 py-2 text-xs text-muted">{t('settings.githubHint')}</p>
            <Button variant="outline" className="text-danger" onClick={() => gh.disconnect.mutate()} loading={gh.disconnect.isPending}>
              {t('settings.disconnect')}
            </Button>
          </>
        ) : (
          <Button onClick={() => gh.connect.mutate()} loading={gh.connect.isPending}>
            <Github className="h-4 w-4" /> {t('settings.connect')}
          </Button>
        )}
      </div>
    </Card>
  );
}

function WorkspaceSection() {
  const { t } = useI18n();
  const { currentWorkspaceId } = useWorkspace();
  const { data: workspaces } = useMyWorkspaces();
  const update = useUpdateWorkspace();
  const ws = workspaces?.find((w) => w.id === currentWorkspaceId);
  const isOwner = (ws as any)?.role === 'owner';
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (ws) { setName(ws.name); setLogoUrl(ws.logoUrl ?? ''); }
  }, [ws]);

  if (!ws || !isOwner) return null;

  const save = async () => {
    setDone(false);
    await update.mutateAsync({ name: name.trim(), logoUrl: logoUrl.trim() });
    setDone(true);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <Building2 className="h-[18px] w-[18px] text-muted" />
        <h2 className="font-semibold">{t('settings.workspace')}</h2>
      </div>
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-4">
          <Avatar name={name} url={logoUrl || null} size="lg" className="h-14 w-14 rounded-xl text-base" />
          <div className="flex-1 space-y-3">
            <div>
              <Label htmlFor="ws-name">{t('auth.workspaceName')}</Label>
              <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm" />
            </div>
            <div>
              <Label htmlFor="ws-logo">{t('settings.logoUrl')}</Label>
              <Input id="ws-logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" className="max-w-sm" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={save} loading={update.isPending} disabled={!name.trim()}>{t('common.save')}</Button>
          {done && <span className="inline-flex items-center gap-1 text-sm text-success"><Check className="h-4 w-4" /> {t('settings.pwUpdated')}</span>}
        </div>
      </div>
    </Card>
  );
}

function ChangePasswordSection() {
  const { t } = useI18n();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDone(false);
    if (next.length < 8) { setError(t('settings.pwMin')); return; }
    if (next !== confirm) { setError(t('settings.pwMismatch')); return; }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
      setDone(true);
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <KeyRound className="h-[18px] w-[18px] text-muted" />
        <h2 className="font-semibold">{t('settings.changePassword')}</h2>
      </div>
      <form onSubmit={submit} className="space-y-4 p-6">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/8 px-3 py-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
          </div>
        )}
        {done && (
          <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-sm text-success">
            <Check className="h-4 w-4" /> {t('settings.pwUpdated')}
          </div>
        )}
        <div className="max-w-sm space-y-3">
          <div>
            <Label htmlFor="cur-pw">{t('settings.currentPw')}</Label>
            <PasswordInput id="cur-pw" leftIcon={Lock} value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
          </div>
          <div>
            <Label htmlFor="new-pw">{t('settings.newPw')}</Label>
            <PasswordInput id="new-pw" leftIcon={Lock} value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} autoComplete="new-password" />
          </div>
          <div>
            <Label htmlFor="conf-pw">{t('settings.confirmPw')}</Label>
            <PasswordInput id="conf-pw" leftIcon={Lock} value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
          </div>
        </div>
        <Button type="submit" loading={loading} disabled={!current || !next || !confirm}>
          {t('settings.changePassword')}
        </Button>
      </form>
    </Card>
  );
}
