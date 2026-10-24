// ============================================================
// TrustExtras — rating, honest usage counter, reference rate
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..', '..');

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}

let Trust;
beforeEach(() => {
  global.localStorage = makeStorage();
  delete global.window;
  delete require.cache[require.resolve(join(ROOT, 'js', 'trust-extras.js'))];
  Trust = require(join(ROOT, 'js', 'trust-extras.js'));
});

describe('TrustExtras.rating', () => {
  it('stores and returns a rating per tool', () => {
    expect(Trust.getRating('bmi')).toBe(0);
    Trust.setRating('bmi', 4);
    expect(Trust.getRating('bmi')).toBe(4);
    Trust.setRating('bmi', 5);
    expect(Trust.getRating('bmi')).toBe(5);
  });

  it('clamps out-of-range ratings', () => {
    expect(Trust.setRating('x', 9)).toBe(5);
    expect(Trust.setRating('x', -3)).toBe(1);
    expect(Trust.setRating('x', 0)).toBe(1);
  });
});

describe('TrustExtras.usageFor (never invents numbers)', () => {
  it('returns null when no real data is injected', () => {
    expect(Trust.usageFor('bmi')).toBeNull();
  });
  it('returns the real number when it is present', () => {
    global.window = { __CPM_USAGE__: { bmi: 1280 } };
    delete require.cache[require.resolve(join(ROOT, 'js', 'trust-extras.js'))];
    const T2 = require(join(ROOT, 'js', 'trust-extras.js'));
    expect(T2.usageFor('bmi')).toBe(1280);
    expect(T2.usageFor('missing')).toBeNull();
    delete global.window;
  });
  it('rejects non-numeric or negative values', () => {
    global.window = { __CPM_USAGE__: { a: 'lots', b: -5 } };
    delete require.cache[require.resolve(join(ROOT, 'js', 'trust-extras.js'))];
    const T2 = require(join(ROOT, 'js', 'trust-extras.js'));
    expect(T2.usageFor('a')).toBeNull();
    expect(T2.usageFor('b')).toBeNull();
    delete global.window;
  });
});

describe('TrustExtras.referenceRate', () => {
  it('returns a labeled, sourced reference and never advice', () => {
    const r = Trust.referenceRate();
    expect(r.label).toBe('Reference only');
    expect(r.note).toMatch(/not a live quote|not financial advice/i);
    expect(r.reviewed).toMatch(/^\d{4}-\d{2}$/);
  });
});
