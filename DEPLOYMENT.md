# Deploying manaTask to the internet

Architecture in production:

- **Database** — Neon (already cloud-hosted Postgres).
- **API** — Render (Docker, `Dockerfile.api`) → e.g. `https://manatask-api.onrender.com`
- **Web** — Vercel (Next.js, `apps/web`) → e.g. `https://manatask.vercel.app`

Everything is driven by environment variables — no localhost is hard-coded. Follow the steps in order; the order matters because each service needs the other's URL.

---

## 0. Push the code to GitHub

```bash
git remote add origin https://github.com/Sarvarbek0704/manatask.git   # if not already
git add -A
git commit -m "Production-ready deploy config"
git branch -M main
git push -u origin main
```

> `.env` is git-ignored — your secrets are **not** committed. You'll set them in the Render/Vercel dashboards instead.

---

## 1. Deploy the API to Render

1. Go to **render.com → New → Blueprint**, connect the GitHub repo. Render reads `render.yaml` and creates the **manatask-api** Docker web service.
   - (Manual alternative: New → Web Service → Docker → Dockerfile path `Dockerfile.api`.)
2. `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` are generated automatically. Fill the rest under **Environment**:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Neon **pooled** connection string (`...-pooler...?sslmode=require`) |
   | `DIRECT_DATABASE_URL` | Neon **direct** string (no `-pooler`) — used for migrations |
   | `WEB_ORIGIN` | _set after step 2_ (your Vercel URL) |
   | `API_PUBLIC_URL` | `https://manatask-api.onrender.com/api` (your API URL + `/api`) |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
   | `GOOGLE_CALLBACK_URL` | `https://manatask-api.onrender.com/api/auth/google/callback` |
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_USER` / `SMTP_PASS` | your Gmail + App Password |
   | `MAIL_FROM` | `manaTask <you@gmail.com>` |

3. Deploy. Migrations run automatically on boot (`DB_MIGRATIONS_RUN=true`). Confirm health:
   `https://manatask-api.onrender.com/api/health` → `{"status":"ok"}`.
4. Copy the final API URL (Render shows it at the top of the service).

> **Cold start:** Render's free plan sleeps after ~15 min idle; the first request then takes ~50s. Upgrade the plan to avoid this.

---

## 2. Deploy the Web to Vercel

1. **vercel.com → Add New → Project**, import the repo.
2. Configure:
   - **Root Directory:** `apps/web`
   - **Framework Preset:** Next.js (auto-detected)
   - **Build Command:** leave default — Vercel runs the `vercel-build` script (which builds the shared package first).
   - **Install Command:** default (`npm install` — installs the whole workspace).
3. **Environment Variables:**

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://manatask-api.onrender.com/api` |
   | `NEXT_PUBLIC_WS_URL` | `https://manatask-api.onrender.com` _(no `/api`)_ |

4. Deploy. Copy the production URL, e.g. `https://manatask.vercel.app`.

---

## 3. Wire the two services together

Back in **Render → manatask-api → Environment**, set/confirm:

- `WEB_ORIGIN` = `https://manatask.vercel.app`
  (comma-separate if you add a custom domain: `https://manatask.vercel.app,https://app.yourdomain.com`)
- `API_PUBLIC_URL` = `https://manatask-api.onrender.com/api`
- `GOOGLE_CALLBACK_URL` = `https://manatask-api.onrender.com/api/auth/google/callback`

Save → Render redeploys. Vercel **preview** domains (`*.vercel.app`) are allowed by CORS automatically.

---

## 4. Update Google OAuth

In **Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client**:

- **Authorized JavaScript origins:** `https://manatask.vercel.app`
- **Authorized redirect URIs:** `https://manatask-api.onrender.com/api/auth/google/callback`

(Keep the localhost entries too if you still develop locally.)

---

## 5. Verify

1. Open `https://manatask.vercel.app` → Register.
2. A 6-digit **OTP** arrives by email → enter it → you're in.
3. Try Google sign-in, create a project/task, real-time updates, invitations.

---

## Production notes

- **Attachments:** Render's disk is ephemeral (wiped on each deploy). For persistent file uploads, set the `S3_*` variables (AWS S3 or Cloudflare R2) on Render — the app switches to S3 automatically.
- **Email queue / rate-limit store:** set `REDIS_URL` (e.g. Upstash) to enable the durable BullMQ email queue + webhook retries. Without it, email sends inline (fine for low volume).
- **Errors:** set `SENTRY_DSN` to capture server errors.
- **Custom domain:** add it in Vercel, then append it to `WEB_ORIGIN` on Render and to the Google OAuth origins.
- **Seeding demo data** is optional in production — just register a fresh account. To seed, run `npm run seed` from a Render shell with `DATABASE_URL` set.
