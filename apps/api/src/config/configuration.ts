export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  // Hosts like Render/Railway inject PORT — honor it first.
  port: parseInt(process.env.PORT ?? process.env.API_PORT ?? '4000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  sentryDsn: process.env.SENTRY_DSN ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  requireEmailVerification: (process.env.REQUIRE_EMAIL_VERIFICATION ?? 'false') === 'true',
  db: {
    // If DATABASE_URL is set (e.g. Neon), it takes precedence over the discrete fields.
    url: process.env.DATABASE_URL ?? '',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'manatask',
    password: process.env.DB_PASSWORD ?? 'manatask',
    name: process.env.DB_NAME ?? 'manatask',
    synchronize: (process.env.DB_SYNCHRONIZE ?? 'false') === 'true',
    migrationsRun: (process.env.DB_MIGRATIONS_RUN ?? 'false') === 'true',
    // Neon and most hosted Postgres require SSL. Auto-enable for hosted URLs.
    ssl:
      (process.env.DB_SSL ?? '') === 'true' ||
      /neon\.tech|sslmode=require|render\.com|supabase/.test(process.env.DATABASE_URL ?? ''),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '900s',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      'http://localhost:4000/api/auth/google/callback',
    enabled: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
  },
  mail: {
    // HTTP email provider (recommended on hosts that block SMTP, e.g. Render).
    brevoApiKey: process.env.BREVO_API_KEY ?? '',
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.MAIL_FROM ?? 'manaTask <no-reply@manatask.local>',
  },
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  apiUrl:
    process.env.API_PUBLIC_URL ??
    (process.env.RENDER_EXTERNAL_URL
      ? `${process.env.RENDER_EXTERNAL_URL}/${process.env.API_PREFIX ?? 'api'}`
      : `http://localhost:${process.env.API_PORT ?? '4000'}/${process.env.API_PREFIX ?? 'api'}`),
  s3: {
    bucket: process.env.S3_BUCKET ?? '',
    region: process.env.S3_REGION ?? 'auto',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    // Set for S3-compatible providers (Cloudflare R2, MinIO, etc.)
    endpoint: process.env.S3_ENDPOINT ?? '',
    enabled: !!process.env.S3_BUCKET && !!process.env.S3_ACCESS_KEY_ID,
  },
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB ?? '25', 10),
});
