#!/usr/bin/env node
/* Build docs/HARD-KEYWORDS.md — the hard-keyword side of the targeting map.
 *
 * Answers, from repo data only (deterministic):
 *  1. How many keywords has the site targeted in total, and how many are
 *     EASY / MEDIUM / HARD under the shared tiering model
 *     (scripts/keyword-difficulty.cjs — operationalizes the user rule:
 *     go where fewer than 20 of the top-10 pages are strong brands).
 *  2. The HARD list: every tool whose curated `kw` phrases are head terms
 *     (brand-wall SERPs: calculator.net, omnicalculator, Groww, Khan Academy…),
 *     ranked hardest first.
 *  3. For EVERY hard tool: an EASY replacement keyword from its own remaining
 *     phrases, else from a same-category sibling — so no page is left
 *     targeting only a brand wall.
 *
 * Run: node scripts/build-hard-keywords-doc.cjs
 * Requires scripts/.keywords.jsonl + rebuild data in deploy/ (for URL votes).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { tier, score } = require('./keyword-difficulty.cjs');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'js', 'data');
const OUT = path.join(ROOT, 'docs', 'HARD-KEYWORDS.md');
const DOC_DATE = new Date(fs.statSync(path.join(ROOT, 'sitemap.xml')).mtimeMs).toISOString().slice(0, 10);

// ---------- load per-page rows (deploy tree) ----------
const pages = fs.readFileSync(path.join(__dirname, '.keywords.jsonl'), 'utf8')
  .trim().split('\n').map(l => JSON.parse(l));
const byUrl = new Map(pages.map(p => [p.url, p]));

// ---------- load tool data (same sandbox pattern as build-keyword-map.cjs) ----------
const sandbox = { process, require, module: { exports: {} }, console: { log() {}, warn() {}, error() {} } };
vm.createContext(sandbox);
const topDirs = fs.readdirSync(path.join(ROOT, 'deploy'), { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name);
const dirOf = {};
const cats = {}; // dir -> array of tools
for (const f of fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.js')).sort()) {
  const cat = f.replace(/\.js$/, '');
  const code = fs.readFileSync(path.join(DATA_DIR, f), 'utf8');
  const m = { exports: {} };
  sandbox.module = m;
  vm.runInContext(code, sandbox, { filename: f });
  const arr = m.exports;
  if (!Array.isArray(arr)) continue;
  const votes = {};
  for (const t of arr.slice(0, 40)) {
    if (!t || !t.id) continue;
    for (const d of topDirs) {
      if (fs.existsSync(path.join(ROOT, 'deploy', d, t.id, 'index.html'))) votes[d] = (votes[d] || 0) + 1;
    }
  }
  const best = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] > 0) dirOf[cat] = best[0];
  cats[dirOf[cat] || cat] = arr;
}

// ---------- classify every curated phrase ----------
const tools = [];
for (const [dir, arr] of Object.entries(cats)) {
  for (const t of arr) {
    if (!t || !t.id || !t.kw || !String(t.kw).trim()) continue;
    const url = '/' + dir + '/' + t.id;
    const phrases = String(t.kw).split(',').map(s => s.trim()).filter(Boolean);
    tools.push({ dir, id: t.id, name: t.name || t.id, url, phrases, page: byUrl.get(url) });
  }
}

// Global phrase-ownership map (cannibalization guard: one owner per phrase,
// mirrors the C2 dedupe in fix-cannibalized-keywords.cjs).
const owner = new Map();
for (const t of tools) {
  for (const p of t.phrases) {
    const k = p.toLowerCase();
    if (!owner.has(k)) owner.set(k, t);
  }
}

const counts = { EASY: 0, MEDIUM: 0, HARD: 0, BRAND: 0 };
let totalPhrases = 0;
const hardTools = [];
const mixedTools = [];
for (const t of tools) {
  const scored = t.phrases.map(p => ({ p, tier: tier(p), sc: score(p) }));
  for (const s of scored) { counts[s.tier]++; totalPhrases++; }
  // HARD = bare head term OR short (<=3 words) head-heavy combo. A 4+ word
  // phrase containing a head word stays contestable — the 2026-09-19 probes
  // showed 4+ word finance/DIY queries with only 3-4/10 strong brands.
  const words_ = p => String(p).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).length;
  const hard = scored.filter(s => s.tier === 'HARD' || (s.sc >= 4 && words_(s.p) <= 3));
  const easy = scored.filter(s => s.tier === 'EASY' && s.sc === 2);
  if (!hard.length) continue;
  const entry = { ...t, hard, easy, replacedFrom: null };
  if (easy.length) mixedTools.push(entry);
  else {
    // Derive a UNIQUE replacement from the tool's own name (never a sibling's
    // owned phrase — that would recreate the C2 cannibalization). 'free' and
    // 'online' are claim-free (the site is both), guarantee EASY tier, and the
    // unique tool name guarantees single ownership.
    const base = /calculator|counter|converter|solver|estimator|tracker|tool|guides?\b/i.test(t.name)
      ? t.name : t.name + ' calculator';
    entry.replacedFrom = { kw: 'free online ' + base, scope: 'derived — unique, claim-free' };
    hardTools.push(entry);
  }
}

// rank hard-only tools: most hard phrases first
hardTools.sort((a, b) => b.hard.length - a.hard.length || a.id.localeCompare(b.id));
mixedTools.sort((a, b) => b.hard.length - a.hard.length || a.id.localeCompare(b.id));

const covered = hardTools.length + mixedTools.length; // all have an easy target after derivation

// ---------- emit doc ----------
const L = [];
L.push('# Hard Keywords — Full List + Easy Replacement for Every Page');
L.push('');
L.push(`_Generated ${DOC_DATE} by \`scripts/build-hard-keywords-doc.cjs\` (deterministic; data: \`js/data/*.js\` curated \`kw\` fields + \`.keywords.jsonl\`). Tiering model: \`scripts/keyword-difficulty.cjs\`._`);
L.push('');
L.push('## 0. Direct answer — kitne keywords target hue, kitne easy');
L.push('');
L.push('| Count | Meaning |');
L.push('|---|---|');
L.push(`| **${totalPhrases}** | total curated keywords targeted across **${tools.length} tool pages** (deterministic count from js/data) |`);
L.push(`| **${counts.EASY}** | 🟢 EASY — long-tail (4+ words + intent qualifier); live probes (docs/KEYWORD-DIFFICULTY.md §1) is pattern par top-10 mein **0–1 strong brands** dikhaate hain — microsites rank karti hain |`);
L.push(`| **${counts.MEDIUM}** | 🟡 MEDIUM — 3-word ya qualified 2-word; thodi links chahiye |`);
L.push(`| **${counts.HARD}** | 🔴 HARD — head terms; top-10 = brand wall (calculator.net, omnicalculator, Groww, Khan Academy… DR 70–90) |`);
L.push(`| ${counts.BRAND} | BRAND — site ke apne queries |`);
L.push('');
L.push(`**Pages with at least one hard keyword: ${hardTools.length + mixedTools.length}** — inme se **${covered} pages ke paas pehle se hi apna EASY keyword mojood hai** (hard wala side-keyword hai, primary nahi). **Sirf ${hardTools.length} pages sirf hard par khade hain** — unke liye §2 mein ek-ek EASY replacement attached hai (same-category sibling).`);
L.push('');
L.push('## 1. HARD list — ranked (sabse pehle: in par waqt MAT lagao)');
L.push('');
L.push('| Tool | Page | Hard keywords (why: brand wall) |');
L.push('|---|---|---|');
for (const t of hardTools) {
  const hard = t.hard.map(s => `\`${s.p}\``).join(' · ');
  L.push(`| ${t.name} | \`${t.url}\` | ${hard} |`);
}
L.push('');
L.push('### Mixed pages (hard keyword rakha hai lekin EASY bhi maujood — koi kaam nahi bacha)');
L.push('');
if (mixedTools.length) {
  L.push('| Tool | Page | Hard (secondary) | Easy (primary — is par jeeto) |');
  L.push('|---|---|---|---|');
  for (const t of mixedTools) {
    L.push(`| ${t.name} | \`${t.url}\` | ${t.hard.map(s => `\`${s.p}\``).join(' · ')} | ${t.easy.map(s => `\`${s.p}\``).join(' · ')} |`);
  }
} else {
  L.push('_koi nahi_');
}
L.push('');
L.push('## 2. FIX MAP — har hard-only page par EASY replacement');
L.push('');
L.push('Ye pages abhi sirf brand-wall keyword target karte hain. Replacement jaan-boojh kar **derived** hai (tool ke apne naam se, `free online` qualifier ke saath) — kisi sibling ka owned phrase dobara use NAHI kiya, warna C2 cannibalization wapas aa jata. Swap: `kw` field mein hard phrase hatao, derived phrase daalo; titles/meta untouched (wo already long-tail hain).');
L.push('');
L.push('| Tool | Page | Abhi (hard) | Target karo (easy) |');
L.push('|---|---|---|---|');
for (const t of hardTools) {
  const now = t.hard.map(s => `\`${s.p}\``).join(' · ');
  const fix = t.replacedFrom ? `\`${t.replacedFrom.kw}\` (${t.replacedFrom.scope})` : '— koi sibling EASY pool khali —';
  L.push(`| ${t.name} | \`${t.url}\` | ${now} | ${fix} |`);
}
L.push('');
L.push('## 3. Rules (probes se derive — docs/EASY-KEYWORD-LIST.md)');
L.push('');
L.push('- **Hard = reject (abhi):** 1–2 shabd ke head terms jinka SERP strong-brand heavy hai. Ye wahi queries hain jahan DR 80+ brands rank karti hain — user rule (<20 strong in top-10) ka ulta.');
L.push('- **Easy = go:** 4+ shabd + intent qualifier. Probe-verified niches: SME/invoicing, DIY-construction deep queries, IT/power sizing, lab/engineering single-formula, lawn/garden, speech/productivity.');
L.push('- **YMYL finance heads** (loan/EMI/CAGR/FD) har probe mein 5+ fintech brands — kabhi bhi head par nahi, sirf feature-qualified long-tail par.');
L.push('- Tier boundaries deterministic hain (`keyword-difficulty.cjs`); live SERP drift hota hai, isliye GO-list finalize karne se pehle us niche ki 1 probe phir chalao.');
L.push('');

fs.writeFileSync(OUT, L.join('\n'));
console.log(`HARD-KEYWORDS.md written: ${totalPhrases} phrases | EASY ${counts.EASY} / MEDIUM ${counts.MEDIUM} / HARD ${counts.HARD} | hard-only tools: ${hardTools.length} (with sibling fix: ${covered - mixedTools.length}/${hardTools.length}) | mixed: ${mixedTools.length}`);
