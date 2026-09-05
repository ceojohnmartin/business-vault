-- RALLY v41 test seed — v40-SHAPED TERRITORY ROWS, inserted by the runner
-- AFTER 0008 and BEFORE 0009, so that 0009's geometry derivation and 0011's
-- assignment backfill run over real rows rather than an empty table. The
-- assertions in v41-test.sql section B compare against the values seeded
-- here, never against another derived field.
--
-- There is no `assignees` column yet when this runs: the assignment lives
-- only in data.assignedTo / data.assignments, exactly as v40 wrote it.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-d000-000000000001', 'bf-john@v41.com', '{"name":"BF John"}'),
  ('00000000-0000-4000-d000-000000000002', 'bf-jake@v41.com', '{"name":"BF Jake"}'),
  ('00000000-0000-4000-d000-000000000003', 'bf-lead@v41.com', '{"name":"BF Lead"}');
insert into public.teams (id, name) values
  ('dddddddd-4444-4444-a444-444444444444', 'Backfill Team');
update public.profiles set team_id = 'dddddddd-4444-4444-a444-444444444444', role = 'rep'
  where email in ('bf-john@v41.com', 'bf-jake@v41.com');
update public.profiles set team_id = 'dddddddd-4444-4444-a444-444444444444', role = 'manager'
  where email = 'bf-lead@v41.com';

-- a metre-accurate ring, far from anything the test suite draws
create or replace function pg_temp.bf_rect(x0 float8, y0 float8, x1 float8, y1 float8)
returns jsonb language sql immutable as $$
  select jsonb_build_array(
    jsonb_build_array(x0/111194.9/cosd(40), 40 + y0/111194.9),
    jsonb_build_array(x1/111194.9/cosd(40), 40 + y0/111194.9),
    jsonb_build_array(x1/111194.9/cosd(40), 40 + y1/111194.9),
    jsonb_build_array(x0/111194.9/cosd(40), 40 + y1/111194.9))
$$;

insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  -- LIVE: one open (John), one closed (Jake) — the ordinary v40 history
  ('dddddddd-4444-4444-a444-444444444444', 'bf-live', 'BF Live',
   pg_temp.bf_rect(90000, 0, 90100, 100), false, null,
   jsonb_build_object('id','bf-live','note','keep me',
     'assignedTo','00000000-0000-4000-d000-000000000001',
     'assignments', jsonb_build_array(
       jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John',
         'assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null),
       jsonb_build_object('userId','00000000-0000-4000-d000-000000000002','name','BF Jake',
         'assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',1700000100000::bigint)))),
  -- LIVE, BARE SCALAR: the oldest v40 shape, assignedTo with no assignments array
  ('dddddddd-4444-4444-a444-444444444444', 'bf-bare', 'BF Bare',
   pg_temp.bf_rect(90200, 0, 90300, 100), false, null,
   jsonb_build_object('id','bf-bare','createdAt',1690000000000::bigint,
     'assignedTo','00000000-0000-4000-d000-000000000002')),
  -- ARCHIVED, with a closed entry naming a rep that no longer resolves
  ('dddddddd-4444-4444-a444-444444444444', 'bf-arch', 'BF Archived',
   pg_temp.bf_rect(90400, 0, 90500, 100), true, null,
   jsonb_build_object('id','bf-arch','assignedTo','',
     'assignments', jsonb_build_array(
       jsonb_build_object('userId','00000000-0000-4000-d000-0000000000ff','name','Departed',
         'assignedBy','BF Lead','assignedAt',1600000000000::bigint,'unassignedAt',1600001000000::bigint)))),
  -- TOMBSTONED (a split parent, say), with its history
  ('dddddddd-4444-4444-a444-444444444444', 'bf-tomb', 'BF Tombstoned',
   pg_temp.bf_rect(90600, 0, 90700, 100), false, now(),
   jsonb_build_object('id','bf-tomb','assignedTo','',
     'assignments', jsonb_build_array(
       jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John',
         'assignedBy','BF Lead','assignedAt',1650000000000::bigint,'unassignedAt',1650001000000::bigint)))),
  -- LIVE, with the SAME rep open twice — an I1 violation real data can hold
  ('dddddddd-4444-4444-a444-444444444444', 'bf-dup', 'BF Duplicate',
   pg_temp.bf_rect(90800, 0, 90900, 100), false, null,
   jsonb_build_object('id','bf-dup',
     'assignedTo','00000000-0000-4000-d000-000000000001',
     'assignments', jsonb_build_array(
       jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John',
         'assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null),
       jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John',
         'assignedBy','BF Lead','assignedAt',1700000500000::bigint,'unassignedAt',null))));
