#!/usr/bin/env node
/**
 * Quality Gate — sitemap eligibility check
 * A URL is sitemap-eligible only if ALL pass:
 *   1. Prerendered static file exists (HTTP 200 equivalent)
 *   2. <link rel="canonical"> present and self-canonical
 *   3. No noindex in meta robots
 *   4. Exactly one real <h1> (markup, not JS strings)
 *   5. Unique title (site-wide)
 *   6. Meaningful meta description (>= 70 chars)
 *   7. Meaningful crawlable content (>= 300 words visible text)
 *   8. Formula QA contract exists and is PASS or NOT APPLICABLE
 * Exits 1 if any page fails, so CI/build can block promotion.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const EXCLUDE_DIRS = new Set(['js', 'css', 'fonts', 'assets', 'docs', 'admin']);
const MIN_WORDS = 300;

function stripNoise(html) {
  // Remove inline <script> and <style> so JS strings don't count as content/headings
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
}

function visibleWords(html) {
  const clean = stripNoise(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean ? clean.split(' ').length : 0;
}

function realH1Count(html) {
  return (stripNoise(html).match(/<h1[\s>]/gi) || []).length;
}

function collect(dir, base, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(DEPLOY, full).split(path.sep).join('/');
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      collect(full, base, files);
    } else if (entry.name === 'index.html') {
      files.push(path.dirname(rel));
    }
  }
}

// 1. Load sitemap URLs
const sitemap = fs.readFileSync(path.join(DEPLOY, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
// Domain — SINGLE SOURCE OF TRUTH: js/site-config.js (`domain:` field), same
// approach as scripts/ssg-pages.cjs. Keeps the gate working after a custom-
// domain switch (a pinned literal here made every URL "fail" post-flip).
let CONFIGURED_BASE = 'https://calcpromaster.netlify.app';
try {
  const cfg = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
  const m = cfg.match(/domain:\s*'([^']+)'/);
  if (m && m[1]) CONFIGURED_BASE = 'https://' + m[1].replace(/^https?:\/\//, '');
} catch (e) { /* fall back to default literal */ }
const BASE = CONFIGURED_BASE;
const sitemapPaths = new Set(sitemapUrls.map(u => u.replace(BASE, '').replace(/\/$/, '') || '/'));

// 2. Load QA contracts
let qaMap = new Map();
try {
  const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'qa-contracts.json'), 'utf8'));
  const arr = Array.isArray(c) ? c : (c.contracts || c.calculators || []);
  arr.forEach(x => qaMap.set(x.calculatorId || x.id, x.verificationStatus || x.status || 'UNKNOWN'));
} catch (e) { console.warn('warn: qa-contracts.json unreadable — QA gate skipped:', e.message); }

// 3. Collect prerendered pages
const pages = [];
collect(DEPLOY, DEPLOY, pages);

// 4. Check every sitemap URL against the gate
const failures = [];
let checked = 0;
for (const p of sitemapPaths) {
  if (p === '/') continue; // homepage checked separately
  const rel = p.replace(/^\//, '');
  const file = path.join(DEPLOY, rel, 'index.html');
  const fileAlt = path.join(DEPLOY, rel + '.html');
  const htmlPath = fs.existsSync(file) ? file : (fs.existsSync(fileAlt) ? fileAlt : null);
  if (!htmlPath) { failures.push({ url: p, reason: 'no static file (would be soft-404)' }); continue; }
  checked++;
  const html = fs.readFileSync(htmlPath, 'utf8');
  const problems = [];

  // canonical
  const canon = html.match(/<link rel="canonical" href="([^"]+)"/);
  if (!canon) problems.push('missing canonical');
  else {
    const canonPath = canon[1].replace(BASE, '').replace(/\/$/, '') || '/';
    if (canonPath !== p) problems.push('canonical mismatch: ' + canonPath);
  }

  // noindex
  const robots = html.match(/<meta name="robots" content="([^"]*)"/);
  if (robots && /noindex/i.test(robots[1])) problems.push('noindex present');

  // single real H1
  const h1 = realH1Count(html);
  if (h1 === 0) problems.push('no crawlable H1');
  if (h1 > 1) problems.push(h1 + ' crawlable H1s');

  // description
  const desc = html.match(/<meta name="description" content="([^"]*)"/);
  if (!desc || desc[1].length < 70) problems.push('thin/missing meta description');

  // content depth
  const words = visibleWords(html);
  if (words < MIN_WORDS) problems.push('thin content: ' + words + ' words < ' + MIN_WORDS);

  // QA contract (tool pages only: cat/id shape, excluding guides + hub sections)
  const parts = rel.split('/');
  if (parts.length === 2 && qaMap.size && !['guides', 'hub', 'blog'].includes(parts[0])) {
    const st = qaMap.get(parts[1]);
    if (!st) problems.push('no QA contract');
    else if (st !== 'PASS' && st !== 'NOT APPLICABLE') problems.push('QA status: ' + st);
  }

  if (problems.length) failures.push({ url: p, reason: problems.join('; ') });
}

// 5. Unique titles across all pages
const titles = new Map();
for (const p of pages) {
  const f = path.join(DEPLOY, p, 'index.html');
  const html = fs.readFileSync(f, 'utf8');
  const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  if (!t) continue;
  if (titles.has(t)) failures.push({ url: '/' + p, reason: 'duplicate title with /' + titles.get(t) });
  else titles.set(t, p);
}

// Report
console.log('==========================================');
console.log(' QUALITY GATE — sitemap eligibility');
console.log('==========================================');
console.log('sitemap URLs:', sitemapUrls.length);
console.log('prerendered pages checked:', checked);
console.log('unique titles verified:', titles.size);
console.log('failures:', failures.length);
if (failures.length) {
  console.log('------------------------------------------');
  failures.slice(0, 30).forEach(f => console.log('✗ ' + f.url + ' — ' + f.reason));
  if (failures.length > 30) console.log('… and ' + (failures.length - 30) + ' more');
  process.exit(1);
}
console.log('✅ PASS — every sitemap URL meets the quality gate');
