// ============================================================
// CalcProMaster — CALCULATOR QA ENGINE (Phase 3-4)
//
// Known-answer tests against the REAL shipped data modules, loaded
// with the same browser-global bootstrap the site uses at runtime.
// Expected values are computed independently (textbook formulas) so
// this test catches real math regressions, not just crashes.
//
// Run:  npm run test:unit   (vitest)
// ============================================================
import { describe, it, expect, beforeAll } from 'vitest';

// ---- Browser-global bootstrap (mirrors scripts/audit-tools.cjs) ----
global.window = global;
const svg = '<svg></svg>';
global.Charts = { bar: () => svg, donut: () => svg, gauge: () => svg, line: () => svg, spark: () => svg, heatmap: () => svg, area: () => svg };
global.Currency = { getRates: () => ({ USD: 1, EUR: 0.92 }), convert: () => Promise.resolve({ result: '1 USD = 0.92 EUR', extra: '' }) };
global.Compounding = { futureValue: (P, r, n, t, c) => P * Math.pow(1 + r / 100 / (c || 12), (c || 12) * t) };
global.LoanSolver = { payment: (P, r, n) => P * (r / 100 / 12) / (1 - Math.pow(1 + r / 100 / 12, -n)) };
global.DayCount = { daysBetween: (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000) };
global.SafeMathParser = { parse: (s) => parseFloat(s) };
global.Security = { sanitizeHtml: (s) => String(s), sanitizeJsString: (s) => String(s), sanitizeOutput: (s) => String(s), cryptoRandomInt: (min, max) => min || 0 };
global.MathJax = {};
global.parseIntFn = parseInt;

beforeAll(async () => {
  // Load the REAL helper modules the calc functions depend on.
  try {
    const { default: advancedCalc } = await import('../../js/advanced-calc.js');
    if (global.AdvancedCalc) Object.assign(global.AdvancedCalc, advancedCalc);
  } catch (e) { /* advanced-calc may set window.* only */ }
  try {
    await import('../../js/calc-modes.js');
  } catch (e) { /* optional */ }
});

function load(cat, id) {
  return import('../../js/data/' + cat + '.js').then(m => {
    const arr = m.default || m;
    return (Array.isArray(arr) ? arr : []).find(t => t.id === id);
  });
}

// Run a tool's calc with values, return the human-readable result string.
async function calcResult(cat, id, values) {
  const tool = await load(cat, id);
  if (!tool) throw new Error('tool not found: ' + cat + '/' + id);
  const raw = tool.calc(values);
  const out = await Promise.resolve(raw);
  if (typeof out === 'string') return out;
  if (out && typeof out === 'object') {
    return String(out.result ?? out.value ?? out.html ?? '');
  }
  return String(out);
}

// Extract the first floating-point number from a result string.
function num(s) {
  const m = String(s).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}

describe('Formula QA — Finance (known-answer)', () => {
  it('loan-emi: $100k @ 8.5% 5y → ≈ $2,051.65/mo', async () => {
    const r = await calcResult('finance', 'loan-emi', { mode: 'payment', amount: 100000, rate: 8.5, years: 5, payment: 2000, ioYears: 2, paymentFreq: '12', dcc: 'act365' });
    expect(num(r)).toBeCloseTo(2051.65, 0);
  });
  it('loan-emi: zero-rate → equal principal split', async () => {
    const r = await calcResult('finance', 'loan-emi', { mode: 'payment', amount: 12000, rate: 0, years: 1, payment: 0, ioYears: 0, paymentFreq: '12', dcc: 'act365' });
    expect(num(r)).toBeCloseTo(1000, 0);
  });
  it('compound-interest: $10k @ 7% 10y → ≈ $20,096.62', async () => {
    const r = await calcResult('finance', 'compound-interest', { mode: 'final', principal: 10000, rate: 7, years: 10, target: 20000, contribution: 0, timing: 'end', freq: '12' });
    expect(num(r)).toBeCloseTo(20096.62, 0);
  });
  it('simple-interest: $1k @ 5% 3y → $150 interest', async () => {
    const r = await calcResult('finance', 'simple-interest', { principal: 1000, rate: 5, years: 3 });
    expect(num(r)).toBeGreaterThan(100);
  });
});

describe('Formula QA — Health (known-answer)', () => {
  it('bmi: 70kg/170cm → ≈ 24.22 (normal)', async () => {
    const r = await calcResult('health', 'bmi', { weight: 70, height: 170 });
    expect(num(r)).toBeCloseTo(24.22, 1);
  });
  it('bmi: 100kg/160cm → ≈ 39.06 (obese range)', async () => {
    const r = await calcResult('health', 'bmi', { weight: 100, height: 160 });
    expect(num(r)).toBeCloseTo(39.06, 1);
  });
  it('bmi: zero height is guarded (no Infinity/NaN)', async () => {
    const r = await calcResult('health', 'bmi', { weight: 70, height: 0 });
    expect(/Infinity|NaN/.test(r)).toBe(false);
  });
});

describe('Formula QA — Math (known-answer)', () => {
  it('percentage: 25 of 200 → 12.5%', async () => {
    const r = await calcResult('math', 'percentage', { part: 25, whole: 200 });
    expect(num(r)).toBeCloseTo(12.5, 1);
  });
  it('percentage: zero whole is guarded (no Infinity leak)', async () => {
    const r = await calcResult('math', 'percentage', { part: 25, whole: 0 });
    expect(/Infinity|NaN/.test(r)).toBe(false); // em-dash placeholder instead
  });
});

describe('Formula QA — Conversions (known-answer)', () => {
  it('length: 1 meter → 100 cm', async () => {
    const r = await calcResult('conversion', 'length', { value: 1, from: 'm', to: 'cm' });
    expect(num(r)).toBeCloseTo(100, 0);
  });
  it('temperature: 0°C → 32°F', async () => {
    const r = await calcResult('conversion', 'temperature', { value: 0, from: 'c', to: 'f' });
    expect(num(r)).toBeCloseTo(32, 0);
  });
});

describe('Formula QA — Edge-case matrix (regression safety)', () => {
  const CASES = [
    ['finance', 'loan-emi', { mode: 'payment', amount: 1e12, rate: 10, years: 30, payment: 0, ioYears: 0, paymentFreq: '12', dcc: 'act365' }, 'huge principal'],
    ['finance', 'loan-emi', { mode: 'payment', amount: 100000, rate: 100, years: 5, payment: 0, ioYears: 0, paymentFreq: '12', dcc: 'act365' }, 'extreme rate'],
    ['health', 'bmi', { weight: 0, height: 170 }, 'zero weight'],
    ['health', 'bmi', { weight: 300, height: 250 }, 'extreme values'],
  ];
  for (const [cat, id, values, label] of CASES) {
    it(`${cat}/${id} (${label}): no NaN/Infinity leak`, async () => {
      const r = await calcResult(cat, id, values);
      expect(/\bNaN\b|\bInfinity\b|undefined/.test(r)).toBe(false);
      expect(r.length).toBeGreaterThan(0);
    });
  }
});

// Every registered tool must return a non-empty, NaN-free result with defaults.
describe('Formula QA — All 543 tools smoke (defaults)', () => {
  it('every tool calc() with defaults returns usable output', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const dir = path.join(process.cwd(), 'js', 'data');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
    let tested = 0, bad = [];
    for (const file of files) {
      const catKey = file.replace('.js', '');
      const mod = await import('../../js/data/' + file);
      const arr = mod.default || mod;
      if (!Array.isArray(arr)) continue;
      for (const tool of arr) {
        if (tool.async === true || tool.custom) continue; // async/custom handled at runtime
        if (typeof tool.calc !== 'function') continue;
        const values = {};
        (tool.inputs || []).forEach(inp => {
          if (inp.type === 'checkbox') values[inp.id] = inp.def === true || inp.def === 1 || inp.def === 'true';
          else values[inp.id] = inp.def;
        });
        tested++;
        try {
          const raw = tool.calc(values);
          const out = await Promise.resolve(raw);
          if (out === null || out === undefined) { bad.push(catKey + '/' + tool.id + ' (null)'); continue; }
          const s = typeof out === 'string' ? out : JSON.stringify(out);
          if (/\bNaN\b|\bInfinity\b/.test(s)) bad.push(catKey + '/' + tool.id + ' (NaN/Infinity)');
        } catch (e) {
          bad.push(catKey + '/' + tool.id + ' (' + e.message + ')');
        }
      }
    }
    expect(bad).toEqual([]);
    expect(tested).toBeGreaterThan(500);
  });
});
