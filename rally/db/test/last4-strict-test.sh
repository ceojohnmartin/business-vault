#!/bin/sh
# RALLY — 0007 (last4 is four digits or absent), with its NEGATIVE CONTROL.
#
# Found in production by verify-production.sql probe 12 minutes after
# APPLY_v39.sql committed: one customer row held  "last4": ""  — a v37-era
# row that 0006 had rebuilt (updated_at at the APPLY minute) and 0004's rule
# ('^([0-9]{4})?$', "four digits or empty") had kept. This script replays
# that exact history on a real database from the committed files:
#
#   1. 0001+0002, a v37-shaped row (last4 "" + legacy autopay) and a
#      v39-wire-shaped row (last4 "") — what the two clients actually send;
#   2. the SHIPPED APPLY_v39.sql: the "" must SURVIVE (negative control —
#      the shipped path really has the defect), probe 12 must see it, and a
#      fresh v39 write must still land "" (incoming writes had it too);
#   3. a deliberately BROKEN APPLY_v39_1.sql: nothing may change;
#   4. the real APPLY_v39_1.sql: the key is gone on both rows, everything
#      beside it kept, updated_at moved, probe 12 PASSES (13 of 13), a fresh
#      "" stores no key, a held 1234 survives a payment-less upsert;
#   5. a second run changes nothing; and 0007's function body is 0004's
#      with exactly one rule changed.
#
#   PGHOST=/tmp/pgrls PGPORT=5544 sh rally/db/test/last4-strict-test.sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DB=rally_last4_strict_test
export PGUSER="${PGUSER:-postgres}"
TEAM=11111111-1111-4111-a111-111111111111
fails=0
say() { if [ "$1" = "1" ]; then echo "PASS: $2"; else echo "FAIL: $2"; fails=$((fails+1)); fi }
q() { psql -d "$DB" -Atc "$1"; }
pay() { q "select coalesce((data->'payment')::text,'<<ABSENT>>') from public.customers where id='$1'"; }
has_l4() { q "select data->'payment' ? 'last4' from public.customers where id='$1'"; }
probe12() { q "select count(*) from public.customers
   where data::text ~ '\"(number|cardNumber|exp|expiry|cvv|cvc|routing|account|accountNumber|routingNumber)\"'
      or (data->'payment' ? 'last4' and data->'payment'->>'last4' !~ '^[0-9]{4}$')
      or (data->'payment' ? 'autopay')
      or (deleted_at is not null and data ? 'payment')
      or (jsonb_typeof(data->'payment') is not null and jsonb_typeof(data->'payment') <> 'object')"; }
body_has_old_rule() { q "select pg_get_functiondef(oid) like '%^([0-9]{4})?\$%' from pg_proc
  where proname='scrub_customer_payment' and pronamespace='public'::regnamespace"; }
verify() {  # runs the editor form; prints "<pass> <fail>"
  psql -d "$DB" -f "$DIR/verify-production.editor.sql" 2>&1 > /tmp/rally-l4-verify.out || true
  echo "$(grep -c '| PASS' /tmp/rally-l4-verify.out) $(grep -c 'FAIL' /tmp/rally-l4-verify.out)"
}

psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../migrations/0001_phase1_foundation.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../migrations/0002_realtime_doorbell.sql"
# a team with a real rep and a real owner, so verify-production can probe
psql -q -v ON_ERROR_STOP=1 -d "$DB" <<SQL
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'owner@x.com', '{"name":"Owner"}'),
  ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', 'rep@x.com',   '{"name":"Rep"}');
insert into public.teams (id, name) values ('$TEAM', 'Team A');
update public.profiles set team_id = '$TEAM', role = 'owner' where id = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
update public.profiles set team_id = '$TEAM', role = 'rep'   where id = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
-- the production row: what a v37 client stores for a customer with no card
insert into public.customers (team_id, id, first, last, data) values ('$TEAM', 'v37-fake', 'ZZTest', 'Before39',
  '{"payment":{"method":"card","autopay":true,"last4":"","billingAddress":{"street":"","city":"","state":"","zip":""}}}');
SQL
T0="$(q "select updated_at from public.customers where id='v37-fake'")"
sleep 1

# ------------------------------------------------- the SHIPPED v39 path ---
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../APPLY_v39.sql" >/dev/null 2>&1
# and, under 0004, what the v39 wire copy sends for a customer with no legacy
# last4 (js/sync.js: last4: p.last4 || "") — every v39 customer save
psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "insert into public.customers (team_id, id, first, last, data) values ('$TEAM', 'v39-cust', 'New', 'Signup',
  '{\"payment\":{\"method\":\"ach\",\"last4\":\"\",\"autopayRequested\":true,\"status\":\"pending_setup\",\"card\":{\"name\":\"\"},\"ach\":{\"name\":\"\",\"type\":\"checking\"},\"billingAddress\":{\"street\":\"\",\"city\":\"\",\"state\":\"\",\"zip\":\"\"}}}')"
say "$([ "$(has_l4 v37-fake)" = "t" ] && [ "$(q "select data->'payment'->>'last4' from public.customers where id='v37-fake'")" = "" ] && echo 1)" \
    "NEGATIVE CONTROL: the shipped APPLY_v39.sql keeps a v37-era empty last4 (0006 rebuilt the row, 0004 allowed the \"\")"
say "$([ "$(q "select data->'payment' ? 'autopay' from public.customers where id='v37-fake'")" = "f" ] && echo 1)" \
    "…the same rebuild DID drop the legacy autopay beside it — so 0006 really touched this row"
say "$([ "$(q "select updated_at > '$T0'::timestamptz from public.customers where id='v37-fake'")" = "t" ] && echo 1)" \
    "…and moved updated_at (customers_touch on the 0006 statement) — the timestamp production shows"
say "$([ "$(has_l4 v39-cust)" = "t" ] && [ "$(q "select data->'payment'->>'autopayRequested' from public.customers where id='v39-cust'")" = "true" ] && echo 1)" \
    "NEGATIVE CONTROL: under 0004 the v39 wire copy's empty last4 is stored too (beside a real request)"
say "$([ "$(probe12)" = "2" ] && echo 1)" "NEGATIVE CONTROL: probe 12 counts both rows as violations (2)"
set -- $(verify)
say "$([ "$1" = "12" ] && [ "$2" = "1" ] && grep -q '12 every stored row.*FAIL' /tmp/rally-l4-verify.out && echo 1)" \
    "NEGATIVE CONTROL: verify-production (editor form) reports exactly probe 12 failing (12 PASS, 1 FAIL)"
psql -q -d "$DB" -c "insert into public.customers (team_id,id,first,last,data) values ('$TEAM','fresh-1','F','1','{\"payment\":{\"method\":\"card\",\"last4\":\"\"}}')"
say "$([ "$(has_l4 fresh-1)" = "t" ] && echo 1)" "NEGATIVE CONTROL: under the shipped 0004 a fresh write with last4 \"\" stores the key"
psql -q -d "$DB" -c "delete from public.customers where id='fresh-1'"

# ----------------------------------------------------------- broken v39.1 ---
cp "$DIR/../APPLY_v39_1.sql" /tmp/rally-apply-v391-broken.sql
python3 - <<'PY'
src = open('/tmp/rally-apply-v391-broken.sql').read()
marker = 'update public.customers set data = data;'
assert src.count(marker) == 1, 'apply file no longer ends with the rebuild statement'
assert src.rstrip().endswith('commit;'), 'apply file no longer ends with commit'
open('/tmp/rally-apply-v391-broken.sql', 'w').write(src.replace(marker, marker + '\nthis is not valid sql at all;'))
PY
set +e
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f /tmp/rally-apply-v391-broken.sql >/dev/null 2>&1
BROKE=$?
set -e
say "$([ "$BROKE" != "0" ] && echo 1)" "a broken APPLY_v39_1.sql fails loudly (exit $BROKE)"
say "$([ "$(body_has_old_rule)" = "t" ] && echo 1)" "…and the trigger still carries 0004's rule (the function replacement rolled back)"
say "$([ "$(has_l4 v37-fake)" = "t" ] && echo 1)" "…and the empty last4 is STILL there (the rebuild rolled back)"

# ------------------------------------------------------------- real v39.1 ---
T1="$(q "select updated_at from public.customers where id='v37-fake'")"
sleep 1
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../APPLY_v39_1.sql" >/dev/null
say "$([ "$(body_has_old_rule)" = "f" ] && echo 1)" "APPLY_v39_1.sql installs the four-digits-or-absent rule"
say "$([ "$(has_l4 v37-fake)" = "f" ] && [ "$(has_l4 v39-cust)" = "f" ] && echo 1)" \
    "…the empty last4 is gone from BOTH rows"
say "$([ "$(q "select data->'payment'->>'method' = 'card' and data->'payment'->'billingAddress'->>'zip' = '' from public.customers where id='v37-fake'")" = "t" ] && echo 1)" \
    "…and the metadata beside it is untouched (method, billingAddress)"
say "$([ "$(q "select data->'payment'->>'autopayRequested' = 'true' and data->'payment'->>'status' = 'pending_setup' and data->'payment'->'ach'->>'type' = 'checking' from public.customers where id='v39-cust'")" = "t" ] && echo 1)" \
    "…the v39 row keeps its request, status and ach type"
say "$([ "$(q "select updated_at > '$T1'::timestamptz from public.customers where id='v37-fake'")" = "t" ] && echo 1)" \
    "…updated_at moved again: one pull wave, as documented for 0006"
say "$([ "$(probe12)" = "0" ] && echo 1)" "probe 12 counts nothing (0)"
set -- $(verify)
say "$([ "$1" = "13" ] && [ "$2" = "0" ] && echo 1)" "verify-production (editor form) is 13 PASS, 0 FAIL"
psql -q -d "$DB" -c "insert into public.customers (team_id,id,first,last,data) values ('$TEAM','fresh-2','F','2','{\"payment\":{\"method\":\"card\",\"last4\":\"\"}}')"
say "$([ "$(has_l4 fresh-2)" = "f" ] && [ "$(q "select data->'payment'->>'method' from public.customers where id='fresh-2'")" = "card" ] && echo 1)" \
    "a fresh write with last4 \"\" now stores no key (method kept)"
psql -q -d "$DB" -c "update public.customers set data='{\"payment\":{\"method\":\"card\",\"last4\":\"1234\"}}' where id='fresh-2'"
psql -q -v ON_ERROR_STOP=1 -d "$DB" <<SQL
insert into public.customers (team_id, id, first, last, email, phones, created_by, deleted_at, data)
values ('$TEAM', 'fresh-2', 'F', '2', '', '[]'::jsonb, null, null, '{"plan":{"id":"prem"}}'::jsonb)
on conflict (team_id, id) do update set
  team_id = excluded.team_id, id = excluded.id, first = excluded.first, last = excluded.last,
  email = excluded.email, phones = excluded.phones, created_by = excluded.created_by,
  deleted_at = excluded.deleted_at, data = excluded.data;
SQL
say "$([ "$(q "select data->'payment'->>'last4' from public.customers where id='fresh-2'")" = "1234" ] && echo 1)" \
    "a held 1234 survives a payment-less production upsert"
psql -q -d "$DB" -c "insert into public.customers (team_id,id,first,last,data) values ('$TEAM','fresh-2','F','2','{\"payment\":{\"method\":\"card\",\"last4\":\"\"}}') on conflict (team_id,id) do update set data = excluded.data"
say "$([ "$(q "select data->'payment'->>'last4' from public.customers where id='fresh-2'")" = "1234" ] && echo 1)" \
    "…and a v39 wire copy sending \"\" does not erase it (\"\" is NOT SENT, not a clear)"

# ------------------------------------------------------------ idempotent ---
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../APPLY_v39_1.sql" >/dev/null
say "$([ "$(probe12)" = "0" ] && [ "$(body_has_old_rule)" = "f" ] && echo 1)" "a second run of APPLY_v39_1.sql is safe (idempotent)"

# ------------------------------------------ 0007 is 0004 with ONE rule changed ---
python3 - "$DIR/../migrations/0004_payment_allowlist.sql" "$DIR/../migrations/0007_last4_strict.sql" <<'PY'
import sys, re
def body(p):
    s = open(p).read()
    a = s.index("create or replace function public.scrub_customer_payment() returns trigger")
    b = s.index("end $$;", a) + len("end $$;")
    return s[a:b]
b4, b7 = body(sys.argv[1]), body(sys.argv[2])
# strip comments and whitespace: only executable text is compared
strip = lambda t: re.sub(r"\s+", " ", re.sub(r"/\*.*?\*/", "", re.sub(r"--[^\n]*", "", t), flags=re.S)).strip()
s4, s7 = strip(b4), strip(b7)
old, new = "'^([0-9]{4})?$'", "'^[0-9]{4}$'"
assert s4.count(old) == 1 and s7.count(new) == 1 and old not in s7
assert s4.replace(old, new) == s7, "0007's body differs from 0004's beyond the last4 rule"
print("PASS: 0007's trigger body is 0004's with exactly the last4 rule changed")
PY

psql -q -d postgres -c "drop database if exists $DB" >/dev/null 2>&1
if [ "$fails" -gt 0 ]; then echo "LAST4 STRICT: FAILED ($fails)"; exit 1; fi
echo "LAST4 STRICT: ALL GREEN (24 checks, incl. 7 negative controls)"
