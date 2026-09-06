#!/bin/sh
# RALLY v41 — STAGE B, PROVEN BEFORE IT IS APPLIED.
#   PGHOST=/tmp/pgrls/sock PGPORT=5544 sh rally/db/test/stage-b-test.sh
#
# Builds a database in exactly production's state after Stage A — the
# Supabase shim, 0001..0008 with the v40-shaped seed in between, then
# db/APPLY_v41_A.sql itself — and proves, on that database:
#
#   1. ALL OR NOTHING, twice: a copy of db/APPLY_v41_B1.sql (0014) and a copy
#      of db/APPLY_v41_B2.sql (0015) with a syntax error before their commit
#      each fail loudly and leave NOTHING behind (no function, no rename, no
#      grant change, no rewritten row);
#   2. each real file applies, its verification paste reads 0 FAIL, and
#      NEITHER file rewrites a row — every territory, pin and event is
#      byte-identical before and after;
#   3. each is idempotent: a second run leaves the function catalog (bodies,
#      config, grants, language) and the data byte-identical — in
#      particular the certified 0005 body is renamed once, never twice;
#   4. v40 STILL WORKS after Stage B: a leader's exact PostgREST upsert
#      reassigns a hood through the legacy mirror; a rep knocks; a rep still
#      cannot draw turf; and a v40 Smart Split (the 0005 NAME) commits with
#      children that now INHERIT the parent's current rep — the one
#      documented behaviour change — while a severed split is still refused;
#   5. db/ROLLBACK_v41_B.sql returns the public function catalog to its
#      Stage A snapshot byte-for-byte (the certified body back under its own
#      name with 0005's grants), turfRpc reads false again, a v40 split makes
#      unassigned children again, no row changed — and both files apply
#      cleanly again afterwards; the rollback is also proven after PART 1
#      ALONE.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DB=rally_stage_b_test
export PGUSER="${PGUSER:-postgres}"
pass=0; fail=0
ok()  { pass=$((pass+1)); echo "PASS: $1"; }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }
q() { psql -X -d "$DB" -tAc "$1"; }
B1="$DIR/../APPLY_v41_B1.sql"; B2="$DIR/../APPLY_v41_B2.sql"; RB="$DIR/../ROLLBACK_v41_B.sql"
V1="$DIR/verify-v41-stage-b1.editor.sql"; V2="$DIR/verify-v41-stage-b2.editor.sql"
T=/tmp/rally-stage-b
CERT=8b856cf630126aee2f0776508b9d1743   # md5 of 0005's function body, LF line endings
TEAM=dddddddd-4444-4444-a444-444444444444
JOHN=00000000-0000-4000-d000-000000000001; JAKE=00000000-0000-4000-d000-000000000002; LEAD=00000000-0000-4000-d000-000000000003

# every public function: name, identity args, body md5, config, definer, ACL, language
CATQ="select md5(string_agg(p.proname||':'||pg_get_function_identity_arguments(p.oid)||':'||md5(p.prosrc)||':'||coalesce(array_to_string(p.proconfig,','),'')||':'||p.prosecdef||':'||coalesce(p.proacl::text,'')||':'||l.lanname, '|' order by p.proname, pg_get_function_identity_arguments(p.oid))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname='public'"
RAWQ="select md5((select md5(string_agg((team_id::text||id||name||polygon::text||coalesce(homes::text,'')||archived||coalesce(deleted_at::text,'')||data::text||assignees::text||assignees_rev||open_assignees::text||coalesce(cycle_started_at::text,'')||coalesce(geom::text,'')), '|' order by team_id, id)) from public.territories) || (select coalesce(md5(string_agg((team_id::text||id||disposition||data::text||coalesce(deleted_at::text,'')), '|' order by team_id, id)),'') from public.pins) || (select coalesce(md5(string_agg((team_id::text||id||type||coalesce(disposition,'')||data::text), '|' order by team_id, id)),'') from public.events))"
FN14="select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('rally_require_leader','rally_my_team','rally_diff_assignees','rally_validate_assignees','set_territory_assignments','save_territory','start_territory_cycle','clear_pin_dnk')"
FN15="select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('smart_split_territory_core','smart_split_territory_v41','rally_split_inherit','rally_split_strip_children')"
SPLITQ="select md5(replace(p.prosrc,E'\r\n',E'\n'))||' '||l.lanname||' '||coalesce(array_to_string(p.proconfig,','),'')||' auth='||has_function_privilege('authenticated',p.oid,'execute')||' anon='||has_function_privilege('anon',p.oid,'execute') from pg_proc p join pg_language l on l.oid=p.prolang where p.oid=to_regprocedure('public.smart_split_territory(text,text,jsonb)')"
SPLIT0="$CERT plpgsql search_path=public, pg_temp auth=true anon=false"

build() {   # production's post-Stage-A state
  psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql"
  for m in "$DIR"/../migrations/000[1-8]_*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m" >/dev/null 2>&1; done
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "revoke usage on schema gis from authenticated"
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/v41-backfill-seed.sql" >/dev/null
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../APPLY_v41_A.sql" >/dev/null 2>&1
}
broken() {  # $1 = source, $2 = output: a syntax error before the final commit
  cp "$1" "$2"
  python3 - "$2" <<'PY'
import sys
p = sys.argv[1]; src = open(p).read()
assert src.rstrip().endswith('commit;'), 'apply file no longer ends with commit'
i = src.rstrip().rfind('commit;')
open(p, 'w').write(src[:i] + "this is not valid sql at all;\n" + src[i:])
PY
}
verify() {  # $1 = verify file, $2 = label
  V="$(psql -X -v ON_ERROR_STOP=1 -d "$DB" -tA -F ' | ' -f "$1" 2>&1)" || { printf '%s\n' "$V" | tail -5; bad "$2: verify paste errored"; return; }
  NF="$(printf '%s\n' "$V" | grep -c 'FAIL' || true)"; NP="$(printf '%s\n' "$V" | grep -c ' | PASS | ' || true)"
  [ "$NF" = "0" ] && ok "$2: $NP PASS, 0 FAIL" || { printf '%s\n' "$V" | grep FAIL; bad "$2: $NF FAIL"; }
  printf '%s\n' "$V" | grep -q "D0 SETUP | PASS" && ok "$2: …behavioural probes ran (D0 SETUP found a real rep and a real leader)" || bad "$2: behavioural probes did not run"
  LEFT="$(q "select (select count(*) from public.territories where id like 'v41b-%') + (select count(*) from public.pins where id like 'v41b-%') + (select count(*) from public.events where id like '%v41b-%') + (select count(*) from public.territory_splits where operation_id like 'v41b-%')")"
  [ "$LEFT" = "0" ] && ok "$2: …and kept no row (every probe rolled back)" || bad "$2: left $LEFT probe row(s) behind"
}

# ------------------------------------------------ production's state
build
[ "$(q "select public.rally_capabilities()->>'turfRpc'")" = "false" ] && ok "state: turfRpc false after Stage A" || bad "state: turfRpc not false"
[ "$(q "$FN14")" = "0" ] && [ "$(q "$FN15")" = "0" ] && ok "state: no Stage B function yet" || bad "state: a Stage B function exists"
[ "$(q "$SPLITQ")" = "$SPLIT0" ] && ok "state: smart_split_territory is the certified 0005 body (md5 $CERT), plpgsql, public,pg_temp, authenticated only" || bad "state: smart_split_territory is not 0005's: $(q "$SPLITQ")"
CAT0="$(q "$CATQ")"; RAW0="$(q "$RAWQ")"

# --------------------------------------------------- 1. broken part 1
broken "$B1" $T-b1-broken.sql
set +e; psql -q -v ON_ERROR_STOP=1 -d "$DB" -f $T-b1-broken.sql > $T-b1-broken.out 2>&1; BROKE=$?; set -e
[ "$BROKE" != "0" ] && ok "part 1: a broken copy fails loudly (exit $BROKE)" || bad "part 1: broken copy did not fail"
[ "$(q "$FN14")" = "0" ] && ok "part 1: …and no 0014 function became live" || bad "part 1: a 0014 function leaked"
[ "$(q "$CATQ")" = "$CAT0" ] && ok "part 1: …the function catalog is byte-identical" || bad "part 1: catalog changed by a failed apply"
[ "$(q "$RAWQ")" = "$RAW0" ] && ok "part 1: …and no row changed" || bad "part 1: rows changed by a failed apply"

# ----------------------------------------------------- 2. real part 1
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$B1" > $T-b1.out 2>&1 && ok "part 1: the real file applies" || { tail -5 $T-b1.out; bad "part 1: the real file failed"; }
[ "$(q "$FN14")" = "8" ] && ok "part 1: the eight 0014 functions exist" || bad "part 1: $(q "$FN14") of 8 functions"
[ "$(q "select public.rally_capabilities()->>'turfRpc'")" = "false" ] && ok "part 1: turfRpc STILL false — no client changes behaviour on 0014 alone" || bad "part 1: turfRpc flipped early"
verify "$V1" "verify-v41-stage-b1"
[ "$(q "$RAWQ")" = "$RAW0" ] && ok "part 1: 0014 rewrote no row (territories, pins, events byte-identical)" || bad "part 1: a row changed"
CAT1="$(q "$CATQ")"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$B1" > $T-b1b.out 2>&1 && ok "part 1: a second run applies cleanly" || { tail -5 $T-b1b.out; bad "part 1: the second run failed"; }
[ "$(q "$CATQ")" = "$CAT1" ] && [ "$(q "$RAWQ")" = "$RAW0" ] && ok "part 1: …and is idempotent (catalog and data byte-identical)" || bad "part 1: the second run changed something"

# --------------------------------------------------- 3. broken part 2
broken "$B2" $T-b2-broken.sql
set +e; psql -q -v ON_ERROR_STOP=1 -d "$DB" -f $T-b2-broken.sql > $T-b2-broken.out 2>&1; BROKE=$?; set -e
[ "$BROKE" != "0" ] && ok "part 2: a broken copy fails loudly (exit $BROKE)" || bad "part 2: broken copy did not fail"
[ "$(q "$FN15")" = "0" ] && ok "part 2: …no 0015 function became live, no rename happened" || bad "part 2: a 0015 object leaked"
[ "$(q "$SPLITQ")" = "$SPLIT0" ] && ok "part 2: …smart_split_territory is still 0005's body with 0005's grants" || bad "part 2: smart_split_territory changed: $(q "$SPLITQ")"
[ "$(q "$CATQ")" = "$CAT1" ] && [ "$(q "$RAWQ")" = "$RAW0" ] && ok "part 2: …catalog and data byte-identical" || bad "part 2: something leaked from a failed apply"

# ----------------------------------------------------- 4. real part 2
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$B2" > $T-b2.out 2>&1 && ok "part 2: the real file applies" || { tail -5 $T-b2.out; bad "part 2: the real file failed"; }
[ "$(q "$FN15")" = "4" ] && ok "part 2: the four 0015 objects exist (the core, the v41 wrapper, inherit, strip)" || bad "part 2: $(q "$FN15") of 4"
[ "$(q "select md5(replace(prosrc,E'\r\n',E'\n')) from pg_proc where oid=to_regprocedure('public.smart_split_territory_core(text,text,jsonb)')")" = "$CERT" ] && ok "part 2: smart_split_territory_core IS the certified body (md5 $CERT)" || bad "part 2: the core is not the certified body"
[ "$(q "select public.rally_capabilities()->>'turfRpc'")" = "true" ] && ok "part 2: turfRpc TRUE (both files present)" || bad "part 2: turfRpc not true"
verify "$V2" "verify-v41-stage-b2"
[ "$(q "$RAWQ")" = "$RAW0" ] && ok "part 2: 0015 rewrote no row" || bad "part 2: a row changed"
CAT2="$(q "$CATQ")"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$B2" > $T-b2b.out 2>&1 && ok "part 2: a second run applies cleanly" || { tail -5 $T-b2b.out; bad "part 2: the second run failed"; }
[ "$(q "$CATQ")" = "$CAT2" ] && [ "$(q "$RAWQ")" = "$RAW0" ] && ok "part 2: …and is idempotent — the certified body was renamed ONCE, the catalog is byte-identical" || bad "part 2: the second run changed something"
[ "$(q "$FN15")" = "4" ] && [ "$(q "select count(*) from pg_proc where proname like 'smart_split_territory%'")" = "3" ] && ok "part 2: …exactly three smart_split_territory* functions (core, v41, the 0005 name)" || bad "part 2: unexpected split function set: $(q "select string_agg(proname, ',') from pg_proc where proname like 'smart_split%'")"

# --------------------------------------- 5. v40 still works, for real
NOW=$(q "select (extract(epoch from now())*1000)::bigint")
psql -q -v ON_ERROR_STOP=1 -d "$DB" <<SQL
select set_config('request.jwt.claims', '{"sub":"$LEAD"}', false) \gset
set role authenticated;
insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
select team_id, id, 'BF Live (v40 reassign)', polygon, homes, archived, '$LEAD', deleted_at,
       jsonb_build_object('id','bf-live','updatedAt',$NOW,'assignedTo','$JAKE',
         'assignments', jsonb_build_array(
           jsonb_build_object('userId','$JAKE','name','BF Jake','assignedBy','BF Lead','assignedAt',1600000000000::bigint,'unassignedAt',1650000000000::bigint),
           jsonb_build_object('userId','$JOHN','name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',$NOW),
           jsonb_build_object('userId','$JAKE','name','BF Jake','assignedBy','BF Lead','assignedAt',$NOW,'unassignedAt',null)))
  from public.territories where team_id='$TEAM' and id='bf-live'
on conflict (team_id, id) do update set
  team_id = excluded.team_id, id = excluded.id, name = excluded.name, polygon = excluded.polygon, homes = excluded.homes,
  archived = excluded.archived, created_by = excluded.created_by, deleted_at = excluded.deleted_at, data = excluded.data;
reset role;
SQL
[ "$(q "select open_assignees::text from public.territories where id='bf-live'")" = "{$JAKE}" ] && ok "v40: a leader's reassignment through the legacy mirror still moves the ledger (open = Jake)" || bad "v40 reassignment: $(q "select open_assignees::text from public.territories where id='bf-live'")"
[ "$(q "select name from public.territories where id='bf-live'")" = "BF Live (v40 reassign)" ] && ok "v40: the rename in the same upsert landed" || bad "v40: rename lost"
set +e
OUT="$(psql -X -d "$DB" 2>&1 <<SQL
select set_config('request.jwt.claims', '{"sub":"$JOHN"}', false) \gset
set role authenticated;
insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
values ('$TEAM','rep-turf','Rep turf','[[3,40],[3.001,40],[3.001,40.001],[3,40.001]]'::jsonb,null,false,'$JOHN',null,'{}'::jsonb);
SQL
)"; set -e
printf '%s' "$OUT" | grep -q "permission denied\|violates row-level security" && ok "v40: a rep still cannot draw turf (0003 unchanged)" || bad "v40: a rep drew turf: $OUT"
psql -q -v ON_ERROR_STOP=1 -d "$DB" <<SQL
select set_config('request.jwt.claims', '{"sub":"$JOHN"}', false) \gset
set role authenticated;
insert into public.pins (team_id, id, lat, lng, address, disposition, data, created_by)
values ('$TEAM','v40-knock-1',40.0002,1.0567,'1 Probe St','nh','{"disposition":"nh","updatedAt":$NOW}'::jsonb,'$JOHN');
insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user, data)
values ('$TEAM','v40-ev-1','v40-knock-1','knock','nh',$NOW,'$JOHN','{}'::jsonb);
reset role;
SQL
[ "$(q "select count(*) from public.pins where id='v40-knock-1'")" = "1" ] && ok "v40: a rep's knock (pin + event) commits after Stage B" || bad "v40: knock refused"
# a v40 Smart Split — the 0005 NAME, children sent UNASSIGNED as v40 sends them
psql -q -v ON_ERROR_STOP=1 -d "$DB" <<SQL
select set_config('request.jwt.claims', '{"sub":"$LEAD"}', false) \\gset
set role authenticated;
insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
values ('$TEAM','v40-split-parent','V40 Split Parent','[[3,40],[3.002,40],[3.002,40.001],[3,40.001]]'::jsonb,null,false,'$LEAD',null,
  jsonb_build_object('id','v40-split-parent','updatedAt',$NOW,'assignedTo','$JAKE',
    'assignments', jsonb_build_array(jsonb_build_object('userId','$JAKE','name','BF Jake','assignedBy','BF Lead','assignedAt',$NOW,'unassignedAt',null))));
select public.smart_split_territory('v40-split-parent', 'op-v40-split', jsonb_build_array(
  jsonb_build_object('id','v40-split-a','name','V40 Split A','polygon','[[3,40],[3.001,40],[3.001,40.001],[3,40.001]]'::jsonb,'homes',10,'data',jsonb_build_object('id','v40-split-a','name','V40 Split A','assignments','[]'::jsonb,'updatedAt',$NOW)),
  jsonb_build_object('id','v40-split-b','name','V40 Split B','polygon','[[3.001,40],[3.002,40],[3.002,40.001],[3.001,40.001]]'::jsonb,'homes',10,'data',jsonb_build_object('id','v40-split-b','name','V40 Split B','assignments','[]'::jsonb,'updatedAt',$NOW)))) \\gset
reset role;
SQL
[ "$(q "select count(*) from public.territories where id in ('v40-split-a','v40-split-b') and deleted_at is null and geom is not null and gis.st_isvalid(geom)")" = "2" ] && ok "v40: Smart Split through the 0005 NAME still commits — both children live with a valid geom" || bad "v40: Smart Split broke"
[ "$(q "select count(*) from public.territories where id='v40-split-parent' and deleted_at is not null")" = "1" ] && ok "v40: …and the parent is tombstoned, as 0005 always did" || bad "v40: parent not tombstoned"
[ "$(q "select count(*) from public.territories where id in ('v40-split-a','v40-split-b') and open_assignees = array['$JAKE']::uuid[] and data->>'assignedTo' = '$JAKE' and jsonb_array_length(data->'assignments') = 1 and (assignees->'entries'->0->>'viaSplit') = 'op-v40-split'")" = "2" ] && ok "v40: …and BOTH children now INHERIT Jake (ledger + both mirrors, viaSplit stamped) — the documented Stage B change for v40 phones" || bad "v40: children did not inherit: $(q "select id, open_assignees::text, data->>'assignedTo' from public.territories where id like 'v40-split-%'")"
[ "$(q "select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e where t.id='v40-split-parent' and e->>'unassignedAt' is null")" = "0" ] && ok "v40: …and the parent's open entry closed at the split (its history kept)" || bad "v40: parent entry still open"
[ "$(q "select count(*) from public.territories where id in ('v40-split-a','v40-split-b') and public.rally_ms(data->>'updatedAt') > $NOW")" = "2" ] && ok "v40: …and the children's data.updatedAt is stamped above the phone's clock, so the splitting phone pulls the inherited assignment" || bad "v40: correction stamp missing on the children"
set +e
OUT="$(psql -X -d "$DB" 2>&1 <<SQL
select set_config('request.jwt.claims', '{"sub":"$LEAD"}', false) \\gset
set role authenticated;
insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
values ('$TEAM','v40-split-parent2','V40 Split Parent 2','[[3.5,40],[3.502,40],[3.502,40.001],[3.5,40.001]]'::jsonb,null,false,'$LEAD',null,'{"id":"v40-split-parent2","assignedTo":""}'::jsonb);
select public.smart_split_territory('v40-split-parent2', 'op-v40-split2', jsonb_build_array(
  jsonb_build_object('id','v40-split2-a','name','bowtie child','polygon','[[3.5,40],[3.501,40.001],[3.501,40],[3.5,40.001]]'::jsonb,'homes',10),
  jsonb_build_object('id','v40-split2-b','name','ok child','polygon','[[3.501,40],[3.502,40],[3.502,40.001],[3.501,40.001]]'::jsonb,'homes',10)));
SQL
)"; set -e
printf '%s' "$OUT" | grep -q "crosses itself" && [ "$(q "select count(*) from public.territories where id='v40-split-parent2' and deleted_at is null and not archived")" = "1" ] && [ "$(q "select count(*) from public.territories where id like 'v40-split2-%'")" = "0" ] && [ "$(q "select count(*) from public.territory_splits where operation_id='op-v40-split2'")" = "0" ] && ok "v40: a Smart Split that would create a self-crossing child is still refused whole through the wrapper (no child, no claim, parent live)" || bad "v40: severed split not refused cleanly: $OUT"

# ------------------------------------------------------- 6. rollback
RAWB="$(q "$RAWQ")"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$RB" > $T-rb.out 2>&1 && ok "ROLLBACK_v41_B.sql applies (after both parts)" || { tail -5 $T-rb.out; bad "rollback failed"; }
[ "$(q "$FN14")" = "0" ] && [ "$(q "$FN15")" = "0" ] && ok "rollback: every Stage B function gone" || bad "rollback: functions remain"
[ "$(q "$SPLITQ")" = "$SPLIT0" ] && ok "rollback: smart_split_territory is the certified body again under its own name, plpgsql, public,pg_temp, 0005's grants" || bad "rollback: smart_split_territory: $(q "$SPLITQ")"
[ "$(q "$CATQ")" = "$CAT0" ] && ok "rollback: the public function catalog is byte-identical to the Stage A snapshot (bodies, config, ACLs, languages)" || bad "rollback: catalog differs from the Stage A snapshot"
[ "$(q "select public.rally_capabilities()->>'turfRpc'")" = "false" ] && ok "rollback: turfRpc false again" || bad "rollback: turfRpc still true"
[ "$(q "$RAWQ")" = "$RAWB" ] && ok "rollback: no row changed (inherited ledger entries from the v40 split stand, as documented)" || bad "rollback: rows changed"
psql -q -v ON_ERROR_STOP=1 -d "$DB" <<SQL
select set_config('request.jwt.claims', '{"sub":"$LEAD"}', false) \\gset
set role authenticated;
insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
values ('$TEAM','v40-split-parent3','V40 Split Parent 3','[[4,40],[4.002,40],[4.002,40.001],[4,40.001]]'::jsonb,null,false,'$LEAD',null,
  jsonb_build_object('id','v40-split-parent3','updatedAt',$NOW,'assignedTo','$JAKE',
    'assignments', jsonb_build_array(jsonb_build_object('userId','$JAKE','name','BF Jake','assignedBy','BF Lead','assignedAt',$NOW,'unassignedAt',null))));
select public.smart_split_territory('v40-split-parent3', 'op-v40-split3', jsonb_build_array(
  jsonb_build_object('id','v40-split3-a','name','A','polygon','[[4,40],[4.001,40],[4.001,40.001],[4,40.001]]'::jsonb,'homes',10),
  jsonb_build_object('id','v40-split3-b','name','B','polygon','[[4.001,40],[4.002,40],[4.002,40.001],[4.001,40.001]]'::jsonb,'homes',10))) \\gset
reset role;
SQL
[ "$(q "select count(*) from public.territories where id in ('v40-split3-a','v40-split3-b') and deleted_at is null and assignees = '{\"entries\": []}'::jsonb")" = "2" ] && ok "rollback: a v40 split makes UNASSIGNED children again — the certified body is back in force, not merely present" || bad "rollback: split children: $(q "select id, assignees::text from public.territories where id like 'v40-split3-%'")"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$B1" > $T-b1c.out 2>&1 && psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$B2" > $T-b2c.out 2>&1 && ok "…and both parts apply cleanly again after the rollback" || { tail -3 $T-b1c.out $T-b2c.out; bad "re-apply after rollback failed"; }
[ "$(q "$CATQ")" = "$CAT2" ] && ok "…to a catalog byte-identical to the first apply" || bad "…catalog differs after re-apply"
verify "$V2" "verify-v41-stage-b2 (after re-apply)"

# ------------------------------------------- 7. rollback after PART 1 ONLY
build
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$B1" > $T-b1d.out 2>&1
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$RB" > $T-rb2.out 2>&1 && ok "ROLLBACK_v41_B.sql applies after part 1 alone" || { tail -5 $T-rb2.out; bad "rollback after part 1 failed"; }
[ "$(q "$CATQ")" = "$CAT0" ] && [ "$(q "$SPLITQ")" = "$SPLIT0" ] && [ "$(q "select public.rally_capabilities()->>'turfRpc'")" = "false" ] && ok "rollback after part 1: catalog byte-identical to the Stage A snapshot, 0005 untouched, turfRpc false" || bad "rollback after part 1: catalog differs"

echo "STAGE B: $pass passed, $fail failed"
[ "$fail" = "0" ] && echo "STAGE B: ALL GREEN" || { echo "STAGE B: FAILED"; exit 1; }
