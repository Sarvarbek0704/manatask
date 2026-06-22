'use client';

import { useEffect } from 'react';

/**
 * After a new deploy, chunk file hashes change. A browser still running the
 * previous build will 404 when it lazily imports a page chunk during client
 * navigation, surfacing as a ChunkLoadError. We recover transparently by
 * reloading once (guarded against reload loops) so the user gets the new build.
 */
const RELOAD_KEY = 'mt:chunk-reloaded-at';

function isChunkError(value: unknown): boolean {
  const msg =
    typeof value === 'string'
      ? value
      : (value as { message?: string; name?: string })?.message ??
        (value as { name?: string })?.name ??
        '';
  return (
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Loading CSS chunk/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg)
  );
}

export function ChunkReloader() {
  useEffect(() => {
    const reloadOnce = () => {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      // Don't loop: skip if we already reloaded within the last 10s.
      if (Date.now() - last < 10_000) return;
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      window.location.reload();
    };
    const onError = (e: ErrorEvent) => {
      if (isChunkError(e.error) || isChunkError(e.message)) reloadOnce();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (isChunkError(e.reason)) reloadOnce();
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
