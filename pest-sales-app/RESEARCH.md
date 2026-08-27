# Competitive Research Dossier — D2D Pest Control Sales Platform

*Compiled 2026-08-27. Five research tracks: Enzy, Aptive's internal apps, FieldRoutes/PestRoutes + API, the wider D2D canvassing market, and premium app design/architecture. Condensed; key sources linked inline.*

---

## Track 1: Enzy (enzy.co → enzy.ai)

**Company**: Enzy Technologies LLC, Lehi UT. Spun out of Sunder Energy's internal sales app (Android package is literally `com.sunder.sales`). Lightly funded (~$2.4–4.9M). 2026 rebrand to enzy.ai as a "Performance Operating System" in three layers: Connect (CRM data), Engage (leaderboards/competitions/profiles), Perform (AI coaching). Claims 236K users and a "21% increase in sales per rep" study (n=95,867). Customers: Aptive, EcoShield, Fox, Greenix, SunPower, Sunder, Young Living, Cafe Rio.

**Features**: live customizable leaderboards (rep/team/office/region); competitions & incentives with prize fulfillment (Aptive ran 150+ in 2024; "+9.2% daily serviced contract value per rep"); badges; goals; social-style rep profiles + recognition broadcasts; knocking map with pins/custom knock statuses/lead management; team chat (built on GetStream); recruiting + onboarding module (rare differentiator); training content library (not a real LMS); report builder; new "Enzy AI" conversational analytics; customer surveys/review generation. Territory management exists but is shallow and unmarketed — reviews say borders sometimes don't render.

**Integrations**: 50+ — deep FieldRoutes/PestRoutes (dedicated admin routes in their code), PestPac, BrioStack, ServiceTitan, Salesforce, HubSpot, Enerflo, Snowflake/BigQuery, etc. Sub-month onboarding is a selling point.

**Pricing**: unpublished, quote-based enterprise contracts.

**Tech stack (verified by inspecting the shipped app)**: Angular web app (11.7MB monolithic bundle) wrapped in **Ionic/Capacitor** — the mobile apps are webviews. Google Maps JS API inside the webview. GetStream chat, Firebase push, Segment/Amplitude/Sentry, IndexedDB offline layer (recent, incomplete).

**Weaknesses (the attack surface)**:
- **iOS 4.4★ vs Google Play 2.9★.** Android reviews: "App freezes constantly… I have been encouraged to get an iPhone"; "makes my phone really hot and drains my battery"; "recent update completely destroyed the app"; "messenger… janky as hell"; "If you don't have administrative access, it's borderline useless"; "Jack of all trades but master of none… data that transferred was inaccurate at best."
- 18-month customer: "Constant bugs… empty promises… support was terrible. We just canceled."
- Users beg for Zillow-style property data on pins; Enzy has none.
- Zero G2/Capterra reviews, no Reddit presence — public record uncontested.
- iOS reviews partly insider-inflated (a 5★ review matches a co-founder's name).

**What they do well (must match)**: always-on gamification culture engine reps check ~100×/day; incentive machinery with measurable ROI; all-in-one replacing GroupMe+SalesRabbit+spreadsheets; fast deep back-office integrations; recruiting module; weekly release cadence; marquee pest/solar logos.

Key sources: enzy.ai (/system, /integrations, /about, case studies), App Store id1554333386, Google Play `com.sunder.sales`, Tracxn/CB Insights/PitchBook, direct bundle inspection of app.enzy.co.

---

## Track 2: Aptive Environmental's internal apps

**Sales/knocking app** (internal; "StreetSmarts" name unconfirmed publicly — built by AppsTango, https://appstango.com/pages/aptive, over 5 summers, 1M+ customers):
- **Native iPad app (SwiftUI), offline-first** — chosen explicitly "due to limited bandwidth in suburban areas." Load-bearing lesson.
- GPS territory/knocking map, photo capture, route scheduling, **instant digital contract execution on the door** (fully replaced paper), **server-authoritative commission logic** ("to ensure payment accuracy"), real-time ops dashboards, **demographics ML** to rank neighborhoods. AWS backend (Lambda/DynamoDB).

**Tech ("Service Pro") side**: company phone with routes of 15–18 stops/day; ProAct Inspection workflow; treatment photos + product info flow to the customer app; pre-arrival texts. **Top tech complaint: mid-day route churn** ("management creates problems on the routes with the app"). Ops backend strongly indicated to be FieldRoutes/PestRoutes.

**The features the user loves**:
- **Bug sheet**: internal quick-reference pest ID (public analog: aptivepestcontrol.com/pests/) — used on the door to identify a pest, sound expert, and tie it to the pitch. D2D training doctrine: credibility + specificity closes.
- **Service videos**: real technicians performing treatments — lets a rep who's never sprayed describe the service believably; doubles as tech training.

**Customer app (Aptive Assistant)**: brilliant concepts, ~**1.33★** execution (AppBrain, Android). Loved ideas: GPS "footsteps" map of exactly where the tech treated, treatment photos, in-app reservice booking, branch messaging, autopay. Broken execution: reservices booked with no-shows, messaging "doesn't seem to work," update broke the app, no support response.

**Rep sentiment (Glassdoor 3.9★)**: praise for "best commission pay scales" and "fun incentives and competitions"; but 60–70% of commissions withheld until summer's end, and allegations they "change the formula" — **commission trust is the industry's #1 rep grievance**. 9am–9pm, 6-day grind culture.

**Door process the app compresses**: neighbor social-proof pitch → discount-for-signing-today price framing (~$695→$195 initial) → immediate close → last name → digital agreement + signature → card + autopay enrollment → first service scheduled (often same/next day) into FieldRoutes → handoff to customer app.

Key sources: appstango.com/pages/aptive; aptivepestcontrol.com/pests; Indeed Service Pro reviews; Glassdoor sales rep reviews; AppBrain/Product Hunt/Apptopia for Aptive Assistant; elitesummersales.com.

---

## Track 3: FieldRoutes / PestRoutes (ServiceTitan) — product & API

**Product**: cloud ops suite for 1,700+ pest companies — office back-end, Intelligent Routing, FieldRoutes Payments (Worldpay embedded; NMI/Braintree/Element/Authorize gateways), customer portal, QuickBooks, Marketing Pro cross-sell. Acquired by ServiceTitan Jan 2022. Pricing unpublished; ~$199–600+/mo based on active-customer count, multi-year contracts a complaint theme.

**Mobile reality**: unified FieldRoutes Mobile app (2023, sales+tech) rated **1.9★** on Google Play; legacy PestRoutes Sales app still alive at **2.8★**. Back office strong; mobile weak; support post-onboarding widely panned ("good luck with ever getting help again"). This is why third-party sales apps thrive on top of it.

**The API (the critical finding — everything the user wants is supported)**:
- Docs: fieldroutes.dev/documentation (Swagger 2.0, still titled "PestRoutes"). Endpoint shape: `https://SUBDOMAIN.pestroutes.com/api/{entity}/{action}`, POST form-encoded, JSON responses.
- **Auth**: per-office `authenticationKey` + `authenticationToken` issued by support@fieldroutes.com. No OAuth, no self-serve signup. Global/grouped keys possible on request. This is the exact onboarding pattern RepCard and SalesRabbit use — routine and permitted.
- **Limits**: default 3,000 reads + 3,000 writes per office/day at 60 req/min (raises via apisupport@fieldroutes.com). `search` returns ≤50k IDs; `get` ≤1,000 entities; bulk ~100.
- **The door-close, endpoint by endpoint** (their docs ship a "Big Workflow" example of exactly this):
  1. `customer/search` on `customerLink` (your external ID) to dedupe → `customer/create` (~69 params incl. lat/lng, autopay flag)
  2. `paymentProfile/create` with a **gateway token** (tokenize client-side against the office's NMI/Braintree/Element gateway; ACH takes routing/account directly; `autopay=1`)
  3. `subscription/create` — serviceID, frequency, initial/recurring charges, addons, agreement length, **`soldBy`/`soldBy2`/`soldBy3` commission attribution**, preferred day/time
  4. `spot/search` → `spot/reserve` (lock a real route slot while the customer decides) → `appointment/create` with the reservation → **the stop appears on the tech's route/app**
  5. `document/createEncoded` (signed agreement PDF, base64), `note/create` with `showTech=1`, optional `payment/create` with `doCharge=1`, `ticket/create`
- Also exposed: `knock`/`door` read endpoints, `subscription/updateLeadStage` (D2D is modeled in their data layer), `changelog/search` for change polling. **No webhooks** — poll changelog or use trigger-rule automations.
- Gotchas: no advertised sandbox (mitigate: mock from Swagger + pilot office); auth params last so truncated requests fail closed; one key per office.

**Ecosystem integrators on this same public API**: SalesRabbit, Enzy (pulls stats), RepCard (customer-pasted key/token — proof of pattern), SPOTIO, Siro, Podium. None has privileged access.

**Competing back-ends**: WorkWave PestPac (enterprise incumbent; gated API, fees, approval friction); Briostack (friendliest — genuinely public self-serve API, free tier); GorillaDesk (SMB, documented REST API); Fieldwork (niche); ServiceTitan proper (modern OAuth2 self-serve dev portal — likely future convergence target; abstract the connector layer).

Key sources: fieldroutes.dev/documentation (spec parsed from swagger.js), fieldroutes.com product pages & Sept 2025 release blog, Google Play listings, RepCard setup guide (repcard.zendesk.com), Capterra/G2 reviews, marketplace.fieldroutes.com, briostack.com/public-api, developer.workwave.com, developer.servicetitan.io.

---

## Track 4: The wider D2D canvassing market

**SalesRabbit** (the incumbent): Team $59/user/mo (+$399 setup) or Pro $49 annual; add-ons stack — DataGrid AI $19, Digital Contracts $13, Weather $19 → **~$100+/rep/mo loaded**. Moat: DataGrid AI buyer-propensity scores from 1,700+ variables rendered on-map. Amplify gamification (digital coins → rewards store). Integrations incl. PestPac & PestRoutes. Complaints: pins "placed in the wrong spot… conglomerate somewhere else"; "leads get randomly deleted… ~20% of my leads have notes randomly deleted"; "doom loop login"; "freezes at least 3 times in a 6-hour shift"; **server capacity failures during summer 2024 peak**; no SOC 2 Type 2.

**SPOTIO**: ~$25–40/user/mo est., 5-user minimum, annual only. Strong territory management. Complaints: "constantly loses connection… map takes forever to load"; veteran of 13 tools called it "the absolute worst" for losing customer info and failed pushes to integrations; random logouts/holiday lockouts; pastel v2 pins illegible in sunlight; battery drain.

**Budget tier**: Knockio ($20–25/user, all-in-one, praised on price), Knockbase, Active Knocker, Harvast — no data enrichment, no serious gamification, no reliability reputation.

**Adjacent**: Sunbase/JobNimbus (vertical CRMs treat canvassing as an integration slot — distribution rail for us); Badger Maps/Map My Customers ($60–105/user route-first, no knocking features); D2D Experts (training/status ecosystem — D2DU, Golden Door Awards, D2DCon; monetizable adjacency); **Siro** — AI in-pocket doorstep recording/coaching at est. **$200–350/rep/mo**, top complaint battery drain; a native fold-in target.

**Data providers for smart knocking**: SalesRabbit DataGrid (proprietary); ATTOM (158M properties, 200M+ permits; ~$500+/mo realistic API); Melissa (~$12–14/1k records at volume); **Scout Data** (canvassing-purpose-built: owner-matched mobiles/emails ~98% claimed, DNC-screened, roof age, 98k abandoned solar permits, move-ins; API + credit pricing). **"Best time to knock" is editorial content industry-wide — nobody ships a per-door model.** Open lane; our knock telemetry compounds into it.

**The five universal failure modes (verbatim complaint themes across all vendors)**: (1) GPS drift/wrong-pin placement; (2) pin/map lag on big territories; (3) offline sync data loss — the most trust-destroying; (4) login failures during field hours; (5) crashes/freezes at summer peak. Plus battery drain everywhere.

**Gamification science**: gamify leading behaviors (doors/convos), not just revenue; scoreboard must be live and trusted; short blitzes + brackets + team races + "you vs you" personal bests protect the bottom 70%; real-time public close alerts beat ceremonies; status prizes beat cash; Duolingo mechanics (streaks with freezes = 3.6× engagement; segmented promotion/relegation leagues; one shared currency across streak/league/achievements). Enzy's own data: always-on embedded gamification, +21% sales/rep.

Key sources: salesrabbit.com/pricing & G2/Capterra/JustUseApp reviews, spotio.com & reviews, knockio.com, scoutdata.com, attomdata.com, walklists.com, repcard.com/blog contest guides, enzy.ai/insights gamification study, siro.ai + G2.

---

## Track 5: Premium design & engineering patterns

**Offline-first**: local-first (not cache-first) — device SQLite is primary, every read instant, writes commit locally then background-sync. **PowerSync** (SQLite ↔ Postgres, declarative per-territory Sync Rules, open-core) is the best fit; WatermelonDB+custom sync the 2–3× cost fallback; Realm/Atlas Device Sync deprecated — avoid. Conflicts: LWW + hybrid logical clocks (knocks are single-writer per door); field-level merge for rep+manager edits. Signed contracts with no signal = durable local transactions (signature, PDF hash, timestamps, geo, payment intent) in an outbound queue that survives app kill/reboot; sync status visible but calm ("3 pending" chip, never a blocking spinner).

**Map excellence**: fully custom basemap (default cartography reads "generic CRUD app"); camera choreography (Uber); zoom-aware disclosure (clusters → colored dots → rich pins); **never render pins as platform views — GPU symbol layers + Supercluster** for 10k+ pins at 60fps; haptic tick on pin select; bottom-sheet lead card with camera padding (Zillow). **Mapbox**: free ≤25k MAU then $4/1k — effectively free at canvassing scale; offline tile packs; MapLibre as near-identical-API escape hatch. Google Maps: weaker styling, struggles at high marker counts.

**Design language**: dark-mode-first; restrained glass only over the map. Whoop = strict semantic color vocabulary, hero metric ~72pt. Robinhood = tabular numerals, near-monochrome + one signal color, count-ups, scrubbable charts. Copilot Money/Things 3 = calm density, invisible chrome. Tokens: near-black `#0B0D10`-class surface (not pure black), 2–3 elevation tints, one electric accent, 4 semantic disposition colors, spring physics, 150–250ms micro-interactions. **Rive over Lottie** for anything stateful (state machines, 3–5× smaller, near-0% idle CPU).

**Gamification UI**: layered mechanics (day-one wins → streaks → leagues); streak freezes to avoid morale damage; segmented leagues; Strava-style earned aesthetics + kudos; one perfect close celebration (full-screen Rive + single `.success` haptic + feed broadcast); **Live Activities/Dynamic Island for the knocking session — genuine differentiator no competitor ships** (~15s push updates suffice).

**E-sign & payments**: self-built canvas signature is fully legal under ESIGN/UETA with the evidence chain (intent affordance, e-business consent, document-version hash, retention + customer copy, audit trail incl. geo/time) — and it's the only fully-offline, $0/envelope, on-brand path; FTC 3-day cooling-off notice must surface for D2D. Documenso ($40–250/mo) if third-party evidentiary weight wanted. Stripe: Tap to Pay on iPhone/Android via Terminal RN SDK (2.7%+5¢); **ACH Direct Debit 0.8% capped at $5** — the workhorse for recurring pest billing; Financial Connections for instant bank verification. Offline degrade: contract+signature commit offline; payment capture queued for reconnect.

**Stack**: Expo + React Native New Architecture is the 2026 agency consensus for exactly this profile — Reanimated 4 (UI-thread worklets), RN Skia, FlashList v2, first-party RN SDKs for Mapbox/PowerSync/Stripe Terminal/Rive, EAS + OTA updates (ship fixes to a field force overnight); SwiftUI extension targets for Live Activities/widgets. Flutter's map embedding is its historic weak spot; full native costs ~2× for the last 5%.

Key sources: powersync.com, rxdb.info/alternatives, Uber Design (Medium), Mapbox pricing, pkgpulse RN/Flutter comparisons, Whoop design breakdowns (925studios, BASIC/DEPT), Robinhood teardowns, Callstack Rive-vs-Lottie benchmark, Apple HIG haptics & Live Activities guides, Docusign/SignWell ESIGN guides, Stripe Terminal & ACH docs.

---

## The synthesis (why we win)

1. **Reliability as the brand** — offline-first architecture + never-lock-out auth + July load-testing attacks the five universal failure modes head-on.
2. **One bundled price** vs SalesRabbit's ~$100 à-la-carte stack and Enzy's opaque contracts.
3. **Win Android, win the rep** — native performance vs Enzy's webview; rep-visible live commissions vs the industry's #1 trust grievance.
4. **Own smart knocking v2** — per-door best-time-to-knock from our own telemetry; nobody ships it.
5. **Fold in Siro's category** — native doorstep AI recording/coaching collapses a $200+/rep line item.
6. **Ride the FieldRoutes rails** — their API supports the full door-close; their own sales app is 1.9★; their 1,700 customers are our distribution.
7. **Aptive's beloved ideas at 5★ execution** — bug sheet, service videos, footsteps map, transparent commissions.
