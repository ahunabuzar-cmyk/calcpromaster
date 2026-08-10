// ============================================================
// PDF + EXPORT + MOBILE HEADER REGRESSION — production artifact
// Verifies:
//   1. PDF button exists and App.exportResultAsPdf() builds a report
//      containing the CURRENT result (no stale data, count = 543+).
//   2. CSV export downloads the current result with A/B isolation.
//   3. Mobile header (320-768): single-row logo+hamburger, controls
//      hidden in dropdown, no horizontal overflow, menu toggles.
// Run: npx playwright test tests/e2e/pdf-export-header.spec.js -c playwright.deploy.config.js
// ============================================================
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3100';

function pdfReportText(page) {
  // Capture the REAL App.exportResultAsPdf() output without a popup/print
  // dialog (headless window.print blocks): stub window.open with a fake
  // document that mirrors what the function writes.
  return page.evaluate(() => {
    const d = {
      open() {}, close() {}, title: '',
      createElement: (t) => document.createElement(t),
      head: document.createElement('head'),
      body: document.createElement('body'),
    };
    const fake = { document: d, focus() {}, print() {} };
    const orig = window.open;
    window.open = () => fake;
    App.exportResultAsPdf();
    window.open = orig;
    return (d.body.textContent || '');
  });
}

test.describe('PDF report', () => {
  test('button exists and report contains current result + 543+ count', async ({ page }) => {
    await page.goto(BASE + '/finance/loan-emi?amount=50000&rate=6&years=3', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
    await expect(page.locator('button', { hasText: 'PDF' }).first()).toBeVisible();
    const txt = await pdfReportText(page);
    expect(txt).toContain('CalcProMaster');
    expect(txt).toMatch(/1,521|1521/);          // result B
    expect(txt).toContain('50000');             // input B
    expect(txt).toContain('543+');              // authoritative count
    expect(txt).not.toContain('100000');        // no stale input A
  });
});

test.describe('CSV export', () => {
  test('exports current result with A/B isolation', async ({ page, browser }) => {
    const ctx = await browser.newContext({ acceptDownloads: true });
    const p = await ctx.newPage();
    try {
      // Scenario A
      await p.goto(BASE + '/finance/loan-emi?amount=100000&rate=8.5&years=5', { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(2200);
      const dlA = await Promise.all([
        p.waitForEvent('download', { timeout: 8000 }),
        p.evaluate(() => AdvancedFeatures.exportCurrentCSV()),
      ]);
      const csvA = require('fs').readFileSync(await dlA[0].path(), 'utf8');
      expect(csvA).toContain('100000');
      expect(csvA).not.toContain('50000');
      // Scenario B
      await p.goto(BASE + '/finance/loan-emi?amount=50000&rate=6&years=3', { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(2200);
      const dlB = await Promise.all([
        p.waitForEvent('download', { timeout: 8000 }),
        p.evaluate(() => AdvancedFeatures.exportCurrentCSV()),
      ]);
      const csvB = require('fs').readFileSync(await dlB[0].path(), 'utf8');
      expect(csvB).toContain('50000');
      expect(csvB).not.toContain('100000');
      // Empty-state guard: button exists on tool page
      await expect(p.locator('button', { hasText: 'CSV' }).first()).toBeVisible();
    } finally {
      await ctx.close();
    }
  });
});

test.describe('Mobile header regression', () => {
  const WIDTHS = [320, 375, 390, 414, 768];
  for (const w of WIDTHS) {
    test(`single-row header, no overflow at ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 740 });
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2200);
      const m = await page.evaluate(() => {
        const nav = document.querySelector('.nav');
        const links = document.getElementById('nav-links');
        const logo = document.querySelector('.logo');
        const btn = document.getElementById('menu-btn');
        const navR = nav.getBoundingClientRect();
        const logoR = logo.getBoundingClientRect();
        const btnR = btn.getBoundingClientRect();
        return {
          navH: Math.round(navR.height),
          menuBtnVisible: getComputedStyle(btn).display !== 'none',
          sameRow: Math.abs(logoR.top - btnR.top) < 8,
          linksHidden: getComputedStyle(links).display === 'none',
          overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        };
      });
      expect(m.navH).toBeLessThanOrEqual(90);
      expect(m.menuBtnVisible).toBe(true);
      expect(m.sameRow).toBe(true);
      expect(m.linksHidden).toBe(true);
      expect(m.overflow).toBe(false);
    });
  }

  test('hamburger opens dropdown with controls, Escape closes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 740 });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
    await page.click('#menu-btn');
    await page.waitForTimeout(350);
    const open = await page.evaluate(() => ({
      active: document.getElementById('nav-links').classList.contains('active'),
      expanded: document.getElementById('menu-btn').getAttribute('aria-expanded'),
      hasControls: !!document.querySelector('.nav-controls'),
      controlsVisible: [...document.querySelectorAll('.nav-controls button')].every((b) => getComputedStyle(b).display !== 'none'),
    }));
    expect(open.active).toBe(true);
    expect(open.expanded).toBe('true');
    expect(open.hasControls).toBe(true);
    expect(open.controlsVisible).toBe(true);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    const closed = await page.evaluate(() => document.getElementById('nav-links').classList.contains('active'));
    expect(closed).toBe(false);
  });
});
