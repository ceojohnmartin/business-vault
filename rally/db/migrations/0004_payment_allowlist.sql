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
-- MIXED-VERSION SAFETY: autopayRequested and status are preserved when the
-- incoming payload OMITS them, so a client too old to know about a field
-- cannot erase it by saving the record. This holds for both statement shapes
-- a client can produce, AND under concurrency — see the comment on `prev`.
-- Getting it wrong is silent: a single-fire test cannot see the double fire,
-- and a single-session test cannot see the lost update.
--
-- Idempotent: safe to run more than once.

create or replace function public.scrub_customer_payment() returns trigger
language plpgsql as $$
declare pay jsonb; prev jsonb; safe jsonb; st text;
begin
  if new.data is null then
    new.data := '{}'::jsonb;
    return new;
  end if;
  if new.data ? 'payment' then
    pay := new.data->'payment';

    /* THE ONLY TRUSTWORTHY PREVIOUS VALUE IS OLD.
       Every client write is INSERT .. ON CONFLICT DO UPDATE, and Postgres
       fires this BEFORE INSERT OR UPDATE trigger TWICE for it: once on the
       proposed tuple — whose output BECOMES EXCLUDED — and once as the
       UPDATE on that already-rewritten tuple.

       So the INSERT pass must not write a value it did not receive. If it
       did, the UPDATE pass could no longer tell "the client sent this" from
       "I injected this a moment ago", and would honour its own injection as
       client intent. That is not merely a shape problem, it is a LOST
       UPDATE: another transaction can commit a real value in between, the
       UPDATE pass then sees a fresh OLD but a stale injected NEW, and the
       injection wins. Looking the row up ourselves on the INSERT pass does
       not help — that read happens before the row lock is taken.

       OLD does not have this problem: on the UPDATE pass Postgres has taken
       the row lock and re-read the current committed tuple, so OLD is the
       real previous value at the moment we overwrite it.

       Hence: key present in NEW == the client genuinely sent it. Key absent
       == take OLD's value, or leave the key out entirely when there is no
       OLD (a genuinely new row from a client too old to know the field —
       readers treat an absent key as "no request on record", which is the
       honest answer). */
    prev := case when TG_OP = 'UPDATE' and old.data ? 'payment'
                 then old.data->'payment' else '{}'::jsonb end;

    -- credential fields are excluded by construction: the object is REBUILT
    -- from named keys, so card/ach/number/exp/routing/account/cvv cannot
    -- survive, now or when someone adds a new one
    safe := jsonb_build_object(
      'method',         coalesce(pay->'method',         '""'::jsonb),
      'last4',          coalesce(pay->'last4',          '""'::jsonb),
      'billingAddress', coalesce(pay->'billingAddress', 'null'::jsonb));

    if pay ? 'autopayRequested' then
      safe := safe || jsonb_build_object(
        'autopayRequested', to_jsonb(pay->>'autopayRequested' = 'true'));
    elsif prev ? 'autopayRequested' then
      safe := safe || jsonb_build_object(
        'autopayRequested', prev->'autopayRequested');
    end if;

    /* status: a client may only ever claim one of two values. Anything else
       — "active", "on_file", null, garbage — is treated as NOT SENT, so a
       broken or hostile client cannot destroy stored state either. Only a
       billing backend writing directly may ever record more than this. */
    if pay ? 'status' and pay->>'status' in ('not_configured', 'pending_setup') then
      st := pay->>'status';
    elsif prev ? 'status' then
      st := prev->>'status';
    else
      st := null;
    end if;
    if st is not null and st not in ('not_configured', 'pending_setup') then
      st := 'not_configured';
    end if;
    if st is not null then
      safe := safe || jsonb_build_object('status', to_jsonb(st));
    end if;

    new.data := jsonb_set(new.data, '{payment}', safe);
  end if;
  return new;
end $$;

-- ------------------------------------------------------------- rollback ---
-- Restoring 0001's version means restoring the `autopay` field; see
-- db/migrations/0001_phase1_foundation.sql for the original function body.
