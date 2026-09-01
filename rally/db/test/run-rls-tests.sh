#!/bin/sh
# RALLY — proves the schema's Row Level Security on a throwaway local
# PostgreSQL database. Point it at any dev cluster:
#
#   PGHOST=/tmp/pg-rls PGPORT=5544 sh rally/db/test/run-rls-tests.sh
#
# It creates (and drops) a database named rally_rls_test, applies the
# Supabase shim + every migration in order, then runs every RLS check.
# Any failing check aborts with a non-zero exit.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DB=rally_rls_test
export PGUSER="${PGUSER:-postgres}"

# The territory capability matrix has ONE definition (capability-matrix.json).
# It is fed into the SQL so the server checks assert against the same table
# the client tests do — neither side can drift without the other failing.
MATRIX="$DIR/../capability-matrix.json"
cap() {
  grep -o "\"$1\"[[:space:]]*:[[:space:]]*\(true\|false\)" "$MATRIX" \
    | head -1 | grep -o 'true\|false'
}
REP_MANAGE="$(cap rep)"; LEADER_MANAGE="$(cap leader)"
MANAGER_MANAGE="$(cap manager)"; OWNER_MANAGE="$(cap owner)"
for v in "$REP_MANAGE" "$LEADER_MANAGE" "$MANAGER_MANAGE" "$OWNER_MANAGE"; do
  [ -n "$v" ] || { echo "capability-matrix.json is unreadable"; exit 1; }
done

psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" \
     -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql"
for m in "$DIR"/../migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m"
done
OUT="$(psql -v ON_ERROR_STOP=1 -d "$DB" \
        -v rep_manage="$REP_MANAGE" -v leader_manage="$LEADER_MANAGE" \
        -v manager_manage="$MANAGER_MANAGE" -v owner_manage="$OWNER_MANAGE" \
        -f "$DIR/rls-test.sql" 2>&1)" || {
  echo "$OUT" | tail -20; echo "RLS: FAILED"; exit 1;
}
echo "$OUT" | grep -o "PASS: .*"
N="$(echo "$OUT" | grep -c "PASS: ")"
echo "RLS: ALL GREEN ($N checks)"
