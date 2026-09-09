-- RALLY v42 — PREFLIGHT. STRICTLY READ-ONLY.
--
-- Paste into the Supabase SQL Editor and run. It writes NOTHING: no insert,
-- no update, no DDL, no function, no temp table. Every row it returns is a
-- question db/APPLY_v42.sql cannot answer about itself.
--
-- Read the VERDICT row at the bottom. Anything other than READY means stop.

with

-- 1. Is this the database v42 expects? 0001-0017 applied, flip live.
base as (
  select
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public') as fns,
    (select assignment_server_authoritative from public.rally_config) as flag,
    (select count(*) from pg_trigger
      where tgrelid = 'public.territories'::regclass
        and tgname in ('territories_assignment','territories_no_overlap','territories_derive_geom')) as trg
),

-- 2. Has any of it already been applied? A partial state is the one thing
--    the apply cannot recover from on its own.
already as (
  select
    (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'territories'
        and column_name in ('seq','uuid','cycle_keep')) as t_cols,
    (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'events'
        and column_name in ('territory_id','prev_disposition')) as e_cols,
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('territories_number','import_territory_doors',
                          'reset_territory_outcomes','rally_territory_summary')) as fns
),

-- 3. THE QUESTION THAT DECIDES THE UNIQUE INDEX.
--    v42 ships the provenance index NON-unique on purpose, because a unique
--    one would refuse to build if production already holds two live pins for
--    one property. This counts them. Zero means a later migration can make
--    it unique; anything else names work to do first.
dupes as (
  select count(*) as n from (
    select data->'prop'->>'source' as src, data->'prop'->>'externalId' as ext
      from public.pins
     where deleted_at is null
       and coalesce(data->'prop'->>'externalId', '') <> ''
     group by 1, 2 having count(*) > 1) d
),

-- 4. How much work the backfill has to do, and whether anything would
--    collide with the new unique constraint on (team_id, seq).
scale as (
  select
    (select count(*) from public.territories) as hoods,
    (select count(*) from public.territories where deleted_at is null and archived = false) as live_hoods,
    (select count(*) from public.pins where deleted_at is null) as doors,
    (select count(*) from public.events) as activity
),

-- 5. Hoods whose outline the server could not read. They are not a blocker
--    for v42 — but import_territory_doors REFUSES to import into one,
--    because it cannot test containment without a geometry. Worth knowing
--    before a manager hits it in the field.
noGeom as (
  select count(*) as n from public.territories
   where deleted_at is null and archived = false and geom is null
)

select * from (
  select 1 as ord, 'base: public functions'          as probe,
         b.fns::text as value,
         case when b.fns >= 43 then 'PASS' else 'FAIL — expected at least 43' end as verdict from base b
  union all
  select 2, 'base: assignment_server_authoritative', coalesce(b.flag::text,'(null)'),
         case when b.flag then 'PASS' else 'FAIL — v42 assumes the flip is live' end from base b
  union all
  select 3, 'base: territories triggers present', b.trg::text,
         case when b.trg = 3 then 'PASS' else 'FAIL — expected 3' end from base b
  union all
  select 4, 'already applied: territories columns', a.t_cols::text,
         case when a.t_cols = 0 then 'PASS — not applied'
              when a.t_cols = 3 then 'NOTE — already applied; the apply is idempotent'
              else 'FAIL — PARTIAL. Stop and read APPLIED.md' end from already a
  union all
  select 5, 'already applied: events columns', a.e_cols::text,
         case when a.e_cols in (0,2) then 'PASS' else 'FAIL — PARTIAL' end from already a
  union all
  select 6, 'already applied: v42 functions', a.fns::text,
         case when a.fns in (0,4) then 'PASS' else 'FAIL — PARTIAL' end from already a
  union all
  select 7, 'duplicate property rows (live, same source+externalId)', d.n::text,
         case when d.n = 0 then 'PASS — a unique index would build cleanly later'
              else 'NOTE — v42 still applies; the provenance index stays non-unique' end from dupes d
  union all
  select 8, 'hoods to number', s.hoods::text, 'INFO' from scale s
  union all
  select 9, 'live hoods', s.live_hoods::text, 'INFO' from scale s
  union all
  select 10, 'live doors', s.doors::text, 'INFO' from scale s
  union all
  select 11, 'activity rows', s.activity::text, 'INFO' from scale s
  union all
  select 12, 'live hoods with an unreadable outline', g.n::text,
         case when g.n = 0 then 'PASS'
              else 'NOTE — an import into one of these will be refused' end from noGeom g
  union all
  select 99, 'VERDICT',
         '',
         case
           when (select fns from base) < 43
             or (select flag from base) is not true
             or (select trg from base) <> 3
             or (select t_cols from already) not in (0,3)
             or (select e_cols from already) not in (0,2)
             or (select fns from already) not in (0,4)
           then 'DO NOT APPLY — a probe above reads FAIL'
           else 'READY — db/APPLY_v42.sql may be pasted and run' end
) x order by ord;
