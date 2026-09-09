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
--   THE EFFECT OF A SELECTIVE RESET. Dropping cycle_keep does not move a
--   door, but it changes what the map PAINTS: a hood whose last reset kept
--   Go Backs purple loses that exemption, and every kept door goes back to
--   blue at the next repaint. No history is lost and the boundary itself is
--   untouched, so re-applying v42 and re-running the reset restores it —
--   but between the rollback and that re-run, reps see a different map.
--
-- WHAT IT DOES RESTORE EXACTLY: the function catalog, the trigger set, the
-- index set, and the column privileges as they were before v42.

begin;

-- the trigger first: it reads columns this file is about to drop
drop trigger if exists territories_number on public.territories;
drop function if exists public.territories_number();

drop trigger if exists events_derive_context on public.events;
drop function if exists public.events_derive_context();

drop function if exists public.import_territory_doors(text, jsonb, text);
drop function if exists public.reset_territory_outcomes(text, text[], boolean, text);
drop function if exists public.rally_territory_summary(text);
drop function if exists public.rally_num(text);

drop index if exists public.pins_point_live_gist;
drop index if exists public.pins_provenance_live_idx;
drop index if exists public.pins_parcel_live_idx;

alter table public.territories drop constraint if exists territories_seq_uniq;
alter table public.territories drop constraint if exists territories_uuid_uniq;

-- Dropping a column drops every privilege granted on it, so the SELECT
-- grants in §I of 0018 need no separate revoke.
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
                         'rally_territory_summary')
    union all
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname in ('pins_point_live_gist','pins_provenance_live_idx','pins_parcel_live_idx')
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
