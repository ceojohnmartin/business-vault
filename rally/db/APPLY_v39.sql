-- RALLY v39 — APPLY 0004, 0003 AND 0005 AS ONE TRANSACTION.
--
-- Paste this WHOLE file into the Supabase SQL editor and run it once, instead
-- of running the three migration files separately. Only after the entire
-- fleet is confirmed on v39.
--
-- Everything here is DDL (create table, create index, create or replace
-- function, drop/create policy, grants), and DDL in PostgreSQL is
-- transactional: if any part raises, the COMMIT never happens and NONE of it
-- becomes live. That removes the half-migrated production state where, say,
-- the payment allowlist is active and the territory policies are not, or the
-- Smart Split function exists without the table it writes.
--
-- Order inside the transaction, and why:
--   0004  what v39 needs in order to record a customer's autopay request and
--         keep the safe payment metadata the payment screen captures.
--   0003  the one that starts REFUSING writes — territories become
--         leadership-only. It goes after 0004 so the fleet is already able
--         to record honestly before anything starts being refused.
--   0005  atomic Smart Split. It depends on 0003's intent (a rep may not
--         write territories) being the established rule: the function is
--         the ONE sanctioned way past that rule, and it should not exist
--         for even a moment before the rule does.
--   0006  rebuild every stored payment object under 0004's rule. Last,
--         because it needs 0004's trigger to be the one that fires.
--
-- The four bodies below are the VERBATIM contents of
--   db/migrations/0004_payment_allowlist.sql
--   db/migrations/0003_territory_authorization.sql
--   db/migrations/0005_smart_split.sql
--   db/migrations/0006_payment_rebuild.sql
-- (regenerate with db/build-apply.sh if any of them changes.)
--
-- If it errors: nothing changed. Read the message, fix, run it again.
-- Then verify with db/test/verify-production.sql — behaviour, not diagnostics.

begin;

-- ============================ 0004_payment_allowlist.sql ============================
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
-- THE WHOLE OBJECT FOLLOWS THE SAME RULE. A client upsert is
--   INSERT .. ON CONFLICT DO UPDATE SET data = EXCLUDED.data
-- so the ENTIRE data column is replaced by what the client sent. A payload
-- with no `payment` key at all — which is exactly what the client sends when
-- it cannot vouch for the shape and fails closed — used to sail past the
-- `if new.data ? 'payment'` guard and land as-is, ERASING the safe payment
-- object the row already held. The field-level rule never ran, because there
-- was no object to run it on. Now "no payment sent" means "keep the stored
-- payment", exactly as "no field sent" means "keep the stored field", and it
-- is done on the UPDATE pass from OLD so the INSERT-pass injection race is
-- not reintroduced. A tombstone is the one exception: a deleted customer's
-- row keeps the id, not the person, so nothing is carried into it.
-- (db/test/rls-test.sql §18, db/test/race-test.sh, and the negative control
-- in db/test/payment-absent-test.sh, which proves the OLD body fails.)
--
-- WHAT AN ADVERSARIAL PASS THEN FOUND, AND WHAT CHANGED (rls-test.sql §19):
--   * a payment key holding a STRING, NUMBER or ARRAY landed verbatim on a
--     row with no held payment — a bare PAN, or an array of credential
--     objects. A non-object payment value now contributes nothing and is
--     never stored.
--   * PATCH {"data": null} hit an early return before preservation ran and
--     erased a held payment. A null data column is now {} and falls through.
--   * a tombstone that SENT a payment object pulled the whole stored payment
--     onto the deleted row, and a deleted_at-only PATCH kept it. Any write
--     with deleted_at set now leaves NO payment key, whatever was sent.
--   * the digit cut counted ASCII digits only, so a PAN in fullwidth,
--     Arabic-Indic or mathematical digits passed as a "name". Every Unicode
--     decimal digit counts now, and the count is taken before truncation.
--   * an empty payment object was stored and then carried forward forever.
--     Nothing valid to store now means NO payment key.
--   * a data column that is not a JSON object is refused (22023).
-- A SECOND ROUND against that body found three more (rls-test.sql §20):
--   * the digit class had twelve Unicode digit blocks typed by hand; there
--     are sixty-six. It is generated from the Unicode database now.
--   * a card number split across street and city, or a routing number in
--     one address leaf and an account number in the next, passed each
--     leaf's own cut. The three text leaves are also judged together.
--   * ZIP+4 accepted nine bare digits, which is a routing number's shape.
--     The hyphen is required.
--   * and a status a client could never have written is no longer
--     overwritable by a client sending a value it could.
--   * the address budget first judged only the INCOMING leaves, so the two
--     halves of a card number could arrive in two writes. It judges the
--     RESULT now — sent merged with stored — and a stored address that is
--     itself a credential does not survive by being stored.
-- A THIRD ROUND (cut short by a usage limit; four of five attackers
-- finished, their claims verified by hand) added (rls-test.sql §21):
--   * a NAME carries no digits at all. A cut of four let a three-digit CVV
--     and a three-or-four-digit expiry sit inside "name on card".
--   * the digit class is pinned to a Unicode VERSION and will always lag
--     the next one: Unicode 16's six new digit blocks counted as zero. They
--     are in now, along with the digit-LIKE forms people write digits in
--     (superscript, subscript, circled, parenthesized, dingbat, Roman).
--     The class needs revisiting at each Unicode release.
--   * rows written under 0001 held last4 and billingAddress VERBATIM, so a
--     card number sent then sat there until the row was next written.
--     0006 passes every row through this trigger once.
-- WHAT IS LEFT, BY DESIGN: a twelve-digit "street" plus a four-digit last4
-- in one write is a card number, and it is also the exact shape of a long
-- real address beside a real last4. No count can tell them apart without
-- refusing real records, and this file is shape enforcement on payment
-- fields, not a scanner. That case is the rep operating rule's to cover.
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
--   * a person's NAME carries none, so ONE digit is the cut: a CVV is
--     exactly three digits and an expiry three or four, and a cut of four
--     let both sit inside a "name".
-- A value at or over the cut is dropped, not truncated: half a card number
-- is still card-number-shaped data in a field that should not hold it.
-- A "digit" is ANY Unicode decimal digit (general category Nd), not just
-- ASCII: a PAN written in Khmer, Myanmar, Adlam or mathematical digits is
-- still a card number. The class below is every Nd range in Unicode 15,
-- generated from the Unicode database rather than typed from memory — the
-- first version listed twelve blocks by hand and an adversarial pass found
-- fifty-four it had missed. The count is taken on the RAW value before the
-- length cut, so truncation cannot hide the tail of one.
-- (tests/lib/scrub-trigger.js carries the identical generated class.)
create or replace function public.pay_digit_count(v text) returns int
language sql immutable as $$
  select length(regexp_replace(coalesce(v, ''),
    '[^\u0030-\u0039\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\u0DE6-\u0DEF\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F29\u1040-\u1049\u1090-\u1099\u17E0-\u17E9\u1810-\u1819\u1946-\u194F\u19D0-\u19D9\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\uA620-\uA629\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uA9F0-\uA9F9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19\U000104A0-\U000104A9\U00010D30-\U00010D39\U00011066-\U0001106F\U000110F0-\U000110F9\U00011136-\U0001113F\U000111D0-\U000111D9\U000112F0-\U000112F9\U00011450-\U00011459\U000114D0-\U000114D9\U00011650-\U00011659\U000116C0-\U000116C9\U00011730-\U00011739\U000118E0-\U000118E9\U00011950-\U00011959\U00011C50-\U00011C59\U00011D50-\U00011D59\U00011DA0-\U00011DA9\U00016A60-\U00016A69\U00016AC0-\U00016AC9\U00016B50-\U00016B59\U0001D7CE-\U0001D7FF\U0001E140-\U0001E149\U0001E2F0-\U0001E2F9\U0001E950-\U0001E959\U0001FBF0-\U0001FBF9\U00011F50-\U00011F59\U0001E4F0-\U0001E4F9\U00010D40-\U00010D49\U00011BF0-\U00011BF9\U00016130-\U00016139\U00016D70-\U00016D79\U0001CCF0-\U0001CCF9\U0001E5F1-\U0001E5FA\u00B2\u00B3\u00B9\u2070\u2074-\u2079\u2080-\u2089\u2460-\u2468\u24EA\u24F5-\u24FD\u24FF\u2474-\u247C\u2488-\u2490\u2776-\u277E\u2780-\u2788\u278A-\u2792\u2160-\u217F]', '', 'g'))
$$;

create or replace function public.pay_text_field(v jsonb, maxlen int, maxdigits int)
returns text language sql immutable as $$
  select case
    when jsonb_typeof(v) <> 'string' then ''
    when public.pay_digit_count(v #>> '{}') >= maxdigits then ''
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

-- The pre-revision helper is superseded by pay_text_field (same rule, with
-- the digit cut as a parameter). Dropped so there is exactly one definition
-- of what a payment text field may contain. `if exists` keeps this file
-- runnable on a database that never saw the earlier revision.
drop function if exists public.pay_addr_field(jsonb, int);

-- ------------------------------------------------------------- rollback ---
-- Restoring 0001's version means restoring the `autopay` field and losing
-- card.name / ach.name / ach.type again; see
-- db/migrations/0001_phase1_foundation.sql for the original function body.

-- ============================ 0003_territory_authorization.sql ============================
-- RALLY v39 — territory writes are a LEADERSHIP operation, enforced by the
-- server. Run once in the Supabase SQL editor, after 0002.
--
-- Why this exists: 0001 gave every data table the same write policy shape —
-- "your team, and you're active" — with no role predicate. That made
-- territory creation, renaming, re-polygoning, assignment, Smart Split and
-- tombstoning reachable by ANY active team member holding a valid JWT.
-- The client only ever hid the buttons, which is not authorization.
--
-- The capability set matches the one already used by loc_read_leadership in
-- 0001: leader / manager / owner may write territories, rep may not. Pins,
-- customers and events stay writable by reps — that is the whole job.
--
-- Nothing else changes: no new tables, no new helpers, no role renaming, no
-- tenancy redesign. my_role() is the same SECURITY DEFINER helper 0001
-- created; it reads the caller's own profile row, never anything the client
-- claims.
--
-- Idempotent: safe to run more than once.

-- ------------------------------------------------- territories: insert ---
-- covers creation and every child polygon a Smart Split produces
drop policy if exists territories_insert on public.territories;
create policy territories_insert on public.territories for insert to authenticated
  with check (team_id = public.my_team_id()
              and public.is_active()
              and public.my_role() in ('leader','manager','owner')
              and (created_by is null or created_by = auth.uid()));

-- ------------------------------------------------- territories: update ---
-- covers rename, re-polygon, homes, archive, assignment (assignedTo and the
-- assignments[] history both live in data), and the deleted_at tombstone —
-- there is no DELETE grant anywhere, so tombstoning IS an update.
drop policy if exists territories_update on public.territories;
create policy territories_update on public.territories for update to authenticated
  using (team_id = public.my_team_id()
         and public.is_active()
         and public.my_role() in ('leader','manager','owner'))
  with check (team_id = public.my_team_id()
              and public.is_active()
              and public.my_role() in ('leader','manager','owner'));

-- ------------------------------------------------------------- rollback ---
-- To restore the 0001 behaviour exactly (territory writes open to any active
-- team member), run:
--
--   drop policy if exists territories_insert on public.territories;
--   create policy territories_insert on public.territories for insert to authenticated
--     with check (team_id = public.my_team_id() and public.is_active()
--                 and (created_by is null or created_by = auth.uid()));
--
--   drop policy if exists territories_update on public.territories;
--   create policy territories_update on public.territories for update to authenticated
--     using (team_id = public.my_team_id() and public.is_active())
--     with check (team_id = public.my_team_id() and public.is_active());

-- ============================ 0005_smart_split.sql ============================
-- RALLY v39 — Smart Split becomes ONE server fact.
-- Run once in the Supabase SQL editor, after 0004.
--
-- THE PROBLEM THIS FIXES
-- Smart Split replaces one territory with N weight-balanced children. The
-- client used to do that with N+1 independent writes: N child upserts and
-- one parent tombstone. Every one of them can fail on its own, so the
-- reachable states included "children exist and the parent is still live"
-- (the hood is now covered twice) and "the parent is gone and only some
-- children exist" (a hole in the coverage map with no record of what was
-- meant to be there). Neither is a state any code path intended, and
-- neither announces itself.
--
-- A split is one decision, so it is one transaction. The client still
-- calculates the geometry — that stays exactly as it was, weighting and
-- all — but the COMMIT is a single call that either happens completely or
-- does not happen at all.
--
-- DELIBERATELY NARROW. This is a function for Smart Split, not a generic
-- command framework, not a step toward RALLY OS, and not a place to put
-- future privileged operations. It does one thing.
--
-- Idempotent: safe to run more than once.

-- ================================================= the operation record ===
-- One row per Smart Split that actually committed. Its only jobs are to
-- make a retry of the SAME operation a no-op, and to let a client that lost
-- the response find out what happened.
--
-- No client may write it: the SECURITY DEFINER function below is the only
-- thing that inserts here, and there is no insert/update/delete grant. A
-- client may READ its own team's rows, which is how a device that crashed
-- mid-request learns the outcome.
create table if not exists public.territory_splits (
  team_id      uuid not null references public.teams(id),
  operation_id text not null,
  parent_id    text not null,
  child_ids    jsonb not null default '[]'::jsonb,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  primary key (team_id, operation_id)
);

-- A parent may be split ONCE. This is the concurrency guarantee that does
-- not depend on anyone remembering to take a lock: even if two managers
-- reach the insert simultaneously with different operation ids, the second
-- one violates this index and its whole transaction rolls back.
create unique index if not exists territory_splits_parent_once
  on public.territory_splits (team_id, parent_id);

alter table public.territory_splits enable row level security;

revoke all on public.territory_splits from anon, authenticated;
grant select on public.territory_splits to authenticated;

drop policy if exists territory_splits_select on public.territory_splits;
create policy territory_splits_select on public.territory_splits
  for select to authenticated
  using (team_id = public.my_team_id() and public.is_active());

-- ======================================================== the operation ===
-- smart_split_territory(parent, operation_id, children) -> jsonb
--
--   children: [ { "id": text, "name": text, "polygon": [[lng,lat],...],
--                 "homes": int|null, "data": {...} }, ... ]
--
-- Returns { status, operation_id, parent_id, child_ids }
--   status 'committed'         this call performed the split
--   status 'already_committed' this operation had already been performed;
--                              nothing new was created
--
-- Every refusal raises, so PostgREST answers with a real error status and a
-- client can never mistake one for success.
create or replace function public.smart_split_territory(
  p_parent_id    text,
  p_operation_id text,
  p_children     jsonb
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid      uuid;
  v_team     uuid;
  v_role     text;
  v_disabled boolean;
  v_prior    public.territory_splits%rowtype;
  v_parent   public.territories%rowtype;
  v_child    jsonb;
  v_id       text;
  v_ids      text[] := '{}';
  v_n        int;
begin
  -- 1. IDENTITY IS DERIVED, NEVER ACCEPTED. There is no caller-supplied
  --    user, team or role parameter, so there is nothing to forge.
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'smart split: not authenticated' using errcode = '42501';
  end if;

  -- 2. TEAM AND ROLE COME FROM THE SERVER'S PROFILE ROW
  select team_id, role, disabled
    into v_team, v_role, v_disabled
    from public.profiles where id = v_uid;
  if not found or v_team is null then
    raise exception 'smart split: no team' using errcode = '42501';
  end if;

  /* 3. IDEMPOTENCY, BEFORE the capability checks and scoped to this team.
        A retry of an operation that already committed is a READ of a
        server fact, not a new write, so it is answered even if the caller
        has since been demoted — refusing it would make a client roll back
        state the server actually holds, which is worse than the demotion
        it is trying to honour. A split that has NOT committed has no row
        here, so the offline-manager-then-demoted case still falls through
        to the refusal below, which is the case that matters. */
  select * into v_prior from public.territory_splits
   where team_id = v_team and operation_id = p_operation_id;
  if found then
    if v_prior.parent_id <> p_parent_id then
      raise exception 'smart split: operation % already used for a different parent',
        p_operation_id using errcode = '22023';
    end if;
    return jsonb_build_object(
      'status', 'already_committed', 'operation_id', p_operation_id,
      'parent_id', v_prior.parent_id, 'child_ids', v_prior.child_ids);
  end if;

  -- 4. A DISABLED USER IS NOT A USER
  if v_disabled then
    raise exception 'smart split: user is disabled' using errcode = '42501';
  end if;

  -- 5. LEADERSHIP ONLY — a rep is refused here, not in the UI.
  --    Matches db/capability-matrix.json / the 0003 territory policies.
  if v_role not in ('leader', 'manager', 'owner') then
    raise exception 'smart split: requires leader, manager or owner (role %)',
      v_role using errcode = '42501';
  end if;

  /* 6/7. THE PARENT, UNDER A ROW LOCK.
          FOR UPDATE serialises two managers splitting the same hood: the
          second call blocks here until the first commits, then re-reads the
          committed row and sees the tombstone, so it takes the
          'already split' exit below rather than adding a second set of
          children beside the first. Scoping by team_id is what stops a
          cross-team parent from being touched at all — the row simply is
          not found. */
  select * into v_parent from public.territories
   where team_id = v_team and id = p_parent_id
   for update;
  if not found then
    raise exception 'smart split: parent % not found for this team', p_parent_id
      using errcode = '42501';
  end if;

  /* IDEMPOTENCY AGAIN, NOW THAT WE ARE SERIALISED.
     The check above ran before the lock, so a device retrying while its own
     first request was still in flight saw nothing and would fall through to
     'already deleted or split' — telling it the operation FAILED when its
     own earlier call had just committed it, and making it roll back a
     server fact. Holding the row lock means any competing transaction for
     this parent has finished, so this read sees the truth. */
  select * into v_prior from public.territory_splits
   where team_id = v_team and operation_id = p_operation_id;
  if found then
    return jsonb_build_object(
      'status', 'already_committed', 'operation_id', p_operation_id,
      'parent_id', v_prior.parent_id, 'child_ids', v_prior.child_ids);
  end if;

  if v_parent.deleted_at is not null then
    raise exception 'smart split: parent % is already deleted or split', p_parent_id
      using errcode = '55000';
  end if;

  -- 8. THE CHILDREN MUST BE A REAL SPLIT
  if jsonb_typeof(p_children) <> 'array' then
    raise exception 'smart split: children must be an array' using errcode = '22023';
  end if;
  v_n := jsonb_array_length(p_children);
  if v_n < 2 or v_n > 8 then
    raise exception 'smart split: a split makes between 2 and 8 children, got %', v_n
      using errcode = '22023';
  end if;

  for v_child in select * from jsonb_array_elements(p_children) loop
    v_id := v_child->>'id';
    if v_id is null or length(v_id) = 0 or length(v_id) > 64 then
      raise exception 'smart split: every child needs an id' using errcode = '22023';
    end if;
    if v_id = p_parent_id then
      raise exception 'smart split: a child may not reuse the parent id'
        using errcode = '22023';
    end if;
    if v_id = any(v_ids) then
      raise exception 'smart split: duplicate child id %', v_id using errcode = '22023';
    end if;
    -- a polygon is a closed-enough ring of [lng,lat] pairs, not free JSON
    if jsonb_typeof(v_child->'polygon') <> 'array'
       or jsonb_array_length(v_child->'polygon') < 3 then
      raise exception 'smart split: child % has no usable polygon', v_id
        using errcode = '22023';
    end if;
    if exists (
      select 1 from jsonb_array_elements(v_child->'polygon') pt
       where jsonb_typeof(pt) <> 'array' or jsonb_array_length(pt) <> 2
          or jsonb_typeof(pt->0) <> 'number' or jsonb_typeof(pt->1) <> 'number'
          or (pt->>0)::numeric not between -180 and 180
          or (pt->>1)::numeric not between  -90 and  90
    ) then
      raise exception 'smart split: child % has a malformed polygon point', v_id
        using errcode = '22023';
    end if;
    -- an id that already belongs to a live territory is not a new child
    if exists (select 1 from public.territories
                where team_id = v_team and id = v_id and deleted_at is null) then
      raise exception 'smart split: child id % already exists', v_id
        using errcode = '23505';
    end if;
    v_ids := v_ids || v_id;
  end loop;

  /* 9. CLAIM THE OPERATION FIRST. If a concurrent transaction already
        claimed this parent (unique index) or this operation id (primary
        key), this INSERT fails and everything below is never reached —
        and everything above it in this transaction is rolled back with it.
        There is no window in which children exist without the claim. */
  insert into public.territory_splits (team_id, operation_id, parent_id, child_ids, created_by)
  values (v_team, p_operation_id, p_parent_id, to_jsonb(v_ids), v_uid);

  -- 10. THE CHILDREN
  for v_child in select * from jsonb_array_elements(p_children) loop
    insert into public.territories (team_id, id, name, polygon, homes, data, created_by)
    values (v_team, v_child->>'id',
            coalesce(v_child->>'name', ''),
            coalesce(v_child->'polygon', '[]'::jsonb),
            case when jsonb_typeof(v_child->'homes') = 'number'
                 then (v_child->>'homes')::int else null end,
            case when jsonb_typeof(v_child->'data') = 'object'
                 then v_child->'data' else '{}'::jsonb end,
            v_uid);
  end loop;

  -- 11. AND THE PARENT IS RETIRED, in the same transaction as its children.
  --     Its knock history lives on the doors, which fall inside whichever
  --     child now contains them.
  update public.territories
     set deleted_at = now()
   where team_id = v_team and id = p_parent_id;

  -- 12. THE AUTHORITATIVE RESULT
  return jsonb_build_object(
    'status', 'committed', 'operation_id', p_operation_id,
    'parent_id', p_parent_id, 'child_ids', to_jsonb(v_ids));
end $$;

-- PostgREST exposes this as POST /rest/v1/rpc/smart_split_territory.
-- SECURITY DEFINER is what lets it write territories while the caller's own
-- 0003 policies would not — which is precisely why every check above is
-- inside it, and why it takes no identity parameter.
revoke all on function public.smart_split_territory(text, text, jsonb) from public, anon;
grant execute on function public.smart_split_territory(text, text, jsonb) to authenticated;

-- ------------------------------------------------------------- rollback ---
-- drop function if exists public.smart_split_territory(text, text, jsonb);
-- drop table if exists public.territory_splits;
-- Smart Split then has no server-side commit path at all; the client must
-- be rolled back to a build that does not call it.

-- ============================ 0006_payment_rebuild.sql ============================
-- RALLY v39 — rebuild every stored payment object under the current rule.
-- Run once in the Supabase SQL editor, after 0004 (APPLY_v39.sql runs it
-- last, inside the same transaction).
--
-- 0004 decides what a payment object may hold at the moment a row is
-- WRITTEN. Rows written under 0001 were filtered by key name only: last4
-- and billingAddress were stored verbatim, so a client that sent a full
-- card number as last4, or a credential inside billingAddress, had it
-- stored, and it sits there until the row is next written by anyone. The
-- invariant is about what the table HOLDS, not only what it will accept
-- from now on — so every row is passed through the trigger once, here.
--
-- `set data = data` changes nothing itself; it exists to fire the BEFORE
-- UPDATE trigger, which rebuilds the payment object from the allowlist
-- (nothing sent, so every leaf is re-validated from what is stored) and
-- strips payment from tombstones. Idempotent: a second run rebuilds the
-- same objects to the same values.
update public.customers set data = data;

commit;
