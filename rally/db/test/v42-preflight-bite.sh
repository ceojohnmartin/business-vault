#!/bin/sh
# RALLY v42 — DOES THE PREFLIGHT ACTUALLY BITE?
#   PGHOST=/tmp/pgrls/sock PGPORT=5544 sh rally/db/test/v42-preflight-bite.sh
#
# A preflight that only ever prints PASS on healthy data is decoration. This
# takes db/preflight/v42-import-preflight.editor.sql and, for every probe it
# contains, DELIBERATELY CREATES THE BROKEN CONDITION on a disposable copy of
# production's current state, then requires that probe — and the VERDICT — to
# change. A case that cannot be made to fail is reported as a failure of the
# TEST, not a success of the probe.
#
# The healthy baseline is built once and used as a template, so each case is a
# fresh database rather than a mutation of the previous one's leftovers.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PRE="$DIR/../preflight/v42-import-preflight.editor.sql"
TPL=rally_pf_template
export PGUSER="${PGUSER:-postgres}"
pass=0; fail=0
ok()  { pass=$((pass+1)); echo "PASS: $1"; }
bad() { fail=$((fail+1)); echo "FAIL: $1  --  $2"; }

TEAM=dddddddd-4444-4444-a444-444444444444
LEAD=00000000-0000-4000-d000-000000000003

build_template() {
  psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $TPL" -c "create database $TPL" >/dev/null
  psql -q -v ON_ERROR_STOP=1 -d "$TPL" -f "$DIR/supabase-shim.sql" >/dev/null 2>&1
  for m in "$DIR"/../migrations/000[1-8]_*.sql; do
    psql -q -v ON_ERROR_STOP=1 -d "$TPL" -f "$m" >/dev/null 2>&1
  done
  psql -q -d "$TPL" -c "revoke usage on schema gis from authenticated" >/dev/null 2>&1
  psql -q -v ON_ERROR_STOP=1 -d "$TPL" -f "$DIR/v41-backfill-seed.sql" >/dev/null 2>&1
  for f in APPLY_v41_A APPLY_v41_B1 APPLY_v41_B2 APPLY_v41_C APPLY_v41_FLIP; do
    psql -q -v ON_ERROR_STOP=1 -d "$TPL" -f "$DIR/../$f.sql" >/dev/null 2>&1
  done
}

fresh() {  # $1 = db name; a private copy of the healthy baseline
  psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $1" >/dev/null
  psql -q -v ON_ERROR_STOP=1 -d postgres -c "create database $1 template $TPL" >/dev/null
}

verdict() { psql -X -d "$1" -f "$PRE" -tA 2>/dev/null | grep '^99|' | cut -d'|' -f4; }
probe()   { psql -X -d "$1" -f "$PRE" -tA 2>/dev/null | grep "^$2|" | cut -d'|' -f3,4; }

# $1 case name   $2 probe ord   $3 sql that breaks it   $4 "verdict"|"note"
# A "verdict" case must flip probe $2 away from PASS AND flip the verdict to
# DO NOT APPLY. A "note" case must change the probe's text but is allowed to
# leave the verdict READY — those probes are advisory by design, and this
# script records which is which rather than pretending they are all blockers.
bite() {
  DB=rally_pf_bite
  fresh "$DB"
  before_p="$(probe "$DB" "$2")"; before_v="$(verdict "$DB")"
  case "$before_v" in
    READY*) : ;;
    *) bad "$1 (setup)" "the healthy baseline did not read READY, it read [$before_v]"; return;;
  esac
  psql -q -d "$DB" -c "$3" >/dev/null 2>&1 || true
  after_p="$(probe "$DB" "$2")"; after_v="$(verdict "$DB")"
  if [ "$before_p" = "$after_p" ]; then
    bad "$1" "probe $2 did not move: still [$after_p] — THE PROBE IS BLIND"
    return
  fi
  if [ "$4" = "verdict" ]; then
    case "$after_v" in
      "DO NOT APPLY"*) ok "$1 — probe $2 [$before_p] -> [$after_p], verdict blocks";;
      *) bad "$1" "probe moved to [$after_p] but the VERDICT still reads [$after_v]";;
    esac
  else
    ok "$1 — probe $2 [$before_p] -> [$after_p] (advisory; verdict stays [$after_v])"
  fi
}

echo "=== building the healthy baseline once ==="
build_template
DB=rally_pf_bite; fresh "$DB"
V="$(verdict "$DB")"
case "$V" in
  READY*) ok "0. the healthy baseline reads READY";;
  *) bad "0. the healthy baseline reads READY" "read [$V]";;
esac

echo
echo "=== every probe, deliberately broken ==="

# 1 — the function catalogue. Drop one of the 43 and the base check must fail.
bite "1. a missing v41 function is caught" 1 \
  "drop function if exists public.clear_pin_dnk(text,text,text) cascade" verdict

# 2 — the flip. Turn assignment authority back off.
bite "2. the flip being OFF is caught" 2 \
  "alter table public.rally_config disable trigger rally_config_guard;
   update public.rally_config set assignment_server_authoritative = false" verdict

# 3 — the territory triggers. Drop the assignment trigger.
bite "3. a missing territories trigger is caught" 3 \
  "drop trigger if exists territories_assignment on public.territories" verdict

# 4/5/6 — a PARTIAL v42. This is the state the apply cannot recover from on
# its own, so each half must be caught on its own.
bite "4. a PARTIALLY applied v42 (one territories column) is caught" 4 \
  "alter table public.territories add column seq bigint" verdict
bite "5. a PARTIALLY applied v42 (one events column) is caught" 5 \
  "alter table public.events add column territory_id text" verdict
bite "6. a PARTIALLY applied v42 (one function) is caught" 6 \
  "create function public.rally_territory_summary(text) returns jsonb language sql as \$\$ select '{}'::jsonb \$\$" verdict
# and the LAST column added is caught too — a probe that names only the
# columns it happened to know about when it was written is a probe that goes
# blind every time the migration grows one.
bite "6b. a PARTIAL v42 that only has the newest column is caught" 4 \
  "alter table public.territories add column cycle_keep_at timestamptz" verdict

# 7 — duplicate property rows. Two live pins for one property.
bite "7. duplicate property rows are counted" 7 \
  "insert into public.pins (team_id, id, lat, lng, address, disposition, data, created_by)
   values ('$TEAM','dupe-a',40.5,1.5,'1 Same St','unworked',
           '{\"prop\":{\"source\":\"osm\",\"externalId\":\"w-dupe\"}}'::jsonb,'$LEAD'),
          ('$TEAM','dupe-b',40.5,1.5,'1 Same St','unworked',
           '{\"prop\":{\"source\":\"osm\",\"externalId\":\"w-dupe\"}}'::jsonb,'$LEAD')" note

# 12 — a live hood the server cannot read the outline of. The import refuses
# these, so a manager must know before they hit one in the field.
# The condition cannot be REACHED through an ordinary write: 0016's overlap
# constraint refuses to let a live hood hold an unusable outline, and 0009
# refuses to derive one. It exists on production only as a LEGACY row that
# predates those rules. session_replication_role = replica suspends user
# triggers for the session, which is the only honest way to model a row that
# was already there before the rules were.
# THE CONDITION THAT ABORTS THE APPLY. It has to BLOCK, not advise: the
# backfill re-runs 0016 on every row and 0016 refuses a live hood whose
# outline the server cannot read. A two-point ring is such an outline.
bite "8. a live hood with an unreadable outline BLOCKS the apply" 12 \
  "set session_replication_role = replica;
   update public.territories set polygon = '[[9.0,40.0],[9.001,40.0]]'::jsonb, geom = null
    where deleted_at is null and archived = false and id = 'bf-live';
   set session_replication_role = origin" verdict

# ...and a live hood with a GOOD outline but no derived geometry must NOT
# block, because the backfill simply re-derives it. A preflight that refused
# this would stop a safe apply.
fresh "$DB"
psql -q -d "$DB" -c "set session_replication_role = replica;
  update public.territories set geom = null where id = 'bf-live';
  set session_replication_role = origin" >/dev/null 2>&1
V="$(verdict "$DB")"
case "$V" in
  READY*) ok "8b. a null geometry with a readable outline does NOT block";;
  *) bad "8b. a null geometry with a readable outline does NOT block" "read [$V]";;
esac

echo
echo "=== the probes must also survive HOSTILE data without raising ==="
# A preflight that throws tells the owner nothing. These are the shapes that
# have historically made a probe explode rather than report.
fresh "$DB"
psql -q -d "$DB" -c "insert into public.pins (team_id, id, lat, lng, address, disposition, data, created_by)
  values ('$TEAM','junk-1',40.5,1.5,'x','unworked','\"not-an-object\"'::jsonb,'$LEAD'),
         ('$TEAM','junk-2',40.5,1.5,'x','unworked','null'::jsonb,'$LEAD'),
         ('$TEAM','junk-3',40.5,1.5,'x','unworked','{\"prop\":\"a-string\"}'::jsonb,'$LEAD'),
         ('$TEAM','junk-4',40.5,1.5,'x','unworked','{\"prop\":{\"externalId\":null}}'::jsonb,'$LEAD')" >/dev/null 2>&1 || true
OUT="$(psql -X -d "$DB" -f "$PRE" -tA 2>&1 || true)"
case "$OUT" in
  *ERROR*) bad "9. malformed pin data does not break the preflight" "$(echo "$OUT" | grep -a ERROR | head -1)";;
  *READY*) ok "9. malformed pin data does not break the preflight";;
  *)       bad "9. malformed pin data does not break the preflight" "no verdict row came back";;
esac

# and it must be READ-ONLY. Prove it by running it as a role that cannot write.
fresh "$DB"
psql -q -d "$DB" -c "create role pf_readonly login" >/dev/null 2>&1 || true
# SELECT plus EXECUTE, and no write privilege of any kind. The preflight
# calls rally_ring_problem, which is a read; the point of this case is that
# nothing it does needs INSERT, UPDATE, DELETE or DDL.
psql -q -d "$DB" -c "grant usage on schema public, gis to pf_readonly;
  grant select on all tables in schema public to pf_readonly;
  grant execute on all functions in schema public to pf_readonly;
  grant execute on all functions in schema gis to pf_readonly" >/dev/null 2>&1 || true
RO="$(PGUSER=pf_readonly psql -X -d "$DB" -f "$PRE" -tA 2>&1 || true)"
case "$RO" in
  *"READY"*|*"DO NOT APPLY"*) ok "10. the preflight runs with SELECT privileges only — it writes nothing";;
  *) bad "10. the preflight runs with SELECT privileges only" "$(echo "$RO" | grep -a -i 'error\|denied' | head -1)";;
esac

psql -q -d postgres -c "drop database if exists rally_pf_bite" >/dev/null 2>&1 || true
psql -q -d postgres -c "drop database if exists $TPL" >/dev/null 2>&1 || true

echo
echo "================================================================"
echo "PASS $pass   FAIL $fail"
[ "$fail" -eq 0 ] || exit 1
