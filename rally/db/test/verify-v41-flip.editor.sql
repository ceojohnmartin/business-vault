-- RALLY v41 - POST-FLIP PRODUCTION VERIFICATION.
--
-- Run immediately after db/APPLY_v41_FLIP.sql.
--
-- SECTIONS A-F ARE READ-ONLY. SECTION L IS LIVE FIRE: it plants hoods, doors
-- and events in empty Bering-Sea ocean (lon -170, lat 60) inside ONE PL/pgSQL
-- subtransaction that is ALWAYS rolled back by a deliberate exception at the
-- end, and probe Z proves nothing survived. It is the only way to prove the
-- statements that are about BEHAVIOUR rather than state: that a stale
-- v40-shaped write can no longer move the ledger, that multi-assignee still
-- works, and that a rep can still knock, clear a black door, clear outcomes
-- and split a hood.
--
-- BEFORE_FINGERPRINT below must be the value the pre-flip snapshot printed.
-- Probe D1 compares it against the same query run now: if the flip moved a
-- single assignment on a single hood, the two differ.

create or replace function pg_temp.ent(p_assignees jsonb)
returns jsonb language sql immutable as $$
  select case when jsonb_typeof(p_assignees->'entries') = 'array'
              then p_assignees->'entries' else '[]'::jsonb end
$$;

create or replace function pg_temp.ov(a gis.geometry, b gis.geometry)
returns double precision language plpgsql as $$
begin return public.rally_overlap_m2(a, b);
exception when others then return null; end $$;

-- the assignment state of every LIVE hood, order-independent
create or replace function pg_temp.fingerprint()
returns text language sql stable as $$
  select coalesce(md5(string_agg(
      t.id||'|'||coalesce((select string_agg(y::text, ',' order by y) from unnest(t.open_assignees) y),'')
          ||'|'||coalesce(t.data->>'assignedTo','')
          ||'|'||t.assignees_rev
          ||'|'||md5(coalesce(t.assignees,'{}'::jsonb)::text),
      chr(10) order by t.team_id, t.id)), 'EMPTY')
    from public.territories t
   where t.deleted_at is null and t.archived = false
$$;

create or replace function pg_temp.flip_verify(p_before text default null)
returns table(section text, probe text, result text, detail text)
language plpgsql as $$
declare
  v_res jsonb := '[]'::jsonb;
  v_s   text; v_p text; v_txt text; v_bad text; v_cap jsonb;
  v_n   bigint; v_b bigint; v_c bigint; v_d bigint;
  v_ok  boolean;
  -- live-fire fixtures
  v_team uuid; v_lead uuid; v_r1 uuid; v_r2 uuid;
  v_ledger jsonb; v_ledger2 jsonb; v_open uuid[]; v_open2 uuid[]; v_rev bigint;
  P1 constant text := 'v41f-p1';
  P2 constant text := 'v41f-p2';
  PIN constant text := 'v41f-pin1';
  A  constant jsonb := '[[-170.00,60.00],[-169.99,60.00],[-169.99,60.01],[-170.00,60.01]]';
  B  constant jsonb := '[[-171.00,61.00],[-170.98,61.00],[-170.98,61.01],[-171.00,61.01]]';
  v_names constant text[] := array[
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
begin

-- ================================================= A. THE FLIP ITSELF
v_s := 'A THE FLIP';
v_p := 'A1 rally_config.assignment_server_authoritative = TRUE';
begin
  select count(*) into v_n from public.rally_config;
  select assignment_server_authoritative into v_ok from public.rally_config where id;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_ok is true and v_n=1,
    'd','rows='||v_n||' value='||coalesce(v_ok::text,'null'));
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_p := 'A2 rally_capabilities() reports assignmentServerAuthoritative = TRUE - this is what every client reads';
begin
  v_cap := public.rally_capabilities();
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,
    'o',coalesce((v_cap->>'assignmentServerAuthoritative')::boolean,false) is true,
    'd',v_cap::text);
exception when others then v_cap := '{}'::jsonb;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_p := 'A3 turfRpc is still TRUE - the flip did not disturb the other capability';
v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,
  'o',coalesce((v_cap->>'turfRpc')::boolean,false) is true,'d',coalesce(v_cap->>'turfRpc','ABSENT'));

-- ============================================ B. THE GATE AND THE LEDGER
v_s := 'B LEDGER';
v_p := 'B1 rally_unresolved_live_assignments() is STILL 0 after the flip';
begin
  select public.rally_unresolved_live_assignments() into v_n;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,'d',v_n::text);
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_p := 'B2 every LIVE hood: open_assignees still = rally_open_uuids(ledger), compared as SETS';
begin
  select count(*) into v_n from public.territories x
   where x.deleted_at is null and x.archived = false
     and (select coalesce(array_agg(distinct y order by y),'{}'::uuid[]) from unnest(x.open_assignees) y)
      is distinct from
         (select coalesce(array_agg(distinct y order by y),'{}'::uuid[])
            from unnest(public.rally_open_uuids(x.assignees, x.team_id)) y);
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,'d',v_n||' disagreements');
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_p := 'B3 every LIVE hood: data.assignedTo still = the first OPEN assignee in the ledger';
begin
  select count(*) into v_n from public.territories x
   where x.deleted_at is null and x.archived = false
     and x.data->'assignedTo'
      is distinct from coalesce(to_jsonb(public.rally_first_open_assignee(x.assignees)), 'null'::jsonb);
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,'d',v_n||' disagreements');
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_p := 'B4 every LIVE hood: data.assignments still holds exactly the ledger''s (userId, assignedAt, unassignedAt)';
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
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,'d',v_n||' disagreements');
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_p := 'B5 no malformed ledger entry, no duplicate open, no unresolvable/foreign/disabled current assignee';
begin
  select count(distinct x.id) into v_n from public.territories x,
       lateral jsonb_array_elements(pg_temp.ent(x.assignees)) e
   where jsonb_typeof(e) <> 'object' or coalesce(btrim(e->>'userId'),'') = ''
      or coalesce(public.rally_ms(e->>'assignedAt'),0) <= 0
      or (e->>'unassignedAt' is not null
          and (public.rally_ms(e->>'unassignedAt') is null
               or public.rally_ms(e->>'unassignedAt') < public.rally_ms(e->>'assignedAt')));
  select count(*) into v_b from public.territories x
   where exists (select 1 from jsonb_array_elements(pg_temp.ent(x.assignees)) e
                  where e->>'unassignedAt' is null
                  group by public.rally_uid(e->>'userId') having count(*) > 1);
  select count(distinct x.id) into v_c from public.territories x,
       lateral jsonb_array_elements(pg_temp.ent(x.assignees)) e
   where x.deleted_at is null and x.archived = false
     and e->>'unassignedAt' is null and coalesce(btrim(e->>'userId'),'') <> ''
     and not exists (select 1 from public.profiles p where p.id = public.rally_uid_uuid(e->>'userId')
                       and p.team_id = x.team_id and not coalesce(p.disabled,false));
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0 and v_b=0 and v_c=0,
    'd','malformed='||v_n||' duplicate-open='||v_b||' unresolvable/foreign/disabled='||v_c);
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

-- ================================== C. NOTHING WAS UNASSIGNED BY THE FLIP
v_s := 'C NO SILENT UNASSIGN';
v_p := 'C1 the assignment fingerprint of every LIVE hood is byte-identical to the pre-flip snapshot';
begin
  v_txt := pg_temp.fingerprint();
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,
    'o',p_before is not null and v_txt = p_before,
    'd',case when p_before is null then 'NO BASELINE GIVEN - pass the pre-flip fingerprint as the argument'
             when v_txt = p_before then 'identical: '||v_txt
             else 'CHANGED: before='||p_before||' after='||v_txt end);
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_p := 'C2 how many LIVE hoods hold an assignment right now, and how many assignments in total';
begin
  select count(*), count(*) filter (where coalesce(array_length(x.open_assignees,1),0) > 0),
         coalesce(sum(coalesce(array_length(x.open_assignees,1),0)),0)
    into v_n, v_b, v_c
    from public.territories x where x.deleted_at is null and x.archived = false;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',true,
    'd',v_n||' live hood(s), '||v_b||' assigned, '||v_c||' open assignment(s)');
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_p := 'C3 no LIVE hood that holds a ledger open entry has an EMPTY open_assignees - the shape of a silent unassign';
begin
  select count(*) into v_n from public.territories x
   where x.deleted_at is null and x.archived = false
     and coalesce(array_length(x.open_assignees,1),0) = 0
     and exists (select 1 from jsonb_array_elements(pg_temp.ent(x.assignees)) e
                  where e->>'unassignedAt' is null and coalesce(btrim(e->>'userId'),'') <> '');
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0,'d',v_n||' hood(s)');
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

-- ============================================ D. STAGE A/B/C STILL HEALTHY
v_s := 'D STAGE A/B/C';
select string_agg(nm, ', ' order by nm) into v_bad from unnest(v_names) nm
 where not exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
                    where ns.nspname='public' and p.proname = nm);
v_res := v_res || jsonb_build_object('s',v_s,'p','D1 all 43 Stage A, B and C functions still present',
  'o',v_bad is null,'d',coalesce('MISSING: '||v_bad,'43 of 43'));

select count(*) into v_n from pg_trigger
 where tgrelid='public.territories'::regclass and not tgisinternal
   and tgname in ('territories_assignment','territories_derive_geom','territories_no_overlap')
   and tgenabled in ('O','A');
select count(*) into v_b from pg_trigger
 where tgrelid='public.rally_config'::regclass and tgname='rally_config_guard' and tgenabled in ('O','A');
select count(*) into v_c from pg_trigger
 where tgrelid='public.pins'::regclass and tgname='pins_protect_dnk' and tgenabled in ('O','A');
select count(*) into v_d from pg_trigger
 where tgrelid='public.events'::regclass and tgname='events_guard_dnk_clear' and tgenabled in ('O','A');
v_res := v_res || jsonb_build_object('s',v_s,
  'p','D2 every trigger still enabled: 3 on territories, the config gate, pins and events',
  'o',v_n=3 and v_b=1 and v_c=1 and v_d=1,
  'd','territories '||v_n||'/3, config_guard '||v_b||'/1, pins '||v_c||'/1, events '||v_d||'/1');

select count(*) into v_n
  from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
 where ns.nspname='public' and p.proname='territories_assignment' and not p.prosecdef;
v_res := v_res || jsonb_build_object('s',v_s,
  'p','D3 territories_assignment is STILL SECURITY INVOKER - the flip means nothing otherwise',
  'o',v_n=1,'d',case when v_n=1 then 'invoker' else 'NOT INVOKER' end);

select string_agg(a.attname, ', ' order by a.attname) into v_bad from pg_attribute a
 where a.attrelid='public.territories'::regclass and a.attnum>0 and not a.attisdropped
   and not (a.attname = any(array['team_id','id','name','polygon','homes','archived',
                                  'created_by','deleted_at','data']))
   and (has_column_privilege('authenticated','public.territories', a.attname,'UPDATE')
     or has_column_privilege('authenticated','public.territories', a.attname,'INSERT'));
v_res := v_res || jsonb_build_object('s',v_s,
  'p','D4 the ledger columns are still sealed against direct client writes',
  'o',v_bad is null,'d',coalesce('CLIENT-WRITABLE: '||v_bad,'assignees, assignees_rev, open_assignees, geom and the clocks all sealed'));

-- ================================================== E. TURF STILL SOUND
v_s := 'E TURF';
v_p := 'E1 no LIVE hood has a bad outline, a null geom the rule cannot see, an invalid geom, or a stale geom';
begin
  select count(*) filter (where public.rally_ring_problem(x.polygon) is not null
                            or (public.rally_ring_to_geom(x.polygon) is not null
                                and not gis.st_isvalid(public.rally_ring_to_geom(x.polygon)))),
         count(*) filter (where x.geom is null
                            and (public.rally_ring_problem(x.polygon) is not null
                                 or public.rally_ring_to_geom(x.polygon) is not null)),
         count(*) filter (where x.geom is not null and not gis.st_isvalid(x.geom)),
         count(*) filter (where x.geom is not null
                            and (public.rally_ring_to_geom(x.polygon) is null
                                 or not gis.st_equals(x.geom, public.rally_ring_to_geom(x.polygon))))
    into v_n, v_b, v_c, v_d
    from public.territories x where x.deleted_at is null and x.archived = false;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0 and v_b=0 and v_c=0 and v_d=0,
    'd','bad='||v_n||' unprotected='||v_b||' invalid='||v_c||' stale='||v_d);
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

v_p := 'E2 no forbidden overlap, and every candidate pair is still measurable';
begin
  select count(*) filter (where pg_temp.ov(a.geom, z2.geom) > public.rally_overlap_tolerance_m2()),
         count(*) filter (where pg_temp.ov(a.geom, z2.geom) is null), count(*)
    into v_n, v_b, v_c
    from public.territories a join public.territories z2
      on a.team_id = z2.team_id and a.id < z2.id
   where a.deleted_at is null and a.archived = false and a.geom is not null
     and z2.deleted_at is null and z2.archived = false and z2.geom is not null
     and a.geom operator(gis.&&) z2.geom;
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=0 and v_b=0,
    'd',v_c||' candidate pair(s), '||v_n||' over tolerance, '||v_b||' unmeasurable');
exception when others then
  v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

-- ==================================================== L. LIVE FIRE
-- Everything below plants rows in empty ocean inside ONE subtransaction that
-- is always rolled back. Probe Z proves it.
v_s := 'L LIVE FIRE';
select p.id, p.team_id into v_lead, v_team from public.profiles p
 where p.role in ('leader','manager','owner') and not coalesce(p.disabled,false)
   and p.team_id is not null
 order by (p.role = 'owner') desc, p.id limit 1;
select array_agg(q.id) into v_open from (
  select p.id from public.profiles p
   where p.team_id = v_team and not coalesce(p.disabled,false)
   order by p.id limit 2) q;
v_r1 := v_open[1]; v_r2 := v_open[2];
v_res := v_res || jsonb_build_object('s',v_s,'p','L0 SETUP a real leader and two real teammates to probe as',
  'o',v_lead is not null and v_r1 is not null,
  'd','leader='||coalesce(v_lead::text,'none')||' reps='||coalesce(array_length(v_open,1),0));

if v_lead is not null and v_r1 is not null then
begin
  perform set_config('request.jwt.claims', json_build_object('sub', v_lead)::text, true);

  insert into public.territories (team_id,id,name,polygon,archived,data,created_by)
  values (v_team,P1,'v41f probe 1',A,false,'{}'::jsonb,v_lead);

  ------------------------------------ L1 a stale v40-shaped write is IGNORED
  -- THE PROBE THAT ACTUALLY DISCRIMINATES. An EMPTY mirror would not: 0010's
  -- rally_legacy_to_entries deliberately reads `assignments: []` with no
  -- assignedTo as "this phone is telling us nothing" and returns the prior
  -- ledger untouched, so that write leaves the ledger alone under EITHER
  -- flag and proves nothing. What a phone CAN do under legacy authority is
  -- decide who is OPEN - so the fixture hands the hood to a DIFFERENT rep.
  -- Before the flip that write moves the ledger. After it, it must not.
  perform public.set_territory_assignments(P1, array[v_r1], 'v41f-op-1');
  v_p := 'L1 THE POINT OF THE FLIP: a v40-shaped upsert naming a DIFFERENT rep as assigned CANNOT move the ledger';
  begin
    select assignees, open_assignees, assignees_rev into v_ledger, v_open, v_rev
      from public.territories where id = P1;
    if v_r2 is null then
      v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',true,
        'd','INFO not probed: this team has only one rep, so there is no second rep to hand the hood to');
    else
      -- exactly what a phone sends: role authenticated, an ordinary upsert on
      -- the nine columns 0012 grants, carrying a mirror that names someone
      -- else. current_user is what separates this from an RPC, so the role
      -- MUST be switched or the write would count as authoritative.
      set local role authenticated;
      update public.territories
         set data = jsonb_set(jsonb_set(coalesce(data,'{}'::jsonb), '{assignments}',
                      jsonb_build_array(jsonb_build_object(
                        'userId', v_r2::text, 'name', 'stale phone',
                        'assignedBy', null,
                        'assignedAt', (extract(epoch from clock_timestamp())*1000)::bigint,
                        'unassignedAt', null))),
                      '{assignedTo}', to_jsonb(v_r2::text)),
             name = 'v41f renamed by a stale phone'
       where team_id = v_team and id = P1;
      reset role;
      select assignees, open_assignees, name into v_ledger2, v_open2, v_txt
        from public.territories where id = P1;
      v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,
        -- three things must ALL hold: the ledger did not move, the other rep
        -- was not given the hood, and the write itself DID land (otherwise
        -- this probe would pass vacuously on a write RLS silently refused)
        'o', v_ledger2 is not distinct from v_ledger
         and v_open2 is not distinct from v_open
         and not (v_r2 = any(coalesce(v_open2,'{}'::uuid[])))
         and v_txt = 'v41f renamed by a stale phone',
        'd','ledger unchanged='||(v_ledger2 is not distinct from v_ledger)::text
            ||', other rep NOT given the hood='||(not (v_r2 = any(coalesce(v_open2,'{}'::uuid[]))))::text
            ||', open_assignees='||coalesce(array_length(v_open2,1),0)
            ||', and the rename the same write carried WAS accepted='||(v_txt = 'v41f renamed by a stale phone')::text);
    end if;
  exception when others then reset role;
    v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

  ---------------------------------------------------------- L2 multi-assignee
  v_p := 'L2 MULTI-ASSIGNEE: set_territory_assignments with TWO reps opens two entries and lists both in open_assignees';
  begin
    if v_r2 is null then
      select assignees, open_assignees into v_ledger, v_open from public.territories where id = P1;
      v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,
        'o',coalesce(array_length(v_open,1),0) = 1,
        'd','INFO only one rep on this team; single-assignee path proved instead: open='||coalesce(array_length(v_open,1),0));
    else
      perform public.set_territory_assignments(P1, array[v_r1, v_r2], 'v41f-op-2');
      select assignees, open_assignees, assignees_rev into v_ledger, v_open, v_rev
        from public.territories where id = P1;
      select count(*) into v_n from jsonb_array_elements(pg_temp.ent(v_ledger)) e
       where e->>'unassignedAt' is null;
      v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,
        'o',v_n = 2 and coalesce(array_length(v_open,1),0) = 2
        and v_r1 = any(v_open) and v_r2 = any(v_open),
        'd',v_n||' open entr(ies), open_assignees='||coalesce(array_length(v_open,1),0)||', rev='||v_rev);
    end if;
  exception when others then
    v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

  --------------------------------- L3 unassigning CLOSES, never deletes
  v_p := 'L3 removing a rep CLOSES that entry and keeps the history; the other rep stays open';
  begin
    if v_r2 is not null then
      perform public.set_territory_assignments(P1, array[v_r1], 'v41f-op-3');
      select assignees, open_assignees into v_ledger, v_open from public.territories where id = P1;
      select count(*) filter (where e->>'unassignedAt' is null),
             count(*) filter (where e->>'unassignedAt' is not null), count(*)
        into v_n, v_b, v_c from jsonb_array_elements(pg_temp.ent(v_ledger)) e;
      v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,
        'o',v_n=1 and v_b>=1 and v_c=v_n+v_b and coalesce(array_length(v_open,1),0)=1
        and v_r1 = any(v_open),
        'd',v_n||' open, '||v_b||' closed, '||v_c||' total entries; open_assignees='||coalesce(array_length(v_open,1),0));
    else
      v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',true,'d','INFO not probed: only one rep on this team');
    end if;
  exception when others then
    v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

  ------------------------------------------------------------- L4 a rep knock
  v_p := 'L4 A REP CAN STILL KNOCK: an ordinary door write and its event both land';
  begin
    set local role authenticated;
    insert into public.pins (team_id,id,lat,lng,address,disposition,territory_id,data,created_by)
    values (v_team,PIN,60.005,-169.995,'1 Ocean Way','not_home',P1,
            jsonb_build_object('history', jsonb_build_array(
              jsonb_build_object('disposition','not_home','ts',
                (extract(epoch from clock_timestamp())*1000)::bigint,'by',v_lead::text))),v_lead);
    insert into public.events (team_id,id,pin_id,type,disposition,at_ms,by_user,data)
    values (v_team,'v41f-ev1',PIN,'knock','not_home',
            (extract(epoch from clock_timestamp())*1000)::bigint,v_lead,'{}'::jsonb);
    reset role;
    select count(*) into v_n from public.pins where id = PIN and disposition = 'not_home';
    select count(*) into v_b from public.events where id = 'v41f-ev1';
    v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=1 and v_b=1,
      'd','pin '||v_n||'/1, event '||v_b||'/1');
  exception when others then reset role;
    v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

  ------------------------------------------------------- L5 do-not-knock clear
  v_p := 'L5 DNK CLEAR still works: a black door goes to unworked and the server mints the dnk_clear';
  begin
    update public.pins
       set disposition = 'dnk',
           data = jsonb_set(data,'{history}', coalesce(data->'history','[]'::jsonb) ||
                    jsonb_build_object('disposition','dnk','ts',
                      (extract(epoch from clock_timestamp())*1000)::bigint,'by',v_lead::text))
     where team_id = v_team and id = PIN;
    set local role authenticated;
    perform public.clear_pin_dnk(PIN, 'v41 post-flip verification', 'v41f-op-dnk');
    reset role;
    select disposition into v_txt from public.pins where id = PIN;
    select count(*) into v_n from public.events
     where id = 'dnkclear-v41f-op-dnk' and type = 'dnk_clear';
    v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_txt = 'unworked' and v_n = 1,
      'd','door reads '||coalesce(v_txt,'?')||', server-minted event '||v_n||'/1');
  exception when others then reset role;
    v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

  ----------------------------------------------------------- L6 Clear Outcomes
  v_p := 'L6 CLEAR OUTCOMES still works: start_territory_cycle moves the cycle boundary forward';
  begin
    set local role authenticated;
    perform public.start_territory_cycle(P1, null, 'v41f-op-cycle');
    reset role;
    select count(*) into v_n from public.territories where id = P1 and cycle_started_at is not null;
    v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=1,
      'd',case when v_n=1 then 'cycle_started_at set' else 'NOT SET' end);
  exception when others then reset role;
    v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

  --------------------------------------------------------------- L7 Smart Split
  v_p := 'L7 SMART SPLIT still works, and the children still INHERIT the parent''s rep';
  begin
    insert into public.territories (team_id,id,name,polygon,archived,data,created_by)
    values (v_team,P2,'v41f probe 2',B,false,'{}'::jsonb,v_lead);
    set local role authenticated;
    perform public.set_territory_assignments(P2, array[v_r1], 'v41f-op-4');
    perform public.smart_split_territory(P2, 'v41f-op-split', jsonb_build_array(
      jsonb_build_object('id','v41f-kid-a','name','Kid A',
        'polygon','[[-171.00,61.00],[-170.99,61.00],[-170.99,61.01],[-171.00,61.01]]'::jsonb,'data','{}'::jsonb),
      jsonb_build_object('id','v41f-kid-b','name','Kid B',
        'polygon','[[-170.99,61.00],[-170.98,61.00],[-170.98,61.01],[-170.99,61.01]]'::jsonb,'data','{}'::jsonb)));
    reset role;
    select count(*) into v_n from public.territories
     where id in ('v41f-kid-a','v41f-kid-b') and deleted_at is null;
    select count(*) into v_b from public.territories
     where id in ('v41f-kid-a','v41f-kid-b') and v_r1 = any(open_assignees);
    select count(*) into v_c from public.territories where id = P2 and deleted_at is not null;
    v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',v_n=2 and v_b=2 and v_c=1,
      'd',v_n||' child(ren), '||v_b||' carrying the inherited rep, parent retired='||(v_c=1)::text);
  exception when others then reset role;
    v_res := v_res || jsonb_build_object('s',v_s,'p',v_p,'o',false,'d','ERRORED: '||sqlerrm); end;

  raise exception 'v41f-rollback';
exception when others then
  begin reset role; exception when others then null; end;
  if sqlerrm <> 'v41f-rollback' then
    v_res := v_res || jsonb_build_object('s',v_s,'p','L LIVE FIRE ABORTED','o',false,'d',sqlerrm);
  end if;
end;
end if;

-- ================================================================= Z
select count(*) into v_n from public.territories where id like 'v41f-%';
select count(*) into v_b from public.pins where id like 'v41f-%';
select count(*) into v_c from public.events where id like 'v41f-%' or id like 'dnkclear-v41f-%';
v_res := v_res || jsonb_build_object('s','Z ROLLBACK',
  'p','Z1 every live-fire row rolled back - production carries nothing this survey created',
  'o',v_n=0 and v_b=0 and v_c=0,
  'd',v_n||' hood(s), '||v_b||' door(s), '||v_c||' event(s) left behind');

select assignment_server_authoritative into v_ok from public.rally_config where id;
v_res := v_res || jsonb_build_object('s','Z ROLLBACK',
  'p','Z2 the flag is STILL true after the live fire - nothing here touched it',
  'o',v_ok is true,'d',coalesce(v_ok::text,'null'));

v_p := 'Z3 the assignment fingerprint is STILL the pre-flip one after the live fire';
v_txt := pg_temp.fingerprint();
v_res := v_res || jsonb_build_object('s','Z ROLLBACK','p',v_p,
  'o',p_before is null or v_txt = p_before,
  'd',case when p_before is null then 'no baseline given' when v_txt = p_before then 'identical' else 'CHANGED to '||v_txt end);

-- ============================================================ THE VERDICT
select count(*) into v_n from jsonb_array_elements(v_res) x where not (x->>'o')::boolean;
v_res := v_res || jsonb_build_object('s','== VERDICT ==',
  'p',case when v_n = 0 then 'FLIP VERIFIED - server authority is live and every proof holds.'
           else 'PROBLEM - '||v_n||' proof(s) failed.' end,
  'o',v_n=0,
  'd',case when v_n=0 then 'The ledger is now the only thing that decides who works a hood, no hood changed hands in the process, and every field operation still works.'
           else 'Read the *** FAIL *** rows above.' end);

return query select (x->>'s')::text, (x->>'p')::text,
                    case when (x->>'o')::boolean then 'PASS' else '*** FAIL ***' end,
                    (x->>'d')::text
               from jsonb_array_elements(v_res) x;
end $$;

-- Pass the pre-flip fingerprint as the argument.
select * from pg_temp.flip_verify(null);
