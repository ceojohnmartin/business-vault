# 🎓 Social Media University AI

A premium, private AI education platform that teaches you to become an elite social
media marketer, content creator, brand strategist, photographer, videographer, editor
and marketing expert — with an AI mentor at the center. MasterClass-level curriculum,
YouTube-Studio-style analysis tools, and a ChatGPT-class coach, in one installable app.

**No accounts. No servers. No tracking.** Everything runs in your browser and your
data stays on your device. This app is fully standalone — it shares nothing with any
other app in this repository.

**Open it:** `https://<your-pages-domain>/business-vault/social-media-university/`
*(once this branch is merged — install it via Add to Home Screen; it works offline)*

---

## What's inside

### ☀️ Today — Daily Training System
A fresh program every day: today's lesson, a daily challenge, a creator to study, a
viral-format breakdown, editing / photography / marketing drills, and a 5-question
quiz. Streaks, XP and ranks (Beginner → Intermediate → Advanced → Expert → Master)
keep the habit compounding.

### 🎓 Learn — The University
**11 schools, ~300 lessons, Beginner → Master:** Social Media Strategy · Viral Content
Science · Instagram & Reels · TikTok · YouTube & Shorts · LinkedIn, X & Beyond ·
Photography · Cinematography · Video Editing (CapCut, Premiere, Resolve, Final Cut) ·
Marketing & Money · Personal Brand. Every lesson has key takeaways, do-it-today action
steps, a quiz and a practice drill, and feeds an 8-skill mastery radar.

### ✦ Coach — Your AI mentor
A personal mentor that knows your niche, goal, rank, streak, weakest skills and brand
— and coaches accordingly: feedback, plans, hooks, audits, answers. Works two ways:
- **With a Claude API key** (yours, stored only on-device): full streaming
  conversational mentor + personalized weekly improvement plans.
- **Without a key:** a playbook-driven mentor, skill assessments and rule-based weekly
  plans — still genuinely useful.

### 🎬 Studio — Create & analyze
- **Hook Lab** (120+ battle-tested hooks) · **Idea Engine** · **Script Writer** (10
  viral frameworks) · **Caption Studio** · **Content Calendar** · **Storyboard & Shot
  Lists** · **B-Roll Bank** · **Edit Recipes** (CapCut & pro apps)
- **Content Analyzer** — a guided audit that scores your video 0–100 across Hook,
  Retention, Story, Editing, Visuals, Audio, Captions, CTA, Packaging and Pacing, with
  prioritized fixes and better-hook suggestions. AI deep critique + thumbnail vision
  analysis with a key.
- **Brand Builder** — a 5-step wizard that produces your brand profile (identity,
  audience, positioning, pillars, voice) and personalizes every tool and the mentor.

### 📡 Intel — Study what works
- **Viral Database** — 24 viral-format breakdowns (hook, first 3 seconds, retention,
  edit, camera, story, emotion, caption, CTA, why it works, how to recreate it) across
  luxury, business, sales, fitness, automotive and lifestyle niches.
- **Creator Library** — 18 files on world-class creators: brand, style, editing,
  storytelling, growth, monetization, audience psychology, and what to steal.
- **Trend Intelligence** — why each trend works, how to adapt it, and whether it fits
  *your* brand.
- **Saved** — your bookmarked breakdowns, creators, trends and generated content.

### 👤 Profile
Progress analytics, weekly activity chart, skill radar, achievements, backup
export/import, and settings (including your optional Claude API key — stored only on
this device and sent only to Anthropic).

---

## Using the AI features

1. Get an API key at [console.anthropic.com](https://console.anthropic.com).
2. Profile → Settings → paste the key → *Test connection*.
3. That's it. The key never leaves your device except to call `api.anthropic.com`
   directly. Remove it any time. Every feature also works without one.

## Tech

Vanilla JS + hand-built design system, zero dependencies, zero build step. Hash
routing, localStorage persistence (namespaced `smu_*`), dedicated service worker
(offline-first), installable PWA. Full architecture, AI-system design and the
Next.js + Supabase SaaS graduation blueprint: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
· production schema: [`db/schema.sql`](db/schema.sql) · content model:
[`docs/CONTENT-SPEC.md`](docs/CONTENT-SPEC.md).

*Education, not guarantees: results depend on your reps. Nothing here is legal or
financial advice.*
