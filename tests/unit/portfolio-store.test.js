// ============================================================
// PortfolioStore — multi-property save & revisit data model
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..', '..');

// Minimal localStorage mock so the store exercises its real persistence path.
function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => map.clear(),
    _map: map,
  };
}

let Store;
beforeEach(() => {
  global.localStorage = makeStorage();
  delete require.cache[require.resolve(join(ROOT, 'js', 'portfolio-store.js'))];
  Store = require(join(ROOT, 'js', 'portfolio-store.js'));
});

describe('PortfolioStore', () => {
  it('starts empty', () => {
    expect(Store.list()).toEqual([]);
    expect(Store.summary().count).toBe(0);
  });

  it('adds a property, assigns an id, and persists it', () => {
    const rec = Store.add({ name: 'Flat A', value: 200000, monthlyRent: 1500, monthlyCosts: 400, mortgage: 800 });
    expect(rec.id).toBeTruthy();
    expect(rec.savedAt).toBeGreaterThan(0);
    const list = Store.list();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Flat A');
    expect(Store.get(rec.id)).toMatchObject({ name: 'Flat A', monthlyRent: 1500 });
  });

  it('coerces bad numbers to zero rather than NaN', () => {
    const rec = Store.add({ name: 'X', value: 'abc', monthlyRent: undefined, monthlyCosts: null, mortgage: NaN });
    expect(rec.value).toBe(0);
    expect(rec.monthlyRent).toBe(0);
    expect(rec.monthlyCosts).toBe(0);
    expect(rec.mortgage).toBe(0);
  });

  it('updates an existing property by id', () => {
    const rec = Store.add({ name: 'Flat B', value: 100000, monthlyRent: 1000, monthlyCosts: 100, mortgage: 500 });
    const updated = Store.update(rec.id, { monthlyRent: 1200, name: 'Flat B2' });
    expect(updated.name).toBe('Flat B2');
    expect(updated.monthlyRent).toBe(1200);
    expect(Store.get(rec.id).monthlyRent).toBe(1200);
  });

  it('returns null when updating an unknown id', () => {
    expect(Store.update('nope', { value: 5 })).toBeNull();
  });

  it('removes a property', () => {
    const rec = Store.add({ name: 'Flat C' });
    expect(Store.remove(rec.id)).toBe(true);
    expect(Store.list()).toHaveLength(0);
    expect(Store.remove('missing')).toBe(false);
  });

  it('aggregates summary across saved properties', () => {
    Store.add({ name: 'P1', value: 200000, monthlyRent: 1500, monthlyCosts: 400, mortgage: 800 });
    Store.add({ name: 'P2', value: 300000, monthlyRent: 2500, monthlyCosts: 600, mortgage: 1000 });
    const s = Store.summary();
    expect(s.count).toBe(2);
    expect(s.monthlyRent).toBe(4000);
    expect(s.monthlyCosts).toBe(1000);
    expect(s.monthlyMortgage).toBe(1800);
    expect(s.monthlyNet).toBe(1200);
    expect(s.annualNet).toBe(14400);
    expect(s.grossYieldPct).toBeCloseTo((4000 * 12) / 500000 * 100, 5);
  });

  it('clear empties the store', () => {
    Store.add({ name: 'P' });
    Store.clear();
    expect(Store.list()).toEqual([]);
  });
});
