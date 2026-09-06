-- RALLY v41 — STAGE B PART 2 (0015) POST-APPLY VERIFICATION (Supabase SQL
-- Editor form).
--
-- Run AFTER db/APPLY_v41_B2.sql has committed. ROLLBACK-SAFE: the catalog
-- probes only read; the behavioural probes (Smart Split through BOTH public
-- names as a real leader, with client-planted assignments in the children;
-- the refusals; a v40-shaped upsert; a rep's knock) run inside ONE PL/pgSQL
-- subtransaction that is always rolled back by a deliberate exception at
-- the end. No production row is kept, changed or deleted. Only the two
-- pg_temp functions outlive the statement, and they die with the session.
--
-- Result: one row per probe — probe | result | detail — PASS, *** FAIL ***,
-- or INFO (a number to record, no verdict).
--
-- Nothing here flips assignment_server_authoritative, even transiently.

create or replace function pg_temp.b_row(step text, ok boolean, detail text)
returns jsonb language sql immutable as $f$
  select jsonb_build_array(jsonb_build_object('step', step, 'ok', ok, 'detail', detail))
$f$;

create or replace function pg_temp.b2_verify()
returns table(probe text, result text, detail text) language plpgsql as $$
declare
  res      jsonb := '[]'::jsonb;
  n        int;
  n2       int;
  n3       int;
  b        bigint;
  t        text;
  t2       text;
  t3       text;
  j        jsonb;
  rep_id   uuid; boss_id uuid; team uuid;
  hood_id  text; hood_name text; hood_poly jsonb; hood_data jsonb; hood_led jsonb; hood_rev bigint;
  tid      text; tid2 text; tid3 text; pid text; op text;
  now_ms   bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  ok       boolean;
  ok2      boolean;
  ok3      boolean;
  ops      text[] := array['set_territory_assignments(text,uuid[],text)',
                           'save_territory(text,text,jsonb,integer,boolean,uuid[],text)',
                           'start_territory_cycle(text,timestamptz,text)',
                           'clear_pin_dnk(text,text,text)',
                           'smart_split_territory_v41(text,text,jsonb)',
                           'smart_split_territory(text,text,jsonb)'];
  internals text[] := array['rally_require_leader()', 'rally_my_team()',
                            'rally_diff_assignees(jsonb,uuid[],uuid,uuid,bigint,jsonb)',
                            'rally_validate_assignees(uuid[],uuid)',
                            'rally_split_inherit(text,text[],text)',
                            'rally_split_strip_children(jsonb)',
                            'smart_split_territory_core(text,text,jsonb)'];
  f        text;
begin
  -- ======================================================= A. catalog ====
  select string_agg(x, ', ') into t from unnest(ops || internals) x
   where to_regprocedure('public.' || x) is null;
  res := res || pg_temp.b_row('A1 all Stage B functions present: six client-callable doors (0014''s four + both split names) and seven internals', t is null, coalesce('missing: ' || t, 'all present'));
  -- A2 the certified 0005 body under its new name: byte-for-byte the body 0005 shipped
  select md5(replace(p.prosrc, E'\r\n', E'\n')), array_to_string(p.proconfig, ','), l.lanname, p.prosecdef,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') or has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('public', p.oid, 'EXECUTE')
    into t, t2, t3, ok, ok2
    from pg_proc p join pg_language l on l.oid = p.prolang
   where p.oid = to_regprocedure('public.smart_split_territory_core(text,text,jsonb)');
  res := res || pg_temp.b_row('A2 smart_split_territory_core IS the certified 0005 body (LF-normalised md5 8b856cf6…), plpgsql, SECURITY DEFINER, search_path public,pg_temp, executable by NO client role',
    t = '8b856cf630126aee2f0776508b9d1743' and t3 = 'plpgsql' and ok and t2 like '%search_path=public, pg_temp%' and not ok2,
    'md5=' || coalesce(t, '(missing)') || ' lang=' || coalesce(t3, '?') || ' config=' || coalesce(t2, '') || ' client-executable=' || coalesce(ok2::text, '?'));
  -- A2 the two public names are the wrapper
  select l.lanname, p.prosecdef, array_to_string(p.proconfig, ','), p.prosrc like '%smart_split_territory_v41%'
    into t, ok, t2, ok2
    from pg_proc p join pg_language l on l.oid = p.prolang
   where p.oid = to_regprocedure('public.smart_split_territory(text,text,jsonb)');
  res := res || pg_temp.b_row('A2 smart_split_territory (the 0005 NAME) is now the SQL wrapper over smart_split_territory_v41, SECURITY DEFINER, search_path ''''',
    t = 'sql' and ok and t2 like '%search_path=""%' and ok2, 'lang=' || coalesce(t, '?') || ' secdef=' || coalesce(ok::text, '?') || ' config=' || coalesce(t2, ''));
  select l.lanname, p.prosecdef, array_to_string(p.proconfig, ','), p.prosrc like '%smart_split_territory_core%' and p.prosrc like '%rally_split_inherit%' and p.prosrc like '%rally_split_strip_children%'
    into t, ok, t2, ok2
    from pg_proc p join pg_language l on l.oid = p.prolang
   where p.oid = to_regprocedure('public.smart_split_territory_v41(text,text,jsonb)');
  res := res || pg_temp.b_row('A2 smart_split_territory_v41 strips, runs the core, then inherits — plpgsql, SECURITY DEFINER, search_path ''''',
    t = 'plpgsql' and ok and t2 like '%search_path=""%' and ok2, 'lang=' || coalesce(t, '?') || ' config=' || coalesce(t2, ''));
  -- A3 grants
  select string_agg(x, ', ') into t from unnest(ops) x
   where not has_function_privilege('authenticated', 'public.' || x, 'EXECUTE');
  res := res || pg_temp.b_row('A3 the six doors are executable by authenticated', t is null, coalesce('NOT: ' || t, 'all six'));
  select string_agg(x, ', ') into t from unnest(ops || internals) x
   where has_function_privilege('anon', 'public.' || x, 'EXECUTE');
  res := res || pg_temp.b_row('A3 no Stage B function is executable by anon', t is null, coalesce('anon may execute: ' || t, 'none'));
  select string_agg(x, ', ') into t from unnest(internals) x
   where has_function_privilege('authenticated', 'public.' || x, 'EXECUTE') or has_function_privilege('public', 'public.' || x, 'EXECUTE');
  res := res || pg_temp.b_row('A3 the seven internals (the certified core included) are executable by no client role', t is null, coalesce('client may execute: ' || t, 'none'));
  select string_agg(x, ', ') into t from unnest(ops || internals) x
   where to_regprocedure('public.' || x) is not null
     and exists (select 1 from pg_proc p where p.oid = to_regprocedure('public.' || x)
                  and (pg_get_userbyid(p.proowner) in ('anon', 'authenticated')
                       or (p.prosecdef and not coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=%')));
  res := res || pg_temp.b_row('A3 every SECURITY DEFINER function pins its search_path and none is owned by a client role', t is null, coalesce('NOT: ' || t, 'all'));
  -- A4 capabilities: turfRpc now TRUE, the flag still FALSE
  j := public.rally_capabilities();
  res := res || pg_temp.b_row('A4 rally_capabilities() = flag FALSE, turfRpc TRUE (both 0014 and 0015 present), postgis true',
    j->>'assignmentServerAuthoritative' = 'false' and j->>'turfRpc' = 'true' and j->>'postgis' = 'true', j::text);
  select count(*), count(*) filter (where id and not assignment_server_authoritative) into n, n2 from public.rally_config;
  res := res || pg_temp.b_row('A4 rally_config holds ONE row and assignment_server_authoritative = FALSE (the flip has NOT happened)', n = 1 and n2 = 1, n || ' row(s), ' || n2 || ' false');
  -- A5 the writable SECURITY DEFINER set is exactly the named doors (the RLS suite's list)
  select coalesce(string_agg(p.proname, ',' order by p.proname), '') into t
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.prosecdef and p.prorettype <> 'trigger'::regtype and p.provolatile = 'v';
  res := res || pg_temp.b_row('A5 the writable SECURITY DEFINER functions in public are exactly the eight named turf operations',
    t = 'clear_pin_dnk,rally_split_inherit,save_territory,set_territory_assignments,smart_split_territory,smart_split_territory_core,smart_split_territory_v41,start_territory_cycle', t);
  -- A6 no 0016 object; Stage A intact; 0005's audit table intact
  res := res || pg_temp.b_row('A6 no Stage C object (0016) exists',
    not exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace where ns.nspname = 'public' and p.proname in ('rally_overlap_m2','assert_no_turf_overlap','rally_overlap_tolerance_m2'))
    and not exists (select 1 from pg_trigger g join pg_class c on c.oid = g.tgrelid where c.relname = 'territories' and g.tgname = 'territories_no_overlap'), '');
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname in (
      'rally_ring_read','rally_ring_to_geom','rally_ring_problem','territories_derive_geom',
      'rally_capabilities','rally_ms','rally_uid','rally_uid_uuid','rally_sort_entries','rally_open_entries',
      'rally_first_open_assignee','rally_open_uuids','rally_mirror_assignments','rally_assert_ledger',
      'rally_keep_closed_history','rally_merge_provenance','territories_assignment','rally_legacy_to_entries',
      'rally_close_duplicate_opens','rally_unresolved_live_assignments','rally_config_guard',
      'rally_dnk_from_history','rally_strip_forged_clears','events_guard_dnk_clear','pins_protect_dnk');
  select count(*) into n2 from pg_trigger g where g.tgname in ('territories_derive_geom','territories_assignment','rally_config_guard','events_guard_dnk_clear','pins_protect_dnk') and g.tgenabled = 'O';
  res := res || pg_temp.b_row('A6 Stage A intact: 25 functions, 5 triggers enabled, gis USAGE granted, column privileges unchanged',
    n = 25 and n2 = 5 and has_schema_privilege('authenticated', 'gis', 'USAGE')
    and not has_table_privilege('authenticated', 'public.territories', 'INSERT')
    and has_column_privilege('authenticated', 'public.territories'::regclass, 'data', 'UPDATE')
    and not has_column_privilege('authenticated', 'public.territories'::regclass, 'assignees', 'UPDATE'),
    n || ' functions, ' || n2 || ' triggers');
  res := res || pg_temp.b_row('A6 0005''s territory_splits audit table is untouched (RLS on, select for authenticated, no client write)',
    (select relrowsecurity from pg_class where oid = 'public.territory_splits'::regclass)
    and has_table_privilege('authenticated', 'public.territory_splits', 'SELECT')
    and not has_table_privilege('authenticated', 'public.territory_splits', 'INSERT, UPDATE, DELETE'), '');

  -- ========================================================= B. state ====
  select count(*),
         coalesce(sum(case when jsonb_typeof(assignees->'entries') = 'array' then jsonb_array_length(assignees->'entries') else 0 end), 0)
    into n, n2 from public.territories;
  res := res || pg_temp.b_row('B1 INFO ledger totals — must equal part 1''s B1 row (0015 rewrites no row)', true,
    'hoods=' || n || ' entries=' || n2 || ' open=' || (select count(*) from public.territories t4, jsonb_array_elements(t4.assignees->'entries') e where e->>'unassignedAt' is null)
    || ' via_split=' || (select count(*) from public.territories t4, jsonb_array_elements(t4.assignees->'entries') e where e ? 'viaSplit')
    || ' splits_recorded=' || (select count(*) from public.territory_splits));
  select count(*) into n from public.territories t4
   where jsonb_typeof(t4.data) = 'object'
     and (coalesce(t4.data->>'assignedTo', '') is distinct from coalesce(public.rally_first_open_assignee(t4.assignees), '')
          or coalesce(t4.data->'assignments', '[]'::jsonb) is distinct from public.rally_mirror_assignments(t4.assignees)
          or t4.open_assignees is distinct from public.rally_open_uuids(t4.assignees, t4.team_id));
  res := res || pg_temp.b_row('B2 every mirror still agrees with its ledger', n = 0, n || ' disagree');
  select count(*) into n from (
    select t4.team_id, t4.id from public.territories t4, jsonb_array_elements(t4.assignees->'entries') e
     where e->>'unassignedAt' is null group by 1, 2, e->>'userId' having count(*) > 1) z;
  select count(*) into n2 from public.territories t4, jsonb_array_elements(t4.assignees->'entries') e
   where public.rally_ms(e->>'assignedAt') is null or public.rally_ms(e->>'assignedAt') <= 0
      or (e->>'unassignedAt' is not null and (public.rally_ms(e->>'unassignedAt') is null
          or public.rally_ms(e->>'unassignedAt') < public.rally_ms(e->>'assignedAt')));
  res := res || pg_temp.b_row('B3 I1..I3 still hold on every ledger', n = 0 and n2 = 0, n || ' I1, ' || n2 || ' I2/I3 violation(s)');

  -- ============================================ D. behaviour, rolled back ====
  begin
    select t5.team_id, t5.id, t5.name, t5.polygon, t5.data, t5.assignees, t5.assignees_rev
      into team, hood_id, hood_name, hood_poly, hood_data, hood_led, hood_rev
      from public.territories t5
     where t5.deleted_at is null and not t5.archived and t5.geom is not null and jsonb_typeof(t5.data) = 'object'
       and exists (select 1 from public.profiles r where r.team_id = t5.team_id and r.role = 'rep' and not coalesce(r.disabled, false))
       and exists (select 1 from public.profiles b3 where b3.team_id = t5.team_id and b3.role in ('leader','manager','owner') and not coalesce(b3.disabled, false))
     order by t5.team_id, t5.id limit 1;
    if team is null then
      select p.team_id into team from public.profiles p
       where p.role = 'rep' and p.team_id is not null and not coalesce(p.disabled, false)
         and exists (select 1 from public.profiles b3 where b3.team_id = p.team_id and b3.role in ('leader','manager','owner') and not coalesce(b3.disabled, false))
       order by p.team_id limit 1;
    end if;
    select p.id into rep_id from public.profiles p
     where p.role = 'rep' and p.team_id = team and not coalesce(p.disabled, false) order by p.id limit 1;
    select p.id into boss_id from public.profiles p
     where p.role in ('leader','manager','owner') and p.team_id = team and not coalesce(p.disabled, false) order by p.id limit 1;
    if rep_id is null or boss_id is null then
      res := res || pg_temp.b_row('D0 SETUP', false, 'need one enabled rep AND one enabled leader/manager/owner on the same team — behavioural probes skipped');
      raise exception using message = 'v41b-probe-rollback';
    end if;
    res := res || pg_temp.b_row('D0 SETUP', true, 'team ' || team || ' — probing as a real rep and a real leader' || coalesce(', hood ' || hood_id, ''));
    if hood_id is null then
      res := res || pg_temp.b_row('D7 a v40-shaped upsert by a leader still commits', false, 'SKIPPED: no live hood with a geom on a team that has both a rep and a leader');
    end if;
    tid  := 'v41b-probe-' || substr(md5(random()::text), 1, 10);
    tid2 := 'v41b-probe-2-' || substr(md5(random()::text), 1, 10);
    tid3 := 'v41b-probe-3-' || substr(md5(random()::text), 1, 10);
    pid  := 'v41b-probe-pin-' || substr(md5(random()::text), 1, 10);
    op   := 'v41b-op-' || substr(md5(random()::text), 1, 10);

    perform set_config('request.jwt.claims', json_build_object('sub', boss_id)::text, true);
    execute 'set local role authenticated';
    -- D1 the v41 name: an assigned parent, children arriving with PLANTED assignments
    begin
      -- the parent, assigned to the rep through the v40-shaped path (legacy authority is what production runs)
      insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
      values (team, tid, 'probe parent', '[[0.5,0.5],[0.501,0.5],[0.501,0.501],[0.5,0.501]]'::jsonb, 20, false, boss_id, null,
              jsonb_build_object('id', tid, 'assignedTo', rep_id::text, 'updatedAt', now_ms,
                'assignments', jsonb_build_array(jsonb_build_object('userId', rep_id::text, 'name', 'probe rep',
                  'assignedBy', 'probe lead', 'assignedAt', now_ms - 5000, 'unassignedAt', null))));
      select t5.open_assignees = array[rep_id] into ok from public.territories t5 where t5.team_id = team and t5.id = tid;
      res := res || pg_temp.b_row('D1 SETUP a live parent with one current rep (v40-shaped upsert; the ledger follows)', ok, '');
      j := public.smart_split_territory_v41(tid, op, jsonb_build_array(
             jsonb_build_object('id', tid || '-a', 'name', 'probe A', 'polygon', '[[0.5,0.5],[0.5005,0.5],[0.5005,0.501],[0.5,0.501]]'::jsonb, 'homes', 10,
               'data', jsonb_build_object('id', tid || '-a', 'name', 'probe A',
                 'assignedTo', boss_id::text,
                 'assignments', jsonb_build_array(
                   jsonb_build_object('userId', boss_id::text, 'name', 'planted', 'assignedAt', 1, 'unassignedAt', null),
                   jsonb_build_object('userId', 'not-a-uuid-at-all', 'name', '?', 'assignedAt', 2, 'unassignedAt', null)),
                 'assignees', jsonb_build_object('entries', jsonb_build_array(jsonb_build_object('userId', boss_id::text))),
                 'assigneesRev', 99, 'cycleStartedAt', 1)),
             jsonb_build_object('id', tid || '-b', 'name', 'probe B', 'polygon', '[[0.5005,0.5],[0.501,0.5],[0.501,0.501],[0.5005,0.501]]'::jsonb, 'homes', 10,
               'data', jsonb_build_object('id', tid || '-b', 'name', 'probe B', 'assignedTo', '00000000-0000-4000-e000-00000000dead'))));
      select count(*) into n from public.territories t5
       where t5.team_id = team and t5.id in (tid || '-a', tid || '-b') and t5.deleted_at is null and not t5.archived
         and t5.geom is not null and gis.st_isvalid(t5.geom)
         and t5.open_assignees = array[rep_id]
         and jsonb_array_length(t5.assignees->'entries') = 1
         and (t5.assignees->'entries'->0->>'inheritedFromTerritoryId') = tid
         and (t5.assignees->'entries'->0->>'viaSplit') = op
         and (t5.assignees->'entries'->0->>'assignedBy') = boss_id::text
         and t5.data->>'assignedTo' = rep_id::text
         and jsonb_array_length(t5.data->'assignments') = 1
         and (t5.data->'assignments'->0->>'userId') = rep_id::text
         and not (t5.data ? 'assignees') and not (t5.data ? 'assigneesRev') and not (t5.data ? 'cycleStartedAt')
         and t5.cycle_started_at is null;
      select (t5.deleted_at is not null), (select count(*) from jsonb_array_elements(t5.assignees->'entries') e where e->>'unassignedAt' is null),
             jsonb_array_length(t5.assignees->'entries')
        into ok, n2, n3 from public.territories t5 where t5.team_id = team and t5.id = tid;
      res := res || pg_temp.b_row('D1 smart_split_territory_v41: both children live with valid geoms and ONE fresh open entry each = the parent''s current rep (inheritedFromTerritoryId, viaSplit, assignedBy = the leader); mirrors rebuilt from that ledger',
        n = 2 and j->>'status' = 'committed' and (j->>'assignment_inherited')::boolean,
        n || ' child(ren) ok, status=' || coalesce(j->>'status', j::text) || ' assignment_inherited=' || coalesce(j->>'assignment_inherited', '?'));
      res := res || pg_temp.b_row('D1 …NOTHING the client planted in the children''s data became an assignment (a leader, a non-uuid, a stranger, a forged ledger, a rev, a cycle)', n = 2, '');
      res := res || pg_temp.b_row('D1 …the parent is tombstoned, its open entry CLOSED at the split, its whole history kept', ok and n2 = 0 and n3 = 1, 'tombstoned=' || ok || ' open=' || n2 || ' entries=' || n3);
      select (public.rally_ms(t5.data->>'updatedAt') > now_ms) into ok from public.territories t5 where t5.team_id = team and t5.id = tid || '-a';
      res := res || pg_temp.b_row('D1 …and the children carry the authoritative-correction stamp (data.updatedAt above the split instant), so every phone pulls the inherited assignment', ok, '');
      j := public.smart_split_territory_v41(tid, op, '[]'::jsonb);
      select count(*) into n from public.territories t5, jsonb_array_elements(t5.assignees->'entries') e where t5.team_id = team and t5.id in (tid || '-a', tid || '-b');
      res := res || pg_temp.b_row('D1 a retry with the same operation id is already_committed and does NOT re-inherit (still one entry per child)', j->>'status' = 'already_committed' and n = 2, 'status=' || coalesce(j->>'status', '?') || ' child entries=' || n);
    exception when others then
      res := res || pg_temp.b_row('D1 smart_split_territory_v41', false, 'REFUSED: ' || sqlstate || ' ' || sqlerrm);
    end;
    -- D2 the 0005 NAME — what every v40 phone calls — is the same operation now
    begin
      insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
      values (team, tid2, 'probe parent 2', '[[0.52,0.5],[0.521,0.5],[0.521,0.501],[0.52,0.501]]'::jsonb, 20, false, boss_id, null,
              jsonb_build_object('id', tid2, 'assignedTo', rep_id::text, 'updatedAt', now_ms,
                'assignments', jsonb_build_array(jsonb_build_object('userId', rep_id::text, 'name', 'probe rep',
                  'assignedBy', 'probe lead', 'assignedAt', now_ms - 5000, 'unassignedAt', null))));
      j := public.smart_split_territory(tid2, op || '-v40', jsonb_build_array(
             jsonb_build_object('id', tid2 || '-a', 'name', 'probe 2A', 'polygon', '[[0.52,0.5],[0.5205,0.5],[0.5205,0.501],[0.52,0.501]]'::jsonb, 'homes', 10,
               'data', jsonb_build_object('id', tid2 || '-a', 'name', 'probe 2A', 'assignments', '[]'::jsonb)),
             jsonb_build_object('id', tid2 || '-b', 'name', 'probe 2B', 'polygon', '[[0.5205,0.5],[0.521,0.5],[0.521,0.501],[0.5205,0.501]]'::jsonb, 'homes', 10,
               'data', jsonb_build_object('id', tid2 || '-b', 'name', 'probe 2B', 'assignments', '[]'::jsonb))));
      select count(*) into n from public.territories t5
       where t5.team_id = team and t5.id in (tid2 || '-a', tid2 || '-b') and t5.deleted_at is null
         and t5.open_assignees = array[rep_id] and (t5.assignees->'entries'->0->>'viaSplit') = op || '-v40'
         and t5.data->>'assignedTo' = rep_id::text;
      select (t5.deleted_at is not null) into ok from public.territories t5 where t5.team_id = team and t5.id = tid2;
      res := res || pg_temp.b_row('D2 the 0005 NAME (what a v40 phone calls, children sent unassigned as v40 sends them) now inherits the parent''s current rep into both children',
        n = 2 and ok and j->>'status' = 'committed' and (j->>'assignment_inherited')::boolean,
        n || ' child(ren) inherit, parent tombstoned=' || ok || ' status=' || coalesce(j->>'status', j::text));
      res := res || pg_temp.b_row('D2 …with 0005''s response shape intact (status, operation_id, parent_id, child_ids) plus assignment_inherited',
        j ? 'status' and j ? 'operation_id' and j ? 'parent_id' and jsonb_typeof(j->'child_ids') = 'array' and jsonb_array_length(j->'child_ids') = 2, j::text);
      j := public.smart_split_territory_v41(tid2, op || '-v40', '[]'::jsonb);
      res := res || pg_temp.b_row('D2 the same operation id retried through the OTHER name is already_committed (one idempotency record for both names)', j->>'status' = 'already_committed', 'status=' || coalesce(j->>'status', '?'));
    exception when others then
      res := res || pg_temp.b_row('D2 the 0005 name', false, 'REFUSED: ' || sqlstate || ' ' || sqlerrm);
    end;
    -- D3 an UNASSIGNED parent splits into unassigned children, no error
    begin
      insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
      values (team, tid3, 'probe parent 3', '[[0.54,0.5],[0.541,0.5],[0.541,0.501],[0.54,0.501]]'::jsonb, null, false, boss_id, null,
              jsonb_build_object('id', tid3, 'assignedTo', '', 'updatedAt', now_ms));
      j := public.smart_split_territory_v41(tid3, op || '-u', jsonb_build_array(
             jsonb_build_object('id', tid3 || '-a', 'name', 'probe 3A', 'polygon', '[[0.54,0.5],[0.5405,0.5],[0.5405,0.501],[0.54,0.501]]'::jsonb),
             jsonb_build_object('id', tid3 || '-b', 'name', 'probe 3B', 'polygon', '[[0.5405,0.5],[0.541,0.5],[0.541,0.501],[0.5405,0.501]]'::jsonb)));
      select count(*) into n from public.territories t5
       where t5.team_id = team and t5.id in (tid3 || '-a', tid3 || '-b') and t5.deleted_at is null
         and t5.assignees = '{"entries": []}'::jsonb and t5.open_assignees = '{}'::uuid[];
      res := res || pg_temp.b_row('D3 an UNASSIGNED parent splits into unassigned children (nothing to inherit, nothing invented)', n = 2 and j->>'status' = 'committed', n || ' child(ren) unassigned, status=' || coalesce(j->>'status', j::text));
    exception when others then
      res := res || pg_temp.b_row('D3 an unassigned parent', false, 'REFUSED: ' || sqlstate || ' ' || sqlerrm);
    end;
    -- D4 the certified core is not a door
    begin
      j := public.smart_split_territory_core(tid3 || '-a', op || '-core', '[]'::jsonb);
      res := res || pg_temp.b_row('D4 a leader cannot call smart_split_territory_core directly', false, 'ALLOWED');
    exception when others then
      res := res || pg_temp.b_row('D4 a leader cannot call smart_split_territory_core directly (insufficient_privilege on the function)', sqlstate = '42501' and sqlerrm like '%permission denied%', sqlstate || ': ' || left(sqlerrm, 80));
    end;
    -- D5 a split whose cut severs the hood into a self-crossing child is refused WHOLE, through the wrapper too
    begin
      j := public.smart_split_territory_v41(tid3 || '-a', op || '-sever', jsonb_build_array(
             jsonb_build_object('id', tid3 || '-a1', 'name', 'bowtie child', 'polygon', '[[0.54,0.5],[0.5405,0.501],[0.5405,0.5],[0.54,0.501]]'::jsonb),
             jsonb_build_object('id', tid3 || '-a2', 'name', 'ok child', 'polygon', '[[0.5402,0.5],[0.5405,0.5],[0.5405,0.501],[0.5402,0.501]]'::jsonb)));
      res := res || pg_temp.b_row('D5 a split that would create a self-crossing child is refused whole', false, 'ALLOWED: ' || j::text);
    exception when others then
      select (t5.deleted_at is null and not t5.archived) into ok from public.territories t5 where t5.team_id = team and t5.id = tid3 || '-a';
      select count(*) into n from public.territories t5 where t5.team_id = team and t5.id in (tid3 || '-a1', tid3 || '-a2');
      res := res || pg_temp.b_row('D5 a split that would create a self-crossing child is refused whole (22023, no shape repair), the parent stays live, no child exists',
        sqlstate = '22023' and sqlerrm like '%crosses itself%' and ok and n = 0, sqlstate || ': ' || left(sqlerrm, 70) || ' | parent live=' || ok || ' children=' || n);
    end;
    -- D6 0014 still works after 0015 (the two files are one stage)
    begin
      j := public.set_territory_assignments(tid3 || '-b', array[rep_id], op || '-asg');
      select t5.open_assignees = array[rep_id] and t5.assignees_rev >= 2 into ok from public.territories t5 where t5.team_id = team and t5.id = tid3 || '-b';
      res := res || pg_temp.b_row('D6 set_territory_assignments (0014) still works on a child the split just made', ok and j->>'status' = 'ok', 'status=' || coalesce(j->>'status', '?'));
    exception when others then
      res := res || pg_temp.b_row('D6 set_territory_assignments after 0015', false, 'REFUSED: ' || sqlstate || ' ' || sqlerrm);
    end;
    -- D7 v40 still works: the nine-column upsert on a real hood
    if hood_id is not null then
      begin
        insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
        values (team, hood_id, hood_name || ' (probe)', hood_poly, null, false, boss_id, null,
                jsonb_set(hood_data, '{updatedAt}', to_jsonb(now_ms)))
        on conflict (team_id, id) do update set
          team_id = excluded.team_id, id = excluded.id, name = excluded.name, polygon = excluded.polygon,
          homes = excluded.homes, archived = excluded.archived, created_by = excluded.created_by,
          deleted_at = excluded.deleted_at, data = excluded.data;
        select t5.name, t5.assignees, t5.assignees_rev, (t5.geom is not null) into t, j, n, ok
          from public.territories t5 where t5.team_id = team and t5.id = hood_id;
        res := res || pg_temp.b_row('D7 a v40-shaped upsert by a leader (nine columns, merge-duplicates) still commits, ledger untouched, geom re-derived',
          t = hood_name || ' (probe)' and j = hood_led and n = hood_rev and ok, 'name "' || t || '", rev ' || hood_rev || ' -> ' || n);
      exception when others then
        res := res || pg_temp.b_row('D7 a v40-shaped upsert by a leader still commits', false, 'REFUSED: ' || sqlerrm);
      end;
    end if;
    execute 'reset role';

    -- ---- as the REP
    perform set_config('request.jwt.claims', json_build_object('sub', rep_id)::text, true);
    execute 'set local role authenticated';
    begin
      insert into public.pins (team_id, id, lat, lng, address, disposition, data, created_by)
      values (team, pid, 0.6, 0.6, 'probe st', 'nh', jsonb_build_object('disposition', 'nh', 'updatedAt', now_ms), rep_id);
      insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user, data)
      values (team, 'v41b-probe-ev-' || pid, pid, 'knock', 'nh', now_ms, rep_id, '{}'::jsonb);
      res := res || pg_temp.b_row('D8 a rep''s knock (pin + event) still commits', true, '');
    exception when others then
      res := res || pg_temp.b_row('D8 a rep''s knock still commits', false, 'DENIED: ' || sqlerrm);
    end;
    foreach f in array array['smart_split_territory_v41', 'smart_split_territory'] loop
      begin
        case f
          when 'smart_split_territory_v41' then j := public.smart_split_territory_v41(tid3 || '-b', op || '-rep1', jsonb_build_array('{"id":"x1","polygon":[[0,0],[0.001,0],[0.001,0.001]]}'::jsonb, '{"id":"x2","polygon":[[0,0],[0.001,0],[0.001,0.001]]}'::jsonb));
          when 'smart_split_territory'     then j := public.smart_split_territory(tid3 || '-b', op || '-rep2', jsonb_build_array('{"id":"x1","polygon":[[0,0],[0.001,0],[0.001,0.001]]}'::jsonb, '{"id":"x2","polygon":[[0,0],[0.001,0],[0.001,0.001]]}'::jsonb));
        end case;
        res := res || pg_temp.b_row('D8 a REP is refused: ' || f, false, 'ALLOWED');
      exception when others then
        res := res || pg_temp.b_row('D8 a REP is refused by the certified core''s own check (42501): ' || f, sqlstate = '42501' and sqlerrm like 'smart split: requires leader%', sqlstate || ': ' || left(sqlerrm, 80));
      end;
    end loop;
    execute 'reset role';
    execute 'set local role anon';
    begin
      j := public.smart_split_territory_v41(tid3 || '-b', op || '-anon', '[]'::jsonb);
      res := res || pg_temp.b_row('D9 anon cannot execute smart_split_territory_v41', false, 'ALLOWED');
    exception when others then
      res := res || pg_temp.b_row('D9 anon cannot execute smart_split_territory_v41 (insufficient_privilege on the function itself)', sqlstate = '42501' and sqlerrm like '%permission denied%', sqlstate || ': ' || left(sqlerrm, 80));
    end;
    execute 'reset role';

    raise exception using message = 'v41b-probe-rollback';
  exception when others then
    if sqlerrm <> 'v41b-probe-rollback' then
      res := res || pg_temp.b_row('UNEXPECTED ERROR', false, sqlstate || ' ' || sqlerrm);
    end if;
  end;
  begin execute 'reset role'; exception when others then null; end;
  perform set_config('request.jwt.claims', '', true);

  return query
    select r->>'step',
           case when r->>'step' like '%INFO%' then 'INFO'
                when (r->>'ok')::boolean then 'PASS' else '*** FAIL ***' end,
           r->>'detail'
      from jsonb_array_elements(res) with ordinality x(r, ord)
     order by ord;
end $$;

select * from pg_temp.b2_verify();
