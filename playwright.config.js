// ====== CalcPro Playwright Configuration ======
// E2E health-check + visual regression across all 500+ tool routes
// Run: npm run test:e2e   |   npm run test:visual
// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// ---------- Tool route discovery ----------
// Scans js/data/*.js for tool objects: { id: 'tool-id', name: 'Tool Name', ... }
// Returns [{ id, name, cat }] for every calculator in the platform.
function discoverToolRoutes() {
  const dataDir = path.join(__dirname, 'js', 'data');
  const routes = [];
  const catMap = {
    'finance.js': 'finance', 'health.js': 'health', 'math.js': 'math',
    'everyday.js': 'everyday', 'science.js': 'science', 'engineering.js': 'engineering',
    'construction.js': 'construction', 'conversion.js': 'conversion', 'business.js': 'business',
    'education.js': 'education', 'utilities.js': 'utilities', 'lifestyle.js': 'lifestyle',
    'regional.js': 'regional', 'food-nutrition.js': 'food', 'fitness-exercise.js': 'fitness',
    'auto-transport.js': 'auto', 'career-freelance.js': 'career', 'home-garden.js': 'homegarden',
    'tech-digital.js': 'tech', 'parenting-family.js': 'family'
  };
  for (const file of fs.readdirSync(dataDir)) {
    if (!file.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(dataDir, file), 'utf8');
    const cat = catMap[file] || file.replace('.js', '');
    // Tool-level objects match `{ id: 'tool-id', ... }` (id may use single or double
    // quotes, and `name:` is NOT required on the same line). Field definitions are
    // written as `{id:'mode'` (no space after the brace), so requiring at least one
    // space after `{` cleanly separates the 566 tools from the 87 field defs.
    const re = /^[ \t]*\{[ \t]+id:[ \t]*['"]([^'"]+)['"]/gm;
    let m;
    while ((m = re.exec(src)) !== null) {
      routes.push({ id: m[1], name: m[1], cat });
    }
  }
  return routes;
}

const TOOL_ROUTES = discoverToolRoutes();

// Persist the route list for the health-check report.
// IMPORTANT: this file lives at the PROJECT ROOT, NOT inside test-results/ —
// Playwright clears its output dir (test-results/) at run start, which used to
// delete tool-routes.json right after the config wrote it, so the health-check
// spec always saw an empty route list ("No tests found").
if (!process.env.CI) {
  try {
    fs.writeFileSync(path.join(__dirname, 'tool-routes.json'), JSON.stringify(TOOL_ROUTES, null, 2));
  } catch (e) { /* non-fatal */ }
}

module.exports = defineConfig({
  // tests/unit/*.test.js are Vitest ESM specs — if Playwright scans them it
  // errors out and aborts collection, so they are excluded here. e2e + visual
  // Playwright suites both live under tests/ and run normally.
  testDir: './tests',
  testIgnore: ['**/unit/**'],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // fullyParallel lets the 566-tool spec file spread across all workers — with
  // a single spec file, the default (false) queues every test on one worker and
  // a full sweep can never finish inside a terminal time limit.
  // workers: 4 saturates the CPU on this machine (heavy chart pages) and causes
  // spurious "Test timeout" / "Tearing down context" failures — 2 is stable.
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    // NOTE: reporter output folders MUST live OUTSIDE the test-results dir — Playwright
    // clears its output dir (test-results/) at run start, so any reporter writing inside
    // it (html or json) makes Playwright fail with ENOTEMPTY/"clashes" errors.
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 800 }
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] }
    }
  ],
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 30_000
  }
});
