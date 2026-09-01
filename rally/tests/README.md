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

`mixed-version-test.js` additionally needs a git checkout: it materialises the
v38 tree itself with `git archive` into /tmp/rally-v38-tree (idempotent), so
it always tests the client that actually shipped rather than a mock of it.
