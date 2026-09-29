FROM node:20-alpine AS base
# Prisma a besoin d'OpenSSL sur Alpine
RUN apk add --no-cache openssl libc6-compat

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Les variables NEXT_PUBLIC_* sont figées dans le bundle au moment du build
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public                               ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder /app/prisma                               ./prisma
COPY --from=builder /app/node_modules/.prisma                 ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma                 ./node_modules/@prisma
# CLI Prisma (version du projet) pour lancer les migrations au démarrage
COPY --from=builder /app/node_modules/prisma                  ./node_modules/prisma

# Dossier des uploads (monté en volume) accessible en écriture par l'app
RUN mkdir -p ./public/uploads/avatars && chown -R nextjs:nodejs ./public/uploads

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# Applique les migrations en attente puis démarre le serveur
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
