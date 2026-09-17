// Standalone axe-core accessibility scan against the deploy artifact.
// Scans home + one representative tool per category (+ a couple of special
// pages) and writes test-results/axe-report.json.
// Run: node scripts/axe-scan.cjs
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { chromium } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const PORT = 3100;
const BASE = `http://127.0.0.1:${PORT}`;

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
    cwd: ROOT, detached: true, stdio: 'ignore', windowsHide: true,
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

// One representative tool per category (first tool of each category) + home + search.
function representativePages(routes) {
  const pages = [{ path: '/', label: 'home' }];
  const seen = new Set();
  for (const t of routes) {
    if (!seen.has(t.cat)) {
      seen.add(t.cat);
      pages.push({ path: `/${t.cat}/${t.id}`, label: `${t.cat}/${t.id}` });
    }
  }
  return pages;
}

(async () => {
  let routes = [];
  try { routes = JSON.parse(fs.readFileSync(path.join(ROOT, 'tool-routes.json'), 'utf8')); } catch (e) {}
  const pages = representativePages(routes);
  console.log(`AXE_SCAN ${pages.length} pages`);
  await ensureServer();

  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const p of pages) {
    const page = await browser.newPage();
    let pageCrashed = false;
    page.on('crash', () => { pageCrashed = true; });
    page.on('close', () => { if (!page.isClosed && !pageCrashed) pageCrashed = true; });
    const rec = { page: p.label, url: p.path, violations: [], serious: 0, critical: 0, total: 0 };
    try {
      await page.goto(BASE + p.path, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForSelector('#mainContent', { state: 'visible', timeout: 15000 }).catch(() => {});
      // Wait for fade-in animations (e.g. .chart-area fadeInUp 0.6s) to
      // complete so axe measures settled colors, not mid-fade blends.
      await page.evaluate(async () => {
        const deadline = Date.now() + 6000;
        while (Date.now() < deadline) {
          const running = document.getAnimations().filter((a) => a.playState === 'running');
          if (running.length === 0) return;
          await new Promise((r) => setTimeout(r, 120));
        }
      }).catch(() => {});
      await page.waitForTimeout(250);
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const report = await page.evaluate(async () => {
        const r = await window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        });
        return r.violations.map((v) => ({
          id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length,
          sampleTarget: (v.nodes[0] && v.nodes[0].target) || [],
          sampleData: (v.nodes[0] && v.nodes[0].any && v.nodes[0].any[0] && v.nodes[0].any[0].data) || null,
          sampleStyle: (() => {
            const t = v.nodes[0] && v.nodes[0].target;
            if (!t || !t.length) return null;
            const el = document.querySelector(t.join(' '));
            if (!el) return null;
            const cs = getComputedStyle(el);
            return { color: cs.color, bg: cs.backgroundColor, fs: cs.fontSize, fw: cs.fontWeight, cls: String(el.className).slice(0, 50) };
          })(),
        }));
      });
      rec.violations = report;
      rec.critical = report.filter((v) => v.impact === 'critical').length;
      rec.serious = report.filter((v) => v.impact === 'serious').length;
      rec.total = report.reduce((s, v) => s + v.nodes, 0);
      console.log(`  ${p.label}: ${rec.total} violations (${rec.critical} crit, ${rec.serious} serious)`);
    } catch (e) {
      if (pageCrashed) {
        rec.violations = [{ id: 'PAGE_CRASH', impact: 'critical', help: 'renderer crashed — retrying', nodes: 1 }];
        rec.critical = 1; rec.total = 1;
      } else {
        rec.violations = [{ id: 'SCAN_ERROR', impact: 'critical', help: String(e.message || e).slice(0, 200), nodes: 1 }];
        rec.critical = 1; rec.total = 1;
      }
    }
    await page.close().catch(() => {});
    results.push(rec);
  }
  await browser.close();

  const file = path.join(ROOT, 'test-results', 'axe-report.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ generated: new Date().toISOString(), pages: results.length,
    pagesWithViolations: results.filter((r) => r.total > 0).length,
    totalViolations: results.reduce((s, r) => s + r.total, 0),
    totalCritical: results.reduce((s, r) => s + r.critical, 0),
    totalSerious: results.reduce((s, r) => s + r.serious, 0),
    results }, null, 2));
  console.log(`AXE_REPORT ${file}`);
  const bad = results.filter((r) => r.critical > 0 || r.serious > 0);
  if (bad.length) {
    console.log('PAGES WITH CRITICAL/SERIOUS:');
    for (const b of bad) console.log(`  ${b.page}: ${b.critical} crit, ${b.serious} serious`);
  }
})();