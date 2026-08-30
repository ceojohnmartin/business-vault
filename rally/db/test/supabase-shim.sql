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
