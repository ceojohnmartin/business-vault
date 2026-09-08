-- RALLY v41 - FINAL ASSIGNMENT-AUTHORITY FLIP PREFLIGHT (Supabase SQL Editor).
--
-- STRICTLY READ-ONLY. Every statement is a SELECT, or a PERFORM of a
-- read-only function. It creates one pg_temp function, which dies with the
-- session. It inserts nothing, updates nothing, deletes nothing, and does
-- not touch assignment_server_authoritative.
--
-- WHAT THE FLIP ACTUALLY CHANGES, so the proofs below make sense: one
-- branch of territories_assignment. Today an ordinary client upsert DERIVES
-- the ledger from the phone's legacy mirror (data.assignments). After the
-- flip it cannot - the stored ledger is truth, a client's mirror is
-- ignored, and open_assignees plus both v40 mirrors are rebuilt from the
-- ledger alone. From that moment a wrong ledger can no longer be repaired
-- by any phone; only set_territory_assignments, save_territory or a split
-- can move it. So every proof here is one question:
--
--   IS THE STORED LEDGER ALREADY RIGHT, AND ALREADY WHAT EVERY CLIENT SEES?
--
-- Read the LAST row first. It is the verdict.

create or replace function pg_temp.flip_preflight()
returns table(section text, probe text, result text, detail text)
language plpgsql
as $$
declare
  v_res   jsonb := '[]'::jsonb;
  v_n     bigint; v_b bigint; v_c bigint; v_d bigint;
  v_ok    boolean; v_ok2 boolean;
  v_txt   text; v_bad text;
  v_cap   jsonb;
  v_row   record;

  -- every object Stage A, Stage B and Stage C are supposed to have left,
  -- as two parallel arrays so unnest() keeps the pairing
  v_stage constant text[] := array[
    'A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A',
    'B','B','B','B','B','B','B','B','B','B','B','B','B','B','B',
    'C','C','C'];
  v_name  constant text[] := array[
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

  -- what a signed-in client MUST still be able to call after the flip,
  -- because these become the only ways a ledger can move
  v_granted constant text[] := array['set_territory_assignments','save_territory',
    'start_territory_cycle','clear_pin_dnk','smart_split_territory_v41',
    'smart_split_territory','rally_capabilities','rally_overlap_m2'];
  -- what a client must never be able to call
  v_ungranted constant text[] := array['rally_unresolved_live_assignments','assert_no_turf_overlap',
    'rally_require_leader','rally_my_team','rally_diff_assignees','rally_validate_assignees',
    'rally_config_guard','territories_assignment','territories_derive_geom','pins_protect_dnk'];
  -- the columns 0012 took away from clients; the ledger lives in three of them
  v_sealed constant text[] := array['assignees','open_assignees','assignees_rev','geom'];

begin
  ------------------------------------------------------------- 1. v41 CLIENT
  v_cap := public.rally_capabilities();
  v_ok  := coalesce((v_cap->>'turfRpc')::boolean, false);
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','1 v41 CLIENT',
    'p','1a the server advertises turfRpc, which is what makes a v41 client use the v41 RPCs',
    'o',v_ok,'d',coalesce(v_cap->>'turfRpc','null')));

  select count(*), max(at_ms) into v_n, v_b
    from public.events where type = 'dnk_clear' and id like 'dnkclear-%';
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','1 v41 CLIENT',
    'p','1b a real phone has called clear_pin_dnk - only a v41 client can, and only the server mints these ids',
    'o',v_n > 0,'d',v_n||' server-minted dnk_clear event(s); newest '||
      coalesce(to_char(to_timestamp(v_b/1000.0) at time zone 'UTC','YYYY-MM-DD HH24:MI')||'Z','-')));

  select count(*) into v_n from public.territories x,
       lateral jsonb_array_elements(coalesce(x.assignees->'entries','[]'::jsonb)) e
   where e ? 'viaSplit' or e ? 'viaOperation' or e ? 'inheritedFromTerritoryId';
  select count(*) into v_c from public.territories x,
       lateral jsonb_array_elements(coalesce(x.assignees->'entries','[]'::jsonb)) e
   where e ? 'assignedByName' or e ? 'userIdResolved';
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','1 v41 CLIENT',
    'p','1c INFO ledger entries carrying v41-only provenance (a v40 mirror cannot express these)',
    'o',true,'d',v_n||' split-inheritance, '||v_c||' assignedByName/userIdResolved'));

  v_res := v_res || jsonb_build_array(jsonb_build_object('s','1 v41 CLIENT',
    'p','1d LIMIT the database cannot see which bundle a phone loaded',
    'o',true,'d','1a-1c prove the v41 SERVER paths are live and have been exercised by a real client. Which build each iPhone is running is a client-side fact - read "Build vNN" on the More tab.'));

  ------------------------------------------------- 2. STAGE A / B / C HEALTH
  select string_agg(u.st||':'||u.nm, ', ' order by u.st, u.nm) into v_bad
    from unnest(v_stage, v_name) u(st, nm)
   where not exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
                      where ns.nspname = 'public' and p.proname = u.nm);
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','2 STAGE A/B/C',
    'p','2a every Stage A, B and C function is present (missing ones named)',
    'o',v_bad is null,'d',coalesce('MISSING: '||v_bad, array_length(v_name,1)||' of '||array_length(v_name,1)||' present')));

  select not p.prosecdef into v_ok from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname='public' and p.proname='territories_assignment';
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','2 STAGE A/B/C',
    'p','2b territories_assignment is SECURITY INVOKER - the whole flip is meaningless if it is not',
    'o',coalesce(v_ok,false),'d',case when v_ok then 'invoker'
      else 'DEFINER: current_user would be the owner on every path, so every client upsert would count as an authoritative RPC' end));

  select position('rally_keep_open_history' in p.prosrc) > 0 into v_ok
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname='public' and p.proname='territories_assignment';
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','2 STAGE A/B/C',
    'p','2c territories_assignment carries the 0017 body: an OPEN entry the phone''s mirror omits is closed, never deleted',
    'o',coalesce(v_ok,false),'d','rally_keep_open_history '||case when v_ok then 'present' else 'ABSENT' end));

  select position('v_auth or v_via_rpc' in p.prosrc) = 0 into v_ok
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname='public' and p.proname='territories_assignment';
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','2 STAGE A/B/C',
    'p','2d the correction stamp is UNGUARDED (0017) - a correction the client''s clock reads as "same" is a stranded device',
    'o',coalesce(v_ok,false),'d',case when v_ok then 'fires on any real correction' else 'STILL GUARDED by the authority test' end));

  select position('rally_keep_server_clears' in p.prosrc) > 0 into v_ok
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname='public' and p.proname='pins_protect_dnk';
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','2 STAGE A/B/C',
    'p','2e pins_protect_dnk carries the 0017 body: a cleared door stays cleared',
    'o',coalesce(v_ok,false),'d','rally_keep_server_clears '||case when v_ok then 'present' else 'ABSENT' end));

  select count(*) into v_n from pg_trigger
   where tgrelid='public.territories'::regclass and not tgisinternal
     and tgname in ('territories_assignment','territories_derive_geom','territories_no_overlap')
     and tgenabled='O';
  select string_agg(tgname||'='||tgenabled::text, ', ' order by tgname) into v_bad from pg_trigger
   where tgrelid='public.territories'::regclass and not tgisinternal and tgenabled<>'O';
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','2 STAGE A/B/C',
    'p','2f all three territories triggers are ENABLED',
    'o',v_n=3 and v_bad is null,'d',v_n||' of 3 enabled'||coalesce('; DISABLED: '||v_bad,'')));

  select count(*) into v_n from pg_trigger
   where tgrelid='public.rally_config'::regclass and tgname='rally_config_guard' and tgenabled='O';
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','2 STAGE A/B/C',
    'p','2g THE ACTIVATION GATE ITSELF: rally_config_guard is attached to rally_config and enabled',
    'o',v_n=1,'d',case when v_n=1 then 'armed - the flip refuses itself if any live hood has an unresolvable current assignee'
                       else 'NOT ARMED - the flip would proceed unchecked' end));

  select count(*) into v_n from pg_trigger
   where tgrelid='public.pins'::regclass and tgname='pins_protect_dnk' and tgenabled='O';
  select count(*) into v_c from pg_trigger
   where tgrelid='public.events'::regclass and tgname='events_guard_dnk_clear' and tgenabled='O';
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','2 STAGE A/B/C',
    'p','2h the do-not-knock triggers on pins and events are enabled',
    'o',v_n=1 and v_c=1,'d','pins '||v_n||'/1, events '||v_c||'/1'));

  select bool_and(p.prosecdef and array_to_string(p.proconfig,',') = 'search_path=""') into v_ok
    from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
   where ns.nspname='public'
     and p.proname in ('rally_capabilities','rally_unresolved_live_assignments','rally_config_guard');
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','2 STAGE A/B/C',
    'p','2i the flag reader, the gate count and the gate are SECURITY DEFINER with a pinned search_path',
    'o',coalesce(v_ok,false),'d',coalesce(v_ok::text,'?')));

  select string_agg(g, ', ' order by g) into v_bad from unnest(v_granted) g
   where not exists (select 1 from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
                      where ns.nspname='public' and p.proname=g
                        and has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','2 STAGE A/B/C',
    'p','2j a signed-in client CAN still call every function that becomes the only way to move a ledger',
    'o',v_bad is null,'d',coalesce('NOT GRANTED: '||v_bad,'all '||array_length(v_granted,1)||' granted')));

  select string_agg(p.proname, ', ' order by p.proname) into v_bad
    from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
   where ns.nspname='public' and p.proname = any(v_ungranted)
     and has_function_privilege('authenticated', p.oid, 'EXECUTE');
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','2 STAGE A/B/C',
    'p','2k a client can call NONE of the internals, the gate, or any trigger body',
    'o',v_bad is null,'d',coalesce('REACHABLE: '||v_bad,'none reachable')));

  select string_agg(p.proname, ', ' order by p.proname) into v_bad
    from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
   where ns.nspname='public' and p.proname = any(v_name)
     and has_function_privilege('anon', p.oid, 'EXECUTE');
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','2 STAGE A/B/C',
    'p','2l anon can execute none of the Stage A/B/C functions',
    'o',v_bad is null,'d',coalesce('REACHABLE BY anon: '||v_bad,'none reachable')));

  select string_agg(s, ', ' order by s) into v_bad from unnest(v_sealed) s
   where has_column_privilege('authenticated','public.territories', s, 'UPDATE')
      or has_column_privilege('authenticated','public.territories', s, 'INSERT');
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','2 STAGE A/B/C',
    'p','2m the ledger columns are sealed against direct client writes (0012)',
    'o',v_bad is null,'d',coalesce('CLIENT-WRITABLE: '||v_bad,'assignees, open_assignees, assignees_rev, geom all sealed')));

  select bool_and(relrowsecurity) into v_ok from pg_class
   where oid in ('public.territories'::regclass,'public.pins'::regclass,
                 'public.events'::regclass,'public.rally_config'::regclass);
  v_ok2 := has_table_privilege('authenticated','public.rally_config','SELECT')
        or has_table_privilege('anon','public.rally_config','SELECT');
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','2 STAGE A/B/C',
    'p','2n RLS is on for territories, pins, events and rally_config; rally_config itself is unreadable by clients',
    'o',coalesce(v_ok,false) and not v_ok2,'d','rls='||coalesce(v_ok::text,'?')||' config_client_readable='||v_ok2::text));

  ---------------------------------------------------------------- 3. THE FLAG
  select count(*) into v_n from public.rally_config;
  select assignment_server_authoritative into v_ok from public.rally_config where id;
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','3 THE FLAG',
    'p','3a assignment_server_authoritative is currently FALSE, on the one config row',
    'o',v_ok is false and v_n=1,'d','rows='||v_n||' value='||coalesce(v_ok::text,'null')));

  --------------------------------------------------------- 4. THE GATE COUNT
  --
  -- FROM HERE DOWN, EVERY PROBE IS WRAPPED. These probes read stored client
  -- JSON through the SERVER'S OWN readers, and three of those readers
  -- (rally_open_entries, rally_sort_entries, rally_mirror_assignments) sort
  -- with a raw (e->>'assignedAt')::bigint. A ledger holding an unreadable
  -- timestamp therefore makes the READER raise, and an unwrapped survey
  -- would die at the first such row instead of reporting it. A preflight
  -- that aborts on the very data it exists to find is worthless, so each
  -- probe catches its own error and reports it as a FAILURE with the reason.
  -- Such a row is a genuine blocker in any case: the assignment trigger
  -- calls the same readers, so no client can write that hood at all.
  begin
    select public.rally_unresolved_live_assignments() into v_n;
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','4 GATE COUNT',
      'p','4a rally_unresolved_live_assignments() = 0 - this is the exact count rally_config_guard will run',
      'o',v_n=0,'d',v_n::text));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','4 GATE COUNT',
      'p','4a rally_unresolved_live_assignments() = 0 - this is the exact count rally_config_guard will run',
      'o',false,'d','ERRORED: '||sqlerrm));
  end;

  ------------------------------------------------------------ 5. open_assignees
  begin
    select count(*) into v_n from public.territories x
     where x.deleted_at is null and x.archived = false
       and (select coalesce(array_agg(y order by y),'{}'::uuid[]) from unnest(x.open_assignees) y)
        is distinct from
           (select coalesce(array_agg(y order by y),'{}'::uuid[]) from unnest(public.rally_open_uuids(x.assignees, x.team_id)) y);
    select string_agg(q.id, ', ' order by q.id) into v_bad from (
      select x.id from public.territories x
       where x.deleted_at is null and x.archived = false
         and (select coalesce(array_agg(y order by y),'{}'::uuid[]) from unnest(x.open_assignees) y)
          is distinct from
             (select coalesce(array_agg(y order by y),'{}'::uuid[]) from unnest(public.rally_open_uuids(x.assignees, x.team_id)) y)
       order by x.id limit 20) q;
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','5 open_assignees',
      'p','5a every LIVE hood: open_assignees = rally_open_uuids(ledger), compared as sets',
      'o',v_n=0,'d',case when v_n=0 then '0 disagreements' else v_n||' hood(s), first 20: '||coalesce(v_bad,'') end));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','5 open_assignees',
      'p','5a every LIVE hood: open_assignees = rally_open_uuids(ledger), compared as sets',
      'o',false,'d','ERRORED (a stored ledger the server''s own reader cannot read): '||sqlerrm));
  end;

  begin
    select count(*) into v_c from public.territories x
     where not (x.deleted_at is null and x.archived = false)
       and (select coalesce(array_agg(y order by y),'{}'::uuid[]) from unnest(x.open_assignees) y)
        is distinct from
           (select coalesce(array_agg(y order by y),'{}'::uuid[]) from unnest(public.rally_open_uuids(x.assignees, x.team_id)) y);
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','5 open_assignees',
      'p','5b INFO the same on archived and tombstoned hoods - not turf today, but it would matter if one were restored',
      'o',true,'d',v_c||' disagreement(s)'));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','5 open_assignees',
      'p','5b INFO the same on archived and tombstoned hoods - not turf today, but it would matter if one were restored',
      'o',false,'d','ERRORED: '||sqlerrm));
  end;

  ---------------------------------------------------------- 6. THE v40 MIRRORS
  begin
    select count(*) into v_n from public.territories x
     where x.deleted_at is null and x.archived = false
       and x.data->'assignedTo'
        is distinct from coalesce(to_jsonb(public.rally_first_open_assignee(x.assignees)), 'null'::jsonb);
    select string_agg(q.id, ', ' order by q.id) into v_bad from (
      select x.id from public.territories x
       where x.deleted_at is null and x.archived = false
         and x.data->'assignedTo'
          is distinct from coalesce(to_jsonb(public.rally_first_open_assignee(x.assignees)), 'null'::jsonb)
       order by x.id limit 20) q;
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','6 v40 MIRRORS',
      'p','6a every LIVE hood: data.assignedTo = the first OPEN assignee in the ledger',
      'o',v_n=0,'d',case when v_n=0 then '0 disagreements' else v_n||' hood(s), first 20: '||coalesce(v_bad,'') end));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','6 v40 MIRRORS',
      'p','6a every LIVE hood: data.assignedTo = the first OPEN assignee in the ledger',
      'o',false,'d','ERRORED: '||sqlerrm));
  end;

  begin
    select count(*) into v_n from public.territories x
     where x.deleted_at is null and x.archived = false
       and (case when jsonb_typeof(x.data->'assignments') = 'array' then
              (select coalesce(jsonb_agg(jsonb_build_array(e->>'userId',
                        public.rally_ms(e->>'assignedAt')::text, public.rally_ms(e->>'unassignedAt')::text)
                      order by public.rally_ms(e->>'assignedAt'), e->>'userId',
                               coalesce(public.rally_ms(e->>'unassignedAt'), 9223372036854775807)), '[]'::jsonb)
                 from jsonb_array_elements(x.data->'assignments') e)
            else null end)
        is distinct from
           (select coalesce(jsonb_agg(jsonb_build_array(e->>'userId',
                     public.rally_ms(e->>'assignedAt')::text, public.rally_ms(e->>'unassignedAt')::text)
                   order by public.rally_ms(e->>'assignedAt'), e->>'userId',
                            coalesce(public.rally_ms(e->>'unassignedAt'), 9223372036854775807)), '[]'::jsonb)
              from jsonb_array_elements(coalesce(x.assignees->'entries','[]'::jsonb)) e);
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','6 v40 MIRRORS',
      'p','6b every LIVE hood: data.assignments holds exactly the ledger''s (userId, assignedAt, unassignedAt)',
      'o',v_n=0,'d',case when v_n=0 then '0 disagreements' else v_n||' hood(s)' end));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','6 v40 MIRRORS',
      'p','6b every LIVE hood: data.assignments holds exactly the ledger''s (userId, assignedAt, unassignedAt)',
      'o',false,'d','ERRORED: '||sqlerrm));
  end;

  begin
    select count(*) into v_c from public.territories x
     where x.deleted_at is null and x.archived = false
       and x.data->'assignments' is distinct from public.rally_mirror_assignments(x.assignees);
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','6 v40 MIRRORS',
      'p','6c INFO byte-exact mirror match. A difference here that still passes 6b is only a stale display NAME, which the next write refreshes',
      'o',true,'d',v_c||' hood(s) differ byte-exactly'));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','6 v40 MIRRORS',
      'p','6c INFO byte-exact mirror match. A difference here that still passes 6b is only a stale display NAME, which the next write refreshes',
      'o',false,'d','ERRORED: '||sqlerrm));
  end;

  ----------------------------------------------------------- 7. LEDGER SHAPE
  begin
    select count(*) into v_n from public.territories x
     where jsonb_typeof(x.assignees) <> 'object'
        or jsonb_typeof(coalesce(x.assignees->'entries','[]'::jsonb)) <> 'array';
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','7 LEDGER SHAPE',
      'p','7a every hood''s assignees is an object carrying an entries ARRAY',
      'o',v_n=0,'d',v_n||' malformed container(s)'));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','7 LEDGER SHAPE',
      'p','7a every hood''s assignees is an object carrying an entries ARRAY',
      'o',false,'d','ERRORED: '||sqlerrm));
  end;

  -- 7b reads through the TOTAL readers only (rally_ms), so this probe finds
  -- the very rows that make 5a, 6c and 7c raise. Read it first when they do.
  begin
    select count(distinct x.id) into v_n from public.territories x,
         lateral jsonb_array_elements(coalesce(x.assignees->'entries','[]'::jsonb)) e
     where jsonb_typeof(e) <> 'object'
        or coalesce(btrim(e->>'userId'),'') = ''
        or coalesce(public.rally_ms(e->>'assignedAt'), 0) <= 0
        or (e->>'unassignedAt' is not null
            and (public.rally_ms(e->>'unassignedAt') is null
                 or public.rally_ms(e->>'unassignedAt') < public.rally_ms(e->>'assignedAt')));
    select string_agg(q.id, ', ' order by q.id) into v_bad from (
      select distinct x.id from public.territories x,
           lateral jsonb_array_elements(coalesce(x.assignees->'entries','[]'::jsonb)) e
       where jsonb_typeof(e) <> 'object'
          or coalesce(btrim(e->>'userId'),'') = ''
          or coalesce(public.rally_ms(e->>'assignedAt'), 0) <= 0
          or (e->>'unassignedAt' is not null
              and (public.rally_ms(e->>'unassignedAt') is null
                   or public.rally_ms(e->>'unassignedAt') < public.rally_ms(e->>'assignedAt')))
       order by x.id limit 20) q;
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','7 LEDGER SHAPE',
      'p','7b I2/I3: every entry is an object with a non-empty userId, assignedAt > 0, and unassignedAt >= assignedAt',
      'o',v_n=0,'d',case when v_n=0 then '0 malformed entries' else v_n||' hood(s): '||coalesce(v_bad,'') end));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','7 LEDGER SHAPE',
      'p','7b I2/I3: every entry is an object with a non-empty userId, assignedAt > 0, and unassignedAt >= assignedAt',
      'o',false,'d','ERRORED: '||sqlerrm));
  end;

  begin
    select count(*) into v_n from public.territories x
     where coalesce(x.assignees->'entries','[]'::jsonb)
        is distinct from public.rally_sort_entries(coalesce(x.assignees->'entries','[]'::jsonb));
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','7 LEDGER SHAPE',
      'p','7c I5: every ledger is stored in canonical sort order',
      'o',v_n=0,'d',v_n||' unsorted'));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','7 LEDGER SHAPE',
      'p','7c I5: every ledger is stored in canonical sort order',
      'o',false,'d','ERRORED (see 7b for the row): '||sqlerrm));
  end;

  ------------------------------------------------------- 8. DUPLICATE OPENS
  begin
    select count(*) into v_n from public.territories x
     where exists (select 1 from jsonb_array_elements(coalesce(x.assignees->'entries','[]'::jsonb)) e
                    where e->>'unassignedAt' is null
                    group by e->>'userId' having count(*) > 1);
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','8 DUPLICATE OPENS',
      'p','8a I1: no rep holds two OPEN entries on one hood (raw userId - the invariant''s own test)',
      'o',v_n=0,'d',v_n||' hood(s)'));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','8 DUPLICATE OPENS',
      'p','8a I1: no rep holds two OPEN entries on one hood (raw userId - the invariant''s own test)',
      'o',false,'d','ERRORED: '||sqlerrm));
  end;

  begin
    select count(*) into v_n from public.territories x
     where exists (select 1 from jsonb_array_elements(coalesce(x.assignees->'entries','[]'::jsonb)) e
                    where e->>'unassignedAt' is null
                    group by public.rally_uid(e->>'userId') having count(*) > 1);
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','8 DUPLICATE OPENS',
      'p','8b ...and none after canonicalisation either: two spellings of one id pass 8a and then collapse in the uuid[]',
      'o',v_n=0,'d',v_n||' hood(s)'));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','8 DUPLICATE OPENS',
      'p','8b ...and none after canonicalisation either: two spellings of one id pass 8a and then collapse in the uuid[]',
      'o',false,'d','ERRORED: '||sqlerrm));
  end;

  --------------------------------------------------- 9. THE CURRENT ASSIGNEES
  begin
    select count(distinct x.id) into v_n from public.territories x,
         lateral jsonb_array_elements(coalesce(x.assignees->'entries','[]'::jsonb)) e
     where x.deleted_at is null and x.archived = false
       and e->>'unassignedAt' is null and coalesce(btrim(e->>'userId'),'') <> ''
       and not exists (select 1 from public.profiles p where p.id = public.rally_uid_uuid(e->>'userId'));
    select string_agg(q.id, ', ' order by q.id) into v_bad from (
      select distinct x.id from public.territories x,
           lateral jsonb_array_elements(coalesce(x.assignees->'entries','[]'::jsonb)) e
       where x.deleted_at is null and x.archived = false
         and e->>'unassignedAt' is null and coalesce(btrim(e->>'userId'),'') <> ''
         and not exists (select 1 from public.profiles p where p.id = public.rally_uid_uuid(e->>'userId'))
       order by x.id limit 20) q;
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','9 CURRENT ASSIGNEES',
      'p','9a no current assignee on a live hood points to a MISSING profile (a non-uuid id resolves to NULL and lands here)',
      'o',v_n=0,'d',case when v_n=0 then '0 hood(s)' else v_n||' hood(s): '||coalesce(v_bad,'') end));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','9 CURRENT ASSIGNEES',
      'p','9a no current assignee on a live hood points to a MISSING profile (a non-uuid id resolves to NULL and lands here)',
      'o',false,'d','ERRORED: '||sqlerrm));
  end;

  begin
    select count(distinct x.id) into v_b from public.territories x,
         lateral jsonb_array_elements(coalesce(x.assignees->'entries','[]'::jsonb)) e
     where x.deleted_at is null and x.archived = false
       and e->>'unassignedAt' is null and coalesce(btrim(e->>'userId'),'') <> ''
       and exists (select 1 from public.profiles p
                    where p.id = public.rally_uid_uuid(e->>'userId')
                      and p.team_id is distinct from x.team_id);
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','9 CURRENT ASSIGNEES',
      'p','9b ...nor to a profile on a DIFFERENT team, or on no team at all',
      'o',v_b=0,'d',v_b||' hood(s)'));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','9 CURRENT ASSIGNEES',
      'p','9b ...nor to a profile on a DIFFERENT team, or on no team at all',
      'o',false,'d','ERRORED: '||sqlerrm));
  end;

  begin
    select count(distinct x.id) into v_c from public.territories x,
         lateral jsonb_array_elements(coalesce(x.assignees->'entries','[]'::jsonb)) e
     where x.deleted_at is null and x.archived = false
       and e->>'unassignedAt' is null and coalesce(btrim(e->>'userId'),'') <> ''
       and exists (select 1 from public.profiles p
                    where p.id = public.rally_uid_uuid(e->>'userId')
                      and p.team_id = x.team_id and coalesce(p.disabled,false));
    select string_agg(q.id, ', ' order by q.id) into v_bad from (
      select distinct x.id from public.territories x,
           lateral jsonb_array_elements(coalesce(x.assignees->'entries','[]'::jsonb)) e
       where x.deleted_at is null and x.archived = false
         and e->>'unassignedAt' is null and coalesce(btrim(e->>'userId'),'') <> ''
         and exists (select 1 from public.profiles p
                      where p.id = public.rally_uid_uuid(e->>'userId')
                        and p.team_id = x.team_id and coalesce(p.disabled,false))
       order by x.id limit 20) q;
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','9 CURRENT ASSIGNEES',
      'p','9c ...nor to a DISABLED rep. rally_unresolved_live_assignments() does NOT test this, so 9c is STRICTER than gate 4a',
      'o',v_c=0,'d',case when v_c=0 then '0 hood(s)' else v_c||' hood(s): '||coalesce(v_bad,'') end));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','9 CURRENT ASSIGNEES',
      'p','9c ...nor to a DISABLED rep. rally_unresolved_live_assignments() does NOT test this, so 9c is STRICTER than gate 4a',
      'o',false,'d','ERRORED: '||sqlerrm));
  end;

  --------------------------------------------------------------- 10. OUTLINES
  -- 10a asks the whole question, not half of it. rally_ring_problem() reports
  -- a ring it cannot READ (too few points, a coordinate that is not a number);
  -- it does NOT report a ring that reads fine and then crosses itself. That
  -- second kind is exactly what refused Hood 19 in the field, so validity of
  -- the DERIVED geometry is tested here as well.
  begin
    select count(*) into v_n from public.territories x
     where x.deleted_at is null and x.archived = false
       and (public.rally_ring_problem(x.polygon) is not null
            or public.rally_ring_to_geom(x.polygon) is null
            or not gis.st_isvalid(public.rally_ring_to_geom(x.polygon)));
    select string_agg(q.id||' ('||q.why||')', '; ' order by q.id) into v_bad from (
      select x.id,
             left(coalesce(public.rally_ring_problem(x.polygon),
                           case when public.rally_ring_to_geom(x.polygon) is null then 'no geometry'
                                else gis.st_isvalidreason(public.rally_ring_to_geom(x.polygon)) end), 80) why
        from public.territories x
       where x.deleted_at is null and x.archived = false
         and (public.rally_ring_problem(x.polygon) is not null
              or public.rally_ring_to_geom(x.polygon) is null
              or not gis.st_isvalid(public.rally_ring_to_geom(x.polygon)))
       order by x.id limit 10) q;
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','10 OUTLINES',
      'p','10a every LIVE hood outline is readable AND valid - it can be read, it makes a polygon, and that polygon does not cross itself',
      'o',v_n=0,'d',case when v_n=0 then '0 bad outlines' else v_n||': '||coalesce(v_bad,'') end));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','10 OUTLINES',
      'p','10a every LIVE hood outline is readable AND valid - it can be read, it makes a polygon, and that polygon does not cross itself',
      'o',false,'d','ERRORED: '||sqlerrm));
  end;

  begin
    select count(*) into v_b from public.territories x
     where x.deleted_at is null and x.archived = false and x.geom is null;
    select string_agg(q.id, ', ' order by q.id) into v_bad from (
      select x.id from public.territories x
       where x.deleted_at is null and x.archived = false and x.geom is null
       order by x.id limit 20) q;
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','10 OUTLINES',
      'p','10b no LIVE hood has a NULL geom - the overlap rule cannot see one, so it would be unprotected turf',
      'o',v_b=0,'d',case when v_b=0 then '0 null geom(s)' else v_b||': '||coalesce(v_bad,'') end));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','10 OUTLINES',
      'p','10b no LIVE hood has a NULL geom - the overlap rule cannot see one, so it would be unprotected turf',
      'o',false,'d','ERRORED: '||sqlerrm));
  end;

  begin
    select count(*) into v_c from public.territories x
     where x.deleted_at is null and x.archived = false and x.geom is not null
       and not gis.st_isvalid(x.geom);
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','10 OUTLINES',
      'p','10c every stored LIVE geom is a VALID geometry',
      'o',v_c=0,'d',v_c||' invalid'));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','10 OUTLINES',
      'p','10c every stored LIVE geom is a VALID geometry',
      'o',false,'d','ERRORED: '||sqlerrm));
  end;

  begin
    select count(*) into v_d from public.territories x
     where x.deleted_at is null and x.archived = false and x.geom is not null
       and public.rally_ring_to_geom(x.polygon) is not null
       and not gis.st_equals(x.geom, public.rally_ring_to_geom(x.polygon));
    select string_agg(q.id, ', ' order by q.id) into v_bad from (
      select x.id from public.territories x
       where x.deleted_at is null and x.archived = false and x.geom is not null
         and public.rally_ring_to_geom(x.polygon) is not null
         and not gis.st_equals(x.geom, public.rally_ring_to_geom(x.polygon))
       order by x.id limit 20) q;
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','10 OUTLINES',
      'p','10d no LIVE geom is STALE - the rule guards the stored geom, so it must still be the polygon on screen',
      'o',v_d=0,'d',case when v_d=0 then '0 stale' else v_d||': '||coalesce(v_bad,'') end));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','10 OUTLINES',
      'p','10d no LIVE geom is STALE - the rule guards the stored geom, so it must still be the polygon on screen',
      'o',false,'d','ERRORED: '||sqlerrm));
  end;

  --------------------------------------------------------------- 11. OVERLAPS
  begin
    select count(*) into v_n from public.territories a join public.territories z2
        on a.team_id = z2.team_id and a.id < z2.id
     where a.deleted_at is null and a.archived = false and a.geom is not null
       and z2.deleted_at is null and z2.archived = false and z2.geom is not null
       and a.geom operator(gis.&&) z2.geom
       and public.rally_overlap_m2(a.geom, z2.geom) > public.rally_overlap_tolerance_m2();
    select string_agg(q.pair, '; ') into v_bad from (
      select a.id||' / '||z2.id||' = '||round(public.rally_overlap_m2(a.geom, z2.geom)::numeric,2)||' m2' pair
        from public.territories a join public.territories z2
          on a.team_id = z2.team_id and a.id < z2.id
       where a.deleted_at is null and a.archived = false and a.geom is not null
         and z2.deleted_at is null and z2.archived = false and z2.geom is not null
         and a.geom operator(gis.&&) z2.geom
         and public.rally_overlap_m2(a.geom, z2.geom) > public.rally_overlap_tolerance_m2()
       limit 10) q;
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','11 OVERLAPS',
      'p','11a no LIVE pair overlaps by more than the 1.0 m2 tolerance',
      'o',v_n=0,'d',case when v_n=0 then '0 forbidden overlaps' else v_n||': '||coalesce(v_bad,'') end));
  exception when others then
    v_res := v_res || jsonb_build_array(jsonb_build_object('s','11 OVERLAPS',
      'p','11a no LIVE pair overlaps by more than the 1.0 m2 tolerance',
      'o',false,'d','ERRORED (see 12a for the pair): '||sqlerrm));
  end;

  ---------------------------------------------------------- 12. MEASURABILITY
  v_n := 0; v_c := 0; v_bad := null;
  for v_row in
    select a.id ia, z2.id ib, a.geom ga, z2.geom gb
      from public.territories a join public.territories z2
        on a.team_id = z2.team_id and a.id < z2.id
     where a.deleted_at is null and a.archived = false and a.geom is not null
       and z2.deleted_at is null and z2.archived = false and z2.geom is not null
       and a.geom operator(gis.&&) z2.geom
  loop
    v_c := v_c + 1;
    begin
      perform public.rally_overlap_m2(v_row.ga, v_row.gb);
    exception when others then
      v_n := v_n + 1;
      v_bad := coalesce(v_bad||', ','') || v_row.ia||' / '||v_row.ib;
    end;
  end loop;
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','12 MEASURABILITY',
    'p','12a every LIVE candidate pair is measurable. 0016 fails CLOSED, so an unmeasurable pair would refuse writes to both hoods',
    'o',v_n=0,'d',v_c||' candidate pair(s) measured, '||v_n||' unmeasurable'||coalesce(': '||v_bad,'')));

  ------------------------------------------------------- 13. STAGE C TRIGGER
  select count(*) into v_n from pg_trigger
   where tgrelid='public.territories'::regclass and tgname='territories_no_overlap'
     and tgenabled='O' and tgdeferrable and tginitdeferred and tgconstraint <> 0::oid;
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','13 STAGE C TRIGGER',
    'p','13a territories_no_overlap is a CONSTRAINT trigger, ENABLED, DEFERRABLE INITIALLY DEFERRED',
    'o',v_n=1,'d',v_n||' of 1'));

  select public.rally_overlap_tolerance_m2()::text into v_txt;
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','13 STAGE C TRIGGER',
    'p','13b the tolerance is exactly 1.0 m2',
    'o',v_txt = '1','d',v_txt));

  --------------------------------------------------------- 14. CAPABILITIES
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','14 CAPABILITIES',
    'p','14a rally_capabilities() reports turfRpc = TRUE',
    'o',coalesce((v_cap->>'turfRpc')::boolean,false),'d',coalesce(v_cap->>'turfRpc','null')));
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','14 CAPABILITIES',
    'p','14b rally_capabilities() reports assignmentServerAuthoritative = FALSE',
    'o',coalesce((v_cap->>'assignmentServerAuthoritative')::boolean,true) is false,
    'd',coalesce(v_cap->>'assignmentServerAuthoritative','null')));
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','14 CAPABILITIES',
    'p','14c INFO the whole capability object every client reads',
    'o',true,'d',v_cap::text));

  ---------------------------------------------------------------- THE VERDICT
  select count(*) into v_n from jsonb_array_elements(v_res) x where not (x->>'o')::boolean;
  v_res := v_res || jsonb_build_array(jsonb_build_object('s','== VERDICT ==',
    'p',case when v_n = 0 then 'GO - every proof holds.'
             else 'NO-GO - '||v_n||' proof(s) failed. Do NOT flip.' end,
    'o',v_n=0,
    'd',case when v_n=0 then 'The stored ledger already IS what every client sees, so turning on server authority changes no hood''s assignment. It only stops a phone from authoring one.'
             else 'Read the *** FAIL *** rows above.' end));

  return query select (x->>'s')::text, (x->>'p')::text,
                      case when (x->>'o')::boolean then 'PASS' else '*** FAIL ***' end,
                      (x->>'d')::text
                 from jsonb_array_elements(v_res) x;
end $$;

select * from pg_temp.flip_preflight();
