#!/usr/bin/env node
// ============================================================
// CalcProMaster — GSC per-page performance export
// ------------------------------------------------------------
// Pulls the last N days of page-level GSC data (clicks, impressions,
// position) and writes data/gsc-page-impressions.json. crawl-link-boost
// uses it to PREFER the pages Google actually shows as link sources —
// a link from a page with real impressions carries more crawl priority
// than one from a page Google rarely serves.
//
// Usage: node scripts/gsc-export-pages.cjs [--days 28] [--rows 250]
// ============================================================
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
// Default = the API's full 25,000-row ceiling, not 250.
//
// The old 250 default did not mean "the top 250 pages": the Search Analytics API
// returns rows sorted by CLICKS, so asking for 250 rows kept the 250 pages with
// the most clicks and dropped the impression-heavy pages that have none. The
// file then claimed its top page had 501 impressions when the real leader
// (/health/bmr-mifflin) had 1,108, and it reported 3,729 impressions against a
// site total of 17,580 — a 21% sample that every consumer read as the whole
// picture (growth model, query action plan, query opportunity, query reach, link
// equity, the indexing list). Requesting the full set costs one API call and
// returns ~800 rows / ~617 pages, so there is no reason to keep the cap.
const ROWS = Math.min(arg('--rows', 25000), 25000);
const OUT = path.join(__dirname, '..', 'data', 'gsc-page-impressions.json');
const API = 'searchconsole.googleapis.com';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

let SITE_URL = (process.env.GSC_SITE_URL || '').replace(/\/+$/, '');
if (!SITE_URL) {
  try {
    const cfg = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-config.js'), 'utf8');
    const m = cfg.match(/domain:\s*'([^']+)'/);
    if (m) SITE_URL = 'https://' + m[1].replace(/^https?:\/\//, '');
  } catch (e) { /* leave empty */ }
}
if (!SITE_URL) { console.error('Site URL not found (js/site-config.js domain).'); process.exit(2); }

function api(body, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: API,
      path: '/webmasters/v3/sites/' + encodeURIComponent(SITE_URL + '/') + '/searchAnalytics/query',
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error('HTTP ' + res.statusCode + ': ' + d.slice(0, 200)));
        resolve(JSON.parse(d || '{}'));
      });
    });
    req.on('error', reject);
    req.write(payload); req.end();
  });
}

(async () => {
  const token = (await getAccessToken(SCOPE)).access_token;
  const end = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
  const start = new Date(Date.now() - (DAYS + 3) * 864e5).toISOString().slice(0, 10);
  const res = await api({ startDate: start, endDate: end, dataState: 'all', dimensions: ['page'], rowLimit: ROWS }, token);
  const pages = {};
  let collisions = 0;
  for (const r of res.rows || []) {
    // Normalize to a repo-relative path (strip domain, trailing slash) so the
    // build can match it against coverage URLs regardless of served form.
    let p = String(r.keys[0]).replace(SITE_URL, '');
    if (!p.startsWith('/')) p = '/' + p;
    const key = p.replace(/\/+$/, '') || '/';
    const prev = pages[key];
    if (prev) {
      // Sites served at more than one form collapse onto one key (with/without a
      // trailing slash, http/https, a stray query string). Overwriting dropped the
      // earlier row's impressions and clicks — this file reported 3,729
      // impressions against a 17,580 site total because 250 API rows collapsed
      // into 188 keys and 62 rows were discarded. Merge instead: clicks and
      // impressions add, and position is the impression-weighted mean, which is
      // the same figure the API reports when the two rows are requested together.
      collisions++;
      const impressions = prev.impressions + r.impressions;
      const position = impressions
        ? (prev.position * prev.impressions + (r.position || 0) * r.impressions) / impressions
        : 0;
      pages[key] = {
        clicks: prev.clicks + r.clicks,
        impressions,
        ctr: impressions ? +((prev.clicks + r.clicks) / impressions).toFixed(4) : 0,
        position: +position.toFixed(1),
      };
      continue;
    }
    pages[key] = {
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.impressions ? +(r.clicks / r.impressions).toFixed(4) : 0,
      position: +(r.position || 0).toFixed(1),
    };
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ ranAt: new Date().toISOString(), site: SITE_URL, days: DAYS, startDate: start, endDate: end, count: Object.keys(pages).length, pages }, null, 2));
  console.log('✅ ' + Object.keys(pages).length + ' pages → ' + path.relative(path.join(__dirname, '..'), OUT)
    + (collisions ? '  (' + collisions + ' duplicate URL form(s) merged)' : ''));
  console.log('   API rows returned: ' + (res.rows || []).length + ' of rowLimit ' + ROWS
    + ' · impressions covered: ' + Object.values(pages).reduce((s, v) => s + v.impressions, 0));
  const top = Object.entries(pages).sort((a, b) => b[1].impressions - a[1].impressions).slice(0, 5);
  for (const [u, v] of top) console.log('   ' + String(v.impressions).padStart(5) + ' impr  ' + u);
})().catch((e) => { console.error('GSC page export failed:', e.message); process.exit(1); });
