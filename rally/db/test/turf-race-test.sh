#!/bin/sh
# RALLY v41 — CONCURRENCY proof for the turf overlap invariant (0016).
#
# The single-session assertions in v41-test.sql prove the CHECK. They cannot
# prove the thing that actually matters, because it needs two sessions: two
# leaders drawing overlapping turf at the same moment, each in a transaction
# whose snapshot does not contain the other's row.
#
# Deferring the constraint to COMMIT fixes ordering WITHIN a transaction —
# which Smart Split requires, since mid-transaction its children overlap the
# still-live parent. It does NOTHING about two concurrent transactions. That
# is what the team-scoped advisory lock is for, and this is where it is
# proven: without it, BOTH of these commit and the map holds one street
# twice, with two reps sent to the same doors and nothing anywhere saying so.
#
# THE INTERLEAVING, and why it is built this way.
#
# The constraint is DEFERRED, so its advisory lock is taken at COMMIT, not at
# INSERT. A test that simply slept between the two inserts would therefore
# prove nothing: the sleeper reaches COMMIT last and is refused by the
# ordinary check, with no contention at all.
#
# So the winner takes the SAME team lock explicitly, immediately after its
# insert, and holds it across a sleep. That is a faithful stand-in for "A's
# commit began first and is still in flight" — the real-world shape of the
# race — and it puts B's commit in contention with it:
#
#   A: BEGIN; insert; take the team lock; sleep 3; COMMIT
#   B: starts 1s later; insert; COMMIT -> its constraint trigger asks for the
#      same lock, BLOCKS until A commits, then sees A's row and refuses.
#
# Case 3 removes the lock from the trigger and runs the identical script: B
# must then sail past and both hoods commit. Without that negative control,
# case 1 would only prove that a check exists.
#
# Run standalone, or via run-v41-tests.sh.
set -e
DB="${1:-rally_turf_race_test}"
DIR="$(cd "$(dirname "$0")" && pwd)"
export PGUSER="${PGUSER:-postgres}"
TEAM=cccccccc-3333-4333-a333-333333333333
LEAD=00000000-0000-4000-c000-000000000001
LEAD2=00000000-0000-4000-c000-000000000002
fails=0

psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql"
for m in "$DIR"/../migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m"; done

psql -q -v ON_ERROR_STOP=1 -d "$DB" <<SQL
insert into auth.users (id, email, raw_user_meta_data) values
  ('$LEAD',  'race-lead@x.com',  '{"name":"Race Lead"}'),
  ('$LEAD2', 'race-lead2@x.com', '{"name":"Race Lead 2"}');
insert into public.teams (id, name) values ('$TEAM', 'Race Team');
update public.profiles set team_id = '$TEAM', role = 'manager'
 where email in ('race-lead@x.com', 'race-lead2@x.com');
-- metres -> degrees, the same frame the SQL suite uses
create or replace function t_rect(x0 float8, y0 float8, x1 float8, y1 float8)
returns jsonb language sql immutable as \$\$
  select jsonb_build_array(
    jsonb_build_array(x0/111194.9/cosd(40), 40 + y0/111194.9),
    jsonb_build_array(x1/111194.9/cosd(40), 40 + y0/111194.9),
    jsonb_build_array(x1/111194.9/cosd(40), 40 + y1/111194.9),
    jsonb_build_array(x0/111194.9/cosd(40), 40 + y1/111194.9))
\$\$;
SQL

say() { if [ "$1" = "1" ]; then echo "PASS: $2"; else echo "FAIL: $2"; fails=$((fails+1)); fi; }

# one hood insert, in its own session; $1 uid $2 id $3 rect-args $4 hold-secs
# When $4 is set the session also takes the constraint's own team lock and
# holds it for that long — see the header: this is what makes the second
# session contend rather than simply arrive later.
draw() {
  psql -d "$DB" -Atq 2>&1 <<SQL
BEGIN;
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','$1')::text, true);
INSERT INTO public.territories (team_id, id, name, polygon)
VALUES ('$TEAM', '$2', '$2', t_rect($3));
$( [ -n "$4" ] && echo "SELECT pg_advisory_xact_lock(hashtext('rally_turf'), hashtext('$TEAM')); SELECT pg_sleep($4);" )
COMMIT;
SQL
}

# The same, but sleeping WITHOUT taking the turf lock, and waking on an
# ABSOLUTE time shared by both sessions. Sleeping a fixed number of seconds
# from two different start moments lands the commits seconds apart, and the
# later one then simply sees the earlier — which is not write skew and would
# make the negative control fail for the wrong reason. pg_sleep_until puts
# both COMMITs in the same instant, which is the state the lock prevents.
draw_at() {
  psql -d "$DB" -Atq 2>&1 <<SQL
BEGIN;
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub','$1')::text, true);
INSERT INTO public.territories (team_id, id, name, polygon)
VALUES ('$TEAM', '$2', '$2', t_rect($3));
SELECT pg_sleep_until('$4'::timestamptz);
COMMIT;
SQL
}

# ---------------------------------------------------------------- case 1 ---
# two leaders, overlapping ground, at the same moment
( draw "$LEAD" ra "0,0,100,100" 3 >/tmp/rally-turf-a.out 2>&1 ) &
sleep 1
START="$(date +%s)"
draw "$LEAD2" rb "50,0,150,100" >/tmp/rally-turf-b.out 2>&1 || true
DONE="$(date +%s)"
wait
A_OUT="$(cat /tmp/rally-turf-a.out)"; B_OUT="$(cat /tmp/rally-turf-b.out)"
LIVE="$(psql -d "$DB" -Atc "select count(*) from public.territories where team_id='$TEAM' and deleted_at is null")"

say "$([ "$LIVE" = "1" ] && echo 1)" \
    "exactly ONE of two concurrent overlapping hoods committed (got $LIVE)"
say "$(echo "$B_OUT" | grep -qi 'overlaps' && echo 1)" \
    "the loser got the real overlap refusal, naming the hood it hit"
say "$(echo "$A_OUT" | grep -qvi 'ERROR' && echo 1)" \
    "the winner committed cleanly"
say "$([ "$(( DONE - START ))" -ge 1 ] && echo 1)" \
    "the loser BLOCKED on the winner's team lock rather than racing past it ($(( DONE - START ))s)"

# ---------------------------------------------------------------- case 2 ---
# the same two moments, but ADJACENT rather than overlapping: both must commit
psql -q -d "$DB" -c "delete from public.territories where team_id='$TEAM'" >/dev/null
( draw "$LEAD" rc "0,0,100,100" 2 >/dev/null 2>&1 ) &
sleep 1
draw "$LEAD2" rd "100,0,200,100" >/tmp/rally-turf-d.out 2>&1 || true
wait
LIVE2="$(psql -d "$DB" -Atc "select count(*) from public.territories where team_id='$TEAM' and deleted_at is null")"
say "$([ "$LIVE2" = "2" ] && echo 1)" \
    "two concurrent ADJACENT hoods BOTH commit — the lock serialises, it does not refuse (got $LIVE2)"

# ---------------------------------------------------------------- case 3 ---
# NEGATIVE CONTROL. Drop the advisory lock from the constraint function and
# the same interleaving must now produce the corrupt state — otherwise case 1
# proves nothing about the lock, only that the check exists.
psql -q -d "$DB" -c "delete from public.territories where team_id='$TEAM'" >/dev/null
psql -q -v ON_ERROR_STOP=1 -d "$DB" <<'SQL' >/dev/null
create or replace function public.assert_no_turf_overlap()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_other public.territories%rowtype;
begin
  if new.deleted_at is not null or new.archived or new.geom is null then return null; end if;
  -- NO ADVISORY LOCK — this is the negative control, not the shipped code
  select t.* into v_other from public.territories t
   where t.team_id = new.team_id and t.id <> new.id
     and t.deleted_at is null and t.archived = false and t.geom is not null
     and t.geom operator(extensions.&&) new.geom
     and public.rally_overlap_m2(t.geom, new.geom) > public.rally_overlap_tolerance_m2()
   limit 1;
  if found then raise exception 'overlaps' using errcode = '23514'; end if;
  return null;
end $$;
SQL
# Both transactions must reach COMMIT at the SAME MOMENT, or the second one
# simply sees the first and the write skew never appears — two sequential
# commits are not the failure the lock prevents. So both sleep to a common
# wake time. Timing under load can still miss; a few attempts is enough, and
# the outcome is reported honestly either way.
LIVE3=0
for attempt in 1 2 3; do
  psql -q -d "$DB" -c "delete from public.territories where team_id='$TEAM'" >/dev/null
  WAKE="$(psql -d "$DB" -Atc "select (now() + interval '3 seconds')::text")"
  ( draw_at "$LEAD"  "re$attempt" "0,0,100,100"  "$WAKE" >/dev/null 2>&1 ) &
  ( draw_at "$LEAD2" "rf$attempt" "50,0,150,100" "$WAKE" >/dev/null 2>&1 ) &
  wait
  LIVE3="$(psql -d "$DB" -Atc "select count(*) from public.territories where team_id='$TEAM' and deleted_at is null")"
  [ "$LIVE3" = "2" ] && break
done
say "$([ "$LIVE3" = "2" ] && echo 1)" \
    "NEGATIVE CONTROL: without the lock BOTH overlapping hoods commit (got $LIVE3 after $attempt attempt(s)) — so case 1 proves the lock"

psql -q -d postgres -c "drop database if exists $DB" >/dev/null 2>&1
if [ "$fails" -gt 0 ]; then echo "TURF RACE: FAILED ($fails)"; exit 1; fi
echo "TURF RACE: ALL GREEN (6 checks)"
