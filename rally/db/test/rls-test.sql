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
select t_assert(
  (select not (data->'payment' ? 'card') and not (data->'payment' ? 'ach')
     from public.customers where id = 'cust-a2'),
  'card + bank objects are stripped before a customer row is stored');
select t_assert(
  (select data->'payment'->>'last4' = '4242'
      and data->'payment'->>'method' = 'card'
      and data->'payment'->'billingAddress'->>'city' = 'Wichita'
     from public.customers where id = 'cust-a2'),
  'the safe payment fields (method/last4/autopay/billingAddress) survive');
select t_assert(
  (select position('4242424242424242' in data::text) = 0
     from public.customers where id = 'cust-a2'),
  'no full card number exists anywhere in the stored row');
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

