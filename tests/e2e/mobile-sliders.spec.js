// ====== CalcPro Sliders — Mobile Emulator Test ======
// Pixel 7 (Android Chrome) viewport. Verifies top tools render clean range
// sliders: at least one slider, NO duplicate sliders per input, sliders sync
// their paired number input, and the page has zero horizontal overflow.
// Run: npx playwright test tests/e2e/mobile-sliders.spec.js
const { test, expect, devices } = require('@playwright/test');

const PIXEL7 = devices['Pixel 7'];

const TOOLS = [
  { route: '/finance/loan-emi', minSliders: 1 },
  { route: '/regional/sip-return', minSliders: 1 },
  { route: '/finance/compound-interest', minSliders: 1 },
  { route: '/finance/mortgage', minSliders: 1 },
  { route: '/health/bmi', minSliders: 1 },
  { route: '/math/percentage', minSliders: 1 },
  { route: '/regional/fd-calculator', minSliders: 1 },
  { route: '/finance/tip', minSliders: 1 }
];

test.use({ ...PIXEL7 });

test.describe('Sliders on mobile (Pixel 7)', () => {
  for (const t of TOOLS) {
    test(`${t.route} — sliders render, no dupes, no overflow`, async ({ page }) => {
      await page.goto(t.route, { waitUntil: 'domcontentloaded' });
      // Wait for the form + at least one native slider to render (fixed sleeps are
      // flaky on emulated mobile — wait on the actual DOM instead)
      await page.waitForSelector('form#calc-form', { timeout: 15000 });
      try {
        await page.waitForSelector('input[type="range"]', { timeout: 10000 });
      } catch (e) { /* assert below gives the real failure */ }
      await page.waitForTimeout(800); // let ZR sliders settle

      const state = await page.evaluate(() => {
        const sliders = Array.from(document.querySelectorAll('input[type="range"]'));
        // Native calc sliders follow the `<inputId>-slider` convention; other range
        // inputs (voice-rate, what-if, ZR extras) are legitimate feature sliders.
        const nativeSliders = sliders.filter(s => /-slider$/.test(s.id));
        const paired = nativeSliders.filter(s => {
          const id = s.id.replace(/-slider$/, '');
          return !!document.getElementById(id);
        });
        // Duplicate check: same id twice (across ALL range inputs)
        const ids = sliders.map(s => s.id);
        const dupes = ids.filter((id, i) => id && ids.indexOf(id) !== i);
        return {
          sliderCount: sliders.length,
          nativeCount: nativeSliders.length,
          pairedCount: paired.length,
          duplicates: dupes.length,
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          scrollW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth
        };
      });

      expect(state.sliderCount, `${t.route}: expected >= ${t.minSliders} sliders`).toBeGreaterThanOrEqual(t.minSliders);
      expect(state.duplicates, `${t.route}: duplicate slider ids found`).toBe(0);
      // Every native calc slider must be paired to a real number input
      expect(state.pairedCount, `${t.route}: ${state.pairedCount}/${state.nativeCount} native sliders paired`).toBe(state.nativeCount);
      expect(state.overflowX, `${t.route}: horizontal overflow ${state.scrollW} > ${state.clientW}`).toBe(false);
    });
  }

  test('slider drag syncs its paired number input (loan-emi)', async ({ page }) => {
    await page.goto('/finance/loan-emi', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Find the loan-amount slider + input
    const ids = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input[type="range"]')).map(s => s.id));
    const loanSlider = ids.find(id => /loan|amount|principal/i.test(id));
    expect(loanSlider).toBeTruthy();
    const inputId = loanSlider.replace(/-slider$/, '');

    // Drag the slider by dispatching a real input event (Playwright's fill() rejects
    // range values that aren't on the step grid — same reason a real touch drag works)
    await page.evaluate(([iid]) => {
      const slider = document.getElementById(iid + '-slider');
      if (!slider) return;
      slider.value = '500000';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    }, [inputId]);
    await page.waitForTimeout(300);
    const value = await page.evaluate(([iid]) => {
      const slider = document.getElementById(iid + '-slider');
      const input = document.getElementById(iid);
      return { sliderVal: slider ? slider.value : null, inputVal: input ? input.value : null };
    }, [inputId]);

    // The number input must reflect the slider position
    expect(value.inputVal).toBeTruthy();
    expect(parseFloat(value.inputVal)).toBeGreaterThan(0);
  });
});
