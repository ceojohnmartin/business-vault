-- RALLY v41 - BACK OUT THE ASSIGNMENT-AUTHORITY FLIP (server side only).
--
-- READ THIS BEFORE RUNNING IT. This restores the SERVER's behaviour. It does
-- NOT restore the fleet. Clients latch the capability: syncCapabilities only
-- ever writes a capability true, and only a full erase of a device clears it.
-- So after this runs you have a MIXED fleet -
--
--   * a phone that polled while the flag was true stays latched: it keeps
--     routing assignment through set_territory_assignments, which is
--     authoritative under either flag, and keeps adopting the server ledger;
--   * a phone that never polled, and any v40 phone, is once again permitted
--     to author the ledger from its own legacy mirror.
--
-- Those two populations can disagree, and a stale mirror from the second can
-- close an assignment the first authored. That is a state RALLY has never
-- been tested in. Prefer fixing forward.

begin;

do $rally_unflip$
declare v_flag boolean; v_rows bigint;
begin
  select count(*) into v_rows from public.rally_config;
  if v_rows <> 1 then
    raise exception 'ROLLBACK NOT RUN: rally_config holds % row(s), expected exactly 1', v_rows;
  end if;
  select assignment_server_authoritative into v_flag from public.rally_config where id;
  if v_flag is distinct from true then
    raise exception 'ROLLBACK NOT RUN: the flag is already % - nothing to back out', coalesce(v_flag::text,'null');
  end if;

  update public.rally_config set assignment_server_authoritative = false where id;

  select assignment_server_authoritative into v_flag from public.rally_config where id;
  if v_flag is not false then
    raise exception 'ROLLBACK FAILED: the column did not take';
  end if;
  raise notice 'ROLLED BACK: assignment_server_authoritative = false. The FLEET is not rolled back - see the header.';
end
$rally_unflip$;

commit;
