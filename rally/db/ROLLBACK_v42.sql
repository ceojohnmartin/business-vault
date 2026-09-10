-- RALLY v42 — ROLLBACK. ONE TRANSACTION.
--
-- Removes everything db/APPLY_v42.sql added and nothing else. It does not
-- touch a territory, a pin, an event or a customer row.
--
-- WHAT IT CANNOT PUT BACK
--
--   A hood's NUMBER. Dropping territories.seq drops the numbers with it,
--   and re-applying v42 issues fresh ones in creation order. That is fine
--   on a database that has only ever had this file applied and rolled back
--   in one sitting; it is NOT fine once a manager has said "go work Polygon
--   14" out loud, because after a rollback and a re-apply Polygon 14 may be
--   a different piece of ground. Treat the numbers as durable the moment
--   anybody uses one.
--
--   A hood's permanent UUID, for the same reason.
--
--   Any door the import created. Those are ordinary pins with ordinary
--   history and they stay exactly where they are — which is the point of a
--   permanent property record. If a whole import was a mistake, tombstone
--   the doors it made; do not roll back the schema to hide them.
--
--   Any activity row. events.territory_id and events.prev_disposition are
--   dropped as columns; the rows themselves are append-only and remain.
--
--   THE EFFECT OF A SELECTIVE RESET — and this paragraph used to be wrong
--   in both directions, so read it carefully.
--
--   Dropping cycle_keep moves no door and loses no history. What it does
--   NOT do is change what a phone paints. The map is painted from the
--   DEVICE's own record, and S.cycleKeep reads the device's cycleKeep and
--   cycleKeepAt. ALTER TABLE ... DROP COLUMN does not move
--   territories.updated_at, and js/sync.js pulls territories on an
--   updated_at cursor — so after this rollback no device re-pulls those
--   hoods, and every phone that already had the exemption keeps painting
--   it, indefinitely, until some unrelated write bumps that hood's row.
--   Rolling back does not "put the doors back to blue"; it leaves the
--   fleet exactly where it was and takes away the server's copy.
--
--   Nor can the exemption be restored by re-running the original reset.
--   reset_territory_outcomes is idempotent on its operation id, and the
--   ledger it reads (public.rally_operations) is dropped by this file —
--   so a re-apply plus a replay would run as a NEW reset with a NEW
--   boundary, which blues every door worked since the first one. There is
--   no way back to the exact prior paint. If that matters, do not roll
--   back; leave v42 applied and change the keep-list forward.
--
--   If the intent is for a rollback to actually reach the phones, this
--   file is not enough on its own: the hoods have to be touched so the
--   updated_at cursor delivers them again.
--
-- WHAT IT DOES RESTORE EXACTLY: the function catalog, the trigger set, the
-- index set, and the column privileges as they were before v42.

begin;

-- the trigger first: it reads columns this file is about to drop
drop trigger if exists territories_number on public.territories;
drop function if exists public.territories_number();

drop trigger if exists events_derive_context on public.events;
drop function if exists public.events_derive_context();

/* The membership guard reads nothing v42 added — pins.territory_id and
   pins.data are both pre-v42 — so dropping it restores the pre-v42
   behaviour exactly: a client write may once again clear a door out of the
   hood it is standing in, and the blob and the column may once again
   disagree. Any door whose blob §D2 repaired KEEPS that repair; it is
   correct data either way, and rewriting it back to a stale value would be
   a second wrong. */
drop trigger if exists pins_territory_guard on public.pins;
drop function if exists public.pins_territory_guard();

drop function if exists public.import_territory_doors(text, jsonb, text);
drop function if exists public.reset_territory_outcomes(text, text[], boolean, text);
drop function if exists public.rally_territory_summary(text);
drop function if exists public.rally_num(text);
drop function if exists public.rally_txt(jsonb);
drop function if exists public.rally_hood_covers(uuid, text, double precision, double precision);

/* The operation ledger. Dropping it drops the idempotency record of every
   import and reset that ran under v42 — a retry of one of those operation
   ids after a rollback and a re-apply would run the operation again rather
   than being answered from the ledger. No client can read or write this
   table, so nothing outside the two RPCs notices it is gone. */
drop table if exists public.rally_operations;

drop index if exists public.pins_point_live_gist;
drop index if exists public.pins_provenance_live_idx;
drop index if exists public.pins_parcel_live_idx;

alter table public.territories drop constraint if exists territories_seq_uniq;
alter table public.territories drop constraint if exists territories_uuid_uniq;

-- Dropping a column drops every privilege granted on it, so the SELECT
-- grants in §I of 0018 need no separate revoke.
--
-- The one grant that must be put back by hand is public.events' INSERT.
-- 0018 replaced its table-wide grant with a column list so that a column
-- added later could not be written by a client. Leaving that in place after
-- a rollback would be harmless — the client writes exactly those columns —
-- but it would be a silent divergence from what every other v41 database
-- looks like, so it is restored.
revoke insert on public.events from authenticated;
grant insert on public.events to authenticated;
alter table public.events       drop column if exists prev_disposition;
alter table public.events       drop column if exists territory_id;
alter table public.territories  drop column if exists cycle_keep_at;
alter table public.territories  drop column if exists cycle_keep;
alter table public.territories  drop column if exists uuid;
alter table public.territories  drop column if exists seq;

-- Prove the catalog is back where it started: nothing v42 added survives.
do $$
declare v_left text;
begin
  select string_agg(name, ', ') into v_left from (
    select p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('territories_number','events_derive_context','rally_num',
                         'import_territory_doors','reset_territory_outcomes',
                         'rally_territory_summary','pins_territory_guard','rally_txt','rally_hood_covers')
    union all
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname in ('pins_point_live_gist','pins_provenance_live_idx','pins_parcel_live_idx',
                         'rally_operations')
    union all
    select a.attname from pg_attribute a
     where a.attrelid in ('public.territories'::regclass, 'public.events'::regclass)
       and not a.attisdropped and a.attnum > 0
       and a.attname in ('seq','uuid','cycle_keep','cycle_keep_at','territory_id','prev_disposition')
  ) x;
  if v_left is not null then
    raise exception 'ROLLBACK_v42: these v42 objects are still present (%)', v_left;
  end if;
end $$;

commit;
