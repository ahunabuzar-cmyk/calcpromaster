#!/usr/bin/env node
/**
 * Keyword-gap re-check — fresh GSC data + search intent, one verdict per row.
 *
 * The gap audit (scripts/audit-keyword-gap.cjs) answers "does a page slug/title
 * carry this keyword?" with a string match. That is the right first pass and the
 * wrong final answer: most of the 100+ "gaps" it reports are synonyms of pages
 * that already exist ("cd bank calculator" → /finance/cd-calculator), brand
 * lookups we have no dataset for ("chipotle nutrition"), or navigational queries
 * no page can win ("show calculator").
 *
 * This script re-checks every actionable row (GAP + WEAK) against
 *   a) the fresh 28-day GSC query→page join (data/gsc-query-page.json), and
 *   b) a curated intent decision: which existing page owns the intent, or why
 *      a new page is the only honest option, or why the row is not buildable.
 *
 * Outputs:
 *   data/keyword-gap-recheck.json
 *   docs/KEYWORD-GAP-RECHECK.md
 *
 * Usage: node scripts/recheck-keyword-gaps.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// A keyword row is only "approved for a new page" when the decision map says so.
// Everything else is covered on an existing page, held for missing data, or
// rejected as navigational. Keys are the exact keyword strings from the gap CSV.
const STOPS = new Set(['calculator', 'calculators', 'the', 'a', 'an', 'of', 'for', 'on', 'this', 'my', 'in', 'to', 'and']);

const DECISIONS = {
  // ---- genuinely different intent, nothing on the site covers it -------------
  'snow day calculator': { verdict: 'NEW_PAGE', path: '/everyday/snow-day', why: 'Predicts a school-closure decision from snow forecast and district thresholds; no existing page models closure. Seasonal, so build only with a transparent rule set.' },
  'snow days calculator': { verdict: 'DUPLICATE', canonical: 'snow day calculator' },

  // ---- existing page owns the intent; title/section may say it better --------
  'cd bank calculator': { verdict: 'COVER_EXISTING', path: '/finance/cd-calculator', why: 'CD = certificate of deposit; the page already prices one.' },
  'bank certificate calculator': { verdict: 'COVER_EXISTING', path: '/finance/cd-calculator' },
  'calculator for certificate of deposit': { verdict: 'COVER_EXISTING', path: '/finance/cd-calculator' },
  'certified deposit calculator': { verdict: 'COVER_EXISTING', path: '/finance/cd-calculator', why: '"certified deposit" is a misspelling of certificate of deposit.' },
  'deposit certificate calculator': { verdict: 'COVER_EXISTING', path: '/finance/cd-calculator' },
  'certificate deposit calculator': { verdict: 'COVER_EXISTING', path: '/finance/cd-calculator' },
  'time card clock calculator': { verdict: 'COVER_EXISTING', path: '/career/timesheet-hours', why: 'Same job: hours from clock-in/clock-out.' },
  'time payroll calculator': { verdict: 'COVER_EXISTING', path: '/career/timesheet-hours' },
  'pay time calculator': { verdict: 'COVER_EXISTING', path: '/career/timesheet-hours' },
  'time adder': { verdict: 'COVER_EXISTING', path: '/career/timesheet-hours' },
  'hour counter': { verdict: 'COVER_EXISTING', path: '/career/timesheet-hours' },
  'ft2 calculator': { verdict: 'COVER_EXISTING', path: '/conversion/area', why: 'ft² is a unit of area.' },
  'ft squared calculator': { verdict: 'COVER_EXISTING', path: '/conversion/area' },
  'day count': { verdict: 'COVER_EXISTING', path: '/everyday/date-diff' },
  'calendar calculator': { verdict: 'COVER_EXISTING', path: '/everyday/date-diff' },
  'bmi calculator body mass index': { verdict: 'COVER_EXISTING', path: '/health/bmi' },
  'financial compound calculator': { verdict: 'COVER_EXISTING', path: '/finance/compound-interest' },
  'financial compounding calculator': { verdict: 'COVER_EXISTING', path: '/finance/compound-interest' },
  'compounded daily calculator': { verdict: 'COVER_EXISTING', path: '/finance/compound-interest' },
  'compounded annually calculator': { verdict: 'COVER_EXISTING', path: '/finance/compound-interest' },
  'compounded monthly calculator': { verdict: 'COVER_EXISTING', path: '/finance/compound-interest' },
  'yearly interest calculator': { verdict: 'COVER_EXISTING', path: '/finance/compound-interest' },
  'interest percentage calculator': { verdict: 'COVER_EXISTING', path: '/finance/simple-interest' },
  'interest accrual calculator': { verdict: 'COVER_EXISTING', path: '/finance/simple-interest' },
  'figure out interest rate on loan': { verdict: 'COVER_EXISTING', path: '/finance/loan-emi', why: 'The reverse mode solves the rate from payment and term.' },
  'loan percentage calculator': { verdict: 'COVER_EXISTING', path: '/finance/loan-emi' },
  'ot calculator': { verdict: 'COVER_EXISTING', path: '/career/overtime-pay' },
  'simplify calculator': { verdict: 'COVER_EXISTING', path: '/math/fraction', why: 'Simplify is a fraction operation; the fraction tool reduces.' },
  'desired weight calculator': { verdict: 'COVER_EXISTING', path: '/health/ideal-body-weight' },
  'simple loan calculator': { verdict: 'COVER_EXISTING', path: '/finance/loan-emi' },
  'payment planner': { verdict: 'COVER_EXISTING', path: '/finance/loan-emi' },
  'loan calculator for business': { verdict: 'COVER_EXISTING', path: '/finance/loan-emi' },
  'fv calculator': { verdict: 'COVER_EXISTING', path: '/finance/future-value' },
  'pv calculator': { verdict: 'COVER_EXISTING', path: '/finance/present-value' },
  'savings calculator simple': { verdict: 'COVER_EXISTING', path: '/everyday/compound-savings' },
  'percentage return calculator': { verdict: 'COVER_EXISTING', path: '/finance/investment' },
  'share return calculator': { verdict: 'COVER_EXISTING', path: '/finance/investment' },
  'compound investment calculator': { verdict: 'COVER_EXISTING', path: '/finance/investment' },
  'investment calculator over time': { verdict: 'COVER_EXISTING', path: '/finance/investment' },
  'mortgage and tax calculator': { verdict: 'COVER_EXISTING', path: '/finance/mortgage' },
  'mortgage expense calculator': { verdict: 'COVER_EXISTING', path: '/finance/mortgage' },
  'retirement plan estimator': { verdict: 'COVER_EXISTING', path: '/finance/retirement' },
  'simple retirement calculator': { verdict: 'COVER_EXISTING', path: '/finance/retirement' },
  'retirement planner calculator': { verdict: 'COVER_EXISTING', path: '/finance/retirement' },
  'projected retirement calculator': { verdict: 'COVER_EXISTING', path: '/finance/retirement' },
  'retirement budget calculator': { verdict: 'COVER_EXISTING', path: '/finance/retirement-withdrawal' },
  'spending calculator retirement': { verdict: 'COVER_EXISTING', path: '/finance/retirement-withdrawal' },
  'retirement expenditure calculator': { verdict: 'COVER_EXISTING', path: '/finance/retirement-withdrawal' },
  'reverse tax calculator': { verdict: 'COVER_EXISTING', path: '/finance/tax', why: 'The tax page reverses net to gross.' },
  'percentage discount calculator': { verdict: 'COVER_EXISTING', path: '/finance/discount' },
  'daily interest calculator': { verdict: 'COVER_EXISTING', path: '/finance/simple-interest' },
  'inflation salary calculator': { verdict: 'COVER_EXISTING', path: '/finance/inflation-adjusted' },
  'dob calculator': { verdict: 'COVER_EXISTING', path: '/guides/age' },
  'calculate age by birthday': { verdict: 'COVER_EXISTING', path: '/guides/age' },
  'age calendar': { verdict: 'COVER_EXISTING', path: '/guides/age' },
  'credit rate calculator': { verdict: 'COVER_EXISTING', path: '/finance/credit-card-payoff' },
  'yearly salary calculator': { verdict: 'COVER_EXISTING', path: '/finance/salary' },
  'yearly pay calculator': { verdict: 'COVER_EXISTING', path: '/finance/salary' },
  'yearly income calculator': { verdict: 'COVER_EXISTING', path: '/finance/salary' },
  'housing cost calculator': { verdict: 'COVER_EXISTING', path: '/finance/rent-affordability' },
  'housing cost estimator': { verdict: 'COVER_EXISTING', path: '/finance/rent-affordability' },
  'convert currency xe': { verdict: 'COVER_EXISTING', path: '/finance/currency-converter', why: 'Brand modifier only; the page is the same conversion.' },
  'convert xe currency': { verdict: 'COVER_EXISTING', path: '/finance/currency-converter' },
  'currency calculator xe': { verdict: 'COVER_EXISTING', path: '/finance/currency-converter' },
  'forex xe converter': { verdict: 'COVER_EXISTING', path: '/finance/currency-converter' },
  'compounding calculator yearly': { verdict: 'COVER_EXISTING', path: '/finance/cagr' },
  'paycheck deduction calculator': { verdict: 'COVER_EXISTING', path: '/finance/payroll-tax' },

  // ---- cannot be built honestly today: no dataset or clinical safety review --
  'polypeptide calculator': { verdict: 'HOLD', why: 'Peptide dosing is a clinical calculation; building it needs a reviewed protocol and a safety page, not a template.' },
  'chipotle calculator nutrition': { verdict: 'HOLD', why: 'Requires up-to-date per-item nutrition data we do not hold; stale numbers would be worse than no page.' },
  'nutrition chipotle calculator': { verdict: 'HOLD', why: 'Same brand-nutrition dataset gap.' },
  'calorie calculator chipotle': { verdict: 'HOLD', why: 'Same brand-nutrition dataset gap.' },
  'chipotle calculator calories': { verdict: 'HOLD', why: 'Same brand-nutrition dataset gap.' },
  'chipotle calorie calculator': { verdict: 'HOLD', why: 'Same brand-nutrition dataset gap.' },
  'chipotle mexican grill nutrition calculator': { verdict: 'HOLD', why: 'Same brand-nutrition dataset gap.' },
  'chipotle calories calculator': { verdict: 'HOLD', why: 'Same brand-nutrition dataset gap.' },
  'chipotle nutrition calculator': { verdict: 'HOLD', why: 'Same brand-nutrition dataset gap.' },
  'dynasty league trade calculator': { verdict: 'HOLD', why: 'Fantasy-football trade values need a maintained player-value dataset; out of scope for a maths/health site.' },
  'dynasty trade calculator': { verdict: 'HOLD', why: 'Same fantasy-sports dataset gap.' },

  // ---- navigational or utility-shaped queries no content page wins -----------
  'open calculator': { verdict: 'REJECT_NAVIGATIONAL', why: 'The searcher wants an app, not a result; no page can satisfy it better than the homepage.' },
  'show calculator': { verdict: 'REJECT_NAVIGATIONAL', why: 'Navigational/utility query.' },
  'smart calculator': { verdict: 'REJECT_NAVIGATIONAL', why: 'Generic product query, not a calculation intent.' },
  'downloadable calculator': { verdict: 'REJECT_NAVIGATIONAL', why: 'Wants software, not a web tool.' },
  'calculator on this phone': { verdict: 'REJECT_NAVIGATIONAL', why: 'Device utility query.' },
  'google math calculator': { verdict: 'REJECT_NAVIGATIONAL', why: 'Brand navigational query.' },
  'calculator that shows work': { verdict: 'REJECT_NAVIGATIONAL', why: 'Asks for a product feature, not a calculation.' },
  'calculator that prints': { verdict: 'REJECT_NAVIGATIONAL', why: 'Printer utility query.' },
  'pricing generator': { verdict: 'COVER_EXISTING', path: '/business/pricing', why: 'The pricing tool produces the price; "generator" is the same job.' },

  // ---- remaining rows: resolve to the page that already implements the intent --
  'cash back calculator': { verdict: 'COVER_EXISTING', path: '/finance/discount', why: 'Cash back is a percentage of spend, which is the discount calculation.' },
  'compound retirement calculator': { verdict: 'COVER_EXISTING', path: '/finance/retirement' },
  'compounding calculator retirement': { verdict: 'COVER_EXISTING', path: '/finance/retirement' },
  'retirement calculator growth': { verdict: 'COVER_EXISTING', path: '/finance/retirement' },
  'retirement financial calculator': { verdict: 'COVER_EXISTING', path: '/finance/retirement' },
  'financial planning calculator': { verdict: 'COVER_EXISTING', path: '/finance/net-worth-calculator', why: 'Umbrella intent; net worth is the planning entry point.' },
  'roi calculation formula': { verdict: 'COVER_EXISTING', path: '/finance/roi' },
  'work schedule calculator': { verdict: 'COVER_EXISTING', path: '/everyday/work-hours-weekly' },
  'concrete calculator formula': { verdict: 'COVER_EXISTING', path: '/construction/concrete-slab', why: 'The formula is on the slab page; "concrete calculator" is the same intent.' },
  'inflation wage calculator': { verdict: 'COVER_EXISTING', path: '/finance/inflation-adjusted' },
  'compound investments': { verdict: 'COVER_EXISTING', path: '/finance/investment' },
  'monthly investment calculator': { verdict: 'COVER_EXISTING', path: '/finance/investment' },
  'investment account calculator': { verdict: 'COVER_EXISTING', path: '/finance/investment' },
  'time and pay calculator': { verdict: 'COVER_EXISTING', path: '/career/timesheet-hours' },
  'future value of investment calculator': { verdict: 'COVER_EXISTING', path: '/finance/future-value' },
  'compound loan calculator': { verdict: 'COVER_EXISTING', path: '/finance/loan-emi' },
  'savings percentage calculator': { verdict: 'COVER_EXISTING', path: '/finance/savings-rate' },
  'formula discount': { verdict: 'COVER_EXISTING', path: '/finance/discount', why: 'Formula-shaped query for the discount page.' },
  'yearly payment calculator': { verdict: 'COVER_EXISTING', path: '/finance/loan-emi' },
  'compare loan calculator': { verdict: 'COVER_EXISTING', path: '/finance/loan-comparison' },
  'compound return calculator': { verdict: 'COVER_EXISTING', path: '/finance/cagr' },
  'mortgage calculator how much can i qualify for': { verdict: 'COVER_EXISTING', path: '/finance/loan-qualify' },
  'mortgage calculator how much do i qualify for': { verdict: 'COVER_EXISTING', path: '/finance/loan-qualify' },
  'qualify for a mortgage calculator': { verdict: 'COVER_EXISTING', path: '/finance/loan-qualify' },
};

const NAVIGATIONAL = /\b(open|show|download|downloadable|app|phone|online|google|best|free|smart)\b/;

function norm(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokens(s) {
  return norm(s).split(' ').filter((t) => t && !STOPS.has(t));
}

// A query carries a keyword when every keyword token appears in it.
function queryCarries(keyword, query) {
  const k = tokens(keyword);
  if (!k.length) return false;
  const q = new Set(tokens(query));
  return k.every((t) => q.has(t));
}

function gscEvidence(keyword, pairs) {
  let impressions = 0;
  let clicks = 0;
  let bestPosition = null;
  let matches = 0;
  for (const p of pairs) {
    if (!queryCarries(keyword, p.query)) continue;
    matches++;
    impressions += p.impressions;
    clicks += p.clicks;
    if (bestPosition === null || p.position < bestPosition) bestPosition = p.position;
  }
  return { impressions, clicks, bestPosition, matches };
}

function main() {
  const gap = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'keyword-gap.json'), 'utf8'));
  const gscFile = path.join(ROOT, 'data', 'gsc-query-page.json');
  const gsc = fs.existsSync(gscFile) ? JSON.parse(fs.readFileSync(gscFile, 'utf8')) : null;
  const pairs = (gsc && gsc.pairs) || [];

  const rows = [
    ...(gap.gap || []).map((r) => ({ ...r, _src: 'GAP' })),
    ...(gap.weak || []).map((r) => ({ ...r, _src: 'WEAK' })),
  ];
  const seen = new Set();
  const out = [];

  for (const r of rows) {
    const key = norm(r.keyword);
    if (seen.has(key)) continue;
    seen.add(key);

    const decision = DECISIONS[r.keyword] || DECISIONS[key];
    const evidence = gscEvidence(r.keyword, pairs);
    let verdict;
    let page = r.page || '';
    let why = '';

    if (decision) {
      verdict = decision.verdict;
      page = decision.path || page;
      why = decision.why || '';
    } else if (NAVIGATIONAL.test(r.keyword) && !r.page) {
      verdict = 'REJECT_NAVIGATIONAL';
      why = 'Generic or navigational phrasing with no distinct calculation intent.';
    } else if (r.page) {
      verdict = 'COVER_EXISTING';
      page = r.page;
      why = 'The gap audit already matched a page; the on-page fix is title/H1, not a new URL.';
    } else {
      verdict = 'REVIEW';
      why = 'No owner page and no decision yet; do not build until intent and data are confirmed.';
    }

    out.push({
      keyword: r.keyword,
      volume: r.volume,
      difficulty: r.difficulty,
      opportunity: r.opportunity,
      auditVerdict: r._src,
      verdict,
      page,
      why,
      gsc: evidence,
    });
  }

  const byVerdict = {};
  for (const r of out) byVerdict[r.verdict] = (byVerdict[r.verdict] || 0) + 1;
  const approved = out.filter((r) => r.verdict === 'NEW_PAGE');
  const cover = out.filter((r) => r.verdict === 'COVER_EXISTING');
  const held = out.filter((r) => ['HOLD', 'REVIEW', 'DUPLICATE'].includes(r.verdict));
  const rejected = out.filter((r) => r.verdict === 'REJECT_NAVIGATIONAL');

  // Sort for stable, useful tables.
  const byOpp = (a, b) => b.opportunity - a.opportunity;
  approved.sort(byOpp); cover.sort(byOpp); held.sort(byOpp); rejected.sort(byOpp);

  const report = {
    generatedAt: new Date().toISOString(),
    gscWindow: gsc ? { start: gsc.startDate, end: gsc.endDate, ranAt: gsc.ranAt } : null,
    counts: { rows: out.length, ...byVerdict },
    approved,
    cover,
    held,
    rejected,
    rows: out,
  };
  fs.writeFileSync(path.join(ROOT, 'data', 'keyword-gap-recheck.json'), JSON.stringify(report, null, 2) + '\n');

  const ev = (r) => (r.gsc.impressions ? r.gsc.impressions + ' impr · best pos ' + r.gsc.bestPosition.toFixed(1) : 'no impressions yet');
  const rowsToMd = (list) => list.map((r) =>
    '| `' + r.keyword + '` | ' + r.volume.toLocaleString('en-US') + ' | ' + r.difficulty + ' | ' + r.opportunity.toLocaleString('en-US') + ' | ' + ev(r) + ' |'
  ).join('\n');

  const md = [
    '# Keyword-gap re-check — fresh GSC data and search intent',
    '',
    '_Generated by `scripts/recheck-keyword-gaps.cjs` from `data/keyword-gap.json` and the 28-day GSC join (`data/gsc-query-page.json`' +
      (gsc ? ', window ' + gsc.startDate + ' → ' + gsc.endDate : '') + ')._',
    '',
    '## Method',
    '',
    'The gap audit classifies a keyword by string-matching page slugs and titles. That finds real',
    'holes, but it also calls a synonym a gap: `cd bank calculator` is the same intent as',
    '`/finance/cd-calculator`, `ft2 calculator` is the area converter, and `show calculator` is',
    'not a calculation at all. Every actionable row (GAP + WEAK) is therefore re-checked twice:',
    '',
    '1. **Fresh demand** — does the 28-day GSC export already show impressions for a query that',
    '   carries this keyword? That proves the intent exists and tells us whether a page is already',
    '   being surfaced for it.',
    '2. **Intent ownership** — is this intent already implemented by a page, is it a duplicate of',
    '   another gap row, does it need data we do not hold, or is it navigational?',
    '',
    'A new URL is approved **only** when the intent is genuinely different from every existing',
    'page. Synonym and misspelling rows are assigned to the existing page instead; brand-nutrition',
    'and clinical rows are held until their data exists.',
    '',
    '## Result',
    '',
    '| verdict | rows | meaning |',
    '|---|---|---|',
    '| NEW_PAGE | ' + approved.length + ' | genuinely new intent — approved to build |',
    '| COVER_EXISTING | ' + cover.length + ' | an existing page owns it; fix title/H1 or a section |',
    '| HOLD / REVIEW / DUPLICATE | ' + held.length + ' | blocked on data, safety review, or a duplicate row |',
    '| REJECT_NAVIGATIONAL | ' + rejected.length + ' | no content page can win this query |',
    '| **total** | **' + out.length + '** | |',
    '',
    '## Approved new pages',
    '',
    approved.length
      ? '| keyword | volume | difficulty | opportunity | fresh demand | page | why |\n|---|---|---|---|---|---|---|\n' +
        approved.map((r) => '| `' + r.keyword + '` | ' + r.volume.toLocaleString('en-US') + ' | ' + r.difficulty + ' | ' + r.opportunity.toLocaleString('en-US') + ' | ' + ev(r) + ' | `' + r.page + '` | ' + r.why + ' |').join('\n')
      : '_None. Every actionable row is covered, held, or rejected._',
    '',
    '## Cover on an existing page (no new URL)',
    '',
    cover.length
      ? '| keyword | volume | opportunity | fresh demand | owner page |\n|---|---|---|---|---|\n' +
        cover.map((r) => '| `' + r.keyword + '` | ' + r.volume.toLocaleString('en-US') + ' | ' + r.opportunity.toLocaleString('en-US') + ' | ' + ev(r) + ' | `' + (r.page.endsWith('/') ? r.page : r.page + '/') + '` |').join('\n')
      : '_None._',
    '',
    '## Held — no honest build today',
    '',
    held.length
      ? '| keyword | volume | opportunity | fresh demand | why |\n|---|---|---|---|---|\n' +
        held.map((r) => '| `' + r.keyword + '` | ' + r.volume.toLocaleString('en-US') + ' | ' + r.opportunity.toLocaleString('en-US') + ' | ' + ev(r) + ' | ' + r.why + ' |').join('\n')
      : '_None._',
    '',
    '## Rejected as navigational',
    '',
    rejected.length ? rowsToMd(rejected) : '_None._',
    '',
    '## What this changes about the old "108 gaps" number',
    '',
    'The old report counted every string mismatch as a gap. Re-checked against intent and fresh',
    'demand, the buildable set is ' + approved.length + ' page(s); ' + cover.length + ' rows are the same',
    'intent as a page that already exists, ' + held.length + ' are blocked on data or duplicate, and',
    rejected.length + ' are queries no page can win. That is why the answer to "build 108 pages" is',
    'no: the pages mostly exist, and the missing ones would be duplicates.',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(ROOT, 'docs', 'KEYWORD-GAP-RECHECK.md'), md);
  console.log('keyword-gap re-check: ' + out.length + ' rows · ' + JSON.stringify(byVerdict));
  console.log('approved: ' + approved.map((r) => r.keyword).join(', ') || 'none');
  console.log('report: docs/KEYWORD-GAP-RECHECK.md · data/keyword-gap-recheck.json');
}

module.exports = { norm, tokens, queryCarries, gscEvidence, DECISIONS };

if (require.main === module) main();
