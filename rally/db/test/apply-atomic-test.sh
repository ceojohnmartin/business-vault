#!/bin/sh
# RALLY — proves db/APPLY_v39.sql is ALL OR NOTHING on a real database.
#
# The deployment story rests on one claim: if any part of the migration
# raises, none of it becomes live. That claim is easy to state and easy to
# get wrong (a stray COMMIT, a statement that cannot run inside a
# transaction), and the failure only shows up in production, half applied.
#
# So: apply a deliberately BROKEN copy — the real file with one syntax error
# injected into its LAST section — to a database that has only 0001 and 0002,
# and require that afterwards NOTHING from 0003, 0004 or 0005 exists. Then
# apply the real file to the same database and require that all of it does.
#
#   PGHOST=/tmp/pgrls PGPORT=5544 sh rally/db/test/apply-atomic-test.sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DB=rally_apply_atomic_test
export PGUSER="${PGUSER:-postgres}"
fails=0
say() { if [ "$1" = "1" ]; then echo "PASS: $2"; else echo "FAIL: $2"; fails=$((fails+1)); fi }

psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../migrations/0001_phase1_foundation.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../migrations/0002_realtime_doorbell.sql"

# what "applied" looks like, asked as three independent questions
have_split_fn() { psql -d "$DB" -Atc "select count(*) from pg_proc p join pg_namespace n
  on n.oid=p.pronamespace where n.nspname='public' and p.proname='smart_split_territory'"; }
have_split_tbl() { psql -d "$DB" -Atc "select to_regclass('public.territory_splits') is not null"; }
have_pay_pick() { psql -d "$DB" -Atc "select count(*) from pg_proc p join pg_namespace n
  on n.oid=p.pronamespace where n.nspname='public' and p.proname='pay_pick_text'"; }
have_0003() { psql -d "$DB" -Atc "select count(*) from pg_policies where schemaname='public'
  and tablename='territories' and policyname='territories_insert'
  and qual is distinct from null or (policyname='territories_insert'
  and with_check like '%my_role%')"; }
role_gated() { psql -d "$DB" -Atc "select count(*) from pg_policies where schemaname='public'
  and tablename='territories' and coalesce(with_check,'') like '%my_role%'"; }

# ---------------------------------------------------------------- broken ---
# inject the error into the LAST section, so everything before it has already
# "succeeded" inside the transaction — the strongest form of the test
awk '{ print }
     END { }' "$DIR/../APPLY_v39.sql" > /tmp/rally-apply-broken.sql
python3 - <<'PY'
src = open('/tmp/rally-apply-broken.sql').read()
marker = 'grant execute on function public.smart_split_territory(text, text, jsonb) to authenticated;'
assert marker in src, 'apply file no longer ends the way this test expects'
open('/tmp/rally-apply-broken.sql', 'w').write(
    src.replace(marker, marker + '\nthis is not valid sql at all;'))
PY
set +e
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f /tmp/rally-apply-broken.sql >/tmp/rally-apply-broken.out 2>&1
BROKE=$?
set -e
say "$([ "$BROKE" != "0" ] && echo 1)" "a broken migration file fails loudly (exit $BROKE)"
say "$([ "$(have_split_fn)" = "0" ] && echo 1)" "…and the Smart Split function did NOT become live"
say "$([ "$(have_split_tbl)" = "f" ] && echo 1)" "…nor its table"
say "$([ "$(have_pay_pick)" = "0" ] && echo 1)" "…nor 0004, which ran FIRST and appeared to succeed"
say "$([ "$(role_gated)" = "0" ] && echo 1)" "…nor 0003's role-gated territory policies"

# ------------------------------------------------------------------ real ---
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../APPLY_v39.sql" >/dev/null
say "$([ "$(have_split_fn)" = "1" ] && echo 1)" "the real file installs the Smart Split function"
say "$([ "$(have_split_tbl)" = "t" ] && echo 1)" "…and its operation table"
say "$([ "$(have_pay_pick)" = "1" ] && echo 1)" "…and 0004's payment pickers"
say "$([ "$(role_gated)" -ge 1 ] && echo 1)" "…and 0003's role-gated territory policies"

# and running it a SECOND time changes nothing and raises nothing
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../APPLY_v39.sql" >/dev/null
say "$([ "$(have_split_fn)" = "1" ] && [ "$(role_gated)" -ge 1 ] && echo 1)" \
    "the whole file is idempotent — a second run is safe"

psql -q -d postgres -c "drop database if exists $DB" >/dev/null 2>&1
if [ "$fails" -gt 0 ]; then echo "APPLY ATOMIC: FAILED ($fails)"; exit 1; fi
echo "APPLY ATOMIC: ALL GREEN (10 checks)"
