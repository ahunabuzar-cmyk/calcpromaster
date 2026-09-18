#!/usr/bin/env node
/* Title/meta intent-overlap audit — follow-up to keyword cannibalization (C2).
 *
 * Input:  scripts/.keywords.jsonl  (run scripts/extract-keywords.cjs first —
 *         one JSON row per deployed page: url, title, meta, h1, kw)
 * Output: docs/INTENT-AUDIT.md
 *
 * Checks (all deterministic, machine-extracted — nothing hand-added):
 *   I1 intent clusters:  2+ indexable pages whose normalized titles share a
 *      3-word content n-gram (stopwords/digits dropped before n-gramming).
 *      NOT every cluster is a bug: guide pages covering a calculator topic are
 *      by design (distinct intent + internal links). Tool↔tool clusters are
 *      the ones to review.
 *   I2 meta cannibalization: identical normalized meta description on 2+
 *      indexable pages (digits kept — templates with different sample values
 *      are similarity, not duplication).
 *   I3 thin metas: meta description < 50 chars (unused SERP space).
 *   I4 near-duplicate titles: titles differing by exactly one word
 *      (deletion-variant match) — strongest title-level cannibalization signal.
 *   Stats: title/meta length distribution vs SERP display targets.
 *
 * Honest limits: n-gram overlap is a heuristic — a shared phrase is evidence,
 * not a verdict. Whether a cluster hurts depends on SERP + content, which this
 * report cannot see. GSC query data (service account) is the real judge.
 * Run: node scripts/audit-title-intent.cjs   (exit 0 — it is a report)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'INTENT-AUDIT.md');

const pages = fs.readFileSync(path.join(__dirname, '.keywords.jsonl'), 'utf8')
  .trim().split('\n').map(l => JSON.parse(l))
  .filter(p => p.title); // rows without a title cannot cannibalize anything

// Same normalization family as audit-keyword-quality.cjs
const STOP = new Set(['free', 'online', 'best', 'with', 'for', 'and', 'the', 'a',
  'an', 'in', 'to', 'of', 'how', 'calculator', 'calc', 'converter', 'generator',
  'tool', 'estimator', 'solver', 'counter', 'checker', 'by', 'is', 'it', 'your',
  'vs', 'per', 'or', 'at', 'on']);
// Hub-template boilerplate: grams built from these are site chrome, not intent.
const BOILER = new Set(['calcpro', 'comparison', 'calculators']);
// Generic product heads: a template title differing only in its first word and
// containing one of these is a naming pattern ("X Converter: Value"), not a
// cannibalization pair.
const HEADS = new Set(['calculator', 'calc', 'converter', 'generator', 'tool',
  'estimator', 'solver', 'counter', 'checker', 'calculators', 'converters',
  'generators', 'tools', 'estimators', 'solvers', 'counters', 'checkers']);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const stripSuffix = (t) => t.replace(/\s*\|\s*CalcProMaster.*$/, '').trim();
const contentTokens = (s) => norm(s).split(' ')
  .filter(w => w.length > 1 && !/^\d+$/.test(w) && !STOP.has(w));
const kindOf = (url) =>
  /^\/(guides|blog)\//.test(url) ? 'guide' :
  (url === '/hub' || url.startsWith('/hub/')) ? 'hub' :
  /^\/[a-z-]+\/$/.test(url) ? 'hub' : 'tool';

const rows = pages.map(p => ({
  url: p.url,
  kind: kindOf(p.url),
  title: stripSuffix(p.title),
  meta: (p.meta || '').trim(),
}));
for (const r of rows) r.tn = norm(r.title);

// ---- I1: 3-gram intent clusters (union-find over shared n-grams) ----
const parent = new Map(rows.map((r, i) => [i, i]));
const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };

const gramPages = new Map(); // gram -> Set<rowIndex>
rows.forEach((r, i) => {
  const t = contentTokens(r.title);
  const grams = new Set();
  for (let k = 0; k + 3 <= t.length; k++) {
    const g = t.slice(k, k + 3);
    if (g.some(w => BOILER.has(w))) continue; // hub-chrome grams never cluster
    grams.add(g.join(' '));
  }
  for (const g of grams) {
    if (!gramPages.has(g)) gramPages.set(g, new Set());
    gramPages.get(g).add(i);
  }
});
for (const set of gramPages.values()) {
  if (set.size < 2) continue;
  const it = set.values(); const first = it.next().value;
  for (const i of set) union(first, i);
}
const clusters = new Map(); // root -> Set<rowIndex>
rows.forEach((r, i) => {
  const root = find(i);
  if (!clusters.has(root)) clusters.set(root, new Set());
  clusters.get(root).add(i);
});
const sharedGramsOf = (idxSet) => [...gramPages.entries()]
  .filter(([, s]) => s.size > 1 && [...s].every(i => idxSet.has(i)))
  .map(([g, s]) => [g, s.size])
  .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
const intentClusters = [...clusters.entries()]
  .map(([, idxSet]) => ({ size: idxSet.size, idxSet, grams: sharedGramsOf(idxSet) }))
  .filter(c => c.size > 1 && c.grams.length > 0)
  .sort((a, b) => b.size - a.size || (a.grams[0]?.[0] || '').localeCompare(b.grams[0]?.[0] || ''));
const dirOf = (url) => (url.split('/')[1] || '').toLowerCase();
const clusterType = (c) => {
  const kinds = [...c.idxSet].map(i => rows[i].kind);
  const toolIdx = [...c.idxSet].filter(i => rows[i].kind === 'tool');
  if (toolIdx.length >= 2) {
    // Cross-category tool overlap = real cannibalization risk (two categories
    // targeting the same query). Same-category = topical neighborhood (usually fine).
    const dirs = new Set(toolIdx.map(i => dirOf(rows[i].url)));
    return dirs.size > 1 ? '⚠️ cross-category tools' : 'ℹ️ same-category tools';
  }
  if (toolIdx.length === 1 && kinds.includes('guide')) return 'ℹ️ guide↔tool';
  if (kinds.every(k => k === 'guide' || k === 'blog')) return 'ℹ️ guide↔guide';
  return 'ℹ️ mixed';
};

// ---- I2: meta cannibalization (exact normalized match, digits kept) ----
const byMeta = new Map();
rows.forEach((r, i) => {
  if (!r.meta) return;
  const m = norm(r.meta);
  if (!byMeta.has(m)) byMeta.set(m, []);
  byMeta.get(m).push(i);
});
const dupMetas = [...byMeta.entries()].filter(([, v]) => v.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

// ---- I3: thin metas ----
const thinMetas = rows.filter(r => r.meta && r.meta.length < 50)
  .sort((a, b) => a.meta.length - b.meta.length);
const noMetas = rows.filter(r => !r.meta);

// ---- I4: near-duplicate titles (differ by exactly one word) ----
const delVariants = new Map(); // deletion key -> Set<rowIndex>
rows.forEach((r, i) => {
  const t = r.tn.split(' ').filter(Boolean);
  if (t.length < 3) return;
  for (let k = 0; k < t.length; k++) {
    const key = t.slice(0, k).concat(t.slice(k + 1)).join(' ');
    if (!delVariants.has(key)) delVariants.set(key, new Set());
    delVariants.get(key).add(i);
  }
});
const nearPairs = new Set();
for (const set of delVariants.values()) {
  if (set.size < 2) continue;
  const arr = [...set].sort((a, b) => a - b);
  for (let x = 0; x < arr.length; x++)
    for (let y = x + 1; y < arr.length; y++) {
      const A = rows[arr[x]].tn.split(' '), B = rows[arr[y]].tn.split(' ');
      // Template titles like "X Converter: Value" differ only in the category
      // word and share a generic head — naming pattern, not cannibalization.
      const rest = B.slice(1);
      if (A[0] !== B[0] && rest.some(w => HEADS.has(w))) continue;
      nearPairs.add(`${arr[x]}|${arr[y]}`);
    }
}
const nearDups = [...nearPairs]
  .map(k => { const [a, b] = k.split('|').map(Number); return [a, b]; })
  .sort((x, y) => rows[x[0]].tn.localeCompare(rows[y[0]].tn) || x[1] - y[1]);

// ---- Stats ----
const dist = (vals, edges) => { const out = []; for (const [lo, hi] of edges) out.push(vals.filter(v => v >= lo && v <= hi).length); return out; };
const titleLens = rows.map(r => r.title.length);
const metaLens = rows.filter(r => r.meta).map(r => r.meta.length);

// ---- Report ----
const L = [];
const push = (...a) => L.push(...a);
const tt = (rows_, cells) => '| ' + cells.join(' | ') + ' |';
push('# Title / Meta Intent-Overlap Audit', '',
  'Machine-extracted follow-up to `docs/KEYWORD-AUDIT.md` (which fixed keyword-level',
  'cannibalization, C2 = 0). This audits the next layer up: **titles and meta',
  'descriptions** that may still pull the same search intent onto multiple pages.', '',
  'Generated by `scripts/audit-title-intent.cjs` from the deployed pages — deterministic,', '');

push('## TL;DR', '');
push('| Check | Result |');
push('|---|---|');
push('| I1 · Title intent clusters (2+ pages share a 3-word phrase) | ' + intentClusters.length + ' clusters (' + intentClusters.filter(c => clusterType(c).startsWith('⚠️')).length + ' cross-category tools) |');
push('| I2 · Meta description cannibalization | ' + (dupMetas.length ? '⚠️ ' + dupMetas.length + ' shared descriptions' : '✅ none') + ' |');
push('| I3 · Thin (<50 char) / missing metas | ' + thinMetas.length + ' / ' + noMetas.length + ' |');
push('| I4 · Near-duplicate titles (1-word diff) | ' + nearDups.length + ' pairs |');
push('| Pages audited | ' + rows.length + ' (tool ' + rows.filter(r => r.kind === 'tool').length + ' · guide/blog ' + rows.filter(r => r.kind === 'guide').length + ' · hub ' + rows.filter(r => r.kind === 'hub').length + ') |');
push('');

push('## I1 — Title intent clusters', '',
  'Pages whose titles share a 3-word content phrase. **Review the tool↔tool ones** —',
  'guide↔tool overlap is by design (guides link the calculator, intent differs).', '');
if (!intentClusters.length) push('No clusters found.');
else {
  push('| Shared phrase(s) | Type | Pages |');
  push('|---|---|---|');
  for (const c of intentClusters.slice(0, 40)) {
    const members = [...c.idxSet].map(i => '`' + rows[i].url + '`').join(', ');
    push('| ' + c.grams.slice(0, 3).map(g => g[0]).join('; ') + ' | ' + clusterType(c) + ' | ' + members + ' |');
  }
  if (intentClusters.length > 40) push('', '… ' + (intentClusters.length - 40) + ' more clusters omitted.');
}
push('');

push('## I2 — Meta description cannibalization', '',
  'Identical normalized meta text on multiple pages.', '');
if (!dupMetas.length) push('✅ none — every indexable page has a distinct meta description.');
else for (const [m, idxs] of dupMetas.slice(0, 25)) push('- `' + m.slice(0, 90) + (m.length > 90 ? '…' : '') + '` → ' + idxs.map(i => '`' + rows[i].url + '`').join(', '));
push('');

push('## I3 — Thin / missing meta descriptions', '', 'Target: 70–160 chars.', '');
if (!thinMetas.length && !noMetas.length) push('✅ none.');
else {
  for (const r of thinMetas.slice(0, 15)) push('- `' + r.url + '` — ' + r.meta.length + ' chars: "' + r.meta.slice(0, 60) + (r.meta.length > 60 ? '…' : '') + '"');
  if (thinMetas.length > 15) push('- … ' + (thinMetas.length - 15) + ' more.');
  for (const r of noMetas.slice(0, 10)) push('- `' + r.url + '` — **no meta description**');
}
push('');

push('## I4 — Near-duplicate titles (differ by one word)', '', 'Highest title-level cannibalization risk — SERPs merge these.', '');
if (!nearDups.length) push('✅ none.');
else {
  push('| Title A | Title B |');
  push('|---|---|');
  for (const [a, b] of nearDups.slice(0, 40)) push('| ' + rows[a].title + ' (`' + rows[a].url + '`) | ' + rows[b].title + ' (`' + rows[b].url + '`) |');
  if (nearDups.length > 40) push('', '… ' + (nearDups.length - 40) + ' more pairs omitted.');
}
push('');

push('## Length stats', '');
push('| Metric | <30 | 30–60 | 61–70 | >70 |');
push('|---|---|---|---|---|');
const td = dist(titleLens, [[0, 29], [30, 60], [61, 70], [71, 1e9]]);
push('| Title chars | ' + td.join(' | ') + ' |');
push('| | <50 | 50–69 | 70–160 | >160 |');
push('|---|---|---|---|---|');
const md = dist(metaLens, [[0, 49], [50, 69], [70, 160], [161, 1e9]]);
push('| Meta chars | ' + md.join(' | ') + ' |');
push('');

push('## Method & honest limits', '',
  '- Normalization: lowercase, punctuation→space, boilerplate words dropped',
  '  (calculator/converter/free/…), digits dropped for I1 clustering only.',
  '- I1 is a heuristic: a shared phrase is evidence of overlapping intent, not proof',
  '  of harm. Verify clusters against live SERPs before rewriting titles.',
  '- The real arbiter is GSC query→page data (see `docs/api-credentials-setup.md`):',
  '  when one query alternates between two pages, Google is telling you they collide.',
  '- Regenerate with `npm run keywords:fresh`; enforced fresh by `npm run keywords:check`.', '');

fs.writeFileSync(OUT, L.join('\n') + '\n');
const riskyClusters = intentClusters.filter(c => clusterType(c).startsWith('⚠️')).length;
console.log(`wrote ${path.relative(ROOT, OUT)} - ${rows.length} pages | I1 clusters: ${intentClusters.length} (${riskyClusters} cross-category) | I2 meta dupes: ${dupMetas.length} | I3 thin metas: ${thinMetas.length} | I4 near-dup titles: ${nearDups.length}`);
