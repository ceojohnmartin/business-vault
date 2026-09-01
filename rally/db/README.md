# RALLY database (Supabase) — Phase 1 foundation

Schema + Row Level Security for the RALLY cloud. Phase 1 uses it for
**authentication only** — no app data syncs yet (that's Phase 2, behind
its own approval). The data tables exist ahead of time so sync has solid,
security-proven ground to land on.

## Layout

    migrations/0001_phase1_foundation.sql        the whole schema + RLS
    migrations/0002_realtime_doorbell.sql        Phase 3: realtime wake-up triggers + listen policy
    migrations/0003_territory_authorization.sql  v39: territory writes are leadership-only
    migrations/0004_payment_allowlist.sql        v39: honest payment allowlist
    migrations/0005_smart_split.sql              v39: Smart Split as ONE transaction
    APPLY_v39.sql                                0004 + 0003 + 0005 as one paste-able transaction
    capability-matrix.json                       WHO may manage territories — one definition,
                                                 asserted by the RLS suite AND the client suite
    APPLIED.md                                   read-only checks for what's live, and deploy order
    seed.example.sql                             one-time team/owner bootstrap
    build-apply.sh                               regenerates APPLY_v39.sql from the migrations
    test/supabase-shim.sql                       local stand-in for Supabase bits (TEST ONLY)
    test/rls-test.sql                            137 security checks
    test/race-test.sh                            7 concurrency checks on the payment trigger
    test/split-race-test.sh                      11 concurrency checks on Smart Split
    test/apply-atomic-test.sh                    10 checks that APPLY_v39.sql is all-or-nothing
    test/mirror-fidelity.js                      54 payloads: the tests' JS mirror of the payment
                                                 trigger vs this database, byte for byte
    test/verify-production.sql                   rollback-safe behavioural probes, post-migration
    test/run-rls-tests.sh                        runs them all on a throwaway local Postgres

## Territory authorization (0003)

Creating, renaming, re-polygoning, assigning, splitting and tombstoning a
territory require a role of `leader`, `manager` or `owner` — enforced by RLS,
not by the client hiding buttons. Reps keep full write access to pins,
customers and the knock log, which is the whole job. `capability-matrix.json`
is the single definition both sides are tested against.

## Payment allowlist (0004)

The stored payment object is still rebuilt from an allowlist at the database
door, so no card or bank number can land here whatever a client sends. v39
changes which honest fields survive: the old `autopay` (which defaulted to
true in the client, so a stored `true` proved nothing about what the customer
wanted) becomes an explicit `autopayRequested`, plus a `status` the client may
only ever set to `not_configured` or `pending_setup` — never to anything
claiming a payment method is on file.

The trigger also treats an ABSENT key as "leave it alone": a client too old to
know about `autopayRequested` cannot erase what a customer asked for simply by
saving the record. Key presence is the discriminator — a current client always
sends the key, including an explicit `false` when a rep turns autopay off.

The previous value comes from `OLD` and from nowhere else. The trigger fires
twice per upsert and the first firing's output becomes `EXCLUDED`, so a pass
with no `OLD` must not write a value it did not receive — otherwise the second
pass honours the injection as client intent and a concurrent commit is lost.
`test/race-test.sh` proves that with two real sessions; a brand-new row from a
client too old to send the keys therefore carries neither, which reads as "no
request on record".

## The realtime doorbell (0002)

Realtime carries no data — a statement-level trigger broadcasts an EMPTY
payload to the private topic `team:<team_id>` whenever team rows change,
and clients that hear it run their normal pull. Who may LISTEN is decided
by an RLS policy on realtime.messages comparing the topic to the
caller's own team (my_team_id() from the JWT); a join for another team's
topic is refused at the socket, and a disabled rep can't listen at all.
Until 0002 is applied, the app's realtime join is refused and it quietly
falls back to its 45-second polling — nothing breaks. **0002 is not
re-runnable as written** (bare `create trigger` / `create policy`); see
`APPLIED.md` for the read-only query that tells you whether it is live.

## Setting up the real project (once)

Order matters: the app can only create real accounts *after* it has the
project keys, so the owner account is made in the dashboard first.

1. Create a project at supabase.com (any name; pick a strong database
   password and keep it in a password manager — it is never used by RALLY).
2. SQL editor → paste `migrations/0001_phase1_foundation.sql` → Run once.
3. Authentication → Users → **Add user** → the owner's email and the
   password they'll type into RALLY, with **Auto Confirm User** on. The
   signup trigger creates their profile automatically.
4. SQL editor → paste `seed.example.sql` with that email filled in → Run.
   This creates the team and makes them its owner.
5. Project Settings → API: copy the **Project URL** and the **anon public**
   key into `rally/js/cloud-config.js`. Those two values are browser-safe
   by design — every real permission is enforced by RLS.
   **Never** copy the `service_role` key into the app, the repo, or a chat.
6. Auth → Providers → Email: leave "Confirm email" ON (recommended) — the
   gate handles the confirm-then-sign-in flow for everyone after the owner.

Reps: each rep signs up in RALLY (or gets added in the dashboard the same
way), then leadership places them on the team — one `update`, see the
bottom of `seed.example.sql`. Until placed, an account can sign in but
reads zero team data.

A device that already has a local-only RALLY account keeps its data when
it first signs in against the cloud: signing in with the same email
re-keys that device to the server password and binds it to the cloud
user. Nothing on the phone is erased.

## The security model in one paragraph

Every data table is keyed `(team_id, id)` and guarded by RLS: you read and
write only your own team's rows, only while your profile is enabled.
`role`, `team_id`, and `disabled` on profiles are writable by **nobody**
from a client — a column grant exposes only `name` — so a malicious client
cannot promote itself, move teams, or re-enable itself, no matter what its
JavaScript says. The knock log (`events`) accepts inserts only — history
cannot be edited or deleted by any client. Nothing has DELETE: removal is
a `deleted_at` tombstone. `anon` has no grants at all. Payment data is cut
to `{method, last4, autopay, billingAddress}` by a server trigger before a
customer row is ever stored. Rep location points (unused until the
tracking phase ships) are writable only as yourself and readable only by
you or same-team leadership.

## Proving it

    PGHOST=<host> PGPORT=<port> sh test/run-rls-tests.sh

spins `rally_rls_test`, applies the shim + every migration in order, and runs
all 87 checks (team isolation, escalation attempts, append-only events,
disabled and anon lockouts, payment scrubbing, and the adversarial territory
matrix: a rep's create / rename / re-polygon / assign / archive / tombstone /
Smart-Split attempts all refused straight at PostgREST, with no second
reachable mutation path). Any failure exits non-zero.

## Smart Split is one transaction (0005)

A split is N children plus a retired parent. Done from a client that is N+1
independent writes, and the states that reach are "children beside a live
parent" and "parent gone, half the children missing". `smart_split_territory()`
does the whole thing in one transaction or none of it, deriving the caller's
identity, team and role server-side rather than accepting them.

It is the **only** writable SECURITY DEFINER function in `public`, and
`test/rls-test.sql` asserts that by name — a second one fails the suite until
somebody decides it belongs. Section 17 of that file takes it apart from every
role that must not reach it and every shape a split must not be; two real
concurrent sessions in `test/split-race-test.sh` prove a hood can only be
split once.

**A v39 client against a database without 0005 gets a 404 and says so** — the
hood is left exactly as it was and the manager is told Smart Split is not
switched on for the team yet. That is the fleet's state for the whole window
between publishing v39 and running `APPLY_v39.sql`.
