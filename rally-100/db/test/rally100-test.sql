-- RALLY 100 v1 — the server suite. Runs after the Supabase shim, every RALLY
-- migration and 1001_rally100_v1.sql on a throwaway database (see
-- run-tests.sh). Every check prints PASS or aborts the whole run
-- (ON_ERROR_STOP), exactly like RALLY's own rls-test.sql.
--
-- Cast. Team A: an owner, two leaders (Dana created first, so she is the
-- team's default leader), three reps and one disabled rep. Team B: a leader
-- and a rep. One brand-new signup on no team.
--
-- Test helpers live in their own schema `t`, so nothing here adds to
-- RALLY's `public`.

\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

\set TA      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
\set TB      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
\set OWNER   '00000000-0000-4000-8000-000000000001'
\set L1      '00000000-0000-4000-8000-000000000002'
\set L2      '00000000-0000-4000-8000-000000000003'
\set R1      '00000000-0000-4000-8000-000000000004'
\set R2      '00000000-0000-4000-8000-000000000005'
\set R3      '00000000-0000-4000-8000-000000000006'
\set LB      '00000000-0000-4000-8000-000000000007'
\set RB      '00000000-0000-4000-8000-000000000008'
\set BENCH   '00000000-0000-4000-8000-000000000009'
\set NEWBIE  '00000000-0000-4000-8000-000000000010'
\set OWNER2  '00000000-0000-4000-8000-000000000011'

-- ---------------------------------------------------------------- helpers ---
create schema t;
grant usage on schema t to public;

create function t.ok(cond boolean, label text) returns void
language plpgsql as $$
begin
  if cond is true then raise notice 'PASS: %', label;
  else raise exception 'FAIL: %', label;
  end if;
end $$;

-- become <user>; null = signed out (authenticated role, no claims)
create procedure t.login(uid uuid) language plpgsql as $$
begin
  execute 'set role authenticated';
  perform set_config('request.jwt.claims',
    case when uid is null then '' else json_build_object('sub', uid, 'role', 'authenticated')::text end, false);
end $$;

-- run one statement; 'ok', or '<sqlstate> <message>' when it was refused
create function t.err(p_sql text) returns text
language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate || ' ' || sqlerrm;
end $$;

-- every API function called with nulls, as SQL text
create function t.api_calls() returns setof text
language sql stable as $$
  select format('select rally100.%I(%s)', p.proname,
                coalesce((select string_agg('null', ', ') from generate_series(1, p.pronargs)), ''))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'rally100' and p.proname !~ '^_'
   order by p.proname
$$;

create function t.e(n int) returns uuid language sql immutable as
$$ select ('e0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;
-- fictional numbers only: 3xx-555-01xx
create function t.ph(n int) returns text language sql immutable as
$$ select '3' || lpad((n % 100)::text, 2, '0') || '55501' || lpad((n / 100 % 100)::text, 2, '0') $$;
create function t.full(n int, first text, last text, scene text default null) returns jsonb
language sql immutable as $$
  select jsonb_build_object('id', t.e(n), 'first_name', first, 'last_name', last,
                            'phone', t.ph(n), 'handle', 'h' || n, 'platform', 'Instagram')
         || case when scene is null then '{}'::jsonb else jsonb_build_object('scene', scene) end
$$;
create function t.save(p jsonb) returns jsonb language sql as $$ select rally100.save_entry(p) $$;
create function t.has_effect(r jsonb, eff jsonb) returns boolean language sql immutable as
$$ select coalesce(r -> 'effects' @> jsonb_build_array(eff), false) $$;
create function t.n_effects(r jsonb, kind text) returns int language sql immutable as
$$ select count(*)::int from jsonb_array_elements(coalesce(r -> 'effects', '[]')) x where x ->> 'type' = kind $$;

-- save complete entries n, n+1, ... until the caller's count reaches p_target
create function t.fill_until(p_target int, p_from int, p_scene text default null) returns jsonb
language plpgsql as $$
declare r jsonb; n int := p_from; eff jsonb := '[]';
begin
  loop
    r := rally100.save_entry(t.full(n, 'F' || n, 'L' || n, p_scene));
    eff := eff || (r -> 'effects');
    exit when (r ->> 'count')::int >= p_target;
    n := n + 1;
    if n > p_from + 500 then raise exception 'fill_until ran away'; end if;
  end loop;
  return jsonb_build_object('last', n, 'count', (r ->> 'count')::int, 'effects', eff);
end $$;

-- (superuser only) a rep's live count, read straight from the internals
create function t.count(rep uuid) returns int language sql as
$$ select o_count from rally100._rep_counts(rep) $$;
create function t.xp(rep uuid) returns int language sql as
$$ select coalesce(sum(points), 0)::int from rally100.xp_events where rep_id = rep $$;
create function t.person_of(entry uuid) returns uuid language sql as
$$ select person_id from rally100.entries where id = entry $$;
create function t.referral_of(person uuid) returns rally100.rewards language sql as
$$ select * from rally100.rewards where kind = 'referral' and person_id = person $$;

grant execute on all functions in schema t to public;
grant execute on procedure t.login(uuid) to public;

-- --------------------------------------------------------------- fixtures ---
-- signups arrive through auth.users, exactly as GoTrue inserts them; RALLY's
-- trigger gives each the least-authority profile
insert into auth.users (id, email, raw_user_meta_data) values
  (:'OWNER',  'owner@a.test',   '{"name":"Olive Owner"}'),
  (:'L1',     'lead1@a.test',   '{"name":"Dana Lead"}'),
  (:'L2',     'lead2@a.test',   '{"name":"Kim Lead"}'),
  (:'R1',     'rep1@a.test',    '{"name":"Tyler Rep"}'),
  (:'R2',     'rep2@a.test',    '{"name":"Sam Rep"}'),
  (:'R3',     'rep3@a.test',    '{"name":"Jo Rep"}'),
  (:'LB',     'leadb@b.test',   '{"name":"Bo LeadB"}'),
  (:'RB',     'repb@b.test',    '{"name":"Max RepB"}'),
  (:'BENCH',  'benched@a.test', '{"name":"Benched Rep"}'),
  (:'NEWBIE', 'newbie@x.test',  '{"name":"Newbie"}');
insert into public.teams (id, name) values (:'TA', 'Team A'), (:'TB', 'Team B');
update public.profiles set team_id = :'TA' where email like '%@a.test';
update public.profiles set team_id = :'TB' where email like '%@b.test';
update public.profiles set role = 'owner'  where email = 'owner@a.test';
update public.profiles set role = 'leader' where email in ('lead1@a.test', 'lead2@a.test', 'leadb@b.test');
update public.profiles set disabled = true where email = 'benched@a.test';

-- ================================================== 1. catalog and grants
select t.ok((select array_agg(c.relname::text order by c.relname::text)
               from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'rally100' and c.relkind = 'r')
  = (select array_agg(v order by v) from unnest(array['acks','audit','badges','entries','incentives','introductions',
       'messages','notes','person_identifiers','persons','possible_matches','rep_closures','requirements',
       'reward_events','rewards','spot_checks','spot_samples','xp_events']) v),
  '1.01 rally100 holds exactly its eighteen tables');
select t.ok(not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                         where n.nspname = 'rally100' and c.relkind = 'r' and not c.relrowsecurity),
  '1.02 every rally100 table has RLS enabled');
select t.ok(not exists (select 1 from pg_policies where schemaname = 'rally100'),
  '1.03 no rally100 table has a policy (RPC only)');
select t.ok(not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace,
           aclexplode(coalesce(c.relacl, acldefault(case when c.relkind = 'S' then 's' else 'r' end::"char", c.relowner))) a
     where n.nspname = 'rally100' and a.grantee <> c.relowner),
  '1.04 no role but the owner holds any privilege on any rally100 table or sequence (not public, anon, authenticated, service_role)');
select t.ok(not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'rally100'
       and (not p.prosecdef or p.proconfig is distinct from array['search_path=""'])),
  '1.05 every rally100 function is SECURITY DEFINER with search_path pinned to empty (and nothing else)');
select t.ok((select array_agg(p.proname::text order by p.proname::text)
               from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'rally100' and has_function_privilege('authenticated', p.oid, 'execute'))
  = (select array_agg(v order by v) from unnest(array[
       'whoami','accept_ack',
       'rep_state','save_entry','resolve_duplicate','remove_entry','restore_entry','plan_intro','record_intro',
       'set_follow_up','tell_leader','award_badge',
       'team_state','person_detail','confirm_intro_received','set_stage','schedule_meeting','set_requirement',
       'set_outcome','set_interest','set_next_action','add_note','mark_messages_read','rep_list','record_spot_check',
       'review_reward','resolve_correction','link_persons','award_incentive',
       'owner_state','owner_contacts','owner_rewards','mark_pay_issued','reverse_reward','close_rep_unpaid',
       'reopen_rep','correct_credit','clear_dnc','incentive_save','incentive_status']) v),
  '1.06 authenticated can execute exactly the 40 API functions of API.md section 6');
select t.ok(not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'rally100' and has_function_privilege('anon', p.oid, 'execute')),
  '1.07 anon can execute no rally100 function');
select t.ok(not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace,
           aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
     where n.nspname = 'rally100' and a.grantee <> p.proowner and a.grantee <> 'authenticated'::regrole),
  '1.08 EXECUTE on rally100 functions is held by the owner and authenticated only (not PUBLIC, anon or service_role)');
select t.ok(not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'rally100' and p.proname ~ '^_'
                           and (has_function_privilege('authenticated', p.oid, 'execute')
                                or has_function_privilege('service_role', p.oid, 'execute'))),
  '1.09 no internal _helper is executable by authenticated or service_role');
select t.ok(has_schema_privilege('authenticated', 'rally100', 'usage')
            and not has_schema_privilege('authenticated', 'rally100', 'create')
            and not has_schema_privilege('anon', 'rally100', 'usage')
            and not has_schema_privilege('service_role', 'rally100', 'usage'),
  '1.10 only authenticated may use the rally100 schema, and nobody may create in it');
select t.ok((select count(*) from pg_indexes where schemaname = 'rally100'
              and indexname in ('rewards_one_list_per_rep', 'rewards_one_referral_per_person')
              and indexdef like 'CREATE UNIQUE INDEX%WHERE (kind = %') = 2,
  '1.11 the two partial unique indexes (one list per rep, one referral per person) exist');
select t.ok((select string_agg(table_name || '.' || column_name || ':' || data_type, ',' order by table_name, column_name)
               from information_schema.columns
              where table_schema = 'rally100' and column_name in ('amount_cents', 'prize_cents'))
  = 'incentives.prize_cents:integer,rewards.amount_cents:integer',
  '1.12 money is integer cents');
select t.ok(not exists (
    select 1 from pg_constraint c
      join pg_class r on r.oid = c.conrelid join pg_namespace n on n.oid = r.relnamespace
      join pg_class f on f.oid = c.confrelid join pg_namespace fn on fn.oid = f.relnamespace
     where c.contype = 'f' and (n.nspname = 'rally100') <> (fn.nspname = 'rally100')),
  '1.13 no foreign key crosses the rally100 boundary in either direction (RALLY tables gain no RI triggers)');
select t.ok(not exists (
    select 1 from pg_trigger tg join pg_class c on c.oid = tg.tgrelid join pg_namespace n on n.oid = c.relnamespace
      join pg_proc p on p.oid = tg.tgfoid join pg_namespace pn on pn.oid = p.pronamespace
     where not tg.tgisinternal and (n.nspname = 'rally100') <> (pn.nspname = 'rally100')),
  '1.14 no trigger links a rally100 table and a non-rally100 function, either way');
select t.ok(not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'rally100' and p.prosrc ~* '\mexecute\M'),
  '1.15 no rally100 function contains dynamic SQL');
select t.ok((select count(*) from pg_trigger tg join pg_class c on c.oid = tg.tgrelid
              join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'rally100' and not tg.tgisinternal) = 12,
  '1.16 append-only triggers guard audit, reward_events, xp_events, notes, spot_checks and spot_samples (row and truncate)');

-- ================================================ 2. who may call at all
set role anon;
select set_config('request.jwt.claims', '', false);
select t.ok((select count(*) from t.api_calls() c where t.err(c) not like '42501 %') = 0,
  '2.01 anon is refused every API function (42501)');
select t.ok((select count(*) from t.api_calls()) = 40, '2.02 the API is forty functions');
call t.login(null);
select t.ok((select count(*) from t.api_calls() c where t.err(c) <> '42501 rally100: not signed in') = 0,
  '2.03 every API function refuses a signed-out caller with 42501 "rally100: not signed in"');
call t.login(:'BENCH');
select t.ok((select count(*) from t.api_calls() c where t.err(c) <> '42501 rally100: disabled') = 0,
  '2.04 every API function, whoami included, refuses a disabled account with 42501 "rally100: disabled"');
call t.login(:'NEWBIE');
select t.ok((select count(*) from t.api_calls() c
              where c <> 'select rally100.whoami()' and t.err(c) <> '42501 rally100: no team') = 0,
  '2.05 every API function but whoami refuses an account with no team with 42501 "rally100: no team"');
select t.ok(rally100.whoami() @> '{"no_team": true, "user": {"email": "newbie@x.test", "role": "rep"}}'
            and not (rally100.whoami() ? 'ack_accepted'),
  '2.06 whoami answers a no-team account with no_team:true instead of refusing');
call t.login(:'R1');
select t.ok(rally100.whoami() @> jsonb_build_object('user', jsonb_build_object(
              'id', :'R1', 'name', 'Tyler Rep', 'role', 'rep', 'team_id', :'TA', 'team_name', 'Team A'),
              'ack_version_required', 1, 'ack_accepted', false),
  '2.07 whoami returns the user, team and the unaccepted disclosure version');
select t.ok(t.err('select rally100.accept_ack(2)') = '22023 rally100: invalid_version',
  '2.08 accept_ack refuses a disclosure version that is not current');
select rally100.accept_ack(1) as a1 \gset
select rally100.accept_ack(1) as a2 \gset
select t.ok(:'a1' = '{"ok": true}' and :'a2' = '{"ok": true}' and (rally100.whoami() ->> 'ack_accepted')::boolean,
  '2.09 accept_ack records the acknowledgment, idempotently');
select t.ok((select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'rally100' and c.relkind = 'r'
                and t.err(format('select 1 from rally100.%I limit 1', c.relname)) not like '42501 %') = 0,
  '2.10 authenticated cannot SELECT any rally100 table directly');
select t.ok((select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'rally100' and c.relkind = 'r'
                and t.err(format('insert into rally100.%I default values', c.relname)) not like '42501 %') = 0,
  '2.11 authenticated cannot INSERT into any rally100 table directly');
select t.ok((select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'rally100' and c.relkind = 'r'
                and t.err(format('update rally100.%I set %I = %I', c.relname,
                                 (select a.attname from pg_attribute a where a.attrelid = c.oid and a.attnum = 1),
                                 (select a.attname from pg_attribute a where a.attrelid = c.oid and a.attnum = 1)))
                    not like '42501 %') = 0,
  '2.12 authenticated cannot UPDATE any rally100 table directly');
select t.ok((select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'rally100' and c.relkind = 'r'
                and (t.err(format('delete from rally100.%I', c.relname)) not like '42501 %'
                     or t.err(format('truncate rally100.%I', c.relname)) not like '42501 %')) = 0,
  '2.13 authenticated cannot DELETE from or TRUNCATE any rally100 table directly');
select t.ok(t.err('select rally100._caller()') like '42501 permission denied%'
            and t.err('select rally100._settle(null, null, true, null)') like '42501 permission denied%'
            and t.err($$select rally100._xp('00000000-0000-4000-8000-000000000004', 'cc:x', 1000, 'x')$$)
                like '42501 permission denied%',
  '2.14 an internal helper called directly by a client is refused (no granting yourself XP)');
call t.login(:'R1');
select t.ok(t.err('select rally100.team_state()') = '42501 rally100: not_allowed'
            and t.err('select rally100.person_detail(null)') = '42501 rally100: not_allowed'
            and t.err('select rally100.review_reward(null, null, null)') = '42501 rally100: not_allowed',
  '2.15 a rep is refused the leader functions (42501 not_allowed)');
call t.login(:'L1');
select t.ok(t.err('select rally100.owner_state()') = '42501 rally100: owner_only'
            and t.err('select rally100.mark_pay_issued(null, null, null)') = '42501 rally100: owner_only'
            and t.err('select rally100.incentive_save(''{}'')') = '42501 rally100: owner_only',
  '2.16 a leader is refused the owner functions (42501 owner_only)');
reset role;

-- ========================================== 3. entries: normalisation, rules
call t.login(:'R1');
select t.ok(t.err($$select rally100.save_entry('[]')$$) = '22023 rally100: invalid_payload'
            and t.err($$select rally100.save_entry('{"first_name":"A"}')$$) = '22023 rally100: invalid_id'
            and t.err($$select rally100.save_entry('{"id":"not-a-uuid","first_name":"A"}')$$) = '22023 rally100: invalid_id',
  '3.01 save_entry needs an object with a UUID id');
select t.ok(t.err(format('select rally100.save_entry(%L)', jsonb_build_object('id', t.e(900)))) = '22023 rally100: first_required'
            and t.err(format('select rally100.save_entry(%L)', jsonb_build_object('id', t.e(900), 'first_name', '   ')))
                = '22023 rally100: first_required',
  '3.02 a first name is required (whitespace is not a name): first_required');
select t.ok(t.err(format('select rally100.save_entry(%L)', jsonb_build_object('id', t.e(900), 'first_name', repeat('a', 61))))
              = '22023 rally100: name_too_long'
            and t.err(format('select rally100.save_entry(%L)', jsonb_build_object('id', t.e(900), 'first_name', 'A', 'last_name', repeat('b', 61))))
              = '22023 rally100: name_too_long',
  '3.03 first and last names are at most 60 characters: name_too_long');
select t.ok(t.err(format('select rally100.save_entry(%L)', jsonb_build_object('id', t.e(900), 'first_name', 'A', 'phone', '555-0101')))
              = '22023 rally100: invalid_phone'
            and t.err(format('select rally100.save_entry(%L)', jsonb_build_object('id', t.e(900), 'first_name', 'A', 'phone', '22345678901')))
              = '22023 rally100: invalid_phone'
            and t.err(format('select rally100.save_entry(%L)', jsonb_build_object('id', t.e(900), 'first_name', 'A', 'phone', 'call me')))
              = '22023 rally100: invalid_phone',
  '3.04 a phone that does not normalise to 10 digits is refused: invalid_phone (7 digits, 11 without a leading 1, letters)');
select t.ok(t.err(format('select rally100.save_entry(%L)', jsonb_build_object('id', t.e(900), 'first_name', 'A', 'handle', '@ana')))
              = '22023 rally100: platform_required'
            and t.err(format('select rally100.save_entry(%L)', jsonb_build_object('id', t.e(900), 'first_name', 'A', 'handle', 'ana', 'platform', 'Other')))
              = '22023 rally100: other_app_required'
            and t.err(format('select rally100.save_entry(%L)', jsonb_build_object('id', t.e(900), 'first_name', 'A', 'handle', 'ana', 'platform', 'Myspace')))
              = '22023 rally100: invalid_platform',
  '3.05 a handle needs a platform, Other needs the app name, and the platform must be one of the eight');
select t.ok(t.err(format('select rally100.save_entry(%L)', jsonb_build_object('id', t.e(900), 'first_name', 'A', 'tags', jsonb_build_array('Bogus'))))
              = '22023 rally100: invalid_tag'
            and t.err(format('select rally100.save_entry(%L)', jsonb_build_object('id', t.e(900), 'first_name', 'A', 'tags', 'School')))
              = '22023 rally100: invalid_tag'
            and t.err(format('select rally100.save_entry(%L)', jsonb_build_object('id', t.e(900), 'first_name', 'A', 'notes', repeat('n', 2001))))
              = '22023 rally100: too_long'
            and t.err(format('select rally100.save_entry(%L)', jsonb_build_object('id', t.e(900), 'first_name', 'A', 'scene', 'moon')))
              = '22023 rally100: invalid_scene',
  '3.06 tags must be from the list, notes at most 2000 characters, and the scene a real Scene');
select rally100.save_entry(jsonb_build_object('id', t.e(1), 'first_name', '  Marcus  ', 'last_name', 'Lee',
         'phone', '+1 (801) 555-0101', 'handle', 'https://www.instagram.com/Marcus.Lee/?hl=en',
         'platform', 'Instagram', 'tags', jsonb_build_array('Sports', 'Sports', 'Gym'),
         'scene', 'bus', 'chain_hit', true, 'notes', 'met at practice')) as r \gset
select t.ok(:'r'::jsonb -> 'entry' ->> 'phone' = '8015550101', '3.07 phone: "+1 (801) 555-0101" is stored as 8015550101');
select t.ok(:'r'::jsonb -> 'entry' ->> 'handle' = 'marcus.lee',
  '3.08 handle: a pasted https://host/ profile URL with a query is stored as the bare lowercase handle');
select t.ok(:'r'::jsonb -> 'entry' ->> 'first_name' = 'Marcus' and :'r'::jsonb -> 'entry' -> 'tags' = '["Sports", "Gym"]',
  '3.09 names are trimmed and tags de-duplicated in order');
select t.ok((:'r'::jsonb -> 'entry' ->> 'is_complete')::boolean and (:'r'::jsonb -> 'entry' ->> 'counted')::boolean
            and (:'r'::jsonb ->> 'count')::int = 1 and :'r'::jsonb -> 'entry' -> 'missing' = '[]'
            and :'r'::jsonb -> 'entry' ->> 'completed_at' is not null and :'r'::jsonb -> 'entry' ->> 'person_id' is not null,
  '3.10 a complete entry counts, has nothing missing, is stamped completed and linked to a Person');
select t.ok(t.has_effect(:'r'::jsonb, '{"type":"xp","points":10,"key":"cc:8015550101"}')
            and t.has_effect(:'r'::jsonb, '{"type":"xp","points":3,"key":"ch:8015550101"}')
            and (:'r'::jsonb ->> 'xp')::int = 13
            and :'r'::jsonb -> 'level' = '{"name":"Rookie","min":0,"next_name":"Scout","next_min":150}',
  '3.11 counting for the first time earns cc:<phone> +10 and, under a chain prompt, ch:<phone> +3');
select rally100.save_entry(jsonb_build_object('id', t.e(4), 'first_name', 'Marcus', 'last_name', 'Lee')) as r \gset
select t.ok(:'r'::jsonb -> 'entry' -> 'missing' = '["Phone", "Social handle"]'
            and not (:'r'::jsonb -> 'entry' ->> 'counted')::boolean and (:'r'::jsonb ->> 'drafts')::int = 1
            and :'r'::jsonb -> 'entry' ->> 'held_of' is null and :'r'::jsonb -> 'entry' ->> 'person_id' is null,
  '3.12 a name-only draft lists what is missing, does not count, is never held (name-only) and has no Person yet');
select rally100.save_entry(jsonb_build_object('id', t.e(5), 'first_name', 'Kai', 'last_name', 'Moe',
         'phone', '1-801-555-0105', 'handle', '@KaiMoe', 'platform', 'Other', 'other_app', ' Myspace ')) as r \gset
select t.ok(:'r'::jsonb -> 'entry' ->> 'phone' = '8015550105' and :'r'::jsonb -> 'entry' ->> 'handle' = 'kaimoe'
            and :'r'::jsonb -> 'entry' ->> 'other_app' = 'Myspace' and (:'r'::jsonb -> 'entry' ->> 'is_complete')::boolean,
  '3.13 a leading 1 is dropped from 11 digits, @ is stripped, and an Other handle with its app name is complete');
select rally100.save_entry(jsonb_build_object('id', t.e(5), 'notes', 'updated note')) as r \gset
select t.ok(:'r'::jsonb -> 'entry' ->> 'first_name' = 'Kai' and :'r'::jsonb -> 'entry' ->> 'phone' = '8015550105'
            and :'r'::jsonb -> 'entry' ->> 'notes' = 'updated note' and (:'r'::jsonb -> 'entry' ->> 'is_complete')::boolean,
  '3.14 on update an absent key leaves its field unchanged');
select rally100.save_entry(jsonb_build_object('id', t.e(1), 'scene', 'gym', 'chain_hit', false)) as r \gset
select t.ok(:'r'::jsonb -> 'entry' ->> 'scene' = 'bus' and (:'r'::jsonb -> 'entry' ->> 'chain_hit')::boolean,
  '3.15 scene and chain_hit are origin facts: a later save cannot move a counted name to another Scene');
select (rally100.rep_state() ->> 'xp')::int as xp_pre \gset
select rally100.save_entry(jsonb_build_object('id', t.e(1), 'first_name', 'Marcus', 'notes', 'met at practice')) as r \gset
select t.ok(t.n_effects(:'r'::jsonb, 'xp') = 0 and (:'r'::jsonb ->> 'xp')::int = :xp_pre,
  '3.16 a retried save of the same entry earns nothing');
reset role;
select t.ok((select count(*) from rally100.entries where id = t.e(1)) = 1
            and (select count(*) from rally100.entries where id = t.e(900)) = 0,
  '3.17 a retried save_entry with the same UUID updates one row; every refused save wrote nothing');
select t.ok((select count(*) from rally100.audit where entity = 'entry' and entity_id = t.e(1)) = 1,
  '3.18 a save that changes nothing writes no audit row (the retry is a no-op)');

-- ================================================ 4. within-rep duplicates
call t.login(:'R1');
select rally100.save_entry(jsonb_build_object('id', t.e(2), 'first_name', 'Marc', 'last_name', 'Lee',
         'phone', '801 555 0101', 'tags', jsonb_build_array('Work'), 'notes', 'from the gym')) as r \gset
select t.ok(:'r'::jsonb -> 'entry' ->> 'held_of' = t.e(1)::text and not (:'r'::jsonb -> 'entry' ->> 'counted')::boolean
            and (:'r'::jsonb ->> 'count')::int = 2 and (:'r'::jsonb ->> 'held')::int = 1
            and t.has_effect(:'r'::jsonb, jsonb_build_object('type', 'held', 'older_id', t.e(1), 'older_name', 'Marcus Lee', 'by', 'phone'))
            and :'r'::jsonb -> 'entry' ->> 'held_of_name' = 'Marcus Lee',
  '4.01 the NEWER entry with the same phone is held of the older, which keeps counting (adding never lowers the count)');
select rally100.save_entry(jsonb_build_object('id', t.e(3), 'first_name', 'M', 'last_name', 'L',
         'handle', '@MARCUS.LEE', 'platform', 'Instagram')) as r \gset
select t.ok(:'r'::jsonb -> 'entry' ->> 'held_of' = t.e(1)::text
            and t.has_effect(:'r'::jsonb, jsonb_build_object('type', 'held', 'older_id', t.e(1), 'older_name', 'Marcus Lee', 'by', 'handle')),
  '4.02 the same platform plus handle (case-insensitive) holds the newer entry too');
select rally100.save_entry(jsonb_build_object('id', t.e(6), 'first_name', 'Ty', 'last_name', 'Ng',
         'handle', 'kaimoe', 'platform', 'Other', 'other_app', 'Friendster')) as r \gset
select t.ok(:'r'::jsonb -> 'entry' ->> 'held_of' is null,
  '4.03 the same handle on a different Other app is a different account: not held');
select rally100.save_entry(jsonb_build_object('id', t.e(7), 'first_name', 'Kay', 'last_name', 'Mo',
         'handle', 'KaiMoe', 'platform', 'Other', 'other_app', 'MYSPACE')) as r \gset
select t.ok(:'r'::jsonb -> 'entry' ->> 'held_of' = t.e(5)::text,
  '4.04 the same handle on the same Other app (any capitalisation) is held');
select t.ok(t.err(format('select rally100.resolve_duplicate(%L, %L, %L)', t.e(1), 'same', null)) = '22023 rally100: not_held'
            and t.err(format('select rally100.resolve_duplicate(%L, %L, %L)', t.e(2), 'maybe', null)) = '22023 rally100: invalid_decision',
  '4.05 resolve_duplicate needs a held entry and a decision of same or different');
select t.ok(t.err(format('select rally100.resolve_duplicate(%L, %L, %L)', t.e(3), 'different', 'two people')) = '22023 rally100: handle_match_needs_fix',
  '4.06 "Different people" on a handle-only match is refused: one handle cannot be two humans');
select (rally100.rep_state() ->> 'xp')::int as xp_before \gset
select rally100.resolve_duplicate(t.e(2), 'same', null) as r \gset
select t.ok(:'r'::jsonb -> 'entry' ->> 'id' = t.e(1)::text and :'r'::jsonb -> 'entry' -> 'tags' = '["Sports", "Gym", "Work"]'
            and :'r'::jsonb -> 'entry' ->> 'notes' = E'met at practice\n\nfrom the gym'
            and (:'r'::jsonb ->> 'count')::int = 2 and t.n_effects(:'r'::jsonb, 'xp') = 0,
  '4.07 "Same person": the older entry survives, tags are united, notes appended, the count does not move, no XP');
select t.ok(not exists (select 1 from jsonb_array_elements(rally100.rep_state() -> 'entries') x where x ->> 'id' = t.e(2)::text),
  '4.08 the merged-away entry is no longer one of the rep''s entries');
-- an older DRAFT absorbs the newer complete duplicate and counts — but the merge earns nothing
select rally100.save_entry(jsonb_build_object('id', t.e(10), 'first_name', 'Ana', 'phone', t.ph(10))) as r \gset
select rally100.save_entry(jsonb_build_object('id', t.e(11), 'first_name', 'Ana', 'last_name', 'Cruz', 'phone', t.ph(10),
         'handle', 'anacruz', 'platform', 'TikTok')) as r \gset
select t.ok(:'r'::jsonb -> 'entry' ->> 'held_of' = t.e(10)::text and (:'r'::jsonb ->> 'count')::int = 2,
  '4.09 a complete entry is held of an OLDER draft with the same phone');
select rally100.resolve_duplicate(t.e(11), 'same', null) as r \gset
select t.ok((:'r'::jsonb -> 'entry' ->> 'is_complete')::boolean and (:'r'::jsonb -> 'entry' ->> 'counted')::boolean
            and :'r'::jsonb -> 'entry' ->> 'last_name' = 'Cruz' and :'r'::jsonb -> 'entry' ->> 'handle' = 'anacruz'
            and (:'r'::jsonb ->> 'count')::int = 3 and t.n_effects(:'r'::jsonb, 'xp') = 0,
  '4.10 "Same person" fills the older draft''s missing fields; it now counts, and the merge grants no XP');
reset role;
select t.ok((select points from rally100.xp_events where rep_id = :'R1' and key = 'cc:' || t.ph(10)) = 0
            and t.xp(:'R1') = :xp_before,
  '4.11 the survivor''s completion key is recorded at zero points, so it can never be earned later');
call t.login(:'R1');
select rally100.save_entry(jsonb_build_object('id', t.e(12), 'first_name', 'Leo', 'last_name', 'Park', 'phone', t.ph(12),
         'handle', 'leopark', 'platform', 'Snapchat')) as r \gset
select rally100.save_entry(jsonb_build_object('id', t.e(13), 'first_name', 'Lee', 'last_name', 'Park', 'phone', t.ph(12),
         'handle', 'leepark', 'platform', 'Snapchat')) as r \gset
select t.ok(:'r'::jsonb -> 'entry' ->> 'held_of' = t.e(12)::text, '4.12 a brother sharing the phone is held at first');
select t.ok(t.err(format('select rally100.resolve_duplicate(%L, %L, %L)', t.e(13), 'different', null)) = '22023 rally100: reason_required'
            and t.err(format('select rally100.resolve_duplicate(%L, %L, %L)', t.e(13), 'different', '   ')) = '22023 rally100: reason_required',
  '4.13 "Different people" needs a reason');
select rally100.resolve_duplicate(t.e(13), 'different', 'brothers share a phone') as r \gset
select t.ok(:'r'::jsonb -> 'entry' ->> 'held_of' is null and (:'r'::jsonb -> 'entry' ->> 'counted')::boolean
            and :'r'::jsonb -> 'entry' -> 'kept_with' = jsonb_build_array(t.e(12))
            and (:'r'::jsonb ->> 'count')::int = 5
            and t.has_effect(:'r'::jsonb, jsonb_build_object('type', 'xp', 'points', 10, 'key', 'cc:' || t.ph(12) || '#' || t.e(13))),
  '4.14 "Different people": the newer is released and counts, both count, and its XP key is per-entry');
reset role;
select t.ok((select kept_with from rally100.entries where id = t.e(12)) = array[t.e(13)]
            and (select kept_reason from rally100.entries where id = t.e(13)) = 'brothers share a phone'
            and exists (select 1 from rally100.xp_events where rep_id = :'R1' and key = 'cc:' || t.ph(12))
            and exists (select 1 from rally100.xp_events where rep_id = :'R1' and key = 'cc:' || t.ph(12) || '#' || t.e(13))
            and t.person_of(t.e(12)) <> t.person_of(t.e(13)),
  '4.15 both entries record each other, keep separate XP keys and separate Persons');
call t.login(:'R1');
select rally100.save_entry(jsonb_build_object('id', t.e(14), 'first_name', 'Lou', 'last_name', 'Park', 'phone', t.ph(12),
         'handle', 'leopark', 'platform', 'Snapchat')) as r \gset
select t.ok(t.err(format('select rally100.resolve_duplicate(%L, %L, %L)', t.e(14), 'different', 'cousin')) = '22023 rally100: handle_match_needs_fix',
  '4.16 "Different people" is refused when the handle matches as well as the phone');
select rally100.save_entry(jsonb_build_object('id', t.e(15), 'first_name', 'Ola', 'last_name', 'Ray', 'phone', t.ph(15),
         'handle', 'olaray', 'platform', 'X')) as r \gset
select rally100.save_entry(jsonb_build_object('id', t.e(16), 'first_name', 'Ola', 'last_name', 'Ray', 'phone', t.ph(15))) as r \gset
select (rally100.rep_state() ->> 'count')::int as c0 \gset
select rally100.remove_entry(t.e(15)) as r \gset
select t.ok((select x ->> 'held_of' from jsonb_array_elements(rally100.rep_state() -> 'entries') x where x ->> 'id' = t.e(16)::text) is null
            and (:'r'::jsonb -> 'entry' ->> 'removed')::boolean and (:'r'::jsonb ->> 'count')::int = :c0 - 1,
  '4.17 removing the older entry releases the newer one (a draft here, so the count falls by one)');
select rally100.restore_entry(t.e(15)) as r \gset
select t.ok((select x ->> 'held_of' from jsonb_array_elements(rally100.rep_state() -> 'entries') x where x ->> 'id' = t.e(16)::text) = t.e(15)::text
            and (:'r'::jsonb ->> 'count')::int = :c0 and t.n_effects(:'r'::jsonb, 'xp') = 0,
  '4.18 restoring the older entry re-runs the check: the newer is held again and nothing is re-earned');
select rally100.save_entry(jsonb_build_object('id', t.e(17), 'first_name', 'Zed')) as r \gset
select rally100.save_entry(jsonb_build_object('id', t.e(18), 'first_name', 'Zed', 'last_name', 'Quinn', 'phone', t.ph(18),
         'handle', 'zedq', 'platform', 'Discord')) as r \gset
select (:'r'::jsonb ->> 'count')::int as c0 \gset
select rally100.save_entry(jsonb_build_object('id', t.e(17), 'phone', t.ph(18))) as r \gset
select t.ok((select x ->> 'held_of' from jsonb_array_elements(rally100.rep_state() -> 'entries') x where x ->> 'id' = t.e(18)::text) = t.e(17)::text
            and (:'r'::jsonb ->> 'count')::int = :c0 - 1,
  '4.19 an older draft that gains the same phone holds the NEWER entry, whichever was saved last');
select t.ok(t.err(format('select rally100.save_entry(%L)', jsonb_build_object('id', t.e(2), 'first_name', 'X')))
              = '22023 rally100: entry_removed'
            and t.err(format('select rally100.restore_entry(%L)', t.e(2))) = '42501 rally100: not_found',
  '4.20 a merged-away entry can be neither edited (entry_removed) nor restored (not_found)');
select rally100.remove_entry(t.e(15)) as r \gset
select rally100.remove_entry(t.e(15)) as r2 \gset
select t.ok(:'r'::jsonb ->> 'count' = :'r2'::jsonb ->> 'count' and t.n_effects(:'r2'::jsonb, 'xp') = 0,
  '4.21 removing an entry twice is a no-op, not an error');
select t.ok(t.err(format('select rally100.save_entry(%L)', jsonb_build_object('id', t.e(15), 'notes', 'x'))) = '22023 rally100: entry_removed',
  '4.22 a removed entry cannot be edited until it is restored');
select rally100.restore_entry(t.e(15)) as r \gset

-- ======================================== 5. XP, milestones, scenes, levels
select (rally100.rep_state() ->> 'count')::int as c0 \gset
select t.ok(:c0 = 6, '5.00 (setup) Tyler has six counted contacts');
select t.fill_until(10, 1000) as f \gset
select t.ok((select count(*) from jsonb_array_elements(:'f'::jsonb -> 'effects') x
              where x = '{"type":"milestone","n":10}') = 1
            and (select count(*) from jsonb_array_elements(:'f'::jsonb -> 'effects') x
                  where x = '{"type":"xp","points":50,"key":"ms:10"}') = 1,
  '5.01 reaching 10 counted fires the 10 milestone once, with ms:10 +50 XP');
select (rally100.rep_state() ->> 'xp')::int as xp1 \gset
select rally100.remove_entry(t.e(1000)) as r \gset
select t.save(t.full(1100, 'Re', 'Add')) as r2 \gset
select t.ok(t.n_effects(:'r2'::jsonb, 'milestone') = 0 and rally100.rep_state() -> 'milestones' = '[10]',
  '5.02 dropping below 10 and coming back does not fire the milestone again');
select rally100.restore_entry(t.e(1000)) as r \gset
select rally100.remove_entry(t.e(1100)) as r \gset
select t.ok((rally100.rep_state() ->> 'xp')::int = :xp1 + 10,
  '5.03 remove and restore never re-grant XP (only the genuinely new contact earned its +10)');
-- three counted names in one Scene clear it, once
select t.save(t.full(20, 'Gia', 'Lo', 'gym')) as r \gset
select t.save(t.full(21, 'Hal', 'Mo', 'gym')) as r \gset
select t.ok(t.n_effects(:'r'::jsonb, 'scene_cleared') = 0, '5.04 two counted names do not clear The Gym');
select t.save(t.full(22, 'Ivo', 'No', 'gym')) as r \gset
select t.ok(t.has_effect(:'r'::jsonb, '{"type":"scene_cleared","scene":"gym"}')
            and t.has_effect(:'r'::jsonb, '{"type":"xp","points":15,"key":"sc:gym"}')
            and (rally100.rep_state() -> 'scenes' -> 'gym') = '{"names":3,"lit":3,"drafts":0,"cleared":true}',
  '5.05 the third counted name clears the Scene: scene_cleared and sc:gym +15 XP');
select rally100.remove_entry(t.e(22)) as r \gset
select rally100.restore_entry(t.e(22)) as r \gset
select t.save(t.full(23, 'Jo', 'Po', 'gym')) as r2 \gset
select t.ok(t.n_effects(:'r'::jsonb, 'scene_cleared') = 0 and t.n_effects(:'r2'::jsonb, 'scene_cleared') = 0,
  '5.06 a Scene clears once: removing and restoring, or a fourth name, clears nothing again');
-- re-adding the same contact as a brand-new entry finds its key already taken
select rally100.remove_entry(t.e(1001)) as r \gset
select rally100.save_entry(jsonb_build_object('id', t.e(1101), 'first_name', 'F1001', 'last_name', 'Again',
         'phone', t.ph(1001), 'handle', 'h1001again', 'platform', 'X')) as r \gset
select t.ok((:'r'::jsonb -> 'entry' ->> 'counted')::boolean and t.n_effects(:'r'::jsonb, 'xp') = 0,
  '5.07 removing a contact and adding it again as a new entry counts but earns nothing (cc:<phone> is taken)');
select (rally100.rep_state() ->> 'xp')::int as xp2 \gset
select rally100.save_entry(jsonb_build_object('id', t.e(1002), 'phone', '')) as r \gset
select t.ok(not (:'r'::jsonb -> 'entry' ->> 'counted')::boolean, '5.08 blanking the phone uncounts the entry');
select rally100.save_entry(jsonb_build_object('id', t.e(1002), 'phone', t.ph(1199))) as r \gset
select t.ok((:'r'::jsonb -> 'entry' ->> 'counted')::boolean and t.n_effects(:'r'::jsonb, 'xp') = 0
            and (:'r'::jsonb ->> 'xp')::int = :xp2,
  '5.09 retyping a DIFFERENT phone counts it again but earns nothing: an entry earns its completion once in its life');
select t.save(t.full(24, 'Kit', 'Qu', 'shift')) as r \gset
select t.save(t.full(25, 'Lu', 'Ro', 'shift')) as r \gset
select t.save(t.full(26, 'Max', 'Su', 'shift')) as r \gset
select t.save(t.full(27, 'Nia', 'Ta', 'lunch')) as r \gset
select t.save(t.full(28, 'Oz', 'Ul', 'lunch')) as r \gset
select t.save(t.full(29, 'Pia', 'Vo', 'lunch')) as r \gset
select t.ok(rally100.rep_state() -> 'badges' @> '["reader"]', '5.10 three Scenes cleared earns the reader badge');
select t.ok(t.err($$select rally100.award_badge('reader')$$) = '22023 rally100: invalid_badge'
            and t.err($$select rally100.award_badge('full')$$) = '22023 rally100: invalid_badge',
  '5.11 a client cannot claim a server-derived badge');
select t.ok(rally100.award_badge('sprinter') -> 'badges' @> '["sprinter"]'
            and (select count(*) from jsonb_array_elements_text(rally100.award_badge('sprinter') -> 'badges') b where b = 'sprinter') = 1,
  '5.12 award_badge accepts sprinter, idempotently');
reset role;
call t.login(:'R2');
select t.fill_until(12, 2700) as f \gset
select t.ok((select count(*) from jsonb_array_elements(:'f'::jsonb -> 'effects') x where x ->> 'type' = 'level') = 1
            and (select count(*) from jsonb_array_elements(:'f'::jsonb -> 'effects') x where x = '{"type":"level","name":"Scout"}') = 1
            and rally100.rep_state() -> 'level' ->> 'name' = 'Scout' and (rally100.rep_state() ->> 'xp')::int = 170,
  '5.13 crossing 150 XP reports exactly one level-up, to Scout (12 x 10 + 50 = 170 XP)');
select t.save(t.full(2900, 'Same', 'Phone')) as r \gset
reset role;
select t.ok(exists (select 1 from rally100.xp_events where rep_id = :'R2' and key = 'cc:' || t.ph(2900))
            and (select count(*) from rally100.xp_events where key like 'cc:%' and rep_id not in (:'R1', :'R2')) = 0,
  '5.14 XP keys are per rep: another rep earns their own keys');
select t.ok((select count(*) from rally100.xp_events group by rep_id, key having count(*) > 1 limit 1) is null,
  '5.15 no (rep, key) XP pair exists twice');

-- ============================================ 6. persons (the master CRM)
call t.login(:'R2');
select rally100.save_entry(jsonb_build_object('id', t.e(2001), 'first_name', 'Marcus', 'last_name', 'LEE',
         'phone', '(801) 555-0101', 'handle', 'marcus_l', 'platform', 'Snapchat')) as r \gset
reset role;
select t.ok(t.person_of(t.e(2001)) = t.person_of(t.e(1)),
  '6.01 a second rep''s entry with the same phone and the same last name (any case) links to the same Person');
select t.person_of(t.e(1)) as p1 \gset
select t.ok((select count(*) from rally100.persons where id = :'p1') = 1
            and (select array_agg(kind || '=' || value order by kind, value) from rally100.person_identifiers where person_id = :'p1')
                = array['handle=Instagram:marcus.lee', 'handle=Snapchat:marcus_l', 'phone=8015550101'],
  '6.02 every identifier either entry carries is recorded on the Person; differing values accumulate');
call t.login(:'R3');
select rally100.save_entry(jsonb_build_object('id', t.e(3001), 'first_name', 'Marcus', 'last_name', 'Smith',
         'phone', '8015550101')) as r \gset
reset role;
select t.ok(t.person_of(t.e(3001)) <> :'p1'
            and exists (select 1 from rally100.possible_matches
                         where person_a = :'p1' and person_b = t.person_of(t.e(3001)) and signal = 'phone' and status = 'open'),
  '6.03 a strong signal with a DIFFERENT last name creates a new Person and an open possible match for a leader');
call t.login(:'RB');
select rally100.save_entry(jsonb_build_object('id', t.e(8001), 'first_name', 'Marky', 'last_name', 'Mark',
         'phone', '801-555-0101', 'handle', 'marcus.lee', 'platform', 'Instagram')) as r \gset
reset role;
select t.ok(t.person_of(t.e(8001)) = :'p1',
  '6.04 phone AND handle both matching link to the same Person whatever the last name (here across teams)');
call t.login(:'R3');
select rally100.save_entry(jsonb_build_object('id', t.e(3002), 'first_name', 'Draft', 'phone', t.ph(3002))) as r \gset
select rally100.save_entry(jsonb_build_object('id', t.e(3002), 'last_name', 'Named')) as r \gset
reset role;
select t.ok((select first_name || ' ' || last_name from rally100.persons where id = t.person_of(t.e(3002))) = 'Draft Named',
  '6.05 a Person created from a nameless draft takes its last name from the entry once it has one');

-- ============================================ 7. introductions and receipt
call t.login(:'R1');
select t.ok(t.err(format('select rally100.plan_intro(%L)', t.e(4))) = '22023 rally100: entry_not_complete'
            and t.err(format('select rally100.record_intro(%L, %L, %L)', t.e(4), 'text', 'in')) = '22023 rally100: entry_not_complete',
  '7.01 an introduction needs a complete entry: entry_not_complete');
select t.ok(t.err(format('select rally100.plan_intro(%L)', t.e(14))) = '22023 rally100: held_duplicate'
            and t.err(format('select rally100.record_intro(%L, %L, %L)', t.e(14), 'text', 'in')) = '22023 rally100: held_duplicate',
  '7.02 an introduction cannot start from a held duplicate, even a complete one: held_duplicate');
select t.ok(t.err(format('select rally100.record_intro(%L, %L, %L)', t.e(1), 'carrier pigeon', 'in')) = '22023 rally100: invalid_channel'
            and t.err(format('select rally100.record_intro(%L, %L, %L)', t.e(1), 'text', 'yes!')) = '22023 rally100: invalid_said',
  '7.03 the channel and what the friend said must be from the lists');
reset role;
call t.login(:'R2');
select rally100.plan_intro(t.e(2001)) as r \gset
select t.ok(:'r'::jsonb -> 'intro' ->> 'status' = 'planned' and :'r'::jsonb -> 'intro' ->> 'stage' = 'intro_planned'
            and :'r'::jsonb -> 'intro' -> 'next' ->> 'who' = 'you',
  '7.04 plan_intro records a planned introduction and moves the Person to intro_planned');
select rally100.record_intro(t.e(2001), 'text', 'in', 'he is keen', '2026-01-02') as r \gset
select t.ok(:'r'::jsonb -> 'intro' ->> 'status' = 'introduced' and :'r'::jsonb -> 'intro' ->> 'stage' = 'introduced'
            and :'r'::jsonb -> 'intro' ->> 'interest' = 'interested' and :'r'::jsonb -> 'intro' ->> 'recorded_at' is not null
            and :'r'::jsonb -> 'intro' ->> 'leader_name' = 'Dana Lead'
            and :'r'::jsonb -> 'intro' -> 'next' = '{"who":"leader","name":"Dana Lead","text":"schedules the meeting"}',
  '7.05 record_intro: introduced at server time, interest from "in", the team''s first leader becomes responsible');
reset role;
select t.ok((select status from t.referral_of(:'p1')) = 'in_progress' and (select rep_id from t.referral_of(:'p1')) is null
            and (select amount_cents from t.referral_of(:'p1')) = 10000 and (select currency from t.referral_of(:'p1')) = 'USD'
            and (select responsible_leader from rally100.persons where id = :'p1') = :'L1'::uuid,
  '7.06 the first recorded introduction creates the Person''s referral reward: in_progress, $100 in cents, no credited rep');
select (select recorded_at from rally100.introductions where person_id = :'p1' and rep_id = :'R2') as rec_r2 \gset
call t.login(:'R2');
select rally100.record_intro(t.e(2001), 'call', 'maybe', 'second try', null) as r \gset
reset role;
select t.ok((select recorded_at from rally100.introductions where person_id = :'p1' and rep_id = :'R2') = :'rec_r2'::timestamptz
            and (select channel from rally100.introductions where person_id = :'p1' and rep_id = :'R2') = 'call'
            and (select count(*) from rally100.rewards where kind = 'referral' and person_id = :'p1') = 1,
  '7.07 recording again keeps the first recorded_at (the race cannot be re-run) and creates no second reward');
call t.login(:'L1');
select rally100.set_interest(:'p1', 'maybe') as r \gset
call t.login(:'R1');
select rally100.record_intro(t.e(1), 'in_person', 'not_for_them', null, null) as r \gset
reset role;
select t.ok((select interest from rally100.persons where id = :'p1') = 'maybe'
            and (select recorded_at from rally100.introductions where person_id = :'p1' and rep_id = :'R1') > :'rec_r2'::timestamptz,
  '7.08 once a leader has set interest, a rep''s report of what the friend said does not overwrite it');
-- the leader confirms R1's (LATER-recorded) introduction FIRST
call t.login(:'L1');
select t.ok(t.err(format('select rally100.confirm_intro_received(%L, %L)', :'p1', :'R3')) = '42501 rally100: not_found',
  '7.09 confirming a rep who has no introduction of this Person is refused (not_found)');
select rally100.confirm_intro_received(:'p1', :'R1') as r \gset
reset role;
select t.xp(:'R1') as xp_r1 \gset
select t.ok(exists (select 1 from rally100.xp_events where rep_id = :'R1' and key = 'in:' || :'p1' and points = 100)
            and exists (select 1 from rally100.badges where rep_id = :'R1' and badge = 'first_intro')
            and (select received_by from rally100.introductions where person_id = :'p1' and rep_id = :'R1') = :'L1'::uuid,
  '7.10 confirm_intro_received grants the rep in:<person> +100 XP and the first_intro badge');
call t.login(:'L1');
select rally100.confirm_intro_received(:'p1', :'R1') as r \gset
select rally100.confirm_intro_received(:'p1', :'R2') as r \gset
reset role;
select t.ok(t.xp(:'R1') = :xp_r1
            and (select count(*) from rally100.audit where entity = 'person' and entity_id = :'p1'
                   and action = 'intro_received' and detail ->> 'rep_id' = :'R1') = 1,
  '7.11 confirming the same introduction again is a no-op: XP is granted once');
call t.login(:'R1');
select t.ok((select x ->> 'received' from jsonb_array_elements(rally100.rep_state() -> 'intros') x
              where x ->> 'entry_id' = t.e(1)::text)::boolean,
  '7.12 the rep sees their introduction as received');

-- ============================================ 8. requirements and the credit
call t.login(:'L1');
select rally100.set_requirement(:'p1', 1, true, '2026-03-06', 'met in person') as r \gset
select t.ok(:'r'::jsonb -> 'reward' ->> 'status' = 'in_progress' and (:'r'::jsonb -> 'person' ->> 'confirmed_count')::int = 1
            and :'r'::jsonb -> 'requirements' -> 0 @> '{"req":1,"confirmed":true,"by_name":"Dana Lead","event_date":"2026-03-06"}',
  '8.01 requirement 1 is confirmed with the leader''s name and the event date');
select rally100.set_requirement(:'p1', 2, true) as r \gset
select rally100.set_requirement(:'p1', 3, true) as r \gset
select t.ok(t.err(format('select rally100.set_requirement(%L, 5, true)', :'p1')) = '22023 rally100: invalid_req'
            and t.err(format('select rally100.set_requirement(%L, 4, true)', :'p1')) = '22023 rally100: start_date_required'
            and t.err(format('select rally100.set_requirement(%L, 4, true, null, null, %L)', :'p1', '2027-05-04')) = '22023 rally100: travel_required',
  '8.02 requirement 4 needs a start date and either a travel note or travel_na');
reset role;
select t.ok((select status from t.referral_of(:'p1')) = 'in_progress' and (select rep_id from t.referral_of(:'p1')) is null,
  '8.03 three of four confirmed leaves the reward in_progress with no credited rep');
call t.login(:'L1');
select rally100.set_requirement(:'p1', 4, true, null, 'start confirmed', '2027-05-04', null, true) as r \gset
select t.ok(:'r'::jsonb -> 'reward' ->> 'status' = 'ready' and :'r'::jsonb -> 'person' ->> 'start_date' = '2027-05-04'
            and (:'r'::jsonb -> 'person' ->> 'travel_na')::boolean,
  '8.04 the fourth confirmation moves the reward to ready');
reset role;
select t.ok((select rep_id from t.referral_of(:'p1')) = :'R2'::uuid,
  '8.05 CREDIT: the earliest RECORDED introduction wins (Sam), although the leader confirmed Tyler''s receipt first');
select t.ok((select string_agg(action, ',' order by id) from rally100.reward_events
              where reward_id = (select id from t.referral_of(:'p1'))) = 'create,credit',
  '8.06 the ledger holds the creation and the credit');
call t.login(:'R1');
select rally100.rep_state() as s \gset
select t.ok((select x from jsonb_array_elements(:'s'::jsonb -> 'referrals') x where x ->> 'name' = 'Marcus Lee')
              = jsonb_build_object('credited', 'other', 'name', 'Marcus Lee', 'entry_id', t.e(1)),
  '8.07 the rep NOT credited sees only credited:"other", the name they typed and their own entry id');
select t.ok(position(:'R2' in :'s') = 0 and position('Sam' in :'s') = 0 and position(t.e(2001)::text in :'s') = 0
            and position('marcus_l' in :'s') = 0,
  '8.08 nothing in the other rep''s rep_state names, ids or quotes the credited rep');
call t.login(:'R2');
select t.ok((select x ->> 'credited' from jsonb_array_elements(rally100.rep_state() -> 'referrals') x
              where x ->> 'person_id' = :'p1') = 'me',
  '8.09 the credited rep sees credited:"me"');
call t.login(:'L1');
select t.ok(t.err(format('select rally100.set_requirement(%L, 2, false)', :'p1')) = '22023 rally100: reason_required',
  '8.10 unticking a requirement needs a reason');
select rally100.set_requirement(:'p1', 2, false, null, 'commitment was a maybe') as r \gset
select t.ok(:'r'::jsonb -> 'reward' ->> 'status' = 'in_progress' and :'r'::jsonb -> 'reward' ->> 'rep_name' is null
            and not (:'r'::jsonb -> 'requirements' -> 1 ->> 'confirmed')::boolean,
  '8.11 an untick before approval returns the reward to in_progress and clears the credit');
select rally100.set_requirement(:'p1', 2, true, null, 'firm yes') as r \gset
select t.ok(:'r'::jsonb -> 'reward' ->> 'status' = 'ready' and :'r'::jsonb -> 'reward' ->> 'rep_name' = 'Sam Rep',
  '8.12 re-confirming applies the rule again: ready, credited to Sam');
reset role;
-- no received introduction: in_progress, flagged no_intro, until one is received
call t.login(:'R3');
select t.save(t.full(3010, 'Pat', 'Moss')) as r \gset
select rally100.record_intro(t.e(3010), 'call', 'maybe') as r \gset
reset role;
select t.person_of(t.e(3010)) as ppat \gset
call t.login(:'L1');
select rally100.set_requirement(:'ppat', 1, true) as r \gset
select rally100.set_requirement(:'ppat', 2, true) as r \gset
select rally100.set_requirement(:'ppat', 3, true) as r \gset
select rally100.set_requirement(:'ppat', 4, true, null, null, '2027-06-01', 'driving up with family') as r \gset
select t.ok(:'r'::jsonb -> 'reward' ->> 'status' = 'in_progress' and :'r'::jsonb -> 'reward' -> 'flags' = '["no_intro"]'
            and :'r'::jsonb -> 'person' ->> 'travel_note' = 'driving up with family',
  '8.13 four confirmations with NO received introduction leave the reward in_progress, flagged no_intro');
select rally100.confirm_intro_received(:'ppat', :'R3') as r \gset
reset role;
select t.ok((select status from t.referral_of(:'ppat')) = 'ready' and (select rep_id from t.referral_of(:'ppat')) = :'R3'::uuid
            and (select flags from t.referral_of(:'ppat')) = '{}',
  '8.14 receiving the introduction afterwards credits it and clears the flag');
-- a confirmation before any introduction creates the record for the owner to see
call t.login(:'R1');
select t.save(t.full(30, 'Ivy', 'Stone')) as r \gset
reset role;
select t.person_of(t.e(30)) as pivy \gset
call t.login(:'L1');
select rally100.set_requirement(:'pivy', 1, true) as r \gset
reset role;
select t.ok((select status from t.referral_of(:'pivy')) = 'in_progress',
  '8.15 a requirement confirmed before any introduction creates the Person''s single referral record');

-- =================================================== 9. review and payment
select (select id from t.referral_of(:'p1')) as rw1, (select id from t.referral_of(:'ppat')) as rwpat \gset
call t.login(:'LB');
select t.ok(t.err(format('select rally100.review_reward(%L, %L, null)', :'rw1', 'approve'))
              = '42501 rally100: not_found',
  '9.01 a leader of another team cannot act on this team''s reward (not_found), even sharing the Person');
call t.login(:'L1');
select t.ok(t.err(format('select rally100.review_reward(%L, %L, null)', :'rw1', 'bless')) = '22023 rally100: invalid_action'
            and t.err(format('select rally100.review_reward(%L, %L, null)', :'rw1', 'needs_correction')) = '22023 rally100: note_required',
  '9.02 review needs approve or needs_correction, and needs_correction needs a note');
select rally100.review_reward(:'rw1', 'needs_correction', 'date on agreement is wrong') as r \gset
select t.ok(:'r'::jsonb -> 'reward' ->> 'status' = 'needs_correction'
            and :'r'::jsonb -> 'reward' ->> 'correction_note' = 'date on agreement is wrong'
            and :'r'::jsonb -> 'reward' ->> 'correction_by_name' = 'Dana Lead',
  '9.03 needs_correction records the note and who raised it');
select t.ok(t.err(format('select rally100.review_reward(%L, %L, null)', :'rw1', 'approve')) = '22023 rally100: not_ready',
  '9.04 a reward under correction cannot be approved');
call t.login(:'L2');
select t.ok(t.err(format('select rally100.resolve_correction(%L, null)', :'rw1')) = '42501 rally100: not_allowed',
  '9.05 only whoever raised the correction (or the owner) resolves it');
call t.login(:'L1');
select rally100.resolve_correction(:'rw1', 'fixed the date') as r \gset
select t.ok(:'r'::jsonb -> 'reward' ->> 'status' = 'ready', '9.06 resolve_correction returns it to ready');
select rally100.review_reward(:'rw1', 'approve', 'walked through it') as r \gset
select rally100.review_reward(:'rw1', 'approve', 'double tap') as r2 \gset
select t.ok(:'r'::jsonb -> 'reward' ->> 'status' = 'approved' and :'r'::jsonb -> 'reward' ->> 'approved_by_name' = 'Dana Lead'
            and :'r2'::jsonb -> 'reward' ->> 'status' = 'approved',
  '9.07 approve moves ready to approved; a repeated approve is a no-op');
reset role;
select t.ok((select count(*) from rally100.reward_events where reward_id = :'rw1' and action = 'approve') = 1,
  '9.08 the retried approve wrote no second ledger entry');
call t.login(:'L1');
select t.ok(t.err(format('select rally100.set_requirement(%L, 3, false, null, %L)', :'p1', 'oops')) = '22023 rally100: locked_reward',
  '9.09 after approval a requirement cannot be unticked (locked_reward)');
select t.ok(t.err(format('select rally100.mark_pay_issued(%L, null, %L)', :'rw1', 'Venmo')) = '42501 rally100: owner_only',
  '9.10 a leader cannot mark pay issued');
call t.login(:'OWNER');
select t.ok(t.err(format('select rally100.mark_pay_issued(%L, %L, null)', :'rw1', '2026-03-21')) = '22023 rally100: method_required'
            and t.err(format('select rally100.mark_pay_issued(%L, %L, %L)', :'rw1', '2026-03-21', '  ')) = '22023 rally100: method_required',
  '9.11 mark_pay_issued needs a method note');
select rally100.mark_pay_issued(:'rw1', '2026-03-21', 'Venmo Mar 21', 'v-123') as r \gset
select t.ok(:'r'::jsonb -> 'reward' @> '{"status":"paid","paid_on":"2026-03-21","paid_method":"Venmo Mar 21","paid_reference":"v-123","paid_by_name":"Olive Owner"}',
  '9.12 mark_pay_issued records paid with date, method, reference and who');
select t.ok(t.err(format('select rally100.mark_pay_issued(%L, %L, %L)', :'rw1', '2026-03-22', 'again')) = '22023 rally100: already_paid',
  '9.13 a second mark_pay_issued is refused: already_paid');
select t.ok(t.err(format('select rally100.mark_pay_issued(%L, null, %L)', :'rwpat', 'cash'))
              = '22023 rally100: not_approved',
  '9.14 mark_pay_issued only moves an approved reward');
call t.login(:'R2');
select t.ok((select x @> '{"status":"paid","credited":"me","paid_on":"2026-03-21","reversed":false}'
               from jsonb_array_elements(rally100.rep_state() -> 'referrals') x where x ->> 'person_id' = :'p1'),
  '9.15 the rep sees the referral as paid on the date');
call t.login(:'OWNER');
select t.ok(t.err(format('select rally100.reverse_reward(%L, null)', :'rw1')) = '22023 rally100: reason_required',
  '9.16 a reversal needs an internal reason');
select rally100.reverse_reward(:'rw1', 'paid twice by mistake (internal)', 'Paid in error') as r \gset
select t.ok(:'r'::jsonb -> 'reward' @> '{"status":"paid","reversed":true,"rep_reason":"Paid in error","reversed_reason":"paid twice by mistake (internal)"}',
  '9.17 a reversal is a flag: the record keeps its last status');
call t.login(:'R2');
select rally100.rep_state() as s \gset
select t.ok((select x @> '{"reversed":true,"rep_reason":"Paid in error"}' from jsonb_array_elements(:'s'::jsonb -> 'referrals') x
              where x ->> 'person_id' = :'p1')
            and position('internal' in :'s') = 0,
  '9.18 the rep sees the reversal and its rep-facing reason, never the internal one');
call t.login(:'L1');
select rally100.person_detail(:'p1') -> 'reward' as rr \gset
select t.ok(:'rr'::jsonb ->> 'reversed_reason' is null and (:'rr'::jsonb ->> 'reversed')::boolean,
  '9.19 a leader sees that a reward was reversed but not the owner''s internal reason');
-- correct_credit
call t.login(:'R1');
select t.ok(t.err(format('select rally100.save_entry(%L)', t.full(3010, 'Pat', 'Moss'))) = '42501 rally100: not_found',
  '9.20 (a rep cannot reuse another rep''s entry id) — not_found');
select rally100.save_entry(jsonb_build_object('id', t.e(31), 'first_name', 'Pat', 'last_name', 'Moss', 'phone', t.ph(3010),
         'handle', 'h3010', 'platform', 'Instagram')) as r \gset
call t.login(:'L1');
select t.ok(t.err(format('select rally100.correct_credit(%L, %L, %L)', :'rwpat', :'R1', 'x')) = '42501 rally100: owner_only',
  '9.21 only the owner corrects a credit');
call t.login(:'OWNER');
select t.ok(t.err(format('select rally100.correct_credit(%L, %L, null)', :'rwpat', :'R1')) = '22023 rally100: reason_required'
            and t.err(format('select rally100.correct_credit(%L, %L, %L)', :'rwpat', :'R2', 'x')) = '22023 rally100: not_candidate'
            and t.err(format('select rally100.correct_credit(%L, %L, %L)', :'rw1', :'R1', 'x')) = '22023 rally100: locked_reward',
  '9.22 correct_credit needs a reason, a rep who knows the Person, and a record not yet approved or paid');
select rally100.correct_credit(:'rwpat', :'R1', 'introduction times were wrong') as r \gset
select t.ok(:'r'::jsonb -> 'reward' @> '{"status":"ready","rep_name":"Tyler Rep"}',
  '9.23 correct_credit moves the credit with a reason on the ledger');
reset role;
-- RULE 12: nobody approves a reward credited to themselves
call t.login(:'L1');
select t.save(t.full(40, 'Lou', 'Bell')) as r \gset
select rally100.record_intro(t.e(40), 'text', 'in') as r \gset
reset role;
select t.person_of(t.e(40)) as plou \gset
call t.login(:'L1');
select t.ok(t.err(format('select rally100.confirm_intro_received(%L, %L)', :'plou', :'L1')) = '42501 rally100: self_involved',
  '9.24 a leader cannot confirm receipt of their own introduction');
call t.login(:'L2');
select rally100.confirm_intro_received(:'plou', :'L1') as r \gset
select rally100.set_requirement(:'plou', 1, true) as r \gset
select rally100.set_requirement(:'plou', 2, true) as r \gset
select rally100.set_requirement(:'plou', 3, true) as r \gset
select rally100.set_requirement(:'plou', 4, true, null, null, '2027-01-01', null, true) as r \gset
select (:'r'::jsonb -> 'reward' ->> 'id') as rwlou \gset
call t.login(:'L1');
select t.ok(t.err(format('select rally100.review_reward(%L, %L, null)', :'rwlou', 'approve')) = '42501 rally100: self_involved'
            and t.err(format('select rally100.review_reward(%L, %L, %L)', :'rwlou', 'needs_correction', 'x')) = '42501 rally100: self_involved',
  '9.25 a leader cannot approve, or return, a reward credited to themselves (self_involved)');
call t.login(:'L2');
select t.ok(rally100.review_reward(:'rwlou', 'approve', null) -> 'reward' ->> 'status' = 'approved',
  '9.26 another leader of the team can');
-- the owner's own reward: only ANOTHER owner approves it
call t.login(:'OWNER');
select t.save(t.full(50, 'Ora', 'Wynn')) as r \gset
select rally100.record_intro(t.e(50), 'text', 'in') as r \gset
reset role;
select t.person_of(t.e(50)) as pora \gset
call t.login(:'L1');
select rally100.confirm_intro_received(:'pora', :'OWNER') as r \gset
select rally100.set_requirement(:'pora', 1, true) as r \gset
select rally100.set_requirement(:'pora', 2, true) as r \gset
select rally100.set_requirement(:'pora', 3, true) as r \gset
select rally100.set_requirement(:'pora', 4, true, null, null, '2027-01-01', null, true) as r \gset
select (:'r'::jsonb -> 'reward' ->> 'id') as rwora \gset
select t.ok(t.err(format('select rally100.review_reward(%L, %L, null)', :'rwora', 'approve')) = '42501 rally100: owner_only',
  '9.27 a leader cannot approve the owner''s own reward');
call t.login(:'OWNER');
select t.ok(t.err(format('select rally100.review_reward(%L, %L, null)', :'rwora', 'approve')) = '42501 rally100: self_involved',
  '9.28 the owner cannot approve their own reward');
reset role;
insert into auth.users (id, email, raw_user_meta_data) values (:'OWNER2', 'owner2@b.test', '{"name":"Ozzie Owner"}');
update public.profiles set role = 'owner', team_id = :'TB' where id = :'OWNER2';
call t.login(:'OWNER2');
select t.ok(rally100.review_reward(:'rwora', 'approve', null) -> 'reward' ->> 'status' = 'approved',
  '9.29 another owner can');
reset role;

-- ====================================================== 10. list rewards
-- Jo reaches 100 by RESTORING an entry (99 -> 100)
call t.login(:'R3');
select t.save(t.full(3099, 'Zoe', 'Last')) as r \gset
select rally100.remove_entry(t.e(3099)) as r \gset
select t.fill_until(99, 3100) as f \gset
reset role;
select t.ok(t.count(:'R3') = 99 and not exists (select 1 from rally100.rewards where kind = 'list' and rep_id = :'R3'),
  '10.01 at 99 counted there is no list reward');
call t.login(:'R3');
select rally100.restore_entry(t.e(3099)) as r \gset
select t.ok((:'r'::jsonb ->> 'count')::int = 100 and t.has_effect(:'r'::jsonb, '{"type":"list_ready"}')
            and t.has_effect(:'r'::jsonb, '{"type":"milestone","n":100}'),
  '10.02 restoring the 100th entry creates the list reward (list_ready) and fires the 100 milestone');
select t.ok(rally100.rep_state() -> 'list_reward' = '{"status":"ready","hold":false,"amount_cents":10000,"approved_at":null,"paid_on":null,"reversed":false,"rep_reason":null,"correction_note":null}'
            and rally100.rep_state() -> 'badges' @> '["full"]',
  '10.03 the rep sees the list reward ready (no hold) and the full badge');
reset role;
select (select id from rally100.rewards where kind = 'list' and rep_id = :'R3') as rwl3 \gset
select t.ok((select string_agg(action || ':' || coalesce(to_status, ''), ',') from rally100.reward_events where reward_id = :'rwl3') = 'create:ready'
            and (select team_id from rally100.rewards where id = :'rwl3') = :'TA'::uuid,
  '10.04 the list reward is created once, at ready, by the server, for the rep''s team');
call t.login(:'R3');
select rally100.remove_entry(t.e(3100)) as r \gset
select rally100.remove_entry(t.e(3101)) as r \gset
select t.ok((rally100.rep_state() -> 'list_reward' ->> 'hold')::boolean and (rally100.rep_state() ->> 'count')::int = 98,
  '10.05 when the count drops below 100 the ready reward reads hold:true');
call t.login(:'L1');
select t.ok(t.err(format('select rally100.review_reward(%L, %L, null)', :'rwl3', 'approve')) = '22023 rally100: count_below_100',
  '10.06 approval is refused while the count is below 100 (count_below_100)');
call t.login(:'R3');
select rally100.restore_entry(t.e(3100)) as r \gset
select rally100.restore_entry(t.e(3101)) as r \gset
select t.ok(not (rally100.rep_state() -> 'list_reward' ->> 'hold')::boolean and t.n_effects(:'r'::jsonb, 'list_ready') = 0,
  '10.07 back at 100 the hold clears and nothing is created again');
reset role;
select t.ok((select count(*) from rally100.rewards where kind = 'list' and rep_id = :'R3') = 1,
  '10.08 crossing 100 a second time creates no second list reward');
call t.login(:'L1');
select t.ok(t.err(format('select rally100.review_reward(%L, %L, null)', :'rwl3', 'approve')) = '22023 rally100: spot_check_required'
            and t.err(format('select rally100.record_spot_check(%L, %L)', :'rwl3', '[]')) = '22023 rally100: no_sample',
  '10.09 approval needs a recorded spot-check (spot_check_required), and a spot-check needs a drawn sample (no_sample)');
select rally100.rep_list(:'R3') as rl \gset
select rally100.rep_list(:'R3') as rl2 \gset
select t.ok(jsonb_array_length(:'rl'::jsonb -> 'sample') = 5 and (:'rl'::jsonb ->> 'count')::int = 100
            and :'rl'::jsonb -> 'rep' = jsonb_build_object('id', :'R3', 'name', 'Jo Rep')
            and :'rl2'::jsonb -> 'sample' = :'rl'::jsonb -> 'sample'
            and (select bool_and((x ->> 'counted')::boolean) from jsonb_array_elements(:'rl'::jsonb -> 'sample') x),
  '10.10 rep_list draws five counted entries for the walkthrough and shows the SAME sample on every call');
reset role;
select t.ok((select count(*) from rally100.spot_samples where reward_id = :'rwl3') = 1
            and (select drawn_by from rally100.spot_samples where reward_id = :'rwl3') = :'L1'::uuid,
  '10.10b the sample is drawn by the server once and kept (spot_samples), not recomputed per call');
call t.login(:'L1');
select t.ok(t.err(format('select rally100.record_spot_check(%L, %L)', :'rwl3',
              jsonb_build_array(jsonb_build_object('entry_id', :'rl'::jsonb -> 'sample' -> 0 ->> 'id', 'result', 'looks_real')))) = '22023 rally100: spot_check_size'
            and t.err(format('select rally100.record_spot_check(%L, %L)', :'rwl3',
              (select jsonb_agg(jsonb_build_object('entry_id', x ->> 'id', 'result', 'looks_real')) from jsonb_array_elements(:'rl'::jsonb -> 'sample') x)
              || jsonb_build_array(jsonb_build_object('entry_id', t.e(3100), 'result', 'looks_real')))) = '22023 rally100: spot_check_size',
  '10.11 a spot-check names 3 to 5 entries');
select t.ok(t.err(format('select rally100.record_spot_check(%L, %L)', :'rwl3',
              jsonb_build_array(jsonb_build_object('entry_id', t.e(1), 'result', 'looks_real'),
                                jsonb_build_object('entry_id', :'rl'::jsonb -> 'sample' -> 0 ->> 'id', 'result', 'looks_real'),
                                jsonb_build_object('entry_id', :'rl'::jsonb -> 'sample' -> 1 ->> 'id', 'result', 'looks_real')))) = '22023 rally100: spot_check_entry'
            and t.err(format('select rally100.record_spot_check(%L, %L)', :'rwl3',
              jsonb_build_array(jsonb_build_object('entry_id', :'rl'::jsonb -> 'sample' -> 0 ->> 'id', 'result', 'meh'),
                                jsonb_build_object('entry_id', :'rl'::jsonb -> 'sample' -> 1 ->> 'id', 'result', 'looks_real'),
                                jsonb_build_object('entry_id', :'rl'::jsonb -> 'sample' -> 2 ->> 'id', 'result', 'looks_real')))) = '22023 rally100: invalid_result'
            and t.err(format('select rally100.record_spot_check(%L, %L)', :'rwl3',
              jsonb_build_array(jsonb_build_object('entry_id', :'rl'::jsonb -> 'sample' -> 0 ->> 'id', 'result', 'looks_real'),
                                jsonb_build_object('entry_id', :'rl'::jsonb -> 'sample' -> 0 ->> 'id', 'result', 'looks_real'),
                                jsonb_build_object('entry_id', :'rl'::jsonb -> 'sample' -> 1 ->> 'id', 'result', 'looks_real')))) = '22023 rally100: spot_check_entry',
  '10.12 spot-check entries must be that rep''s counted entries, once each, with a valid result');
select t.ok(t.err(format('select rally100.record_spot_check(%L, %L)', :'rwl3',
              jsonb_build_array(jsonb_build_object('entry_id',
                                  (select y ->> 'id' from jsonb_array_elements(:'rl'::jsonb -> 'entries') y
                                    where (y ->> 'counted')::boolean
                                      and not ((:'rl'::jsonb -> 'sample') @> jsonb_build_array(jsonb_build_object('id', y ->> 'id')))
                                    limit 1), 'result', 'looks_real'),
                                jsonb_build_object('entry_id', :'rl'::jsonb -> 'sample' -> 0 ->> 'id', 'result', 'looks_real'),
                                jsonb_build_object('entry_id', :'rl'::jsonb -> 'sample' -> 1 ->> 'id', 'result', 'looks_real'))))
              = '22023 rally100: spot_check_entry',
  '10.12b a counted entry the server did NOT sample is refused: the rep cannot steer the spot-check');
call t.login(:'LB');
select t.ok(t.err(format('select rally100.record_spot_check(%L, %L)', :'rwl3', '[]')) = '42501 rally100: not_found'
            and t.err(format('select rally100.rep_list(%L)', :'R3')) = '42501 rally100: not_found',
  '10.13 a leader of another team can neither spot-check nor list this rep');
call t.login(:'L1');
select rally100.record_spot_check(:'rwl3',
         (select jsonb_agg(jsonb_build_object('entry_id', x ->> 'id', 'result', case when n = 1 then 'unclear' else 'looks_real' end))
            from jsonb_array_elements(:'rl'::jsonb -> 'sample') with ordinality s(x, n) where n <= 3),
         'walked through in person') as r \gset
select t.ok((:'r'::jsonb -> 'reward' ->> 'spot_checked')::boolean
            and :'r'::jsonb -> 'reward' -> 'spot_check' ->> 'by_name' = 'Dana Lead',
  '10.14 the spot-check is recorded on the reward');
reset role;
select t.ok((select count(*) from rally100.entries where rep_id = :'R3' and verified_by = :'L1') = 2,
  '10.15 looks_real marks the entry verified; unclear does not');
call t.login(:'L1');
select rally100.rep_list(:'R3') as rl3 \gset
reset role;
select t.ok((select count(*) from rally100.spot_samples where reward_id = :'rwl3') = 2
            and rally100._current_sample(:'rwl3'::uuid) is not null,
  '10.15b recording a spot-check uses the sample up: the next walkthrough draws a fresh one');
call t.login(:'L1');
select rally100.review_reward(:'rwl3', 'approve', null) as r \gset
select t.ok(:'r'::jsonb -> 'reward' ->> 'status' = 'approved', '10.16 count >= 100 plus a spot-check: approved');
select t.ok(rally100.rep_list(:'R3') -> 'sample' = '[]',
  '10.16b once the list reward is approved there is no sample to walk through');
-- Sam jumps from 99 to 101 in ONE save
reset role;
call t.login(:'R2');
select rally100.save_entry(jsonb_build_object('id', t.e(2098), 'first_name', 'Dee', 'phone', t.ph(2098))) as r \gset
select t.fill_until(99, 2100) as f \gset
select rally100.save_entry(jsonb_build_object('id', t.e(2099), 'first_name', 'Yan', 'last_name', 'Held', 'phone', t.ph(2098),
         'handle', 'yanheld', 'platform', 'X')) as r \gset
select t.ok(:'r'::jsonb -> 'entry' ->> 'held_of' = t.e(2098)::text and (:'r'::jsonb ->> 'count')::int = 99,
  '10.17 (setup) Sam is at 99 with a complete entry held behind an older draft');
select rally100.save_entry(jsonb_build_object('id', t.e(2098), 'last_name', 'Dunn', 'phone', t.ph(2097),
         'handle', 'deedunn', 'platform', 'X')) as r \gset
select t.ok((:'r'::jsonb ->> 'count')::int = 101 and t.n_effects(:'r'::jsonb, 'list_ready') = 1
            and t.has_effect(:'r'::jsonb, '{"type":"milestone","n":100}'),
  '10.18 one save takes the count from 99 to 101 (the draft completes and releases the held entry): one list reward');
select rally100.remove_entry(t.e(2100)) as r \gset
select rally100.remove_entry(t.e(2101)) as r \gset
select t.save(t.full(2500, 'New', 'One')) as r \gset
select t.save(t.full(2501, 'New', 'Two')) as r \gset
select t.ok(t.n_effects(:'r'::jsonb, 'list_ready') = 0, '10.19 dipping under 100 and passing it again creates nothing');
reset role;
select t.ok((select count(*) from rally100.rewards where kind = 'list' and rep_id = :'R2') = 1,
  '10.20 Sam still has exactly one list reward');
-- the one-per rules hold against the table owner itself
select t.ok(t.err(format($$insert into rally100.rewards (kind, team_id, rep_id, amount_cents, status) values ('list', %L, %L, 10000, 'ready')$$, :'TA', :'R3'))
              like '23505 %',
  '10.21 a second list reward for a rep is refused by the unique index, even inserted directly by the table owner');
select t.ok(t.err(format($$insert into rally100.rewards (kind, team_id, person_id, amount_cents, status) values ('referral', %L, %L, 10000, 'in_progress')$$, :'TA', :'p1'))
              like '23505 %',
  '10.22 a second referral reward for a Person is refused by the unique index, even inserted directly by the table owner');
select t.ok(t.err(format($$insert into rally100.rewards (kind, team_id, person_id, amount_cents, status) values ('referral', %L, %L, 10000, 'ready')$$, :'TA', :'p1'))
              like '23514 %',
  '10.23 nothing reaches ready without a credited rep (check constraint)');

-- ================================================= 11. incentives
call t.login(:'OWNER');
select t.ok(t.err($$select rally100.incentive_save('{"prize_cents":100}')$$) = '22023 rally100: name_required'
            and t.err(format('select rally100.incentive_save(%L)', jsonb_build_object('name', repeat('n', 81), 'prize_cents', 1))) = '22023 rally100: name_too_long'
            and t.err($$select rally100.incentive_save('{"name":"Top"}')$$) = '22023 rally100: prize_required'
            and t.err($$select rally100.incentive_save('{"name":"Top","prize_cents":-1}')$$) = '22023 rally100: invalid_prize'
            and t.err($$select rally100.incentive_save('{"name":"Top","prize_cents":1.5}')$$) = '22023 rally100: invalid_prize'
            and t.err($$select rally100.incentive_save('{"name":"Top","prize_cents":"100"}')$$) = '22023 rally100: invalid_prize',
  '11.01 an incentive needs a name of at most 80 and a whole, non-negative prize in cents');
select t.ok(t.err(format('select rally100.incentive_save(%L)', jsonb_build_object('name', 'Top', 'prize_cents', 100,
              'pictures', (select jsonb_agg('data:image/jpeg;base64,QUJD'::text) from generate_series(1, 5))))) = '22023 rally100: too_many_pictures'
            and t.err(format('select rally100.incentive_save(%L)', jsonb_build_object('name', 'Top', 'prize_cents', 100,
              'pictures', jsonb_build_array('data:image/jpeg;base64,' || repeat('A', 400000 - 22))))) = '22023 rally100: picture_too_large'
            and t.err(format('select rally100.incentive_save(%L)', jsonb_build_object('name', 'Top', 'prize_cents', 100,
              'pictures', jsonb_build_array('data:image/svg+xml;base64,PHN2Zz4=')))) = '22023 rally100: invalid_picture'
            and t.err($$select rally100.incentive_save('{"name":"Top","prize_cents":100,"status":"published"}')$$) = '22023 rally100: picture_required',
  '11.02 pictures: at most 4, each at most 400,000 characters, JPEG data URLs only, and at least one to publish');
select rally100.incentive_save(jsonb_build_object('name', 'Top rookie', 'prize_cents', 5000,
         'pictures', jsonb_build_array('data:image/jpeg;base64,' || repeat('A', 400000 - 23)))) as r \gset
select t.ok(:'r'::jsonb -> 'incentive' @> '{"name":"Top rookie","prize_cents":5000,"status":"draft"}'
            and length(:'r'::jsonb -> 'incentive' -> 'pictures' ->> 0) = 400000,
  '11.03 a picture of exactly 400,000 characters is accepted; a new incentive starts as a draft');
select (:'r'::jsonb -> 'incentive' ->> 'id') as inc \gset
call t.login(:'L1');
select t.ok(t.err(format('select rally100.award_incentive(%L, %L, %L, %L)', :'inc', :'R1', 'x', gen_random_uuid())) = '22023 rally100: not_published',
  '11.04 a draft incentive cannot be awarded');
call t.login(:'OWNER');
select rally100.incentive_status(:'inc', 'published') as r \gset
call t.login(:'R1');
select t.ok((select count(*) from jsonb_array_elements(rally100.rep_state() -> 'incentives') x where x ->> 'id' = :'inc') = 1,
  '11.05 reps see published incentives');
call t.login(:'L1');
select t.ok(t.err(format('select rally100.award_incentive(%L, %L, null, %L)', :'inc', :'R1', gen_random_uuid())) = '22023 rally100: note_required'
            and t.err(format('select rally100.award_incentive(%L, %L, %L, %L)', :'inc', :'L1', 'me', gen_random_uuid())) = '42501 rally100: self_involved'
            and t.err(format('select rally100.award_incentive(%L, %L, %L, %L)', :'inc', :'RB', 'x', gen_random_uuid())) = '42501 rally100: not_found'
            and t.err(format('select rally100.award_incentive(%L, %L, %L, null)', :'inc', :'R1', 'x')) = '22023 rally100: request_required',
  '11.06 an award needs a note and a request id, never goes to yourself, and only to reps in scope');
select rally100.award_incentive(:'inc', :'R1', 'best week', 'a0000000-0000-4000-8000-000000000001') as r \gset
select t.ok(:'r'::jsonb -> 'reward' @> '{"kind":"incentive","status":"approved","amount_cents":5000,"approved_by_name":"Dana Lead","incentive_name":"Top rookie"}',
  '11.07 award_incentive creates an approved incentive reward for the prize amount');
call t.login(:'OWNER');
select rally100.incentive_save(jsonb_build_object('id', :'inc', 'prize_cents', 7500)) as r \gset
select t.ok(:'r'::jsonb -> 'incentive' @> '{"name":"Top rookie","prize_cents":7500,"status":"published"}',
  '11.08 incentive_save updates only the keys it is given');
call t.login(:'R1');
select t.ok((select x ->> 'amount_cents' from jsonb_array_elements(rally100.rep_state() -> 'awards') x) = '5000',
  '11.09 a prize change applies only to later awards: the earlier award keeps its amount');
call t.login(:'OWNER');
select rally100.incentive_status(:'inc', 'off') as r \gset
call t.login(:'R1');
select t.ok((select count(*) from jsonb_array_elements(rally100.rep_state() -> 'incentives') x where x ->> 'id' = :'inc') = 0,
  '11.10 turning an incentive off hides it from reps');

-- ============================================ 12. leaving reps (rule 13)
call t.login(:'OWNER');
select rally100.incentive_status(:'inc', 'published') as r \gset
call t.login(:'L1');
select rally100.award_incentive(:'inc', :'R2', 'top seller', gen_random_uuid()) -> 'reward' ->> 'id' as aw_paid \gset
select rally100.award_incentive(:'inc', :'R2', 'top recruiter', gen_random_uuid()) -> 'reward' ->> 'id' as aw_open \gset
call t.login(:'OWNER');
select rally100.mark_pay_issued(:'aw_paid', '2026-04-01', 'payroll 4/1') as r \gset
call t.login(:'L1');
select t.ok(t.err(format('select rally100.close_rep_unpaid(%L, %L)', :'R2', 'left')) = '42501 rally100: owner_only',
  '12.01 only the owner closes a leaving rep''s rewards');
call t.login(:'OWNER');
select t.ok(t.err(format('select rally100.close_rep_unpaid(%L, %L)', :'R2', 'quit')) = '22023 rally100: invalid_reason',
  '12.02 the reason is left or no_show');
select rally100.close_rep_unpaid(:'R2', 'no_show') as r \gset
reset role;
select t.ok(:'r'::jsonb = '{"closed": 2}',
  '12.03 close_rep_unpaid answers with the number closed and nothing else');
select t.ok((select reversed_at is null and status = 'paid' from rally100.rewards where id = :'aw_paid')
            and (select reversed_reason = 'no_show' and rep_reason = '' from rally100.rewards where id = :'aw_open')
            and (select reversed_reason = 'no_show' from rally100.rewards where kind = 'list' and rep_id = :'R2')
            and (select reversed_reason <> 'no_show' from rally100.rewards where id = :'rw1'),
  '12.04 it reversed every UNPAID reward of the rep with the internal reason; paid and already-reversed ones are untouched');
call t.login(:'R2');
select rally100.rep_state() as s \gset
select t.ok(position('no_show' in :'s') = 0 and position('left' in lower(:'s')) = 0
            and :'s'::jsonb -> 'list_reward' @> '{"reversed":true,"rep_reason":""}',
  '12.05 nothing about the rule reaches the rep: no internal reason, no rep-facing reason');
reset role;

-- ================================================= 13. outcomes and stages
call t.login(:'R1');
select t.save(t.full(60, 'Gus', 'Hill')) as r \gset
select rally100.record_intro(t.e(60), 'text', 'maybe') as r \gset
reset role;
select t.person_of(t.e(60)) as pgus \gset
call t.login(:'L1');
select rally100.schedule_meeting(:'pgus', '2026-03-06 16:00-07', 'video', 'first chat') as r \gset
select t.ok(:'r'::jsonb -> 'person' @> '{"stage":"meeting_scheduled","meeting_how":"video"}'
            and (select count(*) from jsonb_array_elements(rally100.team_state() -> 'queues' -> 'meetings') x
                  where x ->> 'person_id' = :'pgus') = 1,
  '13.01 schedule_meeting sets the meeting and stage meeting_scheduled; it shows in the meetings queue');
call t.login(:'R1');
select t.ok(t.err(format('select rally100.set_follow_up(%L, %L)', t.e(60), '2026-04-10')) = '22023 rally100: stage_locked',
  '13.02 a rep cannot set Follow up later once the leader owns the stage');
call t.login(:'L1');
select t.ok(t.err(format('select rally100.set_stage(%L, %L)', :'pgus', 'introduced')) = '22023 rally100: reason_required'
            and t.err(format('select rally100.set_stage(%L, %L)', :'pgus', 'galaxy')) = '22023 rally100: invalid_stage',
  '13.03 a backward stage move needs a reason; the stage must exist');
select rally100.set_stage(:'pgus', 'meeting_completed', '2026-03-06', null) as r \gset
select t.ok(:'r'::jsonb -> 'person' @> '{"stage":"meeting_completed","confirmed_count":0}',
  '13.04 a leader moves the stage forward; a stage change ticks no requirement');
select rally100.set_stage(:'pgus', 'introduced', null, 'meeting never happened') as r \gset
select t.ok(t.err(format('select rally100.set_stage(%L, %L, null, null)', :'pgus', 'meeting_completed')) = 'ok'
            and t.err(format('select rally100.set_stage(%L, %L, null, %L)', :'pgus', 'intro_planned', 'back')) = 'ok'
            and t.err(format('select rally100.set_stage(%L, %L)', :'pgus', 'introduced')) = '22023 rally100: invalid_stage',
  '13.05 a leader may move a Person back with a reason, but never forward into a stage the rep sets');
select t.ok(t.err(format('select rally100.set_outcome(%L, %L)', :'pgus', 'follow_up')) = '22023 rally100: date_required'
            and t.err(format('select rally100.set_outcome(%L, %L)', :'pgus', 'not_interested')) = '22023 rally100: note_required'
            and t.err(format('select rally100.set_outcome(%L, %L)', :'pgus', 'ghosted')) = '22023 rally100: invalid_outcome',
  '13.06 follow_up needs a date, not_interested a note, and the outcome must exist');
reset role;
select t.count(:'R1') as c_r1 \gset
call t.login(:'L1');
select rally100.set_outcome(:'pgus', 'not_interested', null, 'said no thanks') as r \gset
reset role;
select t.ok(t.count(:'R1') = :c_r1 and (select interest from rally100.persons where id = :'pgus') = 'not_interested',
  '13.07 Not interested still counts (and records the interest)');
call t.login(:'R1');
select t.ok(t.err(format('select rally100.set_follow_up(%L, %L)', t.e(60), '2026-04-10')) = '22023 rally100: outcome_locked',
  '13.08 a rep cannot overwrite a leader''s Not interested');
-- DO NOT CONTACT removes the Person from every rep's count
reset role;
select t.count(:'R1') as c1, t.count(:'R2') as c2, t.count(:'RB') as cb, t.xp(:'R1') as x1 \gset
call t.login(:'L1');
select rally100.set_outcome(:'p1', 'do_not_contact', null, null) as r \gset
reset role;
select t.ok(t.count(:'R1') = :c1 - 1 and t.count(:'R2') = :c2 - 1 and t.count(:'RB') = :cb - 1,
  '13.09 Do not contact removes the Person from the count of EVERY rep who has them, across teams');
call t.login(:'R1');
select t.ok((select x @> '{"dnc":true,"counted":false}' from jsonb_array_elements(rally100.rep_state() -> 'entries') x
              where x ->> 'id' = t.e(1)::text)
            and t.err(format('select rally100.plan_intro(%L)', t.e(1))) = '22023 rally100: do_not_contact'
            and t.err(format('select rally100.set_follow_up(%L, %L)', t.e(1), '2026-05-01')) = '22023 rally100: do_not_contact',
  '13.10 the rep''s entry reads dnc, uncounted, and no introduction action is possible');
call t.login(:'L1');
select t.ok(t.err(format('select rally100.set_outcome(%L, null)', :'p1')) = '42501 rally100: owner_only'
            and t.err(format('select rally100.set_outcome(%L, %L, %L)', :'p1', 'follow_up', '2026-05-01')) = '42501 rally100: owner_only',
  '13.11 only the owner clears (or replaces) Do not contact');
call t.login(:'OWNER');
select rally100.clear_dnc(:'p1') as r \gset
reset role;
select t.ok(t.count(:'R1') = :c1 and t.count(:'R2') = :c2 and t.count(:'RB') = :cb and t.xp(:'R1') = :x1,
  '13.12 clear_dnc counts the Person again for every rep, and re-grants no XP');
-- a no_show rep's state was settled too: still exactly one list reward
select t.ok((select count(*) from rally100.rewards where kind = 'list' and rep_id = :'R2') = 1,
  '13.13 settling counts after a do-not-contact change never creates a second list reward');
call t.login(:'R1');
select t.save(t.full(61, 'Hana', 'Ito')) as r \gset
select r::jsonb -> 'entry' ->> 'person_id' as phana from (select :'r' as r) x \gset
select t.ok(t.err(format('select rally100.set_follow_up(%L, %L)', t.e(61), '2026-01-01')) = '22023 rally100: intro_required',
  '13.13b Follow up later belongs to the rep''s own introduction: none planned yet is intro_required');
select rally100.plan_intro(t.e(61)) as r \gset
select rally100.set_follow_up(t.e(61), '2026-01-01', 'after finals') -> 'intro' as r \gset
select t.ok(:'r'::jsonb @> '{"outcome":"follow_up","outcome_date":"2026-01-01","stage":"intro_planned","next":null}',
  '13.14 a rep sets Follow up later on their own planned introduction before handoff; the outcome clears the next step');
call t.login(:'L1');
select t.ok((select count(*) from jsonb_array_elements(rally100.team_state() -> 'queues' -> 'follow_ups') x
              where x ->> 'person_id' = :'phana') = 1,
  '13.15 a due follow-up appears in the leader''s follow_ups queue');
reset role;

-- ================================================ 14. messages, notes, next
call t.login(:'R1');
select t.ok(t.err(format('select rally100.tell_leader(%L, %L)', t.e(61), '  ')) = '22023 rally100: note_required'
            and t.err(format('select rally100.tell_leader(%L, %L)', t.e(61), repeat('x', 1001))) = '22023 rally100: too_long'
            and t.err(format('select rally100.tell_leader(%L, %L)', t.e(4), 'x')) = '22023 rally100: entry_not_complete',
  '14.01 tell_leader needs 1 to 1000 characters and a contact linked to a Person');
select rally100.tell_leader(t.e(61), 'She changed her number') as r \gset
call t.login(:'L1');
select t.ok((select count(*) from jsonb_array_elements(rally100.team_state() -> 'queues' -> 'messages') x
              where x ->> 'body' = 'She changed her number' and x ->> 'rep_name' = 'Tyler Rep') = 1,
  '14.02 the message reaches the leader''s messages queue');
select rally100.mark_messages_read(:'phana') as r \gset
select t.ok((select count(*) from jsonb_array_elements(rally100.team_state() -> 'queues' -> 'messages') x
              where x ->> 'body' = 'She changed her number') = 0,
  '14.03 mark_messages_read clears it from the queue');
select rally100.add_note(:'pgus', 'Call after 5pm') as a1 \gset
select t.ok(t.err(format('select rally100.add_note(%L, %L)', :'pgus', '')) = '22023 rally100: note_required'
            and :'a1' = '{"ok": true}'
            and rally100.person_detail(:'pgus') -> 'notes' -> 0 @> '{"author_name":"Dana Lead","body":"Call after 5pm"}',
  '14.04 add_note appends an authored note to the Person');
select t.ok(t.err(format('select rally100.set_next_action(%L, %L, %L)', :'pgus', 'call', :'RB')) = '42501 rally100: not_found'
            and rally100.set_next_action(:'pgus', 'Dana calls Gus', :'L1', '2026-03-10') = '{"ok": true}',
  '14.05 a next action''s owner must be someone in scope');
select t.ok(t.err(format('select rally100.set_interest(%L, %L)', :'pgus', 'meh')) = '22023 rally100: invalid_interest',
  '14.06 interest must be one of the four values');
reset role;

-- ========================================================= 15. scope
call t.login(:'R2');
select t.ok(t.err(format('select rally100.save_entry(%L)', jsonb_build_object('id', t.e(1), 'first_name', 'Hacked'))) = '42501 rally100: not_found'
            and t.err(format('select rally100.remove_entry(%L)', t.e(1))) = '42501 rally100: not_found'
            and t.err(format('select rally100.restore_entry(%L)', t.e(15))) = '42501 rally100: not_found'
            and t.err(format('select rally100.plan_intro(%L)', t.e(12))) = '42501 rally100: not_found'
            and t.err(format('select rally100.record_intro(%L, %L, %L)', t.e(12), 'text', 'in')) = '42501 rally100: not_found'
            and t.err(format('select rally100.set_follow_up(%L, %L)', t.e(12), '2026-05-01')) = '42501 rally100: not_found'
            and t.err(format('select rally100.tell_leader(%L, %L)', t.e(12), 'hi')) = '42501 rally100: not_found'
            and t.err(format('select rally100.resolve_duplicate(%L, %L)', t.e(16), 'same')) = '42501 rally100: not_found',
  '15.01 a rep guessing another rep''s entry UUID is refused by every rep function (not_found)');
select t.ok(t.err(format('select rally100.remove_entry(%L)', 'e0000000-0000-4000-8000-999999999999')) = '42501 rally100: not_found',
  '15.02 an id that does not exist reads exactly the same: not_found');
reset role;
select t.ok((select first_name from rally100.entries where id = t.e(1)) = 'Marcus' and (select removed_at from rally100.entries where id = t.e(1)) is null,
  '15.03 the other rep''s entry was not touched');
call t.login(:'R2');
select rally100.rep_state() as s \gset
select t.ok(position(t.e(1)::text in :'s') = 0 and position('Tyler' in :'s') = 0 and position('marcus.lee' in :'s') = 0
            and position('Pat' in :'s') = 0,
  '15.04 rep_state holds nothing of another rep''s list');
call t.login(:'LB');
select rally100.team_state() as ts \gset
select t.ok((select string_agg(x ->> 'name', ',' order by x ->> 'name') from jsonb_array_elements(:'ts'::jsonb -> 'reps') x) = 'Bo LeadB,Max RepB,Ozzie Owner'
            and position('Tyler' in :'ts') = 0 and position('Pat Moss' in :'ts') = 0,
  '15.05 a team B leader''s team_state holds team B only');
select t.ok(t.err(format('select rally100.person_detail(%L)', :'pgus')) = '42501 rally100: not_found'
            and t.err(format('select rally100.set_stage(%L, %L)', :'pgus', 'arrived')) = '42501 rally100: not_found'
            and t.err(format('select rally100.add_note(%L, %L)', :'pgus', 'x')) = '42501 rally100: not_found'
            and t.err(format('select rally100.set_outcome(%L, %L)', :'pgus', 'do_not_contact')) = '42501 rally100: not_found'
            and t.err(format('select rally100.rep_list(%L)', :'R1')) = '42501 rally100: not_found'
            and t.err(format('select rally100.confirm_intro_received(%L, %L)', :'p1', :'R1')) = '42501 rally100: not_found'
            and t.err(format('select rally100.review_reward(%L, %L)', :'rwl3', 'approve')) = '42501 rally100: not_found',
  '15.06 a team B leader cannot read or act on team A''s Persons, reps or rewards');
select rally100.person_detail(:'p1') as pd \gset
select t.ok((select count(*) from jsonb_array_elements(:'pd'::jsonb -> 'entries') x where x = '{"rep_name":"A rep on another team"}') = 2
            and (select count(*) from jsonb_array_elements(:'pd'::jsonb -> 'entries') x where x ->> 'rep_name' = 'Max RepB') = 1
            and :'pd'::jsonb -> 'reward' = 'null'
            and position(:'R1' in :'pd') = 0 and position(:'R2' in :'pd') = 0 and position('Tyler' in :'pd') = 0
            and position('Sam Rep' in :'pd') = 0,
  '15.07 on a shared Person a team B leader sees team A reps only as "A rep on another team" (no name, id or date) and not the reward credited to team A');
call t.login(:'OWNER');
select rally100.team_state() as ts \gset
select t.ok((select count(*) from jsonb_array_elements(:'ts'::jsonb -> 'reps') x where x ->> 'name' in ('Tyler Rep', 'Max RepB')) = 2
            and (select count(*) from jsonb_array_elements(rally100.person_detail(:'p1') -> 'entries') x where x ? 'rep_id') = 3,
  '15.08 the owner sees every team and every rep by name');
reset role;

-- =================================================== 16. persons: merge
call t.login(:'R2');
select t.save(jsonb_build_object('id', t.e(2601), 'first_name', 'Nina', 'last_name', 'Ray', 'phone', t.ph(601), 'handle', 'ninar', 'platform', 'X')) as r \gset
select rally100.record_intro(t.e(2601), 'text', 'in') as r \gset
call t.login(:'R3');
select t.save(jsonb_build_object('id', t.e(3601), 'first_name', 'Nina', 'last_name', 'Fox', 'phone', t.ph(601), 'handle', 'ninaf', 'platform', 'X')) as r \gset
select rally100.record_intro(t.e(3601), 'text', 'in') as r \gset
reset role;
select (select id from rally100.possible_matches where person_b = t.person_of(t.e(3601))) as mnina \gset
call t.login(:'LB');
select t.ok(t.err(format('select rally100.link_persons(%L, %L)', :'mnina', 'link')) = '42501 rally100: not_found',
  '16.01 a leader who cannot see both Persons cannot resolve their match');
call t.login(:'L1');
select t.ok((select count(*) from jsonb_array_elements(rally100.team_state() -> 'queues' -> 'matches') x where x ->> 'id' = :'mnina') = 1
            and t.err(format('select rally100.link_persons(%L, %L)', :'mnina', 'link')) = '22023 rally100: both_have_rewards',
  '16.02 the match is in the leader''s queue; linking two Persons that both have a referral reward is refused');
-- a match to dismiss
call t.login(:'R1');
select t.save(jsonb_build_object('id', t.e(70), 'first_name', 'Oli', 'last_name', 'Vance', 'handle', 'oli', 'platform', 'TikTok')) as r \gset
call t.login(:'R3');
select t.save(jsonb_build_object('id', t.e(3701), 'first_name', 'Oli', 'last_name', 'Grant', 'handle', '@OLI', 'platform', 'TikTok')) as r \gset
reset role;
select (select id from rally100.possible_matches where person_b = t.person_of(t.e(3701)) and signal = 'handle') as moli \gset
call t.login(:'L1');
select rally100.link_persons(:'moli', 'dismiss') as r \gset
select t.ok(t.err(format('select rally100.link_persons(%L, %L)', :'moli', 'link')) = '22023 rally100: match_closed'
            and rally100.link_persons(:'moli', 'dismiss') = '{"ok": true}',
  '16.03 a dismissed match cannot be linked; dismissing again is a no-op');
-- B has the reward, A does not: B survives
call t.login(:'R1');
select t.save(jsonb_build_object('id', t.e(71), 'first_name', 'Remy', 'last_name', 'Lo', 'phone', t.ph(71), 'handle', 'remylo', 'platform', 'X')) as r \gset
call t.login(:'R3');
select t.save(jsonb_build_object('id', t.e(3711), 'first_name', 'Remy', 'last_name', 'Ko', 'phone', t.ph(71), 'handle', 'remyko', 'platform', 'X')) as r \gset
select rally100.record_intro(t.e(3711), 'call', 'in') as r \gset
reset role;
select t.person_of(t.e(71)) as pa, t.person_of(t.e(3711)) as pb,
       (select id from rally100.possible_matches where person_a = t.person_of(t.e(71)) and person_b = t.person_of(t.e(3711))) as mremy \gset
select t.count(:'R1') as c1 \gset
call t.login(:'L1');
select rally100.link_persons(:'mremy', 'link') as r \gset
reset role;
select t.ok((select merged_into from rally100.persons where id = :'pa') = :'pb'::uuid
            and t.person_of(t.e(71)) = :'pb' and t.person_of(t.e(3711)) = :'pb'
            and (select count(*) from rally100.person_identifiers where person_id = :'pb') = 3
            and (select status from rally100.possible_matches where id = :'mremy') = 'linked'
            and (select count(*) from rally100.persons where id = :'pa') = 1,
  '16.04 link merges into the Person that has the reward: entries and identifiers move, the other is kept as an alias');
select t.ok(t.count(:'R1') = :c1 and (select count(*) from rally100.rewards where kind = 'referral' and person_id in (:'pa', :'pb')) = 1,
  '16.05 the merge moves no count and creates no reward');
select t.ok(t.err(format($$insert into rally100.rewards (kind, team_id, person_id, amount_cents, status) values ('referral', %L, %L, 10000, 'in_progress')$$, :'TA', :'pb'))
              like '23505 %',
  '16.06 the survivor still refuses a second referral record');
-- a merge that leaves one rep with two entries on one human holds the newer
call t.login(:'R1');
select t.save(jsonb_build_object('id', t.e(72), 'first_name', 'Uma', 'last_name', 'Vale', 'phone', t.ph(72), 'handle', 'umav', 'platform', 'X')) as r \gset
select t.save(jsonb_build_object('id', t.e(73), 'first_name', 'Uma', 'last_name', 'Vale', 'phone', t.ph(73), 'handle', 'umavale', 'platform', 'Snapchat')) as r \gset
call t.login(:'R3');
select t.save(jsonb_build_object('id', t.e(3721), 'first_name', 'Uma', 'last_name', 'Bloom', 'phone', t.ph(72), 'handle', 'umavale', 'platform', 'Snapchat')) as r \gset
reset role;
select t.count(:'R1') as c1 \gset
-- the Bloom record shares both signals with two different Vale Persons; link the Vales by hand
insert into rally100.possible_matches (person_a, person_b, signal) values (t.person_of(t.e(72)), t.person_of(t.e(73)), 'phone') returning id as muma \gset
call t.login(:'L1');
select rally100.link_persons(:'muma', 'link') as r \gset
reset role;
select t.ok((select held_of from rally100.entries where id = t.e(73)) = t.e(72) and t.count(:'R1') = :c1 - 1,
  '16.07 when a merge leaves one rep with two entries on one Person, the newer is held: one human counts once');

-- ========================================== 17. append-only and history
select t.ok(t.err('update rally100.audit set action = ''x''') = '42501 rally100: append_only'
            and t.err('delete from rally100.audit') = '42501 rally100: append_only'
            and t.err('truncate rally100.audit') = '42501 rally100: append_only'
            and t.err('update rally100.reward_events set note = ''x''') = '42501 rally100: append_only'
            and t.err('delete from rally100.reward_events') = '42501 rally100: append_only'
            and t.err('truncate rally100.reward_events') = '42501 rally100: append_only'
            and t.err('update rally100.xp_events set points = 1000') = '42501 rally100: append_only'
            and t.err('delete from rally100.notes') = '42501 rally100: append_only',
  '17.01 the audit log, the reward ledger, XP and notes refuse UPDATE, DELETE and TRUNCATE even from the table owner');
select t.ok((select array_agg(a order by a) from (
    select distinct action as a from rally100.audit
     where action in ('entry_created','entry_updated','entry_removed','entry_restored','entry_merged','entry_kept_both',
                      'person_created','intro_planned','intro_recorded','intro_received','requirement_confirmed',
                      'requirement_unticked','stage','meeting','outcome','set_interest','next_action','note','message',
                      'messages_read','spot_check','approve','needs_correction','resolve_correction','pay_issued',
                      'reverse','close_unpaid','correct_credit','award','incentive_created','incentive_updated',
                      'incentive_status','ack_accepted','badge','person_merged','match_dismissed','reward_created',
                      'reward_ready','follow_up','sample_drawn')) x) =
  (select array_agg(v order by v) from unnest(array['ack_accepted','approve','award','badge','close_unpaid','correct_credit','entry_created','entry_kept_both',
        'entry_merged','entry_removed','entry_restored','entry_updated','incentive_created','incentive_status',
        'incentive_updated','intro_planned','intro_recorded','intro_received','match_dismissed','meeting',
        'message','messages_read','needs_correction','next_action','note','outcome','pay_issued','person_created',
        'person_merged','requirement_confirmed','requirement_unticked','resolve_correction','reverse',
        'reward_created','reward_ready','set_interest','spot_check','stage','follow_up','sample_drawn']) v),
  '17.02 every kind of write left its audit row');
select t.ok((select array_agg(distinct action order by action) from rally100.reward_events)
  = (select array_agg(v order by v) from unnest(array['approve','award','close_unpaid','correct_credit','create','credit',
          'flag_no_intro','needs_correction','pay','resolve_correction','reverse','spot_check','untick']) v),
  '17.03 every reward transition left its ledger row');
select t.ok(not exists (select 1 from rally100.audit where actor is not null and team_id is null and entity <> 'rep'),
  '17.04 audit rows carry the actor''s team');
call t.login(:'L1');
select rally100.person_detail(:'p1') -> 'history' as h \gset
select t.ok(jsonb_array_length(:'h'::jsonb) between 1 and 100
            and (:'h'::jsonb -> 0 ->> 'at') >= (:'h'::jsonb -> -1 ->> 'at'),
  '17.05 person_detail history is newest first, at most 100 rows');
reset role;

-- ================================================ 18. owner read models
select (select count(*) from rally100.persons where merged_into is null) as npersons,
       (select count(*) from rally100.rewards) as nrewards \gset
call t.login(:'OWNER');
select rally100.owner_state() as os \gset
select t.ok((:'os'::jsonb -> 'totals' ->> 'persons')::int = :npersons
            and (:'os'::jsonb -> 'funnel') ?& array['added','intro_planned','introduced','meeting_scheduled','meeting_completed',
                                                   'commitment_confirmed','agreement_signed','start_confirmed','arrived']
            and (:'os'::jsonb -> 'rewards' -> 'paid' ->> 'count')::int >= 1
            and (select count(*) from jsonb_array_elements(:'os'::jsonb -> 'reps') x where x ? 'team_name') = jsonb_array_length(:'os'::jsonb -> 'reps')
            and (select count(*) from jsonb_array_elements(:'os'::jsonb -> 'pending_signups') x where x ->> 'email' = 'newbie@x.test') = 1,
  '18.01 owner_state: totals, funnel, reward totals, reps with team names and pending signups');
select t.ok((select bool_and(x ->> 'status' = 'paid') from jsonb_array_elements(rally100.owner_rewards('paid') -> 'rows') x)
            and jsonb_array_length(rally100.owner_rewards(null) -> 'rows') = :nrewards
            and t.err($$select rally100.owner_rewards('bogus')$$) = '22023 rally100: invalid_status',
  '18.02 owner_rewards filters by status, or returns every reward');
select t.ok((select x @> '{"phone":"8015550101","stage":"introduced"}' from jsonb_array_elements(rally100.owner_contacts() -> 'rows') x
              where x ->> 'person_id' = :'p1')
            and (select jsonb_array_length(x -> 'reps') from jsonb_array_elements(rally100.owner_contacts() -> 'rows') x
                  where x ->> 'person_id' = :'p1') = 3,
  '18.03 owner_contacts lists every Person with phone, stage and every rep who knows them');
reset role;

-- ============================== 19. the security review and integration fixes
-- A shared Person, Xavi: Tyler (team A) has him complete, Max (team B) as a draft.
\set CAP '00000000-0000-4000-8000-000000000012'
call t.login(:'R1');
select t.save(t.full(701, 'Xavi', 'Stone')) as r \gset
call t.login(:'RB');
select rally100.save_entry(jsonb_build_object('id', t.e(8701), 'first_name', 'Xavi', 'last_name', 'Stone',
         'phone', t.ph(701))) as r \gset
reset role;
select t.person_of(t.e(701)) as px \gset
select t.ok(t.person_of(t.e(8701)) = :'px', '19.00 (setup) Xavi is one Person on both teams'' lists');
call t.login(:'R1');
select rally100.plan_intro(t.e(701)) as r \gset
call t.login(:'RB');
select rally100.rep_state() -> 'intros' as i1 \gset
call t.login(:'R1');
select rally100.record_intro(t.e(701), 'text', 'in') as r \gset
call t.login(:'RB');
select t.ok(not (:'i1'::jsonb @> jsonb_build_array(jsonb_build_object('person_id', :'px')))
            and not (rally100.rep_state() -> 'intros' @> jsonb_build_array(jsonb_build_object('person_id', :'px'))),
  '19.01 [11] another team''s rep planning or recording an introduction never puts a card on this rep''s screen');
call t.login(:'L1');
select rally100.confirm_intro_received(:'px', :'R1') as r \gset
call t.login(:'R1');
select t.ok((select x -> 'next' from jsonb_array_elements(rally100.rep_state() -> 'intros') x where x ->> 'person_id' = :'px')
              = '{"who":"leader","name":"Dana Lead","text":"schedules the meeting"}',
  '19.02 [17] received, nothing confirmed, no meeting yet: Next, Dana schedules the meeting');
call t.login(:'L1');
select rally100.schedule_meeting(:'px', '2026-11-20 17:00-06', 'video') as r \gset
call t.login(:'R1');
select t.ok((select x -> 'next' ->> 'text' from jsonb_array_elements(rally100.rep_state() -> 'intros') x where x ->> 'person_id' = :'px')
              = 'holds the meeting',
  '19.03 [17] meeting scheduled, nothing confirmed: Dana holds the meeting');
call t.login(:'L1');
select rally100.set_requirement(:'px', 1, true) as r \gset
call t.login(:'R1');
select (select x -> 'next' ->> 'text' from jsonb_array_elements(rally100.rep_state() -> 'intros') x where x ->> 'person_id' = :'px') as n1 \gset
call t.login(:'L1');
select rally100.set_requirement(:'px', 2, true) as r \gset
call t.login(:'R1');
select (select x -> 'next' ->> 'text' from jsonb_array_elements(rally100.rep_state() -> 'intros') x where x ->> 'person_id' = :'px') as n2 \gset
call t.login(:'L1');
select rally100.set_requirement(:'px', 3, true) as r \gset
call t.login(:'R1');
select (select x -> 'next' ->> 'text' from jsonb_array_elements(rally100.rep_state() -> 'intros') x where x ->> 'person_id' = :'px') as n3 \gset
select t.ok(:'n1' = 'confirms the commitment' and :'n2' = 'confirms the agreement' and :'n3' = 'confirms start date and travel plans',
  '19.04 [17] after the meeting the next step follows the first unconfirmed requirement');
call t.login(:'L1');
select rally100.set_outcome(:'px', 'follow_up', '2026-12-01', null) as r \gset
call t.login(:'R1');
select (select x -> 'next' from jsonb_array_elements(rally100.rep_state() -> 'intros') x where x ->> 'person_id' = :'px') as nf \gset
call t.login(:'L1');
select rally100.set_outcome(:'px', null) as r \gset
call t.login(:'R1');
select t.ok(:'nf' = 'null'
            and (select x -> 'next' ->> 'text' from jsonb_array_elements(rally100.rep_state() -> 'intros') x where x ->> 'person_id' = :'px')
                = 'confirms start date and travel plans',
  '19.04b [17] an outcome clears the next step; clearing it brings the step back');
call t.login(:'L1');
select rally100.set_requirement(:'px', 4, true, null, null, '2027-02-01', null, true) as r \gset
call t.login(:'R1');
select rally100.rep_state() as s \gset
select t.ok((select x -> 'next' from jsonb_array_elements(:'s'::jsonb -> 'intros') x where x ->> 'person_id' = :'px') = 'null'
            and (select x -> 'requirements' -> 3 from jsonb_array_elements(:'s'::jsonb -> 'intros') x where x ->> 'person_id' = :'px')
                @> '{"req":4,"confirmed":true,"travel_na":true}',
  '19.05 [17][18b] all four confirmed: no next step; requirement 4 carries travel_na for "No travel needed"');
select t.ok((select x from jsonb_array_elements(:'s'::jsonb -> 'referrals') x where x ->> 'person_id' = :'px')
              @> jsonb_build_object('entry_id', t.e(701), 'credited', 'me', 'status', 'ready', 'amount_cents', 10000),
  '19.06 [16][18c] the referral row carries the rep''s own entry_id and amount_cents');
call t.login(:'L1');
select rally100.set_next_action(:'px', 'Tyler brings him Thursday', :'R1', '2026-11-10') as r \gset
call t.login(:'R1');
select t.ok((select x -> 'next' from jsonb_array_elements(rally100.rep_state() -> 'intros') x where x ->> 'person_id' = :'px')
              = '{"who":"you","name":"Tyler Rep","text":"Tyler brings him Thursday"}',
  '19.07 [17] an explicit next action owned by the rep still wins');

-- [1][2] what team B's leader can learn about the shared Person
call t.login(:'LB');
select rally100.person_detail(:'px') as pd \gset
select t.ok((:'pd'::jsonb -> 'person') @> '{"next_action":"","next_action_owner":null,"next_action_owner_name":null,"next_action_date":null,"controls":false}'
            and position(:'R1' in :'pd') = 0 and position('Tyler' in :'pd') = 0
            and :'pd'::jsonb -> 'reward' = 'null'
            and not exists (select 1 from jsonb_array_elements(:'pd'::jsonb -> 'history') x
                             where x ->> 'action' in ('intro_planned', 'intro_recorded', 'person_created', 'reward_created')
                                or (x ->> 'action' = 'next_action' and x -> 'detail' <> '{}')),
  '19.08 [1][2] team B''s leader sees no next-action owner or text, no team A rep id or name, no reward and none of their actions');
call t.login(:'L1');
select t.ok(rally100.person_detail(:'px') -> 'person'
              @> jsonb_build_object('next_action_owner', :'R1', 'next_action_owner_name', 'Tyler Rep', 'controls', true),
  '19.09 [1] the team that runs the Person still sees who owns the next action');
call t.login(:'R3');
select rally100.save_entry(jsonb_build_object('id', t.e(3801), 'first_name', 'Xavi', 'last_name', 'Stone',
         'phone', t.ph(701), 'handle', 'xavi.jo', 'platform', 'X')) as r \gset
reset role;
select (select id from t.referral_of(:'px')) as rwpx \gset
call t.login(:'OWNER');
select rally100.correct_credit(:'rwpx', :'R3', 'Tyler admitted Jo made the real intro') as r \gset
call t.login(:'L1');
select rally100.person_detail(:'px') as pd \gset
select t.ok((select x -> 'detail' from jsonb_array_elements(:'pd'::jsonb -> 'history') x where x ->> 'action' = 'correct_credit')
              = jsonb_build_object('from_rep', :'R1', 'to_rep', :'R3')
            and position('admitted' in :'pd') = 0,
  '19.10 [2] a leader sees whom a credit moved between (in scope) but never the owner''s internal reason');
select rally100.review_reward(:'rwpx', 'needs_correction', 'start date is wrong') as r \gset
call t.login(:'R3');
select t.ok((select x ->> 'correction_note' from jsonb_array_elements(rally100.rep_state() -> 'referrals') x
              where x ->> 'person_id' = :'px') = 'start date is wrong',
  '19.11 [18a] the credited rep (credited by the owner, no introduction of their own) sees the reward and the leader''s correction note');
call t.login(:'L1');
select rally100.resolve_correction(:'rwpx', 'fixed') as r \gset
select rally100.review_reward(:'rwpx', 'approve', null) as r \gset
call t.login(:'OWNER');
select rally100.mark_pay_issued(:'rwpx', '2026-11-03', 'Venmo @jo-22', 'txn Zulu') as r \gset
select t.ok(:'r'::jsonb -> 'reward' @> '{"paid_method":"Venmo @jo-22","paid_reference":"txn Zulu"}',
  '19.12 [2] the owner sees the payment method and reference');
call t.login(:'L1');
select rally100.person_detail(:'px') as pd \gset
select t.ok(:'pd'::jsonb -> 'reward' @> '{"status":"paid","paid_method":null,"paid_reference":null}'
            and (select x -> 'detail' from jsonb_array_elements(:'pd'::jsonb -> 'history') x where x ->> 'action' = 'pay_issued')
                = '{"paid_on":"2026-11-03"}'
            and position('Venmo' in :'pd') = 0 and position('Zulu' in :'pd') = 0,
  '19.13 [2] payment method and reference are the owner''s alone: not in a leader''s reward or history');
-- Kim (a team A leader) adds Xavi to her own list and records an introduction AS A REP
call t.login(:'L2');
select rally100.save_entry(jsonb_build_object('id', t.e(9701), 'first_name', 'Xavi', 'last_name', 'Stone',
         'phone', t.ph(701), 'handle', 'xavi.kim', 'platform', 'X')) as r \gset
select rally100.record_intro(t.e(9701), 'call', 'maybe') as r \gset
call t.login(:'LB');
select rally100.person_detail(:'px') as pd \gset
select t.ok(not exists (select 1 from jsonb_array_elements(:'pd'::jsonb -> 'history') x
                         where x ->> 'actor_name' = 'Kim Lead' and x ->> 'action' in ('intro_recorded', 'person_created'))
            and position(:'R3' in :'pd') = 0 and position('Venmo' in :'pd') = 0 and position('admitted' in :'pd') = 0
            and position('start date is wrong' in :'pd') = 0,
  '19.14 [2] a leader acting as a rep is filtered by scope like any rep; the credited team''s reward facts stay hidden');
-- [15] who may change a shared Person: the team of the credited rep
select t.ok(t.err(format('select rally100.set_requirement(%L, 1, false, null, %L)', :'px', 'x')) = '42501 rally100: not_allowed'
            and t.err(format('select rally100.set_stage(%L, %L)', :'px', 'arrived')) = '42501 rally100: not_allowed'
            and t.err(format('select rally100.schedule_meeting(%L, %L)', :'px', '2026-12-01 10:00-06')) = '42501 rally100: not_allowed'
            and t.err(format('select rally100.set_interest(%L, %L)', :'px', 'maybe')) = '42501 rally100: not_allowed'
            and t.err(format('select rally100.set_next_action(%L, %L)', :'px', 'call him')) = '42501 rally100: not_allowed'
            and t.err(format('select rally100.set_outcome(%L, %L, %L)', :'px', 'follow_up', '2026-12-01')) = '42501 rally100: not_allowed'
            and t.err(format('select rally100.set_outcome(%L, null)', :'px')) = '42501 rally100: not_allowed',
  '19.15 [15] another team''s leader with the Person in scope may not change its requirements, stage, meeting, interest, next action or outcome');
select rally100.set_outcome(:'px', 'do_not_contact', null, null) as r \gset
select t.ok(:'r'::jsonb -> 'person' @> '{"dnc":true,"next_action":"","next_action_owner":null}'
            and position(:'R1' in :'r') = 0 and position('Tyler' in :'r') = 0,
  '19.16 [15][1] but any leader in scope may set Do not contact, and the answer names nobody from the other team');
call t.login(:'OWNER');
select rally100.clear_dnc(:'px') as r \gset

-- [15][9][11] Yara: shared, and nobody has introduced her yet
call t.login(:'R1');
select t.save(t.full(702, 'Yara', 'Holt')) as r \gset
call t.login(:'RB');
select rally100.save_entry(jsonb_build_object('id', t.e(8702), 'first_name', 'Yara', 'last_name', 'Holt',
         'phone', t.ph(702))) as r \gset
reset role;
select t.person_of(t.e(702)) as py \gset
call t.login(:'LB');
select t.ok(t.err(format('select rally100.set_interest(%L, %L)', :'py', 'maybe')) = 'ok',
  '19.17 [15] while nobody has introduced the Person, any leader in scope may work it');
call t.login(:'RB');
select t.ok(t.err(format('select rally100.set_follow_up(%L, %L)', t.e(8702), '2026-12-01')) = '22023 rally100: entry_not_complete',
  '19.18 [9] a rep cannot set a follow-up from a draft');
select rally100.save_entry(jsonb_build_object('id', t.e(8702), 'handle', 'yara.h', 'platform', 'Snapchat')) as r \gset
call t.login(:'R1');
select rally100.record_intro(t.e(702), 'in_person', 'in') as r \gset
call t.login(:'RB');
select rally100.plan_intro(t.e(8702)) as r \gset
select t.ok(t.err(format('select rally100.set_follow_up(%L, %L)', t.e(8702), '2026-12-01')) = '22023 rally100: stage_locked',
  '19.19 [9] once another rep has recorded an introduction, a rep without one of their own cannot park the Person');
call t.login(:'LB');
select t.ok(t.err(format('select rally100.set_interest(%L, %L)', :'py', 'maybe')) = '42501 rally100: not_allowed',
  '19.20 [15] once team A''s rep has recorded an introduction, team B''s leader no longer runs the Person');
call t.login(:'RB');
select rally100.record_intro(t.e(8702), 'text', 'maybe') as r \gset
call t.login(:'LB');
select t.ok(t.err(format('select rally100.set_interest(%L, %L)', :'py', 'maybe')) = 'ok',
  '19.21 [15] with introductions recorded on both teams and none received, both teams'' leaders may work it');
call t.login(:'L1');
select rally100.confirm_intro_received(:'py', :'R1') as r \gset
call t.login(:'LB');
select t.ok(t.err(format('select rally100.set_interest(%L, %L)', :'py', 'maybe')) = '42501 rally100: not_allowed',
  '19.22 [15] a received introduction hands the Person to that rep''s team');
call t.login(:'RB');
select t.ok((select x ->> 'leader_name' from jsonb_array_elements(rally100.rep_state() -> 'intros') x where x ->> 'person_id' = :'py') = 'Bo LeadB'
            and t.err(format('select rally100.set_follow_up(%L, %L)', t.e(8702), '2026-12-01')) = 'ok',
  '19.23 [11][9] a rep''s card names their OWN team leader; with their own recorded introduction they may set a follow-up');
call t.login(:'OWNER');
select rally100.set_outcome(:'py', null) as r \gset

-- [14] separation of duties
call t.login(:'L1');
select t.ok(t.err(format('select rally100.set_requirement(%L, 2, true)', :'plou')) = '42501 rally100: self_involved'
            and t.err(format('select rally100.set_requirement(%L, 2, false, null, %L)', :'plou', 'x')) = '42501 rally100: self_involved',
  '19.24 [14] a leader who recorded an introduction of the Person cannot confirm or untick its requirements');
call t.login(:'OWNER');
select t.ok(t.err(format('select rally100.set_requirement(%L, 1, true)', :'pora')) = '42501 rally100: self_involved',
  '19.25 [14] nor can the owner, on a Person the owner introduced');
call t.login(:'L2');
select t.ok(t.err(format('select rally100.set_requirement(%L, 1, true)', :'px')) = '42501 rally100: self_involved',
  '19.26 [14] Kim recorded an introduction of Xavi, so Xavi''s requirements are not hers to confirm');

-- [10] identifier poisoning: another rep's bad data must not trap a real contact
call t.login(:'R1');
select rally100.save_entry(jsonb_build_object('id', t.e(710), 'first_name', 'Ann', 'last_name', 'Lee', 'phone', t.ph(710),
         'handle', 'ann.lee', 'platform', 'Instagram')) as r \gset
call t.login(:'RB');
select rally100.save_entry(jsonb_build_object('id', t.e(8710), 'first_name', 'Ann', 'last_name', 'Lee', 'phone', t.ph(710),
         'handle', 'bob.lee', 'platform', 'Instagram')) as r \gset
call t.login(:'R1');
select rally100.save_entry(jsonb_build_object('id', t.e(711), 'first_name', 'Bob', 'last_name', 'Lee', 'phone', t.ph(711),
         'handle', 'bob.lee', 'platform', 'Instagram')) as r \gset
select t.ok(:'r'::jsonb -> 'entry' ->> 'held_of' = t.e(710)::text
            and t.has_effect(:'r'::jsonb, jsonb_build_object('type', 'held', 'older_id', t.e(710), 'older_name', 'Ann Lee', 'by', 'person')),
  '19.27 [10] (setup) Bob is held "by person": another rep tied Bob''s handle to Ann''s Person');
reset role;
select t.person_of(t.e(710)) as pann \gset
call t.login(:'R1');
select t.ok(t.err(format('select rally100.resolve_duplicate(%L, %L, null)', t.e(711), 'different')) = '22023 rally100: reason_required',
  '19.28 [10] "Different people" on a Person-only hold still needs a reason');
select rally100.resolve_duplicate(t.e(711), 'different', 'Bob is Ann''s brother') as r \gset
reset role;
select t.ok((:'r'::jsonb -> 'entry' ->> 'counted')::boolean and :'r'::jsonb -> 'entry' ->> 'held_of' is null
            and t.person_of(t.e(711)) <> :'pann' and t.person_of(t.e(711)) is not null
            and not exists (select 1 from rally100.person_identifiers where person_id = :'pann' and value = t.ph(711))
            and exists (select 1 from rally100.person_identifiers where person_id = :'pann' and value = 'Instagram:bob.lee'),
  '19.29 [10] it is released onto a Person of its own, taking the identifiers only it carried (the other rep''s stay)');

-- [4] award idempotency
call t.login(:'L1');
select rally100.award_incentive(:'inc', :'R1', 'won week 44', 'a0000000-0000-4000-8000-000000000044') -> 'reward' ->> 'id' as w1 \gset
select rally100.award_incentive(:'inc', :'R1', 'won week 44', 'a0000000-0000-4000-8000-000000000044') -> 'reward' ->> 'id' as w2 \gset
select rally100.award_incentive(:'inc', :'R1', 'won week 44', 'a0000000-0000-4000-8000-000000000044') -> 'reward' ->> 'id' as w3 \gset
reset role;
select t.ok(:'w1' = 'a0000000-0000-4000-8000-000000000044' and :'w2' = :'w1' and :'w3' = :'w1'
            and (select count(*) from rally100.rewards where id = :'w1') = 1
            and (select count(*) from rally100.reward_events where reward_id = :'w1' and action = 'award') = 1,
  '19.30 [4] three tries of one award request make one award');
call t.login(:'L1');
select rally100.award_incentive(:'inc', :'R1', 'won week 45', 'a0000000-0000-4000-8000-000000000045') as r \gset
select t.ok(:'r'::jsonb -> 'reward' ->> 'id' = 'a0000000-0000-4000-8000-000000000045'
            and t.err(format('select rally100.award_incentive(%L, %L, %L, %L)', :'inc', :'R3', 'x', :'w1')) = '22023 rally100: request_reused'
            and t.err(format('select rally100.award_incentive(%L, %L, %L, %L)', :'inc', :'R1', 'x', :'rwpx')) = '22023 rally100: request_reused',
  '19.31 [4] a new request is a new award (weekly prizes); a request id already used for anything else is refused');

-- [5] a closed rep (Sam was closed as a no-show in section 12)
select t.ok(t.err(format('select rally100.award_incentive(%L, %L, %L, %L)', :'inc', :'R2', 'x', gen_random_uuid())) = '22023 rally100: rep_closed',
  '19.32 [5] nothing is awarded to a closed rep');
call t.login(:'R2');
select t.save(t.full(2950, 'Cora', 'Lane')) as r \gset
select rally100.record_intro(t.e(2950), 'text', 'in') as r \gset
reset role;
select t.person_of(t.e(2950)) as pcora \gset
call t.login(:'L1');
select rally100.confirm_intro_received(:'pcora', :'R2') as r \gset
select rally100.set_requirement(:'pcora', 1, true) as r \gset
select rally100.set_requirement(:'pcora', 2, true) as r \gset
select rally100.set_requirement(:'pcora', 3, true) as r \gset
select rally100.set_requirement(:'pcora', 4, true, null, null, '2027-01-04', null, true) -> 'reward' as rw \gset
select t.ok(:'rw'::jsonb @> '{"status":"ready","rep_name":"Sam Rep","flags":["rep_closed"]}'
            and (select x -> 'flags' from jsonb_array_elements(rally100.team_state() -> 'queues' -> 'reviews') x
                  where x ->> 'reward_id' = :'rw'::jsonb ->> 'id') = '["rep_closed"]'
            and (select (x ->> 'closed')::boolean from jsonb_array_elements(rally100.team_state() -> 'reps') x where x ->> 'id' = :'R2'),
  '19.33 [5] a referral credited to a closed rep is created as usual but flagged rep_closed for leaders; the rep row reads closed');
select t.ok(t.err(format('select rally100.review_reward(%L, %L)', :'rw'::jsonb ->> 'id', 'approve')) = '22023 rally100: rep_closed',
  '19.34 [5] nothing is approved for a closed rep');
call t.login(:'R2');
select t.ok(position('rep_closed' in rally100.rep_state()::text) = 0 and position('closed' in (rally100.rep_state() -> 'referrals')::text) = 0,
  '19.35 [5] the rep never sees the closure');
call t.login(:'OWNER');
select t.ok((select (x ->> 'closed')::boolean from jsonb_array_elements(rally100.owner_state() -> 'reps') x where x ->> 'id' = :'R2')
            and (select x -> 'flags' from jsonb_array_elements(rally100.owner_rewards(null) -> 'rows') x
                  where x ->> 'kind' = 'list' and x ->> 'rep_id' = :'R2') = '["rep_closed"]',
  '19.36 [5] the owner sees the closure on the rep row and on every reward of theirs');
call t.login(:'L1');
select t.ok(t.err(format('select rally100.reopen_rep(%L)', :'R2')) = '42501 rally100: owner_only',
  '19.37 [5] only the owner reopens a rep');
call t.login(:'OWNER');
select rally100.reopen_rep(:'R2') as r \gset
call t.login(:'L1');
select rally100.review_reward((:'rw'::jsonb ->> 'id')::uuid, 'approve') as r2 \gset
reset role;
select t.ok(:'r' = '{"ok": true}' and :'r2'::jsonb -> 'reward' ->> 'status' = 'approved'
            and not rally100._rep_closed(:'R2')
            and (select reversed_reason from rally100.rewards where kind = 'list' and rep_id = :'R2') = 'no_show'
            and (select reopened_by from rally100.rep_closures where rep_id = :'R2') = :'OWNER'::uuid,
  '19.38 [5] reopening ends the closure for the future (approval works again) and leaves past reversals as they were');

-- [6][8] the reward lock and reversed records, deterministically
select t.ok(t.err(format('select rally100._referral_untick(%L, %L, %L)', :'pcora', :'L1', 'x')) = '22023 rally100: locked_reward',
  '19.39 [6] an untick that reaches an approved record raises locked_reward instead of passing silently');
call t.login(:'L1');
select rally100.set_requirement(:'py', 1, true) as r \gset
select rally100.set_requirement(:'py', 2, true) as r \gset
select rally100.set_requirement(:'py', 3, true) as r \gset
select rally100.set_requirement(:'py', 4, true, null, null, '2027-03-01', 'flying in', null) -> 'reward' as rwy \gset
reset role;
update rally100.requirements set confirmed = false where person_id = :'py' and req = 2;
call t.login(:'L1');
select t.ok(:'rwy'::jsonb @> jsonb_build_object('status', 'ready', 'rep_id', :'R1')
            and t.err(format('select rally100.review_reward(%L, %L)', :'rwy'::jsonb ->> 'id', 'approve')) = '22023 rally100: not_ready',
  '19.40 [6] approval re-checks all four confirmations under the lock, whatever the status says');
reset role;
update rally100.requirements set confirmed = true where person_id = :'py' and req = 2;
call t.login(:'L1');
select rally100.review_reward((:'rwy'::jsonb ->> 'id')::uuid, 'needs_correction', 'check the flight') as r \gset
call t.login(:'OWNER');
select rally100.reverse_reward((:'rwy'::jsonb ->> 'id')::uuid, 'recruit withdrew', 'Yara withdrew') as r \gset
call t.login(:'L1');
select t.ok(t.err(format('select rally100.resolve_correction(%L)', :'rwy'::jsonb ->> 'id')) = '22023 rally100: reward_reversed',
  '19.41 [8] a reversed record cannot be resolved back to ready');
select rally100.set_requirement(:'py', 3, false, null, 'agreement voided') -> 'reward' as r \gset
select t.ok(:'r'::jsonb @> jsonb_build_object('status', 'needs_correction', 'rep_id', :'R1', 'reversed', true),
  '19.42 [8] unticking a requirement leaves a reversed record exactly where it was');
reset role;
select t.ok(not rally100._reverse(:'rwpx'::uuid, :'OWNER'::uuid, 'left', '', 'close_unpaid', true)
            and (select reversed_at is null and status = 'paid' from rally100.rewards where id = :'rwpx'),
  '19.43 [7] the leaving-rep reversal re-reads the row under its lock and leaves a paid record alone');

-- [13] the spot-check obeys rule 12 too
insert into rally100.rewards (kind, team_id, rep_id, amount_cents, status) values ('list', :'TA', :'L2', 10000, 'ready')
returning id as rwl2 \gset
insert into rally100.rewards (kind, team_id, rep_id, amount_cents, status) values ('list', :'TA', :'OWNER', 10000, 'ready')
returning id as rwlo \gset
call t.login(:'L2');
select t.ok(t.err(format('select rally100.record_spot_check(%L, %L)', :'rwl2', '[]')) = '42501 rally100: self_involved',
  '19.44 [13] a leader cannot spot-check their own list reward');
call t.login(:'L1');
select t.ok(t.err(format('select rally100.record_spot_check(%L, %L)', :'rwlo', '[]')) = '42501 rally100: owner_only',
  '19.45 [13] a leader cannot spot-check the owner''s list reward');
select rally100.review_reward(:'rwl2', 'needs_correction', 'two numbers look made up') as r \gset
call t.login(:'L2');
select t.ok(rally100.rep_state() -> 'list_reward' @> '{"status":"needs_correction","correction_note":"two numbers look made up"}',
  '19.46 [18a] the rep sees the leader''s note on their list reward while it needs correction');

-- [12] the list cap, and a save stays fast at the cap
reset role;
insert into auth.users (id, email, raw_user_meta_data) values (:'CAP', 'cap@a.test', '{"name":"Cap Rep"}');
update public.profiles set team_id = :'TA' where id = :'CAP';
insert into rally100.entries (id, team_id, rep_id, first_name, last_name, phone, handle, platform)
select t.e(50000 + g), :'TA', :'CAP', 'C' || g, 'R' || g, t.ph(5000 + g), 'cap' || g, 'X' from generate_series(0, 498) g;
select rally100._settle(:'CAP'::uuid, null, true, null) as r \gset
call t.login(:'CAP');
select clock_timestamp() as t0 \gset
select t.save(t.full(5499, 'Last', 'Fits')) as r \gset
select t.ok((:'r'::jsonb ->> 'count')::int = 500 and extract(epoch from clock_timestamp() - :'t0'::timestamptz) < 2,
  '19.47 [12] the 500th live entry saves, in well under two seconds with 499 others to compare against');
select t.ok(t.err(format('select rally100.save_entry(%L)', t.full(5500, 'One', 'Over'))) = '22023 rally100: list_full',
  '19.48 [12] the 501st is refused: list_full');
select rally100.remove_entry(t.e(5499)) as r \gset
select t.save(t.full(5500, 'One', 'More')) as r \gset
select t.ok(t.err(format('select rally100.restore_entry(%L)', t.e(5499))) = '22023 rally100: list_full',
  '19.49 [12] restoring is refused too while 500 entries are live');
reset role;
insert into rally100.entries (id, team_id, rep_id, first_name, removed_at)
select t.e(60000 + g), :'TA', :'CAP', 'Gone' || g, clock_timestamp() from generate_series(1, 1500) g;
call t.login(:'CAP');
select rally100.remove_entry(t.e(5500)) as r \gset
select t.ok(t.err(format('select rally100.save_entry(%L)', t.full(5501, 'Churn', 'Limit'))) = '22023 rally100: list_full',
  '19.50 [12] and a rep holding 2,000 entry rows, removed ones included, cannot add more');

-- [19] the leader's rep row shows the list reward's pay facts
call t.login(:'OWNER');
select rally100.mark_pay_issued(:'rwl3', '2026-11-02', 'payroll 11/2') as r \gset
call t.login(:'L1');
select t.ok((select x -> 'list_reward' from jsonb_array_elements(rally100.team_state() -> 'reps') x where x ->> 'id' = :'R3')
              @> '{"status":"paid","paid_on":"2026-11-02","amount_cents":10000}',
  '19.51 [19] team_state.reps[].list_reward carries paid_on and amount_cents');

-- [16] the uncredited rep's card for a Person credited to someone else
call t.login(:'R1');
select (select x from jsonb_array_elements(rally100.rep_state() -> 'intros') x where x ->> 'entry_id' = t.e(1)::text) as card \gset
select t.ok(:'card'::jsonb @> '{"credited":"other","stage":"introduced","status":"introduced","channel":"in_person","said":"not_for_them"}'
            and :'card'::jsonb -> 'requirements' = 'null' and :'card'::jsonb -> 'next' = 'null'
            and :'card'::jsonb -> 'meeting_at' = 'null' and :'card'::jsonb -> 'interest' = 'null'
            and :'card'::jsonb -> 'outcome' = 'null',
  '19.52 [16] once credited to another rep, the card keeps only the rep''s own facts: no requirements, step, meeting, interest or later stage');
reset role;
