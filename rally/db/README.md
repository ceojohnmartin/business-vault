# RALLY database (Supabase) — Phase 1 foundation

Schema + Row Level Security for the RALLY cloud. Phase 1 uses it for
**authentication only** — no app data syncs yet (that's Phase 2, behind
its own approval). The data tables exist ahead of time so sync has solid,
security-proven ground to land on.

## Layout

    migrations/0001_phase1_foundation.sql   the whole schema + RLS
    migrations/0002_realtime_doorbell.sql   Phase 3: realtime wake-up triggers + listen policy
    seed.example.sql                        one-time team/owner bootstrap
    test/supabase-shim.sql                  local stand-in for Supabase bits (TEST ONLY)
    test/rls-test.sql                       47 security checks
    test/run-rls-tests.sh                   runs them on a throwaway local Postgres

## The realtime doorbell (0002)

Realtime carries no data — a statement-level trigger broadcasts an EMPTY
payload to the private topic `team:<team_id>` whenever team rows change,
and clients that hear it run their normal pull. Who may LISTEN is decided
by an RLS policy on realtime.messages comparing the topic to the
caller's own team (my_team_id() from the JWT); a join for another team's
topic is refused at the socket, and a disabled rep can't listen at all.
Until 0002 is applied, the app's realtime join is refused and it quietly
falls back to its 45-second polling — nothing breaks.

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

spins `rally_rls_test`, applies the shim + migration, and runs all 47
checks (team isolation, escalation attempts, append-only events, disabled
and anon lockouts, payment scrubbing). Any failure exits non-zero.
