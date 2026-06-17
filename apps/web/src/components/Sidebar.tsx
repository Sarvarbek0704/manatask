'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  NotebookPen,
  Flame,
  Plus,
  LogOut,
  Search,
  Settings,
  ChevronRight,
  Folder,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n';
import { useAuth, useWorkspace } from '@/lib/store';
import { useProjects, useMyWorkspaces } from '@/lib/hooks';
import { api } from '@/lib/api';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { CreateProjectDialog } from './CreateProjectDialog';
import { GlobalSearch } from './GlobalSearch';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const { data: projects } = useProjects();
  const { data: workspaces } = useMyWorkspaces();
  const { currentWorkspaceId } = useWorkspace();
  const { user, clear } = useAuth();
  const [creating, setCreating] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const isLeader = workspaces?.find((w) => w.id === currentWorkspaceId)?.role === 'owner'
    || workspaces?.find((w) => w.id === currentWorkspaceId)?.role === 'admin';

  const nav = [
    { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/worklog', label: t('nav.worklog'), icon: NotebookPen },
    { href: '/challenge', label: t('nav.challenge'), icon: Flame },
    // Analytics is management-only.
    ...(isLeader ? [{ href: '/analytics', label: t('nav.analytics'), icon: BarChart3 }] : []),
    { href: '/members', label: t('nav.members'), icon: Users },
  ];

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    clear();
    window.location.href = '/login';
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-surface">
      <div className="p-3">
        <WorkspaceSwitcher />
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex w-full items-center gap-2.5 rounded-md border border-border bg-surface-2/60 px-2.5 py-2 text-sm text-muted transition-colors hover:border-border-strong hover:text-foreground"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">{t('common.search')}</span>
          <kbd className="rounded border border-border bg-surface px-1.5 text-[10px] font-medium">/</kbd>
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 scroll-area">
        {nav.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href} onClick={onNavigate} />
        ))}

        <div className="flex items-center justify-between px-2.5 pb-1 pt-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t('nav.projects')}</span>
          <button
            onClick={() => setCreating(true)}
            className="rounded p-0.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            aria-label={t('project.new')}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {projects?.map((p) => {
          const href = `/projects/${p.id}`;
          const active = pathname === href;
          return (
            <Link
              key={p.id}
              href={href}
              onClick={onNavigate}
              className={cn(
                'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                active ? 'bg-accent-soft text-accent' : 'text-foreground hover:bg-surface-2',
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-[4px]" style={{ background: p.color }} />
              <span className="flex-1 truncate">{p.name}</span>
              <span className="text-[10px] font-medium text-muted opacity-0 transition-opacity group-hover:opacity-100">{p.key}</span>
            </Link>
          );
        })}
        {!projects?.length && (
          <button
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <Folder className="h-4 w-4" /> {t('project.new')}
          </button>
        )}
      </nav>

      <div className="border-t border-border p-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2">
              <Avatar name={user?.name} url={user?.avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">{user?.name}</p>
                <p className="truncate text-xs text-muted">{user?.email}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-[14rem]">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings"><Settings /> {t('nav.settings')}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={logout}>
              <LogOut /> {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CreateProjectDialog open={creating} onOpenChange={setCreating} />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </aside>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
        active ? 'bg-accent-soft text-accent' : 'text-foreground hover:bg-surface-2',
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </Link>
  );
}
