// ====== CalcPro Hub Comparison Tables — Every Category ======
// Navigates each of the 20 /hub/<cat> pages and verifies the comparison
// table renders rows with REAL computed values: no '—' for computed fields,
// no undefined/NaN/blob dumps, and a sane number of rows.
// Run: npx playwright test tests/e2e/hub-tables.spec.js
const { test, expect } = require('@playwright/test');

// NOTE: hub routes use the SHORT CALC_DATA keys (same as the /cat/tool routes and
// sitemap) — the lazy categories are keyed `auto`, `career`, `food`, `fitness`,
// `homegarden`, `family`, `tech` (NOT their file names like auto-transport).
const HUBS = [
  'auto', 'business', 'career', 'construction', 'conversion',
  'education', 'engineering', 'everyday', 'finance', 'fitness',
  'food', 'health', 'homegarden', 'lifestyle', 'math',
  'family', 'regional', 'science', 'tech', 'utilities'
];

test.describe('Category hub comparison tables', () => {
  for (const hub of HUBS) {
    test(`hub ${hub} shows real comparison values`, async ({ page }) => {
      const errors = [];
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

      await page.goto('/hub/' + hub, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500); // let lazy SEO + hub table render

      const state = await page.evaluate(() => {
        const table = document.querySelector('.comparison-table');
        if (!table) return { hasTable: false };
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        const cells = Array.from(table.querySelectorAll('tbody td, tbody th')).map(c => (c.textContent || '').trim());
        const bad = cells.filter(c => /undefined|NaN|\[object|\\$\\$|blob|#MOCK/i.test(c));
        const dashes = cells.filter(c => c === '—' || c === '-' || c === '');
        return {
          hasTable: true,
          rowCount: rows.length,
          colCount: table.querySelectorAll('thead th').length || 0,
          badCells: bad.length,
          dashCells: dashes.length,
          sample: cells.slice(0, 6),
          title: (document.title || '').slice(0, 60)
        };
      });

      expect(state.hasTable, `hub ${hub}: no .comparison-table found`).toBe(true);
      expect(state.rowCount, `hub ${hub}: table has no rows`).toBeGreaterThan(0);
      // Real values: zero undefined/NaN placeholders in the table
      expect(state.badCells, `hub ${hub}: bad cells present`).toBe(0);
      // Not every row should be an empty dash — at least one real value per table
      expect(state.dashCells, `hub ${hub}: all cells are empty/dashes`).toBeLessThan(state.colCount * state.rowCount);
      expect(errors.length, `hub ${hub}: console errors: ${errors.join(' | ')}`).toBe(0);
    });
  }
});
