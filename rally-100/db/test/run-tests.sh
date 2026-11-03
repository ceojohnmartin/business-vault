#!/bin/sh
# RALLY 100 v1 — the server release gate, on throwaway local PostgreSQL
# databases. Point it at any dev cluster that has PostGIS (RALLY's 0008 needs
# it):
#
#   PGHOST=127.0.0.1 PGPORT=5544 PGUSER=postgres sh rally-100/db/test/run-tests.sh
#
# It proves, in order:
#   1. APPLY_rally100_v1.sql is in sync with the migration it is built from.
#   2. RALLY 100 CHANGES NOTHING IN RALLY. On a database holding the Supabase
#      shim and every RALLY migration, a fingerprint of everything outside
#      rally100 (tables, columns, functions and their bodies, triggers,
#      policies, constraints, grants, default privileges) is identical before
#      1001, after 1001, after the ROLLBACK, and after the APPLY file — and
#      the rollback leaves no rally100 schema behind.
#   3. RALLY's own rls-test.sql passes on that combined database, with the
#      same -v variables RALLY's runner passes.
#   4. The RALLY 100 suite (rally100-test.sql) passes on a second combined
#      database whose default privileges hand EVERYTHING to anon,
#      authenticated and service_role before 1001 runs, so every revoke in
#      the migration is proven to matter rather than passing vacuously.
#   5. The temp-schema shadow test passes in a fresh session.
# Any failure exits non-zero.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
R100="$DIR/.."
RALLY="$DIR/../../../rally/db"
MIG="$R100/migrations/1001_rally100_v1.sql"
export PGUSER="${PGUSER:-postgres}"
PSQL="psql -X -q -v ON_ERROR_STOP=1"

for f in "$RALLY/test/supabase-shim.sql" "$RALLY/test/rls-test.sql" "$RALLY/capability-matrix.json" "$MIG"; do
  [ -f "$f" ] || { echo "missing $f"; exit 1; }
done

fresh() {  # $1 = database: drop, create, shim, every RALLY migration in order
  $PSQL -d postgres -c "drop database if exists $1" -c "create database $1" >/dev/null 2>&1
  $PSQL -d "$1" -f "$RALLY/test/supabase-shim.sql" >/dev/null
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

# --------------------------------------------------------------- 1. APPLY
sh "$R100/build-apply.sh" --check

# --------------------------------- 2 + 3. RALLY untouched, RALLY's own suite
DB=rally100_rls_test
fresh "$DB"
F0="$(fp "$DB")"
$PSQL -d "$DB" -f "$MIG" >/dev/null
F1="$(fp "$DB")"
[ "$F0" = "$F1" ] || { echo "RALLY UNTOUCHED: FAILED — 1001 changed something outside rally100"; exit 1; }
echo "PASS: R.01 1001 changes nothing outside schema rally100 (catalog fingerprint identical)"
PGOPTIONS="-c client_min_messages=warning" $PSQL -d "$DB" -f "$R100/ROLLBACK_rally100_v1.sql" >/dev/null
F2="$(fp "$DB")"
LEFT="$($PSQL -At -d "$DB" -c "select count(*) from pg_namespace where nspname = 'rally100'")"
[ "$F0" = "$F2" ] && [ "$LEFT" = "0" ] || { echo "ROLLBACK: FAILED"; exit 1; }
echo "PASS: R.02 ROLLBACK_rally100_v1.sql removes rally100 entirely and leaves RALLY exactly as it was"
$PSQL -d "$DB" -f "$R100/APPLY_rally100_v1.sql" >/dev/null
F3="$(fp "$DB")"
N="$($PSQL -At -d "$DB" -c "select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'rally100' and has_function_privilege('authenticated', p.oid, 'execute')")"
[ "$F0" = "$F3" ] && [ "$N" = "39" ] || { echo "APPLY: FAILED (fingerprint or $N API functions)"; exit 1; }
echo "PASS: R.03 APPLY_rally100_v1.sql installs the same 39 API functions and also leaves RALLY untouched"
if $PSQL -d "$DB" -f "$R100/APPLY_rally100_v1.sql" >/dev/null 2>&1; then
  echo "APPLY: FAILED — a second run should stop at create schema"; exit 1
fi
F4="$(fp "$DB")"
[ "$F0" = "$F4" ] || { echo "APPLY: FAILED — the refused second run changed something"; exit 1; }
echo "PASS: R.04 a second APPLY run is refused as one transaction and changes nothing"

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
echo "RALLY rls-test.sql on the combined database (RALLY + RALLY 100): ALL GREEN ($RALLY_N checks)"

# ----------------------------------------------- 4. the RALLY 100 suite
DB=rally100_test
fresh "$DB"
# The worst project a migration could land in: every new object handed to
# every client role by default. 1001 must still leave clients nothing but the
# 39 doors.
$PSQL -d "$DB" >/dev/null <<'SQL'
alter default privileges grant all on tables    to anon, authenticated, service_role;
alter default privileges grant all on sequences to anon, authenticated, service_role;
alter default privileges grant all on functions to anon, authenticated, service_role;
alter default privileges grant all on schemas   to anon, authenticated, service_role;
SQL
$PSQL -d "$DB" -f "$MIG" >/dev/null
OUT="$(psql -X -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/rally100-test.sql" 2>&1)" || {
  echo "$OUT" | grep -v "PASS: " | tail -15; echo "RALLY 100 suite: FAILED"; exit 1;
}
echo "$OUT" | grep -o "PASS: .*"
SUITE_N="$(echo "$OUT" | grep -c "PASS: ")"

# ----------------------------------------------- 5. the shadow test
OUT="$(psql -X -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/shadow-test.sql" 2>&1)" || {
  echo "$OUT" | tail -15; echo "RALLY 100 shadow test: FAILED"; exit 1;
}
echo "$OUT" | grep -o "PASS: .*"
SHADOW_N="$(echo "$OUT" | grep -c "PASS: ")"

TOTAL=$((SUITE_N + SHADOW_N + 4))
echo "RALLY 100: ALL GREEN ($TOTAL checks: $SUITE_N suite + $SHADOW_N shadow + 4 install/rollback)"
echo "RALLY:     ALL GREEN ($RALLY_N rls-test.sql checks on the combined database)"
