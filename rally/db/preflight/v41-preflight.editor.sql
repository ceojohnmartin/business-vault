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
-- TOTAL OVER ARBITRARY LEGACY JSON. The polygon and data columns are jsonb,
-- and jsonb is not a contract. A row may hold an object where an array was
-- expected, a string where a number was, a JSON null, a timestamp that is a
-- sentence, a coordinate off the planet, a userId that is a device-local
-- string. Not one of those may abort this survey: each is returned as a
-- NAMED FINDING in the output, and the Stage A verdict counts the ones the
-- 0010/0011 legacy reader would abort on. The rules that make it total:
--   * no jsonb_array_elements / jsonb_array_length without a jsonb_typeof
--     guard in front of it;
--   * no ::uuid or ::bigint cast except inside a CASE whose condition is an
--     anchored regex proving the cast cannot fail (the CASE, not the AND,
--     is what PostgreSQL documents as forcing evaluation order);
--   * no geometry → geography cast except on rings the reader has already
--     proven finite and inside [-180,180] × [-90,90];
--   * the ring reader is a byte-identical twin of 0009's rally_ring_read —
--     total by construction, and db/test/preflight-test.sh proves both the
--     twin and the totality against every malformed fixture.
--
-- Writes no row and creates no durable object: the one helper lives in
-- pg_temp and dies with the session. It runs BEFORE 0009, so
-- territories.geom does not exist yet — geometry is built on the fly from
-- the stored polygon jsonb. PostGIS is addressed as `gis.` — the schema
-- decided at CUTOVER STEP 0A — and nothing here resolves through
-- search_path. Prerequisite: CUTOVER STEP 0A (PostGIS 3.3.7 in `gis`).

-- ---------------------------------------------------------- the ring reader
-- The twin of public.rally_ring_read (0009). Same body, same answers: geom
-- when the ring is usable, else problem says why. preflight-test.sh fails
-- if this and 0009's ever differ by more than the name.
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
    if jsonb_typeof(v_elem) <> 'array' or jsonb_array_length(v_elem) < 2 then
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
    v_g := gis.st_setsrid(gis.st_makepoint(v_x, v_y), 4326);
    -- TRANSFORM 2: drop a vertex identical to the one before it. A
    -- zero-length edge contributes nothing to the boundary.
    if v_prev is not null and gis.st_equals(v_prev, v_g) then
      continue;
    end if;
    v_pts := array_append(v_pts, v_g);
    v_prev := v_g;
  end loop;

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
         not (t.polygon is null or jsonb_typeof(t.polygon) = 'null'
              or (jsonb_typeof(t.polygon) = 'array' and jsonb_array_length(t.polygon) = 0)) as has_outline,
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
-- only rings the reader proved finite and in range, and PostGIS proved
-- valid, ever reach the geography cast below
live as (
  select team_id, id, name, geom from rings where state = 'LIVE' and usable
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
-- EVERY row: live, archived, tombstoned and split parents alike. Every
-- field is read through a type guard; nothing here can throw.
hoods as (
  select t.team_id, t.id, t.name,
         case when t.deleted_at is not null then 'tombstoned'
              when t.archived then 'archived' else 'LIVE' end as state,
         jsonb_typeof(t.data) as data_type,
         case when jsonb_typeof(t.data) = 'object' then t.data->'assignments' end                 as asg,
         case when jsonb_typeof(t.data) = 'object' then jsonb_typeof(t.data->'assignments') end   as asg_type,
         case when jsonb_typeof(t.data) = 'object' then t.data->>'assignedTo' end                 as assigned_to,
         case when jsonb_typeof(t.data) = 'object' then t.data->>'createdAt' end                  as created_raw,
         case when jsonb_typeof(t.data) = 'object' then t.data->>'updatedAt' end                  as updated_raw
    from public.territories t
),
hoods2 as (
  select h.*,
         -- the oldest v40 shape: a scalar assignee and no usable history array
         (h.asg_type is null or h.asg_type = 'null'
          or (h.asg_type = 'array' and jsonb_array_length(h.asg) = 0))
           and coalesce(h.assigned_to, '') <> ''                                    as bare_scalar,
         h.asg_type is not null and h.asg_type not in ('array', 'null')            as asg_not_array,
         h.data_type is distinct from 'object'                                     as data_not_object,
         h.created_raw is not null and h.created_raw !~ '^-?[0-9]{1,18}$'          as created_bad,
         h.updated_raw is not null and h.updated_raw !~ '^-?[0-9]{1,18}$'          as updated_bad
    from hoods h
),
ents as (
  select h.*, x.entry, x.ord
    from hoods2 h
    left join lateral jsonb_array_elements(case when h.asg_type = 'array' then h.asg else '[]'::jsonb end)
      with ordinality x(entry, ord) on true
),
cls as (
  select e.*,
         jsonb_typeof(e.entry) = 'object'                                             as entry_is_object,
         case when jsonb_typeof(e.entry) = 'object' then e.entry->>'userId' end       as uid,
         case when jsonb_typeof(e.entry) = 'object' then e.entry->>'assignedAt' end   as at_raw,
         case when jsonb_typeof(e.entry) = 'object' then e.entry->>'unassignedAt' end as un_raw,
         case when jsonb_typeof(e.entry) = 'object' then e.entry->>'assignedBy' end   as by_raw
    from ents e
),
cls2 as (
  select c.*,
         coalesce(c.uid ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$', false) as uuid_shaped,
         -- the CASE is the guard: the cast runs only when the regex has proven it cannot fail
         case when c.uid ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
              then c.uid::uuid end                                                    as uid_uuid,
         case when c.at_raw ~ '^-?[0-9]{1,18}$' then c.at_raw::bigint end             as at_ms,
         case when c.un_raw ~ '^-?[0-9]{1,18}$' then c.un_raw::bigint end             as un_ms,
         c.entry_is_object and c.un_raw is null                                       as is_open
    from cls c
),
resolved as (
  select c.*,
         c.uid_uuid is not null and exists (
           select 1 from public.profiles p
            where p.id = c.uid_uuid and p.team_id = c.team_id)                        as resolves,
         c.uid_uuid is not null and exists (
           select 1 from public.profiles p
            where p.id = c.uid_uuid and p.team_id = c.team_id
              and coalesce(p.disabled, false))                                        as disabled_profile
    from cls2 c
),
census as (
  select
    count(distinct (team_id, id))                                                        as hoods,
    count(entry)                                                                         as entries,
    count(entry) filter (where is_open)                                                  as open_entries,
    count(distinct (team_id, id)) filter (where bare_scalar)                             as bare_scalar_only,
    count(entry) filter (where not entry_is_object)                                      as entries_not_object,
    count(distinct (team_id, id)) filter (where asg_not_array)                           as assignments_not_array,
    count(distinct (team_id, id)) filter (where data_not_object)                         as data_not_object,
    count(entry) filter (where entry_is_object and coalesce(uid, '') = '')               as malformed_no_user,
    count(entry) filter (where entry_is_object and at_raw is null)                       as missing_assignedAt,
    count(entry) filter (where at_raw is not null and at_ms is null)                     as malformed_assignedAt,
    count(entry) filter (where un_raw is not null and un_ms is null)                     as malformed_unassignedAt,
    count(distinct (team_id, id)) filter (where bare_scalar and created_bad)             as malformed_createdAt,
    count(distinct (team_id, id)) filter (where updated_bad)                             as malformed_updatedAt,
    count(entry) filter (where entry_is_object and coalesce(by_raw, '') = '')            as missing_assignedBy,
    count(entry) filter (where coalesce(uid, '') <> '' and not uuid_shaped)              as local_device_ids,
    count(entry) filter (where uuid_shaped and not resolves)                             as foreign_or_missing_profile,
    count(entry) filter (where disabled_profile)                                         as disabled_users
    from resolved
),
unresolved as (
  select team_id, id, name, state, uid, at_raw, is_open
    from resolved
   where entry_is_object and coalesce(uid, '') <> '' and not resolves
),
flip_blockers as (
  select count(distinct (team_id, id)) as live_hoods_with_unresolved_current
    from unresolved where state = 'LIVE' and is_open
),
first_open as (
  select team_id, id,
         (array_agg(uid order by at_ms nulls last, uid)
            filter (where is_open and coalesce(uid, '') <> ''))[1] as ledger_says
    from resolved group by 1, 2
),
disagree as (
  select h.team_id, h.id, h.name, h.assigned_to as scalar_says, f.ledger_says
    from hoods2 h join first_open f using (team_id, id)
   where coalesce(h.assigned_to, '') is distinct from coalesce(f.ledger_says, '')
),
dupes as (
  select team_id, id, name, uid as rep, count(*) as open_entries
    from resolved
   where is_open and coalesce(uid, '') <> ''
   group by 1, 2, 3, 4 having count(*) > 1
),
-- every shape the 0010/0011 legacy reader would ABORT on (blocker), or
-- silently ignore / overwrite (review). Named per hood and per entry.
malformed as (
  select team_id, id, name, id || ' / data' as key,
         format('data is a JSON %s, not an object — 0010''s mirror write (jsonb_set) aborts on it', data_type) as detail,
         true as blocks
    from hoods2 where data_not_object
  union all
  select team_id, id, name, id || ' / assignments',
         format('assignments is a JSON %s, not an array — 0010 treats it as absent and its mirror OVERWRITES it', asg_type),
         false
    from hoods2 where asg_not_array
  union all
  select team_id, id, name, id || ' / createdAt',
         format('bare-scalar hood whose createdAt=%s is not an integer millisecond timestamp — 0010/0011 abort on it', created_raw),
         true
    from hoods2 where bare_scalar and created_bad
  union all
  select team_id, id, name, id || ' / entry #' || ord,
         format('entry is a JSON %s, not an object — 0010 skips it', jsonb_typeof(entry)),
         false
    from cls2 where entry is not null and not entry_is_object
  union all
  select team_id, id, name, id || ' / entry #' || ord || ' assignedAt',
         format('assignedAt=%s is not an integer millisecond timestamp — 0010/0011 abort on it', at_raw),
         true
    from cls2 where at_raw is not null and at_ms is null
  union all
  select team_id, id, name, id || ' / entry #' || ord || ' unassignedAt',
         format('unassignedAt=%s is not an integer millisecond timestamp — 0010/0011 abort on it', un_raw),
         true
    from cls2 where un_raw is not null and un_ms is null
),
stage_a as (
  select count(distinct (team_id, id)) filter (where blocks)     as blocker_hoods,
         count(distinct (team_id, id)) filter (where not blocks) as review_hoods
    from malformed
),
-- ---------------------------------------------------------- 4. do-not-knock
-- every read through a type guard; the legacy shapes 0013 is total over
-- (history not an array, data not an object, a knock ts that is a sentence)
-- are counted so the number is known rather than met in a dead-letter
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
         count(*) filter (where jsonb_typeof(p.data->'history') = 'array' and exists (
           select 1 from jsonb_array_elements(p.data->'history') h
            where h->>'ts' is not null and (h->>'ts') !~ '^-?[0-9]{1,18}$'))                  as history_ts_unparseable
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
         format('hoods=%s usable=%s unusable_outline=%s invalid_geometry=%s no_outline_at_all=%s',
                hoods, usable, unusable_outline, invalid_geometry, no_outline_at_all)
    from geom_summary

  union all select '1b LIVE hoods to fix before 0016', id,
         format('team=%s name=%s corners=%s reason=%s', team_id, name, coalesce(n_points::text, '-'), reason)
    from bad_rings where state = 'LIVE'
  union all select '1b LIVE hoods to fix before 0016', '(none)', ''
    where not exists (select 1 from bad_rings where state = 'LIVE')

  union all select '1c archived/tombstoned hoods with an unusable outline (0009 stores NULL geom; no block)', id,
         format('team=%s state=%s name=%s corners=%s reason=%s', team_id, state, name, coalesce(n_points::text, '-'), reason)
    from bad_rings where state <> 'LIVE'
  union all select '1c archived/tombstoned hoods with an unusable outline (0009 stores NULL geom; no block)', '(none)', ''
    where not exists (select 1 from bad_rings where state <> 'LIVE')

  union all select '2 live pairs overlapping > 1.0 m² (block 0016)', hood_a || ' × ' || hood_b,
         format('team=%s %s × %s overlap_m2=%s', team_id, name_a, name_b, overlap_m2)
    from overlap_pairs
  union all select '2 live pairs overlapping > 1.0 m² (block 0016)', '(none)', ''
    where not exists (select 1 from overlap_pairs)

  union all select '3a assignment census (ALL hoods)', 'totals',
         format('hoods=%s entries=%s open=%s bare_scalar_only=%s entries_not_object=%s assignments_not_array=%s data_not_object=%s malformed_no_user=%s missing_assignedAt=%s malformed_assignedAt=%s malformed_unassignedAt=%s malformed_createdAt=%s malformed_updatedAt=%s missing_assignedBy=%s local_device_ids=%s foreign_or_missing_profile=%s disabled_users=%s',
                hoods, entries, open_entries, bare_scalar_only, entries_not_object, assignments_not_array,
                data_not_object, malformed_no_user, missing_assignedAt, malformed_assignedAt,
                malformed_unassignedAt, malformed_createdAt, malformed_updatedAt, missing_assignedBy, local_device_ids,
                foreign_or_missing_profile, disabled_users)
    from census

  union all select '3b entries that resolve to no rep (kept as history)', id || ' / ' || coalesce(uid, '?'),
         format('team=%s name=%s state=%s assignedAt=%s still_open=%s', team_id, name, state, at_raw, is_open)
    from unresolved
  union all select '3b entries that resolve to no rep (kept as history)', '(none)', ''
    where not exists (select 1 from unresolved)

  union all select '3c ACTIVATION BLOCKER: live hoods with unresolved CURRENT assignee', 'count',
         live_hoods_with_unresolved_current::text || ' (must be 0 before the flip; rally_config_guard refuses otherwise)'
    from flip_blockers

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

  union all select '3f MALFORMED assignment data (BLOCKER = 0010/0011 abort on it; review = 0010 ignores or overwrites it)', key,
         format('%s team=%s name=%s — %s', case when blocks then 'BLOCKER' else 'review' end, team_id, name, detail)
    from malformed
  union all select '3f MALFORMED assignment data (BLOCKER = 0010/0011 abort on it; review = 0010 ignores or overwrites it)', '(none)', ''
    where not exists (select 1 from malformed)

  union all select '4 do-not-knock census', 'totals',
         format('pins=%s scalar_dnk=%s has_dnk_knock=%s dnk_with_no_dateable_knock=%s already_tombstoned_black=%s data_not_object=%s history_not_array=%s history_ts_unparseable=%s',
                pins, scalar_dnk, has_dnk_knock, dnk_with_no_dateable_knock, already_tombstoned_black,
                data_not_object, history_not_array, history_ts_unparseable)
    from dnk

  union all select '5 customers that protect no door', 'totals',
         format('unlinked_customers=%s unlinked_but_signed=%s customers=%s',
                unlinked_customers, unlinked_but_signed, customers)
    from cust

  union all select 'Z verdict', 'Stage A (0009-0013)',
         case when not exists (select 1 from env) then 'BLOCKED — PostGIS missing'
              else format('%s hood(s) whose assignment data would ABORT 0010/0011 must be 0 (3f BLOCKER rows); %s hood(s) carry assignment JSON 0010 would ignore or overwrite (3f review rows); unusable outlines keep NULL geom and duplicate opens are resolved by 0011 — review 1b/3e and approve',
                          blocker_hoods, review_hoods) end
    from stage_a
  union all select 'Z verdict', 'Stage C (0016 arming)',
         format('%s live hood(s) with unusable or invalid outline + %s overlapping pair(s) must be 0',
                (select count(*) from bad_rings where state = 'LIVE'), (select count(*) from overlap_pairs))
  union all select 'Z verdict', 'Activation flip',
         format('%s live hood(s) with an unresolved CURRENT assignee must be 0',
                (select live_hoods_with_unresolved_current from flip_blockers))
)
select section, key, detail
  from rows_
 order by section, key;
