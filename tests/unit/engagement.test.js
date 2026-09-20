import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const src = readFileSync(join(ROOT, 'js', 'engagement.js'), 'utf8');

function load() {
  const sandbox = { module: { exports: {} }, window: undefined, Date };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.module.exports;
}

describe('S7 engagement', () => {
  let E;
  beforeAll(() => { E = load(); });

  // --- facts ---
  it('fact dataset covers major categories with real content', () => {
    const cats = Object.keys(E.FACTS);
    expect(cats.length).toBeGreaterThanOrEqual(9);
    for (const c of cats) {
      expect(E.FACTS[c].length, c).toBeGreaterThanOrEqual(2);
      E.FACTS[c].forEach(f => {
        expect(f.length, c).toBeGreaterThan(60); // substantive, not filler
        expect(f).not.toMatch(/\d{4}\s*(users|people|visitors)/i); // no fabricated counts
        expect(f).not.toMatch(/best|world's|leading|#1/i); // no marketing claims
      });
    }
  });

  it('pickFact is deterministic per seed and rotates across seeds', () => {
    const a = E.pickFact('finance', 'loan-emi');
    const b = E.pickFact('finance', 'loan-emi');
    expect(b).toBe(a); // stable per tool
    const pool = new Set();
    for (let i = 0; i < 20; i++) pool.add(E.pickFact('finance', 'tool-' + i));
    expect(pool.size).toBeGreaterThan(1); // variety across tools
  });

  it('pickFact returns null for unknown category', () => {
    expect(E.pickFact('nonexistent-cat', 'x')).toBe(null);
  });

  it('renderFactPanel embeds the fact in an aside with aria content', () => {
    const html = E.renderFactPanel('health', 'bmi');
    expect(html).toContain('cp-funfact');
    expect(html).toContain('Did you know');
    expect(html).toContain(E.pickFact('health', 'bmi'));
  });

  it('renderFactPanel returns empty string when no facts exist', () => {
    expect(E.renderFactPanel('unknown-cat', 'x')).toBe('');
  });

  // --- seasonal ---
  it('seasonal windows are valid (start<=end for non-wrapping)', () => {
    for (const s of E.seasons()) {
      if (s.startM <= s.endM) {
        expect(s.startD).toBeGreaterThanOrEqual(1);
        expect(s.endD).toBeLessThanOrEqual(31);
      }
    }
  });

  it('zakat surfaces during the Ramadan window (late March)', () => {
    const pick = E.seasonalPick(new Date(2026, 2, 20)); // Mar 20
    expect(pick).toBeTruthy();
    expect(pick.slug).toBe('zakat-calculator');
  });

  it('tax season surfaces after the zakat window closes (mid-April)', () => {
    const pick = E.seasonalPick(new Date(2026, 3, 15)); // Apr 15 — outside zakat (ends Apr 10), inside tax (Mar 1–Apr 30)
    expect(pick).toBeTruthy();
    expect(pick.slug).toBe('income-tax');
  });

  it('overlapping windows resolve by declared order (zakat first in Feb 15–Apr 10)', () => {
    const pick = E.seasonalPick(new Date(2026, 3, 5)); // Apr 5 — inside BOTH windows
    expect(pick.slug).toBe('zakat-calculator'); // first declared wins
  });

  it('year-wrapping window (Dec → Jan) matches both sides', () => {
    const dec = E.seasonalPick(new Date(2026, 11, 15));
    const jan = E.seasonalPick(new Date(2026, 0, 15));
    expect(dec && dec.slug).toBe('electricity-cost');
    expect(jan && jan.slug).toBe('electricity-cost');
  });

  it('no season active on a neutral date (July 10)', () => {
    expect(E.seasonalPick(new Date(2026, 6, 10))).toBe(null);
  });

  it('renderSeasonalBanner links to a valid route and is empty off-season', () => {
    const html = E.renderSeasonalBanner(new Date(2026, 2, 20));
    expect(html).toContain('cp-seasonal');
    expect(html).toContain('href="/regional/zakat-calculator"');
    expect(E.renderSeasonalBanner(new Date(2026, 6, 10))).toBe('');
  });

  it('banner seasons point at slugs that follow category/slug URL shape', () => {
    for (const s of E.seasons()) {
      expect(s.slug).toMatch(/^[a-z0-9-]+$/);
      expect(s.cat).toMatch(/^[a-z-]+$/);
    }
  });
});
