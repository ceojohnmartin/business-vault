#!/usr/bin/env node
/* RALLY — proves tests/lib/scrub-trigger.js still behaves like the REAL
   payment trigger in 0004.
 *
 * The browser tests run against a mock Supabase, so they can only be as
 * honest as their mirror of the server. A mirror that has drifted is worse
 * than no mirror: every client test keeps passing while describing a server
 * that no longer exists. This feeds the same payloads to real PostgreSQL and
 * to the JavaScript mirror and requires the stored payment object to be
 * byte-identical, for both statement shapes (plain UPDATE = one trigger
 * fire; UPSERT = two fires, the first one's output becoming EXCLUDED).
 *
 *   PGHOST=/tmp/pgrls PGPORT=5544 node rally/db/test/mirror-fidelity.js <db>
 */
const { execFileSync } = require("child_process");
const path = require("path");
const { scrubTrigger } = require(path.join(__dirname, "../../tests/lib/scrub-trigger.js"));

const DB = process.argv[2] || "rally_rls_test";
const TEAM = "11111111-1111-4111-a111-111111111111";
const psql = (sql) =>
  execFileSync("psql", ["-d", DB, "-Atc", sql], {
    env: Object.assign({ PGUSER: "postgres" }, process.env),
    encoding: "utf8",
  }).trim();

/* Each case is [previously stored payment | null, what the client sends].
   They cover: every field, every "sent but invalid" shape, the mixed-version
   omission, credential smuggling through an allowed field, and the
   truncation trap in last4/zip. */
const CASES = [
  [null, {}],
  [null, { method: "card", last4: "4242" }],
  [null, { method: "card", autopay: true }],                      // v38 shape
  [null, { method: "bogus", last4: "42424242424242", status: "active" }],
  [null, { card: { name: "Pat Woo", number: "4242424242424242", exp: "12/27" } }],
  [null, { ach: { name: "Pat Woo", type: "savings", routing: "021000021", account: "12345678" } }],
  [null, { ach: { routing: "021000021", account: "000123456789" } }],
  [null, { billingAddress: { street: "1234 W 5600 S", city: "Provo", state: "UT", zip: "84604" } }],
  [null, { billingAddress: { street: "4111111111111111", city: "Provo", state: "UT", zip: "84604" } }],
  [null, { billingAddress: { zip: "846041234" } }],
  [null, { billingAddress: { zip: "84604-1234" } }],
  [null, { billingAddress: { zip: "K1A0B1" } }],
  [null, { billingAddress: "not an object" }],
  [null, { autopayRequested: "true", status: 7 }],
  [null, { last4: "12" }],
  [null, { last4: 4242 }],
  [{ method: "ach", last4: "4242", autopayRequested: true, status: "pending_setup",
     card: { name: "Dana Rivers" }, ach: { name: "Dana Rivers", type: "savings" },
     billingAddress: { street: "1 Elm", city: "Provo", state: "UT", zip: "84604" } },
   { method: "ach", autopay: true, last4: "" }],                  // v38 saves a v39 row
  [{ method: "ach", card: { name: "Dana Rivers" } }, { card: { name: "4111111111111111" } }],
  [{ method: "ach", card: { name: "Dana Rivers" } }, { card: { name: "" } }],
  [{ method: "ach", card: { name: "Dana Rivers" } }, { card: { name: { $ne: null } } }],
  [{ method: "card", last4: "4242" }, { last4: "4111111111111111" }],
  [{ ach: { name: "Dana", type: "savings" } }, { ach: { type: "crypto" } }],
  [{ status: "pending_setup" }, { status: "active" }],
  [{ status: "pending_setup" }, { status: "not_configured" }],
  [{ autopayRequested: true }, { autopayRequested: false }],
  [{ autopayRequested: true }, {}],
  [{ billingAddress: { street: "1 Elm", city: "Provo", state: "UT", zip: "84604" } },
   { billingAddress: { street: "", city: "4111111111111111" } }],
];

/* ABSENT means the client sent a data object with NO payment key at all —
   the fail-closed payload — and TOMB marks a tombstone write (deleted_at
   set, data {}), which must carry nothing forward. Both are whole-object
   cases the field-level pickers never see, so they get their own rows. */
const ABSENT = Symbol("no payment key");
const TOMB = Symbol("tombstone");
const SAFE = { method: "ach", autopayRequested: true, status: "pending_setup",
  card: { name: "Dana Rivers" }, ach: { name: "Dana Rivers", type: "savings" },
  billingAddress: { street: "1 Elm", city: "Provo", state: "UT", zip: "84604" } };
CASES.push(
  [null, ABSENT],                        // nothing stored, nothing sent
  [SAFE, ABSENT],                        // the bug: stored, nothing sent
  [SAFE, null],                          // JSON null where the object belongs
  [SAFE, "4111111111111111"],            // a string
  [SAFE, [1, 2, 3]],                     // an array
  [SAFE, 12345],                         // a number
  [SAFE, TOMB],                          // a tombstone carries nothing forward
  [{ method: "card", last4: "4242" }, ABSENT],
  [{ autopayRequested: false }, ABSENT],
);

let fails = 0, n = 0;
const jq = (o) => "'" + JSON.stringify(o).replace(/'/g, "''") + "'::jsonb";
const dataFor = (sent) => sent === ABSENT || sent === TOMB
  ? `'{"plan":{"id":"prem"}}'::jsonb`
  : `jsonb_build_object('plan', '{"id":"prem"}'::jsonb, 'payment', ${jq(sent)})`;
const tombSql = (sent) => sent === TOMB ? "now()" : "null";

for (const [prev, sent] of CASES) {
  for (const shape of ["update", "upsert"]) {
    n++;
    const id = "mir-" + n;
    psql(`delete from public.customers where id = '${id}'`);
    if (prev) {
      // seed through the trigger, then force the exact stored shape so both
      // sides start from the same OLD (the seed itself is trigger-filtered)
      psql(`insert into public.customers (team_id,id,data) values
              ('${TEAM}','${id}', jsonb_build_object('payment', ${jq(prev)}))`);
      psql(`update public.customers set data = jsonb_build_object('payment', ${jq(prev)})
             where id = '${id}'`);
    }
    if (shape === "update") {
      if (!prev) psql(`insert into public.customers (team_id,id,data) values ('${TEAM}','${id}','{}'::jsonb)`);
      psql(`update public.customers set data = ${dataFor(sent)}, deleted_at = ${tombSql(sent)}
             where id = '${id}'`);
    } else {
      // the EXACT production upsert: every payload column SET from EXCLUDED
      psql(`insert into public.customers (team_id,id,first,last,email,phones,created_by,deleted_at,data)
            values ('${TEAM}','${id}','','','','[]'::jsonb,null,${tombSql(sent)},${dataFor(sent)})
            on conflict (team_id,id) do update set
              team_id = excluded.team_id, id = excluded.id, first = excluded.first,
              last = excluded.last, email = excluded.email, phones = excluded.phones,
              created_by = excluded.created_by, deleted_at = excluded.deleted_at,
              data = excluded.data`);
    }
    const server = JSON.parse(
      psql(`select coalesce(data->'payment','null') from public.customers where id = '${id}'`));

    /* The mirror is fed the same two passes Postgres runs. For an upsert on
       an existing row that is: INSERT pass with no OLD, then UPDATE pass
       whose NEW is the first pass's output and whose OLD is the stored row. */
    const row = { data: { plan: { id: "prem" } },
      deleted_at: sent === TOMB ? "2026-09-01T00:00:00Z" : null };
    if (sent !== ABSENT && sent !== TOMB) row.data.payment = JSON.parse(JSON.stringify(sent));
    const prevRow = prev ? { data: { payment: JSON.parse(JSON.stringify(prev)) } } : null;
    if (shape === "update") {
      scrubTrigger(row, prevRow);
    } else {
      scrubTrigger(row, null);                 // BEFORE INSERT: no OLD
      if (prev) scrubTrigger(row, prevRow);    // BEFORE UPDATE: OLD under the lock
    }
    /* ABSENT is one value on both sides. Postgres reports a missing key as
       SQL NULL (printed as JSON null by the coalesce above); the mirror
       simply never sets the property. Neither side holds a payment object,
       which is what invariants 3 and 5 require — so compare them as equal. */
    const mirror = row.data.payment === undefined ? null : row.data.payment;

    const a = JSON.stringify(server, Object.keys(server || {}).sort());
    const b = JSON.stringify(mirror, Object.keys(mirror || {}).sort());
    const same = JSON.stringify(sortDeep(server)) === JSON.stringify(sortDeep(mirror));
    if (!same) {
      fails++;
      console.log(`FAIL: case ${n} (${shape})`);
      console.log(`      prev   ${JSON.stringify(prev)}`);
      console.log(`      sent   ${String(sent === ABSENT ? "<ABSENT>" : sent === TOMB ? "<TOMBSTONE>" : JSON.stringify(sent))}`);
      console.log(`      server ${JSON.stringify(server)}`);
      console.log(`      mirror ${JSON.stringify(mirror)}`);
    }
    psql(`delete from public.customers where id = '${id}'`);
  }
}

function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") {
    const out = {};
    Object.keys(v).sort().forEach((k) => { out[k] = sortDeep(v[k]); });
    return out;
  }
  return v;
}

if (fails) { console.log(`MIRROR: FAILED (${fails} of ${n})`); process.exit(1); }
console.log(`MIRROR: ALL GREEN (${n} payloads match real PostgreSQL exactly)`);
