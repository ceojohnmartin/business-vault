-- TEST ONLY — a local-Postgres stand-in for the parts of a Supabase
-- project that the migration and the RLS tests lean on. Never run this
-- against a real project (Supabase already provides all of it).

-- the three PostgREST roles, shaped like Supabase's
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

-- minimal auth schema: the users table the profile trigger fires on, and
-- auth.uid() reading the JWT claims exactly the way Supabase's does
create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key,
  email              text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select ((nullif(current_setting('request.jwt.claims', true), '')::jsonb)->>'sub')::uuid
$$;

grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

-- Supabase grants broadly to anon/authenticated by default (schema usage
-- + default privileges on new tables). Mimic that BEFORE the migration
-- runs, so the migration's explicit revokes are proven to matter rather
-- than passing vacuously.
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;

-- realtime schema stand-in (Phase 3): the messages table RLS policies
-- attach to, the topic() helper reading the per-join GUC the way
-- Supabase's authorizer sets it, and a send() that just records the
-- broadcast so tests can assert on it.
create schema if not exists realtime;
create table if not exists realtime.messages (
  id bigint generated always as identity primary key,
  topic text not null,
  extension text not null default 'broadcast',
  event text,
  payload jsonb,
  private boolean not null default true,
  inserted_at timestamptz not null default now()
);
create or replace function realtime.topic() returns text
language sql stable as $$ select current_setting('realtime.topic', true) $$;
create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true)
returns void language sql security definer as $$
  insert into realtime.messages (topic, extension, event, payload, private)
  values (topic, 'broadcast', event, payload, private)
$$;
grant usage on schema realtime to anon, authenticated;
grant select on realtime.messages to authenticated;
alter table realtime.messages enable row level security;
