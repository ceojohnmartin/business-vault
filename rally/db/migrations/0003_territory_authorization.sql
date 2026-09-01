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
