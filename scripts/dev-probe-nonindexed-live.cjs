#!/usr/bin/env node
/* Live re-probe of every URL Google reports as not indexed.
 *
 * Why this exists: GSC's coverageState is a snapshot from the last crawl, which
 * for this site is often weeks old (the deploy changed on 22-24 Oct while the
 * crawl that produced the status predates it). Before "fixing" anything it has
 * to be checked against what the server answers *right now*.
 *
 * Reads  data/gsc-inspect-all-progress.json (URL Inspection results)
 * Writes data/nonindexed-live-probe.json
 *
 * Classification per URL:
 *   ok-indexable   live 200, robots index,follow, canonical points at itself
 *   canonical-differs / noindex / not-200 / soft-shell  -> a real defect
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const ROOT = path.join(__dirname, '..');
const PROGRESS = path.join(ROOT, 'data', 'gsc-inspect-all-progress.json');
const OUT = path.join(ROOT, 'data', 'nonindexed-live-probe.json');

function get(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; calcpromaster-audit/1.0)' }, timeout: 25000 }, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { if (buf.length < 400000) buf += c; });
      res.on('end', () => resolve({ status: res.statusCode, location: res.headers.location || null, headers: res.headers, body: buf }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
  });
}

const norm = (u) => u.replace(/\/+$/, '').replace(/\.html$/, '');

function analyse(url, res) {
  const out = { url, liveStatus: res.status, redirectTo: res.location || null };
  if (res.status !== 200) { out.kind = res.status >= 300 && res.status < 400 ? 'not-200-redirect' : 'not-200'; return out; }
  const head = res.body.slice(0, res.body.indexOf('</head>') + 7);
  const robots = (head.match(/<meta[^>]+name=["']robots["'][^>]*>/i) || [''])[0];
  const canonTag = (head.match(/<link[^>]+rel=["']canonical["'][^>]*>/i) || [''])[0];
  const canonical = (canonTag.match(/href=["']([^"']+)/i) || [, ''])[1];
  const title = (res.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1].trim();
  const h1 = (res.body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [, ''])[1].replace(/<[^>]+>/g, '').trim();
  const text = res.body.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  const xRobots = String(res.headers['x-robots-tag'] || '');

  out.title = title;
  out.h1 = h1;
  out.words = words;
  out.robotsMeta = robots;
  out.xRobotsTag = xRobots || null;
  out.canonical = canonical || null;

  const noindex = /noindex/i.test(robots) || /noindex/i.test(xRobots);
  const canonOff = canonical ? norm(canonical) !== norm(url) : true;

  if (noindex) out.kind = 'noindex-live';
  else if (canonOff) out.kind = 'canonical-differs';
  else if (!title || words < 200) out.kind = 'thin-or-empty';
  else out.kind = 'ok-indexable';
  return out;
}

(async () => {
  const prog = JSON.parse(fs.readFileSync(PROGRESS, 'utf8'));
  const targets = Object.values(prog).filter((r) => r.coverage !== 'indexed');
  console.log('non-indexed URLs to re-probe:', targets.length);

  const results = [];
  let i = 0;
  const conc = 16;
  async function worker() {
    while (true) {
      const my = i++;
      if (my >= targets.length) return;
      const t = targets[my];
      const res = await get(t.inspectedUrl);
      const row = analyse(t.inspectedUrl, res);
      row.gscState = t.coverageState;
      row.gscVerdict = t.verdict;
      results.push(row);
      if (results.length % 100 === 0) console.log('  ' + results.length + '/' + targets.length);
    }
  }
  await Promise.all(Array.from({ length: conc }, worker));

  const byKind = {};
  for (const r of results) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
  console.log('\n=== live probe verdict ===');
  console.log(byKind);

  console.log('\n=== GSC state x live verdict ===');
  const cross = {};
  for (const r of results) {
    const k = r.gscState + '  ||  ' + r.kind;
    cross[k] = (cross[k] || 0) + 1;
  }
  Object.entries(cross).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(String(v).padStart(5), k));

  fs.writeFileSync(OUT, JSON.stringify({ ranAt: new Date().toISOString(), count: results.length, byKind, cross, results }, null, 1));
  console.log('\nwrote', OUT);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
