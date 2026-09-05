#!/bin/sh
# RALLY v41 — THE PREFLIGHT, PROVEN.
#   PGHOST=/tmp/pgrls/sock PGPORT=5544 sh rally/db/test/preflight-test.sh
#
# A survey nobody has run against real-shaped data is a guess, and a survey
# that ABORTS on the data it exists to find is worse than none. This builds
# a database in exactly the state production is in when the preflight runs
# — the Supabase shim, 0001..0008 (PostGIS in `gis`), the v40-shaped seed —
# and proves three things about db/preflight/v41-preflight.editor.sql (and
# its psql wrapper):
#
#   1. it reports the facts the seed planted;
#   2. its ring reader is a byte-identical twin of 0009's rally_ring_read;
#   3. it is TOTAL: with EVERY malformed fixture in
#      db/test/v41-preflight-fixtures.sql loaded at once — non-UUID and
#      foreign userIds, assignments that are an object / string / number /
#      JSON null, entries that are not objects, timestamps that are text or
#      decimals or missing, data that is a string / array / JSON null,
#      polygons that are an object / string / JSON null / empty, corners off
#      the planet on all four sides, coordinates that are strings, "NaN",
#      "Infinity", a number too big for float8, a corner that is not a pair
#      — it returns, and every one of them is a NAMED FINDING in the output.
#
# Negative controls: an overlapping live pair, a self-crossing outline and
# a live hood with a ghost CURRENT assignee are each detected and counted by
# the verdict rows, and the "(none)" row disappears when there is something
# to report.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DB=rally_preflight_test
export PGUSER="${PGUSER:-postgres}"
pass=0; fail=0
ok()  { pass=$((pass+1)); echo "PASS: $1"; }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }
has()   { printf '%s' "$1" | grep -qF -- "$2" && ok "$3" || bad "$3 — expected to find: $2"; }
lacks() { printf '%s' "$1" | grep -qF -- "$2" && bad "$3 — must NOT contain: $2" || ok "$3"; }
EDITOR_SQL="$DIR/../preflight/v41-preflight.editor.sql"
PSQL_SQL="$DIR/../preflight/v41-preflight.sql"
run_editor() { psql -X -v ON_ERROR_STOP=1 -d "$DB" -tA -F ' | ' -f "$EDITOR_SQL" 2>&1; }

psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql"
for m in "$DIR"/../migrations/000[1-8]_*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m" >/dev/null
done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/v41-backfill-seed.sql" >/dev/null
n="$(psql -X -d "$DB" -tAc "select count(*) from information_schema.columns where table_name='territories' and column_name='geom'")"
[ "$n" = "0" ] && ok "database is at Stage 0 (no geom column yet)" || bad "database is not at Stage 0"

# --------------------------------------------- the reader is 0009's twin
twin() { awk "/create or replace function $1\\(/,/^end \\\$\\\$;/" "$2" | sed -e "s/$1/RING_READ/g" | tr -d ' \t\n'; }
if [ -n "$(twin 'public.rally_ring_read' "$DIR/../migrations/0009_territory_geometry.sql")" ] &&
   [ "$(twin 'public.rally_ring_read' "$DIR/../migrations/0009_territory_geometry.sql")" = "$(twin 'pg_temp.ring_read' "$EDITOR_SQL")" ]; then
  ok "the preflight's ring reader is byte-identical to 0009's rally_ring_read (name aside)"
else
  bad "the preflight's ring reader has drifted from 0009's rally_ring_read"
fi
if grep -qE "\bextensions\." "$EDITOR_SQL" "$PSQL_SQL"; then
  bad "a preflight still addresses PostGIS through the extensions schema"
else
  ok "both forms address PostGIS as gis. only"
fi
# the two totality rules that can be checked by reading: every array
# function sits within five lines after a jsonb_typeof guard (or a test of
# a *_type column that holds one), and every
# ::uuid / ::bigint cast sits inside a regex-guarded CASE (the "case when …
# ~ '^…$'" may be on the line before the cast)
if awk '
  /jsonb_typeof|_type = .array./ { g = NR }
  /jsonb_array_(elements|length)\(/ && $0 !~ /^[[:space:]]*--/ { if (NR - g > 5) { print NR": "$0; bad = 1 } }
  END { exit bad }' "$EDITOR_SQL"; then
  ok "every jsonb_array_elements/length in the editor preflight sits behind a jsonb_typeof guard"
else
  bad "an unguarded jsonb_array_elements/length exists in the editor preflight (above)"
fi
if awk '
  /case when .*~ .\^/ { g = NR }
  /::(uuid|bigint)/ && $0 !~ /^[[:space:]]*--/ { if (NR - g > 1 || $0 !~ / end/) { print NR": "$0; bad = 1 } }
  END { exit bad }' "$EDITOR_SQL"; then
  ok "every ::uuid / ::bigint cast in the editor preflight is inside a regex-guarded CASE"
else
  bad "a bare ::uuid or ::bigint cast exists in the editor preflight (above)"
fi

# ------------------------------------------------------- baseline: the seed
E="$(run_editor)" || { echo "$E" | tail -5; bad "editor-form preflight errored on the seed"; }
has "$E" "0 env | postgis | schema=gis" "seed: PostGIS reported in gis"
has "$E" "1a geometry by state | LIVE | hoods=4 usable=4 unusable_outline=0 invalid_geometry=0 no_outline_at_all=0" "seed: 4 live hoods, all usable"
has "$E" "1a geometry by state | archived | hoods=1" "seed: the archived hood is surveyed too"
has "$E" "1a geometry by state | tombstoned | hoods=1" "seed: the tombstoned hood is surveyed too"
has "$E" "1b LIVE hoods to fix before 0016 | (none)" "seed: an empty section prints (none), not nothing"
has "$E" "2 live pairs overlapping > 1.0 m² (block 0016) | (none)" "seed: no overlap"
has "$E" "hoods=6 entries=6 open=3 bare_scalar_only=1 entries_not_object=0 assignments_not_array=1 data_not_object=0" "seed: the census counts every hood in every state (incl. the object-assignments hood)"
has "$E" "foreign_or_missing_profile=1" "seed: the departed rep is counted, not dropped"
has "$E" "3b entries that resolve to no rep (kept as history) | bf-arch / 00000000-0000-4000-d000-0000000000ff" "seed: and named, with its hood"
has "$E" "state=archived assignedAt=1600000000000 still_open=f" "seed: as CLOSED history on an archived hood"
has "$E" "3c ACTIVATION BLOCKER: live hoods with unresolved CURRENT assignee | count | 0 " "seed: no activation blocker"
has "$E" "3d scalar assignedTo disagrees with open set | bf-bare" "seed: the bare-scalar hood is the one whose mirror disagrees"
has "$E" "3e DUPLICATE open entries for one rep (0011 closes all but newest) | bf-dup / 00000000-0000-4000-d000-000000000001 | team=dddddddd-4444-4444-a444-444444444444 name=BF Duplicate open_entries=2" "seed: the duplicate-open hood, with the rep and the count"
has "$E" "| bf-asg-obj / assignments | review team=dddddddd-4444-4444-a444-444444444444 name=BF Assignments Object — assignments is a JSON object, not an array — 0010 treats it as absent and its mirror OVERWRITES it" "seed: the object-assignments hood is a review finding, not an abort"
has "$E" "Z verdict | Stage A (0009-0013) | 0 hood(s) whose assignment data would ABORT 0010/0011 must be 0 (3f BLOCKER rows); 1 hood(s) carry assignment JSON 0010 would ignore or overwrite" "seed: Stage A verdict: no blocker, one review item"
has "$E" "Z verdict | Stage C (0016 arming) | 0 live hood(s) with unusable or invalid outline + 0 overlapping pair(s)" "seed: Stage C verdict reads clean"
has "$E" "Z verdict | Activation flip | 0 live hood(s)" "seed: flip verdict reads clean"
n="$(psql -X -d "$DB" -tAc "select count(*) from pg_class where relname='territories_geom_live_gist'")"
[ "$n" = "0" ] && ok "the preflight created no durable object" || bad "the preflight left a durable object behind"

# the psql wrapper is the same survey through the other door
P="$(psql -X -v ON_ERROR_STOP=1 -d "$DB" -f "$PSQL_SQL" 2>&1)" || { echo "$P" | tail -5; bad "psql-form preflight errored"; }
has "$P" "Z verdict" "psql form runs to completion and reaches the verdict"
has "$P" "bf-dup" "psql form lists the duplicate-open hood"
ne="$(printf '%s\n' "$E" | grep -c ' | ')"; np="$(printf '%s\n' "$P" | grep -c '|')"
[ "$np" -ge "$ne" ] && ok "psql form returns every row the editor form does ($ne)" || bad "psql form returned $np rows vs editor $ne"

# ------------------------------------------- TOTALITY: every malformed shape
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/v41-preflight-fixtures.sql" >/dev/null
NF="$(grep -c '^-- FIXTURE' "$DIR/v41-preflight-fixtures.sql")"
E="$(run_editor)" || { echo "$E" | tail -8; bad "editor-form preflight ABORTED with all $NF malformed fixtures loaded"; }
lacks "$E" "ERROR" "TOTAL: with all $NF malformed fixtures loaded the preflight returns without an error"
has "$E" "Z verdict | Activation flip" "TOTAL: and reaches the verdict rows"

# geometry findings — every bad outline is named, with the corner
has "$E" "1b LIVE hoods to fix before 0016 | pf-poly-obj | team=dddddddd-4444-4444-a444-444444444444 name=PF polygon object corners=- reason=the outline is a JSON object, not an array of corners" "polygon = object → named finding"
has "$E" "| pf-poly-str | " "polygon = string → named finding"
has "$E" "reason=the outline is a JSON string, not an array of corners" "polygon = string → with the reason"
has "$E" "| pf-lon-over | team=dddddddd-4444-4444-a444-444444444444 name=PF lon > 180 corners=4 reason=corner 1 longitude 200 is outside [-180, 180]" "longitude > 180 → named finding with the corner"
has "$E" "| pf-lon-under | " "longitude < -180 → named finding"
has "$E" "reason=corner 1 longitude -200 is outside [-180, 180]" "longitude < -180 → with the value"
has "$E" "| pf-lat-over | " "latitude > 90 → named finding"
has "$E" "reason=corner 1 latitude 95 is outside [-90, 90]" "latitude > 90 → with the value"
has "$E" "| pf-lat-under | " "latitude < -90 → named finding"
has "$E" "reason=corner 1 latitude -95 is outside [-90, 90]" "latitude < -90 → with the value"
has "$E" "| pf-coord-strnum | team=dddddddd-4444-4444-a444-444444444444 name=PF coordinate string-number corners=4 reason=corner 2 has a coordinate that is not a number" "a coordinate stored as the string \"0.001\" is NOT coerced — named finding"
has "$E" "| pf-coord-text | " "a coordinate that is the word abc → named finding"
has "$E" "| pf-coord-nan | " "a coordinate that is the string NaN → named finding"
has "$E" "| pf-coord-inf | " "a coordinate that is the string Infinity → named finding"
has "$E" "| pf-vertex-num | team=dddddddd-4444-4444-a444-444444444444 name=PF vertex not a pair corners=4 reason=corner 2 is not a [longitude, latitude] pair" "a corner that is a number, not a pair → named finding"
has "$E" "| pf-poly-huge | " "a coordinate too large for float8 → named finding, not an abort"
has "$E" "reason=the outline could not be read:" "with the reader's own reason"
lacks "$E" "| pf-poly-null | " "a JSON-null polygon is no outline, not a finding"
lacks "$E" "| pf-poly-empty | " "an empty polygon is no outline, not a finding"
has "$E" "2 live pairs overlapping > 1.0 m² (block 0016) | (none)" "two INTERSECTING off-planet rings never reach the geography cast — no overlap row, no abort"
# 16 unusable outlines on LIVE hoods, 2 with no outline at all, 3 seeded usable
has "$E" "1a geometry by state | LIVE | hoods=" "1a still summarises the live hoods"
n="$(printf '%s\n' "$E" | grep -c '^1b LIVE hoods to fix before 0016 | pf-')"
[ "$n" = "16" ] && ok "exactly the 16 seeded bad outlines are listed in 1b (got $n)" || bad "expected 16 bad outlines in 1b, got $n"
has "$E" "no_outline_at_all=2" "the JSON-null and empty polygons are counted as no outline"

# assignment findings
has "$E" "local_device_ids=1" "a device-local userId is counted"
has "$E" "3b entries that resolve to no rep (kept as history) | pf-local / local-abc123" "and named, as unresolved history"
has "$E" "3b entries that resolve to no rep (kept as history) | pf-foreign / deadbeef-0000-4000-a000-00000000aaaa" "a uuid-shaped userId with no profile is named"
has "$E" "3c ACTIVATION BLOCKER: live hoods with unresolved CURRENT assignee | count | 2 " "both are OPEN on LIVE hoods, so both block the flip"
has "$E" "assignments_not_array=4" "assignments as object / string / number are counted (plus the seeded one)"
has "$E" "| pf-asg-obj / assignments | review team=dddddddd-4444-4444-a444-444444444444 name=PF assignments object — assignments is a JSON object, not an array — 0010 treats it as absent and its mirror OVERWRITES it" "assignments = object → review finding"
has "$E" "| pf-asg-str / assignments | review " "assignments = string → review finding"
has "$E" "| pf-asg-num / assignments | review " "assignments = number → review finding"
lacks "$E" "| pf-asg-null / assignments |" "assignments = JSON null is ABSENT, not malformed"
has "$E" "entries_not_object=3" "the three non-object entries are counted"
has "$E" "| pf-entry-str / entry #1 | review team=dddddddd-4444-4444-a444-444444444444 name=PF entry string — entry is a JSON string, not an object — 0010 skips it" "an entry that is a string → review finding, numbered"
has "$E" "| pf-entry-str / entry #3 | review " "an entry that is a JSON null → review finding"
has "$E" "malformed_assignedAt=2" "text and decimal assignedAt are counted"
has "$E" "| pf-at-text / entry #1 assignedAt | BLOCKER team=dddddddd-4444-4444-a444-444444444444 name=PF assignedAt text — assignedAt=last tuesday is not an integer millisecond timestamp — 0010/0011 abort on it" "assignedAt text → BLOCKER finding"
has "$E" "| pf-at-dec / entry #1 assignedAt | BLOCKER " "assignedAt decimal → BLOCKER finding"
has "$E" "assignedAt=1700000000000.5 is not an integer" "with the value"
has "$E" "missing_assignedAt=1" "a missing assignedAt is counted (0010 synthesizes it; not a blocker)"
lacks "$E" "| pf-at-miss / " "and is not a 3f finding"
has "$E" "malformed_unassignedAt=1" "a text unassignedAt is counted"
has "$E" "| pf-un-text / entry #1 unassignedAt | BLOCKER " "unassignedAt text → BLOCKER finding"
has "$E" "malformed_createdAt=1" "a bare-scalar hood's text createdAt is counted"
has "$E" "| pf-created-text / createdAt | BLOCKER team=dddddddd-4444-4444-a444-444444444444 name=PF createdAt text — bare-scalar hood whose createdAt=yesterday is not an integer millisecond timestamp — 0010/0011 abort on it" "createdAt text on a bare-scalar hood → BLOCKER finding"
has "$E" "data_not_object=3" "data as string / array / JSON null are counted"
has "$E" "| pf-data-str / data | BLOCKER team=dddddddd-4444-4444-a444-444444444444 name=PF data string — data is a JSON string, not an object — 0010's mirror write (jsonb_set) aborts on it" "data = string → BLOCKER finding"
has "$E" "| pf-data-arr / data | BLOCKER " "data = array → BLOCKER finding"
has "$E" "| pf-data-null / data | BLOCKER " "data = JSON null → BLOCKER finding"
has "$E" "3d scalar assignedTo disagrees with open set | pf-to-obj" "an assignedTo that is an object reads as a text id that no ledger names"
has "$E" "Z verdict | Stage A (0009-0013) | 7 hood(s) whose assignment data would ABORT 0010/0011 must be 0 (3f BLOCKER rows); 5 hood(s) carry assignment JSON 0010 would ignore or overwrite (3f review rows)" "the Stage A verdict counts 7 blocker hoods and 5 review hoods"
has "$E" "Z verdict | Stage C (0016 arming) | 16 live hood(s) with unusable or invalid outline + 0 overlapping pair(s)" "the Stage C verdict counts the 16 unusable outlines"
has "$E" "Z verdict | Activation flip | 2 live hood(s)" "the flip verdict counts the two ghost assignees"
# pins: the shapes 0013 is total over are counted, not met in a dead-letter
has "$E" "4 do-not-knock census | totals | pins=4 scalar_dnk=3 has_dnk_knock=1 dnk_with_no_dateable_knock=2 already_tombstoned_black=0 data_not_object=1 history_not_array=2 history_ts_unparseable=1" "pins: history-as-object, data-as-string, ts-as-sentence and history-as-string are each counted"
has "$E" "malformed_updatedAt=0" "hoods: updatedAt census present"
P="$(psql -X -v ON_ERROR_STOP=1 -d "$DB" -f "$PSQL_SQL" 2>&1)" || bad "psql-form preflight errored with the malformed fixtures loaded"
lacks "$P" "ERROR" "the psql form is total over the same fixtures"

# ------------------------------------------------------------ NEGATIVE CONTROLS
psql -q -v ON_ERROR_STOP=1 -d "$DB" <<'SQL'
create or replace function pg_temp.bf_rect(x0 float8, y0 float8, x1 float8, y1 float8)
returns jsonb language sql immutable as $$
  select jsonb_build_array(
    jsonb_build_array(x0/111194.9/cosd(40), 40 + y0/111194.9),
    jsonb_build_array(x1/111194.9/cosd(40), 40 + y0/111194.9),
    jsonb_build_array(x1/111194.9/cosd(40), 40 + y1/111194.9),
    jsonb_build_array(x0/111194.9/cosd(40), 40 + y1/111194.9))
$$;
insert into public.territories (team_id, id, name, polygon, archived, deleted_at, data) values
  ('dddddddd-4444-4444-a444-444444444444', 'nc-over', 'NC Overlapper',
   pg_temp.bf_rect(90050, 0, 90150, 100), false, null, '{"id":"nc-over"}'::jsonb),
  ('dddddddd-4444-4444-a444-444444444444', 'nc-ghost', 'NC Ghost Rep',
   pg_temp.bf_rect(95000, 0, 95100, 100), false, null,
   jsonb_build_object('id','nc-ghost','assignedTo','deadbeef-0000-4000-a000-000000000001',
     'assignments', jsonb_build_array(jsonb_build_object(
       'userId','deadbeef-0000-4000-a000-000000000001','name','Ghost',
       'assignedBy','BF Lead','assignedAt',1700000000000::bigint,'unassignedAt',null)))),
  ('dddddddd-4444-4444-a444-444444444444', 'nc-bow', 'NC Bowtie',
   jsonb_build_array(jsonb_build_array(0.0,40.0), jsonb_build_array(0.001,40.001),
                     jsonb_build_array(0.001,40.0), jsonb_build_array(0.0,40.001)),
   false, null, '{"id":"nc-bow"}'::jsonb);
SQL
E="$(run_editor)" || { echo "$E" | tail -5; bad "editor-form preflight errored on the negative controls"; }
has "$E" "2 live pairs overlapping > 1.0 m² (block 0016) | bf-live × nc-over" "NEGATIVE CONTROL: the overlapping pair is reported"
has "$E" "overlap_m2=5" "NEGATIVE CONTROL: with its area (≈5000 m² for a 50 m × 100 m overlap)"
lacks "$E" "2 live pairs overlapping > 1.0 m² (block 0016) | (none)" "NEGATIVE CONTROL: the (none) row disappears when there is something to report"
has "$E" "1b LIVE hoods to fix before 0016 | nc-bow" "NEGATIVE CONTROL: the self-crossing outline is reported"
has "$E" "Self-intersection" "NEGATIVE CONTROL: with PostGIS's reason"
has "$E" "3c ACTIVATION BLOCKER: live hoods with unresolved CURRENT assignee | count | 3 " "NEGATIVE CONTROL: the third ghost CURRENT assignee is counted"
has "$E" "3b entries that resolve to no rep (kept as history) | nc-ghost / deadbeef-0000-4000-a000-000000000001" "NEGATIVE CONTROL: and is named"
has "$E" "Z verdict | Stage C (0016 arming) | 17 live hood(s) with unusable or invalid outline + 1 overlapping pair(s)" "NEGATIVE CONTROL: the Stage C verdict counts the bowtie and the pair"
has "$E" "Z verdict | Activation flip | 3 live hood(s)" "NEGATIVE CONTROL: the flip verdict counts all three ghosts"

echo "PREFLIGHT: $pass passed, $fail failed"
[ "$fail" = "0" ] && echo "PREFLIGHT: ALL GREEN ($pass checks, incl. $NF malformed fixtures and negative controls)" || { echo "PREFLIGHT: FAILED"; exit 1; }
