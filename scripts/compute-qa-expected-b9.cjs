// ============================================================
// Batch 9 — REGIONAL + FAMILY (15 tools)
// Independent expected values from textbook math ONLY.
// The app's calc() is called at the END purely to see output
// formats for extraction — never to generate expected values.
// ============================================================
'use strict';

console.log('=== INDEPENDENT EXPECTED (textbook) ===');

// 1. maternity-leave-finance: (salary/52) × paidPct% × weeks
console.log('maternity-leave-finance 15600:', (52000 / 52) * 0.6 * 26);

// 2. maternity-leave: monthly salary × (weeks/4.33) × paidPct%
console.log('maternity-leave 11085:', (5000 * (12 / 4.33) * 0.8).toFixed(0));

// 3. paternity-leave: (salary/52) × 50% × 2
console.log('paternity-leave 1000:', (52000 / 52) * 0.5 * 2);

// 4. screen-time age 8 → 120 (AAP table)
console.log('screen-time 8y → 120 min (AAP table)');

// 5. toddler-screen age 4 → 60 min (table)
console.log('toddler-screen 4y → 60 min (table)');

// 6. wedding-budget 100000 → venue 35000
console.log('wedding-budget total 100000, venue 35000:', Math.round(100000 * 0.35));

// 7. chit-fund: installment = ceil(amount/months + amount×commission%/months)
const amt = 100000, months = 20, comm = 5, dividend = 5500;
console.log('chit-fund installment 5250:', Math.ceil(amt / months + amt * comm / 100 / months));
console.log('chit-fund totalPaid 105000:', amt + amt * comm / 100, '| dividends 110000:', dividend * months, '| net 105000:', dividend * months - amt * comm / 100);

// 8. dubai-salary: monthly = salary/12 + housing; savings = − expenses
const monthly = 120000 / 12 + 3000;
console.log('dubai-salary savings 9500:', monthly - (1000 + 2000 + 500));

// 9. electricity-bill-india: 150 units → 100×3 + 50×5 = 550; +5% GST + fixed
const energy = 100 * 3 + 50 * 5;
console.log('electricity-bill 677.5:', energy + 100 + energy * 0.05);

// 10. gold-rate: (weight × rate × purity/24) + making 5% + 3% GST
const pureGold = 10 * 5000 * 22 / 24;
const making = pureGold * 0.05;
console.log('gold-rate total 49568.75:', pureGold + making + (pureGold + making) * 0.03);

// 11. gold-rate-pk: tola × rate × 22/24 + making
console.log('gold-rate-pk total 185333.33:', (1 * 200000 * 22 / 24) + 2000);

// 12. gold-silver ratio 6000/100 = 60
console.log('gold-silver 60:', 6000 / 100);

// 13. gratuity: lastSalary × 15 × years / 26 (10 yrs)
console.log('gratuity 288461.54:', (50000 * 15 * 10 / 26).toFixed(2));

// 14. gst-india exclusive 1000@18% → total 1180; inclusive 1180@18% → base 1000
console.log('gst exclusive 1180:', 1000 * 1.18);
console.log('gst inclusive base 1000:', 1180 - 1180 * 0.18 / 1.18);

// 15. home-loan-emi-india: EMI = P×r×(1+r)^n/((1+r)^n−1), 50L @8.5% 20y
const P = 5000000, rr = 0.085 / 12, nn = 240;
const emi = P * rr * Math.pow(1 + rr, nn) / (Math.pow(1 + rr, nn) - 1);
console.log('home-loan-emi 4339x:', emi.toFixed(2), '| totalPay:', (emi * nn).toFixed(0), '| interest:', (emi * nn - P).toFixed(0));

// ---------- APP OUTPUT FORMAT ----------
console.log('\n=== APP OUTPUT FORMAT ===');
global.Charts = { bar: () => ({}), donut: () => ({}), gauge: () => ({}), line: () => ({}), spark: () => ({}), heatmap: () => ({}), area: () => ({}) };
const files = ['parenting-family', 'regional'];
const cases = [
  ['parenting-family', 'maternity-leave-finance', { salary: 52000, paidPct: 60, leaveWeeks: 26 }],
  ['parenting-family', 'maternity-leave', { salary: 5000, weeksLeave: 12, paidPct: 80 }],
  ['parenting-family', 'paternity-leave', { salary: 52000, paidPct: 50, leaveWeeks: 2 }],
  ['parenting-family', 'screen-time', { childAge: 8 }],
  ['parenting-family', 'toddler-screen', { ageYears: 4, currentMin: 90 }],
  ['parenting-family', 'wedding-budget', { totalBudget: 100000 }],
  ['regional', 'chit-fund', { amount: 100000, months: 20, commission: 5, dividend: 5500 }],
  ['regional', 'dubai-salary', { salary: 120000, housing: 3000, dewa: 1000, food: 2000, transport: 500 }],
  ['regional', 'electricity-bill-india', { units: 150, slab1: 3, slab2: 5, slab3: 8, fixedCharges: 100 }],
  ['regional', 'gold-rate', { weight: 10, ratePerGram: 5000, purity: 22, makingPct: 5 }],
  ['regional', 'gold-rate-pk', { tola: 1, ratePerTola: 200000, purity: 22, making: 2000 }],
  ['regional', 'gold-silver', { goldPerGram: 6000, silverPerGram: 100 }],
  ['regional', 'gratuity', { years: 10, months: 0, lastSalary: 50000 }],
  ['regional', 'gst-india', { amount: 1000, gstRate: 18, direction: 'exclusive' }],
  ['regional', 'gst-india', { amount: 1180, gstRate: 18, direction: 'inclusive' }],
  ['regional', 'home-loan-emi-india', { amount: 5000000, rate: 8.5, years: 20, taxSlab: 30 }],
];
for (const [file, id, v] of cases) {
  const mod = require('../js/data/' + file + '.js');
  const arr = Array.isArray(mod) ? mod : [];
  const t = arr.find(x => x.id === id);
  if (!t) { console.log(id, 'NOT FOUND'); continue; }
  const out = t.calc(v);
  console.log(id + (v.direction ? '(' + v.direction + ')' : '') + ':', String(out.result ?? out));
}
