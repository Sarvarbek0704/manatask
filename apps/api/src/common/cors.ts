/**
 * Origin allow-list shared by the HTTP server and the Socket.io gateway.
 * WEB_ORIGIN may be a comma-separated list. Vercel preview domains
 * (*.vercel.app) are allowed automatically so preview deploys work.
 */
export function allowedOrigins(): string[] {
  return (process.env.WEB_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(origin?: string): boolean {
  // Non-browser clients (curl, server-to-server, same-origin) send no Origin.
  if (!origin) return true;
  const list = allowedOrigins();
  if (list.includes('*') || list.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host.endsWith('.vercel.app')) return true;
  } catch {
    /* malformed origin */
  }
  return false;
}
