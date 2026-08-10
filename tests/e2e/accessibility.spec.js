// ====== Accessibility Audit (axe-core) ======
// Runs axe-core against representative routes:
//   home, category hub, calculator, finance calculator, static page
// Fails on critical/serious violations; medium/minor reported as warnings.
// Run: npx playwright test tests/e2e/accessibility.spec.js -c playwright.deploy.config.js
// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const axeSource = fs.readFileSync(path.join(__dirname, '..', '..', 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'hub-finance', path: '/hub/finance' },
  { name: 'calculator-loan-emi', path: '/finance/loan-emi' },
  { name: 'calculator-bmi', path: '/health/bmi' },
  { name: 'calculator-percentage', path: '/math/percentage' },
  { name: 'static-about', path: '/about.html' },
  { name: 'static-privacy', path: '/privacy.html' }
];

const SERIOUS_RULES_TO_ALLOW = [
  // Known / documented trade-offs — re-checked in the audit notes:
  // color-contrast on emoji accents, region on light DOM shells
];

test.describe('axe-core accessibility audit', () => {
  for (const route of ROUTES) {
    test(`${route.name} (${route.path}) has no critical/serious violations`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push('console: ' + m.text());
      });

      await page.goto(route.path, { waitUntil: 'networkidle' });
      // Give the SPA render time (hub/category pages hydrate async)
      await page.waitForTimeout(1200);

      await page.addScriptTag({ content: axeSource });
      const results = await page.evaluate(async () => {
        // @ts-ignore
        return await axe.run(document, {
          resultTypes: ['violations'],
          rules: {
            'color-contrast': { enabled: true },
            'region': { enabled: true }
          }
        });
      });

      const serious = (results.violations || []).filter(v =>
        ['critical', 'serious'].includes(v.impact) && !SERIOUS_RULES_TO_ALLOW.includes(v.id)
      );
      const medium = (results.violations || []).filter(v =>
        ['moderate', 'minor'].includes(v.impact) || v.impact === undefined
      );

      // Collect failing node snippets for the report
      const snippet = serious.map(v =>
        `${v.id} (${v.impact}): ${v.help}\n  nodes: ${v.nodes.length}\n  ${v.nodes.slice(0, 2).map(n => n.html.slice(0, 140)).join('\n  ')}`
      ).join('\n');

      expect(errors, `Console/page errors on ${route.path}: ${errors.join(' | ')}`).toEqual([]);
      expect(serious, `CRITICAL/SERIOUS axe violations on ${route.path}:\n${snippet}`).toEqual([]);

      console.log(`  ✓ ${route.name}: ${results.violations.length} total violations ` +
        `(${serious.length} serious, ${medium.length} medium/minor)`);
      for (const v of medium) {
        console.log(`    ~ ${v.id} (${v.impact}): ${v.help}`);
      }
    });
  }
});
