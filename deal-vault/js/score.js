/* ============================================================
   Deal Vault — score.js
   Deal Score (0–100) with transparent weighted categories,
   automatic deal-breaker overrides, data-confidence scoring,
   risk & location scores, final recommendation, Offer Builder,
   and the "Make This Deal Work" improvement engine.
   ============================================================ */
window.DV = window.DV || {};

/* ---------- operational rating definitions (Step 7) ---------- */
DV.OPS_RATINGS = [
  { key: 'ownerDependence',   label: 'Owner dependence',            invert: true,  group: 'People',    help: 'Could it run 4 weeks without the owner?' },
  { key: 'managementStrength',label: 'Management strength',         invert: false, group: 'People' },
  { key: 'employeeTurnover',  label: 'Employee turnover',           invert: true,  group: 'People' },
  { key: 'keyPersonRisk',     label: 'Key-person risk (non-owner)', invert: true,  group: 'People',    help: 'Would one departure hurt badly?' },
  { key: 'vendorConcentration',label:'Vendor concentration',        invert: true,  group: 'Customers & vendors' },
  { key: 'contractQuality',   label: 'Contract quality',            invert: false, group: 'Customers & vendors', help: 'Written, assignable, multi-year?' },
  { key: 'leadDiversity',     label: 'Lead-source diversity',       invert: false, group: 'Revenue engine' },
  { key: 'marketingDependence',label:'Paid-marketing dependence',   invert: true,  group: 'Revenue engine' },
  { key: 'competitiveAdvantage',label:'Competitive advantage',      invert: false, group: 'Revenue engine' },
  { key: 'pricingPower',      label: 'Pricing power',               invert: false, group: 'Revenue engine' },
  { key: 'salesProcess',      label: 'Sales process (not owner-led)',invert: false,group: 'Revenue engine' },
  { key: 'sopDocumentation',  label: 'SOPs / documentation',        invert: false, group: 'Systems' },
  { key: 'techSystems',       label: 'Technology systems',          invert: false, group: 'Systems' },
  { key: 'reportingQuality',  label: 'Financial reporting quality', invert: false, group: 'Systems' },
  { key: 'inventoryControls', label: 'Inventory controls',          invert: false, group: 'Systems' },
  { key: 'equipmentCondition',label: 'Equipment condition',         invert: false, group: 'Assets' },
  { key: 'deferredMaintenance',label:'Deferred maintenance',        invert: true,  group: 'Assets' },
  { key: 'capacityHeadroom',  label: 'Capacity headroom',           invert: false, group: 'Growth' },
  { key: 'expansionPotential',label: 'Expansion potential',         invert: false, group: 'Growth' },
  { key: 'scalability',       label: 'Scalability',                 invert: false, group: 'Growth' },
  { key: 'regulatoryBurden',  label: 'Regulatory burden',           invert: true,  group: 'Exposure' },
  { key: 'legalExposure',     label: 'Legal exposure',              invert: true,  group: 'Exposure' },
  { key: 'cyberExposure',     label: 'Cybersecurity exposure',      invert: true,  group: 'Exposure' },
  { key: 'envExposure',       label: 'Environmental exposure',      invert: true,  group: 'Exposure' }
];

/* ---------- location rating definitions (Step 8) ---------- */
DV.LOC_RATINGS = [
  { key: 'traffic',       label: 'Traffic / footfall',      invert: false },
  { key: 'visibility',    label: 'Visibility & signage',    invert: false },
  { key: 'accessibility', label: 'Access & parking',        invert: false },
  { key: 'competition',   label: 'Competitor density',      invert: true },
  { key: 'saturation',    label: 'Market saturation',       invert: true },
  { key: 'demand',        label: 'Local demand',            invert: false },
  { key: 'demographics',  label: 'Demographic fit',         invert: false },
  { key: 'development',   label: 'Area development trend',  invert: false },
  { key: 'crime',         label: 'Crime exposure',          invert: true },
  { key: 'disaster',      label: 'Weather / disaster risk', invert: true },
  { key: 'regulation',    label: 'Local regulation & taxes',invert: true },
  { key: 'labor',         label: 'Labor availability',      invert: false },
  { key: 'rentTrend',     label: 'Rent-growth pressure',    invert: true },
  { key: 'industryLocal', label: 'Local industry conditions', invert: false }
];

DV.score = (() => {
  const C = () => DV.calc;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const N = v => C().N(v);

  /* Average a rating map (0–10 sliders) honoring inversion → 0..1 */
  function ratingQuality(map, defs) {
    const vals = [];
    for (const d of defs) {
      const v = N(map?.[d.key]);
      if (v === null) continue;
      vals.push(d.invert ? 1 - v / 10 : v / 10);
    }
    return vals.length ? { q: vals.reduce((a,b)=>a+b,0) / vals.length, n: vals.length } : { q: null, n: 0 };
  }

  /* Each category scorer returns {score:0-100|null, notes[], missing[]} */

  function catFinancial(deal, res, ind) {
    const h = res.history, notes = [], missing = [], sig = [];
    if (!h.latest) return { score: null, notes, missing: ['No financial history entered'] };
    const L = h.latest;
    if (L.sdeMarginPct !== null) {
      const t = clamp(L.sdeMarginPct / (ind.sdeMargin * 1.4), 0, 1);
      sig.push([t, 3]); notes.push(`SDE margin ${L.sdeMarginPct.toFixed(1)}% vs ~${ind.sdeMargin}% typical for ${ind.label}.`);
    } else missing.push('SDE margin');
    if (L.grossMarginPct !== null) sig.push([clamp(L.grossMarginPct / ind.grossMargin, 0, 1.15) / 1.15, 1.5]);
    const g = h.cagr3 ?? h.avgGrowth;
    if (g !== null) {
      sig.push([clamp((g + 10) / 25, 0, 1), 2.5]);
      notes.push(`Revenue trend ${g >= 0 ? '+' : ''}${g.toFixed(1)}%/yr${h.cagr5 !== null ? ` (5-yr CAGR ${h.cagr5.toFixed(1)}%)` : ''}.`);
    } else missing.push('Multi-year revenue (growth trend unknown)');
    if (h.volatility !== null) {
      sig.push([clamp(1 - h.volatility / 30, 0, 1), 1.5]);
      if (h.volatility > 20) notes.push(`Volatile results (±${h.volatility.toFixed(0)}% swings) — underwrite the downside, not the average.`);
    }
    if (res.norm.normalizedSDE !== null && res.norm.normalizedSDE <= 0) { sig.push([0, 4]); notes.push('Normalized earnings are zero or negative.'); }
    notes.push(...h.flags);
    if (!sig.length) return { score: null, notes, missing };
    const w = sig.reduce((t,s)=>t+s[1],0);
    return { score: Math.round(sig.reduce((t,s)=>t+s[0]*s[1],0)/w*100), notes, missing };
  }

  function catValuation(deal, res, ind) {
    const notes = [], missing = [];
    const x = res.multiples.priceToSDE;
    if (x === null) return { score: null, notes, missing: ['Price or normalized SDE missing'] };
    const q = qualitySignal(deal, res);
    const fair = DV.industries.fairMultiple(ind, q);
    // each 1.0x below the quality-adjusted fair multiple ≈ +25 pts
    const score = Math.round(clamp(62 + (fair - x) * 25, 3, 97));
    notes.push(`Priced at ${x.toFixed(2)}× normalized SDE; quality-adjusted fair multiple ≈ ${fair.toFixed(1)}× (${ind.label} range ${ind.multLow}–${ind.multHigh}×).`);
    if (x > fair + 0.5) notes.push(`Asking roughly ${DV.util.money((x - fair) * res.norm.normalizedSDE)} above fair value.`);
    if (x < fair - 0.5) notes.push('Priced below the fair band — find out why before celebrating.');
    return { score, notes, missing };
  }

  function catReturns(deal, res) {
    const a = DV.store.assumptions(), notes = [], missing = [], sig = [];
    if (!res.ok || !res.base) return { score: null, notes, missing: ['Not enough data to model returns'] };
    const b = res.base;
    if (b.cocY1 !== null) { sig.push([clamp(b.cocY1 / (a.targetCoC * 1.5), 0, 1), 3]); notes.push(`Year-1 cash-on-cash ${b.cocY1.toFixed(1)}% vs ${a.targetCoC}% target.`); }
    if (b.irr !== null) { sig.push([clamp(b.irr / 35, 0, 1), 2]); notes.push(`Base-case ${a.holdYears}-yr IRR ${b.irr.toFixed(1)}% (incl. exit at ${b.exitMult.toFixed(1)}× EBITDA).`); }
    if (b.payback !== null) sig.push([clamp((a.targetPayback * 2 - b.payback) / (a.targetPayback * 2), 0, 1), 2]);
    else { sig.push([0.1, 2]); notes.push(`Cash invested is not recovered within ${a.holdYears} years in the base case.`); }
    if (b.npv !== null) sig.push([b.npv > 0 ? clamp(0.6 + b.npv / (res.fin.cashRequired * 2), 0.6, 1) : 0.25, 1]);
    return { score: sig.length ? Math.round(sig.reduce((t,s)=>t+s[0]*s[1],0)/sig.reduce((t,s)=>t+s[1],0)*100) : null, notes, missing };
  }

  function catFinancing(deal, res) {
    const a = DV.store.assumptions(), notes = [], missing = [], sig = [];
    if (!res.ok) return { score: null, notes, missing: ['Financing not modeled yet'] };
    const dscr = res.base?.dscrY1, dDscr = res.down?.dscrY1;
    if (dscr !== null && dscr !== undefined) {
      sig.push([clamp((dscr - 0.9) / 0.9, 0, 1), 3]);
      notes.push(`Base DSCR ${dscr.toFixed(2)}x (${dscr >= a.safeDSCR ? 'at or above' : 'below'} the ${a.safeDSCR}x safety bar).`);
    } else if (res.fin.debtTotal === 0) { sig.push([0.9, 3]); notes.push('No debt — financing risk is minimal.'); }
    if (dDscr !== null && dDscr !== undefined && res.fin.debtTotal > 0) {
      sig.push([clamp((dDscr - 0.8) / 0.7, 0, 1), 2.5]);
      if (dDscr < 1) notes.push(`Downside-case DSCR ${dDscr.toFixed(2)}x — the debt does not survive a bad year.`);
    }
    if (res.fin.ltvPct !== null) sig.push([clamp((95 - res.fin.ltvPct) / 40, 0, 1), 1]);
    if (res.fin.balloons.length) { sig.push([0.3, 1]); notes.push(`Balloon payment of ${DV.util.money(res.fin.balloons[0].amount)} due year ${res.fin.balloons[0].year} — refinance risk.`); }
    if (Math.abs(res.fin.gap) > 1000) notes.push(`Sources vs uses gap of ${DV.util.money(res.fin.gap)} — the structure doesn't balance yet.`);
    return { score: sig.length ? Math.round(sig.reduce((t,s)=>t+s[0]*s[1],0)/sig.reduce((t,s)=>t+s[1],0)*100) : null, notes, missing };
  }

  function catOperations(deal) {
    const notes = [], missing = [];
    const r = ratingQuality(deal.ops.ratings, DV.OPS_RATINGS);
    const ia = DV.industries.answerQuality(deal);
    const sig = [];
    if (r.q !== null) sig.push([r.q, 2]);
    else missing.push('Operational ratings (Step 7)');
    if (ia.q !== null) sig.push([ia.q, 1.5]);
    const od = N(deal.ops.ratings?.ownerDependence);
    if (od !== null && od >= 7) notes.push('High owner dependence — you are buying the seller\'s job until you rebuild the machine.');
    if (r.n > 0 && r.n < 8) missing.push(`Only ${r.n} of ${DV.OPS_RATINGS.length} operational factors rated`);
    return { score: sig.length ? Math.round(sig.reduce((t,s)=>t+s[0]*s[1],0)/sig.reduce((t,s)=>t+s[1],0)*100) : null, notes, missing };
  }

  function catGrowth(deal, res, ind) {
    const notes = [], missing = [], sig = [];
    sig.push([ind.outlook / 10, 1.5]);
    notes.push(`${ind.label} industry outlook: ${ind.outlook}/10.`);
    const g = res.history.cagr3 ?? res.history.avgGrowth;
    if (g !== null) sig.push([clamp((g + 5) / 20, 0, 1), 1.5]);
    const growthKeys = ['capacityHeadroom','expansionPotential','scalability'];
    const gr = ratingQuality(Object.fromEntries(growthKeys.map(k => [k, deal.ops.ratings?.[k]])), DV.OPS_RATINGS.filter(d => growthKeys.includes(d.key)));
    if (gr.q !== null) sig.push([gr.q, 1.5]); else missing.push('Growth ratings (capacity, expansion, scalability)');
    return { score: Math.round(sig.reduce((t,s)=>t+s[0]*s[1],0)/sig.reduce((t,s)=>t+s[1],0)*100), notes, missing };
  }

  function locationScore(deal) {
    const notes = [], missing = [], sig = [];
    const r = ratingQuality(deal.location.ratings, DV.LOC_RATINGS);
    if (r.q !== null) sig.push([r.q, 3]); else missing.push('Location ratings (Step 8)');
    const pg = N(deal.location.popGrowthPct);
    if (pg !== null) { sig.push([clamp((pg + 1) / 4, 0, 1), 1]); notes.push(`Population growth ${pg}%/yr (${deal.location.dataSource || 'source not recorded'}${deal.location.dataDate ? ', ' + deal.location.dataDate : ''}).`); }
    const eg = N(deal.location.employmentGrowthPct);
    if (eg !== null) sig.push([clamp((eg + 1) / 4, 0, 1), 1]);
    const inc = N(deal.location.medianIncome);
    if (inc !== null) sig.push([clamp(inc / 100000, 0.2, 1), 0.5]);
    if (deal.basics.format === 'online') { notes.push('Online business — location weight is minimal.'); if (!sig.length) sig.push([0.7, 1]); }
    if (!sig.length) return { score: null, notes, missing };
    return { score: Math.round(sig.reduce((t,s)=>t+s[0]*s[1],0)/sig.reduce((t,s)=>t+s[1],0)*100), notes, missing };
  }

  function catRevenueQuality(deal) {
    const notes = [], missing = [], sig = [];
    const o = deal.ops;
    const rec = N(o.recurringRevenuePct);
    if (rec !== null) { sig.push([clamp(rec / 80, 0, 1), 2]); notes.push(`${rec}% recurring revenue.`); } else missing.push('Recurring-revenue %');
    const top1 = N(o.topCustomerPct);
    if (top1 !== null) { sig.push([clamp(1 - top1 / 40, 0, 1), 2]); if (top1 >= 20) notes.push(`Top customer is ${top1}% of revenue.`); }
    else missing.push('Customer concentration (top 1/5/10)');
    const top10 = N(o.top10Pct);
    if (top10 !== null) sig.push([clamp(1 - (top10 - 20) / 60, 0, 1), 1]);
    const ret = N(o.retentionPct);
    if (ret !== null) sig.push([clamp((ret - 50) / 45, 0, 1), 1.5]);
    return { score: sig.length ? Math.round(sig.reduce((t,s)=>t+s[0]*s[1],0)/sig.reduce((t,s)=>t+s[1],0)*100) : null, notes, missing };
  }

  function catSeller(deal) {
    const notes = [], missing = [], sig = [];
    const reason = (deal.basics.reasonForSelling || '').toLowerCase();
    if (!reason) missing.push('Reason for selling');
    else {
      let t = 0.5;
      if (/retir|health|age|relocat|family|divorce|estate/.test(reason)) { t = 0.85; notes.push('Reason for selling (retirement/life event) is a healthy signal.'); }
      else if (/burn|tired|partner dispute/.test(reason)) t = 0.55;
      else if (/other (business|venture)|new opportunit|focus/.test(reason)) { t = 0.45; notes.push('“Pursuing other ventures” — probe whether they\'re running from something.'); }
      else if (/declin|compet|struggl/.test(reason)) { t = 0.2; notes.push('Seller cites decline/competition — price the trend in.'); }
      sig.push([t, 2]);
    }
    if (deal.verification.sellerCooperative === true) { sig.push([0.9, 1.5]); notes.push('Seller is cooperative with verification.'); }
    else if (deal.verification.sellerCooperative === false) { sig.push([0, 2.5]); notes.push('Seller resists verification — treat every number as unproven.'); }
    const stay = N(deal.industryAnswers?.sellerStayMonths);
    if (stay !== null) sig.push([clamp(stay / 6, 0, 1), 1]);
    if (deal.basics.ownerInvolvement === 'absentee') { sig.push([0.85, 1]); notes.push('Absentee-owner operation — cleaner transition.'); }
    else if (deal.basics.ownerInvolvement === 'full-time') sig.push([0.45, 1]);
    return { score: sig.length ? Math.round(sig.reduce((t,s)=>t+s[0]*s[1],0)/sig.reduce((t,s)=>t+s[1],0)*100) : null, notes, missing };
  }

  function catLegal(deal) {
    const notes = [], missing = [], sig = [];
    const L = deal.lease;
    if (L.applicable) {
      const yrs = N(L.yearsRemaining);
      if (yrs !== null) {
        const opts = (L.renewalOptions || '').trim();
        const effYears = yrs + (opts ? 5 : 0);
        sig.push([clamp(effYears / 10, 0, 1), 2]);
        if (yrs <= 2 && !opts) notes.push('Lease nearly expired with no renewal options — existential risk.');
      } else missing.push('Lease years remaining');
      const rent = N(L.monthlyRent), mkt = N(L.marketRentMonthly);
      if (rent !== null && mkt !== null && mkt > 0) {
        const prem = (rent - mkt) / mkt * 100;
        if (prem > 10) { sig.push([0.3, 1]); notes.push(`Rent ~${prem.toFixed(0)}% above market.`); }
        else if (prem < -10) notes.push(`Rent ~${Math.abs(prem).toFixed(0)}% below market — expect a reset at renewal (a normalization adjustment).`);
      }
      const inc = N(L.annualIncreasePct);
      if (inc !== null && inc >= 4) { sig.push([0.4, 0.5]); notes.push(`Scheduled rent increases of ${inc}%/yr compound fast.`); }
      if (L.assignment && /consent|landlord|difficult|no/i.test(L.assignment)) notes.push('Lease assignment needs landlord consent — start early, it kills timelines.');
    } else sig.push([0.8, 1]);
    const legalR = N(deal.ops.ratings?.legalExposure), regR = N(deal.ops.ratings?.regulatoryBurden);
    if (legalR !== null) sig.push([1 - legalR / 10, 1]);
    if (regR !== null) sig.push([1 - regR / 10, 0.5]);
    const openLegal = (deal.risks || []).filter(r => ['Legal','Regulatory','Fraud','Tax'].includes(r.category) && r.status !== 'Closed' && (r.severity >= 4));
    if (openLegal.length) { sig.push([0.15, 2]); notes.push(`${openLegal.length} serious open legal/regulatory risk(s) in the register.`); }
    return { score: sig.length ? Math.round(sig.reduce((t,s)=>t+s[0]*s[1],0)/sig.reduce((t,s)=>t+s[1],0)*100) : null, notes, missing };
  }

  /* Blended quality 0..1 used to position the fair multiple */
  function qualitySignal(deal, res) {
    const parts = [];
    const ops = ratingQuality(deal.ops.ratings, DV.OPS_RATINGS); if (ops.q !== null) parts.push(ops.q);
    const ia = DV.industries.answerQuality(deal); if (ia.q !== null) parts.push(ia.q);
    const rec = N(deal.ops.recurringRevenuePct); if (rec !== null) parts.push(clamp(rec / 80, 0, 1));
    const g = res.history.cagr3 ?? res.history.avgGrowth; if (g !== null) parts.push(clamp((g + 5) / 20, 0, 1));
    return parts.length ? parts.reduce((a,b)=>a+b,0) / parts.length : 0.5;
  }

  /* ---------- deal-breaker overrides ---------- */
  function dealBreakers(deal, res) {
    const a = DV.store.assumptions(), out = [];
    const add = (label, detail, cap) => out.push({ label, detail, cap });
    const v = deal.verification;
    if (v.sellerCooperative === false)
      add('Seller refuses verification', 'Earnings cannot be trusted until the seller opens the books.', 40);
    const cash = N(v.cashRevenuePct);
    if (cash !== null && cash >= 30 && !v.bank)
      add('Major undocumented cash revenue', `${cash}% cash revenue with no bank verification — you cannot underwrite what you cannot see.`, 50);
    if (res.ok) {
      const dscr = res.base?.dscrY1;
      if (dscr !== null && dscr < 1.0) add('Debt service not covered', `Base-case DSCR ${dscr.toFixed(2)}x < 1.0x — the business cannot pay its own loan.`, 38);
      else if (dscr !== null && dscr < a.minDSCR) add('DSCR below minimum', `Base-case DSCR ${dscr.toFixed(2)}x is under the ${a.minDSCR}x floor.`, 50);
      if (res.down && res.down.fcfY1 !== null && res.down.fcfY1 < 0)
        add('Negative cash flow in downside case', `A realistic bad year leaves you ${DV.util.money(Math.abs(res.down.fcfY1))} out of pocket after debt service.`, 54);
      if (res.norm.normalizedEBITDA !== null && res.norm.normalizedEBITDA <= 0)
        add('Cannot afford a manager', 'After paying a market-rate manager there is no profit left — this is buying a job, not a business.', 45);
      if (res.norm.reportedSDE && res.norm.aggressiveTotal > 0.4 * Math.abs(res.norm.reportedSDE))
        add('Earnings rest on unsupported add-backs', `${DV.util.money(res.norm.aggressiveTotal)} of add-backs lack evidence.`, 54);
    }
    const top1 = N(deal.ops.topCustomerPct);
    if (top1 !== null && top1 >= 40) add('Severe customer concentration', `One customer is ${top1}% of revenue.`, 50);
    const L = deal.lease;
    if (L.applicable && N(L.yearsRemaining) !== null && N(L.yearsRemaining) <= 2 && !(L.renewalOptions || '').trim())
      add('Expiring lease, no renewal', 'The location can be lost right after you buy it.', 48);
    if (deal.industryAnswers?.licensesCurrent === false || deal.industryAnswers?.licensesCurrent === 'false')
      add('Licensing gap', 'Required licenses are not current.', 50);
    for (const r of (deal.risks || []))
      if (r.dealBreaker && r.status !== 'Closed')
        add(`Flagged deal-breaker: ${r.name}`, r.mitigation ? `Open until mitigated: ${r.mitigation}` : 'Marked as a deal-breaker in the risk register.', ['Fraud'].includes(r.category) ? 30 : 44);
    return out;
  }

  /* ---------- data confidence (0–100) ---------- */
  function confidence(deal, res) {
    let pts = 15; const notes = [];
    const v = deal.verification;
    if (v.taxReturns) pts += 16; else notes.push('Tax returns not yet verified');
    if (v.pl) pts += 12; else notes.push('P&L statements not verified');
    if (v.bank) pts += 12; else notes.push('Bank statements not tied to P&L');
    const keyFields = ['basics.askingPrice', 'basics.sellerRevenue'];
    const srcTrust = k => DV.SOURCES[deal.fieldSources[k] || (k === 'basics.askingPrice' && N(deal.basics.askingPrice) !== null ? 'seller' : 'missing')]?.trust ?? 0;
    pts += (srcTrust('basics.askingPrice') + srcTrust('basics.sellerRevenue')) * 5;
    if (res.history.rows.length >= 3) pts += 10; else if (res.history.rows.length >= 1) pts += 4;
    else notes.push('No year-by-year financials entered');
    const dd = deal.dd || [];
    if (dd.length) {
      const done = dd.filter(i => ['Reviewed','Cleared'].includes(i.status)).length;
      pts += done / dd.length * 15;
    }
    const badAdj = res.norm?.aggressive?.length || 0;
    pts -= Math.min(12, badAdj * 3);
    if (badAdj) notes.push(`${badAdj} add-back(s) without evidence`);
    const score = Math.round(clamp(pts, 3, 97));
    return { score, level: score >= 70 ? 'High' : score >= 45 ? 'Medium' : 'Low', notes };
  }

  /* ---------- risk score (0–100, higher = riskier) ---------- */
  function riskScore(deal, res) {
    let auto = 0; const drivers = [];
    const push = (v, label) => { auto += v; if (v >= 6) drivers.push(label); };
    if (res.ok) {
      const d = res.base?.dscrY1;
      if (d !== null) push(d < 1 ? 22 : d < 1.25 ? 14 : d < 1.5 ? 7 : 2, 'Thin debt-service coverage');
      if (res.down?.fcfY1 < 0) push(12, 'Downside case goes cash-negative');
      if (res.fin.balloons.length) push(6, 'Balloon-payment refinance risk');
    } else auto += 10;
    const top1 = N(deal.ops.topCustomerPct);
    if (top1 !== null) push(Math.min(15, top1 / 3), `Customer concentration (${top1}% top customer)`);
    const od = N(deal.ops.ratings?.ownerDependence);
    if (od !== null) push(od * 1.2, 'Owner dependence');
    if (res.history.volatility !== null) push(Math.min(10, res.history.volatility / 3), 'Earnings volatility');
    const L = deal.lease;
    if (L.applicable && N(L.yearsRemaining) !== null && N(L.yearsRemaining) < 5 && !(L.renewalOptions||'').trim()) push(8, 'Short lease runway');
    if (deal.verification.sellerCooperative === false) push(10, 'Unverifiable earnings');
    // register: probability (1–5) × severity (1–5), scaled
    const reg = (deal.risks || []).filter(r => r.status !== 'Closed');
    const regRaw = reg.reduce((t, r) => t + (N(r.probability) ?? 3) * (N(r.severity) ?? 3), 0);
    const regPts = Math.min(35, regRaw * 1.2);
    for (const r of reg.filter(x => (N(x.probability) ?? 3) * (N(x.severity) ?? 3) >= 12).slice(0, 5)) drivers.push(r.name);
    const score = Math.round(clamp(auto + regPts, 2, 98));
    return { score, drivers: [...new Set(drivers)].slice(0, 5) };
  }

  /* ---------- master scoring ---------- */
  function compute(deal) {
    const a = DV.store.assumptions();
    const ind = DV.industries.get(deal.basics.industry);
    const res = DV.calc.engine(deal, a, null, ind);
    const weights = Object.assign({}, a.weights, deal.weightsOverride || {});
    const loc = locationScore(deal);
    const cats = {
      financial:      { label: 'Financial performance', w: weights.financial, ...catFinancial(deal, res, ind) },
      valuation:      { label: 'Price & valuation',     w: weights.valuation, ...catValuation(deal, res, ind) },
      returns:        { label: 'Buyer returns',         w: weights.returns,   ...catReturns(deal, res) },
      financing:      { label: 'Debt & financing safety', w: weights.financing, ...catFinancing(deal, res) },
      operations:     { label: 'Operational quality',   w: weights.operations, ...catOperations(deal) },
      growth:         { label: 'Growth potential',      w: weights.growth,    ...catGrowth(deal, res, ind) },
      location:       { label: 'Location & market',     w: weights.location,  score: loc.score, notes: loc.notes, missing: loc.missing },
      revenueQuality: { label: 'Customer & revenue quality', w: weights.revenueQuality, ...catRevenueQuality(deal) },
      seller:         { label: 'Seller & transition',   w: weights.seller,    ...catSeller(deal) },
      legal:          { label: 'Legal, lease & regulatory', w: weights.legal, ...catLegal(deal) }
    };
    let wSum = 0, sSum = 0; const missing = [];
    for (const c of Object.values(cats)) {
      const s = c.score === null ? 50 : c.score;   // unknown = neutral, flagged as missing
      if (c.score === null) missing.push(...(c.missing.length ? c.missing : [c.label + ' not assessed']));
      else missing.push(...c.missing);
      wSum += c.w; sSum += s * c.w;
    }
    const rawScore = Math.round(sSum / (wSum || 1));
    const breakers = dealBreakers(deal, res);
    const cap = breakers.length ? Math.min(...breakers.map(b => b.cap)) : 100;
    const finalScore = Math.min(rawScore, cap);
    const verdict = DV.verdictFor(finalScore);
    const conf = confidence(deal, res);
    const risk = riskScore(deal, res);
    const strengths = Object.values(cats).filter(c => c.score !== null && c.score >= 70)
      .sort((x,y) => y.score - x.score).map(c => `${c.label} (${c.score})${c.notes[0] ? ' — ' + c.notes[0] : ''}`);
    const weaknesses = Object.values(cats).filter(c => c.score !== null && c.score <= 45)
      .sort((x,y) => x.score - y.score).map(c => `${c.label} (${c.score})${c.notes[0] ? ' — ' + c.notes[0] : ''}`);
    return { res, ind, cats, rawScore, finalScore, verdict, breakers, capped: finalScore < rawScore,
      confidence: conf, risk, locationScore: loc.score, strengths, weaknesses,
      missing: [...new Set(missing)], quality: qualitySignal(deal, res) };
  }

  /* ---------- price restructuring helper ----------
     Rescale the financing stack proportionally to a new price
     (keeps the same down/SBA/bank/seller mix).                 */
  function repriced(deal, newPrice) {
    const d = JSON.parse(JSON.stringify(deal));
    const s = d.structure;
    const oldPrice = N(s.proposedPrice) ?? N(d.basics.askingPrice) ?? 0;
    if (oldPrice <= 0) return d;
    const k = newPrice / oldPrice;
    s.proposedPrice = Math.round(newPrice);
    for (const f of ['downPayment','sbaAmount','bankAmount','sellerAmount','investorEquity'])
      if (N(s[f]) !== null) s[f] = Math.round(N(s[f]) * k);
    return d;
  }

  /* Binary-search the highest price that satisfies `test`. */
  function solvePrice(deal, test) {
    const cur = N(deal.structure.proposedPrice) ?? N(deal.basics.askingPrice);
    if (!cur) return null;
    let lo = cur * 0.2, hi = cur * 1.6;
    if (!test(compute(repriced(deal, lo)))) return null;      // even a fire-sale price fails
    if (test(compute(repriced(deal, hi)))) return hi;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      if (test(compute(repriced(deal, mid)))) lo = mid; else hi = mid;
    }
    return lo;
  }

  /* ---------- offer builder ---------- */
  function offer(deal, sc) {
    const a = DV.store.assumptions();
    const res = sc.res;
    if (!res.ok) return null;
    const fairValue = res.norm.normalizedSDE * DV.industries.fairMultiple(sc.ind, sc.quality);
    const maxSafe = solvePrice(deal, s => {
      const b = s.res.base, d = s.res.down;
      return b && b.dscrY1 !== null ? (b.dscrY1 >= a.safeDSCR && (d.fcfY1 ?? 0) >= 0 && (b.cocY1 ?? 0) >= 12)
        : (b ? (b.cocY1 ?? 0) >= 12 : false);
    });
    const asking = N(deal.basics.askingPrice);
    const maxPrice = maxSafe !== null ? Math.min(maxSafe, fairValue * 1.1) : fairValue;
    const idealOffer = Math.min(maxPrice * 0.92, fairValue * 0.9);
    const initialOffer = idealOffer * 0.93;
    const gapPct = asking ? (asking - maxPrice) / asking * 100 : null;
    const price = res.price;
    const terms = {
      downPaymentPct: 10,
      sellerNotePct: gapPct !== null && gapPct > 10 ? 15 : 10,
      earnout: gapPct !== null && gapPct > 15 ? Math.round((asking - maxPrice) * 0.5) : 0,
      holdbackPct: 5,
      trainingWeeks: 12,
      noncompete: '5 years / 25 miles (or service area)',
      workingCapitalTarget: Math.round((res.history.latest?.revenue ?? 0) * a.workingCapitalPct / 100),
      inventoryIncluded: deal.basics.inventoryIncluded !== false,
      contingencies: ['Financing approval (SBA/lender)', 'Satisfactory due diligence (books & records)', 'Lease assignment / new lease on acceptable terms', 'License & permit transfer', 'No material adverse change through closing']
    };
    return { fairValue, maxPrice, idealOffer, initialOffer, walkAway: maxPrice, asking, price, gapPct, terms };
  }

  /* ---------- "Make This Deal Work" improvement engine ---------- */
  function levers(deal, sc0) {
    const a = DV.store.assumptions();
    if (!sc0.res.ok) return [];
    const base = snap(sc0);
    const out = [];
    const tryLever = (label, detail, mutate) => {
      const d = JSON.parse(JSON.stringify(deal));
      mutate(d);
      const s = compute(d);
      if (!s.res.ok) return;
      out.push({ label, detail, after: snap(s), delta: diff(base, snap(s)) });
    };
    // 1. price cut to reach a Good Deal (65)
    const p65 = solvePrice(deal, s => s.finalScore >= 65);
    const cur = sc0.res.price;
    if (p65 !== null && p65 < cur * 0.995 && sc0.finalScore < 65)
      tryLever(`Reduce price to ${DV.util.money(p65, {compact:true})}`, `Lowest change that lifts this to a Good Deal (score 65).`, d => Object.assign(d, repriced(d, p65)));
    // 2. price for safe DSCR
    const pd = solvePrice(deal, s => (s.res.base?.dscrY1 ?? 99) >= a.safeDSCR);
    if (pd !== null && pd < cur * 0.995 && (sc0.res.base?.dscrY1 ?? 99) < a.safeDSCR)
      tryLever(`Reduce price to ${DV.util.money(pd, {compact:true})} for safe coverage`, `Gets base-case DSCR to ${a.safeDSCR}x.`, d => Object.assign(d, repriced(d, pd)));
    // 3. shift 15% of price to a seller note
    tryLever('Shift 15% of price to a seller note', 'Replaces bank/SBA debt with cheaper, patient seller financing (standard ask).', d => {
      const s = d.structure, shift = 0.15 * cur;
      const fromSba = Math.min(shift, C().n0(s.sbaAmount)); s.sbaAmount = C().n0(s.sbaAmount) - fromSba;
      const fromBank = Math.min(shift - fromSba, C().n0(s.bankAmount)); s.bankAmount = C().n0(s.bankAmount) - fromBank;
      const fromDown = shift - fromSba - fromBank; s.downPayment = Math.max(0, C().n0(s.downPayment) - fromDown);
      s.sellerAmount = C().n0(s.sellerAmount) + shift;
      s.sellerRate = N(s.sellerRate) ?? a.sellerRate; s.sellerTerm = N(s.sellerTerm) || a.sellerTermYears;
    });
    // 4. extend the seller note
    if (C().n0(deal.structure.sellerAmount) > 0)
      tryLever('Extend seller note by 3 years', 'Longer amortization lowers annual debt service.', d => { d.structure.sellerTerm = (N(d.structure.sellerTerm) || a.sellerTermYears) + 3; });
    // 5. 12-month interest-only opening on the seller note
    if (C().n0(deal.structure.sellerAmount) > 0)
      tryLever('Seller note: 12 months interest-only', 'Protects year-1 cash while you transition.', d => { d.structure.sellerIOMonths = 12; });
    // 6. negotiate rate down 1.5 pts
    if (sc0.res.fin.debtTotal > 0)
      tryLever('Shop lenders: rates −1.5 pts', 'A realistic spread between the first quote and the best quote.', d => {
        const s = d.structure;
        if (C().n0(s.sbaAmount) > 0) s.sbaRate = (N(s.sbaRate) ?? a.sbaRate) - 1.5;
        if (C().n0(s.bankAmount) > 0) s.bankRate = (N(s.bankRate) ?? a.bankRate) - 1.5;
      });
    // 7. working-capital credit at closing
    tryLever('Negotiate a working-capital credit (3% of price)', 'Seller leaves cash/receivables in the business — cuts your cash at close.', d => {
      d.structure.wcInjection = Math.max(0, C().n0(d.structure.wcInjection) - 0.03 * cur);
    });
    // 8. rent reduction (if leased)
    if (deal.lease.applicable && N(deal.lease.monthlyRent))
      tryLever('Negotiate rent −10% at assignment', 'Assignment is your once-only leverage moment with the landlord.', d => {
        const cut = N(d.lease.monthlyRent) * 0.10 * 12;
        d.adjustments.push({ id: 'lv-rent', desc: 'Negotiated rent reduction', amount: Math.round(cut), dir: '+', recurring: true, evidence: 'Assignment negotiation', confidence: 'med' });
        d.lease.monthlyRent = N(d.lease.monthlyRent) * 0.9;
      });
    // 9. honesty check: strip unsupported add-backs
    if (sc0.res.norm.aggressive.length)
      tryLever('Reality check: remove unsupported add-backs', 'What the deal looks like if the seller can\'t document their add-backs.', d => {
        d.adjustments = d.adjustments.filter(x => !(x.dir !== '-' && (x.confidence === 'low' || !x.evidence)));
      });
    return out.sort((x, y) => (y.delta.score ?? -99) - (x.delta.score ?? -99));
    function snap(s) { return { score: s.finalScore, cash: s.res.fin.cashRequired, coc: s.res.base?.cocY1 ?? null, dscr: s.res.base?.dscrY1 ?? null, fcf: s.res.base?.fcfY1 ?? null, payback: s.res.base?.payback ?? null, downFcf: s.res.down?.fcfY1 ?? null }; }
    function diff(b, x) { const d = {}; for (const k of Object.keys(b)) d[k] = (x[k] === null || b[k] === null) ? null : x[k] - b[k]; return d; }
  }

  /* ---------- final recommendation (the direct answers) ---------- */
  function recommendation(deal, sc) {
    const a = DV.store.assumptions(), res = sc.res;
    if (!res.ok) return null;
    const off = offer(deal, sc);
    const b = res.base, dn = res.down;
    const action = sc.finalScore >= 65 && sc.confidence.score >= 45 ? 'Proceed to LOI'
      : sc.finalScore >= 55 ? (sc.confidence.score < 45 ? 'Investigate further — verify before offering' : 'Renegotiate price/terms, then proceed')
      : sc.finalScore >= 45 ? 'Renegotiate hard or pass'
      : 'Walk away';
    return {
      worthBuying: sc.finalScore >= 65 ? 'Yes — at the right price and structure.' : sc.finalScore >= 55 ? 'Possibly — only with the changes below.' : 'Not as currently priced and structured.',
      strongestFor: sc.strengths[0] || 'No category stands out yet — more data needed.',
      strongestAgainst: sc.breakers[0] ? `${sc.breakers[0].label}: ${sc.breakers[0].detail}` : (sc.weaknesses[0] || 'No major weakness identified yet.'),
      fairValue: off?.fairValue, maxPrice: off?.maxPrice, idealOffer: off?.idealOffer,
      cashNeeded: res.fin.cashRequired,
      safestStructure: C().n0(deal.structure.sellerAmount) > 0 ? 'Current mix with a meaningful seller note (skin in the game) is directionally right.' : 'Add a seller note — it lowers cash needs and keeps the seller invested in your success.',
      realisticEarn: b?.fcfY1, ownerEarn: b?.ownerIncomeY1, mgrSalary: res.norm.managerSalary,
      canAffordManager: res.norm.normalizedEBITDA > 0,
      downside: dn?.fcfY1, payback: b?.payback,
      couldKill: sc.risk.drivers,
      missing: sc.missing.slice(0, 8),
      verifyFirst: ['Tax returns vs. P&L (3 years)', 'Bank deposits vs. reported revenue', 'Every add-back, with documents', 'Customer concentration report', 'Lease terms & assignability'],
      negotiate: off ? [`Open at ${DV.util.money(off.initialOffer, {compact:true})}, walk at ${DV.util.money(off.walkAway, {compact:true})}`, `Seller note ≥ ${off.terms.sellerNotePct}% of price`, off.terms.earnout ? `Earnout of ${DV.util.money(off.terms.earnout, {compact:true})} to bridge the price gap` : 'Holdback 5% for 12 months against surprises', `${off.terms.trainingWeeks} weeks of seller transition`, 'Working capital delivered at a normal level'] : [],
      action
    };
  }

  /* suggested starter risks by industry + structure */
  function suggestedRisks(deal) {
    const ind = DV.industries.get(deal.basics.industry);
    const base = [
      { name: 'Customer attrition at ownership change', category: 'Transition', probability: 3, severity: 3 },
      { name: 'Key employee departure post-close', category: 'Employee', probability: 3, severity: 3 },
      { name: 'Seller earnings overstated', category: 'Financial', probability: 3, severity: 4 }
    ];
    for (const r of ind.risks || []) base.push({ name: r, category: 'Operational', probability: 3, severity: 3 });
    if (DV.calc.n0(deal.structure.sbaAmount) > 0) base.push({ name: 'SBA approval delay or denial', category: 'Financing', probability: 2, severity: 4 });
    if (deal.lease.applicable) base.push({ name: 'Landlord blocks or degrades lease assignment', category: 'Lease', probability: 2, severity: 4 });
    return base.map(r => ({ id: DV.util.uid(), evidence: '', mitigation: '', dealBreaker: false, owner: 'Me', due: '', status: 'Open', impact: null, ...r }));
  }

  const cache = new Map();
  function analyze(deal) {
    const key = deal.id + ':' + deal.updatedAt + ':' + JSON.stringify(DV.store.assumptions());
    if (cache.has(key)) return cache.get(key);
    cache.clear();
    const sc = compute(deal);
    sc.offer = offer(deal, sc);
    sc.recommendation = recommendation(deal, sc);
    cache.set(key, sc);
    return sc;
  }

  return { analyze, compute, levers, offer, recommendation, dealBreakers, confidence, riskScore, locationScore, suggestedRisks, repriced, solvePrice, qualitySignal };
})();

if (typeof module !== 'undefined') module.exports = window.DV;
