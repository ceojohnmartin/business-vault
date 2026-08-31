-- RALLY Phase 3 — the realtime doorbell.
-- Run once in the Supabase SQL editor, after 0001.
--
-- Design: Realtime carries NO data. A statement-level trigger on each
-- synced table broadcasts an EMPTY payload to the private topic
-- `team:<team_id>`; clients that hear it run their normal Phase 2 pull.
-- One broadcast per WRITE STATEMENT (not per row — a 200-row batched
-- upsert rings the bell once per team touched), and authorization to
-- LISTEN is enforced here, server-side, by Row Level Security on
-- realtime.messages: the topic a client may join is derived from its OWN
-- profile row via my_team_id(), never from anything the client claims.

-- ---------------------------------------------------------- the bell ---
create or replace function public.ping_team() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  t record;
begin
  for t in select distinct team_id from changed where team_id is not null loop
    -- empty payload ON PURPOSE: the doorbell says "something changed",
    -- never what — the RLS-guarded pull is the only data path
    perform realtime.send('{}'::jsonb, TG_TABLE_NAME, 'team:' || t.team_id::text, true);
  end loop;
  return null;
end $$;

-- one trigger per event: Postgres only allows a transition table on a
-- single-event trigger
create trigger pins_ping_ins after insert on public.pins
  referencing new table as changed
  for each statement execute function public.ping_team();
create trigger pins_ping_upd after update on public.pins
  referencing new table as changed
  for each statement execute function public.ping_team();
create trigger events_ping_ins after insert on public.events
  referencing new table as changed
  for each statement execute function public.ping_team();
create trigger territories_ping_ins after insert on public.territories
  referencing new table as changed
  for each statement execute function public.ping_team();
create trigger territories_ping_upd after update on public.territories
  referencing new table as changed
  for each statement execute function public.ping_team();
create trigger customers_ping_ins after insert on public.customers
  referencing new table as changed
  for each statement execute function public.ping_team();
create trigger customers_ping_upd after update on public.customers
  referencing new table as changed
  for each statement execute function public.ping_team();

-- ------------------------------------------------- who may listen ------
-- Private-channel authorization: joining topic `team:X` requires being
-- able to SELECT broadcast messages on that topic, and this policy only
-- grants it when X is the caller's own team (from their profile row,
-- resolved by the SECURITY DEFINER helper — a JWT fact, not a client
-- claim) and their account is enabled.
create policy team_doorbell on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() = 'team:' || public.my_team_id()::text
    and public.is_active()
  );
