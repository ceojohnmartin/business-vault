#!/bin/sh
# RALLY — the whole browser battery, with per-suite check counts.
#   NODE_PATH=/opt/node22/lib/node_modules sh rally/tests/run-all.sh
# The database battery is separate and needs PostgreSQL:
#   PGHOST=... PGPORT=... sh rally/db/test/run-rls-tests.sh
# Two more suites are deliberately NOT in the loop below, because each needs
# something this battery must not assume:
#   node rally/tests/mapkit-test.js         — Apple's real MapKit JS, fetched live
#   node rally/tests/import-caller-test.js  — the 0018 LOCAL REPLICA (PostgreSQL)
# `phase5` is the Phase 5 gate (customers at 10k, the property review and
# import caller, the numbered territory, the reset preview, the engine switch);
# `assign-ui` and `pin-placement` are the v42 turf-assignment and rooftop
# placement gates. All three run on a device with no cloud.
DIR="$(cd "$(dirname "$0")" && pwd)"
total=0; failed=0
# The two transition suites run TWICE: against v38 (the last candidate) and
# against v37 = c623c6f, the commit production actually serves. The v37 pair
# is the certification run; the v38 pair is regression cover for the branch.
# `v40` is the release-gate suite for the v40 compatibility work (atomic
# deletes, pending tombstones, reconciliation, proven identities); it opens
# dozens of browser contexts and is the slowest suite in the battery.
# `release-assets` compares index.html's cache-busting stamps against the
# service worker's precache list; it is instant, and a mismatch there would
# invalidate every suite after it, so it goes first.
# `v41-logic` is pure computation (geometry, cycle derivation, Route metric
# sets) and runs in plain node — no browser, so it is next and fastest.
# `v41` and `v41-ui` are the v41 release gates: the server-owned merge, the
# capability latch, do-not-knock authority, and the turf screens.
# `refusals` is the v42 gate: the refusal LIST the count has pointed at since
# v39, proved end to end against a server that says no to turf.
# A suite that dies before its first check used to print "0 checks FAILED"
# and nothing else, which reads like a broken product and is usually a
# LEFTOVER SERVER. Every suite binds its own port; a run killed part-way
# leaves the node server and its Chromium alive, and the next run gets
# EADDRINUSE and exits before printing anything. Proved with lsof: pid
# holding 0.0.0.0:8875 with fourteen live Chromium connections, from a v40
# run that had been killed. So: clear the field first, and never let a
# startup crash be silent (see the failure branch below).
pkill -f 'business-vault/rally/tests/' >/dev/null 2>&1 || true
pkill -f 'pw-browsers/chromium' >/dev/null 2>&1 || true
sleep 1

for f in release-assets v41-logic smoke auth facade flow2 doors-fix sync realtime cloud-auth font-boot \
         backup-secrets role attribution payment-honesty v40 v41 v41-ui refusals mixed-version \
         upgrade-transition mixed-version@v37 upgrade-transition@v37 smart-split torture \
         assign-ui pin-placement phase5; do
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
    if [ "$n" = "0" ]; then
      # no checks ran at all: this is a crash, not a failing assertion
      printf '%s\n' "$out" | head -6 | sed 's/^/    /'
    else
      printf '%s\n' "$out" | grep '✗' | head -5
    fi
  else
    printf '%-20s %3d checks  ok\n' "$f" "$n"
  fi
done
echo "----------------------------------------"
printf 'TOTAL %d checks across 25 suite runs, %d suite(s) failing\n' "$total" "$failed"
[ "$failed" = "0" ] || exit 1
