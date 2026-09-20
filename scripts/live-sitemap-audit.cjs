// Live sitemap audit: every URL -> status, redirect, noindex, canonical, title
const https = require('https');
const http = require('http');

function fetch(url, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 5) {
        const next = new URL(res.headers.location, url).href;
        res.resume();
        return resolve(fetch(next, redirects + 1).then(r => ({ ...r, redirectedFrom: redirects === 0 ? url : r.redirectedFrom, chain: (r.chain||0) + 1 })));
      }
      let body = '';
      res.on('data', c => { if (body.length < 300000) body += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body, redirects }));
    });
    req.on('error', e => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
  });
}

(async () => {
  const sm = await fetch('https://calcpromaster.netlify.app/sitemap.xml');
  const locs = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  console.log('sitemap URLs:', locs.length);
  const results = { ok: 0, redirect: [], err4xx: [], err5xx: [], noindex: [], canonMismatch: [], noTitle: [] };
  const CONC = 12;
  for (let i = 0; i < locs.length; i += CONC) {
    const batch = locs.slice(i, i + CONC);
    await Promise.all(batch.map(async (u) => {
      const r = await fetch(u);
      const finalUrl = r.redirectedFrom || u;
      if (r.status === 0) return results.err5xx.push(finalUrl + ' (ERR ' + r.error + ')');
      if (r.status >= 500) return results.err5xx.push(finalUrl + ' (' + r.status + ')');
      if (r.status >= 400) return results.err4xx.push(finalUrl + ' (' + r.status + ')');
      if (r.redirects > 0) results.redirect.push(finalUrl + ' -> ' + r.status + ' (chain ' + r.redirects + ')');
      const noindex = /<meta name="robots" content="[^"]*noindex/i.test(r.body) || /x-robots-tag.*noindex/i.test(JSON.stringify(r.headers));
      if (noindex) results.noindex.push(finalUrl);
      const canon = (r.body.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
      if (!canon) results.noTitle.push(finalUrl + ' (no canonical)');
      else if (decodeURIComponent(canon) !== decodeURIComponent(u)) results.canonMismatch.push(finalUrl + ' → ' + canon);
      if (r.status === 200) results.ok++;
    }));
    process.stdout.write('\r  checked ' + Math.min(i + CONC, locs.length) + '/' + locs.length);
  }
  console.log('\n\n=== RESULT ===');
  console.log('OK (200, indexable, canonical):', results.ok);
  console.log('redirects:', results.redirect.length); results.redirect.slice(0,10).forEach(x => console.log('  ', x));
  console.log('4XX:', results.err4xx.length); results.err4xx.slice(0,10).forEach(x => console.log('  ', x));
  console.log('5XX:', results.err5xx.length); results.err5xx.slice(0,5).forEach(x => console.log('  ', x));
  console.log('noindex:', results.noindex.length); results.noindex.slice(0,10).forEach(x => console.log('  ', x));
  console.log('canonical mismatch:', results.canonMismatch.length); results.canonMismatch.slice(0,10).forEach(x => console.log('  ', x));
})();
