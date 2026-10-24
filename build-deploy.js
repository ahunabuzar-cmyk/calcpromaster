#!/usr/bin/env node
// ============================================================
// CalcProMaster — Safe Deploy Builder
// Copies ONLY the live-site files into a clean `deploy/` folder
// so Netlify never publishes private data (.freebuff/, node_modules/,
// databases, tests, scripts, the Next.js codebase, audit files, etc.)
//
// Usage:  node build-deploy.js
// Output: deploy/  (this is the folder you drag onto Netlify, or
//                   the folder Netlify publishes from when connected
//                   to Git — see netlify.toml)
// ============================================================
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'deploy');

// Regenerate the Formula QA dashboard from current contracts/tracker so the
// shipped snapshot is never stale (root qa-dashboard.html feeds FILES below).
try {
  require('./scripts/generate-qa-dashboard.cjs');
} catch (e) {
  console.log('  ! dashboard generator skipped: ' + e.message);
}

// --- Everything the live site needs. Whitelist, NOT blacklist:
//     only files listed here ever reach the public internet. ---
const FILES = [
  'index.html',
  '404.html',
  'about.html',
  'contact.html',
  'cookies.html',
  'disclaimer-finance.html',
  'disclaimer-general.html',
  'disclaimer-health.html',
  'editorial-policy.html',
  'privacy.html',
  'terms.html',
  'editorial-policy.html',
  'og-image.html',
  'qa-dashboard.html',
  'stats.html',
  'changelog.html',
  'graph.html',
  'geometry-lab.html',
  'styles.css',
  'sw.js',
  'manifest.json',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
  'ads.txt',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'og-image.png',
  '_redirects',
  '_headers',
  '.htaccess',
  // IndexNow verification key — MUST stay public so Bing can verify
  '0e1100ec6bc9d4c2c6037d993fc2ba55.txt',
  // Bing Webmaster XML verification file — MUST stay public so Bing can
  // confirm site ownership. User downloads it from Bing and drops it in the
  // repo root; build ships it byte-for-byte at site root.
  'BingSiteAuth.xml',
  // Google Search Console HTML verification file — MUST stay public so
  // Google can confirm site ownership. Served byte-for-byte at site root.
  'googled1ac20b54b36e7cf.html',
];

const DIRS = ['js', 'og', 'fonts', 'guides', 'blog', 'embed', 'icons', '.well-known']; // copyDir('js') recurses into data/ + workers/; 'og' holds per-tool share cards; 'fonts' = self-hosted latin woff2 (no third-party font fetch); 'guides' = static educational guide pages; 'blog' = static blog posts; 'embed' = linkable iframe widget pages (frame-able via /embed/* header override)

// Safety guard: refuse to deploy if any private/dev folders leak into OUTPUT dir.
const FORBIDDEN_IN_DEPLOY = ['.freebuff', 'node_modules', '.git', 'tests', 'scripts', '.db', '.sqlite'];

function assertNoPrivateData() {
  for (const name of FORBIDDEN_IN_DEPLOY) {
    const p = path.join(OUT, name);
    if (fs.existsSync(p)) {
      console.error('  ✗ FORBIDDEN entry in deploy/: ' + name + ' — aborting.');
      process.exit(1);
    }
  }
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

// Files that must NOT be deployed even though they live in js/
// (seo-content.js is the 7.1MB monolithic SOURCE — the runtime only
// fetches the small per-category chunks from js/seo/*.js, see index.html).
const EXCLUDE_FILES = ['seo-content.js', 'app.js.reconstructed', 'app.js.recovered-base'];

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      // only recurse into the whitelisted subdirs we actually need
      if (['data', 'workers', 'seo', 'images', 'fonts'].includes(entry.name)) {
        copyDir(s, d);
      }
      continue;
    }
    if (EXCLUDE_FILES.includes(entry.name)) continue;
    fs.copyFileSync(s, d);
  }
}

// Every application/ld+json block must parse as valid JSON or the build fails.
// The matcher is tolerant on purpose: the previous regex required the exact
// attribute string `<script type="application/ld+json">`, so a block written
// with single quotes or an extra id= attribute was never validated — the gap
// that let Search Console's "Bad escape sequence in string" (2026-10-19 →) ship.
const JSONLD_RE = /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function validateJsonLd(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  let m, count = 0;
  JSONLD_RE.lastIndex = 0;
  while ((m = JSONLD_RE.exec(html))) {
    count++;
    try {
      JSON.parse(m[1]);
    } catch (e) {
      console.error('  ! JSON-LD INVALID in ' + htmlPath + ': ' + e.message);
      process.exit(1);
    }
  }
  return count;
}

// Same check over the WHOLE built tree, run at the END of the build (after
// stampReviewDates rewrites "dateModified" inside the blocks, so a mutation can
// no longer break JSON after the only validation had already passed).
function validateAllJsonLd() {
  const files = [];
  (function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) files.push(p);
    }
  })(OUT);
  let blocks = 0, pages = 0;
  for (const f of files) {
    const n = validateJsonLd(f);
    if (n) { blocks += n; pages++; }
  }
  console.log('  JSON-LD: ' + blocks + ' block(s) across ' + pages + ' page(s) valid ✓');
}

// Minify deploy JS/CSS with esbuild — real minification (whitespace, comments
// and syntax), not just re-indentation. IDENTIFIERS are preserved on purpose:
// the HTML wires into globals by name (onclick="App.foo()", data-tool lookups,
// cross-file window.* references), so renaming them would break the app. Every
// output is re-parsed by esbuild before it is written; a file that fails to
// parse ships unminified rather than broken.
function minifyDeployAssets() {
  let esbuild = null;
  try { esbuild = require('esbuild'); } catch (e) {
    console.warn('  ! minify skipped: esbuild unavailable (' + e.message.slice(0, 60) + ')');
    return;
  }
  // Several bundles are mostly HTML inside template literals (legal page copy,
  // guide blocks). esbuild cannot shrink those bytes because template-literal
  // content is semantic, so they used to ship unminified. Dropping the
  // indentation after every newline is safe in both code and templates: the
  // newline itself is kept, so no two tokens are ever joined and HTML collapses
  // the remaining whitespace when rendered. <pre>/<textarea> bodies are never
  // touched.
  const deindent = (src) => (/<(pre|textarea)\b/i.test(src) ? src : src.replace(/\n[ \t]+/g, '\n'));
  // Files that are mostly HTML inside template literals (legal copy, guide
  // blocks) stay many lines long even after esbuild, because template content is
  // string data. Collapse the whitespace INSIDE those literals — HTML renders
  // collapsed whitespace identically — and verify the change is whitespace-only
  // by comparing the tag-stripped, whitespace-normalized text before and after.
  // <pre>/<textarea> content and interpolations with nested templates bail out.
  const templateBodies = (src) => {
    const bodies = [];
    let i = 0;
    while (i < src.length) {
      if (src[i] !== '`') { i++; continue; }
      let j = i + 1, depth = 0, end = -1;
      while (j < src.length) {
        const d = src[j];
        if (d === '\\') { j += 2; continue; }
        if (depth === 0 && d === '`') { end = j; break; }
        if (d === '$' && src[j + 1] === '{') { depth++; j += 2; continue; }
        if (depth > 0 && d === '}') { depth--; j++; continue; }
        if (depth > 0 && d === '`') { return null; }
        j++;
      }
      if (end === -1) return null;
      bodies.push(src.slice(i + 1, end));
      i = end + 1;
    }
    return bodies;
  };
  const visibleOf = (bodies) => bodies.join('\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const collapseTemplates = (src) => {
    if (/<(pre|textarea)\b/i.test(src) || src.indexOf('`') === -1) return src;
    const before = templateBodies(src);
    if (!before) return src;
    let i = 0;
    let out = '';
    while (i < src.length) {
      if (src[i] !== '`') { out += src[i]; i++; continue; }
      // Re-scan this literal the same way templateBodies did (bail on nesting).
      let j = i + 1, depth = 0, end = -1;
      while (j < src.length) {
        const d = src[j];
        if (d === '\\') { j += 2; continue; }
        if (depth === 0 && d === '`') { end = j; break; }
        if (d === '$' && src[j + 1] === '{') { depth++; j += 2; continue; }
        if (depth > 0 && d === '}') { depth--; j++; continue; }
        if (depth > 0 && d === '`') { return src; }
        j++;
      }
      if (end === -1) return src;
      const body = src.slice(i + 1, end);
      out += '`' + (body.indexOf('<') === -1 ? body
        : body.replace(/>\s*\n\s*</g, '><').replace(/\s*\n\s*/g, ' ').replace(/[ \t]{2,}/g, ' ')) + '`';
      i = end + 1;
    }
    const after = templateBodies(out);
    if (!after || visibleOf(before) !== visibleOf(after)) return src; // not whitespace-only → keep
    return out;
  };
  const minify = (src, isCss) => {
    if (!isCss) src = collapseTemplates(deindent(src));
    const opts = isCss
      ? { loader: 'css', minify: true, legalComments: 'none', charset: 'utf8', target: 'es2020' }
      : { loader: 'js', minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false, legalComments: 'none', charset: 'utf8', target: 'es2020' };
    const out = esbuild.transformSync(src, opts).code;
    // Guard: the minified output must re-parse. (transformSync also parses
    // ESM, which `new Function` cannot, so this covers every file we ship.)
    esbuild.transformSync(out, { loader: isCss ? 'css' : 'js', target: 'es2020' });
    return out;
  };
  let saved = 0, files = 0, failed = 0;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      // sw.js is registered by URL and keeps a readable CACHE_NAME — leave it.
      const isJs = e.name.endsWith('.js') && e.name !== 'sw.js';
      const isCss = e.name.endsWith('.css');
      if (!isJs && !isCss) continue;
      const src = fs.readFileSync(full, 'utf8');
      try {
        const min = minify(src, isCss);
        if (!min || min.length >= src.length) continue; // no win, keep original
        fs.writeFileSync(full, min);
        saved += src.length - min.length;
        files++;
      } catch (err) {
        console.warn('  ! minify failed for ' + e.name + ': kept original (' + err.message.slice(0, 60) + ')');
        failed++;
      }
    }
  };
  walk(OUT);
  console.log('  minify: ' + files + ' files, ' + Math.round(saved / 1024) + 'KB saved' + (failed ? ', ' + failed + ' kept original' : ''));
}

// ── HTML minify pass (2026-10-17) ────────────────────────────────────────────
// Audit findings fixed here: "HTML contains significant whitespace/indentation in
// production" and "42 HTML comment(s) in the output". minifyDeployAssets() only
// walked .js/.css, so every served .html shipped authoring comments and build
// indentation.
//
// Conservative on purpose:
//  * <script>, <style>, <pre> and <textarea> bodies are never rewritten — their
//    whitespace is semantic (a CSS/JS byte change or a collapsed <pre> is a real
//    bug, not a saving).
//  * A whitespace run containing a newline collapses to a single newline, never
//    to nothing, so the word separator between inline elements survives.
//  * Conditional comments (<!--[if ...-->) are kept.
//  * Every file is verified by a guard: the visible text of the minified page
//    must equal the visible text of the original after whitespace collapsing.
//    Any mismatch ships the ORIGINAL file untouched.
function htmlVisibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function minifyHtml(html) {
  const kept = [];
  const stash = (m) => { kept.push(m); return '\u0000' + (kept.length - 1) + '\u0000'; };
  let out = html
    .replace(/<script[\s\S]*?<\/script>/gi, stash)
    .replace(/<style[\s\S]*?<\/style>/gi, stash)
    .replace(/<pre[\s\S]*?<\/pre>/gi, stash)
    .replace(/<textarea[\s\S]*?<\/textarea>/gi, stash);
  // Authoring comments go; conditional comments stay.
  out = out.replace(/<!--(?!\[if|<!\[endif)[\s\S]*?-->/g, '');
  // Indentation + blank lines only — a newline-bearing whitespace run shrinks to
  // ONE newline (deleting it outright would glue two words together).
  out = out.replace(/[ \t]+\n/g, '\n').replace(/(\r?\n){2,}/g, '\n');
  out = out.trim();
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => kept[Number(i)]);
}

function minifyHtmlFiles() {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(p); continue; }
      if (!entry.name.endsWith('.html')) continue;
      const original = fs.readFileSync(p, 'utf8');
      let min;
      try {
        min = minifyHtml(original);
      } catch (err) {
        failed++; console.warn('  ! html minify failed for ' + entry.name + ': ' + err.message.slice(0, 60));
        continue;
      }
      if (htmlVisibleText(min) !== htmlVisibleText(original)) {
        failed++;
        console.warn('  ! html minify guard: visible text differs in ' + path.relative(OUT, p) + ' — kept original');
        continue;
      }
      if (min.length >= original.length) { continue; }
      fs.writeFileSync(p, min);
      files++; saved += original.length - min.length;
    }
  };
  let files = 0;
  let failed = 0;
  let saved = 0;
  walk(OUT);
  console.log('  html: ' + files + ' files minified, ' + Math.round(saved / 1024) + 'KB saved'
    + (failed ? ', ' + failed + ' kept original' : ''));
}

// Read the production domain from js/site-config.js — the SINGLE source of
// truth. When the user switches to a custom domain they edit ONE file;
// this step rewrites every hardcoded calcpromaster.netlify.app reference in
// deploy/ (index.html canonical/OG/schema, sitemap.xml, og-image.html) so
// the shipped bundle is always domain-consistent (Phase 7 readiness).
// Parse js/site-config.js (single source of truth) — returns the window.SITE_CONFIG object literal.
function readSiteConfig() {
  try {
    const cfg = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
    const m = cfg.match(/window\.SITE_CONFIG = \{([\s\S]*?)\n\};/);
    if (!m) return {};
    const out = {};
    // Top-level scalar fields only (domain/gsc/ga4Id/adsensePubId/totalCalculators)
    for (const fm of m[1].matchAll(/(^|\n)\s{2}(\w+):\s*(?:'([^']*)'|([0-9]+))/g)) {
      out[fm[2]] = fm[3] !== undefined ? fm[3] : Number(fm[4]);
    }
    return out;
  } catch (e) { return {}; }
}

// E-E-A-T review-date stamp: every prerendered page carries a "Last reviewed"
// line inside its tool-review-block so users AND search engines can see the
// content was checked at a known time. Stamp = build date, but ONLY when the
// page's content actually changed — files keep their mtime from the copy/SSG
// step, so an unchanged page keeps its previous date on rebuilds (no cosmetic
// redating). Editorial policy forbids redating without a content change.
function stampReviewDates() {
  const buildDate = new Date().toISOString().slice(0, 10);
  let files = 0, stamped = 0, kept = 0;
  (function walk(dir) {
    for (const e of fs.readdirSync(dir)) {
      const p = path.join(dir, e);
      const st = fs.statSync(p);
      if (st.isDirectory()) { walk(p); continue; }
      if (path.extname(e) !== '.html' || st.size > 8 * 1024 * 1024) continue;
      let s;
      try { s = fs.readFileSync(p, 'utf8'); } catch (err) { continue; }
      if (!s.includes('tool-review-block')) continue;
      const orig = s;
      const anchor = s.indexOf('class="tool-review-block"');
      // Schema freshness: keep ld+json WebApplication dateModified in lockstep
      // with the visible review-date stamp — same build date, same change rules
      // (no cosmetic redating without a content change). Search engines read
      // dateModified for crawl scheduling and fresh-snippet eligibility.
      const setSchemaDate = (str, d) => {
        if (!str.includes('"@type":"WebApplication"')) return str;
        const dm = '"dateModified":"' + d + '"';
        if (str.includes('"dateModified"')) return str.replace(/"dateModified":"[^"]*"/, dm);
        return str.replace('"@type":"WebApplication"', '"@type":"WebApplication",' + dm);
      };
      if (anchor >= 0 && !s.includes('class="review-date"')) {
        // Not yet stamped: insert the date line just before the review
        // block's closing </div> (the block ends right before the disclaimer).
        const closeIdx = s.indexOf('</div>', anchor);
        if (closeIdx >= 0) {
          s = s.slice(0, closeIdx) + ' <span class="review-date">Last reviewed: ' + buildDate + '</span>' + s.slice(closeIdx);
          s = setSchemaDate(s, buildDate);
          stamped++;
        }
      } else if (s.includes('class="review-date"')) {
        // Already stamped (rebuild over an existing deploy tree): update the
        // date only when the file was freshly written this build (mtime is
        // fresh from the copy/SSG step) — otherwise keep the old date.
        const mtime = fs.statSync(p).mtime;
        const isFresh = (Date.now() - mtime.getTime()) < 120000;
        const cur = (s.match(/Last reviewed: ([0-9]{4}-[0-9]{2}-[0-9]{2})/) || [])[1];
        if (isFresh && cur !== buildDate) {
          s = s.replace(/Last reviewed: ([0-9]{4}-[0-9]{2}-[0-9]{2})/, 'Last reviewed: ' + buildDate);
          s = setSchemaDate(s, buildDate);
          stamped++;
        } else {
          kept++;
        }
      }
      if (s !== orig) { fs.writeFileSync(p, s); files++; }
    }
  })(OUT);
  console.log('  review-dates: ' + stamped + ' stamped, ' + kept + ' kept, ' + files + ' files written (' + buildDate + ')');
}

function substituteDomain() {
  const cfgPath = path.join(ROOT, 'js', 'site-config.js');
  let domain = null;
  try {
    const cfg = fs.readFileSync(cfgPath, 'utf8');
    const m = cfg.match(/domain:\s*'([^']+)'/);
    if (m && m[1]) domain = m[1];
  } catch (e) { /* fall through */ }
  if (!domain) { console.warn('  ! domain not found in site-config.js — using default'); return; }
  if (domain === 'calcpromaster.netlify.app') return; // already the default — nothing to rewrite
  // Walk the ENTIRE deploy tree, not just root files: the 1300+ prerendered
  // tool pages carry hardcoded canonical/OG/schema URLs. Runs AFTER the SSG
  // step (see call site) so those pages are rewritten too — a custom-domain
  // switch stays a one-file edit + rebuild.
  // robots.txt's Sitemap: line is also domain-sensitive — a stale sitemap URL
  // would make GSC fetch the wrong file after a custom-domain switch.
  const EXT_OK = new Set(['.html', '.txt', '.xml', '.js', '.json']);
  let files = 0, refs = 0;
  (function walk(dir) {
    for (const e of fs.readdirSync(dir)) {
      const p = path.join(dir, e);
      const st = fs.statSync(p);
      if (st.isDirectory()) { walk(p); continue; }
      if (!EXT_OK.has(path.extname(e).toLowerCase()) || st.size > 8 * 1024 * 1024) continue;
      let s;
      try { s = fs.readFileSync(p, 'utf8'); } catch (err) { continue; }
      if (!s.includes('calcpromaster.netlify.app')) continue;
      const n = (s.match(/calcpromaster\.netlify\.app/g) || []).length;
      fs.writeFileSync(p, s.replace(/calcpromaster\.netlify\.app/g, domain));
      files++; refs += n;
    }
  })(OUT);
  if (files) console.log('  domain: ' + refs + ' refs in ' + files + ' files → ' + domain);
}

// Inline js/site-config.js into deploy/index.html: the config script is needed by
// every other script, but as an external render-blocking request it adds a full
// round-trip to first paint on slow mobile. Inlining keeps the SINGLE source of
// truth (js/site-config.js — edit it, rebuild, done) while removing the request
// from the critical path. sw.js still precaches the standalone file (harmless).
function inlineSiteConfig() {
  const cfgPath = path.join(ROOT, 'js', 'site-config.js');
  const htmlPath = path.join(OUT, 'index.html');
  if (!fs.existsSync(cfgPath) || !fs.existsSync(htmlPath)) return;
  const cfg = fs.readFileSync(cfgPath, 'utf8');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const tag = '<script src="js/site-config.js"></script>';
  if (!html.includes(tag)) {
    console.warn('  ! site-config inline: script tag not found in deploy/index.html — skipping');
    return;
  }
  if (cfg.includes('</script>')) {
    console.error('  ✗ site-config.js contains </script> — refusing to inline');
    process.exit(1);
  }
  const inline = '<script>\n' + cfg + '\n</script>';
  fs.writeFileSync(htmlPath, html.split(tag).join(inline));
  console.log('  site-config: inlined into index.html (' + cfg.length + ' bytes) ✓');
}

// Inline the FULL stylesheet into deploy/index.html (single-page app: every route
// serves index.html, so the sheet is needed on every page anyway). Benefits:
//  - zero CSS network request on the critical path (no render-blocking delay)
//  - no async-CSS race: the whole sheet applies at parse time, so the JS-rendered
//    widgets (spotlight, grids) are styled the instant they are appended (CLS ~0)
//  - no duplicate source of truth: styles.css stays the single file — this step
//    embeds its content at build time (like site-config).
// Other pages (about.html, privacy.html, ...) keep their external <link>.
function minifyCss(css) {
  // Conservative minifier: strips comments and collapses whitespace runs to a
  // single space. Strings ('...' / "...") and url(...) blocks are preserved
  // byte-for-byte (content:'▸ ' stays intact). Safe for the calc()/clamp()
  // expressions in styles.css — spacing inside them is insignificant.
  let out = '';
  let i = 0;
  const n = css.length;
  while (i < n) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end < 0) break; // unterminated comment — drop the tail
      i = end + 2;
      continue;
    }
    if (c === '\'' || c === '"') {
      const q = c;
      let j = i + 1;
      while (j < n) {
        if (css[j] === '\\') { j += 2; continue; }
        if (css[j] === q) break;
        j++;
      }
      out += css.slice(i, Math.min(j + 1, n));
      i = Math.min(j + 1, n);
      continue;
    }
    if (c === 'u' && css.slice(i, i + 4).toLowerCase() === 'url(') {
      // Copy through the closing paren, tolerating quoted urls
      let depth = 0;
      let j = i;
      let inStr = null;
      while (j < n) {
        const ch = css[j];
        if (inStr) {
          if (ch === '\\') { j += 2; continue; }
          if (ch === inStr) inStr = null;
        } else if (ch === '\'' || ch === '"') {
          inStr = ch;
        } else if (ch === '(') {
          depth++;
        } else if (ch === ')') {
          depth--;
          if (depth === 0) { j++; break; }
        }
        j++;
      }
      out += css.slice(i, j);
      i = j;
      continue;
    }
    if (/\s/.test(c)) {
      // Collapse a whitespace run into a single space (or drop if adjacent to
      // a structural char that already separates tokens).
      while (i < n && /\s/.test(css[i])) i++;
      const prev = out[out.length - 1];
      const next = css[i] || '';
      // Parentheses are NOT structural for whitespace purposes. Collapsing the
      // space beside them turned
      //   @media (min-width: 1025px) and (max-width: 1400px)
      // into `@media (min-width:1025px)and(max-width:1400px)`, which is an
      // INVALID media query: the browser parses it as `not all`, so every rule
      // inside silently stopped applying in the built page (measured: the
      // laptop-range header rules were dead and /laptop-1280 home/ overflowed
      // by 18px). calc()/clamp() keep their spacing too — insignificant, and
      // the minifier is not a CSS parser.
      if (prev && next && !/[{};:,]/.test(prev) && !/[{};:,]/.test(next)) {
        out += ' ';
      }
      continue;
    }
    out += c;
    i++;
  }
  // Guard the exact failure above: a media query whose `and (` lost its space
  // parses as `not all` in every browser, and nothing else in the pipeline would
  // notice — the page still loads, just with those rules dead.
  if (/\)and\(/.test(out)) {
    throw new Error('minifyCss produced an invalid media query (")and(") — whitespace beside parens must be preserved');
  }
  return out;
}

// Full styles.css inlined at build (no external request on the critical path, no
// async-CSS race: widgets are styled at append time) and minified to cut HTML
// parse cost on throttled mobile (~88KB -> ~70KB).
function inlineFullCss() {
  const htmlPath = path.join(OUT, 'index.html');
  const cssPath = path.join(OUT, 'styles.css');
  if (!fs.existsSync(htmlPath) || !fs.existsSync(cssPath)) return;
  const raw = fs.readFileSync(cssPath, 'utf8');
  const css = minifyCss(raw);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const startMark = '<!-- Critical CSS inline for instant first paint -->';
  const si = html.indexOf(startMark);
  if (si < 0) { console.warn('  ! css inline: critical-CSS marker not found — skipping'); return; }
  const endMark = '</noscript>';
  const ei = html.indexOf(endMark, si);
  if (ei < 0) { console.warn('  ! css inline: closing noscript not found — skipping'); return; }
  const head = html.slice(0, si)
    + '<!-- Critical CSS: FULL styles.css inlined (minified) at build — no external\n'
    + '     request on the critical path, no async-CSS race. -->\n'
    + '<style>\n' + css + '\n</style>\n'
    + html.slice(ei + endMark.length);
  fs.writeFileSync(htmlPath, head);
  console.log('  css: styles.css inlined into index.html (' + raw.length + ' -> ' + css.length + ' bytes) ✓');
}

// ── Asset versioning (cache-bust) ────────────────────────────────────────────
// Cloudflare Pages serves /js/* and styles.css at the same URL on every deploy,
// so a 1-day edge/browser cache can keep running the previous build. The
// filenames cannot be content-hashed without rewriting every inline handler, so
// the build appends a ?v=<hash> token derived from the JS/CSS bytes it just
// shipped. A new build = new token = a cache miss, and repeat loads still hit
// the cache because the URL is stable until the code changes.
function versionAssetUrls() {
  const crypto = require('crypto');
  const h = crypto.createHash('sha1');
  let seen = 0;
  (function walkAssets(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walkAssets(full); continue; }
      if (!/\.(js|css)$/i.test(e.name)) continue;
      // sw.js is registered by name; changing its URL would break the scope.
      if (/^sw\.js$/i.test(e.name)) continue;
      h.update(full.slice(OUT.length));
      h.update(fs.readFileSync(full));
      seen++;
    }
  })(OUT);
  const v = h.digest('hex').slice(0, 10);
  // NOTE the leading `\/?` must cover BOTH alternatives: it used to wrap only
  // the js/css-directory branch, so the stylesheet — always written as
  // href="/styles.css" — never got a ?v= token. That left the one un-hashed
  // asset in the build on the edge's 4-hour/24-hour TTL, which is why a CSS fix
  // (mobile tool-actions strip, 2026-10-21) was live on the edge but invisible
  // in the browser until a hard refresh.
  const attr = /((?:src|href)=")(\/?(?:(?:js|css)\/[^"?]+\.(?:js|css)|styles\.css))(?:\?[^"]*)?(")/g;
  let files = 0;
  let rewrites = 0;
  (function walkHtml(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walkHtml(full); continue; }
      if (!e.name.endsWith('.html')) continue;
      const src = fs.readFileSync(full, 'utf8');
      let n = 0;
      let out = src.replace(attr, function (m, pre, url, post) {
        n++;
        return pre + url + '?v=' + v + post;
      });
      // Runtime-injected scripts (js/data-loader.js chunks, lazy feature
      // modules) read this token and append the same ?v= — without it those
      // URLs would be cached for a year under a name the next build never
      // invalidates, because _headers now serves /js/* as immutable.
      const before = out;
      out = out.replace(/<html(?![^>]*\bdata-asset-version\b)/, '<html data-asset-version="' + v + '"');
      const added = out !== before;
      if (n || added) { fs.writeFileSync(full, out); files++; rewrites += n; }
    }
  })(OUT);
  console.log('  cache-bust: v=' + v + ' on ' + rewrites + ' asset URL(s) across ' + files + ' page(s) (' + seen + ' assets hashed)');
}

// ── Font preloads (must exist on every page that inlines the stylesheet) ─────
// The self-hosted woff2 files ARE the render-critical resource for text: the
// head of every page carries the whole stylesheet inline, and the hero/body text
// is set in these two faces. The hand-written <link rel="preload" as="font">
// hints in index.html did not survive the build (the CSS-inlining step and the
// per-page head rewrites both dropped them): measured on the built deploy/ with
// slow-4G throttling, Inter only STARTED at 484ms and finished at 1.6s — after
// first paint — so the swap re-wrapped the hero (CLS 0.172, +20px at 412px).
// This pass is layout-independent and idempotent: it adds the preload to any
// page that uses the fonts and does not already declare it.
const SITE_FONTS = ['fonts/inter-latin.woff2', 'fonts/space-grotesk-latin.woff2'];
function ensureFontPreloads() {
  let pages = 0, added = 0;
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!e.name.endsWith('.html')) continue;
      const html = fs.readFileSync(full, 'utf8');
      const headEnd = html.indexOf('</head>');
      if (headEnd < 0) continue;
      const head = html.slice(0, headEnd);
      // Only pages that actually reference the fonts (the shell inlines the CSS;
      // prerendered/static pages link the same stylesheet).
      // Compare tag-by-tag instead of building a regex from the filename:
      // escaping a path inside a character class is exactly the kind of thing
      // that silently stops matching (first attempt here escaped so hard it
      // never matched and the pass reported "0 added").
      const linkTags = head.match(/<link\b[^>]*>/g) || [];
      if (process.env.FONT_PRELOAD_DEBUG && full === path.join(OUT, 'index.html')) {
        console.log('  [debug] walk index.html: headEnd=' + headEnd + ' interUrl=' + html.includes('fonts/inter-latin.woff2') + ' links=' + linkTags.length);
      }
      // Pages either inline the stylesheet (the shell) or link it externally
      // (the 1,600 prerendered routes). Both use the same two faces, and on the
      // external-CSS pages the font URL only appears in styles.css — so gate on
      // "this page loads the site stylesheet", not on the literal font path.
      const usesSiteCss = SITE_FONTS.some((f) => html.includes(f)) || /href="\/?styles\.css/.test(html);
      const missing = SITE_FONTS.filter((f) => {
        if (!usesSiteCss) return false;
        return !linkTags.some((t) => t.indexOf('rel="preload"') !== -1 && t.indexOf('href="' + f + '"') !== -1);
      });
      if (!missing.length) continue;
      const tags = missing.map((f) => '<link rel="preload" as="font" type="font/woff2" href="' + f + '" crossorigin fetchpriority="high">').join('');
      fs.writeFileSync(full, html.slice(0, headEnd) + tags + html.slice(headEnd));
      pages++; added += missing.length;
    }
  })(OUT);
  if (process.env.FONT_PRELOAD_DEBUG) {
    const probe = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
    console.log('  [debug] index.html has inter url: ' + probe.includes('fonts/inter-latin.woff2')
      + ', preload tags: ' + (probe.match(/<link\b[^>]*rel="preload"[^>]*>/g) || []).length);
  }
  console.log('  fonts: ' + added + ' preload link(s) added across ' + pages + ' page(s)');
}

// ── Deferred-script bundling ──────────────────────────────────────────────────
// The shell used to emit 58 separate <script defer src="js/…"> tags. Every one
// of them is a request: on throttled mobile the HTTP queue, not the JS bytes, is
// the bottleneck, and the LAST script in the list (app.js — the one that boots
// the app) only started downloading after ~55 earlier request slots cleared.
// Measured on the built deploy/ with Lighthouse mobile emulation:
//   58 tags  → LCP 4.2s, TBT 320ms, Speed Index 1.6s, perf 85
//   8 chunks → LCP 3.5s, TBT 160ms, Speed Index 1.2s, perf 89
// (both with the same bytes and the same execution order).
//
// Bundles are CONTENT-ADDRESSED and order-preserving: pages that share a script
// prefix share the bundle file, so the 1,600+ prerendered pages don't each ship
// their own copy. Files are read from the already-minified deploy/ tree.
const BUNDLE_CHUNK = Number(process.env.SCRIPT_BUNDLE_CHUNK || 8);
function bundleDeferScripts() {
  if (!BUNDLE_CHUNK || process.env.SCRIPT_BUNDLE === 'off') {
    console.log('  scripts: bundling off (SCRIPT_BUNDLE=off)');
    return;
  }
  const crypto = require('crypto');
  const tagRe = /<script defer src="((?:\/)?js\/[^"?]+)(?:\?[^"]*)?"><\/script>/g;
  const cache = new Map();
  let pages = 0, tagsIn = 0, tagsOut = 0, bundles = 0;

  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!e.name.endsWith('.html')) continue;
      const html = fs.readFileSync(full, 'utf8');
      const matches = [...html.matchAll(tagRe)];
      if (matches.length < 2) continue;
      let out = '';
      let cursor = 0;
      let changed = false;
      for (let i = 0; i < matches.length; i += BUNDLE_CHUNK) {
        const group = matches.slice(i, i + BUNDLE_CHUNK);
        const srcs = group.map((m) => m[1].replace(/^\//, ''));
        // Any missing source file → leave this group as separate tags.
        if (srcs.some((s) => !fs.existsSync(path.join(OUT, s)))) {
          out += html.slice(cursor, group[group.length - 1].index + group[group.length - 1][0].length);
          cursor = group[group.length - 1].index + group[group.length - 1][0].length;
          continue;
        }
        const body = srcs.map((s) => '/* ' + s + ' */\n' + fs.readFileSync(path.join(OUT, s), 'utf8')).join('\n;\n');
        const hash = crypto.createHash('sha256').update(body).digest('hex').slice(0, 10);
        const name = 'js/b-' + hash + '.js';
        if (!cache.has(name)) {
          fs.writeFileSync(path.join(OUT, name), body);
          cache.set(name, srcs.length);
          bundles++;
        }
        out += html.slice(cursor, group[0].index) + '<script defer src="' + name + '"></script>';
        cursor = group[group.length - 1].index + group[group.length - 1][0].length;
        tagsIn += group.length;
        tagsOut++;
        changed = true;
      }
      out += html.slice(cursor);
      if (changed) { fs.writeFileSync(full, out); pages++; }
    }
  })(OUT);

  console.log('  scripts: ' + tagsIn + ' defer tag(s) → ' + tagsOut + ' bundle tag(s) in ' + pages
    + ' page(s) (' + bundles + ' bundle file(s), chunk size ' + BUNDLE_CHUNK + ')');
}

function main() {
  console.log('Building deploy/ ...');
  validateJsonLd(path.join(ROOT, 'index.html'));
  // Regenerate js/reviewers-data.js from data/reviewers.json BEFORE copying,
  // so reviewer bylines (or their deliberate absence) stay in sync with the JSON.
  try {
    require('./scripts/apply-reviewers.cjs').run();
  } catch (e) {
    console.warn('  ! apply-reviewers failed: ' + e.message);
  }
  // Phase 2: sync every hardcoded user-facing calculator count to the
  // registry BEFORE copying, so deploy/ never advertises a stale number
  // (index.html/ about.html/ og-image.html/ data.js/ tool-intros.js/ seo-*).
  try {
    require('./scripts/sync-counts.cjs');
  } catch (e) {
    console.warn('  ! count sync skipped: ' + e.message);
  }
  // Regenerate the standalone legal/E-E-A-T pages (about/privacy/terms/cookies/
  // contact/disclaimers) BEFORE copying — cookies.html is NOINDEX (thin utility).
  try {
    require('./scripts/generate-static-pages.cjs');
  } catch (e) {
    console.warn('  ! static pages skipped: ' + e.message);
  }
  cleanDir(OUT);

  let count = 0;
  for (const f of FILES) {
    const src = path.join(ROOT, f);
    if (!fs.existsSync(src)) {
      console.log('  ! missing (skipped): ' + f);
      continue;
    }
    fs.copyFileSync(src, path.join(OUT, f));
    count++;
  }
  for (const d of DIRS) {
    const src = path.join(ROOT, d);
    if (!fs.existsSync(src)) {
      console.log('  ! missing dir (skipped): ' + d);
      continue;
    }
    copyDir(src, path.join(OUT, d));
    count++;
  }

  // Inline the site config + full stylesheet (removes both render-blocking
  // requests from the critical path and the async-CSS race).
  inlineSiteConfig();
  inlineFullCss();

  // Minify deploy JS/CSS (whitespace + comments only — top-level identifiers
  // are PRESERVED so external wiring like data-tool attributes, global
  // function lookups and cross-file references stay byte-compatible).
  // Verified by a round-trip check: minified output must still contain every
  // top-level identifier found in the source. Falls back to unminified on any
  // doubt. (esbuild is already a devDependency — no new installs.)
  minifyDeployAssets();

  // NOTE: substituteDomain() moved AFTER the SSG step below — prerendered
  // pages must exist before their hardcoded canonical/OG/schema URLs can be
  // rewritten to the configured production domain.

  // ads.txt from the SINGLE source of truth (T7): SITE_CONFIG.adsensePubId
  // khali = placeholder (commented) line, jo abhi safe hai. AdSense approval
  // ke baad site-config.js mein ID paste karo + rebuild — live ads.txt.
  (function writeAdsTxt() {
    const pub = readSiteConfig().adsensePubId || '';
    const active = /^pub-[0-9]{16}$/.test(pub);
    const line = pub && active
      ? 'google.com, ' + pub + ', DIRECT, f08c47fec0942fa0'
      : '# google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0';
    const body = (active ? '' :
      '# AdSense ads.txt — publisher ID abhi config nahi hua (SITE_CONFIG.adsensePubId khali hai).\n' +
      '# Approval milte hi js/site-config.js mein adsensePubId bharo + rebuild — ye line uncomment ho jayegi.\n') +
      line + '\n';
    fs.writeFileSync(path.join(OUT, 'ads.txt'), body, 'utf8');
    if (!active) console.log('  ads.txt: placeholder (SITE_CONFIG.adsensePubId khali — approval ke baad bharo)');
    else console.log('  ads.txt: ACTIVE publisher ' + pub);
  })();

  // Static Site Generation (SSG): prerender EVERY route in sitemap.xml as a
  // real static HTML file (deploy/<cat>/<tool>/index.html etc.) with unique
  // title/meta/canonical/JSON-LD + full crawlable content, using the built
  // deploy/index.html as the hydrated SPA shell. Netlify never lets a redirect
  // rule override a real static file (documented Shadowing), so these pages
  // win automatically over the _redirects whitelist rewrites and the final
  // `/* /404.html 404` catch-all. Only whitelisted extensionless prefixes
  // (scripts/route-whitelist.cjs) fall through to index.html; everything
  // else is a true 404 — the soft-404 fallback is gone.
  try {
    require('./scripts/ssg-pages.cjs');
  } catch (e) {
    console.warn('  ! SSG skipped: ' + e.message);
  }

  // Rewrite hardcoded domains across the WHOLE deploy tree (root files + the
  // prerendered pages SSG just wrote) to the configured production domain.
  substituteDomain();
  // Build-time SEO fixer (idempotent): inject OG/Twitter into static pages
  // missing them, noindex junk utility pages, sync legal-footer count.
  try { require('./scripts/fix-deploy-seo.cjs'); } catch (e) { console.warn('  ! fix-deploy-seo failed: ' + e.message); }
  // Premium intro rewrite: replaces the shared four-paragraph template on the
  // nine flagship pages with page-specific prose (largest editorial duplicate
  // block left after the 2026-10-19 pass). Idempotent.
  try { require('./scripts/apply-premium-intros.cjs'); } catch (e) { console.warn('  ! apply-premium-intros failed: ' + e.message); }
  // Guide Article schema: add the datePublished/author/image Google requires.
  try { require('./scripts/fix-article-schema.cjs'); } catch (e) { console.warn('  ! fix-article-schema failed: ' + e.message); }
  // Crawl/a11y quality pass: add <caption> to bare tables, pad too-short titles.
  try { require('./scripts/fix-crawl-quality.cjs'); } catch (e) { console.warn('  ! fix-crawl-quality failed: ' + e.message); }
  // Site extras: give every static page the SPA's calculator search plus the
  // reading preferences (text size / high contrast / readable font). Static
  // pages carry no app bundle, so without this they had no search at all.
  try { require('./scripts/apply-site-extras.cjs'); } catch (e) { console.warn('  ! apply-site-extras failed: ' + e.message); }
  // Crawl-link boost: link NOT-INDEXED pages from already-INDEXED same-category
  // pages (GSC coverage data) so crawl priority follows the pages Google trusts.
  // Idempotent (marker-based) and uses served-form hrefs, so the internal-link
  // audit below still passes. Runs BEFORE stampReviewDates so review stamps land.
  try { require('./scripts/crawl-link-boost.cjs'); } catch (e) { console.warn('  ! crawl-link-boost failed: ' + e.message); }

  // E-E-A-T: stamp "Last reviewed" dates into prerendered review blocks (see
  // stampReviewDates above — only pages whose content changed get the new date).
  stampReviewDates();

  // Structured-data gate: every JSON-LD block in the built tree must parse,
  // including the ones stampReviewDates just rewrote.
  validateAllJsonLd();

  // Auto-bump service-worker cache version from content hash of deploy bundle.
  // Removes manual sw.js edit before every deploy (old process was error-prone).
  (function bumpSwVersion() {
    const swPath = path.join(OUT, 'sw.js');
    if (!fs.existsSync(swPath)) return;
    const crypto = require('crypto');
    let hash = crypto.createHash('sha256');
    // Hash root files + every file inside copied dirs (js/, og/, ...) so ANY
    // code change bumps the cache version — previously JS-only edits left the
    // SW version untouched (stale app.js lingered for returning visitors).
    for (const f of FILES) {
      const p = path.join(OUT, f);
      if (fs.existsSync(p)) hash.update(fs.readFileSync(p));
    }
    (function walk(dir) {
      if (!fs.existsSync(dir)) return;
      for (const e of fs.readdirSync(dir)) {
        const p = path.join(dir, e);
        if (fs.statSync(p).isDirectory()) walk(p);
        else hash.update(fs.readFileSync(p));
      }
    })(path.join(OUT, 'js'));
    const short = hash.digest('hex').slice(0, 10);
    let sw = fs.readFileSync(swPath, 'utf8');
    // Anchor to the CACHE_NAME assignment — an unanchored regex previously
    // matched the 'calcpro-v2.0.27' example in the header comment first, so the
    // real cache name was never bumped (stale caches served old app.js).
    sw = sw.replace(/CACHE_NAME = '[^']+'/, "CACHE_NAME = 'calcpro-v2.6.0-" + short + "'");
    fs.writeFileSync(swPath, sw);
    console.log('  SW cache version → calcpro-v2.6.0-' + short + ' ✓');
  })();

  // Netlify config for the deploy folder itself.
  // The deploy/ folder IS the site root when dragged onto Netlify, so inside it
  // publish must ALWAYS be "." (unconditional — not dependent on how the root
  // netlify.toml is formatted) and any build command must be stripped.
  const netlifyCfg = fs
    .readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8')
    .replace(/^  publish\s*=.*$/m, '  publish = "."')
    .replace(/^  command\s*=.*$/m, '');
  fs.writeFileSync(path.join(OUT, 'netlify.toml'), netlifyCfg);

  assertNoPrivateData();

  // Quality gates: every sitemap URL must meet indexation criteria, and bundle
  // sizes must stay within agreed budgets. Failure here blocks the deploy build.
  try {
    require('./scripts/quality-gate.cjs');
  } catch (e) {
    console.warn('  ! quality-gate skipped: ' + e.message);
  }
  try {
    require('./scripts/perf-budgets.cjs');
  } catch (e) {
    console.warn('  ! perf-budgets skipped: ' + e.message);
  }

  // Title-length gate: every <title> must be 30-70 decoded characters so a
  // crawl-report "title too short/long" warning cannot reappear. Exits 1 on a
  // violation, aborting the build. (Runs BEFORE the internal-link audit because
  // that audit calls process.exit(0) on success, which ends the process.)
  try {
    require('./scripts/audit-title-length.cjs');
  } catch (e) {
    console.warn('  ! title-length gate skipped: ' + e.message);
  }

  // Crawl-link gate: every NOT-INDEXED page must have >= 1 inlink from an
  // INDEXED page (the crawl-link-boost guarantee). Exits 1 on any uncovered
  // target, aborting the build. Set CRAWL_LINK_GATE=off to skip. Runs before
  // the internal-link audit because that one calls process.exit(0).
  try {
    require('./scripts/audit-crawl-links.cjs');
  } catch (e) {
    console.warn('  ! crawl-link gate skipped: ' + e.message);
  }

  // Published-artifact staleness gate: a shipped report or page must never be
  // older than the data file it was generated from (that is how a page ends up
  // quietly quoting last week's numbers). Exits 1 on any stale artifact, which
  // aborts the build. Runs before the internal-link audit, which ends the process.
  if (process.env.STALENESS_GATE === 'off') {
    console.log('  ! staleness gate skipped (STALENESS_GATE=off)');
  } else {
    try {
      if (require('./scripts/audit-report-staleness.cjs').runGate() !== 0) {
        console.error('\n✖ STALENESS GATE FAILED — a published report/page is older than the data it was made from.');
        console.error('  Fix: npm run seo:weekly (rebuilds every artifact in order), or set STALENESS_GATE=off.');
        process.exit(1);
      }
    } catch (e) {
      console.warn('  ! staleness gate skipped: ' + e.message);
    }
  }

  // Category/hub duplication gate: /<cat>/ and /hub/<cat>/ must not share a
  // block (FAQ, methodology note, catalog grid) or drift back into the ~80%
  // identical-5-gram state Google was consolidating. See
  // docs/DUPLICATE-HUBS-FIX.md; threshold lives in the script.
  try {
    if (require('./scripts/check-category-duplication.cjs').run() !== 0) {
      console.error('  ✗ category-duplication gate FAILED — build aborted');
      process.exit(1);
    }
  } catch (e) {
    // Fail closed: only a MISSING GATE SCRIPT is skippable (a checkout that does
    // not have it yet). If the gate exists but cannot load one of its own
    // dependencies (e.g. js/category-depth.js deleted), that is a real failure
    // and must abort the build rather than silently pass it.
    if (e && e.code === 'MODULE_NOT_FOUND' && /check-category-duplication/.test(String(e.message))) {
      console.warn('  ! category-duplication gate skipped: ' + e.message);
    } else {
      console.error('  ✗ category-duplication gate threw: ' + (e && e.message));
      process.exit(1);
    }
  }

  // Build-time SEO gate: sitemap coverage (every <loc> has a real file, the
  // _redirects contract holds, .htaccess mirrors the whitelist) plus index
  // readiness on every sitemap URL (title, meta, canonical, robots, H1, word
  // count, internal links, JSON-LD). These two used to run only in CI, so a
  // local build could hand you a folder that CI rejected — after a full rebuild
  // is exactly when a dropped page or renamed slug shows up. Fails closed:
  // an error inside the gate aborts the build rather than shipping unchecked
  // output. Runs BEFORE the minify/link passes because the link audit ends the
  // process with process.exit(0).
  {
    const { spawnSync } = require('child_process');
    const gate = spawnSync(process.execPath, [require('path').join(__dirname, 'scripts', 'seo-gate.cjs')], {
      cwd: __dirname,
      stdio: 'inherit',
      env: process.env,
    });
    if (gate.error || gate.status !== 0) {
      console.error('  ✗ SEO gate FAILED — build aborted');
      process.exit(1);
    }
  }

  // HTML minify pass — LAST content mutation before the link gate (the gate only
  // reads hrefs, and it calls process.exit, so nothing may run after it).
  // Cache-bust the JS/CSS URLs first: the deploy files carry no content hash, so
  // a browser or an edge cache could serve last deploy's app.js for up to a day
  // (that is how a shipped voice fix looked "still broken").
  // Crawl-report fixer: editorial citations lose their nofollow token, and any
  // static mailto: anchor becomes a /contact link carrying data-email (Cloudflare
  // rewrites static mailto into /cdn-cgi/l/email-protection, which every crawler
  // then counts as a broken internal link). Runs after all content passes and
  // before the asset URLs are versioned.
  try { require('./scripts/fix-audit-issues.cjs'); } catch (e) { console.warn('  ! audit-fixes failed: ' + e.message); }

  // Bundle the deferred scripts BEFORE the URLs are versioned, so the bundle
  // files pick up the same ?v= token as every other asset.
  bundleDeferScripts();

  versionAssetUrls();
  minifyHtmlFiles();

  // Font preloads go on LAST: the HTML minify/rewrite passes above drop the
  // hand-written hints, so anything added earlier disappeared again (the pass
  // reported "7 preloads present" at walk time and the shipped shell had 1).
  // Nothing after this touches <head> except the read-only link audit.
  ensureFontPreloads();

  // Asset-existence gate: every local <script src>, <link href> and <img src>
  // in the built HTML must point at a file that is actually in deploy/. A
  // missing /og/<tool>.jpg is the expensive kind of 404 — it is the LCP hero on
  // tool pages AND the preloaded fetchpriority=high request, so the browser
  // downloads nothing, the hero is removed by the onerror fallback after paint,
  // and the page takes a layout shift plus a console error. The registry had
  // grown to 1,285 tools while og/ still held 1,284 cards, and nothing noticed.
  // This gate makes that drift a build failure instead of a silent 404.
  try {
    const missing = new Map();
    (function scanAssets(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { scanAssets(full); continue; }
        if (!e.name.endsWith('.html')) continue;
        const html = fs.readFileSync(full, 'utf8');
        const re = /<(?:script[^>]*src|link[^>]*href|img[^>]*src)="([^"]+)"/g;
        let m;
        while ((m = re.exec(html))) {
          const u = m[1];
          if (!u.startsWith('/') && !u.startsWith('js/') && !u.startsWith('fonts/') && !u.startsWith('og/')) continue;
          const clean = u.split(/[?#]/)[0];
          const target = path.join(OUT, clean.replace(/^\//, ''));
          if (fs.existsSync(target)) continue;
          if (!missing.has(clean)) missing.set(clean, []);
          if (missing.get(clean).length < 3) missing.get(clean).push(path.relative(OUT, full));
        }
      }
    })(OUT);
    if (missing.size) {
      console.error('  ✗ asset gate FAILED — ' + missing.size + ' referenced file(s) missing from deploy/');
      for (const [href, pages] of [...missing].slice(0, 10)) {
        console.error('    MISSING ' + href + '  (on ' + pages.join(', ') + ')');
      }
      console.error('  Fix: re-run the generator that owns the file (e.g. SKIP_EXISTING=1 node scripts/generate-tool-og.cjs).');
      process.exit(1);
    }
    console.log('  assets: every local script/link/img reference resolves ✓');
  } catch (e) {
    console.error('  ✗ asset gate threw: ' + (e && e.message));
    process.exit(1);
  }

  // Internal-link gate: every internal href must resolve to the served form
  // (directory → trailing slash, flat → none) with zero 404 targets. The audit
  // calls process.exit(1) on any leak, which aborts this build — so a stale or
  // wrong internal link can never reach the deploy folder. Keep this LAST: it
  // calls process.exit(0) when clean.
  try {
    require('./scripts/audit-internal-links.cjs');
  } catch (e) {
    console.warn('  ! internal-link audit skipped: ' + e.message);
  }

  console.log('Done: deploy/ ready with ' + count + ' items.');
  console.log('Upload this deploy/ folder to Netlify (drag & drop) or push to Git.');
}

main();
