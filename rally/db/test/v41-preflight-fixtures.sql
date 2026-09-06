-- RALLY v41 — MALFORMED LEGACY ROWS. The preflight must be TOTAL over these:
-- every one is a finding in its output, never an abort. Inserted into the
-- backfill seed's team, one hood per shape, on a Stage-0 database. Each
-- block is one fixture; db/test/preflight-test.sh loads them all, and the
-- evidence script loads them one at a time.
create or replace function pg_temp.pf_rect(x0 float8, y0 float8, x1 float8, y1 float8)
returns jsonb language sql immutable as $$
  select jsonb_build_array(
    jsonb_build_array(x0/111194.9/cosd(40), 40 + y0/111194.9),
    jsonb_build_array(x1/111194.9/cosd(40), 40 + y0/111194.9),
    jsonb_build_array(x1/111194.9/cosd(40), 40 + y1/111194.9),
    jsonb_build_array(x0/111194.9/cosd(40), 40 + y1/111194.9))
$$;
-- FIXTURE local_userid : a device-local id (v40's toProfile(...) || localId fallback), OPEN, on a LIVE hood
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-local', 'PF local userId', pg_temp.pf_rect(100000, 0, 100100, 100), false, null,
   jsonb_build_object('id','pf-local','assignedTo','local-abc123',
     'assignments', jsonb_build_array(jsonb_build_object('userId','local-abc123','name','Local Rep',
       'assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null))));
-- FIXTURE foreign_uuid : uuid-shaped, no such profile on the team, OPEN, LIVE
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-foreign', 'PF foreign uuid', pg_temp.pf_rect(100200, 0, 100300, 100), false, null,
   jsonb_build_object('id','pf-foreign','assignedTo','deadbeef-0000-4000-a000-00000000aaaa',
     'assignments', jsonb_build_array(jsonb_build_object('userId','deadbeef-0000-4000-a000-00000000aaaa','name','Ghost',
       'assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null))));
-- FIXTURE assignments_object : assignments is a JSON object
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-asg-obj', 'PF assignments object', pg_temp.pf_rect(100400, 0, 100500, 100), false, null,
   jsonb_build_object('id','pf-asg-obj','assignedTo','00000000-0000-4000-d000-000000000001',
     'assignments', jsonb_build_object('userId','00000000-0000-4000-d000-000000000001')));
-- FIXTURE assignments_string : assignments is a JSON string
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-asg-str', 'PF assignments string', pg_temp.pf_rect(100600, 0, 100700, 100), false, null,
   jsonb_build_object('id','pf-asg-str','assignedTo','00000000-0000-4000-d000-000000000001',
     'assignments', 'john'));
-- FIXTURE assignments_number : assignments is a JSON number
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-asg-num', 'PF assignments number', pg_temp.pf_rect(100800, 0, 100900, 100), false, null,
   jsonb_build_object('id','pf-asg-num','assignedTo','', 'assignments', 42));
-- FIXTURE assignments_null : assignments is JSON null (absent, not malformed)
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-asg-null', 'PF assignments null', pg_temp.pf_rect(101000, 0, 101100, 100), false, null,
   jsonb_build_object('id','pf-asg-null','assignedTo','00000000-0000-4000-d000-000000000002', 'assignments', null));
-- FIXTURE entry_not_object : an assignments element that is a string, not an entry
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-entry-str', 'PF entry string', pg_temp.pf_rect(101200, 0, 101300, 100), false, null,
   jsonb_build_object('id','pf-entry-str','assignedTo','', 'assignments', jsonb_build_array('john', 7, null)));
-- FIXTURE assignedat_text : assignedAt is non-numeric text
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-at-text', 'PF assignedAt text', pg_temp.pf_rect(101400, 0, 101500, 100), false, null,
   jsonb_build_object('id','pf-at-text','assignedTo','00000000-0000-4000-d000-000000000001',
     'assignments', jsonb_build_array(jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John',
       'assignedBy','BF Lead','assignedAt','last tuesday','unassignedAt',null))));
-- FIXTURE assignedat_decimal : assignedAt is a decimal number
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-at-dec', 'PF assignedAt decimal', pg_temp.pf_rect(101600, 0, 101700, 100), false, null,
   jsonb_build_object('id','pf-at-dec','assignedTo','00000000-0000-4000-d000-000000000001',
     'assignments', jsonb_build_array(jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John',
       'assignedBy','BF Lead','assignedAt',1700000000000.5,'unassignedAt',null))));
-- FIXTURE assignedat_missing : assignedAt absent
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-at-miss', 'PF assignedAt missing', pg_temp.pf_rect(101800, 0, 101900, 100), false, null,
   jsonb_build_object('id','pf-at-miss','assignedTo','00000000-0000-4000-d000-000000000001',
     'assignments', jsonb_build_array(jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John',
       'assignedBy','BF Lead','unassignedAt',null))));
-- FIXTURE unassignedat_text : unassignedAt is text (reads as closed, and is reported)
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-un-text', 'PF unassignedAt text', pg_temp.pf_rect(102000, 0, 102100, 100), false, null,
   jsonb_build_object('id','pf-un-text','assignedTo','',
     'assignments', jsonb_build_array(jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John',
       'assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt','soon'))));
-- FIXTURE data_string : data itself is a JSON string
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-data-str', 'PF data string', pg_temp.pf_rect(102200, 0, 102300, 100), false, null,
   '"not an object"'::jsonb);
-- FIXTURE polygon_object : polygon is a JSON object
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-poly-obj', 'PF polygon object', '{"lng":0,"lat":40}'::jsonb, false, null,
   '{"id":"pf-poly-obj"}'::jsonb);
-- FIXTURE polygon_string : polygon is a JSON string
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-poly-str', 'PF polygon string', '"0,40 1,40 1,41"'::jsonb, false, null,
   '{"id":"pf-poly-str"}'::jsonb);
-- FIXTURE polygon_json_null : polygon is a JSON null (the column is NOT NULL, so this is the only "null" a row can carry)
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-poly-null', 'PF polygon json null', 'null'::jsonb, false, null,
   '{"id":"pf-poly-null"}'::jsonb);
-- FIXTURE polygon_empty : polygon is an empty array (a hood with no outline yet)
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-poly-empty', 'PF polygon empty', '[]'::jsonb, false, null,
   '{"id":"pf-poly-empty"}'::jsonb);
-- FIXTURE polygon_huge_number : a coordinate too large for float8 (jsonb numeric holds it; the cast cannot)
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-poly-huge', 'PF coordinate 1e400',
   ('[[0,40],[1e400,40],[0.001,40.001],[0,40.001]]')::jsonb, false, null,
   '{"id":"pf-poly-huge"}'::jsonb);
-- FIXTURE lon_over : longitude 200
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-lon-over', 'PF lon > 180',
   '[[200,40],[200.001,40],[200.001,40.001],[200,40.001]]'::jsonb, false, null, '{"id":"pf-lon-over"}'::jsonb);
-- FIXTURE lon_under : longitude -200
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-lon-under', 'PF lon < -180',
   '[[-200,40],[-199.999,40],[-199.999,40.001],[-200,40.001]]'::jsonb, false, null, '{"id":"pf-lon-under"}'::jsonb);
-- FIXTURE lat_over : latitude 95
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-lat-over', 'PF lat > 90',
   '[[0,95],[0.001,95],[0.001,95.001],[0,95.001]]'::jsonb, false, null, '{"id":"pf-lat-over"}'::jsonb);
-- FIXTURE lat_under : latitude -95
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-lat-under', 'PF lat < -90',
   '[[0,-95],[0.001,-95],[0.001,-94.999],[0,-94.999]]'::jsonb, false, null, '{"id":"pf-lat-under"}'::jsonb);
-- FIXTURE coord_string_numeric : a coordinate stored as the STRING "0.001"
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-coord-strnum', 'PF coordinate string-number',
   '[[0,40],["0.001",40],[0.001,40.001],[0,40.001]]'::jsonb, false, null, '{"id":"pf-coord-strnum"}'::jsonb);
-- FIXTURE coord_text : a coordinate that is the word "abc"
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-coord-text', 'PF coordinate text',
   '[[0,40],["abc",40],[0.001,40.001],[0,40.001]]'::jsonb, false, null, '{"id":"pf-coord-text"}'::jsonb);
-- FIXTURE coord_nan : a coordinate that is the STRING "NaN" (JSON cannot carry a NaN number; this is the only spelling that can reach the column)
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-coord-nan', 'PF coordinate NaN',
   '[[0,40],["NaN",40],[0.001,40.001],[0,40.001]]'::jsonb, false, null, '{"id":"pf-coord-nan"}'::jsonb);
-- FIXTURE coord_infinity : a coordinate that is the STRING "Infinity"
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-coord-inf', 'PF coordinate Infinity',
   '[[0,40],["Infinity",40],[0.001,40.001],[0,40.001]]'::jsonb, false, null, '{"id":"pf-coord-inf"}'::jsonb);
-- FIXTURE vertex_not_pair : a vertex that is a number, not [lng,lat]
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-vertex-num', 'PF vertex not a pair',
   '[[0,40],7,[0.001,40.001],[0,40.001]]'::jsonb, false, null, '{"id":"pf-vertex-num"}'::jsonb);
-- FIXTURE lon_over_overlapping : an out-of-range hood that INTERSECTS another out-of-range hood (the geography cast path)
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-lon-over-2', 'PF lon > 180 twin',
   '[[200.0005,40],[200.002,40],[200.002,40.001],[200.0005,40.001]]'::jsonb, false, null, '{"id":"pf-lon-over-2"}'::jsonb),
  ('dddddddd-4444-4444-a444-444444444444', 'pf-lon-over-3', 'PF lon > 180 twin b',
   '[[200,40],[200.001,40],[200.001,40.001],[200,40.001]]'::jsonb, false, null, '{"id":"pf-lon-over-3"}'::jsonb);
-- FIXTURE lat_over_overlapping : two INTERSECTING hoods at latitude 95 — the pair the geography cast would have refused
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-lat-over-2', 'PF lat > 90 twin',
   '[[0.0005,95],[0.002,95],[0.002,95.001],[0.0005,95.001]]'::jsonb, false, null, '{"id":"pf-lat-over-2"}'::jsonb),
  ('dddddddd-4444-4444-a444-444444444444', 'pf-lat-over-3', 'PF lat > 90 twin b',
   '[[0,95],[0.001,95],[0.001,95.001],[0,95.001]]'::jsonb, false, null, '{"id":"pf-lat-over-3"}'::jsonb);
-- FIXTURE createdat_text : the oldest v40 shape (bare assignedTo, no array) with a createdAt that is a sentence — 0010's synthesis casts it
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-created-text', 'PF createdAt text', pg_temp.pf_rect(102400, 0, 102500, 100), false, null,
   jsonb_build_object('id','pf-created-text','createdAt','yesterday','assignedTo','00000000-0000-4000-d000-000000000002'));
-- FIXTURE data_array : data is a JSON array
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-data-arr', 'PF data array', pg_temp.pf_rect(102600, 0, 102700, 100), false, null,
   '[1, 2, 3]'::jsonb);
-- FIXTURE data_json_null : data is a JSON null
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-data-null', 'PF data json null', pg_temp.pf_rect(102800, 0, 102900, 100), false, null,
   'null'::jsonb);
-- FIXTURE assignedto_object : assignedTo is an object (reads as a non-uuid text id)
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-to-obj', 'PF assignedTo object', pg_temp.pf_rect(103000, 0, 103100, 100), false, null,
   jsonb_build_object('id','pf-to-obj','assignedTo', jsonb_build_object('id','x')));
-- FIXTURE pins_legacy_shapes : four doors — history is an object; data is a string; a knock ts that is a sentence; history is a string
insert into public.pins (team_id, id, lat, lng, disposition, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-pin-hist-obj', 40.1001, 0.1001, 'dnk',
   jsonb_build_object('id','pf-pin-hist-obj','disposition','dnk','history', jsonb_build_object('oops', true))),
  ('dddddddd-4444-4444-a444-444444444444', 'pf-pin-data-str', 40.1002, 0.1002, 'dnk', '"not an object"'::jsonb),
  ('dddddddd-4444-4444-a444-444444444444', 'pf-pin-ts-text', 40.1003, 0.1003, 'dnk',
   jsonb_build_object('id','pf-pin-ts-text','disposition','dnk',
     'history', jsonb_build_array(jsonb_build_object('ts','yesterday','disposition','dnk')))),
  ('dddddddd-4444-4444-a444-444444444444', 'pf-pin-hist-str', 40.1004, 0.1004, 'nothome',
   jsonb_build_object('id','pf-pin-hist-str','disposition','nothome','history','none'));
-- FIXTURE dup_same_assignedat : one rep OPEN twice with the SAME assignedAt (the reader keeps the last, closes the first)
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-dup-same', 'PF dup same assignedAt', pg_temp.pf_rect(103200, 0, 103300, 100), false, null,
   jsonb_build_object('id','pf-dup-same','assignedTo','00000000-0000-4000-d000-000000000001',
     'assignments', jsonb_build_array(
       jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null),
       jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null))));
-- FIXTURE ends_before_starts : unassignedAt earlier than assignedAt (clamped, raw kept)
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-i3', 'PF ends before starts', pg_temp.pf_rect(103400, 0, 103500, 100), false, null,
   jsonb_build_object('id','pf-i3','assignedTo','',
     'assignments', jsonb_build_array(jsonb_build_object('userId','00000000-0000-4000-d000-000000000002','name','BF Jake',
       'assignedBy','BF Lead','assignedAt',1700000100000::bigint,'unassignedAt',1700000000000::bigint))));
-- FIXTURE missing_at_closed : no assignedAt but a closed unassignedAt in the past (synthesised start is later than the end)
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-noat-closed', 'PF missing assignedAt closed', pg_temp.pf_rect(103600, 0, 103700, 100), false, null,
   jsonb_build_object('id','pf-noat-closed','assignedTo','',
     'assignments', jsonb_build_array(jsonb_build_object('userId','00000000-0000-4000-d000-000000000002','name','BF Jake',
       'assignedBy','BF Lead','unassignedAt',1600000000000::bigint))));
-- FIXTURE createdat_zero : bare scalar with createdAt 0 (synthesised assignedAt would be 0 → 1)
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-created-0', 'PF createdAt zero', pg_temp.pf_rect(103800, 0, 103900, 100), false, null,
   jsonb_build_object('id','pf-created-0','createdAt',0,'assignedTo','00000000-0000-4000-d000-000000000001'));
-- FIXTURE created_at_epoch : bare scalar, no data.createdAt, the ROW created_at at the epoch
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data, created_at) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-created-epoch', 'PF created_at epoch', pg_temp.pf_rect(104000, 0, 104100, 100), false, null,
   jsonb_build_object('id','pf-created-epoch','assignedTo','00000000-0000-4000-d000-000000000001'), '1970-01-01T00:00:00Z');
-- FIXTURE uid_36hex : a userId of 36 hex characters — uuid-LENGTH, not a uuid
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-uid-36hex', 'PF 36-hex userId', pg_temp.pf_rect(104200, 0, 104300, 100), false, null,
   jsonb_build_object('id','pf-uid-36hex','assignedTo','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
     'assignments', jsonb_build_array(jsonb_build_object('userId','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','name','Nobody',
       'assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null))));
-- FIXTURE assignedby_36hex : a valid rep, an assignedBy of 36 hex characters
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-by-36hex', 'PF 36-hex assignedBy', pg_temp.pf_rect(104400, 0, 104500, 100), false, null,
   jsonb_build_object('id','pf-by-36hex','assignedTo','00000000-0000-4000-d000-000000000001',
     'assignments', jsonb_build_array(jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John',
       'assignedBy','000000000000000000000000000000000000','assignedAt',1700000000000::bigint,'unassignedAt',null))));
-- FIXTURE mixed_case_dup : the same rep open twice, once UPPER-CASE (one rep, one canonical id)
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-mixedcase', 'PF mixed-case dup', pg_temp.pf_rect(104600, 0, 104700, 100), false, null,
   jsonb_build_object('id','pf-mixedcase','assignedTo','00000000-0000-4000-D000-000000000001',
     'assignments', jsonb_build_array(
       jsonb_build_object('userId','00000000-0000-4000-D000-000000000001','name','BF John','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null),
       jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John','assignedBy','BF Lead','assignedAt',1700000500000::bigint,'unassignedAt',null))));
-- FIXTURE future_assignedat : an OPEN entry dated 2033
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-future', 'PF future assignedAt', pg_temp.pf_rect(104800, 0, 104900, 100), false, null,
   jsonb_build_object('id','pf-future','assignedTo','00000000-0000-4000-d000-000000000001',
     'assignments', jsonb_build_array(jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John',
       'assignedBy','BF Lead','assignedAt',2000000000000::bigint,'unassignedAt',null))));
-- FIXTURE entry_no_userid : an object entry with no userId at all, and one with an empty one
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-nouid', 'PF entry no userId', pg_temp.pf_rect(105000, 0, 105100, 100), false, null,
   jsonb_build_object('id','pf-nouid','assignedTo','',
     'assignments', jsonb_build_array(
       jsonb_build_object('name','Nobody','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null),
       jsonb_build_object('userId','','name','Blank','assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null))));
-- FIXTURE ts_whitespace_plus_19 : timestamps int8 accepts that a naive regex would not — whitespace, a plus sign, 19 digits
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-ts-ok', 'PF whitespace/plus/19-digit', pg_temp.pf_rect(105200, 0, 105300, 100), false, null,
   jsonb_build_object('id','pf-ts-ok','createdAt','  1690000000000 ','assignedTo','00000000-0000-4000-d000-000000000001',
     'assignments', jsonb_build_array(
       jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John','assignedBy','BF Lead','assignedAt','+1700000000000','unassignedAt',null),
       jsonb_build_object('userId','00000000-0000-4000-d000-000000000002','name','BF Jake','assignedBy','BF Lead','assignedAt',1700000000000000000::bigint,'unassignedAt',1700000000000000001::bigint))));
-- FIXTURE antipodal_pair : two LIVE rings that are valid and in range but 180 degrees wide — an antipodal edge the geography cast refuses
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'pf-anti-a', 'PF antipodal A', '[[0,0],[180,0],[180,1],[0,1]]'::jsonb, false, null, '{"id":"pf-anti-a"}'::jsonb),
  ('dddddddd-4444-4444-a444-444444444444', 'pf-anti-b', 'PF antipodal B', '[[0,-1],[180,-1],[180,0.5],[0,0.5]]'::jsonb, false, null, '{"id":"pf-anti-b"}'::jsonb);
-- FIXTURE big_hood : 2,000 assignment entries on one hood (the survey must stay linear)
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data)
select 'dddddddd-4444-4444-a444-444444444444', 'pf-big', 'PF 2000 entries', pg_temp.pf_rect(105400, 0, 105500, 100), false, null,
   jsonb_build_object('id','pf-big','assignedTo','00000000-0000-4000-d000-000000000001',
     'assignments', (select jsonb_agg(jsonb_build_object('userId','00000000-0000-4000-d000-000000000001','name','BF John','assignedBy','BF Lead',
        'assignedAt', 1600000000000 + i*1000, 'unassignedAt', case when i < 2000 then to_jsonb(1600000000000 + i*1000 + 500) else 'null'::jsonb end))
        from generate_series(1, 2000) i));
