-- RALLY v41 — STAGE C ROLLBACK. Disarms the overlap invariant.
--
-- Run ONLY to undo db/APPLY_v41_C.sql. One transaction, all or nothing.
--
-- WHAT IT REMOVES: the constraint trigger and the three functions 0016
-- created, and NOTHING else. Stage A and Stage B are untouched — the
-- ledger, its triggers, the RPCs, the do-not-knock authority and the
-- geometry column all stay exactly as they are.
--
-- WHAT IT CANNOT UNDO, and does not pretend to: nothing. 0016 writes no
-- row, rewrites no data and changes no other object, so removing its four
-- objects returns the database to precisely its pre-Stage-C state. That is
-- the whole reason Stage C is safe to arm: it is a rule, not a migration of
-- data. Turf drawn while it was armed stays exactly as drawn — it simply
-- stops being checked against the rule from here on.
--
-- The order is deliberate: the trigger goes first, so the functions it
-- depends on are never dropped out from under an in-flight check.
--
-- After this, db/preflight/v41-preflight-stagec.editor.sql reads
-- "functions 0 of 3, constraint trigger 0 of 1 — NOT APPLIED", and
-- db/APPLY_v41_C.sql may be applied again cleanly.

begin;

drop trigger if exists territories_no_overlap on public.territories;

drop function if exists public.assert_no_turf_overlap();
drop function if exists public.rally_overlap_tolerance_m2();
drop function if exists public.rally_overlap_m2(gis.geometry, gis.geometry);

do $$
begin
  if to_regprocedure('public.rally_overlap_m2(gis.geometry,gis.geometry)') is not null
     or exists (select 1 from pg_trigger
                 where tgrelid = 'public.territories'::regclass
                   and tgname = 'territories_no_overlap') then
    raise exception 'Stage C rollback did not fully disarm — refusing to commit a half-removed invariant';
  end if;
  -- and Stage A / Stage B must still be standing
  if to_regprocedure('public.rally_diff_assignees(jsonb,uuid[],uuid,uuid,bigint,jsonb)') is null
     or to_regprocedure('public.smart_split_territory_v41(text,text,jsonb)') is null
     or to_regprocedure('public.clear_pin_dnk(text,text,text)') is null then
    raise exception 'Stage C rollback would leave Stage A/B damaged — refusing';
  end if;
end $$;

commit;
