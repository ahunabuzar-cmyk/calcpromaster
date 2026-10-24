#!/usr/bin/env node
// ============================================================
// CalcProMaster — public changelog of copy changes
// ------------------------------------------------------------
// "Jab bhi title/meta/heading badla, uska date aur before → after record ho" —
// taake kisi bhi ranking movement ko ek date se joda ja sake.
//
// Ledger append-only hai (data/seo-changelog.json): purani entries kabhi rewrite
// nahi hoti. Pehla run git HEAD se compare karta hai, is liye shipped vs committed
// farq before → after ke saath darj ho jata hai.
//
// Reads : js/seo-content.js (aaj ki shipped copy) · git HEAD version (agar mile)
//         scripts/apply-seo-overrides.cjs (kis page par haath lagaya gaya)
// Writes: data/seo-changelog.json · docs/CHANGELOG.md · changelog.html
// Usage : node scripts/build-changelog.cjs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const LEDGER = path.join(ROOT, 'data', 'seo-changelog.json');
const DOC = path.join(ROOT, 'docs', 'CHANGELOG.md');
const PAGE = path.join(ROOT, 'changelog.html');
const FIELDS = ['title', 'metaDesc', 'heading', 'lead', 'quickAnswer'];

function loadSeoFromFile(file) {
  const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox);
  return sandbox.window.TOOL_SEO || {};
}

function loadHeadSeo() {
  try {
    const src = execFileSync('git', ['show', 'HEAD:js/seo-content.js'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox);
    return { seo: sandbox.window.TOOL_SEO || {}, available: true };
  } catch (e) {
    return { seo: {}, available: false };
  }
}

// ---------- pure helpers (unit-tested) ----------

// Diff two copies of the SEO table, restricted to the ids we actually edit.
//
// A field is only recorded when the baseline actually has a previous value for
// it: inventing `from: null` for a field we never recorded would fill the ledger
// with "changes" that never happened, which defeats the whole point of it.
// `stats` (optional) reports how much of the baseline was usable, so a skipped
// field is visible rather than silently swallowed.
function diffCopy(current, previous, ids, date, stats) {
  const out = [];
  let compared = 0, skippedNoBaseline = 0;
  for (const id of ids) {
    const cur = current[id];
    // previous may be null when there is no baseline at all (e.g. git HEAD is
    // unavailable) — that must skip the diff, not throw.
    const prev = previous ? previous[id] : undefined;
    if (!cur) continue;
    for (const field of FIELDS) {
      const to = cur[field];
      if (typeof to !== 'string' || !to) continue;
      const from = prev ? prev[field] : undefined;
      if (typeof from !== 'string' || !from) { skippedNoBaseline++; continue; }
      compared++;
      if (from === to) continue;
      out.push({ id, field, from, to, date });
    }
  }
  if (stats) { stats.compared = compared; stats.skippedNoBaseline = skippedNoBaseline; }
  return out;
}

// Snapshot of today's copy for every tracked id — the baseline the next run diffs
// against, so a change is always measured from what was actually live.
function snapshot(current, ids) {
  const out = {};
  for (const id of ids) {
    const cur = current[id];
    if (!cur) continue;
    const fields = {};
    for (const field of FIELDS) {
      if (typeof cur[field] === 'string' && cur[field]) fields[field] = cur[field];
    }
    if (Object.keys(fields).length) out[id] = fields;
  }
  return out;
}

// Append only records we do not already have (same id+field+value = same change).
function mergeLedger(ledger, records) {
  const list = Array.isArray(ledger && ledger.entries) ? ledger.entries.slice() : [];
  const seen = new Set(list.map((e) => e.id + '\u0000' + e.field + '\u0000' + e.to));
  const added = [];
  for (const r of records) {
    const key = r.id + '\u0000' + r.field + '\u0000' + r.to;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(r);
    added.push(r);
  }
  return { entries: list, added };
}

// Group by date for a human-readable page: one dated block, one line per page.
function groupByDate(entries) {
  const byDate = new Map();
  for (const e of entries) {
    if (!byDate.has(e.date)) byDate.set(e.date, new Map());
    const pages = byDate.get(e.date);
    if (!pages.has(e.id)) pages.set(e.id, []);
    pages.get(e.id).push(e);
  }
  return [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, pages]) => ({
      date,
      pages: [...pages.entries()].map(([id, fields]) => ({
        id,
        fields: fields.slice().sort((a, b) => FIELDS.indexOf(a.field) - FIELDS.indexOf(b.field)),
        titleBefore: (fields.find((f) => f.field === 'title') || {}).from || null,
        titleAfter: (fields.find((f) => f.field === 'title') || {}).to || null,
      })),
    }));
}

function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------- main ----------

function main() {
  const current = loadSeoFromFile(path.join(ROOT, 'js', 'seo-content.js'));
  const S = require('./apply-seo-overrides.cjs');
  const ids = new Set([
    ...Object.keys(S.CTR_OVERRIDES),
    ...Object.keys(S.LABEL_REPAIRS).filter((k) => S.LABEL_REPAIRS[k].title),
  ]);

  const ledgerPath = LEDGER;
  let ledger = null;
  try { ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')); } catch (e) { ledger = null; }

  const date = new Date().toISOString().slice(0, 10);
  const head = loadHeadSeo();
  // What the copy said at the last build. On the first build that baseline is the
  // committed copy (git HEAD), so shipped-vs-committed differences are recorded
  // too; after that the ledger's own baseline is used, because re-diffing HEAD
  // would re-attribute old work to today.
  const storedBaseline = ledger && ledger.baseline && typeof ledger.baseline === 'object' ? ledger.baseline : null;
  const baseline = storedBaseline || (head.available ? head.seo : null);
  const firstRun = !storedBaseline;
  const stats = {};
  const records = diffCopy(current, baseline, ids, date, stats);

  const merged = mergeLedger(firstRun ? null : ledger, records);
  const out = {
    generatedAt: new Date().toISOString(),
    note: firstRun
      ? 'Baseline: pehla record — committed copy (git HEAD) se compare kiya gaya.'
      : 'Append-only: purani entries kabhi rewrite nahi hoti; baseline har run par aaj ki copy ban jata hai.',
    headAvailable: head.available,
    baseline: snapshot(current, ids),
    baselineSource: storedBaseline ? 'ledger' : (head.available ? 'git HEAD' : 'none'),
    entries: merged.entries,
  };
  fs.writeFileSync(ledgerPath, JSON.stringify(out, null, 2) + '\n');

  const groups = groupByDate(merged.entries);
  const limit = process.env.CHANGELOG_LIMIT ? parseInt(process.env.CHANGELOG_LIMIT, 10) : 12;
  const shown = groups.slice(0, limit);

  // ---- markdown (internal) ----
  const L = ['# SEO copy changelog', ''];
  L.push('> Auto-generated by `node scripts/build-changelog.cjs` · ledger: `data/seo-changelog.json` (append-only).');
  L.push('');
  L.push('Har title/meta/heading/lead/quick-answer ka change date ke saath. Isi wajah se kisi bhi movement ko ek date se joda ja sakta hai.');
  L.push('');
  for (const g of groups) {
    L.push('## ' + g.date + ' — ' + g.pages.length + ' page(s)');
    L.push('');
    for (const p of g.pages) {
      L.push('- `' + p.id + '` — ' + p.fields.length + ' field(s)' + (p.titleAfter ? ': `' + (p.titleBefore || '(pehle ka record nahi)') + '` → `' + p.titleAfter + '`' : ''));
    }
    L.push('');
  }
  if (!groups.length) L.push('_Koi change record nahi hua._');
  L.push('');
  fs.writeFileSync(DOC, L.join('\n'));

  // ---- public page ----
  const rows = shown.map((g) => {
    const items = g.pages.map((p) => {
      const title = p.titleAfter && p.titleBefore && p.titleBefore !== p.titleAfter
        ? '<code>' + esc(p.titleBefore) + '</code> → <code>' + esc(p.titleAfter) + '</code>'
        : p.titleAfter ? '<code>' + esc(p.titleAfter) + '</code>' : '';
      return '<li><strong>' + esc(p.id) + '</strong> — ' + p.fields.length + ' field' + (p.fields.length === 1 ? '' : 's') + (title ? '<br>' + title : '') + '</li>';
    }).join('\n');
    return '    <h2>' + esc(g.date) + ' — ' + g.pages.length + ' page' + (g.pages.length === 1 ? '' : 's') + '</h2>\n    <ul>\n' + items + '\n    </ul>';
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CalcProMaster Changelog: Titles and Copy Changes</title>
  <meta name="description" content="Every title, meta description and page-copy change on CalcProMaster, listed by date so each change and its effect can be traced.">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#4f46e5">
  <link rel="canonical" href="https://calcpromaster.com/changelog">
  <link rel="icon" type="image/svg+xml" href="icon.svg">
  <script type="application/ld+json">
  [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "CalcProMaster Changelog",
      "url": "https://calcpromaster.com/changelog",
      "isPartOf": { "@type": "WebSite", "name": "CalcProMaster", "url": "https://calcpromaster.com/" },
      "inLanguage": "en"
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://calcpromaster.com/" },
        { "@type": "ListItem", "position": 2, "name": "Changelog", "item": "https://calcpromaster.com/changelog" }
      ]
    }
  ]
  </script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--bg:#f8fafc;--surface:#fff;--text:#1e293b;--text-light:#64748b;--border:#e2e8f0;--primary:#4f46e5;--radius:14px}
    @media (prefers-color-scheme: dark){:root{--bg:#0f172a;--surface:#1e293b;--text:#f8fafc;--text-light:#94a3b8;--border:#334155}}
    body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);line-height:1.75;-webkit-font-smoothing:antialiased}
    header{background:var(--surface);border-bottom:1px solid var(--border);padding:14px 24px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
    .logo{font-size:20px;font-weight:800;background:linear-gradient(135deg,#4f46e5,#7c3aed);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;text-decoration:none}
    header a{color:var(--text-light);text-decoration:none;font-size:13px}
    header a:hover{color:var(--primary)}
    main{max-width:820px;margin:0 auto;padding:32px 24px 64px}
    h1{font-size:30px;font-weight:800;margin-bottom:8px}
    h2{font-size:18px;font-weight:700;margin:26px 0 8px}
    p{margin-bottom:10px}
    ul{margin:8px 0 14px 22px}
    li{margin-bottom:6px;font-size:14px}
    code{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:1px 6px;font-size:13px}
    .lede{font-size:15px;color:var(--text-light)}
    a{color:var(--primary)}
    footer{background:var(--surface);border-top:1px solid var(--border);padding:18px 24px;text-align:center;font-size:13px;color:var(--text-light)}
    footer a{color:var(--text-light);text-decoration:none;margin:0 8px}
    footer a:hover{color:var(--primary)}
  </style>
</head>
<body>
  <header>
    <a class="logo" href="/">CalcProMaster</a>
    <a href="/">Home</a>
    <a href="/stats">Stats</a>
    <a href="/changelog">Changelog</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </header>
  <main>
    <h1>Changelog: titles and copy changes</h1>
    <p class="lede">Search copy gets edited as the data comes in — a snippet that earns no clicks, a title that ends mid-sentence. Each change is recorded here by date, with what the copy said before, so any movement in rankings or clicks can be traced back to a specific edit.</p>
    <p class="lede">Generated ${esc(date)} from the same source files the site is built from.</p>
${rows || '    <p><em>No changes recorded yet.</em></p>'}
    <h2>How this is kept</h2>
    <p>The ledger is append-only: old entries are never rewritten, and each build only adds changes it has not seen before. Field-level detail (title, meta description, heading, answer paragraph) lives in the repository, and the <a href="/stats">stats page</a> shows what the numbers did over the same period.</p>
  </main>
  <footer>
    <a href="/">CalcProMaster</a> · all calculations run in your browser
    <br><a href="/stats">Stats</a><a href="/about">About</a><a href="/privacy">Privacy</a><a href="/contact">Contact</a>
  </footer>
</body>
</html>
`;
  fs.writeFileSync(PAGE, html);

  console.log('ledger: ' + merged.entries.length + ' entries total, ' + merged.added.length + ' new (' + groups.length + ' dated group(s))');
  console.log('baseline: ' + out.baselineSource + ' · compared ' + stats.compared + ' field(s), ' + stats.skippedNoBaseline + ' without a baseline value (skipped)');
  console.log('headAvailable: ' + head.available + ' · firstRun: ' + firstRun + ' · sample: ' + (records[0] ? records[0].id + '/' + records[0].field : '—'));
  console.log('wrote docs/CHANGELOG.md · changelog.html');
}

module.exports = { diffCopy, mergeLedger, groupByDate, snapshot, FIELDS };

if (require.main === module) main();
