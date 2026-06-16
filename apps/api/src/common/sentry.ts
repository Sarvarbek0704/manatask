import * as Sentry from '@sentry/node';

/** Initializes Sentry if SENTRY_DSN is configured. No-op otherwise. */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  });
  return true;
}
