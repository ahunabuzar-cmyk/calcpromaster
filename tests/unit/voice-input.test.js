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
  // Numeric inputs in document order (dictation fills these in order)
  const inputs = {
    'loan-amount': buildFakeInput('loan-amount'),
    'rate': buildFakeInput('rate'),
    'years': buildFakeInput('years'),
    'other-input': buildFakeInput('other-input')
  };
  const order = ['loan-amount', 'rate', 'years'];
  // Minimal DOM for initVoiceArea: a container with querySelector + appendChild
  const voiceArea = {
    children: [],
    querySelector() { return this.children.find(c => c.id === 'voice-dictate-btn') || null; },
    appendChild(el) { this.children.push(el); },
    className: ''
  };

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
    App: {
      showToast: (m) => toasts.push(String(m)),
      // Dictation needs the current tool to know input order
      _currentTool: { tool: { inputs: [
        { id: 'loan-amount', type: 'number' },
        { id: 'rate', type: 'number' },
        { id: 'years', type: 'number' },
        { id: 'note', type: 'text' }
      ] } }
    },
    document: {
      getElementById: (id) => inputs[id] || (id === 'zr-voice-area' ? voiceArea : null),
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        id: '', className: '', textContent: '', title: '',
        _handlers: {},
        setAttribute() {},
        addEventListener(type, fn) { this._handlers[type] = fn; },
        appendChild(el) { voiceArea.appendChild(el); el.parentArea = voiceArea; },
        classList: { toggle() {} },
        click() { if (this._handlers.click) this._handlers.click(); }
      })
    },
    Event: class Event { constructor(type) { this.type = type; } },
    URLSearchParams
  };
  if (supported) sandbox.window.SpeechRecognition = SpeechRecognitionStub;
  // The real app exposes App on window — mirror that so dictation's
  // App._currentTool input-order lookup works (no DOM-scan fallback in tests).
  sandbox.window.App = sandbox.App;

  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: 'advanced-features.js' });

  const api = sandbox.window.AdvancedFeatures;
  return { api, toasts, inputs, voiceArea, getRecognition: () => recognitionInstance };
}

// Dictation tests: the sandbox above simulates a tool with inputs
// loan-amount → rate → years (numeric) and note (text). A spoken transcript
// with numbers fills the numeric inputs in that order.
function dictationHarness({ supported = true } = {}) {
  const h = buildHarness({ supported });
  // dictation uses getCurrentToolInputIds() → App._currentTool.tool.inputs
  return h;
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

describe('Voice dictation (fill all inputs)', () => {
  it('initVoiceArea renders the dictate button next to the walkthrough bar', () => {
    const h = dictationHarness({ supported: true });
    h.api.initVoiceArea();
    expect(h.voiceArea.children.length).toBe(1);
    expect(h.voiceArea.children[0].id).toBe('voice-dictate-btn');
    expect(h.voiceArea.children[0].className).toContain('voice-dictate-btn');
    // Idempotent: a second call must not add a duplicate button
    h.api.initVoiceArea();
    expect(h.voiceArea.children.length).toBe(1);
  });

  it('dictation fills every numeric input in document order, skipping non-numeric', () => {
    const h = dictationHarness({ supported: true });
    h.api.initVoiceArea();
    const btn = h.voiceArea.children[0];
    btn.click();
    // The click starts recognition (browser stub) — drive its onresult
    const rec = h.getRecognition();
    expect(rec).not.toBeNull();
    expect(rec.started).toBe(true);
    rec.onresult({ results: [[{ transcript: 'loan amount 150000, rate 8.5, tenure 20 years' }]] });
    expect(h.inputs['loan-amount'].value).toBe('150000');
    expect(h.inputs['rate'].value).toBe('8.5');
    expect(h.inputs['years'].value).toBe('20');
    // input + change dispatched on every filled input (drives live calc)
    expect(h.inputs['loan-amount'].eventTypes).toContain('input');
    expect(h.inputs['loan-amount'].eventTypes).toContain('change');
    expect(h.toasts.some(t => t.includes('filled 3 inputs'))).toBe(true);
  });

  it('dictation with fewer numbers than inputs fills only the first N', () => {
    const h = dictationHarness({ supported: true });
    h.api.initVoiceArea();
    h.voiceArea.children[0].click();
    h.getRecognition().onresult({ results: [[{ transcript: 'just the amount 60000' }]] });
    expect(h.inputs['loan-amount'].value).toBe('60000');
    expect(h.inputs['rate'].value).toBe('');
    expect(h.inputs['years'].value).toBe('');
    expect(h.toasts.some(t => t.includes('filled 1 input'))).toBe(true);
  });

  it('dictation with no numbers toasts and leaves inputs untouched', () => {
    const h = dictationHarness({ supported: true });
    h.api.initVoiceArea();
    h.voiceArea.children[0].click();
    h.getRecognition().onresult({ results: [[{ transcript: 'please say the numbers clearly' }]] });
    expect(h.inputs['loan-amount'].value).toBe('');
    expect(h.inputs['rate'].value).toBe('');
    expect(h.toasts.some(t => t.includes('No numbers detected'))).toBe(true);
  });

  it('dictation unsupported browser — toast and no crash', () => {
    const h = dictationHarness({ supported: false });
    h.api.initVoiceArea();
    h.voiceArea.children[0].click();
    expect(h.toasts).toContain('Voice input not supported in this browser');
  });
});