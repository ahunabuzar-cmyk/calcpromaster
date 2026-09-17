// Simple static file server for CalcPro
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// PORT/ROOT are env-overridable so the same server can serve the built deploy/ artifact
// (scripts/serve-deploy.cjs launches it as PORT=3100 ROOT=deploy).
const PORT = process.env.PORT || 3000;
const ROOT = process.env.ROOT ? path.resolve(__dirname, process.env.ROOT) : __dirname;

// Route whitelist — mirror of deploy/_redirects (single source of truth:
// scripts/route-whitelist.cjs, checked by scripts/check-sitemap-coverage.cjs).
// Only whitelisted extensionless prefixes fall through to the SPA shell
// (index.html); every OTHER extensionless path is a TRUE 404 — same behavior
// as the Netlify _redirects catch-all '/* /404.html 404'. This kills the
// soft-404 (garbage URL serving home with 200) that the E2E deploy-smoke
// "missing assets true 404" test guards against.
let SPA_PREFIXES = [];
try {
  ({ PREFIXES: SPA_PREFIXES } = require('./scripts/route-whitelist.cjs'));
} catch (e) { SPA_PREFIXES = []; }
const SPA_PREFIX_SET = new Set(SPA_PREFIXES);

// gzip compressible text types — keeps the 1.3MB SEO bundle light (~150KB over the wire)
const COMPRESSIBLE = ['.js', '.css', '.html', '.json', '.svg', '.xml', '.txt', '.webmanifest'];
const GZIP_THRESHOLD = 1024; // only bother compressing files > 1KB

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.xml': 'text/xml',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json'
};

const CACHE_MAX_AGE = {
  '.html': 3600,
  '.js': 604800,
  '.css': 604800,
  '.json': 2592000,
  '.svg': 2592000,
  '.png': 2592000,
  '.jpg': 2592000,
  '.jpeg': 2592000,
  '.webp': 2592000,
  '.gif': 2592000,
  '.ico': 2592000,
  '.xml': 86400,
  '.txt': 86400,
  '.webmanifest': 86400
};

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  
  // History API SPA fallback: only extensionless paths (clean URLs like /finance/loan-emi)
  // get rewritten to index.html. Known asset requests (.js/.css/.png) keep their path so
  // a MISSING asset returns a true 404 (soft-404 fix) instead of an HTML page with 200.
  // Whitelist-based: any other extension (or none) is treated as an SPA route — so a future
  // route containing a dot (e.g. /tools/3.5-gpa) still falls back to index.html correctly.
  const ASSET_EXTS = ['.js', '.css', '.html', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.xml', '.txt', '.json', '.webmanifest', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.pdf', '.wasm', '.webp', '.avif', '.mp3', '.mp4', '.webm', '.map'];
  const ext = path.extname(urlPath);
  const isAsset = ASSET_EXTS.indexOf(ext) !== -1;
  if (urlPath === '/') {
    urlPath = '/index.html';
  } else if (!isAsset) {
    // Extensionless resolution order (Netlify _redirects parity):
    //   1. exact static file  /about      → /about.html
    //   2. prerendered page   /finance/mortgage → /finance/mortgage/index.html
    //   3. whitelisted SPA route (unprerendered long-tails) → index.html
    //   4. anything else → falls through to the true-404 branch below
    const clean = urlPath.replace(/\/+$/, '');
    const seg1 = clean.split('/')[1] || '';
    const candidates = [clean + '.html', clean + '/index.html'];
    let resolved = null;
    for (const tp of candidates) {
      const fp = path.join(ROOT, path.normalize(tp).replace(/^[\\/]+/, ''));
      if (fp.startsWith(ROOT) && fs.existsSync(fp) && fs.statSync(fp).isFile()) { resolved = tp; break; }
    }
    if (resolved) urlPath = resolved;
    else if (SPA_PREFIX_SET.has(seg1)) urlPath = '/index.html';
    else urlPath = clean + '.html'; // nonexistent → true 404
  }
  
  // Security: prevent directory traversal
  const safePath = path.normalize(urlPath).replace(/^[\\/]+/, '');
  const filePath = path.join(ROOT, safePath);
  
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Don't cache service worker script
  const isSW = urlPath === '/sw.js';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Missing ASSET (known extension, e.g. .js/.css/.png) → true 404.
      // A NON-whitelisted extensionless route also lands here (its .html
      // rewrite does not exist) — true 404, never a 200 soft-404.
      res.writeHead(404, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      try {
        res.end(fs.readFileSync(path.join(ROOT, '404.html')));
      } catch (e2) {
        res.end('Not Found');
      }
      return;
    }
    const mimeType = MIME[path.extname(filePath)] || 'application/octet-stream';
    const maxAge = CACHE_MAX_AGE[path.extname(filePath)] || 86400;
    const fileExt = path.extname(filePath);
    const useGzip = COMPRESSIBLE.indexOf(fileExt) !== -1 && data.length > GZIP_THRESHOLD &&
      req.headers['accept-encoding'] && req.headers['accept-encoding'].indexOf('gzip') !== -1;
    let cacheControl = 'no-cache';
    if (isSW) {
      cacheControl = 'no-cache';
    } else if (ext === '.html') {
      cacheControl = 'public, max-age=' + maxAge;
    }
    if (useGzip) {
      res.writeHead(200, {
        'Content-Type': mimeType,
        'Cache-Control': cacheControl,
        'Content-Encoding': 'gzip',
        'Vary': 'Accept-Encoding'
      });
      res.end(zlib.gzipSync(data));
    } else {
      res.writeHead(200, { 'Content-Type': mimeType, 'Cache-Control': cacheControl });
      res.end(data);
    }
  });
}).listen(PORT);
