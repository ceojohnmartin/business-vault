-- RALLY v41 — STAGE A part 1. Turf geometry.
--
-- A leader's polygon is the record of a decision about who works which
-- streets. NOTHING HERE MAY CHANGE THE FOOTPRINT THEY DREW. There is no
-- ST_MakeValid, no ST_Buffer, no ST_SnapToGrid, no ST_Simplify, no
-- clipping and no lobe removal anywhere in this migration or any other:
-- silently redrawing someone's turf is precisely the failure the whole
-- turf invariant exists to prevent, and a repair that "usually" preserves
-- the shape is still a repair.
--
-- Exactly three transforms are allowed, because each provably cannot move
-- a vertex or change an enclosed area:
--   1. closing an unclosed ring   (RALLY stores rings OPEN)
--   2. dropping a vertex identical to the one before it
--   3. reversing vertex order to force CCW
--
-- Anything still invalid after those is REFUSED, with ST_IsValidReason in
-- the message so the leader is told what is wrong with the outline rather
-- than merely that it failed.
--
-- geometry(Polygon,4326) is the AUTHORITATIVE spatial column: construction,
-- validity, bbox && and intersection topology are all planar operations
-- with exact semantics. geography is used for exactly one thing, in 0015 —
-- measuring an intersection in square metres.
--
-- Additive. Reversible: drop the trigger, the index and the column.

alter table public.territories
  add column if not exists geom extensions.geometry(Polygon, 4326);

comment on column public.territories.geom is
  'Derived from polygon jsonb by territories_derive_geom. Server-owned: no client grant. NULL means the stored ring is degenerate or invalid — see db/preflight/v41-preflight.sql.';

-- --------------------------------------------------------------- helpers ---

/* The ring, normalized by the three shape-preserving transforms only.
   Returns NULL when fewer than 3 distinct corners survive — a caller
   decides whether that is a refusal (a new write) or a NULL geom (an
   existing row the backfill must not fail on). */
create or replace function public.rally_ring_to_geom(p_ring jsonb)
returns extensions.geometry
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_pts   extensions.geometry[] := '{}';
  v_elem  jsonb;
  v_x     double precision;
  v_y     double precision;
  v_prev  extensions.geometry;
  v_g     extensions.geometry;
  v_n     int;
begin
  if p_ring is null or jsonb_typeof(p_ring) <> 'array' then return null; end if;

  for v_elem in select value from jsonb_array_elements(p_ring) loop
    if jsonb_typeof(v_elem) <> 'array' or jsonb_array_length(v_elem) < 2 then
      continue;
    end if;
    begin
      v_x := (v_elem->>0)::double precision;
      v_y := (v_elem->>1)::double precision;
    exception when others then
      continue;
    end;
    if v_x is null or v_y is null
       or v_x <> v_x or v_y <> v_y            -- NaN
       or v_x = 'Infinity'::double precision or v_x = '-Infinity'::double precision
       or v_y = 'Infinity'::double precision or v_y = '-Infinity'::double precision then
      continue;
    end if;
    v_g := extensions.st_setsrid(extensions.st_makepoint(v_x, v_y), 4326);
    -- TRANSFORM 2: drop a vertex identical to the one before it. A
    -- zero-length edge contributes nothing to the boundary.
    if v_prev is not null and extensions.st_equals(v_prev, v_g) then
      continue;
    end if;
    v_pts := array_append(v_pts, v_g);
    v_prev := v_g;
  end loop;

  -- a ring stored closed: drop the repeat, since TRANSFORM 1 re-adds it
  v_n := coalesce(array_length(v_pts, 1), 0);
  while v_n > 1 and extensions.st_equals(v_pts[1], v_pts[v_n]) loop
    v_pts := v_pts[1 : v_n - 1];
    v_n := v_n - 1;
  end loop;

  if v_n < 3 then return null; end if;

  -- TRANSFORM 1: close the ring.  TRANSFORM 3: force CCW.
  v_pts := array_append(v_pts, v_pts[1]);
  return extensions.st_forcepolygonccw(
           extensions.st_setsrid(
             extensions.st_makepolygon(extensions.st_makeline(v_pts)), 4326));
exception when others then
  return null;
end $$;

comment on function public.rally_ring_to_geom(jsonb) is
  'Shape-preserving only: close ring, drop consecutive duplicates, force CCW. Never repairs.';

-- ------------------------------------------------------------- the trigger ---

/* Derive geom on every write, and REFUSE an invalid new outline.

   The refusal is deliberately asymmetric with the do-not-knock trigger in
   0012, which neutralises rather than refuses. The difference is that an
   invalid polygon has NO correct interpretation the server could
   substitute, whereas a do-not-knock override has exactly one. Where there
   is a right answer, apply it; where there is not, say so. */
create or replace function public.territories_derive_geom()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_geom   extensions.geometry;
  v_reason text;
begin
  -- a tombstoned hood is not somewhere anyone is sent to work; its outline
  -- is history and is left exactly as it is. Becoming live again is a
  -- different question, and is answered by the liveness test below.
  if new.deleted_at is not null then
    /* Stored only when it is VALID, so the invariant "geom is never an
       invalid geometry" holds on every row in the table rather than only on
       the live ones. A tombstoned hood with a broken outline keeps NULL,
       is enumerated by the preflight, and cannot be un-deleted back into
       live turf without fixing the ring. */
    new.geom := public.rally_ring_to_geom(new.polygon);
    if new.geom is not null and not extensions.st_isvalid(new.geom) then
      new.geom := null;
    end if;
    return new;
  end if;

  v_geom := public.rally_ring_to_geom(new.polygon);

  if v_geom is null then
    -- An EXISTING row whose ring was already degenerate keeps its NULL and
    -- is surfaced by the preflight instead of blocking every unrelated
    -- write to it. A row arriving with a NEW degenerate ring is refused.
    if tg_op = 'UPDATE' and old.polygon is not distinct from new.polygon
       and old.deleted_at is not distinct from new.deleted_at
       and old.archived is not distinct from new.archived then
      new.geom := null;
      return new;
    end if;
    if new.polygon is null or jsonb_array_length(coalesce(new.polygon, '[]'::jsonb)) = 0 then
      new.geom := null;              -- a hood with no outline yet is legal
      return new;
    end if;
    raise exception 'turf: a hood needs at least 3 distinct corners'
      using errcode = '22023';
  end if;

  if not extensions.st_isvalid(v_geom) then
    v_reason := extensions.st_isvalidreason(v_geom);
    /* An existing invalid row keeps its NULL geom rather than becoming
       unwritable — the preflight enumerates it and 0016 refuses to arm
       while any live hood still has one.

       The escape is granted ONLY while the row's liveness is unchanged. A
       hood inserted tombstoned with a bad ring and then un-deleted would
       otherwise walk straight through both checks and go live with a NULL
       geom: invisible to the GiST index, and therefore never compared
       against anything. That is a hole in the overlap invariant, opened by
       two ordinary writes. */
    if tg_op = 'UPDATE' and old.polygon is not distinct from new.polygon
       and old.deleted_at is not distinct from new.deleted_at
       and old.archived is not distinct from new.archived then
      new.geom := null;
      return new;
    end if;
    raise exception 'turf: the outline crosses itself or is otherwise invalid (%). Move a corner so the boundary never doubles back through itself.', v_reason
      using errcode = '22023';
  end if;

  new.geom := v_geom;
  return new;
end $$;

drop trigger if exists territories_derive_geom on public.territories;
create trigger territories_derive_geom
  before insert or update on public.territories
  for each row execute function public.territories_derive_geom();

-- ------------------------------------------------------------- the index ---

/* The LIVE predicate, in its ONE form.

   `archived` is `not null default false` (0001), so `archived = false` is
   total two-valued logic and can never silently exclude a row; deleted_at
   IS NULL is a proper NULL test. Every query that wants this index must
   repeat the predicate LITERALLY — `not archived` is semantically equal but
   is not reliably recognised by the planner as implying it, and the query
   then falls back to a sequential scan. */
create index if not exists territories_geom_live_gist
  on public.territories using gist (geom)
  where deleted_at is null and archived = false;

-- ----------------------------------------------------------- the backfill ---
-- Touches only `geom`. Every existing ring is either derivable (geom set)
-- or is not (geom NULL, enumerated by the preflight). No ring is edited.
update public.territories set polygon = polygon where geom is null;
