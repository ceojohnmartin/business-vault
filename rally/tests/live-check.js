/* Live project check — verifies the SHIPPED cloud config against the real
   Supabase project. Opt-in (it talks to production), no browser needed:

       node tests/live-check.js

   It reads js/cloud-config.js so it always tests what the app actually
   ships, proves the publishable key reaches the API, and proves an
   anonymous caller holding that key is denied on every table. It never
   writes anything and never signs anyone in. */
const fs = require("fs"), path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "js", "cloud-config.js"), "utf8");
const url = (src.match(/url:\s*"([^"]*)"/) || [])[1] || "";
const key = (src.match(/anonKey:\s*"([^"]*)"/) || [])[1] || "";

const ok = [], bad = [];
const check = (n, c, x = "") => (c ? ok : bad).push(n + (x ? " — " + x : ""));

const TABLES = ["profiles", "pins", "events", "territories",
                "customers", "files", "rep_locations", "teams"];

(async () => {
  check("cloud-config.js carries a project URL", /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url), url || "(empty)");
  check("cloud-config.js carries a browser-safe key",
    /^(sb_publishable_|eyJ)/.test(key), key ? key.slice(0, 18) + "…" : "(empty)");
  // The one that would be a real incident: a privileged key in client code.
  // Check the shipped VALUE, not the file text — the file's own warning
  // comment says the words "service_role" on purpose.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  let jwtRole = "";
  if (/^eyJ/.test(key)) {
    try { jwtRole = JSON.parse(Buffer.from(key.split(".")[1], "base64").toString()).role || ""; }
    catch (_) { jwtRole = "unreadable"; }
  }
  check("shipped key is not a privileged key",
    !/^sb_secret_/.test(key) && jwtRole !== "service_role" && jwtRole !== "unreadable",
    jwtRole ? "jwt role=" + jwtRole : "publishable");
  check("no secret key literal anywhere in client config", !/sb_secret_/.test(code));

  if (!url || !key) {
    console.log("Cloud is not configured — nothing to check against.");
    process.exit(bad.length ? 1 : 0);
  }

  // Is the key live? A rejected key answers "Invalid API key" / "No API key
  // found"; an accepted one gets all the way to Postgres and is refused
  // THERE. So a Postgres privilege error is proof the key authenticated —
  // and the root endpoint 401s too, since anon can't introspect the schema.
  const probe = await fetch(url + "/rest/v1/pins?select=*&limit=1", { headers: { apikey: key } })
    .then(async (r) => await r.text()).catch((e) => String(e));
  check("publishable key is accepted by the API (refusal comes from Postgres, not the gateway)",
    probe.includes("42501") && !/Invalid API key|No API key/i.test(probe));

  // …and gets an anonymous caller precisely nowhere
  for (const t of TABLES) {
    const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, { headers: { apikey: key } })
      .then(async (r) => ({ s: r.status, b: await r.text() }))
      .catch((e) => ({ s: 0, b: String(e) }));
    // 42501 = insufficient_privilege: the grant was revoked, as intended
    check(`anon is denied on ${t}`,
      (res.s === 401 || res.s === 403) && res.b.includes("42501"),
      "http " + res.s);
  }

  // auth is reachable (sign-in has somewhere to go)
  const settings = await fetch(url + "/auth/v1/settings", { headers: { apikey: key } })
    .then((r) => r.json()).catch(() => null);
  check("auth endpoint is reachable", !!settings && typeof settings === "object");
  if (settings) {
    console.log("\nauth settings: signups " +
      (settings.disable_signup ? "DISABLED" : "enabled") +
      ", email confirmation " +
      (settings.mailer_autoconfirm ? "OFF (instant)" : "ON"));
  }

  console.log("\n=== PASS (" + ok.length + ") ==="); ok.forEach((x) => console.log("  ✓ " + x));
  if (bad.length) { console.log("\n=== FAIL (" + bad.length + ") ==="); bad.forEach((x) => console.log("  ✗ " + x)); }
  console.log(bad.length ? "FAILED" : "ALL GREEN");
  process.exit(bad.length ? 1 : 0);
})();
