// Audit: per-tool SEO content coverage, uniqueness, and long-tail keyword targeting
const fs = require('fs');
const path = require('path');

// 1. Load all tool defs
const files = fs.readdirSync('./js/data').filter(f => f.endsWith('.js'));
let all = [];
files.forEach(f => {
  const arr = require('./js/data/' + f);
  if (Array.isArray(arr)) arr.forEach(t => all.push({ id: t.id, name: t.name, cat: f.replace('.js', ''), kw: t.kw || '', desc: t.desc || '' }));
});
console.log('TOTAL TOOLS:', all.length);

// 2. tool-intros coverage
const introSrc = fs.readFileSync('./js/tool-intros.js', 'utf8');
const m = introSrc.match(/var TOOL_INTROS = (\{[\s\S]*?\});/);
const intros = m ? eval('(' + m[1] + ')') : {};
const introIds = Object.keys(intros);
const missingIntro = all.filter(t => !intros[t.id]).map(t => t.id);
console.log('\n=== TOOL INTROS (unique ~100-word paragraphs) ===');
console.log('intros present:', introIds.length, '| missing:', missingIntro.length);
if (missingIntro.length) console.log('missing ids:', missingIntro.slice(0, 20).join(', '));
const lens = Object.values(intros).map(v => String(v).trim().split(/\s+/).length);
console.log('word length — min:', Math.min(...lens), '| avg:', Math.round(lens.reduce((a, b) => a + b, 0) / lens.length), '| max:', Math.max(...lens));
const norm = new Set();
let dupIntro = 0;
Object.values(intros).forEach(v => { const n = String(v).replace(/\s+/g, ' ').trim().toLowerCase(); if (norm.has(n)) dupIntro++; else norm.add(n); });
console.log('duplicate intro texts:', dupIntro);
// repeated first sentences
const firsts = new Map();
Object.entries(intros).forEach(([id, v]) => {
  const f = String(v).split(/[.!?]/)[0].trim().toLowerCase();
  firsts.set(f, (firsts.get(f) || 0) + 1);
});
const repeated = [...firsts.entries()].filter(([f, c]) => c >= 3).sort((a, b) => b[1] - a[1]);
console.log('first-sentences repeated >=3x:', repeated.length, repeated.slice(0, 5).map(([f, c]) => c + 'x "' + f.slice(0, 50) + '"').join(' | '));

// 3. TOOL_SEO coverage — read the master seo-content.js if present
let seoEntries = {};
const masterPath = './js/seo-content.js';
if (fs.existsSync(masterPath)) {
  const src = fs.readFileSync(masterPath, 'utf8');
  const mm = src.match(/var TOOL_SEO\s*=\s*(\{[\s\S]*?\});/);
  if (mm) seoEntries = eval('(' + mm[1] + ')');
}
console.log('\n=== TOOL_SEO (auto-generated guides) ===');
console.log('master seo-content.js entries:', Object.keys(seoEntries).length, '(', (fs.existsSync(masterPath) ? (fs.statSync(masterPath).size / 1024 / 1024).toFixed(1) : 0), 'MB )');

// per-category chunks
const chunkDir = './js/seo';
let chunkTotal = 0;
if (fs.existsSync(chunkDir)) {
  const chunkFiles = fs.readdirSync(chunkDir).filter(f => f.endsWith('.js'));
  const chunkSizes = {};
  chunkFiles.forEach(cf => {
    const src = fs.readFileSync(path.join(chunkDir, cf), 'utf8');
    const mm = src.match(/var TOOL_SEO\s*=\s*(\{[\s\S]*?\});/);
    if (mm) {
      const obj = eval('(' + mm[1] + ')');
      chunkTotal += Object.keys(obj).length;
      chunkSizes[cf] = Object.keys(obj).length;
    }
  });
  console.log('chunk files:', chunkFiles.length, '| total chunk entries:', chunkTotal);
  console.log('per-chunk counts:', JSON.stringify(chunkSizes));
  // merge all chunk entries for analysis
  chunkFiles.forEach(cf => {
    const src = fs.readFileSync(path.join(chunkDir, cf), 'utf8');
    const mm = src.match(/var TOOL_SEO\s*=\s*(\{[\s\S]*?\});/);
    if (mm) Object.assign(seoEntries, eval('(' + mm[1] + ')'));
  });
}

// field coverage on entries
let withTitle = 0, withMeta = 0, withDesc = 0, withAeo = 0, withFaq = 0, withH1 = 0;
const descLens = [];
const missingAll = [];
Object.entries(seoEntries).forEach(([id, e]) => {
  if (e.title) withTitle++; if (e.metaDesc) withMeta++; if (e.desc) withDesc++; if (e.aeo) withAeo++; if (e.faqs && e.faqs.length) withFaq++; if (e.h1) withH1++;
  if (e.desc) descLens.push(String(e.desc).split(/\s+/).length);
  if (!e.title && !e.metaDesc && !e.desc) missingAll.push(id);
});
console.log('\n=== FIELD COVERAGE (of ' + Object.keys(seoEntries).length + ' SEO entries) ===');
console.log('has title:', withTitle, '| has metaDesc:', withMeta, '| has desc(guide):', withDesc, '| has aeo block:', withAeo, '| has faqs:', withFaq, '| has h1:', withH1);
console.log('entries with NOTHING at all:', missingAll.length, missingAll.slice(0, 15).join(', '));
if (descLens.length) console.log('desc words — min:', Math.min(...descLens), '| avg:', Math.round(descLens.reduce((a, b) => a + b, 0) / descLens.length), '| max:', Math.max(...descLens));

// tools with NO seo entry at all
const seoIds = new Set(Object.keys(seoEntries));
const noSeo = all.filter(t => !seoIds.has(t.id));
console.log('\n=== TOOLS WITH NO SEO ENTRY AT ALL:', noSeo.length, '===');
if (noSeo.length) console.log(noSeo.slice(0, 30).map(t => t.id).join(', '));

// 4. Long-tail keyword targeting: does the generated content use long-tail phrases?
// Sample: pick 5 tools, show their title + metaDesc to judge uniqueness/tail-targeting
console.log('\n=== SAMPLE TITLES/METAS (uniqueness + long-tail check) ===');
const sample = ['loan-emi', 'bmi', 'compound-interest', 'mortgage', 'percentage', 'fuel-cost', 'tip', 'salary', 'vat', 'age'];
sample.forEach(id => {
  const e = seoEntries[id];
  if (e) console.log('[' + id + '] title:', e.title, '\n         meta:', (e.metaDesc || '').slice(0, 100));
  else console.log('[' + id + '] NO ENTRY');
});

// duplicate titles across entries
const titleMap = new Map();
Object.entries(seoEntries).forEach(([id, e]) => {
  if (e.title) { const k = e.title.toLowerCase().replace(/\s+/g, ' ').trim(); if (!titleMap.has(k)) titleMap.set(k, []); titleMap.get(k).push(id); }
});
const dupTitles = [...titleMap.entries()].filter(([t, ids]) => ids.length > 1);
console.log('\n=== DUPLICATE TITLES ===', dupTitles.length);
dupTitles.slice(0, 8).forEach(([t, ids]) => console.log(ids.join(', '), '=>', t.slice(0, 80)));

// duplicate metaDescs
const metaMap = new Map();
Object.entries(seoEntries).forEach(([id, e]) => {
  if (e.metaDesc) { const k = e.metaDesc.toLowerCase().replace(/\s+/g, ' ').trim(); if (!metaMap.has(k)) metaMap.set(k, []); metaMap.get(k).push(id); }
});
const dupMetas = [...metaMap.entries()].filter(([t, ids]) => ids.length > 1);
console.log('\n=== DUPLICATE META DESCRIPTIONS ===', dupMetas.length);
dupMetas.slice(0, 8).forEach(([t, ids]) => console.log(ids.join(', '), '=>', t.slice(0, 80)));
