#!/usr/bin/env node
/* TEMP DIAGNOSTIC — full URL-Inspection fields for a targeted sample.
 * The bulk inspector (scripts/gsc-inspect-all.cjs) only stores the summary
 * (coverage/verdict), which is enough for the queue but NOT enough to see
 * Google's chosen canonical vs ours, the fetch state, or the last crawl time —
 * the three facts that separate "demoted" from "deindexed" from "consolidated".
 *
 * Usage: node scripts/dev-gsc-deep-inspect.cjs [url,...]
 * Output: data/gsc-deep-inspect-<date>.json + a console table
 */
'use strict';
const fs = require('fs');
const https = require('https');
const path = require('path');
const { getAccessToken } = require('./lib/google-oauth.cjs');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://calcpromaster.com/';

function post(body, token) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'searchconsole.googleapis.com',
      path: '/v1/urlInspection/index:inspect',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), Authorization: 'Bearer ' + token },
      timeout: 30000,
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => resolve({ status: res.statusCode, json: (() => { try { return JSON.parse(buf); } catch { return null; } })() }));
    });
    req.on('error', () => resolve({ status: 0 }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0 }); });
    req.write(data); req.end();
  });
}

(async () => {
  const argvUrls = process.argv.slice(2).filter((a) => a.startsWith('http'));
  let urls = argvUrls;
  if (!urls.length) {
    const f = path.join(ROOT, 'data', 'dev-deep-sample.txt');
    urls = fs.readFileSync(f, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }
  const { access_token } = await getAccessToken('https://www.googleapis.com/auth/webmasters.readonly');
  const out = [];
  for (const url of urls) {
    const r = await post({ siteUrl: SITE, inspectionUrl: url, languageCode: 'en-US' }, access_token);
    const is = r.json && r.json.inspectionResult && r.json.inspectionResult.indexStatusResult;
    if (!is) { console.log('HTTP_' + r.status, url); out.push({ url, httpStatus: r.status }); continue; }
    const row = {
      url,
      verdict: is.verdict,
      coverageState: is.coverageState,
      indexingState: is.indexingState,
      robotsTxtState: is.robotsTxtState,
      pageFetchState: is.pageFetchState,
      crawledAs: is.crawledAs,
      lastCrawlTime: is.lastCrawlTime,
      googleCanonical: is.googleCanonical,
      userCanonical: is.userCanonical,
      referringUrls: is.referringUrls,
    };
    out.push(row);
    const canonMismatch = row.googleCanonical && row.userCanonical && row.googleCanonical !== row.userCanonical;
    console.log(
      [
        (row.coverageState || '?').padEnd(38),
        'fetch=' + (row.pageFetchState || '?').padEnd(11),
        'crawl=' + (row.lastCrawlTime || 'never').slice(0, 10),
        canonMismatch ? 'CANON≠ ' + row.googleCanonical : 'canon=ok',
        url,
      ].join(' ')
    );
  }
  const outPath = path.join(ROOT, 'data', 'gsc-deep-inspect-' + new Date().toISOString().slice(0, 10) + '.json');
  fs.writeFileSync(outPath, JSON.stringify({ ranAt: new Date().toISOString(), results: out }, null, 1));
  console.log('\nwrote ' + outPath + ' (' + out.length + ' URLs)');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
