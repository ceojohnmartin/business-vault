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
| `0004_payment_allowlist.sql` | Honest payment allowlist (`autopayRequested`, `status`) |  |  |

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
4. **Apply 0004.**
5. **Apply 0003.**

### This is a maintenance window, not a rolling update

**No live sales and no territory administration during steps 2–6.**

Between publishing v39 and applying 0004, a v39 rep's explicit
`autopayRequested` does not survive a sync round trip: the 0001 trigger still
drops the field. That is failure in the safe direction — the record forgets a
request rather than inventing one — but it is still customer-intent data
loss, and it is not acceptable during normal production use.

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

## Rollback

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

applies every migration in order to a throwaway database and runs the full
security matrix, including the payment trigger under BOTH statement shapes a
client can produce. The upsert shape is the one that matters: every ordinary
sync push is `INSERT .. ON CONFLICT DO UPDATE`, for which Postgres fires a
`BEFORE INSERT OR UPDATE` trigger TWICE. A preservation rule that reads only
`OLD` passes a plain-UPDATE test and still loses the field on the real path.

## Proving the whole thing locally

The RLS suite applies every migration in order to a throwaway database and
runs the full security matrix — including the adversarial territory checks
that `0003` exists for:

    PGHOST=<host> PGPORT=<port> sh rally/db/test/run-rls-tests.sh
