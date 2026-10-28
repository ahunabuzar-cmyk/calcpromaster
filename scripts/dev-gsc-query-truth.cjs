#!/usr/bin/env node
/* What is Google still showing the site for? (query dimension, last 10 days)
 * Reads nothing from disk; asks the Search Analytics API and prints the rows.
 */
'use strict';
const https = require('https');
const { getAccessToken } = require('./lib/google-oauth.cjs');

function post(path, body, token) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const r = https.request({
      hostname: 'searchconsole.googleapis.com', path, method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 30000,
    }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => { try { resolve({ status: res.statusCode, json: JSON.parse(b) }); } catch { resolve({ status: res.statusCode, raw: b.slice(0, 300) }); } });
    });
    r.on('error', (e) => resolve({ status: 0, raw: e.message }));
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  const token = (await getAccessToken('https://www.googleapis.com/auth/webmasters')).access_token;
  const site = 'https://calcpromaster.com/';
  const p = encodeURIComponent(site);

  for (const [label, start, end] of [['before cliff 2026-10-10..10-16', '2026-10-10', '2026-10-16'], ['after cliff 2026-10-20..10-27', '2026-10-20', '2026-10-27']]) {
    const r = await post(`/webmasters/v3/sites/${p}/searchAnalytics/query`, {
      startDate: start, endDate: end, dimensions: ['query'], rowLimit: 15,
    }, token);
    console.log('\n=== ' + label + ' (' + r.status + ') ===');
    const rows = (r.json && r.json.rows) || [];
    if (!rows.length) console.log(JSON.stringify(r.json || r.raw).slice(0, 300));
    for (const row of rows) {
      console.log(String(row.impressions).padStart(6) + ' imp  ' + String(row.clicks).padStart(3) + ' clk  pos ' +
        (row.position || 0).toFixed(1) + '  ' + row.keys[0]);
    }
    const tot = rows.reduce((a, x) => a + x.impressions, 0);
    console.log('rows returned: ' + rows.length + '  impressions in these rows: ' + tot);
  }

  // daily totals for the last 20 days, no dimension split
  const r2 = await post(`/webmasters/v3/sites/${p}/searchAnalytics/query`, {
    startDate: '2026-10-08', endDate: '2026-10-27', dimensions: ['date'], rowLimit: 40,
  }, token);
  console.log('\n=== daily totals (' + r2.status + ') ===');
  for (const row of (r2.json && r2.json.rows) || []) {
    console.log(row.keys[0] + '  imp=' + String(row.impressions).padStart(5) + '  clk=' + row.clicks);
  }
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
