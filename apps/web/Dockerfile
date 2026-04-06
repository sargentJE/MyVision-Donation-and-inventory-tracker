FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# Copy workspace config first for dependency layer caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/types/package.json packages/types/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile

# Copy source and build (standalone output for Docker)
COPY packages/types/ packages/types/
COPY apps/web/ apps/web/

# Set API URL for the rewrite destination (baked into standalone build)
ENV API_INTERNAL_URL=http://api:3001

RUN pnpm --filter @myvision/types build
RUN pnpm --filter web build

# --- Runtime (standalone Next.js server) ---
FROM node:20-alpine

# Run as non-root for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
WORKDIR /app

# Copy standalone server + static assets + public files
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
