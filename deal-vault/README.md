# Deal Vault

**A private business-acquisition underwriting platform.** Deal Vault helps you decide whether a business is worth buying — like having a private-equity analyst, business broker, CPA, lender and location analyst working together in one app.

## What it does

- **Quick Analysis** (~5 min): price, revenue, SDE, financing → preliminary 0–100 score, clearly labeled as not a full underwriting.
- **Full Underwriting** (12 guided steps): deal source & listing import → business basics → 5-year financial history → add-back normalization → price & financing structures (SBA / conventional / seller note / custom) → industry deep-dive (22 templates: car wash, pest control, HVAC, SaaS, laundromat, dental…) → operations scoring → location & market → lease/real-estate flags → risk register → three-scenario modeling with stress tests → transparent Deal Score.
- **Deal Score 0–100** with weighted categories (customizable), automatic **deal-breaker overrides** (DSCR below floor, unverifiable earnings, severe customer concentration, expiring lease, unsupported add-backs…), and a **Data Confidence Score** so a great-looking-but-unverified deal always carries a warning.
- **Verdicts**: Avoid · High Risk · Weak Deal · Fair Deal · Good Deal · Great Deal · Exceptional Deal — with plain-English explanations of *why*.
- **Make This Deal Work**: computes the exact price cut, seller-note shift, term extension, rate change or rent concession that turns a weak deal into a good one — with precise effects on score, cash needed, DSCR, cash-on-cash and payback.
- **Offer Builder**: fair value, maximum safe price, ideal offer, walk-away, structure terms and a printable LOI preparation sheet (not legal advice).
- **Saved deals, pipeline stages, comparison (up to 5), watchlist with price history, printable PDF acquisition reports, CSV export.**
- Three **fictional demo deals** (attractive / borderline / poor) load on first run so you can explore.

## Financial engine

Amortization & payment math, DSCR, LTV, sources & uses, cash-on-cash, ROIC, IRR (bisection), NPV, payback, break-even revenue, CAGR & volatility, equity build-up from principal reduction, exit valuation, and stress tests (revenue −5/−10/−20/−30%, payroll shocks, rate +2 pts, top-customer loss, surprise capex, forced manager hire). Normalized SDE → normalized EBITDA always subtracts a **market-rate manager salary**, so the app never confuses buying a job with buying an investment. All functions handle missing data and division-by-zero safely, and are unit-tested (`tests/calc.test.js`).

## Privacy & architecture

- **100% client-side.** No server, no accounts, no telemetry. Every number stays in your browser's local storage.
- **Backup/restore**: one-tap JSON export/import in Settings (do this before clearing the browser or switching devices).
- **Optional PIN lock** — a privacy curtain, honestly labeled: it is not encryption.
- Installable **PWA** with offline support (service worker).
- Plain HTML/CSS/JS, zero dependencies, no build step. The storage layer (`js/core.js → DV.store`) is isolated so a hosted backend (e.g. Supabase auth + Postgres with row-level security, team deal rooms, listing-URL server-side importing) can be added later without rebuilding the app.

**Why not Next.js + Supabase?** The original spec suggested it. A static, dependency-free app was chosen deliberately: it runs immediately on GitHub Pages with zero DevOps, works offline, and keeps sensitive deal financials on-device — strictly more private than any hosted database. Nothing in the MVP requires a server; the roadmap items that do (multi-device sync, shared deal rooms, automated listing monitoring) are exactly where Supabase slots in later.

## Run it

It's a static site — any of these work:

```bash
# just open it
open index.html

# or serve it (service worker + PWA install need http)
npx serve .
python3 -m http.server 8080
```

### Deploy on GitHub Pages

Push this folder to a repo → Settings → Pages → deploy from branch → done. (Same setup as the Business Vault app.)

## Tests

```bash
node tests/calc.test.js
```

Covers loan math, IRR/NPV, CAGR, P&L metrics, SDE/EBITDA normalization, financing sources & uses, DSCR, scenario projections, break-even, deal-breaker caps, score bounds, offer solver and the listing-text parser.

## Disclaimers

All analysis is decision support computed from data **you** enter. Nothing here is legal, tax, accounting, lending or investment advice. Demo businesses are fictional. Engage an attorney, CPA and lender before signing anything.
