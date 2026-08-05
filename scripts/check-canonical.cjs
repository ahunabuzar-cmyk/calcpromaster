/* Temp: canonical paths for dup ids */
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../js/seo-content.js', 'utf8');
const ids = ['fuel-cost', 'fuel-efficiency', 'ltv', 'freelance-rate', 'net-worth', 'battery-life',
  'walking-steps', 'water-intake', 'moving-cost', 'grocery-budget', 'ideal-weight',
  'pregnancy-weight', 'wedding-budget'];
for (const id of ids) {
  const i = src.indexOf(`'${id}':`);
  if (i === -1) { console.log(id, '-> NO SEO ENTRY'); continue; }
  const block = src.slice(i, i + 800);
  const cp = block.match(/canonicalPath:\s*"([^"]+)"/);
  const title = block.match(/title:\s*"([^"]+)"/);
  console.log(`${id} -> canonical: ${cp ? cp[1] : '?'} | title: ${title ? title[1].slice(0, 60) : '?'}`);
}
// Search for "656" anywhere
const idx = src.indexOf('656');
console.log('=== "656" in seo-content.js:', idx !== -1 ? 'FOUND @' + idx : 'NOT FOUND');
if (idx !== -1) console.log('context:', src.slice(idx - 80, idx + 80));
