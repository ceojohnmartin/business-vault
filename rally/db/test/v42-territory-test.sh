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
FPSTAMP="select md5(string_agg(id||updated_at::text, '|' order by id)) from public.territories"

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
BEFORE_STAMP=$(q "$FPSTAMP")
BEFORE_PINSTAMP=$(q "select coalesce(md5(string_agg(id||updated_at::text,'|' order by id)),'(none)') from public.pins")
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
# updated_at is NOT in that fingerprint, and it is the one thing that must
# move: the client pulls territories on an updated_at cursor, so a row whose
# stamp did not change is a row no phone ever asks for again — seq and uuid
# would exist on the server and nowhere else.
if [ "$(q "$FPSTAMP")" = "$BEFORE_STAMP" ]; then
  bad "1b2. every territory's updated_at moved, so the new columns reach devices" \
      "the stamps are unchanged — no phone would ever pull the new columns"
else
  ok "1b2. every territory's updated_at moved, so the new columns reach devices"
fi
eq "1b3. and no PIN row was touched at all" \
   "$(q "select coalesce(md5(string_agg(id||updated_at::text,'|' order by id)),'(none)') from public.pins")" "$BEFORE_PINSTAMP"
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
# EVERY FIXTURE BELOW IS PLACED SO THAT ONLY THE TIER UNDER TEST CAN MATCH.
# The first version of this section put the "tier 3" door 4 cm from its
# target, which is also inside tier 4's 12 m radius — so it passed whether
# tier 3 existed or not. 40 m is outside tier 4 and inside tier 3; the
# negative cases below pin the far edge of each bound.
# 40 m away, with a DIFFERENT address and no parcel — so tiers 2, 3 and 4
# are all excluded and only the provider's own id can match. Re-sending the
# identical payload (which the first version of this case did) proves
# nothing: at 0 m tiers 3 and 4 both match, so tier 1 could be deleted and
# the case would still pass.
TIER1='[{"lat":41.001362,"lng":6.001,"address":"1 A St MOVED","source":"osm","externalId":"w1"}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$TIER1'::jsonb,'op-2')")
has "4a. tier 1 — the provider's own id matches 40 m away under another address" "$R" '"inserted": 0'
eq  "4b. still two doors" "$(q "select count(*) from public.pins where territory_id='t-imp'")" "2"

psql -X -q -d "$DB" -c "update public.pins set data = jsonb_set(data,'{prop,parcelId}','\"P-9\"') where territory_id='t-imp' and address='1 A St'" >/dev/null
# 40 m away, a different provider and a different address — so tier 1, tier 3
# and tier 4 are all excluded and ONLY the parcel number can match.
MOVED='[{"lat":41.001362,"lng":6.001,"address":"1 A St RENAMED","source":"regrid","externalId":"other","parcelId":"P-9"}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$MOVED'::jsonb,'op-3')")
has "4c. tier 2 — a different provider 40 m away, same parcel, matches" "$R" '"inserted": 0'

# 40 m away, same address, no parcel and an unknown provider — only tier 3.
NEARBY='[{"lat":41.002362,"lng":6.002,"address":"2 A St","source":"melissa","externalId":"m1"}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$NEARBY'::jsonb,'op-4')")
has "4d. tier 3 — same address 40 m away matches" "$R" '"inserted": 0'

# no address, NO IDS AT ALL, half a metre away — only tier 4 can catch this
# one. It carried a provider id in the first version, which made it a tier-1
# candidate as well as a tier-4 one.
BARE='[{"lat":41.0010005,"lng":6.0010005}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$BARE'::jsonb,'op-5')")
has "4e. tier 4 — a bare centroid on a known roof matches" "$R" '"inserted": 0'
eq  "4f. after four re-imports there are still exactly two doors" \
    "$(q "select count(*) from public.pins where territory_id='t-imp'")" "2"

# THE FAR EDGE OF EACH BOUND. A matcher that matches everything is not a
# matcher; these prove the distances are real and that a genuinely new house
# still gets its own pin.
FAR3='[{"lat":41.003809,"lng":6.002,"address":"2 A St","source":"melissa","externalId":"m2"}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$FAR3'::jsonb,'op-4b')")
has "4g. tier 3 stops at 120 m — the same street number 200 m away is a NEW house" "$R" '"inserted": 1'
FAR4='[{"lat":41.001271,"lng":6.001}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$FAR4'::jsonb,'op-5b')")
has "4h. tier 4 stops at 12 m — a bare centroid 30 m away is a NEW house" "$R" '"inserted": 1'
eq  "4i. so the two genuinely new houses were created, and only those" \
    "$(q "select count(*) from public.pins where territory_id='t-imp'")" "4"

# TIER 4 AND IDENTITY. Distance alone collapses a duplex; refusing distance
# whenever an id is present duplicates the door a rep placed by hand. The
# rule is that tier 4 stands aside only when BOTH sides carry an identity
# and they disagree — so both of these must hold at once.
DUPA='[{"lat":41.0015,"lng":6.0015,"address":"5 Duplex St","source":"osm","externalId":"dup-a"}]'
DUPB='[{"lat":41.00150269,"lng":6.0015,"address":"5B Duplex St","source":"osm","externalId":"dup-b"}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$DUPA'::jsonb,'op-dup-a')")
has "4j. one half of a duplex is created" "$R" '"inserted": 1'
R=$(as_lead "select public.import_territory_doors('t-imp','$DUPB'::jsonb,'op-dup-b')")
has "4k. the OTHER half, 3 m away with its own provider id, is NOT swallowed" "$R" '"inserted": 1'
# and the hand-placed door, which carries no identity at all, still de-dupes
psql -X -q -d "$DB" -c "insert into public.pins (team_id, id, lat, lng, address, disposition, data, created_by)
  values ('$TEAM','byhand-1',41.0016,6.0016,'7 Byhand St','goback',
          '{\"id\":\"byhand-1\",\"history\":[{\"ts\":1,\"disposition\":\"goback\"}]}'::jsonb,'$LEAD')" >/dev/null
BYHAND='[{"lat":41.00160269,"lng":6.0016,"address":"7 Byhand Street","source":"osm","externalId":"bh-1"}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$BYHAND'::jsonb,'op-byhand')")
has "4l. an identified door 3 m from a hand-placed pin does NOT create a second one" "$R" '"inserted": 0'
eq  "4m. and the rep's outcome on that door is untouched" \
    "$(q "select disposition from public.pins where id='byhand-1'")" "goback"

echo
echo "=== 5. THE IMPORT: WHAT IT REFUSES ==="
OUT='[{"lat":41.5,"lng":6.5,"address":"far away","source":"osm","externalId":"far"}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$OUT'::jsonb,'op-6')")
has "5a. a door outside the polygon is rejected"  "$R" '"outside": 1'
has "5b. and not created"                          "$R" '"inserted": 0'
eq  "5c. it exists nowhere" "$(q "select count(*) from public.pins where address='far away'")" "0"
# COORDINATE FORMATS THE IMPORT MUST ACCEPT. The first guard here was a
# regex that capped the fraction at 15 digits and rejected exponents, so a
# provider sending an ordinary high-precision centroid lost its house
# silently. Each of these is a legitimate coordinate inside the polygon.
PREC='[{"lat":41.0031234567890123,"lng":6.0031234567890123,"source":"p","externalId":"prec-1"},
       {"lat":"41.00325","lng":"6.00325","source":"p","externalId":"prec-2"},
       {"lat":4.100335e1,"lng":6.00335,"source":"p","externalId":"prec-3"},
       {"lat":41,"lng":6.0034,"source":"p","externalId":"prec-4"}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$PREC'::jsonb,'op-prec')")
has "5h. a 16-digit centroid, a string, exponent notation and a bare integer are all read" \
    "$R" '"unusable": 0'
has "5i. and none of them was silently dropped" "$R" '"inserted": 4'

JUNK='[{"lat":"nope","lng":6.001},{"lat":91,"lng":6.001},{"lng":6.001}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$JUNK'::jsonb,'op-7')")
has "5d. unusable coordinates are counted, never guessed" "$R" '"unusable": 3'
# RESIDENTIAL ONLY — the server checks, it does not take the client's word.
NONRES='[{"lat":41.0005,"lng":6.0005,"address":"Parish School","source":"osm","externalId":"school-1","eligible":false}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$NONRES'::jsonb,'op-7b')")
has "5d2. a door the provider judged non-residential is refused" "$R" '"ineligible": 1'
has "5d3. and not created"                                       "$R" '"inserted": 0'
eq  "5d4. it exists nowhere" "$(q "select count(*) from public.pins where address='Parish School'")" "0"

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
# THE RE-STAMP, IN BOTH DIRECTIONS. A matched door joins the hood it was
# imported into only when it does not already belong to a LIVE one.
psql -X -q -d "$DB" -c "insert into public.pins (team_id, id, lat, lng, address, disposition, territory_id, data, created_by)
  values ('$TEAM','orphan-1',41.0025,6.0025,'7 Orphan St','unworked',null,
          '{\"prop\":{\"source\":\"osm\",\"externalId\":\"orphan-w\"}}'::jsonb,'$LEAD')" >/dev/null
R=$(as_lead "select public.import_territory_doors('t-imp','[{\"lat\":41.0025,\"lng\":6.0025,\"source\":\"osm\",\"externalId\":\"orphan-w\"}]'::jsonb,'op-11b')")
eq "6d. a matched door with NO hood is adopted by the one being imported" \
   "$(q "select territory_id from public.pins where id='orphan-1'")" "t-imp"

mk t-arch "$(sq 6.020 41.0 0.004)"
psql -X -q -d "$DB" -c "update public.territories set archived = true where team_id='$TEAM' and id='t-arch'" >/dev/null
psql -X -q -d "$DB" -c "insert into public.pins (team_id, id, lat, lng, address, disposition, territory_id, data, created_by)
  values ('$TEAM','stranded-1',41.0026,6.0026,'8 Stranded St','unworked','t-arch',
          '{\"prop\":{\"source\":\"osm\",\"externalId\":\"stranded-w\"}}'::jsonb,'$LEAD')" >/dev/null
R=$(as_lead "select public.import_territory_doors('t-imp','[{\"lat\":41.0026,\"lng\":6.0026,\"source\":\"osm\",\"externalId\":\"stranded-w\"}]'::jsonb,'op-11c')")
eq "6e. a door stranded in an ARCHIVED hood is adopted too" \
   "$(q "select territory_id from public.pins where id='stranded-1'")" "t-imp"

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

# THE HOLE THE PANEL FOUND: naming a KEY is not naming a VALUE. `->>` on an
# object returns the whole object serialised, so a provider that answers
# owner: {name, ethnicity, ...} had its entire response stored under an
# allowlisted key. js/property.js already builds `owner` as an object.
NEST='[{"lat":41.0037,"lng":6.0037,"address":"11 Nest St","source":"regrid","externalId":"nest1",
        "owner":{"name":"Jane Doe","mailingAddress":"9 Elm","ethnicity":"REDACTED-TEST",
                 "race":"REDACTED-TEST","estimatedIncome":"120000"},
        "propertyType":{"nested":"x","ethnicity":"REDACTED-TEST"},
        "city":{"weird":"obj"},"yearBuilt":["1994","REDACTED-TEST"]}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$NEST'::jsonb,'op-nest')")
has "7e. the door is created" "$R" '"inserted": 1'
NESTED=$(q "select data::text from public.pins where address='11 Nest St'")
case "$NESTED" in
  *REDACTED-TEST*|*estimatedIncome*|*ethnicity*|*race*)
    bad "7f. a protected characteristic nested UNDER an allowlisted key is not stored" "$NESTED";;
  *) ok "7f. a protected characteristic nested UNDER an allowlisted key is not stored";;
esac
eq "7g. the two owner subkeys RALLY does name are kept" \
   "$(q "select (data->'prop'->'owner'->>'name') || '|' || (data->'prop'->'owner'->>'mailingAddress')
           from public.pins where address='11 Nest St'")" "Jane Doe|9 Elm"
eq "7h. an OBJECT under a scalar key becomes null, not a serialised blob" \
   "$(q "select coalesce(data->'prop'->>'propertyType','(null)') from public.pins where address='11 Nest St'")" "(null)"
eq "7i. an ARRAY under a scalar key becomes null too" \
   "$(q "select coalesce(data->'prop'->>'yearBuilt','(null)') from public.pins where address='11 Nest St'")" "(null)"
eq "7j. and an object in a geo field does not become the city name" \
   "$(q "select data->'geo'->>'city' from public.pins where address='11 Nest St'")" ""
# an OBJECT where an identifier should be must not become an identifier
OBJID='[{"lat":41.0038,"lng":6.0038,"address":"12 Nest St","source":"regrid",
         "externalId":{"a":"b"},"parcelId":{"c":"d"}}]'
R=$(as_lead "select public.import_territory_doors('t-imp','$OBJID'::jsonb,'op-objid')")
eq "7k. an object where an externalId should be is not stored as one" \
   "$(q "select coalesce(data->'prop'->>'externalId','(null)') from public.pins where address='12 Nest St'")" "(null)"

echo
echo "=== 7b. AN ACTIVITY ROW SAYS WHERE AND WHAT IT CHANGED ==="
# Exactly the payload js/sync.js builds today: eight columns, no territory_id,
# no prev_disposition, everything else in the blob. A v37 or v40 phone that
# will never be rebuilt sends this too. The server must fill both columns.
psql -X -q -d "$DB" -c "update public.pins set
  data = jsonb_set(data,'{history}','[{\"ts\":1700000000000,\"disposition\":\"nothome\"},
                                      {\"ts\":1700000500000,\"disposition\":\"goback\"},
                                      {\"ts\":1700009999999,\"disposition\":\"dnk_clear\"}]')
  where team_id='$TEAM' and id='$PIN'" >/dev/null
psql -X -q -d "$DB" -c "insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user, data)
  values ('$TEAM','ev-ctx-1','$PIN','knock','notint',1700001000000,'$JOHN',
          '{\"id\":\"ev-ctx-1\",\"pinId\":\"$PIN\",\"disposition\":\"notint\",\"territoryId\":\"t-imp\"}'::jsonb)" >/dev/null
eq "7b1. the hood is filled from what the client already sends" \
   "$(q "select territory_id from public.events where id='ev-ctx-1'")" "t-imp"
eq "7b2. the previous status is derived from the door's own history" \
   "$(q "select prev_disposition from public.events where id='ev-ctx-1'")" "goback"

# with no territoryId in the blob at all, the door's own stamp answers
psql -X -q -d "$DB" -c "insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user, data)
  values ('$TEAM','ev-ctx-2','$PIN','knock','sold',1700002000000,'$JOHN',
          '{\"id\":\"ev-ctx-2\",\"pinId\":\"$PIN\",\"disposition\":\"sold\"}'::jsonb)" >/dev/null
eq "7b3. a blob with no hood falls back to the door's stamp" \
   "$(q "select territory_id from public.events where id='ev-ctx-2'")" "t-imp"

# a dnk_clear is an administrative act, not a previous STATUS
psql -X -q -d "$DB" -c "insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user, data)
  values ('$TEAM','ev-ctx-3','$PIN','knock','nothome',1700099999999,'$JOHN',
          '{\"id\":\"ev-ctx-3\",\"pinId\":\"$PIN\",\"disposition\":\"nothome\"}'::jsonb)" >/dev/null
eq "7b4. a dnk_clear is never reported as a previous status" \
   "$(q "select prev_disposition from public.events where id='ev-ctx-3'")" "goback"

# the very first knock at a door has no previous status, and must say so
# rather than inventing one
psql -X -q -d "$DB" -c "insert into public.pins (team_id, id, lat, lng, address, disposition, territory_id, data, created_by)
  values ('$TEAM','fresh-door',41.0015,6.0015,'5 Fresh St','unworked','t-imp',
          '{\"history\":[]}'::jsonb,'$LEAD')" >/dev/null
psql -X -q -d "$DB" -c "insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user, data)
  values ('$TEAM','ev-ctx-4','fresh-door','knock','nothome',1700003000000,'$JOHN',
          '{\"id\":\"ev-ctx-4\",\"pinId\":\"fresh-door\",\"disposition\":\"nothome\"}'::jsonb)" >/dev/null
eq "7b5. a first knock has no previous status and does not invent one" \
   "$(q "select coalesce(prev_disposition,'(null)') from public.events where id='ev-ctx-4'")" "(null)"

# an RPC that already knows the answer keeps its own value
eq "7b6. a value the caller supplied is never overwritten" \
   "$(q "select territory_id from public.events where type='territory_import' limit 1")" "t-imp"

# and malformed history must not break a knock
psql -X -q -d "$DB" -c "update public.pins set data='\"a-scalar\"'::jsonb where team_id='$TEAM' and id='fresh-door'" >/dev/null
OUT=$(psql -X -d "$DB" -tAc "insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user, data)
  values ('$TEAM','ev-ctx-5','fresh-door','knock','notint',1700004000000,'$JOHN','{}'::jsonb)" 2>&1 || true)
case "$OUT" in
  *ERROR*) bad "7b7. a door whose data is a JSON scalar does not break the knock" "$OUT";;
  *) ok "7b7. a door whose data is a JSON scalar does not break the knock";;
esac

echo
echo "=== 8. RESET FOR RE-KNOCK ==="
BEFORE_HIST=$(q "select data->'history' from public.pins where id='$PIN'")
R=$(as_lead "select public.reset_territory_outcomes('t-imp','{nothome,notint,goback}'::text[],false,'r-1')")
has "8a. a leader can reset the three ordinary outcomes"  "$R" '"status": "ok"'
C1=$(q "select cycle_started_at from public.territories where id='t-imp'")
eq  "8b. the boundary moved"                 "$(q "select (cycle_started_at is not null)::text from public.territories where id='t-imp'")" "true"
eq  "8c. no door was written"                "$(q "select data->'history' from public.pins where id='$PIN'")" "$BEFORE_HIST"
eq  "8d. and its stored outcome is untouched" "$(q "select disposition from public.pins where id='$PIN'")" "notint"
eq  "8e. the reset is in the activity log" \
    "$(q "select count(*) from public.events where type='territory_reset' and territory_id='t-imp'")" "1"

# THE INVERSION THAT MATTERS. The manager ticks what BECOMES BLUE; the column
# stores the complement. Getting this backwards would blank a worked hood.
eq  "8f. the column stores the COMPLEMENT of what was ticked" \
    "$(q "select cycle_keep::text from public.territories where id='t-imp'")" "{unworked}"
R=$(as_lead "select public.reset_territory_outcomes('t-imp','{}'::text[],false,'r-1b')")
eq  "8g. ticking NOTHING keeps every outcome — the empty list is not 'reset everything'" \
    "$(q "select cycle_keep::text from public.territories where id='t-imp'")" "{goback,nothome,notint,unworked}"

R=$(as_lead "select public.reset_territory_outcomes('t-imp','{nothome,notint,goback}'::text[],false,'r-1')")
has "8h. the same operation id is answered, not re-run" "$R" "already_committed"

for combo in "{sold}" "{nothome,sold}" "{}" "{unworked,nothome,goback,notint,sold}"; do
  as_lead "select public.reset_territory_outcomes('t-imp','$combo'::text[],false,'r-keep-$combo')" >/dev/null
  K=$(q "select cycle_keep::text from public.territories where id='t-imp'")
  case "$K" in
    *dnk*) bad "8f2. a keep-list can never hold dnk (ticked $combo)" "got $K";;
    *sold*) bad "8f2. a keep-list can never hold sold (ticked $combo)" "got $K";;
    *) ok "8f2. ticking $combo leaves neither sold nor dnk in the keep-list";;
  esac
done
# why that matters, stated as the two failures it prevents:
#   a cleared do-not-knock would go black again at the next reset, because the
#   cleared dnk is still the newest KEPT outcome in the door's history and a
#   dnk_clear is not an outcome;
#   a door whose customer CANCELLED would stay green forever and never be
#   handed back to a rep.
R=$(as_lead "select public.reset_territory_outcomes('t-imp','{banana}'::text[],false,'r-3')")
has "8i. a bogus outcome name is refused" "$R" "is not an outcome"
# the four-letter TEXT "NULL", not a null — it is simply not an outcome
R=$(as_lead "select public.reset_territory_outcomes('t-imp','{nothome,\"NULL\"}'::text[],false,'r-3b')")
has "8j. the literal text NULL is treated as a typo, not a wildcard" "$R" "is not an outcome"
R=$(as_lead "select public.reset_territory_outcomes('t-imp',array['nothome',null]::text[],false,'r-3c')")
has "8k. a real SQL null in the list is refused too" "$R" "contains a null"
R=$(as_lead "select public.reset_territory_outcomes('t-imp','{dnk}'::text[],false,'r-3d')")
has "8l. ticking do-not-knock is refused and says where to go instead" "$R" "clear_pin_dnk"
R=$(as_lead "select public.reset_territory_outcomes('t-imp','{sold}'::text[],false,'r-3e')")
has "8m. ticking Sold is accepted, with a note that a live agreement still wins" "$R" "live agreement"
R=$(as_rep "select public.reset_territory_outcomes('t-imp','{nothome}'::text[],false,'r-4')")
has "8n. a rep cannot reset" "$R" "requires leader"

# A KEEP-LIST BELONGS TO ITS BOUNDARY. The plain Clear Outcomes button (0014,
# untouched by v42) moves the boundary and knows nothing about a keep-list;
# the stamp is what stops March's exemption surviving April's clear.
as_lead "select public.reset_territory_outcomes('t-imp','{nothome}'::text[],false,'r-6')" >/dev/null
eq "8o. a selective reset stamps the keep-list with its own boundary" \
   "$(q "select (cycle_keep_at = cycle_started_at)::text from public.territories where id='t-imp'")" "true"
as_lead "select public.start_territory_cycle('t-imp', null, 'cyc-1')" >/dev/null
eq "8p. a later plain Clear Outcomes leaves the stamp behind..." \
   "$(q "select (cycle_keep_at < cycle_started_at)::text from public.territories where id='t-imp'")" "true"
R=$(as_lead "select public.rally_territory_summary('t-imp')")
has "8q. ...so the summary stops reporting a keep-list that no longer applies" "$R" '"cycle_keep": []'

echo
echo "=== 8r. THE THREE THINGS THE PANEL FOUND, AS REGRESSIONS ==="
# "Polygon 22 of 15" — a number is never reused while the live count falls,
# so a denominator of live hoods renders N > M the moment anything is deleted.
R=$(as_lead "select public.rally_territory_summary('t-imp')")
SEQ=$(echo "$R" | sed -n 's/.*"seq": \([0-9]*\).*/\1/p')
OF=$(echo "$R"  | sed -n 's/.*"of": \([0-9]*\).*/\1/p')
if [ -n "$SEQ" ] && [ -n "$OF" ] && [ "$SEQ" -le "$OF" ]; then
  ok "8r1. the card can never read 'Polygon N of M' with N greater than M (got $SEQ of $OF)"
else
  bad "8r1. N must never exceed M" "seq=$SEQ of=$OF"
fi
has "8r2. and how many are live today is reported separately, not conflated" "$R" '"live_hoods"'

# A knock whose door row the server cannot see must not LOSE the hood the
# client already told it. SELECT ... INTO nulls every target when not found.
psql -X -q -d "$DB" -c "insert into public.events (team_id,id,pin_id,type,disposition,at_ms,by_user,data)
  values ('$TEAM','ev-nopin','no-such-pin','knock','nothome',1700005000000,'$JOHN',
          '{\"pinId\":\"no-such-pin\",\"territoryId\":\"t-imp\"}'::jsonb)" >/dev/null
eq "8r3. a knock on a door the server cannot see keeps the hood from the blob" \
   "$(q "select coalesce(territory_id,'(destroyed)') from public.events where id='ev-nopin'")" "t-imp"

# THE SQUAT. A rep can insert an event with any id and any type they like —
# events is INSERT-able by every team member, and the type and the blob it
# derives the hood from are both theirs to write. So the idempotency ledger
# cannot live there. §E3 moved it to a table with RLS on and no grants, and
# the audit event's own id is now server-minted, so a planted row cannot
# even collide with it. Both halves are asserted here.
psql -X -q -d "$DB" -tA -c "begin; select set_config('request.jwt.claims','{\"sub\":\"$JOHN\"}',true);
  set local role authenticated;
  insert into public.events (team_id,id,pin_id,type,disposition,at_ms,by_user,data)
  values ('$TEAM','import-VETO',null,'territory_import','',1,'$JOHN',
          '{\"territoryId\":\"t-imp\",\"counts\":{\"inserted\":99999,\"note\":\"rep wrote this\"}}'::jsonb);
  commit;" >/dev/null 2>&1
R=$(as_lead "select public.import_territory_doors('t-imp','[{\"lat\":41.0018,\"lng\":6.0018,\"source\":\"x\",\"externalId\":\"veto\"}]'::jsonb,'VETO')")
has "8r4. a planted event cannot veto a leader's import" "$R" '"status": "ok"'
case "$R" in
  *99999*|*"rep wrote this"*) bad "8r4b. and the rep's blob is never returned as the RPC's own result" "$R";;
  *) ok "8r4b. and the rep's blob is never returned as the RPC's own result";;
esac
eq  "8r5. the doors really were imported" \
    "$(q "select count(*) from public.pins where data->'prop'->>'externalId'='veto'")" "1"
DENIED=$(psql -X -d "$DB" -tA -c "begin; select set_config('request.jwt.claims','{\"sub\":\"$JOHN\"}',true);
  set local role authenticated; select count(*) from public.rally_operations; commit;" 2>&1 | tr '\n' ' ')
has "8r5b. and a rep cannot even read the ledger the answer comes from" \
    "$DENIED" "permission denied for table rally_operations"
# a GENUINE retry is still a retry: same counts, and nothing imported twice
BEFORE_VETO=$(q "select count(*) from public.pins where data->'prop'->>'externalId'='veto'")
R=$(as_lead "select public.import_territory_doors('t-imp','[{\"lat\":41.0018,\"lng\":6.0018,\"source\":\"x\",\"externalId\":\"veto\"}]'::jsonb,'VETO')")
has "8r6. the same operation id replayed is answered as a retry" "$R" '"already_committed"'
eq  "8r6b. and imports nothing a second time" \
    "$(q "select count(*) from public.pins where data->'prop'->>'externalId'='veto'")" "$BEFORE_VETO"
R=$(as_lead "select public.import_territory_doors('t-other','[{\"lat\":41.0011,\"lng\":6.0111,\"source\":\"x\",\"externalId\":\"veto2\"}]'::jsonb,'VETO')" )
has "8r6c. and reusing it against a DIFFERENT hood is an error, not a wrong answer" \
    "$R" "was already used for hood"

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
echo "=== 11. THE SUMMARY CARD, COMPARED TO REAL NUMBERS ==="
# The first version of this section only checked that the KEY NAMES were
# present, so every count could have been zero, or the same number twice,
# and it would have passed. The card is three numbers and they have to be
# the right three.
mk t-card "$(sq 8.0 41.0 0.004)"
CARD='[{"lat":41.001,"lng":8.001,"address":"1 Card St","source":"osm","externalId":"c1"},
       {"lat":41.002,"lng":8.002,"address":"2 Card St","source":"osm","externalId":"c2"},
       {"lat":41.003,"lng":8.003,"address":"3 Card St","source":"osm","externalId":"c3"}]'
R=$(as_lead "select public.import_territory_doors('t-card','$CARD'::jsonb,'op-card')")
has "11a. three doors were imported" "$R" '"inserted": 3'
SOLD=$(q "select id from public.pins where territory_id='t-card' and address='2 Card St'")
psql -X -q -d "$DB" -c "insert into public.customers (team_id, id, first, last, data, created_by)
  values ('$TEAM','cust-card','A','Customer',
          jsonb_build_object('id','cust-card','pinId','$SOLD','status','active'),'$LEAD')" >/dev/null
R=$(as_lead "select public.rally_territory_summary('t-card')")
CSEQ=$(echo "$R" | sed -n 's/.*"seq": \([0-9]*\).*/\1/p')
COF=$(echo  "$R" | sed -n 's/.*"of": \([0-9]*\).*/\1/p')
has "11b. it counts exactly the houses in this hood, not the team's"  "$R" '"houses": 3'
has "11c. and exactly the sales on those houses"                      "$R" '"sales": 1'
eq  "11d. the polygon number is this hood's own seq" \
    "$CSEQ" "$(q "select seq from public.territories where id='t-card'")"
eq  "11e. and 'of M' is the highest number ever issued to the team" \
    "$COF" "$(q "select max(seq) from public.territories where team_id='$TEAM'")"
eq  "11f. the uuid it carries is this hood's own" \
    "$(echo "$R" | sed -n 's/.*"uuid": "\([^"]*\)".*/\1/p')" \
    "$(q "select uuid from public.territories where id='t-card'")"
# a door leaving the hood must move the count, or the count is not a count
psql -X -q -d "$DB" -c "update public.pins set deleted_at = now()
  where team_id='$TEAM' and territory_id='t-card' and address='3 Card St'" >/dev/null
has "11g. deleting a door moves the house count" \
    "$(as_lead "select public.rally_territory_summary('t-card')")" '"houses": 2'
has "11h. and the sale count is unaffected by it" \
    "$(as_lead "select public.rally_territory_summary('t-card')")" '"sales": 1'

echo
echo "=== 11b. THE MATCHER'S TWO INDEXES ARE ACTUALLY USABLE ==="
# The bug this catches: the point index shipped on the GEOMETRY while tiers
# 3 and 4 compare ::geography, so the operator class did not match and both
# tiers were sequential scans — 500 doors took 73.0 s against 60,159 pins,
# where the client's own transport deadline (js/cloud.js) is 6 s. With the
# geography index it is 221 ms. Measured, both ways, on a 60k-pin replica.
#
# A plan test, not a stopwatch: on a small table the planner picks a seq
# scan on cost whatever indexes exist, so the question is whether the index
# CAN answer the predicate at all. enable_seqscan=off asks exactly that.
for idx in pins_point_live_geog_gist pins_address_live_idx; do
  eq "11b0. $idx exists" \
     "$(q "select count(*) from pg_class where relname='$idx'")" "1"
done
# team_id is deliberately left OUT of this probe. With it, the planner on a
# 20-row table happily answers from the team btree and filters the rest,
# which tells us nothing about the operator class — and the operator class
# is the whole bug: a geography predicate cannot use a geometry index at
# all. Without it, the GiST index is the only thing that can answer, so
# naming it in the plan is proof that it matches. (On the 60k-pin replica,
# with team_id present, the same query is 221 ms rather than 73 s.)
PLAN4=$(q "set enable_seqscan = off;
  explain (costs off) select id from public.pins
   where deleted_at is null
     and gis.st_dwithin(gis.st_setsrid(gis.st_makepoint(lng,lat),4326)::gis.geography,
                        gis.st_setsrid(gis.st_makepoint(6.001,41.001),4326)::gis.geography, 12)")
has "11b1. the 12 m tier can be answered from an index" "$PLAN4" "pins_point_live_geog_gist"
PLAN3=$(q "set enable_seqscan = off;
  explain (costs off) select id from public.pins
   where team_id='$TEAM' and deleted_at is null and lower(btrim(address)) = '1 a st'")
has "11b2. and the address tier too" "$PLAN3" "pins_address_live_idx"

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
echo "=== 13. MEMBERSHIP IS ONE FACT: THE COLUMN AND THE BLOB ==="
# THE PANEL FINDING, as a regression. The import wrote pins.territory_id and
# nothing else, while every RALLY client builds its local record from `data`
# alone and pushes the column back out of that record — so the membership
# never reached the phone, and the rep's very next knock wrote the column
# back to NULL. A hood imported minutes earlier reported "0 Houses".
#
# A client write needs the `authenticated` ROLE, not just a JWT claim:
# postgres is a superuser and ignores both column privileges and the
# current_user test the guard is built on. as() above deliberately does not
# switch role, because the RPCs must be called as their definer.
as_client() { psql -X -d "$DB" -tA -c "begin;
  select set_config('request.jwt.claims','{\"sub\":\"$1\"}',true);
  set local role authenticated; $2; commit;" 2>&1 | tr '\n' ' ' || true; }

mk t-mem "$(sq 6.100 41.1 0.004)"
# a property the team ALREADY holds, in no hood, exactly as a pre-import
# device would have it: the blob has no territoryId at all
psql -X -q -d "$DB" -c "insert into public.pins (team_id, id, lat, lng, address, disposition, territory_id, data, created_by)
  values ('$TEAM','mem-known',41.1015,6.1015,'3 Member St','unworked',null,
          '{\"id\":\"mem-known\",\"address\":\"3 Member St\",\"disposition\":\"unworked\",\"history\":[]}'::jsonb,'$LEAD')" >/dev/null
R=$(as_lead "select public.import_territory_doors('t-mem','[{\"lat\":41.1015,\"lng\":6.1015,\"address\":\"3 Member St\"}]'::jsonb,'op-mem-1')")
has "13a. the existing door is MATCHED, not duplicated" "$R" '"matched": 1'
eq  "13b. the column says the hood" \
    "$(q "select territory_id from public.pins where id='mem-known'")" "t-mem"
eq  "13c. AND THE BLOB SAYS IT TOO — this is what never reached the phone" \
    "$(q "select data->>'territoryId' from public.pins where id='mem-known'")" "t-mem"
eq  "13d. no live door anywhere disagrees with its own column" \
    "$(q "select count(*) from public.pins where deleted_at is null
          and jsonb_typeof(data) = 'object'
          and territory_id is not null and data->>'territoryId' is distinct from territory_id")" "0"
# ...and a door whose data is not an object at all is LEFT ALONE rather than
# blown up. 7b7 above deliberately makes one; jsonb_set on a scalar raises,
# and a guard that raised here would dead-letter an honest batch. There is
# no blob to keep in step on such a row, and the column still counts.
eq  "13d2. a door whose data is a JSON scalar is skipped, not raised on" \
    "$(q "select jsonb_typeof(data) || ':' || coalesce(territory_id,'(null)')
            from public.pins where id='fresh-door'")" "string:t-imp"

# THE PHONE THAT PULLED TOO EARLY. Its record still has no territoryId, so
# js/sync.js rowFor() sends territory_id = null with an honest knock.
as_client "$JOHN" "insert into public.pins (team_id,id,lat,lng,address,disposition,territory_id,created_by,data)
  values ('$TEAM','mem-known',41.1015,6.1015,'3 Member St','nothome',null,'$JOHN',
    '{\"id\":\"mem-known\",\"address\":\"3 Member St\",\"disposition\":\"nothome\",\"history\":[{\"ts\":1700000009000,\"disposition\":\"nothome\"}]}'::jsonb)
  on conflict (team_id,id) do update set lat=excluded.lat, lng=excluded.lng,
    address=excluded.address, disposition=excluded.disposition,
    territory_id=excluded.territory_id, data=excluded.data" >/dev/null
eq "13e. a stale phone cannot clear a door out of the hood it stands in" \
   "$(q "select coalesce(territory_id,'(CLEARED)') from public.pins where id='mem-known'")" "t-mem"
eq "13f. and the blob is corrected with it, so the phone learns on the echo" \
   "$(q "select data->>'territoryId' from public.pins where id='mem-known'")" "t-mem"
eq "13g. the rep's knock is KEPT — this neutralises, it does not refuse" \
   "$(q "select disposition from public.pins where id='mem-known'")" "nothome"
eq "13h. and so is the history they wrote" \
   "$(q "select jsonb_array_length(data->'history') from public.pins where id='mem-known'")" "1"
has "13i. so the card still counts the house" \
    "$(as_lead "select public.rally_territory_summary('t-mem')")" '"houses": 1'

# THE FOUR THINGS THE GUARD MUST NOT DO.
psql -X -q -d "$DB" -c "insert into public.pins (team_id,id,lat,lng,address,disposition,territory_id,data,created_by)
  values ('$TEAM','mem-outside',41.5,6.5,'far away','unworked','t-mem',
          '{\"id\":\"mem-outside\",\"territoryId\":\"t-mem\"}'::jsonb,'$LEAD')" >/dev/null
as_client "$JOHN" "update public.pins set territory_id=null,
  data='{\"id\":\"mem-outside\"}'::jsonb where team_id='$TEAM' and id='mem-outside'" >/dev/null
eq "13j. a door that is OUTSIDE the outline can still be dropped from it" \
   "$(q "select coalesce(territory_id,'(cleared)') from public.pins where id='mem-outside'")" "(cleared)"

mk t-mem-arch "$(sq 6.110 41.1 0.004)"
psql -X -q -d "$DB" -c "update public.territories set archived=true where team_id='$TEAM' and id='t-mem-arch'" >/dev/null
psql -X -q -d "$DB" -c "insert into public.pins (team_id,id,lat,lng,address,disposition,territory_id,data,created_by)
  values ('$TEAM','mem-arch',41.1015,6.1115,'4 Member St','unworked','t-mem-arch',
          '{\"id\":\"mem-arch\",\"territoryId\":\"t-mem-arch\"}'::jsonb,'$LEAD')" >/dev/null
as_client "$JOHN" "update public.pins set territory_id=null where team_id='$TEAM' and id='mem-arch'" >/dev/null
eq "13k. an ARCHIVED hood cannot hold a door hostage" \
   "$(q "select coalesce(territory_id,'(cleared)') from public.pins where id='mem-arch'")" "(cleared)"

as_client "$JOHN" "insert into public.pins (team_id,id,lat,lng,address,disposition,territory_id,created_by,data)
  values ('$TEAM','mem-withheld',41.1016,6.1016,'5 Member St','unworked',null,'$JOHN',
    '{\"id\":\"mem-withheld\",\"territoryId\":\"not-on-the-server-yet\"}'::jsonb)" >/dev/null
eq "13l. the sync WITHHOLD is untouched: the claim rides in the blob" \
   "$(q "select data->>'territoryId' from public.pins where id='mem-withheld'")" "not-on-the-server-yet"
eq "13m. and the column it withheld stays withheld" \
   "$(q "select coalesce(territory_id,'(null)') from public.pins where id='mem-withheld'")" "(null)"

mk t-mem-2 "$(sq 6.120 41.1 0.004)"
as_client "$JOHN" "update public.pins set territory_id='t-mem-2' where team_id='$TEAM' and id='mem-known'" >/dev/null
eq "13n. a MOVE between live hoods is a different act and is left alone" \
   "$(q "select territory_id from public.pins where id='mem-known'")" "t-mem-2"
eq "13o. and the blob follows the move, so the two never diverge" \
   "$(q "select data->>'territoryId' from public.pins where id='mem-known'")" "t-mem-2"

# and the guard is scoped to CLIENTS: the server's own functions and an
# owner's maintenance script are never second-guessed by it.
psql -X -q -d "$DB" -c "update public.pins set territory_id='t-mem' where team_id='$TEAM' and id='mem-known'" >/dev/null
psql -X -q -d "$DB" -c "update public.pins set territory_id=null where team_id='$TEAM' and id='mem-known'" >/dev/null
eq "13p. the owner can still clear a membership by hand" \
   "$(q "select coalesce(territory_id,'(cleared)') from public.pins where id='mem-known'")" "(cleared)"

echo
echo "================================================================"
echo "PASS $pass   FAIL $fail"
[ "$fail" -eq 0 ] || exit 1
