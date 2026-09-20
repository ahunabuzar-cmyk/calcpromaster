import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const src = readFileSync(join(ROOT, 'js', 'comfort.js'), 'utf8');

function makeSandbox(storage = {}, docExtra = {}) {
  const docElement = {
    style: { fontSize: '' },
    attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k] ?? null; },
    removeAttribute(k) { delete this.attrs[k]; },
    ...docExtra
  };
  const sandbox = {
    module: { exports: {} },
    localStorage: {
      _s: storage,
      getItem(k) { return k in this._s ? this._s[k] : null; },
      setItem(k, v) { this._s[k] = String(v); }
    },
    document: { documentElement: docElement },
    SpeechSynthesisUtterance: class { constructor(t) { this.text = t; } },
    speechSynthesis: {
      spoken: [],
      cancel() { this.spoken.push('__cancel__'); },
      speak(u) { this.spoken.push(u.text); }
    },
    matchMedia: () => ({ matches: false })
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.docElement = docElement;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return { api: sandbox.module.exports, sandbox, docElement };
}

describe('S6 comfort', () => {
  let C, sandbox;
  beforeEach(() => {
    ({ api: C, sandbox } = makeSandbox());
  });

  // --- TTS ---
  it('speakResult speaks tool name + summary and cancels previous speech', () => {
    const ok = C.speakResult('Loan EMI', 'Monthly payment is 4,732');
    expect(ok).toBe(true);
    expect(sandbox.speechSynthesis.spoken[0]).toBe('__cancel__');
    expect(sandbox.speechSynthesis.spoken[1]).toContain('Loan EMI');
    expect(sandbox.speechSynthesis.spoken[1]).toContain('4,732');
  });

  it('speakResult truncates very long summaries to 240 chars', () => {
    C.speakResult('T', 'x'.repeat(500));
    const said = sandbox.speechSynthesis.spoken[1];
    expect(said.length).toBeLessThanOrEqual(242 + 3); // name + '. ' + 240
  });

  it('speakResult returns false without speechSynthesis (no crash)', () => {
    const { api } = (() => {
      const s2 = makeSandbox();
      delete s2.sandbox.speechSynthesis;
      return s2;
    })();
    expect(api.speakResult('T', 'x')).toBe(false);
  });

  it('stopSpeaking is safe when speechSynthesis missing', () => {
    delete sandbox.speechSynthesis;
    expect(() => C.stopSpeaking()).not.toThrow();
  });

  // --- font scale ---
  it('font scale clamps to 5 steps and persists', () => {
    expect(C.fontSteps().length).toBe(5);
    expect(C.applyFontScale(99)).toBe(1.15);
    expect(C.applyFontScale(-1)).toBe(0.85);
    expect(C.applyFontScale(2)).toBe(1);
    expect(C.fontIndex()).toBe(2);
  });

  it('font larger/smaller step from middle and persists across instances', () => {
    C.applyFontScale(2);
    expect(C.fontLarger()).toBe(1.075);
    expect(C.fontSmaller()).toBe(1);
    const { api: C2 } = makeSandbox({ 'cp.fontScale': '1.15' });
    expect(C2.fontIndex()).toBe(4);
  });

  it('font scale writes to documentElement.style.fontSize', () => {
    C.applyFontScale(4);
    expect(sandbox.docElement.style.fontSize).toBe('18.4px');
  });

  // --- colorblind ---
  it('colorblind modes restricted to the four supported values', () => {
    expect(C.cbModes()).toEqual(['none', 'protanopia', 'deuteranopia', 'tritanopia']);
    expect(C.applyCbMode('deuteranopia')).toBe('deuteranopia');
    expect(sandbox.docElement.getAttribute('data-cb')).toBe('deuteranopia');
  });

  it('invalid colorblind mode falls back to current (none)', () => {
    expect(C.applyCbMode('wibble')).toBe('none');
    expect(sandbox.docElement.getAttribute('data-cb')).toBe(null);
  });

  it('mode none removes the data attribute', () => {
    C.applyCbMode('protanopia');
    C.applyCbMode('none');
    expect(sandbox.docElement.getAttribute('data-cb')).toBe(null);
  });

  // --- reduced motion ---
  it('reduced motion override: on forces true, off forces false, auto follows media', () => {
    expect(C.prefersReducedMotion()).toBe(false); // auto + media false
    C.setMotionState('on');
    expect(C.prefersReducedMotion()).toBe(true);
    C.setMotionState('off');
    expect(C.prefersReducedMotion()).toBe(false);
    C.setMotionState('auto');
    expect(C.motionState()).toBe('auto');
  });

  it('reduced motion auto honors matchMedia(true)', () => {
    const s3 = makeSandbox();
    s3.sandbox.matchMedia = () => ({ matches: true });
    expect(s3.api.prefersReducedMotion()).toBe(true);
  });

  it('setMotionState writes data attribute only for on', () => {
    C.setMotionState('on');
    expect(sandbox.docElement.getAttribute('data-reduced-motion')).toBe('on');
    C.setMotionState('off');
    expect(sandbox.docElement.getAttribute('data-reduced-motion')).toBe(null);
  });

  // --- init ---
  it('init applies persisted font + colorblind + motion settings', () => {
    const s2 = makeSandbox({ 'cp.fontScale': '0.85', 'cp.colorblind': 'tritanopia', 'cp.reducedMotionOverride': 'on' });
    s2.api.init();
    expect(s2.sandbox.docElement.style.fontSize).toBe('13.6px');
    expect(s2.sandbox.docElement.getAttribute('data-cb')).toBe('tritanopia');
    expect(s2.sandbox.docElement.getAttribute('data-reduced-motion')).toBe('on');
  });

  it('init is safe without document', () => {
    const s3 = makeSandbox();
    s3.sandbox.document = undefined;
    expect(() => s3.api.init()).not.toThrow();
  });
});
