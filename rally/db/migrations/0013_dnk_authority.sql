-- RALLY v41 — STAGE A part 5. Do-not-knock is SERVER-AUTHORITATIVE.
--
-- A rep can be on v40, on a modified client, on a future buggy client, or
-- calling PostgREST directly with their own token. 0001 grants
-- `select, insert, update on public.pins to authenticated`, and a delete in
-- RALLY is a tombstone UPDATE — so today a rep can erase the visible mark
-- of a do-not-knock door, and a later CSV import brings it back white. A
-- client-side guard is UX. This is the authority, and it is version-blind.
--
-- IT NEUTRALISES, IT DOES NOT REFUSE. js/sync.js:490 pushes rows in
-- BATCHES; a RAISE would fail the whole batch, dead-lettering unrelated
-- knocks from other doors, and the client would retry the same batch
-- forever. Neutralising accepts the write, keeps the parts that are real
-- work (the rep's note, the knock they logged), silently restores the
-- parts that are protected, and lets the corrected row propagate — so the
-- client CONVERGES instead of looping. Contrast 0009, which refuses an
-- invalid polygon: there is no correct outline to substitute there, and
-- here there is exactly one correct disposition.
--
-- AN ORDINARY EDIT NEVER CLEARS BLACK — not a rep's, and NOT A LEADER'S.
-- Leadership authorization does not turn a stray disposition tap into a
-- decision to clear a do-not-knock. The only thing that clears it is
-- clear_pin_dnk() in 0014: an explicit action, with a reason, an
-- idempotency key and an indelible event.

/* Is this door currently do-not-knock, judged from its own history?

   A dnk_clear is written into the pin's history as well as the event log,
   exactly like a knock — which is what lets the ordinary history union
   carry a clear between devices, and lets this test be a cheap read of one
   row rather than a scan of the event table. */
create or replace function public.rally_dnk_from_history(p_data jsonb)
returns bigint
language sql
immutable
security invoker
set search_path = ''
as $$
  with h as (
    select coalesce((e->>'ts')::bigint, 0) ts, e->>'disposition' d
      from jsonb_array_elements(coalesce(p_data->'history', '[]'::jsonb)) e
  ), k as (
    select max(ts) filter (where d = 'dnk')       as dnk_at,
           max(ts) filter (where d = 'dnk_clear') as clear_at
      from h
  )
  select case when dnk_at is null then null
              when clear_at is not null and clear_at >= dnk_at then null
              else dnk_at end
    from k
$$;

create or replace function public.pins_protect_dnk()
returns trigger
language plpgsql
security invoker                     -- current_user is the authorization test
set search_path = ''
as $$
declare
  v_was_dnk   boolean;
  v_leader    boolean;
  v_via_rpc   boolean;
  v_now_ms    bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_incoming  bigint;
  v_touched   boolean := false;
  v_hist      jsonb;
begin
  if tg_op = 'INSERT' then return new; end if;

  /* WAS the door black before this write? Judged from the row the server
     already holds — never from anything the request carried. */
  v_was_dnk := old.disposition = 'dnk'
               or public.rally_dnk_from_history(old.data) is not null;
  if not v_was_dnk then return new; end if;

  /* THE UNSPOOFABLE TEST. A client write arrives through PostgREST as the
     role `authenticated`; a SECURITY DEFINER RPC runs as the function's
     owner, which no client can become. So clear_pin_dnk() is
     distinguishable from every ordinary write without a GUC, a header or a
     JSON flag — none of which are authorization tests, because a request
     can carry all three. This is also why the trigger is SECURITY INVOKER:
     as DEFINER, current_user would be its own owner on every path. */
  v_via_rpc := current_user <> 'authenticated';
  if v_via_rpc then return new; end if;   -- 0014 is the only legitimate clear

  v_leader := coalesce(public.my_role() in ('leader','manager','owner'), false)
              and coalesce(public.is_active(), false);

  /* Leadership does not help here, deliberately. The role gate on
     clear_pin_dnk() is where leadership matters; an ordinary edit is an
     ordinary edit whoever makes it. v_leader is computed only so the
     refusal message can tell a manager what to do instead. */

  -- restore the protected facts, in BOTH the column and the mirror inside data
  if new.disposition is distinct from 'dnk' then
    new.disposition := 'dnk';
    v_touched := true;
  end if;
  if coalesce(new.data->>'disposition', '') is distinct from 'dnk' then
    new.data := jsonb_set(coalesce(new.data, '{}'::jsonb), '{disposition}', '"dnk"'::jsonb);
    v_touched := true;
  end if;

  -- a tombstone is neutralised the same way: the door stays
  if new.deleted_at is distinct from old.deleted_at and new.deleted_at is not null then
    new.deleted_at := old.deleted_at;
    v_touched := true;
  end if;

  /* The do-not-knock knock itself must survive in the history even if the
     incoming row dropped it — the history union is what carries the fact to
     every other device. Notes, later knocks, callbacks, the address and the
     coordinates from this write are all KEPT: they are real work, and the
     point is to protect one fact, not to reject a rep's afternoon. */
  if public.rally_dnk_from_history(new.data) is null then
    v_hist := coalesce(new.data->'history', '[]'::jsonb);
    if jsonb_typeof(v_hist) <> 'array' then v_hist := '[]'::jsonb; end if;
    new.data := jsonb_set(coalesce(new.data, '{}'::jsonb), '{history}',
      v_hist || jsonb_build_object(
        'ts', coalesce(public.rally_dnk_from_history(old.data), v_now_ms),
        'disposition', 'dnk', 'reason', null, 'dm', false,
        'note', 'do-not-knock restored by the server'));
    v_touched := true;
  end if;

  /* THE AUTHORITATIVE-CORRECTION STAMP — the same rule as 0010.
     A client compares record clocks; an unchanged clock reads as "same"
     and the correction is discarded, so a v40 phone would show the door as
     knockable forever. Stamped ONLY when something was actually corrected,
     because an unconditional stamp makes every echo look newer to a device
     whose clock runs behind and it re-pushes the row on every cycle. */
  if v_touched then
    v_incoming := coalesce((new.data->>'updatedAt')::bigint, 0);
    new.data := jsonb_set(new.data, '{updatedAt}', to_jsonb(greatest(v_now_ms, v_incoming + 1)));
  end if;

  return new;
end $$;

drop trigger if exists pins_protect_dnk on public.pins;
create trigger pins_protect_dnk
  before insert or update on public.pins
  for each row execute function public.pins_protect_dnk();

comment on function public.pins_protect_dnk() is
  'Version-blind do-not-knock authority. Neutralises (never refuses) a non-RPC attempt to change a black door away from dnk or to tombstone it, preserves the rest of the write, and stamps data.updatedAt above the incoming value so the client converges.';
