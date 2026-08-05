// ====== CalcPro Visual Regression ======
// Desktop + mobile viewport snapshots for home, category, and representative tool pages.
// Flags broken element boundaries / layout drift.
// Run: npm run test:visual  (first run generates baselines)
const { test, expect } = require('@playwright/test');

const SNAPSHOT_PAGES = [
  { path: '/', name: 'home' },
  { path: '/finance', name: 'finance-category' },
  { path: '/finance/loan-emi', name: 'loan-emi' },
  { path: '/health/bmi', name: 'bmi' },
  { path: '/utilities/qr-generator', name: 'qr-generator' },
  { path: '/math/percentage', name: 'percentage' }
];

for (const page of SNAPSHOT_PAGES) {
  test.describe(`Visual regression: ${page.name}`, () => {
    test('desktop full-page snapshot', async ({ page }) => {
      await page.goto(page.path, { waitUntil: 'domcontentloaded' });
      // Wait for main content to render
      await expect(page.locator('#mainContent')).not.toBeEmpty({ timeout: 15_000 });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`desktop-${page.name}.png`, { fullPage: true, maxDiffPixelRatio: 0.05 });
    });

    test('mobile full-page snapshot', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(page.path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#mainContent')).not.toBeEmpty({ timeout: 15_000 });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`mobile-${page.name}.png`, { fullPage: true, maxDiffPixelRatio: 0.05 });
    });
  });
}
