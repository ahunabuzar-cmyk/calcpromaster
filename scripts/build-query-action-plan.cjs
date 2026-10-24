#!/usr/bin/env node
// ============================================================
// CalcProMaster — Query → action plan
// ------------------------------------------------------------
// Turns the GSC query→page join into a work list instead of a wall of numbers.
// For every page the join knows about it answers three questions:
//
//   1. Is the modelled "upside" real? A page whose impressions come from
//      machine-shaped query strings ("+mifflin st jeor equation women 10 weight
//      6.25 height 5 age 161 source%") can never be clicked no matter what the
//      title says — those impressions are not people. The plan recomputes the
//      upside on HUMAN impressions only and ranks on that, so the top of the
//      list is work that can actually pay.
//   2. What is the page's best real query, at what position, and what does its
//      title say today?
//   3. Is the page fixable by copy (position 4-20, human demand) or does it need
//      authority the site does not have yet (position 50+)?
//
// Output:
//   docs/QUERY-ACTION-PLAN.md          the human work list
//   data/query-action-plan.json        machine-readable, same rows
//   data/query-action-overrides.json   title/meta proposals for the top bucket,
//                                      in apply-seo-overrides CTR_OVERRIDES shape
// Usage: node scripts/build-query-action-plan.cjs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadAllTools } = require(path.join(__dirname, '..', 'generate-intros.js'));
const { isMachineQuery } = require('./audit-query-quality.cjs');

const ROOT = path.join(__dirname, '..');
const OPP = path.join(ROOT, 'data', 'query-opportunity.json');
const NOT_INDEXED = path.join(ROOT, 'data', 'not-indexed-audit.json');
const OUT_MD = path.join(ROOT, 'docs', 'QUERY-ACTION-PLAN.md');
const OUT_JSON = path.join(ROOT, 'data', 'query-action-plan.json');
const OUT_OVR = path.join(ROOT, 'data', 'query-action-overrides.json');

// CTR by position band. Used ONLY to rank work against work; it is a model, not
// a measurement, and every number it produces is labelled as modelled.
const CTR_BANDS = [
  { maxPos: 3, ctr: 0.22, target: 0.28 },
  { maxPos: 6, ctr: 0.10, target: 0.14 },
  { maxPos: 10, ctr: 0.05, target: 0.08 },
  { maxPos: 20, ctr: 0.012, target: 0.03 },
  { maxPos: 50, ctr: 0.004, target: 0.01 },
  { maxPos: Infinity, ctr: 0.001, target: 0.003 }
];
const bandFor = (pos) => CTR_BANDS.find((b) => pos <= b.maxPos);

function titleCase(s) {
  return String(s).replace(/\S+/g, (w) => (w.length > 3 ? w[0].toUpperCase() + w.slice(1) : w));
}

function main() {
  if (!fs.existsSync(OPP)) {
    console.error('✖ data/query-opportunity.json missing — run: node scripts/build-query-opportunity.cjs');
    process.exit(1);
  }
  const opp = JSON.parse(fs.readFileSync(OPP, 'utf8'));
  const tools = loadAllTools();
  const byId = new Map(tools.map((t) => [t.id, t]));
  // The live SEO entries: the report has to show the copy that is actually
  // shipped, not what the engine would write today.
  const seo = (() => {
    try {
      const sb = { window: {}, console: { log() {}, warn() {}, error() {} } };
      vm.createContext(sb);
      vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'seo-content.js'), 'utf8'), sb);
      return sb.window.TOOL_SEO || {};
    } catch (e) { return {}; }
  })();

  const rows = opp.rows.map((r) => {
    const seg = String(r.path).replace(/\/+$/, '').split('/').filter(Boolean);
    const id = seg[seg.length - 1];
    const tool = byId.get(id);
    const queries = r.queries || [];
    const machine = queries.filter((q) => isMachineQuery(q.query));
    const machineImpressions = machine.reduce((n, q) => n + (q.impressions || 0), 0);
    const human = queries.filter((q) => !isMachineQuery(q.query));
    const humanImpressions = Math.max(0, (r.impressions || 0) - machineImpressions);
    const band = bandFor(r.position || 999);
    const modelledUpside = Math.round((humanImpressions * (band.target - band.ctr)) * 10) / 10;
    const machineShare = r.impressions ? machineImpressions / r.impressions : 0;
    const best = human.slice().sort((a, b) => (b.impressions || 0) - (a.impressions || 0))[0] || null;

    // The join carries guide, blog and compare pages too. Their last path
    // segment is NOT a tool id: /guides/tip would otherwise resolve to the tip
    // calculator at /finance/tip, and a proposal or override built from the guide
    // row would be applied to the wrong page. 21 of the 499 rows are like this.
    const pageType = /^\/(guides|blog|compare)\b/.test(String(r.path)) ? 'guide' : 'tool';

    // A title proposal is only offered when the copy is the likely blocker:
    // a real query, a position where the click is winnable, and a tool we can name.
    const proposal = (pageType === 'tool' && tool && best && r.position <= 20) ? propose(tool, best.query) : null;
    // Some pages never went through the override pass: their meta is still the
    // raw engine template. Those are the only pages where copy is demonstrably
    // the thing to change, so they are listed separately from the rest.
    const entry = seo[id] || {};
    const currentTitle = entry.title || '';
    const rawMeta = /instantly, with every step of the math shown/.test(String(entry.metaDesc || ''));
    // "Am I targeting what Google is showing me for?" — the share of the best
    // real query's content words that appear in the page's title, meta and
    // answer block. A page can rank for a query it never mentions; when that
    // happens the copy is leaving the intent on the table. This is the number
    // that decides whether more copy work is worth doing at all.
    const queryCoverage = best ? coverage(best.query, entry) : null;

    return {
      path: r.path,
      id,
      pageType,
      name: tool ? tool.name : id,
      impressions: r.impressions || 0,
      clicks: r.clicks || 0,
      ctr: r.ctr || 0,
      position: Math.round((r.position || 0) * 10) / 10,
      status: r.status,
      machineImpressions,
      humanImpressions,
      machineShare: Math.round(machineShare * 1000) / 1000,
      modelledUpside,
      bestQuery: best ? best.query : '',
      bestQueryImpressions: best ? best.impressions : 0,
      bestQueryPosition: best ? Math.round((best.position || 0) * 10) / 10 : 0,
      currentTitle,
      rawMeta,
      queryCoverage,
      proposal
    };
  });

  rows.sort((a, b) => b.modelledUpside - a.modelledUpside);

  const zeroClickPage1 = rows.filter((r) => r.status === 'zero-click page 1');
  const striking = rows.filter((r) => r.status === 'striking distance');
  const shaping = rows.filter((r) => r.status === 'page 1 shaping');
  const machineDominated = rows.filter((r) => r.machineShare >= 0.5);
  const rawCopy = rows.filter((r) => r.rawMeta && r.pageType === 'tool'
    && ['zero-click page 1', 'striking distance', 'page 1 shaping'].includes(r.status));
  const guideRows = rows.filter((r) => r.pageType === 'guide');
  const scored = rows.filter((r) => typeof r.queryCoverage === 'number');
  const covered = scored.filter((r) => r.queryCoverage >= 0.6);
  const missed = scored.filter((r) => r.queryCoverage < 0.6)
    .sort((a, b) => b.humanImpressions - a.humanImpressions);

  const notIndexed = fs.existsSync(NOT_INDEXED) ? JSON.parse(fs.readFileSync(NOT_INDEXED, 'utf8')) : null;

  // ---- overrides file: only pages where copy can plausibly move the needle ----
  const overrides = {};
  for (const r of [...zeroClickPage1, ...striking]) {
    if (!r.proposal || r.machineShare > 0.3 || r.pageType !== 'tool') continue;
    overrides[r.id] = { title: r.proposal.title, metaDesc: r.proposal.metaDesc, source: 'gsc query action plan' };
  }
  fs.writeFileSync(OUT_OVR, JSON.stringify(overrides, null, 2) + '\n');

  // ---- markdown report ----
  const line = (n) => (Math.round(n * 10) / 10).toLocaleString('en-US');
  const md = [];
  md.push('# Query → Action Plan');
  md.push('');
  md.push('Generated from `data/query-opportunity.json` (GSC window ' + opp.window.startDate + ' → ' + opp.window.endDate + ').');
  md.push('Upside here is recomputed on **human impressions only** — impressions from machine-shaped query strings cannot be clicked, so they are removed before ranking.');
  md.push('');
  md.push('| bucket | pages | impressions | human impressions | clicks |');
  md.push('|---|---|---|---|---|');
  for (const [label, list] of [['zero-click page 1', zeroClickPage1], ['striking distance (11-20)', striking], ['page 1 shaping (4-10)', shaping]]) {
    const sum = (f) => list.reduce((n, r) => n + f(r), 0);
    md.push('| ' + label + ' | ' + list.length + ' | ' + sum((r) => r.impressions).toLocaleString('en-US')
      + ' | ' + sum((r) => r.humanImpressions).toLocaleString('en-US') + ' | ' + sum((r) => r.clicks) + ' |');
  }
  md.push('');
  md.push('## Work list, ranked by modelled upside on human impressions');
  md.push('');
  md.push('| # | page | position | impressions | human | machine | clicks | best real query | modelled upside (clicks/28d) |');
  md.push('|---|---|---|---|---|---|---|---|---|');
  rows.filter((r) => r.modelledUpside > 0 && r.machineShare < 0.5).slice(0, 40).forEach((r, i) => {
    md.push('| ' + (i + 1) + ' | `' + r.path + '` | ' + r.position + ' | ' + r.impressions + ' | ' + r.humanImpressions + ' | '
      + Math.round(r.machineShare * 100) + '% | ' + r.clicks + ' | ' + (r.bestQuery || '—').slice(0, 44) + ' | ' + line(r.modelledUpside) + ' |');
  });
  md.push('');
  md.push('## Title/meta proposals (top buckets)');
  md.push('');
  md.push('Proposals exist for pages with a real query and a winnable position (4-20). They are starting copy: check each against the live page before shipping.');
  md.push('');
  const withProposal = [...zeroClickPage1, ...striking].filter((r) => r.proposal && r.machineShare <= 0.3);
  if (!withProposal.length) md.push('_None._');
  for (const r of withProposal) {
    md.push('### `' + r.path + '` — pos ' + r.position + ', ' + r.impressions + ' impressions (' + Math.round(r.machineShare * 100) + '% machine)');
    md.push('');
    md.push('- best real query: **' + (r.bestQuery || '—') + '** (' + r.bestQueryImpressions + ' impressions, pos ' + r.bestQueryPosition + ')');
    md.push('- proposed title: `' + r.proposal.title + '` (' + r.proposal.title.length + ' chars)');
    md.push('- proposed meta: `' + r.proposal.metaDesc + '` (' + r.proposal.metaDesc.length + ' chars)');
    md.push('');
  }
  md.push('## Is the copy targeting the queries Google shows us for?');
  md.push('');
  md.push('For every page whose best real query is in English, this is the share of that query\'s content words present in the page title, meta and answer block.');
  md.push('');
  md.push('| | pages | human impressions | |');
  md.push('|---|---|---|---|');
  md.push('| copy already targets the query (>=60% of its words) | ' + covered.length + ' | ' + covered.reduce((n, r) => n + r.humanImpressions, 0) + ' | no copy work needed |');
  md.push('| copy misses the query | ' + missed.length + ' | ' + missed.reduce((n, r) => n + r.humanImpressions, 0) + ' | candidate for a rewrite |');
  md.push('');
  md.push('Where the miss is real (a ranked page, a query with actual demand):');
  md.push('');
  md.push('| page | position | human impressions | coverage | best query |');
  md.push('|---|---|---|---|---|');
  missed.filter((r) => r.pageType === 'tool' && r.position <= 20).slice(0, 20).forEach((r) => {
    md.push('| `' + r.path + '` | ' + r.position + ' | ' + r.humanImpressions + ' | ' + Math.round(r.queryCoverage * 100) + '% | ' + String(r.bestQuery).slice(0, 48) + ' |');
  });
  md.push('');
  md.push('## Not covered by this plan (guide, blog and compare pages)');
  md.push('');
  md.push(guideRows.length + ' of the ' + rows.length + ' rows are guide/blog/compare pages, not calculators. Their last path segment is not a tool id (`/guides/tip` is a guide, the calculator is `/finance/tip`), so this plan neither proposes copy for them nor emits an override — editing the wrong page is worse than leaving it. Handle those files directly: `' + guideRows.slice(0, 6).map((r) => r.path).join('`, `') + '`.');
  md.push('');
  md.push('## Copy that is still the raw engine template');
  md.push('');
  md.push('The engine wrote `"Free <name>: enter the <inputs> and get the <result> instantly, with every step of the math shown"` before the override pass, and a handful of pages still carry it. A few of those titles are also a truncated label list (`"Moon Phase Calculator: Date"`, `"URL Encoder / Decoder: Encode"`) — user-visible, and the honest reason to fix them. The click upside of this bucket is small and stated as such: modelled ' + line(rawCopy.reduce((n, r) => n + r.modelledUpside, 0)) + ' clicks / 28d across all ' + rawCopy.length + ' pages.');
  md.push('');
  md.push('| page | position | impressions | title |');
  md.push('|---|---|---|---|');
  rawCopy.slice(0, 30).forEach((r) => {
    md.push('| `' + r.path + '` | ' + r.position + ' | ' + r.impressions + ' | `' + (r.currentTitle || '') + '` |');
  });
  md.push('');
  md.push('## Pages to leave alone: impressions are not people');
  md.push('');
  md.push('| page | impressions | machine share | why the upside is not real |');
  md.push('|---|---|---|---|');
  machineDominated.slice(0, 15).forEach((r) => {
    md.push('| `' + r.path + '` | ' + r.impressions + ' | ' + Math.round(r.machineShare * 100) + '% | search strings are machine-shaped; no title change can convert them |');
  });
  md.push('');
  md.push('## Indexing: ' + (notIndexed ? notIndexed.notIndexedTotal + ' pages are not indexed' : 'see data/not-indexed-audit.json'));
  md.push('');
  if (notIndexed) {
    md.push('State tally: `' + JSON.stringify(notIndexed.stateTally) + '` — **fixable: ' + notIndexed.fixable + '**.');
    md.push('');
    md.push('Every one of these pages is technically sound and simply waiting to be crawled. There is no code fix for `WAITING_CRAWL`; the levers are (1) GSC → URL Inspection → Request Indexing, in the order in `docs/REQUEST-INDEXING-TOP40.md`, and (2) giving the pages real internal links from already-indexed pages (see `data/internal-links-audit.json`).');
    md.push('');
    // A page that GSC shows impressions for is indexed by definition, so any
    // page in the coverage list that has impressions is proof the list is old.
    const stale = indexedButListed(notIndexed);
    md.push('- coverage snapshot: **' + (notIndexed.snapshotRanAt || 'unknown') + '** — treat this list as evidence, not as today\'s truth');
    md.push('- pages the list calls not-indexed that already have impressions (so they are indexed): **' + stale.count + '**, including ' + stale.sample.map((u) => '`' + u + '`').join(', '));
    md.push('- so the real not-indexed count is **at most ' + (notIndexed.notIndexedTotal - stale.count) + '**, and lower than that for every indexed page with no impressions yet');
  }
  md.push('');
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_MD, md.join('\n'));

  fs.writeFileSync(OUT_JSON, JSON.stringify({
    generatedFrom: { opportunity: 'data/query-opportunity.json', window: opp.window },
    buckets: {
      zeroClickPage1: zeroClickPage1.length,
      strikingDistance: striking.length,
      page1Shaping: shaping.length,
      machineDominated: machineDominated.length
    },
    modelledUpsideHumanOnly: Math.round(rows.reduce((n, r) => n + (r.machineShare < 0.5 ? r.modelledUpside : 0), 0) * 10) / 10,
    proposalCount: Object.keys(overrides).length,
    rows
  }, null, 2) + '\n');

  console.log('buckets: zero-click page 1 = ' + zeroClickPage1.length
    + ', striking = ' + striking.length
    + ', page-1 shaping = ' + shaping.length
    + ', machine-dominated = ' + machineDominated.length);
  console.log('modelled upside on human impressions only: ' + line(rows.reduce((n, r) => n + (r.machineShare < 0.5 ? r.modelledUpside : 0), 0)) + ' clicks / 28d');
  console.log('title/meta proposals written: ' + Object.keys(overrides).length + '  →  data/query-action-overrides.json');
  console.log('report: docs/QUERY-ACTION-PLAN.md (' + rows.length + ' pages)');
}

// Share of the query's own content words that appear on the page. Function words
// are dropped: matching "how" or "does" would say nothing about targeting.
const STOPWORDS = new Set(['calculator', 'free', 'online', 'the', 'and', 'for', 'how', 'much', 'what',
  'is', 'to', 'of', 'in', 'my', 'do', 'i', 'you', 'your', 'with', 'on', 'does', 'are', 'a', 'an', 'it', 'that']);
function coverage(query, entry) {
  const words = (String(query).toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 2 && !STOPWORDS.has(w));
  if (!words.length) return null;
  const hay = ((entry.title || '') + ' ' + (entry.metaDesc || '') + ' ' + (entry.aeo || '')).toLowerCase();
  return Math.round((words.filter((w) => hay.includes(w)).length / words.length) * 100) / 100;
}

// Which of the coverage list's URLs GSC is already showing impressions for. Such
// a URL is in the index (it is being served), so the snapshot that lists it as
// not-indexed is out of date for that page.
function indexedButListed(notIndexed) {
  const listed = new Set();
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') {
      if (typeof o.url === 'string') listed.add(o.url.replace(/\/+$/, '') + '/');
      Object.values(o).forEach(walk);
    }
  };
  walk(notIndexed);
  let withImpressions = [];
  try {
    const pages = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'gsc-page-impressions.json'), 'utf8')).pages || {};
    withImpressions = Object.keys(pages).map((u) => u.replace(/\/+$/, '') + '/');
  } catch (e) { /* no impressions file: nothing to check against */ }
  const hits = withImpressions.filter((u) => listed.has(u));
  hits.sort();
  return { count: hits.length, sample: hits.slice(0, 4) };
}

// Build a title/meta pair from the page's own name, its real query and its input
// labels. Validated against the site's own gates (title 30-60 chars, meta 120-158)
// so a proposal cannot fail the build gates it will eventually pass through.
function propose(tool, query) {
  const labels = (tool.inputs || []).map((i) => String(i.label || '')).filter(Boolean);
  const nameWords = new Set(String(tool.name).toLowerCase().match(/[a-z0-9]+/g) || []);
  const qWords = String(query).toLowerCase().match(/[a-z0-9]+/g) || [];
  const extra = qWords.filter((w) => w.length > 2 && !nameWords.has(w) && !['calculator', 'free', 'online', 'the', 'and', 'for'].includes(w));

  let title = `${tool.name}: ${titleCase(extra.slice(0, 3).join(' '))}`;
  if (extra.length === 0) title = `${tool.name}: ${titleCase(labels.slice(0, 2).join(' & '))}`;
  if (title.length > 60) title = title.slice(0, 60).replace(/\s+\S*$/, '');
  if (title.length < 30) title = `${tool.name}: ${titleCase(labels.slice(0, 3).join(', '))}`;

  const labelText = labels.slice(0, 3).join(', ');
  let metaDesc = `${tool.name} works out ${query} from ${labelText || 'the values you enter'}, showing the formula and every step. Free, no sign-up, nothing leaves your browser.`;
  if (metaDesc.length > 158) metaDesc = `${tool.name}: ${query} with the formula and every step shown. Free, no sign-up, nothing leaves your browser.`;
  if (metaDesc.length < 120) metaDesc = `${tool.name} works out ${query} from ${labelText || 'the values you enter'} and shows the formula, every intermediate step and the assumptions. Free and offline-friendly.`;

  return {
    title,
    metaDesc: metaDesc.length > 158 ? metaDesc.slice(0, 155).replace(/\s+\S*$/, '') + '…' : metaDesc
  };
}

if (require.main === module) main();
module.exports = { propose };
