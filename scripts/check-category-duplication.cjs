#!/usr/bin/env node
// ============================================================
// CalcProMaster — Category / comparison-hub duplication gate
// ------------------------------------------------------------
// Kyun: har category ke do page hote hain — /<cat>/ (list) aur /hub/<cat>/
// (comparison). Dono pehle methodology note, category FAQ aur wahi 48-card
// catalog render karte the, is liye ek pair ~79.8% identical 5-grams tha.
// Google ne khud ek pair ko consolidate kar diya tha ("Alternate page with
// proper canonical tag").
//
// docs/DUPLICATE-HUBS-FIX.md ke baad block-ownership badal gayi hai. Ye gate
// us ownership ko LOCK karta hai, taake koi baad mein block wapas dono jagah
// render na kar de:
//
//   1. BLOCK OWNERSHIP (per pair, har ek must-pass)
//      · FAQ          → /<cat>/ par    (aur /hub/<cat>/ par nahi)
//      · methodology  → /<cat>/ par    (aur hub par nahi)
//      · catalog grid → /<cat>/ par    (hub par comparison table)
//      · comparison table → /hub/<cat>/ par (category page par nahi)
//   2. OVERLAP: 5-gram Jaccard (visible text) <= MAX_OVERLAP
//   3. UNIQUE TEXT: dono pages ke apne paas minimum unique 5-grams
//
// Usage: node scripts/check-category-duplication.cjs [--json]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const HUBS = path.join(DEPLOY, 'hub');
const CategoryDepth = require(path.join(ROOT, 'js', 'category-depth.js'));
const CategoryMethodology = require(path.join(ROOT, 'js', 'category-methodology.js'));

// Thresholds: 2026-10-12 fix ke baad measured mean 54.3% / max 60.6% hai.
// 0.65 par fail — itni headroom rakhi hai ke shabd badalne se gate jhoot na
// bole, magar purani 79.8% wali halat wapas na aa sake.
const MAX_OVERLAP = 0.65;
const MIN_UNIQUE = 150; // unique 5-grams per page
const NGRAM = 5;

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// The rendered HTML entity-encodes " and & (a FAQ question like
// 'Why does a "1 TB" drive show less space?' ships as &quot;), so block-ownership
// checks compare against a decoded copy of the HTML, not the raw bytes.
function decodeEntities(html) {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function shingles(text, n = NGRAM) {
  const words = text.toLowerCase().split(' ');
  const set = new Set();
  for (let i = 0; i + n <= words.length; i++) set.add(words.slice(i, i + n).join(' '));
  return set;
}

function jaccard(a, b) {
  let inter = 0;
  for (const s of a) if (b.has(s)) inter++;
  const uni = new Set([...a, ...b]).size;
  return uni === 0 ? 0 : inter / uni;
}

function run() {
  const jsonOut = process.argv.includes('--json');
  if (!fs.existsSync(HUBS)) {
    console.error('  ✗ deploy/hub missing — run `node scripts/ssg-pages.cjs` first.');
    return 1;
  }
  const cats = fs.readdirSync(HUBS).filter((c) => fs.existsSync(path.join(HUBS, c, 'index.html')));
  const rows = [];
  const failures = [];

  for (const cat of cats) {
    const catFile = path.join(DEPLOY, cat, 'index.html');
    const hubFile = path.join(HUBS, cat, 'index.html');
    if (!fs.existsSync(catFile)) {
      failures.push(cat + ': category page missing');
      continue;
    }
    const catHtml = fs.readFileSync(catFile, 'utf8');
    const hubHtml = fs.readFileSync(hubFile, 'utf8');
    // Decoded copies are ONLY used for the presence checks below; the overlap
    // metric runs on the raw markup so it cannot be gamed by entity choice.
    const catPlain = decodeEntities(catHtml);
    const hubPlain = decodeEntities(hubHtml);
    const catText = visibleText(catHtml);
    const hubText = visibleText(hubHtml);
    const catSet = shingles(catText);
    const hubSet = shingles(hubText);
    const overlap = jaccard(catSet, hubSet);
    let inter = 0;
    for (const s of catSet) if (hubSet.has(s)) inter++;
    const catUnique = catSet.size - inter;
    const hubUnique = hubSet.size - inter;

    const depth = CategoryDepth.depthFor(cat);
    const faqQuestions = depth ? depth.faqs.map((f) => f.q) : [];
    const methodology = CategoryMethodology.methodologyFor
      ? CategoryMethodology.methodologyFor(cat)
      : null;

    // Block ownership — the actual contract of the fix.
    const faqOnCat = faqQuestions.length > 0 && faqQuestions.every((q) => catPlain.includes(q));
    const faqOnHub = faqQuestions.some((q) => hubPlain.includes(q));
    const methodOnCat = methodology ? catPlain.includes(methodology) : true;
    const methodOnHub = methodology ? hubPlain.includes(methodology) : false;
    const gridOnCat = catHtml.includes('class="tools-grid"');
    const gridOnHub = hubHtml.includes('class="hub-tools-grid"') || hubHtml.includes('class="tools-grid"');
    const tableOnHub = hubHtml.includes('hub-compare-table');
    const tableOnCat = catHtml.includes('hub-compare-table');

    const problems = [];
    if (!faqOnCat) problems.push('FAQ missing from /' + cat + '/');
    if (faqOnHub) problems.push('FAQ duplicated on /hub/' + cat + '/');
    if (!methodOnCat) problems.push('methodology missing from /' + cat + '/');
    if (methodOnHub) problems.push('methodology duplicated on /hub/' + cat + '/');
    if (!gridOnCat) problems.push('category catalog grid missing from /' + cat + '/');
    if (gridOnHub) problems.push('catalog grid duplicated on /hub/' + cat + '/');
    if (!tableOnHub) problems.push('comparison table missing from /hub/' + cat + '/');
    if (tableOnCat) problems.push('comparison table duplicated on /' + cat + '/');
    if (overlap > MAX_OVERLAP) {
      problems.push('overlap ' + (overlap * 100).toFixed(1) + '% > ' + (MAX_OVERLAP * 100).toFixed(0) + '%');
    }
    if (catUnique < MIN_UNIQUE) problems.push('/' + cat + '/ has only ' + catUnique + ' unique 5-grams');
    if (hubUnique < MIN_UNIQUE) problems.push('/hub/' + cat + '/ has only ' + hubUnique + ' unique 5-grams');

    if (problems.length) failures.push(cat + ': ' + problems.join('; '));
    rows.push({
      category: cat,
      overlapPct: +(overlap * 100).toFixed(1),
      catWords: catText.split(' ').length,
      hubWords: hubText.split(' ').length,
      catUnique5: catUnique,
      hubUnique5: hubUnique,
      faqOnCat,
      methodOnHub,
      tableOnHub,
      ok: problems.length === 0,
    });
  }

  const mean = rows.length ? rows.reduce((s, r) => s + r.overlapPct, 0) / rows.length : 0;
  const max = rows.reduce((m, r) => Math.max(m, r.overlapPct), 0);
  const result = {
    ranAt: new Date().toISOString(),
    pairs: rows.length,
    maxOverlapPct: +max.toFixed(1),
    meanOverlapPct: +mean.toFixed(1),
    thresholdPct: MAX_OVERLAP * 100,
    minUnique5: MIN_UNIQUE,
    fail: failures.length > 0,
    failures,
    rows,
  };

  if (jsonOut) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('  category      words(cat/hub)  overlap   unique(cat/hub)  blocks');
    for (const r of rows) {
      console.log(
        '  ' + r.category.padEnd(12) +
        String(r.catWords).padStart(5) + '/' + String(r.hubWords).padEnd(6) +
        (r.overlapPct.toFixed(1) + '%').padStart(8) +
        String(r.catUnique5).padStart(8) + '/' + String(r.hubUnique5).padEnd(6) +
        (r.ok ? '   ok' : '   FAIL')
      );
    }
    console.log(
      '  ' + String(rows.length) + ' pairs · mean overlap ' + mean.toFixed(1) +
      '% · max ' + max.toFixed(1) + '% (limit ' + (MAX_OVERLAP * 100).toFixed(0) + '%)'
    );
    if (failures.length) {
      console.error('\n  ✗ category duplication gate FAILED:');
      failures.forEach((f) => console.error('    · ' + f));
      return 1;
    }
    console.log('  ✓ every category/hub pair has one owner per block and overlap within budget');
  }
  return failures.length ? 1 : 0;
}

if (require.main === module) process.exit(run());
module.exports = { run, visibleText, shingles, jaccard, MAX_OVERLAP, MIN_UNIQUE };
