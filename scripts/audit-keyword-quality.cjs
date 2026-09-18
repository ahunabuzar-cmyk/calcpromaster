#!/usr/bin/env node
/* Keyword-quality audit over the site's full keyword targeting inventory.
 *
 * Inputs:  scripts/.keywords.jsonl  (run scripts/extract-keywords.cjs first)
 *          js/data/*.js            (curated kw phrases — re-parsed here)
 * Output:  docs/KEYWORD-AUDIT.md   (findings + methodology + honest limits)
 *
 * Checks (all deterministic, machine-extracted — nothing hand-added):
 *   C1 title cannibalization: two indexable pages sharing one normalized title
 *   C2 phrase cannibalization: one curated kw phrase assigned to 2+ tool URLs
 *   C3 intra-tool duplicates: same phrase listed twice for one tool
 *   Q1 stale-intent phrases: hard years (20xx) inside a keyword
 *   Q2 app-intent phrases on web tools: apk / "free download" / "app download"
 *   Q3 weakly-related phrases: share no word with the tool's own name
 *   S1 overlong phrases (> 70 chars — near-zero realistic query volume)
 *   S2 single-word generic phrases (no product head: calculator/converter/…)
 *   Stats: modifier coverage (feature "with …", locale, free, formula)
 * Run: node scripts/audit-keyword-quality.cjs   (exit 0 — it is a report)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'js', 'data');
const OUT = path.join(ROOT, 'docs', 'KEYWORD-AUDIT.md');

const pages = fs.readFileSync(path.join(__dirname, '.keywords.jsonl'), 'utf8')
  .trim().split('\n').map(l => JSON.parse(l));

// --- tools (same empirical dir-vote mapping as build-keyword-map.cjs) ---
const sandbox = { module: { exports: {} }, console: { log() {}, warn() {}, error() {} } };
vm.createContext(sandbox);
const topDirs = fs.readdirSync(path.join(ROOT, 'deploy'), { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name);
const tools = [];
for (const f of fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.js')).sort()) {
  const cat = f.replace(/\.js$/, '');
  const m = { exports: {} };
  sandbox.module = m;
  vm.runInContext(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'), sandbox, { filename: f });
  const arr = m.exports;
  if (!Array.isArray(arr)) continue;
  const votes = {};
  for (const t of arr.slice(0, 40)) {
    if (!t || !t.id) continue;
    for (const d of topDirs) {
      if (fs.existsSync(path.join(ROOT, 'deploy', d, t.id, 'index.html'))) votes[d] = (votes[d] || 0) + 1;
    }
  }
  const dir = (Object.entries(votes).sort((a, b) => b[1] - a[1])[0] || [cat])[0];
  for (const t of arr) {
    if (!t || !t.id || !t.name) continue;
    const kws = (t.kw || '').split(',').map(s => s.trim()).filter(Boolean);
    tools.push({ cat: dir, id: t.id, name: t.name, url: '/' + dir + '/' + t.id, kws });
  }
}

const STOP = new Set(['free', 'online', 'best', 'with', 'for', 'and', 'the', 'a', 'in', 'to', 'of', 'how', 'calculator', 'calc', 'converter', 'generator']);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const HEADS = ['calculator', 'calc', 'converter', 'generator', 'tool', 'estimator', 'solver', 'counter', 'checker'];

// ---- C1: title cannibalization ----
const byTitle = new Map();
for (const p of pages) {
  const t = norm(p.title.replace(/\s*\|\s*CalcProMaster.*$/, ''));
  if (!t) continue;
  if (!byTitle.has(t)) byTitle.set(t, []);
  byTitle.get(t).push(p.url);
}
const dupTitles = [...byTitle.entries()].filter(([, v]) => v.length > 1);

// ---- C2: phrase cannibalization across tools ----
const byPhrase = new Map();
for (const t of tools) {
  for (const k of t.kws) {
    const key = norm(k);
    if (!key) continue;
    if (!byPhrase.has(key)) byPhrase.set(key, new Set());
    byPhrase.get(key).add(t.url);
  }
}
const dupPhrases = [...byPhrase.entries()]
  .filter(([, set]) => set.size > 1)
  .map(([k, set]) => ({ phrase: k, urls: [...set] }));

// ---- C3: intra-tool duplicates ----
const intraDup = [];
for (const t of tools) {
  const seen = new Map();
  for (const k of t.kws) {
    const key = norm(k);
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  const dups = [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  if (dups.length) intraDup.push({ url: t.url, dups });
}

// ---- Q1/Q2/Q3/S1/S2 ----
const yearPhrases = [];
const appPhrases = [];
const weakPhrases = [];
const longPhrases = [];
const singleWord = [];
const nameWords = new Map(); // url -> Set of meaningful words from tool name
for (const t of tools) {
  const words = norm(t.name).split(' ').filter(w => w && !STOP.has(w));
  nameWords.set(t.url, new Set(words));
  for (const k of t.kws) {
    const nk = norm(k);
    if (/\b20\d\d\b/.test(nk)) yearPhrases.push({ url: t.url, phrase: k });
    if (/\bapk\b|free download|app download|\bfor pc\b/.test(nk)) appPhrases.push({ url: t.url, phrase: k });
    if (nk.length > 70) longPhrases.push({ url: t.url, phrase: k });
    const kws1 = nk.split(' ');
    if (kws1.length === 1 && !HEADS.includes(kws1[0])) singleWord.push({ url: t.url, phrase: k });
    const own = nameWords.get(t.url);
    const overlap = nk.split(' ').some(w => own.has(w) || (w.endsWith('s') && own.has(w.slice(0, -1))));
    if (own.size && !overlap) weakPhrases.push({ url: t.url, phrase: k, name: t.name });
  }
}
const uniq = (arr) => { const s = new Set(); return arr.filter(x => { const k = x.url + '|' + norm(x.phrase); if (s.has(k)) return false; s.add(k); return true; }); };

// ---- modifier stats ----
let withFeature = 0, withLocale = 0, withFree = 0, totalPhrases = 0;
const LOCALES = /\bindia\b|indian|\bpakistan\b|\buae\b|\busa\b|\buk\b|\bcanada\b|\baustralia\b|rupees|inr|\bdollar\b/;
for (const t of tools) for (const k of t.kws) {
  totalPhrases++;
  const nk = norm(k);
  if (/\bwith\b|\bsolve for\b|\bstep by step\b/.test(nk)) withFeature++;
  if (LOCALES.test(nk)) withLocale++;
  if (/\bfree\b/.test(nk)) withFree++;
}

// ---- emit markdown ----
const L = [];
const push = (s = '') => L.push(s);
push('# Keyword Quality Audit — CalcProMaster');
push('');
push('_Deterministic audit over the same extraction as docs/KEYWORD-TARGETS.md. Nothing hand-added. Re-run with: `npm run keywords:audit`._');
push('');
push('**Inventory:** ' + pages.length + ' indexable pages · ' + tools.length + ' tools · ' + totalPhrases + ' curated phrases.');
push('');
push('## Verdict at a glance');
push('');
push('| Check | Finding |');
push('|---|---|');
push('| C1 · Title cannibalization | ' + (dupTitles.length ? '⚠️ ' + dupTitles.length + ' duplicated titles' : '✅ none') + ' |');
push('| C2 · Phrase cannibalization (2+ pages target same phrase) | ' + (dupPhrases.length ? '⚠️ ' + dupPhrases.length + ' shared phrases' : '✅ none') + ' |');
push('| C3 · Duplicate phrase inside one tool | ' + (intraDup.length ? '⚠️ ' + intraDup.length + ' tools' : '✅ none') + ' |');
push('| Q1 · Year-stamped phrases | ' + (yearPhrases.length ? '⚠️ ' + yearPhrases.length : '✅ none') + ' |');
push('| Q2 · App/download-intent phrases on web tools | ' + (appPhrases.length ? '⚠️ ' + appPhrases.length : '✅ none') + ' |');
push('| Q3 · Phrases sharing no word with tool name | ' + (weakPhrases.length ? 'ℹ️ ' + weakPhrases.length + ' (review, not always wrong)' : '✅ none') + ' |');
push('| S1 · Overlong phrases (>70 chars) | ' + (longPhrases.length ? 'ℹ️ ' + longPhrases.length : '✅ none') + ' |');
push('| S2 · Single generic word | ' + (singleWord.length ? 'ℹ️ ' + singleWord.length : '✅ none') + ' |');
push('');
push('**Modifier coverage:** ' + withFeature + ' phrases use feature modifiers ("with …", "solve for …"), ' + withLocale + ' carry locale/currency intent, ' + withFree + ' say "free".');
push('');
if (dupTitles.length) {
  push('## C1 — Duplicated title targets');
  push('');
  push('| Normalized title | Pages |');
  push('|---|---|');
  for (const [t, urls] of dupTitles.slice(0, 40)) push('| ' + t + ' | ' + urls.join(', ') + ' |');
  push('');
}
if (dupPhrases.length) {
  push('## C2 — One phrase, multiple targeting pages');
  push('');
  push('Each of these phrases is listed on 2+ tools. Google picks ONE page per query — the others waste their shot. Decide a primary page and remove the phrase from the rest (or differentiate the modifier).');
  push('');
  for (const d of dupPhrases.slice(0, 60)) push('- **' + d.phrase + '** → ' + d.urls.join(', '));
  if (dupPhrases.length > 60) push('- …and ' + (dupPhrases.length - 60) + ' more (full list deterministic on every run)');
  push('');
}
if (intraDup.length) {
  push('## C3 — Duplicated phrase inside one tool');
  push('');
  for (const d of intraDup.slice(0, 40)) push('- ' + d.url + ': ' + d.dups.join(' · '));
  push('');
}
const tbl = (title, arr, note) => {
  if (!arr.length) return;
  push('## ' + title);
  push('');
  if (note) push(note);
  push('');
  push('| Page | Phrase |');
  push('|---|---|');
  for (const x of uniq(arr).slice(0, 50)) push('| `' + x.url + '` | ' + x.phrase + ' |');
  const more = uniq(arr).length - 50;
  if (more > 0) push('| … | +' + more + ' more |');
  push('');
};
tbl('Q1 — Year-stamped phrases (stale by next year)', yearPhrases, 'Hard years inside evergreen keywords guarantee staleness. Drop the year — the page can mention recency without baking it into the target.');
tbl('Q2 — App/download intent (mismatch: this is a web tool)', appPhrases, 'Searchers wanting an APK/app download will bounce off a web page. Either build what they want or retarget the browser-intent variant.');
tbl('Q3 — Phrases sharing no word with the tool name (review list)', weakPhrases, 'Often legitimate (synonyms, problem-space queries like "how many bags of concrete do i need") — but each should get a deliberate paragraph, not just the kw tag.');
tbl('S1 — Overlong phrases (>70 chars)', longPhrases, 'Nobody types these. They read like feature notes, not queries. Shorten to the searchable core.');
tbl('S2 — Single generic word', singleWord, 'Single non-head words are unrankable head terms against wikipedia-grade competition. Expand into an intent phrase.');
push('## Method & honest limits');
push('');
push('- Extraction source is the deployed site + `js/data/*.js` — same pipeline as KEYWORD-TARGETS.md, so both documents always describe the same inventory.');
push('- This audit measures **on-page targeting quality only**. It cannot measure search volume, difficulty, or current positions: that needs GSC + a rank tracker (credentials currently unconfigured — see docs/api-credentials-setup.md).');
push('- Live-SERP spot checks (2026-09-18, small sample, en/US): brand term → site #4; "calcpromaster calculators" → **GitHub repo #1/#3, site not in top 10**; "loan emi calculator", "concrete volume calculator in cubic yards", "cgpa to percentage conversion calculator", "home loan emi calculator with monthly prepayment" → site not in top 10. Site IS indexed (site: returns pages, but titles are stale: "543+" era).');
fs.writeFileSync(OUT, L.join('\n'), 'utf8');
console.log('wrote', OUT, '-', L.length, 'lines');
console.log('C1 dup titles:', dupTitles.length, '| C2 shared phrases:', dupPhrases.length, '| C3 intra dup:', intraDup.length);
console.log('Q1 year:', yearPhrases.length, '| Q2 app:', appPhrases.length, '| Q3 weak:', weakPhrases.length, '| S1 long:', longPhrases.length, '| S2 single:', singleWord.length);
console.log('modifiers: feature', withFeature, '/ locale', withLocale, '/ free', withFree, 'of', totalPhrases);
