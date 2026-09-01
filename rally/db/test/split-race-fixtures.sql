-- minimal people and a team, for running split-race-test.sh standalone
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-a000-000000000001','owner-a@x.com','{"name":"Owner A"}'),
  ('00000000-0000-4000-a000-000000000002','lead-a@x.com', '{"name":"Lead A"}')
on conflict (id) do nothing;
insert into public.teams (id, name)
  values ('11111111-1111-4111-a111-111111111111','Race Team')
on conflict (id) do nothing;
update public.profiles set team_id = '11111111-1111-4111-a111-111111111111', role = 'owner'
  where email = 'owner-a@x.com';
update public.profiles set team_id = '11111111-1111-4111-a111-111111111111', role = 'leader'
  where email = 'lead-a@x.com';
