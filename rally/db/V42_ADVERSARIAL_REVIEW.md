# RALLY v42 — ADVERSARIAL REVIEW OF 0018, BEFORE ANY PRODUCTION CHANGE

**Nothing in this review has been applied to production.** No Supabase change, no
`rally_config` change, no production data touched, no merge to `main`, no publish, no
cache or device reset. `0018_territory_properties.sql` / `APPLY_v42.sql` are authored and
tested only.

Recommendation: **NO-GO** — see §I. The migration itself is in good shape; the reason to
hold is that two of the three things it exists for have no screen that calls them.

---

## A. WHAT WAS INSPECTED

Read in full, from the committed files rather than from any earlier summary:

**Production state of record**
- `rally/db/APPLIED.md` — note the status table at the top is STALE; the dated records
  below it are authoritative. Production is 0001–0017 applied,
  `assignment_server_authoritative = true` (flipped 2026-09-08).
- `rally/db/APPLY_v41_A/_B1/_B2/_C/_FLIP.sql` — the 43 named Stage A/B/C functions, listed
  canonically in `APPLY_v41_FLIP.sql:25-38`.

**Schema and authority**
- `migrations/0001_phase1_foundation.sql` (tables, RLS, the table-level `events` INSERT
  grant), `0002` (realtime doorbell triggers), `0005_smart_split.sql`,
  `0009_territory_geometry.sql`, `0010_territory_assignment.sql` (`territories_assignment`,
  `rally_config_guard`), `0012` (column-scoped grants), `0013_dnk_authority.sql`
  (`pins_protect_dnk`, `events_guard_dnk_clear`, the neutralise-don't-refuse rule),
  `0014`, `0015_smart_split_v41.sql`, `0016` (the deferred `territories_no_overlap`
  constraint trigger), `0017`.

**The v42 work under review**
- `migrations/0018_territory_properties.sql`, `APPLY_v42.sql`, `ROLLBACK_v42.sql`,
  `preflight/v42-import-preflight.editor.sql`, `build-apply.sh`.
- `js/store.js`, `js/sync.js`, `js/hoods.js`, `js/assign.js`, `js/property.js`,
  `index.html`, `css/app.css`, `sw.js`.
- `tests/` — `v40-test.js`, `v41-logic-test.js`, `assign-ui-test.js`,
  `pin-placement-test.js`, `refusals-test.js`, `smoke.js`, `release-assets-test.js`,
  `run-all.sh`; `db/test/v42-*.sh`.

**Executed, not just read**
- A disposable local replica built to production's exact state
  (`supabase-shim` → 0001–0008 → `revoke usage on schema gis from authenticated` →
  `v41-backfill-seed` → `APPLY_v41_A/_B1/_B2/_C/_FLIP`), then `APPLY_v42.sql`.
- A 60,159-pin replica for the import timing.
- Live Overpass measurement was attempted and FAILED this session (504 from
  `overpass.kumi.systems`, tunnel closed on `overpass-api.de`). See §F.

---

## B. WHAT IS CHANGED, AND ONLY WHAT IS CHANGED

Branch `claude/pest-sales-app-research-ba7u4n`. Nothing outside this list is touched.

**Server (authored, NOT applied)**
- `db/migrations/0018_territory_properties.sql`
- `db/APPLY_v42.sql` (generated from 0018 by `build-apply.sh`; regenerating every other
  APPLY file produces a zero-byte diff, so there is no drift)
- `db/ROLLBACK_v42.sql`
- `db/preflight/v42-import-preflight.editor.sql`
- `db/build-apply.sh` (one line: the v42 target)

**Client**
- `js/store.js`, `js/sync.js`, `js/hoods.js`, `js/property.js`, `js/assign.js` (new),
  `index.html`, `css/app.css`, `sw.js`

**Tests**
- `db/test/v42-territory-test.sh`, `v42-security-test.sh`, `v42-race-test.sh`,
  `v42-preflight-bite.sh`
- `tests/pin-placement-test.js`, `tests/assign-ui-test.js`, `tests/v40-test.js`,
  `tests/v41-logic-test.js`, `tests/refusals-test.js`

---

## C. REQUIREMENT RECONCILIATION

| # | What was asked for | What exists now | Verdict |
|---|---|---|---|
| 1 | Draw polygon → identify residential houses → create/match PERMANENT property records | `import_territory_doors` (§F) matches on four tiers and inserts only genuinely new doors; a matched door keeps its outcome, history, notes and customer | **MET, server-side. NOT REACHABLE — no screen calls it** |
| 2 | Pick rep → save → the polygon reaches that rep immediately | v41 `set_territory_assignments` + the assign panel; the panel chooses and the hood sheet commits | **MET** |
| 3 | No hood names; automatic sequential identifier "Polygon N of M" | `territories.seq`, server-assigned, monotone per team, fixed for life; `of` = highest number ever issued | **MET on the card. GAP: every other screen still shows the device-local auto-name** |
| 4 | A permanent UUID internally | `territories.uuid`, server-assigned, never client-writable | **MET** |
| 5 | The card shows ONLY Polygon N of M, N Houses, N Sales | `#polycard`; asserted by test to read exactly that and to contain no drive time, acreage or percentages | **MET** |
| 6 | Exactly ONE pin per eligible house, on the building; footprint/point-on-surface first, verified address second, parcel centroid LAST; never random, never a grid | `placeAt` (centroid-if-inside → point-on-surface → labelled bbox fallback); `snapToBuildings` moves a parcel door onto the largest outline inside its own lot; the demo grid is refused on a team, client and server | **MET** (one residual: a relation with no outline still yields an unverified bbox centre, labelled as such — §F) |
| 7 | The six pin colours | Unchanged from v41; `effectiveDisposition` | **MET, untouched** |
| 8 | Properties permanent, territory assignment temporary; removing a rep deletes NOTHING | Proven end to end in the battery (§10 of the server suite) | **MET** |
| 9 | Every knock creates a historical activity row carrying door, rep, territory, timestamp, previous status, new status, outcome, notes | `events.territory_id` + `events.prev_disposition`, filled server-side by `events_derive_context` for every client version | **MET** |
| 10 | `current_status` only for the pin colour | `pins.disposition` unchanged; colour derived at paint time | **MET** |
| 11 | Reset-for-re-knock where the MANAGER CHOOSES which outcomes go Blue (e.g. Not Home, Not Interested, Go Back), Sold and Do Not Knock preserved and needing an explicit override, and resetting deletes NO history | `reset_territory_outcomes(p_reset, p_include_dnk, …)`; the manager's ticks are the argument; the server stores the complement over the four knock outcomes only; `p_include_dnk` returns the black doors for one-at-a-time `clear_pin_dnk`, it never clears them; no door is written | **MET, server-side. NOT REACHABLE — no screen calls it** |
| 12 | Scale to millions of properties, many markets | Matcher tiers 3 and 4 now indexable; 500 doors against 60,159 pins: **73,031 ms → 221 ms** | **MET at 60k, measured. Not measured at millions** |
| 13 | Don't re-call the vendor API on every pan | Scan is per-draw, never per-pan; unchanged | **MET** |
| 14 | Do not fake nationwide house locations | Demo grid refused on any team device and by the RPC | **MET** |
| 15 | Separate concepts: PROPERTIES/DOORS, TERRITORIES, TERRITORY ASSIGNMENTS, TERRITORY PROPERTIES, DOOR ACTIVITIES, SALES/CUSTOMERS | `pins`, `territories`, `territories.assignees` (+ the v41 ledger), `pins.territory_id` + containment, `events`, `customers` | **MET as concepts. No `territory_properties` join table: containment plus the stamp already expresses it, and a second table would be a second source of truth** |

### Clear Outcomes / reset semantics — recovered, not assumed

The original RALLY behaviour (0014 `start_territory_cycle`, live in production and NOT
modified by v42) is: one monotone `cycle_started_at`; every door's colour is derived at
paint time from knocks after that boundary. Nothing is rewritten, so nothing is lost.

What v42 adds is CHOICE, and here is what each colour does under it, enumerated:

| Colour | Meaning | Plain Clear Outcomes (0014, unchanged) | v42 selective reset |
|---|---|---|---|
| Blue `unworked` | never knocked this cycle | stays blue | keepable; ticking it is a no-op in practice |
| Yellow `nothome` | not home | → blue | → blue **only if the manager ticks it** |
| Purple `goback` | go back / callback | → blue | → blue **only if ticked**; otherwise stays purple |
| Red `notint` | not interested | → blue | → blue **only if ticked** |
| Green `sold` | live agreement | stays green | stays green — answered from the CUSTOMER record, above the cycle. The server refuses to put `sold` in a keep-list at all |
| Black `dnk` | do-not-knock | stays black | stays black — answered from the LEDGER, above the cycle. Refused as a keep-list entry. `p_include_dnk` only *reports* the black doors; clearing one is a separate audited `clear_pin_dnk` with a reason |

`p_reset = []` therefore means **reset nothing**, not "reset everything". The first draft
had this inverted (`p_keep`), which would have blanked a worked hood; the client docblock
still described the inverse until this round and now does not.

`cycle_keep_at` is what stops a keep-list going stale: a list counts only while
`cycle_keep_at >= cycle_started_at`, so a later plain Clear Outcomes silently retires it.

### Offline / sync, security, concurrency, migration safety

- **Offline** — the import and the reset are server-confirmed operations and refuse
  offline through `turfGate({needsServer:true})`, exactly as the v41 turf operations do.
  The summary card falls back to this device's own count and now says so on screen.
- **Security** — no client may write `seq`, `uuid`, `cycle_keep`, `cycle_keep_at`,
  `events.territory_id` or `events.prev_disposition`; `public.events`' table-level INSERT
  grant is replaced by a column list so a column added later is not writable by default;
  the idempotency ledger is a table with RLS on and no grants; a disabled account cannot
  read a summary.
- **Concurrency** — one lock order everywhere (`rally_turf_seq` before any territories row
  lock), proven by running the deadlock pairing both ways; both RPCs set a 15 s
  `lock_timeout`.
- **Migration safety** — all DDL precedes any DML (the deferred-trigger trap); the apply is
  one transaction and idempotent; a second apply changes no row; row fingerprints before
  and after are identical.

---

## D. CONFIRMED DEFECTS AND WHAT WAS DONE

Fifteen dimensions, 253 review agents. 36 findings survived verification; after
de-duplication they are the 22 below, plus one (23) that the review itself introduced and
then caught. Everything marked FIXED was reproduced on a replica
first, fixed, given a regression, and the affected suites rerun.

### Blockers

1. **Membership was two facts that never met.** The import wrote `pins.territory_id` and
   nothing else; every client builds its record from `data` and pushes the column back out
   of it. Reproduced: after one ordinary rep knock the column read NULL and the hood
   reported 0 houses. **FIXED** — §F writes both halves in one statement; §D2 stops a
   phone that pulled too early from clearing a door out of the hood it stands in;
   `latchMembership` in `sync.js` adopts the server's column the way v41 adopts assignees.
   (Bumping the record clock instead was rejected: a newer server copy RETIRES a dirty
   local record, so an import would have discarded every unpushed knock on a matched door.)
2. **A rep could veto a leader's import or reset.** Both RPCs kept their idempotency record
   in `public.events`, which every team member may INSERT with any id, type and blob.
   **FIXED** — `public.rally_operations`: RLS on, no policies, no grants. The audit event's
   id is now server-minted, so a planted row cannot even collide with it.
3. **A real lock-order deadlock with Smart Split.** A `BEFORE INSERT` trigger fires on the
   proposed tuple of `ON CONFLICT DO UPDATE`, so a phone's territories upsert took
   `rally_turf_seq` and then queued for the row lock; `smart_split` row-locks the parent
   and then inserts children. **6 deadlocks in 6 runs. FIXED** — §K takes the lock at the
   top of the split wrapper: **0 in 6**, 8/8 splits commit.
4. **83.7 s for 500 doors.** Tiers 3 and 4 compare `::geography` and the shipped index was
   on the geometry, so both were sequential scans. Measured: **73,031 ms** against 60,159
   pins, against a 6 s client transport deadline. **FIXED** — a geography GiST index and an
   index on `lower(btrim(address))`: **221 ms**, identical counts.
5. **The tier-1 test was a byte-identical re-import** (tiers 3 and 4 both matched at 0 m),
   so deleting tier 1 left the battery green. **FIXED** — 40 m away, different address.
6. **The summary section compared no number to anything** — only key names. **FIXED** —
   real counts, a sale, a deletion, and the reshape case.
7. **The polygon-card test typed the card's own text into the DOM and asserted it back.**
   **FIXED** — it now drives `hoods.js`'s own `showCard`; gutting the renderer fails 4
   checks.

### High

8. **"N Houses" had three definitions** — stamp, containment, and the raw vendor scan
   count. **FIXED** — containment everywhere, and the scan's number stays in the status line.
9. **Tier 4 swallowed identified doors** — distance alone collapses a duplex. **FIXED** —
   tier 4 stands aside only when both sides carry an identity and they disagree, so the
   door a rep placed by hand still de-dupes.
10. **The vendor allowlist named keys, not values** — `->>` on an object returns the whole
    object serialised, so `owner: {name, …, ethnicity}` was stored whole. Directly against
    CLAUDE.md §7. **FIXED** — `rally_txt()` reads scalars only; `owner` is built from named
    subkeys.
11. **The parcel provider beat the footprint.** With a Regrid token every pin sat at parcel
    level while the file claimed the outline was "preferred when one exists". **FIXED** —
    `snapToBuildings`.
12. **`placement` was computed for every door and then dropped.** **FIXED** — stored.
13. **The demo grid could become permanent, syncing property records** — and then block the
    real houses it stood in for. **FIXED** — refused on a team, client and server; still
    available as a preview on a solo device.
14. **The assign panel's "Save assignment" saved nothing.** **FIXED** — it says what it does.
15. **`resetForReknock`'s docblock described the inverse of its own parameter** and claimed
    a protection that lives elsewhere. **FIXED.**
16. **`ROLLBACK_v42`'s `cycle_keep` paragraph was wrong in both directions** — no phone
    repaints (nothing bumps `updated_at`, so no device re-pulls), and re-running the reset
    cannot restore the exemption. **FIXED — rewritten to say what is true.**
17. **The race suite asserted the cycle away** — its header claimed no cycle existed "by
    construction", and it tested the one split pairing that provably cannot deadlock.
    **FIXED** — header corrected; case 6 runs the real pairing both ways and reports a
    harness that cannot fail as a failure of the test.
18. **Nothing anywhere set `cycleKeep`**, so deleting the one line that implements selective
    reset left every suite green. **FIXED** — ten cases, mutation-tested (2 fail when the
    line is removed).
19. **A team-wide lock convoy.** One slow hood write froze every territory write in the
    team. **MITIGATED** — its driver (the 73 s import) is gone, and both RPCs now set a
    15 s `lock_timeout` so a stall is an error rather than an unbounded freeze.

### Medium

20. **The offline summary was rendered as if it were the team's answer.** **FIXED** —
    labelled, and it no longer invents an "of M".
21. **A relation's bounding-box centre was emitted with no containment check**, and the
    file's stated placement priority was the reverse of the code. **PARTIALLY FIXED** —
    the priority list now matches the code and `placement` records the fallback, so such a
    door is auditable. See §F for what could not be settled this session.
22. **`seq`/`uuid` exist but every screen except the card still identifies a hood by its
    device-local auto-name.** **NOT FIXED — reported.** `seq` does not exist in production
    until 0018 is applied, so changing the identity every screen shows is release work that
    belongs after the apply, not before it.

### Found while fixing the above — the worst one in the whole review

**23. `pins_territory_guard` would have refused every rep write on production.**
The membership guard I added in this review was SECURITY INVOKER (correctly — that is what
makes `current_user` an unspoofable test of who is writing) and it named `gis.geometry` in
its DECLARE block and called `gis.st_covers` in its body. **RALLY revokes USAGE on schema
`gis` from clients.** With that revoke genuinely in place, the function does not merely
misbehave — it fails to COMPILE, and because it is a BEFORE trigger on `public.pins` that
is every knock, every note and every disposition a rep writes. Sync would have stopped
company-wide on the first write after the apply.

It was missed at first because the replica build does
`revoke usage on schema gis from authenticated`, and PUBLIC's own grant survives that — so
`has_schema_privilege('authenticated','gis','usage')` still read `true` and the whole
battery passed. Reproduced by revoking from `public` as well:
`compilation of PL/pgSQL function "pins_territory_guard"`.

**FIXED** — the geometry read moved into `rally_hood_covers()`, a SECURITY DEFINER
function; the trigger names no gis type and calls no gis function. Section 10 of the
security suite now revokes USAGE from `public` AND `authenticated` and then drives the
write paths a rep actually uses: create a door, knock it, write an activity row, and try
to drop a door out of the hood it stands in. That section also settles the other gis
question v42 raises — five of its new indexes are gis expressions, and maintaining them on
an ordinary client INSERT does not require the writer to hold USAGE on the schema.

### Found in my own tests rather than in the code

Six of the fixes above (5, 6, 7, 17, 18, and the two vacuous tier fixtures) were defects in
the test suites, not the product. A suite that only ever passes is not evidence.

---

## E. TEST TALLY

Every number below is from a run on the current tree.

| Suite | Checks | Result |
|---|---|---|
| `db/test/v42-territory-test.sh` | 162 | PASS |
| `db/test/v42-security-test.sh` | 46 | PASS |
| `db/test/v42-race-test.sh` | 26 | PASS |
| `db/test/v42-preflight-bite.sh` | 16 | PASS |
| `tests/pin-placement-test.js` | 27 | PASS |
| `tests/v41-logic-test.js` | 206 | PASS |
| `tests/refusals-test.js` | 97 | PASS |
| `tests/assign-ui-test.js` | 36 | PASS |
| `tests/smoke.js` | full run | PASS, `ERRORS: none` |
| `tests/release-assets-test.js` | 9 | PASS |

**Mutation tests — the tests were tested.**
- Every one of the 16 preflight probes has the broken condition deliberately created on a
  fresh copy of production's state and must move; a probe that cannot be made to fail is
  reported as a failure of the TEST.
- The selective-reset line deleted from `store.js` → CK1 and CK6 fail.
- `showCard` gutted → 4 card checks fail.
- The geography index dropped → the plan probe stops naming it.
- The deadlock harness runs 0015's wrapper first and REQUIRES it to deadlock.

### The three failures that were called "pre-existing" — proved, not labelled

They are no longer failing, and the classification was established before that rather than
asserted:

- **`auth-test.js` and `v40-test.js`** — run on a clean checkout of the pre-v42 commit,
  both produced the identical signature, so nothing in v42 caused them. Both pass on the
  current tree (`auth` 54 checks, `v40` full run green).
- **The v37 upgrade-transition hang** — located precisely with `DEBUG=pw:api`, and then
  isolated with a controlled probe rather than a guess: with the service worker enabled the
  run dies at reload 6; with it disabled, 14 reloads pass. That is an environment/timing
  property of the harness, not a code path v42 touches, and the same code path is exercised
  by `mixed-version` which passes. It also passes on the current tree.

No historical behaviour was modified to make any of these green.

---

## F. UNRESOLVED RISKS

1. **The relation-geometry question could not be re-measured.** Overpass was unreachable
   for the whole of this session (504 from `overpass.kumi.systems`; the tunnel to
   `overpass-api.de` closed mid-exchange; one response that did come back was a cached body
   for a different query, which is how I know not to trust it). The code handles both
   shapes — it reads relation members when they are present and falls back to a LABELLED
   bounding-box centre when they are not — but the claim "a relation under `out tags geom`
   returns its members" is **unverified as of this session**. A door placed at a bbox centre
   can sit in a courtyard or a driveway. It is now identifiable in the data
   (`prop.placement = 'building_bbox'`), which it was not before.
2. **Scale is measured at 60k pins, not at millions.** 500 doors in 221 ms against 60,159
   live pins. The tiers are index-backed, so the expected growth is logarithmic, but that is
   an inference and not a measurement.
3. **`snapToBuildings` costs one extra Overpass request per Regrid import.** A failure
   degrades to parcel-level placement rather than to no doors, and that path is tested —
   but the network half itself has not run against the live API this session, for the
   reason in (1).
4. **The convoy is mitigated, not eliminated.** `rally_turf_seq` is still team-wide and
   still held to commit. With the import fast and a 15 s `lock_timeout` the exposure is
   bounded, but a future long-running territories transaction would reintroduce it.
5. **Tier 4 remains a 12 m proximity rule** for doors with no identity on either side. It
   can still merge two identity-less doors at a duplex. That is the deliberate trade the
   file documents, and it is now the ONLY case where it can happen.
6. **The build version must be bumped past `v46` before publishing.** Republishing at the
   same `?v=` can mix old and new modules in one page load. This is a publish-time step and
   nothing here has been published.

---

## G. EXACT PRODUCTION EFFECTS OF APPLYING 0018

One transaction. On success:

**Columns added** (all nullable, no rewrite of existing rows beyond the backfill in §J)
- `territories.seq bigint`, `territories.uuid uuid` (default `gen_random_uuid()`),
  `territories.cycle_keep text[]`, `territories.cycle_keep_at timestamptz`
- `events.territory_id text`, `events.prev_disposition text`

**Constraints** — `territories_seq_uniq (team_id, seq)`, `territories_uuid_uniq (uuid)`

**Table added** — `public.rally_operations`, RLS enabled, no policies, all privileges
revoked from `public`, `anon` and `authenticated`

**Indexes added** — `pins_point_live_gist`, `pins_provenance_live_idx`,
`pins_parcel_live_idx`, `pins_point_live_geog_gist`, `pins_address_live_idx`
(all partial on `deleted_at is null`; none unique)

**Functions created or replaced** — `territories_number`, `events_derive_context`,
`pins_territory_guard`, `rally_hood_covers`, `rally_num`, `rally_txt`,
`import_territory_doors`, `reset_territory_outcomes`, `rally_territory_summary`, and
**`smart_split_territory_v41`** (0015's body plus one lock line — §K)

**Triggers created** — `territories_number` on `territories`, `events_derive_context` on
`events`, `pins_territory_guard` on `pins`

**Grants changed**
- `select (seq, uuid, cycle_keep, cycle_keep_at)` on `territories` → `authenticated`
- `select (territory_id, prev_disposition)` on `events` → `authenticated`
- **`revoke insert on public.events from authenticated`**, replaced by an explicit column
  list. This is the one grant CHANGE rather than addition; it exists because a table-level
  grant automatically covers columns added later, and the two new event columns are
  server-authored.
- execute on the three new RPCs and the two helpers, `authenticated` only

**Data written** (§J, after every DDL statement)
- every existing `territories` row gets a `seq` (creation order, per team) and a `uuid`
- no `pins` row, no `events` row, no `customers` row is written

**Behaviour that changes the moment it is applied, before any UI exists**
- Every new hood gets a server-assigned number and uuid.
- Every knock event gains `territory_id` and `prev_disposition`, filled server-side —
  including from clients that know nothing about v42.
- A client write can no longer clear a door out of a live hood the door is standing in
  (neutralised, never refused).
- `pins.data->>'territoryId'` is kept in step with `pins.territory_id` on every write that
  sets a hood.
- Smart Split takes one additional advisory lock.
- Clients cannot INSERT columns of `public.events` outside the granted list.

---

## H. WHAT THE ROLLBACK CANNOT PUT BACK

`ROLLBACK_v42.sql` removes every object v42 adds and touches no territory, pin, event or
customer row. It CANNOT restore:

1. **Hood numbers and uuids.** Dropping the columns drops them; a re-apply issues fresh
   numbers in creation order. Fine on the same day; not fine once a manager has said "go
   work Polygon 14" out loud.
2. **Doors the import created.** They are ordinary pins with ordinary history and they stay.
   If an import was a mistake, tombstone the doors — do not roll back the schema to hide
   them.
3. **Activity rows.** The columns go; the rows are append-only and remain.
4. **The paint effect of a selective reset — and NOT in the way the file used to claim.**
   Dropping `cycle_keep` does not repaint a single phone: the map is painted from the
   device's own record, `DROP COLUMN` does not move `territories.updated_at`, and the
   territories pull is on an `updated_at` cursor — so no device re-pulls those hoods and
   every phone keeps painting the exemption indefinitely. Nor can the exemption be restored
   by re-running the original reset: the operation ledger is dropped with the rest, so a
   replay is a NEW boundary that blues every door worked since. **There is no way back to
   the exact prior paint.** If that matters, do not roll back — change the keep-list
   forward.
5. **The idempotency record of every import and reset that ran under v42.** After a rollback
   and a re-apply, a retry of one of those operation ids runs the operation again.

---

## I. GO / NO-GO

**NO-GO — hold the apply.**

Not because of the migration. After this review the SQL is in the best state it has been:
the membership defect is closed on both sides, the idempotency ledger is unforgeable, the
lock order is consistent and proven by a harness that fails when the fix is removed, the
allowlist reaches values as well as keys, the matcher is 330× faster and stays inside the
client's own timeout, and every probe in the preflight has been shown to bite.

The reason to hold is §C rows 1 and 11: **`import_territory_doors` and
`reset_territory_outcomes` have no caller.** `store.js` exposes `importDoorsServer` and
`resetForReknock`; nothing in `index.html`, `hoods.js`, `turf.js`, `assign.js` or
`property.js` calls either. Applying 0018 today would put three RPCs, a table, three
triggers, five indexes and a grant change into production to serve screens that do not
exist, and would change `smart_split_territory_v41` for a feature nobody can reach.

Two coherent ways forward, and this is the owner's call:

- **Wait.** Build the two screens (the import path on the hood sheet, the manager's
  tick-box reset), then apply 0018 and publish the client together. One production change,
  one release, everything reachable.
- **Apply the safe half now.** §B (numbering + uuid), §D (activity completeness), §D2
  (membership), §E (indexes) and §K (lock order) are all improvements to behaviour that
  already ships, and none of them needs a screen. §E3, §F, §G and §H (the ledger, the
  import, the reset, the summary) would then land with the UI. That is a smaller migration
  than 0018 and it does not exist yet — it would have to be split out and re-reviewed.

My recommendation is the first. The second is defensible and I will prepare it if asked.

Whichever is chosen: **the preflight in §J must be run and read first**, and the build
version must be bumped past `v46` before any publish.

---

## I2. WHAT IS NOT FINISHED — AND IS NOT BEING BUILT

Named here so nothing about Phase 5 reads as complete. **None of this is built in this
branch and none of it should be until you say so.**

**Map interactions**
- **Draw** — freehand and tap-dot drawing exist from earlier phases; the premium redraw of
  that interaction does not.
- **Select** — no multi-polygon selection model.
- **Move** — a polygon cannot be dragged as a whole.
- **Undo / Redo** — no history stack while drawing.
- **Clear** — no single control that clears an in-progress outline.

**Screens the v42 server work exists for**
- **The import path on the hood sheet.** `STORE.importDoorsServer` exists and has no
  caller; the live import is still the per-device client path.
- **The manager's reset-for-re-knock sheet.** `STORE.resetForReknock` exists and has no
  caller; the only Clear Outcomes button still calls `STORE.startCycle`, which moves the
  boundary for every outcome and offers no tick boxes.

**Validation not performed**
- **Real satellite-map visual validation.** The Phase 5 screenshots are from a local
  prototype with synthetic cartography and zero network requests. No Google 2D Tiles
  session has been exercised against this work.

**Known gap that follows the apply**
- Every screen except the polygon card still identifies a hood by its device-local
  auto-name. `seq` cannot be shown before 0018 is applied, because it does not exist yet.

---

## J. THE READ-ONLY PREFLIGHT

`db/preflight/v42-import-preflight.editor.sql` — paste into the Supabase SQL Editor and
run. It writes nothing: no insert, no update, no DDL, no function, no temp table. It has
been run as a role with SELECT and EXECUTE only, and against deliberately malformed pin
data, to prove both.

Thirteen probes plus a VERDICT — fourteen rows. Read the VERDICT; anything other than
`READY` means stop. Sixteen mutation cases in `db/test/v42-preflight-bite.sh` cover them
(some probes have more than one way to break).

Blocking probes: the 43 named v41 functions, the assignment flip, the three territories
triggers, a partially-applied v42 (columns, functions, the ledger, each caught alone), and
a live hood whose outline the server cannot read — that last one aborts the apply, and the
probe was rated advisory in its first version, which would have said READY and then failed
the paste.

Advisory probes: duplicate property rows, scale counts, and doors whose blob and column
disagree today.

### It has been run against production. READ ONLY — nothing was changed.

Run 2026-09-10 against project `xwjreykfjzvlmgjzfnzt`. One SELECT; no insert, no update,
no DDL.

| # | Probe | Value | Verdict |
|---|---|---|---|
| 1 | the 43 named v41 functions | 43 of 43 | PASS |
| 2 | `assignment_server_authoritative` | true | PASS |
| 3 | territories triggers present | 3 | PASS |
| 4 | already applied: territories columns | 0 of 4 | PASS — not applied |
| 5 | already applied: events columns | 0 | PASS |
| 6 | already applied: v42 functions + ledger | 0 of 10 | PASS |
| 7 | duplicate property rows | 0 | PASS — a unique index would build cleanly later |
| 8 | hoods to number | 27 | INFO |
| 9 | live hoods | 20 | INFO |
| 10 | live doors | 687 | INFO |
| 11 | activity rows | 56 | INFO |
| 12 | live hoods with an unreadable outline | 0 | PASS |
| 13 | doors whose blob and column disagree | 0 | PASS — nothing to correct |
| **99** | **VERDICT** | | **READY — `db/APPLY_v42.sql` may be pasted and run** |

So the database is in exactly the state v42 expects, v42 is not partially applied, and the
one condition that would abort the apply is absent. The backfill would number 27 hoods and
issue 27 uuids; no pin, event or customer row would be written.

**READY is a statement about the DATABASE, not a recommendation to apply.** The
recommendation is still NO-GO, for the reason in §I: the screens are missing, not the
schema.
