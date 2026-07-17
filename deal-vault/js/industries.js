/* ============================================================
   Deal Vault — industries.js
   Industry templates: fair valuation multiples (× SDE),
   benchmark margins, industry-specific underwriting questions,
   extra due-diligence items, and risk hints.
   Question types: money | num | pct | bool | text | select.
   `hint` = {lo, hi, invert}: maps the answer onto a 0–1 quality
   signal used by the growth/operations scorers (invert = lower
   is better, e.g. churn).
   ============================================================ */
window.DV = window.DV || {};

DV.industries = (() => {
  const Q = (key, label, type, help, hint, opts) => ({ key, label, type, help, hint, opts });

  const LIST = [
    { key: 'carwash', label: 'Car Wash', multLow: 3.0, multFair: 4.0, multHigh: 5.5, capexPct: 6, payrollPct: 18, grossMargin: 70, sdeMargin: 30, outlook: 7,
      questions: [
        Q('carsPerDay', 'Cars washed per day (avg)', 'num', 'Ask for wash counts from the POS, not an estimate.', {lo: 50, hi: 400}),
        Q('avgTicket', 'Average ticket', 'money', 'Total wash revenue ÷ wash count.'),
        Q('membershipRevenuePct', 'Membership (recurring) revenue %', 'pct', 'Unlimited-wash plans. Higher = steadier cash flow.', {lo: 0, hi: 70}),
        Q('membershipChurnPct', 'Monthly membership churn %', 'pct', 'Cancellations ÷ active members per month.', {lo: 3, hi: 12, invert: true}),
        Q('capacityPct', 'Capacity utilization %', 'pct', 'Current volume vs. max tunnel/bay throughput.', {lo: 30, hi: 90}),
        Q('tunnelLengthFt', 'Tunnel length (ft) / bays', 'num', 'Longer tunnel = higher throughput ceiling.'),
        Q('equipmentAgeYears', 'Equipment age (years)', 'num', 'Tunnel equipment is a 6-figure replacement.', {lo: 2, hi: 15, invert: true}),
        Q('waterChemPctRev', 'Water + chemical cost % of revenue', 'pct', '', {lo: 8, hi: 20, invert: true}),
        Q('trafficCount', 'Daily traffic count at site', 'num', 'From state DOT traffic maps — label the source.', {lo: 5000, hi: 40000}),
        Q('competitorsIn3mi', 'Competing washes within 3 miles', 'num', '', {lo: 0, hi: 6, invert: true}),
        Q('landOwned', 'Land included in sale?', 'bool', 'Land ownership changes the whole deal math.'),
        Q('weatherSensitivity', 'Weather sensitivity', 'select', 'Rainy markets can swing revenue 20%+.', {lo: 0, hi: 2, invert: true}, ['Low', 'Medium', 'High'])
      ],
      dd: ['POS wash-count reports (24 months)', 'Membership roster + churn export', 'Equipment maintenance log', 'Water usage bills', 'Environmental / reclaim compliance'],
      risks: ['New competitor tunnel opening nearby', 'Major equipment failure', 'Weather-driven revenue swings'] },

    { key: 'pestcontrol', label: 'Pest Control', multLow: 3.0, multFair: 4.2, multHigh: 6.0, capexPct: 2, payrollPct: 35, grossMargin: 75, sdeMargin: 28, outlook: 8,
      questions: [
        Q('recurringPct', 'Recurring-contract revenue %', 'pct', 'Quarterly/annual service agreements.', {lo: 30, hi: 90}),
        Q('annualCustomerValue', 'Avg annual customer value', 'money'),
        Q('annualChurnPct', 'Annual customer churn %', 'pct', 'Cancelled accounts ÷ total accounts.', {lo: 8, hi: 30, invert: true}),
        Q('avgContractMonths', 'Avg contract length (months)', 'num', '', {lo: 3, hi: 24}),
        Q('routeDensity', 'Route density', 'select', 'Tight routes = more stops/day, better margins.', {lo: 0, hi: 2}, ['Sparse', 'Average', 'Dense']),
        Q('techCount', 'Technicians employed', 'num'),
        Q('leadCost', 'Cost per new customer', 'money', '', {lo: 250, hi: 40, invert: false}),
        Q('termitePct', 'Termite work % of revenue', 'pct', 'Termite = higher liability + licensing.'),
        Q('licensesCurrent', 'All applicator licenses current?', 'bool'),
        Q('salesRepDependence', 'Dependent on one salesperson?', 'bool', '', {lo: 1, hi: 0}),
        Q('seasonalSwingPct', 'Peak vs. low season revenue swing %', 'pct', '', {lo: 10, hi: 60, invert: true})
      ],
      dd: ['Customer contract sample + churn report', 'Route/production reports by tech', 'State applicator licenses', 'Chemical purchase records', 'Termite warranty (retreat) liability list'],
      risks: ['Customer churn after ownership change', 'Technician licensing gaps', 'Termite retreat liabilities'] },

    { key: 'hvac', label: 'HVAC', multLow: 2.8, multFair: 3.8, multHigh: 5.5, capexPct: 3, payrollPct: 38, grossMargin: 55, sdeMargin: 20, outlook: 8,
      questions: [
        Q('serviceVsInstallPct', 'Service/maintenance % vs. new install', 'pct', 'Service-heavy is steadier than construction-heavy.', {lo: 20, hi: 80}),
        Q('maintenanceAgreements', 'Active maintenance agreements', 'num', '', {lo: 0, hi: 1500}),
        Q('techCount', 'Certified technicians', 'num'),
        Q('avgTicket', 'Average service ticket', 'money'),
        Q('newConstructionPct', 'New-construction % of revenue', 'pct', 'Cyclical — discount it.', {lo: 60, hi: 0, invert: true}),
        Q('fleetCondition', 'Fleet condition', 'select', '', {lo: 0, hi: 2}, ['Poor', 'Fair', 'Good']),
        Q('licenseHolder', 'Who holds the contractor license?', 'select', 'If only the seller holds it, you have a transition problem.', {lo: 0, hi: 2}, ['Seller only', 'Seller + employee', 'Employee/RMO']),
        Q('backlogWeeks', 'Booked backlog (weeks)', 'num', '', {lo: 0, hi: 8})
      ],
      dd: ['Maintenance-agreement roster', 'Job-costing reports by segment', 'Contractor license transferability', 'Warranty claims history', 'Fleet titles + condition'],
      risks: ['Contractor license tied to seller', 'Tech shortage / poaching', 'Construction-cycle exposure'] },

    { key: 'plumbing', label: 'Plumbing', multLow: 2.8, multFair: 3.7, multHigh: 5.0, capexPct: 3, payrollPct: 38, grossMargin: 55, sdeMargin: 20, outlook: 8,
      questions: [
        Q('serviceMixPct', 'Residential service % of revenue', 'pct', '', {lo: 20, hi: 80}),
        Q('techCount', 'Licensed plumbers', 'num'),
        Q('avgTicket', 'Average ticket', 'money'),
        Q('licenseHolder', 'Master license holder', 'select', '', {lo: 0, hi: 2}, ['Seller only', 'Seller + employee', 'Employee/RMO']),
        Q('memberships', 'Service-plan members', 'num', '', {lo: 0, hi: 1000}),
        Q('fleetCondition', 'Fleet condition', 'select', '', {lo: 0, hi: 2}, ['Poor', 'Fair', 'Good'])
      ],
      dd: ['Master license transfer plan', 'Permit history', 'Fleet + equipment list', 'Service-plan roster'],
      risks: ['Master license transition', 'Key-tech departure'] },

    { key: 'electrical', label: 'Electrical', multLow: 2.8, multFair: 3.6, multHigh: 5.0, capexPct: 2, payrollPct: 40, grossMargin: 50, sdeMargin: 18, outlook: 8,
      questions: [
        Q('serviceMixPct', 'Service % vs. project/bid work', 'pct', '', {lo: 20, hi: 80}),
        Q('gcConcentrationPct', 'Revenue from top general contractor %', 'pct', '', {lo: 40, hi: 0, invert: true}),
        Q('licenseHolder', 'Master electrician license holder', 'select', '', {lo: 0, hi: 2}, ['Seller only', 'Seller + employee', 'Employee/RMO']),
        Q('backlogMonths', 'Contracted backlog (months)', 'num', '', {lo: 0, hi: 6}),
        Q('bondingCapacity', 'Bonding in place for commercial work?', 'bool')
      ],
      dd: ['License transfer plan', 'WIP schedule + backlog contracts', 'GC relationships / retention', 'Bonding capacity letter'],
      risks: ['GC concentration', 'Bid-work margin volatility'] },

    { key: 'landscaping', label: 'Landscaping / Lawn Care', multLow: 2.5, multFair: 3.3, multHigh: 4.5, capexPct: 5, payrollPct: 42, grossMargin: 55, sdeMargin: 18, outlook: 7,
      questions: [
        Q('recurringPct', 'Recurring maintenance % of revenue', 'pct', '', {lo: 20, hi: 85}),
        Q('commercialPct', 'Commercial contract % of revenue', 'pct'),
        Q('contractRenewalPct', 'Annual contract renewal rate %', 'pct', '', {lo: 60, hi: 95}),
        Q('crewCount', 'Crews', 'num'),
        Q('equipmentAgeYears', 'Avg equipment age (years)', 'num', '', {lo: 2, hi: 10, invert: true}),
        Q('laborSource', 'Labor availability', 'select', 'H-2B dependence is a real seasonal risk.', {lo: 0, hi: 2}, ['Hard to staff', 'Adequate', 'Strong bench']),
        Q('snowPct', 'Snow-removal % of revenue', 'pct', 'Weather-dependent; discount heavy reliance.')
      ],
      dd: ['Commercial contract copies + terms', 'Renewal history 3 years', 'Equipment list w/ condition', 'Crew roster + wages'],
      risks: ['Contract non-renewal at transfer', 'Labor shortage', 'Weather dependence'] },

    { key: 'roofing', label: 'Roofing', multLow: 2.3, multFair: 3.0, multHigh: 4.2, capexPct: 2, payrollPct: 35, grossMargin: 40, sdeMargin: 15, outlook: 6,
      questions: [
        Q('insuranceWorkPct', 'Insurance/storm work % of revenue', 'pct', 'Storm chasing is not durable revenue.', {lo: 70, hi: 10, invert: true}),
        Q('warrantyYears', 'Workmanship warranty offered (years)', 'num', 'Long tails = long liabilities.'),
        Q('subVsCrewPct', '% of labor subcontracted', 'pct'),
        Q('backlogWeeks', 'Backlog (weeks)', 'num', '', {lo: 0, hi: 12}),
        Q('openWarrantyClaims', 'Open warranty claims', 'num', '', {lo: 10, hi: 0, invert: true})
      ],
      dd: ['Warranty claim history + reserves', 'Sub agreements + COIs', 'Job costing by project', 'Storm vs. retail revenue split'],
      risks: ['Warranty tail liability', 'Storm-cycle revenue cliff', 'Sub labor quality'] },

    { key: 'cleaning', label: 'Cleaning / Janitorial', multLow: 2.5, multFair: 3.2, multHigh: 4.5, capexPct: 1, payrollPct: 50, grossMargin: 45, sdeMargin: 15, outlook: 7,
      questions: [
        Q('contractPct', 'Contracted recurring revenue %', 'pct', '', {lo: 30, hi: 95}),
        Q('topAccountPct', 'Largest account % of revenue', 'pct', '', {lo: 40, hi: 5, invert: true}),
        Q('turnoverPct', 'Annual employee turnover %', 'pct', 'Industry runs high; verify anyway.', {lo: 200, hi: 50, invert: true}),
        Q('supervisorStructure', 'Supervisors run day-to-day?', 'bool', '', {lo: 0, hi: 1}),
        Q('nightWorkPct', '% of work after-hours', 'pct')
      ],
      dd: ['Contract copies + assignment clauses', 'Account tenure report', 'Labor compliance (I-9, wage/hour)', 'Insurance & bonding certificates'],
      risks: ['Account concentration', 'Wage/hour compliance', 'Contract assignment consents'] },

    { key: 'restaurant', label: 'Restaurant', multLow: 1.8, multFair: 2.5, multHigh: 3.5, capexPct: 4, payrollPct: 32, grossMargin: 65, sdeMargin: 12, outlook: 5,
      questions: [
        Q('foodCostPct', 'Food cost % of sales', 'pct', '28–32% typical.', {lo: 40, hi: 26, invert: true}),
        Q('laborPct', 'Labor % of sales', 'pct', '', {lo: 40, hi: 25, invert: true}),
        Q('primeCostPct', 'Prime cost % (food + labor)', 'pct', 'Above 65% is a red flag.', {lo: 72, hi: 58, invert: true}),
        Q('chefDependence', 'Concept depends on chef/owner?', 'bool', '', {lo: 1, hi: 0}),
        Q('reviewScore', 'Google rating', 'num', '', {lo: 3.5, hi: 4.8}),
        Q('healthScore', 'Latest health inspection grade', 'select', '', {lo: 0, hi: 2}, ['C or worse', 'B', 'A']),
        Q('deliveryPct', '3rd-party delivery % of sales', 'pct', '30% commissions eat margins.', {lo: 40, hi: 5, invert: true}),
        Q('seatCount', 'Seats', 'num')
      ],
      dd: ['POS sales reports (36 months, by daypart)', 'Health inspection history', 'Liquor license transfer', 'Key-staff retention plan', 'Hood/fire suppression service records'],
      risks: ['Chef/owner departure', 'Lease economics', 'Concept fatigue', 'Health/liquor compliance'] },

    { key: 'gym', label: 'Gym / Fitness', multLow: 2.0, multFair: 2.8, multHigh: 4.0, capexPct: 6, payrollPct: 30, grossMargin: 70, sdeMargin: 20, outlook: 6,
      questions: [
        Q('members', 'Active members', 'num'),
        Q('mrr', 'Monthly recurring dues', 'money'),
        Q('churnPct', 'Monthly member churn %', 'pct', '', {lo: 8, hi: 2, invert: true}),
        Q('arpm', 'Avg revenue per member / month', 'money'),
        Q('equipmentAgeYears', 'Equipment age (years)', 'num', '', {lo: 2, hi: 10, invert: true}),
        Q('ptRevenuePct', 'Personal training % of revenue', 'pct'),
        Q('capacityPct', 'Peak-hour capacity utilization %', 'pct', '', {lo: 30, hi: 90})
      ],
      dd: ['Membership billing export + churn', 'EFT/dues processor statements', 'Equipment leases vs. owned', 'Trainer contracts / retention'],
      risks: ['Member churn at transfer', 'Equipment refresh capex', 'Big-box competition'] },

    { key: 'salon', label: 'Salon / Spa', multLow: 1.8, multFair: 2.4, multHigh: 3.2, capexPct: 3, payrollPct: 45, grossMargin: 60, sdeMargin: 15, outlook: 6,
      questions: [
        Q('boothVsEmployee', 'Model', 'select', '', null, ['Booth rental', 'Commission staff', 'Hybrid']),
        Q('topStylistPct', 'Top stylist % of service revenue', 'pct', 'Clients follow stylists out the door.', {lo: 40, hi: 10, invert: true}),
        Q('rebookRatePct', 'Client rebook rate %', 'pct', '', {lo: 40, hi: 85}),
        Q('retailPct', 'Retail product % of revenue', 'pct'),
        Q('staffTenureYears', 'Avg staff tenure (years)', 'num', '', {lo: 1, hi: 8})
      ],
      dd: ['Stylist production reports', 'Booth rental agreements', 'Client retention data', 'Non-solicit feasibility'],
      risks: ['Stylist departures take clients', 'Owner is top producer'] },

    { key: 'ecommerce', label: 'E-commerce', multLow: 2.0, multFair: 3.0, multHigh: 4.5, capexPct: 1, payrollPct: 12, grossMargin: 45, sdeMargin: 18, outlook: 7,
      questions: [
        Q('channelMixPct', 'Own-site % of revenue (vs. Amazon etc.)', 'pct', 'Marketplace dependence = platform risk.', {lo: 5, hi: 70}),
        Q('topSkuPct', 'Top SKU % of revenue', 'pct', '', {lo: 60, hi: 10, invert: true}),
        Q('repeatRatePct', 'Repeat-customer revenue %', 'pct', '', {lo: 10, hi: 60}),
        Q('cac', 'Customer acquisition cost', 'money'),
        Q('aov', 'Average order value', 'money'),
        Q('returnRatePct', 'Return rate %', 'pct', '', {lo: 20, hi: 3, invert: true}),
        Q('supplierConcentration', 'Single-supplier dependence?', 'bool', '', {lo: 1, hi: 0}),
        Q('adSpendPct', 'Ad spend % of revenue', 'pct', '', {lo: 35, hi: 8, invert: true}),
        Q('inventoryTurns', 'Inventory turns / year', 'num', '', {lo: 1, hi: 8})
      ],
      dd: ['Seller-account health + ownership transfer', 'Ad account performance (in-platform)', 'Supplier agreements + landed costs', 'Chargeback/refund history', 'Trademark/brand registry'],
      risks: ['Platform suspension', 'Ad-cost inflation', 'Supplier disruption', 'SKU concentration'] },

    { key: 'saas', label: 'SaaS / Software', multLow: 3.0, multFair: 4.0, multHigh: 6.0, capexPct: 1, payrollPct: 35, grossMargin: 80, sdeMargin: 30, outlook: 8,
      questions: [
        Q('mrr', 'MRR', 'money', 'Monthly recurring revenue at close.'),
        Q('arr', 'ARR', 'money'),
        Q('grossChurnPct', 'Monthly gross revenue churn %', 'pct', '', {lo: 5, hi: 1, invert: true}),
        Q('nrrPct', 'Net revenue retention %', 'pct', '>100% means the base grows itself.', {lo: 80, hi: 120}),
        Q('cac', 'CAC', 'money'),
        Q('ltv', 'LTV', 'money'),
        Q('grossMarginPct', 'Gross margin %', 'pct', '', {lo: 60, hi: 90}),
        Q('founderCodeDependence', 'Does the founder write most of the code?', 'bool', '', {lo: 1, hi: 0}),
        Q('codeQuality', 'Code/deployment quality', 'select', 'Get a technical review before closing.', {lo: 0, hi: 2}, ['Fragile', 'Adequate', 'Solid']),
        Q('topCustomerPct', 'Top customer % of ARR', 'pct', '', {lo: 40, hi: 5, invert: true}),
        Q('avgContractMonths', 'Avg contract length (months)', 'num', '', {lo: 1, hi: 24}),
        Q('growthRatePct', 'ARR growth rate % (yoy)', 'pct', '', {lo: 0, hi: 40})
      ],
      dd: ['Stripe/billing MRR export', 'Cohort retention analysis', 'Code escrow / technical audit', 'Hosting + third-party dependencies', 'IP assignments from all contributors'],
      risks: ['Founder-dependent codebase', 'Churn acceleration', 'Platform/API dependency'] },

    { key: 'manufacturing', label: 'Manufacturing', multLow: 3.0, multFair: 4.0, multHigh: 5.5, capexPct: 5, payrollPct: 30, grossMargin: 35, sdeMargin: 15, outlook: 6,
      questions: [
        Q('topCustomerPct', 'Top customer % of revenue', 'pct', '', {lo: 50, hi: 10, invert: true}),
        Q('backlogMonths', 'Order backlog (months)', 'num', '', {lo: 0, hi: 9}),
        Q('equipmentAgeYears', 'Key equipment age (years)', 'num', '', {lo: 5, hi: 25, invert: true}),
        Q('capacityPct', 'Capacity utilization %', 'pct', '', {lo: 40, hi: 85}),
        Q('skilledLabor', 'Skilled-labor availability', 'select', '', {lo: 0, hi: 2}, ['Scarce', 'Adequate', 'Strong']),
        Q('proprietaryProductPct', 'Proprietary product % (vs. job shop)', 'pct', '', {lo: 0, hi: 80}),
        Q('environmentalExposure', 'Environmental/hazmat exposure?', 'bool', 'Phase I ESA is standard.', {lo: 1, hi: 0})
      ],
      dd: ['Customer concentration by year', 'Equipment appraisal', 'Phase I environmental (if real estate)', 'Quality certs (ISO etc.)', 'Backlog + open PO report'],
      risks: ['Customer concentration', 'Deferred equipment capex', 'Environmental liability'] },

    { key: 'retail', label: 'Retail Store', multLow: 1.8, multFair: 2.5, multHigh: 3.5, capexPct: 2, payrollPct: 18, grossMargin: 42, sdeMargin: 10, outlook: 4,
      questions: [
        Q('inventoryValue', 'Inventory at cost', 'money', 'Is it included in price? Is it saleable?'),
        Q('deadInventoryPct', 'Stale/dead inventory %', 'pct', '', {lo: 30, hi: 5, invert: true}),
        Q('onlinePct', 'Online % of sales', 'pct', '', {lo: 0, hi: 40}),
        Q('footTraffic', 'Location foot traffic', 'select', '', {lo: 0, hi: 2}, ['Weak', 'Average', 'Strong']),
        Q('amazonExposure', 'Easily Amazon-substituted?', 'select', '', {lo: 0, hi: 2, invert: true}, ['Highly', 'Somewhat', 'Insulated'])
      ],
      dd: ['Inventory aging report', 'POS category sales 36 months', 'Vendor terms + exclusivity', 'Lease + co-tenancy clauses'],
      risks: ['E-commerce substitution', 'Inventory obsolescence', 'Anchor-tenant loss'] },

    { key: 'medical', label: 'Medical Practice', multLow: 2.5, multFair: 3.5, multHigh: 5.0, capexPct: 3, payrollPct: 40, grossMargin: 60, sdeMargin: 25, outlook: 7,
      questions: [
        Q('payerMixPct', 'Commercial-insurance % of revenue', 'pct', 'vs. Medicare/Medicaid dependence.', {lo: 20, hi: 70}),
        Q('providerDependence', 'Revenue tied to selling physician %', 'pct', '', {lo: 80, hi: 20, invert: true}),
        Q('activePatients', 'Active patient count', 'num'),
        Q('licenseRequired', 'Buyer must hold clinical license?', 'bool', 'Non-clinician buyers may need an MSO structure — get legal advice.'),
        Q('emrSystem', 'Modern EMR in place?', 'bool')
      ],
      dd: ['Payer contracts + fee schedules', 'Coding/billing audit', 'Provider employment agreements', 'HIPAA compliance review', 'Malpractice claims history'],
      risks: ['Provider departure', 'Reimbursement cuts', 'Compliance/billing exposure'] },

    { key: 'dental', label: 'Dental Practice', multLow: 2.8, multFair: 3.8, multHigh: 5.0, capexPct: 4, payrollPct: 28, grossMargin: 65, sdeMargin: 30, outlook: 8,
      questions: [
        Q('activePatients', 'Active patients (24 mo)', 'num', '', {lo: 500, hi: 2500}),
        Q('newPatientsMo', 'New patients / month', 'num', '', {lo: 5, hi: 40}),
        Q('hygieneRevenuePct', 'Hygiene % of production', 'pct', 'Healthy recall program ≈ 25–33%.', {lo: 10, hi: 33}),
        Q('ppoFfsMix', 'FFS/PPO vs. HMO/Medicaid mix', 'select', '', {lo: 0, hi: 2}, ['Mostly HMO/Medicaid', 'Mixed', 'Mostly FFS/PPO']),
        Q('opCount', 'Operatories', 'num'),
        Q('equipmentAgeYears', 'Equipment age (years)', 'num', '', {lo: 3, hi: 15, invert: true}),
        Q('sellerStayMonths', 'Seller will stay (months)', 'num', 'Patient goodwill transfer needs runway.', {lo: 0, hi: 12})
      ],
      dd: ['Production by provider + code', 'Recall/hygiene reports', 'PPO contract transferability', 'Radiograph/equipment certs', 'Patient-chart audit sample'],
      risks: ['Patient attrition post-sale', 'Insurance credentialing delay', 'Equipment refresh'] },

    { key: 'autorepair', label: 'Auto Repair', multLow: 2.3, multFair: 3.0, multHigh: 4.2, capexPct: 3, payrollPct: 35, grossMargin: 55, sdeMargin: 18, outlook: 7,
      questions: [
        Q('carCountWeek', 'Car count / week', 'num'),
        Q('aro', 'Average repair order', 'money', '', {lo: 200, hi: 700}),
        Q('bayCount', 'Bays / lifts', 'num'),
        Q('techCount', 'Technicians (flag-hour capable)', 'num'),
        Q('fleetAccountsPct', 'Fleet-account % of revenue', 'pct'),
        Q('evReadiness', 'EV service capability', 'select', '', {lo: 0, hi: 2}, ['None', 'Partial', 'Trained/equipped']),
        Q('reviewScore', 'Google rating', 'num', '', {lo: 3.5, hi: 4.8})
      ],
      dd: ['Shop-management system reports (car count, ARO)', 'Tech certifications + pay plans', 'Equipment list (lifts, scanners)', 'Environmental compliance (waste oil)'],
      risks: ['Tech departure', 'EV transition', 'Environmental compliance'] },

    { key: 'laundromat', label: 'Laundromat', multLow: 3.0, multFair: 3.8, multHigh: 5.0, capexPct: 8, payrollPct: 10, grossMargin: 70, sdeMargin: 30, outlook: 7,
      questions: [
        Q('machineAgeYears', 'Avg machine age (years)', 'num', 'Machines last ~12–18 yrs; refits are 6 figures.', {lo: 3, hi: 15, invert: true}),
        Q('turnsPerDay', 'Turns per day (avg)', 'num', 'Industry healthy ≈ 3–5.', {lo: 1.5, hi: 5}),
        Q('utilitiesPctRev', 'Utilities % of revenue', 'pct', '', {lo: 35, hi: 15, invert: true}),
        Q('washFoldPct', 'Wash-and-fold / pickup % of revenue', 'pct', 'Growth lever.', {lo: 0, hi: 40}),
        Q('attendedModel', 'Attended or unattended?', 'select', null, null, ['Unattended', 'Hybrid', 'Fully attended']),
        Q('leaseYearsWithOptions', 'Lease years remaining incl. options', 'num', 'A laundromat IS its lease.', {lo: 5, hi: 20}),
        Q('collectionVerified', 'Coin/card collections verifiable?', 'bool', 'Card systems beat coin claims. Verify with utility cross-check.')
      ],
      dd: ['Card-system revenue export / coin collection logs', 'Water & sewer bills (verify volume!)', 'Machine inventory w/ ages', 'Lease + options', 'Water/sewer hookup fees'],
      risks: ['Machine replacement capex', 'Lease loss = business loss', 'Unverifiable cash revenue'] },

    { key: 'storage', label: 'Self-Storage', multLow: 4.0, multFair: 5.5, multHigh: 7.0, capexPct: 3, payrollPct: 8, grossMargin: 80, sdeMargin: 45, outlook: 7,
      questions: [
        Q('unitCount', 'Units', 'num'),
        Q('occupancyPct', 'Physical occupancy %', 'pct', '', {lo: 60, hi: 92}),
        Q('economicOccupancyPct', 'Economic occupancy %', 'pct', 'Revenue ÷ gross potential — catches discounting.', {lo: 50, hi: 88}),
        Q('rentPerSqft', 'Avg rent / sq ft / year', 'money'),
        Q('marketSupplyPipeline', 'New supply being built nearby?', 'select', '', {lo: 0, hi: 2, invert: true}, ['Heavy', 'Some', 'None']),
        Q('managementModel', 'Management', 'select', null, null, ['Owner-run', 'On-site manager', 'Remote/kiosk'])
      ],
      dd: ['Rent roll + unit mix', 'Management software reports', 'Delinquency/auction history', 'Competitor rate survey', 'Expansion entitlement'],
      risks: ['New supply compressing rates', 'Deferred maintenance', 'Rate-management sophistication'] },

    { key: 'homeservice', label: 'Home Services (general)', multLow: 2.5, multFair: 3.4, multHigh: 4.8, capexPct: 3, payrollPct: 38, grossMargin: 55, sdeMargin: 18, outlook: 8,
      questions: [
        Q('recurringPct', 'Recurring/repeat revenue %', 'pct', '', {lo: 10, hi: 70}),
        Q('leadSourceMix', 'Lead generation', 'select', 'Paid-lead dependence (HomeAdvisor etc.) is fragile.', {lo: 0, hi: 2}, ['Mostly purchased leads', 'Mixed', 'Brand/referral driven']),
        Q('crewCount', 'Crews / techs', 'num'),
        Q('avgTicket', 'Average ticket', 'money'),
        Q('reviewScore', 'Google rating', 'num', '', {lo: 3.5, hi: 4.8}),
        Q('reviewCount', 'Review count', 'num', '', {lo: 20, hi: 500}),
        Q('ownerOnTools', 'Owner works in the field?', 'bool', '', {lo: 1, hi: 0})
      ],
      dd: ['Lead-source report (CRM)', 'Review-platform ownership transfer', 'Crew roster + pay', 'Customer list w/ repeat flag'],
      risks: ['Owner does the selling', 'Paid-lead cost inflation', 'Crew retention'] },

    { key: 'franchise', label: 'Franchise (resale)', multLow: 2.3, multFair: 3.0, multHigh: 4.0, capexPct: 3, payrollPct: 30, grossMargin: 60, sdeMargin: 15, outlook: 6,
      questions: [
        Q('royaltyPct', 'Royalty + brand fund % of revenue', 'pct', '', {lo: 12, hi: 4, invert: true}),
        Q('termYearsLeft', 'Franchise term remaining (years)', 'num', '', {lo: 2, hi: 15}),
        Q('transferFee', 'Transfer fee', 'money'),
        Q('remodelRequired', 'Remodel required at transfer?', 'bool', 'Franchisors often trigger refresh capex on sale.', {lo: 1, hi: 0}),
        Q('territoryProtected', 'Protected territory?', 'bool', '', {lo: 0, hi: 1}),
        Q('franchisorApproval', 'Buyer approval process understood?', 'bool'),
        Q('itemNineteen', 'FDD Item 19 vs. this unit', 'select', 'Is this unit above or below system average?', {lo: 0, hi: 2}, ['Below system avg', 'At system avg', 'Above system avg'])
      ],
      dd: ['FDD (all items, esp. 19/20)', 'Franchise agreement + transfer terms', 'Required remodel scope', 'Franchisor validation calls', 'Territory map'],
      risks: ['Franchisor transfer/remodel demands', 'Royalty drag on margins', 'System health'] },

    { key: 'other', label: 'Other / General Business', multLow: 2.2, multFair: 3.0, multHigh: 4.0, capexPct: 2, payrollPct: 30, grossMargin: 50, sdeMargin: 18, outlook: 6,
      questions: [
        Q('recurringPct', 'Recurring/repeat revenue %', 'pct', '', {lo: 0, hi: 70}),
        Q('differentiator', 'Main competitive advantage', 'text'),
        Q('whyOwnerMatters', 'What only the owner can do today', 'text', 'Be honest — this is your transition risk.')
      ],
      dd: [], risks: [] }
  ];

  const byKey = Object.fromEntries(LIST.map(i => [i.key, i]));
  const get = key => byKey[key] || byKey.other;

  /* Fair-multiple adjustment: quality shifts where in the low–high
     band this specific business deserves to sit. q in [0,1]. */
  function fairMultiple(ind, q) {
    const t = DV.calc ? DV.calc.clamp(q ?? 0.5, 0, 1) : Math.max(0, Math.min(1, q ?? 0.5));
    return ind.multLow + (ind.multHigh - ind.multLow) * t;
  }

  /* Generic quality signal from industry answers with hints → 0..1 */
  function answerQuality(deal) {
    const ind = get(deal.basics.industry);
    const vals = [];
    for (const q of ind.questions) {
      if (!q.hint) continue;
      let v = deal.industryAnswers?.[q.key];
      if (v === undefined || v === null || v === '') continue;
      if (q.type === 'bool') v = (v === true || v === 'true' || v === 'yes') ? 1 : 0;
      if (q.type === 'select') v = Math.max(0, (q.opts || []).indexOf(v));
      v = parseFloat(v); if (!Number.isFinite(v)) continue;
      let t = (v - q.hint.lo) / ((q.hint.hi - q.hint.lo) || 1);
      t = Math.max(0, Math.min(1, t));
      if (q.hint.invert) t = 1 - t;
      vals.push(t);
    }
    return vals.length ? { q: vals.reduce((a,b)=>a+b,0)/vals.length, n: vals.length } : { q: null, n: 0 };
  }

  return { LIST, get, fairMultiple, answerQuality };
})();

/* ---------- due-diligence checklist generator ---------- */
DV.ddGenerate = deal => {
  const base = [
    ['Financial', '3–5 years of business tax returns'],
    ['Financial', 'Profit & loss statements (monthly, 36 mo)'],
    ['Financial', 'Balance sheets'],
    ['Financial', 'Bank statements (24 mo) tied to P&L'],
    ['Financial', 'Accounts receivable aging'],
    ['Financial', 'Accounts payable aging'],
    ['Financial', 'Add-back support for every adjustment'],
    ['Financial', 'Sales/revenue reports from POS or system of record'],
    ['Financial', 'Refunds & chargebacks history'],
    ['People', 'Payroll records + register'],
    ['People', 'Employee roster: role, tenure, pay, agreements'],
    ['People', 'Key-employee retention conversations (post-LOI)'],
    ['Customers', 'Customer list (anonymized pre-LOI is fine)'],
    ['Customers', 'Customer-concentration report (top 1/5/10)'],
    ['Customers', 'Churn / retention report'],
    ['Operations', 'Vendor list + key supplier terms'],
    ['Operations', 'All material contracts'],
    ['Operations', 'Equipment list w/ age + maintenance records'],
    ['Operations', 'Standard operating procedures'],
    ['Operations', 'Software/systems inventory + account ownership'],
    ['Operations', 'Website, domain & social account ownership'],
    ['Legal', 'Licenses & permits (verify transferability)'],
    ['Legal', 'Litigation, disputes & claims history'],
    ['Legal', 'Tax liabilities / liens search (UCC, state, IRS)'],
    ['Legal', 'Insurance policies + claims history'],
    ['Legal', 'Intellectual property (marks, patents, trade names)'],
    ['Real estate', 'Lease + all amendments and options']
  ];
  const s = deal.structure || {}, b = deal.basics || {};
  if (DV.calc.n0(s.sbaAmount) > 0) base.push(['Financing', 'SBA package: PFS, 413, business plan, projections'], ['Financing', 'Landlord subordination / lease term ≥ loan term']);
  if (DV.calc.n0(s.sellerAmount) > 0) base.push(['Financing', 'Seller-note terms + standby agreement (if SBA)']);
  if (b.inventoryIncluded) base.push(['Operations', 'Inventory count + aging (walk it yourself)']);
  if (b.franchise === 'franchise') base.push(['Legal', 'FDD + franchise agreement + transfer approval']);
  if (b.realEstateIncluded || DV.calc.n0(s.realEstatePrice) > 0) base.push(['Real estate', 'Appraisal, Phase I environmental, title work']);
  const ind = DV.industries.get(b.industry);
  for (const item of ind.dd || []) base.push(['Industry', item]);
  return base.map(([group, label]) => ({ id: DV.util.uid(), group, label, status: 'Not Requested' }));
};
DV.DD_STATUSES = ['Not Requested', 'Requested', 'Received', 'Reviewed', 'Issue Found', 'Cleared', 'Not Applicable'];

DV.RISK_CATEGORIES = ['Financial','Operational','Customer','Employee','Legal','Regulatory','Environmental','Technology','Market','Location','Financing','Lease','Seller','Transition','Reputation','Fraud','Tax','Insurance'];

if (typeof module !== 'undefined') module.exports = window.DV;
