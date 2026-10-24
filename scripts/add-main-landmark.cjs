#!/usr/bin/env node
// ============================================================
// CalcProMaster — add the missing <main> landmark
// ------------------------------------------------------------
// 55 guide pages and the blog shipped no <main> element. Two consequences, and
// the second is why this exists:
//
//   1. Accessibility: assistive tech gets no landmark to skip to.
//   2. Every content-based audit — ours and every third party's — reads the
//      page's <main>. With no <main>, those tools count the page as having no
//      content at all, which is how a 1,700-word guide can be reported as a
//      "low word count page".
//
// The wrapper is inserted only when <body> exists and contains no <main>, so the
// script is idempotent and safe to re-run. Content pages only: 404, the Search
// Console verification file, the OG template and the internal QA dashboard are
// skipped on purpose.
//
// Usage: node scripts/add-main-landmark.cjs [--check] [--dry]
// Exit : 0 = every target page has a landmark (or was fixed) · 1 = --check found
//        a page still missing one
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');
const DRY = process.argv.includes('--dry');

// Directories whose *.html files are real content pages.
const DIRS = ['guides', 'blog'];
// Any other top-level content page that lacks a landmark.
const EXTRA = [];
const SKIP = new Set(['404.html', 'og-image.html', 'qa-dashboard.html', 'googled1ac20b54b36e7cf.html']);

function targets() {
  const list = [];
  for (const d of DIRS) {
    const dir = path.join(ROOT, d);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.html') && !SKIP.has(f)) list.push(path.join(d, f));
    }
  }
  for (const f of EXTRA) list.push(f);
  return list;
}

const MARK = '<!-- main-landmark -->';

// A page's chrome (header/nav, footer) must stay OUTSIDE <main>, so where a file
// has them the wrapper goes around the content between them. A nav that appears
// later in the document is a breadcrumb inside the content, not chrome, so only a
// header/nav closing within the first CHROME_SCAN characters after <body> counts.
const CHROME_SCAN = 4000;

function wrap(html) {
  if (/<main[\s>]/i.test(html)) return { changed: false, html };
  const bodyOpen = html.match(/<body[^>]*>/i);
  if (!bodyOpen) return { changed: false, html, skipped: 'no <body>' };
  const bodyStart = bodyOpen.index + bodyOpen[0].length;

  const bodyClose = html.lastIndexOf('</body>');
  if (bodyClose < 0) return { changed: false, html, skipped: 'no </body>' };

  // start: after the closing chrome tag, if the page opens with one
  let start = bodyStart;
  const head = html.slice(bodyStart, bodyStart + CHROME_SCAN);
  const chrome = [...head.matchAll(/<\/(header|nav)>/gi)].pop();
  if (chrome) start = bodyStart + chrome.index + chrome[0].length;

  // end: before the footer, if the page ends with one
  let end = bodyClose;
  const footer = html.slice(start, bodyClose).search(/<footer[\s>]/i);
  if (footer >= 0) end = start + footer;

  const html2 = html.slice(0, start) + '\n' + MARK + '\n<main>\n'
    + html.slice(start, end).replace(/^\n/, '')
    + '</main>\n' + html.slice(end);
  return { changed: true, html: html2 };
}

const files = targets();
let fixed = 0;
let already = 0;
let stillMissing = 0;

for (const rel of files) {
  const p = path.join(ROOT, rel);
  const html = fs.readFileSync(p, 'utf8');
  if (/<main[\s>]/i.test(html)) { already++; continue; }
  const r = wrap(html);
  if (r.skipped) { console.log('SKIP  ' + rel + ' (' + r.skipped + ')'); continue; }
  if (CHECK) { console.log('MISS  ' + rel); stillMissing++; continue; }
  if (r.changed) {
    if (!DRY) fs.writeFileSync(p, r.html);
    fixed++;
  }
}

const label = CHECK ? 'missing a landmark' : (DRY ? 'would be fixed' : 'fixed');
console.log(label + ': ' + (CHECK || DRY ? files.length - already : fixed) + ' | already had <main>: ' + already + ' | scanned: ' + files.length);
process.exit(CHECK && stillMissing ? 1 : 0);
