/**
 * S4 #33: Referral/sharing badges — trackShare() increments the honest local
 * share counter and checkAchievements() unlocks referral-1 / referral-5.
 *
 * advanced-features.js is a browser IIFE, so it is loaded into a vm sandbox
 * with stubs (same pattern as voice-input.test.js):
 *   - Security.* backed by an in-memory store (real key names asserted)
 *   - CalcHistory / favorites / comparison scenarios → empty (no history deps)
 *   - localStorage → shared Map so cross-function writes are visible
 *
 * Asserts the observable contract:
 *   - trackShare() writes calcpro_share_count (1, then 2, then …)
 *   - 1 share  → referral-1 unlocked, referral-5 not
 *   - 5 shares → referral-5 unlocked
 *   - badges persist in calcpro_achievements (no dupes on re-check)
 *   - checkAchievements with 0 shares unlocks neither badge
 *   - a quota-throwing localStorage never breaks trackShare
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'advanced-features.js'), 'utf8');

function buildHarness({ quotaThrows = false } = {}) {
  const store = new Map(); // single shared storage: Security + localStorage see the same data
  const localStorageStub = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      if (quotaThrows) throw new Error('QuotaExceededError');
      store.set(k, String(v));
    },
    removeItem: (k) => store.delete(k)
  };
  const sandbox = {
    console,
    window: {},
    navigator: undefined,
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: (id) => clearTimeout(id),
    localStorage: localStorageStub,
    Event: class Event { constructor(t) { this.type = t; } },
    URLSearchParams,
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      createElement: () => ({
        style: {}, classList: { add() {}, remove() {}, toggle() {} },
        setAttribute() {}, appendChild() {}, addEventListener() {}
      })
    },
    Security: {
      safeGetItem: (key, fallback) => {
        try {
          const raw = store.has(key) ? store.get(key) : null;
          if (raw === null || raw === undefined) return fallback;
          return JSON.parse(raw);
        } catch (e) { return fallback; }
      },
      safeSetItem: (key, val) => {
        if (quotaThrows) throw new Error('QuotaExceededError');
        try { store.set(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
      },
      safeRemoveItem: (key) => { store.delete(key); }
    },
    // History/favorites/scenarios empty → only referral logic can unlock badges
    CalcHistory: { getAll: () => [] },
    CalcAnalytics: { getData: () => ({ visits: [] }) },
    App: { showToast: () => {} }
  };
  sandbox.window.localStorage = localStorageStub;
  sandbox.window.Security = sandbox.Security;
  sandbox.window.CalcHistory = sandbox.CalcHistory;
  sandbox.window.CalcAnalytics = sandbox.CalcAnalytics;
  sandbox.window.App = sandbox.App;

  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: 'advanced-features.js' });
  return { api: sandbox.window.AdvancedFeatures, store };
}

function countOf(store) {
  const raw = store.get('calcpro_share_count');
  return raw === undefined ? 0 : Number(raw);
}
function badgesOf(store) {
  const raw = store.get('calcpro_achievements');
  return raw ? JSON.parse(raw) : [];
}

describe('S4 #33: referral share badges', () => {
  let h;
  beforeEach(() => { h = buildHarness(); });

  it('trackShare writes the calcpro_share_count key (real contract)', () => {
    h.api.trackShare();
    expect(countOf(h.store)).toBe(1);
    h.api.trackShare();
    expect(countOf(h.store)).toBe(2);
  });

  it('1 share unlocks referral-1 only', () => {
    h.api.trackShare();
    const badges = badgesOf(h.store);
    expect(badges).toContain('referral-1');
    expect(badges).not.toContain('referral-5');
  });

  it('5 shares unlock referral-5', () => {
    for (let i = 0; i < 5; i++) h.api.trackShare();
    const badges = badgesOf(h.store);
    expect(badges).toContain('referral-1');
    expect(badges).toContain('referral-5');
  });

  it('badges do not duplicate on repeated checks', () => {
    for (let i = 0; i < 6; i++) h.api.trackShare();
    const badges = badgesOf(h.store);
    expect(badges.filter((b) => b === 'referral-1').length).toBe(1);
    expect(badges.filter((b) => b === 'referral-5').length).toBe(1);
  });

  it('zero shares unlock neither badge', () => {
    h.api.checkAchievements(null, null);
    const badges = badgesOf(h.store);
    expect(badges).not.toContain('referral-1');
    expect(badges).not.toContain('referral-5');
  });

  it('storage failure never breaks sharing', () => {
    const broken = buildHarness({ quotaThrows: true });
    expect(() => broken.api.trackShare()).not.toThrow();
    expect(badgesOf(broken.store)).not.toContain('referral-1');
  });
});
