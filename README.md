# Altanon HRMS

Internal HR management system for Altanon AI Works Pvt Ltd — employee records, company hierarchy, role-based logins, offer/internship/relieving/experience/appointment letters (generated as branded PDFs and emailed directly to candidates/employees), payroll and payslips, Form 16, leave, and attendance.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · PostgreSQL · Prisma · Tailwind + shadcn/ui (Base UI) · Puppeteer (PDF rendering) · Microsoft Graph (mail) · argon2 (passwords)

## First-time setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start PostgreSQL.** This project was set up against a local Homebrew Postgres:

   ```bash
   brew services start postgresql@16
   ```

   The database `altanon_hrms` and role `hrms_app` already exist locally. If setting up fresh elsewhere, create them and update `DATABASE_URL` in `.env`.

3. **Environment variables.** Copy `.env.example` to `.env` if you don't already have one, and fill in real values. At minimum for local dev, `DATABASE_URL`, `SESSION_SECRET`, and `PII_ENCRYPTION_KEY` must be set (generate secrets with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). The `AZURE_*` variables are only needed once Microsoft Graph mail is wired up — see below.

4. **Run migrations and seed data**

   ```bash
   npx prisma migrate dev
   npm run db:seed
   ```

   The seed script creates all permissions, the five system roles (Super Admin, HR Admin, Manager, Finance, Employee), a default company profile pre-filled with Altanon's CIN and registered address, default departments/designations, salary components, statutory config for the current and prior financial year, leave types, the five document templates, and a Super Admin login (email `akashnehe1999@gmail.com`, printed temporary password shown in the seed output — you'll be forced to change it on first login).

5. **Run the app**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`.

## Replacing the placeholder logo

`public/brand/logo.svg` is currently a placeholder recreation of the arrow-"A" mark, since I couldn't extract the exact image file you pasted into chat. Drop your real logo file at that same path (SVG preferred; keep the filename `logo.svg`) to have it appear across the app UI and on every generated PDF letterhead.

## Connecting the official mailbox (Microsoft 365)

The "Send by Email" button on generated documents won't work until your Microsoft 365 admin completes an Azure AD app registration:

1. Azure Portal → Azure AD → App registrations → New registration.
2. Note the **Application (client) ID** and **Directory (tenant) ID**.
3. Certificates & Secrets → new client secret (expires in 6–24 months — set a renewal reminder).
4. API permissions → Microsoft Graph → **Application permissions** → add `Mail.Send` → grant admin consent.
5. In Exchange Online PowerShell, scope the app to only the HR mailbox so it can't send as anyone else in the tenant:
   ```powershell
   New-ApplicationAccessPolicy -AppId <client-id> -PolicyScopeGroupId hr@altanontech.com -AccessRight RestrictAccess -Description "Altanon HRMS mail scope"
   ```
6. Put the three values into `.env`: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, and set `MAIL_SENDER_ADDRESS` to the sending mailbox.

Until this is done, document generation and every other feature works normally — only the actual send fails, with a clear in-app error explaining why.

## Compliance notes (also shown in-app)

- **Form 16 Part A** cannot be produced by this or any private app — it only comes from the government TRACES portal after quarterly TDS returns are filed. The app generates **Part B** and lets you upload the real Part A once you have it, merging the two into one PDF.
- **PF/Professional Tax/TDS settings** (under Payroll → Statutory Config) are seeded with reasonable FY defaults but must be reviewed by a CA before running real payroll — rates and slabs change every Finance Act.

## Useful scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (also type-checks everything) |
| `npm run db:migrate` | Create/apply a Prisma migration |
| `npm run db:seed` | Re-run the seed script (safe to re-run — upserts) |
| `npm run db:studio` | Open Prisma Studio to browse the database |

## Deploying later

Puppeteer needs real Chromium, which rules out plain Vercel/Netlify serverless functions. When ready to deploy, target a containerized host (Railway, Render, or a VPS running Docker) instead.
