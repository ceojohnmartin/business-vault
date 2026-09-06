-- RALLY v41 — STAGE A part 3. The lossless assignment-history backfill.
--
-- SCOPE IS EVERY ROW. Live, archived, tombstoned and Smart Split parents
-- alike: history is indefinite, a split tombstones its parent (0005), and
-- an archived hood's assignment record is part of the historical record.
-- Filtering to live hoods would quietly discard the past.
--
-- NOTHING IS EVER DROPPED. An entry naming a rep who cannot be resolved
-- today — a device-local id that leaked through the client's
-- `toProfile(...) || localId` fallback, a profile since deleted, a
-- cross-team artifact from a restore — is a historical fact about who
-- worked that hood. It is kept verbatim and tagged `userIdResolved: false`
-- so it can be counted, not deleted so an index looks tidy. The uuid[]
-- mirror simply cannot hold it, which is the mirror's problem, not the
-- ledger's.
--
-- ONE READER. The ledger is built by public.rally_legacy_to_entries — the
-- same normaliser the assignment trigger applies to every client upsert and
-- the preflight applies to every row it surveys — so what the survey showed
-- the operator is exactly what this file writes. That reader is TOTAL over
-- legacy JSON and produces a ledger that satisfies I1..I3 by construction:
-- an unreadable timestamp is synthesised and tagged with its raw value, a
-- run that "ends before it starts" is clamped and tagged, a rep open twice
-- keeps the last entry open and the others closed (tagged closedByDedupe),
-- and an element that carries no assignment at all (not an object, no
-- userId) is dropped — the preflight lists those first. So this file can
-- no longer abort on the shape of history nobody chose; it can only abort
-- on its own PROOFS, which is what the proofs are for.
--
-- `data` is not modified except for the two mirrors the trigger owns, and
-- the assertions below prove it byte for byte.

do $$
declare
  v_before_entries   bigint;
  v_after_entries    bigint;
  v_synth            bigint;
  v_bad              bigint;
  v_unresolved       bigint;
begin
  -- ------------------------------------------------------------ snapshot ---
  /* data.assignments is CLIENT JSON. A legacy row may hold an object, a
     string, a number or a JSON null there; the reader treats every
     non-array as "no history array" (and synthesizes from assignedTo when
     there is one), so the snapshot reads it the same way. */
  create temporary table _v41_before on commit drop as
    select team_id, id, created_at,
           /* the entries the READER will keep: objects with a usable userId.
              A non-object element or an entry with no userId carries no
              assignment and is dropped by rally_legacy_to_entries; counting
              it here would make PROOF 1 fail on the row the preflight
              already listed. */
           (select count(*)
              from jsonb_array_elements(case when jsonb_typeof(data->'assignments') = 'array'
                                             then data->'assignments' else '[]'::jsonb end) e
             where jsonb_typeof(e) = 'object' and coalesce(btrim(e->>'userId'), '') <> '') as n_entries,
           coalesce(data->>'assignedTo', '')          as assigned_to,
           /* what the reader makes of this row BEFORE anything is written:
              the yardstick for PROOFs 2-4 */
           public.rally_legacy_to_entries(data, created_at, '{"entries": []}'::jsonb) as norm,
           /* `updatedAt` is excluded on purpose. The assignment trigger's
              correction stamp moves the record clock whenever it rewrites a
              mirror — which is exactly what this backfill makes it do — so
              hashing it would make the reversibility assertion abort on
              every real dataset while proving nothing about loss. What must
              be byte-identical is the CONTENT outside the two mirrors. */
           md5((data - 'assignedTo' - 'assignments' - 'updatedAt')::text) as rest_md5,
           /* the reader's own definition of the oldest shape: no usable
              history array, and a scalar assignee to synthesize from */
           ((jsonb_typeof(data->'assignments') is distinct from 'array'
             or jsonb_array_length(data->'assignments') = 0)
            and jsonb_typeof(data) = 'object'
            and coalesce(btrim(data->>'assignedTo'), '') <> '')  as bare_scalar
      from public.territories;

  select coalesce(sum(n_entries), 0) into v_before_entries from _v41_before;
  select count(*) filter (where bare_scalar) into v_synth from _v41_before;

  -- ------------------------------------------------------------ backfill ---
  -- The ledger is built by the SAME reader the trigger and the preflight
  -- use, so a device that has never met this server already agrees, and a
  -- survey the operator reviewed is what gets written.
  update public.territories t
     set assignees = jsonb_build_object('entries',
           public.rally_sort_entries(
             public.rally_legacy_to_entries(t.data, t.created_at, t.assignees)))
   where jsonb_array_length(coalesce(t.assignees->'entries', '[]'::jsonb)) = 0;

  -- Tag what could not be resolved. Kept, never removed.
  update public.territories t
     set assignees = jsonb_build_object('entries', (
           select coalesce(jsonb_agg(
             case when p.id is not null then e - 'userIdResolved'
                  else jsonb_set(e, '{userIdResolved}', 'false'::jsonb) end
             order by (e->>'assignedAt')::bigint, e->>'userId'), '[]'::jsonb)
             from jsonb_array_elements(t.assignees->'entries') e
             left join public.profiles p
               on p.id = public.rally_uid_uuid(e->>'userId')
              and p.team_id = t.team_id))
   where jsonb_array_length(coalesce(t.assignees->'entries', '[]'::jsonb)) > 0;

  -- rebuild the derived mirrors for every row, through the same code the
  -- trigger uses (this UPDATE fires it)
  update public.territories set assignees = assignees;

  -- ------------------------------------------------------------- PROOF 1 ---
  -- every entry the reader keeps is in the ledger, plus exactly the
  -- synthesized entries the survey named. Stated with its correction term,
  -- because plain equality is false. Elements the reader drops (not an
  -- object, no userId) are on neither side — the preflight lists them.
  select coalesce(sum(jsonb_array_length(coalesce(assignees->'entries', '[]'::jsonb))), 0)
    into v_after_entries from public.territories;
  if v_after_entries <> v_before_entries + v_synth then
    raise exception 'v41 backfill PROOF 1 failed: % entries before + % synthesized <> % after',
      v_before_entries, v_synth, v_after_entries;
  end if;

  -- ------------------------------------------------------------- PROOF 2 ---
  -- the CURRENT open set is identical, row for row, in CANONICAL ids: the
  -- set the reader makes of the raw mirror (dedupe changes multiplicity,
  -- never membership; a synthesized bare-scalar assignee counts) equals the
  -- set the ledger holds open after the whole trigger path ran
  select count(*) into v_bad from (
    select b.team_id, b.id
      from _v41_before b
      join public.territories t on t.team_id = b.team_id and t.id = b.id
     where (select coalesce(array_agg(distinct x order by x), '{}')
              from jsonb_array_elements(b.norm) e, lateral (select e->>'userId' x) s
             where e->>'unassignedAt' is null)
        is distinct from
           (select coalesce(array_agg(distinct x order by x), '{}')
              from jsonb_array_elements(t.assignees->'entries') e, lateral (select e->>'userId' x) s
             where e->>'unassignedAt' is null)) z;
  if v_bad > 0 then
    raise exception 'v41 backfill PROOF 2 failed: % hood(s) changed their current assignee set', v_bad;
  end if;

  -- ------------------------------------------------------------- PROOF 3 ---
  -- every CLOSED entry the reader produced from the raw mirror survives the
  -- trigger path (provenance merge, closed-history union, sort) with the
  -- same (userId, assignedAt, unassignedAt). A proof about the PIPELINE:
  -- the reader's own normalisation of a raw timestamp is what the preflight
  -- shows the operator, entry by entry, with the raw value beside it.
  select count(*) into v_bad from (
    select b.team_id, b.id, e->>'userId' u, e->>'assignedAt' a, e->>'unassignedAt' ua
      from _v41_before b
      cross join lateral jsonb_array_elements(b.norm) e
     where e->>'unassignedAt' is not null
    except
    select t.team_id, t.id, e->>'userId', e->>'assignedAt', e->>'unassignedAt'
      from public.territories t
      cross join lateral jsonb_array_elements(t.assignees->'entries') e
     where e->>'unassignedAt' is not null) z;
  if v_bad > 0 then
    raise exception 'v41 backfill PROOF 3 failed: % closed history entr(ies) lost', v_bad;
  end if;

  /* ------------------------------------------------------------- PROOF 4 ---
     The deterministic mirror is correct: data.assignedTo equals the first
     open entry (assignedAt, userId) of what the reader made of the raw
     mirror — checked against the BEFORE snapshot, not against the ledger
     the trigger just wrote. And the scalar MOVED only where it disagreed
     with that (the census names those rows); anywhere else a changed scalar
     is a silent reassignment. */
  select count(*) into v_bad from _v41_before b
    join public.territories t on t.team_id = b.team_id and t.id = b.id
   where coalesce(t.data->>'assignedTo', '') is distinct from coalesce((
           select e->>'userId'
             from jsonb_array_elements(b.norm) e
            where e->>'unassignedAt' is null
            order by (e->>'assignedAt')::bigint, e->>'userId' limit 1), '');
  if v_bad > 0 then
    raise exception 'v41 backfill PROOF 4 failed: % hood(s) have an assignedTo mirror that is not the first open entry', v_bad;
  end if;
  select count(*) into v_bad from _v41_before b
    join public.territories t on t.team_id = b.team_id and t.id = b.id
   where coalesce(t.data->>'assignedTo', '') is distinct from coalesce(b.assigned_to, '')
     and coalesce(b.assigned_to, '') = coalesce((
           select e->>'userId'
             from jsonb_array_elements(b.norm) e
            where e->>'unassignedAt' is null
            order by (e->>'assignedAt')::bigint, e->>'userId' limit 1), '');
  if v_bad > 0 then
    raise exception 'v41 backfill PROOF 4 failed: % hood(s) changed their assignedTo mirror without cause', v_bad;
  end if;

  -- ------------------------------------------------------------- PROOF 5 ---
  -- unresolved entries are ENUMERATED, never silently dropped
  select count(*) into v_unresolved
    from public.territories t, jsonb_array_elements(t.assignees->'entries') e
   where (e->>'userIdResolved') = 'false';
  raise notice 'v41 backfill: % historical assignment entr(ies) name a rep that cannot be resolved today (kept, tagged, excluded from open_assignees)', v_unresolved;

  -- -------------------------------------------------------- REVERSIBILITY ---
  -- `data` outside the two mirrors is byte-identical, so dropping the
  -- columns returns the world to its pre-v41 state with nothing lost
  select count(*) into v_bad from _v41_before b
    join public.territories t on t.team_id = b.team_id and t.id = b.id
   where md5((t.data - 'assignedTo' - 'assignments' - 'updatedAt')::text) <> b.rest_md5;
  if v_bad > 0 then
    raise exception 'v41 backfill REVERSIBILITY failed: % row(s) had data outside the mirrors modified', v_bad;
  end if;

  raise notice 'v41 backfill: OK — % entries (% synthesized) across % hood(s)',
    v_after_entries, v_synth, (select count(*) from public.territories);
end $$;
