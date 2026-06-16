'use client';

import * as RA from '@radix-ui/react-avatar';
import { cn } from '@/lib/cn';

const sizeMap = { xs: 'h-5 w-5 text-[9px]', sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-10 w-10 text-sm' };

// Deterministic accent tint per name for visual variety.
const tints = [
  'bg-indigo-500/15 text-indigo-500',
  'bg-violet-500/15 text-violet-500',
  'bg-sky-500/15 text-sky-500',
  'bg-emerald-500/15 text-emerald-500',
  'bg-amber-500/15 text-amber-600',
  'bg-rose-500/15 text-rose-500',
  'bg-teal-500/15 text-teal-500',
];

function tintFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return tints[h % tints.length];
}

export function Avatar({
  name,
  url,
  size = 'md',
  className,
}: {
  name?: string | null;
  url?: string | null;
  size?: keyof typeof sizeMap;
  className?: string;
}) {
  const label = name ?? '?';
  const initials = label
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <RA.Root
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold',
        sizeMap[size],
        className,
      )}
      title={label}
    >
      {url && <RA.Image src={url} alt={label} className="h-full w-full object-cover" />}
      <RA.Fallback className={cn('flex h-full w-full items-center justify-center', tintFor(label))}>
        {initials}
      </RA.Fallback>
    </RA.Root>
  );
}
