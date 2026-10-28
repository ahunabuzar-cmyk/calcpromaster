#!/usr/bin/env node
// ============================================================
// TEMPORARY — on-page keyword-placement measurement
// ------------------------------------------------------------
// Nothing in scripts/ checked the four placements the owner asked about, so this
// measures them across every indexable tool page in deploy/:
//
//   1. tool keyword in <title>
//   2. tool keyword in the FIRST content paragraph (<p class="tool-intro">)
//   3. tool keyword in at least one <h2>
//   4. tool keyword in at least one <img alt>
//
// Keyword = the tool's own name (what the page's title and H1 target) plus the
// head of its curated first keyword phrase.
//
// Usage: node scripts/audit-onpage-placement.cjs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const DATA_DIR = path.join(ROOT, 'js', 'data');

const FIXED_KEYS = {
  'food-nutrition.js': 'food', 'fitness-exercise.js': 'fitness',
  'auto-transport.js': 'auto', 'career-freelance.js': 'career',
  'home-garden.js': 'homegarden', 'tech-digital.js': 'tech',
  'parenting-family.js': 'family'
};

global.Charts = { donut: () => '', gauge: () => '', line: () => '', bar: () => '', overlay: () => '', spark: () => '' };
global.Security = { sanitizeHtml: (v) => String(v), validateInput: (v) => v, sanitizeCalcValue: (v, d) => d };
global.AdvancedCalc = global.AdvancedCalc || {};

const tools = [];
for (const file of fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.js') && !['data.js', 'data-loader.js'].includes(f))) {
  const cat = FIXED_KEYS[file] || file.replace('.js', '');
  const arr = require(path.join(DATA_DIR, file));
  if (!Array.isArray(arr)) continue;
  for (const t of arr) tools.push({ id: t.id, name: t.name || t.id, kw: t.kw || '', cat });
}

// Decode every entity a SERP/browser would, not just &amp;. The apostrophe is
// the one that mattered: escAttr() ships "Ohm's Law" as "Ohm&#39;s Law", and a
// decoder that leaves &#39; in place reads "ohm39s law" — which then looked like
// a missing keyword on 13 law/physics pages whose alt text was correct all
// along (measured 2026-10-27).
const visible = (s) => String(s)
  .replace(/<[^>]*>/g, ' ')
  .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
  .replace(/&quot;|&#0?34;|&#x22;/gi, '"')
  .replace(/&amp;/g, '&')
  .replace(/&nbsp;/g, ' ')
  .replace(/&#\d+;|&[a-z]+;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const norm = (s) => visible(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const stats = { pages: 0, missing: [], title: 0, firstPara: 0, h2: 0, alt: 0, headTerm: 0, titleTarget: 0, nameInH1: 0 };
const rows = [];
const h2Counts = new Map();

for (const t of tools) {
  const file = path.join(DEPLOY, t.cat, t.id, 'index.html');
  if (!fs.existsSync(file)) { stats.missing.push(t.cat + '/' + t.id); continue; }
  const html = fs.readFileSync(file, 'utf8');
  if (/name="robots"[^>]*noindex/i.test(html)) continue;
  stats.pages++;

  const body = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
  const h1 = (body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '';
  const introP = (body.match(/<p class="tool-intro"[^>]*>([\s\S]*?)<\/p>/) || [])[1] || '';
  const h2s = [...body.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => visible(m[1]));
  // Sitewide heading boilerplate: a heading string that appears on hundreds of
  // pages carries no unique signal, so it is counted here as well (the 2026-10-27
  // pass used this to find the generic "How does it work?" / "What does this
  // calculator do?" headings left behind on 718 / 569 pages).
  for (const h of h2s) if (h) h2Counts.set(h, (h2Counts.get(h) || 0) + 1);
  const alts = [...body.matchAll(/<img\b[^>]*\balt="([^"]*)"/g)].map((m) => visible(m[1]));

  const key = norm(t.name);
  // Head of the curated first keyword phrase — the qualifying long-tail the page
  // targets ("home loan emi calculator with monthly prepayment" → first 3 words).
  const headTerm = norm(String(t.kw).split(',')[0].split(/\s+/).slice(0, 3).join(' '));

  const inTitle = norm(title).includes(key);
  const inFirst = norm(introP).includes(key);
  const inH2 = h2s.some((h) => norm(h).includes(key));
  const inAlt = alts.some((a) => norm(a).includes(key));
  const hasHead = norm(title + ' ' + introP + ' ' + h2s.join(' ') + ' ' + alts.join(' ')).includes(headTerm);

  if (inTitle) stats.title++;
  if (inFirst) stats.firstPara++;
  if (inH2) stats.h2++;
  if (inAlt) stats.alt++;
  if (hasHead) stats.headTerm++;

  // The literal tool name is the WRONG pass/fail bar on its own: 72 pages carry
  // a deliberately keyword-targeted title ("Diesel Tank Range Calculator" for
  // the tool named "Fuel Tank Range Calculator") that shares the intent and the
  // head term, so flagging them would be measuring copy style, not a defect.
  // A page is only wrong when its title carries neither the name NOR the target
  // keyword's head phrase — that is the case worth fixing.
  const titleHasTarget = norm(title).includes(headTerm) || norm(title).includes(key);
  if (titleHasTarget) stats.titleTarget++;
  // The name's home is the <h1>; if it is missing there too, that IS a defect
  // (a title-only swap is a keyword variant, a title+H1 swap is a different page).
  const nameInH1 = norm(h1).includes(key);
  if (nameInH1) stats.nameInH1++;
  if (!titleHasTarget || !inFirst || !inH2 || !inAlt) {
    rows.push({ page: '/' + t.cat + '/' + t.id + '/', name: t.name, inTitle, titleHasTarget, nameInH1, inFirst, inH2, inAlt, h1: visible(h1).slice(0, 60), title: visible(title).slice(0, 70) });
  }
}

const pct = (n) => Math.round((n / stats.pages) * 1000) / 10;
console.log('on-page keyword placement — ' + stats.pages + ' indexable tool pages');
console.log('  target keyword in <title>    : ' + stats.titleTarget + ' (' + pct(stats.titleTarget) + '%)');
console.log('  literal tool name in <title> : ' + stats.title + ' (' + pct(stats.title) + '%)');
console.log('  tool name in the <h1>        : ' + stats.nameInH1 + ' (' + pct(stats.nameInH1) + '%)');
console.log('  keyword in first content <p> : ' + stats.firstPara + ' (' + pct(stats.firstPara) + '%)');
console.log('  keyword in an <h2>           : ' + stats.h2 + ' (' + pct(stats.h2) + '%)');
console.log('  keyword in an <img alt>      : ' + stats.alt + ' (' + pct(stats.alt) + '%)');
console.log('  curated head term present    : ' + stats.headTerm + ' (' + pct(stats.headTerm) + '%)');
if (stats.missing.length) console.log('  pages not found in deploy/   : ' + stats.missing.length + ' e.g. ' + stats.missing.slice(0, 5).join(', '));

// Group the failures by which placement is missing — that is what tells you
// whether this is a template gap (fix once) or a per-page problem.
const byShape = {};
for (const r of rows) {
  const shape = ['titleHasTarget', 'inFirst', 'inH2', 'inAlt'].filter((k) => !r[k]).join('+');
  byShape[shape] = (byShape[shape] || 0) + 1;
}
console.log('\nfailure shapes (missing placements):');
for (const [shape, n] of Object.entries(byShape).sort((a, b) => b[1] - a[1])) {
  console.log('  ' + String(n).padStart(5) + '  ' + shape);
}
console.log('\nsample failures:');
for (const r of rows.slice(0, 12)) {
  console.log('  ' + r.page.padEnd(42) + ' ' + ['title', 'firstP', 'h2', 'alt'].map((k, i) => {
    const ok = [r.titleHasTarget, r.inFirst, r.inH2, r.inAlt][i];
    return (ok ? '' : '!') + k;
  }).join(' '));
}
// Why a row is here matters: a title that names the same intent in other words
// (with the tool name in its <h1>) is a keyword variant, not a gap. Print the
// pair so that judgement is human, not assumed.
const variantOnly = rows.filter((r) => !r.titleHasTarget && r.nameInH1);
if (variantOnly.length) {
  console.log('\n' + variantOnly.length + ' of them are title keyword-variants (name is in the H1):');
  for (const r of variantOnly.slice(0, 10)) {
    console.log('  ' + r.page.padEnd(40) + ' name="' + r.name + '" title="' + r.title + '"');
  }
}
// Sitewide heading boilerplate — the biggest repeated <h2> strings across tool
// pages. Nav/footer labels always repeat (that is what a template is); what
// matters for duplicate content is a CONTENT heading repeating on every page.
const boiler = [...h2Counts.entries()].filter(([, n]) => n >= 100).sort((a, b) => b[1] - a[1]);
console.log('\n<h2> strings on 100+ of these pages: ' + boiler.length);
for (const [t, n] of boiler.slice(0, 12)) console.log('  ' + String(n).padStart(5) + '  ' + t.slice(0, 62));

const realGaps = rows.filter((r) => !r.nameInH1);
if (realGaps.length) {
  console.log('\n' + realGaps.length + ' page(s) miss the name in BOTH title and H1 — fix these:');
  for (const r of realGaps.slice(0, 20)) console.log('  ' + r.page);
}
fs.writeFileSync(path.join(ROOT, 'data', 'onpage-placement-audit.json'), JSON.stringify({ stats, rows }, null, 2));
console.log('\n💾 data/onpage-placement-audit.json (' + rows.length + ' pages with a gap)');
