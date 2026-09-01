-- RALLY v39 — the payment allowlist follows the honest record shape.
-- Run once in the Supabase SQL editor, after 0003.
--
-- 0001 already cut every stored customer's payment object down to a safe
-- allowlist at the database door, so no card or bank number can land here
-- whatever a client sends. That stays exactly as it was. What changes is
-- WHICH honest fields survive the cut, and HOW a field survives:
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
--   card.name, ach.name, ach.type      [ADMITTED in this revision]
--       The name on the card, the name on the bank account and whether the
--       account is checking or savings. These are the customer's INTENT,
--       not credentials — none of them can authorise a payment — and the
--       v39 payment screen has always captured them. Until this revision
--       the client kept them on the device and the server dropped them, so
--       they silently vanished on any round trip through another device.
--       They are admitted with the SAME rebuild-from-allowlist discipline
--       as every other field: a name is a bounded string that a real name
--       never fails, and a value carrying four or more digits is not a
--       name, so it is not stored as one.
--
-- The credential fields (number, exp, cvv, cvc, routing, account) are
-- excluded by construction: every object is REBUILT from named leaves, so
-- a key that is not named here cannot survive, now or later. Admitting
-- card and ach as OBJECTS does not admit their credential keys — the
-- rebuild takes `name` and `type` and nothing else.
--
-- MIXED-VERSION AND CONCURRENCY SAFETY: see the three-way rule below. It
-- applies to EVERY field, so no field can be erased by a client too old to
-- know it, and no invalid value can destroy a valid stored one.
-- Getting it wrong is silent: a single-fire test cannot see the double fire,
-- and a single-session test cannot see the lost update.
--
-- Idempotent: safe to run more than once.

-- One place that decides what a stored payment string may be: a real JSON
-- string, truncated. Anything else (number, object, array, null) becomes ''.
create or replace function public.pay_safe_str(v jsonb, maxlen int) returns text
language sql immutable as $$
  select case when jsonb_typeof(v) = 'string' then left(v #>> '{}', maxlen) else '' end
$$;

-- A bounded payment string that also refuses to be a credential by SHAPE.
-- `maxdigits` is the number of digits at which the value stops being what
-- the field claims to be:
--   * address lines legitimately carry digits (house number, unit, zip), so
--     13 — the shortest real card number — is the cut.
--   * a person's NAME carries none, so 4 is the cut, which is below a
--     routing number (9), a bank account (4-17) and a PAN (13-19).
-- A value at or over the cut is dropped, not truncated: half a card number
-- is still card-number-shaped data in a field that should not hold it.
create or replace function public.pay_text_field(v jsonb, maxlen int, maxdigits int)
returns text language sql immutable as $$
  select case
    when length(regexp_replace(public.pay_safe_str(v, maxlen), '[^0-9]', '', 'g')) >= maxdigits
      then ''
    else public.pay_safe_str(v, maxlen)
  end
$$;


/* ---------------------------------------------------------------------
   THE THREE-WAY RULE, stated ONCE, as three pickers.

     sent and VALID    -> store it. An empty string and an explicit false
                          are valid values: a rep clearing a field is real
                          intent and must go through.
     sent but INVALID  -> keep what is stored, and if nothing valid is
                          stored, RETURN NULL so the caller OMITS the key.
                          Never substitute a neutral default: on the INSERT
                          pass that default becomes EXCLUDED, the UPDATE
                          pass then reads it as a valid client value, and
                          the garbage silently destroys the good stored one.
     NOT SENT          -> same as sent-but-invalid: keep stored, or omit.
                          A client too old to know a field cannot erase it
                          by saving the record, and a brand-new row from
                          such a client records nothing rather than
                          inventing a default. Readers treat an absent key
                          as "no request on record", which is the honest
                          answer.

   `stored` is re-validated on the way back out, so a value that predates a
   rule cannot survive by having been written before the rule existed.
   --------------------------------------------------------------------- */

-- bounded text with a digit cut (see pay_text_field)
create or replace function public.pay_pick_text(sent jsonb, stored jsonb,
                                                maxlen int, maxdigits int)
returns jsonb language sql immutable as $$
  select case
    when jsonb_typeof(sent) = 'string'
         and (sent #>> '{}' = '' or public.pay_text_field(sent, maxlen, maxdigits) <> '')
      then to_jsonb(public.pay_text_field(sent, maxlen, maxdigits))
    when jsonb_typeof(stored) = 'string'
         and (stored #>> '{}' = '' or public.pay_text_field(stored, maxlen, maxdigits) <> '')
      then to_jsonb(public.pay_text_field(stored, maxlen, maxdigits))
    else null
  end
$$;

-- a closed set of literal values, and nothing else
create or replace function public.pay_pick_enum(sent jsonb, stored jsonb, allowed text[])
returns jsonb language sql immutable as $$
  select case
    when jsonb_typeof(sent) = 'string' and (sent #>> '{}') = any(allowed) then sent
    when jsonb_typeof(stored) = 'string' and (stored #>> '{}') = any(allowed) then stored
    else null
  end
$$;

/* Text that must match a pattern EXACTLY (last4, zip).
   The whole value is tested, and an over-length value is rejected rather
   than truncated. Truncating first would be a silent forgery: left() over a
   16-digit PAN yields '4111', which matches ^[0-9]{4}$ and would be stored
   and displayed as "card ending 4111" — the FIRST four digits of a card
   number the customer never gave, presented as a payment reference. A value
   that is not the right shape is not a shorter version of the right shape. */
create or replace function public.pay_pick_re(sent jsonb, stored jsonb,
                                              maxlen int, re text)
returns jsonb language sql immutable as $$
  select case
    when jsonb_typeof(sent) = 'string'
         and length(sent #>> '{}') <= maxlen and (sent #>> '{}') ~ re
      then sent
    when jsonb_typeof(stored) = 'string'
         and length(stored #>> '{}') <= maxlen and (stored #>> '{}') ~ re
      then stored
    else null
  end
$$;

-- a real JSON boolean, or whatever boolean is already stored
create or replace function public.pay_pick_bool(sent jsonb, stored jsonb)
returns jsonb language sql immutable as $$
  select case
    when jsonb_typeof(sent) = 'boolean' then sent
    when jsonb_typeof(stored) = 'boolean' then stored
    else null
  end
$$;

-- add a key only when the picker actually chose a value
create or replace function public.pay_put(obj jsonb, k text, v jsonb)
returns jsonb language sql immutable as $$
  select case when v is null then obj else obj || jsonb_build_object(k, v) end
$$;

create or replace function public.scrub_customer_payment() returns trigger
language plpgsql as $$
declare pay jsonb; prev jsonb; safe jsonb; addr jsonb; card jsonb; ach jsonb;
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

       On the INSERT pass prev is empty, so every picker below either takes
       a value the client genuinely sent or returns NULL and the key is left
       out — which is exactly the rule. */
    prev := case when TG_OP = 'UPDATE' and old.data ? 'payment'
                 then old.data->'payment' else '{}'::jsonb end;

    /* SHAPE, NOT JUST KEY NAMES. An allowlist of key names alone would let
       a credential be smuggled through an ALLOWED field — method, last4, a
       name, or a nested address. The object is REBUILT leaf by leaf, each
       leaf with its own type, domain and length enforced, so the only
       values that can be stored are ones structurally incapable of being a
       card or bank number — and a key that is not named below cannot
       survive however deeply it was nested. */
    safe := '{}'::jsonb;

    -- method is an enum; '' means nothing chosen yet
    safe := public.pay_put(safe, 'method',
      public.pay_pick_enum(pay->'method', prev->'method',
                           array['card','ach','']));

    -- last4 is exactly four digits or empty. A full PAN cannot live here.
    safe := public.pay_put(safe, 'last4',
      public.pay_pick_re(pay->'last4', prev->'last4', 4, '^([0-9]{4})?$'));

    -- autopayRequested must be a real JSON boolean. A string "true", a 1,
    -- or anything else is not client intent and is treated as NOT SENT.
    safe := public.pay_put(safe, 'autopayRequested',
      public.pay_pick_bool(pay->'autopayRequested', prev->'autopayRequested'));

    /* status: a client may only ever claim one of two values. Anything
       else — "active", "on_file", a number, garbage — is treated as NOT
       SENT, so a broken or hostile client can neither assert a payment
       method that does not exist nor destroy stored state by trying.
       The STORED value is kept verbatim rather than clamped: this trigger
       is the only door a client write passes through, so the only values a
       client can ever put there are the two safe ones, and anything else
       already present was authored by something with more authority than a
       client (a future billing backend). Clamping it would let a stale
       phone quietly downgrade a real backend fact. */
    if jsonb_typeof(pay->'status') = 'string'
       and pay->>'status' in ('not_configured', 'pending_setup') then
      safe := safe || jsonb_build_object('status', pay->'status');
    elsif jsonb_typeof(prev->'status') = 'string' then
      safe := safe || jsonb_build_object('status', prev->'status');
    end if;

    /* billingAddress: four named leaves, each following the rule on its
       own, so one bad field cannot wipe the other three. Arbitrary nested
       JSON, extra keys and non-string values cannot pass through. */
    addr := '{}'::jsonb;
    addr := public.pay_put(addr, 'street',
      public.pay_pick_text(pay->'billingAddress'->'street',
                           prev->'billingAddress'->'street', 120, 13));
    addr := public.pay_put(addr, 'city',
      public.pay_pick_text(pay->'billingAddress'->'city',
                           prev->'billingAddress'->'city', 80, 13));
    addr := public.pay_put(addr, 'state',
      public.pay_pick_text(pay->'billingAddress'->'state',
                           prev->'billingAddress'->'state', 40, 13));
    -- a zip is a US zip or nothing; never a place to hide an account number
    addr := public.pay_put(addr, 'zip',
      public.pay_pick_re(pay->'billingAddress'->'zip',
                         prev->'billingAddress'->'zip', 10,
                         '^([0-9]{5}(-?[0-9]{4})?)?$'));
    if addr <> '{}'::jsonb then
      safe := safe || jsonb_build_object('billingAddress', addr);
    end if;

    /* card: the NAME ON THE CARD and nothing else. `number`, `exp`, `cvv`
       and every other key are not named here, so the rebuild cannot carry
       them however deeply they are nested. */
    card := public.pay_put('{}'::jsonb, 'name',
      public.pay_pick_text(pay->'card'->'name', prev->'card'->'name', 80, 4));
    if card <> '{}'::jsonb then
      safe := safe || jsonb_build_object('card', card);
    end if;

    /* ach: the NAME ON THE ACCOUNT and whether it is checking or savings.
       `routing` and `account` are not named here and cannot survive. */
    ach := public.pay_put('{}'::jsonb, 'name',
      public.pay_pick_text(pay->'ach'->'name', prev->'ach'->'name', 80, 4));
    ach := public.pay_put(ach, 'type',
      public.pay_pick_enum(pay->'ach'->'type', prev->'ach'->'type',
                           array['checking','savings']));
    if ach <> '{}'::jsonb then
      safe := safe || jsonb_build_object('ach', ach);
    end if;

    new.data := jsonb_set(new.data, '{payment}', safe);
  end if;
  return new;
end $$;

-- The pre-revision helper is superseded by pay_text_field (same rule, with
-- the digit cut as a parameter). Dropped so there is exactly one definition
-- of what a payment text field may contain. `if exists` keeps this file
-- runnable on a database that never saw the earlier revision.
drop function if exists public.pay_addr_field(jsonb, int);

-- ------------------------------------------------------------- rollback ---
-- Restoring 0001's version means restoring the `autopay` field and losing
-- card.name / ach.name / ach.type again; see
-- db/migrations/0001_phase1_foundation.sql for the original function body.
