'use client';

import { forwardRef } from 'react';
import * as DM from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;
export const DropdownMenuGroup = DM.Group;

export const DropdownMenuContent = forwardRef<
  React.ElementRef<typeof DM.Content>,
  React.ComponentPropsWithoutRef<typeof DM.Content>
>(({ className, sideOffset = 6, align = 'end', ...props }, ref) => (
  <DM.Portal>
    <DM.Content
      ref={ref}
      sideOffset={sideOffset}
      align={align}
      className={cn(
        'z-[60] min-w-[12rem] overflow-hidden rounded-lg border border-border bg-elevated p-1 shadow-popover',
        'data-[state=open]:animate-scale-in',
        className,
      )}
      {...props}
    />
  </DM.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = forwardRef<
  React.ElementRef<typeof DM.Item>,
  React.ComponentPropsWithoutRef<typeof DM.Item> & { destructive?: boolean }
>(({ className, destructive, ...props }, ref) => (
  <DM.Item
    ref={ref}
    className={cn(
      'flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none transition-colors',
      'data-[highlighted]:bg-surface-2 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-muted',
      destructive
        ? 'text-danger data-[highlighted]:bg-danger/10 [&>svg]:text-danger'
        : 'text-foreground',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

export function DropdownMenuLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof DM.Label>) {
  return <DM.Label className={cn('px-2.5 py-1.5 text-xs font-medium text-muted', className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentPropsWithoutRef<typeof DM.Separator>) {
  return <DM.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}

export const DropdownMenuCheckboxItem = forwardRef<
  React.ElementRef<typeof DM.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DM.CheckboxItem>
>(({ className, children, ...props }, ref) => (
  <DM.CheckboxItem
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-md py-2 pl-8 pr-2.5 text-sm text-foreground outline-none data-[highlighted]:bg-surface-2',
      className,
    )}
    {...props}
  >
    <DM.ItemIndicator className="absolute left-2.5">
      <Check className="h-4 w-4 text-accent" />
    </DM.ItemIndicator>
    {children}
  </DM.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';
