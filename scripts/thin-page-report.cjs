#!/usr/bin/env node
// ============================================================
// CalcProMaster — Thin-page report (measurable, reproducible)
// ------------------------------------------------------------
// GSC's "Crawled - currently not indexed" bucket is the only signal
// Google gives about pages it crawled and then judged not worth
// indexing. Its coverage export holds COUNTS ONLY (no URL list), so
// the actionable proxy is our own thinnest INDEXABLE pages.
//
// This script turns "thin pages" into a number we can drive to zero:
//   - walks the built deploy/ tree for real HTML pages
//   - skips noindex pages, non-HTML verification files, /embed/ widgets
//     and legal disclaimers (documented short-by-design)
//   - counts visible words (script/style/comments/tags stripped)
//   - joins the internal link graph so each hit shows its inlink count
//     (a thin page with 700 inlinks is a much bigger deal than one with 3)
//
// Output: data/thin-pages.json · docs/THIN-PAGES-REPORT.md
// Usage:  node scripts/thin-page-report.cjs [--threshold 500] [--json]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const OUT_JSON = path.join(ROOT, 'data', 'thin-pages.json');
const OUT_MD = path.join(ROOT, 'docs', 'THIN-PAGES-REPORT.md');

const argOf = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const THRESHOLD = Number(argOf('--threshold', 500));
const JSON_OUT = process.argv.includes('--json');

// Directories that are not indexable content pages.
const SKIP_DIRS = new Set(['embed', 'assets', 'js', 'css', 'images', 'og', 'fonts', '.well-known', 'icons']);

// Short by design: legal/utility pages whose length is not a ranking signal,
// verified page by page in docs/THIN-PAGES-REPORT.md.
// Deployed root pages keep their .html suffix on disk while their canonical URL
// does not, so every pattern tolerates both forms.
const EXCLUDE_PATH = [
  /^\/disclaimer-[a-z-]+(\.html)?$/,       // legal disclaimers — short on purpose
  /^\/cookies(\.html)?$/,                  // already noindex
  /^\/privacy(\.html)?$/,                  // legal policy page
  /^\/terms(\.html)?$/,                    // legal policy page
  /^\/contact(\.html)?$/,                  // contact form page, not prose
  /^\/editorial-policy(\.html)?$/,         // policy page, kept deliberately short
  /^\/goog[0-9a-z]+\.html$/i               // Google site-verification file (not HTML at all)
];

// ---------- pure helpers (unit-tested) ----------

function visibleWords(html) {
  const text = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.split(' ').length : 0;
}

function isHtmlDoc(html) {
  return /^\s*(<!doctype html|<html)/i.test(String(html));
}

function isNoindex(html) {
  // Attribute order is not guaranteed, so check the tag rather than a pattern
  // that fixes name before content.
  const metas = String(html).match(/<meta\b[^>]*>/gi) || [];
  return metas.some(
    (m) => /name\s*=\s*["']?robots/i.test(m) && /content\s*=\s*["'][^"']*noindex/i.test(m)
  );
}

function isExcludedPath(p) {
  return EXCLUDE_PATH.some((re) => re.test(p));
}

// A page that is short but already carries an FAQ section and several
// subheadings has a focused-guide shape — the remaining shortfall is word
// count, not structure. "Bare" pages (short with no FAQ, one heading or none)
// are the ones that genuinely look thin to a crawler.
function hasFaqSection(html) {
  return /<h2[^>]*>\s*(FAQ|Frequently asked questions)/i.test(String(html));
}

function h2Count(html) {
  return (String(html).match(/<h2[^>]*>/gi) || []).length;
}

// Decide the status of one deployed page. Returns null when the page is out of
// scope (not HTML, noindex, excluded) rather than a row.
function classify(pathname, html, opts) {
  const threshold = (opts && opts.threshold) || THRESHOLD;
  const h = String(html || '');
  if (!isHtmlDoc(h)) return null;
  if (isExcludedPath(pathname)) return null;
  if (isNoindex(h)) return null;
  const words = visibleWords(h);
  const faq = hasFaqSection(h);
  const h2s = h2Count(h);
  const thin = words < threshold;
  return { path: pathname, words, thin, faq, h2s, shape: thin ? (faq && h2s >= 2 ? 'focused' : 'bare') : 'ok' };
}

function summarize(rows, threshold) {
  const thin = rows.filter((r) => r.thin);
  return {
    threshold,
    pages: rows.length,
    thin: thin.length,
    bare: thin.filter((r) => r.shape === 'bare').length,
    thinnest: thin.length ? Math.min(...thin.map((r) => r.words)) : null,
    rows: thin.sort((a, b) => a.words - b.words || a.path.localeCompare(b.path))
  };
}

// ---------- I/O ----------

function loadPages() {
  const pages = {};
  if (!fs.existsSync(DEPLOY)) return pages;
  (function walk(dir, urlPath) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        walk(full, urlPath + e.name + '/');
      } else if (e.name === 'index.html') {
        pages[urlPath] = fs.readFileSync(full, 'utf8');
      } else if (e.name.endsWith('.html')) {
        pages[urlPath + e.name] = fs.readFileSync(full, 'utf8');
      }
    }
  })(DEPLOY, '/');
  return pages;
}

// Inlink counts over EVERY internal href (tool pages, guides, blog, root pages)
// so a thin page can be ranked by how much of the site depends on it.
function buildInlinks(pages) {
  const keys = new Set(Object.keys(pages));
  const counts = {};
  const resolve = (href) => {
    let p = String(href || '').split('#')[0].split('?')[0].replace(/^https?:\/\/[^/]+/, '');
    if (!p.startsWith('/')) return null;
    p = p.replace(/\/+$/, '') || '/';
    for (const cand of [p + '/', p + '.html', p]) if (keys.has(cand)) return cand;
    return null;
  };
  for (const [src, html] of Object.entries(pages)) {
    const seen = new Set();
    const re = /href="([^"]+)"/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const t = resolve(m[1]);
      if (!t || t === src || seen.has(t)) continue;
      seen.add(t);
      counts[t] = (counts[t] || 0) + 1;
    }
  }
  return counts;
}

function renderMarkdown(rep, meta) {
  const L = [];
  L.push('# Thin-page report — indexable pages under ' + rep.threshold + ' words');
  L.push('');
  L.push('**Generated:** ' + String(meta.ranAt).slice(0, 10) + ' · by `node scripts/thin-page-report.cjs`');
  L.push('**Scope:** every real HTML page in the built `deploy/` tree, minus noindex pages, `/embed/` widgets,');
  L.push('non-HTML verification files and the legal disclaimer pages.');
  L.push('');
  L.push('## Result');
  L.push('');
  L.push('| | Count |');
  L.push('|---|---|');
  L.push('| Indexable HTML pages scanned | ' + rep.pages + ' |');
  L.push('| Under ' + rep.threshold + ' words | **' + rep.thin + '** |');
  L.push('| &nbsp;&nbsp;…of those, **bare** (short *and* no FAQ section) | **' + rep.bare + '** |');
  L.push('| &nbsp;&nbsp;…of those, focused guides (short but already FAQ + subheadings) | ' + (rep.thin - rep.bare) + ' |');
  if (rep.thinnest !== null) L.push('| Thinnest page | ' + rep.thinnest + ' words |');
  L.push('');
  if (!rep.thin) {
    L.push('✅ **No thin indexable pages left** at this threshold.');
  } else {
    L.push('| # | Page | Words | H2s | FAQ | Inlinks | Shape | Action |');
    L.push('|---|---|---|---|---|---|---|---|');
    rep.rows.forEach((r, i) => {
      const action = r.shape === 'bare'
        ? 'Needs work — add unique depth, FAQ + subheadings'
        : 'Focused guide: already structured, extend only if you have something real to add';
      L.push('| ' + (i + 1) + ' | `' + r.path + '` | ' + r.words + ' | ' + r.h2s + ' | ' + (r.faq ? 'yes' : 'no') + ' | ' + r.inlinks + ' | ' + r.shape + ' | ' + action + ' |');
    });
  }
  L.push('');
  L.push('## Why this is the right proxy for "Crawled - currently not indexed"');
  L.push('');
  L.push('GSC reports that bucket as a count with no URL list, so it cannot be mapped page by page.');
  L.push('What it *can* be matched against is the property Google keeps implicitly: pages it crawled and');
  L.push('judged too thin to index. Those show up here as the thinnest indexable pages, which is why this');
  L.push('report is the one to drive to zero rather than guessing at GSC\u2019s list.');
  L.push('');
  L.push('## Excluded by design');
  L.push('');
  L.push('| Path pattern | Why |');
  L.push('|---|---|');
  L.push('| `/disclaimer-*` | Legal disclaimers — short on purpose, no ranking intent |');
  L.push('| `/goog*.html` | Google site-verification files (plain text, not HTML) |');
  L.push('| `noindex` pages | Not candidates for indexing, so thinness is irrelevant |');
  L.push('| `/embed/*` | iframe widgets, deliberately minimal |');
  L.push('');
  L.push('## Reproduce');
  L.push('');
  L.push('```bash');
  L.push('node build-deploy.js                 # build deploy/ first');
  L.push('node scripts/thin-page-report.cjs    # this report');
  L.push('node scripts/thin-page-report.cjs --threshold 600   # stricter cut');
  L.push('```');
  L.push('');
  return L.join('\n');
}

function main() {
  const pages = loadPages();
  if (!Object.keys(pages).length) {
    console.error('✖ deploy/ khaali hai — pehle `node build-deploy.js` chalao.');
    process.exit(1);
  }
  const inlinks = buildInlinks(pages);
  const rows = [];
  for (const [p, html] of Object.entries(pages)) {
    const c = classify(p, html, { threshold: THRESHOLD });
    if (c) rows.push({ ...c, inlinks: inlinks[c.path] || 0 });
  }
  const rep = summarize(rows, THRESHOLD);
  const out = { ranAt: new Date().toISOString(), ...rep };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  fs.writeFileSync(OUT_MD, renderMarkdown(rep, out));

  if (JSON_OUT) { console.log(JSON.stringify({ pages: rep.pages, thin: rep.thin, thinnest: rep.thinnest }, null, 2)); return; }
  console.log('==========================================');
  console.log(' THIN-PAGE REPORT (indexable, <' + rep.threshold + ' words)');
  console.log('==========================================');
  console.log('pages scanned : ' + rep.pages);
  console.log('thin pages    : ' + rep.thin + '  (bare: ' + rep.bare + ', focused guides: ' + (rep.thin - rep.bare) + ')');
  if (rep.thinnest !== null) console.log('thinnest      : ' + rep.thinnest + ' words');
  for (const r of rep.rows.slice(0, 10)) console.log('  ' + String(r.words).padStart(5) + ' words  ' + String(r.inlinks).padStart(5) + ' inlinks  ' + r.shape.padEnd(8) + r.path);
  console.log('');
  console.log('💾 data/thin-pages.json · docs/THIN-PAGES-REPORT.md');
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('FAIL', e.message); process.exit(1); }
}

module.exports = { visibleWords, isHtmlDoc, isNoindex, isExcludedPath, hasFaqSection, h2Count, classify, summarize, buildInlinks, EXCLUDE_PATH };
