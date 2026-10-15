#!/usr/bin/env node
// ============================================================
// CalcProMaster — keyword implementation audit (B / C / D rows)
// ------------------------------------------------------------
// docs/KEYWORD-IMPLEMENTATION-MAP.md decides WHICH page owns each of the 115
// actionable keywords (B 28 · C 62 · D 7 · E 18), and every one of those rows
// carries the status "not implemented — decision recorded in this session, no
// page built yet". A decision is not an implementation, and no script checked
// whether the decision was even reachable: several B rows point at pages that
// cannot own the keyword (e.g. "yearly salary calculator" -> /lifestyle/parental-leave),
// and several point at no page at all.
//
// This audit takes each B/C/D row and resolves it against the BUILT tree — the
// HTML a crawler actually receives — then answers three questions per row:
//
//   1. does the target URL exist in the build?          (PAGE_MISSING)
//   2. does that page (title/meta/h1/slug + rendered
//      body copy) mention the concept tokens at all?    (WRONG_OWNER)
//   3. if it does, is every concept token present?      (NEEDS_META / COVERED)
//
// It never invents copy and never edits a page: it produces the work queue that
// says exactly which pages are safe to improve and which decisions were wrong.
// Every row is emitted — nothing is dropped, including the rows that resolve to
// nothing, because those are the ones that need a human decision.
//
// Usage: node scripts/audit-keyword-implementation.cjs [--json] [--fail-on-actionable]
// Exit:  0 (report) · 1 with --fail-on-actionable when a row needs work
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const G = require('./audit-keyword-gap.cjs');
const { sitemapDate } = require('./lib/sitemap-date.cjs');
const { MANUAL_TARGETS } = require('./lib/keyword-target-overrides.cjs');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const MAP = path.join(ROOT, 'data', 'keyword-implementation-map.json');
const OUT_JSON = path.join(ROOT, 'data', 'keyword-implementation-status.json');
const OUT_MD = path.join(ROOT, 'docs', 'KEYWORD-IMPLEMENTATION-STATUS.md');
const JSON_ONLY = process.argv.includes('--json');
const FAIL = process.argv.includes('--fail-on-actionable');
const GENERATED_FOR = sitemapDate(ROOT) || 'unknown';

// ---------- built-page metadata ----------
// Same source of truth as the crawler: the prerendered HTML in deploy/.
// /finance/cd-calculator/ ships as deploy/finance/cd-calculator/index.html;
// /guides/age ships as deploy/guides/age.html.
function readMeta(routePath) {
  const clean = routePath.replace(/^\/+|\/+$/g, '');
  const candidates = [
    path.join(DEPLOY, clean, 'index.html'),
    path.join(DEPLOY, clean + '.html'),
    path.join(DEPLOY, 'index.html'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
    const desc = (html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '';
    const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '';
    // Rendered body copy. The applier answers each keyword with a FAQ, which is
    // visible page text and mirrored into FAQPage JSON-LD — so a page can own a
    // keyword without mangling its title. Title/meta/h1/slug alone would report
    // those pages as still missing the keyword.
    const body = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40000);
    return {
      file: path.relative(ROOT, file).replace(/\\/g, '/'),
      title: title.trim().replace(/\s+/g, ' '),
      metaDesc: desc.trim().replace(/\s+/g, ' '),
      h1: h1.replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' '),
      body
    };
  }
  return null;
}

// ---------- token set of a page ----------
function pageTokens(meta, routePath) {
  const slugWords = routePath.replace(/[-/]/g, ' ');
  return new Set(G.keyTokens([meta.title, meta.metaDesc, meta.h1, slugWords, meta.body || ''].join(' ')));
}

// ---------- candidate index for the rows that recorded no target ----------
// 70 of the 97 B/C/D rows name no target page, so "improve the existing page"
// has nothing to act on. Rather than guess silently, index every built page's
// title + meta + slug once and rank candidates by how many of the keyword's
// concept tokens they already contain.
//
// The rule is deliberately ALL tokens and at least two of them. A looser
// "half the tokens" rule was tried first and produced pure noise: with one- and
// two-token phrases, "time card clock calculator" resolved to /everyday/jet-lag/
// (shared "time" + "clock") and "mortgage expense calculator" to
// /auto/car-affordability/. A candidate nobody would accept is worse than no
// candidate, so unmatched rows are reported as NO_CANDIDATE instead.
const NON_TOOL = new Set(['assets', 'js', 'css', 'images', 'og', 'fonts', 'icons', 'icons-tools', '.well-known', 'embed', 'tok', 'node_modules']);

function buildPageIndex() {
  const index = [];
  for (const cat of fs.readdirSync(DEPLOY, { withFileTypes: true })) {
    if (!cat.isDirectory() || cat.name.startsWith('.') || NON_TOOL.has(cat.name)) continue;
    for (const tool of fs.readdirSync(path.join(DEPLOY, cat.name), { withFileTypes: true })) {
      if (!tool.isDirectory() || tool.name.startsWith('.')) continue;
      const route = '/' + cat.name + '/' + tool.name + '/';
      const meta = readMeta(route);
      if (!meta) continue;
      index.push({ route, tokens: pageTokens(meta, route), title: meta.title });
    }
  }
  return index;
}

function findCandidates(index, concept) {
  if (!concept.length) return [];
  const scored = [];
  for (const p of index) {
    let hits = 0;
    for (const t of concept) if (p.tokens.has(t)) hits++;
    if (concept.length >= 2 && hits === concept.length) scored.push({ route: p.route, title: p.title, hits: hits, of: concept.length });
  }
  scored.sort((a, b) => b.hits - a.hits || a.route.localeCompare(b.route));
  return scored.slice(0, 3);
}

function main() {
  if (!fs.existsSync(MAP)) {
    console.error('✖ missing ' + path.relative(ROOT, MAP) + ' — run: npm run keywords:map-impl');
    process.exit(1);
  }
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const rows = (map.decisions || []).filter((d) => d.code === 'B' || d.code === 'C' || d.code === 'D');
  const pageIndex = buildPageIndex();
  console.error('indexed ' + pageIndex.length + ' built pages for candidate resolution');

  const results = [];
  for (const row of rows) {
    const target = row.proposedUrl || '';
    const concept = G.keyTokens(row.keyword);
    const entry = {
      code: row.code,
      priority: row.priority,
      keyword: row.keyword,
      volume: row.volume,
      difficulty: row.difficulty,
      target: target || null,
      conceptTokens: concept,
      cluster: row.cluster || [],
      why: row.why,
    };

    if (!target) {
      // A row the reviewed resolution table deliberately left ownerless is a
      // recorded decision, not a missing one — say so instead of "needs a decision".
      const mt = MANUAL_TARGETS[row.keyword];
      if (mt && mt.route === null) {
        entry.status = 'NO_OWNER';
        entry.note = mt.note;
        entry.missingTokens = concept;
        results.push(entry);
        continue;
      }
      const candidates = findCandidates(pageIndex, concept);
      entry.candidates = candidates;
      if (candidates.length) {
        entry.status = 'NO_TARGET'; // still unimplemented — a proposal is not a decision
        entry.note = 'no target recorded; ' + candidates.length + ' built page(s) already name every concept token — best is ' +
          candidates[0].route + ' (' + candidates[0].hits + '/' + candidates[0].of + ') — needs confirmation, not assumed';
      } else {
        entry.status = 'NO_TARGET';
        entry.note = 'no target recorded and no built page names all the concept tokens — needs a real decision';
      }
      entry.missingTokens = concept;
      results.push(entry);
      continue;
    }

    const meta = readMeta(target);
    if (!meta) {
      entry.status = 'PAGE_MISSING';
      entry.note = 'the recorded target does not exist in the built tree';
      entry.missingTokens = concept;
      results.push(entry);
      continue;
    }

    const tokens = pageTokens(meta, target);
    const missing = concept.filter((t) => !tokens.has(t));
    const hits = concept.length - missing.length;
    entry.pageTitle = meta.title;
    entry.pageFile = meta.file;
    entry.matchedTokens = concept.filter((t) => tokens.has(t));
    entry.missingTokens = missing;

    if (!concept.length) {
      // A keyword whose tokens are all boilerplate/brand cannot be judged by
      // this method — say so rather than guessing a verdict.
      entry.status = 'UNJUDGEABLE';
      entry.note = 'no distinctive concept tokens to match on';
    } else if (hits === 0) {
      entry.status = 'WRONG_OWNER';
      entry.note = 'the target page shares no concept token with the keyword — the recorded decision points at the wrong page';
    } else if (missing.length === 0) {
      entry.status = 'COVERED';
      entry.note = 'every concept token already appears in the built page (title/meta/h1/slug or rendered body copy)';
    } else {
      entry.status = 'NEEDS_META';
      entry.note = 'right page, but the built page (title/meta/h1/slug + body copy) never mentions: ' + missing.join(', ');
    }
    results.push(entry);
  }

  const byStatus = {};
  const byCode = {};
  for (const r of results) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    byCode[r.code] = byCode[r.code] || {};
    byCode[r.code][r.status] = (byCode[r.code][r.status] || 0) + 1;
  }

  // Page-level work queue: the pages that are the right owner but under-describe
  // the keyword cluster they now own. This is the actionable list.
  const pages = new Map();
  for (const r of results) {
    if (r.status !== 'NEEDS_META') continue;
    const key = r.target;
    if (!pages.has(key)) pages.set(key, { target: key, title: r.pageTitle, rows: [] });
    pages.get(key).rows.push(r);
  }
  const workQueue = [...pages.values()].sort((a, b) => {
    const va = Math.max(...a.rows.map((r) => r.volume || 0));
    const vb = Math.max(...b.rows.map((r) => r.volume || 0));
    return vb - va;
  });

  const out = {
    generatedFor: GENERATED_FOR,
    source: 'data/keyword-implementation-map.json (B/C/D rows)',
    totals: {
      rows: results.length,
      byCode,
      byStatus,
      pagesNeedingMeta: workQueue.length,
      keywordsNeedingMeta: workQueue.reduce((a, p) => a + p.rows.length, 0),
    },
    workQueue: workQueue.map((p) => ({
      target: p.target,
      title: p.title,
      keywords: p.rows.map((r) => ({ keyword: r.keyword, volume: r.volume, missing: r.missingTokens, code: r.code })),
    })),
    rows: results,
  };

  if (JSON_ONLY) {
    console.log(JSON.stringify(out, null, 2));
    process.exit(FAIL && workQueue.length ? 1 : 0);
  }

  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2) + '\n');

  const L = [];
  L.push('# Keyword implementation status (B / C / D)');
  L.push('');
  L.push('_Generated for the ' + GENERATED_FOR + ' sitemap tree by `scripts/audit-keyword-implementation.cjs` from');
  L.push('`data/keyword-implementation-map.json`. Do not edit by hand — regenerate with `npm run seo:kw-impl`._');
  L.push('');
  L.push('The implementation map decides **which page owns which keyword**. This audit checks whether that');
  L.push('decision is reachable in the **built** tree — the HTML a crawler receives — so a decision with no');
  L.push('page, or with the wrong page, is visible instead of sitting in the plan looking done.');
  L.push('');
  L.push('## Totals');
  L.push('');
  L.push('| Status | Rows | Meaning |');
  L.push('|---|---:|---|');
  const MEANING = {
    COVERED: 'page already names the keyword — nothing to change',
    NEEDS_META: 'right page, but its title/meta/h1/slug never mention part of the keyword',
    WRONG_OWNER: 'target shares no concept token with the keyword — the decision is wrong',
    NO_TARGET: 'no target page was recorded — needs a decision first',
    PAGE_MISSING: 'recorded target does not exist in the build',
    UNJUDGEABLE: 'no distinctive tokens to match on',
  };
  for (const k of Object.keys(byStatus).sort()) L.push('| ' + k + ' | ' + byStatus[k] + ' | ' + (MEANING[k] || '') + ' |');
  L.push('| **total** | **' + results.length + '** | |');
  L.push('');
  L.push('| Code | Rows | COVERED | NEEDS_META | WRONG_OWNER | NO_TARGET | PAGE_MISSING |');
  L.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const c of ['B', 'C', 'D']) {
    const b = byCode[c] || {};
    L.push('| ' + c + ' | ' + results.filter((r) => r.code === c).length + ' | ' + (b.COVERED || 0) + ' | ' +
      (b.NEEDS_META || 0) + ' | ' + (b.WRONG_OWNER || 0) + ' | ' + (b.NO_TARGET || 0) + ' | ' + (b.PAGE_MISSING || 0) + ' |');
  }
  L.push('');

  L.push('## Work queue — pages that are the right owner but under-describe it');
  L.push('');
  L.push(workQueue.length
    ? workQueue.length + ' page(s) carry ' + out.totals.keywordsNeedingMeta + ' keyword(s) whose concept is absent from the built title/meta/h1/slug. Sorted by the highest volume in the cluster.'
    : 'Nothing to change.');
  L.push('');
  if (workQueue.length) {
    L.push('| Page | Built title | Keywords missing from the page | Highest vol |');
    L.push('|---|---|---|---:|');
    for (const p of workQueue) {
      const kws = p.rows.map((r) => '`' + r.keyword + '` (' + r.missingTokens.join(' ') + ')').join('<br>');
      const vol = Math.max(...p.rows.map((r) => r.volume || 0));
      L.push('| `' + p.target + '` | ' + p.title + ' | ' + kws + ' | ' + vol.toLocaleString('en-US') + ' |');
    }
    L.push('');
  }

  const wrong = results.filter((r) => r.status === 'WRONG_OWNER' || r.status === 'NO_TARGET' || r.status === 'PAGE_MISSING');
  L.push('## Rows whose recorded decision cannot be implemented as written');
  L.push('');
  L.push(wrong.length
    ? wrong.length + ' row(s). These are **not** improvable by editing the named page — the map points at a page that cannot own the keyword, or at no page. Each needs a corrected target or an explicit `no implementation` decision.'
    : 'None.');
  L.push('');
  if (wrong.length) {
    L.push('| Code | Keyword | Vol | Recorded target | Best existing candidate | Status |');
    L.push('|---|---|---:|---|---|---|');
    for (const r of wrong.slice(0, 120)) {
      const cand = (r.candidates && r.candidates.length)
        ? '`' + r.candidates[0].route + '` (' + r.candidates[0].hits + '/' + r.candidates[0].of + ' tokens)'
        : '—';
      L.push('| ' + r.code + ' | `' + r.keyword + '` | ' + (r.volume || 0).toLocaleString('en-US') + ' | ' +
        (r.target ? '`' + r.target + '`' : '—') + ' | ' + cand + ' | ' + r.status + ' |');
    }
    L.push('');
  }

  L.push('## Every row (nothing skipped)');
  L.push('');
  L.push('| Code | Status | Keyword | Vol | Concept tokens | Target | Missing |');
  L.push('|---|---|---|---:|---|---|---|');
  for (const r of results) {
    L.push('| ' + r.code + ' | ' + r.status + ' | `' + r.keyword + '` | ' + (r.volume || 0).toLocaleString('en-US') +
      ' | ' + (r.conceptTokens.join(' ') || '—') + ' | ' + (r.target ? '`' + r.target + '`' : '—') +
      ' | ' + (r.missingTokens.join(' ') || '—') + ' |');
  }
  L.push('');

  fs.writeFileSync(OUT_MD, L.join('\n') + '\n');

  console.log('=== keyword implementation audit (B/C/D) ===');
  for (const k of Object.keys(byStatus).sort()) console.log('  ' + String(byStatus[k]).padStart(4) + '  ' + k);
  console.log('  pages needing a metadata change: ' + workQueue.length);
  console.log('  rows that cannot be implemented as written: ' + wrong.length);
  console.log('💾 ' + path.relative(ROOT, OUT_JSON).replace(/\\/g, '/') + ' · ' + path.relative(ROOT, OUT_MD).replace(/\\/g, '/'));
  process.exit(FAIL && workQueue.length ? 1 : 0);
}

main();
