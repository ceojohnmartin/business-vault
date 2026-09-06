-- RALLY v41 — ROLLBACK STAGE B (0015 → 0014) AS ONE TRANSACTION. Returns the
-- function catalog to its Stage A state.
--
-- Use ONLY if Stage B must be withdrawn — before the v41 client is
-- published, or after it has been withdrawn again, because a published v41
-- client calls start_territory_cycle and clear_pin_dnk whenever a team
-- server exists (those two are not gated by any capability) and would 404
-- on them after this file. Works after part 1 alone (no 0015 object yet)
-- and after both parts. Proven by db/test/stage-b-test.sh: afterwards every
-- Stage B function is gone, smart_split_territory is the certified 0005
-- body again under its own name with 0005's grants, rally_capabilities()
-- reports turfRpc false, every Stage A object is untouched, and no row has
-- changed — neither file rewrote one.
--
-- What it cannot undo, and does not need to: a Smart Split that ran through
-- the wrapper left its children with inherited ledger entries. Those are
-- real assignments a leader made (by splitting turf they had assigned),
-- recorded in the same ledger the Stage A trigger keeps; they stand.

begin;

-- ---------------------------------------------------------------- 0015 ---
drop function if exists public.smart_split_territory_v41(text, text, jsonb);
drop function if exists public.rally_split_inherit(text, text[], text);
drop function if exists public.rally_split_strip_children(jsonb);
do $$
begin
  if to_regprocedure('public.smart_split_territory_core(text,text,jsonb)') is not null then
    -- the wrapper holds the 0005 name: drop it, then give the certified
    -- body its name back (a catalog rename; the body is not touched)
    drop function if exists public.smart_split_territory(text, text, jsonb);
    alter function public.smart_split_territory_core(text, text, jsonb)
      rename to smart_split_territory;
  end if;
end $$;
-- 0005's grants, verbatim: the core had been shut to every client role
revoke all on function public.smart_split_territory(text, text, jsonb) from public, anon;
grant execute on function public.smart_split_territory(text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------- 0014 ---
drop function if exists public.clear_pin_dnk(text, text, text);
drop function if exists public.start_territory_cycle(text, timestamptz, text);
drop function if exists public.save_territory(text, text, jsonb, integer, boolean, uuid[], text);
drop function if exists public.set_territory_assignments(text, uuid[], text);
drop function if exists public.rally_validate_assignees(uuid[], uuid);
drop function if exists public.rally_diff_assignees(jsonb, uuid[], uuid, uuid, bigint, jsonb);
drop function if exists public.rally_my_team();
drop function if exists public.rally_require_leader();

commit;
