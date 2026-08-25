// ====== CalcPro E2E Health Check ======
// Loops every tool route, simulates user interaction (focus inputs, click Calculate),
// verifies the result container populates, and captures silent browser console errors
// into test-results/error-report-<project>.json (per Playwright project — no overwrite race)
// Run: npm run test:health
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Written by playwright.config.js at the project root (NOT inside test-results/,
// which Playwright clears at run start — that used to wipe the routes file and
// made every health-check run collect zero tests).
const ROUTES_FILE = path.join(__dirname, '..', '..', 'tool-routes.json');

function loadRoutes() {
  try {
    return JSON.parse(fs.readFileSync(ROUTES_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

const TOOLS = loadRoutes();

// Chunking support: SKIP_TOOLS / MAX_TOOLS let the full 566-tool sweep be split
// into multiple runs (each under CI/terminal time limits) without re-running
// the same tools. Example: SKIP_TOOLS=190 MAX_TOOLS=190 covers tools 191-380.
const SKIP_TOOLS = process.env.SKIP_TOOLS ? parseInt(process.env.SKIP_TOOLS, 10) : 0;
const MAX_TOOLS = process.env.MAX_TOOLS ? parseInt(process.env.MAX_TOOLS, 10) : TOOLS.length;
const CHUNK = TOOLS.slice(SKIP_TOOLS, SKIP_TOOLS + MAX_TOOLS);

// DEEP_CHECK (default ON): beyond crash-free, assert the result area actually
// produced content — non-empty, and free of NaN/undefined/Infinity leaks that a
// crash-check alone would miss (a tool could render a blank/static result and
// still pass the old isCrash check). Set DEEP_CHECK=0 to run crash-only.
const DEEP_CHECK = process.env.DEEP_CHECK !== '0';
const BAD_RESULT = /Error:|not a function|TypeError|NaN|undefined|Infinity|\bnull\b/;

// Per-project error accumulation (project name comes from testInfo, NOT an env var)
const reportByProject = {};

function reportFile(projectName) {
  return path.join(__dirname, '..', '..', 'test-results', 'error-report-' + projectName + '.json');
}

test.describe('All calculators health check', () => {
  test.skip(TOOLS.length === 0, 'No tool routes discovered — run config first');

  for (const tool of CHUNK) {
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

      // The tool page renders a tool <h1> inside #mainContent (no .tool-header class in the
      // real app) plus the <form id="calc-form"> with .calc-input fields and a .calc-btn.
      await expect(page.locator('#mainContent h1, #calc-form h1, #calc-form .tool-title')).toBeVisible({ timeout: 15_000 });

      const form = page.locator('#calc-form');
      const inputs = form.locator('.calc-input, input, select');
      // Auto-retrying locator assertion (NOT a plain value assert): under load the
      // h1 can render a beat before the form fields populate, and a one-shot
      // count() then flakily reads 0. expect(locator).toBeVisible() retries until
      // the form actually exists, so the sweep is stable under parallel workers.
      await expect(inputs.first()).toBeVisible({ timeout: 15_000 });

      await inputs.first().focus().catch(() => {});
      const calcBtn = page.locator('#calc-form .calc-btn, #calc-form button[type=submit], #calc-form button');
      if (await calcBtn.count()) {
        await calcBtn.first().click({ timeout: 5000 }).catch(() => {});
      }

      await page.waitForTimeout(900);
      const resultArea = page.locator('#result-area');
      const resultText = (await resultArea.textContent().catch(() => '')) || '';

      // Crash check — a hard error string means the calc path blew up.
      const isCrash = resultText.includes('Error:') || resultText.includes('not a function') || resultText.includes('TypeError');
      expect(isCrash).toBe(false);

      // DEEP correctness: the tool must have produced output, and no NaN /
      // undefined / Infinity / null leaks may appear in the rendered result.
      if (DEEP_CHECK) {
        expect(resultText.trim().length).toBeGreaterThan(0);
        expect(BAD_RESULT.test(resultText)).toBe(false);
      }

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
      // MERGE (not overwrite): chunked runs (SKIP_TOOLS/MAX_TOOLS) must accumulate
      // into one report instead of wiping the previous chunk's findings.
      let accumulated = { generated: new Date().toISOString(), total: TOOLS.length, errors: [] };
      try {
        const prev = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (Array.isArray(prev.errors)) accumulated.errors = prev.errors;
      } catch (e) { /* first chunk */ }
      const seen = new Set(accumulated.errors.map(e => e.tool + '|' + e.type + '|' + e.text));
      for (const err of reportByProject[projectName].errors) {
        const key = err.tool + '|' + err.type + '|' + err.text;
        if (!seen.has(key)) { accumulated.errors.push(err); seen.add(key); }
      }
      fs.writeFileSync(file, JSON.stringify(accumulated, null, 2));
      console.log(`📋 E2E report: ${file} (${accumulated.errors.length} unique errors)`);
    }
  });
});
