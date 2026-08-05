// Static server for deploy/ folder — mimics Netlify behavior exactly
// (case-sensitive paths, no SPA fallback rewrite, 404 for missing files)
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, 'deploy');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3210;
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.txt': 'text/plain', '.xml': 'application/xml', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2',
};
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  // index.html + sw.js never cache locally (mimics Netlify _headers), so a browser
  // testing on 127.0.0.1 always gets the fresh shell — the stuck-Loading bug was a
  // stale cached shell, and local tests must reproduce the fixed behavior.
  const isHtml = p === '/index.html' || p === '/';
  const isSw = p === '/sw.js';
  const noCache = isHtml || isSw || p.indexOf('/js/') === 0;
  fs.readFile(file, (err, data) => {
    if (err) {
      // SPA fallback — mimics Netlify _redirects '/* /index.html 200' for
      // extensionless routes so deep links (/finance/loan-emi) work like live.
      // Real asset files (.js/.css/.png...) still get a true 404.
      const ext = path.extname(p).toLowerCase();
      if (!ext && p.indexOf('.') === -1) {
        fs.readFile(path.join(ROOT, 'index.html'), (err2, idx) => {
          if (err2) { res.writeHead(404); res.end('404'); return; }
          res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' });
          res.end(idx);
        });
        return;
      }
      res.writeHead(404); res.end('404'); return;
    }
    const headers = { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' };
    if (noCache) headers['Cache-Control'] = 'no-cache';
    res.writeHead(200, headers);
    res.end(data);
  });
}).listen(PORT, () => console.log('deploy-server on ' + PORT));
