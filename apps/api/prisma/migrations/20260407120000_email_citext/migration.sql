-- Email case-insensitivity migration
--
-- PRE-MIGRATION AUDIT — run this against prod FIRST, abort deploy if any rows are returned:
--   SELECT lower(email) AS e, COUNT(*) FROM "users" GROUP BY lower(email) HAVING COUNT(*) > 1;
-- If duplicates exist, merge or rename them before applying this migration,
-- otherwise the ALTER to CITEXT will fail on the unique index.
--
-- EXTENSION PERMISSION NOTE — `CREATE EXTENSION citext` typically requires superuser
-- on vanilla Postgres. If the app DB user cannot create extensions, run once as the
-- postgres superuser before deploy:
--   docker exec -u postgres db psql -d myvision -c "CREATE EXTENSION IF NOT EXISTS citext;"
-- The IF NOT EXISTS below then becomes a safe no-op.
--
-- ROLLBACK:
--   ALTER TABLE "users" ALTER COLUMN email TYPE text;
-- Take a DB backup before running.

CREATE EXTENSION IF NOT EXISTS citext;

-- Lowercase any existing rows so the UNIQUE index survives the type change.
-- Idempotent: re-running on already-lowercase rows is a no-op.
UPDATE "users" SET email = lower(email) WHERE email <> lower(email);

ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE CITEXT;
