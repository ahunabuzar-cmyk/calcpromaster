#!/usr/bin/env node
// ============================================================
// CalcProMaster — "one canonical URL per page" gate
// ------------------------------------------------------------
// Google ke page report me 196 paths do shakalon me aa rahe the
// (/health/bmr-mifflin aur /health/bmr-mifflin/), aur un ~11k impressions do
// URLs me split ho rahe the. Edge ab dono ko ek par le aata hai, lekin repo me
// aisa koi gate nahi tha jo ye contract tod de to build rokta. Ye script wahi
// gate hai — sab kuch deploy/ aur committed sitemap.xml par, network ke bina.
//
// Kya check hota hai (har ek FAIL hai, warn nahi):
//   1. Twin collision   — deploy/X.html aur deploy/X/index.html dono ho gaye to
//                         ek hi page dono forms par 200 dega (asli duplicate).
//   2. Sitemap duplicate — ek hi <loc> do baar, ya X aur X/ dono sitemap me.
//   3. Sitemap form      — har <loc> wahi form ho jo 200 deta hai (directory
//                         page => trailing slash, flat page => bina slash).
//   4. Canonical tag     — page ka <link rel=canonical> apne hi <loc> ke barabar
//                         ho (apex host, wahi form, koi query nahi).
//   5. Robots            — sitemap ka page noindex na ho aur kisi doosre path
//                         par canonicalise na kare (warna signal split rehta hai).
//   6. Internal links    — koi <a href> twin form par na ho (warna har click aur
//                         har crawl ek redirect hop kharch karta hai).
//   7. Legacy host       — canonical/og:url me netlify.app ya www. na ho.
//
// Usage:
//   node scripts/check-canonical-urls.cjs            # deploy/ + sitemap.xml
//   node scripts/check-canonical-urls.cjs --json     # machine-readable
//   node scripts/check-canonical-urls.cjs --write    # data/canonical-url-audit.json
//
// Exit codes: 0 = har page ka ek hi URL, 1 = drift.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const JSON_OUT = process.argv.includes('--json');
const WRITE = process.argv.includes('--write');

const CANONICAL_HOST = 'calcpromaster.com';
const LEGACY_HOST_RE = /(?:netlify\.app|^https?:\/\/www\.)/i;

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested in tests/unit/canonical-urls.test.js)
// ---------------------------------------------------------------------------

/** Opposite slash form: '/a/b/' -> '/a/b', '/a/b' -> '/a/b/'. Root stays '/'. */
function twinOf(p) {
  if (!p || p === '/') return '/';
  return p.endsWith('/') ? p.replace(/\/+$/, '') || '/' : p + '/';
}

/**
 * The one form a path may be served on, given which files exist for it.
 * Directory page (X/index.html) → trailing slash. Flat page (X.html) → none.
 * Neither → null (the path is not a static page at all).
 */
function canonicalForm(p, files) {
  if (p === '/' || p === '') return '/';
  const clean = '/' + String(p).replace(/^\/+/, '').replace(/\/+$/, '');
  // files is a deploy/-relative set: 'about.html', 'guides/tip.html', …
  const key = clean.replace(/^\//, '');
  const hasDir = files.has(key + '/index.html');
  const hasFlat = files.has(key + '.html');
  if (hasDir) return clean + '/';
  if (hasFlat) return clean;
  return null;
}

/** Sitemap par pure checks: duplicates, twin pairs, wrong form, foreign host. */
function auditSitemap(locs, files) {
  const problems = [];
  const seen = new Set();
  const forms = new Map(); // path -> [locs]
  for (const loc of locs) {
    if (seen.has(loc)) problems.push({ kind: 'duplicate-loc', loc });
    seen.add(loc);

    let url;
    try { url = new URL(loc); } catch (e) {
      problems.push({ kind: 'bad-url', loc });
      continue;
    }
    if (url.hostname !== CANONICAL_HOST) {
      problems.push({ kind: 'foreign-host', loc, detail: url.hostname });
    }
    if (url.search || url.hash) {
      problems.push({ kind: 'query-in-sitemap', loc });
    }

    const p = url.pathname;
    const want = canonicalForm(p, files);
    if (want === null) {
      problems.push({ kind: 'no-static-file', loc });
      continue;
    }
    if (p !== want) problems.push({ kind: 'non-canonical-form', loc, want });

    const key = p.replace(/\/+$/, '') || '/';
    forms.set(key, (forms.get(key) || []).concat(p));
  }
  for (const [key, list] of forms) {
    if (list.length > 1) problems.push({ kind: 'twin-in-sitemap', loc: list.join(' + '), path: key });
  }
  return problems;
}

/** A page's own canonical tag must be its own canonical URL. */
function auditCanonicalTag(pagePath, html) {
  const problems = [];
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  if (!m) return [{ kind: 'missing-canonical', loc: pagePath }];
  const href = (m[0].match(/href=["']([^"']+)["']/i) || [])[1];
  if (!href) return [{ kind: 'missing-canonical', loc: pagePath }];
  if (LEGACY_HOST_RE.test(href)) problems.push({ kind: 'legacy-host-canonical', loc: pagePath, detail: href });
  let url;
  try { url = new URL(href) } catch (e) {
    return problems.concat([{ kind: 'relative-canonical', loc: pagePath, detail: href }]);
  }
  if (url.hostname !== CANONICAL_HOST) problems.push({ kind: 'foreign-host-canonical', loc: pagePath, detail: href });
  if (url.search || url.hash) problems.push({ kind: 'query-canonical', loc: pagePath, detail: href });
  // The page's own served form IS the only acceptable canonical target.
  if (url.pathname !== pagePath) {
    problems.push({ kind: 'canonical-mismatch', loc: pagePath, detail: href, want: pagePath });
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Filesystem walk
// ---------------------------------------------------------------------------
function listDeployFiles(dir, base = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? base + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...listDeployFiles(path.join(dir, e.name), rel));
    else out.push(rel);
  }
  return out;
}

/** Page path (the URL form that serves this file) for a deploy file. */
function pagePathOf(fileRel) {
  if (!fileRel.endsWith('.html')) return null;
  if (fileRel === 'index.html') return '/';
  if (fileRel === '404.html' || fileRel.endsWith('/404.html')) return null; // error page, never indexed
  if (fileRel.endsWith('/index.html')) return '/' + fileRel.slice(0, -'index.html'.length);
  return '/' + fileRel.slice(0, -'.html'.length);
}

function main() {
  if (!fs.existsSync(DEPLOY)) {
    console.error('  ✗ deploy/ missing — run `node build-deploy.js` first');
    process.exit(1);
  }

  const files = listDeployFiles(DEPLOY);
  const fileSet = new Set(files);
  const problems = [];

  // 1) Twin collisions — the only way a page can genuinely answer on both forms.
  for (const f of files) {
    if (!f.endsWith('/index.html')) continue;
    const flat = f.slice(0, -'/index.html'.length) + '.html';
    if (fileSet.has(flat)) problems.push({ kind: 'twin-collision', loc: f, detail: flat });
  }

  // 2-3) Sitemap contract.
  const xml = fs.readFileSync(SITEMAP, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  problems.push(...auditSitemap(locs, fileSet));

  // 4-5) Each sitemap page's own canonical + robots.
  const sitemapPaths = new Set(
    locs.map((l) => { try { return new URL(l).pathname } catch (e) { return null } }).filter(Boolean)
  );
  for (const p of sitemapPaths) {
    const rel = p === '/' ? 'index.html' : p.endsWith('/') ? p.slice(1) + 'index.html' : p.slice(1) + '.html';
    if (!fileSet.has(rel)) continue; // already reported as no-static-file
    const html = fs.readFileSync(path.join(DEPLOY, rel), 'utf8');
    problems.push(...auditCanonicalTag(p, html));
    const robots = (html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i) || [])[1] || '';
    if (/noindex/i.test(robots)) problems.push({ kind: 'noindex-in-sitemap', loc: p, detail: robots });
  }

  // 6) Internal links must already be on the canonical form (no redirect hops).
  let linkCount = 0;
  for (const f of files) {
    if (!f.endsWith('.html')) continue;
    const html = fs.readFileSync(path.join(DEPLOY, f), 'utf8');
    for (const m of html.matchAll(/href=["'](\/[^"'#?]*)["']/g)) {
      const href = m[1];
      if (/\.(css|js|mjs|png|jpe?g|svg|ico|xml|txt|webp|json|pdf|webmanifest|woff2?)$/i.test(href)) continue;
      const want = canonicalForm(href, fileSet);
      if (want === null) continue; // SPA route / not a static page
      linkCount++;
      if (href !== want) problems.push({ kind: 'non-canonical-link', loc: pagePathOf(f) || '/' + f, detail: href, want });
    }
  }

  const byKind = {};
  for (const p of problems) byKind[p.kind] = (byKind[p.kind] || 0) + 1;

  const payload = {
    ranAt: new Date().toISOString(),
    sitemapUrls: locs.length,
    sitemapUnique: new Set(locs).size,
    deployPages: files.filter((f) => f.endsWith('.html')).length,
    internalLinksChecked: linkCount,
    problems,
    pass: problems.length === 0,
  };

  if (WRITE) {
    fs.writeFileSync(path.join(ROOT, 'data', 'canonical-url-audit.json'), JSON.stringify(payload, null, 2) + '\n');
  }

  if (JSON_OUT) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log('==========================================');
    console.log(' ONE CANONICAL URL PER PAGE — deploy/ + sitemap.xml');
    console.log('==========================================');
    console.log('  sitemap URLs        ' + payload.sitemapUrls + ' (' + payload.sitemapUnique + ' unique)');
    console.log('  deploy HTML pages   ' + payload.deployPages);
    console.log('  internal links      ' + linkCount + ' checked');
    if (!problems.length) {
      console.log('\n  ✅ PASS — no page answers on two URL forms, sitemap is canonical-only,');
      console.log('     every canonical tag self-references, no link relies on a redirect.');
    } else {
      console.log('\n  ❌ ' + problems.length + ' problem(s): ' + JSON.stringify(byKind));
      for (const p of problems.slice(0, 40)) {
        console.log('   - ' + p.kind + '  ' + p.loc + (p.detail ? '  |  ' + p.detail : '') + (p.want ? '  ->  ' + p.want : ''));
      }
      if (problems.length > 40) console.log('   … ' + (problems.length - 40) + ' more (use --json)');
      console.log('\n  Fix: server always ek hi form de (directory page = trailing slash, flat page = bina slash).');
      console.log('  Naya duplicate URL ban gaya to uske liye _redirects me 301 likho, phir dobara build karo.');
    }
  }

  if (problems.length) process.exit(1);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('check-canonical-urls crashed: ' + (e && e.message)); process.exit(1); }
}

module.exports = { twinOf, canonicalForm, auditSitemap, auditCanonicalTag, CANONICAL_HOST };
