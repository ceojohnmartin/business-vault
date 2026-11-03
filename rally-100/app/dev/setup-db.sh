#!/bin/sh
# RALLY 100 — build the LOCAL development database for app/dev/server.mjs.
# DEV ONLY: it drops and recreates the database every time.
#
#   PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres sh rally-100/app/dev/setup-db.sh
#
# Applies, in order: RALLY's Supabase shim (rally/db/test/supabase-shim.sql),
# every RALLY migration (rally/db/migrations/*.sql, which need PostGIS), the
# RALLY 100 migration (rally-100/db/migrations/1001_rally100_v1.sql) and the
# dev fixtures (app/dev/seed.sql).
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
R100="$DIR/../.."
RALLY="$DIR/../../../rally/db"
DB="${PGDATABASE:-rally100_dev}"
export PGUSER="${PGUSER:-postgres}"

# Two guards, because the first statement below is DROP DATABASE.
case "$DB" in
  *_dev) ;;
  *) echo "refusing: the database name must end in _dev (got '$DB')"; exit 1 ;;
esac
case "${PGHOST:-}" in
  *supabase.co*|*supabase.com*|*pooler*) echo "refusing: PGHOST looks like a hosted project. This script is for a local Postgres only."; exit 1 ;;
esac

PSQL="psql -X -q -v ON_ERROR_STOP=1"
$PSQL -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
$PSQL -d "$DB" -f "$RALLY/test/supabase-shim.sql" >/dev/null
for m in "$RALLY"/migrations/*.sql; do
  PGOPTIONS="-c client_min_messages=warning" $PSQL -d "$DB" -f "$m" >/dev/null
done
$PSQL -d "$DB" -f "$R100/db/migrations/1001_rally100_v1.sql" >/dev/null
$PSQL -d "$DB" -f "$DIR/seed.sql" >/dev/null
echo "ready: $DB (shim + $(ls "$RALLY"/migrations/*.sql | wc -l | tr -d ' ') RALLY migrations + 1001 + dev seed)"
echo "next:  PGDATABASE=$DB node rally-100/app/dev/server.mjs"
