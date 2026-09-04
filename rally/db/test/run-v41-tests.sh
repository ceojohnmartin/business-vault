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

# THE STAGED ORDER IS SAFE IN BOTH DIRECTIONS. rally_capabilities() arrives
# in 0010 but the turf RPCs it advertises arrive in 0014/0015, so it must
# report what is actually INSTALLED. A hardcoded true would send every
# client at smart_split_territory_v41 during Stage A — before it exists —
# and 404 every Smart Split in the company until Stage B landed.
STAGE_DB=rally_v41_stage_test
psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $STAGE_DB" \
     -c "create database $STAGE_DB"
psql -q -v ON_ERROR_STOP=1 -d "$STAGE_DB" -f "$DIR/supabase-shim.sql"
for m in "$DIR"/../migrations/000*.sql "$DIR"/../migrations/001[0123]*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$STAGE_DB" -f "$m"
done
A_CAPS="$(psql -d "$STAGE_DB" -Atc "select public.rally_capabilities()->>'turfRpc'")"
for m in "$DIR"/../migrations/001[456]*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$STAGE_DB" -f "$m"
done
B_CAPS="$(psql -d "$STAGE_DB" -Atc "select public.rally_capabilities()->>'turfRpc'")"
psql -q -d postgres -c "drop database if exists $STAGE_DB" >/dev/null 2>&1
if [ "$A_CAPS" != "false" ] || [ "$B_CAPS" != "true" ]; then
  echo "v41 STAGED: FAILED — turfRpc was '$A_CAPS' after Stage A (want false) and '$B_CAPS' after Stage B (want true)"
  exit 1
fi
echo "v41 staged     turfRpc false after Stage A, true after Stage B  ok"

sh "$DIR/turf-race-test.sh"
