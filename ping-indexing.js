#!/usr/bin/env node
// ====== CalcProMaster Google Indexing API Pinger ======
// Reads sitemap.xml and pings Google's Indexing API so new/updated tool pages are
// crawled within hours instead of days. Zero dependencies — uses Node's built-in
// crypto (RS256 JWT) + global fetch (Node 18+).
//
// Setup (one-time):
//   1. Google Cloud Console → enable "Indexing API"
//   2. Create a Service Account → download its JSON key
//   3. In Search Console, add that service account email as an "Owner" of the property
//
// Usage:
//   GOOGLE_SA_JSON=/path/to/service-account.json node ping-indexing.js
//   GOOGLE_SA_JSON=... node ping-indexing.js --limit 200     # quota-safe (200/day default)
//   GOOGLE_SA_JSON=... node ping-indexing.js --new-only      # skip URLs already indexed (from a local cache file)
//
// Note: Indexing API quota is ~200 URLs/day — use --limit to stay under it.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SITEMAP = path.join(__dirname, 'sitemap.xml');
const SA_JSON = process.env.GOOGLE_SA_JSON;
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const INDEXING_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const SCOPE = 'https://www.googleapis.com/auth/indexing';

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signJwt(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(header + '.' + claims);
  const sig = b64url(signer.sign(sa.private_key));
  return header + '.' + claims + '.' + sig;
}

async function getAccessToken(sa) {
  const jwt = signJwt(sa);
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + encodeURIComponent(jwt)
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Token error: ' + JSON.stringify(data));
  return data.access_token;
}

function readSitemapUrls() {
  const xml = fs.readFileSync(SITEMAP, 'utf8');
  const urls = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) urls.push(m[1]);
  return urls;
}

async function pingUrl(token, url) {
  const res = await fetch(INDEXING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ url: url, type: 'URL_UPDATED' })
  });
  const body = await res.text();
  return { status: res.status, body: body };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!SA_JSON) {
    if (dryRun) {
      console.log('(no GOOGLE_SA_JSON set — dry-run needs no credentials)');
    } else {
      console.error('Missing credentials. Set GOOGLE_SA_JSON to your service-account JSON path.');
      console.error('  GOOGLE_SA_JSON=/path/to/service-account.json node ping-indexing.js');
      console.error('  (Add --dry-run to preview which URLs would be pinged, no credentials needed.)');
      process.exit(1);
    }
  }
  const sa = SA_JSON ? JSON.parse(fs.readFileSync(SA_JSON, 'utf8')) : null;
  const urls = readSitemapUrls();
  const limitArg = process.argv.indexOf('--limit');
  const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : Math.min(urls.length, 200);
  const newOnly = process.argv.includes('--new-only');

  const cacheFile = path.join(__dirname, '.indexed-cache.json');
  const done = newOnly && fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : [];

  const batch = urls.filter(u => !done.includes(u)).slice(0, limit);

  if (dryRun) {
    console.log('[dry-run] would ping ' + batch.length + ' URLs (quota-safe limit ' + limit + '):');
    batch.forEach(u => console.log('  ' + u));
    return;
  }

  const token = await getAccessToken(sa);
  let ok = 0, fail = 0;

  console.log('Pinging ' + batch.length + ' URLs (quota-safe limit ' + limit + ')...');
  for (const url of batch) {
    try {
      const r = await pingUrl(token, url);
      if (r.status === 200) { ok++; done.push(url); console.log('  ✓ ' + url); }
      else { fail++; console.log('  ✗ ' + url + ' → ' + r.status + ' ' + r.body.slice(0, 140)); }
    } catch (e) {
      fail++;
      console.log('  ✗ ' + url + ' → ' + e.message);
    }
    await new Promise(res => setTimeout(res, 500)); // polite rate limiting
  }

  if (newOnly) fs.writeFileSync(cacheFile, JSON.stringify(done, null, 2));
  console.log('\nDone: ' + ok + ' submitted, ' + fail + ' failed. (Submit sitemap in Search Console too.)');
}

main().catch(e => { console.error(e); process.exit(1); });
