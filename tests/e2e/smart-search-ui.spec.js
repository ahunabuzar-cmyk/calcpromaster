// ====== Smart search (natural language → prefilled calculator) E2E ======
// The unit tests cover the parser; these cover the part the user actually
// touches: type a sentence in the hero box, get a smart row, click it, land on
// the calculator with those numbers already in the fields.
//
// Run: npx playwright test tests/e2e/smart-search-ui.spec.js
const { test, expect } = require('@playwright/test');

const SENTENCE = 'emi on 5 lakh for 20 years at 8.5%';

test.describe('Smart search', () => {
  test('hero box turns a sentence into a prefilled calculator', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const box = page.locator('#home-search');
    await expect(box).toBeVisible();

    await box.fill(SENTENCE);
    const smart = page.locator('.search-item.search-smart');
    await expect(smart).toBeVisible({ timeout: 10000 });
    await expect(smart).toContainText('with your numbers');

    await smart.click();
    await page.waitForSelector('form#calc-form', { timeout: 15000 });

    expect(new URL(page.url()).pathname).toContain('/finance/loan-emi');

    await page.waitForTimeout(600);
    const values = await page.evaluate(() => {
      const out = {};
      document.querySelectorAll('form#calc-form input[type="number"]').forEach((el) => {
        out[el.id] = el.value;
      });
      return out;
    });
    // 5 lakh → 500000, 20 years and 8.5% mapped onto their own fields.
    const nums = Object.values(values).map(Number);
    expect(nums).toContain(500000);
    expect(nums).toContain(8.5);
    expect(nums).toContain(20);
    expect(errors, 'page errors: ' + errors.join(' | ')).toEqual([]);
  });

  test('hero example chips run a smart query', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const chip = page.locator('[data-smart-q]').first();
    await expect(chip).toBeVisible();
    await chip.click();
    await expect(page.locator('#home-search')).not.toHaveValue('');
    await expect(page.locator('.search-item.search-smart')).toBeVisible({ timeout: 10000 });
  });

  test('plain search still lists calculators when there are no numbers', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('#home-search').fill('bmi');
    const items = page.locator('#homeSearchResults .search-item');
    await expect(items.first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.search-item.search-smart')).toHaveCount(0);
  });
});
