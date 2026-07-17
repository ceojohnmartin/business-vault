/* ============================================================
   Deal Vault — views/deal.js
   The deal analysis page (verdict, categories, charts, offer
   builder, Make This Deal Work, due diligence, notes/tasks)
   and the printable acquisition report.
   ============================================================ */
window.DV = window.DV || {};
DV.views = DV.views || {};

(() => {
  const U = DV.util, A = () => DV.app, C = () => DV.calc;
  const kpi = (label, value, cls = '', note = '') => `<div class="kpi ${cls}"><div class="k-label">${label}</div><div class="k-value">${value}</div>${note ? `<div class="k-note">${note}</div>` : ''}</div>`;
  const scoreColor = s => s >= 65 ? 'var(--good)' : s >= 45 ? 'var(--warn)' : 'var(--bad)';

  DV.views.deal = { render(main, args) {
    const deal = DV.store.deal(args[0]);
    if (!deal) { main.innerHTML = '<div class="empty">Deal not found.</div>'; return; }
    let sc;
    try { sc = DV.score.analyze(deal); } catch (e) { console.error(e); main.innerHTML = `<div class="card">Analysis error: ${U.esc(e.message)}</div>`; return; }
    const r = sc.res, b = deal.basics;
    const loc = [b.city, b.state].filter(Boolean).join(', ');

    main.innerHTML = `
      <div class="page-head"><div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <h1>${U.esc(b.name || 'Untitled deal')}</h1>
          ${deal.isDemo ? '<span class="demo-tag">FICTIONAL DEMO</span>' : ''}
          ${deal.mode === 'quick' ? '<span class="badge dim">Quick analysis — preliminary</span>' : ''}</div>
        <div class="sub">${U.esc(sc.ind.label)}${loc ? ' · ' + U.esc(loc) : ''}${b.yearEstablished ? ' · est. ' + b.yearEstablished : ''} · asking ${U.money(b.askingPrice, {compact:true})}</div></div>
        <div class="head-actions">
          <select id="stage-sel" style="border:1px solid var(--line-2);border-radius:9px;padding:8px 10px;background:var(--panel);font-weight:600;font-size:13px">
            ${DV.STAGES.map(s => `<option${deal.stage === s ? ' selected' : ''}>${s}</option>`).join('')}</select>
          <button class="btn" id="edit-deal">${deal.mode === 'quick' ? 'Upgrade to full underwriting' : 'Edit underwriting'}</button>
          <button class="btn gold" onclick="DV.app.navigate('report/${deal.id}')">Report / PDF</button>
        </div></div>
      ${!r.ok ? `<div class="callout warn"><b>Not enough data to fully analyze.</b> The engine needs a price and earnings. Open the underwriting to complete it.</div>` : verdictCard(deal, sc)}
      <div class="grid g23">
        <div class="card"><h3>Deal-strength radar</h3>
          <div style="display:flex;justify-content:center">${DV.charts.radar(Object.values(sc.cats).map(c => ({ label: c.label.split(' ')[0].replace(',', ''), value: c.score })))}</div></div>
        <div class="card"><h3>Category scores <span class="tip" title="Weighted by the percentages set in Assumptions. Unknown categories score as neutral (50) and are listed under missing information.">?</span></h3>
          ${Object.values(sc.cats).map(c => DV.charts.meter(c.score, `${c.label} · ${c.w}%`)).join('')}</div>
      </div>
      ${r.ok ? mainCharts(deal, sc) : ''}
      ${r.ok && sc.recommendation ? recommendationCard(deal, sc) : ''}
      ${r.ok ? leversCard(deal, sc) : ''}
      ${r.ok && sc.offer ? offerCard(deal, sc) : ''}
      ${whyCard(sc)}
      ${risksCard(deal, sc)}
      ${ddCard(deal)}
      ${notesCard(deal)}
      <div class="card no-print"><h3>Deal management</h3><div style="display:flex;gap:9px;flex-wrap:wrap">
        <button class="btn" id="d-watch">${deal.watch.onWatchlist ? '★ On watchlist — remove' : '☆ Add to watchlist'}</button>
        <button class="btn" id="d-dup">Duplicate</button>
        <button class="btn" id="d-arch">${deal.archived ? 'Unarchive' : 'Archive'}</button>
        <button class="btn danger" id="d-del">Delete</button></div></div>`;

    /* wire header */
    main.querySelector('#stage-sel').onchange = e => { deal.stage = e.target.value; DV.store.upsertDeal(deal); A().toast('Stage → ' + deal.stage); };
    main.querySelector('#edit-deal').onclick = () => {
      if (deal.mode === 'quick') { deal.mode = 'full'; DV.store.upsertDeal(deal); }
      A().navigate(`wizard/${deal.id}/0`);
    };
    main.querySelector('#d-watch').onclick = () => { deal.watch.onWatchlist = !deal.watch.onWatchlist;
      if (deal.watch.onWatchlist && !deal.watch.priceHistory.length && C().N(b.askingPrice) !== null) deal.watch.priceHistory.push({ ts: Date.now(), price: C().N(b.askingPrice) });
      DV.store.upsertDeal(deal); DV.views.deal.render(main, args); };
    main.querySelector('#d-dup').onclick = () => {
      const copy = JSON.parse(JSON.stringify(deal));
      copy.id = U.uid(); copy.basics.name = (b.name || 'Deal') + ' (copy)'; copy.isDemo = false; copy.createdAt = Date.now();
      DV.store.upsertDeal(copy); A().navigate('deal/' + copy.id);
    };
    main.querySelector('#d-arch').onclick = () => { deal.archived = !deal.archived; DV.store.upsertDeal(deal); A().navigate('deals'); };
    main.querySelector('#d-del').onclick = () => A().confirmBox('Delete this deal?', 'This permanently removes the deal and its analysis. There is no undo (unless you exported a backup).', 'Delete', () => { DV.store.removeDeal(deal.id); A().navigate('deals'); }, true);
    wireInteractive(main, deal, sc);
  }};

  /* ---------- verdict card ---------- */
  function verdictCard(deal, sc) {
    const r = sc.res, rec = sc.recommendation;
    return `<div class="verdict-card"><div class="verdict-grid">
      <div style="--score:${scoreColor(sc.finalScore)}">${DV.charts.gauge(sc.finalScore)}</div>
      <div>
        <div class="verdict-meta">
          <span class="badge ${sc.verdict.cls}" style="font-size:14px;padding:6px 16px">${sc.verdict.label}</span>
          <span class="badge dim" title="${sc.confidence.notes.map(U.esc).join(' · ')}">Data confidence: ${sc.confidence.level} (${sc.confidence.score})</span>
          <span class="badge ${sc.risk.score >= 60 ? 'v-avoid' : sc.risk.score >= 40 ? 'v-fair' : 'v-good'}">Risk ${sc.risk.score}/100</span>
          ${sc.locationScore !== null ? `<span class="badge neutral">Location ${sc.locationScore}/100</span>` : ''}</div>
        ${sc.capped ? `<div class="callout bad" style="margin:4px 0 10px"><b>Deal-breakers cap this score</b> (raw weighted score: ${sc.rawScore}) — see “Deal-breakers” below.</div>` : ''}
        ${sc.confidence.score < 45 && sc.finalScore >= 65 ? `<div class="callout warn" style="margin:4px 0 10px"><b>High score, low verification.</b> This looks good on paper you haven't checked. Verify before believing.</div>` : ''}
        <div class="verdict-kpis">
          <div class="vk"><div class="k-label">Recommended max price</div><div class="k-value">${U.money(sc.offer?.maxPrice, {compact:true})}</div></div>
          <div class="vk"><div class="k-label">Cash required</div><div class="k-value">${U.money(r.fin.cashRequired, {compact:true})}</div></div>
          <div class="vk"><div class="k-label">Base cash flow (yr 1)</div><div class="k-value">${U.money(r.base?.fcfY1, {compact:true})}</div></div>
          <div class="vk"><div class="k-label">Downside cash flow</div><div class="k-value" style="${(r.down?.fcfY1 ?? 0) < 0 ? 'color:var(--bad)' : ''}">${U.money(r.down?.fcfY1, {compact:true})}</div></div>
          <div class="vk"><div class="k-label">Cash-on-cash</div><div class="k-value">${U.pct(r.base?.cocY1)}</div></div>
          <div class="vk"><div class="k-label">DSCR</div><div class="k-value">${U.ratio(r.base?.dscrY1)}</div></div>
          <div class="vk"><div class="k-label">Payback</div><div class="k-value">${U.yrs(r.base?.payback)}</div></div>
          <div class="vk"><div class="k-label">Next action</div><div class="k-value" style="font-size:14px">${U.esc(rec?.action || '—')}</div></div>
        </div></div></div></div>`;
  }

  /* ---------- charts row ---------- */
  function mainCharts(deal, sc) {
    const r = sc.res, h = r.history;
    const histChart = h.rows.length ? DV.charts.lines([
      { label: 'Revenue', color: 'var(--acc)', points: h.rows.map(x => ({ x: x.year, y: x.revenue })) },
      { label: 'SDE', color: 'var(--gold)', points: h.rows.map(x => ({ x: x.year, y: x.sde })), bars: true }
    ]) : '<div class="chart-empty">No historical financials entered</div>';
    const s = deal.structure;
    const donut = DV.charts.donut([
      { label: 'Your cash', value: r.fin.down, color: 'var(--gold)' },
      { label: 'SBA loan', value: C().n0(s.sbaAmount), color: 'var(--acc)' },
      { label: 'Bank loan', value: C().n0(s.bankAmount), color: '#5e81ac' },
      { label: 'Seller note', value: C().n0(s.sellerAmount), color: 'var(--good)' },
      { label: 'Investor equity', value: C().n0(s.investorEquity), color: '#9a6fb8' }
    ], 'Sources', U.money(r.fin.sources, { compact: true }));
    const scen = DV.charts.hbars([
      { label: 'Downside FCF (yr 1)', value: r.down.fcfY1, color: 'var(--bad)' },
      { label: 'Base FCF (yr 1)', value: r.base.fcfY1, color: 'var(--acc)' },
      { label: 'Upside FCF (yr 1)', value: r.up.fcfY1, color: 'var(--good)' }
    ]);
    return `<div class="grid g2">
      <div class="card"><h3>Financial history</h3>${histChart}</div>
      <div class="card"><h3>Financing structure</h3>${donut}
        <div style="margin-top:10px;font-size:13px;color:var(--ink-2)">Annual debt service <b>${U.money(r.fin.annualDS[0], {compact:true})}</b> · total interest over life ≈ <b>${U.money(r.fin.totalInterest, {compact:true})}</b> · LTV ${U.pct(r.fin.ltvPct, 0)}</div></div>
      <div class="card"><h3>Scenario cash flows</h3>${scen}
        <div style="margin-top:8px;font-size:12.5px;color:var(--ink-3)">Break-even revenue ≈ ${U.money(r.breakEven.revenue, {compact:true})}${r.breakEven.cushionPct !== null ? ` — a ${U.pct(r.breakEven.cushionPct, 0)} cushion below current revenue` : ''}</div></div>
      <div class="card"><h3>Returns anatomy (base case, ${DV.store.assumptions().holdYears}-yr hold) <span class="tip" title="Separates what you EARN as a worker from what your MONEY earns. A deal is only an investment if the pile on the right exists after paying a manager.">?</span></h3>
        ${DV.charts.hbars([
          { label: 'Job: manager salary you could pay yourself', value: r.norm.managerSalary, color: 'var(--ink-3)' },
          { label: 'Investment: FCF after debt (EBITDA basis)', value: r.base.fcfY1, color: 'var(--acc)' },
          { label: 'Equity built by loan paydown (total)', value: r.base.equityBuildup, color: 'var(--good)' },
          { label: 'Exit proceeds (after debt & costs)', value: r.base.exitProceeds, color: 'var(--gold)' }
        ])}
        <div style="margin-top:8px;font-size:12.5px;color:var(--ink-2)">IRR ${U.pct(r.base.irr)} · NPV @ ${DV.store.assumptions().discountRate}%: ${U.money(r.base.npv, {compact:true})} · est. value in 3/5/10 yrs: ${U.money(r.base.valueAt(3), {compact:true})} / ${U.money(r.base.valueAt(5), {compact:true})} / ${U.money(r.base.valueAt(10), {compact:true})}</div></div>
    </div>`;
  }

  /* ---------- recommendation ---------- */
  function recommendationCard(deal, sc) {
    const rec = sc.recommendation, r = sc.res;
    const qa = [
      ['Is this business worth buying?', rec.worthBuying],
      ['Strongest reason to buy', rec.strongestFor],
      ['Strongest reason to walk', rec.strongestAgainst],
      ['Reasonable valuation', U.money(rec.fairValue, {compact:true}) + ' (quality-adjusted fair multiple)'],
      ['Maximum price to pay', U.money(rec.maxPrice, {compact:true})],
      ['Ideal offer', U.money(rec.idealOffer, {compact:true})],
      ['Cash you\'ll need', U.money(rec.cashNeeded, {compact:true})],
      ['Safest financing structure', rec.safestStructure],
      ['Realistic annual earnings (as investor)', U.money(rec.realisticEarn, {compact:true}) + ' after debt & a ' + U.money(rec.mgrSalary, {compact:true}) + ' manager'],
      ['If you run it yourself', U.money(rec.ownerEarn, {compact:true}) + ' — but ' + U.money(rec.mgrSalary, {compact:true}) + ' of that is a job, not a return'],
      ['Can it afford a manager?', rec.canAffordManager ? 'Yes — it clears a market-rate manager salary.' : 'No — after a market-rate manager there is nothing left. You are buying a job.'],
      ['In a downturn', (rec.downside ?? 0) >= 0 ? `Still cash-positive: ${U.money(rec.downside, {compact:true})}/yr in the downside case.` : `Cash-negative by ${U.money(Math.abs(rec.downside), {compact:true})}/yr — you must be able to survive that.`],
      ['Time to recover your cash', U.yrs(rec.payback)],
      ['What could destroy this deal', rec.couldKill.length ? rec.couldKill.join(' · ') : 'No dominant risk identified yet — that usually means more digging needed.']
    ];
    return `<div class="card"><h3>The verdict, in plain English</h3>
      <div class="table-wrap"><table class="data"><tbody>${qa.map(([q, a2]) => `<tr><td style="width:280px;font-weight:600">${q}</td><td>${a2}</td></tr>`).join('')}</tbody></table></div>
      <div class="grid g2" style="margin-top:14px">
        <div><b style="font-size:13.5px">Verify before any offer</b><ul class="tight" style="margin-top:6px">${rec.verifyFirst.map(v => `<li>${U.esc(v)}</li>`).join('')}</ul></div>
        <div><b style="font-size:13.5px">Negotiate for</b><ul class="tight" style="margin-top:6px">${rec.negotiate.map(v => `<li>${U.esc(v)}</li>`).join('')}</ul></div></div>
      <div class="callout ${sc.finalScore >= 65 ? 'good' : sc.finalScore >= 55 ? 'warn' : 'bad'}" style="margin-top:8px"><b>Recommended action: ${U.esc(rec.action)}</b></div></div>`;
  }

  /* ---------- Make This Deal Work ---------- */
  function leversCard(deal, sc) {
    return `<div class="card" id="levers-card"><h3>Make This Deal Work</h3>
      <div class="card-sub">Each lever is recomputed through the full engine — these are the exact numerical effects, not estimates.</div>
      <button class="btn primary no-print" id="run-levers">Compute improvement levers</button>
      <div id="levers-out" style="margin-top:12px"></div></div>`;
  }

  /* ---------- offer builder ---------- */
  function offerCard(deal, sc) {
    const o = sc.offer;
    return `<div class="card"><h3>Offer builder</h3>
      <div class="grid g4" style="margin-bottom:14px">
        ${kpi('Open at', U.money(o.initialOffer, {compact:true}))}
        ${kpi('Target price', U.money(o.idealOffer, {compact:true}))}
        ${kpi('Walk-away (max)', U.money(o.walkAway, {compact:true}))}
        ${kpi('Vs. asking', o.asking ? U.pct((o.idealOffer / o.asking - 1) * 100, 0) : '—', '', o.asking ? 'target vs ' + U.money(o.asking, {compact:true}) : '')}</div>
      <div class="table-wrap"><table class="data"><tbody>
        <tr><td style="width:280px;font-weight:600">Down payment</td><td>${o.terms.downPaymentPct}% of price (SBA minimum territory)</td></tr>
        <tr><td style="font-weight:600">Seller note</td><td>≥ ${o.terms.sellerNotePct}% of price — patient capital and the seller's skin in the game</td></tr>
        ${o.terms.earnout ? `<tr><td style="font-weight:600">Earnout</td><td>${U.money(o.terms.earnout, {compact:true})} contingent on revenue holding — bridges the price gap without your cash</td></tr>` : ''}
        <tr><td style="font-weight:600">Holdback</td><td>${o.terms.holdbackPct}% held in escrow for 12 months against surprises</td></tr>
        <tr><td style="font-weight:600">Training / transition</td><td>${o.terms.trainingWeeks} weeks, included in price</td></tr>
        <tr><td style="font-weight:600">Non-compete</td><td>${U.esc(o.terms.noncompete)}</td></tr>
        <tr><td style="font-weight:600">Working capital</td><td>Delivered at normal level (~${U.money(o.terms.workingCapitalTarget, {compact:true})})</td></tr>
        <tr><td style="font-weight:600">Inventory</td><td>${o.terms.inventoryIncluded ? 'Included in price at agreed count' : 'Purchased separately at cost, counted at closing'}</td></tr>
        <tr><td style="font-weight:600">Contingencies</td><td>${o.terms.contingencies.join(' · ')}</td></tr>
      </tbody></table></div>
      <div style="display:flex;gap:9px;margin-top:12px" class="no-print"><button class="btn gold" onclick="DV.app.navigate('report/${deal.id}/loi')">LOI preparation sheet (print)</button></div>
      <div class="hint" style="margin-top:8px">This is negotiation preparation, not a legal document. Have an attorney draft the actual LOI/APA.</div></div>`;
  }

  /* ---------- why this score ---------- */
  function whyCard(sc) {
    return `<details class="sect"><summary>Why this score — category by category</summary><div class="sect-body">
      ${sc.breakers.length ? `<div class="callout bad"><b>Deal-breakers (cap the score at ${Math.min(...sc.breakers.map(x => x.cap))})</b><ul class="tight" style="margin-top:6px">${sc.breakers.map(b2 => `<li><b>${U.esc(b2.label)}.</b> ${U.esc(b2.detail)}</li>`).join('')}</ul></div>` : ''}
      ${Object.values(sc.cats).map(c => `<div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><b>${c.label}</b><span style="font-family:var(--font-m);font-weight:700;color:${c.score === null ? 'var(--ink-3)' : scoreColor(c.score)}">${c.score === null ? 'no data' : c.score + ' / 100'} · weight ${c.w}%</span></div>
        ${c.notes.length ? `<ul class="tight" style="margin-top:4px">${c.notes.map(n => `<li>${U.esc(n)}</li>`).join('')}</ul>` : ''}
        ${c.missing.length ? `<div class="hint">Missing: ${c.missing.map(U.esc).join('; ')}</div>` : ''}</div>`).join('')}
      <div class="grid g2">
        <div>${sc.strengths.length ? `<b style="color:var(--good)">Strengths</b><ul class="tight" style="margin-top:6px">${sc.strengths.map(s => `<li>${U.esc(s)}</li>`).join('')}</ul>` : ''}</div>
        <div>${sc.weaknesses.length ? `<b style="color:var(--bad)">Weaknesses</b><ul class="tight" style="margin-top:6px">${sc.weaknesses.map(s => `<li>${U.esc(s)}</li>`).join('')}</ul>` : ''}</div></div>
      </div></details>`;
  }

  /* ---------- risks ---------- */
  function risksCard(deal, sc) {
    const open = deal.risks.filter(r => r.status !== 'Closed');
    return `<details class="sect"><summary>Risk register (${open.length} open · score ${sc.risk.score}/100)</summary><div class="sect-body">
      ${sc.risk.drivers.length ? `<div class="callout bad"><b>Top ways this deal fails:</b> ${sc.risk.drivers.map(U.esc).join(' · ')}</div>` : ''}
      <div class="grid g23"><div>${open.length ? `<table class="data"><thead><tr><th>Risk</th><th>Cat.</th><th>P×S</th><th>Status</th></tr></thead><tbody>
        ${open.sort((a, b2) => b2.probability * b2.severity - a.probability * a.severity).map(r => `<tr><td>${U.esc(r.name)}${r.dealBreaker ? ' <span class="badge v-avoid" style="font-size:9.5px">DEAL-BREAKER</span>' : ''}</td><td>${r.category}</td><td>${r.probability}×${r.severity}</td><td>${r.status}</td></tr>`).join('')}</tbody></table>` : '<div class="chart-empty">No open risks logged</div>'}
        <button class="btn sm no-print" style="margin-top:10px" onclick="DV.app.navigate('wizard/${deal.id}/${deal.mode === 'quick' ? 0 : 9}')">Edit risk register</button></div>
      <div>${DV.charts.heatmap(deal.risks)}</div></div></div></details>`;
  }

  /* ---------- due diligence ---------- */
  function ddCard(deal) {
    if (!deal.dd.length) return `<details class="sect"><summary>Due-diligence checklist</summary><div class="sect-body">
      <button class="btn primary" id="dd-gen">Generate checklist for this deal</button></div></details>`;
    const groups = [...new Set(deal.dd.map(i => i.group))];
    const done = deal.dd.filter(i => ['Reviewed', 'Cleared', 'Not Applicable'].includes(i.status)).length;
    const issues = deal.dd.filter(i => i.status === 'Issue Found').length;
    return `<details class="sect"><summary>Due-diligence checklist (${done}/${deal.dd.length} done${issues ? ` · <span style="color:var(--bad)">${issues} issues</span>` : ''})</summary><div class="sect-body">
      ${groups.map(g => `<div style="margin-bottom:12px"><b style="font-size:13px;text-transform:uppercase;letter-spacing:.6px;color:var(--ink-3)">${g}</b>
        ${deal.dd.filter(i => i.group === g).map(i => `<div style="display:flex;gap:10px;align-items:center;padding:5px 0;border-bottom:1px dashed var(--line)">
          <span style="flex:1;font-size:13.5px">${U.esc(i.label)}</span>
          <select data-dd="${i.id}" style="border:1px solid var(--line);border-radius:6px;padding:4px 6px;font-size:12px;background:${i.status === 'Issue Found' ? 'var(--bad-soft)' : ['Reviewed','Cleared'].includes(i.status) ? 'var(--good-soft)' : 'var(--panel)'}">
            ${DV.DD_STATUSES.map(s => `<option${i.status === s ? ' selected' : ''}>${s}</option>`).join('')}</select></div>`).join('')}</div>`).join('')}
      <button class="btn sm no-print" id="dd-regen">Regenerate (keeps statuses)</button></div></details>`;
  }

  /* ---------- notes & tasks ---------- */
  function notesCard(deal) {
    return `<details class="sect"><summary>Notes, tasks & seller communication (${deal.notes.length + deal.tasks.length})</summary><div class="sect-body">
      <div class="grid g2"><div><b style="font-size:13.5px">Notes</b>
        <div style="display:flex;gap:8px;margin:8px 0"><input id="note-in" placeholder="Log a call, a fact, a doubt…" style="flex:1;border:1px solid var(--line-2);border-radius:8px;padding:8px"><button class="btn sm primary" id="note-add">Add</button></div>
        ${deal.notes.slice().reverse().map(n => `<div style="padding:7px 0;border-bottom:1px dashed var(--line);font-size:13.5px">${U.esc(n.text)}<div class="hint">${U.dateStr(n.ts)}</div></div>`).join('') || '<div class="hint">No notes yet.</div>'}</div>
      <div><b style="font-size:13.5px">Next actions</b>
        <div style="display:flex;gap:8px;margin:8px 0"><input id="task-in" placeholder="e.g. Request 2023 tax return" style="flex:1;border:1px solid var(--line-2);border-radius:8px;padding:8px"><button class="btn sm primary" id="task-add">Add</button></div>
        ${deal.tasks.map((t, i) => `<label style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px dashed var(--line);font-size:13.5px;${t.done ? 'opacity:.5;text-decoration:line-through' : ''}">
          <input type="checkbox" data-task="${i}" ${t.done ? 'checked' : ''}><span style="flex:1">${U.esc(t.text)}</span></label>`).join('') || '<div class="hint">No tasks yet.</div>'}</div></div></div></details>`;
  }

  /* ---------- interactivity ---------- */
  function wireInteractive(main, deal, sc) {
    const lv = main.querySelector('#run-levers');
    if (lv) lv.onclick = () => {
      lv.disabled = true; lv.textContent = 'Computing…';
      setTimeout(() => {
        const levers = DV.score.levers(deal, sc);
        const out = main.querySelector('#levers-out');
        out.innerHTML = levers.length ? `<div class="table-wrap"><table class="data"><thead><tr>
          <th>Change</th><th class="num">Score</th><th class="num">Cash needed</th><th class="num">Cash-on-cash</th><th class="num">DSCR</th><th class="num">Yr-1 FCF</th><th class="num">Payback</th></tr></thead><tbody>
          ${levers.map(l => { const d2 = l.delta, af = l.after;
            const cell = (v, dv, fmt, invert) => `<td class="num">${fmt(v)} <span style="font-size:11px;color:${dv === null || dv === 0 ? 'var(--ink-3)' : (dv > 0) !== !!invert ? 'var(--good)' : 'var(--bad)'}">${dv === null ? '' : (dv > 0 ? '+' : '−') + fmt(Math.abs(dv)).replace('$', '$')}</span></td>`;
            return `<tr><td><b>${U.esc(l.label)}</b><div class="hint">${U.esc(l.detail)}</div></td>
              ${cell(af.score, d2.score, v => String(Math.round(v)))}
              ${cell(af.cash, d2.cash, v => U.money(v, {compact:true}), true)}
              ${cell(af.coc, d2.coc, v => U.pct(v))}
              ${cell(af.dscr, d2.dscr, v => U.ratio(v))}
              ${cell(af.fcf, d2.fcf, v => U.money(v, {compact:true}))}
              ${cell(af.payback, d2.payback, v => U.yrs(v), true)}</tr>`; }).join('')}
          </tbody></table></div>` : '<div class="callout good">No levers found that materially improve this deal — it\'s either already structured well, or fundamentally broken by price.</div>';
        lv.remove();
      }, 30);
    };
    const ddGen = main.querySelector('#dd-gen');
    if (ddGen) ddGen.onclick = () => { deal.dd = DV.ddGenerate(deal); DV.store.upsertDeal(deal); DV.views.deal.render(main.parentElement ? main : document.getElementById('main'), [deal.id]); };
    const ddRe = main.querySelector('#dd-regen');
    if (ddRe) ddRe.onclick = () => {
      const old = Object.fromEntries(deal.dd.map(i => [i.group + '|' + i.label, i.status]));
      deal.dd = DV.ddGenerate(deal).map(i => ({ ...i, status: old[i.group + '|' + i.label] || i.status }));
      DV.store.upsertDeal(deal); A().toast('Checklist refreshed');
      DV.views.deal.render(document.getElementById('main'), [deal.id]);
    };
    main.querySelectorAll('[data-dd]').forEach(sel => sel.onchange = () => {
      const item = deal.dd.find(i => i.id === sel.dataset.dd);
      if (item) { item.status = sel.value; DV.store.upsertDeal(deal); }
      sel.style.background = sel.value === 'Issue Found' ? 'var(--bad-soft)' : ['Reviewed','Cleared'].includes(sel.value) ? 'var(--good-soft)' : 'var(--panel)';
    });
    const noteAdd = main.querySelector('#note-add');
    if (noteAdd) noteAdd.onclick = () => {
      const inp = main.querySelector('#note-in');
      if (inp.value.trim()) { deal.notes.push({ ts: Date.now(), text: inp.value.trim() }); DV.store.upsertDeal(deal); DV.views.deal.render(document.getElementById('main'), [deal.id]); }
    };
    const taskAdd = main.querySelector('#task-add');
    if (taskAdd) taskAdd.onclick = () => {
      const inp = main.querySelector('#task-in');
      if (inp.value.trim()) { deal.tasks.push({ id: U.uid(), text: inp.value.trim(), done: false }); DV.store.upsertDeal(deal); DV.views.deal.render(document.getElementById('main'), [deal.id]); }
    };
    main.querySelectorAll('[data-task]').forEach(cb => cb.onchange = () => { deal.tasks[+cb.dataset.task].done = cb.checked; DV.store.upsertDeal(deal); });
  }

  /* ============================================================
     Printable report (and LOI prep sheet): #/report/{id}[/loi]
     ============================================================ */
  DV.views.report = { render(main, args) {
    const deal = DV.store.deal(args[0]);
    if (!deal) { main.innerHTML = '<div class="empty">Deal not found.</div>'; return; }
    const sc = DV.score.analyze(deal);
    const r = sc.res, b = deal.basics, rec = sc.recommendation, o = sc.offer;
    const loiOnly = args[1] === 'loi';
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const head = `
      <div class="page-head no-print"><div><h1>${loiOnly ? 'LOI preparation sheet' : 'Acquisition report'}</h1>
        <div class="sub">Print to PDF with the button — the layout is print-optimized.</div></div>
        <div class="head-actions"><button class="btn" onclick="DV.app.navigate('deal/${deal.id}')">← Back to deal</button>
        <button class="btn gold" onclick="window.print()">Print / save PDF</button>
        ${loiOnly ? '' : `<button class="btn" id="csv-exp">Export financials CSV</button>`}</div></div>
      <div class="card report-cover"><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
        <div><div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--ink-3)">Deal Vault · ${loiOnly ? 'Negotiation preparation' : 'Confidential acquisition analysis'}</div>
        <h1 style="margin:6px 0 2px">${U.esc(b.name || 'Untitled deal')} ${deal.isDemo ? '<span class="demo-tag">FICTIONAL DEMO</span>' : ''}</h1>
        <div style="color:var(--ink-2)">${U.esc(sc.ind.label)}${b.city ? ' · ' + U.esc([b.city, b.state].filter(Boolean).join(', ')) : ''} · prepared ${today}</div></div>
        ${r.ok ? `<div style="text-align:center"><div style="--score:${scoreColor(sc.finalScore)}">${DV.charts.gauge(sc.finalScore, 120)}</div><span class="badge ${sc.verdict.cls}">${sc.verdict.label}</span></div>` : ''}</div></div>`;
    if (loiOnly && o) {
      main.innerHTML = head + `
        <div class="card"><h3>Proposed terms (non-binding, for discussion)</h3>
        <table class="data"><tbody>
          <tr><td style="width:260px;font-weight:600">Purchase price (opening)</td><td>${U.money(o.initialOffer)}</td></tr>
          <tr><td style="font-weight:600">Target / walk-away</td><td>${U.money(o.idealOffer)} / ${U.money(o.walkAway)}</td></tr>
          <tr><td style="font-weight:600">Structure</td><td>${o.terms.downPaymentPct}% cash down · seller note ≥ ${o.terms.sellerNotePct}%${o.terms.earnout ? ' · earnout ' + U.money(o.terms.earnout, {compact:true}) : ''} · ${o.terms.holdbackPct}% holdback (12 mo)</td></tr>
          <tr><td style="font-weight:600">Transition</td><td>${o.terms.trainingWeeks} weeks seller training · non-compete ${U.esc(o.terms.noncompete)}</td></tr>
          <tr><td style="font-weight:600">Working capital & inventory</td><td>WC at normal level (~${U.money(o.terms.workingCapitalTarget, {compact:true})}) · inventory ${o.terms.inventoryIncluded ? 'included' : 'separate at cost'}</td></tr>
          <tr><td style="font-weight:600">Contingencies</td><td>${o.terms.contingencies.join('; ')}</td></tr>
        </tbody></table>
        <div class="callout warn" style="margin-top:14px">Prepared with Deal Vault as negotiation notes. <b>Not a legal document and not legal advice</b> — have an attorney draft the actual LOI.</div></div>`;
      return;
    }
    if (!r.ok) { main.innerHTML = head + '<div class="callout warn">Complete the underwriting (price + earnings) to generate the report.</div>'; return; }
    const h = r.history;
    main.innerHTML = head + `
      <div class="card"><h3>Executive summary</h3>
        <p style="font-size:14px;margin-bottom:10px">${U.esc(b.name || 'The business')} is a ${U.esc(sc.ind.label.toLowerCase())} ${b.yearEstablished ? 'established ' + b.yearEstablished : ''} ${b.city ? 'in ' + U.esc([b.city, b.state].filter(Boolean).join(', ')) : ''}, offered at ${U.money(b.askingPrice)}. Normalized SDE is ${U.money(r.norm.normalizedSDE)} (${U.ratio(r.multiples.priceToSDE)} multiple). The analysis scores it <b>${sc.finalScore}/100 — ${sc.verdict.label}</b> with ${sc.confidence.level.toLowerCase()} data confidence (${sc.confidence.score}/100).</p>
        <div class="grid g4">
          ${kpi('Verdict', sc.verdict.label)}
          ${kpi('Recommended action', U.esc(rec.action))}
          ${kpi('Max price', U.money(rec.maxPrice, {compact:true}))}
          ${kpi('Cash required', U.money(r.fin.cashRequired, {compact:true}))}</div></div>
      <div class="card"><h3>Business overview</h3><table class="data"><tbody>
        ${[['Industry', sc.ind.label + (b.subIndustry ? ' — ' + b.subIndustry : '')], ['Model', b.model], ['Established', b.yearEstablished], ['Location', [b.city, b.state].filter(Boolean).join(', ')], ['Employees', b.employees], ['Owner role', b.ownerInvolvement], ['Reason for selling', b.reasonForSelling], ['Includes', ['realEstateIncluded','inventoryIncluded','equipmentIncluded','vehiclesIncluded'].filter(k => b[k] === true).map(k => k.replace('Included', '')).join(', ') || '—'], ['Description', b.description]]
          .filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => `<tr><td style="width:200px;font-weight:600">${k}</td><td>${U.esc(String(v))}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="card report-page"><h3>Financial analysis</h3>
        ${h.rows.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Year</th><th class="num">Revenue</th><th class="num">Gross margin</th><th class="num">EBITDA</th><th class="num">SDE</th><th class="num">SDE margin</th></tr></thead><tbody>
          ${h.rows.map(x => `<tr><td>${x.year}</td><td class="num">${U.money(x.revenue)}</td><td class="num">${U.pct(x.grossMarginPct)}</td><td class="num">${U.money(x.ebitda)}</td><td class="num">${U.money(x.sde)}</td><td class="num">${U.pct(x.sdeMarginPct)}</td></tr>`).join('')}</tbody></table></div>
          <div style="margin:8px 0;font-size:13px;color:var(--ink-2)">Growth ${h.cagr3 !== null ? U.pct(h.cagr3) + '/yr (3-yr)' : '—'} · volatility ${h.volatility !== null ? '±' + U.pct(h.volatility) : '—'} · revenue/employee ${U.money(h.revenuePerEmployee, {compact:true})}</div>` : '<p class="hint">No year-by-year financials entered — analysis relies on seller-stated figures.</p>'}
        <h3 style="margin-top:16px">Normalized earnings</h3>
        <table class="data"><tbody>
          <tr><td style="width:260px;font-weight:600">Reported SDE (${r.norm.sdeBasis})</td><td class="num">${U.money(r.norm.reportedSDE)}</td></tr>
          ${deal.adjustments.map(adj => `<tr><td style="padding-left:24px">${adj.dir === '-' ? '−' : '+'} ${U.esc(adj.desc)}${adj.evidence ? '' : ' <span class="src-chip src-estimated">no evidence</span>'}</td><td class="num">${U.money((adj.dir === '-' ? -1 : 1) * C().n0(adj.amount))}</td></tr>`).join('')}
          <tr><td style="font-weight:700">Normalized SDE</td><td class="num" style="font-weight:700">${U.money(r.norm.normalizedSDE)}</td></tr>
          <tr><td style="font-weight:600">− Market-rate manager</td><td class="num">−${U.money(r.norm.managerSalary)}</td></tr>
          <tr><td style="font-weight:700">Normalized EBITDA (investor basis)</td><td class="num" style="font-weight:700">${U.money(r.norm.normalizedEBITDA)}</td></tr></tbody></table>
        ${r.norm.warnings.map(w => `<div class="callout bad" style="margin-top:8px">${U.esc(w)}</div>`).join('')}</div>
      <div class="card"><h3>Valuation & financing</h3>
        <div class="grid g4" style="margin-bottom:12px">
          ${kpi('Price / SDE', U.ratio(r.multiples.priceToSDE), '', `fair band ${sc.ind.multLow}–${sc.ind.multHigh}×`)}
          ${kpi('Price / EBITDA', U.ratio(r.multiples.priceToEBITDA))}
          ${kpi('Price / revenue', U.ratio(r.multiples.priceToRevenue))}
          ${kpi('Fair value (quality-adj.)', U.money(o?.fairValue, {compact:true}))}</div>
        <table class="data"><tbody>
          <tr><td style="width:260px;font-weight:600">Sources of funds</td><td>Cash ${U.money(r.fin.down, {compact:true})} · SBA ${U.money(C().n0(deal.structure.sbaAmount), {compact:true})} · bank ${U.money(C().n0(deal.structure.bankAmount), {compact:true})} · seller ${U.money(C().n0(deal.structure.sellerAmount), {compact:true})}</td></tr>
          <tr><td style="font-weight:600">Total project cost</td><td>${U.money(r.fin.uses)} (LTV ${U.pct(r.fin.ltvPct, 0)})</td></tr>
          <tr><td style="font-weight:600">Annual debt service</td><td>${U.money(r.fin.annualDS[0])} (${U.money(r.fin.monthlyDS)}/mo) · DSCR ${U.ratio(r.base.dscrY1)}</td></tr>
          <tr><td style="font-weight:600">Cash required at closing</td><td>${U.money(r.fin.cashRequired)}</td></tr></tbody></table></div>
      <div class="card report-page"><h3>Returns & scenarios (${DV.store.assumptions().holdYears}-yr hold)</h3>
        <div class="table-wrap"><table class="data"><thead><tr><th></th><th class="num">Downside</th><th class="num">Base</th><th class="num">Upside</th></tr></thead><tbody>
          ${[['Year-1 FCF after debt', s => U.money(s.fcfY1, {compact:true})], ['DSCR', s => U.ratio(s.dscrY1)], ['Cash-on-cash', s => U.pct(s.cocY1)], ['IRR', s => U.pct(s.irr)], ['Payback', s => U.yrs(s.payback)], ['Exit value', s => U.money(s.exitValue, {compact:true})], ['Total wealth created', s => U.money(s.wealthCreated, {compact:true})]]
            .map(([label, f]) => `<tr><td>${label}</td><td class="num">${f(r.down)}</td><td class="num"><b>${f(r.base)}</b></td><td class="num">${f(r.up)}</td></tr>`).join('')}</tbody></table></div>
        <h3 style="margin-top:16px">Stress tests</h3>
        <div class="table-wrap"><table class="data"><thead><tr><th>Shock</th><th class="num">DSCR</th><th class="num">FCF</th><th>Survives</th></tr></thead><tbody>
          ${r.stress.map(s => `<tr><td>${U.esc(s.label)}</td><td class="num">${U.ratio(s.dscr)}</td><td class="num ${s.fcf < 0 ? 'neg' : ''}">${U.money(s.fcf, {compact:true})}</td><td>${s.survives ? 'Yes' : 'NO'}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="card"><h3>Score breakdown</h3>
        ${Object.values(sc.cats).map(c => DV.charts.meter(c.score, `${c.label} · ${c.w}%`)).join('')}
        ${sc.breakers.length ? `<div class="callout bad"><b>Deal-breakers:</b> ${sc.breakers.map(x => U.esc(x.label)).join(' · ')}</div>` : ''}
        <div class="hint">Raw weighted score ${sc.rawScore}; final ${sc.finalScore}. Data confidence ${sc.confidence.score}/100 (${sc.confidence.level}): ${sc.confidence.notes.map(U.esc).join(' · ') || 'well documented'}.</div></div>
      <div class="card"><h3>Risk register</h3>${deal.risks.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Risk</th><th>Category</th><th>P</th><th>S</th><th>Mitigation</th><th>Status</th></tr></thead><tbody>
        ${deal.risks.map(x => `<tr><td>${U.esc(x.name)}${x.dealBreaker ? ' ⚑' : ''}</td><td>${x.category}</td><td>${x.probability}</td><td>${x.severity}</td><td>${U.esc(x.mitigation || '—')}</td><td>${x.status}</td></tr>`).join('')}</tbody></table></div>` : '<p class="hint">No risks logged.</p>'}</div>
      <div class="card"><h3>Due diligence status</h3>${deal.dd.length ? `<div class="table-wrap"><table class="data"><tbody>
        ${deal.dd.map(i => `<tr><td style="width:130px;color:var(--ink-3);font-size:12px">${i.group}</td><td>${U.esc(i.label)}</td><td style="width:130px">${i.status}</td></tr>`).join('')}</tbody></table></div>` : '<p class="hint">Checklist not yet generated.</p>'}</div>
      <div class="card"><h3>Recommendation</h3>
        <p style="font-size:14px"><b>${U.esc(rec.action)}.</b> ${U.esc(rec.worthBuying)} Strongest reason to proceed: ${U.esc(rec.strongestFor)} Strongest reason to walk: ${U.esc(rec.strongestAgainst)}</p>
        <div class="callout warn" style="margin-top:10px">Generated by Deal Vault from the data entered. It is decision support, <b>not legal, tax, accounting, lending or investment advice</b>. Engage an attorney, CPA and lender before signing anything.</div></div>`;
    const csv = main.querySelector('#csv-exp');
    if (csv) csv.onclick = () => exportCSV(deal, sc);
  }};

  function exportCSV(deal, sc) {
    const h = sc.res.history;
    const rows = [['Metric', ...h.rows.map(r => r.year)]];
    const KEYS = [['Revenue', 'revenue'], ['COGS', 'cogs'], ['Gross profit', 'grossProfit'], ['Opex', 'opex'], ['Owner comp', 'ownerComp'], ['EBITDA', 'ebitda'], ['SDE', 'sde'], ['Net income', 'netIncome'], ['Gross margin %', 'grossMarginPct'], ['SDE margin %', 'sdeMarginPct'], ['Capex', 'capex']];
    for (const [label, k] of KEYS) rows.push([label, ...h.rows.map(r => r[k] ?? '')]);
    rows.push([], ['Normalized SDE', sc.res.norm.normalizedSDE], ['Normalized EBITDA', sc.res.norm.normalizedEBITDA], ['Deal score', sc.finalScore], ['Verdict', sc.verdict.label]);
    const blob = new Blob([rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a2 = document.createElement('a');
    a2.href = URL.createObjectURL(blob);
    a2.download = (deal.basics.name || 'deal').replace(/[^\w]+/g, '-').toLowerCase() + '-financials.csv';
    a2.click();
  }
})();
