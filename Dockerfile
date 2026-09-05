# Production image for Altanon HRMS.
#
# Uses a Debian-based Node image (not Alpine) because Puppeteer/Chromium has a long history of
# musl-libc compatibility problems on Alpine — Debian avoids that entirely. Chromium is installed
# as a system package rather than letting Puppeteer download its own copy, which is smaller and
# more reliable in a container (apt's build is already tuned for this OS/arch).

# ---- deps: install node_modules once, cached across builds ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: generate Prisma client and build the Next.js app ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runner: minimal final image ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# System Chromium + the shared libraries it needs at runtime (this list is the well-documented
# minimum for headless Chromium on Debian — trimming it causes cryptic "error while loading shared
# libraries" failures at PDF-generation time, not at container start, so don't shorten it).
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxkbcommon0 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user — Chromium runs fine unprivileged since the app already launches it with
# --no-sandbox (see src/lib/pdf/renderToPdf.ts); this just keeps the rest of the container from
# running as root, which --no-sandbox otherwise makes a meaningfully worse trade-off.
RUN groupadd --gid 1001 nodejs && useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Generated documents/payslips/Form 16 PDFs land here — mount a persistent volume at this path,
# or point the app at object storage instead (see DEPLOYMENT.md); without one, files are lost on
# every redeploy and aren't shared across replicas.
RUN mkdir -p /app/storage && chown -R nextjs:nodejs /app/storage
VOLUME ["/app/storage"]

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
