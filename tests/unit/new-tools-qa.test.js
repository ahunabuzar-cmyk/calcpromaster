// ============================================================
// CalcProMaster — Known-answer QA for the two newest calculators
//
//   math/proportion              — a ÷ b = c ÷ d, solve for one unknown
//   health/peptide-reconstitution — mg vial + mL diluent → concentration,
//                                   draw volume and syringe units
//
// Expected values are derived independently (cross multiplication and
// concentration arithmetic) rather than read back from the implementation,
// so a formula regression fails the suite instead of silently agreeing
// with itself. Edge cases cover zero denominators, degenerate proportions,
// negative and decimal values, invalid input and non-finite guards.
//
// Run:  npm run test:unit
// ============================================================
import { describe, it, expect, beforeAll } from 'vitest';

// ---- Browser-global bootstrap (mirrors tests/unit/formula-qa.test.js) ----
global.window = global;
const svg = '<svg></svg>';
global.Charts = { bar: () => svg, donut: () => svg, gauge: () => svg, line: () => svg, spark: () => svg, heatmap: () => svg, area: () => svg };
global.Security = { sanitizeHtml: (s) => String(s), sanitizeOutput: (s) => String(s), validateInput: (v) => v, sanitizeCalcValue: (v, d) => (isFinite(parseFloat(v)) ? parseFloat(v) : d) };
global.AdvancedCalc = global.AdvancedCalc || {};

let proportion, peptide;

beforeAll(async () => {
  const mathMod = await import('../../js/data/math.js');
  const mathArr = mathMod.default || mathMod;
  proportion = (Array.isArray(mathArr) ? mathArr : []).find((t) => t.id === 'proportion');

  const healthMod = await import('../../js/data/health.js');
  const healthArr = healthMod.default || healthMod;
  peptide = (Array.isArray(healthArr) ? healthArr : []).find((t) => t.id === 'peptide-reconstitution');
});

const call = (tool, values) => {
  const out = tool.calc(values);
  return typeof out === 'string' ? { result: out, extra: '' } : (out || {});
};
// First number in a result string (handles "d = 12", "Draw 0.1 mL (10 units)").
const num = (s) => {
  const m = String(s).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
};

describe('registry — both new tools are present and well-formed', () => {
  it('math/proportion exists with 4 numeric fields + an unknown selector', () => {
    expect(proportion).toBeTruthy();
    const ids = proportion.inputs.map((i) => i.id);
    expect(ids).toEqual(['a', 'b', 'c', 'd', 'unknown']);
    expect(proportion.inputs.find((i) => i.id === 'unknown').type).toBe('select');
    expect(typeof proportion.calc).toBe('function');
    expect(typeof proportion.steps).toBe('function');
  });

  it('health/peptide-reconstitution exists with mg/mL/µg inputs + syringe scale', () => {
    expect(peptide).toBeTruthy();
    expect(peptide.inputs.map((i) => i.id)).toEqual(['vialMg', 'volumeMl', 'amountMcg', 'scale']);
    expect(typeof peptide.calc).toBe('function');
    expect(typeof peptide.steps).toBe('function');
  });
});

describe('math/proportion — known answers (a ÷ b = c ÷ d)', () => {
  // Independent expectation: d = b·c / a
  it('3/4 = 9/d → d = 12', () => {
    expect(num(call(proportion, { a: 3, b: 4, c: 9, d: 0, unknown: 'd' }).result)).toBe(12);
  });
  it('a/4 = 9/12 → a = 3 (a = b·c / d)', () => {
    expect(num(call(proportion, { a: 0, b: 4, c: 9, d: 12, unknown: 'a' }).result)).toBe(3);
  });
  it('3/b = 9/12 → b = 4 (b = a·d / c)', () => {
    expect(num(call(proportion, { a: 3, b: 0, c: 9, d: 12, unknown: 'b' }).result)).toBe(4);
  });
  it('3/4 = c/12 → c = 9 (c = a·d / b)', () => {
    expect(num(call(proportion, { a: 3, b: 4, c: 0, d: 12, unknown: 'c' }).result)).toBe(9);
  });

  it('decimals: 1.5/2.5 = 3/d → d = 5', () => {
    expect(num(call(proportion, { a: 1.5, b: 2.5, c: 3, d: 0, unknown: 'd' }).result)).toBeCloseTo(5, 6);
  });
  it('decimals: 0.4/2 = c/9 → c = 1.8', () => {
    expect(num(call(proportion, { a: 0.4, b: 2, c: 0, d: 9, unknown: 'c' }).result)).toBeCloseTo(1.8, 6);
  });

  it('negatives: −3/4 = 9/d → d = −12', () => {
    expect(num(call(proportion, { a: -3, b: 4, c: 9, d: 0, unknown: 'd' }).result)).toBe(-12);
  });
  it('negatives: −6/−8 = 9/d → d = 12 (two negatives cancel)', () => {
    expect(num(call(proportion, { a: -6, b: -8, c: 9, d: 0, unknown: 'd' }).result)).toBe(12);
  });

  it('result is self-consistent: cross products a·d and b·c are equal', () => {
    const out = call(proportion, { a: 7, b: 3, c: 21, d: 0, unknown: 'd' });
    const d = num(out.result);
    expect(7 * d).toBeCloseTo(3 * 21, 6); // 7·9 = 63 = 3·21
  });

  it('extra line reports the equal ratios for a valid solve', () => {
    const out = call(proportion, { a: 3, b: 4, c: 9, d: 0, unknown: 'd' });
    expect(out.extra).toMatch(/Cross products/);
    expect(out.extra).toMatch(/0\.75 = 0\.75/);
  });

  it('steps describe cross multiplication and the verification step', () => {
    const steps = proportion.steps({ a: 3, b: 4, c: 9, d: 12, unknown: 'd' });
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.join('\n')).toMatch(/Cross multiply/);
    expect(steps.join('\n')).toMatch(/d = 12/);
    expect(steps.join('\n')).toMatch(/proportion is exact/);
  });
});

describe('math/proportion — degenerate + invalid input', () => {
  it('zero divisor (a = 0, solve d) → no unique solution, explains why', () => {
    const out = call(proportion, { a: 0, b: 4, c: 9, d: 12, unknown: 'd' });
    expect(out.result).toMatch(/No unique solution/);
    expect(out.result).toMatch(/\ba\b is 0/);
  });
  it('zero divisor (c = 0, solve b) → no unique solution', () => {
    const out = call(proportion, { a: 3, b: 4, c: 0, d: 12, unknown: 'b' });
    expect(out.result).toMatch(/No unique solution/);
    expect(out.result).toMatch(/\bc\b is 0/);
  });
  it('degenerate: answer would put 0 in a denominator → no solution', () => {
    // 3/4 = 0/d solves d = 0, which makes the right-hand ratio undefined.
    const out = call(proportion, { a: 3, b: 4, c: 0, d: 5, unknown: 'd' });
    expect(out.result).toMatch(/No solution/);
    expect(out.result).toMatch(/denominator of 0/);
  });
  it('0/4 = 0/d is the indeterminate 0 = 0 case → flagged, not answered with a number', () => {
    const out = call(proportion, { a: 0, b: 4, c: 0, d: 5, unknown: 'd' });
    expect(out.result).toMatch(/No unique solution/);
    expect(/\d+\s*=\s*0$/.test(out.result)).toBe(false);
  });
  it('non-numeric input → asks for a number in every field', () => {
    const out = call(proportion, { a: 'x', b: 4, c: 9, d: 12, unknown: 'd' });
    expect(out.result).toMatch(/Enter a number/);
  });
  it('missing field (NaN) → asks for a number, never returns NaN', () => {
    const out = call(proportion, { a: 3, b: undefined, c: 9, d: 12, unknown: 'd' });
    expect(out.result).toMatch(/Enter a number/);
    expect(/\bNaN\b|\bInfinity\b/.test(out.result)).toBe(false);
  });
  it('unknown selector set to an invalid key → prompts for a choice', () => {
    const out = call(proportion, { a: 3, b: 4, c: 9, d: 12, unknown: 'zzz' });
    expect(out.result).toMatch(/Choose which of a, b, c or d is unknown/);
  });
  it('steps for a zero divisor stop without inventing a number', () => {
    const steps = proportion.steps({ a: 0, b: 4, c: 9, d: 12, unknown: 'd' }).join('\n');
    expect(steps).toMatch(/no unique finite answer/);
  });
});

describe('health/peptide-reconstitution — known answers', () => {
  // Concentration = mg vial ÷ mL diluent. Draw volume = (µg ÷ 1000) ÷ (mg/mL).
  // U-100/U-50/U-40: units = draw volume × units-per-mL.
  it('5 mg in 2 mL, 250 µg, U-100 → 0.1 mL (10 units)', () => {
    const out = call(peptide, { vialMg: 5, volumeMl: 2, amountMcg: 250, scale: '100' });
    expect(out.result).toMatch(/0\.1 mL/);
    expect(out.result).toMatch(/10 units/);
  });
  it('10 mg in 1 mL, 500 µg, U-40 → 0.05 mL (2 units)', () => {
    const out = call(peptide, { vialMg: 10, volumeMl: 1, amountMcg: 500, scale: '40' });
    expect(num(out.result)).toBeCloseTo(0.05, 6);
    expect(out.result).toMatch(/2 units/);
  });
  it('5 mg in 2 mL, 1000 µg, U-100 → 0.4 mL (40 units)', () => {
    const out = call(peptide, { vialMg: 5, volumeMl: 2, amountMcg: 1000, scale: '100' });
    expect(out.result).toMatch(/0\.4 mL/);
    expect(out.result).toMatch(/40 units/);
  });
  it('5 mg in 2 mL, 250 µg, U-50 → 0.1 mL (5 units)', () => {
    const out = call(peptide, { vialMg: 5, volumeMl: 2, amountMcg: 250, scale: '50' });
    expect(out.result).toMatch(/0\.1 mL/);
    expect(out.result).toMatch(/5 units/);
  });
  it('12 mg in 3 mL = 4 mg/mL, 200 µg → 0.05 mL (5 units U-100)', () => {
    const out = call(peptide, { vialMg: 12, volumeMl: 3, amountMcg: 200, scale: '100' });
    expect(out.extra).toMatch(/4 mg\/mL/);
    expect(num(out.result)).toBeCloseTo(0.05, 6);
  });
  it('concentration maths is independently correct (5 ÷ 2 = 2.5 mg/mL = 2500 µg/mL)', () => {
    const out = call(peptide, { vialMg: 5, volumeMl: 2, amountMcg: 250, scale: '100' });
    expect(out.extra).toMatch(/2\.5 mg\/mL/);
    expect(out.extra).toMatch(/2500 µg\/mL/);
  });
  it('draw volume × concentration returns the requested mass (round-trip)', () => {
    const out = call(peptide, { vialMg: 7, volumeMl: 1.4, amountMcg: 300, scale: '100' });
    const drawMl = num(out.result);
    const mgPerMl = 7 / 1.4; // 5 mg/mL
    expect(drawMl * mgPerMl * 1000).toBeCloseTo(300, 3); // back to µg
  });
  it('extra line states the arithmetic-only limitation', () => {
    const out = call(peptide, { vialMg: 5, volumeMl: 2, amountMcg: 250, scale: '100' });
    expect(out.extra).toMatch(/ARITHMETIC ONLY/);
    expect(out.extra).toMatch(/never recommends a dose/);
    expect(out.extra).toMatch(/volume mark, not a mass/);
  });
  it('steps show the three conversions and the mass/volume warning', () => {
    const steps = peptide.steps({ vialMg: 5, volumeMl: 2, amountMcg: 250, scale: '100' }).join('\n');
    expect(steps).toMatch(/Concentration = vial amount ÷ reconstitution volume/);
    expect(steps).toMatch(/2\.5 mg\/mL/);
    expect(steps).toMatch(/Syringe units/);
    expect(steps).toMatch(/volume \(mL, syringe units\) are different quantities|never read a syringe unit as a mass/);
  });
});

describe('health/peptide-reconstitution — validation + edge cases', () => {
  it('zero reconstitution volume → guided message, no division by zero', () => {
    const out = call(peptide, { vialMg: 5, volumeMl: 0, amountMcg: 250, scale: '100' });
    expect(out.result).toMatch(/above 0 mL/);
    expect(/\bNaN\b|\bInfinity\b/.test(JSON.stringify(out))).toBe(false);
  });
  it('negative vial amount → rejected', () => {
    const out = call(peptide, { vialMg: -5, volumeMl: 2, amountMcg: 250, scale: '100' });
    expect(out.result).toMatch(/above 0 mg/);
  });
  it('non-numeric vial → rejected', () => {
    const out = call(peptide, { vialMg: 'abc', volumeMl: 2, amountMcg: 250, scale: '100' });
    expect(out.result).toMatch(/above 0 mg and a reconstitution volume above 0 mL/);
  });
  it('missing dose amount (0) → concentration only, no invented answer', () => {
    const out = call(peptide, { vialMg: 5, volumeMl: 2, amountMcg: 0, scale: '100' });
    expect(out.result).toMatch(/Concentration: 2\.5 mg\/mL/);
    expect(out.result).not.toMatch(/Draw/);
    expect(out.result).not.toMatch(/\bNaN\b|\bInfinity\b/);
  });
  it('zero amount + zero volume never leaks NaN/Infinity anywhere in the output', () => {
    for (const v of [
      { vialMg: 0, volumeMl: 0, amountMcg: 0, scale: '100' },
      { vialMg: 0, volumeMl: 2, amountMcg: 250, scale: '100' },
      { vialMg: 5, volumeMl: 0, amountMcg: 0, scale: '100' }
    ]) {
      const s = JSON.stringify(call(peptide, v));
      expect(/\bNaN\b|\bInfinity\b|undefined/.test(s)).toBe(false);
    }
  });
  it('tiny draw volume stays finite and reported (0.5 mg in 5 mL, 10 µg)', () => {
    const out = call(peptide, { vialMg: 0.5, volumeMl: 5, amountMcg: 10, scale: '100' });
    expect(isFinite(num(out.result))).toBe(true);
    expect(num(out.result)).toBeCloseTo(0.1, 6); // (0.01 mg) ÷ (0.1 mg/mL)
  });
  it('large values stay finite and proportional (100 mg in 10 mL, 5000 µg)', () => {
    const out = call(peptide, { vialMg: 100, volumeMl: 10, amountMcg: 5000, scale: '100' });
    expect(num(out.result)).toBeCloseTo(0.5, 6); // (5 mg) ÷ (10 mg/mL)
    expect(out.result).toMatch(/50 units/);
  });
  it('steps for an invalid vial stop without a number', () => {
    const steps = peptide.steps({ vialMg: 0, volumeMl: 2, amountMcg: 250, scale: '100' }).join('\n');
    expect(steps).toMatch(/neither field may be zero or negative/);
  });
});
