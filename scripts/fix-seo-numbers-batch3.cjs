#!/usr/bin/env node
// Batch-3 SEO numeric alignment: the narrative worked examples in 3 entries
// were hand-estimated and drifted from the shipped formulas. The page renders
// the FORMULA output, so the SEO text must match it exactly.
// Idempotent: each replacement must match exactly once (or already be applied).
'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'js', 'seo-content.js');
let s = fs.readFileSync(FILE, 'utf8');

const E = String.fromCharCode(8364); // euro sign

const REPLACES = [
  // --- Switzerland: desc worked example + quick-answer tax figure ---
  ['tax \u2248 CHF 12,150; take-home \u2248 <strong>CHF 65,790 a year \u2014 about CHF 5,480 per month</strong>',
   'tax \u2248 CHF 11,475; take-home \u2248 <strong>CHF 66,465 a year \u2014 about CHF 5,539 per month</strong>'],
  ['after about CHF 12,100 social insurance and CHF 11,700 income tax',
   'after about CHF 12,060 social insurance and CHF 11,475 income tax'],
  // --- Netherlands: quick answer ---
  ['nets about ' + E + ' 34,100 a year \u2014 roughly ' + E + ' 2,840 per month \u2014 after about ' + E + ' 15,900 withholding. With the 30% ruling the same offer nets about ' + E + ' 36,400 (roughly ' + E + ' 3,030 per month) because only ' + E + ' 35,000 is taxed',
   'nets about ' + E + ' 34,596 a year \u2014 roughly ' + E + ' 2,883 per month \u2014 after about ' + E + ' 15,404 withholding. With the 30% ruling the same offer nets about ' + E + ' 39,500 (roughly ' + E + ' 3,292 per month) because only ' + E + ' 35,000 is taxed'],
  // --- Netherlands: desc worked example ---
  ['withholding \u2248 ' + E + ' 15,900 \u2192 <strong>net \u2248 ' + E + ' 2,840 per month</strong>',
   'withholding \u2248 ' + E + ' 15,404 \u2192 <strong>net \u2248 ' + E + ' 2,883 per month</strong>'],
  ['net \u2248 ' + E + ' 3,290 per month</strong> \u2014 over ' + E + ' 5,000 a year more from one clause',
   'net \u2248 ' + E + ' 3,292 per month</strong> \u2014 almost ' + E + ' 5,000 a year more from one clause'],
  // --- Malaysia: quick answer + desc ---
  ['leaves about RM 6,962 per month after RM 880 EPF and roughly RM 158 estimated PCB \u2014 about RM 83,540 a year',
   'leaves about RM 7,016 per month after RM 880 EPF and roughly RM 104 estimated PCB \u2014 about RM 84,200 a year'],
  ['tax \u2248 RM 1,891 a year (\u2248 RM 158/month). <strong>Take-home \u2248 RM 6,962 per month \u2014 about RM 83,540 a year</strong>',
   'tax \u2248 RM 1,243 a year (\u2248 RM 104/month). <strong>Take-home \u2248 RM 7,016 per month \u2014 about RM 84,197 a year</strong>'],
  // --- Hong Kong: quick answer + desc (formula: 25,380 progressive tax at HK35k) ---
  ['leaves about HK31,255 per month after HK1,750 MPF and roughly HK2,000 estimated tax \u2014 about HK375,060 a year',
   'leaves about HK31,135 per month after HK1,750 MPF and roughly HK2,115 estimated tax \u2014 about HK373,620 a year'],
  ['progressive tax \u2248 HK20,680 \u2192 <strong>take-home \u2248 HK31,255 per month \u2014 about HK375,060 a year</strong>. Effective tax rate: under 5%',
   'progressive tax \u2248 HK25,380 \u2192 <strong>take-home \u2248 HK31,135 per month \u2014 about HK373,620 a year</strong>. Effective tax rate: about 6%'],
];

let applied = 0, skipped = 0;
for (const [from, to] of REPLACES) {
  const n = s.split(from).length - 1;
  if (n === 1) { s = s.split(from).join(to); applied++; }
  else if (n === 0 && s.includes(to)) { skipped++; }
  else { console.error('UNEXPECTED match count ' + n + ' for: ' + from.slice(0, 60)); process.exit(1); }
}
fs.writeFileSync(FILE, s);
console.log('seo numbers fixed:', applied, '| already applied:', skipped);
