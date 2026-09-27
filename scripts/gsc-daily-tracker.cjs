#!/usr/bin/env node
// ============================================================
// CalcProMaster — GSC daily tracker (calcpromaster.com property)
// Pulls REAL Search Console performance data (7-day window) via the
// Search Console API and appends one row to data/gsc-trend.csv.
// Usage: node scripts/gsc-daily-tracker.cjs [days-back]
//   days-back: report window end (default 0 = today; data lags ~2 days)
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const { getAccessToken } = require('./lib/google-oauth.cjs');

const SITE = 'https://calcpromaster.com/';
const CSV = path.join(__dirname, '..', 'data', 'gsc-trend.csv');

function post(urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const r = require('https').request({
      hostname: 'searchconsole.googleapis.com', path: urlPath, method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, res => {
      let d = ''; res.on('data', c => { d += c; });
      res.on('end', () => { try { resolve({ status: res.statusCode, json: d ? JSON.parse(d) : null }); } catch (e) { resolve({ status: res.statusCode, json: null, raw: d.slice(0, 300) }); } });
    });
    r.on('error', reject); r.write(payload); r.end();
  });
}

(async () => {
  const daysBack = parseInt(process.argv[2], 10) || 0;
  const token = (await getAccessToken('https://www.googleapis.com/auth/webmasters.readonly')).access_token;

  // 7-day window ending `daysBack` days ago (GSC data lags ~2 days)
  const end = new Date(Date.now() - daysBack * 86400000);
  const start = new Date(end.getTime() - 6 * 86400000);
  const iso = d => d.toISOString().slice(0, 10);

  const body = {
    startDate: iso(start), endDate: iso(end),
    dimensions: ['query'], rowLimit: 1,
    dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'excludingRegex', expression: '.*' }] }]
  };
  // Two pulls: totals (no dimension filter) + top query/page detail
  const totals = await post('/webmasters/v3/sites/' + encodeURIComponent(SITE) + '/searchAnalytics/query',
    { startDate: iso(start), endDate: iso(end), rowLimit: 1 }, token);
  const topQ = await post('/webmasters/v3/sites/' + encodeURIComponent(SITE) + '/searchAnalytics/query',
    { startDate: iso(start), endDate: iso(end), dimensions: ['query'], rowLimit: 1 }, token);
  const topP = await post('/webmasters/v3/sites/' + encodeURIComponent(SITE) + '/searchAnalytics/query',
    { startDate: iso(start), endDate: iso(end), dimensions: ['page'], rowLimit: 1 }, token);

  const row = (totals.json && totals.json.rows && totals.json.rows[0]) || {};
  const q = (topQ.json && topQ.json.rows && topQ.json.rows[0]) || {};
  const p = (topP.json && topP.json.rows && topP.json.rows[0]) || {};

  const today = iso(new Date());
  const line = [
    today,
    row.clicks ?? 0, row.impressions ?? 0,
    row.ctr != null ? (row.ctr * 100).toFixed(2) : '0.00',
    row.position != null ? row.position.toFixed(1) : '0.0',
    row.impressions ?? 0, // 28d column reused as 7d-total until a second window pull (kept compatible with existing CSV shape)
    row.ctr != null ? (row.ctr * 100).toFixed(2) : '0.00',
    row.position != null ? row.position.toFixed(1) : '0.0',
    (q.keys && q.keys[0]) || '',
    (p.keys && p.keys[0]) || ''
  ].join(',');

  const csv = fs.readFileSync(CSV, 'utf8').trimEnd().split('\n');
  const stamp = ',' + today + ' (7d window ' + iso(start) + '..' + iso(end) + ', .com property, via API)';
  if (csv[csv.length - 1].startsWith(today + ',')) { csv[csv.length - 1] = line + stamp; }
  else csv.push(line + stamp);
  fs.writeFileSync(CSV, csv.join('\n') + '\n');
  console.log('Row written for ' + today + ' (window ' + iso(start) + '..' + iso(end) + '):');
  console.log('  clicks=' + (row.clicks ?? 0) + ' impressions=' + (row.impressions ?? 0) +
    ' ctr=' + (row.ctr != null ? (row.ctr * 100).toFixed(2) + '%' : 'n/a') +
    ' pos=' + (row.position != null ? row.position.toFixed(1) : 'n/a'));
  console.log('  top query: ' + ((q.keys && q.keys[0]) || '(none)'));
  console.log('  top page: ' + ((p.keys && p.keys[0]) || '(none)'));
})().catch(e => { console.error('FAIL:', e.message); if (e.hint) console.error(e.hint); process.exit(1); });
