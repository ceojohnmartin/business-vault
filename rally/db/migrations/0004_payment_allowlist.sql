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
-- cannot erase it by saving the record. This holds for BOTH statement shapes
-- a client can produce — the plain UPDATE of the tombstone path and, more
-- importantly, the INSERT .. ON CONFLICT DO UPDATE that every ordinary sync
-- push uses. See the comment on old_pay below: getting this wrong is silent,
-- and a single-fire test cannot see it.
--
-- Idempotent: safe to run more than once.

create or replace function public.scrub_customer_payment() returns trigger
language plpgsql as $$
declare pay jsonb; old_pay jsonb; st text; req jsonb;
begin
  if new.data is null then
    new.data := '{}'::jsonb;
    return new;
  end if;
  if new.data ? 'payment' then
    pay := new.data->'payment';

    /* WHERE THE PREVIOUS VALUE COMES FROM, and why it is not just OLD.
       Every client writes customers with INSERT .. ON CONFLICT DO UPDATE
       (PostgREST's resolution=merge-duplicates). Postgres fires this trigger
       TWICE for that statement: once as BEFORE INSERT on the proposed tuple,
       and then — because the INSERT pass's output is what becomes EXCLUDED —
       once as BEFORE UPDATE on that already-rewritten tuple. Reading only
       OLD would mean the INSERT pass injects a default that the UPDATE pass
       then mistakes for something the client sent, defeating the whole
       preservation rule. So on the INSERT pass we look the stored row up
       ourselves. Verified against real PostgreSQL, both statement shapes. */
    old_pay := case
      when TG_OP = 'UPDATE' and old.data ? 'payment' then old.data->'payment'
      else coalesce((select c.data->'payment' from public.customers c
                      where c.team_id = new.team_id and c.id = new.id),
                    '{}'::jsonb)
    end;

    /* A CLIENT THAT DOES NOT KNOW A FIELD MUST NOT BE ABLE TO CLEAR IT.
       An older client's payload has no 'autopayRequested' key at all, so
       defaulting a missing key to false would let it silently erase what a
       customer actually asked for every time a rep opened and saved the
       record. Key PRESENCE is the discriminator and it is exact: a current
       client always sends the key (false included, when the rep turns it
       off), and an older one never sends it. Absent -> keep what is stored;
       present -> honour it, including an explicit false. */
    if pay ? 'autopayRequested' then
      req := to_jsonb(pay->>'autopayRequested' = 'true');
    else
      req := coalesce(old_pay->'autopayRequested', 'false'::jsonb);
    end if;

    -- same rule for status, then clamped: a client may only ever claim one
    -- of these two values; anything else (including "active" or "on_file")
    -- is refused and stored as unknown
    if pay ? 'status' then
      st := pay->>'status';
    else
      st := coalesce(old_pay->>'status', 'not_configured');
    end if;
    if st is null or st not in ('not_configured', 'pending_setup') then
      st := 'not_configured';
    end if;

    new.data := jsonb_set(new.data, '{payment}', jsonb_build_object(
      'method',           coalesce(pay->'method',           '""'::jsonb),
      'last4',            coalesce(pay->'last4',            '""'::jsonb),
      'autopayRequested', req,
      'status',           to_jsonb(st),
      'billingAddress',   coalesce(pay->'billingAddress',   'null'::jsonb)));
  end if;
  return new;
end $$;

-- ------------------------------------------------------------- rollback ---
-- Restoring 0001's version means restoring the `autopay` field; see
-- db/migrations/0001_phase1_foundation.sql for the original function body.
