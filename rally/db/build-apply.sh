#!/bin/sh
# Regenerate the paste-ready transaction files from the migration files. Run
# this whenever a migration changes, so the files cannot drift from them:
#   db/APPLY_v39.sql    <- 0004, 0003, 0005, 0006   (applied to production 2026-09-02)
#   db/APPLY_v39_1.sql  <- 0007
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
