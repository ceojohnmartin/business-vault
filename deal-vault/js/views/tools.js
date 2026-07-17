/* ============================================================
   Deal Vault — views/tools.js
   Reports index, Assumptions, Settings.
   ============================================================ */
window.DV = window.DV || {};
DV.views = DV.views || {};

(() => {
  const U = DV.util, A = () => DV.app, C = () => DV.calc;

  /* ================= REPORTS ================= */
  DV.views.reports = { render(main) {
    const deals = DV.store.deals().map(d => { let sc = null; try { sc = DV.score.analyze(d); } catch (e) {} return { d, sc }; })
      .filter(x => x.sc);
    main.innerHTML = `
      <div class="page-head"><div><h1>Reports</h1><div class="sub">Board-quality acquisition reports: executive summary, normalized earnings, valuation, financing, scenarios, risk register, due diligence and the final verdict. Print to PDF, or export financials to CSV.</div></div></div>
      ${deals.length ? `<div class="card">${deals.map(({ d, sc }) => `
        <div class="list-row" onclick="DV.app.navigate('report/${d.id}')">
          <div class="list-main"><b>${U.esc(d.basics.name || 'Untitled')} ${d.isDemo ? '<span class="demo-tag">DEMO</span>' : ''}</b>
            <span>${sc.res.ok ? `Score ${sc.finalScore} · ${sc.verdict.label} · confidence ${sc.confidence.level}` : 'Underwriting incomplete — report will be partial'}</span></div>
          <button class="btn sm gold">Open report</button></div>`).join('')}</div>`
      : `<div class="empty"><div class="display">No deals to report on</div>Analyze a deal first — the report writes itself from your underwriting.</div>`}`;
  }};

  /* ================= ASSUMPTIONS ================= */
  DV.views.assumptions = { render(main) {
    const a = DV.store.assumptions();
    const W = [['financial', 'Financial performance'], ['valuation', 'Price & valuation'], ['returns', 'Buyer returns'], ['financing', 'Debt & financing safety'], ['operations', 'Operational quality'], ['growth', 'Growth potential'], ['location', 'Location & market'], ['revenueQuality', 'Customer & revenue quality'], ['seller', 'Seller & transition'], ['legal', 'Legal, lease & regulatory']];
    const field = (key, label, hint = '') => `<div class="field"><label>${label}</label>
      <input data-a="${key}" inputmode="decimal" value="${U.esc(A().getPath(a, key) ?? '')}">${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
    main.innerHTML = `
      <div class="page-head"><div><h1>Assumptions</h1><div class="sub">The knobs behind every calculation. Set them once to match your market; every deal recomputes instantly. Changes apply to <b>all</b> deals.</div></div>
        <div class="head-actions"><button class="btn danger" id="a-reset">Reset to defaults</button></div></div>
      <div class="card"><h3>Financing defaults</h3><div class="form-grid">
        ${field('sbaRate', 'SBA rate %')}${field('sbaTermYears', 'SBA term (yrs)')}
        ${field('bankRate', 'Bank rate %')}${field('bankTermYears', 'Bank term (yrs)')}
        ${field('sellerRate', 'Seller-note rate %')}${field('sellerTermYears', 'Seller-note term (yrs)')}</div></div>
      <div class="card"><h3>Underwriting standards</h3><div class="form-grid">
        ${field('safeDSCR', 'Safe DSCR', 'Lenders want ≥ 1.25×')}${field('minDSCR', 'Minimum DSCR floor')}
        ${field('targetCoC', 'Target cash-on-cash %')}${field('targetPayback', 'Target payback (yrs)')}
        ${field('holdYears', 'Hold period (yrs)', 'Used for IRR, NPV and exit modeling')}
        ${field('discountRate', 'Discount rate % (NPV)', 'Small businesses are risky — 15%+ is honest')}
        ${field('taxRate', 'Tax rate % (ROIC)')}
        ${field('exitCostPct', 'Exit costs % (broker etc.)')}</div></div>
      <div class="card"><h3>Owner economics</h3><div class="form-grid">
        ${field('managerSalary', 'Market-rate manager salary $', 'The honesty check: earnings only count as “return” after paying this')}
        ${field('buyerSalary', 'Your living draw $ (owner-operator view)')}
        ${field('workingCapitalPct', 'Working capital % of revenue')}
        ${field('maintCapexPctDefault', 'Default maintenance capex % of revenue', 'Used when no capex history and no industry figure')}</div></div>
      <div class="card"><h3>Deal Score weights <span id="w-total" class="badge neutral"></span></h3>
        <div class="card-sub">How much each category matters to you. Must total 100.</div>
        <div class="form-grid">${W.map(([k, l]) => `<div class="field"><label>${l}</label><input data-w="${k}" inputmode="numeric" value="${a.weights[k]}"></div>`).join('')}</div></div>
      <div class="card"><h3>Default scenarios</h3><div class="card-sub">Starting assumptions for downside / base / upside (each deal can override in its Scenarios step).</div>
        <div class="table-wrap"><table class="data"><thead><tr><th></th><th>Downside</th><th>Base</th><th>Upside</th></tr></thead><tbody>
        ${[['revGrowth', 'Revenue growth %/yr'], ['marginDelta', 'Margin shift (pts)'], ['payrollDelta', 'Payroll inflation %/yr'], ['rentDelta', 'Rent inflation %/yr'], ['exitMultDelta', 'Exit multiple shift ×']].map(([k, l]) =>
          `<tr><td>${l}</td>${['down', 'base', 'up'].map(s => `<td><input data-a="scenarioDefaults.${s}.${k}" inputmode="decimal" value="${a.scenarioDefaults[s][k]}" style="width:76px;text-align:right;border:1px solid var(--line);border-radius:6px;padding:5px"></td>`).join('')}</tr>`).join('')}
        </tbody></table></div></div>`;
    const wTotal = () => {
      let t = 0; main.querySelectorAll('[data-w]').forEach(i => t += C().n0(i.value));
      const el = main.querySelector('#w-total');
      el.textContent = t + ' / 100';
      el.className = 'badge ' + (t === 100 ? 'v-good' : 'v-avoid');
    };
    main.querySelectorAll('[data-a]').forEach(inp => inp.addEventListener('input', () => {
      const v = C().N(inp.value);
      if (v !== null) { A().setPath(a, inp.dataset.a, v); DV.store.setAssumptions(a); }
    }));
    main.querySelectorAll('[data-w]').forEach(inp => inp.addEventListener('input', () => {
      const v = C().N(inp.value);
      if (v !== null) { a.weights[inp.dataset.w] = v; DV.store.setAssumptions(a); }
      wTotal();
    }));
    main.querySelector('#a-reset').onclick = () => A().confirmBox('Reset all assumptions?', 'Every rate, standard, weight and default scenario returns to Deal Vault\'s starting values.', 'Reset', () => {
      DV.store.setAssumptions(JSON.parse(JSON.stringify(DV.DEFAULT_ASSUMPTIONS)));
      DV.views.assumptions.render(main);
    }, true);
    wTotal();
  }};

  /* ================= SETTINGS ================= */
  DV.views.settings = { render(main) {
    const s = DV.store.settings();
    const demoCount = DV.store.deals(true).filter(d => d.isDemo).length;
    main.innerHTML = `
      <div class="page-head"><div><h1>Settings</h1><div class="sub">Data, privacy, appearance.</div></div></div>
      <div class="card"><h3>Your data lives on this device</h3>
        <p style="font-size:13.5px;color:var(--ink-2);margin-bottom:12px">Everything — deals, financials, notes — is stored locally in this browser and never sent anywhere. That's maximum privacy, with one duty: <b>export a backup</b> before clearing the browser or switching devices. The backup is a plain JSON file you can re-import here.</p>
        <div style="display:flex;gap:9px;flex-wrap:wrap">
          <button class="btn primary" id="exp">Export backup (JSON)</button>
          <button class="btn" id="imp">Import backup…</button>
          <input type="file" id="imp-file" accept=".json,application/json" style="display:none"></div></div>
      <div class="card"><h3>Appearance</h3>
        <div style="display:flex;gap:8px">${[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) =>
          `<button class="btn ${s.theme === v ? 'primary' : ''}" data-theme-btn="${v}">${l}</button>`).join('')}</div></div>
      <div class="card"><h3>PIN lock</h3>
        <p style="font-size:13.5px;color:var(--ink-2);margin-bottom:12px">Adds a PIN screen when the app opens — a privacy curtain against shoulder-surfers and shared computers. It is <b>not encryption</b>: someone with full access to this device's files could still read the data. For real secrecy, use a device-level encrypted profile.</p>
        <div style="display:flex;gap:9px;flex-wrap:wrap">
          ${s.pinHash ? `<button class="btn" id="pin-change">Change PIN</button><button class="btn danger" id="pin-off">Remove PIN</button>` : `<button class="btn primary" id="pin-on">Set a PIN</button>`}</div></div>
      <div class="card"><h3>Demo data</h3>
        <p style="font-size:13.5px;color:var(--ink-2);margin-bottom:12px">${demoCount ? `${demoCount} fictional demo deal(s) are loaded (car wash, pest control, home services). All figures are invented for illustration.` : 'Demo deals are not currently loaded.'}</p>
        <div style="display:flex;gap:9px;flex-wrap:wrap">
          ${demoCount ? `<button class="btn danger" id="demo-del">Delete demo deals</button>` : `<button class="btn" id="demo-add">Reload demo deals</button>`}</div></div>
      <div class="card"><h3>Danger zone</h3>
        <button class="btn danger" id="wipe">Erase everything</button>
        <div class="hint" style="margin-top:8px">Deletes all deals, assumptions and settings from this device. Export a backup first.</div></div>
      <div class="card"><h3>About</h3>
        <p style="font-size:13px;color:var(--ink-3)">Deal Vault — a private business-acquisition underwriting platform. All analysis is decision support computed from the data you enter; it is not legal, tax, accounting, lending or investment advice. Engage an attorney, CPA and lender before you sign anything.</p></div>`;
    main.querySelector('#exp').onclick = () => {
      const blob = new Blob([DV.store.exportJSON()], { type: 'application/json' });
      const a2 = document.createElement('a');
      a2.href = URL.createObjectURL(blob);
      a2.download = 'deal-vault-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a2.click(); A().toast('Backup exported — keep it somewhere safe');
    };
    main.querySelector('#imp').onclick = () => main.querySelector('#imp-file').click();
    main.querySelector('#imp-file').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try { const n = DV.store.importJSON(rd.result); A().toast(`Imported ${n} deal(s)`); A().navigate('dashboard'); }
        catch (err) { A().toast('Import failed: ' + err.message, 'warn'); }
      };
      rd.readAsText(f);
    };
    main.querySelectorAll('[data-theme-btn]').forEach(b => b.onclick = () => {
      s.theme = b.dataset.themeBtn; DV.store.setSettings(s); A().applyTheme(); DV.views.settings.render(main);
    });
    const setPin = async () => {
      const p1 = prompt('Choose a PIN (4–8 digits):');
      if (!p1 || !/^\d{4,8}$/.test(p1)) return p1 !== null && A().toast('PIN must be 4–8 digits', 'warn');
      const p2 = prompt('Confirm PIN:');
      if (p1 !== p2) return A().toast('PINs didn\'t match', 'warn');
      s.pinHash = await A().sha(p1);
      sessionStorage.setItem('dv.unlocked', s.pinHash);
      DV.store.setSettings(s); A().toast('PIN set'); DV.views.settings.render(main);
    };
    const pinOn = main.querySelector('#pin-on'); if (pinOn) pinOn.onclick = setPin;
    const pinCh = main.querySelector('#pin-change'); if (pinCh) pinCh.onclick = setPin;
    const pinOff = main.querySelector('#pin-off'); if (pinOff) pinOff.onclick = () => { s.pinHash = null; DV.store.setSettings(s); A().toast('PIN removed'); DV.views.settings.render(main); };
    const dDel = main.querySelector('#demo-del'); if (dDel) dDel.onclick = () => A().confirmBox('Delete demo deals?', 'Removes the three fictional example deals. Your own deals are untouched.', 'Delete demos', () => {
      DV.store.deals(true).filter(d => d.isDemo).forEach(d => DV.store.removeDeal(d.id));
      DV.views.settings.render(main);
    }, true);
    const dAdd = main.querySelector('#demo-add'); if (dAdd) dAdd.onclick = () => { DV.demo.seed(); A().toast('Demo deals loaded'); DV.views.settings.render(main); };
    main.querySelector('#wipe').onclick = () => A().confirmBox('Erase EVERYTHING?', 'All deals, assumptions and settings will be permanently deleted from this device.', 'Erase all data', () => { DV.store.wipe(); location.hash = '#/dashboard'; location.reload(); }, true);
  }};
})();
