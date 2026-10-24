#!/usr/bin/env node
// ============================================================
// CalcProMaster — soft-404 detector (live)
// ------------------------------------------------------------
// Cloudflare Pages ka SPA fallback whitelisted prefix ke neeche har unknown path
// par app shell 200 me deta hai, aur app client-side "not found" render karta
// hai. Google ke liye wo SOFT 404 hai: URL 200 hai, page nahi hai.
//
// Do alag cheezein detect hoti hain, aur unhe mila dena hi pichhla bug tha:
//
//   SOFT   200, par HTML ka canonical kisi AUR path par hai aur page app shell
//          nahi hai. Kabhi index nahi hoga, par crawl me soft-404 ke roop me
//          aata hai. Fix: wo path 301 ya 404 de (functions/_middleware.js).
//
//   SHELL  200 app shell (canonical "/"), matlab faisla JS ke baad hota hai.
//          Raw HTML se "soft" kehna galat hai: app 404 view par robots=noindex
//          lagata hai (js/app.js → renderStatic('404')). Is liye is class ko
//          `--render` browser me khol kar verify karta hai: rendered noindex ya
//          404 view = theek; warna asli soft 404.
//
// Default report-only hai (deploy se pehle live purana behaviour dikha sakta
// hai); `--fail` sirf un URLs par fail karta hai jo PROVEN soft 404 hain.
//
// Usage:
//   node scripts/check-soft-404.cjs                  # raw report + JSON
//   node scripts/check-soft-404.cjs --render         # + browser-verified shells
//   node scripts/check-soft-404.cjs --fail           # exit 1 on a real soft 404
//   node scripts/check-soft-404.cjs --render --fail  # CI: worst case covered
//
// Crawl-stats 404 triage: Search Console me crawl requests ka 404 share dikhta
// hai par URL list nahi. "Page indexing → Not found (404) → Export" se URLs
// nikaal ke ek file me daalo (ek path ya URL per line) aur:
//   node scripts/check-soft-404.cjs --urls notfound-404.txt
// Har URL apna verdict + fix deta hai: redirect (theek), 404 (theek), noindex,
// shell, ya soft (fix karo).
// ============================================================
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'soft-404-report.json');
const FAIL = process.argv.includes('--fail');
const RENDER = process.argv.includes('--render');
const URLS_FILE = (() => {
  const i = process.argv.indexOf('--urls');
  return i >= 0 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]) : null;
})();
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : NaN;
  return Number.isFinite(v) && v > 0 ? v : 25;
})();

let ORIGIN = 'https://calcpromaster.com';
try {
  const cfg = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
  const m = cfg.match(/domain:\s*'([^']+)'/);
  if (m && m[1]) ORIGIN = 'https://' + m[1].replace(/^https?:\/\//, '');
} catch (e) { /* default */ }

// Real pages whose wrong twins Google can plausibly crawl. Includes the six
// URLs from the 2026-10-19 Search Console structured-data report, because a
// whole host of URL variants exists for exactly the pages Googlebot visits.
const REAL_SAMPLES = [
  '/health/bmr-mifflin/', '/finance/loan-emi/', '/guides/tip', '/blog/how-emi-works',
  '/tech/', '/hub/finance/', '/about', '/',
  '/homegarden/', '/business/', '/construction/', '/conversion/', '/career/',
];

/** Build the probe list: the case/.html twin of a real page, plus junk children. */
function buildProbes(samples) {
  const out = [];
  const seen = new Set();
  const push = (url, why) => {
    if (seen.has(url)) return;
    seen.add(url);
    out.push({ url, why });
  };
  for (const s of samples) {
    const bare = s.replace(/\/+$/, '');
    if (!bare) continue;
    const last = bare.slice(bare.lastIndexOf('/') + 1);
    const upper = bare.slice(0, bare.length - last.length) + last.toUpperCase();
    if (upper.toUpperCase() !== upper.toLowerCase() && upper !== bare) {
      push(upper, 'uppercase twin of ' + bare);
    }
    if (!/\.[a-z0-9]+$/i.test(bare) && bare.includes('/')) {
      push(bare + '.html', '.html twin of ' + bare);
    }
    push(bare + '/this-page-does-not-exist-xyz', 'junk child of ' + bare);
  }
  return out;
}

function probe(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'CalcProMaster-soft404/1.1' } }, (res) => {
      let body = '';
      const status = res.statusCode;
      const location = res.headers.location || null;
      res.setEncoding('utf8');
      res.on('data', (d) => { if (body.length < 400000) body += d; });
      res.on('end', () => resolve({ status, location, body }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.setTimeout(20000, () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
  });
}

const norm = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').replace(/\/+$/, '') || '/';

/**
 * Classify one raw-HTML probe. Pure: takes the path and the fetched response.
 * Returns { kind, detail } where kind is one of
 *   error | redirect | notfound | noindex | real | shell | soft | other.
 */
function classify(probePath, res) {
  if (!res || res.status === 0) return { kind: 'error', detail: res && res.error ? res.error : 'no response' };
  if (res.status >= 300 && res.status < 400) return { kind: 'redirect', detail: res.status + ' -> ' + (res.location || '?') };
  if (res.status === 404 || res.status === 410) return { kind: 'notfound', detail: String(res.status) };
  if (res.status !== 200) return { kind: 'other', detail: String(res.status) };

  const body = res.body || '';
  const robots = (body.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i) || [])[1] || '';
  if (/noindex/i.test(robots)) return { kind: 'noindex', detail: '200 with robots=' + robots };

  const canon = (body.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
    body.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i) || [])[1] || '';
  if (canon && norm(canon) === norm(probePath)) return { kind: 'real', detail: 'canonical self-references' };

  // The SPA shell: canonical "/" (or none) plus the app mount point. Every
  // unknown path under a whitelisted prefix gets this, so the raw HTML cannot
  // say whether it ends up indexable — the rendered check does.
  if ((!canon || norm(canon) === '/') && /id=["']mainContent["']/.test(body)) {
    return { kind: 'shell', detail: 'SPA shell (200) — needs --render to decide' };
  }
  return { kind: 'soft', detail: canon ? 'canonical points at ' + canon : 'no canonical tag' };
}

/**
 * Classify what the browser ended up with. Pure.
 * `view` = { robots, canonical, text }. A noindex 404 view is acceptable; a 200
 * shell that kept its indexable canonical is the soft 404 Google reports.
 */
function classifyRendered(probePath, view) {
  const robots = String((view && view.robots) || '');
  if (/noindex/i.test(robots)) return { kind: 'noindex', detail: 'rendered robots=' + robots };
  const canon = (view && view.canonical) || '';
  if (canon && norm(canon) === norm(probePath)) return { kind: 'real', detail: 'rendered canonical self-references' };
  if (/404|page not found/i.test(String((view && view.text) || ''))) {
    return { kind: 'soft', detail: '404 view rendered but robots is indexable' };
  }
  return { kind: 'soft', detail: 'rendered page is neither self-canonical nor noindex' };
}

async function renderView(browser, url) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    return await page.evaluate(() => ({
      robots: (document.querySelector('meta[name="robots"]') || {}).content || '',
      canonical: (document.querySelector('link[rel="canonical"]') || {}).href || '',
      text: (document.querySelector('h1') || {}).textContent || document.title || '',
    }));
  } finally {
    await page.close();
  }
}

async function pool(items, fn, n) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); }
  }));
  return out;
}

/** Probes from a list of URLs/paths (a Search Console 404 export). */
function probesFromFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  return text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^"?(url|page|address)/i.test(line))
    .map((line) => {
      let p = line.replace(/^"|"$/g, '');
      try { p = new URL(p, ORIGIN).pathname; } catch (e) { /* keep as written */ }
      return p.startsWith('/') ? p : '/' + p;
    })
    .filter((p, i, all) => all.indexOf(p) === i)
    .map((p) => ({ url: p, why: 'from list' }));
}

async function main() {
  const probes = URLS_FILE ? probesFromFile(URLS_FILE) : buildProbes(REAL_SAMPLES);
  if (URLS_FILE) console.log('probe list: ' + path.relative(ROOT, URLS_FILE));
  console.log('soft-404 check — ' + ORIGIN + ' (' + probes.length + ' probes)');
  const results = await pool(probes, async (p) => {
    const res = await probe(ORIGIN + p.url);
    return { ...p, ...classify(p.url, res), status: res.status };
  }, 6);

  const shells = results.filter((r) => r.kind === 'shell');
  if (RENDER && shells.length) {
    let chromium;
    try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('@playwright/test')); }
    const browser = await chromium.launch();
    try {
      const capped = shells.slice(0, LIMIT);
      console.log('\nrendering ' + capped.length + '/' + shells.length + ' SPA shells (--limit ' + LIMIT + ')');
      await pool(capped, async (r) => {
        try {
          const view = await renderView(browser, ORIGIN + r.url);
          const verdict = classifyRendered(r.url, view);
          Object.assign(r, verdict, { rendered: true, robots: view.robots, canonicalSeen: view.canonical });
        } catch (e) {
          Object.assign(r, { kind: 'error', detail: 'render failed: ' + e.message });
        }
      }, 3);
      for (const r of shells.slice(LIMIT)) r.detail += ' (not rendered — raise --limit)';
    } finally {
      await browser.close();
    }
  }

  const byKind = {};
  for (const r of results) byKind[r.kind] = (byKind[r.kind] || 0) + 1;

  for (const r of results) {
    const mark = r.kind === 'soft' ? '❌' : r.kind === 'error' ? '⚠️ ' : r.kind === 'shell' ? '▫️ ' : '✅';
    console.log('  ' + mark + ' ' + r.url.padEnd(56) + r.kind.padEnd(9) + r.detail);
  }
  console.log('\n' + JSON.stringify(byKind));

  const soft = results.filter((r) => r.kind === 'soft');
  if (soft.length) {
    console.log('\n' + soft.length + ' soft 404(s): ek 200 jo neither self-canonical nor noindex hai.');
    console.log('Google in URLs ko index nahi kar sakta par report me "soft 404" ke roop me aate hain.');
    console.log('Fix: wo path 301 ya 404 de (functions/_middleware.js), phir pages deploy karo.');
  } else if (!RENDER && shells.length) {
    console.log('\nNo raw soft 404. ' + shells.length + ' SPA shell response(s) remain unproven —');
    console.log('run with --render to check them in the browser (that is where an SPA soft 404 hides).');
  } else {
    console.log('\n✅ No soft 404 — every 200 either self-canonicalises or is noindex.');
  }

  fs.writeFileSync(OUT, JSON.stringify({
    ranAt: new Date().toISOString(),
    origin: ORIGIN,
    render: RENDER,
    probes: results.length,
    tally: byKind,
    rows: results.map((r) => ({
      url: r.url, why: r.why, status: r.status, kind: r.kind, detail: r.detail,
      ...(r.rendered ? { rendered: true, robots: r.robots, canonicalSeen: r.canonicalSeen } : {}),
    })),
  }, null, 2) + '\n');
  console.log('wrote ' + path.relative(ROOT, OUT));

  if (FAIL && soft.length) process.exit(1);
}

if (require.main === module) {
  main().catch((e) => { console.error('check-soft-404 crashed: ' + (e && e.message)); process.exit(1); });
}

module.exports = { classify, classifyRendered, buildProbes, probesFromFile };
