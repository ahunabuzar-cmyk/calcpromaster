#!/usr/bin/env node
// ============================================================
// CalcProMaster — Top-100 snippet audit (title + meta description)
// ------------------------------------------------------------
// The 28-day GSC page export (data/gsc-page-impressions.json) says which pages
// actually earn impressions. This audit joins the top N of those to the BUILT
// page (deploy/) and reports the snippet defects that cost clicks:
//
//   TEMPLATE_META  "Free X: enter the A and get a B. Every step shown, nothing
//                  leaves your browser." — machine output Google rewrites
//                  instead of showing, so the page loses the click.
//   RAW_TITLE_TAIL title ends in a raw input label ("Dimension 1, Dimension 2",
//                  "Mm And Mm", "Total Wall") instead of what the page answers.
//   TITLE_LENGTH   outside the build gate (30–70 decoded chars).
//   META_LENGTH    outside 70–185 chars.
//   DUPLICATE      two of the top N share a title.
//
// It only MEASURES; fixes go through scripts/apply-seo-overrides.cjs so the
// generated SEO source stays the single source of truth.
//
// Usage: node scripts/audit-top100-snippets.cjs [--top 100]
// Output: docs/TOP100-SNIPPET-AUDIT.md + data/top100-snippet-audit.json
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IMPRESSIONS = path.join(ROOT, 'data', 'gsc-page-impressions.json');
const COVERAGE = path.join(ROOT, 'data', 'gsc-coverage-report.json');
const OUT_MD = path.join(ROOT, 'docs', 'TOP100-SNIPPET-AUDIT.md');
const OUT_JSON = path.join(ROOT, 'data', 'top100-snippet-audit.json');

const arg = (n, d) => { const i = process.argv.indexOf(n); const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : NaN; return Number.isFinite(v) && v > 0 ? v : d; };
const TOP = arg('--top', 100);

// Shapes the generator emitted when it could not write prose. Each one is a
// snippet a reader would not click, so they are named rather than scored.
const TEMPLATE_META = [
  /^Free .*?: (enter|get) the /i,
  /and get (a|an|the) /i,
  /instantly, with every step/i,
  /Every step shown, nothing leaves your browser/i,
  /get the [a-z ]+ instantly/i
];
const RAW_TITLE_TAIL = [
  /:\s*Dimension \d/i,
  /:\s*Mm And Mm$/i,
  /:\s*Total Wall$/i,
  /:\s*Angle$/i,
  /:\s*Net Income$/i,
  /:\s*Current$/i,
  /:\s*Annual Salary$/i,
  /:\s*Monthly Rent,.*$/i,
  /:\s*Original Price & Age$/i
];

function decode(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&nbsp;/g, ' ');
}
function stripSlash(u) { return u.replace(/\/+$/, ''); }
function deployFile(u) {
  const s = stripSlash(u);
  if (s === '') return path.join(ROOT, 'deploy', 'index.html');
  if (s.startsWith('/guides/')) return path.join(ROOT, 'deploy', 'guides', s.slice(8) + '.html');
  if (s.startsWith('/blog/')) return path.join(ROOT, 'deploy', 'blog', s.slice(6) + '.html');
  return path.join(ROOT, 'deploy', ...s.split('/').filter(Boolean), 'index.html');
}
function snippetOf(file) {
  if (!fs.existsSync(file)) return { title: null, metaDesc: null };
  const html = fs.readFileSync(file, 'utf8');
  const t = html.match(/<title>([\s\S]*?)<\/title>/i);
  const d = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i);
  return { title: t ? decode(t[1]) : null, metaDesc: d ? decode(d[1]) : null };
}

const imp = JSON.parse(fs.readFileSync(IMPRESSIONS, 'utf8'));
const coverage = fs.existsSync(COVERAGE) ? JSON.parse(fs.readFileSync(COVERAGE, 'utf8')) : null;
const indexed = new Set(((coverage && coverage.lists && coverage.lists.INDEXED) || []).map((r) => stripSlash(r.url)));

const rows = Object.entries(imp.pages || {})
  .sort((a, b) => (b[1].impressions || 0) - (a[1].impressions || 0))
  .slice(0, TOP)
  .map(([url, v], i) => {
    const { title, metaDesc } = snippetOf(deployFile(url));
    const flags = [];
    if (!title) flags.push('MISSING_TITLE');
    else {
      if (title.length < 30 || title.length > 70) flags.push('TITLE_LENGTH');
      if (RAW_TITLE_TAIL.some((re) => re.test(title))) flags.push('RAW_TITLE_TAIL');
    }
    if (!metaDesc) flags.push('MISSING_META');
    else {
      if (metaDesc.length <= 70 || metaDesc.length > 185) flags.push('META_LENGTH');
      if (TEMPLATE_META.some((re) => re.test(metaDesc))) flags.push('TEMPLATE_META');
    }
    return {
      rank: i + 1,
      url,
      impressions: v.impressions || 0,
      clicks: v.clicks || 0,
      position: v.position || 0,
      indexed: indexed.size === 0 ? null : indexed.has(stripSlash(url)),
      title, metaDesc, flags
    };
  });

// Duplicate titles inside the audited set — two pages competing for one snippet.
const byTitle = new Map();
for (const r of rows) {
  if (!r.title) continue;
  const k = r.title.toLowerCase();
  if (!byTitle.has(k)) byTitle.set(k, []);
  byTitle.get(k).push(r);
}
for (const group of byTitle.values()) {
  if (group.length < 2) continue;
  for (const r of group) r.flags.push('DUPLICATE');
}

const tally = {};
for (const r of rows) for (const f of r.flags) tally[f] = (tally[f] || 0) + 1;
const flagged = rows.filter((r) => r.flags.length);

const out = {
  ranAt: new Date().toISOString(),
  window: { startDate: imp.startDate, endDate: imp.endDate, days: imp.days },
  top: TOP,
  audited: rows.length,
  flagged: flagged.length,
  clean: rows.length - flagged.length,
  tally,
  rows
};
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));

const L = [];
L.push('# Top-' + TOP + ' snippet audit — title + meta description');
L.push('');
L.push('> Auto-generated by `node scripts/audit-top100-snippets.cjs` on ' + new Date().toISOString().slice(0, 10) + '.');
L.push('> Demand window: **' + imp.startDate + ' → ' + imp.endDate + '** (' + imp.days + ' days, GSC page export).');
L.push('> Snippets read from the **built** `deploy/` tree, not from the source generator.');
L.push('');
L.push('## Summary');
L.push('');
L.push('| Metric | Value |');
L.push('|---|---|');
L.push('| Pages audited (by impressions) | **' + rows.length + '** |');
L.push('| Clean snippets | **' + (rows.length - flagged.length) + '** |');
L.push('| Pages with at least one defect | **' + flagged.length + '** |');
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) L.push('| ' + k + ' | ' + v + ' |');
L.push('');
L.push('## What each flag means');
L.push('');
L.push('- **TEMPLATE_META** — the generated shape `"Free X: enter the A and get a B. Every step shown…"`. Google usually rewrites it, so the page loses control of its snippet.');
L.push('- **RAW_TITLE_TAIL** — the title ends in a raw input label (`Dimension 1, Dimension 2`, `Mm And Mm`, `Total Wall`) instead of the outcome the searcher wants.');
L.push('- **TITLE_LENGTH** / **META_LENGTH** — outside the build gate (title 30–70, meta 70–185 characters).');
L.push('- **DUPLICATE** — two pages in this set share the same title.');
L.push('');
L.push('## Flagged pages (top 40 by impressions)');
L.push('');
L.push('| # | Page | Impr | Pos | Indexed | Flags | Current title |');
L.push('|---|---|---|---|---|---|---|');
for (const r of flagged.slice(0, 40)) {
  L.push('| ' + r.rank + ' | `' + r.url + '` | ' + r.impressions + ' | ' + (r.position ? r.position.toFixed(1) : '—') + ' | '
    + (r.indexed === null ? '—' : r.indexed ? 'yes' : 'no') + ' | ' + r.flags.join(', ') + ' | ' + String(r.title || '(none)').replace(/\|/g, '\\|') + ' |');
}
L.push('');
L.push('## Fix path');
L.push('');
L.push('1. Hand-written title + meta go in `scripts/apply-seo-overrides.cjs` → `LABEL_REPAIRS` (snippet-only entries carry `fix: []`; body-copy repairs keep their `labelFix(...)`).');
L.push('2. `node scripts/apply-seo-overrides.cjs && node scripts/split-seo.cjs`');
L.push('3. `npm run deploy:build` — the build gates reject titles outside 30–70 chars.');
L.push('4. Re-run this audit; the flag should disappear from the built page.');
L.push('');
L.push('_This audit measures; it never edits copy. Every number in a replacement snippet must come from the tool\'s own formula._');
L.push('');
fs.writeFileSync(OUT_MD, L.join('\n'));

console.log('=== Top-' + TOP + ' snippet audit ===');
console.log('audited: ' + rows.length + '  ·  clean: ' + (rows.length - flagged.length) + '  ·  flagged: ' + flagged.length);
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log('  ' + String(v).padStart(4) + '  ' + k);
console.log('\n💾 ' + path.relative(ROOT, OUT_MD) + ' + ' + path.relative(ROOT, OUT_JSON));
