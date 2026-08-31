#!/bin/sh
# RALLY Phase 1 — proves the schema's Row Level Security on a throwaway
# local PostgreSQL database. Point it at any dev cluster:
#
#   PGHOST=/tmp/pg-rls PGPORT=5544 sh rally/db/test/run-rls-tests.sh
#
# It creates (and drops) a database named rally_rls_test, applies the
# Supabase shim + the 0001 migration, then runs every RLS check. Any
# failing check aborts with a non-zero exit.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DB=rally_rls_test
export PGUSER="${PGUSER:-postgres}"

psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" \
     -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../migrations/0001_phase1_foundation.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../migrations/0002_realtime_doorbell.sql"
OUT="$(psql -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/rls-test.sql" 2>&1)" || {
  echo "$OUT" | tail -20; echo "RLS: FAILED"; exit 1;
}
echo "$OUT" | grep -o "PASS: .*"
N="$(echo "$OUT" | grep -c "PASS: ")"
echo "RLS: ALL GREEN ($N checks)"
