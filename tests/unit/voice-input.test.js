/**
 * Voice-input unit tests.
 *
 * Exercises AdvancedFeatures.voiceInput(id) — the universal per-input mic
 * feature added to every numeric input of every tool. Node has no
 * SpeechRecognition, no window and no DOM, so the IIFE is loaded into a vm
 * sandbox with stubs:
 *   - window.SpeechRecognition  → controllable stub recording start() calls
 *   - document.getElementById   → fake element with value/focus/dispatchEvent
 *   - App.showToast             → toast capture
 *   - Security.*                → no-op stubs (unused by voice code paths)
 *
 * Asserts the observable contract:
 *   - unsupported browser → toast + no crash
 *   - number extraction from a spoken transcript ("my rent is 75.5" → 75.5)
 *   - value written into the TARGET input (not just the first one)
 *   - input + change events dispatched (drives live auto-calc)
 *   - non-numeric transcript → "No number detected" toast
 *   - missing input id → "Input not found" toast
 *   - recognition error → "Voice error: ..." toast
 *   - start() throwing (already listening) → graceful toast
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'advanced-features.js'), 'utf8');

function buildFakeInput(id) {
  const obj = {
    id,
    value: '',
    focusedCalls: 0,
    eventTypes: [],
    focus() { this.focusedCalls++; },
    dispatchEvent(ev) { this.eventTypes.push(ev.type); }
  };
  return obj;
}

function buildHarness({ supported = true, startThrows = false, inputId = 'loan-amount' } = {}) {
  const toasts = [];
  const inputs = { 'loan-amount': buildFakeInput('loan-amount'), 'other-input': buildFakeInput('other-input') };

  let recognitionInstance = null;
  const SpeechRecognitionStub = class SpeechRecognitionStub {
    constructor() {
      recognitionInstance = this;
      this.continuous = null;
      this.interimResults = null;
      this.lang = null;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this.started = false;
    }
    start() {
      if (startThrows) throw new Error('already listening');
      this.started = true;
    }
  };

  const sandbox = {
    console,
    window: {},
    Security: { safeGetItem: () => [], safeSetItem: () => {}, safeRemoveItem: () => {} },
    App: { showToast: (m) => toasts.push(String(m)) },
    document: { getElementById: (id) => inputs[id] || null },
    Event: class Event { constructor(type) { this.type = type; } },
    URLSearchParams
  };
  if (supported) sandbox.window.SpeechRecognition = SpeechRecognitionStub;

  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: 'advanced-features.js' });

  // The file checks `typeof window !== 'undefined'` (true in the sandbox) and
  // attaches to window — expose what the app would call.
  const api = sandbox.window.AdvancedFeatures;
  return { api, toasts, inputs, getRecognition: () => recognitionInstance };
}

describe('AdvancedFeatures voice input', () => {
  it('toasts "not supported" without crashing when SpeechRecognition is unavailable', () => {
    const { api, toasts } = buildHarness({ supported: false });
    api.voiceInput('loan-amount');
    expect(toasts).toContain('Voice input not supported in this browser');
    // only one toast — the code paths must not fall through to others
    expect(toasts).toHaveLength(1);
  });

  it('configures and starts recognition on a supported browser', () => {
    const { api, getRecognition } = buildHarness({ supported: true });
    api.voiceInput('loan-amount');
    const rec = getRecognition();
    expect(rec).not.toBeNull();
    expect(rec.continuous).toBe(false);
    expect(rec.interimResults).toBe(false);
    expect(rec.lang).toBe('en-US');
    expect(rec.started).toBe(true);
  });

  it('writes the detected number into the TARGET input and dispatches input+change for auto-calc', () => {
    const h = buildHarness({ supported: true });
    h.api.voiceInput('other-input');
    // Simulate the browser firing onresult with a natural spoken sentence
    h.getRecognition().onresult({ results: [[{ transcript: 'my rent is 75.5 dollars' }]] });

    const target = h.inputs['other-input'];
    expect(target.value).toBe('75.5');
    expect(target.eventTypes).toContain('input');
    expect(target.eventTypes).toContain('change');
    expect(target.focusedCalls).toBeGreaterThan(0);
    expect(h.toasts).toContain('Voice: 75.5');

    // The FIRST input must not have been touched — the target is input-specific
    expect(h.inputs['loan-amount'].value).toBe('');
  });

  it('handles negative decimal transcripts', () => {
    const h = buildHarness({ supported: true });
    h.api.voiceInput('loan-amount');
    h.getRecognition().onresult({ results: [[{ transcript: 'temperature is -12.5 degrees' }]] });
    expect(h.inputs['loan-amount'].value).toBe('-12.5');
  });

  it('toasts "No number detected" for a transcript without digits', () => {
    const h = buildHarness({ supported: true });
    h.api.voiceInput('loan-amount');
    h.getRecognition().onresult({ results: [[{ transcript: 'please check the fields' }]] });
    expect(h.inputs['loan-amount'].value).toBe('');
    expect(h.toasts.some(t => t.includes('No number detected'))).toBe(true);
  });

  it('toasts "Input not found" for an unknown input id (no crash)', () => {
    const { api, toasts } = buildHarness({ supported: true });
    api.voiceInput('no-such-input');
    expect(toasts).toContain('Input not found');
  });

  it('surfaces recognition errors via toast', () => {
    const h = buildHarness({ supported: true });
    h.api.voiceInput('loan-amount');
    h.getRecognition().onerror({ error: 'not-allowed' });
    expect(h.toasts).toContain('Voice error: not-allowed');
  });

  it('clears the active-input state after recognition ends', () => {
    const h = buildHarness({ supported: true });
    h.api.voiceInput('loan-amount');
    h.getRecognition().onend();
    // After onend, a new result must not write to any input (active input is null)
    h.getRecognition().onresult({ results: [[{ transcript: 'value is 42' }]] });
    expect(h.inputs['loan-amount'].value).toBe('');
    expect(h.inputs['other-input'].value).toBe('');
  });

  it('gracefully handles start() throwing (SpeechRecognition already listening)', () => {
    const h = buildHarness({ supported: true, startThrows: true });
    expect(() => h.api.voiceInput('loan-amount')).not.toThrow();
    expect(h.toasts.some(t => t.includes('already listening'))).toBe(true);
  });
});