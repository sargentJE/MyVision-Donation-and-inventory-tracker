# Deployment Runbook
## MyVision Equipment Tracker — Coolify on Hetzner

_Date: 2 April 2026 (updated 6 April 2026)_
_Status: Ready — code complete, repo pushed, awaiting infrastructure setup_

---

## 1. Infrastructure Overview

| Component | Provider | Detail |
|---|---|---|
| VPS | Hetzner Cloud | Existing server, Coolify already installed |
| PaaS | Coolify | Handles builds, deploys, SSL, reverse proxy (Traefik) |
| Source | GitHub | Public repo (`sargentJE/MyVision-Donation-and-inventory-tracker`) |
| Database | PostgreSQL 16 | Docker container managed by Coolify |
| Backup | Hetzner Automated Backups + pg_dump cron | Server-level + application-level |
| SSL | Let's Encrypt via Coolify/Traefik | Automatic renewal |
| Monitoring | UptimeRobot (free tier) | 5-minute ping |

---

## 2. Deployment Strategy: Docker Compose via GitHub

**Recommended approach:** Connect the GitHub repo to Coolify and deploy via the `docker-compose.yml` in the repo root. This gives you:

- Push to `main` → Coolify auto-builds and redeploys all services
- Coolify manages the Traefik reverse proxy and Let's Encrypt SSL
- Environment variables are set in Coolify's UI, not in the repo
- No manual SSH needed for routine deploys
- Rollback by redeploying a previous commit in Coolify's UI

### Why Docker Compose over individual services

This project has three interdependent services (API, web, database). Docker Compose keeps them defined as a single stack with health checks and dependency ordering. Coolify's Docker Compose support handles this cleanly without needing to configure three separate Coolify services and manage their networking manually.

---

## 3. Initial Setup

### 3.1 Prerequisites

- Hetzner VPS with Coolify running
- GitHub repo with the Equipment Tracker codebase
- Domain DNS configured (A record pointing to VPS IP)
- Coolify admin access

### 3.2 Connect GitHub Repo

1. In Coolify: **Sources** → **Add New Source** → **GitHub App**
2. Authorise Coolify to access the repo
3. Create a new **Project** in Coolify (e.g. "MyVision Equipment Tracker")
4. Add a new **Resource** → **Docker Compose** → select the GitHub repo
5. Set the branch to `main`
6. Set the compose file path to `docker-compose.yml`

### 3.3 Configure Environment Variables

In Coolify's resource settings, add all variables from the `.env.example`:

```
DATABASE_URL=postgresql://myvision:STRONG_PASSWORD_HERE@db:5432/equipment_tracker
JWT_SECRET=                     # min 32 chars, generate with: openssl rand -hex 32
JWT_EXPIRY=60m
REFRESH_TOKEN_SECRET=           # different from JWT_SECRET
REFRESH_TOKEN_EXPIRY=7d
SEED_ADMIN_NAME=Jamie Sargent
SEED_ADMIN_EMAIL=               # your admin email
SEED_ADMIN_PASSWORD=            # change immediately after first login
NODE_ENV=production
API_PORT=3001
WEB_PORT=3000
POSTGRES_USER=myvision
POSTGRES_PASSWORD=              # same as in DATABASE_URL
POSTGRES_DB=equipment_tracker
CRON_SCHEDULE=0 6 * * *
```

Generate secrets:
```bash
openssl rand -hex 32   # for JWT_SECRET
openssl rand -hex 32   # for REFRESH_TOKEN_SECRET
```

### 3.4 Configure Domain and SSL

1. In Coolify's resource settings, set the domain (e.g. `equipment.myvision.org.uk`)
2. Coolify will automatically provision a Let's Encrypt certificate via Traefik
3. Ensure the DNS A record points to the Hetzner VPS IP

### 3.5 First Deploy

1. Trigger a deploy in Coolify (or push to `main`)
2. Coolify builds the Docker images and starts the stack
3. The API container entrypoint runs `prisma migrate deploy` then `prisma db seed`
4. The seed script creates the initial Admin account
5. Verify: navigate to the domain → login screen should appear

### 3.6 Post-Deploy Checklist

- [x] Login with seed credentials
- [x] Change seed admin password immediately
- [x] Verify dashboard loads
- [x] Run CSV import (see §3.7 below)
- [x] Verify item count: 55 imported
- [ ] Set up UptimeRobot ping on `https://equipment.sightkick.co.uk/api/health`

### 3.7 CSV Import Procedure

Data files are gitignored (may contain PII). Transfer and import via docker exec:

```bash
# From local machine — copy CSV to VPS
scp data/import-ready.csv root@<VPS-IP>:/tmp/

# SSH into VPS
ssh root@<VPS-IP>

# Copy CSV into API container + install curl
CONTAINER=$(docker ps -qf "name=api" | head -1)
docker cp /tmp/import-ready.csv $CONTAINER:/tmp/
docker exec -u root $CONTAINER apk add --no-cache curl

# Login + dry-run
docker exec $CONTAINER sh -c '
  curl -s -c /tmp/c.txt -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"<ADMIN_EMAIL>\",\"password\":\"<ADMIN_PASSWORD>\"}" > /dev/null && \
  curl -s -b /tmp/c.txt -X POST "http://localhost:3001/api/equipment/import" \
    -F "file=@/tmp/import-ready.csv"
'
# Verify: {"data":{"dryRun":true,"totalRows":55,"validRows":55,...}}

# Live import
docker exec $CONTAINER sh -c '
  curl -s -c /tmp/c.txt -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"<ADMIN_EMAIL>\",\"password\":\"<ADMIN_PASSWORD>\"}" > /dev/null && \
  curl -s -b /tmp/c.txt -X POST "http://localhost:3001/api/equipment/import" \
    -F "file=@/tmp/import-ready.csv" -F "dryRun=false"
'
# Verify: {"data":{"dryRun":false,...,"importedCount":55}}
```

---

## 4. Routine Deployments

### Code changes

1. Push to `main` (or merge a PR)
2. Coolify detects the change and auto-deploys
3. The API container runs `prisma migrate deploy` on startup — any pending migrations apply automatically
4. Monitor the deploy log in Coolify's UI

### Database migrations

Migrations are version-controlled in `apps/api/prisma/migrations/`. They run automatically on every deploy via the container entrypoint. No manual SSH needed.

**Before deploying a migration that modifies existing data:**
1. Take a manual backup first (see §5)
2. Test the migration locally against a copy of production data
3. Deploy during low-usage hours

### Rollback

1. In Coolify: go to the resource → **Deployments** tab
2. Select a previous successful deployment
3. Click **Redeploy**

If the rollback involves a database migration, you'll need to restore from backup — Prisma does not support automatic down migrations.

---

## 5. Backup Strategy

### Server-level: Hetzner Automated Backups

Enable Hetzner's automated backup feature on the VPS. This snapshots the entire server (including Docker volumes where Postgres data lives) on a daily schedule.

**Cost:** ~20% of the server price (typically €1-3/month).

**To enable:** Hetzner Cloud Console → server → **Backups** → **Enable**.

This is the cheapest offsite-equivalent option — Hetzner stores the snapshots in their infrastructure, separate from the VPS itself. If the VPS is destroyed, you can restore from the latest snapshot.

### Application-level: pg_dump cron

For finer-grained database recovery (e.g. restore to a specific day without rolling back the whole server), add a pg_dump cron inside the docker-compose stack:

```yaml
# Add to docker-compose.yml
  db-backup:
    image: postgres:16
    depends_on: [db]
    volumes:
      - db-backups:/backups
    entrypoint: /bin/sh
    command: >
      -c "while true; do
        PGPASSWORD=$$POSTGRES_PASSWORD pg_dump -h db -U $$POSTGRES_USER $$POSTGRES_DB
          | gzip > /backups/equipment_$$(date +%Y-%m-%d_%H%M).sql.gz;
        find /backups -name '*.sql.gz' -mtime +7 -delete;
        sleep 86400;
      done"
    env_file: .env

volumes:
  db-backups:
```

This creates a daily gzipped dump and retains 7 days of backups on the local Docker volume (which is itself captured by Hetzner's server backup).

### Restore from pg_dump

```bash
# SSH into VPS, then:
docker exec -i equipment-tracker-db-1 \
  psql -U myvision -d equipment_tracker \
  < /path/to/backup.sql.gz | gunzip
```

### Restore from Hetzner Snapshot

1. Hetzner Cloud Console → server → **Backups**
2. Select snapshot → **Restore** (replaces entire VPS)
3. Or: create a new server from the snapshot, extract the data, and migrate

---

## 6. Monitoring

### UptimeRobot

- Create a free HTTP(s) monitor
- URL: `https://equipment.myvision.org.uk`
- Interval: 5 minutes
- Alert contacts: Jamie's email

### Coolify Logs

Coolify provides real-time logs for each service. Access via: **Resource** → **Logs** tab.

### Docker Logs (if SSH is needed)

```bash
docker compose logs api --tail 100 -f    # API logs
docker compose logs web --tail 100 -f    # Frontend logs
docker compose logs db --tail 100 -f     # Database logs
```

---

## 7. Domain Setup (When Ready)

When the domain is decided:

1. Add an A record in the DNS provider: `equipment.myvision.org.uk → [VPS IP]`
2. Set the domain in Coolify's resource settings
3. Coolify auto-provisions SSL
4. Update `WEB_ORIGIN` env var to `https://equipment.myvision.org.uk`
5. Add the domain to the Adobe Typekit kit allowlist (for Futura PT fonts)
