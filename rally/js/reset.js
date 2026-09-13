/* RALLY — RESET FOR RE-KNOCK, WITH THE ANSWER SHOWN FIRST.

   A manager starting a fresh pass on a territory is about to change what
   every rep sees on every door in it. The old flow was a confirm() box
   with a sentence. This is a sheet that shows, door by door category,
   exactly what the reset will and will not do BEFORE anything is sent:

     82  Not Home / Not Interested   →  Unworked        (reset)
     14  Go Back                     →  DECISION PENDING
      3  Sold                        →  protected
      2  Do Not Knock                →  protected

   THREE THINGS ARE NOT NEGOTIABLE HERE, and the screen says so:

     - A DO-NOT-KNOCK IS NEVER BULK-CLEARED. The server refuses 'dnk' in a
       reset list outright (0018 §G); clearing one is a per-door act with a
       typed reason and an indelible event, done from the door itself.
     - A SOLD DOOR STAYS GREEN. Green comes from the customer record, not
       from the last knock; a reset cannot touch it and does not try.
     - HISTORY STAYS. A reset moves one timestamp — the cycle boundary.
       Every knock, note and callback is kept; no pin is written.

   THE GO BACK RULE IS PARKED. Whether a purple door is reset to blue or
   kept purple on a fresh pass is a product decision the owner has not
   made, and this screen does not make it by default. So:

     - the Go Back row reads DECISION PENDING, never a colour change;
     - Confirm calls STORE.resetForReknock ONLY when the territory has no
       Go Back doors at all, because only then does the reset list sent
       ('nothome','notint') encode nothing about purple. A territory WITH
       Go Back doors cannot be confirmed from here until the rule exists.

   Counts are EFFECTIVE outcomes — what the map is showing right now —
   read through the same cycle boundary the pins are painted from, so the
   preview and the map can never disagree. */
(function () {
  const { $, openSheet, closeSheet, toast, tick, esc } = MUI;

  let hood = null;
  let counts = null;

  /* Sold and do-not-knock are answered from the customer record and the
     ledger, exactly as the map answers them, so a door the manager cleared
     last week does not show up here as "protected" — and one they sold
     yesterday does. */
  function tally(t) {
    const facts = STORE.doorFacts();
    const by = { unworked: 0, nothome: 0, notint: 0, goback: 0, sold: 0, soldKnock: 0, dnk: 0 };
    STORE.pins.forEach((p) => {
      const h = STORE.hoodOf(p);
      if (!h || h.id !== t.id) return;
      const eff = STORE.effectiveDisposition(p, h, facts);
      /* "Sold" is protected by the CUSTOMER RECORD. A door that is green
         only because its last knock said sold — no customer, or a customer
         who has since cancelled — has nothing protecting it: the reset
         returns it to unworked like any other knock, and the sheet must
         say so rather than show a padlock it cannot honour. */
      if (eff === "sold") { if (STORE.activeCustomerOf(p, facts)) by.sold++; else by.soldKnock++; return; }
      if (by[eff] != null) by[eff]++;
    });
    return by;
  }

  const RESET_LIST = ["nothome", "notint"];   // the outcomes a fresh pass returns to blue
  const resetCount = (c) => c.nothome + c.notint + c.soldKnock;

  function row(n, what, arrow, verdict, cls) {
    return `<div class="rs-row ${cls}">
      <b class="rs-n num">${n}</b>
      <span class="rs-what">${what}</span>
      <span class="rs-arrow">${arrow}</span>
      <span class="rs-to">${verdict}</span>
    </div>`;
  }

  function render() {
    const c = counts;
    const resetN = resetCount(c);
    $("#rs-title").textContent = STORE.hoodLabel(hood);
    // "one date" is the whole of what a reset writes to a door: none of them
    $("#rs-sub").textContent =
      `${c.unworked + resetN + c.goback + c.sold + c.dnk} doors · a fresh pass moves one date and deletes nothing`;
    $("#rs-rows").innerHTML =
      row(c.nothome + c.notint, "Not Home / Not Interested", "→", "Unworked", "reset") +
      (c.soldKnock ? row(c.soldKnock, "Sold at the door, no customer record", "→", "Unworked", "reset") : "") +
      row(c.goback, "Go Back", "→", "DECISION PENDING", "pending") +
      row(c.sold, "Sold (customer record)", "", `<i class="lock"></i>protected`, "protected sold") +
      row(c.dnk, "Do Not Knock", "", `<i class="lock"></i>protected`, "protected dnk") +
      row(c.unworked, "Unworked", "", "unchanged", "same");

    const btn = $("#rs-confirm");
    const note = $("#rs-note");
    if (c.goback > 0) {
      /* Sending ANY reset list for this hood would decide the purple rule
         by implication — the server stores the complement, so a list that
         omits 'goback' keeps it and one that includes it clears it. Neither
         is this screen's call to make. */
      btn.disabled = true;
      btn.textContent = "Confirm — waiting on the Go Back decision";
      note.textContent = `${c.goback} Go Back door${c.goback === 1 ? "" : "s"} here. ` +
        "What a fresh pass does with a Go Back is a product decision that has not been made yet, " +
        "so this territory cannot be reset from here until it is.";
    } else if (resetN === 0) {
      btn.disabled = true;
      btn.textContent = "Nothing to reset";
      note.textContent = "No Not Home or Not Interested doors in this territory.";
    } else {
      btn.disabled = false;
      btn.textContent = `Start a fresh pass — reset ${resetN} door${resetN === 1 ? "" : "s"}`;
      note.textContent = "Sold stays green and Do Not Knock stays black. Every knock, note and callback is kept.";
    }
  }

  function open(t) {
    hood = t;
    counts = tally(t);
    render();
    openSheet("reset-sheet");
  }

  const stillOpen = (t) => hood === t && $("#reset-sheet").classList.contains("open");

  /* The parked rule is checked against the doors AS THEY ARE NOW, not as
     they were when the sheet opened: a Go Back a rep books while the
     manager reads the sheet, or one that lands from a pull during the
     gate's round trip, parks the reset just the same. */
  function parkedNow(t) {
    counts = tally(t);
    if (counts.goback > 0) { render(); return true; }
    return false;
  }

  async function confirm() {
    const t = hood;
    if (!t || !counts) return;
    tick();
    const btn = $("#rs-confirm");
    if (btn.disabled) return;
    btn.disabled = true;               // before anything is awaited: one tap, one reset
    if (parkedNow(t)) return;
    /* The gate says who owns the answer: a solo device records the
       boundary itself; a team device asks the server and refuses offline
       rather than painting a hood blue that the next pull would repaint. */
    if (window.MTURF && !(await MTURF.gate("starting a fresh pass"))) { if (stillOpen(t)) render(); return; }
    // Cancel during the gate's round trip means cancel
    if (!stillOpen(t)) return;
    if (parkedNow(t)) return;
    const resetN = resetCount(counts);
    try {
      /* NEVER 'dnk' (the server would refuse it), NEVER 'sold' (nothing to
         reset — green is the customer record), NEVER 'goback' (parked). */
      await STORE.resetForReknock(t, RESET_LIST.slice(), false);
    } catch (err) {
      if (stillOpen(t)) btn.disabled = false;
      const missing = /PGRST202/.test(String(err && err.code)) ||
        /could not find the function|does not exist/i.test(String((err && err.message) || err));
      /* A team server WITHOUT 0018 has only start_territory_cycle, which
         moves the boundary for EVERY outcome — including Go Backs this
         phone has not pulled yet. Falling back to it would decide the
         parked rule by implication, so the sheet refuses instead and says
         what it needs, exactly as the door import does. */
      const msg = missing
        ? "The server-confirmed reset needs migration 0018 — nothing was changed"
        : ((err && err.message) || "Couldn't start the pass — try again");
      if (stillOpen(t)) $("#rs-note").textContent = msg;
      toast(msg, 7000);
      return;
    }
    if (stillOpen(t)) closeSheet();
    if (window.MMAP && MMAP.isReady && MMAP.isReady()) MMAP.refreshPins();
    if (window.MTURF) MTURF.render();
    toast(`${STORE.hoodLabel(t)} — fresh pass started · ${resetN} doors back to unworked`);
    if (hood === t) { hood = null; counts = null; }
  }

  function bind() {
    const b = $("#rs-confirm");
    if (b) b.addEventListener("click", confirm);
    const x = $("#rs-cancel");
    if (x) x.addEventListener("click", () => { tick(); closeSheet(); });
  }

  window.MRESET = {
    open, bind,
    // read by tests: the exact list Confirm would send, and why it might not
    preview: (t) => {
      const c = tally(t);
      return { counts: c, reset: RESET_LIST.slice(), parked: c.goback > 0, includeDnk: false, willReset: resetCount(c) };
    },
  };
})();
