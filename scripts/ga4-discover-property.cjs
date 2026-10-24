#!/usr/bin/env node
// ============================================================
// CalcProMaster — GA4 property discovery (Admin API, read-only)
// ------------------------------------------------------------
// scripts/ga4-events.cjs needs the NUMERIC GA4 property id
// (`GA4_PROPERTY_ID`), which is not the G-XXXX measurement id and is not
// committed anywhere. Typing it by hand is the last manual step in the GA4
// setup. The OAuth token this repo already refreshes carries
// `analytics.readonly`, and that scope can read the Admin API, so the id can
// be discovered instead of remembered.
//
// Prints the measurement id → numeric property id mapping for every GA4
// property the signed-in Google account can read, then the exact command to
// run. Read-only: it never creates, edits or deletes anything.
//
// Usage: node scripts/ga4-discover-property.cjs [--json]
// Exit: 0 = at least one property listed · 2 = none / not authorized
// ============================================================
'use strict';
const https = require('https');
const { getAccessToken } = require('./lib/google-oauth.cjs');

const JSON_OUT = process.argv.includes('--json');
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

// Google returns 403 SERVICE_DISABLED when the API was never enabled on the
// Cloud project, and its message already contains the exact activation URL.
// That is an owner action, not a credential bug, so it is surfaced verbatim
// instead of being collapsed into a generic "HTTP 403".
function apiGet(path, token) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: 'analyticsadmin.googleapis.com', path, method: 'GET', timeout: 30000,
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          let j = null;
          try { j = JSON.parse(data); } catch (e) { /* keep raw */ }
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve(j || {});
          const e = (j && j.error) || {};
          const reason = ((e.details || []).find((d) => d && d.reason) || {}).reason;
          const err = new Error('HTTP ' + res.statusCode + ' — ' + (e.message || String(data).slice(0, 200)));
          err.status = res.statusCode;
          err.reason = reason || null;
          reject(err);
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}

function isDisabled(api, project) {
  return 'https://console.developers.google.com/apis/api/' + api + '/overview' + (project ? '?project=' + project : '');
}

async function main() {
  let token;
  // getAccessToken resolves to the token RESPONSE ({ access_token, expires_in }),
  // not the bearer string — passing the object on makes Google answer 401
  // "invalid authentication credentials", which reads like a dead token.
  try { token = (await getAccessToken(SCOPE)).access_token; }
  catch (e) {
    console.error('✖ token: ' + (e.message || e));
    console.error('  run: npm run gsc:login  (the GA4 scope is requested with the GSC scopes)');
    process.exit(2);
  }

  let accounts = [];
  try {
    accounts = (await apiGet('/v1beta/accounts?pageSize=200', token)).accounts || [];
  } catch (e) {
    const project = /project (\d+)/.exec(e.message || '');
    if (e.reason === 'SERVICE_DISABLED') {
      console.error('✖ Google Analytics Admin API is DISABLED on Cloud project ' + (project ? project[1] : '(unknown)') + ' — blocked, not a credential bug.');
      console.error('  The token is valid and already carries analytics.readonly; the API itself was');
      console.error('  never turned on for the OAuth project. Owner action (2 clicks, no billing):');
      console.error('    ' + isDisabled('analyticsadmin.googleapis.com', project ? project[1] : ''));
      console.error('  Enable both Analytics APIs while you are there: Admin (property discovery) + Data');
      console.error('    ' + isDisabled('analyticsdata.googleapis.com', project ? project[1] : ''));
      console.error('  then re-run this script (allow ~2 min for propagation).');
    } else {
      console.error('✖ Admin API accounts: ' + (e.message || e));
      console.error('  Fix: the signed-in account needs at least Viewer on the GA4 property.');
    }
    process.exit(2);
  }

  const rows = [];
  for (const a of accounts) {
    if (!a.name) continue;
    let props = [];
    try { props = (await apiGet('/v1beta/' + a.name + '/properties?pageSize=200', token)).properties || []; }
    catch (e) { if (!JSON_OUT) console.error('  ! ' + a.name + ': ' + (e.message || e)); }
    for (const p of props) {
      if (p.propertyType && p.propertyType !== 'PROPERTY_TYPE_ORDINARY') continue;
      rows.push({
        account: a.displayName || a.name,
        property: p.name,                                  // "properties/123456789"
        propertyId: String(p.name || '').replace(/^properties\//, ''),
        displayName: p.displayName || '(untitled)',
        measurementId: (p.name && '') || ''
      });
    }
  }

  // A second, cheaper source for the G-XXXX mapping: the data streams endpoint.
  for (const r of rows) {
    try {
      const streams = (await apiGet('/v1beta/' + r.property + '/dataStreams?pageSize=50', token)).dataStreams || [];
      const web = streams.find((s) => s.type === 'WEB_DATA_STREAM' && s.webStreamData);
      if (web) r.measurementId = web.webStreamData.measurementId || '';
    } catch (e) { /* stream read is best-effort */ }
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ rows }, null, 2));
    return;
  }


  console.log('==========================================');
  console.log(' GA4 PROPERTY DISCOVERY (Admin API, read-only)');
  console.log('==========================================');
  if (!rows.length) {
    console.log('no GA4 property readable by this Google account.');
    console.log('The measurement id already wired in the site is G-8QCP0TP1TD — create the');
    console.log('property (docs/ga4-setup-guide.md) if it does not exist yet, then re-run this.');
    process.exit(2);
  }
  console.log('');
  for (const r of rows) {
    console.log('  ' + (r.measurementId || '(no web stream)') + '  →  property ' + r.propertyId + '   ' + r.displayName + '   [' + r.account + ']');
  }
  const site = rows.find((r) => r.measurementId === 'G-8QCP0TP1TD') || rows[0];
  console.log('');
  console.log('Site measurement id G-8QCP0TP1TD → numeric property ' + site.propertyId);
  console.log('');
  console.log('next: GA4_PROPERTY_ID=' + site.propertyId + ' node scripts/ga4-events.cjs --days 28');
}

main().catch((e) => { console.error('FAIL', e.stack || e.message); process.exit(1); });
