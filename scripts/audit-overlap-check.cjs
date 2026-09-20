const fs = require('fs'), path = require('path');
const sm = fs.readFileSync('deploy/sitemap.xml', 'utf8');
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace('https://calcpromaster.netlify.app', ''));
const dups = urls.length - new Set(urls).size;
const noindex = [];
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (f === 'index.html') {
      const h = fs.readFileSync(p, 'utf8');
      if (/name="robots" content="noindex/.test(h)) {
        noindex.push('/' + path.relative('deploy', path.dirname(p)).split(path.sep).join('/'));
      }
    }
  }
}
walk('deploy');
const set = new Set(urls);
const overlap = noindex.filter(u => set.has(u));
console.log('sitemap urls:', urls.length, '| dup:', dups, '| noindex files:', noindex.length, '| noindex IN sitemap:', overlap.length, JSON.stringify(overlap.slice(0, 5)));
const segs = {};
for (const u of urls) { const seg = u.split('/')[1] || '(root)'; segs[seg] = (segs[seg] || 0) + 1; }
console.log('sitemap segments:', JSON.stringify(segs));
