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

revoke execute on function public.rally_capabilities() from public;
grant execute on function public.rally_capabilities() to authenticated;

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
  select coalesce(jsonb_agg(e order by (e->>'assignedAt')::bigint, e->>'userId'), '[]'::jsonb)
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
    join public.profiles p
      on p.id = (case when e->>'userId' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                      then (e->>'userId')::uuid end)
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
    left join public.profiles pu on pu.id = (case when e->>'userId' ~ '^[0-9a-fA-F-]{36}$' then (e->>'userId')::uuid end)
    left join public.profiles pb on pb.id = (case when e->>'assignedBy' ~ '^[0-9a-fA-F-]{36}$' then (e->>'assignedBy')::uuid end)
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



/* Every CLOSED entry the row already had, carried forward. Matched on
   (userId, assignedAt) — the identity of a run of work — so an entry the
   client's mirror never knew about survives, and one it does know about is
   not duplicated. */
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
            and d->>'assignedAt' = o->>'assignedAt')), '[]'::jsonb)
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
  select coalesce(jsonb_agg(
           case when pr.e is null then d.e
                else pr.e || jsonb_build_object(
                       'name', d.e->'name',
                       'unassignedAt', coalesce(d.e->'unassignedAt', 'null'::jsonb)) end), '[]'::jsonb)
    from jsonb_array_elements(coalesce(p_derived, '[]'::jsonb)) d(e)
    left join lateral (
      select p.e from jsonb_array_elements(coalesce(p_prior->'entries', '[]'::jsonb)) p(e)
       where p.e->>'userId' = d.e->>'userId'
         and p.e->>'assignedAt' = d.e->>'assignedAt'
       limit 1) pr on true
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
    v_incoming := coalesce((new.data->>'updatedAt')::bigint, 0);
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
create or replace function public.rally_legacy_to_entries(p_data jsonb, p_created timestamptz, p_prior jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_src  jsonb := coalesce(p_data->'assignments', '[]'::jsonb);
  v_out  jsonb := '[]'::jsonb;
  e      jsonb;
  v_at   bigint;
begin
  if jsonb_typeof(v_src) <> 'array' or jsonb_array_length(v_src) = 0 then
    -- the oldest shape of all: a scalar assignee and no history
    if coalesce(p_data->>'assignedTo', '') <> '' then
      return jsonb_build_array(jsonb_build_object(
        'userId', p_data->>'assignedTo', 'name', '',
        'assignedBy', null, 'assignedByName', '',
        'assignedAt', coalesce((p_data->>'createdAt')::bigint,
                               (extract(epoch from coalesce(p_created, now())) * 1000)::bigint),
        'unassignedAt', null, 'synthesizedFrom', 'assignedTo'));
    end if;
    return coalesce(p_prior->'entries', '[]'::jsonb);
  end if;

  for e in select value from jsonb_array_elements(v_src) loop
    if coalesce(e->>'userId', '') = '' then continue; end if;
    v_at := coalesce((e->>'assignedAt')::bigint,
                     (extract(epoch from coalesce(p_created, now())) * 1000)::bigint);
    if v_at <= 0 then v_at := 1; end if;
    v_out := v_out || jsonb_build_object(
      'userId', e->>'userId',
      'name', coalesce(e->>'name', ''),
      -- v40 wrote a display NAME here; keep it, and leave assignedBy null
      'assignedBy', case when e->>'assignedBy' ~ '^[0-9a-fA-F-]{36}$' then e->>'assignedBy' end,
      'assignedByName', case when e->>'assignedBy' ~ '^[0-9a-fA-F-]{36}$' then '' else coalesce(e->>'assignedBy', '') end,
      'assignedAt', v_at,
      'unassignedAt', case when e->>'unassignedAt' is null then null else (e->>'unassignedAt')::bigint end);
  end loop;
  return v_out;
end $$;

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
       /* the ledger once it exists, the v40 mirror before the backfill has
          run — the gate must be right at every point in the staged order */
       select 1 from jsonb_array_elements(
           case when jsonb_array_length(coalesce(t.assignees->'entries', '[]'::jsonb)) > 0
                then t.assignees->'entries'
                else coalesce(t.data->'assignments', '[]'::jsonb) end) e
        where e->>'unassignedAt' is null
          and coalesce(e->>'userId', '') <> ''
          and not exists (
            select 1 from public.profiles p
             where (e->>'userId') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
               and p.id = (e->>'userId')::uuid
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

drop trigger if exists rally_config_guard on public.rally_config;
create trigger rally_config_guard
  before insert or update on public.rally_config
  for each row execute function public.rally_config_guard();
