#!/bin/sh
# Regenerate the paste-ready transaction files from the migration files. Run
# this whenever a migration changes, so the files cannot drift from them:
#   db/APPLY_v39.sql    <- 0004, 0003, 0005, 0006   (applied to production 2026-09-02)
#   db/APPLY_v39_1.sql  <- 0007
#   db/APPLY_v41_A.sql  <- 0008, 0009, 0010, 0011, 0012, 0013   (v41 STAGE A, applied 2026-09-06)
#   db/APPLY_v41_B1.sql <- 0017, 0014                            (v41 STAGE B part 1)
#   db/APPLY_v41_B2.sql <- 0015                                  (v41 STAGE B part 2)
#   db/APPLY_v41_C.sql  <- 0016                                  (v41 STAGE C)
# Each file keeps its own header (everything up to and including "begin;").
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
regen() {  # $1 = output file, $2.. = migration file names, in order
  OUT="$DIR/$1"; shift
  head -n "$(grep -n '^begin;$' "$OUT" | head -1 | cut -d: -f1)" "$OUT" > "$OUT.tmp"
  printf '\n' >> "$OUT.tmp"
  for f in "$@"; do
    printf -- '-- ============================ %s ============================\n' "$f" >> "$OUT.tmp"
    cat "$DIR/migrations/$f" >> "$OUT.tmp"
    printf '\n' >> "$OUT.tmp"
  done
  printf 'commit;\n' >> "$OUT.tmp"
  mv "$OUT.tmp" "$OUT"
  echo "regenerated $OUT"
}
regen APPLY_v39.sql   0004_payment_allowlist.sql 0003_territory_authorization.sql 0005_smart_split.sql 0006_payment_rebuild.sql
regen APPLY_v39_1.sql 0007_last4_strict.sql
regen APPLY_v41_A.sql 0008_postgis_extension.sql 0009_territory_geometry.sql 0010_territory_assignment.sql 0011_assignment_backfill.sql 0012_column_privileges.sql 0013_dnk_authority.sql
regen APPLY_v41_B1.sql 0017_turf_corrections.sql 0014_turf_rpcs.sql
regen APPLY_v41_B2.sql 0015_smart_split_v41.sql
regen APPLY_v41_C.sql  0016_turf_overlap.sql
regen APPLY_v42.sql    0018_territory_properties.sql
