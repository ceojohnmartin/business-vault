#!/bin/sh
# RALLY v42 — 0018 PROVEN BEFORE IT IS APPLIED.
#   PGHOST=/tmp/pgrls/sock PGPORT=5544 sh rally/db/test/v42-territory-test.sh
#
# Builds a database in exactly production's state today — the Supabase shim,
# 0001..0008 with the v40-shaped seed, then Stage A, B1, B2, C and the
# assignment-authority flip — and proves, on that database:
#
#   1. 0018 changes NOT ONE existing row, and a second apply changes nothing;
#   2. a hood's number is server-assigned, per team, monotone, and fixed for
#      the hood's life — including across archive and re-shape — and is never
#      reused after a delete;
#   3. the import creates blue doors from real coordinates, refuses every
#      door outside the polygon, and NEVER creates a second pin for a
#      property it already holds, across all four match tiers;
#   4. a matched property keeps its outcome, its history and its customer —
#      an import is not allowed to touch anything but which hood a door is in;
#   5. only an allowlisted set of vendor fields is stored, whatever the
#      payload contains;
#   6. reset-for-re-knock moves one timestamp, writes one event, destroys no
#      history, and does not clear a do-not-knock;
#   7. a rep can do none of it, and no client may write a hood's number, its
#      uuid, or which outcomes a reset kept.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DB=rally_v42_test
export PGUSER="${PGUSER:-postgres}"
pass=0; fail=0
ok()  { pass=$((pass+1)); echo "PASS: $1"; }
bad() { fail=$((fail+1)); echo "FAIL: $1  --  $2"; }
eq()  { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "expected [$3] got [$2]"; fi; }
has() { case "$2" in *"$3"*) ok "$1";; *) bad "$1" "expected to contain [$3] got [$2]";; esac; }
q()  { psql -X -d "$DB" -tAc "$1"; }
qe() { psql -X -d "$DB" -tAc "$1" 2>&1 || true; }   # a refusal is the POINT

TEAM=dddddddd-4444-4444-a444-444444444444
JOHN=00000000-0000-4000-d000-000000000001
LEAD=00000000-0000-4000-d000-000000000003

# The RPCs are SECURITY DEFINER and read auth.uid(); postgres has no claim.
# The claim and the call must share one transaction — psql -c runs the whole
# string as one statement batch, so they do.
as() { psql -X -d "$DB" -tA -c "select set_config('request.jwt.claims','{\"sub\":\"$1\"}',true); $2" 2>&1 | tr '\n' ' ' || true; }
as_lead() { as "$LEAD" "$1"; }
as_rep()  { as "$JOHN" "$1"; }

# a square ring in degrees: $1 x0 $2 y0 $3 side
sq() { printf '[[%s,%s],[%s,%s],[%s,%s],[%s,%s]]' \
  "$1" "$2" "$(echo "$1 + $3" | bc -l)" "$2" \
  "$(echo "$1 + $3" | bc -l)" "$(echo "$2 + $3" | bc -l)" "$1" "$(echo "$2 + $3" | bc -l)"; }

mk() { # $1 id  $2 ring — insert a live hood as the leader would
  psql -X -q -d "$DB" -c "insert into public.territories
    (team_id, id, name, polygon, archived, data, assignees, assignees_rev, open_assignees, created_by)
    values ('$TEAM', '$1', '$1', '$2'::jsonb, false, '{}'::jsonb,
            '{\"entries\":[]}'::jsonb, 0, '{}'::uuid[], '$LEAD')" >/dev/null 2>&1
}

FPROWS="select md5((select md5(string_agg((team_id::text||id||name||polygon::text||coalesce(homes::text,'')||archived||coalesce(deleted_at::text,'')||data::text||assignees::text||assignees_rev||open_assignees::text||coalesce(cycle_started_at::text,'')||coalesce(geom::text,'')), '|' order by team_id, id)) from public.territories) || (select coalesce(md5(string_agg((team_id::text||id||disposition||data::text||coalesce(deleted_at::text,'')), '|' order by team_id, id)),'') from public.pins) || (select coalesce(md5(string_agg((team_id::text||id||type||coalesce(disposition,'')||data::text), '|' order by team_id, id)),'') from public.events))"
FPASSIGN="select md5(string_agg(team_id::text||id||assignees::text||assignees_rev::text||open_assignees::text, '|' order by team_id, id)) from public.territories"

build() {
  psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql" >/dev/null 2>&1
  for m in "$DIR"/../migrations/000[1-8]_*.sql; do
    psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m" >/dev/null 2>&1
  done
  psql -q -d "$DB" -c "revoke usage on schema gis from authenticated" >/dev/null 2>&1
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/v41-backfill-seed.sql" >/dev/null 2>&1
  for f in APPLY_v41_A APPLY_v41_B1 APPLY_v41_B2 APPLY_v41_C APPLY_v41_FLIP; do
    psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../$f.sql" >/dev/null 2>&1
  done
}

echo "=== building production's current state ==="
build
BEFORE_ROWS=$(q "$FPROWS"); BEFORE_ASSIGN=$(q "$FPASSIGN")
FLAG=$(q "select assignment_server_authoritative from public.rally_config")
eq "0. the base is production: the flip is live" "$FLAG" "t"

echo
echo "=== 1. THE APPLY ITSELF ==="
# db/APPLY_v42.sql, NOT the bare migration: production pastes ONE
# transaction, and a deferred constraint trigger on territories makes that
# form strictly harder than running the statements one at a time. Applying
# the migration file here would test a path production never takes.
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../APPLY_v42.sql" >/dev/null 2>&1 \
  && ok "1a. APPLY_v42.sql applies as ONE transaction" || bad "1a. APPLY_v42.sql applies as ONE transaction" "psql error"
eq "1b. not one territory, pin or event row changed" "$(q "$FPROWS")" "$BEFORE_ROWS"
eq "1c. the assignment ledger is byte-identical"    "$(q "$FPASSIGN")" "$BEFORE_ASSIGN"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../APPLY_v42.sql" >/dev/null 2>&1 \
  && ok "1d. applying it twice succeeds" || bad "1d. applying it twice succeeds" "psql error"
eq "1e. and still changes nothing" "$(q "$FPROWS")" "$BEFORE_ROWS"

# THE ROLLBACK, AND BACK AGAIN. The rollback drops what v42 added; the
# re-apply must then succeed on a database that has already seen it once.
CAT_BEFORE=$(q "select md5(string_agg(p.proname||':'||md5(p.prosrc), '|' order by p.proname)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'")
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../ROLLBACK_v42.sql" >/dev/null 2>&1 \
  && ok "1g. ROLLBACK_v42.sql runs" || bad "1g. ROLLBACK_v42.sql runs" "psql error"
eq "1h. and leaves every row untouched" "$(q "$FPROWS")" "$BEFORE_ROWS"
eq "1i. every v42 column is gone" \
   "$(q "select count(*) from information_schema.columns where table_schema='public' and ((table_name='territories' and column_name in ('seq','uuid','cycle_keep')) or (table_name='events' and column_name in ('territory_id','prev_disposition')))")" "0"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../APPLY_v42.sql" >/dev/null 2>&1 \
  && ok "1j. and v42 applies cleanly again afterwards" || bad "1j. and v42 applies cleanly again afterwards" "psql error"
eq "1k. with the same function catalog as the first time" \
   "$(q "select md5(string_agg(p.proname||':'||md5(p.prosrc), '|' order by p.proname)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'")" "$CAT_BEFORE"
eq "1l. and still not one row changed" "$(q "$FPROWS")" "$BEFORE_ROWS"
eq "1f. every existing hood was numbered" \
   "$(q "select count(*) = count(seq) and count(*) = count(distinct uuid) from public.territories")" "t"

echo
echo "=== 2. THE NUMBER ==="
mk t-one "$(sq 5.0 41.0 0.004)"
mk t-two "$(sq 5.010 41.0 0.004)"
N1=$(q "select seq from public.territories where id='t-one'")
N2=$(q "select seq from public.territories where id='t-two'")
eq "2a. the next hood takes the next number" "$N2" "$((N1 + 1))"
U1=$(q "select uuid from public.territories where id='t-one'")
psql -X -q -d "$DB" -c "update public.territories set name='renamed', archived=true where team_id='$TEAM' and id='t-one'" >/dev/null
eq "2b. renaming and archiving does not renumber"  "$(q "select seq from public.territories where id='t-one'")" "$N1"
eq "2c. and does not change the permanent uuid"    "$(q "select uuid from public.territories where id='t-one'")" "$U1"
psql -X -q -d "$DB" -c "update public.territories set seq=1, uuid='11111111-1111-4111-8111-111111111111' where team_id='$TEAM' and id='t-two'" >/dev/null 2>&1 || true
eq "2d. a write that tries to choose its own number is overridden" \
   "$(q "select seq from public.territories where id='t-two'")" "$N2"
psql -X -q -d "$DB" -c "update public.territories set deleted_at=now() where team_id='$TEAM' and id='t-two'" >/dev/null
mk t-three "$(sq 5.020 41.0 0.004)"
eq "2e. a number is never reused after a delete" \
   "$(q "select seq from public.territories where id='t-three'")" "$((N2 + 1))"

echo
echo "=== 3. THE IMPORT: AUTHORITY AND SHAPE ==="
mk t-imp "$(sq 6.0 41.0 0.004)"
IN='[{"lat":41.001,"lng":6.001,"address":"1 A St","source":"osm","externalId":"w1"},
     {"lat":41.002,"lng":6.002,"address":"2 A St","source":"osm","externalId":"w2"}]'
R=$(as_rep "select public.import_territory_doors('t-imp','$IN'::jsonb,'op-rep')")
has "3a. a rep cannot import" "$R" "requires leader"
R=$(as_lead "select public.import_territory_doors('t-imp','$IN'::jsonb,'op-1')")
has "3b. a leader can"                    "$R" '"status": "ok"'
has "3c. and both doors were created"     "$R" '"inserted": 2'
eq  "3d. every new door is blue" \
    "$(q "select count(*) from public.pins where territory_id='t-imp' and disposition='unworked'")" "2"
eq  "3e. and stamped with the hood" \
    "$(q "select count(*) from public.pins where territory_id='t-imp'")" "2"
R=$(as_lead "select public.import_territory_doors('t-imp','$IN'::jsonb,'op-1')")
has "3f. the same operation id is answered, not re-imported" "$R" "already_committed"
eq  "3g. still two doors" "$(q "select count(*) from public.pins where territory_id='t-imp'")" "2"

echo
echo "=== 4. THE IMPORT: NEVER A SECOND PIN FOR ONE PROPERTY ==="
R=$(as_lead "select public.import_territory_doors('t-imp','$IN'::jsonb,'op-2')")
has "4a. tier 1 — the provider's own id matches" "$R" '"inserted": 0'
eq  "4b. still two doors" "$(q "select count(*) from public.pins where territory_id='t-imp'")" "2"
MOVED='[{"lat":41.00105,"lng":6.00105,"address":"1 A St RENAMED","source":"regrid","externalId":"other","parcelId":"P-9"}]'
psql -X -q -d "$DB" -c "update public.pins set data = jsonb_set(data,'{prop,parcelId}','\"P-9\"') where territory_id='t-imp' and address='1 A St'" >/dev/null
R=$(as_lead "select public.import_territory_doors('t-imp','$MOVED'::jsonb,'op-3')")
has "4c. tier 2 — a different provider, same parcel, matches" "$R" '"inserted": 0'
NEARBY='[{"lat":41.0020004,"lng":6.0020004,"address":"2 A St","source":"melissa","externalId":"m1"}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$NEARBY'::jsonb,'op-4')")
has "4d. tier 3 — same address a few metres away matches" "$R" '"inserted": 0'
BARE='[{"lat":41.0010005,"lng":6.0010005,"source":"osm2","externalId":"z9"}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$BARE'::jsonb,'op-5')")
has "4e. tier 4 — a bare centroid on a known roof matches" "$R" '"inserted": 0'
eq  "4f. after four re-imports there are still exactly two doors" \
    "$(q "select count(*) from public.pins where territory_id='t-imp'")" "2"

echo
echo "=== 5. THE IMPORT: WHAT IT REFUSES ==="
OUT='[{"lat":41.5,"lng":6.5,"address":"far away","source":"osm","externalId":"far"}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$OUT'::jsonb,'op-6')")
has "5a. a door outside the polygon is rejected"  "$R" '"outside": 1'
has "5b. and not created"                          "$R" '"inserted": 0'
eq  "5c. it exists nowhere" "$(q "select count(*) from public.pins where address='far away'")" "0"
JUNK='[{"lat":"nope","lng":6.001},{"lat":91,"lng":6.001},{"lng":6.001}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$JUNK'::jsonb,'op-7')")
has "5d. unusable coordinates are counted, never guessed" "$R" '"unusable": 3'
R=$(as_lead "select public.import_territory_doors('t-imp','{}'::jsonb,'op-8')")
has "5e. a non-array payload is refused" "$R" "must be an array"
R=$(as_lead "select public.import_territory_doors('nope','$IN'::jsonb,'op-9')")
has "5f. an unknown hood is refused" "$R" "not found for this team"
psql -X -q -d "$DB" -c "update public.territories set archived=true where team_id='$TEAM' and id='t-imp'" >/dev/null
R=$(as_lead "select public.import_territory_doors('t-imp','$IN'::jsonb,'op-10')")
has "5g. an archived hood is refused" "$R" "not live"
psql -X -q -d "$DB" -c "update public.territories set archived=false where team_id='$TEAM' and id='t-imp'" >/dev/null

echo
echo "=== 6. A PROPERTY IS PERMANENT ==="
PIN=$(q "select id from public.pins where territory_id='t-imp' and address like '1 A St%' limit 1")
psql -X -q -d "$DB" -c "update public.pins set disposition='notint',
  data = jsonb_set(jsonb_set(data,'{disposition}','\"notint\"'),
                   '{history}','[{\"ts\":1700000000000,\"disposition\":\"notint\"}]')
  where team_id='$TEAM' and id='$PIN'" >/dev/null
R=$(as_lead "select public.import_territory_doors('t-imp','$IN'::jsonb,'op-11')")
eq "6a. a re-import does not reset a worked door" \
   "$(q "select disposition from public.pins where id='$PIN'")" "notint"
eq "6b. and does not touch its history" \
   "$(q "select jsonb_array_length(data->'history') from public.pins where id='$PIN'")" "1"
mk t-other "$(sq 6.010 41.0 0.004)"
R=$(as_lead "select public.import_territory_doors('t-other','[{\"lat\":41.001,\"lng\":6.001,\"source\":\"osm\",\"externalId\":\"w1\"}]'::jsonb,'op-12')")
eq "6c. an import cannot steal a door out of another live hood" \
   "$(q "select territory_id from public.pins where id='$PIN'")" "t-imp"

echo
echo "=== 7. THE VENDOR ALLOWLIST ==="
SNEAK='[{"lat":41.0035,"lng":6.0035,"address":"9 Allow St","source":"regrid","externalId":"allow1",
        "owner":"A Person","yearBuilt":"1994",
        "ethnicity":"REDACTED-TEST","race":"REDACTED-TEST","household_income":"120000",
        "religion":"REDACTED-TEST","raw":{"everything":"else"}}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$SNEAK'::jsonb,'op-13')")
has "7a. the door is created" "$R" '"inserted": 1'
STORED=$(q "select data::text from public.pins where address='9 Allow St'")
eq "7b. an allowlisted field is stored" \
   "$(q "select data->'prop'->>'yearBuilt' from public.pins where address='9 Allow St'")" "1994"
case "$STORED" in
  *REDACTED-TEST*|*household_income*|*ethnicity*|*religion*|*everything*)
    bad "7c. a protected-characteristic field is never stored" "found it in the row";;
  *) ok "7c. a protected-characteristic field is never stored";;
esac
eq "7d. the raw vendor object is not stored either" \
   "$(q "select (data->'prop' ? 'raw')::text from public.pins where address='9 Allow St'")" "false"

echo
echo "=== 8. RESET FOR RE-KNOCK ==="
BEFORE_HIST=$(q "select data->'history' from public.pins where id='$PIN'")
R=$(as_lead "select public.reset_territory_outcomes('t-imp','{}'::text[],false,'r-1')")
has "8a. a leader can reset"                 "$R" '"status": "ok"'
C1=$(q "select cycle_started_at from public.territories where id='t-imp'")
eq  "8b. the boundary moved"                 "$(q "select (cycle_started_at is not null)::text from public.territories where id='t-imp'")" "true"
eq  "8c. no door was written"                "$(q "select data->'history' from public.pins where id='$PIN'")" "$BEFORE_HIST"
eq  "8d. and its stored outcome is untouched" "$(q "select disposition from public.pins where id='$PIN'")" "notint"
eq  "8e. the reset is in the activity log" \
    "$(q "select count(*) from public.events where type='territory_reset' and territory_id='t-imp'")" "1"
R=$(as_lead "select public.reset_territory_outcomes('t-imp','{}'::text[],false,'r-1')")
has "8f. the same operation id is answered, not re-run" "$R" "already_committed"
eq  "8g. the boundary did not move again" "$(q "select cycle_started_at from public.territories where id='t-imp'")" "$C1"
R=$(as_lead "select public.reset_territory_outcomes('t-imp','{goback,sold}'::text[],false,'r-2')")
eq  "8h. a chosen keep-list is recorded" \
    "$(q "select cycle_keep::text from public.territories where id='t-imp'")" "{goback,sold}"
R=$(as_lead "select public.reset_territory_outcomes('t-imp','{banana}'::text[],false,'r-3')")
has "8i. a bogus outcome name is refused" "$R" "is not an outcome"
R=$(as_rep "select public.reset_territory_outcomes('t-imp','{}'::text[],false,'r-4')")
has "8j. a rep cannot reset" "$R" "requires leader"

echo
echo "=== 9. RESET DOES NOT CLEAR BLACK ==="
DPIN=$(q "select id from public.pins where territory_id='t-imp' and address='9 Allow St'")
psql -X -q -d "$DB" -c "update public.pins set disposition='dnk',
  data = jsonb_set(jsonb_set(data,'{disposition}','\"dnk\"'),
                   '{history}','[{\"ts\":1700000000000,\"disposition\":\"dnk\"}]')
  where team_id='$TEAM' and id='$DPIN'" >/dev/null
R=$(as_lead "select public.reset_territory_outcomes('t-imp','{}'::text[],true,'r-5')")
has "9a. the do-not-knock doors are returned for review" "$R" "$DPIN"
eq  "9b. and the door is still black" \
    "$(q "select disposition from public.pins where id='$DPIN'")" "dnk"
eq  "9c. no clear was forged into the log" \
    "$(q "select count(*) from public.events where type='dnk_clear' and pin_id='$DPIN'")" "0"
R=$(as_lead "select public.clear_pin_dnk('$DPIN','re-knock pass 2 approved','dnk-1')")
has "9d. the audited per-door clear still works" "$R" '"status": "ok"'
eq  "9e. and leaves its own indelible record" \
    "$(q "select count(*) from public.events where type='dnk_clear' and pin_id='$DPIN'")" "1"

echo
echo "=== 10. REMOVING A REP LOSES NOTHING ==="
as_lead "select public.set_territory_assignments('t-imp', array['$JOHN']::uuid[], 'as-1')" >/dev/null
eq "10a. the rep holds the hood" \
   "$(q "select ('$JOHN' = any(open_assignees))::text from public.territories where id='t-imp'")" "true"
P_BEFORE=$(q "select count(*) from public.pins where territory_id='t-imp'")
E_BEFORE=$(q "select count(*) from public.events where territory_id='t-imp'")
as_lead "select public.set_territory_assignments('t-imp', '{}'::uuid[], 'as-2')" >/dev/null
eq "10b. removing them empties the open set" \
   "$(q "select coalesce(array_length(open_assignees,1),0) from public.territories where id='t-imp'")" "0"
eq "10c. the hood is still there"        "$(q "select count(*) from public.territories where id='t-imp'")" "1"
eq "10d. every door is still there"      "$(q "select count(*) from public.pins where territory_id='t-imp'")" "$P_BEFORE"
eq "10e. every activity row is still there" "$(q "select count(*) from public.events where territory_id='t-imp'")" "$E_BEFORE"
eq "10f. the worked door kept its outcome" "$(q "select disposition from public.pins where id='$PIN'")" "notint"
eq "10g. and the assignment history was kept, not erased" \
   "$(q "select jsonb_array_length(assignees->'entries') > 0 from public.territories where id='t-imp'")" "t"

echo
echo "=== 11. THE SUMMARY CARD ==="
R=$(as_lead "select public.rally_territory_summary('t-imp')")
has "11a. it names the polygon number" "$R" '"seq"'
has "11b. it counts the houses"        "$R" '"houses"'
has "11c. it counts the sales"         "$R" '"sales"'
has "11d. and carries the permanent uuid" "$R" '"uuid"'

echo
echo "=== 12. NO CLIENT MAY WRITE A SERVER-OWNED COLUMN ==="
for c in seq uuid cycle_keep; do
  G=$(q "select count(*) from information_schema.column_privileges
          where table_name='territories' and grantee='authenticated'
            and column_name='$c' and privilege_type in ('INSERT','UPDATE')")
  eq "12. authenticated cannot write territories.$c" "$G" "0"
done
for c in seq uuid cycle_keep; do
  G=$(q "select count(*) from information_schema.column_privileges
          where table_name='territories' and grantee='authenticated'
            and column_name='$c' and privilege_type='SELECT'")
  eq "12. authenticated CAN read territories.$c (the pull sends no column list)" "$G" "1"
done
for c in territory_id prev_disposition; do
  G=$(q "select count(*) from information_schema.column_privileges
          where table_name='events' and grantee='authenticated'
            and column_name='$c' and privilege_type='SELECT'")
  eq "12. authenticated CAN read events.$c" "$G" "1"
done

echo
echo "================================================================"
echo "PASS $pass   FAIL $fail"
[ "$fail" -eq 0 ] || exit 1
