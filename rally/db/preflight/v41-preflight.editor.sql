-- RALLY v41 — THE PREFLIGHT, Supabase SQL Editor form. READ-ONLY.
--
-- The SAME questions as db/preflight/v41-preflight.sql, reshaped for the
-- editor, which cannot run psql meta-commands and shows only the LAST
-- statement's result. So: no \echo, and every section is folded into ONE
-- final SELECT that returns three columns —
--
--     section | key | detail
--
-- ordered by section. A section with nothing to report prints one
-- "(none)" row, so an empty section is visibly empty rather than missing.
-- The final "Z verdict" rows say what blocks which stage.
--
-- Writes no row and creates no durable object: the one helper lives in
-- pg_temp and dies with the session. It runs BEFORE 0009, so
-- territories.geom does not exist yet — geometry is built on the fly from
-- the stored polygon jsonb with a session-local twin of the ring reader
-- 0009 will install: the same three shape-preserving transforms (close the
-- ring, drop consecutive duplicates, force CCW) and the same refusal to
-- repair anything. PostGIS is addressed as `gis.` — the schema decided at
-- CUTOVER STEP 0A — and nothing here resolves through search_path.
--
-- Prerequisite: CUTOVER STEP 0A (PostGIS 3.3.7 in `gis`). Nothing else.

create or replace function pg_temp.ring_to_geom(p_ring jsonb)
returns gis.geometry
language plpgsql immutable as $$
declare
  v_pts gis.geometry[] := '{}';
  v_elem jsonb; v_x double precision; v_y double precision;
  v_prev gis.geometry; v_g gis.geometry; v_n int;
begin
  if p_ring is null or jsonb_typeof(p_ring) <> 'array' then return null; end if;
  for v_elem in select value from jsonb_array_elements(p_ring) loop
    if jsonb_typeof(v_elem) <> 'array' or jsonb_array_length(v_elem) < 2 then continue; end if;
    begin
      v_x := (v_elem->>0)::double precision;
      v_y := (v_elem->>1)::double precision;
    exception when others then continue; end;
    if v_x is null or v_y is null or v_x <> v_x or v_y <> v_y then continue; end if;
    v_g := gis.st_setsrid(gis.st_makepoint(v_x, v_y), 4326);
    if v_prev is not null and gis.st_equals(v_prev, v_g) then continue; end if;
    v_pts := array_append(v_pts, v_g); v_prev := v_g;
  end loop;
  v_n := coalesce(array_length(v_pts, 1), 0);
  while v_n > 1 and gis.st_equals(v_pts[1], v_pts[v_n]) loop
    v_pts := v_pts[1 : v_n - 1]; v_n := v_n - 1;
  end loop;
  if v_n < 3 then return null; end if;
  v_pts := array_append(v_pts, v_pts[1]);
  return gis.st_forcepolygonccw(
           gis.st_setsrid(
             gis.st_makepolygon(gis.st_makeline(v_pts)), 4326));
exception when others then return null;
end $$;

with
-- ------------------------------------------------------------------ 0. env
env as (
  select e.extname, n.nspname as postgis_schema, e.extversion, r.rolname as ext_owner
    from pg_catalog.pg_extension e
    join pg_catalog.pg_namespace n on n.oid = e.extnamespace
    join pg_catalog.pg_roles     r on r.oid = e.extowner
   where e.extname = 'postgis'
),
-- ------------------------------------------------------------- 1. geometry
rings as (
  select t.team_id, t.id, t.name, t.deleted_at, t.archived,
         case when t.deleted_at is not null then 'tombstoned'
              when t.archived then 'archived' else 'LIVE' end as state,
         jsonb_array_length(coalesce(t.polygon, '[]'::jsonb)) as n_points,
         pg_temp.ring_to_geom(t.polygon) as geom
    from public.territories t
),
geom_summary as (
  select state,
         count(*)                                                as hoods,
         count(*) filter (where geom is null and n_points > 0)   as unusable_outline,
         count(*) filter (where geom is not null
                            and not gis.st_isvalid(geom))        as invalid_geometry,
         count(*) filter (where n_points = 0)                    as no_outline_at_all
    from rings group by state
),
live_bad as (
  select team_id, id, name, n_points,
         case when geom is null then 'fewer than 3 distinct corners'
              else gis.st_isvalidreason(geom) end as reason
    from rings
   where state = 'LIVE' and n_points > 0
     and (geom is null or not gis.st_isvalid(geom))
),
-- -------------------------------------------------------------- 2. overlap
live as (
  select team_id, id, name, geom from rings
   where state = 'LIVE' and geom is not null and gis.st_isvalid(geom)
),
overlap_pairs as (
  select a.team_id, a.id as hood_a, a.name as name_a, b.id as hood_b, b.name as name_b,
         round(gis.st_area(
           gis.st_collectionextract(
             gis.st_intersection(a.geom, b.geom), 3)::gis.geography)::numeric, 2) as overlap_m2
    from live a join live b
      on a.team_id = b.team_id and a.id < b.id
   where gis.st_intersects(a.geom, b.geom)
     and gis.st_area(
           gis.st_collectionextract(
             gis.st_intersection(a.geom, b.geom), 3)::gis.geography) > 1.0
),
-- ---------------------------------------------------------- 3. assignments
-- EVERY row: live, archived, tombstoned and split parents alike.
ents as (
  select t.team_id, t.id, t.name, t.data,
         case when t.deleted_at is not null then 'tombstoned'
              when t.archived then 'archived' else 'LIVE' end as state,
         x.entry
    from public.territories t
    left join lateral jsonb_array_elements(
      coalesce(t.data->'assignments', '[]'::jsonb)) x(entry) on true
),
cls as (
  select ents.*,
         entry->>'userId' as uid,
         (entry->>'userId') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' as uuid_shaped,
         entry->>'unassignedAt' is null as is_open
    from ents
),
resolved as (
  select cls.*,
         uuid_shaped and exists (
           select 1 from public.profiles p
            where p.id = cls.uid::uuid and p.team_id = cls.team_id) as resolves
    from cls
),
census as (
  select
    count(distinct (team_id, id))                                              as hoods,
    count(entry)                                                               as entries,
    count(entry) filter (where is_open)                                        as open_entries,
    count(*) filter (where entry is null and coalesce(data->>'assignedTo','') <> '')
                                                                               as bare_scalar_only,
    count(entry) filter (where coalesce(uid,'') = '')                          as malformed_no_user,
    count(entry) filter (where entry->>'assignedAt' is null)                   as missing_assignedAt,
    count(entry) filter (where coalesce(entry->>'assignedBy','') = '')         as missing_assignedBy,
    count(entry) filter (where uid is not null and not uuid_shaped)            as local_device_ids,
    count(entry) filter (where uuid_shaped and not resolves)                   as foreign_or_missing_profile,
    count(entry) filter (where resolves and exists (
      select 1 from public.profiles p where p.id = uid::uuid and p.team_id = resolved.team_id
        and coalesce(p.disabled,false)))                                       as disabled_users
    from resolved
),
unresolved as (
  select team_id, id, name, state, uid, entry->>'assignedAt' as assigned_at, is_open
    from resolved
   where coalesce(uid,'') <> '' and not resolves
),
blockers as (
  select count(distinct (team_id, id)) as live_hoods_with_unresolved_current
    from unresolved where state = 'LIVE' and is_open
),
disagree as (
  select t.team_id, t.id, t.name, t.data->>'assignedTo' as scalar_says,
         (select x.entry->>'userId'
            from jsonb_array_elements(coalesce(t.data->'assignments','[]'::jsonb)) x(entry)
           where x.entry->>'unassignedAt' is null
           order by (x.entry->>'assignedAt')::bigint, x.entry->>'userId' limit 1) as ledger_says
    from public.territories t
   where coalesce(t.data->>'assignedTo','') is distinct from coalesce((
          select x.entry->>'userId'
            from jsonb_array_elements(coalesce(t.data->'assignments','[]'::jsonb)) x(entry)
           where x.entry->>'unassignedAt' is null
           order by (x.entry->>'assignedAt')::bigint, x.entry->>'userId' limit 1), '')
),
dupes as (
  select team_id, id, name, uid as rep, count(*) as open_entries
    from resolved
   where is_open and coalesce(uid,'') <> ''
   group by 1,2,3,4 having count(*) > 1
),
-- ---------------------------------------------------------- 4. do-not-knock
dnk as (
  select count(*) filter (where p.disposition = 'dnk')                                        as scalar_dnk,
         count(*) filter (where p.data->'history' @> '[{"disposition":"dnk"}]'::jsonb)         as has_dnk_knock,
         count(*) filter (where p.disposition = 'dnk'
                            and not (p.data->'history' @> '[{"disposition":"dnk"}]'::jsonb))   as dnk_with_no_dateable_knock,
         count(*) filter (where p.deleted_at is not null and p.disposition = 'dnk')            as already_tombstoned_black
    from public.pins p
),
-- ------------------------------------------------------- 5. metric evidence
cust as (
  select count(*) filter (where c.data->>'pinId' is null)                                     as unlinked_customers,
         count(*) filter (where c.data->>'pinId' is null
                            and coalesce(c.data->'agreement'->>'signedAt', c.data->>'signedAt') is not null)
                                                                                              as unlinked_but_signed,
         count(*)                                                                             as customers
    from public.customers c
   where c.deleted_at is null
),
-- ----------------------------------------------------------------- output
rows_ as (
  select '0 env' as section, 'postgis' as key,
         format('schema=%s version=%s owner=%s', postgis_schema, extversion, ext_owner) as detail
    from env
  union all select '0 env', 'postgis', 'NOT INSTALLED — stop; CUTOVER 0A has not happened'
    where not exists (select 1 from env)

  union all select '1a geometry by state', state,
         format('hoods=%s unusable_outline=%s invalid_geometry=%s no_outline_at_all=%s',
                hoods, unusable_outline, invalid_geometry, no_outline_at_all)
    from geom_summary

  union all select '1b LIVE hoods to fix before 0016', id,
         format('team=%s name=%s points=%s reason=%s', team_id, name, n_points, reason)
    from live_bad
  union all select '1b LIVE hoods to fix before 0016', '(none)', ''
    where not exists (select 1 from live_bad)

  union all select '2 live pairs overlapping > 1.0 m² (block 0016)', hood_a || ' × ' || hood_b,
         format('team=%s %s × %s overlap_m2=%s', team_id, name_a, name_b, overlap_m2)
    from overlap_pairs
  union all select '2 live pairs overlapping > 1.0 m² (block 0016)', '(none)', ''
    where not exists (select 1 from overlap_pairs)

  union all select '3a assignment census (ALL hoods)', 'totals',
         format('hoods=%s entries=%s open=%s bare_scalar_only=%s malformed_no_user=%s missing_assignedAt=%s missing_assignedBy=%s local_device_ids=%s foreign_or_missing_profile=%s disabled_users=%s',
                hoods, entries, open_entries, bare_scalar_only, malformed_no_user, missing_assignedAt,
                missing_assignedBy, local_device_ids, foreign_or_missing_profile, disabled_users)
    from census

  union all select '3b entries that resolve to no rep (kept as history)', id || ' / ' || coalesce(uid, '?'),
         format('team=%s name=%s state=%s assignedAt=%s still_open=%s', team_id, name, state, assigned_at, is_open)
    from unresolved
  union all select '3b entries that resolve to no rep (kept as history)', '(none)', ''
    where not exists (select 1 from unresolved)

  union all select '3c ACTIVATION BLOCKER: live hoods with unresolved CURRENT assignee', 'count',
         live_hoods_with_unresolved_current::text || ' (must be 0 before the flip; rally_config_guard refuses otherwise)'
    from blockers

  union all select '3d scalar assignedTo disagrees with open set', id,
         format('team=%s name=%s scalar=%s ledger=%s', team_id, name, scalar_says, ledger_says)
    from disagree
  union all select '3d scalar assignedTo disagrees with open set', '(none)', ''
    where not exists (select 1 from disagree)

  union all select '3e DUPLICATE open entries for one rep (0011 closes all but newest)', id || ' / ' || rep,
         format('team=%s name=%s open_entries=%s', team_id, name, open_entries)
    from dupes
  union all select '3e DUPLICATE open entries for one rep (0011 closes all but newest)', '(none)', ''
    where not exists (select 1 from dupes)

  union all select '4 do-not-knock census', 'totals',
         format('scalar_dnk=%s has_dnk_knock=%s dnk_with_no_dateable_knock=%s already_tombstoned_black=%s',
                scalar_dnk, has_dnk_knock, dnk_with_no_dateable_knock, already_tombstoned_black)
    from dnk

  union all select '5 customers that protect no door', 'totals',
         format('unlinked_customers=%s unlinked_but_signed=%s customers=%s',
                unlinked_customers, unlinked_but_signed, customers)
    from cust

  union all select 'Z verdict', 'Stage A (0009-0013)',
         case when not exists (select 1 from env) then 'BLOCKED — PostGIS missing'
              else 'no data blocker: invalid outlines keep NULL geom, duplicate opens are resolved by 0011 deterministically — review 1b/3e above and approve' end
  union all select 'Z verdict', 'Stage C (0016 arming)',
         format('%s live hood(s) with unusable outline + %s overlapping pair(s) must be 0',
                (select count(*) from live_bad), (select count(*) from overlap_pairs))
  union all select 'Z verdict', 'Activation flip',
         format('%s live hood(s) with an unresolved CURRENT assignee must be 0',
                (select live_hoods_with_unresolved_current from blockers))
)
select section, key, detail
  from rows_
 order by section, key;
