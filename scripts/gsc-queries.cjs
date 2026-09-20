#!/usr/bin/env node
// GSC 28-day performance: queries + pages (clicks, impressions, CTR, position).
// Purpose: CTR polish — find queries/pages with impressions but few clicks.
// Usage: node scripts/gsc-queries.cjs [--days 28] [--rows 100]
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');
const { getAccessToken } = require('./lib/google-oauth.cjs');

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : NaN;
  return Number.isFinite(v) && v > 0 ? v : dflt;
};
const DAYS = arg('--days', 28);
const ROWS = Math.min(arg('--rows', 100), 250);
const API = 'searchconsole.googleapis.com';
const SCOPE_READ = 'https://www.googleapis.com/auth/webmasters.readonly';

let SITE_URL = (process.env.GSC_SITE_URL || '').replace(/\/+$/, '');
if (!SITE_URL) {
  try {
    const cfg = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-config.js'), 'utf8');
    const m = cfg.match(/domain:\s*'([^']+)'/);
    if (m) SITE_URL = 'https://' + m[1];
  } catch (e) { /* leave empty */ }
}
if (!SITE_URL) { console.error('Site URL not found (js/site-config.js domain field).'); process.exit(2); }

function api(body, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: API, path: '/webmasters/v3/sites/' + encodeURIComponent(SITE_URL) + '/searchAnalytics/query',
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

function fmt(rows) {
  return (rows || []).map(r => {
    const ctr = r.impressions ? (100 * r.clicks / r.impressions).toFixed(1) + '%' : '—';
    return `${(r.keys ? r.keys.join(' | ') : '?').padEnd(60)} clicks=${String(r.clicks).padEnd(4)} impr=${String(r.impressions).padEnd(5)} ctr=${ctr.padEnd(6)} pos=${(r.position || 0).toFixed(1)}`;
  }).join('\n');
}

(async () => {
  const tokRes = await getAccessToken(SCOPE_READ);
  const tok = typeof tokRes === 'object' && tokRes !== null ? tokRes.access_token : tokRes;
  const end = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
  const start = new Date(Date.now() - (DAYS + 3) * 864e5).toISOString().slice(0, 10);
  const base = { startDate: start, endDate: end, dataState: 'all', rowLimit: ROWS };

  const q = await api({ ...base, dimensions: ['query'] }, tok);
  const p = await api({ ...base, dimensions: ['page'] }, tok);
  const t = await api({ ...base, dimensions: [] }, tok);

  console.log(`== ${DAYS}-day totals (dataState=all) ==`);
  if (t.rows && t.rows[0]) {
    const r = t.rows[0];
    console.log(`clicks=${r.clicks} impressions=${r.impressions} ctr=${(100 * r.clicks / Math.max(r.impressions, 1)).toFixed(1)}% pos=${(r.position || 0).toFixed(1)}`);
  }
  console.log(`\n== TOP QUERIES (rows=${(q.rows || []).length}) ==\n` + fmt(q.rows));
  console.log(`\n== TOP PAGES (rows=${(p.rows || []).length}) ==\n` + fmt(p.rows));
})().catch(e => { console.error('GSC queries failed:', e.message); process.exit(1); });
