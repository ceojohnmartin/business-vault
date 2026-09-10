#!/bin/sh
# RALLY v42 — THE RACES, WITH TWO REAL CONNECTIONS.
#   PGHOST=/tmp/pgrls/sock PGPORT=5544 sh rally/db/test/v42-race-test.sh
#
# An advisory lock cannot be tested from one session: a transaction always
# gets its own lock back. Every case below runs two concurrent psql
# connections against one database in production's current state plus v42,
# and asserts on what actually committed.
#
# THE LOCKS IN PLAY, and the order each path takes them:
#
#   rally_turf_seq   territories_number, on the PROPOSED tuple of every
#                    territories INSERT — including the ON CONFLICT arm,
#                    because a BEFORE INSERT trigger fires before the
#                    conflict is detected                          (v42 §B)
#   rally_import     import_territory_doors, before it matches     (v42 §F)
#   rally_turf       assert_no_turf_overlap, AT COMMIT             (0016)
#   row locks        select ... for update on one territory        (0014, v42)
#
# AN EARLIER VERSION OF THIS HEADER SAID "no cycle exists by construction",
# and it was wrong. rally_turf is indeed always last, but that is not the
# only pair: a phone's territories upsert takes rally_turf_seq and THEN
# queues for the row lock, while smart_split_territory_core row-locks the
# parent and only THEN inserts children, which takes rally_turf_seq. Two
# orders, one cycle — reproduced 7 times in 8. Case 6 is that pairing, and
# it runs BOTH ways: once with 0015's wrapper, which must deadlock, and once
# with v42 §K's, which must not. A concurrency case that cannot be made to
# fail is not evidence.
#
# Case 5 pairs a split with set_territory_assignments, which takes a row
# lock and never inserts a territory. That pairing cannot deadlock whatever
# the order is, so it proves liveness and ledger coherence — not the
# absence of a cycle. It is kept, and it is no longer described as if it
# were the stronger claim.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DB=rally_v42_race
export PGUSER="${PGUSER:-postgres}"
pass=0; fail=0
ok()  { pass=$((pass+1)); echo "PASS: $1"; }
bad() { fail=$((fail+1)); echo "FAIL: $1  --  $2"; }
eq()  { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "expected [$3] got [$2]"; fi; }
q()   { psql -X -d "$DB" -tAc "$1"; }

TEAM=dddddddd-4444-4444-a444-444444444444
LEAD=00000000-0000-4000-d000-000000000003
T=/tmp/rally-v42-race
rm -rf "$T"; mkdir -p "$T"

build() {
  psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql" >/dev/null 2>&1
  for m in "$DIR"/../migrations/000[1-8]_*.sql; do
    psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m" >/dev/null 2>&1
  done
  psql -q -d "$DB" -c "revoke usage on schema gis from authenticated" >/dev/null 2>&1
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/v41-backfill-seed.sql" >/dev/null 2>&1
  for f in APPLY_v41_A APPLY_v41_B1 APPLY_v41_B2 APPLY_v41_C APPLY_v41_FLIP APPLY_v42; do
    psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../$f.sql" >/dev/null 2>&1
  done
}

sq() { printf '[[%s,%s],[%s,%s],[%s,%s],[%s,%s]]' \
  "$1" "$2" "$(echo "$1 + $3" | bc -l)" "$2" \
  "$(echo "$1 + $3" | bc -l)" "$(echo "$2 + $3" | bc -l)" "$1" "$(echo "$2 + $3" | bc -l)"; }

mk() {
  psql -X -q -d "$DB" -c "insert into public.territories
    (team_id, id, name, polygon, archived, data, assignees, assignees_rev, open_assignees, created_by)
    values ('$TEAM','$1','$1','$2'::jsonb,false,'{}'::jsonb,'{\"entries\":[]}'::jsonb,0,'{}'::uuid[],'$LEAD')" >/dev/null 2>&1
}

echo "=== building production's current state + v42 ==="
build

# ---------------------------------------------------------------- 1 ---
echo
echo "=== 1. TWO MANAGERS DRAWING AT THE SAME MOMENT ==="
# Both open a transaction, both insert a hood, both commit. The advisory
# lock in territories_number serialises the number; without it both would
# read the same max(seq) and the deferrable unique constraint would abort
# one of them at commit.
cat > "$T/a.sql" <<SQL
begin;
insert into public.territories (team_id,id,name,polygon,archived,data,assignees,assignees_rev,open_assignees,created_by)
values ('$TEAM','race-a','race-a','$(sq 20.0 41.0 0.004)'::jsonb,false,'{}'::jsonb,'{"entries":[]}'::jsonb,0,'{}'::uuid[],'$LEAD');
select pg_sleep(1.2);
commit;
SQL
cat > "$T/b.sql" <<SQL
select pg_sleep(0.3);
begin;
insert into public.territories (team_id,id,name,polygon,archived,data,assignees,assignees_rev,open_assignees,created_by)
values ('$TEAM','race-b','race-b','$(sq 20.010 41.0 0.004)'::jsonb,false,'{}'::jsonb,'{"entries":[]}'::jsonb,0,'{}'::uuid[],'$LEAD');
commit;
SQL
psql -X -q -d "$DB" -f "$T/a.sql" > "$T/a.out" 2>&1 &
PA=$!
psql -X -q -d "$DB" -f "$T/b.sql" > "$T/b.out" 2>&1 &
PB=$!
wait $PA; wait $PB
SA=$(q "select coalesce(seq::text,'(none)') from public.territories where id='race-a'")
SB=$(q "select coalesce(seq::text,'(none)') from public.territories where id='race-b'")
if [ "$SA" = "(none)" ] || [ "$SB" = "(none)" ]; then
  bad "1a. both hoods committed" "race-a=$SA race-b=$SB; $(cat "$T/a.out" "$T/b.out" | grep -i error | head -1)"
else
  ok "1a. both hoods committed"
  if [ "$SA" = "$SB" ]; then bad "1b. they took DIFFERENT numbers" "both got $SA"
  else ok "1b. they took different numbers ($SA and $SB)"; fi
fi
eq "1c. no deadlock was reported" \
   "$(cat "$T/a.out" "$T/b.out" | grep -ci deadlock)" "0"
eq "1d. every number in the team is still unique" \
   "$(q "select (count(*) = count(distinct seq))::text from public.territories where team_id='$TEAM'")" "true"

# ---------------------------------------------------------------- 2 ---
echo
echo "=== 2. TWO MANAGERS IMPORTING THE SAME NEIGHBOURHOOD ==="
# The dangerous one: both scans return the same houses. Without the import
# lock each transaction matches against a snapshot that excludes the other's
# inserts, and the same house is created twice.
mk imp-race "$(sq 21.0 41.0 0.004)"
DOORS='[{"lat":41.001,"lng":21.001,"address":"1 Race St","source":"osm","externalId":"r1"},
        {"lat":41.002,"lng":21.002,"address":"2 Race St","source":"osm","externalId":"r2"},
        {"lat":41.003,"lng":21.003,"address":"3 Race St","source":"osm","externalId":"r3"}]'
for n in a b; do
cat > "$T/imp-$n.sql" <<SQL
select set_config('request.jwt.claims','{"sub":"$LEAD"}',true);
begin;
select set_config('request.jwt.claims','{"sub":"$LEAD"}',true);
select public.import_territory_doors('imp-race','$DOORS'::jsonb,'race-op-$n');
commit;
SQL
done
psql -X -q -d "$DB" -f "$T/imp-a.sql" > "$T/imp-a.out" 2>&1 &
PA=$!
psql -X -q -d "$DB" -f "$T/imp-b.sql" > "$T/imp-b.out" 2>&1 &
PB=$!
wait $PA; wait $PB
N=$(q "select count(*) from public.pins where territory_id='imp-race' and deleted_at is null")
eq "2a. three houses were sent twice and exactly three exist" "$N" "3"
eq "2b. no duplicate external id survived" \
   "$(q "select (count(*) = count(distinct data->'prop'->>'externalId'))::text
          from public.pins where territory_id='imp-race' and deleted_at is null")" "true"
eq "2c. no deadlock" "$(cat "$T/imp-a.out" "$T/imp-b.out" | grep -ci deadlock)" "0"

# ---------------------------------------------------------------- 3 ---
echo
echo "=== 3. AN IMPORT WHILE THE HOOD IS BEING RESHAPED ==="
# The import holds the territory row FOR UPDATE, so a concurrent reshape
# waits rather than moving the polygon out from under the containment test.
mk shape-race "$(sq 22.0 41.0 0.004)"
cat > "$T/imp2.sql" <<SQL
begin;
select set_config('request.jwt.claims','{"sub":"$LEAD"}',true);
select public.import_territory_doors('shape-race','[{"lat":41.001,"lng":22.001,"source":"osm","externalId":"s1"}]'::jsonb,'shape-op');
select pg_sleep(1.0);
commit;
SQL
cat > "$T/reshape.sql" <<SQL
select pg_sleep(0.3);
begin;
update public.territories set polygon = '$(sq 22.0 41.0 0.006)'::jsonb
 where team_id='$TEAM' and id='shape-race';
commit;
SQL
psql -X -q -d "$DB" -f "$T/imp2.sql" > "$T/imp2.out" 2>&1 &
PA=$!
psql -X -q -d "$DB" -f "$T/reshape.sql" > "$T/reshape.out" 2>&1 &
PB=$!
wait $PA; wait $PB
eq "3a. the door landed"  "$(q "select count(*) from public.pins where territory_id='shape-race'")" "1"
eq "3b. the reshape landed too" \
   "$(q "select (jsonb_array_length(polygon) = 4)::text from public.territories where id='shape-race'")" "true"
eq "3c. neither deadlocked" "$(cat "$T/imp2.out" "$T/reshape.out" | grep -ci deadlock)" "0"

# ---------------------------------------------------------------- 4 ---
echo
echo "=== 4. A RESET WHILE A REP IS RECORDING A KNOCK ==="
# The reset moves a boundary on territories; the knock writes a pin and an
# event. They touch different tables and must not block or deadlock, and the
# knock must survive whichever order they commit in.
mk knock-race "$(sq 23.0 41.0 0.004)"
psql -X -q -d "$DB" -c "insert into public.pins (team_id,id,lat,lng,address,disposition,territory_id,data,created_by)
  values ('$TEAM','kr-1',41.001,23.001,'1 Knock St','unworked','knock-race','{\"history\":[]}'::jsonb,'$LEAD')" >/dev/null
cat > "$T/reset.sql" <<SQL
begin;
select set_config('request.jwt.claims','{"sub":"$LEAD"}',true);
select public.reset_territory_outcomes('knock-race','{nothome,notint,goback}'::text[],false,'kr-reset');
select pg_sleep(1.0);
commit;
SQL
cat > "$T/knock.sql" <<SQL
select pg_sleep(0.3);
begin;
update public.pins set disposition='nothome',
  data = jsonb_set(data,'{history}','[{"ts":1800000000000,"disposition":"nothome"}]')
 where team_id='$TEAM' and id='kr-1';
insert into public.events (team_id,id,pin_id,type,disposition,at_ms,by_user,data)
values ('$TEAM','kr-ev','kr-1','knock','nothome',1800000000000,'$LEAD','{"pinId":"kr-1"}'::jsonb);
commit;
SQL
psql -X -q -d "$DB" -f "$T/reset.sql" > "$T/reset.out" 2>&1 &
PA=$!
psql -X -q -d "$DB" -f "$T/knock.sql" > "$T/knock.out" 2>&1 &
PB=$!
wait $PA; wait $PB
eq "4a. the knock survived"      "$(q "select count(*) from public.events where id='kr-ev'")" "1"
eq "4b. the boundary moved"      "$(q "select (cycle_started_at is not null)::text from public.territories where id='knock-race'")" "true"
eq "4c. neither deadlocked"      "$(cat "$T/reset.out" "$T/knock.out" | grep -ci deadlock)" "0"
eq "4d. and the door's history is intact" \
   "$(q "select jsonb_array_length(data->'history') from public.pins where id='kr-1'")" "1"

# ---------------------------------------------------------------- 5 ---
echo
echo "=== 5. A SPLIT WHILE THE PARENT IS BEING ASSIGNED ==="
# Smart Split tombstones the parent and inserts children in one transaction;
# an assignment holds the parent row FOR UPDATE. One must wait for the other
# and both must leave a coherent ledger.
mk split-race "$(sq 24.0 41.0 0.008)"
cat > "$T/split.sql" <<SQL
begin;
select set_config('request.jwt.claims','{"sub":"$LEAD"}',true);
select public.smart_split_territory_v41('split-race','sr-op',
  '[{"id":"sr-c1","name":"c1","polygon":$(sq 24.0 41.0 0.004)},
    {"id":"sr-c2","name":"c2","polygon":$(sq 24.004 41.0 0.004)}]'::jsonb);
select pg_sleep(1.0);
commit;
SQL
cat > "$T/assign.sql" <<SQL
select pg_sleep(0.3);
begin;
select set_config('request.jwt.claims','{"sub":"$LEAD"}',true);
select public.set_territory_assignments('split-race', array['00000000-0000-4000-d000-000000000001']::uuid[], 'sr-assign');
commit;
SQL
psql -X -q -d "$DB" -f "$T/split.sql" > "$T/split.out" 2>&1 &
PA=$!
psql -X -q -d "$DB" -f "$T/assign.sql" > "$T/assign.out" 2>&1 &
PB=$!
wait $PA; wait $PB
eq "5a. neither deadlocked" "$(cat "$T/split.out" "$T/assign.out" | grep -ci deadlock)" "0"
CH=$(q "select count(*) from public.territories where id in ('sr-c1','sr-c2')")
if [ "$CH" = "2" ]; then
  ok "5b. the children exist"
  eq "5c. and both were numbered" \
     "$(q "select (count(seq) = 2)::text from public.territories where id in ('sr-c1','sr-c2')")" "true"
  eq "5d. with different numbers" \
     "$(q "select (count(distinct seq) = 2)::text from public.territories where id in ('sr-c1','sr-c2')")" "true"
  eq "5e. the parent kept its own number" \
     "$(q "select (seq is not null)::text from public.territories where id='split-race'")" "true"
else
  # the split losing to the assignment is a legitimate outcome; a WRONG
  # outcome is a half-split, and that is what this checks
  ok "5b. the split did not commit (it lost the race) — checking it left nothing behind"
  eq "5c. no orphan child" "$CH" "0"
fi
eq "5f. every number in the team is still unique" \
   "$(q "select (count(*) = count(distinct seq))::text from public.territories where team_id='$TEAM'")" "true"

# ---------------------------------------------------------------- 6 ---
echo
echo "=== 6. THE LOCK-ORDER CYCLE, BOTH WAYS ==="
# A split (parent row lock -> child inserts -> rally_turf_seq) against an
# ordinary phone push (rally_turf_seq on the proposed tuple -> the same
# parent's row lock). This is the pairing case 5 could not reach.
#
# It runs with 0015's wrapper FIRST. That version must deadlock; if it does
# not, this harness is not exercising the cycle and the "0 deadlocks" it
# reports afterwards means nothing.
DLRING="$(sq 26.0 41.0 0.008)"
dl_round() {   # $1 = label ; echoes the number of deadlocks in 6 runs
  n=0
  for i in 1 2 3 4 5 6; do
    psql -X -q -d "$DB" >/dev/null 2>&1 <<SQL
delete from public.territory_splits;
delete from public.events where type like '%split%';
delete from public.territories where id like 'dl-%';
insert into public.territories (team_id,id,name,polygon,archived,data,assignees,assignees_rev,open_assignees,created_by)
values ('$TEAM','dl-parent','DL Parent','$DLRING'::jsonb,false,'{}'::jsonb,'{"entries":[]}'::jsonb,0,'{}'::uuid[],'$LEAD');
SQL
    ( psql -X -q -d "$DB" -tA -c "select set_config('request.jwt.claims','{\"sub\":\"$LEAD\"}',true);
        select public.smart_split_territory_v41('dl-parent','dl-op-$1-$i',
          '[{\"id\":\"dl-c1\",\"name\":\"c1\",\"polygon\":$(sq 26.0 41.0 0.004)},
            {\"id\":\"dl-c2\",\"name\":\"c2\",\"polygon\":$(sq 26.004 41.0 0.004)}]'::jsonb)" 2>&1 ) > "$T/dl-a.$i" &
    ( psql -X -q -d "$DB" -tA -c "begin;
        insert into public.territories (team_id,id,name,polygon,archived,data,assignees,assignees_rev,open_assignees,created_by)
        values ('$TEAM','dl-fresh-$1-$i','fresh','$(sq 27.0 41.0 0.004)'::jsonb,false,'{}'::jsonb,'{\"entries\":[]}'::jsonb,0,'{}'::uuid[],'$LEAD');
        select pg_sleep(0.05);
        insert into public.territories (team_id,id,name,polygon,archived,data,assignees,assignees_rev,open_assignees,created_by)
        values ('$TEAM','dl-parent','echo from a phone','$DLRING'::jsonb,false,'{}'::jsonb,'{\"entries\":[]}'::jsonb,0,'{}'::uuid[],'$LEAD')
        on conflict (team_id,id) do update set name = excluded.name;
        commit;" 2>&1 ) > "$T/dl-b.$i" &
    wait
    if grep -qa "deadlock detected" "$T/dl-a.$i" "$T/dl-b.$i"; then n=$((n+1)); fi
  done
  echo "$n"
}

psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../migrations/0015_smart_split_v41.sql" >/dev/null 2>&1
BROKEN=$(dl_round broken)
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../APPLY_v42.sql" >/dev/null 2>&1
FIXED=$(dl_round fixed)
if [ "$BROKEN" -gt 0 ]; then
  ok "6a. the harness really does exercise the cycle (0015's wrapper deadlocked $BROKEN of 6)"
else
  bad "6a. the harness really does exercise the cycle" \
      "0015's wrapper deadlocked 0 of 6 — THIS TEST PROVES NOTHING"
fi
eq "6b. v42 §K takes rally_turf_seq first, and the cycle is gone" "$FIXED" "0"
eq "6c. and the split still committed" \
   "$(q "select count(*) from public.territories where id in ('dl-c1','dl-c2')")" "2"
eq "6d. every number in the team is still unique" \
   "$(q "select (count(*) = count(distinct seq))::text from public.territories where team_id='$TEAM'")" "true"

echo
echo "================================================================"
echo "PASS $pass   FAIL $fail"
[ "$fail" -eq 0 ] || exit 1
