# Which migrations are applied — and how to check without guessing

**This file is documentation. Nothing here changes the database.** Every query
below is READ-ONLY: paste it into the Supabase SQL editor, compare the result
to "expected", and write the answer in the table.

Claude cannot fill this table in. Verifying it needs credentials for the live
project, which it does not have and should not have. The anon key the app
ships with cannot read `pg_policies` or `pg_proc`.

## Status

Fill these in yourself after running each verification query.

| Migration | What it does | Applied on | Confirmed by |
|---|---|---|---|
| `0001_phase1_foundation.sql` | Schema, RLS, the payment scrub trigger | before 2026-09-02 | STEP 1 catalog query: "0 problem(s) of 51" |
| `0002_realtime_doorbell.sql` | Realtime wake-up triggers + listen policy | before 2026-09-02 | STEP 1 catalog query: "fully applied" (9 of 9 pieces) |
| `0003_territory_authorization.sql` | Territory writes are leadership-only | 2026-09-02 ~16:28 UTC (APPLY_v39.sql) | STEP 2 catalog query; verify-production probes 1, 6 PASS |
| `0004_payment_allowlist.sql` | Honest payment allowlist (`autopayRequested`, `status`, `card.name`, `ach.name`, `ach.type`) | 2026-09-02 ~16:28 UTC (APPLY_v39.sql) | STEP 2 catalog query; verify-production probes 3, 4, 5, 10, 11 PASS |
| `0005_smart_split.sql` | Atomic Smart Split: `territory_splits` + `smart_split_territory()` | 2026-09-02 ~16:28 UTC (APPLY_v39.sql) | STEP 2 catalog query; verify-production probes 7, 8, 9 PASS |
| `0006_payment_rebuild.sql` | Passes every stored customer row through 0004's trigger once | 2026-09-02 ~16:28 UTC (APPLY_v39.sql) | STEP 2 catalog query: "APPLIED — all 13 v39 pieces are live" |
| `0007_last4_strict.sql` | `last4` is four ASCII digits or the key is absent; rebuilds every row once more | 2026-09-03 01:05:18 UTC (APPLY_v39_1.sql; the rebuild stamped every customer row at that instant) | v39.1 confirmation query "APPLIED — 0007 is live and every stored last4 obeys it" (7 of 7); `verify-production.editor.sql` 14 PASS, 0 FAIL |

## What production actually runs

**Client:** GitHub Pages serves `origin/main` byte-for-byte. On 2026-09-02
13:33 UTC `main` became `95e2fb4` — **Build v39** (Pages run #100, every
served file byte-identical to the tree). Before that it was `c623c6f`, Build
v37; v38 (`813a056`) was a branch build that was never published, so the real
upgrade was **v37 → v39**, and the physical-iPhone certification of that jump
passed the same day (data survived; the reliable update procedure on iOS is
force-close / swipe RALLY out of the app switcher → reopen).

**Database, 2026-09-02 (the controlled cutover, one step at a time):**

1. STEP 1 — read-only catalog query: 0001 "0 problem(s) of 51", 0002 "fully
   applied", no v39 object present.
2. STEP 2 — `APPLY_v39.sql` (0004 → 0003 → 0005 → 0006, one transaction)
   returned Success at ~16:28 UTC; the read-only confirmation query returned
   "APPLIED — all 13 v39 pieces are live".
3. STEP 3 — `test/verify-production.editor.sql`: probes SETUP and 1–11 PASS,
   **probe 12 FAIL: "1 row(s) violate it"**. The row: a v37-era customer
   (created 05:08 UTC) whose payment object held `"last4": ""`, `updated_at`
   at 16:29 UTC — the APPLY minute. Root cause and fix: **0007**, below.
   Nothing was changed by hand in production.

4. STEP 2 of v39.1 — `APPLY_v39_1.sql` (0007, one transaction, table lock
   first) returned Success on 2026-09-03 at 01:05:18 UTC (the rebuild's
   `updated_at` stamp on every customer row); the read-only confirmation query
   returned "APPLIED — 0007 is live and every stored last4 obeys it" (7 of
   7 present).
5. STEP 3 of v39.1 — `test/verify-production.editor.sql`, all 14 probes:
   SETUP and 1–13 PASS, no FAIL, no unexpected error. Probe 12 (the stated
   rule AND the fixed point of the live trigger) and probe 13 (no
   credential-shaped key anywhere) both clean.
6. STEP 4 — the phone after the 0007 pull wave: Build v39, More reads
   "synced" (that word is only shown when nothing is pending AND nothing
   was refused — `js/app.js` renders the counts in its place otherwise),
   the v37-era test customer present, its PAYMENT tab with no card, CVV,
   expiry, routing or account fields and no "ends ####" line, the screen
   stating that RALLY does not collect card or bank numbers. Clean.
7. STEP 4a record, read from the live database at 2026-09-03 02:22 UTC:
   1 customer row, 0 tombstones, 0 rows holding a last4, 1 team, 2 enabled
   profiles, the trigger carries the 0007 rule, 0 Smart Splits recorded,
   and no customer write since the rebuild.

**Database state as of 2026-09-03: 0001, 0002, 0003, 0004, 0005, 0006, 0007
all live and verified. Nothing is pending.** Next: STEP 5, the real-iPhone
atomic Smart Split certification — it was **blocked by a v39 client defect
found while preparing it**, and **v40 fixes that defect** (below). No
production change is involved, and v40 is client-only.

### STEP 5 blocker: records the OLD build synced carry no `serverAt` (client)

**Status: fixed in v40. Not deployed.**

v39 gates two things on `serverAt`, its own evidence that a record is a
server fact: a Smart Split is sent only once the parent hood has it, and a
door's hood claim is pushed only if its hood has it. The stamp is set on a
successful push by v39 or when a pull delivers the row. A hood (or door)
that v37 pushed before the upgrade never got the stamp, and v39's pull
cursor is already past it — so on an upgraded phone every pre-v39 hood is
unsplittable (the children sit at "waiting on the team — not confirmed
yet", no RPC is ever sent, no error is shown) and every door knocked inside
one is uploaded with `territory_id = null` (`territoryWithheld` counts it).
Measured against the real v37 tree in `tests/upgrade-transition-test.js` §8:
before v40, 8c, 8d and 8e fail.

The database and 0005 were never at fault: the same split committed through
the real function in `verify-production` probes 8 and 9. The fix is on the
client, and it is v40.

## v40 — proving the book once (client only)

**Nothing in v40 touches the database.** No SQL, no migration, no RLS
change, no change to `smart_split_territory()` or 0005, no change to the
payment boundary. The whole release is `rally/js`, `index.html`, `sw.js`,
the tests and these docs. Rollback is republishing a v39 commit.

### The marker

`kv.syncReconcile = { v, team, state }`, where `state` is `"started"` or
`"done"`. A device is reconciled only when all three of the version, the
team and `done` match the team the server currently resolves for it. It is
cleared on reset, on erase, on a team change, and by a restore, and it never
travels in a backup: it is a fact about a device, not about the data.

On each cycle, while the marker is not this team's `done`, the engine asks
whether anything here is unprovable — a live record with no `serverAt` that
is not already queued for upload, **or** a pending tombstone queued without
proof that the row was ever on the server. If nothing is, it writes `done`
and costs zero requests: a clean v40 device and a fresh install never pay.
If something is, it resets the pull cursors of `territories`, `pins` and
`customers` to the epoch and writes `started` **in the same kv transaction**
as the reset, so a crash can never leave one without the other. Events keep
their cursor: the knock log carries no evidence and is the largest table.

`done` is written only after a pull in which **every** table reached its
last page. A partial read never proves anything.

### The per-page order, and why the cursor is last

Per page, each step awaited to commit before the next begins:

```
fetch → APPLY (local state; returns outbox INTENTS)
      → durable serverAt stamps
      → ONE outbox transaction: claim repairs
                              + delete-evidence upgrades
                              + delete/upsert retirements
      → cursor
```

So the cursor can only ever pass a row whose stamps and outbox changes are
already on disk. A crash anywhere before it re-fetches that one page, and
every step re-derives the same result from the delivered rows — no decision
depends on anything held only in memory. A stamp write that fails is **not**
swallowed: the page is abandoned and retried, because a cursor that passes an
unstamped row reopens the exact gap this release exists to close.

APPLY no longer mutates the outbox at all. It decides local record state and
returns intents; `pull` commits them. That removed six fire-and-forget
`dropEntry` calls, two of which could leave a queued upsert able to resurrect
a record the team had already retired.

### The claim repair

A door the server holds whose `territory_id` column is null, whose local copy
names a hood, and whose hood is now proven, is queued once. The decision is
made only from the delivered row plus durable local state, so it is
recomputed identically after a crash; the repaired row echoes back with the
column set, so a door costs at most one extra upload. There is no separate
final scan — one repair path, per page, durable before the cursor.

### Deleting is one transaction

`deletePin`, `deleteCustomer` and `deleteTerritory` used to remove the record
in one IndexedDB transaction and write the tombstone in another, so a kill
between them could leave **the record gone and the tombstone gone** — a
deletion the team never hears about, and one the next pull quietly undoes.
`MDB.txn` (new, `js/db.js`) runs one readwrite transaction across several
stores, and each delete now commits the record removal, its cascade (a pin's
events, a customer's files, a hood's released doors) and every tombstone row
together. On disk there are exactly two possible states: the record present
with no new tombstone, or the record gone with every tombstone intended.
Never half. Memory is updated and the tombstones registered with the engine
*before* the transaction opens, so a pull landing in the gap cannot reinsert
the record; if the commit fails, all of it rolls back and the rep is told.

### Pending tombstones are not resurrected

`pendingDeletes` mirrors every outbox delete entry as key → entry, rebuilt
from disk at `start()` and at the top of every `push()`. The record is gone,
so this is the only place a pull can learn that a delivered live row must not
be re-inserted. Each APPLY's "no local record" branch consults it. `cycle()`
now also requires `loaded`, so no pull can apply before that mirror has been
read from the outbox.

A delivered **live** row for a pending delete also proves the server holds it,
so the entry is rewritten `wasOnServer: true` — durably, before that page's
cursor. A delivered **tombstone** retires the entry the same way. And a
zero-row PATCH may only be finalised as "never uploaded" once reconciliation
is `done` for this team; before that the tombstone is *held* (still queued,
counted by `status().held`), because "zero rows changed" can equally mean the
pull has not reached that row yet. Discarding it there would lose a real
deletion — the blind-spot case that a legacy record deleted offline, with
nothing else unproven, would otherwise have hit.

### Proven identities, and one intentional v39 → v40 reversal

A door can carry several server identities: its own id, plus rows other
devices uploaded for the same door and this device merged in (`aka`). The
door index that decides those merges is a heuristic by design — its last two
tiers are an unscoped street line and a **~30 m coordinate box** — so an
alias is not proof of identity, and `aka` values can also be inherited
wholesale from the wire.

v40 records *how* a merge was made. Only an identity-grade tier (a provider's
`externalId`, or a zip/city-scoped address) creates a **proven** identity, in
`akaSure`; proximity, `parcelId`, inheritance without proof, and every alias
predating v40 do not. `akaSure` is inherited from the wire (so the proof is
transitive across devices), deduplicated, never the door's own id, and never
an identity another live door here already claims.

**Deleting a door retires its proven identities and only those.** That
reverses a v39 behaviour deliberately, and `tests/sync-test.js` L1 was
rewritten to say so:

- v39: deleting one duplicate import identity did not retire the other, so
  the row stayed live and came back on a later pull as a new door.
- v40: once identities are proven to be the same logical door, deleting the
  door retires every proven identity.

A heuristic alias is still never retired: a false 30 m merge must not be able
to delete a neighbour's door. If such an alias later reappears as its own
door, that is the accepted, recoverable failure — the destructive one is not.

A proven alias whose server row is already gone produces a zero-row PATCH,
which is surfaced once through the ordinary refusal path rather than assumed
harmless. That is deliberate: for deletion a visible refusal beats a silent
partial delete.

### Backups carry no evidence

`serverAt` is stripped from pins, hoods and customers on export **and** on
import, and the marker is in `PRIVATE_KV` and cleared by a restore. A
restored device proves every record again through the normal push and pull.
Restore already cleared the cursors and the one-time backfill flag.

`backfill()` now reads the book from **disk** rather than the in-memory
arrays. A restore writes the file's records straight into IndexedDB and only
then reloads, so for ~900 ms the two disagree; a cycle firing in that gap
used to spend the one-time flag against the stale copy, leaving every
restored record unqueued — and, where one had a tombstone pending, letting
the delete win over the record the file had just put back. This was a v39
race, not something v40 introduced; it is fixed here because v40's tests
found it.

### What proves it

- `tests/v40-test.js` — the release gate: the atomic-delete matrix (D0–D6 for
  pins, hoods and customers), the page crash matrix (P0–P8) with the claim
  repair, pending-tombstone protection including the legacy-delete-only
  blind spot for all three tables, the held-delete rule, the reconcile
  predicate, team change, 1,200-door scale, backup/restore, tier gating,
  alias uniqueness, transitive `akaSure` across three devices, and the
  proven-alias delete matrix (A0–A8).
- `tests/upgrade-transition-test.js` §8 — the original blocker, on the REAL
  old tree, no longer gated: 8c, 8d and 8e are green. §9 adds the claim
  repair and an unproven delete made across the upgrade.
- Every pre-existing suite is unchanged except L1 above.

### One race v40's tests found, and fixed

`backfill()` read the book from the in-memory arrays. A restore writes the
file's records straight into IndexedDB and only reloads ~900 ms later, so a
cycle firing in that window spent the one-time flag against the stale copy:
every restored record stayed unqueued, and where one of them had a tombstone
pending, the delete won over the record the file had just put back. It now
reads from disk. This was v39 behaviour, not something v40 introduced.

## 0007 — `last4` is four digits or absent (found by probe 12 in production)

The migration and the verification disagreed, and the verification was right.

- **Mechanism, reproduced on real PostgreSQL from the committed files
  (`test/last4-strict-test.sh`):** 0004's rule for `last4` was
  `'^([0-9]{4})?$'` — four digits **or empty**, by design ("a rep clearing the
  field"). A v37 client stores `last4: ""` for a customer with no card, and
  the v39 wire copy (`js/sync.js`, `last4: p.last4 || ""`) sends `""` for every
  customer without a legacy last4. So `""` reached the table on the INSERT
  path, the UPDATE path and the upsert path alike. 0006's
  `update public.customers set data = data` passed the v37-era row through
  0004's trigger: it dropped the legacy `autopay`, kept the `""`, and
  `customers_touch` stamped `updated_at = now()` — which is exactly the
  `updated_at` production shows on the row. **0006 caused the timestamp; the
  app did not rewrite the row.**
- **Blast radius:** any customer row holding `last4: ""` — the one v37-era
  row today, and every future v39 customer save without a legacy last4, had
  the rule stayed. No credential was involved; the client's own
  `honestPayment()` already omits anything that is not four digits.
- **The rule now (0007, enforced in the trigger, its JS mirror, and probe
  12):** exactly four ASCII digits may be stored; anything else — `""`,
  whitespace, 1–3 or 5+ digits, a stray space, non-ASCII digits, null, a
  number, an array, an object — is NOT SENT under the whole-object rule: a
  valid held last4 stands, otherwise the key is absent. There is no "clear"
  through last4: v39 has no last4 input, so no client can intend one, and a
  clear would have to survive the INSERT pass of an upsert as `""` to reach
  the UPDATE pass, i.e. be stored as the very value ruled out.
- **What 0007 does:** replaces `scrub_customer_payment()` with 0004's body
  carrying that one changed regex (the test diffs the two bodies and fails if
  anything else differs), then the same one-statement rebuild as 0006. Same
  measured side effects as 0006: `updated_at = now()` on every customer row
  (one pull wave per device), one doorbell per team, nothing else in `data`
  changes. Idempotent; no schema change. `APPLY_v39_1.sql` wraps it in one
  transaction, and `test/last4-strict-test.sh` proves on a real database that
  a broken copy changes nothing and the real one removes the `""` from both a
  v37-era row and a v39-wire row while keeping every other leaf.
- **Pinned by:** `rls-test.sql` §O (82 checks: 17 malformed shapes × the
  INSERT / UPDATE / upsert-on-held / fresh-upsert paths, the valid and held
  cases, the planted production row rebuilt, probes 12 and 13 over the whole
  table and their ability to see planted violations), 40 mirror-fidelity
  payloads, and the 28-check negative-control script (8 negative controls,
  including the apply-window race with and without the lock).
- **The apply-window race, and the lock.** An adversarial round found —
  and I reproduced on real PostgreSQL — that a client write BLOCKED on the
  rebuild's row lock does not re-read the trigger function when the lock
  frees: a backend processes catalog invalidations at statement start and at
  relation_open, not when a row lock is granted. A session that had already
  written to customers under 0004 woke up, ran its UPDATE pass with 0004's
  cached body, and put `""` straight back on a row the rebuild had just
  cleaned; a row inserted mid-apply slipped through with `""` too. So 0007's
  FIRST statement takes `lock table public.customers in exclusive mode`: every
  client write then waits at relation_open and runs under the new body;
  client pulls (SELECT) are not blocked; the lock lasts the transaction —
  milliseconds today. `test/last4-strict-test.sh` runs both interleavings:
  the file minus its lock line shows the defect, the file itself does not.
- **Probe 12 was two instruments short, and is now one.** (i) Its last4
  clause was type-blind: a JSON number `1234` or a JSON `null` under last4
  was invisible (`->>` renders the number as matching text and the null as
  SQL NULL). (ii) A list of named shapes cannot see a routing-shaped zip or a
  card number in a name planted past the trigger. Probe 12 now asserts BOTH
  the stated rule (type-aware) AND that every row is a fixed point of the
  live trigger — rebuilding the table inside the rolled-back probe must
  change nothing. The stated rule is kept on purpose: under 0004, `""` was a
  fixed point of the live trigger, and the fixed point alone would have said
  PASS on the very row that started this. New probe 13 is a canary for a
  credential-shaped KEY anywhere in a customer document (`card.number`,
  `ach.routing`, `cvv`, … at any depth): the trigger guards `data.payment`,
  so such a key outside it could only come from a hostile or broken client —
  not a migration fault, but a STOP. Both forms of the verification (psql,
  editor) show 14 rows now.
- **Boundary, stated plainly:** the trigger rebuilds `data.payment` and
  nothing else in `data`. A credential under any OTHER key is free text to
  the database, exactly as CLAUDE.md §5 says free-text fields are, and probe
  13 is the canary for it. Also: a row whose payment held nothing valid but
  an empty last4 ends up with NO payment key (the standing "nothing valid is
  no payment" rule); every client reads that as "nothing on record".
- **Re-running APPLY_v39_1.sql** changes no row's data, but stamps
  `updated_at` on every row again — one more pull wave per device and one
  doorbell per team. Run it once. A row whose `data` column is not a JSON
  object (only writable past the trigger; none exist) would make the whole
  file fail atomically; the confirmation query would then say NOT APPLIED.
- **Client follow-up (NOT in this release — no client change is being made):**
  `js/customers.js` honestPayment strips non-digits before testing for four
  digits (`"12/26"` → `"1226"`), and `js/sync.js` sends that laundered value,
  which the server rightly accepts as four digits. No v39 flow can put such a
  value into `last4` (there is no input; legacy values were derived from a
  card number), so it is unreachable today, but the client's own rule should
  be the server's exact one. First item for the next client release.
- **Rollback:** 0007 changes one rule and rebuilds data under it. Rolling
  the rule back means re-installing 0004's function body (it is in the repo),
  and the rebuilt rows simply lack a key that meant nothing. There is no
  data loss to reverse. Both transition suites
(`tests/mixed-version-test.js`, `tests/upgrade-transition-test.js`) run
against the exact v37 tree from git with `OLD_REF=c623c6f OLD_BUILD=v37`, and
`tests/run-all.sh` runs that pair alongside the v38 pair.

What the v37 → v39 runs established (all against the real v37 files, a real
service worker, and a mock cloud on its own origin):

- IndexedDB, a marked go-back pin (callback time, note, hood), a customer and
  a hood all survive the in-place upgrade; v39's boot purge strips the raw
  card and bank fields a v37 record carries and keeps the safe metadata.
- v39 boots as a whole release over v37 storage — never a v39 label over v37
  modules, on a fast link or a slow one — and the rep stays signed in.
- A v37 device suspended with UNSENT work (a hood, a knocked door, a customer,
  two deletes) keeps every outbox entry, key for key, under v39, and v39
  drains them to the server once coverage returns. No credential crosses the
  wire.
- **Takeover timing is the browser's, not v39's.** A skip-waiting worker
  activates only once the old worker has no work in flight; Chromium was
  seen taking over during the first open on some runs and on the next open on
  others. Both paths are coherent and both land on v39 after at most one
  open. This is why the iPhone checklist asks for observation in §3 rather
  than promising an in-place reload.
- **One visible, non-lossy quirk:** a door knocked AND deleted while v37 was
  out of coverage (never uploaded) leaves a v37 delete entry with no
  `wasOnServer`. v39 treats "no evidence it was ever on the server" as a
  refusal by design, so the More screen shows one refused row for it. Nothing
  is lost — the door is gone locally and never existed on the server — and
  the row is clearable from More. Not worth a v39 change.

## Deployment order for v39

**Client first. Migrations after the fleet has drained.** This is the reverse
of what an earlier draft of this file said, and the reversal is the whole
point of `rally/tests/mixed-version-test.js`.

1. **Verify 0001 and 0002 are live** with the read-only queries below, and
   fill in the status table. Everything after this depends on `my_role()`,
   `is_active()` and the payment trigger from 0001 already existing.
2. **Publish the v39 static assets.** Apply no migration yet. v39 against a
   pre-0003 database is strictly today's database with fewer controls shown
   to reps, and v39's own contract language is correct without 0004.
3. **Get every device onto v39 and verify each one by eye** (see below).
4. **Gate for 0006 — confirm on EVERY device before the next step:** the More
   screen shows nothing pending (outbox empty), nothing refused, and a sync
   has completed on v39. 0006 does not need this for correctness — a later
   push merges through the trigger and a re-pulled row never overwrites a
   local edit — but it is the only moment at which "every stored row obeys
   the rule" (verify probe 12) is unambiguous, and it keeps the one-time
   pull wave 0006 causes (below) from landing on top of unsynced work.
5. **Apply `APPLY_v39.sql`** — 0004, 0003, 0005 and 0006 in ONE transaction.
6. **Run `test/verify-production.editor.sql`** (the Supabase SQL Editor form of
   `verify-production.sql`, generated from it by `test/build-editor-verify.sh`;
   the psql file's `\set` line and its pre-rollback SELECT do not work in the
   editor). Behavioural, nothing kept. Probe 12 is the proof the rebuild ran:
   no stored row, any team, holds a credential key, a non-four-digit `last4`,
   the legacy `autopay`, or payment on a tombstone.
7. **Apply `APPLY_v39_1.sql`** (0007, one transaction) if step 6 shows probe
   12 failing on an empty `last4` — as it did in production on 2026-09-02 —
   then run step 6 again: 13 PASS.

## Why one transaction

`APPLY_v39.sql` wraps all three migrations in `begin; … commit;`. Everything
in them is DDL and DDL is transactional in PostgreSQL, so if any part raises,
the COMMIT never happens and **none of it becomes live**. There is no
half-migrated production state to reason about or clean up.

Proven, on a real database, by `db/test/apply-atomic-test.sh`: it injects a
syntax error into the LAST section of the real file — so everything before it
has already "succeeded" inside the transaction — applies it to a database
holding only 0001 and 0002, and requires that afterwards none of 0003, 0004
or 0005 exists. Then it applies the real file and requires that all of it
does, twice, to prove the file is idempotent.

Paste the whole file into the Supabase SQL editor. It is self-contained — the
editor does not support `\i` includes, so the three migration bodies are
inlined verbatim. Regenerate it with `db/build-apply.sh` if any of them
changes.

### This is a maintenance window, not a rolling update

**No live sales and no territory administration during steps 2–6.**

Between publishing v39 and applying 0004, a v39 rep's explicit
`autopayRequested` does not survive a sync round trip: the 0001 trigger still
drops the field. That is failure in the safe direction — the record forgets a
request rather than inventing one — but it is still customer-intent data
loss, and it is not acceptable during normal production use.

**Smart Split does not work between publishing v39 and applying 0005.** The
client submits the split as one call to `smart_split_territory()`, and a
database without 0005 has no such function, so PostgREST answers 404. The
client handles that honestly — the hood comes back exactly as it was, nothing
half-commits, and the manager is told Smart Split is not switched on for the
team yet rather than that they were refused — but the feature is unavailable
for the length of the window. That is consistent with the window's own rule
(no territory administration), and it is why the Smart Split part of the
iPhone certification runs AFTER step 4, not before.

So:

- Run it **off-hours or before a shift**, on office WiFi.
- Tell reps explicitly: **do not create or edit sales, and do not touch
  territories, until you are told production has resumed.**
- Production resumes only after 0004 and 0003 are applied, both verification
  queries return their expected values, and the smoke tests pass.

**If ANY production device cannot get onto v39, STOP before applying 0004 and
0003.** Do not knowingly run a mixed v38/v39 fleet after the migrations: the
two failure modes that ordering exists to avoid (invisible territory
refusals, and a v38-printed contract asserting authorization a customer
declined) both need a v38 device to be reachable.

### Why this order

**0003 must not lead.** It is the only migration that creates refusals, and a
v38 client cannot show one. A v38 device believes every user is a manager
(`isManager()` returns true whenever the local role says "manager", and v38
stamps "manager" at account creation), so the rep still sees every territory
tool. Their writes are then refused by the server — correctly — while the
phone keeps the change locally and says nothing. Every hour 0003 is live
against a v38 device is an hour of silent divergence, plus orphaned pins
whenever a refused territory delete detaches its doors (that half is
rep-writable, so it lands).

**0004 must not lead either.** It drops the legacy `autopay` field, and the
still-deployed v38 contract engine decides whether to print the
"only after Customer enrolls in autopay" carve-out with `payment.autopay ===
false`. Once the field is absent, `undefined === false` is false, so a v38
device prints an unqualified recurring-charge authorization for a customer
who explicitly declined autopay. Nothing in the database is corrupted; the
document put in front of the customer is.

**What v39 loses by waiting.** Until 0004 is applied, the 0001 trigger drops
`autopayRequested` and `status`, so a v39 rep's autopay request does not
survive a sync round trip. That failure is in the safe direction — the
record forgets a request rather than inventing one — and v39's contract
language never asserts authorization regardless, because only a
server-authored status can unlock that clause and no client can write one.

## Territory deletion is a single server-visible row

Deleting a territory used to write two things: the territory's tombstone
(leadership-only under 0003) and a detach of every door that pointed at it
(rep-writable). If authorization changed between the tap and the push — a
leader queues a delete, the office demotes them, the device syncs — the door
half committed and the tombstone half was refused, leaving a live territory
whose doors had all been detached.

v39 defers the door release until the tombstone is a **fact**: on push
success for the device that deleted it, and on pull for every other device
(which `applyTerritories` already did). A refused tombstone now also restores
the local territory from the row the refusal probe reads, so a refused delete
leaves the device exactly as it was. A dangling `territoryId` in the interim
is already a tolerated state — `addKnock` re-homes a stale one to whichever
live polygon actually contains the door.

Proven by `rally/tests/mixed-version-test.js` sections 8c and 9: the happy
path still tombstones and releases; and under a mid-flight demotion every
affected door is byte-for-byte what it was before the attempt, with nothing
excluded from the comparison.

## Release coherence — what "Build v39" actually certifies

The app has no build step and no content hashing, and the shell is served
network-first with an INDEPENDENT per-file race against cache. With bare
filenames a single page load could therefore mix modules from two releases —
and it did: a device on a slow link at the moment of publish was measured
serving v39's `index.html` alongside v38's `store.js`, `sync.js`,
`customers.js` and `data.js`. The build label said v39; almost nothing else
was.

Every code asset now carries `?v=<release>` in both `index.html` and the
service worker's precache list. The query string is part of the Cache API key
(nothing sets `ignoreSearch`), so a versioned URL simply MISSES an older
cache; `networkFirstShell` then takes its no-cache branch and *awaits* the
network instead of racing it. Whichever `index.html` a device gets, the
modules match it:

- fast link → new `index.html` → versioned URLs → miss → real v39 modules
- slow link → cached v38 `index.html` → bare URLs → all cached → coherent v38

**"Build v39" now means the whole release is v39.** Regression test:
`tests/upgrade-transition-test.js` sections 4e and 6, with a wire-level delay
(a client-side delay would not work — Playwright's `route()` does not
intercept service-worker fetches, and a test built that way is vacuous).

When cutting the next release, bump `?v=` in `index.html` and `sw.js`
together with the `CACHE` name. They must agree.

## Verifying a device is on v39

`RALLY_BUILD` is never synced, so there is no fleet dashboard. Two signals:

- **Per device, by eye:** More → the footer reads **Build v39**. Do not
  accept "I opened it" — look at the screen.
- **Fleet-wide, from the server:** once 0003 is applied, `403`s on
  `/rest/v1/territories` in the PostgREST/Supabase logs are a v38
  fingerprint. A v39 rep cannot generate one (the controls are gated by the
  server role); a v38 device does, because its UI still offers them. A
  steady zero means the v38 population has drained.

## What one reopen actually does

Measured end to end in `rally/tests/upgrade-transition-test.js`, with a real
service worker and one origin:

- The device boots v38 from the `rally-v38` cache.
- The new worker installs (`addAll` over the whole CORE list, fetched from
  the network), calls `skipWaiting()`, activates, deletes every cache except
  `rally-v39` and the tile cache, and claims the page.
- `controllerchange` fires and the app reloads itself onto v39.
- **One user-initiated open is enough.** Every record saved on v38 survives,
  the device stays unlocked, and v39's boot purge strips the raw credentials
  the old record was holding.

Two cautions the test also establishes:

- **Refresh on good signal, before a shift, never mid-shift.** `addAll` is
  all-or-nothing over the whole asset list; on a weak connection it fails,
  the new worker never activates, and the device stays on v38 and retries on
  the next open. The self-heal is least likely to work exactly where you can
  least reach the phone.
- **The claim-reload discards an open editor.** Committed records are safe in
  IndexedDB; a customer half-typed in the editor, or an unsaved signature, is
  not.

On the single transitional load a slow connection can also serve a mix of
cached v38 markup and fresh v39 code (the shell is network-first with a
3.5-second race, per file, and the app has no build step or content
hashing). Both mixes boot and remain usable rather than dying; the dangerous
one is v38 markup with v39 code, where the removed card and bank inputs are
still on the page and v39's code never reads them. v39 detects exactly that
and disables those inputs with "Reopen RALLY to finish updating" rather than
letting a rep type a card number into a dead field.

## Evidence gap: the service-worker transition is Chromium-only

Every service-worker result in this repo — the one-reopen upgrade, the cache
swap, the release-coherence proof — was produced with **Playwright driving
Chromium**. That is the only browser engine installed here:

    /opt/pw-browsers/  ->  chromium, chromium-1194, chromium_headless_shell, ffmpeg

There is **no WebKit and no iOS device in this environment**, so none of it has
been verified on an installed iPhone PWA. If the fleet is mostly iPhone, treat
these as unverified on the platform that matters:

- whether `skipWaiting()` + `clients.claim()` produce a `controllerchange`
  reload in an installed iOS PWA the same way (WebKit has historically been
  stricter about worker takeover, and a home-screen PWA is a separate
  browsing context from Safari)
- whether the all-or-nothing `addAll()` precache behaves the same under iOS
  storage pressure, which evicts more aggressively than desktop Chromium
- whether one reopen is enough, or whether iOS needs the app fully swiped away
  from the app switcher first

**Recommended before the window:** take ONE spare iPhone with the PWA
installed, run the upgrade on it by hand, and confirm More reads Build v39
after a single close-and-reopen. If it does not, the fleet procedure needs the
swipe-away step, and that is much better learned on one phone than on all of
them. Nothing else in this checklist depends on the answer.

## Suspended old clients

A maintenance window does not destroy a JavaScript heap. An iOS PWA that was
open on v38, backgrounded, and resumed after the migrations is still running
v38 code against a v39 database:

- Its knock and customer work still syncs — neither migration touches those
  policies.
- Its territory writes are refused, and it cannot show that to the rep.
- It is read-only for payment intent (its autopay toggle renders OFF on any
  v39-touched customer and tapping it records nothing).
- If it prints an agreement, the recurring-charge carve-out is wrong.

The window rule already covers this, but only if it is enforced literally:
**every device closed and reopened, verified by eye, before the migrations are
applied.** A phone left in the app switcher is not closed. This is the reason
step 3 requires a visual check rather than "they opened it".

## Do NOT blindly re-run 0002

`0002_realtime_doorbell.sql` is **not idempotent as written**. Its
`create or replace function` is fine, but its seven bare `create trigger`
statements and its `create policy team_doorbell` have no `if exists` guards
and will ERROR on a second run. Verify it with the query below instead of
"just running it again to be sure".

`0003` and `0004` — and every migration after them — are written idempotently
(`drop policy if exists` / `create or replace function`) and may be re-run
safely.

Its effect is also ambiguous from the client alone: with the doorbell missing,
the realtime join is refused and the app quietly falls back to 45-second
polling, which looks exactly like a bad signal. Only the query settles it.

## Verification queries

Each returns one row. Run them as the project owner in the SQL editor.

### 0001 — foundation

```sql
select count(*) = 5 as applied
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('my_team_id','my_role','is_active',
                     'handle_new_user','scrub_customer_payment');
```

Expected: `applied = true`. (`false` means 0001 never ran, or ran partially —
nothing else below will be meaningful.)

### 0002 — the realtime doorbell

```sql
select (select count(*) from pg_trigger
         where tgname like '%\_ping\_%' and not tgisinternal) as ping_triggers,
       (select count(*) from pg_policies
         where schemaname = 'realtime' and tablename = 'messages'
           and policyname = 'team_doorbell') as listen_policy;
```

Expected when applied: `ping_triggers = 7`, `listen_policy = 1`.
Expected when NOT applied: `0` and `0`.
Anything in between means a partial run — read `0002` and apply only the
statements the query shows are missing. Do not re-run the whole file.

### 0003 — territory writes are leadership-only

```sql
select count(*) = 2 as applied
  from pg_policies
 where schemaname = 'public' and tablename = 'territories'
   and policyname in ('territories_insert','territories_update')
   and (coalesce(qual,'') || coalesce(with_check,'')) like '%my_role%';
```

Expected when applied: `true`. When not: `false` (the 0001 policies are still
in place, and any active team member can write a territory).

To see the policy text itself:

```sql
select policyname, qual, with_check
  from pg_policies
 where schemaname = 'public' and tablename = 'territories'
 order by policyname;
```

### 0004 — the honest payment allowlist

```sql
select position('autopayRequested' in prosrc) > 0 as applied
  from pg_proc where proname = 'scrub_customer_payment';
```

Expected when applied: `true`. When not: `false` (the trigger still stores the
legacy `autopay` field and drops `autopayRequested`, so a v39 client's record
of what the customer actually asked for would be lost on every sync).

## Rollback ORDER — the hard rule

**NEVER intentionally run v38 against 0003/0004.** Republishing the old client
while the new migrations are live is the one combination that produces both
failure modes at once: territory refusals a v38 device cannot show anyone, and
a v38-printed agreement asserting recurring-charge authorization for a customer
who declined autopay.

If a rollback is needed AFTER the migrations are live, the order is the exact
reverse of the deployment:

1. **STOP PRODUCTION.** No sales, no territory administration.
2. **Roll back 0003 and 0004** (blocks below).
3. **Verify the old semantics** — the 0001 territory policies are back and the
   payment trigger stores `autopay` again.
4. **Publish the v38 assets.**
5. **Drain every device back to v38** and verify each one by eye
   (More → Build v38).
6. **Smoke test.**
7. **Resume production.**

Rolling back only the client, or only the database, is never correct.

## Rollback blocks

Each migration carries its own rollback in a comment block at the bottom of
its file:

- `0003` — restores the 0001 territory policies (writes open to any active
  team member). Copy the block from `0003_territory_authorization.sql`.
- `0004` — restore the `scrub_customer_payment` function body from
  `0001_phase1_foundation.sql`.

Rolling back `0003` re-opens territory writes to every rep — which is exactly
the state the database has been in since 0001, so it is a safe place to stand
while you investigate.

Rolling back `0004` restores the legacy `autopay` field and starts dropping
`autopayRequested` from stored records. Already-stored values are not
recoverable afterwards, so treat that one as a decision, not a retry. If a v38
device turns out to still be in the field after 0004 is applied, rolling 0004
back is the correct move — it is what the deployed v38 contract engine needs
to print the right document.

## Proving the migrations locally before touching production

    PGHOST=<host> PGPORT=<port> sh rally/db/test/run-rls-tests.sh

applies every migration in order to a throwaway database, runs the full
security matrix, and then runs `test/race-test.sh` against the same database.

Two things about the payment trigger are easy to get wrong and impossible to
see from a naive test:

1. **It fires TWICE per upsert.** Every sync push is
   `INSERT .. ON CONFLICT DO UPDATE`, and the BEFORE INSERT pass's output
   becomes `EXCLUDED`. A rule that reads only `OLD` passes a plain-UPDATE
   test and still loses the field on the real path.
2. **The INSERT pass must not write a value it did not receive.** If it does,
   the UPDATE pass cannot tell its own injection from client intent — and a
   transaction committing in between turns that into a LOST UPDATE. Looking
   the row up inside the INSERT pass does NOT fix this: that read happens
   before the row lock is taken. Only `OLD`, which Postgres re-reads under the
   lock, is trustworthy.

`race-test.sh` reproduces exactly that interleaving with two real sessions.
Reverting the trigger to the look-it-up version makes it fail; that negative
control was run.

## Proving the whole thing locally

The RLS suite applies every migration in order to a throwaway database and
runs the full security matrix — including the adversarial territory checks
that `0003` exists for:

    PGHOST=<host> PGPORT=<port> sh rally/db/test/run-rls-tests.sh

## A payment-less write keeps the stored payment (0004, whole-object rule)

The client upsert is `INSERT .. ON CONFLICT DO UPDATE SET data = EXCLUDED.data`
(and every other payload column), so the **entire** `data` column is replaced
by what the client sent. The field-level three-way rule only ever ran *inside*
an incoming payment object. A payload with no `payment` key at all — which is
exactly what a v39 client sends when it cannot vouch for the shape and fails
closed — used to land as-is and **erase** the safe payment the row already
held. Reproduced against real PostgreSQL with the production statement shape.

Now "no payment object sent" (absent, `null`, a string, a number, an array)
means "keep the stored payment", rebuilt through the same allowlist pickers,
taken from `OLD` on the UPDATE pass — so the INSERT pass still injects nothing
and the EXCLUDED race stays closed. A tombstone is the one exception: a deleted
customer keeps the id and loses the person, payment metadata included.

`db/test/payment-absent-test.sh` is the **negative control**: it installs the
pre-fix trigger body (kept verbatim under `db/test/fixtures/`) over a fresh
database and requires the identical probe to see the erasure. A regression
test that cannot see the bug it guards against is a green tick with nothing
behind it.

An adversarial pass (four independent attackers, 202 attacks, ten claims
verified against real PostgreSQL) then found that the first whole-object
revision had **introduced** a worse hole — a payment key holding a bare string
or an array of credential objects was stored verbatim on a row with no held
payment — plus a `data: null` erasure, tombstones that carried payment forward,
and a digit cut that only counted ASCII digits. All are closed and pinned in
`rls-test.sql` §19; the 0a185f8 body is a second negative-control fixture.
A second round against that body found three more leaf-level gaps — a
hand-typed digit class missing 54 of 66 Unicode digit blocks, a credential
split across address leaves passing each leaf's cut, and ZIP+4 accepting nine
bare digits — closed and pinned in §20, along with the two-write assembly of a
split credential the first budget could not see. The client's
`honestPayment()` carries the identical rules and the identical generated
digit table. **Residual, by design:** a twelve-digit "street" plus a real-shaped
`last4` in one write is a card number and also the exact shape of a legitimate
record; no digit count separates them without refusing real addresses, so that
case is the rep operating rule's to cover, not the trigger's.

A third round (four of five attackers finished before a usage limit; every
claim verified by hand against the final body) closed three more: a name may
carry no digits at all (a CVV fits in four), the digit class now includes
Unicode 16's blocks and the digit-like superscript/circled/Roman forms (it is
pinned to a Unicode version and must be revisited at each release), and
`0006_payment_rebuild.sql` passes every already-stored row through the trigger
once, because 0001 stored `last4` and `billingAddress` verbatim. Pinned in §21.

### What 0006 actually does to the table (measured, not assumed)

`update public.customers set data = data;` fires two things per row and one
per statement, and nothing else — checked against the real triggers in
0001/0002 on a migrated database, every column diffed:

- `customers_scrub_payment` (BEFORE UPDATE): rebuilds `data.payment` under the
  final rule; strips it from tombstones. **Nothing else inside `data` changes** —
  in particular `data.updatedAt`, the client-stamped LWW clock, is untouched.
- `customers_touch` (BEFORE UPDATE): sets the server column `updated_at = now()`
  on **every** row. That column is the PULL CURSOR, so every device's next
  cycle re-pulls the whole customers table once.
- `customers_ping_upd` (AFTER UPDATE, per statement): **one** doorbell per team
  present, empty payload. Every online device wakes once and runs that pull.
- No other column changes: `created_at`, `deleted_at`, `first/last/email/
  phones/created_by/team_id` are byte-identical before and after.

**A re-pulled row never overwrites local work.** `applyCustomers` compares the
client LWW clock (`data.updatedAt`), which 0006 leaves alone: an unchanged
clock is `"same"` and the row is skipped; a device holding a newer unsynced
edit sees `"older"` and re-pushes, at which point the trigger merges its
payload with the rebuilt stored object. Proved in `tests/sync-test.js` (W1–W3)
by bumping every server row's `updated_at` under a device with a dirty edit.

**The wave is bounded and one-time:** one doorbell per team, then one full
customers pull per device. With today's row counts it is invisible; at scale
it is one table read per device, once.

## Smart Split is one server fact (0005)

Smart Split replaces one territory with N children: N+1 rows. The client used
to write them as N+1 independent upserts plus a tombstone, so the reachable
states included **children beside a live parent** (the hood covered twice, by
two sets of reps) and **parent gone, only some children created** (a hole in
the coverage map with no record of what was meant to be there). Neither state
announces itself, and no code path intended either.

0005 adds one narrow SECURITY DEFINER function, `smart_split_territory(parent,
operation_id, children)`. It derives `auth.uid()` itself, resolves team and
role from the server's own profile row, refuses a rep / a disabled user / a
user with no team / a parent belonging to another team, takes the parent's row
lock, validates every child polygon, then inserts all the children and retires
the parent — or does none of it.

**Idempotent by operation id.** A device whose response was lost retries the
same operation, and the function recognises it and returns the committed
result instead of splitting again. The check runs twice: once before the lock
(so a retry by a since-demoted manager still gets its answer, rather than
being told a committed split failed) and once under it (so a duplicate sent
while the first is still in flight is told `already_committed`, not that the
parent is already gone).

**A parent can be split once.** Two managers racing the same hood serialise on
the row lock, and the loser sees the tombstone and refuses. A unique index on
`(team_id, parent_id)` holds even if the lock is bypassed. Both are proved
with two concurrent PostgreSQL sessions in `db/test/split-race-test.sh`.

**The one writable SECURITY DEFINER function in `public`.** That is asserted
by name in `db/test/rls-test.sql`, so adding another fails the suite until
somebody decides it belongs.

### Doors are a consequence, never a step

No rep-writable row is touched to make a split happen. The parent's doors are
re-homed into whichever child contains them only **after** the split is a
server fact, and every other device does the same when it pulls the children
and the parent's tombstone. A refused split leaves every door byte-for-byte
as it was.

### The client holds a proposal, not a fact

Until the server answers, the children are on the map marked *waiting on the
team — not confirmed yet*, and the parent is hidden from every screen that
hands out work but **kept**, because a hood cut offline may itself never have
reached the server and the split cannot retire a parent that is not there.
The proposal is written to disk before the command is queued, so a device
killed between send and response recovers it on boot and retries the same
operation id. A refusal erases the proposal and restores the hood.
