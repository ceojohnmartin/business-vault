#!/bin/sh
# Does the flip preflight actually BITE? Each case plants exactly one broken
# state on a throwaway copy of production's post-Stage-C shape and asserts
# that the NAMED probe flips to *** FAIL *** and the verdict turns NO-GO.
# A preflight nobody has ever seen fail is not a preflight.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
SRC=rally_c_verify
DB=rally_flip_bite
PF="$DIR/../preflight/v41-flip-preflight.editor.sql"
export PGUSER="${PGUSER:-postgres}"
pass=0; fail=0
ok()  { pass=$((pass+1)); echo "PASS: $1"; }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }

reset() {
  psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" \
                             -c "create database $DB template $SRC" >/dev/null
}
run() { psql -X -d "$DB" -tAF'|' -f "$PF" 2>&1; }
# $1 = probe prefix that must FAIL, $2 = label, $3.. = SQL to plant
# $1 = probe prefix that must FAIL, $2 = label, $3.. = SQL to plant.
# A label starting with "!" plants WITHOUT the blanket trigger disable, for
# the cases whose whole point IS a trigger's state - blanket re-enabling
# would quietly undo them, which is a mistake this harness made once.
bite() {
  probe="$1"; label="$2"; shift 2
  raw=0; case "$label" in \!*) raw=1; label="${label#!}";; esac
  reset
  if [ "$raw" = "0" ]; then
    psql -q -d "$DB" -c "alter table public.territories disable trigger user" >/dev/null 2>&1
    psql -q -d "$DB" -c "alter table public.pins disable trigger user" >/dev/null 2>&1
  fi
  for s in "$@"; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "$s" >/dev/null; done
  if [ "$raw" = "0" ]; then
    psql -q -d "$DB" -c "alter table public.territories enable trigger user" >/dev/null 2>&1
    psql -q -d "$DB" -c "alter table public.pins enable trigger user" >/dev/null 2>&1
  fi
  out="$(run)"
  # a psql abort, not the word ERRORED inside a probe's own report
  if echo "$out" | grep -q "^psql:.*ERROR:"; then
    bad "$label: the preflight ABORTED instead of reporting"; echo "$out" | grep "^psql:" | head -3; return
  fi
  if echo "$out" | grep -q "|$probe[^|]*|\*\*\* FAIL \*\*\*|"; then
    if echo "$out" | grep -q "NO-GO"; then ok "$label -> $probe FAILs, verdict NO-GO"
    else bad "$label: $probe failed but the verdict still said GO"; fi
  else
    bad "$label: $probe did NOT fail"
    echo "$out" | grep "|$probe" | head -2
  fi
}

TEAM="(select team_id from public.territories limit 1)"
LIVE="(select id from public.territories where deleted_at is null and archived=false order by id limit 1)"

# --- baseline: the untouched copy must be clean apart from 1b (no dnk_clear here)
reset
base="$(run)"
if echo "$base" | grep -q "^psql:.*ERROR:"; then bad "baseline: the preflight aborted"; echo "$base" | grep "^psql:" | head -5; fi
n="$(echo "$base" | grep -c '|\*\*\* FAIL \*\*\*|' || true)"
[ "$n" = "2" ] && ok "baseline: exactly 2 fails (1b no dnk_clear on this mirror, and the verdict)" \
                || bad "baseline: $n fail(s), expected 2"

# 5a  open_assignees stops agreeing with the ledger
bite "5a" "open_assignees drifts from the ledger" \
  "update public.territories set open_assignees = open_assignees || '{00000000-0000-4000-d000-0000000000fe}'::uuid[]
    where id = $LIVE"

# 6a  data.assignedTo stops agreeing with the ledger
bite "6a" "data.assignedTo drifts from the ledger" \
  "update public.territories set data = jsonb_set(data,'{assignedTo}','\"00000000-0000-4000-d000-0000000000ff\"')
    where id = $LIVE"

# 6b  the legacy assignments mirror loses an entry the ledger holds
bite "6b" "data.assignments drops an entry the ledger keeps" \
  "update public.territories set data = jsonb_set(data,'{assignments}','[]'::jsonb)
    where id = $LIVE and jsonb_array_length(coalesce(assignees->'entries','[]'::jsonb)) > 0"

# 7b  a malformed entry: no userId
bite "7b" "a ledger entry with no userId" \
  "update public.territories set assignees =
     jsonb_build_object('entries', (assignees->'entries') || '[{\"userId\":\"\",\"assignedAt\":1700000000000}]'::jsonb)
    where id = $LIVE"

# 7b  a malformed entry: an unreadable assignedAt
bite "7b" "a ledger entry whose assignedAt is a sentence" \
  "update public.territories set assignees =
     jsonb_build_object('entries', (assignees->'entries') || '[{\"userId\":\"00000000-0000-4000-d000-000000000001\",\"assignedAt\":\"last tuesday\"}]'::jsonb)
    where id = $LIVE"

# 7b  I3 violated: ends before it starts
bite "7b" "a ledger entry that ends before it starts" \
  "update public.territories set assignees =
     jsonb_build_object('entries', (assignees->'entries') || '[{\"userId\":\"00000000-0000-4000-d000-000000000001\",\"assignedAt\":1700000000000,\"unassignedAt\":1600000000000}]'::jsonb)
    where id = $LIVE"

# 7c  stored out of canonical order
bite "7c" "a ledger stored out of sort order" \
  "update public.territories set assignees = '{\"entries\":[
      {\"userId\":\"00000000-0000-4000-d000-000000000002\",\"assignedAt\":1800000000000},
      {\"userId\":\"00000000-0000-4000-d000-000000000001\",\"assignedAt\":1700000000000}]}'::jsonb
    where id = $LIVE"

# 8a  two OPEN entries for one rep
bite "8a" "one rep holding two OPEN entries" \
  "update public.territories set assignees = '{\"entries\":[
      {\"userId\":\"00000000-0000-4000-d000-000000000001\",\"assignedAt\":1700000000000},
      {\"userId\":\"00000000-0000-4000-d000-000000000001\",\"assignedAt\":1800000000000}]}'::jsonb
    where id = $LIVE"

# 8b  two SPELLINGS of one rep, both open - passes 8a, collapses in the uuid[]
bite "8b" "two spellings of one id, both OPEN" \
  "update public.territories set assignees = '{\"entries\":[
      {\"userId\":\"00000000-0000-4000-d000-000000000001\",\"assignedAt\":1700000000000},
      {\"userId\":\"00000000-0000-4000-D000-000000000001\",\"assignedAt\":1800000000000}]}'::jsonb
    where id = $LIVE"

# 9a  a current assignee who is not a profile at all
bite "9a" "a current assignee that resolves to no profile" \
  "update public.territories set assignees =
     '{\"entries\":[{\"userId\":\"00000000-0000-4000-d000-0000000000ff\",\"assignedAt\":1700000000000}]}'::jsonb
    where id = $LIVE"

# 9c  a current assignee who is a real teammate but DISABLED
bite "9c" "a current assignee who is a DISABLED rep" \
  "update public.profiles set disabled = true where id = '00000000-0000-4000-d000-000000000002'" \
  "update public.territories set assignees =
     '{\"entries\":[{\"userId\":\"00000000-0000-4000-d000-000000000002\",\"assignedAt\":1700000000000}]}'::jsonb
    where id = $LIVE"

# 7b  an unreadable timestamp. The server's own sort readers raw-cast this,
#     so the probes that call them RAISE - the survey must report, not die.
bite "7b" "an unreadable assignedAt is REPORTED, not thrown" \
  "update public.territories set assignees =
     jsonb_build_object('entries', (assignees->'entries') || '[{\"userId\":\"00000000-0000-4000-d000-000000000001\",\"assignedAt\":\"last tuesday\"}]'::jsonb)
    where id = $LIVE"

# 10a a live hood whose outline the map cannot read
bite "10a" "a live hood with a self-crossing outline" \
  "update public.territories set polygon = '[[-92.20,30.40],[-92.10,30.50],[-92.10,30.40],[-92.20,30.50]]'::jsonb,
     geom = null where id = $LIVE"

# 10b a live hood with no geom at all
bite "10b" "a live hood with a NULL geom" \
  "update public.territories set geom = null where id = $LIVE"

# 10d a live hood whose stored geom no longer matches its polygon
bite "10d" "a live geom that has gone stale against its polygon" \
  "update public.territories set geom = gis.st_setsrid(gis.st_geomfromtext(
     'POLYGON((-150 45,-149.99 45,-149.99 45.01,-150 45.01,-150 45))'),4326)
    where id = $LIVE"

# 11a two live hoods on one team sharing ground
bite "11a" "two live hoods overlapping by more than 1 m2" \
  "insert into public.territories (team_id,id,name,polygon,archived,data,assignees,assignees_rev,open_assignees,geom)
   select team_id,'bite-ov','bite-ov','[[-150,45],[-149.99,45],[-149.99,45.01],[-150,45.01]]'::jsonb,false,'{}'::jsonb,
          '{\"entries\":[]}'::jsonb,0,'{}'::uuid[],
          gis.st_setsrid(gis.st_geomfromtext('POLYGON((-150 45,-149.99 45,-149.99 45.01,-150 45.01,-150 45))'),4326)
     from public.territories limit 1" \
  "insert into public.territories (team_id,id,name,polygon,archived,data,assignees,assignees_rev,open_assignees,geom)
   select team_id,'bite-ov2','bite-ov2','[[-149.995,45],[-149.985,45],[-149.985,45.01],[-149.995,45.01]]'::jsonb,false,'{}'::jsonb,
          '{\"entries\":[]}'::jsonb,0,'{}'::uuid[],
          gis.st_setsrid(gis.st_geomfromtext('POLYGON((-149.995 45,-149.985 45,-149.985 45.01,-149.995 45.01,-149.995 45))'),4326)
     from public.territories limit 1"

# 2f  a trigger switched off behind the flip's back
bite "2f" "!a territories trigger disabled" \
  "alter table public.territories disable trigger territories_assignment"

# 2g  THE GATE ITSELF removed
bite "2g" "!rally_config_guard dropped from rally_config" \
  "drop trigger rally_config_guard on public.rally_config"

# 2m  the ledger columns handed back to clients
bite "2m" "!assignees made client-writable again" \
  "grant update (assignees) on public.territories to authenticated"

# 13a the Stage C trigger disarmed
bite "13a" "!territories_no_overlap disabled" \
  "alter table public.territories disable trigger territories_no_overlap"

# 3a  the flag already true
bite "3a" "!the flag is somehow already true" \
  "update public.rally_config set assignment_server_authoritative = true"

# ---- cases for the probes added after the adversarial review ----

# 5b  a duplicate uuid planted straight into the column
bite "5b" "a duplicate uuid in open_assignees" \
  "update public.territories set open_assignees =
     '{00000000-0000-4000-d000-000000000001,00000000-0000-4000-d000-000000000001}'::uuid[]
    where id = $LIVE"

# 6c  the legacy mirror key removed entirely
bite "6c" "data.assignments key removed" \
  "update public.territories set data = data - 'assignments' where id = $LIVE"

# 7a  the ledger container itself made unusable. This is the row that made an
#     unguarded survey die before it could report anything at all.
bite "7a" "assignees.entries is a string, not an array" \
  "update public.territories set assignees = '{\"entries\":\"gone\"}'::jsonb where id = $LIVE"

# 12a an unmeasurable pair. 0016 fails closed, so rally_overlap_m2 RAISES;
#     pg_temp.ov must turn that into a NULL and let 11a and 12a both report.
bite "12a" "!a live pair the geometry engine cannot measure" \
  "alter table public.territories disable trigger user" \
  "insert into public.territories (team_id,id,name,polygon,archived,data,assignees,assignees_rev,open_assignees,geom)
   select team_id,'bite-bad1','bite-bad1','[]'::jsonb,false,'{}'::jsonb,'{\"entries\":[]}'::jsonb,0,'{}'::uuid[],
          gis.st_setsrid(gis.st_geomfromtext('POLYGON((-160 45,-159.99 45,-159.99 45.01,-160 45.01,-160 45))'),4326)
     from public.territories limit 1" \
  "insert into public.territories (team_id,id,name,polygon,archived,data,assignees,assignees_rev,open_assignees,geom)
   select team_id,'bite-bad2','bite-bad2','[]'::jsonb,false,'{}'::jsonb,'{\"entries\":[]}'::jsonb,0,'{}'::uuid[],
          gis.st_setsrid(gis.st_geomfromtext('POLYGON((-160 45,-159.98 45.02,-159.98 45,-160 45.02,-160 45))'),4326)
     from public.territories limit 1" \
  "alter table public.territories enable trigger user"

# 2i  a SECURITY DEFINER gate whose search_path is unpinned. bool_and would
#     have skipped this silently; the count form must not.
bite "2i" "!the gate's search_path unpinned" \
  "alter function public.rally_unresolved_live_assignments() reset search_path"

# 2k  an internal handed to clients
bite "2k" "!rally_split_inherit granted to authenticated" \
  "grant execute on function public.rally_split_inherit(text, text[], text) to authenticated"

# 2m  a column 0012 never granted, handed back
bite "2m" "!cycle_started_at made client-writable" \
  "grant update (cycle_started_at) on public.territories to authenticated"

# 2a  a Stage B object removed
bite "2a" "!a Stage B function dropped" \
  "drop function public.rally_keep_open_history(jsonb, jsonb, bigint)"

psql -q -d postgres -c "drop database if exists $DB" >/dev/null 2>&1 || true
echo
echo "bite: $pass passed, $fail failed"
[ "$fail" = "0" ]
