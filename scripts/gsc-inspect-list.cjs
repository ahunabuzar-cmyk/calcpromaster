#!/usr/bin/env node
// ============================================================
// CalcProMaster — Inspect an explicit URL list (resumable)
// ------------------------------------------------------------
// gsc-batch-inspect.cjs sitemap se URLs chunta hai; ye script ek EXPLICIT
// list leti hai (default: data/not-indexed-audit.json ke saare not-indexed
// pages) aur URL Inspection API se unka CURRENT index status nikal ti hai.
//
// Resumable: --out file mein pehle se jo URLs inspected hain, unhe skip karta
// hai. Is liye quota (2000/din) ke andar chunks mein chala sakte ho:
//   node scripts/gsc-inspect-list.cjs --limit 300
//   node scripts/gsc-inspect-list.cjs --limit 300      # agla chunk
//
// Usage:
//   node scripts/gsc-inspect-list.cjs [--from data/not-indexed-audit.json]
//                                     [--out  data/gsc-inspect-notindexed.json]
//                                     [--limit N] [--fresh]
// --fresh: output file ko ignore karke sab dobara inspect karo.
// ============================================================
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');
const { getAccessToken } = require('./lib/google-oauth.cjs');

const ROOT = path.join(__dirname, '..');
const API = 'searchconsole.googleapis.com';

// Site URL from site-config (single source of truth), overridable via env.
let SITE_URL = (process.env.GSC_SITE_URL || '').replace(/[\\/]+$/, '');
if (!SITE_URL) {
  try {
    const cfg = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
    const m = cfg.match(/domain:\s*'([^']+)'/);
    if (m && m[1]) SITE_URL = 'https://' + m[1].replace(/^https?:\/\//, '');
  } catch (e) { /* fall through */ }
}
if (!SITE_URL) SITE_URL = 'https://calcpromaster.com';

const argVal = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const FROM = argVal('--from', path.join('data', 'not-indexed-audit.json'));
const OUT = argVal('--out', path.join('data', 'gsc-inspect-notindexed.json'));
const LIMIT = (() => { const i = process.argv.indexOf('--limit'); const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : 0; return Number.isFinite(v) && v > 0 ? v : 0; })();
const FRESH = process.argv.includes('--fresh');

function toUrl(u) { return /^https?:\/\//.test(u) ? u : SITE_URL + (u.startsWith('/') ? u : '/' + u); }

function req(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: API, path: urlPath, method,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => { try { resolve({ status: res.statusCode, json: data ? JSON.parse(data) : null }); } catch (e) { resolve({ status: res.statusCode, json: null, raw: data.slice(0, 400) }); } });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // ---- load target list ----
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, FROM), 'utf8'));
  let urls = Array.isArray(src) ? src : (src.results || []).map((r) => r.url);
  urls = [...new Set(urls.map(toUrl))];
  if (!urls.length) { console.error('no URLs in ' + FROM); process.exit(1); }

  // ---- resume state ----
  const outPath = path.join(ROOT, OUT);
  let prior = { ranAt: null, site: SITE_URL, results: [] };
  if (!FRESH && fs.existsSync(outPath)) { try { prior = JSON.parse(fs.readFileSync(outPath, 'utf8')); } catch (e) { /* ignore */ } }
  const done = new Map((prior.results || []).map((r) => [r.url, r]));
  const todo = urls.filter((u) => !done.has(u));
  const batch = LIMIT ? todo.slice(0, LIMIT) : todo;

  console.log('🔍 Inspect-list — ' + SITE_URL);
  console.log('   targets: ' + urls.length + '  ·  already done: ' + done.size + '  ·  this run: ' + batch.length + (todo.length > batch.length ? ' (baaki ' + (todo.length - batch.length) + ' next run)' : ''));
  if (!batch.length) { console.log('✅ Sab ho chuka hai. Naya list ke liye --fresh ya naya --from do.'); return; }

  const token = (await getAccessToken('https://www.googleapis.com/auth/webmasters')).access_token;

  const save = () => {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const merged = [...done.values()];
    fs.writeFileSync(outPath, JSON.stringify({
      ranAt: new Date().toISOString(), site: SITE_URL, source: FROM, total: urls.length, count: merged.length, results: merged,
    }, null, 2));
  };

  let quotaHit = false;
  for (let i = 0; i < batch.length; i++) {
    const u = batch[i];
    const r = await req('POST', '/v1/urlInspection/index:inspect',
      { inspectionUrl: u, siteUrl: SITE_URL + '/', languageCode: 'en' }, token);
    let verdict = 'API_ERROR', coverage = '—';
    if (r.status === 200 && r.json && r.json.inspectionResult) {
      const idx = r.json.inspectionResult.indexStatusResult || {};
      coverage = idx.coverageState || 'UNKNOWN';
      verdict = idx.verdict || 'NEUTRAL';
    } else if (r.status === 429) {
      console.error('  ⚠ quota (429) at ' + i + ' — saving + stopping; kal resume karo.');
      quotaHit = true;
      break;
    } else {
      verdict = 'HTTP_' + r.status;
    }
    done.set(u, { url: u, verdict, coverage });
    if (verdict !== 'PASS') console.log('  ! ' + u.replace(SITE_URL, '') + ' → ' + coverage);
    if ((i + 1) % 10 === 0) { save(); console.log('   … ' + (i + 1) + '/' + batch.length); }
    await wait(250);
  }
  save();

  // ---- tally (over ALL done) ----
  const tally = {};
  for (const r of done.values()) tally[r.coverage] = (tally[r.coverage] || 0) + 1;
  const indexed = tally['Submitted and indexed'] || 0;
  console.log('\n=== Coverage tally (inspected ' + done.size + '/' + urls.length + ') ===');
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log('  ' + String(v).padStart(5) + '  ' + k);
  console.log('\nIndexed: ' + indexed + '/' + done.size + ' (' + Math.round(100 * indexed / done.size) + '%)');
  console.log('💾 ' + OUT + (quotaHit ? '  (partial — resume later)' : ''));
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
