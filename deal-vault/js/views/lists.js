/* ============================================================
   Deal Vault — views/lists.js
   Dashboard, Saved Deals, Compare, Watchlist.
   ============================================================ */
window.DV = window.DV || {};
DV.views = DV.views || {};

(() => {
  const U = DV.util, A = () => DV.app, C = () => DV.calc;
  const kpi = (label, value, cls = '', note = '') => `<div class="kpi ${cls}"><div class="k-label">${label}</div><div class="k-value">${value}</div>${note ? `<div class="k-note">${note}</div>` : ''}</div>`;
  const chipColor = s => s === null ? 'var(--ink-3)' : s >= 65 ? 'var(--good)' : s >= 45 ? 'var(--warn)' : 'var(--bad)';
  const chipBg = s => s === null ? 'var(--panel-2)' : s >= 65 ? 'var(--good-soft)' : s >= 45 ? 'var(--warn-soft)' : 'var(--bad-soft)';
  const scoreChip = s => `<span class="score-chip" style="background:${chipBg(s)};color:${chipColor(s)}">${s === null ? '—' : s}</span>`;
  const analyzed = deal => { try { return DV.score.analyze(deal); } catch (e) { console.error(e); return null; } };
  const active = d => !d.archived && !DV.STAGE_DONE.includes(d.stage);

  /* ================= DASHBOARD ================= */
  DV.views.dashboard = { render(main) {
    const all = DV.store.deals();
    const deals = all.filter(active);
    const scored = deals.map(d => ({ d, sc: analyzed(d) })).filter(x => x.sc);
    const okScored = scored.filter(x => x.sc.res.ok);
    const avg = (arr, f) => { const v = arr.map(f).filter(x => x !== null && x !== undefined && isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const best = okScored.slice().sort((a, b) => b.sc.finalScore - a.sc.finalScore)[0];
    const followUp = deals.filter(d => (Date.now() - d.updatedAt) > 7 * 86400000 || d.tasks.some(t => !t.done));
    const watch = all.filter(d => d.watch.onWatchlist);
    const allRisks = scored.flatMap(x => x.d.risks.filter(r => r.status !== 'Closed').map(r => ({ ...r, deal: x.d })))
      .sort((a, b) => b.probability * b.severity - a.probability * a.severity).slice(0, 5);
    const ddSoon = scored.flatMap(x => x.d.dd.filter(i => ['Requested', 'Received'].includes(i.status)).map(i => ({ ...i, deal: x.d }))).slice(0, 6);
    const demoOnly = all.length > 0 && all.every(d => d.isDemo);

    main.innerHTML = `
      <div class="page-head"><div><h1>Dashboard</h1><div class="sub">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — ${deals.length ? `${deals.length} active deal${deals.length === 1 ? '' : 's'} in the pipeline.` : 'The vault is open. Bring it a deal.'}</div></div>
        <div class="head-actions"><button class="btn primary" onclick="DV.app.navigate('analyze')">＋ Analyze a deal</button></div></div>
      ${demoOnly ? `<div class="callout gold" style="border-color:var(--gold);background:var(--gold-soft)"><b>Welcome to Deal Vault.</b> Three <b>fictional demo deals</b> are loaded so you can explore a great, a borderline, and a bad acquisition. Open one, poke the analysis, then delete them in Settings whenever you're ready.</div>` : ''}
      <div class="grid g4" style="margin-bottom:16px">
        ${kpi('Active deals', deals.length)}
        ${kpi('Average deal score', avg(okScored, x => x.sc.finalScore) !== null ? Math.round(avg(okScored, x => x.sc.finalScore)) : '—')}
        ${kpi('Best opportunity', best ? U.esc((best.d.basics.name || '').slice(0, 18)) : '—', best && best.sc.finalScore >= 65 ? 'good' : '', best ? best.sc.finalScore + ' · ' + best.sc.verdict.label : '')}
        ${kpi('Capital required (active)', U.money(okScored.reduce((t, x) => t + x.sc.res.fin.cashRequired, 0), { compact: true }), '', 'cash at close, all active deals')}
        ${kpi('Avg cash-on-cash', U.pct(avg(okScored, x => x.sc.res.base?.cocY1)))}
        ${kpi('Avg DSCR', U.ratio(avg(okScored, x => x.sc.res.base?.dscrY1)))}
        ${kpi('Needs follow-up', followUp.length, followUp.length ? 'warn' : '', 'stale >7 days or open tasks')}
        ${kpi('Watchlist', watch.length)}</div>
      <div class="card"><h3>Pipeline</h3><div class="pipeline">${DV.STAGES.map(st => {
        const items = all.filter(d => !d.archived && d.stage === st);
        return `<div class="pipe-stage"><h5>${st} ${items.length ? `(${items.length})` : ''}</h5>
          ${items.slice(0, 4).map(d => { const sc2 = analyzed(d); return `<div class="pipe-card" onclick="DV.app.navigate('deal/${d.id}')"><b>${U.esc(d.basics.name || 'Untitled')}</b><span class="sc" style="color:${chipColor(sc2?.res.ok ? sc2.finalScore : null)}">${sc2?.res.ok ? sc2.finalScore + ' · ' + sc2.verdict.label : 'incomplete'}</span></div>`; }).join('')}
          ${items.length > 4 ? `<div class="hint">+${items.length - 4} more</div>` : ''}</div>`; }).join('')}</div></div>
      <div class="grid g2">
        <div class="card"><h3>Recently analyzed</h3>
          ${scored.slice().sort((a, b) => b.d.updatedAt - a.d.updatedAt).slice(0, 5).map(({ d, sc }) => `
            <div class="list-row" onclick="DV.app.navigate('deal/${d.id}')">${scoreChip(sc.res.ok ? sc.finalScore : null)}
              <div class="list-main"><b>${U.esc(d.basics.name || 'Untitled')} ${d.isDemo ? '<span class="demo-tag">DEMO</span>' : ''}</b>
              <span>${U.esc(DV.industries.get(d.basics.industry).label)} · ${U.money(d.basics.askingPrice, { compact: true })} · ${U.daysAgo(d.updatedAt)}</span></div>
              <span class="badge ${sc.res.ok ? sc.verdict.cls : 'dim'}">${sc.res.ok ? sc.verdict.label : d.stage}</span></div>`).join('') || '<div class="empty"><div class="display">Nothing analyzed yet</div>Run your first deal through the engine.</div>'}</div>
        <div class="card"><h3>Top risks across the portfolio</h3>
          ${allRisks.length ? allRisks.map(r => `<div class="list-row" onclick="DV.app.navigate('deal/${r.deal.id}')">
            <span class="badge ${r.probability * r.severity >= 15 ? 'v-avoid' : r.probability * r.severity >= 9 ? 'v-fair' : 'dim'}">${r.probability}×${r.severity}</span>
            <div class="list-main"><b>${U.esc(r.name)}</b><span>${U.esc(r.deal.basics.name || '')} · ${r.category}</span></div></div>`).join('')
          : '<div class="empty">No open risks logged.</div>'}
          ${ddSoon.length ? `<h3 style="margin-top:16px">Due-diligence in flight</h3>${ddSoon.map(i => `<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px dashed var(--line);font-size:13px"><span class="badge dim">${i.status}</span><span style="flex:1">${U.esc(i.label)}</span><span class="hint">${U.esc(i.deal.basics.name || '')}</span></div>`).join('')}` : ''}</div>
      </div>
      ${watch.length ? `<div class="card"><h3>Watchlist changes</h3>${watch.slice(0, 4).map(d => {
        const ph = d.watch.priceHistory;
        const delta = ph.length >= 2 ? ph[ph.length - 1].price - ph[0].price : 0;
        return `<div class="list-row" onclick="DV.app.navigate('deal/${d.id}')">
          <div class="list-main"><b>${U.esc(d.basics.name || 'Untitled')}</b><span>${d.watch.daysOnMarket ? d.watch.daysOnMarket + ' days on market · ' : ''}${U.esc(d.watch.statusNote || '')}</span></div>
          ${ph.length ? `<span>${DV.charts.spark(ph.map(p => p.price))}</span>` : ''}
          <span class="badge ${delta < 0 ? 'v-good' : 'dim'}">${delta < 0 ? '▼ ' + U.money(Math.abs(delta), { compact: true }) : U.money(ph[ph.length - 1]?.price, { compact: true })}</span></div>`;
      }).join('')}</div>` : ''}`;
  }};

  /* ================= SAVED DEALS ================= */
  DV.views.deals = { render(main) {
    const st = DV.views.deals._state = DV.views.deals._state || { q: '', sort: 'updated', stage: '', showArchived: false };
    const draw = () => {
      let deals = DV.store.deals(st.showArchived);
      if (st.showArchived) deals = deals.filter(d => d.archived);
      if (st.stage) deals = deals.filter(d => d.stage === st.stage);
      if (st.q) { const q = st.q.toLowerCase(); deals = deals.filter(d => (d.basics.name + ' ' + d.basics.city + ' ' + d.basics.state + ' ' + DV.industries.get(d.basics.industry).label + ' ' + d.tags.join(' ')).toLowerCase().includes(q)); }
      const rows = deals.map(d => ({ d, sc: analyzed(d) }));
      const val = x => { const { d, sc } = x;
        switch (st.sort) {
          case 'score': return sc?.res.ok ? sc.finalScore : -1;
          case 'price': return C().N(d.basics.askingPrice) ?? -1;
          case 'coc': return sc?.res.ok ? (sc.res.base?.cocY1 ?? -99) : -99;
          case 'cash': return sc?.res.ok ? sc.res.fin.cashRequired : -1;
          default: return d.updatedAt; } };
      rows.sort((a, b) => val(b) - val(a));
      main.querySelector('#deal-rows').innerHTML = rows.length ? rows.map(({ d, sc }) => {
        const ok = sc?.res.ok;
        return `<tr class="row-link" onclick="DV.app.navigate('deal/${d.id}')">
          <td>${scoreChip(ok ? sc.finalScore : null)}</td>
          <td><b>${U.esc(d.basics.name || 'Untitled')}</b> ${d.isDemo ? '<span class="demo-tag">DEMO</span>' : ''}${d.mode === 'quick' ? ' <span class="badge dim">quick</span>' : ''}
            <div class="hint">${U.esc(DV.industries.get(d.basics.industry).label)}${d.basics.city ? ' · ' + U.esc([d.basics.city, d.basics.state].filter(Boolean).join(', ')) : ''} · ${U.daysAgo(d.updatedAt)}</div></td>
          <td class="num">${U.money(d.basics.askingPrice, { compact: true })}</td>
          <td class="num">${ok ? U.money(sc.res.norm.normalizedSDE, { compact: true }) : '—'}</td>
          <td class="num">${ok ? U.ratio(sc.res.multiples.priceToSDE) : '—'}</td>
          <td class="num">${ok ? U.pct(sc.res.base?.cocY1) : '—'}</td>
          <td class="num">${ok ? U.ratio(sc.res.base?.dscrY1) : '—'}</td>
          <td class="num">${ok ? U.money(sc.res.fin.cashRequired, { compact: true }) : '—'}</td>
          <td><span class="badge dim">${d.stage}</span></td></tr>`;
      }).join('') : `<tr><td colspan="9"><div class="empty"><div class="display">${st.q || st.stage ? 'No deals match' : 'No saved deals yet'}</div>${st.q || st.stage ? 'Loosen the filters.' : 'Analyze your first deal to start the pipeline.'}</div></td></tr>`;
    };
    main.innerHTML = `
      <div class="page-head"><div><h1>Saved Deals</h1><div class="sub">Search, sort, and manage every opportunity in the vault.</div></div>
        <div class="head-actions"><button class="btn primary" onclick="DV.app.navigate('analyze')">＋ New deal</button></div></div>
      <div class="card"><div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        <input id="q" placeholder="Search name, city, industry, tag…" value="${U.esc(st.q)}" style="flex:1;min-width:190px;border:1px solid var(--line-2);border-radius:9px;padding:8px 12px">
        <select id="stage" style="border:1px solid var(--line-2);border-radius:9px;padding:8px"><option value="">All stages</option>${DV.STAGES.map(s => `<option${st.stage === s ? ' selected' : ''}>${s}</option>`).join('')}</select>
        <select id="sort" style="border:1px solid var(--line-2);border-radius:9px;padding:8px">${[['updated', 'Recently updated'], ['score', 'Deal score'], ['price', 'Asking price'], ['coc', 'Cash-on-cash'], ['cash', 'Cash required']].map(([v, l]) => `<option value="${v}"${st.sort === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink-2)"><input type="checkbox" id="arch" ${st.showArchived ? 'checked' : ''}>Archived</label></div>
      <div class="table-wrap"><table class="data"><thead><tr><th></th><th>Deal</th><th class="num">Asking</th><th class="num">Norm. SDE</th><th class="num">Multiple</th><th class="num">CoC</th><th class="num">DSCR</th><th class="num">Cash req.</th><th>Stage</th></tr></thead>
      <tbody id="deal-rows"></tbody></table></div></div>`;
    main.querySelector('#q').addEventListener('input', e => { st.q = e.target.value; draw(); });
    main.querySelector('#stage').onchange = e => { st.stage = e.target.value; draw(); };
    main.querySelector('#sort').onchange = e => { st.sort = e.target.value; draw(); };
    main.querySelector('#arch').onchange = e => { st.showArchived = e.target.checked; draw(); };
    draw();
  }};

  /* ================= COMPARE ================= */
  DV.views.compare = { render(main) {
    const st = DV.views.compare._state = DV.views.compare._state || { ids: [] };
    const all = DV.store.deals().map(d => ({ d, sc: analyzed(d) })).filter(x => x.sc?.res.ok);
    st.ids = st.ids.filter(id => all.some(x => x.d.id === id));
    if (!st.ids.length) st.ids = all.slice(0, Math.min(3, all.length)).map(x => x.d.id);
    const picked = st.ids.map(id => all.find(x => x.d.id === id)).filter(Boolean).slice(0, 5);
    const bestId = picked.length > 1 ? picked.slice().sort((a, b) => b.sc.finalScore - a.sc.finalScore)[0].d.id : null;
    const row = (label, f, fmt, betterHigh = true) => {
      const vals = picked.map(x => f(x));
      const best = picked.length > 1 ? (betterHigh ? Math.max : Math.min)(...vals.filter(v => v !== null && isFinite(v))) : null;
      return `<tr><td>${label}</td>${picked.map((x, i) => `<td class="num" style="${vals[i] !== null && vals[i] === best ? 'font-weight:800;color:var(--gold)' : ''}">${fmt(vals[i])}</td>`).join('')}</tr>`;
    };
    main.innerHTML = `
      <div class="page-head"><div><h1>Compare Deals</h1><div class="sub">Up to five, side by side. Gold = best on that line.</div></div></div>
      ${all.length < 2 ? `<div class="empty"><div class="display">Need at least two analyzable deals</div>Analyze more deals (each needs a price and earnings), then come back.</div>` : `
      <div class="card"><div style="display:flex;gap:8px;flex-wrap:wrap">${all.map(x => `<button class="btn sm ${st.ids.includes(x.d.id) ? 'primary' : ''}" data-pick="${x.d.id}">${U.esc(x.d.basics.name || 'Untitled')}</button>`).join('')}</div>
        ${st.ids.length >= 5 ? '<div class="hint" style="margin-top:8px">Maximum of five — deselect one to add another.</div>' : ''}</div>
      <div class="card"><div class="table-wrap"><table class="data"><thead><tr><th style="min-width:170px"></th>${picked.map(x => `<th class="num ${x.d.id === bestId ? 'compare-best' : ''}" style="min-width:120px"><span style="cursor:pointer" onclick="DV.app.navigate('deal/${x.d.id}')">${U.esc(x.d.basics.name || 'Untitled')}</span>${x.d.isDemo ? '<br><span class="demo-tag">DEMO</span>' : ''}</th>`).join('')}</tr></thead><tbody>
        ${row('Deal Score', x => x.sc.finalScore, v => v === null ? '—' : Math.round(v))}
        <tr><td>Verdict</td>${picked.map(x => `<td class="num"><span class="badge ${x.sc.verdict.cls}">${x.sc.verdict.label}</span></td>`).join('')}</tr>
        ${row('Risk score (lower better)', x => x.sc.risk.score, v => v === null ? '—' : Math.round(v), false)}
        ${row('Location score', x => x.sc.locationScore, v => v === null ? '—' : Math.round(v))}
        ${row('Data confidence', x => x.sc.confidence.score, v => v === null ? '—' : Math.round(v))}
        <tr><td colspan="${picked.length + 1}" style="font-weight:700;background:var(--panel-2)">Economics</td></tr>
        ${row('Asking price', x => C().N(x.d.basics.askingPrice), v => U.money(v, { compact: true }), false)}
        ${row('Recommended max price', x => x.sc.offer?.maxPrice ?? null, v => U.money(v, { compact: true }))}
        ${row('Revenue (latest)', x => x.sc.res.history.latest?.revenue ?? null, v => U.money(v, { compact: true }))}
        ${row('Revenue growth %/yr', x => x.sc.res.history.cagr3 ?? x.sc.res.history.avgGrowth, v => U.pct(v))}
        ${row('Normalized SDE', x => x.sc.res.norm.normalizedSDE, v => U.money(v, { compact: true }))}
        ${row('Normalized EBITDA', x => x.sc.res.norm.normalizedEBITDA, v => U.money(v, { compact: true }))}
        ${row('Price / SDE (lower better)', x => x.sc.res.multiples.priceToSDE, v => U.ratio(v), false)}
        <tr><td colspan="${picked.length + 1}" style="font-weight:700;background:var(--panel-2)">Your money</td></tr>
        ${row('Cash required', x => x.sc.res.fin.cashRequired, v => U.money(v, { compact: true }), false)}
        ${row('Year-1 cash flow', x => x.sc.res.base?.fcfY1 ?? null, v => U.money(v, { compact: true }))}
        ${row('Cash-on-cash', x => x.sc.res.base?.cocY1 ?? null, v => U.pct(v))}
        ${row('DSCR', x => x.sc.res.base?.dscrY1 ?? null, v => U.ratio(v))}
        ${row('Payback (lower better)', x => x.sc.res.base?.payback ?? null, v => U.yrs(v), false)}
        ${row('IRR', x => x.sc.res.base?.irr ?? null, v => U.pct(v))}
        ${row('Downside-case cash flow', x => x.sc.res.down?.fcfY1 ?? null, v => U.money(v, { compact: true }))}
        <tr><td colspan="${picked.length + 1}" style="font-weight:700;background:var(--panel-2)">Quality</td></tr>
        ${row('Owner dependence (lower better)', x => C().N(x.d.ops.ratings?.ownerDependence), v => v === null ? '—' : v + '/10', false)}
        ${row('Recurring revenue %', x => C().N(x.d.ops.recurringRevenuePct), v => U.pct(v, 0))}
        ${row('Top-customer concentration (lower better)', x => C().N(x.d.ops.topCustomerPct), v => U.pct(v, 0), false)}
        ${row('Growth category score', x => x.sc.cats.growth.score, v => v === null ? '—' : Math.round(v))}
      </tbody></table></div>
      ${bestId ? `<div class="callout gold" style="border-color:var(--gold);background:var(--gold-soft)"><b>Strongest overall: ${U.esc(picked.find(x => x.d.id === bestId).d.basics.name)}.</b> ${U.esc(explainBest(picked.find(x => x.d.id === bestId)))}</div>` : ''}</div>`}`;
    main.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
      const id = b.dataset.pick;
      if (st.ids.includes(id)) st.ids = st.ids.filter(x => x !== id);
      else if (st.ids.length < 5) st.ids.push(id);
      else return A().toast('Five deals max — remove one first', 'warn');
      DV.views.compare.render(main);
    });
  }};
  function explainBest(x) {
    const parts = [];
    if (x.sc.res.base?.cocY1 !== null) parts.push(`${U.pct(x.sc.res.base.cocY1)} cash-on-cash`);
    if (x.sc.res.base?.dscrY1 !== null) parts.push(`${U.ratio(x.sc.res.base.dscrY1)} coverage`);
    const top = Object.values(x.sc.cats).filter(c => c.score !== null).sort((a, b) => b.score - a.score)[0];
    if (top) parts.push(`strongest category: ${top.label.toLowerCase()} (${top.score})`);
    return `Highest weighted score (${x.sc.finalScore}) with ${parts.join(', ')}. Confidence ${x.sc.confidence.level.toLowerCase()} — verify before acting.`;
  }

  /* ================= WATCHLIST ================= */
  DV.views.watchlist = { render(main) {
    const deals = DV.store.deals().filter(d => d.watch.onWatchlist);
    main.innerHTML = `
      <div class="page-head"><div><h1>Watchlist</h1><div class="sub">Listings you're tracking before (or during) a full analysis. Monitoring is manual — brokers don't offer feeds — so log changes when you re-check a listing.</div></div>
        <div class="head-actions"><button class="btn primary" onclick="DV.app.navigate('analyze')">＋ Analyze a new deal</button></div></div>
      ${deals.length ? deals.map(d => {
        const sc = analyzed(d); const ph = d.watch.priceHistory;
        const first = ph[0]?.price, last = ph[ph.length - 1]?.price;
        return `<div class="card"><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
          ${scoreChip(sc?.res.ok ? sc.finalScore : null)}
          <div style="flex:1;min-width:170px"><b style="font-size:16px;cursor:pointer" onclick="DV.app.navigate('deal/${d.id}')">${U.esc(d.basics.name || 'Untitled')}</b> ${d.isDemo ? '<span class="demo-tag">DEMO</span>' : ''}
            <div class="hint">${U.esc(DV.industries.get(d.basics.industry).label)} · asking ${U.money(last ?? d.basics.askingPrice, { compact: true })}${first !== undefined && last !== first ? ` (was ${U.money(first, { compact: true })})` : ''}${d.watch.daysOnMarket ? ` · ${d.watch.daysOnMarket} days on market` : ''}</div></div>
          ${ph.length > 1 ? DV.charts.spark(ph.map(p => p.price), 110, 30, last < first ? 'var(--good)' : 'var(--warn)') : ''}
          <div style="display:flex;gap:7px;flex-wrap:wrap">
            <button class="btn sm" data-log="${d.id}">Log price change</button>
            <button class="btn sm" data-note="${d.id}">Update status</button>
            <select data-opp="${d.id}" style="border:1px solid var(--line-2);border-radius:8px;padding:6px;font-size:12.5px">
              <option value="">Opportunity…</option>${['Hot', 'Promising', 'Lukewarm', 'Long shot'].map(o => `<option${d.watch.oppRating === o ? ' selected' : ''}>${o}</option>`).join('')}</select>
          </div></div>
          ${d.watch.statusNote ? `<div class="hint" style="margin-top:8px">Status: ${U.esc(d.watch.statusNote)}</div>` : ''}</div>`;
      }).join('') : `<div class="empty"><div class="display">Watchlist is empty</div>Open any deal and click “Add to watchlist”, or start a quick analysis of a listing you're curious about.</div>`}`;
    main.querySelectorAll('[data-log]').forEach(b => b.onclick = () => {
      const d = DV.store.deal(b.dataset.log);
      const v = prompt('New asking price:', d.watch.priceHistory[d.watch.priceHistory.length - 1]?.price ?? d.basics.askingPrice ?? '');
      const n = C().N(v);
      if (n !== null) { d.watch.priceHistory.push({ ts: Date.now(), price: n }); d.basics.askingPrice = n; DV.store.upsertDeal(d); DV.views.watchlist.render(main); }
    });
    main.querySelectorAll('[data-note]').forEach(b => b.onclick = () => {
      const d = DV.store.deal(b.dataset.note);
      const v = prompt('Status note (e.g. "under contract with another buyer", "seller called back"):', d.watch.statusNote || '');
      if (v !== null) { d.watch.statusNote = v; DV.store.upsertDeal(d); DV.views.watchlist.render(main); }
      const dm = prompt('Days on market (blank to skip):', d.watch.daysOnMarket ?? '');
      const n = C().N(dm); if (n !== null) { d.watch.daysOnMarket = n; DV.store.upsertDeal(d); DV.views.watchlist.render(main); }
    });
    main.querySelectorAll('[data-opp]').forEach(s => s.onchange = () => {
      const d = DV.store.deal(s.dataset.opp);
      d.watch.oppRating = s.value || null; DV.store.upsertDeal(d);
    });
  }};
})();
