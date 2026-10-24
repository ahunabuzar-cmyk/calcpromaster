// ============================================================
// Independent known-answer QA — market-gap tools, batches #1 & #2
// ------------------------------------------------------------
// Covers the 13 trade, pet, religious and creator-economy tools.
// Each test re-implements the documented model INDEPENDENTLY
// (no shared code) and asserts the tool matches.
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

function allNums(html) {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/[,\s]/g, '')
    .match(/-?\d+(?:\.\d+)?/g)
    .map(Number);
}
function closest(nums, expected) {
  return nums.reduce((b, x) => (Math.abs(x - expected) < Math.abs(b - expected) ? x : b), nums[0] ?? 1e9);
}
const FILES = {
  construction: 'construction.js',
  engineering: 'engineering.js',
  lifestyle: 'lifestyle.js',
  health: 'health.js',
  finance: 'finance.js',
  business: 'business.js',
};
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
function expectMoney(out, expected, tol = 1) {
  const got = closest(allNums(out.result + ' ' + (out.extra || '')), expected);
  expect(Math.abs(got - expected)).toBeLessThanOrEqual(tol);
}

describe('Trade tools (batch #1) — independent known answers', () => {
  it('conduit fill: 3 x 12 AWG in 1/2 in EMT = 13.1 percent', () => {
    const pct = 3 * 0.0133 / 0.304 * 100;
    expect(pct).toBeCloseTo(13.125, 2);
    const out = run('conduit-fill', { conduit: '1/2 in', conductor: '12 AWG', count: 3 });
    expectMoney(out, 13.1, 0.2);
  });

  it('conduit fill: max 12 AWG in 1/2 in EMT is 9 conductors', () => {
    const maxN = Math.floor(0.4 * 0.304 / 0.0133);
    expect(maxN).toBe(9);
    const out = run('conduit-fill', { conduit: '1/2 in', conductor: '12 AWG', count: 9 });
    expect(out.extra).toMatch(/PASS/);
  });

  it('rolling offset: 10 in offset, no roll, 45 deg = 14.14 in travel', () => {
    const travel = 10 / Math.sin(Math.PI / 4);
    expect(travel).toBeCloseTo(14.1421, 3);
    const out = run('rolling-offset', { offset: 10, roll: 0, angle: '45' });
    expectMoney(out, 14.14, 0.02);
  });

  it('rolling offset: 10 in offset and 10 in roll = 20 in travel', () => {
    const travel = Math.sqrt(200) / Math.sin(Math.PI / 4);
    expect(travel).toBeCloseTo(20, 3);
    const out = run('rolling-offset', { offset: 10, roll: 10, angle: '45' });
    expectMoney(out, 20, 0.02);
  });

  it('pipe cutback: 4 in 90 deg long radius = 6 in takeout each', () => {
    const takeout = 1.5 * 4;
    expect(takeout).toBe(6);
    const out = run('pipe-cutback', { nps: 4, elbow: '90 long radius', fittings: 2 });
    expectMoney(out, takeout, 0.01);
    expectMoney(out, 12);
  });

  it('pipe cutback: 45 deg long radius factor is 0.625 x NPS', () => {
    const takeout = 0.625 * 6;
    expect(takeout).toBeCloseTo(3.75, 6);
    const out = run('pipe-cutback', { nps: 6, elbow: '45 long radius', fittings: 1 });
    expectMoney(out, 3.75, 0.01);
  });

  it('pipe pressure loss: 100 gpm, 4 in PVC, 100 ft ≈ 0.58 ft head', () => {
    const d = 4 / 12, R = d / 4, A = Math.PI * d * d / 4, Q = 100 / 448.831, V = Q / A;
    const S = Math.pow(V / (1.318 * 150 * Math.pow(R, 0.63)), 1 / 0.54);
    const hf = S * 100;
    expect(hf).toBeCloseTo(0.578, 1);
    const out = run('pipe-pressure-loss', { flow: 100, diameter: 4, material: 'PVC', length: 100 });
    expectMoney(out, hf, 0.02);
  });

  it('HVAC load: 1500 sq ft moderate average + 10 windows = 47,500 BTU/h', () => {
    const btu = 1500 * 25 * 1.0 + 10 * 1000;
    expect(btu).toBe(47500);
    const out = run('hvac-load', { area: 1500, climate: 'Moderate', insulation: 'Average', windows: 10 });
    expectMoney(out, btu, 1);
    expect(out.extra).toMatch(/4\.0 tons/);
  });
});

describe('Pet tools (batch #2) — independent known answers', () => {
  it('pet insurance: 3 yr medium dog comprehensive = 48/month', () => {
    const prem = 48 * 1.0 * 1.0;
    expect(prem).toBe(48);
    const out = run('pet-insurance-cost', { species: 'Dog', age: 3, size: 'Medium', coverage: 'Comprehensive' });
    expectMoney(out, prem, 0.01);
    expectMoney(out, 576);
  });

  it('pet insurance: a large senior dog pays 1.4 x 1.25 more', () => {
    const prem = 48 * 1.4 * 1.25;
    const out = run('pet-insurance-cost', { species: 'Dog', age: 9, size: 'Large', coverage: 'Comprehensive' });
    expectMoney(out, prem, 0.01);
  });

  it('pet medication: 10 kg metronidazole at 10 mg/kg, 50 mg/mL = 100 mg / 2 mL', () => {
    const mg = 10 * 10, ml = mg / 50;
    expect(mg).toBe(100); expect(ml).toBe(2);
    const out = run('pet-medication-dose', { weight: 10, drug: 'Metronidazole' });
    expectMoney(out, mg, 0.05);
    expectMoney(out, ml, 0.01);
  });

  it('pet medication: meloxicam is only 0.1 mg/kg', () => {
    const mg = 10 * 0.1;
    expect(mg).toBe(1);
    const out = run('pet-medication-dose', { weight: 10, drug: 'Meloxicam' });
    expectMoney(out, mg, 0.05);
  });

  it('pet boarding: 5 nights x 35 + 25 extras = 200', () => {
    const total = 5 * 35 * 1 + 25;
    expect(total).toBe(200);
    const out = run('pet-boarding-cost', { days: 5, rate: 35, pets: 1, extras: 25 });
    expectMoney(out, total, 0.5);
  });
});

describe('Religious + creator tools (batch #2) — independent known answers', () => {
  it('hajj cost: 7000 package + 1500 extras = 8500', () => {
    expect(7000 + 1500).toBe(8500);
    const out = run('hajj-cost', { pkg: 7000, people: 1, extras: 1500 });
    expectMoney(out, 8500, 0.5);
  });

  it('hajj cost: three travellers on 7000 + 1500 = 22500', () => {
    const total = 7000 * 3 + 1500;
    const out = run('hajj-cost', { pkg: 7000, people: 3, extras: 1500 });
    expectMoney(out, total, 0.5);
  });

  it('sponsorship rate: 50k followers @ 3% and 25 per 1000 = 1250', () => {
    const est = (50000 / 1000) * 25 * (3 / 3);
    expect(est).toBe(1250);
    const out = run('sponsorship-rate', { followers: 50000, engagement: 3, platform: 'Instagram', cpm: 25 });
    expectMoney(out, est, 0.5);
  });

  it('brand deal: 3 deliverables at 1250 each = 3750', () => {
    const per = (50000 / 1000) * 25 * (3 / 3);
    const total = per * 3;
    expect(total).toBe(3750);
    const out = run('brand-deal-value', { followers: 50000, engagement: 3, posts: 3, cpm: 25 });
    expectMoney(out, total, 0.5);
  });

  it('podcast ad rate: 5000 downloads @ 18 CPM, 2 spots = 180', () => {
    const total = (5000 / 1000) * 18 * 2;
    expect(total).toBe(180);
    const out = run('podcast-ad-rate', { downloads: 5000, cpm: 18, spots: 2 });
    expectMoney(out, total, 0.5);
  });

  it('newsletter rate: 10k subs @ 35% open, 30 CPM = 105 per issue', () => {
    const rate = (10000 * 0.35 / 1000) * 30;
    expect(rate).toBe(105);
    const out = run('newsletter-sponsorship-rate', { subs: 10000, openRate: 35, cpm: 30 });
    expectMoney(out, rate, 0.5);
  });
});
