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
  -- LIVE, assignments is an OBJECT (client JSON is not a contract): 0010's
  -- reader treats it as no history array and synthesizes from assignedTo
  ('dddddddd-4444-4444-a444-444444444444', 'bf-asg-obj', 'BF Assignments Object',
   pg_temp.bf_rect(91000, 0, 91100, 100), false, null,
   jsonb_build_object('id','bf-asg-obj','assignedTo','00000000-0000-4000-d000-000000000002',
     'assignments', jsonb_build_object('userId','00000000-0000-4000-d000-000000000002'))),
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

-- ---------------------------------------------------------------------------
-- THE READER'S OWN CASES, seeded so 0011 runs over them and section B can
-- assert what the ledger became. Each is a shape the attack lenses found
-- real data can hold; none may abort the backfill.
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  -- one rep OPEN twice with the SAME assignedAt: the last stays open, the first is closed by dedupe
  ('dddddddd-4444-4444-a444-444444444444', 'bf-dup-same', 'BF Dup Same',
   pg_temp.bf_rect(91200, 0, 91300, 100), false, null,
   jsonb_build_object('id','bf-dup-same','assignedTo','00000000-0000-4000-d000-000000000001',
     'assignments', jsonb_build_array(
       jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null),
       jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null)))),
  -- a run that ends before it starts: clamped, raw kept
  ('dddddddd-4444-4444-a444-444444444444', 'bf-i3', 'BF Ends Before Starts',
   pg_temp.bf_rect(91400, 0, 91500, 100), false, null,
   jsonb_build_object('id','bf-i3','assignedTo','',
     'assignments', jsonb_build_array(jsonb_build_object('userId','00000000-0000-4000-d000-000000000002','name','BF Jake',
       'assignedBy','BF Lead','assignedAt',1700000100000::bigint,'unassignedAt',1700000000000::bigint)))),
  -- an OPEN entry with no assignedAt: synthesized from the row clock, tagged
  ('dddddddd-4444-4444-a444-444444444444', 'bf-noat', 'BF No assignedAt',
   pg_temp.bf_rect(91600, 0, 91700, 100), false, null,
   jsonb_build_object('id','bf-noat','assignedTo','00000000-0000-4000-d000-000000000001',
     'assignments', jsonb_build_array(jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John',
       'assignedBy','BF Lead','unassignedAt',null)))),
  -- bare scalar with createdAt 0: synthesized assignedAt is 1, never 0
  ('dddddddd-4444-4444-a444-444444444444', 'bf-created0', 'BF createdAt Zero',
   pg_temp.bf_rect(91800, 0, 91900, 100), false, null,
   jsonb_build_object('id','bf-created0','createdAt',0,'assignedTo','00000000-0000-4000-d000-000000000002')),
  -- a uuid-LENGTH id that is not a uuid: kept as unresolved history, never
  -- cast. ARCHIVED, because a live hood whose only open entry resolves to
  -- nobody is an activation blocker by design (section X un-archives it to
  -- prove the flip refuses)
  ('dddddddd-4444-4444-a444-444444444444', 'bf-36hex', 'BF 36-hex',
   pg_temp.bf_rect(92000, 0, 92100, 100), true, null,
   jsonb_build_object('id','bf-36hex','assignedTo','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
     'assignments', jsonb_build_array(jsonb_build_object('userId','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','name','Nobody',
       'assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null)))),
  -- an UPPER-CASE uuid: one rep, canonical id
  ('dddddddd-4444-4444-a444-444444444444', 'bf-upper', 'BF Upper',
   pg_temp.bf_rect(92200, 0, 92300, 100), false, null,
   jsonb_build_object('id','bf-upper','assignedTo','00000000-0000-4000-D000-000000000001',
     'assignments', jsonb_build_array(jsonb_build_object('userId','00000000-0000-4000-D000-000000000001','name','BF John',
       'assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null)))),
  -- junk elements beside one real entry: the junk carries no assignment
  ('dddddddd-4444-4444-a444-444444444444', 'bf-junk', 'BF Junk Elements',
   pg_temp.bf_rect(92400, 0, 92500, 100), false, null,
   jsonb_build_object('id','bf-junk','assignedTo','00000000-0000-4000-d000-000000000002',
     'assignments', jsonb_build_array('john', 7, null, jsonb_build_object('name','x'),
       jsonb_build_object('userId','00000000-0000-4000-d000-000000000002','name','BF Jake','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null)))),
  -- a timestamp int8 accepts that a naive regex would refuse
  ('dddddddd-4444-4444-a444-444444444444', 'bf-plus', 'BF Plus Sign',
   pg_temp.bf_rect(92600, 0, 92700, 100), false, null,
   jsonb_build_object('id','bf-plus','assignedTo','00000000-0000-4000-d000-000000000001',
     'assignments', jsonb_build_array(jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John',
       'assignedBy','BF Lead','assignedAt','+1700000000000','unassignedAt',null)))),
  -- an ARCHIVED hood whose ring is a bowtie: 0009 stores NULL geom and lets it
  -- stay archived; it may be tombstoned but not brought back live (section G)
  ('dddddddd-4444-4444-a444-444444444444', 'bf-arch-bow', 'BF Archived Bowtie',
   '[[0.9,40],[0.901,40.001],[0.901,40],[0.9,40.001]]'::jsonb, true, null,
   jsonb_build_object('id','bf-arch-bow','assignedTo',''));
