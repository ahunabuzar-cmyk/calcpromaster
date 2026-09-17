// CALCPROMASTER — full SEO/AEO/content audit over deploy/*.js (read-only, no server needed)
const fs = require('fs');
const path = require('path');
const r = require('../docs/calculator-registry.json');

const DEPLOY = path.join(__dirname, '..', 'deploy');
const strip = (s) => s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
// Google measures the DECODED text — `&amp;` counts as 1 char, not 5.
const decode = (s) => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&#x?[0-9a-fA-F]+;/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');

const tools = r.tools;
const rows = [];
const titleMap = {}, descMap = {}, h1Map = {};
let missingFile = 0;

for (const t of tools) {
  const cat = t.cat || t.category || '';
  const f = path.join(DEPLOY, cat, t.id, 'index.html');
  if (!fs.existsSync(f)) { missingFile++; continue; }
  const html = fs.readFileSync(f, 'utf8');
  const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const title = decode((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
  const desc = decode((html.match(/name="description" content="([^"]*)"/) || [])[1] || '');
  const canon = (html.match(/rel="canonical" href="([^"]*)"/) || [])[1] || '';
  const h1s = [...noScript.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => strip(m[1]));
  const jsonld = (html.match(/<script type="application\/ld\+json"[^>]*>/g) || []).length;
  const mainHtml = (html.match(/<main[\s\S]*?<\/main>/) || [])[0] || html;
  const words = strip(mainHtml).split(' ').length;
  const internalLinks = [...html.matchAll(/href="\/([a-z0-9-]+(?:\/[a-z0-9-]+)?)"/g)].length;
  const faqBlock = (html.match(/<div class="seo-faqs">[\s\S]*?<\/div>/) || [])[0] || '';
  const faqQ = [...faqBlock.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => strip(m[1]));
  const intro = (html.match(/<p class="lead">([\s\S]*?)<\/p>/) || html.match(/<section[^>]*class="[^"]*intro[^"]*"[\s\S]*?<\/section>/) || [])[0] || '';
  const t0 = (title || '').toLowerCase().trim(), d0 = (desc || '').trim(), h0 = (h1s[0] || '').toLowerCase().trim();
  titleMap[t0] = (titleMap[t0] || []).concat(cat + '/' + t.id);
  if (d0) descMap[d0] = (descMap[d0] || []).concat(cat + '/' + t.id);
  if (h0) h1Map[h0] = (h1Map[h0] || []).concat(cat + '/' + t.id);
  rows.push({ id: cat + '/' + t.id, titleLen: title.length, descLen: desc.length, canonOk: canon.includes('/' + cat + '/' + t.id), h1: h1s.length, h1text: h1s[0] || '', words, links: internalLinks, jsonld, faqs: faqQ.length });
}

const dups = (map) => Object.entries(map).filter(([, v]) => v.length > 1);
console.log('=== FILES ===');
console.log('tools:', tools.length, '| pages missing:', missingFile);
console.log('\n=== TITLES ===');
const dupTitles = dups(titleMap);
const emptyT = rows.filter((x) => x.titleLen === 0);
const longT = rows.filter((x) => x.titleLen > 60);
console.log('empty:', emptyT.length, '| >60 chars:', longT.length, '| duplicate titles:', dupTitles.length);
dupTitles.slice(0, 15).forEach(([k, v]) => console.log('  DUP:', k.slice(0, 70), '→', v.join(', ').slice(0, 80)));
console.log('\n=== META DESC ===');
const dupD = dups(descMap);
console.log('missing:', rows.filter((x) => x.descLen === 0).length, '| duplicates:', dupD.length, '| <90:', rows.filter((x) => x.descLen > 0 && x.descLen < 90).length, '| >160:', rows.filter((x) => x.descLen > 160).length);
console.log('\n=== H1 ===');
const dupH = dups(h1Map);
console.log('missing H1:', rows.filter((x) => x.h1 === 0).length, '| multiple H1:', rows.filter((x) => x.h1 > 1).length, '| duplicate H1:', dupH.length);
dupH.slice(0, 15).forEach(([k, v]) => console.log('  DUP:', k.slice(0, 70), '→', v.join(', ').slice(0, 80)));
console.log('\n=== CONTENT THICKNESS (main body words) ===');
const thin = rows.filter((x) => x.words < 250);
console.log('pages <250 words:', thin.length);
thin.slice(0, 10).forEach((x) => console.log('  THIN:', x.id, 'words=' + x.words));
console.log('median words:', rows.map((x) => x.words).sort((a, b) => a - b)[Math.floor(rows.length / 2)]);
console.log('\n=== OTHER ===');
console.log('canonical mismatches/missing:', rows.filter((x) => !x.canonOk).length);
console.log('pages with 0 internal links:', rows.filter((x) => x.links === 0).length, '| avg internal links:', Math.round(rows.reduce((a, x) => a + x.links, 0) / rows.length));
console.log('pages with 0 JSON-LD blocks:', rows.filter((x) => x.jsonld === 0).length);
console.log('pages with <4 FAQ qs:', rows.filter((x) => x.faqs < 4).length, '| avg FAQ:', Math.round(rows.reduce((a, x) => a + x.faqs, 0) / rows.length));
fs.writeFileSync(path.join(__dirname, '..', 'test-results', 'seo-audit-rows.json'), JSON.stringify(rows, null, 1));
console.log('\nsaved test-results/seo-audit-rows.json');
