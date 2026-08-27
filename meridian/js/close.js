/* Meridian — the close: customer → plan → signature, saved as a durable
   local agreement and queued for the FieldRoutes connector. */
(function () {
  const { $, $$, openSheet, closeSheet, toast, celebrate, fmtMoney } = MUI;

  let pin = null;
  let step = 1;
  let plan = null;
  let sig = { drawn: false };

  function start(fromPin) {
    pin = fromPin || null;
    step = 1;
    plan = { ...MDATA.PLANS[1] }; // Preferred is the default anchor
    sig.drawn = false;
    $("#cf-first").value = "";
    $("#cf-last").value = "";
    $("#cf-phone").value = "";
    $("#cf-email").value = "";
    $("#cf-address").value = (pin && pin.address) || "";
    $("#cf-notes").value = "";
    $("#cf-consent").checked = false;
    $("#cf-initial").value = plan.initial;
    $("#cf-monthly").value = plan.monthly;
    renderPlanButtons();
    showStep();
    openSheet("close-sheet");
  }

  function showStep() {
    $$("#close-steps .st").forEach((el, i) => el.classList.toggle("done", i < step));
    $("#close-step-1").hidden = step !== 1;
    $("#close-step-2").hidden = step !== 2;
    $("#close-step-3").hidden = step !== 3;
    $("#close-back").hidden = step === 1;
    $("#close-next").hidden = step === 3;
    $("#close-sign-save").hidden = step !== 3;
    $("#close-title").textContent =
      step === 1 ? "New customer" : step === 2 ? "Pick the plan" : "Sign on the glass";
    $("#close-sub").textContent =
      step === 1 ? "Who's joining the route" :
      step === 2 ? "Initial service + recurring — adjust to what you quoted" :
      "Customer signs below. A copy goes on file with the agreement.";
    if (step === 3) { renderSummary(); setupSig(); }
  }

  function renderPlanButtons() {
    const wrap = $("#cf-plans");
    wrap.innerHTML = MDATA.PLANS.map((p) =>
      `<button class="disp-btn${p.id === plan.id ? " sel" : ""}" data-plan="${p.id}" type="button">
         <span style="flex:1;min-width:0">
           <span style="display:block;font-weight:700">${p.name}</span>
           <span style="display:block;font-size:12px;color:var(--t3);font-weight:400">${p.blurb}</span>
         </span>
         <span class="num" style="text-align:right;font-size:13px;color:var(--t2)">
           ${fmtMoney(p.initial)} first<br>${fmtMoney(p.monthly)}/mo
         </span>
       </button>`
    ).join("");
    $$("#cf-plans .disp-btn").forEach((b) => {
      b.style.gridColumn = "1/-1";
      b.addEventListener("click", () => {
        const chosen = MDATA.PLANS.find((p) => p.id === b.dataset.plan);
        plan = { ...chosen };
        $("#cf-initial").value = plan.initial;
        $("#cf-monthly").value = plan.monthly;
        renderPlanButtons();
      });
    });
    if (!$("#cf-initial").value) $("#cf-initial").value = plan.initial;
    if (!$("#cf-monthly").value) $("#cf-monthly").value = plan.monthly;
  }

  // keep prices sane: no negatives, no fat-fingered 1e21
  const clampPrice = (v) => Math.min(Math.max(Number(v) || 0, 0), 100000);

  function collect() {
    return {
      first: $("#cf-first").value.trim(),
      last: $("#cf-last").value.trim(),
      phone: $("#cf-phone").value.trim(),
      email: $("#cf-email").value.trim(),
      address: $("#cf-address").value.trim(),
      notes: $("#cf-notes").value.trim(),
      planName: plan.name,
      initial: clampPrice($("#cf-initial").value),
      monthly: clampPrice($("#cf-monthly").value),
      termMonths: 12,
    };
  }

  function renderSummary() {
    const c = collect();
    $("#cf-summary").innerHTML =
      `<div class="rowline"><span>Customer</span><b>${esc(c.first)} ${esc(c.last)}</b></div>` +
      `<div class="rowline"><span>Address</span><b style="text-align:right">${esc(c.address) || "—"}</b></div>` +
      `<div class="rowline"><span>Plan</span><b>${c.planName} · 12 months</b></div>` +
      `<div class="rowline"><span>Initial service</span><b>${fmtMoney(c.initial)}</b></div>` +
      `<div class="rowline"><span>Recurring</span><b>${fmtMoney(c.monthly)}/mo</b></div>` +
      `<div class="rowline total"><span>First-year value</span><b>${fmtMoney(c.initial + c.monthly * 12)}</b></div>`;
  }

  // ---------- signature ----------
  let sigCtx = null, sigCanvas = null, drawing = false;
  function setupSig() {
    sigCanvas = $("#sigpad");
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const rect = sigCanvas.getBoundingClientRect();
    if (rect.width === 0) { requestAnimationFrame(setupSig); return; }
    const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
    // already sized for this box → keep whatever ink is on it
    if (sigCanvas.width === w && sigCanvas.height === h && sigCtx) return;
    // dimensions changed (rotation) — snapshot existing ink and redraw scaled
    const snapshot = sig.drawn ? sigCanvas.toDataURL("image/png") : null;
    sigCanvas.width = w;
    sigCanvas.height = h;
    sigCtx = sigCanvas.getContext("2d");
    sigCtx.scale(dpr, dpr);
    sigCtx.lineWidth = 2.2;
    sigCtx.lineCap = "round";
    sigCtx.lineJoin = "round";
    sigCtx.strokeStyle = "#101828";
    if (snapshot) {
      const img = new Image();
      img.onload = () => sigCtx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = snapshot;
    } else {
      sig.drawn = false;
    }
  }
  addEventListener("resize", () => {
    if (step === 3 && $("#close-sheet").classList.contains("open")) setupSig();
  });
  function sigPos(e) {
    const r = sigCanvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }
  function sigStart(e) {
    if (!sigCtx) return;
    e.preventDefault();
    drawing = true;
    const p = sigPos(e);
    sigCtx.beginPath();
    sigCtx.moveTo(p.x, p.y);
  }
  function sigMove(e) {
    if (!drawing || !sigCtx) return;
    e.preventDefault();
    const p = sigPos(e);
    sigCtx.lineTo(p.x, p.y);
    sigCtx.stroke();
    sig.drawn = true;
  }
  function sigEnd() { drawing = false; }

  // ---------- save ----------
  async function save() {
    const c = collect();
    if (!c.first || !c.last) { step = 1; showStep(); toast("Customer name is required"); return; }
    if (!$("#cf-consent").checked) { toast("The e-sign consent box is required"); return; }
    if (!sig.drawn) { toast("Customer signature is required"); return; }

    const cust = {
      ...c,
      pinId: pin ? pin.id : null,
      lat: pin ? pin.lat : null,
      lng: pin ? pin.lng : null,
      signature: sigCanvas.toDataURL("image/png"),
      signedAt: new Date().toISOString(),
      consent: {
        esign: true,
        coolingOffNoticeShown: true,
        text: $("#cf-consent-text").textContent.trim(),
      },
    };
    try {
      await STORE.addCustomer(cust);
      // the pin flips to sold if it wasn't already
      if (pin && pin.disposition !== "sold") {
        await STORE.addKnock({ pinId: pin.id, disposition: "sold", dm: true });
      }
    } catch (err) {
      toast("Couldn't save the agreement — storage may be full. Try again.");
      return; // keep the sheet open; the signature is still on the glass
    }
    closeSheet();
    if (window.MMAP) { MMAP.refreshPins(); MMAP.clearSelection(); }
    if (window.MSTAT) MSTAT.render();
    if (window.MAPP) MAPP.renderCustomers();
    celebrate(STORE.settings.commissionPerSale, c.first + " " + c.last);
  }

  // ---------- queue sheet ----------
  function openQueue() {
    const list = $("#queue-list");
    if (!STORE.customers.length) {
      list.innerHTML = `<div class="empty"><div class="ic">📋</div>No agreements yet.<br>Close one on the door and it lands here.</div>`;
    } else {
      list.innerHTML = STORE.customers.slice().reverse().map((c) =>
        `<div class="q-item">
           <div class="nm">${esc(c.first)} ${esc(c.last)}</div>
           <div class="meta">${esc(c.address) || "No address"} · ${c.planName} · ${fmtMoney(c.initial)} + ${fmtMoney(c.monthly)}/mo</div>
           <div class="meta">Signed ${new Date(c.signedAt).toLocaleString()}</div>
           <span class="q-status ${c.status === "queued" ? "queued" : "sold"}">${c.status === "queued" ? "Queued for FieldRoutes" : "Synced"}</span>
         </div>`
      ).join("");
    }
    openSheet("queue-sheet");
  }

  async function exportQueue() {
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
    const name = "meridian-agreements-" + MUI.dayKey(Date.now()) + ".json";
    // iOS home-screen apps silently ignore <a download>; the share sheet works
    if (navigator.canShare && window.File) {
      try {
        const file = new File([json], name, { type: "application/json" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Meridian agreements" });
          toast("Agreements shared");
          return;
        }
      } catch (err) {
        if (err && err.name === "AbortError") return; // user closed the share sheet
      }
    }
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("Agreements exported");
  }

  // Called when a late reverse-geocode resolves while the close sheet is open
  function fillAddress(geoPin) {
    if (!pin || !geoPin || pin.id !== geoPin.id) return;
    const f = $("#cf-address");
    if (f && !f.value.trim() && geoPin.address) {
      f.value = geoPin.address;
      if (step === 3) renderSummary();
    }
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function bind() {
    $("#close-next").addEventListener("click", () => {
      if (step === 1) {
        const c = collect();
        if (!c.first || !c.last) { toast("First and last name to move forward"); return; }
      }
      step = Math.min(3, step + 1);
      showStep();
    });
    $("#close-back").addEventListener("click", () => { step = Math.max(1, step - 1); showStep(); });
    $("#close-sign-save").addEventListener("click", save);
    $("#sig-clear").addEventListener("click", () => {
      if (sigCtx) { sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height); sig.drawn = false; }
    });
    const sp = $("#sigpad");
    sp.addEventListener("mousedown", sigStart);
    sp.addEventListener("mousemove", sigMove);
    addEventListener("mouseup", sigEnd);
    sp.addEventListener("touchstart", sigStart, { passive: false });
    sp.addEventListener("touchmove", sigMove, { passive: false });
    sp.addEventListener("touchend", sigEnd);
    $("#queue-export").addEventListener("click", exportQueue);
    $("#cust-export").addEventListener("click", exportQueue);
  }

  window.MCLOSE = { start, openQueue, bind, fillAddress };
})();
