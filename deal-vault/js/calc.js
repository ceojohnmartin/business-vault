/* ============================================================
   Deal Vault — calc.js
   The financial calculation library. All functions are pure,
   handle missing data / division-by-zero safely (returning
   null instead of NaN/Infinity), and are unit-tested in
   tests/calc.test.js. Formula notes are inline.
   ============================================================ */
window.DV = window.DV || {};

DV.calc = (() => {
  const N = v => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,%\s,]/g, ''));
    return Number.isFinite(n) ? n : null;
  };
  const n0 = v => N(v) ?? 0;                    // null-safe: treat missing as 0
  const div = (a, b) => (b === null || b === undefined || Math.abs(b) < 1e-9) ? null : a / b;
  const sum = arr => arr.reduce((t, v) => t + n0(v), 0);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ---------- loan math ----------
     Standard amortizing payment: PMT = P * r / (1 - (1+r)^-n)
     where r = monthly rate, n = number of monthly payments.   */
  function pmt(annualRatePct, years, principal) {
    const P = n0(principal); if (P <= 0 || !years) return 0;
    const r = n0(annualRatePct) / 100 / 12, n = years * 12;
    if (r === 0) return P / n;
    return P * r / (1 - Math.pow(1 + r, -n));
  }
  /* Remaining balance after m monthly payments. */
  function balanceAfter(annualRatePct, years, principal, afterYears) {
    const P = n0(principal); if (P <= 0) return 0;
    const r = n0(annualRatePct) / 100 / 12, n = years * 12, m = Math.min(afterYears * 12, n);
    if (r === 0) return Math.max(0, P * (1 - m / n));
    const pay = pmt(annualRatePct, years, P);
    return Math.max(0, P * Math.pow(1 + r, m) - pay * (Math.pow(1 + r, m) - 1) / r);
  }
  /* Build a per-loan yearly debt-service profile for `horizon` years.
     Supports interest-only opening months on the seller note. */
  function loanProfile(loan, horizon) {
    const P = n0(loan.amount);
    const out = { annual: [], interestTotal: 0, principalByYear: [], balloonAt: null };
    if (P <= 0) { out.annual = Array(horizon).fill(0); out.principalByYear = Array(horizon).fill(0); return out; }
    const rate = n0(loan.rate), years = n0(loan.term) || 1, io = Math.round(n0(loan.ioMonths));
    const rMo = rate / 100 / 12;
    const amortPay = pmt(rate, years, P);
    let bal = P, paidMonths = 0;
    for (let y = 0; y < horizon; y++) {
      let ds = 0, prin = 0;
      for (let m = 0; m < 12; m++) {
        if (bal <= 0.01) break;
        const interest = bal * rMo;
        if (paidMonths < io) { ds += interest; out.interestTotal += interest; }
        else if (paidMonths < io + years * 12) {
          const pr = Math.min(amortPay - interest, bal);
          ds += interest + pr; prin += pr; bal -= pr; out.interestTotal += interest;
        }
        paidMonths++;
      }
      out.annual.push(ds); out.principalByYear.push(prin);
    }
    if (loan.balloonYear && loan.balloonYear <= horizon) out.balloonAt = { year: loan.balloonYear, amount: balanceAfter(rate, years, P, loan.balloonYear) };
    return out;
  }

  /* ---------- time value of money ---------- */
  function npv(discountRatePct, cashflows) {   // cashflows[0] at t=0
    const r = n0(discountRatePct) / 100;
    return cashflows.reduce((t, cf, i) => t + n0(cf) / Math.pow(1 + r, i), 0);
  }
  /* IRR via bisection on NPV sign change; returns % or null if undefined. */
  function irr(cashflows) {
    if (!cashflows.some(c => n0(c) < 0) || !cashflows.some(c => n0(c) > 0)) return null;
    let lo = -0.95, hi = 10;
    const f = r => cashflows.reduce((t, cf, i) => t + n0(cf) / Math.pow(1 + r, i), 0);
    if (f(lo) * f(hi) > 0) return null;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2, v = f(mid);
      if (Math.abs(v) < 1e-7) return mid * 100;
      if (f(lo) * v < 0) hi = mid; else lo = mid;
    }
    return ((lo + hi) / 2) * 100;
  }
  /* CAGR = (end/start)^(1/years) - 1 ; needs positive endpoints. */
  function cagr(start, end, years) {
    const s = N(start), e = N(end);
    if (s === null || e === null || s <= 0 || e <= 0 || !years) return null;
    return (Math.pow(e / s, 1 / years) - 1) * 100;
  }

  /* ---------- single-year P&L math ---------- */
  const OPEX_KEYS = ['payroll','rent','utilities','marketing','insurance','vehicles','repairs','software','professional','taxes','otherOpex'];
  function yearMetrics(y) {
    const revenue = N(y.revenue);
    const cogs = n0(y.cogs);
    const opex = sum(OPEX_KEYS.map(k => y[k]));
    const ownerComp = n0(y.ownerSalary) + n0(y.ownerBenefits) + n0(y.personalExpenses);
    const grossProfit = revenue !== null ? revenue - cogs : null;
    // EBITDA: prefer building from lines; fall back to netIncome + I + D + A.
    let ebitda = null;
    const hasLines = revenue !== null && (cogs || opex || ownerComp || N(y.payroll) !== null);
    if (hasLines) ebitda = revenue - cogs - opex - ownerComp;
    else if (N(y.ebitda) !== null) ebitda = N(y.ebitda);
    else if (N(y.netIncome) !== null) ebitda = N(y.netIncome) + n0(y.interest) + n0(y.depreciation) + n0(y.amortization);
    // SDE = EBITDA + total compensation & perks of one working owner.
    let sde = N(y.sde);
    if (sde === null && ebitda !== null) sde = ebitda + ownerComp;
    const netIncome = N(y.netIncome) ?? (ebitda !== null ? ebitda - n0(y.interest) - n0(y.depreciation) - n0(y.amortization) : null);
    return {
      year: y.year, revenue, cogs, opex, ownerComp, grossProfit, ebitda, sde, netIncome,
      grossMarginPct: div(grossProfit, revenue) !== null ? div(grossProfit, revenue) * 100 : null,
      ebitdaMarginPct: (ebitda !== null && revenue) ? ebitda / revenue * 100 : null,
      sdeMarginPct: (sde !== null && revenue) ? sde / revenue * 100 : null,
      netMarginPct: (netIncome !== null && revenue) ? netIncome / revenue * 100 : null,
      opMarginPct: (revenue && grossProfit !== null) ? (grossProfit - opex - ownerComp) / revenue * 100 : null,
      payrollPct: (revenue && N(y.payroll) !== null) ? n0(y.payroll) / revenue * 100 : null,
      rentPct: (revenue && N(y.rent) !== null) ? n0(y.rent) / revenue * 100 : null,
      marketingPct: (revenue && N(y.marketing) !== null) ? n0(y.marketing) / revenue * 100 : null,
      capex: N(y.capex)
    };
  }

  /* ---------- multi-year history analysis ---------- */
  function history(deal) {
    const rows = (deal.years || []).filter(y => N(y.revenue) !== null || N(y.sde) !== null || N(y.netIncome) !== null)
      .slice().sort((a, b) => n0(a.year) - n0(b.year)).map(yearMetrics);
    const rev = rows.map(r => r.revenue).filter(v => v !== null);
    const growthYoY = [];
    for (let i = 1; i < rows.length; i++) {
      const g = div((rows[i].revenue ?? 0) - (rows[i-1].revenue ?? 0), rows[i-1].revenue);
      if (g !== null) growthYoY.push(g * 100);
    }
    const mean = growthYoY.length ? growthYoY.reduce((a,b)=>a+b,0) / growthYoY.length : null;
    const volatility = growthYoY.length > 1
      ? Math.sqrt(growthYoY.reduce((t,g)=>t+Math.pow(g-mean,2),0)/(growthYoY.length-1)) : null;
    const latest = rows[rows.length - 1] || null;
    const flags = [];
    for (let i = 1; i < rows.length; i++) {
      const g = growthYoY[i-1];
      if (g !== null && g <= -15) flags.push(`Revenue fell ${Math.abs(g).toFixed(0)}% in ${rows[i].year} — ask the seller why.`);
      if (rows[i].sdeMarginPct !== null && rows[i-1].sdeMarginPct !== null && rows[i].sdeMarginPct - rows[i-1].sdeMarginPct >= 8)
        flags.push(`SDE margin jumped ${(rows[i].sdeMarginPct - rows[i-1].sdeMarginPct).toFixed(0)} pts in ${rows[i].year} — verify it isn't pre-sale expense trimming.`);
    }
    return {
      rows, latest, growthYoY,
      cagr3: rows.length >= 4 ? cagr(rows[rows.length-4].revenue, latest.revenue, 3) : (rows.length >= 2 ? cagr(rows[0].revenue, latest.revenue, rows.length - 1) : null),
      cagr5: rows.length >= 6 ? cagr(rows[rows.length-6].revenue, latest.revenue, 5) : null,
      avgGrowth: mean, volatility, flags,
      revenuePerEmployee: latest && N(deal.basics.employees) ? div(latest.revenue, N(deal.basics.employees)) : null,
      profitPerEmployee: latest && N(deal.basics.employees) ? div(latest.sde, N(deal.basics.employees)) : null
    };
  }

  /* ---------- earnings normalization ----------
     Normalized SDE  = reported SDE ± each adjustment
     Normalized EBITDA = Normalized SDE − market-rate manager salary
     (the honest "you don't work there" earnings figure).       */
  function normalize(deal, a) {
    const h = history(deal);
    const b = deal.basics;
    let reportedSDE = h.latest && h.latest.sde !== null ? h.latest.sde : (N(b.sellerSDE) ?? N(b.sellerCashFlow));
    let reportedEBITDA = h.latest && h.latest.ebitda !== null ? h.latest.ebitda : N(b.sellerEBITDA);
    if (reportedSDE === null && reportedEBITDA !== null) reportedSDE = reportedEBITDA; // conservative: no owner comp info
    const sdeBasis = h.latest && h.latest.sde !== null ? 'financials' : (N(b.sellerSDE) !== null || N(b.sellerCashFlow) !== null ? 'seller' : 'missing');

    let adjTotal = 0; const warnings = [];
    for (const adj of (deal.adjustments || [])) {
      const amt = n0(adj.amount) * (adj.dir === '-' ? -1 : 1);
      adjTotal += amt;
    }
    const aggressive = (deal.adjustments || []).filter(adj =>
      adj.dir !== '-' && (adj.confidence === 'low' || !adj.evidence) && n0(adj.amount) > 0);
    const aggressiveTotal = sum(aggressive.map(x => x.amount));
    if (reportedSDE !== null && aggressiveTotal > 0.15 * Math.max(1, Math.abs(reportedSDE)))
      warnings.push(`${DV.util.money(aggressiveTotal)} of add-backs are unsupported or low-confidence — treat seller earnings claims with skepticism until documented.`);

    const normalizedSDE = reportedSDE !== null ? reportedSDE + adjTotal : null;
    const managerSalary = N(deal.industryAnswers?.managerSalary) ?? a.managerSalary;
    const normalizedEBITDA = normalizedSDE !== null ? normalizedSDE - managerSalary : null;
    const sellerClaimSDE = N(b.sellerSDE) ?? N(b.sellerCashFlow);
    return {
      reportedSDE, reportedEBITDA, sdeBasis, adjTotal, normalizedSDE, normalizedEBITDA,
      managerSalary, aggressive, aggressiveTotal, warnings,
      sellerGap: (sellerClaimSDE !== null && normalizedSDE !== null) ? normalizedSDE - sellerClaimSDE : null
    };
  }

  /* ---------- purchase financing ---------- */
  function financingPresets(price, a) {
    const p = n0(price);
    return {
      cash:   { label: 'All cash',              down: p, sba: 0,        bank: 0,        seller: 0 },
      sba:    { label: 'SBA 7(a)',              down: p * .10, sba: p * .90, bank: 0,   seller: 0 },
      conventional: { label: 'Conventional',    down: p * .25, sba: 0, bank: p * .75,   seller: 0 },
      sellernote:   { label: 'Seller financing',down: p * .30, sba: 0, bank: 0,         seller: p * .70 },
      sbaseller:    { label: 'SBA + seller note', down: p * .10, sba: p * .75, bank: 0, seller: p * .15 },
      custom: { label: 'Custom structure' }
    };
  }

  function financing(deal, a, horizon) {
    const s = deal.structure, b = deal.basics;
    const price = N(s.proposedPrice) ?? N(b.askingPrice) ?? 0;
    const loans = [
      { key: 'sba',    label: 'SBA loan',      amount: n0(s.sbaAmount),    rate: N(s.sbaRate)    ?? a.sbaRate,    term: N(s.sbaTerm)    || a.sbaTermYears, ioMonths: 0 },
      { key: 'bank',   label: 'Bank loan',     amount: n0(s.bankAmount),   rate: N(s.bankRate)   ?? a.bankRate,   term: N(s.bankTerm)   || a.bankTermYears, ioMonths: 0, balloonYear: N(s.balloonYear) },
      { key: 'seller', label: 'Seller note',   amount: n0(s.sellerAmount), rate: N(s.sellerRate) ?? a.sellerRate, term: N(s.sellerTerm) || a.sellerTermYears, ioMonths: n0(s.sellerIOMonths) }
    ].filter(l => l.amount > 0);
    const profiles = loans.map(l => ({ loan: l, p: loanProfile(l, horizon) }));
    const annualDS = Array.from({length: horizon}, (_, y) => profiles.reduce((t, x) => t + x.p.annual[y], 0));
    const principalByYear = Array.from({length: horizon}, (_, y) => profiles.reduce((t, x) => t + x.p.principalByYear[y], 0));
    const debtTotal = sum(loans.map(l => l.amount));
    const down = n0(s.downPayment);
    const fees = n0(s.closingCosts) + n0(s.lenderFees) + n0(s.legalFees) + n0(s.ddFees);
    const extras = n0(s.immediateCapex) + n0(s.wcInjection) + n0(s.inventorySeparate);
    const uses = price + n0(s.realEstatePrice) + fees + extras;
    const sources = down + debtTotal + n0(s.investorEquity);
    const cashRequired = down + fees + extras;      // buyer's cash at closing
    const balloons = profiles.map(x => x.p.balloonAt).filter(Boolean);
    return {
      price, loans, profiles, annualDS, principalByYear, debtTotal,
      down, fees, extras, uses, sources, gap: sources - uses, cashRequired,
      monthlyDS: annualDS[0] / 12,
      ltvPct: div(debtTotal, uses) !== null ? div(debtTotal, uses) * 100 : null,
      equityPct: div(down + n0(s.investorEquity), uses) !== null ? (down + n0(s.investorEquity)) / uses * 100 : null,
      totalInterest: profiles.reduce((t, x) => t + x.p.interestTotal, 0),
      balloons,
      remainingDebtAt: yr => profiles.reduce((t, x) => t + balanceAfter(x.loan.rate, x.loan.term, x.loan.amount, Math.max(0, yr - x.loan.ioMonths / 12)), 0)
    };
  }

  /* ---------- scenario projection engine ----------
     Projects buyer free cash flow after debt service over the
     hold period under a set of growth/margin assumptions.      */
  function project(deal, a, norm, fin, sc, industry) {
    const h = history(deal);
    const rev0 = h.latest?.revenue ?? N(deal.basics.sellerRevenue) ?? 0;
    const holdYears = a.holdYears || 5;
    const ebitda0 = norm.normalizedEBITDA ?? 0;
    const margin0 = rev0 > 0 ? ebitda0 / rev0 * 100 : 0;
    const payrollShare = h.latest?.payrollPct ?? industry?.payrollPct ?? 25;
    const rentShare = h.latest?.rentPct ?? (deal.lease.applicable ? 6 : 0);
    const capexPct = (() => {
      const caps = h.rows.map(r => r.capex).filter(v => v !== null);
      if (caps.length && rev0 > 0) return clamp(sum(caps) / caps.length / rev0 * 100, 0, 15);
      return industry?.capexPct ?? a.maintCapexPctDefault;
    })();
    const g = n0(sc.revGrowth) / 100;
    // margin drag when payroll/rent grow faster than revenue
    const drag = payrollShare * Math.max(0, n0(sc.payrollDelta) - n0(sc.revGrowth)) / 100
               + rentShare * Math.max(0, n0(sc.rentDelta) - n0(sc.revGrowth)) / 100;
    const years = [];
    let rev = rev0, margin = margin0 + n0(sc.marginDelta);
    let cumFCF = 0, payback = null;
    const cashInvested = Math.max(1, fin.cashRequired);
    for (let y = 1; y <= holdYears; y++) {
      rev = rev * (1 + g);
      if (y > 1) margin -= drag;
      const ebitda = rev * margin / 100;
      const maintCapex = rev * capexPct / 100;
      const dWC = Math.max(0, rev - (y === 1 ? rev0 : years[y-2].rev)) * (a.workingCapitalPct / 100);
      const ds = fin.annualDS[y-1] ?? 0;
      const fcfPre = ebitda - maintCapex - dWC;
      const fcf = fcfPre - ds;
      cumFCF += fcf;
      if (payback === null && cumFCF >= cashInvested)
        payback = y - 1 + clamp((cashInvested - (cumFCF - fcf)) / (fcf || 1), 0, 1);
      years.push({ y, rev, margin, ebitda, maintCapex, dWC, ds, fcfPre, fcf,
        dscr: div(fcfPre, ds), sdeView: ebitda + norm.managerSalary });
    }
    // exit: sell at (entry multiple + delta) on final-year normalized EBITDA
    const entryMult = div(fin.price, norm.normalizedEBITDA);
    const exitMult = Math.max(0.5, (entryMult ?? 3) + n0(sc.exitMultDelta) - n0(a.sellingMultipleHaircut));
    const exitEbitda = years[holdYears-1]?.ebitda ?? 0;
    const exitValue = Math.max(0, exitEbitda * exitMult);
    const remDebt = fin.remainingDebtAt(holdYears);
    const exitProceeds = Math.max(0, exitValue * (1 - a.exitCostPct / 100) - remDebt);
    const flows = [-cashInvested, ...years.map((yr, i) => yr.fcf + (i === holdYears - 1 ? exitProceeds : 0))];
    const y1 = years[0] || {};
    const principalPaid = fin.principalByYear.slice(0, holdYears).reduce((a2,b2)=>a2+b2,0);
    return {
      years, cashInvested, exitMult, entryMult, exitValue, exitProceeds, remDebt,
      irr: irr(flows), npv: npv(a.discountRate, flows),
      payback, cumFCF,
      cocY1: div(y1.fcf, cashInvested) !== null ? y1.fcf / cashInvested * 100 : null,
      dscrY1: y1.dscr ?? null,
      fcfY1: y1.fcf ?? null, fcfPreY1: y1.fcfPre ?? null,
      ownerIncomeY1: (y1.fcf ?? 0) + norm.managerSalary,     // if buyer replaces the manager themselves
      equityBuildup: principalPaid,
      wealthCreated: cumFCF + exitProceeds,
      valueAt: yrs2 => { // simple value trajectory for 3/5/10-yr display
        let r = rev0, m = margin0 + n0(sc.marginDelta);
        for (let i = 1; i <= yrs2; i++) { r *= (1 + g); if (i > 1) m -= drag; }
        return Math.max(0, r * m / 100 * exitMult);
      },
      capexPct, defaultRisk: y1.dscr !== null && y1.dscr < 1 ? 'high' : (y1.dscr !== null && y1.dscr < a.minDSCR ? 'elevated' : 'low')
    };
  }

  /* ---------- break-even ----------
     BE revenue = (fixed costs + debt service) / contribution margin.
     Contribution margin ≈ gross margin; fixed ≈ opex + manager.   */
  function breakEven(deal, a, norm, fin) {
    const h = history(deal); const L = h.latest;
    if (!L || L.revenue === null) return { revenue: null, cushionPct: null };
    const gm = (L.grossMarginPct ?? 100) / 100;
    if (gm <= 0.01) return { revenue: null, cushionPct: null };
    const fixed = L.opex + norm.managerSalary + (fin.annualDS[0] ?? 0);
    const beRev = fixed / gm;
    return { revenue: beRev, cushionPct: div(L.revenue - beRev, L.revenue) !== null ? (L.revenue - beRev) / L.revenue * 100 : null };
  }

  /* ---------- stress tests ---------- */
  function stressTests(deal, a, industry) {
    const base = engine(deal, a, null, industry, true);
    if (!base.ok) return [];
    const run = (label, mutate) => {
      const d2 = JSON.parse(JSON.stringify(deal));
      const a2 = JSON.parse(JSON.stringify(a));
      mutate(d2, a2);
      const r = engine(d2, a2, null, industry, true);
      return r.ok ? { label, dscr: r.base.dscrY1, coc: r.base.cocY1, fcf: r.base.fcfY1,
        survives: r.base.dscrY1 === null || r.base.dscrY1 >= 1 } : null;
    };
    const revDrop = p => (d2, a2) => { a2.scenarioDefaults.base.revGrowth = (N(scOf(deal, a).base.revGrowth) ?? 0) - p; d2.scenarios = null; };
    const tests = [
      run('Revenue −5%',  revDrop(5)),  run('Revenue −10%', revDrop(10)),
      run('Revenue −20%', revDrop(20)), run('Revenue −30%', revDrop(30)),
      // payroll shock: immediate margin hit = payroll share of revenue × increase
      ...[5, 10, 20].map(p => run(`Payroll +${p}%`, (d2, a2) => {
        const share = history(deal).latest?.payrollPct ?? industry?.payrollPct ?? 25;
        a2.scenarioDefaults.base.marginDelta = n0(scOf(deal, a).base.marginDelta) - share * p / 100;
        d2.scenarios = null;
      })),
      run('Rates +2 pts', (d2) => { const s = d2.structure;
        s.sbaRate = (N(s.sbaRate) ?? a.sbaRate) + 2; s.bankRate = (N(s.bankRate) ?? a.bankRate) + 2; s.sellerRate = (N(s.sellerRate) ?? a.sellerRate) + 2; }),
      N(deal.ops.topCustomerPct) ? run(`Top customer leaves (−${deal.ops.topCustomerPct}% rev)`, revDrop(N(deal.ops.topCustomerPct))) : null,
      run('Surprise capex (10% of price)', d2 => { d2.structure.immediateCapex = n0(d2.structure.immediateCapex) + 0.10 * (N(d2.structure.proposedPrice) ?? n0(d2.basics.askingPrice)); }),
      run('Must hire full-time manager', d2 => { d2.industryAnswers.managerSalary = (N(deal.industryAnswers?.managerSalary) ?? a.managerSalary) * 1.5; })
    ].filter(Boolean);
    return tests;
  }

  const scOf = (deal, a) => deal.scenarios || a.scenarioDefaults;

  /* ---------- master analysis ----------
     Runs the whole pipeline. Everything downstream (score,
     verdict, offer builder, report) reads this one object.     */
  function engine(deal, a, weights, industry, skipStress) {
    const norm = normalize(deal, a);
    const holdYears = a.holdYears || 5;
    const fin = financing(deal, a, Math.max(holdYears, 10));
    const price = fin.price;
    const ok = norm.normalizedSDE !== null && price > 0;
    const h = history(deal);
    const scen = scOf(deal, a);
    const result = { ok, norm, fin, history: h, price,
      multiples: {
        priceToSDE: div(price, norm.normalizedSDE),
        priceToEBITDA: div(price, norm.normalizedEBITDA),
        priceToRevenue: div(price, h.latest?.revenue ?? N(deal.basics.sellerRevenue)),
        enterpriseValue: price + n0(deal.structure.realEstatePrice),
        equityValue: fin.down + n0(deal.structure.investorEquity)
      }
    };
    if (!ok) return result;
    result.down = project(deal, a, norm, fin, scen.down, industry);
    result.base = project(deal, a, norm, fin, scen.base, industry);
    result.up   = project(deal, a, norm, fin, scen.up, industry);
    result.breakEven = breakEven(deal, a, norm, fin);
    result.roicPct = div(result.base.fcfPreY1 * (1 - a.taxRate / 100), fin.uses) !== null
      ? result.base.fcfPreY1 * (1 - a.taxRate / 100) / fin.uses * 100 : null;
    if (!skipStress) result.stress = stressTests(deal, a, industry);
    return result;
  }

  /* ---------- listing-text importer ----------
     Extracts common fields from pasted broker-listing text.
     Extraction is shown to the user for confirmation and is
     labeled "Listing Imported" — nothing is invented.          */
  function parseListing(text) {
    const t = ' ' + String(text || '') + ' ';
    const money = re => { const m = t.match(re); return m ? parseMoney(m[1]) : null; };
    const parseMoney = s => {
      let v = parseFloat(s.replace(/[$,\s]/g, ''));
      if (/m(illion)?/i.test(s)) v *= 1e6; else if (/k\b/i.test(s)) v *= 1e3;
      return Number.isFinite(v) ? v : null;
    };
    const M = '([\\$][\\d,\\.]+\\s?(?:[MmKk](?:illion)?)?|[\\d,]+(?:\\.\\d+)?\\s?(?:million|[MmKk])\\b)';
    const out = {};
    out.askingPrice = money(new RegExp('(?:asking\\s*price|price|listed\\s*(?:at|for))\\s*[:\\-]?\\s*' + M, 'i'));
    out.sellerRevenue = money(new RegExp('(?:gross\\s*revenue|revenue|gross\\s*sales|sales|gross\\s*income)\\s*[:\\-]?\\s*' + M, 'i'));
    out.sellerCashFlow = money(new RegExp("(?:cash\\s*flow|seller'?s?\\s*discretionary\\s*earnings|sde|owner\\s*benefit)\\s*[:\\-]?\\s*" + M, 'i'));
    out.sellerEBITDA = money(new RegExp('ebitda\\s*[:\\-]?\\s*' + M, 'i'));
    out.rent = money(new RegExp('(?:rent|monthly\\s*rent)\\s*[:\\-]?\\s*' + M, 'i'));
    const est = t.match(/(?:established|founded|est\.?|in business since|operating since)\s*[:\-]?\s*(19\d{2}|20\d{2})/i);
    if (est) out.yearEstablished = parseInt(est[1], 10);
    const emp = t.match(/(?:employees|staff|team of|FTEs?)\s*[:\-]?\s*(\d{1,4})/i) || t.match(/(\d{1,4})\s+(?:employees|staff members)/i);
    if (emp) out.employees = parseInt(emp[1], 10);
    const loc = t.match(/(?:located in|location)\s*[:\-]?\s*([A-Z][A-Za-z\.\s]+?,\s*[A-Z]{2})\b/i);
    if (loc) { const parts = loc[1].split(','); out.city = parts[0].trim(); out.state = (parts[1]||'').trim(); }
    const inv = t.match(new RegExp('inventory\\s*[:\\-]?\\s*' + M, 'i'));
    if (inv) out.inventoryValue = parseMoney(inv[1]);
    Object.keys(out).forEach(k => (out[k] === null || out[k] === undefined) && delete out[k]);
    if (Object.keys(out).length) { // only trust a title when the text looks like a real listing
      const title = String(text || '').split('\n').map(s => s.trim()).find(s => s.length > 8 && s.length < 120);
      if (title) out.listingTitle = title;
    }
    return out;
  }

  return { N, n0, div, sum, clamp, pmt, balanceAfter, loanProfile, npv, irr, cagr,
    yearMetrics, history, normalize, financing, financingPresets, project, breakEven,
    stressTests, engine, parseListing, scOf, OPEX_KEYS };
})();

if (typeof module !== 'undefined') module.exports = window.DV;
