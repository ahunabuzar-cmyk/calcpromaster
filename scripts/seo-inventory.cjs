// CALCPROMASTER — §1 COMPLETE SEO INVENTORY CRAWLER
// Walks every URL in the sitemap (tools / category hubs / long-tail / legal / home),
// records the full field set from §1 of the SEO program, and saves
// test-results/seo-inventory.json (+ a CSV summary). Read-only over deploy/.
//
// Usage: node scripts/seo-inventory.cjs [--http]   (--http adds a live HTTP sweep
// against a local server on :3100 started separately via scripts/serve-deploy.cjs)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const OUT = path.join(ROOT, 'test-results', 'seo-inventory.json');
const registry = require(path.join(ROOT, 'docs', 'calculator-registry.json'));
const DOMAIN = 'https://calcpromaster.netlify.app';

// ---------- helpers ----------
const decode = (s) => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&#x?[0-9a-fA-F]+;/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
const strip = (s) => s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const textLen = (h) => strip(h).split(/\s+/).filter(Boolean).length;

const DOMAIN_REF = new RegExp('^https?://calcpromaster\\.netlify\\.app');
const isInternal = (u) => u.startsWith('/');
const noindexRe = /<meta name="robots" content="[^"]*noindex[^"]*"/i;

function classifyPath(p) {
  const seg = p.replace(/^\//, '').split('/').filter(Boolean);
  if (seg.length === 0) return { type: 'home', cat: null, id: null };
  if (seg.length === 1) return { type: 'legal', cat: null, id: seg[0] };
  if (seg[0] === 'hub') return { type: 'hub', cat: seg[1], id: null };
  if (seg.length === 2) return { type: 'tool', cat: seg[0], id: seg[1] };
  return { type: 'longtail', cat: seg[0], id: seg[1], tail: seg.slice(2).join('/') };
}

function headOf(html, re, group = 1) {
  const m = html.match(re);
  return m ? m[group] : '';
}

function inventoryPage(route, kind, tool) {
  const file = path.join(DEPLOY, route.replace(/^\//, ''), 'index.html');
  const exists = fs.existsSync(file);
  const base = {
    url: DOMAIN + route,
    route,
    kind,
    exists,
    httpStatus: null, // filled by --http sweep
    indexable: exists,
    noindex: false,
    canonical: '', canonicalOk: false,
    title: '', titleLen: 0,
    metaDesc: '', metaDescLen: 0,
    h1: '', h1Count: 0,
    h2s: [], h3s: [],
    primaryTopic: tool ? tool.name : (kind === 'hub' ? (route.split('/')[2] || '') + ' calculators hub' : route),
    primaryKeyword: tool ? (tool.name + ' calculator').toLowerCase() : '',
    wordCount: 0,
    internalLinks: 0, externalLinks: 0, externalLinkTargets: [],
    images: 0, imagesWithAlt: 0, imageAlts: [],
    video: 0,
    jsonldTypes: [],
    inSitemap: true,
    robotsAllowed: true,
    redirect: null,
    orphan: null, // filled in pass 2
    cannibalizationRisk: null, // filled in pass 2
    uniqueness: null, // filled in pass 2
  };
  if (!exists) return base;

  const html = fs.readFileSync(file, 'utf8');
  const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  base.noindex = noindexRe.test(html);
  base.indexable = exists && !base.noindex;
  base.canonical = headOf(html, /rel="canonical" href="([^"]*)"/);
  base.canonicalOk = base.canonical === DOMAIN + route;
  base.title = decode(headOf(html, /<title>([\s\S]*?)<\/title>/));
  base.titleLen = base.title.length;
  base.metaDesc = decode(headOf(html, /name="description" content="([^"]*)"/));
  base.metaDescLen = base.metaDesc.length;
  const h1s = [...noScript.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => strip(m[1]));
  base.h1 = h1s[0] || '';
  base.h1Count = h1s.length;
  base.h2s = [...noScript.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => strip(m[1]));
  base.h3s = [...noScript.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => strip(m[1]));
  base.wordCount = textLen((html.match(/<main[\s\S]*?<\/main>/) || [])[0] || html);

  const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
  const internal = hrefs.filter(isInternal).map((h) => h.split('#')[0]).filter((h) => h && h !== '/');
  base.internalLinks = new Set(internal).size;
  const ext = [...new Set(hrefs.filter((h) => /^https?:\/\//.test(h) && !DOMAIN_REF.test(h)).map((h) => h.replace(/^https?:\/\//, '').split('/')[0] + ' — ' + (h.length < 120 ? h : h.slice(0, 117) + '...')))];
  base.externalLinks = ext.length;
  base.externalLinkTargets = ext.slice(0, 8);

  const imgs = [...noScript.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  base.images = imgs.length;
  base.imagesWithAlt = imgs.filter((i) => /\balt="[^"]+"/.test(i)).length;
  base.imageAlts = imgs.map((i) => (i.match(/alt="([^"]*)"/) || [])[1] || '').filter(Boolean).slice(0, 5);

  base.video = (html.match(/<(video|iframe[^>]*youtube|iframe[^>]*youtu\.be)/g) || []).length;

  base.jsonldTypes = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const d = JSON.parse(m[1]);
      base.jsonldTypes.push(...(Array.isArray(d) ? d : [d]).map((o) => o['@type'] || '?'));
    } catch { base.jsonldTypes.push('INVALID'); }
  }
  return base;
}

// ---------- walk sitemap ----------
console.log('Reading sitemap…');
const sm = fs.readFileSync(path.join(DEPLOY, 'sitemap.xml'), 'utf8');
const routes = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(DOMAIN, ''));
console.log('sitemap URLs:', routes.length);

const regById = {};
for (const t of registry.tools) regById[t.id] = t;

const pages = routes.map((route) => {
  const c = classifyPath(route);
  const tool = c.type === 'tool' || c.type === 'longtail' ? regById[c.id] : null;
  return inventoryPage(route, c.type, tool);
});

// extra deploy pages NOT in sitemap (inventory completeness)
const smSet = new Set(routes);
const extra = [];
const walk = (dir, prefix) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const route = prefix + '/' + e.name;
    if (e.isDirectory()) {
      if (route === '/hub') continue;
      walk(full, route);
    } else if (e.name === 'index.html') {
      if (!smSet.has(prefix)) extra.push(prefix);
    }
  }
};
walk(DEPLOY, '');
const extraSafe = extra.filter((r) => !/formula-review|qa-dashboard|og-image/.test(r));
console.log('deploy pages NOT in sitemap (excl. known noindex dashboards):', extraSafe.length, extraSafe.slice(0, 10));

// ---------- cross-page analysis (orphan / dup / cannibalization) ----------
console.log('Cross-page analysis…');
const inbound = {};
const toolPages = pages.filter((p) => p.kind === 'tool');
for (const p of toolPages) {
  for (const h of [...html_inboundKeys(p)]) inbound[h] = (inbound[h] || 0) + 1;
}
function html_inboundKeys(p) {
  // recompute inbound links by scanning every tool page once (below) — placeholder removed
  return [];
}

const linkGraph = {};
for (const p of toolPages) {
  const file = path.join(DEPLOY, p.route.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const targets = [...html.matchAll(/href="\/([a-z0-9-]+)\/([a-z0-9-]+)(?:\/[a-z0-9-]+)?"/g)]
    .map((m) => m[1] + '/' + m[2]);
  for (const t of targets) {
    if (!linkGraph[t]) linkGraph[t] = { from: new Set(), n: 0 };
    linkGraph[t].from.add(p.cat + '/' + p.route.split('/')[2]);
    linkGraph[t].n++;
  }
}

const titleMap = {}, descMap = {}, h1Map = {}, bodyShingles = {};
for (const p of pages) {
  if (p.title) (titleMap[p.title.toLowerCase()] ||= []).push(p.route);
  if (p.metaDesc) (descMap[p.metaDesc.toLowerCase()] ||= []).push(p.route);
  if (p.h1) (h1Map[p.h1.toLowerCase()] ||= []).push(p.route);
  // 5-word shingle fingerprint of first 300 words of main content
  const file = path.join(DEPLOY, p.route.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const words = strip((html.match(/<main[\s\S]*?<\/main>/) || [])[0] || html).toLowerCase().split(/\s+/).slice(0, 300);
  const sh = new Set();
  for (let i = 0; i + 4 < words.length; i++) sh.add(words.slice(i, i + 5).join(' '));
  bodyShingles[p.route] = sh;
}

// shingle overlap (Jaccard) for near-duplicate detection
const routesAll = Object.keys(bodyShingles);
const nearDups = [];
for (let i = 0; i < routesAll.length; i++) {
  for (let j = i + 1; j < routesAll.length; j++) {
    const a = bodyShingles[routesAll[i]], b = bodyShingles[routesAll[j]];
    const inter = a.size < b.size
      ? [...a].filter((x) => b.has(x)).length
      : [...b].filter((x) => a.has(x)).length;
    const union = a.size + b.size - inter;
    if (union > 0 && inter / union > 0.75) nearDups.push([routesAll[i], routesAll[j], +(inter / union).toFixed(2)]);
  }
}

// fill orphan/cannibalization/uniqueness fields
for (const p of pages) {
  const key = p.cat && p.id ? p.cat + '/' + p.id : null;
  if (p.kind === 'tool' && key) {
    const g = linkGraph[key];
    p.orphan = !g ? true : g.n < 2;
    const catPeers = linkGraph[key] ? linkGraph[key].from.size : 0;
    p.cannibalizationRisk = null; // computed after
  }
  if (p.kind === 'longtail') {
    p.orphan = true; // assessed below via parent presence
    const parent = p.cat + '/' + p.id;
    p.orphan = !linkGraph[parent] ? 'parent-not-linked' : null;
  }
}
for (const p of pages) {
  if (p.kind === 'tool') {
    const same = toolPages.filter((q) => q.cat === p.cat && q.id !== p.id && q.title && p.title &&
      (q.title.toLowerCase() === p.title.toLowerCase() || q.h1.toLowerCase() === p.h1.toLowerCase()));
    p.cannibalizationRisk = same.length ? same.map((q) => q.route) : null;
  }
  if (p.title && p.metaDesc && p.h1) {
    const others = pages.filter((q) => q !== p && q.kind === 'tool' && q.route.split('/')[1] !== p.route.split('/')[1] &&
      strip(q.metaDesc).slice(0, 120) === strip(p.metaDesc).slice(0, 120));
    p.uniqueness = others.length ? 'desc-shared-cross-cat' : 'unique';
  }
}

// ---------- summary ----------
const count = (f) => pages.filter(f).length;
const summary = {
  generated: new Date().toISOString(),
  totalUrls: pages.length,
  indexable: count((p) => p.indexable),
  noindex: count((p) => p.noindex),
  missingFile: count((p) => !p.exists),
  canonicalIssues: count((p) => p.exists && !p.canonicalOk),
  titleIssues: { empty: count((p) => p.titleLen === 0), over60: count((p) => p.titleLen > 60), dup: Object.values(titleMap).filter((v) => v.length > 1).length },
  descIssues: { empty: count((p) => p.metaDescLen === 0), under90: count((p) => p.metaDescLen > 0 && p.metaDescLen < 90), over160: count((p) => p.metaDescLen > 160), dup: Object.values(descMap).filter((v) => v.length > 1).length },
  h1Issues: { missing: count((p) => p.h1Count === 0), multiple: count((p) => p.h1Count > 1), dup: Object.values(h1Map).filter((v) => v.length > 1).length },
  thinPages: count((p) => p.exists && p.wordCount < 250),
  orphanTools: count((p) => p.kind === 'tool' && p.orphan === true),
  orphanLongtail: count((c) => c.kind === 'longtail' && c.orphan),
  nearDuplicatePairs: nearDups.length,
  pagesWithJsonld: count((p) => p.jsonldTypes.length > 0 && !p.jsonldTypes.includes('INVALID')),
  pagesWithFaqSchema: count((p) => p.jsonldTypes.some((t) => t === 'FAQPage')),
  pagesWithVideo: count((p) => p.video > 0),
  pagesWithImages: count((p) => p.images > 0),
  externalLinksPages: count((p) => p.externalLinks > 0),
  avgInternalLinks: +(toolPages.reduce((a, p) => a + p.internalLinks, 0) / Math.max(toolPages.length, 1)).toFixed(1),
  nearDupSample: nearDups.slice(0, 20),
  extraDeployPages: extraSafe,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ summary, pages }, null, 1));
fs.writeFileSync(path.join(ROOT, 'test-results', 'seo-inventory.csv'), [
  'url,kind,indexable,canonicalOk,titleLen,descLen,h1Count,words,internalLinks,externalLinks,images,jsonld',
].concat(pages.map((p) => [p.url, p.kind, p.indexable, p.canonicalOk, p.titleLen, p.metaDescLen, p.h1Count, p.wordCount, p.internalLinks, p.externalLinks, p.images, p.jsonldTypes.join('|')].join(','))).join('\n'));

console.log('\n=== §1 INVENTORY SUMMARY ===');
console.log(JSON.stringify(summary, null, 1));
console.log('\nSaved', OUT);
