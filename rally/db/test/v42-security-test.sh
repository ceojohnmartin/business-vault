#!/bin/sh
# RALLY v42 — WHO CAN REACH ANY OF IT.
#   PGHOST=/tmp/pgrls/sock PGPORT=5544 sh rally/db/test/v42-security-test.sh
#
# Every function and column v42 adds, against every role that exists: anon, a
# rep, a DISABLED leader, a leader on ANOTHER team, and the leader who owns
# the turf. RLS and the column grants from 0012 are the yardstick; a new
# function that quietly widens either is the failure this looks for.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DB=rally_v42_sec
export PGUSER="${PGUSER:-postgres}"
pass=0; fail=0
ok()  { pass=$((pass+1)); echo "PASS: $1"; }
bad() { fail=$((fail+1)); echo "FAIL: $1  --  $2"; }
eq()  { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "expected [$3] got [$2]"; fi; }
has() { case "$2" in *"$3"*) ok "$1";; *) bad "$1" "expected [$3] in [$2]";; esac; }
q()   { psql -X -d "$DB" -tAc "$1"; }
# AS THE ROLE PRODUCTION USES. The first version of this file set only the
# JWT claim and stayed connected as postgres — a superuser, which ignores
# every column privilege and every policy. Case 9 "passed" a write that
# should have been denied because nothing was denying anything. The claim is
# set BEFORE the role change, because set_config is transaction-local and
# auth.uid() has to read it after the switch.
as()  { psql -X -d "$DB" -tA -c "begin; select set_config('request.jwt.claims','{\"sub\":\"$1\"}',true); set local role authenticated; $2; commit;" 2>&1 | tr '\n' ' ' || true; }

TEAM=dddddddd-4444-4444-a444-444444444444
TEAM2=dddddddd-4444-4444-a444-999999999999
JOHN=00000000-0000-4000-d000-000000000001
LEAD=00000000-0000-4000-d000-000000000003
DEAD=00000000-0000-4000-d000-0000000000de
OTHER=00000000-0000-4000-d000-0000000000ff

build() {
  psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql" >/dev/null 2>&1
  for m in "$DIR"/../migrations/000[1-8]_*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m" >/dev/null 2>&1; done
  psql -q -d "$DB" -c "revoke usage on schema gis from authenticated" >/dev/null 2>&1
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/v41-backfill-seed.sql" >/dev/null 2>&1
  for f in APPLY_v41_A APPLY_v41_B1 APPLY_v41_B2 APPLY_v41_C APPLY_v41_FLIP APPLY_v42; do
    psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../$f.sql" >/dev/null 2>&1
  done
  # a disabled leader, and a leader on a SECOND team. profiles.id is a FK to
  # the auth shim's users table, so the accounts have to exist there first.
  # One statement per call. As one multi-statement -c they share a
  # transaction, so the FK failure on the first attempt silently rolled back
  # the territory too and every later case failed for the wrong reason.
  fx() { psql -X -q -d "$DB" -c "$1" 2>&1 | grep -i "^ERROR" && echo "  (fixture: $1)" || true; }
  fx "insert into auth.users (id) values ('$DEAD') on conflict do nothing"
  fx "insert into auth.users (id) values ('$OTHER') on conflict do nothing"
  fx "insert into public.teams (id, name) values ('$TEAM2','Other Co') on conflict (id) do nothing"
  fx "insert into public.profiles (id, team_id, role, name, disabled) values ('$DEAD','$TEAM','manager','Disabled Lead',true)
        on conflict (id) do update set team_id=excluded.team_id, role=excluded.role, disabled=excluded.disabled, name=excluded.name"
  fx "insert into public.profiles (id, team_id, role, name, disabled) values ('$OTHER','$TEAM2','manager','Other Co Lead',false)
        on conflict (id) do update set team_id=excluded.team_id, role=excluded.role, disabled=excluded.disabled, name=excluded.name"
  fx "insert into public.territories (team_id,id,name,polygon,archived,data,assignees,assignees_rev,open_assignees,created_by)
      values ('$TEAM','sec-hood','sec-hood','[[30.0,41.0],[30.004,41.0],[30.004,41.004],[30.0,41.004]]'::jsonb,
              false,'{}'::jsonb,'{\"entries\":[]}'::jsonb,0,'{}'::uuid[],'$LEAD')"
}

echo "=== building production's current state + v42, with a disabled leader and a second team ==="
build

NEWFN="import_territory_doors reset_territory_outcomes rally_territory_summary rally_num"

echo
echo "=== 1. ANON REACHES NOTHING ==="
for f in $NEWFN; do
  G=$(q "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='public' and p.proname='$f'
            and has_function_privilege('anon', p.oid, 'EXECUTE')")
  eq "1. anon cannot execute $f" "$G" "0"
done
eq "1. anon cannot select the new territory columns" \
   "$(q "select count(*) from information_schema.column_privileges
          where grantee='anon' and table_name in ('territories','events')
            and column_name in ('seq','uuid','cycle_keep','cycle_keep_at','territory_id','prev_disposition')")" "0"

echo
echo "=== 2. A REP REACHES ONLY WHAT A REP SHOULD ==="
R=$(as "$JOHN" "select public.import_territory_doors('sec-hood','[]'::jsonb,'sec-1')")
has "2a. a rep cannot import"                "$R" "requires leader"
R=$(as "$JOHN" "select public.reset_territory_outcomes('sec-hood','{nothome}'::text[],false,'sec-2')")
has "2b. a rep cannot reset"                 "$R" "requires leader"
R=$(as "$JOHN" "select public.rally_territory_summary('sec-hood')")
has "2c. but a rep CAN read the counts for their own team's turf" "$R" '"houses"'

echo
echo "=== 3. A DISABLED LEADER REACHES NOTHING ==="
R=$(as "$DEAD" "select public.import_territory_doors('sec-hood','[]'::jsonb,'sec-3')")
has "3a. a disabled leader cannot import"  "$R" "disabled"
R=$(as "$DEAD" "select public.reset_territory_outcomes('sec-hood','{nothome}'::text[],false,'sec-4')")
has "3b. a disabled leader cannot reset"   "$R" "disabled"
# rally_my_team() does NOT check disabled — 0014 left that to
# rally_require_leader — so the summary has to check it itself.
R=$(as "$DEAD" "select public.rally_territory_summary('sec-hood')")
has "3c. and a disabled account cannot read the counts either" "$R" "disabled"

echo
echo "=== 4. TEAM ISOLATION ==="
R=$(as "$OTHER" "select public.rally_territory_summary('sec-hood')")
has "4a. another company's leader cannot read this hood's counts" "$R" "not found for this team"
R=$(as "$OTHER" "select public.import_territory_doors('sec-hood','[]'::jsonb,'sec-5')")
has "4b. nor import into it"  "$R" "not found for this team"
R=$(as "$OTHER" "select public.reset_territory_outcomes('sec-hood','{nothome}'::text[],false,'sec-6')")
has "4c. nor reset it"        "$R" "not found for this team"

echo
echo "=== 5. THE OWNER OF THE TURF CAN ==="
R=$(as "$LEAD" "select public.rally_territory_summary('sec-hood')")
has "5a. the team's leader reads the counts" "$R" '"seq"'
R=$(as "$LEAD" "select public.reset_territory_outcomes('sec-hood','{nothome}'::text[],false,'sec-7')")
has "5b. and can reset"                      "$R" '"status": "ok"'

echo
echo "=== 6. EVERY NEW FUNCTION PINS ITS SEARCH PATH ==="
for f in $NEWFN territories_number events_derive_context; do
  C=$(q "select coalesce(array_to_string(p.proconfig,','),'(none)')
          from pg_proc p join pg_namespace n on n.oid=p.pronamespace
         where n.nspname='public' and p.proname='$f'")
  case "$C" in
    *search_path*) ok "6. $f pins search_path ($C)";;
    *) bad "6. $f pins search_path" "proconfig=$C";;
  esac
done

echo
echo "=== 7. DEFINER vs INVOKER IS DELIBERATE ==="
eq "7a. import_territory_doors is DEFINER (it must write as the owner)" \
   "$(q "select prosecdef::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='import_territory_doors'")" "true"
eq "7b. reset_territory_outcomes is DEFINER" \
   "$(q "select prosecdef::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='reset_territory_outcomes'")" "true"
# The two triggers are INVOKER on purpose: a DEFINER trigger would see every
# team's rows, and territories_number's max(seq) must be scoped by the RLS the
# caller is subject to, not bypass it.
eq "7c. territories_number is INVOKER" \
   "$(q "select prosecdef::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='territories_number'")" "false"
eq "7d. events_derive_context is INVOKER" \
   "$(q "select prosecdef::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='events_derive_context'")" "false"

echo
echo "=== 8. THE COLUMN GRANTS MATCH 0012's DISCIPLINE ==="
for c in seq uuid cycle_keep cycle_keep_at; do
  eq "8. authenticated cannot write territories.$c" \
     "$(q "select count(*) from information_schema.column_privileges
            where table_name='territories' and grantee='authenticated'
              and column_name='$c' and privilege_type in ('INSERT','UPDATE')")" "0"
  eq "8. authenticated CAN read territories.$c" \
     "$(q "select count(*) from information_schema.column_privileges
            where table_name='territories' and grantee='authenticated'
              and column_name='$c' and privilege_type='SELECT'")" "1"
done

echo
echo "=== 8b. A REP CANNOT FORGE THE AUDIT TRAIL ==="
# public.events carries a TABLE-level INSERT grant, and a table-level grant
# covers every column added later. Omitting a column grant was not enough;
# it took an explicit REVOKE, and this is what proves it.
for c in territory_id prev_disposition; do
  eq "8b. authenticated cannot write events.$c" \
     "$(q "select count(*) from information_schema.column_privileges
            where table_name='events' and grantee='authenticated'
              and column_name='$c' and privilege_type='INSERT'")" "0"
done
R=$(as "$JOHN" "insert into public.events (team_id,id,pin_id,type,disposition,at_ms,by_user,data,territory_id,prev_disposition)
  values ('$TEAM','forge-ev','p1','knock','nothome',1700000000000,'$JOHN','{}'::jsonb,'not-my-hood','sold')")
has "8b. and a rep naming them is refused" "$R" "permission denied"
R=$(as "$JOHN" "insert into public.events (team_id,id,pin_id,type,disposition,at_ms,by_user,data)
  values ('$TEAM','plain-ev','p1','knock','nothome',1700000000000,'$JOHN','{\"territoryId\":\"sec-hood\"}'::jsonb)")
has "8b. while an ordinary knock still commits" "$R" "COMMIT"

echo
echo "=== 9. A REP CANNOT FORGE A HOOD NUMBER ==="
R=$(as "$LEAD" "insert into public.territories (team_id,id,name,polygon,archived,data,assignees,assignees_rev,open_assignees,created_by,seq)
  values ('$TEAM','forge-1','forge','[[31.0,41.0],[31.004,41.0],[31.004,41.004],[31.0,41.004]]'::jsonb,false,'{}'::jsonb,'{\"entries\":[]}'::jsonb,0,'{}'::uuid[],'$LEAD',1)")
has "9a. even a leader's direct write cannot choose a number" "$R" "permission denied"
eq  "9b. and no such hood exists" "$(q "select count(*) from public.territories where id='forge-1'")" "0"

echo
echo "================================================================"
echo "PASS $pass   FAIL $fail"
[ "$fail" -eq 0 ] || exit 1
