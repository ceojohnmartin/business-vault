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

1. Apply `0003` and `0004`.
2. Deploy the v39 client.

**Immediately before or alongside — not days earlier.** `0003` only *removes*
a rep's ability to write territories. A v38 client believes every local user
is a manager, so a v38 rep who taps a territory control after `0003` lands
gets a silent refusal into the dead-letter and no UI that admits it. v39 is
the release that surfaces refusals (`MSYNC.status().refused`), so the two
belong together.

`0004` is order-independent with respect to the client: a v38 client's
`autopay` field is dropped rather than mistranslated, and a v39 client reads
a missing `autopayRequested` as `false`, which is the honest answer either
way.

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

Rolling back `0003` re-opens territory writes to every rep. Rolling back
`0004` starts dropping `autopayRequested` from stored records; the field is
not recoverable afterwards, so treat that one as a decision, not a retry.

## Proving the whole thing locally

The RLS suite applies every migration in order to a throwaway database and
runs the full security matrix — including the adversarial territory checks
that `0003` exists for:

    PGHOST=<host> PGPORT=<port> sh rally/db/test/run-rls-tests.sh
