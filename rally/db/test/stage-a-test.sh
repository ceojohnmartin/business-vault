#!/bin/sh
# RALLY v41 — STAGE A, PROVEN BEFORE IT IS PASTED.
#   PGHOST=/tmp/pgrls/sock PGPORT=5544 sh rally/db/test/stage-a-test.sh
#
# Builds a database in exactly production's state on the morning of Stage A
# — the Supabase shim, 0001..0007 live, PostGIS in `gis` WITHOUT the USAGE
# grant (Step 0A did the schema and the extension; the grant is 0008's one
# Stage A line), the v40-shaped seed — and proves, on that database:
#
#   1. ALL OR NOTHING: a copy of db/APPLY_v41_A.sql with a syntax error in
#      its LAST section fails loudly and leaves NOTHING of 0008-0013 behind
#      (no column, no table, no trigger, no grant, no rewritten row);
#   2. the real file applies, and db/test/verify-v41-stage-a.editor.sql
#      (the paste the owner runs afterwards) reports 0 FAIL;
#   3. a second run is data-idempotent: every ledger, every mirror and every
#      row's data (updatedAt aside) is byte-identical, and the verify still
#      reads 0 FAIL;
#   4. v40 STILL WORKS: the exact PostgREST upsert a v40 phone sends — as a
#      real leader — reassigns a hood through the legacy mirror and the
#      ledger follows; a rep can still knock; a rep still cannot draw turf;
#   5. db/ROLLBACK_v41_A.sql returns the schema and grants to their v40
#      state, with data outside the two mirrors byte-identical to before
#      Stage A — and the real file applies cleanly again afterwards.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DB=rally_stage_a_test
export PGUSER="${PGUSER:-postgres}"
pass=0; fail=0
ok()  { pass=$((pass+1)); echo "PASS: $1"; }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }
q() { psql -X -d "$DB" -tAc "$1"; }
APPLY="$DIR/../APPLY_v41_A.sql"; ROLLBACK="$DIR/../ROLLBACK_v41_A.sql"; VERIFY="$DIR/verify-v41-stage-a.editor.sql"
T=/tmp/rally-stage-a

# ---------------------------------------------------- production's state
psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql"
for m in "$DIR"/../migrations/000[1-8]_*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m" >/dev/null 2>&1; done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "revoke usage on schema gis from authenticated"   # 0A did not grant it
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/v41-backfill-seed.sql" >/dev/null
[ "$(q "select has_schema_privilege('authenticated','gis','USAGE')")" = "f" ] && ok "state: gis exists, USAGE not yet granted (as after Step 0A)" || bad "state: gis USAGE already granted"
[ "$(q "select has_table_privilege('authenticated','public.territories','INSERT')")" = "t" ] && ok "state: 0001's table-wide insert grant in force (v40)" || bad "state: table-wide grant missing"
[ "$(q "select count(*) from information_schema.columns where table_name='territories' and column_name in ('geom','assignees')")" = "0" ] && ok "state: no v41 column yet" || bad "state: v41 columns present"
REST0="$(q "select md5(string_agg((team_id::text||id||(data - 'assignedTo' - 'assignments' - 'updatedAt')::text), '|' order by team_id, id)) from public.territories")"
RESTX0="$(q "select md5(string_agg((team_id::text||id||(data - 'assignedTo' - 'assignments' - 'updatedAt')::text), '|' order by team_id, id)) from public.territories where id <> 'bf-live'")"
RAW0="$(q "select md5(string_agg((team_id::text||id||data::text), '|' order by team_id, id)) from public.territories")"

# ------------------------------------------------------------- 1. broken
cp "$APPLY" $T-broken.sql
python3 - <<'PY'
src = open('/tmp/rally-stage-a-broken.sql').read()
assert src.rstrip().endswith('commit;'), 'apply file no longer ends with commit'
i = src.rstrip().rfind('commit;')
body = src[:i]
# after the LAST statement of 0013 (the comment on pins_protect_dnk), so
# 0008..0012 and the whole backfill have already "succeeded" inside the txn
assert 'comment on function public.pins_protect_dnk()' in body
open('/tmp/rally-stage-a-broken.sql', 'w').write(body + "this is not valid sql at all;\n" + src[i:])
PY
set +e; psql -q -v ON_ERROR_STOP=1 -d "$DB" -f $T-broken.sql > $T-broken.out 2>&1; BROKE=$?; set -e
[ "$BROKE" != "0" ] && ok "broken copy fails loudly (exit $BROKE)" || bad "broken copy did not fail"
[ "$(q "select count(*) from information_schema.columns where table_name='territories' and column_name in ('geom','assignees','assignees_rev','open_assignees','cycle_started_at')")" = "0" ] && ok "…and no v41 column became live" || bad "…v41 columns leaked"
[ "$(q "select to_regclass('public.rally_config') is null")" = "t" ] && ok "…nor rally_config" || bad "…rally_config leaked"
[ "$(q "select count(*) from pg_trigger where tgname in ('territories_derive_geom','territories_assignment','pins_protect_dnk','events_guard_dnk_clear')")" = "0" ] && ok "…nor any Stage A trigger" || bad "…a trigger leaked"
[ "$(q "select has_schema_privilege('authenticated','gis','USAGE')")" = "f" ] && ok "…nor the gis USAGE grant" || bad "…the grant leaked"
[ "$(q "select has_table_privilege('authenticated','public.territories','INSERT')")" = "t" ] && ok "…nor 0012's revoke (v40's table-wide grant still in force)" || bad "…0012's revoke leaked"
[ "$(q "select md5(string_agg((team_id::text||id||data::text), '|' order by team_id, id)) from public.territories")" = "$RAW0" ] && ok "…and the backfill's row rewrite rolled back (data byte-identical)" || bad "…rows were rewritten by a failed apply"

# --------------------------------------------------------------- 2. real
psql -v ON_ERROR_STOP=1 -d "$DB" -f "$APPLY" > $T-apply.out 2>&1 && ok "the real file applies" || { tail -5 $T-apply.out; bad "the real file failed"; }
grep -q "v41 backfill: OK" $T-apply.out && ok "0011 reported OK: $(grep -o 'v41 backfill: OK.*' $T-apply.out)" || bad "0011 did not report OK"
V="$(psql -X -v ON_ERROR_STOP=1 -d "$DB" -tA -F ' | ' -f "$VERIFY" 2>&1)" || { printf '%s\n' "$V" | tail -5; bad "verify paste errored"; }
NF="$(printf '%s\n' "$V" | grep -c 'FAIL' || true)"; NP="$(printf '%s\n' "$V" | grep -c ' | PASS | ' || true)"
[ "$NF" = "0" ] && ok "verify-v41-stage-a: $NP PASS, 0 FAIL" || { printf '%s\n' "$V" | grep FAIL; bad "verify-v41-stage-a: $NF FAIL"; }
printf '%s\n' "$V" | grep -q "D1 a v40-shaped upsert by a leader (nine columns, merge-duplicates) commits after 0012 | PASS" && ok "…including the v40 upsert probe" || bad "…the v40 upsert probe did not run/pass"
printf '%s\n' "$V" | grep -q "D7 pins_protect_dnk: a rep's re-disposition of a black door is neutralised (column and mirror restored, write kept) | PASS" && ok "…and the do-not-knock probes" || bad "…the DNK probe did not pass"
[ "$(q "select count(*) from public.territories where id like 'v41a-probe-%'")" = "0" ] && ok "verify kept no row (probe hoods rolled back)" || bad "verify left probe rows behind"
[ "$(q "select count(*) from public.pins where id like 'v41a-probe-%'")" = "0" ] && ok "verify kept no pin" || bad "verify left probe pins behind"
[ "$(q "select md5(string_agg((team_id::text||id||(data - 'assignedTo' - 'assignments' - 'updatedAt')::text), '|' order by team_id, id)) from public.territories")" = "$REST0" ] && ok "REVERSIBILITY: data outside the two mirrors is byte-identical after Stage A" || bad "data outside the mirrors changed"

# ------------------------------------------------------- 3. idempotent
LED1="$(q "select md5(string_agg((team_id::text||id||assignees::text||open_assignees::text||assignees_rev||(data - 'updatedAt')::text||coalesce(geom::text,'-')), '|' order by team_id, id)) from public.territories")"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$APPLY" > $T-apply2.out 2>&1 && ok "a second run applies cleanly" || { tail -5 $T-apply2.out; bad "the second run failed"; }
LED2="$(q "select md5(string_agg((team_id::text||id||assignees::text||open_assignees::text||assignees_rev||(data - 'updatedAt')::text||coalesce(geom::text,'-')), '|' order by team_id, id)) from public.territories")"
[ "$LED1" = "$LED2" ] && ok "…and is data-idempotent: ledgers, mirrors, revisions, geoms and data (updatedAt aside) byte-identical" || bad "…a second run changed data"
V2="$(psql -X -v ON_ERROR_STOP=1 -d "$DB" -tA -F ' | ' -f "$VERIFY" 2>&1)"; NF2="$(printf '%s\n' "$V2" | grep -c 'FAIL' || true)"
[ "$NF2" = "0" ] && ok "…and the verify still reads 0 FAIL" || bad "…verify after the second run: $NF2 FAIL"

# --------------------------------------------- 4. v40 still works, for real
# the exact v40 payload (js/sync.js rowFor "territories"), as the BF manager,
# reassigning bf-live from John to Jake the way a v40 phone does: close John's
# entry, open Jake's, scalar assignedTo = Jake
NOW=$(q "select (extract(epoch from now())*1000)::bigint")
psql -q -v ON_ERROR_STOP=1 -d "$DB" <<SQL
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-d000-000000000003"}', false) \gset
set role authenticated;
insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
select team_id, id, 'BF Live (v40 reassign)', polygon, homes, archived, '00000000-0000-4000-d000-000000000003', deleted_at,
       jsonb_build_object('id','bf-live','updatedAt',$NOW,'assignedTo','00000000-0000-4000-d000-000000000002',
         'assignments', jsonb_build_array(
           jsonb_build_object('userId','00000000-0000-4000-d000-000000000002','name','BF Jake','assignedBy','BF Lead','assignedAt',1600000000000::bigint,'unassignedAt',1650000000000::bigint),
           jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',$NOW),
           jsonb_build_object('userId','00000000-0000-4000-d000-000000000002','name','BF Jake','assignedBy','BF Lead','assignedAt',$NOW,'unassignedAt',null)))
  from public.territories where team_id='dddddddd-4444-4444-a444-444444444444' and id='bf-live'
on conflict (team_id, id) do update set
  team_id = excluded.team_id, id = excluded.id, name = excluded.name, polygon = excluded.polygon, homes = excluded.homes,
  archived = excluded.archived, created_by = excluded.created_by, deleted_at = excluded.deleted_at, data = excluded.data;
reset role;
SQL
[ "$(q "select open_assignees::text from public.territories where id='bf-live'")" = "{00000000-0000-4000-d000-000000000002}" ] && ok "v40: a leader's reassignment through the legacy mirror moves the ledger (open = Jake)" || bad "v40 reassignment did not move the ledger: $(q "select open_assignees::text from public.territories where id='bf-live'")"
[ "$(q "select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e where t.id='bf-live' and e->>'userId'='00000000-0000-4000-d000-000000000001' and (e->>'unassignedAt')::bigint = $NOW")" = "1" ] && ok "v40: John's run is closed at the phone's instant, in the ledger" || bad "v40: John's entry not closed"
[ "$(q "select data->>'assignedTo' from public.territories where id='bf-live'")" = "00000000-0000-4000-d000-000000000002" ] && ok "v40: the scalar mirror follows" || bad "v40: scalar mirror stale"
[ "$(q "select name from public.territories where id='bf-live'")" = "BF Live (v40 reassign)" ] && ok "v40: the rename in the same upsert landed" || bad "v40: rename lost"
set +e
OUT="$(psql -X -d "$DB" 2>&1 <<SQL
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-d000-000000000001"}', false) \gset
set role authenticated;
insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
values ('dddddddd-4444-4444-a444-444444444444','rep-turf','Rep turf','[[3,40],[3.001,40],[3.001,40.001],[3,40.001]]'::jsonb,null,false,'00000000-0000-4000-d000-000000000001',null,'{}'::jsonb);
SQL
)"; set -e
printf '%s' "$OUT" | grep -q "permission denied\|violates row-level security" && ok "v40: a rep still cannot draw turf (0003 unchanged)" || bad "v40: a rep drew turf: $OUT"
psql -q -v ON_ERROR_STOP=1 -d "$DB" <<SQL
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-d000-000000000001"}', false) \gset
set role authenticated;
insert into public.pins (team_id, id, lat, lng, address, disposition, data, created_by)
values ('dddddddd-4444-4444-a444-444444444444','v40-knock-1',40.0002,1.0567,'1 Probe St','nh','{"disposition":"nh","updatedAt":$NOW}'::jsonb,'00000000-0000-4000-d000-000000000001');
insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user, data)
values ('dddddddd-4444-4444-a444-444444444444','v40-ev-1','v40-knock-1','knock','nh',$NOW,'00000000-0000-4000-d000-000000000001','{}'::jsonb);
reset role;
SQL
[ "$(q "select count(*) from public.pins where id='v40-knock-1'")" = "1" ] && ok "v40: a rep's knock (pin + event) commits after Stage A" || bad "v40: knock refused"
# v40's Smart Split — the certified 0005 RPC — now runs with 0009's derive
# trigger and 0010's assignment trigger firing on the child rows
psql -q -v ON_ERROR_STOP=1 -d "$DB" <<SQL
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-d000-000000000003"}', false) \\gset
set role authenticated;
insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
values ('dddddddd-4444-4444-a444-444444444444','v40-split-parent','V40 Split Parent','[[3,40],[3.002,40],[3.002,40.001],[3,40.001]]'::jsonb,null,false,'00000000-0000-4000-d000-000000000003',null,
  jsonb_build_object('id','v40-split-parent','updatedAt',$NOW,'assignedTo','00000000-0000-4000-d000-000000000002',
    'assignments', jsonb_build_array(jsonb_build_object('userId','00000000-0000-4000-d000-000000000002','name','BF Jake','assignedBy','BF Lead','assignedAt',$NOW,'unassignedAt',null))));
select public.smart_split_territory('v40-split-parent', 'op-v40-split', jsonb_build_array(
  jsonb_build_object('id','v40-split-a','name','V40 Split A','polygon','[[3,40],[3.001,40],[3.001,40.001],[3,40.001]]'::jsonb,'homes',10),
  jsonb_build_object('id','v40-split-b','name','V40 Split B','polygon','[[3.001,40],[3.002,40],[3.002,40.001],[3.001,40.001]]'::jsonb,'homes',10))) \\gset
reset role;
SQL
[ "$(q "select count(*) from public.territories where id in ('v40-split-a','v40-split-b') and deleted_at is null and geom is not null and gis.st_isvalid(geom)")" = "2" ] && ok "v40: Smart Split through the certified 0005 RPC still commits — both children live with a valid geom" || bad "v40: Smart Split broke: $(q "select id, (geom is not null) from public.territories where id like 'v40-split-%'")"
[ "$(q "select count(*) from public.territories where id='v40-split-parent' and deleted_at is not null")" = "1" ] && ok "v40: …and the parent is tombstoned, as 0005 always did" || bad "v40: parent not tombstoned"
# a v40 phone creates split children UNASSIGNED (main:js/store.js splitTerritory
# builds them with assignments: [] and no assignedTo); server-side inheritance
# is 0015's, i.e. Stage B. Stage A must reproduce v40's behaviour exactly.
[ "$(q "select count(*) from public.territories where id in ('v40-split-a','v40-split-b') and open_assignees = '{}'::uuid[] and assignees = '{\"entries\": []}'::jsonb")" = "2" ] && ok "v40: …and the children are unassigned with an empty ledger — exactly what a v40 split produces today (inheritance is 0015, Stage B)" || bad "v40: children's ledgers: $(q "select id, open_assignees::text, assignees::text from public.territories where id like 'v40-split-%'")"

# ----------------------------------------------------------- 5. rollback
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$ROLLBACK" > $T-rollback.out 2>&1 && ok "ROLLBACK_v41_A.sql applies" || { tail -5 $T-rollback.out; bad "rollback failed"; }
[ "$(q "select count(*) from information_schema.columns where table_name='territories' and column_name in ('geom','assignees','assignees_rev','open_assignees','cycle_started_at')")" = "0" ] && ok "rollback: v41 columns gone" || bad "rollback: columns remain"
[ "$(q "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'rally\\_%' or p.proname in ('territories_derive_geom','territories_assignment','events_guard_dnk_clear','pins_protect_dnk'))")" = "0" ] && ok "rollback: every Stage A function gone" || bad "rollback: functions remain: $(q "select string_agg(p.proname, ',') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'rally\\_%'")"
[ "$(q "select count(*) from pg_trigger where tgname in ('territories_derive_geom','territories_assignment','rally_config_guard','pins_protect_dnk','events_guard_dnk_clear')")" = "0" ] && ok "rollback: every Stage A trigger gone" || bad "rollback: triggers remain"
[ "$(q "select to_regclass('public.rally_config') is null")" = "t" ] && ok "rollback: rally_config gone" || bad "rollback: rally_config remains"
[ "$(q "select has_table_privilege('authenticated','public.territories','INSERT') and has_table_privilege('authenticated','public.territories','UPDATE')")" = "t" ] && ok "rollback: 0001's table-wide insert/update grant restored" || bad "rollback: grants not restored"
[ "$(q "select has_schema_privilege('authenticated','gis','USAGE')")" = "f" ] && ok "rollback: gis USAGE revoked (PostGIS itself stays, as after 0A)" || bad "rollback: gis USAGE remains"
[ "$(q "select md5(string_agg((team_id::text||id||(data - 'assignedTo' - 'assignments' - 'updatedAt')::text), '|' order by team_id, id)) from public.territories where id <> 'bf-live' and id not like 'v40-%'")" = "$RESTX0" ] && ok "rollback: data outside the two mirrors byte-identical to before Stage A (the rows the v40 probes renamed or created excluded)" || bad "rollback: data changed"
[ "$(q "select count(*) from public.territories where jsonb_typeof(data->'assignments') = 'array'")" = "$(q "select count(*) from public.territories where jsonb_typeof(data) = 'object'")" ] && ok "rollback: every hood still carries its assignment history in data.assignments (v40 shape)" || bad "rollback: a hood lost its history mirror"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$APPLY" > $T-apply3.out 2>&1 && ok "…and Stage A applies cleanly again after the rollback" || { tail -5 $T-apply3.out; bad "re-apply after rollback failed"; }
V3="$(psql -X -v ON_ERROR_STOP=1 -d "$DB" -tA -F ' | ' -f "$VERIFY" 2>&1)"; NF3="$(printf '%s\n' "$V3" | grep -c 'FAIL' || true)"
[ "$NF3" = "0" ] && ok "…and the verify reads 0 FAIL again" || { printf '%s\n' "$V3" | grep FAIL; bad "verify after re-apply: $NF3 FAIL"; }

echo "STAGE A: $pass passed, $fail failed"
[ "$fail" = "0" ] && echo "STAGE A: ALL GREEN" || { echo "STAGE A: FAILED"; exit 1; }
