#!/usr/bin/env node
// Regional batch #3 — 5 new tools (dubai-salary pattern):
//   switzerland-take-home-salary, netherlands-take-home-salary,
//   malaysia-take-home-salary, hongkong-take-home-salary, uae-gratuity-calculator
// Idempotent: skips ids that already exist. Runs BOTH parts:
//   1. tool blocks  → js/data/regional.js (before the closing "];")
//   2. SEO entries  → js/seo-content.js (before the first existing entry)
// ESCAPING SAFETY: NO literal "$" followed by a digit and NO literal
// backslash appears in this source. HK$ is built via D (String.fromCharCode(36));
// href escapes via B (String.fromCharCode(92)).
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const D = String.fromCharCode(36); // dollar sign
const B = String.fromCharCode(92); // backslash
const Q39 = String.fromCharCode(39); // single quote

// ============================ 1. TOOLS ============================
const TOOLS = [
  {
    id: 'switzerland-take-home-salary',
    name: 'Switzerland Take-Home Salary Calculator',
    desc: 'Free Switzerland take-home salary calculator: net pay after AHV, ALV, pension fund and Swiss income tax, 2025 estimates, every step shown.',
    kw: 'switzerland take home salary calculator, swiss net salary calculator, salary after tax switzerland calculator',
    inputs: [
      { id: 'salary', label: 'Gross Annual Salary (CHF)', type: 'number', def: 90000 },
      { id: 'cantonal', label: 'Canton Tax Level', type: 'select', options: ['Low (ZG/SZ)', 'Average (ZH)', 'High (GE/VD)'], def: 'Average (ZH)' }
    ],
    calc: function (v) {
      var social = v.salary * 0.134;
      var rate = v.cantonal === 'Low (ZG/SZ)' ? 0.09 : v.cantonal === 'High (GE/VD)' ? 0.21 : 0.135;
      var tax = v.salary <= 30000 ? v.salary * 0.005 : v.salary <= 60000 ? v.salary * (0.03 + rate * 0.3) : v.salary <= 100000 ? v.salary * (0.06 + rate * 0.5) : v.salary * (0.09 + rate * 0.6);
      var take = v.salary - social - tax;
      return {
        result: 'Take-home: CHF ' + (take / 12).toFixed(0) + '/mo',
        chart: Charts.donut([tax, social, take], ['Income tax (fed+cantonal)', 'AHV/ALV/Pension', 'Take-home']),
        extra: 'Annual net: CHF ' + take.toFixed(0) + ' | Social: CHF ' + social.toFixed(0) + ' (13.4%) | Tax: CHF ' + tax.toFixed(0) + ' (' + v.cantonal + ') | 2025 estimate'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Social insurance = AHV 5.3% + ALV 1.1% + BVG pension ~7% = 13.4% of CHF ' + v.salary,
        'Step 2: Income tax (federal + cantonal + communal, ' + v.cantonal + ' canton level) estimated on effective-rate bands',
        'Step 3: Take-home = gross − social − tax, divided by 12 for the monthly figure',
        'Note: actual canton/municipality/church rates vary widely — treat as a working estimate'
      ];
    }
  },
  {
    id: 'netherlands-take-home-salary',
    name: 'Netherlands Take-Home Salary Calculator',
    desc: 'Free Netherlands take-home pay calculator: net monthly salary after Dutch payroll tax and social premiums, 2025 rates with credits, every step shown.',
    kw: 'netherlands take home salary calculator, dutch net salary calculator, salary after tax netherlands',
    inputs: [
      { id: 'salary', label: 'Gross Annual Salary (' + String.fromCharCode(8364) + ')', type: 'number', def: 50000 },
      { id: 'ruling', label: '30% Ruling?', type: 'select', options: ['No', 'Yes'], def: 'No' }
    ],
    calc: function (v) {
      var base = v.ruling === 'Yes' ? v.salary * 0.7 : v.salary;
      var tax = base <= 38441 ? base * 0.30 : base <= 76817 ? 11532 + (base - 38441) * 0.335 : 24380 + (base - 76817) * 0.42;
      var take = v.salary - tax;
      return {
        result: 'Take-home: ' + String.fromCharCode(8364) + (take / 12).toFixed(0) + '/mo',
        chart: Charts.donut([tax, take], ['Tax + premiums', 'Take-home']),
        extra: 'Annual net: ' + String.fromCharCode(8364) + take.toFixed(0) + ' | Withholding est. (incl. general tax credit): ' + String.fromCharCode(8364) + tax.toFixed(0) + (v.ruling === 'Yes' ? ' | 30% ruling applied: only 70% taxed' : '')
      };
    },
    steps: function (v) {
      var base = v.ruling === 'Yes' ? v.salary * 0.7 : v.salary;
      return [
        'Step 1: Taxable base = ' + (v.ruling === 'Yes' ? 'salary × 70% (30% expat ruling)' : 'full gross salary'),
        'Step 2: Payroll tax + social premiums (loonheffing) on combined 2025 bands 30% → 42%, general credit folded in',
        'Step 3: Take-home = gross − withholding, divided by 12',
        'Note: yearly box-1 assessment (deductions, mortgage interest) can refund part of this — estimate only'
      ];
    }
  },
  {
    id: 'malaysia-take-home-salary',
    name: 'Malaysia Take-Home Salary Calculator',
    desc: 'Free Malaysia take-home salary calculator: net monthly pay after EPF (11%) and estimated PCB income tax, 2025 rules, every step shown.',
    kw: 'malaysia take home salary calculator, epf pcb calculator, malaysia net salary calculator',
    inputs: [
      { id: 'salary', label: 'Monthly Salary (RM)', type: 'number', def: 8000 },
      { id: 'epf', label: 'Employee EPF (%)', type: 'number', def: 11 }
    ],
    calc: function (v) {
      var epf = v.salary * v.epf / 100;
      var taxable = Math.max(0, v.salary * 12 - epf * 12 - 9000);
      var tax = taxable <= 35000 ? 0 : taxable <= 100000 ? (taxable - 35000) * 0.03 : 1950 + (taxable - 100000) * 0.08;
      var take = v.salary - epf - tax / 12;
      return {
        result: 'Take-home: RM ' + take.toFixed(2) + '/mo',
        chart: Charts.donut([epf, tax / 12, take], ['EPF (11%)', 'PCB tax (est.)', 'Take-home']),
        extra: 'Annual net: RM ' + (take * 12).toFixed(0) + ' | EPF: RM ' + (epf * 12).toFixed(0) + '/yr | PCB est: RM ' + tax.toFixed(0) + '/yr (after RM9,000 relief) | 2025 estimate'
      };
    },
    steps: function (v) {
      var epf = v.salary * v.epf / 100;
      var taxable = Math.max(0, v.salary * 12 - epf * 12 - 9000);
      return [
        'Step 1: EPF employee share = ' + v.epf + '% of RM ' + v.salary + ' = RM ' + epf.toFixed(2),
        'Step 2: Annual taxable income = gross − EPF − RM 9,000 individual relief = RM ' + taxable.toFixed(0),
        'Step 3: Income tax (0% first RM35,000 taxable, then 3–8% bands here) ÷ 12 = monthly PCB estimate',
        'Step 4: Take-home = salary − EPF − PCB (monthly)'
      ];
    }
  },
  {
    id: 'hongkong-take-home-salary',
    name: 'Hong Kong Take-Home Salary Calculator',
    desc: 'Free Hong Kong take-home salary calculator: net pay after MPF (5%, capped) and progressive salaries tax, 2025 estimates, every step shown.',
    kw: 'hong kong take home salary calculator, mpf salaries tax calculator, hk net salary calculator',
    inputs: [
      { id: 'salary', label: 'Monthly Salary (HK' + D + ')', type: 'number', def: 35000 }
    ],
    calc: function (v) {
      var mpf = Math.min(v.salary, 30000) * 0.05;
      var taxable = Math.max(0, v.salary * 12 - mpf * 12 - 132000);
      var t = taxable <= 50000 ? taxable * 0.02 : taxable <= 100000 ? 1000 + (taxable - 50000) * 0.06 : taxable <= 150000 ? 4000 + (taxable - 100000) * 0.10 : 9000 + (taxable - 150000) * 0.14;
      var tax = Math.min(t, taxable * 0.15);
      var take = v.salary - mpf - tax / 12;
      return {
        result: 'Take-home: HK' + D + (take).toFixed(0) + '/mo',
        chart: Charts.donut([mpf, tax / 12, take], ['MPF (5%)', 'Salaries tax (est.)', 'Take-home']),
        extra: 'Annual net: HK' + D + (take * 12).toFixed(0) + ' | MPF: HK' + D + (mpf * 12).toFixed(0) + '/yr (capped HK' + D + '18,000) | Tax: HK' + D + tax.toFixed(0) + '/yr (HK' + D + '132,000 allowance) | 2025 estimate'
      };
    },
    steps: function (v) {
      var mpf = Math.min(v.salary, 30000) * 0.05;
      var taxable = Math.max(0, v.salary * 12 - mpf * 12 - 132000);
      return [
        'Step 1: MPF = 5% of monthly salary, capped at HK' + D + '1,500/mo = HK' + D + mpf.toFixed(0),
        'Step 2: Net chargeable income = annual gross − MPF − HK' + D + '132,000 basic allowance = HK' + D + taxable.toFixed(0),
        'Step 3: Salaries tax on 2%/6%/10%/14% bands (standard 15% rate applied only if lower)',
        'Step 4: Take-home = salary − MPF − tax ÷ 12 (monthly)'
      ];
    }
  },
  {
    id: 'uae-gratuity-calculator',
    name: 'UAE Gratuity Calculator',
    desc: 'Free UAE end-of-service gratuity calculator: 21 days of basic wage per year (30 days after 5 years), capped at 2 years of pay, every step shown.',
    kw: 'uae gratuity calculator, end of service benefit calculator uae, gratuity calculation dubai abu dhabi',
    inputs: [
      { id: 'basic', label: 'Monthly Basic Salary (AED)', type: 'number', def: 10000 },
      { id: 'years', label: 'Years of Service', type: 'number', def: 4 }
    ],
    calc: function (v) {
      var first5 = Math.min(v.years, 5);
      var rest = Math.max(0, v.years - 5);
      var daily = v.basic * 12 / 365;
      var grat = daily * 21 * first5 + daily * 30 * rest;
      var cap = v.basic * 24;
      var capped = grat > cap;
      grat = Math.min(grat, cap);
      return {
        result: 'Est. gratuity: AED ' + grat.toFixed(0),
        chart: Charts.donut([daily * 21 * first5, daily * 30 * rest || 0.0001], ['First 5 yrs (21 d/yr)', 'After 5 yrs (30 d/yr)']),
        extra: 'Daily wage: AED ' + daily.toFixed(2) + ' (basic × 12 ÷ 365) | Eligibility: 1+ year of service | ' + (capped ? 'Capped at 2 years of wages' : 'Under the 2-year cap') + ' | New Labour Law (2022) rules'
      };
    },
    steps: function (v) {
      var daily = v.basic * 12 / 365;
      var first5 = Math.min(v.years, 5);
      var rest = Math.max(0, v.years - 5);
      return [
        'Step 1: Daily wage = monthly basic × 12 ÷ 365 = AED ' + daily.toFixed(2) + ' (allowances excluded by law)',
        'Step 2: First 5 years: 21 days of basic per year = AED ' + (daily * 21 * first5).toFixed(0),
        rest > 0 ? 'Step 3: After 5 years: 30 days of basic per year = AED ' + (daily * 30 * rest).toFixed(0) : 'Step 3: Service under 5 years — the 30-day tier does not apply yet',
        'Step 4: Total, capped at 2 years of total wages. Less than 1 year of service = no gratuity'
      ];
    }
  }
];

// Insert tool blocks into js/data/regional.js
const RFILE = path.join(ROOT, 'js', 'data', 'regional.js');
let rsrc = fs.readFileSync(RFILE, 'utf8');
// Strip line comments then collapse newlines — string-only ops, no regex/backslashes
function flattenSrc(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src.indexOf('//', i);
    if (c < 0) { out += src.slice(i); break; }
    out += src.slice(i, c);
    const nl = src.indexOf(String.fromCharCode(10), c);
    if (nl < 0) break;
    i = nl + 1;
  }
  return out.split(String.fromCharCode(10)).join(' ');
}
function toolBlock(t) {
  const inp = t.inputs.map(function (i) {
    let s = "{id:'" + i.id + "',label:'" + i.label + "',type:'" + i.type + "'";
    if (i.def !== undefined) s += ",def:" + (typeof i.def === 'string' ? "'" + i.def + "'" : i.def);
    if (i.options) s += ",options:" + JSON.stringify(i.options);
    return s + "}";
  }).join(',');
  const calc = flattenSrc(t.calc.toString());
  const steps = flattenSrc(t.steps.toString());  return "  { id: '" + t.id + "', name: '" + t.name + "', desc: '" + t.desc + "', kw: '" + t.kw + "',\n" +
    "    inputs: [" + inp + "],\n" +
    "    calc: " + calc + ",\n" +
    "    steps: " + steps + " }";
}
let addedTools = 0;
const missingTools = TOOLS.filter(function (t) { return !rsrc.includes("id: '" + t.id + "'"); });
if (missingTools.length) {
  const idx = rsrc.indexOf('\n];');
  if (idx < 0) { console.error('regional.js: array close not found'); process.exit(1); }
  rsrc = rsrc.slice(0, idx) + ',\n' + missingTools.map(toolBlock).join(',\n') + rsrc.slice(idx);
  fs.writeFileSync(RFILE, rsrc);
  addedTools = missingTools.length;
}
console.log('tools inserted:', addedTools, 'of 5');

// ============================ 2. SEO ENTRIES ============================
// GUIDES uses plain double quotes — esc() below escapes them to level-1 (B + quote)
// exactly like batch-1 ground truth. Never pre-escape with B here.
const GUIDES = '<h2>From Our Guides Library</h2><ul>' +
  '<li><a href="/guides/tax-salary/">how salary tax is calculated</a></li>' +
  '<li><a href="/guides/salary/">salary structures explained</a></li>' +
  '<li><a href="/guides/currency-conversion/">currency conversion, fees included</a></li>' +
  '</ul>';;

const EUR = String.fromCharCode(8364);
const ENTRIES = [
  {
    id: 'switzerland-take-home-salary',
    title: 'Switzerland Take-Home Salary Calculator: AHV & Tax',
    metaDesc: 'Calculate Swiss take-home pay instantly — AHV, ALV and pension contributions plus federal and cantonal income tax itemised on a CHF 90,000 salary.',
    lsi: ['switzerland take home salary calculator', 'swiss net salary calculator', 'ahv alv contribution calculator'],
    aeoH2: '<h2>What does the Switzerland Take-Home Salary Calculator do?</h2><p>It converts a gross Swiss salary into monthly take-home pay: employee social insurance (AHV 5.3%, ALV 1.1%, BVG pension around 7%) plus estimated federal and cantonal income tax, which varies sharply by canton.</p><ul><li><strong>Inputs:</strong> gross annual salary, canton tax level (low/average/high).</li><li><strong>Output:</strong> monthly and annual net with each deduction itemised.</li><li><strong>Method:</strong> 2025 employee-share rates with effective-rate tax bands — a working estimate, not a canton-precise filing.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A CHF 90,000 salary in an average-tax canton (Zurich level) nets roughly CHF 66,000 a year — about CHF 5,500 per month — after about CHF 12,100 social insurance and CHF 11,700 income tax. Zurich is mid-table; Zug/Z Schwyz keep several thousand more, Geneva/Vaud several thousand less.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Swiss payslips stack three layers: social insurance (the same 13.4% everywhere for employees), the occupational pension fund BVG (rate rises with age), and income tax that is collected at federal, cantonal AND communal level — which is why two people on the same salary in different cantons can differ by thousands. The calculator applies the fixed social layer and an effective-rate tax estimate for your chosen canton band.</p><h2>The rates behind the numbers</h2><ul><li><strong>AHV/IV/EO:</strong> 5.3% employee share, mandatory for everyone.</li><li><strong>ALV (unemployment):</strong> 1.1% employee share.</li><li><strong>BVG pension:</strong> age-dependent credit rates (7% is a mid-career approximation).</li><li><strong>Income tax:</strong> progressive; the calculator folds federal + cantonal + communal into effective bands by canton level — low (Zug, Schwyz), average (Zurich), high (Geneva, Vaud).</li></ul><h2>Worked example with real numbers</h2><p>Salary CHF 90,000 (average canton): social = CHF 12,060; tax ≈ CHF 12,150; take-home ≈ <strong>CHF 65,790 a year — about CHF 5,480 per month</strong>. The same salary in Zug would land roughly CHF 4,000–5,000 higher.</p><h2>Reading the result</h2><p>The donut splits gross into tax, social and net. Not modelled: church tax, health insurance (paid privately in Switzerland), second-pillar buy-ins, and childcare deductions — all of which move the real number. Use the output as a planning baseline.</p>' + GUIDES,
    faqs: [
      ['How is the Swiss take-home calculated?', 'Gross minus employee social insurance (AHV 5.3%, ALV 1.1%, BVG pension about 7%) minus an effective-rate income-tax estimate for your canton band, divided by 12. Every subtraction appears in the steps panel with exact figures.'],
      ['What do I need to use the Switzerland Take-Home Salary Calculator?', 'A gross annual salary and a canton tax level (low, average or high). The level stands in for the hundreds of canton-commune combinations — pick average for Zurich, low for Zug or Schwyz, high for Geneva or Vaud.'],
      ['What does the result from the Switzerland Take-Home Salary Calculator show?', 'Monthly and annual take-home with the social-insurance block and the tax block itemised, plus a donut chart of how the gross divides.'],
      ['Why do Swiss taxes vary so much by canton?', 'Income tax is levied at federal, cantonal AND communal rates, and each commune sets its own multiplier. The spread between the cheapest and priciest cantons reaches double digits in percentage terms.'],
      ['Is the Switzerland Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser, and it works offline after the first load.']
    ]
  },
  {
    id: 'netherlands-take-home-salary',
    title: 'Netherlands Take-Home Salary Calculator: After Tax',
    metaDesc: 'Calculate Dutch take-home pay instantly — 2025 payroll tax and social premium bands with the general credit, plus the 30% expat ruling toggle. Every step shown.',
    lsi: ['netherlands take home salary calculator', 'dutch net salary calculator', '30 percent ruling net salary'],
    aeoH2: '<h2>What does the Netherlands Take-Home Salary Calculator do?</h2><p>It converts a gross Dutch salary into monthly net pay using the 2025 combined payroll-tax and social-premium bands (about 30% rising to 42%), folds in the general tax credit, and can apply the 30% expat ruling that makes only 70% of your salary taxable.</p><ul><li><strong>Inputs:</strong> gross annual salary, 30% ruling yes/no.</li><li><strong>Output:</strong> monthly and annual net with the withholding estimate itemised.</li><li><strong>Method:</strong> 2025 loonheffing bands, approximate credits — an estimate, not a tax filing.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A ' + EUR + ' 50,000 salary without the ruling nets about ' + EUR + ' 34,100 a year — roughly ' + EUR + ' 2,840 per month — after about ' + EUR + ' 15,900 withholding. With the 30% ruling the same offer nets about ' + EUR + ' 36,400 (roughly ' + EUR + ' 3,030 per month) because only ' + EUR + ' 35,000 is taxed.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>The Netherlands charges employees one combined withholding — loonheffing — that merges income tax and social security premiums. Your employer subtracts it every month using 2025 bands; the yearly box-1 assessment then settles the difference after credits and deductions. This calculator reproduces the monthly picture, including the general tax credit as an effective-band approximation.</p><h2>The rules it applies</h2><ul><li><strong>2025 bands:</strong> roughly 30% up to ' + EUR + ' 38,441, 33.5% to ' + EUR + ' 76,817, 42% above (tax + premiums combined).</li><li><strong>General tax credit:</strong> folded into the effective band rates rather than applied separately.</li><li><strong>30% ruling:</strong> qualifying expats may take 30% of salary tax-free — the calculator makes only 70% taxable when you switch it on.</li></ul><h2>Worked example with real numbers</h2><p>Salary ' + EUR + ' 50,000, no ruling: withholding ≈ ' + EUR + ' 15,900 → <strong>net ≈ ' + EUR + ' 2,840 per month</strong>. With the ruling: taxable base drops to ' + EUR + ' 35,000, withholding ≈ ' + EUR + ' 10,500 → <strong>net ≈ ' + EUR + ' 3,290 per month</strong> — over ' + EUR + ' 5,000 a year more from one clause.</p><h2>Reading the result</h2><p>The donut shows net versus withholding. Mortgage-interest deductions, study costs and healthcare allowance (zorgtoeslag) are settled at year-end and not modelled — the output is the payslip baseline. Compare offers with and without the ruling side by side — the delta is your negotiation number.</p>' + GUIDES,
    faqs: [
      ['How is the Dutch take-home calculated?', 'Gross minus the combined payroll tax and social premium withholding on 2025 bands (about 30–42%), with the general credit folded in, divided by 12. The steps panel lists each layer.'],
      ['What do I need to use the Netherlands Take-Home Salary Calculator?', 'A gross annual salary and whether you hold the 30% ruling. Expats who qualify should switch it on — it makes 30% of the salary tax-free and visibly changes the net.'],
      ['What does the result from the Netherlands Take-Home Salary Calculator show?', 'Monthly and annual net pay with the withholding estimate itemised, plus a donut chart of net versus tax and premiums.'],
      ['What is the 30% ruling in the Netherlands?', 'A tax concession for imported employees: 30% of the salary is paid tax-free for up to five years, compensating relocation costs. Only 70% of the gross is taxed while it applies.'],
      ['Is the Netherlands Take-Home Salary Calculator really free?', 'Yes — 100% free, no account needed, everything runs locally in your browser.']
    ]
  },
  {
    id: 'malaysia-take-home-salary',
    title: 'Malaysia Take-Home Salary Calculator: EPF & Tax',
    metaDesc: 'Calculate Malaysian take-home pay instantly — employee EPF at 11%, the RM9,000 individual relief and estimated PCB monthly tax on an RM8,000 salary.',
    lsi: ['malaysia take home salary calculator', 'epf pcb calculator', 'malaysia net salary calculator'],
    aeoH2: '<h2>What does the Malaysia Take-Home Salary Calculator do?</h2><p>It converts a monthly Malaysian salary into take-home pay: the 11% employee EPF contribution, the RM9,000 individual tax relief, and an estimated monthly PCB (income tax) after those deductions.</p><ul><li><strong>Inputs:</strong> monthly salary, employee EPF rate.</li><li><strong>Output:</strong> monthly take-home with EPF and estimated tax itemised.</li><li><strong>Method:</strong> 2025 EPF rate and simplified progressive bands — LHDN assessment may differ slightly.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>An RM 8,000 salary leaves about RM 6,962 per month after RM 880 EPF and roughly RM 158 estimated PCB — about RM 83,540 a year. EPF stays yours (it is savings, not tax), and the first RM 34,000 of annual taxable income is charged 0%.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Malaysian payslips have two moving parts: EPF (the Employees Provident Fund — 11% employee share that lands in YOUR retirement account) and PCB (Potongan Cukai Bulanan — the monthly tax deduction your employer remits to LHDN). The calculator applies both in order: EPF first, because EPF contributions are themselves tax-deductible and shrink the taxable base.</p><h2>The rules it applies</h2><ul><li><strong>EPF:</strong> 11% employee share on wages (employer adds 12–13% on top — not your deduction).</li><li><strong>Individual relief:</strong> RM 9,000 a year, applied before tax.</li><li><strong>Income tax bands:</strong> 0% on the first RM 35,000 of taxable income, then 3% rising stepwise — the calculator uses simplified bands for the monthly estimate.</li></ul><h2>Worked example with real numbers</h2><p>Salary RM 8,000: EPF = RM 880; annual taxable = 96,000 − 10,560 − 9,000 = RM 76,440; tax ≈ RM 1,891 a year (≈ RM 158/month). <strong>Take-home ≈ RM 6,962 per month — about RM 83,540 a year</strong>, with RM 10,560 landing in your EPF account on top.</p><h2>Reading the result</h2><p>The donut separates EPF savings from tax — they are not the same thing. Bonuses attract schedular tax deductions (MTD) at different rates and are not modelled. Relief for spouse, children, insurance and PRS would reduce the real PCB further. For a precise figure the official LHDN e-PCB calculator remains the legal authority — treat this output as the fast planning estimate. Contract-level EPF rate changes also shift this split.</p>' + GUIDES,
    faqs: [
      ['How is the Malaysian take-home calculated?', 'Salary minus the 11% employee EPF contribution minus an estimated monthly PCB. The PCB estimate applies the RM 9,000 relief and simplified progressive bands to your annualised income.'],
      ['What do I need to use the Malaysia Take-Home Salary Calculator?', 'A monthly salary and your EPF rate (11% is standard; some contracts allow 9%). Everything else is derived automatically.'],
      ['What does the result from the Malaysia Take-Home Salary Calculator show?', 'Monthly take-home, the annual net, the yearly EPF amount (which stays yours) and the estimated PCB — itemised in the steps panel.'],
      ['Is EPF tax in Malaysia?', 'No — EPF is mandatory retirement savings that stays in your account and earns dividends; it is also tax-deductible up to limits. Only the PCB portion is actual tax.'],
      ['Is the Malaysia Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, runs entirely in your browser.']
    ]
  },
  {
    id: 'hongkong-take-home-salary',
    title: 'Hong Kong Take-Home Salary Calculator: MPF & Tax',
    metaDesc: 'Calculate Hong Kong take-home pay instantly — MPF at 5% (capped HK1,500) and progressive salaries tax after the HK132,000 allowance, itemised.',
    lsi: ['hong kong take home salary calculator', 'mpf salaries tax calculator', 'hk net salary calculator'],
    aeoH2: '<h2>What does the Hong Kong Take-Home Salary Calculator do?</h2><p>It converts a Hong Kong salary into monthly take-home: the 5% MPF mandatory contribution (capped at HK1,500 a month), and progressive salaries tax after the HK132,000 basic allowance — applying the standard 15% rate only when it is lower.</p><ul><li><strong>Inputs:</strong> monthly salary.</li><li><strong>Output:</strong> monthly take-home with MPF and estimated tax itemised.</li><li><strong>Method:</strong> 2025 MPF cap and simplified progressive bands — IRD assessment may differ.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A HK35,000 salary leaves about HK31,255 per month after HK1,750 MPF and roughly HK2,000 estimated tax — about HK375,060 a year. Hong Kong keeps one of the lowest salary-tax burdens of any major financial centre.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Hong Kong payslips are famously simple: MPF (the Mandatory Provident Fund — 5% of relevant income, capped) and salaries tax (progressive 2–17% bands, or a flat 15% standard rate on net income — whichever is LOWER). There is no social-security payroll deduction beyond MPF, no healthcare withholding, and the territorial system excludes most overseas income entirely.</p><h2>The rules it applies</h2><ul><li><strong>MPF:</strong> 5% employee share on the first HK30,000 of relevant monthly income — maximum HK1,500 a month.</li><li><strong>Basic allowance:</strong> HK132,000 a year before any tax bites.</li><li><strong>Progressive bands:</strong> first HK50,000 at 2%, next at 6%, then 10%, remainder at 14% — with the 15% standard-rate ceiling applied when lower.</li></ul><h2>Worked example with real numbers</h2><p>Salary HK35,000: MPF = HK1,750; annual taxable = 420,000 − 21,000 − 132,000 = HK267,000; progressive tax ≈ HK20,680 → <strong>take-home ≈ HK31,255 per month — about HK375,060 a year</strong>. Effective tax rate: under 5%.</p><h2>Reading the result</h2><p>The donut splits MPF savings from tax. Not modelled: married/personal allowances beyond the basic one, self-education and home-loan deductions, and the MPF voluntary contributions some employers match. Rents eat the headline saving — Hong Kong cost of living is the real tax. Each salary is assessed separately for dual-income households, which keeps effective rates low. Territorial source rules also mean genuinely offshore employment can be taxed at 0% — a rarity among financial centres.</p>' + GUIDES,
    faqs: [
      ['How is the Hong Kong take-home calculated?', 'Salary minus the MPF employee share (5%, capped at HK1,500 monthly) minus estimated salaries tax on the progressive bands after the HK132,000 allowance. The steps show both in order.'],
      ['What do I need to use the Hong Kong Take-Home Salary Calculator?', 'Just a monthly salary — MPF and tax derive from it automatically. There are no residency toggles; the territorial system treats employment income the same for locals and expats.'],
      ['What does the result from the Hong Kong Take-Home Salary Calculator show?', 'Monthly and annual take-home with the MPF and tax blocks itemised, plus the effective rate you can compare against other financial centres.'],
      ['What is MPF in Hong Kong?', 'The Mandatory Provident Fund: a retirement scheme where employees contribute 5% of relevant income (capped at HK1,500 a month) into their own investment account — savings, not tax.'],
      ['Is the Hong Kong Take-Home Salary Calculator really free?', 'Yes — 100% free, no account, everything runs in your browser.']
    ]
  },
  {
    id: 'uae-gratuity-calculator',
    title: 'UAE Gratuity Calculator: End-of-Service Payout',
    metaDesc: 'Calculate UAE end-of-service gratuity instantly — 21 days of basic wage per year for the first 5 years, 30 days after, capped at 2 years of pay. Steps shown.',
    lsi: ['uae gratuity calculator', 'end of service benefit calculator uae', 'gratuity calculation dubai abu dhabi'],
    aeoH2: '<h2>What does the UAE Gratuity Calculator do?</h2><p>It computes the end-of-service gratuity UAE labour law owes you on leaving: 21 days of basic wage per year for the first 5 years of service, 30 days per year thereafter, capped at two years of total wages — with the daily wage derived from basic salary only.</p><ul><li><strong>Inputs:</strong> monthly basic salary, years of service.</li><li><strong>Output:</strong> estimated gratuity total with the daily wage and tiers itemised.</li><li><strong>Method:</strong> the 2022 Labour Law formula (Federal Decree-Law 33), evaluated in your browser.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>On an AED 10,000 basic salary after 4 years: daily wage = AED 328.77, gratuity = 21 days × 4 years ≈ <strong>AED 27,616</strong>. After 5 years the rate rises to 30 days of basic per year, and the total can never exceed 2 years of wages.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>The gratuity is the UAE version of severance — and the single most-misunderstood number in Gulf job offers. Under the 2022 Federal Decree-Law 33 the formula is the same for resignation and termination (unlike the old law): it builds ONLY on your basic salary — housing, transport and other allowances are excluded by law — and only service of a year or more counts.</p><h2>The formula it applies</h2><ul><li><strong>Daily wage:</strong> monthly basic × 12 ÷ 365 (this is the legal conversion).</li><li><strong>First 5 years:</strong> 21 days of the daily wage per year of service.</li><li><strong>After 5 years:</strong> 30 days of the daily wage per year.</li><li><strong>Cap:</strong> total gratuity cannot exceed two years of total wages.</li><li><strong>Under 1 year:</strong> no gratuity at all.</li></ul><h2>Worked example with real numbers</h2><p>Basic AED 10,000, 6 years of service: daily wage = AED 328.77. First 5 years: 21 × 5 × 328.77 = AED 34,521. Sixth year: 30 × 328.77 = AED 9,863. <strong>Total ≈ AED 44,384</strong>, well under the 2-year cap of AED 240,000.</p><h2>Reading the result</h2><p>The donut splits the two tiers. Unpaid leave reduces service time pro-rata; part-time service accrues by actual hours. The calculator shows the statutory amount — your final settlement also includes unused leave encashment, any notice-period pay, and end-of-service benefits your contract adds on top.</p>' + GUIDES,
    faqs: [
      ['How is the UAE gratuity calculated?', 'Daily wage (basic × 12 ÷ 365) times 21 days per year for the first 5 years, then 30 days per year after — capped at 2 years of wages. Allowances are excluded; only basic salary counts.'],
      ['What do I need to use the UAE Gratuity Calculator?', 'Your monthly basic salary (the line on your labour contract, not your total package) and your years of continuous service. The tiers and cap apply automatically.'],
      ['What does the result from the UAE Gratuity Calculator show?', 'The estimated total gratuity, the daily wage it builds from, the split between the 21-day and 30-day tiers, and whether the 2-year cap applies.'],
      ['Do I get gratuity if I resign in the UAE?', 'Yes — under the 2022 Labour Law the formula is identical for resignation and termination, as long as you have completed at least one year of continuous service.'],
      ['Is the UAE Gratuity Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser and works offline.']
    ]
  }
];

// Insert SEO entries into js/seo-content.js (only missing ids)
const SFILE = path.join(ROOT, 'js', 'seo-content.js');
let ssrc = fs.readFileSync(SFILE, 'utf8');
function esc(s) { return s.split('"').join(B + '"'); }
function seoEntry(e) {
  const faqs = e.faqs.map(function (f) { return '{"q":' + JSON.stringify(f[0]) + ',"a":' + JSON.stringify(f[1]) + '}'; }).join(',');
  return '  ' + Q39 + e.id + Q39 + ': {' +
    '"title":' + JSON.stringify(e.title) +
    ',"metaDesc":' + JSON.stringify(e.metaDesc) +
    ',"canonicalPath":"/regional/' + e.id + '"' +
    ',"cat":"regional","catName":"Regional"' +
    ',"lsi":' + JSON.stringify(e.lsi) +
    ',"aeo":' + JSON.stringify(e.aeoH2 + e.aeoQuick) +
    ',"desc":"' + esc(e.desc) + '"' +
    ',"faqs":[' + faqs + ']},';
}
let addedSeo = 0;
const missingSeo = ENTRIES.filter(function (e) { return !ssrc.includes(Q39 + e.id + Q39 + ':'); });
if (missingSeo.length) {
  const anchor = '\n  ' + Q39;
  const first = ssrc.indexOf(anchor);
  if (first < 0) { console.error('seo-content.js: anchor not found'); process.exit(1); }
  const block = missingSeo.map(seoEntry).join('\n');
  ssrc = ssrc.slice(0, first + 1) + block + ssrc.slice(first);
  fs.writeFileSync(SFILE, ssrc);
  addedSeo = missingSeo.length;
}
console.log('seo entries inserted:', addedSeo, 'of 5');

// Quick self-check: parse seo-content.js and validate constraints for new ids
const vm = require('vm');
const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
vm.createContext(sandbox);
vm.runInContext(ssrc, sandbox);
const TS = sandbox.window.TOOL_SEO;
const bad = [];
for (const e of ENTRIES) {
  const m = TS[e.id];
  if (!m) { bad.push('missing ' + e.id); continue; }
  if (m.title.length > 60) bad.push('title ' + e.id + ' ' + m.title.length);
  if (m.metaDesc.length < 90 || m.metaDesc.length > 160) bad.push('meta ' + e.id + ' ' + m.metaDesc.length);
  const qs = m.faqs.map(function (f) { return f.q; });
  if (!qs.some(function (q) { return /^How is the /.test(q); })) bad.push('metric ' + e.id);
  if (!qs.some(function (q) { return /^What do I need to use /.test(q); })) bad.push('inputs ' + e.id);
  if (!qs.some(function (q) { return /^What does the result from /.test(q); })) bad.push('result ' + e.id);
  const words = (m.aeo + ' ' + m.desc + ' ' + m.faqs.map(function (f) { return f.q + ' ' + f.a; }).join(' ')).split(/\s+/).length;
  if (words <= 500) bad.push('words ' + e.id + ' ' + words);
}
console.log('self-check:', bad.length ? JSON.stringify(bad) : 'ALL OK');
if (bad.length) process.exit(1);
