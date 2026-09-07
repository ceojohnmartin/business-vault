-- RALLY v41 — ROLLBACK STAGE A (0013 → 0012 → 0011 → 0010 → 0009 → 0008's grant)
-- AS ONE TRANSACTION. Returns the schema and the grants to their v40 state.
--
-- Use ONLY if Stage A must be withdrawn before Stage B. Paste the WHOLE file
-- into the Supabase SQL editor and run it once. Proven by
-- db/test/stage-a-test.sh: after it, every v41 object count is 0, the
-- table-level insert/update grant of 0001 is back, gis USAGE is revoked,
-- and every territory's `data` outside the two mirrors is byte-identical to
-- before Stage A.
--
-- What it cannot undo, and does not need to: 0011 rewrote data.assignedTo and
-- data.assignments as mirrors of the ledger it built FROM them. Their content
-- is the same assignment record in the same v40 shape (the backfill's five
-- proofs asserted that inside the apply transaction), so a v40 client reads
-- them exactly as before. The ledger column itself is dropped here; the
-- history it held lives on in data.assignments.
--
-- Order matters: triggers before their functions, dependent functions
-- before the readers they call, the columns last, the grant last of all.

begin;

-- ---------------------------------------------------------------- 0013 ---
drop trigger if exists pins_protect_dnk on public.pins;
drop trigger if exists events_guard_dnk_clear on public.events;
drop function if exists public.pins_protect_dnk();
drop function if exists public.events_guard_dnk_clear();
drop function if exists public.rally_strip_forged_clears(jsonb, jsonb);
drop function if exists public.rally_dnk_from_history(jsonb);

-- ---------------------------------------------------------------- 0012 ---
-- revoking the table privilege also drops the column-level grants; then
-- 0001's table-level grant is restored verbatim
revoke insert, update on public.territories from authenticated;
grant insert, update on public.territories to authenticated;

-- ---------------------------------------------------------------- 0010 ---
drop trigger if exists rally_config_guard on public.rally_config;
drop trigger if exists territories_assignment on public.territories;
drop function if exists public.rally_config_guard();
drop function if exists public.rally_unresolved_live_assignments();
drop function if exists public.territories_assignment();
drop function if exists public.rally_legacy_to_entries(jsonb, timestamptz, jsonb);
drop function if exists public.rally_close_duplicate_opens(jsonb);
drop function if exists public.rally_merge_provenance(jsonb, jsonb);
drop function if exists public.rally_keep_closed_history(jsonb, jsonb);
drop function if exists public.rally_assert_ledger(jsonb, jsonb);
drop function if exists public.rally_mirror_assignments(jsonb);
drop function if exists public.rally_open_uuids(jsonb, uuid);
drop function if exists public.rally_first_open_assignee(jsonb);
drop function if exists public.rally_open_entries(jsonb);
drop function if exists public.rally_sort_entries(jsonb);
drop function if exists public.rally_uid_uuid(text);
drop function if exists public.rally_uid(text);
drop function if exists public.rally_ms(text);
drop function if exists public.rally_capabilities();
drop table if exists public.rally_config;
drop index if exists public.territories_open_assignees_gin;
alter table public.territories
  drop column if exists assignees,
  drop column if exists assignees_rev,
  drop column if exists open_assignees,
  drop column if exists cycle_started_at;

-- ---------------------------------------------------------------- 0009 ---
drop trigger if exists territories_derive_geom on public.territories;
drop function if exists public.territories_derive_geom();
drop index if exists public.territories_geom_live_gist;
alter table public.territories drop column if exists geom;
drop function if exists public.rally_ring_problem(jsonb);
drop function if exists public.rally_ring_to_geom(jsonb);
drop function if exists public.rally_ring_read(jsonb);

-- ------------------------------------------------- 0008's Stage A line ---
-- PostGIS itself stays (Step 0A; nothing v40 sees it)
revoke usage on schema gis from authenticated;

commit;
