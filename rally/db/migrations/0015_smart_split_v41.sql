-- RALLY v41 — STAGE B part 2. Smart Split inherits the COMPLETE current
-- assignee set.
--
-- 0005 is not reopened: it stays exactly as certified, and this file adds
-- the assignment contract as a separate, additive step that the RPC calls
-- at the end of its own transaction. Everything therefore commits or rolls
-- back together with the audit claim, the parent retirement and the child
-- creation — including a deferred overlap failure from 0016, which fires at
-- COMMIT and takes the whole operation with it.
--
-- THE CONTRACT
--   * every child receives a NEW OPEN entry per CURRENT parent assignee,
--     carrying userId, name, assignedBy, assignedByName, assignedAt,
--     inheritedFromTerritoryId and viaSplit = the operation id
--   * CLOSED parent history is NOT copied into children — a child inherits
--     who works it now, not who worked its parent two seasons ago
--   * the parent's own open entries are explicitly CLOSED at the split
--     instant, and the parent keeps its ENTIRE history
--   * the parent is tombstoned by 0005, as before
--
-- Derived entirely server-side. The client sends child polygons; it does
-- not and cannot author an assignment entry.

create or replace function public.rally_split_inherit(
  p_parent_id text,
  p_child_ids text[],
  p_operation_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_team   uuid;
  v_parent public.territories%rowtype;
  v_at     bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_open   uuid[];
  v_child  text;
begin
  select team_id into v_team from public.profiles where id = v_uid;
  if v_team is null then return; end if;

  select * into v_parent from public.territories
   where team_id = v_team and id = p_parent_id;
  if not found then return; end if;

  -- the parent's CURRENT set, validated: an unresolved legacy assignee is
  -- history and is not carried forward as a new open assignment
  select coalesce(array_agg(distinct p.id), '{}'::uuid[]) into v_open
    from jsonb_array_elements(public.rally_open_entries(v_parent.assignees)) e
    join public.profiles p
      on p.id = (case when e->>'userId' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                      then (e->>'userId')::uuid end)
   where p.team_id = v_team and not coalesce(p.disabled, false);

  -- each child gets FRESH open entries — never a copy of closed history
  foreach v_child in array coalesce(p_child_ids, '{}'::text[]) loop
    update public.territories t
       set assignees = public.rally_diff_assignees(
             coalesce(t.assignees, '{"entries": []}'::jsonb), v_open, v_team, v_uid, v_at,
             jsonb_build_object('inheritedFromTerritoryId', p_parent_id,
                                'viaSplit', p_operation_id))
     where t.team_id = v_team and t.id = v_child;
  end loop;

  /* The parent's open entries close AT THE SPLIT INSTANT. Its whole
     history stays: the hood is retired, and who worked it is part of the
     record of the turf those children came from. */
  update public.territories t
     set assignees = jsonb_build_object('entries', public.rally_sort_entries((
           select coalesce(jsonb_agg(
                    case when e->>'unassignedAt' is null
                         then jsonb_set(e, '{unassignedAt}', to_jsonb(v_at))
                         else e end), '[]'::jsonb)
             from jsonb_array_elements(coalesce(t.assignees->'entries', '[]'::jsonb)) e)))
   where t.team_id = v_team and t.id = p_parent_id
     and exists (select 1 from jsonb_array_elements(coalesce(t.assignees->'entries', '[]'::jsonb)) e
                  where e->>'unassignedAt' is null);
end $$;

revoke execute on function public.rally_split_inherit(text, text[], text) from public;

/* WIRING, and why the certified 0005 body is RENAMED rather than wrapped
   alongside.

   0005's smart_split_territory is granted to `authenticated`, and it
   inserts each child with whatever `data` the caller supplied. Left as an
   entry point of its own, a leader calling it directly — or any v40 phone,
   which knows no other name — would split a hood on a path where the
   children's assignment is whatever the CLIENT put in data.assignments: a
   cross-team profile, a disabled rep, a string that is not a uuid, and no
   inheritance at all. That is precisely the client-authored assignment
   this stage exists to end.

   So the certified body keeps its behaviour and loses its public name. It
   becomes smart_split_territory_core, executable by nobody but its owner,
   and BOTH public names — the v41 one clients switch to when turfRpc is
   true, and the 0005 one v40 phones keep calling — run the same wrapper:
   strip every client-supplied assignment field from the children, run the
   core (idempotency, parent row lock, capability checks, all as
   certified), then derive the inheritance server-side. One transaction,
   whichever name was called. */
do $$
begin
  if to_regprocedure('public.smart_split_territory_core(text,text,jsonb)') is null then
    alter function public.smart_split_territory(text, text, jsonb)
      rename to smart_split_territory_core;
  end if;
end $$;
revoke all on function public.smart_split_territory_core(text, text, jsonb)
  from public, anon, authenticated;

/* A child arrives as {id, name, polygon, data}. The client may describe the
   child; it may not assign it. */
create or replace function public.rally_split_strip_children(p_children jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(
           case when jsonb_typeof(c->'data') = 'object'
                then jsonb_set(c, '{data}',
                       (c->'data') - 'assignments' - 'assignedTo' - 'assignees'
                                   - 'assigneesRev' - 'cycleStartedAt')
                else c end
           order by ord), '[]'::jsonb)
    from jsonb_array_elements(coalesce(p_children, '[]'::jsonb)) with ordinality t(c, ord)
$$;

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
begin
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

/* The 0005 name, kept for every phone that has not upgraded: same
   signature, same response shape plus `assignment_inherited`, same
   server-derived assignment. A v40 client ignores the extra key. */
create or replace function public.smart_split_territory(
  p_parent_id    text,
  p_operation_id text,
  p_children     jsonb)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.smart_split_territory_v41(p_parent_id, p_operation_id, p_children)
$$;

revoke all on function public.smart_split_territory_v41(text, text, jsonb) from public, anon;
grant execute on function public.smart_split_territory_v41(text, text, jsonb) to authenticated;
revoke all on function public.smart_split_territory(text, text, jsonb) from public, anon;
grant execute on function public.smart_split_territory(text, text, jsonb) to authenticated;
