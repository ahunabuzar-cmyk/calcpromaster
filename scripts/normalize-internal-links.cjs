#!/usr/bin/env node
// Trailing-slash normalizer for SOURCE templates & data.
//
// Cloudflare Pages serves <dir>/index.html at /<dir>/ (bare /<dir> is a 3xx)
// and <name>.html at /<name> (a trailing slash would 3xx/404). This rewrites
// every internal href in the source files to the form the server actually
// answers with 200, using deploy/ as the source of truth for which paths are
// directories vs flat files. Idempotent.
//
//   node scripts/normalize-internal-links.cjs            # apply
//   node scripts/normalize-internal-links.cjs --dry-run  # report only
//
// Run BEFORE `node build-deploy.js` so split-seo/SSG bake the corrected hrefs.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const DRY = process.argv.includes('--dry-run');

if (!fs.existsSync(DEPLOY)) {
  console.error('deploy/ not found — run `node build-deploy.js` first (route map source).');
  process.exit(1);
}

// ---------- route map ----------
const dirRoutes = new Set();
const flatRoutes = new Set();
(function index(dir, urlPath) {
  for (const e of fs.readdirSync(dir)) {
    const p = path.join(dir, e);
    const st = fs.statSync(p);
    if (st.isDirectory()) index(p, urlPath + e + '/');
    else if (e === 'index.html') dirRoutes.add(urlPath);
    else if (e.endsWith('.html')) flatRoutes.add(urlPath + e.replace(/\.html$/, ''));
  }
})(DEPLOY, '/');

// ---------- target source files ----------
const EXCLUDE_DIRS = new Set(['deploy', 'node_modules', '.git', 'docs', 'reels', 'tests', 'fonts', '.well-known']);
const targets = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir)) {
    const p = path.join(dir, e);
    const rel = path.relative(ROOT, p);
    const st = fs.statSync(p);
    if (st.isDirectory()) { if (!EXCLUDE_DIRS.has(e) && !e.startsWith('.')) walk(p); continue; }
    if (st.size > 12 * 1024 * 1024) continue; // skip giant bundles we don't edit
    if (!/\.(html|js)$/.test(e)) continue;
    if (e.endsWith('.min.js')) continue;
    targets.push(p);
  }
})(ROOT);

const HREF_RE = /href=(\\?["'])(\/[^"'\\\s>]*)\1/g;

function fixUrl(url) {
  if (!url.startsWith('/') || url.startsWith('//')) return null;
  const hashIdx = url.search(/[?#]/);
  const suffix = hashIdx >= 0 ? url.slice(hashIdx) : '';
  const p = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  if (p === '/' || p === '') return null;
  if (/\.[a-z0-9]{2,5}$/i.test(p)) return null; // asset / .html — leave as-is
  const noSlash = p.replace(/\/+$/, '');
  const withSlash = noSlash + '/';
  let next = p;
  if (dirRoutes.has(withSlash)) next = withSlash;        // directory wins
  else if (flatRoutes.has(noSlash)) next = noSlash;      // else flat
  else return null;                                      // unknown route — leave
  if (next === p) return null;
  return next + suffix;
}

let filesTouched = 0;
const changes = [];
for (const file of targets) {
  const before = fs.readFileSync(file, 'utf8');
  let count = 0;
  const after = before.replace(HREF_RE, (full, quote, url) => {
    const fixed = fixUrl(url);
    if (!fixed) return full;
    count++;
    if (changes.length < 40) changes.push(path.relative(ROOT, file) + '  ' + url + '  →  ' + fixed);
    return 'href=' + quote + fixed + quote;
  });
  if (count) {
    filesTouched++;
    if (!DRY) fs.writeFileSync(file, after, 'utf8');
  }
}

console.log((DRY ? '[dry-run] ' : '') + 'normalize-internal-links: ' + filesTouched + ' file(s), ' + changes.length + '+ link(s) normalized');
for (const c of changes) console.log('  ' + c);
