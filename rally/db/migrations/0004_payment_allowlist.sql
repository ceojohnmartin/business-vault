-- RALLY v39 — the payment allowlist follows the honest record shape.
-- Run once in the Supabase SQL editor, after 0003.
--
-- 0001 already cut every stored customer's payment object down to a safe
-- allowlist at the database door, so no card or bank number can land here
-- whatever a client sends. That stays exactly as it was. What changes is
-- WHICH honest fields survive the cut:
--
--   autopay  -> autopayRequested
--       The old client shape defaulted autopay to TRUE, so a stored `true`
--       is a software default, not evidence that a customer asked for
--       anything. v39 records an explicit REQUEST instead, and the old
--       field is dropped rather than carried forward as false intent.
--
--   status
--       Whether a payment method is genuinely on file is a fact only a
--       billing backend can author. The client can never write "active":
--       the values it can produce are "not_configured" and "pending_setup",
--       and this trigger refuses anything else so a compromised or stale
--       client cannot assert a payment method that does not exist.
--
-- The credential fields (card, ach, number, exp, routing, account, cvv) are
-- excluded by construction: the object is REBUILT from the allowlist, so a
-- key that is not named here cannot survive, now or later.
--
-- Idempotent: safe to run more than once.

create or replace function public.scrub_customer_payment() returns trigger
language plpgsql as $$
declare pay jsonb; st text;
begin
  if new.data is null then
    new.data := '{}'::jsonb;
    return new;
  end if;
  if new.data ? 'payment' then
    pay := new.data->'payment';
    -- a client may only ever claim one of these two; anything else
    -- (including "active" or "on_file") is refused and stored as unknown
    st := coalesce(pay->>'status', 'not_configured');
    if st not in ('not_configured', 'pending_setup') then
      st := 'not_configured';
    end if;
    new.data := jsonb_set(new.data, '{payment}', jsonb_build_object(
      'method',           coalesce(pay->'method',           '""'::jsonb),
      'last4',            coalesce(pay->'last4',            '""'::jsonb),
      'autopayRequested', coalesce(pay->'autopayRequested', 'false'::jsonb),
      'status',           to_jsonb(st),
      'billingAddress',   coalesce(pay->'billingAddress',   'null'::jsonb)));
  end if;
  return new;
end $$;

-- ------------------------------------------------------------- rollback ---
-- Restoring 0001's version means restoring the `autopay` field; see
-- db/migrations/0001_phase1_foundation.sql for the original function body.
