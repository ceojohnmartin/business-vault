-- RALLY 0007 — last4 IS FOUR DIGITS OR ABSENT, and the table is rebuilt once more.
-- Run once in the Supabase SQL editor, AFTER APPLY_v39.sql (0004/0003/0005/0006)
-- has been applied — or paste db/APPLY_v39_1.sql, which wraps this file in one
-- transaction.
--
-- FOUND IN PRODUCTION by test/verify-production.sql probe 12, minutes after
-- APPLY_v39.sql committed: one customer row held  "last4": ""  and probe 12
-- ("every stored last4 matches ^[0-9]{4}$ or the key is absent") called it a
-- violation. Reproduced on real PostgreSQL from the committed files:
--
--   * 0004's rule for last4 was  '^([0-9]{4})?$'  — four digits OR EMPTY. The
--     comment beside it said "exactly four digits or empty" on purpose: an
--     empty string was "a rep clearing the field".
--   * the client's wire copy (js/sync.js) sends  last4: ""  for every customer
--     that has no legacy last4, and a v37 client stored "" the same way. So
--     "" reached the table through the INSERT path, the UPDATE path and the
--     upsert path alike — proven, all three.
--   * 0006 ( update public.customers set data = data ) passed that v37-era
--     row through 0004's trigger: it dropped the legacy `autopay`, kept the
--     "", and stamped updated_at (customers_touch) — which is exactly the
--     updated_at production shows on the row, at the APPLY minute.
--
-- The migration and the verification disagreed. The verification is right:
-- an empty last4 is not a payment reference. The invariant is now stated
-- once and enforced everywhere:
--
--   exactly four ASCII digits      -> may be stored
--   anything else                  -> the key is NOT stored: "", whitespace,
--                                     1–3 or 5+ digits, non-ASCII digits, a
--                                     stray space, null, a number, an object
--
-- and "anything else" is NOT SENT under the whole-object rule: a valid held
-- last4 stands; with nothing valid held, the key is absent. There is no
-- "clear" through last4 — v39 has no last4 input, so no client can intend
-- one, and a clear would have to survive the INSERT pass of an upsert as ""
-- to reach the UPDATE pass, i.e. be stored as the very value ruled out.
--
-- WHAT CHANGES: one regex in scrub_customer_payment(). The function body
-- below is 0004's, verbatim, with that one rule changed (test/last4-strict-
-- test.sh diffs the two and fails if anything else differs). Then the same
-- one-statement rebuild as 0006, so what the table HOLDS obeys the rule and
-- not only what it will accept from now on. Same measured side effects as
-- 0006: updated_at = now() on every customer row (one pull wave per device),
-- one doorbell per team; nothing else in `data` changes.
--
-- Idempotent: safe to run more than once. Nothing here is a schema change.

create or replace function public.scrub_customer_payment() returns trigger
language plpgsql as $$
declare pay jsonb; prev jsonb; safe jsonb; addr jsonb; card jsonb; ach jsonb;
        keyed boolean; sent boolean; held boolean; declare_addr_budget int;
begin
  /* A null data column is an empty record — and NOT an early exit. Returning
     here used to skip the whole-object rule, so a PATCH of {"data": null}
     erased a held payment object on a live row. */
  if new.data is null then
    new.data := '{}'::jsonb;
  end if;
  /* data is a document. A scalar or an array where the document belongs is
     not a record with an odd payment field, it is a malformed write, and it
     is refused rather than stored for every reader to choke on. */
  if jsonb_typeof(new.data) <> 'object' then
    raise exception 'customers.data must be a JSON object, got %', jsonb_typeof(new.data)
      using errcode = '22023';
  end if;

  /* A TOMBSTONE CARRIES NOTHING. A deleted customer's row keeps the id and
     loses the person, payment metadata included — whatever the client sent
     alongside deleted_at, and whatever the row held. Decided here, before
     any preservation logic, so no fallback below can put it back; and it
     holds for the deleted_at-only PATCH too, where data is untouched. */
  if new.deleted_at is not null then
    new.data := new.data - 'payment';
    return new;
  end if;

  /* WHOLE-OBJECT RULE.
       keyed = the client wrote SOMETHING under the payment key.
       sent  = …and it is an OBJECT. A key holding null, a string, a number
               or an array is not a payment object: it contributes nothing,
               and it is never stored — a card number is not less of a card
               number for arriving as a bare string.
       held  = the row already holds a payment object. Only OLD can say so,
               and OLD exists only on the UPDATE pass — the pass that runs
               under the row lock, after any concurrent commit. The INSERT
               pass of an upsert has no OLD, injects nothing, and so cannot
               poison EXCLUDED. */
  keyed := new.data ? 'payment';
  sent  := jsonb_typeof(new.data->'payment') = 'object';
  held  := TG_OP = 'UPDATE' and jsonb_typeof(old.data->'payment') = 'object';

  if keyed or held then
    pay := case when sent then new.data->'payment' else '{}'::jsonb end;

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
    prev := case when held then old.data->'payment' else '{}'::jsonb end;

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

    /* last4 is EXACTLY FOUR ASCII DIGITS, or the key is absent (0007).
       0004 also accepted '' as "cleared", and that was the one disagreement
       between the trigger and verify-production probe 12: the client's wire
       copy sends last4 '' for every customer without a legacy last4, so ''
       reached the table (and 0006 rebuilt a v37-era row and kept it). An
       empty string is not a payment reference and is never stored. It is
       treated as NOT SENT — a valid held last4 stands — rather than as a
       clear, because v39 has no last4 input (a client can never intend a
       clear) and because a clear would have to survive the INSERT pass of
       an upsert as '' to reach the UPDATE pass: the very state ruled out.
       [0-9] is a code-point range, so non-ASCII digits do not match. */
    safe := public.pay_put(safe, 'last4',
      public.pay_pick_re(pay->'last4', prev->'last4', 4, '^[0-9]{4}$'));

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
    if jsonb_typeof(prev->'status') = 'string'
       and prev->>'status' not in ('not_configured', 'pending_setup') then
      -- authored by something with more authority than a client: a client
      -- cannot downgrade it, not even by sending a valid client value
      safe := safe || jsonb_build_object('status', prev->'status');
    elsif jsonb_typeof(pay->'status') = 'string'
       and pay->>'status' in ('not_configured', 'pending_setup') then
      safe := safe || jsonb_build_object('status', pay->'status');
    elsif jsonb_typeof(prev->'status') = 'string' then
      safe := safe || jsonb_build_object('status', prev->'status');
    end if;

    /* billingAddress: four named leaves, each following the rule on its
       own, so one bad field cannot wipe the other three. Arbitrary nested
       JSON, extra keys and non-string values cannot pass through. */
    /* The three text leaves are also judged TOGETHER, on the RESULT.
       A per-leaf cut cannot see a card number split "4111 1111" / "1111
       1111" across street and city, or a routing number in one leaf and an
       account number in the next: each half is under its own cut. And a
       budget over the INCOMING leaves alone cannot see the same halves
       arriving in two separate writes. So the candidate address — what
       this write would leave stored, sent merged with stored — is what is
       judged. An address never carries thirteen digits across street, city
       and state; when the candidate would, the incoming leaves are treated
       as NOT SENT and the stored ones stand, and if the stored ones alone
       already carry thirteen, they are dropped too. A state carries no
       digits at all; five is the allowance, in case a zip lands in the
       wrong box. */
    addr := '{}'::jsonb;
    addr := public.pay_put(addr, 'street',
      public.pay_pick_text(pay->'billingAddress'->'street',
                           prev->'billingAddress'->'street', 120, 13));
    addr := public.pay_put(addr, 'city',
      public.pay_pick_text(pay->'billingAddress'->'city',
                           prev->'billingAddress'->'city', 80, 13));
    addr := public.pay_put(addr, 'state',
      public.pay_pick_text(pay->'billingAddress'->'state',
                           prev->'billingAddress'->'state', 40, 5));
    declare_addr_budget := public.pay_digit_count(addr->>'street')
                         + public.pay_digit_count(addr->>'city')
                         + public.pay_digit_count(addr->>'state');
    if declare_addr_budget >= 13 then
      -- the result would be a credential: refuse this write's contribution
      addr := '{}'::jsonb;
      addr := public.pay_put(addr, 'street',
        public.pay_pick_text('null'::jsonb, prev->'billingAddress'->'street', 120, 13));
      addr := public.pay_put(addr, 'city',
        public.pay_pick_text('null'::jsonb, prev->'billingAddress'->'city', 80, 13));
      addr := public.pay_put(addr, 'state',
        public.pay_pick_text('null'::jsonb, prev->'billingAddress'->'state', 40, 5));
      declare_addr_budget := public.pay_digit_count(addr->>'street')
                           + public.pay_digit_count(addr->>'city')
                           + public.pay_digit_count(addr->>'state');
      if declare_addr_budget >= 13 then
        -- what is stored is itself a credential (planted, or predating
        -- the rule): it does not get to survive by being stored
        addr := '{}'::jsonb;
      end if;
    end if;
    -- a zip is a US zip or nothing. ZIP+4 REQUIRES its hyphen: nine bare
    -- digits is the shape of a routing number, not of a zip.
    addr := public.pay_put(addr, 'zip',
      public.pay_pick_re(pay->'billingAddress'->'zip',
                         prev->'billingAddress'->'zip', 10,
                         '^([0-9]{5}(-[0-9]{4})?)?$'));
    if addr <> '{}'::jsonb then
      safe := safe || jsonb_build_object('billingAddress', addr);
    end if;

    /* card: the NAME ON THE CARD and nothing else. `number`, `exp`, `cvv`
       and every other key are not named here, so the rebuild cannot carry
       them however deeply they are nested. */
    card := public.pay_put('{}'::jsonb, 'name',
      public.pay_pick_text(pay->'card'->'name', prev->'card'->'name', 80, 1));
    if card <> '{}'::jsonb then
      safe := safe || jsonb_build_object('card', card);
    end if;

    /* ach: the NAME ON THE ACCOUNT and whether it is checking or savings.
       `routing` and `account` are not named here and cannot survive. */
    ach := public.pay_put('{}'::jsonb, 'name',
      public.pay_pick_text(pay->'ach'->'name', prev->'ach'->'name', 80, 1));
    ach := public.pay_put(ach, 'type',
      public.pay_pick_enum(pay->'ach'->'type', prev->'ach'->'type',
                           array['checking','savings']));
    if ach <> '{}'::jsonb then
      safe := safe || jsonb_build_object('ach', ach);
    end if;

    /* Nothing valid to store is NO payment, not an empty one. Writing {}
       would manufacture a payment object on a row that never had one, and
       an empty object, once stored, is "held" and rides along forever. */
    if safe = '{}'::jsonb then
      new.data := new.data - 'payment';
    else
      new.data := jsonb_set(new.data, '{payment}', safe);
    end if;
  end if;
  return new;
end $$;

-- ------------------------------------------------------------- rebuild ---
-- Every already-stored row through the trigger once more (as 0006 did):
-- the re-validation of `stored` drops an empty last4 wherever one sits,
-- and leaves every other leaf exactly as it was.
update public.customers set data = data;
