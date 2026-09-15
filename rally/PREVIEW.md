# RALLY — the isolated iPhone preview (Step B)

A second copy of RALLY, published beside production on the same authorized
origin, that shares **nothing** with it. It exists so a phone can try the
real Apple MapKit map and the territory workflow without any way of touching
the production book.

    production   https://ceojohnmartin.github.io/business-vault/rally/          (the `main` branch, untouched)
    preview      https://ceojohnmartin.github.io/business-vault/rally-preview/  (built from the Phase 5 branch)

## Isolation controls — every one is enforced in code and checked by `tests/preview-test.js`

| Boundary | Production | Preview | Where |
|---|---|---|---|
| IndexedDB database (per-origin, so this is the one that matters) | `meridian-db` | `rally-preview-p5` | `js/preview-config.js` → `js/db.js` |
| Service-worker scope | `/business-vault/rally/` | `/business-vault/rally-preview/` | the path each `sw.js` is served from |
| Cache Storage names (per-origin too) | `rally-v46`, `rally-tiles-v1` | `rallyp5-v46`, `rallyp5-tiles-v1` | `sw.js`, rewritten by the build |
| Cache cleanup on activate | deletes only `rally-*` | deletes only `rallyp5-*` | `sw.js` `FAMILY` — neither worker can touch the other's caches |
| Cloud project (Supabase) | configured | `url: ""`, `anonKey: ""` **and** `MCLOUD.enabled()` forced `false` **and** every `MCLOUD` call refused | `js/cloud-config.js` (built), `js/cloud.js` |
| Auth / session | the device account in `meridian-db` | its own account in `rally-preview-p5`; no session is shared, nothing is sent to the team server | `js/auth.js` on top of the database split |
| Team, roles | server-owned | a seeded **demo team** (Preview Manager, Demo Rep A/B/C), roles local, role line reads "Local device only" | `js/store.js` |
| Business data | real | whatever the tester draws, in the preview's own database, under a permanent **PREVIEW · isolated demo data** ribbon | `js/app.js` |
| House discovery | provider setting | OpenStreetMap building outlines only — the demo grid is hidden and refused | `js/property.js`, `js/app.js` |
| Home-screen identity | RALLY | RALLY PREVIEW / "RALLY P5", tab title "RALLY PREVIEW (isolated)" | `manifest.webmanifest`, `index.html` (built) |
| Apple MapKit token | stamped at publish from the repository secret | same secret, stamped into the preview's `js/mapkit-config.js` **in the build output only** | `tools/build-preview.sh`, `.github/workflows/preview-pages.yml` |

Opening the preview cannot write to production: it never opens production's
database, never registers production's worker, never holds production's
session, and has no cloud client to reach the team server with. The normal
RALLY path is not altered — `RALLY_PREVIEW` is `null` in git and every guard
above is a no-op when it is.

## How it is published

`.github/workflows/preview-pages.yml` (run by hand — nothing runs on push):

1. checks out `main` into `site/` — this is production, byte for byte, never built or edited;
2. checks out the Phase 5 branch into `src/`;
3. runs `sh src/rally/tools/build-preview.sh src/rally site/rally-preview p5` with
   `MAPKIT_TOKEN` from the repository secret in the environment — the script
   copies the app (never `tests/`, `db/`, `tools/`), rewrites the six files
   in the table above, and writes the token into the output's
   `js/mapkit-config.js`. It never prints the token; GitHub masks the secret
   in logs regardless;
4. deploys `site/` as one GitHub Pages deployment.

Before the first run, two things only the repository owner can do:

- **Add the secret** — Settings → Secrets and variables → Actions → New
  repository secret, name `MAPKIT_TOKEN`, value: the rotated MapKit JS token
  (domain-restricted to `ceojohnmartin.github.io`).
- **Set the Pages source to "GitHub Actions"** — Settings → Pages → Build and
  deployment → Source. `actions/deploy-pages` cannot publish otherwise. Note
  what this changes: with the source set to Actions, a push to `main` no
  longer publishes itself — a run of this workflow publishes `main`
  (unchanged) together with the preview. Switching the source back to
  "Deploy from a branch: main" restores the old behaviour at once and drops
  the preview. Nothing here is irreversible, and no production file changes
  either way.

Then: Actions → **RALLY isolated preview** → Run workflow → branch
`claude/pest-sales-app-research-ba7u4n`.

The served `js/mapkit-config.js` carries the token, as every MapKit JS page
must — Apple restricts it to the origin. It is not in git, not in any
commit, and RALLY never copies it into settings, IndexedDB, localStorage or a
backup (`tests/preview-test.js` §E).

## The territory workflow, as built

    DRAW AN AREA (Trace with a finger, or Tap corners)
      → COMPLETE THE SHAPE (lift the finger / Done)
          the area is drawn solid blue and WAITS — nothing opens yet
      → TAP THE AREA (or press "Find houses")
          the boundary is selected, the territory sheet opens,
          RALLY finds the residential houses inside that exact boundary
          (OpenStreetMap building outlines; a house-sized outline with no
          address is an INFERRED home and the review says so), and the
          compact blue pins go on the roofs immediately
          summary: New territory · N Houses · N Sales
      → REVIEW (source, on-the-outline count, inferred count, excluded, already in RALLY, will be imported)
      → ASSIGN one or several reps
      → SAVE
          the territory, its property identities and their history persist

    OPEN RALLY → TAP THE SAVED BLUE TERRITORY
      → the same territory opens; its pins, outcomes, notes, callbacks and
        assignment history are already there; NOTHING is re-scanned, no
        second copy is made. "Scan for new houses" is a button, and every
        house it finds is matched against what RALLY already holds.

    EDIT THE AREA
      → before the outline saves, a confirmation says how many houses stay,
        how many are now outside (kept, with every outcome, and still this
        territory's until another outline takes them in) and how many
        existing houses come inside. Nothing is deleted. New houses in the
        added ground are found by the scan, never imported on their own.

    A REP: signs in → taps Map → the assigned turf is blue with its saved
    pins → starts knocking. A rep's tap inside their turf is a knock. A
    manager's tap on turf opens the territory.

## What is SIMULATED because migration 0018 is not applied

- **The territory number.** `seq` is server-assigned by 0018. The preview
  has no server, so it mints the next number on the device and marks the
  record `seqSource: "device-preview"`. Only the preview does this; a real
  device without 0018 still reads "Territory" with no number.
- **Server-confirmed import and the team-wide door match.** The device is
  the record: `STORE.importDoors` pins the houses locally, matched against
  this device's doors. The 0018 RPC path (`import_territory_doors`) is
  proven separately against the local replica in `tests/import-caller-test.js`.
- **Team sync, realtime, server-owned roles and assignment authority.** All
  off by construction. Persistence in the preview is this phone's IndexedDB.
- **Selective re-knock / territory summary RPCs.** The device-side answers
  are used, labelled "this device only" where the app already does.

## iPhone acceptance (the owner's list)

1. Cold launch with ZERO map configuration: Apple satellite is there.
2. 500-pin pan/zoom; pin readability and house targeting; clustering
   transition; door hit-testing; selected-door sheet position.
3. Rep-only blue turf; manager tools.
4. Draw/circle → complete → tap the area → houses → review → assign several
   reps → Save.
5. Close and reopen the preview (home-screen standalone). Tap the saved
   territory: the same houses and pins.
6. Record several outcomes; close and reopen; outcomes and history remain.
7. More → Preview as → a rep: the assigned blue territory and its pins.
8. Background/resume; real network loss → MapLibre fallback → recovery.

The sign-in on first open creates the preview's own local account (any
name, e-mail and passcode); that person is the demo manager.
