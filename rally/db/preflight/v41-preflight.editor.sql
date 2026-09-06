-- RALLY v41 — THE PREFLIGHT, Supabase SQL Editor form. READ-ONLY.
--
-- ONE survey. The psql form (v41-preflight.sql) is a wrapper that includes
-- this file, so there is exactly one text to review. The editor cannot run
-- psql meta-commands and shows only the LAST statement's result, so every
-- section is folded into ONE final SELECT returning three columns —
--
--     section | key | detail
--
-- ordered by section. A section with nothing to report prints one
-- "(none)" row, so an empty section is visibly empty rather than missing.
-- The final "Z verdict" rows say what blocks which stage.
--
-- ONE READER. Section 3 does not interpret legacy assignment data with
-- rules of its own: it runs the SAME normaliser the assignment trigger and
-- the 0011 backfill run — public.rally_legacy_to_entries and the four
-- helpers it stands on — installed here as pg_temp twins whose bodies
-- db/test/preflight-test.sh proves byte-identical to 0010's. What the
-- survey says a row's ledger will be IS what Stage A writes; what it says
-- would block the activation flip IS what rally_config_guard tests.
--
-- TOTAL OVER ARBITRARY LEGACY JSON. jsonb is not a contract: a row may hold
-- an object where an array was expected, a string where a number was, a
-- JSON null, a timestamp that is a sentence, a coordinate off the planet, a
-- userId that is a device-local string. Not one of those aborts this
-- survey; each is a NAMED FINDING. The rules that make it total:
--   * no jsonb_array_elements / jsonb_array_length without a jsonb_typeof
--     guard in front of it;
--   * no ::uuid or ::bigint cast except through the twins of rally_uid_uuid
--     and rally_ms, whose CASE/exception forms cannot fail;
--   * no geometry → geography cast except on rings the reader has proven
--     finite, inside [-180,180] × [-90,90] and under 180 degrees wide;
--   * every exploded row carries scalars only, never the array it came
--     from, so a hood with thousands of entries costs thousands of small
--     rows, not thousands of copies of the whole array.
--
-- Writes no row and creates no durable object: every helper lives in
-- pg_temp and dies with the session. It runs BEFORE 0009, so
-- territories.geom does not exist yet — geometry is built on the fly from
-- the stored polygon jsonb. PostGIS is addressed as `gis.` — the schema
-- decided at CUTOVER STEP 0A — and nothing here resolves through
-- search_path. Prerequisite: CUTOVER STEP 0A (PostGIS 3.3.7 in `gis`).

-- ---------------------------------------------------------- the ring reader
-- The twin of public.rally_ring_read (0009). Same body, same answers: geom
-- when the ring is usable, else problem says why.
create or replace function pg_temp.ring_read(
  p_ring jsonb,
  out geom gis.geometry,
  out problem text)
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_pts   gis.geometry[] := '{}';
  v_elem  jsonb;
  v_i     int := 0;
  v_x     double precision;
  v_y     double precision;
  v_minx  double precision;
  v_maxx  double precision;
  v_prev  gis.geometry;
  v_g     gis.geometry;
  v_n     int;
begin
  geom := null;
  problem := null;
  -- no outline at all is not a problem: a hood may be drawn later
  if p_ring is null or jsonb_typeof(p_ring) = 'null' then return; end if;
  if jsonb_typeof(p_ring) <> 'array' then
    problem := 'the outline is a JSON ' || jsonb_typeof(p_ring) || ', not an array of corners';
    return;
  end if;
  if jsonb_array_length(p_ring) = 0 then return; end if;

  for v_elem in select value from jsonb_array_elements(p_ring) loop
    v_i := v_i + 1;
    /* two IFs, not one OR: PostgreSQL does not promise left-to-right
       evaluation of AND/OR operands, so the array function may only be
       reached once the type test has already returned */
    if jsonb_typeof(v_elem) <> 'array' then
      problem := format('corner %s is not a [longitude, latitude] pair', v_i);
      return;
    end if;
    if jsonb_array_length(v_elem) < 2 then
      problem := format('corner %s is not a [longitude, latitude] pair', v_i);
      return;
    end if;
    if jsonb_typeof(v_elem->0) <> 'number' or jsonb_typeof(v_elem->1) <> 'number' then
      problem := format('corner %s has a coordinate that is not a number: %s', v_i, left(v_elem::text, 60));
      return;
    end if;
    v_x := (v_elem->>0)::double precision;
    v_y := (v_elem->>1)::double precision;
    if v_x < -180 or v_x > 180 then
      problem := format('corner %s longitude %s is outside [-180, 180]', v_i, v_x);
      return;
    end if;
    if v_y < -90 or v_y > 90 then
      problem := format('corner %s latitude %s is outside [-90, 90]', v_i, v_y);
      return;
    end if;
    v_minx := least(coalesce(v_minx, v_x), v_x);
    v_maxx := greatest(coalesce(v_maxx, v_x), v_x);
    v_g := gis.st_setsrid(gis.st_makepoint(v_x, v_y), 4326);
    -- TRANSFORM 2: drop a vertex identical to the one before it. A
    -- zero-length edge contributes nothing to the boundary.
    if v_prev is not null and gis.st_equals(v_prev, v_g) then
      continue;
    end if;
    v_pts := array_append(v_pts, v_g);
    v_prev := v_g;
  end loop;

  /* A hood is a few streets. An outline whose corners are 180 degrees of
     longitude apart is not turf, and its edges are ANTIPODAL to the sphere
     — an edge whose great circle is ambiguous, so whatever the geography
     engine answers for it (PostGIS 3.4.2 returned a number; 3.3.7 is
     unverified) is not a measurement a turf rule may rest on. Refused
     here, by name, before any geometry is built. */
  if v_maxx - v_minx >= 180 then
    problem := format('the outline spans %s degrees of longitude — half the planet is not a hood', rtrim(rtrim(round((v_maxx - v_minx)::numeric, 3)::text, '0'), '.'));
    return;
  end if;

  -- a ring stored closed: drop the repeat, since TRANSFORM 1 re-adds it
  v_n := coalesce(array_length(v_pts, 1), 0);
  while v_n > 1 and gis.st_equals(v_pts[1], v_pts[v_n]) loop
    v_pts := v_pts[1 : v_n - 1];
    v_n := v_n - 1;
  end loop;

  if v_n < 3 then
    problem := format('a hood needs at least 3 distinct corners — this outline has %s', v_n);
    return;
  end if;

  -- TRANSFORM 1: close the ring.  TRANSFORM 3: force CCW.
  v_pts := array_append(v_pts, v_pts[1]);
  geom := gis.st_forcepolygonccw(
            gis.st_setsrid(
              gis.st_makepolygon(gis.st_makeline(v_pts)), 4326));
  return;
exception when others then
  geom := null;
  problem := 'the outline could not be read: ' || sqlerrm;
  return;
end $$;

-- ------------------------------------------------------ the measurement
-- The survey's own overlap measurement, EXCEPTION-SAFE. 0016's
-- rally_overlap_m2 raises on a pair it cannot measure (refusing the write:
-- fail closed); a survey must not abort on the same pair, it must name it.
create or replace function pg_temp.overlap_m2(
  a gis.geometry,
  b gis.geometry,
  out m2 double precision,
  out problem text)
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  m2 := null;
  problem := null;
  if a is null or b is null then m2 := 0; return; end if;
  if not gis.st_intersects(a, b) then m2 := 0; return; end if;
  m2 := coalesce(gis.st_area(
          gis.st_collectionextract(gis.st_intersection(a, b), 3)::gis.geography),
        0::double precision);
  return;
exception when others then
  m2 := null;
  problem := sqlerrm;
  return;
end $$;

-- -------------------------------------------------------- the normaliser
-- The twins of 0010's rally_ms / rally_uid / rally_uid_uuid /
-- rally_close_duplicate_opens / rally_legacy_to_entries. Same bodies.
create or replace function pg_temp.ms(p text)
returns bigint
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  if p is null then return null; end if;
  if btrim(p, E' \t\r\n') !~ '^[+-]?[0-9]{1,19}$' then return null; end if;
  return btrim(p, E' \t\r\n')::bigint;
exception when others then
  return null;          -- 19 digits past the bigint range
end $$;

create or replace function pg_temp.uid(p text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case when p ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
              then lower(p) else p end
$$;

create or replace function pg_temp.uid_uuid(p text)
returns uuid
language sql
immutable
security invoker
set search_path = ''
as $$
  select case when p ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
              then lower(p)::uuid end
$$;

create or replace function pg_temp.close_duplicate_opens(p_entries jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  with x as (
    select e, ord,
           e->>'unassignedAt' is null as is_open,
           case when e->>'unassignedAt' is null
                then row_number() over (partition by e->>'userId', (e->>'unassignedAt' is null)
                                        order by (e->>'assignedAt')::bigint desc, ord desc) end as rn,
           max((e->>'assignedAt')::bigint) filter (where e->>'unassignedAt' is null)
             over (partition by e->>'userId') as survivor_at
      from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) with ordinality t(e, ord)
  )
  select coalesce(jsonb_agg(
           case when is_open and rn > 1
                then jsonb_set(e, '{unassignedAt}',
                       to_jsonb(greatest((e->>'assignedAt')::bigint, survivor_at)))
                     || '{"closedByDedupe": true}'::jsonb
                else e end
           order by ord), '[]'::jsonb)
    from x
$$;

create or replace function pg_temp.legacy_to_entries(p_data jsonb, p_created timestamptz, p_prior jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_src        jsonb;
  v_out        jsonb := '[]'::jsonb;
  e            jsonb;
  v_e          jsonb;
  v_uid        text;
  v_by         text;
  v_raw_at     text;
  v_raw_un     text;
  v_at         bigint;
  v_un         bigint;
  v_created_ms bigint;
begin
  -- the row clock, total: an infinite or pre-epoch created_at reads as 1
  begin
    v_created_ms := case when p_created is null or p_created = 'infinity'::timestamptz
                               or p_created = '-infinity'::timestamptz
                         then (extract(epoch from now()) * 1000)::bigint
                         else (extract(epoch from p_created) * 1000)::bigint end;
  exception when others then
    v_created_ms := (extract(epoch from now()) * 1000)::bigint;
  end;
  if v_created_ms <= 0 then v_created_ms := 1; end if;

  /* the history array, or NULL when there is none. Both type tests are
     total on any jsonb (-> on a non-object is NULL, typeof(NULL) is NULL),
     so the AND here relies on no evaluation order; the array function is
     reached only in its own IF, after v_src is known to be an array. */
  v_src := case when jsonb_typeof(p_data) = 'object'
                 and jsonb_typeof(p_data->'assignments') = 'array'
                then p_data->'assignments' end;
  if v_src is not null then
    if jsonb_array_length(v_src) = 0 then v_src := null; end if;
  end if;
  if v_src is null then
    -- the oldest shape of all: a scalar assignee and no history array
    if jsonb_typeof(p_data) = 'object' and coalesce(btrim(p_data->>'assignedTo'), '') <> '' then
      v_at := coalesce(pg_temp.ms(p_data->>'createdAt'), v_created_ms);
      if v_at <= 0 then v_at := 1; end if;
      return jsonb_build_array(jsonb_build_object(
        'userId', pg_temp.uid(p_data->>'assignedTo'), 'name', '',
        'assignedBy', null, 'assignedByName', '',
        'assignedAt', v_at,
        'unassignedAt', null, 'synthesizedFrom', 'assignedTo'));
    end if;
    return coalesce(p_prior->'entries', '[]'::jsonb);
  end if;

  for e in select value from jsonb_array_elements(v_src) loop
    if jsonb_typeof(e) <> 'object' then continue; end if;
    v_uid := e->>'userId';
    if coalesce(btrim(v_uid), '') = '' then continue; end if;
    v_raw_at := e->>'assignedAt';
    v_raw_un := e->>'unassignedAt';
    v_at := coalesce(pg_temp.ms(v_raw_at), v_created_ms);
    if v_at <= 0 then v_at := 1; end if;
    v_un := case when v_raw_un is null then null
                 else coalesce(pg_temp.ms(v_raw_un), v_at) end;
    if v_un is not null and v_un < v_at then v_un := v_at; end if;
    v_by := e->>'assignedBy';
    v_e := jsonb_build_object(
      'userId', pg_temp.uid(v_uid),
      'name', coalesce(e->>'name', ''),
      -- v40 wrote a display NAME here; a uuid is kept as the assigner's id
      'assignedBy', case when pg_temp.uid_uuid(v_by) is not null then pg_temp.uid(v_by) end,
      'assignedByName', case when pg_temp.uid_uuid(v_by) is not null then '' else coalesce(v_by, '') end,
      'assignedAt', v_at,
      'unassignedAt', v_un);
    if v_raw_at is null then
      v_e := v_e || jsonb_build_object('assignedAtSynthesized', true);
    elsif pg_temp.ms(v_raw_at) is distinct from v_at then
      v_e := v_e || jsonb_build_object('assignedAtRaw', e->'assignedAt');
    end if;
    if v_raw_un is not null and pg_temp.ms(v_raw_un) is distinct from v_un then
      v_e := v_e || jsonb_build_object('unassignedAtRaw', e->'unassignedAt');
    end if;
    v_out := v_out || v_e;
  end loop;
  return pg_temp.close_duplicate_opens(v_out);
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
  select t.team_id, t.id, t.name,
         case when t.deleted_at is not null then 'tombstoned'
              when t.archived then 'archived' else 'LIVE' end as state,
         case when jsonb_typeof(t.polygon) = 'array' then jsonb_array_length(t.polygon) end as n_points,
         case when t.polygon is null then false
              when jsonb_typeof(t.polygon) = 'null' then false
              when jsonb_typeof(t.polygon) = 'array' then jsonb_array_length(t.polygon) > 0
              else true end                                                                as has_outline,
         r.geom, r.problem,
         r.geom is not null and gis.st_isvalid(r.geom) as usable
    from public.territories t
    cross join lateral pg_temp.ring_read(t.polygon) r
),
geom_summary as (
  select state,
         count(*)                                                       as hoods,
         count(*) filter (where usable)                                 as usable,
         count(*) filter (where has_outline and problem is not null)    as unusable_outline,
         count(*) filter (where geom is not null and not usable)        as invalid_geometry,
         count(*) filter (where not has_outline)                        as no_outline_at_all
    from rings group by state
),
bad_rings as (
  select state, team_id, id, name, n_points,
         coalesce(problem, gis.st_isvalidreason(geom)) as reason
    from rings
   where has_outline and (problem is not null or (geom is not null and not usable))
),
-- -------------------------------------------------------------- 2. overlap
-- only rings the reader proved finite, in range and under 180° wide, and
-- PostGIS proved valid, ever reach the geography cast below
live as (
  select team_id, id, name, geom from rings where state = 'LIVE' and usable
),
-- the measurement itself is exception-safe (pg_temp.overlap_m2 above): a
-- pair GEOS or the geography engine cannot measure is a named BLOCKER row,
-- never an abort and never "zero"
overlap_pairs as (
  select a.team_id, a.id as hood_a, a.name as name_a, b.id as hood_b, b.name as name_b,
         round(o.m2::numeric, 2) as overlap_m2, o.problem
    from live a join live b
      on a.team_id = b.team_id and a.id < b.id
     and a.geom operator(gis.&&) b.geom          -- bbox prefilter; cannot fail
    cross join lateral pg_temp.overlap_m2(a.geom, b.geom) o
   where o.problem is not null or o.m2 > 1.0
),
-- ---------------------------------------------------------- 3. assignments
-- EVERY row: live, archived, tombstoned and split parents alike. Scalars
-- only leave this CTE; the array itself is read once by the normaliser and
-- once by the raw census, never carried along an exploded row.
hoods as (
  select t.team_id, t.id, t.name, t.created_at,
         case when t.deleted_at is not null then 'tombstoned'
              when t.archived then 'archived' else 'LIVE' end as state,
         jsonb_typeof(t.data) as data_type,
         case when jsonb_typeof(t.data) = 'object' then jsonb_typeof(t.data->'assignments') end   as asg_type,
         case when jsonb_typeof(t.data) = 'object' and jsonb_typeof(t.data->'assignments') = 'array'
              then jsonb_array_length(t.data->'assignments') else 0 end                          as raw_entries,
         case when jsonb_typeof(t.data) = 'object' then t.data->>'assignedTo' end                 as assigned_to,
         case when jsonb_typeof(t.data) = 'object' then t.data->>'createdAt' end                  as created_raw,
         case when jsonb_typeof(t.data) = 'object' then t.data->>'updatedAt' end                  as updated_raw,
         -- what Stage A will write for this row: the reader's answer
         pg_temp.legacy_to_entries(t.data, t.created_at, '{"entries": []}'::jsonb)               as norm
    from public.territories t
),
hoods2 as (
  select h.team_id, h.id, h.name, h.state, h.created_at, h.data_type, h.asg_type, h.raw_entries,
         h.assigned_to, h.created_raw, h.updated_raw, h.norm,
         h.data_type is distinct from 'object'                                                   as data_not_object,
         h.asg_type is not null and h.asg_type not in ('array', 'null')                          as asg_not_array,
         exists (select 1 from jsonb_array_elements(h.norm) e where e->>'synthesizedFrom' = 'assignedTo') as synthesized,
         h.created_raw is not null and pg_temp.ms(h.created_raw) is null                         as created_unreadable,
         h.created_raw is not null and pg_temp.ms(h.created_raw) is not null
           and pg_temp.ms(h.created_raw) <= 0                                                    as created_epoch,
         h.updated_raw is not null and pg_temp.ms(h.updated_raw) is null                         as updated_unreadable
    from hoods h
),
-- the raw elements, one small row each (the array is NOT carried along)
raw as (
  select h.team_id, h.id, h.name, h.state, h.created_at, x.ord,
         jsonb_typeof(x.entry) as entry_type,
         case when jsonb_typeof(x.entry) = 'object' then x.entry->>'userId' end       as uid_raw,
         case when jsonb_typeof(x.entry) = 'object' then x.entry->>'assignedAt' end   as at_raw,
         case when jsonb_typeof(x.entry) = 'object' then x.entry->>'unassignedAt' end as un_raw,
         case when jsonb_typeof(x.entry) = 'object' then x.entry->>'assignedBy' end   as by_raw
    from public.territories t
    join hoods h on h.team_id = t.team_id and h.id = t.id
    cross join lateral jsonb_array_elements(case when h.asg_type = 'array' then t.data->'assignments' else '[]'::jsonb end)
      with ordinality x(entry, ord)
),
raw2 as (
  select r.*,
         r.entry_type = 'object' and coalesce(btrim(r.uid_raw), '') <> ''                as kept,
         pg_temp.ms(r.at_raw) as at_ms, pg_temp.ms(r.un_raw) as un_ms,
         -- the assignedAt the reader will actually use for this entry
         greatest(coalesce(pg_temp.ms(r.at_raw),
                           case when r.created_at in ('infinity'::timestamptz, '-infinity'::timestamptz)
                                then (extract(epoch from now()) * 1000)::bigint
                                else (extract(epoch from r.created_at) * 1000)::bigint end), 1) as eff_at
    from raw r
),
-- the normalised entries, one small row each
norm as (
  select h.team_id, h.id, h.name, h.state,
         e->>'userId' as uid, (e->>'assignedAt')::bigint as at_ms,
         case when e->>'unassignedAt' is null then null else (e->>'unassignedAt')::bigint end as un_ms,
         e->>'unassignedAt' is null as is_open,
         e ? 'assignedAtRaw' or e ? 'unassignedAtRaw' or e ? 'assignedAtSynthesized' as ts_normalised,
         e ? 'closedByDedupe' as dedupe_closed,
         e->>'synthesizedFrom' = 'assignedTo' as synthesized,
         pg_temp.uid_uuid(e->>'userId') as uid_uuid,
         e->>'assignedBy' is null and coalesce(e->>'assignedByName', '') = '' as no_assigner
    from hoods h
    cross join lateral jsonb_array_elements(h.norm) e
),
resolved as (
  select n.*,
         n.uid_uuid is not null and exists (
           select 1 from public.profiles p where p.id = n.uid_uuid and p.team_id = n.team_id)   as resolves,
         n.uid_uuid is not null and exists (
           select 1 from public.profiles p where p.id = n.uid_uuid and p.team_id = n.team_id
              and coalesce(p.disabled, false))                                                   as disabled_profile
    from norm n
),
census as (
  select
    (select count(*) from hoods)                                                          as hoods,
    (select coalesce(sum(raw_entries), 0) from hoods)                                     as raw_entries,
    (select count(*) from raw2 where kept)                                                as kept,
    (select count(*) from raw2 where not kept)                                            as dropped_elements,
    (select count(*) from resolved)                                                       as ledger_entries,
    (select count(*) from resolved where is_open)                                         as open_entries,
    (select count(*) from resolved where synthesized)                                     as synthesized_from_assignedTo,
    (select count(*) from resolved where ts_normalised)                                   as timestamps_normalised,
    (select count(*) from resolved where dedupe_closed)                                   as dedupe_closed,
    (select count(*) from hoods2 where asg_not_array)                                     as assignments_not_array,
    (select count(*) from hoods2 where data_not_object)                                   as data_not_object,
    (select count(*) from hoods2 where updated_unreadable)                                as updatedAt_unreadable,
    (select count(*) from resolved where uid_uuid is null)                                as local_device_ids,
    (select count(*) from resolved where uid_uuid is not null and not resolves)           as foreign_or_missing_profile,
    (select count(*) from resolved where disabled_profile)                                as disabled_users,
    (select count(*) from resolved where no_assigner)                                     as missing_assignedBy
),
unresolved as (
  select team_id, id, name, state, uid, at_ms, is_open from resolved where not resolves
),
flip_blockers as (
  select count(distinct (team_id, id)) as live_hoods_with_unresolved_current
    from unresolved where state = 'LIVE' and is_open
),
first_open as (
  select team_id, id,
         (array_agg(uid order by at_ms, uid) filter (where is_open))[1] as ledger_says
    from resolved group by 1, 2
),
disagree as (
  select h.team_id, h.id, h.name, h.assigned_to as scalar_says, f.ledger_says
    from hoods2 h left join first_open f using (team_id, id)
   where coalesce(h.assigned_to, '') is distinct from coalesce(f.ledger_says, '')
),
dupes as (
  select r.team_id, r.id, r.name, r.uid, count(*) as open_in_raw
    from resolved r
   where dedupe_closed or (is_open and exists (
           select 1 from resolved d where d.team_id = r.team_id and d.id = r.id and d.uid = r.uid and d.dedupe_closed))
   group by 1, 2, 3, 4
),
-- every shape the reader NORMALISES, DROPS or cannot read at all
findings as (
  select team_id, id, name, id || ' / data' as key, 'BLOCKER' as kind,
         format('data is a JSON %s, not an object — 0010''s mirror write (jsonb_set) aborts on it', data_type) as detail
    from hoods2 where data_not_object
  union all
  select team_id, id, name, id || ' / assignments', 'review',
         format('assignments is a JSON %s, not an array — the reader treats it as no history array (%s) and the mirror OVERWRITES it',
                asg_type, case when synthesized then 'synthesizes the open entry from assignedTo' else 'no assignedTo to synthesize from' end)
    from hoods2 where asg_not_array
  union all
  select team_id, id, name, id || ' / createdAt', 'normalised',
         format('bare-scalar hood whose createdAt=%s is %s — the synthesized assignedAt falls back to the row''s own created_at%s',
                created_raw, case when created_unreadable then 'unreadable' else 'not after the epoch' end,
                case when created_epoch then ' (or 1)' else '' end)
    from hoods2 where synthesized and (created_unreadable or created_epoch)
  union all
  select team_id, id, name, id || ' / entry #' || ord, 'dropped',
         case when entry_type <> 'object' then format('element is a JSON %s, not an object — carries no assignment', entry_type)
              else 'entry has no userId — carries no assignment' end
    from raw2 where not kept
  union all
  select team_id, id, name, id || ' / entry #' || ord || ' assignedAt', 'normalised',
         case when at_raw is null then 'assignedAt missing — synthesized from the row''s created_at (assignedAtSynthesized)'
              when at_ms is null then format('assignedAt=%s is unreadable — synthesized from the row''s created_at, raw kept in assignedAtRaw', at_raw)
              else format('assignedAt=%s is not after the epoch — 1, raw kept in assignedAtRaw', at_raw) end
    from raw2 where kept and (at_raw is null or at_ms is null or at_ms <= 0)
  union all
  select team_id, id, name, id || ' / entry #' || ord || ' unassignedAt', 'normalised',
         case when un_ms is null then format('unassignedAt=%s is unreadable — CLOSED at its assignedAt, raw kept in unassignedAtRaw', un_raw)
              else format('unassignedAt=%s is before assignedAt=%s%s — clamped to assignedAt, raw kept in unassignedAtRaw',
                          un_raw, eff_at, case when at_ms is null then ' (synthesized)' else '' end) end
    from raw2 where kept and un_raw is not null and (un_ms is null or un_ms < eff_at)
  union all
  select team_id, id, name, id || ' / ' || uid || ' clock', 'normalised',
         'the row''s own created_at is at or before the epoch — the synthesized assignedAt is 1'
    from resolved where (synthesized or ts_normalised) and at_ms = 1
  union all
  select team_id, id, name, id || ' / ' || uid || ' dedupe', 'normalised',
         format('%s is OPEN %s times in the mirror — the last stays open, the others are closed at its assignedAt (closedByDedupe)', uid, open_in_raw)
    from dupes
  union all
  select team_id, id, name, id || ' / ' || uid || ' future', 'review',
         format('open entry assignedAt=%s is in the future (%s) — it can only close at or after that instant', at_ms,
                -- a bigint can exceed what a timestamp can hold; never format one that cannot be
                case when at_ms <= 253402300799000 then to_timestamp(at_ms / 1000.0)::date::text
                     else 'beyond the year 9999' end)
    from resolved where is_open and at_ms > (extract(epoch from now()) * 1000)::bigint + 86400000
),
stage_a as (
  select count(distinct (team_id, id)) filter (where kind = 'BLOCKER') as blocker_hoods,
         count(distinct (team_id, id)) filter (where kind <> 'BLOCKER') as review_hoods
    from findings
),
-- ---------------------------------------------------------- 4. do-not-knock
dnk as (
  select count(*)                                                                             as pins,
         count(*) filter (where p.disposition = 'dnk')                                        as scalar_dnk,
         count(*) filter (where p.data->'history' @> '[{"disposition":"dnk"}]'::jsonb)         as has_dnk_knock,
         count(*) filter (where p.disposition = 'dnk'
                            and not coalesce(p.data->'history' @> '[{"disposition":"dnk"}]'::jsonb, false))
                                                                                              as dnk_with_no_dateable_knock,
         count(*) filter (where p.deleted_at is not null and p.disposition = 'dnk')            as already_tombstoned_black,
         count(*) filter (where jsonb_typeof(p.data) is distinct from 'object')               as data_not_object,
         count(*) filter (where jsonb_typeof(p.data->'history') not in ('array', 'null'))     as history_not_array,
         count(*) filter (where exists (
           select 1 from jsonb_array_elements(case when jsonb_typeof(p.data->'history') = 'array'
                                                   then p.data->'history' else '[]'::jsonb end) h
            where h->>'ts' is not null and pg_temp.ms(h->>'ts') is null))                     as history_ts_unparseable
    from public.pins p
),
-- ------------------------------------------------------- 5. metric evidence
cust as (
  select count(*) filter (where not (jsonb_typeof(c.data->'pinId') = 'string' and coalesce(btrim(c.data->>'pinId'), '') <> ''))
                                                                                              as unlinked_customers,
         count(*) filter (where not (jsonb_typeof(c.data->'pinId') = 'string' and coalesce(btrim(c.data->>'pinId'), '') <> '')
                            and coalesce(c.data->'agreement'->>'signedAt', c.data->>'signedAt') is not null)
                                                                                              as unlinked_but_signed,
         count(*) filter (where jsonb_typeof(c.data) is distinct from 'object')               as data_not_object,
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
  -- the whole build line (GEOS, PROJ, libxml), so what the local proof ran
  -- on and what production runs on are recorded side by side
  union all select '0 env', 'postgis_full_version', gis.postgis_full_version()
    where exists (select 1 from env)

  union all select '1a geometry by state', state,
         format('hoods=%s usable=%s unusable_outline=%s invalid_geometry=%s no_outline_at_all=%s',
                hoods, usable, unusable_outline, invalid_geometry, no_outline_at_all)
    from geom_summary

  union all select '1b LIVE hoods to fix before 0016', id,
         format('team=%s name=%s corners=%s reason=%s', team_id, name, coalesce(n_points::text, '-'), reason)
    from bad_rings where state = 'LIVE'
  union all select '1b LIVE hoods to fix before 0016', '(none)', ''
    where not exists (select 1 from bad_rings where state = 'LIVE')

  union all select '1c archived/tombstoned hoods with an unusable outline (0009 stores NULL geom; cannot return to live turf until fixed)', id,
         format('team=%s state=%s name=%s corners=%s reason=%s', team_id, state, name, coalesce(n_points::text, '-'), reason)
    from bad_rings where state <> 'LIVE'
  union all select '1c archived/tombstoned hoods with an unusable outline (0009 stores NULL geom; cannot return to live turf until fixed)', '(none)', ''
    where not exists (select 1 from bad_rings where state <> 'LIVE')

  union all select '2 live pairs overlapping > 1.0 m² (block 0016)', hood_a || ' × ' || hood_b,
         case when problem is not null
              then format('BLOCKER team=%s %s × %s could not be measured: %s — 0016 refuses such a pair rather than admit it', team_id, name_a, name_b, problem)
              else format('team=%s %s × %s overlap_m2=%s', team_id, name_a, name_b, overlap_m2) end
    from overlap_pairs
  union all select '2 live pairs overlapping > 1.0 m² (block 0016)', '(none)', ''
    where not exists (select 1 from overlap_pairs)

  union all select '3a assignment census (ALL hoods, through the reader Stage A will use)', 'totals',
         format('hoods=%s raw_entries=%s kept=%s dropped_elements=%s ledger_entries=%s open=%s synthesized_from_assignedTo=%s timestamps_normalised=%s dedupe_closed=%s assignments_not_array=%s data_not_object=%s updatedAt_unreadable=%s local_device_ids=%s foreign_or_missing_profile=%s disabled_users=%s missing_assignedBy=%s',
                hoods, raw_entries, kept, dropped_elements, ledger_entries, open_entries, synthesized_from_assignedTo,
                timestamps_normalised, dedupe_closed, assignments_not_array, data_not_object, updatedAt_unreadable,
                local_device_ids, foreign_or_missing_profile, disabled_users, missing_assignedBy)
    from census

  union all select '3b entries that resolve to no rep (kept as history)', id || ' / ' || coalesce(uid, '?'),
         format('team=%s name=%s state=%s assignedAt=%s still_open=%s', team_id, name, state, at_ms, is_open)
    from unresolved
  union all select '3b entries that resolve to no rep (kept as history)', '(none)', ''
    where not exists (select 1 from unresolved)

  union all select '3c ACTIVATION BLOCKER: live hoods with unresolved CURRENT assignee', 'count',
         live_hoods_with_unresolved_current::text || ' (must be 0 before the flip; rally_config_guard refuses otherwise — the same test, through the same reader)'
    from flip_blockers

  union all select '3d scalar assignedTo disagrees with the ledger''s first open entry (0011 rewrites the scalar)', id,
         format('team=%s name=%s scalar=%s ledger=%s', team_id, name, scalar_says, ledger_says)
    from disagree
  union all select '3d scalar assignedTo disagrees with the ledger''s first open entry (0011 rewrites the scalar)', '(none)', ''
    where not exists (select 1 from disagree)

  union all select '3e DUPLICATE open entries for one rep (the reader keeps the last open, closes the rest)', id || ' / ' || uid,
         format('team=%s name=%s open_in_raw=%s', team_id, name, open_in_raw)
    from dupes
  union all select '3e DUPLICATE open entries for one rep (the reader keeps the last open, closes the rest)', '(none)', ''
    where not exists (select 1 from dupes)

  union all select '3f assignment data the reader NORMALISES, DROPS or cannot read (BLOCKER = 0010/0011 abort on it)', key,
         format('%s team=%s name=%s — %s', kind, team_id, name, detail)
    from findings
  union all select '3f assignment data the reader NORMALISES, DROPS or cannot read (BLOCKER = 0010/0011 abort on it)', '(none)', ''
    where not exists (select 1 from findings)

  union all select '4 do-not-knock census', 'totals',
         format('pins=%s scalar_dnk=%s has_dnk_knock=%s dnk_with_no_dateable_knock=%s already_tombstoned_black=%s data_not_object=%s history_not_array=%s history_ts_unparseable=%s',
                pins, scalar_dnk, has_dnk_knock, dnk_with_no_dateable_knock, already_tombstoned_black,
                data_not_object, history_not_array, history_ts_unparseable)
    from dnk

  union all select '5 customers that protect no door', 'totals',
         format('unlinked_customers=%s unlinked_but_signed=%s data_not_object=%s customers=%s',
                unlinked_customers, unlinked_but_signed, data_not_object, customers)
    from cust

  union all select 'Z verdict', 'Stage A (0009-0013)',
         case when not exists (select 1 from env) then 'BLOCKED — PostGIS missing'
              else format('%s hood(s) whose data is not a JSON object must be 0 (3f BLOCKER rows); %s hood(s) have assignment data the reader normalises or drops (3f) — review them, then approve; unusable outlines keep NULL geom',
                          blocker_hoods, review_hoods) end
    from stage_a
  union all select 'Z verdict', 'Stage C (0016 arming)',
         format('%s live hood(s) with unusable or invalid outline + %s overlapping pair(s) + %s unmeasurable pair(s) must be 0',
                (select count(*) from bad_rings where state = 'LIVE'),
                (select count(*) from overlap_pairs where problem is null),
                (select count(*) from overlap_pairs where problem is not null))
  union all select 'Z verdict', 'Activation flip',
         format('%s live hood(s) with an unresolved CURRENT assignee must be 0',
                (select live_hoods_with_unresolved_current from flip_blockers))
)
select section, key, detail
  from rows_
 order by section, key;
