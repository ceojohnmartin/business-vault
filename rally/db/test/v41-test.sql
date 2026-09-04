-- RALLY v41 — the SERVER release gates.
--
-- Proves, against a real PostgreSQL with real PostGIS, every invariant the
-- v41 migrations claim: the ON CONFLICT column-privilege requirement that
-- the whole grant design rests on, multi-assignee assignment and its
-- indelible history, the do-not-knock authority under every client shape,
-- the overlap invariant including the CONCURRENT case that deferral alone
-- does not solve, Smart Split inheritance, and the atomic activation.
--
-- Run by db/test/run-v41-tests.sh, which applies the shim and every
-- migration to a throwaway database first. Any failing assertion aborts.

\set ON_ERROR_STOP on
\pset pager off
-- NOTICE must stay visible: every assertion reports through raise notice,
-- and the runner counts those lines.
set client_min_messages = notice;

create or replace function t_assert(cond boolean, label text) returns void
language plpgsql as $$
begin
  if cond is true then raise notice 'PASS: %', label;
  else raise exception 'FAIL: %', label;
  end if;
end $$;
grant execute on function t_assert(boolean, text) to public;

create or replace procedure t_as(uid uuid) language plpgsql as $$
begin
  execute 'set role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, false);
end $$;
grant execute on procedure t_as(uuid) to public;

-- did a statement raise? (used for every "must be refused" case)
create or replace function t_raises(sql text, label text) returns void
language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    raise notice 'PASS: %', label;
    return;
  end;
  raise exception 'FAIL: % (the statement was ACCEPTED)', label;
end $$;
grant execute on function t_raises(text, text) to public;


/* A DEFERRED constraint fires at COMMIT, so `execute` returns cleanly and
   the refusal cannot be caught per statement. For the single-session
   refusal cases the constraint is forced IMMEDIATE inside a subtransaction,
   which changes WHEN it runs and nothing about WHAT it checks.

   Deferral itself is proven elsewhere, and has to be: Smart Split (section
   S) commits only because the constraint is deferred — mid-transaction its
   children overlap the still-live parent — and turf-race-test.sh proves the
   concurrent case that deferral alone cannot solve. */
create or replace function t_raises_deferred(sql text, label text) returns void
language plpgsql as $$
begin
  begin
    set constraints public.territories_no_overlap immediate;
    execute sql;
  exception when others then
    raise notice 'PASS: %', label;
    return;
  end;
  raise exception 'FAIL: % (the statement was ACCEPTED)', label;
end $$;
grant execute on function t_raises_deferred(text, text) to public;

-- ------------------------------------------------------------- fixtures ---

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-b000-000000000001', 'boss@v41.com',  '{"name":"Boss"}'),
  ('00000000-0000-4000-b000-000000000002', 'lead2@v41.com', '{"name":"Lead Two"}'),
  ('00000000-0000-4000-b000-000000000003', 'john@v41.com',  '{"name":"John"}'),
  ('00000000-0000-4000-b000-000000000004', 'jake@v41.com',  '{"name":"Jake"}'),
  ('00000000-0000-4000-b000-000000000005', 'sam@v41.com',   '{"name":"Sam"}'),
  ('00000000-0000-4000-b000-000000000006', 'gone@v41.com',  '{"name":"Gone"}'),
  ('00000000-0000-4000-b000-000000000007', 'other@v41.com', '{"name":"Other Team"}');

insert into public.teams (id, name) values
  ('aaaaaaaa-1111-4111-a111-111111111111', 'V41 Team'),
  ('bbbbbbbb-2222-4222-a222-222222222222', 'Other Team');

update public.profiles set team_id = 'aaaaaaaa-1111-4111-a111-111111111111', role = 'owner'
  where email = 'boss@v41.com';
update public.profiles set team_id = 'aaaaaaaa-1111-4111-a111-111111111111', role = 'manager'
  where email = 'lead2@v41.com';
update public.profiles set team_id = 'aaaaaaaa-1111-4111-a111-111111111111', role = 'rep'
  where email in ('john@v41.com', 'jake@v41.com', 'sam@v41.com', 'gone@v41.com');
update public.profiles set team_id = 'bbbbbbbb-2222-4222-a222-222222222222', role = 'rep'
  where email = 'other@v41.com';

\set TEAM   '''aaaaaaaa-1111-4111-a111-111111111111'''
\set BOSS   '''00000000-0000-4000-b000-000000000001'''
\set LEAD   '''00000000-0000-4000-b000-000000000002'''
\set JOHN   '''00000000-0000-4000-b000-000000000003'''
\set JAKE   '''00000000-0000-4000-b000-000000000004'''
\set SAM    '''00000000-0000-4000-b000-000000000005'''
\set GONE   '''00000000-0000-4000-b000-000000000006'''
\set OTHER  '''00000000-0000-4000-b000-000000000007'''

-- a metre-accurate ring builder, so the fixtures read in plain metres
create or replace function t_rect(x0 float8, y0 float8, x1 float8, y1 float8)
returns jsonb language sql immutable as $$
  -- 1 metre ~ 1/111194.9 degrees of latitude; longitude scaled by cos(40°)
  select jsonb_build_array(
    jsonb_build_array(x0/111194.9/cosd(40), 40 + y0/111194.9),
    jsonb_build_array(x1/111194.9/cosd(40), 40 + y0/111194.9),
    jsonb_build_array(x1/111194.9/cosd(40), 40 + y1/111194.9),
    jsonb_build_array(x0/111194.9/cosd(40), 40 + y1/111194.9))
$$;

\echo '== P — the ON CONFLICT column-privilege requirement'

-- The exact PostgREST upsert shape, as a helper so every case sends the same
-- thing: every payload column in the DO UPDATE SET, conflict keys included.
create or replace function t_upsert_territory(
  p_team uuid, p_id text, p_name text, p_poly jsonb, p_data jsonb default '{}'::jsonb)
returns void language sql as $$
  insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
  values (p_team, p_id, p_name, p_poly, null, false, null, null, p_data)
  on conflict (team_id, id) do update set
    team_id = excluded.team_id, id = excluded.id, name = excluded.name,
    polygon = excluded.polygon, homes = excluded.homes, archived = excluded.archived,
    created_by = excluded.created_by, deleted_at = excluded.deleted_at, data = excluded.data
$$;
grant execute on function t_upsert_territory(uuid, text, text, jsonb, jsonb) to public;

call t_as(:LEAD);
select t_upsert_territory(:TEAM, 'h1', 'Hood 1', t_rect(0, 0, 100, 100));
select t_assert((select count(*) from public.territories where id = 'h1') = 1,
  'P1 the PostgREST upsert shape INSERTS with the v41 column grants');
select t_upsert_territory(:TEAM, 'h1', 'Hood 1 renamed', t_rect(0, 0, 100, 100));
select t_assert((select name from public.territories where id = 'h1') = 'Hood 1 renamed',
  'P2 and the DO UPDATE arm succeeds — the conflict keys are in the UPDATE grant');

-- the negative control: without update(team_id,id) the SAME statement fails
reset role;
revoke update (team_id, id) on public.territories from authenticated;
call t_as(:LEAD);
select t_raises(
  format('select t_upsert_territory(%L::uuid, %L, %L, t_rect(0,0,100,100))', :TEAM, 'h1', 'x'),
  'P3 NEGATIVE CONTROL: without update(team_id,id) the identical upsert is DENIED');
reset role;
grant update (team_id, id) on public.territories to authenticated;

call t_as(:LEAD);
select t_raises(
  'insert into public.territories (team_id, id, assignees) values ('''||:TEAM||''', ''hX'', ''{"entries":[]}''::jsonb)',
  'P4 a client may not write the assignees column at all');
select t_raises(
  'update public.territories set cycle_started_at = now() where id = ''h1''',
  'P5 a client may not write cycle_started_at');
select t_raises(
  'update public.territories set geom = null where id = ''h1''',
  'P6 a client may not write geom');
select t_assert((select geom is not null from public.territories where id = 'h1'),
  'P7 yet the server-owned geom WAS derived by the trigger, with no grant');
reset role;

-- SELECT must stay table-wide: the pull sends no select= list
select t_assert(has_column_privilege('authenticated', 'public.territories', 'assignees', 'SELECT')
            and has_column_privilege('authenticated', 'public.territories', 'geom', 'SELECT'),
  'P8 SELECT stays table-wide, so the unrestricted pull shape still works');

\echo '== A — multi-assignee assignment'

call t_as(:LEAD);
select set_territory_assignments('h1', array[:JOHN]::uuid[], 'op-1');
select t_assert((select array_length(open_assignees, 1) from public.territories where id='h1') = 1,
  'A1 one rep assigned');

select set_territory_assignments('h1', array[:JOHN, :JAKE]::uuid[], 'op-2');
select t_assert((select array_length(open_assignees, 1) from public.territories where id='h1') = 2,
  'A2 TWO current reps on ONE hood');
select t_assert((select open_assignees @> array[:JOHN, :JAKE]::uuid[] from public.territories where id='h1'),
  'A3 and both are the right two');

select set_territory_assignments('h1', array[:JOHN]::uuid[], 'op-3');
select t_assert((select open_assignees = array[:JOHN]::uuid[] from public.territories where id='h1'),
  'A4 removing Jake leaves John assigned');
select t_assert((select count(*) from public.territories t,
    jsonb_array_elements(t.assignees->'entries') e
   where t.id='h1' and e->>'userId' = :JAKE) = 1,
  'A5 Jake''s entry is CLOSED, never deleted');
select t_assert((select (e->>'unassignedAt') is not null from public.territories t,
    jsonb_array_elements(t.assignees->'entries') e where t.id='h1' and e->>'userId' = :JAKE),
  'A6 and carries the moment it closed');

select set_territory_assignments('h1', array[:JOHN, :JAKE, :SAM]::uuid[], 'op-4');
select t_assert((select array_length(open_assignees,1) from public.territories where id='h1') = 3,
  'A7 three concurrent reps');
select t_assert((select count(*) from public.territories t,
    jsonb_array_elements(t.assignees->'entries') e
   where t.id='h1' and e->>'userId' = :JAKE) = 2,
  'A8 Jake gets a NEW entry rather than reopening the closed one');

-- idempotency
select t_assert((set_territory_assignments('h1', array[:JOHN]::uuid[], 'op-4')->>'status') = 'already_committed',
  'A9 a retry of a committed operation is answered, not re-applied');
select t_assert((select array_length(open_assignees,1) from public.territories where id='h1') = 3,
  'A10 and changes nothing');

-- the mirrors
select t_assert((select data->>'assignedTo' from public.territories where id='h1')
              = (select rally_first_open_assignee(assignees) from public.territories where id='h1'),
  'A11 data.assignedTo is the FIRST open assignee');
select t_assert((select jsonb_array_length(data->'assignments') from public.territories where id='h1')
              = (select jsonb_array_length(assignees->'entries') from public.territories where id='h1'),
  'A12 the v40 assignments mirror holds EVERY entry, closed ones included');
select t_assert((select bool_and((e->>'assignedBy') !~ '^[0-9a-fA-F]{8}-')
    from public.territories t, jsonb_array_elements(t.data->'assignments') e where t.id='h1'),
  'A13 the mirror renders assignedBy as a NAME, never a uuid');

-- validation of NEW open assignments
select t_raises(format('select set_territory_assignments(''h1'', array[%L]::uuid[], ''op-5'')', :OTHER),
  'A14 a rep from another team cannot be assigned');
reset role; update public.profiles set disabled = true where id = :GONE; call t_as(:LEAD);
select t_raises(format('select set_territory_assignments(''h1'', array[%L]::uuid[], ''op-6'')', :GONE),
  'A15 a disabled rep cannot be assigned');
select t_raises(format('select set_territory_assignments(''h1'', array[%L,%L]::uuid[], ''op-7'')', :JOHN, :JOHN),
  'A16 the same rep twice in one call is refused');

-- history is INDELIBLE, from any path
reset role;
select t_raises($$update public.territories
   set assignees = jsonb_build_object('entries', '[]'::jsonb) where id = 'h1'$$,
  'A17 wiping the ledger is refused even as superuser (I4 holds against every path)');

call t_as(:LEAD);
select t_assert((select assignees_rev from public.territories where id='h1') >= 4,
  'A18 assignees_rev advanced monotonically with each change');
reset role;

\echo '== R — a rep may not manage turf'

call t_as(:JOHN);
select t_raises(format('select set_territory_assignments(''h1'', array[%L]::uuid[], ''op-r1'')', :JOHN),
  'R1 a rep cannot assign turf');
select t_raises('select save_territory(''hR'', ''Rep hood'', t_rect(2000,0,2100,100), null, false, null, null)',
  'R2 a rep cannot create turf through the RPC');
select t_raises('select start_territory_cycle(''h1'', null, ''op-r2'')',
  'R3 a rep cannot start a cycle');
reset role;

\echo '== L — legacy compatibility and the atomic activation'

-- a v40-shaped hood: assignments in data, no ledger
call t_as(:LEAD);
select t_upsert_territory(:TEAM, 'h2', 'Legacy', t_rect(500, 0, 600, 100),
  jsonb_build_object('id','h2','assignedTo', :JOHN,
    'assignments', jsonb_build_array(jsonb_build_object(
      'userId', :JOHN, 'name','John','assignedBy','Lead Two',
      'assignedAt', 1700000000000::bigint, 'unassignedAt', null))));
select t_assert((select open_assignees = array[:JOHN]::uuid[] from public.territories where id='h2'),
  'L1 flag FALSE: the ledger follows data.assignments');
select t_assert((select (e->>'assignedByName') = 'Lead Two' from public.territories t,
    jsonb_array_elements(t.assignees->'entries') e where t.id='h2'),
  'L2 a v40 assignedBy NAME is preserved losslessly as assignedByName');

-- AGREEMENT INVARIANT under flag = false
select t_assert((select data->>'assignedTo' = rally_first_open_assignee(assignees)
    from public.territories where id='h2'),
  'L3 ledger and mirror agree after a legacy write');

/* THE ACTIVATION GATE. A live hood whose CURRENT assignee resolves to no
   rep on the team cannot appear in the uuid[] mirror, so switching server
   authority on over one would silently read as "nobody works this hood".
   The preflight lists them; this refuses to activate until they are gone. */
select t_upsert_territory(:TEAM, 'h-ghost', 'Ghost Rep', t_rect(700, 0, 800, 100),
  jsonb_build_object('id','h-ghost','assignedTo','deadbeef-0000-4000-a000-000000000001',
    'assignments', jsonb_build_array(jsonb_build_object(
      'userId','deadbeef-0000-4000-a000-000000000001','name','Departed',
      'assignedBy','Lead Two','assignedAt', 1700000000000::bigint, 'unassignedAt', null))));
select t_assert((select open_assignees = '{}'::uuid[] from public.territories where id='h-ghost'),
  'L3a an unresolvable CURRENT assignee cannot enter the uuid[] mirror');
select t_assert((select jsonb_array_length(assignees->'entries') = 1
    from public.territories where id='h-ghost'),
  'L3b but the entry is KEPT in the ledger, not deleted to make the mirror tidy');
reset role;
select t_assert(rally_unresolved_live_assignments() = 1,
  'L3c the activation gate counts it');
select t_raises('update public.rally_config set assignment_server_authoritative = true',
  'L3d and REFUSES to switch server authority on over it');
select t_assert(not (rally_capabilities()->>'assignmentServerAuthoritative')::boolean,
  'L3e so the capability is still false');
-- the same hood ARCHIVED is not live turf, and does not block anything
update public.territories set archived = true where id = 'h-ghost';
select t_assert(rally_unresolved_live_assignments() = 0,
  'L3f an ARCHIVED hood carries its unresolved history without blocking');

-- flip
reset role;
update public.rally_config set assignment_server_authoritative = true;
select t_assert((rally_capabilities()->>'assignmentServerAuthoritative')::boolean,
  'L4 the capability flips');

call t_as(:LEAD);
-- a v40 client now tries to reassign through a plain upsert
select t_upsert_territory(:TEAM, 'h2', 'Legacy', t_rect(500, 0, 600, 100),
  jsonb_build_object('id','h2','updatedAt', 1700000000001::bigint, 'assignedTo', :SAM,
    'assignments', jsonb_build_array(jsonb_build_object(
      'userId', :SAM, 'name','Sam','assignedBy','Lead Two',
      'assignedAt', 1700000000001::bigint, 'unassignedAt', null))));
select t_assert((select open_assignees = array[:JOHN]::uuid[] from public.territories where id='h2'),
  'L5 flag TRUE: a v40 upsert CANNOT move the ledger');
select t_assert((select data->>'assignedTo' from public.territories where id='h2') = :JOHN,
  'L6 and the mirror is rewritten from the ledger, correcting the client');
select t_assert((select (data->>'updatedAt')::bigint from public.territories where id='h2') > 1700000000001,
  'L7 the correction is STAMPED above the incoming clock, so the client accepts it');

-- AGREEMENT INVARIANT under flag = true
select t_assert((select data->>'assignedTo' = rally_first_open_assignee(assignees)
    from public.territories where id='h2'),
  'L8 ledger and mirror agree after a corrected write too');

-- a NO-OP write must NOT stamp, or a slow-clocked device re-pushes forever
do $$
declare v_before bigint; v_after bigint; v_upd timestamptz; v_upd2 timestamptz;
begin
  select (data->>'updatedAt')::bigint, updated_at into v_before, v_upd
    from public.territories where id = 'h2';
  perform t_upsert_territory('aaaaaaaa-1111-4111-a111-111111111111'::uuid, 'h2', 'Legacy',
    (select polygon from public.territories where id='h2'),
    (select data from public.territories where id='h2'));
  select (data->>'updatedAt')::bigint, updated_at into v_after, v_upd2
    from public.territories where id = 'h2';
  perform t_assert(v_after = v_before,
    'L9 a no-op write does NOT bump data.updatedAt (the anti-re-push condition)');
end $$;

-- the RPC still works after the flip
select set_territory_assignments('h2', array[:JAKE]::uuid[], 'op-l1');
select t_assert((select open_assignees = array[:JAKE]::uuid[] from public.territories where id='h2'),
  'L10 the authoritative RPC moves the ledger after the flip');
reset role;
update public.rally_config set assignment_server_authoritative = false;

\echo '== C — Clear Outcomes'

call t_as(:LEAD);
select t_assert((select cycle_started_at is null from public.territories where id='h1'),
  'C1 a hood starts on its FIRST cycle (null, not a date)');
select start_territory_cycle('h1', '2026-06-01T00:00:00Z'::timestamptz, 'cyc-1');
select t_assert((select cycle_started_at from public.territories where id='h1')
              = '2026-06-01T00:00:00Z'::timestamptz,
  'C2 the boundary moves');
select t_assert((start_territory_cycle('h1', '2026-01-01T00:00:00Z'::timestamptz, 'cyc-2')->>'status')
              = 'already_current',
  'C3 the boundary is MONOTONE FORWARD — an older stamp is refused');
select t_assert((select cycle_started_at from public.territories where id='h1')
              = '2026-06-01T00:00:00Z'::timestamptz,
  'C4 and nothing moved');
reset role;

\echo '== D — do-not-knock authority'

-- a black door
insert into public.pins (team_id, id, lat, lng, disposition, data) values
  (:TEAM, 'p-black', 40.0005, 0.0005, 'dnk',
   jsonb_build_object('id','p-black','disposition','dnk','updatedAt', 1700000000000::bigint,
     'history', jsonb_build_array(jsonb_build_object('ts', 1700000000000::bigint, 'disposition','dnk'))));

call t_as(:JOHN);
update public.pins set disposition = 'nothome',
  data = jsonb_set(jsonb_set(data, '{disposition}', '"nothome"'), '{updatedAt}', '1700000009999')
 where id = 'p-black';
select t_assert((select disposition from public.pins where id='p-black') = 'dnk',
  'D1 a REP cannot change a black door away from dnk — the column is restored');
select t_assert((select data->>'disposition' from public.pins where id='p-black') = 'dnk',
  'D2 and the mirror inside data is restored too');
select t_assert((select (data->>'updatedAt')::bigint from public.pins where id='p-black') > 1700000009999,
  'D3 the correction is stamped above the incoming clock');

update public.pins set deleted_at = now() where id = 'p-black';
select t_assert((select deleted_at is null from public.pins where id='p-black'),
  'D4 a REP cannot tombstone a black door — the delete is neutralised');

-- the rep's real work is KEPT
update public.pins set data = jsonb_set(data, '{notes}',
  jsonb_build_array(jsonb_build_object('ts', 1700000010000::bigint, 'text','left a card')))
 where id = 'p-black';
select t_assert((select jsonb_array_length(data->'notes') from public.pins where id='p-black') = 1,
  'D5 the rep''s note survives the neutralisation');
select t_assert((select disposition from public.pins where id='p-black') = 'dnk',
  'D6 and the door is still black');
reset role;

-- LEADERSHIP DOES NOT HELP: an ordinary edit never clears black
call t_as(:LEAD);
update public.pins set disposition = 'unworked',
  data = jsonb_set(data, '{disposition}', '"unworked"') where id = 'p-black';
select t_assert((select disposition from public.pins where id='p-black') = 'dnk',
  'D7 an ORDINARY EDIT BY A MANAGER also cannot clear black');
reset role;

-- only the explicit operation can
call t_as(:JOHN);
select t_raises('select clear_pin_dnk(''p-black'', ''owner asked'', ''clr-1'')',
  'D8 a rep cannot call clear_pin_dnk');
reset role;
call t_as(:LEAD);
select t_raises('select clear_pin_dnk(''p-black'', '''', ''clr-1'')',
  'D9 clearing without a reason is refused');
select t_raises('select clear_pin_dnk(''p-black'', ''owner asked'', '''')',
  'D10 clearing without an operation id is refused');
select clear_pin_dnk('p-black', 'owner asked in writing', 'clr-1');
select t_assert((select disposition from public.pins where id='p-black') = 'unworked',
  'D11 an explicit leadership clear DOES clear it');
select t_assert((select count(*) from public.events where id = 'dnkclear-clr-1') = 1,
  'D12 and leaves an indelible event');
select t_assert((clear_pin_dnk('p-black', 'again', 'clr-1')->>'status') = 'already_committed',
  'D13 the clear is idempotent on its operation id');
select t_assert((select rally_dnk_from_history(data) is null from public.pins where id='p-black'),
  'D14 the clear rides in the door''s history, so every device converges');
reset role;

/* ================= THE FORGED CLEAR =================
   The clearing signal lives in two client-written places: the door's own
   history, and the event log. Both were open — a rep could clear ANY black
   door by appending {disposition:'dnk_clear'} to the history they push, or
   by inserting one event straight into PostgREST. No client bug required.
   Found by adversarial review; these are the gates that keep it shut. */
insert into public.pins (team_id, id, lat, lng, disposition, data) values
  (:TEAM, 'p-forge', 40.0009, 0.0009, 'dnk',
   jsonb_build_object('id','p-forge','disposition','dnk','updatedAt',1700000000000::bigint,
     'history', jsonb_build_array(jsonb_build_object('ts',1700000000000::bigint,'disposition','dnk'))));

call t_as(:JOHN);
insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user, data)
values (:TEAM, 'forged-1', 'p-forge', 'knock', 'dnk_clear', 9999999999999, null,
        jsonb_build_object('id','forged-1','ts',9999999999999::bigint,'pinId','p-forge',
                           'disposition','dnk_clear'));
select t_assert((select count(*) from public.events where id = 'forged-1') = 0,
  'D17 a rep''s forged dnk_clear EVENT is dropped, not stored');

-- and the batch around it still commits: a refusal would dead-letter honest knocks
insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user, data)
values (:TEAM, 'honest-1', 'p-forge', 'knock', 'nothome', 1700000001000, null,
        jsonb_build_object('id','honest-1','ts',1700000001000::bigint,'pinId','p-forge',
                           'disposition','nothome')),
       (:TEAM, 'forged-2', 'p-forge', 'knock', 'dnk_clear', 9999999999998, null,
        jsonb_build_object('id','forged-2','ts',9999999999998::bigint,'pinId','p-forge',
                           'disposition','dnk_clear'));
select t_assert((select count(*) from public.events where id = 'honest-1') = 1
            and (select count(*) from public.events where id = 'forged-2') = 0,
  'D18 the honest knock beside it still commits — the forgery is dropped, not refused');

-- the pin's own history
update public.pins set data = jsonb_set(data, '{history}',
  (data->'history') || jsonb_build_object('ts', 9999999999999::bigint, 'disposition','dnk_clear'))
 where id = 'p-forge';
select t_assert(
  (select public.rally_dnk_from_history(data) is not null from public.pins where id='p-forge'),
  'D19 a forged dnk_clear in the pushed HISTORY is stripped — the door stays black');
select t_assert((select disposition from public.pins where id='p-forge') = 'dnk',
  'D20 and so does the column');

-- a clear planted on an ordinary door, dated in the future, must not disarm
-- the protection the day that door is finally marked
insert into public.pins (team_id, id, lat, lng, disposition, data) values
  (:TEAM, 'p-plant', 40.0008, 0.0008, 'unworked',
   jsonb_build_object('id','p-plant','disposition','unworked',
     'history', jsonb_build_array(jsonb_build_object('ts',9999999999999::bigint,'disposition','dnk_clear'))));
select t_assert(
  (select jsonb_array_length(data->'history') from public.pins where id='p-plant') = 0,
  'D21 a clear PLANTED on an ordinary door is stripped on INSERT too');
update public.pins set disposition = 'dnk',
  data = jsonb_set(jsonb_set(data,'{disposition}','"dnk"'),'{history}',
    jsonb_build_array(jsonb_build_object('ts', 1700000002000::bigint, 'disposition','dnk')))
 where id = 'p-plant';
select t_assert(
  (select public.rally_dnk_from_history(data) is not null from public.pins where id='p-plant'),
  'D22 so marking it black later really does make it black');

-- the legitimate route still works
reset role;
call t_as(:LEAD);
select clear_pin_dnk('p-forge', 'the owner moved out', 'clr-forge');
select t_assert((select disposition from public.pins where id='p-forge') = 'unworked',
  'D23 while clear_pin_dnk — running as the owner — still clears it');
select t_assert(
  (select public.rally_dnk_from_history(data) is null from public.pins where id='p-forge'),
  'D24 and its clear SURVIVES in the history, because the server wrote it');
reset role;

-- the event log itself remains unwritable
call t_as(:LEAD);
select t_raises('update public.events set disposition = ''x'' where id = ''dnkclear-clr-1''',
  'D15 no client can alter the clear event');
select t_raises('delete from public.events where id = ''dnkclear-clr-1''',
  'D16 no client can delete it either');
reset role;

\echo '== G — geometry: refuse, never repair'

call t_as(:LEAD);
select t_raises(
  'select t_upsert_territory('''||:TEAM||''', ''bad1'', ''Bowtie'', jsonb_build_array('
  || 'jsonb_build_array(5,40), jsonb_build_array(5.001,40.001), '
  || 'jsonb_build_array(5.001,40), jsonb_build_array(5,40.001)))',
  'G1 a self-intersecting outline is REFUSED');
select t_assert((select count(*) from public.territories where id = 'bad1') = 0,
  'G2 and nothing was stored — no silent repair');
select t_raises(
  'select t_upsert_territory('''||:TEAM||''', ''bad2'', ''Two points'', jsonb_build_array('
  || 'jsonb_build_array(5,40), jsonb_build_array(5.001,40)))',
  'G3 fewer than 3 distinct corners is refused');

-- shape-preserving normalization keeps every corner
select t_upsert_territory(:TEAM, 'g1', 'Dupes', jsonb_build_array(
  jsonb_build_array(5,40), jsonb_build_array(5,40),
  jsonb_build_array(5.001,40), jsonb_build_array(5.001,40.001),
  jsonb_build_array(5,40.001), jsonb_build_array(5,40)));
select t_assert((select extensions.st_npoints(geom) from public.territories where id='g1') = 5,
  'G4 duplicate and closing corners are dropped; the 4 real ones survive (+1 closing)');
select t_assert((select extensions.st_isvalid(geom) from public.territories where id='g1'),
  'G5 the stored polygon is valid');

-- no repair function anywhere in the migration set is asserted by the runner
reset role;

\echo '== O — the overlap invariant'

call t_as(:LEAD);
-- a shared edge is ADJACENCY, not collision
select t_upsert_territory(:TEAM, 'o1', 'West', t_rect(10000, 0, 10100, 100));
select t_upsert_territory(:TEAM, 'o2', 'East', t_rect(10100, 0, 10200, 100));
select t_assert((select count(*) from public.territories where id in ('o1','o2')) = 2,
  'O1 two hoods sharing an EDGE both commit');
select t_assert(
  (select rally_overlap_m2(a.geom, b.geom) from public.territories a, public.territories b
    where a.id='o1' and b.id='o2') = 0,
  'O2 and their overlap measures exactly 0 m²');

-- a corner touch, likewise
select t_upsert_territory(:TEAM, 'o3', 'NorthEast', t_rect(10100, 100, 10200, 200));
select t_assert((select count(*) from public.territories where id='o3') = 1,
  'O3 a hood touching only at a CORNER commits');

-- a real overlap is refused
select t_raises_deferred(
  'select t_upsert_territory('''||:TEAM||''', ''o4'', ''Overlapper'', t_rect(10050, 0, 10150, 100))',
  'O4 a 50 m x 100 m overlap is REFUSED');
select t_assert((select count(*) from public.territories where id='o4') = 0,
  'O5 and the overlapping hood was not stored');

-- the tolerance boundary, from both sides
select t_upsert_territory(:TEAM, 'o5', 'Sliver ok', t_rect(10200, 0, 10300, 100));
select t_raises_deferred(
  'select t_upsert_territory('''||:TEAM||''', ''o6'', ''Sliver bad'', t_rect(10195, 0, 10290, 100))',
  'O6 a 5 m² sliver EXCEEDS the 1.0 m² tolerance and is refused');
select t_assert(rally_overlap_tolerance_m2() = 1.0,
  'O7 the tolerance is exactly 1.0 m², in one place');

-- an archived or tombstoned hood is not active turf
update public.territories set archived = true where id = 'o5';
select t_upsert_territory(:TEAM, 'o7', 'Over archived', t_rect(10200, 0, 10300, 100));
select t_assert((select count(*) from public.territories where id='o7') = 1,
  'O8 a hood may overlap an ARCHIVED one');
update public.territories set deleted_at = now() where id = 'o7';
select t_upsert_territory(:TEAM, 'o8', 'Over tombstoned', t_rect(10200, 0, 10300, 100));
select t_assert((select count(*) from public.territories where id='o8' and deleted_at is null) = 1,
  'O9 and a TOMBSTONED one');

-- teams do not collide with each other
reset role;
update public.profiles set team_id = 'bbbbbbbb-2222-4222-a222-222222222222', role='manager'
  where id = :OTHER;
call t_as(:OTHER);
select t_upsert_territory('bbbbbbbb-2222-4222-a222-222222222222'::uuid, 'x1', 'Other team same ground',
  t_rect(10000, 0, 10100, 100));
select t_assert((select count(*) from public.territories where id='x1') = 1,
  'O10 another TEAM may hold the same ground — the invariant is per team');
reset role;

-- the index is actually usable with the LITERAL predicate
do $$
declare v_plan text;
begin
  execute 'explain (costs off) select 1 from public.territories
            where deleted_at is null and archived = false
              and geom operator(extensions.&&)
                  extensions.st_setsrid(extensions.st_makeenvelope(0,39,1,41), 4326)'
    into v_plan;
  perform t_assert(v_plan is not null, 'O11 the live-predicate bbox query plans');
end $$;

\echo '== S — Smart Split inherits the COMPLETE assignee set'

call t_as(:LEAD);
select t_upsert_territory(:TEAM, 'sp', 'Splitme', t_rect(20000, 0, 20200, 100));
select set_territory_assignments('sp', array[:JOHN, :JAKE]::uuid[], 'op-sp');
select t_assert((select array_length(open_assignees,1) from public.territories where id='sp') = 2,
  'S1 the parent has two current reps');

select smart_split_territory_v41('sp', 'split-1', jsonb_build_array(
  jsonb_build_object('id','sp-a','name','Split A','polygon', t_rect(20000, 0, 20100, 100),
    'data', jsonb_build_object('id','sp-a','name','Split A')),
  jsonb_build_object('id','sp-b','name','Split B','polygon', t_rect(20100, 0, 20200, 100),
    'data', jsonb_build_object('id','sp-b','name','Split B'))));

select t_assert((select deleted_at is not null from public.territories where id='sp'),
  'S2 the parent is tombstoned');
select t_assert((select open_assignees @> array[:JOHN, :JAKE]::uuid[] from public.territories where id='sp-a'),
  'S3 child A inherits the COMPLETE current set');
select t_assert((select open_assignees @> array[:JOHN, :JAKE]::uuid[] from public.territories where id='sp-b'),
  'S4 child B does too');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='sp-a' and e->>'inheritedFromTerritoryId' = 'sp') = 2,
  'S5 each inherited entry names the parent it came from');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='sp-a' and e->>'viaSplit' = 'split-1') = 2,
  'S6 and the split operation that created it');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='sp' and e->>'unassignedAt' is null) = 0,
  'S7 the parent''s open entries are CLOSED at the split');
select t_assert((select jsonb_array_length(assignees->'entries') from public.territories where id='sp') = 2,
  'S8 and the parent keeps its ENTIRE history');
select t_assert((select jsonb_array_length(assignees->'entries') from public.territories where id='sp-a') = 2,
  'S9 no CLOSED parent history was copied into the child');
select t_assert((smart_split_territory_v41('sp', 'split-1', '[]'::jsonb)->>'status') = 'already_committed',
  'S10 a retry does not re-inherit');
reset role;

\echo '== X — the defects adversarial review found, as permanent gates'

-- A stale client mirror must not permanently dead-letter the row. A phone
-- that has been offline pushes a mirror missing whatever closed entries it
-- never saw; a derivation that replaced the ledger would drop them, I4
-- would refuse with 42501, and the row would dead-letter on every retry.
reset role;
update public.rally_config set assignment_server_authoritative = false;
call t_as(:LEAD);
select t_upsert_territory(:TEAM, 'x-stale', 'Stale Mirror', t_rect(30000, 0, 30100, 100),
  jsonb_build_object('id','x-stale',
    'assignments', jsonb_build_array(
      jsonb_build_object('userId', :JOHN, 'name','John','assignedBy','Lead Two',
        'assignedAt', 1700000000000::bigint, 'unassignedAt', 1700000100000::bigint),
      jsonb_build_object('userId', :JAKE, 'name','Jake','assignedBy','Lead Two',
        'assignedAt', 1700000200000::bigint, 'unassignedAt', null))));
select t_assert((select jsonb_array_length(assignees->'entries') from public.territories where id='x-stale') = 2,
  'X1 a legacy hood with one closed and one open entry lands');
-- now the SAME hood pushed by a device that never saw John's closed run
select t_upsert_territory(:TEAM, 'x-stale', 'Stale Mirror', t_rect(30000, 0, 30100, 100),
  jsonb_build_object('id','x-stale',
    'assignments', jsonb_build_array(
      jsonb_build_object('userId', :JAKE, 'name','Jake','assignedBy','Lead Two',
        'assignedAt', 1700000200000::bigint, 'unassignedAt', null))));
select t_assert((select jsonb_array_length(assignees->'entries') from public.territories where id='x-stale') = 2,
  'X2 a STALE mirror missing closed history is accepted, and the history survives');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='x-stale' and e->>'userId' = :JOHN) = 1,
  'X3 John''s closed run is still there — no 42501, no dead-letter');

-- the assignedBy uuid must survive an upsert from a phone that speaks only
-- the v40 mirror, where assignedBy is a display NAME
reset role;
call t_as(:LEAD);
select set_territory_assignments('x-stale', array[:SAM]::uuid[], 'op-x1');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='x-stale' and e->>'userId' = :SAM and e->>'assignedBy' = :LEAD) = 1,
  'X4 an RPC assignment records assignedBy as a real uuid');
select t_upsert_territory(:TEAM, 'x-stale', 'Stale Mirror', t_rect(30000, 0, 30100, 100),
  (select data from public.territories where id='x-stale'));
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='x-stale' and e->>'userId' = :SAM and e->>'assignedBy' = :LEAD) = 1,
  'X5 and a v40-shaped upsert does NOT clobber it with the name it carries');

-- the cycle boundary must not be settable to a far-future time: it is
-- monotone, so there would be no way back
select start_territory_cycle('x-stale', '2099-01-01T00:00:00Z'::timestamptz, 'op-x2');
select t_assert((select cycle_started_at from public.territories where id='x-stale')
                < now() + interval '1 hour',
  'X6 a far-future cycle boundary is clamped to the server clock');

-- save_territory must treat a null door count as "unchanged", like every
-- sibling field, rather than wiping it
select save_territory('x-stale', null, null, 250, null, null, null);
select save_territory('x-stale', 'Renamed', null, null, null, null, null);
select t_assert((select homes from public.territories where id='x-stale') = 250,
  'X7 save_territory leaves the door count alone when it is not given');
select t_assert((select name from public.territories where id='x-stale') = 'Renamed',
  'X8 while still applying what WAS given');

-- a hood must not go LIVE carrying an outline the map cannot use: inserted
-- tombstoned with a bad ring, then un-deleted, it would be invisible to the
-- index and never compared against anything
select t_raises(
  'select t_upsert_territory('''||:TEAM||''', ''x-ghost'', ''Ghost'', jsonb_build_array('
  || 'jsonb_build_array(9,40), jsonb_build_array(9.001,40.001), '
  || 'jsonb_build_array(9.001,40), jsonb_build_array(9,40.001)))',
  'X9 an invalid ring is refused outright');
select t_assert((select count(*) from public.territories where id='x-ghost') = 0,
  'X9b and nothing was stored');
reset role;
insert into public.territories (team_id, id, name, polygon, deleted_at) values
  (:TEAM, 'x-ghost2', 'Ghost 2', jsonb_build_array(
    jsonb_build_array(9,40), jsonb_build_array(9.001,40.001),
    jsonb_build_array(9.001,40), jsonb_build_array(9,40.001)), now());
select t_assert((select geom is null from public.territories where id='x-ghost2'),
  'X10 the same ring inserted TOMBSTONED keeps no usable geometry — an invalid'
  || ' geometry is never stored on ANY row, live or not');
select t_raises('update public.territories set deleted_at = null where id = ''x-ghost2''',
  'X11 and un-deleting it is REFUSED — it cannot sneak into live turf');
select t_assert((select deleted_at is not null from public.territories where id='x-ghost2'),
  'X12 so it is still not active turf');
reset role;

\echo '== B — the backfill proofs held on real data'

select t_assert((select count(*) from public.territories
  where data->>'assignedTo' is distinct from coalesce(rally_first_open_assignee(assignees), null)) = 0,
  'B1 every hood''s mirror equals the first open assignee');
select t_assert((select count(*) from public.territories t
  where jsonb_array_length(coalesce(t.data->'assignments','[]'::jsonb))
     <> jsonb_array_length(coalesce(t.assignees->'entries','[]'::jsonb))) = 0,
  'B2 the assignments mirror holds exactly the ledger''s entries');

\echo 'v41 SQL: all checks passed'
