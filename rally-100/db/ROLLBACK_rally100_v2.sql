-- RALLY 100 v2 — ROLLBACK. Removes automatic team joining (1002) and NOTHING
-- ELSE. Run it as postgres in the Supabase SQL editor; RALLY 100 v1 keeps
-- working throughout.
--
-- It drops join_team, set_auto_join, their three helpers and the settings
-- table, then puts whoami() and owner_state() back exactly as 1001 wrote them
-- (the two bodies below are 1001_rally100_v1.sql's, unchanged; run-tests.sh
-- proves the rally100 catalog afterwards identical to a v1 install). The app
-- then shows "Almost there" to new sign-ups again: it asks join_team only
-- when whoami reports auto_join, which v1's whoami never does.
--
-- IT DOES NOT UNDO TEAM PLACEMENTS. Everyone join_team placed stays on the
-- team: public.profiles.team_id is RALLY's, and taking someone off a team is
-- the owner's act, as it always was. To see who was placed, before or after:
--   select a.created_at, p.email from rally100.audit a
--     join public.profiles p on p.id = a.actor
--    where a.action = 'auto_joined' order by a.created_at;
-- and to take one person off the team:
--   update public.profiles set team_id = null where email = 'their@email.com';
-- The audit rows (auto_joined, auto_join_on, auto_join_off) stay too: the
-- log is append-only history.
--
-- One transaction: without v2 installed it stops at its first statement and
-- changes nothing.

begin;

drop function rally100.set_auto_join(boolean);
drop function rally100.join_team();
drop function rally100._auto_join_json();
drop function rally100._join_refusal(public.profiles);
drop function rally100._auto_join_team();
drop table rally100.settings;

-- whoami and owner_state as 1001 wrote them (privileges are untouched by
-- CREATE OR REPLACE, so they stay exactly as 1001 granted them)
create or replace function rally100.whoami()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid  pg_catalog.uuid := auth.uid();
  v_me   public.profiles;
  v_user pg_catalog.jsonb;
begin
  if v_uid is null then
    raise exception 'rally100: not signed in' using errcode = '42501';
  end if;
  select * into v_me from public.profiles where id = v_uid;
  if not found then
    raise exception 'rally100: not signed in' using errcode = '42501';
  end if;
  if v_me.disabled then
    raise exception 'rally100: disabled' using errcode = '42501';
  end if;
  v_user := pg_catalog.jsonb_build_object(
    'id', v_me.id, 'name', rally100._name(v_me.id), 'email', v_me.email, 'role', v_me.role,
    'team_id', v_me.team_id,
    'team_name', (select t.name from public.teams t where t.id = v_me.team_id));
  if v_me.team_id is null then
    return pg_catalog.jsonb_build_object('user', v_user, 'no_team', true);
  end if;
  return pg_catalog.jsonb_build_object(
    'user', v_user,
    'ack_version_required', 1,
    'ack_accepted', exists (select 1 from rally100.acks a where a.rep_id = v_me.id and a.version = 1));
end $$;

create or replace function rally100.owner_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me public.profiles := rally100._caller();
begin
  perform rally100._require_owner(v_me);
  return pg_catalog.jsonb_build_object(
    'totals', pg_catalog.jsonb_build_object(
      'reps', (select pg_catalog.count(*) from public.profiles p
                where p.team_id is not null and p.role = 'rep' and not p.disabled),
      'persons', (select pg_catalog.count(*) from rally100.persons p where p.merged_into is null),
      'counted', (select coalesce(pg_catalog.sum(c.o_count), 0)
                    from (select distinct e.rep_id from rally100.entries e) x
                    cross join lateral rally100._rep_counts(x.rep_id) c),
      'introductions', (select pg_catalog.count(*) from rally100.introductions i where i.status = 'introduced'),
      'signed', (select pg_catalog.count(*) from rally100.rewards r
                  where r.kind = 'referral' and r.rep_id is not null and r.reversed_at is null)),
    'reps', (select coalesce(pg_catalog.jsonb_agg(rally100._rep_row(p.id, true) order by rally100._name(p.id), p.id),
                             '[]'::pg_catalog.jsonb)
               from public.profiles p where p.team_id is not null),
    'funnel', (select pg_catalog.jsonb_object_agg(s.stage,
                        (select pg_catalog.count(*) from rally100.persons p
                          where p.merged_into is null and p.stage = s.stage))
                 from pg_catalog.unnest(array['added','intro_planned','introduced','meeting_scheduled',
                        'meeting_completed','commitment_confirmed','agreement_signed','start_confirmed',
                        'arrived']::pg_catalog.text[]) s(stage)),
    'outcomes', (select pg_catalog.jsonb_object_agg(o.outcome,
                          (select pg_catalog.count(*) from rally100.persons p
                            where p.merged_into is null and p.outcome = o.outcome))
                   from pg_catalog.unnest(array['follow_up','not_interested','do_not_contact']::pg_catalog.text[]) o(outcome)),
    'rewards', (select pg_catalog.jsonb_object_agg(st.status, pg_catalog.jsonb_build_object(
                         'count', (select pg_catalog.count(*) from rally100.rewards r
                                    where r.status = st.status and r.reversed_at is null),
                         'amount_cents', (select coalesce(pg_catalog.sum(r.amount_cents), 0) from rally100.rewards r
                                           where r.status = st.status and r.reversed_at is null)))
                  from pg_catalog.unnest(array['in_progress','ready','needs_correction','approved','paid']::pg_catalog.text[]) st(status)),
    'payments', (select coalesce(pg_catalog.jsonb_agg(x.obj order by x.paid_on desc, x.updated_at desc), '[]'::pg_catalog.jsonb)
                   from (select r.paid_on, r.updated_at, pg_catalog.jsonb_build_object(
                                  'reward_id', r.id, 'kind', r.kind, 'rep_id', r.rep_id,
                                  'rep_name', rally100._name(r.rep_id),
                                  'person_name', case when r.person_id is not null then rally100._person_name(r.person_id) end,
                                  'incentive_name', (select i.name from rally100.incentives i where i.id = r.incentive_id),
                                  'amount_cents', r.amount_cents, 'paid_on', r.paid_on, 'paid_method', r.paid_method,
                                  'paid_reference', r.paid_reference, 'paid_by_name', rally100._name(r.paid_by),
                                  'reversed', r.reversed_at is not null) as obj
                           from rally100.rewards r where r.status = 'paid'
                          order by r.paid_on desc, r.updated_at desc limit 50) x),
    'leaders', (select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                         'id', l.id, 'name', rally100._name(l.id),
                         'team_name', (select t.name from public.teams t where t.id = l.team_id),
                         'open_items', (select (select pg_catalog.sum(pg_catalog.jsonb_array_length(q.value))
                                                  from pg_catalog.jsonb_each(rally100._queues(l)) q))::integer)
                         order by rally100._name(l.id), l.id), '[]'::pg_catalog.jsonb)
                  from public.profiles l
                 where l.role in ('leader', 'manager') and l.team_id is not null and not l.disabled),
    'pending_signups', (select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                                 'id', p.id, 'name', rally100._name(p.id), 'email', p.email,
                                 'created_at', p.created_at) order by p.created_at, p.id), '[]'::pg_catalog.jsonb)
                          from public.profiles p where p.team_id is null and not p.disabled),
    'incentives', (select coalesce(pg_catalog.jsonb_agg(rally100._incentive_json(i.id) order by i.created_at, i.id),
                                   '[]'::pg_catalog.jsonb)
                     from rally100.incentives i));
end $$;

commit;
