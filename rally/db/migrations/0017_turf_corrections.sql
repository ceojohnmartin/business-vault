-- RALLY v41 — 0017. THREE CORRECTIONS TO STAGE A, found by adversarial review
-- of Stage B and reproduced on a real database BEFORE either Stage B file was
-- applied to production.
--
-- 0010 and 0013 are already live (Stage A, 2026-09-06). Neither is rewritten:
-- this file CREATE OR REPLACEs three function bodies and adds two helpers.
-- No table, no column, no trigger, no policy, no grant on a table, and NOT ONE
-- ROW is touched. Applying it twice changes nothing.
--
-- Why it belongs with Stage B rather than later: each defect is either
-- unreachable until Stage B lands, or made reachable by it.
--
-- ------------------------------------------------------------------------
-- 1. A CLEARED DO-NOT-KNOCK WENT BACK TO BLACK ON THE NEXT WRITE (0013).
--
--    clear_pin_dnk arrives with 0014. It writes the dnk_clear into the
--    door's history as the function owner, which is the only legitimate
--    way black is cleared. But EVERY client write is
--    `insert ... on conflict (team_id, id) do update`, and PostgreSQL fires
--    a BEFORE INSERT trigger on the proposed row BEFORE it detects the
--    conflict. On that arm 0013 stripped forged clears against '{}' — no
--    prior row — so it stripped the server's own clear as well; `excluded`
--    then carried the clear-less history into the UPDATE arm, where `old`
--    (which still had the clear) made the door read "not black", so nothing
--    restored it. One echo of the row by any phone erased the clear, and
--    the rep's next knock forced the door back to black. Re-clearing looped
--    forever. REPRODUCED on a local copy of production's Stage A state: an
--    exact echo of the server's own row by a rep left history=[dnk],
--    clears=0, and the following knock read disposition='dnk'.
--
--    The fix is in two parts, and both are needed: look the existing row up
--    by key on the INSERT arm (so the strip judges against what the server
--    holds), and re-add any clear the server holds that the incoming write
--    dropped — exactly as the do-not-knock knock itself is re-added. The
--    second part is what makes the clear durable against a phone that
--    cleared it (its copy carries its own clock) and against a phone that
--    never pulled it (its copy has no clear at all).
--
-- 2. A SPLIT INHERITANCE WAS DELETED BY THE PHONE THAT SPLIT (0010).
--
--    0015 gives each child a fresh OPEN entry per current parent assignee.
--    The splitting phone does not have it yet: its own children were built
--    with assignments: []. If the leader assigns one of those children
--    before the next pull lands, the legacy branch derives the ledger from
--    the mirror the phone sent and the inherited OPEN entry is deleted
--    outright — not closed, no provenance, gone. REPRODUCED: after the
--    phone's assignment the child held one entry, zero for the inherited
--    rep, zero carrying viaSplit.
--
--    The mirror still decides who is open NOW. What it may not do is decide
--    what happened: an open prior entry the mirror does not name is carried
--    forward CLOSED, at the later of now and its own start, tagged
--    closedByMirror. Sibling rule to rally_keep_closed_history, which has
--    protected closed history the same way since 0010.
--
-- 3. A CORRECTION THE CLIENT COULD NOT SEE (0010).
--
--    The authoritative-correction stamp moves data.updatedAt above the
--    incoming value whenever the trigger overrides what a client sent,
--    because a client's merge engine compares that clock and discards an
--    echo that reads "same". It was guarded by the authority test, so under
--    LEGACY authority — which is what production runs, and what it will
--    still run through Stage B — it never fired. But the legacy branch
--    injects server truth too: closed history the phone never saw, the v41
--    provenance a mirror cannot carry, and now a split inheritance. A
--    rename of such a child by the phone that split it came back with the
--    phone's own clock, read as "same", and was discarded: that phone
--    showed the child unassigned indefinitely while every other device
--    showed it assigned — which is how a leader ends up handing out turf
--    that already has a rep. REPRODUCED: after a rename-only save the
--    server held the inherited rep open and returned data.updatedAt
--    unchanged.
--
--    The stamp now fires on any real correction. It cannot loop: the
--    condition is that the rebuilt mirror DIFFERS from what the write
--    carried, and the client's next push carries the corrected mirror.

-- --------------------------------------------------------------- helpers ---

/* Every OPEN prior entry the derived set does not name, carried forward as
   CLOSED rather than dropped.

   Matched on (userId, assignedAt) — the identity a v40 mirror can express.
   An entry the client's mirror knows about, open or closed, is therefore
   already represented and is not touched; only one the mirror is silent
   about is carried. Closed at the later of now and its own start, so I3
   (an entry may not end before it starts) holds even for a legacy entry
   whose assignedAt is in the future, and tagged so the record says why. */
create or replace function public.rally_keep_open_history(
  p_derived jsonb, p_prior jsonb, p_now_ms bigint)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select coalesce(p_derived, '[]'::jsonb) || coalesce((
    select jsonb_agg(
             jsonb_set(o, '{unassignedAt}',
               to_jsonb(greatest(p_now_ms, coalesce(public.rally_ms(o->>'assignedAt'), p_now_ms))))
             || jsonb_build_object('closedByMirror', true))
      from jsonb_array_elements(coalesce(p_prior->'entries', '[]'::jsonb)) o
     where o->>'unassignedAt' is null
       and not exists (
         select 1 from jsonb_array_elements(coalesce(p_derived, '[]'::jsonb)) d
          where d->>'userId' = o->>'userId'
            and d->>'assignedAt' = o->>'assignedAt')), '[]'::jsonb)
$$;

/* Every dnk_clear the SERVER already holds, re-added to a write that
   dropped it. Matched on the timestamp, which is what a clear IS — the same
   identity rally_strip_forged_clears uses to tell a genuine clear from a
   forged one, so the two functions cannot disagree.

   Total over legacy JSON: a scalar data or a non-array history on either
   side carries no clear, and jsonb_set is never called on a scalar. */
create or replace function public.rally_keep_server_clears(p_old jsonb, p_new jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when jsonb_typeof(p_new) <> 'object'
      or jsonb_typeof(coalesce(p_new->'history', '[]'::jsonb)) <> 'array'
      or jsonb_typeof(p_old) <> 'object'
      or jsonb_typeof(p_old->'history') <> 'array' then p_new
    else jsonb_set(p_new, '{history}',
           coalesce(p_new->'history', '[]'::jsonb) || coalesce((
             select jsonb_agg(o order by ord)
               from jsonb_array_elements(p_old->'history') with ordinality t(o, ord)
              where o->>'disposition' = 'dnk_clear'
                and not exists (
                  select 1 from jsonb_array_elements(
                           coalesce(p_new->'history', '[]'::jsonb)) n
                   where n->>'disposition' = 'dnk_clear'
                     and n->>'ts' = o->>'ts')), '[]'::jsonb))
  end
$$;

-- ------------------------------------------------ the two replaced bodies ---

create or replace function public.territories_assignment()
returns trigger
language plpgsql
security invoker                       -- see v_via_rpc below: this matters
set search_path = ''
as $$
declare
  v_auth      boolean;
  v_via_rpc   boolean;
  v_entries   jsonb;
  v_old       jsonb := coalesce(case when tg_op = 'UPDATE' then old.assignees end, '{"entries": []}'::jsonb);
  v_now_ms    bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_incoming  bigint;
  -- WHAT THE CLIENT SENT, captured before anything below rewrites it. The
  -- correction stamp must compare against this, not against OLD: a client
  -- that tried to reassign a hood and was overruled ends up with the row's
  -- PREVIOUS mirror, which is identical to OLD and would look like no
  -- correction at all.
  v_sent_a    jsonb := case when tg_op = 'UPDATE' then new.data->'assignments' end;
  v_sent_to   jsonb := case when tg_op = 'UPDATE' then new.data->'assignedTo' end;
begin
  v_auth := coalesce((public.rally_capabilities()->>'assignmentServerAuthoritative')::boolean, false);

  /* WHO IS ALLOWED TO MOVE THE LEDGER — an UNSPOOFABLE test.

     A client's write arrives through PostgREST as the role `authenticated`.
     A SECURITY DEFINER RPC runs as the function's OWNER, and no client can
     become that owner. So `current_user` separates "an ordinary upsert,
     from any client of any version" from "a call that went through
     set_territory_assignments or smart_split_territory".

     This is why the trigger is SECURITY INVOKER. Were it DEFINER,
     current_user would be the trigger's own owner on every path and the
     distinction would vanish. It reads the activation flag through the
     SECURITY DEFINER rally_capabilities() instead, so rally_config stays
     unreadable to clients.

     Deliberately NOT a GUC and NOT a flag in the JSON payload: both are
     things a request can carry, and an authorization test a request can
     carry is not an authorization test. */
  v_via_rpc := current_user <> 'authenticated';

  if v_via_rpc and (case when tg_op = 'INSERT'
                         then coalesce(new.assignees->'entries', '[]'::jsonb) <> '[]'::jsonb
                         else new.assignees is distinct from old.assignees end) then
    /* AN AUTHORITATIVE OPERATION THAT SUPPLIED A LEDGER.
       set_territory_assignments, save_territory and the split inheritance
       have already written the ledger they mean, having derived every
       timestamp and every transition themselves. It stands whatever the
       flag says — the flag governs whether a CLIENT UPSERT may move the
       ledger, not whether the server may.

       The "supplied a ledger" half matters as much as the privilege half.
       Without it, ANY write from outside PostgREST — a migration fixture,
       an admin repairing a row in the SQL editor, a dashboard edit —
       would count as authoritative and its data.assignments would be
       silently ignored, dropping the assignment it was carrying. A write
       that says nothing about the ledger is not an assignment decision,
       whoever makes it, and falls through to the derivation below. */
    new.assignees := coalesce(new.assignees, '{"entries": []}'::jsonb);
  elsif tg_op = 'INSERT' or not v_auth then
    /* A BRAND-NEW HOOD TAKES THE WRITER'S ASSIGNMENT, UNDER EITHER FLAG.

       There is no server ledger to protect on a row that does not exist
       yet, and refusing the payload would silently drop the assignee from
       every hood created by a client. Recreating a hood to smuggle an
       assignment past the flag is not available: a tombstoned hood keeps
       its id, so writing to it is an UPDATE and the ledger is protected;
       a genuinely new id has no history to protect.

       THIS ALSO FIXES A TRAP IN THE UPSERT ITSELF. PostgreSQL fires BEFORE
       INSERT triggers on the PROPOSED row before it detects the conflict,
       and `excluded` is what those triggers left behind — so an INSERT arm
       that rewrites data.assignments hands the DO UPDATE arm a mangled
       payload. The row still ended up correct (the UPDATE arm rebuilds from
       old.assignees), but the correction stamp below then saw a difference
       on EVERY upsert and bumped the clock, which is exactly the re-push
       loop it is written to avoid. Deriving on INSERT keeps `excluded`
       faithful to what the client actually sent.

       Under LEGACY authority the same derivation is the whole rule: a
       client upsert's data.assignments is truth and the ledger follows it,
       which is what keeps a v40 client — and a v41 client that has not yet
       seen the activation — fully correct.

       MERGED with the ledger already on the row, so the v41 provenance a
       legacy mirror cannot carry (inheritedFromTerritoryId, viaSplit,
       viaOperation, the assignedBy uuid, userIdResolved) survives an upsert
       from a phone that has never heard of any of it. */
    v_entries := public.rally_legacy_to_entries(new.data, new.created_at, coalesce(v_old, '{"entries": []}'::jsonb));
    /* UNION with the closed history already on the row, never replace it.

       A client's mirror is only as complete as the last copy it pulled. A
       phone that has been offline pushes a mirror missing whatever closed
       entries it never saw — and a derivation that simply replaced the
       ledger would drop them, which I4 then correctly refuses with 42501.
       That refusal is permanent: the row dead-letters, and it dead-letters
       again on every retry, for a client that did nothing wrong.

       So closed history is additive here. The mirror decides who is OPEN;
       it is not allowed to decide what happened. */
    new.assignees := jsonb_build_object('entries',
      public.rally_sort_entries(
        public.rally_keep_open_history(
          public.rally_keep_closed_history(
            public.rally_merge_provenance(v_entries, v_old), v_old), v_old, v_now_ms)));
  else
    /* SERVER AUTHORITY: the ledger is truth. A client-sent data.assignments
       or data.assignedTo is IGNORED — not refused, ignored, so a v40 phone's
       upsert still commits its name/outline/door-count edits — and the
       mirrors are rewritten from the ledger below. */
    if new.assignees is distinct from old.assignees then
      -- an ordinary upsert cannot move the ledger, whatever it sent
      new.assignees := old.assignees;
    end if;
  end if;

  new.assignees := jsonb_build_object(
    'entries', public.rally_sort_entries(coalesce(new.assignees->'entries', '[]'::jsonb)));
  perform public.rally_assert_ledger(v_old, new.assignees);

  if tg_op = 'INSERT' or new.assignees is distinct from old.assignees then
    new.assignees_rev := coalesce(case when tg_op = 'UPDATE' then old.assignees_rev end, 0) + 1;
  else
    new.assignees_rev := old.assignees_rev;
  end if;

  new.open_assignees := public.rally_open_uuids(new.assignees, new.team_id);

  -- the two v40 mirrors, always rebuilt from the ledger
  new.data := jsonb_set(coalesce(new.data, '{}'::jsonb), '{assignments}',
                        public.rally_mirror_assignments(new.assignees));
  new.data := jsonb_set(new.data, '{assignedTo}',
                        coalesce(to_jsonb(public.rally_first_open_assignee(new.assignees)), 'null'::jsonb));

  /* THE AUTHORITATIVE-CORRECTION STAMP.

     A client's record clock (data.updatedAt) is what its merge engine
     compares; an unchanged clock reads as "same" and the correction is
     DISCARDED. So when this trigger overrode something the client sent, the
     row goes back with a clock strictly above the incoming one and the
     client accepts it.

     Applied ONLY on a real correction — the rebuilt mirror DIFFERS from
     what the write carried. That condition is what stops the loop the
     unconditional form would cause: once the client adopts the correction
     its next push carries the corrected mirror, nothing differs, and
     nothing is stamped.

     0017 REMOVED the authority test that used to guard this. Under LEGACY
     authority the trigger also injects server truth the client did not
     send — the closed history it never saw, the provenance a mirror cannot
     carry, and (since 0015) a split inheritance the splitting phone has not
     pulled yet. Without the stamp that correction went back with the
     client's own clock, the client's merge engine read the echo as "same"
     and discarded it, and that device stayed stale until some other device
     happened to write the row. */
  if tg_op = 'UPDATE'
     and (new.data->'assignments' is distinct from v_sent_a
          or new.data->'assignedTo' is distinct from v_sent_to) then
    -- data.updatedAt is client JSON: cast it only once an anchored regex
    -- has proven the cast cannot fail; anything else reads as 0
    v_incoming := coalesce(public.rally_ms(new.data->>'updatedAt'), 0);
    new.data := jsonb_set(new.data, '{updatedAt}',
                          to_jsonb(greatest(v_now_ms, v_incoming + 1)));
  end if;

  return new;
end $$;

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
  v_old_data  jsonb;
begin
  /* THE UNSPOOFABLE TEST. A client write arrives through PostgREST as the
     role `authenticated`; a SECURITY DEFINER RPC runs as the function's
     owner, which no client can become. So clear_pin_dnk() is
     distinguishable from every ordinary write without a GUC, a header or a
     JSON flag — none of which are authorization tests, because a request
     can carry all three. This is also why the trigger is SECURITY INVOKER:
     as DEFINER, current_user would be its own owner on every path. */
  v_via_rpc := current_user <> 'authenticated';
  if v_via_rpc then return new; end if;   -- 0014 is the only legitimate clear

  /* FORGED CLEARS GO FIRST, and on EVERY write — including an INSERT, and
     including a door that is not black yet. A clear only counts when it is
     at or after the do-not-knock, so one planted with a future timestamp on
     an ordinary door would silently disarm the protection the day that door
     was marked. Stripping only black doors would leave exactly that hole. */
  /* THE ROW THE SERVER HOLDS — looked up on the INSERT arm rather than
     assumed absent. Every client write arrives as INSERT ... ON CONFLICT DO
     UPDATE, and PostgreSQL fires this trigger on the proposed row BEFORE it
     detects the conflict, so on that arm `old` does not exist. 0013 read
     that as "there is no prior row" and stripped against '{}', which
     removed the server's OWN clear from every echo of a cleared door: the
     door went back to black on the next knock and no clear could ever
     stick. It looks the existing row up by key instead — the same escape
     0009's derive trigger makes on the same arm. */
  if tg_op = 'UPDATE' then
    v_old_data := old.data;
  else
    select p.data into v_old_data from public.pins p
     where p.team_id = new.team_id and p.id = new.id;
    if not found then v_old_data := '{}'::jsonb; end if;
  end if;
  v_old_data := coalesce(v_old_data, '{}'::jsonb);

  new.data := public.rally_strip_forged_clears(v_old_data, coalesce(new.data, '{}'::jsonb));

  /* AND THE CLEARS THE SERVER ALREADY HAS SURVIVE THE WRITE.

     Stripping alone protects against a forged clear but not against a lost
     one: a phone that cleared the door carries its own clock in its copy,
     and a phone that has not pulled the clear carries no copy at all. Both
     pushes would otherwise store a history with no clear, and the door
     would read black again — with the rep's next knock making it black in
     the column too. The clear is a server fact; like the do-not-knock knock
     below, it is re-added to any write that dropped it. */
  new.data := public.rally_keep_server_clears(v_old_data, new.data);

  if tg_op = 'INSERT' then return new; end if;

  /* WAS the door black before this write? Judged from the row the server
     already holds — never from anything the request carried. */
  v_was_dnk := old.disposition = 'dnk'
               or public.rally_dnk_from_history(old.data) is not null;
  if not v_was_dnk then return new; end if;

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
  if jsonb_typeof(new.data) is distinct from 'object' then
    /* a legacy row whose data is not an object cannot carry the mirror or
       the history; the COLUMN is still protected above and below, and the
       preflight names the row. jsonb_set would abort on a scalar. */
    null;
  elsif coalesce(new.data->>'disposition', '') is distinct from 'dnk' then
    new.data := jsonb_set(new.data, '{disposition}', '"dnk"'::jsonb);
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
  if jsonb_typeof(new.data) = 'object' and public.rally_dnk_from_history(new.data) is null then
    v_hist := coalesce(new.data->'history', '[]'::jsonb);
    if jsonb_typeof(v_hist) <> 'array' then v_hist := '[]'::jsonb; end if;
    new.data := jsonb_set(new.data, '{history}',
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
  if v_touched and jsonb_typeof(new.data) = 'object' then
    v_incoming := case when (new.data->>'updatedAt') ~ '^-?[0-9]{1,18}$'
                       then (new.data->>'updatedAt')::bigint else 0 end;
    new.data := jsonb_set(new.data, '{updatedAt}', to_jsonb(greatest(v_now_ms, v_incoming + 1)));
  end if;

  return new;
end $$;


-- ---------------------------------------------------------------- grants ---
-- 0010's form: Supabase's default function privileges hand anon an EXPLICIT
-- execute entry at creation, which `from public` alone leaves in place; the
-- two trigger functions are shut to authenticated as well.
-- The two helpers are called from SECURITY INVOKER trigger bodies, so the
-- CALLING role executes them: `authenticated` must keep EXECUTE, exactly as
-- it does on 0010's rally_keep_closed_history and 0013's
-- rally_strip_forged_clears. Both are pure functions over jsonb the caller
-- already holds — they read no table and answer no question about anyone.
revoke all on function public.rally_keep_open_history(jsonb, jsonb, bigint) from public, anon;
revoke all on function public.rally_keep_server_clears(jsonb, jsonb)        from public, anon;
revoke all on function public.territories_assignment()                      from public, anon, authenticated;
revoke all on function public.pins_protect_dnk()                            from public, anon, authenticated;

-- The triggers themselves are NOT re-created: both already point at these
-- names, and `create or replace function` swaps the body under them.
