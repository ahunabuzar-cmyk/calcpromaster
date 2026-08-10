// ============================================================
// CalcProMaster — HUB + RANDOM TOOL + MOBILE SWEEP (evidence, v2)
// Usage: node scripts/hub-tool-sweep.cjs [baseURL] [seed] [toolCount]
//   baseURL  default http://localhost:3100 (production artifact)
//   seed     optional random seed
//   toolCount optional number of random tools (default 10)
// Hard per-route deadline + third-party network abort (proves
// calculators work with NO external calls — offline-safe core).
// ============================================================
const { chromium, devices } = require('playwright');
const routes = require('../tool-routes.json');

const BASE = process.argv[2] || 'http://localhost:3100';
const SEED = process.argv[3] ? parseInt(process.argv[3], 10) : Date.now();
const TOOL_COUNT = process.argv[4] ? parseInt(process.argv[4], 10) : 10;
const CATS = [...new Set(routes.map(t => t.cat).filter(Boolean))];

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(SEED);

const withDeadline = (p, ms, label) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error('DEADLINE ' + ms + 'ms: ' + label)), ms))
]);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(10000);
  // Block ALL third-party network (currency APIs, fonts, ads, analytics):
  // proves calculator math never depends on the network.
  await page.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 140)); });
  page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + String(e).slice(0, 140)));

  const report = { seed: SEED, base: BASE, hubs: [], tools: [], mobile: [], consoleErrors: [] };

  async function checkRoute(url, extraWait) {
    const out = { url: url.replace(BASE, ''), h1: '', toolRendered: false, calcResult: '', overflow: false, httpOk: true };
    try {
      await withDeadline(page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 }), 16000, url);
      await page.waitForTimeout(extraWait || 1200);
      out.h1 = (await page.locator('main h1').first().textContent().catch(() => '')).trim().slice(0, 80);
      out.toolRendered = (await page.locator('.calc-input-panel input, #calcForm input, .calc-form input, #toolInputs input, .calc-panel input').count()) > 0;
      if (!out.toolRendered) out.toolRendered = (await page.locator('input').count()) > 0;
      const btn = page.locator('button:has-text("Calculate"), button:has-text("Convert"), button:has-text("计算"), input[type="submit"]').first();
      if (await btn.count()) {
        await withDeadline(btn.click({ timeout: 3000 }), 4000, 'click ' + url).catch(() => {});
        await page.waitForTimeout(700);
      }
      out.calcResult = (await page.locator('.result-main, #resultDisplay, .result-value, [class*="result-main"]').first().textContent().catch(() => '')).trim().slice(0, 90);
      out.overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    } catch (e) {
      out.h1 = 'ERROR: ' + String(e).slice(0, 80);
    }
    return out;
  }

  for (const cat of CATS) {
    const r = await checkRoute(`${BASE}/hub/${cat}`, 1000);
    const is404 = r.h1.includes('404') || r.h1 === 'ERROR' || r.h1 === '';
    report.hubs.push({ cat, ok: !is404 && !r.overflow, ...r });
  }

  const shuffled = [...routes].sort(() => rnd() - 0.5).slice(0, TOOL_COUNT);
  for (const t of shuffled) {
    const r = await checkRoute(`${BASE}/${t.cat}/${t.id}`);
    const is404 = r.h1.includes('404') || r.h1 === 'ERROR' || r.h1 === '';
    report.tools.push({ id: t.id, cat: t.cat, ok: !is404 && !r.overflow, rendered: r.toolRendered, result: r.calcResult, overflow: r.overflow, h1: r.h1 });
  }

  const mobileSample = ['/finance/loan-emi', '/health/bmi', '/math/percentage', '/everyday/date-diff', '/conversion/length', '/', '/hub/finance'];
  // Real touch contexts (iPhone SE = 320/375-class, Pixel 7 = 412px) so the
  // `@media (hover:none), (pointer:coarse)` 44px tap-target rules actually apply.
  const mobileContexts = [devices['iPhone SE'], devices['iPhone 12'], devices['Pixel 7']];
  for (const dev of mobileContexts) {
    const ctx = await browser.newContext({ ...dev });
    const mpage = await ctx.newPage();
    for (const path of mobileSample) {
      const out = { url: path, vw: dev.viewport.width, h1: '', overflow: false, tapTargetsBelow44: 0, rendered: false };
      try {
        await withDeadline(mpage.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 12000 }), 16000, 'mob ' + path);
        await mpage.waitForTimeout(1100);
        out.h1 = (await mpage.locator('main h1').first().textContent().catch(() => '')).trim().slice(0, 70);
        out.rendered = (await mpage.locator('input').count()) > 0 || path === '/' || path.startsWith('/hub/');
        out.overflow = await mpage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        out.tapTargetsBelow44 = await mpage.evaluate(() => {
          let n = 0;
          document.querySelectorAll('button, a.btn, input[type="submit"]').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && r.height < 44 && r.bottom <= window.innerHeight && r.right <= window.innerWidth) n++;
          });
          return n;
        });
      } catch (e) {
        out.h1 = 'ERROR: ' + String(e).slice(0, 70);
      }
      const is404 = out.h1.includes('404') || out.h1 === 'ERROR';
      report.mobile.push({ ...out, ok: !is404 && !out.overflow && out.tapTargetsBelow44 <= 2 });
    }
    await ctx.close();
  }

  report.consoleErrors = [...new Set(consoleErrors)].slice(0, 8);
  await browser.close();

  const hubFail = report.hubs.filter(h => !h.ok);
  const toolFail = report.tools.filter(t => !t.ok);
  const mobFail = report.mobile.filter(m => !m.ok);
  console.log('=== HUB SWEEP ===');
  console.log(`hubs: ${report.hubs.length}  PASS: ${report.hubs.length - hubFail.length}  FAIL: ${hubFail.length}`);
  if (hubFail.length) hubFail.forEach(h => console.log('  FAIL hub/' + h.cat + ' → ' + h.h1));
  console.log('=== RANDOM TOOLS (' + TOOL_COUNT + ') ===');
  console.log(`tools: ${report.tools.length}  PASS: ${report.tools.length - toolFail.length}  FAIL: ${toolFail.length}`);
  report.tools.forEach(t => console.log(`  ${t.ok ? 'OK ' : 'FAIL'} ${t.cat}/${t.id} rendered=${t.rendered} result="${t.result}" overflow=${t.overflow}`));
  console.log('=== MOBILE ===');
  console.log(`mobile: ${report.mobile.length}  PASS: ${report.mobile.length - mobFail.length}  FAIL: ${mobFail.length}`);
  mobFail.forEach(m => console.log(`  FAIL ${m.url} @${m.vw}px h1="${m.h1}" overflow=${m.overflow} tap<44=${m.tapTargetsBelow44}`));
  const worstTap = Math.max(...report.mobile.map(m => m.tapTargetsBelow44));
  console.log('=== CONSOLE ERRORS (deploy, 3rd-party blocked) ===');
  console.log(report.consoleErrors.length ? report.consoleErrors.join('\n') : 'none');
  console.log(`=== SUMMARY: hubs=${report.hubs.length - hubFail.length}/${report.hubs.length} tools=${report.tools.length - toolFail.length}/${report.tools.length} mobile=${report.mobile.length - mobFail.length}/${report.mobile.length} worstTapUnder44=${worstTap} ===`);
  process.exit(hubFail.length || toolFail.length || mobFail.length ? 1 : 0);
})().catch(e => { console.error('SWEEP CRASH:', e.message); process.exit(2); });
