#!/usr/bin/env node
/* TEMP DIAGNOSTIC — query breadth in two windows (pre/post 2026-10-19 cliff).
 * Usage: node scripts/dev-gsc-query-breadth.cjs
 */
'use strict';
const https = require('https');
const { getAccessToken } = require('./lib/google-oauth.cjs');

const SITE = 'https://calcpromaster.com/';

function query(body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'searchconsole.googleapis.com',
      path: '/webmasters/v3/sites/' + encodeURIComponent(SITE) + '/searchAnalytics/query',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), Authorization: 'Bearer ' + token },
      timeout: 30000,
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        let j = null; try { j = JSON.parse(buf); } catch { /* ignore */ }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' ' + buf.slice(0, 200)));
        resolve(j);
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data); req.end();
  });
}

(async () => {
  const { access_token } = await getAccessToken('https://www.googleapis.com/auth/webmasters.readonly');
  const windows = [
    ['PRE  2026-10-12..2026-10-18', '2026-10-12', '2026-10-18'],
    ['POST 2026-10-19..2026-10-27', '2026-10-19', '2026-10-27'],
  ];
  for (const [label, start, end] of windows) {
    const j = await query({ startDate: start, endDate: end, dimensions: ['query'], rowLimit: 25000, dataState: 'all' }, access_token);
    const rows = j.rows || [];
    const impr = rows.reduce((s, r) => s + r.impressions, 0);
    const clicks = rows.reduce((s, r) => s + r.clicks, 0);
    console.log('\n=== ' + label + ' ===');
    console.log('distinct queries: ' + rows.length + ' | impressions: ' + Math.round(impr) + ' | clicks: ' + clicks);
    const top = rows.slice().sort((a, b) => b.impressions - a.impressions).slice(0, 12);
    for (const r of top) console.log('  ' + String(Math.round(r.impressions)).padStart(5) + '  pos ' + r.position.toFixed(1).padStart(5) + '  ' + r.keys[0]);
  }
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
