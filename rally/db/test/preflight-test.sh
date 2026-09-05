#!/bin/sh
# RALLY v41 — THE PREFLIGHT, PROVEN.
#   PGHOST=/tmp/pgrls/sock PGPORT=5544 sh rally/db/test/preflight-test.sh
#
# A survey nobody has run against real-shaped data is a guess. This builds a
# database in exactly the state production is in when the preflight runs —
# the Supabase shim, 0001..0008 (PostGIS in `gis`), and the v40-shaped seed —
# and runs BOTH forms of the preflight against it:
#
#   db/preflight/v41-preflight.sql         psql form
#   db/preflight/v41-preflight.editor.sql  Supabase SQL Editor form
#
# It asserts that each reports the facts the seed planted (a bare-scalar
# hood, a closed entry naming a departed rep, a duplicate-open hood), that
# the two ring readers are byte-identical, and — as NEGATIVE CONTROLS — that
# an overlapping live hood and a live hood with an unresolvable CURRENT
# assignee, added after the seed, are detected and counted by the verdict.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DB=rally_preflight_test
export PGUSER="${PGUSER:-postgres}"
pass=0; fail=0
ok()  { pass=$((pass+1)); echo "PASS: $1"; }
bad() { fail=$((fail+1)); echo "FAIL: $1"; }
has() { printf '%s' "$1" | grep -qF -- "$2" && ok "$3" || bad "$3 — expected to find: $2"; }
lacks() { printf '%s' "$1" | grep -qF -- "$2" && bad "$3 — must NOT contain: $2" || ok "$3"; }

psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql"
for m in "$DIR"/../migrations/000[1-8]_*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m" >/dev/null
done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/v41-backfill-seed.sql" >/dev/null
# the state the preflight is written for: Stage 0 done, nothing of 0009+ present
n="$(psql -X -d "$DB" -tAc "select count(*) from information_schema.columns where table_name='territories' and column_name='geom'")"
[ "$n" = "0" ] && ok "database is at Stage 0 (no geom column yet)" || bad "database is not at Stage 0"

# ---------------------------------------------------------- the two forms agree
rr() { awk '/create or replace function pg_temp.ring_to_geom/,/^end \$\$;/' "$1" | tr -d ' \t'; }
if [ "$(rr "$DIR/../preflight/v41-preflight.sql")" = "$(rr "$DIR/../preflight/v41-preflight.editor.sql")" ]; then
  ok "the psql and editor forms carry the SAME ring reader, byte for byte (whitespace aside)"
else
  bad "the ring readers of the two preflight forms have drifted apart"
fi
if grep -qE "\bextensions\." "$DIR/../preflight/v41-preflight.sql" "$DIR/../preflight/v41-preflight.editor.sql"; then
  bad "a preflight still addresses PostGIS through the extensions schema"
else
  ok "both forms address PostGIS as gis. only"
fi

# ------------------------------------------------------------- psql form runs
P="$(psql -X -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../preflight/v41-preflight.sql" 2>&1)" || { echo "$P" | tail -5; bad "psql-form preflight errored"; }
has "$P" "PREFLIGHT COMPLETE" "psql form runs to completion"
has "$P" "| gis " "psql form reports PostGIS in gis"
has "$P" "bf-dup" "psql form lists the duplicate-open hood"
has "$P" "00000000-0000-4000-d000-0000000000ff" "psql form lists the entry that resolves to no rep"

# ----------------------------------------------------------- editor form runs
run_editor() { psql -X -v ON_ERROR_STOP=1 -d "$DB" -tA -F ' | ' -f "$DIR/../preflight/v41-preflight.editor.sql" 2>&1; }
E="$(run_editor)" || { echo "$E" | tail -5; bad "editor-form preflight errored"; }
has "$E" "0 env | postgis | schema=gis" "editor: PostGIS reported in gis"
has "$E" "1a geometry by state | LIVE | hoods=3 unusable_outline=0 invalid_geometry=0" "editor: 3 live seeded hoods, all usable"
has "$E" "1a geometry by state | archived | hoods=1" "editor: the archived hood is surveyed too"
has "$E" "1a geometry by state | tombstoned | hoods=1" "editor: the tombstoned hood is surveyed too"
has "$E" "1b LIVE hoods to fix before 0016 | (none)" "editor: an empty section prints (none), not nothing"
has "$E" "2 live pairs overlapping > 1.0 m² (block 0016) | (none)" "editor: no seeded overlap"
has "$E" "hoods=5 entries=6 open=3 bare_scalar_only=1" "editor: the census counts every hood in every state"
has "$E" "foreign_or_missing_profile=1" "editor: the departed rep is counted, not dropped"
has "$E" "3b entries that resolve to no rep (kept as history) | bf-arch / 00000000-0000-4000-d000-0000000000ff" "editor: and named, with its hood"
has "$E" "state=archived assignedAt=1600000000000 still_open=f" "editor: as CLOSED history on an archived hood"
has "$E" "3c ACTIVATION BLOCKER: live hoods with unresolved CURRENT assignee | count | 0 " "editor: no activation blocker in the seed"
has "$E" "3d scalar assignedTo disagrees with open set | bf-bare" "editor: the bare-scalar hood is the one whose mirror disagrees"
has "$E" "3e DUPLICATE open entries for one rep (0011 closes all but newest) | bf-dup / 00000000-0000-4000-d000-000000000001 | team=dddddddd-4444-4444-a444-444444444444 name=BF Duplicate open_entries=2" "editor: the duplicate-open hood, with the rep and the count"
has "$E" "Z verdict | Stage C (0016 arming) | 0 live hood(s) with unusable outline + 0 overlapping pair(s)" "editor: Stage C verdict reads clean"
has "$E" "Z verdict | Activation flip | 0 live hood(s)" "editor: flip verdict reads clean"
n="$(psql -X -d "$DB" -tAc "select count(*) from pg_class where relname='territories_geom_live_gist'")"
[ "$n" = "0" ] && ok "the preflight created no durable object" || bad "the preflight left a durable object behind"

# ------------------------------------------------------------ NEGATIVE CONTROLS
# an overlapping LIVE hood (50 m into bf-live) and a LIVE hood whose CURRENT
# assignee is nobody on the team — the two things the preflight exists to find
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
has "$E" "3c ACTIVATION BLOCKER: live hoods with unresolved CURRENT assignee | count | 1 " "NEGATIVE CONTROL: the live hood with a ghost CURRENT assignee blocks activation"
has "$E" "3b entries that resolve to no rep (kept as history) | nc-ghost / deadbeef-0000-4000-a000-000000000001" "NEGATIVE CONTROL: and is named"
has "$E" "still_open=t" "NEGATIVE CONTROL: as OPEN"
has "$E" "Z verdict | Stage C (0016 arming) | 1 live hood(s) with unusable outline + 1 overlapping pair(s)" "NEGATIVE CONTROL: the Stage C verdict counts both"
has "$E" "Z verdict | Activation flip | 1 live hood(s)" "NEGATIVE CONTROL: the flip verdict counts the ghost"
P="$(psql -X -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/../preflight/v41-preflight.sql" 2>&1)" || bad "psql-form preflight errored on the negative controls"
has "$P" "nc-over" "NEGATIVE CONTROL: the psql form reports the same overlap"
has "$P" "nc-bow" "NEGATIVE CONTROL: and the same bad outline"

echo "PREFLIGHT: $pass passed, $fail failed"
[ "$fail" = "0" ] && echo "PREFLIGHT: ALL GREEN ($pass checks, incl. negative controls)" || { echo "PREFLIGHT: FAILED"; exit 1; }
