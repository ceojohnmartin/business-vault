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
     - HISTORY STAYS. A reset moves one timestamp — the cycle boundary —
       and writes one event. Every knock, note and callback is kept.

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
    const by = { unworked: 0, nothome: 0, notint: 0, goback: 0, sold: 0, dnk: 0 };
    STORE.pins.forEach((p) => {
      const h = STORE.hoodOf(p);
      if (!h || h.id !== t.id) return;
      const eff = STORE.effectiveDisposition(p, h, facts);
      if (by[eff] != null) by[eff]++;
    });
    return by;
  }

  const RESET_LIST = ["nothome", "notint"];   // the outcomes a fresh pass returns to blue

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
    const resetN = c.nothome + c.notint;
    $("#rs-title").textContent = STORE.hoodLabel(hood);
    $("#rs-sub").textContent =
      `${c.unworked + resetN + c.goback + c.sold + c.dnk} doors · a fresh pass moves one date, writes one event, deletes nothing`;
    $("#rs-rows").innerHTML =
      row(resetN, "Not Home / Not Interested", "→", "Unworked", "reset") +
      row(c.goback, "Go Back", "→", "DECISION PENDING", "pending") +
      row(c.sold, "Sold", "", `<i class="lock"></i>protected`, "protected sold") +
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

  async function confirm() {
    if (!hood || !counts || counts.goback > 0) return;
    tick();
    /* The gate says who owns the answer: a solo device records the
       boundary itself; a team device asks the server and refuses offline
       rather than painting a hood blue that the next pull would repaint. */
    if (window.MTURF && !(await MTURF.gate("starting a fresh pass"))) return;
    const btn = $("#rs-confirm");
    btn.disabled = true;
    try {
      // NEVER 'dnk' (the server would refuse it), NEVER 'sold' (nothing to
      // reset — green is the customer record), NEVER 'goback' (parked).
      await STORE.resetForReknock(hood, RESET_LIST.slice(), false);
    } catch (err) {
      btn.disabled = false;
      toast((err && err.message) || "Couldn't start the pass — try again", 6000);
      return;
    }
    closeSheet();
    if (window.MMAP && MMAP.isReady && MMAP.isReady()) MMAP.refreshPins();
    if (window.MTURF) MTURF.render();
    toast(`${STORE.hoodLabel(hood)} — fresh pass started · ${counts.nothome + counts.notint} doors back to unworked`);
    hood = null; counts = null;
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
      return { counts: c, reset: RESET_LIST.slice(), parked: c.goback > 0, includeDnk: false };
    },
  };
})();
