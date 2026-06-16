'use client';

import { forwardRef } from 'react';
import * as RT from '@radix-ui/react-tabs';
import { cn } from '@/lib/cn';

export const Tabs = RT.Root;

export const TabsList = forwardRef<
  React.ElementRef<typeof RT.List>,
  React.ComponentPropsWithoutRef<typeof RT.List>
>(({ className, ...props }, ref) => (
  <RT.List
    ref={ref}
    className={cn('inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1', className)}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = forwardRef<
  React.ElementRef<typeof RT.Trigger>,
  React.ComponentPropsWithoutRef<typeof RT.Trigger>
>(({ className, ...props }, ref) => (
  <RT.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-muted transition-colors',
      'hover:text-foreground focus-visible:outline-none',
      'data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-xs',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = RT.Content;
