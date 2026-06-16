import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from './entities';

// Load env from the monorepo root (.env) for standalone scripts like seed.
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

// Migrations/DDL should use the DIRECT (non-pooled) endpoint; the app runtime
// can use the pooled DATABASE_URL. Falls back to DATABASE_URL when unset.
const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '';
const useSsl =
  (process.env.DB_SSL ?? '') === 'true' ||
  /neon\.tech|sslmode=require|render\.com|supabase/.test(url);

/** Standalone DataSource for scripts (seed) and migrations. */
export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(url
    ? { url }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        username: process.env.DB_USERNAME ?? 'manatask',
        password: process.env.DB_PASSWORD ?? 'manatask',
        database: process.env.DB_NAME ?? 'manatask',
      }),
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  entities: ALL_ENTITIES,
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'manatask_migrations',
  synchronize: (process.env.DB_SYNCHRONIZE ?? 'false') === 'true',
});
