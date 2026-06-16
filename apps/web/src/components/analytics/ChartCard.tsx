'use client';

import { Card } from '@/components/ui/primitives';

export function ChartCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

export function ChartEmpty({ label }: { label: string }) {
  return <div className="flex h-full min-h-[14rem] items-center justify-center text-sm text-muted">{label}</div>;
}
