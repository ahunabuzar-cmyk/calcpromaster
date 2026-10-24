#!/usr/bin/env node
// Market-gap batch 4 — life-events finance (Spec B Part 1 item 2, Part 2
// items 1, 3, 5), home energy and ownership (Part 2 items 31-34), education
// cost and funding (Part 2 items 36-37) and career prep (Part 2 items 35,
// 38). Deterministic models with documented formulas and worked examples.
// Idempotent via the shared library (comma-safe insertion).
// ESCAPING: prose avoids apostrophes and the dollar-digit sequence.
'use strict';
const LIB = require('./lib/market-gap-lib.cjs');
const { insertTools, selfCheck, buildSeo, insertSeo, selfCheckSeo, addContracts } = LIB;

const T = [
  {
    id: 'divorce-cost', cat: 'finance',
    name: 'Divorce Cost Estimator',
    desc: 'Estimate the cost of a divorce by process route, hourly rate, hours worked and children involved.',
    kw: 'divorce cost calculator, divorce cost estimate, cost of divorce by state, contested divorce cost',
    inputs: [
      { id: 'route', label: 'Process route', type: 'select', options: ['Mediation', 'Lawyer negotiated', 'Contested court'], def: 'Lawyer negotiated' },
      { id: 'hourlyRate', label: 'Lawyer hourly rate', type: 'number', def: 300 },
      { id: 'totalHours', label: 'Total lawyer hours', type: 'number', def: 20 },
      { id: 'children', label: 'Children involved', type: 'number', def: 0 }
    ],
    calc: function (v) {
      var factor = v.route === 'Mediation' ? 0.4 : v.route === 'Contested court' ? 2.5 : 1;
      var cost = v.hourlyRate * v.totalHours * factor + v.children * 500;
      return {
        result: 'Estimated divorce cost: ' + cost.toFixed(0),
        chart: Charts.bar([cost * 0.7, cost, cost * 1.6], ['Low', 'Mid', 'High']),
        extra: v.route + ' route | Legal fees ' + (v.hourlyRate * v.totalHours * factor).toFixed(0) + ' plus ' + (v.children * 500).toFixed(0) + ' for child-related work | Illustrative only, confirm with local quotes'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Choose the process route. Mediation is the cheapest because the parties settle directly with a neutral.',
        'Step 2: Multiply the lawyer hourly rate by the estimated number of hours.',
        'Step 3: Apply the route factor: mediation 0.4, lawyer negotiated 1.0, contested court 2.5.',
        'Step 4: Add an allowance per child for parenting plans, custody work and extra correspondence.',
        'Step 5: This is a planning estimate only. Real fees depend on the dispute, the jurisdiction and how cooperative both sides are.'
      ];
    }
  },
  {
    id: 'moving-abroad-cost', cat: 'finance',
    name: 'Moving Abroad Cost Estimator',
    desc: 'One-time relocation cost estimate for shipping, visas, flights and settling-in deposits by destination.',
    kw: 'moving abroad cost calculator, relocation cost estimate, emigrate cost calculator, international moving cost',
    inputs: [
      { id: 'destination', label: 'Destination', type: 'select', options: ['USA', 'UK', 'Canada', 'Australia', 'UAE', 'Germany'], def: 'USA' },
      { id: 'cubicMeters', label: 'Shipment volume (cubic meters)', type: 'number', def: 10 },
      { id: 'adults', label: 'Adults', type: 'number', def: 1 },
      { id: 'children', label: 'Children', type: 'number', def: 0 },
      { id: 'deposit', label: 'Include rental deposit', type: 'checkbox', def: true }
    ],
    calc: function (v) {
      var visaMap = { 'USA': 1200, 'UK': 1000, 'Canada': 900, 'Australia': 1100, 'UAE': 700, 'Germany': 800 };
      var shipping = v.cubicMeters * 120;
      var visas = v.adults * (visaMap[v.destination] || 1000) + v.children * 400;
      var travel = v.adults * 800 + v.children * 500;
      var deposit = v.deposit ? 1500 : 0;
      var total = shipping + visas + travel + deposit;
      return {
        result: 'Estimated one-time moving cost: ' + total.toFixed(0),
        chart: Charts.bar([shipping, visas, travel, deposit], ['Shipping', 'Visas', 'Flights', 'Deposit']),
        extra: v.destination + ' | Shipping ' + shipping + ' | Visas ' + visas + ' | Flights ' + travel + ' | Deposit ' + deposit + ' | Excludes ongoing living costs'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Estimate the shipment volume in cubic meters and multiply by a typical rate of 120 per cubic meter.',
        'Step 2: Add visa and permit fees for each adult and child for the destination country.',
        'Step 3: Add one-way flights at about 800 per adult and 500 per child.',
        'Step 4: Add a settling-in deposit for a rental if you expect one.',
        'Step 5: Total the parts. This is a one-time relocation estimate and does not include the first months of rent, food or transport.'
      ];
    }
  },
  {
    id: 'career-break-runway', cat: 'career',
    name: 'Career Break Runway Calculator',
    desc: 'See how many months your savings last on a career break or sabbatical and the gap if the break is longer.',
    kw: 'career break calculator, sabbatical runway calculator, how long will savings last, career gap fund',
    inputs: [
      { id: 'monthlyExpenses', label: 'Monthly expenses', type: 'number', def: 2000 },
      { id: 'currentSavings', label: 'Savings set aside', type: 'number', def: 10000 },
      { id: 'monthlyIncome', label: 'Income during break', type: 'number', def: 0 },
      { id: 'plannedMonths', label: 'Planned break (months)', type: 'number', def: 12 }
    ],
    calc: function (v) {
      var net = v.monthlyExpenses - v.monthlyIncome;
      if (net <= 0) return { result: 'No drawdown: income covers expenses', chart: Charts.gauge(100, 100), extra: 'Your income during the break meets or beats your expenses' };
      var runway = v.currentSavings / net;
      var shortfall = Math.max(0, v.plannedMonths * net - v.currentSavings);
      return {
        result: 'Runway ' + runway.toFixed(1) + ' months | Shortfall at ' + v.plannedMonths + ' months: ' + shortfall.toFixed(0),
        chart: Charts.bar([runway, v.plannedMonths], ['Runway', 'Planned break']),
        extra: 'Net monthly drawdown ' + net.toFixed(0) + ' | ' + (shortfall > 0 ? 'Top up savings before you start' : 'Your fund covers the planned break') + ' | Excludes one-off costs and investment returns'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Net monthly drawdown equals monthly expenses minus any income during the break.',
        'Step 2: Runway in months equals savings divided by the net drawdown.',
        'Step 3: Compare the runway with the planned break length.',
        'Step 4: If the planned break is longer, shortfall equals planned months times net drawdown minus savings.',
        'Step 5: Add a buffer for one-off costs such as travel, healthcare and re-entry, since this model only counts regular monthly spending.'
      ];
    }
  },
  {
    id: 'cosigning-loan-risk', cat: 'finance',
    name: 'Cosigning a Loan Risk Calculator',
    desc: 'Estimate the financial exposure from cosigning a loan given the balance and the chance the borrower defaults.',
    kw: 'cosigning a loan calculator, cosigner risk, should i cosign a loan, loan default exposure',
    inputs: [
      { id: 'loanAmount', label: 'Outstanding balance', type: 'number', def: 20000 },
      { id: 'defaultProbabilityPct', label: 'Chance borrower defaults (percent)', type: 'number', def: 10 },
      { id: 'loanTermYears', label: 'Remaining term (years)', type: 'number', def: 5 }
    ],
    calc: function (v) {
      var exposure = v.loanAmount * v.defaultProbabilityPct / 100;
      return {
        result: 'Estimated exposure: ' + exposure.toFixed(0),
        chart: Charts.gauge(v.defaultProbabilityPct, 100),
        extra: 'Balance ' + v.loanAmount.toFixed(0) + ' over ' + v.loanTermYears + ' years | On default you can be pursued for the full balance, which hurts your credit too'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Start from the outstanding balance you would be guaranteeing.',
        'Step 2: Estimate the chance the borrower defaults, from their payment history and the loan type.',
        'Step 3: Expected exposure equals balance times default probability.',
        'Step 4: Remember that a default can leave you liable for the whole balance, not just the expected figure, and it can damage your credit.',
        'Step 5: This is a simple expected-value estimate. Treat a cosigned loan as your own debt in your budget.'
      ];
    }
  },
  {
    id: 'solar-payback', cat: 'homegarden',
    name: 'Solar Panel Payback Calculator',
    desc: 'Estimate solar panel payback period, net cost after incentives and lifetime savings from production and rate.',
    kw: 'solar payback calculator, solar panel roi, solar net cost calculator, solar savings over 25 years',
    inputs: [
      { id: 'systemCost', label: 'System cost', type: 'number', def: 15000 },
      { id: 'annualProductionKwh', label: 'Annual production (kWh)', type: 'number', def: 9000 },
      { id: 'annualUsageKwh', label: 'Annual usage (kWh)', type: 'number', def: 10000 },
      { id: 'electricityRate', label: 'Electricity rate per kWh', type: 'number', def: 0.2 },
      { id: 'incentivePct', label: 'Incentive or tax credit (percent)', type: 'number', def: 30 }
    ],
    calc: function (v) {
      var net = v.systemCost * (1 - v.incentivePct / 100);
      var savings = Math.min(v.annualProductionKwh, v.annualUsageKwh) * v.electricityRate;
      var payback = savings > 0 ? net / savings : 0;
      var lifetime = savings * 25 - net;
      return {
        result: 'Payback: ' + payback.toFixed(1) + ' years',
        chart: Charts.bar([net, savings * 25, lifetime], ['Net cost', '25yr savings', 'Lifetime net']),
        extra: 'Net cost ' + net.toFixed(0) + ' | Annual savings ' + savings.toFixed(0) + ' | 25-year net savings ' + lifetime.toFixed(0) + ' | Assumes steady rates and no battery'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Net cost equals system cost minus the incentive or tax credit.',
        'Step 2: Annual savings equals the lower of production and usage, times the electricity rate, since self-consumed power is what you avoid buying.',
        'Step 3: Payback equals net cost divided by annual savings.',
        'Step 4: Lifetime savings approximates 25 years of annual savings minus the net cost.',
        'Step 5: Real results vary with shading, degradation, rate changes and export rules, so get site-specific quotes.'
      ];
    }
  },
  {
    id: 'ev-charger-roi', cat: 'auto',
    name: 'EV Charger ROI Calculator',
    desc: 'Compare home EV charging running cost with petrol and work out the charger payback period.',
    kw: 'ev charger roi calculator, home ev charging cost, ev vs petrol cost calculator, ev charger payback',
    inputs: [
      { id: 'chargerCost', label: 'Charger unit cost', type: 'number', def: 1200 },
      { id: 'installCost', label: 'Installation cost', type: 'number', def: 800 },
      { id: 'annualMiles', label: 'Annual miles', type: 'number', def: 12000 },
      { id: 'gasPrice', label: 'Petrol price per gallon', type: 'number', def: 3.5 },
      { id: 'gasMpg', label: 'Petrol miles per gallon', type: 'number', def: 28 },
      { id: 'evMilesPerKwh', label: 'EV miles per kWh', type: 'number', def: 3.5 },
      { id: 'electricityRate', label: 'Electricity rate per kWh', type: 'number', def: 0.15 }
    ],
    calc: function (v) {
      var total = v.chargerCost + v.installCost;
      var gasYear = v.annualMiles / v.gasMpg * v.gasPrice;
      var evYear = v.annualMiles / v.evMilesPerKwh * v.electricityRate;
      var savings = gasYear - evYear;
      var payback = savings > 0 ? total / savings : 0;
      return {
        result: 'Charger payback: ' + payback.toFixed(1) + ' years',
        chart: Charts.bar([gasYear, evYear], ['Petrol', 'Electric']),
        extra: 'Installed ' + total.toFixed(0) + ' | Annual savings ' + savings.toFixed(0) + ' | Petrol ' + gasYear.toFixed(0) + ' a year vs electric ' + evYear.toFixed(0)
      };
    },
    steps: function (v) {
      return [
        'Step 1: Total installed cost equals the charger plus installation.',
        'Step 2: Annual petrol cost equals miles divided by miles per gallon, times the petrol price.',
        'Step 3: Annual electric cost equals miles divided by miles per kWh, times the electricity rate.',
        'Step 4: Annual savings is the difference; payback equals installed cost divided by annual savings.',
        'Step 5: Home charging is usually cheaper per mile than petrol, but public fast charging, off-peak rates and time-of-use tariffs change the figure.'
      ];
    }
  },
  {
    id: 'carbon-offset', cat: 'homegarden',
    name: 'Household Carbon Footprint and Offset Calculator',
    desc: 'Estimate a household annual carbon footprint from flights, driving and home electricity, plus the offset cost.',
    kw: 'carbon footprint calculator, carbon offset cost, household co2 estimate, offset my emissions cost',
    inputs: [
      { id: 'flights', label: 'Return flights a year', type: 'number', def: 4 },
      { id: 'hoursPerFlight', label: 'Average hours per flight', type: 'number', def: 6 },
      { id: 'carMiles', label: 'Car miles a year', type: 'number', def: 12000 },
      { id: 'homeKwh', label: 'Home electricity a year (kWh)', type: 'number', def: 8000 },
      { id: 'offsetPricePerTonne', label: 'Offset price per tonne', type: 'number', def: 15 }
    ],
    calc: function (v) {
      var f = v.flights * v.hoursPerFlight * 0.09;
      var c = v.carMiles * 0.0004;
      var h = v.homeKwh * 0.0004;
      var total = f + c + h;
      var cost = total * v.offsetPricePerTonne;
      return {
        result: 'Annual footprint: ' + total.toFixed(2) + ' tonnes CO2e',
        chart: Charts.donut([f, c, h], ['Flights', 'Car', 'Home']),
        extra: 'Offset cost about ' + cost.toFixed(0) + ' a year | Flights ' + f.toFixed(2) + ' | Car ' + c.toFixed(2) + ' | Home ' + h.toFixed(2)
      };
    },
    steps: function (v) {
      return [
        'Step 1: Flights are estimated at 0.09 tonnes per passenger-hour on a typical short to medium haul.',
        'Step 2: Driving is estimated at 0.0004 tonnes per mile for an average petrol car.',
        'Step 3: Home electricity is estimated at 0.0004 tonnes per kWh on a typical grid mix.',
        'Step 4: Add the three sources for the household total, then multiply by the offset price per tonne.',
        'Step 5: Reduce first and offset the rest. Offsets vary widely in quality and price, so prefer verified schemes.'
      ];
    }
  },
  {
    id: 'homeowner-first-year-budget', cat: 'homegarden',
    name: 'First-Year Homeowner Cost Calculator',
    desc: 'Total the cash you need in the first year of owning a home, from closing and moving to taxes and maintenance.',
    kw: 'first year homeowner cost, homeownership cost calculator, cost of buying a house first year, true cost of owning a home',
    inputs: [
      { id: 'homePrice', label: 'Home price', type: 'number', def: 300000 },
      { id: 'closingCosts', label: 'Closing costs', type: 'number', def: 6000 },
      { id: 'movingCost', label: 'Moving cost', type: 'number', def: 1500 },
      { id: 'furnishing', label: 'Furnishing and setup', type: 'number', def: 4000 },
      { id: 'emergencyRepairs', label: 'Emergency repairs', type: 'number', def: 2000 },
      { id: 'monthlyMortgage', label: 'Monthly mortgage payment', type: 'number', def: 1600 },
      { id: 'propertyTaxAnnual', label: 'Annual property tax', type: 'number', def: 3600 },
      { id: 'insuranceAnnual', label: 'Annual home insurance', type: 'number', def: 1200 },
      { id: 'maintenancePct', label: 'Maintenance (percent of price)', type: 'number', def: 1 }
    ],
    calc: function (v) {
      var maintenance = v.homePrice * v.maintenancePct / 100;
      var total = v.closingCosts + v.movingCost + v.furnishing + v.emergencyRepairs + v.monthlyMortgage * 12 + v.propertyTaxAnnual + v.insuranceAnnual + maintenance;
      return {
        result: 'First-year cash need: ' + total.toFixed(0),
        chart: Charts.bar([v.monthlyMortgage * 12, v.propertyTaxAnnual + v.insuranceAnnual + maintenance, v.closingCosts + v.movingCost + v.furnishing + v.emergencyRepairs], ['Mortgage', 'Tax and upkeep', 'Setup costs']),
        extra: 'Mortgage ' + (v.monthlyMortgage * 12).toFixed(0) + ' | Upkeep ' + (v.propertyTaxAnnual + v.insuranceAnnual + maintenance).toFixed(0) + ' | Setup ' + (v.closingCosts + v.movingCost + v.furnishing + v.emergencyRepairs).toFixed(0) + ' | Excludes utilities'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Add the one-off buying costs: closing costs, moving and basic furnishing.',
        'Step 2: Add a contingency for emergency repairs in the first year.',
        'Step 3: Add twelve months of mortgage payments.',
        'Step 4: Add the annual property tax and home insurance.',
        'Step 5: Add maintenance at about one percent of the home price a year, a common rule of thumb, then total the parts.'
      ];
    }
  },
  {
    id: 'study-abroad-cost', cat: 'education',
    name: 'Study Abroad Cost Calculator',
    desc: 'Estimate total international study cost from tuition by country, living costs and the number of years.',
    kw: 'study abroad cost calculator, cost of studying abroad, international student cost estimate, tuition and living cost abroad',
    inputs: [
      { id: 'country', label: 'Destination', type: 'select', options: ['USA', 'UK', 'Canada', 'Australia', 'Germany', 'UAE'], def: 'USA' },
      { id: 'years', label: 'Years of study', type: 'number', def: 4 },
      { id: 'livingCostPerYear', label: 'Living cost per year', type: 'number', def: 12000 },
      { id: 'tuitionPerYearOverride', label: 'Tuition per year (0 to use average)', type: 'number', def: 0 }
    ],
    calc: function (v) {
      var avg = { 'USA': 35000, 'UK': 25000, 'Canada': 22000, 'Australia': 28000, 'Germany': 1000, 'UAE': 18000 };
      var perYear = v.tuitionPerYearOverride > 0 ? v.tuitionPerYearOverride : (avg[v.country] || 25000);
      var tuition = perYear * v.years;
      var living = v.livingCostPerYear * v.years;
      var total = tuition + living;
      return {
        result: 'Estimated total cost: ' + total.toFixed(0),
        chart: Charts.bar([tuition, living], ['Tuition', 'Living']),
        extra: v.country + ' | Tuition ' + tuition.toFixed(0) + ' | Living ' + living.toFixed(0) + ' over ' + v.years + ' years | Excludes flights, insurance and visa fees'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Pick the destination and the average international tuition per year, or enter your own figure.',
        'Step 2: Multiply tuition per year by the number of years.',
        'Step 3: Multiply living cost per year by the number of years.',
        'Step 4: Add tuition and living for the total.',
        'Step 5: Add flights, health insurance, visa fees and any currency risk on top, since these can add several thousand a year.'
      ];
    }
  },
  {
    id: 'scholarship-gap', cat: 'education',
    name: 'Scholarship Funding Gap Calculator',
    desc: 'Work out the funding gap left after scholarships, family contribution and work-study, per year and in total.',
    kw: 'scholarship gap calculator, college funding gap, unmet need calculator, student aid gap',
    inputs: [
      { id: 'annualCost', label: 'Annual cost of study', type: 'number', def: 50000 },
      { id: 'scholarshipPerYear', label: 'Scholarships and grants per year', type: 'number', def: 20000 },
      { id: 'familyContributionPerYear', label: 'Family contribution per year', type: 'number', def: 15000 },
      { id: 'workStudyPerYear', label: 'Work-study per year', type: 'number', def: 3000 },
      { id: 'years', label: 'Years', type: 'number', def: 4 }
    ],
    calc: function (v) {
      var gap = Math.max(0, v.annualCost - v.scholarshipPerYear - v.familyContributionPerYear - v.workStudyPerYear);
      var total = gap * v.years;
      return {
        result: 'Annual gap: ' + gap.toFixed(0) + ' | Total need: ' + total.toFixed(0),
        chart: Charts.bar([v.scholarshipPerYear, v.familyContributionPerYear, v.workStudyPerYear, gap], ['Scholarships', 'Family', 'Work-study', 'Gap']),
        extra: (gap > 0 ? 'You still need to cover ' + gap.toFixed(0) + ' a year, likely with loans' : 'The sources fully cover the annual cost') + ' | Over ' + v.years + ' years the total is ' + total.toFixed(0)
      };
    },
    steps: function (v) {
      return [
        'Step 1: Start from the annual cost of study.',
        'Step 2: Subtract scholarships and grants, which do not have to be repaid.',
        'Step 3: Subtract the family contribution.',
        'Step 4: Subtract work-study earnings, then the remainder is the annual gap.',
        'Step 5: Multiply the annual gap by the number of years for the total amount you need to fund, usually through loans.'
      ];
    }
  },
  {
    id: 'ats-resume-score', cat: 'career',
    name: 'ATS Resume Score Checker',
    desc: 'Score a resume out of 100 for applicant tracking system friendliness from keywords, format and structure.',
    kw: 'ats resume score, ats checker, resume score calculator, will my resume pass ats',
    inputs: [
      { id: 'keywordMatchPct', label: 'Job keyword match (percent)', type: 'number', def: 70 },
      { id: 'quantifiedBulletsPct', label: 'Bullets with numbers (percent)', type: 'number', def: 60 },
      { id: 'hasContactInfo', label: 'Clear contact details', type: 'checkbox', def: true },
      { id: 'hasSkillsSection', label: 'Dedicated skills section', type: 'checkbox', def: true },
      { id: 'wordCount', label: 'Resume word count', type: 'number', def: 600 },
      { id: 'usesTablesGraphics', label: 'Uses tables, columns or graphics', type: 'checkbox', def: false },
      { id: 'fileFormat', label: 'File format', type: 'select', options: ['PDF (text-based)', 'DOCX', 'PDF (scanned image)'], def: 'PDF (text-based)' }
    ],
    calc: function (v) {
      var score = 0;
      score += Math.min(40, v.keywordMatchPct * 0.4);
      score += Math.min(30, v.quantifiedBulletsPct * 0.3);
      if (v.hasContactInfo) score += 10;
      if (v.hasSkillsSection) score += 10;
      if (v.wordCount >= 400 && v.wordCount <= 800) score += 10;
      if (v.fileFormat !== 'PDF (scanned image)') score += 10;
      if (v.usesTablesGraphics) score -= 10;
      score = Math.max(0, Math.min(100, Math.round(score)));
      return {
        result: 'ATS score: ' + score + ' out of 100',
        chart: Charts.gauge(score, 100),
        extra: 'Keywords ' + Math.min(40, v.keywordMatchPct * 0.4).toFixed(0) + ' | Quantified bullets ' + Math.min(30, v.quantifiedBulletsPct * 0.3).toFixed(0) + ' | Format ' + (v.fileFormat === 'PDF (scanned image)' ? 'scanned PDF, a common ATS failure' : 'text readable') + ' | Aim for 80 or more'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Keyword match adds up to 40 points, the single biggest factor.',
        'Step 2: Bullets that contain numbers add up to 30 points.',
        'Step 3: Clear contact details and a dedicated skills section add 10 points each.',
        'Step 4: A word count between 400 and 800 adds 10 points, and a text-readable file adds 10 more.',
        'Step 5: Tables, columns or graphics subtract 10 points because many systems cannot parse them. Aim for 80 or more.'
      ];
    }
  },
  {
    id: 'salary-negotiation-range', cat: 'career',
    name: 'Salary Negotiation Range Calculator',
    desc: 'Build an opening, target and walk-away salary range from market data, experience and offer strength.',
    kw: 'salary negotiation calculator, salary range calculator, how much to ask for salary, negotiation target salary',
    inputs: [
      { id: 'currentSalary', label: 'Current salary', type: 'number', def: 60000 },
      { id: 'marketLow', label: 'Market low', type: 'number', def: 65000 },
      { id: 'marketMedian', label: 'Market median', type: 'number', def: 75000 },
      { id: 'marketHigh', label: 'Market high', type: 'number', def: 85000 },
      { id: 'yearsExperience', label: 'Years relevant experience', type: 'number', def: 5 },
      { id: 'offerStrength', label: 'Your leverage', type: 'select', options: ['Strong', 'Moderate', 'Weak'], def: 'Strong' }
    ],
    calc: function (v) {
      var target = Math.min(v.marketHigh, Math.round(v.marketMedian * (1 + 0.02 * v.yearsExperience)));
      var sf = v.offerStrength === 'Strong' ? 1 : v.offerStrength === 'Moderate' ? 0.5 : 0;
      var opening = Math.round(target * (1 + 0.08 * sf));
      return {
        result: 'Target: ' + target + ' | Open at: ' + opening,
        chart: Charts.bar([v.marketLow, target, opening], ['Walk-away', 'Target', 'Opening']),
        extra: 'Walk away below ' + v.marketLow + ' | Market median ' + v.marketMedian + ' | Current ' + v.currentSalary + ' | Ask for the whole package, not just base'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Start from the market median for the role and location.',
        'Step 2: Add about two percent per year of relevant experience, capped at the market high.',
        'Step 3: That gives your target. Your opening ask sits above the target by up to eight percent depending on leverage.',
        'Step 4: Your walk-away is the market low, the figure below which you would rather not accept.',
        'Step 5: Anchor at the opening, justify it with results, and negotiate the whole package including bonus, equity, leave and flexibility.'
      ];
    }
  }
];

const S = {
  'divorce-cost': {
    title: 'Divorce Cost Estimator: Fees by Route',
    metaDesc: 'Estimate the cost of a divorce by process route, lawyer hourly rate, hours worked and children, with low, mid and high figures.',
    lsi: ['divorce cost calculator', 'divorce cost estimate', 'cost of divorce', 'contested divorce cost'],
    what: 'It estimates legal fees for a divorce or separation from the route you choose, the hourly rate, the hours worked and the number of children.',
    inputsText: 'the process route, the lawyer hourly rate, the total hours and the number of children.',
    outputText: 'an estimated total cost with low, mid and high bands.',
    methodText: 'the hourly rate times hours times a route factor, plus an allowance per child.',
    quick: 'A lawyer-negotiated divorce at 300 an hour for twenty hours comes to about 6,000 before child-related work. Mediation is roughly 40 percent of that and contested court can be two and a half times as much.',
    body: 'Divorce costs swing enormously with how the parties separate. A mediated separation, where both sides settle directly with a neutral, is cheapest because lawyer time is minimal. A lawyer-negotiated settlement sits in the middle, and a contested court case is the most expensive because it adds hearings, discovery and heavy correspondence. This tool starts from an hourly rate and an estimate of hours, then applies a route factor so you can compare the three paths on the same footing. It also adds a per-child allowance, since parenting plans and custody work add correspondence and meetings. Every jurisdiction differs, and how cooperative the other side is often matters more than the law itself, so treat the figure as a planning range and get local quotes.',
    formula: 'Estimated cost = hourly rate x total hours x route factor + children x 500, where the route factor is 0.4 for mediation, 1.0 for lawyer negotiation and 2.5 for contested court.',
    example: 'A lawyer-negotiated divorce charged at 300 an hour for twenty hours costs 6,000. The same case through mediation at the same rate and hours costs about 2,400, while a contested court case costs about 15,000, before any child-related work.',
    mistakes: ['Assuming the cheapest route is best, when a short sharp court case can be cheaper than long drawn-out negotiation.', 'Forgetting the add-ons such as filing fees, court costs and valuations, which sit outside lawyer hours.', 'Not asking for a fee estimate in writing before work starts.'],
    assumptions: 'The estimate covers legal fees only. Filing fees, expert valuations, mediation fees billed separately and disbursements are excluded, and the route factors are planning heuristics rather than fixed rules.',
    disclaimer: 'This is an educational estimate, not legal or financial advice. Divorce costs depend on the law, the jurisdiction and the facts of each case, so obtain written quotes and independent advice before committing.',
    related: [
      { href: '/family/alimony-estimator', text: 'Alimony and Spousal Support Estimator' },
      { href: '/finance/power-of-attorney-cost', text: 'Power of Attorney and Will Cost Estimator' },
      { href: '/finance/cosigning-loan-risk', text: 'Cosigning a Loan Risk Calculator' }
    ],
    howAnswer: 'The hourly rate is multiplied by the hours worked and a route factor, then a per-child allowance is added. The steps panel shows each figure.',
    needAnswer: 'The process route, a lawyer hourly rate, an estimate of total hours and the number of children. Everything else is built in.',
    resultAnswer: 'An estimated total cost with low, mid and high bands and the split between legal fees and child-related work.',
    extraFaqs: [
      ['Is mediation really cheaper than using lawyers?', 'Usually. In mediation the parties settle directly with a neutral, so lawyer hours are far lower, though each side may still take advice on the final agreement.'],
      ['Can I get divorced without a lawyer at all?', 'Some jurisdictions allow it for simple, uncontested cases. Where assets, children or disputes are involved, a lawyer review is usually worth the cost to avoid a costly mistake.']
    ],
    contractInputs: 'Process route (select); Lawyer hourly rate (number); Total lawyer hours (number); Children involved (number)',
    contractFormula: 'cost = hourlyRate * totalHours * routeFactor + children * 500; routeFactor: mediation 0.4, negotiated 1.0, contested 2.5'
  },
  'moving-abroad-cost': {
    title: 'Moving Abroad Cost Estimator',
    metaDesc: 'Estimate the one-time cost of moving abroad from shipping volume, visas, flights and a settling-in deposit by destination.',
    lsi: ['moving abroad cost calculator', 'relocation cost estimate', 'emigrate cost calculator', 'international moving cost'],
    what: 'It estimates the one-time cost of an international move from the shipment size, visa fees, flights and a settling-in deposit.',
    inputsText: 'the destination, shipment volume in cubic meters, the number of adults and children, and whether to include a deposit.',
    outputText: 'a total one-time moving cost broken into shipping, visas, flights and deposit.',
    methodText: 'shipping plus visa fees plus flights plus an optional rental deposit.',
    quick: 'Moving one adult to the USA with ten cubic meters of belongings comes to about 4,700 one-time, before any ongoing rent or living costs.',
    body: 'Moving abroad has two cost layers. The one-time cost covers shipping, visas, flights and a settling-in deposit. The ongoing cost is the rent, food and transport that start the day you arrive, and that often dwarfs the one-time figure. This tool handles the one-time layer so you can budget the cash you need before you leave. Shipping is priced per cubic meter, so decluttering before the move pays for itself. Visa fees vary widely by destination and route, flights are roughly flat per adult, and the deposit is a placeholder for the first months of rent. Use the result as the lump sum you need saved, then plan the recurring costs separately.',
    formula: 'Total = cubic meters x 120 + adults x destination visa fee + children x 400 + adults x 800 + children x 500 + optional 1500 deposit.',
    example: 'One adult moving to the USA with ten cubic meters and a deposit: shipping 1,200 plus visa 1,200 plus flight 800 plus deposit 1,500, giving about 4,700 one-time.',
    mistakes: ['Budgeting only the move and forgetting the first months of living costs before any local income starts.', 'Overestimating the shipment and paying for cubic meters that never get used.', 'Ignoring currency swings, which can change the real cost by several percent between planning and payment.'],
    assumptions: 'Shipping is priced at a flat rate per cubic meter, visa fees are destination averages for a typical skilled or family route, and flights and deposits are placeholders. Pet relocation, vehicle shipping and import duties are excluded.',
    disclaimer: 'This is a budgeting estimate only, not immigration or tax advice. Visa fees, shipping rates and deposits change often and vary by route, so confirm current figures with the relevant authority and a moving company.',
    related: [
      { href: '/education/study-abroad-cost', text: 'Study Abroad Cost Calculator' },
      { href: '/career/career-break-runway', text: 'Career Break Runway Calculator' },
      { href: '/career/canada-crs', text: 'Canada CRS Score Estimator' }
    ],
    howAnswer: 'Shipping volume is multiplied by a per-cubic-meter rate, then visa fees, flights and an optional deposit are added. The steps panel lists each part.',
    needAnswer: 'The destination, the shipment volume in cubic meters, the number of adults and children, and whether you expect a rental deposit.',
    resultAnswer: 'A total one-time moving cost split into shipping, visas, flights and deposit, excluding ongoing living costs.',
    extraFaqs: [
      ['How much does it cost to move abroad with a family?', 'Each child adds a reduced visa fee and a cheaper flight, but the biggest driver is usually rent deposits and the first months of living costs rather than the move itself.'],
      ['Can I reduce moving costs?', 'Yes. Ship less, travel off-peak, time the move to avoid double rent, and use a shared or part-load container rather than a dedicated one.']
    ],
    contractInputs: 'Destination (select); Shipment volume (number); Adults (number); Children (number); Include rental deposit (checkbox)',
    contractFormula: 'total = cubicMeters * 120 + adults * visaFee(destination) + children * 400 + adults * 800 + children * 500 + (deposit ? 1500 : 0)'
  },
  'career-break-runway': {
    title: 'Career Break Runway Calculator',
    metaDesc: 'See how many months your savings last on a career break or sabbatical, and the shortfall if the break runs longer than the fund.',
    lsi: ['career break calculator', 'sabbatical runway calculator', 'how long will savings last', 'career gap fund'],
    what: 'It shows how long your savings last on a career break and how much more you need if the break runs longer than the fund covers.',
    inputsText: 'monthly expenses, savings set aside, any income during the break and the planned break length.',
    outputText: 'the runway in months and the shortfall in money at the planned break length.',
    methodText: 'savings divided by the net monthly drawdown, plus a shortfall check against the planned break.',
    quick: 'With 2,000 of monthly expenses, 10,000 saved and no income, the runway is five months. A twelve-month break leaves a shortfall of about 14,000.',
    body: 'A career break, sabbatical or study gap is easier to take once you know the number that matters: how long your money lasts. The net drawdown is what you spend each month minus anything you earn during the break, so a part-time project or rental income stretches the runway. This tool divides your savings by that drawdown and compares it with the length you plan. Where the break is longer, it quantifies the shortfall so you know how much to save first or how much side income to line up. It counts regular monthly spending only, so add a buffer for one-off costs like travel, health cover and the costs of returning to work, such as new clothes or certification.',
    formula: 'Runway months = savings / (monthly expenses minus monthly income). Shortfall = max(0, planned months x net drawdown minus savings).',
    example: 'Expenses of 2,000 a month, savings of 10,000 and no income give a net drawdown of 2,000 and a runway of five months. A planned twelve-month break leaves a shortfall of 12 x 2,000 minus 10,000, which is 14,000.',
    mistakes: ['Forgetting health insurance and pension contributions, which often stop when employment stops.', 'Assuming savings grow, when a break usually spends the cash rather than investing it.', 'Leaving no buffer for returning to work, when job hunting can take months.'],
    assumptions: 'Regular monthly spending is assumed steady, savings earn nothing during the break, and no tax or benefit changes are modelled. One-off costs and investment returns are excluded.',
    disclaimer: 'This is a personal budgeting estimate, not financial advice. Tax, benefits and health cover depend on your situation, so confirm the effect of a break on your income and pension before you commit.',
    related: [
      { href: '/career/salary-negotiation-range', text: 'Salary Negotiation Range Calculator' },
      { href: '/finance/cosigning-loan-risk', text: 'Cosigning a Loan Risk Calculator' },
      { href: '/career/australia-pr-points', text: 'Australia PR Points Calculator' }
    ],
    howAnswer: 'Net drawdown is expenses minus income, runway is savings divided by drawdown, and the shortfall is the extra cash needed if the planned break is longer. The steps panel shows each part.',
    needAnswer: 'Monthly expenses, savings set aside, any income during the break and the planned break length.',
    resultAnswer: 'The runway in months and the shortfall at your planned break length, so you know whether to save more before you start.',
    extraFaqs: [
      ['How much should I save before a career break?', 'A common target is the runway you need plus three to six months of buffer. This tool shows the runway, so add the buffer on top for re-entry and one-off costs.'],
      ['Does a career break hurt my career?', 'A planned, well-explained break is usually fine. Keep your skills current, frame the break positively, and line up references before you leave.']
    ],
    contractInputs: 'Monthly expenses (number); Savings set aside (number); Income during break (number); Planned break months (number)',
    contractFormula: 'net = expenses - income; runway = savings / net; shortfall = max(0, plannedMonths * net - savings)'
  },
  'cosigning-loan-risk': {
    title: 'Cosigning a Loan Risk Calculator',
    metaDesc: 'Estimate your financial exposure from cosigning a loan, from the outstanding balance and the chance the borrower defaults.',
    lsi: ['cosigning a loan calculator', 'cosigner risk', 'should i cosign a loan', 'loan default exposure'],
    what: 'It estimates your expected financial exposure from cosigning a loan, based on the balance and the chance the borrower defaults.',
    inputsText: 'the outstanding balance, the estimated chance of default and the remaining term.',
    outputText: 'an expected exposure figure and a gauge of the default risk you entered.',
    methodText: 'the outstanding balance multiplied by the estimated chance of default.',
    quick: 'Cosigning a 20,000 loan where the borrower has a one in ten chance of defaulting gives an expected exposure of about 2,000, but a real default would leave you liable for the full balance.',
    body: 'Cosigning feels generous and costless, but legally you promise to pay the loan if the borrower does not. Lenders only ask for a cosigner when the borrower is a risk, so treat the request as a signal. This tool estimates expected exposure as the balance times the chance of default. That number is a planning figure, not a comfort: if a default happens you can be pursued for the whole outstanding balance, interest and fees, and the missed payments appear on your credit report too, which can block your own borrowing for years. Weigh the expected figure against your ability to absorb the full balance, and consider how the relationship would survive a default before you sign.',
    formula: 'Expected exposure = outstanding balance x default probability as a decimal. The full balance is the worst case.',
    example: 'A 20,000 balance with a ten percent chance of default gives an expected exposure of 2,000. The worst case, if the borrower defaults, is the entire 20,000 plus interest and fees.',
    mistakes: ['Focusing on the expected figure and ignoring that a default passes the whole balance to you.', 'Assuming the money is not really yours, when lenders count a cosigned loan against your own debt-to-income ratio.', 'Cosigning for someone without seeing the payment schedule and their plan to cover it.'],
    assumptions: 'Default probability is your own estimate and is assumed constant. The model ignores interest, late fees, collections costs and the credit-score damage of a default, all of which increase the true cost.',
    disclaimer: 'This is an educational estimate, not financial or legal advice. Cosigning creates a binding obligation, so read the loan agreement and consider independent advice before you sign.',
    related: [
      { href: '/finance/divorce-cost', text: 'Divorce Cost Estimator' },
      { href: '/finance/career-break-runway', text: 'Career Break Runway Calculator' },
      { href: '/finance/moving-abroad-cost', text: 'Moving Abroad Cost Estimator' }
    ],
    howAnswer: 'The outstanding balance is multiplied by the estimated chance of default to give expected exposure, with the full balance as the worst case. The steps panel lists each stage.',
    needAnswer: 'The outstanding balance, your estimate of the chance of default and the remaining term. Everything else is built in.',
    resultAnswer: 'An expected exposure figure in money plus a gauge of the default risk, alongside a reminder about the full-balance worst case.',
    extraFaqs: [
      ['Does cosigning hurt my credit score?', 'The loan shows on your credit report. On-time payments can help, but a default, late payment or a high debt-to-income ratio can hurt your score and your ability to borrow.'],
      ['Can I get out of cosigning later?', 'Usually only if the borrower refinances in their own name or the lender agrees to a cosigner release. Most lenders are not obliged to release you, so treat the obligation as long term.']
    ],
    contractInputs: 'Outstanding balance (number); Chance borrower defaults percent (number); Remaining term years (number)',
    contractFormula: 'exposure = loanAmount * defaultProbabilityPct / 100'
  },
  'solar-payback': {
    title: 'Solar Panel Payback Calculator',
    metaDesc: 'Estimate solar panel payback, the net cost after incentives and lifetime savings from production, usage and electricity rate.',
    lsi: ['solar payback calculator', 'solar panel roi', 'solar net cost calculator', 'solar savings over 25 years'],
    what: 'It estimates how long a solar system takes to pay for itself and how much it saves over its life, after any incentive.',
    inputsText: 'system cost, annual production, annual usage, the electricity rate and the incentive percentage.',
    outputText: 'the payback period in years, the net cost and the estimated lifetime savings.',
    methodText: 'net cost after incentive divided by annual savings, where savings use the lower of production and usage.',
    quick: 'A 15,000 system with a thirty percent incentive has a net cost of 10,500. Producing 9,000 kWh against a rate of 0.20 saves about 1,800 a year, so payback is roughly 5.8 years.',
    body: 'Solar economics turn on three numbers: what the system costs after incentives, how much power it makes, and what you would otherwise pay for that power. This tool nets off any tax credit or incentive first, then values production at your electricity rate, counting only the power you actually consume, because self-consumed electricity is what you avoid buying. That is why production above your usage does not increase savings unless you have an export tariff that pays well. Dividing net cost by annual savings gives the payback period. From there the lifetime figure stretches the annual saving across a typical twenty-five-year panel life. Real outcomes depend on shading, orientation, panel degradation, future rate changes and export rules, so get site-specific quotes.',
    formula: 'Net cost = system cost x (1 minus incentive fraction). Annual savings = min(production, usage) x rate. Payback = net cost / annual savings. Lifetime net = annual savings x 25 minus net cost.',
    example: 'A 15,000 system with a thirty percent credit gives a net cost of 10,500. Producing 9,000 kWh against an annual usage of 10,000 kWh at 0.20 a unit saves 1,800 a year, giving a payback of about 5.8 years and about 34,500 of net savings over twenty-five years.',
    mistakes: ['Counting all production as savings even when much is exported at a low rate.', 'Ignoring shading, roof orientation and dirt, which cut real output below the quoted figure.', 'Assuming electricity rates stay flat, when they usually rise over time, which actually improves payback.'],
    assumptions: 'Panels are assumed to last twenty-five years at a steady output, rates are steady, no battery is included, and all production is valued at the retail rate. Financing costs and export tariffs are excluded.',
    disclaimer: 'This is an educational estimate, not a quote or financial advice. Solar output, incentives and tariffs vary by location and change over time, so use site-specific proposals before deciding.',
    related: [
      { href: '/auto/ev-charger-roi', text: 'EV Charger ROI Calculator' },
      { href: '/homegarden/carbon-offset', text: 'Household Carbon Footprint and Offset Calculator' },
      { href: '/homegarden/homeowner-first-year-budget', text: 'First-Year Homeowner Cost Calculator' }
    ],
    howAnswer: 'The incentive is subtracted from the system cost, annual savings are the lower of production and usage times the rate, and payback is net cost divided by annual savings. The steps panel shows each part.',
    needAnswer: 'The system cost, annual production, annual usage, the electricity rate and the incentive percentage.',
    resultAnswer: 'The payback period in years, the net cost and the estimated twenty-five-year net savings.',
    extraFaqs: [
      ['Is solar worth it if I use little electricity?', 'It depends on the export tariff. If you cannot use the power and the export rate is low, savings are limited, so a smaller system sized to your usage is usually better.'],
      ['Does adding a battery improve payback?', 'A battery raises the cost, which lengthens simple payback, but it can help if your tariff has high evening rates or you value backup power. Model it separately.']
    ],
    contractInputs: 'System cost (number); Annual production kWh (number); Annual usage kWh (number); Electricity rate per kWh (number); Incentive percent (number)',
    contractFormula: 'net = systemCost * (1 - incentivePct/100); savings = min(production, usage) * rate; payback = net / savings; lifetime = savings * 25 - net'
  },
  'ev-charger-roi': {
    title: 'EV Charger ROI Calculator',
    metaDesc: 'Compare home EV charging with petrol running costs and work out how fast a home charger pays for itself.',
    lsi: ['ev charger roi calculator', 'home ev charging cost', 'ev vs petrol cost calculator', 'ev charger payback'],
    what: 'It compares the yearly cost of charging an EV at home with petrol, and shows how quickly the home charger pays for itself.',
    inputsText: 'charger and installation cost, annual miles, petrol price, petrol economy, EV efficiency and the electricity rate.',
    outputText: 'the payback period in years plus the annual petrol and electric cost comparison.',
    methodText: 'annual petrol cost versus annual electric cost, with payback from the installed cost divided by annual savings.',
    quick: 'A charger costing 2,000 installed, saving about 986 a year against petrol, pays for itself in roughly two years, after which the saving is pure gain.',
    body: 'A home charger is a small capital cost that produces a stream of savings every mile you drive. The comparison is simple: petrol costs miles divided by miles per gallon, times the price per gallon, while home charging costs miles divided by miles per kWh, times the price per kWh. Because electric motors are far more efficient, the per-mile cost is usually much lower, so the savings accumulate quickly. This tool divides the installed cost by the annual saving to give the payback period. The result is sensitive to the petrol price, the electricity rate and whether you can charge on a cheap overnight tariff, where off-peak rates can shorten payback substantially. Public fast charging is far more expensive than home charging and can erase much of the advantage.',
    formula: 'Annual petrol = miles / mpg x gas price. Annual electric = miles / miles per kWh x rate. Savings = petrol minus electric. Payback = installed cost / savings.',
    example: 'Charger and installation of 2,000, 12,000 miles a year, petrol at 3.5 a gallon and 28 mpg give about 1,500 a year in petrol. Using 3.5 miles per kWh at 0.15 a unit gives about 514 in electricity, so the saving is about 986 and payback is roughly two years.',
    mistakes: ['Ignoring the cost of a home electrical upgrade, which some homes need before a charger can be fitted.', 'Comparing home charging with petrol while actually relying on expensive public fast charging.', 'Assuming the same efficiency in winter, when cold weather cuts EV range and raises cost per mile.'],
    assumptions: 'Efficiency and prices are held constant, and no off-peak tariff, solar or battery is modelled. Charger incentives, electrical upgrades and public charging are excluded.',
    disclaimer: 'This is an educational estimate, not a quote or financial advice. Real running costs depend on your tariff, driving, weather and the vehicle, so verify with current prices before buying.',
    related: [
      { href: '/homegarden/solar-payback', text: 'Solar Panel Payback Calculator' },
      { href: '/homegarden/homeowner-first-year-budget', text: 'First-Year Homeowner Cost Calculator' },
      { href: '/homegarden/carbon-offset', text: 'Household Carbon Footprint and Offset Calculator' }
    ],
    howAnswer: 'Petrol cost per year is miles divided by mpg times the petrol price, electric cost is miles divided by miles per kWh times the rate, and payback is installed cost divided by the annual saving. The steps panel shows each part.',
    needAnswer: 'Charger and installation cost, annual miles, petrol price and economy, EV efficiency in miles per kWh, and your electricity rate.',
    resultAnswer: 'The charger payback period in years plus a side-by-side of annual petrol and electric running costs.',
    extraFaqs: [
      ['Is a home charger worth it if I drive few miles?', 'Less so. Payback lengthens as annual miles fall, so low-mileage drivers may be better off with a standard plug and occasional public charging.'],
      ['Do off-peak tariffs really help?', 'Often yes. Charging overnight on a cheap rate can cut the per-mile cost further and shorten payback, provided you can schedule charging to those hours.']
    ],
    contractInputs: 'Charger unit cost (number); Installation cost (number); Annual miles (number); Petrol price per gallon (number); Petrol mpg (number); EV miles per kWh (number); Electricity rate per kWh (number)',
    contractFormula: 'gasYear = miles / mpg * gasPrice; evYear = miles / milesPerKwh * rate; savings = gasYear - evYear; payback = (chargerCost + installCost) / savings'
  },
  'carbon-offset': {
    title: 'Household Carbon Footprint Calculator',
    metaDesc: 'Estimate a household annual carbon footprint from flights, driving and home electricity, and the cost to offset the tonnes.',
    lsi: ['carbon footprint calculator', 'carbon offset cost', 'household co2 estimate', 'offset emissions cost'],
    what: 'It estimates a household annual carbon footprint from flights, driving and electricity, and the cost to offset it.',
    inputsText: 'return flights and average duration, annual car miles, annual home electricity and the offset price per tonne.',
    outputText: 'the annual footprint in tonnes of CO2e, a source breakdown and the offset cost.',
    methodText: 'emission factors per flight hour, per mile driven and per kWh of electricity, summed and priced per tonne.',
    quick: 'Four six-hour flights, 12,000 car miles and 8,000 kWh of electricity come to about 10.2 tonnes of CO2e a year, which costs roughly 152 to offset at 15 a tonne.',
    body: 'A household footprint is the sum of a few big sources. Flying is usually the largest per hour, driving is the largest per year for many households, and home electricity depends on the grid mix. This tool applies simple emission factors to each source, adds them, and prices the total at the offset rate you enter. The point of measuring is to cut the biggest source first, since offsets are a last resort, not a licence to emit. Where you do offset, prefer verified schemes that would not happen without the money. Prices vary widely, from a few to dozens per tonne, and high price does not always mean high quality, so check the standard behind any scheme.',
    formula: 'Flights = flights x hours x 0.09 tonnes. Driving = miles x 0.0004 tonnes. Electricity = kWh x 0.0004 tonnes. Total cost = total tonnes x offset price per tonne.',
    example: 'Four six-hour flights give 2.16 tonnes, 12,000 car miles give 4.8 tonnes and 8,000 kWh of electricity gives 3.2 tonnes, for about 10.16 tonnes, which costs about 152 to offset at 15 a tonne.',
    mistakes: ['Counting flights once when a return trip is two legs, which can halve the true total.', 'Offsetting instead of reducing, when cutting the biggest source is cheaper and more certain.', 'Buying the cheapest offset without checking it is verified and additional.'],
    assumptions: 'Flat average emission factors are used for flights, driving and electricity. Radiative forcing from high-altitude flights, grid variation and embodied emissions are not included, so the figure is an approximation.',
    disclaimer: 'This is an educational estimate, not a certified audit or financial advice. Emission factors and offset quality vary, so use an accredited calculator and verified offset standards for anything formal.',
    related: [
      { href: '/homegarden/solar-payback', text: 'Solar Panel Payback Calculator' },
      { href: '/auto/ev-charger-roi', text: 'EV Charger ROI Calculator' },
      { href: '/homegarden/homeowner-first-year-budget', text: 'First-Year Homeowner Cost Calculator' }
    ],
    howAnswer: 'Emission factors are applied to flights, driving and electricity, the three are added for the total, and the total is multiplied by the offset price. The steps panel labels each factor.',
    needAnswer: 'Return flights and their average length, annual car miles, annual electricity use and the offset price per tonne.',
    resultAnswer: 'The annual footprint in tonnes of CO2e with a breakdown by source, plus the estimated cost to offset it.',
    extraFaqs: [
      ['What does CO2e mean?', 'It means carbon dioxide equivalent, which bundles other greenhouse gases such as methane into a single number using their warming potential, so sources can be compared fairly.'],
      ['Is offsetting the same as reducing my footprint?', 'No. Reducing cuts emissions at the source. Offsetting pays for cuts elsewhere, so it should come after reduction, not instead of it.']
    ],
    contractInputs: 'Return flights a year (number); Hours per flight (number); Car miles a year (number); Home electricity kWh a year (number); Offset price per tonne (number)',
    contractFormula: 'total = flights*hoursPerFlight*0.09 + carMiles*0.0004 + homeKwh*0.0004; cost = total * offsetPricePerTonne'
  },
  'homeowner-first-year-budget': {
    title: 'First-Year Homeowner Cost Calculator',
    metaDesc: 'Total the cash you need in the first year of owning a home, from closing and moving to taxes, insurance and maintenance.',
    lsi: ['first year homeowner cost', 'homeownership cost calculator', 'true cost of owning a home', 'cost of buying a house first year'],
    what: 'It totals the cash a new owner needs in the first year, from one-off buying costs to mortgage, taxes, insurance and upkeep.',
    inputsText: 'home price, closing, moving, furnishing and repair costs, monthly mortgage, annual tax and insurance, and a maintenance percentage.',
    outputText: 'the total first-year cash need split into mortgage, upkeep and setup costs.',
    methodText: 'one-off buying costs plus twelve mortgage payments plus tax, insurance and maintenance as a share of the price.',
    quick: 'On a 300,000 home, the first year can need about 40,500 in cash once closing, moving, furnishing, a repair buffer, a year of mortgage payments, taxes, insurance and one percent maintenance are added.',
    body: 'The sticker price of a home is not the cost of owning it. The first year carries a pile of cash costs that renters never see: closing costs, moving, basic furnishing, and a repair buffer for the surprise that always comes. Then the recurring costs begin: twelve mortgage payments, property tax, home insurance and maintenance. Maintenance is commonly budgeted at about one percent of the home price a year, though older and larger homes need more. This tool totals all of it so you can see the real cash you need before you commit. It excludes utilities, which add another monthly layer, and any renovation you plan to do deliberately.',
    formula: 'Total = closing + moving + furnishing + repairs + 12 x mortgage + annual tax + annual insurance + home price x maintenance percent / 100.',
    example: 'A 300,000 home with 6,000 closing, 1,500 moving, 4,000 furnishing, a 2,000 repair buffer, a 1,600 monthly mortgage, 3,600 tax, 1,200 insurance and one percent maintenance gives about 40,500 for the first year.',
    mistakes: ['Budgeting for the deposit and closing but forgetting furnishing, repairs and the first tax bill.', 'Underestimating maintenance, when one percent of the price a year is a common floor, not a ceiling.', 'Ignoring that property tax and insurance often rise after the first year.'],
    assumptions: 'Maintenance is set at a percentage of the home price rather than an inspection estimate, and utilities, HOA fees, renovation and any interest-rate changes are excluded.',
    disclaimer: 'This is a budgeting estimate, not financial advice. Taxes, insurance and maintenance vary by location and property, so build a buffer and confirm local costs before buying.',
    related: [
      { href: '/homegarden/solar-payback', text: 'Solar Panel Payback Calculator' },
      { href: '/auto/ev-charger-roi', text: 'EV Charger ROI Calculator' },
      { href: '/finance/cosigning-loan-risk', text: 'Cosigning a Loan Risk Calculator' }
    ],
    howAnswer: 'One-off buying costs are added to twelve mortgage payments, annual tax and insurance, and maintenance at a share of the price. The steps panel lists each block.',
    needAnswer: 'The home price, one-off buying costs, monthly mortgage, annual tax and insurance, and a maintenance percentage.',
    resultAnswer: 'The total first-year cash need split into mortgage, tax and upkeep, and setup costs.',
    extraFaqs: [
      ['How much should I budget for home maintenance?', 'About one percent of the home price a year is a common starting rule, but older homes, large gardens and big roofs need more, so build a buffer.'],
      ['Does the first year cost more than later years?', 'Usually yes, because of closing, moving, furnishing and the first-year repair surprises. Later years settle into mortgage, tax, insurance and maintenance.']
    ],
    contractInputs: 'Home price (number); Closing costs (number); Moving cost (number); Furnishing and setup (number); Emergency repairs (number); Monthly mortgage (number); Annual property tax (number); Annual home insurance (number); Maintenance percent (number)',
    contractFormula: 'total = closing + moving + furnishing + repairs + mortgage*12 + tax + insurance + homePrice * maintenancePct / 100'
  },
  'study-abroad-cost': {
    title: 'Study Abroad Cost Calculator',
    metaDesc: 'Estimate total international study cost from average tuition by country, living costs and the number of years abroad.',
    lsi: ['study abroad cost calculator', 'cost of studying abroad', 'international student cost estimate', 'tuition and living cost abroad'],
    what: 'It estimates the total cost of an international degree from average tuition by destination, living costs and the number of years.',
    inputsText: 'the destination, years of study, living cost per year and an optional tuition override.',
    outputText: 'the total cost split into tuition and living.',
    methodText: 'average or custom tuition per year times years, plus living cost per year times years.',
    quick: 'A four-year degree in the USA at an average 35,000 tuition and 12,000 living cost comes to about 188,000 in total, before flights and insurance.',
    body: 'Studying abroad is priced in two blocks: tuition per year and living cost per year, each multiplied by the length of the course. Tuition varies enormously by destination, from low public fees in Germany to high private rates in the USA, so the destination choice drives the total more than anything else. Living cost depends on the city as much as the country, and it is often underestimated. This tool uses average international tuition per destination, which you can override with a specific program fee. The result is the headline study cost only, so add international flights, mandatory health insurance, visa and application fees, and a margin for currency swings, which can add several thousand a year and catch families out mid-course.',
    formula: 'Total = tuition per year x years + living cost per year x years.',
    example: 'Four years in the USA at an average tuition of 35,000 and living costs of 12,000 a year gives tuition of 140,000 and living of 48,000, for a total of about 188,000.',
    mistakes: ['Comparing tuition only and ignoring living costs, which can rival tuition in expensive cities.', 'Forgetting that fees often rise each year and that exchange rates move.', 'Overlooking insurance, flights and visa costs, which add a steady annual amount.'],
    assumptions: 'Tuition is an average for international students and does not reflect individual scholarships. Living cost is a flat annual figure, and fees are assumed not to rise over the course.',
    disclaimer: 'This is a budgeting estimate, not financial or immigration advice. University fees, living costs and visa rules change, so confirm current figures with each institution and plan for currency risk.',
    related: [
      { href: '/education/scholarship-gap', text: 'Scholarship Funding Gap Calculator' },
      { href: '/career/canada-crs', text: 'Canada CRS Score Estimator' },
      { href: '/finance/moving-abroad-cost', text: 'Moving Abroad Cost Estimator' }
    ],
    howAnswer: 'Tuition per year is multiplied by the years, living cost per year is multiplied by the years, and the two are added. The steps panel shows each part.',
    needAnswer: 'The destination, the number of years, living cost per year and an optional tuition figure if you have a specific program fee.',
    resultAnswer: 'The total study cost split into tuition and living, excluding flights, insurance and visa fees.',
    extraFaqs: [
      ['Which countries are cheapest for international students?', 'Public universities in Germany and some other European countries charge low or no tuition, though living costs remain and some fees apply. The cheapest option depends on your field and city.'],
      ['Can I work while studying abroad?', 'Many countries allow limited part-time work on a student visa, which can offset living costs but rarely covers tuition. Check the rules for your destination before you rely on it.']
    ],
    contractInputs: 'Destination (select); Years of study (number); Living cost per year (number); Tuition per year override (number)',
    contractFormula: 'tuition = (override > 0 ? override : avgTuition(country)) * years; living = livingCostPerYear * years; total = tuition + living'
  },
  'scholarship-gap': {
    title: 'Scholarship Funding Gap Calculator',
    metaDesc: 'Work out the funding gap left after scholarships, family contribution and work-study, per year and over the whole course.',
    lsi: ['scholarship gap calculator', 'college funding gap', 'unmet need calculator', 'student aid gap'],
    what: 'It shows the unmet funding gap after scholarships, family support and work-study are counted, per year and in total.',
    inputsText: 'annual cost, scholarships and grants, family contribution, work-study and the number of years.',
    outputText: 'the annual gap and the total funding need over the course.',
    methodText: 'annual cost minus scholarships, family contribution and work-study, multiplied by the years.',
    quick: 'A 50,000 annual cost with 20,000 in scholarships, 15,000 from family and 3,000 from work-study leaves a 12,000 annual gap, or 48,000 over four years.',
    body: 'Most aid awards do not cover the full cost, and the unmet piece is what usually becomes loans. This tool lays out the funding stack so the gap is visible early, while there is still time to apply for more. Start from the annual cost of study, then subtract scholarships and grants, which do not have to be repaid, the family contribution, and any work-study earnings. Whatever remains is the unmet need you have to fund another way. Multiplying by the years shows the true size of the commitment, which is often larger than families expect. Because costs usually rise about three to five percent a year, the real total is often a little higher, so treat the result as a floor and recheck the numbers each year as awards change.',
    formula: 'Annual gap = max(0, annual cost minus scholarships minus family contribution minus work-study). Total need = annual gap x years.',
    example: 'An annual cost of 50,000 with 20,000 in scholarships, a 15,000 family contribution and 3,000 from work-study leaves a gap of 12,000 a year, or 48,000 over four years.',
    mistakes: ['Counting a scholarship that is renewable but may not be renewed if grades slip.', 'Forgetting that work-study earnings are limited and may not repeat every year.', 'Ignoring annual fee increases, which widen the gap across a multi-year course.'],
    assumptions: 'Costs, awards and contributions are assumed steady across the years, and no fee inflation or change in family circumstances is modelled. Loans and their interest are excluded.',
    disclaimer: 'This is an educational estimate, not financial aid advice. Award terms and costs vary by institution and year, so confirm figures with the financial aid office and recheck each year.',
    related: [
      { href: '/education/study-abroad-cost', text: 'Study Abroad Cost Calculator' },
      { href: '/finance/career-break-runway', text: 'Career Break Runway Calculator' },
      { href: '/career/salary-negotiation-range', text: 'Salary Negotiation Range Calculator' }
    ],
    howAnswer: 'Scholarships, family contribution and work-study are subtracted from the annual cost, and the remaining gap is multiplied by the years. The steps panel lists each subtraction.',
    needAnswer: 'The annual cost of study, scholarships and grants, family contribution, work-study earnings and the number of years.',
    resultAnswer: 'The annual funding gap and the total amount you need to fund over the course.',
    extraFaqs: [
      ['What is unmet need?', 'It is the part of the cost of attendance that grants, family contribution and work-study do not cover. It is usually filled with loans, extra work or savings.'],
      ['Should I take loans to cover the gap?', 'Only after comparing them with cheaper options such as more scholarships, a part-time job or a lower-cost institution. Borrow the minimum and understand the repayment terms.']
    ],
    contractInputs: 'Annual cost of study (number); Scholarships and grants per year (number); Family contribution per year (number); Work-study per year (number); Years (number)',
    contractFormula: 'gap = max(0, annualCost - scholarshipPerYear - familyContributionPerYear - workStudyPerYear); total = gap * years'
  },
  'ats-resume-score': {
    title: 'ATS Resume Score Checker',
    metaDesc: 'Score a resume out of 100 for applicant tracking system friendliness, from keywords, quantified bullets, structure and file format.',
    lsi: ['ats resume score', 'ats checker', 'resume score calculator', 'will my resume pass ats'],
    what: 'It scores a resume out of 100 for how well applicant tracking systems can read and rank it, using keywords, structure and format.',
    inputsText: 'keyword match, the share of quantified bullets, contact details, a skills section, word count, layout and file format.',
    outputText: 'a score out of 100 with a gauge and the biggest scoring factors.',
    methodText: 'weighted points for keywords, quantified results, structure, length and machine-readable format.',
    quick: 'A resume matching seventy percent of keywords with sixty percent quantified bullets, clear contact details, a skills section and a 600-word text PDF scores about 86 out of 100. Aim for 80 or more.',
    body: 'Most large employers screen resumes with an applicant tracking system before a human ever reads them. Those systems parse text, look for keyword matches against the job, and rank candidates, so a beautifully designed resume can score badly if the layout hides the content. This tool estimates a score from the factors that matter most. Keywords carry the largest weight because matching the job description is how systems find you. Quantified bullets carry the next most, because numbers signal real results and read well to both machines and humans. Clear contact details, a dedicated skills section, a sensible length and a text-readable file each add points, while tables, columns and graphics subtract, because many parsers cannot read them. Scanned PDFs are a common hidden failure.',
    formula: 'Score = min(40, keyword match percent x 0.4) + min(30, quantified bullet percent x 0.3) + 10 if contact + 10 if skills + 10 if 400 to 800 words + 10 if text PDF or DOCX, minus 10 if tables or graphics, clamped to 0 to 100.',
    example: 'With seventy percent keyword match, sixty percent quantified bullets, contact details, a skills section, 600 words, no tables and a text PDF, the score is 28 plus 18 plus 10 plus 10 plus 10 plus 10, which is 86 out of 100.',
    mistakes: ['Submitting a scanned or image-heavy PDF that the parser cannot read at all.', 'Stuffing keywords unnaturally, which hurts the human read even if the machine accepts it.', 'Hiding the skills in graphics or columns, so the system sees nothing to match.'],
    assumptions: 'This is a heuristic model of how systems score resumes, not a proprietary algorithm. The weights reflect common practice and should be used as guidance rather than a pass or fail threshold.',
    disclaimer: 'This is an educational scoring tool, not a guarantee of any employer outcome. Applicant tracking systems and recruiter preferences vary, so always tailor the resume to the specific role.',
    related: [
      { href: '/career/salary-negotiation-range', text: 'Salary Negotiation Range Calculator' },
      { href: '/career/career-break-runway', text: 'Career Break Runway Calculator' },
      { href: '/career/canada-crs', text: 'Canada CRS Score Estimator' }
    ],
    howAnswer: 'Weighted points are awarded for keyword match, quantified bullets, structure, length and file format, then clamped to a score out of 100. The steps panel lists each factor.',
    needAnswer: 'Your keyword match, the share of quantified bullets, contact details, a skills section, word count, layout and file format.',
    resultAnswer: 'A score out of 100 with a gauge and the biggest scoring factors, so you can see where to improve.',
    extraFaqs: [
      ['What ATS score should I aim for?', 'Aim for 80 or more in this model, which usually means strong keyword match, quantified bullets and a clean, machine-readable layout.'],
      ['Is a PDF or Word file better for ATS?', 'Both work if the text is selectable. A text-based PDF is usually safe, DOCX is often safest, and a scanned PDF is the worst choice because the text is an image.']
    ],
    contractInputs: 'Job keyword match percent (number); Quantified bullets percent (number); Clear contact details (checkbox); Dedicated skills section (checkbox); Resume word count (number); Uses tables or graphics (checkbox); File format (select)',
    contractFormula: 'score = min(40, keyword*0.4) + min(30, quantified*0.3) + (contact?10:0) + (skills?10:0) + (400<=words<=800?10:0) + (format!=scanned?10:0) - (tables?10:0), clamped 0-100'
  },
  'salary-negotiation-range': {
    title: 'Salary Negotiation Range Calculator',
    metaDesc: 'Build an opening, target and walk-away salary range from market data, your experience and how strong your position is.',
    lsi: ['salary negotiation calculator', 'salary range calculator', 'how much to ask for salary', 'negotiation target salary'],
    what: 'It builds an opening, target and walk-away salary range from market data, your experience and your leverage.',
    inputsText: 'current salary, market low, median and high, years of experience and how strong your position is.',
    outputText: 'three figures: the opening ask, the target and the walk-away floor.',
    methodText: 'market median adjusted for experience for the target, with the opening above it and the market low as the floor.',
    quick: 'On a market median of 75,000 with five years of relevant experience and strong leverage, the target is about 82,500 and a sensible opening is about 89,100, with a walk-away around 65,000.',
    body: 'A good negotiation starts before the conversation, with a range you have decided in advance. This tool builds that range from market data, then adjusts for your experience and how strong your position is. The target sits above the market median, rising with relevant experience up to the market high, because experience is the clearest justification a manager can defend to their own finance team. The opening ask sits above the target, with the gap set by your leverage: a strong position, such as a competing offer or a scarce skill, supports a higher opening, while a weak position warrants a more modest one. The walk-away is the market low, below which you would rather decline. Anchor at the opening, justify each figure with results, and negotiate the whole package, not just base salary.',
    formula: 'Target = min(market high, market median x (1 + 0.02 x years)). Opening = target x (1 + 0.08 x leverage factor), where the leverage factor is 1 for strong, 0.5 for moderate and 0 for weak. Walk-away = market low.',
    example: 'A market median of 75,000 with five years of experience gives a target of about 82,500, just under the 85,000 market high. With strong leverage the opening is about 89,100, and the walk-away is the market low of 65,000.',
    mistakes: ['Naming a number first without a range prepared, which can anchor you low.', 'Negotiating only base salary and ignoring bonus, equity, leave, flexibility and development budget.', 'Making a threat you will not carry out, which damages trust and your position.'],
    assumptions: 'Market figures are inputs you provide and are assumed accurate for the role and location. The model ignores equity, bonus and benefits, so use it for base salary guidance only.',
    disclaimer: 'This is an educational planning tool, not financial or career advice. Salary outcomes depend on the role, the market and the employer, so use it to prepare rather than as a prediction.',
    related: [
      { href: '/career/ats-resume-score', text: 'ATS Resume Score Checker' },
      { href: '/career/canada-crs', text: 'Canada CRS Score Estimator' },
      { href: '/career/australia-pr-points', text: 'Australia PR Points Calculator' }
    ],
    howAnswer: 'The market median is adjusted upward for years of experience, capped at the market high, to give the target. The opening adds a leverage-based margin, and the walk-away is the market low. The steps panel shows each figure.',
    needAnswer: 'Your current salary, the market low, median and high, your years of relevant experience and how strong your position is.',
    resultAnswer: 'Three figures: the opening ask, the target and the walk-away, plus the market median for reference.',
    extraFaqs: [
      ['Should I give a number first or ask for their range?', 'Where possible, ask for their range first so you are not anchored low. If pressed, give a researched range rather than a single figure.'],
      ['What if they say the budget is fixed?', 'Ask about the whole package, a review in six months, a signing bonus or a title change. Base salary is often more rigid than the other levers.']
    ],
    contractInputs: 'Current salary (number); Market low (number); Market median (number); Market high (number); Years relevant experience (number); Leverage (select)',
    contractFormula: 'target = min(marketHigh, round(marketMedian * (1 + 0.02*years))); opening = round(target * (1 + 0.08*sf)); sf: strong 1, moderate 0.5, weak 0; walkAway = marketLow'
  }
};

const EXPECTED = [
  ['divorce-cost', { route: 'Lawyer negotiated', hourlyRate: 300, totalHours: 20, children: 0 }, 'Estimated divorce cost: 6000'],
  ['moving-abroad-cost', { destination: 'USA', cubicMeters: 10, adults: 1, children: 0, deposit: true }, 'Estimated one-time moving cost: 4700'],
  ['career-break-runway', { monthlyExpenses: 2000, currentSavings: 10000, monthlyIncome: 0, plannedMonths: 12 }, 'Runway 5.0 months | Shortfall at 12 months: 14000'],
  ['cosigning-loan-risk', { loanAmount: 20000, defaultProbabilityPct: 10, loanTermYears: 5 }, 'Estimated exposure: 2000'],
  ['solar-payback', { systemCost: 15000, annualProductionKwh: 9000, annualUsageKwh: 10000, electricityRate: 0.2, incentivePct: 30 }, 'Payback: 5.8 years'],
  ['ev-charger-roi', { chargerCost: 1200, installCost: 800, annualMiles: 12000, gasPrice: 3.5, gasMpg: 28, evMilesPerKwh: 3.5, electricityRate: 0.15 }, 'Charger payback: 2.0 years'],
  ['carbon-offset', { flights: 4, hoursPerFlight: 6, carMiles: 12000, homeKwh: 8000, offsetPricePerTonne: 15 }, 'Annual footprint: 10.16 tonnes CO2e'],
  ['homeowner-first-year-budget', { homePrice: 300000, closingCosts: 6000, movingCost: 1500, furnishing: 4000, emergencyRepairs: 2000, monthlyMortgage: 1600, propertyTaxAnnual: 3600, insuranceAnnual: 1200, maintenancePct: 1 }, 'First-year cash need: 40500'],
  ['study-abroad-cost', { country: 'USA', years: 4, livingCostPerYear: 12000, tuitionPerYearOverride: 0 }, 'Estimated total cost: 188000'],
  ['scholarship-gap', { annualCost: 50000, scholarshipPerYear: 20000, familyContributionPerYear: 15000, workStudyPerYear: 3000, years: 4 }, 'Annual gap: 12000 | Total need: 48000'],
  ['ats-resume-score', { keywordMatchPct: 70, quantifiedBulletsPct: 60, hasContactInfo: true, hasSkillsSection: true, wordCount: 600, usesTablesGraphics: false, fileFormat: 'PDF (text-based)' }, 'ATS score: 86 out of 100'],
  ['salary-negotiation-range', { currentSalary: 60000, marketLow: 65000, marketMedian: 75000, marketHigh: 85000, yearsExperience: 5, offerStrength: 'Strong' }, 'Target: 82500 | Open at: 89100']
];

// ---- run ----
const inserted = insertTools(T);
console.log('inserted tools:', inserted);

const toolBad = selfCheck(T, EXPECTED);
if (toolBad.length) { console.error('TOOL SELF-CHECK FAILED:\n' + toolBad.join('\n')); process.exit(1); }
console.log('tool self-check: all ' + EXPECTED.length + ' PASS');

const entries = T.map(function (t) { return buildSeo(Object.assign({ id: t.id, cat: t.cat }, S[t.id])); });
const seoInserted = insertSeo(entries);
console.log('seo entries inserted:', seoInserted);

const seoBad = selfCheckSeo(entries);
if (seoBad.length) { console.error('SEO SELF-CHECK FAILED:\n' + seoBad.join('\n')); process.exit(1); }
console.log('seo self-check: all ' + entries.length + ' PASS');

const contractItems = T.map(function (t) {
  const s = S[t.id];
  return { id: t.id, name: t.name, cat: t.cat, contractInputs: s.contractInputs, contractFormula: s.contractFormula };
});
const res = addContracts(contractItems, 'market-gap batch 4 — life events, home, education, career');
console.log('qa contracts added:', res.added, 'total:', res.total);
