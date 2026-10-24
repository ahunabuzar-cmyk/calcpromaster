#!/usr/bin/env node
/* ============================================================
 * CalcProMaster — guide depth audit
 * ------------------------------------------------------------
 * The 30-point checklist carried "27 ⬜ 62 guides depth" with no way to tell
 * what "deep" meant, so it could never be closed. This measures the four
 * things that actually separate a useful guide from a stub, on the SOURCE
 * guides (what the build ships):
 *
 *   words    ≥ 900   visible body text, scripts/styles stripped
 *   h2       ≥ 5     real sections, not one long block
 *   faq      ≥ 3     question headings in the FAQ block
 *   schema   yes     FAQPage JSON-LD present for those questions
 *   example  yes     at least one worked example (numbers in an example block)
 *
 * Usage: node scripts/audit-guide-depth.cjs [--json] [--verbose]
 * Exit:  0 = every guide meets the floor · 1 = at least one does not
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GUIDES = path.join(ROOT, 'guides');
const JSON_OUT = process.argv.includes('--json');
const VERBOSE = process.argv.includes('--verbose');

const FLOOR = { words: 900, h2: 5, faq: 3 };

function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countFaq(html) {
  const block = html.match(/<div class="seo-faqs"[\s\S]*?<\/div>/i) ||
    html.match(/<h2[^>]*>FAQ[\s\S]*?(?=<\/main>)/i) ||
    html.match(/<h2[^>]*>Frequently asked questions[\s\S]*?(?=<\/main>)/i);
  if (!block) return 0;
  return (block[0].match(/<h3/gi) || []).length;
}

function rows() {
  const files = fs.readdirSync(GUIDES).filter((f) => f.endsWith('.html') && f !== 'index.html' && f !== 'glossary.html');
  return files.map((f) => {
    const html = fs.readFileSync(path.join(GUIDES, f), 'utf8');
    const text = textOf(html);
    const words = text ? text.split(' ').length : 0;
    const h2 = (html.match(/<h2/gi) || []).length;
    const faq = countFaq(html);
    const schema = /"@type"\s*:\s*"FAQPage"/.test(html);
    const example = /class="example"|guide-worked-example/i.test(html);
    const failures = [];
    if (words < FLOOR.words) failures.push('words ' + words + ' < ' + FLOOR.words);
    if (h2 < FLOOR.h2) failures.push('h2 ' + h2 + ' < ' + FLOOR.h2);
    if (faq < FLOOR.faq) failures.push('faq ' + faq + ' < ' + FLOOR.faq);
    if (!schema) failures.push('no FAQPage schema');
    if (!example) failures.push('no worked example');
    return { file: f, words, h2, faq, schema, example, failures };
  }).sort((a, b) => a.words - b.words);
}

const list = rows();
const failing = list.filter((r) => r.failures.length);

if (JSON_OUT) {
  console.log(JSON.stringify({ floor: FLOOR, guides: list, failing: failing.length }, null, 2));
} else {
  console.log('Guide depth audit — ' + list.length + ' guides');
  console.log('  floor: words ≥ ' + FLOOR.words + ', h2 ≥ ' + FLOOR.h2 + ', faq ≥ ' + FLOOR.faq + ', FAQPage schema, worked example');
  if (VERBOSE) {
    for (const r of list) {
      console.log('  ' + String(r.words).padStart(5) + 'w  h2:' + String(r.h2).padStart(2) + '  faq:' + String(r.faq).padStart(2) +
        '  ' + (r.failures.length ? '✗ ' + r.failures.join(', ') : '✓') + '  ' + r.file);
    }
  }
  const mean = Math.round(list.reduce((s, r) => s + r.words, 0) / list.length);
  console.log('  mean words  ' + mean);
  console.log('  below floor ' + failing.length);
  if (failing.length) {
    for (const r of failing.slice(0, 10)) console.log('   ✗ ' + r.file + ' — ' + r.failures.join(', '));
    if (failing.length > 10) console.log('   … ' + (failing.length - 10) + ' more (--verbose)');
  }
}

process.exit(failing.length ? 1 : 0);
