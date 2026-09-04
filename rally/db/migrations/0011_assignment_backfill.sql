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
-- `data` is not modified except for the two mirrors the trigger owns, and
-- the assertions below prove it byte for byte.

do $$
declare
  v_before_entries   bigint;
  v_after_entries    bigint;
  v_synth            bigint;
  v_bad              bigint;
  v_unresolved       bigint;
  v_dup              bigint;
begin
  -- ------------------------------------------------------------ snapshot ---
  create temporary table _v41_before on commit drop as
    select team_id, id,
           jsonb_array_length(coalesce(data->'assignments', '[]'::jsonb)) as n_entries,
           coalesce(data->'assignments', '[]'::jsonb) as entries,
           coalesce(data->>'assignedTo', '')          as assigned_to,
           md5((data - 'assignedTo' - 'assignments')::text) as rest_md5,
           (coalesce(data->'assignments', '[]'::jsonb) = '[]'::jsonb
            and coalesce(data->>'assignedTo', '') <> '')  as bare_scalar
      from public.territories;

  select coalesce(sum(n_entries), 0) into v_before_entries from _v41_before;
  select count(*) filter (where bare_scalar) into v_synth from _v41_before;

  -- ------------------------------------------------------------ backfill ---
  -- The ledger is built by the SAME reconstruction the trigger and the
  -- client use, so a device that has never met this server already agrees.
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
               on p.id = (case when e->>'userId' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                               then (e->>'userId')::uuid end)
              and p.team_id = t.team_id))
   where jsonb_array_length(coalesce(t.assignees->'entries', '[]'::jsonb)) > 0;

  /* DUPLICATE OPEN ENTRIES. A hood that somehow holds two open entries for
     one rep cannot satisfy I1, and blocking forever on real data is not an
     option — so the resolution is deterministic, enumerated, and DELETES
     NOTHING: the entry with the greatest assignedAt (tiebreak: greatest
     userId) stays open and the others are closed at that same instant. Both
     entries survive; only the open/closed flag moves, so the current SET is
     unchanged and proof 2 below still holds exactly. */
  select count(*) into v_dup from (
    select t.team_id, t.id from public.territories t,
      lateral (select e->>'userId' u
                 from jsonb_array_elements(t.assignees->'entries') e
                where e->>'unassignedAt' is null
                group by 1 having count(*) > 1) d
    group by 1, 2) x;

  if v_dup > 0 then
    raise notice 'v41 backfill: % hood(s) had duplicate open assignees; closing all but the newest', v_dup;
    update public.territories t
       set assignees = jsonb_build_object('entries', (
             with keep as (
               select e->>'userId' u,
                      max((e->>'assignedAt')::bigint) ka
                 from jsonb_array_elements(t.assignees->'entries') e
                where e->>'unassignedAt' is null
                group by 1)
             select coalesce(jsonb_agg(
                 case when e->>'unassignedAt' is null
                       and (e->>'assignedAt')::bigint < k.ka
                      then jsonb_set(e, '{unassignedAt}', to_jsonb(k.ka))
                      else e end
                 order by (e->>'assignedAt')::bigint, e->>'userId'), '[]'::jsonb)
               from jsonb_array_elements(t.assignees->'entries') e
               left join keep k on k.u = e->>'userId'))
     where exists (select 1 from jsonb_array_elements(t.assignees->'entries') e
                    where e->>'unassignedAt' is null
                    group by e->>'userId' having count(*) > 1);
  end if;

  -- rebuild the derived mirrors for every row, through the same code the
  -- trigger uses (this UPDATE fires it)
  update public.territories set assignees = assignees;

  -- ------------------------------------------------------------- PROOF 1 ---
  -- entry count preserved, plus exactly the synthesized entries the survey
  -- named. Stated with its correction term, because plain equality is false.
  select coalesce(sum(jsonb_array_length(coalesce(assignees->'entries', '[]'::jsonb))), 0)
    into v_after_entries from public.territories;
  if v_after_entries <> v_before_entries + v_synth then
    raise exception 'v41 backfill PROOF 1 failed: % entries before + % synthesized <> % after',
      v_before_entries, v_synth, v_after_entries;
  end if;

  -- ------------------------------------------------------------- PROOF 2 ---
  -- the CURRENT open set is identical, row for row (the duplicate-open
  -- resolution changes multiplicity, never membership)
  select count(*) into v_bad from (
    select b.team_id, b.id
      from _v41_before b
      join public.territories t on t.team_id = b.team_id and t.id = b.id
     where (select coalesce(array_agg(distinct x order by x), '{}')
              from jsonb_array_elements(b.entries) e, lateral (select e->>'userId' x) s
             where e->>'unassignedAt' is null)
        is distinct from
           (select coalesce(array_agg(distinct x order by x), '{}')
              from jsonb_array_elements(t.assignees->'entries') e, lateral (select e->>'userId' x) s
             where e->>'unassignedAt' is null)
       and not b.bare_scalar) z;
  if v_bad > 0 then
    raise exception 'v41 backfill PROOF 2 failed: % hood(s) changed their current assignee set', v_bad;
  end if;

  -- ------------------------------------------------------------- PROOF 3 ---
  -- every CLOSED entry survives with the same (userId, assignedAt, unassignedAt)
  select count(*) into v_bad from (
    select b.team_id, b.id, e->>'userId' u, e->>'assignedAt' a, e->>'unassignedAt' ua
      from _v41_before b
      cross join lateral jsonb_array_elements(b.entries) e
     where e->>'unassignedAt' is not null
    except
    select t.team_id, t.id, e->>'userId', e->>'assignedAt', e->>'unassignedAt'
      from public.territories t
      cross join lateral jsonb_array_elements(t.assignees->'entries') e
     where e->>'unassignedAt' is not null) z;
  if v_bad > 0 then
    raise exception 'v41 backfill PROOF 3 failed: % closed history entr(ies) lost', v_bad;
  end if;

  -- ------------------------------------------------------------- PROOF 4 ---
  -- the deterministic mirror is correct on every row
  select count(*) into v_bad from public.territories t
   where coalesce(t.data->>'assignedTo', '')
      is distinct from coalesce(public.rally_first_open_assignee(t.assignees), '');
  if v_bad > 0 then
    raise exception 'v41 backfill PROOF 4 failed: % hood(s) have a wrong assignedTo mirror', v_bad;
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
   where md5((t.data - 'assignedTo' - 'assignments')::text) <> b.rest_md5;
  if v_bad > 0 then
    raise exception 'v41 backfill REVERSIBILITY failed: % row(s) had data outside the mirrors modified', v_bad;
  end if;

  raise notice 'v41 backfill: OK — % entries (% synthesized) across % hood(s)',
    v_after_entries, v_synth, (select count(*) from public.territories);
end $$;
