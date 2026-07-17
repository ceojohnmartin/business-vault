/* ============================================================
   Deal Vault — calculation test suite (Node, no deps)
   Run: node tests/calc.test.js
   ============================================================ */
'use strict';
global.window = global;
const store = {};
global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } };
global.document = undefined;

require('../js/core.js');
require('../js/calc.js');
require('../js/industries.js');
require('../js/score.js');
require('../js/demo.js');

const C = DV.calc;
let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; } else { fail++; console.error('  ✗ FAIL:', name); } };
const near = (a, b, tol, name) => ok(a !== null && a !== undefined && Math.abs(a - b) <= tol, `${name} (got ${a}, want ${b}±${tol})`);

/* ---------- loan math ---------- */
// $100,000 @ 6% / 30yr → classic $599.55/mo
near(C.pmt(6, 30, 100000), 599.55, 0.05, 'pmt 30yr mortgage');
// zero-rate loan amortizes linearly
near(C.pmt(0, 10, 120000), 1000, 0.01, 'pmt zero rate');
near(C.balanceAfter(6, 30, 100000, 30), 0, 1, 'balance fully paid at maturity');
ok(C.balanceAfter(6, 30, 100000, 5) > 90000 && C.balanceAfter(6, 30, 100000, 5) < 95000, 'balance after 5yr in range');
// loan profile: interest-only period keeps balance flat
const io = C.loanProfile({ amount: 100000, rate: 6, term: 5, ioMonths: 12 }, 7);
near(io.annual[0], 6000 * (1 + 0.0016), 60, 'IO year ≈ interest only');
ok(io.principalByYear[0] === 0, 'no principal during IO year');
ok(Math.abs(io.annual.slice(0, 7).reduce((a, b) => a + b, 0) - (6000 + C.pmt(6, 5, 100000) * 60 / 5 * 5)) < 500, 'IO + amort total sane');

/* ---------- TVM ---------- */
near(C.irr([-100, 0, 0, 0, 0, 161.051]), 10, 0.05, 'IRR 10% compounding');
near(C.irr([-100, 30, 30, 30, 30, 130]), 30, 0.1, 'IRR mixed flows');
ok(C.irr([100, 100]) === null, 'IRR undefined without sign change');
near(C.npv(10, [-100, 110]), 0, 0.01, 'NPV zero at discount = return');
near(C.cagr(100, 200, 5), 14.87, 0.05, 'CAGR doubling in 5yr');
ok(C.cagr(0, 200, 5) === null, 'CAGR safe on zero start');

/* ---------- P&L metrics ---------- */
const ym = C.yearMetrics({ year: 2025, revenue: 1000000, cogs: 300000, payroll: 200000, rent: 60000, ownerSalary: 100000, ownerBenefits: 20000, personalExpenses: 10000 });
near(ym.grossProfit, 700000, 1, 'gross profit');
near(ym.ebitda, 1000000 - 300000 - 260000 - 130000, 1, 'EBITDA from lines');       // 310,000
near(ym.sde, 310000 + 130000, 1, 'SDE = EBITDA + owner comp');                     // 440,000
near(ym.grossMarginPct, 70, 0.01, 'gross margin %');
// fallback: netIncome + I + D + A
const ym2 = C.yearMetrics({ year: 2024, netIncome: 80000, interest: 10000, depreciation: 15000, amortization: 5000 });
near(ym2.ebitda, 110000, 1, 'EBITDA fallback from net income');
// division-by-zero safety
const ym3 = C.yearMetrics({ year: 2023, revenue: 0, cogs: 0 });
ok(ym3.sdeMarginPct === null || isFinite(ym3.sdeMarginPct ?? 0), 'no NaN on zero revenue');

/* ---------- normalization ---------- */
const a = JSON.parse(JSON.stringify(DV.DEFAULT_ASSUMPTIONS));
const deal = DV.newDeal();
deal.basics.industry = 'carwash';
deal.basics.askingPrice = 1200000;
deal.years = [
  { year: 2023, revenue: 700000, cogs: 70000, payroll: 140000, rent: 60000, ownerSalary: 80000, capex: 25000 },
  { year: 2024, revenue: 750000, cogs: 75000, payroll: 150000, rent: 62000, ownerSalary: 80000, capex: 25000 },
  { year: 2025, revenue: 800000, cogs: 80000, payroll: 160000, rent: 64000, ownerSalary: 80000, capex: 25000 }
];
deal.adjustments = [
  { desc: 'one-time legal', amount: 10000, dir: '+', recurring: false, evidence: 'invoice', confidence: 'high' },
  { desc: 'needed marketing', amount: 5000, dir: '-', recurring: true, evidence: '', confidence: 'med' }
];
const norm = C.normalize(deal, a);
near(norm.reportedSDE, 800000 - 80000 - 160000 - 64000 - 80000 + 80000, 1, 'reported SDE from latest year'); // 496,000
near(norm.normalizedSDE, norm.reportedSDE + 5000, 1, 'normalized SDE applies signed adjustments');
near(norm.normalizedEBITDA, norm.normalizedSDE - a.managerSalary, 1, 'normalized EBITDA subtracts manager');

/* aggressive add-back warning */
const dealAgg = JSON.parse(JSON.stringify(deal));
dealAgg.adjustments = [{ desc: 'vibes', amount: 200000, dir: '+', recurring: true, evidence: '', confidence: 'low' }];
ok(C.normalize(dealAgg, a).warnings.length === 1, 'aggressive add-backs produce warning');

/* ---------- financing ---------- */
deal.structure.proposedPrice = 1200000;
deal.structure.downPayment = 120000;
deal.structure.sbaAmount = 960000;
deal.structure.sellerAmount = 120000;
deal.structure.closingCosts = 15000;
const fin = C.financing(deal, a, 10);
near(fin.uses, 1215000, 1, 'uses = price + fees');
near(fin.sources, 1200000, 1, 'sources = down + debt');
near(fin.gap, -15000, 1, 'gap detected');
near(fin.cashRequired, 135000, 1, 'cash required = down + fees');
ok(fin.ltvPct > 85 && fin.ltvPct < 92, 'LTV in range');
const expectedDS = C.pmt(a.sbaRate, a.sbaTermYears, 960000) * 12 + C.pmt(a.sellerRate, a.sellerTermYears, 120000) * 12;
near(fin.annualDS[0], expectedDS, expectedDS * 0.01, 'annual debt service = Σ loan payments');

/* ---------- engine / projections ---------- */
const ind = DV.industries.get('carwash');
const res = C.engine(deal, a, null, ind);
ok(res.ok, 'engine runs with price + earnings');
near(res.multiples.priceToSDE, 1200000 / res.norm.normalizedSDE, 0.01, 'price/SDE multiple');
const manualDSCR = (res.base.years[0].fcfPre) / res.fin.annualDS[0];
near(res.base.dscrY1, manualDSCR, 0.001, 'DSCR = FCF-pre-debt / debt service');
const manualCoC = res.base.years[0].fcf / res.fin.cashRequired * 100;
near(res.base.cocY1, manualCoC, 0.01, 'CoC = FCF-after-debt / cash invested');
ok(res.base.irr !== null && res.base.irr > 0, 'IRR computed');
ok(res.down.fcfY1 < res.base.fcfY1 && res.base.fcfY1 < res.up.fcfY1, 'scenario ordering: down < base < up');
ok(res.breakEven.revenue > 0 && res.breakEven.revenue < 800000, 'break-even below current revenue for profitable biz');
ok(res.stress.length >= 9, 'stress tests generated');
const rev30 = res.stress.find(s => s.label === 'Revenue −30%');
ok(rev30.dscr < res.base.dscrY1, 'revenue stress lowers DSCR');

/* payroll stress is immediate */
const pay20 = res.stress.find(s => s.label === 'Payroll +20%');
ok(pay20 && pay20.dscr < res.base.dscrY1 - 0.01, 'payroll stress hits year-1 DSCR');

/* ---------- score + deal breakers ---------- */
global.window.DV = DV; // score reads DV.store.assumptions()
const sc = DV.score.compute(deal);
ok(sc.finalScore >= 0 && sc.finalScore <= 100, 'score within 0–100');
ok(sc.verdict && sc.verdict.label, 'verdict assigned');
ok(Object.keys(sc.cats).length === 10, '10 scoring categories');
near(Object.values(sc.cats).reduce((t, c) => t + c.w, 0), 100, 0.01, 'default weights total 100');

/* an over-levered deal must get capped */
const bad = JSON.parse(JSON.stringify(deal));
bad.structure.proposedPrice = 3500000; bad.structure.downPayment = 350000; bad.structure.sbaAmount = 3150000; bad.structure.sellerAmount = 0;
const scBad = DV.score.compute(bad);
ok(scBad.breakers.some(b => /Debt service|DSCR/.test(b.label)), 'over-levered deal triggers DSCR breaker');
ok(scBad.finalScore <= 50, 'breaker caps the score');
/* seller refusing verification caps */
const shady = JSON.parse(JSON.stringify(deal));
shady.verification.sellerCooperative = false;
ok(DV.score.compute(shady).finalScore <= 40, 'unverifiable earnings cap at 40');
/* customer concentration */
const conc = JSON.parse(JSON.stringify(deal));
conc.ops.topCustomerPct = 55;
ok(DV.score.compute(conc).breakers.some(b => /concentration/i.test(b.label)), 'severe concentration flagged');

/* ---------- offer + levers ---------- */
const off = DV.score.offer(deal, sc);
ok(off.maxPrice > 0 && off.idealOffer < off.maxPrice && off.initialOffer < off.idealOffer, 'offer ladder ordered');
const scB2 = DV.score.compute(bad);
const lv = DV.score.levers(bad, scB2);
ok(lv.length >= 3, 'levers generated for weak deal');
const priceCut = lv.find(l => /Reduce price/.test(l.label));
ok(priceCut && priceCut.delta.score > 0, 'price-cut lever raises score');

/* repriced() keeps structure proportional */
const rp = DV.score.repriced(deal, 600000);
near(C.n0(rp.structure.downPayment) / 600000, 0.1, 0.001, 'repriced keeps down% mix');

/* ---------- listing parser ---------- */
const parsed = C.parseListing(`Established HVAC Company — Motivated Seller
Asking Price: $1,250,000
Gross Revenue: $2.4M   Cash Flow: $410,000
Established: 2004. Employees: 14
Located in Plano, TX. Monthly rent: $4,500`);
near(parsed.askingPrice, 1250000, 1, 'parser: asking price');
near(parsed.sellerRevenue, 2400000, 1, 'parser: revenue with M suffix');
near(parsed.sellerCashFlow, 410000, 1, 'parser: cash flow');
ok(parsed.yearEstablished === 2004, 'parser: year established');
ok(parsed.employees === 14, 'parser: employees');
ok(parsed.city === 'Plano' && parsed.state === 'TX', 'parser: location');
ok(Object.keys(C.parseListing('nothing useful here')).length === 0, 'parser: no fabrication from empty text');

/* ---------- industries & DD ---------- */
ok(DV.industries.LIST.length >= 22, '22+ industry templates');
ok(DV.industries.LIST.every(i => i.multLow < i.multFair && i.multFair < i.multHigh), 'multiple bands ordered');
const dd = DV.ddGenerate(deal);
ok(dd.length >= 30, 'DD checklist ≥ 30 items');
ok(dd.some(i => i.group === 'Industry'), 'DD includes industry-specific items');
ok(dd.some(i => /SBA/.test(i.label)), 'DD includes SBA items when SBA-financed');

/* ---------- demo deals hit their intended bands ---------- */
DV.demo.seed();
const wash = DV.store.deal('demo-carwash'), pest = DV.store.deal('demo-pest'), hammer = DV.store.deal('demo-hammer');
const sWash = DV.score.analyze(wash), sPest = DV.score.analyze(pest), sHammer = DV.score.analyze(hammer);
console.log(`  demo scores → wash ${sWash.finalScore} (${sWash.verdict.label}) | pest ${sPest.finalScore} (${sPest.verdict.label}) | hammer ${sHammer.finalScore} (${sHammer.verdict.label})`);
ok(sWash.finalScore >= 65, 'demo car wash is attractive (≥65)');
ok(sPest.finalScore >= 45 && sPest.finalScore <= 64, 'demo pest control is borderline (45–64)');
ok(sHammer.finalScore <= 44, 'demo home services is poor (≤44)');
ok(sWash.confidence.score > sHammer.confidence.score, 'verified deal has higher confidence');
ok(sHammer.breakers.length >= 2, 'poor deal carries multiple deal-breakers');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
