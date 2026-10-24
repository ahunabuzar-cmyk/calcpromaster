#!/usr/bin/env node
// Regional batch #5 — 5 new genuine take-home / income-tax tools for large,
// under-served search markets that the site did not yet cover:
//   kenya-take-home-salary, nigeria-take-home-salary, philippines-take-home-salary,
//   bangladesh-income-tax, egypt-take-home-salary
// Every rate is taken from PwC Worldwide Tax Summaries and the national revenue
// authorities (KRA, NRS/SARS-equivalent, BIR, NBR, ETA) and stated in the page copy.
// Runs BOTH parts, idempotent:
//   1. tool blocks  → js/data/regional.js (before the closing "];")
//   2. SEO entries  → js/seo-content.js (before the first existing entry)
// ESCAPING SAFETY: NO literal "$" followed by a digit, NO literal backslash and
// NO apostrophes in the content strings. Currency symbols are built inline via
// String.fromCharCode so fn.toString() stays self-contained.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const D = String.fromCharCode(36);      // dollar
const B = String.fromCharCode(92);      // backslash
const Q39 = String.fromCharCode(39);    // single quote
const EUR = String.fromCharCode(8364);  // euro
const KES = 'KSh ';
const NGN = String.fromCharCode(8358);  // naira
const PHP = String.fromCharCode(8369);  // peso
const BDT = String.fromCharCode(2547);  // taka
const EGP = 'EGP ';

// ============================ 1. TOOLS ============================
const TOOLS = [
  {
    id: 'kenya-take-home-salary',
    name: 'Kenya Take-Home Salary Calculator',
    desc: 'Free Kenya net salary calculator: PAYE after personal relief, NSSF tier I and II, SHIF and the Affordable Housing Levy, 2025 rates, every step shown.',
    kw: 'kenya take home salary calculator, paye calculator kenya, net salary kenya nssf shif housing levy',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (KES)', type: 'number', def: 100000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var nssf = 0.06 * 8000 + 0.06 * Math.min(Math.max(s - 8000, 0), 100000);
      var shif = s * 0.0275;
      var ahl = s * 0.015;
      var taxable = s - nssf - shif - ahl;
      var paye = Math.min(taxable, 24000) * 0.10 + Math.min(Math.max(taxable - 24000, 0), 8333) * 0.25 + Math.max(taxable - 32333, 0) * 0.30;
      paye = Math.max(0, paye - 2400);
      var net = s - nssf - shif - ahl - paye;
      return {
        result: 'Take-home: KSh ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([paye, nssf, shif + ahl, net], ['PAYE', 'NSSF', 'SHIF + Housing Levy', 'Take-home']),
        extra: 'PAYE: KSh ' + paye.toFixed(0) + ' | NSSF: KSh ' + nssf.toFixed(0) + ' | SHIF: KSh ' + shif.toFixed(0) + ' | Housing Levy: KSh ' + ahl.toFixed(0) + ' | Taxable: KSh ' + taxable.toFixed(0) + ' | 2025 rates'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var nssf = 0.06 * 8000 + 0.06 * Math.min(Math.max(s - 8000, 0), 100000);
      var shif = s * 0.0275;
      var ahl = s * 0.015;
      var taxable = s - nssf - shif - ahl;
      var paye = Math.max(0, Math.min(taxable, 24000) * 0.10 + Math.min(Math.max(taxable - 24000, 0), 8333) * 0.25 + Math.max(taxable - 32333, 0) * 0.30 - 2400);
      return [
        'Step 1: NSSF = 6% of the first KSh 8,000 + 6% of pay up to KSh 108,000 = KSh ' + nssf.toFixed(0),
        'Step 2: SHIF = 2.75% of gross = KSh ' + shif.toFixed(0) + '; Affordable Housing Levy = 1.5% = KSh ' + ahl.toFixed(0),
        'Step 3: Taxable pay = KSh ' + s.toFixed(0) + ' less NSSF, SHIF and levy = KSh ' + taxable.toFixed(0),
        'Step 4: PAYE bands = 10% on the first KSh 24,000, 25% on the next KSh 8,333, 30% above',
        'Step 5: Less personal relief of KSh 2,400 a month = PAYE KSh ' + paye.toFixed(0),
        'Step 6: Take-home = gross less NSSF, SHIF, levy and PAYE'
      ];
    }
  },
  {
    id: 'nigeria-take-home-salary',
    name: 'Nigeria Take-Home Salary Calculator',
    desc: 'Free Nigeria net salary calculator: PAYE on the Nigeria Tax Act 2025 bands with the 8% pension deduction, every step shown.',
    kw: 'nigeria take home salary calculator, paye calculator nigeria, net salary nigeria pension',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (NGN)', type: 'number', def: 500000 }
    ],
    calc: function (v) {
      var annual = v.salary * 12;
      var pension = annual * 0.08;
      var ti = annual - pension;
      var tax = Math.min(ti, 800000) * 0.00
        + Math.min(Math.max(ti - 800000, 0), 2200000) * 0.15
        + Math.min(Math.max(ti - 3000000, 0), 9000000) * 0.18
        + Math.min(Math.max(ti - 12000000, 0), 13000000) * 0.21
        + Math.min(Math.max(ti - 25000000, 0), 25000000) * 0.23
        + Math.max(ti - 50000000, 0) * 0.25;
      var net = v.salary - pension / 12 - tax / 12;
      return {
        result: 'Take-home: NGN ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax / 12, pension / 12, net], ['PAYE', 'Pension (8%)', 'Take-home']),
        extra: 'PAYE: NGN ' + tax.toFixed(0) + '/yr | Pension: NGN ' + pension.toFixed(0) + '/yr | Taxable: NGN ' + ti.toFixed(0) + '/yr | Effective rate: ' + (tax / annual * 100).toFixed(1) + '% | Nigeria Tax Act 2025'
      };
    },
    steps: function (v) {
      var annual = v.salary * 12;
      var pension = annual * 0.08;
      var ti = annual - pension;
      var tax = Math.min(ti, 800000) * 0.00 + Math.min(Math.max(ti - 800000, 0), 2200000) * 0.15 + Math.min(Math.max(ti - 3000000, 0), 9000000) * 0.18 + Math.min(Math.max(ti - 12000000, 0), 13000000) * 0.21 + Math.min(Math.max(ti - 25000000, 0), 25000000) * 0.23 + Math.max(ti - 50000000, 0) * 0.25;
      return [
        'Step 1: Annualise salary = NGN ' + v.salary + ' x 12 = NGN ' + annual.toLocaleString(),
        'Step 2: Pension = 8% of annual = NGN ' + pension.toFixed(0),
        'Step 3: Taxable income = NGN ' + ti.toFixed(0) + ' (the old Consolidated Relief Allowance no longer applies)',
        'Step 4: Nigeria Tax Act 2025 bands = 0% on the first NGN 800,000, 15% to NGN 3m, 18% to NGN 12m, 21% to NGN 25m, 23% to NGN 50m, 25% above',
        'Step 5: PAYE = NGN ' + tax.toFixed(0) + ' a year (NGN ' + (tax / 12).toFixed(0) + ' a month)',
        'Step 6: Take-home = gross less pension and PAYE'
      ];
    }
  },
  {
    id: 'philippines-take-home-salary',
    name: 'Philippines Take-Home Salary Calculator',
    desc: 'Free Philippines net pay calculator: BIR income tax after SSS, PhilHealth and Pag-IBIG deductions, 2025 contribution tables, every step shown.',
    kw: 'philippines take home salary calculator, bir income tax calculator philippines, net pay sss philhealth pagibig',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (PHP)', type: 'number', def: 50000 }
    ],
    calc: function (v) {
      var m = v.salary;
      var sss = Math.min(m, 35000) * 0.05;
      var ph = Math.min(m, 100000) * 0.025;
      var pi = Math.min(m, 10000) * 0.02;
      var ti = m - sss - ph - pi;
      var at = ti * 12;
      var tax = at <= 250000 ? 0
        : at <= 400000 ? (at - 250000) * 0.15
        : at <= 800000 ? 22500 + (at - 400000) * 0.20
        : at <= 2000000 ? 102500 + (at - 800000) * 0.25
        : at <= 8000000 ? 402500 + (at - 2000000) * 0.30
        : 2202500 + (at - 8000000) * 0.35;
      var net = m - sss - ph - pi - tax / 12;
      return {
        result: 'Take-home: PHP ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax / 12, sss, ph + pi, net], ['BIR tax', 'SSS', 'PhilHealth + Pag-IBIG', 'Take-home']),
        extra: 'SSS: PHP ' + sss.toFixed(0) + ' | PhilHealth: PHP ' + ph.toFixed(0) + ' | Pag-IBIG: PHP ' + pi.toFixed(0) + ' | Annual tax: PHP ' + tax.toFixed(0) + ' | Taxable: PHP ' + ti.toFixed(0) + '/mo | 2025 tables'
      };
    },
    steps: function (v) {
      var m = v.salary;
      var sss = Math.min(m, 35000) * 0.05;
      var ph = Math.min(m, 100000) * 0.025;
      var pi = Math.min(m, 10000) * 0.02;
      var ti = m - sss - ph - pi;
      var at = ti * 12;
      var tax = at <= 250000 ? 0 : at <= 400000 ? (at - 250000) * 0.15 : at <= 800000 ? 22500 + (at - 400000) * 0.20 : at <= 2000000 ? 102500 + (at - 800000) * 0.25 : at <= 8000000 ? 402500 + (at - 2000000) * 0.30 : 2202500 + (at - 8000000) * 0.35;
      return [
        'Step 1: SSS = 5% of salary up to the PHP 35,000 monthly salary credit = PHP ' + sss.toFixed(0),
        'Step 2: PhilHealth = 2.5% employee share = PHP ' + ph.toFixed(0) + '; Pag-IBIG = 2% up to PHP 10,000 = PHP ' + pi.toFixed(0),
        'Step 3: Taxable pay = PHP ' + m.toFixed(0) + ' less the three contributions = PHP ' + ti.toFixed(0) + ' a month',
        'Step 4: Annualise = PHP ' + at.toFixed(0) + ' and apply the BIR table: 0% to PHP 250,000, 15% to PHP 400,000, 20% to PHP 800,000, 25% to PHP 2m, 30% to PHP 8m, 35% above',
        'Step 5: Annual tax = PHP ' + tax.toFixed(0) + ' (PHP ' + (tax / 12).toFixed(0) + ' a month)',
        'Step 6: Take-home = gross less SSS, PhilHealth, Pag-IBIG and monthly tax'
      ];
    }
  },
  {
    id: 'bangladesh-income-tax',
    name: 'Bangladesh Income Tax Calculator',
    desc: 'Free Bangladesh income tax calculator: FY 2025-26 individual slabs with the tax-free threshold and minimum tax, every step shown.',
    kw: 'bangladesh income tax calculator, nbr tax calculator 2025-26, income tax slab bangladesh',
    inputs: [
      { id: 'income', label: 'Annual Income (BDT)', type: 'number', def: 1200000 },
      { id: 'category', label: 'Taxpayer Category', type: 'select', options: ['General', 'Woman or senior 65+', 'Physically challenged', 'War-wounded freedom fighter'], def: 'General' }
    ],
    calc: function (v) {
      var exempt = v.category === 'Woman or senior 65+' ? 450000 : v.category === 'Physically challenged' ? 525000 : v.category === 'War-wounded freedom fighter' ? 550000 : 400000;
      var b = Math.max(0, v.income - exempt);
      var tax = Math.min(b, 300000) * 0.10
        + Math.min(Math.max(b - 300000, 0), 400000) * 0.15
        + Math.min(Math.max(b - 700000, 0), 500000) * 0.20
        + Math.min(Math.max(b - 1200000, 0), 2000000) * 0.25
        + Math.max(b - 3200000, 0) * 0.30;
      if (v.income > exempt) tax = Math.max(tax, 5000);
      return {
        result: 'Tax: BDT ' + tax.toFixed(0) + '/yr',
        chart: Charts.bar([v.income - tax, tax], ['Net income', 'Tax']),
        extra: 'Tax-free threshold: BDT ' + exempt.toLocaleString() + ' | Taxable: BDT ' + b.toLocaleString() + ' | Effective rate: ' + (tax / v.income * 100).toFixed(1) + '% | Minimum tax BDT 5,000 applies above the threshold | FY 2025-26 slabs'
      };
    },
    steps: function (v) {
      var exempt = v.category === 'Woman or senior 65+' ? 450000 : v.category === 'Physically challenged' ? 525000 : v.category === 'War-wounded freedom fighter' ? 550000 : 400000;
      var b = Math.max(0, v.income - exempt);
      var tax = Math.min(b, 300000) * 0.10 + Math.min(Math.max(b - 300000, 0), 400000) * 0.15 + Math.min(Math.max(b - 700000, 0), 500000) * 0.20 + Math.min(Math.max(b - 1200000, 0), 2000000) * 0.25 + Math.max(b - 3200000, 0) * 0.30;
      if (v.income > exempt) tax = Math.max(tax, 5000);
      return [
        'Step 1: Tax-free threshold for ' + v.category + ' = BDT ' + exempt.toLocaleString(),
        'Step 2: Taxable income = BDT ' + v.income.toLocaleString() + ' less the threshold = BDT ' + b.toLocaleString(),
        'Step 3: FY 2025-26 slabs = 10% on the first BDT 300,000, 15% on the next 400,000, 20% on the next 500,000, 25% on the next 2m, 30% above',
        'Step 4: Slab tax = BDT ' + tax.toFixed(0),
        'Step 5: Minimum tax of BDT 5,000 applies whenever income exceeds the threshold',
        'Step 6: Investment rebate (up to 10% of eligible investment) is not modelled here'
      ];
    }
  },
  {
    id: 'egypt-take-home-salary',
    name: 'Egypt Take-Home Salary Calculator',
    desc: 'Free Egypt net salary calculator: salary tax after the annual exemption and 11% social insurance, 2025-26 brackets, every step shown.',
    kw: 'egypt take home salary calculator, egypt income tax calculator, net salary egypt social insurance',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (EGP)', type: 'number', def: 30000 }
    ],
    calc: function (v) {
      var ann = v.salary * 12;
      var si = Math.min(v.salary, 16700) * 0.11;
      var ti = Math.max(0, ann - 20000 - si * 12);
      var tax = Math.min(ti, 40000) * 0
        + Math.min(Math.max(ti - 40000, 0), 15000) * 0.10
        + Math.min(Math.max(ti - 55000, 0), 15000) * 0.15
        + Math.min(Math.max(ti - 70000, 0), 130000) * 0.20
        + Math.min(Math.max(ti - 200000, 0), 200000) * 0.225
        + Math.min(Math.max(ti - 400000, 0), 800000) * 0.25
        + Math.max(ti - 1200000, 0) * 0.275;
      var net = v.salary - si - tax / 12;
      return {
        result: 'Take-home: EGP ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax / 12, si, net], ['Salary tax', 'Social insurance (11%)', 'Take-home']),
        extra: 'Social insurance: EGP ' + si.toFixed(0) + '/mo (capped at EGP 16,700 wage) | Taxable: EGP ' + ti.toFixed(0) + '/yr | Tax: EGP ' + tax.toFixed(0) + '/yr | EGP 20,000 annual exemption applied'
      };
    },
    steps: function (v) {
      var ann = v.salary * 12;
      var si = Math.min(v.salary, 16700) * 0.11;
      var ti = Math.max(0, ann - 20000 - si * 12);
      var tax = Math.min(ti, 40000) * 0 + Math.min(Math.max(ti - 40000, 0), 15000) * 0.10 + Math.min(Math.max(ti - 55000, 0), 15000) * 0.15 + Math.min(Math.max(ti - 70000, 0), 130000) * 0.20 + Math.min(Math.max(ti - 200000, 0), 200000) * 0.225 + Math.min(Math.max(ti - 400000, 0), 800000) * 0.25 + Math.max(ti - 1200000, 0) * 0.275;
      return [
        'Step 1: Annualise salary = EGP ' + v.salary + ' x 12 = EGP ' + ann.toLocaleString(),
        'Step 2: Social insurance = 11% of the insured wage, capped at EGP 16,700 a month = EGP ' + si.toFixed(0) + '/mo',
        'Step 3: Less the annual salary exemption of EGP 20,000 and the social insurance paid',
        'Step 4: Taxable income = EGP ' + ti.toFixed(0),
        'Step 5: Brackets = 0% to EGP 40,000, 10% to 55,000, 15% to 70,000, 20% to 200,000, 22.5% to 400,000, 25% to 1.2m, 27.5% above',
        'Step 6: Take-home = gross less social insurance and monthly salary tax'
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

// ---- tools self-check ----
const sb2 = { window: {}, Charts: { donut: function () { return {}; }, bar: function () { return {}; }, gauge: function () { return {}; } }, console: { log: function () {}, warn: function () {}, error: function () {} } };
vm.createContext(sb2);
vm.runInContext(tsrc, sb2);
const REG = sb2.window.REGIONAL_TOOLS;
const EXPECTED = [
  ['kenya-take-home-salary', { salary: 100000 }, 'Take-home: KSh 70442/mo'],
  ['nigeria-take-home-salary', { salary: 500000 }, 'Take-home: NGN 394700/mo'],
  ['philippines-take-home-salary', { salary: 50000 }, 'Take-home: PHP 42232/mo'],
  ['bangladesh-income-tax', { income: 1200000, category: 'General' }, 'Tax: BDT 110000/yr'],
  ['egypt-take-home-salary', { salary: 30000 }, 'Take-home: EGP 23472/mo']
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
console.log('tool self-check:', badTools.length ? badTools.join('; ') : 'PASS (5 tools, exact expected values)');

// ============================ 2. SEO ENTRIES ============================
const GUIDES = '<h2>From Our Guides Library</h2><ul>' +
  '<li><a href="/guides/tax-salary/">how salary tax is calculated</a></li>' +
  '<li><a href="/guides/salary/">salary structures explained</a></li>' +
  '<li><a href="/guides/currency-conversion/">currency conversion, fees included</a></li>' +
  '</ul>';

const ENTRIES = [
  {
    id: 'kenya-take-home-salary',
    title: 'Kenya Net Salary Calculator: PAYE, NSSF, SHIF',
    metaDesc: 'Calculate Kenyan take-home pay instantly — 2025 PAYE bands, the KES 2,400 personal relief, NSSF tiers, SHIF at 2.75% and the 1.5% housing levy, itemised.',
    lsi: ['kenya take home salary calculator', 'paye calculator kenya', 'net salary kenya after tax'],
    aeoH2: '<h2>What does the Kenya Take-Home Salary Calculator do?</h2><p>It turns a gross Kenyan monthly salary into take-home pay by applying PAYE on the 2025 graduated bands, the KES 2,400 monthly personal relief, the NSSF tier I and tier II contributions, SHIF at 2.75% and the Affordable Housing Levy at 1.5%.</p><ul><li><strong>Inputs:</strong> gross monthly salary.</li><li><strong>Output:</strong> net pay with PAYE, NSSF, SHIF and the levy itemised.</li><li><strong>Method:</strong> 2025 statutory rates, evaluated in your browser.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A KES 100,000 monthly salary nets about <strong>KES 70,442</strong> after PAYE of KES 19,308, NSSF of KES 6,000, SHIF of KES 2,750 and the housing levy of KES 1,500. Taxable pay lands at KES 89,750 because the SHIF and levy are now deductible before PAYE.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>A Kenyan payslip stacks four separate deductions on top of income tax, and each one is calculated on a different base. PAYE is progressive on taxable pay. NSSF is a flat 6% split across two tiers. SHIF funds healthcare. The Affordable Housing Levy funds housing. Because SHIF and the housing levy are deductible, the order of the calculation matters as much as the rates.</p><h2>The rules it applies</h2><ul><li><strong>PAYE 2025:</strong> 10% on the first KES 24,000 of monthly taxable pay, 25% on the next KES 8,333, 30% above — then minus the KES 2,400 personal relief.</li><li><strong>NSSF:</strong> 6% of the first KES 8,000 (tier I) plus 6% of pay between KES 8,000 and the KES 108,000 upper earnings limit (tier II).</li><li><strong>SHIF:</strong> 2.75% of gross monthly salary, with a minimum contribution.</li><li><strong>Affordable Housing Levy:</strong> 1.5% of gross monthly salary.</li><li><strong>Not modelled:</strong> pension contributions beyond NSSF, insurance relief, disability exemptions.</li></ul><h2>Worked example with real numbers</h2><p>Gross KES 100,000: NSSF = KES 480 + KES 5,520 = KES 6,000. SHIF = KES 2,750. Housing levy = KES 1,500. Taxable pay = 100,000 - 6,000 - 2,750 - 1,500 = KES 89,750. PAYE = 2,400 + 2,083 + 17,225 = KES 21,708, less the KES 2,400 relief = <strong>KES 19,308</strong>. <strong>Take-home = KES 70,442 a month</strong>, an effective deduction rate near 30%.</p><h2>Reading the result</h2><p>The donut splits PAYE from the three statutory funds, because only PAYE is tax — NSSF, SHIF and the levy buy you a pension and healthcare access. A pay rise is taxed at the top marginal rate of 30%, so the next KES 10,000 of gross is worth roughly KES 6,750 in your pocket. Note that reliefs are now limited to the personal relief alone: the former SHIF and insurance reliefs were withdrawn, which is why net pay fell for many employees in late 2024 even without a rate change.</p>' + GUIDES,
    faqs: [
      ['How is the Kenya take-home salary calculated?', 'Gross salary minus NSSF (6% across two tiers), minus SHIF at 2.75%, minus the 1.5% Affordable Housing Levy, then PAYE on the remaining taxable pay using the 10%, 25% and 30% bands, less the KES 2,400 personal relief. The steps panel lists each layer.'],
      ['What do I need to use the Kenya Take-Home Salary Calculator?', 'Only your gross monthly salary. Bands, NSSF tiers, the SHIF rate, the housing levy and the personal relief are all built in for 2025.'],
      ['What does the result from the Kenya Take-Home Salary Calculator show?', 'Monthly take-home with PAYE, NSSF, SHIF and the housing levy itemised, plus a donut chart of how the gross divides.'],
      ['Why is my Kenyan payslip different from the calculator?', 'Additional pension contributions, insurance relief, benefits in kind, and an employer-specific NSSF tier II treatment all shift the number. The calculator models the standard employee case with the statutory rates.'],
      ['Is the Kenya Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser and it works offline after the first load.']
    ]
  },
  {
    id: 'nigeria-take-home-salary',
    title: 'Nigeria Net Salary Calculator: PAYE & Pension',
    metaDesc: 'Calculate Nigerian take-home pay instantly — Nigeria Tax Act 2025 bands from 0% to 25%, the 8% pension deduction and the NGN 800,000 tax-free band, itemised.',
    lsi: ['nigeria take home salary calculator', 'paye calculator nigeria', 'net salary nigeria after tax'],
    aeoH2: '<h2>What does the Nigeria Take-Home Salary Calculator do?</h2><p>It converts a gross Nigerian monthly salary into take-home pay using the Nigeria Tax Act 2025 graduated bands, the new NGN 800,000 tax-free first band and the 8% employee pension contribution.</p><ul><li><strong>Inputs:</strong> gross monthly salary.</li><li><strong>Output:</strong> net pay with PAYE and pension itemised.</li><li><strong>Method:</strong> the Nigeria Tax Act 2025 bands, evaluated in your browser.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A NGN 500,000 monthly salary nets about <strong>NGN 394,700</strong> after pension of NGN 40,000 a month and PAYE of about NGN 65,300 a month. The first NGN 800,000 of annual income is now tax-free, so the effective tax rate is only about 13%.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Nigeria rewrote personal income tax on 1 January 2026. The old Consolidated Relief Allowance — which could shelter around 21% of income — was abolished and replaced by a much wider zero-rate band and a simpler set of rates capped at 25%. The practical effect for most employees is that the deduction depends far more on the pension contribution and the size of the salary than on reliefs.</p><h2>The rules it applies</h2><ul><li><strong>Pension:</strong> 8% of gross annual emoluments contributed by the employee (the employer adds 10% on top, which never appears as a deduction).</li><li><strong>PAYE bands 2026:</strong> 0% on the first NGN 800,000, 15% on the next NGN 2.2m, 18% on the next NGN 9m, 21% on the next NGN 13m, 23% on the next NGN 25m, 25% above NGN 50m.</li><li><strong>Minimum wage:</strong> employees earning no more than the NGN 70,000 national minimum wage are not liable for PAYE at all.</li><li><strong>Not modelled:</strong> the rent relief, life-insurance relief, and any other allowable deductions.</li></ul><h2>Worked example with real numbers</h2><p>Gross NGN 500,000 a month = NGN 6,000,000 a year. Pension = 8% = NGN 480,000. Taxable income = NGN 5,520,000. PAYE = 0% on the first 800,000, then 15% on 2.2m (NGN 330,000) and 18% on the remaining 2.52m (NGN 453,600) = <strong>NGN 783,600 a year, about NGN 65,300 a month</strong>. <strong>Take-home = NGN 394,700 a month</strong>.</p><h2>Reading the result</h2><p>The donut separates PAYE from the pension contribution — the pension is not lost money, it funds your retirement account, so the real cost of the deduction is lower than it looks. Because the zero-rate band is large, low and middle earners see the biggest proportional gain from the 2026 reform. Note that a state may still levy its own development levy on top of federal PAYE, and that bonuses and allowances are taxable unless they fall within a specific exemption.</p>' + GUIDES,
    faqs: [
      ['How is the Nigeria take-home salary calculated?', 'Gross salary minus the 8% employee pension contribution, then PAYE on the Nigeria Tax Act 2025 bands (0% to NGN 800,000, then 15%, 18%, 21%, 23% and 25%). The steps panel shows each band in order.'],
      ['What do I need to use the Nigeria Take-Home Salary Calculator?', 'Just your gross monthly salary. The pension rate and the 2026 tax bands are built in.'],
      ['What does the result from the Nigeria Take-Home Salary Calculator show?', 'Monthly take-home with the pension deduction and PAYE itemised, plus a donut chart of how the gross divides and the effective tax rate.'],
      ['Does the Consolidated Relief Allowance still apply in Nigeria?', 'No. The Nigeria Tax Act 2025 abolished the Consolidated Relief Allowance and replaced it with a much wider zero-rate band — the first NGN 800,000 of annual income is now tax-free.'],
      ['Is the Nigeria Take-Home Salary Calculator really free?', 'Yes — 100% free, no account, everything runs in your browser.']
    ]
  },
  {
    id: 'philippines-take-home-salary',
    title: 'Philippines Net Pay Calculator: BIR, SSS, PhilHealth',
    metaDesc: 'Calculate Philippine take-home pay instantly — BIR 2025 brackets, SSS at 5%, PhilHealth at 2.5% and Pag-IBIG at 2%, each with its salary credit cap, itemised.',
    lsi: ['philippines take home salary calculator', 'bir income tax calculator', 'net pay philippines sss philhealth pagibig'],
    aeoH2: '<h2>What does the Philippines Take-Home Salary Calculator do?</h2><p>It converts a gross Philippine monthly salary into net pay by deducting SSS, PhilHealth and Pag-IBIG at their 2025 rates, then applying the BIR graduated income tax table to the remainder.</p><ul><li><strong>Inputs:</strong> gross monthly salary.</li><li><strong>Output:</strong> net pay with each contribution and the BIR tax itemised.</li><li><strong>Method:</strong> 2025 contribution tables and the BIR compensation table.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A PHP 50,000 monthly salary nets about <strong>PHP 42,232</strong> after SSS of PHP 1,750, PhilHealth of PHP 1,250, Pag-IBIG of PHP 200 and BIR tax of about PHP 4,568 a month. The three contributions cut taxable pay to PHP 46,800 before tax is applied.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>A Philippine payslip has three mandatory contributions before income tax even starts, and each has its own salary cap. SSS is charged on the monthly salary credit, PhilHealth on the monthly basic salary, and Pag-IBIG on a much lower ceiling. Only after those three are subtracted does the BIR table apply — and because they are employee contributions, they legitimately reduce taxable compensation.</p><h2>The rules it applies</h2><ul><li><strong>SSS:</strong> 5% employee share of the monthly salary credit, capped at the PHP 35,000 maximum MSC.</li><li><strong>PhilHealth:</strong> 2.5% employee share of monthly basic salary, with a floor and a PHP 100,000 ceiling.</li><li><strong>Pag-IBIG:</strong> 2% of monthly compensation, capped at a PHP 10,000 base, so PHP 200 a month for higher earners.</li><li><strong>BIR tax:</strong> 0% up to PHP 250,000 of annual taxable income, then 15% to 400,000, 20% to 800,000, 25% to 2m, 30% to 8m, 35% above.</li><li><strong>Not modelled:</strong> the 13th-month pay exemption, de minimis benefits, and dependant reductions.</li></ul><h2>Worked example with real numbers</h2><p>Gross PHP 50,000: SSS = 5% of 35,000 = PHP 1,750. PhilHealth = 2.5% of 50,000 = PHP 1,250. Pag-IBIG = 2% of 10,000 = PHP 200. Taxable pay = PHP 46,800 a month, or PHP 561,600 a year. BIR tax = 22,500 + 20% of the excess over 400,000 = PHP 54,820 a year, about PHP 4,568 a month. <strong>Take-home = PHP 42,232 a month</strong>.</p><h2>Reading the result</h2><p>The donut shows the tax next to the three contributions so you can see that most of the deduction is not tax at all — SSS, PhilHealth and Pag-IBIG all buy benefits you will draw on later. Self-employed taxpayers and professionals with gross receipts under the VAT threshold may instead elect the 8% flat tax on receipts above PHP 250,000, which this calculator does not model because it is designed for compensation income. Your 13th-month pay is exempt up to PHP 90,000 and is not included in the gross figure here.</p>' + GUIDES,
    faqs: [
      ['How is the Philippines take-home salary calculated?', 'Gross salary minus SSS at 5% of the monthly salary credit (capped at PHP 35,000), minus PhilHealth at 2.5% (capped at PHP 100,000), minus Pag-IBIG at 2% (capped at a PHP 10,000 base), then the BIR graduated table on the annualised remainder.'],
      ['What do I need to use the Philippines Take-Home Salary Calculator?', 'Only your gross monthly salary. The 2025 SSS, PhilHealth and Pag-IBIG tables and the BIR tax brackets are all built in.'],
      ['What does the result from the Philippines Take-Home Salary Calculator show?', 'Monthly take-home with SSS, PhilHealth, Pag-IBIG and BIR tax itemised, plus a donut chart of the deduction split.'],
      ['Can I use the 8% flat tax instead in the Philippines?', 'Only if you are self-employed or a professional with gross receipts below the VAT threshold — the 8% option replaces both the graduated income tax and the percentage tax. This calculator models compensation income, where the graduated table applies.'],
      ['Is the Philippines Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser and works offline.']
    ]
  },
  {
    id: 'bangladesh-income-tax',
    title: 'Bangladesh Income Tax Calculator FY 2025-26',
    metaDesc: 'Calculate Bangladesh income tax instantly — FY 2025-26 individual slabs from 10% to 30%, the BDT 400,000 threshold and the BDT 5,000 minimum tax, itemised.',
    lsi: ['bangladesh income tax calculator', 'nbr tax calculator 2025-26', 'income tax slab bangladesh'],
    aeoH2: '<h2>What does the Bangladesh Income Tax Calculator do?</h2><p>It computes an individual income tax liability under the FY 2025-26 slabs, starting from the correct tax-free threshold for the taxpayer category and applying the BDT 5,000 minimum tax where required.</p><ul><li><strong>Inputs:</strong> annual income and taxpayer category.</li><li><strong>Output:</strong> annual tax, taxable income and effective rate.</li><li><strong>Method:</strong> the NBR FY 2025-26 individual slabs.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>On BDT 1,200,000 of annual income as a general taxpayer, tax is <strong>BDT 110,000</strong> — an effective rate of 9.2%. The first BDT 400,000 is tax-free, then 10% applies to the next 300,000 and 15% to the remaining 500,000.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Bangladesh taxes individuals on a set of graduated slabs, but the starting point — the tax-free threshold — depends on who you are. A general taxpayer gets BDT 400,000, a woman or a senior citizen aged 65 or over gets BDT 450,000, a person with physical challenges gets BDT 525,000, and a war-wounded gazetted freedom fighter gets BDT 550,000. Get that first number wrong and every subsequent slab is wrong too.</p><h2>The rules it applies</h2><ul><li><strong>FY 2025-26 slabs:</strong> 10% on the first BDT 300,000 of taxable income, 15% on the next 400,000, 20% on the next 500,000, 25% on the next 2m, and 30% on the rest.</li><li><strong>Tax-free thresholds:</strong> BDT 400,000 general, 450,000 for women and seniors 65+, 525,000 for persons with physical challenges, 550,000 for war-wounded freedom fighters.</li><li><strong>Minimum tax:</strong> BDT 5,000 applies whenever total income exceeds the threshold (BDT 1,000 for new taxpayers).</li><li><strong>Not modelled:</strong> the investment tax rebate (up to 10% of eligible investment, capped), surcharge on high net worth, and salary exemptions.</li></ul><h2>Worked example with real numbers</h2><p>Annual income BDT 1,200,000, general taxpayer: threshold BDT 400,000, so taxable income = BDT 800,000. Slab tax = 10% of 300,000 (30,000) + 15% of 400,000 (60,000) + 20% of 100,000 (20,000) = <strong>BDT 110,000</strong>. The effective rate on gross income is 9.2%, and the BDT 5,000 minimum tax does not bite because the slab tax is higher.</p><h2>Reading the result</h2><p>This is the tax before any investment rebate. Bangladesh allows a rebate on eligible investments — up to 10% of the eligible amount — which is subtracted from the tax payable, so a taxpayer who invests the maximum can cut the final bill substantially. The calculator deliberately shows the gross slab tax so you can see the starting point, then subtract your own rebate. Surcharge applies separately once net worth crosses BDT 40 million, and salary income enjoys its own exemption, so verify against your return before filing.</p>' + GUIDES,
    faqs: [
      ['How is the Bangladesh income tax calculated?', 'Start from the tax-free threshold for your taxpayer category, apply 10% to the first BDT 300,000 of the remainder, 15% to the next 400,000, 20% to the next 500,000, 25% to the next 2m and 30% above, then check the BDT 5,000 minimum tax.'],
      ['What do I need to use the Bangladesh Income Tax Calculator?', 'Your annual income and your taxpayer category — general, woman or senior 65+, physically challenged, or war-wounded freedom fighter. The thresholds and slabs are built in.'],
      ['What does the result from the Bangladesh Income Tax Calculator show?', 'Annual tax, taxable income after the threshold, and the effective rate on gross income, with a bar chart of net income against tax.'],
      ['What is the tax-free income limit in Bangladesh for FY 2025-26?', 'BDT 400,000 for general taxpayers, BDT 450,000 for women and senior citizens aged 65 or over, BDT 525,000 for persons with physical challenges and BDT 550,000 for war-wounded gazetted freedom fighters.'],
      ['Is the Bangladesh Income Tax Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser.']
    ]
  },
  {
    id: 'egypt-take-home-salary',
    title: 'Egypt Net Salary Calculator: Tax & Insurance',
    metaDesc: 'Calculate Egyptian take-home pay instantly — salary tax after the EGP 20,000 exemption, 11% social insurance and the 0% to 27.5% brackets, itemised.',
    lsi: ['egypt take home salary calculator', 'egypt income tax calculator', 'net salary egypt social insurance'],
    aeoH2: '<h2>What does the Egypt Take-Home Salary Calculator do?</h2><p>It converts a gross Egyptian monthly salary into take-home pay by deducting employee social insurance at 11%, applying the EGP 20,000 annual salary exemption, and charging salary tax on the 2025-26 brackets.</p><ul><li><strong>Inputs:</strong> gross monthly salary.</li><li><strong>Output:</strong> net pay with social insurance and salary tax itemised.</li><li><strong>Method:</strong> the Egyptian salary tax brackets and the 11% employee insurance rate.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>An EGP 30,000 monthly salary nets about <strong>EGP 23,472</strong> after social insurance of EGP 1,837 and salary tax of about EGP 4,691 a month. The insurance is capped at an insured wage of EGP 16,700, so higher salaries do not increase that deduction.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Egyptian payroll has two deductions: employee social insurance and salary tax. Social insurance is a flat percentage of the insured wage, but the insured wage is capped, so the deduction stops rising once salary passes the ceiling. Salary tax is progressive on annual taxable income after a fixed personal exemption and after the insurance paid. The interaction matters — a higher salary raises both, but the insurance contribution is itself deductible, which softens the tax.</p><h2>The rules it applies</h2><ul><li><strong>Social insurance:</strong> 11% employee share of the insured wage, with the insured wage capped at EGP 16,700 a month (the employer pays 18.75%).</li><li><strong>Personal exemption:</strong> EGP 20,000 a year for all taxpayers.</li><li><strong>Salary tax brackets:</strong> 0% to EGP 40,000 of taxable income, 10% to 55,000, 15% to 70,000, 20% to 200,000, 22.5% to 400,000, 25% to 1.2m, 27.5% above.</li><li><strong>Not modelled:</strong> the EGP 15,000 additional exemption for low earners, dependant allowances, and the education and health reliefs.</li></ul><h2>Worked example with real numbers</h2><p>Gross EGP 30,000 a month = EGP 360,000 a year. Social insurance = 11% of the capped EGP 16,700 = EGP 1,837 a month, EGP 22,044 a year. Taxable income = 360,000 - 20,000 - 22,044 = EGP 317,956. Salary tax = 10% of 15,000 (1,500) + 15% of 15,000 (2,250) + 20% of 130,000 (26,000) + 22.5% of 117,956 (26,540) = <strong>EGP 56,290 a year, about EGP 4,691 a month</strong>. <strong>Take-home = EGP 23,472 a month</strong>.</p><h2>Reading the result</h2><p>The donut separates the two deductions so you can see that social insurance stops growing at the cap while salary tax keeps climbing. That means the marginal cost of a raise is the top bracket rate only — there is no extra insurance on the excess. Because the insurance is deductible, employees at the cap get a modest double benefit. Note that the top rate of 27.5% only applies above EGP 1.2m of taxable income, so most salaried Egyptians sit between 10% and 22.5%. Confirm the current insured-wage ceiling each January, as it is revised annually.</p>' + GUIDES,
    faqs: [
      ['How is the Egypt take-home salary calculated?', 'Gross salary minus employee social insurance at 11% of the insured wage (capped at EGP 16,700 a month), then salary tax on annual taxable income after the EGP 20,000 personal exemption and the insurance paid, using the 0% to 27.5% brackets.'],
      ['What do I need to use the Egypt Take-Home Salary Calculator?', 'Only your gross monthly salary. The insurance rate, the insured-wage cap, the personal exemption and the tax brackets are all built in.'],
      ['What does the result from the Egypt Take-Home Salary Calculator show?', 'Monthly take-home with social insurance and salary tax itemised, plus a donut chart of the deduction split.'],
      ['Is social insurance in Egypt capped?', 'Yes. The employee pays 11% of the insured wage, and the insured wage is capped — once your salary passes the ceiling, the deduction stays flat. That is why the insurance line in the chart stops growing while salary tax keeps rising.'],
      ['Is the Egypt Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, everything runs in your browser.']
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

// ---- SEO self-check ----
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

console.log('regional.js tools now:', REG.length);
console.log('DONE batch #5 — next: node scripts/sync-counts.cjs && node scripts/split-seo.cjs');
