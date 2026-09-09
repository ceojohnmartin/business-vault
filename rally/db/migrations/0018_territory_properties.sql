-- RALLY v42 — 0018. TERRITORY IDENTITY, SERVER-SIDE PROPERTY IMPORT, AND
-- SELECTIVE RE-KNOCK.
--
-- Everything here is ADDITIVE. No table is rewritten, no existing column
-- changes type, no trigger body is replaced, no policy is dropped, and NOT
-- ONE EXISTING ROW is modified except by the two explicit backfills in §B,
-- which write only columns this file creates. Applying it twice changes
-- nothing.
--
-- ---------------------------------------------------------------------------
-- WHY THE SHAPE OF THIS FILE IS UNUSUAL
--
-- Three constraints from the live system decided nearly every choice below.
--
-- 1. THE CLIENT PULLS WITH NO COLUMN LIST. js/sync.js builds
--    `GET /rest/v1/<table>?team_id=eq...` with no `select=`, so PostgREST
--    asks for EVERY column. Privileges on pins, events and territories are
--    column-scoped (0012), and a column added later inherits nothing. A new
--    column that `authenticated` cannot SELECT therefore does not degrade
--    gracefully — it fails the whole pull, on every phone, immediately.
--    So every column this file adds is granted SELECT in §I, and the grant
--    is part of the same transaction as the column.
--
-- 2. WHICH IS ALSO WHY pins GETS NO NEW COLUMNS. A geometry column on pins
--    would have to be pulled to every device as WKB on every page of every
--    sync, forever, to buy a spatial index the phone never uses. The index
--    is worth having; the column is not. §E builds it as an EXPRESSION
--    index over the lat/lng already stored. Same for provenance: the import
--    matcher reads `data->'prop'`, which is already there, through an
--    expression index rather than three duplicated columns.
--
-- 3. BLACK IS STILL CLEARED ONE DOOR AT A TIME. §G resets a hood for
--    re-knock, and a manager may ask it to include do-not-knock doors. It
--    does not clear them. It RETURNS them, and the client calls the
--    existing clear_pin_dnk() once per door, each with its own reason and
--    operation id. 0013/0017 make that function the only path to clearing
--    black, deliberately, and a bulk path would either duplicate sixty
--    lines of subtle clock and history handling or quietly weaken it. The
--    manager override the product asks for is honoured; the audit record it
--    would have cost is not.
--
-- ---------------------------------------------------------------------------
-- WHAT THIS FILE DOES NOT DO, AND WHY
--
--   It does not add a `territory_assignments` table. Assignment is already
--   an append-only ledger in territories.assignees, server-authoritative
--   since the 2026-09-08 flip, with open_assignees as its indexed mirror.
--   A second home for the same fact would be a second version of the truth.
--
--   It does not add a `door_activities` table. public.events already is
--   one: append-only by grant (no UPDATE, no DELETE, no policy for either),
--   keyed (team_id, id), indexed by pin and by time. §D adds the two
--   columns it was missing.
--
--   It does not add a `territory_properties` join table. pins.territory_id
--   plus pins_territory_idx already expresses it, and STORE.hoodOf treats
--   geometry as canonical with the stamp as a hint — which is the correct
--   relationship, because a polygon can be reshaped after a door is stamped.

-- =========================================================== B. IDENTITY ===
/* A hood needs two identifiers it does not have.

   `seq` is what a manager says out loud: "Polygon 10 of 100". It is per
   team, starts at 1, and is never reused — deleting polygon 9 does not
   renumber 10, because the number is on a radio call and in a text message
   ten minutes later. It is an ADMINISTRATIVE REFERENCE, not a key.

   `uuid` is the permanent identity. The existing `id` is already stable and
   already the key, so this is not a replacement: it is the identifier a
   future system of record can carry across a market migration, a merge, or
   a re-key, without any of them touching (team_id, id). */

alter table public.territories add column if not exists seq  bigint;
alter table public.territories add column if not exists uuid uuid;
-- §C's column, added here so that ALL of this table's DDL precedes any
-- write to it. See the note under the default below.
alter table public.territories
  add column if not exists cycle_keep text[] not null default '{}';

alter table public.territories alter column uuid set default gen_random_uuid();

/* The backfill of these two columns is deliberately NOT here. It is the
   last thing this file does, in §J, and the reason is specific:

     public.territories carries territories_no_overlap, a DEFERRABLE
     INITIALLY DEFERRED constraint trigger (0016). Any UPDATE on the table
     queues a trigger event that does not fire until COMMIT. Inside a single
     transaction — which is exactly how db/APPLY_v42.sql runs on production
     — PostgreSQL then refuses every later ALTER TABLE on that table with
     "cannot ALTER TABLE because it has pending trigger events".

   Running the migration statement-by-statement hides this completely, because
   each statement commits on its own and the queue drains between them. It
   only appears in the one-transaction form, which is the form that matters.
   So: every ALTER on territories happens before any UPDATE of it. */

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'territories_seq_uniq') then
    alter table public.territories
      add constraint territories_seq_uniq unique (team_id, seq) deferrable initially deferred;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'territories_uuid_uniq') then
    alter table public.territories add constraint territories_uuid_uniq unique (uuid);
  end if;
end $$;

/* THE NUMBER IS ASSIGNED BY THE SERVER, NEVER BY THE PHONE.

   Two managers drawing at the same moment must not both be told they made
   Polygon 11. A team-scoped transaction advisory lock serialises them —
   the same device 0016 uses for the overlap invariant, and scoped the same
   way so two companies never wait on each other.

   On UPDATE the number is held fixed: a hood keeps its number for life,
   including across archive and un-archive. */
create or replace function public.territories_number()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    /* coalesce, not a plain overwrite: this trigger is created BEFORE §J
       backfills the existing rows (see the note in §B), so on those rows
       old.seq is null and the number the backfill computed must survive.
       On every ordinary update old.seq is set and wins, which is what stops
       a client renumbering a hood. */
    new.seq  := coalesce(old.seq, new.seq);
    new.uuid := coalesce(old.uuid, new.uuid, gen_random_uuid());
    return new;
  end if;

  if new.uuid is null then new.uuid := gen_random_uuid(); end if;

  -- A client cannot choose its own number: whatever arrived is discarded.
  perform pg_advisory_xact_lock(hashtext('rally_turf_seq'), hashtext(new.team_id::text));
  select coalesce(max(seq), 0) + 1 into new.seq
    from public.territories where team_id = new.team_id;
  return new;
end $$;

drop trigger if exists territories_number on public.territories;
create trigger territories_number
  before insert or update on public.territories
  for each row execute function public.territories_number();

-- ====================================================== C. SELECTIVE RESET ===
/* WHICH OUTCOMES A RE-KNOCK BRINGS BACK TO BLUE.

   The reset itself already exists and is already non-destructive:
   cycle_started_at is one monotone timestamp, and STORE.effectiveDisposition
   derives every door's colour from it at paint time. Nothing is rewritten,
   so nothing is lost — the history under a reset door is the same history
   it had before.

   What was missing is CHOICE. Today a boundary resets everything except a
   current do-not-knock and an active customer. A manager may want to leave
   Go Backs purple through the next pass, because a booked callback is not
   an unworked door.

   `cycle_keep` names the outcomes the CURRENT boundary does not apply to.
   Empty — the default, and therefore the behaviour of every hood already on
   production — means exactly what happens today. It is derived, additive
   and reversible: clearing the array restores the plain boundary, and no
   door was ever written either way. */
-- (the column itself is added in §B, with the rest of this table's DDL)

-- ================================================ D. ACTIVITY COMPLETENESS ===
/* An activity row could not say WHERE a knock happened or WHAT IT CHANGED.

   territory_id: events.data->>'territoryId' has carried this since v39, but
   only inside the blob, so no index can reach it and no server query can
   group by it. The column is the same fact where the database can use it.

   prev_disposition: never recorded anywhere. "Blue became yellow" was only
   ever reconstructible by replaying a door's whole history in order. For an
   audit trail that is the difference between reading a row and rebuilding
   a timeline.

   Both are nullable and neither is backfilled: a null means "this event
   predates the column", which is the truth, and inventing a value by replay
   would put a derived guess in an append-only log. */
alter table public.events add column if not exists territory_id     text;
alter table public.events add column if not exists prev_disposition text;

-- ===================================================== E. LOOKUP INDEXES ===
/* "Which doors are inside this polygon" and "have I seen this property
   before" are the two questions the import asks, and both were sequential
   scans.

   Expression indexes, not columns — see note 2 in the header. st_makepoint
   and st_setsrid are immutable, so the point index is legal; both are
   partial on the live rows, which is the only set either question is about. */
create index if not exists pins_point_live_gist
  on public.pins using gist (gis.st_setsrid(gis.st_makepoint(lng, lat), 4326))
  where deleted_at is null;

create index if not exists pins_provenance_live_idx
  on public.pins ((data->'prop'->>'source'), (data->'prop'->>'externalId'))
  where deleted_at is null;

create index if not exists pins_parcel_live_idx
  on public.pins ((data->'prop'->>'parcelId'))
  where deleted_at is null;

/* Deliberately NOT unique. A unique index is the right long-term shape, but
   it would fail to build if production already holds two rows for one
   property — and an apply that aborts on legacy data is a worse outcome
   than an apply that leaves the duplicate visible. db/preflight/
   v42-import-preflight.editor.sql counts them; the unique index becomes
   safe, and belongs in a later file, once that count reads zero. Until
   then §F enforces the same thing under a lock, which is what actually
   stops new duplicates. */

-- ========================================================= F. THE IMPORT ===
/* MATCHING A DRAWN POLYGON TO PERMANENT PROPERTY RECORDS.

   The client scans a polygon with whichever property provider is
   configured, and sends the normalised result here. This function decides
   what is new. It is the only writer that creates unworked inventory on the
   server, and it is idempotent three times over: on the operation id, on
   the provider's own identifier for a property, and on proximity.

   WHY THE SERVER RE-CHECKS CONTAINMENT. The client already filtered to the
   ring it drew, but the client is not trusted with where a door may be
   created: a stale scan, a reshaped polygon, or a malformed payload would
   otherwise stamp doors into a hood that does not contain them, and
   STORE.hoodOf would then disagree with the stamp on every device forever.
   A door outside the polygon is REJECTED and counted, never silently moved.

   WHY THE FIELD LIST IS WRITTEN OUT. CLAUDE.md §7: vendor responses are
   never forwarded whole; a proxy uses an explicit allowlist. Every property
   attribute this function will store is named below. Anything else in the
   payload — including any protected-characteristic field a provider might
   add to its schema later — is dropped here, without a code change. */
create or replace function public.import_territory_doors(
  p_territory_id text,
  p_doors        jsonb,
  p_operation_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid;
  v_team      uuid;
  v_t         public.territories%rowtype;
  v_at        bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_ev        text   := 'import-' || p_operation_id;
  v_d         jsonb;
  v_lat       double precision;
  v_lng       double precision;
  v_pt        gis.geometry;
  v_src       text;
  v_ext       text;
  v_parcel    text;
  v_addr      text;
  v_match     text;
  v_new_id    text;
  v_inserted  int := 0;
  v_matched   int := 0;
  v_outside   int := 0;
  v_bad       int := 0;
  v_prior     jsonb;
begin
  v_uid  := public.rally_require_leader();
  v_team := public.rally_my_team();

  if coalesce(btrim(p_operation_id), '') = '' then
    raise exception 'import: needs an operation id' using errcode = '22023';
  end if;
  if jsonb_typeof(p_doors) <> 'array' then
    raise exception 'import: doors must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_doors) > 5000 then
    raise exception 'import: % doors in one call exceeds the 5000 limit',
      jsonb_array_length(p_doors) using errcode = '22023';
  end if;

  /* Idempotent on the operation id. The event IS the record of the import,
     so a retry that lost its response is answered with the original counts
     rather than importing the same neighbourhood twice. */
  select data into v_prior from public.events where team_id = v_team and id = v_ev;
  if found then
    return jsonb_build_object('status', 'already_committed',
      'territory_id', p_territory_id, 'counts', coalesce(v_prior->'counts', '{}'::jsonb));
  end if;

  select * into v_t from public.territories
   where team_id = v_team and id = p_territory_id for update;
  if not found then
    raise exception 'import: hood % not found for this team', p_territory_id
      using errcode = '42501';
  end if;
  if v_t.deleted_at is not null or v_t.archived then
    raise exception 'import: hood % is not live', p_territory_id using errcode = '22023';
  end if;
  if v_t.geom is null then
    raise exception 'import: hood % has no usable outline (%)', p_territory_id,
      coalesce(public.rally_ring_problem(v_t.polygon), 'unknown') using errcode = '22023';
  end if;

  /* One import at a time per team. Two managers importing overlapping
     neighbourhoods concurrently would each miss the other's inserts and
     both create the same doors; the matcher below only sees committed rows,
     so serialising is what makes it correct. */
  perform pg_advisory_xact_lock(hashtext('rally_import'), hashtext(v_team::text));

  for v_d in select * from jsonb_array_elements(p_doors)
  loop
    /* The cast is guarded by an anchored numeric regex, never attempted
       hopefully. A payload carrying "nope" for a latitude must be COUNTED
       as unusable — a raise here would abort the whole import, so one
       malformed row in a five-thousand-door neighbourhood would throw away
       the other four thousand nine hundred and ninety-nine. */
    v_lat := case when (v_d->>'lat') ~ '^-?[0-9]{1,3}(\.[0-9]{1,15})?$'
                  then (v_d->>'lat')::double precision end;
    v_lng := case when (v_d->>'lng') ~ '^-?[0-9]{1,3}(\.[0-9]{1,15})?$'
                  then (v_d->>'lng')::double precision end;

    if v_lat is null or v_lng is null
       or v_lat < -90 or v_lat > 90 or v_lng < -180 or v_lng > 180 then
      v_bad := v_bad + 1;
      continue;
    end if;

    v_pt := gis.st_setsrid(gis.st_makepoint(v_lng, v_lat), 4326);
    if not gis.st_intersects(v_t.geom, v_pt) then
      v_outside := v_outside + 1;
      continue;
    end if;

    v_src    := nullif(btrim(coalesce(v_d->>'source', '')), '');
    v_ext    := nullif(btrim(coalesce(v_d->>'externalId', '')), '');
    v_parcel := nullif(btrim(coalesce(v_d->>'parcelId', '')), '');
    v_addr   := nullif(btrim(coalesce(v_d->>'address', '')), '');
    v_match  := null;

    -- TIER 1: the provider's own identifier for this property. Exact.
    if v_ext is not null and v_src is not null then
      select id into v_match from public.pins
       where team_id = v_team and deleted_at is null
         and data->'prop'->>'source' = v_src
         and data->'prop'->>'externalId' = v_ext
       limit 1;
    end if;

    -- TIER 2: the parcel number. Exact, and survives a provider change.
    if v_match is null and v_parcel is not null then
      select id into v_match from public.pins
       where team_id = v_team and deleted_at is null
         and data->'prop'->>'parcelId' = v_parcel
       limit 1;
    end if;

    /* TIER 3: same address, and close enough that it is the same building
       rather than the same street number in the next town. Both halves are
       required — an address alone repeats across a market, and proximity
       alone merges neighbours. */
    if v_match is null and v_addr is not null then
      select id into v_match from public.pins
       where team_id = v_team and deleted_at is null
         and lower(btrim(address)) = lower(v_addr)
         and gis.st_dwithin(
               gis.st_setsrid(gis.st_makepoint(lng, lat), 4326)::gis.geography,
               v_pt::gis.geography, 120)
       limit 1;
    end if;

    /* TIER 4: no identifier and no address — a bare building centroid. 12 m
       is inside a house and outside its neighbours in every residential
       density RALLY sells into. This tier can merge two genuinely distinct
       doors at a duplex; that is the deliberate trade, because creating a
       second pin on a roof that already has one is the failure reps
       actually feel. */
    if v_match is null then
      select id into v_match from public.pins
       where team_id = v_team and deleted_at is null
         and gis.st_dwithin(
               gis.st_setsrid(gis.st_makepoint(lng, lat), 4326)::gis.geography,
               v_pt::gis.geography, 12)
       limit 1;
    end if;

    if v_match is not null then
      /* KNOWN PROPERTY. Its outcome, its history, its notes and its
         customer are untouched — that is the entire point of a permanent
         property record. The only thing that may change is which hood it
         currently belongs to, and only when it has none. */
      update public.pins
         set territory_id = p_territory_id
       where team_id = v_team and id = v_match and territory_id is distinct from p_territory_id
         and (territory_id is null
              or not exists (select 1 from public.territories x
                              where x.team_id = v_team and x.id = public.pins.territory_id
                                and x.deleted_at is null and not x.archived));
      v_matched := v_matched + 1;
      continue;
    end if;

    -- NEW PROPERTY. Blue, with no history, and a provenance record.
    v_new_id := 'imp' || substr(md5(v_team::text || p_operation_id || v_lat::text ||
                                    v_lng::text || coalesce(v_ext, v_addr, '')), 1, 20);
    insert into public.pins (team_id, id, lat, lng, address, disposition,
                             territory_id, created_by, data)
    values (v_team, v_new_id, v_lat, v_lng, coalesce(v_addr, ''), 'unworked',
            p_territory_id, v_uid,
            jsonb_build_object(
              'id', v_new_id, 'lat', v_lat, 'lng', v_lng,
              'address', coalesce(v_addr, ''),
              'disposition', 'unworked', 'reason', null, 'dm', false, 'note', '',
              'history', '[]'::jsonb, 'callbackAt', null,
              'territoryId', p_territory_id,
              'importedAt', v_at, 'createdAt', v_at, 'updatedAt', v_at,
              'geo', jsonb_build_object(
                'city',  coalesce(v_d->>'city', ''),
                'state', coalesce(v_d->>'state', ''),
                'zip',   coalesce(v_d->>'zip', '')),
              -- THE ALLOWLIST. Every stored property attribute, named.
              'prop', jsonb_build_object(
                'externalId',    v_ext,
                'parcelId',      v_parcel,
                'source',        coalesce(v_src, 'unknown'),
                'propertyType',  v_d->>'propertyType',
                'owner',         v_d->>'owner',
                'yearBuilt',     v_d->>'yearBuilt',
                'sqft',          v_d->>'sqft',
                'lotSqft',       v_d->>'lotSqft',
                'lastSaleDate',  v_d->>'lastSaleDate',
                'lastSalePrice', v_d->>'lastSalePrice',
                'placement',     v_d->>'placement')))
    on conflict (team_id, id) do nothing;
    if found then v_inserted := v_inserted + 1; else v_matched := v_matched + 1; end if;
  end loop;

  insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user,
                             territory_id, data)
  values (v_team, v_ev, null, 'territory_import', '', v_at, v_uid, p_territory_id,
          jsonb_build_object('id', v_ev, 'ts', v_at, 'type', 'territory_import',
            'territoryId', p_territory_id, 'repId', v_uid::text,
            'operationId', p_operation_id,
            'counts', jsonb_build_object('inserted', v_inserted, 'matched', v_matched,
                        'outside', v_outside, 'unusable', v_bad,
                        'sent', jsonb_array_length(p_doors))));

  return jsonb_build_object('status', 'ok', 'territory_id', p_territory_id,
    'operation_id', p_operation_id,
    'counts', jsonb_build_object('inserted', v_inserted, 'matched', v_matched,
                'outside', v_outside, 'unusable', v_bad,
                'sent', jsonb_array_length(p_doors)));
end $$;

-- ================================================= G. RESET FOR RE-KNOCK ===
/* PREPARE A WORKED HOOD FOR ANOTHER PASS.

   This moves a timestamp and records who moved it. It writes no door, it
   deletes nothing, and every knock under every door survives it — a reset
   door shows blue and still answers "what happened here last July".

   p_keep names the outcomes the new boundary does NOT apply to. The
   product default is {} — Not Home, Not Interested and Go Back all return
   to blue — and Sold and a current do-not-knock are already protected by
   effectiveDisposition regardless of what is passed.

   p_include_dnk does not clear black. It returns the doors that are black,
   for the client to clear one at a time through clear_pin_dnk(), each with
   its own reason and its own indelible event. See note 3 in the header. */
create or replace function public.reset_territory_outcomes(
  p_territory_id text,
  p_keep         text[],
  p_include_dnk  boolean,
  p_operation_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid;
  v_team   uuid;
  v_t      public.territories%rowtype;
  v_at     timestamptz := clock_timestamp();
  v_ms     bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_ev     text := 'reset-' || p_operation_id;
  v_keep   text[] := coalesce(p_keep, '{}');
  v_bad    text;
  v_dnk    jsonb := '[]'::jsonb;
  v_prior  jsonb;
begin
  v_uid  := public.rally_require_leader();
  v_team := public.rally_my_team();

  if coalesce(btrim(p_operation_id), '') = '' then
    raise exception 'reset: needs an operation id' using errcode = '22023';
  end if;

  -- Only real outcomes may be kept. A typo would silently keep nothing.
  select x into v_bad from unnest(v_keep) x
   where x not in ('unworked','nothome','goback','notint','sold','dnk') limit 1;
  if v_bad is not null then
    raise exception 'reset: % is not an outcome', v_bad using errcode = '22023';
  end if;

  select data into v_prior from public.events where team_id = v_team and id = v_ev;
  if found then
    return jsonb_build_object('status', 'already_committed',
      'territory_id', p_territory_id,
      'cycle_started_at', v_prior->>'cycleStartedAt',
      'dnk_pins', coalesce(v_prior->'dnkPins', '[]'::jsonb));
  end if;

  select * into v_t from public.territories
   where team_id = v_team and id = p_territory_id for update;
  if not found then
    raise exception 'reset: hood % not found for this team', p_territory_id
      using errcode = '42501';
  end if;

  -- Monotone forward, same rule and the same reason as start_territory_cycle.
  if v_t.cycle_started_at is not null and v_at <= v_t.cycle_started_at then
    v_at := v_t.cycle_started_at + interval '1 millisecond';
  end if;

  if p_include_dnk then
    select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'address', p.address)), '[]'::jsonb)
      into v_dnk
      from public.pins p
     where p.team_id = v_team and p.deleted_at is null
       and p.territory_id = p_territory_id
       and public.rally_dnk_from_history(p.data) is not null;
  end if;

  update public.territories
     set cycle_started_at = v_at, cycle_keep = v_keep
   where team_id = v_team and id = p_territory_id;

  insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user,
                             territory_id, data)
  values (v_team, v_ev, null, 'territory_reset', '', v_ms, v_uid, p_territory_id,
          jsonb_build_object('id', v_ev, 'ts', v_ms, 'type', 'territory_reset',
            'territoryId', p_territory_id, 'repId', v_uid::text,
            'operationId', p_operation_id,
            'cycleStartedAt', v_at, 'keep', to_jsonb(v_keep),
            'dnkPins', v_dnk));

  return jsonb_build_object('status', 'ok', 'territory_id', p_territory_id,
    'cycle_started_at', v_at, 'keep', to_jsonb(v_keep), 'dnk_pins', v_dnk);
end $$;

-- ======================================================== H. THE TWO NUMBERS ===
/* Everything the draw-and-assign card shows, in one round trip:
   "Polygon <seq> of <total>", the house count, and the sale count.

   Sales are counted from customers, not from a door's colour: a green pin
   is a display state derived through the cycle boundary, and a sale is a
   signed agreement that outlives every reset. */
create or replace function public.rally_territory_summary(p_territory_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team   uuid;
  v_t      public.territories%rowtype;
  v_total  bigint;
  v_houses bigint;
  v_sales  bigint;
begin
  v_team := public.rally_my_team();
  if v_team is null then
    raise exception 'summary: no team' using errcode = '42501';
  end if;

  select * into v_t from public.territories where team_id = v_team and id = p_territory_id;
  if not found then
    raise exception 'summary: hood % not found for this team', p_territory_id
      using errcode = '42501';
  end if;

  select count(*) into v_total from public.territories
   where team_id = v_team and deleted_at is null and not archived;

  select count(*) into v_houses from public.pins
   where team_id = v_team and deleted_at is null and territory_id = p_territory_id;

  select count(*) into v_sales
    from public.customers c
   where c.team_id = v_team and c.deleted_at is null
     and exists (select 1 from public.pins p
                  where p.team_id = v_team and p.deleted_at is null
                    and p.territory_id = p_territory_id
                    and p.id = c.data->>'pinId');

  return jsonb_build_object(
    'territory_id', p_territory_id, 'uuid', v_t.uuid,
    'seq', v_t.seq, 'of', v_total,
    'houses', v_houses, 'sales', v_sales,
    'cycle_started_at', v_t.cycle_started_at, 'cycle_keep', to_jsonb(v_t.cycle_keep));
end $$;

-- ============================================================== I. GRANTS ===
/* SELECT on every column this file added — see note 1 in the header. The
   pull asks for all columns; a column authenticated cannot read takes the
   whole sync down. */
grant select (seq, uuid, cycle_keep) on public.territories to authenticated;
grant select (territory_id, prev_disposition) on public.events to authenticated;

/* A phone may WRITE the two new event columns, because a phone authors
   events. It may not write a hood's number, its permanent uuid, or which
   outcomes a reset kept: those are server-owned, exactly like assignees and
   cycle_started_at before them. No INSERT or UPDATE grant is issued on
   them, and 0012 already replaced the table-wide grant with column grants,
   so they are unreachable by omission. */
grant insert (territory_id, prev_disposition) on public.events to authenticated;

revoke all on function public.import_territory_doors(text, jsonb, text) from public, anon;
revoke all on function public.reset_territory_outcomes(text, text[], boolean, text) from public, anon;
revoke all on function public.rally_territory_summary(text) from public, anon;
grant execute on function public.import_territory_doors(text, jsonb, text) to authenticated;
grant execute on function public.reset_territory_outcomes(text, text[], boolean, text) to authenticated;
grant execute on function public.rally_territory_summary(text) to authenticated;

-- ============================================================ J. BACKFILL ===
/* THE LAST THING THIS FILE DOES. Every ALTER TABLE on public.territories is
   above; this is the only write to it, so no pending deferred trigger event
   can block a later schema change. See the note in §B.

   Deterministic: created_at then id, so a re-run on a replica produces the
   same numbers. territories_seq_uniq is DEFERRABLE INITIALLY DEFERRED, so
   the row_number assignment is checked once at commit rather than row by
   row against a half-numbered table. */
update public.territories t
   set seq = n.rn
  from (select team_id, id,
               row_number() over (partition by team_id order by created_at, id) as rn
          from public.territories) n
 where t.team_id = n.team_id and t.id = n.id and t.seq is null;

update public.territories set uuid = gen_random_uuid() where uuid is null;

/* The same DO block 0012 uses, extended to the three new server-owned
   columns: if any of them is writable by authenticated, this file refuses
   to finish. A grant that leaked would otherwise be invisible until a phone
   used it. */
do $$
declare v_leak text;
begin
  select string_agg(column_name || ':' || privilege_type, ', ')
    into v_leak
    from information_schema.column_privileges
   where table_schema = 'public' and grantee = 'authenticated'
     and privilege_type in ('INSERT','UPDATE')
     and ((table_name = 'territories' and column_name in ('seq','uuid','cycle_keep')));
  if v_leak is not null then
    raise exception '0018: authenticated can write a server-owned column (%)', v_leak;
  end if;
end $$;
