#!/usr/bin/env node
// Market-gap batch 5 — completes the remaining Part 2 opportunity list:
// #4 bereavement checklist, #6 inheritance tax (UK/India), #11 journeyman
// wage progression, #12 tool depreciation, #15 US priority date, #16 city
// cost of living, #33 interview-to-offer tracker, #35 business EV charger
// ROI, #40 student loan vs scholarship, plus the #2 multi-property
// rental portfolio tracker (save and revisit data model).
// Deterministic models, worked examples, disclaimers. Idempotent.
// ESCAPING: prose avoids apostrophes and the dollar-digit sequence.
'use strict';
const LIB = require('./lib/market-gap-lib.cjs');
const { insertTools, selfCheck, buildSeo, insertSeo, selfCheckSeo, addContracts } = LIB;

const T = [
  {
    id: 'bereavement-checklist', cat: 'family',
    name: 'Bereavement Financial Runway Calculator',
    desc: 'Estimate the financial runway after losing a partner and the key items that must be reviewed and recalculated.',
    kw: 'bereavement financial checklist, widowhood finance calculator, what to do financially after a death, survivor benefit runway',
    inputs: [
      { id: 'hasWill', label: 'A valid will exists', type: 'checkbox', def: true },
      { id: 'lifeInsurance', label: 'Life insurance payout', type: 'number', def: 100000 },
      { id: 'existingSavings', label: 'Existing savings', type: 'number', def: 20000 },
      { id: 'monthlyExpenses', label: 'Monthly expenses', type: 'number', def: 3000 },
      { id: 'receivesBenefit', label: 'Survivor benefit expected', type: 'checkbox', def: true },
      { id: 'monthlyBenefit', label: 'Monthly survivor benefit', type: 'number', def: 1500 }
    ],
    calc: function (v) {
      var net = v.monthlyExpenses - (v.receivesBenefit ? v.monthlyBenefit : 0);
      var months = net <= 0 ? 999 : (v.lifeInsurance + v.existingSavings) / net;
      var items = 8 + (v.hasWill ? 0 : 1);
      return {
        result: 'Financial runway: ' + (months >= 999 ? 'more than 80' : months.toFixed(1)) + ' months | Checklist: ' + items + ' steps',
        chart: Charts.gauge(months >= 999 ? 120 : Math.min(months, 120), 120),
        extra: 'Insurance and savings ' + (v.lifeInsurance + v.existingSavings).toFixed(0) + ' | Net monthly need ' + Math.max(0, net).toFixed(0) + ' | Review insurance, benefits, accounts, title, tax filing and pensions. Not financial advice.'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Add the life insurance payout to existing savings to get the total available cash.',
        'Step 2: Work out the net monthly need: expenses minus any survivor benefit.',
        'Step 3: Divide the available cash by the net monthly need for the runway in months.',
        'Step 4: List the items to review: insurance, survivor benefits, bank accounts, property title, tax filing status, subscriptions and pensions.',
        'Step 5: A professional adviser and a bereavement support service can help; this is a planning estimate only.'
      ];
    }
  },
  {
    id: 'inheritance-tax-uk-india', cat: 'finance',
    name: 'Inheritance Tax Calculator (UK and India)',
    desc: 'Estimate inheritance tax on an estate under UK rules, or note the position for India where most inheritances are untaxed.',
    kw: 'inheritance tax calculator uk, india inheritance tax, estate tax calculator, iht calculator',
    inputs: [
      { id: 'country', label: 'Country', type: 'select', options: ['UK', 'India'], def: 'UK' },
      { id: 'estateValue', label: 'Estate value', type: 'number', def: 500000 },
      { id: 'spouseExempt', label: 'Left to a spouse (exempt)', type: 'checkbox', def: false },
      { id: 'charityPercent', label: 'Percent to charity', type: 'number', def: 0 }
    ],
    calc: function (v) {
      if (v.spouseExempt) {
        return { result: 'Estimated inheritance tax: 0', chart: Charts.gauge(0, 100), extra: v.country + ' | Transfers to a spouse are exempt, so no tax is due on this estate' };
      }
      if (v.country === 'India') {
        return { result: 'Estimated inheritance tax: 0', chart: Charts.gauge(0, 100), extra: 'India | There is no inheritance tax on inherited assets. Capital gains may apply when you later sell, so keep the cost records.' };
      }
      var relief = v.estateValue * (v.charityPercent / 100);
      var taxable = Math.max(0, v.estateValue - relief - 325000);
      var tax = taxable * 0.4;
      return {
        result: 'Estimated inheritance tax: ' + tax.toFixed(0),
        chart: Charts.donut([tax, Math.max(0, v.estateValue - tax)], ['Tax', 'To heirs']),
        extra: 'UK | Nil rate band 325000 | Taxable ' + taxable.toFixed(0) + ' at 40 percent | The residence nil rate band can add up to 175000 more when a home passes to direct descendants'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Confirm the country. The UK charges inheritance tax; India has no inheritance tax on inherited assets.',
        'Step 2: Check the spouse exemption. Anything passing to a spouse is exempt and resets the tax position.',
        'Step 3: For the UK, subtract any charitable gift and the 325000 nil rate band from the estate.',
        'Step 4: Tax the remainder at 40 percent. A reduced rate of 36 percent can apply when at least ten percent goes to charity.',
        'Step 5: The residence nil rate band can shelter a further amount when a home passes to direct descendants. Take professional advice for a real estate.'
      ];
    }
  },
  {
    id: 'journeyman-wage-progression', cat: 'construction',
    name: 'Journeyman Wage Progression Calculator',
    desc: 'Project trade career earnings from apprentice pay through journeyman wages with annual raises.',
    kw: 'journeyman wage calculator, apprentice to journeyman earnings, trade career earnings, electrician wage progression',
    inputs: [
      { id: 'apprenticeStartWage', label: 'Apprentice start wage per hour', type: 'number', def: 16 },
      { id: 'journeyWage', label: 'Journeyman wage per hour', type: 'number', def: 32 },
      { id: 'apprenticeYears', label: 'Apprentice years', type: 'number', def: 4 },
      { id: 'journeyYears', label: 'Journeyman years', type: 'number', def: 10 },
      { id: 'hoursPerYear', label: 'Paid hours per year', type: 'number', def: 2000 },
      { id: 'annualRaisePct', label: 'Annual raise (percent)', type: 'number', def: 3 }
    ],
    calc: function (v) {
      var avgApp = (v.apprenticeStartWage + v.journeyWage) / 2;
      var appEarn = Math.round(avgApp * v.hoursPerYear * v.apprenticeYears);
      var r = v.annualRaisePct / 100;
      var grow = r === 0 ? v.journeyYears : (Math.pow(1 + r, v.journeyYears) - 1) / r;
      var jourEarn = Math.round(v.journeyWage * v.hoursPerYear * grow);
      return {
        result: 'Career earnings: ' + (appEarn + jourEarn),
        chart: Charts.bar([appEarn, jourEarn], ['Apprentice', 'Journeyman']),
        extra: 'Apprentice ' + appEarn + ' | Journeyman ' + jourEarn + ' over ' + v.journeyYears + ' years at ' + v.annualRaisePct + ' percent raises | Pre-tax, before overtime'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Apprentice pay is modelled as rising evenly from the start wage to the journeyman wage, so its average is the midpoint.',
        'Step 2: Multiply that average by paid hours and apprentice years for apprentice earnings.',
        'Step 3: Journeyman pay starts at the full rate and grows by the annual raise, compounded over the journeyman years.',
        'Step 4: Sum the geometric growth for the journeyman total, then add the apprentice total.',
        'Step 5: These are pre-tax figures and exclude overtime, which is common in the trades and can lift real earnings well above this.'
      ];
    }
  },
  {
    id: 'tool-depreciation', cat: 'business',
    name: 'Tool and Equipment Depreciation Calculator',
    desc: 'Work out annual tool depreciation for taxes using straight line or declining balance methods.',
    kw: 'tool depreciation calculator, equipment depreciation, small business tool tax deduction, straight line depreciation',
    inputs: [
      { id: 'toolCost', label: 'Tool cost', type: 'number', def: 2000 },
      { id: 'salvageValue', label: 'Salvage value', type: 'number', def: 200 },
      { id: 'usefulLifeYears', label: 'Useful life (years)', type: 'number', def: 5 },
      { id: 'method', label: 'Method', type: 'select', options: ['Straight line', 'Declining balance'], def: 'Straight line' }
    ],
    calc: function (v) {
      var annual = v.method === 'Declining balance'
        ? v.toolCost * 2 / v.usefulLifeYears
        : (v.toolCost - v.salvageValue) / v.usefulLifeYears;
      return {
        result: 'Annual depreciation: ' + annual.toFixed(0),
        chart: Charts.bar([annual, annual * v.usefulLifeYears], ['Per year', 'Over life']),
        extra: v.method + ' over ' + v.usefulLifeYears + ' years | Depreciable base ' + (v.toolCost - v.salvageValue).toFixed(0) + ' | Confirm the correct method and life with your tax adviser'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Separate the cost from the salvage value, the amount the tool is still worth at the end.',
        'Step 2: For straight line, divide the cost minus salvage by the useful life for an even annual deduction.',
        'Step 3: For declining balance, apply twice the straight-line rate to the remaining book value, so the deduction is larger early.',
        'Step 4: Tools above a set threshold can sometimes be expensed in full in the first year instead of depreciated.',
        'Step 5: Tax rules differ by country, so confirm the allowable method, life and threshold with a qualified accountant.'
      ];
    }
  },
  {
    id: 'us-priority-date', cat: 'career',
    name: 'US Visa Priority Date Wait Estimator',
    desc: 'Estimate the remaining wait for a US immigrant visa from your priority date and the current published cutoff.',
    kw: 'us visa priority date calculator, green card wait time estimator, visa bulletin priority date, immigrant visa backlog',
    inputs: [
      { id: 'category', label: 'Preference category', type: 'select', options: ['Family F1', 'Family F2A', 'Family F2B', 'Family F3', 'Family F4', 'Employment EB-2', 'Employment EB-3'], def: 'Family F4' },
      { id: 'priorityYear', label: 'Your priority date year', type: 'number', def: 2025 },
      { id: 'currentCutoffYear', label: 'Current cutoff year (visa bulletin)', type: 'number', def: 2018 }
    ],
    calc: function (v) {
      var behind = Math.max(0, v.priorityYear - v.currentCutoffYear);
      if (behind === 0) {
        return { result: 'Priority date is current', chart: Charts.gauge(0, 20), extra: v.category + ' | Your priority date is at or before the published cutoff, so you may be able to progress' };
      }
      return {
        result: 'Estimated remaining wait: approximately ' + behind + ' years',
        chart: Charts.gauge(behind, 20),
        extra: v.category + ' | Your priority date is ' + behind + ' years behind the published cutoff | Cutoffs move forward unevenly and can retrogression, so treat this as a rough estimate'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Find the cutoff priority date for your category and country in the current visa bulletin.',
        'Step 2: Compare your priority date with that cutoff year.',
        'Step 3: If your priority date is earlier than the cutoff, you are current; otherwise the gap estimates the remaining wait.',
        'Step 4: Watch the final action date and the filing date, which can differ, and note that some countries have separate, longer queues.',
        'Step 5: Cutoffs move unevenly and can go backwards. This is an educational estimate, not legal or official guidance. Confirm with the visa bulletin.'
      ];
    }
  },
  {
    id: 'cost-of-living-compare', cat: 'everyday',
    name: 'City Cost of Living Comparison Calculator',
    desc: 'Compare the salary you need to keep the same standard of living between two cities using cost indices.',
    kw: 'cost of living calculator, compare cities cost of living, equivalent salary calculator, relocation salary comparison',
    inputs: [
      { id: 'cityA', label: 'Current city', type: 'select', options: ['Karachi', 'Lahore', 'Delhi', 'Mumbai', 'Dubai', 'London', 'Manchester', 'New York', 'Toronto', 'Sydney', 'Berlin', 'Houston'], def: 'Karachi' },
      { id: 'cityB', label: 'New city', type: 'select', options: ['Karachi', 'Lahore', 'Delhi', 'Mumbai', 'Dubai', 'London', 'Manchester', 'New York', 'Toronto', 'Sydney', 'Berlin', 'Houston'], def: 'London' },
      { id: 'currentSalary', label: 'Current salary', type: 'number', def: 60000 },
      { id: 'housingSharePct', label: 'Housing share of budget (percent)', type: 'number', def: 30 }
    ],
    calc: function (v) {
      var idx = { 'Karachi': 35, 'Lahore': 34, 'Delhi': 38, 'Mumbai': 42, 'Dubai': 65, 'London': 100, 'Manchester': 78, 'New York': 130, 'Toronto': 95, 'Sydney': 105, 'Berlin': 85, 'Houston': 92 };
      var a = idx[v.cityA] || 100, b = idx[v.cityB] || 100;
      var equiv = v.currentSalary * b / a;
      return {
        result: 'Equivalent salary in ' + v.cityB + ': ' + equiv.toFixed(0),
        chart: Charts.bar([v.currentSalary, equiv], [v.cityA, v.cityB]),
        extra: v.cityA + ' index ' + a + ' | ' + v.cityB + ' index ' + b + ' | Difference ' + (equiv - v.currentSalary).toFixed(0) + ' | Indices are indicative averages, not a rent quote'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Assign each city a cost index, where 100 is the reference level.',
        'Step 2: The equivalent salary equals your current salary times the new city index divided by the current city index.',
        'Step 3: The difference shows how much more or less you would need for the same basket of goods and services.',
        'Step 4: Housing is the biggest swing, so weigh it carefully if you plan to buy or rent in a central area.',
        'Step 5: Indices are averages and ignore exchange-rate timing, taxes and lifestyle, so use them as a starting point only.'
      ];
    }
  },
  {
    id: 'interview-to-offer-tracker', cat: 'career',
    name: 'Interview to Offer Conversion Tracker',
    desc: 'Track job search conversion rates from applications to interviews to offers.',
    kw: 'interview to offer calculator, job search conversion rate, application success rate, job hunt tracker',
    inputs: [
      { id: 'applications', label: 'Applications sent', type: 'number', def: 50 },
      { id: 'interviews', label: 'Interviews', type: 'number', def: 10 },
      { id: 'offers', label: 'Offers', type: 'number', def: 1 }
    ],
    calc: function (v) {
      var apps = Math.max(1, v.applications);
      var interviewRate = v.interviews / apps * 100;
      var offerRate = v.offers / apps * 100;
      var perInterview = v.interviews > 0 ? v.offers / v.interviews * 100 : 0;
      return {
        result: 'Offer rate: ' + offerRate.toFixed(1) + ' percent (' + v.offers + ' of ' + v.applications + ' applications)',
        chart: Charts.bar([v.applications, v.interviews, v.offers], ['Applications', 'Interviews', 'Offers']),
        extra: 'Interview rate ' + interviewRate.toFixed(1) + ' percent | Offer per interview ' + perInterview.toFixed(1) + ' percent | A healthy funnel usually narrows at each stage'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Count applications, interviews and offers over a fixed period.',
        'Step 2: Interview rate equals interviews divided by applications.',
        'Step 3: Offer rate equals offers divided by applications.',
        'Step 4: Offer per interview shows how well you convert once you are in the room.',
        'Step 5: A low interview rate points at the resume and targeting; a low offer per interview points at the interview itself.'
      ];
    }
  },
  {
    id: 'ev-charger-business-roi', cat: 'business',
    name: 'Business EV Charger ROI Calculator',
    desc: 'Estimate payback on installing public EV chargers for a business from capital cost, sessions and pricing.',
    kw: 'ev charger business roi, commercial ev charger payback, public charging station profit, ev charging business case',
    inputs: [
      { id: 'chargers', label: 'Number of chargers', type: 'number', def: 4 },
      { id: 'costPerCharger', label: 'Cost per charger', type: 'number', def: 5000 },
      { id: 'installTotal', label: 'Installation and setup total', type: 'number', def: 20000 },
      { id: 'sessionsPerDay', label: 'Sessions per charger per day', type: 'number', def: 6 },
      { id: 'kwhPerSession', label: 'kWh per session', type: 'number', def: 30 },
      { id: 'pricePerKwh', label: 'Price charged per kWh', type: 'number', def: 0.5 },
      { id: 'costPerKwh', label: 'Energy cost per kWh', type: 'number', def: 0.2 },
      { id: 'daysPerYear', label: 'Operating days per year', type: 'number', def: 350 }
    ],
    calc: function (v) {
      var sessions = v.chargers * v.sessionsPerDay * v.daysPerYear;
      var kwh = sessions * v.kwhPerSession;
      var revenue = kwh * v.pricePerKwh;
      var energy = kwh * v.costPerKwh;
      var gross = revenue - energy;
      var capex = v.chargers * v.costPerCharger + v.installTotal;
      var payback = gross > 0 ? capex / gross : 0;
      return {
        result: 'Payback: ' + payback.toFixed(1) + ' years',
        chart: Charts.bar([revenue, energy, gross], ['Revenue', 'Energy cost', 'Gross profit']),
        extra: 'Annual gross profit ' + gross.toFixed(0) + ' | Capital ' + capex.toFixed(0) + ' | Sessions a year ' + (sessions * 1).toFixed(0) + ' | Excludes maintenance and demand charges'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Annual sessions equals chargers times sessions per day times operating days.',
        'Step 2: Multiply sessions by kWh per session for annual energy delivered.',
        'Step 3: Revenue is energy delivered times the price per kWh; energy cost is the same times your cost per kWh.',
        'Step 4: Gross profit is revenue minus energy cost, before maintenance, network fees and demand charges.',
        'Step 5: Payback equals total capital divided by annual gross profit. Utilization is the key risk: quiet sites never pay back.'
      ];
    }
  },
  {
    id: 'student-loan-vs-scholarship', cat: 'education',
    name: 'Student Loan vs Scholarship Calculator',
    desc: 'Compare borrowing against winning a scholarship by showing the loan needed and the total interest repaid.',
    kw: 'student loan vs scholarship, how much student loan do i need, student loan interest calculator, scholarship savings',
    inputs: [
      { id: 'tuitionPerYear', label: 'Tuition per year', type: 'number', def: 20000 },
      { id: 'years', label: 'Years', type: 'number', def: 4 },
      { id: 'scholarshipPerYear', label: 'Scholarship per year', type: 'number', def: 5000 },
      { id: 'loanRatePct', label: 'Loan interest rate (percent)', type: 'number', def: 6 },
      { id: 'loanTermYears', label: 'Repayment term (years)', type: 'number', def: 10 }
    ],
    calc: function (v) {
      var uncovered = Math.max(0, v.tuitionPerYear - v.scholarshipPerYear);
      var loan = uncovered * v.years;
      var r = v.loanRatePct / 100 / 12;
      var n = v.loanTermYears * 12;
      var payment = loan === 0 ? 0 : (r === 0 ? loan / n : loan * r / (1 - Math.pow(1 + r, -n)));
      var totalInterest = loan === 0 ? 0 : payment * n - loan;
      return {
        result: 'Loan needed: ' + loan.toFixed(0),
        chart: Charts.bar([v.scholarshipPerYear * v.years, loan, Math.round(totalInterest)], ['Scholarship', 'Loan', 'Interest']),
        extra: 'Scholarship saves ' + (v.scholarshipPerYear * v.years).toFixed(0) + ' | Monthly payment ' + Math.round(payment) + ' | Total interest ' + Math.round(totalInterest) + ' over ' + v.loanTermYears + ' years'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Find the uncovered cost per year: tuition minus scholarship.',
        'Step 2: Multiply by the years to get the loan principal needed.',
        'Step 3: Convert the annual rate to a monthly rate and the term to months.',
        'Step 4: Use the standard amortising payment formula, then multiply by the months to find total interest.',
        'Step 5: Every year of scholarship reduces both the principal and the interest, so a scholarship is worth more than its face value.'
      ];
    }
  },
  {
    id: 'rental-portfolio-tracker', cat: 'finance',
    name: 'Rental Portfolio Cash Flow Tracker',
    desc: 'Aggregate monthly cash flow, annual net and gross yield across a small rental portfolio you can save and revisit.',
    kw: 'rental property portfolio calculator, rental cash flow tracker, multiple rental properties, gross yield calculator',
    inputs: [
      { id: 'properties', label: 'Number of properties', type: 'number', def: 3 },
      { id: 'avgValue', label: 'Average property value', type: 'number', def: 200000 },
      { id: 'avgMonthlyRent', label: 'Average monthly rent each', type: 'number', def: 1500 },
      { id: 'avgMonthlyCosts', label: 'Average monthly costs each', type: 'number', def: 400 },
      { id: 'mortgagePerProperty', label: 'Monthly mortgage each', type: 'number', def: 800 }
    ],
    calc: function (v) {
      var rent = v.properties * v.avgMonthlyRent;
      var costs = v.properties * v.avgMonthlyCosts;
      var mortgage = v.properties * v.mortgagePerProperty;
      var net = rent - costs - mortgage;
      var yieldPct = (rent * 12) / (v.properties * v.avgValue) * 100;
      return {
        result: 'Monthly net cash flow: ' + net.toFixed(0),
        chart: Charts.bar([rent, costs, mortgage, net], ['Rent', 'Costs', 'Mortgage', 'Net']),
        extra: 'Annual net ' + (net * 12).toFixed(0) + ' | Gross yield ' + yieldPct.toFixed(1) + ' percent | ' + v.properties + ' properties | Save each property with the portfolio store to revisit later'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Multiply the number of properties by the average rent for total monthly income.',
        'Step 2: Multiply by the average monthly costs for total operating expenses.',
        'Step 3: Add the mortgages across all properties.',
        'Step 4: Net cash flow is rent minus costs minus mortgages; annual net is twelve times that.',
        'Step 5: Gross yield is annual rent divided by total property value. Use the portfolio store to keep each property on file and revisit it.'
      ];
    }
  }
];

const EXPECTED = [
  ['bereavement-checklist', { hasWill: true, lifeInsurance: 100000, existingSavings: 20000, monthlyExpenses: 3000, receivesBenefit: true, monthlyBenefit: 1500 }, 'Financial runway: 80.0 months | Checklist: 8 steps'],
  ['inheritance-tax-uk-india', { country: 'UK', estateValue: 500000, spouseExempt: false, charityPercent: 0 }, 'Estimated inheritance tax: 70000'],
  ['journeyman-wage-progression', { apprenticeStartWage: 16, journeyWage: 32, apprenticeYears: 4, journeyYears: 10, hoursPerYear: 2000, annualRaisePct: 3 }, 'Career earnings: 925688'],
  ['tool-depreciation', { toolCost: 2000, salvageValue: 200, usefulLifeYears: 5, method: 'Straight line' }, 'Annual depreciation: 360'],
  ['us-priority-date', { category: 'Family F4', priorityYear: 2025, currentCutoffYear: 2018 }, 'Estimated remaining wait: approximately 7 years'],
  ['cost-of-living-compare', { cityA: 'Karachi', cityB: 'London', currentSalary: 60000, housingSharePct: 30 }, 'Equivalent salary in London: 171429'],
  ['interview-to-offer-tracker', { applications: 50, interviews: 10, offers: 1 }, 'Offer rate: 2.0 percent (1 of 50 applications)'],
  ['ev-charger-business-roi', { chargers: 4, costPerCharger: 5000, installTotal: 20000, sessionsPerDay: 6, kwhPerSession: 30, pricePerKwh: 0.5, costPerKwh: 0.2, daysPerYear: 350 }, 'Payback: 0.5 years'],
  ['student-loan-vs-scholarship', { tuitionPerYear: 20000, years: 4, scholarshipPerYear: 5000, loanRatePct: 6, loanTermYears: 10 }, 'Loan needed: 60000'],
  ['rental-portfolio-tracker', { properties: 3, avgValue: 200000, avgMonthlyRent: 1500, avgMonthlyCosts: 400, mortgagePerProperty: 800 }, 'Monthly net cash flow: 900']
];

const S = {
  'bereavement-checklist': {
    title: 'Bereavement Financial Runway Calculator',
    metaDesc: 'Estimate the financial runway after losing a partner and see the key items to review, from insurance and benefits to accounts and tax.',
    lsi: ['bereavement financial checklist', 'widowhood finance calculator', 'survivor benefit runway', 'what to do financially after a death'],
    what: 'It estimates how long the available money lasts after a bereavement and lists the financial items that must be reviewed and recalculated.',
    inputsText: 'whether a will exists, the life insurance payout, savings, monthly expenses and any survivor benefit.',
    outputText: 'the financial runway in months and the number of checklist steps to review.',
    methodText: 'insurance and savings divided by the net monthly need after any survivor benefit.',
    quick: 'A 100,000 payout plus 20,000 of savings, against a net monthly need of 1,500, gives a runway of about eighty months. The checklist covers eight items to review.',
    body: 'Losing a partner triggers a wave of financial admin at the worst possible time. Two things help most: knowing roughly how long the money lasts, and a clear list of what must be changed. This tool estimates the runway from the insurance payout and savings divided by the net monthly need after any survivor benefit, then counts the key items to review. Those items usually include notifying the life insurer, claiming any survivor benefit, moving or closing accounts, transferring the home title, changing the tax filing status, cancelling subscriptions, reviewing pensions and retirement accounts, and updating any will or beneficiary nominations. Where there is no valid will, intestacy rules add a further process. Use the runway as breathing space, and lean on a bereavement support service and a professional adviser for the legal and tax steps.',
    formula: 'Net monthly need = monthly expenses minus survivor benefit. Runway months = (life insurance plus savings) / net monthly need. Checklist count = 8, plus one if there is no valid will.',
    example: 'Insurance of 100,000 plus savings of 20,000 gives 120,000 available. Expenses of 3,000 minus a 1,500 survivor benefit give a net need of 1,500, so the runway is 120,000 divided by 1,500, which is eighty months.',
    mistakes: ['Assuming benefit payments start immediately, when claims often take weeks or months.', 'Overlooking that some accounts are frozen until probate or succession is complete.', 'Making large irreversible decisions, such as selling the home, before the finances settle.'],
    assumptions: 'Income, expenses and benefits are assumed to continue at the entered level. Tax changes, probate timing, funeral costs and one-off legal fees are not modelled, and the runway ignores interest on the cash.',
    disclaimer: 'This is an educational planning estimate, not legal, tax or financial advice. Estate, benefit and tax rules depend on your country and circumstances, so consult a qualified adviser and a bereavement service.',
    related: [
      { href: '/family/alimony-estimator', text: 'Alimony and Spousal Support Estimator' },
      { href: '/finance/inheritance-tax-uk-india', text: 'Inheritance Tax Calculator (UK and India)' },
      { href: '/finance/divorce-cost', text: 'Divorce Cost Estimator' }
    ],
    howAnswer: 'Insurance and savings are added, the survivor benefit is subtracted from expenses, and the cash is divided by the net monthly need for the runway. The steps panel lists the items to review.',
    needAnswer: 'Whether a will exists, the insurance payout, savings, monthly expenses and any survivor benefit you expect.',
    resultAnswer: 'The financial runway in months and the number of financial checklist steps to work through.',
    extraFaqs: [
      ['When do survivor benefits start?', 'Timing varies by scheme and country, and claims usually need a death certificate and application. Some benefits can be backdated, others cannot, so apply early.'],
      ['Do I need probate before I can use the money?', 'For jointly held or nominated assets often not, but assets held in the deceased name alone may be frozen until probate or a succession certificate is granted.']],
    contractInputs: 'A valid will exists (checkbox); Life insurance payout (number); Existing savings (number); Monthly expenses (number); Survivor benefit expected (checkbox); Monthly survivor benefit (number)',
    contractFormula: 'net = expenses - (benefit ? monthlyBenefit : 0); runway = (insurance + savings) / net; items = 8 + (will ? 0 : 1)'
  },
  'inheritance-tax-uk-india': {
    title: 'Inheritance Tax Calculator (UK and India)',
    metaDesc: 'Estimate UK inheritance tax after the nil rate band and spouse exemption, and see the position for India where inheritances are largely untaxed.',
    lsi: ['inheritance tax calculator uk', 'india inheritance tax', 'estate tax calculator', 'iht calculator'],
    what: 'It estimates inheritance tax on an estate, applying UK rules with the nil rate band and spouse exemption, and flags the different position in India.',
    inputsText: 'the country, the estate value, whether it passes to a spouse and any charitable gift.',
    outputText: 'the estimated inheritance tax and the share going to heirs.',
    methodText: 'the estate minus exempt transfers, charity and the nil rate band, then taxed at 40 percent for the UK.',
    quick: 'A UK estate of 500,000 with no spouse exemption leaves 175,000 above the 325,000 nil rate band, giving about 70,000 of inheritance tax. India charges no inheritance tax on inherited assets.',
    body: 'Inheritance tax is one of the most country-specific taxes there is. In the UK, an estate pays 40 percent above the 325,000 nil rate band, subject to a spouse exemption that can remove the charge entirely, a residence nil rate band of up to 175,000 when a home passes to direct descendants, and a reduced 36 percent rate when at least ten percent goes to charity. In India, by contrast, there is no inheritance tax on inherited assets, although capital gains can arise when the inherited asset is later sold, so cost records matter. This tool applies the headline UK rule and the India position so families can see the rough scale before taking advice. Real calculations involve lifetime gifts, trusts, business relief and the order of deaths, all of which can change the answer dramatically.',
    formula: 'UK: taxable = estate minus charitable gift minus 325,000, floored at zero; tax = taxable x 40 percent. Transfers to a spouse are exempt and give zero. India: inheritance tax is zero.',
    example: 'A UK estate of 500,000 with no spouse exemption and no charity has taxable value of 175,000 after the nil rate band, so tax is about 70,000. The same estate left entirely to a spouse gives zero.',
    mistakes: ['Forgetting the residence nil rate band, which can shelter a further amount when a home passes to direct descendants.', 'Assuming India taxes inheritance, when it does not, though capital gains can apply on later sale.', 'Ignoring lifetime gifts made in the seven years before death, which can be brought back into the calculation.'],
    assumptions: 'The UK nil rate band is set at 325,000 and the residence nil rate band, lifetime gifts, trusts, business relief and the reduced charity rate are not modelled. India is treated as having no inheritance tax.',
    disclaimer: 'This is an educational estimate, not tax or legal advice. Inheritance tax rules are complex and change, so take advice from a qualified tax professional before relying on any figure.',
    related: [
      { href: '/finance/power-of-attorney-cost', text: 'Power of Attorney and Will Cost Estimator' },
      { href: '/finance/power-of-attorney-cost', text: 'Will and Estate Document Cost Estimator' },
      { href: '/regional/mirath-calculator', text: 'Islamic Inheritance Calculator' }
    ],
    howAnswer: 'For the UK, charitable gifts and the nil rate band are subtracted from the estate and the remainder is taxed at 40 percent; transfers to a spouse are exempt. India returns zero inheritance tax. The steps panel shows the logic.',
    needAnswer: 'The country, the estate value, whether it passes to a spouse and any percentage left to charity.',
    resultAnswer: 'The estimated inheritance tax and a split showing how much reaches the heirs.',
    extraFaqs: [
      ['Does India have inheritance tax?', 'No. India abolished estate duty in 1985 and does not tax inherited assets as such, though capital gains tax can apply when you sell an inherited asset later.'],
      ['What is the UK nil rate band?', 'It is the amount an estate can pass on free of inheritance tax, currently 325,000. A residence nil rate band of up to 175,000 can apply when a home passes to direct descendants.']],
    contractInputs: 'Country (select); Estate value (number); Left to a spouse (checkbox); Percent to charity (number)',
    contractFormula: 'if spouseExempt: 0; if India: 0; else UK: taxable = max(0, estate - estate*charity/100 - 325000); tax = taxable * 0.4'
  },
  'journeyman-wage-progression': {
    title: 'Journeyman Wage Progression Calculator',
    metaDesc: 'Project trade career earnings from apprentice pay through journeyman wages with annual raises over a full career.',
    lsi: ['journeyman wage calculator', 'apprentice to journeyman earnings', 'trade career earnings', 'electrician wage progression'],
    what: 'It projects lifetime trade earnings from apprentice wages through journeyman pay with annual raises, so apprentices can see the payoff.',
    inputsText: 'apprentice start wage, journeyman wage, apprentice years, journeyman years, paid hours and an annual raise.',
    outputText: 'career earnings in total, split between apprentice and journeyman phases.',
    methodText: 'apprentice pay rises evenly to the journeyman rate; journeyman pay compounds by the annual raise.',
    quick: 'Starting at 16 and reaching 32 an hour, with four apprentice years and ten journeyman years at three percent raises, total career earnings are about 925,688 pre-tax.',
    body: 'The trades reward patience: apprentice pay is low, but the jump to journeyman rate is substantial and then compounds with each annual raise. This tool models that path so an apprentice can see the long-run earnings before committing years. Apprentice pay is treated as rising evenly from the start wage to the full journeyman rate, so its average is the midpoint. Journeyman pay starts at the full rate and grows by the annual raise, compounded over the years. The result is pre-tax and excludes overtime, which is common in the trades and can lift real earnings well above the base. Licensing, specialization and union scale all affect the rate, and moving between regions can change it further. Treat the total as a floor for someone who stays in the trade and works full time.',
    formula: 'Apprentice earnings = ((start + journey) / 2) x hours x apprentice years. Journeyman earnings = journey x hours x ((1 + r)^n - 1) / r, where r is the raise and n the journeyman years. Total = apprentice plus journeyman.',
    example: 'Starting at 16 and reaching 32 an hour, the apprentice average is 24, so four years at 2,000 hours give 192,000. Ten journeyman years at 32 with three percent raises compound to about 733,688, for a career total of about 925,688.',
    mistakes: ['Comparing only starting wages and missing the long journeyman tail.', 'Forgetting that overtime, shift premiums and specialization can add heavily.', 'Ignoring licensing exams, which gate the jump to the journeyman rate.'],
    assumptions: 'Full-time hours are assumed in every year, wages rise on schedule, and no gaps, layoffs, overtime or relocation are modelled. Figures are pre-tax and in nominal terms, ignoring inflation.',
    disclaimer: 'This is an educational projection, not career or financial advice. Actual wages depend on region, union agreements, licensing and demand, so verify local rates before relying on these figures.',
    related: [
      { href: '/construction/conduit-fill', text: 'Conduit Fill Calculator' },
      { href: '/construction/rolling-offset', text: 'Rolling Offset Calculator' },
      { href: '/business/tool-depreciation', text: 'Tool and Equipment Depreciation Calculator' }
    ],
    howAnswer: 'Apprentice pay is averaged between the start and journeyman rate, journeyman pay is compounded by the annual raise, and the two totals are added. The steps panel shows each phase.',
    needAnswer: 'The apprentice start wage, the journeyman wage, both phases in years, paid hours a year and the expected annual raise.',
    resultAnswer: 'Total career earnings split between the apprentice and journeyman phases, pre-tax.',
    extraFaqs: [
      ['How long does it take to become a journeyman?', 'Usually three to five years of apprenticeship plus licensing, depending on the trade and country. This tool lets you model any length.'],
      ['Is overtime worth including?', 'It can add a large share of earnings. This tool excludes it, so if you regularly work overtime, your real total will be higher.']],
    contractInputs: 'Apprentice start wage (number); Journeyman wage (number); Apprentice years (number); Journeyman years (number); Paid hours per year (number); Annual raise percent (number)',
    contractFormula: 'appEarn = round(((start+journey)/2) * hours * apprenticeYears); jourEarn = round(journey * hours * ((1+r)^n - 1)/r); total = appEarn + jourEarn'
  },
  'tool-depreciation': {
    title: 'Tool and Equipment Depreciation Calculator',
    metaDesc: 'Work out annual tool and equipment depreciation for tax using straight line or declining balance methods over the useful life.',
    lsi: ['tool depreciation calculator', 'equipment depreciation', 'small business tool tax deduction', 'straight line depreciation'],
    what: 'It calculates the annual depreciation of tools and equipment for tax purposes under straight line or declining balance methods.',
    inputsText: 'tool cost, salvage value, useful life and the depreciation method.',
    outputText: 'the annual depreciation charge and the total over the useful life.',
    methodText: 'straight line spreads the cost evenly; declining balance front-loads the deduction.',
    quick: 'A 2,000 tool with 200 salvage over five years depreciates 360 a year on the straight line method, or 800 in the first year on declining balance.',
    body: 'Tradespeople and small businesses can often deduct the cost of tools and equipment, but the timing of the deduction depends on the method. Straight line spreads the depreciable base, cost minus salvage, evenly across the useful life, giving a predictable annual figure. Declining balance applies a fixed rate to the remaining book value, so the biggest deduction comes early, which can suit cash-flow planning. This tool shows the annual charge under each method and the total over the life so you can compare. In many countries a separate rule lets you expense low-cost tools in full in the first year, which is often better than depreciating them at all, so the method choice matters less for cheap items. Confirm the correct method, useful life and first-year threshold with a qualified accountant, since getting them wrong invites an audit adjustment.',
    formula: 'Straight line = (tool cost minus salvage value) / useful life. Declining balance = tool cost x (2 / useful life) applied to the remaining book value each year.',
    example: 'A 2,000 tool with a 200 salvage value over five years depreciates at (2,000 minus 200) divided by five, which is 360 a year, on the straight line method, and at 800 in the first year on the declining balance method.',
    mistakes: ['Ignoring the salvage value, which overstates the depreciable base.', 'Depreciating an item that could be expensed in full in the first year.', 'Using a life that does not match the tax authority guidance for that asset class.'],
    assumptions: 'Straight line applies the rate to the original depreciable base; declining balance applies twice the straight-line rate to the book value, with the first year shown. No half-year convention or bonus depreciation is modelled.',
    disclaimer: 'This is an educational estimate, not tax advice. Deduction rules, thresholds and asset lives vary by country and change often, so confirm the treatment with a qualified accountant.',
    related: [
      { href: '/business/tool-depreciation', text: 'Tool and Equipment Depreciation Calculator' },
      { href: '/construction/journeyman-wage-progression', text: 'Journeyman Wage Progression Calculator' },
      { href: '/business/brand-deal-value', text: 'Brand Deal Value Calculator' }
    ],
    howAnswer: 'Straight line divides cost minus salvage by the life; declining balance applies twice the straight-line rate to the cost or book value. The steps panel lists the method logic.',
    needAnswer: 'The tool cost, salvage value, useful life in years and the depreciation method.',
    resultAnswer: 'The annual depreciation charge and the total deduction over the useful life.',
    extraFaqs: [
      ['Can I deduct a tool in full in one year?', 'Many tax systems allow low-cost tools to be expensed immediately rather than depreciated. The threshold varies, so check your local rule before choosing a method.'],
      ['Which method should I choose?', 'Declining balance gives a larger early deduction, straight line gives a steady one. If the item is cheap and can be expensed, the method may not matter at all.']],
    contractInputs: 'Tool cost (number); Salvage value (number); Useful life years (number); Method (select)',
    contractFormula: 'straight: (cost - salvage)/life; declining: cost * 2/life'
  },
  'us-priority-date': {
    title: 'US Visa Priority Date Wait Estimator',
    metaDesc: 'Estimate the remaining wait for a US immigrant visa by comparing your priority date with the current visa bulletin cutoff.',
    lsi: ['us visa priority date calculator', 'green card wait time estimator', 'visa bulletin priority date', 'immigrant visa backlog'],
    what: 'It estimates how far your US immigrant visa priority date is behind the current published cutoff, so you can gauge the remaining wait.',
    inputsText: 'the preference category, your priority date year and the current cutoff year from the visa bulletin.',
    outputText: 'the estimated remaining wait or a current status.',
    methodText: 'your priority date year minus the current cutoff year, floored at zero.',
    quick: 'A Family F4 case with a 2025 priority date against a 2018 cutoff is about seven years behind, so the estimate is roughly seven more years, though cutoffs move unevenly.',
    body: 'US immigrant visa waits come down to one comparison: your priority date against the cutoff published each month in the visa bulletin. If your priority date is earlier than the cutoff, your case is current and can progress. If it is later, the gap estimates how far behind the queue you are, and therefore roughly how long the wait may be. This tool does that subtraction so families can plan. It is deliberately simple because the real system is not: cutoffs move forward unevenly, sometimes stall and occasionally go backwards, and some countries face far longer queues than others. The final action date and the filing date can differ, and consular processing adds its own timeline. Priority dates can also be recaptured or lost through age-out rules for children. Treat the result as a rough planning figure, and check the current bulletin for the authoritative position.',
    formula: 'Remaining wait years = max(0, your priority date year minus the current cutoff year). If the result is zero, the case is current.',
    example: 'A Family F4 petition with a 2025 priority date against a 2018 cutoff is seven years behind, so the estimate is approximately seven more years. If the cutoff advances to 2025, the case becomes current.',
    mistakes: ['Treating the estimate as a guarantee, when cutoffs can stall or retrogress.', 'Using the overall cutoff and ignoring a separate, often longer queue for some countries.', 'Forgetting that the filing date and the final action date differ, so applying at the wrong date wastes time.'],
    assumptions: 'Cutoffs are assumed to hold steady, and the model ignores country-specific queues, the difference between filing and final action dates, consular backlogs and age-out rules.',
    disclaimer: 'This is an educational estimate, not legal or official guidance. Only the current visa bulletin and a qualified immigration lawyer can confirm your position, so verify before acting.',
    related: [
      { href: '/career/canada-crs', text: 'Canada CRS Score Estimator' },
      { href: '/career/australia-pr-points', text: 'Australia PR Points Calculator' },
      { href: '/career/ats-resume-score', text: 'ATS Resume Score Checker' }
    ],
    howAnswer: 'Your priority date year is compared with the current cutoff year; the gap, floored at zero, estimates the remaining wait. The steps panel explains the comparison.',
    needAnswer: 'Your preference category, your priority date year and the current cutoff year from the visa bulletin.',
    resultAnswer: 'The estimated remaining wait in years, or a note that your priority date is current.',
    extraFaqs: [
      ['What is a priority date?', 'It is the date your petition was properly filed, and it fixes your place in the queue for an immigrant visa. The visa bulletin compares it with the current cutoff.'],
      ['Can my priority date move backwards?', 'Yes. Cutoff dates can retrogress, meaning a date that was current becomes unavailable again. That is why the bulletin should be checked every month.']],
    contractInputs: 'Preference category (select); Your priority date year (number); Current cutoff year (number)',
    contractFormula: 'behind = max(0, priorityYear - currentCutoffYear); if 0 then current else estimated wait = behind years'
  },
  'cost-of-living-compare': {
    title: 'City Cost of Living Comparison Calculator',
    metaDesc: 'Compare the salary you need to keep the same standard of living between two cities using indicative cost-of-living indices.',
    lsi: ['cost of living calculator', 'compare cities cost of living', 'equivalent salary calculator', 'relocation salary comparison'],
    what: 'It estimates the salary you would need in a new city to match your current standard of living, using cost-of-living indices.',
    inputsText: 'the current city, the new city, your current salary and the share of your budget that goes on housing.',
    outputText: 'the equivalent salary in the new city and the difference in money.',
    methodText: 'the current salary scaled by the ratio of the two city cost indices.',
    quick: 'On a salary of 60,000 in Karachi, an equivalent salary in London is about 171,429 given the difference in cost indices. Housing is usually the biggest swing.',
    body: 'Moving city changes what your salary really buys. A cost-of-living comparison scales your current salary by the ratio of the two cities cost indices to estimate the equivalent salary in the new location. This tool uses indicative indices and lets you note the housing share, since housing is usually the largest and most volatile component. The output is a like-for-like figure, not a prediction: a lavish spender and a frugal one will feel the same index very differently, and a city can be cheap overall but expensive in the specific area you want to live. Exchange-rate timing matters too for international moves, and taxes differ sharply between countries, so check net pay rather than gross. Use the result alongside a short visit and real rent listings before deciding, and remember the index is an average across a whole city, not your neighbourhood.',
    formula: 'Equivalent salary = current salary x (new city index / current city index). The difference is the equivalent minus the current salary.',
    example: 'With Karachi at an index of 35 and London at 100, a 60,000 salary scales to about 171,429 in London for a comparable basket of goods and services, a difference of about 111,429.',
    mistakes: ['Comparing gross salaries across countries without accounting for tax and net pay.', 'Assuming a city-wide index applies to your neighbourhood, when rents vary widely within a city.', 'Ignoring non-salary factors such as commute, childcare and healthcare.'],
    assumptions: 'The indices are indicative averages and are not tied to a specific basket, date or exchange rate. Taxes, childcare, healthcare and lifestyle differences are not modelled.',
    disclaimer: 'This is an educational estimate, not financial or relocation advice. Cost indices are averages that change over time, so verify rents, taxes and living costs directly before making a decision.',
    related: [
      { href: '/finance/moving-abroad-cost', text: 'Moving Abroad Cost Estimator' },
      { href: '/education/study-abroad-cost', text: 'Study Abroad Cost Calculator' },
      { href: '/career/career-break-runway', text: 'Career Break Runway Calculator' }
    ],
    howAnswer: 'The current salary is multiplied by the new city index divided by the current city index to give the equivalent salary. The steps panel explains each part.',
    needAnswer: 'The current city, the new city, your current salary and the share of your budget spent on housing.',
    resultAnswer: 'The equivalent salary in the new city and the difference from your current salary.',
    extraFaqs: [
      ['Are cost-of-living indices accurate?', 'They are useful guides but are city-wide averages, so your actual experience depends on your neighbourhood, lifestyle and family size. Treat them as a starting point.'],
      ['Should I compare gross or net salary?', 'Net salary, because tax rates differ sharply between countries and a higher gross can leave you with less take-home pay in a high-tax city.']],
    contractInputs: 'Current city (select); New city (select); Current salary (number); Housing share percent (number)',
    contractFormula: 'equivalent = currentSalary * index(newCity) / index(currentCity)'
  },
  'interview-to-offer-tracker': {
    title: 'Interview to Offer Conversion Tracker',
    metaDesc: 'Track your job search funnel: interview rate, offer rate and offer per interview, to see where to improve your approach.',
    lsi: ['interview to offer calculator', 'job search conversion rate', 'application success rate', 'job hunt tracker'],
    what: 'It turns your job search numbers into conversion rates so you can see which stage is losing candidates.',
    inputsText: 'the number of applications, interviews and offers over a period.',
    outputText: 'the offer rate, interview rate and offers per interview.',
    methodText: 'each stage divided by the stage before it and by total applications.',
    quick: 'Fifty applications leading to ten interviews and one offer is a two percent offer rate and a twenty percent interview rate, with one offer per ten interviews.',
    body: 'A job search is a funnel, and the numbers tell you where it leaks. Tracking applications, interviews and offers turns a discouraging process into a set of rates you can improve. This tool reports three: the interview rate, interviews over applications, which reflects your resume and targeting; the offer rate, offers over applications, which reflects the whole funnel; and offers per interview, which reflects your performance in the room. A low interview rate usually means the resume is not matching the role or the application is not reaching a human. A low offer per interview usually points at interview preparation or fit. Counting over a fixed period, such as a month or a hundred applications, makes the rates comparable and keeps the noise down. Nothing here is stored or shared; you enter aggregate numbers and read the rates.',
    formula: 'Interview rate = interviews / applications. Offer rate = offers / applications. Offer per interview = offers / interviews. Each is shown as a percentage.',
    example: 'Fifty applications, ten interviews and one offer give an interview rate of twenty percent, an offer rate of two percent, and an offer per interview of ten percent.',
    mistakes: ['Counting the same role at several agencies as separate applications, which inflates the numbers.', 'Giving up before the sample is large enough to be meaningful.', 'Fixing the wrong stage, such as rewriting the resume when the problem is interview conversion.'],
    assumptions: 'Rates assume a single fixed period and comparable applications. Quality, role fit and referral sources are not modelled, and small samples can be misleading.',
    disclaimer: 'This is an educational tracking tool, not career advice. Outcomes depend on many factors beyond these rates, so use them to spot patterns rather than as a verdict on your ability.',
    related: [
      { href: '/career/ats-resume-score', text: 'ATS Resume Score Checker' },
      { href: '/career/salary-negotiation-range', text: 'Salary Negotiation Range Calculator' },
      { href: '/career/career-break-runway', text: 'Career Break Runway Calculator' }
    ],
    howAnswer: 'Interview rate is interviews over applications, offer rate is offers over applications, and offers per interview is offers over interviews. The steps panel lists each rate.',
    needAnswer: 'The number of applications, interviews and offers over a fixed period.',
    resultAnswer: 'The offer rate, interview rate and offers per interview, so you can see which stage to work on.',
    extraFaqs: [
      ['What is a good interview-to-offer rate?', 'It varies by field and seniority. The useful signal is the trend over time for you, not a universal benchmark, so compare against your own earlier periods.'],
      ['Should I track applications over what period?', 'A rolling month or a fixed batch of about a hundred applications works well, because a single week is usually too small a sample to be meaningful.']],
    contractInputs: 'Applications sent (number); Interviews (number); Offers (number)',
    contractFormula: 'interviewRate = interviews/applications*100; offerRate = offers/applications*100; perInterview = offers/interviews*100'
  },
  'ev-charger-business-roi': {
    title: 'Business EV Charger ROI Calculator',
    metaDesc: 'Estimate payback on installing public EV chargers for a business from capital cost, utilization, pricing and energy cost.',
    lsi: ['ev charger business roi', 'commercial ev charger payback', 'public charging station profit', 'ev charging business case'],
    what: 'It estimates the payback on installing public EV chargers for a business, from capital cost, utilization, pricing and energy cost.',
    inputsText: 'the number of chargers, cost per charger and installation, sessions per day, energy per session, price and energy cost per kWh, and operating days.',
    outputText: 'the payback period, annual gross profit and the capital employed.',
    methodText: 'energy delivered times the price margin, with payback from capital divided by annual gross profit.',
    quick: 'Four chargers costing 40,000 installed, running six sessions a day of 30 kWh at a 0.30 a unit margin, generate about 75,600 a year and pay back in roughly half a year if utilization holds.',
    body: 'Public EV charging can be a strong business case when sites are busy and the price margin is healthy. The economics are simple at the core: each session delivers energy, and the difference between what you charge and what the energy costs you is gross profit. This tool multiplies utilization, energy per session and the margin to get annual gross profit, then divides the capital cost by that profit for the payback period. Utilization is the whole game. A charger that sees six sessions a day looks excellent; the same hardware at one session a day may never pay back, and idle chargers still cost money to maintain and connect. Demand charges, network fees, maintenance, credit-card fees and the cost of the site work all sit outside the simple model, so treat the result as an optimistic case. Model a low, medium and high utilization scenario before committing capital.',
    formula: 'Sessions = chargers x sessions per day x operating days. Energy = sessions x kWh per session. Gross profit = energy x (price per kWh minus cost per kWh). Payback = (chargers x cost per charger + install total) / gross profit.',
    example: 'Four chargers at 5,000 each plus 20,000 of installation is 40,000 of capital. Six sessions a day of 30 kWh across 350 days is 25,200 sessions and 756,000 kWh. At a 0.30 a unit margin that is 226,800 gross profit, giving a payback of well under a year on these assumptions.',
    mistakes: ['Assuming high utilization without checking traffic and dwell time at the site.', 'Ignoring demand charges and network fees, which can consume much of the margin.', 'Forgetting maintenance, warranty replacement and payment processing costs.'],
    assumptions: 'Utilization, price and energy cost are held constant, and maintenance, demand charges, network fees, card fees and site works are excluded. The result is an optimistic case at the entered utilization.',
    disclaimer: 'This is an educational business estimate, not financial advice. EV charging economics depend heavily on site traffic, tariffs and local rules, so build a full business case before investing.',
    related: [
      { href: '/auto/ev-charger-roi', text: 'EV Charger ROI Calculator' },
      { href: '/homegarden/solar-payback', text: 'Solar Panel Payback Calculator' },
      { href: '/business/tool-depreciation', text: 'Tool and Equipment Depreciation Calculator' }
    ],
    howAnswer: 'Utilization is multiplied out to annual energy, the margin per kWh gives gross profit, and capital divided by gross profit gives payback. The steps panel lists each figure.',
    needAnswer: 'The number of chargers, cost per charger, installation total, sessions per day, energy per session, price and energy cost per kWh, and operating days a year.',
    resultAnswer: 'The payback period in years, annual gross profit and the capital employed, before maintenance and fees.',
    extraFaqs: [
      ['How many sessions a day does a charger need to pay back?', 'It depends on the capital and margin, but utilization is decisive. Model a low case: if the site cannot keep utilization up, the payback stretches out or disappears.'],
      ['What costs are missing from this model?', 'Demand charges, network and software fees, card processing, maintenance, insurance and the site electrical upgrade. These can take a large bite out of gross profit.']],
    contractInputs: 'Number of chargers (number); Cost per charger (number); Installation and setup total (number); Sessions per charger per day (number); kWh per session (number); Price charged per kWh (number); Energy cost per kWh (number); Operating days per year (number)',
    contractFormula: 'sessions = chargers*sessionsPerDay*daysPerYear; kwh = sessions*kwhPerSession; gross = kwh*(pricePerKwh - costPerKwh); capex = chargers*costPerCharger + installTotal; payback = capex/gross'
  },
  'student-loan-vs-scholarship': {
    title: 'Student Loan vs Scholarship Calculator',
    metaDesc: 'Compare borrowing with winning a scholarship by showing the loan needed, the monthly payment and the total interest repaid.',
    lsi: ['student loan vs scholarship', 'how much student loan do i need', 'student loan interest calculator', 'scholarship savings'],
    what: 'It shows how much you would need to borrow after a scholarship and what that loan costs in monthly payments and total interest.',
    inputsText: 'tuition per year, the number of years, the scholarship per year, the loan rate and the repayment term.',
    outputText: 'the loan principal needed, the monthly payment and the total interest repaid.',
    methodText: 'uncovered tuition times years, repaid with a standard amortising loan payment.',
    quick: 'Tuition of 20,000 a year with a 5,000 scholarship leaves 15,000 a year, or 60,000 over four years. At six percent over ten years that costs about 666 a month and 19,936 of interest.',
    body: 'A scholarship is worth more than its face value, because the money it saves is money you never have to borrow or repay with interest. This tool makes that vivid. It first finds the uncovered tuition, tuition per year minus the scholarship, and multiplies by the years to get the loan principal. Then it applies a standard amortising loan at the given rate and term to show the monthly payment and the total interest. The contrast is usually striking: a scholarship that looks modest per year can remove tens of thousands of dollars of principal and interest over a four-year course. The model assumes the loan is drawn in one lump, whereas real student loans are usually drawn in yearly tranches, which affects the interest slightly. It also ignores subsidies, income-driven repayment and forgiveness, which can reduce the real cost. Use it to see the scale of the decision, then check the specific terms.',
    formula: 'Loan principal = max(0, tuition per year minus scholarship per year) x years. Monthly payment uses the amortising formula with the monthly rate and number of months, and total interest is payment x months minus principal.',
    example: 'Tuition of 20,000 with a 5,000 scholarship leaves 15,000 per year, so a four-year course needs a 60,000 loan. At six percent over ten years the payment is about 666 a month, with total interest of about 19,936.',
    mistakes: ['Comparing the scholarship with the tuition only, when the interest saving is the bigger prize.', 'Ignoring that real loans are drawn yearly, which changes the interest.', 'Assuming income-driven repayment or forgiveness will erase the debt when eligibility is narrow.'],
    assumptions: 'The loan is drawn as a single lump sum and repaid on a standard schedule at a fixed rate. Subsidies, grace periods, income-driven repayment, forgiveness and fee changes are not modelled.',
    disclaimer: 'This is an educational estimate, not financial aid advice. Loan terms, rates and repayment options vary by country and lender, so confirm the details before borrowing.',
    related: [
      { href: '/education/scholarship-gap', text: 'Scholarship Funding Gap Calculator' },
      { href: '/education/study-abroad-cost', text: 'Study Abroad Cost Calculator' },
      { href: '/finance/career-break-runway', text: 'Career Break Runway Calculator' }
    ],
    howAnswer: 'Uncovered tuition per year is multiplied by the years to get the principal, then the amortising payment formula gives the monthly payment and total interest. The steps panel shows each stage.',
    needAnswer: 'Tuition per year, the number of years, the scholarship per year, the loan interest rate and the repayment term.',
    resultAnswer: 'The loan principal needed, the monthly payment and the total interest repaid over the term.',
    extraFaqs: [
      ['How much does a scholarship really save?', 'It saves the tuition it covers plus every cent of interest you would have paid on that amount. On this example a 5,000 scholarship removes about 24,000 of cost across four years.'],
      ['Should I borrow less by working more?', 'Working reduces the principal and therefore the interest, but it can affect grades and take longer. Model the trade-off against the scholarship and work-study on the gap calculator.']],
    contractInputs: 'Tuition per year (number); Years (number); Scholarship per year (number); Loan interest rate percent (number); Repayment term years (number)',
    contractFormula: 'loan = max(0, tuition - scholarship) * years; r = rate/12; n = term*12; payment = loan*r/(1-(1+r)^-n); interest = payment*n - loan'
  },
  'rental-portfolio-tracker': {
    title: 'Rental Portfolio Cash Flow Tracker',
    metaDesc: 'Aggregate monthly cash flow, annual net and gross yield across a small rental portfolio you can save and revisit, property by property.',
    lsi: ['rental property portfolio calculator', 'rental cash flow tracker', 'multiple rental properties', 'gross yield calculator'],
    what: 'It aggregates monthly net cash flow across several rental properties and shows annual net and gross yield, with a save and revisit option.',
    inputsText: 'the number of properties, average value, average rent, average costs and the mortgage per property.',
    outputText: 'monthly net cash flow, annual net and gross yield.',
    methodText: 'total rent minus operating costs and mortgages, with yield from annual rent over total value.',
    quick: 'Three properties valued at 200,000 each, renting for 1,500 with 400 of costs and 800 of mortgage, give 900 a month net and a 9 percent gross yield.',
    body: 'A single rental property is easy to track in your head; a small portfolio is not. This tool aggregates the whole set so the monthly cash flow is a single, honest number you can act on. It multiplies the properties by average rent for income, by average monthly costs for operating expenses, and adds the mortgages, then nets them off. Annual net is twelve times the monthly figure, and gross yield is annual rent divided by total property value. The gross yield ignores the mortgage, which is why it looks higher than a real return on your own equity. Use the portfolio store to save each property as a record and revisit it later, so the tracker becomes a living list rather than a one-off sum. Real portfolios vary widely between properties, so treat the averages as a starting view and refine each entry as you save them.',
    formula: 'Monthly net = properties x (rent minus costs minus mortgage). Annual net = 12 x monthly net. Gross yield = annual rent / (properties x value) x 100.',
    example: 'Three properties at 200,000 each with 1,500 rent, 400 costs and 800 mortgage give 4,500 rent, 1,200 costs and 2,400 mortgage, so the monthly net is 900, the annual net is 10,800 and the gross yield is 9 percent.',
    mistakes: ['Forgetting irregular costs such as voids, repairs and letting fees, which reduce the true net.', 'Reading gross yield as profit, when it ignores the mortgage and vacancies.', 'Tracking the portfolio by hand instead of saving each property so the numbers stay current.'],
    assumptions: 'The model uses averages across the portfolio, with regular costs and mortgages only. Vacancy, large repairs, capital expenditure, tax and transaction costs are not included.',
    disclaimer: 'This is an educational planning tool, not financial or tax advice. Rental returns, costs and tax treatment vary by market and property, so verify the figures and take professional advice where needed.',
    related: [
      { href: '/finance/cosigning-loan-risk', text: 'Cosigning a Loan Risk Calculator' },
      { href: '/homegarden/homeowner-first-year-budget', text: 'First-Year Homeowner Cost Calculator' },
      { href: '/finance/inheritance-tax-uk-india', text: 'Inheritance Tax Calculator (UK and India)' }
    ],
    howAnswer: 'Rent, costs and mortgages are totalled across the portfolio and netted off; annual net multiplies by twelve and gross yield divides annual rent by total value. The steps panel shows each part.',
    needAnswer: 'The number of properties, average value, average rent, average monthly costs and the mortgage per property.',
    resultAnswer: 'Monthly net cash flow, annual net and gross yield across the portfolio, with the option to save each property and revisit.',
    extraFaqs: [
      ['What is a good gross yield on a rental?', 'It varies by market, but many investors look for a gross yield in the region of five to ten percent. Subtract costs and mortgage to find the real cash flow.'],
      ['Why does gross yield differ from my return?', 'Gross yield uses rent over value and ignores the mortgage, vacancies and costs. Your return on equity is usually much lower, and cash flow can even be negative.']],
    contractInputs: 'Number of properties (number); Average property value (number); Average monthly rent each (number); Average monthly costs each (number); Monthly mortgage each (number)',
    contractFormula: 'rent = properties*avgMonthlyRent; costs = properties*avgMonthlyCosts; mortgage = properties*mortgagePerProperty; net = rent - costs - mortgage; yield = rent*12/(properties*avgValue)*100'
  }
};

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
const res = addContracts(contractItems, 'market-gap batch 5 — remaining Part 2 opportunities + multi-property');
console.log('qa contracts added:', res.added, 'total:', res.total);
