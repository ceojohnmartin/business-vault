#!/bin/sh
# RALLY — the whole browser battery, with per-suite check counts.
#   NODE_PATH=/opt/node22/lib/node_modules sh rally/tests/run-all.sh
# The database battery is separate and needs PostgreSQL:
#   PGHOST=... PGPORT=... sh rally/db/test/run-rls-tests.sh
DIR="$(cd "$(dirname "$0")" && pwd)"
total=0; failed=0
# The two transition suites run TWICE: against v38 (the last candidate) and
# against v37 = c623c6f, the commit production actually serves. The v37 pair
# is the certification run; the v38 pair is regression cover for the branch.
# `v40` is the release-gate suite for the v40 compatibility work (atomic
# deletes, pending tombstones, reconciliation, proven identities); it opens
# dozens of browser contexts and is the slowest suite in the battery.
for f in smoke auth facade flow2 doors-fix sync realtime cloud-auth font-boot \
         backup-secrets role attribution payment-honesty v40 mixed-version \
         upgrade-transition mixed-version@v37 upgrade-transition@v37 smart-split torture; do
  base="${f%@v37}"
  t="$DIR/$base.js"; [ -f "$t" ] || t="$DIR/$base-test.js"
  [ -f "$t" ] || { echo "MISSING: $f"; failed=$((failed+1)); continue; }
  if [ "$f" != "$base" ]; then
    out="$(OLD_REF=c623c6f OLD_BUILD=v37 PORT=$([ "$base" = "mixed-version" ] && echo 8867 || echo 8871) node "$t" 2>&1)"; code=$?
  else
    out="$(node "$t" 2>&1)"; code=$?
  fi
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
printf 'TOTAL %d checks across 20 suite runs, %d suite(s) failing\n' "$total" "$failed"
[ "$failed" = "0" ] || exit 1
