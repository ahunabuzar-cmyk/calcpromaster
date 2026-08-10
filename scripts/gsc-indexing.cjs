// ============================================================
// CalcProMaster — GSC Indexing & Performance Tracker
// ------------------------------------------------------------
// Uses the official Google Search Console API (webmasters v3) to
// report, for the live property:
//
//   1. Indexing status of key URLs (URL Inspection → index status):
//        INDEXED / NOT_INDEXED / DISCOVERED / CRAWLED
//   2. Search performance (last N days, default 7):
//        clicks · impressions · CTR · avg position
//   3. Top queries (so you know what people search for)
//
// Requirements (one time):
//   1. GSC property must be verified (Search Console) for the site.
//   2. Google service-account credentials → docs/api-credentials-setup.md
//      Add the service-account email in GSC: Settings → Users and
//      permissions → User (needs at least read access).
//   3. Site URL — auto-detected from js/site-config.js, or override
//      with env GSC_SITE_URL (URL-prefix form: https://calcpromaster.netlify.app)
//
// Usage:
//   node scripts/gsc-indexing.cjs                 # last 7 days
//   node scripts/gsc-indexing.cjs --days 30       # last 30 days
//
// Exit code: 0 = success · 1 = API/credentials error · 2 = not configured (skipped)
// ============================================================
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');
const { getAccessToken } = require('./lib/google-oauth.cjs');

const DAYS = (() => {
  const i = process.argv.indexOf('--days');
  const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : 7;
  return Number.isFinite(v) && v > 0 ? v : 7;
})();
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const API = 'searchconsole.googleapis.com';
const V3 = '/v3';

let SITE_URL = (process.env.GSC_SITE_URL || '').replace(/\/+$/, '');
if (!SITE_URL) {
  try {
    const cfg = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-config.js'), 'utf8');
    const m = cfg.match(/domain:\s*'([^']+)'/);
    if (m) SITE_URL = 'https://' + m[1];
  } catch (e) { /* leave empty */ }
}

// Key URLs to inspect (index status)
const KEY_URLS = ['/', '/finance/loan-emi', '/math/percentage', '/health/bmi', '/hub/finance', '/about'];

function api(method, pathName, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: API,
        path: V3 + pathName,
        method,
        headers: Object.assign(
          { Authorization: 'Bearer ' + token },
          payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}
        ),
        timeout: 30000,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            if (res.statusCode !== 200 && res.statusCode !== 201) reject(new Error('GSC API HTTP ' + res.statusCode + ': ' + (j.error ? j.error.message : data.slice(0, 300))));
            else resolve(j);
          } catch (e) { reject(new Error('bad GSC response: ' + data.slice(0, 200))); }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('GSC API timeout')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function pad(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }

async function main() {
  if (!SITE_URL) {
    console.log('⏭  GSC tracker SKIPPED — could not determine site URL.');
    console.log('   Set env GSC_SITE_URL=https://calcpromaster.netlify.app');
    process.exit(2);
  }
  const token = (await getAccessToken(SCOPE)).access_token;

  console.log('🔍 CalcProMaster — GSC Indexing & Performance (last ' + DAYS + ' day' + (DAYS > 1 ? 's' : '') + ')');
  console.log('   Site: ' + SITE_URL + '\n');

  // 1. URL Inspection — index status of key URLs
  console.log('[1/3] URL Inspection — index status');
  const encSite = encodeURIComponent(SITE_URL);
  for (const p of KEY_URLS) {
    try {
      const url = SITE_URL + (p === '/' ? '/' : p);
      const res = await api('POST', '/urlInspection/index:inspect', {
        inspectionUrl: url,
        siteUrl: SITE_URL,
      }, token);
      const insp = (res.inspectionResult || {});
      const status = insp.indexStatusResult ? insp.indexStatusResult.coverageState : 'UNKNOWN';
      const verdict = insp.indexStatusResult ? insp.indexStatusResult.verdict : '?';
      console.log('  ' + pad(p, 24) + pad(status, 18) + 'verdict: ' + verdict);
    } catch (e) {
      console.log('  ' + pad(p, 24) + 'ERROR: ' + e.message.slice(0, 70));
    }
  }

  // 2. Search Analytics — performance (clicks/impressions/CTR/position)
  console.log('\n[2/3] Search Analytics (performance)');
  const saBody = {
    startDate: daysAgo(DAYS - 1),
    endDate: daysAgo(0),
    dimensions: ['date'],
    rowLimit: DAYS + 5,
  };
  let totalClicks = 0, totalImpr = 0, totalCtr = 0, totalPos = 0, dayCount = 0;
  try {
    const res = await api('POST', '/sites/' + encSite + '/searchAnalytics/query', saBody, token);
    for (const row of (res.rows || [])) {
      const clicks = parseInt(row.clicks, 10);
      const impr = parseInt(row.impressions, 10);
      const ctr = parseFloat(row.ctr);
      const pos = parseFloat(row.position);
      totalClicks += clicks; totalImpr += impr; totalCtr += ctr; totalPos += pos; dayCount++;
    }
    const avgPos = dayCount ? (totalPos / dayCount).toFixed(1) : '0';
    const avgCtr = dayCount ? ((totalCtr / dayCount) * 100).toFixed(2) + '%' : '0%';
    console.log('  ' + pad('clicks', 20) + totalClicks.toLocaleString());
    console.log('  ' + pad('impressions', 20) + totalImpr.toLocaleString());
    console.log('  ' + pad('avg CTR', 20) + avgCtr);
    console.log('  ' + pad('avg position', 20) + avgPos);
    if (!dayCount) console.log('  (no search data yet — normal until Google indexes + serves queries)');
  } catch (e) {
    console.log('  ERROR: ' + e.message.slice(0, 90));
  }

  // 3. Top queries
  console.log('\n[3/3] Top queries (by impressions)');
  try {
    const res = await api('POST', '/sites/' + encSite + '/searchAnalytics/query', {
      startDate: daysAgo(DAYS - 1),
      endDate: daysAgo(0),
      dimensions: ['query'],
      rowLimit: 10,
    }, token);
    if (res.rows && res.rows.length) {
      res.rows.forEach((row, i) => {
        console.log('  ' + (i + 1) + '. ' + pad(row.keys[0], 28) + pad(row.impressions + ' impr', 12) + row.clicks + ' clicks');
      });
    } else {
      console.log('  (no queries yet)');
    }
  } catch (e) {
    console.log('  ERROR: ' + e.message.slice(0, 90));
  }

  // Snapshot for trend tracking (data/ is git-ignored-safe, created on demand)
  const snapDir = path.join(__dirname, '..', 'data');
  try {
    fs.mkdirSync(snapDir, { recursive: true });
    fs.writeFileSync(path.join(snapDir, 'gsc-snapshot.json'), JSON.stringify({
      generatedAt: new Date().toISOString(),
      site: SITE_URL,
      days: DAYS,
      totals: { clicks: totalClicks, impressions: totalImpr },
    }, null, 2));
    console.log('\n💾 Snapshot saved → data/gsc-snapshot.json');
  } catch (e) {
    console.log('\n⚠️  Snapshot write skipped: ' + e.message.slice(0, 60));
  }

  console.log('\n🟢 GSC tracker complete.');
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

main().catch((e) => {
  if (e.message === 'NO_CREDENTIALS') {
    console.error('⏭  GSC tracker SKIPPED — credentials not configured.');
    console.error('   ' + (e.hint || '').replace(/\n/g, '\n   '));
    process.exit(2);
  }
  if (e.hint) { console.error('❌ ' + e.message + '\n   ' + e.hint.replace(/\n/g, '\n   ')); }
  else { console.error('❌ GSC tracker failed: ' + e.message); }
  process.exit(1);
});
