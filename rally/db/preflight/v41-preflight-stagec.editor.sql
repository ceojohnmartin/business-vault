-- RALLY v41 — THE STAGE C / FLIP PREFLIGHT. Supabase SQL Editor form.
-- READ-ONLY. Run this immediately before 0016, and again before the flip.
--
-- WHY THIS FILE EXISTS ALONGSIDE v41-preflight.editor.sql
--
--   That one runs BEFORE 0009. territories.geom does not exist yet there,
--   so it builds geometry on the fly from the polygon jsonb with pg_temp
--   twins of the ring reader. That was correct then and is WRONG now.
--
--   0016's constraint indexes territories.geom — the STORED column. And
--   0009's derivation deliberately lets an ALREADY-broken hood keep
--   geom = NULL rather than making every unrelated write to it fail. A
--   live row with a NULL geom is invisible to a GiST index and therefore
--   never compared against anything: a silent hole in the invariant. A
--   preflight that recomputes geometry cannot see that hole, because its
--   own computation succeeds where the stored value is absent.
--
--   So this survey reads what 0016 will read, and calls the SAME server
--   functions 0016's arming gate calls — public.rally_ring_problem and
--   public.rally_ring_to_geom — rather than twins of them. For the
--   activation flip it calls public.rally_unresolved_live_assignments()
--   itself, the very function rally_config_guard runs, so the number here
--   IS the number that will decide the flip.
--
-- THE ONE THING IT CANNOT BORROW is the overlap measurement, because
-- public.rally_overlap_m2 is created BY 0016 and does not exist yet. Its
-- expression is inlined below, identically — planar intersection,
-- CollectionExtract(...,3) so a shared edge and a corner touch both measure
-- exactly 0, area taken in geography for true square metres — with one
-- deliberate difference: 0016 RAISES on a pair GEOS cannot measure (fail
-- closed), and a survey must not abort, so the twin returns the reason and
-- this report lists the pair as a BLOCKER. Same verdict, different delivery.
--
-- WRITES NOTHING. No row is inserted, updated or deleted; no durable object
-- is created. The one helper lives in pg_temp and dies with the session.
--
-- Output is ONE final SELECT: section | key | detail, ordered by section.
-- A section with nothing to report prints "(none)" so an empty section is
-- visibly empty rather than missing. The Z rows are the verdicts.

create or replace function pg_temp.overlap_m2(
  a gis.geometry, b gis.geometry,
  out m2 double precision, out problem text)
language plpgsql immutable security invoker set search_path = ''
as $$
begin
  problem := null;
  if a is null or b is null then m2 := 0; return; end if;
  if not gis.st_intersects(a, b) then m2 := 0; return; end if;
  m2 := coalesce(gis.st_area(
          gis.st_collectionextract(gis.st_intersection(a, b), 3)::gis.geography),
        0::double precision);
exception when others then
  -- 0016 raises here. A survey reports instead — the pair is still a blocker.
  m2 := null; problem := sqlerrm;
end $$;

with
-- ------------------------------------------------------------ 0 environment
env as (
  select
    (select extversion from pg_extension where extname = 'postgis')            as postgis,
    (select n.nspname from pg_extension e join pg_namespace n on n.oid = e.extnamespace
      where e.extname = 'postgis')                                             as postgis_schema,
    (select gis.postgis_geos_version())                                        as geos,
    (select count(*) from pg_attribute
      where attrelid = 'public.territories'::regclass
        and attname in ('geom','assignees','assignees_rev','open_assignees')
        and not attisdropped)                                                  as stage_a_columns
),
stage_a_fns as (
  select count(*) n from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname in
     ('rally_ring_read','rally_ring_problem','rally_ring_to_geom','rally_ms',
      'rally_uid_uuid','rally_open_entries','rally_sort_entries','rally_assert_ledger',
      'rally_legacy_to_entries','rally_diff_assignees','rally_unresolved_live_assignments',
      'rally_config_guard')
),
stage_b_fns as (
  select count(*) n from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname in
     ('set_territory_assignments','save_territory','clear_pin_dnk',
      'smart_split_territory_v41','smart_split_territory','smart_split_territory_core',
      'rally_split_inherit','rally_split_strip_children')
),
stage_c_fns as (
  select count(*) n from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname in
     ('rally_overlap_m2','rally_overlap_tolerance_m2','assert_no_turf_overlap')
),
stage_c_trg as (
  select count(*) n from pg_trigger
   where tgrelid = 'public.territories'::regclass and tgname = 'territories_no_overlap'
),
trg as (
  select string_agg(tgname || case when tgenabled = 'O' then '' else ' [DISABLED:' || tgenabled::text || ']' end, ', ' order by tgname) as list,
         count(*) filter (where tgenabled <> 'O') as disabled
    from pg_trigger where tgrelid = 'public.territories'::regclass and not tgisinternal
),
pin_trg as (
  select string_agg(tgname || case when tgenabled = 'O' then '' else ' [DISABLED:' || tgenabled::text || ']' end, ', ' order by tgname) as list,
         count(*) filter (where tgenabled <> 'O') as disabled
    from pg_trigger where tgrelid = 'public.pins'::regclass and not tgisinternal
),
flag as (select assignment_server_authoritative as v, updated_at from public.rally_config limit 1),

-- --------------------------------------------------------------- 1 outlines
hoods as (
  select t.team_id, t.id, t.name, t.polygon, t.geom, t.assignees, t.data,
         t.open_assignees, t.assignees_rev, t.created_at,
         (t.deleted_at is null and t.archived = false) as live,
         case when t.deleted_at is not null then 'TOMBSTONED'
              when t.archived then 'ARCHIVED' else 'LIVE' end as state
    from public.territories t
),
/* 0016 GATE 1, literally: live, geom is null, and the ring is either
   unreadable (problem) or readable-but-PostGIS-invalid (to_geom returns a
   geometry 0009 refused to store). A live hood with NO outline at all is a
   legal draft and is NOT turf — it is listed separately, not as a blocker. */
bad_outlines as (
  select h.*, public.rally_ring_problem(h.polygon) as problem,
         public.rally_ring_to_geom(h.polygon) as readable_geom
    from hoods h
   where h.geom is null
     and (public.rally_ring_problem(h.polygon) is not null
          or public.rally_ring_to_geom(h.polygon) is not null)
),
no_outline as (
  select h.* from hoods h
   where h.geom is null
     and public.rally_ring_problem(h.polygon) is null
     and public.rally_ring_to_geom(h.polygon) is null
),
stored_invalid as (   -- belt and braces: a stored geom that is not valid
  select h.*, gis.st_isvalidreason(h.geom) as why
    from hoods h where h.geom is not null and not gis.st_isvalid(h.geom)
),

-- --------------------------------------------------------------- 2 overlaps
pairs as (
  select a.team_id, a.id as id_a, b.id as id_b, a.name as name_a, b.name as name_b,
         (pg_temp.overlap_m2(a.geom, b.geom)).*
    from hoods a join hoods b
      on a.team_id = b.team_id and a.id < b.id
   where a.live and b.live
     and a.geom is not null and b.geom is not null
     and a.geom operator(gis.&&) b.geom
),
over_tol   as (select * from pairs where problem is null and m2 > 1.0),
unmeasured as (select * from pairs where problem is not null),

-- ------------------------------------------------------------ 3 assignments
entries as (
  select h.team_id, h.id, h.name, h.state, h.live, e.e
    from hoods h,
         lateral (select case when jsonb_typeof(h.assignees->'entries') = 'array'
                              then h.assignees->'entries' else '[]'::jsonb end a) g,
         lateral jsonb_array_elements(g.a) e(e)
),
census as (
  select (select count(*) from hoods)                                   as hoods,
         (select count(*) from hoods where live)                        as live_hoods,
         (select count(*) from entries)                                 as ledger_entries,
         (select count(*) from entries where e->>'unassignedAt' is null) as open_entries,
         (select count(*) from hoods where live
             and coalesce(array_length(open_assignees,1),0) = 0)        as live_unassigned,
         (select count(*) from hoods where live
             and coalesce(array_length(open_assignees,1),0) > 1)        as live_multi_assignee,
         (select count(*) from hoods
            where jsonb_typeof(assignees->'entries') is distinct from 'array') as ledger_not_array
),
/* open_assignees is what the RLS policies index. It must agree, as a SET,
   with the open entries in the ledger — that is the whole basis of "a rep
   sees their turf". */
mirror_open as (
  select h.team_id, h.id, h.name, h.state,
         coalesce(array_length(h.open_assignees,1),0) as arr_n,
         (select count(distinct public.rally_uid_uuid(e->>'userId'))
            from jsonb_array_elements(
                   case when jsonb_typeof(h.assignees->'entries')='array'
                        then h.assignees->'entries' else '[]'::jsonb end) e
           where e->>'unassignedAt' is null
             and public.rally_uid_uuid(e->>'userId') is not null) as ledger_n
    from hoods h
),
mirror_bad as (select * from mirror_open where arr_n <> ledger_n),
/* data.assignedTo is the v40 mirror every v40 phone still reads. */
scalar_bad as (
  select h.team_id, h.id, h.name, h.state,
         h.data->>'assignedTo' as scalar_says,
         (select e->>'userId' from jsonb_array_elements(
                   case when jsonb_typeof(h.assignees->'entries')='array'
                        then h.assignees->'entries' else '[]'::jsonb end) e
           where e->>'unassignedAt' is null
           order by public.rally_ms(e->>'assignedAt') nulls last, e->>'userId'
           limit 1) as ledger_says
    from hoods h
),
scalar_disagree as (
  select * from scalar_bad
   where coalesce(scalar_says,'') is distinct from coalesce(ledger_says,'')
),
/* ledger integrity — the same shapes rally_assert_ledger refuses */
backwards as (
  select team_id, id, name, state, e->>'userId' as uid,
         e->>'assignedAt' as a_at, e->>'unassignedAt' as u_at
    from entries
   where e->>'unassignedAt' is not null
     and public.rally_ms(e->>'unassignedAt') < public.rally_ms(e->>'assignedAt')
),
dupe_open as (
  select team_id, id, name, e->>'userId' as uid, count(*) n
    from entries where e->>'unassignedAt' is null
   group by 1,2,3,4 having count(*) > 1
),
future as (
  select team_id, id, name, e->>'userId' as uid, e->>'assignedAt' as a_at
    from entries
   where public.rally_ms(e->>'assignedAt') > (extract(epoch from now())*1000)::bigint + 60000
),
-- THE flip blocker: the server's own function, the one rally_config_guard calls
flip as (select public.rally_unresolved_live_assignments() as n),
unresolved_detail as (
  select h.team_id, h.id, h.name, e->>'userId' as uid, e->>'assignedAt' as a_at
    from hoods h,
         lateral jsonb_array_elements(
           case when jsonb_typeof(h.assignees->'entries')='array'
                     and jsonb_array_length(h.assignees->'entries') > 0
                then h.assignees->'entries'
                else public.rally_legacy_to_entries(h.data, h.created_at, '{"entries": []}'::jsonb) end) e
   where h.live
     and e->>'unassignedAt' is null
     and coalesce(e->>'userId','') <> ''
     and not exists (select 1 from public.profiles p
                      where p.id = public.rally_uid_uuid(e->>'userId')
                        and p.team_id = h.team_id)
),

rows_ as (
  select '0a environment' as section, 'postgis' as key,
         format('%s in schema %s · GEOS %s · Stage A columns present: %s of 4',
                coalesce(postgis,'MISSING'), coalesce(postgis_schema,'-'),
                coalesce(geos,'-'), stage_a_columns) as detail from env
  union all select '0b Stage A + B objects', 'functions',
         format('Stage A helpers %s of 12 · Stage B RPCs %s of 8',
                (select n from stage_a_fns), (select n from stage_b_fns))
  union all select '0b Stage A + B objects', 'territories triggers',
         coalesce((select list from trg),'none')
         || case when (select disabled from trg) > 0 then '  ← SOME ARE DISABLED' else '' end
  union all select '0b Stage A + B objects', 'pins triggers',
         coalesce((select list from pin_trg),'none')
         || case when (select disabled from pin_trg) > 0 then '  ← SOME ARE DISABLED' else '' end
  union all select '0c Stage C (must be ABSENT until armed)', 'objects',
         format('functions %s of 3, constraint trigger %s of 1 — %s',
                (select n from stage_c_fns), (select n from stage_c_trg),
                case when (select n from stage_c_fns) = 0 and (select n from stage_c_trg) = 0
                     then 'NOT APPLIED, as expected' else 'ALREADY PRESENT — 0016 has been applied' end)
  union all select '0d activation flag', 'assignment_server_authoritative',
         coalesce((select v::text from flag),'NO ROW') ||
         ' (last changed ' || coalesce((select updated_at::text from flag),'-') || ')'

  union all select '1a LIVE hoods with an unusable outline (0016 GATE 1 — must be 0)', id,
         format('team=%s name=%s reason=%s', team_id, name,
                coalesce(problem, 'ring reads but PostGIS calls it invalid: '
                                  || coalesce(gis.st_isvalidreason(readable_geom),'?')))
    from bad_outlines where live
  union all select '1a LIVE hoods with an unusable outline (0016 GATE 1 — must be 0)', '(none)', ''
    where not exists (select 1 from bad_outlines where live)

  union all select '1b LIVE hoods whose STORED geom is invalid (must be 0)', id,
         format('team=%s name=%s reason=%s', team_id, name, why)
    from stored_invalid where live
  union all select '1b LIVE hoods whose STORED geom is invalid (must be 0)', '(none)', ''
    where not exists (select 1 from stored_invalid where live)

  union all select '1c LIVE hoods with no outline at all (legal drafts, not turf)', id,
         format('team=%s name=%s', team_id, name) from no_outline where live
  union all select '1c LIVE hoods with no outline at all (legal drafts, not turf)', '(none)', ''
    where not exists (select 1 from no_outline where live)

  union all select '1d retired hoods with an unusable outline (cannot return to live turf)', id,
         format('team=%s state=%s name=%s', team_id, state, name)
    from bad_outlines where not live
  union all select '1d retired hoods with an unusable outline (cannot return to live turf)', '(none)', ''
    where not exists (select 1 from bad_outlines where not live)

  union all select '2a LIVE pairs overlapping > 1.0 m² (0016 GATE 2 — must be 0)',
         id_a || ' × ' || id_b,
         format('team=%s %s × %s overlap=%s m²', team_id, name_a, name_b, round(m2::numeric,3))
    from over_tol
  union all select '2a LIVE pairs overlapping > 1.0 m² (0016 GATE 2 — must be 0)', '(none)', ''
    where not exists (select 1 from over_tol)

  union all select '2b LIVE pairs that CANNOT be measured (must be 0 — 0016 fails closed)',
         id_a || ' × ' || id_b,
         format('BLOCKER team=%s %s × %s: %s', team_id, name_a, name_b, problem)
    from unmeasured
  union all select '2b LIVE pairs that CANNOT be measured (must be 0 — 0016 fails closed)', '(none)', ''
    where not exists (select 1 from unmeasured)

  union all select '2c overlap survey coverage', 'pairs examined',
         format('%s live pair(s) shared a bounding box and were measured; largest overlap %s m² (tolerance 1.0)',
                (select count(*) from pairs),
                coalesce((select round(max(m2)::numeric,3)::text from pairs where problem is null),'0'))

  union all select '3a assignment census (the REAL ledger, post-backfill)', 'totals',
         format('hoods=%s live=%s ledger_entries=%s open=%s live_unassigned=%s live_multi_assignee=%s ledger_not_an_array=%s',
                hoods, live_hoods, ledger_entries, open_entries,
                live_unassigned, live_multi_assignee, ledger_not_array)
    from census

  union all select '3b ACTIVATION BLOCKER: live hoods with an unresolved CURRENT assignee (must be 0)', 'count',
         (select n::text from flip) ||
         ' — from public.rally_unresolved_live_assignments(), the exact function rally_config_guard runs at the flip'
  union all select '3b ACTIVATION BLOCKER: live hoods with an unresolved CURRENT assignee (must be 0)',
         id || ' / ' || coalesce(uid,'?'),
         format('team=%s name=%s assignedAt=%s', team_id, name, coalesce(a_at,'-'))
    from unresolved_detail

  union all select '3c open_assignees disagrees with the ledger (RLS reads this array — must be 0)', id,
         format('team=%s name=%s state=%s array=%s ledger_open=%s', team_id, name, state, arr_n, ledger_n)
    from mirror_bad
  union all select '3c open_assignees disagrees with the ledger (RLS reads this array — must be 0)', '(none)', ''
    where not exists (select 1 from mirror_bad)

  union all select '3d data.assignedTo disagrees with the ledger (the mirror v40 phones read)', id,
         format('team=%s name=%s state=%s scalar=%s ledger=%s', team_id, name, state,
                coalesce(scalar_says,'(null)'), coalesce(ledger_says,'(null)'))
    from scalar_disagree
  union all select '3d data.assignedTo disagrees with the ledger (the mirror v40 phones read)', '(none)', ''
    where not exists (select 1 from scalar_disagree)

  union all select '3e ledger entries that end before they start (rally_assert_ledger refuses these)', id || ' / ' || coalesce(uid,'?'),
         format('team=%s name=%s state=%s assignedAt=%s unassignedAt=%s', team_id, name, state, a_at, u_at)
    from backwards
  union all select '3e ledger entries that end before they start (rally_assert_ledger refuses these)', '(none)', ''
    where not exists (select 1 from backwards)

  union all select '3f duplicate OPEN entries for one rep on one hood', id || ' / ' || coalesce(uid,'?'),
         format('team=%s name=%s open_count=%s', team_id, name, n) from dupe_open
  union all select '3f duplicate OPEN entries for one rep on one hood', '(none)', ''
    where not exists (select 1 from dupe_open)

  union all select '3g future-dated assignedAt (a fast phone clock; tolerated, listed)', id || ' / ' || coalesce(uid,'?'),
         format('team=%s name=%s assignedAt=%s', team_id, name, a_at) from future
  union all select '3g future-dated assignedAt (a fast phone clock; tolerated, listed)', '(none)', ''
    where not exists (select 1 from future)

  union all select 'Z verdict', '1 Stage A health',
         case when (select stage_a_columns from env) < 4 then 'BLOCKED — Stage A columns missing'
              when (select n from stage_a_fns) < 12     then 'BLOCKED — Stage A helpers missing'
              when (select n from stage_b_fns) < 8      then 'BLOCKED — Stage B RPCs missing'
              when (select disabled from trg) > 0
                or (select disabled from pin_trg) > 0   then 'BLOCKED — a trigger is DISABLED'
              when (select count(*) from mirror_bad) > 0 then 'BLOCKED — open_assignees disagrees with the ledger'
              when (select count(*) from backwards) > 0  then 'BLOCKED — a ledger entry ends before it starts'
              else 'CLEAN' end
  union all select 'Z verdict', '2 Stage C (0016 arming) = 0 + 0 + 0',
         format('%s live hood(s) with an unusable outline + %s overlapping pair(s) + %s unmeasurable pair(s) — all three must be 0',
                (select count(*) from bad_outlines where live),
                (select count(*) from over_tol),
                (select count(*) from unmeasured))
  union all select 'Z verdict', '3 Activation flip blocker = 0',
         format('%s live hood(s) with an unresolved CURRENT assignee — must be 0', (select n from flip))
  union all select 'Z verdict', '4 GO / NO-GO for 0016',
         case when (select count(*) from bad_outlines where live) = 0
               and (select count(*) from over_tol) = 0
               and (select count(*) from unmeasured) = 0
               and (select count(*) from stored_invalid where live) = 0
               and (select n from stage_c_fns) = 0
               and (select n from stage_c_trg) = 0
              then 'GO — Stage C may be applied'
              else 'NO-GO — resolve the rows above first' end
)
select section, key, detail from rows_ order by section, key;
