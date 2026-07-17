/* ============================================================
   Deal Vault — charts.js
   Dependency-free SVG charts. Every function returns an SVG
   string sized by viewBox so charts scale responsively.
   Colors come from CSS variables so light/dark themes work.
   ============================================================ */
window.DV = window.DV || {};

DV.charts = (() => {
  const esc = s => DV.util.esc(s);
  const P = (v, dp = 1) => Number(v.toFixed(dp));

  /* ----- score gauge (big dial on the verdict card) ----- */
  function gauge(score, size = 168) {
    const r = 66, cx = 84, cy = 88;
    const a0 = -210, a1 = 30; // 240° sweep
    const ang = a0 + (a1 - a0) * Math.max(0, Math.min(100, score)) / 100;
    const arc = (from, to, radius) => {
      const p = a => [cx + radius * Math.cos(a * Math.PI / 180), cy + radius * Math.sin(a * Math.PI / 180)];
      const [x1, y1] = p(from), [x2, y2] = p(to);
      return `M ${P(x1)} ${P(y1)} A ${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${P(x2)} ${P(y2)}`;
    };
    return `<svg viewBox="0 0 168 158" width="${size}" role="img" aria-label="Deal score ${score}">
      <path d="${arc(a0, a1, r)}" fill="none" stroke="var(--line)" stroke-width="11" stroke-linecap="round"/>
      <path d="${arc(a0, Math.max(a0 + .5, ang), r)}" fill="none" stroke="var(--score)" stroke-width="11" stroke-linecap="round"/>
      <text x="84" y="92" text-anchor="middle" font-size="44" font-weight="700" fill="var(--ink)" font-family="var(--font-d)">${Math.round(score)}</text>
      <text x="84" y="112" text-anchor="middle" font-size="10.5" fill="var(--ink-3)" letter-spacing="1.5">DEAL SCORE</text>
    </svg>`;
  }

  /* ----- radar: category strengths ----- */
  function radar(items, size = 300) { // items: [{label, value 0-100}]
    const n = items.length, cx = size / 2, cy = size / 2 + 4, R = size / 2 - 46;
    const pt = (i, v) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / n;
      return [cx + R * v * Math.cos(a), cy + R * v * Math.sin(a)];
    };
    let rings = '';
    for (const f of [.25, .5, .75, 1])
      rings += `<polygon points="${items.map((_, i) => pt(i, f).map(v => P(v)).join(',')).join(' ')}" fill="none" stroke="var(--line)" stroke-width="1"/>`;
    const axes = items.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${P(x)}" y2="${P(y)}" stroke="var(--line)" stroke-width="1"/>`; }).join('');
    const poly = items.map((it, i) => pt(i, Math.max(0.03, (it.value ?? 50) / 100)).map(v => P(v)).join(',')).join(' ');
    const labels = items.map((it, i) => {
      const [x, y] = pt(i, 1.22);
      const anchor = Math.abs(x - cx) < 12 ? 'middle' : x > cx ? 'start' : 'end';
      return `<text x="${P(x)}" y="${P(y)}" text-anchor="${anchor}" dominant-baseline="middle" font-size="10" fill="var(--ink-3)">${esc(it.label)}</text>
              <text x="${P(x)}" y="${P(y + 11)}" text-anchor="${anchor}" dominant-baseline="middle" font-size="9.5" font-weight="700" fill="var(--ink-2)">${it.value === null ? '—' : Math.round(it.value)}</text>`;
    }).join('');
    return `<svg viewBox="-36 -8 ${size + 72} ${size + 16}" style="max-width:${size + 90}px;width:100%">
      ${rings}${axes}
      <polygon points="${poly}" fill="var(--acc-soft)" stroke="var(--acc)" stroke-width="2" stroke-linejoin="round"/>
      ${items.map((it, i) => { const [x, y] = pt(i, Math.max(0.03, (it.value ?? 50) / 100)); return `<circle cx="${P(x)}" cy="${P(y)}" r="3" fill="var(--acc)"/>`; }).join('')}
      ${labels}
    </svg>`;
  }

  /* ----- multi-series line/bar for history & projections ----- */
  function lines(series, opts = {}) { // series: [{label, color, points:[{x,y}], bars?}]
    const W = opts.w || 560, H = opts.h || 240, padL = 58, padR = 14, padT = 16, padB = 30;
    const all = series.flatMap(s => s.points.filter(p => p.y !== null && p.y !== undefined));
    if (!all.length) return `<div class="chart-empty">No data yet</div>`;
    const xs = [...new Set(series.flatMap(s => s.points.map(p => p.x)))].sort((a, b) => a - b);
    let yMin = Math.min(0, ...all.map(p => p.y)), yMax = Math.max(...all.map(p => p.y));
    if (yMax === yMin) yMax = yMin + 1;
    const span = yMax - yMin; yMax += span * .08;
    const X = x => padL + (xs.length === 1 ? .5 : xs.indexOf(x) / (xs.length - 1)) * (W - padL - padR);
    const Y = y => padT + (1 - (y - yMin) / (yMax - yMin)) * (H - padT - padB);
    const fmt = opts.fmt || (v => DV.util.money(v, { compact: true }));
    let grid = '';
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const v = yMin + (yMax - yMin) * i / steps, y = Y(v);
      grid += `<line x1="${padL}" y1="${P(y)}" x2="${W - padR}" y2="${P(y)}" stroke="var(--line)" stroke-width="1"/>
               <text x="${padL - 7}" y="${P(y + 3)}" text-anchor="end" font-size="10" fill="var(--ink-3)">${esc(fmt(v))}</text>`;
    }
    const xLabels = xs.map(x => `<text x="${P(X(x))}" y="${H - 9}" text-anchor="middle" font-size="10" fill="var(--ink-3)">${esc(String(x))}</text>`).join('');
    const barW = Math.min(26, (W - padL - padR) / Math.max(1, xs.length) / (series.filter(s => s.bars).length + 1));
    let body = '';
    series.forEach((s, si) => {
      const col = s.color || 'var(--acc)';
      const pts = s.points.filter(p => p.y !== null && p.y !== undefined);
      if (s.bars) {
        const bs = series.filter(z => z.bars), bi = bs.indexOf(s);
        body += pts.map(p => {
          const x = X(p.x) - (bs.length * barW) / 2 + bi * barW;
          const y0 = Y(Math.max(0, yMin)), y1 = Y(p.y);
          return `<rect x="${P(x)}" y="${P(Math.min(y0, y1))}" width="${P(barW - 2)}" height="${P(Math.abs(y0 - y1))}" rx="2.5" fill="${col}" opacity="0.92"><title>${esc(s.label)} ${p.x}: ${esc(fmt(p.y))}</title></rect>`;
        }).join('');
      } else {
        const d = pts.map((p, i) => `${i ? 'L' : 'M'} ${P(X(p.x))} ${P(Y(p.y))}`).join(' ');
        body += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linejoin="round"/>`;
        body += pts.map(p => `<circle cx="${P(X(p.x))}" cy="${P(Y(p.y))}" r="3.2" fill="${col}"><title>${esc(s.label)} ${p.x}: ${esc(fmt(p.y))}</title></circle>`).join('');
      }
    });
    const legend = series.map(s => `<span class="lg"><i style="background:${s.color || 'var(--acc)'}"></i>${esc(s.label)}</span>`).join('');
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" width="100%">${grid}${xLabels}${body}</svg><div class="legend">${legend}</div></div>`;
  }

  /* ----- horizontal bars (scenario compare, stress tests) ----- */
  function hbars(rows, opts = {}) { // rows: [{label, value, color, note}]
    const fmt = opts.fmt || (v => DV.util.money(v, { compact: true }));
    const vals = rows.map(r => r.value ?? 0);
    const max = Math.max(1e-9, ...vals.map(Math.abs));
    return `<div class="hbars">` + rows.map(r => {
      const w = Math.abs(r.value ?? 0) / max * 100;
      return `<div class="hb-row"><span class="hb-label">${esc(r.label)}</span>
        <span class="hb-track"><i style="width:${P(Math.max(1.5, w))}%;background:${r.color || 'var(--acc)'}"></i></span>
        <span class="hb-val ${((r.value ?? 0) < 0) ? 'neg' : ''}">${esc(fmt(r.value))}</span>${r.note ? `<span class="hb-note">${esc(r.note)}</span>` : ''}</div>`;
    }).join('') + `</div>`;
  }

  /* ----- donut: sources of funds ----- */
  function donut(items, centerTitle, centerVal) { // items: [{label, value, color}]
    const total = items.reduce((t, i) => t + Math.max(0, i.value || 0), 0);
    if (total <= 0) return `<div class="chart-empty">Enter the financing structure</div>`;
    const cx = 90, cy = 90, r = 66, w2 = 21;
    let a = -90, paths = '';
    for (const it of items) {
      if ((it.value || 0) <= 0) continue;
      const sweep = it.value / total * 360;
      const a2 = a + Math.min(sweep, 359.9);
      const pt = ang => [cx + r * Math.cos(ang * Math.PI / 180), cy + r * Math.sin(ang * Math.PI / 180)];
      const [x1, y1] = pt(a), [x2, y2] = pt(a2);
      paths += `<path d="M ${P(x1)} ${P(y1)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${P(x2)} ${P(y2)}" fill="none" stroke="${it.color}" stroke-width="${w2}"><title>${esc(it.label)}: ${DV.util.money(it.value, {compact:true})} (${(it.value / total * 100).toFixed(0)}%)</title></path>`;
      a = a2;
    }
    const legend = items.filter(i => (i.value || 0) > 0).map(i =>
      `<span class="lg"><i style="background:${i.color}"></i>${esc(i.label)} <b>${DV.util.money(i.value, {compact:true})}</b></span>`).join('');
    return `<div class="donut-wrap"><svg viewBox="0 0 180 180" width="150">${paths}
      <text x="90" y="86" text-anchor="middle" font-size="10" fill="var(--ink-3)">${esc(centerTitle || '')}</text>
      <text x="90" y="103" text-anchor="middle" font-size="14" font-weight="700" fill="var(--ink)">${esc(centerVal || '')}</text>
    </svg><div class="legend legend-col">${legend}</div></div>`;
  }

  /* ----- risk heat map: probability × severity grid ----- */
  function heatmap(risks) {
    const cell = (p, s) => risks.filter(r => Math.round(r.probability) === p && Math.round(r.severity) === s && r.status !== 'Closed');
    let rows = '';
    for (let s = 5; s >= 1; s--) {
      let tds = `<td class="hm-axis">${['','Minor','Low','Moderate','Major','Severe'][s]}</td>`;
      for (let p = 1; p <= 5; p++) {
        const items = cell(p, s), heat = (p * s) / 25;
        const bg = `color-mix(in srgb, var(--bad) ${Math.round(heat * 72)}%, var(--panel-2))`;
        tds += `<td class="hm-cell" style="background:${bg}" title="${esc(items.map(r => r.name).join('\n'))}">${items.length ? `<b>${items.length}</b>` : ''}</td>`;
      }
      rows += `<tr>${tds}</tr>`;
    }
    return `<table class="heatmap"><tbody>${rows}
      <tr><td></td>${[1,2,3,4,5].map(p => `<td class="hm-axis">${['','Rare','Unlikely','Possible','Likely','Almost certain'][p]}</td>`).join('')}</tr>
    </tbody></table><div class="hm-caption">↑ impact severity · probability →</div>`;
  }

  /* ----- tiny inline sparkline ----- */
  function spark(values, w = 90, h = 26, color = 'var(--acc)') {
    const vs = values.filter(v => v !== null && v !== undefined);
    if (vs.length < 2) return '';
    const min = Math.min(...vs), max = Math.max(...vs), span = max - min || 1;
    const pts = vs.map((v, i) => `${P(i / (vs.length - 1) * (w - 4) + 2)},${P(h - 3 - (v - min) / span * (h - 6))}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8"/></svg>`;
  }

  /* ----- small score pill/meter ----- */
  function meter(score, label) {
    const s = score === null || score === undefined ? null : Math.round(score);
    const col = s === null ? 'var(--ink-3)' : s >= 70 ? 'var(--good)' : s >= 50 ? 'var(--warn)' : 'var(--bad)';
    return `<div class="meter"><div class="meter-head"><span>${esc(label)}</span><b style="color:${col}">${s === null ? '—' : s}</b></div>
      <div class="meter-track"><i style="width:${s === null ? 0 : s}%;background:${col}"></i></div></div>`;
  }

  return { gauge, radar, lines, hbars, donut, heatmap, spark, meter };
})();
