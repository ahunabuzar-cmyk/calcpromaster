#!/usr/bin/env node
// ============================================================
// CalcProMaster — full-site audit of the built deploy/ tree
// ------------------------------------------------------------
// Third-party crawlers (Ahrefs/Sitechecker/SEMrush) report nine classes of
// issue on the live site. This reproduces those classes against `deploy/`, so a
// fix can be verified before (and without) publishing:
//
//   1. broken internal links      (href resolves to no route / asset)
//   2. 4XX pages                  (sitemap URL with no built page)
//   3. invalid structured data    (JSON-LD required properties)
//   4. duplicate H1 + title       (same title AND same H1 on 2+ pages)
//   5. extra H1s                  (more than one H1 on a page)
//   6. external links with nofollow
//   7. pages with <=1 incoming internal link
//   8. pages blocked from crawling (robots.txt Disallow, or noindex in sitemap)
//   9. unminified JS/CSS          (deploy assets that still look authored)
//
// Usage: node scripts/site-audit-full.cjs [--json] [--quiet]
// Exit : 0 = audit ran (findings reported), 1 = no deploy/ tree
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const AS_JSON = process.argv.includes('--json');
const QUIET = process.argv.includes('--quiet');
const OUT = path.join(ROOT, 'data', 'site-audit.json');

if (!fs.existsSync(DEPLOY)) {
  console.error('deploy/ not found — run `node build-deploy.js` first.');
  process.exit(1);
}

const walk = (dir, fn) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(full, fn); continue; }
    fn(full, e.name);
  }
};

// ---------- 1. Route + asset index ----------
const dirRoutes = new Set(['/']);
const flatRoutes = new Map();   // '/about' -> deploy/about.html
const assets = new Set();
walk(DEPLOY, (full, name) => {
  const rel = '/' + path.relative(DEPLOY, full).split(path.sep).join('/');
  if (name === 'index.html') {
    dirRoutes.add(rel.replace(/index\.html$/, ''));
  } else if (name.endsWith('.html')) {
    flatRoutes.set(rel.replace(/\.html$/, ''), full);
  } else {
    assets.add(rel);
  }
});

// _redirects: source -> destination, so a link served by a 301 is not "broken".
const redirectRules = [];
const redirectsFile = path.join(DEPLOY, '_redirects');
if (fs.existsSync(redirectsFile)) {
  for (const line of fs.readFileSync(redirectsFile, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const [from, to] = t.split(/\s+/);
    if (from && to && from.startsWith('/')) redirectRules.push({ from, to });
  }
}
const redirectTarget = (p) => {
  for (const r of redirectRules) {
    if (r.from === p) return r.to;
    if (r.from.endsWith('/*') && p.startsWith(r.from.slice(0, -1))) {
      return r.to.replace(':splat', p.slice(r.from.length - 1)).replace(/\*$/, p.slice(r.from.length - 1));
    }
    if (r.from.includes(':')) {
      const re = new RegExp('^' + r.from.replace(/:[a-zA-Z]+/g, '([^/]+)') + '$');
      const m = p.match(re);
      if (m) {
        let i = 0;
        return r.to.replace(/:[a-zA-Z]+/g, () => m[++i]);
      }
    }
  }
  return null;
};

// ---------- robots.txt Disallow ----------
const robotsFile = path.join(DEPLOY, 'robots.txt');
const disallow = [];
if (fs.existsSync(robotsFile)) {
  let applies = false;
  for (const raw of fs.readFileSync(robotsFile, 'utf8').split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const m = line.match(/^(user-agent|allow|disallow)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === 'user-agent') applies = val === '*' || /googlebot/i.test(val);
    else if (key === 'disallow' && applies && val) disallow.push(val);
  }
}
const isDisallowed = (p) => disallow.some((d) => {
  if (d === '/') return true;
  const base = d.replace(/\*$/, '');
  return p === base || p.startsWith(base.endsWith('/') ? base : base + '/') || p.startsWith(base);
});

// ---------- 2. Read every HTML page ----------
const pages = [];
walk(DEPLOY, (full, name) => {
  if (!name.endsWith('.html')) return;
  const rel = '/' + path.relative(DEPLOY, full).split(path.sep).join('/');
  const route = rel === '/index.html' ? '/' : rel.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  const html = fs.readFileSync(full, 'utf8');
  pages.push({ file: full, route, html });
});
const pageRoutes = new Set(pages.map((p) => p.route));
const fileOf = new Map(pages.map((p) => [p.route, p.file]));

const stripTags = (s) => s
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z#0-9]+;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// ---------- 3. Per-page extraction ----------
const HREF_RE = /<a\b([^>]*)>/gi;
const attr = (tag, name) => {
  const m = tag.match(new RegExp('\\b' + name + '\\s*=\\s*"([^"]*)"', 'i'))
    || tag.match(new RegExp("\\b" + name + "\\s*=\\s*'([^']*)'", 'i'));
  return m ? m[1] : null;
};

const brokenLinks = [];
const externalNofollow = [];
const incoming = new Map(pageRoutes.size ? [...pageRoutes].map((r) => [r, new Set()]) : []);

for (const page of pages) {
  const noScript = page.html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  page.title = (page.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  page.title = page.title ? stripTags(page.title) : '';
  page.h1s = [...noScript.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((m) => stripTags(m[1]))
    .filter(Boolean);
  page.robots = (page.html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)/i) || [])[1] || '';
  page.isHtml = /<html[\s>]/i.test(page.html);

  HREF_RE.lastIndex = 0;
  let m;
  page.internalHrefs = [];
  page.externalHrefs = [];
  while ((m = HREF_RE.exec(page.html))) {
    const open = m[0];
    const href = attr(open, 'href');
    if (!href) continue;
    const rel = (attr(open, 'rel') || '').toLowerCase();
    if (/^(https?:)?\/\//i.test(href)) {
      page.externalHrefs.push(href);
      if (/(^|\s)nofollow(\s|$)/.test(rel)) {
        externalNofollow.push({ page: page.route, href, rel: attr(open, 'rel') });
      }
      continue;
    }
    if (!href.startsWith('/')) continue;
    page.internalHrefs.push(href);
    const clean = href.split('#')[0].split('?')[0];
    // The home link (`href="/"`) is a real internal link and must count toward
    // the homepage's inbound total. It used to be skipped here, so `/` always
    // reported "0 incoming links" and the audit flagged the most-linked page on
    // the site as weakly linked.
    if (!clean) continue;
    // Resolve to a real route/file (dir index, flat page, asset, or redirect).
    const candidates = [
      clean,
      clean.endsWith('/') ? clean : clean + '/',
      clean.replace(/\/$/, ''),
      clean.endsWith('/') ? clean.replace(/\/$/, '') : clean,
      clean + '.html',
    ];
    const ok = candidates.some((c) => dirRoutes.has(c) || flatRoutes.has(c) || assets.has(c) || pageRoutes.has(c));
    const redirect = !ok && redirectTarget(clean);
    if (redirect) {
      // A link that 301s still costs a hop; record separately, not as broken.
      page.redirectHrefs = page.redirectHrefs || [];
      page.redirectHrefs.push(clean);
      continue;
    }
    if (!ok) {
      brokenLinks.push({ page: page.route, href, target: clean });
    } else {
      const dest = candidates.find((c) => dirRoutes.has(c) || flatRoutes.has(c) || pageRoutes.has(c));
      if (dest && dest !== page.route && incoming.has(dest)) incoming.get(dest).add(page.route);
    }
  }
}

// ---------- 4. Structured-data validation ----------
// Required properties per @type, mirroring the errors third-party crawlers
// report. Keep the list tight: only properties that break rich-result
// eligibility when absent.
const REQUIRED = {
  Organization: ['name', 'url'],
  WebSite: ['name', 'url'],
  WebPage: ['name', 'url'],
  BreadcrumbList: ['itemListElement'],
  ListItem: ['position', 'name'],
  FAQPage: ['mainEntity'],
  Question: ['name', 'acceptedAnswer'],
  Answer: ['text'],
  Article: ['headline', 'author', 'datePublished'],
  BlogPosting: ['headline', 'author', 'datePublished'],
  WebApplication: ['name', 'url', 'applicationCategory'],
  SoftwareApplication: ['name', 'url', 'applicationCategory'],
  HowTo: ['name', 'step'],
  HowToStep: ['text'],
  Offer: ['price', 'priceCurrency'],
  AggregateRating: ['ratingValue', 'reviewCount'],
  Review: ['reviewRating', 'author'],
  Person: ['name'],
  ImageObject: ['url'],
  SearchAction: ['target', 'query-input'],
  VideoObject: ['name', 'thumbnailUrl', 'uploadDate'],
};
const ALLOWED_ABSENT = { Offer: ['priceCurrency'] }; // tolerated in practice

const schemaIssues = []; // { page, type, prop, blockIndex }
const schemaInvalidJson = [];

const typeOf = (node) => {
  const t = node['@type'];
  if (Array.isArray(t)) return t;
  return t ? [t] : [];
};

const validateNode = (node, pageRoute, blockIndex, parentPath) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((n) => validateNode(n, pageRoute, blockIndex, parentPath)); return; }
  for (const type of typeOf(node)) {
    const req = REQUIRED[type];
    if (req) {
      for (const prop of req) {
        const tolerated = (ALLOWED_ABSENT[type] || []).includes(prop);
        const val = node[prop];
        const missing = val === undefined || val === null || val === ''
          || (Array.isArray(val) && val.length === 0);
        if (missing && !tolerated) {
          schemaIssues.push({ page: pageRoute, type, prop, blockIndex, path: parentPath });
        }
      }
    }
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === '@context') continue;
    if (v && typeof v === 'object') validateNode(v, pageRoute, blockIndex, parentPath + '.' + k);
  }
};

for (const page of pages) {
  const blocks = [...page.html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  page.jsonLdBlocks = blocks.length;
  blocks.forEach((b, i) => {
    let parsed;
    try {
      parsed = JSON.parse(b[1]);
    } catch (e) {
      schemaInvalidJson.push({ page: page.route, blockIndex: i, error: e.message });
      return;
    }
    validateNode(parsed, page.route, i, '');
  });
}

// ---------- 5. Duplicate H1 + title / extra H1s ----------
const byTitleH1 = new Map();
const extraH1 = [];
for (const page of pages) {
  if (!page.isHtml) continue;
  if (/noindex/i.test(page.robots)) continue;
  const h1 = (page.h1s[0] || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const title = (page.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (page.h1s.length > 1) extraH1.push({ page: page.route, count: page.h1s.length, h1s: page.h1s });
  if (!title) continue;
  const key = title + '||' + h1;
  if (!byTitleH1.has(key)) byTitleH1.set(key, { title: page.title, h1: page.h1s[0] || '', pages: [] });
  byTitleH1.get(key).pages.push(page.route);
}
const dupH1Title = [...byTitleH1.values()].filter((g) => g.pages.length > 1);

// ---------- 6. Sitemap coverage / 4XX pages ----------
const sitemapPath = path.join(DEPLOY, 'sitemap.xml');
const sitemapUrls = [];
if (fs.existsSync(sitemapPath)) {
  const sm = fs.readFileSync(sitemapPath, 'utf8');
  for (const m of sm.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const p = new URL(m[1]).pathname;
    sitemapUrls.push({ loc: m[1], path: p === '' ? '/' : p });
  }
}
const missingPages = sitemapUrls.filter((s) => {
  const p = s.path;
  return !(dirRoutes.has(p) || dirRoutes.has(p + '/') || flatRoutes.has(p) || flatRoutes.has(p.replace(/\/$/, '')) || pageRoutes.has(p));
});

// ---------- 7. Crawl-blocked pages ----------
const blocked = [];
for (const p of pages) {
  if (!p.isHtml) continue;
  const noindex = /noindex/i.test(p.robots);
  const blockedByRobots = isDisallowed(p.route);
  const inSitemap = sitemapUrls.some((s) => s.path === p.route || s.path === p.route.replace(/\/$/, ''));
  if (inSitemap && (noindex || blockedByRobots)) {
    blocked.push({ page: p.route, noindex, blockedByRobots });
  }
}

// ---------- 8. Orphan / weakly linked pages ----------
const weakIncoming = [];
for (const page of pages) {
  if (!page.isHtml) continue;
  if (/noindex/i.test(page.robots)) continue;
  const set = incoming.get(page.route) || new Set();
  if (set.size <= 1) weakIncoming.push({ page: page.route, incoming: set.size });
}

// ---------- 9. Unminified assets ----------
// Ground truth, not a line-length guess: run the same minifier the build uses
// and flag a file only when minifying would actually save a meaningful amount.
// A file whose statements are already collapsed (esbuild saves < 2%) is
// minified as far as a crawler is concerned.
let esbuild = null;
try { esbuild = require('esbuild'); } catch (e) { /* line heuristic only */ }
const unminified = [];
walk(DEPLOY, (full, name) => {
  if (!/\.(js|css)$/i.test(name)) return;
  if (name === 'sw.js') return; // service worker, kept readable on purpose
  const src = fs.readFileSync(full, 'utf8');
  const rel = '/' + path.relative(DEPLOY, full).split(path.sep).join('/');
  if (esbuild) {
    const isCss = name.endsWith('.css');
    let minLen = null;
    try {
      minLen = esbuild.transformSync(src, isCss
        ? { loader: 'css', minify: true, legalComments: 'none', charset: 'utf8', target: 'es2020' }
        : { loader: 'js', minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false, legalComments: 'none', charset: 'utf8', target: 'es2020' }).code.length;
    } catch (e) { minLen = null; }
    if (minLen !== null && minLen < src.length * 0.98) {
      unminified.push({ file: rel, lines: src.split('\n').length, bytes: src.length, savable: src.length - minLen });
    }
    return;
  }
  const lines = src.split('\n');
  const avg = src.length / Math.max(lines.length, 1);
  if (lines.length > 3 && avg < 200) unminified.push({ file: rel, lines: lines.length, bytes: src.length });
});

// ---------- Report ----------
const report = {
  ranAt: new Date().toISOString(),
  pages: pages.length,
  summary: {
    brokenInternalLinks: brokenLinks.length,
    brokenUniqueTargets: new Set(brokenLinks.map((b) => b.target)).size,
    pagesReturning4xx: missingPages.length,
    invalidSchemaItems: schemaIssues.length + schemaInvalidJson.length,
    pagesWithInvalidSchema: new Set(schemaIssues.map((s) => s.page).concat(schemaInvalidJson.map((s) => s.page))).size,
    duplicateH1TitleGroups: dupH1Title.length,
    pagesInDuplicateH1TitleGroups: dupH1Title.reduce((n, g) => n + g.pages.length, 0),
    pagesWithExtraH1: extraH1.length,
    externalNofollowLinks: externalNofollow.length,
    pagesWithWeakIncoming: weakIncoming.length,
    crawlBlockedPages: blocked.length,
    unminifiedAssets: unminified.length,
  },
  brokenLinks,
  missingPages,
  schemaIssues,
  schemaInvalidJson,
  dupH1Title,
  extraH1,
  externalNofollow,
  weakIncoming,
  blocked,
  unminified,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 1) + '\n');

if (AS_JSON) {
  console.log(JSON.stringify(report.summary, null, 2));
  process.exit(0);
}

const s = report.summary;
if (!QUIET) {
  console.log('==========================================');
  console.log(' FULL SITE AUDIT — deploy/ (' + pages.length + ' pages)');
  console.log('==========================================');
  console.log('broken internal links : ' + s.brokenInternalLinks + ' (' + s.brokenUniqueTargets + ' unique targets)');
  [...new Set(brokenLinks.map((b) => b.target))].slice(0, 40).forEach((t) => {
    const n = brokenLinks.filter((b) => b.target === t).length;
    console.log('   ' + String(n).padStart(3) + 'x  ' + t);
  });
  console.log('4XX / missing pages   : ' + s.pagesReturning4xx);
  missingPages.slice(0, 20).forEach((m) => console.log('   ' + m.path));
  console.log('invalid schema items  : ' + s.invalidSchemaItems + ' on ' + s.pagesWithInvalidSchema + ' pages');
  const byProp = {};
  for (const i of schemaIssues) {
    const k = i.type + '.' + i.prop;
    byProp[k] = (byProp[k] || 0) + 1;
  }
  Object.entries(byProp).sort((a, b) => b[1] - a[1]).slice(0, 25)
    .forEach(([k, n]) => console.log('   ' + String(n).padStart(4) + '  ' + k));
  schemaInvalidJson.slice(0, 10).forEach((j) => console.log('   JSON FAIL ' + j.page + ' — ' + j.error));
  console.log('duplicate title+H1    : ' + s.duplicateH1TitleGroups + ' groups / ' + s.pagesInDuplicateH1TitleGroups + ' pages');
  dupH1Title.slice(0, 12).forEach((g) => console.log('   "' + g.title.slice(0, 60) + '" ×' + g.pages.length + '  ' + g.pages.slice(0, 4).join(', ')));
  console.log('pages with >1 H1      : ' + s.pagesWithExtraH1);
  extraH1.slice(0, 10).forEach((e) => console.log('   ' + e.count + 'x  ' + e.page));
  console.log('external nofollow     : ' + s.externalNofollowLinks);
  externalNofollow.slice(0, 12).forEach((e) => console.log('   ' + e.href + '  on ' + e.page));
  console.log('weak incoming (<=1)   : ' + s.pagesWithWeakIncoming);
  weakIncoming.slice(0, 15).forEach((w) => console.log('   ' + w.incoming + '  ' + w.page));
  console.log('crawl-blocked pages   : ' + s.crawlBlockedPages);
  blocked.forEach((b) => console.log('   ' + b.page + (b.noindex ? ' [noindex]' : '') + (b.blockedByRobots ? ' [robots]' : '')));
  console.log('unminified JS/CSS     : ' + s.unminifiedAssets);
  unminified.sort((a, b) => b.bytes - a.bytes).slice(0, 15)
    .forEach((u) => console.log('   ' + String(u.lines).padStart(6) + ' lines  ' + Math.round(u.bytes / 1024) + 'KB  ' + u.file));
  console.log('\nwrote ' + path.relative(ROOT, OUT));
}
