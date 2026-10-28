#!/usr/bin/env node
/* TEMP DIAGNOSTIC — per-page impressions in two windows, to locate the 2026-10-19 cliff.
 * Usage: node scripts/dev-gsc-window-compare.cjs
 * READ-ONLY.
 */
'use strict';
const https = require('https');
const path = require('path');
const { getAccessToken } = require('./lib/google-oauth.cjs');

const SITE = 'https://calcpromaster.com/';
const API = 'searchconsole.googleapis.com';

function query(body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: API,
      path: '/webmasters/v3/sites/' + encodeURIComponent(SITE) + '/searchAnalytics/query',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), Authorization: 'Bearer ' + token },
      timeout: 30000,
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        let j = null; try { j = JSON.parse(buf); } catch { /* ignore */ }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' ' + buf.slice(0, 300)));
        resolve(j);
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data); req.end();
  });
}

const WINDOWS = [
  ['A 2026-09-25..2026-10-18', '2026-09-25', '2026-10-18'],
  ['B 2026-10-19..2026-10-27', '2026-10-19', '2026-10-27'],
];

(async () => {
  const { access_token } = await getAccessToken('https://www.googleapis.com/auth/webmasters.readonly');
  const byWindow = {};
  for (const [label, start, end] of WINDOWS) {
    const j = await query({ startDate: start, endDate: end, dimensions: ['page'], rowLimit: 25000, dataState: 'all' }, access_token);
    const map = {};
    for (const r of j.rows || []) map[r.keys[0]] = { impressions: r.impressions, clicks: r.clicks, position: r.position };
    byWindow[label] = map;
    const tot = Object.values(map).reduce((s, v) => s + v.impressions, 0);
    console.log(label + ': ' + Object.keys(map).length + ' pages, ' + Math.round(tot) + ' impressions');
  }

  const [aLabel, bLabel] = WINDOWS.map((w) => w[0]);
  const A = byWindow[aLabel], B = byWindow[bLabel];
  const all = new Set([...Object.keys(A), ...Object.keys(B)]);
  const rows = [...all].map((u) => ({
    url: u,
    before: Math.round((A[u] || {}).impressions || 0),
    after: Math.round((B[u] || {}).impressions || 0),
    posBefore: (A[u] || {}).position,
    posAfter: (B[u] || {}).position,
  }));

  const survivors = rows.filter((r) => r.after > 0);
  console.log('\npages with impressions BEFORE: ' + rows.filter((r) => r.before > 0).length);
  console.log('pages with impressions AFTER : ' + survivors.length);
  const sumBefore = rows.reduce((s, r) => s + r.before, 0);
  const sumAfter = rows.reduce((s, r) => s + r.after, 0);
  console.log('impressions ' + sumBefore + ' -> ' + sumAfter);

  console.log('\n--- survivors after the cliff (all ' + survivors.length + ') ---');
  for (const r of survivors.sort((x, y) => y.after - x.after)) {
    console.log(String(r.after).padStart(6), '  was', String(r.before).padStart(6), ' pos', (r.posAfter || 0).toFixed(1), ' ', r.url);
  }

  console.log('\n--- top 25 before the cliff ---');
  for (const r of rows.sort((x, y) => y.before - x.before).slice(0, 25)) {
    console.log(String(r.before).padStart(6), ' ->', String(r.after).padStart(4), ' pos', (r.posBefore || 0).toFixed(1), '->', ((r.posAfter || 0).toFixed(1)), ' ', r.url);
  }
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
