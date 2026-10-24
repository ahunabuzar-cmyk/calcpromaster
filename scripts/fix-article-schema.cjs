#!/usr/bin/env node
// ============================================================
// CalcProMaster — Article schema completion (build step, idempotent)
// ------------------------------------------------------------
// Every /guides/*.html page ships an Article block with a headline, description
// and URL but no datePublished — the exact shape Google's structured-data
// validator rejects, and the source of the 53 "structured data validation
// error" rows in the crawl report. Google's Article guidelines also need an
// author and an image, so both are filled in when absent.
//
//   node scripts/fix-article-schema.cjs           # rewrite deploy/guides
//   node scripts/fix-article-schema.cjs --check   # exit 1 if any block is incomplete
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const GUIDES = path.join(DEPLOY, 'guides');
const CHECK = process.argv.includes('--check');
const SITE = 'https://calcpromaster.com';
const BUILD_DATE = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);

if (!fs.existsSync(GUIDES)) {
  console.error('deploy/guides missing — run build-deploy.js first');
  process.exit(1);
}

let changed = 0;
let stale = 0;
for (const f of fs.readdirSync(GUIDES)) {
  if (!f.endsWith('.html')) continue;
  const p = path.join(GUIDES, f);
  const html = fs.readFileSync(p, 'utf8');
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let next = html;
  let touched = false;
  let m;
  while ((m = re.exec(html))) {
    let data;
    try { data = JSON.parse(m[1]); } catch (e) { continue; }
    if (!data || data['@type'] !== 'Article') continue;
    const missing = !data.datePublished || !data.dateModified || !data.author || !data.image;
    if (!missing) continue;
    const pageDate = (html.match(/<time datetime="(\d{4}-\d{2}-\d{2})"/) || [])[1] || BUILD_DATE;
    data.datePublished = data.datePublished || pageDate;
    data.dateModified = data.dateModified || pageDate;
    data.author = data.author || { '@type': 'Organization', name: 'CalcProMaster', url: SITE + '/about' };
    data.image = data.image || SITE + '/og-image.png';
    const out = '<script type="application/ld+json">\n  ' + JSON.stringify(data, null, 2).replace(/\n/g, '\n  ') + '\n  </script>';
    next = next.replace(m[0], out);
    touched = true;
  }
  if (!touched) continue;
  if (CHECK) { stale++; console.log('  incomplete: guides/' + f); continue; }
  fs.writeFileSync(p, next, 'utf8');
  changed++;
}

if (CHECK) {
  if (stale) { console.error('✖ ' + stale + ' guide Article block(s) missing required fields — run: node scripts/fix-article-schema.cjs'); process.exit(1); }
  console.log('✔ guide Article schema complete');
} else {
  console.log('guide Article schema completed: ' + changed + ' page(s)');
}
