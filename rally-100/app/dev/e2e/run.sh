#!/bin/sh
# RALLY 100 cross-role browser test, LOCAL ONLY. Rebuilds the dev database (DROPS rally100_dev), starts the
# dev server for the life of this script, and drives the rep, leader and owner screens in Chromium.
#
#   PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres sh rally-100/app/dev/e2e/run.sh
#
# Needs: a local PostgreSQL 16 with PostGIS (see app/dev/README.md), Node 22, Playwright with Chromium.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
export PGDATABASE="${PGDATABASE:-rally100_dev}"
PORT="${PORT:-8103}"
sh "$DIR/../setup-db.sh" >/dev/null
PORT=$PORT node "$DIR/../server.mjs" > "${TMPDIR:-/tmp}/rally100-e2e-server.log" 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
i=0; until curl -s -o /dev/null "http://127.0.0.1:$PORT/"; do i=$((i+1)); [ $i -gt 40 ] && { echo "dev server did not start"; exit 1; }; sleep 0.25; done
BASE="http://127.0.0.1:$PORT" node "$DIR/cross.js"
