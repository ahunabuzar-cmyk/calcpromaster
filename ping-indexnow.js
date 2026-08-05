#!/usr/bin/env node
// ====== CalcProMaster IndexNow Pinger (Bing / Yandex / Seznam / Naver) ======
// Reads sitemap.xml and instantly submits all URLs to IndexNow so Bing indexes
// new pages within minutes (vs days of natural crawling). Zero dependencies —
// uses Node's global fetch (Node 18+).
//
// How IndexNow works:
//   1. A verification key file is served from the site root: /<key>.txt
//      (this repo ships 0e1100ec6bc9d4c2c6037d993fc2ba55.txt — do not rename).
//   2. We POST the host + key + keyLocation + urlList to api.indexnow.org,
//      which fans out to Bing, Yandex, Seznam and Naver.
//
// Usage:
//   node ping-indexnow.js                  # submit ALL sitemap URLs (batches of 10k)
//   node ping-indexnow.js --limit 100      # submit first 100 URLs only
//   node ping-indexnow.js --dry-run        # print what would be sent, no network
//   node ping-indexnow.js --url https://calcpromaster.netlify.app/finance/loan-emi/5-years-50000   # single quick ping
//
// NOTE: api.indexnow.org is rate-limited to ~1 request/second — batches are
// spaced 1s apart automatically. 780 URLs = 1 request (under the 10k batch cap).
const fs = require('fs');
const path = require('path');

const DOMAIN = 'calcpromaster.netlify.app'; // keep in sync with js/site-config.js
// KEY is NOT hardcoded — it is discovered from the shipped <hex>.txt verification file
// at the site root, so regenerating the key only requires replacing that one file.
// .sort()[0] keeps selection deterministic (readdir order is OS-dependent)
const KEY_FILE = fs.readdirSync(__dirname).filter(f => /^[0-9a-f]{32}\.txt$/.test(f)).sort()[0];
if (!KEY_FILE) { console.error('IndexNow key file (<hex>.txt) not found in project root.'); process.exit(1); }
const KEY = fs.readFileSync(path.join(__dirname, KEY_FILE), 'utf8').trim(); // .trim() — no trailing newline
const KEY_LOCATION = 'https://' + DOMAIN + '/' + KEY_FILE;
const INDEXNOW_URL = 'https://api.indexnow.org/indexnow';
const SITEMAP = path.join(__dirname, 'sitemap.xml');
const BATCH = 10000; // IndexNow max URLs per request

function readSitemapUrls() {
  const xml = fs.readFileSync(SITEMAP, 'utf8');
  const urls = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) urls.push(m[1]);
  return urls;
}

function buildBody(urls) {
  return {
    host: DOMAIN,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls
  };
}

async function submitBatch(batch, dryRun) {
  if (dryRun) {
    console.log('  [dry-run] batch of ' + batch.length + ': ' + batch[0] + ' …');
    return { ok: true, count: batch.length };
  }
  const res = await fetch(INDEXNOW_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(buildBody(batch))
  });
  // IndexNow returns 200 OK on success (body is empty); 202 = accepted.
  const ok = res.status === 200 || res.status === 202;
  if (!ok) {
    const text = await res.text();
    console.log('  ✗ HTTP ' + res.status + ' ' + text.slice(0, 200));
  }
  return { ok: ok, count: batch.length };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const urlArg = process.argv.indexOf('--url');
  const limitArg = process.argv.indexOf('--limit');

  if (urlArg !== -1) {
    const url = process.argv[urlArg + 1];
    if (!url) { console.error('Missing URL after --url'); process.exit(1); }
    console.log((dryRun ? '[dry-run] would ping: ' : 'Pinging: ') + url);
    if (!dryRun) {
      const r = await submitBatch([url], false);
      console.log(r.ok ? '  ✓ submitted' : '  ✗ failed');
    }
    return;
  }

  const urls = readSitemapUrls();
  const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : urls.length;
  const selected = urls.slice(0, limit);

  if (selected.length === 0) { console.log('No URLs to submit.'); return; }

  console.log((dryRun ? '[dry-run] ' : '') + 'Submitting ' + selected.length + ' URLs to IndexNow (host=' + DOMAIN + ')...');
  let ok = 0, fail = 0;
  for (let i = 0; i < selected.length; i += BATCH) {
    const r = await submitBatch(selected.slice(i, i + BATCH), dryRun);
    if (r.ok) ok += r.count; else fail += r.count;
    if (i + BATCH < selected.length) await new Promise(res => setTimeout(res, 1000)); // rate limit
  }
  console.log('\nDone: ' + ok + ' submitted, ' + fail + ' failed.');
  console.log('Verify at https://www.bing.com/webmasters → URL Submission (key file must be reachable).');
}

main().catch(e => { console.error(e); process.exit(1); });
