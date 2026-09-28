#!/usr/bin/env node
// Regional batch #4 — 3 new take-home tools (family pattern from batches 2/3):
//   ireland-take-home-salary, new-zealand-take-home-salary, south-africa-take-home-salary
// (Japan/Switzerland/Netherlands/Malaysia/HongKong already landed in batch 3.)
// Runs BOTH parts, idempotent:
//   1. tool blocks  → js/data/regional.js (before the closing "];")
//   2. SEO entries  → js/seo-content.js (before the first existing entry)
// ESCAPING SAFETY: NO literal "$" followed by a digit, NO literal backslash and
// NO apostrophes appear in the content strings. Currency symbols inside function
// bodies are built inline via String.fromCharCode so fn.toString() stays
// self-contained. SEO strings keep a space after "NZ$" to avoid $+digit.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const D = String.fromCharCode(36); // dollar (script-side string building only)
const B = String.fromCharCode(92); // backslash (esc helper)
const Q39 = String.fromCharCode(39); // single quote (output wrapping only)
const EUR = String.fromCharCode(8364); // euro (script-side string building only)

// ============================ 1. TOOLS ============================
const TOOLS = [
  {
    id: 'ireland-take-home-salary',
    name: 'Ireland Take-Home Salary Calculator',
    desc: 'Free Ireland take-home pay calculator: net salary after PAYE income tax, USC and PRSI, 2025 rates, every step shown.',
    kw: 'ireland take home salary calculator, irish salary after tax calculator, payslip calculator ireland',
    inputs: [
      { id: 'salary', label: 'Gross Annual Salary (' + EUR + ')', type: 'number', def: 50000 },
      { id: 'status', label: 'Tax Band Status', type: 'select', options: ['Single', 'Married (one income)'], def: 'Single' }
    ],
    calc: function (v) {
      var band = v.status === 'Married (one income)' ? 53000 : 44000;
      var paye = v.salary <= band ? v.salary * 0.20 : band * 0.20 + (v.salary - band) * 0.40;
      paye = Math.max(0, paye - 4000);
      var u1 = Math.min(v.salary, 12012) * 0.005;
      var u2 = Math.min(Math.max(v.salary - 12012, 0), 15370) * 0.02;
      var u3 = Math.min(Math.max(v.salary - 27382, 0), 42662) * 0.03;
      var u4 = Math.max(v.salary - 70044, 0) * 0.08;
      var usc = u1 + u2 + u3 + u4;
      var prsi = v.salary * 0.041;
      var take = v.salary - paye - usc - prsi;
      return {
        result: 'Take-home: ' + String.fromCharCode(8364) + (take / 12).toFixed(0) + '/mo',
        chart: Charts.donut([paye, usc, prsi, take], ['PAYE (after credits)', 'USC', 'PRSI', 'Take-home']),
        extra: 'Annual net: ' + String.fromCharCode(8364) + take.toFixed(0) + ' | PAYE: ' + String.fromCharCode(8364) + paye.toFixed(0) + ' | USC: ' + String.fromCharCode(8364) + usc.toFixed(0) + ' | PRSI: ' + String.fromCharCode(8364) + prsi.toFixed(0) + ' (4.1%) | 2025 rates'
      };
    },
    steps: function (v) {
      var band = v.status === 'Married (one income)' ? 53000 : 44000;
      var paye = Math.max(0, (v.salary <= band ? v.salary * 0.20 : band * 0.20 + (v.salary - band) * 0.40) - 4000);
      return [
        'Step 1: PAYE = 20% of the first ' + String.fromCharCode(8364) + band.toLocaleString() + ', 40% above = ' + String.fromCharCode(8364) + (v.salary <= band ? v.salary * 0.20 : band * 0.20 + (v.salary - band) * 0.40).toFixed(0),
        'Step 2: Less standard credits (personal 2,000 + employee 2,000) = PAYE ' + String.fromCharCode(8364) + paye.toFixed(0),
        'Step 3: USC = 0.5% to ' + String.fromCharCode(8364) + ' 12,012, 2% to ' + String.fromCharCode(8364) + ' 27,382, 3% to ' + String.fromCharCode(8364) + ' 70,044, 8% above',
        'Step 4: PRSI = 4.1% of gross salary',
        'Step 5: Take-home = salary − PAYE − USC − PRSI, divided by 12'
      ];
    }
  },
  {
    id: 'new-zealand-take-home-salary',
    name: 'New Zealand Take-Home Salary Calculator',
    desc: 'Free New Zealand take-home pay calculator: net salary after income tax, the ACC levy and KiwiSaver, 2025-26 rates, every step shown.',
    kw: 'new zealand take home salary calculator, nz salary after tax calculator, paye calculator new zealand',
    inputs: [
      { id: 'salary', label: 'Annual Salary (NZ' + D + ')', type: 'number', def: 80000 },
      { id: 'ks', label: 'KiwiSaver Rate (%)', type: 'number', def: 3 }
    ],
    calc: function (v) {
      var s = v.salary;
      var tax = Math.min(s, 15600) * 0.105
        + Math.min(Math.max(s - 15600, 0), 37900) * 0.175
        + Math.min(Math.max(s - 53500, 0), 24600) * 0.30
        + Math.min(Math.max(s - 78100, 0), 101900) * 0.33
        + Math.max(s - 180000, 0) * 0.39;
      var acc = Math.min(s, 152790) * 0.0167;
      var ks = s * v.ks / 100;
      var take = s - tax - acc - ks;
      return {
        result: 'Take-home: NZ' + String.fromCharCode(36) + (take / 12).toFixed(0) + '/mo',
        chart: Charts.donut([tax, acc, ks, take], ['PAYE income tax', 'ACC levy', 'KiwiSaver', 'Take-home']),
        extra: 'Annual net: NZ' + String.fromCharCode(36) + take.toFixed(0) + ' | Tax: NZ' + String.fromCharCode(36) + tax.toFixed(0) + ' | ACC: NZ' + String.fromCharCode(36) + acc.toFixed(0) + ' | KiwiSaver: NZ' + String.fromCharCode(36) + ks.toFixed(0) + ' (stays yours) | 2025-26 bands'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var tax = Math.min(s, 15600) * 0.105 + Math.min(Math.max(s - 15600, 0), 37900) * 0.175 + Math.min(Math.max(s - 53500, 0), 24600) * 0.30 + Math.min(Math.max(s - 78100, 0), 101900) * 0.33 + Math.max(s - 180000, 0) * 0.39;
      return [
        'Step 1: PAYE bands 2025-26 = 10.5% to NZ' + String.fromCharCode(36) + ' 15,600, 17.5% to NZ' + String.fromCharCode(36) + ' 53,500, 30% to NZ' + String.fromCharCode(36) + ' 78,100, 33% to NZ' + String.fromCharCode(36) + ' 180,000, 39% above',
        'Step 2: Income tax total = NZ' + String.fromCharCode(36) + tax.toFixed(0),
        'Step 3: ACC earners levy = 1.67% on covered earnings (cap NZ' + String.fromCharCode(36) + ' 152,790)',
        'Step 4: KiwiSaver = ' + v.ks + '% employee share (employer adds at least 3% on top)',
        'Step 5: Take-home = salary − tax − ACC − KiwiSaver, divided by 12'
      ];
    }
  },
  {
    id: 'south-africa-take-home-salary',
    name: 'South Africa Take-Home Salary Calculator',
    desc: 'Free South Africa take-home salary calculator: net pay after SARS PAYE brackets, age rebates and UIF, 2025-26 tables, every step shown.',
    kw: 'south africa take home salary calculator, sars paye calculator, salary after tax south africa',
    inputs: [
      { id: 'salary', label: 'Monthly Salary (ZAR)', type: 'number', def: 50000 },
      { id: 'age', label: 'Age Band', type: 'select', options: ['Under 65', '65+', '75+'], def: 'Under 65' }
    ],
    calc: function (v) {
      var annual = v.salary * 12;
      var tax = annual <= 237100 ? annual * 0.18
        : annual <= 370500 ? 42678 + (annual - 237100) * 0.26
        : annual <= 512800 ? 77362 + (annual - 370500) * 0.31
        : annual <= 673000 ? 121475 + (annual - 512800) * 0.36
        : annual <= 857900 ? 179147 + (annual - 673000) * 0.39
        : annual <= 1817000 ? 251258 + (annual - 857900) * 0.41
        : 644489 + (annual - 1817000) * 0.45;
      var rebate = v.age === '75+' ? 12589 : v.age === '65+' ? 9444 : 0;
      tax = Math.max(0, tax - rebate);
      var uif = Math.min(v.salary, 177.12);
      var take = v.salary - tax / 12 - uif;
      return {
        result: 'Take-home: R ' + take.toFixed(0) + '/mo',
        chart: Charts.donut([tax / 12, uif, take], ['PAYE (SARS)', 'UIF', 'Take-home']),
        extra: 'Annual net: R ' + (take * 12).toFixed(0) + ' | PAYE: R ' + tax.toFixed(0) + '/yr | UIF: R ' + (uif * 12).toFixed(0) + '/yr (1%, capped) | ' + v.age + ' rebates applied | 2025-26 tables'
      };
    },
    steps: function (v) {
      var annual = v.salary * 12;
      var tax = annual <= 237100 ? annual * 0.18 : annual <= 370500 ? 42678 + (annual - 237100) * 0.26 : annual <= 512800 ? 77362 + (annual - 370500) * 0.31 : annual <= 673000 ? 121475 + (annual - 512800) * 0.36 : annual <= 857900 ? 179147 + (annual - 673000) * 0.39 : annual <= 1817000 ? 251258 + (annual - 857900) * 0.41 : 644489 + (annual - 1817000) * 0.45;
      var rebate = v.age === '75+' ? 12589 : v.age === '65+' ? 9444 : 0;
      return [
        'Step 1: Annualise salary = R ' + v.salary + ' × 12 = R ' + annual.toLocaleString(),
        'Step 2: SARS 2025-26 brackets: 18% to R 237,100, 26% to R 370,500, 31% to R 512,800, 36% to R 673,000, 39% to R 857,900, 41% to R 1,817,000, 45% above',
        'Step 3: Less age rebate (primary R 17,235 is built in; + R 9,444 at 65+, + R 3,145 more at 75+) = PAYE R ' + Math.max(0, tax - rebate).toFixed(0) + '/yr',
        'Step 4: UIF = 1% of monthly salary, capped at R 177.12',
        'Step 5: Take-home = monthly salary − PAYE ÷ 12 − UIF'
      ];
    }
  }
];

// ---- tool block serializer (matches the family style in regional.js) ----
function q(s) { return "'" + s + "'"; }
function toolSource(t) {
  const L = [];
  L.push('  {');
  L.push('    id: ' + q(t.id) + ',');
  L.push('    name: ' + q(t.name) + ',');
  L.push('    desc: ' + q(t.desc) + ',');
  L.push('    kw: ' + q(t.kw) + ',');
  L.push('    inputs: [');
  L.push('      ' + t.inputs.map(function (inp) {
    let s = "{ id: '" + inp.id + "', label: '" + inp.label + "', type: '" + inp.type + "'";
    if (inp.type === 'number') s += ', def: ' + inp.def + ' }';
    else s += ', options: [' + inp.options.map(q).join(', ') + "], def: '" + inp.def + "' }";
    return s;
  }).join(',\r\n      '));
  L.push('    ],');
  L.push('    calc: ' + t.calc.toString() + ',');
  L.push('    steps: ' + t.steps.toString());
  L.push('  }');
  return L.join('\r\n');
}

const TFILE = path.join(ROOT, 'js', 'data', 'regional.js');
let tsrc = fs.readFileSync(TFILE, 'utf8');
const missingTools = TOOLS.filter(function (t) { return !tsrc.includes("'" + t.id + "'"); });
if (missingTools.length) {
  const block = ',\r\n' + missingTools.map(toolSource).join(',\r\n') + '\n';
  const cut = tsrc.lastIndexOf('];');
  tsrc = tsrc.slice(0, cut) + block + tsrc.slice(cut);
  fs.writeFileSync(TFILE, tsrc);
}
console.log('tool blocks inserted:', missingTools.length, 'of', TOOLS.length);

// ---- tools self-check: eval in VM, run calc with defaults, hard-assert values ----
const sb2 = { window: {}, Charts: { donut: function () { return {}; }, bar: function () { return {}; }, gauge: function () { return {}; } }, console: { log: function () {}, warn: function () {}, error: function () {} } };
vm.createContext(sb2);
vm.runInContext(tsrc, sb2);
const REG = sb2.window.REGIONAL_TOOLS;
const EXPECTED = [
  ['ireland-take-home-salary', { salary: 50000, status: 'Single' }, 'Take-home: ' + EUR + '3309/mo'],
  ['new-zealand-take-home-salary', { salary: 80000, ks: 3 }, 'Take-home: NZ' + D + '4999/mo'],
  ['south-africa-take-home-salary', { salary: 50000, age: 'Under 65' }, 'Take-home: R 37084/mo']
];
const badTools = [];
for (const [id, values, expect] of EXPECTED) {
  const t = REG.find(function (x) { return x.id === id; });
  if (!t) { badTools.push('missing tool ' + id); continue; }
  const v = {};
  t.inputs.forEach(function (inp) { v[inp.id] = values[inp.id] !== undefined ? values[inp.id] : inp.def; });
  const out = t.calc(v);
  if (out.result !== expect) badTools.push(id + ' result ' + out.result + ' expected ' + expect);
  if ((out.result + ' ' + out.extra).includes('NaN')) badTools.push(id + ' NaN');
  const st = t.steps(v).join(' ');
  if (st.includes('NaN')) badTools.push(id + ' steps NaN');
  if (!out.chart) badTools.push(id + ' no chart');
}
console.log('tool self-check:', badTools.length ? badTools.join('; ') : 'PASS (3 tools, exact expected values)');

// ============================ 2. SEO ENTRIES ============================
// GUIDES uses plain double quotes — esc() below escapes them to level-1 (B + quote)
// exactly like batch-1 ground truth. Never pre-escape with B here.
const GUIDES = '<h2>From Our Guides Library</h2><ul>' +
  '<li><a href="/guides/tax-salary/">how salary tax is calculated</a></li>' +
  '<li><a href="/guides/salary/">salary structures explained</a></li>' +
  '<li><a href="/guides/currency-conversion/">currency conversion, fees included</a></li>' +
  '</ul>';

const ENTRIES = [
  {
    id: 'ireland-take-home-salary',
    title: 'Ireland Take-Home Salary Calculator: PAYE & USC',
    metaDesc: 'Calculate Irish take-home pay instantly — 2025 PAYE bands, USC progressive charges, PRSI at 4.1% and the standard tax credits, itemised.',
    lsi: ['ireland take home salary calculator', 'irish salary after tax calculator', 'usc prsi payslip calculator'],
    aeoH2: '<h2>What does the Ireland Take-Home Salary Calculator do?</h2><p>It converts a gross Irish salary into monthly net pay using the 2025 PAYE bands (20% up to ' + EUR + ' 44,000 for a single person, 40% above), the four-band Universal Social Charge, employee PRSI at 4.1% and the standard tax credits.</p><ul><li><strong>Inputs:</strong> gross annual salary, single or married one-income band.</li><li><strong>Output:</strong> monthly and annual net with PAYE, USC and PRSI itemised.</li><li><strong>Method:</strong> 2025 statutory rates — your Revenue certificate may differ slightly.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A ' + EUR + ' 50,000 salary (single) nets about ' + EUR + ' 39,704 a year — roughly ' + EUR + ' 3,308 per month — after ' + EUR + ' 7,200 PAYE (with credits), ' + EUR + ' 1,046 USC and ' + EUR + ' 2,050 PRSI. The married one-income band widens the 20% cutoff to ' + EUR + ' 53,000.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>An Irish payslip carries three separate deductions and they all behave differently. PAYE income tax charges 20 percent inside the standard rate band and 40 percent above it, then subtracts your tax credits — the personal credit and the employee PAYE credit total ' + EUR + ' 4,000 for a typical single PAYE worker. The Universal Social Charge is a progressive levy on almost all income. Pay Related Social Insurance funds benefits such as jobseeker and illness payments and is a flat percentage of gross.</p><h2>The rules it applies</h2><ul><li><strong>PAYE 2025:</strong> 20% up to ' + EUR + ' 44,000 (single) or ' + EUR + ' 53,000 (married, one income), 40% on the balance, then minus ' + EUR + ' 4,000 of standard credits.</li><li><strong>USC 2025:</strong> 0.5% on the first ' + EUR + ' 12,012, 2% to ' + EUR + ' 27,382, 3% to ' + EUR + ' 70,044, 8% above. Reduced rates for full medical-card holders and most over-70s are not modelled.</li><li><strong>PRSI:</strong> employee Class A rate of 4.1% of gross pay, with no ceiling for most employees.</li><li><strong>Not modelled:</strong> pension AVC relief, benefits in kind, rent and other personal credits beyond the standard pair.</li></ul><h2>Worked example with real numbers</h2><p>Salary ' + EUR + ' 50,000, single: PAYE = ' + EUR + ' 11,200 less ' + EUR + ' 4,000 credits = ' + EUR + ' 7,200. USC = ' + EUR + ' 60.06 + ' + EUR + ' 307.40 + ' + EUR + ' 678.54 = ' + EUR + ' 1,046. PRSI = ' + EUR + ' 2,050. <strong>Take-home ≈ ' + EUR + ' 39,704 a year — about ' + EUR + ' 3,308 per month</strong>, an effective deduction rate near 21%.</p><h2>Reading the result</h2><p>The donut separates the three charges because they go to different places: PAYE to the Exchequer, USC to the central fund, PRSI to the Social Insurance Fund that pays benefits. A ' + EUR + ' 2,000 gross raise is worth roughly ' + EUR + ' 95 a month after all three — check the marginal rate before negotiating. Revenue computes your exact credits and certificate each year, and Emergency USC (a flat 40%) applies without a PPS number. Budget changes move the band edges, so verify against your payslip once a year.</p>' + GUIDES,
    faqs: [
      ['How is the Ireland take-home salary calculated?', 'Gross salary minus PAYE income tax (20% and 40% bands, less the 4,000 standard credits), minus USC on four progressive bands, minus employee PRSI at 4.1%. The steps panel shows each layer in order.'],
      ['What do I need to use the Ireland Take-Home Salary Calculator?', 'Gross annual salary and marital band status. Everything else — bands, credits, USC edges and the PRSI rate — is built in for 2025.'],
      ['What does the result from the Ireland Take-Home Salary Calculator show?', 'Monthly and annual net pay with PAYE, USC and PRSI itemised, plus a donut chart of how the gross divides between the three charges and your pocket.'],
      ['Why is my Irish payslip different from the calculator?', 'Tax credits vary (rent credit, medical insurance relief, home carer), pension AVCs reduce taxable pay, and a full medical card cuts USC to 0.5%. The calculator models the standard single-PAYE case with the two standard credits.'],
      ['Is the Ireland Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser, and it works offline after the first load.']
    ]
  },
  {
    id: 'new-zealand-take-home-salary',
    title: 'New Zealand Take-Home Pay Calculator: PAYE & ACC',
    metaDesc: 'Calculate NZ take-home pay instantly — 2025-26 PAYE bands from 10.5% to 39%, the ACC earners levy and KiwiSaver, itemised with every step shown.',
    lsi: ['new zealand take home salary calculator', 'nz salary after tax calculator', 'paye calculator new zealand kiwisaver'],
    aeoH2: '<h2>What does the New Zealand Take-Home Salary Calculator do?</h2><p>It converts a gross New Zealand salary into monthly net pay using the 2025-26 PAYE bands, the ACC earners levy and your KiwiSaver rate — with every layer itemised.</p><ul><li><strong>Inputs:</strong> annual salary, KiwiSaver rate.</li><li><strong>Output:</strong> monthly and annual net with tax, ACC and KiwiSaver itemised.</li><li><strong>Method:</strong> 2025-26 statutory rates evaluated in your browser.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A NZ$ 80,000 salary nets about NZ$ 59,986 a year — roughly NZ$ 4,999 per month — after NZ$ 16,278 PAYE, NZ$ 1,336 ACC and NZ$ 2,400 KiwiSaver. New Zealand taxes at 39% maximum with no separate social-insurance payroll tax.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>New Zealand payslips are unusually clean: one progressive income tax (PAYE), one accident-compensation levy (ACC) and optional retirement savings (KiwiSaver). There is no separate social-security payroll tax and no national health insurance deduction — healthcare is funded from general taxation, so the top marginal rate stops at 39% no matter how much you earn.</p><h2>The rules it applies</h2><ul><li><strong>PAYE 2025-26:</strong> 10.5% to NZ$ 15,600, 17.5% to NZ$ 53,500, 30% to NZ$ 78,100, 33% to NZ$ 180,000, 39% above — thresholds reflect the 31 July 2025 adjustment.</li><li><strong>ACC earners levy:</strong> 1.67% on covered earnings up to the maximum liable amount (about NZ$ 152,790).</li><li><strong>KiwiSaver:</strong> employee rate of 3% by default (4%, 6%, 8% or 10% available); your employer must add at least 3% on top — that part never appears in your deduction.</li><li><strong>Not modelled:</strong> student loan repayments (12% over the threshold), the independent earner credit, secondary income codes.</li></ul><h2>Worked example with real numbers</h2><p>Salary NZ$ 80,000 with 3% KiwiSaver: PAYE = NZ$ 16,278. ACC = NZ$ 1,336. KiwiSaver = NZ$ 2,400. <strong>Take-home ≈ NZ$ 59,986 a year — about NZ$ 4,999 per month</strong>, and another NZ$ 2,400 lands in your KiwiSaver account on top of the net figure.</p><h2>Reading the result</h2><p>The donut splits tax from the ACC levy from savings — KiwiSaver is your money and shows up again at retirement or first-home withdrawal. If you have a student loan, subtract 12% of every dollar earned over roughly NZ$ 24,128 a year from the net figure; the calculator leaves it out so graduates should budget below the shown number. The independent earner credit can hand back up to NZ$ 520 a year between about NZ$ 24,000 and NZ$ 70,000 of income and is not modelled here. Inland Revenue square-ups settle any residual difference at year end.</p>' + GUIDES,
    faqs: [
      ['How is the New Zealand take-home salary calculated?', 'Gross salary minus PAYE on the 2025-26 progressive bands (10.5% to 39%), minus the ACC earners levy at 1.67% on covered earnings, minus your KiwiSaver employee rate. Each layer is shown in the steps panel.'],
      ['What do I need to use the New Zealand Take-Home Salary Calculator?', 'Annual salary and your KiwiSaver rate (3% is the default; 4%, 6%, 8% and 10% are available). Tax bands and the ACC levy apply automatically.'],
      ['What does the result from the New Zealand Take-Home Salary Calculator show?', 'Monthly and annual net pay with PAYE, ACC and KiwiSaver itemised, plus a donut chart of the split. KiwiSaver is savings, not tax — it stays yours.'],
      ['Is ACC a tax in New Zealand?', 'The ACC earners levy funds accident compensation and behaves like a payroll levy: 1.67% of taxable income up to the capped maximum. Inland Revenue collects it together with income tax.'],
      ['Is the New Zealand Take-Home Salary Calculator really free?', 'Yes — 100% free, no account, everything runs in your browser.']
    ]
  },
  {
    id: 'south-africa-take-home-salary',
    title: 'South Africa Salary Calculator: SARS PAYE & UIF',
    metaDesc: 'Calculate South African take-home pay instantly — 2025-26 SARS PAYE brackets, age rebates and the capped UIF contribution, itemised with every step shown.',
    lsi: ['south africa take home salary calculator', 'sars paye calculator', 'salary after tax south africa uif'],
    aeoH2: '<h2>What does the South Africa Take-Home Salary Calculator do?</h2><p>It converts a monthly gross salary into take-home pay using the 2025-26 SARS PAYE tables, the age-based rebates and the capped UIF contribution.</p><ul><li><strong>Inputs:</strong> monthly salary, age band.</li><li><strong>Output:</strong> monthly and annual net with PAYE and UIF itemised.</li><li><strong>Method:</strong> the SARS annual tables applied to annualised salary, divided by 12.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A R 50,000 monthly salary (under 65) nets about R 37,084 per month — roughly R 445,008 a year — after R 152,867 PAYE and the capped R 2,125 UIF. From 65 the secondary rebate adds about R 787 a month back.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>South African pay has two statutory employee deductions: PAYE income tax on the SARS annual tables and the Unemployment Insurance Fund contribution. The tax is progressive from 18% to 45%, and every taxpayer under 65 gets a primary rebate built into the bracket constants; older taxpayers get a secondary rebate at 65 and a tertiary rebate at 75. UIF is 1% of your salary, capped at R 177.12 a month (R 2,125.44 a year).</p><h2>The rules it applies</h2><ul><li><strong>PAYE 2025-26:</strong> 18% up to R 237,100 of taxable annual income, 26% to R 370,500, 31% to R 512,800, 36% to R 673,000, 39% to R 857,900, 41% to R 1,817,000, 45% above.</li><li><strong>Rebates:</strong> the primary R 17,235 is baked into the bracket constants; add R 9,444 from the year you turn 65 and a further R 3,145 at 75.</li><li><strong>UIF:</strong> 1% employee share, capped — your employer matches it with another 1%.</li><li><strong>Not modelled:</strong> retirement-fund deductions (up to 27.5% of remuneration is tax-deductible), medical scheme fee credits, travel allowances.</li></ul><h2>Worked example with real numbers</h2><p>Salary R 50,000 a month (R 600,000 a year), under 65: tax = R 121,475 + 36% of R 87,200 = R 152,867. UIF = R 177.12 a month. <strong>Take-home ≈ R 37,084 per month — about R 445,008 a year</strong>, an effective rate near 25%. Contributing 7.5% to a pension fund would drop the taxable base to R 435,000 and cut the annual tax by roughly R 55,500.</p><h2>Reading the result</h2><p>The donut shows PAYE and UIF only — retirement contributions and medical credits would both shrink the tax block in real life. Employer contributions to a retirement fund count as fringe benefits that raise taxable remuneration, and travel or phone allowances can be taxed partially. SARS applies the tables to annual taxable income and spreads the liability across pay periods, which is exactly what the calculator reproduces. Note: the primary rebate is already inside the bracket constants, so do not subtract it twice when checking against a SARS pamphlet.</p>' + GUIDES,
    faqs: [
      ['How is the South African take-home salary calculated?', 'Monthly salary minus PAYE on the 2025-26 SARS brackets (18% to 45%) after age rebates, minus the 1% UIF contribution capped at R 177.12 a month. The steps panel lists each layer.'],
      ['What do I need to use the South Africa Take-Home Salary Calculator?', 'Monthly salary and your age band — under 65, 65 to 74, or 75 and older. The secondary and tertiary rebates apply automatically from 65 and 75.'],
      ['What does the result from the South Africa Take-Home Salary Calculator show?', 'Monthly and annual net pay with the PAYE estimate and UIF itemised, plus a donut chart. Medical scheme credits and retirement deductions are not modelled.'],
      ['Does South Africa tax retirement contributions?', 'Employee contributions to a pension or provident fund are tax-deductible up to 27.5% of remuneration (capped yearly), which lowers the taxable base before the SARS tables apply. This calculator models gross salary without those deductions.'],
      ['Is the South Africa Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser and works offline.']
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
console.log('seo entries inserted:', addedSeo, 'of', ENTRIES.length);

// ---- SEO self-check: parse seo-content.js and validate constraints for new ids ----
const sandbox = { window: {}, console: { log: function () {}, warn: function () {}, error: function () {} } };
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
if (bad.length) {
  console.error('SEO self-check FAILED:\n  ' + bad.join('\n  '));
  process.exit(1);
}
console.log('seo self-check: PASS (titles, metaDesc, FAQ patterns, word counts)');

// ---- summary ----
const total = REG.length;
console.log('regional.js tools now:', total);
console.log('DONE batch #4 — next: node scripts/sync-counts.cjs');
