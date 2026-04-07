#!/usr/bin/env bash
#
# preflight-citext-migration.sh
#
# Pre-deploy preflight for the email_citext Prisma migration
# (apps/api/prisma/migrations/20260407120000_email_citext/migration.sql).
#
# Run this on the production VPS BEFORE pushing the auth commit. It checks
# the three things that can make the ALTER TABLE ... TYPE CITEXT fail or
# corrupt data:
#
#   1. No two existing rows would collide once compared case-insensitively.
#   2. The app DB user can CREATE EXTENSION citext (or it's already installed).
#   3. A recent DB backup exists in case the migration needs rolling back.
#
# Usage:
#   ssh root@<vps>
#   # Find the container names once:
#   docker ps --format '{{.Names}}'
#   # Edit the four CONFIG vars below, then:
#   bash /tmp/preflight-citext-migration.sh
#
# Exit code: 0 if all checks pass (safe to push the auth commit),
#            1 if any check fails (do not push — fix and rerun).
#
# Owner: see /Users/jamiesargent/.claude/plans/toasty-snacking-elephant.md
# Related: apps/api/prisma/migrations/20260407120000_email_citext/migration.sql
# ─────────────────────────────────────────────────────────────────────────────

set -uo pipefail

# ─── CONFIG — set these before running ───────────────────────────────────────
DB_CONTAINER="${DB_CONTAINER:-<paste db container name here>}"
DB_NAME="${DB_NAME:-myvision}"
DB_USER="${DB_USER:-myvision}"          # the *app* user, not postgres
BACKUP_CONTAINER="${BACKUP_CONTAINER:-<paste db-backup container name here>}"
BACKUP_MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-26}"
# ─────────────────────────────────────────────────────────────────────────────

PASS=0
FAIL=0

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; PASS=$((PASS + 1)); }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; FAIL=$((FAIL + 1)); }
note() { printf '    %s\n' "$1"; }
hr()   { printf -- '─%.0s' {1..72}; printf '\n'; }

require_config() {
  local missing=0
  if [[ "$DB_CONTAINER" == *"<paste"* ]]; then
    fail "DB_CONTAINER not set — edit the script or export DB_CONTAINER=..."
    missing=1
  fi
  if [[ "$BACKUP_CONTAINER" == *"<paste"* ]]; then
    fail "BACKUP_CONTAINER not set — edit the script or export BACKUP_CONTAINER=..."
    missing=1
  fi
  if [[ $missing -eq 1 ]]; then
    echo
    echo "Hint: docker ps --format '{{.Names}}'"
    exit 2
  fi
}

hr
echo "MyVision preflight — citext migration"
echo "Run at:        $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "DB container:  $DB_CONTAINER"
echo "DB:            $DB_NAME (as user $DB_USER)"
echo "Backup ctr:    $BACKUP_CONTAINER"
hr

require_config

# ─── Check 1 — duplicate-email audit ─────────────────────────────────────────
echo
echo "[1/3] Duplicate-email audit"
note "expects: 0 rows returned"
DUP_OUT=$(
  docker exec -i "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -tA -c \
    "SELECT lower(email) AS e, COUNT(*) FROM \"users\" GROUP BY lower(email) HAVING COUNT(*) > 1;" \
    2>&1
)
DUP_RC=$?

if [[ $DUP_RC -ne 0 ]]; then
  fail "psql failed (rc=$DUP_RC)"
  note "$DUP_OUT"
elif [[ -z "${DUP_OUT// /}" ]]; then
  pass "no duplicate emails"
else
  fail "duplicate emails found — dedupe before pushing the auth commit:"
  while IFS= read -r line; do note "$line"; done <<< "$DUP_OUT"
fi

# ─── Check 2 — citext extension probe ────────────────────────────────────────
echo
echo "[2/3] citext extension installable as app user"
note "expects: success or 'already exists'"
CITEXT_OUT=$(
  docker exec -i "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -tA -c \
    "CREATE EXTENSION IF NOT EXISTS citext;" \
    2>&1
)
CITEXT_RC=$?

if [[ $CITEXT_RC -eq 0 ]]; then
  pass "citext extension available"
elif echo "$CITEXT_OUT" | grep -qiE "permission denied|must be (owner|superuser)"; then
  fail "permission denied — citext needs to be installed as superuser first."
  note "Run this once, then rerun this script:"
  note ""
  note "  docker exec -u postgres $DB_CONTAINER \\"
  note "    psql -d $DB_NAME -c \"CREATE EXTENSION IF NOT EXISTS citext;\""
  note ""
  note "After that runs, the migration's own CREATE EXTENSION IF NOT EXISTS"
  note "is a safe no-op."
else
  fail "unexpected error (rc=$CITEXT_RC)"
  note "$CITEXT_OUT"
fi

# ─── Check 3 — recent backup ─────────────────────────────────────────────────
echo
echo "[3/3] Recent DB backup (within last ${BACKUP_MAX_AGE_HOURS}h)"
note "expects: at least one backup file newer than threshold"

if ! docker ps --format '{{.Names}}' | grep -qx "$BACKUP_CONTAINER"; then
  fail "backup container '$BACKUP_CONTAINER' not running"
else
  # List the freshest file in /backups (most recently modified) with epoch ts.
  BACKUP_INFO=$(
    docker exec -i "$BACKUP_CONTAINER" sh -c '
      latest=$(ls -t /backups 2>/dev/null | head -1)
      if [ -z "$latest" ]; then
        echo "EMPTY"
        exit 0
      fi
      # busybox stat: %Y is mtime epoch, %s is size
      stat -c "%Y %s %n" "/backups/$latest" 2>/dev/null \
        || stat -f "%m %z %N" "/backups/$latest"
    ' 2>&1
  )

  if [[ "$BACKUP_INFO" == "EMPTY" ]]; then
    fail "/backups is empty inside $BACKUP_CONTAINER"
  elif [[ -z "$BACKUP_INFO" ]]; then
    fail "could not stat backup files: $BACKUP_INFO"
  else
    BACKUP_MTIME=$(echo "$BACKUP_INFO" | awk '{print $1}')
    BACKUP_SIZE=$(echo "$BACKUP_INFO" | awk '{print $2}')
    BACKUP_NAME=$(echo "$BACKUP_INFO" | awk '{print $3}')
    NOW=$(date +%s)
    AGE_SECS=$((NOW - BACKUP_MTIME))
    AGE_HOURS=$((AGE_SECS / 3600))

    note "newest:  $BACKUP_NAME"
    note "size:    $BACKUP_SIZE bytes"
    note "age:     ${AGE_HOURS}h"

    if (( AGE_HOURS > BACKUP_MAX_AGE_HOURS )); then
      fail "backup is older than ${BACKUP_MAX_AGE_HOURS}h — trigger a fresh backup before deploying"
    elif (( BACKUP_SIZE < 1024 )); then
      fail "backup is suspiciously small (${BACKUP_SIZE} bytes) — investigate before deploying"
    else
      pass "backup within ${BACKUP_MAX_AGE_HOURS}h and non-trivial size"
    fi
  fi
fi

# ─── Result ──────────────────────────────────────────────────────────────────
echo
hr
printf 'Preflight result: %d passed, %d failed\n' "$PASS" "$FAIL"
hr

if [[ $FAIL -eq 0 ]]; then
  printf '\033[32m✅ Safe to push the auth commit.\033[0m\n'
  exit 0
else
  printf '\033[31m❌ Stop. Fix the failing checks before pushing the auth commit.\033[0m\n'
  exit 1
fi
