-- RALLY 100 — DEV fixtures for the local stand-in (app/dev/server.mjs). LOCAL
-- DATABASES ONLY: app/dev/setup-db.sh applies it to rally100_dev after the
-- Supabase shim, every RALLY migration and 1001. Never run it on a real
-- project. Every name and email here is fictional.
--
-- Accounts arrive through auth.users exactly as GoTrue inserts them, so
-- RALLY's signup trigger gives each one the least-authority profile (role
-- rep, no team). Placement and roles are then set server-side, the same way
-- rally/db/seed.example.sql does it. Passwords live in app/dev/users.json.

insert into auth.users (id, email, raw_user_meta_data) values
  ('d0000000-0000-4000-8000-000000000001', 'owner@rally.test',   '{"name":"Morgan Hale"}'),
  ('d0000000-0000-4000-8000-000000000002', 'leader@rally.test',  '{"name":"Dana Cole"}'),
  ('d0000000-0000-4000-8000-000000000003', 'rep1@rally.test',    '{"name":"Tyler Nash"}'),
  ('d0000000-0000-4000-8000-000000000004', 'rep2@rally.test',    '{"name":"Sam Ortiz"}'),
  ('d0000000-0000-4000-8000-000000000005', 'rep3@rally.test',    '{"name":"Jo Park"}'),
  ('d0000000-0000-4000-8000-000000000006', 'leaderb@rally.test', '{"name":"Kim Reyes"}'),
  ('d0000000-0000-4000-8000-000000000007', 'repb@rally.test',    '{"name":"Max Bell"}');

do $$
declare
  ta uuid;
  tb uuid;
begin
  insert into public.teams (name) values ('RALLY') returning id into ta;
  insert into public.teams (name) values ('RALLY B') returning id into tb;
  update public.profiles set role = 'owner', team_id = ta where email = 'owner@rally.test';
  update public.profiles set role = 'leader', team_id = ta where email = 'leader@rally.test';
  update public.profiles set team_id = ta
   where email in ('rep1@rally.test', 'rep2@rally.test', 'rep3@rally.test');
  update public.profiles set role = 'leader', team_id = tb where email = 'leaderb@rally.test';
  update public.profiles set team_id = tb where email = 'repb@rally.test';
  if (select count(*) from public.profiles where team_id is not null) <> 7 then
    raise exception 'dev seed: expected 7 placed profiles';
  end if;
end $$;
