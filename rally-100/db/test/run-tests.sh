#!/bin/sh
# RALLY 100 — the server release gate (v1 and v2), on throwaway local
# PostgreSQL databases. Point it at any dev cluster that has PostGIS (RALLY's
# 0008 needs it):
#
#   PGHOST=127.0.0.1 PGPORT=5544 PGUSER=postgres sh rally-100/db/test/run-tests.sh
#
# It proves, in order:
#   1. APPLY_rally100_v1.sql and APPLY_rally100_v2.sql are in sync with the
#      migrations they are built from.
#   2. RALLY 100 CHANGES NOTHING IN RALLY, AND v2 COMES OUT CLEANLY. On a
#      database holding the Supabase shim and every RALLY migration, a
#      fingerprint of everything outside rally100 (tables, columns, functions
#      and their bodies, triggers, policies, constraints, grants, default
#      privileges) is identical at every step: 1001, 1002, v2's ROLLBACK,
#      v1's ROLLBACK, each APPLY file, and each refused re-run. A second
#      fingerprint, of everything INSIDE rally100, proves that v2's rollback
#      returns the schema to exactly what 1001 left, and that v1's rollback
#      leaves no rally100 schema behind even with v2 installed.
#   3. v2's starting position: the switch starts on for the one team that
#      has an owner on it, and off with none or two.
#   4. RALLY's own rls-test.sql passes on that combined database (v1 + v2),
#      with the same -v variables RALLY's runner passes.
#   5. The RALLY 100 suite (rally100-test.sql) passes on a second combined
#      database whose default privileges hand EVERYTHING to anon,
#      authenticated and service_role before 1001 and 1002 run, so every
#      revoke in both migrations is proven to matter rather than passing
#      vacuously.
#   6. The temp-schema shadow test passes in a fresh session.
#   7. The two-session races (race-test.sh): an untick and an approval, a
#      payment and a leaving-rep closure, two joins by one person, and a join
#      and the owner's "off" can never both win.
# Any failure exits non-zero.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
R100="$DIR/.."
RALLY="$DIR/../../../rally/db"
MIG1="$R100/migrations/1001_rally100_v1.sql"
MIG2="$R100/migrations/1002_rally100_auto_join.sql"
export PGUSER="${PGUSER:-postgres}"
PSQL="psql -X -q -v ON_ERROR_STOP=1"
QUIET="-c client_min_messages=warning"

for f in "$RALLY/test/supabase-shim.sql" "$RALLY/test/rls-test.sql" "$RALLY/capability-matrix.json" "$MIG1" "$MIG2"; do
  [ -f "$f" ] || { echo "missing $f"; exit 1; }
done

fresh() {  # $1 = database: drop, create, shim, every RALLY migration in order
  $PSQL -d postgres -c "drop database if exists $1" -c "create database $1" >/dev/null 2>&1
  $PSQL -d "$1" -f "$RALLY/test/supabase-shim.sql" >/dev/null
  # Supabase's auth.users carries email_confirmed_at (its auth server sets it
  # when the address is confirmed) and v2 reads it; RALLY's shim leaves it
  # out. It is added here, in this runner's setup, never in RALLY's shim, and
  # before any fingerprint is taken.
  $PSQL -d "$1" -c "alter table auth.users add column if not exists email_confirmed_at timestamptz" >/dev/null
  for m in "$RALLY"/migrations/*.sql; do
    $PSQL -d "$1" -f "$m" >/dev/null 2>&1 || { echo "RALLY migration failed: $m"; $PSQL -d "$1" -f "$m"; exit 1; }
  done
}

# Everything outside rally100 that a migration could create, alter or grant.
FINGERPRINT="
select md5(string_agg(x, E'\n' order by x)) from (
  select 'rel ' || n.nspname || '.' || c.relname || ' ' || c.relkind::text || ' ' || coalesce(c.relacl::text, '-')
         || ' rls=' || c.relrowsecurity || ' force=' || c.relforcerowsecurity
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname not in ('rally100', 'pg_catalog', 'information_schema', 'pg_toast') and n.nspname !~ '^pg_temp'
  union all
  select 'col ' || n.nspname || '.' || c.relname || '.' || a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
         || ' ' || a.attnotnull || ' ' || coalesce(a.attacl::text, '-')
    from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
   where a.attnum > 0 and not a.attisdropped
     and n.nspname not in ('rally100', 'pg_catalog', 'information_schema', 'pg_toast') and n.nspname !~ '^pg_temp'
  union all
  select 'fn ' || n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') '
         || md5(p.prosrc) || ' ' || coalesce(p.proacl::text, '-') || ' ' || p.prosecdef || ' ' || coalesce(p.proconfig::text, '-')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname not in ('rally100', 'pg_catalog', 'information_schema') and n.nspname !~ '^pg_temp'
  union all
  select 'trg ' || c.relname || '.' || t.tgname || ' ' || t.tgfoid::regproc::text || ' ' || t.tgenabled::text
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname <> 'rally100'
  union all
  select 'con ' || c.relname || '.' || k.conname || ' ' || pg_get_constraintdef(k.oid)
    from pg_constraint k join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname not in ('rally100', 'pg_catalog', 'information_schema')
  union all
  select 'pol ' || schemaname || '.' || tablename || '.' || policyname || ' ' || cmd || ' ' || array_to_string(roles, ',')
         || ' ' || coalesce(qual, '-') || ' ' || coalesce(with_check, '-')
    from pg_policies where schemaname <> 'rally100'
  union all
  select 'nsp ' || nspname || ' ' || coalesce(nspacl::text, '-') from pg_namespace
   where nspname <> 'rally100' and nspname !~ '^pg_temp' and nspname !~ '^pg_toast'
  union all
  select 'dacl ' || defaclrole::regrole::text || ' ' || defaclnamespace::text || ' ' || defaclobjtype::text || ' ' || defaclacl::text
    from pg_default_acl
  union all
  select 'ext ' || extname || ' ' || extversion from pg_extension
) s(x)"
fp() { $PSQL -At -d "$1" -c "$FINGERPRINT"; }

# Everything INSIDE rally100: every relation, column (type, default,
# generated, privileges), function (arguments with defaults, result, body,
# privileges, volatility, security, settings, language), index, trigger,
# constraint, policy, type and the schema's own privileges and comments.
FINGERPRINT_R100="
select md5(string_agg(x, E'\n' order by x)) from (
  select 'rel ' || c.relname || ' ' || c.relkind::text || ' ' || coalesce(c.relacl::text, '-')
         || ' rls=' || c.relrowsecurity || ' force=' || c.relforcerowsecurity
         || ' ' || coalesce(obj_description(c.oid, 'pg_class'), '-')
    from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'rally100'
  union all
  select 'col ' || c.relname || '.' || a.attname || ' ' || format_type(a.atttypid, a.atttypmod) || ' ' || a.attnotnull
         || ' ' || a.attgenerated::text || ' ' || coalesce(pg_get_expr(d.adbin, d.adrelid), '-')
         || ' ' || coalesce(a.attacl::text, '-') || ' ' || coalesce(col_description(c.oid, a.attnum), '-')
    from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
   where n.nspname = 'rally100' and a.attnum > 0 and not a.attisdropped
  union all
  select 'fn ' || p.proname || '(' || pg_get_function_arguments(p.oid) || ') ' || pg_get_function_result(p.oid)
         || ' ' || md5(p.prosrc) || ' ' || coalesce(p.proacl::text, '-') || ' ' || p.prosecdef || ' ' || p.provolatile::text
         || ' ' || p.prokind::text || ' ' || p.proleakproof || ' ' || p.proisstrict || ' ' || coalesce(p.proconfig::text, '-')
         || ' ' || (select l.lanname from pg_language l where l.oid = p.prolang) || ' ' || coalesce(obj_description(p.oid, 'pg_proc'), '-')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'rally100'
  union all
  select 'idx ' || pg_get_indexdef(i.indexrelid)
    from pg_index i join pg_class c on c.oid = i.indrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'rally100'
  union all
  select 'trg ' || pg_get_triggerdef(t.oid) || ' ' || t.tgenabled::text
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'rally100' and not t.tgisinternal
  union all
  select 'con ' || c.relname || '.' || k.conname || ' ' || pg_get_constraintdef(k.oid)
    from pg_constraint k join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'rally100'
  union all
  select 'pol ' || tablename || '.' || policyname from pg_policies where schemaname = 'rally100'
  union all
  select 'typ ' || t.typname || ' ' || t.typtype::text from pg_type t join pg_namespace n on n.oid = t.typnamespace
   where n.nspname = 'rally100'
  union all
  select 'nsp ' || coalesce(nspacl::text, '-') || ' ' || coalesce(obj_description(oid, 'pg_namespace'), '-')
    from pg_namespace where nspname = 'rally100'
) s(x)"
fpr() { $PSQL -At -d "$1" -c "$FINGERPRINT_R100"; }
api_n() {
  $PSQL -At -d "$1" -c "select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'rally100' and has_function_privilege('authenticated', p.oid, 'execute')"
}

INSTALL_N=0
pass() { echo "PASS: $1"; INSTALL_N=$((INSTALL_N + 1)); }
fail() { echo "INSTALL/ROLLBACK: FAILED — $1"; exit 1; }

# --------------------------------------------------------------- 1. APPLY
sh "$R100/build-apply.sh" --check

# ------------------------------------------- 2. RALLY untouched, v2 undone
DB=rally100_rls_test
fresh "$DB"
F0="$(fp "$DB")"
$PSQL -d "$DB" -f "$MIG1" >/dev/null
[ "$(fp "$DB")" = "$F0" ] || fail "1001 changed something outside rally100"
G1="$(fpr "$DB")"
pass "R.01 1001 changes nothing outside schema rally100 (catalog fingerprint identical)"

$PSQL -d "$DB" -f "$MIG2" >/dev/null
G2="$(fpr "$DB")"
[ "$(fp "$DB")" = "$F0" ] && [ "$G2" != "$G1" ] && [ "$(api_n "$DB")" = "42" ] \
  || fail "1002 on top of 1001 (fingerprint, or $(api_n "$DB") API functions)"
pass "R.02 1002 installs on top of 1001: 42 API functions, and still nothing outside rally100 changes"

PGOPTIONS="$QUIET" $PSQL -d "$DB" -f "$R100/ROLLBACK_rally100_v2.sql" >/dev/null
[ "$(fp "$DB")" = "$F0" ] && [ "$(fpr "$DB")" = "$G1" ] && [ "$(api_n "$DB")" = "40" ] \
  || fail "ROLLBACK_rally100_v2.sql did not return rally100 to exactly what 1001 left"
pass "R.03 ROLLBACK_rally100_v2.sql returns rally100 to exactly the post-1001 catalog (inside fingerprint identical) and touches nothing outside it"

if PGOPTIONS="$QUIET" $PSQL -d "$DB" -f "$R100/ROLLBACK_rally100_v2.sql" >/dev/null 2>&1; then
  fail "a second ROLLBACK_rally100_v2.sql should stop at its first drop"
fi
[ "$(fp "$DB")" = "$F0" ] && [ "$(fpr "$DB")" = "$G1" ] || fail "the refused second v2 rollback changed something"
pass "R.04 ROLLBACK_rally100_v2.sql without v2 installed is refused as one transaction and changes nothing"

$PSQL -d "$DB" -f "$MIG2" >/dev/null
[ "$(fp "$DB")" = "$F0" ] && [ "$(fpr "$DB")" = "$G2" ] || fail "1002 after its rollback is not the same v2"
pass "R.05 1002 installed again after its rollback reproduces exactly the same v2 catalog"

PGOPTIONS="$QUIET" $PSQL -d "$DB" -f "$R100/ROLLBACK_rally100_v1.sql" >/dev/null
LEFT="$($PSQL -At -d "$DB" -c "select count(*) from pg_namespace where nspname = 'rally100'")"
[ "$(fp "$DB")" = "$F0" ] && [ "$LEFT" = "0" ] || fail "ROLLBACK_rally100_v1.sql with v2 installed"
pass "R.06 ROLLBACK_rally100_v1.sql, with v2 installed, removes rally100 entirely and leaves RALLY exactly as it was"

if $PSQL -d "$DB" -f "$R100/APPLY_rally100_v2.sql" >/dev/null 2>&1; then
  fail "APPLY_rally100_v2.sql without v1 should stop at its first statement"
fi
LEFT="$($PSQL -At -d "$DB" -c "select count(*) from pg_namespace where nspname = 'rally100'")"
[ "$(fp "$DB")" = "$F0" ] && [ "$LEFT" = "0" ] || fail "the refused v2 APPLY without v1 changed something"
pass "R.07 APPLY_rally100_v2.sql without v1 is refused as one transaction and changes nothing"

$PSQL -d "$DB" -f "$R100/APPLY_rally100_v1.sql" >/dev/null
[ "$(fp "$DB")" = "$F0" ] && [ "$(fpr "$DB")" = "$G1" ] && [ "$(api_n "$DB")" = "40" ] \
  || fail "APPLY_rally100_v1.sql (fingerprint or $(api_n "$DB") API functions)"
pass "R.08 APPLY_rally100_v1.sql installs the same v1 (40 API functions) and also leaves RALLY untouched"
if $PSQL -d "$DB" -f "$R100/APPLY_rally100_v1.sql" >/dev/null 2>&1; then
  fail "a second APPLY_rally100_v1.sql run should stop at create schema"
fi
[ "$(fp "$DB")" = "$F0" ] && [ "$(fpr "$DB")" = "$G1" ] || fail "the refused second v1 APPLY changed something"
pass "R.09 a second APPLY_rally100_v1.sql run is refused as one transaction and changes nothing"

# ------------------------------------------------- 3. v2's starting position
# Each case places owners, runs 1002 and reads the switch inside ONE
# transaction that is then rolled back, so the database is left exactly as
# v1 left it.
start_case() {  # $1 = fixtures; prints "off" or "on <team name>"
  $PSQL -At -d "$DB" <<SQL
begin;
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000c1', 'case1@case.test'), ('00000000-0000-4000-8000-0000000000c2', 'case2@case.test'),
  ('00000000-0000-4000-8000-0000000000c3', 'case3@case.test'), ('00000000-0000-4000-8000-0000000000c4', 'case4@case.test');
insert into public.teams (id, name) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccca1', 'Case A'), ('cccccccc-cccc-4ccc-8ccc-cccccccccca2', 'Case B');
$1
\i '$MIG2'
select case when s.auto_join_team is null then 'off' else 'on ' || t.name end
  from rally100.settings s left join public.teams t on t.id = s.auto_join_team;
rollback;
SQL
}
A="'cccccccc-cccc-4ccc-8ccc-cccccccccca1'"; B="'cccccccc-cccc-4ccc-8ccc-cccccccccca2'"
U() { echo "'00000000-0000-4000-8000-0000000000c$1'"; }
GOT="$(start_case "
update public.profiles set role = 'owner'                 where id = $(U 1);
update public.profiles set role = 'leader', team_id = $A  where id = $(U 2);
update public.profiles set team_id = $B                   where id = $(U 3);")"
[ "$GOT" = "off" ] || fail "starting position with no owner on a team: got '$GOT'"
pass "R.10 starting position: with no owner on a team (an owner with none, a leader and a rep on teams) the switch starts off"
GOT="$(start_case "
update public.profiles set role = 'owner',  team_id = $A  where id in ($(U 1), $(U 2));
update public.profiles set role = 'owner'                 where id = $(U 3);
update public.profiles set role = 'leader', team_id = $B  where id = $(U 4);")"
[ "$GOT" = "on Case A" ] || fail "starting position with one owner team: got '$GOT'"
pass "R.11 starting position: with one team that has an owner on it (two owners there, one with no team) the switch starts on, for that team"
GOT="$(start_case "
update public.profiles set role = 'owner', team_id = $A   where id = $(U 1);
update public.profiles set role = 'owner', team_id = $B   where id = $(U 2);")"
[ "$GOT" = "off" ] || fail "starting position with two owner teams: got '$GOT'"
pass "R.12 starting position: with owners on two teams the switch starts off"
[ "$(fp "$DB")" = "$F0" ] && [ "$(fpr "$DB")" = "$G1" ] \
  && [ "$($PSQL -At -d "$DB" -c "select count(*) from public.profiles")" = "0" ] \
  || fail "a starting-position case left something behind"

$PSQL -d "$DB" -f "$R100/APPLY_rally100_v2.sql" >/dev/null
[ "$(fp "$DB")" = "$F0" ] && [ "$(fpr "$DB")" = "$G2" ] && [ "$(api_n "$DB")" = "42" ] \
  || fail "APPLY_rally100_v2.sql (fingerprint or $(api_n "$DB") API functions)"
pass "R.13 APPLY_rally100_v2.sql on v1 installs the same v2 (42 API functions) and also leaves RALLY untouched"
if $PSQL -d "$DB" -f "$R100/APPLY_rally100_v2.sql" >/dev/null 2>&1; then
  fail "a second APPLY_rally100_v2.sql run should stop at create table"
fi
[ "$(fp "$DB")" = "$F0" ] && [ "$(fpr "$DB")" = "$G2" ] || fail "the refused second v2 APPLY changed something"
pass "R.14 a second APPLY_rally100_v2.sql run is refused as one transaction and changes nothing"

# ------------------------------------- 4. RALLY's own suite, on v1 + v2
MATRIX="$RALLY/capability-matrix.json"
cap() {
  grep -o "\"$1\"[[:space:]]*:[[:space:]]*\(true\|false\)" "$MATRIX" | head -1 | grep -o 'true\|false'
}
REP_MANAGE="$(cap rep)"; LEADER_MANAGE="$(cap leader)"
MANAGER_MANAGE="$(cap manager)"; OWNER_MANAGE="$(cap owner)"
for v in "$REP_MANAGE" "$LEADER_MANAGE" "$MANAGER_MANAGE" "$OWNER_MANAGE"; do
  [ -n "$v" ] || { echo "capability-matrix.json is unreadable"; exit 1; }
done
OUT="$(psql -X -v ON_ERROR_STOP=1 -d "$DB" \
        -v rep_manage="$REP_MANAGE" -v leader_manage="$LEADER_MANAGE" \
        -v manager_manage="$MANAGER_MANAGE" -v owner_manage="$OWNER_MANAGE" \
        -f "$RALLY/test/rls-test.sql" 2>&1)" || {
  echo "$OUT" | tail -20; echo "RALLY rls-test on the combined database: FAILED"; exit 1;
}
RALLY_N="$(echo "$OUT" | grep -c "PASS: ")"
echo "RALLY rls-test.sql on the combined database (RALLY + RALLY 100 v1 + v2): ALL GREEN ($RALLY_N checks)"

# ----------------------------------------------- 5. the RALLY 100 suite
DB=rally100_test
fresh "$DB"
# The worst project a migration could land in: every new object handed to
# every client role by default. 1001 and 1002 must still leave clients
# nothing but the 42 doors.
$PSQL -d "$DB" >/dev/null <<'SQL'
alter default privileges grant all on tables    to anon, authenticated, service_role;
alter default privileges grant all on sequences to anon, authenticated, service_role;
alter default privileges grant all on functions to anon, authenticated, service_role;
alter default privileges grant all on schemas   to anon, authenticated, service_role;
SQL
$PSQL -d "$DB" -f "$MIG1" >/dev/null
$PSQL -d "$DB" -f "$MIG2" >/dev/null
OUT="$(psql -X -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/rally100-test.sql" 2>&1)" || {
  echo "$OUT" | grep -v "PASS: " | tail -15; echo "RALLY 100 suite: FAILED"; exit 1;
}
echo "$OUT" | grep -o "PASS: .*"
SUITE_N="$(echo "$OUT" | grep -c "PASS: ")"

# ----------------------------------------------- 6. the shadow test
OUT="$(psql -X -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/shadow-test.sql" 2>&1)" || {
  echo "$OUT" | tail -15; echo "RALLY 100 shadow test: FAILED"; exit 1;
}
echo "$OUT" | grep -o "PASS: .*"
SHADOW_N="$(echo "$OUT" | grep -c "PASS: ")"

# ----------------------------------------------- 7. the races
OUT="$(sh "$DIR/race-test.sh" "$DB" 2>&1)" || { echo "$OUT" | tail -5; echo "RALLY 100 races: FAILED"; exit 1; }
echo "$OUT" | grep -o "PASS: .*"
RACE_N="$(echo "$OUT" | grep -c "PASS: ")"

TOTAL=$((SUITE_N + SHADOW_N + RACE_N + INSTALL_N))
echo "RALLY 100: ALL GREEN ($TOTAL checks: $SUITE_N suite + $SHADOW_N shadow + $RACE_N race + $INSTALL_N install/rollback)"
echo "RALLY:     ALL GREEN ($RALLY_N rls-test.sql checks on the combined database)"
