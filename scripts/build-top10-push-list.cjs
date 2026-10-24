#!/usr/bin/env node
// ============================================================
// CalcProMaster — Top-10 push list (pos 11-20 aur 21-50 ka sach)
// ------------------------------------------------------------
// "Position 21+ par 65% impressions hain" — us par kaam karne se pehle ye
// script measure karti hai ki wahan **asli on-page defect** hai ya nahi.
//
// Wo farq ahem hai:
//   - agar page ki copy us query ko already cover karti hai (distinctive words
//     title/meta/answer mein hain), to title badalna churn hai — 11-20 par click
//     position ki wajah se nahi aata;
//   - agar title ek adhoori label list par khatam hota hai (`: Data`, `... &`)
//     ya query ka asli term missing hai (`ksa`), to wo **defect** hai aur wahan
//     likhna kaam karta hai.
//
// Reads : data/query-opportunity.json · js/seo-content.js (shipped copy)
// Writes: docs/TOP10-PUSH-LIST.md · data/top10-push-list.json
// Usage : node scripts/build-top10-push-list.cjs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const DOC = path.join(ROOT, 'docs', 'TOP10-PUSH-LIST.md');
const OUT = path.join(ROOT, 'data', 'top10-push-list.json');

// Words that say nothing about which page this is. "calculator" is in almost
// every title, so counting it as coverage flatters every page.
const GENERIC = new Set([
  'calculator', 'calculators', 'free', 'online', 'the', 'and', 'for', 'how', 'much', 'what',
  'is', 'to', 'of', 'in', 'my', 'do', 'i', 'you', 'your', 'with', 'on', 'does', 'are', 'a', 'an',
  'it', 'that', 'tool', 'best', 'near', 'calc'
]);
const isGeneric = (w) => GENERIC.has(w) || /^calculat/.test(w) || /^estimat/.test(w);

// Queries that want an explanation, not a form. A tool page ranking for these
// needs an answer section, not a different title.
const INFORMATIONAL = /(formula|how to|how do|how is|how are|why|meaning|definition|chart|table|vs |versus|explained|example|normal range)/;
const INFORMATIONAL_WORDS = new Set(['normal', 'range', 'meaning', 'formula', 'chart', 'table',
  'definition', 'example', 'explained', 'versus', 'vs', 'how', 'why', 'today']);

// A missing word is only a title-fix candidate if a person would read it as the
// page's own vocabulary. These are the tokens GSC actually returned that are
// numbers, someone's brand, or another product — putting them in a title would
// be keyword stuffing, not targeting. "investopedia" arrived as part of
// "investopedia cagr calculator"; it is a competitor brand, not this page's term.
const NOT_TITLE_VOCAB = new Set(['myusfinance', 'excel', 'squarespace', 'mc2', 'pcol', 'pkr', 'investopedia']);
const looksLikeVocab = (w) => /^[a-z]{3,}$/.test(w) && !NOT_TITLE_VOCAB.has(w);

// Titles that end where the generator ran out of room. These are user-visible
// defects on pages that already have impressions, so they are worth writing.
const TITLE_DEFECTS = [
  [/:\s(Data|Value|Number|Amount|Weight|Length|Width|Result|Total)$/, 'ends in a raw input label'],
  [/:\sBetween\b/, 'ends in "Between" (a label pair, cut)'],
  [/[&,|\/—-]\s*$/, 'ends in a stray joiner'],
  [/\b(Whtr|Pcod|Rmssd|Bmi|Bmr|Gpa|Emi|Sip|Hdl|Ldl|Vo2)\b/, 'bad initialism in a title'],
  [/^\S{1,10}:\s/, 'head is too short to identify the page'],
  [/\s{2,}/, 'double space']
];

// ---------- pure helpers (unit-tested) ----------

// Share of the query's DISTINCTIVE words that appear in the page's title, meta
// and answer block. Distinctive = drop generic calculator words and filler.
function strictCoverage(query, entry) {
  const words = (String(query || '').toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((w) => w.length > 2 && !isGeneric(w));
  if (!words.length) return { coverage: null, missing: [] };
  const hay = ((entry.title || '') + ' ' + (entry.metaDesc || '') + ' ' + (entry.aeo || '')).toLowerCase();
  // Search engines return hyphenated phrases as one glued token ("inhand salary
  // calculator ireland" for "in-hand pay"), so compare against the copy both as
  // written and with its hyphens dropped — otherwise a page that says "In-Hand"
  // is reported as missing the term it already states.
  const hayNoHyphen = hay.replace(/-/g, '');
  const missing = words.filter((w) => !hay.includes(w) && !hayNoHyphen.includes(w));
  return { coverage: 1 - missing.length / words.length, missing };
}

function titleDefect(title) {
  for (const [re, label] of TITLE_DEFECTS) if (re.test(String(title || ''))) return label;
  return null;
}

// What, if anything, is worth writing on this page.
function classifyRow(row) {
  if (row.titleDefect) return { verdict: 'fix-title', why: 'title defect: ' + row.titleDefect };
  if (row.coverage === null) return { verdict: 'no-query', why: 'koi readable query nahi' };
  const missing = row.missing || [];
  const vocab = missing.filter(looksLikeVocab);
  // An explanation query is not fixed by a title: the missing word is often the
  // question itself ("normal", "range", "meaning"), not a keyword.
  if (row.informational && missing.some((w) => INFORMATIONAL_WORDS.has(w))) {
    return { verdict: 'answer-section', why: 'query explanation maang rahi hai (' + missing.join(', ') + ') — title se nahi, jawab se fix hoti hai' };
  }
  if (vocab.length && row.coverage < 0.8) {
    return { verdict: 'add-term', why: 'query ka asli term missing: ' + vocab.join(', ') };
  }
  if (missing.length && row.coverage < 0.8) {
    return { verdict: 'not-a-title-fix', why: 'missing token title ka kaam nahi (' + missing.join(', ') + ')' };
  }
  if (row.informational) {
    return { verdict: 'answer-section', why: 'query explanation maang rahi hai, form nahi' };
  }
  return { verdict: 'already-targets', why: 'copy already query cover karti hai — title badalna churn hai' };
}

function loadSeo() {
  const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'seo-content.js'), 'utf8'), sandbox);
  return sandbox.window.TOOL_SEO || {};
}

// ---------- main ----------

function main() {
  const oppPath = path.join(ROOT, 'data', 'query-opportunity.json');
  if (!fs.existsSync(oppPath)) {
    console.error('✖ data/query-opportunity.json missing — run: node scripts/build-query-opportunity.cjs');
    process.exit(1);
  }
  const opp = JSON.parse(fs.readFileSync(oppPath, 'utf8'));
  const seo = loadSeo();

  // Only tool pages: a guide's last path segment is not a tool id.
  const rows = [];
  for (const r of opp.rows || []) {
    if (/^\/(guides|blog|compare)\b/.test(String(r.path))) continue;
    if (!(r.position >= 11)) continue;
    if ((r.impressions || 0) < 5) continue;
    const seg = String(r.path).replace(/\/+$/, '').split('/').filter(Boolean);
    const id = seg[seg.length - 1];
    const entry = seo[id];
    if (!entry) continue;
    const queries = (r.queries || []).slice().sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
    const best = queries[0] || { query: '' };
    const { coverage, missing } = strictCoverage(best.query, entry);
    const row = {
      path: r.path,
      id,
      band: r.position <= 20 ? 'striking' : 'deep',
      position: Math.round(r.position * 10) / 10,
      impressions: r.impressions || 0,
      clicks: r.clicks || 0,
      title: entry.title || '',
      metaDesc: entry.metaDesc || '',
      bestQuery: best.query,
      bestQueryImpressions: best.impressions || 0,
      coverage,
      missing,
      informational: INFORMATIONAL.test(String(best.query).toLowerCase()),
      titleDefect: titleDefect(entry.title)
    };
    row.verdict = classifyRow(row);
    rows.push(row);
  }
  rows.sort((a, b) => b.impressions - a.impressions);

  const actionable = rows.filter((r) => r.verdict.verdict === 'fix-title' || r.verdict.verdict === 'add-term');
  const alreadyTargets = rows.filter((r) => r.verdict.verdict === 'already-targets');
  const deepCovered = alreadyTargets.filter((r) => r.band === 'deep');
  const answerSection = rows.filter((r) => r.verdict.verdict === 'answer-section');
  const notTitleFix = rows.filter((r) => r.verdict.verdict === 'not-a-title-fix');
  // Sitewide title defects are cheap to see and cost nothing to know about, even
  // where the page has no impressions yet.
  const allDefects = Object.entries(seo).filter(([, e]) => titleDefect(e.title))
    .map(([id, e]) => ({ id, title: e.title, defect: titleDefect(e.title) }));

  fs.writeFileSync(OUT, JSON.stringify({
    generatedAt: new Date().toISOString(),
    window: opp.window,
    thresholds: { minImpressions: 5, minPosition: 11 },
    counts: {
      rows: rows.length,
      actionable: actionable.length,
      alreadyTargets: alreadyTargets.length,
      deepCovered: deepCovered.length,
      answerSection: answerSection.length,
      notTitleFix: notTitleFix.length,
      sitewideTitleDefects: allDefects.length
    },
    rows
  }, null, 2) + '\n');

  // ---- report ----
  const L = [];
  const imp = (a) => a.reduce((s, r) => s + r.impressions, 0).toLocaleString('en-US');
  L.push('# Top-10 push list — pos 11-20 aur 21-50');
  L.push('');
  L.push('> Auto-generated by `node scripts/build-top10-push-list.cjs` · GSC window ' + (opp.window ? opp.window.startDate + ' → ' + opp.window.endDate : '?') + '.');
  L.push('> Threshold: position ≥ 11 aur ≥ 5 impressions.');
  L.push('');
  L.push('## Pehle faisla: yahan copy ka kaam bacha hai ya nahi');
  L.push('');
  L.push('| | pages | impressions | matlab |');
  L.push('|---|---|---|---|');
  L.push('| copy already query cover karti hai | ' + alreadyTargets.length + ' | ' + imp(alreadyTargets) + ' | title badalna churn hai — click position ki wajah se nahi aata |');
  L.push('| asli on-page defect (title / missing term) | ' + actionable.length + ' | ' + imp(actionable) + ' | yahan likhna kaam karta hai |');
  L.push('| explanation wali query (answer section chahiye) | ' + answerSection.length + ' | ' + imp(answerSection) + ' | title se nahi, page par jawab likhne se |');
  L.push('| missing token title ka kaam nahi (number/brand/shorthand) | ' + notTitleFix.length + ' | ' + imp(notTitleFix) + ' | title mein thoosna keyword stuffing hai |');
  L.push('');
  L.push('**Seedhi baat:** in ' + rows.length + ' pages mein se ' + alreadyTargets.length + ' par copy pehle se sahi hai. Yani "position 21+ par 65% impressions" ka matlab ye **nahi** hai ki wahan 65% copy kharab hai — copy theek hai, position ki wajah se click nahi aa raha, aur position links + waqt se aati hai.');
  L.push('');
  L.push('## Asli defects (inpar likhna worth hai)');
  L.push('');
  L.push('| page | pos | impressions | clicks | verdict | detail | title aaj |');
  L.push('|---|---|---|---|---|---|---|');
  for (const r of actionable) {
    L.push('| `' + r.path + '` | ' + r.position + ' | ' + r.impressions + ' | ' + r.clicks + ' | ' + r.verdict.verdict + ' | ' + r.verdict.why + ' | `' + r.title + '` |');
  }
  if (!actionable.length) L.push('| _koi nahi_ | | | | | | |');
  L.push('');
  L.push('## Jahan copy already theek hai (yahan chhedna nuksan hai)');
  L.push('');
  L.push('| page | pos | impressions | clicks | best query | coverage |');
  L.push('|---|---|---|---|---|---|');
  for (const r of alreadyTargets.slice(0, 25)) {
    L.push('| `' + r.path + '` | ' + r.position + ' | ' + r.impressions + ' | ' + r.clicks + ' | ' + String(r.bestQuery).slice(0, 34) + ' | ' + (r.coverage === null ? '—' : Math.round(r.coverage * 100) + '%') + ' |');
  }
  L.push('');
  L.push('0 clicks ke saath 100% coverage ka matlab: snippet galat nahi hai, **position** galat hai. Inpar effort link/authority side jaana chahiye, naya title nahi.');
  L.push('');
  L.push('## Intent mismatch: explanation wali query, form wala page');
  L.push('');
  const mismatch = rows.filter((r) => r.verdict.verdict === 'answer-section');
  L.push(mismatch.length + ' pages aisi query par impress kar rahe hain jo jawab maangti hai (formula / how / chart / normal range / meaning). Yahan title ke bajaye page par ek answer section chahiye — user form dhoondhne nahi aaya.');
  L.push('');
  if (mismatch.length) {
    L.push('| page | pos | impressions | query |');
    L.push('|---|---|---|---|');
    for (const r of mismatch.slice(0, 20)) L.push('| `' + r.path + '` | ' + r.position + ' | ' + r.impressions + ' | ' + String(r.bestQuery).slice(0, 44) + ' |');
    L.push('');
  }
  L.push('## Sitewide title defects (impressions ho ya na ho)');
  L.push('');
  L.push('Poore site par **' + allDefects.length + '** titles aise hain jo generator ke adhoore label par khatam hote hain. Ye user-visible defect hain, aur inpar likhna kisi ranking experiment ki zaroorat nahi.');
  L.push('');
  if (allDefects.length) {
    L.push('| id | title | defect |');
    L.push('|---|---|---|');
    for (const d of allDefects.slice(0, 20)) L.push('| `' + d.id + '` | `' + d.title + '` | ' + d.defect + ' |');
    if (allDefects.length > 20) L.push('| _… +' + (allDefects.length - 20) + ' more_ | | |');
    L.push('');
  }
  L.push('## Deep band (21-50) ka sach');
  L.push('');
  L.push(deepCovered.length + ' pages position 21-50 par hain **aur** unki copy already query cover karti hai. Un ka koi on-page defect nahi hai. Is band mein impressions jama hone ki wajah position hai, aur position do cheezon se aati hai: indexed pages se links, aur waqt. Copy se nahi.');
  L.push('');
  fs.writeFileSync(DOC, L.join('\n'));

  console.log('pos>=11, >=5 impressions: ' + rows.length + ' tool pages');
  console.log('actionable (title defect / missing term): ' + actionable.length + ' — ' + imp(actionable) + ' impressions');
  console.log('already targets the query: ' + alreadyTargets.length + ' — ' + imp(alreadyTargets) + ' impressions');
  console.log('report: docs/TOP10-PUSH-LIST.md · data/top10-push-list.json');
}

module.exports = { strictCoverage, titleDefect, classifyRow, isGeneric, TITLE_DEFECTS };

if (require.main === module) main();
