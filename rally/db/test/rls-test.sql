-- RALLY Phase 1 — RLS proof suite. Runs after supabase-shim.sql and the
-- 0001 migration on a throwaway database (see run-rls-tests.sh).
-- Every check either prints PASS or aborts the whole run (ON_ERROR_STOP).
--
-- Cast: two teams, and on team A an owner, a leader, an active rep, a
-- disabled rep; team B has one rep; plus a brand-new signup on no team.

\set ON_ERROR_STOP on
\set QUIET on

-- ---------------------------------------------------------- helpers ----
create or replace function t_assert(cond boolean, label text) returns void
language plpgsql as $$
begin
  if cond is true then raise notice 'PASS: %', label;
  else raise exception 'FAIL: %', label;
  end if;
end $$;
grant execute on function t_assert(boolean, text) to public;

-- become <user> / become anon / become superuser again
create or replace procedure t_as(uid uuid) language plpgsql as $$
begin
  execute 'set role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, false);
end $$;
grant execute on procedure t_as(uuid) to public;

-- --------------------------------------------------------- fixtures ----
-- signups arrive through auth.users, exactly like GoTrue inserts them
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-a000-000000000001', 'owner-a@x.com',  '{"name":"Owner A"}'),
  ('00000000-0000-4000-a000-000000000002', 'lead-a@x.com',   '{"name":"Lead A"}'),
  ('00000000-0000-4000-a000-000000000003', 'rep-a@x.com',    '{"name":"Rep A"}'),
  ('00000000-0000-4000-a000-000000000004', 'benched-a@x.com','{"name":"Benched A"}'),
  ('00000000-0000-4000-a000-000000000005', 'rep-b@x.com',    '{"name":"Rep B"}'),
  ('00000000-0000-4000-a000-000000000006', 'newbie@x.com',   '{"name":"Newbie"}');

-- the signup trigger must have created least-authority profiles
select t_assert(
  (select count(*) from public.profiles
    where role = 'rep' and team_id is null and disabled = false) = 6,
  'signup trigger creates every profile as rep / no team / enabled');
select t_assert(
  (select name from public.profiles where email = 'rep-a@x.com') = 'Rep A',
  'signup trigger copies the name from user metadata');

-- server-side placement (what the dashboard / seed script does)
insert into public.teams (id, name) values
  ('11111111-1111-4111-a111-111111111111', 'Team A'),
  ('22222222-2222-4222-a222-222222222222', 'Team B');
update public.profiles set team_id = '11111111-1111-4111-a111-111111111111', role = 'owner'
  where email = 'owner-a@x.com';
update public.profiles set team_id = '11111111-1111-4111-a111-111111111111', role = 'leader'
  where email = 'lead-a@x.com';
update public.profiles set team_id = '11111111-1111-4111-a111-111111111111'
  where email in ('rep-a@x.com', 'benched-a@x.com');
update public.profiles set disabled = true where email = 'benched-a@x.com';
update public.profiles set team_id = '22222222-2222-4222-a222-222222222222'
  where email = 'rep-b@x.com';

-- seed data in both teams (as the server — bypasses RLS)
insert into public.pins (team_id, id, lat, lng, created_by) values
  ('11111111-1111-4111-a111-111111111111', 'pin-a1', 38.1, -98.1, '00000000-0000-4000-a000-000000000003'),
  ('11111111-1111-4111-a111-111111111111', 'pin-a2', 38.2, -98.2, '00000000-0000-4000-a000-000000000003'),
  ('22222222-2222-4222-a222-222222222222', 'pin-b1', 40.1, -111.1, '00000000-0000-4000-a000-000000000005');
insert into public.events (team_id, id, pin_id, disposition, at_ms, by_user) values
  ('11111111-1111-4111-a111-111111111111', 'ev-a1', 'pin-a1', 'nothome', 1700000000000, '00000000-0000-4000-a000-000000000003'),
  ('22222222-2222-4222-a222-222222222222', 'ev-b1', 'pin-b1', 'sold',    1700000000001, '00000000-0000-4000-a000-000000000005');
insert into public.territories (team_id, id, name) values
  ('11111111-1111-4111-a111-111111111111', 'hood-a1', 'Cypress Bend'),
  ('22222222-2222-4222-a222-222222222222', 'hood-b1', 'Elsewhere');
insert into public.customers (team_id, id, first, last) values
  ('11111111-1111-4111-a111-111111111111', 'cust-a1', 'Dana', 'Miles'),
  ('22222222-2222-4222-a222-222222222222', 'cust-b1', 'Lena', 'Ortiz');
insert into public.files (team_id, id, customer_id, kind, name) values
  ('11111111-1111-4111-a111-111111111111', 'file-a1', 'cust-a1', 'agreement', 'agreement.html'),
  ('22222222-2222-4222-a222-222222222222', 'file-b1', 'cust-b1', 'agreement', 'agreement.html');
insert into public.rep_locations (team_id, profile_id, lat, lng, at_ms) values
  ('11111111-1111-4111-a111-111111111111', '00000000-0000-4000-a000-000000000003', 38.11, -98.11, 1700000000002),
  ('22222222-2222-4222-a222-222222222222', '00000000-0000-4000-a000-000000000005', 40.11, -111.11, 1700000000003);

-- ============================================ 1. team A rep: visibility
call t_as('00000000-0000-4000-a000-000000000003');
select t_assert((select count(*) from public.pins) = 2,
  'rep A sees exactly team A''s pins');
select t_assert((select count(*) from public.pins where id = 'pin-b1') = 0,
  'rep A cannot see team B''s pin even by id');
select t_assert((select count(*) from public.events) = 1,
  'rep A sees only team A''s events');
select t_assert((select count(*) from public.customers) = 1
            and (select first from public.customers) = 'Dana',
  'rep A sees only team A''s customers');
select t_assert((select count(*) from public.territories) = 1,
  'rep A sees only team A''s territories');
select t_assert((select count(*) from public.files) = 1,
  'rep A sees only team A''s file metadata');
select t_assert((select count(*) from public.teams) = 1
            and (select name from public.teams) = 'Team A',
  'rep A sees only their own team row');
select t_assert((select count(*) from public.profiles) = 4,
  'rep A sees teammates'' profiles (4 on team A), nobody else''s');

-- rep (not leadership) reads only their OWN location rows
select t_assert((select count(*) from public.rep_locations) = 1
            and (select profile_id from public.rep_locations) = auth.uid(),
  'rep A sees only their own location points');

-- ============================================ 2. team B rep: isolation
call t_as('00000000-0000-4000-a000-000000000005');
select t_assert((select count(*) from public.pins where team_id = '11111111-1111-4111-a111-111111111111') = 0,
  'rep B reads zero team A pins');
select t_assert((select count(*) from public.customers where id = 'cust-a1') = 0,
  'rep B reads zero team A customers');
select t_assert((select count(*) from public.profiles where email like '%-a@x.com') = 0,
  'rep B cannot enumerate team A''s people');
select t_assert((select count(*) from public.rep_locations
                  where team_id = '11111111-1111-4111-a111-111111111111') = 0,
  'rep B reads zero team A locations');

-- ================================== 3. writes carry your team + identity
call t_as('00000000-0000-4000-a000-000000000003');
with ins as (
  insert into public.pins (team_id, id, lat, lng, created_by)
  values ('11111111-1111-4111-a111-111111111111', 'pin-a3', 38.3, -98.3, auth.uid())
  returning true as ok)
select t_assert((select ok from ins),
  'rep A can insert a pin into their own team');

do $$
begin
  begin
    insert into public.pins (team_id, id, lat, lng)
    values ('22222222-2222-4222-a222-222222222222', 'pin-evil', 1, 1);
    raise exception 'FAIL: cross-team pin insert was allowed';
  exception when insufficient_privilege then
    raise notice 'PASS: pin insert into another team is rejected';
  end;
end $$;

do $$
begin
  begin
    insert into public.events (team_id, id, pin_id, disposition, at_ms, by_user)
    values ('11111111-1111-4111-a111-111111111111', 'ev-forged', 'pin-a1', 'sold',
            1700000000009, '00000000-0000-4000-a000-000000000001');
    raise exception 'FAIL: event forged under another user was allowed';
  exception when insufficient_privilege then
    raise notice 'PASS: an event cannot be written as someone else';
  end;
end $$;

-- ======================================= 4. the knock log is append-only
do $$
begin
  begin
    update public.events set disposition = 'sold' where id = 'ev-a1';
    raise exception 'FAIL: event update was allowed';
  exception when insufficient_privilege then
    raise notice 'PASS: events cannot be updated (append-only)';
  end;
  begin
    delete from public.events where id = 'ev-a1';
    raise exception 'FAIL: event delete was allowed';
  exception when insufficient_privilege then
    raise notice 'PASS: events cannot be deleted (append-only)';
  end;
end $$;

-- ============================= 5. no DELETE anywhere — tombstones only
do $$
begin
  begin
    delete from public.pins where id = 'pin-a1';
    raise exception 'FAIL: pin delete was allowed';
  exception when insufficient_privilege then
    raise notice 'PASS: data rows cannot be deleted, only tombstoned';
  end;
end $$;
with ts as (
  update public.pins set deleted_at = now() where id = 'pin-a3'
  returning deleted_at is not null as ok)
select t_assert((select ok from ts),
  'tombstoning via update works for team members');

-- ========================= 6. role escalation dies at the column grants
do $$
begin
  begin
    update public.profiles set role = 'owner' where id = auth.uid();
    raise exception 'FAIL: rep promoted themselves';
  exception when insufficient_privilege then
    raise notice 'PASS: a rep cannot change their own role';
  end;
  begin
    update public.profiles set team_id = '22222222-2222-4222-a222-222222222222'
      where id = auth.uid();
    raise exception 'FAIL: rep moved themselves between teams';
  exception when insufficient_privilege then
    raise notice 'PASS: a rep cannot change their own team';
  end;
  begin
    update public.profiles set disabled = false where id = auth.uid();
    raise exception 'FAIL: rep wrote the disabled flag';
  exception when insufficient_privilege then
    raise notice 'PASS: a rep cannot touch the disabled flag';
  end;
end $$;
with nm as (
  update public.profiles set name = 'Rep A!' where id = auth.uid()
  returning name = 'Rep A!' as ok)
select t_assert((select ok from nm),
  'a rep CAN still update their own display name');

do $$
begin
  begin
    update public.profiles set name = 'gotcha'
      where id = '00000000-0000-4000-a000-000000000001';
    if not found then
      raise notice 'PASS: updating a teammate''s profile matches no rows';
    else
      raise exception 'FAIL: rep edited a teammate''s profile';
    end if;
  exception when insufficient_privilege then
    raise notice 'PASS: updating a teammate''s profile is rejected';
  end;
end $$;

-- ============================================ 7. leadership visibility
call t_as('00000000-0000-4000-a000-000000000002'); -- leader, team A
select t_assert((select count(*) from public.rep_locations) = 1
            and (select team_id from public.rep_locations) = '11111111-1111-4111-a111-111111111111',
  'a team A leader sees team A''s location points (and only those)');

call t_as('00000000-0000-4000-a000-000000000001'); -- owner, team A
select t_assert((select count(*) from public.rep_locations) = 1,
  'the team A owner sees team A''s location points');
select t_assert((select count(*) from public.pins where deleted_at is null) = 2,
  'owner A reads the same team-scoped pins as reps (no cross-team superpower)');

-- location writes: even the OWNER can only log their own coordinates
do $$
begin
  begin
    insert into public.rep_locations (team_id, profile_id, lat, lng, at_ms)
    values ('11111111-1111-4111-a111-111111111111',
            '00000000-0000-4000-a000-000000000003', 0, 0, 1700000000010);
    raise exception 'FAIL: owner wrote a location as a rep';
  exception when insufficient_privilege then
    raise notice 'PASS: nobody can write location points as another person';
  end;
end $$;

-- ===================================== 8. disabled rep: shut out of data
call t_as('00000000-0000-4000-a000-000000000004'); -- benched-a, disabled
select t_assert((select count(*) from public.pins) = 0,
  'a disabled rep reads zero team data');
do $$
begin
  begin
    insert into public.pins (team_id, id, lat, lng)
    values ('11111111-1111-4111-a111-111111111111', 'pin-benched', 2, 2);
    raise exception 'FAIL: disabled rep inserted a pin';
  exception when insufficient_privilege then
    raise notice 'PASS: a disabled rep cannot write team data';
  end;
end $$;
select t_assert((select disabled from public.profiles where id = auth.uid()) = true,
  'a disabled rep can still read their own profile (to learn they''re disabled)');

-- =============================== 9. new signup (no team yet): sees nothing
call t_as('00000000-0000-4000-a000-000000000006');
select t_assert((select count(*) from public.pins) = 0
            and (select count(*) from public.customers) = 0
            and (select count(*) from public.teams) = 0,
  'a team-less new signup reads no team data at all');
select t_assert((select count(*) from public.profiles) = 1
            and (select id from public.profiles) = auth.uid(),
  'a team-less new signup sees exactly one profile: their own');
do $$
begin
  begin
    insert into public.teams (name) values ('My Own Team');
    raise exception 'FAIL: client created a team';
  exception when insufficient_privilege then
    raise notice 'PASS: teams cannot be created from a client';
  end;
end $$;

-- ================================================== 10. anon: stone wall
reset role;
select set_config('request.jwt.claims', '', false);
set role anon;
do $$
begin
  begin
    perform count(*) from public.pins;
    raise exception 'FAIL: anon read pins';
  exception when insufficient_privilege then
    raise notice 'PASS: anon cannot read any table';
  end;
  begin
    perform count(*) from public.profiles;
    raise exception 'FAIL: anon read profiles';
  exception when insufficient_privilege then
    raise notice 'PASS: anon cannot read profiles';
  end;
end $$;
reset role;

-- ==================================== 11. payment scrub trigger (server)
-- even a hostile client that stuffs card numbers into the payload finds
-- only the allowlist on the server afterward
call t_as('00000000-0000-4000-a000-000000000003');
insert into public.customers (team_id, id, first, last, data) values
  ('11111111-1111-4111-a111-111111111111', 'cust-a2', 'Pat', 'Woo',
   '{"plan":"premium","payment":{"method":"card","last4":"4242","autopay":true,
     "billingAddress":{"street":"1 Elm","city":"Wichita","state":"KS","zip":"67202"},
     "card":{"name":"Pat Woo","number":"4242424242424242","exp":"12/27"},
     "ach":{"routing":"110000000","account":"000123456789"}}}'::jsonb);
/* card and ach now SURVIVE as objects, because the name on the card and the
   name/type on the bank account are honest metadata the payment screen has
   always captured. What must not survive is a CREDENTIAL inside them: the
   objects are rebuilt from named leaves, so number/exp/routing/account have
   nowhere to land. This is the stronger assertion — the old one only proved
   the whole object was thrown away. */
select t_assert(
  (select data->'payment'->'card' = '{"name":"Pat Woo"}'::jsonb
     from public.customers where id = 'cust-a2'),
  'card survives as the NAME ONLY — number and exp have nowhere to land');
select t_assert(
  (select data->'payment'->'ach' is null
     from public.customers where id = 'cust-a2'),
  'an ach object carrying only credentials stores nothing at all');
select t_assert(
  (select not (data #>> '{}' ~ '"(number|exp|expiry|cvv|cvc|routing|account|accountNumber|routingNumber)"')
     from public.customers where id = 'cust-a2'),
  'no credential KEY exists anywhere in the stored row');
select t_assert(
  (select data->'payment'->>'last4' = '4242'
      and data->'payment'->>'method' = 'card'
      and data->'payment'->'billingAddress'->>'city' = 'Wichita'
     from public.customers where id = 'cust-a2'),
  'the safe payment fields (method/last4/autopay/billingAddress) survive');
select t_assert(
  (select position('4242424242424242' in data::text) = 0
      and position('110000000' in data::text) = 0
      and position('000123456789' in data::text) = 0
     from public.customers where id = 'cust-a2'),
  'no card number, routing number or account number exists anywhere in the row');
reset role;
select set_config('request.jwt.claims', '', false);

-- =============================== 12. the realtime doorbell (Phase 3)
-- the write triggers ring once per statement per team, with EMPTY payloads
reset role;
select set_config('request.jwt.claims', '', false);
delete from realtime.messages;
call t_as('00000000-0000-4000-a000-000000000003');
insert into public.pins (team_id, id, lat, lng) values
  ('11111111-1111-4111-a111-111111111111', 'bell-1', 1, 1),
  ('11111111-1111-4111-a111-111111111111', 'bell-2', 2, 2);
reset role;
select set_config('request.jwt.claims', '', false);
select t_assert(
  (select count(*) from realtime.messages where topic = 'team:11111111-1111-4111-a111-111111111111') = 1,
  'a multi-row write rings the doorbell ONCE for the team');
select t_assert(
  (select payload = '{}'::jsonb and event = 'pins' from realtime.messages limit 1),
  'the doorbell carries an empty payload — never row data');

-- listening is my_team_id()-gated: exactly what Supabase's private-channel
-- authorizer evaluates (a SELECT on realtime.messages under the topic GUC)
call t_as('00000000-0000-4000-a000-000000000003'); -- rep A, team A
select set_config('realtime.topic', 'team:11111111-1111-4111-a111-111111111111', false);
select t_assert((select count(*) from realtime.messages) >= 1,
  'a team member may listen to their own team topic');
select set_config('realtime.topic', 'team:22222222-2222-4222-a222-222222222222', false);
select t_assert((select count(*) from realtime.messages) = 0,
  'joining ANOTHER team''s topic is refused by RLS');
reset role;
select set_config('request.jwt.claims', '', false);
call t_as('00000000-0000-4000-a000-000000000004'); -- benched (disabled) rep
select set_config('realtime.topic', 'team:11111111-1111-4111-a111-111111111111', false);
select t_assert((select count(*) from realtime.messages) = 0,
  'a disabled rep cannot listen to the team doorbell');
reset role;
select set_config('request.jwt.claims', '', false);
select set_config('realtime.topic', '', false);


-- ================= 13. territory writes are leadership-only (0003)
-- The capability set is NOT hardcoded here: run-rls-tests.sh reads
-- db/capability-matrix.json and passes each role's expected answer in as
-- :rep_manage / :leader_manage / :manager_manage / :owner_manage, so the
-- server matrix and the client matrix (tests/role-test.js) cannot drift.
reset role;
select set_config('request.jwt.claims', '', false);

-- helpers: an RLS refusal on UPDATE is SILENT (the USING clause simply
-- hides the row, 0 rows change) while an INSERT refusal RAISES. A real
-- denial check has to accept both shapes.
create or replace function t_write_denied(stmt text) returns boolean
language plpgsql as $$
declare n integer;
begin
  execute stmt;
  get diagnostics n = row_count;
  return n = 0;
exception when insufficient_privilege then
  return true;
end $$;
grant execute on function t_write_denied(text) to public;

create or replace function t_write_allowed(stmt text) returns boolean
language plpgsql as $$
declare n integer;
begin
  execute stmt;
  get diagnostics n = row_count;
  return n > 0;
exception when insufficient_privilege then
  return false;
end $$;
grant execute on function t_write_allowed(text) to public;

-- team A needs a manager: 0001's fixtures only cover owner / leader / rep
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-a000-000000000007', 'mgr-a@x.com', '{"name":"Manager A"}');
update public.profiles set team_id = '11111111-1111-4111-a111-111111111111', role = 'manager'
  where email = 'mgr-a@x.com';
-- and a disabled manager, to prove the role gate does not outrank is_active()
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-a000-000000000008', 'mgr-benched@x.com', '{"name":"Benched Mgr"}');
update public.profiles set team_id = '11111111-1111-4111-a111-111111111111',
                           role = 'manager', disabled = true
  where email = 'mgr-benched@x.com';
-- a manager on the OTHER team, to prove the role gate does not outrank team
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-a000-000000000009', 'mgr-b@x.com', '{"name":"Manager B"}');
update public.profiles set team_id = '22222222-2222-4222-a222-222222222222', role = 'manager'
  where email = 'mgr-b@x.com';

-- the territory under attack, already assigned to rep A
insert into public.territories (team_id, id, name, data) values
  ('11111111-1111-4111-a111-111111111111', 'hood-a2', 'Original Name',
   '{"assignedTo":"00000000-0000-4000-a000-000000000003","assignments":[]}'::jsonb);

-- ---- rep A: every territory-management operation, straight at PostgREST,
-- ---- with the UI nowhere in the picture
call t_as('00000000-0000-4000-a000-000000000003');

select t_assert(
  t_write_denied($q$insert into public.territories (team_id, id, name)
    values ('11111111-1111-4111-a111-111111111111','hood-rep-new','Rep Made This')$q$)
  = (:'rep_manage' = 'false'),
  'rep creating a territory matches the capability matrix (denied)');

select t_assert(
  t_write_denied($q$update public.territories set name = 'Renamed By Rep'
    where id = 'hood-a2'$q$) = (:'rep_manage' = 'false'),
  'rep renaming a territory matches the capability matrix (denied)');

select t_assert(
  t_write_denied($q$update public.territories set polygon = '[[1,1],[2,2],[3,3]]'::jsonb
    where id = 'hood-a2'$q$) = (:'rep_manage' = 'false'),
  'rep re-polygoning a territory matches the capability matrix (denied)');

-- assignment lives in data (assignedTo + the assignments[] history)
select t_assert(
  t_write_denied($q$update public.territories
    set data = jsonb_set(data,'{assignedTo}','"00000000-0000-4000-a000-000000000003"')
    where id = 'hood-a2'$q$) = (:'rep_manage' = 'false'),
  'rep reassigning a territory to themselves matches the matrix (denied)');

select t_assert(
  t_write_denied($q$update public.territories set archived = true
    where id = 'hood-a2'$q$) = (:'rep_manage' = 'false'),
  'rep archiving a territory matches the capability matrix (denied)');

select t_assert(
  t_write_denied($q$update public.territories set deleted_at = now()
    where id = 'hood-a2'$q$) = (:'rep_manage' = 'false'),
  'rep tombstoning a territory matches the capability matrix (denied)');

-- Smart Split's exact shape: N child inserts, then the parent tombstoned
select t_assert(
  t_write_denied($q$insert into public.territories (team_id, id, name) values
    ('11111111-1111-4111-a111-111111111111','split-1','Cypress Bend 1'),
    ('11111111-1111-4111-a111-111111111111','split-2','Cypress Bend 2')$q$)
  = (:'rep_manage' = 'false'),
  'rep running the Smart Split shape matches the capability matrix (denied)');

-- and nothing actually moved
select t_assert(
  (select name = 'Original Name' and archived = false and deleted_at is null
      and data->>'assignedTo' = '00000000-0000-4000-a000-000000000003'
     from public.territories where id = 'hood-a2'),
  'after every rep attempt the territory is byte-for-byte unchanged');
select t_assert(
  (select count(*) from public.territories
     where id in ('hood-rep-new','split-1','split-2')) = 0,
  'no rep-authored territory row exists');

-- ---- the rep's OWN job is untouched: pins, knocks and customers still write
select t_assert(
  t_write_allowed($q$insert into public.pins (team_id, id, lat, lng)
    values ('11111111-1111-4111-a111-111111111111','pin-still-ok', 38.9, -98.9)$q$),
  'a rep can still create a pin (no regression from 0003)');
select t_assert(
  t_write_allowed($q$insert into public.events (team_id, id, pin_id, disposition, at_ms, by_user)
    values ('11111111-1111-4111-a111-111111111111','ev-still-ok','pin-still-ok','sold',
            1700000000100,'00000000-0000-4000-a000-000000000003')$q$),
  'a rep can still log a knock (no regression from 0003)');
select t_assert(
  t_write_allowed($q$insert into public.customers (team_id, id, first, last)
    values ('11111111-1111-4111-a111-111111111111','cust-still-ok','Ray','Nunez')$q$),
  'a rep can still create a customer (no regression from 0003)');
reset role;
select set_config('request.jwt.claims', '', false);

-- ---- leader / manager / owner: the same operations, allowed
call t_as('00000000-0000-4000-a000-000000000002'); -- leader A
select t_assert(
  t_write_allowed($q$insert into public.territories (team_id, id, name)
    values ('11111111-1111-4111-a111-111111111111','hood-lead','Leader Made This')$q$)
  = (:'leader_manage' = 'true'),
  'leader creating a territory matches the capability matrix (allowed)');
select t_assert(
  t_write_allowed($q$update public.territories set name = 'Renamed By Leader'
    where id = 'hood-a2'$q$) = (:'leader_manage' = 'true'),
  'leader renaming a territory matches the capability matrix (allowed)');
reset role;
select set_config('request.jwt.claims', '', false);

call t_as('00000000-0000-4000-a000-000000000007'); -- manager A
select t_assert(
  t_write_allowed($q$insert into public.territories (team_id, id, name)
    values ('11111111-1111-4111-a111-111111111111','hood-mgr','Manager Made This')$q$)
  = (:'manager_manage' = 'true'),
  'manager creating a territory matches the capability matrix (allowed)');
select t_assert(
  t_write_allowed($q$update public.territories
    set data = jsonb_set(data,'{assignedTo}','"00000000-0000-4000-a000-000000000003"')
    where id = 'hood-a2'$q$) = (:'manager_manage' = 'true'),
  'manager assigning a territory matches the capability matrix (allowed)');
select t_assert(
  t_write_allowed($q$update public.territories set deleted_at = now()
    where id = 'hood-mgr'$q$) = (:'manager_manage' = 'true'),
  'manager tombstoning a territory matches the capability matrix (allowed)');
reset role;
select set_config('request.jwt.claims', '', false);

call t_as('00000000-0000-4000-a000-000000000001'); -- owner A
select t_assert(
  t_write_allowed($q$insert into public.territories (team_id, id, name)
    values ('11111111-1111-4111-a111-111111111111','hood-own','Owner Made This')$q$)
  = (:'owner_manage' = 'true'),
  'owner creating a territory matches the capability matrix (allowed)');
reset role;
select set_config('request.jwt.claims', '', false);

-- ---- the role gate never outranks the other two gates
call t_as('00000000-0000-4000-a000-000000000008'); -- DISABLED manager, team A
select t_assert(
  t_write_denied($q$insert into public.territories (team_id, id, name)
    values ('11111111-1111-4111-a111-111111111111','hood-benched','Benched Mgr')$q$),
  'a DISABLED manager still cannot write a territory');
select t_assert(
  t_write_denied($q$update public.territories set name = 'Benched Rename'
    where id = 'hood-a2'$q$),
  'a DISABLED manager still cannot edit a territory');
reset role;
select set_config('request.jwt.claims', '', false);

call t_as('00000000-0000-4000-a000-000000000009'); -- manager on team B
select t_assert(
  t_write_denied($q$insert into public.territories (team_id, id, name)
    values ('11111111-1111-4111-a111-111111111111','hood-crossteam','Team B Reach')$q$),
  'a manager of ANOTHER team cannot write into this team''s territories');
select t_assert(
  t_write_denied($q$update public.territories set name = 'Cross-team Rename'
    where id = 'hood-a2'$q$),
  'a manager of ANOTHER team cannot edit this team''s territory');
reset role;
select set_config('request.jwt.claims', '', false);

-- ---- self-promotion is still the shortest path around a role gate
call t_as('00000000-0000-4000-a000-000000000003'); -- rep A
do $$
begin
  begin
    update public.profiles set role = 'manager' where id = auth.uid();
    raise exception 'FAIL: rep promoted itself to manager';
  exception when insufficient_privilege then
    raise notice 'PASS: a rep cannot promote itself to clear the territory gate';
  end;
end $$;
reset role;
select set_config('request.jwt.claims', '', false);

-- ============ 14. no SECOND reachable path to a territory mutation
-- Territory ownership lives ONLY in public.territories (assignedTo and the
-- assignments[] history are inside its data column) — there is no separate
-- assignment table and no assignment column anywhere else.
select t_assert(
  (select count(*) from information_schema.columns
     where table_schema = 'public'
       and (column_name ilike '%assign%' or column_name ilike '%territory_owner%')) = 0,
  'no table outside territories carries a territory-assignment column');

-- authenticated may UPDATE exactly four tables, and nothing new slipped in
select t_assert(
  (select coalesce(string_agg(distinct table_name, ',' order by table_name), '')
     from information_schema.role_table_grants
    where grantee = 'authenticated' and table_schema = 'public'
      and privilege_type = 'UPDATE')
  = 'customers,files,pins,territories',
  'authenticated holds table-wide UPDATE on exactly the four expected tables');

-- profiles is reachable only through a single-column grant, so role, team_id
-- and disabled cannot be written from a client at all — the reason a rep
-- cannot promote itself past the new territory gate
select t_assert(
  (select coalesce(string_agg(column_name, ',' order by column_name), '')
     from information_schema.column_privileges
    where grantee = 'authenticated' and table_schema = 'public'
      and table_name = 'profiles' and privilege_type = 'UPDATE') = 'name',
  'profiles exposes UPDATE on the name column and nothing else');

/* SECURITY DEFINER functions bypass RLS by construction, so each one that
   can WRITE is a second door into the data. There is exactly one, it is
   named here, and any new one fails this check until somebody decides it
   belongs. The name is not a rubber stamp: sections 17 and 18 below take
   smart_split_territory apart from every role that must not be able to use
   it. Everything else must still be a trigger function or read-only. */
select t_assert(
  (select coalesce(string_agg(p.proname, ',' order by p.proname), '')
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and p.prorettype <> 'trigger'::regtype
      and p.provolatile = 'v') = 'smart_split_territory',
  'the ONLY writable SECURITY DEFINER function in public is smart_split_territory');
-- and it is not reachable by anon or by a bare PUBLIC grant
select t_assert(
  (select not has_function_privilege('anon',
     'public.smart_split_territory(text,text,jsonb)', 'execute')),
  'anon cannot execute the smart split function');

-- the trigger functions are not reachable as RPCs even though PostgREST
-- exposes the schema: Postgres refuses to call them outside a trigger
call t_as('00000000-0000-4000-a000-000000000003');
do $$
begin
  begin
    perform public.ping_team();
    raise exception 'FAIL: a trigger function was callable as an RPC';
  exception when others then
    raise notice 'PASS: trigger functions cannot be invoked as RPCs';
  end;
end $$;
reset role;
select set_config('request.jwt.claims', '', false);

-- ===== 15. the payment trigger under a MIXED-VERSION fleet (0004)
-- An older client's payload has no 'autopayRequested' and no 'status' key at
-- all. Defaulting a missing key to false would let it silently erase what a
-- customer actually asked for, every time a rep opened and saved the record.
-- Key PRESENCE is the discriminator: absent -> keep; present -> honour,
-- including an explicit false.
reset role;
select set_config('request.jwt.claims', '', false);

insert into public.customers (team_id, id, first, last, data) values
  ('11111111-1111-4111-a111-111111111111', 'cust-mix', 'Mix', 'Case',
   '{"payment":{"method":"ach","autopayRequested":true,"status":"pending_setup"}}'::jsonb);
select t_assert(
  (select data->'payment'->>'autopayRequested' = 'true'
      and data->'payment'->>'status' = 'pending_setup'
     from public.customers where id = 'cust-mix'),
  'a current client can record an explicit autopay request');

-- a v38-shaped save: legacy autopay, and no knowledge of the new keys
update public.customers
   set data = '{"payment":{"method":"ach","autopay":true,"last4":""}}'::jsonb
 where id = 'cust-mix';
select t_assert(
  (select data->'payment'->>'autopayRequested' = 'true'
      and data->'payment'->>'status' = 'pending_setup'
     from public.customers where id = 'cust-mix'),
  'an older client that omits the keys cannot erase the customer''s request');
select t_assert(
  (select not (data->'payment' ? 'autopay') from public.customers where id = 'cust-mix'),
  'and the legacy autopay field is still not stored');

-- but a current client turning autopay OFF is honoured: the key is present
update public.customers
   set data = '{"payment":{"method":"ach","autopayRequested":false,"status":"pending_setup"}}'::jsonb
 where id = 'cust-mix';
select t_assert(
  (select data->'payment'->>'autopayRequested' = 'false'
     from public.customers where id = 'cust-mix'),
  'an explicit false from a current client IS honoured');

/* No client may ever claim a payment method is live. An invalid status is
   treated as NOT SENT rather than clamped down, so a broken or hostile client
   cannot destroy honest stored state either — it simply changes nothing. */
update public.customers
   set data = '{"payment":{"method":"ach","autopayRequested":false,"status":"pending_setup"}}'::jsonb
 where id = 'cust-mix';
update public.customers
   set data = '{"payment":{"method":"card","autopayRequested":true,"status":"active"}}'::jsonb
 where id = 'cust-mix';
select t_assert(
  (select data->'payment'->>'status' <> 'active'
     from public.customers where id = 'cust-mix'),
  'a client claiming status "active" never has that stored');
select t_assert(
  (select data->'payment'->>'status' = 'pending_setup'
     from public.customers where id = 'cust-mix'),
  'an invalid status changes nothing rather than destroying stored state');

-- a brand-new row with no history defaults honestly rather than optimistically
insert into public.customers (team_id, id, first, last, data) values
  ('11111111-1111-4111-a111-111111111111', 'cust-mix2', 'Fresh', 'Row',
   '{"payment":{"method":"card","autopay":true}}'::jsonb);
/* A brand-new row written by a client too old to know the fields carries
   NEITHER key. That is deliberate: the INSERT pass must not write a value it
   did not receive, because its output becomes EXCLUDED and the UPDATE pass
   would then honour the injection as client intent (and lose a concurrent
   commit — see test/race-test.sh). An absent key reads as "no request on
   record", which is the honest answer. */
select t_assert(
  (select not (data->'payment' ? 'autopayRequested')
      and not (data->'payment' ? 'status')
     from public.customers where id = 'cust-mix2'),
  'a NEW row from an older client records NO request rather than inventing one');
select t_assert(
  (select coalesce(data->'payment'->>'autopayRequested','false') = 'false'
      and coalesce(data->'payment'->>'status','not_configured') = 'not_configured'
     from public.customers where id = 'cust-mix2'),
  'and it reads back as no request and nothing configured');

-- THE STATEMENT SHAPE THAT ACTUALLY MATTERS. Every sync push is a PostgREST
-- upsert = INSERT .. ON CONFLICT DO UPDATE, for which Postgres fires this
-- BEFORE INSERT OR UPDATE trigger TWICE. A preservation rule that reads only
-- OLD passes a plain-UPDATE test and still loses the field here, because the
-- INSERT pass's output is what becomes EXCLUDED. These checks are the ones
-- that would have caught it.
update public.customers
   set data = '{"payment":{"method":"ach","autopayRequested":true,"status":"pending_setup"}}'::jsonb
 where id = 'cust-mix';
insert into public.customers (team_id, id, first, last, data) values
  ('11111111-1111-4111-a111-111111111111', 'cust-mix', 'Mix', 'Case',
   '{"payment":{"method":"ach","autopay":true,"last4":""}}'::jsonb)
on conflict (team_id, id) do update set data = excluded.data;
select t_assert(
  (select data->'payment'->>'autopayRequested' = 'true'
      and data->'payment'->>'status' = 'pending_setup'
     from public.customers where id = 'cust-mix'),
  'an UPSERT from an older client cannot erase the request either (double-fire)');

-- and an upsert from a current client still gets its explicit value honoured
insert into public.customers (team_id, id, first, last, data) values
  ('11111111-1111-4111-a111-111111111111', 'cust-mix', 'Mix', 'Case',
   '{"payment":{"method":"ach","autopayRequested":false,"status":"pending_setup"}}'::jsonb)
on conflict (team_id, id) do update set data = excluded.data;
select t_assert(
  (select data->'payment'->>'autopayRequested' = 'false'
     from public.customers where id = 'cust-mix'),
  'an UPSERT from a current client still honours an explicit false');

-- an upsert creating a genuinely new row keeps the honest default
insert into public.customers (team_id, id, first, last, data) values
  ('11111111-1111-4111-a111-111111111111', 'cust-mix3', 'Brand', 'New',
   '{"payment":{"method":"card","autopay":true}}'::jsonb)
on conflict (team_id, id) do update set data = excluded.data;
select t_assert(
  (select coalesce(data->'payment'->>'autopayRequested','false') = 'false'
      and coalesce(data->'payment'->>'status','not_configured') = 'not_configured'
     from public.customers where id = 'cust-mix3'),
  'an UPSERT with no prior row records nothing, it does not preserve a ghost');

-- and credentials still cannot ride in through the upsert path
insert into public.customers (team_id, id, first, last, data) values
  ('11111111-1111-4111-a111-111111111111', 'cust-mix', 'Mix', 'Case',
   '{"payment":{"method":"card","card":{"number":"4111111111111111"},
     "ach":{"routing":"021000021","account":"000123456789"}}}'::jsonb)
on conflict (team_id, id) do update set data = excluded.data;
select t_assert(
  (select position('4111111111111111' in data::text) = 0
      and position('000123456789' in data::text) = 0
      and not (data->'payment' ? 'card') and not (data->'payment' ? 'ach')
     from public.customers where id = 'cust-mix'),
  'the upsert path strips credentials exactly like the insert path');

-- ===== 16. the ADMITTED safe metadata, and the uniform three-way rule
/* card.name, ach.name and ach.type are honest metadata, not credentials:
   none of them can authorise a payment, and the v39 payment screen has
   always captured them. Before this revision the client kept them on the
   device and the server dropped them, so they vanished on any round trip.
   They are admitted under the same rebuild discipline as everything else.

   These checks also prove the rule that governs EVERY field now:
     sent and valid   -> stored
     sent but invalid -> the stored value survives; nothing is invented
     not sent         -> the stored value survives                        */

insert into public.customers (team_id, id, first, last, data) values
  ('11111111-1111-4111-a111-111111111111', 'cust-meta', 'Meta', 'Data',
   '{"payment":{"method":"ach","last4":"1234",
     "card":{"name":"Dana Q Rivers"},
     "ach":{"name":"Dana Rivers","type":"savings"},
     "billingAddress":{"street":"1234 W 5600 S","city":"Provo",
                       "state":"UT","zip":"84604"}}}'::jsonb);
select t_assert(
  (select data->'payment'->'card'->>'name' = 'Dana Q Rivers'
      and data->'payment'->'ach'->>'name' = 'Dana Rivers'
      and data->'payment'->'ach'->>'type' = 'savings'
     from public.customers where id = 'cust-meta'),
  'cardholder name, account-holder name and account type round-trip');

-- a PAN typed into the name box is not a name: it is dropped, not stored
update public.customers
   set data = '{"payment":{"card":{"name":"4111111111111111"}}}'::jsonb
 where id = 'cust-meta';
select t_assert(
  (select data->'payment'->'card'->>'name' = 'Dana Q Rivers'
     from public.customers where id = 'cust-meta'),
  'a card number in the NAME field is refused and the real name survives');

-- so is a routing number in the account-holder name
update public.customers
   set data = '{"payment":{"ach":{"name":"021000021"}}}'::jsonb
 where id = 'cust-meta';
select t_assert(
  (select data->'payment'->'ach'->>'name' = 'Dana Rivers'
      and position('021000021' in data::text) = 0
     from public.customers where id = 'cust-meta'),
  'a routing number in the account-holder NAME is refused, the name survives');

-- account type is a closed set; "crypto" is not client intent
update public.customers
   set data = '{"payment":{"ach":{"type":"crypto"}}}'::jsonb
 where id = 'cust-meta';
select t_assert(
  (select data->'payment'->'ach'->>'type' = 'savings'
     from public.customers where id = 'cust-meta'),
  'an out-of-set account type does not destroy the stored one');

-- an invalid method must not destroy a stored valid one either
update public.customers
   set data = '{"payment":{"method":"crypto"}}'::jsonb
 where id = 'cust-meta';
select t_assert(
  (select data->'payment'->>'method' = 'ach'
     from public.customers where id = 'cust-meta'),
  'an invalid method does not destroy the stored method');

-- nor may a malformed last4 (a whole PAN) wipe a real one
update public.customers
   set data = '{"payment":{"last4":"4111111111111111"}}'::jsonb
 where id = 'cust-meta';
select t_assert(
  (select data->'payment'->>'last4' = '1234'
     from public.customers where id = 'cust-meta'),
  'a full PAN in last4 is refused and the stored last4 survives');

-- one bad address leaf must not wipe the other three
update public.customers
   set data = '{"payment":{"billingAddress":{"street":"4111111111111111",
       "city":"Provo","state":"UT","zip":"84604"}}}'::jsonb
 where id = 'cust-meta';
select t_assert(
  (select data->'payment'->'billingAddress'->>'street' = '1234 W 5600 S'
      and data->'payment'->'billingAddress'->>'city' = 'Provo'
      and data->'payment'->'billingAddress'->>'zip' = '84604'
     from public.customers where id = 'cust-meta'),
  'a card number in the street line is refused; the other leaves are untouched');

-- an EXPLICIT empty string is a rep clearing a field, and must go through
update public.customers
   set data = '{"payment":{"card":{"name":""},"billingAddress":{"city":""}}}'::jsonb
 where id = 'cust-meta';
select t_assert(
  (select data->'payment'->'card'->>'name' = ''
      and data->'payment'->'billingAddress'->>'city' = ''
     from public.customers where id = 'cust-meta'),
  'clearing a field is real intent: an explicit empty string is stored');

-- nested JSON where a string belongs is not a value; the stored one stands
update public.customers
   set data = '{"payment":{"ach":{"name":{"$ne":null}}}}'::jsonb
 where id = 'cust-meta';
select t_assert(
  (select data->'payment'->'ach'->>'name' = 'Dana Rivers'
      and jsonb_typeof(data->'payment'->'ach'->'name') = 'string'
     from public.customers where id = 'cust-meta'),
  'nested JSON in a name field is refused and cannot become the value');

-- MIXED VERSION: a v38 client knows none of these keys. Saving the record
-- from that client must not erase them. Both statement shapes.
update public.customers
   set data = '{"payment":{"method":"ach","autopay":true,"last4":"1234"}}'::jsonb
 where id = 'cust-meta';
select t_assert(
  (select data->'payment'->'card'->>'name' = ''
      and data->'payment'->'ach'->>'name' = 'Dana Rivers'
      and data->'payment'->'ach'->>'type' = 'savings'
     from public.customers where id = 'cust-meta'),
  'an older client that never heard of card/ach names cannot erase them');
insert into public.customers (team_id, id, first, last, data) values
  ('11111111-1111-4111-a111-111111111111', 'cust-meta', 'Meta', 'Data',
   '{"payment":{"method":"ach","autopay":true,"last4":"1234"}}'::jsonb)
on conflict (team_id, id) do update set data = excluded.data;
select t_assert(
  (select data->'payment'->'ach'->>'name' = 'Dana Rivers'
      and data->'payment'->'ach'->>'type' = 'savings'
      and data->'payment'->'billingAddress'->>'zip' = '84604'
     from public.customers where id = 'cust-meta'),
  'and it cannot erase them through the UPSERT path either (double-fire)');

-- a brand-new row from such a client invents nothing
insert into public.customers (team_id, id, first, last, data) values
  ('11111111-1111-4111-a111-111111111111', 'cust-meta2', 'Old', 'Client',
   '{"payment":{"method":"card","autopay":true}}'::jsonb)
on conflict (team_id, id) do update set data = excluded.data;
select t_assert(
  (select not (data->'payment' ? 'card') and not (data->'payment' ? 'ach')
      and not (data->'payment' ? 'billingAddress')
     from public.customers where id = 'cust-meta2'),
  'a new row from an older client records no name metadata rather than blanks');

-- ============ 17. ATOMIC SMART SPLIT: who may, and what a split may be (0005)
/* Smart Split writes N+1 rows. Doing it from a client meant every one of
   them could fail alone, so "children exist beside a live parent" and
   "parent gone, half the children missing" were both reachable. The whole
   operation is now one transaction behind one SECURITY DEFINER function,
   which is a door that bypasses RLS — so the checks it makes on the way in
   are the entire authorization story, and they are taken apart here. */

-- a disposable parent for team A, and one for team B
insert into public.territories (team_id, id, name, polygon) values
  ('11111111-1111-4111-a111-111111111111', 'split-parent',  'Big Hood',
   '[[0,0],[4,0],[4,4],[0,4]]'::jsonb),
  ('11111111-1111-4111-a111-111111111111', 'split-parent-2','Second Hood',
   '[[0,0],[4,0],[4,4],[0,4]]'::jsonb),
  ('22222222-2222-4222-a222-222222222222', 'split-parent-b','Team B Hood',
   '[[0,0],[4,0],[4,4],[0,4]]'::jsonb);

create or replace function pg_temp.kids(prefix text) returns jsonb
language sql as $f$
  select jsonb_build_array(
    jsonb_build_object('id', prefix || '-a', 'name', 'Big Hood A',
      'polygon', '[[0,0],[2,0],[2,4],[0,4]]'::jsonb, 'homes', 20),
    jsonb_build_object('id', prefix || '-b', 'name', 'Big Hood B',
      'polygon', '[[2,0],[4,0],[4,4],[2,4]]'::jsonb, 'homes', 20))
$f$;

-- runs the call as `uid` and returns 'ok' or the SQLSTATE it raised
create or replace function pg_temp.try_split(uid uuid, parent text, op text, kids jsonb)
returns text language plpgsql as $f$
declare r jsonb;
begin
  call t_as(uid);
  begin
    select public.smart_split_territory(parent, op, kids) into r;
    reset role;
    perform set_config('request.jwt.claims', '', false);
    return coalesce(r->>'status', 'ok');
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', false);
    return sqlstate;
  end;
end $f$;

-- ---- who may not
select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000003', 'split-parent',
                    'op-rep', pg_temp.kids('rep')) = '42501',
  'a REP is refused by the split function itself, not by the UI');
select t_assert(
  (select count(*) from public.territories where id like 'rep-%') = 0,
  'and the refused rep created no children');

select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000004', 'split-parent',
                    'op-benched', pg_temp.kids('ben')) = '42501',
  'a DISABLED user is refused even though the role column says otherwise');

select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000006', 'split-parent',
                    'op-newbie', pg_temp.kids('new')) = '42501',
  'a user with NO TEAM is refused');

-- team B's owner may not reach into team A, and vice versa
update public.profiles set role = 'owner' where email = 'rep-b@x.com';
select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000005', 'split-parent',
                    'op-crossteam', pg_temp.kids('cross')) = '42501',
  'a CROSS-TEAM owner cannot find, let alone split, another team''s parent');
select t_assert(
  (select count(*) from public.territories where id like 'cross-%') = 0,
  'and no children of that attempt exist anywhere');
update public.profiles set role = 'rep' where email = 'rep-b@x.com';

-- ---- what a split may not be
select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000002', 'no-such-parent',
                    'op-missing', pg_temp.kids('miss')) = '42501',
  'a parent that does not exist is refused');
select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000002', 'split-parent',
                    'op-one', jsonb_build_array(
      jsonb_build_object('id','one-a','name','A','polygon','[[0,0],[1,0],[1,1]]'::jsonb))) = '22023',
  'a "split" into ONE child is not a split');
select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000002', 'split-parent',
                    'op-dup', jsonb_build_array(
      jsonb_build_object('id','dup','name','A','polygon','[[0,0],[1,0],[1,1]]'::jsonb),
      jsonb_build_object('id','dup','name','B','polygon','[[1,0],[2,0],[2,1]]'::jsonb))) = '22023',
  'two children with the same id are refused');
select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000002', 'split-parent',
                    'op-self', jsonb_build_array(
      jsonb_build_object('id','split-parent','name','A','polygon','[[0,0],[1,0],[1,1]]'::jsonb),
      jsonb_build_object('id','self-b','name','B','polygon','[[1,0],[2,0],[2,1]]'::jsonb))) = '22023',
  'a child may not reuse the parent id');
select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000002', 'split-parent',
                    'op-badgeom', jsonb_build_array(
      jsonb_build_object('id','bad-a','name','A','polygon','[[0,0],[1,0]]'::jsonb),
      jsonb_build_object('id','bad-b','name','B','polygon','[[1,0],[2,0],[2,1]]'::jsonb))) = '22023',
  'a polygon with fewer than three points is refused');
select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000002', 'split-parent',
                    'op-badpt', jsonb_build_array(
      jsonb_build_object('id','pt-a','name','A','polygon','[[0,0],[1,0],["x",1]]'::jsonb),
      jsonb_build_object('id','pt-b','name','B','polygon','[[1,0],[2,0],[2,1]]'::jsonb))) = '22023',
  'a polygon point that is not two numbers is refused');
select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000002', 'split-parent',
                    'op-offearth', jsonb_build_array(
      jsonb_build_object('id','off-a','name','A','polygon','[[0,0],[1,0],[999,91]]'::jsonb),
      jsonb_build_object('id','off-b','name','B','polygon','[[1,0],[2,0],[2,1]]'::jsonb))) = '22023',
  'a polygon point off the surface of the earth is refused');
select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000002', 'split-parent',
                    'op-notarray', '{"nope":true}'::jsonb) = '22023',
  'children that are not an array at all are refused');

-- EVERY refusal above left the world exactly as it was
select t_assert(
  (select deleted_at is null from public.territories where id = 'split-parent'),
  'after eleven refused attempts the parent is still alive');
select t_assert(
  (select count(*) from public.territories
    where id ~ '^(rep|ben|new|cross|miss|one|dup|self|bad|pt|off)-') = 0,
  'and not one child row was created by any of them');
select t_assert(
  (select count(*) from public.territory_splits) = 0,
  'and no operation was recorded');

-- ---- the happy path, as a LEADER
select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000002', 'split-parent',
                    'op-real', pg_temp.kids('kid')) = 'committed',
  'a LEADER splits the hood and the call reports it committed');
select t_assert(
  (select count(*) from public.territories
    where id in ('kid-a','kid-b') and deleted_at is null) = 2,
  'both children exist');
select t_assert(
  (select deleted_at is not null from public.territories where id = 'split-parent'),
  'and the parent is retired in the same breath');
select t_assert(
  (select name = 'Big Hood A' and homes = 20 and polygon = '[[0,0],[2,0],[2,4],[0,4]]'::jsonb
     from public.territories where id = 'kid-a'),
  'the child carries the name, homes and geometry the client calculated');
select t_assert(
  (select created_by = '00000000-0000-4000-a000-000000000002'
     from public.territories where id = 'kid-a'),
  'and is attributed to the leader who ran it, from auth.uid()');

-- ---- IDEMPOTENCY: the response was lost, the device retries
select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000002', 'split-parent',
                    'op-real', pg_temp.kids('kid')) = 'already_committed',
  'the SAME operation submitted again is recognised, not repeated');
select t_assert(
  (select count(*) from public.territories where id like 'kid-%') = 2,
  'and creates ZERO new children');

-- a retry after the operator has been demoted still gets its answer: the
-- split is a server fact already, and refusing to say so would make the
-- device roll back state the server holds
update public.profiles set role = 'rep' where email = 'lead-a@x.com';
select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000002', 'split-parent',
                    'op-real', pg_temp.kids('kid')) = 'already_committed',
  'a retry by a since-DEMOTED operator still resolves to the committed fact');
-- but a NEW split by that same demoted user is refused
select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000002', 'split-parent-2',
                    'op-after-demotion', pg_temp.kids('demoted')) = '42501',
  'while a NEW split by the demoted user is refused outright');
update public.profiles set role = 'leader' where email = 'lead-a@x.com';

-- ---- a parent may be split ONCE
select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000001', 'split-parent',
                    'op-second-go', pg_temp.kids('again')) = '55000',
  'an ALREADY SPLIT parent cannot be split a second time');
select t_assert(
  (select count(*) from public.territories where id like 'again-%') = 0,
  'and that attempt created nothing');

-- ---- an operation id belongs to one parent
select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000001', 'split-parent-2',
                    'op-real', pg_temp.kids('reuse')) = '22023',
  'reusing an operation id for a DIFFERENT parent is refused');
select t_assert(
  (select count(*) from public.territories where id like 'reuse-%') = 0,
  'and creates nothing');

-- ---- a child id that is already a live territory is not a new child
select t_assert(
  pg_temp.try_split('00000000-0000-4000-a000-000000000001', 'split-parent-2',
                    'op-collide', jsonb_build_array(
      jsonb_build_object('id','kid-a','name','A','polygon','[[0,0],[1,0],[1,1]]'::jsonb),
      jsonb_build_object('id','collide-b','name','B','polygon','[[1,0],[2,0],[2,1]]'::jsonb))) = '23505',
  'a child id that already names a live territory is refused');
select t_assert(
  (select count(*) from public.territories where id = 'collide-b') = 0
    and (select deleted_at is null from public.territories where id = 'split-parent-2'),
  'and neither the other child nor the parent transition survived it');

-- ---- the operation table is readable but not writable by a client
call t_as('00000000-0000-4000-a000-000000000002');
select t_assert((select count(*) from public.territory_splits) = 1,
  'a leader can READ its own team''s split record (how a lost response heals)');
reset role;
select set_config('request.jwt.claims', '', false);
call t_as('00000000-0000-4000-a000-000000000005');
select t_assert((select count(*) from public.territory_splits) = 0,
  'and cannot see another team''s split records at all');
reset role;
select set_config('request.jwt.claims', '', false);
select t_assert(
  (select not has_table_privilege('authenticated', 'public.territory_splits', 'insert')
      and not has_table_privilege('authenticated', 'public.territory_splits', 'update')
      and not has_table_privilege('authenticated', 'public.territory_splits', 'delete')),
  'no client may write the split record by any route but the function');

-- ===== 18. the WHOLE payment object under the exact production upsert (0004)
/* The client's upsert is
     INSERT .. ON CONFLICT (team_id,id) DO UPDATE SET <every column> = EXCLUDED.<column>
   so the whole `data` column is replaced by whatever the client sent. The
   field-level three-way rule ran only INSIDE an incoming payment object; a
   payload with no payment key at all replaced the column before the rule
   ever looked, and the safe payment the row held was simply gone. That is
   precisely the payload the client sends when it fails closed. These checks
   use the production column list verbatim, for both statement shapes. */

-- the exact PostgREST shape, as a helper so every case below sends the same thing
create or replace function pg_temp.upsert_prod(cid text, d jsonb, tomb boolean default false)
returns void language sql as $f$
  insert into public.customers (team_id, id, first, last, email, phones, created_by, deleted_at, data)
  values ('11111111-1111-4111-a111-111111111111', cid, 'Dana', 'Rivers', 'd@x.com', '[]'::jsonb,
          null, case when tomb then now() else null end, d)
  on conflict (team_id, id) do update set
    team_id = excluded.team_id, id = excluded.id, first = excluded.first, last = excluded.last,
    email = excluded.email, phones = excluded.phones, created_by = excluded.created_by,
    deleted_at = excluded.deleted_at, data = excluded.data
$f$;

-- the SAFE object every case starts from — written through the trigger, then
-- read back so the comparison is against what the trigger actually stored
select pg_temp.upsert_prod('cust-abs',
  '{"plan":{"id":"prem"},"payment":{"method":"ach","autopayRequested":true,"status":"pending_setup",
    "card":{"name":"Dana Rivers"},"ach":{"name":"Dana Rivers","type":"savings"},
    "billingAddress":{"street":"1 Elm","city":"Provo","state":"UT","zip":"84604"}}}'::jsonb);
create temporary table abs_ref as
  select data->'payment' as pay from public.customers where id = 'cust-abs';
select t_assert((select pay->>'autopayRequested' = 'true' and pay->'card'->>'name' = 'Dana Rivers'
                   from abs_ref), '(setup) the reference safe payment is stored');

-- 1. OLD has payment, incoming has NO payment key -> survives UNCHANGED
select pg_temp.upsert_prod('cust-abs', '{"plan":{"id":"prem"},"notesForever":"edited blind"}'::jsonb);
select t_assert(
  (select data->'payment' = (select pay from abs_ref) from public.customers where id = 'cust-abs'),
  '1 a payment-less UPSERT leaves the stored safe payment byte-for-byte unchanged');
select t_assert(
  (select data->>'notesForever' = 'edited blind' from public.customers where id = 'cust-abs'),
  '1b …while the rest of the record the client DID send lands normally');
-- the same, as the plain-UPDATE (PATCH) shape
update public.customers set data = '{"plan":{"id":"prem"},"notesForever":"patched blind"}'::jsonb
 where id = 'cust-abs';
select t_assert(
  (select data->'payment' = (select pay from abs_ref) from public.customers where id = 'cust-abs'),
  '1c a payment-less plain UPDATE preserves it too');

-- 2. OLD has payment, incoming has payment -> the field-level rules apply (unchanged)
select pg_temp.upsert_prod('cust-abs',
  '{"plan":{"id":"prem"},"payment":{"method":"card","autopayRequested":false}}'::jsonb);
select t_assert(
  (select data->'payment'->>'method' = 'card' and data->'payment'->>'autopayRequested' = 'false'
      and data->'payment'->'card'->>'name' = 'Dana Rivers'
      and data->'payment'->'billingAddress'->>'zip' = '84604'
     from public.customers where id = 'cust-abs'),
  '2 an incoming payment object is merged field by field, as before');
-- put the reference back for the remaining cases
select pg_temp.upsert_prod('cust-abs',
  '{"plan":{"id":"prem"},"payment":{"method":"ach","autopayRequested":true,"status":"pending_setup",
    "card":{"name":"Dana Rivers"},"ach":{"name":"Dana Rivers","type":"savings"},
    "billingAddress":{"street":"1 Elm","city":"Provo","state":"UT","zip":"84604"}}}'::jsonb);

-- 3. OLD has no payment, incoming has no payment -> nothing is manufactured
select pg_temp.upsert_prod('cust-abs-none', '{"plan":{"id":"prem"}}'::jsonb);
select pg_temp.upsert_prod('cust-abs-none', '{"plan":{"id":"prem"},"notesForever":"x"}'::jsonb);
select t_assert(
  (select not (data ? 'payment') from public.customers where id = 'cust-abs-none'),
  '3 two payment-less writes on a row with no payment invent no payment object');
update public.customers set data = '{"plan":{"id":"prem"}}'::jsonb where id = 'cust-abs-none';
select t_assert(
  (select not (data ? 'payment') from public.customers where id = 'cust-abs-none'),
  '3b …and neither does a plain UPDATE');

-- 4. OLD has payment, incoming payment is MALFORMED (not an object) -> stored survives
select pg_temp.upsert_prod('cust-abs', '{"plan":{"id":"prem"},"payment":null}'::jsonb);
select t_assert(
  (select data->'payment' = (select pay from abs_ref) from public.customers where id = 'cust-abs'),
  '4a payment: null cannot erase the stored object');
select pg_temp.upsert_prod('cust-abs', '{"plan":{"id":"prem"},"payment":"4111111111111111"}'::jsonb);
select t_assert(
  (select data->'payment' = (select pay from abs_ref) from public.customers where id = 'cust-abs'),
  '4b payment: <string> cannot erase it, and the string is not stored');
select pg_temp.upsert_prod('cust-abs', '{"plan":{"id":"prem"},"payment":[1,2,3]}'::jsonb);
select t_assert(
  (select data->'payment' = (select pay from abs_ref) from public.customers where id = 'cust-abs'),
  '4c payment: <array> cannot erase it');
select pg_temp.upsert_prod('cust-abs', '{"plan":{"id":"prem"},"payment":12345}'::jsonb);
select t_assert(
  (select data->'payment' = (select pay from abs_ref) from public.customers where id = 'cust-abs'),
  '4d payment: <number> cannot erase it');
select pg_temp.upsert_prod('cust-abs',
  '{"plan":{"id":"prem"},"payment":{"method":7,"autopayRequested":"yes","status":"active",
    "card":"Dana","billingAddress":"1 Elm"}}'::jsonb);
select t_assert(
  (select data->'payment' = (select pay from abs_ref) from public.customers where id = 'cust-abs'),
  '4e an object whose every leaf is malformed changes nothing at all');

-- the one exception: a TOMBSTONE carries nothing forward
select pg_temp.upsert_prod('cust-abs-tomb',
  '{"payment":{"method":"card","card":{"name":"Gone Person"},
    "billingAddress":{"street":"9 Vine","city":"Orem","state":"UT","zip":"84057"}}}'::jsonb);
update public.customers
   set deleted_at = now(), data = '{}'::jsonb, first = '', last = '', email = '', phones = '[]'::jsonb
 where id = 'cust-abs-tomb';                                     -- the client's tombstone PATCH
select t_assert(
  (select not (data ? 'payment') and data = '{}'::jsonb
     from public.customers where id = 'cust-abs-tomb'),
  '5 a customer tombstone keeps the id and loses the person — payment metadata included');
select t_assert(
  (select position('Gone Person' in data::text) = 0 and position('9 Vine' in data::text) = 0
     from public.customers where id = 'cust-abs-tomb'),
  '5b …nothing of the billing name or address survives on the tombstone');
-- and the same tombstone through the upsert shape
select pg_temp.upsert_prod('cust-abs-tomb2',
  '{"payment":{"method":"ach","ach":{"name":"Also Gone","type":"checking"}}}'::jsonb);
select pg_temp.upsert_prod('cust-abs-tomb2', '{}'::jsonb, true);
select t_assert(
  (select deleted_at is not null and not (data ? 'payment')
     from public.customers where id = 'cust-abs-tomb2'),
  '5c …via the upsert shape as well');

-- and a stored payment that predates the rule cannot smuggle a credential
-- back in by being "preserved": preservation REBUILDS from the allowlist
update public.customers
   set data = jsonb_set(data, '{payment,card,number}', '"4242424242424242"'::jsonb)
 where id = 'cust-abs';
select t_assert(
  (select data->'payment'->'card' ? 'number' = false
     from public.customers where id = 'cust-abs'),
  '(setup) the trigger rebuilt even that direct write');

-- ===== 19. what an adversarial pass found in the whole-object rule (0004)
/* Four independent attackers ran 202 attacks against the first whole-object
   revision and ten claims verified real, all in this trigger. Each is pinned
   here so it cannot come back. The most serious one was INTRODUCED by that
   revision: `sent := jsonb_typeof(payment) = 'object'` meant a payment key
   holding a string or an array — a bare PAN, or an array of
   {number,cvv,routing,account} — was written VERBATIM on any row that held
   no payment object. 0001's guard rebuilt any value; the revision regressed
   it. A card number is not less of a card number for arriving unwrapped. */

-- A. a non-object payment on a FRESH row lands NOTHING (the regression)
select pg_temp.upsert_prod('cust-adv-a1', '{"plan":{"id":"prem"},"payment":"4111111111111111"}'::jsonb);
select t_assert(
  (select not (data ? 'payment') and position('4111111111111111' in data::text) = 0
     from public.customers where id = 'cust-adv-a1'),
  'A1 a bare PAN string where the payment object belongs is not stored on a fresh row');
select pg_temp.upsert_prod('cust-adv-a2',
  '{"plan":{"id":"prem"},"payment":[{"number":"4111111111111111","cvv":"123","routing":"021000021","account":"12345678"}]}'::jsonb);
select t_assert(
  (select not (data ? 'payment') and position('4111111111111111' in data::text) = 0
      and position('021000021' in data::text) = 0
     from public.customers where id = 'cust-adv-a2'),
  'A2 an ARRAY of credential objects lands nothing');
select pg_temp.upsert_prod('cust-adv-a3', '{"plan":{"id":"prem"},"payment":4111111111111111}'::jsonb);
select t_assert(
  (select not (data ? 'payment') from public.customers where id = 'cust-adv-a3'),
  'A3 a numeric PAN lands nothing');
select pg_temp.upsert_prod('cust-adv-a4', '{"plan":{"id":"prem"},"payment":null}'::jsonb);
select t_assert(
  (select not (data ? 'payment') from public.customers where id = 'cust-adv-a4'),
  'A4 payment:null on a fresh row manufactures nothing');
-- and the same through a plain INSERT, which is a single fire with no OLD
insert into public.customers (team_id, id, data) values
  ('11111111-1111-4111-a111-111111111111', 'cust-adv-a5', '{"payment":"4111111111111111"}'::jsonb);
select t_assert(
  (select not (data ? 'payment') from public.customers where id = 'cust-adv-a5'),
  'A5 …nor through a plain INSERT');

-- B. data = SQL NULL is an empty record, not an erasure
select pg_temp.upsert_prod('cust-adv-b', '{"payment":{"method":"card","last4":"4242","card":{"name":"Ann"}}}'::jsonb);
update public.customers set data = null where id = 'cust-adv-b';    -- PostgREST PATCH {"data":null}
select t_assert(
  (select data->'payment'->>'last4' = '4242' and data->'payment'->'card'->>'name' = 'Ann'
      and deleted_at is null
     from public.customers where id = 'cust-adv-b'),
  'B1 a PATCH of data:null keeps the held payment object');

-- C. a TOMBSTONE carries nothing, whatever it sends and whatever was held
select pg_temp.upsert_prod('cust-adv-c1', '{"payment":{"method":"card","last4":"4242","card":{"name":"Ann"}}}'::jsonb);
select pg_temp.upsert_prod('cust-adv-c1', '{"payment":{}}'::jsonb, true);         -- sends an object
select t_assert(
  (select deleted_at is not null and not (data ? 'payment')
     from public.customers where id = 'cust-adv-c1'),
  'C1 a tombstone that SENDS an empty payment object pulls nothing forward');
select pg_temp.upsert_prod('cust-adv-c2', '{"payment":{"method":"card","last4":"4242","card":{"name":"Ann"}}}'::jsonb);
select pg_temp.upsert_prod('cust-adv-c2',
  '{"payment":{"method":"ach","last4":"4111111111111111","status":"active"}}'::jsonb, true);
select t_assert(
  (select deleted_at is not null and not (data ? 'payment')
     from public.customers where id = 'cust-adv-c2'),
  'C2 …nor one that sends invalid fields (whose stored fallback used to fire)');
select pg_temp.upsert_prod('cust-adv-c3', '{"payment":{"method":"card","last4":"4242","card":{"name":"Ann"}}}'::jsonb);
update public.customers set deleted_at = now() where id = 'cust-adv-c3';          -- deleted_at ONLY
select t_assert(
  (select deleted_at is not null and not (data ? 'payment')
     from public.customers where id = 'cust-adv-c3'),
  'C3 a deleted_at-only PATCH strips the held payment too');
-- D. and an UN-DELETE has nothing to resurrect
update public.customers set deleted_at = null where id = 'cust-adv-c3';
select t_assert(
  (select deleted_at is null and not (data ? 'payment')
     from public.customers where id = 'cust-adv-c3'),
  'D1 un-deleting the row resurrects no payment metadata');
select pg_temp.upsert_prod('cust-adv-c3', '{"first":"x"}'::jsonb);
select t_assert(
  (select not (data ? 'payment') from public.customers where id = 'cust-adv-c3'),
  'D2 …and a later payment-less write still has nothing to carry');

-- E. digits are digits in every script, counted before the length cut
select pg_temp.upsert_prod('cust-adv-e', '{"payment":{"method":"card","card":{"name":"Dana Rivers"}}}'::jsonb);
select pg_temp.upsert_prod('cust-adv-e',
  '{"payment":{"card":{"name":"４１１１１１１１１１１１１１１１"},
     "ach":{"name":"٤١١١١١١١١١١١١١١١"},
     "billingAddress":{"street":"𝟎𝟐𝟏𝟎𝟎𝟎𝟎𝟐𝟏 𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗"}}}'::jsonb);
select t_assert(
  (select data->'payment'->'card'->>'name' = 'Dana Rivers'
      and not (data->'payment' ? 'ach')
      and not (data->'payment' ? 'billingAddress')
     from public.customers where id = 'cust-adv-e'),
  'E1 a PAN in fullwidth, Arabic-Indic or mathematical digits is refused like an ASCII one');
select pg_temp.upsert_prod('cust-adv-e',
  jsonb_build_object('payment', jsonb_build_object('billingAddress',
    jsonb_build_object('street', repeat('x', 110) || ' 4111111111111111'))));
select t_assert(
  (select not (data->'payment' ? 'billingAddress')
     from public.customers where id = 'cust-adv-e'),
  'E2 a PAN past the length cut is still counted, so truncation cannot hide it');

-- F. an empty payment object is nothing, not something sticky
select pg_temp.upsert_prod('cust-adv-f', '{"plan":{"id":"prem"},"payment":{}}'::jsonb);
select t_assert(
  (select not (data ? 'payment') from public.customers where id = 'cust-adv-f'),
  'F1 payment:{} stores no payment object');
select pg_temp.upsert_prod('cust-adv-f', '{"plan":{"id":"prem"},"payment":{"method":"bogus","last4":"x"}}'::jsonb);
select t_assert(
  (select not (data ? 'payment') from public.customers where id = 'cust-adv-f'),
  'F2 an object with no valid leaf, on a row with nothing held, stores nothing');

-- G. a data column that is not a document is refused, not stored
do $$
begin
  begin
    insert into public.customers (team_id, id, data) values
      ('11111111-1111-4111-a111-111111111111', 'cust-adv-g', '"just a string"'::jsonb);
    raise exception 'FAIL: a scalar data column was stored';
  exception when sqlstate '22023' then
    raise notice 'PASS: G1 a scalar where the data document belongs is refused (22023)';
  end;
  begin
    insert into public.customers (team_id, id, data) values
      ('11111111-1111-4111-a111-111111111111', 'cust-adv-g', '[1,2,3]'::jsonb);
    raise exception 'FAIL: an array data column was stored';
  exception when sqlstate '22023' then
    raise notice 'PASS: G2 …and so is an array';
  end;
end $$;
select t_assert(
  (select count(*) = 0 from public.customers where id = 'cust-adv-g'),
  'G3 and neither refused write left a row behind');

-- ===== 20. round two of the adversarial pass (0004)
/* A second, independent round against the §19 body. Three more real ones,
   all leaf-level shape gaps inside payment-shaped fields. */

-- H. the digit class is EVERY Unicode decimal digit, not twelve blocks
select pg_temp.upsert_prod('cust-adv-h', '{"payment":{"method":"card","card":{"name":"Dana Rivers"}}}'::jsonb);
select pg_temp.upsert_prod('cust-adv-h', jsonb_build_object('payment', jsonb_build_object(
  'card', jsonb_build_object('name', U&'\17E4\17E1\17E1\17E1\17E1\17E1\17E1\17E1\17E1\17E1\17E1\17E1\17E1\17E1\17E1\17E1'),     -- Khmer
  'ach',  jsonb_build_object('name', U&'\1044\1041\1041\1041\1041\1041\1041\1041\1041\1041\1041\1041\1041\1041\1041\1041'),     -- Myanmar
  'billingAddress', jsonb_build_object('street', U&'\+01E954\+01E951\+01E951\+01E951\+01E951\+01E951\+01E951\+01E951\+01E951\+01E951\+01E951\+01E951\+01E951\+01E951\+01E951\+01E951'))));  -- Adlam
select t_assert(
  (select data->'payment'->'card'->>'name' = 'Dana Rivers'
      and not (data->'payment' ? 'ach') and not (data->'payment' ? 'billingAddress')
     from public.customers where id = 'cust-adv-h'),
  'H1 a PAN in Khmer, Myanmar or Adlam digits is refused like an ASCII one');
select t_assert(
  public.pay_digit_count(U&'\17E4\17E1\17E1\17E1') = 4
    and public.pay_digit_count(U&'\+011F54\+011F51') = 2                 -- Kawi (Unicode 15)
    and public.pay_digit_count(U&'\+01E4F4\+01E4F1') = 2                 -- Nag Mundari (Unicode 15)
    and public.pay_digit_count('④①①①') = 4,                              -- circled: a digit people write
  'H2 the digit count covers Unicode 15 Nd end to end, and the digit-like forms too');

-- I. a credential SPREAD across the address leaves
select pg_temp.upsert_prod('cust-adv-i',
  '{"payment":{"method":"card","billingAddress":{"street":"1 Elm","city":"Provo","state":"UT","zip":"84604"}}}'::jsonb);
select pg_temp.upsert_prod('cust-adv-i',
  '{"payment":{"method":"card","billingAddress":{"street":"4111 1111","city":"1111 1111","state":"12/30 cvv 123","zip":"84001"}}}'::jsonb);
select t_assert(
  (select data->'payment'->'billingAddress'->>'street' = '1 Elm'
      and data->'payment'->'billingAddress'->>'city' = 'Provo'
      and data->'payment'->'billingAddress'->>'state' = 'UT'
      and data->'payment'->'billingAddress'->>'zip' = '84001'
      and position('4111' in data::text) = 0
     from public.customers where id = 'cust-adv-i'),
  'I1 a PAN split across street and city is refused as a whole; the stored address survives');
select pg_temp.upsert_prod('cust-adv-i',
  '{"payment":{"method":"ach","billingAddress":{"street":"rt 021000021","city":"acct 123456789012","state":"chk","zip":"84001"}}}'::jsonb);
select t_assert(
  (select data->'payment'->'billingAddress'->>'street' = '1 Elm'
      and position('021000021' in data::text) = 0 and position('123456789012' in data::text) = 0
     from public.customers where id = 'cust-adv-i'),
  'I2 routing in one leaf and account in the next are refused together');
select pg_temp.upsert_prod('cust-adv-i',
  '{"payment":{"method":"card","billingAddress":{"street":"12345 W 5600 S Apt 12","city":"Salt Lake City","state":"UT","zip":"84604-1234"}}}'::jsonb);
select t_assert(
  (select data->'payment'->'billingAddress'->>'street' = '12345 W 5600 S Apt 12'
      and data->'payment'->'billingAddress'->>'zip' = '84604-1234'
     from public.customers where id = 'cust-adv-i'),
  'I3 …while a long real address (11 digits) with a hyphenated ZIP+4 is stored');
-- THE BOUNDARY, stated: thirteen digits is the shortest card number, so a
-- street line carrying thirteen — even a plausible one — is refused. That
-- is the documented cost of the cut, and this pins it so it is not moved by
-- accident in either direction.
select pg_temp.upsert_prod('cust-adv-i',
  '{"payment":{"billingAddress":{"street":"12345 W 5600 S Apt 1201"}}}'::jsonb);
select t_assert(
  (select data->'payment'->'billingAddress'->>'street' = '12345 W 5600 S Apt 12'
     from public.customers where id = 'cust-adv-i'),
  'I5 a thirteen-digit street line is refused: the cut is the shortest PAN, by design');
select pg_temp.upsert_prod('cust-adv-i', '{"payment":{"billingAddress":{"state":"12/30 cvv 123"}}}'::jsonb);
select t_assert(
  (select data->'payment'->'billingAddress'->>'state' = 'UT'
     from public.customers where id = 'cust-adv-i'),
  'I4 a state line carrying an expiry and a CVV is refused on its own');

-- I6. the halves arriving in TWO writes are still one credential
select pg_temp.upsert_prod('cust-adv-i6',
  '{"payment":{"method":"card","billingAddress":{"street":"4111 1111","city":"Provo","state":"UT","zip":"84604"}}}'::jsonb);
select pg_temp.upsert_prod('cust-adv-i6', '{"payment":{"billingAddress":{"city":"1111 1111"}}}'::jsonb);
select t_assert(
  (select data->'payment'->'billingAddress'->>'street' = '4111 1111'
      and data->'payment'->'billingAddress'->>'city' = 'Provo'
     from public.customers where id = 'cust-adv-i6'),
  'I6 the second half of a PAN sent in a later write is refused against the stored first half');
update public.customers set data = jsonb_set(data, '{payment,billingAddress,street}', '"4111 1111 1111"'::jsonb)
 where id = 'cust-adv-i6';
select pg_temp.upsert_prod('cust-adv-i6', '{"payment":{"billingAddress":{"state":"1111"}}}'::jsonb);
select t_assert(
  (select data->'payment'->'billingAddress'->>'state' = 'UT'
     from public.customers where id = 'cust-adv-i6'),
  'I7 …and so is a four-digit tail sent as the state');
-- and stored leaves that are themselves a credential (planted past the rule) do not survive by being stored
alter table public.customers disable trigger customers_scrub_payment;
update public.customers set data = jsonb_set(data, '{payment,billingAddress}',
  '{"street":"4111 1111 1111","city":"1111","state":"UT","zip":"84604"}'::jsonb)
 where id = 'cust-adv-i6';
alter table public.customers enable trigger customers_scrub_payment;
select pg_temp.upsert_prod('cust-adv-i6', '{"payment":{"billingAddress":{"state":"UT"}}}'::jsonb);
select t_assert(
  (select not (data->'payment'->'billingAddress' ? 'street')
      and not (data->'payment'->'billingAddress' ? 'city')
      and data->'payment'->'billingAddress'->>'zip' = '84604'
     from public.customers where id = 'cust-adv-i6'),
  'I8 a planted split credential in the stored address is dropped on the next write, zip untouched');

-- J. nine bare digits is a routing number, not a zip
select pg_temp.upsert_prod('cust-adv-j', '{"payment":{"method":"ach","billingAddress":{"zip":"021000021"}}}'::jsonb);
select t_assert(
  (select position('021000021' in data::text) = 0 from public.customers where id = 'cust-adv-j'),
  'J1 a nine-digit "zip" is refused');
select pg_temp.upsert_prod('cust-adv-j', '{"payment":{"method":"ach","billingAddress":{"zip":"02100-0021"}}}'::jsonb);
select t_assert(
  (select data->'payment'->'billingAddress'->>'zip' = '02100-0021' from public.customers where id = 'cust-adv-j'),
  'J2 the same digits with the ZIP+4 hyphen are a zip');

-- K. a status a client could never have written is never overwritten by one
select pg_temp.upsert_prod('cust-adv-k', '{"payment":{"method":"card","status":"pending_setup"}}'::jsonb);
update public.customers set data = jsonb_set(data, '{payment,status}', '"active"'::jsonb)
 where id = 'cust-adv-k';                       -- what a future backend would do
select t_assert(
  (select data->'payment'->>'status' = 'pending_setup' from public.customers where id = 'cust-adv-k'),
  '(setup) a client-shaped write cannot author active — the trigger rebuilt it');
-- so plant it the way a backend with its own privileges would: bypassing this trigger
alter table public.customers disable trigger customers_scrub_payment;
update public.customers set data = jsonb_set(data, '{payment,status}', '"active"'::jsonb)
 where id = 'cust-adv-k';
alter table public.customers enable trigger customers_scrub_payment;
select pg_temp.upsert_prod('cust-adv-k', '{"payment":{"method":"card","status":"not_configured"}}'::jsonb);
select t_assert(
  (select data->'payment'->>'status' = 'active' from public.customers where id = 'cust-adv-k'),
  'K1 a stale phone sending a valid client status cannot downgrade a backend-authored one');


-- ===== 21. round three, and the rows that were already there (0004 + 0006)
-- L. a NAME carries no digits at all: a CVV or an expiry fits inside a cut of four
select pg_temp.upsert_prod('cust-adv-l', '{"payment":{"method":"card","card":{"name":"cvv 123"},"ach":{"name":"exp 1/26"}}}'::jsonb);
select t_assert(
  (select not (data->'payment' ? 'card') and not (data->'payment' ? 'ach')
     from public.customers where id = 'cust-adv-l'),
  'L1 a three-digit CVV or an expiry in a name field is refused');
select pg_temp.upsert_prod('cust-adv-l', '{"payment":{"card":{"name":"Dana Rivers III"}}}'::jsonb);
select t_assert(
  (select data->'payment'->'card'->>'name' = 'Dana Rivers III'
     from public.customers where id = 'cust-adv-l'),
  'L2 …while Roman-numeral suffixes in a real name are letters and survive');

-- M. digit forms people actually write digits in
select pg_temp.upsert_prod('cust-adv-m', '{"payment":{"method":"card","card":{"name":"Dana Rivers"}}}'::jsonb);
select pg_temp.upsert_prod('cust-adv-m', jsonb_build_object('payment', jsonb_build_object(
  'card', jsonb_build_object('name', U&'\+010D44\+010D41\+010D41\+010D41\+010D41\+010D41\+010D41\+010D41\+010D41\+010D41\+010D41\+010D41\+010D41\+010D41\+010D41\+010D41'),  -- Garay (Unicode 16)
  'ach',  jsonb_build_object('name', '⁴¹¹¹¹¹¹¹¹¹¹¹¹¹¹¹'),                                   -- superscript
  'billingAddress', jsonb_build_object('street', '④①①①①①①①①①①①①①①①', 'city', '4111 1111 1111 ¹¹¹¹'))));  -- circled; 12 ASCII + 4 superscript
select t_assert(
  (select data->'payment'->'card'->>'name' = 'Dana Rivers'
      and not (data->'payment' ? 'ach') and not (data->'payment' ? 'billingAddress')
     from public.customers where id = 'cust-adv-m'),
  'M1 Unicode 16 digits, superscripts, circled digits and a mixed-script PAN are all refused');
select t_assert(
  public.pay_digit_count(U&'\+010D44\+010D41') = 2 and public.pay_digit_count('⁴¹') = 2
    and public.pay_digit_count('④①') = 2 and public.pay_digit_count('Ⅳ') = 1
    and public.pay_digit_count('½') = 0,
  'M2 the count covers Nd through Unicode 16 plus the digit-like No/Nl forms, and not fractions');

-- N. THE ROWS THAT WERE ALREADY THERE. 0001 stored last4 and billingAddress
-- verbatim. 0006 passes every row through 0004's trigger once, so what the
-- table HOLDS obeys the rule, not just what it will accept from now on.
alter table public.customers disable trigger customers_scrub_payment;
insert into public.customers (team_id, id, data) values
  ('11111111-1111-4111-a111-111111111111', 'cust-0001-era',
   '{"payment":{"method":"card","last4":"4111111111111111","autopay":true,
     "billingAddress":{"street":"1 Elm","cardNumber":"4111111111111111","cvv":"123"}}}'::jsonb);
insert into public.customers (team_id, id, deleted_at, data) values
  ('11111111-1111-4111-a111-111111111111', 'cust-0001-tomb', now(),
   '{"payment":{"method":"card","card":{"name":"Gone Person"}}}'::jsonb);
alter table public.customers enable trigger customers_scrub_payment;
select t_assert(
  (select position('4111111111111111' in data::text) > 0 from public.customers where id = 'cust-0001-era'),
  '(setup) a 0001-era row really does hold a full card number');
update public.customers set data = data;   -- 0006, verbatim
select t_assert(
  (select position('4111111111111111' in data::text) = 0
      and not (data->'payment' ? 'last4') and not (data->'payment' ? 'autopay')
      and data->'payment'->'billingAddress'->>'street' = '1 Elm'
      and not (data->'payment'->'billingAddress' ? 'cardNumber')
      and not (data->'payment'->'billingAddress' ? 'cvv')
     from public.customers where id = 'cust-0001-era'),
  'N1 the 0006 rebuild strips a 0001-era card number and keeps the real address');
select t_assert(
  (select not (data ? 'payment') from public.customers where id = 'cust-0001-tomb'),
  'N2 …and strips payment from a 0001-era tombstone');
select t_assert(
  (select count(*) = 0 from public.customers
    where data::text ~ '"(number|cardNumber|cvv|cvc|routing|account|accountNumber|routingNumber)"'),
  'N3 after the rebuild no credential KEY exists in any customer row in the table');
