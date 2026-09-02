/* A JavaScript MIRROR of the server's payment trigger
   (rally/db/migrations/0004_payment_allowlist.sql as amended by
   0007_last4_strict.sql), for the browser tests' mock Supabase.

   THE SQL IS THE AUTHORITY. This file exists only so a client test can see
   what the server would do to a payload; the trigger's own correctness is
   proved against real PostgreSQL by db/test/rls-test.sql (single session,
   both statement shapes) and db/test/race-test.sh (two concurrent sessions).
   It lives in ONE file because it used to be copy-pasted into two test
   harnesses, which is how a mirror drifts from the thing it mirrors.

   THE THREE-WAY RULE (see the SQL for the full reasoning):
     sent and VALID    -> store it ('' and false are valid values — except
                          last4, where '' is NOT SENT: four digits or absent)
     sent but INVALID  -> keep what is stored, else OMIT the key
     NOT SENT          -> keep what is stored, else OMIT the key
   `prev` models OLD. It is null on the INSERT pass of an upsert, and that
   is the point: a pass with no OLD must not write a value it did not
   receive, or its own injection becomes EXCLUDED and the UPDATE pass
   honours it as client intent — losing a concurrently committed value. */

const has = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
// every Unicode decimal digit (category Nd, Unicode 15) — the SAME generated
// class as public.pay_digit_count() in 0004, counted on the RAW value
const DIGIT = /[^\u0030-\u0039\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\u0DE6-\u0DEF\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F29\u1040-\u1049\u1090-\u1099\u17E0-\u17E9\u1810-\u1819\u1946-\u194F\u19D0-\u19D9\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\uA620-\uA629\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uA9F0-\uA9F9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19\u{104A0}-\u{104A9}\u{10D30}-\u{10D39}\u{11066}-\u{1106F}\u{110F0}-\u{110F9}\u{11136}-\u{1113F}\u{111D0}-\u{111D9}\u{112F0}-\u{112F9}\u{11450}-\u{11459}\u{114D0}-\u{114D9}\u{11650}-\u{11659}\u{116C0}-\u{116C9}\u{11730}-\u{11739}\u{118E0}-\u{118E9}\u{11950}-\u{11959}\u{11C50}-\u{11C59}\u{11D50}-\u{11D59}\u{11DA0}-\u{11DA9}\u{16A60}-\u{16A69}\u{16AC0}-\u{16AC9}\u{16B50}-\u{16B59}\u{1D7CE}-\u{1D7FF}\u{1E140}-\u{1E149}\u{1E2F0}-\u{1E2F9}\u{1E950}-\u{1E959}\u{1FBF0}-\u{1FBF9}\u{11F50}-\u{11F59}\u{1E4F0}-\u{1E4F9}\u{10D40}-\u{10D49}\u{11BF0}-\u{11BF9}\u{16130}-\u{16139}\u{16D70}-\u{16D79}\u{1CCF0}-\u{1CCF9}\u{1E5F1}-\u{1E5FA}\u00B2\u00B3\u00B9\u2070\u2074-\u2079\u2080-\u2089\u2460-\u2468\u24EA\u24F5-\u24FD\u24FF\u2474-\u247C\u2488-\u2490\u2776-\u277E\u2780-\u2788\u278A-\u2792\u2160-\u217F]/gu;
// code points, not UTF-16 units: an astral digit is ONE digit, as in PG's length()
const digits = (v) => (typeof v === "string" ? [...v.replace(DIGIT, "")].length : 0);

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
  // exactly four ASCII digits or the key is absent (0007): "" is NOT SENT, never a clear
  put(safe, "last4", pickRe(p.last4, o.last4, 4, /^[0-9]{4}$/));
  put(safe, "autopayRequested", pickBool(p.autopayRequested, o.autopayRequested));

  /* status: a client may only ever claim one of two values. The STORED
     value is kept verbatim rather than clamped — this trigger is the only
     door a client write passes through, so anything else already there was
     authored by something with more authority than a client. */
  const claimable = (v) => v === "not_configured" || v === "pending_setup";
  // a stored status a client could never have written is never overwritten by one
  if (typeof o.status === "string" && !claimable(o.status)) safe.status = o.status;
  else if (typeof p.status === "string" && claimable(p.status)) safe.status = p.status;
  else if (typeof o.status === "string") safe.status = o.status;

  const pb = isObj(p.billingAddress) ? p.billingAddress : {};
  const ob = isObj(o.billingAddress) ? o.billingAddress : {};
  // the three text leaves are judged TOGETHER, on the RESULT (sent merged
  // with stored): 13+ digits across them is a split credential, whether the
  // halves arrive in one write or two. Then this write's contribution is
  // refused; and if the stored leaves alone are a credential, they go too.
  const addrOf = (src) => {
    const a = {};
    put(a, "street", pickText(src.street, ob.street, 120, 13));
    put(a, "city", pickText(src.city, ob.city, 80, 13));
    put(a, "state", pickText(src.state, ob.state, 40, 5));
    return a;
  };
  const budgetOf = (a) => digits(a.street) + digits(a.city) + digits(a.state);
  let addr = addrOf(pb);
  if (budgetOf(addr) >= 13) {
    addr = addrOf({});
    if (budgetOf(addr) >= 13) addr = {};
  }
  // ZIP+4 requires its hyphen: nine bare digits is a routing number's shape
  put(addr, "zip", pickRe(pb.zip, ob.zip, 10, /^([0-9]{5}(-[0-9]{4})?)?$/));
  if (Object.keys(addr).length) safe.billingAddress = addr;

  // card: the NAME ON THE CARD and nothing else. number/exp/cvv are not
  // named here and so have nowhere to land, however deeply they are nested.
  const pc = p.card || {}, oc = o.card || {};
  const card = put({}, "name", pickText(pc.name, oc.name, 80, 1));
  if (Object.keys(card).length) safe.card = card;

  // ach: the NAME ON THE ACCOUNT and checking/savings. routing/account are
  // not named here and cannot survive.
  const pa = p.ach || {}, oa = o.ach || {};
  const ach = put({}, "name", pickText(pa.name, oa.name, 80, 1));
  put(ach, "type", pickEnum(pa.type, oa.type, ["checking", "savings"]));
  if (Object.keys(ach).length) safe.ach = ach;

  // nothing valid to store is NO payment, not an empty (and then sticky) one
  if (Object.keys(safe).length) row.data.payment = safe;
  else delete row.data.payment;
}

module.exports = { scrubTrigger };
