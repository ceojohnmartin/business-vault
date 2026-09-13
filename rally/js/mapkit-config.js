/* RALLY — Apple MapKit configuration (safe to publish, EMPTY in git).

   MapKit is zero-config infrastructure. No rep, lead, manager or owner ever
   pastes a token or picks a map: with a token present RALLY draws Apple
   satellite imagery; without one it draws the offline-capable map. The
   user selects neither.

   THE TOKEN IS NEVER COMMITTED. This file ships with an empty token and is
   overwritten at publish time on the authorized origin
   (https://ceojohnmartin.github.io) from a deployment secret — the same
   way a build stamps a version. A MapKit JS token is origin-restricted by
   Apple, so the served value is useless anywhere else, but it still never
   lives in source control, in a log, in a backup or in a screenshot.

   For DEVELOPMENT ONLY there is one injection point outside the product
   UI: MENGINE.devToken("…") from the browser console (MENGINE.devToken("")
   clears it). It writes STORE.settings.mapkitToken, which vault.js strips
   from every backup. Nothing in the app's screens reads or shows it. */
window.RALLY_MAPKIT = window.RALLY_MAPKIT || { token: "" };
