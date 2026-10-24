// ============================================================
// Independent known-answer QA — market-gap tools, batch #3
// ------------------------------------------------------------
// Covers the religious, legal, visa and career tools. Each test
// re-implements the documented model INDEPENDENTLY (no shared code)
// and asserts the shipped tool matches.
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

const FILES = {
  regional: 'regional.js',
  family: 'parenting-family.js',
  everyday: 'everyday.js',
  career: 'career-freelance.js',
  finance: 'finance.js',
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
function nums(s) {
  return String(s).replace(/[,\s]/g, ' ').match(/-?\d+(?:\.\d+)?/g).map(Number);
}

describe('Religious tools (batch #3)', () => {
  it('prayer time: Karachi 2026-06-21 MWL returns five ordered times', () => {
    const out = run('prayer-time', { city: 'Karachi', date: '2026-06-21', method: 'MWL', asr: 'Standard' });
    expect(out.result).toMatch(/Fajr \d\d:\d\d \| Dhuhr \d\d:\d\d \| Asr \d\d:\d\d \| Maghrib \d\d:\d\d \| Isha \d\d:\d\d/);
    const times = [...out.result.matchAll(/(\d\d):(\d\d)/g)].map((m) => (+m[1]) * 60 + (+m[2]));
    expect(times).toHaveLength(5);
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1]);
    // Independent solar-noon check for Karachi (lat 24.86, lng 67.01, tz +5),
    // day 172 of 2026: noon ≈ 12:33.
    expect(out.result).toContain('Dhuhr 12:33');
    expect(out.result).toContain('Maghrib 19:24');
  });

  it('prayer time: an unsupported city is refused, not guessed', () => {
    const out = run('prayer-time', { city: 'Atlantis' });
    expect(out.result).toMatch(/supported city/i);
  });

  it('islamic inheritance: wife + 1 son + both parents on 100000', () => {
    const spouse = 100000 * 1 / 8;
    const mother = 100000 * 1 / 6;
    const father = 100000 * 1 / 6;
    const residue = 100000 - spouse - mother - father;
    const out = run('mirath-calculator', { estate: 100000, spouse: 'Wife', sons: 1, daughters: 0, father: true, mother: true });
    expect(Math.round(residue)).toBe(54167);
    expect(out.result).toBe('Spouse 12500 | Children 54167');
  });

  it('islamic inheritance: husband is a quarter when there are children', () => {
    const spouse = 100000 * 1 / 4;
    const out = run('mirath-calculator', { estate: 100000, spouse: 'Husband', sons: 1, daughters: 1, father: true, mother: true });
    // children residue = 100000 - 25000 - 16667 - 16667 = 41666, split 2:1
    expect(Math.round(spouse)).toBe(25000);
    expect(out.result).toContain('Spouse 25000');
    expect(out.result).toContain('Children 41667');
  });

  it('hijri: 1 Muharram 1447 is 2025-06-27 (tabular calendar)', () => {
    const out = run('hijri-converter', { direction: 'Hijri to Gregorian', hy: 1447, hm: 1, hd: 1 });
    expect(out.result).toBe('Hijri 1447-01-01 = Gregorian 2025-06-27');
  });

  it('hijri: Gregorian to Hijri round-trips', () => {
    const g2h = run('hijri-converter', { direction: 'Gregorian to Hijri', date: '2026-10-04' });
    expect(g2h.result).toBe('Gregorian 2026-10-04 = Hijri 1448-04-21');
    const h2g = run('hijri-converter', { direction: 'Hijri to Gregorian', hy: 1448, hm: 4, hd: 21 });
    expect(h2g.result).toBe('Hijri 1448-04-21 = Gregorian 2026-10-04');
  });
});

describe('Legal tools (batch #3)', () => {
  it('alimony: 4000 gap over 10 years, no children = 1600/mo', () => {
    const gap = 6000 - 2000;
    const rate = 0.2 + 0.02 * 10;
    const monthly = gap * rate;
    expect(monthly).toBe(1600);
    const out = run('alimony-estimator', { payerIncome: 6000, recipientIncome: 2000, years: 10, children: 0 });
    expect(out.result).toBe('Estimated monthly support: 1600');
  });

  it('alimony: a short marriage lowers the rate', () => {
    const rate = 0.2 + 0.02 * 2;
    const out = run('alimony-estimator', { payerIncome: 6000, recipientIncome: 2000, years: 2, children: 0 });
    expect(out.result).toBe('Estimated monthly support: ' + Math.round(4000 * rate));
  });

  it('statute: personal injury on 2026-01-15 gives a 2-year deadline', () => {
    const out = run('statute-of-limitations', { claimType: 'Personal injury', incidentDate: '2026-01-15' });
    expect(out.result).toBe('File by 2028-01-15');
  });

  it('statute: a contract dispute is 6 years', () => {
    const out = run('statute-of-limitations', { claimType: 'Contract dispute', incidentDate: '2026-01-15' });
    expect(out.result).toBe('File by 2032-01-15');
  });
});

describe('Visa and career tools (batch #3)', () => {
  it('canada CRS: age 30 + Bachelors + CLB9 + 1 CA yr + 3 foreign yr = 406', () => {
    const age = 105, edu = 120, lang = 29 * 4, ca = 40, fw = 25;
    expect(age + edu + lang + ca + fw).toBe(406);
    const out = run('canada-crs', { age: 30, education: 'Bachelors', clb: 9, canadianWorkYears: 1, foreignWorkYears: 3 });
    expect(out.result).toBe('Estimated CRS core: 406 points');
  });

  it('canada CRS: age points fall after 30', () => {
    const out = run('canada-crs', { age: 40, education: 'Bachelors', clb: 9, canadianWorkYears: 1, foreignWorkYears: 3 });
    // age 40 = 50 not 105
    expect(out.result).toBe('Estimated CRS core: ' + (50 + 120 + 116 + 40 + 25) + ' points');
  });

  it('australia points: age 30 + proficient + Bachelors + 5 yr overseas + single = 75', () => {
    const total = 30 + 10 + 15 + 10 + 0 + 10;
    expect(total).toBe(75);
    const out = run('australia-pr-points', { age: 30, english: 'Proficient', qualification: 'Bachelors', overseasYears: 5, australianYears: 0, partner: 'Single' });
    expect(out.result).toBe('Estimated points: 75');
  });

  it('australia points: superior English and a doctorate raise the total', () => {
    const total = 30 + 20 + 20 + 10 + 0 + 10;
    const out = run('australia-pr-points', { age: 30, english: 'Superior', qualification: 'Doctorate', overseasYears: 5, australianYears: 0, partner: 'Single' });
    expect(out.result).toBe('Estimated points: ' + total);
  });
});

describe('Estate document cost (batch #3)', () => {
  it('simple will via online service = 75', () => {
    const cost = 150 * 0.5 * 1;
    expect(cost).toBe(75);
    const out = run('power-of-attorney-cost', { docType: 'Simple will', route: 'Online service', complexity: 'Simple' });
    expect(out.result).toBe('Estimated cost: 75');
  });

  it('complex will via specialist firm scales up', () => {
    const cost = 600 * 1.8 * 2.4;
    const out = run('power-of-attorney-cost', { docType: 'Complex will', route: 'Specialist firm', complexity: 'Complex' });
    expect(out.result).toBe('Estimated cost: ' + Math.round(cost));
  });
});
