#!/usr/bin/env node
/* GSC URL Inspection — ALL sitemap URLs, parallel + resumable.
 *
 * Usage:
 *   node scripts/gsc-inspect-all.cjs                # inspect whatever is missing (resume)
 *   node scripts/gsc-inspect-all.cjs --concurrency 6
 *   node scripts/gsc-inspect-all.cjs --fresh        # re-inspect everything (ignore cached)
 *
 * Design:
 *   - Streams sitemap.xml for the URL list (same priority order as gsc-batch-inspect).
 *   - Adaptive concurrency: starts at 6, backs off to 1 on 429/5xx, ramps back up.
 *   - Progress written to data/gsc-inspect-all-progress.json after EVERY result
 *     (crash-safe resume; --fresh ignores it).
 *   - Merges into data/gsc-inspect-batch.json (same shape as the batch script).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'gsc-inspect-batch.json');
const PROGRESS = path.join(ROOT, 'data', 'gsc-inspect-all-progress.json');

let access;
try { access = require(path.join(ROOT, 'scripts', 'lib', 'google-oauth.cjs')); }
catch (e) { console.error('No google-oauth helper found:', e.message); process.exit(1); }  async function pick() {
    for (let a = 1; a <= 4; a++) {
      try { return (await access.getAccessToken('https://www.googleapis.com/auth/webmasters.readonly')).access_token; }
      catch (e) { if (a === 4) throw e; console.log('  token refresh failed (' + e.message.slice(0, 60) + ') — retry ' + a + '/3'); await wait(5000 * a); }
    }
  }

function post(body, accessToken) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'searchconsole.googleapis.com', path: '/v1/urlInspection/index:inspect', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), Authorization: 'Bearer ' + accessToken },
      timeout: 30000,
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

function streamSitemap() {
  return new Promise((resolve, reject) => {
    https.get('https://calcpromaster.netlify.app/sitemap.xml', (res) => {
      if (res.statusCode !== 200) return reject(new Error('sitemap HTTP ' + res.statusCode));
      let buf = ''; res.setEncoding('utf8');
      res.on('data', (c) => (buf += c));
      res.on('end', () => resolve([...buf.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])));
    }).on('error', reject);
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const argv = process.argv;
  const has = (f) => argv.includes(f);
  const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? parseInt(argv[i + 1], 10) || d : d; };
  const fresh = has('--fresh');
  let conc = val('--concurrency', 6);

  const siteUrl = 'https://calcpromaster.netlify.app/'; // NOTE: trailing slash REQUIRED (GSC property id form)
  const urls = await streamSitemap();
  console.log('sitemap URLs:', urls.length);

  // Existing results (merged batches) + per-run progress
  let merged = {};
  try { for (const r of JSON.parse(fs.readFileSync(OUT, 'utf8')).results || []) merged[r.inspectedUrl || r.url] = r; } catch { /* first run */ }
  let prog = {};
  if (!fresh) { try { prog = JSON.parse(fs.readFileSync(PROGRESS, 'utf8')); } catch { /* new */ } }

  const todo = urls.filter((u) => fresh || (!prog[u] && !merged[u]));
  console.log('already have:', urls.length - todo.length, '| todo:', todo.length);
  if (!todo.length) { console.log('Nothing to do.'); return; }

  const saveProgress = () => { try { fs.writeFileSync(PROGRESS, JSON.stringify(prog)); } catch { /* best effort */ } };
  const saveMerged = () => {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
      prev.results = [...(prev.results || []), ...Object.values(prog)];
      prev.generatedAt = new Date().toISOString();
      fs.writeFileSync(OUT, JSON.stringify(prev, null, 1));
    } catch {
      fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), results: Object.values(prog) }, null, 1));
    }
  };

  // Live status counters
  const counts = { indexed: 0, unknown: 0, discovered: 0, crawled: 0, error: 0, other: 0 };
  for (const r of [...Object.values(prog), ...Object.values(merged)]) {
    const c = r.coverage;
    if (c === 'indexed') counts.indexed++;
    else if (c === 'unknown') counts.unknown++;
    else if (c === 'discovered') counts.discovered++;
    else if (c === 'crawled') counts.crawled++;
    else if (c === 'error') counts.error++;
    else counts.other++;
  }

  let idx = 0, done = 0, backoff = 0, active = conc;
  const t0 = Date.now();

  async function worker() {
    while (true) {
      const my = idx++;
      if (my >= todo.length) return;
      const url = todo[my];
      if (prog[url]) { done++; continue; }

      const token = await pick();
      let res = await post({ siteUrl, inspectionUrl: url, languageCode: 'en-US' }, token);
      if (res.status === 401 || res.status === 403) {
        await wait(1500);
        const token2 = await pick(); // helper refreshes cache
        res = await post({ siteUrl, inspectionUrl: url, languageCode: 'en-US' }, token2);
      }

      if (res.status === 429 || res.status === 0 || (res.status >= 500 && res.status < 600)) {
        backoff = Math.min(backoff + 1, 4);
        active = Math.max(1, active - 1);
        idx--; // retry this URL later
        await wait(2000 * Math.pow(2, backoff) + Math.random() * 1000);
        continue;
      }
      backoff = 0;
      if (active < conc && Math.random() < 0.25) active++;

      const insp = res.json && res.json.inspectionResult;
      const idxRes = insp && insp.indexStatusResult;
      let cov = 'unknown';
      if (res.status === 200 && idxRes) {
        const verdict = idxRes.verdict; // PASS / NEUTRAL / FAIL
        const state = idxRes.coverageState || '';
        if (verdict === 'PASS' && /Submitted and indexed/i.test(state)) cov = 'indexed';
        else if (/Discovered/i.test(state)) cov = 'discovered';
        else if (/Crawled/i.test(state)) cov = 'crawled';
        else if (verdict === 'FAIL') cov = 'error';
        else cov = 'unknown';
      } else if (res.status !== 200) cov = 'error';
      prog[url] = {
        inspectedUrl: url, coverage: cov,
        verdict: idxRes ? idxRes.verdict : 'HTTP_' + res.status,
        coverageState: idxRes ? idxRes.coverageState : null,
        indexingState: idxRes ? idxRes.indexingState : null,
        fetchedAt: new Date().toISOString(),
      };
      counts[cov]++;
      done++;
      if (done % 25 === 0) {
        saveProgress();
        const rate = done / ((Date.now() - t0) / 60000);
        console.log(`[${done}/${todo.length}] indexed=${counts.indexed} discovered=${counts.discovered} crawled=${counts.crawled} unknown=${counts.unknown} error=${counts.error} | ${rate.toFixed(1)}/min | conc=${active}`);
      }
      await wait(120 + Math.random() * 180); // polite spacing within quota
    }
  }

  const workers = [];
  for (let i = 0; i < conc; i++) workers.push(worker());
  await Promise.all(workers);
  saveProgress(); saveMerged();

  const total = Object.values(prog).length + Object.values(merged).length;
  console.log('\n=== FINAL ===');
  console.log('This run:', JSON.stringify(counts));
  console.log('Progress file:', PROGRESS, '(merged summary written to', OUT + ')');
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
