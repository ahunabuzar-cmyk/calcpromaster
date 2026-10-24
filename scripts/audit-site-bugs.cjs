#!/usr/bin/env node
// ============================================================
// CalcProMaster — whole-site bug audit (runs on deploy/)
// ------------------------------------------------------------
// Finds mechanical defects that no other gate covers:
//   1. duplicate id="" attributes on a page
//   2. internal links that resolve to no file and no known route
//   3. titles / meta descriptions missing, duplicated or badly sized
//   4. pages with zero or multiple <h1>
//   5. canonical that does not match the page's own URL
//   6. JSON-LD blocks that fail to parse
//   7. <img> without an alt attribute
//   8. non-https links to the site's own domain
//
// Usage: node scripts/audit-site-bugs.cjs [--json] [--limit 40]
// Exit code: 0 when there are no errors (warnings are reported only).
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const SITE = 'https://calcpromaster.com';
const JSON_OUT = process.argv.includes('--json');
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : 40;
  return Number.isFinite(v) && v > 0 ? v : 40;
})();

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

// Routes that are served without a matching .html file (SPA + functions).
const KNOWN_ROUTES = new Set(['/', '/404', '/search', '/blog', '/stats']);
const files = new Set();
for (const f of walk(DEPLOY)) {
  const rel = '/' + path.relative(DEPLOY, f).replace(/\\/g, '/');
  files.add(rel);
  files.add(rel.replace(/\.html$/, ''));
  files.add(rel.replace(/\/index\.html$/, ''));
}

// Only page-like hrefs are checked; assets (js/css/img/manifest/fonts) are
// served by path and are verified by the deploy smoke tests instead.
const ASSET_RE = /\.(js|mjs|css|png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|json|xml|txt|pdf|zip|webmanifest|map|mp4|webm)$/i;

function resolves(href) {
  let u = href.split('#')[0].split('?')[0];
  if (!u || u === '/') return true;
  if (/^(https?:|mailto:|tel:|javascript:|data:)/i.test(u)) return true;
  if (ASSET_RE.test(u)) return true;
  if (!u.startsWith('/')) u = '/' + u;
  u = u.replace(/\/$/, '');
  return files.has(u) || files.has(u + '/index.html') || KNOWN_ROUTES.has(u || '/');
}

const report = {
  pages: 0,
  duplicateIds: [],
  brokenLinks: [],
  titleIssues: [],
  descIssues: [],
  h1Issues: [],
  canonicalMismatch: [],
  jsonLdErrors: [],
  missingAlt: [],
  insecureSelfLinks: []
};

const titleMap = new Map();
const descMap = new Map();

for (const file of walk(DEPLOY)) {
  const rel = path.relative(DEPLOY, file).replace(/\\/g, '/');
  const urlPath = '/' + rel.replace(/\.html$/, '').replace(/\/index$/, '');
  // Search-engine verification files are intentionally minimal.
  if (/^googled[0-9a-z]+\.html$/i.test(rel)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const noindex = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  report.pages++;
  if (noindex) continue;

  // 1. duplicate ids
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((m) => m[1]);
  const seen = new Set();
  const dupes = new Set();
  for (const id of ids) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  if (dupes.size) report.duplicateIds.push({ page: urlPath, ids: [...dupes] });

  // 2. internal links
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/g)].map((m) => m[1]);
  const broken = [...new Set(hrefs.filter((h) => !resolves(h)))];
  if (broken.length) report.brokenLinks.push({ page: urlPath, hrefs: broken.slice(0, 6) });

  // 3. title / description
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
  const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [])[1];
  if (!title || !title.trim()) report.titleIssues.push({ page: urlPath, issue: 'missing' });
  else {
    const t = title.replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    if (!titleMap.has(t)) titleMap.set(t, []);
    titleMap.get(t).push(urlPath);
    if (t.length > 60) report.titleIssues.push({ page: urlPath, issue: 'long', len: t.length, title: t });
    if (t.length < 15) report.titleIssues.push({ page: urlPath, issue: 'short', len: t.length, title: t });
  }
  if (!desc || !desc.trim()) report.descIssues.push({ page: urlPath, issue: 'missing' });
  else {
    const d = desc.replace(/\s+/g, ' ').trim();
    if (!descMap.has(d)) descMap.set(d, []);
    descMap.get(d).push(urlPath);
    if (d.length > 160) report.descIssues.push({ page: urlPath, issue: 'long', len: d.length });
    if (d.length < 70) report.descIssues.push({ page: urlPath, issue: 'short', len: d.length });
  }

  // 4. h1 count
  const h1s = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1s !== 1) report.h1Issues.push({ page: urlPath, h1s });

  // 5. canonical
  const canonical = (html.match(/rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || [])[1];
  if (canonical) {
    const want = SITE + (urlPath === '/index' ? '/' : urlPath);
    const a = canonical.replace(/\/$/, '');
    const b = want.replace(/\/$/, '');
    if (a !== b) report.canonicalMismatch.push({ page: urlPath, canonical });
  }

  // 6. JSON-LD
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(m[1]);
    } catch (e) {
      report.jsonLdErrors.push({ page: urlPath, error: e.message.slice(0, 80) });
    }
  }

  // 7. images without alt
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const noAlt = imgs.filter((tag) => !/\salt=/.test(tag));
  if (noAlt.length) report.missingAlt.push({ page: urlPath, count: noAlt.length });

  // 8. http:// links to our own domain
  if (/href=["']http:\/\/calcpromaster\.com/i.test(html)) report.insecureSelfLinks.push({ page: urlPath });
}

const dupTitles = [...titleMap.entries()].filter(([, pages]) => pages.length > 1);
const dupDescs = [...descMap.entries()].filter(([, pages]) => pages.length > 1);

const summary = {
  pages: report.pages,
  duplicateIds: report.duplicateIds.length,
  brokenLinks: report.brokenLinks.length,
  titleIssues: report.titleIssues.length,
  duplicateTitles: dupTitles.length,
  descIssues: report.descIssues.length,
  duplicateDescs: dupDescs.length,
  h1Issues: report.h1Issues.length,
  canonicalMismatch: report.canonicalMismatch.length,
  jsonLdErrors: report.jsonLdErrors.length,
  missingAlt: report.missingAlt.length,
  insecureSelfLinks: report.insecureSelfLinks.length
};

if (JSON_OUT) {
  console.log(JSON.stringify({ summary, ...report, duplicateTitles: dupTitles, duplicateDescs: dupDescs }, null, 2));
} else {
  console.log('pages scanned:', summary.pages);
  console.log(summary);
  const show = (label, rows, fmt) => {
    if (!rows.length) return;
    console.log('\n=== ' + label);
    rows.slice(0, LIMIT).forEach((r) => console.log('  ' + fmt(r)));
    if (rows.length > LIMIT) console.log('  … ' + (rows.length - LIMIT) + ' more');
  };
  show('DUPLICATE IDS', report.duplicateIds, (r) => r.page + ' :: ' + r.ids.join(', '));
  show('BROKEN INTERNAL LINKS', report.brokenLinks, (r) => r.page + ' -> ' + r.hrefs.join(', '));
  show('TITLE ISSUES', report.titleIssues, (r) => r.page + ' :: ' + r.issue + ' ' + (r.len || '') + ' ' + (r.title || ''));
  show('DUPLICATE TITLES', dupTitles, (r) => r[0].slice(0, 70) + ' :: ' + r[1].length + ' pages');
  show('DESCRIPTION ISSUES', report.descIssues, (r) => r.page + ' :: ' + r.issue + ' ' + (r.len || ''));
  show('DUPLICATE DESCRIPTIONS', dupDescs, (r) => r[0].slice(0, 70) + ' :: ' + r[1].length + ' pages');
  show('H1 COUNT != 1', report.h1Issues, (r) => r.page + ' :: ' + r.h1s);
  show('CANONICAL MISMATCH', report.canonicalMismatch, (r) => r.page + ' -> ' + r.canonical);
  show('JSON-LD PARSE ERRORS', report.jsonLdErrors, (r) => r.page + ' :: ' + r.error);
  show('IMAGES WITHOUT ALT', report.missingAlt, (r) => r.page + ' :: ' + r.count);
  show('HTTP SELF LINKS', report.insecureSelfLinks, (r) => r.page);
}

const hardErrors = report.duplicateIds.length + report.brokenLinks.length +
  report.h1Issues.length + report.canonicalMismatch.length + report.jsonLdErrors.length +
  report.missingAlt.length + report.insecureSelfLinks.length;
if (hardErrors > 0) process.exitCode = 1;
