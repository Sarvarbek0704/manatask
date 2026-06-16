'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

function read(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v ? `hsl(${v})` : fallback;
}

export interface ChartColors {
  accent: string;
  success: string;
  warning: string;
  danger: string;
  muted: string;
  border: string;
  foreground: string;
  grid: string;
  palette: string[];
}

/** Reads theme CSS variables into concrete colors recharts can use; updates on theme change. */
export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ChartColors>(() => compute());

  useEffect(() => {
    // Defer to next frame so the .dark class is applied before reading.
    const id = requestAnimationFrame(() => setColors(compute()));
    return () => cancelAnimationFrame(id);
  }, [resolvedTheme]);

  return colors;
}

function compute(): ChartColors {
  const accent = read('--accent', 'hsl(243 75% 59%)');
  return {
    accent,
    success: read('--success', 'hsl(142 64% 38%)'),
    warning: read('--warning', 'hsl(32 90% 45%)'),
    danger: read('--danger', 'hsl(0 70% 50%)'),
    muted: read('--muted', 'hsl(220 9% 46%)'),
    border: read('--border', 'hsl(220 16% 90%)'),
    foreground: read('--foreground', 'hsl(224 32% 12%)'),
    grid: read('--border', 'hsl(220 16% 90%)'),
    palette: [
      accent,
      read('--success', '#10b981'),
      read('--warning', '#f59e0b'),
      'hsl(199 89% 48%)',
      'hsl(280 65% 60%)',
      'hsl(330 75% 60%)',
    ],
  };
}
