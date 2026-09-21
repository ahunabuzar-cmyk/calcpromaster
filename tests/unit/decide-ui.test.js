import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

function makeBrowserSandbox(storage) {
  const store = { ...(storage || {}) };
  const listeners = {};
  const el = () => ({
    addEventListener: () => {},
    style: {},
  });
  return {
    window: {
      Decide: loadDecide(),
      localStorage: {
        getItem: (k) => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
      },
      addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
      scrollBy: () => {},
      innerHeight: 800,
      Router: { getPath: () => '/finance/loan-emi' },
      visualViewport: null,
    },
    document: {
      readyState: 'loading',
      addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: (tag) => {
        const e = el();
        e.tagName = tag;
        e.innerHTML = '';
        e.textContent = '';
        e.setAttribute = () => {};
        e.getAttribute = () => null;
        e.removeAttribute = () => {};
        e.setAttribute = () => {};
        e.removeAttribute = () => {};
        e.classList = { add: () => {}, remove: () => {}, toggle: () => {} };
        e.insertAdjacentElement = () => {};
        e.insertAdjacentHTML = () => {};
        e.appendChild = () => {};
        return e;
    },
      dispatchEvent: () => {},
    },
    listeners,
  };
}

function loadDecide() {
  const src = readFileSync(join(ROOT, 'js', 'decide.js'), 'utf8');
  const sb = { module: { exports: {} }, exports: {} };
  vm.runInNewContext(src, sb);
  return sb.module.exports;
}

function loadDecideUI(sandbox) {
  const src = readFileSync(join(ROOT, 'js', 'decide-ui.js'), 'utf8');
  // decide-ui.js is an IIFE reading window/document globals — run in a context
  // where `window`/`document` resolve.
  const ctx = { window: sandbox.window, document: sandbox.document, CustomEvent: class CustomEvent { constructor(t, o) { this.type = t; this.detail = o && o.detail; } } };
  vm.runInNewContext(src, ctx);
  return ctx.window.DecideUI;
}

describe('decide-ui.js (S12 wiring)', () => {
  it('loads in a minimal browser sandbox and exposes the wiring API', () => {
    const sb = makeBrowserSandbox({});
    const UI = loadDecideUI(sb);
    expect(UI).toBeTruthy();
    expect(typeof UI.afterCalc).toBe('function');
    expect(typeof UI.renderChecklist).toBe('function');
  });

  it('renderChecklist returns a collapsed <details> with the finance items', () => {
    const sb = makeBrowserSandbox({});
    const UI = loadDecideUI(sb);
    const html = UI.renderChecklist({ cat: 'finance' });
    expect(html).toContain('<details');
    expect(html).toContain('Before you calculate');
    expect(html).toContain('interest rate');
  });

  it('SCALED pickers recompute DTI and BMI from the same input values', () => {
    const sb = makeBrowserSandbox({});
    const UI = loadDecideUI(sb);
    const dti = UI.SCALED['finance/debt-ratio'].pick({ income: 5000, debts: 1500 });
    expect(dti).toBeCloseTo(30, 5);
    const bmi = UI.SCALED['health/bmi'].pick({ weight: 70, height: 170 });
    expect(bmi).toBeCloseTo(24.22, 2);
  });

  it('afterCalc is a guarded no-op without a result area / main element', () => {
    const sb = makeBrowserSandbox({});
    const UI = loadDecideUI(sb);
    expect(() => UI.afterCalc(null, {}, null)).not.toThrow();
    const fakeArea = { querySelector: () => null };
    expect(() => UI.afterCalc({ cat: 'finance', id: 'loan-emi' }, {}, fakeArea)).not.toThrow();
  });

  it('module stays a no-op in Node (no document)', () => {
    const src = readFileSync(join(ROOT, 'js', 'decide-ui.js'), 'utf8');
    const ctx = {}; // no document
    expect(() => vm.runInNewContext(src, ctx)).not.toThrow();
    expect(ctx.window).toBeUndefined();
  });
});
