# manaTask

A multi-tenant SaaS task-management tool (a focused Jira/Linear/ClickUp alternative) built for teams — with **Kanban / List / Calendar** views, **real-time** collaboration, **RBAC**, workspace invitations, time tracking, reporting, and full **i18n (Oʻzbekcha / Русский / English)**.

Built as a monorepo: **NestJS + PostgreSQL + TypeORM** API, **Next.js (App Router) + Tailwind** web client, and a shared TypeScript contract package.

```
manatask/
├─ apps/
│  ├─ api/        NestJS backend (REST + Socket.io)
│  └─ web/        Next.js frontend
├─ packages/
│  └─ shared/     Shared types, enums & DTO contracts
└─ docker-compose.yml   Postgres 16
```

## Architecture highlights

- **Multi-tenancy:** shared database with a `workspaceId` (tenant) column on every tenant-scoped row. A central `WorkspaceGuard` resolves the active workspace from the `x-workspace-id` header and verifies membership, so every query is tenant-isolated. Swapping to schema-per-tenant later only touches the data layer.
- **RBAC:** workspace roles `owner > admin > member > guest`, enforced declaratively with `@MinRole(...)` + `RolesGuard`.
- **Auth:** email+password with JWT **access + refresh** rotation (hashed refresh tokens), optional **Google OAuth**, and email **invitations** (SMTP, or logged to console in dev).
- **Real-time:** a Socket.io gateway broadcasts task/comment/notification events to per-workspace, per-task and per-user rooms.
- **Hierarchy:** `Workspace → Project → Task → Subtask`, plus Sprints, Labels, Comments, Checklists, Attachments, Time entries and Dependencies.

## Prerequisites

- Node.js 20+
- Docker (for Postgres) — or a local PostgreSQL 16

## Getting started

```bash
# 1. Install all workspaces
npm install

# 2. Create your env file (root)
cp .env.example .env

# 3. Start Postgres
npm run db:up          # docker compose up -d db

# 4. Build the shared package (types used by both apps)
npm run build:shared

# 5. Seed demo data (creates a Demo workspace, users, a project & tasks)
npm run seed

# 6. Run API + Web together
npm run dev
```

- API → http://localhost:4000/api
- Web → http://localhost:3000

### Demo login

After seeding:

| Email | Password | Role |
|-------|----------|------|
| admin@manatask.local | password123 | Owner |
| pm@manatask.local | password123 | Admin |
| dev@manatask.local | password123 | Member |

Workspace: **Demo**.

## Useful scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Build shared, then run API + Web concurrently |
| `npm run dev:api` | API only (watch mode) |
| `npm run dev:web` | Web only |
| `npm run seed` | Seed demo data |
| `npm run db:up` / `db:down` | Start / stop Postgres |

> `DB_SYNCHRONIZE=true` (default) auto-creates tables in dev. For production, switch it off and use migrations.

## Environment

Backend variables live in the root `.env` (see `.env.example`): database, JWT secrets, Google OAuth, SMTP, uploads.
Frontend variables live in `apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

## Production features

Beyond the MVP, the backend is hardened for production:

| Area | What's included |
|------|-----------------|
| **Migrations** | TypeORM migrations (`npm run migration:generate/run/revert`). `DB_SYNCHRONIZE=false` in prod; set `DB_MIGRATIONS_RUN=true` to auto-apply on boot. Uses `DIRECT_DATABASE_URL` for DDL, pooled `DATABASE_URL` at runtime (Neon). |
| **Sessions** | Multi-device refresh-token rotation with reuse detection (a replayed token revokes the whole family). `GET /auth/sessions`, `POST /auth/logout`, `POST /auth/logout-all`. |
| **Email flows** | Email verification + password reset (single-use, hashed, expiring tokens). |
| **Security** | `helmet`, global rate limiting (`@nestjs/throttler`, tighter on auth routes), tenant isolation via `WorkspaceGuard`, RBAC via `@MinRole`. |
| **Storage** | File attachments via S3/R2 (presigned URLs) with a local-disk fallback for dev; downloads use short-lived signed links. |
| **Observability** | Structured JSON logging (`pino`), uniform error envelope, optional **Sentry** (`SENTRY_DSN`). |
| **Docs** | OpenAPI/Swagger UI at `/api/docs`. |
| **Health** | `/api/health` (DB ping) + `/api/health/live`; graceful shutdown hooks. |
| **Jobs** | Cron maintenance (due-soon notifications, expire invitations, purge sessions) + email queue via **BullMQ** when `REDIS_URL` is set (inline fallback otherwise). |
| **Audit** | Soft delete on tasks/projects + activity log with field-level old→new diffs (`GET /api/tasks/:id/activity`). |
| **Integrations** | Personal **API keys** (`Authorization: ApiKey <key>` / `x-api-key`) and outgoing **webhooks** (HMAC-signed) for task events. |
| **Tests** | Jest unit tests (RBAC, tenant isolation) + e2e suite (`npm run test:e2e`, needs `TEST_DATABASE_URL`). |
| **CI/CD** | GitHub Actions (`.github/workflows/ci.yml`): build, unit + e2e against a Postgres service. Docker images: `Dockerfile.api`, `Dockerfile.web`. |

### Deploy with Docker

```bash
# API
docker build -f Dockerfile.api -t manatask-api .
docker run -p 4000:4000 --env-file .env manatask-api

# Web (NEXT_PUBLIC_* are baked at build time)
docker build -f Dockerfile.web \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api \
  --build-arg NEXT_PUBLIC_WS_URL=https://api.example.com \
  -t manatask-web .
docker run -p 3000:3000 manatask-web
```

See `.env.example` for the full configuration surface (DB, JWT, Google, SMTP, S3, Redis, Sentry).

## Tech stack

**Backend:** NestJS 10, TypeORM 0.3, PostgreSQL, Passport (JWT + Google), Socket.io, class-validator.
**Frontend:** Next.js 14, React 18, TanStack Query, Zustand, Tailwind, dnd-kit (drag & drop), date-fns, socket.io-client, lucide-react.
