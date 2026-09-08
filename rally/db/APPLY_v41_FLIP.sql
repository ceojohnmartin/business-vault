-- RALLY v41 - THE ASSIGNMENT-AUTHORITY FLIP.
--
-- Sets public.rally_config.assignment_server_authoritative = true, and
-- NOTHING else. One row, one column. No schema change, no function, no
-- trigger, no territory, pin or event row is touched.
--
-- ATOMIC AND FAIL CLOSED. Everything below is inside one transaction. Each
-- assertion runs BEFORE the write, so a project that is not in the exact
-- state this was approved for is refused with a reason and nothing changes.
-- The two assertions after the write prove it took.
--
-- THIS IS A ONE-WAY CUTOVER FOR THE FLEET. Clients LATCH the capability:
-- syncCapabilities only ever writes a capability true, and only a full erase
-- clears it. db/ROLLBACK_v41_FLIP.sql sets this column back to false, which
-- restores the SERVER's behaviour but not the fleet's - a phone that polled
-- during the window stays latched. Approved on that understanding.

begin;

do $rally_flip$
declare
  v_rows  bigint;
  v_bad   bigint;
  v_flag  boolean;
  v_names constant text[] := array[
    'rally_ring_read','rally_ring_to_geom','rally_ring_problem','territories_derive_geom',
    'rally_capabilities','rally_ms','rally_uid','rally_uid_uuid','rally_sort_entries',
    'rally_open_entries','rally_first_open_assignee','rally_open_uuids','rally_mirror_assignments',
    'rally_assert_ledger','rally_keep_closed_history','rally_merge_provenance','territories_assignment',
    'rally_legacy_to_entries','rally_close_duplicate_opens','rally_unresolved_live_assignments',
    'rally_config_guard','rally_dnk_from_history','rally_strip_forged_clears','pins_protect_dnk',
    'events_guard_dnk_clear',
    'rally_keep_open_history','rally_keep_server_clears','rally_require_leader','rally_my_team',
    'rally_diff_assignees','rally_validate_assignees','set_territory_assignments','save_territory',
    'start_territory_cycle','clear_pin_dnk','rally_split_inherit','rally_split_strip_children',
    'smart_split_territory_v41','smart_split_territory','smart_split_territory_core',
    'rally_overlap_tolerance_m2','rally_overlap_m2','assert_no_turf_overlap'];
begin
  -- 1. exactly one config row
  select count(*) into v_rows from public.rally_config;
  if v_rows <> 1 then
    raise exception 'FLIP NOT RUN: rally_config holds % row(s), expected exactly 1', v_rows;
  end if;

  -- 2. the flag is currently FALSE. Idempotence is deliberately NOT offered:
  --    a second run means someone lost track of the state, and that is worth
  --    stopping for rather than silently succeeding.
  select assignment_server_authoritative into v_flag from public.rally_config where id;
  if v_flag is distinct from false then
    raise exception 'FLIP NOT RUN: the flag is already % - refusing to touch it', coalesce(v_flag::text,'null');
  end if;

  -- 3. every Stage A, B and C object is still present at the instant of the
  --    flip, not merely when the preflight ran
  select count(distinct p.proname) into v_rows
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = any(v_names);
  if v_rows <> 43 then
    raise exception 'FLIP NOT RUN: % of 43 Stage A/B/C functions present', v_rows;
  end if;

  -- 4. the three territories triggers and the activation gate are armed
  select count(*) into v_rows from pg_trigger
   where tgrelid = 'public.territories'::regclass and not tgisinternal
     and tgname in ('territories_assignment','territories_derive_geom','territories_no_overlap')
     and tgenabled in ('O','A');
  if v_rows <> 3 then
    raise exception 'FLIP NOT RUN: % of 3 territories triggers enabled', v_rows;
  end if;
  select count(*) into v_rows from pg_trigger
   where tgrelid = 'public.rally_config'::regclass and tgname = 'rally_config_guard'
     and tgenabled in ('O','A');
  if v_rows <> 1 then
    raise exception 'FLIP NOT RUN: rally_config_guard is not armed - the flip would proceed unchecked';
  end if;

  -- 5. territories_assignment is SECURITY INVOKER. If it were DEFINER,
  --    current_user would be the owner on every path and every client upsert
  --    would count as an authoritative RPC - the flip would mean nothing.
  select count(*) into v_rows
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'territories_assignment' and not p.prosecdef;
  if v_rows <> 1 then
    raise exception 'FLIP NOT RUN: territories_assignment is not SECURITY INVOKER';
  end if;

  -- 6. the gate's own count, run here so the refusal names the reason rather
  --    than arriving as a trigger error. rally_config_guard runs it again
  --    inside the UPDATE below; this is belt and braces, not a substitute.
  select public.rally_unresolved_live_assignments() into v_bad;
  if v_bad <> 0 then
    raise exception 'FLIP NOT RUN: % live hood(s) name a CURRENT assignee that is no rep on their team', v_bad;
  end if;

  ------------------------------------------------------------------ the flip
  update public.rally_config set assignment_server_authoritative = true where id;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'FLIP FAILED: the update touched % row(s)', v_rows;
  end if;

  select assignment_server_authoritative into v_flag from public.rally_config where id;
  if v_flag is not true then
    raise exception 'FLIP FAILED: the column did not take (reads %)', coalesce(v_flag::text,'null');
  end if;

  if coalesce((public.rally_capabilities()->>'assignmentServerAuthoritative')::boolean, false) is not true then
    raise exception 'FLIP FAILED: rally_capabilities() does not report it - clients would never see the activation';
  end if;

  raise notice 'FLIP APPLIED: assignment_server_authoritative = true';
end
$rally_flip$;

commit;
