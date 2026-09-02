#!/bin/sh
# RALLY — the WHOLE-PAYMENT-OBJECT rule (0004), with its NEGATIVE CONTROL.
#
# The production upsert replaces the entire data column:
#     INSERT .. ON CONFLICT (team_id,id) DO UPDATE SET data = EXCLUDED.data (and every
#     other column in the payload)
# A payload with no `payment` key therefore lands with no payment at all, and
# the trigger's field-level rule — which runs INSIDE an incoming payment
# object — never gets to look. The safe payment the row held is erased. That
# payload is exactly what the client sends when it cannot vouch for the shape
# and fails closed, so "fail closed" silently meant "erase".
#
# rls-test.sql §18 proves the CURRENT trigger preserves it. That proof is only
# worth anything if the same probe would have FAILED on the old trigger, so
# this script also installs the pre-fix function body (kept verbatim under
# test/fixtures/) over a freshly migrated database and requires the probe to
# see the erasure. A regression test that cannot see the bug it guards against
# is a green tick with nothing behind it.
#
#   PGHOST=/tmp/pgrls PGPORT=5544 sh rally/db/test/payment-absent-test.sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DB=rally_payment_absent_test
export PGUSER="${PGUSER:-postgres}"
TEAM=11111111-1111-4111-a111-111111111111
fails=0
say() { if [ "$1" = "1" ]; then echo "PASS: $2"; else echo "FAIL: $2"; fails=$((fails+1)); fi }

psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql"
for m in "$DIR"/../migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m" 2>/dev/null; done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "insert into public.teams (id,name) values ('$TEAM','Absent Team')"

SAFE='{"plan":{"id":"prem"},"payment":{"method":"ach","autopayRequested":true,"status":"pending_setup","card":{"name":"Dana Rivers"},"billingAddress":{"street":"1 Elm","city":"Provo","state":"UT","zip":"84604"}}}'
BLIND='{"plan":{"id":"prem"},"notesForever":"edited with honestPayment unavailable"}'

# the exact production statement shape
upsert() {  # $1 = data json
  psql -q -v ON_ERROR_STOP=1 -d "$DB" <<SQL
insert into public.customers (team_id, id, first, last, email, phones, created_by, deleted_at, data)
values ('$TEAM', 'abs-1', 'Dana', 'Rivers', 'd@x.com', '[]'::jsonb, null, null, '$1'::jsonb)
on conflict (team_id, id) do update set
  team_id = excluded.team_id, id = excluded.id, first = excluded.first, last = excluded.last,
  email = excluded.email, phones = excluded.phones, created_by = excluded.created_by,
  deleted_at = excluded.deleted_at, data = excluded.data;
SQL
}
payment() { psql -d "$DB" -Atc "select coalesce((data->'payment')::text,'<<ABSENT>>') from public.customers where id='abs-1'"; }
reset_row() { psql -q -d "$DB" -c "delete from public.customers where id='abs-1'"; upsert "$SAFE"; }

# ------------------------------------------------- the current trigger ---
reset_row
BEFORE="$(payment)"
upsert "$BLIND"
AFTER="$(payment)"
say "$([ "$AFTER" = "$BEFORE" ] && [ "$AFTER" != "<<ABSENT>>" ] && echo 1)" \
    "CURRENT trigger: a payment-less production upsert leaves the stored payment byte-for-byte"
say "$([ "$(psql -d "$DB" -Atc "select data->>'notesForever' from public.customers where id='abs-1'")" = "edited with honestPayment unavailable" ] && echo 1)" \
    "…and the rest of the payload lands"

# ------------------------------------------------- the NEGATIVE CONTROL ---
# install the pre-fix body over the same database; everything else identical
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/fixtures/scrub_customer_payment.before-whole-object-rule.sql"
reset_row
BEFORE_OLD="$(payment)"
upsert "$BLIND"
AFTER_OLD="$(payment)"
say "$([ "$BEFORE_OLD" != "<<ABSENT>>" ] && [ "$AFTER_OLD" = "<<ABSENT>>" ] && echo 1)" \
    "NEGATIVE CONTROL: the pre-fix trigger ERASES it under the identical probe (bug reproduced)"

# and the field-level rule alone was never enough: on the old body a stored
# payment survived a payment-CARRYING write but not a payment-LESS one
reset_row
upsert '{"plan":{"id":"prem"},"payment":{"method":"ach"}}'
say "$([ "$(psql -d "$DB" -Atc "select data->'payment'->>'autopayRequested' from public.customers where id='abs-1'")" = "true" ] && echo 1)" \
    "NEGATIVE CONTROL: …while the same old body DID preserve fields inside a sent object"

# ------------------------------------ the SECOND negative control (0a185f8) ---
# The first whole-object revision fixed the erasure and introduced a worse
# hole: a payment key holding a STRING or an ARRAY was written verbatim on any
# row with no held payment. Install that body and require the probe to see a
# bare PAN land — proving §19 A1/A2 can actually see the regression it pins.
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/fixtures/scrub_customer_payment.at-0a185f8.sql"
psql -q -d "$DB" -c "delete from public.customers where id='abs-1'"
upsert '{"plan":{"id":"prem"},"payment":"4111111111111111"}'
LANDED="$(payment)"
say "$([ "$LANDED" = '"4111111111111111"' ] && echo 1)" \
    "NEGATIVE CONTROL: the 0a185f8 body stores a bare PAN string verbatim (regression reproduced)"

# ------------------------------------------------- restored, and re-proved ---
# the CURRENT body is 0004's as amended by 0007 (last4 four digits or absent)
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../migrations/0007_last4_strict.sql" 2>/dev/null
reset_row
upsert "$BLIND"
say "$([ "$(payment)" = "$BEFORE" ] && echo 1)" \
    "re-installing the current trigger body (0007) restores preservation on the same database"
psql -q -d "$DB" -c "delete from public.customers where id='abs-1'"
upsert '{"plan":{"id":"prem"},"payment":"4111111111111111"}'
say "$([ "$(payment)" = "<<ABSENT>>" ] && echo 1)" \
    "…and the bare PAN string lands nothing under the current body"

psql -q -d postgres -c "drop database if exists $DB" >/dev/null 2>&1
if [ "$fails" -gt 0 ]; then echo "PAYMENT ABSENT: FAILED ($fails)"; exit 1; fi
echo "PAYMENT ABSENT: ALL GREEN (7 checks, incl. 3 negative controls)"
