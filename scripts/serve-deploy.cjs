#!/usr/bin/env node
/* ============================================================
 * CalcProMaster — local static server for the BUILT deploy/ folder
 * ------------------------------------------------------------
 * `server.js` serves the SOURCE tree (unbuilt pages, no build injections).
 * This serves what actually ships, so the injected site-extras script, the
 * rewritten canonicals and the prerendered SSG pages can be checked locally.
 *
 * Mirrors the two behaviours that matter for that check:
 *   /guides/tip            → guides/tip.html
 *   /finance/loan-emi/     → finance/loan-emi/index.html
 *
 * Usage: node scripts/serve-deploy.cjs [port]
 * ============================================================ */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'deploy');
const PORT = Number(process.argv[2] || process.env.PORT || 8123);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

function safeJoin(base, urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const p = path.normalize(path.join(base, clean));
  return p.startsWith(base) ? p : null;
}

function resolveFile(base, urlPath) {
  const direct = safeJoin(base, urlPath);
  if (!direct) return null;
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
  if (fs.existsSync(direct) && fs.statSync(direct).isDirectory()) {
    const idx = path.join(direct, 'index.html');
    if (fs.existsSync(idx)) return idx;
  }
  if (fs.existsSync(direct + '.html')) return direct + '.html';
  const withIndex = path.join(direct, 'index.html');
  if (fs.existsSync(withIndex)) return withIndex;
  return null;
}

// Extensionless routes the HOST rewrites to the SPA shell (deploy/_redirects,
// generated from scripts/route-whitelist.cjs). Without this the preview 404s on
// /history/, /es/, /hi/ ... while production answers 200 — the local preview had
// to be trusted for those, which is the one thing a preview must not require.
// Unknown paths still get a true 404, so the soft-404 guard stays meaningful.
let PREFIXES = [];
try { ({ PREFIXES } = require('./route-whitelist.cjs')); } catch (e) { PREFIXES = []; }
const PREFIX_SET = new Set(PREFIXES);
function spaShell(urlPath) {
  const clean = decodeURIComponent(String(urlPath || '/').split('?')[0].split('#')[0]);
  const first = clean.split('/').filter(Boolean)[0];
  if (!first) return path.join(ROOT, 'index.html');
  if (!PREFIX_SET.has(first)) return null;
  const shell = path.join(ROOT, 'index.html');
  return fs.existsSync(shell) ? shell : null;
}

const server = http.createServer((req, res) => {
  let file = resolveFile(ROOT, req.url || '/');
  if (!file && !path.extname(String(req.url || '').split('?')[0])) {
    file = spaShell(req.url || '/');
  }
  if (!file) {
    const notFound = path.join(ROOT, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'Not found');
    return;
  }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('deploy/ preview: http://127.0.0.1:' + PORT + '/  (root: ' + ROOT + ')');
});
