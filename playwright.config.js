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
    // Tool-level objects start with "  { id: '...' " — matches BOTH single- and double-quoted ids
    // (some data files declare { id: "random-generator", name: "..." } with double quotes)
    const re = /^\s{2}\{\s*id:\s*['"]([^'"]+)['"]\s*,\s*name:\s*['"]([^'"]+)['"]/gm;
    let m;
    while ((m = re.exec(src)) !== null) {
      routes.push({ id: m[1], name: m[2], cat });
    }
  }
  return routes;
}

const TOOL_ROUTES = discoverToolRoutes();

// Persist the route list for the health-check report
if (!process.env.CI) {
  try {
    const outDir = path.join(__dirname, 'test-results');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'tool-routes.json'), JSON.stringify(TOOL_ROUTES, null, 2));
  } catch (e) { /* non-fatal */ }
}

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 4,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
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
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30_000
  }
});
