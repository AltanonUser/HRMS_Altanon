# Going live: hrms.altanontech.com on the same VPS as LeadSignal

Same server, same pattern (IIS reverse proxy + NSSM-managed process), as a
**second site** alongside LeadSignal (`crm.altanontech.com`). Run everything
marked `[VPS]` in an RDP/console session on the server itself. Everything
marked `[LOCAL]` runs on this machine.

The repo is already on GitHub (`git@github.com:AltanonUser/HRMS_Altanon.git`)
so there's no "push to GitHub" step needed — skip straight to the VPS.

## 1. [VPS] Check/upgrade Node.js

HRMS needs Node ≥20 (ideally 22+) — check what's already there from the
LeadSignal frontend build:

```powershell
node --version
```

If it's below 20, install a current LTS (this is exactly what we hit on the
dev laptop — Node 18 is too old for this app's dependencies):

```powershell
winget install --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
```

Open a **fresh** PowerShell window afterward so PATH picks up the new install,
and confirm with `node --version` again.

> **Watch for a stale global npm.** If `npm --version` reports something old
> and inconsistent with the Node version you just installed, run
> `npm config get prefix` — if it points somewhere unexpected (an old global
> npm install shadows the bundled one via `npm.cmd`'s prefix lookup), invoke
> npm directly instead:
> `& "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" <command>`
> This bit us on the dev laptop — same fix applies here if it recurs.

## 2. [VPS] Install PostgreSQL

```powershell
winget install --id PostgreSQL.PostgreSQL.17 --silent --accept-package-agreements --accept-source-agreements
```

This installs it as a proper Windows service (`postgresql-x64-17`) — since
you have real admin/RDP access here (unlike the sandboxed dev laptop), you
can manage it normally via `services.msc` or `Set-Service`/`Start-Service`.

Set the superuser password if the installer didn't prompt you for one, then
create the app role and database:

```powershell
$env:PGPASSWORD = '<postgres-superuser-password>'
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "CREATE ROLE hrms_app WITH LOGIN PASSWORD '<pick-a-strong-password>';"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE altanon_hrms OWNER hrms_app;"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "GRANT ALL PRIVILEGES ON DATABASE altanon_hrms TO hrms_app;"
```

`prisma migrate deploy` (used in production, unlike `migrate dev`) does
**not** need a shadow database, so `hrms_app` does **not** need `CREATEDB`
here — skip that grant, it's dev-only.

## 3. [VPS] Get the code and install dependencies

```powershell
cd C:\Repos
git clone git@github.com:AltanonUser/HRMS_Altanon.git hrms
cd hrms
npm install
```

If npm reports pending install scripts (Prisma, argon2, Puppeteer, esbuild
all have legitimate build/postinstall steps — this is npm's script-approval
gate, not an error):

```powershell
npm approve-scripts "@prisma/client"
npm approve-scripts "@prisma/engines"
npm approve-scripts argon2
npm approve-scripts esbuild
npm approve-scripts prisma
npm approve-scripts puppeteer
npm approve-scripts unrs-resolver
npm rebuild
```

`npm rebuild` downloads Puppeteer's Chromium (~200MB) and builds argon2 —
give it a few minutes.

## 4. [VPS] Configure `.env` for production

```powershell
Copy-Item .env.example .env
notepad .env
```

Generate fresh secrets — **never reuse the dev-laptop values**:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"    # SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" # PII_ENCRYPTION_KEY
```

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://hrms_app:<password-from-step-2>@localhost:5432/altanon_hrms?schema=public` |
| `SESSION_SECRET` | freshly generated above |
| `PII_ENCRYPTION_KEY` | freshly generated above — **back this up outside the VPS too** (password manager); losing it makes encrypted PAN/bank data unrecoverable |
| `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` | from the Azure AD app registration (README.md → "Connecting the official mailbox") — needs your M365 admin |
| `MAIL_SENDER_ADDRESS` | e.g. `hr@altanontech.com` |
| `NEXT_PUBLIC_APP_NAME` | `Altanon HRMS` |
| `NODE_ENV` | `production` |

## 5. [VPS] Migrate and seed the database

```powershell
npx prisma migrate deploy
npm run db:seed
```

Seed is idempotent — safe to re-run, won't overwrite an existing Super Admin
or company profile. Note the printed Super Admin password and change it
immediately after your first login.

## 6. [VPS] Build

```powershell
npm run build
```

## 7. [VPS] NSSM service (keeps the app running, auto-restarts on crash)

Same NSSM binary already on this box for LeadSignal:

```powershell
C:\nssm-2.24\win64\nssm.exe install HRMSApp "C:\Program Files\nodejs\node.exe"
C:\nssm-2.24\win64\nssm.exe set HRMSApp AppParameters "node_modules\next\dist\bin\next start -p 3001"
C:\nssm-2.24\win64\nssm.exe set HRMSApp AppDirectory "C:\Repos\hrms"
C:\nssm-2.24\win64\nssm.exe set HRMSApp AppStdout "C:\Repos\hrms\logs\stdout.log"
C:\nssm-2.24\win64\nssm.exe set HRMSApp AppStderr "C:\Repos\hrms\logs\stderr.log"
C:\nssm-2.24\win64\nssm.exe start HRMSApp
```

(Create `C:\Repos\hrms\logs` first if it doesn't exist.) Next.js loads `.env`
itself — no need to set env vars on the NSSM service separately.

Confirm it's listening: `Test-NetConnection localhost -Port 3001` should
say `TcpTestSucceeded: True`.

## 8. [VPS] IIS site (reverse proxy)

Reuses the same ARR + URL Rewrite modules already installed for LeadSignal.

1. IIS Manager → **Sites** → **Add Website**:
   - Site name: `HRMS`
   - Physical path: `C:\Repos\hrms`
   - Binding: `http`, port `80`, hostname `hrms.altanontech.com`
2. Copy `deploy/web.config` to `C:\Repos\hrms\web.config` (it's already
   tracked in the repo at that relative path — just copy it to the site
   root if IIS doesn't pick it up automatically from `deploy/`).
3. **Required, or every login/mutation 500s**: allow the two server
   variables the rewrite rule needs to forward the real hostname (without
   this, ARR sends `x-forwarded-host: 127.0.0.1:3001` instead of the real
   host, and Next.js's Server Actions same-origin check rejects every
   request with "Invalid Server Actions request" — this bit us on the
   first deploy):
   ```powershell
   Import-Module WebAdministration
   Add-WebConfiguration -Filter "system.webServer/rewrite/allowedServerVariables" -PSPath 'MACHINE/WEBROOT/APPHOST' -Value @{name='HTTP_X_FORWARDED_HOST'}
   Add-WebConfiguration -Filter "system.webServer/rewrite/allowedServerVariables" -PSPath 'MACHINE/WEBROOT/APPHOST' -Value @{name='HTTP_X_FORWARDED_PROTO'}
   ```
   (A "duplicate collection entry" error just means it's already allowed —
   harmless.) `deploy/web.config`'s rewrite rule already sets these via
   `<serverVariables>`; this step only needs to be done once per VPS, not
   per site.

## 9. [LOCAL/GoDaddy] Point the subdomain at the VPS

Same VPS as LeadSignal, so same IP — just a new record:

1. GoDaddy → **My Products** → `altanontech.com` → **DNS** → **Add a record**
2. Type `A`, Name `hrms`, Value `<the same VPS IP crm.altanontech.com already points to>`, TTL 1 hour
3. Confirm: `[LOCAL] nslookup hrms.altanontech.com` should return the VPS IP

## 10. [VPS] HTTPS

However TLS was set up for `crm.altanontech.com` (win-acme is the common
tool for free auto-renewing Let's Encrypt certs on IIS, since certbot is
Linux-only) — add `hrms.altanontech.com` to that same tool/job so it gets
its own certificate and binding. Tell me which tool it is when you get to
this step if you're not sure how, and I'll give you the exact command.

## 11. Final checks

- [ ] Visit `https://hrms.altanontech.com` — should show the login page over HTTPS
- [ ] Log in with the seeded Super Admin, set a real password immediately
- [ ] Generate one test document and confirm the PDF renders (this exercises Puppeteer end-to-end)
- [ ] Send one test email once Azure AD mail is wired up
- [ ] Confirm `.env` is NOT web-accessible: `curl https://hrms.altanontech.com/.env` should 404
- [ ] Set up automated backups for this VPS's Postgres (pg_dump on a scheduled task — nothing is automatic by default)
- [ ] Store `PII_ENCRYPTION_KEY` and `SESSION_SECRET` somewhere outside the VPS too (password manager)

## Future updates

```powershell
[LOCAL] git push
[VPS]   cd C:\Repos\hrms && .\deploy\deploy.ps1
```
