/* RALLY — customers: the book, and the full customer editor.
   The editor is the FieldRoutes-style flow from the office screenshots:
   INFO · SERVICE · REFERRALS · PAYMENT · AGREE · FILES with a sticky
   Save bar. AGREE generates the real service agreement (MCONTRACT),
   captures the signature, and files a snapshot copy. */
(function () {
  const { $, $$, openSheet, closeSheet, toast, tick, celebrate, fmtMoney, esc } = MUI;

  let cur = null;          // working draft
  let curId = null;        // existing customer id (null = creating)
  let curTab = "info";
  let returnTo = "customers"; // which screen Back returns to
  let listFilter = "all";

  // ---------- draft ----------
  function blank() {
    const prem = MDATA.PLANS.find((p) => p.id === "premium");
    return {
      first: "", last: "", phones: [{ n: "" }], email: "",
      address: { street: "", city: "", state: "", zip: "" },
      reminders: { text: true, email: true, voice: false },
      switchOver: false,
      contacts: [],
      pests: [], propNotes: [], addServices: [],
      notesForever: "", notesInitial: "",
      // Premium is the opening position at every door — 100% of the time.
      plan: { id: prem.id, name: prem.name, monthly: prem.monthly, initial: prem.initial },
      specialty: [],                       // [{id, name, initial, monthly}]
      termMonths: MDATA.DEFAULT_TERM,      // always opens at 24
      billing: "monthly",
      /* RALLY captures NO card or bank credentials — no PAN, no expiry, no
         routing, no account number, and never a CVV. What a record can
         honestly hold is an INTENT: which method the customer means to use,
         whether they asked for autopay, and where to bill. Whether a
         payment method is actually on file is a fact only the billing
         backend can author, so status can never read "active" from here.
           method  ""      nothing chosen yet
           status  "not_configured" | "pending_setup"  (never "active") */
      payment: {
        method: "", autopayRequested: false, status: "not_configured", last4: "",
        card: { name: "" },
        ach: { name: "", type: "checking" },
        billingAddress: { street: "", city: "", state: "", zip: "" },
      },
      acct: "active",                      // account status: active | frozen | canceled
      source: "Door to Door",
      appointments: [], referrals: [], files: [],
      agreement: null,
      pinId: null, lat: null, lng: null,
      /* DELIBERATELY UNATTRIBUTED. blank() is also the base normalize()
         merges a legacy record onto, and Object.assign only overwrites keys
         the legacy record actually has — so a default here would silently
         become a claim about a customer this device never sold. Authorship
         is stamped by startNew()/startForPin(), which are the only two
         places a genuinely NEW draft is created. */
      soldByUserId: null,
      soldBy: "",
      soldAt: Date.now(),
    };
  }

  // legacy flat records edit cleanly: lift them into the new shape once.
  // IMPORTANT: blank() fills every new field with today's defaults, so
  // "was this present on the original record" must be read from c, not n —
  // otherwise a legacy customer silently repriced onto the current sticker.
  function normalize(c) {
    const n = Object.assign(blank(), JSON.parse(JSON.stringify(c)));
    if (!c.plan || !c.plan.id) {
      // pre-plan-object record: its OWN contracted numbers, never remapped
      if (c.planName || c.monthly != null || c.initial != null) {
        n.plan = {
          id: "legacy", name: c.planName || "Pro",
          monthly: c.monthly != null ? c.monthly : 69,
          initial: c.initial != null ? c.initial : 49,
        };
      }
    }
    if (!c.termMonths) {
      // the signed term is the record's term; only a genuinely new draft is 24
      n.termMonths = (c.agreement && c.agreement.termMonths) || MDATA.DEFAULT_TERM;
    }
    if (typeof c.address === "string") {
      const parts = c.address.split(",").map((s) => s.trim());
      n.address = { street: parts[0] || "", city: parts[1] || "", state: "", zip: "" };
    }
    if (!Array.isArray(n.phones) || !n.phones.length) {
      n.phones = [{ n: c.phone || "" }];
    }
    // the old single notes box becomes Forever Notes
    if (!n.notesForever && c.notes) n.notesForever = c.notes;
    // old flat payment records get the new nested shape without losing last4
    if (!n.payment.card) n.payment.card = { name: "" };
    if (!n.payment.ach) n.payment.ach = { name: "", type: "checking" };
    if (!n.payment.billingAddress) n.payment.billingAddress = { street: "", city: "", state: "", zip: "" };
    // "collect at service" no longer exists, and the customer never gave a
    // card — an honest migration records NO method, not a fabricated one
    if (n.payment.method === "collect") n.payment.method = "";
    if (n.payment.method == null) n.payment.method = "";
    n.payment = MCUST.honestPayment(n.payment);
    if (!n.billing) n.billing = "monthly";
    if (!n.acct) n.acct = "active";
    /* Authorship comes from the record or from nowhere. A legacy customer
       carrying only a soldBy NAME — or nothing at all — stays unattributed:
       a name is not identity, and "whoever opened it" is not evidence. */
    n.soldByUserId = c.soldByUserId || null;
    n.soldBy = c.soldBy || "";
    // a legacy record's sale facts are what they were, not today's
    if (!c.soldAt) {
      n.soldAt = c.signedAt ? new Date(c.signedAt).getTime() : (c.createdAt || n.soldAt);
    }
    if (!n.agreement && c.signedAt) {
      n.agreement = {
        signedAt: c.signedAt, signature: c.signature || null,
        termMonths: c.termMonths || 12, consent: c.consent || null,
      };
    }
    return n;
  }

  // ---------- open / start ----------
  /* The ONLY place a customer acquires an author: a new draft, being
     written now, by the person this device is. Never inferred, never
     backfilled onto a record that already existed. */
  function stampAuthor(c) {
    c.soldByUserId = STORE.myId();
    c.soldBy = (STORE.currentUser() || {}).name || "";
    return c;
  }

  // If sanitation could not be CONFIRMED, this device may still be holding a
  // raw credential. It does not get to keep doing customer/payment work.
  function sanitationBlocked() {
    if (STORE.paymentSafe && STORE.paymentSafe()) return false;
    toast("RALLY couldn't finish securing stored payment data on this device — reopen the app. Customer work is paused.");
    return true;
  }

  function startNew() {
    if (sanitationBlocked()) return;
    cur = stampAuthor(blank()); curId = null;
    returnTo = "customers";
    openEditor("Creating Customer");
  }

  function startForPin(pin) {
    if (sanitationBlocked()) return;
    cur = stampAuthor(blank()); curId = null;
    returnTo = "map";
    cur.pinId = pin.id; cur.lat = pin.lat; cur.lng = pin.lng;
    if (pin.address) {
      const parts = pin.address.split(",").map((s) => s.trim());
      cur.address.street = parts[0] || "";
      cur.address.city = (pin.geo && pin.geo.city) || parts[1] || "";
      cur.address.state = (pin.geo && pin.geo.state) || "";
      cur.address.zip = (pin.geo && pin.geo.zip) || "";
    }
    if (pin.note) cur.notesForever = pin.note;
    openEditor("Creating Customer");
  }

  function open(id) {
    const c = STORE.customers.find((x) => x.id === id);
    if (!c) return;
    cur = normalize(c); curId = id;
    returnTo = "customers";
    openEditor(STORE.custName(c));
  }

  function openEditor(title) {
    curTab = "info";
    // per-customer UI state never leaks into the next record
    planOpen = false;
    specOpen = false;
    fupOpen = false;
    specEditing = null;
    $("#ce-title").textContent = title;
    document.body.classList.add("editing");
    $("#screen-custedit").classList.add("active");
    fillForm();
    // Populate EVERY tab's inputs now, not lazily on first visit — the
    // collectors run on every save, and stale DOM values from the last
    // customer must never leak into this one's pricing or payment.
    renderService();
    renderPayment();
    // fresh signature + consents per customer — never carry ink across
    sigDrawn = false;
    if (sigCtx && sigCanvas) sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    $("#ca-consent1").checked = false;
    $("#ca-consent2").checked = false;
    showTab("info");
  }

  function closeEditor() {
    document.body.classList.remove("editing");
    $("#screen-custedit").classList.remove("active");
    cur = null; curId = null;
    if (window.MAPP) MAPP.show(returnTo);
  }

    function showTab(t) {
    curTab = t;
    $$(".ce-tab").forEach((b) => b.classList.toggle("active", b.dataset.t === t));
    ["info", "service", "payment", "agree", "files"].forEach((k) =>
      $("#ce-" + k).classList.toggle("active", k === t));
    if (t === "service") renderService();
    if (t === "payment") renderPayment();
    if (t === "agree") renderAgree();
    if (t === "files") renderFiles();
    // keep the strip's active tab in view
    const btn = $(`.ce-tab[data-t="${t}"]`);
    if (btn && btn.scrollIntoView) btn.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }

  // ---------- INFO ----------
  // 3855803160 -> 385-580-3160 as they type; anything non-US-shaped is left alone
  function fmtPhone(v) {
    const str = String(v || "");
    const d = str.replace(/\D/g, "");
    if (d.length > 10) return str; // +1 / international — keep as typed
    if (d.length <= 3) return d;
    if (d.length <= 6) return d.slice(0, 3) + "-" + d.slice(3);
    return d.slice(0, 3) + "-" + d.slice(3, 6) + "-" + d.slice(6);
  }

  function fillForm() {
    $("#ci-first").value = cur.first || "";
    $("#ci-last").value = cur.last || "";
    $("#ci-email").value = cur.email || "";
    $("#ci-street").value = cur.address.street || "";
    $("#ci-city").value = cur.address.city || "";
    $("#ci-state").value = cur.address.state || "";
    $("#ci-zip").value = cur.address.zip || "";
    $("#ci-notes-forever").value = cur.notesForever || "";
    $("#ci-notes-initial").value = cur.notesInitial || "";
    ["text", "email"].forEach((k) =>
      $("#ci-rem-" + k).classList.toggle("on", !!cur.reminders[k]));
    $("#ci-switch").classList.toggle("on", !!cur.switchOver);
    renderPhones();
    renderContacts();
    renderPestChips();
    renderPropChips();
  }

  function renderPhones() {
    $("#ci-phones").innerHTML = cur.phones.map((p, i) =>
      `<div class="phone-row">
         <input type="tel" inputmode="tel" placeholder="Phone number" value="${esc(fmtPhone(p.n))}" data-i="${i}" class="ci-phone">
         ${i === cur.phones.length - 1
           ? `<button type="button" class="mini-add" id="ci-add-phone" aria-label="Add another phone">+</button>`
           : `<button type="button" class="mini-x" data-i="${i}" aria-label="Remove phone">✕</button>`}
       </div>`
    ).join("");
    $$("#ci-phones .ci-phone").forEach((inp) =>
      inp.addEventListener("input", () => {
        const f = fmtPhone(inp.value);
        if (f !== inp.value) inp.value = f;
        cur.phones[+inp.dataset.i].n = f;
      }));
    $$("#ci-phones .mini-x").forEach((b) =>
      b.addEventListener("click", () => { cur.phones.splice(+b.dataset.i, 1); renderPhones(); }));
    const add = $("#ci-add-phone");
    if (add) add.addEventListener("click", () => { cur.phones.push({ n: "" }); renderPhones(); });
  }

  function renderContacts() {
    $("#ci-contacts").innerHTML = cur.contacts.map((c, i) =>
      `<div class="chip-row"><span><b>${esc(c.name)}</b>${c.phone ? " · " + esc(fmtPhone(c.phone)) : ""}</span>
        <button type="button" class="mini-x" data-i="${i}" aria-label="Remove contact">✕</button></div>`
    ).join("");
    $$("#ci-contacts .mini-x").forEach((b) =>
      b.addEventListener("click", () => { cur.contacts.splice(+b.dataset.i, 1); renderContacts(); }));
  }

  // Small inline icons so the chips read at a glance — filled silhouettes
  // for the pests, light outlines for the property/structure notes.
  // Everything draws in currentColor, so selected chips flip to white free.
  const F = 'fill="currentColor" stroke="none"';
  const L = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  const ANT =
    `<g ${F}><ellipse cx="12" cy="6.2" rx="2.4" ry="2"/><ellipse cx="12" cy="11" rx="1.9" ry="2.2"/><ellipse cx="12" cy="16.9" rx="2.9" ry="3.6"/></g>` +
    `<g ${L} stroke-width="1.3"><path d="M10.6 4.6 8.6 2.6M13.4 4.6l2-2M10.3 10l-3.4-1.6M13.7 10l3.4-1.6M10.3 12l-3.2 2.2M13.7 12l3.2 2.2M10 15.4l-2.8 3M14 15.4l2.8 3"/></g>`;
  const CHIP_ICONS = {
    fireants: ANT,
    blackants: ANT,
    spiders:
      `<g ${F}><circle cx="12" cy="14" r="3.6"/><circle cx="12" cy="8.9" r="1.9"/></g>` +
      `<g ${L} stroke-width="1.3"><path d="M10 11.4 6.4 7.2M14 11.4l3.6-4.2M9 13 4.4 11M15 13l4.6-2M9.2 15.6 5 17.4M14.8 15.6 19 17.4M10.4 17 8 20.6M13.6 17l2.4 3.6"/></g>`,
    roaches:
      `<g ${F}><ellipse cx="12" cy="13.6" rx="3.4" ry="5.6"/><circle cx="12" cy="6.6" r="1.8"/></g>` +
      `<g ${L} stroke-width="1.3"><path d="M10.8 5.2 8 2.4M13.2 5.2 16 2.4M9 11l-3.6-1.4M15 11l3.6-1.4M9 14.6l-3.4 1.6M15 14.6l3.4 1.6M10 17.8l-2.4 2.8M14 17.8l2.4 2.8"/></g>`,
    fleas:
      `<g ${F}><ellipse cx="12" cy="12.6" rx="4.4" ry="5.4"/><circle cx="12" cy="6" r="1.6"/></g>` +
      `<g ${L} stroke-width="1.3"><path d="M8 9.6 4.6 8M16 9.6 19.4 8M7.6 12.8H4M16.4 12.8H20M8 16l-3 1.8M16 16l3 1.8"/></g>`,
    wasps:
      `<g ${F}><circle cx="12" cy="5.6" r="1.7"/><ellipse cx="12" cy="10" rx="2.1" ry="1.9"/><path d="M12 12.2c2 0 3 1.8 3 3.9 0 2.6-1.4 4.9-3 4.9s-3-2.3-3-4.9c0-2.1 1-3.9 3-3.9Z"/></g>` +
      `<g ${L} stroke-width="1.3"><path d="M9.9 9.2C7.4 7.6 5.2 7.4 3.6 8.4c1.2 1.8 3.4 2.6 6 2.4M14.1 9.2c2.5-1.6 4.7-1.8 6.3-.8-1.2 1.8-3.4 2.6-6 2.4M10.9 4.2 9.7 2.4M13.1 4.2l1.2-1.8"/></g>`,
    earwigs:
      `<g ${F}><circle cx="12" cy="5.8" r="1.7"/><ellipse cx="12" cy="9.6" rx="1.9" ry="1.7"/><ellipse cx="12" cy="13.6" rx="1.7" ry="2.4"/></g>` +
      `<g ${L} stroke-width="1.4"><path d="M12 16v1.6M10.9 17.8c-1.5 1.4-1.9 2.8-1.4 4M13.1 17.8c1.5 1.4 1.9 2.8 1.4 4M10.6 4.4 9 2.2M13.4 4.4 15 2.2M10.2 9.2 7 8M13.8 9.2 17 8M10.4 12.4l-2.8 1M13.6 12.4l2.8 1"/></g>`,
    silverfish:
      `<g ${F}><path d="M12 3.4c2 0 3.4 1.6 3.2 3.6l-1 8.4c-.2 1.9-1 3.4-2.2 3.4s-2-1.5-2.2-3.4l-1-8.4C8.6 5 10 3.4 12 3.4Z"/></g>` +
      `<g ${L} stroke-width="1.3"><path d="M11.2 18.6 9.4 21.6M12 18.8v2.8M12.8 18.6l1.8 3M10.2 4.2 8.4 2M13.8 4.2 15.6 2M9.4 8.6 6.6 7.6M14.6 8.6l2.8-1M9.8 12.4l-2.6 1M14.2 12.4l2.6 1"/></g>`,
    flies:
      `<g ${F}><circle cx="12" cy="7.4" r="2.1"/><ellipse cx="12" cy="14.2" rx="2.6" ry="4.6"/></g>` +
      `<g ${L} stroke-width="1.4"><path d="M9.8 10.4C6.6 9 4.2 9.4 3 11.4c1.6 1.6 4.2 1.7 6.8.4M14.2 10.4c3.2-1.4 5.6-1 6.8 1-1.6 1.6-4.2 1.7-6.8.4M10.8 5.6 9.6 3.8M13.2 5.6l1.2-1.8"/></g>`,
    rodents:
      `<g ${L} stroke-width="1.7"><path d="M14.8 7.2a3.1 3.1 0 1 0-4.9-2.5 8 8 0 0 0-6 7.7c0 4.5 3.6 7 8.1 7 3.9 0 6.3-1.5 6.3-4.2 0-2.2-1.8-3.3-3.6-3.3"/><path d="M18.3 15.2c1.8 0 3.3 1 3.7 2.6"/></g>` +
      `<g ${F}><circle cx="7.6" cy="12.6" r="1.15"/></g>`,
    other: `<g ${F}><circle cx="6" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18" cy="12" r="1.7"/></g>`,
    "Dog on Property":
      `<g ${L}><path d="M4.4 19v-5.6C4.4 11 6 9.6 8.2 9.6h5.2l2.2-3.4c.4-.6 1-.9 1.7-.7l2.3.7-1.4 3 .8 2.2c.3.8-.3 1.6-1.1 1.6h-2v6"/><path d="M7.6 19v-2.8M12.4 19v-3.2M4.4 14.6l-2-1.2"/></g>`,
    "Cat on Property":
      `<g ${L}><path d="M7 10.6V5.2l2.6 2h4.8l2.6-2v5.4c0 3-2.2 5-5 5s-5-2-5-5Z"/><path d="M12 15.6v3.8M12 19.4c0 .8 2.6 1.4 4 .4M7 12.4l-3.6-.6M7 14.2l-3.4.8M17 12.4l3.6-.6M17 14.2l3.4.8"/><g ${F}><circle cx="10" cy="10.6" r=".9"/><circle cx="14" cy="10.6" r=".9"/></g></g>`,
    "Gate":
      `<g ${L}><path d="M4.6 20V8.2L6.8 5l2.2 3.2V20M14.9 20V8.2L17.1 5l2.2 3.2V20M9 10.4h6M9 14.2h6M9 18h6M4.6 20h14.7"/></g>`,
    "Locked Gate":
      `<g ${L}><rect x="5.6" y="10.6" width="12.8" height="9" rx="1.8"/><path d="M8.6 10.6V8a3.4 3.4 0 0 1 6.8 0v2.6"/><path d="M12 14v2.4"/><g ${F}><circle cx="12" cy="13.9" r="1.2"/></g></g>`,
    "Garage":
      `<g ${L}><path d="M3.4 20V9.6L12 4.2l8.6 5.4V20"/><path d="M6.8 20v-7.8h10.4V20M6.8 14.8h10.4M6.8 17.4h10.4"/></g>`,
    "Patio":
      `<g ${L}><path d="M12 3.2c4.4 0 7.6 2.6 8.2 6H3.8c.6-3.4 3.8-6 8.2-6ZM12 3.2V20M12 20H8.4M12 20h3.6M5.6 12.6 4.2 20M18.4 12.6 19.8 20"/></g>`,
    "Back Fence":
      `<g ${L}><path d="M4.4 20V8.2L6.6 5l2.2 3.2V20M15.2 20V8.2L17.4 5l2.2 3.2V20M8.8 11h6.4M8.8 16.4h6.4M4.4 20h15.2"/></g>`,
    "Deck":
      `<g ${L}><path d="M3.4 12.2h17.2M4.6 12.2V20M19.4 12.2V20M8.2 12.2V17M12 12.2V17M15.8 12.2V17M3.4 9.2h17.2M6 9.2V6.4M12 9.2V6M18 9.2V6.4"/></g>`,
    "Front Porch":
      `<g ${L}><path d="M2.8 9.8 12 4.2l9.2 5.6M5 9.8V20M19 9.8V20M5 13h14M8.4 13v7M15.6 13v7M3.4 20h17.2"/></g>`,
    "Shed":
      `<g ${L}><path d="M4 20V10L12 4.6 20 10v10M4 20h16M9.6 20v-6h4.8v6M12 14v6"/></g>`,
  };
  const chipIcon = (key) => CHIP_ICONS[key]
    ? `<svg class="pchip-ic" viewBox="0 0 24 24" aria-hidden="true">${CHIP_ICONS[key]}</svg>` : "";

  // ---- problem pests: chip lights up AND drops its note into Forever Notes ----
  function renderPestChips() {
    $("#ci-pests").innerHTML = MDATA.PEST_CHIPS.map((p) =>
      `<button type="button" class="pchip${cur.pests.includes(p.id) ? " sel" : ""}" data-p="${p.id}">${chipIcon(p.id)}<span class="pchip-t">${esc(p.label)}</span>${cur.pests.includes(p.id) ? `<span class="pchip-ck">✓</span>` : ""}</button>`
    ).join("");
    $$("#ci-pests .pchip").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        const p = MDATA.PEST_CHIPS.find((x) => x.id === b.dataset.p);
        const on = cur.pests.includes(p.id);
        const ta = $("#ci-notes-forever");
        if (on) {
          cur.pests = cur.pests.filter((x) => x !== p.id);
          // remove the canned text only if it's still verbatim — an edited
          // note is the rep's words now, never auto-deleted
          if (p.note && ta.value.includes(p.note)) {
            ta.value = ta.value.replace(p.note, "").replace(/\n{3,}/g, "\n\n").trim();
          }
        } else {
          cur.pests.push(p.id);
          if (p.note && !ta.value.includes(p.note)) {
            ta.value = (ta.value.trim() ? ta.value.trim() + "\n\n" : "") + p.note;
          }
        }
        cur.notesForever = ta.value;
        renderPestChips();
      }));
  }

  function renderPropChips() {
    $("#ci-props").innerHTML = MDATA.PROP_NOTES.map((label) =>
      `<button type="button" class="pchip${cur.propNotes.includes(label) ? " sel" : ""}" data-p="${esc(label)}">${chipIcon(label)}<span class="pchip-t">${esc(label)}</span>${cur.propNotes.includes(label) ? `<span class="pchip-ck">✓</span>` : ""}</button>`
    ).join("");
    $$("#ci-props .pchip").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        const label = b.dataset.p;
        cur.propNotes = cur.propNotes.includes(label)
          ? cur.propNotes.filter((x) => x !== label)
          : [...cur.propNotes, label];
        renderPropChips();
      }));
  }

  // ---- GPS: drop this house's address into the form ----
  async function useMyLocation() {
    const btn = $("#ci-gps");
    if (!navigator.geolocation) { toast("Location isn't available on this device"); return; }
    btn.disabled = true; btn.textContent = "Finding you…";
    const done = () => { btn.disabled = false; btn.textContent = "Use my location"; };
    const snap = cur; // the fix must land on the record that asked for it
    navigator.geolocation.getCurrentPosition(async (pos) => {
      if (cur !== snap) { done(); return; } // editor closed or switched customers
      const { latitude: lat, longitude: lng } = pos.coords;
      cur.lat = lat; cur.lng = lng;
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`,
          { headers: { Accept: "application/json" } });
        const j = await r.json();
        const a = (j && j.address) || {};
        const street = [a.house_number, a.road].filter(Boolean).join(" ");
        if (street) $("#ci-street").value = street;
        $("#ci-city").value = a.city || a.town || a.village || $("#ci-city").value;
        $("#ci-state").value = a.state || $("#ci-state").value;
        $("#ci-zip").value = a.postcode || $("#ci-zip").value;
        toast(street ? "Address dropped from GPS" : "Got your location — no address found here");
      } catch (_) {
        toast("Location saved — address lookup needs signal");
      }
      done();
    }, () => { toast("Couldn't get your location — check permissions"); done(); },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }

  function collectInfo() {
    cur.first = $("#ci-first").value.trim();
    cur.last = $("#ci-last").value.trim();
    cur.email = $("#ci-email").value.trim();
    cur.address = {
      street: $("#ci-street").value.trim(), city: $("#ci-city").value.trim(),
      state: $("#ci-state").value.trim(), zip: $("#ci-zip").value.trim(),
    };
    cur.notesForever = $("#ci-notes-forever").value.trim();
    cur.notesInitial = $("#ci-notes-initial").value.trim();
    cur.phones = cur.phones.filter((p) => p.n.trim());
    if (!cur.phones.length) cur.phones = [{ n: "" }];
  }

  // ---------- SERVICE ----------
  let planOpen = false;      // the plan dropdown
  let specOpen = false;      // the specialty accordion
  let fupOpen = false;       // the follow-ups accordion
  let specEditing = null;    // specialty id open in the price sheet

  const planDef = () => MDATA.PLANS.find((p) => p.id === cur.plan.id) || MDATA.PLANS[3];

  // Floors are never printed — the rep sees UNPROFITABLE, the customer
  // sees a discount. A legacy plan keeps its own contracted numbers.
  function planFloor() {
    const p = MDATA.PLANS.find((x) => x.id === cur.plan.id);
    return p
      ? { initial: p.floorInitial, monthly: p.floorMonthly }
      : { initial: cur.plan.initial || 0, monthly: cur.plan.monthly || 0 };
  }

  function specSum(field) {
    return (cur.specialty || []).reduce((t, sv) => t + (Number(sv[field]) || 0), 0);
  }

  function renderService() {
    const p = planDef();
    // collapsed current-plan row — tap to drop the full lineup down
    $("#cs-plan-cur").innerHTML =
      `<span class="pcur-name"><b>${p.name}</b></span>
       <span class="pcur-arrow">${planOpen ? "▴" : "▾"}</span>`;
    const wrap = $("#cs-plans");
    wrap.hidden = !planOpen;
    if (planOpen) {
      // just the plan names — the sticker is the same everywhere, and the
      // visit cadence stays out of the picker (it still prints on the
      // agreement as spray frequency)
      wrap.innerHTML = MDATA.PLANS.map((x) =>
        `<button class="plan-card${x.id === cur.plan.id ? " sel" : ""}" data-plan="${x.id}" type="button">
           <span class="pc-top"><b>${x.name}</b>${x.id === cur.plan.id ? `<span class="pc-price">✓</span>` : ""}</span>
         </button>`
      ).join("");
      $$("#cs-plans .plan-card").forEach((b) =>
        b.addEventListener("click", () => {
          tick();
          const nx = MDATA.PLANS.find((x) => x.id === b.dataset.plan);
          // switching plans re-opens at the sticker; the rep re-discounts
          cur.plan = { id: nx.id, name: nx.name, monthly: nx.monthly, initial: nx.initial };
          $("#cs-initial").value = nx.initial;
          $("#cs-monthly").value = nx.monthly;
          planOpen = false;
          renderService();
        }));
    }
    $("#cs-initial").value = cur.plan.initial;
    $("#cs-monthly").value = cur.plan.monthly;
    refreshPriceUI();
    renderAddSvc();
    renderSpecialty();
    renderTermBilling();
  }

  function refreshPriceUI() {
    const list = planDef();
    const rawI = $("#cs-initial").value, rawM = $("#cs-monthly").value;
    // a field cleared for typing counts as sticker until a number lands
    const init = rawI === "" ? list.initial : Number(rawI) || 0;
    const mo = rawM === "" ? list.monthly : Number(rawM) || 0;
    const f = planFloor();
    const under = init < f.initial || mo < f.monthly;
    // the input hugs its digits so "$450" centers as one piece
    ["cs-initial", "cs-monthly"].forEach((id) => {
      const el = $("#" + id);
      el.style.width = Math.max(1.2, String(el.value || "").length * 1.05) + "ch";
    });
    $("#cs-unprofitable").hidden = !under;
    // the discount line IS the pitch: show what they're saving off sticker
    const dInit = Math.max(0, (list.listInitial || list.initial) - init);
    const dMo = Math.max(0, list.monthly - mo);
    // one number, no commentary: the gap between the $450 standard price
    // and whatever the initial actually is
    $("#cs-discount").textContent = under || !dInit ? "" : "Discount given: " + fmtMoney(dInit);
    renderTermBilling();
  }

  function renderAddSvc() {
    $("#cs-addsvc").innerHTML = MDATA.ADD_SERVICES.map((label) =>
      `<button type="button" class="pchip${cur.addServices.includes(label) ? " sel" : ""}" data-p="${esc(label)}">${chipIcon(label)}<span class="pchip-t">${esc(label)}</span>${cur.addServices.includes(label) ? `<span class="pchip-ck">✓</span>` : ""}</button>`
    ).join("");
    $$("#cs-addsvc .pchip").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        const label = b.dataset.p;
        cur.addServices = cur.addServices.includes(label)
          ? cur.addServices.filter((x) => x !== label)
          : [...cur.addServices, label];
        renderAddSvc();
      }));
  }

  // ---- specialty pest add-ons: card list, tap price to adjust ----
  function renderSpecialty() {
    // the band: open/closed, and a green summary of what's already picked
    $("#cs-spec-body").hidden = !specOpen;
    $("#cs-spec-toggle").classList.toggle("open", specOpen);
    const picked = cur.specialty || [];
    $("#cs-spec-meta").textContent = picked.length
      ? `${picked.length} added · +${fmtMoney(picked.reduce((t, sv) => t + (Number(sv.monthly) || 0), 0))}/mo`
      : "";
    $("#cs-specialty").innerHTML = MDATA.SPECIALTY.map((d) => {
      const on = (cur.specialty || []).find((x) => x.id === d.id);
      const init = on ? on.initial : d.initial;
      const mo = on ? on.monthly : d.monthly;
      const price = d.custom && !on
        ? `<span class="sp-custom">CUSTOM QUOTE</span>`
        : `<button type="button" class="sp-price num" data-s="${d.id}">${fmtMoney(init)} initial · ${fmtMoney(mo)}/month</button>`;
      return `<div class="spec-card${on ? " sel" : ""}">
        <button type="button" class="spec-main" data-s="${d.id}">
          <b>${esc(d.name)}</b>
          <span class="dim">${esc(d.blurb)}</span>
          ${price}
        </button>
        <span class="spec-check${on ? " on" : ""}" aria-hidden="true">${on ? "✓" : ""}</span>
      </div>`;
    }).join("");
    $$("#cs-specialty .spec-main").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        const d = MDATA.SPECIALTY.find((x) => x.id === b.dataset.s);
        const i = (cur.specialty || []).findIndex((x) => x.id === d.id);
        if (i >= 0) cur.specialty.splice(i, 1);
        else {
          cur.specialty.push({ id: d.id, name: d.name, initial: d.initial, monthly: d.monthly });
          if (d.custom) openSpecPrice(d.id); // a custom quote starts in the editor
        }
        renderSpecialty();
        renderTermBilling();
      }));
    $$("#cs-specialty .sp-price").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const on = (cur.specialty || []).find((x) => x.id === b.dataset.s);
        if (on) openSpecPrice(b.dataset.s);       // adjust a selected service
        else b.closest(".spec-card").querySelector(".spec-main").click(); // tapping price selects first
      }));
  }

  function openSpecPrice(id) {
    const d = MDATA.SPECIALTY.find((x) => x.id === id);
    const on = (cur.specialty || []).find((x) => x.id === id);
    if (!d || !on) return;
    specEditing = id;
    $("#sp-title").textContent = "Adjust " + d.name + " price";
    $("#sp-initial").value = on.initial;
    $("#sp-monthly").value = on.monthly;
    specPriceCheck();
    openSheet("spec-price-sheet");
  }

  function specPriceCheck() {
    const d = MDATA.SPECIALTY.find((x) => x.id === specEditing);
    if (!d) return true;
    const init = Number($("#sp-initial").value) || 0;
    const mo = Number($("#sp-monthly").value) || 0;
    const under = init < d.floorInitial || mo < d.floorMonthly;
    $("#sp-unprofitable").hidden = !under;
    $("#sp-save").disabled = under;
    return !under;
  }

  // ---- follow-ups: contract length + billing cycle, with the math shown ----
  function renderTermBilling() {
    // the band always tells you what's set, open or closed
    $("#cs-fup-body").hidden = !fupOpen;
    $("#cs-fup-toggle").classList.toggle("open", fupOpen);
    const std = MDATA.TERMS.includes(cur.termMonths);
    $$("#cs-term .seg-opt").forEach((b) =>
      b.classList.toggle("sel", std ? +b.dataset.m === cur.termMonths : b.dataset.m === "custom"));
    const ci = $("#cs-term-custom");
    ci.hidden = std;
    if (!std) ci.value = cur.termMonths;
    $$("#cs-billing .seg-opt").forEach((b) => b.classList.toggle("sel", b.dataset.b === cur.billing));
    updateBillingMath();
  }

  function updateBillingMath() {
    // the Billed/Contract/Total box is gone by request — the numbers still
    // compute where they matter: the Agree summary and the agreement itself
  }

  function collectService() {
    const f = planFloor();
    const list = planDef();
    // never store an unprofitable number: the UI already said UNPROFITABLE,
    // and the record snaps up to the floor on save. An EMPTY field means
    // "sticker"; a typed number (0 included) clamps to the floor, not the
    // sticker — a deliberate $0 quote becomes the cheapest legal price.
    const rawI = $("#cs-initial").value, rawM = $("#cs-monthly").value;
    const init = Math.min(Math.max(rawI === "" ? list.initial : (Number(rawI) || 0), f.initial), 100000);
    const mo = Math.min(Math.max(rawM === "" ? list.monthly : (Number(rawM) || 0), f.monthly), 100000);
    cur.plan.initial = init;
    cur.plan.monthly = mo;
    $("#cs-initial").value = init;
    $("#cs-monthly").value = mo;
    // specialty floors hold the same line
    (cur.specialty || []).forEach((sv) => {
      const d = MDATA.SPECIALTY.find((x) => x.id === sv.id);
      if (d && !d.custom) {
        sv.initial = Math.max(Number(sv.initial) || 0, d.floorInitial);
        sv.monthly = Math.max(Number(sv.monthly) || 0, d.floorMonthly);
      }
    });
    // a custom quote left at $0/$0 (sheet dismissed) was never actually
    // quoted — it must not ride the agreement as a free line item
    cur.specialty = (cur.specialty || []).filter((sv) => {
      const d = MDATA.SPECIALTY.find((x) => x.id === sv.id);
      return !(d && d.custom && !Number(sv.initial) && !Number(sv.monthly));
    });
    const tc = $("#cs-term-custom");
    if (!tc.hidden && tc.value) {
      cur.termMonths = Math.min(Math.max(Math.round(Number(tc.value) || MDATA.DEFAULT_TERM), 1), 120);
    }
  }

  /* ---------- PAYMENT ----------
     There is no Luhn check and no card formatter here any more, because
     there is no card number to check or format. RALLY does not capture card
     or bank credentials; it records what the customer INTENDS to pay with,
     and the office collects the actual method before the initial service. */

  // The one place that decides what a payment record is allowed to claim.
  // Called on every read (normalize) and every write (collectPayment), so a
  // credential cannot re-enter a record through any path.
  /* THE CANONICAL SAFE PAYMENT SHAPE, enforced identically on both sides.
     Every leaf below has the same type, domain and length rule as
     db/migrations/0004_payment_allowlist.sql, so what a rep sees on the
     screen is what the server will actually keep. A field the client let
     through and the server silently dropped would revert on the next pull
     with no explanation, which is a lie by omission. */
  const bounded = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
  // every Unicode decimal digit, the same generated class the server uses
  // (db/migrations/0004_payment_allowlist.sql): a card number written in
  // fullwidth or Khmer digits is still a card number
  const DIGIT = /[^\u0030-\u0039\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\u0DE6-\u0DEF\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F29\u1040-\u1049\u1090-\u1099\u17E0-\u17E9\u1810-\u1819\u1946-\u194F\u19D0-\u19D9\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\uA620-\uA629\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uA9F0-\uA9F9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19\u{104A0}-\u{104A9}\u{10D30}-\u{10D39}\u{11066}-\u{1106F}\u{110F0}-\u{110F9}\u{11136}-\u{1113F}\u{111D0}-\u{111D9}\u{112F0}-\u{112F9}\u{11450}-\u{11459}\u{114D0}-\u{114D9}\u{11650}-\u{11659}\u{116C0}-\u{116C9}\u{11730}-\u{11739}\u{118E0}-\u{118E9}\u{11950}-\u{11959}\u{11C50}-\u{11C59}\u{11D50}-\u{11D59}\u{11DA0}-\u{11DA9}\u{16A60}-\u{16A69}\u{16AC0}-\u{16AC9}\u{16B50}-\u{16B59}\u{1D7CE}-\u{1D7FF}\u{1E140}-\u{1E149}\u{1E2F0}-\u{1E2F9}\u{1E950}-\u{1E959}\u{1FBF0}-\u{1FBF9}\u{11F50}-\u{11F59}\u{1E4F0}-\u{1E4F9}]/gu;
  // code points, not UTF-16 units: an astral digit is ONE digit, as in PG's length()
const digits = (v) => (typeof v === "string" ? [...v.replace(DIGIT, "")].length : 0);
  /* A NAME field carrying four or more digits is not a name. Four is below
     a routing number (9), a bank account (4-17) and a card number (13-19),
     and a person's name has no digits at all. This is shape enforcement on
     a PAYMENT-SHAPED field — not a scanner over the app's free text. */
  const safeName = (v) => (digits(v) >= 4 ? "" : bounded(v, 80));
  // an address line legitimately carries digits; a card number does not fit
  const safeAddr = (v, max, cut) => (digits(v) >= (cut || 13) ? "" : bounded(v, max));
  // ZIP+4 requires its hyphen: nine bare digits is the shape of a routing number
  const US_ZIP = /^([0-9]{5}(-[0-9]{4})?)?$/;

  function honestPayment(pay) {
    const p = pay || {};
    const card = { name: safeName(p.card && p.card.name) };
    const ach = {
      name: safeName(p.ach && p.ach.name),
      type: (p.ach && p.ach.type) === "savings" ? "savings" : "checking",
    };
    const method = p.method === "card" || p.method === "ach" ? p.method : "";
    /* LEGACY AUTOPAY: the old record shape defaulted autopay to TRUE, so an
       old `autopay: true` is a software default, not evidence the customer
       asked for anything. Only an explicit autopayRequested (written by a
       v39+ rep tapping the switch) counts as intent. Everything older
       migrates to "we don't know", which is the truth. */
    const autopayRequested = p.autopayRequested === true;
    /* And status is never inferred — not from a method, not from a legacy
       last4, not from autopay. "active"/"on file" can only ever be authored
       by the billing backend against a real provider result. */
    const status = (method || autopayRequested) ? "pending_setup" : "not_configured";
    const b = p.billingAddress || {};
    /* The three text leaves are judged together as well as one by one: an
       address never carries thirteen digits across street, city and state,
       so when they do — a card number split in halves, a routing number
       beside an account number — none of them is an address. A state
       carries no digits at all; five is the allowance for a stray zip. */
    const spread = digits(b.street) + digits(b.city) + digits(b.state) >= 13;
    const billingAddress = {
      street: spread ? "" : safeAddr(b.street, 120),
      city: spread ? "" : safeAddr(b.city, 80),
      state: spread ? "" : safeAddr(b.state, 40, 5),
      zip: US_ZIP.test(bounded(b.zip, 10)) ? bounded(b.zip, 10) : "",
    };
    const out = { method, autopayRequested, status, card, ach, billingAddress };
    /* A legacy last4 is safe historical metadata and the only payment
       reference some old records have — kept, labelled, never re-derived.
       It must be exactly four digits or nothing: taking the last four of a
       longer value would manufacture a reference out of a number RALLY
       should not be holding in the first place, and a truncated card number
       displayed as "ends 4242" is a fabricated payment fact. */
    const l4 = p.last4 == null ? "" : String(p.last4).replace(/[^0-9]/g, "");
    if (l4.length === 4) out.last4 = l4;
    return out;
  }

  function renderPayment() {
    /* STALE-CACHE GUARD. v39 removed the card/ACH number inputs from the
       markup. If they are on the page anyway, this load is a mix of cached
       v38 markup and v39 code — which a slow network can produce for one
       page load during an upgrade. It boots cleanly and looks fine, and that
       is the danger: the rep would type a real card number into a field this
       code never reads. Say so instead of failing silently. */
    if ($("#cp-cc-num") || $("#cp-ach-routing")) {
      ["#cp-cc-num", "#cp-cc-exp", "#cp-ach-routing", "#cp-ach-account"].forEach((sel) => {
        const el = $(sel);
        if (el) { el.value = ""; el.disabled = true; el.placeholder = "Reopen RALLY to finish updating"; }
      });
      toast("RALLY is still updating — close and reopen before taking payment details");
    }
    // method can honestly be "" (migrated collect-at-service): no bubble
    // lights up and both panels stay closed until the rep picks one
    $$(".pay-m").forEach((b) => b.classList.toggle("sel", b.dataset.m === cur.payment.method));
    $("#cp-card").hidden = cur.payment.method !== "card";
    $("#cp-ach").hidden = cur.payment.method !== "ach";
    const c = cur.payment.card, a = cur.payment.ach, ba = cur.payment.billingAddress;
    $("#cp-cc-name").value = c.name || "";
    $("#cp-ach-name").value = a.name || "";
    $$("#cp-ach-type .seg-opt").forEach((b) => b.classList.toggle("sel", b.dataset.a === (a.type || "checking")));
    $("#cp-b-street").value = ba.street || "";
    $("#cp-b-city").value = ba.city || "";
    $("#cp-b-state").value = ba.state || "";
    $("#cp-b-zip").value = ba.zip || "";
    $("#cp-autopay").classList.toggle("on", cur.payment.autopayRequested === true);
    $("#cp-due").textContent = fmtMoney((cur.plan.initial || 0) + specSum("initial"));
    paymentStatusLine();
  }

  // says exactly what RALLY knows and what it does not
  function paymentStatusLine() {
    const p = cur.payment;
    const el = $("#cp-status-line");
    if (el) {
      el.textContent = p.method
        ? "Payment setup is PENDING. The customer intends to pay by "
          + (p.method === "ach" ? "bank draft" : "card")
          + (p.autopayRequested ? " and asked for autopay" : "")
          + ". The office must collect the actual payment method before the initial service — autopay is not active yet."
        : "No payment method chosen yet. Nothing is on file and nothing is scheduled to be charged.";
    }
    const lg = $("#cp-legacy-line");
    if (lg) {
      lg.hidden = !p.last4;
      lg.textContent = p.last4
        ? "Historical reference from an older record: ends " + p.last4
          + ". That is a note, not a payment method on file."
        : "";
    }
  }

  function collectPayment() {
    // Names and a billing address, and that is the whole of it. There is no
    // card-number field, no expiry field, no routing or account field —
    // nothing on this screen can put a credential into a RALLY record.
    const typed = {
      card: $("#cp-cc-name").value.trim(),
      ach: $("#cp-ach-name").value.trim(),
      zip: $("#cp-b-zip").value.trim(),
      street: $("#cp-b-street").value.trim(),
    };
    cur.payment.card = { name: typed.card };
    cur.payment.ach = {
      name: typed.ach,
      type: (cur.payment.ach && cur.payment.ach.type) || "checking",
    };
    cur.payment.billingAddress = {
      street: typed.street, city: $("#cp-b-city").value.trim(),
      state: $("#cp-b-state").value.trim(), zip: typed.zip,
    };
    cur.payment = MCUST.honestPayment(cur.payment);
    /* A value the shape rules refused must not just disappear. Silence here
       would read as "saved" and the rep would never learn why the field is
       empty next time they open the record — and if what they typed was a
       card number, the one thing they must be told is that RALLY has no
       field for it. Say it out loud, once. */
    const refused = [];
    if (typed.card && !cur.payment.card.name) refused.push("name on card");
    if (typed.ach && !cur.payment.ach.name) refused.push("name on account");
    if (typed.street && !cur.payment.billingAddress.street) refused.push("billing address");
    if (typed.zip && !cur.payment.billingAddress.zip) refused.push("billing ZIP");
    if (refused.length) {
      const numeric = (typed.card + typed.ach).replace(/[^0-9]/g, "").length >= 4;
      toast(numeric
        ? "RALLY has no card or bank number field on purpose — the " +
          refused.join(" and ") + " was not saved. The office collects the payment method."
        : "Not saved: " + refused.join(", ") + " — check the format.");
    }
  }

  // ---------- AGREE ----------
  let sigCtx = null, sigCanvas = null, drawing = false, sigDrawn = false;

  function renderAgree() {
    collectInfo(); collectService(); collectPayment();
    const signed = cur.agreement && cur.agreement.signedAt;
    $("#ca-unsigned").hidden = !!signed;
    $("#ca-signed").hidden = !signed;
    if (signed) {
      const filed = (cur.files || []).find((x) => x.kind === "agreement");
      const when = new Date(cur.agreement.signedAt).toLocaleString();
      const forId = curId; // a late lookup must not paint over another record
      /* Three honest states, and never a fourth one where RALLY rebuilds a
         document from today's numbers and calls it the signed copy:
           have   the filed bytes are on this device — print/share them
           away   a copy was filed, but on the device that took the sale
                  (file bytes don't sync yet)
           none   no copy was ever filed for this agreement */
      const paint = (state) => {
        if (curId !== forId) return;
        const have = state === "have";
        ["#ca-print", "#ca-share"].forEach((sel) => {
          const b = $(sel); if (!b) return;
          b.disabled = !have;
          b.title = have ? "" : "The signed copy isn't on this device";
        });
        $("#ca-signed-sub").textContent =
          state === "have" ? `Signed ${when} — a copy is in Files.`
          : state === "away"
            ? `Signed ${when}. The signed copy is on the device that took this sale — file copies don't sync yet.`
            : `Signed ${when}. No signed copy was saved for this agreement — RALLY will not rebuild one.`;
      };
      if (!filed) { paint("none"); return; }
      paint("away"); // pessimistic until the blob is actually found
      STORE.getFile(filed.id)
        .then((rec) => paint(rec && rec.blob ? "have" : "away"))
        .catch(() => paint("away"));
      return;
    }
    const { p, initial, monthly, discount, etf, term, bill, perCharge } = MCONTRACT.pricing(cur);
    const specLines = (cur.specialty || []).map((sv) =>
      `<div class="rowline"><span>+ ${esc(sv.name)}</span><b>${fmtMoney(sv.initial)} initial · ${fmtMoney(sv.monthly)}/mo</b></div>`).join("");
    $("#ca-summary").innerHTML =
      `<div class="rowline"><span>Customer</span><b>${esc(STORE.custName(cur))}</b></div>` +
      `<div class="rowline"><span>Plan</span><b>${p.name} · ${term} months</b></div>` +
      `<div class="rowline"><span>Spray frequency</span><b>${esc(p.visits || "")}</b></div>` +
      specLines +
      `<div class="rowline"><span>Initial (after ${fmtMoney(discount)} discount)</span><b>${fmtMoney(initial)}</b></div>` +
      `<div class="rowline"><span>Recurring</span><b>${fmtMoney(monthly)}/mo${bill.mult > 1 ? ` — billed ${fmtMoney(perCharge)} every ${bill.every}` : ""}</b></div>` +
      `<div class="rowline"><span>Early-exit fee if cancelled early</span><b>${fmtMoney(etf)} max</b></div>`;
    $("#ca-consent1-label").textContent =
      `The customer agrees to do business electronically and to the ${term}-month service agreement shown above.`;
    $("#ca-doc").innerHTML = MCONTRACT.bodyHTML(cur, null);
    // FieldRoutes-style gate: the customer scrolls the WHOLE agreement
    // before the sign button unlocks — the disclosure actually happens
    const doc = $("#ca-doc");
    doc.scrollTop = 0;
    scrolledDoc = false;
    // consents and signature are reset in openEditor, not here — flipping
    // tabs mid-signing must not wipe what the customer already did
    requestAnimationFrame(() => {
      setupSig();
      // a doc short enough to show whole needs no scrolling
      if (doc.scrollHeight <= doc.clientHeight + 12) scrolledDoc = true;
      updateSignGate();
    });
  }

  let scrolledDoc = false;
  function updateSignGate() {
    const btn = $("#ca-sign-save");
    btn.disabled = !scrolledDoc;
    btn.textContent = scrolledDoc ? "Sign & save agreement ✓" : "Scroll the agreement to sign";
  }

  function setupSig() {
    sigCanvas = $("#ca-sig");
    if (!sigCanvas || $("#ca-unsigned").hidden) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const rect = sigCanvas.getBoundingClientRect();
    if (rect.width === 0) { requestAnimationFrame(setupSig); return; }
    const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
    if (sigCanvas.width === w && sigCanvas.height === h && sigCtx) return;
    const snapshot = sigDrawn ? sigCanvas.toDataURL("image/png") : null;
    sigCanvas.width = w; sigCanvas.height = h;
    sigCtx = sigCanvas.getContext("2d");
    sigCtx.scale(dpr, dpr);
    sigCtx.lineWidth = 2.2; sigCtx.lineCap = "round"; sigCtx.lineJoin = "round";
    sigCtx.strokeStyle = "#101828";
    if (snapshot) {
      const img = new Image();
      img.onload = () => sigCtx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = snapshot;
    } else sigDrawn = false;
  }
  addEventListener("resize", () => {
    if (curTab === "agree" && document.body.classList.contains("editing")) setupSig();
  });

  const sigPos = (e) => {
    const r = sigCanvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };
  function sigStart(e) { if (!sigCtx) return; e.preventDefault(); drawing = true; const p = sigPos(e); sigCtx.beginPath(); sigCtx.moveTo(p.x, p.y); }
  function sigMove(e) { if (!drawing || !sigCtx) return; e.preventDefault(); const p = sigPos(e); sigCtx.lineTo(p.x, p.y); sigCtx.stroke(); sigDrawn = true; }
  function sigEnd() { drawing = false; }

  async function signAndSave() {
    collectInfo(); collectService(); collectPayment();
    if (!cur.first) { showTab("info"); toast("First name is required"); return; }
    if (!scrolledDoc) { toast("Scroll through the whole agreement with the customer first"); return; }
    if (!$("#ca-consent1").checked || !$("#ca-consent2").checked) {
      toast("Both acknowledgment boxes are required"); return;
    }
    if (!sigDrawn) { toast("Customer signature is required"); return; }

    const sig = sigCanvas.toDataURL("image/png");
    cur.agreement = {
      signedAt: new Date().toISOString(),
      signature: sig,
      termMonths: cur.termMonths || MDATA.DEFAULT_TERM,
      consent: {
        esign: true, coolingOffVerbal: true, coolingOffNoticeGiven: true,
        scrolledFullAgreement: true, // the sign button only unlocks after a full scroll
        capturedAt: new Date().toISOString(),
      },
    };
    // file the signed copy
    try {
      const html = MCONTRACT.docHTML(cur, sig);
      const rec = await STORE.putFile(new Blob([html], { type: "text/html" }), {
        name: `Agreement — ${STORE.custName(cur)}.html`, type: "text/html",
      });
      cur.files = cur.files || [];
      cur.files.push({ id: rec.id, name: rec.name, type: rec.type, addedAt: rec.addedAt, kind: "agreement" });
    } catch (_) { /* the agreement itself is still saved on the customer */ }

    const ok = await persist(false);
    if (!ok) return;
    // flip the linked pin to sold
    const pin = cur.pinId && STORE.pins.find((p) => p.id === cur.pinId);
    if (pin && pin.disposition !== "sold") {
      try { await STORE.addKnock({ pinId: pin.id, disposition: "sold", dm: true }); } catch (_) {}
      if (window.MMAP) MMAP.refreshPins();
    }
    const name = STORE.custName(cur);
    closeEditor();
    renderList();
    if (window.MSTAT) MSTAT.render();
    celebrate(STORE.settings.commissionPerSale, name);
  }

  // ---------- FILES ----------
  async function renderFiles() {
    const list = $("#cfl-list");
    const files = cur.files || [];
    if (!files.length) {
      list.innerHTML = `<div class="hood-empty">The signed agreement and job photos land here</div>`;
      return;
    }
    list.innerHTML = files.map((f, i) =>
      `<div class="file-row" data-i="${i}">
         <span class="fic">${f.kind === "agreement" ? "📄" : (f.type || "").startsWith("image/") ? "📷" : "📎"}</span>
         <span class="fnm"><b>${esc(f.name)}</b><br><span class="dim">${new Date(f.addedAt).toLocaleString()}</span></span>
         <button type="button" class="file-share" data-i="${i}" aria-label="Share file">Share</button>
         ${f.kind === "agreement" ? `<button type="button" class="file-print" data-i="${i}" aria-label="Print">Print</button>` : ""}
         <button type="button" class="mini-x" data-i="${i}" aria-label="Delete file">✕</button>
       </div>`
    ).join("");
    $$("#cfl-list .file-share").forEach((b) =>
      b.addEventListener("click", async () => {
        const f = cur.files[+b.dataset.i];
        const rec = await STORE.getFile(f.id);
        if (!rec) { toast("File is missing from storage"); return; }
        await MUI.shareOrDownload(rec.blob, f.name, f.type || "application/octet-stream");
      }));
    $$("#cfl-list .file-print").forEach((b) =>
      b.addEventListener("click", async () => {
        const f = cur.files[+b.dataset.i];
        const rec = await STORE.getFile(f.id);
        if (rec) MCONTRACT.print(await rec.blob.text());
      }));
    $$("#cfl-list .mini-x").forEach((b) =>
      b.addEventListener("click", async () => {
        const f = cur.files[+b.dataset.i];
        if (!confirm(`Delete “${f.name}”?`)) return;
        try { await STORE.deleteFile(f.id); } catch (_) {}
        cur.files.splice(+b.dataset.i, 1);
        renderFiles();
      }));
  }

  async function addFile(fileObj) {
    try {
      const rec = await STORE.putFile(fileObj, { name: fileObj.name || "Photo", type: fileObj.type });
      cur.files = cur.files || [];
      cur.files.push({ id: rec.id, name: rec.name, type: rec.type, addedAt: rec.addedAt, kind: "photo" });
      renderFiles();
      toast("Added — remember to Save Customer");
    } catch (_) {
      toast("Couldn't store the file — storage may be full");
    }
  }

  // ---------- persist ----------
  async function persist(announce) {
    collectInfo(); collectService(); collectPayment();
    if (!cur.first) { showTab("info"); toast("First name is required"); return false; }
    try {
      if (curId) {
        // write onto the live record so in-memory list stays the same object
        const live = STORE.customers.find((x) => x.id === curId);
        Object.keys(cur).forEach((k) => { live[k] = cur[k]; });
        await STORE.updateCustomer(live);
      } else {
        const saved = await STORE.addCustomer(cur);
        curId = saved.id;
      }
    } catch (_) {
      toast("Couldn't save — storage may be full. Try again.");
      return false;
    }
    if (announce) {
      const nm = STORE.custName(cur);
      closeEditor();
      renderList();
      if (window.MMAP) MMAP.updateBrandToday();
      toast(nm + " saved");
    }
    return true;
  }

  // ---------- the customers screen ----------
  // One quiet dropdown instead of the chip strip; the full filter panel
  // (scope, service, sales status, sort) drops down from More → Customers.
  /* Scope defaults to ALL, not "mine". v39 decides "mine" from a stable id,
     and a pre-v39 customer has no such id — defaulting to "mine" would make
     every legacy customer vanish from the list on first launch. They are
     shown; they are simply not counted as anyone's. */
  let flt = { stage: "all", scope: "all", service: "all", sales: "all", sort: "newest" };
  let panelOpen = false;

  const FILTER_OPTS = [
    ["all", "All"], ["sold", "Sold"], ["scheduled", "Scheduled"],
    ["notsched", "Not scheduled"], ["active", "Active"], ["canceled", "Canceled"],
  ];
  const SORT_OPTS = [
    ["newest", "Newest sold"], ["oldest", "Oldest sold"],
    ["earliest", "Earliest scheduled"], ["latest", "Latest scheduled"],
  ];
  const SERVICE_OPTS = [
    ["all", "All"], ["needed", "Service needed"], ["agreement", "Agreement needed"],
    ["notsched", "Not scheduled"], ["pending", "Pending appointment"], ["serviced", "Serviced"],
  ];

  function stageOf(c) {
    if (c.acct === "canceled") return "canceled";
    const signed = STORE.custSignedAt(c);
    const next = STORE.nextAppointment(c);
    const serviced = STORE.lastServiced(c);
    if (serviced) return "active";
    if (next) return "scheduled";
    if (signed) return "notsched";
    return "sold"; // unsigned drafts still live under Sold-ish work
  }

  function matches(c) {
    if (flt.stage !== "all") {
      const st = stageOf(c);
      if (flt.stage === "sold" ? !STORE.custSignedAt(c) || st === "canceled" : st !== flt.stage) return false;
    }
    if (flt.scope === "mine" && !STORE.custIsMine(c)) return false;
    if (flt.sales === "active" && (c.acct === "frozen" || c.acct === "canceled")) return false;
    if (flt.sales === "frozen" && c.acct !== "frozen") return false;
    if (flt.service !== "all") {
      const signed = STORE.custSignedAt(c), next = STORE.nextAppointment(c), serviced = STORE.lastServiced(c);
      if (flt.service === "needed" && (!signed || serviced)) return false;
      if (flt.service === "agreement" && signed) return false;
      if (flt.service === "notsched" && (!signed || next || serviced)) return false;
      if (flt.service === "pending" && !next) return false;
      if (flt.service === "serviced" && !serviced) return false;
    }
    return true;
  }

  function sortList(list) {
    const soldTs = (c) => c.soldAt || c.createdAt || 0;
    const schedTs = (c) => { const n = STORE.nextAppointment(c); return n ? n.ts : Infinity; };
    if (flt.sort === "oldest") return list.sort((a, b) => soldTs(a) - soldTs(b));
    if (flt.sort === "earliest") return list.sort((a, b) => schedTs(a) - schedTs(b));
    if (flt.sort === "latest") return list.sort((a, b) => (schedTs(b) === Infinity ? -1 : schedTs(b)) - (schedTs(a) === Infinity ? -1 : schedTs(a)));
    return list.sort((a, b) => soldTs(b) - soldTs(a));
  }

  const optLabel = (opts, v) => (opts.find(([id]) => id === v) || opts[0])[1];

  // small pop menu anchored under a pill
  function popMenu(anchor, opts, curVal, onPick) {
    const old = document.querySelector(".pop-menu");
    if (old) {
      const same = old.dataset.anchor === (anchor.id || "");
      old.remove();
      if (same) return; // second tap on the same pill = toggle off
    }
    const m = document.createElement("div");
    m.className = "pop-menu";
    m.dataset.anchor = anchor.id || "";
    m.innerHTML = opts.map(([id, label]) =>
      `<button type="button" data-v="${id}" class="${id === curVal ? "sel" : ""}">${label}${id === curVal ? " ✓" : ""}</button>`).join("");
    const r = anchor.getBoundingClientRect();
    m.style.left = Math.min(r.left, innerWidth - 190) + "px";
    m.style.top = (r.bottom + 6) + "px";
    document.body.appendChild(m);
    m.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => { m.remove(); onPick(b.dataset.v); }));
    setTimeout(() => addEventListener("click", function away(e) {
      if (!m.contains(e.target)) { m.remove(); removeEventListener("click", away); }
    }), 0);
  }

  function renderPanel() {
    const panel = $("#cust-panel");
    panel.hidden = !panelOpen;
    if (!panelOpen) return;
    const bub = (id, label, opts, cur) =>
      `<button type="button" class="pill fp" data-f="${id}">${label}: <b>${optLabel(opts, cur)}</b> <span class="pill-arrow">▾</span></button>`;
    panel.innerHTML =
      bub("scope", "Customers", [["mine", "My customers"], ["all", "All customers"]], flt.scope) +
      bub("service", "Service", SERVICE_OPTS, flt.service) +
      bub("sales", "Sales status", [["all", "All"], ["active", "Active"], ["frozen", "Frozen"]], flt.sales) +
      `<button type="button" class="pill" id="fp-close">✕ Hide filters</button>`;
    const fc = panel.querySelector("#fp-close");
    if (fc) fc.addEventListener("click", () => { panelOpen = false; renderPanel(); });
    panel.querySelectorAll(".fp").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = b.dataset.f;
        const opts = id === "scope" ? [["mine", "My customers"], ["all", "All customers"]]
          : id === "service" ? SERVICE_OPTS
          : [["all", "All"], ["active", "Active"], ["frozen", "Frozen"]];
        popMenu(b, opts, flt[id], (v) => { flt[id] = v; renderPanel(); renderList(); });
      }));
  }

  // long-press = delete, twice-confirmed — a book is months of work
  let pressTimer = null, pressFired = false;
  function armLongPress(el, c) {
    const start = () => {
      pressFired = false;
      pressTimer = setTimeout(async () => {
        pressFired = true;
        if (navigator.vibrate) { try { navigator.vibrate(30); } catch (_) {} }
        if (!confirm(`Delete ${STORE.custName(c)}?`)) return;
        if (!confirm(`Once you delete this customer they are gone forever, agreement and all. Really delete?`)) return;
        await STORE.deleteCustomer(c.id);
        renderList();
        toast("Customer deleted");
      }, 650);
    };
    const cancel = () => clearTimeout(pressTimer);
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchend", cancel);
    el.addEventListener("touchmove", cancel);
    el.addEventListener("mousedown", start);
    el.addEventListener("mouseup", cancel);
    el.addEventListener("mouseleave", cancel);
  }

  function renderList() {
    $("#cf-filter").innerHTML = `${optLabel(FILTER_OPTS, flt.stage)} <span class="pill-arrow">▾</span>`;
    $("#cf-sort").innerHTML = `${optLabel(SORT_OPTS, flt.sort)} <span class="pill-arrow">▾</span>`;
    renderPanel();
    const q = ($("#cust-q").value || "").trim().toLowerCase();
    const all = STORE.customers.slice();
    const list = sortList(all.filter((c) =>
      matches(c) &&
      (!q || STORE.custName(c).toLowerCase().includes(q) ||
        STORE.custAddress(c).toLowerCase().includes(q))));

    // scoping to "my customers" must say so when it's actually hiding rows
    const note = $("#cf-scope-note");
    if (note) {
      // say honestly WHY a row is hidden: someone else's sale is not the
      // same thing as a record nobody can be proved to have sold
      const hidden = flt.scope === "mine" ? all.filter((c) => !STORE.custIsMine(c)) : [];
      const unattr = hidden.filter((c) => !STORE.custIsAttributed(c)).length;
      const theirs = hidden.length - unattr;
      note.hidden = !hidden.length;
      note.textContent = hidden.length
        ? "Mine · " + [theirs ? theirs + " from the team" : "",
            unattr ? unattr + " unattributed" : ""].filter(Boolean).join(" · ") + " hidden"
        : "";
      note.onclick = () => { flt.scope = "all"; renderList(); };
    }
    if (!all.length) {
      $("#cust-list").innerHTML = `<div class="empty plain">No customers yet.</div>`;
      return;
    }
    $("#cust-list").innerHTML = list.map((c) => {
      const stage = STORE.custStage(c);
      const signed = STORE.custSignedAt(c);
      const when = signed ? new Date(signed).getTime() : (c.soldAt || c.createdAt);
      const who = esc(STORE.custSoldByLabel(c));
      const flag = c.acct === "frozen" ? " · ❄️ Frozen" : c.acct === "canceled" ? " · Canceled" : "";
      return `<button class="cust-row" data-cid="${c.id}" type="button">
         <div class="crn">${esc(STORE.custName(c))}
           <span class="stage-tag" style="color:${stage.chip};border-color:${stage.chip}">${stage.label}</span></div>
         <div class="cra">${esc(STORE.custAddress(c)) || "No address"}${flag}</div>
         <div class="crs">${signed ? "Sold" : "Added"}: ${MUI.fmtDate(when)}${who ? " by " + who : " · unattributed"}</div>
         <div class="crst">${actionLine(c, stage)}</div>
       </button>`;
    }).join("") || `<div class="empty plain">Nothing matches those filters.</div>`;

    $$("#cust-list .cust-row").forEach((b) => {
      const c = STORE.customers.find((x) => x.id === b.dataset.cid);
      b.addEventListener("click", () => { if (!pressFired) open(b.dataset.cid); });
      if (c) armLongPress(b, c);
    });
  }

  function actionLine(c, stage) {
    if (stage.id === "active") {
      const sv = STORE.lastServiced(c);
      return `<span class="st-serviced">Serviced: ${MUI.fmtDate(sv)} ${MUI.fmtTime(sv)} ✓</span>`;
    }
    if (stage.id === "scheduled") return `<span class="st-scheduled">${stage.nextLabel}</span>`;
    return `<span class="st-act">${stage.nextLabel}</span>`;
  }

  function setFilter(id) {
    flt.stage = FILTER_OPTS.some(([k]) => k === id) ? id : "all";
    renderList();
  }

  // More → Customers: same book, every lever showing
  function openAdvanced() {
    panelOpen = true;
    flt.scope = "mine";
    if (window.MAPP) MAPP.show("customers");
    renderList();
  }

  // ---------- export (More menu) ----------
  async function exportAll() {
    if (sanitationBlocked()) return;
    if (!STORE.customers.length) { toast("Nothing to export yet"); return; }
    // The export gets handed to the office. It carries no credentials:
    // RALLY holds no card or bank numbers to leak into it, and the
    // payment block is rebuilt from the safe allowlist regardless.
    const redacted = STORE.customers.map((c) => {
      const copy = JSON.parse(JSON.stringify(c));
      if (copy.payment) copy.payment = honestPayment(copy.payment);
      return copy;
    });
    const payload = {
      exportedAt: new Date().toISOString(),
      rep: (STORE.currentUser() || {}).name || "",
      repUserId: STORE.myId(),
      fieldroutes: {
        subdomain: STORE.settings.frSubdomain || null,
        note: "Map each record to customer/create + subscription/create + appointment/create. " +
          "RALLY captures NO payment credentials: each record carries only the method the customer intends to use, whether they asked for autopay, and the billing address. Collect the actual payment method separately before the initial service.",
      },
      customers: redacted,
    };
    const json = JSON.stringify(payload, null, 2);
    const name = "rally-customers-" + MUI.dayKey(Date.now()) + ".json";
    await MUI.shareOrDownload(json, name, "application/json", "RALLY customers");
    toast("Customers exported");
  }

  // Called when a late reverse-geocode resolves while the editor is open
  function fillAddress(geoPin) {
    if (!cur || cur.pinId !== geoPin.id) return;
    const f = $("#ci-street");
    if (f && !f.value.trim() && geoPin.address) {
      const parts = geoPin.address.split(",").map((s) => s.trim());
      f.value = parts[0] || "";
      if (!$("#ci-city").value && geoPin.geo) $("#ci-city").value = geoPin.geo.city || "";
      if (!$("#ci-state").value && geoPin.geo) $("#ci-state").value = geoPin.geo.state || "";
      if (!$("#ci-zip").value && geoPin.geo) $("#ci-zip").value = geoPin.geo.zip || "";
    }
  }

  // ---------- bind ----------
  function bind() {
    $("#cust-fab").addEventListener("click", () => { tick(); startNew(); });
    $("#cust-q").addEventListener("input", renderList);
    $("#cf-filter").addEventListener("click", (e) => {
      e.stopPropagation();
      popMenu($("#cf-filter"), FILTER_OPTS, flt.stage, (v) => { flt.stage = v; renderList(); });
    });
    $("#cf-sort").addEventListener("click", (e) => {
      e.stopPropagation();
      popMenu($("#cf-sort"), SORT_OPTS, flt.sort, (v) => { flt.sort = v; renderList(); });
    });

    $("#ce-back").addEventListener("click", () => {
      if (!curId && (cur.first || cur.last || $("#ci-first").value.trim())) {
        if (!confirm("Leave without saving this customer?")) return;
      }
      closeEditor();
    });
    $("#ce-save").addEventListener("click", () => persist(true));
    $$(".ce-tab").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        collectInfo(); collectService(); collectPayment();
        showTab(b.dataset.t);
      }));

    // additional contact lives in a small sheet, not the form
    $("#ci-add-contact").addEventListener("click", () => {
      tick();
      $("#cc-name").value = ""; $("#cc-phone").value = "";
      openSheet("contact-sheet");
      requestAnimationFrame(() => { try { $("#cc-name").focus(); } catch (_) {} });
    });
    $("#cc-save").addEventListener("click", () => {
      const name = $("#cc-name").value.trim();
      if (!name) { toast("Contact name first"); return; }
      cur.contacts.push({ name, phone: fmtPhone($("#cc-phone").value.trim()) });
      closeSheet();
      renderContacts();
    });
    $("#cc-phone").addEventListener("input", () => {
      const f = fmtPhone($("#cc-phone").value);
      if (f !== $("#cc-phone").value) $("#cc-phone").value = f;
    });

    $("#ci-gps").addEventListener("click", () => { tick(); useMyLocation(); });

    ["text", "email"].forEach((k) =>
      $("#ci-rem-" + k).addEventListener("click", () => {
        tick();
        cur.reminders[k] = !cur.reminders[k];
        $("#ci-rem-" + k).classList.toggle("on", cur.reminders[k]);
      }));
    $("#ci-switch").addEventListener("click", () => {
      tick();
      cur.switchOver = !cur.switchOver;
      $("#ci-switch").classList.toggle("on", cur.switchOver);
    });
    $("#ci-notes-forever").addEventListener("input", () => { cur.notesForever = $("#ci-notes-forever").value; });
    $("#ci-notes-initial").addEventListener("input", () => { cur.notesInitial = $("#ci-notes-initial").value; });

    // ---- service: plan dropdown, tappable prices, term & billing ----
    $("#cs-plan-cur").addEventListener("click", () => { tick(); planOpen = !planOpen; renderService(); });
    $("#cs-spec-toggle").addEventListener("click", () => { tick(); specOpen = !specOpen; renderSpecialty(); });
    $("#cs-fup-toggle").addEventListener("click", () => { tick(); fupOpen = !fupOpen; renderTermBilling(); });
    ["cs-initial", "cs-monthly"].forEach((id) => {
      // tap = the field empties and you just type the new price; leaving it
      // blank puts the old number back. No text selection, no blue handles.
      $("#" + id).addEventListener("focus", () => {
        const el = $("#" + id);
        el.dataset.prev = el.value;
        el.value = "";
        refreshPriceUI();
      });
      $("#" + id).addEventListener("input", refreshPriceUI);
      $("#" + id).addEventListener("blur", () => {
        const el = $("#" + id);
        if (el.value === "" && el.dataset.prev) { el.value = el.dataset.prev; refreshPriceUI(); }
        // finished typing: a below-floor price gets the UNPROFITABLE box —
        // OK leaves it to fix by hand, Clear snaps back to the sticker.
        // (Saving or switching tabs still clamps to the floor regardless.)
        const f = planFloor();
        const under = (Number($("#cs-initial").value) || 0) < f.initial ||
                      (Number($("#cs-monthly").value) || 0) < f.monthly;
        if (under) {
          $("#unprof-veil").hidden = false;
        } else {
          collectService();
        }
        refreshPriceUI();
      });
    });
    $("#unprof-ok").addEventListener("click", () => { $("#unprof-veil").hidden = true; });
    $("#unprof-clear").addEventListener("click", () => {
      const list = planDef();
      $("#cs-initial").value = list.initial;
      $("#cs-monthly").value = list.monthly;
      collectService();
      refreshPriceUI();
      $("#unprof-veil").hidden = true;
    });
    $$("#cs-term .seg-opt").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        if (b.dataset.m === "custom") {
          $("#cs-term-custom").hidden = false;
          $("#cs-term-custom").value = cur.termMonths;
          $$("#cs-term .seg-opt").forEach((x) => x.classList.toggle("sel", x === b));
          try { $("#cs-term-custom").focus(); } catch (_) {}
          return;
        }
        cur.termMonths = +b.dataset.m;
        $("#cs-term-custom").hidden = true;
        renderTermBilling();
      }));
    $("#cs-term-custom").addEventListener("input", () => {
      const raw = $("#cs-term-custom").value;
      if (raw === "") return; // mid-edit blank is not "1 month"
      const v = Math.min(Math.max(Math.round(Number(raw) || 0), 1), 120);
      cur.termMonths = v;
      // update ONLY the math box — re-rendering the segments would hide
      // this input the instant a typed value happens to match a preset
      updateBillingMath();
    });
    $$("#cs-billing .seg-opt").forEach((b) =>
      b.addEventListener("click", () => { tick(); cur.billing = b.dataset.b; renderTermBilling(); }));

    // specialty price sheet
    ["sp-initial", "sp-monthly"].forEach((id) =>
      $("#" + id).addEventListener("input", specPriceCheck));
    $("#sp-cancel").addEventListener("click", () => {
      // cancelling a custom quote that was never priced = not sold
      const d = MDATA.SPECIALTY.find((x) => x.id === specEditing);
      const on = (cur.specialty || []).find((x) => x.id === specEditing);
      if (d && d.custom && on && !Number(on.initial) && !Number(on.monthly)) {
        cur.specialty = cur.specialty.filter((x) => x.id !== specEditing);
        renderSpecialty(); renderTermBilling();
      }
      closeSheet(); specEditing = null;
    });
    $("#sp-save").addEventListener("click", () => {
      if (!specPriceCheck()) return;
      const on = (cur.specialty || []).find((x) => x.id === specEditing);
      if (on) {
        on.initial = Math.round(Number($("#sp-initial").value) || 0);
        on.monthly = Math.round(Number($("#sp-monthly").value) || 0);
      }
      closeSheet();
      specEditing = null;
      renderSpecialty();
      renderTermBilling();
    });

    // ---- payment ----
    $$(".pay-m").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        collectPayment();
        // tapping the selected method again clears it — "" is a legitimate,
        // honest answer and must stay reachable
        cur.payment.method = cur.payment.method === b.dataset.m ? "" : b.dataset.m;
        renderPayment();
      }));
    $$("#cp-ach-type .seg-opt").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        cur.payment.ach.type = b.dataset.a;
        $$("#cp-ach-type .seg-opt").forEach((x) => x.classList.toggle("sel", x === b));
      }));
    $("#cp-copy-addr").addEventListener("click", () => {
      tick();
      collectInfo();
      $("#cp-b-street").value = cur.address.street;
      $("#cp-b-city").value = cur.address.city;
      $("#cp-b-state").value = cur.address.state;
      $("#cp-b-zip").value = cur.address.zip;
      toast("Service address copied");
    });
    $("#cp-autopay").addEventListener("click", () => {
      tick();
      // records a REQUEST, which is all a door-step conversation can produce
      cur.payment.autopayRequested = cur.payment.autopayRequested !== true;
      $("#cp-autopay").classList.toggle("on", cur.payment.autopayRequested);
      paymentStatusLine();
    });

    // ---- agree ----
    $("#ca-sign-save").addEventListener("click", signAndSave);
    $("#ca-doc").addEventListener("scroll", () => {
      if (scrolledDoc) return;
      const d = $("#ca-doc");
      if (d.scrollTop + d.clientHeight >= d.scrollHeight - 24) {
        scrolledDoc = true;
        updateSignGate();
      }
    });
    $("#ca-sig-clear").addEventListener("click", () => {
      if (sigCtx) { sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height); sigDrawn = false; }
    });
    /* A signed agreement is a DOCUMENT, not a template. Print and Share
       hand over the exact bytes filed at signing, or they hand over
       nothing. There is NO regeneration fallback: rebuilding the page from
       today's record would reprint the discount, term and exit-fee
       arithmetic as they stand now, under a real signature, and call it the
       document the customer signed. An honest "we don't have it" is the
       only other correct answer. */
    const signedDoc = async () => {
      const f = (cur.files || []).find((x) => x.kind === "agreement");
      if (!f) return null;
      const rec = await STORE.getFile(f.id).catch(() => null);
      if (!rec || !rec.blob) return null;
      return rec.blob.text();
    };
    const missingDoc = () => {
      const filed = (cur.files || []).some((x) => x.kind === "agreement");
      toast(filed
        ? "The signed copy is on the device that took this sale — it isn't in the cloud yet"
        : "No signed copy was saved for this agreement");
    };
    $("#ca-print").addEventListener("click", async () => {
      if (!cur || !cur.agreement) return;
      const doc = await signedDoc();
      if (doc) MCONTRACT.print(doc); else missingDoc();
    });
    $("#ca-share").addEventListener("click", async () => {
      if (!cur || !cur.agreement) return;
      const doc = await signedDoc();
      if (doc) MCONTRACT.share(doc, `Agreement — ${STORE.custName(cur)}.html`);
      else missingDoc();
    });
    const sp = $("#ca-sig");
    sp.addEventListener("mousedown", sigStart);
    sp.addEventListener("mousemove", sigMove);
    addEventListener("mouseup", sigEnd);
    sp.addEventListener("touchstart", sigStart, { passive: false });
    sp.addEventListener("touchmove", sigMove, { passive: false });
    sp.addEventListener("touchend", sigEnd);

    $("#cfl-input").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) addFile(f);
      e.target.value = "";
    });
  }

  window.MCUST = {
    bind, renderList, open, startNew, startForPin, fillAddress, exportAll,
    setFilter, openAdvanced,
    // the payment-shape gate, exported so the boot purge and the store use
    // the SAME rule the editor does — one definition, no second path
    honestPayment,
  };
})();
