// ====== CalcPro Playwright Configuration ======
// E2E health-check + visual regression across all 500+ tool routes
// Run: npm run test:e2e   |   npm run test:visual
// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// ---------- Tool route discovery ----------
// Returns [{ id, name, cat }] for every calculator route.
//
// PRIMARY SOURCE: the built deploy/ tree. A tool route exists exactly when
// deploy/<cat>/<tool>/index.html exists, so this is the ground truth for what
// the server actually serves.
//
// Why the data-file scan is only the fallback: `{ id: 'x'` is the shape of BOTH
// a tool object and an input-field definition (e.g. `{ id: 'cpm', label: 'CPM',
// type: 'number', def: 18 }`), so scanning js/data/*.js produced 1450 "routes"
// for 1282 real tools — including 10 duplicate cat/id pairs. Playwright rejects
// duplicate test titles, so that made the whole suite uncollectable.
const NON_TOOL_DIRS = new Set([
  'assets', 'js', 'css', 'images', 'og', 'fonts', 'icons', 'icons-tools', '.well-known',
  'embed', 'guides', 'blog', 'hub', 'search', 'tok', 'node_modules'
]);

function dedupeRoutes(routes) {
  const seen = new Set();
  const out = [];
  for (const r of routes) {
    const key = r.cat + '/' + r.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function routesFromDeploy() {
  const deployDir = path.join(__dirname, 'deploy');
  if (!fs.existsSync(deployDir)) return [];
  const routes = [];
  for (const cat of fs.readdirSync(deployDir, { withFileTypes: true })) {
    if (!cat.isDirectory() || cat.name.startsWith('.') || NON_TOOL_DIRS.has(cat.name)) continue;
    const catDir = path.join(deployDir, cat.name);
    for (const tool of fs.readdirSync(catDir, { withFileTypes: true })) {
      if (!tool.isDirectory() || tool.name.startsWith('.') || NON_TOOL_DIRS.has(tool.name)) continue;
      if (fs.existsSync(path.join(catDir, tool.name, 'index.html'))) {
        routes.push({ id: tool.name, name: tool.name, cat: cat.name });
      }
    }
  }
  return routes;
}

// Fallback: scan js/data/*.js, keeping only objects that carry a tool `name:`
// (an input field never does) and de-duplicating by cat/id.
function discoverToolRoutes() {
  const fromDeploy = routesFromDeploy();
  if (fromDeploy.length) return dedupeRoutes(fromDeploy);

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
    // A tool object always carries a `name:` on its opening line; an input-field
    // definition never does (`{ id: 'cpm', label: 'CPM', type: 'number' }`), so
    // requiring `name:` on the same line is what separates the two.
    const re = /^[ \t]*\{[ \t]+id:[ \t]*['"]([^'"]+)['"][^\n]*\bname:[ \t]*['"]([^'"]*)['"]/gm;
    let m;
    while ((m = re.exec(src)) !== null) {
      routes.push({ id: m[1], name: m[2] || m[1], cat });
    }
  }
  return dedupeRoutes(routes);
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
  // The E2E suites run against the BUILT deploy/ artifact on :3100 — the same
  // target every other probe script uses (browser-sweep, axe-scan, lighthouse).
  // server.js defaults to PORT=3000/ROOT=. , so a bare `node server.js` here
  // never satisfied the :3100 health check and the run died with
  // "Timed out waiting 30000ms from config.webServer" whenever no external
  // deploy server happened to be running. Pass the same env the
  // scripts/serve-deploy.cjs launcher uses instead.
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 30_000,
    env: { PORT: '3100', ROOT: 'deploy' }
  }
});
