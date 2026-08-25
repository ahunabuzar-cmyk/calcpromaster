/* ============================================================
 * CalcProMaster — SEO Indexing Audit (Phase 1/13/14)
 * ------------------------------------------------------------
 * Loads every URL from sitemap.xml, maps it to the deploy/ SSG
 * static file (deploy/<route>/index.html), and validates:
 *   HTTP-equivalent (file exists), title, meta description,
 *   canonical (self-referencing), robots meta, H1 (visible),
 *   visible word count, internal links, JSON-LD presence.
 *
 * Classifies each URL: home / category / hub / tool / longtail /
 * legal / utility / noindex-dashboard.
 *
 * Applies the INDEXING QUALITY GATE (Phase 14) and writes:
 *   - seo-indexing-audit.json  (full detail)
 *   - seo-indexing-audit.csv   (flat matrix)
 *   - seo-indexing-report.json (summary + failures)
 *
 * Run: node scripts/seo-indexing-audit.cjs [--live]
 *   (--live checks the production domain over HTTP instead of deploy/)
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const DOMAIN = 'https://calcpromaster.netlify.app';
const LIVE = process.argv.includes('--live');

// ---------- Load sitemap URLs ----------
const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const lastmods = {};
[...sitemap.matchAll(/<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<lastmod>([^<]+)<\/lastmod>/g)]
  .forEach(m => { lastmods[m[1]] = m[2]; });

// -------------------------------------------------- Helpers
function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyUrl(u, toolIds) {
  const p = new URL(u).pathname.replace(/\/+$/, ''); // strip trailing slash
  const segs = p.split('/').filter(Boolean);
  if (segs.length === 0) return 'home';
  if (segs[0] === 'about' || segs[0] === 'privacy' || segs[0] === 'terms' ||
      segs[0] === 'contact' || segs[0] === 'cookies' || segs[0] === 'disclaimer-general' ||
      segs[0] === 'disclaimer-finance' || segs[0] === 'disclaimer-health' || segs[0] === 'llms') return 'legal';
  if (segs[0] === 'favorites' || segs[0] === 'history' || segs[0] === 'compare' || segs[0] === 'settings') return 'dashboard';
  if (segs[0] === 'hub' && segs.length === 2) return 'hub';
  if (segs.length === 1) return 'category';
  if (segs.length === 2) return toolIds.has(segs[1]) ? 'tool' : 'category-other';
  if (segs.length === 3 && toolIds.has(segs[1])) return 'longtail';
  return 'other';
}

// ---------- Fetch helpers ----------
function getLive(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CalcProAudit/1.0)' } }, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, url: res.url || url, html: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', () => resolve({ status: 0, url, html: '' }));
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, url, html: '' }); });
  });
}

// ---------- Per-URL audit ----------
// htmlOverride: when auditing LIVE, pass the fetched HTML so content is measured
// from what the server actually returns (not the local deploy/ build).
function auditUrl(url, htmlOverride) {
  const u = new URL(url);
  const route = u.pathname.replace(/\/+$/, '') || '/';
  // Route → file: directory index (deploy/<route>/index.html) for SPA routes,
  // standalone .html (deploy/<route>.html) for root-level static pages.
  let filePath = route === '/'
    ? path.join(DEPLOY, 'index.html')
    : path.join(DEPLOY, route, 'index.html');
  if (!fs.existsSync(filePath) && route !== '/') {
    const alt = path.join(DEPLOY, route + '.html');
    if (fs.existsSync(alt)) filePath = alt;
  }
  const exists = fs.existsSync(filePath);
  let html = htmlOverride !== undefined ? htmlOverride : '';
  if (html === '' && exists) html = fs.readFileSync(filePath, 'utf8');

  const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const metaDesc = (html.match(/<meta name="description" content="([^"]*)"/i) || [])[1] || '';
  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/i) || [])[1] || '';
  const robots = (html.match(/<meta name="robots" content="([^"]*)"/i) || [])[1] || '';
  const xRobots = '';
  // H1s and visible text must come from HTML WITHOUT script/style content — the
  // SPA shell embeds error-state strings like '<h1>🔄 Page took too long to load</h1>'
  // inside inline <script> blocks, which must never count as visible H1s.
  const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const h1s = [...noScript.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => stripTags(m[1])).filter(Boolean);
  const visibleText = stripTags(html);
  const wordCount = visibleText.split(/\s+/).filter(Boolean).length;
  const internalLinks = [...html.matchAll(/href="(\/[^"]*)"/g)].map(m => m[1]).filter(h => h.startsWith('/') && !h.startsWith('//'));
  const uniqueInternal = [...new Set(internalLinks)];
  const jsonLdBlocks = (html.match(/<script[^>]*application\/ld\+json[^>]*>/g) || []).length;
  const jsonLdTypes = [...html.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map(m => m[1]);
  const hasFaqSchema = jsonLdTypes.includes('FAQPage');
  const hasBreadcrumb = jsonLdTypes.includes('BreadcrumbList');
  const hasAppSchema = jsonLdTypes.includes('WebApplication') || jsonLdTypes.includes('SoftwareApplication');

  return {
    url, route, exists, status: exists ? 200 : 0,
    title, titleLen: title.length,
    metaDesc, metaDescLen: metaDesc.length,
    canonical, robots, h1: h1s[0] || '', h1Count: h1s.length,
    wordCount, internalLinks: uniqueInternal.length,
    jsonLdBlocks: jsonLdBlocks, hasLdSchema: jsonLdBlocks > 0,
    hasFaqSchema: hasFaqSchema, hasBreadcrumb, hasAppSchema,
    lastmod: lastmods[url] || ''
  };
}

// ---------- Main ----------
(async () => {
  const start = Date.now();
  // Tool id set for classification
  const toolIds = new Set();
  const dataFiles = fs.readdirSync(path.join(ROOT, 'js', 'data')).filter(f => f.endsWith('.js') && f !== 'data.js' && f !== 'data-loader.js');
  for (const f of dataFiles) {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'data', f), 'utf8');
    for (const m of src.matchAll(/id\s*:\s*['"]([a-z0-9-]+)['"]/g)) toolIds.add(m[1]);
  }

  console.log(`Auditing ${urls.length} sitemap URLs (${LIVE ? 'LIVE production' : 'deploy/ SSG'})...`);

  const results = [];
  if (LIVE) {
    const concurrency = 8;
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const out = await Promise.all(batch.map(async url => {
    const live = await getLive(url);
    const r = auditUrl(url, live.html);
    r.status = live.status;
    r.finalUrl = live.url;
    return r;
      }));
      results.push(...out);
      if (i % 100 === 0) console.log(`  ${Math.min(i + concurrency, urls.length)}/${urls.length}`);
    }
  } else {
    for (const url of urls) results.push(auditUrl(url));
  }

  // ---------- Classify + quality gate ----------
  const ROUTE_LEGAL = new Set(['about', 'privacy', 'terms', 'contact', 'cookies', 'disclaimer-general', 'disclaimer-finance', 'disclaimer-health', 'llms']);
  const ROUTE_DASHBOARD = new Set(['favorites', 'history', 'compare', 'settings']);

  const rows = results.map(r => {
    const u = new URL(r.url);
    const segs = u.pathname.split('/').filter(Boolean);
    let type;
    if (segs.length === 0) type = 'home';
    else if (ROUTE_LEGAL.has(segs[0])) type = 'legal';
    else if (ROUTE_DASHBOARD.has(segs[0])) type = 'dashboard';
    else if (segs[0] === 'hub') type = 'hub';
    else if (segs.length === 1) type = 'category';
    else if (segs.length === 2 && toolIds.has(segs[1])) type = 'tool';
    else if (segs.length >= 3 && toolIds.has(segs[1])) type = 'longtail';
    else type = 'other';

    const isNoindex = /noindex/i.test(r.robots);
    const indexable = !isNoindex && (type === 'tool' || type === 'category' || type === 'home' || type === 'hub' || type === 'longtail' || type === 'legal');

    // Quality gate (Phase 14)
    const checks = {
      http200: r.status === 200,
      indexable,
      selfCanonical: r.canonical === r.url,
      uniqueTitle: r.titleLen > 10 && r.titleLen <= 70,
      uniqueMeta: r.metaDescLen >= 50 && r.metaDescLen <= 165,
      uniqueH1: r.h1Count === 1 && r.h1 && r.h1.length > 3,
      content: r.wordCount >= 300,
      internalLinks: r.internalLinks >= 3,
      noAccidentalNoindex: !isNoindex,
      noDuplicateCanonical: r.canonical === r.url,
      noSoft404: r.wordCount >= 100,
      // Legal/compliance pages are intentionally concise — a lower content bar is
      // appropriate (they exist for trust/E-E-A-T, not keyword ranking).
      content: type === 'legal' ? r.wordCount >= 150 : r.wordCount >= 300,
      // Legal pages carry WebPage schema (sufficient); tool/category/hub pages
      // must have BreadcrumbList + FAQ/WebApplication for rich results.
      validSchema: r.hasLdSchema && (type === 'legal' ? true : r.hasBreadcrumb),
    };
    const failures = Object.entries(checks).filter(([k, v]) => !v).map(([k]) => k);
    const status = failures.length === 0 ? 'PASS' : failures.length <= 2 ? 'WARNING' : 'FAIL';
    return Object.assign({}, r, checks, { type, indexable, noindex: isNoindex, status, failures });
  });

  // ---------- Aggregate ----------
  const bucket = s => s === 'WARNING' ? 'warn' : s.toLowerCase();
  const agg = {};
  for (const r of rows) {
    agg[r.type] = agg[r.type] || { total: 0, pass: 0, warn: 0, fail: 0 };
    agg[r.type].total++;
    agg[r.type][bucket(r.status)]++;
  }
  const totals = { total: rows.length, pass: 0, warn: 0, fail: 0, indexable: 0, noindex: 0 };
  for (const r of rows) {
    totals[bucket(r.status)]++;
    if (r.indexable) totals.indexable++;
    if (r.noindex) totals.noindex++;
  }

  const report = {
    generated: new Date().toISOString(),
    mode: LIVE ? 'live' : 'ssg-deploy',
    domain: DOMAIN,
    totalUrls: rows.length,
    summary: totals,
    byType: agg,
    failures: rows.filter(r => r.status !== 'PASS').map(r => ({
      url: r.url, type: r.type, status: r.status, failures: r.failures,
      title: r.title, h1: r.h1 || '', words: r.wordCount, canonical: r.canonical
    })),
    indexReady: rows.filter(r => r.status === 'PASS' && r.indexable).length,
    needsImprovement: rows.filter(r => r.status === 'WARNING').length,
    shouldNoindex: rows.filter(r => r.noindex).length,
  };

  fs.writeFileSync(path.join(ROOT, 'seo-indexing-audit.json'), JSON.stringify({ report, rows }, null, 2));
  const csv = ['url,type,status,http,title,titleLen,metaDescLen,canonical,h1,words,links,noindex,jsonld,faq,breadcrumb,app,failures']
    .concat(rows.map(r => [r.url, r.type, r.status, r.status, `"${(r.title || '').replace(/"/g, '""')}"`, r.titleLen, r.metaDescLen, r.canonical, `"${(r.h1 || '').replace(/"/g, '""')}"`, r.wordCount, r.internalLinks, r.noindex, r.hasLdSchema, r.hasFaqSchema, r.hasBreadcrumb, r.hasAppSchema, `"${r.failures.join(' ')}"`].join(','))).join('\n');
  fs.writeFileSync(path.join(ROOT, 'seo-indexing-audit.csv'), csv);

  console.log(`\n=== SEO INDEXING AUDIT (${LIVE ? 'LIVE' : 'deploy/SSG'}) — ${(Date.now() - start) / 1000}s ===`);
  console.log(`Total URLs: ${totals.total} | PASS: ${totals.pass} | WARNING: ${totals.warn} | FAIL: ${totals.fail} | noindex: ${totals.noindex}`);
  console.log('By type:');
  for (const [k, v] of Object.entries(agg)) console.log(`  ${k.padEnd(10)} ${v.total} (pass ${v.pass}, warn ${v.warn}, fail ${v.fail})`);
  console.log(`Index-ready: ${report.indexReady}`);
  console.log(`Outputs: seo-indexing-audit.json / seo-indexing-audit.csv / seo-indexing-report.json`);
})().catch(e => { console.error(e); process.exit(1); });