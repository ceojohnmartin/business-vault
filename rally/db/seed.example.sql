-- RALLY — one-time team bootstrap (the "small controlled bootstrap record").
-- Run AFTER the owner has created their account through the RALLY sign-up
-- screen (that's what makes their profile row exist).
--
-- 1. Replace the email below with the owner's sign-in email.
-- 2. Run this once in the Supabase SQL editor.
--
-- It creates the team and promotes that one profile to owner. Every other
-- signup stays role 'rep' with no team until leadership places them —
-- there is deliberately NO self-serve path onto a team.

do $$
declare
  tid uuid;
begin
  insert into public.teams (name) values ('RALLY') returning id into tid;
  update public.profiles
     set role = 'owner', team_id = tid
   where email = 'OWNER_EMAIL_HERE';
  if not found then
    raise exception 'No profile with that email — sign up inside RALLY first, then run this.';
  end if;
end $$;

-- To place a rep on the team later (also server-side, also one line):
--   update public.profiles set team_id = (select id from public.teams limit 1)
--    where email = 'rep@example.com';
-- To make someone a leader or manager:
--   update public.profiles set role = 'leader' where email = 'rep@example.com';
-- To shut an account out of team data immediately:
--   update public.profiles set disabled = true where email = 'rep@example.com';
