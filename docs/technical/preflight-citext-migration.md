# Preflight runbook — `email_citext` migration

Operator runbook for the pre-deploy checks that gate the
`feat(api): case-insensitive email login with citext migration` commit.

Run this before pushing the auth commit to `main` (which auto-deploys via
Coolify and runs the Prisma migration on container start).

**Related files:**

- Script: [`scripts/preflight-citext-migration.sh`](../../scripts/preflight-citext-migration.sh)
- Migration: [`apps/api/prisma/migrations/20260407120000_email_citext/migration.sql`](../../apps/api/prisma/migrations/20260407120000_email_citext/migration.sql)
- Plan: `~/.claude/plans/toasty-snacking-elephant.md`

---

## TL;DR

```bash
# 1. Copy the script to the VPS (run on laptop, from repo root)
scp scripts/preflight-citext-migration.sh root@95.217.20.121:/tmp/

# 2. SSH in
ssh root@95.217.20.121

# 3. Confirm container names still match (Coolify rebuilds change the suffix)
docker ps --format '{{.Names}}' | grep -E '^(db|db-backup)-susqianl7o2xmumzot1bvz28'

# 4. Confirm DB name + app user (only needed first time)
docker exec db-susqianl7o2xmumzot1bvz28-214648620793 \
  env | grep -E 'POSTGRES_(DB|USER)'

# 5. Run the preflight
DB_CONTAINER='db-susqianl7o2xmumzot1bvz28-214648620793' \
BACKUP_CONTAINER='db-backup-susqianl7o2xmumzot1bvz28-214648644249' \
DB_NAME='equipment_tracker' \
bash /tmp/preflight-citext-migration.sh
```

> **Confirmed values (verified 2026-04-07):**
> - `POSTGRES_DB=equipment_tracker` (override needed — script default is `myvision`)
> - `POSTGRES_USER=myvision` (matches script default — no override needed)

A green `✅ Safe to push` line means it's safe to push the auth commit.
A red `❌ Stop` line means do not push — fix the failing checks and rerun.

> ⚠️ **Container names contain a Coolify deployment-id suffix that changes
> on every redeploy.** The names baked into this runbook were captured on
> 2026-04-07. Step 3 of the TL;DR re-confirms them; if `grep` returns
> nothing, run `docker ps --format 'table {{.Names}}\t{{.Image}}'` and find
> the new `db-…` and `db-backup-…` entries (image will be `postgres:16`).

---

## Phase 1 — Copy the script to the VPS

Run from your **laptop**, in the project directory:

```bash
cd /Users/jamiesargent/MyVision-Inventory-tracker
scp scripts/preflight-citext-migration.sh root@95.217.20.121:/tmp/
```

Verify it landed:

```bash
ssh root@95.217.20.121 'ls -l /tmp/preflight-citext-migration.sh'
```

Expected output (executable bit must be preserved):

```
-rwxr-xr-x 1 root root <size> <date> /tmp/preflight-citext-migration.sh
```

---

## Phase 2 — SSH in and verify container names

```bash
ssh root@95.217.20.121
```

The MyVision stack on this VPS uses the Coolify project ID
`susqianl7o2xmumzot1bvz28`. Confirm the two containers we need are still
running with the names this runbook expects:

```bash
docker ps --format '{{.Names}}' | grep -E '^(db|db-backup)-susqianl7o2xmumzot1bvz28'
```

Expected output (the trailing numeric suffix is the per-deploy ID and
**will change every time Coolify rebuilds the API or DB**):

```
db-backup-susqianl7o2xmumzot1bvz28-214648644249
db-susqianl7o2xmumzot1bvz28-214648620793
```

If `grep` returns nothing or only one line, the suffix has changed since
this runbook was last updated. Find the current names with:

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' | grep -E 'db.*postgres:16|coollabsio'
```

Pick the two `postgres:16` containers whose names start with `db-` and
`db-backup-` (ignore `coolify-db`, `compreface-postgres-db`, and any
other unrelated databases). Substitute them everywhere in Phase 3 below.

Now confirm the database name and app user that Coolify provisioned:

```bash
docker exec db-susqianl7o2xmumzot1bvz28-214648620793 \
  env | grep -E 'POSTGRES_(DB|USER)'
```

Confirmed values on the production VPS as of 2026-04-07:

```
POSTGRES_DB=equipment_tracker
POSTGRES_USER=myvision
```

The script's defaults are `myvision`/`myvision`, so on this VPS you must
override `DB_NAME=equipment_tracker` in Phase 3. `DB_USER` matches the
default and can be omitted.

---

## Phase 3 — Run the preflight script

Still in the SSH session. Canonical command for this VPS:

```bash
DB_CONTAINER='db-susqianl7o2xmumzot1bvz28-214648620793' \
BACKUP_CONTAINER='db-backup-susqianl7o2xmumzot1bvz28-214648644249' \
DB_NAME='equipment_tracker' \
bash /tmp/preflight-citext-migration.sh
```

**If the deployment-id suffix changed** (Phase 2 grep returned nothing),
substitute the new container names but keep `DB_NAME='equipment_tracker'`
and the script-default `DB_USER=myvision`.

---

## What a green run looks like

```
────────────────────────────────────────────────────────────────────────
MyVision preflight — citext migration
Run at:        2026-04-07T14:23:11Z
DB container:  db-susqianl7o2xmumzot1bvz28-214648620793
DB:            equipment_tracker (as user myvision)
Backup ctr:    db-backup-susqianl7o2xmumzot1bvz28-214648644249
────────────────────────────────────────────────────────────────────────

[1/3] Duplicate-email audit
    expects: 0 rows returned
  ✓ no duplicate emails

[2/3] citext extension installable as app user
    expects: success or 'already exists'
  ✓ citext extension available

[3/3] Recent DB backup (within last 26h)
    expects: at least one backup file newer than threshold
    newest:  /backups/myvision-2026-04-07.sql.gz
    size:    4521378 bytes
    age:     6h
  ✓ backup within 26h and non-trivial size

────────────────────────────────────────────────────────────────────────
Preflight result: 3 passed, 0 failed
────────────────────────────────────────────────────────────────────────
✅ Safe to push the auth commit.
```

**Copy the entire output and paste it back to Claude** — including the header
lines so the container names used are visible.

---

## What to do if a check fails

**Don't try to fix anything yourself yet.** Paste the failure output to
Claude and wait for instructions. The most common cases:

### Check 1 fails — "duplicate emails found"

Two existing user rows will collide on `lower(email)` once the column
becomes `citext`. The script prints the colliding rows. Claude will write
the safe dedupe SQL based on which rows collided.

### Check 2 fails — "permission denied"

The app DB user can't run `CREATE EXTENSION`. Run this once as the
postgres superuser:

```bash
docker exec -u postgres db-susqianl7o2xmumzot1bvz28-214648620793 \
  psql -d equipment_tracker -c "CREATE EXTENSION IF NOT EXISTS citext;"
```

(Substitute the container name if the deployment-id suffix changed since
this runbook was last verified — see the Phase 2 grep.)

After it runs, **rerun the preflight script** (Phase 3). Check 2 should
now pass — the migration's own `CREATE EXTENSION IF NOT EXISTS` becomes a
safe no-op once the extension exists.

### Check 3 fails — "backup too old" / "empty" / "container not running"

The daily `db-backup` sidecar hasn't run or is broken. Trigger a manual
backup before deploying. The exact command depends on how `db-backup` is
configured — check `docker logs <backup-container-name>` for the dump
command it normally runs, or invoke `pg_dump` directly:

```bash
docker exec db-susqianl7o2xmumzot1bvz28-214648620793 \
  pg_dump -U myvision equipment_tracker \
  | gzip > /tmp/equipment-tracker-manual-$(date +%Y%m%d-%H%M).sql.gz
ls -lh /tmp/equipment-tracker-manual-*.sql.gz
```

Then rerun the preflight script. Check 3 will probably still fail because
the manual backup isn't in the `/backups` directory inside the backup
container — but you now have a known-good snapshot on the host. Tell
Claude this is what you did and it'll proceed.

### Exit code 2 — "CONFIG not set"

You forgot the env-var prefix. Re-run with the `DB_CONTAINER='...'` and
`BACKUP_CONTAINER='...'` prefix.

---

## Exit codes

| Code | Meaning |
|---|---|
| `0` | All checks passed — safe to push the auth commit |
| `1` | One or more checks failed — do not push |
| `2` | Misconfigured — `DB_CONTAINER` or `BACKUP_CONTAINER` not set |

---

## Next step after a green run

Paste the green output back to Claude. Claude will then create the three
local commits per the plan and hand back the exact `git push` command(s)
for you to run.
