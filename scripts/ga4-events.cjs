// ============================================================
// CalcProMaster — GA4 Events Count Check (Google Analytics 4 Data API)
// ------------------------------------------------------------
// Fetches real event counts from your GA4 property via the
// official Analytics Data API (v1beta) — no browser needed.
//
// What it reports (last N days, default 7):
//   • Total event counts: page_view, calculator_use, user_engagement, session_start
//   • Top calculators by calculator_use (tool_id), with share %
//   • Users / sessions summary (approximate, from metric totals)
//
// Requirements (one time):
//   1. GA4 Property ID (numeric, NOT the G-XXXX Measurement ID) → env GA4_PROPERTY_ID
//      Find: analytics.google.com → Admin → Property Settings →
//            scroll to "Property ID" (e.g. 123456789)
//   2. Google service-account credentials → docs/api-credentials-setup.md
//      (GOOGLE_APPLICATION_CREDENTIALS or service-account.json)
//
// Usage:
//   GA4_PROPERTY_ID=123456789 node scripts/ga4-events.cjs            # last 7 days
//   GA4_PROPERTY_ID=123456789 node scripts/ga4-events.cjs --days 1   # yesterday
//   GA4_PROPERTY_ID=123456789 node scripts/ga4-events.cjs --days 30  # last 30 days
//
// Exit code: 0 = success · 1 = API/credentials error · 2 = not configured (skipped)
// ============================================================
'use strict';
const https = require('https');
const { getAccessToken } = require('./lib/google-oauth.cjs');

const PROPERTY_ID = process.env.GA4_PROPERTY_ID || '';
const DAYS = (() => {
  const i = process.argv.indexOf('--days');
  const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : 7;
  return Number.isFinite(v) && v > 0 ? v : 7;
})();
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const API = 'analyticsdata.googleapis.com';
const ENDPOINT = '/v1beta/properties/' + PROPERTY_ID + ':runReport';

function apiPost(path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: API,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 30000,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            if (res.statusCode !== 200) reject(new Error('GA4 API HTTP ' + res.statusCode + ': ' + (j.error ? j.error.message : data.slice(0, 300))));
            else resolve(j);
          } catch (e) { reject(new Error('bad GA4 response: ' + data.slice(0, 200))); }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('GA4 API timeout')));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function pad(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }

async function main() {
  if (!PROPERTY_ID) {
    console.log('⏭  GA4 events check SKIPPED — GA4_PROPERTY_ID not set.');
    console.log('   Property ID = numeric (NOT the G-XXXX Measurement ID).');
    console.log('   Find it: analytics.google.com → Admin → Property Settings → Property ID');
    console.log('   Run: GA4_PROPERTY_ID=123456789 node scripts/ga4-events.cjs');
    process.exit(2);
  }

  console.log('📊 CalcProMaster — GA4 Events (last ' + DAYS + ' day' + (DAYS > 1 ? 's' : '') + ')');
  console.log('   Property ID: ' + PROPERTY_ID + ' · API: Analytics Data v1beta\n');

  // 1. Event counts (all events, last N days)
  const token = (await getAccessToken(SCOPE)).access_token;
  const dateRange = { startDate: daysAgo(DAYS - 1), endDate: daysAgo(0) };
  const totals = await apiPost(ENDPOINT, {
    dateRanges: [dateRange],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 250,
  }, token);

  const eventMap = {};
  for (const r of (totals.rows || [])) {
    const name = r.dimensionValues[0].value;
    const count = parseInt(r.metricValues[0].value, 10);
    eventMap[name] = (eventMap[name] || 0) + count;
  }

  const tracked = ['page_view', 'calculator_use', 'user_engagement', 'session_start', 'scroll'];
  console.log('— Tracked events —');
  let any = false;
  for (const ev of tracked) {
    if (eventMap[ev] !== undefined) { console.log('  ' + pad(ev, 22) + eventMap[ev].toLocaleString()); any = true; }
  }
  if (!any) console.log('  (no data yet — GA4 standard reports need 24-48h)');

  // 2. Top calculators by calculator_use (tool_id event parameter)
  let topTools = null;
  try {
    topTools = await apiPost(ENDPOINT, {
      dateRanges: [dateRange],
      dimensions: [{ name: 'customEvent:tool_id' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: { fieldName: 'eventName', inListFilter: { values: ['calculator_use'] } },
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 10,
    }, token);
  } catch (e) {
    console.log('  (top-tools query failed: ' + e.message.slice(0, 80) + ' — main counts above are still valid)');
  }

  const totalCalc = eventMap.calculator_use || 0;
  console.log('\n— Top calculators (calculator_use) —');
  if (topTools && topTools.rows && topTools.rows.length) {
    topTools.rows.forEach((r, i) => {
      const tool = r.dimensionValues[0].value || '(unknown)';
      const count = parseInt(r.metricValues[0].value, 10);
      const share = totalCalc ? ((count / totalCalc) * 100).toFixed(1) + '%' : '-';
      console.log('  ' + (i + 1) + '. ' + pad(tool, 26) + pad(count.toLocaleString(), 10) + share);
    });
  } else if (topTools) {
    console.log('  (no calculator_use events yet)');
  }

  // 3. Snapshot file for trend tracking (data/ is git-ignored-safe, created on demand)
  const fs = require('fs');
  const path = require('path');
  const snapDir = path.join(__dirname, '..', 'data');
  const snap = {
    generatedAt: new Date().toISOString(),
    propertyId: PROPERTY_ID,
    days: DAYS,
    events: eventMap,
    topTools: topTools && topTools.rows ? topTools.rows.map((r) => ({ tool: r.dimensionValues[0].value, count: parseInt(r.metricValues[0].value, 10) })) : [],
  };
  try {
    fs.mkdirSync(snapDir, { recursive: true });
    fs.writeFileSync(path.join(snapDir, 'ga4-events-snapshot.json'), JSON.stringify(snap, null, 2));
    console.log('\n💾 Snapshot saved → data/ga4-events-snapshot.json');
  } catch (e) {
    console.log('\n⚠️  Snapshot write skipped: ' + e.message.slice(0, 60));
  }

  console.log('\n🟢 GA4 check complete.');
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

main().catch((e) => {
  if (e.message === 'NO_CREDENTIALS') {
    console.error('⏭  GA4 check SKIPPED — credentials not configured.');
    console.error('   ' + (e.hint || '').replace(/\n/g, '\n   '));
    process.exit(2);
  }
  if (e.hint) { console.error('❌ ' + e.message + '\n   ' + e.hint.replace(/\n/g, '\n   ')); }
  else { console.error('❌ GA4 check failed: ' + e.message); }
  process.exit(1);
});
