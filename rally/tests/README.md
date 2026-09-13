# RALLY test suites

Playwright suites that drive the real app against a local static server.
Run from anywhere (paths are relative to this directory):

    node tests/smoke.js           # 60-step whole-app walk: customer → sign →
                                  # schedule → knock → territory doors → backup
    node tests/auth-test.js       # device gate: sessions, lockout, recovery
    node tests/flow2-test.js      # customer flow v2: pricing, chips, filters
    node tests/doors-fix-test.js  # door-import dedupe regression suite
    node tests/facade-test.js     # MMAP facade contract: engine stays private,
                                  # draw/knock clicks flow through onMapClick
    node tests/sync-test.js       # two-device team sync: convergence, LWW,
                                  # tombstones, dedupe, offline queue, scrub
    node tests/realtime-test.js   # Phase 3 doorbell: sub-2s propagation over
                                  # a mock Phoenix websocket, burst collapse,
                                  # reconnect catch-up, cross-team refusal
    node tests/cloud-auth-test.js # Supabase auth bridge vs a mock server:
                                  # online/offline sign-in, disabled accounts,
                                  # confirm-email signup, legacy fallback
    node tests/role-test.js       # v39 REAL REP: the server owns the role.
                                  # client capability matrix vs
                                  # db/capability-matrix.json (the same file
                                  # the RLS suite asserts against), all four
                                  # roles, fail-closed, offline cached role,
                                  # demotion and promotion mid-session
    node tests/attribution-test.js# v39 REAL REP: stable-id attribution.
                                  # renames move no history, legacy name-only
                                  # records stay unattributed, two devices
                                  # agree, the leaderboard is real or empty
    node tests/payment-honesty-test.js
                                  # v39 REAL REP: a pre-v39 record with a full
                                  # PAN/expiry/routing/account driven through
                                  # boot → normalize → sync merge → backup →
                                  # restore → boot, asserted clean at every
                                  # step; plus the three claims v39 must never
                                  # make (autopay active, method on file,
                                  # charge authorized)
    node tests/mixed-version-test.js
                                  # MIXED-VERSION DEPLOYMENT SAFETY: the REAL
                                  # v38 client (checked out from git at the
                                  # commit it shipped from) and the real v39
                                  # client side by side against ONE server
                                  # already carrying 0003 + 0004. Proves no
                                  # data loss, no payment-intent corruption,
                                  # no retry storm, no write loop — and
                                  # documents the two things a v38 device
                                  # cannot tell its rep. Also covers the
                                  # partial-commit case: a leader queues a
                                  # territory delete, is demoted mid-flight,
                                  # and every affected door must come out
                                  # byte-for-byte unchanged.
    node tests/upgrade-transition-test.js
                                  # THE UPGRADE ITSELF: one origin, one scope,
                                  # a REAL service worker. Boots v38, does
                                  # work, publishes v39 underneath, and
                                  # measures how many opens it takes to land,
                                  # whether the old cache is dropped, and
                                  # whether the rep's saved work survives.

    node tests/smart-split-test.js
                                  # ATOMIC SMART SPLIT, client side: the split
                                  # is a proposal until the server answers.
                                  # Covers the happy 2- and 3-way splits, a
                                  # rep refused, a LOST response (the server
                                  # committed, the client never heard),
                                  # offline-then-demoted, a kill between send
                                  # and answer, a parent someone else split
                                  # first, a 500, a database without 0005
                                  # applied, and four splits in a row. The
                                  # FUNCTION's own correctness is proved
                                  # against real PostgreSQL instead — see
                                  # db/test/rls-test.sql §17 and
                                  # db/test/split-race-test.sh.
    node tests/torture-test.js    # CLOCK SKEW, INTERRUPTION, THE LONG RUN.
                                  # A phone five minutes fast against one with
                                  # the right time; the app killed at every
                                  # ugly moment including the boot window and
                                  # mid-sanitation; 100 knocks, five
                                  # offline/online round trips and four role
                                  # switches, watching for queue growth,
                                  # duplicate events and repeated
                                  # dead-lettering. Prints the skew findings
                                  # it confirms rather than hiding them behind
                                  # a green tick.

    node tests/assign-ui-test.js  # v42: the assign-rep panel and the polygon
                                  # card — a way of choosing, never a second
                                  # way of saving
    node tests/pin-placement-test.js
                                  # a pin lands on the roof of an L-shaped
                                  # house, never in its notch; a parcel point
                                  # moves onto the building inside its lot
    node tests/phase5-test.js     # PHASE 5 (no Apple token needed): the
                                  # Customers screen at 100 / 1,000 / 10,000
                                  # with the four operational statuses; the
                                  # Create Customer PAYMENT tab with no raw
                                  # credential surface; tap-corner drawing
                                  # with undo/redo; the property review
                                  # BEFORE a save; Save → the import caller
                                  # (solo path here, server path below); a
                                  # rescan that duplicates nothing; a hood
                                  # saved to two reps and one removed; the
                                  # territory NUMBER on every screen; the
                                  # reset / re-knock preview with Go Back
                                  # parked and Sold / DNK protected; a knock
                                  # made offline surviving a reload; the
                                  # engine switch keeping the selected door,
                                  # callback, note, turf and camera; MapKit →
                                  # MapLibre falling back loudly; the rep
                                  # view; the service-worker precache. Every
                                  # house is the DEMO provider's grid and the
                                  # suite labels it SYNTHETIC in its output.

    sh tests/run-all.sh           # every suite above, with check counts

Two suites stay OUT of run-all.sh because each needs something the battery
must not assume:

    node tests/mapkit-test.js     # Apple MapKit JS, the REAL library fetched
                                  # from Apple's CDN: the renderer contract,
                                  # geometry, clustering, the 401 refusal
                                  # without a developer token, the fallback,
                                  # the token never in a backup
    node tests/import-caller-test.js
                                  # 0018 LOCAL REPLICA ONLY. The real
                                  # STORE.importDoorsServer against the real
                                  # import_territory_doors on a per-run copy
                                  # of the local PostgreSQL replica: inserts,
                                  # the idempotent retry, matched-not-
                                  # duplicated, outside-the-outline, demo and
                                  # non-residential refusals surfaced as
                                  # ineligible, a rep refused, the exact
                                  # allowlisted wire shape. Production does
                                  # not carry 0018 and this suite never
                                  # reaches it (asserted: no request to
                                  # *.supabase.co).

    node tests/premium-shots.js   # not pass/fail: iPhone-size screenshots of
                                  # the 14 review states over REAL Google
                                  # imagery and REAL building footprints, with
                                  # a SIMULATED book of work. With
                                  # MAPKIT_TOKEN set it also captures REAL
                                  # Apple MapKit frames at 50/100/250/500
                                  # pins; without it, it says so and fakes
                                  # nothing.

Engine coverage: every suite here runs on **Chromium** (the only engine
installed at /opt/pw-browsers). The service-worker results in
upgrade-transition-test.js are therefore Chromium-only and have NOT been
verified on an installed iOS PWA — see the evidence-gap section in
rally/db/APPLIED.md before relying on them for an iPhone fleet.

The database's Row Level Security has its own suite — see rally/db/README.md
(`sh rally/db/test/run-rls-tests.sh` against any throwaway local Postgres).
That suite and `tests/role-test.js` both assert against
`rally/db/capability-matrix.json`, so the client's idea of who may manage a
territory cannot drift from what RLS actually enforces.

Requires `playwright` resolvable via NODE_PATH and Chromium at
/opt/pw-browsers/chromium (or edit executablePath). Screenshots land in
tests/shots/. Every suite exits non-zero on failure.

One JavaScript file, `tests/lib/scrub-trigger.js`, mirrors the server's
payment trigger for the mock Supabase in `sync-test.js` and
`mixed-version-test.js`. A mirror that has drifted is worse than none — every
client test keeps passing while describing a server that no longer exists — so
`db/test/mirror-fidelity.js` feeds the same payloads to real PostgreSQL and to
the mirror and requires byte-identical results, for both statement shapes. It
runs as part of `db/test/run-rls-tests.sh`.

`mixed-version-test.js` additionally needs a git checkout: it materialises the
v38 tree itself with `git archive` into /tmp/rally-v38-tree (idempotent), so
it always tests the client that actually shipped rather than a mock of it.
