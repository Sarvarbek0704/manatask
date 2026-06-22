'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function isChunkError(e?: Error) {
  const msg = `${e?.name ?? ''} ${e?.message ?? ''}`;
  return /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module/i.test(msg);
}

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // A stale-deploy chunk error recovers cleanly with a full reload.
    if (isChunkError(error)) {
      const last = Number(sessionStorage.getItem('mt:chunk-reloaded-at') || 0);
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem('mt:chunk-reloaded-at', String(Date.now()));
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-muted">
        <RefreshCw className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-1 text-sm text-muted">Please try again. If it persists, reload the page.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => reset()}>Try again</Button>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    </div>
  );
}
