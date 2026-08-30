-- RALLY Phase 1 — Supabase foundation: schema + Row Level Security.
-- Run once against a fresh Supabase project (SQL editor, as postgres).
-- Nothing here starts syncing data; it is the ground the later phases
-- build on. Client IDs are the text ids RALLY already generates, so the
-- primary key on every data table is (team_id, id).

-- ============================================================ helpers ===

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ============================================================== teams ===

create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger teams_touch before update on public.teams
  for each row execute function public.set_updated_at();

-- =========================================================== profiles ===
-- One row per auth user. Membership is single-team (team_id); authority
-- is the role column. BOTH are writable only from the server side —
-- see the column grants below.

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  team_id       uuid references public.teams(id),
  role          text not null default 'rep'
                check (role in ('rep','leader','manager','owner')),
  name          text not null default '',
  email         text not null default '',
  disabled      boolean not null default false,
  local_user_id text,          -- maps to RALLY's on-device users-store id
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index profiles_team_idx on public.profiles (team_id);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.set_updated_at();

-- Every brand-new auth user gets a profile with the LEAST authority:
-- role 'rep', no team, not disabled. Promotion and team placement are
-- server-side acts (dashboard / seed script), never a client write.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id,
          coalesce(new.email, ''),
          coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Identity helpers for policies. SECURITY DEFINER so reading the caller's
-- own profile row never recurses into the profiles policies themselves.
create or replace function public.my_team_id() returns uuid
language sql stable security definer set search_path = public, pg_temp as
$$ select team_id from public.profiles where id = auth.uid() $$;

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public, pg_temp as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = public, pg_temp as
$$ select coalesce(
     (select not disabled from public.profiles where id = auth.uid()),
     false) $$;

-- ========================================================= data tables ===
-- Soft references on purpose (pin_id / territory_id / customer_id are
-- plain text, no FK): Phase 2 sync delivers offline work in whatever
-- order the outbox drains, and a knock must never be rejected because
-- its door hasn't landed yet. Deletion is a tombstone (deleted_at), so
-- there are no DELETE grants anywhere below.

create table public.pins (
  team_id      uuid not null references public.teams(id),
  id           text not null,
  lat          double precision not null,
  lng          double precision not null,
  address      text not null default '',
  disposition  text not null default '',
  territory_id text,
  data         jsonb not null default '{}'::jsonb,
  created_by   uuid references public.profiles(id),
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (team_id, id)
);
create index pins_territory_idx on public.pins (team_id, territory_id);
create trigger pins_touch before update on public.pins
  for each row execute function public.set_updated_at();

-- the knock log: append-only, the sync model's conflict-free core
create table public.events (
  team_id     uuid not null references public.teams(id),
  id          text not null,
  pin_id      text,
  type        text not null default 'knock',
  disposition text not null default '',
  at_ms       bigint not null,
  by_user     uuid references public.profiles(id),
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  primary key (team_id, id)
);
create index events_pin_idx on public.events (team_id, pin_id);
create index events_at_idx  on public.events (team_id, at_ms);

create table public.territories (
  team_id    uuid not null references public.teams(id),
  id         text not null,
  name       text not null default '',
  polygon    jsonb not null default '[]'::jsonb,   -- [[lng,lat],...] ring
  homes      integer,
  archived   boolean not null default false,
  data       jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (team_id, id)
);
create trigger territories_touch before update on public.territories
  for each row execute function public.set_updated_at();

create table public.customers (
  team_id    uuid not null references public.teams(id),
  id         text not null,
  first      text not null default '',
  last       text not null default '',
  email      text not null default '',
  phones     jsonb not null default '[]'::jsonb,
  data       jsonb not null default '{}'::jsonb,  -- payment is scrubbed below
  created_by uuid references public.profiles(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (team_id, id)
);
create trigger customers_touch before update on public.customers
  for each row execute function public.set_updated_at();

-- Card and bank numbers NEVER land in this database — enforced here, at
-- the door, not by client politeness. Whatever a client sends, the stored
-- payment object is cut down to the safe allowlist.
create or replace function public.scrub_customer_payment() returns trigger
language plpgsql as $$
declare pay jsonb;
begin
  if new.data is null then
    new.data := '{}'::jsonb;
    return new;
  end if;
  if new.data ? 'payment' then
    pay := new.data->'payment';
    new.data := jsonb_set(new.data, '{payment}', jsonb_build_object(
      'method',         coalesce(pay->'method',         '""'::jsonb),
      'last4',          coalesce(pay->'last4',          '""'::jsonb),
      'autopay',        coalesce(pay->'autopay',        'false'::jsonb),
      'billingAddress', coalesce(pay->'billingAddress', 'null'::jsonb)));
  end if;
  return new;
end $$;

create trigger customers_scrub_payment before insert or update on public.customers
  for each row execute function public.scrub_customer_payment();

-- file METADATA only; bytes go to Storage in a later phase
create table public.files (
  team_id      uuid not null references public.teams(id),
  id           text not null,
  customer_id  text,
  kind         text not null default '',
  name         text not null default '',
  mime         text not null default '',
  size_bytes   bigint,
  storage_path text,
  created_by   uuid references public.profiles(id),
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (team_id, id)
);
create trigger files_touch before update on public.files
  for each row execute function public.set_updated_at();

-- Rep live-location / trail points (UNUSED until the phase that ships
-- consented tracking — created now so the isolation rules exist before
-- any location ever lands). Writes are self-only; reads are the rep's
-- own rows or same-team leadership. There is no cross-team path.
create table public.rep_locations (
  team_id    uuid not null references public.teams(id),
  id         bigint generated always as identity,
  profile_id uuid not null references public.profiles(id),
  lat        double precision not null,
  lng        double precision not null,
  accuracy   double precision,
  at_ms      bigint not null,
  created_at timestamptz not null default now(),
  primary key (team_id, id)
);
create index rep_locations_at_idx on public.rep_locations (team_id, at_ms);

-- ====================================================== privileges ======
-- Floor first: anon gets NOTHING, now and for future tables (Supabase's
-- default privileges would otherwise grant to anon on every new table).

revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

grant usage on schema public to authenticated;

-- authenticated gets only the verbs each table is meant to support;
-- rows are then filtered by the policies below. No DELETE anywhere
-- (tombstones), and events can never be UPDATEd (append-only).
revoke all on all tables in schema public from authenticated;
grant select                 on public.teams         to authenticated;
grant select                 on public.profiles      to authenticated;
grant update (name)          on public.profiles      to authenticated;
grant select, insert, update on public.pins          to authenticated;
grant select, insert         on public.events        to authenticated;
grant select, insert, update on public.territories   to authenticated;
grant select, insert, update on public.customers     to authenticated;
grant select, insert, update on public.files         to authenticated;
grant select, insert         on public.rep_locations to authenticated;

-- ============================================================== RLS =====

alter table public.teams         enable row level security;
alter table public.profiles      enable row level security;
alter table public.pins          enable row level security;
alter table public.events        enable row level security;
alter table public.territories   enable row level security;
alter table public.customers     enable row level security;
alter table public.files         enable row level security;
alter table public.rep_locations enable row level security;

-- teams: members see their own team, nothing else; nobody creates or
-- edits teams from a client (no insert/update policy, no grant)
create policy teams_read on public.teams for select to authenticated
  using (id = public.my_team_id() and public.is_active());

-- profiles: always your own row (even when disabled — the app needs to
-- LEARN it's disabled); teammates while active. Updates hit the column
-- grant above, so "name" is the only reachable field no matter what the
-- client sends — role/team_id/disabled cannot be self-served.
create policy profiles_read_own on public.profiles for select to authenticated
  using (id = auth.uid());
create policy profiles_read_team on public.profiles for select to authenticated
  using (team_id is not null
         and team_id = public.my_team_id()
         and public.is_active());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- data tables: team-scoped, active members only; inserts must carry the
-- writer's own team and identity (spoofing either is a policy violation)
create policy pins_read on public.pins for select to authenticated
  using (team_id = public.my_team_id() and public.is_active());
create policy pins_insert on public.pins for insert to authenticated
  with check (team_id = public.my_team_id() and public.is_active()
              and (created_by is null or created_by = auth.uid()));
create policy pins_update on public.pins for update to authenticated
  using (team_id = public.my_team_id() and public.is_active())
  with check (team_id = public.my_team_id() and public.is_active());

create policy events_read on public.events for select to authenticated
  using (team_id = public.my_team_id() and public.is_active());
create policy events_insert on public.events for insert to authenticated
  with check (team_id = public.my_team_id() and public.is_active()
              and (by_user is null or by_user = auth.uid()));
-- no update/delete policy AND no update/delete grant: the knock history
-- cannot be rewritten by any client, malicious or buggy

create policy territories_read on public.territories for select to authenticated
  using (team_id = public.my_team_id() and public.is_active());
create policy territories_insert on public.territories for insert to authenticated
  with check (team_id = public.my_team_id() and public.is_active()
              and (created_by is null or created_by = auth.uid()));
create policy territories_update on public.territories for update to authenticated
  using (team_id = public.my_team_id() and public.is_active())
  with check (team_id = public.my_team_id() and public.is_active());

create policy customers_read on public.customers for select to authenticated
  using (team_id = public.my_team_id() and public.is_active());
create policy customers_insert on public.customers for insert to authenticated
  with check (team_id = public.my_team_id() and public.is_active()
              and (created_by is null or created_by = auth.uid()));
create policy customers_update on public.customers for update to authenticated
  using (team_id = public.my_team_id() and public.is_active())
  with check (team_id = public.my_team_id() and public.is_active());

create policy files_read on public.files for select to authenticated
  using (team_id = public.my_team_id() and public.is_active());
create policy files_insert on public.files for insert to authenticated
  with check (team_id = public.my_team_id() and public.is_active()
              and (created_by is null or created_by = auth.uid()));
create policy files_update on public.files for update to authenticated
  using (team_id = public.my_team_id() and public.is_active())
  with check (team_id = public.my_team_id() and public.is_active());

-- rep locations: a rep writes only their own points into their own team;
-- reads are own rows, or same-team leadership. Cross-team access has no
-- policy path at all.
create policy loc_insert_self on public.rep_locations for insert to authenticated
  with check (team_id = public.my_team_id() and public.is_active()
              and profile_id = auth.uid());
create policy loc_read_own on public.rep_locations for select to authenticated
  using (profile_id = auth.uid());
create policy loc_read_leadership on public.rep_locations for select to authenticated
  using (team_id = public.my_team_id() and public.is_active()
         and public.my_role() in ('leader','manager','owner'));
