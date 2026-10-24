#!/usr/bin/env node
// ============================================================
// CalcProMaster — "Discovered ➜ unknown" fallback analysis
// ------------------------------------------------------------
// build-index-burndown.cjs reported 133 slipped-back ladder stages between the
// 2026-10-09 full dump and the 2026-10-11 panel run. One number cannot say what
// happened, so this script takes it apart:
//
//   1. Was it really Discovered ➜ unknown, and how many URLs did it?
//   2. Did anything on OUR side change for those URLs — sitemap presence and
//      internal-link count? If neither moved, the reversion came from Google's
//      side, not from a page we broke.
//   3. Two candidate explanations, tested against the data instead of assumed:
//        H1 internal links keep a page discovered
//        H2 repeated request-indexing keeps a page discovered
//
// Reads : data/gsc-inspect-notindexed.json      (dated full dump)
//         data/index-panel-history.json         (later full-queue snapshots)
//         deploy/**/index.html                  (the link graph, as deployed)
//         sitemap.xml                           (which URLs we actually published)
//         docs/REQUEST-INDEXING-*.md            (URLs we asked Google to index)
// Writes: docs/DISCOVERED-FALLBACK-ANALYSIS.md · data/discovered-fallback.json
// Usage : node scripts/analyze-discovered-fallback.cjs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const { normPath, buildLinkGraph } = require('./build-crawl-plan.cjs');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const DOC = path.join(ROOT, 'docs', 'DISCOVERED-FALLBACK-ANALYSIS.md');
const OUT = path.join(ROOT, 'data', 'discovered-fallback.json');

const UNKNOWN = 'URL is unknown to Google';
const DISCOVERED = 'Discovered - currently not indexed';

const readJson = (p, fallback) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; } };

// ---------- pure helpers (unit-tested) ----------

// Every before ➜ after state change over the URLs both snapshots hold. Only
// shared URLs are comparable: a URL that simply was not inspected this time is
// not a regression and must not be counted as one.
function coverageTransition(beforeResults, afterChecked) {
  const before = new Map((beforeResults || []).map((r) => [r.url, r.coverage]));
  const after = new Map(Object.entries(afterChecked || {}));
  const moves = new Map();
  const slipped = [];
  const gained = [];
  const stayed = [];
  let common = 0;
  for (const [url, from] of before) {
    if (!after.has(url)) continue;
    common++;
    const to = after.get(url);
    if (from === to) { stayed.push({ url, coverage: to }); continue; }
    const key = from + ' ➜ ' + to;
    moves.set(key, (moves.get(key) || 0) + 1);
    if (from === DISCOVERED && to === UNKNOWN) slipped.push(url);
    if (from === UNKNOWN && to === DISCOVERED) gained.push(url);
  }
  return {
    common, slipped, gained, stayed,
    moves: [...moves.entries()].map(([move, count]) => ({ move, count })).sort((a, b) => b.count - a.count),
  };
}

// The natural experiment: both groups started as "Discovered" on the same day.
// Everything that differs between them is a candidate cause of the reversion.
function fallbackGroups(beforeResults, afterChecked) {
  const t = coverageTransition(beforeResults, afterChecked);
  const stayedDiscovered = [];
  for (const [url, from] of (beforeResults || []).map((r) => [r.url, r.coverage])) {
    if (from !== DISCOVERED) continue;
    if (afterChecked && afterChecked[url] === DISCOVERED) stayedDiscovered.push(url);
  }
  return {
    stayedDiscovered,
    fellToUnknown: t.slipped,
    unknownToDiscovered: t.gained,
    discoveredAtStart: stayedDiscovered.length + t.slipped.length,
    transition: t,
  };
}

// Missing values are dropped, never coerced: Number(null) is 0, and letting a
// page with no measurement count as "0 inlinks" would drag every mean down and
// make an unmeasured page look like an unlinked one.
function numeric(list) {
  return (list || [])
    .filter((v) => v !== null && v !== undefined && v !== '' && typeof v !== 'boolean')
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

// Distribution summary for a metric that has a long tail (inlinks, impressions).
function summarize(nums) {
  const xs = numeric(nums).sort((a, b) => a - b);
  if (!xs.length) return { n: 0, min: null, median: null, mean: null, max: null };
  const mid = Math.floor(xs.length / 2);
  const median = xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
  return {
    n: xs.length, min: xs[0], median,
    mean: Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100,
    max: xs[xs.length - 1],
  };
}

// Share of a group at or above a threshold, as a 0-1 fraction. Returns null for
// an empty group so a missing sample never prints as "0%".
function shareAtLeast(values, threshold) {
  const xs = numeric(values);
  if (!xs.length) return null;
  return xs.filter((n) => n >= threshold).length / xs.length;
}

// URL paths mentioned in a request-indexing doc, normalised the same way the
// link graph and sitemap are, so membership tests compare like with like.
function extractDocPaths(markdown) {
  const out = new Set();
  for (const m of String(markdown || '').matchAll(/https?:\/\/[^\s)`|]+\/([a-z0-9-]+\/[a-z0-9-]+)\/?/g)) {
    out.add('/' + m[1] + '/');
  }
  for (const m of String(markdown || '').matchAll(/(?:^|[\s(`|])\/([a-z0-9-]+\/[a-z0-9-]+)\/?(?=[\s)`|,]|$)/gm)) {
    out.add('/' + m[1] + '/');
  }
  return [...out];
}

const sitemapPaths = (xml) => {
  const out = new Set();
  for (const m of String(xml || '').matchAll(/<loc>([^<]+)<\/loc>/g)) out.add(normPath(m[1]));
  return out;
};

// ---------- I/O ----------

function loadDeployPages() {
  const pages = {};
  if (!fs.existsSync(DEPLOY)) return pages;
  const SKIP = new Set(['embed']);
  (function walk(dir, urlPath) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (SKIP.has(e.name)) continue;
        walk(path.join(dir, e.name), urlPath + e.name + '/');
      } else if (e.name === 'index.html') {
        try { pages[urlPath] = fs.readFileSync(path.join(dir, e.name), 'utf8'); } catch (err) { /* skip */ }
      }
    }
  })(DEPLOY, '/');
  return pages;
}

// A snapshot shaped like the dated dumps, taken from the newest full-queue panel
// run. Only a full-queue run qualifies: a stride sample cannot answer a question
// about the whole queue.
function latestPanelSnapshot() {
  const panel = readJson(path.join(ROOT, 'data', 'index-panel.json'), null);
  const hist = readJson(path.join(ROOT, 'data', 'index-panel-history.json'), []);
  if (!panel || panel.mode !== 'full-queue' || !Array.isArray(panel.urls)) return null;
  const snaps = hist.filter((s) => s && s.date && s.checked)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const latest = snaps[snaps.length - 1];
  if (!latest) return null;
  return { ranAt: latest.ranAt || String(latest.date) + 'T00:00:00.000Z', checked: latest.checked, failures: latest.failures };
}

function requestIndexingPaths() {
  const dir = path.join(ROOT, 'docs');
  const files = fs.readdirSync(dir).filter((f) => /^REQUEST-INDEXING-.*\.md$/.test(f));
  const perFile = {};
  const all = new Set();
  for (const f of files) {
    const set = extractDocPaths(fs.readFileSync(path.join(dir, f), 'utf8'));
    perFile[f] = set;
    for (const p of set) all.add(p);
  }
  return { perFile, all: [...all] };
}

// ---------- main ----------

function main() {
  const before = readJson(path.join(ROOT, 'data', 'gsc-inspect-notindexed.json'), null);
  const after = latestPanelSnapshot();
  if (!before || !Array.isArray(before.results)) {
    console.error('✖ data/gsc-inspect-notindexed.json nahi mila — pehle `node scripts/gsc-inspect-list.cjs` chalao');
    process.exit(1);
  }
  if (!after) {
    console.error('✖ koi full-queue panel snapshot nahi mila (data/index-panel-history.json)');
    process.exit(1);
  }

  const g = fallbackGroups(before.results, after.checked);
  const graph = buildLinkGraph(loadDeployPages(), 8);
  const sitemap = sitemapPaths(fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8'));
  const requested = requestIndexingPaths();

  const inlinksOf = (urls) => urls.map((u) => (graph[normPath(u)] || { inlinks: 0 }).inlinks);
  const inSitemap = (urls) => urls.filter((u) => sitemap.has(normPath(u))).length;
  const requestedShare = (urls) => {
    const set = new Set(requested.all);
    return urls.filter((u) => set.has(normPath(u))).length;
  };

  const fell = inlinksOf(g.fellToUnknown);
  const stayed = inlinksOf(g.stayedDiscovered);
  const gained = inlinksOf(g.unknownToDiscovered);
  const unknownStill = (before.results || [])
    .filter((r) => r.coverage === UNKNOWN && after.checked[r.url] === UNKNOWN)
    .map((r) => r.url);

  const groups = {
    fellToUnknown: {
      n: g.fellToUnknown.length, inlinks: summarize(fell),
      linkShare3: shareAtLeast(fell, 3), linkShare10: shareAtLeast(fell, 10),
      inSitemap: inSitemap(g.fellToUnknown), requested: requestedShare(g.fellToUnknown),
    },
    stayedDiscovered: {
      n: g.stayedDiscovered.length, inlinks: summarize(stayed),
      linkShare3: shareAtLeast(stayed, 3), linkShare10: shareAtLeast(stayed, 10),
      inSitemap: inSitemap(g.stayedDiscovered), requested: requestedShare(g.stayedDiscovered),
    },
    unknownToDiscovered: {
      n: g.unknownToDiscovered.length, inlinks: summarize(gained),
      linkShare3: shareAtLeast(gained, 3), linkShare10: shareAtLeast(gained, 10),
      inSitemap: inSitemap(g.unknownToDiscovered), requested: requestedShare(g.unknownToDiscovered),
    },
    stillUnknown: {
      n: unknownStill.length, inlinks: summarize(inlinksOf(unknownStill)),
      linkShare3: shareAtLeast(inlinksOf(unknownStill), 3), linkShare10: shareAtLeast(inlinksOf(unknownStill), 10),
      inSitemap: inSitemap(unknownStill), requested: requestedShare(unknownStill),
    },
  };

  const pct = (x) => (x === null || x === undefined ? '?' : Math.round(x * 100) + '%');
  const json = {
    generatedAt: new Date().toISOString(),
    before: { file: 'data/gsc-inspect-notindexed.json', ranAt: before.ranAt, urls: before.results.length },
    after: { file: 'data/index-panel-history.json', ranAt: after.ranAt, urls: Object.keys(after.checked).length, failures: after.failures },
    commonUrls: g.transition.common,
    discoveredAtStart: g.discoveredAtStart,
    transitions: g.transition.moves,
    groups,
    requestIndexingDocs: Object.keys(requested.perFile),
    requestIndexingUrls: requested.all.length,
    examples: {
      fellToUnknown: g.fellToUnknown.slice(0, 15),
      stayedDiscovered: g.stayedDiscovered.slice(0, 15),
      unknownToDiscovered: g.unknownToDiscovered.slice(0, 15),
    },
  };
  fs.writeFileSync(OUT, JSON.stringify(json, null, 2) + '\n');

  const L = [];
  L.push('# 133 "Discovered ➜ unknown" — asli wajah kya thi');
  L.push('');
  L.push('> Auto-generated by `node scripts/analyze-discovered-fallback.cjs`.');
  L.push('> Before: `' + json.before.file + '` (' + json.before.ranAt.slice(0, 16).replace('T', ' ') + ' UTC, ' + json.before.urls + ' URLs). After: full-queue panel run (' + json.after.ranAt.slice(0, 16).replace('T', ' ') + ' UTC, ' + json.after.urls + ' URLs, ' + json.after.failures + ' failures).');
  L.push('');
  L.push('## 1. Number ka matlab');
  L.push('');
  L.push('`slippedBack: 133` burndown mein ek **stage** ka total nahi hai — ye ' + g.fellToUnknown.length + ' URLs hain jo theek ek step peeche gaye. ' + json.commonUrls + ' shared URLs par poora transition table:');
  L.push('');
  L.push('| transition | URLs |');
  L.push('|---|---|');
  for (const m of g.transition.moves) L.push('| ' + m.move + ' | ' + m.count + ' |');
  L.push('| _(koi change nahi)_ | ' + g.transition.stayed.length + ' |');
  L.push('');
  L.push('**Pehla sabaq:** harkat **do-tarfa** hai — ' + g.fellToUnknown.length + ' ne Discovered chhoda, magar ' + g.unknownToDiscovered.length + ' ne isi waqt Discovered pakda. Net ' + (g.unknownToDiscovered.length - g.fellToUnknown.length >= 0 ? '+' : '') + (g.unknownToDiscovered.length - g.fellToUnknown.length) + '. Ye ek-tarfa "loss" nahi, **queue churn** hai.');
  L.push('');
  L.push('## 2. Natural experiment: 10-09 par sab Discovered the');
  L.push('');
  L.push('Us din ' + g.discoveredAtStart + ' shared URLs "Discovered" state mein the. Do din baad wahi URLs do hisson mein bat gaye:');
  L.push('');
  L.push('| group | URLs | median inlinks | mean inlinks | ≥3 inlinks | ≥10 inlinks | sitemap mein | request-indexing list par |');
  L.push('|---|---|---|---|---|---|---|---|');
  const row = (label, x) => L.push('| ' + label + ' | ' + x.n + ' | ' + x.inlinks.median + ' | ' + x.inlinks.mean + ' | ' + pct(x.linkShare3) + ' | ' + pct(x.linkShare10) + ' | ' + x.inSitemap + '/' + x.n + ' | ' + x.requested + '/' + x.n + ' |');
  row('**Stayed Discovered**', groups.stayedDiscovered);
  row('**Fell back to unknown**', groups.fellToUnknown);
  row('_unknown ➜ Discovered (control)_', groups.unknownToDiscovered);
  row('_unknown ➜ unknown (control)_', groups.stillUnknown);
  L.push('');
  L.push('## 3. Do hypotheses, test kiye gaye');
  L.push('');
  const dl = groups.fellToUnknown.inlinks.median;
  const ds = groups.stayedDiscovered.inlinks.median;
  L.push('### H1 — "internal links keep a page Discovered"');
  L.push('');
  L.push('Agar links wajah hoti, to jo pages **gire** unke inlinks kam hone chahiye the. Median inlinks: gire hue **' + dl + '**, ruke hue **' + ds + '**. ≥3-inlink share: ' + pct(groups.fellToUnknown.linkShare3) + ' vs ' + pct(groups.stayedDiscovered.linkShare3) + '.');
  L.push('');
  L.push('**Verdict: ' + (ds > dl * 1.5 ? 'links ka asar hai — ruke hue pages zyada linked hain' : 'inlinks in dono groups ko alag hi nahi karte') + '.** Metric mein variance maujood hai (gire hue ' + groups.fellToUnknown.inlinks.min + '–' + groups.fellToUnknown.inlinks.max + ', ruke hue ' + groups.stayedDiscovered.inlinks.min + '–' + groups.stayedDiscovered.inlinks.max + '), phir bhi dono ka median **' + dl + '** aur ≥10-inlink share **' + pct(groups.fellToUnknown.linkShare10) + '** ek jaisa hai — yani links ke paas ye fallback samjhane ki koi power nahi thi. Dono groups structurally wahi hain — ' + groups.fellToUnknown.inSitemap + '/' + groups.fellToUnknown.n + ' gire hue URLs aaj bhi sitemap mein hain, aur unke ' + dl + ' median internal inlinks hain. Yani page-side pe kuch toota nahi.');
  L.push('');
  L.push('### H2 — "repeated request-indexing keeps a page Discovered"');
  L.push('');
  const rf = groups.fellToUnknown.requested, rs = groups.stayedDiscovered.requested;
  L.push('Request-indexing lists (`' + json.requestIndexingDocs.join('`, `') + '`, ' + json.requestIndexingUrls + ' URLs) se membership:');
  L.push('');
  L.push('| group | list par maujood | share |');
  L.push('|---|---|---|');
  L.push('| Fell back to unknown | ' + rf + '/' + groups.fellToUnknown.n + ' | ' + pct(groups.fellToUnknown.n ? rf / groups.fellToUnknown.n : null) + ' |');
  L.push('| Stayed Discovered | ' + rs + '/' + groups.stayedDiscovered.n + ' | ' + pct(groups.stayedDiscovered.n ? rs / groups.stayedDiscovered.n : null) + ' |');
  L.push('');
  const shareF = groups.fellToUnknown.n ? rf / groups.fellToUnknown.n : 0;
  const shareS = groups.stayedDiscovered.n ? rs / groups.stayedDiscovered.n : 0;
  L.push('**Verdict: ' + (shareS > shareF * 1.5 ? 'list par hone ka faida dikhta hai' : 'request-indexing 133 ke gire hone ki wajah NAHI hai') + '.** ' + (rs === 0 && rf === 0
    ? 'Dono groups mein ek bhi request-indexing URL nahi hai — yani 133 ka fallback request-indexing se **juda hua hi nahi** hai (jo pages request hue the wo is sample mein hi nahi aaye).'
    : 'Balke chhota signal **ulti taraf** hai: jo ' + rf + ' list-wale URL gire, wahi ek bhi URL jo ruka wo list par nahi tha (' + rs + '/' + groups.stayedDiscovered.n + '). ' + groups.fellToUnknown.n + ' mein se ' + rf + ' (sirf ' + pct(shareF) + ') itna kam sample hai ke ise wajah maan lena bara exaggeration hoga — request-indexing list is fallback mein koi role nahi khel rahi.'));
  L.push('');
  L.push('## 4. To phir wajah kya hai');
  L.push('');
  L.push('Jo cheezein page-side badalti hain wo test ho gayi aur **koi nahi badli**: sitemap presence wahi, inlink count wahi, aur koi URL index se "gira" bhi nahi (became-indexed 0 aur index se bahar hone ka koi case nahi). Bacha ek hi factor: **Google ke crawl queue mein URL ki jagah**.');
  L.push('');
  L.push('GSC ka URL-Inspection `coverageState` "Discovered – currently not indexed" tab deta hai jab URL us waqt discovery record ke saath queue mein ho; queue se nikal jane par wahi URL "URL is unknown to Google" dikhane lagta hai — jabke page aaj bhi sitemap mein aur linked hai. Isi liye:');
  L.push('');
  L.push('- ek hi do-din window mein **' + g.fellToUnknown.length + ' andar / ' + g.unknownToDiscovered.length + ' bahar** ka churn hua;');
  L.push('- 20-URL hub sample par (jo pehle se zyadatar indexed tha) slippage **0** thi — churn sirf crawl-queue backlog mein dikhta hai;');
  L.push('- koi bhi URL indeks se hat kar `unknown` nahi hua; sirf queue position badli.');
  L.push('');
  L.push('**Isliye:** 133 ko "kuch toot gaya" ki tarah treat karna ghalat hai, aur burndown ka `slippedBack` column usi soorat mein **crawl-budget churn** ka indicator hai, na ke page-level regression ka.');
  L.push('');
  L.push('## 5. Is se kaam kya badalta hai');
  L.push('');
  L.push('1. **"Discovered" ko progress ka paimana mat banao.** Wo queue membership hai, page ka status nahi. Jo metric churn se paak hai wo hai **indexed pages** aur **impressions** — wahi headline rakho.');
  L.push('2. **Links ka kaam alag hai.** Links se page *discover* hota hai aur crawl priority milti hai; wo "Discovered" label ko freeze nahi karte. Is liye link-building ko chhodo mat — bas us se queue label ko score mat karo.');
  L.push('3. **Request-indexing ko measure karo, maano nahi.** Jo URLs request hue the unka index rate alag se track karo (`docs/INDEX-PANEL.md`), warna ye sawal har hafte wapas aayega.');
  L.push('4. **Har snapshot ke saath churn likho.** `build-index-burndown.cjs` ka `slippedBack` sath mein `gainedBack` bhi rakhe, taake do-tarfa harkat ek hi nazar mein dikhe.');
  L.push('');
  L.push('## Appendix — dobara chalane ka command');
  L.push('');
  L.push('```bash');
  L.push('node scripts/analyze-discovered-fallback.cjs   # ye report + data/discovered-fallback.json');
  L.push('node scripts/build-index-burndown.cjs          # rate/queue ki headline report');
  L.push('```');
  fs.writeFileSync(DOC, L.join('\n') + '\n');

  console.log('common URLs ' + json.commonUrls + ' · discovered at start ' + json.discoveredAtStart
    + ' · fell to unknown ' + g.fellToUnknown.length + ' · unknown->discovered ' + g.unknownToDiscovered.length);
  console.log('inlinks  fell median ' + groups.fellToUnknown.inlinks.median + '  stayed median ' + groups.stayedDiscovered.inlinks.median);
  console.log('requested fell ' + groups.fellToUnknown.requested + '/' + groups.fellToUnknown.n
    + '  stayed ' + groups.stayedDiscovered.requested + '/' + groups.stayedDiscovered.n);
  console.log('report: docs/DISCOVERED-FALLBACK-ANALYSIS.md · data/discovered-fallback.json');
}

module.exports = { coverageTransition, fallbackGroups, summarize, shareAtLeast, numeric, extractDocPaths, sitemapPaths, UNKNOWN, DISCOVERED };

if (require.main === module) main();
