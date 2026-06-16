'use client';

import { forwardRef } from 'react';
import * as RS from '@radix-ui/react-switch';
import { cn } from '@/lib/cn';

export const Switch = forwardRef<
  React.ElementRef<typeof RS.Root>,
  React.ComponentPropsWithoutRef<typeof RS.Root>
>(({ className, ...props }, ref) => (
  <RS.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
      'data-[state=checked]:bg-accent data-[state=unchecked]:bg-border-strong',
      className,
    )}
    {...props}
  >
    <RS.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
  </RS.Root>
));
Switch.displayName = 'Switch';
