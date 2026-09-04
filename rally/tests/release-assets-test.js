/* RALLY — the release's own asset stamps.

   Every local asset is cache-busted with `?v=<build>`, and the service
   worker precaches the same URLs. The two lists are written by hand in two
   different files, and nothing until now compared them — so v41 shipped
   with `css/app.css?v=40` in index.html while sw.js precached
   `css/app.css?v=41`. The precache entry was dead weight, and a phone
   holding the old stylesheet in its HTTP cache would have loaded the new
   markup with the old CSS: the turf rows and the outline handles unstyled.

   Pure node, no browser. Runs first in the battery because it is instant
   and because a mismatch here invalidates every screenshot after it.

   NODE_PATH=/opt/node22/lib/node_modules node rally/tests/release-assets-test.js */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
let pass = 0, fail = 0;
const check = (n, ok, detail) => {
  if (ok) { pass++; console.log("  ✓ " + n); }
  else { fail++; console.log("  ✗ " + n + (detail ? " — " + detail : "")); }
};

const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");

const build = (html.match(/window\.RALLY_BUILD\s*=\s*"(v\d+)"/) || [])[1];
check("the page declares a build", !!build, build);
const num = build && build.slice(1);

// every ?v= in index.html, from src= and href= alike
const stamped = [];
html.replace(/(?:src|href)="([^"]+\?v=(\d+))"/g, (_, url, v) => { stamped.push({ url, v }); return _; });
check("index.html stamps its local assets", stamped.length > 20, "found " + stamped.length);
const wrong = stamped.filter((s) => s.v !== num);
check("every ?v= in index.html matches the build", wrong.length === 0,
  wrong.map((w) => w.url).join(", "));

// and each of those files actually exists
const missing = stamped.filter((s) => !fs.existsSync(path.join(ROOT, s.url.split("?")[0])));
check("every stamped asset exists on disk", missing.length === 0,
  missing.map((m) => m.url).join(", "));

// the service worker's precache list agrees, entry for entry
const core = [];
const coreBlock = (sw.match(/const CORE\s*=\s*\[([\s\S]*?)\];/) || [])[1] || "";
coreBlock.replace(/"([^"]+)"/g, (_, u) => { core.push(u); return _; });
check("the service worker has a precache list", core.length > 20, "found " + core.length);
const coreWrong = core.filter((u) => /\?v=\d+/.test(u) && !u.includes("?v=" + num));
check("every stamped URL in sw.js CORE matches the build", coreWrong.length === 0,
  coreWrong.join(", "));

const norm = (u) => u.replace(/^\.\//, "");
const htmlSet = new Set(stamped.map((s) => norm(s.url)));
const coreSet = new Set(core.filter((u) => /\?v=\d+/.test(u)).map(norm));
const notPrecached = [...htmlSet].filter((u) => !coreSet.has(u));
check("every asset the page loads is precached by the worker", notPrecached.length === 0,
  notPrecached.join(", "));
const notLoaded = [...coreSet].filter((u) => !htmlSet.has(u));
check("and the worker precaches nothing the page no longer loads", notLoaded.length === 0,
  notLoaded.join(", "));

const cache = (sw.match(/const CACHE\s*=\s*"([^"]+)"/) || [])[1];
check("the worker's cache name carries the build", cache === "rally-" + build,
  cache + " vs rally-" + build);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
