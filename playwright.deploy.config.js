// ====== CalcPro Deploy E2E Config ======
// Runs the E2E suite against the BUILT deploy/ folder (the exact artifact that
// gets uploaded to Netlify), served by serve-deploy.cjs — which mimics Netlify
// behavior (SPA fallback for deep links, no-cache for shell/js).
// Run: npx playwright test --config playwright.deploy.config.js
// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const fs = require('fs');
const path = require('path');

// Regenerate tool-routes.json when missing or corrupt (NUL bytes once silently
// made the health-check collect 0 tests). The ROOT config writes it, but a fresh
// clone / deploy-only run must never silently test zero tools.
function ensureToolRoutes() {
  try {
    const routes = JSON.parse(fs.readFileSync(path.join(__dirname, 'tool-routes.json'), 'utf8'));
    if (Array.isArray(routes) && routes.length > 0) return;
  } catch (e) { /* fall through and regenerate */ }
  const { chromium } = require('@playwright/test');
  console.log('[deploy-config] tool-routes.json missing/corrupt — regenerating from js/data/*.js');
  const dataDir = path.join(__dirname, 'js', 'data');
  const catMap = {
    'finance.js': 'finance', 'health.js': 'health', 'math.js': 'math',
    'everyday.js': 'everyday', 'science.js': 'science', 'engineering.js': 'engineering',
    'construction.js': 'construction', 'conversion.js': 'conversion', 'business.js': 'business',
    'education.js': 'education', 'utilities.js': 'utilities', 'lifestyle.js': 'lifestyle',
    'regional.js': 'regional', 'food-nutrition.js': 'food', 'fitness-exercise.js': 'fitness',
    'auto-transport.js': 'auto', 'career-freelance.js': 'career', 'home-garden.js': 'homegarden',
    'tech-digital.js': 'tech', 'parenting-family.js': 'family'
  };
  const routes = [];
  for (const file of fs.readdirSync(dataDir)) {
    if (!file.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(dataDir, file), 'utf8');
    const cat = catMap[file] || file.replace('.js', '');
    for (const m of src.matchAll(/\{\s*id: ['"]([^'"]+)['"]/g)) routes.push({ id: m[1], name: m[1], cat });
  }
  fs.writeFileSync(path.join(__dirname, 'tool-routes.json'), JSON.stringify(routes, null, 2));
}
ensureToolRoutes();

// Dedicated port (3100): the dev server (server.js) binds 3000, and
// reuseExistingServer would silently test the SOURCE tree instead of deploy/.
const DEPLOY_PORT = Number(process.env.DEPLOY_PORT || 3100);
// Override for live-site smoke: point the SAME spec files at the deployed
// production URL (e.g. the Netlify deploy URL from the deploy job).
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:' + DEPLOY_PORT;

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 800 }
  },
  projects: [
    {
      name: 'deploy-chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'deploy-mobile',
      // Pixel 7 = Android Chrome 412x915 — representative of the India market
      // (Chrome Android dominates). Full touch + mobile user-agent so the site's
      // responsive/mobile paths actually execute (not just a shrunk viewport).
      use: { ...devices['Pixel 7'] }
    }
  ],
  // Only spin up the local deploy server when testing the local artifact.
  // When PLAYWRIGHT_BASE_URL points at a deployed URL, nothing starts locally.
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'node serve-deploy.cjs',
    env: { PORT: String(DEPLOY_PORT) },
    url: 'http://localhost:' + DEPLOY_PORT,
    reuseExistingServer: true,
    timeout: 30_000
  }
});
