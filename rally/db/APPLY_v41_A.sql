-- RALLY v41 — STAGE A. APPLY 0008 (its one pending line) + 0009 → 0010 → 0011
-- → 0012 → 0013 AS ONE TRANSACTION.
--
-- Paste this WHOLE file into the Supabase SQL editor and run it ONCE, after:
--   * CUTOVER STEP 0A — PostGIS 3.3.7 in schema `gis` (done 2026-09-05);
--   * db/preflight/v41-preflight.editor.sql read CLEAN: Stage A 0 blockers,
--     0 to review; Stage C 0 + 0 + 0 (done 2026-09-06, after Hood 2 and
--     Hood 6 A were archived and redrawn in the app);
--   * the owner's explicit approval of Stage A.
--
-- What it does, in order. Every body below is the VERBATIM migration file:
--   0008  `create schema` / `create extension` are no-ops on production (0A
--         did them). The ONE live line is
--             grant usage on schema gis to authenticated;
--         so the client role can resolve gis.geometry in 0009's trigger.
--   0009  territories.geom, the shape-preserving ring reader, the derive
--         trigger, the partial GiST index; geom is derived for every row
--         (an outline PostGIS calls invalid keeps NULL geom — the two
--         archived originals of Hood 2 and Hood 6 A).
--   0010  the assignment ledger (assignees, assignees_rev, open_assignees,
--         cycle_started_at), rally_config with the flag FALSE — v40 legacy
--         authority stays exactly as it is — rally_capabilities(), the
--         total readers, the assignment trigger, the activation guard.
--   0011  the lossless backfill, with its five proofs as ASSERTIONS: a
--         failing proof raises, and the whole transaction rolls back.
--   0012  column privileges on territories: the nine columns a client
--         writes, and none of the server-owned ones (proven by probe inside
--         the file).
--   0013  do-not-knock authority on pins and events. Version-blind: it
--         protects v40 phones too.
--
-- What it does NOT do: no 0014/0015 (Stage B), no 0016 (Stage C), no flip of
-- assignment_server_authoritative, no client publish, no merge to main.
--
-- Transactional: all or nothing. db/test/stage-a-test.sh proves it on a real
-- database with a deliberately broken copy, proves a second run changes no
-- ledger entry and no mirror, and proves db/ROLLBACK_v41_A.sql returns the
-- schema and grants to their v40 state. Run it once: the backfill's row
-- UPDATE stamps updated_at on every territory, so a repeat costs one more
-- pull wave for nothing.
--
-- Expect ONE pull wave: 0011 rewrites data.assignedTo / data.assignments as
-- mirrors of the ledger on every territory row, so every phone pulls every
-- hood once. Where the row already agreed with its ledger the content is
-- unchanged.
--
-- MAINTENANCE WINDOW: no territory administration (assign, draw, split,
-- archive) while this runs. Knocking may continue. Row locks are held on
-- territories for the seconds the backfill takes.
--
-- Regenerate with db/build-apply.sh if any migration changes.

begin;

-- ============================ 0008_postgis_extension.sql ============================
-- RALLY v41 — STAGE 0. PostGIS, and nothing else.
--
-- This file deliberately touches NO RALLY object: no column, no index, no
-- function, no row. It exists on its own because the read-only preflight
-- that decides whether any of the rest may run is itself written in PostGIS
-- predicates — it measures existing overlaps and tests existing polygons for
-- validity — so the extension has to exist BEFORE the survey that gates the
-- migration. Running the survey first was impossible, which is the ordering
-- defect this split fixes.
--
-- THE SCHEMA IS `gis`, CHOSEN DELIBERATELY. Not `public`, not `extensions`,
-- and not whatever a platform default happens to be. It was decided at
-- CUTOVER STEP 0 (2026-09-05) after a read-only survey of the live project:
-- PostGIS was absent, `gis` did not exist, `extensions` existed as the
-- platform's own namespace. A dedicated schema keeps PostGIS's ~900 objects
-- out of the RALLY namespace and out of the platform's, and — because
-- PostGIS is NOT relocatable (extrelocatable = false) — the choice is
-- one-way: there is no ALTER EXTENSION ... SET SCHEMA later.
--
-- Every later file qualifies its PostGIS references as `gis.` BY HAND,
-- because those files run with `search_path = ''` and resolve nothing
-- implicitly. If the discovery query below ever reports a different schema,
-- stop and fix the files, never the path.
--
--   select e.extname, n.nspname as postgis_schema, e.extversion,
--          r.rolname as extension_owner, e.extrelocatable
--     from pg_extension e
--     join pg_namespace n on n.oid = e.extnamespace
--     join pg_roles     r on r.oid = e.extowner
--    where e.extname = 'postgis';
--
-- PRODUCTION STATE. The schema and the extension were installed by CUTOVER
-- STEP 0A on 2026-09-05 — PostGIS 3.3.7 in `gis`, extension owner
-- supabase_admin, schema owner postgres, verified read-only afterwards
-- (876 extension objects, 0 outside gis, every v41 object count in public
-- still 0). The two CREATE statements below are therefore no-ops there. The
-- USAGE grant is the ONE line of this file still pending for production; it
-- belongs to the Stage A gate, not to Stage 0.
--
-- Purely additive and reversible while nothing depends on it:
--     drop extension postgis; drop schema gis;

create schema if not exists gis;
create extension if not exists postgis with schema gis;

-- `authenticated` needs to RESOLVE the geometry type and the PostGIS
-- functions once 0009 adds the column: its SECURITY INVOKER trigger runs as
-- the client role on every territory upsert and names gis.* by hand. This
-- grants the right to NAME things in the schema; it grants no table, no
-- data, and no CREATE. Nothing in gis is exposed through PostgREST, whose
-- schema list does not include it.
grant usage on schema gis to authenticated;

-- ============================ 0009_territory_geometry.sql ============================
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
  /* THE ROW THIS WRITE IS ABOUT. On an UPDATE that is OLD. On the INSERT
     arm of a PostgREST upsert — INSERT ... ON CONFLICT (team_id, id) DO
     UPDATE, which is how EVERY client write arrives — this trigger fires on
     the proposed row BEFORE the conflict is detected, with tg_op = 'INSERT'
     and no OLD, even though the hood already exists. The existing row is
     looked up by key so the escapes below judge the write by what is
     already stored, exactly as the UPDATE arm does; the UPDATE arm then
     runs too, with the real OLD. (SECURITY INVOKER + table-wide SELECT +
     0003's team policy: a leader sees their own team's row.) */
  v_prior_polygon    jsonb;
  v_prior_live       boolean;
  v_prior_exists     boolean := false;
  /* The escape for an EXISTING broken ring is granted only while the row is
     not BECOMING live. Archiving or tombstoning a broken hood takes it out
     of turf and is allowed with the ring untouched; un-archiving or
     un-deleting it back INTO live turf is refused until the ring is fixed —
     otherwise a hood could walk into the overlap invariant with a NULL geom
     the index never sees. */
  v_becoming_live    boolean;
  v_ring_unchanged   boolean;
begin
  if tg_op = 'UPDATE' then
    v_prior_exists  := true;
    v_prior_polygon := old.polygon;
    v_prior_live    := old.deleted_at is null and not old.archived;
  else
    select t.polygon, (t.deleted_at is null and not t.archived)
      into v_prior_polygon, v_prior_live
      from public.territories t
     where t.team_id = new.team_id and t.id = new.id;
    v_prior_exists := found;
  end if;
  v_ring_unchanged := v_prior_exists and v_prior_polygon is not distinct from new.polygon;
  v_becoming_live  := v_prior_exists
    and (new.deleted_at is null and not new.archived)
    and not v_prior_live;
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
    if v_ring_unchanged and not v_becoming_live then
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
       two ordinary writes. Retiring the hood (archive, tombstone) is the
       opposite direction and is always allowed. */
    if v_ring_unchanged and not v_becoming_live then
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
/* GRANTS. Supabase's project defaults (`alter default privileges in schema
   public grant all on functions to postgres, anon, authenticated,
   service_role`) hand EXECUTE on every new public function to anon at
   creation, and `revoke ... from public` does not touch that explicit
   entry — 0005 learned this. The reader is called INSIDE the SECURITY
   INVOKER trigger as the writing client (authenticated), so authenticated
   keeps EXECUTE; anon never writes turf and gets none. */
revoke all on function public.rally_ring_read(jsonb)        from public, anon;
revoke all on function public.rally_ring_to_geom(jsonb)     from public, anon;
revoke all on function public.rally_ring_problem(jsonb)     from public, anon;
revoke all on function public.territories_derive_geom()     from public, anon, authenticated;

create index if not exists territories_geom_live_gist
  on public.territories using gist (geom)
  where deleted_at is null and archived = false;

-- ----------------------------------------------------------- the backfill ---
-- Touches only `geom`. Every existing ring is either derivable (geom set)
-- or is not (geom NULL, enumerated by the preflight). No ring is edited.
update public.territories set polygon = polygon where geom is null;

-- ============================ 0010_territory_assignment.sql ============================
-- RALLY v41 — STAGE A part 2. Multi-assignee assignment, as a LEDGER.
--
-- ONE HOOD MAY HAVE SEVERAL CURRENT REPS. Assignment truth is therefore a
-- SET, never a scalar: `territories.assignees` is the ledger, and the v40
-- fields `data.assignedTo` (scalar) and `data.assignments` (array) become
-- DERIVED MIRRORS this file's trigger maintains. A phone that has not
-- upgraded keeps reading exactly what it read before; it simply cannot see
-- the second and later reps, which is a display limit, not data loss.
--
-- THE MIXED-VERSION WINDOW IS CLOSED BY CONSTRUCTION, not by timing. Every
-- write passes this trigger, the trigger reads the activation flag inside
-- the same transaction as the row write, and BOTH branches leave the ledger
-- and the mirrors in agreement before the row lands. There is no
-- interleaving in which a row is left disagreeing — so a v40 client's
-- upsert and a v41 client's RPC can arrive in any order, from any device,
-- during the flip itself, and the row is still correct afterwards.
--
-- Additive: the flag defaults to FALSE, so applying this file changes no
-- behaviour. Reversible: drop the columns and `data` still holds every
-- assignment, which is what makes the backfill lossless.

alter table public.territories
  add column if not exists assignees        jsonb   not null default '{"entries": []}'::jsonb,
  add column if not exists assignees_rev    bigint  not null default 0,
  add column if not exists open_assignees   uuid[]  not null default '{}',
  add column if not exists cycle_started_at timestamptz;

comment on column public.territories.assignees is
  'ASSIGNMENT TRUTH. {entries:[{userId,name,assignedBy,assignedByName,assignedAt,unassignedAt,inheritedFromTerritoryId,viaSplit}]}. Server-owned: no client grant. Open entry = unassignedAt is null.';
comment on column public.territories.assignees_rev is
  'Monotone counter bumped whenever assignees changes. The client merges the ledger only on a HIGHER rev, which makes a replayed page harmless.';
comment on column public.territories.open_assignees is
  'Derived index mirror of the CURRENT assignees, validated profile uuids only. A set, never a scalar.';
comment on column public.territories.cycle_started_at is
  'Clear Outcomes boundary. Monotone forward. NULL = first cycle = all history in the window (NOT the hood created_at: a split child postdates the knocks it inherits).';

create index if not exists territories_open_assignees_gin
  on public.territories using gin (open_assignees)
  where deleted_at is null and archived = false;

-- ------------------------------------------------------- activation state ---

create table if not exists public.rally_config (
  id                              boolean primary key default true,
  assignment_server_authoritative boolean not null default false,
  updated_at                      timestamptz not null default now(),
  constraint rally_config_singleton check (id)
);
insert into public.rally_config (id) values (true) on conflict (id) do nothing;

alter table public.rally_config enable row level security;
-- readable through rally_capabilities() only; no direct client grant at all
revoke all on public.rally_config from anon, authenticated;

/* What the server tells a client it owns. Clients LATCH a true and never
   accept a later false — false is the more permissive state (the one where
   the client may still author assignment truth), so a downgrade would be a
   privilege escalation rather than a harmless staleness. */
/* Every answer here is DISCOVERED, never asserted.

   `turfRpc` says whether the v41 turf functions EXIST, and it must, because
   they arrive two stages after this file: 0014 and 0015. A hardcoded true
   would tell a client to call smart_split_territory_v41 during Stage A —
   before it exists — and every Smart Split in the company would 404 until
   Stage B landed. Reporting what is actually installed makes the staged
   order safe in both directions: clients keep using the certified 0005 RPC
   until the v41 one is really there, and switch the moment it is. */
create or replace function public.rally_capabilities()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'assignmentServerAuthoritative',
      coalesce((select assignment_server_authoritative from public.rally_config where id), false),
    'turfRpc',
      to_regprocedure('public.smart_split_territory_v41(text,text,jsonb)') is not null
      and to_regprocedure('public.set_territory_assignments(text,uuid[],text)') is not null,
    'postgis',
      exists (select 1 from pg_extension where extname = 'postgis')
  )
$$;

-- 0005's form: Supabase's default function privileges give anon an
-- EXPLICIT execute entry at creation, which `from public` leaves in place
revoke all on function public.rally_capabilities() from public, anon;
grant execute on function public.rally_capabilities() to authenticated;

-- ------------------------------------------------------ the total readers ---

/* THREE SMALL FUNCTIONS THAT CANNOT FAIL, and that every reader of client
   JSON goes through. jsonb is not a contract: a timestamp may be a
   sentence, a userId may be a device-local string or an upper-case uuid,
   and none of that may abort a write, a backfill, a guard or a survey.

   rally_ms      — a millisecond timestamp from text, or NULL. Accepts
                   exactly what bigint's own input accepts (surrounding
                   whitespace, a leading sign, up to 19 digits inside the
                   bigint range) and nothing else; never raises.
   rally_uid     — a userId in canonical form: a uuid-shaped id is
                   lower-cased (uuids are case-insensitive by definition, so
                   this is a spelling, not a change of identity); anything
                   else is kept verbatim as unresolved history.
   rally_uid_uuid — the uuid of a canonical id, or NULL — the ONLY way a
                   userId is ever cast. The regex is the strict 8-4-4-4-12
                   form, so the cast inside the CASE cannot fail, and CASE
                   is what PostgreSQL documents as forcing evaluation order
                   (an AND is not: the planner may hoist the cast into an
                   index condition ahead of the test). */
create or replace function public.rally_ms(p text)
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

create or replace function public.rally_uid(p text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case when p ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
              then lower(p) else p end
$$;

create or replace function public.rally_uid_uuid(p text)
returns uuid
language sql
immutable
security invoker
set search_path = ''
as $$
  select case when p ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
              then lower(p)::uuid end
$$;

-- --------------------------------------------------------- ledger helpers ---

/* The canonical order: assignedAt, then userId. The tiebreak is not
   decoration — two reps assigned by ONE action share a millisecond, and
   without it "the first open assignee" (which becomes data.assignedTo)
   would differ between the server and each device, and the v40 mirror would
   flap on every sync. */
create or replace function public.rally_sort_entries(p_entries jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  /* The third key makes the order TOTAL. Two entries of one rep may share
     an assignedAt — a duplicate the reader closed at the very instant it
     opened (closedByDedupe) sits beside the survivor — and PostgreSQL's
     sort is not stable, so without it the ledger's byte order could differ
     from one write to the next for no reason. Open first, then by close. */
  select coalesce(jsonb_agg(e order by (e->>'assignedAt')::bigint, e->>'userId',
                                     (e->>'unassignedAt')::bigint nulls first), '[]'::jsonb)
    from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) e
$$;

create or replace function public.rally_open_entries(p_assignees jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(e order by (e->>'assignedAt')::bigint, e->>'userId'), '[]'::jsonb)
    from jsonb_array_elements(coalesce(p_assignees->'entries', '[]'::jsonb)) e
   where e->>'unassignedAt' is null
$$;

create or replace function public.rally_first_open_assignee(p_assignees jsonb)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select public.rally_open_entries(p_assignees)->0->>'userId'
$$;

-- the uuid[] mirror: VALIDATED current profile ids only. An unresolved
-- legacy id stays in the ledger forever but is not a uuid and so cannot
-- appear here — history is never destroyed to make an index work.
create or replace function public.rally_open_uuids(p_assignees jsonb, p_team uuid)
returns uuid[]
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(array_agg(distinct p.id), '{}'::uuid[])
    from jsonb_array_elements(public.rally_open_entries(p_assignees)) e
    join public.profiles p on p.id = public.rally_uid_uuid(e->>'userId')
   where p.team_id = p_team
$$;

/* Rebuild the two v40 mirrors from the ledger. `assignedBy` is rendered as
   a NAME because that is what v40 puts on screen — handing it a uuid would
   show a raw id in the assignment history of every phone that has not
   upgraded. */
create or replace function public.rally_mirror_assignments(p_assignees jsonb)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(
      jsonb_build_object(
        'userId',       e->>'userId',
        'name',         coalesce(nullif(e->>'name', ''), pu.name, ''),
        'assignedBy',   coalesce(nullif(e->>'assignedByName', ''), pb.name, ''),
        'assignedAt',   coalesce((e->>'assignedAt')::bigint, 0),
        'unassignedAt', case when e->>'unassignedAt' is null
                             then null else (e->>'unassignedAt')::bigint end)
      order by (e->>'assignedAt')::bigint, e->>'userId'), '[]'::jsonb)
    from jsonb_array_elements(coalesce(p_assignees->'entries', '[]'::jsonb)) e
    left join public.profiles pu on pu.id = public.rally_uid_uuid(e->>'userId')
    left join public.profiles pb on pb.id = public.rally_uid_uuid(e->>'assignedBy')
$$;

-- --------------------------------------------------------- the invariants ---

/* I1..I5, enforced against OLD so no client of any version can rewrite
   assignment history:
     I1  at most ONE open entry per userId
     I2  every entry has a userId and assignedAt > 0
     I3  unassignedAt >= assignedAt
     I4  a CLOSED entry may never be deleted, altered or reopened; the only
         legal transition is unassignedAt: null -> a timestamp
     I5  entries are stored sorted (assignedAt, userId)
   I4 is what makes this a system of record rather than a state field. */
create or replace function public.rally_assert_ledger(p_old jsonb, p_new jsonb)
returns void
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_e   jsonb;
  v_o   jsonb;
  v_n   int;
begin
  -- the loop variables are v_-prefixed on purpose: a bare `e` shadows the
  -- `e` alias in the aggregate below and plpgsql reports it as ambiguous
  for v_e in select value from jsonb_array_elements(coalesce(p_new->'entries', '[]'::jsonb)) loop
    if coalesce(v_e->>'userId', '') = '' then
      raise exception 'assignment: an entry with no userId' using errcode = '22023';
    end if;
    if coalesce((v_e->>'assignedAt')::bigint, 0) <= 0 then
      raise exception 'assignment: entry for % has no assignedAt', v_e->>'userId' using errcode = '22023';
    end if;
    if v_e->>'unassignedAt' is not null
       and (v_e->>'unassignedAt')::bigint < (v_e->>'assignedAt')::bigint then
      raise exception 'assignment: entry for % ends before it starts', v_e->>'userId' using errcode = '22023';
    end if;
  end loop;

  select count(*) into v_n
    from (select e->>'userId' u
            from jsonb_array_elements(coalesce(p_new->'entries', '[]'::jsonb)) e
           where e->>'unassignedAt' is null
           group by 1 having count(*) > 1) d;
  if v_n > 0 then
    raise exception 'assignment: % rep(s) hold more than one open entry', v_n using errcode = '22023';
  end if;

  -- I4: every entry the OLD ledger had closed must survive, unchanged
  for v_o in select value from jsonb_array_elements(coalesce(p_old->'entries', '[]'::jsonb)) loop
    if v_o->>'unassignedAt' is null then continue; end if;
    if not exists (
      select 1 from jsonb_array_elements(coalesce(p_new->'entries', '[]'::jsonb)) n
       where n->>'userId' = v_o->>'userId'
         and n->>'assignedAt' = v_o->>'assignedAt'
         and n->>'unassignedAt' = v_o->>'unassignedAt') then
      raise exception 'assignment: closed history for % (assigned %) may not be deleted or altered',
        v_o->>'userId', v_o->>'assignedAt' using errcode = '42501';
    end if;
  end loop;
end $$;



/* Every CLOSED entry the row already had, carried forward. Matched on the
   FULL closed triple (userId, assignedAt, unassignedAt) — exactly what I4
   will look for — so an entry the client's mirror never knew about
   survives, and one it does know about is not duplicated.

   Matching on (userId, assignedAt) alone was a hole: a derived entry with
   that identity but a DIFFERENT close state counted as "already present",
   the closed run was not carried forward, and I4 then refused the row.
   rally_merge_provenance below no longer produces such an entry, and this
   function no longer trusts that it cannot. */
create or replace function public.rally_keep_closed_history(p_derived jsonb, p_prior jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select coalesce(p_derived, '[]'::jsonb) || coalesce((
    select jsonb_agg(o)
      from jsonb_array_elements(coalesce(p_prior->'entries', '[]'::jsonb)) o
     where o->>'unassignedAt' is not null
       and not exists (
         select 1 from jsonb_array_elements(coalesce(p_derived, '[]'::jsonb)) d
          where d->>'userId' = o->>'userId'
            and d->>'assignedAt' = o->>'assignedAt'
            and d->>'unassignedAt' = o->>'unassignedAt')), '[]'::jsonb)
$$;

/* Keep the v41 provenance a v40 mirror cannot express.

   data.assignments carries five fields. An entry may also hold
   inheritedFromTerritoryId, viaSplit, viaOperation, an assignedBy uuid and
   userIdResolved — none of which survive a round trip through the mirror.
   So a legacy-derived entry is matched to the one already on the row by
   (userId, assignedAt) and inherits its extra keys, while the legacy copy
   still decides open versus closed. Without this, one upsert from an
   un-upgraded phone would quietly erase the record of which split a rep's
   assignment came from. */
create or replace function public.rally_merge_provenance(p_derived jsonb, p_prior jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  /* The legacy mirror owns exactly two fields — who, and whether the run is
     still open — so only those two are overlaid onto the prior entry.
     Merging the whole derived object would let its NULL assignedBy (v40
     writes a name there, not a uuid) clobber the real uuid the ledger
     holds, quietly erasing who made every assignment on the first upsert
     from an un-upgraded phone. */
  /* CLOSED STAYS CLOSED. A run the ledger has already closed is history,
     and history is immutable (I4). A mirror that still shows that run as
     open is simply STALE — a phone that pulled before the unassign, or has
     been offline since — and stale is not an instruction to reopen. Were
     the mirror allowed to win here, the reopened entry would fail I4 and
     the row would be refused: a rename from a phone that had not pulled
     for an hour would dead-letter, permanently, for every hood that had
     ever changed hands. So the prior's unassignedAt is kept whenever it is
     set; the mirror may only decide the open/closed state of a run the
     ledger still holds OPEN. Reassigning that rep later is a NEW entry
     with a new assignedAt, exactly as the client already writes it. */
  /* (userId, assignedAt) is NOT unique. A rep may hold two entries at one
     instant: the survivor of a duplicate open, and the copy the reader
     closed at that same instant (closedByDedupe). Matching the derived
     entry to "any prior with that key" would pair BOTH derived entries
     with the same prior — and depending on which one the sort happened to
     put first, either the dedupe tag is lost or the open run is closed by
     a stale phone that touched nothing. So each side is ranked within its
     (userId, assignedAt) group — open first, then by close — and the n-th
     derived entry pairs with the n-th prior entry, once. */
  with d as (
    select t.e, t.ord,
           row_number() over (partition by t.e->>'userId', t.e->>'assignedAt'
                              order by (t.e->>'unassignedAt' is null) desc,
                                       public.rally_ms(t.e->>'unassignedAt'), t.ord) as rn
      from jsonb_array_elements(coalesce(p_derived, '[]'::jsonb)) with ordinality t(e, ord)
  ),
  pr as (
    select t.e,
           row_number() over (partition by t.e->>'userId', t.e->>'assignedAt'
                              order by (t.e->>'unassignedAt' is null) desc,
                                       public.rally_ms(t.e->>'unassignedAt'), t.ord) as rn
      from jsonb_array_elements(coalesce(p_prior->'entries', '[]'::jsonb)) with ordinality t(e, ord)
  )
  select coalesce(jsonb_agg(
           case when pr.e is null then d.e
                else pr.e || jsonb_build_object(
                       'name', d.e->'name',
                       'unassignedAt', case when pr.e->>'unassignedAt' is not null
                                            then pr.e->'unassignedAt'
                                            else coalesce(d.e->'unassignedAt', 'null'::jsonb) end) end
           order by d.ord), '[]'::jsonb)
    from d
    left join pr on pr.e->>'userId' = d.e->>'userId'
                and pr.e->>'assignedAt' = d.e->>'assignedAt'
                and pr.rn = d.rn
$$;

-- ------------------------------------------------------------- the trigger ---

/* Both branches leave the ledger and the mirrors in agreement, which is
   what makes the activation atomic (see the header). The flag is read
   inside this trigger, inside the same transaction as the row write. */
create or replace function public.territories_assignment()
returns trigger
language plpgsql
security invoker                       -- see v_via_rpc below: this matters
set search_path = ''
as $$
declare
  v_auth      boolean;
  v_via_rpc   boolean;
  v_entries   jsonb;
  v_old       jsonb := coalesce(case when tg_op = 'UPDATE' then old.assignees end, '{"entries": []}'::jsonb);
  v_now_ms    bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_incoming  bigint;
  -- WHAT THE CLIENT SENT, captured before anything below rewrites it. The
  -- correction stamp must compare against this, not against OLD: a client
  -- that tried to reassign a hood and was overruled ends up with the row's
  -- PREVIOUS mirror, which is identical to OLD and would look like no
  -- correction at all.
  v_sent_a    jsonb := case when tg_op = 'UPDATE' then new.data->'assignments' end;
  v_sent_to   jsonb := case when tg_op = 'UPDATE' then new.data->'assignedTo' end;
begin
  v_auth := coalesce((public.rally_capabilities()->>'assignmentServerAuthoritative')::boolean, false);

  /* WHO IS ALLOWED TO MOVE THE LEDGER — an UNSPOOFABLE test.

     A client's write arrives through PostgREST as the role `authenticated`.
     A SECURITY DEFINER RPC runs as the function's OWNER, and no client can
     become that owner. So `current_user` separates "an ordinary upsert,
     from any client of any version" from "a call that went through
     set_territory_assignments or smart_split_territory".

     This is why the trigger is SECURITY INVOKER. Were it DEFINER,
     current_user would be the trigger's own owner on every path and the
     distinction would vanish. It reads the activation flag through the
     SECURITY DEFINER rally_capabilities() instead, so rally_config stays
     unreadable to clients.

     Deliberately NOT a GUC and NOT a flag in the JSON payload: both are
     things a request can carry, and an authorization test a request can
     carry is not an authorization test. */
  v_via_rpc := current_user <> 'authenticated';

  if v_via_rpc and (case when tg_op = 'INSERT'
                         then coalesce(new.assignees->'entries', '[]'::jsonb) <> '[]'::jsonb
                         else new.assignees is distinct from old.assignees end) then
    /* AN AUTHORITATIVE OPERATION THAT SUPPLIED A LEDGER.
       set_territory_assignments, save_territory and the split inheritance
       have already written the ledger they mean, having derived every
       timestamp and every transition themselves. It stands whatever the
       flag says — the flag governs whether a CLIENT UPSERT may move the
       ledger, not whether the server may.

       The "supplied a ledger" half matters as much as the privilege half.
       Without it, ANY write from outside PostgREST — a migration fixture,
       an admin repairing a row in the SQL editor, a dashboard edit —
       would count as authoritative and its data.assignments would be
       silently ignored, dropping the assignment it was carrying. A write
       that says nothing about the ledger is not an assignment decision,
       whoever makes it, and falls through to the derivation below. */
    new.assignees := coalesce(new.assignees, '{"entries": []}'::jsonb);
  elsif tg_op = 'INSERT' or not v_auth then
    /* A BRAND-NEW HOOD TAKES THE WRITER'S ASSIGNMENT, UNDER EITHER FLAG.

       There is no server ledger to protect on a row that does not exist
       yet, and refusing the payload would silently drop the assignee from
       every hood created by a client. Recreating a hood to smuggle an
       assignment past the flag is not available: a tombstoned hood keeps
       its id, so writing to it is an UPDATE and the ledger is protected;
       a genuinely new id has no history to protect.

       THIS ALSO FIXES A TRAP IN THE UPSERT ITSELF. PostgreSQL fires BEFORE
       INSERT triggers on the PROPOSED row before it detects the conflict,
       and `excluded` is what those triggers left behind — so an INSERT arm
       that rewrites data.assignments hands the DO UPDATE arm a mangled
       payload. The row still ended up correct (the UPDATE arm rebuilds from
       old.assignees), but the correction stamp below then saw a difference
       on EVERY upsert and bumped the clock, which is exactly the re-push
       loop it is written to avoid. Deriving on INSERT keeps `excluded`
       faithful to what the client actually sent.

       Under LEGACY authority the same derivation is the whole rule: a
       client upsert's data.assignments is truth and the ledger follows it,
       which is what keeps a v40 client — and a v41 client that has not yet
       seen the activation — fully correct.

       MERGED with the ledger already on the row, so the v41 provenance a
       legacy mirror cannot carry (inheritedFromTerritoryId, viaSplit,
       viaOperation, the assignedBy uuid, userIdResolved) survives an upsert
       from a phone that has never heard of any of it. */
    v_entries := public.rally_legacy_to_entries(new.data, new.created_at, coalesce(v_old, '{"entries": []}'::jsonb));
    /* UNION with the closed history already on the row, never replace it.

       A client's mirror is only as complete as the last copy it pulled. A
       phone that has been offline pushes a mirror missing whatever closed
       entries it never saw — and a derivation that simply replaced the
       ledger would drop them, which I4 then correctly refuses with 42501.
       That refusal is permanent: the row dead-letters, and it dead-letters
       again on every retry, for a client that did nothing wrong.

       So closed history is additive here. The mirror decides who is OPEN;
       it is not allowed to decide what happened. */
    new.assignees := jsonb_build_object('entries',
      public.rally_sort_entries(
        public.rally_keep_closed_history(
          public.rally_merge_provenance(v_entries, v_old), v_old)));
  else
    /* SERVER AUTHORITY: the ledger is truth. A client-sent data.assignments
       or data.assignedTo is IGNORED — not refused, ignored, so a v40 phone's
       upsert still commits its name/outline/door-count edits — and the
       mirrors are rewritten from the ledger below. */
    if new.assignees is distinct from old.assignees then
      -- an ordinary upsert cannot move the ledger, whatever it sent
      new.assignees := old.assignees;
    end if;
  end if;

  new.assignees := jsonb_build_object(
    'entries', public.rally_sort_entries(coalesce(new.assignees->'entries', '[]'::jsonb)));
  perform public.rally_assert_ledger(v_old, new.assignees);

  if tg_op = 'INSERT' or new.assignees is distinct from old.assignees then
    new.assignees_rev := coalesce(case when tg_op = 'UPDATE' then old.assignees_rev end, 0) + 1;
  else
    new.assignees_rev := old.assignees_rev;
  end if;

  new.open_assignees := public.rally_open_uuids(new.assignees, new.team_id);

  -- the two v40 mirrors, always rebuilt from the ledger
  new.data := jsonb_set(coalesce(new.data, '{}'::jsonb), '{assignments}',
                        public.rally_mirror_assignments(new.assignees));
  new.data := jsonb_set(new.data, '{assignedTo}',
                        coalesce(to_jsonb(public.rally_first_open_assignee(new.assignees)), 'null'::jsonb));

  /* THE AUTHORITATIVE-CORRECTION STAMP.

     A client's record clock (data.updatedAt) is what its merge engine
     compares; an unchanged clock reads as "same" and the correction is
     DISCARDED. So when this trigger overrode something the client sent, the
     row goes back with a clock strictly above the incoming one and the
     client accepts it.

     Applied ONLY on a real correction. Stamping unconditionally would make
     every echo look newer to a device whose clock runs behind, and that
     device would re-push it forever. */
  if (v_auth or v_via_rpc) and tg_op = 'UPDATE'
     and (new.data->'assignments' is distinct from v_sent_a
          or new.data->'assignedTo' is distinct from v_sent_to) then
    -- data.updatedAt is client JSON: cast it only once an anchored regex
    -- has proven the cast cannot fail; anything else reads as 0
    v_incoming := coalesce(public.rally_ms(new.data->>'updatedAt'), 0);
    new.data := jsonb_set(new.data, '{updatedAt}',
                          to_jsonb(greatest(v_now_ms, v_incoming + 1)));
  end if;

  return new;
end $$;

/* Read a v40 hood's assignment mirrors back into ledger shape. The SAME
   reconstruction the client performs (js/store.js legacyEntries) and the
   same one the backfill in 0011 uses — which is what lets a client and a
   server that have not yet met agree about who is assigned.

   Closed history already in the ledger is carried forward: the legacy
   mirror only ever holds what the writing client knew. */
/* THE LEGACY READER IS THE NORMALISER. It turns whatever a v40 mirror (or
   a hand-edited row, or a restore) holds into a ledger that satisfies
   I1..I3 BY CONSTRUCTION, so that neither the backfill nor a client
   upsert can ever be refused for the shape of history nobody chose:

     - an element that is not an object, or has no usable userId, carries
       no assignment and is dropped (the survey lists it first);
     - userId is canonical (rally_uid): uuid-shaped ids lower-cased, any
       other id kept verbatim as unresolved history;
     - assignedAt: parsed by rally_ms; missing or unreadable → the row's
       own created_at (tagged assignedAtSynthesized / assignedAtRaw so
       nothing is silently rewritten); never <= 0 (→ 1);
     - unassignedAt: absent → OPEN; present but unreadable → CLOSED at
       assignedAt (a v40 client reads any non-null value as closed; the raw
       value is kept in unassignedAtRaw); earlier than assignedAt → clamped
       to assignedAt, raw kept;
     - the row's created_at fallback is total too: an infinite or pre-epoch
       clock reads as 1;
     - I1: one OPEN entry per rep — the LAST one in the mirror's order
       survives, the others are closed at the survivor's assignedAt (never
       before their own), tagged closedByDedupe.

   Every rewrite keeps the raw value beside it. History is never deleted to
   make an invariant hold; it is made readable and marked. */
create or replace function public.rally_legacy_to_entries(p_data jsonb, p_created timestamptz, p_prior jsonb)
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
      v_at := coalesce(public.rally_ms(p_data->>'createdAt'), v_created_ms);
      if v_at <= 0 then v_at := 1; end if;
      return jsonb_build_array(jsonb_build_object(
        'userId', public.rally_uid(p_data->>'assignedTo'), 'name', '',
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
    v_at := coalesce(public.rally_ms(v_raw_at), v_created_ms);
    if v_at <= 0 then v_at := 1; end if;
    v_un := case when v_raw_un is null then null
                 else coalesce(public.rally_ms(v_raw_un), v_at) end;
    if v_un is not null and v_un < v_at then v_un := v_at; end if;
    v_by := e->>'assignedBy';
    v_e := jsonb_build_object(
      'userId', public.rally_uid(v_uid),
      'name', coalesce(e->>'name', ''),
      -- v40 wrote a display NAME here; a uuid is kept as the assigner's id
      'assignedBy', case when public.rally_uid_uuid(v_by) is not null then public.rally_uid(v_by) end,
      'assignedByName', case when public.rally_uid_uuid(v_by) is not null then '' else coalesce(v_by, '') end,
      'assignedAt', v_at,
      'unassignedAt', v_un);
    if v_raw_at is null then
      v_e := v_e || jsonb_build_object('assignedAtSynthesized', true);
    elsif public.rally_ms(v_raw_at) is distinct from v_at then
      v_e := v_e || jsonb_build_object('assignedAtRaw', e->'assignedAt');
    end if;
    if v_raw_un is not null and public.rally_ms(v_raw_un) is distinct from v_un then
      v_e := v_e || jsonb_build_object('unassignedAtRaw', e->'unassignedAt');
    end if;
    v_out := v_out || v_e;
  end loop;
  return public.rally_close_duplicate_opens(v_out);
end $$;

/* I1 BY CONSTRUCTION. One OPEN entry per rep: the last one in the array
   survives; every earlier open entry for the same rep is closed at the
   survivor's assignedAt — never before its own, so I3 still holds — and
   tagged closedByDedupe. Nothing is deleted. Operates on NORMALISED entries
   (bigint timestamps, canonical ids). */
create or replace function public.rally_close_duplicate_opens(p_entries jsonb)
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

drop trigger if exists territories_assignment on public.territories;
create trigger territories_assignment
  before insert or update on public.territories
  for each row execute function public.territories_assignment();

-- --------------------------------------------------- the activation gate ---

/* SERVER AUTHORITY MAY NOT BE SWITCHED ON OVER AN UNRESOLVED CURRENT
   ASSIGNMENT.

   `open_assignees` is uuid[], so an entry naming a rep who cannot be
   resolved to a profile on this team CANNOT appear in it. For HISTORY that
   is exactly right — a closed entry is a fact about who worked a hood and
   is kept verbatim forever, resolvable or not. For a LIVE hood's CURRENT
   assignee it is not: the moment clients start trusting the server's
   ledger, that hood reads as one nobody works, and a rep loses their turf
   to a data problem nobody looked at.

   The preflight ENUMERATES these. This makes it a RULE rather than a
   report, because a report can be skipped and this cannot. */
create or replace function public.rally_unresolved_live_assignments()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from public.territories t
   where t.deleted_at is null and t.archived = false
     and exists (
       /* the ledger once it exists; before the backfill, the v40 mirror
          read through THE SAME normaliser the backfill will use — so a
          bare-scalar hood's synthesized assignee counts, and a device-local
          id is a text that never reaches a cast */
       select 1 from jsonb_array_elements(
           case when jsonb_array_length(coalesce(t.assignees->'entries', '[]'::jsonb)) > 0
                then t.assignees->'entries'
                else public.rally_legacy_to_entries(t.data, t.created_at, '{"entries": []}'::jsonb) end) e
        where e->>'unassignedAt' is null
          and coalesce(e->>'userId', '') <> ''
          and not exists (
            select 1 from public.profiles p
             where p.id = public.rally_uid_uuid(e->>'userId')
               and p.team_id = t.team_id))
$$;

comment on function public.rally_unresolved_live_assignments() is
  'Live hoods whose CURRENT assignee resolves to no rep on their team. Must be 0 before assignment_server_authoritative may be turned on.';

create or replace function public.rally_config_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_bad bigint;
begin
  if new.assignment_server_authoritative
     and (tg_op = 'INSERT' or not coalesce(old.assignment_server_authoritative, false)) then
    v_bad := public.rally_unresolved_live_assignments();
    if v_bad > 0 then
      raise exception 'v41: % live hood(s) still name a CURRENT assignee that is no rep on their team. Run db/preflight/v41-preflight.sql, fix them, then activate.', v_bad
        using errcode = '23514';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

/* GRANTS. Every function above is created under Supabase's default
   function privileges (EXECUTE to anon, authenticated, service_role). The
   readers and the ledger helpers are called INSIDE the SECURITY INVOKER
   assignment trigger as the writing client, so authenticated keeps EXECUTE
   on them; anon never writes and gets none. The two that must not be
   client-callable at all: the guard's counter (SECURITY DEFINER, reads
   every team) and the trigger functions themselves. */
revoke all on function public.rally_ms(text)                                        from public, anon;
revoke all on function public.rally_uid(text)                                       from public, anon;
revoke all on function public.rally_uid_uuid(text)                                  from public, anon;
revoke all on function public.rally_sort_entries(jsonb)                             from public, anon;
revoke all on function public.rally_open_entries(jsonb)                             from public, anon;
revoke all on function public.rally_first_open_assignee(jsonb)                      from public, anon;
revoke all on function public.rally_open_uuids(jsonb, uuid)                         from public, anon;
revoke all on function public.rally_mirror_assignments(jsonb)                       from public, anon;
revoke all on function public.rally_assert_ledger(jsonb, jsonb)                     from public, anon;
revoke all on function public.rally_keep_closed_history(jsonb, jsonb)               from public, anon;
revoke all on function public.rally_merge_provenance(jsonb, jsonb)                  from public, anon;
revoke all on function public.rally_legacy_to_entries(jsonb, timestamptz, jsonb)    from public, anon;
revoke all on function public.rally_close_duplicate_opens(jsonb)                    from public, anon;
revoke all on function public.territories_assignment()                              from public, anon, authenticated;
revoke all on function public.rally_unresolved_live_assignments()                   from public, anon, authenticated;
revoke all on function public.rally_config_guard()                                  from public, anon, authenticated;

drop trigger if exists rally_config_guard on public.rally_config;
create trigger rally_config_guard
  before insert or update on public.rally_config
  for each row execute function public.rally_config_guard();

-- ============================ 0011_assignment_backfill.sql ============================
-- RALLY v41 — STAGE A part 3. The lossless assignment-history backfill.
--
-- SCOPE IS EVERY ROW. Live, archived, tombstoned and Smart Split parents
-- alike: history is indefinite, a split tombstones its parent (0005), and
-- an archived hood's assignment record is part of the historical record.
-- Filtering to live hoods would quietly discard the past.
--
-- NOTHING IS EVER DROPPED. An entry naming a rep who cannot be resolved
-- today — a device-local id that leaked through the client's
-- `toProfile(...) || localId` fallback, a profile since deleted, a
-- cross-team artifact from a restore — is a historical fact about who
-- worked that hood. It is kept verbatim and tagged `userIdResolved: false`
-- so it can be counted, not deleted so an index looks tidy. The uuid[]
-- mirror simply cannot hold it, which is the mirror's problem, not the
-- ledger's.
--
-- ONE READER. The ledger is built by public.rally_legacy_to_entries — the
-- same normaliser the assignment trigger applies to every client upsert and
-- the preflight applies to every row it surveys — so what the survey showed
-- the operator is exactly what this file writes. That reader is TOTAL over
-- legacy JSON and produces a ledger that satisfies I1..I3 by construction:
-- an unreadable timestamp is synthesised and tagged with its raw value, a
-- run that "ends before it starts" is clamped and tagged, a rep open twice
-- keeps the last entry open and the others closed (tagged closedByDedupe),
-- and an element that carries no assignment at all (not an object, no
-- userId) is dropped — the preflight lists those first. So this file can
-- no longer abort on the shape of history nobody chose; it can only abort
-- on its own PROOFS, which is what the proofs are for.
--
-- `data` is not modified except for the two mirrors the trigger owns, and
-- the assertions below prove it byte for byte.

do $$
declare
  v_before_entries   bigint;
  v_after_entries    bigint;
  v_synth            bigint;
  v_bad              bigint;
  v_unresolved       bigint;
begin
  -- ------------------------------------------------------------ snapshot ---
  /* data.assignments is CLIENT JSON. A legacy row may hold an object, a
     string, a number or a JSON null there; the reader treats every
     non-array as "no history array" (and synthesizes from assignedTo when
     there is one), so the snapshot reads it the same way. */
  create temporary table _v41_before on commit drop as
    select team_id, id, created_at,
           /* the entries the READER will keep: objects with a usable userId.
              A non-object element or an entry with no userId carries no
              assignment and is dropped by rally_legacy_to_entries; counting
              it here would make PROOF 1 fail on the row the preflight
              already listed. */
           (select count(*)
              from jsonb_array_elements(case when jsonb_typeof(data->'assignments') = 'array'
                                             then data->'assignments' else '[]'::jsonb end) e
             where jsonb_typeof(e) = 'object' and coalesce(btrim(e->>'userId'), '') <> '') as n_entries,
           coalesce(data->>'assignedTo', '')          as assigned_to,
           /* what the reader makes of this row BEFORE anything is written:
              the yardstick for PROOFs 2-4 */
           public.rally_legacy_to_entries(data, created_at, '{"entries": []}'::jsonb) as norm,
           /* `updatedAt` is excluded on purpose. The assignment trigger's
              correction stamp moves the record clock whenever it rewrites a
              mirror — which is exactly what this backfill makes it do — so
              hashing it would make the reversibility assertion abort on
              every real dataset while proving nothing about loss. What must
              be byte-identical is the CONTENT outside the two mirrors. */
           md5((data - 'assignedTo' - 'assignments' - 'updatedAt')::text) as rest_md5,
           /* the reader's own definition of the oldest shape: no usable
              history array, and a scalar assignee to synthesize from */
           ((case when jsonb_typeof(data->'assignments') = 'array'
                   then jsonb_array_length(data->'assignments') else 0 end) = 0
            and jsonb_typeof(data) = 'object'
            and coalesce(btrim(data->>'assignedTo'), '') <> '')  as bare_scalar
      from public.territories;

  select coalesce(sum(n_entries), 0) into v_before_entries from _v41_before;
  select count(*) filter (where bare_scalar) into v_synth from _v41_before;

  -- ------------------------------------------------------------ backfill ---
  -- The ledger is built by the SAME reader the trigger and the preflight
  -- use, so a device that has never met this server already agrees, and a
  -- survey the operator reviewed is what gets written.
  update public.territories t
     set assignees = jsonb_build_object('entries',
           public.rally_sort_entries(
             public.rally_legacy_to_entries(t.data, t.created_at, t.assignees)))
   where jsonb_array_length(coalesce(t.assignees->'entries', '[]'::jsonb)) = 0;

  -- Tag what could not be resolved. Kept, never removed.
  update public.territories t
     set assignees = jsonb_build_object('entries', (
           select coalesce(jsonb_agg(
             case when p.id is not null then e - 'userIdResolved'
                  else jsonb_set(e, '{userIdResolved}', 'false'::jsonb) end
             order by (e->>'assignedAt')::bigint, e->>'userId'), '[]'::jsonb)
             from jsonb_array_elements(t.assignees->'entries') e
             left join public.profiles p
               on p.id = public.rally_uid_uuid(e->>'userId')
              and p.team_id = t.team_id))
   where jsonb_array_length(coalesce(t.assignees->'entries', '[]'::jsonb)) > 0;

  -- rebuild the derived mirrors for every row, through the same code the
  -- trigger uses (this UPDATE fires it)
  update public.territories set assignees = assignees;

  -- ------------------------------------------------------------- PROOF 1 ---
  -- every entry the reader keeps is in the ledger, plus exactly the
  -- synthesized entries the survey named. Stated with its correction term,
  -- because plain equality is false. Elements the reader drops (not an
  -- object, no userId) are on neither side — the preflight lists them.
  select coalesce(sum(jsonb_array_length(coalesce(assignees->'entries', '[]'::jsonb))), 0)
    into v_after_entries from public.territories;
  if v_after_entries <> v_before_entries + v_synth then
    raise exception 'v41 backfill PROOF 1 failed: % entries before + % synthesized <> % after',
      v_before_entries, v_synth, v_after_entries;
  end if;

  -- ------------------------------------------------------------- PROOF 2 ---
  -- the CURRENT open set is identical, row for row, in CANONICAL ids: the
  -- set the reader makes of the raw mirror (dedupe changes multiplicity,
  -- never membership; a synthesized bare-scalar assignee counts) equals the
  -- set the ledger holds open after the whole trigger path ran
  select count(*) into v_bad from (
    select b.team_id, b.id
      from _v41_before b
      join public.territories t on t.team_id = b.team_id and t.id = b.id
     where (select coalesce(array_agg(distinct x order by x), '{}')
              from jsonb_array_elements(b.norm) e, lateral (select e->>'userId' x) s
             where e->>'unassignedAt' is null)
        is distinct from
           (select coalesce(array_agg(distinct x order by x), '{}')
              from jsonb_array_elements(t.assignees->'entries') e, lateral (select e->>'userId' x) s
             where e->>'unassignedAt' is null)) z;
  if v_bad > 0 then
    raise exception 'v41 backfill PROOF 2 failed: % hood(s) changed their current assignee set', v_bad;
  end if;

  -- ------------------------------------------------------------- PROOF 3 ---
  -- every CLOSED entry the reader produced from the raw mirror survives the
  -- trigger path (provenance merge, closed-history union, sort) with the
  -- same (userId, assignedAt, unassignedAt). A proof about the PIPELINE:
  -- the reader's own normalisation of a raw timestamp is what the preflight
  -- shows the operator, entry by entry, with the raw value beside it.
  select count(*) into v_bad from (
    select b.team_id, b.id, e->>'userId' u, e->>'assignedAt' a, e->>'unassignedAt' ua
      from _v41_before b
      cross join lateral jsonb_array_elements(b.norm) e
     where e->>'unassignedAt' is not null
    except
    select t.team_id, t.id, e->>'userId', e->>'assignedAt', e->>'unassignedAt'
      from public.territories t
      cross join lateral jsonb_array_elements(t.assignees->'entries') e
     where e->>'unassignedAt' is not null) z;
  if v_bad > 0 then
    raise exception 'v41 backfill PROOF 3 failed: % closed history entr(ies) lost', v_bad;
  end if;

  /* ------------------------------------------------------------- PROOF 4 ---
     The deterministic mirror is correct: data.assignedTo equals the first
     open entry (assignedAt, userId) of what the reader made of the raw
     mirror — checked against the BEFORE snapshot, not against the ledger
     the trigger just wrote. And the scalar MOVED only where it disagreed
     with that (the census names those rows); anywhere else a changed scalar
     is a silent reassignment. */
  select count(*) into v_bad from _v41_before b
    join public.territories t on t.team_id = b.team_id and t.id = b.id
   where coalesce(t.data->>'assignedTo', '') is distinct from coalesce((
           select e->>'userId'
             from jsonb_array_elements(b.norm) e
            where e->>'unassignedAt' is null
            order by (e->>'assignedAt')::bigint, e->>'userId' limit 1), '');
  if v_bad > 0 then
    raise exception 'v41 backfill PROOF 4 failed: % hood(s) have an assignedTo mirror that is not the first open entry', v_bad;
  end if;
  select count(*) into v_bad from _v41_before b
    join public.territories t on t.team_id = b.team_id and t.id = b.id
   where coalesce(t.data->>'assignedTo', '') is distinct from coalesce(b.assigned_to, '')
     and coalesce(b.assigned_to, '') = coalesce((
           select e->>'userId'
             from jsonb_array_elements(b.norm) e
            where e->>'unassignedAt' is null
            order by (e->>'assignedAt')::bigint, e->>'userId' limit 1), '');
  if v_bad > 0 then
    raise exception 'v41 backfill PROOF 4 failed: % hood(s) changed their assignedTo mirror without cause', v_bad;
  end if;

  -- ------------------------------------------------------------- PROOF 5 ---
  -- unresolved entries are ENUMERATED, never silently dropped
  select count(*) into v_unresolved
    from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where (e->>'userIdResolved') = 'false';
  raise notice 'v41 backfill: % historical assignment entr(ies) name a rep that cannot be resolved today (kept, tagged, excluded from open_assignees)', v_unresolved;

  -- -------------------------------------------------------- REVERSIBILITY ---
  -- `data` outside the two mirrors is byte-identical, so dropping the
  -- columns returns the world to its pre-v41 state with nothing lost
  select count(*) into v_bad from _v41_before b
    join public.territories t on t.team_id = b.team_id and t.id = b.id
   where md5((t.data - 'assignedTo' - 'assignments' - 'updatedAt')::text) <> b.rest_md5;
  if v_bad > 0 then
    raise exception 'v41 backfill REVERSIBILITY failed: % row(s) had data outside the mirrors modified', v_bad;
  end if;

  raise notice 'v41 backfill: OK — % entries (% synthesized) across % hood(s)',
    v_after_entries, v_synth, (select count(*) from public.territories);
end $$;

-- ============================ 0012_column_privileges.sql ============================
-- RALLY v41 — STAGE A part 4. Column privileges on territories.
--
-- WHY THE CONFLICT-KEY COLUMNS APPEAR IN THE UPDATE GRANT.
--
-- The client pushes with PostgREST:
--     POST /rest/v1/territories?on_conflict=team_id,id
--     Prefer: resolution=merge-duplicates
-- which becomes INSERT ... ON CONFLICT (team_id,id) DO UPDATE SET <every
-- payload column, the conflict keys included> — the shape db/test/rls-test.sql
-- has modelled verbatim since v39.
--
-- The DO UPDATE arm is an UPDATE, and PostgreSQL checks it against UPDATE
-- COLUMN privileges for every column in its SET list. Omitting team_id and
-- id therefore breaks every upsert against an EXISTING row, which is the
-- common case. Proven by probe: with insert(team_id,id,name,data) and
-- update(name,data) the statement fails "permission denied for table";
-- adding update(team_id,id) makes the identical statement succeed.
--
-- Granting UPDATE on the conflict keys is safe, provably. ON CONFLICT
-- (team_id,id) only fires when the proposed row's keys ALREADY EQUAL an
-- existing row's, so `excluded.team_id` is identically that row's team_id
-- and `excluded.id` its id: both assignments are self-assignments and
-- cannot move a row between teams or rename it. Belt and braces, 0003's
-- UPDATE policy pins team_id = my_team_id() in both USING and WITH CHECK.
--
-- SELECT STAYS TABLE-WIDE. js/sync.js:1163 builds its pull URL with NO
-- `select=` list, so PostgREST returns every column; a narrowed SELECT
-- grant would 403 every pull on the first non-granted column.
--
-- The revoke must come FIRST: 0001's table-level `grant select, insert,
-- update on public.territories to authenticated` would otherwise remain in
-- force and make the column grants decorative.

revoke insert, update on public.territories from authenticated;

grant insert (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
  on public.territories to authenticated;
grant update (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
  on public.territories to authenticated;

-- NOT GRANTED, on purpose — every one of them is server-authored, and a
-- BEFORE trigger sets them with the caller holding no privilege at all
-- (proven by probe):
--   geom              derived from polygon (0009)
--   assignees         assignment truth, moved only by an RPC (0010)
--   assignees_rev     monotone, bumped by the trigger
--   open_assignees    derived uuid[] index mirror
--   cycle_started_at  moved only by start_territory_cycle (0014)
--   created_at        column default
--   updated_at        territories_touch (0001)

do $$
declare v_leak text;
begin
  select string_agg(a.attname, ', ') into v_leak
    from pg_attribute a
   where a.attrelid = 'public.territories'::regclass
     and a.attnum > 0 and not a.attisdropped
     and a.attname in ('geom','assignees','assignees_rev','open_assignees',
                       'cycle_started_at','created_at','updated_at')
     and (has_column_privilege('authenticated', a.attrelid, a.attname, 'INSERT')
       or has_column_privilege('authenticated', a.attrelid, a.attname, 'UPDATE'));
  if v_leak is not null then
    raise exception 'v41 privileges: authenticated can still write server-owned column(s): %', v_leak;
  end if;
end $$;

-- ============================ 0013_dnk_authority.sql ============================
-- RALLY v41 — STAGE A part 5. Do-not-knock is SERVER-AUTHORITATIVE.
--
-- A rep can be on v40, on a modified client, on a future buggy client, or
-- calling PostgREST directly with their own token. 0001 grants
-- `select, insert, update on public.pins to authenticated`, and a delete in
-- RALLY is a tombstone UPDATE — so today a rep can erase the visible mark
-- of a do-not-knock door, and a later CSV import brings it back white. A
-- client-side guard is UX. This is the authority, and it is version-blind.
--
-- IT NEUTRALISES, IT DOES NOT REFUSE. js/sync.js:490 pushes rows in
-- BATCHES; a RAISE would fail the whole batch, dead-lettering unrelated
-- knocks from other doors, and the client would retry the same batch
-- forever. Neutralising accepts the write, keeps the parts that are real
-- work (the rep's note, the knock they logged), silently restores the
-- parts that are protected, and lets the corrected row propagate — so the
-- client CONVERGES instead of looping. Contrast 0009, which refuses an
-- invalid polygon: there is no correct outline to substitute there, and
-- here there is exactly one correct disposition.
--
-- AN ORDINARY EDIT NEVER CLEARS BLACK — not a rep's, and NOT A LEADER'S.
-- Leadership authorization does not turn a stray disposition tap into a
-- decision to clear a do-not-knock. The only thing that clears it is
-- clear_pin_dnk() in 0014: an explicit action, with a reason, an
-- idempotency key and an indelible event.

/* Is this door currently do-not-knock, judged from its own history?

   A dnk_clear is written into the pin's history as well as the event log,
   exactly like a knock — which is what lets the ordinary history union
   carry a clear between devices, and lets this test be a cheap read of one
   row rather than a scan of the event table. */
create or replace function public.rally_dnk_from_history(p_data jsonb)
returns bigint
language sql
immutable
security invoker
set search_path = ''
as $$
  /* TOTAL over client JSON: history may not be an array, an element may
     not be an object, and ts may be a sentence. None of that may abort a
     write — a legacy door must still be writable — so the array is read
     only when it is one, and ts is cast only when an anchored regex has
     proven the cast cannot fail. An unreadable ts counts as 0. */
  with h as (
    select case when (e->>'ts') ~ '^-?[0-9]{1,18}$' then (e->>'ts')::bigint else 0 end ts,
           e->>'disposition' d
      from jsonb_array_elements(
             case when jsonb_typeof(p_data->'history') = 'array'
                  then p_data->'history' else '[]'::jsonb end) e
  ), k as (
    select max(ts) filter (where d = 'dnk')       as dnk_at,
           max(ts) filter (where d = 'dnk_clear') as clear_at
      from h
  )
  select case when dnk_at is null then null
              when clear_at is not null and clear_at >= dnk_at then null
              else dnk_at end
    from k
$$;


/* Strip a FORGED clear.

   The clearing signal is a dnk_clear entry — and both places it lives are
   client-written: the door's own history, and the append-only event log.
   Without this, a rep clears ANY black door by appending
   {disposition:'dnk_clear'} to the history they push, or by inserting one
   event straight into PostgREST. Neither needs a bug in the client; both
   defeat the whole authority.

   So a client write may carry only the clears the SERVER ALREADY HAS. A new
   one can arrive exactly one way: clear_pin_dnk, which runs as the function
   owner and never passes through here. Matching is on the timestamp,
   because that is what the clear IS — a moment. Everything else in the
   write is kept untouched: this removes a forgery, not a rep's work. */
create or replace function public.rally_strip_forged_clears(p_old jsonb, p_new jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    -- a scalar data, or a history that is not an array, carries no clear to
    -- strip — and jsonb_set cannot set a path in a scalar
    when jsonb_typeof(p_new) <> 'object'
      or jsonb_typeof(coalesce(p_new->'history', '[]'::jsonb)) <> 'array' then p_new
    else jsonb_set(p_new, '{history}', coalesce((
      select jsonb_agg(h order by ord)
        from jsonb_array_elements(p_new->'history') with ordinality t(h, ord)
       where h->>'disposition' is distinct from 'dnk_clear'
          or exists (
            select 1 from jsonb_array_elements(
                     case when jsonb_typeof(p_old->'history') = 'array'
                          then p_old->'history' else '[]'::jsonb end) o
             where o->>'disposition' = 'dnk_clear'
               and o->>'ts' = h->>'ts')
    ), '[]'::jsonb))
  end
$$;

/* The event log's half of the same rule. A dnk_clear event written by a
   CLIENT is silently dropped — dropped, not refused, because events push in
   batches and a refusal would dead-letter the honest knocks beside it. The
   real clear is the one clear_pin_dnk writes as the owner, and an honest
   v41 client uses the SAME id for its local copy, so its echo is an
   ordinary ignore-duplicate no-op rather than a loss. */
create or replace function public.events_guard_dnk_clear()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then return new; end if;
  if new.disposition = 'dnk_clear' or new.type = 'dnk_clear'
     or coalesce(new.data->>'disposition', '') = 'dnk_clear' then
    return null;   -- skip the row; the batch around it still commits
  end if;
  return new;
end $$;

drop trigger if exists events_guard_dnk_clear on public.events;
create trigger events_guard_dnk_clear
  before insert on public.events
  for each row execute function public.events_guard_dnk_clear();

create or replace function public.pins_protect_dnk()
returns trigger
language plpgsql
security invoker                     -- current_user is the authorization test
set search_path = ''
as $$
declare
  v_was_dnk   boolean;
  v_leader    boolean;
  v_via_rpc   boolean;
  v_now_ms    bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_incoming  bigint;
  v_touched   boolean := false;
  v_hist      jsonb;
begin
  /* THE UNSPOOFABLE TEST. A client write arrives through PostgREST as the
     role `authenticated`; a SECURITY DEFINER RPC runs as the function's
     owner, which no client can become. So clear_pin_dnk() is
     distinguishable from every ordinary write without a GUC, a header or a
     JSON flag — none of which are authorization tests, because a request
     can carry all three. This is also why the trigger is SECURITY INVOKER:
     as DEFINER, current_user would be its own owner on every path. */
  v_via_rpc := current_user <> 'authenticated';
  if v_via_rpc then return new; end if;   -- 0014 is the only legitimate clear

  /* FORGED CLEARS GO FIRST, and on EVERY write — including an INSERT, and
     including a door that is not black yet. A clear only counts when it is
     at or after the do-not-knock, so one planted with a future timestamp on
     an ordinary door would silently disarm the protection the day that door
     was marked. Stripping only black doors would leave exactly that hole. */
  new.data := public.rally_strip_forged_clears(
    case when tg_op = 'UPDATE' then old.data else '{}'::jsonb end, coalesce(new.data, '{}'::jsonb));

  if tg_op = 'INSERT' then return new; end if;

  /* WAS the door black before this write? Judged from the row the server
     already holds — never from anything the request carried. */
  v_was_dnk := old.disposition = 'dnk'
               or public.rally_dnk_from_history(old.data) is not null;
  if not v_was_dnk then return new; end if;

  v_leader := coalesce(public.my_role() in ('leader','manager','owner'), false)
              and coalesce(public.is_active(), false);

  /* Leadership does not help here, deliberately. The role gate on
     clear_pin_dnk() is where leadership matters; an ordinary edit is an
     ordinary edit whoever makes it. v_leader is computed only so the
     refusal message can tell a manager what to do instead. */

  -- restore the protected facts, in BOTH the column and the mirror inside data
  if new.disposition is distinct from 'dnk' then
    new.disposition := 'dnk';
    v_touched := true;
  end if;
  if jsonb_typeof(new.data) is distinct from 'object' then
    /* a legacy row whose data is not an object cannot carry the mirror or
       the history; the COLUMN is still protected above and below, and the
       preflight names the row. jsonb_set would abort on a scalar. */
    null;
  elsif coalesce(new.data->>'disposition', '') is distinct from 'dnk' then
    new.data := jsonb_set(new.data, '{disposition}', '"dnk"'::jsonb);
    v_touched := true;
  end if;

  -- a tombstone is neutralised the same way: the door stays
  if new.deleted_at is distinct from old.deleted_at and new.deleted_at is not null then
    new.deleted_at := old.deleted_at;
    v_touched := true;
  end if;

  /* The do-not-knock knock itself must survive in the history even if the
     incoming row dropped it — the history union is what carries the fact to
     every other device. Notes, later knocks, callbacks, the address and the
     coordinates from this write are all KEPT: they are real work, and the
     point is to protect one fact, not to reject a rep's afternoon. */
  if jsonb_typeof(new.data) = 'object' and public.rally_dnk_from_history(new.data) is null then
    v_hist := coalesce(new.data->'history', '[]'::jsonb);
    if jsonb_typeof(v_hist) <> 'array' then v_hist := '[]'::jsonb; end if;
    new.data := jsonb_set(new.data, '{history}',
      v_hist || jsonb_build_object(
        'ts', coalesce(public.rally_dnk_from_history(old.data), v_now_ms),
        'disposition', 'dnk', 'reason', null, 'dm', false,
        'note', 'do-not-knock restored by the server'));
    v_touched := true;
  end if;

  /* THE AUTHORITATIVE-CORRECTION STAMP — the same rule as 0010.
     A client compares record clocks; an unchanged clock reads as "same"
     and the correction is discarded, so a v40 phone would show the door as
     knockable forever. Stamped ONLY when something was actually corrected,
     because an unconditional stamp makes every echo look newer to a device
     whose clock runs behind and it re-pushes the row on every cycle. */
  if v_touched and jsonb_typeof(new.data) = 'object' then
    v_incoming := case when (new.data->>'updatedAt') ~ '^-?[0-9]{1,18}$'
                       then (new.data->>'updatedAt')::bigint else 0 end;
    new.data := jsonb_set(new.data, '{updatedAt}', to_jsonb(greatest(v_now_ms, v_incoming + 1)));
  end if;

  return new;
end $$;

drop trigger if exists pins_protect_dnk on public.pins;
create trigger pins_protect_dnk
  before insert or update on public.pins
  for each row execute function public.pins_protect_dnk();

-- grants: Supabase's default function privileges (see 0010); the two
-- readers run inside the SECURITY INVOKER trigger as the writing client
revoke all on function public.rally_dnk_from_history(jsonb)           from public, anon;
revoke all on function public.rally_strip_forged_clears(jsonb, jsonb) from public, anon;
revoke all on function public.events_guard_dnk_clear()                from public, anon, authenticated;
revoke all on function public.pins_protect_dnk()                      from public, anon, authenticated;

comment on function public.pins_protect_dnk() is
  'Version-blind do-not-knock authority. Neutralises (never refuses) a non-RPC attempt to change a black door away from dnk or to tombstone it, preserves the rest of the write, and stamps data.updatedAt above the incoming value so the client converges.';

commit;
