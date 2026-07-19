-- ============================================================
-- Social Media University AI — production schema (Supabase/Postgres)
-- This is the graduation path from the local-first v1 app: every
-- table maps 1:1 onto a slice of the on-device SMU.state object.
-- All user tables carry row-level security keyed to auth.uid().
-- ============================================================

-- ---------- users ----------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default '',
  niche         text not null default 'business',
  goal          text not null default 'grow'
                check (goal in ('grow','brand','monetize')),
  xp            integer not null default 0,
  streak        integer not null default 0,
  best_streak   integer not null default 0,
  last_xp_day   date,
  first_day     date not null default current_date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Per-skill XP (8 competencies feed the radar + mentor targeting)
create table public.skill_xp (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  skill    text not null check (skill in
           ('strategy','viral','video','photo','editing','marketing','branding','analytics')),
  xp       integer not null default 0,
  primary key (user_id, skill)
);

-- ---------- learning ----------
create table public.lesson_progress (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  lesson_id   text not null,                 -- curriculum ids, e.g. 'strategy-1-3'
  quiz_score  integer,                       -- 0-100, null = not quizzed
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- One row per XP-earning event: lessons, challenges, drills, quizzes.
-- Powers weekly analytics, streak verification and anti-replay.
create table public.activity_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in
              ('lesson','challenge','editing_drill','photo_drill','marketing_drill','daily_quiz')),
  ref_id      text not null,                 -- content id
  xp          integer not null default 0,
  skill       text,
  day         date not null default current_date,
  created_at  timestamptz not null default now()
);
create index on public.activity_events (user_id, day);
create unique index one_challenge_per_day
  on public.activity_events (user_id, kind, ref_id, day)
  where kind <> 'lesson';

-- ---------- creation & analysis ----------
create table public.brand_profiles (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  data        jsonb not null,                -- identity, audience, positioning, pillars, voice
  updated_at  timestamptz not null default now()
);

create table public.saved_items (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  item_type   text not null check (item_type in
              ('viral','creator','trend','hook','idea','caption','script','plan','other')),
  ref_id      text,                          -- catalog id (viral/creator/trend)
  content     text,                          -- generated text items
  label       text not null default '',
  created_at  timestamptz not null default now()
);
create index on public.saved_items (user_id, created_at desc);

create table public.content_analyses (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  score       integer not null check (score between 0 and 100),
  verdict     text not null,
  breakdown   jsonb not null,                -- per-dimension scores + fixes
  ai_critique text,                          -- optional Claude deep-dive
  created_at  timestamptz not null default now()
);

-- ---------- mentor ----------
create table public.coach_messages (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content     text not null,
  tokens_in   integer,                       -- usage metering
  tokens_out  integer,
  created_at  timestamptz not null default now()
);
create index on public.coach_messages (user_id, created_at);

-- ---------- billing ----------
create table public.subscriptions (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id  text unique,
  stripe_sub_id       text unique,
  plan                text not null default 'free'
                      check (plan in ('free','creator','elite')),
  status              text not null default 'active',
  current_period_end  timestamptz,
  updated_at          timestamptz not null default now()
);

-- Monthly AI usage buckets for plan limits
create table public.ai_usage (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  month     date not null,                   -- first of month
  requests  integer not null default 0,
  tokens    bigint  not null default 0,
  primary key (user_id, month)
);

-- ---------- row-level security ----------
alter table public.profiles          enable row level security;
alter table public.skill_xp          enable row level security;
alter table public.lesson_progress   enable row level security;
alter table public.activity_events   enable row level security;
alter table public.brand_profiles    enable row level security;
alter table public.saved_items       enable row level security;
alter table public.content_analyses  enable row level security;
alter table public.coach_messages    enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.ai_usage          enable row level security;

create policy "own profile"   on public.profiles         for all using (id = auth.uid());
create policy "own skills"    on public.skill_xp         for all using (user_id = auth.uid());
create policy "own lessons"   on public.lesson_progress  for all using (user_id = auth.uid());
create policy "own activity"  on public.activity_events  for all using (user_id = auth.uid());
create policy "own brand"     on public.brand_profiles   for all using (user_id = auth.uid());
create policy "own saves"     on public.saved_items      for all using (user_id = auth.uid());
create policy "own analyses"  on public.content_analyses for all using (user_id = auth.uid());
create policy "own messages"  on public.coach_messages   for all using (user_id = auth.uid());
create policy "own sub"       on public.subscriptions    for select using (user_id = auth.uid());
create policy "own usage"     on public.ai_usage         for select using (user_id = auth.uid());
-- subscriptions/ai_usage writes happen via service-role (Stripe webhook / API routes).

-- ---------- convenience ----------
create or replace view public.leaderboard_weekly as
  select user_id, sum(xp) as xp_week
  from public.activity_events
  where day >= current_date - interval '7 days'
  group by user_id
  order by xp_week desc;
