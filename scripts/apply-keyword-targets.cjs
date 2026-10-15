#!/usr/bin/env node
// ============================================================
// CalcProMaster — apply keyword-target improvements (B / C / D)
// ------------------------------------------------------------
// docs/KEYWORD-IMPLEMENTATION-MAP.md decides which page owns each of the 115
// actionable keywords. 97 of those rows are B/C/D ("improve an existing page"),
// and every one carried the status "not implemented". This script implements
// them: for each row it resolves the owner page (recorded target, else the
// reviewed table in scripts/lib/keyword-target-overrides.cjs, else a strict
// all-token registry match) and then makes that page actually cover the keyword
// in crawler-visible copy.
//
// Why a FAQ entry rather than a title change:
//   • tests/unit/seo-qa.test.js pins metaDesc to 90–160 characters and forbids
//     duplicate meta descriptions, so appending a synonym to 90 metas would
//     either overflow or collide. Rewriting 90 metas by hand is a different,
//     editorial job.
//   • A FAQ question + answer is rendered body copy AND goes into the page's
//     FAQPage JSON-LD, so a crawler reads it. It has no length ceiling, and the
//     answer is built from the tool's own registry row (name + input labels +
//     whether it shows steps), so nothing is invented.
//   • Each question embeds a unique keyword and each answer embeds the tool's
//     own name, so no (question, answer) pair repeats across tools — the rule
//     tests/unit/seo-qa.test.js enforces.
// The keyword is also added to the page's `lsi` target list when absent.
//
// Guide pages (/guides/*.html) get the same FAQ as a visible <h3>/<p> pair plus
// a JSON-LD Question, anchored on the page's own FAQ heading.
//
// Several rows can share one owner page, so edits are grouped per page and the
// needle for the next edit is re-read from the page as already modified in this
// run — editing one row must not invalidate the next row's alignment.
//
// Idempotent: re-running adds nothing. `--check` fails if the tree has drifted.
//
// Usage: node scripts/apply-keyword-targets.cjs [--check]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = require('./lib/keyword-target-resolver.cjs');
const { MANUAL_TARGETS } = require('./lib/keyword-target-overrides.cjs');
const { sitemapDate } = require('./lib/sitemap-date.cjs');

const ROOT = R.ROOT;
const MAP = path.join(ROOT, 'data', 'keyword-implementation-map.json');
const SRC = path.join(ROOT, 'js', 'seo-content.js');
const OUT_JSON = path.join(ROOT, 'data', 'keyword-target-resolution.json');
const OUT_MD = path.join(ROOT, 'docs', 'KEYWORD-TARGET-RESOLUTION.md');
const CHECK = process.argv.includes('--check');

function readSeo(src) {
  const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.window.TOOL_SEO || {};
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const questionFor = (keyword) => 'Can I use this page for "' + keyword + '"?';

function answerForTool(tool) {
  const labels = (tool.inputs || [])
    .map((i) => String(i.label).replace(/\s*\([^)]*\)\s*$/, '').trim())
    .filter(Boolean);
  const inputClause = labels.length ? 'set the ' + labels.slice(0, 3).join(', ') : 'enter your values';
  const stepsClause = tool.steps ? ', with the working shown' : '';
  return tool.name + ' handles that: ' + inputClause + ' and the result updates instantly' + stepsClause + '.';
}

function answerForGuide(keyword) {
  return 'Yes — this guide answers the "' + keyword + '" question: the method is explained in the sections below and the linked calculator returns the number instantly.';
}

function main() {
  if (!fs.existsSync(MAP)) {
    console.error('✖ missing ' + path.relative(ROOT, MAP) + ' — run: npm run keywords:map-impl');
    process.exit(1);
  }
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const rows = (map.decisions || []).filter((d) => d.code === 'B' || d.code === 'C' || d.code === 'D');
  const tools = R.loadRegistry();
  const byId = new Map(tools.map((t) => [t.id, t]));
  const routes = R.loadToolRoutes();
  const routeToId = new Map();
  for (const [id, route] of routes) routeToId.set(R.normaliseRoute(route), id);

  const original = fs.readFileSync(SRC, 'utf8');
  const lines = original.split('\n');
  const lineOf = {};
  lines.forEach((l, i) => { const m = l.match(/^\s*'([^']+)':\s*\{/); if (m) lineOf[m[1]] = i; });
  const TOOL_SEO = readSeo(original);

  // Live state so a second row on the same page sees the first row's edit.
  const liveFaqs = new Map();
  const liveLsi = new Map();
  for (const id of Object.keys(TOOL_SEO)) {
    liveFaqs.set(id, Array.isArray(TOOL_SEO[id].faqs) ? TOOL_SEO[id].faqs.slice() : []);
    liveLsi.set(id, Array.isArray(TOOL_SEO[id].lsi) ? TOOL_SEO[id].lsi.slice() : []);
  }
  const guideState = new Map();

  const resolved = [];
  let addedFaqs = 0, addedLsi = 0, guideEdits = 0;

  for (const row of rows) {
    const manual = MANUAL_TARGETS[row.keyword];
    const auto = R.rankTools(row.keyword, tools, routes)[0];
    let route = manual ? manual.route : (row.proposedUrl || (auto ? auto.route : null));
    if (route) route = R.normaliseRoute(route);
    const entry = {
      code: row.code, priority: row.priority, keyword: row.keyword, volume: row.volume,
      recordedTarget: row.proposedUrl ? R.normaliseRoute(row.proposedUrl) : null,
      resolvedTarget: route,
      source: manual ? 'reviewed-table' : (row.proposedUrl ? 'map' : (auto ? 'registry-match' : 'none')),
      note: manual ? manual.note : (auto && !row.proposedUrl ? 'strict all-token registry match: ' + auto.id : '')
    };

    if (!route) {
      entry.status = 'NO_OWNER';
      resolved.push(entry);
      continue;
    }

    const id = routeToId.get(route);
    const q = questionFor(row.keyword);

    // ---------- guide pages ----------
    const guideMatch = /^\/guides\/([a-z0-9-]+)\/?$/.exec(route);
    if (!id && guideMatch) {
      const name = guideMatch[1];
      const file = path.join(ROOT, 'guides', name + '.html');
      if (!fs.existsSync(file)) { entry.status = 'GUIDE_FILE_MISSING'; resolved.push(entry); continue; }
      let html = guideState.has(name) ? guideState.get(name) : fs.readFileSync(file, 'utf8');
      // Exact-question check only. A looser "some question was added" test made the
      // second row targeting the same guide look already-applied and skipped it.
      if (html.includes('<h3>' + escapeHtml(q) + '</h3>') || html.includes('"name": ' + JSON.stringify(q))) {
        entry.status = 'ALREADY'; resolved.push(entry); continue;
      }
      const a = answerForGuide(row.keyword);
      const faqPair = '<h3>' + escapeHtml(q) + '</h3>\n<p>' + escapeHtml(a) + '</p>\n';
      const head = /<h2[^>]*>Frequently asked questions<\/h2>\s*/i;
      if (head.test(html)) {
        html = html.replace(head, (m) => m + faqPair);
      } else if (html.includes('</main>')) {
        html = html.replace('</main>', '  <section class="seo-faqs">\n  <h2>Frequently asked questions</h2>\n  ' + faqPair + '  </section>\n</main>');
      } else {
        entry.status = 'GUIDE_NO_INSERT_POINT'; resolved.push(entry); continue;
      }
      // JSON-LD: add the Question when the page carries a FAQPage block.
      const ld = /("@type":\s*"FAQPage",\s*\n\s*"mainEntity":\s*\[\n)/;
      if (ld.test(html)) {
        html = html.replace(ld, '$1        {\n          "@type": "Question",\n          "name": ' + JSON.stringify(q)
          + ',\n          "acceptedAnswer": { "@type": "Answer", "text": ' + JSON.stringify(a) + ' }\n        },\n');
      }
      guideState.set(name, html);
      entry.status = 'IMPROVED';
      entry.file = path.relative(ROOT, file).replace(/\\/g, '/');
      entry.answer = a;
      guideEdits++;
      resolved.push(entry);
      continue;
    }

    // ---------- tool pages ----------
    const tool = id && byId.get(id);
    if (!tool || !TOOL_SEO[id]) { entry.status = 'NO_SEO_ENTRY'; resolved.push(entry); continue; }
    if (lineOf[id] === undefined) { entry.status = 'NO_ENTRY_LINE'; resolved.push(entry); continue; }

    const faqs = liveFaqs.get(id);
    const lsi = liveLsi.get(id);
    const hasQ = faqs.some((f) => f && f.q === q);
    const hasLsi = lsi.includes(row.keyword);
    if (hasQ && hasLsi) { entry.status = 'ALREADY'; resolved.push(entry); continue; }

    let line = lines[lineOf[id]];
    if (!hasQ) {
      const a = answerForTool(tool);
      const next = faqs.concat([{ q: q, a: a }]);
      const needle = JSON.stringify(faqs);
      const at = line.indexOf(needle);
      if (at < 0) { entry.status = 'FAQ_NEEDLE_MISSING'; resolved.push(entry); continue; }
      line = line.slice(0, at) + JSON.stringify(next) + line.slice(at + needle.length);
      liveFaqs.set(id, next);
      addedFaqs++;
      entry.answer = a;
    }
    if (!hasLsi) {
      const next = lsi.concat([row.keyword]);
      const needle = JSON.stringify(lsi);
      const at = line.indexOf(needle);
      if (at >= 0) {
        line = line.slice(0, at) + JSON.stringify(next) + line.slice(at + needle.length);
        liveLsi.set(id, next);
        addedLsi++;
      }
    }
    lines[lineOf[id]] = line;
    entry.status = 'IMPROVED';
    entry.tool = id;
    resolved.push(entry);
  }

  // ---------- write guides ----------
  const guideDrift = [];
  for (const [name, html] of guideState) {
    const file = path.join(ROOT, 'guides', name + '.html');
    if (html !== fs.readFileSync(file, 'utf8')) guideDrift.push(file);
  }

  const text = lines.join('\n');
  const report = {
    generatedFor: sitemapDate(ROOT) || 'unknown',
    totals: {
      rows: rows.length,
      improved: resolved.filter((r) => r.status === 'IMPROVED').length,
      already: resolved.filter((r) => r.status === 'ALREADY').length,
      noOwner: resolved.filter((r) => r.status === 'NO_OWNER').length,
      other: resolved.filter((r) => !['IMPROVED', 'ALREADY', 'NO_OWNER'].includes(r.status)).length,
      addedFaqs, addedLsi, guideEdits
    },
    rows: resolved
  };

  if (CHECK) {
    if (text !== original || guideDrift.length) {
      console.error('✖ keyword targets are stale (seo-content: ' + (text !== original) + ', guides: ' + guideDrift.length + ')');
      console.error('  run: node scripts/apply-keyword-targets.cjs && node scripts/split-seo.cjs');
      process.exit(1);
    }
    console.log('✔ keyword targets applied (' + report.totals.improved + ' improved, ' + report.totals.already + ' already, ' + report.totals.noOwner + ' no owner)');
    return;
  }

  fs.writeFileSync(SRC, text);
  for (const file of guideDrift) fs.writeFileSync(file, guideState.get(path.basename(file, '.html')));
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(OUT_MD, renderMd(report));

  console.log('==========================================');
  console.log(' KEYWORD TARGETS — B/C/D page improvements');
  console.log('==========================================');
  console.log('rows                 : ' + rows.length);
  console.log('pages improved       : ' + report.totals.improved);
  console.log('  tool FAQs added    : ' + addedFaqs + '  (lsi tags added: ' + addedLsi + ')');
  console.log('  guide FAQs added   : ' + guideEdits);
  console.log('already applied      : ' + report.totals.already);
  console.log('no honest owner      : ' + report.totals.noOwner);
  console.log('unexpected statuses  : ' + report.totals.other);
  console.log('');
  for (const s of ['NO_OWNER', 'NO_SEO_ENTRY', 'NO_ENTRY_LINE', 'FAQ_NEEDLE_MISSING', 'GUIDE_FILE_MISSING', 'GUIDE_NO_INSERT_POINT']) {
    const list = resolved.filter((r) => r.status === s);
    if (list.length) console.log('  ' + s + ' (' + list.length + '): ' + list.map((r) => r.keyword).join(' · '));
  }
  console.log('');
  console.log('next: node scripts/split-seo.cjs && node build-deploy.js');
}

function renderMd(report) {
  const t = report.totals;
  const L = [];
  L.push('# Keyword target resolution (B / C / D)');
  L.push('');
  L.push('_Generated for the ' + report.generatedFor + ' sitemap tree by `scripts/apply-keyword-targets.cjs`. Do not edit by hand — regenerate with `npm run seo:targets`._');
  L.push('');
  L.push('Every B/C/D row from [KEYWORD-IMPLEMENTATION-MAP.md](KEYWORD-IMPLEMENTATION-MAP.md) resolved to a real owner page,');
  L.push('then improved: the keyword is answered by a rendered FAQ on that page (tool pages also get it in their `lsi` target list).');
  L.push('A row is left `NO_OWNER` only when no page can honestly answer it — never mapped to a near-miss page to fill the column.');
  L.push('');
  L.push('| Result | Rows |');
  L.push('|---|---:|');
  L.push('| improved (FAQ + lsi added) | ' + t.improved + ' |');
  L.push('| already applied | ' + t.already + ' |');
  L.push('| no honest owner | ' + t.noOwner + ' |');
  L.push('| **total** | **' + t.rows + '** |');
  L.push('');
  L.push('Nothing was invented: every answer is built from the tool\'s own registry row (name, input labels, steps flag),');
  L.push('and every route is re-checked against the live `js/seo-content.js` canonical paths before use.');
  L.push('');
  L.push('## Every row');
  L.push('');
  L.push('| Code | Keyword | Vol | Status | Owner | How resolved |');
  L.push('|---|---|---:|---|---|---|');
  for (const r of report.rows) {
    L.push('| ' + r.code + ' | `' + r.keyword + '` | ' + (r.volume || 0).toLocaleString('en-US') + ' | ' + r.status
      + ' | ' + (r.resolvedTarget || '—') + ' | ' + r.source + (r.note ? ' — ' + r.note : '') + ' |');
  }
  L.push('');
  return L.join('\n');
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('FAIL', e.stack || e.message); process.exit(1); }
}

module.exports = { questionFor, answerForTool, answerForGuide, renderMd };
