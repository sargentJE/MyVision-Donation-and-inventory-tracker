# MyVision Equipment Tracker

Self-hosted inventory management system for MyVision Oxfordshire — a charity supporting blind and visually impaired people. Tracks assistive technology equipment through its full lifecycle: acquisition, loans, demo visits, allocations, and decommissioning.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| Backend | NestJS 10, TypeScript (strict) |
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui |
| Database | PostgreSQL 16, Prisma 5 ORM |
| Auth | Cookie-based JWT + refresh token rotation |
| Shared | @myvision/types (enums + Zod schemas) |

## Quick Start

**Prerequisites:** Node.js >=20, pnpm >=9, Docker

```bash
# 1. Install dependencies
pnpm install

# 2. Start database, migrate, and seed
cp .env.example .env   # then fill in JWT_SECRET and REFRESH_TOKEN_SECRET
docker compose up db -d
pnpm --filter api prisma migrate dev --name init
pnpm --filter api prisma db seed

# 3. Start development servers
pnpm dev
```

API runs on `http://localhost:3001/api`, frontend on `http://localhost:3000`.

Default login: `admin@localhost` / `admin123` (change immediately via Settings).

## Project Structure

```
apps/
  api/          NestJS backend — 14 modules, 64 endpoints
  web/          Next.js frontend — 15 pages, 13 hooks
packages/
  types/        Shared TypeScript enums + Zod schemas
docs/           Comprehensive project documentation
assets/         Brand assets (logos, favicons)
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers (API + web) |
| `pnpm build` | Build all packages |
| `pnpm type-check` | TypeScript type-check across all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |

## Documentation

See [`docs/`](./docs/) for comprehensive documentation:

- [PRD](./docs/PRD.md) — product requirements
- [Implementation Plan](./docs/IMPLEMENTATION-PLAN.md) — build phases and checklists
- [API Reference](./docs/technical/api-reference.md) — all 64 endpoints
- [Frontend Architecture](./docs/technical/frontend-architecture.md) — component patterns
- [Accessibility Guide](./docs/ACCESSIBILITY.md) — WCAG 2.2 AA compliance
- [Brand Guide](./docs/brand-guide.md) — colours, logos, typography
- [Local Dev Setup](./docs/technical/local-dev-setup.md) — detailed setup guide
- [Contributing](./CONTRIBUTING.md) — conventions and patterns
