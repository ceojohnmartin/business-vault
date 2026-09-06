#!/bin/sh
# RALLY v41 — THE PREFLIGHT, PROVEN.
#   PGHOST=/tmp/pgrls/sock PGPORT=5544 sh rally/db/test/preflight-test.sh
#
# A survey nobody has run against real-shaped data is a guess, and a survey
# that ABORTS on the data it exists to find is worse than none. This builds
# a database in exactly the state production is in when the preflight runs
# — the Supabase shim, 0001..0008 (PostGIS in `gis`), the v40-shaped seed —
# and proves four things about db/preflight/v41-preflight.editor.sql (and
# its psql wrapper):
#
#   1. it reports the facts the seed planted;
#   2. its readers are byte-identical twins of the migrations': the ring
#      reader of 0009, and the five normaliser functions of 0010 — so what
#      the survey says a row's ledger will be IS what Stage A writes;
#   3. it is TOTAL: with EVERY malformed fixture in
#      db/test/v41-preflight-fixtures.sql loaded at once (46 shapes: non-UUID,
#      uuid-length and upper-case ids; assignments that are an object /
#      string / number / JSON null; entries that are not objects or have no
#      userId; timestamps that are text, decimals, missing, zero, in the
#      future, inverted, duplicated, or int8-tolerant; data that is a string
#      / array / JSON null; polygons that are an object / string / JSON null
#      / empty; corners off the planet on all four sides; coordinates that
#      are strings, "NaN", "Infinity", too big for float8; a corner that is
#      not a pair; an antipodal pair; a 2,000-entry hood; four legacy pin
#      shapes) — it returns, and every one of them is a NAMED FINDING;
#   4. its verdict matches what the migrations DO: the only Stage A
#      BLOCKER left is a territory whose data is not a JSON object.
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
M09="$DIR/../migrations/0009_territory_geometry.sql"
M10="$DIR/../migrations/0010_territory_assignment.sql"
M11="$DIR/../migrations/0011_assignment_backfill.sql"
run_editor() { psql -X -v ON_ERROR_STOP=1 -d "$DB" -tA -F ' | ' -f "$EDITOR_SQL" 2>&1; }

psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql"
for m in "$DIR"/../migrations/000[1-8]_*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m" >/dev/null
done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/v41-backfill-seed.sql" >/dev/null
n="$(psql -X -d "$DB" -tAc "select count(*) from information_schema.columns where table_name='territories' and column_name='geom'")"
[ "$n" = "0" ] && ok "database is at Stage 0 (no geom column yet)" || bad "database is not at Stage 0"

# ------------------------------------------ the readers are the migrations'
# a function body from `create or replace function <name>(` to its `$$;`,
# with the migration's public.rally_ prefix mapped to the preflight's
# pg_temp. prefix and whitespace removed
fnbody() { awk -v n="$1" 'index($0, "create or replace function " n "(") { f = 1 } f { print } f && /\$\$;[[:space:]]*$/ { exit }' "$2" \
           | sed -e 's/public\.rally_/pg_temp./g' | tr -d ' \t\n'; }
twin() {  # $1 = migration file, $2 = public.rally_<x>, $3 = pg_temp.<x>
  a="$(fnbody "$2" "$1")"; b="$(fnbody "$3" "$EDITOR_SQL")"
  if [ -n "$a" ] && [ "$a" = "$b" ]; then ok "the preflight's $3 is byte-identical to $2 (name aside)"
  else bad "the preflight's $3 has drifted from $2"; fi
}
twin "$M09" public.rally_ring_read pg_temp.ring_read
twin "$M10" public.rally_ms pg_temp.ms
twin "$M10" public.rally_uid pg_temp.uid
twin "$M10" public.rally_uid_uuid pg_temp.uid_uuid
twin "$M10" public.rally_close_duplicate_opens pg_temp.close_duplicate_opens
twin "$M10" public.rally_legacy_to_entries pg_temp.legacy_to_entries
if grep -qE "\bextensions\." "$EDITOR_SQL" "$PSQL_SQL"; then
  bad "a preflight still addresses PostGIS through the extensions schema"
else
  ok "both forms address PostGIS as gis. only"
fi
# the reading rules: every array function over RAW json sits within five
# lines after a jsonb_typeof guard (or a test of a *_type column that holds
# one). The three sources that are not raw json are exempt by name: h.norm
# and p_entries are what the normaliser PRODUCED (always an array), and
# v_src is the reader's own history array, returned on before the loop when
# it is not one. No bare ::uuid cast outside the twins (the SELECT body must
# cast only ledger values the normaliser produced, and the twins' own bodies)
if awk '
  /jsonb_typeof|_type = .array./ { g = NR }
  /jsonb_array_(elements|length)\((h\.norm\)|coalesce\(p_entries,|v_src\))/ { next }
  /jsonb_array_(elements|length)\(/ && $0 !~ /^[[:space:]]*--/ { if (NR - g > 5) { print NR": "$0; bad = 1 } }
  END { exit bad }' "$EDITOR_SQL"; then
  ok "every jsonb_array_elements/length in the editor preflight sits behind a jsonb_typeof guard"
else
  bad "an unguarded jsonb_array_elements/length exists in the editor preflight (above)"
fi
if awk '
  /^with$/ { body = 1 }
  body && /::uuid/ && $0 !~ /^[[:space:]]*--/ { print NR": "$0; bad = 1 }
  END { exit bad }' "$EDITOR_SQL"; then
  ok "the survey body never casts to uuid itself — only the rally_uid_uuid twin does"
else
  bad "a ::uuid cast exists in the survey body (above)"
fi
# PostgreSQL promises no evaluation order for the operands of AND / OR — not
# in WHERE, not in a CASE condition, not in a PL/pgSQL IF — so a type test
# may never "protect" an array function across a boolean operator. The
# guard must be a CASE branch, a nested IF, or a CASE-built array input.
if grep -nE "(and|or)[[:space:]]+jsonb_array_(length|elements)" "$EDITOR_SQL" "$M09" "$M10" "$M11"; then
  bad "an array function still hides behind an AND/OR operand (above)"
else
  ok "no array function relies on AND/OR short-circuit in the preflight, 0009, 0010 or 0011"
fi
# a bigint out-runs what a timestamp can hold: every to_timestamp of a
# ledger value is range-guarded
if grep -n "to_timestamp" "$EDITOR_SQL" | grep -v "253402300799000"; then
  bad "an unguarded to_timestamp exists in the editor preflight (above)"
else
  ok "every to_timestamp in the editor preflight is range-guarded"
fi

# ------------------------------------------------------- baseline: the seed
E="$(run_editor)" || { echo "$E" | tail -5; bad "editor-form preflight errored on the seed"; }
has "$E" "0 env | postgis | schema=gis" "seed: PostGIS reported in gis"
has "$E" "0 env | postgis_full_version | POSTGIS=\"" "seed: the full PostGIS build line (GEOS, PROJ) is recorded in section 0"
has "$E" "1a geometry by state | LIVE | hoods=12 usable=12 unusable_outline=0 invalid_geometry=0 no_outline_at_all=0" "seed: 12 live hoods, all usable"
has "$E" "1a geometry by state | archived | hoods=3 usable=2 unusable_outline=0 invalid_geometry=1" "seed: 3 archived hoods, one with an invalid ring"
has "$E" "1a geometry by state | tombstoned | hoods=1" "seed: the tombstoned hood is surveyed too"
has "$E" "1b LIVE hoods to fix before 0016 | (none)" "seed: an empty section prints (none), not nothing"
has "$E" "| bf-arch-bow | team=dddddddd-4444-4444-a444-444444444444 state=archived name=BF Archived Bowtie corners=4 reason=Self-intersection" "seed: the archived bowtie is listed in 1c with PostGIS's reason"
has "$E" "2 live pairs overlapping > 1.0 m² (block 0016) | (none)" "seed: no overlap"
has "$E" "hoods=16 raw_entries=19 kept=15 dropped_elements=4 ledger_entries=18 open=12 " "seed: the census counts every hood in every state through the reader (19 raw elements, 4 of them junk, 15 kept + 3 synthesized = 18)"
has "$E" "| bf-int8max / 00000000-0000-4000-d000-000000000001 future | review team=dddddddd-4444-4444-a444-444444444444 name=BF int8 max — open entry assignedAt=9223372036854775807 is in the future (beyond the year 9999)" "seed: an assignedAt at the top of the bigint range is a review finding, not a timestamp overflow"
has "$E" "synthesized_from_assignedTo=3 " "seed: three bare-scalar hoods are synthesized (bf-bare, bf-asg-obj, bf-created0)"
has "$E" "dedupe_closed=2 " "seed: two duplicate opens are closed by the reader (bf-dup, bf-dup-same)"
has "$E" "local_device_ids=1 foreign_or_missing_profile=1 " "seed: the 36-hex id and the departed rep are counted, not dropped"
has "$E" "3b entries that resolve to no rep (kept as history) | bf-arch / 00000000-0000-4000-d000-0000000000ff" "seed: the departed rep is named, with its hood"
has "$E" "3b entries that resolve to no rep (kept as history) | bf-36hex / aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | team=dddddddd-4444-4444-a444-444444444444 name=BF 36-hex state=archived" "seed: the uuid-length non-uuid is named as history on an archived hood"
has "$E" "3c ACTIVATION BLOCKER: live hoods with unresolved CURRENT assignee | count | 0 " "seed: no activation blocker (the unresolved ids are on archived hoods)"
has "$E" "| bf-upper | team=dddddddd-4444-4444-a444-444444444444 name=BF Upper scalar=00000000-0000-4000-D000-000000000001 ledger=00000000-0000-4000-d000-000000000001" "seed: the upper-case scalar disagrees with the canonical ledger — 0011 rewrites it"
has "$E" "3e DUPLICATE open entries for one rep (the reader keeps the last open, closes the rest) | bf-dup / 00000000-0000-4000-d000-000000000001 | team=dddddddd-4444-4444-a444-444444444444 name=BF Duplicate open_in_raw=2" "seed: the duplicate-open hood, with the rep and the count"
has "$E" "| bf-dup-same / 00000000-0000-4000-d000-000000000001 | team=dddddddd-4444-4444-a444-444444444444 name=BF Dup Same open_in_raw=2" "seed: the same-timestamp duplicate is a dedupe, not an abort"
has "$E" "| bf-asg-obj / assignments | review team=dddddddd-4444-4444-a444-444444444444 name=BF Assignments Object — assignments is a JSON object, not an array — the reader treats it as no history array (synthesizes the open entry from assignedTo) and the mirror OVERWRITES it" "seed: the object-assignments hood is a review finding"
has "$E" "| bf-i3 / entry #1 unassignedAt | normalised team=dddddddd-4444-4444-a444-444444444444 name=BF Ends Before Starts — unassignedAt=1700000000000 is before assignedAt=1700000100000 — clamped to assignedAt, raw kept in unassignedAtRaw" "seed: the inverted run is a normalisation, named with both values"
has "$E" "| bf-noat / entry #1 assignedAt | normalised team=dddddddd-4444-4444-a444-444444444444 name=BF No assignedAt — assignedAt missing — synthesized from the row's created_at (assignedAtSynthesized)" "seed: the missing start is a normalisation"
has "$E" "| bf-created0 / createdAt | normalised team=dddddddd-4444-4444-a444-444444444444 name=BF createdAt Zero — bare-scalar hood whose createdAt=0 is not after the epoch" "seed: the zero createdAt is a normalisation"
has "$E" "| bf-junk / entry #4 | dropped team=dddddddd-4444-4444-a444-444444444444 name=BF Junk Elements — entry has no userId — carries no assignment" "seed: the object with no userId is a dropped element"
lacks "$E" "| bf-plus / " "seed: a leading + is not a finding — int8 reads it"
lacks "$E" "| bf-upper / entry" "seed: an upper-case uuid is not a finding — it is one rep"
has "$E" "Z verdict | Stage A (0009-0013) | 0 hood(s) whose data is not a JSON object must be 0 (3f BLOCKER rows); 8 hood(s) have assignment data the reader normalises or drops (3f)" "seed: Stage A verdict — no blocker, eight hoods to review"
has "$E" "Z verdict | Stage C (0016 arming) | 0 live hood(s) with unusable or invalid outline + 0 overlapping pair(s) + 0 unmeasurable pair(s)" "seed: Stage C verdict reads clean (the bowtie is archived)"
# the survey's overlap measurement is EXCEPTION-SAFE: a pair the engine
# cannot measure comes back as a problem, never as an abort and never as 0
P="$(printf '%s\n' "$(cat "$EDITOR_SQL")" \
  "select 'srid:' || coalesce((pg_temp.overlap_m2(gis.st_geomfromtext('POLYGON((0 0,1 0,1 1,0 1,0 0))',4326), gis.st_geomfromtext('POLYGON((0 0,1 0,1 1,0 1,0 0))',3857))).problem, '<none>');" \
  "select 'anti:' || coalesce((pg_temp.overlap_m2(gis.st_geomfromtext('POLYGON((-90 0,90 0,90 1,-90 1,-90 0))',4326), gis.st_geomfromtext('POLYGON((-90 0.5,90 0.5,90 1.5,-90 1.5,-90 0.5))',4326))).problem, '<none>');" \
  | psql -X -v ON_ERROR_STOP=1 -d "$DB" -tA 2>&1)" && ok "the overlap helper survives a pair the engine cannot measure — no abort" || bad "the overlap helper aborted on an unmeasurable pair"
printf '%s' "$P" | grep -q "^srid:.*SRID" && ok "an unmeasurable pair (mixed SRID) comes back as a named problem, not zero" || bad "the overlap helper did not name the mixed-SRID failure — got: $(printf '%s' "$P" | grep '^srid:')"
echo "INFO: antipodal-edge probe through the helper → $(printf '%s' "$P" | grep '^anti:')"
has "$E" "Z verdict | Activation flip | 0 live hood(s)" "seed: flip verdict reads clean"
n="$(psql -X -d "$DB" -tAc "select count(*) from pg_class where relname='territories_geom_live_gist'")"
[ "$n" = "0" ] && ok "the preflight created no durable object" || bad "the preflight left a durable object behind"
n="$(psql -X -d "$DB" -tAc "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('rally_ms','rally_uid','rally_ring_read','rally_legacy_to_entries')")"
[ "$n" = "0" ] && ok "and installed none of the migrations' functions — the twins live in pg_temp only" || bad "the preflight left a public function behind"

# the psql wrapper is the same survey through the other door
P="$(psql -X -v ON_ERROR_STOP=1 -d "$DB" -f "$PSQL_SQL" 2>&1)" || { echo "$P" | tail -5; bad "psql-form preflight errored"; }
has "$P" "Z verdict" "psql form runs to completion and reaches the verdict"
has "$P" "bf-dup" "psql form lists the duplicate-open hood"
ne="$(printf '%s\n' "$E" | grep -c ' | ')"; np="$(printf '%s\n' "$P" | grep -c '|')"
[ "$np" -ge "$ne" ] && ok "psql form returns every row the editor form does ($ne)" || bad "psql form returned $np rows vs editor $ne"

# ------------------------------------------- TOTALITY: every malformed shape
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/v41-preflight-fixtures.sql" >/dev/null
NF="$(grep -c '^-- FIXTURE' "$DIR/v41-preflight-fixtures.sql")"
t0="$(date +%s)"
E="$(run_editor)" || { echo "$E" | tail -8; bad "editor-form preflight ABORTED with all $NF malformed fixtures loaded"; }
t1="$(date +%s)"
lacks "$E" "ERROR" "TOTAL: with all $NF malformed fixtures loaded the preflight returns without an error"
has "$E" "Z verdict | Activation flip" "TOTAL: and reaches the verdict rows"
[ $((t1 - t0)) -le 60 ] && ok "TOTAL: and does so in $((t1 - t0)) s with a 2,000-entry hood present (linear, not quadratic)" || bad "the preflight took $((t1 - t0)) s"

# geometry findings — every bad outline is named, with the corner
has "$E" "1b LIVE hoods to fix before 0016 | pf-poly-obj | team=dddddddd-4444-4444-a444-444444444444 name=PF polygon object corners=- reason=the outline is a JSON object, not an array of corners" "polygon = object → named finding"
has "$E" "| pf-poly-str | " "polygon = string → named finding"
has "$E" "reason=the outline is a JSON string, not an array of corners" "polygon = string → with the reason"
has "$E" "| pf-lon-over | team=dddddddd-4444-4444-a444-444444444444 name=PF lon > 180 corners=4 reason=corner 1 longitude 200 is outside [-180, 180]" "longitude > 180 → named finding with the corner"
has "$E" "reason=corner 1 longitude -200 is outside [-180, 180]" "longitude < -180 → with the value"
has "$E" "reason=corner 1 latitude 95 is outside [-90, 90]" "latitude > 90 → with the value"
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
has "$E" "| pf-anti-a | team=dddddddd-4444-4444-a444-444444444444 name=PF antipodal A corners=4 reason=the outline spans 180 degrees of longitude — half the planet is not a hood" "a ring 180 degrees wide is refused by the reader, before the geography cast can meet its antipodal edge"
has "$E" "| pf-anti-b | " "and so is its twin"
has "$E" "2 live pairs overlapping > 1.0 m² (block 0016) | (none)" "the antipodal pair and the off-planet pairs never reach the overlap census — no row, no abort"
n="$(printf '%s\n' "$E" | grep -c '^1b LIVE hoods to fix before 0016 | pf-')"
[ "$n" = "18" ] && ok "exactly the 18 seeded bad outlines are listed in 1b (got $n)" || bad "expected 18 bad outlines in 1b, got $n"
has "$E" "no_outline_at_all=2" "the JSON-null and empty polygons are counted as no outline"

# assignment findings — through the reader
has "$E" "3b entries that resolve to no rep (kept as history) | pf-local / local-abc123" "a device-local userId is named as unresolved history"
has "$E" "3b entries that resolve to no rep (kept as history) | pf-foreign / deadbeef-0000-4000-a000-00000000aaaa" "a uuid-shaped userId with no profile is named"
has "$E" "3b entries that resolve to no rep (kept as history) | pf-uid-36hex / aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" "a uuid-LENGTH id is named — it is text, and is never cast"
has "$E" "3b entries that resolve to no rep (kept as history) | pf-to-obj / {" "an assignedTo that is an object is read as a text id and named"
has "$E" "3c ACTIVATION BLOCKER: live hoods with unresolved CURRENT assignee | count | 4 " "all four are OPEN on LIVE hoods, so all four block the flip — the same answer rally_config_guard gives"
has "$E" "| pf-asg-obj / assignments | review " "assignments = object → review finding"
has "$E" "| pf-asg-str / assignments | review " "assignments = string → review finding"
has "$E" "| pf-asg-num / assignments | review " "assignments = number → review finding"
lacks "$E" "| pf-asg-null / assignments |" "assignments = JSON null is ABSENT, not malformed"
has "$E" "| pf-entry-str / entry #1 | dropped team=dddddddd-4444-4444-a444-444444444444 name=PF entry string — element is a JSON string, not an object — carries no assignment" "an entry that is a string → dropped element, numbered"
has "$E" "| pf-entry-str / entry #3 | dropped " "an entry that is a JSON null → dropped element"
has "$E" "| pf-nouid / entry #1 | dropped team=dddddddd-4444-4444-a444-444444444444 name=PF entry no userId — entry has no userId — carries no assignment" "an object entry with no userId → dropped element"
has "$E" "| pf-nouid / entry #2 | dropped " "an entry with an empty userId → dropped element"
has "$E" "| pf-at-text / entry #1 assignedAt | normalised team=dddddddd-4444-4444-a444-444444444444 name=PF assignedAt text — assignedAt=last tuesday is unreadable — synthesized from the row's created_at, raw kept in assignedAtRaw" "assignedAt text → normalised, raw kept"
has "$E" "| pf-at-dec / entry #1 assignedAt | normalised " "assignedAt decimal → normalised"
has "$E" "| pf-at-miss / entry #1 assignedAt | normalised team=dddddddd-4444-4444-a444-444444444444 name=PF assignedAt missing — assignedAt missing — synthesized from the row's created_at (assignedAtSynthesized)" "assignedAt missing → normalised"
has "$E" "| pf-un-text / entry #1 unassignedAt | normalised team=dddddddd-4444-4444-a444-444444444444 name=PF unassignedAt text — unassignedAt=soon is unreadable — CLOSED at its assignedAt, raw kept in unassignedAtRaw" "unassignedAt text → closed at its start, raw kept"
has "$E" "| pf-i3 / entry #1 unassignedAt | normalised " "a run that ends before it starts → normalised"
has "$E" "| pf-noat-closed / entry #1 unassignedAt | normalised team=dddddddd-4444-4444-a444-444444444444 name=PF missing assignedAt closed — unassignedAt=1600000000000 is before assignedAt=" "a closed run with no start: the synthesized start is later than the end, so the end is clamped — and the finding says the start was synthesized"
has "$E" "(synthesized) — clamped to assignedAt, raw kept in unassignedAtRaw" "with the raw end kept"
has "$E" "| pf-created-text / createdAt | normalised team=dddddddd-4444-4444-a444-444444444444 name=PF createdAt text — bare-scalar hood whose createdAt=yesterday is unreadable" "createdAt text on a bare-scalar hood → normalised"
has "$E" "| pf-created-0 / createdAt | normalised " "createdAt zero → normalised"
has "$E" "| pf-created-epoch / 00000000-0000-4000-d000-000000000001 clock | normalised team=dddddddd-4444-4444-a444-444444444444 name=PF created_at epoch — the row's own created_at is at or before the epoch — the synthesized assignedAt is 1" "a row clock at the epoch → named, the assignedAt becomes 1"
has "$E" "| pf-dup-same / 00000000-0000-4000-d000-000000000001 dedupe | normalised " "two opens with the same assignedAt → dedupe, named"
has "$E" "| pf-mixedcase / 00000000-0000-4000-d000-000000000001 dedupe | normalised " "a rep open twice in two spellings → ONE rep, dedupe, named"
has "$E" "| pf-future / 00000000-0000-4000-d000-000000000001 future | review team=dddddddd-4444-4444-a444-444444444444 name=PF future assignedAt — open entry assignedAt=2000000000000 is in the future (2033-05-18) — it can only close at or after that instant" "an open entry dated 2033 → review finding"
lacks "$E" "| pf-ts-ok / " "whitespace, a plus sign and 19 digits are what int8 accepts — not a finding"
lacks "$E" "| pf-by-36hex / " "an assignedBy that is not a uuid is a name, not a finding"
has "$E" "| pf-data-str / data | BLOCKER team=dddddddd-4444-4444-a444-444444444444 name=PF data string — data is a JSON string, not an object — 0010's mirror write (jsonb_set) aborts on it" "data = string → the one true BLOCKER class"
has "$E" "| pf-data-arr / data | BLOCKER " "data = array → BLOCKER"
has "$E" "| pf-data-null / data | BLOCKER " "data = JSON null → BLOCKER"
has "$E" "Z verdict | Stage A (0009-0013) | 3 hood(s) whose data is not a JSON object must be 0 (3f BLOCKER rows); " "the Stage A verdict counts exactly the three data-not-object hoods as blockers"
has "$E" "Z verdict | Stage C (0016 arming) | 18 live hood(s) with unusable or invalid outline + 0 overlapping pair(s) + 0 unmeasurable pair(s)" "the Stage C verdict counts the 18 unusable outlines"
has "$E" "| pf-int8max / 00000000-0000-4000-d000-000000000001 future | review team=dddddddd-4444-4444-a444-444444444444 name=PF int8 max — open entry assignedAt=9223372036854775807 is in the future (beyond the year 9999) — it can only close at or after that instant" "an assignedAt of 9223372036854775807 is a review finding — the survey never formats it as a timestamp"
lacks "$E" "| pf-int8max / entry #" "and an unassignedAt of 9223372036854775807 is simply a closed entry"
has "$E" "Z verdict | Activation flip | 4 live hood(s)" "the flip verdict counts the four ghost assignees"
has "$E" "4 do-not-knock census | totals | pins=4 scalar_dnk=3 has_dnk_knock=1 dnk_with_no_dateable_knock=2 already_tombstoned_black=0 data_not_object=1 history_not_array=2 history_ts_unparseable=1" "pins: history-as-object, data-as-string, ts-as-sentence and history-as-string are each counted"
P="$(psql -X -v ON_ERROR_STOP=1 -d "$DB" -f "$PSQL_SQL" 2>&1)" || bad "psql-form preflight errored with the malformed fixtures loaded"
lacks "$P" "ERROR" "the psql form is total over the same fixtures"

# ----------------------------- the verdict is what the migrations DO
# Every fixture except the three data-not-object hoods must survive
# 0009..0016 — the survey said so. Drop those three, apply the rest, and
# the backfill's own proofs must hold over the whole zoo.
psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "delete from public.territories where id in ('pf-data-str','pf-data-arr','pf-data-null')"
# 0016 refuses to arm over live unusable outlines and live overlaps — the
# survey said 18 of the former; retire them as the operator would
psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "update public.territories set archived = true where id in (select id from public.territories where id like 'pf-%' and (id like 'pf-poly-%' or id like 'pf-lon-%' or id like 'pf-lat-%' or id like 'pf-coord-%' or id like 'pf-vertex-%' or id like 'pf-anti-%') and id not in ('pf-poly-null','pf-poly-empty'))"
A="$(for m in "$DIR"/../migrations/0009_*.sql "$DIR"/../migrations/001[0-6]_*.sql; do psql -v ON_ERROR_STOP=1 -d "$DB" -f "$m" 2>&1 || { echo "MIGRATION FAILED: $m"; break; }; done)"
lacks "$A" "MIGRATION FAILED" "VERDICT: every non-blocker fixture survives 0009..0016 — the migrations abort on nothing the survey did not call a BLOCKER"
lacks "$A" "PROOF" "VERDICT: and 0011's five proofs held over the whole zoo"
has "$A" "v41 backfill: OK" "VERDICT: the backfill reported OK"
n="$(psql -X -d "$DB" -tAc "select count(*) from public.territories where deleted_at is null and archived = false and geom is null and (case when jsonb_typeof(polygon) = 'array' then jsonb_array_length(polygon) else 0 end) > 0")"
[ "$n" = "0" ] && ok "VERDICT: no live hood is left with an outline and no geom — the overlap invariant has no blind spot" || bad "$n live hood(s) have an outline but no geom after Stage C"
G="$(psql -X -d "$DB" -c "update public.rally_config set assignment_server_authoritative = true" 2>&1 || true)"
has "$G" "v41: 4 live hood(s) still name a CURRENT assignee that is no rep on their team" "VERDICT: the activation guard refuses by name with the count the survey gave (4), never with a cast error"
lacks "$G" "invalid input syntax" "VERDICT: and never with a cast error"

# ------------------------------------------------------------ NEGATIVE CONTROLS
psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase-shim.sql"
for m in "$DIR"/../migrations/000[1-8]_*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m" >/dev/null; done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/v41-backfill-seed.sql" >/dev/null
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
  ('dddddddd-4444-4444-a444-444444444444', 'nc-bare-ghost', 'NC Bare Ghost',
   pg_temp.bf_rect(95200, 0, 95300, 100), false, null,
   jsonb_build_object('id','nc-bare-ghost','createdAt',1690000000000,'assignedTo','deadbeef-0000-4000-a000-000000000002')),
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
has "$E" "3c ACTIVATION BLOCKER: live hoods with unresolved CURRENT assignee | count | 2 " "NEGATIVE CONTROL: a ghost CURRENT assignee in an entry AND one in a bare scalar both count — the bare scalar is synthesized by the same reader the guard uses"
has "$E" "3b entries that resolve to no rep (kept as history) | nc-bare-ghost / deadbeef-0000-4000-a000-000000000002" "NEGATIVE CONTROL: and the bare-scalar ghost is named"
has "$E" "Z verdict | Stage C (0016 arming) | 1 live hood(s) with unusable or invalid outline + 1 overlapping pair(s) + 0 unmeasurable pair(s)" "NEGATIVE CONTROL: the Stage C verdict counts the bowtie and the pair"
has "$E" "Z verdict | Activation flip | 2 live hood(s)" "NEGATIVE CONTROL: the flip verdict counts both ghosts"

echo "PREFLIGHT: $pass passed, $fail failed"
[ "$fail" = "0" ] && echo "PREFLIGHT: ALL GREEN ($pass checks, incl. $NF malformed fixtures, the migrations over the whole zoo, and negative controls)" || { echo "PREFLIGHT: FAILED"; exit 1; }
