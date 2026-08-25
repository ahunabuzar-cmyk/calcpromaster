// Regression tests for Phase-2 edge-case fixes.
// Every test asserts the FIXED behavior — a revert of any cap/guard below
// fails the suite. Expected values are derived independently (textbook),
// never from the tool's own calc().
import { describe, it, expect, beforeAll } from 'vitest';

// ---- Browser-global bootstrap (mirrors formula-qa-full.test.js) ----
global.window = global;
const svg = '<svg></svg>';
global.Charts = { bar: () => svg, donut: () => svg, gauge: () => svg, line: () => svg, spark: () => svg, heatmap: () => svg, area: () => svg };
global.Currency = { getRates: () => ({ USD: 1, EUR: 0.92 }), convert: () => Promise.resolve({ result: '', extra: '' }) };
global.Compounding = { futureValue: (P, r, n, t, c) => P * Math.pow(1 + r / 100 / (c || 12), (c || 12) * t) };
global.LoanSolver = { payment: (P, r, n) => P * (r / 100 / 12) / (1 - Math.pow(1 + r / 100 / 12, -n)) };
global.DayCount = { daysBetween: (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000) };
global.SafeMathParser = { parse: (s) => parseFloat(s) };
global.Security = { sanitizeHtml: (s) => String(s), sanitizeJsString: (s) => String(s), sanitizeOutput: (s) => String(s), cryptoRandomInt: (min) => min || 0, sanitizeCalcValue: (v, d) => { const n = parseFloat(v); return isFinite(n) ? n : d; }, validateInput: (s) => String(s) };
global.Module = {};
// Node 24 exposes globalThis.crypto (webcrypto) natively — do NOT overwrite it.

let core;
beforeAll(async () => {
  core = await import('../../js/core.js');
  global.Charts = core.Charts;
  global.AdvancedCalc = core.AdvancedCalc;
  try { const cm = await import('../../js/calc-modes.js'); Object.assign(global, cm.default || cm); } catch (e) {}
  try { const sm = await import('../../js/safe-math.js'); global.safeEval = sm.safeEval; } catch (e) {}
});

function load(cat, id) {
  return import('../../js/data/' + cat + '.js').then((m) => {
    const arr = m.default || m;
    return (Array.isArray(arr) ? arr : []).find((t) => t.id === id);
  });
}

async function runCalc(cat, id, values) {
  const tool = await load(cat, id);
  const raw = tool.calc(values);
  const out = await Promise.resolve(raw);
  return String(out?.result ?? out?.value ?? '');
}

describe('Loop-safety caps (huge-input hang fixes)', () => {
  it('generateAmortization caps the schedule at 600 rows but keeps totals exact', () => {
    const r = core.AdvancedCalc.generateAmortization(200000, 6.5, 30, 0);
    expect(r.schedule.length).toBe(360); // 30y × 12mo — under cap, full schedule
    expect(r.emi).toBeCloseTo(1264.14, 1); // textbook P·r/(1-(1+r)^-n) = $1,264.14
    const huge = core.AdvancedCalc.generateAmortization(200000, 6.5, 1e15, 0);
    expect(huge.schedule.length).toBeLessThanOrEqual(600); // capped — no OOM hang
    expect(huge.truncated).toBe(true);
    expect(Number.isFinite(huge.emi)).toBe(true);
  });

  it('compoundSteps caps steps at 600', () => {
    const r = core.AdvancedCalc.compoundSteps(1000, 10, 5, 12);
    expect(r.steps.length).toBe(6); // years 0..5
    expect(r.final).toBeCloseTo(1000 * Math.pow(1 + 0.1 / 12, 60), 0);
    const huge = core.AdvancedCalc.compoundSteps(1000, 10, 1e15, 12);
    expect(huge.steps.length).toBeLessThanOrEqual(601);
  });

  it('math/factorial caps at 170 iterations (no hang on 1e15)', async () => {
    const out = await runCalc('math', 'factorial', { n: 1e15 });
    expect(out).not.toMatch(/NaN|Infinity/);
  });

  it('math/combinations caps its factorial (no hang on 1e15)', async () => {
    const out = await runCalc('math', 'combinations', { n: 1e15, r: 3 });
    expect(out).not.toMatch(/NaN|Infinity/);
  });

  it('regional/ppf-calculator caps years at 100 (no hang on 1e15)', async () => {
    const out = await runCalc('regional', 'ppf-calculator', { annual: 150000, rate: 7.1, years: 1e15 });
    expect(out).toContain('Maturity');
    expect(out).not.toMatch(/NaN|Infinity/);
  });

  it('regional/sip-return caps years (no hang on 1e15)', async () => {
    const out = await runCalc('regional', 'sip-return', { monthly: 5000, returnRate: 12, years: 1e15, stepUp: 10 });
    expect(out).not.toMatch(/NaN|Infinity/);
  });

  it('career/salary-negotiation caps years at 100 (no hang on 1e15)', async () => {
    const out = await runCalc('career-freelance', 'salary-negotiation', { offered: 80000, asking: 90000, years: 1e15 });
    expect(out).not.toMatch(/NaN|Infinity/);
  });

  it('utilities/uuid-gen caps count at 100', async () => {
    const out = await runCalc('utilities', 'uuid-gen', { count: 1e15 });
    // 100 UUIDs × 36 chars + <br> + <code> wrapper — result stays bounded
    expect(out.length).toBeLessThan(100 * 45);
    expect(out).not.toMatch(/NaN|Infinity/);
  });

  it('utilities/password-gen caps length at 256', async () => {
    const out = await runCalc('utilities', 'password-gen', { length: 1e15, numbers: true, symbols: true });
    // capped at 256 chars + <code> wrapper
    expect(out.length).toBeLessThan(350);
  });

  it('utilities/lorem-ipsum caps paragraphs at 100', async () => {
    const out = await runCalc('utilities', 'lorem-ipsum', { paragraphs: 1e15 });
    expect(out.length).toBeLessThan(100 * 400);
  });
});

describe('Infinity guard behavior (lens-style 1/0 cases)', () => {
  it('science/lens returns a message, not "Infinity cm", when f == do', async () => {
    // f=10, do=10 → 1/f - 1/do = 0 → di = 1/0 = Infinity
    const out = await runCalc('science', 'lens', { f: 10, do: 10 });
    expect(out).not.toMatch(/Infinity|NaN/);
  });

  it('science/frequency never shows Infinity on period=0', async () => {
    const out = await runCalc('science', 'frequency', { period: 0 });
    expect(out).not.toMatch(/Infinity|NaN/);
  });

  it('finance/tip shows a friendly value for zero bill (no NaN)', async () => {
    const out = await runCalc('finance', 'tip', { bill: 0, tipPct: 15 });
    expect(out).not.toMatch(/NaN/);
  });
});
