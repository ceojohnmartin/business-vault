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
| `0001_phase1_foundation.sql` | Schema, RLS, the payment scrub trigger |  |  |
| `0002_realtime_doorbell.sql` | Realtime wake-up triggers + listen policy |  |  |
| `0003_territory_authorization.sql` | Territory writes are leadership-only |  |  |
| `0004_payment_allowlist.sql` | Honest payment allowlist (`autopayRequested`, `status`, `card.name`, `ach.name`, `ach.type`) |  |  |
| `0005_smart_split.sql` | Atomic Smart Split: `territory_splits` + `smart_split_territory()` |  |  |
| `0006_payment_rebuild.sql` | Passes every stored customer row through 0004's trigger once |  |  |

## What production actually runs

GitHub Pages serves `origin/main` byte-for-byte, and `main` is **`c623c6f` —
Build v37**. v38 (`813a056`) was a branch build that was never merged or
published, so the real upgrade is **v37 → v39**. Both transition suites
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
6. **Run `test/verify-production.sql`** — behavioural, rollback-safe. Probe 12
   is the proof 0006 ran: no stored row, any team, holds a credential key, a
   non-four-digit `last4`, the legacy `autopay`, or payment on a tombstone.

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
