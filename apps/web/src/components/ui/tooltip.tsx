'use client';

import * as RT from '@radix-ui/react-tooltip';
import { cn } from '@/lib/cn';

export const TooltipProvider = RT.Provider;

export function Tooltip({
  content,
  children,
  side = 'top',
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <RT.Root>
      <RT.Trigger asChild>{children}</RT.Trigger>
      <RT.Portal>
        <RT.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-[70] rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md',
            'data-[state=delayed-open]:animate-fade-in',
          )}
        >
          {content}
          <RT.Arrow className="fill-foreground" />
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  );
}
