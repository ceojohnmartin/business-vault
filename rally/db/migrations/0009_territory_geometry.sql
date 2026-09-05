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
-- than merely that it failed. A ring the reader cannot READ — a corner that
-- is not a pair, a coordinate that is not a number or is off the planet —
-- is refused the same way, with the corner named; it is never trimmed.
--
-- geometry(Polygon,4326) is the AUTHORITATIVE spatial column: construction,
-- validity, bbox && and intersection topology are all planar operations
-- with exact semantics. geography is used for exactly one thing, in 0015 —
-- measuring an intersection in square metres.
--
-- Additive. Reversible: drop the trigger, the index and the column.

alter table public.territories
  add column if not exists geom gis.geometry(Polygon, 4326);

comment on column public.territories.geom is
  'Derived from polygon jsonb by territories_derive_geom. Server-owned: no client grant. NULL means the stored ring is degenerate or invalid — see db/preflight/v41-preflight.sql.';

-- --------------------------------------------------------------- helpers ---

/* THE RING READER. One function, two answers: the geometry when the ring
   can be used, and otherwise WHY it cannot, in words a leader can act on.
   They are produced by the same loop, so they can never disagree.

   TOTAL OVER ARBITRARY JSON. The column is jsonb, and jsonb is not a
   contract: a legacy row may hold an object, a string, a number, a JSON
   null, corners that are not pairs, coordinates that are strings, or
   coordinates outside the planet. None of that may abort a write, a
   backfill, a constraint check or a survey. Every such ring is answered
   with problem <> null and geom = null, and the caller decides what that
   means (a refusal for a new write, a NULL geom for an existing row, a
   named finding for the preflight).

   NO REPAIR. An earlier draft skipped a corner it could not read and built
   the polygon from the rest. That is a repair — it changes the footprint
   the leader drew — so it is gone: a ring with an unreadable corner is
   unusable as a whole. The only transforms are still the three that cannot
   move a vertex: close the ring, drop a consecutive duplicate, force CCW.

   COORDINATE RANGE is checked here, before any geometry exists, because
   the geography cast in 0016's overlap measurement refuses latitudes
   outside [-90, 90] and would otherwise abort an unrelated neighbour's
   write. A JSON number is never NaN or infinite; a numeric too large for
   float8 fails the cast and lands in the exception arm below. */
create or replace function public.rally_ring_read(
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

comment on function public.rally_ring_read(jsonb) is
  'Total over any jsonb. geom when the ring is usable, else problem says why. Shape-preserving only: close ring, drop consecutive duplicates, force CCW. Never repairs.';

create or replace function public.rally_ring_to_geom(p_ring jsonb)
returns gis.geometry
language sql immutable security invoker set search_path = ''
as $$ select (public.rally_ring_read(p_ring)).geom $$;

create or replace function public.rally_ring_problem(p_ring jsonb)
returns text
language sql immutable security invoker set search_path = ''
as $$ select (public.rally_ring_read(p_ring)).problem $$;

comment on function public.rally_ring_to_geom(jsonb) is
  'Shape-preserving only: close ring, drop consecutive duplicates, force CCW. Never repairs. NULL when rally_ring_problem() has something to say.';

-- ------------------------------------------------------------- the trigger ---

/* Derive geom on every write, and REFUSE an unusable or invalid new outline.

   The refusal is deliberately asymmetric with the do-not-knock trigger in
   0013, which neutralises rather than refuses. The difference is that an
   invalid polygon has NO correct interpretation the server could
   substitute, whereas a do-not-knock override has exactly one. Where there
   is a right answer, apply it; where there is not, say so — and say WHAT,
   because "invalid" is not something a leader can act on. */
create or replace function public.territories_derive_geom()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_geom    gis.geometry;
  v_problem text;
  v_reason  text;
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
    if new.geom is not null and not gis.st_isvalid(new.geom) then
      new.geom := null;
    end if;
    return new;
  end if;

  select r.geom, r.problem into v_geom, v_problem from public.rally_ring_read(new.polygon) r;

  if v_geom is null then
    -- An EXISTING row whose ring was already unusable keeps its NULL and
    -- is surfaced by the preflight instead of blocking every unrelated
    -- write to it. A row arriving with a NEW unusable ring is refused.
    if tg_op = 'UPDATE' and old.polygon is not distinct from new.polygon
       and old.deleted_at is not distinct from new.deleted_at
       and old.archived is not distinct from new.archived then
      new.geom := null;
      return new;
    end if;
    if v_problem is null then
      new.geom := null;              -- a hood with no outline yet is legal
      return new;
    end if;
    raise exception 'turf: %', v_problem
      using errcode = '22023';
  end if;

  if not gis.st_isvalid(v_geom) then
    v_reason := gis.st_isvalidreason(v_geom);
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
