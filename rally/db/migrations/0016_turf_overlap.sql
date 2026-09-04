-- RALLY v41 — STAGE C. The authoritative overlap invariant.
--
--     NO TWO ACTIVE HOODS MAY COMMIT WITH MORE THAN 1.0 m² OF INTERIOR
--     OVERLAP.
--
-- The tolerance is a FIXED ABSOLUTE, not a proportion. A relative term
-- would permit larger and larger absolute overlaps as hoods grow, which is
-- the opposite of the rule: 1 m² is a floor for tracing noise, and two
-- hoods sharing a street centreline measure 0.
--
-- WHY A DEFERRED CONSTRAINT TRIGGER, AND NOT A CHECK OR A BEFORE TRIGGER
--
--   A CHECK cannot see other rows.
--
--   A BEFORE trigger sees only COMMITTED rows, so two managers drawing
--   overlapping hoods at the same moment would both pass and both commit.
--   That race is the entire reason this exists.
--
--   Deferral is REQUIRED by Smart Split, not merely preferred: 0005
--   tombstones the parent and inserts the children in ONE transaction, and
--   mid-transaction the children overlap the still-live parent enormously.
--   Only the FINAL state — parent tombstoned, children live, children
--   sharing edges at 0 m² — is legal. A non-deferred check makes every
--   Smart Split fail.
--
-- Deferral fixes ordering WITHIN a transaction; it does nothing about two
-- concurrent ones, each checking against a snapshot that excludes the
-- other. So the check takes a TEAM-SCOPED transaction advisory lock first:
-- the second transaction blocks until the first commits, then re-runs its
-- check against the now-committed row and refuses. Same shape as 0005's
-- `for update` on the split parent, and scoped per team so two companies
-- never wait on each other.

-- ------------------------------------------------------------ measurement ---

/* The ONE overlap expression. The preflight, this constraint, and the
   tests all call this function — they cannot drift, because there is
   nothing to keep in step.

   Topology in `geometry` (planar, exact); the AREA of the result cast to
   `geography` for true square metres. ST_CollectionExtract(..., 3) keeps
   only the polygonal part, so a shared edge (a LINESTRING) and a corner
   touch (a POINT) both measure exactly 0 and are ALLOWED — adjacency is
   not collision. It is applied to a DERIVED intersection, never to stored
   turf: this is a measurement filter, not a repair. */
create or replace function public.rally_overlap_m2(
  a extensions.geometry, b extensions.geometry)
returns double precision
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when a is null or b is null then 0::double precision
    when not extensions.st_intersects(a, b) then 0::double precision
    else coalesce(extensions.st_area(
           extensions.st_collectionextract(extensions.st_intersection(a, b), 3)::extensions.geography),
         0::double precision)
  end
$$;

comment on function public.rally_overlap_m2(extensions.geometry, extensions.geometry) is
  'Interior overlap in square metres. Shared edges and point touches measure 0. The single definition used by the preflight, the constraint and the tests.';

create or replace function public.rally_overlap_tolerance_m2()
returns double precision
language sql immutable security invoker set search_path = ''
as $$ select 1.0::double precision $$;

-- -------------------------------------------------------------- the check ---

create or replace function public.assert_no_turf_overlap()
returns trigger
language plpgsql
security definer                    -- must see teammates' hoods to compare
set search_path = ''
as $$
declare
  v_other public.territories%rowtype;
  v_m2    double precision;
  v_tol   double precision := public.rally_overlap_tolerance_m2();
begin
  -- a tombstoned or archived hood is not active turf
  if new.deleted_at is not null or new.archived then return null; end if;

  /* A LIVE hood with an outline but no usable geometry is INVISIBLE to the
     index and would therefore never be compared against anything. Refusing
     it here closes the invariant whatever route the row took to get here —
     including one that slipped past 0009's derivation. A hood with no
     outline at all is a legal draft and is simply not turf yet. */
  if new.geom is null then
    if jsonb_array_length(coalesce(new.polygon, '[]'::jsonb)) > 0 then
      raise exception '% has an outline this map cannot use, so it cannot be made active turf',
        coalesce(nullif(new.name, ''), new.id) using errcode = '23514';
    end if;
    return null;
  end if;

  /* SERIALISE, per team. Without this, two concurrent transactions each
     check against a snapshot that does not contain the other and both
     commit — which deferral alone does not prevent. */
  perform pg_advisory_xact_lock(hashtext('rally_turf'), hashtext(new.team_id::text));

  select t.* into v_other
    from public.territories t
   where t.team_id = new.team_id
     and t.id <> new.id
     and t.deleted_at is null and t.archived = false     -- the LIVE predicate, literally
     and t.geom is not null
     and t.geom operator(extensions.&&) new.geom          -- bbox prefilter, GiST-usable
     and public.rally_overlap_m2(t.geom, new.geom) > v_tol
   order by public.rally_overlap_m2(t.geom, new.geom) desc
   limit 1;

  if found then
    v_m2 := public.rally_overlap_m2(v_other.geom, new.geom);
    raise exception '% overlaps % by % m² — hoods may share a boundary but not ground (limit % m²)',
      coalesce(nullif(new.name, ''), new.id),
      coalesce(nullif(v_other.name, ''), v_other.id),
      round(v_m2::numeric, 2), v_tol
      using errcode = '23514';
  end if;
  return null;
end $$;

-- ------------------------------------------------------------ arming gate ---

/* A live hood with a NULL geom is invisible to the GiST index and
   therefore UNPROTECTED — an invariant with silent holes is worse than a
   documented absence of one. The preflight enumerates these; they must be
   fixed before the constraint is armed. */
do $$
declare v_bad bigint;
begin
  select count(*) into v_bad from public.territories
   where deleted_at is null and archived = false and geom is null
     and jsonb_array_length(coalesce(polygon, '[]'::jsonb)) > 0;
  if v_bad > 0 then
    raise exception 'v41 overlap: % live hood(s) have an unusable outline and would be unprotected. Run db/preflight/v41-preflight.sql, fix them, then re-apply.', v_bad;
  end if;

  /* And no live pair may ALREADY overlap. The constraint is not
     retroactive, so arming over an existing collision would leave both
     hoods permanently unwritable — the next edit to either one, however
     unrelated, would be refused for a problem that predates the rule.
     The preflight lists every such pair. */
  select count(*) into v_bad from (
    select 1 from public.territories a join public.territories b
      on a.team_id = b.team_id and a.id < b.id
     where a.deleted_at is null and a.archived = false and a.geom is not null
       and b.deleted_at is null and b.archived = false and b.geom is not null
       and a.geom operator(extensions.&&) b.geom
       and public.rally_overlap_m2(a.geom, b.geom) > public.rally_overlap_tolerance_m2()) z;
  if v_bad > 0 then
    raise exception 'v41 overlap: % live pair(s) already overlap. Arming now would make both hoods of every pair unwritable. Run db/preflight/v41-preflight.sql, resolve them, then re-apply.', v_bad;
  end if;
end $$;

drop trigger if exists territories_no_overlap on public.territories;
create constraint trigger territories_no_overlap
  after insert or update on public.territories
  deferrable initially deferred
  for each row execute function public.assert_no_turf_overlap();
