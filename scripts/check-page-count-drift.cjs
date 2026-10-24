#!/usr/bin/env node
// ============================================================
// CalcProMaster — Page-count drift gate
// ------------------------------------------------------------
// Kyun: ek interrupted `build-deploy.js` 849 HTML files ko NUL bytes se bhar
// dega — file ka size theek dikhta hai, `find | wc -l` bhi theek, magar page
// ka content gayab. Us haalat mein har count-report "1417 pages" bolegi jab ke
// 849 pages khaali hain. Ye gate wahi cheez pakadta hai, aur uske saath do
// qism ke number compare karta hai:
//
//   1. INVARIANTS (baseline ki zaroorat nahi — hamesha sach hone chahiye)
//      · koi bhi page contentless nahi (readable words < MIN_WORDS)
//      · har tool id ka deploy page mojood
//      · har sitemap URL ka local HTML mojood
//      · sitemap mein duplicate <loc> nahi
//   2. DRIFT vs committed baseline (data/page-count-baseline.json)
//      · structural counts (sitemap / deploy / tools / inventory) — bilkul
//        na badlein. Badle to ya build toota hai ya jaan-boojh kar pages
//        add/remove hue; dono soorat mein `--update` + commit chahiye.
//      · reach counts (stuck/thin/broad pages) — GSC data ke saath legitimately
//        badalte hain, is liye sirf --tolerance-pct se zyada hilne par fail.
//
// Usage: node scripts/check-page-count-drift.cjs [--update] [--json]
//        [--tolerance-pct 10]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASELINE = path.join(ROOT, 'data', 'page-count-baseline.json');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const TOOL_IDS = path.join(ROOT, 'all-tool-ids.json');
const TOOL_ROUTES = path.join(ROOT, 'tool-routes.json');
const INVENTORY = path.join(ROOT, 'data', 'site-inventory.json');
const QUERY_REACH = path.join(ROOT, 'data', 'query-reach.json');
const DEPLOY = path.join(ROOT, 'deploy');

// Ek page "contentless" hai agar usme itne readable words bhi nahi — NUL-padded
// ya truncate hui file ka signature. Threshold 50 rakha gaya hai: asli page ka
// shortest bhi 300+ words ka hota hai.
const MIN_WORDS = 50;

// Non-content routes jin par kam words hona normal hai (404 page, embed widget,
// aur search-engine verification files). Exemption list comments ke saath hai,
// warna ye "sab exempt" ban kar gate ko bekaar kar deti.
const NON_CONTENT_ROUTES = [
  /^\/404$/,                    // error page — chhota hona hi chahiye
  /^\/embed\//,                 // standalone embed widget, page nahi
  /^\/googled[0-9a-f]+(\.html?)?$/, // Google site verification file (route ka .html strip ho jata hai)
  /^\/\.well-known\//,
];

function isNonContentRoute(route, patterns = NON_CONTENT_ROUTES) {
  return patterns.some((re) => re.test(route));
}

// Consistency counts bhi structural hain: inka hilna apne aap mein ek defect hai
// (contentless 0 rehna chahiye, missing pages 0, duplicate sitemap 0).
const STRUCTURAL = [
  'sitemapUrls', 'deployPages', 'toolIds', 'inventoryRows',
  'contentlessPages', 'missingToolPages', 'missingSitemapHtml', 'duplicateSitemapLocs',
];
// Reach counts GSC join se bante hain — naya data aane par legitimately hilte hain,
// is liye sirf tolerance se zyada hilne par fail.
const REACH = ['stuckPages', 'thinPages', 'growingPages', 'broadPages', 'hundredsPages', 'backlogWrite', 'backlogExpose'];

// ---------- pure helpers (unit-tested) ----------

// Readable words in a built page. NUL bytes aur tags hata kar ginne se truncated
// file 0 deti hai — size-based check isay pakad hi nahi sakta.
function readableWords(html) {
  const text = String(html || '')
    .replace(/\u0000/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.split(' ').length : 0;
}

function isContentless(words, min = MIN_WORDS) {
  return !Number.isFinite(words) || words < min;
}

// Har count ko `structural` ya `reach` label do — dono ka fail rule alag hai.
function kindOf(key) {
  if (STRUCTURAL.includes(key)) return 'structural';
  if (REACH.includes(key)) return 'reach';
  return 'other';
}

// Baseline vs current. Structural change = drift (0 tolerance). Reach change
// tolerance ke andar ho to sirf note.
function compareCounts(baseline, current, { tolerancePct = 10 } = {}) {
  const rows = [];
  for (const key of Object.keys(current)) {
    const kind = kindOf(key);
    const before = baseline ? baseline[key] : undefined;
    const after = current[key];
    if (before === undefined) {
      rows.push({ key, kind, before: null, after, delta: null, verdict: 'no-baseline' });
      continue;
    }
    const delta = after - before;
    let verdict = 'ok';
    if (delta !== 0) {
      if (kind === 'structural') verdict = 'drift';
      else if (before === 0) verdict = 'drift';
      else verdict = Math.abs(delta) / before * 100 > tolerancePct ? 'drift' : 'within-tolerance';
    }
    rows.push({ key, kind, before, after, delta, verdict });
  }
  return rows;
}

// Jo cheezein baseline ke bina bhi sach honi chahiye.
function checkInvariants(counts) {
  const bad = [];
  if (counts.contentlessPages > 0) {
    bad.push(`${counts.contentlessPages} page(s) have no readable content (< ${MIN_WORDS} words) — build truncated?`);
  }
  if (counts.missingToolPages > 0) {
    bad.push(`${counts.missingToolPages} tool id(s) in all-tool-ids.json have no deploy page`);
  }
  if (counts.missingSitemapHtml > 0) {
    bad.push(`${counts.missingSitemapHtml} sitemap URL(s) have no local HTML — run build-deploy.js`);
  }
  if (counts.duplicateSitemapLocs > 0) {
    bad.push(`${counts.duplicateSitemapLocs} duplicate <loc> entr(ies) in sitemap.xml`);
  }
  return bad;
}

module.exports = { MIN_WORDS, NON_CONTENT_ROUTES, STRUCTURAL, REACH, readableWords, isContentless, isNonContentRoute, kindOf, compareCounts, checkInvariants, routeOf };

// ---------- collect (I/O) ----------

// Deploy tree padhne wala gate hai is liye built tree ke bina kuch measure hi nahi
// hota — us soorat mein saaf message ke saath fail, chup-chaap pass nahi.
function walkHtml(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkHtml(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

// Sitemap URL → deploy ke andar local HTML file (Cloudflare Pages ki do shakalein).
function localHtmlFor(sitePath) {
  const rel = sitePath.replace(/^\//, '');
  if (rel === '') return fs.existsSync(path.join(DEPLOY, 'index.html')) ? path.join(DEPLOY, 'index.html') : null;
  const dirIndex = path.join(DEPLOY, rel, 'index.html');
  if (fs.existsSync(dirIndex)) return dirIndex;
  const flat = path.join(DEPLOY, rel + '.html');
  if (fs.existsSync(flat)) return flat;
  return null;
}

// Ek deploy HTML file ka route (/finance/pmi-calculator) aur uska last segment
// (pmi-calculator). Tool ids slug hote hain, path nahi — is liye slug set se
// membership check hoti hai, har id ke liye poora tree walk nahi.
function routeOf(file) {
  const rel = path.relative(DEPLOY, file).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  return '/' + rel.replace(/\/index\.html$/, '').replace(/\.html$/, '');
}

// Jo source repo mein nahi hai uska count report NAHI hota — 0 likh dena jhoota
// drift paida karta (CI mein data/query-reach.json aur inventory commit nahi hain).
// Kaun se source chhoot gaye, wo `missingSources` mein wapas milta hai.
function collectCounts() {
  const counts = {};
  const missingSources = [];

  // Sitemap
  let locs = [];
  if (fs.existsSync(SITEMAP)) {
    locs = [...fs.readFileSync(SITEMAP, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  }
  const uniqueLocs = new Set(locs);
  counts.sitemapUrls = uniqueLocs.size;
  counts.duplicateSitemapLocs = locs.length - uniqueLocs.size;

  // Deploy tree
  const htmlFiles = walkHtml(DEPLOY);
  counts.deployPages = htmlFiles.length;

  // Contentless pages — kaun se. Non-content routes exempt hain (404, embed,
  // verification file), baqi har chhoti/truncated page ek defect hai.
  const contentless = [];
  for (const f of htmlFiles) {
    const route = routeOf(f);
    if (isNonContentRoute(route)) continue;
    const words = readableWords(fs.readFileSync(f, 'utf8'));
    if (isContentless(words)) contentless.push({ file: path.relative(ROOT, f).replace(/\\/g, '/'), route, words });
  }
  counts.contentlessPages = contentless.length;

  // Tool registry → deploy page. all-tool-ids.json entries objects hain
  // ({id,name,file}), aur page slug se match hota hai — tool-routes.json pura
  // nahi hai (76 naye tools usme nahi hain), is liye route ka aakhri segment
  // dekhna wahi sahi jawab deta hai jo deploy tree mein hai.
  const routes = new Set(htmlFiles.map((f) => routeOf(f)));
  const slugs = new Set([...routes].map((r) => r.split('/').pop()));
  let toolIds = [];
  if (fs.existsSync(TOOL_IDS)) {
    const t = JSON.parse(fs.readFileSync(TOOL_IDS, 'utf8'));
    toolIds = (Array.isArray(t) ? t : Object.keys(t)).map((e) => (typeof e === 'string' ? e : e && e.id)).filter(Boolean);
  }
  counts.toolIds = toolIds.length;
  counts.missingToolPages = toolIds.filter((id) => !slugs.has(id)).length;

  // Sitemap → local HTML
  counts.missingSitemapHtml = [...uniqueLocs].filter((u) => {
    const p = u.replace(/^https?:\/\/[^/]+/, '');
    return !localHtmlFor(p);
  }).length;

  // Inventory rows (optional — site-inventory.json generate hoti hai)
  if (fs.existsSync(INVENTORY)) {
    counts.inventoryRows = (JSON.parse(fs.readFileSync(INVENTORY, 'utf8')).pages || []).length;
  } else {
    missingSources.push('data/site-inventory.json');
  }

  // Reach tiers (GSC join se bante hain — optional)
  if (fs.existsSync(QUERY_REACH)) {
    const qr = JSON.parse(fs.readFileSync(QUERY_REACH, 'utf8'));
    for (const row of qr.tierTable || []) counts[row.tier + 'Pages'] = row.pages;
    counts.backlogWrite = (qr.backlogSummary || {}).write || 0;
    counts.backlogExpose = (qr.backlogSummary || {}).expose || 0;
  } else {
    missingSources.push('data/query-reach.json');
  }

  return { counts, contentless, missingSources };
}

function main() {
  const arg = (name, dflt) => {
    const i = process.argv.indexOf(name);
    const v = i >= 0 ? Number(process.argv[i + 1]) : NaN;
    return Number.isFinite(v) ? v : dflt;
  };
  const tolerancePct = arg('--tolerance-pct', 10);
  const asJson = process.argv.includes('--json');
  const update = process.argv.includes('--update');

  const { counts, contentless, missingSources } = collectCounts();
  if (!counts.deployPages) {
    console.error('FAILED: deploy/ mein koi HTML nahi mila — pehle `node build-deploy.js` chalao (ye gate built tree padhta hai).');
    return 1;
  }
  const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')).counts : null;
  const rows = compareCounts(baseline, counts, { tolerancePct });
  const violations = checkInvariants(counts);

  if (update) {
    fs.writeFileSync(BASELINE, JSON.stringify({ generatedAt: new Date().toISOString(), counts }, null, 2) + '\n');
    console.log('baseline updated → data/page-count-baseline.json');
    for (const [k, v] of Object.entries(counts)) console.log('  ' + k.padEnd(22) + v);
    return;
  }

  const drift = rows.filter((r) => r.verdict === 'drift');

  if (asJson) {
    console.log(JSON.stringify({ counts, rows, violations, tolerancePct }, null, 2));
  } else {
    console.log('PAGE COUNT DRIFT GATE');
    for (const r of rows) {
      const tag = r.verdict === 'ok' ? 'ok   ' : r.verdict === 'drift' ? 'DRIFT' : r.verdict === 'within-tolerance' ? 'note ' : 'NEW  ';
      const detail = r.before === null ? 'no baseline' : `${r.before} → ${r.after} (${r.delta > 0 ? '+' : ''}${r.delta})`;
      console.log('  ' + tag + ' ' + r.key.padEnd(22) + detail + (tag === 'DRIFT' ? ' → ' + r.kind : ''));
    }
    if (contentless.length) {
      console.log('--- contentless pages (first 10) ---');
      for (const c of contentless.slice(0, 10)) console.log('  ' + c.file + '  words=' + c.words);
    }
    if (missingSources.length) console.log('  (not measured — source absent: ' + missingSources.join(', ') + ')');
    console.log('---');
  }

  if (violations.length) {
    console.error('FAILED: invariant(s) broken:');
    for (const v of violations) console.error('  · ' + v);
    return 1;
  }
  if (drift.length) {
    console.error(`FAILED: ${drift.length} count(s) drifted vs data/page-count-baseline.json.`);
    console.error('  Agar ye tabdeeli jaan-boojh kar hai: `npm run check:page-drift -- --update` chalao aur baseline commit karo.');
    console.error('  Agar nahi: build/registry check karo — interrupted build NUL-padded pages chhod jata hai.');
    return 1;
  }
  console.log('✅ page counts to baseline ke mutabiq hain, koi contentless page nahi');
  return 0;
}

if (require.main === module) process.exit(main());
