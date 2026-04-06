FROM node:20-alpine AS builder

# Build dependencies for native modules (bcrypt, Prisma engines)
RUN apk add --no-cache openssl python3 make g++
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy workspace config first for dependency layer caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/types/package.json packages/types/
COPY apps/api/package.json apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Rebuild bcrypt native module for Alpine/Linux (musl)
# pnpm rebuild alone doesn't trigger node-pre-gyp; explicit rebuild required
RUN cd /app/node_modules/.pnpm/bcrypt@5.1.1/node_modules/bcrypt && npx node-pre-gyp rebuild

# Copy source and build
COPY packages/types/ packages/types/
COPY apps/api/ apps/api/
RUN pnpm --filter @myvision/types build
RUN cd apps/api && npx prisma generate
RUN pnpm --filter api build

# --- Runtime ---
FROM node:20-alpine

RUN apk add --no-cache openssl

# Run as non-root for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
WORKDIR /app

# Copy full workspace (pnpm symlinks require root .pnpm store)
COPY --from=builder --chown=nestjs:nodejs /app ./

USER nestjs
WORKDIR /app/apps/api

EXPOSE 3001

# migrate → seed (idempotent) → start with signal forwarding
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && exec node dist/main"]
