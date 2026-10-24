// ============================================================
// Independent known-answer QA — market-gap tools, batch #6
// (regional reinforcement). Each test re-implements the model.
// ============================================================
import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

global.window = global;
const svg = '<svg></svg>';
global.Charts = { bar: () => svg, donut: () => svg, gauge: () => svg, line: () => svg, spark: () => svg };

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const require = createRequire(import.meta.url);

const FILES = { regional: 'regional.js', education: 'education.js' };
const CACHE = {};
function findTool(id) {
  for (const f of Object.keys(FILES)) {
    if (!CACHE[f]) {
      const arr = require(join(ROOT, 'js', 'data', FILES[f]));
      CACHE[f] = Array.isArray(arr) ? arr.filter((t) => t && t.id) : [];
    }
    const t = CACHE[f].find((x) => x.id === id);
    if (t) return t;
  }
  return null;
}
function run(id, values) {
  const t = findTool(id);
  if (!t) throw new Error('tool not found: ' + id);
  const v = {};
  t.inputs.forEach((inp) => { v[inp.id] = values[inp.id] !== undefined ? values[inp.id] : inp.def; });
  const out = t.calc(v);
  expect(out).toBeTruthy();
  expect(String(out.result + ' ' + (out.extra || ''))).not.toMatch(/NaN|Infinity|undefined/);
  return out;
}
function nums(s) {
  return String(s).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/g).map(Number);
}

describe('Regional reinforcement (batch #6)', () => {
  it('gold value: 50g at 75/gram plus 5% making = 3938, ~4.29 tola', () => {
    const out = run('gold-price', { weightGrams: 50, pricePerGram: 75, makingPct: 5 });
    const base = 50 * 75;
    expect(nums(out.result)[0]).toBeCloseTo(Math.round((base + base * 0.05) * 1) , 5);
    expect(out.extra).toMatch(/tola/);
  });
  it('qurbani: 1 sheep at 350 = 350; 3 cow shares at 550 add 1650', () => {
    expect(nums(run('qurbani-cost', { sheepCount: 1, sheepPrice: 350, cowShares: 0, cowSharePrice: 550 }).result)[0]).toBe(350);
    expect(nums(run('qurbani-cost', { sheepCount: 0, sheepPrice: 350, cowShares: 3, cowSharePrice: 550 }).result)[0]).toBe(3 * 550);
  });
  it('umrah: 2 travellers, economy = 3700 total', () => {
    const out = run('umrah-cost', { packageType: 'Economy', people: 2, flights: 700, visa: 150, hotelPerNight: 80, nights: 10, transport: 200 });
    const per = (700 + 150 + 200) * 1 + 80 * 10;
    expect(nums(out.result)[0]).toBe(per * 2);
  });
  it('umrah: premium applies a 1.8 multiplier', () => {
    const out = run('umrah-cost', { packageType: 'Premium', people: 1, flights: 700, visa: 150, hotelPerNight: 80, nights: 10, transport: 200 });
    const per = (700 + 150 + 200) * 1.8 + 80 * 10;
    expect(nums(out.result)[0]).toBeCloseTo(per, 5);
  });
  it('remittance: 1000 - 5 - 10 - 20 = 965 received', () => {
    const out = run('remittance-fee', { amount: 1000, feeFlat: 5, feePct: 1, fxMarginPct: 2 });
    expect(nums(out.result)[0]).toBe(965);
  });
  it('school fee inflation: 3000 at 8% for 12 years = 7555 final, 56931 total', () => {
    const out = run('school-fee-inflation', { currentAnnualFee: 3000, inflationPct: 8, years: 12 });
    const finalFee = Math.round(3000 * Math.pow(1.08, 12));
    const total = Math.round(3000 * (Math.pow(1.08, 12) - 1) / 0.08);
    expect(nums(out.result)[0]).toBe(finalFee);
    expect(nums(out.extra)).toContain(total);
  });
});
