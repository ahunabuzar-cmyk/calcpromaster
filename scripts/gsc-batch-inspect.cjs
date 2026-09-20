#!/usr/bin/env node
// ============================================================
// CalcProMaster — GSC Batch Inspection + Sitemap Resubmit
// ------------------------------------------------------------
// Week-1 indexing kick (no deploy needed — talks to Google only):
//   1. Resubmit sitemap.xml (PUT /webmasters/v3/sites/:site/sitemaps/:feed)
//   2. URL Inspection (read-only) for a priority batch (~100 URLs):
//      homepage, /about, every /hub/* category hub, then a deterministic
//      round-robin spread of tool pages across all categories.
//   3. Writes data/gsc-inspect-batch.json + prints a verdict summary.
//
// Quota: URL Inspection API = 2000/day, 600/min → 100 URLs with 250ms gap is safe.
// Usage: node scripts/gsc-batch-inspect.cjs [--limit 100]
// ============================================================
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');
const { getAccessToken } = require('./lib/google-oauth.cjs');

const API = 'searchconsole.googleapis.com';
const SITE_URL = 'https://calcpromaster.netlify.app';
const SITEMAP_URL = SITE_URL + '/sitemap.xml';
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : 100;
  return Number.isFinite(v) && v > 0 ? Math.min(v, 200) : 100;
})();

function req(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: API, path: urlPath, method,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: data ? JSON.parse(data) : null }); }
        catch (e) { resolve({ status: res.statusCode, json: null, raw: data.slice(0, 400) }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

const wait = ms => new Promise(r => setTimeout(r, ms));

// Fetch the LIVE sitemap and pick priority URLs deterministically.
function fetchLiveSitemap() {
  return new Promise((resolve, reject) => {
    https.get(SITEMAP_URL, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        const locs = [...data.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(m => m[1]);
        resolve(locs);
      });
    }).on('error', reject);
  });
}

function pickPriority(locs, limit) {
  const always = locs.filter(u => u === SITE_URL + '/' || /\/(about|contact|privacy)\.?$/.test(u));
  const hubs = locs.filter(u => /\/hub\/[^/]+\/?$/.test(u));
  const tools = locs.filter(u => !always.includes(u) && !hubs.includes(u));
  // Round-robin by category so every category gets covered, not just finance/a-*
  const byCat = new Map();
  for (const u of tools) {
    const cat = u.replace(SITE_URL + '/', '').split('/')[0];
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(u);
  }
  const cats = [...byCat.keys()].sort();
  const picked = [];
  let i = 0;
  while (picked.length < limit && cats.length) {
    const cat = cats[i % cats.length];
    const arr = byCat.get(cat);
    if (arr.length) picked.push(arr.shift());
    else cats.splice(i % cats.length, 1);
    i++;
    if (i > limit * cats.length * 4) break; // safety
  }
  return [...new Set([...always, ...hubs, ...picked])].slice(0, limit);
}

(async () => {
  console.log('🔍 GSC Batch Inspection — ' + SITE_URL + ' (limit ' + LIMIT + ')\n');
  const token = (await getAccessToken('https://www.googleapis.com/auth/webmasters.readonly')).access_token;

  // [1/2] Sitemap resubmit (write action — the only recrawl signal available via API)
  // Property is registered WITH a trailing slash — path forms must match it exactly.
  const feedPath = '/webmasters/v3/sites/' + encodeURIComponent(SITE_URL + '/') + '/sitemaps/' + encodeURIComponent(SITEMAP_URL);
  const sm = await req('PUT', feedPath, null, token);
  console.log('[1/2] Sitemap resubmit:', sm.status === 200 ? 'OK (Google will re-fetch)' : 'HTTP ' + sm.status + (sm.raw ? ' — ' + sm.raw : ''));

  // [2/2] URL Inspection batch
  const locs = await fetchLiveSitemap();
  if (!locs.length) { console.error('live sitemap returned 0 URLs'); process.exit(1); }
  const urls = pickPriority(locs, LIMIT);
  console.log('[2/2] Inspecting ' + urls.length + ' URLs (live sitemap has ' + locs.length + ')...\n');

  const results = [];
  const tally = {};
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    // URL Inspection API lives on the /v1 root (not /webmasters/v3) and the
    // registered property form (with trailing slash) must be passed exactly.
    const r = await req('POST', '/v1/urlInspection/index:inspect',
      { inspectionUrl: u, siteUrl: SITE_URL + '/', languageCode: 'en' }, token);
    let verdict = 'API_ERROR', coverage = '—';
    if (r.status === 200 && r.json && r.json.inspectionResult) {
      const idx = r.json.inspectionResult.indexStatusResult || {};
      coverage = idx.coverageState || 'UNKNOWN';
      verdict = idx.verdict || 'NEUTRAL';
    } else if (r.status === 429) {
      console.error('quota hit at ' + i + ' — stopping early');
      break;
    } else {
      verdict = 'HTTP_' + r.status;
    }
    tally[coverage] = (tally[coverage] || 0) + 1;
    results.push({ url: u, verdict, coverage });
    const short = u.replace(SITE_URL, '') || '/';
    if (verdict !== 'PASS') console.log('  ⚠ ' + short + ' → ' + coverage);
    await wait(250);
  }

  console.log('\n=== Coverage tally (live URLs) ===');
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log('  ' + v + '\t' + k);

  const out = path.join(__dirname, '..', 'data', 'gsc-inspect-batch.json');
  const save = () => {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify({ ranAt: new Date().toISOString(), site: SITE_URL, sitemapResubmit: sm.status, count: results.length, results }, null, 2));
  };
  if (results.length % 20 === 0) save(); // survive interruptions
  save();
  console.log('💾 ' + out);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
