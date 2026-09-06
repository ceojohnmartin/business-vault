-- RALLY v41 — STAGE B PART 1 (0014) POST-APPLY VERIFICATION (Supabase SQL
-- Editor form).
--
-- Run AFTER db/APPLY_v41_B1.sql has committed and BEFORE db/APPLY_v41_B2.sql.
-- ROLLBACK-SAFE: the catalog probes only read; the behavioural probes (the
-- four turf operations as a real leader, their refusal for a real rep and
-- for anon, a v40-shaped upsert, a rep's knock, v40's Smart Split) run inside
-- ONE PL/pgSQL subtransaction that is always rolled back by a deliberate
-- exception at the end. No production row is kept, changed or deleted. Only
-- the two pg_temp functions outlive the statement, and they die with the
-- session.
--
-- Result: one row per probe — probe | result | detail — PASS, *** FAIL ***,
-- or INFO (a number to record, no verdict).
--
-- Nothing here flips assignment_server_authoritative, even transiently, and
-- nothing here needs 0015: turfRpc is expected FALSE at this point.

create or replace function pg_temp.b_row(step text, ok boolean, detail text)
returns jsonb language sql immutable as $f$
  select jsonb_build_array(jsonb_build_object('step', step, 'ok', ok, 'detail', detail))
$f$;

create or replace function pg_temp.b1_verify()
returns table(probe text, result text, detail text) language plpgsql as $$
declare
  res      jsonb := '[]'::jsonb;
  n        int;
  n2       int;
  n3       int;
  b        bigint;
  b2       bigint;
  t        text;
  t2       text;
  j        jsonb;
  ts0      timestamptz;
  ts1      timestamptz;
  rep_id   uuid; boss_id uuid; team uuid;
  hood_id  text; hood_name text; hood_poly jsonb; hood_data jsonb; hood_led jsonb; hood_rev bigint;
  tid      text; pid text; pid2 text; op text; op2 text; op3 text;
  now_ms   bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  ok       boolean;
  ok2      boolean;
  nobody   uuid := '00000000-0000-4000-e000-00000000dead';
  ops      text[] := array['set_territory_assignments(text,uuid[],text)',
                           'save_territory(text,text,jsonb,integer,boolean,uuid[],text)',
                           'start_territory_cycle(text,timestamptz,text)',
                           'clear_pin_dnk(text,text,text)'];
  internals text[] := array['rally_require_leader()', 'rally_my_team()',
                            'rally_diff_assignees(jsonb,uuid[],uuid,uuid,bigint,jsonb)',
                            'rally_validate_assignees(uuid[],uuid)'];
  f        text;
begin
  -- ======================================================= A. catalog ====
  -- A1 the eight 0014 functions, by exact signature
  select string_agg(x, ', ') into t from unnest(ops || internals) x
   where to_regprocedure('public.' || x) is null;
  res := res || pg_temp.b_row('A1 all eight 0014 functions present (four operations, four internals)', t is null, coalesce('missing: ' || t, 'all present'));
  -- A1 every one SECURITY DEFINER, search_path pinned to '', owned by a non-client role
  select string_agg(x, ', ') into t from unnest(ops || internals) x
   where to_regprocedure('public.' || x) is not null
     and not exists (select 1 from pg_proc p where p.oid = to_regprocedure('public.' || x)
                      and p.prosecdef
                      and coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=""%'
                      and pg_get_userbyid(p.proowner) not in ('anon', 'authenticated'));
  res := res || pg_temp.b_row('A1 every 0014 function is SECURITY DEFINER with search_path = '''' and a non-client owner', t is null, coalesce('NOT: ' || t, 'all'));
  -- A2 grants: operations reachable by authenticated, nothing by anon, internals by no client role
  select string_agg(x, ', ') into t from unnest(ops) x
   where not has_function_privilege('authenticated', 'public.' || x, 'EXECUTE');
  res := res || pg_temp.b_row('A2 the four operations are executable by authenticated', t is null, coalesce('NOT: ' || t, 'all four'));
  select string_agg(x, ', ') into t from unnest(ops || internals) x
   where has_function_privilege('anon', 'public.' || x, 'EXECUTE');
  res := res || pg_temp.b_row('A2 no 0014 function is executable by anon (Supabase''s default function privileges revoked)', t is null, coalesce('anon may execute: ' || t, 'none'));
  select string_agg(x, ', ') into t from unnest(internals) x
   where has_function_privilege('authenticated', 'public.' || x, 'EXECUTE');
  res := res || pg_temp.b_row('A2 the four internals are not executable by authenticated either', t is null, coalesce('authenticated may execute: ' || t, 'none'));
  -- A3 capabilities: turfRpc still FALSE (0015 not applied), flag FALSE
  j := public.rally_capabilities();
  res := res || pg_temp.b_row('A3 rally_capabilities() = flag false, turfRpc false (0015 not yet applied), postgis true',
    j->>'assignmentServerAuthoritative' = 'false' and j->>'turfRpc' = 'false' and j->>'postgis' = 'true', j::text);
  select count(*), count(*) filter (where id and not assignment_server_authoritative) into n, n2 from public.rally_config;
  res := res || pg_temp.b_row('A3 rally_config holds ONE row and assignment_server_authoritative = FALSE', n = 1 and n2 = 1, n || ' row(s), ' || n2 || ' false');
  -- A4 no 0015 object yet; 0005's smart_split_territory is the certified body under its own name
  select string_agg(f2, ', ') into t from unnest(array['smart_split_territory_core','smart_split_territory_v41','rally_split_inherit','rally_split_strip_children']) f2
   where exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace where ns.nspname = 'public' and p.proname = f2);
  res := res || pg_temp.b_row('A4 no 0015 object exists yet', t is null, coalesce('PRESENT: ' || t, 'none'));
  select md5(replace(p.prosrc, E'\r\n', E'\n')), array_to_string(p.proconfig, ','), l.lanname,
         has_function_privilege('authenticated', p.oid, 'EXECUTE'), has_function_privilege('anon', p.oid, 'EXECUTE')
    into t, t2, f, ok, ok2
    from pg_proc p join pg_language l on l.oid = p.prolang
   where p.oid = to_regprocedure('public.smart_split_territory(text,text,jsonb)');
  res := res || pg_temp.b_row('A4 smart_split_territory is still the certified 0005 body (md5 of its LF-normalised source), plpgsql, search_path public,pg_temp, authenticated yes / anon no',
    t = '8b856cf630126aee2f0776508b9d1743' and f = 'plpgsql' and t2 like '%search_path=public, pg_temp%' and ok and not ok2,
    'md5=' || coalesce(t, '(missing)') || ' lang=' || coalesce(f, '?') || ' config=' || coalesce(t2, '') || ' auth=' || ok || ' anon=' || ok2);
  -- A5 no 0016 object
  res := res || pg_temp.b_row('A5 no Stage C object (0016) exists',
    to_regprocedure('public.rally_overlap_m2(gis.geometry,gis.geometry)') is null
    and not exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace where ns.nspname = 'public' and p.proname in ('rally_overlap_m2','assert_no_turf_overlap','rally_overlap_tolerance_m2'))
    and not exists (select 1 from pg_trigger g join pg_class c on c.oid = g.tgrelid where c.relname = 'territories' and g.tgname = 'territories_no_overlap'), '');
  -- A6 Stage A intact
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname in (
      'rally_ring_read','rally_ring_to_geom','rally_ring_problem','territories_derive_geom',
      'rally_capabilities','rally_ms','rally_uid','rally_uid_uuid','rally_sort_entries','rally_open_entries',
      'rally_first_open_assignee','rally_open_uuids','rally_mirror_assignments','rally_assert_ledger',
      'rally_keep_closed_history','rally_merge_provenance','territories_assignment','rally_legacy_to_entries',
      'rally_close_duplicate_opens','rally_unresolved_live_assignments','rally_config_guard',
      'rally_dnk_from_history','rally_strip_forged_clears','events_guard_dnk_clear','pins_protect_dnk');
  select count(*) into n2 from pg_trigger g join pg_class c on c.oid = g.tgrelid
   where g.tgname in ('territories_derive_geom','territories_assignment','rally_config_guard','events_guard_dnk_clear','pins_protect_dnk') and g.tgenabled = 'O';
  select count(*) into n3 from pg_attribute a where a.attrelid = 'public.territories'::regclass and a.attnum > 0 and not a.attisdropped
     and a.attname in ('geom','assignees','assignees_rev','open_assignees','cycle_started_at');
  res := res || pg_temp.b_row('A6 Stage A intact: 25 functions, 5 triggers enabled, 5 columns, gis USAGE granted',
    n = 25 and n2 = 5 and n3 = 5 and has_schema_privilege('authenticated', 'gis', 'USAGE'),
    n || ' functions, ' || n2 || ' triggers, ' || n3 || ' columns');
  res := res || pg_temp.b_row('A6 column privileges unchanged (table-wide INSERT/UPDATE still revoked, SELECT table-wide)',
    not has_table_privilege('authenticated', 'public.territories', 'INSERT')
    and not has_table_privilege('authenticated', 'public.territories', 'UPDATE')
    and has_table_privilege('authenticated', 'public.territories', 'SELECT')
    and has_column_privilege('authenticated', 'public.territories'::regclass, 'data', 'UPDATE')
    and not has_column_privilege('authenticated', 'public.territories'::regclass, 'assignees', 'UPDATE'), '');
  -- A7 the writable SECURITY DEFINER set is exactly the named doors
  select coalesce(string_agg(p.proname, ',' order by p.proname), '') into t
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.prosecdef and p.prorettype <> 'trigger'::regtype and p.provolatile = 'v';
  res := res || pg_temp.b_row('A7 the writable SECURITY DEFINER functions in public are exactly the five turf doors (0005 + 0014)',
    t = 'clear_pin_dnk,save_territory,set_territory_assignments,smart_split_territory,start_territory_cycle', t);

  -- ========================================================= B. state ====
  -- 0014 rewrites no row: the ledger totals must read exactly as the Stage A
  -- verification left them (production 2026-09-06: hoods=22 entries=12 open=12)
  select count(*),
         coalesce(sum(case when jsonb_typeof(assignees->'entries') = 'array' then jsonb_array_length(assignees->'entries') else 0 end), 0),
         count(*) filter (where cycle_started_at is not null)
    into n, n2, n3 from public.territories;
  res := res || pg_temp.b_row('B1 INFO ledger totals — must equal the Stage A verification''s B1 row (0014 rewrites no row)', true,
    'hoods=' || n || ' entries=' || n2 || ' open=' || (select count(*) from public.territories t2, jsonb_array_elements(t2.assignees->'entries') e where e->>'unassignedAt' is null)
    || ' cycles_started=' || n3 || ' max_rev=' || (select max(assignees_rev) from public.territories));
  select count(*) into n from public.territories t2
   where jsonb_typeof(t2.data) = 'object'
     and (coalesce(t2.data->>'assignedTo', '') is distinct from coalesce(public.rally_first_open_assignee(t2.assignees), '')
          or coalesce(t2.data->'assignments', '[]'::jsonb) is distinct from public.rally_mirror_assignments(t2.assignees)
          or t2.open_assignees is distinct from public.rally_open_uuids(t2.assignees, t2.team_id));
  res := res || pg_temp.b_row('B2 every mirror (scalar, v40 array, uuid[]) still agrees with its ledger', n = 0, n || ' disagree');
  select count(*) into n from (
    select t2.team_id, t2.id from public.territories t2, jsonb_array_elements(t2.assignees->'entries') e
     where e->>'unassignedAt' is null group by 1, 2, e->>'userId' having count(*) > 1) z;
  select count(*) into n2 from public.territories t2, jsonb_array_elements(t2.assignees->'entries') e
   where public.rally_ms(e->>'assignedAt') is null or public.rally_ms(e->>'assignedAt') <= 0
      or (e->>'unassignedAt' is not null and (public.rally_ms(e->>'unassignedAt') is null
          or public.rally_ms(e->>'unassignedAt') < public.rally_ms(e->>'assignedAt')));
  res := res || pg_temp.b_row('B3 I1..I3 still hold on every ledger', n = 0 and n2 = 0, n || ' I1, ' || n2 || ' I2/I3 violation(s)');
  select count(*) into n from public.events where type = 'dnk_clear';
  res := res || pg_temp.b_row('B4 INFO do-not-knock clears recorded so far (expected 0: the operation just arrived)', true, n::text);

  -- ============================================ D. behaviour, rolled back ====
  begin
    select t3.team_id, t3.id, t3.name, t3.polygon, t3.data, t3.assignees, t3.assignees_rev
      into team, hood_id, hood_name, hood_poly, hood_data, hood_led, hood_rev
      from public.territories t3
     where t3.deleted_at is null and not t3.archived and t3.geom is not null and jsonb_typeof(t3.data) = 'object'
       and exists (select 1 from public.profiles r where r.team_id = t3.team_id and r.role = 'rep' and not coalesce(r.disabled, false))
       and exists (select 1 from public.profiles b3 where b3.team_id = t3.team_id and b3.role in ('leader','manager','owner') and not coalesce(b3.disabled, false))
     order by t3.team_id, t3.id limit 1;
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
      res := res || pg_temp.b_row('D9 a v40-shaped upsert by a leader still commits', false, 'SKIPPED: no live hood with a geom on a team that has both a rep and a leader');
    end if;
    tid  := 'v41b-probe-' || substr(md5(random()::text), 1, 10);
    pid  := 'v41b-probe-pin-' || substr(md5(random()::text), 1, 10);
    pid2 := 'v41b-probe-pin2-' || substr(md5(random()::text), 1, 10);
    op   := 'v41b-op-' || substr(md5(random()::text), 1, 10);
    op2  := op || '-2';
    op3  := op || '-3';

    -- ---- as the LEADER: the four operations, through their real bodies
    perform set_config('request.jwt.claims', json_build_object('sub', boss_id)::text, true);
    execute 'set local role authenticated';
    -- D1 save_territory creates a hood WITH its first rep, in one call
    begin
      j := public.save_territory(tid, 'probe hood', '[[0.5,0.5],[0.501,0.5],[0.501,0.501],[0.5,0.501]]'::jsonb, 12, false, array[rep_id], op);
      select (t3.geom is not null and gis.st_isvalid(t3.geom)
              and t3.open_assignees = array[rep_id] and t3.assignees_rev >= 1
              and t3.data->>'assignedTo' = rep_id::text
              and jsonb_array_length(t3.assignees->'entries') = 1
              and (t3.assignees->'entries'->0->>'viaOperation') = op
              and (t3.assignees->'entries'->0->>'assignedBy') = boss_id::text
              and t3.data->>'name' = 'probe hood' and t3.homes = 12 and t3.created_by = boss_id
              and jsonb_array_length(t3.data->'assignments') = 1),
             'status=' || coalesce(j->>'status', '?') || ' open=' || t3.open_assignees::text || ' rev=' || t3.assignees_rev || ' entries=' || jsonb_array_length(t3.assignees->'entries')
        into ok, t from public.territories t3 where t3.team_id = team and t3.id = tid;
      res := res || pg_temp.b_row('D1 save_territory creates a new hood with its first rep: geom, one server-authored open entry (viaOperation, assignedBy = the leader), both mirrors',
        ok and j->>'status' = 'created', t);
      res := res || pg_temp.b_row('D1 …and answers with the ledger and its revision',
        jsonb_typeof(j->'assignees'->'entries') = 'array' and jsonb_typeof(j->'assignees_rev') = 'number' and j->>'territory_id' = tid, j::text);
    exception when others then
      res := res || pg_temp.b_row('D1 save_territory creates a new hood with its first rep', false, 'REFUSED: ' || sqlstate || ' ' || sqlerrm);
    end;
    -- D2 set_territory_assignments: take the rep off, retry, put them back
    begin
      select public.rally_ms(t3.data->>'updatedAt'), t3.assignees_rev into b, b2 from public.territories t3 where t3.team_id = team and t3.id = tid;
      j := public.set_territory_assignments(tid, '{}'::uuid[], op2);
      select (t3.open_assignees = '{}'::uuid[] and t3.assignees_rev = b2 + 1
              and coalesce(t3.data->>'assignedTo', '') = ''
              and (select count(*) from jsonb_array_elements(t3.assignees->'entries') e where e->>'unassignedAt' is not null and e->>'viaOperation' = op2) = 1
              and jsonb_array_length(t3.assignees->'entries') = 1),
             'status=' || coalesce(j->>'status', '?') || ' open=' || t3.open_assignees::text || ' rev=' || t3.assignees_rev,
             (public.rally_ms(t3.data->>'updatedAt') > b)
        into ok, t, ok2 from public.territories t3 where t3.team_id = team and t3.id = tid;
      res := res || pg_temp.b_row('D2 set_territory_assignments to nobody CLOSES the entry (kept, stamped with the operation), rev +1, scalar mirror empty', ok and j->>'status' = 'ok', t);
      res := res || pg_temp.b_row('D2 …and the authoritative-correction stamp moved data.updatedAt above its prior value, so v40 phones will pull it', ok2, '');
      j := public.set_territory_assignments(tid, '{}'::uuid[], op2);
      select t3.assignees_rev into n from public.territories t3 where t3.team_id = team and t3.id = tid;
      res := res || pg_temp.b_row('D2 a retry of the same operation id is answered already_committed and changes nothing', j->>'status' = 'already_committed' and n = b2 + 1, 'status=' || coalesce(j->>'status', '?') || ' rev=' || n);
      j := public.set_territory_assignments(tid, array[rep_id], op3);
      select (t3.open_assignees = array[rep_id] and t3.assignees_rev = b2 + 2 and jsonb_array_length(t3.assignees->'entries') = 2
              and t3.data->>'assignedTo' = rep_id::text and jsonb_array_length(t3.data->'assignments') = 2),
             'open=' || t3.open_assignees::text || ' rev=' || t3.assignees_rev || ' entries=' || jsonb_array_length(t3.assignees->'entries')
        into ok, t from public.territories t3 where t3.team_id = team and t3.id = tid;
      res := res || pg_temp.b_row('D2 re-assigning opens a NEW entry while the closed one survives (I4): two entries, one open, mirrors follow', ok and j->>'status' = 'ok', t);
    exception when others then
      res := res || pg_temp.b_row('D2 set_territory_assignments', false, 'REFUSED: ' || sqlstate || ' ' || sqlerrm);
    end;
    -- D3 validation
    begin
      j := public.set_territory_assignments(tid, array[nobody], op || '-x1');
      res := res || pg_temp.b_row('D3 a uuid that is no active member of the team is refused', false, 'ALLOWED');
    exception when others then
      res := res || pg_temp.b_row('D3 a uuid that is no active member of the team is refused (42501)', sqlstate = '42501', sqlstate || ': ' || left(sqlerrm, 90));
    end;
    begin
      j := public.set_territory_assignments(tid, array[rep_id, rep_id], op || '-x2');
      res := res || pg_temp.b_row('D3 the same rep twice in one call is refused', false, 'ALLOWED');
    exception when others then
      res := res || pg_temp.b_row('D3 the same rep twice in one call is refused (22023)', sqlstate = '22023', sqlstate || ': ' || left(sqlerrm, 90));
    end;
    begin
      j := public.set_territory_assignments('v41b-no-such-hood-' || op, array[rep_id], op || '-x3');
      res := res || pg_temp.b_row('D3 an unknown hood is refused', false, 'ALLOWED');
    exception when others then
      res := res || pg_temp.b_row('D3 an unknown hood is refused (42501)', sqlstate = '42501', sqlstate || ': ' || left(sqlerrm, 90));
    end;
    -- D4 save_territory UPDATE: null means "leave it alone"
    begin
      select t3.assignees_rev, t3.polygon, t3.homes into b2, j, n from public.territories t3 where t3.team_id = team and t3.id = tid;
      j := public.save_territory(tid, 'probe hood renamed', null, null, null, null, null);
      select (t3.name = 'probe hood renamed' and t3.data->>'name' = 'probe hood renamed'
              and t3.homes = n and t3.assignees_rev = b2 and t3.open_assignees = array[rep_id]
              and public.rally_ms(t3.data->>'updatedAt') >= now_ms),
             'status=' || coalesce(j->>'status', '?') || ' name=' || t3.name || ' homes=' || coalesce(t3.homes::text, 'null') || ' rev=' || t3.assignees_rev
        into ok, t from public.territories t3 where t3.team_id = team and t3.id = tid;
      res := res || pg_temp.b_row('D4 save_territory on an existing hood renames it, leaves the outline, the door count and the ledger alone, moves data.updatedAt', ok and j->>'status' = 'updated', t);
    exception when others then
      res := res || pg_temp.b_row('D4 save_territory update', false, 'REFUSED: ' || sqlstate || ' ' || sqlerrm);
    end;
    -- D5 start_territory_cycle: server clock, monotone, clamped
    begin
      j := public.start_territory_cycle(tid, null, op || '-c1');
      select t3.cycle_started_at into ts0 from public.territories t3 where t3.team_id = team and t3.id = tid;
      res := res || pg_temp.b_row('D5 start_territory_cycle with no stamp sets the boundary to the server''s clock',
        j->>'status' = 'ok' and ts0 is not null and ts0 between clock_timestamp() - interval '1 minute' and clock_timestamp() + interval '5 minutes',
        'status=' || coalesce(j->>'status', '?') || ' cycle_started_at=' || coalesce(ts0::text, 'null'));
      j := public.start_territory_cycle(tid, ts0 - interval '1 day', op || '-c2');
      select t3.cycle_started_at into ts1 from public.territories t3 where t3.team_id = team and t3.id = tid;
      res := res || pg_temp.b_row('D5 an OLDER stamp is refused as already_current and nothing moves (monotone forward)',
        j->>'status' = 'already_current' and ts1 = ts0, 'status=' || coalesce(j->>'status', '?'));
      j := public.start_territory_cycle(tid, clock_timestamp() + interval '400 days', op || '-c3');
      select t3.cycle_started_at into ts1 from public.territories t3 where t3.team_id = team and t3.id = tid;
      res := res || pg_temp.b_row('D5 a stamp a year in the FUTURE (a wrong phone clock) is clamped to the server''s clock, never stored',
        j->>'status' = 'ok' and ts1 <= clock_timestamp() + interval '5 minutes' and ts1 >= ts0, 'cycle_started_at=' || coalesce(ts1::text, 'null'));
    exception when others then
      res := res || pg_temp.b_row('D5 start_territory_cycle', false, 'REFUSED: ' || sqlstate || ' ' || sqlerrm);
    end;
    execute 'reset role';

    -- ---- as the REP: a black door to clear later, ordinary work, and every operation refused
    perform set_config('request.jwt.claims', json_build_object('sub', rep_id)::text, true);
    execute 'set local role authenticated';
    begin
      insert into public.pins (team_id, id, lat, lng, address, disposition, data, created_by)
      values (team, pid, 0.6, 0.6, 'probe st', 'dnk',
              jsonb_build_object('disposition', 'dnk', 'updatedAt', now_ms,
                'history', jsonb_build_array(jsonb_build_object('ts', now_ms - 1000, 'disposition', 'dnk', 'reason', null, 'dm', false))), rep_id);
      insert into public.pins (team_id, id, lat, lng, address, disposition, data, created_by)
      values (team, pid2, 0.6, 0.6, 'probe st', 'nh', jsonb_build_object('disposition', 'nh', 'updatedAt', now_ms), rep_id);
      insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user, data)
      values (team, 'v41b-probe-ev-' || pid2, pid2, 'knock', 'nh', now_ms, rep_id, '{}'::jsonb);
      res := res || pg_temp.b_row('D6 a rep''s ordinary work (a black door, a knock, its event) still commits', true, '');
    exception when others then
      res := res || pg_temp.b_row('D6 a rep''s ordinary work still commits', false, 'DENIED: ' || sqlerrm);
    end;
    foreach f in array array['set_territory_assignments', 'save_territory', 'start_territory_cycle', 'clear_pin_dnk'] loop
      begin
        case f
          when 'set_territory_assignments' then j := public.set_territory_assignments(tid, array[rep_id], op || '-r1');
          when 'save_territory'            then j := public.save_territory(tid || '-rep', 'rep turf', '[[0.7,0.7],[0.701,0.7],[0.701,0.701],[0.7,0.701]]'::jsonb, null, false, null, null);
          when 'start_territory_cycle'     then j := public.start_territory_cycle(tid, null, op || '-r2');
          when 'clear_pin_dnk'             then j := public.clear_pin_dnk(pid, 'rep says so', op || '-r3');
        end case;
        res := res || pg_temp.b_row('D7 a REP is refused: ' || f, false, 'ALLOWED');
      exception when others then
        res := res || pg_temp.b_row('D7 a REP is refused (42501): ' || f, sqlstate = '42501' and sqlerrm like 'turf: requires leader%', sqlstate || ': ' || left(sqlerrm, 80));
      end;
    end loop;
    begin
      insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
      values (team, tid || '-rep2', 'rep probe', '[[0.6,0.6],[0.601,0.6],[0.601,0.601],[0.6,0.601]]'::jsonb, null, false, rep_id, null, '{}'::jsonb);
      res := res || pg_temp.b_row('D7 a rep still may NOT create a territory through the table', false, 'ALLOWED — 0003 is not in effect');
    exception when insufficient_privilege then
      res := res || pg_temp.b_row('D7 a rep still may NOT create a territory through the table (0003 unchanged)', true, 'denied, as required');
    end;
    execute 'reset role';

    -- ---- as ANON: nothing is even callable
    execute 'set local role anon';
    begin
      j := public.set_territory_assignments(tid, array[rep_id], op || '-a1');
      res := res || pg_temp.b_row('D8 anon cannot execute set_territory_assignments', false, 'ALLOWED');
    exception when others then
      res := res || pg_temp.b_row('D8 anon cannot execute set_territory_assignments (insufficient_privilege on the function itself)', sqlstate = '42501' and sqlerrm like '%permission denied%', sqlstate || ': ' || left(sqlerrm, 80));
    end;
    begin
      j := public.clear_pin_dnk(pid, 'anon', op || '-a2');
      res := res || pg_temp.b_row('D8 anon cannot execute clear_pin_dnk', false, 'ALLOWED');
    exception when others then
      res := res || pg_temp.b_row('D8 anon cannot execute clear_pin_dnk (insufficient_privilege on the function itself)', sqlstate = '42501' and sqlerrm like '%permission denied%', sqlstate || ': ' || left(sqlerrm, 80));
    end;
    execute 'reset role';

    -- ---- as the LEADER again: the only legitimate way to clear black
    perform set_config('request.jwt.claims', json_build_object('sub', boss_id)::text, true);
    execute 'set local role authenticated';
    begin
      j := public.clear_pin_dnk(pid, '   ', op || '-d0');
      res := res || pg_temp.b_row('D6 clearing without a reason is refused', false, 'ALLOWED');
    exception when others then
      res := res || pg_temp.b_row('D6 clearing without a reason is refused (22023)', sqlstate = '22023', sqlstate || ': ' || left(sqlerrm, 80));
    end;
    begin
      j := public.clear_pin_dnk(pid, 'the owner asked in writing (probe)', op || '-d1');
      select p.disposition, p.data->>'disposition',
             (select count(*) from jsonb_array_elements(p.data->'history') h where h->>'disposition' = 'dnk_clear' and h->>'reason' = 'the owner asked in writing (probe)'),
             public.rally_ms(p.data->>'updatedAt')
        into t, t2, n, b from public.pins p where p.team_id = team and p.id = pid;
      select count(*) into n2 from public.events e where e.team_id = team and e.id = 'dnkclear-' || op || '-d1' and e.type = 'dnk_clear' and e.disposition = 'dnk_clear' and e.by_user = boss_id and e.data->>'reason' = 'the owner asked in writing (probe)';
      res := res || pg_temp.b_row('D6 clear_pin_dnk by a leader clears the door: column and mirror unworked, a dnk_clear knock with the reason in its history, updatedAt above the incoming clock',
        j->>'status' = 'ok' and t = 'unworked' and t2 = 'unworked' and n = 1 and b > now_ms,
        'status=' || coalesce(j->>'status', '?') || ' disposition=' || t || ' data.disposition=' || t2 || ' history clears=' || n);
      res := res || pg_temp.b_row('D6 …and leaves an indelible dnk_clear EVENT (the guard trigger admits the server''s own write)', n2 = 1, n2 || ' event row(s) dnkclear-<operation>');
      j := public.clear_pin_dnk(pid, 'again', op || '-d1');
      select count(*) into n3 from public.events e where e.team_id = team and e.pin_id = pid and e.type = 'dnk_clear';
      res := res || pg_temp.b_row('D6 a retry of the same operation id is already_committed and writes no second event', j->>'status' = 'already_committed' and n3 = 1, 'status=' || coalesce(j->>'status', '?') || ' events=' || n3);
      j := public.clear_pin_dnk(pid2, 'not black', op || '-d2');
      res := res || pg_temp.b_row('D6 clearing a door that is not black answers not_dnk and writes nothing', j->>'status' = 'not_dnk'
        and not exists (select 1 from public.events e where e.team_id = team and e.id = 'dnkclear-' || op || '-d2'), 'status=' || coalesce(j->>'status', '?'));
    exception when others then
      res := res || pg_temp.b_row('D6 clear_pin_dnk by a leader', false, 'REFUSED: ' || sqlstate || ' ' || sqlerrm);
    end;
    -- D9 v40 still works: the exact nine-column upsert, a rename of a real hood
    if hood_id is not null then
      begin
        insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
        values (team, hood_id, hood_name || ' (probe)', hood_poly, null, false, boss_id, null,
                jsonb_set(hood_data, '{updatedAt}', to_jsonb(now_ms)))
        on conflict (team_id, id) do update set
          team_id = excluded.team_id, id = excluded.id, name = excluded.name, polygon = excluded.polygon,
          homes = excluded.homes, archived = excluded.archived, created_by = excluded.created_by,
          deleted_at = excluded.deleted_at, data = excluded.data;
        select t3.name, t3.assignees, t3.assignees_rev, (t3.geom is not null) into t, j, n, ok
          from public.territories t3 where t3.team_id = team and t3.id = hood_id;
        res := res || pg_temp.b_row('D9 a v40-shaped upsert by a leader (nine columns, merge-duplicates) still commits, ledger untouched, geom re-derived',
          t = hood_name || ' (probe)' and j = hood_led and n = hood_rev and ok, 'name "' || t || '", rev ' || hood_rev || ' -> ' || n);
      exception when others then
        res := res || pg_temp.b_row('D9 a v40-shaped upsert by a leader still commits', false, 'REFUSED: ' || sqlerrm);
      end;
    end if;
    -- D10 v40's Smart Split through the 0005 body: still v40 behaviour (unassigned children) until 0015
    begin
      j := public.smart_split_territory(tid, 'v41b-probe-split-' || op, jsonb_build_array(
             jsonb_build_object('id', tid || '-a', 'name', 'probe A', 'polygon', '[[0.5,0.5],[0.5005,0.5],[0.5005,0.501],[0.5,0.501]]'::jsonb, 'homes', 6),
             jsonb_build_object('id', tid || '-b', 'name', 'probe B', 'polygon', '[[0.5005,0.5],[0.501,0.5],[0.501,0.501],[0.5005,0.501]]'::jsonb, 'homes', 6)));
      select count(*) into n from public.territories t3
       where t3.team_id = team and t3.id in (tid || '-a', tid || '-b') and t3.deleted_at is null and not t3.archived
         and t3.geom is not null and gis.st_isvalid(t3.geom) and t3.assignees = '{"entries": []}'::jsonb and t3.open_assignees = '{}'::uuid[];
      select (deleted_at is not null) into ok from public.territories where team_id = team and id = tid;
      res := res || pg_temp.b_row('D10 v40''s Smart Split (0005 body, still under its own name) commits: two live children, UNASSIGNED as v40 makes them — inheritance is 0015, not yet applied',
        n = 2 and ok and j->>'status' = 'committed' and j ? 'assignment_inherited' = false,
        n || ' child(ren) ok, parent tombstoned=' || ok || ' status=' || coalesce(j->>'status', j::text) || ' assignment_inherited key present=' || (j ? 'assignment_inherited'));
    exception when others then
      res := res || pg_temp.b_row('D10 v40''s Smart Split (0005 body)', false, 'REFUSED: ' || sqlerrm);
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

select * from pg_temp.b1_verify();
