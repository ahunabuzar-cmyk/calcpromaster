#!/usr/bin/env node
// ============================================================
// CalcProMaster — Apply guide depth content (idempotent, in-place)
// ------------------------------------------------------------
// The 17 category guide pages (/guides/<cat>) were the thinnest
// INDEXABLE pages on the site (315-375 words, no FAQ). They are also
// the deepest node in each category's crawl graph — every covered tool
// page links back to its guide — so thinness there costs twice.
//
// This script injects the unique per-guide content from
// js/guide-depth.js into the ROOT guides/*.html files (which are the
// source of truth and get copied into deploy/ by build-deploy.js):
//
//   1. a one-sentence framing paragraph, right after the existing intro
//   2. "Where these answers go wrong" (4 guide-specific pitfalls)
//   3. a FAQ section + matching FAQPage JSON-LD
//   4. a small CSS block so the new blocks match the page's own styling
//
// Every edit is wrapped in markers, so re-running removes the previous
// version and writes the current one — safe to run on every build and
// safe to diff (no duplicated blocks, no drift).
//
// Usage: node scripts/apply-guide-depth.cjs          (apply)
//        node scripts/apply-guide-depth.cjs --check  (fail if stale)
// Output: guides/*.html + data/guide-depth.json
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GUIDES_DIR = path.join(ROOT, 'guides');
const OUT_JSON = path.join(ROOT, 'data', 'guide-depth.json');
const DEPTH = require(path.join(ROOT, 'js', 'guide-depth.js'));

const CHECK = process.argv.includes('--check');
const MATCH_H2 = /<h2[^>]*>\s*Try the matching calculators\s*<\/h2>/i;

// scripts/apply-keyword-targets.cjs answers a B/C/D keyword on a guide page by
// inserting its FAQ pair straight after the "Frequently asked questions" heading
// this script writes — i.e. *inside* this script's own block. Regenerating the
// block from js/guide-depth.js would therefore silently delete that keyword work
// and leave the file permanently stale against --check. So anything sitting
// between that heading and the FAQ list is captured first and written back in the
// same place. The block is otherwise byte-reproducible (idempotent).
const KW_FAQ_ANCHOR = /(<h2[^>]*>Frequently asked questions<\/h2>)([\s\S]*?)(?=<div class="seo-faqs">|<!-- guide-depth:end -->)/i;

const MARK = {
  lede: ['<!-- guide-lede:start -->', '<!-- guide-lede:end -->'],
  depth: ['<!-- guide-depth:start -->', '<!-- guide-depth:end -->'],
  schema: ['<!-- guide-faq-schema:start -->', '<!-- guide-faq-schema:end -->'],
  css: ['/* guide-depth-css:start */', '/* guide-depth-css:end */']
};

// ---------- pure helpers (unit-tested) ----------

function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Remove a previously injected block, markers included, together with the
// line it occupies — so re-running the script reproduces the file byte for
// byte instead of accumulating blank lines.
function stripBlock(html, pair) {
  const re = new RegExp('(^|\\n)[ \\t]*' + escRe(pair[0]) + '[\\s\\S]*?' + escRe(pair[1]) + '[ \\t]*\\r?\\n', 'g');
  return String(html).replace(re, '$1');
}

function wrap(pair, body) {
  return pair[0] + '\n' + body + '\n' + pair[1] + '\n';
}

// Insert `block` on its own line(s) immediately above the line containing the
// first match of `needle`; if the anchor is missing, insert above </body> so a
// page can never silently lose its depth content. Line-anchored insertion is
// what keeps the operation byte-stable when it is run again (the anchor keeps
// its own indentation instead of donating it to the injected block).
function insertBefore(html, needle, block) {
  const i = html.search(needle);
  if (i < 0) return insertBefore(html, /<\/body>/i, block);
  const lineStart = html.lastIndexOf('\n', i - 1) + 1;
  return html.slice(0, lineStart) + block + html.slice(lineStart);
}

function wordsOf(html) {
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

const CSS_BLOCK =
  '.guide-lede{font-weight:600;border-left:3px solid #4f46e5;padding-left:12px;margin:10px 0 4px}\n' +
  '    .guide-pitfalls{margin:8px 0 14px 20px}\n' +
  '    .seo-faqs h3{margin:16px 0 4px}';

// ---------- transformation ----------

// Copy of the FAQ content another script injected after the FAQ heading this
// script owns (see KW_FAQ_ANCHOR). Empty string when nothing was injected.
function captureInjectedFaq(html) {
  const m = KW_FAQ_ANCHOR.exec(String(html));
  return m ? m[2] : '';
}

function applyTo(html, name) {
  const injectedFaq = captureInjectedFaq(html);
  let out = html;
  for (const key of Object.keys(MARK)) out = stripBlock(out, MARK[key]);
  out = insertBefore(out, /<h2/i, wrap(MARK.lede, DEPTH.ledeHtml(name)));
  out = insertBefore(out, MATCH_H2, wrap(MARK.depth, DEPTH.depthHtml(name)));
  if (injectedFaq) out = out.replace(KW_FAQ_ANCHOR, (_m, head) => head + injectedFaq);
  const schema = DEPTH.faqSchema(name);
  if (schema) {
    const tag =
      '<script type="application/ld+json">\n' +
      JSON.stringify(schema, null, 2) + '\n</script>';
    out = insertBefore(out, /<\/head>/i, wrap(MARK.schema, tag));
  }
  out = insertBefore(out, /<\/style>/i, wrap(MARK.css, CSS_BLOCK));
  return out;
}

function isApplied(html) {
  return Object.keys(MARK).every(
    (k) => html.includes(MARK[k][0]) && html.includes(MARK[k][1])
  );
}

function main() {
  const names = Object.keys(DEPTH.GUIDES);
  const report = { ranAt: new Date().toISOString(), guides: names.length, pages: [] };
  const problems = [];

  for (const name of names) {
    const file = path.join(GUIDES_DIR, name + '.html');
    if (!fs.existsSync(file)) { problems.push('missing file: guides/' + name + '.html'); continue; }
    const before = fs.readFileSync(file, 'utf8');
    const after = applyTo(before, name);
    if (!isApplied(after)) problems.push('markers not applied: ' + name);
    if (after !== before) {
      if (!CHECK) fs.writeFileSync(file, after);
      else problems.push('out of date: guides/' + name + '.html');
    }
    report.pages.push({ guide: name, before: wordsOf(before), after: wordsOf(after) });
  }

  const totalBefore = report.pages.reduce((s, p) => s + p.before, 0);
  const totalAfter = report.pages.reduce((s, p) => s + p.after, 0);
  report.totalBefore = totalBefore;
  report.totalAfter = totalAfter;
  report.minAfter = Math.min(...report.pages.map((p) => p.after));

  if (!CHECK) fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  if (CHECK) {
    if (problems.length) {
      console.error('✖ guide depth stale:\n  ' + problems.join('\n  '));
      process.exit(1);
    }
    console.log('✔ guide depth up to date (' + names.length + ' guides)');
    return;
  }

  console.log('==========================================');
  console.log(' GUIDE DEPTH — thin category pages enriched');
  console.log('==========================================');
  console.log('guides written   : ' + report.pages.length);
  console.log('words before     : ' + totalBefore + ' (avg ' + Math.round(totalBefore / report.pages.length) + '/page)');
  console.log('words after      : ' + totalAfter + ' (avg ' + Math.round(totalAfter / report.pages.length) + '/page)');
  console.log('thinnest after   : ' + report.minAfter + ' words');
  if (problems.length) console.log('problems         : ' + problems.join(', '));
  console.log('');
  console.log('💾 data/guide-depth.json');
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('FAIL', e.message); process.exit(1); }
}

module.exports = { stripBlock, wrap, insertBefore, wordsOf, applyTo, isApplied, captureInjectedFaq, MARK, CSS_BLOCK };
