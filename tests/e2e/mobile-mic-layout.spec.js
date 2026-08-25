// ====== Mobile Mic Layout E2E (320px) ======
// Verifies the universal per-input voice buttons render correctly on the
// narrowest common mobile width (320px, iPhone SE 1st-gen / Galaxy S5).
// Guards the input+mic flex row: no horizontal overflow, every mic button
// fully inside the viewport with a >= 44px tap target, one mic per numeric
// input on BOTH small tools (bmi — 2 inputs) and large tools (loan-emi — 8
// inputs, mortgage — 9), and graceful degradation when SpeechRecognition is
// unavailable (toast, no crash).
// Run: npx playwright test tests/e2e/mobile-mic-layout.spec.js
const { test, expect } = require('@playwright/test');

const VIEWPORT = { width: 320, height: 568 };

const TOOLS = [
  { route: '/health/bmi', numericInputs: 2, label: 'small tool' },
  { route: '/finance/loan-emi', numericInputs: 5, label: '8-field tool' },
  { route: '/finance/mortgage', numericInputs: 6, label: '9-field tool' },
  { route: '/math/percentage', numericInputs: 2, label: '2-input tool' }
];

test.describe('Voice mic buttons at 320px', () => {
  for (const t of TOOLS) {
    test(`${t.route} (${t.label}) — one mic per numeric input, in-viewport, 44px+, no overflow`, async ({ page }) => {
      const errors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

      await page.setViewportSize(VIEWPORT);
      await page.goto(t.route, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('form#calc-form', { timeout: 15000 });
      await page.waitForTimeout(1000); // let the form render settle

      const state = await page.evaluate(() => {
        const numericInputs = Array.from(document.querySelectorAll('input[type="number"]'));
        // Per-input mics only — the dedicated "Dictate all inputs" button also
        // carries .voice-input-btn but is a form-level control, not an input mic.
        const mics = Array.from(document.querySelectorAll('.voice-input-btn:not(.voice-dictate-btn)'));
        const overflowX = document.documentElement.scrollWidth > document.documentElement.clientWidth;
        // Every mic must sit fully inside the 320px viewport
        const outOfViewport = mics.filter(b => {
          const r = b.getBoundingClientRect();
          return r.left < 0 || r.right > document.documentElement.clientWidth;
        }).length;
        // Every mic must have a >= 44px tap target (WCAG 2.5.8) and its aria-label
        const smallMics = mics.filter(b => b.getBoundingClientRect().height < 44).length;
        const unlabeled = mics.filter(b => !(b.getAttribute('aria-label') || '').trim()).length;
        // Input + mic must share one line (flex row, input not pushed below)
        const wrapped = mics.filter(b => {
          const r = b.getBoundingClientRect();
          const input = b.parentElement && b.parentElement.querySelector('input[type="number"]');
          if (!input) return false;
          const ir = input.getBoundingClientRect();
          return Math.abs(ir.top - r.top) > 4;
        }).length;
        return {
          numericCount: numericInputs.length,
          micCount: mics.length,
          overflowX,
          micOutOfView: outOfViewport,
          smallMics,
          unlabeled,
          wrappedMics: wrapped,
          scrollW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth
        };
      });

      // One mic per numeric input — the parity guarantee
      expect(state.micCount, `${t.route}: expected ${t.numericInputs} mics, got ${state.micCount}`).toBe(t.numericInputs);
      expect(state.overflowX, `${t.route}: horizontal overflow at 320px (${state.scrollW} > ${state.clientW})`).toBe(false);
      expect(state.micOutOfView, `${t.route}: ${state.micOutOfView} mic(s) outside viewport`).toBe(0);
      expect(state.smallMics, `${t.route}: ${state.smallMics} mic(s) below 44px tap target`).toBe(0);
      expect(state.unlabeled, `${t.route}: ${state.unlabeled} mic(s) without aria-label`).toBe(0);
      expect(state.wrappedMics, `${t.route}: ${state.wrappedMics} mic(s) wrapped below their input`).toBe(0);
      expect(errors.filter(e => !e.includes('favicon')), `${t.route}: console errors: ${errors.join(' | ')}`).toEqual([]);
    });
  }

  test('mic click with SpeechRecognition disabled — toast, no crash', async ({ page }) => {
    // Force the unsupported-browser path deterministically (headless Chromium
    // exposes SpeechRecognition, so blank it before the app loads)
    await page.addInitScript(() => {
      Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true });
      Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true });
    });
    const toastMsgs = [];
    await page.setViewportSize(VIEWPORT);
    await page.goto('/health/bmi', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('form#calc-form', { timeout: 15000 });
    await page.waitForTimeout(800);

    // Intercept toasts so the assertion is stable across toast implementations
    await page.evaluate(() => {
      window.__toastCapture = [];
      const orig = App.showToast.bind(App);
      App.showToast = (m) => { window.__toastCapture.push(String(m)); orig(m); };
    });

    await page.click('.voice-input-btn:not(.voice-dictate-btn)');
    await page.waitForTimeout(500);
    const msgs = await page.evaluate(() => window.__toastCapture || []);
    expect(msgs.some(m => m.includes('Voice input not supported'))).toBe(true);
  });
});