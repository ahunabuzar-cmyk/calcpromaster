// ============================================================
// Batch 8 — PARENTING & FAMILY (15 tools)
// Independent expected values computed from textbook math ONLY.
// The app's calc() is called at the END purely to see its output
// format for extraction — never to generate the expected value.
// ============================================================
'use strict';

// ---------- INDEPENDENT COMPUTATIONS ----------
console.log('=== INDEPENDENT EXPECTED (textbook) ===');

// 1. baby-weight-gain: pct = (actual - expected)/expected*100, rounded
const e6 = 7.9; // boy @6mo WHO median
const pct = Math.round((8.69 - e6) / e6 * 100);
console.log('baby-weight-gain 10% expected:', pct);

// 2. babysitter-rate: mid base 16 + infant 3 + (2-1)*2 = 21
console.log('babysitter-rate expected 21/hr:', 16 + 3 + (2 - 1) * 2);

// 3. child-height mid-parental +6.5 boy
const mp = (175 + 165) / 2;
console.log('child-height boy pred cm:', (mp + 6.5).toFixed(0), 'in:', ((mp + 6.5) / 2.54).toFixed(0));
console.log('child-height girl pred cm:', (mp - 6.5).toFixed(0), 'in:', ((mp - 6.5) / 2.54).toFixed(0));

// 4. childcare-cost-annual: daycare infant $200/day × 5 × 52
console.log('childcare-annual expected 52000:', 200 * 5 * 52);

// 5. childcare-cost: daycare 300×1×4.33 = 1299
console.log('childcare-cost daycare expected 1299:', (300 * 1 * 4.33).toFixed(0));
console.log('  nanny 2165:', (500 * 4.33).toFixed(0));

// 6. child-bmi 27/1.3^2
console.log('child-bmi expected 16.0:', (27 / Math.pow(130 / 100, 2)).toFixed(1));

// 7. college-savings-monthly: sinking fund PMT = FV*r/((1+r)^n - 1)
const FV = 50000 * 4;          // $50k/yr × 4 yrs
const yearsTo18 = 18 - 10;     // childAge 10
const r = 0.07 / 12;
const n = yearsTo18 * 12;
const pmt = FV * r / (Math.pow(1 + r, n) - 1);
console.log('college-savings-monthly expected $/mo:', pmt.toFixed(2));

// 8. diaper-cost: monthly = 6×0.25×365/12, total ×24
const diaperDaily = 6 * 0.25;
const diaperMonthly = diaperDaily * 365 / 12;
console.log('diaper-cost monthly 46 total 1095:', diaperMonthly.toFixed(0), (diaperMonthly * 24).toFixed(0));

// 9. family-budget-simple: total 4000 balance 2000
console.log('family-budget-simple 4000/2000:', 1500 + 800 + 400 + 300 + 500 + 500, 6000 - (1500 + 800 + 400 + 300 + 500 + 500));

// 10. family-budget: exp 6500 surplus 1500
console.log('family-budget 6500/1500:', 2000 + 1000 + 500 + 400 + 300 + 500 + 300 + 1000 + 500, 8000 - (2000 + 1000 + 500 + 400 + 300 + 500 + 300 + 1000 + 500));

// 11. vacation: beach mid 350 × 5 × 4
console.log('vacation expected 7000:', 350 * 5 * 4);

// 12. home-buying: maxLoan = PMT*((1+r)^n - 1)/(r*(1+r)^n), maxPrice = +down
const maxMonthly = (100000 / 12) * 0.28 - 500;
const rh = 0.06 / 12;
const nh = 30 * 12;
const maxLoan = maxMonthly * (Math.pow(1 + rh, nh) - 1) / (rh * Math.pow(1 + rh, nh));
console.log('home-buying maxMonthly:', maxMonthly.toFixed(2), 'maxLoan:', maxLoan.toFixed(0), 'maxPrice:', (maxLoan + 50000).toFixed(0));

// 13. life-insurance: 80000×10×0.7 + 20000 + 50000
console.log('life-insurance expected 630000:', 80000 * 10 * 0.7 + 20000 + 50000);

// 14. baby-name: emma → 1 (lookup)
console.log('baby-name emma #1 (lookup)');

// 15. baby-sleep: ageMonths 6 → 13 hrs (table)
console.log('baby-sleep 6mo → 13 hrs (table)');

// ---------- APP OUTPUT FORMAT (format only, not expected) ----------
console.log('\n=== APP OUTPUT FORMAT ===');
const tools = require('../js/data/parenting-family.js');
const arr = Array.isArray(tools) ? tools : [];
const cases = [
  ['baby-name', { name: 'emma', year: 2024 }],
  ['baby-sleep', { ageMonths: 6 }],
  ['baby-weight-gain', { gender: 'boy', ageMonths: 6, weightKg: 8.69 }],
  ['babysitter-rate', { location: 'mid', kidAges: 'infant', kids: 2, hours: 5 }],
  ['child-height', { fatherCm: 175, motherCm: 165, gender: 'boy' }],
  ['child-height', { fatherCm: 175, motherCm: 165, gender: 'girl' }],
  ['childcare-cost-annual', { type: 'daycare', childAge: 0.5, daysWeek: 5 }],
  ['childcare-cost', { daycareWeekly: 300, children: 1, nannyWeekly: 500, parentSalary: 4000 }],
  ['child-bmi', { gender: 'boy', ageYears: 8, weightKg: 27, heightCm: 130 }],
  ['college-savings-monthly', { childAge: 10, collegeCost: 50000, years: 4, returnRate: 7 }],
  ['diaper-cost', { diapersDay: 6, costPerDiaper: 0.25, months: 24 }],
  ['family-budget-simple', { income: 6000, housing: 1500, food: 800, transport: 400, utilitiesBill: 300, childcare: 500, other: 500 }],
  ['family-budget', { income: 8000, housing: 2000, food: 1000, transport: 500, utilities: 400, insurance: 300, education: 500, entertainment: 300, savings: 1000, other: 500 }],
  ['vacation-with-kids', { destination: 'beach', budgetLevel: 'mid', days: 5, familySize: 4 }],
  ['home-buying', { income: 100000, monthlyDebts: 500, rate: 6, years: 30, downPayment: 50000 }],
  ['life-insurance', { income: 80000, years: 10, debts: 20000, collegeFund: 50000 }],
];
for (const [id, v] of cases) {
  const t = arr.find(x => x.id === id);
  if (!t) { console.log(id, 'NOT FOUND'); continue; }
  const out = t.calc(v);
  console.log(id + ':', String(out.result ?? out));
}
