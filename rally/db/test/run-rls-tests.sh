#!/bin/sh
# RALLY — proves the schema's Row Level Security on a throwaway local
# PostgreSQL database. Point it at any dev cluster:
#
#   PGHOST=/tmp/pg-rls PGPORT=5544 sh rally/db/test/run-rls-tests.sh
#
# It creates (and drops) a database named rally_rls_test, applies the
# Supabase shim + every migration in order, then runs every RLS check.
# Any failing check aborts with a non-zero exit.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DB=rally_rls_test
export PGUSER="${PGUSER:-postgres}"

# The territory capability matrix has ONE definition (capability-matrix.json).
# It is fed into the SQL so the server checks assert against the same table
# the client tests do — neither side can drift without the other failing.
MATRIX="$DIR/../capability-matrix.json"
cap() {
  grep -o "\"$1\"[[:space:]]*:[[:space:]]*\(true\|false\)" "$MATRIX" \
    | head -1 | grep -o 'true\|false'
}
REP_MANAGE="$(cap rep)"; LEADER_MANAGE="$(cap leader)"
MANAGER_MANAGE="$(cap manager)"; OWNER_MANAGE="$(cap owner)"
for v in "$REP_MANAGE" "$LEADER_MANAGE" "$MANAGER_MANAGE" "$OWNER_MANAGE"; do
  [ -n "$v" ] || { echo "capability-matrix.json is unreadable"; exit 1; }
done

psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" \
     -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql"
for m in "$DIR"/../migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m"
done
OUT="$(psql -v ON_ERROR_STOP=1 -d "$DB" \
        -v rep_manage="$REP_MANAGE" -v leader_manage="$LEADER_MANAGE" \
        -v manager_manage="$MANAGER_MANAGE" -v owner_manage="$OWNER_MANAGE" \
        -f "$DIR/rls-test.sql" 2>&1)" || {
  echo "$OUT" | tail -20; echo "RLS: FAILED"; exit 1;
}
echo "$OUT" | grep -o "PASS: .*"
N="$(echo "$OUT" | grep -c "PASS: ")"
echo "RLS: ALL GREEN ($N checks)"

# Concurrency cannot be tested from one session, and the payment trigger has a
# lost-update failure mode that only appears under it. Same database, so the
# migrations above are already applied.
sh "$DIR/race-test.sh" "$DB"

# Smart Split's guarantee is that a hood is never covered twice. Two managers
# reaching for the same parent is the only way to break it, and that needs two
# sessions too.
sh "$DIR/split-race-test.sh" "$DB"

# The browser tests run against a JS mirror of the payment trigger. A mirror
# that has drifted keeps every client test green while describing a server
# that no longer exists, so the mirror is diffed against this very database.
if command -v node >/dev/null 2>&1; then
  node "$DIR/mirror-fidelity.js" "$DB"
else
  echo "MIRROR: SKIPPED (no node on PATH)"
fi

# The whole-payment-object rule, with its NEGATIVE CONTROL: the pre-fix trigger
# body is installed over a fresh database and the same probe must see the
# erasure, or the regression test is proving nothing. Its own database.
sh "$DIR/payment-absent-test.sh"

# The deployment story rests on APPLY_v39.sql being all-or-nothing. That is a
# claim about a real database, so it is tested against one — on its own
# throwaway database, since it deliberately applies a broken file.
sh "$DIR/apply-atomic-test.sh"

# 0007 — last4 is four digits or absent — with its NEGATIVE CONTROL: the
# shipped APPLY_v39.sql really keeps an empty last4 (what probe 12 found in
# production), and APPLY_v39_1.sql really removes it, atomically. Its own
# database. It also runs verify-production's editor form end to end, so that
# form must be in sync with the psql file it is generated from.
sh "$DIR/build-editor-verify.sh" --check
sh "$DIR/last4-strict-test.sh"
