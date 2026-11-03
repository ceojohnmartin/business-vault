-- RALLY 100 — the temporary-schema shadow test (v1 and v2). Run in FRESH
-- sessions (run-tests.sh starts a new psql, and part B reconnects) after
-- rally100-test.sql, so no rally100 function is compiled yet in the backend.
--
-- With search_path = '' PostgreSQL still searches the caller's temporary
-- schema FIRST for relation and type names, and any role with TEMP can create
-- temp tables and temp types. A single unqualified table or type name in a
-- function body would resolve to a planted object and the call would fail or
-- answer from the wrong table.
--
-- PART A calls the API as a rep, a leader and the owner while the session
-- holds temp tables named like every table the functions touch, and temp
-- TYPES named text, date and timestamptz.
--
-- PART B also plants jsonb and uuid. It cannot go through the API: every API
-- function starts with auth.uid(), the PLATFORM's function (Supabase's real
-- one and the test shim alike), whose SQL body casts with unqualified jsonb
-- and uuid and is inlined into its caller — so those two shadows break
-- auth.uid() itself, for RALLY's functions and RALLY 100's alike, before any
-- RALLY 100 code runs. (On Supabase a client never holds a raw SQL session in
-- which to plant one; PostgREST is the only door.) Part B therefore drives
-- RALLY 100's own internals directly, as the owner would, with every shadow
-- in place.
--
-- This file's own casts are pg_catalog-qualified for the same reason.

\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

-- ================================================================ PART A
-- one more sign-up, confirmed and on no team, for join_team (S.15); made
-- before anything is planted, as the table owner
insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
values ('00000000-0000-4000-8000-000000009101', 'shadow.joiner@x.test', '{"name":"Shadow Joiner"}', pg_catalog.now());

set role authenticated;
select pg_catalog.set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}', false);

create temp table entries (id int);            create temp table persons (id int);
create temp table person_identifiers (id int); create temp table possible_matches (id int);
create temp table introductions (id int);      create temp table requirements (id int);
create temp table messages (id int);           create temp table notes (id int);
create temp table xp_events (id int);          create temp table badges (id int);
create temp table acks (id int);               create temp table incentives (id int);
create temp table rewards (id int);            create temp table reward_events (id int);
create temp table spot_checks (id int);        create temp table audit (id int);
create temp table profiles (id int);           create temp table teams (id int);
create temp table users (id int);              create temp table settings (id int);
create type pg_temp.text as (x int);
create type pg_temp.date as (x int);
create type pg_temp.timestamptz as (x int);

-- a rep: every rep function, first compile in this session
select t.ok((rally100.whoami() -> 'user' ->> 'name') = 'Tyler Rep', 'S.01 whoami resolves nothing from the caller''s temp schema');
select t.ok((rally100.rep_state() ->> 'count')::integer > 0, 'S.02 rep_state reads the real tables, not planted temp tables');
select t.ok((rally100.save_entry(pg_catalog.jsonb_build_object('id', 'e0000000-0000-4000-8000-000000009001',
               'first_name', 'Shadow', 'last_name', 'Proof', 'phone', '3995550199',
               'handle', 'shadowproof', 'platform', 'X')) -> 'entry' ->> 'counted')::boolean,
  'S.03 save_entry (dedupe, linking, XP, settle) compiles and runs with shadow types and tables present');
select t.ok((rally100.remove_entry('e0000000-0000-4000-8000-000000009001') -> 'entry' ->> 'removed')::boolean
            and not (rally100.restore_entry('e0000000-0000-4000-8000-000000009001') -> 'entry' ->> 'removed')::boolean,
  'S.04 remove_entry and restore_entry run with shadows present');
select t.ok((rally100.plan_intro('e0000000-0000-4000-8000-000000009001') -> 'intro' ->> 'status') = 'planned'
            and (rally100.record_intro('e0000000-0000-4000-8000-000000009001', 'text', 'in', 'shadow', null) -> 'intro' ->> 'status') = 'introduced',
  'S.05 plan_intro and record_intro run with shadows present');
select t.ok(rally100.tell_leader('e0000000-0000-4000-8000-000000009001', 'shadow check') = '{"ok": true}'
            and rally100.award_badge('clean_sweep') -> 'badges' @> '["clean_sweep"]',
  'S.06 tell_leader and award_badge run with shadows present');

-- a leader
select pg_catalog.set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}', false);
select t.ok(pg_catalog.jsonb_array_length(rally100.team_state() -> 'reps') > 0
            and (rally100.person_detail((select (x ->> 'person_id')::pg_catalog.uuid
                                           from pg_catalog.jsonb_array_elements(rally100.team_state() -> 'queues' -> 'new_intros') x
                                          limit 1)) -> 'person' ->> 'stage') is not null,
  'S.07 team_state and person_detail run with shadows present');
select t.ok(rally100.rep_list('00000000-0000-4000-8000-000000000004') ->> 'count' is not null,
  'S.08 rep_list runs with shadows present');

-- the owner
select pg_catalog.set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', false);
select t.ok((rally100.owner_state() -> 'totals' ->> 'persons')::integer > 0
            and pg_catalog.jsonb_array_length(rally100.owner_contacts() -> 'rows') > 0
            and pg_catalog.jsonb_array_length(rally100.owner_rewards(null) -> 'rows') > 0,
  'S.09 owner_state, owner_contacts and owner_rewards run with shadows present');
select t.ok((rally100.set_auto_join(true) ->> 'on')::boolean
            and (rally100.owner_state() -> 'auto_join' ->> 'team_name') = 'Team A',
  'S.14 set_auto_join and owner_state''s switch (v2) run with settings and teams planted');

-- a sign-up with no team
select pg_catalog.set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000009101","role":"authenticated"}', false);
select t.ok((rally100.whoami() ->> 'auto_join')::boolean
            and (rally100.join_team() ->> 'team_name') = 'Team A',
  'S.15 whoami''s auto_join flag and join_team (v2) run with profiles, users, settings and teams planted');

-- ================================================================ PART B
\c
create temp table entries (id int);            create temp table persons (id int);
create temp table person_identifiers (id int); create temp table introductions (id int);
create temp table requirements (id int);       create temp table xp_events (id int);
create temp table rewards (id int);            create temp table audit (id int);
create temp table profiles (id int);           create temp table teams (id int);
create temp table users (id int);              create temp table settings (id int);
create type pg_temp.jsonb as (x int);
create type pg_temp.uuid as (x int);
create type pg_temp.text as (x int);
create type pg_temp.date as (x int);
create type pg_temp.timestamptz as (x int);
select rally100._dedupe('00000000-0000-4000-8000-000000000004'::pg_catalog.uuid);
select t.ok(pg_catalog.jsonb_typeof(rally100._settle('00000000-0000-4000-8000-000000000004'::pg_catalog.uuid,
                                                         null, true, null)) = 'array',
  'S.10 the duplicate walk, Person linking, XP and reward settling compile and run with jsonb and uuid shadowed too');
select t.ok(pg_catalog.jsonb_array_length(rally100._entries_json('00000000-0000-4000-8000-000000000004'::pg_catalog.uuid)) > 0
            and rally100._rep_row('00000000-0000-4000-8000-000000000004'::pg_catalog.uuid, true) ->> 'name' = 'Tyler Rep'
            and pg_catalog.jsonb_typeof(rally100._referrals_rep('00000000-0000-4000-8000-000000000005'::pg_catalog.uuid)) = 'array'
            and pg_catalog.jsonb_typeof(rally100._intros_rep('00000000-0000-4000-8000-000000000004'::pg_catalog.uuid)) = 'array'
            and pg_catalog.jsonb_typeof(rally100._scenes_json('00000000-0000-4000-8000-000000000004'::pg_catalog.uuid)) = 'object',
  'S.11 the rep read models compile and run with every shadow in place');
select t.ok(pg_catalog.jsonb_typeof(rally100._queues((select p from public.profiles p
                                                        where p.id = '00000000-0000-4000-8000-000000000002'::pg_catalog.uuid)))
              = 'object'
            and (select pg_catalog.count(*) from rally100.rewards r
                  where rally100._reward_json(r, (select p from public.profiles p
                          where p.id = '00000000-0000-4000-8000-000000000001'::pg_catalog.uuid)) ->> 'id' is null) = 0,
  'S.12 the leader queues and the reward read model compile and run with every shadow in place');
select t.ok(rally100._join_refusal((select p from public.profiles p
                                      where p.id = '00000000-0000-4000-8000-000000000010'::pg_catalog.uuid))
              = 'email_not_confirmed'
            and rally100._auto_join_team() = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::pg_catalog.uuid
            and pg_catalog.jsonb_typeof(rally100._auto_join_json()) = 'object',
  'S.16 the v2 switch helpers compile and run with every shadow in place');
-- NEGATIVE CONTROL: the planted types really are found first. The same kind
-- of function with ONE unqualified type name fails in this very session, so
-- S.10 to S.12 passing is evidence, not luck.
create function pg_temp.unqualified_probe() returns integer
language plpgsql security definer set search_path = '' as $$
declare v jsonb := '{}';
begin
  return 1;
end $$;
select t.ok(t.err('select pg_temp.unqualified_probe()') <> 'ok',
  'S.13 negative control: one unqualified type name in such a body DOES resolve to the planted type and fails');
