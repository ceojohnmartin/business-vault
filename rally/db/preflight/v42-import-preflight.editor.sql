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
    /* NOT a count of everything in public — that probe was BLIND. Dropping
       clear_pin_dnk on a replica left the total at 57, still >= 43, and the
       preflight still said READY. It counts how many of the 43 NAMED Stage
       A/B/C functions are present, which is the question. The list is the
       same one APPLY_v41_FLIP.sql asserts on, copied verbatim. */
    (select count(*) from unnest(array[
       'rally_ring_read','rally_ring_to_geom','rally_ring_problem','territories_derive_geom',
       'rally_capabilities','rally_ms','rally_uid','rally_uid_uuid','rally_sort_entries',
       'rally_open_entries','rally_first_open_assignee','rally_open_uuids','rally_mirror_assignments',
       'rally_assert_ledger','rally_keep_closed_history','rally_merge_provenance','territories_assignment',
       'rally_legacy_to_entries','rally_close_duplicate_opens','rally_unresolved_live_assignments',
       'rally_config_guard','rally_dnk_from_history','rally_strip_forged_clears','pins_protect_dnk',
       'events_guard_dnk_clear',
       'rally_keep_open_history','rally_keep_server_clears','rally_require_leader','rally_my_team',
       'rally_diff_assignees','rally_validate_assignees','set_territory_assignments','save_territory',
       'start_territory_cycle','clear_pin_dnk','rally_split_inherit','rally_split_strip_children',
       'smart_split_territory_v41','smart_split_territory','smart_split_territory_core',
       'rally_overlap_tolerance_m2','rally_overlap_m2','assert_no_turf_overlap']) nm
      where exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                     where n.nspname = 'public' and p.proname = nm)) as fns,
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
        and column_name in ('seq','uuid','cycle_keep','cycle_keep_at')) as t_cols,
    (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'events'
        and column_name in ('territory_id','prev_disposition')) as e_cols,
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('territories_number','events_derive_context','rally_num',
                          'import_territory_doors','reset_territory_outcomes',
                          'rally_territory_summary','pins_territory_guard','rally_txt')) as fns,
    (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and c.relname = 'rally_operations') as ops_table
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

-- 3b. WHAT §D2 WILL START CORRECTING.
--     v42 makes pins.territory_id and data->>'territoryId' one fact. Every
--     RALLY client has always written both from one record, so this should
--     read zero — but a row that a direct PostgREST call or an old restore
--     left half-written would be silently corrected on its next write, and
--     the owner should know the number BEFORE that happens rather than
--     discover it in a house count. It does not block: the correction is
--     toward the value the server counts by, which is the right one.
mismatch as (
  select count(*) as n from public.pins
   where deleted_at is null
     and jsonb_typeof(data) = 'object'
     and territory_id is not null
     and data->>'territoryId' is distinct from territory_id
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

-- 5. THE ONE CONDITION THAT ABORTS THE APPLY.
--
--    §J backfills every territory row. That UPDATE re-runs 0009's geometry
--    derivation and 0016's overlap constraint, and 0016 refuses to let a
--    LIVE hood hold an outline the server cannot read. One such row and the
--    whole transaction rolls back.
--
--    This probe rated it "NOTE" in its first version, so the preflight would
--    have said READY and the paste would then have failed. Reproduced on a
--    replica with a two-point ring: "BF Live has an outline this map cannot
--    use (a hood needs at least 3 distinct corners - this outline has 2), so
--    it cannot be made active turf", and nothing applied.
--
--    It reads the POLYGON, not geom. A live row with a good outline and a
--    null geom is harmless — the backfill re-derives it — and that was
--    confirmed on a replica too, so this must not block on it.
badRing as (
  select count(*) as n,
         coalesce(string_agg(id || ' (' || public.rally_ring_problem(polygon) || ')', '; '
                             order by id), '') as detail
    from public.territories
   where deleted_at is null and archived = false
     and public.rally_ring_problem(polygon) is not null
)

select * from (
  select 1 as ord, 'base: the 43 named v41 functions'  as probe,
         b.fns::text || ' of 43' as value,
         case when b.fns = 43 then 'PASS'
              else 'FAIL — ' || (43 - b.fns)::text || ' missing; this is not the database v42 expects'
         end as verdict from base b
  union all
  select 2, 'base: assignment_server_authoritative', coalesce(b.flag::text,'(null)'),
         case when b.flag then 'PASS' else 'FAIL — v42 assumes the flip is live' end from base b
  union all
  select 3, 'base: territories triggers present', b.trg::text,
         case when b.trg = 3 then 'PASS' else 'FAIL — expected 3' end from base b
  union all
  select 4, 'already applied: territories columns', a.t_cols::text || ' of 4',
         case when a.t_cols = 0 then 'PASS — not applied'
              when a.t_cols = 4 then 'NOTE — already applied; the apply is idempotent'
              else 'FAIL — PARTIAL. Stop and read APPLIED.md' end from already a
  union all
  select 5, 'already applied: events columns', a.e_cols::text,
         case when a.e_cols in (0,2) then 'PASS' else 'FAIL — PARTIAL' end from already a
  union all
  select 6, 'already applied: v42 functions and the operation ledger',
         (a.fns + a.ops_table)::text || ' of 9',
         case when (a.fns + a.ops_table) in (0,9) then 'PASS' else 'FAIL — PARTIAL' end from already a
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
  select 12, 'live hoods with an unreadable outline',
         g.n::text || case when g.n > 0 then ' — ' || g.detail else '' end,
         case when g.n = 0 then 'PASS'
              else 'FAIL — the apply WILL abort on these. Archive or fix each one first' end
    from badRing g
  union all
  select 13, 'doors whose blob and column disagree today', m.n::text,
         case when m.n = 0 then 'PASS — nothing to correct'
              else 'NOTE — v42 still applies; each is corrected toward the column on its next write'
         end from mismatch m
  union all
  select 99, 'VERDICT',
         '',
         case
           when (select fns from base) <> 43
             or (select flag from base) is not true
             or (select trg from base) <> 3
             or (select t_cols from already) not in (0,4)
             or (select e_cols from already) not in (0,2)
             or (select fns + ops_table from already) not in (0,9)
             or (select n from badRing) > 0
           then 'DO NOT APPLY — a probe above reads FAIL'
           else 'READY — db/APPLY_v42.sql may be pasted and run' end
) x order by ord;
