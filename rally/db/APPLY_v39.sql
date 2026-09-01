-- RALLY v39 — APPLY 0004 AND 0003 AS ONE TRANSACTION.
--
-- Paste this WHOLE file into the Supabase SQL editor and run it once, instead
-- of running the two migration files separately. Only after the entire fleet
-- is confirmed on v39.
--
-- Both migrations are pure DDL (create or replace function, drop/create
-- policy), and DDL in PostgreSQL is transactional: if either half raises, the
-- COMMIT never happens and NEITHER becomes live. That removes the
-- half-migrated production state where the payment allowlist is active and
-- the territory policies are not.
--
-- Order inside the transaction is 0004 then 0003, matching the deployment
-- reasoning: 0004 is what v39 needs in order to record a customer's autopay
-- request; 0003 is the one that starts refusing writes.
--
-- The two bodies below are the VERBATIM contents of
--   db/migrations/0004_payment_allowlist.sql
--   db/migrations/0003_territory_authorization.sql
-- (regenerate with db/build-apply.sh if either changes.)
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

-- One place that decides what a stored payment string may be: a real JSON
-- string, truncated. Anything else (number, object, array, null) becomes ''.
create or replace function public.pay_safe_str(v jsonb, maxlen int) returns text
language sql immutable as $$
  select case when jsonb_typeof(v) = 'string' then left(v #>> '{}', maxlen) else '' end
$$;

-- An address field never legitimately contains a long run of digits. A PAN or
-- a bank account typed into "street" is not an address, so it is dropped
-- rather than stored. This is shape enforcement on PAYMENT-SHAPED storage; it
-- is not a general content scanner over the app's free text.
create or replace function public.pay_addr_field(v jsonb, maxlen int) returns text
language sql immutable as $$
  select case
    when length(regexp_replace(public.pay_safe_str(v, maxlen), '[^0-9]', '', 'g')) >= 13
      then ''
    else public.pay_safe_str(v, maxlen)
  end
$$;

create or replace function public.scrub_customer_payment() returns trigger
language plpgsql as $$
declare pay jsonb; prev jsonb; safe jsonb; addr jsonb; st text; zip text;
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

    /* SHAPE, NOT JUST KEY NAMES. An allowlist of key names alone would let a
       credential be smuggled through an ALLOWED field — method, last4, or a
       nested billingAddress. Every field below is rebuilt with its own type,
       domain and length enforced, so the only values that can be stored are
       ones that are structurally incapable of being a card or bank number. */

    -- method is an enum, not free text
    safe := jsonb_build_object('method',
      case when jsonb_typeof(pay->'method') = 'string' and pay->>'method' in ('card','ach')
           then pay->>'method' else '' end);

    -- last4 is exactly four digits or empty. A full PAN cannot live here.
    safe := safe || jsonb_build_object('last4',
      case when jsonb_typeof(pay->'last4') = 'string' and pay->>'last4' ~ '^[0-9]{4}$'
           then pay->>'last4' else '' end);

    -- billingAddress is REBUILT from an explicit four-field allowlist, each a
    -- bounded string with digit-run rejection. Arbitrary nested JSON, extra
    -- keys and non-string values cannot pass through.
    if jsonb_typeof(pay->'billingAddress') = 'object' then
      zip := public.pay_safe_str(pay->'billingAddress'->'zip', 10);
      if zip !~ '^([0-9]{5}(-?[0-9]{4})?)?$' then zip := ''; end if;
      addr := jsonb_build_object(
        'street', public.pay_addr_field(pay->'billingAddress'->'street', 120),
        'city',   public.pay_addr_field(pay->'billingAddress'->'city',    80),
        'state',  public.pay_addr_field(pay->'billingAddress'->'state',   40),
        'zip',    zip);
    else
      addr := 'null'::jsonb;
    end if;
    safe := safe || jsonb_build_object('billingAddress', addr);

    -- autopayRequested must be a real JSON boolean. A string "true", a 1, or
    -- anything else is not client intent and is treated as NOT SENT.
    if jsonb_typeof(pay->'autopayRequested') = 'boolean' then
      safe := safe || jsonb_build_object('autopayRequested', pay->'autopayRequested');
    elsif jsonb_typeof(prev->'autopayRequested') = 'boolean' then
      safe := safe || jsonb_build_object('autopayRequested', prev->'autopayRequested');
    end if;

    /* status: a client may only ever claim one of two values. Anything else
       — "active", "on_file", a number, garbage — is treated as NOT SENT, so a
       broken or hostile client cannot destroy stored state either. Only a
       billing backend writing directly may ever record more than this. */
    if jsonb_typeof(pay->'status') = 'string'
       and pay->>'status' in ('not_configured', 'pending_setup') then
      st := pay->>'status';
    elsif jsonb_typeof(prev->'status') = 'string' then
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

commit;
