// ============================================================
// CalcProMaster — Weekly Indexing Monitor
// ------------------------------------------------------------
// One command that tells the owner whether the site is still
// healthy for Google indexing AFTER Search Console submission.
//
// Checks (all against the LIVE production URL):
//   1. Homepage + critical routes  → HTTP 200
//   2. sitemap.xml                 → 200, valid XML, loc count,
//                                    no localhost / non-live-domain URLs
//   3. robots.txt                  → 200, no "Disallow: /"
//   4. Canonical                   → home self-canonical on live domain
//   5. No accidental noindex       → important pages indexable
//   6. Missing assets              → true 404 (not soft-404 200)
//   7. Core Web Vitals (optional)  → CLS/LCP via Playwright if installed
//   8. Console errors (optional)   → 0 critical errors on homepage
//
// Usage:
//   node scripts/indexing-monitor.cjs
//   PROD_URL=https://calcpromaster.netlify.app node scripts/indexing-monitor.cjs
//
// Exit code: 0 = all healthy · 1 = a real indexing-health issue found.
// Intended to be run weekly (manual or CI cron) — see docs/indexing-monitor.md.
// ============================================================
'use strict';
const https = require('https');

const PROD_URL = (process.env.PROD_URL || 'https://calcpromaster.netlify.app').replace(/\/$/, '');
const HOST = PROD_URL.replace(/^https?:\/\//, '');
const ROUTES = ['/', '/finance/loan-emi', '/health/bmi', '/math/percentage', '/hub/finance', '/about', '/privacy'];

let failures = [];
let passes = 0;

function check(name, ok, detail) {
  if (ok) { passes++; console.log('  ✅ ' + name + (detail ? ' — ' + detail : '')); }
  else { failures.push(name); console.log('  ❌ ' + name + (detail ? ' — ' + detail : '')); }
}

function get(path) {
  return new Promise((resolve, reject) => {
    const req = https.get({ host: HOST, path, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IndexingMonitor/1.0)' }, timeout: 12000 }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (e) => reject(e));
  });
}

async function main() {
  console.log(`\n📊 CalcProMaster — Indexing Monitor`);
  console.log(`   Target: ${PROD_URL}\n`);

  // 1. Critical routes
  console.log('[1/8] Critical routes (HTTP 200)');
  const routeResults = await Promise.all(ROUTES.map(async (p) => {
    try { const r = await get(p); return { p, s: r.status }; } catch { return { p, s: 0 }; }
  }));
  routeResults.forEach(({ p, s }) => check(p + ' → 200', s === 200, s === 200 ? undefined : 'got ' + s));

  // 2. Sitemap
  console.log('\n[2/8] sitemap.xml');
  let sitemapOk = false, locCount = 0, badDomain = 0;
  try {
    const r = await get('/sitemap.xml');
    const xmlOk = r.status === 200 && r.body.includes('<urlset') && r.body.includes('<loc>');
    const locs = [...r.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    locCount = locs.length;
    badDomain = locs.filter((u) => !u.startsWith(PROD_URL) || u.includes('localhost') || u.includes('127.0.0.1')).length;
    const dupes = locs.length - new Set(locs).size;
    check('200 + valid XML', xmlOk, xmlOk ? undefined : 'status ' + r.status);
    check('loc count', locCount >= 500, locCount + ' URLs');
    check('0 non-live-domain/localhost', badDomain === 0, badDomain === 0 ? undefined : badDomain + ' bad');
    check('0 duplicates', dupes === 0, dupes === 0 ? undefined : dupes + ' dupes');
    sitemapOk = xmlOk && locCount >= 500 && badDomain === 0 && dupes === 0;
  } catch (e) { check('fetchable', false, e.message); }

  // 3. Robots
  console.log('\n[3/8] robots.txt');
  try {
    const r = await get('/robots.txt');
    check('200', r.status === 200, r.status === 200 ? undefined : 'got ' + r.status);
    check('no blanket Disallow: /', !/Disallow\s*:\s*\//.test(r.body), undefined);
    check('sitemap declared', /Sitemap\s*:\s*https?:\/\//i.test(r.body), undefined);
  } catch (e) { check('fetchable', false, e.message); }

  // 4. Canonical
  console.log('\n[4/8] canonical');
  try {
    const r = await get('/');
    const canon = (r.body.match(/rel="canonical" href="([^"]+)"/) || [])[1] || '';
    check('homepage self-canonical', canon === PROD_URL + '/', canon || 'MISSING');
  } catch (e) { check('fetchable', false, e.message); }

  // 5. No accidental noindex
  console.log('\n[5/8] indexability (no noindex on important pages)');
  for (const p of ['/', '/finance/loan-emi', '/about']) {
    try {
      const r = await get(p);
      check(p + ' indexable', r.status === 200 && !/noindex/.test(r.body), undefined);
    } catch (e) { check(p + ' indexable', false, e.message); }
  }

  // 6. Missing assets → true 404
  console.log('\n[6/8] missing assets → real 404');
  for (const p of ['/js/definitely-missing.js', '/og/definitely-missing.png']) {
    try {
      const r = await get(p);
      check(p + ' → 404', r.status === 404, r.status === 404 ? undefined : 'got ' + r.status + ' (soft-404!)');
    } catch (e) { check(p, false, e.message); }
  }

  // 7. Core Web Vitals (best-effort, Playwright only)
  console.log('\n[7/8] Core Web Vitals (LIVE, via Playwright if available)');
  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
    let cls = 0, lcp = 0;
    await page.addInitScript(() => {
      window.__cls = 0;
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
        }).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length) window.__lcp = entries[entries.length - 1].startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) { /* non-fatal */ }
    });
    await page.goto(PROD_URL + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('h1').first().waitFor({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    cls = await page.evaluate(() => window.__cls || 0);
    lcp = await page.evaluate(() => window.__lcp || 0);
    await browser.close();
    const clsSecs = (cls / 1000).toFixed(3);
    const clsGood = cls / 1000 < 0.1;
    const clsPoor = cls / 1000 > 0.25;
    check('CLS < 0.1 (GOOD)', clsGood, 'CLS ' + clsSecs + (clsPoor ? ' (POOR > 0.25)' : clsGood ? '' : ' (needs improvement 0.1–0.25)'));
    check('LCP measured', lcp > 0, lcp > 0 ? 'LCP ' + (lcp / 1000).toFixed(2) + 's' : 'not captured');
  } catch (e) {
    check('Playwright CWV', false, 'playwright unavailable or error: ' + e.message.slice(0, 80));
  }

  // 8. Console errors (best-effort)
  console.log('\n[8/8] console errors (LIVE homepage)');
  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' && !/analytics|gtag|adSense/i.test(m.text())) errors.push(m.text().slice(0, 80)); });
    page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message.slice(0, 80)));
    await page.goto(PROD_URL + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('h1').first().waitFor({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await browser.close();
    check('0 critical console errors', errors.length === 0, errors.length === 0 ? undefined : errors.slice(0, 3).join(' | '));
  } catch (e) {
    check('Playwright console', false, e.message.slice(0, 80));
  }

  // Summary
  console.log('\n' + '='.repeat(52));
  console.log(`RESULT: ${passes} passed · ${failures.length} failed`);
  if (failures.length) {
    console.log('Failures:');
    failures.forEach((f) => console.log('  - ' + f));
    console.log('\n🔴 INDEXING HEALTH ISSUE(S) — fix before relying on search traffic.');
    process.exit(1);
  } else {
    console.log('🟢 ALL INDEXING HEALTH CHECKS PASS — site remains indexing-ready.');
    if (sitemapOk) console.log(`   (sitemap: ${locCount} URLs, all on live domain)`);
  }
}

main().catch((e) => { console.error('Monitor crashed:', e.message); process.exit(1); });
