# Business Vault

Private, installable web apps for building, buying and running businesses. Most need no account or server: everything runs in your browser and your data stays on your device. RALLY 100 is the exception: it signs in with RALLY accounts and keeps its data on RALLY's Supabase backend.

---

## 🏛 Business Vault — learn the game

The business-education app at the root of this repo: the Library with full book deep-dives, Podcast University, the Numbers Gym & Daily Ten drills, Roleplay Arena, Owner's Scoreboard and more.

**Open it:** https://ceojohnmartin.github.io/business-vault/

## 💼 Deal Vault — buy the business

A complete acquisition-underwriting platform in [`deal-vault/`](deal-vault/). Enter or import a business listing and it works the deal like a private-equity analyst:

- **Quick Analysis** in ~5 minutes, or a **12-step Full Underwriting** — financials, add-back normalization, SBA/seller-note financing, industry deep-dives (22 templates), operations, location, lease, risks and stress-tested scenarios.
- A transparent **Deal Score (0–100)** with verdicts from *Avoid* to *Exceptional Deal*, automatic deal-breaker overrides, and a data-confidence score that flags unverified numbers.
- **Make This Deal Work** (the exact price or terms that fix a weak deal), an **Offer Builder** with LOI prep sheet, deal comparison, watchlist, and print-to-PDF acquisition reports.
- Three clearly-labeled **fictional demo deals** load on first run so you can explore a great, a borderline, and a bad acquisition.

**Open it:** https://ceojohnmartin.github.io/business-vault/deal-vault/ *(once this branch is merged — or its own address if it moves to its own repository)*

Full feature list, engine details and disclaimers: [`deal-vault/README.md`](deal-vault/README.md)

## 🗺 Meridian — sell the neighborhood

A premium door-to-door pest control sales app in [`meridian/`](meridian/): a dark knocking map with disposition pins (Sold green · Go Back purple · Not Home yellow · Not Interested red with reason capture · Do Not Knock black), decision-maker (DM) tracking with a Doors→Convos→DMs→Sales funnel, streaks and commission tracking, team rankings, a pest Field Guide with door pitches, and a full on-the-glass agreement flow with signature — queued for FieldRoutes sync. Research and product blueprint in [`pest-sales-app/`](pest-sales-app/).

**Open it:** https://ceojohnmartin.github.io/business-vault/meridian/ *(once this branch is merged)*

## 🐾 RALLY 100 — recruit the warm network

A gamified recruiting app in [`rally-100/`](rally-100/), built on the same Supabase backend and accounts as RALLY. New reps light a 10×10 Wall by remembering 100 real people they know, through short memory Scenes and 60-second Sprints; every saved contact flows into a shared recruiting CRM. Leaders work a queue of introductions, meetings and the four referral confirmations, run the in-person spot-check and approve rewards. The owner sees every team, marks pay issued, creates prize incentives with pictures, and places new sign-ups on a team. The confirmed cash rewards ($100 for a complete list, $100 per qualifying referral) are tracked on an append-only history and shown to reps only once approved, as "Pending pay" and then "Pay issued".

- **The app:** [`rally-100/app/`](rally-100/app/), an installable phone-first web app (rep game, Leader Workspace, Owner Dashboard). **Not switched on yet:** the owner applies one database script and exposes it in Supabase first; see [`rally-100/app/SETUP.md`](rally-100/app/SETUP.md). Once switched on and merged, it opens at https://ceojohnmartin.github.io/business-vault/rally-100/app/
- **The backend:** [`rally-100/db/`](rally-100/db/), its own `rally100` database schema reached only through checked server functions; RALLY's tables and rules are untouched (proved by RALLY's own test suite on the combined database).
- **The rules:** [`rally-100/BLUEPRINT.md`](rally-100/BLUEPRINT.md). The original clickable prototype stays in [`rally-100/prototype/`](rally-100/prototype/).

---

*These apps install to your phone's home screen (Add to Home Screen) and work offline. Nothing here is legal, tax, accounting, lending or investment advice.*
