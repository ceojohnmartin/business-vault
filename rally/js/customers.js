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
    return {
      first: "", last: "", phones: [{ n: "" }], email: "",
      address: { street: "", city: "", state: "", zip: "" },
      reminders: { text: true, email: true, voice: false },
      contacts: [], source: "Door to Door", mapCode: "", notes: "",
      plan: { id: "pro", name: "Pro", monthly: 69, initial: 49 },
      payment: { method: "card", last4: "", autopay: true },
      appointments: [], referrals: [], files: [],
      agreement: null,
      pinId: null, lat: null, lng: null,
      soldBy: STORE.settings.repName, soldAt: Date.now(),
    };
  }

  // legacy flat records edit cleanly: lift them into the new shape once
  function normalize(c) {
    const n = Object.assign(blank(), JSON.parse(JSON.stringify(c)));
    if (typeof c.address === "string") {
      const parts = c.address.split(",").map((s) => s.trim());
      n.address = { street: parts[0] || "", city: parts[1] || "", state: "", zip: "" };
    }
    if (!Array.isArray(n.phones) || !n.phones.length) {
      n.phones = [{ n: c.phone || "" }];
    }
    if (!n.plan || !n.plan.id) {
      const match = MDATA.PLANS.find((p) => p.name === c.planName);
      n.plan = {
        id: match ? match.id : "pro",
        name: c.planName || (match ? match.name : "Pro"),
        monthly: c.monthly != null ? c.monthly : 69,
        initial: c.initial != null ? c.initial : 49,
      };
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
    if (pin.note) cur.notes = pin.note;
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
    $("#ce-title").textContent = title;
    document.body.classList.add("editing");
    $("#screen-custedit").classList.add("active");
    fillForm();
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
    ["info", "service", "referrals", "payment", "agree", "files"].forEach((k) =>
      $("#ce-" + k).classList.toggle("active", k === t));
    if (t === "service") renderService();
    if (t === "referrals") renderReferrals();
    if (t === "payment") renderPayment();
    if (t === "agree") renderAgree();
    if (t === "files") renderFiles();
    // keep the strip's active tab in view
    const btn = $(`.ce-tab[data-t="${t}"]`);
    if (btn && btn.scrollIntoView) btn.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }

  // ---------- INFO ----------
  function fillForm() {
    $("#ci-first").value = cur.first || "";
    $("#ci-last").value = cur.last || "";
    $("#ci-email").value = cur.email || "";
    $("#ci-street").value = cur.address.street || "";
    $("#ci-city").value = cur.address.city || "";
    $("#ci-state").value = cur.address.state || "";
    $("#ci-zip").value = cur.address.zip || "";
    $("#ci-mapcode").value = cur.mapCode || "";
    $("#ci-notes").value = cur.notes || "";
    $("#ci-source").value = cur.source || "Door to Door";
    ["text", "email", "voice"].forEach((k) =>
      $("#ci-rem-" + k).classList.toggle("on", !!cur.reminders[k]));
    renderPhones();
    renderContacts();
  }

  function renderPhones() {
    $("#ci-phones").innerHTML = cur.phones.map((p, i) =>
      `<div class="phone-row">
         <input type="tel" inputmode="tel" placeholder="Phone number" value="${esc(p.n)}" data-i="${i}" class="ci-phone">
         ${cur.phones.length > 1 ? `<button type="button" class="mini-x" data-i="${i}" aria-label="Remove phone">✕</button>` : ""}
       </div>`
    ).join("");
    $$("#ci-phones .ci-phone").forEach((inp) =>
      inp.addEventListener("input", () => { cur.phones[+inp.dataset.i].n = inp.value; }));
    $$("#ci-phones .mini-x").forEach((b) =>
      b.addEventListener("click", () => { cur.phones.splice(+b.dataset.i, 1); renderPhones(); }));
  }

  function renderContacts() {
    $("#ci-contacts").innerHTML = cur.contacts.map((c, i) =>
      `<div class="chip-row"><span><b>${esc(c.name)}</b>${c.phone ? " · " + esc(c.phone) : ""}</span>
        <button type="button" class="mini-x" data-i="${i}" aria-label="Remove contact">✕</button></div>`
    ).join("");
    $$("#ci-contacts .mini-x").forEach((b) =>
      b.addEventListener("click", () => { cur.contacts.splice(+b.dataset.i, 1); renderContacts(); }));
  }

  function collectInfo() {
    cur.first = $("#ci-first").value.trim();
    cur.last = $("#ci-last").value.trim();
    cur.email = $("#ci-email").value.trim();
    cur.address = {
      street: $("#ci-street").value.trim(), city: $("#ci-city").value.trim(),
      state: $("#ci-state").value.trim(), zip: $("#ci-zip").value.trim(),
    };
    cur.mapCode = $("#ci-mapcode").value.trim();
    cur.notes = $("#ci-notes").value.trim();
    cur.source = $("#ci-source").value;
    cur.phones = cur.phones.filter((p) => p.n.trim());
    if (!cur.phones.length) cur.phones = [{ n: "" }];
  }

  // ---------- SERVICE ----------
  function renderService() {
    const wrap = $("#cs-plans");
    wrap.innerHTML = MDATA.PLANS.map((p) =>
      `<button class="plan-card${p.id === cur.plan.id ? " sel" : ""}" data-plan="${p.id}" type="button">
         <span class="pc-top"><b>${p.name}</b><span class="pc-price num">${fmtMoney(p.monthly)}<i>/mo min</i></span></span>
         <span class="pc-blurb">${p.blurb}</span>
         <span class="pc-visits">${p.visits} · ${fmtMoney(p.initial)} initial min</span>
       </button>`
    ).join("");
    $$("#cs-plans .plan-card").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        const p = MDATA.PLANS.find((x) => x.id === b.dataset.plan);
        cur.plan = { id: p.id, name: p.name, monthly: p.monthly, initial: p.initial };
        $("#cs-initial").value = p.initial;
        $("#cs-monthly").value = p.monthly;
        renderService();
      }));
    $("#cs-initial").value = cur.plan.initial;
    $("#cs-monthly").value = cur.plan.monthly;
    priceHint();
    const next = STORE.nextAppointment(cur);
    $("#cs-appt").value = next ? toLocalInput(next.ts) : "";
  }

  function planFloor() { return MDATA.PLANS.find((p) => p.id === cur.plan.id) || MDATA.PLANS[1]; }

  function priceHint() {
    const p = planFloor();
    $("#cs-price-hint").textContent =
      `${p.name} floors: ${fmtMoney(p.initial)} initial · ${fmtMoney(p.monthly)}/mo. Quote up, never below.`;
  }

  function collectService() {
    const p = planFloor();
    // floors are enforced, quietly and always
    const init = Math.min(Math.max(Number($("#cs-initial").value) || p.initial, p.initial), 100000);
    const mo = Math.min(Math.max(Number($("#cs-monthly").value) || p.monthly, p.monthly), 100000);
    cur.plan.initial = init;
    cur.plan.monthly = mo;
    $("#cs-initial").value = init;
    $("#cs-monthly").value = mo;
    // initial appointment
    const v = $("#cs-appt").value;
    if (v) {
      const ts = new Date(v).getTime();
      if (!isNaN(ts)) {
        let ap = (cur.appointments || []).find((a) => a.type === "initial");
        if (ap) { ap.ts = ts; if (ap.status !== "done") ap.status = "scheduled"; }
        else cur.appointments.push({ id: MDB.uid(), ts, type: "initial", status: "scheduled", doneAt: null });
      }
    }
  }

  const toLocalInput = (ts) => {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  // ---------- REFERRALS ----------
  function renderReferrals() {
    const list = $("#cr-list");
    list.innerHTML = (cur.referrals || []).map((r, i) =>
      `<div class="chip-row"><span><b>${esc(r.name)}</b>${r.phone ? " · " + esc(r.phone) : ""}${r.addr ? `<br><span class="dim">${esc(r.addr)}</span>` : ""}</span>
        <button type="button" class="mini-x" data-i="${i}" aria-label="Remove referral">✕</button></div>`
    ).join("") || `<div class="hood-empty">Ask at the table: “Which neighbors should we take care of?”</div>`;
    $$("#cr-list .mini-x").forEach((b) =>
      b.addEventListener("click", () => { cur.referrals.splice(+b.dataset.i, 1); renderReferrals(); }));
  }

  // ---------- PAYMENT ----------
  function renderPayment() {
    $$(".pay-m").forEach((b) => b.classList.toggle("sel", b.dataset.m === cur.payment.method));
    $("#cp-last4").value = cur.payment.last4 || "";
    $("#cp-autopay").classList.toggle("on", !!cur.payment.autopay);
    $("#cp-due").textContent = fmtMoney(cur.plan.initial);
    $("#cp-last4-wrap").hidden = cur.payment.method === "collect";
  }

  function collectPayment() {
    cur.payment.last4 = $("#cp-last4").value.replace(/\D/g, "").slice(-4);
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
    const { p, initial, monthly, discount, etf } = MCONTRACT.pricing(cur);
    $("#ca-summary").innerHTML =
      `<div class="rowline"><span>Customer</span><b>${esc(STORE.custName(cur))}</b></div>` +
      `<div class="rowline"><span>Plan</span><b>${p.name} · 12 months</b></div>` +
      `<div class="rowline"><span>Initial (after ${fmtMoney(discount)} discount)</span><b>${fmtMoney(initial)}</b></div>` +
      `<div class="rowline"><span>Recurring</span><b>${fmtMoney(monthly)}/mo</b></div>` +
      `<div class="rowline"><span>Early-exit fee if cancelled early</span><b>${fmtMoney(etf)} max</b></div>` +
      `<div class="rowline total"><span>First-year value</span><b>${fmtMoney(initial + monthly * 12)}</b></div>`;
    $("#ca-doc").innerHTML = MCONTRACT.bodyHTML(cur, null);
    $("#ca-consent1").checked = false;
    $("#ca-consent2").checked = false;
    sigDrawn = false;
    requestAnimationFrame(setupSig);
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
    if (!$("#ca-consent1").checked || !$("#ca-consent2").checked) {
      toast("Both acknowledgment boxes are required"); return;
    }
    if (!sigDrawn) { toast("Customer signature is required"); return; }

    const sig = sigCanvas.toDataURL("image/png");
    cur.agreement = {
      signedAt: new Date().toISOString(),
      signature: sig,
      termMonths: MDATA.AGREEMENT.termMonths,
      consent: {
        esign: true, coolingOffVerbal: true, coolingOffNoticeGiven: true,
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
        const isHtml = (f.type || "").includes("html");
        if (isHtml) {
          await MCONTRACT.share(await rec.blob.text(), f.name);
        } else if (navigator.canShare && window.File) {
          try {
            const file = new File([rec.blob], f.name, { type: f.type });
            if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
          } catch (err) { if (err && err.name === "AbortError") return; }
          openBlob(rec.blob);
        } else openBlob(rec.blob);
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

  function openBlob(blob) {
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
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
  function statusLine(c) {
    const serviced = STORE.lastServiced(c);
    if (serviced) return `<span class="st-serviced">Serviced: ${MUI.fmtDate(serviced)} ${MUI.fmtTime(serviced)}</span>`;
    const next = STORE.nextAppointment(c);
    if (next) return `<span class="st-scheduled">Scheduled: ${MUI.fmtDate(next.ts)} ${MUI.fmtTime(next.ts)}</span>`;
    return `<span class="st-none">Not Scheduled</span>`;
  }

  function matchesFilter(c) {
    if (listFilter === "all") return true;
    const serviced = !!STORE.lastServiced(c);
    const scheduled = !!STORE.nextAppointment(c);
    if (listFilter === "serviced") return serviced;
    if (listFilter === "scheduled") return !serviced && scheduled;
    if (listFilter === "notsched") return !serviced && !scheduled;
    return true;
  }

  function renderList() {
    const q = ($("#cust-q").value || "").trim().toLowerCase();
    const all = STORE.customers.slice().sort((a, b) => (b.soldAt || b.createdAt || 0) - (a.soldAt || a.createdAt || 0));
    const list = all.filter((c) =>
      matchesFilter(c) &&
      (!q || STORE.custName(c).toLowerCase().includes(q) ||
        STORE.custAddress(c).toLowerCase().includes(q)));

    const nFilters = listFilter === "all" ? 0 : 1;
    $("#cust-filter-n").textContent = nFilters ? ` (${nFilters})` : "";

    if (!all.length) {
      $("#cust-list").innerHTML =
        `<div class="empty"><div class="ic">🗺️</div>No customers yet.<br>Hit the Map, knock doors, and your book builds itself.</div>`;
      return;
    }
    $("#cust-list").innerHTML = list.map((c) => {
      const soldAt = c.soldAt || (STORE.custSignedAt(c) ? new Date(STORE.custSignedAt(c)).getTime() : c.createdAt);
      return `<button class="cust-row" data-cid="${c.id}" type="button">
         <div class="crn">${esc(STORE.custName(c))}</div>
         <div class="cra">${esc(STORE.custAddress(c)) || "No address"}</div>
         <div class="crs">Sold: ${MUI.fmtDate(soldAt)} by ${esc(c.soldBy || STORE.settings.repName)}</div>
         <div class="crst">${statusLine(c)}</div>
       </button>`;
    }).join("") || `<div class="empty">Nothing matches.</div>`;

    $$("#cust-list .cust-row").forEach((b) =>
      b.addEventListener("click", () => open(b.dataset.cid)));
  }

  // ---------- export (More menu) ----------
  async function exportAll() {
    if (!STORE.customers.length) { toast("Nothing to export yet"); return; }
    const payload = {
      exportedAt: new Date().toISOString(),
      rep: STORE.settings.repName,
      fieldroutes: {
        subdomain: STORE.settings.frSubdomain || null,
        note: "Map each record to customer/create + subscription/create + appointment/create.",
      },
      customers: STORE.customers,
    };
    const json = JSON.stringify(payload, null, 2);
    const name = "rally-customers-" + MUI.dayKey(Date.now()) + ".json";
    if (navigator.canShare && window.File) {
      try {
        const file = new File([json], name, { type: "application/json" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "RALLY customers" });
          toast("Customers shared");
          return;
        }
      } catch (err) { if (err && err.name === "AbortError") return; }
    }
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
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
    $("#cust-filter").addEventListener("click", () => openSheet("filter-sheet"));
    $$("#filter-sheet .f-opt").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        listFilter = b.dataset.f;
        $$("#filter-sheet .f-opt").forEach((x) => x.classList.toggle("sel", x === b));
        closeSheet();
        renderList();
      }));

    $("#ce-back").addEventListener("click", () => {
      // leaving without saving is fine for an existing record; warn on a draft
      if (!curId && (cur.first || cur.last || $("#ci-first").value.trim())) {
        if (!confirm("Leave without saving this customer?")) return;
      }
      closeEditor();
    });
    $("#ce-save").addEventListener("click", () => persist(true));
    $$(".ce-tab").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        // keep whatever was typed before switching panels
        collectInfo(); collectService(); collectPayment();
        showTab(b.dataset.t);
      }));

    $("#ci-add-phone").addEventListener("click", () => { cur.phones.push({ n: "" }); renderPhones(); });
    $("#ci-add-contact").addEventListener("click", () => {
      const name = $("#cc-name").value.trim();
      if (!name) { toast("Contact name first"); return; }
      cur.contacts.push({ name, phone: $("#cc-phone").value.trim() });
      $("#cc-name").value = ""; $("#cc-phone").value = "";
      renderContacts();
    });
    ["text", "email", "voice"].forEach((k) =>
      $("#ci-rem-" + k).addEventListener("click", () => {
        tick();
        cur.reminders[k] = !cur.reminders[k];
        $("#ci-rem-" + k).classList.toggle("on", cur.reminders[k]);
      }));

    ["cs-initial", "cs-monthly"].forEach((id) =>
      $("#" + id).addEventListener("blur", collectService));

    $("#cr-add").addEventListener("click", () => {
      const name = $("#cr-name").value.trim();
      if (!name) { toast("Referral name first"); return; }
      cur.referrals.push({
        name, phone: $("#cr-phone").value.trim(), addr: $("#cr-addr").value.trim(),
      });
      $("#cr-name").value = ""; $("#cr-phone").value = ""; $("#cr-addr").value = "";
      renderReferrals();
      toast("Referral added — gold");
    });

    $$(".pay-m").forEach((b) =>
      b.addEventListener("click", () => {
        tick();
        cur.payment.method = b.dataset.m;
        renderPayment();
      }));
    $("#cp-autopay").addEventListener("click", () => {
      tick();
      cur.payment.autopay = !cur.payment.autopay;
      $("#cp-autopay").classList.toggle("on", cur.payment.autopay);
    });

    $("#ca-sign-save").addEventListener("click", signAndSave);
    $("#ca-sig-clear").addEventListener("click", () => {
      if (sigCtx) { sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height); sigDrawn = false; }
    });
    $("#ca-print").addEventListener("click", () => {
      if (cur && cur.agreement) MCONTRACT.print(MCONTRACT.docHTML(cur, cur.agreement.signature));
    });
    $("#ca-share").addEventListener("click", () => {
      if (cur && cur.agreement)
        MCONTRACT.share(MCONTRACT.docHTML(cur, cur.agreement.signature), `Agreement — ${STORE.custName(cur)}.html`);
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

  window.MCUST = { bind, renderList, open, startNew, startForPin, fillAddress, exportAll };
})();
