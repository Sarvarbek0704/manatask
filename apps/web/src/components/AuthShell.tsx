'use client';

import { CheckSquare, Zap, Globe2, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';

const FEATURES = [
  { icon: Zap, title: 'Real-time by default', text: 'Boards, comments and notifications update live across your team.' },
  { icon: Globe2, title: 'Multilingual', text: "Built for Oʻzbekcha, Русский and English from day one." },
  { icon: ShieldCheck, title: 'Secure & multi-tenant', text: 'Workspace isolation, granular roles and session control.' },
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-accent p-12 text-accent-foreground lg:flex">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.15]" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-black/10 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
            <CheckSquare className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">manaTask</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-[2.6rem] font-semibold leading-[1.1] tracking-tight">
            {t('auth.welcome')}
          </h2>
          <div className="mt-10 space-y-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                  <f.icon className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-sm text-accent-foreground/75">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-accent-foreground/60">© {new Date().getFullYear()} manaTask</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col bg-background">
        <div className="flex items-center justify-end gap-1 p-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-[22rem]">
            <div className="mb-8 flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <CheckSquare className="h-4 w-4" />
              </div>
              <span className="text-lg font-semibold tracking-tight">manaTask</span>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
