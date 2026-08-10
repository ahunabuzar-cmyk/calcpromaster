// BATCH 11 — auto/transport 15 tools — INDEPENDENT expected values
// Textbook math only; the app's calc() is invoked ONLY to print the actual
// output string so the extraction mode can be confirmed, never to derive
// an expectation.
global.Charts = { bar: () => '<svg/>', donut: () => '<svg/>', gauge: () => '<svg/>', line: () => '<svg/>', spark: () => '<svg/>', heatmap: () => '<svg/>', area: () => '<svg/>' };
global.window = global;

const path = require('path');
const all = {};
for (const f of require('fs').readdirSync('js/data').filter(f => f.endsWith('.js'))) {
  const mod = require(path.join(process.cwd(), 'js/data', f));
  const arr = Array.isArray(mod) ? mod : Object.values(mod).find(Array.isArray);
  if (arr) arr.forEach(t => { all[t.id] = t; });
}

// ---- Independent textbook computations (DEFAULTS as inputs) ----
const cases = [
  ['delivery-cost', { distance: 20, fuelCost: 5, driverWage: 10, vehicleCost: 3 },
    () => 5 + 10 + 3, 'sum of cost components'],
  ['ev-charging-cost', { batteryKwh: 60, currentPct: 20, targetPct: 90, elecRate: 0.15 },
    () => 60 * 0.70 * 0.15, 'kWh needed (70%) × rate'],
  ['ev-range', { batteryKwh: 60, efficiency: 180 },
    () => 60000 / 180, '60k Wh / 180 Wh/km'],
  ['ev-vs-gas-petrol', { kmYearly: 20000, evKwh100: 18, elecRate: 0.15, petrolKmpl: 14, petrolPrice: 1.5 },
    () => (20000 / 100) * 18 * 0.15, 'EV cost: 200 units × 18 kWh × $0.15'],
  ['fuel-cost', { distance: 500, mileage: 15, fuelPrice: 1.5, toll: 0 },
    () => (500 / 15) * 1.5, '500/15 L × $1.5'],
  ['fuel-efficiency', { currentKmpl: 12, improvedKmpl: 15, kmYearly: 15000, fuelPrice: 1.5 },
    () => (15000 / 12 - 15000 / 15) * 1.5, 'annual saving = (1250−1000)L × $1.5'],
  ['fuel-price-compare', { kmYearly: 15000, petrolKmpl: 15, petrolPrice: 1.5, dieselKmpl: 18, dieselPrice: 1.4, evKwh100: 18, elecPrice: 0.15 },
    () => (15000 / 100) * 18 * 0.15, 'EV: 150 units × 18 × $0.15'],
  ['lease-vs-buy', { carPrice: 35000, downPayment: 5000, loanRate: 6, loanTerm: 60, leasePayment: 450, leaseTerm: 36 },
    () => {
      const r = 0.06 / 12;
      const emi = 30000 * r * Math.pow(1 + r, 60) / (Math.pow(1 + r, 60) - 1);
      return emi * 60 + 5000; // buy total
    }, 'EMI × 60 + down'],
  ['mileage-calculator', { distance: 400, fuelUsed: 30 },
    () => 400 / 30, '400 km / 30 L'],
  ['bike-fuel', { distance: 500, mileage: 45, fuelPrice: 1.5 },
    () => (500 / 45) * 1.5, '(500/45) L × $1.5'],
  ['bike-loan', { price: 5000, rate: 9.5, months: 36 },
    () => {
      const r = 0.095 / 12;
      return 5000 * r * Math.pow(1 + r, 36) / (Math.pow(1 + r, 36) - 1);
    }, 'EMI standard formula'],
  ['route-optimizer', { stops: 5, totalKm: 80, timePerStop: 10 },
    () => 80 * 0.15 + (5 * 10 / 60) * 20, 'fuel $12 + 0.833h × $20/h'],
  ['oil-change', { oilType: 'syn' },
    () => 12000, 'synthetic interval 12,000 km'],
  ['oil-change', { oilType: 'conv' },
    () => 5000, 'conventional interval 5,000 km'],
  ['parking-cost', { dailyRate: 15, daysMonth: 22 },
    () => 15 * 22, 'daily × days/month'],
  ['public-transport', { kmDistance: 20, daysMonth: 22, ptMonthly: 120, carKmpl: 14, fuelPrice: 1.5 },
    () => ((20 * 2 / 14) * 1.5) * 22, 'round-trip 40km/14 × $1.5 × 22 days'],
];

for (const [id, values, ref, label] of cases) {
  const exp = ref();
  const t = all[id];
  const out = t.calc(values);
  const r = typeof out === 'object' ? String(out.result ?? '') : String(out);
  console.log(id.padEnd(20), 'EXP:', Number.isInteger(exp) ? exp.toFixed(0) : exp.toFixed(2).padStart(8), '|', label.padEnd(44), '| APP:', r.slice(0, 55));
}
