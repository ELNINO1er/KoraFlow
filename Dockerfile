# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM dependencies AS builder
COPY . .
# Valeurs factices utilisées uniquement pour générer Prisma et compiler. Les
# secrets réels sont injectés au démarrage du conteneur final.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV APP_URL="https://build.invalid"
ENV BETTER_AUTH_URL="https://build.invalid"
ENV BETTER_AUTH_SECRET="build-only-secret-with-at-least-32-characters"
ENV SMTP_HOST="build.invalid"
ENV SMTP_PORT="587"
ENV EMAIL_FROM="KoraFlow <build@build.invalid>"
ENV STORAGE_DRIVER="local"
ENV PRIVATE_UPLOAD_DIR="/app/uploads"
RUN npx prisma generate
RUN npm run build

# Cible dédiée aux migrations. Elle n'est pas utilisée pour servir le trafic.
FROM dependencies AS migrator
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs \
  && mkdir -p /app/uploads \
  && chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
