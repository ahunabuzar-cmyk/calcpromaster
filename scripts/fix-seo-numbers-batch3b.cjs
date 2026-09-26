#!/usr/bin/env node
// Batch-3b numeric alignment after the AU/HK formula fixes:
//  - AU SEO numbers were computed with the OLD threshold-shifted brackets
//  - HK SEO numbers used MPF 1,750 (uncapped) instead of the 1,500 cap
// Also corrects the AU contract formula description in qa-contracts.json.
// Idempotent: each replacement matches exactly once or is already applied.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const M = String.fromCharCode(8212); // — em dash (prose separator)
const MM = String.fromCharCode(8722); // − math minus (subtraction)
const APPROX = String.fromCharCode(8776); // ≈
const ARROW = String.fromCharCode(8594); // →

const SEO_FILE = path.join(ROOT, 'js', 'seo-content.js');
let s = fs.readFileSync(SEO_FILE, 'utf8');

const REPLACES = [
  // --- Australia (formula: tax 19,288 | take 73,812/yr | 6,151/mo) ---
  ['A$95,000 salary leaves about A$79,272 a year (roughly A$6,606 per month) after tax and Medicare',
   'A$95,000 salary leaves about A$73,812 a year (roughly A$6,151 per month) after tax and Medicare'],
  ['Salary A$95,000: taxable income is A$76,800; income tax is A$13,828; Medicare is A$1,900; annual take-home lands at <strong>about A$79,272 ' + M + ' roughly A$6,606 per month</strong> ' + M + ' plus A$10,925 super.',
   'Salary A$95,000: income tax is A$19,288 (first A$18,200 tax-free); Medicare is A$1,900; annual take-home lands at <strong>about A$73,812 ' + M + ' roughly A$6,151 per month</strong> ' + M + ' plus A$10,925 super.'],
  // --- Hong Kong (formula: MPF 1,500 | NCI 270,000 | tax 25,800 | take 31,385/mo | 376,620/yr) ---
  ['about HK31,135 per month after HK1,750 MPF and roughly HK2,115 estimated tax ' + M + ' about HK373,620 a year',
   'about HK31,385 per month after HK1,500 MPF and roughly HK2,115 estimated tax ' + M + ' about HK376,620 a year'],
  ['MPF = HK1,750; annual taxable = 420,000 ' + MM + ' 21,000 ' + MM + ' 132,000 = HK267,000; progressive tax ' + APPROX + ' HK25,380 ' + ARROW + ' <strong>take-home ' + APPROX + ' HK31,135 per month ' + M + ' about HK373,620 a year</strong>',
   'MPF = HK1,500; annual taxable = 420,000 ' + MM + ' 18,000 ' + MM + ' 132,000 = HK270,000; progressive tax ' + APPROX + ' HK25,800 ' + ARROW + ' <strong>take-home ' + APPROX + ' HK31,385 per month ' + M + ' about HK376,620 a year</strong>'],
];

let applied = 0, skipped = 0;
for (const [from, to] of REPLACES) {
  const n = s.split(from).length - 1;
  if (n === 1) { s = s.split(from).join(to); applied++; }
  else if (n === 0 && s.includes(to)) { skipped++; }
  else { console.error('UNEXPECTED match count ' + n + ' for: ' + from.slice(0, 70)); process.exit(1); }
}
fs.writeFileSync(SEO_FILE, s);
console.log('seo numbers fixed:', applied, '| already applied:', skipped);

// --- AU contract formula text ---
const QA_FILE = path.join(ROOT, 'docs', 'qa-contracts.json');
const qa = JSON.parse(fs.readFileSync(QA_FILE, 'utf8'));
const arr = Array.isArray(qa) ? qa : (qa.contracts || qa.calculators);
const au = arr.find(x => x.calculatorId === 'australia-take-home-salary');
if (au) {
  const oldF = '2025-26 resident brackets on (salary - 18,200): 16% to 45k, 30% to 135k, 37% to 190k, 45% above; Medicare levy 2% of gross; take-home = gross - tax - Medicare (super is employer-paid on top)';
  const newF = '2025-26 resident rates on gross: 0% to 18,200, 16% to 45,000, 30% to 135,000, 37% to 190,000, 45% above; Medicare levy 2% of gross; take-home = gross - tax - Medicare (super is employer-paid on top)';
  if (au.formula === oldF) { au.formula = newF; fs.writeFileSync(QA_FILE, JSON.stringify(qa, null, 1)); console.log('AU contract formula corrected'); }
  else if (au.formula === newF) { console.log('AU contract formula already correct'); }
  else { console.error('AU contract formula text unexpected:', au.formula); process.exit(1); }
} else { console.error('AU contract missing'); process.exit(1); }
