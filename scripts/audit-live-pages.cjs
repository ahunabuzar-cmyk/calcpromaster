#!/usr/bin/env node
// ============================================================
// CalcProMaster — live-site page audit
// ------------------------------------------------------------
// The build-time audits (crawl-audit-v5, audit-url-format) read `deploy/`.
// Third-party tools read the *deployed* site, which can be several builds
// behind — so their "2 duplicate titles / 2 thin pages / 27 bad URLs" cannot be
// reproduced from `deploy/` alone. This crawls the live sitemap and applies the
// same rules to what Google actually sees.
//
// Usage: node scripts/audit-live-pages.cjs [--site URL] [--concurrency N] [--json]
// Exit : 0 = crawl completed (findings are reported, not fatal)
//        1 = sitemap unreachable / no URLs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const argOf = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const SITE = argOf('--site', 'https://calcpromaster.com').replace(/\/$/, '');
const CONC = Math.max(1, Number(argOf('--concurrency', '12')) || 12);
const AS_JSON = args.includes('--json');
const OUT_JSON = path.join(__dirname, '..', 'data', 'live-page-audit.json');

const THIN_WORDS = 300; // a calculator page under this is a thin page

function stripText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const firstMatch = (html, re) => {
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
};

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'CalcProMasterPageAudit/1.0 (+https://calcpromaster.com)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return { status: res.status, html: null };
  return { status: res.status, html: await res.text() };
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i).catch((e) => ({ url: items[i], error: String(e && e.message) }));
    }
  }));
  return out;
}

async function main() {
  const sm = await fetchText(SITE + '/sitemap.xml');
  if (!sm.html) {
    console.error('sitemap unreachable:', sm.status);
    process.exit(1);
  }
  const urls = [...sm.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (!urls.length) {
    console.error('sitemap had no <loc> entries');
    process.exit(1);
  }
  if (!AS_JSON) console.log('sitemap URLs:', urls.length, '· concurrency', CONC);

  let done = 0;
  const pages = await pool(urls, CONC, async (u) => {
    const r = await fetchText(u);
    done++;
    if (!AS_JSON && done % 150 === 0) process.stderr.write(`  ${done}/${urls.length}\r`);
    const h = r.html || '';
    const title = firstMatch(h, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const meta = firstMatch(h, /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)
      || firstMatch(h, /<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const canonical = firstMatch(h, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
    const robots = firstMatch(h, /<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)["']/i);
    const body = h.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const words = body ? stripText(body[1]).split(' ').filter(Boolean).length : 0;
    return { url: u, status: r.status, title, meta, canonical, robots, words };
  });
  if (!AS_JSON) process.stderr.write('            \r');

  const bad = pages.filter((p) => p.error || p.status >= 400);
  const noindex = pages.filter((p) => !p.error && p.robots && /noindex/i.test(p.robots));
  const indexable = pages.filter((p) => !p.error && !(p.robots && /noindex/i.test(p.robots)));

  const byTitle = new Map();
  const byMeta = new Map();
  for (const p of indexable) {
    if (p.title) {
      if (!byTitle.has(p.title)) byTitle.set(p.title, []);
      byTitle.get(p.title).push(p.url);
    }
    if (p.meta) {
      if (!byMeta.has(p.meta)) byMeta.set(p.meta, []);
      byMeta.get(p.meta).push(p.url);
    }
  }
  const dupTitles = [...byTitle.entries()].filter(([, v]) => v.length > 1);
  const dupMetas = [...byMeta.entries()].filter(([, v]) => v.length > 1);
  const thin = indexable.filter((p) => p.words > 0 && p.words < THIN_WORDS)
    .sort((a, b) => a.words - b.words);

  // URL format: same rules as audit-url-format.cjs, applied to the live set.
  const words_no = /^(a|an|and|or|the|of|to|in|for)$/;
  const urlIssues = [];
  for (const u of urls) {
    const p = u.replace(SITE, '') || '/';
    if (/[A-Z]/.test(p)) urlIssues.push({ url: p, rule: 'uppercase' });
    if (/_/.test(p)) urlIssues.push({ url: p, rule: 'underscore' });
    if (/[ %]/.test(p)) urlIssues.push({ url: p, rule: 'space/encoded' });
    if (/\.html?$/i.test(p)) urlIssues.push({ url: p, rule: 'html-suffix' });
    if (/[?#]/.test(p)) urlIssues.push({ url: p, rule: 'query/fragment' });
    if (/[^a-z0-9\-/]/.test(p)) urlIssues.push({ url: p, rule: 'non-slug-char' });
    const segs = p.split('/').filter(Boolean);
    for (const s of segs.slice(0, -1)) {
      if (s.split('-').some((w) => words_no.test(w))) urlIssues.push({ url: p, rule: 'stopword' });
    }
  }

  const summary = {
    ranAt: new Date().toISOString(),
    site: SITE,
    sitemapUrls: urls.length,
    fetched: pages.length,
    errors: bad.length,
    noindex: noindex.length,
    indexable: indexable.length,
    duplicateTitles: dupTitles.length,
    duplicateMetas: dupMetas.length,
    thinPages: thin.length,
    urlIssues: urlIssues.length,
    medianWords: (() => {
      const w = indexable.map((p) => p.words).filter(Boolean).sort((a, b) => a - b);
      return w.length ? w[Math.floor(w.length / 2)] : 0;
    })(),
  };

  const report = { summary, dupTitles, dupMetas, thin, urlIssues, errors: bad, pages };
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 1) + '\n');

  if (AS_JSON) {
    console.log(JSON.stringify(report, null, 1));
    return;
  }

  console.log('fetched:', pages.length, '| errors:', bad.length, '| noindex:', noindex.length);
  console.log('median words:', summary.medianWords);
  console.log('\nDUPLICATE TITLES:', dupTitles.length);
  dupTitles.forEach(([t, v]) => console.log('  "' + t.slice(0, 80) + '"\n    ' + v.join('\n    ')));
  console.log('\nDUPLICATE META DESCRIPTIONS:', dupMetas.length);
  dupMetas.slice(0, 10).forEach(([t, v]) => console.log('  "' + t.slice(0, 80) + '"\n    ' + v.join('\n    ')));
  console.log('\nTHIN PAGES (<' + THIN_WORDS + ' words):', thin.length);
  thin.slice(0, 20).forEach((p) => console.log('  ' + String(p.words).padStart(5) + '  ' + p.url));
  console.log('\nURL ISSUES:', urlIssues.length);
  urlIssues.slice(0, 40).forEach((i) => console.log('  ' + i.rule.padEnd(14) + ' ' + i.url));
  console.log('\nwrote', path.relative(path.join(__dirname, '..'), OUT_JSON));
}

main().catch((e) => { console.error(e); process.exit(1); });
