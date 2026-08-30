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
      payment: {
        method: "card", autopay: true, last4: "",
        card: { name: "", number: "", exp: "" },
        ach: { name: "", routing: "", account: "", type: "checking" },
        billingAddress: { street: "", city: "", state: "", zip: "" },
      },
      acct: "active",                      // account status: active | frozen | canceled
      source: "Door to Door",
      appointments: [], referrals: [], files: [],
      agreement: null,
      pinId: null, lat: null, lng: null,
      soldBy: STORE.settings.repName, soldAt: Date.now(),
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
    if (!n.payment.card) n.payment.card = { name: "", number: "", exp: "" };
    if (!n.payment.ach) n.payment.ach = { name: "", routing: "", account: "", type: "checking" };
    if (!n.payment.billingAddress) n.payment.billingAddress = { street: "", city: "", state: "", zip: "" };
    // "collect at service" no longer exists, and the customer never gave a
    // card — an honest migration records NO method, not a fabricated one
    if (n.payment.method === "collect") n.payment.method = "";
    if (n.payment.method == null) n.payment.method = "";
    if (!n.billing) n.billing = "monthly";
    if (!n.acct) n.acct = "active";
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
  function startNew() {
    cur = blank(); curId = null;
    returnTo = "customers";
    openEditor("Creating Customer");
  }

  function startForPin(pin) {
    cur = blank(); curId = null;
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
    specEditing = null;
    const pe = $("#cs-price-edit");
    if (pe) pe.hidden = true;
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
    const init = Number($("#cs-initial").value) || 0;
    const mo = Number($("#cs-monthly").value) || 0;
    $("#cs-initial-val").textContent = fmtMoney(init);
    $("#cs-monthly-val").textContent = fmtMoney(mo);
    const f = planFloor();
    const under = init < f.initial || mo < f.monthly;
    $("#cs-unprofitable").hidden = !under;
    // the discount line IS the pitch: show what they're saving off sticker
    const dInit = Math.max(0, (list.listInitial || list.initial) - init);
    const dMo = Math.max(0, list.monthly - mo);
    $("#cs-discount").textContent = under || (!dInit && !dMo) ? "" :
      "Discount given: " +
      [dInit ? fmtMoney(dInit) + " off the initial" : "",
       dMo ? fmtMoney(dMo) + "/mo off the plan" : ""].filter(Boolean).join(" · ");
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
    const bill = MDATA.BILLING.find((b) => b.id === cur.billing) || MDATA.BILLING[0];
    const mo = (Number($("#cs-monthly").value) || cur.plan.monthly) + specSum("monthly");
    const init = (Number($("#cs-initial").value) || cur.plan.initial) + specSum("initial");
    const perCharge = mo * bill.mult;
    const total = init + mo * cur.termMonths;
    const specLines = (cur.specialty || []).map((sv) =>
      `<div class="rowline"><span>+ ${esc(sv.name)}</span><b>${fmtMoney(sv.initial)} initial · ${fmtMoney(sv.monthly)}/mo</b></div>`).join("");
    $("#cs-billing-math").innerHTML =
      specLines +
      `<div class="rowline"><span>Billed</span><b>${fmtMoney(perCharge)} every ${bill.every}</b></div>` +
      `<div class="rowline"><span>Contract</span><b>${cur.termMonths} months</b></div>` +
      `<div class="rowline total"><span>Total contract value</span><b>${fmtMoney(total)}</b></div>`;
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

  // ---------- PAYMENT ----------
  const luhn = (num) => {
    const d = String(num || "").replace(/\D/g, "");
    if (d.length < 13 || d.length > 19) return false;
    let sum = 0, dbl = false;
    for (let i = d.length - 1; i >= 0; i--) {
      let n = +d[i];
      if (dbl) { n *= 2; if (n > 9) n -= 9; }
      sum += n; dbl = !dbl;
    }
    return sum % 10 === 0;
  };
  const fmtCard = (v) => String(v || "").replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();

  function renderPayment() {
    // method can honestly be "" (migrated collect-at-service): no bubble
    // lights up and both panels stay closed until the rep picks one
    $$(".pay-m").forEach((b) => b.classList.toggle("sel", b.dataset.m === cur.payment.method));
    $("#cp-card").hidden = cur.payment.method !== "card";
    $("#cp-ach").hidden = cur.payment.method !== "ach";
    const c = cur.payment.card, a = cur.payment.ach, ba = cur.payment.billingAddress;
    $("#cp-cc-name").value = c.name || "";
    $("#cp-cc-num").value = fmtCard(c.number);
    $("#cp-cc-exp").value = c.exp || "";
    ccCheckLine();
    $("#cp-ach-name").value = a.name || "";
    $("#cp-ach-routing").value = a.routing || "";
    $("#cp-ach-account").value = a.account || "";
    $$("#cp-ach-type .seg-opt").forEach((b) => b.classList.toggle("sel", b.dataset.a === (a.type || "checking")));
    $("#cp-b-street").value = ba.street || "";
    $("#cp-b-city").value = ba.city || "";
    $("#cp-b-state").value = ba.state || "";
    $("#cp-b-zip").value = ba.zip || "";
    $("#cp-autopay").classList.toggle("on", !!cur.payment.autopay);
    $("#cp-due").textContent = fmtMoney((cur.plan.initial || 0) + specSum("initial"));
  }

  function ccCheckLine() {
    const num = $("#cp-cc-num").value.replace(/\D/g, "");
    const el = $("#cp-cc-check");
    if (!num) { el.textContent = ""; return; }
    el.textContent = luhn(num) ? "✓ Card number checks out" : "Card number doesn't check out yet";
    el.style.color = luhn(num) ? "var(--sold-ink, #15803D)" : "";
  }

  function collectPayment() {
    cur.payment.card = {
      name: $("#cp-cc-name").value.trim(),
      number: $("#cp-cc-num").value.replace(/\D/g, ""),
      exp: $("#cp-cc-exp").value.trim(),
    };
    cur.payment.ach = {
      name: $("#cp-ach-name").value.trim(),
      routing: $("#cp-ach-routing").value.replace(/\D/g, ""),
      account: $("#cp-ach-account").value.replace(/\D/g, ""),
      type: cur.payment.ach.type || "checking",
    };
    cur.payment.billingAddress = {
      street: $("#cp-b-street").value.trim(), city: $("#cp-b-city").value.trim(),
      state: $("#cp-b-state").value.trim(), zip: $("#cp-b-zip").value.trim(),
    };
    // last4 keeps status lines working without touching the full number.
    // A legacy record carries last4 with no stored number — an empty field
    // must never erase the only payment reference the record has.
    const n4 = cur.payment.method === "ach"
      ? cur.payment.ach.account.slice(-4)
      : cur.payment.card.number.slice(-4);
    if (n4) cur.payment.last4 = n4;
  }

  // The unselected method's numbers must not ride the record (and its
  // backups) forever — scrub them when the customer is actually saved.
  function scrubUnusedPayment() {
    if (cur.payment.method === "card") {
      cur.payment.ach.routing = ""; cur.payment.ach.account = "";
    } else if (cur.payment.method === "ach") {
      cur.payment.card.number = ""; cur.payment.card.exp = "";
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
      $("#ca-signed-sub").textContent =
        `Signed ${new Date(cur.agreement.signedAt).toLocaleString()} — a copy is in Files.`;
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
    scrubUnusedPayment();
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
  let flt = { stage: "all", scope: "mine", service: "all", sales: "all", sort: "newest" };
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
    if (flt.scope === "mine" && c.soldBy && c.soldBy !== STORE.settings.repName) return false;
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
      const hiddenByScope = flt.scope === "mine"
        ? all.filter((c) => c.soldBy && c.soldBy !== STORE.settings.repName).length : 0;
      note.hidden = !hiddenByScope;
      note.textContent = hiddenByScope ? `Mine · ${hiddenByScope} more from the team` : "";
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
      const who = esc(c.soldBy || STORE.settings.repName);
      const flag = c.acct === "frozen" ? " · ❄️ Frozen" : c.acct === "canceled" ? " · Canceled" : "";
      return `<button class="cust-row" data-cid="${c.id}" type="button">
         <div class="crn">${esc(STORE.custName(c))}
           <span class="stage-tag" style="color:${stage.chip};border-color:${stage.chip}">${stage.label}</span></div>
         <div class="cra">${esc(STORE.custAddress(c)) || "No address"}${flag}</div>
         <div class="crs">${signed ? "Sold" : "Added"}: ${MUI.fmtDate(when)} by ${who}</div>
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
    if (!STORE.customers.length) { toast("Nothing to export yet"); return; }
    // The export gets handed to the office — full card/ACH numbers stay on
    // this locked device, exactly as the payment tab promises. The office
    // reads them off the device screen when entering billing.
    const redacted = STORE.customers.map((c) => {
      const copy = JSON.parse(JSON.stringify(c));
      if (copy.payment) {
        copy.payment = {
          method: copy.payment.method || "",
          last4: copy.payment.last4 || "",
          autopay: !!copy.payment.autopay,
          billingAddress: copy.payment.billingAddress || null,
        };
      }
      return copy;
    });
    const payload = {
      exportedAt: new Date().toISOString(),
      rep: STORE.settings.repName,
      fieldroutes: {
        subdomain: STORE.settings.frSubdomain || null,
        note: "Map each record to customer/create + subscription/create + appointment/create. " +
          "Payment methods are redacted to last-4 — enter full billing details directly in FieldRoutes.",
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
    const openPriceEdit = (focusId) => {
      $("#cs-price-edit").hidden = false;
      requestAnimationFrame(() => { try { $(focusId).focus(); $(focusId).select(); } catch (_) {} });
    };
    $("#cs-initial-btn").addEventListener("click", () => { tick(); openPriceEdit("#cs-initial"); });
    $("#cs-monthly-btn").addEventListener("click", () => { tick(); openPriceEdit("#cs-monthly"); });
    ["cs-initial", "cs-monthly"].forEach((id) => {
      $("#" + id).addEventListener("input", refreshPriceUI);
      $("#" + id).addEventListener("blur", () => {
        // finished typing: a below-floor price gets the UNPROFITABLE box —
        // OK leaves it to fix by hand, Clear snaps back to the sticker.
        // (Saving or switching tabs still clamps to the floor regardless.)
        const f = planFloor();
        const under = (Number($("#cs-initial").value) || 0) < f.initial ||
                      (Number($("#cs-monthly").value) || 0) < f.monthly;
        if (under && $("#cs-price-edit") && !$("#cs-price-edit").hidden) {
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
        cur.payment.method = b.dataset.m;
        renderPayment();
      }));
    $("#cp-cc-num").addEventListener("input", () => {
      const f = fmtCard($("#cp-cc-num").value);
      if (f !== $("#cp-cc-num").value) $("#cp-cc-num").value = f;
      ccCheckLine();
    });
    $("#cp-cc-exp").addEventListener("input", () => {
      const raw = $("#cp-cc-exp").value;
      // "1/27" means January — pad the single-digit month instead of
      // shifting its digits into the year
      const m = /^(\d{1,2})\s*\/\s*(\d{0,2})/.exec(raw);
      let v;
      if (m && m[1].length === 1) v = ("0" + m[1]) + (m[2] ? "/" + m[2] : "/");
      else {
        v = raw.replace(/[^\d]/g, "").slice(0, 4);
        if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
      }
      $("#cp-cc-exp").value = v;
    });
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
      cur.payment.autopay = !cur.payment.autopay;
      $("#cp-autopay").classList.toggle("on", cur.payment.autopay);
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
    // A signed agreement is a DOCUMENT, not a template: print/share the
    // exact copy filed at signing. Regenerating from today's price sheet
    // would silently change the discount and exit-fee arithmetic the
    // customer actually signed. Fall back to regeneration only if the
    // filed copy is somehow gone.
    const signedDoc = async () => {
      const f = (cur.files || []).find((x) => x.kind === "agreement");
      if (f) {
        const rec = await STORE.getFile(f.id).catch(() => null);
        if (rec) return rec.blob.text();
      }
      return MCONTRACT.docHTML(cur, cur.agreement && cur.agreement.signature);
    };
    $("#ca-print").addEventListener("click", async () => {
      if (cur && cur.agreement) MCONTRACT.print(await signedDoc());
    });
    $("#ca-share").addEventListener("click", async () => {
      if (cur && cur.agreement)
        MCONTRACT.share(await signedDoc(), `Agreement — ${STORE.custName(cur)}.html`);
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

  window.MCUST = { bind, renderList, open, startNew, startForPin, fillAddress, exportAll, setFilter, openAdvanced };
})();
