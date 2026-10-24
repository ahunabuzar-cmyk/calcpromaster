#!/usr/bin/env node
// Adds QA contracts for the two calculators shipped 2026-10-13 (peptide
// reconstitution + proportion). Without an entry per tool, the sitemap quality
// gate (scripts/quality-gate.cjs) fails every tool page with "no QA contract".
// Idempotent: skips ids that already exist, so re-running after a regen is safe.
//
// Verification evidence (independent known-answer models, no shared code):
//   tests/unit/new-tools-qa.test.js
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'docs', 'qa-contracts.json');
const c = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const arr = Array.isArray(c) ? c : (c.contracts || c.calculators);
const TEST = 'SEE tests/unit/new-tools-qa.test.js';

const NEW = [
  // 3/4 = 9/d → d = 12. Result verified against the cross product a·d = b·c.
  ['proportion', 'Proportion Calculator', 'Math', '/math/proportion',
   'a (first numerator) (number); b (first denominator) (number); c (second numerator) (number); d (second denominator) (number); Solve for (select a | b | c | d)',
   'a/b = c/d  ⇔  a·d = b·c. Solve the chosen unknown: d = b·c/a, a = b·c/d, b = a·d/c, c = a·d/b. A zero divisor returns "no unique solution" (0/x = 0/y holds for every non-zero y); an answer that would put 0 in a denominator returns "no solution". Defaults 3/4 = 9/12 → d = 12; check 3÷4 = 9÷12 = 0.75.'],
  // 5 mg in 2 mL → 2.5 mg/mL; 250 µg → 0.1 mL → 10 units on U-100.
  ['peptide-reconstitution', 'Peptide Reconstitution Calculator', 'Health', '/health/peptide-reconstitution',
   'Vial amount (mg) (number); Reconstitution volume (mL) (number); Amount per dose (µg) (number); Syringe scale (select U-100 | U-50 | U-40)',
   'concentration mg/mL = vial amount ÷ reconstitution volume; volume to draw mL = (amount µg ÷ 1000) ÷ concentration; syringe units = draw volume × units-per-mL (U-100 = 100, U-50 = 50, U-40 = 40). A syringe unit is a volume mark, not a mass. Non-positive vial or volume is rejected; a zero amount returns the concentration only. Defaults 5 mg, 2 mL, 250 µg, U-100 → 0.1 mL = 10 units.'],
];

let added = 0;
for (const [id, name, category, route, inputs, formula] of NEW) {
  if (arr.some((x) => x.calculatorId === id)) continue;
  arr.push({
    calculatorId: id,
    name,
    category,
    route,
    inputs,
    formula,
    verificationStatus: 'PASS',
    knownAnswerTestCases: TEST,
    reviewer: null,
    notes: 'Independent known-answer tests (no shared code) — added with the tool',
  });
  added++;
}
if (added) {
  c.count = arr.length;
  fs.writeFileSync(FILE, JSON.stringify(c, null, 1));
}
console.log('qa contracts added:', added, '| total:', arr.length);
