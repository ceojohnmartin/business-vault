-- RALLY v41 - STAGE C (0016) PRODUCTION VERIFICATION - PART 2 of 2.
--
-- OPTIONAL. Part 1 is the verification; this is the live-fire proof that
-- the rule actually bites on production itself rather than only on the
-- local mirror.
--
-- NOT read-only in the strict sense, and it should not be described as
-- such: it PLANTS hoods, in empty Bering-Sea ocean (lon -170, lat 60),
-- inside ONE PL/pgSQL subtransaction that is ALWAYS rolled back by a
-- deliberate exception at the end. No production row is created, changed
-- or deleted, and probe Z proves it by counting what is left. Only the
-- pg_temp function outlives the statement, and it dies with the session.
--
-- HOW A DEFERRED CONSTRAINT IS PROBED AT ALL. territories_no_overlap fires
-- at COMMIT, and this survey never commits. So each probe runs
-- SET CONSTRAINTS ALL IMMEDIATE, which forces the check THEN, inside the
-- still-open transaction - the same technique db/test/turf-race-test.sh
-- uses. The Smart Split probe sets them back to DEFERRED first, because
-- deferral is exactly what that case depends on.
--
-- Nothing here flips assignment_server_authoritative, even transiently.

create or replace function pg_temp.c_livefire()
returns table(probe text, result text, detail text) language plpgsql as $$
declare
  res    jsonb := '[]'::jsonb;
  team   uuid; boss uuid; other uuid;
  n      bigint; b bigint; m double precision;
  ok     boolean; msg text;
  A      jsonb := '[[-170.00,60.00],[-169.99,60.00],[-169.99,60.01],[-170.00,60.01]]';
  OVER   jsonb := '[[-169.995,60.00],[-169.985,60.00],[-169.985,60.01],[-169.995,60.01]]';
  EDGE   jsonb := '[[-169.99,60.00],[-169.98,60.00],[-169.98,60.01],[-169.99,60.01]]';
  CORNER jsonb := '[[-169.99,60.01],[-169.98,60.01],[-169.98,60.02],[-169.99,60.02]]';
  SLIVER jsonb := '[[-170.01,59.99],[-169.99999102,59.99],[-169.99999102,60.00000452],[-170.01,60.00000452]]';
  BOWTIE jsonb := '[[-170.20,60.40],[-170.10,60.50],[-170.10,60.40],[-170.20,60.50]]';
  add    text := 'insert into public.territories (team_id,id,name,polygon,archived,data,assignees,assignees_rev,open_assignees,created_by)
                  values ($1,$2,$2,$3,$4,''{}''::jsonb,''{"entries":[]}''::jsonb,0,''{}''::uuid[],$5)';
begin
  ------------------------------------------------------ D. the rule itself
  select p.id, p.team_id into boss, team from public.profiles p
   where p.role in ('leader','manager','owner') and not coalesce(p.disabled,false)
   order by p.role='owner' desc limit 1;
  res := res || jsonb_build_array(jsonb_build_object('p','D0 SETUP found a real leader to probe as','o',boss is not null,'d',coalesce(boss::text,'none')));
  if boss is null then
    return query select (x->>'p')::text, case when (x->>'o')::boolean then 'PASS' else '*** FAIL ***' end, (x->>'d')::text
                   from jsonb_array_elements(res) x;
    return;
  end if;

  begin   -- ONE subtransaction; always rolled back
    set constraints all immediate;

    execute add using team, 'v41c-base', A, false, boss;
    res := res || jsonb_build_array(jsonb_build_object('p','D1 a clean hood commits under the armed rule','o',true,'d','planted'));

    begin execute add using team, 'v41c-over', OVER, false, boss; ok:=false; msg:='ACCEPTED';
    exception when others then ok:=true; msg:=sqlerrm; end;
    res := res || jsonb_build_array(jsonb_build_object('p','D2 an overlap > 1.0 m2 is REFUSED','o',ok,'d',left(msg,150)));

    begin execute add using team, 'v41c-edge', EDGE, false, boss; ok:=true; msg:='accepted';
    exception when others then ok:=false; msg:=sqlerrm; end;
    res := res || jsonb_build_array(jsonb_build_object('p','D3 a SHARED EDGE is allowed','o',ok,'d',left(msg,150)));

    begin execute add using team, 'v41c-corner', CORNER, false, boss; ok:=true; msg:='accepted';
    exception when others then ok:=false; msg:=sqlerrm; end;
    res := res || jsonb_build_array(jsonb_build_object('p','D4 a POINT TOUCH is allowed','o',ok,'d',left(msg,150)));

    select public.rally_overlap_m2(
             public.rally_ring_to_geom(A), public.rally_ring_to_geom(SLIVER)) into m;
    begin execute add using team, 'v41c-sliver', SLIVER, false, boss; ok:=true; msg:='accepted';
    exception when others then ok:=false; msg:=sqlerrm; end;
    res := res || jsonb_build_array(jsonb_build_object('p','D5 an overlap of '||round(m::numeric,4)||' m2 (<= 1.0) is TOLERATED','o',ok and m<=1.0,'d',left(msg,150)));

    begin execute add using team, 'v41c-bowtie', BOWTIE, false, boss; ok:=false; msg:='ACCEPTED';
    exception when others then ok:=true; msg:=sqlerrm; end;
    res := res || jsonb_build_array(jsonb_build_object('p','D6 a self-crossing outline is REFUSED','o',ok,'d',left(msg,150)));

    begin execute add using team, 'v41c-arch', A, true, boss; ok:=true; msg:='accepted';
    exception when others then ok:=false; msg:=sqlerrm; end;
    res := res || jsonb_build_array(jsonb_build_object('p','D7 an ARCHIVED hood may sit on live turf (it is not turf)','o',ok,'d',left(msg,150)));

    select count(*) into n from public.teams where id <> team;
    if n > 0 then
      select id into other from public.teams where id <> team limit 1;
      begin execute add using other, 'v41c-other', A, false, boss;
            ok:=true; msg:='accepted';
      exception when others then ok:=false; msg:=sqlerrm; end;
      res := res || jsonb_build_array(jsonb_build_object('p','D8 a DIFFERENT team may hold the identical footprint','o',ok,'d',left(msg,150)));
    else
      res := res || jsonb_build_array(jsonb_build_object('p','D8 a DIFFERENT team may hold the identical footprint','o',true,'d','INFO: only one team on this project — not probed'));
    end if;

    ------------------------------------------------------ E. Smart Split
    set constraints all deferred;   -- deferral is the whole point of this case
    perform set_config('request.jwt.claims', json_build_object('sub', boss)::text, true);
    begin
      perform public.smart_split_territory('v41c-base', 'v41c-op-1', jsonb_build_array(
        jsonb_build_object('id','v41c-kid-a','name','Kid A','polygon','[[-170.00,60.00],[-169.995,60.00],[-169.995,60.01],[-170.00,60.01]]'::jsonb,'data','{}'::jsonb),
        jsonb_build_object('id','v41c-kid-b','name','Kid B','polygon','[[-169.995,60.00],[-169.99,60.00],[-169.99,60.01],[-169.995,60.01]]'::jsonb,'data','{}'::jsonb)));
      set constraints all immediate;
      ok:=true; msg:='committed';
    exception when others then ok:=false; msg:=sqlerrm; end;
    select count(*) into n from public.territories where id in ('v41c-kid-a','v41c-kid-b') and deleted_at is null;
    res := res || jsonb_build_array(jsonb_build_object('p','E1 Smart Split still succeeds — children overlap the live parent mid-transaction','o',ok and n=2,'d',n||' child(ren); '||left(msg,120)));
    select deleted_at is not null into ok from public.territories where id='v41c-base';
    res := res || jsonb_build_array(jsonb_build_object('p','E2 …and the parent is retired','o',coalesce(ok,false),'d',coalesce(ok::text,'?')));

    set constraints all deferred;
    execute add using team, 'v41c-p2', '[[-171.00,61.00],[-170.98,61.00],[-170.98,61.01],[-171.00,61.01]]'::jsonb, false, boss;
    set constraints all immediate;
    set constraints all deferred;
    begin
      perform public.smart_split_territory('v41c-p2', 'v41c-op-2', jsonb_build_array(
        jsonb_build_object('id','v41c-bad-a','name','Bad A','polygon','[[-171.00,61.00],[-170.985,61.00],[-170.985,61.01],[-171.00,61.01]]'::jsonb,'data','{}'::jsonb),
        jsonb_build_object('id','v41c-bad-b','name','Bad B','polygon','[[-170.995,61.00],[-170.98,61.00],[-170.98,61.01],[-170.995,61.01]]'::jsonb,'data','{}'::jsonb)));
      set constraints all immediate;
      ok:=false; msg:='ACCEPTED';
    exception when others then ok:=true; msg:=sqlerrm; end;
    res := res || jsonb_build_array(jsonb_build_object('p','E3 a split whose FINAL children collide is REFUSED','o',ok,'d',left(msg,150)));
    select count(*) into n from public.territories where id in ('v41c-bad-a','v41c-bad-b');
    select count(*) into b from public.territory_splits where operation_id='v41c-op-2';
    select deleted_at is null into ok from public.territories where id='v41c-p2';
    res := res || jsonb_build_array(jsonb_build_object('p','E4 …and it is ATOMIC: no child, no audit row, parent not retired','o',n=0 and b=0 and coalesce(ok,false),'d','children='||n||' audit='||b||' parent_live='||coalesce(ok::text,'?')));

    ------------------------------------------------------ F. v40 compatibility
    set constraints all immediate;
    begin
      insert into public.territories (team_id,id,name,polygon,archived,data,created_by)
      values (team,'v41c-v40','v41c-v40','[[-172.00,62.00],[-171.99,62.00],[-171.99,62.01],[-172.00,62.01]]'::jsonb,false,
              jsonb_build_object('assignedTo',boss::text,'assignments',
                jsonb_build_array(jsonb_build_object('userId',boss::text,'name','x','assignedBy',null,
                                                     'assignedAt',1756000000000::bigint,'unassignedAt',null))),boss);
      ok:=true; msg:='accepted';
    exception when others then ok:=false; msg:=sqlerrm; end;
    select coalesce(array_length(open_assignees,1),0) into n from public.territories where id='v41c-v40';
    res := res || jsonb_build_array(jsonb_build_object('p','F1 a v40-shaped write still commits and still becomes a ledger entry','o',ok and n=1,'d','open_assignees='||coalesce(n::text,'-')||'; '||left(msg,120)));

    raise exception 'v41c-probe-rollback';
  exception when others then
    if sqlerrm <> 'v41c-probe-rollback' then
      res := res || jsonb_build_array(jsonb_build_object('p','D/E/F PROBES ABORTED','o',false,'d',sqlerrm));
    end if;
  end;

  select count(*) into n from public.territories where id like 'v41c-%';
  res := res || jsonb_build_array(jsonb_build_object('p','Z every probe row rolled back — production is untouched','o',n=0,'d',n||' probe row(s) left'));

  return query select (x->>'p')::text,
                      case when (x->>'o')::boolean then 'PASS' else '*** FAIL ***' end,
                      (x->>'d')::text
                 from jsonb_array_elements(res) x;
end $$;

select * from pg_temp.c_livefire();
