import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const src = readFileSync(join(ROOT, 'js', 'smart-assist.js'), 'utf8');

function makeSandbox(storage) {
  const sandbox = {
    module: { exports: {} },
    window: undefined,
    document: undefined,
    localStorage: storage,
    Notification: undefined,
    setTimeout: (fn) => 0,
    clearTimeout: () => {}
  };
  vm.createContext(sandbox);
  vm.runInContext(src + '\nthis.module.exports = module.exports;', sandbox);
  return sandbox.module.exports;
}

// Tiny in-memory localStorage stand-in
function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => Array.from(m.keys())[i] || null,
    get length() { return m.size; }
  };
}

const SA = makeSandbox(fakeStorage());

describe('SmartAssist — plausibility rules', () => {
  it('warns on very high interest rates', () => {
    expect(SA.plausibility('rate', '55')).toMatch(/unusually high/);
    expect(SA.plausibility('interest_rate', '45')).toMatch(/unusually high/);
  });

  it('stays quiet on normal values', () => {
    expect(SA.plausibility('rate', '8.5')).toBeNull();
    expect(SA.plausibility('age', '32')).toBeNull();
    expect(SA.plausibility('principal', '250000')).toBeNull();
  });

  it('returns null for empty/zero/non-numeric input', () => {
    expect(SA.plausibility('rate', '')).toBeNull();
    expect(SA.plausibility('rate', '0')).toBeNull();
    expect(SA.plausibility('rate', 'abc')).toBeNull();
  });

  it('warns on implausible age and unit-mismatched height/weight', () => {
    expect(SA.plausibility('age', '150')).toMatch(/age looks off/);
    expect(SA.plausibility('height', '500')).toMatch(/centimeters/);
    expect(SA.plausibility('weight', '900')).toMatch(/kilograms/);
  });

  it('warns on negative amounts and long terms', () => {
    expect(SA.plausibility('principal', '-5')).toMatch(/negative/);
    expect(SA.plausibility('years', '80')).toMatch(/over 50 years/);
  });

  it('handles comma-thousands input', () => {
    expect(SA.plausibility('salary', '50,000')).toBeNull();
  });
});

describe('SmartAssist — draft autosave', () => {
  let store, sa;
  beforeEach(() => { store = fakeStorage(); sa = makeSandbox(store); });

  it('saves and loads a draft round-trip', () => {
    sa.saveDraft('loan-emi', { principal: '250000', rate: '9' });
    expect(sa.loadDraft('loan-emi')).toEqual({ principal: '250000', rate: '9' });
  });

  it('drops empty values and clears when nothing left', () => {
    sa.saveDraft('t1', { a: '', b: null, c: '5' });
    expect(sa.loadDraft('t1')).toEqual({ c: '5' });
    sa.saveDraft('t1', {});
    expect(sa.loadDraft('t1')).toBeNull();
  });

  it('survives malformed JSON gracefully', () => {
    store.setItem('cpm_draft_x', '{broken json');
    expect(sa.loadDraft('x')).toBeNull();
  });

  it('keys are namespaced per tool', () => {
    sa.saveDraft('a', { v: '1' });
    expect(sa.loadDraft('b')).toBeNull();
    expect(sa.draftKey('a')).toBe('cpm_draft_a');
  });
});

describe('SmartAssist — reminder schedule math', () => {
  it('nextDue monthly adds exactly one month', () => {
    const from = new Date('2026-01-31T10:00:00Z');
    const nd = SA.nextDue('monthly', from);
    expect(nd.getUTCMonth()).toBe(1); // Feb (clamped from Jan 31)
  });

  it('nextDue weekly adds 7 days', () => {
    const nd = SA.nextDue('weekly', new Date('2026-03-01T00:00:00Z'));
    expect(nd.getTime() - new Date('2026-03-01T00:00:00Z').getTime()).toBe(7 * 24 * 3600 * 1000);
  });

  it('one-off returns null (user picks the date)', () => {
    expect(SA.nextDue('once', new Date())).toBeNull();
  });

  it('cancelReminder removes state', () => {
    const store2 = fakeStorage();
    const sa2 = makeSandbox(store2);
    store2.setItem('cpm_reminder_loan-emi', JSON.stringify({ kind: 'monthly', next: '2026-10-01' }));
    sa2.cancelReminder('loan-emi');
    expect(store2.getItem('cpm_reminder_loan-emi')).toBeNull();
  });
});
