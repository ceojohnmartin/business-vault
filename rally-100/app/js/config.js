/* RALLY 100: cloud configuration (safe to publish).
   Same Supabase project as the RALLY sales app (rally/js/cloud-config.js). The anon key is a PUBLIC
   browser credential by design: every permission lives in the rally100 server functions, which derive
   the caller from the signed-in token and never trust the browser. A service_role key must never
   appear here or anywhere in this repository.
   On localhost the app talks to the local development stand-in (app/dev/server.mjs) instead. */
(function () {
  var host = location.hostname;
  var local = host === 'localhost' || host === '127.0.0.1';
  window.RALLY100_CLOUD = window.RALLY100_CLOUD || (local
    ? { url: location.origin, anonKey: 'dev-local', dev: true }
    : { url: 'https://xwjreykfjzvlmgjzfnzt.supabase.co', anonKey: 'sb_publishable_aL8g7dTqV1K5HmFPl828zA_ZdXor-qA' });
})();
