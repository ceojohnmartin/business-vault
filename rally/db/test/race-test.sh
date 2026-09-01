#!/bin/sh
# RALLY — CONCURRENCY proof for the payment allowlist trigger (0004).
#
# rls-test.sql is a single session, and this class of bug is invisible to one:
# a BEFORE INSERT OR UPDATE trigger fires TWICE for INSERT .. ON CONFLICT DO
# UPDATE, and the INSERT pass's output becomes EXCLUDED. If that pass writes a
# value it did not receive, the UPDATE pass cannot tell its own injection from
# client intent — and another transaction committing in between turns that into
# a LOST UPDATE.
#
# The interleaving reproduced here:
#   stored:  autopayRequested = false
#   B:       BEGIN; set it TRUE; hold the row lock; COMMIT
#   A:       an older client UPSERTs and omits the key. Its BEFORE INSERT pass
#            runs BEFORE the lock is taken (so it sees the stale false), then
#            it blocks on B. When it unblocks, OLD is correctly true.
#   want:    true survives. A said nothing about the field, so it changes nothing.
#
# Run standalone, or via run-rls-tests.sh which calls it with the same DB.
set -e
DB="${1:-rally_race_test}"
DIR="$(cd "$(dirname "$0")" && pwd)"
export PGUSER="${PGUSER:-postgres}"
TEAM=11111111-1111-4111-a111-111111111111
fails=0

if [ -z "$1" ]; then
  psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql"
  for m in "$DIR"/../migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m"; done
  psql -q -v ON_ERROR_STOP=1 -d "$DB" \
    -c "insert into public.teams (id,name) values ('$TEAM','Race Team')"
fi
psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "delete from public.customers where id = 'race-1'"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "insert into public.customers (team_id,id,data) values
  ('$TEAM','race-1','{\"payment\":{\"method\":\"ach\",\"autopayRequested\":false,\"status\":\"not_configured\"}}'::jsonb)"

# $1 = what B commits mid-flight   $2 = what A upserts   $3 = expected   $4 = label
race() {
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "update public.customers
     set data = '{\"payment\":{\"method\":\"ach\",\"autopayRequested\":false,\"status\":\"not_configured\"}}'::jsonb
   where id = 'race-1'"
  ( psql -q -d "$DB" >/dev/null 2>&1 <<SQL
BEGIN;
UPDATE public.customers SET data = '$1'::jsonb WHERE id = 'race-1';
SELECT pg_sleep(2);
COMMIT;
SQL
  ) &
  sleep 1
  psql -q -d "$DB" >/dev/null 2>&1 <<SQL
INSERT INTO public.customers (team_id,id,first,last,data)
VALUES ('$TEAM','race-1','','','$2'::jsonb)
ON CONFLICT (team_id,id) DO UPDATE SET data = excluded.data;
SQL
  wait
  got="$(psql -d "$DB" -Atc "select coalesce(data->'payment'->>'autopayRequested','<absent>')
                               from public.customers where id = 'race-1'")"
  if [ "$got" = "$3" ]; then echo "PASS: $4"
  else echo "FAIL: $4 (expected $3, got $got)"; fails=$((fails+1)); fi
}

race '{"payment":{"method":"ach","autopayRequested":true,"status":"pending_setup"}}' \
     '{"payment":{"method":"ach","autopay":true,"last4":""}}' \
     true \
     "a concurrent commit is not lost to an older client that omits the field"

race '{"payment":{"method":"ach","autopayRequested":true,"status":"pending_setup"}}' \
     '{"payment":{"method":"ach","autopayRequested":false,"status":"pending_setup"}}' \
     false \
     "a current client's EXPLICIT false still wins (genuine intent, last write)"

race '{"payment":{"method":"ach","autopayRequested":false,"status":"not_configured"}}' \
     '{"payment":{"method":"ach","autopayRequested":true,"status":"pending_setup"}}' \
     true \
     "a current client's EXPLICIT true still wins over a concurrent false"

[ -z "$1" ] && psql -q -d postgres -c "drop database if exists $DB" >/dev/null 2>&1
if [ "$fails" -gt 0 ]; then echo "RACE: FAILED ($fails)"; exit 1; fi
echo "RACE: ALL GREEN (3 checks)"
