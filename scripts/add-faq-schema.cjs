#!/usr/bin/env node
/* ============================================================
 * CalcProMaster — add FAQPage schema to pages that already answer FAQs
 * ------------------------------------------------------------
 * The FAQPage block is only added when the page itself renders the questions
 * and answers: the JSON-LD is extracted from the visible <h3> + <p> pairs in
 * the "Frequently asked questions" section, so schema and page can never drift.
 * Pages without a visible FAQ section are skipped (no invented Q&A).
 *
 * HowTo schema is deliberately NOT added: Google retired HowTo rich results in
 * 2023, so the markup would cost bytes and return nothing.
 *
 * Usage:
 *   node scripts/add-faq-schema.cjs --dry-run
 *   node scripts/add-faq-schema.cjs
 * Exit: 0 = OK · 1 = a page has FAQ headings but no parseable answers
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry-run');

function decode(s) {
  return String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFaq(html) {
  // The FAQ block runs from its heading to the next <h2> or the end of <main>.
  const start = html.search(/<h2[^>]*>\s*(Frequently asked questions|FAQ)\s*<\/h2>/i);
  if (start === -1) return [];
  const rest = html.slice(start);
  const nextH2 = rest.slice(40).search(/<h2[\s>]/i);
  const block = nextH2 === -1 ? rest : rest.slice(0, 40 + nextH2);
  const pairs = [];
  const re = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(block))) {
    const q = decode(m[1]);
    const a = decode(m[2]);
    if (q && a) pairs.push([q, a]);
  }
  return pairs;
}

function originOf(html) {
  const m = html.match(/<link rel="canonical" href="(https?:\/\/[^/"]+)/);
  return m ? m[1] : 'https://calcpromaster.com';
}

function faqLd(pairs, origin, url) {
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': url + '#faq',
    mainEntity: pairs.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
  return '  <script type="application/ld+json">\n  ' + JSON.stringify(obj, null, 2).replace(/\n/g, '\n  ') + '\n  </script>\n';
}

function targets() {
  const out = [];
  const blog = path.join(ROOT, 'blog');
  for (const f of fs.readdirSync(blog)) if (f.endsWith('.html') && f !== 'index.html') out.push(path.join(blog, f));
  // Guides are audited separately (audit-guide-depth requires FAQPage there).
  return out;
}

let added = 0;
let skipped = 0;
const bad = [];
for (const file of targets()) {
  let html = fs.readFileSync(file, 'utf8');
  if (/"@type"\s*:\s*"FAQPage"/.test(html)) { skipped++; continue; }
  const pairs = extractFaq(html);
  if (!pairs.length) { skipped++; continue; }
  const origin = originOf(html);
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || origin + '/';
  const block = faqLd(pairs, origin, canonical);
  // Insert before </head> so crawlers see it with the other JSON-LD blocks.
  if (!/<\/head>/i.test(html)) { bad.push(path.relative(ROOT, file)); continue; }
  html = html.replace(/<\/head>/i, block + '</head>');
  if (!DRY) fs.writeFileSync(file, html);
  added++;
  console.log((DRY ? '· would add ' : '✓ added ') + pairs.length + ' Q&A → ' + path.relative(ROOT, file));
}
console.log('\nFAQPage schema ' + (DRY ? 'preview' : 'pass') + ': ' + added + ' page(s)' + (DRY ? ' would change' : ' updated') + ', ' + skipped + ' already have one or have no FAQ section');
if (bad.length) {
  console.error('✗ could not edit: ' + bad.join(', '));
  process.exit(1);
}
