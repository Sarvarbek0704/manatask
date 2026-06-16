/**
 * Validates critical env at boot. In production we refuse to start with missing
 * or insecure-default secrets — fail fast instead of silently being insecure.
 */
const INSECURE = new Set([
  '',
  'dev-access-secret',
  'dev-refresh-secret',
  'change-me-access-secret',
  'change-me-refresh-secret',
]);

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const isProd = (config.NODE_ENV ?? 'development') === 'production';
  if (!isProd) return config;

  const errors: string[] = [];

  const access = String(config.JWT_ACCESS_SECRET ?? '');
  const refresh = String(config.JWT_REFRESH_SECRET ?? '');
  if (INSECURE.has(access) || access.length < 32) {
    errors.push('JWT_ACCESS_SECRET must be set to a strong value (≥32 chars).');
  }
  if (INSECURE.has(refresh) || refresh.length < 32) {
    errors.push('JWT_REFRESH_SECRET must be set to a strong value (≥32 chars).');
  }
  if (access && refresh && access === refresh) {
    errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ.');
  }
  if (!config.DATABASE_URL && !config.DB_HOST) {
    errors.push('DATABASE_URL (or DB_HOST) must be configured.');
  }
  if (String(config.DB_SYNCHRONIZE ?? '') === 'true') {
    errors.push('DB_SYNCHRONIZE must be false in production — use migrations.');
  }

  if (errors.length) {
    throw new Error(`Invalid production configuration:\n- ${errors.join('\n- ')}`);
  }
  return config;
}
