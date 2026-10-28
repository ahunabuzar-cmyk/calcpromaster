#!/usr/bin/env node
/* One-off: what does Google actually know right now?
 *
 * Prints, from the API (not from memory):
 *   1. sitemaps list — lastSubmitted / lastDownloaded / isPending / errors / warnings
 *   2. full raw URL Inspection for a sample (incl. lastCrawlTime, pageFetchState,
 *      googleCanonical, robotsTxtState, indexingState)
 *
 * Usage: node scripts/dev-gsc-truth-check.cjs [--sample 12]
 */
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');
const { getAccessToken } = require('./lib/google-oauth.cjs');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://calcpromaster.com/';
const SITE_ENC = encodeURIComponent(SITE);

function req(method, urlPath, body, token) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: 'searchconsole.googleapis.com', path: urlPath, method,
      headers: Object.assign({ Authorization: 'Bearer ' + token },
        payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      timeout: 30000,
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => { try { resolve({ status: res.statusCode, json: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, raw: data.slice(0, 300) }); } });
    });
    r.on('error', (e) => resolve({ status: 0, raw: e.message }));
    r.on('timeout', () => { r.destroy(); resolve({ status: 0, raw: 'timeout' }); });
    if (payload) r.write(payload);
    r.end();
  });
}

(async () => {
  const token = (await getAccessToken('https://www.googleapis.com/auth/webmasters')).access_token;

  // 1) sitemaps
  const sm = await req('GET', `/webmasters/v3/sites/${SITE_ENC}/sitemaps`, null, token);
  console.log('=== SITEMAPS (' + sm.status + ') ===');
  const list = (sm.json && sm.json.sitemap) || [];
  if (!list.length) console.log(JSON.stringify(sm.json || sm.raw, null, 1));
  for (const s of list) {
    console.log('- ' + s.path);
    console.log('    lastSubmitted: ' + (s.lastSubmitted || 'never'));
    console.log('    lastDownloaded: ' + (s.lastDownloaded || 'NEVER DOWNLOADED'));
    console.log('    isPending: ' + s.isPending + '  isSitemapsIndex: ' + s.isSitemapsIndex);
    console.log('    contents: ' + JSON.stringify(s.contents || []));
    console.log('    errors: ' + (s.errors || 0) + '  warnings: ' + (s.warnings || 0));
    if (s.lastDownloaded) {
      const days = Math.round((Date.now() - Date.parse(s.lastDownloaded)) / 86400000);
      console.log('    age: ' + days + ' days');
    }
  }

  // 2) raw inspection sample
  const full = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nonindexed-full.json'), 'utf8'));
  const byState = {};
  for (const r of full.rows) {
    if (r.gscState === 'Submitted and indexed') continue;
    (byState[r.gscState] = byState[r.gscState] || []).push(r.path);
  }
  const sample = [];
  for (const st of Object.keys(byState)) sample.push(...byState[st].slice(0, 3));

  console.log('\n=== RAW INSPECTION SAMPLE (' + sample.length + ') ===');
  const rows = [];
  for (const p of sample) {
    const url = 'https://calcpromaster.com' + p;
    const r = await req('POST', '/v1/urlInspection/index:inspect', { inspectionUrl: url, siteUrl: SITE, languageCode: 'en' }, token);
    const idx = (r.json && r.json.inspectionResult && r.json.inspectionResult.indexStatusResult) || {};
    rows.push({
      path: p,
      coverageState: idx.coverageState,
      verdict: idx.verdict,
      lastCrawlTime: idx.lastCrawlTime || null,
      pageFetchState: idx.pageFetchState || null,
      indexingState: idx.indexingState || null,
      robotsTxtState: idx.robotsTxtState || null,
      googleCanonical: idx.googleCanonical || null,
      userCanonical: idx.userCanonical || null,
      crawledAs: idx.crawledAs || null,
    });
    await new Promise((res) => setTimeout(res, 200));
  }
  for (const r of rows) {
    const age = r.lastCrawlTime ? Math.round((Date.now() - Date.parse(r.lastCrawlTime)) / 86400000) + 'd ago' : 'NEVER CRAWLED';
    console.log(`${r.path}\n   state=${r.coverageState} | crawl=${age} (${r.lastCrawlTime || '—'}) | fetch=${r.pageFetchState} | index=${r.indexingState} | robots=${r.robotsTxtState}`);
    console.log(`   canonical user=${r.userCanonical} google=${r.googleCanonical} | crawledAs=${r.crawledAs}`);
  }

  const out = path.join(ROOT, 'data', 'gsc-truth-check.json');
  fs.writeFileSync(out, JSON.stringify({ ranAt: new Date().toISOString(), sitemaps: list, sample: rows }, null, 1));
  console.log('\nwrote ' + path.relative(ROOT, out));
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
