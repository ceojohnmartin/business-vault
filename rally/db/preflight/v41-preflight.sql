-- RALLY v41 — THE PREFLIGHT, psql form. READ-ONLY. RUN THIS BEFORE 0009.
--
-- ONE survey, two doors. The questions, the queries and the ring reader all
-- live in v41-preflight.editor.sql — the Supabase SQL Editor form, one final
-- SELECT returning (section | key | detail). This file is the psql door to
-- the SAME text, so the two forms cannot drift: there is only one.
--
--   psql -f db/preflight/v41-preflight.sql
--
-- Writes no row, locks nothing beyond a read, and creates no durable
-- object: its one helper lives in pg_temp and vanishes when the session
-- ends. It needs 0008 (PostGIS in `gis`) and nothing else; it is written
-- to run BEFORE 0009, building geometry on the fly from the stored polygon
-- jsonb with a session-local twin of the ring reader 0009 installs.
-- db/test/preflight-test.sh proves the twin is byte-identical to 0009's,
-- and that the survey is TOTAL over malformed legacy rows: every one of
-- them is a named finding in the output, never an abort.
--
-- WHY IT LIVES HERE AND NOT IN db/migrations/. run-rls-tests.sh applies
-- EVERY file in db/migrations/*.sql; a survey dropped there would execute on
-- every test run. This is a survey, not a migration.

\pset pager off
\timing off
\ir v41-preflight.editor.sql
