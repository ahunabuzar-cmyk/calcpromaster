// CALCPROMASTER — SEO Content Quality Audit
// Quantifies title/meta/content issues across js/seo-content.js (source of truth)
// and the per-category split files. Reports hard numbers, not opinions.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const files = ['js/seo-content.js', ...fs.readdirSync(path.join(ROOT, 'js', 'seo')).filter(f => f.endsWith('.js')).map(f => 'js/seo/' + f)];

let combined = '';
for (const f of files) {
  try { combined += '\n' + fs.readFileSync(path.join(ROOT, f), 'utf8'); }
  catch (e) { console.error('skip', f, e.message); }
}

const report = {};
report.toolEntries = (combined.match(/^\s{2}'([^']+)':\s*\{/gm) || []).length;
report.brokenAndYearTitles = (combined.match(/"title":"[^"]*& \(2026\)"/g) || []).length;
report.yearTitles = (combined.match(/"title":"[^"]*\(2026\)"/g) || []).length;
report.emptyPlaceholders = (combined.match(/your  and|Entering  in|your  never|your  private|your  stays|several  scenarios|change your  /g) || []).length;
report.recalcBoilerplate = (combined.match(/recalculates on the fly, with no button to press and no page reload/g) || []).length;
report.trueForEveryBoilerplate = (combined.match(/This is true for every one of the 543\+ calculators/g) || []).length;
report.genericFreeFaq = (combined.match(/"q":"Is this [^"]+ really free\?"/g) || []).length;
report.genericOfflineFaq = (combined.match(/"q":"Does [^"]+ work offline\?"/g) || []).length;
report.genericSaveFaq = (combined.match(/"q":"Does [^"]+ save my data\?"/g) || []).length;
report.genericAccountFaq = (combined.match(/"q":"Do I need to create an account to use [^"]+\?"/g) || []).length;
report.truncatedDesc = (combined.match(/"metaDesc":"[^"]*\. Runs/g) || []).length;
// Title uniqueness
const titles = [...combined.matchAll(/"title":"([^"]+)"/g)].map(m => m[1]);
report.totalTitles = titles.length;
const dupTitles = {};
titles.forEach(t => { dupTitles[t] = (dupTitles[t] || 0) + 1; });
report.duplicateTitles = Object.values(dupTitles).filter(c => c > 1).length;
// Canonical uniqueness
const canons = [...combined.matchAll(/"canonicalPath":"([^"]+)"/g)].map(m => m[1]);
const dupCanons = {};
canons.forEach(c => { dupCanons[c] = (dupCanons[c] || 0) + 1; });
report.duplicateCanonicals = Object.values(dupCanons).filter(c => c > 1).length;

console.log(JSON.stringify(report, null, 2));
