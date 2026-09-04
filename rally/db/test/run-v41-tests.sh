#!/bin/sh
# RALLY v41 — the server release gates.
#   PGHOST=/tmp/pgrls/sock PGPORT=5544 sh rally/db/test/run-v41-tests.sh
#
# Applies the Supabase shim and EVERY migration (0001..0016) to a throwaway
# database, then runs the v41 assertions plus the concurrency proof, which
# needs two real sessions and so lives in its own script.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DB=rally_v41_test
export PGUSER="${PGUSER:-postgres}"

psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" \
     -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql"
for m in "$DIR"/../migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m"
done

OUT="$(psql -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/v41-test.sql" 2>&1)" || {
  echo "$OUT" | tail -25; echo "v41 SQL: FAILED"; exit 1;
}
N="$(printf '%s' "$OUT" | grep -c 'PASS:' || true)"
if printf '%s' "$OUT" | grep -q 'FAIL:'; then
  printf '%s\n' "$OUT" | grep 'FAIL:'
  echo "v41 SQL: FAILED"; exit 1
fi
printf 'v41 SQL       %3d checks  ok\n' "$N"

# NO SILENT REPAIR. The turf invariant forbids any operation that can change
# the footprint a leader drew, so the migration set is grepped for them: a
# future edit that reaches for ST_MakeValid has to delete this check first.
# Matches a CALL, not a mention: the files explain at length why these are
# forbidden, and the explanation must not trip the check that enforces it.
BAD="$(grep -rilE '(extensions\.|public\.)?st_(makevalid|buffer|snaptogrid|simplify)[[:space:]]*\(' "$DIR"/../migrations/ || true)"
if [ -n "$BAD" ]; then
  echo "v41 SQL: FAILED — a shape-changing repair appears in: $BAD"; exit 1
fi
echo "v41 SQL       no shape-changing repair anywhere in db/migrations  ok"

sh "$DIR/turf-race-test.sh"
