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

  function collect() {
    return {
      first: $("#cf-first").value.trim(),
      last: $("#cf-last").value.trim(),
      phone: $("#cf-phone").value.trim(),
      email: $("#cf-email").value.trim(),
      address: $("#cf-address").value.trim(),
      notes: $("#cf-notes").value.trim(),
      planName: plan.name,
      initial: Number($("#cf-initial").value) || 0,
      monthly: Number($("#cf-monthly").value) || 0,
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
    sigCanvas.width = rect.width * dpr;
    sigCanvas.height = rect.height * dpr;
    sigCtx = sigCanvas.getContext("2d");
    sigCtx.scale(dpr, dpr);
    sigCtx.lineWidth = 2.2;
    sigCtx.lineCap = "round";
    sigCtx.lineJoin = "round";
    sigCtx.strokeStyle = "#101828";
    sig.drawn = false;
  }
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
    await STORE.addCustomer(cust);

    // the pin flips to sold if it wasn't already
    if (pin && pin.disposition !== "sold") {
      await STORE.addKnock({ pinId: pin.id, disposition: "sold", dm: true });
    }
    closeSheet();
    if (window.MMAP) { MMAP.refreshPins(); MMAP.clearSelection(); }
    if (window.MSTAT) MSTAT.render();
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

  function exportQueue() {
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
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "meridian-agreements-" + MUI.dayKey(Date.now()) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("Agreements exported");
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
  }

  window.MCLOSE = { start, openQueue, bind };
})();
