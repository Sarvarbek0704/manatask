'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, Building2 } from 'lucide-react';
import { useAuth, useWorkspace } from '@/lib/store';
import { api } from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { Sidebar } from '@/components/Sidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Spinner } from '@/components/ui/primitives';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hydrated, accessToken } = useAuth();
  const { currentWorkspaceId, setWorkspace } = useWorkspace();
  const [ready, setReady] = useState(false);
  const [needsWorkspace, setNeedsWorkspace] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace('/login');
      return;
    }
    (async () => {
      try {
        const { data: me } = await api.get('/users/me');
        useAuth.getState().setUser(me);
        // Block the app until email is verified.
        if (!me.emailVerified) {
          router.replace('/verify-email');
          return;
        }
        const { data: workspaces } = await api.get('/workspaces');
        if (!workspaces.length) {
          setNeedsWorkspace(true);
          setReady(true);
          return;
        }
        let wsId = currentWorkspaceId;
        if (!wsId || !workspaces.find((w: any) => w.id === wsId)) {
          wsId = workspaces[0].id;
          setWorkspace(wsId!);
        }
        connectSocket(wsId!);
        setReady(true);
      } catch {
        router.replace('/login');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (needsWorkspace) return <FirstWorkspace />;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Mobile drawer */}
        <div
          className={cn(
            'fixed inset-0 z-50 lg:hidden',
            drawer ? 'pointer-events-auto' : 'pointer-events-none',
          )}
        >
          <div
            className={cn(
              'absolute inset-0 bg-background/70 backdrop-blur-sm transition-opacity',
              drawer ? 'opacity-100' : 'opacity-0',
            )}
            onClick={() => setDrawer(false)}
          />
          <div
            className={cn(
              'absolute left-0 top-0 h-full transition-transform duration-200',
              drawer ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface/80 px-3 backdrop-blur sm:px-4">
            <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setDrawer(true)} aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex-1" />
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationBell />
          </header>
          <main className="min-h-0 flex-1 overflow-auto scroll-area">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}

function FirstWorkspace() {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const setWorkspace = useWorkspace((s) => s.setWorkspace);

  const create = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const { data } = await api.post('/workspaces', { name: name.trim() });
    setWorkspace(data.id);
    window.location.href = '/dashboard';
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-md">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Create your first workspace</h1>
        <p className="mt-1.5 text-sm text-muted">A workspace holds your team, projects and tasks.</p>
        <div className="mt-6">
          <Label htmlFor="first-ws">{t('auth.workspaceName')}</Label>
          <Input id="first-ws" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Acme Inc." onKeyDown={(e) => e.key === 'Enter' && create()} />
        </div>
        <Button onClick={create} loading={loading} className="mt-5 w-full" size="lg">{t('common.create')}</Button>
      </div>
    </div>
  );
}
