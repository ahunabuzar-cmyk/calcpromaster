#!/usr/bin/env node
// ============================================================
// Verify the CTR overrides actually landed in the BUILT output.
// ------------------------------------------------------------
// apply-seo-overrides.cjs rewrites js/seo-content.js; split-seo.cjs rewrites
// js/seo/*.js; the SSG renders the deploy/ HTML. This script closes the loop:
// it reads each override and asserts the shipped page contains the title tag,
// the meta description, the answer-first heading/lead/quick-answer, and none
// of the 'the undefined' placeholder.
//
// Usage: node scripts/verify-seo-overrides.cjs [--dir deploy]
// Exit 1 if any override is missing or landed on the wrong number of pages.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('./apply-seo-overrides.cjs');

const dirArg = process.argv.indexOf('--dir');
const DIR = path.join(__dirname, '..', dirArg >= 0 ? process.argv[dirArg + 1] : 'deploy');

function walkIndexHtml(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walkIndexHtml(p, acc);
    else if (f.name === 'index.html') acc.push(p);
  }
  return acc;
}

// A built tool page mixes three kinds of text: the tool's own UI copy (tool name,
// .tool-desc, form labels), the generated SEO copy, and the related-tools cards.
// Only the second is this script's business. Screening the whole page reported
// correct English from the tool's own description — "Convert force units
// (N, kN, lbf)" — as a raw-label defect on three pages. These are the containers
// the SEO generators write into; the slice of each stops at the first block that
// belongs to a different section.
function seoCopy(html) {
  const parts = [];
  const intro = html.match(/<p class="tool-intro"[^>]*>([\s\S]*?)<\/p>/);
  if (intro) parts.push(intro[1]);
  for (const cls of ['seo-aeo-area', 'seo-faqs']) {
    const at = html.indexOf('<div class="' + cls + '">');
    if (at < 0) continue;
    let end = html.length;
    for (const stop of ['class="related-section"', 'class="tool-methodology"', 'class="footer-content"', '<footer']) {
      const s = html.indexOf(stop, at);
      if (s >= 0 && s < end) end = s;
    }
    parts.push(html.slice(at, end));
  }
  return parts.join('\n');
}

function main() {
  if (!fs.existsSync(DIR)) {
    console.error('✖ build directory not found: ' + DIR + ' (run npm run deploy:build first)');
    process.exit(1);
  }
  const files = walkIndexHtml(DIR, []);
  // Prevent HTML-escaping mismatches (' → &#39;) from being read as a failure:
  // the built meta description escapes apostrophes, the override text does not.
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  let bad = 0;
  // ---------- raw result-label repairs ----------
  // Title and snippet must be on exactly one built page, and the page must carry
  // none of the raw labels the audit screens for. The needle itself is NOT a
  // reliable test: the hand-written copy legitimately says "between ppm, ppb";
  // only the broken shape ("a between ppm", "force units") is a defect, which is
  // exactly what the audit's RAW_LABEL matches.
  const { RAW_LABEL } = require('./audit-seo-placeholders.cjs');
  const escTitle = (t) => t.replace(/&/g, '&amp;');
  for (const [id, o] of Object.entries(S.LABEL_REPAIRS)) {
    if (!o.title) {
      // Body-label fix only: every page carrying this tool's intro must be free of
      // the raw labels. The pages are found by their data-tool marker rather than
      // by the override text, because this repair does not change the title. More
      // than one page is normal — a tool with programmatic variants (/x/50000,
      // /x/75000 …) renders the same intro on each.
      const hits = files.filter((f) => fs.readFileSync(f, 'utf8').includes('data-tool="' + id + '"'));
      if (!hits.length) { console.log('✖ ' + id + ' : no built page carries this tool'); bad++; continue; }
      const dirty = hits.filter((f) => RAW_LABEL.test(seoCopy(fs.readFileSync(f, 'utf8'))));
      if (dirty.length) {
        console.log('✖ ' + id + ' : raw result label still on ' + dirty.length + '/' + hits.length + ' page(s)');
        bad++;
      } else console.log('✔ ' + id + '  ->  label gone from ' + hits.length + ' page(s)');
      continue;
    }
    const hits = files.filter((f) => { const h = fs.readFileSync(f, 'utf8'); return h.includes(o.title) || h.includes(escTitle(o.title)); });
    if (hits.length !== 1) { console.log('✖ ' + id + ' : title found on ' + hits.length + ' pages (expected 1)'); bad++; continue; }
    const html = fs.readFileSync(hits[0], 'utf8');
    const missing = [];
    if (!html.includes('<title>' + o.title + '</title>') && !html.includes('<title>' + escTitle(o.title) + '</title>')) missing.push('title tag');
    if (o.metaDesc && !html.includes(esc(o.metaDesc))) missing.push('meta description');
    if (RAW_LABEL.test(seoCopy(html))) missing.push('raw result label in page copy');
    if (/the undefined/.test(html)) missing.push('undefined placeholder');
    const url = '/' + path.relative(DIR, hits[0]).split(path.sep).slice(0, -1).join('/');
    if (missing.length) { console.log('✖ ' + id + ' (' + url + ') missing: ' + missing.join(', ')); bad++; }
    else console.log('✔ ' + id + '  ->  ' + url);
  }

  // An ampersand in an override renders as '&amp;' in the built HTML, so a raw
  // needle reports "title found on 0 pages" for copy that is correct on the page.
  // The label-repair loop above already allowed for this; the same allowance
  // belongs here, or every '&' title reads as a failure.
  const has = (html, s) => typeof s === 'string' && s.length > 0
    && (html.includes(s) || html.includes(s.replace(/&/g, '&amp;')));

  const entries = Object.entries(S.CTR_OVERRIDES);
  for (const [id, o] of entries) {
    const hits = files.filter((f) => has(fs.readFileSync(f, 'utf8'), o.title));
    if (hits.length !== 1) {
      console.log('✖ ' + id + ' : title found on ' + hits.length + ' pages (expected 1)');
      bad++;
      continue;
    }
    const html = fs.readFileSync(hits[0], 'utf8');
    const missing = [];
    if (!has(html, '<title>' + o.title + '</title>')) missing.push('title tag');
    if (!html.includes(esc(o.metaDesc))) missing.push('meta description');
    if (!has(html, o.heading)) missing.push('aeo heading');
    if (!has(html, o.lead)) missing.push('aeo lead');
    if (!has(html, o.quickAnswer)) missing.push('aeo quick answer');
    if (/the undefined/.test(html)) missing.push('undefined placeholder');
    const url = '/' + path.relative(DIR, hits[0]).split(path.sep).slice(0, -1).join('/');
    if (missing.length) {
      console.log('✖ ' + id + ' (' + url + ') missing: ' + missing.join(', '));
      bad++;
    } else {
      console.log('✔ ' + id + '  ->  ' + url);
    }
  }
  console.log('---');
  const total = entries.length + Object.keys(S.LABEL_REPAIRS).length;
  if (bad) {
    console.error('FAILED: ' + bad + '/' + total + ' override/repair pages incomplete in ' + DIR);
    process.exit(1);
  }
  console.log('all ' + entries.length + ' CTR overrides + ' + Object.keys(S.LABEL_REPAIRS).length + ' label repairs rendered in ' + DIR);
}

main();
