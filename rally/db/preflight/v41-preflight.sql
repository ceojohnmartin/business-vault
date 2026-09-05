-- RALLY v41 — THE PREFLIGHT. READ-ONLY. RUN THIS BEFORE 0009.
--
-- Writes no row, locks nothing beyond a read, and creates no durable
-- object: its one helper lives in pg_temp and vanishes when the session
-- ends. It answers the questions that decide whether the rest of v41 may
-- proceed, and its output is reviewed by a person before Stage A is applied.
--
-- WHY IT LIVES HERE AND NOT IN db/migrations/. run-rls-tests.sh applies
-- EVERY file in db/migrations/*.sql; a survey dropped there would execute on
-- every test run. This is a survey, not a migration.
--
-- WHY IT NEEDS 0008 FIRST. Its overlap and validity questions are PostGIS
-- questions, so the extension has to exist before the survey that gates the
-- migration can run. That ordering — extension, THEN survey, THEN schema —
-- is the whole reason 0008 touches no RALLY object.
--
-- It builds geometry ON THE FLY from the existing polygon jsonb, because
-- territories.geom does not exist yet — and with its OWN pg_temp copy of the
-- ring reader, because public.rally_ring_to_geom is created by 0009, which
-- is the very file this survey gates. Reaching for it here would be the
-- same ordering mistake in miniature.
--
--   psql -f db/preflight/v41-preflight.sql
--
-- PostGIS is addressed as `gis.` — the schema chosen at CUTOVER STEP 0A —
-- and nothing here resolves through search_path.
--
-- SUPABASE SQL EDITOR: use db/preflight/v41-preflight.editor.sql instead.
-- The editor cannot run the \echo lines below and shows only the LAST
-- statement's result, so that file asks the same questions folded into one
-- SELECT (section | key | detail). db/test/preflight-test.sh runs BOTH
-- forms against a seeded Stage-0 database and checks they agree.

\pset pager off
\timing off
set client_min_messages = notice;


-- ---------------------------------------------------- the ring reader ---
-- A session-local twin of what 0009 will install: the SAME three
-- shape-preserving transforms (close the ring, drop consecutive duplicates,
-- force CCW) and the same refusal to repair anything. Kept identical on
-- purpose — a survey that measured different geometry from the constraint
-- would be measuring the wrong thing.
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

-- ---------------------------------------------------------------- 0. env ---
\echo ''
\echo '=== PostGIS: schema and version (RECORD THIS IN db/APPLIED.md) ==='
select e.extname, n.nspname as postgis_schema, e.extversion
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
 where e.extname = 'postgis';

-- Every later file qualifies against the schema above BY HAND, because they
-- run with search_path = '' and resolve nothing implicitly. If this reports
-- anything other than what 0009..0016 were written against, stop and fix
-- the files rather than the path.

-- ------------------------------------------------------------ 1. geometry ---
\echo ''
\echo '=== Outlines that cannot be used (these BLOCK the overlap constraint) ==='
with rings as (
  select t.team_id, t.id, t.name, t.deleted_at, t.archived,
         jsonb_array_length(coalesce(t.polygon, '[]'::jsonb)) as n_points,
         pg_temp.ring_to_geom(t.polygon) as geom
    from public.territories t
)
select case when deleted_at is not null then 'tombstoned'
            when archived then 'archived' else 'LIVE' end as state,
       count(*)                                              as hoods,
       count(*) filter (where geom is null and n_points > 0) as unusable_outline,
       count(*) filter (where geom is not null
                          and not gis.st_isvalid(geom))as invalid_geometry,
       count(*) filter (where n_points = 0)                   as no_outline_at_all
  from rings
 group by 1 order by 1;

\echo ''
\echo '=== The specific LIVE hoods that must be fixed before 0016 ==='
select t.team_id, t.id, t.name,
       jsonb_array_length(coalesce(t.polygon, '[]'::jsonb)) as points,
       case when pg_temp.ring_to_geom(t.polygon) is null
            then 'fewer than 3 distinct corners'
            else gis.st_isvalidreason(pg_temp.ring_to_geom(t.polygon))
       end as reason
  from public.territories t
 where t.deleted_at is null and t.archived = false
   and jsonb_array_length(coalesce(t.polygon, '[]'::jsonb)) > 0
   and (pg_temp.ring_to_geom(t.polygon) is null
     or not gis.st_isvalid(pg_temp.ring_to_geom(t.polygon)))
 order by 1, 2;

-- ------------------------------------------------------------- 2. overlap ---
\echo ''
\echo '=== Live hoods that ALREADY overlap by more than 1.0 m² ==='
\echo '(the constraint is not retroactive, but every one of these will refuse'
\echo ' its NEXT edit until the overlap is resolved)'
with live as (
  select t.team_id, t.id, t.name,
         pg_temp.ring_to_geom(t.polygon) as geom
    from public.territories t
   where t.deleted_at is null and t.archived = false
)
select a.team_id, a.id as hood_a, a.name as name_a, b.id as hood_b, b.name as name_b,
       round(gis.st_area(
         gis.st_collectionextract(
           gis.st_intersection(a.geom, b.geom), 3)::gis.geography)::numeric, 2) as overlap_m2
  from live a join live b
    on a.team_id = b.team_id and a.id < b.id
 where a.geom is not null and b.geom is not null
   and gis.st_intersects(a.geom, b.geom)
   and gis.st_area(
         gis.st_collectionextract(
           gis.st_intersection(a.geom, b.geom), 3)::gis.geography) > 1.0
 order by overlap_m2 desc;

-- ------------------------------------------------------ 3. assignments ---
-- EVERY row: live, archived, tombstoned and split parents alike. History is
-- indefinite, a split tombstones its parent, and an archived hood's
-- assignment record is part of the record. Filtering to live hoods here
-- would quietly hide the past this migration exists to preserve.
\echo ''
\echo '=== Assignment census — ALL hoods, in every state ==='
with e as (
  select t.team_id, t.id, t.deleted_at, t.archived, t.created_at, t.data,
         x.entry
    from public.territories t
    left join lateral jsonb_array_elements(
      coalesce(t.data->'assignments', '[]'::jsonb)) x(entry) on true
), c as (
  select e.*,
         e.entry->>'userId' as uid,
         (e.entry->>'userId') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' as uuid_shaped,
         e.entry->>'unassignedAt' is null as is_open
    from e
)
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
  count(entry) filter (where uuid_shaped and not exists (
    select 1 from public.profiles p where p.id = uid::uuid and p.team_id = c.team_id))
                                                                             as foreign_or_missing_profile,
  count(entry) filter (where uuid_shaped and exists (
    select 1 from public.profiles p where p.id = uid::uuid and p.team_id = c.team_id
      and coalesce(p.disabled,false)))                                       as disabled_users
  from c;

\echo ''
\echo '=== Entries that CANNOT be resolved to a rep today ==='
\echo '(kept forever as history; excluded from open_assignees; a LIVE hood'
\echo ' with one of these OPEN blocks the activation — see directive 2)'
select t.team_id, t.id, t.name,
       case when t.deleted_at is not null then 'tombstoned'
            when t.archived then 'archived' else 'LIVE' end as state,
       x.entry->>'userId'  as unresolved_user,
       x.entry->>'assignedAt' as assigned_at,
       x.entry->>'unassignedAt' is null as still_open
  from public.territories t
  cross join lateral jsonb_array_elements(coalesce(t.data->'assignments','[]'::jsonb)) x(entry)
 where coalesce(x.entry->>'userId','') <> ''
   and not exists (
     select 1 from public.profiles p
      where (x.entry->>'userId') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        and p.id = (x.entry->>'userId')::uuid and p.team_id = t.team_id)
 order by still_open desc, state, t.id;

\echo ''
\echo '=== ACTIVATION BLOCKER: live hoods with an unresolved CURRENT assignee ==='
select count(*) as must_be_zero_before_stage_b
  from public.territories t
 where t.deleted_at is null and t.archived = false
   and exists (
     select 1 from jsonb_array_elements(coalesce(t.data->'assignments','[]'::jsonb)) x(entry)
      where x.entry->>'unassignedAt' is null
        and coalesce(x.entry->>'userId','') <> ''
        and not exists (
          select 1 from public.profiles p
           where (x.entry->>'userId') ~ '^[0-9a-fA-F-]{36}$'
             and p.id = (x.entry->>'userId')::uuid and p.team_id = t.team_id));

\echo ''
\echo '=== Hoods whose scalar assignedTo disagrees with the open set ==='
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
 order by 1, 2;

\echo ''
\echo '=== Hoods with DUPLICATE open entries for one rep (I1 violations) ==='
\echo '(the backfill closes all but the newest, deterministically, deleting'
\echo ' nothing — review the list, then approve)'
select t.team_id, t.id, t.name, x.entry->>'userId' as rep, count(*) as open_entries
  from public.territories t
  cross join lateral jsonb_array_elements(coalesce(t.data->'assignments','[]'::jsonb)) x(entry)
 where x.entry->>'unassignedAt' is null
 group by 1,2,3,4 having count(*) > 1
 order by 1,2;

-- ------------------------------------------------------ 4. do-not-knock ---
\echo ''
\echo '=== Do-not-knock census ==='
select count(*) filter (where p.disposition = 'dnk')                 as scalar_dnk,
       count(*) filter (where p.data->'history' @> '[{"disposition":"dnk"}]'::jsonb) as has_dnk_knock,
       count(*) filter (where p.disposition = 'dnk'
                          and not (p.data->'history' @> '[{"disposition":"dnk"}]'::jsonb))
                                                                     as dnk_with_NO_dateable_knock,
       count(*) filter (where p.deleted_at is not null
                          and p.disposition = 'dnk')                 as already_tombstoned_black
  from public.pins p;

-- ------------------------------------------------- 5. metric evidence ---
-- Directive 5's conservative rule holds a door OUT of the prospect
-- denominator when its customer or do-not-knock cannot be dated. This
-- measures how many doors that is, so the number is known rather than
-- guessed at after the Route figures ship.
\echo ''
\echo '=== Customers that protect no door (pinId is null) ==='
select count(*) filter (where c.data->>'pinId' is null)              as unlinked_customers,
       count(*) filter (where c.data->>'pinId' is null
                          and coalesce(c.data->'agreement'->>'signedAt', c.data->>'signedAt') is not null)
                                                                     as unlinked_but_SIGNED,
       count(*)                                                      as customers
  from public.customers c
 where c.deleted_at is null;

\echo ''
\echo '=== PREFLIGHT COMPLETE — review every section above before 0009 ==='
