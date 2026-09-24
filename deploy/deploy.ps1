# Pulls the latest code, updates dependencies, applies new DB migrations,
# rebuilds, and restarts the app service. Run this on the VPS from inside
# the repo folder (as of this writing: C:\Repos\hrms) whenever you ship a
# change — see deploy/README.md for the one-time initial setup this
# assumes is already done (NSSM service "HRMSApp", IIS site "HRMS").
$ErrorActionPreference = "Stop"

Write-Host "==> Pulling latest code"
git pull

Write-Host "==> Installing dependencies"
npm install

Write-Host "==> Applying any new DB migrations"
npx prisma migrate deploy

Write-Host "==> Regenerating Prisma client"
npx prisma generate

Write-Host "==> Building"
npm run build

Write-Host "==> Restarting app service"
C:\nssm-2.24\win64\nssm.exe restart HRMSApp

Write-Host "==> Done. Tail logs with: Get-Content <nssm AppStdout path> -Wait  (or check via services.msc)"
