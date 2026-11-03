-- RALLY 100 v1 — ROLLBACK. Removes RALLY 100 and NOTHING ELSE.
--
-- Everything RALLY 100 created lives in schema rally100 (1001_rally100_v1.sql
-- creates no object anywhere else, and no rally100 object is referenced from
-- outside the schema: no foreign key, trigger, policy or grant in RALLY's
-- public schema points into it). Dropping the schema with cascade therefore
-- removes every RALLY 100 table, row, function and grant, and touches no
-- RALLY table, row, function, policy or grant. RALLY's users, profiles and
-- teams are untouched; RALLY 100 only ever read them.
--
-- THIS DELETES RALLY 100's DATA: every contact, Person, introduction, XP
-- event, reward record and audit row. Export first if any of it is needed.
-- Remove rally100 from Project Settings -> Data API -> Exposed schemas too.

begin;
drop schema rally100 cascade;
commit;
