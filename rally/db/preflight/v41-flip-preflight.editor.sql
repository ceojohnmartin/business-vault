-- RALLY v41 - FINAL ASSIGNMENT-AUTHORITY FLIP PREFLIGHT (Supabase SQL Editor).
-- STRICTLY READ-ONLY. Every statement is a SELECT. Three pg_temp functions,
-- which die with the session. Nothing written; the flag is never touched.
--
-- WHAT THE FLIP CHANGES: one branch of territories_assignment. Today an
-- ordinary client upsert DERIVES the ledger from the phone's legacy mirror
-- (data.assignments). After the flip it cannot - the stored ledger is truth,
-- a client's mirror is ignored, and open_assignees plus both v40 mirrors are
-- rebuilt from the ledger alone. From that moment a wrong ledger can no
-- longer be repaired by any phone; only set_territory_assignments,
-- save_territory or a split can move it. So every proof is one question:
-- IS THE STORED LEDGER ALREADY RIGHT, AND ALREADY WHAT EVERY CLIENT SEES?
--
-- THREE THINGS THIS CANNOT SEE, so the verdict must not be read as covering
-- them:
--  (i)   AN UNDRAINED OUTBOX. While the flag is false a leader's assignment
--        is an ordinary upsert, not an RPC. A row still queued at the moment
--        of the flip arrives afterwards, where the server-authority branch
--        IGNORES its data.assignments - the assignment is silently dropped
--        and the rep quietly loses that turf. Probe 1e shows how quiet the
--        table is; only the phones know. Drain them.
--  (ii)  THE LATCH IS ONE-WAY FOR THE FLEET. syncCapabilities only ever
--        writes a capability TRUE, and only a full erase clears it. Setting
--        the flag back to false does NOT restore the pre-flip world.
--  (iii) WHICH BUNDLE EACH PHONE LOADED. See probe 1d.
--
-- Read the LAST row first. It is the verdict.

create or replace function pg_temp.ent(p_assignees jsonb)
returns jsonb language sql immutable as $$
  -- the entries array or an empty one. coalesce is NOT enough: an "entries"
  -- that is an object, a scalar or JSON null would make jsonb_array_elements
  -- raise - the very state probe 7a exists to report.
  select case when jsonb_typeof(p_assignees->'entries') = 'array'
              then p_assignees->'entries' else '[]'::jsonb end
$$;

create or replace function pg_temp.ov(a gis.geometry, b gis.geometry)
returns double precision language plpgsql as $$
begin
  -- 0016's rally_overlap_m2 FAILS CLOSED: an unmeasurable pair raises rather
  -- than reporting zero. Right for a write, wrong for a survey - here it
  -- becomes NULL so probes 11a and 12a are independent.
  return public.rally_overlap_m2(a, b);
exception when others then return null;
end $$;

create or replace function pg_temp.flip_preflight()
returns table(section text, probe text, result text, detail text)
language plpgsql as $$
declare
  v_res jsonb := '[]'::jsonb;
  v_s   text; v_p text; v_txt text; v_bad text; v_cap jsonb;
  v_n   bigint; v_b bigint; v_c bigint; v_d bigint;
  v_ok  boolean; v_ok2 boolean;
  v_stage constant text[] := array[
    'A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A',
    'B','B','B','B','B','B','B','B','B','B','B','B','B','B','B','C','C','C'];
  v_name constant text[] := array[
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
  -- what a client MUST still be able to call: after the flip these are the
  -- only ways a ledger can move
  v_granted constant text[] := array['set_territory_assignments','save_territory',
    'start_territory_cycle','clear_pin_dnk','smart_split_territory_v41','smart_split_territory',
    'rally_capabilities','rally_overlap_m2'];
  -- every gate, internal, trigger body and split helper a client must not reach
  v_ungranted constant text[] := array['rally_unresolved_live_assignments','assert_no_turf_overlap',
    'rally_require_leader','rally_my_team','rally_diff_assignees','rally_validate_assignees',
    'rally_config_guard','territories_assignment','territories_derive_geom','pins_protect_dnk',
    'events_guard_dnk_clear','smart_split_territory_core','rally_split_inherit',
    'rally_split_strip_children'];
  -- 0012 grants insert/update on EXACTLY these. Asserted as the complement,
  -- so it cannot go stale the way a hand-kept "sealed" list can.
  v_writable constant text[] := array['team_id','id','name','polygon','homes','archived',
    'created_by','deleted_at','data'];
begin

-- ============================================================ 1. v41 CLIENT
v_s := '1 v41 CLIENT';
v_p := '1a the server advertises turfRpc, which is what makes a v41 client use the v41 RPCs';
begin
  v_cap := case when to_regprocedure('public.rally_capabilities()') is null
                then '{}'::jsonb else public.rally_capabilities() end;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,
    'o',coalesce((v_cap->>'turfRpc')::boolean,false),
    'd',coalesce(v_cap->>'turfRpc','ABSENT - rally_capabilities() could not be read'));
exception when others then v_cap := '{}'::jsonb;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_p := '1b a real phone has called clear_pin_dnk - only a v41 client can, and only the server mints these ids';
begin
  select count(*), max(at_ms) into v_n, v_b
    from public.events where type = 'dnk_clear' and id like 'dnkclear-%';
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n > 0,
    'd',v_n||' server-minted dnk_clear event(s); newest '||
        case when v_b between 0 and 253402300799999
             then to_char(to_timestamp(v_b/1000.0) at time zone 'UTC','YYYY-MM-DD HH24:MI')||'Z'
             else coalesce(v_b::text,'-') end);
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_p := '1c INFO ledger entries carrying v41-only provenance (a v40 mirror cannot express these)';
begin
  select count(*) into v_n from public.territories x,
       lateral jsonb_array_elements(pg_temp.ent(x.assignees)) e
   where e ? 'viaSplit' or e ? 'viaOperation' or e ? 'inheritedFromTerritoryId';
  select count(*) into v_c from public.territories x,
       lateral jsonb_array_elements(pg_temp.ent(x.assignees)) e
   where e ? 'assignedByName' or e ? 'userIdResolved';
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',true,
    'd',v_n||' split-inheritance, '||v_c||' assignedByName/userIdResolved');
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_res := v_res || jsonb_build_object('s',v_s,
  'p','1d LIMIT the database cannot see which bundle a phone loaded, NOR what is still in its outbox',
  'o',true,'d','1a-1c prove the v41 SERVER paths are live and have been exercised by a real client. Two things stay client-side: the build each iPhone loaded (read "Build vNN" on the More tab), and any un-pushed assignment sitting in an outbox - see (i) in the header. Drain every leader phone before the flip.');

v_p := '1e INFO how recently turf was written. A quiet table is weak evidence that the phones are drained; it is not proof';
begin
  select count(*) into v_n from public.territories where updated_at > now() - interval '15 minutes';
  select to_char(max(updated_at) at time zone 'UTC','YYYY-MM-DD HH24:MI')||'Z' into v_txt
    from public.territories;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',true,
    'd',v_n||' hood(s) written in the last 15 minutes; newest write '||coalesce(v_txt,'-'));
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

-- ======================================================== 2. STAGE A/B/C
v_s := '2 STAGE A/B/C';
select string_agg(u.st||':'||u.nm, ', ' order by u.st, u.nm) into v_bad
  from unnest(v_stage, v_name) u(st, nm)
 where not exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
                    where ns.nspname = 'public' and p.proname = u.nm);
v_res := v_res || jsonb_build_object('s',v_s,
  'p','2a every Stage A, B and C function is present (missing ones named)','o',v_bad is null,
  'd',coalesce('MISSING: '||v_bad, array_length(v_name,1)||' of '||array_length(v_name,1)||' present'));

select not p.prosecdef into v_ok from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
 where ns.nspname='public' and p.proname='territories_assignment';
v_res := v_res || jsonb_build_object('s',v_s,
  'p','2b territories_assignment is SECURITY INVOKER - the whole flip is meaningless if it is not',
  'o',coalesce(v_ok,false),'d',case when v_ok then 'invoker' when v_ok is null then 'ABSENT'
    else 'DEFINER: current_user would be the owner on every path, so every client upsert would count as an authoritative RPC' end);

select position('rally_keep_open_history' in p.prosrc) > 0 into v_ok
  from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
 where ns.nspname='public' and p.proname='territories_assignment';
v_res := v_res || jsonb_build_object('s',v_s,
  'p','2c territories_assignment carries the 0017 body: an OPEN entry the phone''s mirror omits is closed, never deleted',
  'o',coalesce(v_ok,false),'d','rally_keep_open_history '||case when v_ok then 'present' else 'ABSENT' end);

select position('v_auth or v_via_rpc' in p.prosrc) = 0 into v_ok
  from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
 where ns.nspname='public' and p.proname='territories_assignment';
v_res := v_res || jsonb_build_object('s',v_s,
  'p','2d the correction stamp is UNGUARDED (0017) - a correction the client''s clock reads as "same" is a stranded device',
  'o',coalesce(v_ok,false),'d',case when v_ok then 'fires on any real correction' else 'STILL GUARDED by the authority test' end);

select position('rally_keep_server_clears' in p.prosrc) > 0 into v_ok
  from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
 where ns.nspname='public' and p.proname='pins_protect_dnk';
v_res := v_res || jsonb_build_object('s',v_s,
  'p','2e pins_protect_dnk carries the 0017 body: a cleared door stays cleared',
  'o',coalesce(v_ok,false),'d','rally_keep_server_clears '||case when v_ok then 'present' else 'ABSENT' end);

-- 'O' is enabled, 'A' is ENABLE ALWAYS. Both fire; only 'D' and 'R' do not.
select count(*) into v_n from pg_trigger
 where tgrelid='public.territories'::regclass and not tgisinternal
   and tgname in ('territories_assignment','territories_derive_geom','territories_no_overlap')
   and tgenabled in ('O','A');
select string_agg(tgname||'='||tgenabled::text, ', ' order by tgname) into v_bad from pg_trigger
 where tgrelid='public.territories'::regclass and not tgisinternal and tgenabled not in ('O','A');
v_res := v_res || jsonb_build_object('s',v_s,'p','2f all three territories triggers are ENABLED',
  'o',v_n=3 and v_bad is null,'d',v_n||' of 3 enabled'||coalesce('; DISABLED: '||v_bad,''));

select count(*) into v_n from pg_trigger
 where tgrelid='public.rally_config'::regclass and tgname='rally_config_guard'
   and tgenabled in ('O','A') and (tgtype & 2)<>0 and (tgtype & 4)<>0 and (tgtype & 16)<>0;
v_res := v_res || jsonb_build_object('s',v_s,
  'p','2g THE ACTIVATION GATE ITSELF: rally_config_guard is on rally_config, enabled, BEFORE INSERT OR UPDATE',
  'o',v_n=1,'d',case when v_n=1 then 'armed - the flip refuses itself if any live hood has an unresolvable current assignee'
                     else 'NOT ARMED, or wired to the wrong event - the flip would proceed unchecked' end);

select count(*) into v_n from pg_trigger
 where tgrelid='public.pins'::regclass and tgname='pins_protect_dnk' and tgenabled in ('O','A');
select count(*) into v_c from pg_trigger
 where tgrelid='public.events'::regclass and tgname='events_guard_dnk_clear' and tgenabled in ('O','A');
v_res := v_res || jsonb_build_object('s',v_s,'p','2h the do-not-knock triggers on pins and events are enabled',
  'o',v_n=1 and v_c=1,'d','pins '||v_n||'/1, events '||v_c||'/1');

-- a DEFINER function with NO proconfig yields NULL under bool_and, which the
-- aggregate would silently skip. Counted, not aggregated.
select count(*) filter (where p.prosecdef
                          and coalesce(array_to_string(p.proconfig,','),'') = 'search_path=""') = 3
   and count(*) = 3 into v_ok
  from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
 where ns.nspname='public'
   and p.proname in ('rally_capabilities','rally_unresolved_live_assignments','rally_config_guard');
select string_agg(p.proname, ', ' order by p.proname) into v_bad
  from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
 where ns.nspname='public'
   and p.proname in ('rally_capabilities','rally_unresolved_live_assignments','rally_config_guard')
   and not (p.prosecdef and coalesce(array_to_string(p.proconfig,','),'') = 'search_path=""');
v_res := v_res || jsonb_build_object('s',v_s,
  'p','2i all three of the flag reader, the gate count and the gate are SECURITY DEFINER with a pinned search_path',
  'o',coalesce(v_ok,false),'d',coalesce('OFFENDING: '||v_bad,'all 3 definer + pinned'));

select string_agg(g, ', ' order by g) into v_bad from unnest(v_granted) g
 where not exists (select 1 from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
                    where ns.nspname='public' and p.proname=g
                      and has_function_privilege('authenticated', p.oid, 'EXECUTE'));
v_res := v_res || jsonb_build_object('s',v_s,
  'p','2j a signed-in client CAN still call every function that becomes the only way to move a ledger',
  'o',v_bad is null,'d',coalesce('NOT GRANTED: '||v_bad,'all '||array_length(v_granted,1)||' granted'));

select string_agg(p.proname, ', ' order by p.proname) into v_bad
  from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
 where ns.nspname='public' and p.proname = any(v_ungranted)
   and has_function_privilege('authenticated', p.oid, 'EXECUTE');
v_res := v_res || jsonb_build_object('s',v_s,
  'p','2k a client can call NONE of the gates, the internals, the trigger bodies or the split helpers',
  'o',v_bad is null,'d',coalesce('REACHABLE: '||v_bad,'none of the '||array_length(v_ungranted,1)||' reachable'));

select string_agg(p.proname, ', ' order by p.proname) into v_bad
  from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
 where ns.nspname='public' and p.proname = any(v_name)
   and has_function_privilege('anon', p.oid, 'EXECUTE');
v_res := v_res || jsonb_build_object('s',v_s,'p','2l anon can execute none of the Stage A/B/C functions',
  'o',v_bad is null,'d',coalesce('REACHABLE BY anon: '||v_bad,'none reachable'));

select string_agg(a.attname, ', ' order by a.attname) into v_bad
  from pg_attribute a
 where a.attrelid = 'public.territories'::regclass and a.attnum > 0 and not a.attisdropped
   and not (a.attname = any(v_writable))
   and (has_column_privilege('authenticated','public.territories', a.attname, 'UPDATE')
     or has_column_privilege('authenticated','public.territories', a.attname, 'INSERT'));
v_res := v_res || jsonb_build_object('s',v_s,
  'p','2m a client may write ONLY 0012''s nine columns - the ledger, geom and the clocks are sealed',
  'o',v_bad is null,'d',coalesce('ALSO CLIENT-WRITABLE: '||v_bad,
    'assignees, assignees_rev, open_assignees, geom, cycle_started_at, created_at, updated_at all sealed'));

select bool_and(relrowsecurity) into v_ok from pg_class
 where oid in ('public.territories'::regclass,'public.pins'::regclass,
               'public.events'::regclass,'public.rally_config'::regclass);
v_ok2 := has_table_privilege('authenticated','public.rally_config','SELECT')
      or has_table_privilege('anon','public.rally_config','SELECT');
v_res := v_res || jsonb_build_object('s',v_s,
  'p','2n RLS is on for territories, pins, events and rally_config; rally_config itself is unreadable by clients',
  'o',coalesce(v_ok,false) and not v_ok2,
  'd','rls='||coalesce(v_ok::text,'?')||' config_client_readable='||v_ok2::text);

-- ============================================================= 3. THE FLAG
v_s := '3 THE FLAG';
v_p := '3a assignment_server_authoritative is currently FALSE, on the one config row';
begin
  select count(*) into v_n from public.rally_config;
  select assignment_server_authoritative into v_ok from public.rally_config where id;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_ok is false and v_n=1,
    'd','rows='||v_n||' value='||coalesce(v_ok::text,'null'));
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

-- ========================================================= 4. THE GATE COUNT
-- FROM HERE DOWN EVERY PROBE IS WRAPPED. These probes read stored client JSON
-- through the SERVER'S OWN readers, and three of those (rally_open_entries,
-- rally_sort_entries, rally_mirror_assignments) sort with a raw
-- (e->>'assignedAt')::bigint. A ledger holding an unreadable timestamp makes
-- the READER raise, and an unwrapped survey would die at the first such row
-- instead of reporting it. Such a row is a blocker either way: the assignment
-- trigger calls the same readers, so no client can write that hood at all.
-- When you see ERRORED, read probe 7b - it uses only the total readers and
-- names the row.
v_s := '4 GATE COUNT';
v_p := '4a rally_unresolved_live_assignments() = 0 - the exact count rally_config_guard runs INSIDE the flip''s own UPDATE, so a hood that goes bad between now and the flip does not slip through: the flip refuses itself. What the gate does NOT do is hold the invariant open afterwards - it fires once, and a BRAND-NEW hood stays client-authored under either flag (0017 keeps the INSERT branch), so re-run this probe after the flip and periodically';
begin
  select public.rally_unresolved_live_assignments() into v_n;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,'d',v_n::text);
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

-- ======================================================== 5. open_assignees
v_s := '5 open_assignees';
v_p := '5a every LIVE hood: open_assignees = rally_open_uuids(ledger), compared as SETS';
begin
  select count(*) into v_n from public.territories x
   where x.deleted_at is null and x.archived = false
     and (select coalesce(array_agg(distinct y order by y),'{}'::uuid[]) from unnest(x.open_assignees) y)
      is distinct from
         (select coalesce(array_agg(distinct y order by y),'{}'::uuid[])
            from unnest(public.rally_open_uuids(x.assignees, x.team_id)) y);
  select string_agg(q.id, ', ' order by q.id) into v_bad from (
    select x.id from public.territories x
     where x.deleted_at is null and x.archived = false
       and (select coalesce(array_agg(distinct y order by y),'{}'::uuid[]) from unnest(x.open_assignees) y)
        is distinct from
           (select coalesce(array_agg(distinct y order by y),'{}'::uuid[])
              from unnest(public.rally_open_uuids(x.assignees, x.team_id)) y)
     order by x.id limit 20) q;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,
    'd',case when v_n=0 then '0 disagreements' else v_n||' hood(s), first 20: '||coalesce(v_bad,'') end);
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,
    'd','ERRORED (a stored ledger the server''s own reader cannot read - see 7b): '||sqlerrm); end;

v_p := '5b no hood''s open_assignees carries a DUPLICATE uuid (rally_open_uuids cannot produce one; a direct write could)';
begin
  -- array_length of an EMPTY array is NULL, not 0: without the coalesce every
  -- unassigned hood would read as carrying a duplicate
  select count(*) into v_n from public.territories x
   where coalesce(array_length(x.open_assignees,1),0)
      is distinct from (select count(distinct y) from unnest(x.open_assignees) y);
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,'d',v_n||' hood(s)');
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

-- ======================================================== 6. THE v40 MIRRORS
v_s := '6 v40 MIRRORS';
v_p := '6a every LIVE hood: data.assignedTo = the first OPEN assignee in the ledger';
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
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,
    'd',case when v_n=0 then '0 disagreements' else v_n||' hood(s), first 20: '||coalesce(v_bad,'') end);
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED (see 7b): '||sqlerrm); end;

v_p := '6b every LIVE hood: data.assignments holds exactly the ledger''s (userId, assignedAt, unassignedAt)';
begin
  select count(*) into v_n from public.territories x
   where x.deleted_at is null and x.archived = false
     and (select coalesce(jsonb_agg(jsonb_build_array(e->>'userId',
                   public.rally_ms(e->>'assignedAt')::text, public.rally_ms(e->>'unassignedAt')::text)
                 order by public.rally_ms(e->>'assignedAt'), e->>'userId',
                          coalesce(public.rally_ms(e->>'unassignedAt'), 9223372036854775807)), '[]'::jsonb)
            from jsonb_array_elements(case when jsonb_typeof(x.data->'assignments') = 'array'
                                           then x.data->'assignments' else '[]'::jsonb end) e)
      is distinct from
         (select coalesce(jsonb_agg(jsonb_build_array(e->>'userId',
                   public.rally_ms(e->>'assignedAt')::text, public.rally_ms(e->>'unassignedAt')::text)
                 order by public.rally_ms(e->>'assignedAt'), e->>'userId',
                          coalesce(public.rally_ms(e->>'unassignedAt'), 9223372036854775807)), '[]'::jsonb)
            from jsonb_array_elements(pg_temp.ent(x.assignees)) e);
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,
    'd',case when v_n=0 then '0 disagreements' else v_n||' hood(s)' end);
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_p := '6c every LIVE hood HAS a data.assignments array - a row missing it never went through the assignment trigger';
begin
  select count(*) into v_n from public.territories x
   where x.deleted_at is null and x.archived = false
     and jsonb_typeof(x.data->'assignments') is distinct from 'array';
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,'d',v_n||' hood(s) with no assignments array');
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_p := '6d INFO byte-exact mirror match. A difference here that still passes 6b is only a stale display NAME, which the next write refreshes';
begin
  select count(*) into v_c from public.territories x
   where x.deleted_at is null and x.archived = false
     and x.data->'assignments' is distinct from public.rally_mirror_assignments(x.assignees);
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',true,'d',v_c||' hood(s) differ byte-exactly');
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED (see 7b): '||sqlerrm); end;

-- ========================================================= 7. LEDGER SHAPE
v_s := '7 LEDGER SHAPE';
v_p := '7a every hood''s assignees is an object carrying an entries ARRAY';
begin
  select count(*) into v_n from public.territories x
   where jsonb_typeof(x.assignees) <> 'object' or jsonb_typeof(x.assignees->'entries') <> 'array';
  select string_agg(q.id, ', ' order by q.id) into v_bad from (
    select x.id from public.territories x
     where jsonb_typeof(x.assignees) <> 'object' or jsonb_typeof(x.assignees->'entries') <> 'array'
     order by x.id limit 20) q;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,
    'd',case when v_n=0 then '0 malformed containers' else v_n||': '||coalesce(v_bad,'') end);
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

-- 7b reads through the TOTAL readers only, so it finds the very rows that
-- make 5a, 6a, 6d and 7c raise. Read it first when they do.
v_p := '7b I2/I3: every entry is an object with a non-empty userId, assignedAt > 0, and unassignedAt >= assignedAt';
begin
  select count(distinct x.id) into v_n from public.territories x,
       lateral jsonb_array_elements(pg_temp.ent(x.assignees)) e
   where jsonb_typeof(e) <> 'object'
      or coalesce(btrim(e->>'userId'),'') = ''
      or coalesce(public.rally_ms(e->>'assignedAt'), 0) <= 0
      or (e->>'unassignedAt' is not null
          and (public.rally_ms(e->>'unassignedAt') is null
               or public.rally_ms(e->>'unassignedAt') < public.rally_ms(e->>'assignedAt')));
  select string_agg(q.id, ', ' order by q.id) into v_bad from (
    select distinct x.id from public.territories x,
         lateral jsonb_array_elements(pg_temp.ent(x.assignees)) e
     where jsonb_typeof(e) <> 'object'
        or coalesce(btrim(e->>'userId'),'') = ''
        or coalesce(public.rally_ms(e->>'assignedAt'), 0) <= 0
        or (e->>'unassignedAt' is not null
            and (public.rally_ms(e->>'unassignedAt') is null
                 or public.rally_ms(e->>'unassignedAt') < public.rally_ms(e->>'assignedAt')))
     order by x.id limit 20) q;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,
    'd',case when v_n=0 then '0 malformed entries' else v_n||' hood(s): '||coalesce(v_bad,'') end);
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

-- compared as sorted MULTISETS with a total tiebreak, so two entries
-- rally_sort_entries cannot order relative to each other do not read as
-- "unsorted" merely because the stored array picked the other one first
v_p := '7c I5: every ledger is stored in canonical sort order';
begin
  select count(*) into v_n from public.territories x
   where (select coalesce(jsonb_agg(e order by public.rally_ms(e->>'assignedAt'),
                    e->>'userId', public.rally_ms(e->>'unassignedAt'), e::text), '[]'::jsonb)
            from jsonb_array_elements(pg_temp.ent(x.assignees)) e)
      is distinct from
         (select coalesce(jsonb_agg(e order by public.rally_ms(e->>'assignedAt'),
                    e->>'userId', public.rally_ms(e->>'unassignedAt'), e::text), '[]'::jsonb)
            from jsonb_array_elements(public.rally_sort_entries(pg_temp.ent(x.assignees))) e)
      or pg_temp.ent(x.assignees) is distinct from public.rally_sort_entries(pg_temp.ent(x.assignees));
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,'d',v_n||' unsorted');
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED (see 7b for the row): '||sqlerrm); end;

-- ====================================================== 8. DUPLICATE OPENS
v_s := '8 DUPLICATE OPENS';
v_p := '8a I1: no rep holds two OPEN entries on one hood (raw userId - the invariant''s own test)';
begin
  select count(*) into v_n from public.territories x
   where exists (select 1 from jsonb_array_elements(pg_temp.ent(x.assignees)) e
                  where e->>'unassignedAt' is null
                  group by e->>'userId' having count(*) > 1);
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,'d',v_n||' hood(s)');
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_p := '8b ...and none after canonicalisation either: two spellings of one id pass 8a and then collapse in the uuid[]';
begin
  select count(*) into v_n from public.territories x
   where exists (select 1 from jsonb_array_elements(pg_temp.ent(x.assignees)) e
                  where e->>'unassignedAt' is null
                  group by public.rally_uid(e->>'userId') having count(*) > 1);
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,'d',v_n||' hood(s)');
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

-- =================================================== 9. CURRENT ASSIGNEES
v_s := '9 CURRENT ASSIGNEES';
v_p := '9a no current assignee on a LIVE hood points to a MISSING profile (a non-uuid id resolves to NULL and lands here)';
begin
  select count(distinct x.id) into v_n from public.territories x,
       lateral jsonb_array_elements(pg_temp.ent(x.assignees)) e
   where x.deleted_at is null and x.archived = false
     and e->>'unassignedAt' is null and coalesce(btrim(e->>'userId'),'') <> ''
     and not exists (select 1 from public.profiles p where p.id = public.rally_uid_uuid(e->>'userId'));
  select string_agg(q.id, ', ' order by q.id) into v_bad from (
    select distinct x.id from public.territories x,
         lateral jsonb_array_elements(pg_temp.ent(x.assignees)) e
     where x.deleted_at is null and x.archived = false
       and e->>'unassignedAt' is null and coalesce(btrim(e->>'userId'),'') <> ''
       and not exists (select 1 from public.profiles p where p.id = public.rally_uid_uuid(e->>'userId'))
     order by x.id limit 20) q;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,
    'd',case when v_n=0 then '0 hood(s)' else v_n||' hood(s): '||coalesce(v_bad,'') end);
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_p := '9b ...nor to a profile on a DIFFERENT team, or on no team at all';
begin
  select count(distinct x.id) into v_b from public.territories x,
       lateral jsonb_array_elements(pg_temp.ent(x.assignees)) e
   where x.deleted_at is null and x.archived = false
     and e->>'unassignedAt' is null and coalesce(btrim(e->>'userId'),'') <> ''
     and exists (select 1 from public.profiles p where p.id = public.rally_uid_uuid(e->>'userId')
                                                  and p.team_id is distinct from x.team_id);
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_b=0,'d',v_b||' hood(s)');
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_p := '9c ...nor to a DISABLED rep. rally_unresolved_live_assignments() does NOT test this, so 9c is STRICTER than gate 4a';
begin
  select count(distinct x.id) into v_c from public.territories x,
       lateral jsonb_array_elements(pg_temp.ent(x.assignees)) e
   where x.deleted_at is null and x.archived = false
     and e->>'unassignedAt' is null and coalesce(btrim(e->>'userId'),'') <> ''
     and exists (select 1 from public.profiles p where p.id = public.rally_uid_uuid(e->>'userId')
                                                  and p.team_id = x.team_id and coalesce(p.disabled,false));
  select string_agg(q.id, ', ' order by q.id) into v_bad from (
    select distinct x.id from public.territories x,
         lateral jsonb_array_elements(pg_temp.ent(x.assignees)) e
     where x.deleted_at is null and x.archived = false
       and e->>'unassignedAt' is null and coalesce(btrim(e->>'userId'),'') <> ''
       and exists (select 1 from public.profiles p where p.id = public.rally_uid_uuid(e->>'userId')
                                                    and p.team_id = x.team_id and coalesce(p.disabled,false))
     order by x.id limit 20) q;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_c=0,
    'd',case when v_c=0 then '0 hood(s)' else v_c||' hood(s): '||coalesce(v_bad,'') end);
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

-- archived and tombstoned hoods are not turf today, so this is not a gate. It
-- is here because after the flip the stored ledger is what a RESTORED hood
-- comes back with, and nothing on the restore path repairs it.
v_p := '9d INFO the same over ARCHIVED and TOMBSTONED hoods. Not turf today; this is what one would be restored with';
begin
  select count(distinct x.id) into v_n from public.territories x,
       lateral jsonb_array_elements(pg_temp.ent(x.assignees)) e
   where not (x.deleted_at is null and x.archived = false)
     and e->>'unassignedAt' is null and coalesce(btrim(e->>'userId'),'') <> ''
     and not exists (select 1 from public.profiles p where p.id = public.rally_uid_uuid(e->>'userId')
                       and p.team_id = x.team_id and not coalesce(p.disabled,false));
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',true,
    'd',v_n||' hood(s) that would come back naming a rep who is not an active teammate');
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

-- ============================================================ 10. OUTLINES
-- 10a asks the whole question. rally_ring_problem() reports a ring it cannot
-- READ; it says nothing about one that reads fine and then crosses itself,
-- which is what refused Hood 19 in the field. A hood with NO outline yet is
-- not a fault: 0009 allows it and 0016's arming gate tolerates it, so it is
-- counted separately in 10b.
v_s := '10 OUTLINES';
v_p := '10a no LIVE hood has a BAD outline - one that cannot be read, or that reads and then crosses itself';
begin
  select count(*) into v_n from public.territories x
   where x.deleted_at is null and x.archived = false
     and (public.rally_ring_problem(x.polygon) is not null
          or (public.rally_ring_to_geom(x.polygon) is not null
              and not gis.st_isvalid(public.rally_ring_to_geom(x.polygon))));
  select string_agg(q.id||' ('||q.why||')', '; ' order by q.id) into v_bad from (
    select x.id, left(coalesce(public.rally_ring_problem(x.polygon),
                    gis.st_isvalidreason(public.rally_ring_to_geom(x.polygon))), 80) why
      from public.territories x
     where x.deleted_at is null and x.archived = false
       and (public.rally_ring_problem(x.polygon) is not null
            or (public.rally_ring_to_geom(x.polygon) is not null
                and not gis.st_isvalid(public.rally_ring_to_geom(x.polygon))))
     order by x.id limit 10) q;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,
    'd',case when v_n=0 then '0 bad outlines' else v_n||': '||coalesce(v_bad,'') end);
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,
    'd','ERRORED (GEOS refused a stored outline): '||sqlerrm); end;

v_p := '10b no LIVE hood is UNPROTECTED turf - a null geom the overlap rule cannot see even though the polygon has one';
begin
  select count(*) into v_b from public.territories x
   where x.deleted_at is null and x.archived = false and x.geom is null
     and (public.rally_ring_problem(x.polygon) is not null
          or public.rally_ring_to_geom(x.polygon) is not null);
  select count(*) into v_d from public.territories x
   where x.deleted_at is null and x.archived = false and x.geom is null
     and public.rally_ring_problem(x.polygon) is null
     and public.rally_ring_to_geom(x.polygon) is null;
  select string_agg(q.id, ', ' order by q.id) into v_bad from (
    select x.id from public.territories x
     where x.deleted_at is null and x.archived = false and x.geom is null
       and (public.rally_ring_problem(x.polygon) is not null
            or public.rally_ring_to_geom(x.polygon) is not null)
     order by x.id limit 20) q;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_b=0,
    'd',case when v_b=0 then '0 unprotected'||
      case when v_d>0 then ' ('||v_d||' live hood(s) simply have no outline drawn yet - legal, and 0016 tolerates it)' else '' end
      else v_b||': '||coalesce(v_bad,'') end);
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_p := '10c every stored LIVE geom is a VALID geometry';
begin
  select count(*) into v_c from public.territories x
   where x.deleted_at is null and x.archived = false and x.geom is not null
     and not gis.st_isvalid(x.geom);
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_c=0,'d',v_c||' invalid');
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

-- total: a stored geom whose polygon derives NOTHING is stale too, and the
-- guarded form of this test used to skip exactly that row
v_p := '10d no LIVE geom is STALE - the rule guards the stored geom, so it must still be the polygon on screen';
begin
  select count(*) into v_d from public.territories x
   where x.deleted_at is null and x.archived = false and x.geom is not null
     and (public.rally_ring_to_geom(x.polygon) is null
          or not gis.st_equals(x.geom, public.rally_ring_to_geom(x.polygon)));
  select string_agg(q.id, ', ' order by q.id) into v_bad from (
    select x.id from public.territories x
     where x.deleted_at is null and x.archived = false and x.geom is not null
       and (public.rally_ring_to_geom(x.polygon) is null
            or not gis.st_equals(x.geom, public.rally_ring_to_geom(x.polygon)))
     order by x.id limit 20) q;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_d=0,
    'd',case when v_d=0 then '0 stale' else v_d||': '||coalesce(v_bad,'') end);
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,
    'd','ERRORED (GEOS refused a comparison - read 10a and 10c): '||sqlerrm); end;

-- ================================== 11. OVERLAPS + 12. MEASURABILITY
-- both read through pg_temp.ov, which turns 0016's fail-closed raise into a
-- NULL. That is what makes them independent: an unmeasurable pair no longer
-- aborts the run before the probe that exists to name it.
begin
  select count(*) filter (where pg_temp.ov(a.geom, z2.geom) > public.rally_overlap_tolerance_m2()),
         count(*) filter (where pg_temp.ov(a.geom, z2.geom) is null),
         count(*)
    into v_n, v_b, v_c
    from public.territories a join public.territories z2
      on a.team_id = z2.team_id and a.id < z2.id
   where a.deleted_at is null and a.archived = false and a.geom is not null
     and z2.deleted_at is null and z2.archived = false and z2.geom is not null
     and a.geom operator(gis.&&) z2.geom;
  select string_agg(q.pair, '; ') into v_bad from (
    select a.id||' / '||z2.id||' = '||round(pg_temp.ov(a.geom, z2.geom)::numeric,2)||' m2' pair
      from public.territories a join public.territories z2
        on a.team_id = z2.team_id and a.id < z2.id
     where a.deleted_at is null and a.archived = false and a.geom is not null
       and z2.deleted_at is null and z2.archived = false and z2.geom is not null
       and a.geom operator(gis.&&) z2.geom
       and pg_temp.ov(a.geom, z2.geom) > public.rally_overlap_tolerance_m2()
     limit 10) q;
  v_res := v_res || jsonb_build_object('s','11 OVERLAPS',
    'p','11a no LIVE pair overlaps by more than the 1.0 m2 tolerance','o',v_n=0,
    'd',case when v_n=0 then '0 forbidden overlaps' else v_n||': '||coalesce(v_bad,'') end);
  select string_agg(q.pair, '; ') into v_bad from (
    select a.id||' / '||z2.id pair
      from public.territories a join public.territories z2
        on a.team_id = z2.team_id and a.id < z2.id
     where a.deleted_at is null and a.archived = false and a.geom is not null
       and z2.deleted_at is null and z2.archived = false and z2.geom is not null
       and a.geom operator(gis.&&) z2.geom
       and pg_temp.ov(a.geom, z2.geom) is null
     limit 10) q;
  v_res := v_res || jsonb_build_object('s','12 MEASURABILITY',
    'p','12a every LIVE candidate pair is measurable. 0016 fails CLOSED, so an unmeasurable pair would refuse writes to BOTH hoods',
    'o',v_b=0,'d',v_c||' candidate pair(s), '||v_b||' unmeasurable'||coalesce(': '||v_bad,''));
exception when others then
  v_res := v_res || jsonb_build_object('s','11 OVERLAPS',
    'p','11a no LIVE pair overlaps by more than the 1.0 m2 tolerance','o',false,'d','ERRORED: '||sqlerrm);
  v_res := v_res || jsonb_build_object('s','12 MEASURABILITY',
    'p','12a every LIVE candidate pair is measurable','o',false,'d','ERRORED: '||sqlerrm); end;

-- ===================================================== 13. STAGE C TRIGGER
v_s := '13 STAGE C TRIGGER';
select count(*) into v_n from pg_trigger
 where tgrelid='public.territories'::regclass and tgname='territories_no_overlap'
   and tgenabled in ('O','A') and tgdeferrable and tginitdeferred and tgconstraint <> 0::oid
   and (tgtype & 1)<>0 and (tgtype & 4)<>0 and (tgtype & 16)<>0;
v_res := v_res || jsonb_build_object('s',v_s,
  'p','13a territories_no_overlap is a CONSTRAINT trigger, ENABLED, DEFERRABLE INITIALLY DEFERRED, per-row on INSERT OR UPDATE',
  'o',v_n=1,'d',v_n||' of 1');

v_p := '13b the tolerance is exactly 1.0 m2';
begin
  v_txt := case when to_regprocedure('public.rally_overlap_tolerance_m2()') is null
                then null else public.rally_overlap_tolerance_m2()::text end;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_txt = '1','d',coalesce(v_txt,'ABSENT'));
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

-- ======================================================== 14. CAPABILITIES
v_s := '14 CAPABILITIES';
v_res := v_res || jsonb_build_object('s',v_s,'p','14a rally_capabilities() reports turfRpc = TRUE',
  'o',coalesce((v_cap->>'turfRpc')::boolean,false),'d',coalesce(v_cap->>'turfRpc','ABSENT'));
v_res := v_res || jsonb_build_object('s',v_s,
  'p','14b rally_capabilities() reports assignmentServerAuthoritative = FALSE',
  'o',v_cap ? 'assignmentServerAuthoritative'
      and coalesce((v_cap->>'assignmentServerAuthoritative')::boolean,true) is false,
  'd',coalesce(v_cap->>'assignmentServerAuthoritative','ABSENT'));
v_res := v_res || jsonb_build_object('s',v_s,'p','14c INFO the whole capability object every client reads',
  'o',true,'d',v_cap::text);

-- ============================================================= THE VERDICT
select count(*) into v_n from jsonb_array_elements(v_res) x where not (x->>'o')::boolean;
v_res := v_res || jsonb_build_object('s','== VERDICT ==',
  'p',case when v_n = 0 then 'GO on the DATABASE - every proof holds. The two client-side conditions in the header are still yours to satisfy.'
           else 'NO-GO - '||v_n||' proof(s) failed. Do NOT flip.' end,
  'o',v_n=0,
  'd',case when v_n=0 then 'The stored ledger already IS what every client sees, so turning on server authority changes no hood''s assignment - it only stops a phone from authoring one. Before you flip: drain every leader phone (header (i)), and understand that the fleet cannot be un-flipped by setting the flag back (header (ii)).'
           else 'Read the *** FAIL *** rows above. An ERRORED row means the survey caught a raise and kept going; probe 7b names the row.' end);

return query select (x->>'s')::text, (x->>'p')::text,
                    case when (x->>'o')::boolean then 'PASS' else '*** FAIL ***' end,
                    (x->>'d')::text
               from jsonb_array_elements(v_res) x;
end $$;

select * from pg_temp.flip_preflight();
