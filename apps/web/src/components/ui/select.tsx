'use client';

import { forwardRef } from 'react';
import * as RS from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Select = RS.Root;
export const SelectValue = RS.Value;

export const SelectTrigger = forwardRef<
  React.ElementRef<typeof RS.Trigger>,
  React.ComponentPropsWithoutRef<typeof RS.Trigger>
>(({ className, children, ...props }, ref) => (
  <RS.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-surface px-3 text-sm text-foreground',
      'transition-colors hover:border-border-strong focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25',
      'data-[placeholder]:text-muted/70 [&>span]:truncate',
      className,
    )}
    {...props}
  >
    {children}
    <RS.Icon asChild>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
    </RS.Icon>
  </RS.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

export const SelectContent = forwardRef<
  React.ElementRef<typeof RS.Content>,
  React.ComponentPropsWithoutRef<typeof RS.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <RS.Portal>
    <RS.Content
      ref={ref}
      position={position}
      sideOffset={6}
      className={cn(
        'z-[60] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-elevated p-1 shadow-popover',
        'data-[state=open]:animate-scale-in',
        className,
      )}
      {...props}
    >
      <RS.Viewport className="p-0">{children}</RS.Viewport>
    </RS.Content>
  </RS.Portal>
));
SelectContent.displayName = 'SelectContent';

export const SelectItem = forwardRef<
  React.ElementRef<typeof RS.Item>,
  React.ComponentPropsWithoutRef<typeof RS.Item>
>(({ className, children, ...props }, ref) => (
  <RS.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-md py-1.5 pl-2.5 pr-8 text-sm text-foreground outline-none',
      'data-[highlighted]:bg-surface-2 data-[state=checked]:font-medium data-[state=checked]:text-accent',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <RS.ItemText>{children}</RS.ItemText>
    <RS.ItemIndicator className="absolute right-2.5 flex items-center">
      <Check className="h-4 w-4" />
    </RS.ItemIndicator>
  </RS.Item>
));
SelectItem.displayName = 'SelectItem';
