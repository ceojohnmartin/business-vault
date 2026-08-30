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

Requires `playwright` resolvable via NODE_PATH and Chromium at
/opt/pw-browsers/chromium (or edit executablePath). Screenshots land in
tests/shots/. Every suite exits non-zero on failure.
