// Static server for deploy/ folder — mimics Netlify behavior exactly:
//   1) real files always win (Netlify "shadowing" — rules never override files
//      unless forced, and 404-status rules are documented to respect shadowing)
//   2) whitelisted extensionless route prefixes → index.html 200 (SPA fallback)
//   3) everything else → true 404 with the real 404.html page
// The whitelist mirrors _redirects section (5); scripts/check-sitemap-coverage.cjs
// cross-checks the two so they cannot drift.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { PREFIXES, STATIC_PAGES } = require('./scripts/route-whitelist.cjs');
const ROOT = path.join(__dirname, 'deploy');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3210;
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.txt': 'text/plain', '.xml': 'application/xml', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2',
};

function serve(res, status, file, headers) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(500); res.end('500 (missing ' + path.basename(file) + ')'); return; }
    const h = Object.assign({ 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }, headers);
    res.writeHead(status, h);
    res.end(data);
  });
}

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

  // 1) Real file exists → serve it (shadowing: beats every later rule).
  //    Real directory → serve its index.html (Netlify serves directory indexes;
  //    deploy/ ships /compare /favorites /hub /guides /blog + every category
  //    as prerendered <dir>/index.html).
  fs.stat(file, (err, st) => {
    if (!err && st.isFile()) {
      fs.readFile(file, (err2, data) => {
        if (err2) { res.writeHead(500); res.end('500'); return; }
        const headers = { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' };
        if (noCache) headers['Cache-Control'] = 'no-cache';
        res.writeHead(200, headers);
        res.end(data);
      });
      return;
    }
    if (!err && st.isDirectory()) {
      const dirIndex = path.join(file, 'index.html');
      fs.readFile(dirIndex, (err2, data) => {
        if (err2) { res.writeHead(404); res.end('404'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' });
        res.end(data);
      });
      return;
    }

    const ext = path.extname(p).toLowerCase();
    const hasDot = p.indexOf('.') !== -1;
    const firstSeg = p.split('/')[1] || '';

    // 2) Static clean-URL pages → their standalone .html file with 200
    //    (mirrors the "/about /about.html 200" rules in _redirects section 2).
    if (!ext && !hasDot && STATIC_PAGES.indexOf(firstSeg) !== -1) {
      serve(res, 200, path.join(ROOT, firstSeg + '.html'), { 'Cache-Control': 'no-cache' });
      return;
    }

    // 3) Whitelisted extensionless route → SPA shell with 200
    //    (mirrors the /prefix/* /index.html 200 rules in _redirects; the bare
    //    "/es /index.html 200" locale rules are folded in here too — the
    //    language switcher writes bare /<locale> on the homepage).
    if (!ext && !hasDot && PREFIXES.indexOf(firstSeg) !== -1) {
      serve(res, 200, path.join(ROOT, 'index.html'), { 'Cache-Control': 'no-cache' });
      return;
    }

    // 4) Everything else → hard 404 with the real custom 404 page
    //    (mirrors the /* /404.html 404 catch-all; /js/* + /og/* missing
    //    assets land here too, exactly like on Netlify).
    serve(res, 404, path.join(ROOT, '404.html'), { 'Cache-Control': 'no-cache' });
  });
}).listen(PORT, () => console.log('deploy-server on ' + PORT));
