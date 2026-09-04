-- RALLY v41 — STAGE 0. PostGIS, and nothing else.
--
-- This file deliberately touches NO RALLY object: no column, no index, no
-- function, no grant, no row. It exists on its own because the read-only
-- preflight that decides whether any of the rest may run is itself written
-- in PostGIS predicates — it measures existing overlaps and tests existing
-- polygons for validity — so the extension has to exist BEFORE the survey
-- that gates the migration. Running the survey first was impossible, which
-- is the ordering defect this split fixes.
--
-- Purely additive and reversible while nothing depends on it:
--     drop extension postgis;
--
-- ---------------------------------------------------------------------
-- AFTER APPLYING THIS FILE, RUN THE DISCOVERY QUERY BELOW AND RECORD ITS
-- ANSWER IN db/APPLIED.md BEFORE APPLYING 0009. Every later file qualifies
-- its PostGIS references against that schema name by hand, because those
-- files run with `search_path = ''` and nothing is resolved implicitly.
--
--   select e.extname, n.nspname as postgis_schema, e.extversion
--     from pg_extension e
--     join pg_namespace n on n.oid = e.extnamespace
--    where e.extname = 'postgis';
--
-- Supabase's documented default is the `extensions` schema, and the local
-- test harness reproduces that — but a platform upgrade may relocate it, so
-- this is DISCOVERED, never assumed, and re-checked after any such upgrade.
-- ---------------------------------------------------------------------

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

-- `authenticated` needs to RESOLVE the geography/geometry types to read the
-- territories table at all once 0009 adds the column. This grants the right
-- to name things in the schema; it grants no table and no data.
grant usage on schema extensions to authenticated;
