// Self-contained browser QA sweep for the deploy artifact.
// - Ensures the deploy server on :3100 is up (spawns it if not)
// - Sweeps tool routes (SKIP_TOOLS/MAX_TOOLS chunking) via Playwright directly
// - Checks: h1 visible, first input visible, calculate click, result area
//   populated and free of crash/NaN/undefined/Infinity/null leaks
// - Captures console errors + pageerrors per tool
// - Writes test-results/browser-sweep-<chunk>.json and merges console errors
//   into test-results/error-report-deploy-chromium.json (same accumulation as the spec)
// Run: node scripts/browser-sweep.cjs   (SKIP_TOOLS / MAX_TOOLS env vars optional)
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { chromium } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const PORT = 3100;
const BASE = `http://127.0.0.1:${PORT}`;
const ROUTES_FILE = path.join(ROOT, 'tool-routes.json');

function loadRoutes() {
  try {
    return JSON.parse(fs.readFileSync(ROUTES_FILE, 'utf8'));
  } catch (e) {
    console.error('NO_ROUTES ' + ROUTES_FILE);
    return [];
  }
}

function httpOk(port, pathname) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: pathname || '/', timeout: 3000 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function ensureServer() {
  if (await httpOk(PORT, '/')) return;
  console.log('SERVER_STARTING');
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env, PORT: String(PORT), ROOT: 'deploy' },
  });
  child.unref();
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (await httpOk(PORT, '/')) { console.log('SERVER_READY'); return; }
    await new Promise((r) => setTimeout(r, 700));
  }
  console.error('SERVER_TIMEOUT');
  process.exit(1);
}

const BAD_RESULT = /Error:|not a function|TypeError|NaN|undefined|Infinity|\bnull\b/;

async function checkTool(page, tool) {
  const errs = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errs.push(msg.text()); });
  page.on('pageerror', (err) => errs.push('PAGEERROR: ' + String(err.message || err)));

  const outcome = { cat: tool.cat, id: tool.id, ok: false, h1: false, input: false, clicked: false, resultPreview: '', errors: [] };
  try {
    await page.goto(`${BASE}/${tool.cat}/${tool.id}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    // waitForSelector retries until visible (isVisible does NOT retry, which
    // raced hydration under concurrency). Mirrors expect().toBeVisible().
    await page.waitForSelector('#mainContent h1, #calc-form h1, #calc-form .tool-title', { state: 'visible', timeout: 12000 });
    outcome.h1 = true;
    await page.waitForSelector('#calc-form .calc-input, #calc-form input, #calc-form select', { state: 'visible', timeout: 12000 });
    outcome.input = true;
    await page.waitForSelector('#calc-form .calc-btn, #calc-form button[type=submit], #calc-form button', { state: 'visible', timeout: 12000 });
    const btn = page.locator('#calc-form .calc-btn, #calc-form button[type=submit], #calc-form button').first();
    await btn.click({ timeout: 5000 }).catch(() => {});
    outcome.clicked = true;
    await page.waitForTimeout(700);
    const resultText = (await page.locator('#result-area').textContent().catch(() => '')) || '';
    outcome.resultPreview = resultText.trim().slice(0, 160);
    outcome.ok = outcome.h1 && outcome.input && resultText.trim().length > 0 && !BAD_RESULT.test(resultText);
  } catch (e) {
    outcome.errors.push('SWEEP: ' + String(e.message || e).slice(0, 300));
  }
  outcome.errors.push(...errs);
  return outcome;
}

(async () => {
  const routes = loadRoutes();
  const SKIP = parseInt(process.env.SKIP_TOOLS || '0', 10);
  const MAX = parseInt(process.env.MAX_TOOLS || String(routes.length), 10);
  const chunk = routes.slice(SKIP, SKIP + MAX);
  console.log(`SWEEP chunk ${SKIP}..${SKIP + chunk.length} of ${routes.length}`);
  await ensureServer();

  const browser = await chromium.launch({ headless: true });
  const results = [];
  const concurrency = 4;
  for (let i = 0; i < chunk.length; i += concurrency) {
    const batch = chunk.slice(i, i + concurrency);
    const pages = await Promise.all(batch.map(() => browser.newPage()));
    const outs = await Promise.all(batch.map((tool, j) => checkTool(pages[j], tool)));
    await Promise.all(pages.map((p) => p.close().catch(() => {})));
    results.push(...outs);
    const done = Math.min(i + concurrency, chunk.length);
    process.stdout.write(`\r  ${done}/${chunk.length} (${results.filter(r => r.ok).length} ok, ${results.filter(r => !r.ok).length} fail)`);
  }
  await browser.close();
  console.log('\nSWEEP_DONE');

  const fails = results.filter(r => !r.ok);
  const consoleErrTools = results.filter(r => r.errors.some(e => !e.startsWith('SWEEP:')));
  const file = path.join(ROOT, 'test-results', `browser-sweep-${SKIP}-${SKIP + chunk.length}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ generated: new Date().toISOString(), chunk: [SKIP, SKIP + chunk.length], total: chunk.length, pass: results.length - fails.length, fail: fails.length, fails, consoleErrTools: consoleErrTools.map(r => ({ cat: r.cat, id: r.id, errors: r.errors })) }, null, 2));
  console.log(`REPORT ${file}`);

  // Merge console errors into the same accumulation file the spec uses.
  if (consoleErrTools.length) {
    const accFile = path.join(ROOT, 'test-results', 'error-report-deploy-chromium.json');
    let accumulated = { generated: new Date().toISOString(), total: routes.length, errors: [] };
    try { accumulated = JSON.parse(fs.readFileSync(accFile, 'utf8')); } catch (e) { /* first chunk */ }
    const seen = new Set(accumulated.errors.map(e => e.tool + '|' + e.type + '|' + e.text));
    for (const t of consoleErrTools) {
      for (const e of t.errors) {
        const key = t.id + '|console|' + e;
        if (!seen.has(key)) { accumulated.errors.push({ tool: t.id, type: 'console', text: e }); seen.add(key); }
      }
    }
    fs.writeFileSync(accFile, JSON.stringify(accumulated, null, 2));
  }
  if (fails.length) {
    console.log('FAILS:');
    for (const f of fails) console.log(`  ${f.cat}/${f.id} h1=${f.h1} input=${f.input} clicked=${f.clicked} result="${f.resultPreview}"`);
  }
  process.exit(fails.length ? 1 : 0);
})();