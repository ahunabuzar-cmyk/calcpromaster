#!/usr/bin/env node
/* Which pages FELL OUT of the index — 17 Oct vs 28 Oct, per URL.
 *
 * Why this exists: the site went from 952 indexed (GSC coverage, 2026-10-04) to
 * 557 indexed (URL Inspection, 2026-10-28). Aggregate counts say "it dropped";
 * they do not say WHICH pages, and without that list nothing can be fixed or
 * requested for re-indexing.
 *
 * There is no GSC API for historical per-URL index state, so this compares the
 * two measurements we actually stored:
 *
 *   data/gsc-coverage-report.json   2026-10-17  per-URL state for 1,415 URLs
 *   data/gsc-inspect-all-progress.json 2026-10-28  per-URL state for 1,326 URLs
 *
 * It then re-probes each de-indexed URL live, because a GSC state is a snapshot
 * of an old crawl — a page can read "unknown to Google" and still be perfectly
 * indexable right now.
 *
 * Outputs:
 *   data/deindexed-2026-10-28.json   summary + one row per URL
 *   data/deindexed-2026-10-28.csv    per-URL detail
 *   data/reindex-queue-2026-10-28.txt  paste-ready Request Indexing order
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const BEFORE = path.join(ROOT, 'data', 'gsc-coverage-report.json');
const AFTER = path.join(ROOT, 'data', 'gsc-inspect-all-progress.json');
const FULL = path.join(ROOT, 'data', 'nonindexed-full.json');
const OUT_JSON = path.join(ROOT, 'data', 'deindexed-2026-10-28.json');
const OUT_CSV = path.join(ROOT, 'data', 'deindexed-2026-10-28.csv');
const OUT_QUEUE = path.join(ROOT, 'data', 'reindex-queue-2026-10-28.txt');

const INDEXED = 'Submitted and indexed';

// GSC returns /finance/loan-emi/ in one export and /finance/loan-emi in another,
// and /about.html vs /about. Compare the URL the browser would actually visit.
function key(u) {
  let s = String(u || '').trim();
  s = s.replace(/^https?:\/\/[^/]+/i, '');
  s = s.split('?')[0].split('#')[0];
  s = s.replace(/\.html$/i, '');
  if (!s.startsWith('/')) s = '/' + s;
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s;
}

function get(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; calcpromaster-audit/1.0)' }, timeout: 25000 }, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { if (buf.length < 400000) buf += c; });
      res.on('end', () => resolve({ status: res.statusCode, location: res.headers.location || null, headers: res.headers, body: buf }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
  });
}

function liveCheck(url, res) {
  const out = { liveStatus: res.status, liveKind: null, liveWords: 0, liveCanonical: null, liveRobots: null };
  if (res.status !== 200) {
    out.liveKind = res.status >= 300 && res.status < 400 ? 'redirect' : (res.status === 0 ? 'no-response' : 'http-' + res.status);
    out.liveRedirect = res.location || null;
    return out;
  }
  const body = res.body;
  const head = body.slice(0, body.indexOf('</head>') + 7);
  const robotsTag = (head.match(/<meta[^>]+name=["']robots["'][^>]*>/i) || [''])[0];
  const canonTag = (head.match(/<link[^>]+rel=["']canonical["'][^>]*>/i) || [''])[0];
  const canonical = (canonTag.match(/href=["']([^"']+)/i) || [, ''])[1];
  const text = body.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  const xRobots = String(res.headers['x-robots-tag'] || '');

  out.liveWords = words;
  out.liveCanonical = canonical || null;
  out.liveRobots = robotsTag ? (robotsTag.match(/content=["']([^"']+)/i) || [, ''])[1] : null;
  out.liveXRobots = xRobots || null;

  const noindex = /noindex/i.test(robotsTag) || /noindex/i.test(xRobots);
  const canonOff = !canonical || key(canonical) !== key(url);

  if (noindex) out.liveKind = 'noindex';
  else if (canonOff) out.liveKind = 'canonical-differs';
  else if (words < 200) out.liveKind = 'thin';
  else out.liveKind = 'ok-indexable';
  return out;
}

function csvCell(v) {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function actionFor(row) {
  if (row.after === null) {
    return ['RE-MEASURE (not in today\'s 1,326)', 'Today\'s inspection covered 1,326 of 1,420 sitemap URLs; this URL is one of the 94 the daily quota did not reach, so its current state is unknown, not lost.'];
  }
  if (row.liveKind !== 'ok-indexable') {
    return ['REAL DEFECT — fix before requesting', 'Live fetch on 2026-10-28 did not answer 200 + index,follow + self-canonical, so the de-index has a current technical cause.'];
  }
  if (row.after === 'Crawled - currently not indexed') {
    return ['CONTENT VALUE — rewrite, then request', 'Google crawled it recently and declined to index. Live HTML is clean, so the blocker is page value/duplication, not crawlability.'];
  }
  if (row.after === 'Discovered - currently not indexed') {
    return ['CRAWL PRIORITY — request indexing', 'Google knows the URL but has not crawled it since it fell out. Live HTML is clean.'];
  }
  if (row.after === 'URL is unknown to Google') {
    return ['REQUEST INDEXING — highest priority', 'Google dropped the URL entirely while the page still answers 200 with a self-canonical. This is the exact set Request Indexing targets.'];
  }
  return ['REQUEST INDEXING', 'Live HTML is clean; the recorded state is from an older crawl.'];
}

async function main() {
  const before = JSON.parse(fs.readFileSync(BEFORE, 'utf8'));
  const after = JSON.parse(fs.readFileSync(AFTER, 'utf8'));
  const full = fs.existsSync(FULL) ? JSON.parse(fs.readFileSync(FULL, 'utf8')) : { rows: [] };

  const beforeIndexed = (before.lists && before.lists.INDEXED) || [];
  const afterByKey = new Map();
  for (const row of Object.values(after)) {
    if (!row || !row.inspectedUrl) continue;
    afterByKey.set(key(row.inspectedUrl), row);
  }
  const fullByKey = new Map();
  for (const row of full.rows || []) fullByKey.set(key(row.url || row.path), row);

  const rows = [];
  for (const b of beforeIndexed) {
    const k = key(b.url);
    const now = afterByKey.get(k) || null;
    const meta = fullByKey.get(k) || null;
    rows.push({
      key: k,
      url: 'https://calcpromaster.com' + k + (k === '/' ? '' : '/'),
      before: b.coverage || INDEXED,
      after: now ? (now.coverageState || null) : null,
      afterVerdict: now ? now.verdict : null,
      category: meta ? meta.category : (k.split('/')[1] || '(root)'),
      lastKnownImpressions: meta ? (meta.lastKnownImpressions || 0) : 0,
      liveKind: null,
      liveStatus: null,
    });
  }

  const fell = rows.filter((r) => r.after !== null && r.after !== INDEXED);
  const still = rows.filter((r) => r.after === INDEXED);
  const unmeasured = rows.filter((r) => r.after === null);

  // Newly indexed since 17 Oct — context for whether anything at all moved up.
  const beforeKeys = new Set(beforeIndexed.map((b) => key(b.url)));
  const gained = [];
  for (const row of Object.values(after)) {
    if (!row || row.coverageState !== INDEXED) continue;
    const k = key(row.inspectedUrl);
    if (!beforeKeys.has(k)) gained.push('https://calcpromaster.com' + k);
  }

  console.log('17 Oct indexed (stored): ' + beforeIndexed.length);
  console.log('28 Oct inspected:        ' + afterByKey.size);
  console.log('  still indexed:         ' + still.length);
  console.log('  fell out of index:     ' + fell.length);
  console.log('  not re-measured:       ' + unmeasured.length);
  console.log('newly indexed since 17 Oct: ' + gained.length);

  console.log('\n=== where they went ===');
  const byState = {};
  for (const r of fell) byState[r.after] = (byState[r.after] || 0) + 1;
  Object.entries(byState).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(String(v).padStart(5), k));

  // Live re-probe of every URL that fell out.
  console.log('\nre-probing ' + fell.length + ' de-indexed URLs live ...');
  let i = 0;
  async function worker() {
    while (true) {
      const my = i++;
      if (my >= fell.length) return;
      const r = fell[my];
      const res = await get(r.url);
      Object.assign(r, liveCheck(r.url, res));
      if ((my + 1) % 100 === 0) console.log('  ' + (my + 1) + '/' + fell.length);
    }
  }
  await Promise.all(Array.from({ length: 12 }, worker));

  const liveTally = {};
  for (const r of fell) liveTally[r.liveKind] = (liveTally[r.liveKind] || 0) + 1;
  console.log('\n=== live verdict on the de-indexed set ===');
  console.log(liveTally);

  for (const r of fell) {
    const [action, why] = actionFor(r);
    r.action = action;
    r.why = why;
  }

  // Order: pages that used to earn impressions first, then Google-dropped entirely.
  const priority = { 'URL is unknown to Google': 0, 'Discovered - currently not indexed': 1, 'Crawled - currently not indexed': 2 };
  fell.sort((a, b) => (b.lastKnownImpressions || 0) - (a.lastKnownImpressions || 0) ||
    (priority[a.after] ?? 9) - (priority[b.after] ?? 9) || a.key.localeCompare(b.key));

  fs.writeFileSync(OUT_JSON, JSON.stringify({
    ranAt: new Date().toISOString(),
    before: { file: path.basename(BEFORE), indexed: beforeIndexed.length, ranAt: before.ranAt },
    after: { file: path.basename(AFTER), inspected: afterByKey.size, ranAt: full.ranAt },
    counts: {
      stillIndexed: still.length,
      fellOut: fell.length,
      notRemeasured: unmeasured.length,
      newlyIndexed: gained.length,
    },
    byState,
    liveTally,
    unmeasured: unmeasured.map((r) => r.url),
    gained,
    rows: fell,
  }, null, 1));

  const header = ['url', 'category', 'was_17oct', 'now_28oct', 'live_status', 'live_kind', 'live_words', 'impressions_last_120d', 'action', 'why'];
  const csv = [header.join(',')];
  for (const r of fell) {
    csv.push([r.url, r.category, r.before, r.after, r.liveStatus, r.liveKind, r.liveWords, r.lastKnownImpressions, r.action, r.why].map(csvCell).join(','));
  }
  fs.writeFileSync(OUT_CSV, csv.join('\n') + '\n');

  fs.writeFileSync(OUT_QUEUE, fell.filter((r) => r.liveKind === 'ok-indexable').map((r) => r.url).join('\n') + '\n');

  console.log('\nwrote ' + path.relative(ROOT, OUT_JSON));
  console.log('wrote ' + path.relative(ROOT, OUT_CSV));
  console.log('wrote ' + path.relative(ROOT, OUT_QUEUE) + ' (' + fell.filter((r) => r.liveKind === 'ok-indexable').length + ' URLs)');
}

main().catch((e) => { console.error('FAIL: ' + e.stack); process.exit(1); });
