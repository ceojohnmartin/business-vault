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

/* Did a statement raise — FOR THE RIGHT REASON?

   `exception when others` alone would let a typo pass: a misspelled
   function, a renamed trigger or a missing column all raise, and a test
   that only asks "did it raise?" then reports PASS for a refusal that never
   ran. So the SQLSTATE is inspected. A class of states that can only mean
   the TEST is broken (undefined function/table/column/object, syntax,
   ambiguity) is always a FAIL. When the caller names the state it expects,
   only that state passes. */
create or replace function t_raises(sql text, label text, expect text default null) returns void
language plpgsql as $$
declare v_state text; v_msg text;
begin
  begin
    execute sql;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    if v_state in ('42883','42P01','42704','42703','42601','42P02','42702','42725','42P18','42846') then
      raise exception 'FAIL: % (the statement is BROKEN, not refused: % %)', label, v_state, v_msg;
    end if;
    if expect is not null and v_state <> expect then
      raise exception 'FAIL: % (refused with % "%", expected %)', label, v_state, v_msg, expect;
    end if;
    raise notice 'PASS: %', label;
    return;
  end;
  raise exception 'FAIL: % (the statement was ACCEPTED)', label;
end $$;
grant execute on function t_raises(text, text, text) to public;


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
declare v_state text; v_msg text;
begin
  /* OUTSIDE the guard on purpose. If the constraint trigger does not exist
     under this name, this statement raises 42704 and the whole suite stops
     — which is the correct outcome, because every refusal below would
     otherwise be reported without the statement under test ever running. */
  set constraints public.territories_no_overlap immediate;
  begin
    execute sql;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    if v_state <> '23514' then
      raise exception 'FAIL: % (refused with % "%", not the overlap check)', label, v_state, v_msg;
    end if;
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
select t_assert((select assignees_rev from public.territories where id='h1') = 5,
  'A18 assignees_rev is exactly the number of ledger changes so far (5)');
-- and a write that does not touch the ledger leaves it alone: an
-- unconditional bump would make every echo look like a new assignment
select save_territory('h1', 'Hood 1 renamed again', null, null, null, null, null);
select t_assert((select assignees_rev from public.territories where id='h1') = 5,
  'A19 a write that changes nothing in the ledger does NOT bump assignees_rev');
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

/* TOTAL OVER LEGACY JSON. A door whose history is not an array, whose data
   is not an object, or whose knock ts is a sentence must still be WRITABLE
   — a rep's afternoon cannot dead-letter on a row shape nobody chose — and
   still protected. */
insert into public.pins (team_id, id, lat, lng, disposition, data) values
  (:TEAM, 'p-hist-obj', 40.0006, 0.0006, 'dnk',
   jsonb_build_object('id','p-hist-obj','disposition','dnk','history', jsonb_build_object('oops', true))),
  (:TEAM, 'p-data-str', 40.0007, 0.0007, 'dnk', '"not an object"'::jsonb),
  (:TEAM, 'p-ts-text',  40.0008, 0.0008, 'dnk',
   jsonb_build_object('id','p-ts-text','disposition','dnk',
     'history', jsonb_build_array(jsonb_build_object('ts','yesterday','disposition','dnk'))));
call t_as(:JOHN);
update public.pins set disposition = 'nothome' where id = 'p-hist-obj';
select t_assert((select disposition from public.pins where id='p-hist-obj') = 'dnk',
  'D20 a black door whose history is an OBJECT is still protected — and the write did not abort');
select t_assert((select jsonb_typeof(data->'history') from public.pins where id='p-hist-obj') = 'array',
  'D21 the unreadable history is replaced by the restored do-not-knock knock');
update public.pins set disposition = 'nothome' where id = 'p-data-str';
select t_assert((select disposition from public.pins where id='p-data-str') = 'dnk',
  'D22 a black door whose data is a STRING is still protected at the column');
select t_assert((select data from public.pins where id='p-data-str') = '"not an object"'::jsonb,
  'D23 and its data is left exactly as it was (no jsonb_set on a scalar)');
update public.pins set disposition = 'nothome',
  data = jsonb_set(data, '{disposition}', '"nothome"') where id = 'p-ts-text';
select t_assert((select disposition from public.pins where id='p-ts-text') = 'dnk',
  'D24 a black door whose knock ts is a SENTENCE is still protected');
select t_assert(public.rally_dnk_from_history('{"history": "none"}'::jsonb) is null
            and public.rally_dnk_from_history('"x"'::jsonb) is null
            and public.rally_dnk_from_history('{"history":[{"ts":"x","disposition":"dnk"}]}'::jsonb) = 0
            and public.rally_dnk_from_history('{"history":[7, "k", null]}'::jsonb) is null,
  'D25 rally_dnk_from_history is total: non-array history is no history, an unreadable ts is 0, a non-object knock is skipped');
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

/* THE ARM THE CLIENT ACTUALLY READS. A device rebuilds each event from
   row.data, not from the columns — so a forgery that keeps the columns
   honest ('knock') and hides dnk_clear inside data alone would pass a
   guard that looked only at the columns, and every device that pulled it
   would read the door as cleared while the server's own row stayed black. */
insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user, data)
values (:TEAM, 'forged-3', 'p-forge', 'knock', 'knock', 9999999999997, null,
        jsonb_build_object('id','forged-3','ts',9999999999997::bigint,'pinId','p-forge',
                           'disposition','dnk_clear'));
select t_assert((select count(*) from public.events where id = 'forged-3') = 0,
  'D25 a dnk_clear hidden in data alone — honest columns — is dropped too');

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
select t_assert((select gis.st_npoints(geom) from public.territories where id='g1') = 5,
  'G4 duplicate and closing corners are dropped; the 4 real ones survive (+1 closing)');
select t_assert((select gis.st_isvalid(geom) from public.territories where id='g1'),
  'G5 the stored polygon is valid');

/* TOTAL OVER ARBITRARY JSON, AND NEVER A REPAIR. A ring the reader cannot
   read is refused as a whole, with the corner named. An earlier draft
   skipped the corner it could not read and built the polygon from the rest
   — a repair, because it changes the footprint the leader drew. */
select t_raises(
  'select t_upsert_territory('''||:TEAM||''', ''bad3'', ''Off planet E'', ''[[200,40],[200.001,40],[200.001,40.001],[200,40.001]]''::jsonb)',
  'G6 a longitude outside [-180, 180] is refused', '22023');
select t_raises(
  'select t_upsert_territory('''||:TEAM||''', ''bad4'', ''Off planet N'', ''[[5,95],[5.001,95],[5.001,95.001],[5,95.001]]''::jsonb)',
  'G7 a latitude outside [-90, 90] is refused', '22023');
select t_raises(
  'select t_upsert_territory('''||:TEAM||''', ''bad5'', ''String corner'', ''[[5,40],["5.001",40],[5.001,40.001],[5,40.001]]''::jsonb)',
  'G8 a coordinate stored as a string is refused, not coerced', '22023');
select t_raises(
  'select t_upsert_territory('''||:TEAM||''', ''bad6'', ''Junk corner'', ''[[5,40],7,[5.001,40.001],[5,40.001]]''::jsonb)',
  'G9 a corner that is not a pair is refused — the ring is NOT trimmed to the corners that parse', '22023');
select t_raises(
  'select t_upsert_territory('''||:TEAM||''', ''bad7'', ''Object outline'', ''{"lng":5,"lat":40}''::jsonb)',
  'G10 an outline that is an object is refused', '22023');
select t_assert((select count(*) from public.territories where id in ('bad3','bad4','bad5','bad6','bad7')) = 0,
  'G11 and none of them was stored');
select t_assert(public.rally_ring_problem('[[5,40],7,[5.001,40.001],[5,40.001]]'::jsonb)
                = 'corner 2 is not a [longitude, latitude] pair',
  'G12 the reason names the corner');
select t_assert(public.rally_ring_problem('[[5,40],[5.001,95],[5.001,40.001],[5,40.001]]'::jsonb)
                = 'corner 2 latitude 95 is outside [-90, 90]',
  'G13 and the value that is off the planet');
select t_assert(public.rally_ring_problem('{"a":1}'::jsonb) = 'the outline is a JSON object, not an array of corners',
  'G14 an outline that is an object is a named problem, not an error');
select t_assert(public.rally_ring_problem('[[0,40],[1e400,40],[0.001,40.001],[0,40.001]]'::jsonb) like 'the outline could not be read:%',
  'G15 a number too large for float8 is a named problem, not an error');
select t_assert(public.rally_ring_problem('null'::jsonb) is null and public.rally_ring_to_geom('null'::jsonb) is null
            and public.rally_ring_problem('[]'::jsonb) is null and public.rally_ring_problem(null) is null,
  'G16 a JSON-null, empty or SQL-null outline is simply no outline');
select t_upsert_territory(:TEAM, 'g2', 'Undrawn', 'null'::jsonb);
select t_assert((select geom is null from public.territories where id = 'g2'),
  'G17 and a hood with no outline is stored, legally, with no geom');
select t_assert(public.rally_ring_problem('[[5,40],[5.001,40],[5.001,40.001],[5,40.001]]'::jsonb) is null,
  'G18 a good ring has no problem');

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
  /* With a handful of rows the planner would pick a sequential scan over
     ANY index, so "is the index in the plan" says nothing on its own.
     Forbidding seq scans for this one statement asks the real question:
     is the partial index USABLE with the literal live predicate? If the
     predicate were written any other way, or the index were gone, the
     plan below would still be a Seq Scan and this fails. */
  set local enable_seqscan = off;
  execute 'explain (costs off) select 1 from public.territories
            where deleted_at is null and archived = false
              and geom operator(gis.&&)
                  gis.st_setsrid(gis.st_makeenvelope(0,39,1,41), 4326)'
    into v_plan;
  perform t_assert(v_plan like '%territories_geom_live_gist%',
    'O11 the live-predicate bbox query USES the partial GiST index (' || v_plan || ')');
  reset enable_seqscan;
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

/* THE 0005 NAME IS THE SAME OPERATION. A v40 phone knows only
   smart_split_territory; a leader can call it directly. Both must inherit
   server-side, and neither may plant an assignment through the child's
   data — a cross-team profile, a disabled rep, a string that is not a uuid. */
select t_upsert_territory(:TEAM, 'sp2', 'Splitme 2', t_rect(40000, 0, 40200, 100));
select set_territory_assignments('sp2', array[:JOHN]::uuid[], 'op-sp2');
select smart_split_territory('sp2', 'split-2', jsonb_build_array(
  jsonb_build_object('id','sp2-a','name','Split 2A','polygon', t_rect(40000, 0, 40100, 100),
    'data', jsonb_build_object('id','sp2-a','name','Split 2A',
      'assignedTo', :OTHER,
      'assignments', jsonb_build_array(
        jsonb_build_object('userId', :OTHER, 'name','Other Team','assignedAt',1::bigint,'unassignedAt',null),
        jsonb_build_object('userId', 'not-a-uuid-at-all', 'name','?','assignedAt',2::bigint,'unassignedAt',null)))),
  jsonb_build_object('id','sp2-b','name','Split 2B','polygon', t_rect(40100, 0, 40200, 100),
    'data', jsonb_build_object('id','sp2-b','name','Split 2B','assignedTo', :GONE))));
select t_assert((select open_assignees from public.territories where id='sp2-a') = array[:JOHN]::uuid[]
            and (select open_assignees from public.territories where id='sp2-b') = array[:JOHN]::uuid[],
  'S11 the 0005 NAME inherits the parent''s current set into both children');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id in ('sp2-a','sp2-b') and e->>'userId' in (:OTHER, :GONE, 'not-a-uuid-at-all')) = 0,
  'S12 and NOTHING the client planted in the children''s data became an assignment entry');
select t_assert((select data->>'assignedTo' from public.territories where id='sp2-a') = :JOHN,
  'S13 the child''s v40 mirror is rebuilt from the inherited ledger, not from what was sent');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='sp2' and e->>'unassignedAt' is null) = 0,
  'S14 the parent''s open entries are closed on this path too');
select t_raises('select smart_split_territory_core(''sp2'', ''split-x'', ''[]''::jsonb)',
  'S15 the certified core body is not callable by a client at all', '42501');
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

/* THE STALE MIRROR THAT SAYS A CLOSED RUN IS STILL OPEN. X2 covered a
   mirror that OMITS closed history. The ordinary shape of staleness is
   different: a phone that pulled BEFORE the unassign carries the run as
   open, because that is what it was told. Merging that as "reopen" would
   fail I4 and refuse the whole row — a rename from a phone an hour behind
   would dead-letter, permanently, on every hood that had ever changed
   hands. Closed stays closed; the rename lands. */
select (select e->>'unassignedAt' from public.territories t,
          jsonb_array_elements(t.assignees->'entries') e
         where t.id='x-stale' and e->>'userId' = :JAKE) as jake_closed_at \gset
select t_upsert_territory(:TEAM, 'x-stale', 'Renamed by a stale phone', t_rect(30000, 0, 30100, 100),
  jsonb_build_object('id','x-stale','updatedAt', 1700000300000::bigint,
    'assignments', jsonb_build_array(
      jsonb_build_object('userId', :JOHN, 'name','John','assignedBy','Lead Two',
        'assignedAt', 1700000000000::bigint, 'unassignedAt', 1700000100000::bigint),
      jsonb_build_object('userId', :JAKE, 'name','Jake','assignedBy','Lead Two',
        'assignedAt', 1700000200000::bigint, 'unassignedAt', null))));
select t_assert((select name from public.territories where id='x-stale') = 'Renamed by a stale phone',
  'X13 a mirror carrying a since-closed run as OPEN is ACCEPTED — the rename lands, nothing dead-letters');
select t_assert((select e->>'unassignedAt' from public.territories t,
          jsonb_array_elements(t.assignees->'entries') e
         where t.id='x-stale' and e->>'userId' = :JAKE) = :'jake_closed_at',
  'X13b and the closed run stays CLOSED at the moment it closed — history is not reopened by staleness');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='x-stale' and e->>'userId' = :JAKE) = 1,
  'X13c with exactly one entry for that rep — not a closed one plus a reopened copy');
/* Under LEGACY authority the mirror still decides the OPEN set: the stale
   phone did not know about Sam, so Sam is unassigned by this write. That is
   the v40 last-writer rule, and it is precisely what the activation flag
   exists to end — asserted here so the semantics are on record, not
   discovered in production. */
select t_assert((select open_assignees from public.territories where id='x-stale') = '{}'::uuid[],
  'X13d (legacy authority) the stale mirror still decides the open set — the flag is what ends this');

-- taking a hood back: the desired set is EMPTY, and that must be legal
select set_territory_assignments('x-stale', array[:SAM]::uuid[], 'op-x3');
select t_assert((select open_assignees from public.territories where id='x-stale') = array[:SAM]::uuid[],
  'X14 Sam is back on the hood');
select set_territory_assignments('x-stale', '{}'::uuid[], 'op-x4');
select t_assert((select open_assignees from public.territories where id='x-stale') = '{}'::uuid[],
  'X14b assigning NOBODY is an ordinary operation, not "the same rep twice"');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='x-stale' and e->>'userId' = :SAM and e->>'unassignedAt' is not null) >= 1,
  'X14c and Sam''s run is CLOSED, not deleted');

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

/* THE ROWS BELOW WERE INSERTED BY db/test/v41-backfill-seed.sql AFTER 0008
   AND BEFORE 0009 — v40-shaped, with the assignment only in data — so 0011
   really ran over them. Every assertion compares against the SEEDED value,
   never against another derived field. */
\set BF_TEAM  '''dddddddd-4444-4444-a444-444444444444'''
\set BF_JOHN  '''00000000-0000-4000-d000-000000000001'''
\set BF_JAKE  '''00000000-0000-4000-d000-000000000002'''
\set BF_GHOST '''00000000-0000-4000-d000-0000000000ff'''

select t_assert((select jsonb_array_length(assignees->'entries') from public.territories where id='bf-live') = 2
            and (select open_assignees from public.territories where id='bf-live') = array[:BF_JOHN]::uuid[],
  'B3 a live hood: both seeded entries in the ledger, only the open one in the mirror');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='bf-live' and e->>'userId' = :BF_JAKE
     and (e->>'assignedAt')::bigint = 1700000000000 and (e->>'unassignedAt')::bigint = 1700000100000) = 1,
  'B3b the seeded CLOSED entry survives with its exact (assignedAt, unassignedAt)');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='bf-bare' and e->>'userId' = :BF_JAKE and e->>'synthesizedFrom' = 'assignedTo'
     and (e->>'assignedAt')::bigint = 1690000000000 and e->>'unassignedAt' is null) = 1
            and (select open_assignees from public.territories where id='bf-bare') = array[:BF_JAKE]::uuid[],
  'B4 a bare v40 assignedTo is SYNTHESIZED into one open entry, dated by the row''s own createdAt');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='bf-asg-obj' and e->>'userId' = :BF_JAKE and e->>'synthesizedFrom' = 'assignedTo'
     and e->>'unassignedAt' is null) = 1
            and (select open_assignees from public.territories where id='bf-asg-obj') = array[:BF_JAKE]::uuid[],
  'B4b a hood whose assignments was an OBJECT did not abort the backfill: 0010 read it as no history array and synthesized from assignedTo');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='bf-arch' and e->>'userId' = :BF_GHOST and e->>'userIdResolved' = 'false'
     and (e->>'unassignedAt')::bigint = 1600001000000) = 1
            and (select open_assignees from public.territories where id='bf-arch') = '{}'::uuid[]
            and (select archived from public.territories where id='bf-arch'),
  'B5 an ARCHIVED hood keeps its unresolvable closed entry, tagged, out of the uuid[] mirror');
select t_assert((select jsonb_array_length(assignees->'entries') from public.territories where id='bf-tomb') = 1
            and (select deleted_at is not null from public.territories where id='bf-tomb'),
  'B6 a TOMBSTONED hood keeps its history and stays tombstoned');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='bf-dup') = 2
            and (select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='bf-dup' and e->>'unassignedAt' is null and (e->>'assignedAt')::bigint = 1700000500000) = 1
            and (select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='bf-dup' and (e->>'assignedAt')::bigint = 1700000000000
     and (e->>'unassignedAt')::bigint = 1700000500000) = 1,
  'B7 duplicate OPEN entries: the newest stays open, the older is closed at that instant, both survive');
select t_assert((select data->>'note' from public.territories where id='bf-live') = 'keep me'
            and (select jsonb_array_length(data->'assignments') from public.territories where id='bf-live') = 2
            and (select data->>'assignedTo' from public.territories where id='bf-live') = :BF_JOHN,
  'B8 data outside the two mirrors is untouched, and the mirrors are rebuilt from the ledger');

select t_assert((select count(*) from public.territories
  where data->>'assignedTo' is distinct from coalesce(rally_first_open_assignee(assignees), null)) = 0,
  'B1 every hood''s mirror equals the first open assignee');
select t_assert((select count(*) from public.territories t
  where jsonb_array_length(coalesce(t.data->'assignments','[]'::jsonb))
     <> jsonb_array_length(coalesce(t.assignees->'entries','[]'::jsonb))) = 0,
  'B2 the assignments mirror holds exactly the ledger''s entries');

-- ---------------------------------------------------------------------------
-- THE READER'S OWN CASES (seeded by v41-backfill-seed.sql; 0011 ran over them)
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e where t.id='bf-dup-same') = 2
            and (select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
                  where t.id='bf-dup-same' and e->>'unassignedAt' is null) = 1
            and (select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
                  where t.id='bf-dup-same' and (e->>'closedByDedupe')::boolean and (e->>'unassignedAt')::bigint = 1700000000000) = 1,
  'B10 the same rep OPEN twice with the SAME assignedAt: one stays open, the other is closed at that instant and tagged — nothing deleted');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='bf-i3' and (e->>'unassignedAt')::bigint = 1700000100000 and (e->>'assignedAt')::bigint = 1700000100000
     and (e->>'unassignedAtRaw')::bigint = 1700000000000) = 1,
  'B11 a run that ended before it started is clamped to its start, and the raw end is kept beside it');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='bf-noat' and e->>'unassignedAt' is null and (e->>'assignedAtSynthesized')::boolean
     and (e->>'assignedAt')::bigint = (extract(epoch from t.created_at) * 1000)::bigint) = 1
            and (select open_assignees from public.territories where id='bf-noat') = array[:BF_JOHN]::uuid[],
  'B12 an open entry with no assignedAt is dated by the row''s own clock and tagged as synthesized');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='bf-created0' and (e->>'assignedAt')::bigint = 1 and e->>'synthesizedFrom' = 'assignedTo') = 1
            and (select open_assignees from public.territories where id='bf-created0') = array[:BF_JAKE]::uuid[],
  'B13 a bare-scalar hood with createdAt 0 is dated 1, never 0 — the backfill did not abort on I2');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='bf-36hex' and e->>'userId' = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' and e->>'userIdResolved' = 'false') = 1
            and (select open_assignees from public.territories where id='bf-36hex') = '{}'::uuid[]
            and (select data->>'assignedTo' from public.territories where id='bf-36hex') = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'B14 a uuid-LENGTH id that is not a uuid is kept as unresolved history and never cast');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='bf-upper' and e->>'userId' = :BF_JOHN and e->>'unassignedAt' is null) = 1
            and (select open_assignees from public.territories where id='bf-upper') = array[:BF_JOHN]::uuid[]
            and (select data->>'assignedTo' from public.territories where id='bf-upper') = :BF_JOHN,
  'B15 an UPPER-CASE uuid is one rep in canonical spelling, in the ledger, the uuid[] mirror and the scalar');
select t_assert((select jsonb_array_length(assignees->'entries') from public.territories where id='bf-junk') = 1
            and (select jsonb_array_length(data->'assignments') from public.territories where id='bf-junk') = 1
            and (select open_assignees from public.territories where id='bf-junk') = array[:BF_JAKE]::uuid[],
  'B16 elements that carry no assignment (a string, a number, a null, an object with no userId) are dropped; the one real entry survives');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='bf-plus' and (e->>'assignedAt')::bigint = 1700000000000 and not (e ? 'assignedAtRaw')) = 1,
  'B17 a timestamp with a leading + is read as int8 reads it — no synthesis, no raw tag');
select t_assert((select archived and geom is null and deleted_at is null from public.territories where id='bf-arch-bow'),
  'B18 an ARCHIVED hood with a bowtie ring stays archived with a NULL geom — the backfill did not refuse it');

-- ------------------------------------------------ a broken ring and liveness
call t_as('00000000-0000-4000-d000-000000000003');
select t_raises('update public.territories set archived = false where id = ''bf-arch-bow''',
  'G19 bringing a hood with a broken ring BACK INTO live turf is refused until the ring is fixed', '22023');
update public.territories set deleted_at = now() where id = 'bf-arch-bow';
select t_assert((select deleted_at is not null from public.territories where id='bf-arch-bow'),
  'G20 retiring it (tombstone) is allowed with the ring untouched — the other direction is always open');
select t_raises(
  'select t_upsert_territory('''||:TEAM||''', ''bad8'', ''Half planet'', ''[[0,0],[180,0],[180,1],[0,1]]''::jsonb)',
  'G21 an outline 180 degrees of longitude wide is refused before any geometry exists', '22023');
select t_assert(public.rally_ring_problem('[[-100,0],[100,0],[100,1],[-100,1]]'::jsonb) like 'the outline spans 200 degrees%',
  'G22 and the reason says how wide it is — such an edge is antipodal, and the geography measurement would refuse it with an internal error');
reset role;

-- --------------------------------- the reader on the client's upsert path
-- Under SERVER authority the INSERT arm of a PostgREST upsert still derives
-- a ledger from the payload before the conflict is detected; it must never
-- refuse a legacy shape the backfill was able to read.
update public.rally_config set assignment_server_authoritative = true;
call t_as('00000000-0000-4000-d000-000000000003');
select t_upsert_territory('dddddddd-4444-4444-a444-444444444444'::uuid, 'bf-dup-same', 'BF Dup Same renamed',
  (select polygon from public.territories where id='bf-dup-same'),
  jsonb_build_object('id','bf-dup-same','updatedAt',1700000000001::bigint,'assignedTo',:BF_JOHN,
    'assignments', jsonb_build_array(
      jsonb_build_object('userId',:BF_JOHN,'name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null),
      jsonb_build_object('userId',:BF_JOHN,'name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null))));
select t_assert((select name from public.territories where id='bf-dup-same') = 'BF Dup Same renamed'
            and (select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
                  where t.id='bf-dup-same' and e->>'unassignedAt' is null) = 1,
  'X20 under server authority a v40 upsert carrying the same rep open twice is ACCEPTED — the rename lands and the ledger stays I1-clean');
reset role;
update public.rally_config set assignment_server_authoritative = false;
call t_as('00000000-0000-4000-d000-000000000003');
-- Under LEGACY authority the same stale mirror (both copies still open) is
-- the phone's word on who is open. The ledger already holds the survivor
-- open and its twin closed at that same instant: the merge must pair each
-- derived copy with ITS prior — the open with the open, the dedupe-closed
-- with the dedupe-closed — never both with whichever sorted first, which
-- would either strip the closedByDedupe tag or close the rep's real run.
select t_upsert_territory('dddddddd-4444-4444-a444-444444444444'::uuid, 'bf-dup-same', 'BF Dup Same stale',
  (select polygon from public.territories where id='bf-dup-same'),
  jsonb_build_object('id','bf-dup-same','updatedAt',1700000000001::bigint,'assignedTo',:BF_JOHN,
    'assignments', jsonb_build_array(
      jsonb_build_object('userId',:BF_JOHN,'name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null),
      jsonb_build_object('userId',:BF_JOHN,'name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null))));
select t_assert((select name from public.territories where id='bf-dup-same') = 'BF Dup Same stale'
            and (select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
                  where t.id='bf-dup-same') = 2
            and (select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
                  where t.id='bf-dup-same' and e->>'unassignedAt' is null and (e->>'assignedAt')::bigint = 1700000000000) = 1
            and (select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
                  where t.id='bf-dup-same' and (e->>'closedByDedupe')::boolean and (e->>'unassignedAt')::bigint = 1700000000000) = 1
            and (select open_assignees from public.territories where id='bf-dup-same') = array[:BF_JOHN]::uuid[],
  'X20a under legacy authority a STALE mirror with the same rep open twice at one instant keeps the survivor open and the dedupe-closed twin tagged — the merge pairs each copy with its own prior');
select t_upsert_territory('dddddddd-4444-4444-a444-444444444444'::uuid, 'bf-dup-same', 'BF Dup Same again',
  (select polygon from public.territories where id='bf-dup-same'),
  jsonb_build_object('id','bf-dup-same','updatedAt',1700000000002::bigint,'assignedTo',:BF_JOHN,
    'assignments', jsonb_build_array(
      jsonb_build_object('userId',:BF_JOHN,'name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null),
      jsonb_build_object('userId',:BF_JOHN,'name','BF John','assignedBy','BF Lead','assignedAt','last tuesday','unassignedAt','soon'))));
select t_assert((select name from public.territories where id='bf-dup-same') = 'BF Dup Same again'
            and (select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
                  where t.id='bf-dup-same' and e->>'unassignedAt' is null) = 1,
  'X20b under legacy authority the same shape, with an unreadable timestamp beside it, is accepted and normalised');
reset role;

-- the activation guard REFUSES by name — it never casts a device-local id
update public.territories set archived = false where id = 'bf-36hex';
select t_raises('update public.rally_config set assignment_server_authoritative = true',
  'X21 a LIVE hood whose CURRENT assignee is a uuid-length non-uuid blocks the flip with the designed refusal, not a cast error', '23514');
update public.territories set archived = true where id = 'bf-36hex';

-- a future-dated open entry can still be closed
insert into public.territories (team_id, id, name, polygon, data) values
  (:TEAM, 'x-fut', 'Future', t_rect(60000, 0, 60100, 100),
   jsonb_build_object('id','x-fut','assignedTo',:JOHN,
     'assignments', jsonb_build_array(jsonb_build_object('userId',:JOHN,'name','John','assignedBy','Lead',
       'assignedAt',2000000000000::bigint,'unassignedAt',null))));
call t_as(:LEAD);
select set_territory_assignments('x-fut', array[:JAKE]::uuid[], 'op-fut');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='x-fut' and e->>'userId' = :JOHN and (e->>'unassignedAt')::bigint = 2000000000000) = 1
            and (select open_assignees from public.territories where id='x-fut') = array[:JAKE]::uuid[],
  'X22 an open entry dated in the future closes AT that instant, never before it — the reassignment is not refused');
reset role;

-- the top of the bigint range
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='bf-int8max' and (e->>'assignedAt')::bigint = 9223372036854775807 and e->>'unassignedAt' is null and not (e ? 'assignedAtRaw')) = 1
            and (select open_assignees from public.territories where id='bf-int8max') = array[:BF_JOHN]::uuid[],
  'B19 an assignedAt at the top of the bigint range is read as-is, open and untagged — nothing formats it as a timestamp');
call t_as('00000000-0000-4000-d000-000000000003');
select set_territory_assignments('bf-int8max', array[:BF_JAKE]::uuid[], 'op-int8max');
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where t.id='bf-int8max' and e->>'userId' = :BF_JOHN and (e->>'unassignedAt')::bigint = 9223372036854775807) = 1
            and (select open_assignees from public.territories where id='bf-int8max') = array[:BF_JAKE]::uuid[],
  'X23 it closes at that same instant, never before it, and the reassignment lands');
reset role;

-- DIFFERING MULTIPLICITY at one (userId, assignedAt). The server holds
-- [OPEN@T, CLOSED@T (dedupe twin)]; phones send fewer copies than that.
update public.rally_config set assignment_server_authoritative = false;
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  (:BF_TEAM, 'x-mult', 'X Mult', '[[2.0,40],[2.001,40],[2.001,40.001],[2.0,40.001]]'::jsonb, false, null,
   jsonb_build_object('id','x-mult','assignedTo',:BF_JOHN,
     'assignments', jsonb_build_array(
       jsonb_build_object('userId',:BF_JOHN,'name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null),
       jsonb_build_object('userId',:BF_JOHN,'name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null))));
select t_assert((select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e where t.id='x-mult') = 2
            and (select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e where t.id='x-mult' and e->>'unassignedAt' is null) = 1
            and (select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e where t.id='x-mult' and (e->>'closedByDedupe')::boolean) = 1,
  'X20c-setup the server prior is [OPEN@T, CLOSED@T tagged closedByDedupe]');
call t_as('00000000-0000-4000-d000-000000000003');
-- the mirror lists ONLY the closed twin: under legacy authority that is the
-- phone's word that nobody is open, i.e. an unassign. EXPECTED: the current
-- run closes at T. Identical closed triples (userId, assignedAt,
-- unassignedAt) are one fact — I4 keeps history as a set — so the ledger
-- may hold one such entry where it held two.
select t_upsert_territory(:BF_TEAM, 'x-mult', 'X Mult c',
  (select polygon from public.territories where id='x-mult'),
  jsonb_build_object('id','x-mult','updatedAt',1700000000001::bigint,'assignedTo','',
    'assignments', jsonb_build_array(
      jsonb_build_object('userId',:BF_JOHN,'name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',1700000000000::bigint))));
select t_assert((select name from public.territories where id='x-mult') = 'X Mult c'
            and (select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e where t.id='x-mult' and e->>'unassignedAt' is null) = 0
            and (select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e
                  where t.id='x-mult' and e->>'userId' = :BF_JOHN and (e->>'assignedAt')::bigint = 1700000000000 and (e->>'unassignedAt')::bigint = 1700000000000) >= 1
            and (select open_assignees from public.territories where id='x-mult') = '{}'::uuid[],
  'X20c under legacy authority a mirror carrying only the closed twin closes the current run at T — expected, it is an unassign — nothing is resurrected and nothing aborts');
-- the mirror now says OPEN@T against a ledger whose only entries at
-- (userId, assignedAt) are closed: closed stays closed
select t_upsert_territory(:BF_TEAM, 'x-mult', 'X Mult d',
  (select polygon from public.territories where id='x-mult'),
  jsonb_build_object('id','x-mult','updatedAt',1700000000002::bigint,'assignedTo',:BF_JOHN,
    'assignments', jsonb_build_array(
      jsonb_build_object('userId',:BF_JOHN,'name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null))));
select t_assert((select name from public.territories where id='x-mult') = 'X Mult d'
            and (select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e where t.id='x-mult' and e->>'unassignedAt' is null) = 0
            and (select open_assignees from public.territories where id='x-mult') = '{}'::uuid[],
  'X20d a mirror cannot REOPEN a run the ledger closed at the same (userId, assignedAt) — closed→open resurrection stays impossible');
reset role;
update public.rally_config set assignment_server_authoritative = true;
create temp table x_mult_before as select assignees, assignees_rev from public.territories where id='x-mult';
call t_as('00000000-0000-4000-d000-000000000003');
select t_upsert_territory(:BF_TEAM, 'x-mult', 'X Mult e',
  (select polygon from public.territories where id='x-mult'),
  jsonb_build_object('id','x-mult','updatedAt',1700000000003::bigint,'assignedTo',:BF_JOHN,
    'assignments', jsonb_build_array(
      jsonb_build_object('userId',:BF_JOHN,'name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null),
      jsonb_build_object('userId',:BF_JOHN,'name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null))));
reset role;
select t_assert((select name from public.territories where id='x-mult') = 'X Mult e'
            and (select assignees from public.territories where id='x-mult') = (select assignees from x_mult_before)
            and (select assignees_rev from public.territories where id='x-mult') = (select assignees_rev from x_mult_before),
  'X20e under server authority the mirror does not touch the ledger at all — byte-identical, revision unchanged, the rename lands');
update public.rally_config set assignment_server_authoritative = false;

\echo 'v41 SQL: all checks passed'
