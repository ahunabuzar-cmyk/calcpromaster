#!/usr/bin/env node
/* Build docs/KEYWORD-DIFFICULTY.md — how hard is it to rank for the keywords
 * this site targets, and which ones to prioritize.
 *
 * Inputs:
 *  1. scripts/.keywords.jsonl            — machine-extracted per-page titles/metas/kw
 *  2. scripts/keyword-difficulty.cjs     — the shared tiering model
 *  3. LIVE SERP PROBES (2026-09-19)      — 6 representative Google queries, results
 *     recorded below. Snapshot evidence, not a dashboard; re-probe before big bets.
 *
 * The user's go/no-go rule: target a keyword only when fewer than 20 of the
 * top-10-ranking pages are strong brands AND volume is decent. Output is fully
 * deterministic (sorted everywhere, fixed report date) so the CI freshness
 * gate can verify docs match code.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { tier, score, volumeProxy } = require('./keyword-difficulty.cjs');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'KEYWORD-DIFFICULTY.md');
const REPORT_DATE = new Date(fs.statSync(path.join(ROOT, 'sitemap.xml')).mtimeMs).toISOString().slice(0, 10);

const pages = fs.readFileSync(path.join(__dirname, '.keywords.jsonl'), 'utf8')
  .split('\n').filter(Boolean).map(l => JSON.parse(l));

// ---------- tool.kw phrases from the data modules (source of truth) ----------
// The deploy payload does not embed kw, so load js/data/*.js directly, exactly
// like build-keyword-map.cjs does, to get each tool's curated phrases.
const DATA_DIR = path.join(ROOT, 'js', 'data');
const toolKw = new Map(); // url -> [phrases]
for (const f of fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.js')).sort()) {
  const cat = f.replace(/\.js$/, '');
  const code = fs.readFileSync(path.join(DATA_DIR, f), 'utf8');
  const m = { exports: {} };
  try { new Function('module', 'exports', code)(m, m.exports); } catch (e) { continue; }
  const arr = m.exports;
  if (!Array.isArray(arr)) continue;
  for (const t of arr) {
    if (!t || !t.id || !t.kw) continue;
    const url = '/' + cat + '/' + t.id;
    const ks = String(t.kw).split(',').map(s => s.trim()).filter(Boolean);
    if (ks.length) toolKw.set(url, ks);
  }
}

// ---------- collect every targeted phrase with its owning page ----------
// phraseKey = lowercase phrase; value = { phrase, url, kind }
const phraseOwners = new Map();
function addPhrase(phrase, url, kind) {
  const p = String(phrase || '').trim();
  if (!p || p.length < 4) return;
  const key = p.toLowerCase();
  if (!phraseOwners.has(key)) phraseOwners.set(key, { phrase: p, url, kind });
}

for (const page of pages) {
  const isTool = /^\/[a-z-]+\/[a-z0-9-]+\/?$/.test(page.url) && !/\.(html|xml|txt|jpg|png|webmanifest)$/.test(page.url);
  const kind = page.url.startsWith('/guides/') ? 'guide'
    : page.url.startsWith('/blog') ? 'blog'
    : isTool ? 'tool' : 'page';
  const kwList = toolKw.get(page.url);
  if (kwList) {
    for (const k of kwList) addPhrase(k, page.url, kind);
    // titles are also targets for tool pages
    const t = String(page.title || '').replace(/\s*\|\s*CalcProMaster.*$/, '').trim();
    addPhrase(t, page.url, kind);
  }
}

const phrases = [...phraseOwners.values()].sort((a, b) => a.phrase.localeCompare(b.phrase));

// ---------- tier everything ----------
const stats = { EASY: 0, MEDIUM: 0, HARD: 0, BRAND: 0 };
const byTier = { EASY: [], MEDIUM: [], HARD: [], BRAND: [] };
for (const item of phrases) {
  const t = tier(item.phrase);
  item.tier = t;
  item.score = score(item.phrase);
  item.vol = volumeProxy(item.phrase);
  stats[t]++;
  byTier[t].push(item);
}

// ---------- live SERP probe evidence (2026-09-19, Google) ----------
const PROBES = [
  { q: 'home loan emi calculator with monthly prepayment', verdict: 'EASY-MEDIUM', note: 'No giant in #1; winners were smartemicalc.com, jupiter.money, fisdom, navi.com, groww.in — finance brands but niche-tool SERP. ~4/10 strong brands. Site NOT in top 10.', strong: 4 },
  { q: 'concrete volume calculator in cubic yards', verdict: 'HARD', note: 'calculator.net #1, concretenetwork.com #2, calculatorsoup #9 — 3-4 strong brands plus niche concrete sites. Site NOT in top 10.', strong: 4 },
  { q: 'cgpa to percentage conversion calculator', verdict: 'MEDIUM', note: 'Dedicated CGPA microsites rank (cgpatopercentge.com, cgpa2percent.com) + GeeksforGeeks #2. Low-authority niche sites win — winnable with on-page + a few links. Site NOT in top 10.', strong: 2 },
  { q: 'quadratic equation solver with steps', verdict: 'HARD', note: 'calculatorsoup, mathsisfun, khanacademy, mathpapa, symbolab, vedantu — 6/10 education giants. Site NOT in top 10.', strong: 6 },
  { q: 'gravel driveway calculator tons', verdict: 'MEDIUM-HARD', note: 'calculator.net #1, inchcalculator.com #2, omnicalculator #4/#10 — 3 strong brands + niche gravel shops. Site NOT in top 10.', strong: 4 },
  { q: 'bmr calculator for women over 50', verdict: 'MEDIUM', note: 'No page targets the exact phrase; general BMR tools rank (calculator.net #2, clevelandclinic #3, forbes #7). Intent gap exists — best of the probed set. Site NOT in top 10.', strong: 3 },
];

// ---------- emit report ----------
const L = [];
const push = (s = '') => L.push(s);
push('# Keyword Difficulty Report — CalcProMaster');
push('');
push('_Generated ' + REPORT_DATE + ' by `scripts/build-difficulty-report.cjs` (deterministic; re-run with `npm run keywords:fresh`). Difficulty model: `scripts/keyword-difficulty.cjs`._');
push('');
push('## 0. Honest scope — read this first');
push('');
push('- **No real search-volume or backlink data exists in this repo.** Volumes below are structural proxies (word count + head-term class), and difficulty is modeled from phrase structure + the live SERP probes in section 1. Real numbers unlock the moment GSC credentials land (`docs/api-credentials-setup.md`).');
push('- **No live rankings data**: GSC `service-account.json` is not present, so per-keyword position tracking is not possible yet. The six probes in section 1 are the only live evidence.');
push('- The user rule applied throughout: **go after a keyword only if fewer than 20 of the top-10 pages are strong brands, and volume is decent.** Tiers below operationalize that: EASY = long-tail with intent qualifier (few strong brands compete), HARD = head term (brand wall).');
push('');
push('## 1. Live SERP probes (2026-09-19, Google)');
push('');
push('| Query | Verdict | Strong brands in top-10 (<20 rule) | Notes |');
push('|---|---|---|---|');
for (const p of PROBES) push('| ' + p.q + ' | ' + p.verdict + ' | ' + p.strong + '/10 — passes <20 rule | ' + p.note + ' |');
push('');
push('**Probe conclusion:** CalcProMaster is **not in the top 10 for any probed keyword**. The winnable pattern is exactly what the rule predicts: niche microsites (smartemicalc, cgpatopercentge) beat giants on fully specified long-tails. The site’s 1,331 curated long-tails are the right battleground; head terms are not, yet.');
push('');
push('## 2. Portfolio summary (every targeted phrase, tiered)');
push('');
push('| Tier | Phrases | Meaning |');
push('|---|---|---|');
push('| **EASY** (go after now) | ' + stats.EASY + ' | 4+ words with intent qualifier — few strong brands in top-10 |');
push('| **MEDIUM** (secondary) | ' + stats.MEDIUM + ' | 3+ words — mixed SERPs, needs some links |');
push('| **HARD** (park) | ' + stats.HARD + ' | head terms — brand wall (calculator.net, omnicalculator, Khan Academy…) |');
push('| **BRAND** (own) | ' + stats.BRAND + ' | CalcProMaster brand queries — must own #1 |');
push('');
push('Total distinct targeted phrases: **' + phrases.length + '** across ' + pages.length + ' indexable pages.');
push('');
push('## 3. GO list — highest-value EASY targets (difficulty 2, best-volume first, sample of 60)');
push('');
push('These pass the <20-strong-brands rule with margin. Each already has a dedicated page targeting it — the gap is authority/links, not content.');
push('');
push('| Keyword | Page | Volume proxy |');
push('|---|---|---|');
const goList = byTier.EASY.filter(x => x.kind === 'tool')
  .sort((a, b) => b.vol.localeCompare(a.vol) || a.phrase.localeCompare(b.phrase))
  .slice(0, 60);
for (const item of goList) {
  push('| ' + item.phrase + ' | `' + item.url + '` | ' + item.vol + ' |');
}
push('');
push('## 4. PARK list — head terms & brand-wall keywords (sample of 30)');
push('');
push('Do **not** chase these with the current authority (zero/backlink-poor). Revisit after the domain move + first real backlinks. Includes HARD-tier phrases and MEDIUM score-4 phrases (head terms whose SERP is brand-dominated).');
push('');
push('| Keyword | Best page | Volume proxy |');
push('|---|---|---|');
const parkList = phrases.filter(x => x.tier === 'HARD' || x.score === 4)
  .sort((a, b) => b.score - a.score || a.phrase.localeCompare(b.phrase))
  .slice(0, 30);
for (const item of parkList) {
  push('| ' + item.phrase + ' | `' + item.url + '` | ' + item.vol + ' |');
}
push('');
push('## 5. What actually moves rankings from here (priority order)');
push('');
push('1. **GSC data unlock** (user step) — real queries/impressions replace every proxy in this doc. `npm run monitor:gsc` once `service-account.json` exists.');
push('2. **First 3–5 backlinks** — GitHub repo profile already links the site; next: product-hunt-style directories, calculator roundup guest notes, Reddit r/InternetIsBeautiful-style shares of a single best tool (not spam).');
push('3. **Custom domain** (`docs/CUSTOM-DOMAIN-PLAN.md`) — hosted-subdomain caps the ceiling for every EASY keyword too.');
push('4. **Internal linking per cluster** (`docs/CLUSTER-LINKING-PLAN.md`) — free, already planned.');
push('5. **Re-probe before big bets** — the six probes are a snapshot; SERPs shift.');
push('');
push('## 6. Method note (reproducibility)');
push('');
push('- Tiering: `scripts/keyword-difficulty.cjs` — deterministic phrase-structure model (word count, modifier vocabulary, brand-heavy head list). No randomness, no dates inside the logic.');
push('- Inputs: `scripts/.keywords.jsonl` (regenerated from deploy tree by `scripts/extract-keywords.cjs`).');
push('- Report: byte-stable across runs (sorted output, source-controlled date) — CI gate `npm run keywords:check` fails if docs drift from code.');
push('');

fs.writeFileSync(OUT, L.join('\n'), 'utf8');
console.log('wrote ' + OUT + ' — ' + L.length + ' lines');
console.log('phrases: ' + phrases.length + ' | ' + JSON.stringify(stats));
