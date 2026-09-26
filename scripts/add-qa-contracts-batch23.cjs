#!/usr/bin/env node
// Adds QA contracts for the 10 regional tools shipped in batches #2 (AU/SG/QA/AD/JP)
// and #3 (CH/NL/MY/HK/UAE-gratuity). They were missing from docs/qa-contracts.json,
// so the sitemap quality gate failed them with "no QA contract".
// Idempotent: skips ids that already exist. Verification evidence:
//   tests/unit/regional-takehome-batch23-qa.test.js (independent known-answer models)
'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'docs', 'qa-contracts.json');
const c = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const arr = Array.isArray(c) ? c : (c.contracts || c.calculators);
const TEST = 'SEE tests/unit/regional-takehome-batch23-qa.test.js';

const NEW = [
  ['australia-take-home-salary', 'Australia Take-Home Salary Calculator', 'Annual Salary (A$) (number); Super Contribution (%) (number)',
   '2025-26 resident brackets on (salary - 18,200): 16% to 45k, 30% to 135k, 37% to 190k, 45% above; Medicare levy 2% of gross; take-home = gross - tax - Medicare (super is employer-paid on top)'],
  ['singapore-take-home-salary', 'Singapore Take-Home Salary Calculator', 'Monthly Salary (S$) (number); Status (select PR/Citizen vs Foreigner)',
   'Employee CPF 20% on the first S$7,400 of monthly wages (PR/Citizen); foreigners contribute 0; take-home = salary - CPF; income tax filed yearly, not withheld'],
  ['qatar-take-home-salary', 'Qatar Take-Home Salary Calculator', 'Monthly Basic Salary (QAR) (number); Allowances (QAR/mo) (number)',
   'Qatar levies no personal income tax; take-home = basic + allowances; end-of-service accrual shown as 21 days of basic per year (informational)'],
  ['abuDhabi-cost-living', 'Abu Dhabi Cost of Living Calculator', 'Monthly Salary (AED) (number); Rent/Schooling (AED/yr); Transport/Utilities (AED/mo)',
   'Fixed monthly = (rent + schooling) / 12 + transport + utilities; discretionary estimate = 20% of salary; surplus = salary - fixed - discretionary (0% income tax)'],
  ['japan-take-home-salary', 'Japan Take-Home Salary Calculator', 'Annual Salary (yen) (number)',
   'Employment income deduction = 480,000 + 10% of salary; national income tax 5/10/20/23% brackets; resident tax ~10% flat + 5,000; shakai hoken 14.66% employee share (capped base)'],
  ['switzerland-take-home-salary', 'Switzerland Take-Home Salary Calculator', 'Gross Annual Salary (CHF) (number); Canton Tax Level (select Low/Average/High)',
   'Social insurance 13.4% of gross (AHV 5.3 + ALV 1.1 + BVG ~7); income tax via effective-rate bands by canton level (low 9%, average 13.5%, high 21% weighted into salary tiers); take-home = gross - social - tax'],
  ['netherlands-take-home-salary', 'Netherlands Take-Home Salary Calculator', 'Gross Annual Salary (EUR) (number); 30% Ruling (select)',
   'Combined loonheffing 2025 bands on taxable base: 30% to 38,441, 33.5% to 76,817, 42% above (general credit folded in); 30% ruling taxes only 70% of gross; take-home = gross - withholding'],
  ['malaysia-take-home-salary', 'Malaysia Take-Home Salary Calculator', 'Monthly Salary (RM) (number); Employee EPF (%) (number)',
   'EPF 11% employee share; annual taxable = gross x12 - EPF x12 - 9,000 relief; simplified PCB 0% to 35k, 3% to 100k, 8% above; take-home = salary - EPF - PCB/12'],
  ['hongkong-take-home-salary', 'Hong Kong Take-Home Salary Calculator', 'Monthly Salary (HK$) (number)',
   'MPF 5% employee share capped at HK$1,500/month; net chargeable income = annual gross - MPF - 132,000 allowance; progressive 2/6/10/14% bands with 15% standard-rate ceiling when lower'],
  ['uae-gratuity-calculator', 'UAE Gratuity Calculator', 'Monthly Basic Salary (AED) (number); Years of Service (number)',
   'Federal Decree-Law 33 (2022): daily wage = basic x12/365; 21 days/year for first 5 years, 30 days/year after; total capped at 2 years of wages; under 1 year = no gratuity'],
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
    notes: 'Independent known-answer tests (no shared code) - batch ' + (id === 'uae-gratuity-calculator' || /switzerland|netherlands|malaysia|hongkong/.test(id) ? '#3' : '#2'),
  });
  added++;
}
if (added) fs.writeFileSync(FILE, JSON.stringify(c, null, 1));
console.log('qa contracts added:', added, '| total:', arr.length);
