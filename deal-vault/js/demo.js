/* ============================================================
   Deal Vault — demo.js
   Three FICTIONAL demo opportunities (clearly labeled):
   1. SplashWorks Express Wash   — attractive
   2. GreenShield Pest Control   — borderline
   3. Hammer Bros Home Services  — poor
   All figures are invented for illustration only.
   ============================================================ */
window.DV = window.DV || {};

DV.demo = (() => {
  function make(overrides) {
    const d = DV.newDeal();
    deepMerge(d, overrides);
    d.isDemo = true; d.mode = 'full';
    d.wizardStep = 11;
    if (!d.dd.length) d.dd = DV.ddGenerate(d);
    return d;
  }
  function deepMerge(t, s) {
    for (const [k, v] of Object.entries(s)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && t[k] && typeof t[k] === 'object' && !Array.isArray(t[k])) deepMerge(t[k], v);
      else t[k] = v;
    }
  }
  const day = 86400000;

  function seed() {
    const now = Date.now();

    /* ---------- 1. attractive: express car wash ---------- */
    const wash = make({
      id: 'demo-carwash', createdAt: now - 21 * day, updatedAt: now - 2 * day,
      stage: 'LOI Submitted', tags: ['demo', 'recurring-revenue'],
      source: { method: 'paste', url: '', listingText: '', docs: [
        { name: '2021–2025 tax returns.pdf', type: 'named' }, { name: 'P&L by month (POS export).xlsx', type: 'named' },
        { name: 'Membership churn report.csv', type: 'named' }, { name: 'Lease + amendments.pdf', type: 'named' }] },
      basics: {
        name: 'SplashWorks Express Wash', listingTitle: 'High-Volume Express Tunnel Car Wash — Growing Membership Base',
        industry: 'carwash', subIndustry: 'Express exterior tunnel', model: 'Unlimited-wash membership + retail washes',
        description: 'FICTIONAL DEMO. 110-ft express tunnel on a signalized corner. 1,450 active unlimited members billed monthly; free vacuums; 2 attendants per shift. Seller built it in 2016, relocating out of state.',
        yearEstablished: 2016, city: 'Franklin', state: 'TN', serviceArea: '5-mile radius', locations: 1,
        franchise: 'independent', format: 'physical', reasonForSelling: 'Relocating out of state (spouse\'s job)',
        ownerInvolvement: 'semi-absentee', employees: 9, managers: 1, hours: '7a–8p daily', seasonality: 'moderate',
        licensesRequired: 'Standard business license; water reclaim permit',
        realEstateIncluded: false, inventoryIncluded: true, inventoryValue: 9000, equipmentIncluded: true, vehiclesIncluded: false,
        askingPrice: 1395000, sellerRevenue: 780000, sellerCashFlow: 372000, sellerSDE: 372000, sellerEBITDA: null
      },
      years: [
        { year: 2021, revenue: 612000, cogs: 63000, payroll: 96000, rent: 66000, utilities: 36000, marketing: 21000, insurance: 12000, repairs: 19000, software: 5000, professional: 7000, taxes: 8000, otherOpex: 10000, ownerSalary: 60000, ownerBenefits: 11000, personalExpenses: 7000, interest: 14000, depreciation: 62000, capex: 24000 },
        { year: 2022, revenue: 654000, cogs: 66000, payroll: 101000, rent: 68000, utilities: 38000, marketing: 20000, insurance: 12500, repairs: 21000, software: 5200, professional: 7200, taxes: 8300, otherOpex: 10500, ownerSalary: 60000, ownerBenefits: 11500, personalExpenses: 7500, interest: 13000, depreciation: 60000, capex: 21000 },
        { year: 2023, revenue: 701000, cogs: 70000, payroll: 107000, rent: 70000, utilities: 40000, marketing: 19000, insurance: 13000, repairs: 23000, software: 5600, professional: 7600, taxes: 8600, otherOpex: 11000, ownerSalary: 60000, ownerBenefits: 12000, personalExpenses: 8000, interest: 12000, depreciation: 58000, capex: 26000 },
        { year: 2024, revenue: 743000, cogs: 74000, payroll: 112000, rent: 71500, utilities: 41000, marketing: 18500, insurance: 13600, repairs: 24000, software: 5800, professional: 7800, taxes: 8800, otherOpex: 11500, ownerSalary: 60000, ownerBenefits: 12000, personalExpenses: 8000, interest: 11000, depreciation: 56000, capex: 28000 },
        { year: 2025, revenue: 780000, cogs: 78000, payroll: 117000, rent: 72000, utilities: 42000, marketing: 18000, insurance: 14000, repairs: 25000, software: 6000, professional: 8000, taxes: 9000, otherOpex: 12000, ownerSalary: 60000, ownerBenefits: 12000, personalExpenses: 8000, interest: 10000, depreciation: 55000, capex: 30000 }
      ],
      adjustments: [
        { id: 'wa1', desc: 'One-time lot repaving (2025)', amount: 18000, dir: '+', recurring: false, evidence: 'Contractor invoice 8/2025', confidence: 'high' },
        { id: 'wa2', desc: 'Owner personal expenses (verified)', amount: 8000, dir: '+', recurring: true, evidence: 'Card statements tied to GL', confidence: 'high' },
        { id: 'wa3', desc: 'Deferred brush/pump refresh needed', amount: 12000, dir: '-', recurring: true, evidence: 'Equipment inspection 9/2025', confidence: 'med' }
      ],
      structure: {
        proposedPrice: 1320000, downPayment: 132000, sbaAmount: 990000, sbaRate: 10.5, sbaTerm: 10,
        sellerAmount: 198000, sellerRate: 6, sellerTerm: 6, sellerIOMonths: 0,
        closingCosts: 15000, lenderFees: 26000, legalFees: 9000, ddFees: 12000,
        immediateCapex: 15000, wcInjection: 25000, personalGuarantee: true, preset: 'sbaseller'
      },
      ops: {
        ratings: { ownerDependence: 3, managementStrength: 7, employeeTurnover: 4, keyPersonRisk: 2, vendorConcentration: 3, contractQuality: 6, leadDiversity: 7, marketingDependence: 3, competitiveAdvantage: 7, pricingPower: 6, salesProcess: 7, sopDocumentation: 6, techSystems: 8, reportingQuality: 8, inventoryControls: 6, equipmentCondition: 7, deferredMaintenance: 3, capacityHeadroom: 8, expansionPotential: 7, scalability: 6, regulatoryBurden: 3, legalExposure: 1, cyberExposure: 2, envExposure: 3 },
        recurringRevenuePct: 46, topCustomerPct: 2, top5Pct: 6, top10Pct: 9, retentionPct: 88, reviewScore: 4.6, reviewCount: 812
      },
      location: {
        population: 86000, popGrowthPct: 2.2, medianIncome: 84000, employmentGrowthPct: 2.0, trafficCount: 24500,
        dataSource: 'US Census ACS + TDOT counts', dataDate: '2024',
        ratings: { traffic: 8, visibility: 8, accessibility: 7, competition: 3, saturation: 3, demand: 7, demographics: 8, development: 8, crime: 2, disaster: 4, regulation: 3, labor: 6, rentTrend: 5, industryLocal: 7 },
        locationDependent: true, relocatable: false, territory: 'Competitive but healthy'
      },
      lease: { applicable: true, monthlyRent: 6000, annualIncreasePct: 2.5, yearsRemaining: 12, renewalOptions: '2 × 5 years', assignment: 'Assignable with landlord consent (not to be unreasonably withheld)', landlordApprovalNeeded: true, personalGuarantee: true, nnn: true, camMonthly: 950, sqft: 4200, marketRentMonthly: 6200 },
      industryAnswers: { carsPerDay: 165, avgTicket: 12.5, membershipRevenuePct: 46, membershipChurnPct: 4.5, capacityPct: 55, tunnelLengthFt: 110, equipmentAgeYears: 4, waterChemPctRev: 11, trafficCount: 24500, competitorsIn3mi: 1, landOwned: false, weatherSensitivity: 'Medium', managerSalary: 65000, sellerStayMonths: 3 },
      risks: [
        { id: 'wr1', name: 'New competitor tunnel announced 4 mi away', category: 'Market', probability: 3, severity: 3, impact: 60000, evidence: 'Permit filing', mitigation: 'Lock members into annual plans pre-open; corner site advantage', dealBreaker: false, owner: 'Me', due: '', status: 'Mitigating' },
        { id: 'wr2', name: 'Tunnel equipment failure (major)', category: 'Operational', probability: 2, severity: 4, impact: 120000, evidence: 'Equipment is 4 yrs old, serviced', mitigation: 'Pre-close inspection + $15k immediate capex reserve', dealBreaker: false, owner: 'Me', due: '', status: 'Mitigating' },
        { id: 'wr3', name: 'Membership churn spike at ownership change', category: 'Transition', probability: 2, severity: 3, impact: 45000, evidence: 'Billing is automated; brand stays', mitigation: '90-day member perks; keep site manager', dealBreaker: false, owner: 'Me', due: '', status: 'Open' }
      ],
      verification: { taxReturns: true, pl: true, bank: true, sellerCooperative: true, cashRevenuePct: 4 },
      notes: [
        { ts: now - 14 * day, text: 'Walked the site Saturday 10am — line 6 cars deep, both vacuums full. Manager (Dana) runs day-to-day and wants to stay.' },
        { ts: now - 6 * day, text: 'Seller open to 15% note, 6-yr term. Confirmed relocation timeline (March).' }],
      tasks: [
        { id: 'wt1', text: 'Get landlord meeting on assignment + option extension', done: false },
        { id: 'wt2', text: 'Tunnel equipment inspection (third party)', done: true },
        { id: 'wt3', text: 'Verify member count against billing processor export', done: true }],
      fieldSources: { 'basics.askingPrice': 'seller', 'basics.sellerRevenue': 'verified', 'basics.sellerCashFlow': 'verified', 'basics.sellerSDE': 'verified', 'lease.monthlyRent': 'verified', 'location.popGrowthPct': 'public', 'location.medianIncome': 'public', 'location.trafficCount': 'public' }
    });
    ['3–5 years of business tax returns', 'Profit & loss statements (monthly, 36 mo)', 'Bank statements (24 mo) tied to P&L', 'Add-back support for every adjustment', 'Membership roster + churn export', 'POS wash-count reports (24 months)'].forEach(l => {
      const i = wash.dd.find(x => x.label === l); if (i) i.status = 'Reviewed';
    });
    const leaseItem = wash.dd.find(x => x.label.startsWith('Lease')); if (leaseItem) leaseItem.status = 'Received';

    /* ---------- 2. borderline: pest control ---------- */
    const pest = make({
      id: 'demo-pest', createdAt: now - 12 * day, updatedAt: now - 1 * day,
      stage: 'Financials Requested', tags: ['demo', 'route-business'],
      watch: { onWatchlist: true, priceHistory: [{ ts: now - 150 * day, price: 950000 }, { ts: now - 40 * day, price: 895000 }, { ts: now - 10 * day, price: 875000 }], daysOnMarket: 152, statusNote: 'Price cut twice — broker says seller “motivated.” Ask why it hasn\'t sold.', oppRating: 'Lukewarm' },
      basics: {
        name: 'GreenShield Pest Control', listingTitle: 'Established Pest Control Route — 68% Recurring Revenue',
        industry: 'pestcontrol', subIndustry: 'Residential general pest + termite', model: 'Quarterly service agreements',
        description: 'FICTIONAL DEMO. 1,050 active accounts, 5 techs, 6 wrapped trucks. Solid recurring base but the owner is the only salesperson and churn is creeping up. On the market 5 months with two price cuts.',
        yearEstablished: 2009, city: 'Mesa', state: 'AZ', serviceArea: 'East Valley', locations: 1,
        franchise: 'independent', format: 'mobile', reasonForSelling: 'Owner burnout — wants to exit day-to-day',
        ownerInvolvement: 'full-time', employees: 7, managers: 0, hours: 'M–Sat', seasonality: 'moderate',
        licensesRequired: 'AZ OPM applicator licenses (all techs)', realEstateIncluded: false, inventoryIncluded: true, inventoryValue: 12000, equipmentIncluded: true, vehiclesIncluded: true,
        askingPrice: 875000, sellerRevenue: 705000, sellerCashFlow: 232000, sellerSDE: 232000
      },
      years: [
        { year: 2023, revenue: 648000, cogs: 52000, payroll: 246000, rent: 24000, utilities: 8000, marketing: 48000, insurance: 11000, vehicles: 27000, repairs: 5500, software: 8500, professional: 5000, taxes: 6000, otherOpex: 8000, ownerSalary: 70000, ownerBenefits: 10000, personalExpenses: 6000, interest: 6000, depreciation: 22000, capex: 11000 },
        { year: 2024, revenue: 676000, cogs: 54000, payroll: 258000, rent: 24000, utilities: 8200, marketing: 52000, insurance: 11500, vehicles: 29000, repairs: 6000, software: 8800, professional: 5200, taxes: 6200, otherOpex: 8200, ownerSalary: 70000, ownerBenefits: 10000, personalExpenses: 6000, interest: 5000, depreciation: 21000, capex: 13000 },
        { year: 2025, revenue: 705000, cogs: 56400, payroll: 270000, rent: 24000, utilities: 8400, marketing: 55000, insurance: 12000, vehicles: 30000, repairs: 6000, software: 9000, professional: 5400, taxes: 6400, otherOpex: 8400, ownerSalary: 70000, ownerBenefits: 10000, personalExpenses: 6000, interest: 4500, depreciation: 20000, capex: 12000 }
      ],
      adjustments: [
        { id: 'pa1', desc: 'Owner personal expenses (card statements)', amount: 6000, dir: '+', recurring: true, evidence: 'Card statements', confidence: 'high' },
        { id: 'pa2', desc: 'One-time truck-wrap rebrand', amount: 12000, dir: '+', recurring: false, evidence: '', confidence: 'low' },
        { id: 'pa3', desc: 'Office rent below market — reset at renewal', amount: 13000, dir: '-', recurring: true, evidence: 'Broker rent comps', confidence: 'med' }
      ],
      structure: {
        proposedPrice: 825000, downPayment: 82500, sbaAmount: 618750, sbaRate: 10.5, sbaTerm: 10,
        sellerAmount: 123750, sellerRate: 6, sellerTerm: 5,
        closingCosts: 10000, lenderFees: 17000, legalFees: 7000, ddFees: 8000, wcInjection: 20000,
        personalGuarantee: true, preset: 'sbaseller'
      },
      ops: {
        ratings: { ownerDependence: 7, managementStrength: 3, employeeTurnover: 5, keyPersonRisk: 5, vendorConcentration: 2, contractQuality: 7, leadDiversity: 4, marketingDependence: 6, competitiveAdvantage: 5, pricingPower: 5, salesProcess: 3, sopDocumentation: 4, techSystems: 6, reportingQuality: 6, inventoryControls: 5, equipmentCondition: 6, deferredMaintenance: 4, capacityHeadroom: 6, expansionPotential: 6, scalability: 6, regulatoryBurden: 5, legalExposure: 2, cyberExposure: 3, envExposure: 4 },
        recurringRevenuePct: 68, topCustomerPct: 6, top5Pct: 14, top10Pct: 21, retentionPct: 84, reviewScore: 4.3, reviewCount: 265
      },
      location: {
        population: 512000, popGrowthPct: 1.6, medianIncome: 74000, employmentGrowthPct: 1.9,
        dataSource: 'US Census ACS', dataDate: '2024',
        ratings: { traffic: 5, visibility: 4, accessibility: 6, competition: 7, saturation: 6, demand: 8, demographics: 6, development: 7, crime: 3, disaster: 3, regulation: 4, labor: 4, rentTrend: 6, industryLocal: 7 },
        locationDependent: false, relocatable: true, territory: 'Saturated'
      },
      lease: { applicable: true, monthlyRent: 2000, annualIncreasePct: 3, yearsRemaining: 4, renewalOptions: '1 × 5 years', assignment: 'Landlord consent required', landlordApprovalNeeded: true, personalGuarantee: false, nnn: false, sqft: 1800, marketRentMonthly: 3100 },
      industryAnswers: { recurringPct: 68, annualCustomerValue: 580, annualChurnPct: 16, avgContractMonths: 12, routeDensity: 'Average', techCount: 5, leadCost: 145, termitePct: 12, licensesCurrent: true, salesRepDependence: true, seasonalSwingPct: 30, managerSalary: 62000, sellerStayMonths: 2 },
      risks: [
        { id: 'pr1', name: 'Owner is the entire sales function', category: 'Seller', probability: 4, severity: 4, impact: 80000, evidence: 'No sales staff; owner closes all new accounts', mitigation: 'Hire/promote a service manager + door-to-door program; 12-mo earnout on account retention', dealBreaker: false, owner: 'Me', due: '', status: 'Open' },
        { id: 'pr2', name: 'Churn trending up (13% → 16%)', category: 'Customer', probability: 3, severity: 3, impact: 45000, evidence: 'CRM churn report', mitigation: 'Win-back campaign, annual prepay discount', dealBreaker: false, owner: 'Me', due: '', status: 'Open' },
        { id: 'pr3', name: 'Tech poaching by national brands', category: 'Employee', probability: 3, severity: 3, impact: 35000, evidence: 'Two techs recruited last year', mitigation: 'Stay bonuses at close', dealBreaker: false, owner: 'Me', due: '', status: 'Open' },
        { id: 'pr4', name: 'Bank statements not yet provided', category: 'Financial', probability: 3, severity: 4, impact: null, evidence: 'Requested 3 weeks ago', mitigation: 'No LOI until deposits tie to P&L', dealBreaker: false, owner: 'Me', due: '', status: 'Open' }
      ],
      verification: { taxReturns: true, pl: true, bank: false, sellerCooperative: true, cashRevenuePct: 8 },
      notes: [{ ts: now - 8 * day, text: 'Broker admits owner does all selling. Two price cuts in 5 months — market is telling us something.' }],
      tasks: [{ id: 'pt1', text: 'Chase bank statements (deal-breaker until received)', done: false }, { id: 'pt2', text: 'Pull AZ OPM license status for all 5 techs', done: false }],
      fieldSources: { 'basics.askingPrice': 'seller', 'basics.sellerRevenue': 'seller', 'basics.sellerSDE': 'seller', 'lease.monthlyRent': 'user', 'location.popGrowthPct': 'public' }
    });
    ['3–5 years of business tax returns', 'Profit & loss statements (monthly, 36 mo)'].forEach(l => { const i = pest.dd.find(x => x.label === l); if (i) i.status = 'Reviewed'; });
    const bs = pest.dd.find(x => x.label.startsWith('Bank statements')); if (bs) bs.status = 'Requested';

    /* ---------- 3. poor: home services ---------- */
    const hammer = make({
      id: 'demo-hammer', createdAt: now - 5 * day, updatedAt: now - 5 * day,
      stage: 'Initial Review', tags: ['demo'],
      basics: {
        name: 'Hammer Bros Home Services', listingTitle: 'Turn-Key Handyman & Remodel Co. — Motivated Seller!',
        industry: 'homeservice', subIndustry: 'Handyman / light remodel', model: 'Job-based, purchased leads',
        description: 'FICTIONAL DEMO. Two-crew handyman and remodel outfit. Revenue sliding three straight years, 42% of revenue from one property-management client, owner runs sales and both crews. Priced on hope.',
        yearEstablished: 2014, city: 'Riverside', state: 'CA', serviceArea: 'Inland Empire', locations: 1,
        franchise: 'independent', format: 'mobile', reasonForSelling: '“Pursuing other ventures”',
        ownerInvolvement: 'full-time', employees: 6, managers: 0, hours: 'M–F', seasonality: 'low',
        licensesRequired: 'CA CSLB Class B (held by owner only)', realEstateIncluded: false, inventoryIncluded: false, equipmentIncluded: true, vehiclesIncluded: true,
        askingPrice: 1150000, sellerRevenue: 810000, sellerCashFlow: 245000, sellerSDE: 245000
      },
      years: [
        { year: 2023, revenue: 980000, cogs: 225000, payroll: 300000, rent: 30000, utilities: 9000, marketing: 58000, insurance: 21000, vehicles: 45000, repairs: 8000, software: 6500, professional: 6000, taxes: 7000, otherOpex: 11000, ownerSalary: 90000, ownerBenefits: 12000, personalExpenses: 15000, interest: 9000, depreciation: 24000, capex: 15000 },
        { year: 2024, revenue: 890000, cogs: 200000, payroll: 280000, rent: 30000, utilities: 9000, marketing: 62000, insurance: 21500, vehicles: 47000, repairs: 8500, software: 6800, professional: 6000, taxes: 7000, otherOpex: 11000, ownerSalary: 90000, ownerBenefits: 12000, personalExpenses: 15000, interest: 8000, depreciation: 23000, capex: 12000 },
        { year: 2025, revenue: 810000, cogs: 180000, payroll: 265000, rent: 30000, utilities: 9000, marketing: 65000, insurance: 22000, vehicles: 48000, repairs: 9000, software: 7000, professional: 6000, taxes: 7000, otherOpex: 11000, ownerSalary: 90000, ownerBenefits: 12000, personalExpenses: 15000, interest: 7000, depreciation: 22000, capex: 10000 }
      ],
      adjustments: [
        { id: 'ha1', desc: 'Seller add-back: owner vehicle, travel, “misc”', amount: 45000, dir: '+', recurring: true, evidence: '', confidence: 'low' },
        { id: 'ha2', desc: 'Seller add-back: brother on payroll “not needed”', amount: 30000, dir: '+', recurring: true, evidence: '', confidence: 'low' },
        { id: 'ha3', desc: 'One-time lawsuit settlement (documented)', amount: 12000, dir: '+', recurring: false, evidence: 'Settlement agreement 2025', confidence: 'high' }
      ],
      structure: {
        proposedPrice: 1150000, downPayment: 115000, sbaAmount: 862500, sbaRate: 10.5, sbaTerm: 10,
        sellerAmount: 172500, sellerRate: 6, sellerTerm: 5,
        closingCosts: 12000, lenderFees: 22000, legalFees: 8000, ddFees: 9000, wcInjection: 30000,
        personalGuarantee: true, preset: 'sbaseller'
      },
      ops: {
        ratings: { ownerDependence: 9, managementStrength: 2, employeeTurnover: 6, keyPersonRisk: 7, vendorConcentration: 3, contractQuality: 3, leadDiversity: 2, marketingDependence: 8, competitiveAdvantage: 3, pricingPower: 3, salesProcess: 2, sopDocumentation: 2, techSystems: 3, reportingQuality: 3, inventoryControls: 4, equipmentCondition: 5, deferredMaintenance: 5, capacityHeadroom: 5, expansionPotential: 4, scalability: 3, regulatoryBurden: 6, legalExposure: 5, cyberExposure: 3, envExposure: 3 },
        recurringRevenuePct: 8, topCustomerPct: 42, top5Pct: 61, top10Pct: 72, retentionPct: 55, reviewScore: 3.9, reviewCount: 88
      },
      location: {
        population: 320000, popGrowthPct: 0.7, medianIncome: 71000, employmentGrowthPct: 0.9,
        dataSource: 'US Census ACS', dataDate: '2024',
        ratings: { traffic: 5, visibility: 3, accessibility: 5, competition: 8, saturation: 8, demand: 6, demographics: 5, development: 5, crime: 5, disaster: 5, regulation: 8, labor: 3, rentTrend: 6, industryLocal: 5 },
        locationDependent: false, relocatable: true, territory: 'Saturated'
      },
      lease: { applicable: true, monthlyRent: 2500, annualIncreasePct: 4, yearsRemaining: 1.5, renewalOptions: '', assignment: 'Silent — landlord approval unclear', landlordApprovalNeeded: true, personalGuarantee: true, nnn: false, sqft: 2400, marketRentMonthly: 2600 },
      industryAnswers: { recurringPct: 8, leadSourceMix: 'Mostly purchased leads', crewCount: 2, avgTicket: 1850, reviewScore: 3.9, reviewCount: 88, ownerOnTools: true, managerSalary: 70000, sellerStayMonths: 1 },
      risks: [
        { id: 'hr1', name: 'CSLB license held by owner only', category: 'Regulatory', probability: 4, severity: 5, impact: null, evidence: 'CSLB lookup', mitigation: 'Buyer must qualify or hire an RMO before close', dealBreaker: true, owner: 'Me', due: '', status: 'Open' },
        { id: 'hr2', name: 'Top client (property mgmt) is 42% of revenue, no contract', category: 'Customer', probability: 4, severity: 5, impact: 340000, evidence: 'AR by customer', mitigation: 'Multi-year MSA as closing condition', dealBreaker: true, owner: 'Me', due: '', status: 'Open' },
        { id: 'hr3', name: 'Three-year revenue decline', category: 'Financial', probability: 4, severity: 4, impact: 90000, evidence: 'P&L trend', mitigation: 'Price on 2025 (or lower), not 2023', dealBreaker: false, owner: 'Me', due: '', status: 'Open' },
        { id: 'hr4', name: '$75k of add-backs with zero documentation', category: 'Fraud', probability: 3, severity: 4, impact: 75000, evidence: 'Seller “doesn\'t keep receipts”', mitigation: 'Strike from valuation unless documented', dealBreaker: false, owner: 'Me', due: '', status: 'Open' }
      ],
      verification: { taxReturns: false, pl: true, bank: false, sellerCooperative: null, cashRevenuePct: 15 },
      notes: [{ ts: now - 5 * day, text: 'Broker pushing hard for “quick close.” Everything about this listing says the 2023 numbers are doing the selling.' }],
      tasks: [{ id: 'ht1', text: 'Request tax returns before spending another hour', done: false }],
      fieldSources: { 'basics.askingPrice': 'seller', 'basics.sellerRevenue': 'seller', 'basics.sellerSDE': 'seller' }
    });

    for (const d of [wash, pest, hammer]) if (!DV.store.deal(d.id)) DV.store.upsertDeal(d);
  }

  return { seed };
})();

if (typeof module !== 'undefined') module.exports = window.DV;
