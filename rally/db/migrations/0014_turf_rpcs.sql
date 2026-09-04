-- RALLY v41 — STAGE B. The authoritative turf operations.
--
-- Every function here is SECURITY DEFINER with `search_path = ''`, so every
-- identifier is schema-qualified or the function does not compile — a
-- compile-time proof in place of a runtime hope. `pg_temp` is deliberately
-- absent from the path rather than merely placed last: a caller controls
-- what exists in their temp schema, and the surface is removed instead of
-- ordered around. 0005's smart_split_territory keeps `public, pg_temp`
-- because it is certified, shipped code that v41 does not reopen.
--
-- SECURITY DEFINER is also the AUTHORIZATION MECHANISM, not just a
-- convenience: running as the owner is what the 0010 and 0013 triggers test
-- with `current_user <> 'authenticated'` to tell an authoritative operation
-- from an ordinary client upsert. No client can become the owner.
--
-- CLIENTS DO NOT AUTHOR HISTORY. set_territory_assignments takes the
-- DESIRED CURRENT SET of profile ids and diffs it against the open entries;
-- assignedAt, assignedBy, assignedByName, unassignedAt, the open/closed
-- transitions, duplicate prevention and history preservation are all the
-- server's. The same holds for save_territory's initial assignees and for
-- the split inheritance in 0015.

-- ---------------------------------------------------------------- shared ---

/* Caller identity and capability, derived and never accepted. Raises
   rather than returning false, because every caller here treats a failure
   as fatal and a shared refusal keeps the messages identical. */
create or replace function public.rally_require_leader()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_uid uuid; v_role text; v_disabled boolean; v_team uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'turf: not authenticated' using errcode = '42501';
  end if;
  select team_id, role, disabled into v_team, v_role, v_disabled
    from public.profiles where id = v_uid;
  if not found or v_team is null then
    raise exception 'turf: no team' using errcode = '42501';
  end if;
  if v_disabled then
    raise exception 'turf: user is disabled' using errcode = '42501';
  end if;
  if v_role not in ('leader','manager','owner') then
    raise exception 'turf: requires leader, manager or owner (role %)', v_role
      using errcode = '42501';
  end if;
  return v_uid;
end $$;

create or replace function public.rally_my_team()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$ select team_id from public.profiles where id = auth.uid() $$;

/* Turn a desired CURRENT SET into ledger entries, by diffing against what
   is open. The server owns every timestamp and every transition; the only
   thing the caller supplies is WHO SHOULD BE ASSIGNED NOW. */
create or replace function public.rally_diff_assignees(
  p_prior   jsonb,
  p_desired uuid[],
  p_team    uuid,
  p_by      uuid,
  p_at      bigint,
  p_extra   jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_out    jsonb := '[]'::jsonb;
  v_open   uuid[];
  e        jsonb;
  u        uuid;
  v_by_nm  text;
begin
  select coalesce(name, '') into v_by_nm from public.profiles where id = p_by;

  select coalesce(array_agg(distinct x), '{}'::uuid[]) into v_open
    from jsonb_array_elements(public.rally_open_entries(p_prior)) e2,
         lateral (select case when e2->>'userId' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                              then (e2->>'userId')::uuid end x) s
   where x is not null;

  /* Close every open entry the desired set no longer names. An UNRESOLVED
     open entry (a device-local id that leaked through the client's old
     `toProfile(...) || localId` fallback) is closed too: it cannot appear
     in a desired set, because a desired set is uuids. Its history is kept,
     as always — closing an entry is not deleting it. */
  for e in select value from jsonb_array_elements(coalesce(p_prior->'entries', '[]'::jsonb)) loop
    if e->>'unassignedAt' is null then
      u := case when e->>'userId' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                then (e->>'userId')::uuid end;
      if u is null or not (coalesce(p_desired, '{}'::uuid[]) @> array[u]) then
        /* The operation id is stamped on entries this call CLOSED as well
           as on the ones it opened. Without it a close-only operation —
           "take Jake off this hood" — leaves no trace to be idempotent
           against, and a replayed request would re-close whoever was
           assigned in the meantime. */
        v_out := v_out || (jsonb_set(e, '{unassignedAt}', to_jsonb(p_at))
                 || coalesce(p_extra, '{}'::jsonb));
        continue;
      end if;
    end if;
    v_out := v_out || e;
  end loop;

  -- open a NEW entry for each newly desired rep. An already-open rep is
  -- skipped, never given a second entry (I1).
  foreach u in array coalesce(p_desired, '{}'::uuid[]) loop
    if v_open @> array[u] then continue; end if;
    v_out := v_out || (jsonb_build_object(
      'userId', u::text,
      'name', coalesce((select name from public.profiles where id = u), ''),
      'assignedBy', p_by::text,
      'assignedByName', v_by_nm,
      'assignedAt', p_at,
      'unassignedAt', null) || coalesce(p_extra, '{}'::jsonb));
  end loop;

  return jsonb_build_object('entries', public.rally_sort_entries(v_out));
end $$;

/* Every desired assignee must be a REAL, ELIGIBLE, SAME-TEAM profile.
   Historical entries may name anyone; a NEW open assignment may not. */
create or replace function public.rally_validate_assignees(p_ids uuid[], p_team uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare u uuid; v_ok boolean;
begin
  foreach u in array coalesce(p_ids, '{}'::uuid[]) loop
    select true into v_ok from public.profiles
     where id = u and team_id = p_team and not coalesce(disabled, false);
    if not found then
      raise exception 'turf: % is not an active member of this team', u
        using errcode = '42501';
    end if;
  end loop;
  if array_length(p_ids, 1) is distinct from
     (select count(distinct x) from unnest(coalesce(p_ids, '{}'::uuid[])) x) then
    raise exception 'turf: the same rep appears twice in one assignment'
      using errcode = '22023';
  end if;
end $$;

-- ------------------------------------------------- set_territory_assignments ---

create or replace function public.set_territory_assignments(
  p_territory_id text,
  p_assignees    uuid[],
  p_operation_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid;
  v_team uuid;
  v_t    public.territories%rowtype;
  v_at   bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  v_uid  := public.rally_require_leader();
  v_team := public.rally_my_team();

  select * into v_t from public.territories
   where team_id = v_team and id = p_territory_id for update;
  if not found then
    raise exception 'turf: hood % not found for this team', p_territory_id using errcode = '42501';
  end if;
  if v_t.deleted_at is not null then
    raise exception 'turf: hood % has been deleted', p_territory_id using errcode = '55000';
  end if;

  /* Idempotency. A retry of an operation that already committed is a READ
     of a server fact, answered from the ledger rather than applied twice —
     the same rule 0005 established for Smart Split. */
  if exists (select 1 from jsonb_array_elements(v_t.assignees->'entries') e
              where e->>'viaOperation' = p_operation_id) then
    return jsonb_build_object('status', 'already_committed',
      'territory_id', p_territory_id, 'assignees', v_t.assignees);
  end if;

  perform public.rally_validate_assignees(p_assignees, v_team);

  update public.territories
     set assignees = public.rally_diff_assignees(
           v_t.assignees, p_assignees, v_team, v_uid, v_at,
           jsonb_build_object('viaOperation', p_operation_id))
   where team_id = v_team and id = p_territory_id;

  select * into v_t from public.territories where team_id = v_team and id = p_territory_id;
  return jsonb_build_object('status', 'ok', 'territory_id', p_territory_id,
    'assignees', v_t.assignees, 'assignees_rev', v_t.assignees_rev);
end $$;

-- ------------------------------------------------------------ save_territory ---

create or replace function public.save_territory(
  p_id        text,
  p_name      text,
  p_polygon   jsonb,
  p_homes     integer,
  p_archived  boolean,
  p_assignees uuid[]      default null,
  p_operation_id text     default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid;
  v_team uuid;
  v_new  boolean;
  v_t    public.territories%rowtype;
  v_at   bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  v_uid  := public.rally_require_leader();
  v_team := public.rally_my_team();

  select * into v_t from public.territories
   where team_id = v_team and id = p_id for update;
  v_new := not found;

  if v_new then
    insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, data)
    values (v_team, p_id, coalesce(p_name, ''), coalesce(p_polygon, '[]'::jsonb),
            p_homes, coalesce(p_archived, false), v_uid,
            jsonb_build_object('id', p_id, 'name', coalesce(p_name, ''),
                               'points', coalesce(p_polygon, '[]'::jsonb),
                               'homes', p_homes,
                               'createdAt', v_at, 'updatedAt', v_at));
  else
    if v_t.deleted_at is not null then
      raise exception 'turf: hood % has been deleted', p_id using errcode = '55000';
    end if;
    update public.territories
       set name = coalesce(p_name, name),
           polygon = coalesce(p_polygon, polygon),
           -- null means "leave it alone", exactly as every sibling field
           -- here does; wiping a door count nobody mentioned is not an edit
           homes = coalesce(p_homes, homes),
           archived = coalesce(p_archived, archived),
           data = jsonb_set(jsonb_set(jsonb_set(data,
                    '{name}', to_jsonb(coalesce(p_name, name))),
                    '{points}', coalesce(p_polygon, polygon)),
                    '{updatedAt}', to_jsonb(v_at))
     where team_id = v_team and id = p_id;
  end if;

  -- The caller states WHO SHOULD BE ASSIGNED, never assignment history.
  if p_assignees is not null then
    perform public.rally_validate_assignees(p_assignees, v_team);
    select * into v_t from public.territories where team_id = v_team and id = p_id;
    update public.territories
       set assignees = public.rally_diff_assignees(
             v_t.assignees, p_assignees, v_team, v_uid, v_at,
             case when p_operation_id is null then '{}'::jsonb
                  else jsonb_build_object('viaOperation', p_operation_id) end)
     where team_id = v_team and id = p_id;
  end if;

  select * into v_t from public.territories where team_id = v_team and id = p_id;
  return jsonb_build_object('status', case when v_new then 'created' else 'updated' end,
    'territory_id', p_id, 'assignees', v_t.assignees, 'assignees_rev', v_t.assignees_rev);
end $$;

-- ------------------------------------------------------ start_territory_cycle ---

/* Clear Outcomes. Moves ONE monotonic boundary and touches NOTHING else:
   no pin, no knock, no note, no customer, no assignment. Every "reset" the
   rep sees is derived from this timestamp at read time, which is why the
   operation is instant on a hood of any size and why nothing it does can
   be lost. */
create or replace function public.start_territory_cycle(
  p_territory_id text,
  p_at           timestamptz default null,
  p_operation_id text        default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid;
  v_t    public.territories%rowtype;
  v_at   timestamptz := coalesce(p_at, clock_timestamp());
begin
  perform public.rally_require_leader();
  v_team := public.rally_my_team();

  /* CLAMP THE CALLER'S CLOCK. The boundary is monotone forward and there is
     no way back, so a phone whose clock is a year fast would black out a
     hood permanently: every door reads unworked, every metric reads zero,
     and no later call can walk it back. A boundary in the FUTURE means
     nothing anyway — it is the moment a fresh pass began. A small tolerance
     absorbs ordinary device skew; beyond that, the server's own clock is
     the answer. */
  if v_at > clock_timestamp() + interval '5 minutes' then
    v_at := clock_timestamp();
  end if;

  select * into v_t from public.territories
   where team_id = v_team and id = p_territory_id for update;
  if not found then
    raise exception 'turf: hood % not found for this team', p_territory_id using errcode = '42501';
  end if;

  -- MONOTONE FORWARD. A boundary that moved backwards would resurrect
  -- outcomes a leader had already cleared, and would make the client's
  -- "merge only a newer cycle" rule unable to tell a stale page from a
  -- real change. A retry with the same or an older stamp is a no-op.
  if v_t.cycle_started_at is not null and v_at <= v_t.cycle_started_at then
    return jsonb_build_object('status', 'already_current',
      'territory_id', p_territory_id, 'cycle_started_at', v_t.cycle_started_at);
  end if;

  update public.territories set cycle_started_at = v_at
   where team_id = v_team and id = p_territory_id;

  return jsonb_build_object('status', 'ok', 'territory_id', p_territory_id,
    'cycle_started_at', v_at, 'operation_id', p_operation_id);
end $$;

-- ------------------------------------------------------------- clear_pin_dnk ---

/* THE ONLY LEGITIMATE WAY TO CLEAR BLACK.
   An ordinary edit never does it — not a rep's, and not a leader's (0013).
   Clearing a do-not-knock is a decision with legal weight, so it takes an
   explicit action, a reason, an idempotency key, and leaves an indelible
   event behind. The event log has no UPDATE or DELETE grant (0001), so the
   record of the clear cannot later be removed by anyone. */
create or replace function public.clear_pin_dnk(
  p_pin_id       text,
  p_reason       text,
  p_operation_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid;
  v_team  uuid;
  v_p     public.pins%rowtype;
  v_at    bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_ev    text := 'dnkclear-' || p_operation_id;
  v_hist  jsonb;
begin
  v_uid  := public.rally_require_leader();
  v_team := public.rally_my_team();

  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'turf: clearing do-not-knock needs a reason' using errcode = '22023';
  end if;
  if coalesce(btrim(p_operation_id), '') = '' then
    raise exception 'turf: clearing do-not-knock needs an operation id' using errcode = '22023';
  end if;

  -- idempotent on the operation id: the event IS the record of the clear
  if exists (select 1 from public.events where team_id = v_team and id = v_ev) then
    return jsonb_build_object('status', 'already_committed', 'pin_id', p_pin_id);
  end if;

  select * into v_p from public.pins where team_id = v_team and id = p_pin_id for update;
  if not found then
    raise exception 'turf: door % not found for this team', p_pin_id using errcode = '42501';
  end if;
  if public.rally_dnk_from_history(v_p.data) is null and v_p.disposition <> 'dnk' then
    return jsonb_build_object('status', 'not_dnk', 'pin_id', p_pin_id);
  end if;

  insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user, data)
  values (v_team, v_ev, p_pin_id, 'dnk_clear', 'dnk_clear', v_at, v_uid,
          jsonb_build_object('id', v_ev, 'ts', v_at, 'pinId', p_pin_id,
                             'disposition', 'dnk_clear', 'reason', p_reason,
                             'repId', v_uid::text, 'territoryId', v_p.territory_id));

  /* The clear rides in the door's history as well as the event log, so the
     ordinary history union carries it to every device — including a v40
     one, which has no idea what a dnk_clear is but will union it forward
     regardless, and whose own dnk-restoring logic does not exist. */
  v_hist := coalesce(v_p.data->'history', '[]'::jsonb);
  if jsonb_typeof(v_hist) <> 'array' then v_hist := '[]'::jsonb; end if;

  update public.pins
     set disposition = 'unworked',
         data = jsonb_set(jsonb_set(jsonb_set(v_p.data,
                  '{history}', v_hist || jsonb_build_object(
                     'ts', v_at, 'disposition', 'dnk_clear',
                     'reason', p_reason, 'dm', false, 'note', '')),
                  '{disposition}', '"unworked"'::jsonb),
                  '{updatedAt}', to_jsonb(greatest(v_at,
                     coalesce((v_p.data->>'updatedAt')::bigint, 0) + 1)))
   where team_id = v_team and id = p_pin_id;

  return jsonb_build_object('status', 'ok', 'pin_id', p_pin_id, 'cleared_at', v_at);
end $$;

-- ------------------------------------------------------------------ grants ---

revoke execute on function public.rally_require_leader()                    from public;
revoke execute on function public.rally_my_team()                           from public;
revoke execute on function public.rally_diff_assignees(jsonb, uuid[], uuid, uuid, bigint, jsonb) from public;
revoke execute on function public.rally_validate_assignees(uuid[], uuid)    from public;
revoke execute on function public.set_territory_assignments(text, uuid[], text) from public;
revoke execute on function public.save_territory(text, text, jsonb, integer, boolean, uuid[], text) from public;
revoke execute on function public.start_territory_cycle(text, timestamptz, text) from public;
revoke execute on function public.clear_pin_dnk(text, text, text)           from public;

grant execute on function public.set_territory_assignments(text, uuid[], text) to authenticated;
grant execute on function public.save_territory(text, text, jsonb, integer, boolean, uuid[], text) to authenticated;
grant execute on function public.start_territory_cycle(text, timestamptz, text) to authenticated;
grant execute on function public.clear_pin_dnk(text, text, text)           to authenticated;
