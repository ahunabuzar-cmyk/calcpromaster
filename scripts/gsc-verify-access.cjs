#!/usr/bin/env node
/* ============================================================
 * CalcProMaster — GSC access verifier (READ-ONLY)
 * ------------------------------------------------------------
 * docs/GSC-STATUS-REPORT.md tells you to "verify success with a read-only
 * property list before trusting any metric", but no script did that: every
 * gsc-*.cjs goes straight to a searchAnalytics POST, so a dead token surfaced
 * as a failed data pull instead of a clear access verdict.
 *
 * This script performs the three cheapest possible reads, in order, and stops
 * at the first hard failure:
 *   1. refresh-token exchange        → is the stored token alive at all?
 *   2. GET /webmasters/v3/sites      → can the account read the property list?
 *   3. one-row searchAnalytics query → can it actually read data, and how fresh?
 *
 * It writes nothing, mutates nothing and never prints a token or secret.
 *
 * Exit: 0 = token alive + property visible + data readable
 *       1 = token alive but a check failed (see output)
 *       2 = token dead/revoked → re-run the login (the only human step)
 *
 * Usage: node scripts/gsc-verify-access.cjs [--site https://example.com/]
 * ============================================================ */
'use strict';
const fs = require('fs');
const https = require('https');
const path = require('path');
const { getAccessToken, REFRESH_TOKEN_FILE } = require('./lib/google-oauth.cjs');

const ROOT = path.join(__dirname, '..');
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const argv = process.argv.slice(2);
const siteArgIdx = argv.indexOf('--site');

// Property — SINGLE SOURCE OF TRUTH: js/site-config.js (`domain:`), the same
// resolution the rest of the SEO scripts use.
function defaultSite() {
  try {
    const cfg = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
    const m = cfg.match(/domain:\s*'([^']+)'/);
    if (m && m[1]) return 'https://' + m[1].replace(/^https?:\/\//, '') + '/';
  } catch (e) { /* fall through */ }
  return 'https://calcpromaster.com/';
}
const SITE = siteArgIdx >= 0 && argv[siteArgIdx + 1] ? argv[siteArgIdx + 1] : defaultSite();

function api(method, pathName, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'www.googleapis.com',
      path: pathName,
      method,
      headers: Object.assign(
        { Authorization: 'Bearer ' + token, Accept: 'application/json' },
        payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}
      ),
      timeout: 20000,
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { /* keep raw */ }
        resolve({ status: res.statusCode, json, raw: data });
      });
    });
    req.on('timeout', () => req.destroy(new Error('request timeout')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function isoDay(d) { return d.toISOString().slice(0, 10); }

(async () => {
  console.log('==========================================');
  console.log(' GSC ACCESS VERIFIER (read-only) — ' + SITE);
  console.log('==========================================');

  if (!fs.existsSync(REFRESH_TOKEN_FILE)) {
    console.error('✖ No refresh token at ' + REFRESH_TOKEN_FILE);
    console.error('  Run: node scripts/gsc-oauth-login.cjs --paste');
    process.exit(2);
  }

  // ---- 1. token exchange ----
  let token;
  try {
    const t = await getAccessToken(SCOPE);
    token = t.access_token;
    console.log('✅ step 1  token exchange        OK (expires in ' + (t.expires_in || '?') + 's)');
  } catch (e) {
    console.error('✖ step 1  token exchange        FAILED');
    console.error('   ' + e.message);
    if (e.hint)    console.error('   ' + e.hint);
    console.error('');
    console.error('   → This is the blocked step. Re-consent:  node scripts/gsc-oauth-login.cjs');
    console.error('     (or, if the browser can\'t reach localhost:3737:  --paste )');
    process.exit(2);
  }

  // ---- 2. property list ----
  let props = [];
  try {
    const res = await api('GET', '/webmasters/v3/sites', null, token);
    if (res.status !== 200) {
      console.error('✖ step 2  property list          HTTP ' + res.status + ' ' + String(res.raw).slice(0, 200));
      process.exit(1);
    }
    props = (res.json && res.json.siteEntry || []).map((s) => s.siteUrl);
    const match = props.find((p) => p === SITE) || props.find((p) => p.replace(/\/$/, '') === SITE.replace(/\/$/, ''));
    console.log('✅ step 2  property list          OK — ' + props.length + ' propert(y|ies) readable');
    if (match) console.log('   ✓ target property present: ' + match);
    else {
      console.error('   ✖ target property NOT in the list — the signed-in account cannot read ' + SITE);
      props.slice(0, 10).forEach((p) => console.error('     available: ' + p));
      process.exit(1);
    }
  } catch (e) {
    console.error('✖ step 2  property list          ERROR ' + e.message);
    process.exit(1);
  }

  // ---- 3. one-row data read ----
  try {
    const end = new Date(Date.now() - 24 * 3600 * 1000); // GSC lags ~1 day
    const start = new Date(end.getTime() - 6 * 24 * 3600 * 1000);
    const enc = encodeURIComponent(SITE);
    const res = await api('POST', '/webmasters/v3/sites/' + enc + '/searchAnalytics/query', {
      startDate: isoDay(start),
      endDate: isoDay(end),
      dimensions: ['date'],
      rowLimit: 25,
    }, token);
    if (res.status !== 200) {
      console.error('✖ step 3  searchAnalytics read   HTTP ' + res.status + ' ' + String(res.raw).slice(0, 200));
      process.exit(1);
    }
    const rows = (res.json && res.json.rows) || [];
    const clicks = rows.reduce((a, r) => a + (r.clicks || 0), 0);
    const impressions = rows.reduce((a, r) => a + (r.impressions || 0), 0);
    const newest = rows.map((r) => r.keys && r.keys[0]).filter(Boolean).sort().pop() || '(none)';
    console.log('✅ step 3  searchAnalytics read   OK — ' + rows.length + ' day(s) returned for ' +
      isoDay(start) + ' → ' + isoDay(end));
    console.log('   clicks ' + clicks + ' · impressions ' + impressions + ' · newest day with data: ' + newest);
    if (!rows.length) console.log('   (no rows — normal for a low-traffic week; access itself is fine)');
  } catch (e) {
    console.error('✖ step 3  searchAnalytics read   ERROR ' + e.message);
    process.exit(1);
  }

  console.log('');
  console.log('✅ ALL READ CHECKS PASSED — token, property and data access are live.');
  console.log('   Next: npm run seo:weekly (or seo:panel:daily) to refresh the artifacts.');
  process.exit(0);
})().catch((e) => {
  console.error('verifier crashed: ' + e.message);
  process.exit(1);
});
