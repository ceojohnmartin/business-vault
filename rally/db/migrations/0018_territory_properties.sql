-- RALLY v42 — 0018. TERRITORY IDENTITY, SERVER-SIDE PROPERTY IMPORT, AND
-- SELECTIVE RE-KNOCK.
--
-- Everything here is ADDITIVE. No table is rewritten, no existing column
-- changes type, no trigger body is replaced, no policy is dropped, and no
-- existing row's MEANING changes: after this file runs, every territory,
-- pin and event row still says exactly what it said before, byte for byte,
-- across name, polygon, geom, data, the assignee ledger, its revision, the
-- open-assignee mirror and the cycle boundary. Applying it twice changes
-- nothing.
--
-- ONE THING DOES MOVE, AND IT IS LOAD-BEARING. The §J backfill is an UPDATE,
-- so territories_touch bumps updated_at on every territory row. That is not
-- a side effect to be apologised for — it is the ONLY reason the new columns
-- ever reach a phone. js/sync.js pulls with a cursor on updated_at; a row
-- whose stamp did not move is a row no device ever asks for again, so seq
-- and uuid would exist on the server and nowhere else. The cost is one extra
-- page of territories per device on the first sync after the apply, applied
-- idempotently by mergeServerOwned. Territories are counted in tens.
--
-- No pin row and no event row is touched at all, by anything in this file.
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
-- §C's columns, added here so that ALL of this table's DDL precedes any
-- write to it. See the note under the default below.
alter table public.territories
  add column if not exists cycle_keep text[] not null default '{}';
alter table public.territories
  add column if not exists cycle_keep_at timestamptz;

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

  /* A client cannot choose its own number: whatever arrived is discarded.

     THIS LOCK IS TAKEN ON EVERY PROPOSED ROW, INCLUDING ONE THAT IS ABOUT
     TO TURN OUT TO BE AN UPDATE. PostgreSQL fires BEFORE INSERT row
     triggers on the proposed tuple of `INSERT ... ON CONFLICT DO UPDATE`
     BEFORE it detects the conflict, so an ordinary sync push of an existing
     hood arrives here too. Verified on a replica: after an update-only
     upsert the backend still holds advisory lock 24957470/hashtext(team).

     Skipping it on the conflict path looks like an obvious saving and is a
     trap: it would make the ORDER in which a transaction takes the seq lock
     and a territory row lock depend on which rows of a batch happen to be
     new, and an order that varies is exactly what deadlocks. The rule this
     file holds to instead is one order, everywhere:

         rally_turf_seq  BEFORE  any territories row lock.

     Every client write already obeys it, because this trigger runs first.
     The one path that did not was smart_split_territory_v41, which row-locks
     the parent and only then inserts the children — the opposite order, and
     a real cycle: reproduced 7 times in 8 on a replica. §K takes the same
     lock at the top of that function so both paths agree. */
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
   door was ever written either way.

   `cycle_keep_at` IS WHAT STOPS IT GOING STALE, and it is not decoration.
   start_territory_cycle — the ordinary "Clear Outcomes" button, live since
   0014 and NOT modified by this file — moves cycle_started_at and knows
   nothing about a keep-list. Without a stamp, a manager who did a selective
   reset in March and then pressed plain Clear Outcomes in April would still
   have March's Go Backs held purple, because the array would still be
   sitting there. So the keep-list applies ONLY while the boundary it was
   written with is still the current one:

       cycle_keep counts  <=>  cycle_keep_at >= cycle_started_at

   Any later boundary from any other path silently retires it, which is
   exactly what "clear outcomes" should mean. */
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

/* AND SOMETHING HAS TO FILL THEM.

   The first draft of this file added the columns and stopped, which left
   two columns that were NULL on every row forever: js/sync.js builds the
   events payload from a fixed list — team_id, id, pin_id, type, disposition,
   at_ms, by_user, data — and nothing was going to put a value in either.

   Adding them to that payload is the obvious fix and the wrong one. A client
   that sent a column the server did not have yet would take a 400 from
   PostgREST and dead-letter the whole batch of knocks, so it would create a
   hard ordering dependency between a migration and a published build — and
   a v37 or v40 phone, which will never be rebuilt, would never fill them at
   all.

   So the server fills them, from data it already holds:

     territory_id      the client has sent data->>'territoryId' on every
                       knock since v39; failing that, the door's own stamp.
     prev_disposition  the most recent OUTCOME in the door's history strictly
                       before this event. Derived rather than reported,
                       because by the time an event is pushed the pin row
                       already carries the new outcome — the push order is
                       territories, pins, then events — so "what it was" is
                       not observable from the pin at that moment.

   It only ever fills a NULL. An RPC that already knows the answer — the
   import and the reset below both do — keeps the value it supplied. */
create or replace function public.events_derive_context()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_hist jsonb;
  v_pin_tid text;
  v_best jsonb;
  v_e    jsonb;
  v_ts   bigint;
  v_best_ts bigint := null;
begin
  if new.pin_id is null then return new; end if;

  if new.territory_id is null then
    new.territory_id := nullif(btrim(coalesce(new.data->>'territoryId', '')), '');
  end if;

  /* SELECT ... INTO sets EVERY target to NULL when no row is found. The
     first draft passed new.territory_id straight into the INTO list, so a
     knock whose door row was not visible — a pin not yet pulled, a pin in
     another team, a race against the pin's own insert — had the hood the
     client had just supplied in the blob overwritten with NULL. The read
     goes into its own variables, and only what was found is used. */
  if new.territory_id is null or new.prev_disposition is null then
    select coalesce(p.data->'history', '[]'::jsonb), p.territory_id
      into v_hist, v_pin_tid
      from public.pins p
     where p.team_id = new.team_id and p.id = new.pin_id;
    if new.territory_id is null then new.territory_id := v_pin_tid; end if;
  end if;

  if new.prev_disposition is null and jsonb_typeof(v_hist) = 'array' then
    for v_e in select * from jsonb_array_elements(v_hist)
    loop
      /* Only the six real outcomes. A dnk_clear is an administrative act,
         not something that happened at the door, and naming it as a
         "previous status" would put a value in this column that no screen
         and no pin image knows what to do with. */
      if jsonb_typeof(v_e) = 'object'
         and (v_e->>'disposition') in ('unworked','nothome','goback','notint','sold','dnk')
      then
        v_ts := public.rally_ms(v_e->>'ts');
        if v_ts is not null and v_ts < new.at_ms
           and (v_best_ts is null or v_ts >= v_best_ts) then
          v_best_ts := v_ts; v_best := v_e;
        end if;
      end if;
    end loop;
    if v_best is not null then new.prev_disposition := v_best->>'disposition'; end if;
  end if;

  return new;
end $$;

drop trigger if exists events_derive_context on public.events;
create trigger events_derive_context
  before insert on public.events
  for each row execute function public.events_derive_context();

-- ============================================== D2. MEMBERSHIP IS ONE FACT ===
/* THE DEFECT THIS EXISTS FOR, reproduced on a replica before it was written:
   the import matched an existing door and set pins.territory_id, but every
   RALLY client builds its local record from `data` alone (js/sync.js
   applyPins: `localizePin(row.data)`) and pushes the column back out of
   that record (`territory_id: rec.territoryId || null`, rowFor). So the
   membership never reached the phone, and the rep's very next knock wrote
   it back as NULL. A hood imported minutes earlier reported "0 Houses" and
   "0 Sales", and the do-not-knock scan in §G stopped seeing the door.

   Two writes are needed and both are here, because either alone still
   leaves a window:

     1. THE IMPORT WRITES BOTH. The match branch in §F now sets the column
        and the blob in the same statement, so the next pull hands the
        phone a record that already knows its hood.

     2. AND THE SERVER KEEPS THEM IN STEP. A phone that pulled BEFORE the
        import still holds the old blob, and its next push would clear the
        column again. So a client write may not drop a door out of a hood
        the door is physically standing in.

   The second rule is deliberately narrow. It fires only on a CLEAR —
   old hood set, incoming column NULL — because that is the whole of the
   defect. A move from one hood to another is a different and deliberate
   act and is left alone. It also requires the old hood to still be LIVE
   and to have a readable outline: a deleted, archived or unreadable hood
   cannot prove anything, so the clear stands, and the ordinary
   reshape-and-drop-out case (the door is now OUTSIDE) is unaffected.
   That is exactly the client's own rule — STORE.hoodOf is
   geometry-canonical — enforced on the side that cannot be an old build.

   It NEUTRALISES, it does not refuse, for 0013's reason: pins push in
   batches and a RAISE would dead-letter the honest knocks beside it. The
   rep's disposition, note, history and coordinates from that write are all
   kept; one derived field is corrected.

   `current_user <> 'authenticated'` is the same unspoofable test 0010 and
   0013 use: SECURITY DEFINER functions run as the owner, so the import,
   the reset and an admin script are never second-guessed by it. The blob
   mirror below the check is deliberately NOT gated that way — it is an
   invariant, not an authorization rule, and it costs nothing to hold for
   every writer. */
create or replace function public.pins_territory_guard()
returns trigger
language plpgsql
security invoker                     -- current_user is the authorization test
set search_path = ''
as $$
declare
  v_geom gis.geometry;
begin
  if tg_op = 'UPDATE'
     and current_user = 'authenticated'
     and old.territory_id is not null
     and new.territory_id is null
     -- BETWEEN is false for NaN, which double precision can hold
     and new.lat between -90 and 90 and new.lng between -180 and 180
  then
    select t.geom into v_geom
      from public.territories t
     where t.team_id = new.team_id and t.id = old.territory_id
       and t.deleted_at is null and not t.archived;
    /* st_covers, not st_contains: a door sitting exactly on its own hood's
       edge is in it. The test names ONE hood, so the shared-edge ambiguity
       between two neighbours never arises here. */
    if v_geom is not null
       and gis.st_covers(v_geom, gis.st_setsrid(gis.st_makepoint(new.lng, new.lat), 4326))
    then
      new.territory_id := old.territory_id;
    end if;
  end if;

  /* ONE FACT, TWO PLACES. Whenever there IS a hood, the blob says the same
     thing the column does — so a client that reads only `data` cannot be
     told something different from the one the server counts by.

     A NULL column leaves the blob alone ON PURPOSE. js/sync.js withholds
     the column when the territory is not on the server yet, while the local
     record keeps its hood; the claim rides in `data` until the territory
     arrives and claimRepair re-queues the door. Mirroring a NULL would
     erase that claim on the echo and undo the very thing this section is
     about. */
  if new.territory_id is not null
     and jsonb_typeof(new.data) = 'object'
     and new.data->>'territoryId' is distinct from new.territory_id then
    new.data := jsonb_set(new.data, '{territoryId}', to_jsonb(new.territory_id));
  end if;

  return new;
end $$;

drop trigger if exists pins_territory_guard on public.pins;
create trigger pins_territory_guard
  before insert or update on public.pins
  for each row execute function public.pins_territory_guard();

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

/* THE TWO THE FIRST DRAFT GOT WRONG, and the reason the import took 83.7 s
   for 500 doors against 60,000 pins while the client's own transport
   deadline is 6 s (js/cloud.js TIMEOUT_MS).

   The point index above is on the GEOMETRY. Tiers 3 and 4 compare
   `::gis.geography` — metres, not degrees, which is the whole reason they
   are written that way — and a geography operand does not match a geometry
   operator class, so both tiers were parallel sequential scans over every
   live pin in the database, per door. Measured on a 60k-pin replica:
   EXPLAIN showed `Parallel Seq Scan on pins` for both.

   Tier 3's address half was unindexed for the same kind of reason: the
   predicate is lower(btrim(address)), and an index on `address` cannot
   answer it.

   Both are partial on the live rows, which is the only set either tier
   asks about, and both are `if not exists` so a re-apply is a no-op. The
   geometry index above is kept: it is what a future "which doors are in
   this polygon" question wants. */
create index if not exists pins_point_live_geog_gist
  on public.pins using gist ((gis.st_setsrid(gis.st_makepoint(lng, lat), 4326)::gis.geography))
  where deleted_at is null;

create index if not exists pins_address_live_idx
  on public.pins (team_id, (lower(btrim(address))))
  where deleted_at is null;

/* Deliberately NOT unique. A unique index is the right long-term shape, but
   it would fail to build if production already holds two rows for one
   property — and an apply that aborts on legacy data is a worse outcome
   than an apply that leaves the duplicate visible. db/preflight/
   v42-import-preflight.editor.sql counts them; the unique index becomes
   safe, and belongs in a later file, once that count reads zero. Until
   then §F enforces the same thing under a lock, which is what actually
   stops new duplicates. */

-- ================================================== E2. A TOTAL NUMBER READ ===
/* The one place a caller-supplied number is turned into a double.

   Total by construction: every input has an answer, and the answer for
   anything that is not a number is NULL. It exists because the alternative —
   guessing at the shape with a regex — got it wrong twice: once by capping
   the number of decimal places, and once by rejecting exponent notation.
   Same discipline as rally_ms, which has answered "or NULL, never a raise"
   for timestamps since 0010. */
create or replace function public.rally_num(p_text text)
returns double precision
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_text is null then return null; end if;
  return p_text::double precision;
exception when others then
  return null;
end $$;

/* THE SAME DISCIPLINE FOR TEXT — and the reason the "allowlist" below is
   an allowlist at all.

   `v_d->>'owner'` names the key `owner`, but `->>` on an OBJECT returns the
   whole object serialised as text. So a provider that answers
   `owner: {name, mailingAddress, ethnicity, estimatedIncome}` had its entire
   response stored under an allowlisted key — protected characteristics
   included — while the comment above it promised the opposite. Reproduced
   on a replica, and js/property.js already builds `owner` as an object, so
   this was not hypothetical.

   This reads a value ONLY when it is a scalar. An object or an array is not
   a property attribute RALLY knows how to store, so it becomes NULL rather
   than a blob of somebody's schema. The length cap is the second half of
   the same idea: a field is an attribute, not an envelope.

   CLAUDE.md §7 — "Protected-characteristic vendor fields such as ethnicity
   are never stored or exposed by RALLY. Future vendor proxies use explicit
   field allowlists rather than forwarding full vendor responses." */
create or replace function public.rally_txt(p_val jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when jsonb_typeof(p_val) in ('string','number','boolean')
              then left(btrim(
                     case when jsonb_typeof(p_val) = 'string' then p_val #>> '{}'
                          else p_val::text end), 200)
         end
$$;

-- ============================================ E3. THE OPERATION LEDGER ===
/* WHERE "HAVE I ALREADY DONE THIS?" IS ALLOWED TO BE ANSWERED FROM.

   The first draft answered it from public.events, keyed on the caller's own
   operation id. public.events is INSERT-able by every active team member —
   it has to be, it is where knocks land — and the policy only requires that
   the row be the writer's own. So a rep could insert 'import-<id>' before a
   leader used that id, and the leader's import would either be answered
   "already_committed" with the REP'S OWN jsonb as its result, or (after the
   first fix, which checked the type and the hood) refused outright. Both
   are a veto by a user with no authority over turf, and events carries no
   UPDATE or DELETE grant, so the squatted row can never be removed.
   Reproduced on a replica both times.

   Narrowing the check was the wrong shape of fix: every field it tested —
   type, and the territory events_derive_context derives from the blob — is
   a field the same rep can write. The ledger has to live somewhere a client
   cannot reach at all.

   THIS TABLE HAS NO POLICIES AND NO GRANTS, and RLS is on. Even if a future
   migration granted it by accident, RLS with no policy denies every row to
   every non-owner. The two SECURITY DEFINER RPCs run as the owner, which is
   the only way in.

   The audit trail is unchanged and still lands in public.events — but its
   id is now a server-minted uuid rather than 'import-' || the caller's
   string, because a predictable primary key in a client-writable table is
   the same veto wearing a different hat: a planted row would collide and
   abort the leader's transaction. */
create table if not exists public.rally_operations (
  team_id      uuid        not null references public.teams(id) on delete cascade,
  kind         text        not null,
  op_id        text        not null,
  territory_id text,
  event_id     text,
  result       jsonb       not null default '{}'::jsonb,
  by_user      uuid,
  at           timestamptz not null default now(),
  primary key (team_id, kind, op_id)
);
alter table public.rally_operations enable row level security;
revoke all on public.rally_operations from public;
revoke all on public.rally_operations from anon, authenticated;

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
  -- server-minted, so no client can plant a colliding audit row: see §E3
  v_ev        text   := 'import-' || pg_catalog.gen_random_uuid()::text;
  v_out       jsonb;
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
  v_inelig    int := 0;
  v_prior     jsonb;
  v_prior_tid  text;
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

  /* Idempotent on the operation id, read from the ledger in §E3 — a table
     no client can write, so the answer is always this function's own. A
     retry that lost its response is answered with the original counts
     rather than importing the same neighbourhood twice.

     An id reused against a DIFFERENT hood is an error, not a retry: the
     caller asked for something this ledger row is not a record of, and the
     honest answer is to say so rather than report someone else's counts.
     Every client already mints a fresh id per operation. */
  select territory_id, result into v_prior_tid, v_prior
    from public.rally_operations
   where team_id = v_team and kind = 'territory_import' and op_id = p_operation_id;
  if found then
    if v_prior_tid is distinct from p_territory_id then
      raise exception 'import: operation id % was already used for hood %', p_operation_id, v_prior_tid
        using errcode = '23505';
    end if;
    return jsonb_set(coalesce(v_prior, '{}'::jsonb), '{status}', '"already_committed"');
  end if;

  /* A STALL IS AN ERROR, NOT A COMPANY-WIDE FREEZE.

     This function takes a team-wide advisory lock and the hood's row lock
     and holds both to commit. With the matcher indexed (§E) that is
     milliseconds — 500 doors against 60,159 pins measured at 221 ms — but
     an unindexed replica, a lock left held by a stuck session, or a hood
     somebody else is reshaping can still turn "slow" into "everyone waits".
     Without a timeout there is nothing bounding that: every other manager's
     import blocks on rally_import, and every phone's territories push
     blocks behind the row lock. 15 seconds is well past any healthy run and
     well inside the client's own patience, so a stall surfaces as a
     refusal the manager can retry rather than as a frozen company. */
  set local lock_timeout = '15s';

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
    /* A payload carrying "nope" for a latitude must be COUNTED as unusable —
       a raise here would abort the whole import, so one malformed row in a
       five-thousand-door neighbourhood would throw away the other four
       thousand nine hundred and ninety-nine.

       This used to be an anchored numeric regex, and the regex was WRONG in
       a way that lost houses silently. It capped the fraction at 15 digits,
       so a provider sending 41.0000000000000001 — 16 digits, well inside
       what a double holds and well inside what a building centroid can be —
       was counted "unusable" and its house was simply not imported. It also
       rejected exponent notation, which any JSON serialiser may emit.

       rally_num does the only thing that is actually total: it tries the
       cast and answers NULL when the cast cannot be made. A JSON number is
       taken directly, because the JSON parser already validated it. */
    v_lat := case when jsonb_typeof(v_d->'lat') = 'number' then (v_d->>'lat')::double precision
                  else public.rally_num(v_d->>'lat') end;
    v_lng := case when jsonb_typeof(v_d->'lng') = 'number' then (v_d->>'lng')::double precision
                  else public.rally_num(v_d->>'lng') end;

    if v_lat is null or v_lng is null
       or v_lat < -90 or v_lat > 90 or v_lng < -180 or v_lng > 180 then
      v_bad := v_bad + 1;
      continue;
    end if;

    /* RESIDENTIAL ONLY, CHECKED HERE TOO. The client already drops what its
       provider rules judged ineligible — a school, a church, a warehouse —
       and sends only res.eligible. This is the server refusing to take the
       client's word for it. It costs one comparison and it is the difference
       between "the app promises" and "the database checked". A payload that
       says nothing about eligibility is treated as eligible, because that is
       what every provider path sends today. */
    if (v_d->>'eligible') = 'false' then
      v_inelig := v_inelig + 1;
      continue;
    end if;

    v_pt := gis.st_setsrid(gis.st_makepoint(v_lng, v_lat), 4326);
    if not gis.st_intersects(v_t.geom, v_pt) then
      v_outside := v_outside + 1;
      continue;
    end if;

    -- rally_txt, not ->> : an object under one of these keys is not an
    -- identifier, and serialising it would make one out of somebody's schema
    v_src    := nullif(coalesce(public.rally_txt(v_d->'source'), ''), '');
    /* THE DEMO GRID IS NOT A PROPERTY RECORD. js/property.js can lay a
       deterministic lattice with invented street numbers for a preview,
       one chip away in the settings sheet. The client refuses to import
       those doors; this refuses them again, because a client-side rule is
       a rule until somebody calls the RPC directly. Counted as ineligible
       rather than raised: a mixed payload's real houses still land. */
    if v_src = 'demo' then
      v_inelig := v_inelig + 1;
      continue;
    end if;
    v_ext    := nullif(coalesce(public.rally_txt(v_d->'externalId'), ''), '');
    v_parcel := nullif(coalesce(public.rally_txt(v_d->'parcelId'), ''), '');
    v_addr   := nullif(coalesce(public.rally_txt(v_d->'address'), ''), '');
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
    /* AND IT NEVER MERGES TWO DOORS THAT BOTH CARRY AN IDENTITY AND DISAGREE.

       The first version matched on distance alone, so a door arriving with
       a provider key that matched nothing — i.e. a property the provider
       has just told us is distinct — was merged into whichever neighbour
       was nearest. That is how a duplex, a condo stack or two halves of a
       semi collapse into one pin.

       Refusing tier 4 outright for any identified door was the other
       extreme and was worse: the door a rep placed by hand carries no
       provider key at all, and proximity is the ONLY thing that can stop
       the import putting a second pin on that same roof — which is the
       failure the owner named first. So the rule is neither "always" nor
       "never": tier 4 still catches a door with no identity to compare,
       and stands aside only where both sides have one and they differ. */
    if v_match is null then
      select id into v_match from public.pins
       where team_id = v_team and deleted_at is null
         and gis.st_dwithin(
               gis.st_setsrid(gis.st_makepoint(lng, lat), 4326)::gis.geography,
               v_pt::gis.geography, 12)
         and not (v_ext is not null and v_src is not null
                  and coalesce(data->'prop'->>'externalId','') <> ''
                  and (coalesce(data->'prop'->>'source',''), data->'prop'->>'externalId')
                      is distinct from (v_src, v_ext))
         and not (v_parcel is not null
                  and coalesce(data->'prop'->>'parcelId','') <> ''
                  and data->'prop'->>'parcelId' <> v_parcel)
       limit 1;
    end if;

    if v_match is not null then
      /* KNOWN PROPERTY. Its outcome, its history, its notes and its
         customer are untouched — that is the entire point of a permanent
         property record. The only thing that may change is which hood it
         currently belongs to, and only when it has none.

         BOTH HALVES OF THE MEMBERSHIP, in one statement. The first draft
         set only the column, and no client ever saw it: every RALLY build
         reads `data` and pushes the column back out of it, so the next
         knock cleared what the import had just written and the hood
         reported zero houses. See §D2, which also stops a phone that
         pulled before this import from clearing it again. */
      update public.pins
         set territory_id = p_territory_id,
             data = case when jsonb_typeof(data) = 'object'
                         then jsonb_set(data, '{territoryId}', to_jsonb(p_territory_id))
                         else data end
       where team_id = v_team and id = v_match
         and (territory_id is distinct from p_territory_id
              or data->>'territoryId' is distinct from p_territory_id)
         and (territory_id is null
              -- already ours: nothing is being taken, only the blob repaired
              or territory_id = p_territory_id
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
                'city',  coalesce(public.rally_txt(v_d->'city'), ''),
                'state', coalesce(public.rally_txt(v_d->'state'), ''),
                'zip',   coalesce(public.rally_txt(v_d->'zip'), '')),
              /* THE ALLOWLIST. Every stored property attribute, named — and
                 read as a SCALAR, so naming the key is naming the value.
                 `owner` is the one nested shape RALLY stores, and its
                 subkeys are named here for the same reason: a subfield a
                 provider adds later is dropped without a code change. */
              'prop', jsonb_build_object(
                'externalId',    v_ext,
                'parcelId',      v_parcel,
                'source',        coalesce(v_src, 'unknown'),
                'propertyType',  public.rally_txt(v_d->'propertyType'),
                'owner',         case
                  when jsonb_typeof(v_d->'owner') = 'object' then
                    jsonb_strip_nulls(jsonb_build_object(
                      'name',           public.rally_txt(v_d->'owner'->'name'),
                      'mailingAddress', public.rally_txt(v_d->'owner'->'mailingAddress'),
                      'occupied',       public.rally_txt(v_d->'owner'->'occupied')))
                  else to_jsonb(public.rally_txt(v_d->'owner')) end,
                'yearBuilt',     public.rally_txt(v_d->'yearBuilt'),
                'sqft',          public.rally_txt(v_d->'sqft'),
                'lotSqft',       public.rally_txt(v_d->'lotSqft'),
                'lastSaleDate',  public.rally_txt(v_d->'lastSaleDate'),
                'lastSalePrice', public.rally_txt(v_d->'lastSalePrice'),
                'placement',     public.rally_txt(v_d->'placement'))))
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
                        'ineligible', v_inelig,
                        'sent', jsonb_array_length(p_doors))));

  v_out := jsonb_build_object('status', 'ok', 'territory_id', p_territory_id,
    'operation_id', p_operation_id,
    'counts', jsonb_build_object('inserted', v_inserted, 'matched', v_matched,
                'outside', v_outside, 'unusable', v_bad,
                'ineligible', v_inelig,
                'sent', jsonb_array_length(p_doors)));

  insert into public.rally_operations (team_id, kind, op_id, territory_id, event_id, result, by_user)
  values (v_team, 'territory_import', p_operation_id, p_territory_id, v_ev, v_out, v_uid);

  return v_out;
end $$;

-- ================================================= G. RESET FOR RE-KNOCK ===
/* PREPARE A WORKED HOOD FOR ANOTHER PASS.

   This moves a timestamp and records who moved it. It writes no door, it
   deletes nothing, and every knock under every door survives it — a reset
   door shows blue and still answers "what happened here last July".

   p_reset IS THE LIST THE MANAGER TICKED: the outcomes that become Blue
   again. It is deliberately NOT the complement.

   The first version of this function took p_keep — the outcomes to leave
   alone — which is the inverse, and inverting it makes the EMPTY ARRAY mean
   the opposite thing. Passing {} to p_keep reset EVERY door; passing {} to
   p_reset resets nothing. A screen built against the wrong one would blank a
   worked territory for a manager who thought they had ticked nothing, and no
   type would have caught it. The column keeps storing the complement,
   because that is what the paint-time rule needs; the interface speaks the
   language of the screen.

   'dnk' is REFUSED here rather than ignored: black is cleared one door at a
   time through clear_pin_dnk, and silently swallowing it in a list would
   read as an override that had happened. p_include_dnk returns the black
   doors for review instead.

   'sold' is accepted and has no effect on a door with a LIVE agreement:
   effectiveDisposition answers green from the customer record, above the
   boundary, on purpose. The return value says so rather than leaving the
   manager to find out from the map.

   p_include_dnk does not clear black. It returns the doors that are black,
   for the client to clear one at a time through clear_pin_dnk(), each with
   its own reason and its own indelible event. See note 3 in the header. */
create or replace function public.reset_territory_outcomes(
  p_territory_id text,
  p_reset        text[],
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
  v_ev     text := 'reset-' || pg_catalog.gen_random_uuid()::text;   -- §E3
  v_out    jsonb;
  /* THE FOUR OUTCOMES A BOUNDARY CAN ACTUALLY DECIDE.

     'sold' and 'dnk' are deliberately NOT here, and leaving them in was a
     data-loss bug in the first draft. effectiveDisposition answers black
     from the do-not-knock ledger and green from the customer record BEFORE
     it ever looks at the boundary. So a keep-list containing them does not
     "preserve" anything — it resurrects:

       a door whose do-not-knock a manager EXPLICITLY CLEARED went black
       again at the next reset, because the cleared dnk was still the latest
       kept entry in its history and the clear is not an outcome;

       a door whose customer CANCELLED stayed green forever and was never
       handed back to a rep, because the old sold entry was kept.

     Both are silent, both survive every later pass, and neither is visible
     from the map. The keep-list is now only ever drawn from the four states
     a knock can leave behind. */
  v_keepable constant text[] := array['unworked','nothome','goback','notint'];
  v_all    constant text[] := array['unworked','nothome','goback','notint','sold','dnk'];
  v_reset  text[] := coalesce(p_reset, '{}');
  v_keep   text[];
  v_bad    text;
  v_sold   boolean;
  v_dnk    jsonb := '[]'::jsonb;
  v_prior  jsonb;
  v_prior_tid  text;
begin
  v_uid  := public.rally_require_leader();
  v_team := public.rally_my_team();

  if coalesce(btrim(p_operation_id), '') = '' then
    raise exception 'reset: needs an operation id' using errcode = '22023';
  end if;

  /* Only real outcomes may be reset, and a NULL element is a bug in the
     caller rather than a wildcard. Under the old p_keep spelling a typo meant
     "keep nothing", which is the most destructive possible reading of a
     mistake; under p_reset it means "reset nothing", and it is refused
     outright anyway. */
  if array_position(v_reset, null) is not null then
    raise exception 'reset: the outcome list contains a null' using errcode = '22023';
  end if;
  select x into v_bad from unnest(v_reset) x where not (x = any (v_all)) limit 1;
  if v_bad is not null then
    raise exception 'reset: % is not an outcome', v_bad using errcode = '22023';
  end if;
  if 'dnk' = any (v_reset) then
    raise exception 'reset: a do-not-knock is cleared one door at a time through clear_pin_dnk, never in a list'
      using errcode = '22023';
  end if;
  v_sold := 'sold' = any (v_reset);

  -- the column stores the COMPLEMENT, over the KEEPABLE four only
  select coalesce(array_agg(x order by x), '{}') into v_keep
    from unnest(v_keepable) x where not (x = any (v_reset));

  -- same ledger, same reason: §E3. Never public.events, which a rep writes.
  select territory_id, result into v_prior_tid, v_prior
    from public.rally_operations
   where team_id = v_team and kind = 'territory_reset' and op_id = p_operation_id;
  if found then
    if v_prior_tid is distinct from p_territory_id then
      raise exception 'reset: operation id % was already used for hood %', p_operation_id, v_prior_tid
        using errcode = '23505';
    end if;
    return jsonb_set(coalesce(v_prior, '{}'::jsonb), '{status}', '"already_committed"');
  end if;

  set local lock_timeout = '15s';   -- same reason as the import, see §F

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

  /* The same definition of membership the card uses, and the same one the
     phone repaints from: the OUTLINE. A reset applies to the doors inside
     the polygon, not to the doors that happen to still carry its stamp. */
  if p_include_dnk and v_t.geom is not null then
    select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'address', p.address)), '[]'::jsonb)
      into v_dnk
      from public.pins p
     where p.team_id = v_team and p.deleted_at is null
       and gis.st_intersects(v_t.geom, gis.st_setsrid(gis.st_makepoint(p.lng, p.lat), 4326))
       and public.rally_dnk_from_history(p.data) is not null;
  end if;

  update public.territories
     set cycle_started_at = v_at, cycle_keep = v_keep, cycle_keep_at = v_at
   where team_id = v_team and id = p_territory_id;

  insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user,
                             territory_id, data)
  values (v_team, v_ev, null, 'territory_reset', '', v_ms, v_uid, p_territory_id,
          jsonb_build_object('id', v_ev, 'ts', v_ms, 'type', 'territory_reset',
            'territoryId', p_territory_id, 'repId', v_uid::text,
            'operationId', p_operation_id,
            'cycleStartedAt', v_at, 'reset', to_jsonb(v_reset),
            'keep', to_jsonb(v_keep), 'dnkPins', v_dnk));

  v_out := jsonb_build_object('status', 'ok', 'territory_id', p_territory_id,
    'cycle_started_at', v_at, 'reset', to_jsonb(v_reset), 'keep', to_jsonb(v_keep),
    'dnk_pins', v_dnk,
    'sold_note', case when v_sold
      then 'a door with a live agreement stays green: its customer record, not its last knock, is what makes it green'
      else null end);

  insert into public.rally_operations (team_id, kind, op_id, territory_id, event_id, result, by_user)
  values (v_team, 'territory_reset', p_operation_id, p_territory_id, v_ev, v_out, v_uid);

  return v_out;
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
  v_live   bigint;
  v_houses bigint;
  v_sales  bigint;
begin
  /* DISABLED IS NOT JUST "CANNOT WRITE".

     rally_my_team() answers with the caller's team and nothing else — 0014
     left the disabled check to rally_require_leader, which the two writing
     RPCs call. This one does not require a leader, on purpose: a rep needs
     the counts for their own turf. So it has to make the check itself, and
     the first version did not. A disabled account could read a hood's
     number, its permanent uuid, its house count and its sale count — the
     one read path in RALLY that did not require an active user, when every
     RLS policy in 0001 does.

     is_active() is the same function every policy uses, and it defaults to
     false, so a profile row that has gone missing fails closed. */
  if not public.is_active() then
    raise exception 'summary: this account is disabled' using errcode = '42501';
  end if;
  v_team := public.rally_my_team();
  if v_team is null then
    raise exception 'summary: no team' using errcode = '42501';
  end if;

  select * into v_t from public.territories where team_id = v_team and id = p_territory_id;
  if not found then
    raise exception 'summary: hood % not found for this team', p_territory_id
      using errcode = '42501';
  end if;

  /* "Polygon 10 of 100" — N of HOW MANY HAVE EVER BEEN DRAWN.

     Counting live hoods made the card read "Polygon 22 of 15" the moment
     anything was deleted or archived, because a number is never reused
     while the live count falls. Reproduced on a replica. The denominator is
     the highest number ever issued to this team, which is monotone and can
     never be smaller than the numerator. How many are live today is a
     different and also useful number, returned separately rather than
     conflated with it. */
  select coalesce(max(seq), 0) into v_total from public.territories
   where team_id = v_team;
  select count(*) into v_live from public.territories
   where team_id = v_team and deleted_at is null and not archived;

  /* COUNTED BY THE OUTLINE, NOT BY THE STAMP — one definition of
     membership, and the same one the phone uses.

     The first version counted `territory_id = p_territory_id`. The header
     of this file argues, correctly, that "STORE.hoodOf treats geometry as
     canonical with the stamp as a hint ... because a polygon can be
     reshaped after a door is stamped" — and then the card contradicted it.
     The two answers diverge the moment a manager reshapes a hood: the
     phone stops drawing the door inside it and the card still counts it.
     A card that disagrees with the map it sits on is worse than either
     number on its own.

     pins_point_live_gist indexes exactly this predicate. Hoods cannot
     overlap (0016), so containment names at most one hood per door and the
     counts across a team can never double-count.

     A hood whose outline the server cannot read counts nothing and SAYS SO
     (outline_missing below) rather than reporting a confident zero. */
  if v_t.geom is null then
    v_houses := 0; v_sales := 0;
  else
    select count(*) into v_houses from public.pins
     where team_id = v_team and deleted_at is null
       and gis.st_intersects(v_t.geom, gis.st_setsrid(gis.st_makepoint(lng, lat), 4326));

    select count(*) into v_sales
      from public.customers c
     where c.team_id = v_team and c.deleted_at is null
       and exists (select 1 from public.pins p
                    where p.team_id = v_team and p.deleted_at is null
                      and p.id = c.data->>'pinId'
                      and gis.st_intersects(v_t.geom,
                            gis.st_setsrid(gis.st_makepoint(p.lng, p.lat), 4326)));
  end if;

  return jsonb_build_object(
    'territory_id', p_territory_id, 'uuid', v_t.uuid,
    'seq', v_t.seq, 'of', v_total, 'live_hoods', v_live,
    'houses', v_houses, 'sales', v_sales,
    'outline_missing', (v_t.geom is null),
    'cycle_started_at', v_t.cycle_started_at,
    -- only report a keep-list that still belongs to the current boundary
    'cycle_keep', case when v_t.cycle_keep_at is not null
                        and (v_t.cycle_started_at is null or v_t.cycle_keep_at >= v_t.cycle_started_at)
                       then to_jsonb(v_t.cycle_keep) else '[]'::jsonb end);
end $$;

-- =============================================== K. ONE LOCK ORDER, EVERYWHERE ===
/* THE ONLY PATH IN RALLY THAT ROW-LOCKS A TERRITORY AND THEN INSERTS ONE.

   0015's wrapper calls smart_split_territory_core, which takes
   `select ... for update` on the parent (0005:149) and afterwards inserts
   the children — and each child insert takes rally_turf_seq in §B's
   trigger. Every other writer takes rally_turf_seq first. Two orders is a
   cycle, and it is not theoretical: with v42 applied, 8 concurrent splits
   against a single-row territories upsert of the same parent deadlocked in
   7 runs out of 8 on a replica; with §B's trigger dropped, 0 in 6.

   The fix is one line, and it is here rather than in a new copy of 0015
   because the wrapper is all that needs to change: taking the lock before
   the core runs puts this path in the same order as every other one. The
   body below is 0015's, unchanged apart from that line — if 0015 is ever
   revised, revise this with it.

   ROLLBACK_v42.sql restores 0015's version verbatim. */
create or replace function public.smart_split_territory_v41(
  p_parent_id    text,
  p_operation_id text,
  p_children     jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res jsonb;
  v_ids text[];
  v_team uuid;
begin
  -- v42 §K: rally_turf_seq BEFORE any territories row lock. See §B.
  v_team := public.rally_my_team();
  if v_team is not null then
    perform pg_advisory_xact_lock(hashtext('rally_turf_seq'), hashtext(v_team::text));
  end if;

  v_res := public.smart_split_territory_core(
             p_parent_id, p_operation_id, public.rally_split_strip_children(p_children));
  if coalesce(v_res->>'status', '') = 'already_committed' then
    return v_res;   -- a retry must not re-inherit and re-close
  end if;
  select coalesce(array_agg(value #>> '{}'), '{}'::text[]) into v_ids
    from jsonb_array_elements(coalesce(v_res->'child_ids', '[]'::jsonb));
  perform public.rally_split_inherit(p_parent_id, v_ids, p_operation_id);
  return v_res || jsonb_build_object('assignment_inherited', true);
end $$;

-- ============================================================== I. GRANTS ===
/* SELECT on every column this file added — see note 1 in the header. The
   pull asks for all columns; a column authenticated cannot read takes the
   whole sync down. */
grant select (seq, uuid, cycle_keep, cycle_keep_at) on public.territories to authenticated;
grant select (territory_id, prev_disposition) on public.events to authenticated;

/* NO CLIENT WRITES EITHER OF THE NEW EVENT COLUMNS.

   The first draft granted INSERT on both, reasoning that a phone authors
   events. But events_derive_context fills them from data the server already
   holds, so no client NEEDS them — and a granted column on an append-only
   log that no policy can correct is a column a rep can forge. A knock could
   have claimed to have happened in another hood, or to have changed a
   status it never changed, and nothing downstream could tell.

   Making them read-only takes the same surgery 0012 did on territories and
   pins, and for the same reason. public.events still carries a TABLE-level
   INSERT grant, and a table-level grant automatically covers every column
   added afterwards — so omitting a column grant achieved nothing, and
   PostgreSQL will not let you revoke one column out of a table-level
   privilege either. Verified on a replica both ways: a rep could insert a
   row naming both columns and forge the audit trail, and the column-scoped
   REVOKE was silently a no-op.

   So the table-wide grant is replaced by the exact column list the client
   already writes. Adding a column to public.events after this point does
   NOT hand it to any client, which is the property 0012 was after.

   The four territory columns need none of this: that table's grant is
   already column-scoped, so they are unreachable by omission. */
revoke insert on public.events from authenticated;
grant insert (team_id, id, pin_id, type, disposition, at_ms, by_user, data, created_at)
  on public.events to authenticated;

revoke all on function public.rally_num(text) from public, anon;
grant execute on function public.rally_num(text) to authenticated;
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
     and ((table_name = 'territories'
            and column_name in ('seq','uuid','cycle_keep','cycle_keep_at'))
       or  (table_name = 'events'
            and column_name in ('territory_id','prev_disposition')));
  if v_leak is not null then
    raise exception '0018: authenticated can write a server-owned column (%)', v_leak;
  end if;
end $$;
