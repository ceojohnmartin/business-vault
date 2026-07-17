/* ============================================================
   Deal Vault — views/wizard.js
   "Analyze New Deal": Quick Analysis and Full Underwriting,
   a guided step-by-step flow with autosave, inline math,
   listing import, and data-source labeling.
   ============================================================ */
window.DV = window.DV || {};
DV.views = DV.views || {};

(() => {
  const U = DV.util, A = () => DV.app, C = () => DV.calc;

  const FULL_STEPS = [
    { key: 'source',    title: 'Source' },
    { key: 'basics',    title: 'Business' },
    { key: 'financials',title: 'Financials' },
    { key: 'normalize', title: 'Normalize' },
    { key: 'structure', title: 'Price & Financing' },
    { key: 'industry',  title: 'Industry' },
    { key: 'ops',       title: 'Operations' },
    { key: 'loc',       title: 'Location' },
    { key: 'lease',     title: 'Lease / RE' },
    { key: 'risks',     title: 'Risks' },
    { key: 'scenarios', title: 'Scenarios' },
    { key: 'review',    title: 'Review & Score' }
  ];
  const QUICK_STEPS = [
    { key: 'source', title: 'Source' },
    { key: 'quick',  title: 'Quick Inputs' },
    { key: 'review', title: 'Preliminary Score' }
  ];
  const steps = deal => deal.mode === 'quick' ? QUICK_STEPS : FULL_STEPS;

  /* ---------- entry: choose mode ---------- */
  DV.views.analyze = { render(main) {
    const drafts = DV.store.deals().filter(d => !d.isDemo && d.stage !== 'Passed' && d.wizardStep < steps(d).length - 1 && (Date.now() - d.updatedAt) < 45 * 86400000);
    main.innerHTML = `
      <div class="page-head"><div><h1>Analyze a New Deal</h1>
        <div class="sub">Two speeds: a five-minute sanity check, or the full underwriting an acquisition deserves before you send an LOI.</div></div></div>
      <div class="grid g2">
        <div class="card" style="cursor:pointer" id="go-quick">
          <span class="badge neutral">≈ 5 minutes</span>
          <h2 style="margin:10px 0 6px">Quick Analysis</h2>
          <p style="color:var(--ink-2);font-size:14px">Asking price, revenue, cash flow, financing — get a preliminary score and a gut-check on price and debt coverage. Clearly labeled as <b>not</b> a full underwriting.</p>
          <button class="btn primary" style="margin-top:14px">Start quick analysis</button>
        </div>
        <div class="card" style="cursor:pointer" id="go-full">
          <span class="badge gold">The real work</span>
          <h2 style="margin:10px 0 6px">Full Underwriting</h2>
          <p style="color:var(--ink-2);font-size:14px">Twelve guided steps: financial history, add-back normalization, financing structures, industry deep-dive, operations, location, lease, risk register, and scenario stress tests.</p>
          <button class="btn gold" style="margin-top:14px">Start full underwriting</button>
        </div>
      </div>
      ${drafts.length ? `<div class="card"><h3>Resume a draft</h3>${drafts.map(d => `
        <div class="list-row" onclick="DV.app.navigate('wizard/${d.id}/${d.wizardStep}')">
          <div class="list-main"><b>${U.esc(d.basics.name || d.basics.listingTitle || 'Untitled deal')}</b>
          <span>${U.esc(steps(d)[d.wizardStep]?.title || '')} · updated ${U.daysAgo(d.updatedAt)}</span></div>
          <span class="badge dim">${d.mode === 'quick' ? 'Quick' : 'Full'}</span></div>`).join('')}</div>` : ''}`;
    const start = mode => {
      const d = DV.newDeal(); d.mode = mode; d.stage = 'Initial Review';
      DV.store.upsertDeal(d); A().navigate(`wizard/${d.id}/0`);
    };
    main.querySelector('#go-quick').onclick = () => start('quick');
    main.querySelector('#go-full').onclick = () => start('full');
  }};

  /* ---------- wizard shell ---------- */
  DV.views.wizard = { render(main, args) {
    const deal = DV.store.deal(args[0]);
    if (!deal) { main.innerHTML = '<div class="empty">Deal not found.</div>'; return; }
    const ST = steps(deal);
    const idx = Math.min(parseInt(args[1] || '0', 10) || 0, ST.length - 1);
    deal.wizardStep = Math.max(deal.wizardStep, idx);
    const step = ST[idx];
    const name = deal.basics.name || deal.basics.listingTitle || 'New deal';
    main.innerHTML = `
      <div class="wizard-top">
        <div><h1 style="font-size:23px">${U.esc(name)}</h1>
        <div class="sub">${deal.mode === 'quick' ? 'Quick Analysis' : 'Full Underwriting'} — step ${idx + 1} of ${ST.length}: <b>${step.title}</b></div></div>
        <div class="progress"><i style="width:${((idx + 1) / ST.length * 100).toFixed(0)}%"></i></div>
      </div>
      <div class="step-pills">${ST.map((s, i) =>
        `<button class="step-pill ${i === idx ? 'active' : i < deal.wizardStep ? 'done' : ''}" onclick="DV.app.navigate('wizard/${deal.id}/${i}')">${i + 1}. ${s.title}</button>`).join('')}</div>
      <div id="step-body"></div>
      <div class="wizard-nav">
        <button class="btn" id="w-back" ${idx === 0 ? 'disabled' : ''}>← Back</button>
        <div style="display:flex;gap:9px">
          <button class="btn ghost" id="w-save">Save &amp; exit</button>
          <button class="btn primary" id="w-next">${idx === ST.length - 1 ? 'Open full analysis →' : 'Continue →'}</button>
        </div>
      </div>`;
    main.querySelector('#w-back').onclick = () => A().navigate(`wizard/${deal.id}/${idx - 1}`);
    main.querySelector('#w-save').onclick = () => { DV.store.upsertDeal(deal); A().toast('Saved. Every field autosaves as you type.'); A().navigate('deals'); };
    main.querySelector('#w-next').onclick = () => {
      if (idx === ST.length - 1) {
        if (!deal.dd.length) deal.dd = DV.ddGenerate(deal);
        if (deal.stage === 'Initial Review' || deal.stage === 'Discovered') deal.stage = 'Underwriting';
        DV.store.upsertDeal(deal); A().navigate(`deal/${deal.id}`);
      } else A().navigate(`wizard/${deal.id}/${idx + 1}`);
    };
    const body = main.querySelector('#step-body');
    STEP_RENDER[step.key](body, deal);
  }};

  const F = (deal, defs) => `<div class="form-grid">${defs.map(d => A().fieldHTML(deal, d)).join('')}</div>`;

  /* ================= STEP RENDERERS ================= */
  const STEP_RENDER = {

    /* ---- Step: deal source ---- */
    source(body, deal) {
      body.innerHTML = `
        <div class="card"><h3>Where is this deal coming from?</h3>
        <div class="card-sub">Import what you can, confirm every field, enter the rest by hand. Nothing is ever invented for you — imported and estimated values are labeled so you always know what's verified.</div>
        <div class="grid g4" style="margin-bottom:16px">${[
          ['url', 'Listing URL', 'Paste a BizBuySell / broker link'],
          ['paste', 'Paste listing text', 'Copy the listing page, paste it here'],
          ['docs', 'Documents', 'Log the P&L / tax returns you received'],
          ['manual', 'Manual entry', 'Type everything in yourself']
        ].map(([k, t, s]) => `<div class="card" style="margin:0;cursor:pointer;${deal.source.method === k ? 'border-color:var(--acc);box-shadow:0 0 0 2px var(--acc-soft)' : ''}" data-method="${k}">
            <b>${t}</b><div style="font-size:12px;color:var(--ink-3);margin-top:4px">${s}</div></div>`).join('')}</div>
        <div id="source-detail"></div></div>`;
      body.querySelectorAll('[data-method]').forEach(el => el.onclick = () => {
        deal.source.method = el.dataset.method; DV.store.upsertDeal(deal); STEP_RENDER.source(body, deal);
      });
      const det = body.querySelector('#source-detail');
      const m = deal.source.method;
      if (m === 'url') {
        det.innerHTML = `<div class="field"><label>Listing URL</label>
          <input id="src-url" type="url" placeholder="https://www.bizbuysell.com/…" value="${U.esc(deal.source.url)}"></div>
          <button class="btn primary" id="try-import" style="margin-top:10px">Try to import from URL</button>
          <div id="import-out" style="margin-top:12px"></div>`;
        det.querySelector('#try-import').onclick = async () => {
          const url = det.querySelector('#src-url').value.trim();
          deal.source.url = url; deal.basics.listingUrl = url; DV.store.upsertDeal(deal);
          const out = det.querySelector('#import-out');
          out.innerHTML = '<div class="callout">Fetching listing…</div>';
          try {
            const r = await fetch(url, { mode: 'cors' });
            const html = await r.text();
            const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
            showExtract(out, deal, DV.calc.parseListing(text), body);
          } catch (e) {
            out.innerHTML = `<div class="callout warn"><b>This site blocks automatic import (very common — brokers protect their listings).</b>
              No problem: open the listing, select-all, copy, then switch to <b>“Paste listing text”</b> above and paste it there. Same result, ten extra seconds.</div>`;
          }
        };
      } else if (m === 'paste') {
        det.innerHTML = `<div class="field"><label>Paste the listing text</label>
          <textarea id="src-paste" style="min-height:150px" placeholder="Paste the full listing description here…">${U.esc(deal.source.listingText)}</textarea></div>
          <button class="btn primary" id="extract" style="margin-top:10px">Extract fields</button>
          <div id="import-out" style="margin-top:12px"></div>`;
        det.querySelector('#extract').onclick = () => {
          deal.source.listingText = det.querySelector('#src-paste').value; DV.store.upsertDeal(deal);
          showExtract(det.querySelector('#import-out'), deal, DV.calc.parseListing(deal.source.listingText), body);
        };
      } else if (m === 'docs') {
        det.innerHTML = `<p style="font-size:13.5px;color:var(--ink-2);margin-bottom:10px">Log every document the broker or seller sends. Numbers still get entered in the Financials step — but each logged document raises your <b>data confidence</b>, and the due-diligence checklist tracks what's still missing.</p>
          <div style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:10px">
            <input type="file" id="doc-file" multiple style="display:none">
            <button class="btn" id="doc-add-file">Log files…</button>
            <button class="btn" id="doc-add-manual">Log by name</button></div>
          <div id="doc-list"></div>`;
        const renderDocs = () => {
          det.querySelector('#doc-list').innerHTML = deal.source.docs.length
            ? `<table class="data"><thead><tr><th>Document</th><th>Type</th><th></th></tr></thead><tbody>${deal.source.docs.map((d, i) =>
              `<tr><td>${U.esc(d.name)}</td><td><span class="src-chip src-verified">Logged</span></td><td><button class="btn sm ghost" data-del="${i}">✕</button></td></tr>`).join('')}</tbody></table>`
            : '<div class="chart-empty">No documents logged yet</div>';
          det.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { deal.source.docs.splice(+b.dataset.del, 1); DV.store.upsertDeal(deal); renderDocs(); });
        };
        det.querySelector('#doc-add-file').onclick = () => det.querySelector('#doc-file').click();
        det.querySelector('#doc-file').onchange = e => {
          for (const f of e.target.files) deal.source.docs.push({ name: f.name, type: f.type, note: '' });
          DV.store.upsertDeal(deal); renderDocs();
          A().toast('Documents logged. File contents stay on your device — record the numbers in the Financials step.');
        };
        det.querySelector('#doc-add-manual').onclick = () => {
          const name = prompt('Document name (e.g. "2024 tax return"):');
          if (name) { deal.source.docs.push({ name, type: 'named', note: '' }); DV.store.upsertDeal(deal); renderDocs(); }
        };
        renderDocs();
      } else det.innerHTML = `<div class="callout good">Manual entry it is — continue to the next step. Every number you type is labeled “User Entered.”</div>`;
    },

    /* ---- Step: basics ---- */
    basics(body, deal) {
      body.innerHTML = `<div class="card"><h3>Business identity</h3>${F(deal, [
        { key: 'basics.name', label: 'Business name', type: 'text', req: 1, placeholder: 'Or a nickname if confidential' },
        { key: 'basics.listingTitle', label: 'Listing title', type: 'text' },
        { key: 'basics.listingUrl', label: 'Listing URL', type: 'text' },
        { key: 'basics.industry', label: 'Industry', type: 'select', req: 1, opts: DV.industries.LIST.map(i => [i.key, i.label]), help: 'Drives the valuation multiples, benchmarks, industry questions and due-diligence list.' },
        { key: 'basics.subIndustry', label: 'Sub-industry / niche', type: 'text' },
        { key: 'basics.model', label: 'Business model', type: 'text', placeholder: 'e.g. route-based recurring service' },
        { key: 'basics.yearEstablished', label: 'Year established', type: 'year' },
        { key: 'basics.city', label: 'City', type: 'text' }, { key: 'basics.state', label: 'State', type: 'text' },
        { key: 'basics.serviceArea', label: 'Service area', type: 'text' },
        { key: 'basics.locations', label: '# of locations', type: 'num' },
        { key: 'basics.franchise', label: 'Franchise?', type: 'select', opts: [['independent', 'Independent'], ['franchise', 'Franchise']] },
        { key: 'basics.format', label: 'Format', type: 'select', opts: [['physical', 'Physical location'], ['mobile', 'Mobile / routes'], ['online', 'Online'], ['hybrid', 'Hybrid']] },
        { key: 'basics.description', label: 'What the business does', type: 'textarea', span2: 1 }
      ])}</div>
      <div class="card"><h3>People & operations</h3>${F(deal, [
        { key: 'basics.reasonForSelling', label: 'Owner\'s reason for selling', type: 'text', req: 1, help: 'One of the highest-signal questions in the whole deal.' },
        { key: 'basics.ownerInvolvement', label: 'Owner involvement', type: 'select', opts: [['full-time', 'Full-time operator'], ['part-time', 'Part-time'], ['semi-absentee', 'Semi-absentee'], ['absentee', 'Absentee']] },
        { key: 'basics.employees', label: 'Employees', type: 'num' },
        { key: 'basics.managers', label: 'Managers / supervisors', type: 'num' },
        { key: 'basics.hours', label: 'Operating hours', type: 'text' },
        { key: 'basics.seasonality', label: 'Seasonality', type: 'select', opts: [['low', 'Low'], ['moderate', 'Moderate'], ['high', 'High']] },
        { key: 'basics.licensesRequired', label: 'Licenses / permits required', type: 'text' }
      ])}</div>
      <div class="card"><h3>What's included & the seller's numbers</h3>
      <div class="card-sub">These are the <b>seller's claims</b> — they get labeled that way and verified later.</div>${F(deal, [
        { key: 'basics.realEstateIncluded', label: 'Real estate included?', type: 'bool' },
        { key: 'basics.inventoryIncluded', label: 'Inventory included?', type: 'bool' },
        { key: 'basics.inventoryValue', label: 'Inventory value', type: 'money' },
        { key: 'basics.equipmentIncluded', label: 'Equipment included?', type: 'bool' },
        { key: 'basics.vehiclesIncluded', label: 'Vehicles included?', type: 'bool' },
        { key: 'basics.askingPrice', label: 'Asking price', type: 'money', req: 1 },
        { key: 'basics.sellerRevenue', label: 'Stated revenue', type: 'money' },
        { key: 'basics.sellerCashFlow', label: 'Stated cash flow / SDE', type: 'money' },
        { key: 'basics.sellerSDE', label: 'Stated SDE (if separate)', type: 'money' },
        { key: 'basics.sellerEBITDA', label: 'Stated EBITDA', type: 'money' }
      ])}</div>`;
      A().bindFields(body, deal, path => {
        if (['basics.askingPrice','basics.sellerRevenue','basics.sellerCashFlow','basics.sellerSDE','basics.sellerEBITDA'].includes(path)
          && deal.fieldSources[path] !== 'imported') deal.fieldSources[path] = 'seller';
      });
    },

    /* ---- Step: quick (quick mode only) ---- */
    quick(body, deal) {
      const a = DV.store.assumptions();
      body.innerHTML = `
        <div class="callout warn"><b>Preliminary only.</b> A quick analysis uses seller-claimed numbers with zero verification. Use it to decide whether the deal deserves a full underwriting — never to make an offer.</div>
        <div class="card"><h3>The essentials</h3>${F(deal, [
          { key: 'basics.name', label: 'Business name / nickname', type: 'text', req: 1 },
          { key: 'basics.industry', label: 'Industry', type: 'select', req: 1, opts: DV.industries.LIST.map(i => [i.key, i.label]) },
          { key: 'basics.city', label: 'City', type: 'text' }, { key: 'basics.state', label: 'State', type: 'text' },
          { key: 'basics.askingPrice', label: 'Asking price', type: 'money', req: 1 },
          { key: 'basics.sellerRevenue', label: 'Annual revenue (seller-stated)', type: 'money', req: 1 },
          { key: 'basics.sellerSDE', label: 'SDE / cash flow (seller-stated)', type: 'money', req: 1, help: 'Seller\'s Discretionary Earnings: profit + owner salary + owner perks.' },
          { key: 'basics.employees', label: 'Employees', type: 'num' }
        ])}</div>
        <div class="card"><h3>How you'd finance it</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px" id="preset-row"></div>
          ${F(deal, [
            { key: 'structure.downPayment', label: 'Cash down payment', type: 'money' },
            { key: 'structure.sbaAmount', label: 'SBA loan', type: 'money' },
            { key: 'structure.sbaRate', label: 'SBA rate %', type: 'pct', placeholder: String(a.sbaRate) },
            { key: 'structure.sbaTerm', label: 'SBA term (years)', type: 'num', placeholder: String(a.sbaTermYears) },
            { key: 'structure.sellerAmount', label: 'Seller note', type: 'money' },
            { key: 'structure.sellerRate', label: 'Seller note rate %', type: 'pct', placeholder: String(a.sellerRate) },
            { key: 'structure.sellerTerm', label: 'Seller note term (years)', type: 'num', placeholder: String(a.sellerTermYears) }
          ])}
          <div id="quick-live" style="margin-top:12px"></div></div>`;
      const presetRow = body.querySelector('#preset-row');
      const renderPresets = () => {
        const price = C().N(deal.basics.askingPrice) ?? 0;
        const ps = DV.calc.financingPresets(price, a);
        presetRow.innerHTML = Object.entries(ps).filter(([k]) => k !== 'custom').map(([k, p]) =>
          `<button class="btn sm ${deal.structure.preset === k ? 'primary' : ''}" data-preset="${k}">${p.label}</button>`).join('');
        presetRow.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
          const p = DV.calc.financingPresets(C().N(deal.basics.askingPrice) ?? 0, a)[b.dataset.preset];
          Object.assign(deal.structure, { preset: b.dataset.preset, proposedPrice: C().N(deal.basics.askingPrice),
            downPayment: Math.round(p.down), sbaAmount: Math.round(p.sba), bankAmount: Math.round(p.bank), sellerAmount: Math.round(p.seller) });
          DV.store.upsertDeal(deal); STEP_RENDER.quick(body, deal);
        });
      };
      const live = () => {
        deal.structure.proposedPrice = deal.structure.proposedPrice ?? C().N(deal.basics.askingPrice);
        const sc = safeAnalyze(deal);
        const el = body.querySelector('#quick-live');
        if (!sc || !sc.res.ok) { el.innerHTML = '<div class="chart-empty">Enter price + SDE to see live numbers</div>'; return; }
        const b = sc.res.base;
        el.innerHTML = `<div class="grid g4">
          ${kpi('Cash needed', U.money(sc.res.fin.cashRequired, {compact:true}))}
          ${kpi('Monthly debt payment', U.money(sc.res.fin.monthlyDS, {compact:true}))}
          ${kpi('DSCR', U.ratio(b.dscrY1), b.dscrY1 >= 1.25 ? 'good' : b.dscrY1 >= 1 ? 'warn' : 'bad')}
          ${kpi('Cash-on-cash', U.pct(b.cocY1), (b.cocY1 ?? 0) >= 15 ? 'good' : 'warn')}</div>`;
      };
      renderPresets();
      A().bindFields(body, deal, p => {
        if (p === 'basics.askingPrice') { deal.structure.proposedPrice = C().N(deal.basics.askingPrice); renderPresets(); }
        if (['basics.sellerSDE','basics.sellerRevenue','basics.askingPrice'].includes(p) && deal.fieldSources[p] !== 'imported') deal.fieldSources[p] = 'seller';
        live();
      });
      live();
    },

    /* ---- Step: historical financials ---- */
    financials(body, deal) {
      const thisYear = new Date().getFullYear();
      if (!deal.years.length)
        deal.years = [thisYear - 3, thisYear - 2, thisYear - 1].map(y => ({ year: y }));
      const LINES = [
        ['sect', 'Revenue'], ['revenue', 'Gross revenue'], ['cogs', 'Cost of goods sold'],
        ['sect', 'Operating expenses'], ['payroll', 'Payroll (non-owner)'], ['rent', 'Rent'], ['utilities', 'Utilities'],
        ['marketing', 'Marketing'], ['insurance', 'Insurance'], ['vehicles', 'Vehicle expenses'], ['repairs', 'Repairs & maintenance'],
        ['software', 'Software & subscriptions'], ['professional', 'Professional fees'], ['taxes', 'Taxes & licenses'], ['otherOpex', 'Other operating expenses'],
        ['sect', 'Owner'], ['ownerSalary', 'Owner salary'], ['ownerBenefits', 'Owner benefits'], ['personalExpenses', 'Personal expenses in business'],
        ['sect', 'Below the line'], ['interest', 'Interest'], ['depreciation', 'Depreciation'], ['amortization', 'Amortization'], ['netIncome', 'Net income (per return)'],
        ['sect', 'Cash & capital'], ['capex', 'Capital expenditures'], ['inventoryPurchases', 'Inventory purchases'], ['workingCapital', 'Working capital need'],
        ['cash', 'Cash balance'], ['ar', 'Accounts receivable'], ['ap', 'Accounts payable'], ['debt', 'Existing business debt'],
        ['sect', 'Shortcut (if you only have summaries)'], ['ebitda', 'EBITDA (stated)'], ['sde', 'SDE (stated)']
      ];
      const render = () => {
        const ys = deal.years;
        body.innerHTML = `
        <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <h3>Year-by-year P&amp;L</h3>
          <div style="display:flex;gap:8px">
            <button class="btn sm" id="add-year" ${ys.length >= 7 ? 'disabled' : ''}>+ Add year</button>
            <button class="btn sm" id="del-year" ${ys.length <= 1 ? 'disabled' : ''}>− Remove oldest</button></div></div>
          <div class="card-sub">Best source: tax returns. It works with one year, sings with three to five. Leave unknown cells blank — never guess.</div>
          <div class="fin-grid"><table><thead><tr><th></th>${ys.map((y, i) =>
            `<th><input data-year-idx="${i}" value="${U.esc(y.year ?? '')}" style="width:64px;text-align:center;font-weight:700"></th>`).join('')}</tr></thead>
          <tbody>${LINES.map(([k, label]) => k === 'sect'
            ? `<tr><td class="sect" colspan="${ys.length + 1}">${label}</td></tr>`
            : `<tr><td>${label}</td>${ys.map((y, i) => `<td><input data-cell="${i}:${k}" inputmode="decimal" value="${y[k] ?? ''}"></td>`).join('')}</tr>`).join('')}
          <tr><td class="sect" colspan="${ys.length + 1}">Computed</td></tr>
          ${['grossProfit','ebitda','sde','sdeMarginPct'].map(mk => `<tr><td><b>${{grossProfit:'Gross profit',ebitda:'EBITDA (computed)',sde:'SDE (computed)',sdeMarginPct:'SDE margin'}[mk]}</b></td>
            ${ys.map((y, i) => { const m = C().yearMetrics(y); const v = m[mk];
              return `<td class="calc-cell">${v === null || v === undefined ? '—' : mk.endsWith('Pct') ? U.pct(v) : U.money(v, {compact:true})}</td>`; }).join('')}</tr>`).join('')}
          </tbody></table></div></div>
        <div id="fin-analysis"></div>`;
        body.querySelector('#add-year').onclick = () => { deal.years.push({ year: (C().N(ys[ys.length-1]?.year) ?? thisYear - 1) + 1 }); DV.store.upsertDeal(deal); render(); };
        body.querySelector('#del-year').onclick = () => { deal.years.shift(); DV.store.upsertDeal(deal); render(); };
        body.querySelectorAll('[data-year-idx]').forEach(inp => inp.addEventListener('input', () => { deal.years[+inp.dataset.yearIdx].year = C().N(inp.value); DV.store.upsertDeal(deal); }));
        body.querySelectorAll('[data-cell]').forEach(inp => inp.addEventListener('input', () => {
          const [i, k] = inp.dataset.cell.split(':');
          deal.years[+i][k] = C().N(inp.value);
          DV.store.upsertDeal(deal); analysis();
        }));
        analysis();
      };
      const analysis = () => {
        const h = C().history(deal);
        const el = body.querySelector('#fin-analysis');
        if (!h.rows.length) { el.innerHTML = ''; return; }
        const L = h.latest;
        el.innerHTML = `
          <div class="grid g4" style="margin-bottom:14px">
            ${kpi('Revenue trend', h.cagr3 !== null ? U.pct(h.cagr3) + '/yr' : '—', (h.cagr3 ?? 0) >= 0 ? 'good' : 'bad')}
            ${kpi('SDE margin', U.pct(L.sdeMarginPct))}
            ${kpi('Volatility (σ growth)', h.volatility !== null ? '±' + U.pct(h.volatility) : '—')}
            ${kpi('Revenue / employee', U.money(h.revenuePerEmployee, {compact:true}))}</div>
          <div class="card"><h3>History</h3>${DV.charts.lines([
            { label: 'Revenue', color: 'var(--acc)', points: h.rows.map(r => ({ x: r.year, y: r.revenue })) },
            { label: 'SDE', color: 'var(--gold)', points: h.rows.map(r => ({ x: r.year, y: r.sde })), bars: true }
          ])}</div>
          ${h.flags.map(f => `<div class="callout warn">${U.esc(f)}</div>`).join('')}`;
      };
      render();
    },

    /* ---- Step: normalization ---- */
    normalize(body, deal) {
      const PRESETS = ['Owner salary above/below market','Owner health insurance','Owner vehicle','Personal travel','One-time legal expense','One-time repair','Family member on payroll (not needed)','Non-recurring income','Pandemic-era anomaly','Below-market rent (will reset up)','Above-market rent (renegotiable)','Deferred maintenance catch-up','Replacement manager salary needed','Missing employee expense','Unreported labor cost','Marketing the buyer must add','Technology investment needed'];
      const render = () => {
        const a = DV.store.assumptions();
        const norm = C().normalize(deal, a);
        body.innerHTML = `
        <div class="card"><h3>Add-backs & adjustments</h3>
        <div class="card-sub">Every dollar of add-back inflates the price by ${DV.industries.get(deal.basics.industry).multFair}× — so every dollar needs evidence. Adjustments without evidence get flagged and drag your confidence score down.</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <select id="preset-sel" style="max-width:300px;border:1px solid var(--line-2);border-radius:8px;padding:7px"><option value="">＋ Add from common adjustments…</option>${PRESETS.map(p => `<option>${p}</option>`).join('')}</select>
          <button class="btn" id="adj-add">＋ Custom adjustment</button></div>
        ${deal.adjustments.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Adjustment</th><th>Direction</th><th class="num">Amount</th><th>Recurring?</th><th>Evidence</th><th>Confidence</th><th></th></tr></thead><tbody>
          ${deal.adjustments.map((adj, i) => `<tr>
            <td><input data-adj="${i}:desc" value="${U.esc(adj.desc)}" style="width:180px;border:1px solid var(--line);border-radius:6px;padding:5px"></td>
            <td><select data-adj="${i}:dir" style="border:1px solid var(--line);border-radius:6px;padding:5px"><option value="+"${adj.dir !== '-' ? ' selected' : ''}>+ Increases earnings</option><option value="-"${adj.dir === '-' ? ' selected' : ''}>− Decreases earnings</option></select></td>
            <td class="num"><input data-adj="${i}:amount" inputmode="decimal" value="${adj.amount ?? ''}" style="width:96px;text-align:right;border:1px solid var(--line);border-radius:6px;padding:5px"></td>
            <td><select data-adj="${i}:recurring" style="border:1px solid var(--line);border-radius:6px;padding:5px"><option value="yes"${adj.recurring ? ' selected' : ''}>Recurring</option><option value="no"${!adj.recurring ? ' selected' : ''}>One-time</option></select></td>
            <td><input data-adj="${i}:evidence" value="${U.esc(adj.evidence || '')}" placeholder="doc / proof…" style="width:130px;border:1px solid var(--line);border-radius:6px;padding:5px"></td>
            <td><select data-adj="${i}:confidence" style="border:1px solid var(--line);border-radius:6px;padding:5px">${['high','med','low'].map(c => `<option value="${c}"${(adj.confidence || 'med') === c ? ' selected' : ''}>${c[0].toUpperCase() + c.slice(1)}</option>`).join('')}</select></td>
            <td><button class="btn sm ghost" data-adj-del="${i}">✕</button></td></tr>`).join('')}</tbody></table></div>`
          : '<div class="chart-empty">No adjustments yet — add the seller\'s claimed add-backs and your own corrections</div>'}
        </div>
        <div class="card"><h3>Normalization bridge</h3>
          ${DV.charts.hbars([
            { label: 'Seller-claimed SDE', value: C().N(deal.basics.sellerSDE) ?? C().N(deal.basics.sellerCashFlow), color: 'var(--warn)' },
            { label: 'SDE from your financials', value: norm.reportedSDE, color: 'var(--acc)' },
            { label: 'Adjustments (net)', value: norm.adjTotal, color: norm.adjTotal >= 0 ? 'var(--good)' : 'var(--bad)' },
            { label: 'Normalized SDE', value: norm.normalizedSDE, color: 'var(--gold)' },
            { label: `Normalized EBITDA (after ${U.money(norm.managerSalary, {compact:true})} manager)`, value: norm.normalizedEBITDA, color: 'var(--acc)' }
          ])}
          ${norm.sellerGap !== null && Math.abs(norm.sellerGap) > 1 ? `<div class="callout ${norm.sellerGap < 0 ? 'warn' : 'good'}" style="margin-top:12px">Your normalized SDE is <b>${U.money(Math.abs(norm.sellerGap), {compact:true})} ${norm.sellerGap < 0 ? 'below' : 'above'}</b> the seller's claim.</div>` : ''}
          ${norm.warnings.map(w => `<div class="callout bad">${U.esc(w)}</div>`).join('')}</div>`;
        body.querySelector('#adj-add').onclick = () => { deal.adjustments.push({ id: U.uid(), desc: '', amount: null, dir: '+', recurring: true, evidence: '', confidence: 'med' }); DV.store.upsertDeal(deal); render(); };
        body.querySelector('#preset-sel').onchange = e => {
          if (!e.target.value) return;
          const dir = /rent \(will reset|manager salary|missing employee|unreported|must add|investment needed|catch-up/i.test(e.target.value) ? '-' : '+';
          deal.adjustments.push({ id: U.uid(), desc: e.target.value, amount: null, dir, recurring: !/one-time|pandemic|catch-up/i.test(e.target.value), evidence: '', confidence: 'med' });
          DV.store.upsertDeal(deal); render();
        };
        body.querySelectorAll('[data-adj]').forEach(inp => inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
          const [i, k] = inp.dataset.adj.split(':');
          const adj = deal.adjustments[+i];
          if (k === 'amount') adj.amount = C().N(inp.value);
          else if (k === 'recurring') adj.recurring = inp.value === 'yes';
          else adj[k] = inp.value;
          DV.store.upsertDeal(deal);
          if (inp.tagName === 'SELECT' || k === 'amount') render();
        }));
        body.querySelectorAll('[data-adj-del]').forEach(b => b.onclick = () => { deal.adjustments.splice(+b.dataset.adjDel, 1); DV.store.upsertDeal(deal); render(); });
      };
      render();
    },

    /* ---- Step: price & financing structure ---- */
    structure(body, deal) {
      const a = DV.store.assumptions();
      if (deal.structure.proposedPrice === null) deal.structure.proposedPrice = C().N(deal.basics.askingPrice);
      const render = () => {
        body.innerHTML = `
        <div class="card"><h3>Financing scenario</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px" id="preset-row"></div>
          ${F(deal, [
            { key: 'basics.askingPrice', label: 'Asking price', type: 'money' },
            { key: 'structure.proposedPrice', label: 'Your proposed price', type: 'money', req: 1 },
            { key: 'structure.downPayment', label: 'Cash down payment', type: 'money', req: 1 },
            { key: 'structure.investorEquity', label: 'Outside investor equity', type: 'money' }
          ])}
          <h3 style="margin:18px 0 10px">Debt stack</h3>${F(deal, [
            { key: 'structure.sbaAmount', label: 'SBA loan amount', type: 'money' },
            { key: 'structure.sbaRate', label: 'SBA rate %', type: 'pct', placeholder: String(a.sbaRate) },
            { key: 'structure.sbaTerm', label: 'SBA term (yrs)', type: 'num', placeholder: String(a.sbaTermYears) },
            { key: 'structure.bankAmount', label: 'Conventional loan', type: 'money' },
            { key: 'structure.bankRate', label: 'Bank rate %', type: 'pct', placeholder: String(a.bankRate) },
            { key: 'structure.bankTerm', label: 'Bank term (yrs)', type: 'num', placeholder: String(a.bankTermYears) },
            { key: 'structure.balloonYear', label: 'Bank balloon (year #)', type: 'num', help: 'Leave blank if fully amortizing.' },
            { key: 'structure.sellerAmount', label: 'Seller note', type: 'money', help: 'Seller financing keeps the seller invested in your success. Lenders love it; you should too.' },
            { key: 'structure.sellerRate', label: 'Seller rate %', type: 'pct', placeholder: String(a.sellerRate) },
            { key: 'structure.sellerTerm', label: 'Seller term (yrs)', type: 'num', placeholder: String(a.sellerTermYears) },
            { key: 'structure.sellerIOMonths', label: 'Seller interest-only (months)', type: 'num' },
            { key: 'structure.earnout', label: 'Earnout amount', type: 'money' },
            { key: 'structure.earnoutTerms', label: 'Earnout conditions', type: 'text', placeholder: 'e.g. paid if revenue stays > $1M' }
          ])}
          <h3 style="margin:18px 0 10px">Closing costs & day-one capital</h3>${F(deal, [
            { key: 'structure.closingCosts', label: 'Buyer closing costs', type: 'money' },
            { key: 'structure.lenderFees', label: 'Lender / SBA guaranty fees', type: 'money', help: 'SBA guaranty fee is roughly 2–3.75% of the guaranteed portion.' },
            { key: 'structure.legalFees', label: 'Legal fees', type: 'money' },
            { key: 'structure.ddFees', label: 'Due-diligence / QoE fees', type: 'money' },
            { key: 'structure.immediateCapex', label: 'Immediate capex needed', type: 'money' },
            { key: 'structure.wcInjection', label: 'Working-capital injection', type: 'money' },
            { key: 'structure.inventorySeparate', label: 'Inventory bought separately', type: 'money' },
            { key: 'structure.realEstatePrice', label: 'Real-estate purchase (if separate)', type: 'money' },
            { key: 'structure.personalGuarantee', label: 'Personal guarantee required?', type: 'bool' },
            { key: 'structure.collateral', label: 'Collateral required', type: 'text' }
          ])}</div>
        <div id="fin-live"></div>`;
        const presetRow = body.querySelector('#preset-row');
        const ps = DV.calc.financingPresets(C().N(deal.structure.proposedPrice) ?? 0, a);
        presetRow.innerHTML = Object.entries(ps).map(([k, p]) =>
          `<button class="btn sm ${deal.structure.preset === k ? 'primary' : ''}" data-preset="${k}">${p.label}</button>`).join('');
        presetRow.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
          deal.structure.preset = b.dataset.preset;
          if (b.dataset.preset !== 'custom') {
            const p = DV.calc.financingPresets(C().N(deal.structure.proposedPrice) ?? 0, a)[b.dataset.preset];
            Object.assign(deal.structure, { downPayment: Math.round(p.down), sbaAmount: Math.round(p.sba), bankAmount: Math.round(p.bank), sellerAmount: Math.round(p.seller) });
          }
          DV.store.upsertDeal(deal); render();
        });
        A().bindFields(body, deal, live);
        live();
      };
      const live = () => {
        const el = body.querySelector('#fin-live');
        const sc = safeAnalyze(deal);
        if (!sc || !sc.res.ok) { el.innerHTML = '<div class="chart-empty">Enter price and earnings (previous steps) to see coverage</div>'; return; }
        const fin = sc.res.fin, b = sc.res.base;
        el.innerHTML = `<div class="card"><h3>Does the structure hold?</h3>
          <div class="grid g23">
            <div>${DV.charts.donut([
              { label: 'Your cash', value: fin.down, color: 'var(--gold)' },
              { label: 'SBA loan', value: C().n0(deal.structure.sbaAmount), color: 'var(--acc)' },
              { label: 'Bank loan', value: C().n0(deal.structure.bankAmount), color: '#5e81ac' },
              { label: 'Seller note', value: C().n0(deal.structure.sellerAmount), color: 'var(--good)' },
              { label: 'Investor equity', value: C().n0(deal.structure.investorEquity), color: '#9a6fb8' }
            ], 'Sources', U.money(fin.sources, {compact:true}))}</div>
            <div class="grid g2">
              ${kpi('Total uses (project cost)', U.money(fin.uses, {compact:true}))}
              ${kpi('Sources − uses', U.money(fin.gap, {compact:true}), Math.abs(fin.gap) < 1000 ? 'good' : 'bad')}
              ${kpi('Cash required at close', U.money(fin.cashRequired, {compact:true}))}
              ${kpi('Loan-to-value', U.pct(fin.ltvPct, 0))}
              ${kpi('Annual debt service', U.money(fin.annualDS[0], {compact:true}))}
              ${kpi('DSCR (base case)', U.ratio(b.dscrY1), (b.dscrY1 ?? 0) >= 1.25 ? 'good' : (b.dscrY1 ?? 0) >= 1 ? 'warn' : 'bad')}
            </div></div>
          ${Math.abs(fin.gap) >= 1000 ? `<div class="callout bad" style="margin-top:10px"><b>Structure doesn't balance.</b> Sources ${fin.gap > 0 ? 'exceed' : 'fall short of'} uses by ${U.money(Math.abs(fin.gap), {compact:true})}. Adjust the down payment or loans.</div>` : ''}
          ${fin.balloons.length ? `<div class="callout warn">Balloon of ${U.money(fin.balloons[0].amount, {compact:true})} due in year ${fin.balloons[0].year}.</div>` : ''}
        </div>`;
      };
      render();
    },

    /* ---- Step: industry questions ---- */
    industry(body, deal) {
      const ind = DV.industries.get(deal.basics.industry);
      const a = DV.store.assumptions();
      body.innerHTML = `
        <div class="callout"><b>${U.esc(ind.label)} template.</b> Typical SDE multiples ${ind.multLow}–${ind.multHigh}× · gross margin ≈ ${ind.grossMargin}% · SDE margin ≈ ${ind.sdeMargin}% · industry outlook ${ind.outlook}/10. Change the industry in the Business step if this is wrong.</div>
        <div class="card"><h3>${U.esc(ind.label)} deep-dive</h3>
        <div class="form-grid">${ind.questions.map(q => A().fieldHTML(deal, {
          key: 'industryAnswers.' + q.key, label: q.label,
          type: q.type === 'select' ? 'select' : q.type === 'bool' ? 'bool' : (q.type === 'text' ? 'text' : q.type),
          opts: q.opts, help: q.help
        })).join('')}</div></div>
        <div class="card"><h3>Owner replacement</h3>
        <div class="card-sub">The single most important honesty check: what would it cost to pay someone competent to run this so it's an investment, not a job?</div>
        ${F(deal, [{ key: 'industryAnswers.managerSalary', label: 'Market-rate manager salary here', type: 'money', placeholder: String(a.managerSalary), help: 'Defaults to the global assumption (' + U.money(a.managerSalary) + ') if left blank.' },
          { key: 'industryAnswers.sellerStayMonths', label: 'Seller will stay on (months)', type: 'num' }])}</div>`;
      A().bindFields(body, deal);
    },

    /* ---- Step: operations ---- */
    ops(body, deal) {
      const groups = [...new Set(DV.OPS_RATINGS.map(r => r.group))];
      body.innerHTML = `
        <div class="card"><h3>Revenue quality</h3>${F(deal, [
          { key: 'ops.recurringRevenuePct', label: 'Recurring revenue %', type: 'pct', help: 'Contracted or subscription revenue that repeats without resale effort.' },
          { key: 'ops.retentionPct', label: 'Customer retention % (annual)', type: 'pct' },
          { key: 'ops.topCustomerPct', label: 'Top customer % of revenue', type: 'pct', req: 1 },
          { key: 'ops.top5Pct', label: 'Top 5 customers %', type: 'pct' },
          { key: 'ops.top10Pct', label: 'Top 10 customers %', type: 'pct' },
          { key: 'ops.reviewScore', label: 'Google rating', type: 'num' },
          { key: 'ops.reviewCount', label: 'Review count', type: 'num' }
        ])}</div>
        ${groups.map(g => `<details class="sect" ${g === 'People' ? 'open' : ''}><summary>${g}</summary><div class="sect-body">
          ${DV.OPS_RATINGS.filter(r => r.group === g).map(r => {
            const v = deal.ops.ratings[r.key] ?? '';
            return `<div class="rating-row"><label title="${U.esc(r.help || '')}">${r.label}${r.invert ? ' <span class="tip" title="Lower is better">↓</span>' : ''}</label>
              <input type="range" min="0" max="10" step="1" value="${v === '' ? 5 : v}" data-rate="${r.key}" ${v === '' ? 'data-unset="1"' : ''}>
              <output>${v === '' ? '—' : v}</output></div>`;
          }).join('')}</div></details>`).join('')}
        <div class="callout">Sliders: 0 = terrible, 10 = excellent. For factors marked ↓ (turnover, dependence, exposure) rate the <b>amount</b> of the problem — 0 = none, 10 = severe. Unmoved sliders don't count against the deal; they count as <i>unknown</i>.</div>`;
      A().bindFields(body, deal);
      body.querySelectorAll('[data-rate]').forEach(sl => sl.addEventListener('input', () => {
        deal.ops.ratings[sl.dataset.rate] = +sl.value;
        sl.removeAttribute('data-unset');
        sl.parentElement.querySelector('output').textContent = sl.value;
        DV.store.upsertDeal(deal);
      }));
    },

    /* ---- Step: location & market ---- */
    loc(body, deal) {
      body.innerHTML = `
        <div class="card"><h3>Public data (label your source)</h3>
        <div class="card-sub">Pull from census.gov, the city's economic development page, or state DOT traffic counts — and record where and when, so future-you can trust it.</div>
        ${F(deal, [
          { key: 'location.population', label: 'Market population', type: 'num' },
          { key: 'location.popGrowthPct', label: 'Population growth %/yr', type: 'pct' },
          { key: 'location.medianIncome', label: 'Median household income', type: 'money' },
          { key: 'location.employmentGrowthPct', label: 'Employment growth %/yr', type: 'pct' },
          { key: 'location.trafficCount', label: 'Traffic count (if site-based)', type: 'num' },
          { key: 'location.dataSource', label: 'Data source', type: 'text', placeholder: 'e.g. census.gov ACS' },
          { key: 'location.dataDate', label: 'Data as-of date', type: 'text', placeholder: 'e.g. 2025' }
        ])}</div>
        <div class="card"><h3>Rate the location & market</h3>
        ${DV.LOC_RATINGS.map(r => {
          const v = deal.location.ratings[r.key] ?? '';
          return `<div class="rating-row"><label>${r.label}${r.invert ? ' <span class="tip" title="Rate the amount of the problem: 0 = none, 10 = severe">↓</span>' : ''}</label>
            <input type="range" min="0" max="10" value="${v === '' ? 5 : v}" data-rate="${r.key}">
            <output>${v === '' ? '—' : v}</output></div>`;
        }).join('')}</div>
        <div class="card"><h3>Location strategy</h3>${F(deal, [
          { key: 'location.locationDependent', label: 'Does the business depend on this exact location?', type: 'bool' },
          { key: 'location.relocatable', label: 'Could it relocate if needed?', type: 'bool' },
          { key: 'location.territory', label: 'Territory position', type: 'select', opts: ['Protected / underserved', 'Competitive but healthy', 'Saturated'] }
        ])}</div>
        <div id="loc-score"></div>`;
      const refresh = () => {
        const ls = DV.score.locationScore(deal);
        body.querySelector('#loc-score').innerHTML = ls.score !== null
          ? `<div class="card"><div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">${DV.charts.meterBig ? '' : ''}<h3 style="margin:0">Location Score</h3><span class="score-chip" style="background:${ls.score >= 70 ? 'var(--good-soft)' : ls.score >= 50 ? 'var(--warn-soft)' : 'var(--bad-soft)'};color:${ls.score >= 70 ? 'var(--good)' : ls.score >= 50 ? 'var(--warn)' : 'var(--bad)'}">${ls.score}</span>
            <div style="flex:1;font-size:13px;color:var(--ink-2)">${ls.notes.map(U.esc).join(' · ')}</div></div></div>` : '';
      };
      A().bindFields(body, deal, refresh);
      body.querySelectorAll('[data-rate]').forEach(sl => sl.addEventListener('input', () => {
        deal.location.ratings[sl.dataset.rate] = +sl.value;
        sl.parentElement.querySelector('output').textContent = sl.value;
        DV.store.upsertDeal(deal); refresh();
      }));
      refresh();
    },

    /* ---- Step: lease & real estate ---- */
    lease(body, deal) {
      const render = () => {
        body.innerHTML = `
        <div class="card">${F(deal, [{ key: 'lease.applicable', label: 'Does the business lease its premises?', type: 'bool' }])}</div>
        ${deal.lease.applicable === false ? '<div class="callout good">No lease — one less way to lose the business.</div>' : `
        <div class="card"><h3>Lease terms</h3>${F(deal, [
          { key: 'lease.monthlyRent', label: 'Monthly rent (all-in)', type: 'money' },
          { key: 'lease.annualIncreasePct', label: 'Annual increases %', type: 'pct' },
          { key: 'lease.yearsRemaining', label: 'Years remaining on lease', type: 'num', req: 1 },
          { key: 'lease.renewalOptions', label: 'Renewal options', type: 'text', placeholder: 'e.g. 2 × 5 years' },
          { key: 'lease.assignment', label: 'Assignment terms', type: 'text', placeholder: 'e.g. landlord consent required' },
          { key: 'lease.landlordApprovalNeeded', label: 'Landlord must approve buyer?', type: 'bool' },
          { key: 'lease.personalGuarantee', label: 'Personal guarantee on lease?', type: 'bool' },
          { key: 'lease.nnn', label: 'Triple-net (NNN)?', type: 'bool' },
          { key: 'lease.camMonthly', label: 'CAM / taxes / ins (monthly)', type: 'money' },
          { key: 'lease.sqft', label: 'Square footage', type: 'num' },
          { key: 'lease.marketRentMonthly', label: 'Est. market rent (monthly)', type: 'money', help: 'Ask a local commercial broker — 15 minutes well spent.' },
          { key: 'lease.renovationsNeeded', label: 'Renovations required', type: 'money' },
          { key: 'lease.zoning', label: 'Zoning', type: 'text' }, { key: 'lease.parking', label: 'Parking', type: 'text' },
          { key: 'lease.sellerOwnsProperty', label: 'Seller owns the property?', type: 'bool' },
          { key: 'lease.purchaseOption', label: 'Option to buy the property?', type: 'bool' }
        ])}<div id="lease-flags" style="margin-top:12px"></div></div>`}`;
        A().bindFields(body, deal, flags);
        flags();
      };
      const flags = () => {
        const el = body.querySelector('#lease-flags'); if (!el) return;
        const L = deal.lease, msgs = [];
        const yrs = C().N(L.yearsRemaining), loanYears = C().N(deal.structure.sbaTerm) || 10;
        if (yrs !== null && yrs <= 2 && !(L.renewalOptions || '').trim()) msgs.push(['bad', 'Lease nearly expired with no options — this can kill SBA financing and the business itself.']);
        else if (yrs !== null && C().n0(deal.structure.sbaAmount) > 0 && yrs < loanYears && !(L.renewalOptions || '').trim()) msgs.push(['warn', `SBA lenders want lease term (with options) ≥ loan term (${loanYears} yrs). You have ${yrs}.`]);
        const rent = C().N(L.monthlyRent), mkt = C().N(L.marketRentMonthly);
        if (rent !== null && mkt !== null && mkt > 0) {
          const prem = (rent - mkt) / mkt * 100;
          if (prem > 10) msgs.push(['warn', `Rent ~${prem.toFixed(0)}% above market — negotiate at assignment.`]);
          if (prem < -10) msgs.push(['warn', `Rent ~${Math.abs(prem).toFixed(0)}% below market — budget for a reset at renewal (add a normalization adjustment).`]);
        }
        if (C().N(L.annualIncreasePct) >= 4) msgs.push(['warn', 'Rent escalators ≥ 4%/yr compound brutally over a 10-year loan.']);
        if (L.landlordApprovalNeeded === true) msgs.push(['warn', 'Landlord approval needed — start that conversation immediately after LOI.']);
        if (L.sellerOwnsProperty === true) msgs.push(['good', 'Seller owns the property — negotiate a long lease with options (or buy it) before closing.']);
        el.innerHTML = msgs.map(([k, m]) => `<div class="callout ${k}">${m}</div>`).join('');
      };
      render();
    },

    /* ---- Step: risks ---- */
    risks(body, deal) {
      const render = () => {
        body.innerHTML = `
        <div class="card"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center">
          <h3>Risk register</h3><div style="display:flex;gap:8px">
          <button class="btn sm" id="risk-suggest">Suggest risks for this deal</button>
          <button class="btn sm primary" id="risk-add">＋ Add risk</button></div></div>
        <div class="card-sub">Probability and severity are 1–5. Anything marked <b>deal-breaker</b> caps the Deal Score until it's closed.</div>
        <div id="risk-list"></div></div>
        <div class="card"><h3>Heat map</h3>${DV.charts.heatmap(deal.risks)}</div>`;
        const list = body.querySelector('#risk-list');
        list.innerHTML = deal.risks.length ? `<div class="table-wrap"><table class="data"><thead><tr>
          <th>Risk</th><th>Category</th><th>Prob.</th><th>Sev.</th><th class="num">$ impact</th><th>Mitigation</th><th>Deal-breaker</th><th>Status</th><th></th></tr></thead><tbody>
          ${deal.risks.map((r, i) => `<tr>
            <td><input data-r="${i}:name" value="${U.esc(r.name)}" style="width:170px;border:1px solid var(--line);border-radius:6px;padding:5px"></td>
            <td><select data-r="${i}:category" style="border:1px solid var(--line);border-radius:6px;padding:5px">${DV.RISK_CATEGORIES.map(c => `<option${r.category === c ? ' selected' : ''}>${c}</option>`).join('')}</select></td>
            <td><select data-r="${i}:probability" style="border:1px solid var(--line);border-radius:6px;padding:5px">${[1,2,3,4,5].map(v => `<option${r.probability === v ? ' selected' : ''}>${v}</option>`).join('')}</select></td>
            <td><select data-r="${i}:severity" style="border:1px solid var(--line);border-radius:6px;padding:5px">${[1,2,3,4,5].map(v => `<option${r.severity === v ? ' selected' : ''}>${v}</option>`).join('')}</select></td>
            <td class="num"><input data-r="${i}:impact" inputmode="decimal" value="${r.impact ?? ''}" style="width:84px;text-align:right;border:1px solid var(--line);border-radius:6px;padding:5px"></td>
            <td><input data-r="${i}:mitigation" value="${U.esc(r.mitigation || '')}" style="width:150px;border:1px solid var(--line);border-radius:6px;padding:5px"></td>
            <td style="text-align:center"><input type="checkbox" data-r="${i}:dealBreaker" ${r.dealBreaker ? 'checked' : ''}></td>
            <td><select data-r="${i}:status" style="border:1px solid var(--line);border-radius:6px;padding:5px">${['Open','Mitigating','Closed'].map(s => `<option${r.status === s ? ' selected' : ''}>${s}</option>`).join('')}</select></td>
            <td><button class="btn sm ghost" data-r-del="${i}">✕</button></td></tr>`).join('')}
          </tbody></table></div>` : '<div class="chart-empty">No risks logged — click “Suggest risks” to seed the register</div>';
        body.querySelector('#risk-add').onclick = () => { deal.risks.push({ id: U.uid(), name: '', category: 'Operational', probability: 3, severity: 3, impact: null, evidence: '', mitigation: '', dealBreaker: false, owner: 'Me', due: '', status: 'Open' }); DV.store.upsertDeal(deal); render(); };
        body.querySelector('#risk-suggest').onclick = () => {
          const have = new Set(deal.risks.map(r => r.name));
          const add = DV.score.suggestedRisks(deal).filter(r => !have.has(r.name));
          deal.risks.push(...add); DV.store.upsertDeal(deal); render();
          A().toast(add.length ? `Added ${add.length} suggested risks — now edit probabilities and mitigations` : 'All suggested risks already present');
        };
        list.querySelectorAll('[data-r]').forEach(inp => inp.addEventListener(inp.tagName === 'SELECT' || inp.type === 'checkbox' ? 'change' : 'input', () => {
          const [i, k] = inp.dataset.r.split(':');
          const r = deal.risks[+i];
          if (k === 'dealBreaker') r[k] = inp.checked;
          else if (['probability','severity'].includes(k)) r[k] = +inp.value;
          else if (k === 'impact') r[k] = C().N(inp.value);
          else r[k] = inp.value;
          DV.store.upsertDeal(deal);
          if (inp.tagName === 'SELECT' || inp.type === 'checkbox') render();
        }));
        list.querySelectorAll('[data-r-del]').forEach(b => b.onclick = () => { deal.risks.splice(+b.dataset.rDel, 1); DV.store.upsertDeal(deal); render(); });
      };
      render();
    },

    /* ---- Step: scenarios ---- */
    scenarios(body, deal) {
      const a = DV.store.assumptions();
      if (!deal.scenarios) deal.scenarios = JSON.parse(JSON.stringify(a.scenarioDefaults));
      const FIELDS = [['revGrowth', 'Revenue growth %/yr'], ['marginDelta', 'Margin shift (pts)'], ['payrollDelta', 'Payroll inflation %/yr'], ['rentDelta', 'Rent inflation %/yr'], ['exitMultDelta', 'Exit multiple shift (×)']];
      const render = () => {
        body.innerHTML = `
        <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><h3>Three futures</h3>
          <button class="btn sm" id="sc-reset">Reset to defaults</button></div>
          <div class="card-sub">Downside is the one that matters: a deal you can survive when it goes wrong is a deal you can do.</div>
          <div class="table-wrap"><table class="data"><thead><tr><th>Assumption</th><th style="color:var(--bad)">Downside</th><th>Base</th><th style="color:var(--good)">Upside</th></tr></thead><tbody>
          ${FIELDS.map(([k, label]) => `<tr><td>${label}</td>${['down', 'base', 'up'].map(s =>
            `<td><input data-sc="${s}:${k}" inputmode="decimal" value="${deal.scenarios[s][k] ?? ''}" style="width:80px;text-align:right;border:1px solid var(--line);border-radius:6px;padding:5px"></td>`).join('')}</tr>`).join('')}
          </tbody></table></div></div>
        <div id="sc-out"></div>`;
        body.querySelector('#sc-reset').onclick = () => { deal.scenarios = JSON.parse(JSON.stringify(a.scenarioDefaults)); DV.store.upsertDeal(deal); render(); };
        body.querySelectorAll('[data-sc]').forEach(inp => inp.addEventListener('input', () => {
          const [s, k] = inp.dataset.sc.split(':');
          deal.scenarios[s][k] = C().N(inp.value);
          DV.store.upsertDeal(deal); out();
        }));
        out();
      };
      const out = () => {
        const el = body.querySelector('#sc-out');
        const sc = safeAnalyze(deal);
        if (!sc || !sc.res.ok) { el.innerHTML = '<div class="chart-empty">Enter earnings + price first — scenarios need a base to move</div>'; return; }
        const r = sc.res;
        const row = (label, f, fmt) => `<tr><td>${label}</td><td class="num" style="color:var(--bad)">${fmt(f(r.down))}</td><td class="num"><b>${fmt(f(r.base))}</b></td><td class="num" style="color:var(--good)">${fmt(f(r.up))}</td></tr>`;
        el.innerHTML = `<div class="card"><h3>What each future pays you</h3>
          <div class="table-wrap"><table class="data"><thead><tr><th></th><th class="num">Downside</th><th class="num">Base</th><th class="num">Upside</th></tr></thead><tbody>
          ${row('Year-1 free cash flow (after debt)', s => s.fcfY1, v => U.money(v, {compact:true}))}
          ${row('DSCR', s => s.dscrY1, v => U.ratio(v))}
          ${row('Cash-on-cash', s => s.cocY1, v => U.pct(v))}
          ${row('Payback', s => s.payback, v => U.yrs(v))}
          ${row(`IRR (${DV.store.assumptions().holdYears}-yr)`, s => s.irr, v => U.pct(v))}
          ${row('Exit value', s => s.exitValue, v => U.money(v, {compact:true}))}
          ${row('Default risk', s => s.defaultRisk, v => v)}
          </tbody></table></div>
          ${r.down.fcfY1 < 0 ? `<div class="callout bad"><b>The downside case goes cash-flow negative.</b> You'd feed the business ${U.money(Math.abs(r.down.fcfY1), {compact:true})}/yr from savings. This caps the Deal Score until price or structure fixes it.</div>` : '<div class="callout good">The downside case still covers its debt — that\'s the shape of a survivable deal.</div>'}
        </div>
        <div class="card"><h3>Stress tests</h3><div class="card-sub">Each test asks: does the deal still cover its debt (DSCR ≥ 1.0)?</div>
          <div class="table-wrap"><table class="data"><thead><tr><th>Shock</th><th class="num">DSCR</th><th class="num">Cash-on-cash</th><th class="num">Free cash flow</th><th>Survives?</th></tr></thead><tbody>
          ${r.stress.map(s => `<tr><td>${U.esc(s.label)}</td><td class="num">${U.ratio(s.dscr)}</td><td class="num">${U.pct(s.coc)}</td><td class="num ${s.fcf < 0 ? 'neg' : ''}">${U.money(s.fcf, {compact:true})}</td>
            <td>${s.survives ? '<span class="badge v-good">Survives</span>' : '<span class="badge v-avoid">Breaks</span>'}</td></tr>`).join('')}</tbody></table></div></div>`;
      };
      render();
    },

    /* ---- Step: review ---- */
    review(body, deal) {
      const sc = safeAnalyze(deal);
      if (!sc || !sc.res.ok) {
        body.innerHTML = `<div class="card"><h3>Not enough data to score</h3>
          <p style="font-size:14px;color:var(--ink-2);margin:8px 0">A score needs at minimum: <b>a price</b> (asking or proposed) and <b>earnings</b> (SDE from financials, or the seller's stated cash flow). Go back and fill those in — everything else refines the answer, those two create it.</p></div>`;
        return;
      }
      const quickCaveat = deal.mode === 'quick' ? `<div class="callout warn"><b>Preliminary score from unverified, seller-claimed numbers.</b> Before trusting it: run the Full Underwriting (financial history, add-backs, operations, lease, risks). You can upgrade this deal from its analysis page.</div>` : '';
      body.innerHTML = `${quickCaveat}
        <div class="verdict-card"><div class="verdict-grid">
          <div style="--score:${scoreColor(sc.finalScore)}">${DV.charts.gauge(sc.finalScore)}</div>
          <div>
            <span class="badge ${sc.verdict.cls}" style="font-size:14px;padding:6px 16px">${sc.verdict.label}</span>
            <span class="badge dim" style="margin-left:6px">Confidence: ${sc.confidence.level}</span>
            ${sc.capped ? `<div class="callout bad" style="margin-top:10px"><b>Score capped by deal-breakers</b> (would otherwise be ${sc.rawScore}): ${sc.breakers.map(b => U.esc(b.label)).join(' · ')}</div>` : ''}
            <div class="verdict-kpis" style="margin-top:12px">
              <div class="vk"><div class="k-label">Normalized SDE</div><div class="k-value">${U.money(sc.res.norm.normalizedSDE, {compact:true})}</div></div>
              <div class="vk"><div class="k-label">Price / SDE</div><div class="k-value">${U.ratio(sc.res.multiples.priceToSDE)}</div></div>
              <div class="vk"><div class="k-label">Cash required</div><div class="k-value">${U.money(sc.res.fin.cashRequired, {compact:true})}</div></div>
              <div class="vk"><div class="k-label">DSCR</div><div class="k-value">${U.ratio(sc.res.base.dscrY1)}</div></div>
              <div class="vk"><div class="k-label">Cash-on-cash</div><div class="k-value">${U.pct(sc.res.base.cocY1)}</div></div>
            </div>
          </div></div></div>
        ${sc.missing.length ? `<div class="card"><h3>Missing information (${sc.missing.length})</h3>
          <div class="card-sub">The score treats unknowns as neutral — filling these in makes it honest, not necessarily better.</div>
          <ul class="tight">${sc.missing.slice(0, 10).map(m => `<li>${U.esc(m)}</li>`).join('')}</ul></div>` : ''}
        <div class="callout">Click <b>“Open full analysis”</b> below for the complete verdict: category breakdown, scenario charts, offer builder, “Make This Deal Work,” due-diligence checklist and the printable report.</div>`;
    }
  };

  /* ---------- helpers ---------- */
  const kpi = (label, value, cls = '') => `<div class="kpi ${cls}"><div class="k-label">${label}</div><div class="k-value">${value}</div></div>`;
  const scoreColor = s => s >= 65 ? 'var(--good)' : s >= 45 ? 'var(--warn)' : 'var(--bad)';
  function safeAnalyze(deal) { try { return DV.score.analyze(DV.store.deal(deal.id) || deal); } catch (e) { console.error(e); return null; } }
  function showExtract(out, deal, fields, body) {
    const keys = Object.keys(fields);
    if (!keys.length) { out.innerHTML = '<div class="callout warn">Couldn\'t recognize any fields in that text. Enter them manually in the next step — takes two minutes.</div>'; return; }
    const LBL = { askingPrice: 'Asking price', sellerRevenue: 'Revenue', sellerCashFlow: 'Cash flow / SDE', sellerEBITDA: 'EBITDA', yearEstablished: 'Established', employees: 'Employees', city: 'City', state: 'State', inventoryValue: 'Inventory', listingTitle: 'Listing title', rent: 'Rent (monthly?)' };
    out.innerHTML = `<div class="card" style="margin:0"><h3>Found ${keys.length} field(s) — confirm before importing</h3>
      <table class="data"><tbody>${keys.map(k => `<tr><td><input type="checkbox" checked data-imp="${k}"></td><td>${LBL[k] || k}</td>
        <td class="num"><b>${typeof fields[k] === 'number' && fields[k] > 1000 ? U.money(fields[k]) : U.esc(fields[k])}</b></td>
        <td><span class="src-chip src-imported">Imported</span></td></tr>`).join('')}</tbody></table>
      <button class="btn primary" style="margin-top:12px" id="apply-imp">Import selected</button>
      <div class="hint" style="margin-top:8px">Imported values are labeled and treated as unverified until you confirm them against documents.</div></div>`;
    out.querySelector('#apply-imp').onclick = () => {
      let n = 0;
      out.querySelectorAll('[data-imp]:checked').forEach(cb => {
        const k = cb.dataset.imp; n++;
        if (k === 'rent') { deal.lease.monthlyRent = fields[k]; deal.fieldSources['lease.monthlyRent'] = 'imported'; }
        else { deal.basics[k] = fields[k]; deal.fieldSources['basics.' + k] = 'imported'; }
      });
      if (!deal.basics.name && deal.basics.listingTitle) deal.basics.name = deal.basics.listingTitle.slice(0, 60);
      DV.store.upsertDeal(deal);
      A().toast(`Imported ${n} field(s) — labeled "Listing Imported"`);
    };
  }
})();
