#!/bin/sh
# Regenerate db/APPLY_v39.sql from the migration files. Run this whenever
# 0003, 0004, 0005 or 0006 changes, so the paste-ready transaction cannot drift
# from them.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/APPLY_v39.sql"
head -n "$(grep -n '^begin;$' "$OUT" | head -1 | cut -d: -f1)" "$OUT" > "$OUT.tmp"
printf '\n' >> "$OUT.tmp"
for f in 0004_payment_allowlist.sql 0003_territory_authorization.sql 0005_smart_split.sql 0006_payment_rebuild.sql; do
  printf -- '-- ============================ %s ============================\n' "$f" >> "$OUT.tmp"
  cat "$DIR/migrations/$f" >> "$OUT.tmp"
  printf '\n' >> "$OUT.tmp"
done
printf 'commit;\n' >> "$OUT.tmp"
mv "$OUT.tmp" "$OUT"
echo "regenerated $OUT"
