-- RALLY v41 — STAGE A part 4. Column privileges on territories.
--
-- WHY THE CONFLICT-KEY COLUMNS APPEAR IN THE UPDATE GRANT.
--
-- The client pushes with PostgREST:
--     POST /rest/v1/territories?on_conflict=team_id,id
--     Prefer: resolution=merge-duplicates
-- which becomes INSERT ... ON CONFLICT (team_id,id) DO UPDATE SET <every
-- payload column, the conflict keys included> — the shape db/test/rls-test.sql
-- has modelled verbatim since v39.
--
-- The DO UPDATE arm is an UPDATE, and PostgreSQL checks it against UPDATE
-- COLUMN privileges for every column in its SET list. Omitting team_id and
-- id therefore breaks every upsert against an EXISTING row, which is the
-- common case. Proven by probe: with insert(team_id,id,name,data) and
-- update(name,data) the statement fails "permission denied for table";
-- adding update(team_id,id) makes the identical statement succeed.
--
-- Granting UPDATE on the conflict keys is safe, provably. ON CONFLICT
-- (team_id,id) only fires when the proposed row's keys ALREADY EQUAL an
-- existing row's, so `excluded.team_id` is identically that row's team_id
-- and `excluded.id` its id: both assignments are self-assignments and
-- cannot move a row between teams or rename it. Belt and braces, 0003's
-- UPDATE policy pins team_id = my_team_id() in both USING and WITH CHECK.
--
-- SELECT STAYS TABLE-WIDE. js/sync.js:1163 builds its pull URL with NO
-- `select=` list, so PostgREST returns every column; a narrowed SELECT
-- grant would 403 every pull on the first non-granted column.
--
-- The revoke must come FIRST: 0001's table-level `grant select, insert,
-- update on public.territories to authenticated` would otherwise remain in
-- force and make the column grants decorative.

revoke insert, update on public.territories from authenticated;

grant insert (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
  on public.territories to authenticated;
grant update (team_id, id, name, polygon, homes, archived, created_by, deleted_at, data)
  on public.territories to authenticated;

-- NOT GRANTED, on purpose — every one of them is server-authored, and a
-- BEFORE trigger sets them with the caller holding no privilege at all
-- (proven by probe):
--   geom              derived from polygon (0009)
--   assignees         assignment truth, moved only by an RPC (0010)
--   assignees_rev     monotone, bumped by the trigger
--   open_assignees    derived uuid[] index mirror
--   cycle_started_at  moved only by start_territory_cycle (0014)
--   created_at        column default
--   updated_at        territories_touch (0001)

do $$
declare v_leak text;
begin
  select string_agg(a.attname, ', ') into v_leak
    from pg_attribute a
   where a.attrelid = 'public.territories'::regclass
     and a.attnum > 0 and not a.attisdropped
     and a.attname in ('geom','assignees','assignees_rev','open_assignees',
                       'cycle_started_at','created_at','updated_at')
     and (has_column_privilege('authenticated', a.attrelid, a.attname, 'INSERT')
       or has_column_privilege('authenticated', a.attrelid, a.attname, 'UPDATE'));
  if v_leak is not null then
    raise exception 'v41 privileges: authenticated can still write server-owned column(s): %', v_leak;
  end if;
end $$;
