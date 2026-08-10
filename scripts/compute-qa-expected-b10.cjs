// ============================================================
// Batch 10 — AUTO + REGIONAL (15 tools)
// Independent expected values from textbook math ONLY.
// ============================================================
'use strict';
global.Charts = { bar: () => ({}), donut: () => ({}), gauge: () => ({}), line: () => ({}), spark: () => ({}), heatmap: () => ({}), area: () => ({}) };

console.log('=== INDEPENDENT EXPECTED (textbook) ===');

// 1. leave-encashment: (basic+da)/30 × leaves
console.log('leave-encashment 35000:', ((30000 + 5000) / 30 * 30).toFixed(2));

// 2. lpg-cost: (price−subsidy)/monthsPerCylinder/30
console.log('lpg-cost perDay 13.33:', ((1000 - 200) / 2 / 30).toFixed(2));

// 3. nps-calculator: FV annuity due, then pension = 40% × 6%/12
const years = 60 - 30, n = years * 12, r = 0.10 / 12;
const corpus = 5000 * (Math.pow(1 + r, n) - 1) / r * (1 + r);
console.log('nps corpus:', corpus.toFixed(2), '| pension:', (corpus * 0.4 * 0.06 / 12).toFixed(2), '| lumpSum:', (corpus * 0.6).toFixed(2));

// 4. pk-salary: gross − tax/12 − pf
console.log('pk-salary takeHome 70000:', 100000 - (100000 * 12 * 0.25) / 12 - 100000 * 0.05);

// 5. rickshaw-fare: base + dist×perKm + wait×perMin
console.log('rickshaw-fare 90:', 20 + 5 * 10 + 10 * 2);

// 6. stamp-duty: value + 5% + 1% + 18% GST on reg
const val = 5000000;
const st = val * 0.05, reg = val * 0.01;
console.log('stamp-duty 5309000:', val + st + reg + reg * 0.18);

// 7. wedding-budget-shaadi: sum
console.log('shaadi 1400000:', 500000 + 200000 + 150000 + 300000 + 100000 + 50000 + 100000);

// 8. auto-fare: base + dist×perKm
console.log('auto-fare 73:', 25 + 4 * 12);

// 9. car-affordability: PV annuity of $300/mo @7% 60mo + down
const avail = (6000 - 4000) * 0.15, rr = 0.07 / 12, nn = 60;
const maxLoan = avail * (Math.pow(1 + rr, nn) - 1) / (rr * Math.pow(1 + rr, nn));
console.log('car-affordability maxCar:', (maxLoan + 5000).toFixed(0), '| maxLoan:', maxLoan.toFixed(2));

// 10. carbon-footprint-car: (km/mileage) × 2.31
console.log('carbon 2310:', (15000 / 15) * 2.31);

// 11. car-depreciation: 30000 × 0.85^5
console.log('depreciation current:', (30000 * Math.pow(0.85, 5)).toFixed(0), '| exact:', (30000 * Math.pow(0.85, 5)).toFixed(2));

// 12. car-insurance: 5% × 1.5 (age 22)
console.log('insurance 1500:', Math.round(20000 * 0.05 * 1.5));

// 13. car-maintenance: (12000/15000) × 900
console.log('maintenance 720:', Math.round(12000 / 15000 * 900));

// 14. car-rental: (50+15) × 5
console.log('rental 325:', (50 + 15) * 5);

// 15. commute-cost: (2×20/25)×4 + 5
console.log('commute 11.4:', (20 * 2 / 25) * 4 + 5);

// ---------- APP OUTPUT FORMAT ----------
console.log('\n=== APP OUTPUT FORMAT ===');
const cases = [
  ['regional', 'leave-encashment', { basic: 30000, da: 5000, leaves: 30 }],
  ['regional', 'lpg-cost', { cylinderPrice: 1000, subsidy: 200, monthsPerCylinder: 2, cylindersPerYear: 6 }],
  ['regional', 'nps-calculator', { age: 30, monthly: 5000, returnRate: 10, annuityPct: 40, annuityRate: 6 }],
  ['regional', 'pk-salary', { grossSalary: 100000, taxRate: 25, provident: 5 }],
  ['regional', 'rickshaw-fare', { baseFare: 20, distance: 5, perKm: 10, waitingMins: 10, waitingPerMin: 2 }],
  ['regional', 'stamp-duty', { propertyValue: 5000000, stampDutyPct: 5, registrationPct: 1 }],
  ['regional', 'wedding-budget-shaadi', { venue: 500000, decor: 200000, photography: 150000, jewellery: 300000, clothing: 100000, music: 50000, misc: 100000 }],
  ['auto-transport', 'auto-fare', { baseFare: 25, distance: 4, perKm: 12 }],
  ['auto-transport', 'car-affordability', { income: 6000, expenses: 4000, rate: 7, termMonths: 60, downPayment: 5000 }],
  ['auto-transport', 'carbon-footprint-car', { kmYearly: 15000, mileage: 15 }],
  ['auto-transport', 'car-depreciation', { purchasePrice: 30000, rate: 15, years: 5 }],
  ['auto-transport', 'car-insurance', { carValue: 20000, age: 22 }],
  ['auto-transport', 'car-maintenance', { age: 4, mileage: 12000 }],
  ['auto-transport', 'car-rental', { dailyRate: 50, insurance: 15, days: 5 }],
  ['auto-transport', 'commute-cost', { distance: 20, mileage: 25, fuelPrice: 4, parking: 5, daysWeek: 5 }],
];
for (const [file, id, v] of cases) {
  const mod = require('../js/data/' + file + '.js');
  const arr = Array.isArray(mod) ? mod : [];
  const t = arr.find(x => x.id === id);
  if (!t) { console.log(id, 'NOT FOUND'); continue; }
  const out = t.calc(v);
  console.log(id + ':', String(out.result ?? out));
}
