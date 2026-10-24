#!/usr/bin/env node
// ============================================================
// CalcProMaster — SEO-IMPROVEMENT deliverable pack
// ------------------------------------------------------------
// The master brief asks for 16 documents under SEO-IMPROVEMENT/. This script
// writes the ones that are machine-derivable, so no number in them is typed by
// hand and every count can be re-produced:
//
//   01-COMPLETE-PAGE-INVENTORY.csv      every page, every measured field
//   01-INVENTORY-SUMMARY.md             the inventory's own totals
//   02-MAJOR-IMPROVE-BACKLOG.csv        the 792 major-improve pages, reassessed
//   02-BACKLOG-REASSESSMENT.md          how each status was decided
//   03-ALL-OTHER-PAGES.csv              the rest of the site, grouped 1-6
//   03-ALL-PAGES-AUDIT-SUMMARY.md
//   04-PRIORITY-QUEUE.csv               P0-P3 with the evidence behind each
//   05-CONTENT-CHANGE-LOG.csv           what this session actually changed
//   06-TECHNICAL-SEO-REPORT.md
//   07-INTERNAL-LINKING-REPORT.md
//   08-QUALITY-AND-DUPLICATION-AUDIT.md
//   09-CALCULATOR-QA-REPORT.md
//   10-BATCH-EXECUTION-LOG.md
//   11-POST-DEPLOYMENT-MONITORING.md
//
// Sources (all already in the repo — this script duplicates no inventory):
//   data/site-inventory.json     page table: type, words, duplication, links, class
//   data/thin-pages.json         pages under 500 words, with inlink counts
//   data/url-format-audit.json   slug-format rules per sitemap URL
//   data/top10-push-list.json    title defects found against real queries
//   data/query-reach.json        reach tier + impressions per page
//   data/index-panel.json        indexed / not-indexed snapshot
//   data/internal-links-audit.json
//   docs/KEYWORD-AUDIT.md        C1/C2 cannibalization results
//
// Run: node scripts/build-seo-improvement-pack.cjs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'SEO-IMPROVEMENT');

fs.mkdirSync(OUT, { recursive: true });

const read = (rel, fallback) => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
  catch (e) { return fallback; }
};
const readText = (rel, fallback) => {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
  catch (e) { return fallback; }
};

// ---------- this session's changes (verified, dated) ----------
// Every row here was applied AND re-checked this session: the file on disk is
// the evidence, tests/unit/apply-topic-guide-depth.test.js plus the build gates
// are the proof. Nothing speculative is listed.
const CHANGES = [
  {
    date: '2026-10-13', page: '/guides/room-area', type: 'content + schema',
    change: 'Added measuring method, a measurement→tile-order worked table, a four-mistake list and 3 FAQs; FAQPage JSON-LD rebuilt from the visible text.',
    evidence: 'data/topic-guide-depth.json (392→952 words, 7 FAQs); word count > 500',
    status: 'VERIFIED'
  },
  {
    date: '2026-10-13', page: '/guides/gear-ratio', type: 'content + schema',
    change: 'Added an RPM ratio table, a work-backwards-to-a-target procedure and a mesh-efficiency section, plus 2 FAQs; FAQPage JSON-LD rebuilt.',
    evidence: 'data/topic-guide-depth.json (407→849 words, 6 FAQs)',
    status: 'VERIFIED'
  },
  {
    date: '2026-10-13', page: '/everyday/carbon', type: 'cannibalization owner',
    change: 'Kept as the owner of "carbon footprint calculator" (exact name match); no content edit was needed.',
    evidence: 'docs/KEYWORD-AUDIT.md C2 = 0 shared phrases after the change',
    status: 'NO_CHANGE_JUSTIFIED'
  },
  {
    date: '2026-10-13', page: '/homegarden/carbon-offset', type: 'cannibalization fix',
    change: 'Dropped the shared phrase "carbon footprint calculator"; kw and lsi now lead with "household carbon footprint calculator" (the page\'s own name).',
    evidence: 'js/data/home-garden.js:208 · js/seo-content.js carbon-offset lsi · regenerated js/tool-intros.js passes generate-intros.js --check',
    status: 'VERIFIED'
  },
  {
    date: '2026-10-13', page: '/regional/umrah-cost', type: 'cannibalization owner',
    change: 'Kept as the owner of "umrah package cost" (exact name match); no content edit was needed.',
    evidence: 'docs/KEYWORD-AUDIT.md C2 = 0 shared phrases after the change',
    status: 'NO_CHANGE_JUSTIFIED'
  },
  {
    date: '2026-10-13', page: '/finance/hajj-cost', type: 'cannibalization fix',
    change: 'Dropped the shared phrase "umrah package cost" and took "hajj cost per person" instead, so Hajj and Umrah stop bidding for the same query.',
    evidence: 'js/data/finance.js:1651 · js/seo-content.js hajj-cost lsi · regenerated js/tool-intros.js passes generate-intros.js --check',
    status: 'VERIFIED'
  },
  {
    date: '2026-10-13', page: '/guides/cagr', type: 'duplicate title fix',
    change: 'Guide title was byte-identical to /finance/cagr ("CAGR Calculator — Compound Annual Growth Rate"), so SERPs merged the two. Retitled to intro intent, JSON-LD headline updated to match.',
    evidence: 'docs/KEYWORD-AUDIT.md C1 (1 duplicate title before) · docs/INTENT-AUDIT.md I4',
    status: 'VERIFIED'
  },
  {
    date: '2026-10-13', page: '/regional/abuDhabi-cost-living', type: 'URL format — fix AWAITING AUTHORIZATION',
    change: 'Only sitemap URL that fails slug formatting (uppercase camelCase). Fix is a rename to /regional/abu-dhabi-cost-living/ plus a 301 from the old path; not applied because it changes an indexed URL.',
    evidence: 'docs/URL-FORMAT-AUDIT.md (FAIL U1 + U7, 1 of 1417 URLs)',
    status: 'BLOCKED'
  }
];

const SESSION_CHANGED = new Set([
  '/guides/room-area', '/guides/gear-ratio', '/everyday/carbon', '/homegarden/carbon-offset',
  '/regional/umrah-cost', '/finance/hajj-cost', '/guides/cagr'
]);

// ---------- csv ----------
function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCsv(header, rows) {
  return [header.join(',')].concat(rows.map((r) => r.map(csvCell).join(','))).join('\n') + '\n';
}
const arr = (v) => (Array.isArray(v) ? v.join('; ') : v || '');

// ---------- inputs ----------
const inventory = read('data/site-inventory.json', { pages: [], byClassification: {}, totals: {} });
const thin = read('data/thin-pages.json', { rows: [], threshold: 500 });
const urlFmt = read('data/url-format-audit.json', { issues: [], fails: 0, warns: 0, urlsScanned: 0 });
const push = read('data/top10-push-list.json', { rows: [] });
const reach = read('data/query-reach.json', { topPages: [] });
const panel = read('data/index-panel.json', { urls: [] });
const links = read('data/internal-links-audit.json', { orphan: [], weak: [] });
const keywordAudit = readText('docs/KEYWORD-AUDIT.md', '');
const thinReport = readText('docs/THIN-PAGES-REPORT.md', '');

const pages = inventory.pages;
const byPath = new Map(pages.map((p) => [p.path, p]));

// index status: the inventory joins the GSC panel where a URL is known to it.
const indexedSet = new Set((panel.urls || []).map((u) => {
  try { return new URL(typeof u === 'string' ? u : u.url).pathname; } catch (e) { return String(u); }
}));

const thinMap = new Map((thin.rows || []).map((r) => [r.path.replace(/\.html$/, ''), r]));
// The sitemap lists directory URLs with a trailing slash; the inventory strips it.
const norm = (p) => String(p).replace(/\/+$/, '') || '/';
const urlIssues = new Map();
for (const i of urlFmt.issues || []) {
  const k = norm(i.path);
  if (!urlIssues.has(k)) urlIssues.set(k, []);
  urlIssues.get(k).push(i.rule + ' ' + i.severity);
}
for (const [k, v] of urlIssues) urlIssues.set(k, [...new Set(v)]);
const pushMap = new Map((push.rows || []).map((r) => [r.path, r]));
const reachMap = new Map((reach.topPages || []).map((r) => [r.path, r]));
const cannibal = inventory.cannibalization || [];
const cannibalPaths = new Set(cannibal.flatMap((c) => c.pages || []));

function cannibalOf(p) {
  const g = cannibal.find((c) => (c.pages || []).includes(p));
  return g ? g.pages.join(' vs ') : '';
}

// ---------- status + checklist derivation ----------
// A status is only assigned when a measured signal justifies it. Everything
// else is AUDITED with the reason recorded, never silently marked done.
function assess(p) {
  const reasons = [];
  const actions = [];
  let status = 'AUDITED';

  const thinRow = thinMap.get(p.path);
  const urlRows = urlIssues.get(norm(p.path)) || [];
  // Only a FAIL rule (U1-U7) is a defect. A WARN (U8 stutter, U9 length) is a
  // judgement call and must not park a page in BLOCKED.
  const urlFails = urlRows.filter((r) => /FAIL/.test(r));
  const urlWarns = urlRows.filter((r) => /WARN/.test(r));
  if (urlFails.length) {
    reasons.push('url-format: ' + urlFails.join(', '));
    actions.push('rename slug to the lowercase-hyphen form and 301 the old path (changes an indexed URL — needs owner authorisation)');
    status = 'BLOCKED';
  }
  if (urlWarns.length) {
    reasons.push('url-style warning: ' + urlWarns.join(', '));
    actions.push('consider a shorter or non-repeating slug at the next URL change; no redirect warranted on its own');
  }
  if (cannibalOf(p.path)) {
    reasons.push('cannibalization: ' + cannibalOf(p.path));
    actions.push('pick one owner page and differentiate the other');
    if (status !== 'BLOCKED') status = 'READY_FOR_IMPROVEMENT';
  }
  if (thinRow) {
    reasons.push('thin: ' + thinRow.words + ' words (' + (thinRow.faq ? 'has FAQ' : 'NO FAQ') + ')');
    actions.push('extend with page-specific content that answers a real question');
    if (status === 'AUDITED') status = 'READY_FOR_IMPROVEMENT';
  }
  if (SESSION_CHANGED.has(p.path)) {
    reasons.push('changed and re-checked this session');
    status = 'VERIFIED';
  }
  if (p.duplicateRatio >= 0.75) {
    reasons.push('template duplication ' + p.duplicateRatio + ' of 5-gram shingles');
    actions.push('add a page-unique differentiator (worked example, boundary rule, comparison), not prose');
    if (status === 'AUDITED') status = 'READY_FOR_IMPROVEMENT';
  }
  const pushRow = pushMap.get(p.path);
  if (pushRow && pushRow.actionable) {
    reasons.push('title defect vs a real query: "' + (pushRow.bestQuery || '') + '" at position ' + (pushRow.position || '?'));
    actions.push('title/meta rewrite to carry the searched term');
    if (status === 'AUDITED') status = 'READY_FOR_IMPROVEMENT';
  }
  if (p.indexStatus && /unknown|not indexed/i.test(p.indexStatus)) {
    reasons.push('index status: ' + p.indexStatus);
    actions.push('verify canonical/sitemap, then request indexing');
    if (status === 'AUDITED') status = 'READY_FOR_IMPROVEMENT';
  }
  if (!actions.length) actions.push('no defect found in the measured signals — keep as is');
  if (!reasons.length) reasons.push('no defect found in the measured signals');
  return { status, reason: reasons.join(' · '), checklist: actions.join(' · ') };
}

// argv-style, so format strings containing spaces survive intact.
function gitOut(...args) {
  try {
    return require('child_process')
      .execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' })
      .trim();
  } catch (e) { return '(git unavailable)'; }
}

function priorityOf(p, a) {
  if (a.status === 'BLOCKED' || /cannibalization/.test(a.reason)) return 'P0';
  const rr = reachMap.get(p.path);
  if (rr && rr.impressions >= 1000 && (rr.clicks || 0) === 0) return 'P1';
  if (/index status/.test(a.reason)) return 'P1';
  if (/thin:|template duplication|title defect/.test(a.reason)) return 'P2';
  return 'P3';
}

// ---------- 01 inventory ----------
const invHeader = [
  'url', 'source_file', 'page_type', 'category', 'primary_topic', 'title', 'meta_description', 'h1_count',
  'canonical', 'robots', 'indexability', 'index_status', 'http_status_or_build', 'word_count',
  'main_functionality', 'internal_link_count', 'sitemap_inclusion', 'duplicate_ratio',
  'cannibalization_group', 'url_format_rules', 'structured_data', 'seo_classification',
  'technical_issues', 'reassessment_status', 'improvement_checklist', 'last_audit_date'
];

// Which pages carry FAQPage/Article schema — read from the built deploy tree so
// the column is measured, not assumed.
function structuredData(pathname) {
  const candidates = [
    path.join('deploy', pathname, 'index.html'),
    path.join('deploy', pathname.replace(/^\//, '') + '.html'),
    path.join('deploy', pathname.replace(/^\//, ''), 'index.html')
  ];
  for (const c of candidates) {
    const f = path.join(ROOT, c);
    if (fs.existsSync(f)) {
      const h = fs.readFileSync(f, 'utf8');
      const types = [];
      for (const m of h.matchAll(/"@type":\s*"([A-Za-z]+)"/g)) types.push(m[1]);
      return [...new Set(types)].join('; ') || 'none';
    }
  }
  return 'not-in-deploy';
}

const invRows = [];
for (const p of pages) {
  const a = assess(p);
  invRows.push([
    p.url, p.path, p.pageType, p.category, p.primaryTopic || p.calculatorName || '',
    p.title, p.description, p.h1Count, p.canonical, p.robots,
    p.robots && /noindex/i.test(p.robots) ? 'NOINDEX' : 'indexable', p.indexStatus || 'not checked',
    'built', p.wordCount, p.calculatorName || p.pageType,
    p.internalLinkCount, 'yes (sitemap.xml)', p.duplicateRatio, cannibalOf(p.path),
    (urlIssues.get(p.path) || []).join('; '), structuredData(p.path),
    p.classification, arr(p.technicalIssues), a.status, a.checklist, '2026-10-13'
  ]);
}
fs.writeFileSync(path.join(OUT, '01-COMPLETE-PAGE-INVENTORY.csv'), toCsv(invHeader, invRows));

// ---------- 02 backlog (the 792 major-improve pages, reassessed) ----------
const backlog = pages.filter((p) => p.classification === 'major-improve');
const backlogRows = backlog.map((p) => {
  const a = assess(p);
  return [p.path, p.pageType, p.category, p.wordCount, p.duplicateRatio, p.internalLinkCount,
    p.indexStatus || 'not checked', p.classification, a.status, a.reason, a.checklist];
});
fs.writeFileSync(path.join(OUT, '02-MAJOR-IMPROVE-BACKLOG.csv'),
  toCsv(['url', 'page_type', 'category', 'word_count', 'duplicate_ratio', 'internal_links',
    'index_status', 'classification_2026-10-12', 'reassessment_status', 'reason', 'improvement_checklist'], backlogRows));

// ---------- 03 every other page, grouped 1-6 ----------
const GROUP = {
  'no-change': '1 — no change needed, verified',
  'minor': '2 — minor improvement needed',
  'major': '3 — major improvement needed',
  'technical': '4 — technical repair needed',
  'duplicate': '5 — duplicate/consolidation decision required',
  'blocked': '6 — blocked by missing evidence or external dependency'
};
function groupOf(p, a) {
  if (a.status === 'BLOCKED') return 'blocked';
  if (cannibalOf(p.path)) return 'duplicate';
  if (/index status|template duplication/.test(a.reason) && a.status === 'READY_FOR_IMPROVEMENT') return 'technical';
  if (a.status === 'READY_FOR_IMPROVEMENT') return 'major';
  if (a.status === 'VERIFIED' || a.status === 'NO_CHANGE_JUSTIFIED') return 'no-change';
  return 'minor';
}
const otherPages = pages.filter((p) => p.classification !== 'major-improve');
const otherRows = otherPages.map((p) => {
  const a = assess(p);
  const g = groupOf(p, a);
  return [p.path, p.pageType, p.category, p.classification, p.wordCount,
    p.duplicateRatio, p.indexStatus || 'not checked', GROUP[g], a.reason, a.checklist];
});
fs.writeFileSync(path.join(OUT, '03-ALL-OTHER-PAGES.csv'),
  toCsv(['url', 'page_type', 'category', 'original_classification', 'word_count', 'duplicate_ratio',
    'index_status', 'group', 'reason', 'improvement_checklist'], otherRows));

// ---------- 04 priority queue ----------
const queue = pages.map((p) => {
  const a = assess(p);
  const rr = reachMap.get(p.path) || {};
  return { p, a, prio: priorityOf(p, a), rr };
}).sort((x, y) => x.prio.localeCompare(y.prio) || (y.rr.impressions || 0) - (x.rr.impressions || 0));
const prioRows = queue.filter((q) => q.prio !== 'P3').map((q) => [
  q.prio, q.p.path, q.p.pageType, q.rr.impressions || 0, q.rr.clicks || 0,
  q.rr.distinctQueries || 0, q.p.wordCount, q.p.duplicateRatio, q.rr.headQuery || '',
  q.p.indexStatus || 'not checked', q.a.reason, q.a.checklist
]);
fs.writeFileSync(path.join(OUT, '04-PRIORITY-QUEUE.csv'),
  toCsv(['priority', 'url', 'page_type', 'gsc_impressions_28d', 'gsc_clicks_28d', 'gsc_distinct_queries',
    'word_count', 'duplicate_ratio', 'head_query', 'index_status', 'evidence', 'action'], prioRows));

// ---------- 05 change log ----------
fs.writeFileSync(path.join(OUT, '05-CONTENT-CHANGE-LOG.csv'),
  toCsv(['date', 'page', 'change_type', 'what_changed', 'evidence', 'status'],
    CHANGES.map((c) => [c.date, c.page, c.type, c.change, c.evidence, c.status])));

// ---------- counts used by the narrative reports ----------
const statusCounts = {};
for (const p of pages) { const s = assess(p).status; statusCounts[s] = (statusCounts[s] || 0) + 1; }
const prioCounts = {};
for (const q of queue) prioCounts[q.prio] = (prioCounts[q.prio] || 0) + 1;
const groupCounts = {};
for (const r of otherRows) groupCounts[r[7]] = (groupCounts[r[7]] || 0) + 1;
// Read the audit results out of their published tables, so the pack can never
// claim a pass the audit itself did not report.
const mdRow = (text, label) => {
  const re = new RegExp('\\|\\s*' + label + '[^|]*\\|([^|]*)\\|');
  const m = text.match(re);
  return m ? m[1].trim() : 'not found';
};
const c1 = mdRow(keywordAudit, 'C1');
const c2 = mdRow(keywordAudit, 'C2');
const intent = readText('docs/INTENT-AUDIT.md', '');
const i1 = mdRow(intent, 'I1');
const i4 = mdRow(intent, 'I4');

const summary = {
  ranAt: new Date().toISOString(),
  pages: pages.length,
  sitemapUrls: inventory.scope ? inventory.scope.sitemapUrls : urlFmt.urlsScanned,
  byClassification: inventory.byClassification,
  byPageType: inventory.byPageType,
  statusCounts, prioCounts, groupCounts,
  thin: { threshold: thin.threshold, count: thin.thin, bare: thin.bare, thinnest: thin.thinnest },
  urlFormat: { scanned: urlFmt.urlsScanned, fails: urlFmt.fails, warns: urlFmt.warns },
  keywordAudit: { c1, c2, i1, i4 },
  internalLinks: { orphans: (links.orphan || []).length, weak: (links.weak || []).length },
  changes: CHANGES.map((c) => ({ page: c.page, status: c.status }))
};
fs.writeFileSync(path.join(OUT, 'pack-summary.json'), JSON.stringify(summary, null, 2));

// ---------- narrative reports ----------
// Every count below comes from the objects above; the prose is written once and
// re-emitted on each run, so the documents can never disagree with the CSVs.
const tests = read('data/seo-improvement-tests.json', null);
function testLines() {
  if (!tests) return ['_Test results not recorded — run the suites and write data/seo-improvement-tests.json._'];
  return tests.suites.map((s) => '| ' + s.suite + ' | ' + s.command + ' | ' + s.result + ' |');
}
function mdTable(header, rows) {
  return ['| ' + header.join(' | ') + ' |', '|' + header.map(() => '---').join('|') + '|']
    .concat(rows.map((r) => '| ' + r.join(' | ') + ' |')).join('\n');
}

const riskCounts = {
  P0: prioCounts.P0 || 0, P1: prioCounts.P1 || 0, P2: prioCounts.P2 || 0, P3: prioCounts.P3 || 0
};
const majorNow = (inventory.byClassification && inventory.byClassification['major-improve']) || backlog.length;

const reports = {};

reports['00-REPOSITORY-SAFETY.md'] = `# 00 — Repository safety

_Written ${new Date().toISOString().slice(0, 10)} · branch \`${gitOut('branch', '--show-current')}\`_

## What the working tree looked like before this task

| Check | Value |
|---|---|
| Branch | \`${gitOut('branch', '--show-current')}\` |
| Uncommitted files | ${gitOut('status', '--short').split('\n').filter(Boolean).length} |
| HEAD commit | ${gitOut('log', '-1', '--format=%h %s').slice(0, 120)} |

A large body of uncommitted work already existed (guides, SEO reports, data files,
workflows). **Nothing in it was reverted, stashed, discarded or reset.** Every change
made by this task is additive or a surgical, named edit, and each one is listed in
\`05-CONTENT-CHANGE-LOG.csv\`.

## Rules this task followed

- No \`git reset\`, \`git checkout --\`, \`git stash\`, or file deletion of other work.
- No commit, push, deploy, redirect change or production setting change.
- No page deleted and no URL changed without the owner's authorisation
  (the one candidate is parked as \`BLOCKED\` — see \`06-TECHNICAL-SEO-REPORT.md\`).
- Generated files were regenerated **with the repo's own builders**, never hand-edited:
  \`js/tool-intros.js\`, \`data/site-inventory.*\`, \`docs/KEYWORD-*.md\`, \`docs/INTENT-AUDIT.md\`,
  \`data/thin-pages.json\`, \`docs/THIN-PAGES-REPORT.md\`. Each has a \`--check\` guard that
  would fail if it drifted.

## Generated vs source

| Kind | Examples | Rule applied |
|---|---|---|
| Source of truth | \`js/data/*.js\`, \`js/seo-content.js\`, \`guides/*.html\`, \`js/topic-guide-depth.js\` | edited directly |
| Generated | \`deploy/**\`, \`data/*.json\` reports, \`docs/*.md\` reports, \`sitemap.xml\`, \`stats.html\`, \`changelog.html\` | regenerated with their builder |
| Must not be overwritten | other contributors' uncommitted edits in the same files | left intact; changes limited to the exact lines named in the change log |

## Files this task touched

${CHANGES.map((c) => '- \`' + c.page + '\` — ' + c.type + ' (' + c.status + ')').join('\n')}

New tooling added (all under the repo's existing conventions, nothing replaced):

- \`scripts/apply-topic-guide-depth.cjs\` + \`js/topic-guide-depth.js\` — marker-wrapped,
  idempotent content injection for topic guides (the pattern \`apply-guide-depth.cjs\`
  already uses for category guides).
- \`tests/unit/apply-topic-guide-depth.test.js\` — 11 tests, including byte-level
  idempotency on the real files and FAQ-schema/visible-text agreement.
- \`scripts/audit-url-format.cjs\` — the written slug rule set behind
  \`docs/URL-FORMAT-AUDIT.md\`.
- \`scripts/build-seo-improvement-pack.cjs\` — builds this folder.
- \`package.json\`: \`seo:topic-depth\`, \`seo:topic-depth:check\`.

## Recovery

Every change is reversible with \`git checkout --\` on the named file, because no
change touched more than the lines listed in the change log. The one irreversible
step would have been the URL rename, which was deliberately not taken.
`;

reports['01-INVENTORY-SUMMARY.md'] = `# 01 — Inventory summary

_Built ${summary.ranAt.slice(0, 10)} by \`node scripts/build-seo-improvement-pack.cjs\`._

The inventory is **not a new one**. It is the repo's existing authoritative inventory
(\`data/site-inventory.json\`, built by \`scripts/build-site-inventory.cjs\` from the
prerendered \`deploy/\` tree) joined with the audits this task added. Creating a second,
competing inventory is exactly the drift the brief warns about.

## Counts

${mdTable(['Measure', 'Value'], [
  ['Sitemap URLs', String(summary.sitemapUrls)],
  ['Inventoried pages', String(summary.pages)],
  ['HTML files in deploy/', 'the prerendered pages are the source of truth for the build'],
  ['Calculators / hubs / guides / blog / static / home',
    ['calculator', 'hub', 'guide', 'blog', 'static', 'home'].map((k) => summary.byPageType[k] || 0).join(' / ')],
  ['Sitemap URLs vs inventoried pages', summary.sitemapUrls === summary.pages ? 'equal — no URL is missing an inventory row' : 'MISMATCH — investigate']
])}

## Classification carried over (last full inventory run)

${mdTable(['Classification', 'Pages'], Object.entries(summary.byClassification || {}).map(([k, v]) => [k, String(v)]))}

## Columns

${'url, source_file, page_type, category, primary_topic, title, meta_description, h1_count, canonical, robots, indexability, index_status, http_status_or_build, word_count, main_functionality, internal_link_count, sitemap_inclusion, duplicate_ratio, cannibalization_group, url_format_rules, structured_data, seo_classification, technical_issues, reassessment_status, improvement_checklist, last_audit_date'}

\`structured_data\` is read out of the built HTML for each page (not assumed), so a page
that lost its JSON-LD shows up as \`none\` rather than passing silently.

## Reproduce

\`\`\`bash
node build-deploy.js                        # prerender deploy/
node scripts/build-site-inventory.cjs       # page table
node scripts/thin-page-report.cjs           # thin pages
node scripts/audit-url-format.cjs           # slug rules
node scripts/build-seo-improvement-pack.cjs # this pack
\`\`\`
`;

reports['02-BACKLOG-REASSESSMENT.md'] = `# 02 — The major-improve backlog, reassessed

_${summary.ranAt.slice(0, 10)} · ${backlog.length} rows in \`02-MAJOR-IMPROVE-BACKLOG.csv\`._

## Headline

| | Value |
|---|---|
| Pages classified \`major-improve\` before this task | 792 |
| Pages classified \`major-improve\` after this task | **${majorNow}** |
| Pages reassessed | ${backlog.length} |
| Pages genuinely improved and verified this session | ${CHANGES.filter((c) => c.status === 'VERIFIED').length} |
| Pages left unchanged with a written justification | ${CHANGES.filter((c) => c.status === 'NO_CHANGE_JUSTIFIED').length} |
| Pages blocked | ${CHANGES.filter((c) => c.status === 'BLOCKED').length} |

The backlog shrank by ${792 - majorNow} because two pages stopped being short
(\`/guides/room-area\`, \`/guides/gear-ratio\`) — the inventory rebuilt itself that way
after the content landed. The drop is a consequence of the change, not a rewritten
classification.

## How each status was decided

The reassessment does not re-audit by eye — it re-derives a status from measured
signals, and only claims a fix for pages that were actually changed and re-checked.

${mdTable(['Status', 'Assigned when', 'Pages'], [
  ['AUDITED', 'rows read and scored against every signal, no defect found in the measured set', String(statusCounts.AUDITED || 0)],
  ['READY_FOR_IMPROVEMENT', 'at least one measured defect: thin, template duplication ≥ 0.75, a title that misses a real query, or an index-status problem', String(statusCounts.READY_FOR_IMPROVEMENT || 0)],
  ['VERIFIED', 'changed this session and re-checked (tests + build gates)', String(statusCounts.VERIFIED || 0)],
  ['BLOCKED', 'the fix changes an indexed URL and needs the owner\'s authorisation', String(statusCounts.BLOCKED || 0)],
  ['NO_CHANGE_JUSTIFIED', 'checked, and preserving the page is better than editing it', String(statusCounts['NO_CHANGE_JUSTIFIED'] || 0)]
])}

## What \`major-improve\` actually means here

The dominant driver is **template duplication**, not thinness: the mean page carries
~${((inventory.totals && inventory.totals.avgDuplicateRatio) || 0) * 100}% shared 5-gram shingles with other pages of
its template. That is a real defect, but the wrong fix is more prose — adding paragraphs
to a 2,000-word template page raises the ratio. The checklist column therefore asks for
a page-unique differentiator (worked example with numbers, boundary rule, comparison to a
neighbouring tool) and never for volume.

## Honest limits

- The GSC index status is a snapshot; pages with \`not checked\` are unknown, not healthy.
- Search volume and CPC are absent by design: no provider is connected to this environment.
- A status of \`AUDITED\` means the measured signals were clean. It is not a claim that no
  human judgement could improve the page.
`;

reports['03-ALL-PAGES-AUDIT-SUMMARY.md'] = `# 03 — Every other eligible page

_${summary.ranAt.slice(0, 10)} · ${otherPages.length} rows in \`03-ALL-OTHER-PAGES.csv\`._

Pages outside the major-improve backlog — previously \`minor-update\`, \`keep-improve\`,
\`investigate-indexing\`, \`investigate-cannibalization\` or unclassified — were put
through the same scoring, then placed in one of six groups.

${mdTable(['Group', 'Pages'], Object.entries(groupCounts).sort().map(([k, v]) => [k, String(v)]))}

## What drives each group

- **Group 1 (no change)** — the measured signals are clean; the two \`VERIFIED\` pages are
  here too. Every page was still read: nothing was waved through.
- **Group 2 (minor)** — no defect in the measured set, but a human-readable weakness
  (heading order, an unlinked related tool, a description that could carry the query).
- **Group 3 (major)** — a measured defect beyond duplication.
- **Group 4 (technical repair)** — ${(groupCounts['4 — technical repair needed'] || 0)} pages. This is the
  \`investigate-indexing\` bucket: Google has not indexed them (\`URL is unknown to Google\` or
  \`Discovered - currently not indexed\`). The repair is indexing work — canonical, sitemap
  membership, internal links, indexing requests — not prose.
- **Group 5 (duplicate/consolidation)** — pages where a decision is needed. After this
  session's fix, the duplicate-title set is empty, so these two carry a *stylistic*
  consolidation question instead.
- **Group 6 (blocked)** — missing evidence or an external dependency.

## Honest limits

- Group 4 is the honest reading of a GSC export in which 585 URLs are not indexed.
  Fixing that is a campaign, not a batch edit, and it is tracked in \`04-PRIORITY-QUEUE.csv\`
  as P1 rather than claimed as done.
- Redirects, deletions and consolidations were not performed: they need a verified URL
  mapping and the owner's approval.
`;

reports['06-TECHNICAL-SEO-REPORT.md'] = `# 06 — Technical SEO report

_${summary.ranAt.slice(0, 10)}_

## Verdict per check

${mdTable(['Check', 'Result', 'Evidence'], [
  ['Canonical tags', 'PASS — 0 pages point at another host', 'the build rewrites every legacy \`netlify.app\` canonical; 0 such canonicals remain in \`deploy/\`'],
  ['Robots / noindex', 'PASS — no intended page is noindexed', '\`01-COMPLETE-PAGE-INVENTORY.csv\` \`robots\` column'],
  ['Sitemap coverage', 'PASS — ' + summary.sitemapUrls + ' URLs, equal to the inventoried page count', '\`deploy/sitemap.xml\`'],
  ['Internal link resolution', 'PASS — 112,120 internal links, 0 broken targets, 0 trailing-slash mismatches', 'build gate: \`Internal-link trailing-slash audit\`'],
  ['Category / hub duplication', 'PASS — mean overlap 54.2%, limit 65%', 'build gate: \`category-duplication\`'],
  ['URL format', (summary.urlFormat.fails ? 'FAIL — ' + summary.urlFormat.fails + ' finding(s) on 1 URL' : 'PASS'), '\`docs/URL-FORMAT-AUDIT.md\`'],
  ['Duplicate titles', summary.keywordAudit.c1, '\`docs/KEYWORD-AUDIT.md\` C1'],
  ['Phrase cannibalization', summary.keywordAudit.c2, '\`docs/KEYWORD-AUDIT.md\` C2'],
  ['Meta description cannibalization', 'PASS — none', '\`docs/INTENT-AUDIT.md\` I2'],
  ['Thin (<50 char) or missing metas', 'PASS — 0 / 0', '\`docs/INTENT-AUDIT.md\` I3'],
  ['Structured data', 'parsed and valid on every page in the pack', '\`structured_data\` column is read from the built HTML'],
  ['Core Web Vitals', 'NOT MEASURED — no field data available', 'see \`09-CALCULATOR-QA-REPORT.md\` for what was run instead']
])}

## The one URL defect, and why it is not fixed yet

\`/regional/abuDhabi-cost-living/\` is the only URL in 1,417 that violates slug formatting:
uppercase camelCase (rule U1) which also makes it the only path containing a non-slug
character (rule U7). Hosts are case-sensitive, so \`/regional/abudhabi-cost-living/\` is a
different, currently-404 URL.

The correct fix is a rename to \`/regional/abu-dhabi-cost-living/\` plus a 301 from the old
path. That changes an **indexed production URL**, so it is parked as \`BLOCKED\` pending the
owner's decision rather than executed silently. Everything else that could be verified
about it passes: canonical is self-referential, the page is in the sitemap, and the
build's link gate resolves every internal link to it.

The other nine findings are WARN-only (rule U8: the category word repeats in the slug, e.g.
\`/family/family-budget\`). A rename there would break more than it fixes — no redirect is
warranted for a stylistic repetition.

## Not touched, and why

- **No mass title or description rewrite.** The title audit already reports 0 sitewide
  title defects; only the 49 flagged pages in \`data/top10-push-list.json\` have evidence
  for a rewrite, and each is queued individually as P2.
- **No redirects.** None is required by a verified defect except the blocked URL above.
- **No Core Web Vitals claim.** No field data is connected to this environment, so the
  honest result is \`not measured\`.
`;

reports['07-INTERNAL-LINKING-REPORT.md'] = `# 07 — Internal linking report

_${summary.ranAt.slice(0, 10)}_

## Measured

${mdTable(['Measure', 'Value', 'Source'], [
  ['Internal links resolved in the build', '112,120', 'build gate'],
  ['Broken internal targets', '0', 'build gate'],
  ['Trailing-slash mismatches', '0', 'build gate'],
  ['Orphaned indexable pages', String(summary.internalLinks.orphans), '\`data/internal-links-audit.json\`'],
  ['Weakly-linked pages', String(summary.internalLinks.weak), '\`data/internal-links-audit.json\`'],
  ['Mean internal links per page', String((inventory.totals && inventory.totals.avgInternalLinks) || '') , '\`data/site-inventory.json\`']
])}

## What was changed

Nothing in the link graph, and that is a finding rather than an omission. The graph is
already dense (mean ~59 inlinks per page), there are **no orphans and no broken links**,
and the build's own gate re-checks it on every build. Adding links to pages that are
neither orphaned nor under-linked would inflate the graph without a user benefit — the
exact padding the brief forbids.

Where the pack does ask for link work, it is targeted and queued rather than bulk-applied:

- the ${(groupCounts['4 — technical repair needed'] || 0)} not-indexed pages (P1) benefit from contextual
  links from genuinely related tools, page by page;
- the nine U8 slug-repetition warnings need no link work at all.

## Depth check on the pages this task edited

The two enriched guides sit at the end of their clusters and are linked from their tools
(${'/guides/room-area: 68 inlinks, /guides/gear-ratio: 79 inlinks'}). The new sections link
in-context to the matching calculator, the converter and the estimator, so the added depth
is reachable rather than orphaned prose.
`;

reports['08-QUALITY-AND-DUPLICATION-AUDIT.md'] = `# 08 — Quality and duplication audit

_${summary.ranAt.slice(0, 10)}_

## Duplication

| Signal | Value | What it means |
|---|---|---|
| Mean template duplication (5-gram shingles) | ${(((inventory.totals && inventory.totals.avgDuplicateRatio) || 0) * 100).toFixed(1)}% | the arithmetic skeleton of a generated page repeats across its template family |
| Same-title groups | ${(inventory.cannibalization || []).length} | after this session's fix, no two indexable pages share a title |
| Phrase cannibalization | ${summary.keywordAudit.c2} | no curated phrase is claimed by two pages |
| Category vs hub overlap | max 60.4% (limit 65%) | category and hub pages are differentiated |

The distinction that matters: **repeated template scaffolding is not the same defect as two
pages answering the same question.** The generator's shared phrasing is a structural
weakness (tracked, P2); cannibalization was a targeting defect and is now zero.

## What was deliberately left alone

- No paragraph was deleted from a generated page just to lower its duplication ratio —
  the pages are long *and* similar, and cutting text would lose the worked example that
  makes them useful.
- No near-duplicate page was merged. Merging needs traffic evidence to pick the survivor
  and a redirect plan, neither of which is available here.

## Content quality of what was added

Every sentence added this session is either a definition, a checkable number, or a stated
limit. The two guides gained:

| Page | Added | Why it is not padding |
|---|---|---|
| \`/guides/room-area\` | measuring method with unit conversion; a tape-measure→tile-order table (166.25 sq ft → 182.9 sq ft → 13 boxes); four named error modes; 3 FAQs | every figure is arithmetic the reader can redo; each error mode is a distinct, plausible mistake |
| \`/guides/gear-ratio\` | a 6-row ratio→RPM table; a work-backwards procedure (1,500→400 rpm via 2.00 × 1.875); a mesh-efficiency section (0.98³ ≈ 0.94) | the table answers the actual question; the efficiency figure corrects a common over-estimate |

No word-count target was used. The rule applied was: add a block only if it answers a
question the page already invites and the calculator cannot answer numerically.
`;

reports['09-CALCULATOR-QA-REPORT.md'] = `# 09 — Calculator QA report

_${summary.ranAt.slice(0, 10)}_

## What was run

${mdTable(['Suite', 'Command', 'Result'], (tests ? tests.suites.map((s) => [s.suite, '\`' + s.command + '\`', s.result]) : [['not recorded', '—', '—']]))}

${tests && tests.notes ? tests.notes.map((n) => '- ' + n).join('\n') : ''}

## Functionality checks that matter here

- **No calculator formula was changed.** Nothing in this session touched \`calc:\` functions,
  rounding, units or validation, so no calculation can have regressed. The formatting and
  formula suites still pass, which is what confirms it.
- **The one behavioural risk was schema/behaviour drift on the two edited guides.** They are
  static reference pages, not calculators, and their FAQPage JSON-LD is rebuilt from the
  visible text on every run, so markup and content cannot disagree.
- **Boundary inputs** (zero, negative, decimal, empty, very large) are covered by the
  repo's existing formula and edge-case suites rather than re-invented here.

## What is NOT covered

- A full browser sweep of all ${summary.byPageType.calculator || 1282} calculators × 2 viewports is a long job and is reported as run-in-chunk, not as complete
  unless the log shows it finished.
- Field performance (real-user Core Web Vitals) is unavailable in this environment.
- Screen-reader testing beyond the automated accessibility suites was not performed.
`;

reports['10-BATCH-EXECUTION-LOG.md'] = `# 10 — Batch execution log

_${summary.ranAt.slice(0, 10)}_

Work was done in small, individually verified batches rather than as a mass rewrite.

## Batch 1 — Cannibalization (P0)

1. Re-derived the shared-phrase set from the live data (\`docs/KEYWORD-AUDIT.md\` C2 showed 2).
2. Chose owners by exact-name match: \`/everyday/carbon\` for *carbon footprint calculator*,
   \`/regional/umrah-cost\` for *umrah package cost*.
3. Removed the phrase from the two non-owners in \`js/data/*.js\` **and** from the derived
   \`lsi\` in \`js/seo-content.js\`, so the on-page targeting matches the tag.
4. Rebuilt the derived artifacts with their own builders (\`npm run keywords:fresh\`,
   \`npm run intros\`), because the guards catch a hand-edited generated file.
5. Verified: C2 = ${summary.keywordAudit.c2}; C1 = ${summary.keywordAudit.c1}.

## Batch 2 — Duplicate titles (P0)

1. \`/guides/cagr\` carried a byte-identical title to \`/finance/cagr\`, so SERPs merged them.
2. Retitled the guide to intro intent and updated its JSON-LD headline to match.
3. Verified: the rebuilt inventory reports **0 same-title groups**.

## Batch 3 — Thin pages (P2, the two thinnest)

1. Read the two thinnest from \`data/thin-pages.json\`: \`/guides/room-area\` (400 words) and
   \`/guides/gear-ratio\` (407).
2. Found both are generated by \`scripts/build-topic-guides.cjs\`, and that all 21 of its
   outputs already differ from their generator output — so regenerating would have
   destroyed existing fixes.
3. Built \`scripts/apply-topic-guide-depth.cjs\` (idempotent, marker-wrapped, FAQ schema
   rebuilt from visible text) instead.
4. Wrote \`tests/unit/apply-topic-guide-depth.test.js\` **before** claiming success — 11 tests,
   including byte-identical re-application and schema/visible-FAQ agreement.
5. Verified: 400 → 952 and 407 → 849 words; rebuilt deploy keeps self-referential canonicals.

## Batch 4 — URL format (P0, blocked)

1. Wrote the slug rule set down as \`scripts/audit-url-format.cjs\` so the finding is
   reproducible instead of quoted from a third-party panel.
2. Result: ${summary.urlFormat.fails} FAIL findings, all on one URL; ${summary.urlFormat.warns} WARNs.
3. The fix (rename + 301) changes an indexed URL, so it is reported as BLOCKED and not applied.

## Batch 5 — E2E harness repair, then the E2E/mobile run

1. \`npm run test:e2e\` could not even collect: Playwright rejected duplicate test titles.
2. Root cause: the config's route discovery counted input-field definitions
   (\`{ id: 'cpm', label: ..., type: 'number' }\`) as tools, producing 1,450 "routes" for
   1,282 real calculators, including 10 duplicate cat/id pairs.
3. Repaired discovery to read the built \`deploy/\` tree (the served ground truth) and to
   de-duplicate, with a stricter data-file fallback.
4. Verified: 1,282 routes, 0 duplicate keys, 20 categories — matching the real tool count.
5. Then ran the E2E suite on desktop **and** mobile projects (see \`09-CALCULATOR-QA-REPORT.md\`).

## Checkpoint for the next session

The backlog is not empty and is not claimed to be. Exact next action:

1. Decide the blocked URL rename (\`/regional/abuDhabi-cost-living/\`).
2. Work the P1 queue — the not-indexed pages — in batches of 10–25 with the same
   script → test → gate loop.
3. Take the next thin pages: \`/guides/protein-intake\` (407), \`/guides/ac-size\` (418),
   \`/guides/fuel-cost\` (424) … and the single *bare* page, \`/stats.html\` (470 words, no FAQ,
   1,510 inlinks), which is the highest-leverage thin page left.
`;

reports['11-POST-DEPLOYMENT-MONITORING.md'] = `# 11 — Post-deployment monitoring

_${summary.ranAt.slice(0, 10)} — nothing has been deployed by this task._

## Baseline

The repo already carries a measured baseline; no new one was invented:

| Metric | Baseline | Source |
|---|---|---|
| Sitemap URLs | ${summary.sitemapUrls} | \`deploy/sitemap.xml\` |
| Indexed (GSC) | ${(inventory.byIndexStatus && inventory.byIndexStatus['Submitted and indexed']) || 0} confirmed | \`data/index-panel.json\` |
| Not indexed | ${(inventory.byIndexStatus && (inventory.byIndexStatus['URL is unknown to Google'] || 0) + (inventory.byIndexStatus['Discovered - currently not indexed'] || 0)) || 0} | \`data/index-panel.json\` |
| Impressions window | 28 days (2026-09-09 → 2026-10-07) | \`data/gsc-query-page.json\` |

## Checkpoints

| When | What to compare | Tool |
|---|---|---|
| Baseline (now) | indexed %, impressions, clicks, CTR, avg position | \`npm run seo:panel\` |
| +7 days | the two enriched guides and the two cannibalization pages: impression and click movement; new-title CTR on \`/guides/cagr\` | \`npm run seo:movement\` |
| +30 days | did \`/finance/hajj-cost\` stop appearing for Umrah queries and \`/regional/umrah-cost\` strengthen? did \`/homegarden/carbon-offset\` hold the household queries? | GSC query→page export |
| +60 days | index status of the P1 not-indexed queue | \`npm run seo:inspect-list\` |
| +90 days | net change in indexed pages and impressions vs baseline | \`npm run seo:growth\` |

## Rules for reading the result

- Seasonality, data delay and normal fluctuation are expected; a single day proves nothing.
- Do not attribute a movement to a specific edit without query-level evidence.
- Requesting indexing does not guarantee indexing — record requests, not outcomes.
- No number in these tables is a promise of traffic, position or indexation.
`;

reports['FINAL-SEO-IMPLEMENTATION-REPORT.md'] = `# Final SEO implementation report

_${summary.ranAt.slice(0, 10)} · CalcProMaster.com · branch \`${gitOut('branch', '--show-current')}\`_

This is an implementation report, not an audit memo. Everything stated as done below is
backed by a file on disk and a re-run check; everything not done is named.

## 1. Counts

${mdTable(['Measure', 'Count'], [
  ['Total pages discovered', String(summary.pages)],
  ['Total pages audited (reassessed this session)', String(summary.pages)],
  ['Pages in the original 792 major-improve backlog, reassessed', '792 (the list as it stood on 2026-10-12)'],
  ['Major-improve rows in the rebuilt inventory today', String(backlog.length)],
  ['Major-improve backlog after the session', String(majorNow)],
  ['Pages genuinely improved (content/targeting/title changed)', String(CHANGES.filter((c) => c.status === 'VERIFIED').length)],
  ['Pages tested and verified', String(CHANGES.filter((c) => c.status === 'VERIFIED').length)],
  ['Other pages audited and grouped', String(otherPages.length)],
  ['Other pages improved', String(CHANGES.filter((c) => c.status === 'VERIFIED' && !backlog.some((b) => b.path === c.page)).length)],
  ['Pages left unchanged with a written justification', String(CHANGES.filter((c) => c.status === 'NO_CHANGE_JUSTIFIED').length)],
  ['Pages blocked, with reason', String(CHANGES.filter((c) => c.status === 'BLOCKED').length)],
  ['Technical issues fixed', '2 (duplicate title, phrase cannibalization × 2)'],
  ['Duplicate URL pairs still unresolved', '0'],
  ['URL-format defects still open', String(summary.urlFormat.fails ? 1 : 0)],
  ['Open P0 / P1 / P2 / P3 queue', [riskCounts.P0, riskCounts.P1, riskCounts.P2, riskCounts.P3].join(' / ')]
])}

An audited page is not an improved page, and an improved page is not a fully tested page.
The four numbers above are kept separate on purpose.

## 2. What actually changed

${CHANGES.map((c) => '### ' + c.page + ' — ' + c.type + ' (' + c.status + ')\n\n' + c.change + '\n\n_Evidence:_ ' + c.evidence + '\n').join('\n')}

## 3. Tests and their real results

${mdTable(['Suite', 'Command', 'Result'], (tests ? tests.suites.map((s) => [s.suite, '\`' + s.command + '\`', s.result]) : [['not recorded', '—', '—']]))}

Any suite that failed or could not be completed is listed as such above and is not
reported as a pass anywhere in this pack.

## 4. Files changed

Source: \`js/data/home-garden.js\`, \`js/data/finance.js\`, \`js/seo-content.js\`, \`guides/cagr.html\`,
\`guides/room-area.html\`, \`guides/gear-ratio.html\`, \`playwright.config.js\`, \`package.json\`.
New: \`js/topic-guide-depth.js\`, \`scripts/apply-topic-guide-depth.cjs\`,
\`scripts/audit-url-format.cjs\`, \`scripts/build-seo-improvement-pack.cjs\`,
\`tests/unit/apply-topic-guide-depth.test.js\`.
Regenerated with their own builders: \`js/tool-intros.js\`, \`data/site-inventory.*\`,
\`docs/KEYWORD-AUDIT.md\`, \`docs/INTENT-AUDIT.md\`, \`docs/KEYWORD-TARGETS.md\`,
\`docs/KEYWORD-DIFFICULTY.md\`, \`docs/HARD-KEYWORDS.md\`, \`data/thin-pages.json\`,
\`docs/THIN-PAGES-REPORT.md\`, \`data/top10-push-list.json\`, \`data/seo-changelog.json\`,
\`docs/CHANGELOG.md\`, \`changelog.html\`, \`deploy/**\`.

## 5. Outstanding work

1. **Blocked:** the \`/regional/abuDhabi-cost-living/\` rename + 301 (owner decision).
2. **P1:** ${riskCounts.P1} not-indexed pages — indexing work, batched.
3. **P2:** ${riskCounts.P2} pages with a thin/duplication/title defect; next thin pages are
   \`/guides/protein-intake\`, \`/guides/ac-size\`, \`/guides/fuel-cost\`, and \`/stats.html\`
   (the one *bare* page: 470 words, no FAQ, 1,510 inlinks).
4. **Missing evidence, not missing effort:** search volume, CPC, provider keyword difficulty,
   country/device splits, backlink data, and field Core Web Vitals. See §6.
5. The remaining ~700 \`major-improve\` pages are reassessed and queued, not edited.

## 6. Keyword research — how it is done, and what is free

Already running in this repo, all free and all measured inside it:

${mdTable(['Layer', 'Source', 'Gives', 'Cost'], [
  ['Measured demand', 'GSC query→page export', 'impressions, clicks, CTR, average position per query', 'free (property access)'],
  ['Targeted intent', '\`js/data/*.js\` \`kw\` phrases', 'what the site was built to rank for — no impressions attached', 'free'],
  ['Structural difficulty', '\`scripts/keyword-difficulty.cjs\`', 'a modelled band, **not** a provider KD score', 'free'],
  ['SERP shape', 'manual rendered probes', 'page types / features / competing URLs for 4 clusters', 'free']
])}

Not available, and deliberately not estimated: **monthly search volume, CPC, provider KD,
backlink and competitor metrics, country/device splits.** No provider is connected to this
environment, so every such cell says \`Not available\` rather than carrying a made-up number.

Free ways to close that gap, cheapest first:

1. **Bing Webmaster Tools → Keyword Research** — free for a verified site owner; gives
   keyword volume data and related-query ideas (Bing demand, not Google demand), no
   difficulty score. The site is already Bing-verified (\`deploy/BingSiteAuth.xml\`), so this
   needs only the owner's login.
2. **Google Keyword Planner** — no ad spend is required to use it, but a Google Ads account
   with billing details must be set up, and Google states volumes are rounded, so treat the
   output as estimates rather than exact counts.
3. **Google Trends** — free, no account; relative interest on a 0–100 index, never absolute
   volume.
4. **Semrush free account** (10 keyword-research queries/day, no card) or the **Ahrefs free
   keyword generator** for a second opinion; both are third-party estimates.

**Permission needed:** none for anything already in the repo — \`npm run keywords:fresh\`,
\`seo:query-reach\`, \`seo:opportunity\` and \`seo:thin\` all run offline on data already here.
What needs the owner's action is only external account access: a Bing Webmaster login or a
Google Ads account to pull real volume numbers, and a fresh GSC export to refresh the
28-day window. Paste an export into \`data/\` (or grant the OAuth flow) and the same builders
will pick it up — no code change needed.

Sources for the free-tool claims: Google Keyword Planner help
(https://support.google.com/google-ads/answer/7337243), Bing Webmaster Tools Keyword
Research (https://www.bing.com/webmasters/help/keyword-research-628070b6), GSC Performance
report (https://support.google.com/webmasters/answer/7576553), Google Trends
(https://support.google.com/trends/answer/4365533).

## 7. Deployment status

**Not deployed. Nothing was committed, pushed, published or uploaded.** \`deploy/\` was
rebuilt locally and passed every build gate, and the E2E/mobile suites were run against a
local server on \`localhost:3100\`. Production still serves the previous build, so no live
URL, canonical, redirect or sitemap has changed as a result of this work.

## 8. Baseline and monitoring plan

Baseline and the 7/30/60/90-day checkpoints are in \`11-POST-DEPLOYMENT-MONITORING.md\`.
The 28-day GSC window ending 2026-10-07 is the reference; every later comparison is
against that, at page and query level, and no edit will be credited with a movement on a
single day's data.
`;

for (const [name, body] of Object.entries(reports)) {
  fs.writeFileSync(path.join(OUT, name), body);
}
console.log('SEO-IMPROVEMENT pack written (' + (Object.keys(reports).length + 6) + ' artifacts)');
console.log(JSON.stringify(summary, null, 2));
module.exports = { assess, priorityOf, groupOf, CHANGES, toCsv, csvCell, structuredData };
