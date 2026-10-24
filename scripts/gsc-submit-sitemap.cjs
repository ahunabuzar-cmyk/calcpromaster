#!/usr/bin/env node
/* ============================================================
 * CalcProMaster — Search Console sitemap submitter (WRITE, one call)
 * ------------------------------------------------------------
 * Every other gsc-*.cjs script only READS. That left one real gap: after a
 * deploy, nobody told Google the sitemap had changed — the file was live but
 * the lastSubmitted timestamp stayed on the previous build. Sitemap
 * submission does not force indexing (Google decides that), but it does
 * re-queue a fetch, which is the only lever the API actually gives you.
 *
 * What it does
 *   1. resolves the property from js/site-config.js (`domain:`)
 *   2. PUT /webmasters/v3/sites/{site}/sitemaps/{sitemap}
 *   3. GET  the same URL and prints lastSubmitted / lastDownloaded / errors
 *
 * Honesty note: this script never claims a crawl. lastDownloaded is Google's
 * timestamp, not ours — if it is older than the deploy, the sitemap has not
 * been re-read yet, and the output says exactly that.
 *
 * Usage:
 *   node scripts/gsc-submit-sitemap.cjs --dry-run
 *   node scripts/gsc-submit-sitemap.cjs
 *   node scripts/gsc-submit-sitemap.cjs --sitemap https://example.com/sitemap.xml
 *
 * Exit: 0 = submit + verify OK · 1 = API/token failure
 * ============================================================ */
'use strict';
const fs = require('fs');
const https = require('https');
const path = require('path');
const { getAccessToken } = require('./lib/google-oauth.cjs');

const ROOT = path.join(__dirname, '..');
const SCOPE = 'https://www.googleapis.com/auth/webmasters';
const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const smIdx = argv.indexOf('--sitemap');
const siteIdx = argv.indexOf('--site');

function siteConfigDomain() {
  try {
    const cfg = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
    const m = cfg.match(/domain:\s*'([^']+)'/);
    if (m && m[1]) return m[1].replace(/^https?:\/\//, '').replace(/\/$/, '');
  } catch (e) { /* fall through */ }
  return 'calcpromaster.com';
}

const DOMAIN = siteConfigDomain();
const SITE = siteIdx >= 0 && argv[siteIdx + 1] ? argv[siteIdx + 1] : 'https://' + DOMAIN + '/';
const SITEMAP = smIdx >= 0 && argv[smIdx + 1] ? argv[smIdx + 1] : 'https://' + DOMAIN + '/sitemap.xml';

function api(method, pathName, token) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.googleapis.com',
      path: pathName,
      method,
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json',
        'Content-Length': 0,
      },
      timeout: 20000,
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let json = null;
        try { json = data ? JSON.parse(data) : null; } catch (e) { /* non-JSON */ }
        resolve({ status: res.statusCode, json, raw: data });
      });
    });
    req.on('timeout', () => req.destroy(new Error('request timeout')));
    req.on('error', reject);
    req.end();
  });
}

function fmt(iso) {
  if (!iso) return '—';
  return String(iso).slice(0, 10) + ' ' + String(iso).slice(11, 16) + 'Z';
}

function ageHours(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!isFinite(t)) return null;
  return Math.round((Date.now() - t) / 36e5 * 10) / 10;
}

(async function main() {
  console.log('==========================================');
  console.log(' GSC SITEMAP SUBMIT — ' + SITE);
  console.log(' sitemap: ' + SITEMAP + (DRY ? '   [DRY RUN]' : ''));
  console.log('==========================================');
  const sitePath = encodeURIComponent(SITE);
  const smPath = encodeURIComponent(SITEMAP);

  if (DRY) {
    console.log('PUT  /webmasters/v3/sites/' + sitePath + '/sitemaps/' + smPath);
    console.log('(dry run — nothing sent)');
    return;
  }

  let token;
  try {
    token = (await getAccessToken(SCOPE)).access_token;
    console.log('✅ token exchange      OK');
  } catch (e) {
    console.error('❌ token exchange failed: ' + e.message);
    if (e.hint) console.error(e.hint);
    process.exit(1);
  }

  const put = await api('PUT', '/webmasters/v3/sites/' + sitePath + '/sitemaps/' + smPath, token);
  if (put.status >= 200 && put.status < 300) {
    console.log('✅ sitemap submitted  HTTP ' + put.status);
  } else {
    console.error('❌ submit failed      HTTP ' + put.status + ' ' + String(put.raw).slice(0, 300));
    process.exit(1);
  }

  const get = await api('GET', '/webmasters/v3/sites/' + sitePath + '/sitemaps/' + smPath, token);
  if (get.status !== 200 || !get.json) {
    console.error('❌ verify failed      HTTP ' + get.status + ' ' + String(get.raw).slice(0, 300));
    process.exit(1);
  }
  const s = get.json;
  console.log('✅ sitemap visible    contents: ' + (s.type || '—'));
  console.log('   lastSubmitted      ' + fmt(s.lastSubmitted));
  console.log('   lastDownloaded     ' + fmt(s.lastDownloaded));
  if (Array.isArray(s.errors) && s.errors.length) {
    console.log('   errors             ' + s.errors.length);
    s.errors.slice(0, 5).forEach((e) => console.log('     · ' + (e.message || e)));
  } else {
    console.log('   errors             none');
  }
  if (Array.isArray(s.warnings) && s.warnings.length) {
    console.log('   warnings           ' + s.warnings.length);
    s.warnings.slice(0, 5).forEach((w) => console.log('     · ' + (w.message || w)));
  }
  if (Number(s.contents && s.contents[0] && s.contents[0].submitted) > 0) {
    console.log('   URLs in sitemap    ' + Number(s.contents[0].submitted).toLocaleString('en-US'));
  }

  const dl = ageHours(s.lastDownloaded);
  console.log('');
  if (dl === null) {
    console.log('⏳ Google has not downloaded this sitemap yet — the submit re-queued it.');
  } else if (dl > 48) {
    console.log('⏳ Last Google fetch was ' + dl + 'h ago. A submit only re-queues a fetch;');
    console.log('   it does not force a crawl or an index. Re-run this after the next deploy.');
  } else {
    console.log('✅ Google fetched this sitemap ' + dl + 'h ago.');
  }
})().catch((e) => {
  console.error('❌ ' + e.message);
  process.exit(1);
});
