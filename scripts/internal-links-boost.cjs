#!/usr/bin/env node
// ============================================================
// CalcProMaster — Internal-links boost audit
// Discovered/Unknown GSC URLs ko static inlinks deta hai jo crawl
// tez karta hai. Kaam:
//   1. data/gsc-coverage-report.json se DISCOVERED + UNKNOWN URLs lo
//   2. deploy/ ke static pages (category, hub, guides, blog) mein
//      in-links scan karo (href="/cat/tool/")
//   3. Orphans (0-1 static inlink) ki priority list + recommended
//      guide placements (category mapping) banao
//   4. data/internal-links-audit.json + console summary
// Usage: node scripts/internal-links-boost.cjs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const SITE = 'https://calcpromaster.com';

// ---- load coverage report ----
const repPath = path.join(ROOT, 'data', 'gsc-coverage-report.json');
if (!fs.existsSync(repPath)) { console.error('gsc-coverage-report.json nahi mila — pehle gsc-aggregate-coverage.cjs chalao'); process.exit(1); }
const rep = JSON.parse(fs.readFileSync(repPath, 'utf8'));
const targets = [
  ...(rep.lists.DISCOVERED || []).map(r => r.url),
  ...(rep.lists.UNKNOWN || []).map(r => r.url),
].map(u => u.startsWith('/') ? u : u.replace(SITE, ''));

// ---- scan static pages for hrefs ----
// Only crawlable indexable pages matter: scan guides/, blog/, hub/, category dirs (index.html only)
function collectPages(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const rel = path.relative(DEPLOY, full).split(path.sep).join('/');
    if (e.isDirectory()) {
      if (['js', 'css', 'fonts', 'og', 'icons', 'embed', 'docs', 'admin'].includes(e.name)) continue;
      collectPages(full, out);
    } else if (e.name === 'index.html' || (e.name.endsWith('.html') && e.name !== '404.html')) {
      out.push({ file: full, rel: '/' + rel.replace(/(^|\/)index\.html$/, '') });
    }
  }
  return out;
}
const pages = collectPages(DEPLOY, []);
const linkIndex = new Map(); // inlinkCount per tool path
const linkersByTool = new Map();
const hrefRe = /href="(\/[a-z0-9-]+\/[a-z0-9-]+\/?)"/g;
for (const p of pages) {
  const html = fs.readFileSync(p.file, 'utf8');
  // PAGE-LEVEL DEDUPE + normalized keys (no trailing slash): pehle slash/no-slash
  // alag keys ban rahe the — no-slash (category/hub) slash (More-block) ko shadow
  // karta tha aur count galat 2 par ruk jata tha. Ek page = ek inlink.
  const seen = new Set();
  for (const h of html.matchAll(hrefRe)) {
    const target = h[1].replace(/\/$/, '');
    if (seen.has(target)) continue;
    seen.add(target);
    linkIndex.set(target, (linkIndex.get(target) || 0) + 1);
    if (!linkersByTool.has(target)) linkersByTool.set(target, []);
    if (linkersByTool.get(target).length < 5) linkersByTool.get(target).push(p.rel || '/');
  }
}

// ---- classify ----
const CAT_GUIDE = {
  finance: 'guides/loans-mortgages', health: 'guides/health-fitness', math: 'guides/math-statistics',
  business: 'guides/business', construction: 'guides/construction', engineering: 'guides/engineering',
  science: 'guides/science', auto: 'guides/auto', career: 'guides/career', food: 'guides/food',
  family: 'guides/family', fitness: 'guides/health-fitness', education: 'guides/math-statistics',
  homegarden: 'guides/homegarden', conversion: 'guides/unit-conversion', tech: 'guides/utilities',
  utilities: 'guides/utilities', lifestyle: 'guides/lifestyle', everyday: 'guides/everyday', regional: 'guides/regional'
};

const results = { orphan: [], weak: [], ok: [] };
for (const t of targets) {
  const key = t.replace(/\/$/, '');
  const n = linkIndex.get(key) || 0;
  const item = { url: t, inlinks: n, linkedFrom: linkersByTool.get(key) || [] };
  const cat = t.split('/')[1];
  item.recommendedGuide = CAT_GUIDE[cat] || null;
  if (n === 0) results.orphan.push(item);
  else if (n <= 2) results.weak.push(item);
  else results.ok.push(item);
}

const out = { ranAt: new Date().toISOString(), targets: targets.length, ...results };
fs.writeFileSync(path.join(ROOT, 'data', 'internal-links-audit.json'), JSON.stringify(out, null, 2));

console.log('=== Internal-links boost audit ===');
console.log('Targets (Discovered+Unknown): ' + targets.length);
console.log('  ORPHAN (0 static inlinks): ' + results.orphan.length);
console.log('  WEAK (<=2 inlinks):        ' + results.weak.length);
console.log('  OK (>2 inlinks):           ' + results.ok.length);
if (results.orphan.length) {
  console.log('\nTop orphans (inlinks 0 — sabse pehle inke links add karo):');
  for (const o of results.orphan.slice(0, 15)) console.log('  ' + o.url + '  → guide: ' + (o.recommendedGuide || '(category page par already linked)'));
}
console.log('\n💾 data/internal-links-audit.json');
console.log('\nNEXT: jo guides recommend hui hain, unke build scripts (scripts/build-topic-guides*.cjs) ke');
console.log('"Try the matching calculators" sections mein in tool IDs ko add karo — phir rebuild.');
