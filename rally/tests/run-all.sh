#!/bin/sh
# RALLY — the whole browser battery, with per-suite check counts.
#   NODE_PATH=/opt/node22/lib/node_modules sh rally/tests/run-all.sh
# The database battery is separate and needs PostgreSQL:
#   PGHOST=... PGPORT=... sh rally/db/test/run-rls-tests.sh
DIR="$(cd "$(dirname "$0")" && pwd)"
total=0; failed=0
for f in smoke auth facade flow2 doors-fix sync realtime cloud-auth font-boot \
         backup-secrets role attribution payment-honesty mixed-version \
         upgrade-transition smart-split torture; do
  t="$DIR/$f.js"; [ -f "$t" ] || t="$DIR/$f-test.js"
  [ -f "$t" ] || { echo "MISSING: $f"; failed=$((failed+1)); continue; }
  out="$(node "$t" 2>&1)"; code=$?
  n="$(printf '%s' "$out" | grep -c '✓')"
  total=$((total+n))
  if [ "$code" != "0" ]; then
    failed=$((failed+1))
    printf '%-20s %3d checks  FAILED\n' "$f" "$n"
    printf '%s\n' "$out" | grep '✗' | head -5
  else
    printf '%-20s %3d checks  ok\n' "$f" "$n"
  fi
done
echo "----------------------------------------"
printf 'TOTAL %d checks across 17 suites, %d suite(s) failing\n' "$total" "$failed"
[ "$failed" = "0" ] || exit 1
