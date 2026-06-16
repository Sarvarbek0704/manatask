'use client';

import { forwardRef } from 'react';
import * as RD from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Dialog = RD.Root;
export const DialogTrigger = RD.Trigger;
export const DialogClose = RD.Close;

export const DialogContent = forwardRef<
  React.ElementRef<typeof RD.Content>,
  React.ComponentPropsWithoutRef<typeof RD.Content> & { hideClose?: boolean; size?: 'md' | 'lg' | 'xl' }
>(({ className, children, hideClose, size = 'lg', ...props }, ref) => {
  const widths = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <RD.Portal>
      <RD.Overlay className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm data-[state=open]:animate-fade-in" />
      <RD.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 grid w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 gap-0',
          'overflow-hidden rounded-xl border border-border bg-elevated shadow-popover',
          'data-[state=open]:animate-scale-in max-h-[90vh]',
          widths[size],
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <RD.Close className="absolute right-3.5 top-3.5 rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </RD.Close>
        )}
      </RD.Content>
    </RD.Portal>
  );
});
DialogContent.displayName = 'DialogContent';

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 border-b border-border px-6 py-4', className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof RD.Title>) {
  return <RD.Title className={cn('text-base font-semibold text-foreground', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof RD.Description>) {
  return <RD.Description className={cn('text-sm text-muted', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-2 border-t border-border bg-surface-2/50 px-6 py-3.5', className)}
      {...props}
    />
  );
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('overflow-y-auto px-6 py-5 scroll-area', className)} {...props} />;
}
