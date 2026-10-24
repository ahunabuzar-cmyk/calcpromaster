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

const BASE = process.env.PLAYWRIGHT_BASE_URL || process.env.E2E_BASE || 'http://localhost:3100';

// Failure tracking, deliberately the same contract as
// tests/e2e/deploy-smoke.spec.js → trackFailures():
//
//   FATAL — real page-JS exceptions, and any FIRST-PARTY (same-origin) request
//           that 4xx/5xx's or fails to connect.
//   NOT fatal — a third-party resource that a datacenter IP or a strict ORB
//           policy blocks. "Failed to load resource" console messages carry no
//           URL, so they are dropped here and the request/response handlers
//           above decide, which do carry one.
//
// This spec previously treated every console error as a page defect, which made
// it fail on all seven routes for one partner asset. Measured 2026-10-15:
// https://startupfa.me/badges/featured-badge.webp (the StartupFame footer badge
// on every page) answers **403 text/html** to a non-browser client, so Chrome
// ORB-blocks the response and logs "Failed to load resource" — on the live site
// and locally alike, independent of our markup. Same-origin breakage is still a
// hard failure, so a genuinely broken asset cannot hide behind this rule.
function trackFailures(page) {
  const origin = new URL(BASE).origin;
  const firstParty = [];
  const thirdParty = [];
  const errors = [];
  const isFirstParty = (u) => { try { return new URL(u).origin === origin; } catch (e) { return false; } };
  page.on('response', (r) => {
    if (r.status() < 400) return;
    (isFirstParty(r.url()) ? firstParty : thirdParty).push(r.status() + ' ' + r.url());
  });
  page.on('requestfailed', (r) => {
    const f = r.failure();
    const line = 'FAILED ' + r.url() + ' ' + (f && f.errorText);
    (isFirstParty(r.url()) ? firstParty : thirdParty).push(line);
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource/i.test(m.text())) return; // URL-less; covered above
    errors.push('console: ' + m.text());
  });
  return { firstParty, thirdParty, errors };
}

test.describe('axe-core accessibility audit', () => {
  for (const route of ROUTES) {
    test(`${route.name} (${route.path}) has no critical/serious violations`, async ({ page }) => {
      const t = trackFailures(page);

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

      expect(t.errors, `Page errors on ${route.path}: ${t.errors.join(' | ')}`).toEqual([]);
      expect(t.firstParty, `First-party resource failures on ${route.path}: ${t.firstParty.join(' | ')}`).toEqual([]);
      expect(serious, `CRITICAL/SERIOUS axe violations on ${route.path}:\n${snippet}`).toEqual([]);

      console.log(`  ✓ ${route.name}: ${results.violations.length} total violations ` +
        `(${serious.length} serious, ${medium.length} medium/minor)`);
      if (t.thirdParty.length) {
        console.log(`    ~ third-party resource(s) blocked (not a page defect): ${t.thirdParty.join(' | ')}`);
      }
      for (const v of medium) {
        console.log(`    ~ ${v.id} (${v.impact}): ${v.help}`);
      }
    });
  }
});
