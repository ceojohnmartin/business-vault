/* ============================================================
   Deal Vault — core.js
   Utilities, data store (localStorage), global assumptions.
   The store is deliberately isolated behind DV.store so a
   remote backend (e.g. Supabase) can replace it later without
   touching the rest of the app.
   ============================================================ */
window.DV = window.DV || {};

/* ---------- tiny DOM / formatting utilities ---------- */
DV.util = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = v => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,%\s,]/g, ''));
    return Number.isFinite(n) ? n : null;
  };
  const money = (v, opts = {}) => {
    const n = num(v);
    if (n === null) return '—';
    const abs = Math.abs(n);
    if (opts.compact && abs >= 1e6) return (n < 0 ? '-' : '') + '$' + (abs / 1e6).toFixed(abs >= 1e7 ? 1 : 2) + 'M';
    if (opts.compact && abs >= 1e4) return (n < 0 ? '-' : '') + '$' + Math.round(abs / 1e3) + 'K';
    return (n < 0 ? '-' : '') + '$' + Math.round(abs).toLocaleString('en-US');
  };
  const pct = (v, dp = 1) => { const n = num(v); return n === null ? '—' : n.toFixed(dp) + '%'; };
  const ratio = (v, dp = 2) => { const n = num(v); return n === null ? '—' : n.toFixed(dp) + 'x'; };
  const yrs = v => { const n = num(v); return n === null ? '—' : (n >= 50 ? '50+ yrs' : n.toFixed(1) + ' yrs'); };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const uid = () => 'id' + Math.random().toString(36).slice(2, 10) + (DV._uidC = (DV._uidC || 0) + 1);
  const el = (tag, attrs = {}, html = '') => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(e.dataset, v);
      else e.setAttribute(k, v);
    }
    if (html) e.innerHTML = html;
    return e;
  };
  const daysAgo = ts => {
    if (!ts) return '—';
    const d = Math.floor((Date.now() - ts) / 86400000);
    return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago';
  };
  const dateStr = ts => ts ? new Date(ts).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}) : '—';
  return { esc, num, money, pct, ratio, yrs, clamp, uid, el, daysAgo, dateStr };
})();

/* ---------- data source labels (data confidence system) ---------- */
DV.SOURCES = {
  seller:   { label: 'Seller Provided',  short: 'Seller',   trust: 0.45, cls: 'src-seller' },
  imported: { label: 'Listing Imported', short: 'Imported', trust: 0.40, cls: 'src-imported' },
  verified: { label: 'Document Verified',short: 'Verified', trust: 1.00, cls: 'src-verified' },
  user:     { label: 'User Entered',     short: 'Entered',  trust: 0.70, cls: 'src-user' },
  public:   { label: 'Public Data',      short: 'Public',   trust: 0.80, cls: 'src-public' },
  estimated:{ label: 'Estimated',        short: 'Estimate', trust: 0.30, cls: 'src-estimated' },
  missing:  { label: 'Missing',          short: 'Missing',  trust: 0.00, cls: 'src-missing' }
};

/* ---------- deal pipeline stages ---------- */
DV.STAGES = ['Discovered','Initial Review','Seller Contacted','NDA Signed','Financials Requested',
  'Underwriting','LOI Submitted','Due Diligence','Financing','Closing','Passed','Acquired'];
DV.STAGE_DONE = ['Passed','Acquired'];

/* ---------- verdict bands ---------- */
DV.VERDICTS = [
  { min: 85, label: 'Exceptional Deal', cls: 'v-exceptional' },
  { min: 75, label: 'Great Deal',       cls: 'v-great' },
  { min: 65, label: 'Good Deal',        cls: 'v-good' },
  { min: 55, label: 'Fair Deal',        cls: 'v-fair' },
  { min: 45, label: 'Weak Deal',        cls: 'v-weak' },
  { min: 30, label: 'High Risk',        cls: 'v-highrisk' },
  { min: 0,  label: 'Avoid',            cls: 'v-avoid' }
];
DV.verdictFor = score => DV.VERDICTS.find(v => score >= v.min);

/* ---------- default global assumptions (editable in Assumptions view) ---------- */
DV.DEFAULT_ASSUMPTIONS = {
  sbaRate: 10.5, sbaTermYears: 10,            // SBA 7(a) typical
  bankRate: 9.0, bankTermYears: 7,
  sellerRate: 6.0, sellerTermYears: 5,
  discountRate: 15,                            // NPV discount for small-biz risk
  taxRate: 25,
  managerSalary: 75000,                        // market-rate replacement manager
  buyerSalary: 60000,                          // owner-operator living draw
  workingCapitalPct: 5,                        // % of revenue held as WC
  maintCapexPctDefault: 2,                     // % of revenue if no history
  safeDSCR: 1.25, minDSCR: 1.10,
  targetCoC: 20, targetPayback: 4, holdYears: 5,
  exitCostPct: 8,                              // broker + closing on exit
  sellingMultipleHaircut: 0,                   // adj vs entry multiple at exit
  weights: {                                   // Deal Score category weights (%)
    financial: 20, valuation: 15, returns: 15, financing: 10, operations: 10,
    growth: 10, location: 8, revenueQuality: 5, seller: 4, legal: 3
  },
  scenarioDefaults: {
    down: { revGrowth: -10, marginDelta: -2, payrollDelta: 5, rentDelta: 3, exitMultDelta: -0.5 },
    base: { revGrowth: 2,   marginDelta: 0,  payrollDelta: 3, rentDelta: 2, exitMultDelta: 0 },
    up:   { revGrowth: 8,   marginDelta: 1,  payrollDelta: 3, rentDelta: 2, exitMultDelta: 0.5 }
  }
};

/* ---------- persistent store ---------- */
DV.store = (() => {
  const KEY = 'dealvault.v1';
  let state = null;

  const blank = () => ({
    version: 1,
    createdAt: Date.now(),
    assumptions: JSON.parse(JSON.stringify(DV.DEFAULT_ASSUMPTIONS)),
    deals: [],
    settings: { theme: 'auto', pinHash: null, demoSeeded: false, onboarded: false }
  });

  const load = () => {
    if (state) return state;
    try {
      const raw = localStorage.getItem(KEY);
      state = raw ? JSON.parse(raw) : blank();
    } catch (e) { state = blank(); }
    // merge any new assumption keys added in later versions
    const def = DV.DEFAULT_ASSUMPTIONS;
    state.assumptions = Object.assign({}, def, state.assumptions);
    state.assumptions.weights = Object.assign({}, def.weights, state.assumptions.weights);
    state.assumptions.scenarioDefaults = Object.assign({}, def.scenarioDefaults, state.assumptions.scenarioDefaults);
    return state;
  };

  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.error('DealVault: save failed', e); DV.app && DV.app.toast('Storage full — export a backup and archive old deals.', 'warn'); }
  };

  const deals = (includeArchived = false) =>
    load().deals.filter(d => includeArchived || !d.archived);
  const deal = id => load().deals.find(d => d.id === id) || null;
  const upsertDeal = d => {
    load();
    d.updatedAt = Date.now();
    const i = state.deals.findIndex(x => x.id === d.id);
    if (i >= 0) state.deals[i] = d; else state.deals.push(d);
    save();
    return d;
  };
  const removeDeal = id => { load(); state.deals = state.deals.filter(d => d.id !== id); save(); };
  const assumptions = () => load().assumptions;
  const setAssumptions = a => { load(); state.assumptions = a; save(); };
  const settings = () => load().settings;
  const setSettings = s => { load(); state.settings = s; save(); };

  const exportJSON = () => JSON.stringify(load(), null, 2);
  const importJSON = json => {
    const data = JSON.parse(json);
    if (!data || !Array.isArray(data.deals)) throw new Error('Not a valid Deal Vault backup file.');
    state = data; save(); return state.deals.length;
  };
  const wipe = () => { state = blank(); save(); };

  return { load, save, deals, deal, upsertDeal, removeDeal, assumptions, setAssumptions, settings, setSettings, exportJSON, importJSON, wipe };
})();

/* ---------- new-deal factory ---------- */
DV.newDeal = () => ({
  id: DV.util.uid(),
  createdAt: Date.now(), updatedAt: Date.now(),
  stage: 'Discovered', tags: [], archived: false, isDemo: false,
  mode: 'quick',                       // 'quick' | 'full'
  wizardStep: 0,
  source: { method: 'manual', url: '', listingText: '', docs: [] },
  fieldSources: {},                    // fieldPath -> source key
  basics: {
    name: '', listingTitle: '', listingUrl: '', industry: '', subIndustry: '',
    model: '', description: '', yearEstablished: null, city: '', state: '',
    serviceArea: '', locations: 1, franchise: 'independent', format: 'physical',
    reasonForSelling: '', ownerInvolvement: 'full-time', employees: null, managers: null,
    hours: '', seasonality: 'low', licensesRequired: '', realEstateIncluded: false,
    inventoryIncluded: true, inventoryValue: null, equipmentIncluded: true, vehiclesIncluded: false,
    askingPrice: null, sellerRevenue: null, sellerCashFlow: null, sellerSDE: null, sellerEBITDA: null
  },
  years: [],                           // oldest -> newest financial years
  adjustments: [],                     // normalization add-backs / deductions
  structure: {
    proposedPrice: null, downPayment: null,
    sbaAmount: null, sbaRate: null, sbaTerm: null,
    bankAmount: null, bankRate: null, bankTerm: null,
    sellerAmount: null, sellerRate: null, sellerTerm: null, sellerIOMonths: 0, balloonYear: null,
    earnout: null, earnoutTerms: '', investorEquity: null,
    closingCosts: null, lenderFees: null, legalFees: null, ddFees: null,
    immediateCapex: null, wcInjection: null, inventorySeparate: null, realEstatePrice: null,
    personalGuarantee: true, collateral: '', preset: 'sba'
  },
  ops: {
    ratings: {}, recurringRevenuePct: null, topCustomerPct: null, top5Pct: null, top10Pct: null,
    retentionPct: null, reviewScore: null, reviewCount: null
  },
  location: {
    population: null, popGrowthPct: null, medianIncome: null, employmentGrowthPct: null,
    trafficCount: null, dataSource: '', dataDate: '',
    ratings: {}, locationDependent: null, relocatable: null, territory: ''
  },
  lease: {
    applicable: true, monthlyRent: null, annualIncreasePct: null, yearsRemaining: null,
    renewalOptions: '', assignment: '', landlordApprovalNeeded: null, personalGuarantee: null,
    nnn: null, camMonthly: null, sqft: null, marketRentMonthly: null,
    renovationsNeeded: null, zoning: '', parking: '', sellerOwnsProperty: null, purchaseOption: null
  },
  industryAnswers: {},
  risks: [],
  dd: [],
  scenarios: null,                     // null => use global defaults
  verification: { taxReturns: false, pl: false, bank: false, sellerCooperative: null, cashRevenuePct: null },
  opsPlan: { managerNeeded: null },
  notes: [], tasks: [],
  watch: { onWatchlist: false, priceHistory: [], daysOnMarket: null, statusNote: '', oppRating: null }
});

/* set / read a field's data-source label */
DV.setSource = (deal, path, src) => { deal.fieldSources[path] = src; };
DV.getSource = (deal, path) => deal.fieldSources[path] || null;

if (typeof module !== 'undefined') module.exports = DV; // node tests
