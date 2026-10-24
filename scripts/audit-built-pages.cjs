#!/usr/bin/env node
// ============================================================
// CalcProMaster — built-page health audit
// ------------------------------------------------------------
// Reads deploy/ and reports the three things an external crawl (Ahrefs /
// Site Audit) flags that the existing gates did not measure:
//
//   1. INLINKS      — indexable routes reached by <= 1 dofollow internal link
//   2. SOCIAL TAGS  — pages missing og:type / any required Twitter card tag
//   3. JSON-LD      — blocks that fail JSON.parse, or entities missing the
//                     fields Google's validators require for their @type
//
// Output: data/built-page-audit.json (+ console)
//
// Usage: node scripts/audit-built-pages.cjs [--json]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const OUT = path.join(ROOT, 'data', 'built-page-audit.json');
const JSON_OUT = process.argv.includes('--json');

function walk(dir, acc, ext) {
  for (const e of fs.readdirSync(dir)) {
    const p = path.join(dir, e);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc, ext);
    else if (e.endsWith(ext)) acc.push(p);
  }
  return acc;
}

const htmlFiles = walk(DEPLOY, [], '.html');
const dirPages = htmlFiles.filter((f) => f.endsWith(path.sep + 'index.html') || f.endsWith('/index.html'));
const routeOf = (f) => {
  const dir = path.relative(DEPLOY, path.dirname(f)).replace(/\\/g, '/').replace(/^\.$/, '');
  return dir ? '/' + dir + '/' : '/';
};

// ---------- 1. inlinks ----------
// Only indexable routes are Audited — noindex modifier variants and the empty
// Google verification file are excluded, which is what an external crawl sees.
const isIndexable = (f) => {
  if (/googled[0-9a-z]+\.html$/i.test(f)) return false;
  const h = fs.readFileSync(f, 'utf8');
  return !/name="robots"[^>]*noindex/i.test(h);
};
const inlinks = new Map();
for (const f of dirPages) if (isIndexable(f)) inlinks.set(routeOf(f), 0);
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const noindex = /name="robots"[^>]*noindex/i.test(html);
  if (noindex) continue;
  for (const m of html.matchAll(/<a\b[^>]*href="(\/[^"#?]*)"/g)) {
    let target = m[1];
    if (!target.endsWith('/')) {
      // flat pages (/about) and directory routes are both linked without the
      // slash; normalise to the directory form when one exists.
      target = target + '/';
    }
    if (inlinks.has(target)) inlinks.set(target, inlinks.get(target) + 1);
  }
}
const lowInlinks = [...inlinks.entries()]
  .filter(([, n]) => n <= 1)
  .sort((a, b) => a[1] - b[1])
  .map(([url, n]) => ({ url, inlinks: n }));

// ---------- 2. social tags ----------
const OG = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
const TW = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];
const social = [];
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  if (/name="robots"[^>]*noindex/i.test(html)) continue;
  // The empty GSC verification file is not a content page.
  if (/googled1ac20b54b36e7cf\.html$/.test(f)) continue;
  const missOg = OG.filter((k) => !html.includes('property="' + k + '"'));
  const missTw = TW.filter((k) => !html.includes('name="' + k + '"'));
  if (missOg.length || missTw.length) {
    social.push({ file: path.relative(ROOT, f), missingOg: missOg, missingTwitter: missTw });
  }
}

// ---------- 3. JSON-LD ----------
const REQUIRED = {
  WebApplication: ['name', 'url', 'applicationCategory', 'operatingSystem', 'offers'],
  FAQPage: ['mainEntity'],
  HowTo: ['name', 'step'],
  BreadcrumbList: ['itemListElement'],
  CollectionPage: ['name', 'url'],
  ItemList: ['itemListElement'],
  Organization: ['name', 'url'],
  WebSite: ['name', 'url'],
  Article: ['headline', 'datePublished'],
  BlogPosting: ['headline', 'datePublished'],
  SoftwareApplication: ['name', 'offers'],
  Question: ['name', 'acceptedAnswer'],
  Answer: ['text'],
  ListItem: ['position'],
  Offer: ['price', 'priceCurrency'],
  Thing: ['name']
};
const schemaIssues = [];
function checkNode(node, where, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((n) => checkNode(n, where, out)); return; }
  const type = node['@type'];
  if (type && REQUIRED[type]) {
    for (const key of REQUIRED[type]) {
      const v = node[key];
      const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
      if (empty) out.push({ where, type, missing: key });
    }
  }
  for (const v of Object.values(node)) if (v && typeof v === 'object') checkNode(v, where, out);
}
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  blocks.forEach((b, i) => {
    const where = path.relative(ROOT, f) + ' #' + (i + 1);
    let data;
    try { data = JSON.parse(b[1]); } catch (e) {
      schemaIssues.push({ where, type: 'PARSE', missing: e.message.slice(0, 90) });
      return;
    }
    const out = [];
    checkNode(data, where, out);
    schemaIssues.push(...out);
  });
}

const report = {
  ranAt: new Date().toISOString(),
  pages: dirPages.length,
  htmlFiles: htmlFiles.length,
  lowInlinksCount: lowInlinks.length,
  lowInlinks: lowInlinks.slice(0, 100),
  socialTagPages: social.length,
  social: social.slice(0, 100),
  schemaIssueCount: schemaIssues.length,
  schemaIssues: schemaIssues.slice(0, 100)
};

fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

if (JSON_OUT) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

console.log('==========================================');
console.log(' BUILT-PAGE AUDIT');
console.log('==========================================');
console.log('routes               : ' + report.pages);
console.log('inlinks <= 1         : ' + report.lowInlinksCount);
for (const r of report.lowInlinks.slice(0, 10)) console.log('   ' + r.inlinks + '  ' + r.url);
console.log('');
console.log('social tag problems  : ' + report.socialTagPages);
for (const s of report.social.slice(0, 8)) console.log('   ' + s.file + '  og:[' + s.missingOg.join(',') + '] tw:[' + s.missingTwitter.join(',') + ']');
console.log('');
console.log('JSON-LD issues       : ' + report.schemaIssueCount);
for (const s of report.schemaIssues.slice(0, 10)) console.log('   ' + s.type + ' missing ' + s.missing + '  ' + s.where);
console.log('');
console.log('💾 ' + path.relative(ROOT, OUT));

// Gate mode: any of the three crawl-visible defect classes fails the build/CI.
if (report.lowInlinksCount || report.socialTagPages || report.schemaIssueCount) {
  console.error('✖ built-page audit found issues — see the list above');
  process.exitCode = 1;
} else {
  console.log('✅ PASS — no low-inlink pages, incomplete social tags or schema defects');
}
