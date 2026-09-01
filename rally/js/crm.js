/* RALLY — customer history behind a provider interface.
   findByPin / findByAddress answer one question for the property card:
   "have we ever done business at this door?" Today the answer comes
   from the local customer book (the only CRM this device has); the
   interface is the seam where FieldRoutes or any other pest CRM plugs
   in later without touching the UI. Never returns payment details —
   the card gets name, plan, dates, and stage. */
(function () {

  // ---------- local provider: this device's customer book ----------
  function localFindByPin(pin) {
    if (!pin) return null;
    let c = STORE.customers.find((x) => x.pinId === pin.id) || null;
    if (!c && pin.address) c = localFindByAddress(pin.address);
    return c;
  }

  function localFindByAddress(addr) {
    const key = MPROP.normAddr(addr);
    if (!key || key.length < 6) return null;
    return STORE.customers.find((c) => {
      const ca = MPROP.normAddr(STORE.custAddress(c));
      return ca && (ca === key || ca.startsWith(key) || key.startsWith(ca));
    }) || null;
  }

  // Sanitized history for the property card: identity, plan, milestone
  // dates and derived stage only. No payment method, no card digits.
  function historyFor(cust) {
    if (!cust) return null;
    const stage = STORE.custStage(cust);
    const signed = STORE.custSignedAt(cust);
    const serviced = STORE.lastServiced(cust);
    const next = STORE.nextAppointment(cust);
    return {
      id: cust.id,
      name: STORE.custName(cust),
      plan: STORE.custPlanName(cust),
      stage: stage.label,
      stageChip: stage.chip,
      signedAt: signed ? new Date(signed).getTime() : null,
      soldBy: STORE.custSoldByLabel(cust) || null,
      lastServiced: serviced || null,
      nextService: next ? next.ts : null,
    };
  }

  const PROVIDERS = {
    local: {
      name: "This device",
      findByPin: (pin) => historyFor(localFindByPin(pin)),
      findByAddress: (a) => historyFor(localFindByAddress(a)),
    },
    // fieldroutes: plugs in here — findByAddress via the office API,
    // gated on STORE.settings.frSubdomain/frKey/frToken.
  };

  const active = () => PROVIDERS.local;

  window.MCRM = {
    findByPin: (pin) => active().findByPin(pin),
    findByAddress: (a) => active().findByAddress(a),
  };
})();
