#!/usr/bin/env node
/* Dev-only: live GSC searchAnalytics diff.
 *
 * Why: every "impressions fell / index fell" claim in this repo has so far been
 * read from a CSV export of unknown age. This script asks the API directly for
 * day-by-day, query-level rows and prints equal-length weekly windows, so the
 * comparison is between identical measures.
 *
 * Usage: node scripts/dev-gsc-perf-diff.cjs [days]
 */
'use strict';
const path = require('path');
const https = require('https');
const ROOT = path.join(__dirname, '..');
const access = require(path.join(ROOT, 'scripts', 'lib', 'google-oauth.cjs'));
const siteUrl = 'https://calcpromaster.com/';

function post(pathname, body, token) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'www.googleapis.com', path: pathname, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        Authorization: 'Bearer ' + token,
      },
      timeout: 45000,
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => resolve({ status: res.statusCode, json: (() => { try { return JSON.parse(buf); } catch { return null; } })() }));
    });
    req.on('error', () => resolve({ status: 0, json: null }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, json: null }); });
    req.write(data); req.end();
  });
}

const addDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

(async () => {
  const days = parseInt(process.argv[2], 10) || 30;
  const { access_token } = await access.getAccessToken('https://www.googleapis.com/auth/webmasters.readonly');
  const end = addDays(new Date().toISOString().slice(0, 10), -1);
  const start = addDays(end, -(days - 1));

  // Day x query rows: this is the only dimension set that can answer both
  // "did impressions fall" and "did query breadth fall" from one pull.
  const body = {
    startDate: start, endDate: end,
    dimensions: ['date', 'query'],
    rowLimit: 25000,
    dataState: 'final',
  };
  const res = await post('/webmasters/v3/sites/' + encodeURIComponent(siteUrl) + '/searchAnalytics/query', body, access_token);
  if (res.status !== 200 || !res.json) {
    console.error('query failed:', res.status, JSON.stringify(res.json).slice(0, 300));
    process.exit(1);
  }
  const rows = (res.json.rows || []).map((r) => ({
    date: r.keys[0], query: r.keys[1],
    clicks: r.clicks, impressions: r.impressions, position: r.position,
  }));
  console.log('rows:', rows.length, 'window:', start, '->', end);

  const byDate = new Map();
  const byQuery = new Map();
  for (const r of rows) {
    const d = byDate.get(r.date) || { impressions: 0, clicks: 0, queries: new Set() };
    d.impressions += r.impressions; d.clicks += r.clicks; d.queries.add(r.query);
    byDate.set(r.date, d);
    const q = byQuery.get(r.query) || { impressions: 0, clicks: 0, days: new Set() };
    q.impressions += r.impressions; q.clicks += r.clicks; q.days.add(r.date);
    byQuery.set(r.query, q);
  }

  console.log('\n=== per day ===');
  for (const date of [...byDate.keys()].sort()) {
    const d = byDate.get(date);
    console.log(date, String(d.impressions).padStart(6), 'impr', String(d.clicks).padStart(4), 'clicks', String(d.queries.size).padStart(5), 'queries');
  }

  console.log('\n=== week windows (equal 7 days, last complete week first) ===');
  for (let i = 0; i < 4; i++) {
    const wEnd = addDays(end, -i * 7);
    const wStart = addDays(wEnd, -6);
    let imp = 0, clk = 0; const qs = new Set();
    for (let d = wStart; d <= wEnd; d = addDays(d, 1)) {
      const day = byDate.get(d);
      if (!day) continue;
      imp += day.impressions; clk += day.clicks;
      for (const q of day.queries) qs.add(q);
    }
    console.log(wStart, '->', wEnd, '| impr', String(imp).padStart(6), '| /day', String(Math.round(imp / 7)).padStart(4), '| clicks', String(clk).padStart(3), '| queries', qs.size);
  }

  console.log('\n=== top queries (whole window) ===');
  [...byQuery.entries()].sort((a, b) => b[1].impressions - a[1].impressions).slice(0, 25)
    .forEach(([q, v]) => console.log(String(v.impressions).padStart(6), String(v.clicks).padStart(4), 'd' + v.days.size, q));

  console.log('\n=== queries that existed only in the first half (this is breadth loss) ===');
  const mid = addDays(start, Math.floor(days / 2));
  const early = [...byQuery].filter(([, v]) => [...v.days].every((d) => d < mid)).map(([q]) => q);
  console.log('early-only queries:', early.length);
  console.log(early.slice(0, 30).join(' | '));
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
