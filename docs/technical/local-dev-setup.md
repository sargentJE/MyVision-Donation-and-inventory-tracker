# Local Development Setup
## MyVision Equipment Tracker

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20 LTS | [nodejs.org](https://nodejs.org) or `nvm install 20` |
| pnpm | 9+ | `corepack enable && corepack prepare pnpm@latest --activate` |
| Docker + Docker Compose | Latest | [docker.com](https://docs.docker.com/get-docker/) |
| Git | Latest | Pre-installed on macOS; `brew install git` otherwise |

---

## Initial Setup

```bash
# 1. Clone the repo
git clone git@github.com:YOUR_ORG/myvision-equipment-tracker.git
cd myvision-equipment-tracker

# 2. Install dependencies (all workspaces)
pnpm install

# 3. Copy environment template
cp .env.example .env
```

Edit `.env` and fill in the required values. For local dev, these are fine as defaults:

```bash
DATABASE_URL=postgresql://myvision:myvision@localhost:5432/equipment_tracker
JWT_SECRET=local-dev-secret-change-in-production-min-32-chars
JWT_EXPIRY=60m
REFRESH_TOKEN_SECRET=local-dev-refresh-secret-also-change-me
REFRESH_TOKEN_EXPIRY=7d
SEED_ADMIN_NAME=Dev Admin
SEED_ADMIN_EMAIL=admin@localhost
SEED_ADMIN_PASSWORD=admin123
NODE_ENV=development
API_PORT=3001
WEB_PORT=3000
WEB_ORIGIN=http://localhost:3000
THROTTLE_TTL=60000
THROTTLE_LIMIT=300
CRON_SCHEDULE=0 6 * * *
POSTGRES_USER=myvision
POSTGRES_PASSWORD=myvision
POSTGRES_DB=equipment_tracker
```

---

## Start the Database

```bash
# Start Postgres only (not the full production stack)
docker compose up db -d

# Verify it's running
docker compose logs db
```

The healthcheck will confirm Postgres is ready. If you see `database system is ready to accept connections`, proceed.

---

## Run Migrations and Seed

```bash
# From the repo root:

# Generate Prisma client
pnpm --filter api prisma generate

# Run migrations (creates all tables)
pnpm --filter api prisma migrate dev

# Seed the initial admin account
pnpm --filter api prisma db seed
```

After seeding, you can log in with the credentials from `.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

---

## Start Dev Servers

```bash
# Start both API and web in dev mode (Turborepo runs both)
pnpm dev
```

This starts:
- **API** at `http://localhost:3001` (NestJS with hot reload)
- **Web** at `http://localhost:3000` (Next.js with hot reload)

Both watch for file changes. The web app proxies API calls to port 3001.

---

## Useful Commands

```bash
# Prisma Studio — visual database browser (dev only)
pnpm --filter api prisma studio

# Run backend tests
pnpm --filter api test

# Run frontend tests
pnpm --filter web test

# Run e2e tests (requires Docker Compose test environment)
docker compose -f docker-compose.test.yml up -d
pnpm --filter e2e test

# Lint all workspaces
pnpm lint

# Type-check all workspaces
pnpm type-check

# Add a new Prisma migration after schema changes
pnpm --filter api prisma migrate dev --name describe_your_change

# Reset the database (destructive — drops and recreates)
pnpm --filter api prisma migrate reset
```

---

## Importing Test Data

The `data/import-ready.csv` file contains 55 cleaned equipment records. To import after scaffolding the import CLI command:

```bash
# Dry run first
pnpm --filter api import:equipment -- --file=../../data/import-ready.csv --dry-run

# Live import
pnpm --filter api import:equipment -- --file=../../data/import-ready.csv
```

---

## Troubleshooting

**Port already in use:** kill the process on the port (`lsof -ti:3001 | xargs kill`) or change `API_PORT` / `WEB_PORT` in `.env`.

**Prisma client out of sync:** run `pnpm --filter api prisma generate` after pulling schema changes.

**Database connection refused:** ensure Docker is running and `docker compose up db -d` has completed. Check `docker compose logs db` for errors.

**Migration drift:** if your local DB is out of sync with the schema, run `pnpm --filter api prisma migrate reset` to drop and recreate. This destroys all data.
