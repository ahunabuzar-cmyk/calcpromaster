#!/usr/bin/env node
/* ============================================================
 * CalcProMaster — GSC daily series export (API → Chart.csv)
 * ------------------------------------------------------------
 * build-growth-model.cjs and run-rate-tracker.cjs take the run-rate from
 *   data/gsc-performance-export-<date>/Chart.csv   date,clicks,impressions,ctr,position
 * which only exists when somebody downloads the Performance report by hand from
 * the Search Console UI. So with a live token the weekly refresh still printed
 *   "⚠ STALE SOURCE: export ends <8 days ago>"
 * and the run-rate stayed a week old — the number every growth report is built on.
 *
 * This script writes that same CSV from the API, in the same folder naming and
 * column order, so the manual export step disappears. Days with no data are
 * written as zero (the API omits them, and a 7-row window that is really 5 days
 * silently overstates the per-day rate).
 *
 * Usage: node scripts/gsc-export-daily.cjs [--days 120]
 * Writes: data/gsc-performance-export-<UTC today>/Chart.csv
 * READ-ONLY against the API.
 * ============================================================ */
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');
const { getAccessToken } = require('./lib/google-oauth.cjs');

const ROOT = path.join(__dirname, '..');
const API = 'searchconsole.googleapis.com';
const SCOPE_READ = 'https://www.googleapis.com/auth/webmasters.readonly';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : NaN;
  return Number.isFinite(v) && v > 0 ? v : dflt;
};
const DAYS = arg('--days', 120);

function siteUrl() {
  const env = (process.env.GSC_SITE_URL || '').replace(/\/+$/, '');
  if (env) return env;
  try {
    const cfg = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
    const m = cfg.match(/domain:\s*'([^']+)'/);
    if (m && m[1]) return 'https://' + m[1].replace(/^https?:\/\//, '').replace(/\/+$/, '');
  } catch (e) { /* fall through */ }
  return 'https://calcpromaster.com';
}
const SITE_URL = siteUrl();

function query(body, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: API,
      path: '/webmasters/v3/sites/' + encodeURIComponent(SITE_URL) + '/searchAnalytics/query',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 30000,
    }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error('HTTP ' + res.statusCode + ': ' + d.slice(0, 200)));
        try { resolve(JSON.parse(d || '{}')); } catch (e) { reject(new Error('bad JSON: ' + d.slice(0, 200))); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('request timeout')));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const iso = (d) => d.toISOString().slice(0, 10);
const pct = (clicks, impressions) => {
  if (!impressions) return '0%';
  return (parseFloat((100 * clicks / impressions).toFixed(2)).toString()) + '%';
};
const pos = (p) => (Number.isFinite(p) && p > 0 ? p.toFixed(1) : '');

(async () => {
  console.log('📈 GSC daily series — ' + SITE_URL + ' (' + DAYS + 'd)');
  const t = await getAccessToken(SCOPE_READ);
  const token = t.access_token || t;

  // Yesterday is the newest complete day on Google's side.
  const end = new Date(Date.now() - 864e5);
  const start = new Date(end.getTime() - (DAYS - 1) * 864e5);
  const startDate = iso(start);
  const endDate = iso(end);

  const res = await query({
    startDate,
    endDate,
    dimensions: ['date'],
    dataState: 'all',
    rowLimit: 25000,
  }, token);

  const byDate = new Map();
  for (const r of res.rows || []) {
    const day = r.keys && r.keys[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day))) continue;
    byDate.set(day, {
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr,
      position: r.position,
    });
  }
  if (!byDate.size) {
    console.error('✖ API returned no day rows — nothing written (access itself may still be fine).');
    process.exit(1);
  }

  const lines = ['Date,Clicks,Impressions,CTR,Position'];
  let totalClicks = 0;
  let totalImpressions = 0;
  for (let d = new Date(startDate + 'T00:00:00Z'); iso(d) <= endDate; d = new Date(d.getTime() + 864e5)) {
    const day = iso(d);
    const row = byDate.get(day) || { clicks: 0, impressions: 0, position: 0 };
    totalClicks += row.clicks;
    totalImpressions += row.impressions;
    lines.push([day, row.clicks, row.impressions, pct(row.clicks, row.impressions), pos(row.position)].join(','));
  }

  const outDir = path.join(ROOT, 'data', 'gsc-performance-export-' + iso(new Date()));
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'Chart.csv');
  fs.writeFileSync(outFile, lines.join('\r\n') + '\r\n');

  const newest = [...byDate.keys()].sort().pop();
  const recent = lines.slice(-8, -1);
  console.log('✅ ' + (lines.length - 1) + ' day(s) → ' + path.relative(ROOT, outFile));
  console.log('   window ' + startDate + ' → ' + endDate + ' · newest day with data: ' + newest);
  console.log('   clicks ' + totalClicks + ' · impressions ' + totalImpressions);
  console.log('   last 7 days (unfinalised tail included — the rate trims it):');
  recent.forEach((l) => console.log('     ' + l));
  console.log('   Next: node scripts/build-growth-model.cjs && node scripts/run-rate-tracker.cjs');
})().catch((e) => {
  console.error('✖ gsc-export-daily failed: ' + e.message);
  if (e.hint) console.error('  ' + e.hint);
  process.exit(1);
});
