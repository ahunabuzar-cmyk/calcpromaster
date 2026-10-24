#!/usr/bin/env node
// Internal-link trailing-slash auditor (Sitechecker parity).
//
// Cloudflare Pages serves:
//   <dir>/index.html  →  /<dir>/          (redirects /<dir> → /<dir>/ , a 3xx)
//   <name>.html       →  /<name>          (flat "pretty" URL, no slash)
//
// So an internal <a href> to a directory route WITHOUT the trailing slash is an
// "internal link to a 3xx page" (and a "trailing slash mismatch" redirect). This
// walks every generated page under deploy/ and reports:
//   - DIR_NO_SLASH : href points at a directory route but has no trailing slash
//   - FLAT_SLASH   : href points at a flat file route but carries a trailing slash
// Exit code 1 if any leak is found, so it can gate CI alongside the other checks.
//
// Usage: node scripts/audit-internal-links.cjs [--json]

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const JSON_OUT = process.argv.includes('--json');

if (!fs.existsSync(DEPLOY)) {
  console.error('deploy/ not found — run `node build-deploy.js` first.');
  process.exit(1);
}

// 1. Index the deploy tree so we know which routes are directories vs flat files.
const dirRoutes = new Set();   // '/finance/', '/finance/loan-emi/'
const flatRoutes = new Set();  // '/about', '/graph'
(function index(dir, urlPath) {
  for (const e of fs.readdirSync(dir)) {
    const p = path.join(dir, e);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      index(p, urlPath + e + '/');
    } else if (e === 'index.html') {
      dirRoutes.add(urlPath);
    } else if (e.endsWith('.html')) {
      // Root-level flat pages are served at /name; nested .html also pretty-print
      flatRoutes.add(urlPath + e.replace(/\.html$/, ''));
    }
  }
})(DEPLOY, '/');

// 1b. Actual files present in deploy/ (for asset / broken-link checks).
const files = new Set();
(function indexFiles(dir, urlPath) {
  for (const e of fs.readdirSync(dir)) {
    const p = path.join(dir, e);
    const st = fs.statSync(p);
    if (st.isDirectory()) { indexFiles(p, urlPath + e + '/'); continue; }
    files.add(urlPath + e);
  }
})(DEPLOY, '/');

// 2. Walk every HTML page, extract internal hrefs, classify mismatches + 404s.
const HREF_RE = /<a\b[^>]*\bhref="([^"]+)"/gi;
const issues = [];
const broken = [];
let pages = 0, links = 0;

(function walk(dir) {
  for (const e of fs.readdirSync(dir)) {
    const p = path.join(dir, e);
    const st = fs.statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (e !== 'index.html' && !e.endsWith('.html')) continue;
    pages++;
    const html = fs.readFileSync(p, 'utf8');
    const pageUrl = '/' + path.relative(DEPLOY, p).replace(/\\/g, '/').replace(/index\.html$/, '');
    let m;
    HREF_RE.lastIndex = 0;
    while ((m = HREF_RE.exec(html))) {
      let href = m[1];
      if (!href.startsWith('/') || href.startsWith('//')) continue; // external/protocol-relative
      href = href.split(/[?#]/)[0];
      if (href === '' || href === '/') continue;
      links++;
      const hasSlash = href.endsWith('/');
      const asDir = hasSlash ? href : href + '/';
      const asFlat = href.replace(/\/$/, '');
      if (!hasSlash && dirRoutes.has(asDir) && !flatRoutes.has(href)) {
        issues.push({ page: pageUrl, href, kind: 'DIR_NO_SLASH' });
      } else if (hasSlash && flatRoutes.has(asFlat) && !dirRoutes.has(href)) {
        issues.push({ page: pageUrl, href, kind: 'FLAT_SLASH' });
      } else {
        // No slash-mismatch — verify the target actually exists (else it is a 404).
        const ok = hasSlash
          ? dirRoutes.has(href)
          : (files.has(href) || flatRoutes.has(href) || dirRoutes.has(href + '/'));
        if (!ok) broken.push({ page: pageUrl, href });
      }
    }
  }
})(DEPLOY);

if (JSON_OUT) {
  console.log(JSON.stringify({ pages, links, issues: issues.length, broken: broken.length, sample: issues.slice(0, 50), brokenSample: broken.slice(0, 50) }, null, 2));
} else {
  console.log('Internal-link trailing-slash audit');
  console.log('  pages scanned : ' + pages);
  console.log('  internal links: ' + links);
  console.log('  mismatches    : ' + issues.length);
  const byKind = {};
  for (const i of issues) byKind[i.kind] = (byKind[i.kind] || 0) + 1;
  for (const k of Object.keys(byKind)) console.log('    ' + k + ': ' + byKind[k]);
  for (const i of issues.slice(0, 30)) console.log('    ' + i.kind + '  ' + i.href + '  on ' + i.page);
  if (issues.length > 30) console.log('    … +' + (issues.length - 30) + ' more');
  // De-dup broken targets (same href on many pages) for a readable summary.
  const uniqBroken = [...new Set(broken.map(b => b.href))];
  console.log('  broken (404) targets: ' + uniqBroken.length + ' unique / ' + broken.length + ' links');
  for (const h of uniqBroken.slice(0, 30)) console.log('    MISSING  ' + h);
  if (uniqBroken.length > 30) console.log('    … +' + (uniqBroken.length - 30) + ' more');
  const ok = !issues.length && !broken.length;
  console.log(ok ? '✅ PASS — every internal href resolves, no slash mismatch' : '❌ FAIL — internal links mismatch or 404');
}
// Fail hard: exit 1 either way (aborts the build when required). On success,
// only exit when run directly so any later build steps still run.
if (issues.length || broken.length) process.exit(1);
if (require.main === module) process.exit(0);
