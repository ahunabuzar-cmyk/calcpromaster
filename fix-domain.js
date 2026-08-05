// ====== fix-domain.js — CalcPro domain updater ======
// Usage:  node fix-domain.js yourdomain.com
//   (bina https:// ke — script khud https:// lagata hai)
// Sirf SEO-critical files update karta hai jo indexation ko affect karte hain:
//   sitemap.xml, index.html (schema/canonical), js/site-config.js, og-image.html, llms.txt
// Baaki files (js/*.js, styles.css, sw.js) dynamic origin use karte hain — unhe chhedne ki zaroorat nahi.

const fs = require('fs');
const path = require('path');

const newDomain = (process.argv[2] || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
if (!newDomain || !newDomain.includes('.')) {
  console.error('Usage: node fix-domain.js yourdomain.com   (bina https:// ke)');
  process.exit(1);
}

const FILES = ['sitemap.xml', 'index.html', 'js/site-config.js', 'og-image.html', 'llms.txt'];
const OLD = 'calcpro.example.com';
let total = 0;

for (const f of FILES) {
  if (!fs.existsSync(f)) { console.log('  skip (missing):', f); continue; }
  const src = fs.readFileSync(f, 'utf8');
  if (!src.includes(OLD)) { console.log('  no-op (no old domain):', f); continue; }
  const out = src.split(OLD).join(newDomain);
  fs.writeFileSync(f, out);
  const n = (src.match(new RegExp(OLD.replace(/\./g, '\\.'), 'g')) || []).length;
  total += n;
  console.log(`  ✔ ${f}: ${n} occurrence(s) -> ${newDomain}`);
}

console.log(`\nDone! ${total} total replacements.`);
console.log('Ab Google Search Console me verify karo, sitemap.xml resubmit karo, aur index.html me GSC/GA4 apne site-config.js se set karo.');
