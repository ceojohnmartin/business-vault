# KNOCKOUT — The Game Plan

**The door-to-door pest control sales platform built to beat Enzy, SalesRabbit, SPOTIO, and FieldRoutes' own apps — on reliability, beauty, and the rep experience.**

*Research completed 2026-08-27. Full competitor teardowns with sources in [RESEARCH.md](./RESEARCH.md). No code written yet — this is the blueprint.*

---

## 1. The one-line thesis

Every competitor bleeds users on the same five wounds — lost leads from bad sync, login loops in the field, laggy pins, crashes during summer peak, and GPS drift — while charging ~$100/rep/month for a stack of add-ons. We win by building a **local-first, native-feeling, dark-and-gorgeous app where the map opens instantly offline, a signup can never be lost, the close pushes straight into FieldRoutes, and the rep watches their commission update live.**

Reliability is the brand. Beauty is the proof.

---

## 2. Name & brand

### Primary recommendation: **KNOCKOUT**

- It's literally what reps do all day (knock out doors, knock out a neighborhood) and what the product does to the competition.
- One word, punchy, masculine energy that fits D2D sales culture, zero explanation needed on the door of an office.
- Natural gamification vocabulary falls out of it for free: **Rounds** (blitz sessions), **the Belt** (weekly champion), **KOs** (closes), **the Ring** (leaderboard), **Undefeated** (streaks).
- Tagline candidates: *"Knock out the neighborhood."* / *"Every door. Every day. Undefeated."* / *"The last sales app you'll ever need."*
- Domains to check: `knockout.app`, `getknockout.com`, `knockoutsales.com`, `joinknockout.com`.

### Backups (in order)
1. **Mantis** — the apex predator of the insect world; sleek, sharp, perfect pest tie-in without being gross.
2. **Hive** — the team-as-colony metaphor; warm, social, gamification-friendly.
3. **Threshold** — the literal doorstep; premium/minimal vibe.
4. **Colony** — territory + team + pest triple meaning.

*(Trademark/App Store search required before final commitment — flagged as a pre-build task.)*

---

## 3. What the research proved (the openings)

### Enzy (2.9★ on Android)
- It's an **Angular web app wrapped in Capacitor** — not native. That's the structural root of the Android freezes, hot phones, dead batteries, and reps being told to "just buy an iPhone." A truly native-feeling map is a provable, demo-able wedge.
- Reps without admin access call it "borderline useless" — Enzy sells to execs, not reps.
- Territory borders sometimes don't even render; users beg for Zillow-style property data on pins and don't get it.
- Zero G2/Capterra reviews, zero Reddit presence — the public evaluation record is uncontested ground we can own.
- What they do well (and we must match): always-on competitions/incentives with prize fulfillment, recognition broadcasts, recruiting/onboarding module, sub-month FieldRoutes integration turnaround. Their study: gamification lifts sales/rep ~21%.

### SalesRabbit (~$100/rep/mo fully loaded)
- $49–59 base + $19 DataGrid AI + $13 contracts + $19 weather + $399 setup. **We bundle everything at one price.**
- Documented complaints: "~20% of my leads have notes randomly deleted," "doom loop login," pins that "conglomerate somewhere else," freezes 3× per 6-hour shift, server capacity failures during **summer 2024 peak** — the industry's whole revenue window.
- Their moat is DataGrid AI (1,700-variable buyer propensity scores). We match with third-party data (Scout/ATTOM/Melissa) + build our own knock-outcome telemetry moat.

### FieldRoutes (their own mobile app: 1.9★)
- The back-office engine is strong and entrenched (1,700+ pest companies), but the sales app is the weakest thing they ship. **We don't compete with FieldRoutes — we ride it.**
- **The API confirms the entire door-close is buildable**: `customer/create` → tokenized `paymentProfile/create` (autopay) → `subscription/create` (with `soldBy` commission attribution) → `spot/reserve` → `appointment/create` on a real tech route → `document/createEncoded` (signed agreement PDF) → `note/create` with `showTech=1`. The signed customer appears on the tech's FieldRoutes app, forever. Exactly the user's requirement.
- Auth is per-office API key/token issued by FieldRoutes support (the same pattern RepCard/SalesRabbit use — routine and permitted). Default limits: 3,000 writes/office/day at 60/min — a sale is ~4–6 writes, so ~500+ sales/office/day before requesting a raise.

### Aptive's internal apps
- Their sales app was built **native + offline-first specifically because suburban neighborhoods have dead zones** — validated architecture decision we copy.
- Commissions are server-authoritative because commission disputes are the #1 rep trust issue industry-wide ("they'll change the formula"). **A live, transparent, auditable commission screen is a rep-loyalty weapon nobody ships.**
- The beloved features: the bug sheet (pest ID on the door = instant credibility), real videos of techs performing service (a rep who's never sprayed can describe the service believably), the customer-facing "footsteps" GPS map of where the tech treated. Aptive's customer app has great ideas at 1.3★ execution — ideas validated, execution open.

### The rest
- SPOTIO: crashes, random logouts, holiday lockouts, map "takes forever to load."
- Budget tier (Knockio, $20–25/rep): no data, no gamification, no reliability story — price-only players.
- Siro charges **$200–350/rep/month** just for in-pocket AI recording/coaching of door conversations — we can fold that category in natively.
- Nobody in the market ships **per-door best-time-to-knock / answer-propensity-by-hour**. Our own knock telemetry builds that moat automatically.

---

## 4. The product — six pillars

### Pillar 1: THE MAP (knocking & turf)
The map is the home screen and it must feel like Zillow-meets-Uber, never like a CRM.

- **Custom dark Mapbox style**: muted, desaturated, brand-tinted basemap with POI noise stripped so disposition pins are the loudest thing on screen. GPU symbol-layer pins + clustering — buttery at 10,000+ pins where SalesRabbit lags at hundreds.
- **Reads from local SQLite, zero network roundtrip** — the map opens instantly in a dead zone. Offline tile packs auto-download per assigned territory.
- **Disposition system**: one-tap knock outcomes (Not Home, Callback, Not Interested, No Soliciting, DNK, **SOLD**) with per-company custom statuses. Pin colors are the app's entire chromatic language (see §5). Long-press = drop pin with haptic tick; tap = bottom-sheet lead card (Zillow pattern) with camera padding so the pin stays visible.
- **Turf management that actually works**: managers draw territories (that render!), assign with overlap prevention, watch live rep location during blitzes, and see per-turf conversion heat afterward.
- **Address truth**: pins snap to parcel/address points (not raw GPS), with one-tap address correction — killing the #1 GPS-drift complaint class.
- **Smart knocking (the moat)**: homeowner/property data on every pin (owner name, years in home, home value, permits — via ATTOM/Scout-class providers), propensity scores, and — unique to us — **best-time-to-knock per door**, learned from our own knock-outcome telemetry (every knock in the system trains it; compounds forever).
- **Storm/weather layer** included, not a $19 add-on.

### Pillar 2: THE CLOSE (door → FieldRoutes, bulletproof)
From "what's your last name?" to a scheduled first service in under 3 minutes, even with zero bars.

1. **Lead card → Agreement**: plan picker (initial + recurring pricing with discount framing), pest concerns checklist, photos of problem areas.
2. **E-sign on the glass**: self-built, on-brand signature capture with a full ESIGN/UETA evidence chain (intent tap, electronic-business consent, document hash, timestamp+geo, emailed PDF copy, 3-day cooling-off notice surfaced). Works 100% offline.
3. **Payment**: card tokenized against the office's gateway (NMI/Braintree/Worldpay per their FieldRoutes config) for autopay; ACH mandate for recurring (0.8% capped at $5 vs 2.9% cards — we make companies money); Stripe Tap to Pay optionally for day-one initial-service collection. Offline degrade: signature + contract commit locally, payment capture auto-queued for reconnect.
4. **Schedule the first service on the doorstep**: live `spot/search` → `spot/reserve` shows the customer real openings ("Thursday 8–10am work?"), then `appointment/create` pins it to a tech's actual route. **The tech sees the new stop in their app immediately.**
5. **The pipeline is a durable queue**: every close is a local transaction that survives app kill, phone death, and reboot; syncs with exponential backoff; visible-but-calm status chip ("2 pending"); server-side verification confirms the customer exists in FieldRoutes before the rep's "SOLD" is finalized. **A signup can never be lost.** This sentence is the brand.
6. **Backend-agnostic core**: FieldRoutes connector first; PestPac, Briostack, GorillaDesk, and ServiceTitan connectors on the same abstraction layer later. Our own Postgres keeps a permanent, company-owned copy of every customer regardless of back-office ("saves the data forever" — literally).

### Pillar 3: THE GAME (Enzy-grade culture, Duolingo-grade mechanics)
- **Live leaderboards** reps trust because sync never lies — rep/team/office/region, filterable by doors, convos, sets, closes, revenue.
- **Rounds (blitz competitions)**: head-to-head brackets, team vs team, office vs office, "first to X" spot prizes — spun up by a manager in 60 seconds, with prize fulfillment tracking.
- **Leagues with promotion/relegation** (Duolingo model) so mid-tier reps compete against peers, not the office legend. "You vs You" personal-best mode protects the bottom 70%.
- **Streaks with freezes**: knocking-day streaks with earned freeze tokens for weather/days off — loss-aversion without morale damage.
- **The KO moment**: on every close — full-screen Rive celebration, one perfect success haptic, animated commission count-up, instant team-feed broadcast with kudos reactions. Recognition is immediate, specific, and public.
- **Live Activity / Dynamic Island** (nobody has this): today's doors/convos/closes and your race position on the lock screen all day.
- **TV mode**: office-screen live leaderboard for the morning meeting.

### Pillar 4: THE BRAIN (bug sheet, videos, AI — the Aptive features on steroids)
- **The Bug Sheet, weaponized**: a gorgeous, offline-cached pest library — photo ID cards, behavior/season/danger facts, region-aware "active now" sorting — and each pest links directly to **the pitch** (what to say) and **the treatment video** (what we'll do). Rep flips the phone around and shows the homeowner. Credibility = closes.
- **Real service videos**: 30–60s clips of actual techs performing each treatment (perimeter spray, de-web, granules, rodent stations), shown on the door and doubling as new-rep/new-tech training.
- **Pitch library & objection playbook**: searchable scripts, top-rep recordings, "what to say when they say X."
- **AI coach (folds in Siro's $200+/mo category)**: optional in-pocket doorstep recording → auto-transcription → auto-disposition, objection-searchable library of the team's best doors, and per-rep coaching ("you're losing people at price framing"). Phase 2, but architected in from day one.

### Pillar 5: THE MONEY (the trust weapon)
- **Live commission tracker**: server-authoritative like Aptive's, but **fully visible to the rep** — every sale, the formula applied, upfront vs backend split, projected paycheck, animated Robinhood-style earnings graph. Auditable line by line.
- Company-configurable comp plans (upfront %, backenders, overrides for team leads).
- This single screen answers the industry's #1 rep trust complaint. Reps will demand their company switch to us.

### Pillar 6: THE OFFICE (manager web + the service side)
- **Web dashboard**: turf drawing, comp/blitz builder, comp-plan config, real-time field view, funnel analytics (doors→convos→sets→closes by rep/turf/time), recruiting pipeline & onboarding checklists (Enzy's differentiator, matched), FieldRoutes connection health panel.
- **Service-side visibility v1**: because we write into FieldRoutes, techs use their existing FieldRoutes app on day one — zero adoption friction.
- **v2/v3**: our own lightweight tech companion (stable routes — no mid-day churn, the #1 Aptive tech complaint — service photos, chemical logging) and a customer app with the "footsteps" treated-area map, treatment photos, working reservice booking and messaging — the 5★ execution of Aptive's 1.3★ ideas.

---

## 5. Design system — "sexy" made specific

**Direction: dark-first, one electric accent, semantic color discipline, physics motion.** The references are Whoop, Robinhood, Copilot Money — not other field-sales apps.

### Color
| Token | Value | Use |
|---|---|---|
| `surface-0` | `#0A0C10` (near-black, never pure black) | app background |
| `surface-1/2` | `#12151B` / `#1A1E26` | cards, sheets |
| `accent` | **Volt `#C8FF1F`** (electric lime — "venom green") | brand, CTAs, SOLD, the belt |
| `sold` | `#C8FF1F` | the money color — sold pins glow |
| `callback` | `#FFB020` amber | warm lead |
| `not-home` | `#4D8DFF` cool blue | neutral revisit |
| `dnk / lost` | `#FF4757` red | dead door |
| `text` | `#F2F4F8` / 60% / 38% tiers | type hierarchy |

Rules: **no arbitrary accent colors anywhere** — every hue carries meaning (Whoop discipline). Disposition colors are identical on pins, list rows, charts, and leaderboards. Glassmorphism (blur + 1px inner border) reserved exclusively for overlays floating on the map, where it earns its keep. Light mode ships too, but dark is the identity. Sunlight-legibility test on every disposition color (SPOTIO's pastel-pins fiasco is the cautionary tale).

### Typography
- A strong grotesk with real numerals — **Inter (custom-tuned) or a licensed grotesk in the Capsule Sans mold**; tabular figures for every stat.
- Hero stat (today's closes / today's commission) at **64–72pt** — readable at arm's length in the sun, Whoop-style. Body 15–17pt, caps-tracked 11–13pt labels.

### Motion
- Spring physics everywhere (no linear duration curves); 150–250ms micro-interactions.
- **Rive** for stateful animation: pin state morphs, streak flame, progress meters, the KO celebration. Lottie only for fire-and-forget decoration.
- Count-up animations on all money and stats; shared-element transition map-pin → lead sheet.
- Haptic grammar (Apple HIG): light tick = selection, success notification = close, and nothing else — if you can't say what a haptic confirms in one sentence, it doesn't fire.

### The custom map style
Bespoke Mapbox Studio style: deep charcoal land, hairline roads, no POI clutter, volt accent for the user puck and active turf boundary, parcel-snapped pins with soft glow on SOLD. The map should be screenshot-worthy — reps posting their finished turf to Instagram is free marketing.

---

## 6. Architecture & stack (decided, pending your green light)

| Layer | Choice | Why |
|---|---|---|
| App framework | **Expo + React Native (New Architecture) + TypeScript** | 60fps with Reanimated 4/Skia; first-party SDKs for every dependency below; OTA updates mid-blitz without app review |
| Map | **Mapbox (`@rnmapbox/maps`)**, MapLibre as escape hatch | Custom styles, GPU symbol layers, offline tile packs; free ≤25k MAU |
| Local data & sync | **SQLite on-device + PowerSync + Postgres (Supabase/RDS)** | True local-first; per-territory partial sync; durable offline mutation queue; LWW conflict policy |
| Celebrations/animation | **Rive** + Reanimated + Skia | State machines, tiny files, near-zero idle CPU |
| Auth | Long-lived refresh tokens + biometric unlock; **offline grace period — the app never locks a rep out in the field** | Kills the "doom loop login" class of failure |
| E-sign | Self-built canvas + ESIGN evidence chain, on-device PDF | Offline-capable, $0/envelope, on-brand |
| Payments | Office's FieldRoutes gateway tokens (NMI/Braintree/Worldpay) for autopay; Stripe ACH + Tap to Pay where direct | Matches FieldRoutes reality; ACH at 0.8%/$5 cap |
| Back-office | **FieldRoutes connector v1** on a backend-agnostic abstraction | PestPac/Briostack/ServiceTitan later without rewrites |
| iOS extras | SwiftUI targets for Live Activities / Dynamic Island / widgets | The lock-screen flex nobody else has |
| Infra discipline | Load-tested for July (the summer peak), Sentry, staged rollouts, sync-integrity monitors | SalesRabbit fell over in summer 2024; we will not |

**Non-negotiable engineering principles**: (1) every write commits locally first; (2) a signup is a durable transaction that survives anything; (3) the map never blocks on network; (4) auth never strands a rep offline; (5) update regressions are caught by automated field-scenario tests before rollout (Enzy's "update destroyed the app" reviews are a warning label).

---

## 7. Pricing posture (for later, but the research says)
One bundled price around **$40–60/rep/month, everything included** — map + data + contracts + weather + gamification + AI coach — undercutting SalesRabbit's ~$100 loaded cost and Enzy's opaque enterprise contracts, with no setup fee. The bundle *is* the positioning.

---

## 8. Build roadmap

**Phase 1 — The Knocking Core (MVP that already beats Enzy's map)**
Map + pins + dispositions + turfs, offline-first sync engine, lead cards, basic leaderboard, rep auth/roster. *The demo: open the app in airplane mode on a mid-range Samsung next to Enzy — case closed.*

**Phase 2 — The Close**
Agreement builder + e-sign + evidence chain, plan/pricing config, FieldRoutes connector (customer → payment profile → subscription → reserved appointment → document + tech note), the durable close queue, live commission tracker v1.

**Phase 3 — The Game & The Brain**
Rounds/brackets/leagues/streaks, KO celebration + feed + kudos, Live Activity, bug sheet + service video library, pitch/objection playbook, manager web dashboard v1, TV mode.

**Phase 4 — The Moats**
Property-data enrichment + propensity, best-time-to-knock model on our telemetry, AI doorstep coach, recruiting/onboarding module, customer app + tech companion, additional back-office connectors.

**Pre-build checklist**: trademark/App Store search on "Knockout"; request a FieldRoutes sandbox/API key (support@fieldroutes.com — per-office key/token, the standard RepCard/SalesRabbit onboarding path); pick property-data vendor (Scout vs ATTOM tier pricing); confirm target companies' payment gateways.

---

## 9. Risks, named honestly
- **FieldRoutes API limits** (3k writes/day/office) — fine for MVP scale; raise via apisupport@ when a customer's volume demands it.
- **No official FieldRoutes sandbox** — mitigate with a mock server built from their Swagger spec + one friendly pilot office.
- **Per-office key onboarding friction** — every customer emails FieldRoutes support once; RepCard proves it's routine. We productize it with a guided setup flow.
- **Enzy's culture lock-in** — matched by Phase 3 plus the two things they can't answer: Android performance and rep-visible commissions.
- **Data costs** — property enrichment priced per-active-territory, cached aggressively; our own telemetry model reduces third-party dependence over time.

---

*Say the word and we start building Phase 1.*
