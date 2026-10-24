#!/usr/bin/env node
// ============================================================
// CalcProMaster — Apply topic-guide depth content (idempotent, in-place)
// ------------------------------------------------------------
// scripts/thin-page-report.cjs flags the two thinnest indexable pages on the
// site, and both are topic guides produced by scripts/build-topic-guides.cjs:
//
//     /guides/room-area    400 words   (site minimum)
//     /guides/gear-ratio   407 words
//
// Regenerating those guides would clobber the link-form and title fixes that
// were applied to guides/*.html after generation (the generator SKIPs files
// that already exist, and all 21 differ from its output), so the extra content
// is injected between markers instead — the same pattern
// scripts/apply-guide-depth.cjs uses for the 17 category guides:
//
//   1. new <h2> sections, inserted above the visible FAQ heading
//   2. new FAQ <h3>/<p> pairs, inserted inside the existing FAQ section
//   3. the FAQPage JSON-LD array, rebuilt FROM the visible FAQ text so the
//      markup can never disagree with the page (no markers needed there —
//      it is regenerated deterministically from the body on every run)
//
// Usage: node scripts/apply-topic-guide-depth.cjs          (apply)
//        node scripts/apply-topic-guide-depth.cjs --check  (fail if stale)
// Output: guides/*.html + data/topic-guide-depth.json
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GUIDES_DIR = path.join(ROOT, 'guides');
const OUT_JSON = path.join(ROOT, 'data', 'topic-guide-depth.json');
const DEPTH = require(path.join(ROOT, 'js', 'topic-guide-depth.js'));

const CHECK = process.argv.includes('--check');

const MARK = {
  sections: ['<!-- topic-depth:start -->', '<!-- topic-depth:end -->'],
  faq: ['<!-- topic-faq:start -->', '<!-- topic-faq:end -->']
};

// scripts/apply-guide-worked-examples.cjs writes its computed example just
// above this heading, and the sections block is written to the same anchor —
// so the anchor has to match the example first, or the two scripts swap places
// on every run and the page never settles (broken --check idempotency).
const FAQ_H2 = /<!-- guide-worked-example:start -->|<h2[^>]*>\s*Frequently asked questions\s*<\/h2>/i;
// The last line of the guide body — every topic guide ends with this row.
const TAIL = /<p class="related"><a href="\/guides\//;

// ---------- pure helpers ----------

function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Remove a previously injected block, markers included, together with the line
// it occupies — so re-running reproduces the file byte for byte.
function stripBlock(html, pair) {
  const re = new RegExp('(^|\\n)[ \\t]*' + escRe(pair[0]) + '[\\s\\S]*?' + escRe(pair[1]) + '[ \\t]*\\r?\\n', 'g');
  return String(html).replace(re, '$1');
}

function wrap(pair, body) {
  return pair[0] + '\n' + body + '\n' + pair[1] + '\n';
}

function insertBefore(html, needle, block) {
  const i = html.search(needle);
  if (i < 0) return insertBefore(html, /<\/body>/i, block);
  const lineStart = html.lastIndexOf('\n', i - 1) + 1;
  return html.slice(0, lineStart) + block + html.slice(lineStart);
}

function decodeEntities(s) {
  return String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// Every visible FAQ item is an <h3> immediately followed by its <p> answer.
function visibleFaqs(html) {
  const body = html.slice(html.search(/<body/i));
  const out = [];
  const re = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(body))) out.push({ q: decodeEntities(m[1]), a: decodeEntities(m[2]) });
  return out;
}

// Rebuild the FAQPage mainEntity array from the visible questions, keeping the
// surrounding JSON byte for byte (the generator writes 8-space entries).
function rebuildFaqSchema(html, faqs) {
  const re = /("mainEntity":\s*\{\s*\n\s*"@type":\s*"FAQPage",\s*\n\s*"mainEntity":\s*\[\s*\n)([\s\S]*?)(\n\s*\])/;
  if (!re.test(html)) return null;
  const items = faqs
    .map((f) => '        { "@type": "Question", "name": ' + JSON.stringify(f.q) +
      ', "acceptedAnswer": { "@type": "Answer", "text": ' + JSON.stringify(f.a) + ' } }')
    .join(',\n');
  return html.replace(re, (m, pre, _body, post) => pre + items + post);
}

function faqHtml(faqs) {
  return faqs.map((f) => '  <h3>' + f.q + '</h3>\n  <p>' + f.a + '</p>').join('\n');
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

// ---------- transformation ----------

function applyTo(html, slug) {
  const data = DEPTH.GUIDES[slug];
  let out = html;
  for (const key of Object.keys(MARK)) out = stripBlock(out, MARK[key]);
  out = insertBefore(out, FAQ_H2, wrap(MARK.sections, data.sections.trim()));
  out = insertBefore(out, TAIL, wrap(MARK.faq, faqHtml(data.faqs)));
  const withSchema = rebuildFaqSchema(out, visibleFaqs(out));
  if (withSchema) out = withSchema;
  return out;
}

function isApplied(html) {
  return Object.keys(MARK).every((k) => html.includes(MARK[k][0]) && html.includes(MARK[k][1]));
}

function main() {
  const slugs = Object.keys(DEPTH.GUIDES);
  const report = { ranAt: new Date().toISOString(), guides: slugs.length, pages: [] };
  const problems = [];

  for (const slug of slugs) {
    const file = path.join(GUIDES_DIR, slug + '.html');
    if (!fs.existsSync(file)) { problems.push('missing file: guides/' + slug + '.html'); continue; }
    const before = fs.readFileSync(file, 'utf8');
    const after = applyTo(before, slug);
    if (!isApplied(after)) problems.push('markers not applied: ' + slug);
    const faqs = visibleFaqs(after);
    if (!/FAQPage/.test(after)) problems.push('FAQPage schema missing: ' + slug);
    if (before !== after) {
      if (!CHECK) fs.writeFileSync(file, after);
      else problems.push('out of date: guides/' + slug + '.html');
    }
    report.pages.push({ guide: slug, before: wordsOf(before), after: wordsOf(after), faqs: faqs.length });
  }

  const totalBefore = report.pages.reduce((s, p) => s + p.before, 0);
  const totalAfter = report.pages.reduce((s, p) => s + p.after, 0);
  report.totalBefore = totalBefore;
  report.totalAfter = totalAfter;
  report.minAfter = report.pages.length ? Math.min(...report.pages.map((p) => p.after)) : 0;

  if (!CHECK) fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  if (CHECK) {
    if (problems.length) {
      console.error('✖ topic guide depth stale:\n  ' + problems.join('\n  '));
      process.exit(1);
    }
    console.log('✔ topic guide depth up to date (' + slugs.length + ' guides)');
    return;
  }

  console.log('==========================================');
  console.log(' TOPIC GUIDE DEPTH — thinnest pages enriched');
  console.log('==========================================');
  for (const p of report.pages) {
    console.log('  ' + p.guide.padEnd(14) + p.before + ' → ' + p.after + ' words (' + p.faqs + ' FAQs)');
  }
  console.log('words before     : ' + totalBefore);
  console.log('words after      : ' + totalAfter);
  console.log('thinnest after   : ' + report.minAfter + ' words');
  if (problems.length) console.log('problems         : ' + problems.join(', '));
  console.log('');
  console.log('💾 data/topic-guide-depth.json');
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('FAIL', e.message); process.exit(1); }
}

module.exports = { stripBlock, wrap, insertBefore, wordsOf, decodeEntities, visibleFaqs, rebuildFaqSchema, applyTo, isApplied, MARK };
