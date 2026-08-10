// BATCH 12 — auto 8 + construction 7 — INDEPENDENT expected values (textbook math)
global.Charts = { bar: () => '<svg/>', donut: () => '<svg/>', gauge: () => '<svg/>', line: () => '<svg/>', spark: () => '<svg/>', heatmap: () => '<svg/>', area: () => '<svg/>' };
global.window = global;

const path = require('path');
const all = {};
for (const f of require('fs').readdirSync('js/data').filter(f => f.endsWith('.js'))) {
  const mod = require(path.join(process.cwd(), 'js/data', f));
  const arr = Array.isArray(mod) ? mod : Object.values(mod).find(Array.isArray);
  if (arr) arr.forEach(t => { all[t.id] = t; });
}

const cases = [
  ['ride-share-cost', { kmPerDay: 30, ridePerKm: 1.2, carKmpl: 15, fuelPrice: 1.5, daysWeek: 5 },
    () => (30 / 15) * 1.5, 'car = 2 L × $1.5'],
  ['speed-distance-time', { calcMode: 'speed', distance: 100, speed: 80, hours: 1 },
    () => 100 / 1, 'speed mode: d/t'],
  ['speed-distance-time', { calcMode: 'distance', distance: 100, speed: 80, hours: 1 },
    () => 80 * 1, 'distance mode: s×t'],
  ['stopping-distance', { speed: 60, reactionTime: 1 },
    () => { const ms = 60 / 3.6; return ms * 1 + ms * ms / (2 * 0.7 * 9.81); }, 'reaction + braking (μ=0.7)'],
  ['taxi-fare', { distance: 10, baseFare: 3, perKm: 2 },
    () => 3 + 10 * 2, 'base + distance×rate'],
  ['tire-size', { oldWidth: 205, oldProfile: 55, oldRim: 16, newWidth: 215, newProfile: 55, newRim: 17 },
    () => { const o = (205 * 0.55 * 2 / 25.4) + 16; const n = (215 * 0.55 * 2 / 25.4) + 17; return ((n - o) / o) * 100; }, 'diameter change %'],
  ['trade-in-value', { mrp: 30000, age: 5 },
    () => 30000 * Math.pow(0.85, 5), '15%/yr depreciation'],
  ['trip-time', { distance: 800, avgSpeed: 90, breakHr: 3, breakMin: 15 },
    () => { const drive = 800 / 90; const breaks = Math.floor(drive / 3); return drive + breaks * 15 / 60; }, 'drive + breaks (hrs)'],
  ['walking-transit', { distance: 2.5, walkSpeed: 5, transitWait: 10, transitRide: 15 },
    () => (2.5 / 5) * 60, 'walk minutes'],
  ['deck-calculator', { length: 5, width: 4, boardW: 14, gap: 5 },
    () => Math.ceil(4 / (0.14 + 0.005)), 'boards = ceil(width/effW)'],
  ['drywall', { area: 50, sheetSize: 3 },
    () => Math.ceil(50 / 3 * 1.1), 'ceil(area/sheet × 1.1 waste)'],
  ['formwork', { length: 6, height: 3, faces: 2 },
    () => 6 * 3 * 2, 'area = L×H×faces'],
  ['insulation', { area: 100, rValue: 5, thickness: 0.1 },
    () => Math.ceil(100 / 10), 'rolls = ceil(area/10)'],
  ['lumber-calculator', { pieces: 10, length: 8, width: 6, thickness: 1 },
    () => 10 * 8 * 6 * 1 / 12, 'board feet = p×L×W×T/12'],
  ['mulch', { area: 20, depth: 5 },
    () => 20 * 5 / 100, 'volume m³'],
  ['paint-quantity', { walls: 50, coats: 2, coverage: 10 },
    () => 50 * 2 / 10, 'liters = area×coats/coverage'],
];

for (const [id, values, ref, label] of cases) {
  const exp = ref();
  const t = all[id];
  const out = t.calc(values);
  const r = typeof out === 'object' ? String(out.result ?? '') : String(out);
  console.log(id.padEnd(20), 'EXP:', Number.isInteger(exp) ? exp.toFixed(0).padStart(6) : exp.toFixed(2).padStart(8), '|', label.padEnd(42), '| APP:', r.slice(0, 52));
}
