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

# a 0001-era row: under 0001's trigger last4 is stored VERBATIM, so this is
# exactly what a card number sent before 0004 looks like in the table. It is
# the witness for 0006: still there after the broken apply, gone after the real one.
psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "insert into public.teams (id,name) values
  ('11111111-1111-4111-a111-111111111111','T')"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "insert into public.customers (team_id,id,data) values
  ('11111111-1111-4111-a111-111111111111','era-0001',
   '{\"payment\":{\"method\":\"card\",\"last4\":\"4111111111111111\",\"autopay\":true}}'::jsonb)"
holds_pan() { psql -d "$DB" -Atc "select position('4111111111111111' in data::text) > 0
  from public.customers where id='era-0001'"; }
say "$([ "$(holds_pan)" = "t" ] && echo 1)" "(setup) a 0001-era row holds a verbatim card number in last4"

# ---------------------------------------------------------------- broken ---
# inject the error into the LAST section — after 0006's own statement, so
# 0004, 0003, 0005 AND the row rebuild have all already "succeeded" inside
# the transaction — the strongest form of the test
cp "$DIR/../APPLY_v39.sql" /tmp/rally-apply-broken.sql
python3 - <<'PY'
src = open('/tmp/rally-apply-broken.sql').read()
marker = 'update public.customers set data = data;'
assert src.count(marker) == 1, 'apply file no longer ends with the 0006 statement'
assert src.rstrip().endswith('commit;'), 'apply file no longer ends with commit'
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
say "$([ "$(holds_pan)" = "t" ] && echo 1)" "…nor 0006: the 0001-era card number is STILL there (the rebuild rolled back)"

# ------------------------------------------------------------------ real ---
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../APPLY_v39.sql" >/dev/null
say "$([ "$(have_split_fn)" = "1" ] && echo 1)" "the real file installs the Smart Split function"
say "$([ "$(have_split_tbl)" = "t" ] && echo 1)" "…and its operation table"
say "$([ "$(have_pay_pick)" = "1" ] && echo 1)" "…and 0004's payment pickers"
say "$([ "$(role_gated)" -ge 1 ] && echo 1)" "…and 0003's role-gated territory policies"
say "$([ "$(holds_pan)" = "f" ] && echo 1)" "…and 0006 ran: the 0001-era card number is gone from the table"

# and running it a SECOND time changes nothing and raises nothing
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../APPLY_v39.sql" >/dev/null
say "$([ "$(have_split_fn)" = "1" ] && [ "$(role_gated)" -ge 1 ] && echo 1)" \
    "the whole file is idempotent — a second run is safe"

psql -q -d postgres -c "drop database if exists $DB" >/dev/null 2>&1
if [ "$fails" -gt 0 ]; then echo "APPLY ATOMIC: FAILED ($fails)"; exit 1; fi
echo "APPLY ATOMIC: ALL GREEN (13 checks)"
