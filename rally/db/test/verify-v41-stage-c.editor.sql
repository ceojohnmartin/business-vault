-- RALLY v41 - STAGE C (0016) PRODUCTION VERIFICATION - PART 1 of 2.
--
-- STRICTLY READ-ONLY. Every statement below is a SELECT. It creates one
-- pg_temp function (which dies with the session) and reads the catalog and
-- the territories table. It inserts nothing, updates nothing, deletes
-- nothing, and never touches assignment_server_authoritative.
--
-- This is the verification of the Stage C apply. Paste it whole into the
-- Supabase SQL Editor and paste the result back.

create or replace function pg_temp.c_verify()
returns table(probe text, result text, detail text) language plpgsql as $$
declare
  res    jsonb := '[]'::jsonb;
  n      bigint; b bigint; m double precision;
  ok     boolean;
begin
  ------------------------------------------------------------ A. objects
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
   where ns.nspname='public' and p.proname in
     ('rally_overlap_m2','rally_overlap_tolerance_m2','assert_no_turf_overlap');
  res := res || jsonb_build_array(jsonb_build_object('p','A1 the three Stage C functions exist','o',n=3,'d',n||' of 3'));

  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
   where ns.nspname='public' and p.proname='rally_overlap_m2'
     and pg_get_function_identity_arguments(p.oid)='a gis.geometry, b gis.geometry';
  res := res || jsonb_build_array(jsonb_build_object('p','A2 rally_overlap_m2 has the expected signature','o',n=1,'d','(gis.geometry, gis.geometry)'));

  select prosecdef into ok from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
   where ns.nspname='public' and p.proname='assert_no_turf_overlap';
  res := res || jsonb_build_array(jsonb_build_object('p','A3 the check is SECURITY DEFINER (it must see other reps hoods)','o',ok,'d',ok::text));

  select count(*) into n from pg_trigger
   where tgrelid='public.territories'::regclass and tgname='territories_no_overlap'
     and tgdeferrable and tginitdeferred and tgenabled='O';
  res := res || jsonb_build_array(jsonb_build_object('p','A4 the constraint trigger is armed, DEFERRABLE INITIALLY DEFERRED, enabled','o',n=1,'d',n||' of 1'));

  select public.rally_overlap_tolerance_m2() into m;
  res := res || jsonb_build_array(jsonb_build_object('p','A5 the tolerance is exactly 1.0 m2','o',m=1.0,'d',m::text));

  select bool_and(x) into ok from (
    select not has_function_privilege('anon',p.oid,'EXECUTE') x
      from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
     where ns.nspname='public' and p.proname in ('rally_overlap_m2','rally_overlap_tolerance_m2','assert_no_turf_overlap')
    union all
    select not has_function_privilege('authenticated',p.oid,'EXECUTE')
      from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
     where ns.nspname='public' and p.proname='assert_no_turf_overlap') z;
  res := res || jsonb_build_array(jsonb_build_object('p','A6 anon executes none of them; authenticated cannot call the check itself','o',ok,'d',ok::text));

  select has_function_privilege('authenticated',p.oid,'EXECUTE') into ok
    from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
   where ns.nspname='public' and p.proname='rally_overlap_m2';
  res := res || jsonb_build_array(jsonb_build_object('p','A7 authenticated CAN measure — the check runs as the writing client','o',ok,'d',ok::text));

  select position('pg_advisory_xact_lock' in prosrc)>0 into ok
    from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
   where ns.nspname='public' and p.proname='assert_no_turf_overlap';
  res := res || jsonb_build_array(jsonb_build_object('p','A8 the check takes a team-scoped advisory lock (the anti-race)','o',ok,'d','pg_advisory_xact_lock present'));

  select position('collectionextract' in lower(prosrc))>0 into ok
    from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
   where ns.nspname='public' and p.proname='rally_overlap_m2';
  res := res || jsonb_build_array(jsonb_build_object('p','A9 the measurement keeps only the polygonal part (edges/points = 0)','o',ok,'d','ST_CollectionExtract present'));

  ------------------------------------------------- B. Stage A/B + the flag
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
   where ns.nspname='public' and p.proname in
     ('rally_diff_assignees','set_territory_assignments','save_territory','clear_pin_dnk',
      'smart_split_territory_v41','smart_split_territory','rally_split_inherit','rally_ring_read',
      'rally_assert_ledger','rally_unresolved_live_assignments','rally_config_guard','rally_legacy_to_entries');
  res := res || jsonb_build_array(jsonb_build_object('p','B1 Stage A + Stage B objects intact','o',n=12,'d',n||' of 12'));

  select count(*) into n from pg_trigger where tgrelid='public.territories'::regclass and not tgisinternal and tgenabled<>'O';
  select count(*) into b from pg_trigger where tgrelid='public.pins'::regclass and not tgisinternal and tgenabled<>'O';
  res := res || jsonb_build_array(jsonb_build_object('p','B2 no territories/pins trigger was disabled','o',n=0 and b=0,'d',n||' + '||b||' disabled'));

  select assignment_server_authoritative into ok from public.rally_config limit 1;
  res := res || jsonb_build_array(jsonb_build_object('p','B3 assignment_server_authoritative is STILL FALSE','o',ok is false,'d',coalesce(ok::text,'null')));

  ------------------------------------------------------- C. production data
  select count(*) into n from public.territories
   where deleted_at is null and archived = false and geom is null
     and (public.rally_ring_problem(polygon) is not null or public.rally_ring_to_geom(polygon) is not null);
  res := res || jsonb_build_array(jsonb_build_object('p','C1 live hoods with an unusable outline','o',n=0,'d',n::text));

  select count(*) into n from (
    select 1 from public.territories a join public.territories b
      on a.team_id=b.team_id and a.id<b.id
     where a.deleted_at is null and a.archived=false and a.geom is not null
       and b.deleted_at is null and b.archived=false and b.geom is not null
       and a.geom operator(gis.&&) b.geom
       and public.rally_overlap_m2(a.geom,b.geom) > public.rally_overlap_tolerance_m2()) z;
  res := res || jsonb_build_array(jsonb_build_object('p','C2 live pairs overlapping > 1.0 m2','o',n=0,'d',n::text));

  begin
    select count(*) into n from (
      select public.rally_overlap_m2(a.geom,b.geom) from public.territories a join public.territories b
        on a.team_id=b.team_id and a.id<b.id
       where a.deleted_at is null and a.archived=false and a.geom is not null
         and b.deleted_at is null and b.archived=false and b.geom is not null
         and a.geom operator(gis.&&) b.geom) z;
    res := res || jsonb_build_array(jsonb_build_object('p','C3 every live candidate pair is measurable (0016 fails closed)','o',true,'d',n||' pair(s) measured'));
  exception when others then
    res := res || jsonb_build_array(jsonb_build_object('p','C3 every live candidate pair is measurable (0016 fails closed)','o',false,'d',sqlerrm));
  end;

  select public.rally_unresolved_live_assignments() into b;
  res := res || jsonb_build_array(jsonb_build_object('p','C4 activation blocker (unresolved CURRENT assignees)','o',b=0,'d',b::text));

  return query select (x->>'p')::text,
                      case when (x->>'o')::boolean then 'PASS' else '*** FAIL ***' end,
                      (x->>'d')::text
                 from jsonb_array_elements(res) x;
end $$;

select * from pg_temp.c_verify();
