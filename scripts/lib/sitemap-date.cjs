'use strict';
// ============================================================
// CalcProMaster — deterministic generation date for generated docs
// ------------------------------------------------------------
// `npm run keywords:check` regenerates the keyword docs and then runs
// `git diff --exit-code` over them, so the gate only works if regeneration is
// byte-identical. Any output derived from the ENVIRONMENT instead of the repo
// content turns that staleness gate into a clock check that fails forever.
//
// Why not mtime: build-keyword-map.cjs, build-difficulty-report.cjs and
// build-hard-keywords-doc.cjs dated themselves from
// `fs.statSync('sitemap.xml').mtimeMs`, commented as "source-controlled mtime …
// so CI and local builds produce byte-identical documents". Git does not
// preserve mtimes — a fresh checkout stamps every file with the checkout time —
// so the value was really "when was this working copy created". The committed
// docs say 2026-10-13; any CI run on another day regenerated them with that
// day's date and failed the gate with "keyword docs stale" while nothing was
// stale. That is the whole reason the gate was being read as "pre-existing
// noise" instead of a signal.
//
// The sitemap's own <lastmod> is content-derived: it comes from the committed
// sitemap.xml, so one commit yields one date on Linux, Windows and CI.
// ============================================================
const fs = require('fs');
const path = require('path');

// Returns the newest <lastmod> date (YYYY-MM-DD) in <root>/sitemap.xml,
// or null when the file is missing / carries no usable <lastmod>.
function sitemapDate(root) {
  let xml;
  try {
    xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  } catch (e) {
    return null;
  }
  const dates = (xml.match(/<lastmod>[^<]*<\/lastmod>/g) || [])
    .map((tag) => tag.replace(/<\/?lastmod>/g, '').trim().slice(0, 10))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (!dates.length) return null;
  return dates.sort().pop();
}

module.exports = { sitemapDate };
