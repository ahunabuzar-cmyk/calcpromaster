#!/usr/bin/env node
// Adds QA contracts for the 3 regional tools shipped in batch #4
// (IE/NZ/ZA take-home). They were missing from docs/qa-contracts.json,
// so the sitemap quality gate failed them with "no QA contract".
// Idempotent: skips ids that already exist. Verification evidence:
//   tests/unit/regional-takehome-batch4-qa.test.js (independent known-answer models)
'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'docs', 'qa-contracts.json');
const c = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const arr = Array.isArray(c) ? c : (c.contracts || c.calculators);
const TEST = 'SEE tests/unit/regional-takehome-batch4-qa.test.js';

const NEW = [
  ['ireland-take-home-salary', 'Ireland Take-Home Salary Calculator', 'Gross Annual Salary (EUR) (number); Tax Band Status (select Single vs Married one-income)',
   'PAYE 2025: 20% up to 44,000 single (53,000 married one-income), 40% above, minus 4,000 standard credits (clamped at 0); USC 0.5% to 12,012, 2% to 27,382, 3% to 70,044, 8% above; PRSI 4.1% of gross; take-home = gross - PAYE - USC - PRSI'],
  ['new-zealand-take-home-salary', 'New Zealand Take-Home Salary Calculator', 'Annual Salary (NZD) (number); KiwiSaver Rate (%) (number)',
   'PAYE 2025-26 bands: 10.5% to 15,600, 17.5% to 53,500, 30% to 78,100, 33% to 180,000, 39% above; ACC earners levy 1.67% capped at 152,790; KiwiSaver employee rate (default 3%); take-home = gross - tax - ACC - KiwiSaver'],
  ['south-africa-take-home-salary', 'South Africa Take-Home Salary Calculator', 'Monthly Salary (ZAR) (number); Age Band (select Under 65 / 65+ / 75+)',
   'SARS 2025-26 annual brackets 18/26/31/36/39/41/45% with cumulative constants (primary rebate built in); secondary rebate 9,444 from 65, tertiary +3,145 more at 75; UIF 1% of monthly salary capped at 177.12; take-home = monthly - annual tax/12 - UIF'],
];

let added = 0;
for (const [id, name, inputs, formula] of NEW) {
  if (arr.some(x => x.calculatorId === id)) continue;
  arr.push({
    calculatorId: id,
    name,
    category: 'regional',
    route: '/regional/' + id,
    inputs,
    formula,
    verificationStatus: 'PASS',
    knownAnswerTestCases: TEST,
    reviewer: null,
    notes: 'Independent known-answer tests (no shared code) - batch #4',
  });
  added++;
}
if (added) fs.writeFileSync(FILE, JSON.stringify(c, null, 1));
console.log('qa contracts added:', added, '| total:', arr.length);
