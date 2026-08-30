/* RALLY — cloud configuration (safe to publish).
   url + anonKey come from the Supabase project (Settings → API). The anon
   key is a PUBLIC browser credential by design — every real permission
   lives server-side in Row Level Security, never in this file.
   Leave both empty and RALLY runs exactly as the local-first app it has
   always been: no requests, no accounts, no cloud.
   (A service_role key must NEVER appear here, or anywhere in this repo.) */
window.RALLY_CLOUD = window.RALLY_CLOUD || {
  url: "https://xwjreykfjzvlmgjzfnzt.supabase.co",
  anonKey: "sb_publishable_aL8g7dTqV1K5HmFPl828zA_ZdXor-qA",
};
