#!/usr/bin/env node
// ============================================================
// Live broken-link / 4XX scan
// ------------------------------------------------------------
// A third-party crawler reports issues on the deployed site, which can differ
// from the local build. This fetches the live sitemap, reads every page, and
// resolves each internal link against what the live server actually returns.
//
// Usage: node scripts/live-broken-links.cjs [--site URL] [--limit N] [--json]
// Output: data/live-broken-links.json
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const SITE = argOf('--site', 'https://calcpromaster.com').replace(/\/$/, '');
const LIMIT = Number(argOf('--limit', '0')) || 0;
const AS_JSON = args.includes('--json');
const OUT = path.join(__dirname, '..', 'data', 'live-broken-links.json');

const UA = 'CalcProMasterLinkAudit/1.0 (+https://calcpromaster.com)';
const get = async (url, method = 'GET') => {
  const res = await fetch(url, { method, redirect: 'manual', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
  let body = '';
  if (method === 'GET' && res.status < 400) body = await res.text();
  return { status: res.status, location: res.headers.get('location'), body };
};

const pool = async (items, limit, fn) => {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i).catch((e) => ({ error: String(e && e.message) }));
    }
  }));
  return out;
};

(async () => {
  const sm = await get(SITE + '/sitemap.xml');
  if (sm.status !== 200) { console.error('sitemap:', sm.status); process.exit(1); }
  let urls = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (LIMIT) urls = urls.slice(0, LIMIT);
  console.log('sitemap urls:', urls.length);

  const known = new Set(urls.map((u) => new URL(u).pathname));
  const pages = await pool(urls, 16, async (u) => {
    const r = await get(u);
    return { url: u, status: r.status, location: r.location, body: r.body };
  });

  const badPages = pages.filter((p) => p.status >= 400 || p.error);
  const linkTargets = new Map(); // path -> { pages:Set, raw }
  for (const p of pages) {
    if (!p.body) continue;
    for (const m of p.body.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
      const href = m[1];
      if (!/^\/(?!\/)/.test(href)) continue;
      const clean = href.split('#')[0].split('?')[0];
      if (!clean || clean === '/') continue;
      if (!linkTargets.has(clean)) linkTargets.set(clean, new Set());
      linkTargets.get(clean).add(new URL(p.url).pathname);
    }
  }
  const unknown = [...linkTargets.keys()].filter((t) => !known.has(t) && !known.has(t + '/') && !known.has(t.replace(/\/$/, '')));
  console.log('unique internal targets:', linkTargets.size, '| not in sitemap:', unknown.length);

  const checked = await pool(unknown, 16, async (t) => {
    const r = await get(SITE + t);
    return { target: t, status: r.status, location: r.location, linkedFrom: [...(linkTargets.get(t) || [])].slice(0, 3) };
  });

  const broken = checked.filter((c) => !c.error && c.status >= 400);
  const redirected = checked.filter((c) => !c.error && c.status >= 300 && c.status < 400);
  const okOther = checked.filter((c) => !c.error && c.status === 200);

  const report = {
    ranAt: new Date().toISOString(),
    site: SITE,
    sitemapUrls: urls.length,
    pagesFetched: pages.length,
    badPages: badPages.map((p) => ({ url: p.url, status: p.status, location: p.location, error: p.error })),
    brokenTargets: broken,
    redirectedTargets: redirected,
    okOther,
    summary: {
      brokenTargets: broken.length,
      brokenLinks: broken.reduce((n, b) => n + (linkTargets.get(b.target)?.size || 0), 0),
      redirectedTargets: redirected.length,
      badPages: badPages.length,
    },
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 1) + '\n');

  if (AS_JSON) return console.log(JSON.stringify(report.summary, null, 2));
  console.log('\n4XX/5XX pages in sitemap:', badPages.length);
  badPages.slice(0, 20).forEach((p) => console.log('  ' + p.status + '  ' + p.url));
  console.log('\nbroken link targets:', broken.length);
  broken.slice(0, 40).forEach((b) => console.log('  ' + b.status + '  ' + b.target + '   ← ' + b.linkedFrom.join(', ')));
  console.log('\nredirecting link targets (3xx):', redirected.length);
  redirected.slice(0, 20).forEach((b) => console.log('  ' + b.status + '  ' + b.target + ' → ' + b.location));
  console.log('\nwrote ' + path.relative(path.join(__dirname, '..'), OUT));
})();
