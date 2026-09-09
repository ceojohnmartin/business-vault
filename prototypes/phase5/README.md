# Phase 5 — RALLY premium map + field experience (DESIGN PROTOTYPE)

**This is a local design prototype for review. It is not RALLY.**
Nothing in this folder is served, published, merged, or loaded by the
production app. Nothing under `rally/` was modified to build it.

## How to open it

```
open prototypes/phase5/index.html        # any browser, no server needed
#A   rep map           #B   door selected           #C   leader / manage turf
```

`shot.js` re-captures the three review screenshots with Playwright.

## What is real

- **Real MapLibre GL JS**, loaded from the same vendored engine production
  uses (`rally/vendor/maplibre-gl.js`). Real camera, real layers, real
  zoom-dependent styling, real hit-testing on tapped pins.
- Real bottom-sheet behaviour, real selection framing, real toolbar states.
- The header counts are derived from the demo data, not typed in.

## What is simulated, and why

- **The basemap is synthetic.** Production renders Google 2D Tiles, which
  require a session token and a network call. This prototype makes **zero**
  network requests, so the streets, blocks and house footprints are drawn
  from `data.js`. It is a faithful test of RALLY's own map layer; it is
  **not** a test of how RALLY looks over live Google tiles.
- **Map labels are DOM markers**, not a MapLibre symbol layer. A symbol
  layer needs a glyph URL, which would be a network fetch.
- Every address, name, note and door is invented. No production record,
  no customer, no territory, no pin is read or written.

## Safety

- No `fetch`, no `XMLHttpRequest`, no Supabase client, no RPC, no realtime
  channel, no service worker, no IndexedDB, no `localStorage`, no
  geolocation call. Verified: the page issues no external request.
- Therefore no prototype action can reach a production mutation endpoint.
- No payment surface of any kind, and no free-text field is read as
  payment data (CLAUDE.md §5, §7).
