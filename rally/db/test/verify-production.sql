-- RALLY v39 — POST-MIGRATION BEHAVIOURAL VERIFICATION.
--
-- "the function body contains a string" and "the policy text contains
-- my_role" are diagnostics, not certification. These probes exercise the
-- actual behaviour, as actual roles.
--
-- ROLLBACK-SAFE: everything happens inside one transaction that ends in
-- ROLLBACK. No production row is created, changed or deleted. Run it in the
-- Supabase SQL editor AFTER the migrations have committed.
--
-- It picks a real rep and a real leader/manager/owner off your own team, so
-- there is nothing to fill in.

\set ON_ERROR_STOP on
begin;

create temporary table probe_result(step text, ok boolean, detail text) on commit drop;
-- the probes run AS a rep / AS a leader, so the scratch table has to be
-- writable by them too. It is temporary and dropped on commit either way.
grant all on probe_result to public;

do $$
declare
  rep_id uuid; boss_id uuid; team uuid; tid text; tid2 text; cid text; n int; ok boolean;
  stored jsonb;
begin
  select p.id, p.team_id into rep_id, team from public.profiles p
    where p.role = 'rep' and p.team_id is not null and not p.disabled limit 1;
  select p.id into boss_id from public.profiles p
    where p.role in ('leader','manager','owner') and p.team_id = team
      and not p.disabled limit 1;
  if rep_id is null or boss_id is null then
    insert into probe_result values ('SETUP', false,
      'need one enabled rep AND one enabled leader/manager/owner on the same team');
    return;
  end if;
  insert into probe_result values ('SETUP', true,
    'team ' || team || ' — probing as a real rep and a real leader');

  tid := 'v39-probe-' || substr(md5(random()::text), 1, 10);
  tid2 := 'v39-probe-b-' || substr(md5(random()::text), 1, 10);
  cid := 'v39-probe-c-' || substr(md5(random()::text), 1, 10);

  -- 1. a rep may NOT create a territory
  perform set_config('request.jwt.claims', json_build_object('sub', rep_id)::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.territories (team_id, id, name) values (team, tid, 'probe');
    insert into probe_result values ('1 rep territory insert', false, 'ALLOWED — 0003 is not in effect');
  exception when insufficient_privilege then
    insert into probe_result values ('1 rep territory insert', true, 'denied, as required');
  end;

  -- 2. a rep MAY still write their own work
  begin
    insert into public.pins (team_id, id, lat, lng) values (team, 'v39-probe-pin', 1, 1);
    insert into public.customers (team_id, id, first, last) values (team, cid, 'Probe', 'Row');
    insert into probe_result values ('2 rep pin + customer write', true, 'allowed, as required');
  exception when others then
    insert into probe_result values ('2 rep pin + customer write', false, 'DENIED — reps cannot work: ' || sqlerrm);
  end;

  -- 3. an older-client UPSERT cannot erase an existing autopay request
  update public.customers set data =
    '{"payment":{"method":"ach","autopayRequested":true,"status":"pending_setup"}}'::jsonb
    where team_id = team and id = cid;
  insert into public.customers (team_id, id, first, last, data)
    values (team, cid, 'Probe', 'Row', '{"payment":{"method":"ach","autopay":true}}'::jsonb)
    on conflict (team_id, id) do update set data = excluded.data;
  select c.data->'payment' into stored from public.customers c where c.team_id = team and c.id = cid;
  ok := stored->>'autopayRequested' = 'true' and stored->>'status' = 'pending_setup';
  insert into probe_result values ('3 old-client upsert preserves the request', ok, stored::text);

  -- 4. no client can make a payment method look live
  insert into public.customers (team_id, id, first, last, data)
    values (team, cid, 'Probe', 'Row',
      '{"payment":{"method":"card","autopayRequested":true,"status":"active"}}'::jsonb)
    on conflict (team_id, id) do update set data = excluded.data;
  select c.data->'payment' into stored from public.customers c where c.team_id = team and c.id = cid;
  ok := coalesce(stored->>'status','') <> 'active';
  insert into probe_result values ('4 status "active" cannot be claimed', ok, stored::text);

  -- 5. a credential cannot be smuggled through an allowed field
  insert into public.customers (team_id, id, first, last, data)
    values (team, cid, 'Probe', 'Row',
      '{"payment":{"method":"4111111111111111","last4":"4111111111111111",
        "card":{"number":"4111111111111111"},
        "billingAddress":{"street":"4111111111111111","city":"Provo","state":"UT","zip":"84604"}}}'::jsonb)
    on conflict (team_id, id) do update set data = excluded.data;
  select c.data->'payment' into stored from public.customers c where c.team_id = team and c.id = cid;
  ok := position('4111111111111111' in stored::text) = 0
        and not (stored ? 'card') and not (stored ? 'ach');
  insert into probe_result values ('5 credentials cannot ride an allowed field', ok, stored::text);

  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 6. a leader/manager/owner CAN do territory work
  perform set_config('request.jwt.claims', json_build_object('sub', boss_id)::text, true);
  execute 'set local role authenticated';
  begin
    -- its OWN id, so this probe can never fail because an earlier one
    -- (wrongly) succeeded
    insert into public.territories (team_id, id, name) values (team, tid2, 'probe');
    update public.territories set name = 'probe renamed' where team_id = team and id = tid2;
    get diagnostics n = row_count;
    insert into probe_result values ('6 leadership territory insert + update', n = 1,
      n || ' row(s) updated');
  exception when others then
    insert into probe_result values ('6 leadership territory insert + update', false,
      'DENIED — leadership cannot manage territories: ' || sqlerrm);
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 7. a rep may NOT reach the Smart Split function
  perform set_config('request.jwt.claims', json_build_object('sub', rep_id)::text, true);
  execute 'set local role authenticated';
  begin
    perform public.smart_split_territory(tid2, 'probe-op-rep',
      jsonb_build_array(
        jsonb_build_object('id', tid2 || '-a', 'name', 'a',
          'polygon', '[[0,0],[1,0],[1,1]]'::jsonb),
        jsonb_build_object('id', tid2 || '-b', 'name', 'b',
          'polygon', '[[1,0],[2,0],[2,1]]'::jsonb)));
    insert into probe_result values ('7 rep smart split', false,
      'ALLOWED — a rep split a territory');
  exception when others then
    insert into probe_result values ('7 rep smart split', true,
      'refused: ' || sqlerrm);
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 8. a leader CAN, it is atomic, and repeating it creates nothing new
  perform set_config('request.jwt.claims', json_build_object('sub', boss_id)::text, true);
  execute 'set local role authenticated';
  begin
    perform public.smart_split_territory(tid2, 'probe-op-boss',
      jsonb_build_array(
        jsonb_build_object('id', tid2 || '-a', 'name', 'a',
          'polygon', '[[0,0],[1,0],[1,1]]'::jsonb),
        jsonb_build_object('id', tid2 || '-b', 'name', 'b',
          'polygon', '[[1,0],[2,0],[2,1]]'::jsonb)));
    select count(*) into n from public.territories
      where team_id = team and id in (tid2 || '-a', tid2 || '-b') and deleted_at is null;
    select (deleted_at is not null) into ok from public.territories
      where team_id = team and id = tid2;
    insert into probe_result values ('8 leadership smart split is atomic',
      n = 2 and ok, n || ' child(ren), parent retired = ' || ok);
    -- the same operation again: recognised, never repeated
    perform public.smart_split_territory(tid2, 'probe-op-boss',
      jsonb_build_array(
        jsonb_build_object('id', tid2 || '-a', 'name', 'a',
          'polygon', '[[0,0],[1,0],[1,1]]'::jsonb),
        jsonb_build_object('id', tid2 || '-b', 'name', 'b',
          'polygon', '[[1,0],[2,0],[2,1]]'::jsonb)));
    select count(*) into n from public.territories
      where team_id = team and id like tid2 || '-%' and deleted_at is null;
    insert into probe_result values ('9 smart split retry creates nothing new',
      n = 2, n || ' child(ren) after the retry');
  exception when others then
    insert into probe_result values ('8 leadership smart split is atomic', false,
      'FAILED: ' || sqlerrm);
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
end $$;

select step,
       case when ok then 'PASS' else '*** FAIL ***' end as result,
       detail
  from probe_result order by step;

-- NOTHING above is kept. If any row says FAIL, do not resume production.
rollback;
