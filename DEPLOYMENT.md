# Deploying Altanon HRMS to production

This app handles payroll, PAN/bank details, and signed documents — treat it like it holds sensitive
data, because it does. This guide is written for where the codebase actually is today, not generic
advice. It calls out what's already handled, what I changed just now, and what's still on you.

## Already in place — no action needed

- Passwords hashed with argon2id.
- PAN/bank account numbers encrypted at rest (AES-256-GCM) via `PII_ENCRYPTION_KEY`.
- Session cookies: `httpOnly`, `secure` in production, `sameSite=lax`.
- Full RBAC — every route/action checks a permission, not just a role name.
- Audit log on login, logout, password change, and lockouts.

## Just added, as part of getting this deploy-ready

- **Login lockout**: 5 failed attempts locks the account for 15 minutes (`src/server/actions/auth.actions.ts`).
  Verified end-to-end — wrong password 5x locks the account, and the *correct* password is also
  rejected until the lockout window passes.
- **Security response headers** (`next.config.ts`): `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`. (CSP deliberately left out —
  needs testing against the actual rendered pages before enabling; don't want to ship it blind and
  silently break something.)
- **`npm run db:migrate:deploy`** — added because the existing `db:migrate` script runs
  `prisma migrate dev`, which is interactive and dev-only. Production needs `prisma migrate deploy`.
- **`Dockerfile` + `.dockerignore`** — multi-stage build, Debian-based (not Alpine — Puppeteer/Chromium
  has real musl-libc compatibility problems on Alpine), system Chromium instead of Puppeteer's own
  download, runs as a non-root user. Build succeeds locally (verified via `next build` with
  `output: "standalone"`); I could not `docker build` it myself — Docker isn't installed in this
  environment — so **build it yourself before trusting it**: `docker build -t altanon-hrms .`

## The one architectural decision you need to make first

**Generated PDFs (offer letters, payslips, Form 16) are written to local disk** — three directories
under `storage/`. This works fine on your machine, but on almost any hosting platform the container
filesystem is wiped on every redeploy, and if you ever run more than one instance, each instance only
sees its own files. This is the one thing in this app that isn't cloud-ready as-is.

Two ways to handle it — pick one before you deploy:

- **Path A — persistent volume (simpler, fine for now)**: run exactly one instance, and mount a
  persistent volume at `/app/storage` (Railway volumes, Render disks, Fly.io volumes, or a real disk
  if you're on a VPS). The `Dockerfile` already declares this as a volume. Zero code changes. The
  limitation: you can't scale to multiple instances later without moving off local disk anyway, and
  volume backups are your responsibility.
- **Path B — object storage (S3/R2/Spaces)**: the correct long-term answer, needed if you ever want
  multiple instances or a serverless-style host. This needs actual code changes — the three
  `storage/*` write paths in `document.actions.ts`, `payroll.actions.ts`, and `form16.actions.ts`,
  plus the three PDF-serving API routes, would need to read/write via an S3 client instead of `fs`.
  I haven't done this yet because it depends on which provider you'd pick (Cloudflare R2 has no egress
  fees and is S3-API-compatible, so it's what I'd default to — but it's your call). Tell me when you're
  ready and I'll wire it up.

For a small internal HR tool, Path A is a completely reasonable place to start.

## What you need to do (accounts/decisions only I can't make for you)

1. **Put this in version control.** There's no git repo yet:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
   Push to a **private** GitHub/GitLab repo — this code contains your company's real CIN, address,
   and document templates.

2. **Pick a host.** Given the Puppeteer dependency (needs a long-lived process, not a short-lived
   serverless function — Vercel's serverless functions are a poor fit here), I'd recommend a platform
   that runs a persistent container: **Railway** or **Render** are the simplest for a team this size —
   both do Docker deploys, managed Postgres, persistent volumes, and automatic TLS with almost no
   ops overhead. A plain VPS (DigitalOcean, Hetzner) works too but means you're managing the reverse
   proxy, TLS renewal, and OS patching yourself.

3. **Provision managed PostgreSQL** — not the one on your laptop. Neon, Supabase, Railway Postgres, or
   your host's managed offering. Get the connection string with `?sslmode=require`.

4. **Register an Azure AD app** for Microsoft Graph mail sending (needed for the "Send by Email"
   button to work) — this needs your Microsoft 365 admin, not you alone. Steps are already in
   `README.md`; you'll end up with `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`.

5. **Buy/point a domain** at your host, and let the host's TLS handle HTTPS (Railway/Render/Vercel all
   auto-provision Let's Encrypt certs — don't do this manually unless you're on a bare VPS).

## Environment variables for production

Generate fresh values — **do not reuse anything from your local `.env`**:

```bash
# Session signing secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# PII encryption key (must be exactly 32 bytes, base64-encoded)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

| Variable | Notes |
|---|---|
| `DATABASE_URL` | From your managed Postgres provider, with `?sslmode=require` |
| `SESSION_SECRET` | Freshly generated, above — never reused from dev |
| `PII_ENCRYPTION_KEY` | Freshly generated, above. **Losing this makes all encrypted PAN/bank data unrecoverable — back it up somewhere separate from the app (a password manager or secrets vault), not just in the host's env panel.** |
| `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` | From the Azure AD app registration above |
| `MAIL_SENDER_ADDRESS` | Your real sending address, e.g. `hr@altanontech.com` |
| `NODE_ENV` | `production` — the Dockerfile sets this already |

Set these in your host's secret manager (Railway/Render both have one built in), never in a committed
file.

## Deploy steps

```bash
# 1. Build (your host will likely do this step itself from the Dockerfile — this is for a manual/local check)
docker build -t altanon-hrms .

# 2. Apply migrations against the PRODUCTION database (run once, from wherever you have the prod
#    DATABASE_URL — many hosts let you run a one-off command against the deployed environment)
npm run db:migrate:deploy

# 3. Seed baseline data (roles, permissions, departments, statutory config, document templates) —
#    only on a genuinely empty database. It won't overwrite an existing Super Admin or company profile.
npm run db:seed

# 4. Deploy the container via your host's normal flow (git push if it auto-builds from the Dockerfile,
#    or their CLI)
```

After the first deploy: log in with the seeded Super Admin, change the password immediately (the app
forces this on first login anyway), then go to **Administration → Company Settings** and confirm the
company profile is correct.

## Post-deploy checklist

- [ ] Confirm `NODE_ENV=production` is actually set (cookies won't get the `secure` flag otherwise)
- [ ] Confirm HTTPS is enforced (no plain-HTTP access to the app)
- [ ] Log in once and confirm session/logout work correctly
- [ ] Generate one test document and confirm the PDF is retrievable — this is your canary for the
      storage decision above actually working
- [ ] Send one test email (to yourself) and confirm Microsoft Graph is wired up correctly
- [ ] Set up automated backups for the Postgres database — ask your host how; don't assume it's on by
      default
- [ ] If using Path A (volume), confirm the volume is *also* backed up, separately from the database
- [ ] Store `PII_ENCRYPTION_KEY` and `SESSION_SECRET` somewhere outside the hosting platform too (a
      password manager), in case you ever need to migrate hosts

## Ongoing

- **Dependency updates**: run `npm audit` periodically; this app has real financial and personal data
  in it, don't let it go stale.
- **Rotating secrets**: if `AZURE_CLIENT_SECRET` or `SESSION_SECRET` is ever exposed, rotate it
  immediately — rotating `SESSION_SECRET` invalidates all logged-in sessions, which is the point.
- **CA review**: the payroll statutory config (PF/PT/TDS rates) is seeded with reasonable defaults,
  not verified by an accountant — get that reviewed before the first real payroll run, as noted
  elsewhere in this project.
