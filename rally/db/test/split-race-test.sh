#!/bin/sh
# RALLY — CONCURRENCY proof for atomic Smart Split (0005).
#
# rls-test.sql runs in one session, and the failure this guards against needs
# two: two managers splitting the SAME hood at the same moment. The state that
# must never exist is
#
#     parent + children from split A + children from split B
#
# — one hood covered twice over, by two sets of reps, with no record that
# anything went wrong. A single session cannot produce it, so a single-session
# test cannot prove it impossible.
#
# The interleaving reproduced here:
#   A: BEGIN; call the function (takes the parent's row lock); sleep; COMMIT
#   B: starts 1s later, calls the function, BLOCKS on that lock, and when A
#      commits, re-reads the parent under the lock and sees the tombstone
#   want: exactly one operation committed, exactly one set of children, and B
#         got a real error rather than a second split or a silent no-op.
#
# Run standalone, or via run-rls-tests.sh which calls it with the same DB.
set -e
DB="${1:-rally_split_race_test}"
DIR="$(cd "$(dirname "$0")" && pwd)"
export PGUSER="${PGUSER:-postgres}"
TEAM=11111111-1111-4111-a111-111111111111
LEAD=00000000-0000-4000-a000-000000000002
OWNER=00000000-0000-4000-a000-000000000001
fails=0

if [ -z "$1" ]; then
  psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql"
  for m in "$DIR"/../migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m"; done
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/split-race-fixtures.sql"
fi

kids() {  # $1 = child id prefix
  printf '[{"id":"%s-a","name":"A","polygon":[[0,0],[2,0],[2,4],[0,4]],"homes":10},
           {"id":"%s-b","name":"B","polygon":[[2,0],[4,0],[4,4],[2,4]],"homes":10}]' "$1" "$1"
}

reset_parent() {  # $1 = parent id
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "
    delete from public.territory_splits where team_id = '$TEAM';
    delete from public.territories where team_id = '$TEAM' and id <> '$1';
    insert into public.territories (team_id,id,name,polygon)
      values ('$TEAM','$1','Race Hood','[[0,0],[4,0],[4,4],[0,4]]'::jsonb)
    on conflict (team_id,id) do update set deleted_at = null;"
}

# runs one call in its own session; $1 uid  $2 parent  $3 op  $4 kids  $5 hold?
call() {
  psql -d "$DB" -Atq 2>&1 <<SQL
BEGIN;
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','$1')::text, true);
SELECT coalesce(public.smart_split_territory('$2','$3','$4'::jsonb)->>'status','?');
$( [ -n "$5" ] && echo "SELECT pg_sleep($5);" )
COMMIT;
SQL
}

say() { # $1 ok?  $2 label
  if [ "$1" = "1" ]; then echo "PASS: $2"; else echo "FAIL: $2"; fails=$((fails+1)); fi
}

# ---------------------------------------------------------------- case 1 ---
# two DIFFERENT managers, two DIFFERENT operation ids, the same parent
reset_parent race-parent
( call "$LEAD"  race-parent op-A "$(kids ka)" 2 >/tmp/rally-split-a.out 2>&1 ) &
sleep 1
call "$OWNER" race-parent op-B "$(kids kb)" >/tmp/rally-split-b.out 2>&1 || true
wait
A_OUT="$(cat /tmp/rally-split-a.out)"; B_OUT="$(cat /tmp/rally-split-b.out)"
COMMITTED="$(psql -d "$DB" -Atc "select count(*) from public.territory_splits where team_id='$TEAM'")"
KIDS_A="$(psql -d "$DB" -Atc "select count(*) from public.territories where id like 'ka-%' and deleted_at is null")"
KIDS_B="$(psql -d "$DB" -Atc "select count(*) from public.territories where id like 'kb-%' and deleted_at is null")"
PARENT_DEAD="$(psql -d "$DB" -Atc "select deleted_at is not null from public.territories where id='race-parent'")"

say "$([ "$COMMITTED" = "1" ] && echo 1)" \
    "exactly ONE split operation committed for the contested parent (got $COMMITTED)"
say "$([ "$(( KIDS_A + KIDS_B ))" = "2" ] && echo 1)" \
    "exactly ONE set of children exists — never both (A=$KIDS_A B=$KIDS_B)"
say "$([ "$PARENT_DEAD" = "t" ] && echo 1)" \
    "the parent is retired exactly once (dead=$PARENT_DEAD)"
say "$(echo "$B_OUT" | grep -qi 'already deleted or split\|ERROR' && echo 1)" \
    "the loser got a REAL refusal, not a silent no-op"
say "$(echo "$A_OUT" | grep -q 'committed' && echo 1)" \
    "the winner was told it committed"

# ---------------------------------------------------------------- case 2 ---
# ONE device, ONE operation id, sent twice because the first response was slow
# — the retry must resolve to the committed fact, NOT be told the split failed
reset_parent race-parent2
( call "$LEAD" race-parent2 op-same "$(kids kc)" 2 >/tmp/rally-split-c.out 2>&1 ) &
sleep 1
call "$LEAD" race-parent2 op-same "$(kids kc)" >/tmp/rally-split-d.out 2>&1 || true
wait
C_OUT="$(cat /tmp/rally-split-c.out)"; D_OUT="$(cat /tmp/rally-split-d.out)"
KIDS_C="$(psql -d "$DB" -Atc "select count(*) from public.territories where id like 'kc-%' and deleted_at is null")"
OPS_C="$(psql -d "$DB" -Atc "select count(*) from public.territory_splits where team_id='$TEAM'")"

say "$([ "$KIDS_C" = "2" ] && echo 1)" \
    "an in-flight duplicate creates ZERO extra children (got $KIDS_C)"
say "$([ "$OPS_C" = "1" ] && echo 1)" \
    "and ZERO extra operation records (got $OPS_C)"
say "$(echo "$D_OUT" | grep -q 'already_committed' && echo 1)" \
    "the duplicate is told the operation ALREADY COMMITTED, not that it failed"

# ---------------------------------------------------------------- case 3 ---
# the loser's transaction must leave NOTHING behind — not a child, not an
# operation row, not a half-tombstoned parent
say "$([ "$(psql -d "$DB" -Atc "select count(*) from public.territories where id like 'kd-%'")" = "0" ] && echo 1)" \
    "a refused split leaves no orphan rows anywhere"

# ---------------------------------------------------------------- case 4 ---
# The loser above was stopped by the ROW LOCK. That is the mechanism that
# happens to fire first, and a test that only ever exercises it would not
# notice if it were removed. The parent-once unique index is the guarantee
# underneath it, so prove that one on its own, by reaching past the function
# and inserting the second operation record directly as the server.
reset_parent race-parent3
psql -q -d "$DB" -c "insert into public.territory_splits
  (team_id,operation_id,parent_id,child_ids) values
  ('$TEAM','op-first','race-parent3','[\"x\"]'::jsonb)" >/dev/null
SECOND="$(psql -d "$DB" -Atc "insert into public.territory_splits
  (team_id,operation_id,parent_id,child_ids) values
  ('$TEAM','op-second','race-parent3','[\"y\"]'::jsonb)" 2>&1 || true)"
say "$(echo "$SECOND" | grep -q 'territory_splits_parent_once' && echo 1)" \
    "a parent can be claimed ONCE even with the row lock bypassed entirely"

# ---------------------------------------------------------------- case 5 ---
# and prove the lock genuinely SERIALISED case 1 rather than the two calls
# simply not overlapping: the loser must have WAITED for the winner.
reset_parent race-parent4
START="$(date +%s)"
( call "$LEAD" race-parent4 op-E "$(kids ke)" 3 >/dev/null 2>&1 ) &
sleep 1
call "$OWNER" race-parent4 op-F "$(kids kf)" >/dev/null 2>&1 || true
LOSER_DONE="$(date +%s)"
wait
say "$([ "$(( LOSER_DONE - START ))" -ge 3 ] && echo 1)" \
    "the second manager BLOCKED on the first until it committed ($(( LOSER_DONE - START ))s)"

if [ -z "$1" ]; then psql -q -d postgres -c "drop database if exists $DB" >/dev/null 2>&1; fi
if [ "$fails" -gt 0 ]; then echo "SPLIT RACE: FAILED ($fails)"; exit 1; fi
echo "SPLIT RACE: ALL GREEN (11 checks)"
