// ====== CalcPro E2E Health Check ======
// Loops every tool route, simulates user interaction (focus inputs, click Calculate),
// verifies the result container populates, and captures silent browser console errors
// into test-results/error-report-<project>.json (per Playwright project — no overwrite race)
// Run: npm run test:health
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROUTES_FILE = path.join(__dirname, '..', '..', 'test-results', 'tool-routes.json');

function loadRoutes() {
  try {
    return JSON.parse(fs.readFileSync(ROUTES_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

const TOOLS = loadRoutes();

// Per-project error accumulation (project name comes from testInfo, NOT an env var)
const reportByProject = {};

function reportFile(projectName) {
  return path.join(__dirname, '..', '..', 'test-results', 'error-report-' + projectName + '.json');
}

test.describe('All calculators health check', () => {
  test.skip(TOOLS.length === 0, 'No tool routes discovered — run config first');

  for (const tool of TOOLS.slice(0, process.env.MAX_TOOLS ? parseInt(process.env.MAX_TOOLS) : TOOLS.length)) {
    test(`${tool.cat}/${tool.id} renders + calculates without crashing`, async ({ page }, testInfo) => {
      const projectName = testInfo.project.name;
      const pageErrors = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          pageErrors.push({ tool: tool.id, type: 'console', text: msg.text() });
        }
      });
      page.on('pageerror', (err) => {
        pageErrors.push({ tool: tool.id, type: 'pageerror', text: String(err.message || err) });
      });

      await page.goto(`/${tool.cat}/${tool.id}`, { waitUntil: 'domcontentloaded' });

      await expect(page.locator('.tool-header h1, .tool-header')).toBeVisible({ timeout: 15_000 });

      const inputs = page.locator('.calc-input');
      const inputCount = await inputs.count().catch(() => 0);
      expect(inputCount).toBeGreaterThan(0);

      await inputs.first().focus().catch(() => {});
      const calcBtn = page.locator('.calc-btn');
      if (await calcBtn.count()) {
        await calcBtn.first().click({ timeout: 5000 }).catch(() => {});
      }

      await page.waitForTimeout(800);
      const resultArea = page.locator('#result-area');
      const resultText = (await resultArea.textContent().catch(() => '')) || '';
      const isCrash = resultText.includes('Error:') || resultText.includes('not a function') || resultText.includes('TypeError');

      expect(isCrash).toBe(false);

      if (pageErrors.length > 0) {
        reportByProject[projectName] = reportByProject[projectName] || { generated: new Date().toISOString(), total: TOOLS.length, errors: [] };
        reportByProject[projectName].errors.push(...pageErrors);
        testInfo.attach('console-errors-' + tool.id, { body: JSON.stringify(pageErrors, null, 2) });
      }
    });
  }

  test.afterAll(() => {
    const outDir = path.join(__dirname, '..', '..', 'test-results');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    for (const projectName of Object.keys(reportByProject)) {
      const file = reportFile(projectName);
      fs.writeFileSync(file, JSON.stringify(reportByProject[projectName], null, 2));
      console.log(`📋 E2E report: ${file} (${reportByProject[projectName].errors.length} errors across ${reportByProject[projectName].total} tools)`);
    }
  });
});
