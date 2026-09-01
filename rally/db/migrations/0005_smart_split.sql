-- RALLY v39 — Smart Split becomes ONE server fact.
-- Run once in the Supabase SQL editor, after 0004.
--
-- THE PROBLEM THIS FIXES
-- Smart Split replaces one territory with N weight-balanced children. The
-- client used to do that with N+1 independent writes: N child upserts and
-- one parent tombstone. Every one of them can fail on its own, so the
-- reachable states included "children exist and the parent is still live"
-- (the hood is now covered twice) and "the parent is gone and only some
-- children exist" (a hole in the coverage map with no record of what was
-- meant to be there). Neither is a state any code path intended, and
-- neither announces itself.
--
-- A split is one decision, so it is one transaction. The client still
-- calculates the geometry — that stays exactly as it was, weighting and
-- all — but the COMMIT is a single call that either happens completely or
-- does not happen at all.
--
-- DELIBERATELY NARROW. This is a function for Smart Split, not a generic
-- command framework, not a step toward RALLY OS, and not a place to put
-- future privileged operations. It does one thing.
--
-- Idempotent: safe to run more than once.

-- ================================================= the operation record ===
-- One row per Smart Split that actually committed. Its only jobs are to
-- make a retry of the SAME operation a no-op, and to let a client that lost
-- the response find out what happened.
--
-- No client may write it: the SECURITY DEFINER function below is the only
-- thing that inserts here, and there is no insert/update/delete grant. A
-- client may READ its own team's rows, which is how a device that crashed
-- mid-request learns the outcome.
create table if not exists public.territory_splits (
  team_id      uuid not null references public.teams(id),
  operation_id text not null,
  parent_id    text not null,
  child_ids    jsonb not null default '[]'::jsonb,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  primary key (team_id, operation_id)
);

-- A parent may be split ONCE. This is the concurrency guarantee that does
-- not depend on anyone remembering to take a lock: even if two managers
-- reach the insert simultaneously with different operation ids, the second
-- one violates this index and its whole transaction rolls back.
create unique index if not exists territory_splits_parent_once
  on public.territory_splits (team_id, parent_id);

alter table public.territory_splits enable row level security;

revoke all on public.territory_splits from anon, authenticated;
grant select on public.territory_splits to authenticated;

drop policy if exists territory_splits_select on public.territory_splits;
create policy territory_splits_select on public.territory_splits
  for select to authenticated
  using (team_id = public.my_team_id() and public.is_active());

-- ======================================================== the operation ===
-- smart_split_territory(parent, operation_id, children) -> jsonb
--
--   children: [ { "id": text, "name": text, "polygon": [[lng,lat],...],
--                 "homes": int|null, "data": {...} }, ... ]
--
-- Returns { status, operation_id, parent_id, child_ids }
--   status 'committed'         this call performed the split
--   status 'already_committed' this operation had already been performed;
--                              nothing new was created
--
-- Every refusal raises, so PostgREST answers with a real error status and a
-- client can never mistake one for success.
create or replace function public.smart_split_territory(
  p_parent_id    text,
  p_operation_id text,
  p_children     jsonb
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid      uuid;
  v_team     uuid;
  v_role     text;
  v_disabled boolean;
  v_prior    public.territory_splits%rowtype;
  v_parent   public.territories%rowtype;
  v_child    jsonb;
  v_id       text;
  v_ids      text[] := '{}';
  v_n        int;
begin
  -- 1. IDENTITY IS DERIVED, NEVER ACCEPTED. There is no caller-supplied
  --    user, team or role parameter, so there is nothing to forge.
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'smart split: not authenticated' using errcode = '42501';
  end if;

  -- 2. TEAM AND ROLE COME FROM THE SERVER'S PROFILE ROW
  select team_id, role, disabled
    into v_team, v_role, v_disabled
    from public.profiles where id = v_uid;
  if not found or v_team is null then
    raise exception 'smart split: no team' using errcode = '42501';
  end if;

  /* 3. IDEMPOTENCY, BEFORE the capability checks and scoped to this team.
        A retry of an operation that already committed is a READ of a
        server fact, not a new write, so it is answered even if the caller
        has since been demoted — refusing it would make a client roll back
        state the server actually holds, which is worse than the demotion
        it is trying to honour. A split that has NOT committed has no row
        here, so the offline-manager-then-demoted case still falls through
        to the refusal below, which is the case that matters. */
  select * into v_prior from public.territory_splits
   where team_id = v_team and operation_id = p_operation_id;
  if found then
    if v_prior.parent_id <> p_parent_id then
      raise exception 'smart split: operation % already used for a different parent',
        p_operation_id using errcode = '22023';
    end if;
    return jsonb_build_object(
      'status', 'already_committed', 'operation_id', p_operation_id,
      'parent_id', v_prior.parent_id, 'child_ids', v_prior.child_ids);
  end if;

  -- 4. A DISABLED USER IS NOT A USER
  if v_disabled then
    raise exception 'smart split: user is disabled' using errcode = '42501';
  end if;

  -- 5. LEADERSHIP ONLY — a rep is refused here, not in the UI.
  --    Matches db/capability-matrix.json / the 0003 territory policies.
  if v_role not in ('leader', 'manager', 'owner') then
    raise exception 'smart split: requires leader, manager or owner (role %)',
      v_role using errcode = '42501';
  end if;

  /* 6/7. THE PARENT, UNDER A ROW LOCK.
          FOR UPDATE serialises two managers splitting the same hood: the
          second call blocks here until the first commits, then re-reads the
          committed row and sees the tombstone, so it takes the
          'already split' exit below rather than adding a second set of
          children beside the first. Scoping by team_id is what stops a
          cross-team parent from being touched at all — the row simply is
          not found. */
  select * into v_parent from public.territories
   where team_id = v_team and id = p_parent_id
   for update;
  if not found then
    raise exception 'smart split: parent % not found for this team', p_parent_id
      using errcode = '42501';
  end if;

  /* IDEMPOTENCY AGAIN, NOW THAT WE ARE SERIALISED.
     The check above ran before the lock, so a device retrying while its own
     first request was still in flight saw nothing and would fall through to
     'already deleted or split' — telling it the operation FAILED when its
     own earlier call had just committed it, and making it roll back a
     server fact. Holding the row lock means any competing transaction for
     this parent has finished, so this read sees the truth. */
  select * into v_prior from public.territory_splits
   where team_id = v_team and operation_id = p_operation_id;
  if found then
    return jsonb_build_object(
      'status', 'already_committed', 'operation_id', p_operation_id,
      'parent_id', v_prior.parent_id, 'child_ids', v_prior.child_ids);
  end if;

  if v_parent.deleted_at is not null then
    raise exception 'smart split: parent % is already deleted or split', p_parent_id
      using errcode = '55000';
  end if;

  -- 8. THE CHILDREN MUST BE A REAL SPLIT
  if jsonb_typeof(p_children) <> 'array' then
    raise exception 'smart split: children must be an array' using errcode = '22023';
  end if;
  v_n := jsonb_array_length(p_children);
  if v_n < 2 or v_n > 8 then
    raise exception 'smart split: a split makes between 2 and 8 children, got %', v_n
      using errcode = '22023';
  end if;

  for v_child in select * from jsonb_array_elements(p_children) loop
    v_id := v_child->>'id';
    if v_id is null or length(v_id) = 0 or length(v_id) > 64 then
      raise exception 'smart split: every child needs an id' using errcode = '22023';
    end if;
    if v_id = p_parent_id then
      raise exception 'smart split: a child may not reuse the parent id'
        using errcode = '22023';
    end if;
    if v_id = any(v_ids) then
      raise exception 'smart split: duplicate child id %', v_id using errcode = '22023';
    end if;
    -- a polygon is a closed-enough ring of [lng,lat] pairs, not free JSON
    if jsonb_typeof(v_child->'polygon') <> 'array'
       or jsonb_array_length(v_child->'polygon') < 3 then
      raise exception 'smart split: child % has no usable polygon', v_id
        using errcode = '22023';
    end if;
    if exists (
      select 1 from jsonb_array_elements(v_child->'polygon') pt
       where jsonb_typeof(pt) <> 'array' or jsonb_array_length(pt) <> 2
          or jsonb_typeof(pt->0) <> 'number' or jsonb_typeof(pt->1) <> 'number'
          or (pt->>0)::numeric not between -180 and 180
          or (pt->>1)::numeric not between  -90 and  90
    ) then
      raise exception 'smart split: child % has a malformed polygon point', v_id
        using errcode = '22023';
    end if;
    -- an id that already belongs to a live territory is not a new child
    if exists (select 1 from public.territories
                where team_id = v_team and id = v_id and deleted_at is null) then
      raise exception 'smart split: child id % already exists', v_id
        using errcode = '23505';
    end if;
    v_ids := v_ids || v_id;
  end loop;

  /* 9. CLAIM THE OPERATION FIRST. If a concurrent transaction already
        claimed this parent (unique index) or this operation id (primary
        key), this INSERT fails and everything below is never reached —
        and everything above it in this transaction is rolled back with it.
        There is no window in which children exist without the claim. */
  insert into public.territory_splits (team_id, operation_id, parent_id, child_ids, created_by)
  values (v_team, p_operation_id, p_parent_id, to_jsonb(v_ids), v_uid);

  -- 10. THE CHILDREN
  for v_child in select * from jsonb_array_elements(p_children) loop
    insert into public.territories (team_id, id, name, polygon, homes, data, created_by)
    values (v_team, v_child->>'id',
            coalesce(v_child->>'name', ''),
            coalesce(v_child->'polygon', '[]'::jsonb),
            case when jsonb_typeof(v_child->'homes') = 'number'
                 then (v_child->>'homes')::int else null end,
            case when jsonb_typeof(v_child->'data') = 'object'
                 then v_child->'data' else '{}'::jsonb end,
            v_uid);
  end loop;

  -- 11. AND THE PARENT IS RETIRED, in the same transaction as its children.
  --     Its knock history lives on the doors, which fall inside whichever
  --     child now contains them.
  update public.territories
     set deleted_at = now()
   where team_id = v_team and id = p_parent_id;

  -- 12. THE AUTHORITATIVE RESULT
  return jsonb_build_object(
    'status', 'committed', 'operation_id', p_operation_id,
    'parent_id', p_parent_id, 'child_ids', to_jsonb(v_ids));
end $$;

-- PostgREST exposes this as POST /rest/v1/rpc/smart_split_territory.
-- SECURITY DEFINER is what lets it write territories while the caller's own
-- 0003 policies would not — which is precisely why every check above is
-- inside it, and why it takes no identity parameter.
revoke all on function public.smart_split_territory(text, text, jsonb) from public, anon;
grant execute on function public.smart_split_territory(text, text, jsonb) to authenticated;

-- ------------------------------------------------------------- rollback ---
-- drop function if exists public.smart_split_territory(text, text, jsonb);
-- drop table if exists public.territory_splits;
-- Smart Split then has no server-side commit path at all; the client must
-- be rolled back to a build that does not call it.
