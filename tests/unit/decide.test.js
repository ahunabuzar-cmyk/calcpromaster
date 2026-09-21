import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

function loadDecide() {
  const src = readFileSync(join(ROOT, 'js', 'decide.js'), 'utf8');
  const sandbox = { module: { exports: {} } };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.module.exports;
}

describe('decide.js (S11+S12)', () => {
  let D;
  beforeEach(() => { D = loadDecide(); });

  it('#78 inThumbZone flags only the bottom third', () => {
    expect(D.inThumbZone(700, 900)).toBe(true);
    expect(D.inThumbZone(500, 900)).toBe(false);
  });

  it('#80 auditTapTargets fails small elements only', () => {
    const els = [
      { id: 'ok', tag: 'button', width: 44, height: 44 },
      { id: 'tiny', tag: 'a', width: 24, height: 24 },
      { id: 'wide-flat', tag: 'button', width: 200, height: 30 },
    ];
    const fail = D.auditTapTargets(els);
    expect(fail.map((f) => f.id)).toEqual(['tiny', 'wide-flat']);
  });

  it('#81 scrollAboveKeyboard returns 0 when already visible', () => {
    expect(D.scrollAboveKeyboard(300, 300, 800)).toBe(0);
    expect(D.scrollAboveKeyboard(700, 300, 800)).toBe(208); // 700-(800-300)+8
  });

  it('#82 pullToRefresh only on list pages at top', () => {
    expect(D.pullToRefreshAllowed('category', 0)).toBe(true);
    expect(D.pullToRefreshAllowed('category', 100)).toBe(false);
    expect(D.pullToRefreshAllowed('tool', 0)).toBe(false);
  });

  describe('#84 wizard', () => {
    const cats = {
      finance: { tools: [{ id: 'loan-emi', name: 'Loan EMI Calculator' }, { id: 'savings-goal', name: 'Savings Goal' }] },
      health: { tools: [{ id: 'bmi', name: 'BMI Calculator' }] },
    };
    it('routes money+loan to loan EMI', () => {
      const r = D.recommend(cats, { task: 'money', area: 'loan' });
      expect(r).toEqual({ id: 'loan-emi', cat: 'finance', name: 'Loan EMI Calculator' });
    });
    it('routes health+weight to BMI', () => {
      expect(D.recommend(cats, { task: 'health', area: 'weight' }).id).toBe('bmi');
    });
    it('returns null for unknown combos', () => {
      expect(D.recommend(cats, { task: 'money', area: 'yoga' })).toBeNull();
      expect(D.recommend(cats, {})).toBeNull();
    });
  });

  it('#85 checklist gives category-specific items with a default', () => {
    expect(D.checklist('finance')).toContain('The interest rate (annual %)');
    expect(D.checklist('astronomy')).toHaveLength(2);
  });

  describe('#86 interpretation scale', () => {
    it('places BMI values on the public ranges', () => {
      const r1 = D.interpret(D.SCALES.bmi, 22);
      expect(r1.label).toBe('Healthy weight');
      expect(r1.level).toBe('good');
      const r2 = D.interpret(D.SCALES.bmi, 17);
      expect(r2.level).toBe('warn');
      const r3 = D.interpret(D.SCALES.bmi, 33);
      expect(r3.level).toBe('warn');
    });
    it('clamps percent 0-100', () => {
      expect(D.interpret(D.SCALES.dti, -5).pct).toBe(0);
      expect(D.interpret(D.SCALES.dti, 90).pct).toBe(90); // inside the 0-100 scale
      expect(D.interpret(D.SCALES.dti, 120).pct).toBe(100); // off-scale high clamps
    });
    it('returns null without ranges', () => {
      expect(D.interpret([], 5)).toBeNull();
    });
  });

  it('#87 oneLineSummary builds a plain sentence', () => {
    expect(D.oneLineSummary('x', 'Monthly payment', 'Rs 45,000')).toBe('In short: Monthly payment is Rs 45,000.');
    expect(D.oneLineSummary('x', null, 'v')).toBe('');
  });

  it('#89 estimate note is honest, no guarantees', () => {
    expect(D.ESTIMATE_NOTE).toMatch(/estimate/i);
    expect(D.ESTIMATE_NOTE).toMatch(/can differ/i);
    expect(D.ESTIMATE_NOTE).not.toMatch(/100%|exact|guarantee/i);
  });

  describe('#90 timeline', () => {
    it('builds milestone positions and ISO dates', () => {
      const t = D.buildTimeline([
        { label: 'Start', offsetMonths: 0 },
        { label: 'Halfway', offsetMonths: 12 },
        { label: 'Debt-free', offsetMonths: 24 },
      ], '2026-01-31T00:00:00Z');
      expect(t).toHaveLength(3);
      expect(t[0].iso).toBe('2026-01-31');
      expect(t[2].position).toBe(100);
      expect(t[2].last).toBe(true);
    });
    it('clamps month overflow (Jan 31 + 1 month stays in February)', () => {
      const t = D.buildTimeline([{ label: 'x', offsetMonths: 1 }], '2026-01-31T00:00:00Z');
      expect(t[0].iso.slice(5, 7)).toBe('02');
    });
    it('empty stages -> empty timeline', () => {
      expect(D.buildTimeline([])).toEqual([]);
    });
  });
});
