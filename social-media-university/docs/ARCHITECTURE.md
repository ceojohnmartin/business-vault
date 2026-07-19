# Social Media University AI — Product & Technical Architecture

## 1. What this product is

A premium AI education platform that turns one person into an elite social media
marketer, content creator, brand strategist, photographer, videographer, editor and
marketer — with an AI mentor at the center. Think **MasterClass × Coursera × ChatGPT ×
Notion × YouTube Studio**, built as one coherent, private product.

**Core loops:**

1. **Learn** — an 11-school university (~300 lessons, Beginner → Master) with quizzes,
   XP, ranks and skill tracking across 8 competencies.
2. **Train daily** — a deterministic daily program: lesson, challenge, creator study,
   viral breakdown, craft drills and a quiz, re-generated every day.
3. **Create** — a studio of generators (hooks, ideas, scripts, captions, calendars,
   shot lists, B-roll, edit recipes) powered by a 400+-template playbook library and,
   optionally, live Claude generations personalized to the user's brand.
4. **Analyze** — a content analyzer that scores videos 0–100 across 10 dimensions with
   prioritized fixes, plus AI deep critiques and thumbnail vision analysis.
5. **Study intelligence** — a viral-format database, creator library and trend
   intelligence system, each explaining *why* things work and *how* to adapt them.
6. **Build the brand** — a brand-builder wizard whose output personalizes every other
   feature and the mentor itself.

## 2. The founder decision: deployment architecture

This repository ships static, installable web apps on GitHub Pages (see the two
existing apps at the repo root and `deal-vault/`). A server-rendered Next.js +
Supabase stack **cannot run on this hosting**, and the owner's real usage pattern is
"open it on my phone, installed from the home screen, works offline."

So v1 is deliberately a **local-first, zero-backend PWA**:

- **Frontend:** vanilla ES2020 + a hand-built design system (no build step — what you
  push is what ships; nothing to break).
- **State:** `localStorage` under `smu_*` keys only. No accounts, no tracking; export /
  import backup built in. This app is **fully isolated** from every other app in this
  repository — no shared code, links, storage keys or service-worker caches.
- **AI:** direct browser calls to the Anthropic Messages API with the **user's own API
  key**, stored only on-device (`anthropic-dangerous-direct-browser-access`). Every AI
  feature has a first-class offline fallback, so the app is complete without a key.
- **Offline:** dedicated service worker (`smu-v1` cache, network-first) scoped to this
  folder.

Section 7 documents the full Next.js/Supabase architecture this product graduates to
the day it becomes a multi-user SaaS — the domain model was designed so that migration
is mechanical.

## 3. Frontend architecture

```
social-media-university/
├── index.html              app shell; loads data → engine → views
├── css/app.css             design system (tokens, components, motion)
├── js/
│   ├── core.js             state, persistence, hash router, gamification,
│   │                       curriculum helpers, seeded daily engine, markdown-lite
│   ├── ui.js               component library: icons, rows, sheets, toasts,
│   │                       progress rings, 8-axis skill radar, clipboard
│   ├── ai.js               Claude client (streaming SSE, vision, mentor context)
│   ├── app.js              chrome (topbar/tabbar), delegation, onboarding, SW boot
│   ├── views/              one module per screen: today, learn, coach, studio,
│   │                       intel, profile — registered on SMU.views, hash-routed
│   └── data/               the content layer (~16 files, pure data, no logic)
├── sw.js · manifest.webmanifest · icons
├── docs/                   this file, CONTENT-SPEC.md
└── db/schema.sql           production schema for the SaaS graduation path
```

**Data flow:** `js/data/*` files populate the global `SMU_DATA` catalog →
`core.js` exposes pure helpers over it → views render HTML strings from catalog +
`SMU.state` → user actions mutate `SMU.state` → `SMU.save()` persists → chrome
refreshes. One-way, no framework, no virtual DOM — first paint is instant even on a
mid-range phone.

**Routing:** hash-based (`#/learn/strategy/strategy-1/strategy-1-1`), so it works on
any static host with zero configuration and survives full offline reloads.

**Gamification model:** XP → 5 ranks (Beginner 0 / Intermediate 1,200 / Advanced 3,500
/ Expert 7,500 / Master 14,000); per-skill XP across 8 competencies feeds the radar
and the mentor's "weakest skills" targeting; streaks count consecutive days with any
earned XP.

**Daily engine:** a `mulberry32` PRNG seeded by the day number picks the daily
challenge, creator, viral breakdown, drills and quiz — deterministic for the whole
day, different tomorrow, identical across reloads, and it works offline.

## 4. Design system

Dark "ink & champagne" luxury aesthetic: near-black layered surfaces, a
`#f0dcae → #d9b36c → #a3773d` gold ramp for everything that matters, Fraunces (an
editorial serif) for display type over Inter for UI, JetBrains Mono for numbers.
Glassy translucent navigation (bottom tab bar on phones, side rail ≥ 980px), 20px
radii, spring-feel `cubic-bezier(.32,.72,.28,1)` motion, safe-area aware, honors
`prefers-reduced-motion`. Per-school accent hues are data-driven (`--hue`) so the
palette stays coherent as content grows.

## 5. AI system design

- **Mentor context assembly:** every request carries a system prompt = mentor persona
  + live student profile (name, niche, goal, rank, XP, streak, weakest skills, brand
  profile). The mentor is *always* personalized without the user re-explaining.
- **Chat:** streaming SSE parsed incrementally into the live bubble; history capped
  and persisted locally.
- **Tool generations:** each studio tool builds a purpose-specific prompt (framework,
  niche, topic, brand voice) — one-shot `ask()` calls.
- **Vision:** thumbnail critique sends the image as a base64 block for CTR-psychology
  analysis.
- **Graceful degradation:** `NoKeyError` branches every feature to its offline
  engine — playbook-driven generators, an expert-system analyzer, a rule-based weekly
  plan — so the free experience is genuinely excellent rather than a paywall.
- **Model policy:** defaults to `claude-opus-4-8`; user-selectable Sonnet/Haiku for
  cost control. Key is never transmitted anywhere except `api.anthropic.com`.

## 6. Content architecture

All teaching content is data, not code, governed by `docs/CONTENT-SPEC.md`:
11 curriculum schools (5 courses each, Beginner→Master, 25–30 lessons per school,
every lesson with sections, takeaways, action steps, a 3-question quiz and a drill),
24 viral-format breakdowns, 18 creator files, 22 trend entries, 120 daily
challenges/drills, a 60-question quiz bank, and a 400+-template generator playbook.
Content ships in the bundle → zero latency, fully offline, versioned in git like code.

## 7. Scale-up blueprint (Next.js + Supabase SaaS)

When this becomes a paid multi-user product, the graduation path is:

**Stack:** Next.js 15 (App Router, RSC) · TypeScript · Tailwind + shadcn/ui ·
Supabase (Postgres + Auth + Storage + RLS) · Anthropic API server-side · Stripe.

```
app/
├── (marketing)/            landing, pricing
├── (app)/
│   ├── today/ learn/ coach/ studio/ intel/ profile/   ← same IA as v1
│   └── layout.tsx          auth-gated shell
├── api/
│   ├── coach/route.ts      streaming chat (Anthropic SDK, server key)
│   ├── generate/route.ts   studio tool generations
│   ├── analyze/route.ts    analyzer + vision critiques
│   └── webhooks/stripe/route.ts
lib/  (ai/, db/, gamification/ — ports of core.js logic)
content/  (the same data files, typed, or migrated into Postgres)
```

**Key moves:**

- `SMU.state` maps 1:1 onto the tables in `db/schema.sql` (profiles, lesson_progress,
  activity_events, saved_items, brand_profiles, analyses, coach_messages,
  subscriptions) with row-level security per user.
- The AI layer moves server-side: the platform's Anthropic key, per-plan rate limits,
  prompt caching on the shared mentor system prompt, usage metering per user.
- Curriculum stays file-based (typed TS modules reviewed like code) with reads at
  build time; community/UGC features would move it into Postgres.
- Auth: Supabase email + OAuth; anonymous-device mode preserved as a trial tier by
  importing a v1 backup JSON.
- Pricing envelope: $832/mo ($10k/yr) positioning → mentor chat, unlimited
  generations, video-analysis quota; costs dominated by Claude usage, controlled via
  model routing (Haiku for generations, Opus for mentoring/critiques).

## 8. Privacy & security posture (v1)

- No servers, no analytics, no cookies; all data on-device with export/import.
- Only outbound calls: Google Fonts (cached after first load) and `api.anthropic.com`
  (only when the user adds their own key).
- All rendered dynamic text passes through an HTML-escaping markdown-lite renderer.
- The API key input is `type=password`, stored in `localStorage` on the user's device
  only, and shown with an explicit explanation of exactly where it goes.
