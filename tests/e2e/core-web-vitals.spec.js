// =====================================================================
// Core Web Vitals audit (mobile emulation) — measures real LCP, CLS and
// INP on key pages using native PerformanceObserver (no deps):
//   LCP  = largest-contentful-paint          threshold: < 2500ms
//   CLS  = cumulative layout shift           threshold: < 0.1
//   INP  = max event timing duration (interaction) threshold: < 200ms
// Fails hard only on "poor" thresholds (4s / 0.25 / 500ms) so genuinely
// broken pages are caught; all measured values are printed for review.
// =====================================================================
const { test, expect } = require('@playwright/test');

const PAGES = [
  { path: '/', label: 'home' },
  { path: '/finance/loan-emi', label: 'tool-loan-emi' },
  { path: '/hub/finance', label: 'hub-finance' },
  { path: '/math/percentage', label: 'tool-percentage' }
];

for (const p of PAGES) {
  test(`CWV ${p.label} (mobile)`, async ({ page }) => {
    // Install observers at document start so LCP/CLS/INP are captured.
    await page.addInitScript(() => {
      window.__cwv = { lcp: 0, cls: 0, inp: 0, tbt: 0, nav: 0, entries: 0 };
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (e.entryType === 'largest-contentful-paint' && e.startTime > window.__cwv.lcp) window.__cwv.lcp = e.startTime;
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (!e.hadRecentInput) window.__cwv.cls += e.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (e.interactionId) { window.__cwv.inp = Math.max(window.__cwv.inp, e.duration); window.__cwv.entries++; }
          }
        }).observe({ type: 'event', durationThreshold: 16 });
      } catch (err) { window.__cwv.err = String(err); }
    });

    await page.goto(p.path, { waitUntil: 'domcontentloaded' });
    // Wait for app shell + give LCP a chance to settle
    await page.waitForSelector('#app, main, .calc-input, #hub-content, .category-grid', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2500);

    // Force at least one real interaction on tool pages (INP needs it)
    if (p.path.startsWith('/finance/') || p.path.startsWith('/math/')) {
      const btn = page.locator('button.calc-btn, .calc-btn').first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(400);
      }
    }

    const v = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      return {
        lcp: Math.round(window.__cwv.lcp),
        cls: Math.round(window.__cwv.cls * 1000) / 1000,
        inp: Math.round(window.__cwv.inp),
        domLoad: Math.round(nav.domContentLoadedEventEnd || 0),
        load: Math.round(nav.loadEventEnd || 0),
        bytes: performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), 0),
        reqs: performance.getEntriesByType('resource').length,
        err: window.__cwv.err || null
      };
    });

    console.log(`CWV ${p.label}: LCP=${v.lcp}ms CLS=${v.cls} INP=${v.inp}ms domLoad=${v.domLoad}ms load=${v.load}ms payload=${(v.bytes / 1024 / 1024).toFixed(1)}MB reqs=${v.reqs}${v.err ? ' OBSERVER_ERR=' + v.err : ''}`);

    expect(v.err, `observer failed on ${p.label}`).toBeNull();
    expect(v.lcp, `LCP ${v.lcp}ms > 4000ms poor on ${p.label}`).toBeLessThanOrEqual(4000);
    expect(v.cls, `CLS ${v.cls} > 0.25 poor on ${p.label}`).toBeLessThanOrEqual(0.25);
    if (v.inp > 0) {
      expect(v.inp, `INP ${v.inp}ms > 500ms poor on ${p.label}`).toBeLessThanOrEqual(500);
    }
  });
}
