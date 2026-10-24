#!/usr/bin/env node
/* ============================================================
 * CalcProMaster — authored per-guide depth sections (idempotent)
 * ------------------------------------------------------------
 * The 62-guide checklist item ("62 guides depth") had no artefact behind it:
 * scripts/audit-guide-depth.cjs measured 63 of 72 guides below a 900-word
 * floor, and the computed worked example alone could not close the gap for the
 * thinnest pages (it is one table plus three sentences).
 *
 * js/guide-extra-depth.js holds hand-written, guide-specific sections — the
 * parts a reader actually needs and a template cannot invent: which inputs are
 * risky, how the result is misread, what the tool deliberately does not model.
 * This script injects them above the FAQ heading between markers, so re-running
 * never stacks duplicates and the file stays byte-reproducible.
 *
 * No schema is touched: these are prose sections, not questions, and the
 * FAQPage block must keep describing the visible <h3> questions exactly.
 *
 * Usage: node scripts/apply-guide-extra-depth.cjs          (apply)
 *        node scripts/apply-guide-extra-depth.cjs --check  (fail if stale)
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GUIDES = path.join(ROOT, 'guides');
const PACK = require(path.join(ROOT, 'js', 'guide-extra-depth.js')).PACK;
const CHECK = process.argv.includes('--check');

const START = '<!-- guide-extra-depth:start -->';
const END = '<!-- guide-extra-depth:end -->';

const FAQ_HEAD = /<h2[^>]*>\s*(?:Frequently asked questions|FAQ)\s*<\/h2>/i;
const CTA_HEAD = /<h2[^>]*>\s*Try the matching calculators\s*<\/h2>/i;
// scripts/apply-guide-depth.cjs strips its whole marked block on every run, and
// on the 17 category guides the FAQ heading lives INSIDE that block. Injecting
// before the FAQ heading there would be deleted by the next depth run, so the
// block goes above the depth marker instead.
const DEPTH_START = /<!-- guide-depth:start -->/i;

function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function stripBlock(html) {
  const re = new RegExp('(^|\\n)[ \\t]*' + escRe(START) + '[\\s\\S]*?' + escRe(END) + '[ \\t]*\\r?\\n', 'g');
  return String(html).replace(re, '$1');
}

function insertBefore(html, needle, block) {
  const i = html.search(needle);
  if (i < 0) return insertBefore(html, /<\/main>/i, block);
  const lineStart = html.lastIndexOf('\n', i - 1) + 1;
  return html.slice(0, lineStart) + block + html.slice(lineStart);
}

function blockHtml(sections) {
  const lines = [START];
  for (const [heading, paras] of sections) {
    lines.push('<h2>' + heading + '</h2>');
    for (const p of paras) lines.push('<p>' + p + '</p>');
  }
  lines.push(END);
  return lines.join('\n') + '\n';
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

function applyTo(html, slug) {
  const data = PACK[slug];
  if (!data || !Array.isArray(data.sections) || !data.sections.length) return html;
  let out = stripBlock(html);
  // Preference order: above the category depth block (so apply-guide-depth cannot
  // erase it), then above the FAQ, then above the CTA heading.
  const anchor = DEPTH_START.test(out) ? DEPTH_START : (FAQ_HEAD.test(out) ? FAQ_HEAD : CTA_HEAD);
  out = insertBefore(out, anchor, blockHtml(data.sections));
  return out;
}

function main() {
  const slugs = Object.keys(PACK);
  const problems = [];
  const rows = [];
  for (const slug of slugs) {
    const file = path.join(GUIDES, slug + '.html');
    if (!fs.existsSync(file)) { problems.push('missing guides/' + slug + '.html'); continue; }
    const before = fs.readFileSync(file, 'utf8');
    const after = applyTo(before, slug);
    if (!after.includes(START)) problems.push('not applied: ' + slug);
    if (before !== after) {
      if (CHECK) problems.push('out of date: guides/' + slug + '.html');
      else fs.writeFileSync(file, after);
    }
    rows.push({ slug, before: wordsOf(before), after: wordsOf(after) });
  }

  if (CHECK) {
    if (problems.length) {
      console.error('✖ guide extra depth stale:\n  ' + problems.join('\n  '));
      process.exit(1);
    }
    console.log('✔ guide extra depth up to date (' + slugs.length + ' guides)');
    return;
  }

  const total = rows.reduce((s, r) => s + r.after, 0);
  console.log('==========================================');
  console.log(' GUIDE EXTRA DEPTH — authored sections');
  console.log('==========================================');
  console.log('guides written : ' + rows.length);
  console.log('words after    : ' + total + ' (mean ' + Math.round(total / rows.length) + '/guide)');
  const thin = rows.filter((r) => r.after < 900);
  console.log('still under 900: ' + thin.length);
  thin.forEach((r) => console.log('   · ' + r.slug + ' ' + r.after));
  if (problems.length) console.log('problems       : ' + problems.join(', '));
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('FAIL', e.message); process.exit(1); }
}

module.exports = { applyTo, stripBlock, insertBefore, wordsOf, blockHtml, START, END };
