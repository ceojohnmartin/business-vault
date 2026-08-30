/* RALLY — the vault: everything in, everything out.
   Integrations here are the kind that work with no backend: hand the data
   to the tools people already run. CSV for any CRM or spreadsheet, .ics
   for any calendar, tel:/sms:/mailto: for the phone itself, and a full
   device backup (every store, files included) that restores by id — so a
   cracked phone or a new device never costs a season of knocks. */
(function () {
  const { toast, dayKey } = MUI;

  // ---------- csv (spreadsheet / CRM import) ----------
  const cell = (v) => {
    v = v == null ? "" : String(v);
    return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  };

  async function exportCSV() {
    if (!STORE.customers.length) { toast("Nothing to export yet"); return; }
    const head = ["First", "Last", "Phones", "Email", "Street", "City", "State", "Zip",
      "Stage", "Plan", "Initial", "Monthly", "Signed", "Sold by", "Source", "Next service", "Notes"];
    const rows = STORE.customers.map((c) => {
      const a = typeof c.address === "object" && c.address ? c.address : { street: STORE.custAddress(c) };
      const stage = STORE.custStage(c);
      const signed = STORE.custSignedAt(c);
      const next = STORE.nextAppointment(c);
      return [
        c.first, c.last,
        (c.phones || []).map((p) => p.n).filter(Boolean).join("; ") || c.phone || "",
        c.email,
        a.street, a.city, a.state, a.zip,
        stage.label,
        STORE.custPlanName(c),
        c.plan ? c.plan.initial : c.initial,
        c.plan ? c.plan.monthly : c.monthly,
        signed ? new Date(signed).toLocaleDateString() : "",
        c.soldBy, c.source,
        next ? new Date(next.ts).toLocaleString() : "",
        [c.notesForever || c.notes, c.notesInitial].filter(Boolean).join(" | "),
      ].map(cell).join(",");
    });
    const csv = head.join(",") + "\r\n" + rows.join("\r\n");
    await MUI.shareOrDownload(csv, "rally-customers-" + dayKey(Date.now()) + ".csv",
      "text/csv", "RALLY customers (CSV)");
    toast("CSV exported — opens in any spreadsheet or CRM");
  }

  // ---------- calendar (.ics — any calendar app) ----------
  const icsEsc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/[;,]/g, "\\$&").replace(/\r?\n/g, "\\n");
  const icsTime = (ts) => {
    const d = new Date(ts), p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
  };

  async function exportICS(cust, ap) {
    const name = STORE.custName(cust);
    const phone = STORE.custPhone(cust);
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//RALLY//Field Sales//EN",
      "BEGIN:VEVENT",
      "UID:" + ap.id + "@rally",
      "DTSTAMP:" + icsTime(Date.now()) + "Z",
      // floating local time on purpose: a 9am service is 9am wherever the
      // phone that booked it lives — no timezone math at the door
      "DTSTART:" + icsTime(ap.ts),
      "DTEND:" + icsTime(ap.ts + 3600e3),
      "SUMMARY:" + icsEsc(`${ap.type === "initial" ? "Initial service" : "Service"} — ${name}`),
      "LOCATION:" + icsEsc(STORE.custAddress(cust)),
      "DESCRIPTION:" + icsEsc(
        `${STORE.custPlanName(cust)} plan${phone ? " · " + phone : ""}${(cust.notesInitial || cust.notesForever || cust.notes) ? "\n" + (cust.notesInitial || cust.notesForever || cust.notes) : ""}`),
      "END:VEVENT", "END:VCALENDAR",
    ];
    await MUI.shareOrDownload(lines.join("\r\n"), `service-${name.replace(/\W+/g, "-")}.ics`,
      "text/calendar", "Add to calendar");
  }

  // ---------- full backup ----------
  const STORES = ["users", "territories", "pins", "events", "customers"];
  // The device lock is a property of THIS device, not of the data. Letting
  // it ride along would make a backup file a skeleton key (restore it and
  // walk in with its session), and would hand a forgotten passcode straight
  // back to the rep who just erased the device to escape it.
  const PRIVATE_KV = ["account", "session", "cloudSession", "cloudProfile"];
  const FILE_CAP = 4 * 1024 * 1024; // one runaway photo must not sink the backup

  const blobToB64 = (blob) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

  const b64ToBlob = (b64, type) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: type || "application/octet-stream" });
  };

  async function backup() {
    const data = {};
    for (const s of STORES) data[s] = await MDB.getAll(s);
    data.kv = (await MDB.getAll("kv")).filter((r) => r && !PRIVATE_KV.includes(r.k));
    const files = await MDB.getAll("files");
    let skipped = 0;
    data.files = [];
    for (const f of files) {
      if (!f.blob || f.blob.size > FILE_CAP) { skipped++; continue; }
      try {
        data.files.push({ id: f.id, name: f.name, type: f.type, addedAt: f.addedAt, b64: await blobToB64(f.blob) });
      } catch (_) { skipped++; }
    }
    const payload = {
      rally: 1, exportedAt: new Date().toISOString(),
      device: STORE.settings.repName || "", data,
    };
    await MUI.shareOrDownload(JSON.stringify(payload),
      "rally-backup-" + dayKey(Date.now()) + ".json", "application/json", "RALLY backup");
    toast(skipped
      ? `Backed up — ${skipped} oversized file${skipped === 1 ? "" : "s"} left out`
      : "Backed up — keep that file somewhere safe");
  }

  async function restoreFile(file) {
    let p;
    try { p = JSON.parse(await file.text()); } catch (_) { p = null; }
    if (!p || p.rally !== 1 || !p.data) { toast("That's not a RALLY backup file"); return; }
    const d = p.data;
    const when = p.exportedAt ? new Date(p.exportedAt).toLocaleString() : "unknown date";
    const what = `${(d.customers || []).length} customers · ${(d.pins || []).length} pins · ${(d.territories || []).length} hoods`;
    if (!confirm(`Restore the backup from ${when}?\n${what}\n\nRecords merge in by id — matching ones are replaced by the backup's version, nothing else is touched.`)) return;
    try {
      for (const s of STORES) for (const r of d[s] || []) await MDB.put(s, r);
      // filtered on the way in too, so older backup files that still
      // carry a credential can never re-key or unlock this device
      for (const r of d.kv || []) {
        if (r && r.k && !PRIVATE_KV.includes(r.k)) await MDB.put("kv", r);
      }
      for (const f of d.files || []) {
        if (!f || !f.id || typeof f.b64 !== "string") continue;
        await MDB.put("files", { id: f.id, name: f.name, type: f.type, addedAt: f.addedAt, blob: b64ToBlob(f.b64, f.type) });
      }
    } catch (_) {
      toast("Restore hit a storage error — the device may be full");
      return;
    }
    toast("Restored — reloading");
    setTimeout(() => location.reload(), 900);
  }

  // ---------- storage guard ----------
  // Persistent storage keeps the browser from quietly evicting IndexedDB
  // under disk pressure — a season of knocks lives there.
  async function guard() {
    try {
      if (navigator.storage && navigator.storage.persist &&
          !(await navigator.storage.persisted())) {
        await navigator.storage.persist();
      }
    } catch (_) { /* not supported — nothing to guard */ }
  }

  async function storageInfo() {
    const out = { persisted: null, usage: null, quota: null };
    try { if (navigator.storage && navigator.storage.persisted) out.persisted = await navigator.storage.persisted(); } catch (_) {}
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const e = await navigator.storage.estimate();
        out.usage = e.usage; out.quota = e.quota;
      }
    } catch (_) {}
    return out;
  }

  window.MVAULT = { exportCSV, exportICS, backup, restoreFile, guard, storageInfo };
})();
