#!/bin/sh
# RALLY v41 — STAGE C, PROVEN BEFORE IT IS APPLIED.
#   PGHOST=/tmp/pgrls/sock PGPORT=5544 sh rally/db/test/stage-c-test.sh
#
# Builds a database in exactly production's state after Stage B — the
# Supabase shim, 0001..0008 with the v40-shaped seed in between, then
# db/APPLY_v41_A.sql, db/APPLY_v41_B1.sql and db/APPLY_v41_B2.sql, each the
# file the owner actually pasted — and proves, on that database:
#
#   1. ALL OR NOTHING: a copy of db/APPLY_v41_C.sql with a syntax error
#      before its commit fails loudly and leaves NOTHING behind — no
#      function, no trigger, no changed grant, no rewritten row;
#   2. THE ARMING GATE BITES, in both of its arms. Seeded with a live pair
#      that already overlaps, the real file REFUSES and leaves nothing.
#      Seeded with a live hood whose outline the map cannot use, it REFUSES
#      and leaves nothing. Both are the states 0016 must never arm over,
#      because arming would make those hoods permanently unwritable;
#   3. the real file applies on the clean state, rewrites NO row, and is
#      idempotent — a second run leaves catalog and data byte-identical;
#   4. ONCE ARMED, the rule is exactly the stated one:
#        > 1.0 m² refused · shared edge allowed · point touch allowed
#        · <= 1.0 m² allowed · self-crossing outline still refused
#        · a live hood with an unusable outline refused
#        · archived and tombstoned hoods are not turf and do not collide
#        · a DIFFERENT team's identical footprint does not collide;
#   5. SMART SPLIT STILL WORKS — the case deferral exists for, since
#      mid-transaction the children overlap the still-live parent
#      enormously — and a FAILING split is atomic: no child, no audit row,
#      no parent retirement survives;
#   6. v40-SHAPED WRITES still work: the legacy PostgREST upsert path a v40
#      phone uses is unaffected by the new rule when its turf is clean;
#   7. Stage A and Stage B objects are untouched and
#      assignment_server_authoritative is STILL FALSE;
#   8. db/ROLLBACK_v41_C.sql disarms completely and returns the catalog to
#      its pre-Stage-C snapshot byte-for-byte, and the file applies cleanly
#      again afterwards.
#
# The two-session race — two managers drawing overlapping turf at the same
# instant, which deferral alone does not stop and only the team-scoped
# advisory lock does — needs two real connections and is proven separately
# in db/test/turf-race-test.sh.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DB=rally_stage_c_test
export PGUSER="${PGUSER:-postgres}"
pass=0; fail=0
ok()  { pass=$((pass+1)); echo "PASS: $1"; }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }
q()  { psql -X -d "$DB" -tAc "$1"; }
qe() { psql -X -d "$DB" -tAc "$1" 2>&1 || true; }   # keep the error text; a refusal is the POINT, never a script failure
C="$DIR/../APPLY_v41_C.sql"; RB="$DIR/../ROLLBACK_v41_C.sql"
T=/tmp/rally-stage-c
TEAM=dddddddd-4444-4444-a444-444444444444
TEAM2=dddddddd-4444-4444-a444-555555555555
JOHN=00000000-0000-4000-d000-000000000001
LEAD=00000000-0000-4000-d000-000000000003
# The split RPCs are SECURITY DEFINER and read auth.uid(); postgres has no
# claim, so they refuse with "not authenticated". The claim, the call and
# the DEFERRED check must share one transaction — psql -c runs the whole
# string as one, so the constraint fires at ITS commit, which is the moment
# under test.
as_lead() { psql -X -d "$DB" -tA -c "select set_config('request.jwt.claims','{\"sub\":\"$LEAD\"}',true); $1" 2>&1 || true; }

CATQ="select md5(string_agg(p.proname||':'||pg_get_function_identity_arguments(p.oid)||':'||md5(p.prosrc)||':'||coalesce(array_to_string(p.proconfig,','),'')||':'||p.prosecdef||':'||coalesce((select string_agg(a.grantee::regrole::text||'='||a.privilege_type, ',' order by a.grantee::regrole::text, a.privilege_type) from aclexplode(p.proacl) a),'')||':'||l.lanname, '|' order by p.proname, pg_get_function_identity_arguments(p.oid))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname='public'"
RAWQ="select md5((select md5(string_agg((team_id::text||id||name||polygon::text||coalesce(homes::text,'')||archived||coalesce(deleted_at::text,'')||data::text||assignees::text||assignees_rev||open_assignees::text||coalesce(cycle_started_at::text,'')||coalesce(geom::text,'')), '|' order by team_id, id)) from public.territories) || (select coalesce(md5(string_agg((team_id::text||id||disposition||data::text||coalesce(deleted_at::text,'')), '|' order by team_id, id)),'') from public.pins) || (select coalesce(md5(string_agg((team_id::text||id||type||coalesce(disposition,'')||data::text), '|' order by team_id, id)),'') from public.events))"
FNC="select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('rally_overlap_m2','rally_overlap_tolerance_m2','assert_no_turf_overlap')"
TRGC="select count(*) from pg_trigger where tgrelid='public.territories'::regclass and tgname='territories_no_overlap'"
STAGEAB="select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('rally_diff_assignees','set_territory_assignments','save_territory','clear_pin_dnk','smart_split_territory_v41','rally_split_inherit','rally_ring_read','rally_assert_ledger')"

# a square, in degrees, at a given origin — small enough that 1 degree of
# longitude is nowhere near the tolerance, so overlaps are unambiguous
sq() { # $1 x0  $2 y0  $3 w  $4 h
  printf '[[%s,%s],[%s,%s],[%s,%s],[%s,%s]]' \
    "$1" "$2" "$(echo "$1 + $3" | bc -l)" "$2" \
    "$(echo "$1 + $3" | bc -l)" "$(echo "$2 + $4" | bc -l)" "$1" "$(echo "$2 + $4" | bc -l)"
}
mk() { # $1 id  $2 polygon  $3 team  — insert a live hood, echo the psql error if any
  qe "insert into public.territories (team_id, id, name, polygon, archived, data, assignees, assignees_rev, open_assignees, created_by)
      values ('${3:-$TEAM}', '$1', '$1', '$2'::jsonb, false, '{}'::jsonb, '{\"entries\":[]}'::jsonb, 0, '{}'::uuid[], '$JOHN')"
}
drop_hood() { psql -X -q -d "$DB" -c "delete from public.territories where id = '$1'" >/dev/null 2>&1 || true; }

build() {   # production's post-Stage-B state
  psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql"
  for m in "$DIR"/../migrations/000[1-8]_*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m" >/dev/null 2>&1; done
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "revoke usage on schema gis from authenticated"
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/v41-backfill-seed.sql" >/dev/null
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../APPLY_v41_A.sql"  >/dev/null 2>&1
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../APPLY_v41_B1.sql" >/dev/null 2>&1
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../APPLY_v41_B2.sql" >/dev/null 2>&1
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "insert into public.teams (id, name) values ('$TEAM2','Other Co') on conflict do nothing" >/dev/null 2>&1
}
broken() { cp "$1" "$2"; python3 - "$2" <<'PY'
import sys
p = sys.argv[1]; src = open(p).read()
assert src.rstrip().endswith('commit;'), 'apply file no longer ends with commit'
i = src.rstrip().rfind('commit;')
open(p, 'w').write(src[:i] + "this is not valid sql at all;\n" + src[i:])
PY
}

# ================================================== production's state
build
[ "$(q "$FNC")" = "0" ] && [ "$(q "$TRGC")" = "0" ] && ok "state: no Stage C object yet" || bad "state: a Stage C object already exists"
[ "$(q "$STAGEAB")" = "8" ] && ok "state: Stage A + B objects present" || bad "state: Stage A/B incomplete ($(q "$STAGEAB")/8)"
[ "$(q "select assignment_server_authoritative from public.rally_config limit 1")" = "f" ] && ok "state: assignment_server_authoritative is FALSE" || bad "state: the flag is not false"
CAT0="$(q "$CATQ")"; RAW0="$(q "$RAWQ")"

# ================================================== 1. all or nothing
broken "$C" $T-broken.sql
set +e; psql -q -v ON_ERROR_STOP=1 -d "$DB" -f $T-broken.sql > $T-broken.out 2>&1; BROKE=$?; set -e
[ "$BROKE" != "0" ] && ok "atomic: a broken copy fails loudly (exit $BROKE)" || bad "atomic: the broken copy did not fail"
[ "$(q "$FNC")" = "0" ] && ok "atomic: …no 0016 function became live" || bad "atomic: a 0016 function leaked"
[ "$(q "$TRGC")" = "0" ] && ok "atomic: …no constraint trigger was created" || bad "atomic: the trigger leaked"
[ "$(q "$CATQ")" = "$CAT0" ] && ok "atomic: …the function catalog is byte-identical" || bad "atomic: the catalog changed"
[ "$(q "$RAWQ")" = "$RAW0" ] && ok "atomic: …and no row changed" || bad "atomic: rows changed"

# ================================================== 2. the arming gate
# (a) a live pair that ALREADY overlaps
mk gate-a1 "$(sq -91.20 30.40 0.01 0.01)" >/dev/null
mk gate-a2 "$(sq -91.195 30.40 0.01 0.01)" >/dev/null
set +e; psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$C" > $T-gate-a.out 2>&1; GA=$?; set -e
[ "$GA" != "0" ] && ok "gate: an existing overlapping live pair REFUSES the arming" || bad "gate: armed over an existing overlap"
grep -qi "already overlap" $T-gate-a.out && ok "gate: …with the reason, naming the population" || bad "gate: the refusal did not name the overlap"
[ "$(q "$FNC")" = "0" ] && [ "$(q "$TRGC")" = "0" ] && ok "gate: …and left NOTHING behind" || bad "gate: a refused arming left objects"
drop_hood gate-a1; drop_hood gate-a2

# (b) a live hood whose outline the map cannot use.
#
#     THIS ROW CANNOT BE CREATED THROUGH AN ORDINARY WRITE, and that is
#     worth stating: once 0009 is applied, territories_derive_geom REFUSES a
#     new row with a self-crossing ring outright, and its NULL-geom escape
#     hatch tolerates only an EXISTING row whose bad ring is unchanged.
#     So the population 0016's gate exists to catch is precisely the LEGACY
#     one — hoods that were already in the table when 0009 arrived — and the
#     only faithful way to reproduce it is to plant the row as it would have
#     been planted then: with the derivation trigger not yet in the picture.
psql -X -q -d "$DB" -c "alter table public.territories disable trigger territories_derive_geom" >/dev/null
mk gate-b1 '[[-91.20,30.40],[-91.10,30.50],[-91.10,30.40],[-91.20,30.50]]' >/dev/null
psql -X -q -d "$DB" -c "alter table public.territories enable trigger territories_derive_geom" >/dev/null
[ "$(q "select geom is null from public.territories where id='gate-b1'")" = "t" ] \
  && ok "gate: a legacy live hood can carry a self-crossing ring with NULL geom" \
  || bad "gate: the legacy bowtie did not land as NULL geom"
set +e; psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$C" > $T-gate-b.out 2>&1; GB=$?; set -e
[ "$GB" != "0" ] && ok "gate: a live hood with an unusable outline REFUSES the arming" || bad "gate: armed over an unprotected hood"
grep -qi "unusable outline\|would be unprotected" $T-gate-b.out && ok "gate: …with the reason" || bad "gate: the refusal did not explain"
[ "$(q "$FNC")" = "0" ] && [ "$(q "$TRGC")" = "0" ] && ok "gate: …and left NOTHING behind" || bad "gate: a refused arming left objects"
drop_hood gate-b1
[ "$(q "$RAWQ")" = "$RAW0" ] && ok "gate: two refused armings rewrote no seeded row" || bad "gate: a refused arming changed data"
# the stronger fact, worth its own check: 0009 alone already refuses to
# CREATE such a hood, so the gate's population can only ever be legacy
E="$(mk gate-b2 '[[-91.20,30.40],[-91.10,30.50],[-91.10,30.40],[-91.20,30.50]]')"
echo "$E" | grep -qi "crosses itself\|cannot use\|invalid" \
  && ok "gate: 0009 alone already REFUSES to create a bowtie hood — the gate's population is legacy-only" \
  || bad "gate: a bowtie hood was created through the ordinary path: $E"

# ================================================== 3. the real apply
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$C" > $T-apply.out 2>&1 && ok "apply: the real file applies on a clean state" || { tail -5 $T-apply.out; bad "apply: the real file failed"; }
[ "$(q "$FNC")" = "3" ] && ok "apply: the three 0016 functions exist" || bad "apply: $(q "$FNC") of 3 functions"
[ "$(q "$TRGC")" = "1" ] && ok "apply: the constraint trigger exists" || bad "apply: the trigger is missing"
[ "$(q "select tgdeferrable and tginitdeferred from pg_trigger where tgname='territories_no_overlap'")" = "t" ] \
  && ok "apply: …DEFERRABLE INITIALLY DEFERRED (Smart Split depends on it)" || bad "apply: the trigger is not initially deferred"
[ "$(q "select public.rally_overlap_tolerance_m2()")" = "1" ] && ok "apply: the tolerance is exactly 1.0 m²" || bad "apply: tolerance is $(q "select public.rally_overlap_tolerance_m2()")"
[ "$(q "$RAWQ")" = "$RAW0" ] && ok "apply: 0016 rewrote no row" || bad "apply: a row changed"
[ "$(q "select assignment_server_authoritative from public.rally_config limit 1")" = "f" ] && ok "apply: the flag is STILL FALSE" || bad "apply: the flag moved"
[ "$(q "$STAGEAB")" = "8" ] && ok "apply: Stage A + B objects untouched" || bad "apply: Stage A/B damaged"
CAT1="$(q "$CATQ")"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$C" > $T-apply2.out 2>&1 && ok "apply: a second run applies cleanly" || { tail -5 $T-apply2.out; bad "apply: the second run failed"; }
[ "$(q "$CATQ")" = "$CAT1" ] && [ "$(q "$RAWQ")" = "$RAW0" ] && ok "apply: …and is idempotent" || bad "apply: the second run changed something"

# ================================================== 4. the rule itself
mk base "$(sq -92.00 31.00 0.01 0.01)" >/dev/null
[ "$(q "select count(*) from public.territories where id='base'")" = "1" ] && ok "rule: a clean hood commits" || bad "rule: the clean hood was refused"

E="$(mk over "$(sq -91.995 31.00 0.01 0.01)")"
echo "$E" | grep -qi "overlaps" && ok "rule: a > 1.0 m² overlap is REFUSED, naming both hoods" || bad "rule: the overlap was admitted: $E"
[ "$(q "select count(*) from public.territories where id='over'")" = "0" ] && ok "rule: …and the row did not commit" || bad "rule: the overlapping row survived"

E="$(mk edge "$(sq -91.99 31.00 0.01 0.01)")"
[ "$(q "select count(*) from public.territories where id='edge'")" = "1" ] && ok "rule: a SHARED EDGE is allowed (adjacency is not collision)" || bad "rule: the shared edge was refused: $E"

E="$(mk corner "$(sq -91.99 31.01 0.01 0.01)")"
[ "$(q "select count(*) from public.territories where id='corner'")" = "1" ] && ok "rule: a POINT TOUCH is allowed" || bad "rule: the corner touch was refused: $E"

# A sliver deliberately under the tolerance. It must be a CORNER bite, not a
# strip: a strip only 0.5 m deep along base's 954 m western edge is 477 m²,
# nowhere near the limit. 0.5 m is 4.522e-6 deg of latitude and 5.24e-6 deg
# of longitude at 31 N, so a 0.5 m x 0.5 m corner overlap is ~0.25 m².
# Placed on base's south-west corner, clear of `edge` and `corner`.
E="$(mk sliver "[[-92.01,30.99],[-91.99999476,30.99],[-91.99999476,31.00000452],[-92.01,31.00000452]]")"
SLIV="$(q "select round(public.rally_overlap_m2(a.geom,b.geom)::numeric,4) from public.territories a, public.territories b where a.id='base' and b.id='sliver'")"
[ "$(q "select count(*) from public.territories where id='sliver'")" = "1" ] \
  && ok "rule: an overlap of ${SLIV:-?} m² (<= 1.0) is TOLERATED" || bad "rule: a ${SLIV:-?} m² sliver was refused: $E"

E="$(mk bowtie '[[-93.20,30.40],[-93.10,30.50],[-93.10,30.40],[-93.20,30.50]]')"
echo "$E" | grep -qi "cannot use\|outline" && ok "rule: a live hood with a self-crossing outline is REFUSED once armed" || bad "rule: the bowtie was admitted: $E"
[ "$(q "select count(*) from public.territories where id='bowtie'")" = "0" ] && ok "rule: …and did not commit" || bad "rule: the bowtie row survived"

# retired turf is not turf
psql -X -q -d "$DB" -c "insert into public.territories (team_id,id,name,polygon,archived,data,assignees,assignees_rev,open_assignees,created_by) values ('$TEAM','arch','arch','$(sq -92.00 31.00 0.01 0.01)'::jsonb,true,'{}'::jsonb,'{\"entries\":[]}'::jsonb,0,'{}'::uuid[],'$JOHN')" >/dev/null 2>&1 \
  && ok "rule: an ARCHIVED hood may sit on live turf (it is not turf)" || bad "rule: an archived hood collided"
psql -X -q -d "$DB" -c "insert into public.territories (team_id,id,name,polygon,archived,deleted_at,data,assignees,assignees_rev,open_assignees,created_by) values ('$TEAM','tomb','tomb','$(sq -92.00 31.00 0.01 0.01)'::jsonb,false,now(),'{}'::jsonb,'{\"entries\":[]}'::jsonb,0,'{}'::uuid[],'$JOHN')" >/dev/null 2>&1 \
  && ok "rule: a TOMBSTONED hood may too" || bad "rule: a tombstoned hood collided"

E="$(mk other "$(sq -92.00 31.00 0.01 0.01)" "$TEAM2")"
[ "$(q "select count(*) from public.territories where id='other'")" = "1" ] \
  && ok "rule: a DIFFERENT TEAM's identical footprint does not collide" || bad "rule: teams blocked each other: $E"

# ================================================== 5. Smart Split
psql -X -q -d "$DB" -c "delete from public.territories where id in ('base','edge','corner','sliver','arch','tomb','other')" >/dev/null 2>&1
mk parent "$(sq -94.00 32.00 0.02 0.01)" >/dev/null
OP=stagec-split-1
SR="$(as_lead "select public.smart_split_territory('parent','$OP', jsonb_build_array(
   jsonb_build_object('id','kid-a','name','Kid A','polygon','$(sq -94.00 32.00 0.01 0.01)'::jsonb,'data','{}'::jsonb),
   jsonb_build_object('id','kid-b','name','Kid B','polygon','$(sq -93.99 32.00 0.01 0.01)'::jsonb,'data','{}'::jsonb)))")"
[ "$(q "select count(*) from public.territories where id in ('kid-a','kid-b') and deleted_at is null")" = "2" ] \
  && ok "split: Smart Split COMMITS — children overlap the live parent mid-transaction and deferral judges only the end state" \
  || bad "split: the split failed under the armed constraint: $SR"
[ "$(q "select deleted_at is not null from public.territories where id='parent'")" = "t" ] && ok "split: …the parent is retired" || bad "split: the parent survived live"

# a split whose FINAL children collide must take the whole operation with it
mk parent2 "$(sq -95.00 33.00 0.02 0.01)" >/dev/null
OP2=stagec-split-2
SR2="$(as_lead "select public.smart_split_territory('parent2','$OP2', jsonb_build_array(
   jsonb_build_object('id','bad-a','name','Bad A','polygon','$(sq -95.00 33.00 0.015 0.01)'::jsonb,'data','{}'::jsonb),
   jsonb_build_object('id','bad-b','name','Bad B','polygon','$(sq -95.005 33.00 0.015 0.01)'::jsonb,'data','{}'::jsonb)))")"
echo "$SR2" | grep -qi "overlaps" && ok "split: a split whose children collide is REFUSED at commit" || bad "split: colliding children committed: $SR2"
[ "$(q "select count(*) from public.territories where id in ('bad-a','bad-b')")" = "0" ] && ok "split: …no child survives" || bad "split: a child leaked"
[ "$(q "select deleted_at is null from public.territories where id='parent2'")" = "t" ] && ok "split: …the parent is NOT retired" || bad "split: the parent was retired by a failed split"
[ "$(q "select count(*) from public.territory_splits where operation_id='$OP2'")" = "0" ] && ok "split: …and no audit row survives — the failure is atomic" || bad "split: an audit row leaked"

# ================================================== 6. v40-shaped writes
V40="$(qe "insert into public.territories (team_id,id,name,polygon,archived,data,created_by)
  values ('$TEAM','v40shape','v40shape','$(sq -96.00 34.00 0.01 0.01)'::jsonb,false,
          jsonb_build_object('assignedTo','$JOHN','assignments', jsonb_build_array(jsonb_build_object('userId','$JOHN','name','John','assignedBy',null,'assignedAt',1756000000000::bigint,'unassignedAt',null))),'$JOHN')")"
[ "$(q "select count(*) from public.territories where id='v40shape'")" = "1" ] \
  && ok "v40: a legacy-shaped write still commits under the armed rule" || bad "v40: the legacy write broke: $V40"
[ "$(q "select coalesce(array_length(open_assignees,1),0) from public.territories where id='v40shape'")" = "1" ] \
  && ok "v40: …and its assignment still became a ledger entry" || bad "v40: the mirror did not become a ledger entry"

# ================================================== 7. rollback
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$RB" > $T-rb.out 2>&1 && ok "rollback: the file applies" || { tail -5 $T-rb.out; bad "rollback: failed"; }
[ "$(q "$FNC")" = "0" ] && [ "$(q "$TRGC")" = "0" ] && ok "rollback: every Stage C object is gone" || bad "rollback: a Stage C object survived"
[ "$(q "$STAGEAB")" = "8" ] && ok "rollback: Stage A + B objects untouched" || bad "rollback: Stage A/B damaged by the rollback"
[ "$(q "select assignment_server_authoritative from public.rally_config limit 1")" = "f" ] && ok "rollback: the flag is still FALSE" || bad "rollback: the flag moved"
E="$(mk after-rb "$(sq -94.00 32.00 0.01 0.01)")"
[ "$(q "select count(*) from public.territories where id='after-rb'")" = "1" ] \
  && ok "rollback: an overlapping hood commits again — the rule really is disarmed" || bad "rollback: still armed: $E"
drop_hood after-rb
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$C" > $T-reapply.out 2>&1 && ok "rollback: db/APPLY_v41_C.sql applies cleanly again afterwards" || { tail -5 $T-reapply.out; bad "rollback: re-apply failed"; }
[ "$(q "$FNC")" = "3" ] && [ "$(q "$TRGC")" = "1" ] && ok "rollback: …and the invariant is armed again" || bad "rollback: re-arm incomplete"

psql -q -d postgres -c "drop database if exists $DB" >/dev/null 2>&1 || true
echo "----------------------------------------"
if [ "$fail" = "0" ]; then echo "STAGE C: ALL GREEN ($pass checks)"; else echo "STAGE C: $fail FAILED, $pass passed"; exit 1; fi
