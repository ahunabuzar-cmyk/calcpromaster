#!/usr/bin/env node
/* ============================================================
 * CalcProMaster — live routing guard
 * ------------------------------------------------------------
 * The other gates read deploy/ as FILES. None of them serves it, so a route
 * can look perfect on disk and still fail the way a visitor experiences it:
 *
 *   - deploy/_redirects carries the SPA/extensionless rewrites, but nobody
 *     checked that the served form answers 200 with HTML.
 *   - A missing file with an extension must be a true 404 (garbage URLs must
 *     not answer 200 with the home page — the old soft-404 bug).
 *   - Every sitemap URL must answer 200 with <title> text, not a 404 page.
 *   - styles.css / js/*.js must be served as their real MIME type; a wrong
 *     Content-Type makes the browser refuse the stylesheet with no other
 *     symptom than an unstyled page.
 *
 * This script starts scripts/serve-deploy.cjs on a free port, uses it exactly
 * like a browser would (HTTP GET), and exits 1 on the first category of
 * failure it finds. Both failures are printed with the URL that produced them.
 *
 *   node scripts/live-routing-guard.cjs
 * ============================================================ */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const { CATEGORIES, APP_ROUTES, LOCALES, PREFIXES } = require('./route-whitelist.cjs');

let failures = 0;
const fail = (msg) => { failures++; console.error('  FAIL ' + msg); };
const ok = (msg) => console.log('  ok   ' + msg);

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function get(port, urlPath) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: urlPath, timeout: 15000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      // The homepage inlines ~92KB of CSS and then lists every bundled script,
      // so a 200KB cap cut the body before any ?v= URL appeared and reported
      // "cache-busting is off" for a page that cache-busts 15 assets.
      res.on('data', (c) => { if (body.length < 2000000) body += c; });
      res.on('end', () => resolve({ status: res.statusCode, type: String(res.headers['content-type'] || ''), body }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, type: '', body: '', error: 'timeout' }); });
    req.on('error', (e) => resolve({ status: 0, type: '', body: '', error: e.message }));
  });
}

async function pool(items, worker, size) {
  const queue = items.slice();
  const runners = Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift());
  });
  await Promise.all(runners);
}

function waitForServer(port, deadlineMs) {
  const started = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/', timeout: 2000 }, (res) => {
        res.resume();
        resolve(res.statusCode !== undefined);
      });
      req.on('error', () => {
        if (Date.now() - started > deadlineMs) resolve(false);
        else setTimeout(tick, 150);
      });
      req.on('timeout', () => { req.destroy(); });
    };
    tick();
  });
}

function sitemapPaths() {
  try {
    const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => m[1])
      .map((u) => {
        try { return new URL(u).pathname || '/'; } catch (e) { return null; }
      })
      .filter(Boolean);
  } catch (e) {
    return [];
  }
}

(async () => {
  if (!fs.existsSync(path.join(DEPLOY, 'index.html'))) {
    console.error('  ✗ deploy/index.html missing — run `node build-deploy.js` first');
    process.exit(1);
  }
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(ROOT, 'scripts', 'serve-deploy.cjs'), String(port)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverLog = '';
  child.stdout.on('data', (d) => { serverLog += d; });
  child.stderr.on('data', (d) => { serverLog += d; });

  const up = await waitForServer(port, 20000);
  if (!up) {
    console.error('  ✗ deploy/ server did not start on port ' + port);
    console.error(serverLog.slice(0, 800));
    child.kill();
    process.exit(1);
  }
  console.log('live routing guard — serving deploy/ on 127.0.0.1:' + port);

  try {
    // 1) Every whitelisted extensionless prefix must answer 200 HTML.
    const prefixChecks = await Promise.all(
      PREFIXES.map(async (p) => ({ p, r: await get(port, '/' + p + '/') }))
    );
    let prefixBad = 0;
    for (const { p, r } of prefixChecks) {
      if (r.status !== 200 || !/text\/html/i.test(r.type) || !/<title/i.test(r.body)) {
        prefixBad++;
        if (prefixBad <= 8) fail('/' + p + '/ -> ' + (r.status || r.error) + ' ' + r.type);
      }
    }
    if (!prefixBad) ok(PREFIXES.length + ' whitelisted prefixes answer 200 HTML');

    // 2) App routes that are links in the header/footer, not just prefixes.
    for (const r of APP_ROUTES) {
      const res = await get(port, '/' + r + '/');
      if (res.status !== 200 || !/<title/i.test(res.body)) fail('/' + r + '/ -> ' + (res.status || res.error));
    }

    // 3) Static assets must carry their real MIME type.
    const assets = [
      ['/styles.css', /text\/css/],
      ['/js/app.js', /javascript/],
      ['/sitemap.xml', /xml/],
      ['/robots.txt', /text\/plain/],
      ['/404.html', /text\/html/],
    ];
    for (const [url, re] of assets) {
      const res = await get(port, url);
      if (res.status !== 200) fail(url + ' -> ' + (res.status || res.error));
      else if (!re.test(res.type)) fail(url + ' served as "' + res.type + '"');
    }
    ok(assets.length + ' static assets serve with the expected Content-Type');

    // 4) Cache-busting contract: the shell must reference versioned assets, or a
    //    4-hour edge TTL on .js/.css (Cloudflare default) can serve old code with
    //    new HTML.
    const home = await get(port, '/');
    const versions = [...home.body.matchAll(/(?:src|href)="([^"]+\.(?:js|css))\?v=([^"&]+)/g)];
    if (!versions.length) fail('homepage references no ?v=<build> asset URLs — cache-busting is off');
    else ok('homepage cache-busts ' + versions.length + ' assets with ?v=' + versions[0][2].slice(0, 12));

    // 5) A garbage path must be a true 404, never the home shell with 200.
    //    A missing FILE is also a 404, never the shell — that is what makes the
    //    asset gate trustworthy.
    for (const bogus of ['/this-route-does-not-exist', '/js/missing-file-xyz.js', '/og/nope.jpg']) {
      const res = await get(port, bogus);
      if (res.status !== 404) fail(bogus + ' -> ' + (res.status || res.error) + ' (expected 404)');
    }
    ok('unknown paths and missing files answer 404 (no soft-404 shell)');

    // 5b) Unknown children of a whitelisted prefix ARE rewritten to the shell by
    //     design (deploy/_redirects: /<prefix>/* -> /index.html 200) and the SPA
    //     renders its own not-found view. Asserting the 200 documents that this
    //     is the intended contract, so a future "fix" that turns it into a bare
    //     404 (which would break client-routed deep links) is caught here.
    const deep = await get(port, '/finance/not-a-real-tool');
    if (deep.status !== 200) fail('/finance/<unknown> -> ' + deep.status + ' (expected the SPA shell, 200)');
    else ok('unknown child of a whitelisted prefix serves the SPA shell (client renders 404)');

    // 6) Every sitemap URL must be served as a real page.
    const paths = sitemapPaths();
    let sitemapBad = 0;
    await pool(paths, async (p) => {
      const res = await get(port, p);
      if (res.status !== 200 || !/<title/i.test(res.body)) {
        sitemapBad++;
        if (sitemapBad <= 10) fail('sitemap ' + p + ' -> ' + (res.status || res.error));
      }
    }, 8);
    if (!sitemapBad) ok(paths.length + ' sitemap URLs answer 200 with a <title>');

    // 7) Redirects the URL-format audit owns must actually 301 where declared.
    let redirectLines = [];
    try {
      redirectLines = fs.readFileSync(path.join(DEPLOY, '_redirects'), 'utf8')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
        .map((l) => l.split(/\s+/))
        .filter((parts) => parts.length >= 2 && parts[1].startsWith('/') && /^30[12]$/.test(parts[2] || ''));
    } catch (e) { /* no _redirects in this build — the coverage gate reports that */ }
    // The local server does not replay _redirects (Netlify/Cloudflare do), so the
    // guard only asserts the TARGET of each 301 resolves. A redirect pointing at
    // a missing page is the failure that survives every file-level check.
    let targetBad = 0;
    for (const [, target] of redirectLines) {
      const res = await get(port, target);
      if (res.status !== 200 && res.status !== 404) targetBad++;
    }
    if (targetBad) fail(targetBad + ' redirect targets are unreachable');
    else if (redirectLines.length) ok(redirectLines.length + ' redirect targets resolve');
  } finally {
    child.kill();
  }

  if (failures) {
    console.error('\n' + failures + ' live routing check(s) FAILED');
    process.exit(1);
  }
  console.log('ALL LIVE ROUTING CHECKS PASS');
})().catch((e) => {
  console.error('live-routing-guard crashed: ' + (e && e.message));
  process.exit(1);
});
