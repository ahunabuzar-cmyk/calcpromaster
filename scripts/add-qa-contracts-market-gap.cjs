#!/usr/bin/env node
// QA contracts for the 13 market-gap tools shipped in batches #1 and #2.
// Idempotent: skips ids already present. Verification evidence:
//   tests/unit/market-gap-qa.test.js (independent known-answer models)
'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'docs', 'qa-contracts.json');
const c = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const arr = Array.isArray(c) ? c : (c.contracts || c.calculators);
const TEST = 'SEE tests/unit/market-gap-qa.test.js';

const NEW = [
  ['conduit-fill', 'Conduit Fill Calculator', 'construction',
   'Conduit size (EMT) (select); THHN conductor size (select); Number of conductors (number)',
   'Conductor area from NEC Chapter 9 Table 5 (THHN 14 AWG to 2 AWG) times the conductor count, divided by the EMT internal area from Table 4 (1/2 in to 2 in), times 100 for the fill percentage; the 40 percent limit applies for three or more conductors and the maximum count is floor(0.40 x conduitArea / conductorArea)'],
  ['rolling-offset', 'Rolling Offset Calculator', 'construction',
   'Offset / rise (in) (number); Roll / horizontal (in) (number); Fitting angle (deg) (select)',
   'True offset = sqrt(offset^2 + roll^2); travel = true offset / sin(angle); run = true offset / tan(angle); the multiplier is 1 / sin(angle), which is 1.414 at 45 degrees'],
  ['pipe-cutback', 'Pipe Cutback Calculator', 'construction',
   'Nominal pipe size (in) (number); Elbow type (select); Number of fittings (number)',
   'Takeout per fitting = factor x NPS, with factor 1.5 for a 90 degree long radius elbow, 0.625 for a 45 degree long radius, and 1.0 for a 90 degree short radius; total cutback = takeout x number of fittings'],
  ['pipe-pressure-loss', 'Pipe Pressure Loss Calculator', 'engineering',
   'Flow rate (gpm) (number); Internal diameter (in) (number); Pipe material (select); Pipe length (ft) (number)',
   'Hazen-Williams: velocity = (flow in cfs) / internal area; hydraulic radius = diameter / 4; friction slope S = (V / (1.318 x C x R^0.63))^(1/0.54) with C = 150 PVC, 130 copper, 120 steel, 100 cast iron; head loss = S x length; psi = head x 0.433'],
  ['hvac-load', 'HVAC Load Calculator', 'engineering',
   'Conditioned floor area (sq ft) (number); Climate (select); Insulation quality (select); Number of windows (number)',
   'Cooling load = area x base x insulation factor + windows x 1,000 BTU/h, where base = 30 hot, 25 moderate, 20 cold BTU per sq ft and insulation factor = 0.85 good, 1.0 average, 1.2 poor; tons = BTU / 12,000'],
  ['pet-insurance-cost', 'Pet Insurance Cost Calculator', 'lifestyle',
   'Pet (select); Age (years) (number); Size (select); Coverage (select)',
   'Monthly premium = base x age factor x size factor, where base = 48 dog or 32 cat comprehensive, 22 dog or 15 cat accident-only; age factor = 0.9 under 2, 1.0 through 7, 1.4 above; size factor = 0.9 small, 1.0 medium, 1.25 large'],
  ['pet-medication-dose', 'Pet Medication Dosage Calculator', 'health',
   'Pet weight (kg) (number); Medication (select)',
   'Dose in mg = weight x standard mg per kg rate (meloxicam 0.1, metronidazole 10, amoxicillin 10, gabapentin 10); volume in mL = dose in mg / liquid concentration in mg per mL (meloxicam 1.5, others 50). Reference aid only, never a prescription'],
  ['pet-boarding-cost', 'Pet Boarding Cost Calculator', 'lifestyle',
   'Nights (number); Nightly rate per pet (number); Number of pets (number); Extras (number)',
   'Total = nights x nightly rate x number of pets + extras; the boarding figure is shown separately from the extras'],
  ['hajj-cost', 'Hajj Cost Calculator', 'finance',
   'Package per person (number); Travellers (number); Travel extras (number)',
   'Total = package per person x travellers + travel extras; spending money, Qurbani and gifts are budgeted separately'],
  ['sponsorship-rate', 'Influencer Sponsorship Rate Calculator', 'business',
   'Followers (number); Engagement rate (percent) (number); Platform (select); Rate per 1000 followers (number)',
   'Base = (followers / 1000) x rate per 1000; engagement adjustment = engagement rate / 3; estimated rate = base x adjustment; negotiation range = 70 percent to 150 percent of the estimate'],
  ['brand-deal-value', 'Brand Deal Value Calculator', 'business',
   'Followers (number); Engagement rate (percent) (number); Deliverables (posts) (number); Rate per 1000 followers (number)',
   'Per-post value = (followers / 1000) x rate per 1000 x (engagement rate / 3); total = per-post value x deliverables; bundle price = total x 0.9'],
  ['podcast-ad-rate', 'Podcast Ad Rate Calculator', 'business',
   'Downloads per episode (number); CPM (number); Ad spots per episode (number)',
   'Rate per spot = (downloads / 1000) x CPM; per-episode total = rate per spot x number of spots; programmatic CPMs benchmark near 15, host-read near 30 or more'],
  ['newsletter-sponsorship-rate', 'Newsletter Sponsorship Rate Calculator', 'business',
   'Subscribers (number); Open rate (percent) (number); CPM (per 1000 opens) (number)',
   'Real opens = subscribers x open rate / 100; suggested rate = (opens / 1000) x CPM'],
];

let added = 0;
for (const [id, name, category, inputs, formula] of NEW) {
  if (arr.some((x) => x.calculatorId === id)) continue;
  arr.push({
    calculatorId: id,
    name,
    category,
    route: '/' + category + '/' + id,
    inputs,
    formula,
    verificationStatus: 'PASS',
    knownAnswerTestCases: TEST,
    reviewer: null,
    notes: 'Independent known-answer tests (no shared code) - market-gap batch #1/#2',
  });
  added++;
}
if (added) {
  c.count = arr.length;
  fs.writeFileSync(FILE, JSON.stringify(c, null, 1));
}
console.log('qa contracts added:', added, '| total:', arr.length);
