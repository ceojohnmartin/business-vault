/* A JavaScript MIRROR of the server's payment trigger
   (rally/db/migrations/0004_payment_allowlist.sql), for the browser tests'
   mock Supabase.

   THE SQL IS THE AUTHORITY. This file exists only so a client test can see
   what the server would do to a payload; the trigger's own correctness is
   proved against real PostgreSQL by db/test/rls-test.sql (single session,
   both statement shapes) and db/test/race-test.sh (two concurrent sessions).
   It lives in ONE file because it used to be copy-pasted into two test
   harnesses, which is how a mirror drifts from the thing it mirrors.

   THE THREE-WAY RULE (see the SQL for the full reasoning):
     sent and VALID    -> store it ('' and false are valid values)
     sent but INVALID  -> keep what is stored, else OMIT the key
     NOT SENT          -> keep what is stored, else OMIT the key
   `prev` models OLD. It is null on the INSERT pass of an upsert, and that
   is the point: a pass with no OLD must not write a value it did not
   receive, or its own injection becomes EXCLUDED and the UPDATE pass
   honours it as client intent — losing a concurrently committed value. */

const has = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
// every Unicode decimal digit a card number could be written in — the SAME
// literal class as public.pay_digit_count() in 0004, counted on the RAW value
const DIGIT = /[^0-9０-９٠-٩۰-۹०-९০-৯๐-๙⁰¹²³⁴⁵⁶⁷⁸⁹₀-₉𝟎-𝟿]/gu;
const digits = (v) => (typeof v === "string" ? v.replace(DIGIT, "").length : 0);

// bounded text with a digit cut: >= maxdigits digits means it is not what
// the field claims to be (a name has none; an address line has a few)
function pickText(sent, stored, maxlen, maxdigits) {
  // digits are counted BEFORE the length cut, so truncation cannot hide a PAN
  const ok = (v) => typeof v === "string" && (v === "" || digits(v) < maxdigits);
  if (ok(sent)) return sent.slice(0, maxlen);
  if (ok(stored)) return stored.slice(0, maxlen);
  return undefined;
}
function pickEnum(sent, stored, allowed) {
  if (typeof sent === "string" && allowed.includes(sent)) return sent;
  if (typeof stored === "string" && allowed.includes(stored)) return stored;
  return undefined;
}
/* The WHOLE value must match; an over-length value is rejected, never
   truncated. Truncating a 16-digit PAN into '4111' would store and display
   the FIRST four digits of a card number as a payment reference. */
function pickRe(sent, stored, maxlen, re) {
  const ok = (v) => typeof v === "string" && v.length <= maxlen && re.test(v);
  if (ok(sent)) return sent;
  if (ok(stored)) return stored;
  return undefined;
}
function pickBool(sent, stored) {
  if (typeof sent === "boolean") return sent;
  if (typeof stored === "boolean") return stored;
  return undefined;
}
const put = (o, k, v) => { if (v !== undefined) o[k] = v; return o; };

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function scrubTrigger(row, prevRow) {
  // a null data column is an empty record, not an exit
  if (row.data == null) row.data = {};
  // a scalar or array where the document belongs is a malformed write: REFUSED
  if (!isObj(row.data)) {
    const e = new Error("customers.data must be a JSON object");
    e.code = "22023"; throw e;
  }
  /* A TOMBSTONE CARRIES NOTHING: whatever was sent, whatever was held. */
  if (row.deleted_at) { delete row.data.payment; return; }

  /* WHOLE-OBJECT RULE (mirrors 0004).
       keyed: the client wrote something under payment.
       sent:  …and it is an object. null/string/number/array contribute
              nothing and are never stored.
       held:  OLD holds a payment object (prevRow models OLD on the UPDATE
              pass; it is null on the INSERT pass, which therefore injects
              nothing and cannot poison EXCLUDED). */
  const keyed = has(row.data, "payment");
  const sent = isObj(row.data.payment);
  const held = !!(prevRow && prevRow.data && isObj(prevRow.data.payment));
  if (!keyed && !held) return;
  const p = sent ? row.data.payment : {};
  const o = held ? prevRow.data.payment : {};
  const safe = {};

  put(safe, "method", pickEnum(p.method, o.method, ["card", "ach", ""]));
  put(safe, "last4", pickRe(p.last4, o.last4, 4, /^([0-9]{4})?$/));
  put(safe, "autopayRequested", pickBool(p.autopayRequested, o.autopayRequested));

  /* status: a client may only ever claim one of two values. The STORED
     value is kept verbatim rather than clamped — this trigger is the only
     door a client write passes through, so anything else already there was
     authored by something with more authority than a client. */
  const claimable = (v) => v === "not_configured" || v === "pending_setup";
  if (typeof p.status === "string" && claimable(p.status)) safe.status = p.status;
  else if (typeof o.status === "string") safe.status = o.status;

  const pb = p.billingAddress || {}, ob = o.billingAddress || {};
  const addr = {};
  put(addr, "street", pickText(pb.street, ob.street, 120, 13));
  put(addr, "city", pickText(pb.city, ob.city, 80, 13));
  put(addr, "state", pickText(pb.state, ob.state, 40, 13));
  put(addr, "zip", pickRe(pb.zip, ob.zip, 10, /^([0-9]{5}(-?[0-9]{4})?)?$/));
  if (Object.keys(addr).length) safe.billingAddress = addr;

  // card: the NAME ON THE CARD and nothing else. number/exp/cvv are not
  // named here and so have nowhere to land, however deeply they are nested.
  const pc = p.card || {}, oc = o.card || {};
  const card = put({}, "name", pickText(pc.name, oc.name, 80, 4));
  if (Object.keys(card).length) safe.card = card;

  // ach: the NAME ON THE ACCOUNT and checking/savings. routing/account are
  // not named here and cannot survive.
  const pa = p.ach || {}, oa = o.ach || {};
  const ach = put({}, "name", pickText(pa.name, oa.name, 80, 4));
  put(ach, "type", pickEnum(pa.type, oa.type, ["checking", "savings"]));
  if (Object.keys(ach).length) safe.ach = ach;

  // nothing valid to store is NO payment, not an empty (and then sticky) one
  if (Object.keys(safe).length) row.data.payment = safe;
  else delete row.data.payment;
}

module.exports = { scrubTrigger };
