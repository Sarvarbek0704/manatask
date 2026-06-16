'use client';

import { Languages, Check } from 'lucide-react';
import { useI18n, LOCALES } from '@/lib/i18n';
import type { Locale } from '@manatask/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown';

const LABELS: Record<Locale, string> = { uz: "O'zbekcha", ru: 'Русский', en: 'English' };
const SHORT: Record<Locale, string> = { uz: 'UZ', ru: 'RU', en: 'EN' };

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2.5" aria-label="Language">
          <Languages className="h-[18px] w-[18px]" />
          <span className="text-xs font-semibold">{SHORT[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} onClick={() => setLocale(l)}>
            <span className="flex-1">{LABELS[l]}</span>
            {locale === l && <Check className="h-4 w-4 text-accent" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
