// BATCH 13 — construction 5 + converters 8 + education 2 — INDEPENDENT values
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
  ['paver-calculator', { area: 20, paverL: 20, paverW: 10, waste: 10 },
    () => Math.ceil(20 / (0.2 * 0.1) * 1.1), 'ceil(20/0.02×1.1)'],
  ['rebar-calculator', { length: 100, diameter: 12 },
    () => 100 * Math.pow(1.2, 2) * 0.617, 'd²/162 kg/m standard: 0.888 kg/m × 100m'],
  ['roofing', { length: 10, width: 8, pitch: 30 },
    () => 80 / Math.cos(30 * Math.PI / 180), '80 / cos(30°)'],
  ['tile-calculator', { length: 5, width: 4, tileSize: 60, waste: 10 },
    () => Math.ceil(20 / 0.36 * 1.1), 'ceil(20/0.36×1.1)'],
  ['wallpaper', { area: 30, rollSize: 5 },
    () => Math.ceil(30 / 5 * 1.15), 'ceil(6×1.15) = 7 rolls'],
  ['clothing-size', { usSize: 10, type: 'women' },
    () => 40, 'US10 women → EU40'],
  ['currency-conv', { amount: 100, from: 'USD', to: 'EUR' },
    () => 100 / 1 * 0.91, '100 USD × 0.91'],
  ['fuel-efficiency-converter', { value: 10, from: 'L100', to: 'mpgus' },
    () => 235.214 / 10, 'L/100km → US mpg = 235.214/L100'],
  ['fuel-efficiency-converter', { value: 25, from: 'mpgus', to: 'L100' },
    () => 235.214 / 25, 'US mpg → L/100km'],
  ['radiation-conv', { value: 1, from: 'Sv', to: 'mSv' },
    () => 1 / 0.001, '1 Sv = 1000 mSv'],
  ['shoe-size', { usShoe: 9, type: 'men' },
    () => 42, 'US9 men → EU42'],
  ['torque-conv', { value: 100, from: 'Nm', to: 'lbft' },
    () => 100 / 1.35582, '100 Nm / 1.35582 = 73.76 lb-ft'],
  ['viscosity-conv', { value: 1, from: 'PaS', to: 'cP' },
    () => 1 / 0.001, '1 Pa·s = 1000 cP'],
  ['act-score', { english: 25, math: 24, reading: 26, science: 23 },
    () => (25 + 24 + 26 + 23) / 4, 'composite = mean of 4 sections'],
  ['cgpa', { semesters: '3.5,3.7,3.8,3.6,3.9' },
    () => (3.5 + 3.7 + 3.8 + 3.6 + 3.9) / 5, 'mean of 5 semesters'],
];
for (const [id, values, ref, label] of cases) {
  const exp = ref();
  const t = all[id];
  const out = t.calc(values);
  const r = typeof out === 'object' ? String(out.result ?? '') : String(out);
  console.log(id.padEnd(24), 'EXP:', Number.isInteger(exp) ? exp.toFixed(0).padStart(6) : exp.toFixed(2).padStart(8), '|', label.padEnd(38), '| APP:', r.slice(0, 52));
}
