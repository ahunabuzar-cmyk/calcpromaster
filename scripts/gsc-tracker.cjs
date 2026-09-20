#!/usr/bin/env node
// ============================================================
// CalcProMaster — Weekly GSC Tracker (20k-impressions plan)
// Appends one row per run to data/gsc-trend.csv with 7/28-day
// totals + top page/query, so progress toward 20,000 impressions
// is measurable week over week.
//
// Usage:
//   node scripts/gsc-tracker.cjs                 # append today's row
//   node scripts/gsc-tracker.cjs --show          # print the CSV table
// ============================================================
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');
const { getAccessToken } = require('./lib/google-oauth.cjs');

const API = 'searchconsole.googleapis.com';
const SCOPE_READ = 'https://www.googleapis.com/auth/webmasters.readonly';
const CSV = path.join(__dirname, '..', 'data', 'gsc-trend.csv');

let SITE_URL = (process.env.GSC_SITE_URL || '').replace(/\/+$/, '');
if (!SITE_URL) {
  try {
    const cfg = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-config.js'), 'utf8');
    const m = cfg.match(/domain:\s*'([^']+)'/);
    if (m) SITE_URL = 'https://' + m[1];
  } catch (e) { /* leave empty */ }
}
if (!SITE_URL) { console.error('Site URL not found.'); process.exit(2); }

function api(body, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: API,
      path: '/webmasters/v3/sites/' + encodeURIComponent(SITE_URL) + '/searchAnalytics/query',
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error('HTTP ' + res.statusCode + ': ' + d.slice(0, 200)));
        resolve(JSON.parse(d || '{}'));
      });
    });
    req.on('error', reject);
    req.write(payload); req.end();
  });
}

const dstr = (daysAgo) => new Date(Date.now() - daysAgo * 864e5).toISOString().slice(0, 10);

async function totals(tok, days) {
  const r = await api({ startDate: dstr(days + 3), endDate: dstr(3), dataState: 'all', dimensions: [], rowLimit: 1 }, tok);
  const row = (r.rows && r.rows[0]) || { clicks: 0, impressions: 0, position: 0 };
  return {
    clicks: row.clicks || 0,
    impr: row.impressions || 0,
    ctr: row.impressions ? +(100 * row.clicks / row.impressions).toFixed(2) : 0,
    pos: +(row.position || 0).toFixed(1)
  };
}

async function top(tok, dim, days) {
  const r = await api({ startDate: dstr(days + 3), endDate: dstr(3), dataState: 'all', dimensions: [dim], rowLimit: 1 }, tok);
  const row = (r.rows && r.rows[0]) || null;
  return row ? row.keys.join(' | ') : '';
}

(async () => {
  if (process.argv.includes('--show')) {
    console.log(fs.existsSync(CSV) ? fs.readFileSync(CSV, 'utf8') : '(no data yet)');
    return;
  }
  const tokRes = await getAccessToken(SCOPE_READ);
  const tok = typeof tokRes === 'object' && tokRes !== null ? tokRes.access_token : tokRes;

  const t7 = await totals(tok, 7);
  const t28 = await totals(tok, 28);
  const topPage7 = await top(tok, 'page', 7);
  const topQuery7 = await top(tok, 'query', 7);
  const today = dstr(0);

  const row = [today, t7.clicks, t7.impr, t7.ctr, t7.pos, t28.impr, t28.ctr, t28.pos, topQuery7, topPage7].map(v => {
    const s = String(v);
    return s.includes(',') ? '"' + s + '"' : s;
  }).join(',');

  if (!fs.existsSync(CSV)) {
    fs.mkdirSync(path.dirname(CSV), { recursive: true });
    fs.writeFileSync(CSV, 'date,clicks_7d,impr_7d,ctr_7d,pos_7d,impr_28d,ctr_28d,pos_28d,top_query_7d,top_page_7d\n');
  }
  // Idempotent: same-day rerun replaces the existing row
  const lines = fs.readFileSync(CSV, 'utf8').trimEnd().split('\n');
  const header = lines[0];
  const kept = lines.slice(1).filter(l => l.split(',')[0] !== today);
  kept.push(row);
  fs.writeFileSync(CSV, [header, ...kept].join('\n') + '\n');
  console.log('Tracker row saved (' + today + '):');
  console.log('  7d:  clicks=' + t7.clicks + ' impr=' + t7.impr + ' ctr=' + t7.ctr + '% pos=' + t7.pos);
  console.log('  28d: impr=' + t28.impr + ' ctr=' + t28.ctr + '% pos=' + t28.pos);
  console.log('  top query: ' + (topQuery7 || '—'));
  console.log('  top page:  ' + (topPage7 || '—'));
})().catch(e => { console.error('Tracker failed:', e.message); process.exit(1); });
