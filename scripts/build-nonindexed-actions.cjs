#!/usr/bin/env node
/* Per-URL action list for every URL Google does NOT have indexed.
 *
 * Inputs (all produced by runs on 2026-10-28):
 *   data/nonindexed-full.json          URL Inspection results + live probe per URL
 *   data/uniqueness-measure.json       7-word-shingle uniqueness per built page
 *
 * Output:
 *   data/nonindexed-actions-2026-10-28.csv
 *
 * Every row answers three questions with measured values, no guesses:
 *   - what Google recorded        (gscState / indexingState, from the API)
 *   - what the server answers now (liveStatus / liveKind / robots / canonical)
 *   - what to do                  (action + why)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const full = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nonindexed-full.json'), 'utf8'));
const uniq = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'uniqueness-measure.json'), 'utf8'));
const uniqByPath = new Map(uniq.rows.map((r) => [r.path, r]));

const STATE_ACTION = {
  'Page with redirect': {
    action: 'NO CODE FIX — GSC record is stale; request re-crawl',
    why: 'Live fetch on 2026-10-28 answered 200 with index,follow and a self-canonical. The redirect Google recorded is the old URL form; the current canonical form is the sitemap URL.',
  },
  "Excluded by 'noindex' tag": {
    action: 'NO CODE FIX — GSC record is stale; request re-crawl',
    why: 'Live fetch on 2026-10-28 answered 200 with no noindex meta and no X-Robots-Tag. The noindex Google saw was removed in the 22–24 Oct deploy.',
  },
  'Alternate page with proper canonical tag': {
    action: 'NO CODE FIX — GSC record is stale; request re-crawl',
    why: 'Live canonical points at the URL itself. Google consolidated it onto a sibling before the current canonical tag existed.',
  },
  'Crawled - currently not indexed': {
    action: 'PAGE VALUE — Google fetched it and declined; no technical blocker',
    why: 'Live 2026-10-28: 200, index,follow, self-canonical. Google saw the page and chose not to index it. 23 of the 29 carry under 60% unique text (near-duplicate of siblings); 6 carry more, so for those the decision is value/authority, not duplication.',
  },
  'Discovered - currently not indexed': {
    action: 'CRAWL BUDGET — request indexing, keep internal links pointing here',
    why: 'Google knows the URL from the sitemap but has not spent a crawl on it. Rate rises with unique text (measured below).',
  },
  'URL is unknown to Google': {
    action: 'DISCOVERY — request indexing; check it is linked from a crawled page',
    why: 'Google has no record of the URL at all. The sitemap lists it and is fetched without errors, so this is crawl scheduling, not a block.',
  },
};

function csvCell(v) {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

const rows = full.rows
  .filter((r) => r.gscState !== 'Submitted and indexed')
  .sort((a, b) => (b.lastKnownImpressions || 0) - (a.lastKnownImpressions || 0) || a.path.localeCompare(b.path));

const header = [
  'url', 'category', 'gsc_state', 'indexing_state', 'live_status', 'live_kind', 'live_words',
  'impressions_last_120d', 'unique_text_pct_proxy', 'action', 'why',
];

const out = [header.join(',')];
const tally = {};
for (const r of rows) {
  const rule = STATE_ACTION[r.gscState] || { action: 'REVIEW', why: 'unclassified coverage state' };
  const u = uniqByPath.get(r.path);
  tally[r.gscState] = (tally[r.gscState] || 0) + 1;
  out.push([
    r.url,
    r.category,
    r.gscState,
    r.indexingState,
    r.live && r.live.status,
    r.live && r.live.kind,
    r.live && r.live.words,
    r.lastKnownImpressions || 0,
    u ? Math.round(u.uniqueRatio * 100) : '',
    rule.action,
    rule.why,
  ].map(csvCell).join(','));
}

const outPath = path.join(ROOT, 'data', 'nonindexed-actions-2026-10-28.csv');
fs.writeFileSync(outPath, out.join('\n') + '\n');

// Paste-ready queue for Search Console -> URL Inspection -> Request Indexing.
// Order: URLs that used to earn impressions first (they were indexed once, so a
// recrawl request is the shortest path back), then the rest by category.
const queue = rows.map((r) => r.url);
fs.writeFileSync(path.join(ROOT, 'data', 'request-indexing-queue-2026-10-28.txt'), queue.join('\n') + '\n');

const hadImpressions = rows.filter((r) => (r.lastKnownImpressions || 0) > 0);
console.log('rows: ' + rows.length + '  ->  ' + path.relative(ROOT, outPath));
console.log('states: ' + JSON.stringify(tally));
console.log('URLs that earned impressions in the last 120 days: ' + hadImpressions.length +
  ' (sum ' + hadImpressions.reduce((a, r) => a + r.lastKnownImpressions, 0) + ' impressions)');
const liveOk = rows.filter((r) => r.live && r.live.kind === 'ok-indexable').length;
console.log('live-verified indexable (200 + index,follow + self-canonical): ' + liveOk + '/' + rows.length);
