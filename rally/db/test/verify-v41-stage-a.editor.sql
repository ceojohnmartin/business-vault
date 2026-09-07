-- RALLY v41 — STAGE A POST-APPLY VERIFICATION (Supabase SQL Editor form).
--
-- Run AFTER db/APPLY_v41_A.sql has committed. ROLLBACK-SAFE: the catalog
-- probes only read; the behavioural probes (a v40-shaped territory upsert as
-- a real leader, a rep's knock, the do-not-knock trigger, the derive
-- trigger) run inside ONE PL/pgSQL subtransaction that is always rolled back
-- by a deliberate exception at the end. No production row is kept, changed
-- or deleted. Only the two pg_temp functions outlive the statement, and
-- they die with the session.
--
-- Result: one row per probe — probe | result | detail — PASS, *** FAIL ***,
-- or INFO (a number to compare with the preflight, no verdict).
--
-- It picks a real enabled rep and a real enabled leader/manager/owner off
-- the same team, and a live hood of that team, so there is nothing to fill
-- in. Nothing here flips assignment_server_authoritative, even transiently.

create or replace function pg_temp.a_row(step text, ok boolean, detail text)
returns jsonb language sql immutable as $f$
  select jsonb_build_array(jsonb_build_object('step', step, 'ok', ok, 'detail', detail))
$f$;

create or replace function pg_temp.a_verify()
returns table(probe text, result text, detail text) language plpgsql as $$
declare
  res      jsonb := '[]'::jsonb;
  n        int;
  n2       int;
  n3       int;
  b        bigint;
  t        text;
  t2       text;
  j        jsonb;
  rep_id   uuid; boss_id uuid; team uuid;
  hood_id  text; hood_name text; hood_poly jsonb; hood_data jsonb; hood_led jsonb; hood_rev bigint;
  pid      text; pid2 text; tid text; tid2 text; cid text;
  now_ms   bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  ok       boolean;
  cols     text[] := array['team_id','id','name','polygon','homes','archived','created_by','deleted_at','data'];
  owned    text[] := array['geom','assignees','assignees_rev','open_assignees','cycle_started_at','created_at','updated_at'];
  have     text[];
begin
  -- ======================================================= A. catalog ====
  -- A1 PostGIS + the Stage A grant
  select n.nspname || ' ' || e.extversion into t
    from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'postgis';
  res := res || pg_temp.a_row('A1 PostGIS in gis', t like 'gis %', coalesce(t, 'NOT INSTALLED'));
  res := res || pg_temp.a_row('A1 gis USAGE granted to authenticated (0008''s Stage A line)',
    has_schema_privilege('authenticated', 'gis', 'USAGE'), 'has_schema_privilege = ' || has_schema_privilege('authenticated', 'gis', 'USAGE'));
  res := res || pg_temp.a_row('A1 gis CREATE still withheld from authenticated',
    not has_schema_privilege('authenticated', 'gis', 'CREATE'), '');

  -- A2 the v41 columns on territories
  select string_agg(a.attname || ':' || format_type(a.atttypid, a.atttypmod), ', ' order by a.attnum) into t
    from pg_attribute a where a.attrelid = 'public.territories'::regclass and a.attnum > 0 and not a.attisdropped
     and a.attname in ('geom','assignees','assignees_rev','open_assignees','cycle_started_at');
  res := res || pg_temp.a_row('A2 territories has geom / assignees / assignees_rev / open_assignees / cycle_started_at',
    t like '%geom:gis.geometry%' and t like '%assignees:jsonb%' and t like '%assignees_rev:bigint%'
      and t like '%open_assignees:uuid[]%' and t like '%cycle_started_at:timestamp with time zone%', coalesce(t, '(none)'));

  -- A3 functions: Stage A present, Stage B/C absent
  select string_agg(f, ', ') into t from unnest(array[
      'rally_ring_read','rally_ring_to_geom','rally_ring_problem','territories_derive_geom',
      'rally_capabilities','rally_ms','rally_uid','rally_uid_uuid','rally_sort_entries','rally_open_entries',
      'rally_first_open_assignee','rally_open_uuids','rally_mirror_assignments','rally_assert_ledger',
      'rally_keep_closed_history','rally_merge_provenance','territories_assignment','rally_legacy_to_entries',
      'rally_close_duplicate_opens','rally_unresolved_live_assignments','rally_config_guard',
      'rally_dnk_from_history','rally_strip_forged_clears','events_guard_dnk_clear','pins_protect_dnk']) f
   where not exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
                      where ns.nspname = 'public' and p.proname = f);
  res := res || pg_temp.a_row('A3 all 25 Stage A functions present', t is null, coalesce('missing: ' || t, 'all present'));
  select string_agg(f, ', ') into t from unnest(array[
      'save_territory','set_territory_assignments','start_territory_cycle','clear_pin_dnk',
      'smart_split_territory_v41','smart_split_territory_core','rally_overlap_m2','assert_no_turf_overlap']) f
   where exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
                  where ns.nspname = 'public' and p.proname = f);
  res := res || pg_temp.a_row('A3 no Stage B/C function exists yet (0014-0016 not applied)', t is null, coalesce('PRESENT: ' || t, 'none present'));
  select string_agg(p.proname, ', ') into t
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname in (
      'rally_ring_read','rally_ring_to_geom','rally_ring_problem','territories_derive_geom',
      'rally_capabilities','rally_ms','rally_uid','rally_uid_uuid','rally_sort_entries','rally_open_entries',
      'rally_first_open_assignee','rally_open_uuids','rally_mirror_assignments','rally_assert_ledger',
      'rally_keep_closed_history','rally_merge_provenance','territories_assignment','rally_legacy_to_entries',
      'rally_close_duplicate_opens','rally_unresolved_live_assignments','rally_config_guard',
      'rally_dnk_from_history','rally_strip_forged_clears','events_guard_dnk_clear','pins_protect_dnk')
     and has_function_privilege('anon', p.oid, 'EXECUTE');
  res := res || pg_temp.a_row('A3 no Stage A function is executable by anon (Supabase''s default function privileges revoked)', t is null, coalesce('anon may execute: ' || t, 'none'));
  select string_agg(p.proname, ', ') into t
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname in ('rally_unresolved_live_assignments','rally_config_guard','territories_assignment','territories_derive_geom','pins_protect_dnk','events_guard_dnk_clear')
     and has_function_privilege('authenticated', p.oid, 'EXECUTE');
  res := res || pg_temp.a_row('A3 the SECURITY DEFINER guard counter and the trigger functions are not executable by authenticated', t is null, coalesce('authenticated may execute: ' || t, 'none'));
  res := res || pg_temp.a_row('A3 v40''s smart_split_territory (0005) still present',
    to_regprocedure('public.smart_split_territory(text,text,jsonb)') is not null
    or exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace where ns.nspname = 'public' and p.proname = 'smart_split_territory'), '');

  -- A4 triggers present and enabled
  select string_agg(x.tg || ' on ' || x.tbl, ', ') into t from (values
      ('territories_derive_geom','territories'), ('territories_assignment','territories'),
      ('rally_config_guard','rally_config'), ('events_guard_dnk_clear','events'), ('pins_protect_dnk','pins')) x(tg, tbl)
   where not exists (select 1 from pg_trigger g join pg_class c on c.oid = g.tgrelid join pg_namespace ns on ns.oid = c.relnamespace
                      where ns.nspname = 'public' and c.relname = x.tbl and g.tgname = x.tg and g.tgenabled = 'O');
  res := res || pg_temp.a_row('A4 the five Stage A triggers exist and are enabled', t is null, coalesce('missing/disabled: ' || t, 'all enabled'));
  res := res || pg_temp.a_row('A4 territories_no_overlap (0016) does NOT exist yet',
    not exists (select 1 from pg_trigger g join pg_class c on c.oid = g.tgrelid where c.relname = 'territories' and g.tgname = 'territories_no_overlap'), '');
  res := res || pg_temp.a_row('A4 0001''s territories_touch trigger untouched',
    exists (select 1 from pg_trigger g join pg_class c on c.oid = g.tgrelid where c.relname = 'territories' and g.tgname like '%touch%' and g.tgenabled = 'O'), '');

  -- A5 indexes
  select indexdef into t from pg_indexes where schemaname = 'public' and indexname = 'territories_geom_live_gist';
  res := res || pg_temp.a_row('A5 partial GiST index on geom with the LIVE predicate',
    t like '%USING gist (geom)%' and t like '%deleted_at IS NULL%' and t like '%archived = false%', coalesce(t, 'MISSING'));
  select indexdef into t from pg_indexes where schemaname = 'public' and indexname = 'territories_open_assignees_gin';
  res := res || pg_temp.a_row('A5 partial GIN index on open_assignees', t like '%USING gin (open_assignees)%', coalesce(t, 'MISSING'));

  -- A6 rally_config: one row, flag FALSE, unreachable by clients
  select count(*), count(*) filter (where id and not assignment_server_authoritative) into n, n2 from public.rally_config;
  res := res || pg_temp.a_row('A6 rally_config holds ONE row and assignment_server_authoritative = FALSE', n = 1 and n2 = 1,
    n || ' row(s), ' || n2 || ' with the flag false');
  res := res || pg_temp.a_row('A6 rally_config has RLS enabled and no policy (nobody but the owner reads it)',
    (select relrowsecurity from pg_class where oid = 'public.rally_config'::regclass)
      and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rally_config'), '');
  res := res || pg_temp.a_row('A6 anon / authenticated hold no privilege on rally_config',
    not has_table_privilege('authenticated', 'public.rally_config', 'SELECT, INSERT, UPDATE, DELETE')
    and not has_table_privilege('anon', 'public.rally_config', 'SELECT, INSERT, UPDATE, DELETE'), '');

  -- A7 rally_capabilities()
  j := public.rally_capabilities();
  res := res || pg_temp.a_row('A7 rally_capabilities() = flag false, turfRpc false, postgis true',
    j->>'assignmentServerAuthoritative' = 'false' and j->>'turfRpc' = 'false' and j->>'postgis' = 'true', j::text);
  res := res || pg_temp.a_row('A7 rally_capabilities() executable by authenticated, not by anon',
    has_function_privilege('authenticated', 'public.rally_capabilities()', 'EXECUTE')
    and not has_function_privilege('anon', 'public.rally_capabilities()', 'EXECUTE'), '');

  -- A8 column privileges (0012)
  select array_agg(a.attname order by a.attname) into have
    from pg_attribute a where a.attrelid = 'public.territories'::regclass and a.attnum > 0 and not a.attisdropped
     and has_column_privilege('authenticated', a.attrelid, a.attname, 'INSERT');
  res := res || pg_temp.a_row('A8 authenticated may INSERT exactly the nine client columns',
    have = (select array_agg(c order by c) from unnest(cols) c), 'insert: ' || coalesce(array_to_string(have, ','), '(none)'));
  select array_agg(a.attname order by a.attname) into have
    from pg_attribute a where a.attrelid = 'public.territories'::regclass and a.attnum > 0 and not a.attisdropped
     and has_column_privilege('authenticated', a.attrelid, a.attname, 'UPDATE');
  res := res || pg_temp.a_row('A8 authenticated may UPDATE exactly the nine client columns',
    have = (select array_agg(c order by c) from unnest(cols) c), 'update: ' || coalesce(array_to_string(have, ','), '(none)'));
  select string_agg(c, ',') into t from unnest(owned) c
   where has_column_privilege('authenticated', 'public.territories'::regclass, c, 'INSERT')
      or has_column_privilege('authenticated', 'public.territories'::regclass, c, 'UPDATE');
  res := res || pg_temp.a_row('A8 no server-owned column is writable by authenticated', t is null, coalesce('WRITABLE: ' || t, 'none writable'));
  res := res || pg_temp.a_row('A8 table-wide INSERT/UPDATE revoked, SELECT still table-wide (pulls use no column list)',
    not has_table_privilege('authenticated', 'public.territories', 'INSERT')
    and not has_table_privilege('authenticated', 'public.territories', 'UPDATE')
    and has_table_privilege('authenticated', 'public.territories', 'SELECT'), '');

  -- ======================================================== B. the ledger ====
  -- the 0011 proofs were ASSERTIONS inside the apply transaction (it could
  -- not have committed had any failed); what can be re-checked afterwards
  -- is the state they left: every row has a ledger, the mirrors agree with
  -- it, the invariants hold, and nothing was lost.
  select count(*),
         count(*) filter (where jsonb_typeof(assignees->'entries') = 'array'),
         coalesce(sum(case when jsonb_typeof(assignees->'entries') = 'array' then jsonb_array_length(assignees->'entries') else 0 end), 0)
    into n, n2, n3 from public.territories;
  res := res || pg_temp.a_row('B1 every territory row carries a ledger', n = n2, n || ' hood(s), ' || n2 || ' with assignees.entries');
  res := res || pg_temp.a_row('B1 INFO ledger totals — compare with the preflight census (kept + synthesized = entries)', true,
    'hoods=' || n || ' entries=' || n3 || ' open=' || (select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e where e->>'unassignedAt' is null)
    || ' unresolved_tagged=' || (select count(*) from public.territories t, jsonb_array_elements(t.assignees->'entries') e where e->>'userIdResolved' = 'false'));
  -- PROOF 1 restated: no hood whose mirror lists entries has an empty ledger
  select count(*) into n from public.territories
   where jsonb_typeof(data) = 'object' and jsonb_typeof(data->'assignments') = 'array'
     and jsonb_array_length(data->'assignments') > 0 and jsonb_array_length(assignees->'entries') = 0;
  res := res || pg_temp.a_row('B2 PROOF 1 (after): no hood with assignment history has an empty ledger', n = 0, n || ' hood(s) lost their history');
  -- PROOF 2/4 restated: the mirrors are the ledger's
  select count(*) into n from public.territories t
   where jsonb_typeof(t.data) = 'object'
     and coalesce(t.data->>'assignedTo', '') is distinct from coalesce(public.rally_first_open_assignee(t.assignees), '');
  res := res || pg_temp.a_row('B3 PROOF 4 (after): data.assignedTo equals the ledger''s first open entry on every hood', n = 0, n || ' disagree');
  select count(*) into n from public.territories t
   where jsonb_typeof(t.data) = 'object'
     and coalesce(t.data->'assignments', '[]'::jsonb) is distinct from public.rally_mirror_assignments(t.assignees);
  res := res || pg_temp.a_row('B3 PROOF 2 (after): data.assignments is the ledger''s v40 mirror on every hood', n = 0, n || ' disagree');
  select count(*) into n from public.territories t
   where t.open_assignees is distinct from public.rally_open_uuids(t.assignees, t.team_id);
  res := res || pg_temp.a_row('B3 open_assignees (uuid[] index mirror) equals the ledger''s resolved open set on every hood', n = 0, n || ' disagree');
  -- PROOF 3 restated: invariants I1..I3 hold on every ledger
  select count(*) into n from (
    select t.team_id, t.id from public.territories t, jsonb_array_elements(t.assignees->'entries') e
     where e->>'unassignedAt' is null group by 1, 2, e->>'userId' having count(*) > 1) z;
  select count(*) into n2 from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where public.rally_ms(e->>'assignedAt') is null or public.rally_ms(e->>'assignedAt') <= 0
      or (e->>'unassignedAt' is not null and (public.rally_ms(e->>'unassignedAt') is null
          or public.rally_ms(e->>'unassignedAt') < public.rally_ms(e->>'assignedAt')));
  res := res || pg_temp.a_row('B4 PROOF 3 (after): I1 one open entry per rep, I2 assignedAt > 0, I3 end >= start, on every hood',
    n = 0 and n2 = 0, n || ' I1 violation(s), ' || n2 || ' I2/I3 violation(s)');
  -- PROOF 5 restated
  select count(*) into n from public.territories t, jsonb_array_elements(t.assignees->'entries') e where e->>'userIdResolved' = 'false';
  res := res || pg_temp.a_row('B5 INFO PROOF 5 (after): historical entries tagged userIdResolved=false (kept, never dropped)', true, n || ' tagged — expected 0 on production (preflight 3b was empty)');
  select public.rally_unresolved_live_assignments() into n;
  res := res || pg_temp.a_row('B5 the activation guard would find 0 live hoods with an unresolved CURRENT assignee (flip NOT performed)', n = 0, n::text);
  select count(*) into n from public.territories where assignees_rev < 1 and jsonb_array_length(assignees->'entries') > 0;
  res := res || pg_temp.a_row('B6 every backfilled ledger has assignees_rev >= 1', n = 0, n || ' at rev 0');

  -- ======================================================= C. geometry ====
  select count(*) filter (where deleted_at is null and not archived
                            and (case when jsonb_typeof(polygon) = 'array' then jsonb_array_length(polygon) else 0 end) > 0),
         count(*) filter (where deleted_at is null and not archived and geom is not null and gis.st_isvalid(geom)),
         count(*) filter (where deleted_at is null and not archived and geom is null
                            and (case when jsonb_typeof(polygon) = 'array' then jsonb_array_length(polygon) else 0 end) > 0)
    into n, n2, n3 from public.territories;
  res := res || pg_temp.a_row('C1 every LIVE hood with an outline has a valid geom', n3 = 0 and n = n2, n || ' live with an outline, ' || n2 || ' with valid geom, ' || n3 || ' with an outline but NULL geom');
  select string_agg(name || ' [' || id || ']', ', ') into t from public.territories
   where deleted_at is null and not archived
     and (case when jsonb_typeof(polygon) = 'array' then jsonb_array_length(polygon) else 0 end) = 0;
  res := res || pg_temp.a_row('C1 INFO live hoods with no outline yet (legal drafts, not turf)', true, coalesce(t, '(none)'));
  select string_agg(name || ' [' || id || ']', ', ') into t from public.territories
   where (archived or deleted_at is not null) and geom is null and jsonb_typeof(polygon) = 'array' and jsonb_array_length(polygon) > 0;
  res := res || pg_temp.a_row('C2 INFO archived/tombstoned hoods left with NULL geom (expected: the two archived originals)', true, coalesce(t, '(none)'));
  select count(*) into n from public.territories where geom is not null and not gis.st_isvalid(geom);
  res := res || pg_temp.a_row('C3 no stored geom is invalid (0009 stores NULL rather than an invalid shape)', n = 0, n || ' invalid');

  -- ============================================ D. behaviour, rolled back ====
  begin
    -- the hood first: a LIVE hood with a geom on a team that has both an
    -- enabled rep and an enabled leader/manager/owner; then that team's people
    select t.team_id, t.id, t.name, t.polygon, t.data, t.assignees, t.assignees_rev
      into team, hood_id, hood_name, hood_poly, hood_data, hood_led, hood_rev
      from public.territories t
     where t.deleted_at is null and not t.archived and t.geom is not null and jsonb_typeof(t.data) = 'object'
       and exists (select 1 from public.profiles r where r.team_id = t.team_id and r.role = 'rep' and not coalesce(r.disabled, false))
       and exists (select 1 from public.profiles b where b.team_id = t.team_id and b.role in ('leader','manager','owner') and not coalesce(b.disabled, false))
     order by t.team_id, t.id limit 1;
    if team is null then
      select p.team_id into team from public.profiles p
       where p.role = 'rep' and p.team_id is not null and not coalesce(p.disabled, false)
         and exists (select 1 from public.profiles b where b.team_id = p.team_id and b.role in ('leader','manager','owner') and not coalesce(b.disabled, false))
       order by p.team_id limit 1;
    end if;
    select p.id into rep_id from public.profiles p
     where p.role = 'rep' and p.team_id = team and not coalesce(p.disabled, false) order by p.id limit 1;
    select p.id into boss_id from public.profiles p
     where p.role in ('leader','manager','owner') and p.team_id = team and not coalesce(p.disabled, false) order by p.id limit 1;
    if rep_id is null or boss_id is null then
      res := res || pg_temp.a_row('D0 SETUP', false, 'need one enabled rep AND one enabled leader/manager/owner on the same team — behavioural probes skipped');
      raise exception using message = 'v41a-probe-rollback';
    end if;
    res := res || pg_temp.a_row('D0 SETUP', true, 'team ' || team || ' — probing as a real rep and a real leader' || coalesce(', hood ' || hood_id, ''));
    if hood_id is null then
      res := res || pg_temp.a_row('D1 a v40-shaped upsert by a leader commits after 0012', false, 'SKIPPED: no live hood with a geom on a team that has both a rep and a leader');
      res := res || pg_temp.a_row('D2 a client write naming assignees is refused', false, 'SKIPPED: no live hood to probe');
    end if;
    tid  := 'v41a-probe-' || substr(md5(random()::text), 1, 10);
    tid2 := 'v41a-probe-b-' || substr(md5(random()::text), 1, 10);
    pid  := 'v41a-probe-pin-' || substr(md5(random()::text), 1, 10);
    pid2 := 'v41a-probe-pin2-' || substr(md5(random()::text), 1, 10);
    cid  := 'v41a-probe-c-' || substr(md5(random()::text), 1, 10);

    -- D1 as the LEADER: the exact v40 upsert shape (nine columns, merge-duplicates), a rename
    perform set_config('request.jwt.claims', json_build_object('sub', boss_id)::text, true);
    execute 'set local role authenticated';
    if hood_id is not null then
      begin
        insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
        values (team, hood_id, hood_name || ' (probe)', hood_poly, null, false, boss_id, null,
                jsonb_set(hood_data, '{updatedAt}', to_jsonb(now_ms)))
        on conflict (team_id, id) do update set
          team_id = excluded.team_id, id = excluded.id, name = excluded.name, polygon = excluded.polygon,
          homes = excluded.homes, archived = excluded.archived, created_by = excluded.created_by,
          deleted_at = excluded.deleted_at, data = excluded.data;
        select t.name, t.assignees, t.assignees_rev, (t.geom is not null) into t, j, n, ok
          from public.territories t where t.team_id = team and t.id = hood_id;
        res := res || pg_temp.a_row('D1 a v40-shaped upsert by a leader (nine columns, merge-duplicates) commits after 0012',
          t = hood_name || ' (probe)', 'name is now "' || t || '"');
        res := res || pg_temp.a_row('D1 …and leaves the ledger untouched (same entries, same revision) — legacy authority, same mirror',
          j = hood_led and n = hood_rev, 'rev ' || hood_rev || ' -> ' || n);
        res := res || pg_temp.a_row('D1 …and geom is re-derived, not NULL', ok, '');
      exception when others then
        res := res || pg_temp.a_row('D1 a v40-shaped upsert by a leader commits after 0012', false, 'REFUSED: ' || sqlerrm);
      end;
      -- D2 the same upsert naming a server-owned column is refused by 0012
      begin
        insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data, assignees)
        values (team, hood_id, hood_name, hood_poly, null, false, boss_id, null, hood_data, '{"entries": []}'::jsonb)
        on conflict (team_id, id) do update set name = excluded.name, assignees = excluded.assignees;
        res := res || pg_temp.a_row('D2 a client write naming assignees is refused', false, 'ALLOWED — 0012 is not in effect');
      exception when insufficient_privilege then
        res := res || pg_temp.a_row('D2 a client write naming assignees is refused (insufficient_privilege)', true, sqlerrm);
      end;
    end if;
    -- D3 as the leader: a NEW hood with a self-crossing outline is refused by 0009, by name
    begin
      insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
      values (team, tid2, 'probe bowtie', '[[0.5,0.5],[0.501,0.501],[0.501,0.5],[0.5,0.501]]'::jsonb, null, false, boss_id, null,
              jsonb_build_object('id', tid2, 'assignedTo', '', 'updatedAt', now_ms));
      res := res || pg_temp.a_row('D3 a self-crossing new outline is refused by 0009', false, 'ALLOWED — the derive trigger is not in effect');
    exception when others then
      res := res || pg_temp.a_row('D3 a self-crossing new outline is refused by 0009 with the reason', sqlstate = '22023' and sqlerrm like '%Self-intersection%', sqlstate || ': ' || sqlerrm);
    end;
    -- D4 as the leader: a valid new hood in the v40 shape, assigned to the rep in the payload
    begin
      insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
      values (team, tid, 'probe hood', '[[0.5,0.5],[0.501,0.5],[0.501,0.501],[0.5,0.501]]'::jsonb, null, false, boss_id, null,
              jsonb_build_object('id', tid, 'assignedTo', rep_id::text, 'updatedAt', now_ms,
                'assignments', jsonb_build_array(jsonb_build_object('userId', rep_id::text, 'name', 'probe rep',
                  'assignedBy', 'probe lead', 'assignedAt', now_ms, 'unassignedAt', null))));
      select (t.geom is not null and gis.st_isvalid(t.geom)
              and t.open_assignees = array[rep_id] and t.assignees_rev = 1
              and t.data->>'assignedTo' = rep_id::text
              and jsonb_array_length(t.assignees->'entries') = 1),
             'geom=' || (t.geom is not null) || ' open_assignees=' || t.open_assignees::text || ' rev=' || t.assignees_rev
        into ok, t from public.territories t where t.team_id = team and t.id = tid;
      res := res || pg_temp.a_row('D4 a valid new v40 hood gets a geom, a ledger, the uuid[] mirror and the scalar mirror', ok, t);
    exception when others then
      res := res || pg_temp.a_row('D4 a valid new v40 hood commits', false, 'REFUSED: ' || sqlerrm);
    end;
    -- D8 the UPDATE arm under legacy authority: a v40 phone reassigns the
    -- probe hood by rewriting the mirror — the ledger must follow
    begin
      insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
      values (team, tid, 'probe hood', '[[0.5,0.5],[0.501,0.5],[0.501,0.501],[0.5,0.501]]'::jsonb, null, false, boss_id, null,
              jsonb_build_object('id', tid, 'assignedTo', '', 'updatedAt', now_ms + 10,
                'assignments', jsonb_build_array(jsonb_build_object('userId', rep_id::text, 'name', 'probe rep',
                  'assignedBy', 'probe lead', 'assignedAt', now_ms, 'unassignedAt', now_ms + 10))))
      on conflict (team_id, id) do update set
        team_id = excluded.team_id, id = excluded.id, name = excluded.name, polygon = excluded.polygon,
        homes = excluded.homes, archived = excluded.archived, created_by = excluded.created_by,
        deleted_at = excluded.deleted_at, data = excluded.data;
      select (t.open_assignees = '{}'::uuid[] and t.assignees_rev = 2 and coalesce(t.data->>'assignedTo', '') = ''
              and (select count(*) from jsonb_array_elements(t.assignees->'entries') e where (e->>'unassignedAt')::bigint = now_ms + 10) = 1),
             'open=' || t.open_assignees::text || ' rev=' || t.assignees_rev
        into ok, t from public.territories t where t.team_id = team and t.id = tid;
      res := res || pg_temp.a_row('D8 a v40 unassign through the legacy mirror closes the ledger entry at the phone''s instant (rev 2, nobody open)', ok, t);
      insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
      values (team, tid, 'probe hood', '[[0.5,0.5],[0.501,0.5],[0.501,0.501],[0.5,0.501]]'::jsonb, null, false, boss_id, null,
              jsonb_build_object('id', tid, 'assignedTo', rep_id::text, 'updatedAt', now_ms + 20,
                'assignments', jsonb_build_array(
                  jsonb_build_object('userId', rep_id::text, 'name', 'probe rep', 'assignedBy', 'probe lead', 'assignedAt', now_ms, 'unassignedAt', now_ms + 10),
                  jsonb_build_object('userId', rep_id::text, 'name', 'probe rep', 'assignedBy', 'probe lead', 'assignedAt', now_ms + 20, 'unassignedAt', null))))
      on conflict (team_id, id) do update set
        team_id = excluded.team_id, id = excluded.id, name = excluded.name, polygon = excluded.polygon,
        homes = excluded.homes, archived = excluded.archived, created_by = excluded.created_by,
        deleted_at = excluded.deleted_at, data = excluded.data;
      select (t.open_assignees = array[rep_id] and t.assignees_rev = 3 and jsonb_array_length(t.assignees->'entries') = 2
              and t.data->>'assignedTo' = rep_id::text),
             'open=' || t.open_assignees::text || ' rev=' || t.assignees_rev || ' entries=' || jsonb_array_length(t.assignees->'entries')
        into ok, t from public.territories t where t.team_id = team and t.id = tid;
      res := res || pg_temp.a_row('D8 …and a v40 re-assignment opens a NEW entry while the closed one survives (I4; rev 3, two entries)', ok, t);
    exception when others then
      res := res || pg_temp.a_row('D8 a v40 reassignment through the legacy mirror', false, 'REFUSED: ' || sqlerrm);
    end;
    -- D9 v40's certified Smart Split (0005) under the new triggers
    begin
      j := public.smart_split_territory(tid, 'v41a-probe-op-' || tid, jsonb_build_array(
             jsonb_build_object('id', tid || '-a', 'name', 'probe A', 'polygon', '[[0.5,0.5],[0.5005,0.5],[0.5005,0.501],[0.5,0.501]]'::jsonb, 'homes', 10),
             jsonb_build_object('id', tid || '-b', 'name', 'probe B', 'polygon', '[[0.5005,0.5],[0.501,0.5],[0.501,0.501],[0.5005,0.501]]'::jsonb, 'homes', 10)));
      select count(*) into n from public.territories t
       where t.team_id = team and t.id in (tid || '-a', tid || '-b') and t.deleted_at is null and not t.archived
         and t.geom is not null and gis.st_isvalid(t.geom) and t.assignees = '{"entries": []}'::jsonb and t.open_assignees = '{}'::uuid[];
      select (deleted_at is not null) into ok from public.territories where team_id = team and id = tid;
      res := res || pg_temp.a_row('D9 v40''s Smart Split (0005 RPC) commits under the new triggers: two live children with valid geoms, unassigned as v40 makes them, parent tombstoned',
        n = 2 and ok, n || ' child(ren) ok, parent tombstoned=' || ok || ' status=' || coalesce(j->>'status', j::text));
    exception when others then
      res := res || pg_temp.a_row('D9 v40''s Smart Split (0005 RPC) under the new triggers', false, 'REFUSED: ' || sqlerrm);
    end;
    -- D10 an EXISTING hood with an unusable outline (archived, NULL geom) may
    -- still be written by a v40 phone as long as the ring is untouched and it
    -- is not brought back live — the INSERT arm of the upsert included
    select t.id, t.name, t.polygon, t.data into tid2, hood_name, hood_poly, hood_data
      from public.territories t
     where t.team_id = team and t.archived and t.deleted_at is null and t.geom is null
       and (case when jsonb_typeof(t.polygon) = 'array' then jsonb_array_length(t.polygon) else 0 end) > 0
       and jsonb_typeof(t.data) = 'object' order by t.id limit 1;
    if tid2 is null then
      res := res || pg_temp.a_row('D10 INFO no archived hood with an unusable outline on this team — the upsert escape is not probed here', true, '');
    else
      begin
        insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
        values (team, tid2, hood_name || ' (probe)', hood_poly, null, true, boss_id, null, jsonb_set(hood_data, '{updatedAt}', to_jsonb(now_ms)))
        on conflict (team_id, id) do update set
          team_id = excluded.team_id, id = excluded.id, name = excluded.name, polygon = excluded.polygon,
          homes = excluded.homes, archived = excluded.archived, created_by = excluded.created_by,
          deleted_at = excluded.deleted_at, data = excluded.data;
        select t.name = hood_name || ' (probe)' and t.geom is null into ok from public.territories t where t.team_id = team and t.id = tid2;
        res := res || pg_temp.a_row('D10 a v40 upsert of an ARCHIVED hood whose outline is unusable commits when the ring is untouched (geom stays NULL)', ok, tid2);
      exception when others then
        res := res || pg_temp.a_row('D10 a v40 upsert of an archived hood with an unusable outline', false, 'REFUSED: ' || sqlerrm);
      end;
      begin
        insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
        values (team, tid2, hood_name, hood_poly, null, false, boss_id, null, jsonb_set(hood_data, '{updatedAt}', to_jsonb(now_ms + 1)))
        on conflict (team_id, id) do update set
          team_id = excluded.team_id, id = excluded.id, name = excluded.name, polygon = excluded.polygon,
          homes = excluded.homes, archived = excluded.archived, created_by = excluded.created_by,
          deleted_at = excluded.deleted_at, data = excluded.data;
        res := res || pg_temp.a_row('D10 …but un-archiving it back into live turf is refused until the ring is fixed', false, 'ALLOWED — a NULL-geom hood went live');
      exception when others then
        res := res || pg_temp.a_row('D10 …but un-archiving it back into live turf is refused until the ring is fixed (22023)', sqlstate = '22023', sqlstate || ': ' || left(sqlerrm, 80));
      end;
    end if;
    -- D5 rally_capabilities() as a client
    begin
      j := public.rally_capabilities();
      res := res || pg_temp.a_row('D5 rally_capabilities() as authenticated: flag false, turfRpc false', j->>'assignmentServerAuthoritative' = 'false' and j->>'turfRpc' = 'false', j::text);
    exception when others then
      res := res || pg_temp.a_row('D5 rally_capabilities() as authenticated', false, sqlerrm);
    end;
    execute 'reset role';

    -- D6 as the REP: no territory insert (0003 unchanged), work still allowed
    perform set_config('request.jwt.claims', json_build_object('sub', rep_id)::text, true);
    execute 'set local role authenticated';
    begin
      insert into public.territories (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
      values (team, tid2, 'rep probe', '[[0.6,0.6],[0.601,0.6],[0.601,0.601],[0.6,0.601]]'::jsonb, null, false, rep_id, null, '{}'::jsonb);
      res := res || pg_temp.a_row('D6 a rep may NOT create a territory', false, 'ALLOWED — 0003 is not in effect');
    exception when insufficient_privilege then
      res := res || pg_temp.a_row('D6 a rep may NOT create a territory (0003 unchanged)', true, 'denied, as required');
    end;
    begin
      insert into public.pins (team_id, id, lat, lng, address, disposition, data, created_by)
      values (team, pid2, 0.6, 0.6, 'probe st', 'nh', jsonb_build_object('disposition', 'nh', 'updatedAt', now_ms), rep_id);
      update public.pins set disposition = 'sold', data = jsonb_set(data, '{disposition}', '"sold"') where team_id = team and id = pid2;
      insert into public.customers (team_id, id, first, last) values (team, cid, 'Probe', 'Row');
      insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user, data)
      values (team, 'v41a-probe-ev-' || pid2, pid2, 'knock', 'sold', now_ms, rep_id, '{}'::jsonb);
      select disposition into t from public.pins where team_id = team and id = pid2;
      res := res || pg_temp.a_row('D6 a rep''s ordinary work (pin, knock, re-disposition, customer, event) still commits', t = 'sold', 'pin disposition ' || t);
    exception when others then
      res := res || pg_temp.a_row('D6 a rep''s ordinary work still commits', false, 'DENIED — reps cannot work: ' || sqlerrm);
    end;

    -- D7 do-not-knock authority (0013), as the rep
    begin
      insert into public.pins (team_id, id, lat, lng, address, disposition, data, created_by)
      values (team, pid, 0.6, 0.6, 'probe st', 'dnk',
              jsonb_build_object('disposition', 'dnk', 'updatedAt', now_ms,
                'history', jsonb_build_array(jsonb_build_object('ts', now_ms - 1000, 'disposition', 'dnk', 'reason', null, 'dm', false))), rep_id);
      -- a) an attempt to make the black door knockable again is NEUTRALISED, not refused
      update public.pins set disposition = 'nh',
             data = jsonb_set(jsonb_set(data, '{disposition}', '"nh"'), '{updatedAt}', to_jsonb(now_ms + 1))
       where team_id = team and id = pid;
      select disposition, data->>'disposition', public.rally_ms(data->>'updatedAt') into t, t2, b from public.pins where team_id = team and id = pid;
      res := res || pg_temp.a_row('D7 pins_protect_dnk: a rep''s re-disposition of a black door is neutralised (column and mirror restored, write kept)',
        t = 'dnk' and t2 = 'dnk' and b > now_ms + 1, 'disposition=' || t || ' data.disposition=' || t2 || ' updatedAt stamped above the incoming value: ' || (b > now_ms + 1));
      -- b) a tombstone of a black door is neutralised
      update public.pins set deleted_at = now() where team_id = team and id = pid;
      select (deleted_at is null) into ok from public.pins where team_id = team and id = pid;
      res := res || pg_temp.a_row('D7 pins_protect_dnk: a rep''s tombstone of a black door is neutralised', ok, '');
      -- c) a forged clear in the history is stripped
      update public.pins set data = jsonb_set(data, '{history}', (data->'history') || jsonb_build_object('ts', now_ms + 5000, 'disposition', 'dnk_clear'))
       where team_id = team and id = pid;
      select count(*) into n from public.pins p, jsonb_array_elements(p.data->'history') h
       where p.team_id = team and p.id = pid and h->>'disposition' = 'dnk_clear';
      select disposition into t from public.pins where team_id = team and id = pid;
      res := res || pg_temp.a_row('D7 rally_strip_forged_clears: a client-planted dnk_clear is stripped and the door stays black', n = 0 and t = 'dnk', n || ' forged clear(s) kept, disposition=' || t);
      -- d) a dnk_clear EVENT from a client is skipped, an ordinary knock is not
      insert into public.events (team_id, id, pin_id, type, disposition, at_ms, by_user, data)
      values (team, 'v41a-probe-clear-' || pid, pid, 'knock', 'dnk_clear', now_ms, rep_id, '{}'::jsonb);
      select count(*) into n from public.events where team_id = team and id = 'v41a-probe-clear-' || pid;
      res := res || pg_temp.a_row('D7 events_guard_dnk_clear: a client dnk_clear event is skipped (0 rows), the batch is not refused', n = 0, n || ' row(s) stored');
      -- e) a NEW pin arriving with a planted clear in its history: stripped on INSERT too
      insert into public.pins (team_id, id, lat, lng, address, disposition, data, created_by)
      values (team, pid || '-ins', 0.6, 0.6, 'probe st', 'nh',
              jsonb_build_object('disposition', 'nh', 'updatedAt', now_ms,
                'history', jsonb_build_array(jsonb_build_object('ts', now_ms + 5000, 'disposition', 'dnk_clear'))), rep_id);
      select count(*) into n from public.pins p, jsonb_array_elements(p.data->'history') h
       where p.team_id = team and p.id = pid || '-ins' and h->>'disposition' = 'dnk_clear';
      res := res || pg_temp.a_row('D7 rally_strip_forged_clears: a planted dnk_clear is stripped on INSERT as well', n = 0, n || ' kept');
    exception when others then
      res := res || pg_temp.a_row('D7 do-not-knock authority probes', false, 'UNEXPECTED: ' || sqlerrm);
    end;
    execute 'reset role';
    -- f) leadership does not help: a LEADER's ordinary edit cannot clear a black door either
    perform set_config('request.jwt.claims', json_build_object('sub', boss_id)::text, true);
    execute 'set local role authenticated';
    begin
      update public.pins set disposition = 'nh', data = jsonb_set(jsonb_set(data, '{disposition}', '"nh"'), '{updatedAt}', to_jsonb(now_ms + 2)), deleted_at = now()
       where team_id = team and id = pid;
      select disposition, data->>'disposition', (deleted_at is null) into t, t2, ok from public.pins where team_id = team and id = pid;
      res := res || pg_temp.a_row('D7 pins_protect_dnk: a LEADER''s ordinary re-disposition + tombstone of a black door is neutralised too', t = 'dnk' and t2 = 'dnk' and ok, 'disposition=' || t || ' deleted_at null=' || ok);
    exception when others then
      res := res || pg_temp.a_row('D7 leader path of the do-not-knock trigger', false, 'UNEXPECTED: ' || sqlerrm);
    end;
    execute 'reset role';

    -- every write above is undone here; the results live in `res`
    raise exception using message = 'v41a-probe-rollback';
  exception when others then
    if sqlerrm <> 'v41a-probe-rollback' then
      res := res || pg_temp.a_row('UNEXPECTED ERROR', false, sqlerrm);
    end if;
  end;
  begin execute 'reset role'; exception when others then null; end;
  perform set_config('request.jwt.claims', '', true);

  return query
    select r->>'step',
           case when r->>'step' like '%INFO%' then 'INFO'
                when (r->>'ok')::boolean then 'PASS' else '*** FAIL ***' end,
           r->>'detail'
      from jsonb_array_elements(res) with ordinality x(r, ord)
     order by ord;
end $$;

select * from pg_temp.a_verify();
