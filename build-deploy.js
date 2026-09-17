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
  'privacy.html',
  'terms.html',
  'og-image.html',
  'qa-dashboard.html',
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

const DIRS = ['js', 'og', 'fonts', 'guides', 'blog']; // copyDir('js') recurses into data/ + workers/; 'og' holds per-tool share cards; 'fonts' = self-hosted latin woff2 (no third-party font fetch); 'guides' = static educational guide pages; 'blog' = static blog posts

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

function validateJsonLd(htmlPath) {
  // Prevent silent structured-data breakage: every application/ld+json block
  // must parse as valid JSON or the build fails (missing commas etc.).
  const html = fs.readFileSync(htmlPath, 'utf8');
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m, count = 0;
  while ((m = re.exec(html))) {
    count++;
    try {
      JSON.parse(m[1]);
    } catch (e) {
      console.error('  ! JSON-LD INVALID in ' + htmlPath + ': ' + e.message);
      process.exit(1);
    }
  }
  if (count > 0) console.log('  JSON-LD: ' + count + ' block(s) valid ✓');
}

// Minify deploy JS/CSS (whitespace + comments only — top-level identifiers
// are PRESERVED so external wiring like data-tool attributes, global function
// lookups and cross-file references stay byte-compatible). Verified by a
// round-trip check: minified output must still contain every top-level
// identifier found in the source; falls back to unminified on any doubt.
function minifyDeployAssets() {
  // Byte-safe "light minifier": strips comments and indentation while
  // tracking string/template state character-by-character. Inline `//` after
  // code is LEFT ALONE (regex-literal hazard), only full-line comments and
  // block comments go. No quote normalization, no syntax transforms — a
  // string-heavy data file survives byte-for-byte except for removed
  // comments/whitespace. A strict guard additionally verifies every quoted
  // string survived; any file failing the guard ships unminified.
  const stripLines = (src, isCss) => {
    const lines = src.split('\n');
    const outL = [];
    let inStr = null; // '", or `
    let inBlock = false; // /* */ comment
    for (const raw of lines) {
      let line = '';
      let i = 0;
      while (i < raw.length) {
        const c = raw[i];
        if (inBlock) {
          if (c === '*' && raw[i + 1] === '/') { inBlock = false; i += 2; }
          else i++;
          continue;
        }
        if (inStr) {
          line += c;
          if (c === '\\') { line += raw[i + 1] || ''; i += 2; continue; }
          if (c === inStr) inStr = null;
          i++;
          continue;
        }
        if (!isCss && (c === '"' || c === "'" || c === '`')) { inStr = c; line += c; i++; continue; }
        if (isCss && (c === '"' || c === "'")) { inStr = c; line += c; i++; continue; }
        // JS: a COMMENT-ONLY line (only whitespace before //) is dropped —
        // handles comment lines containing '/*'-like text such as (js/data/*.js)
        // which falsely opened a block. Code lines with inline // are LEFT
        // ALONE: a regex literal like /https?:\/\/./ would be truncated.
        if (!isCss && c === '/' && raw[i + 1] === '/' && !line.trim()) break;
        if (c === '/' && raw[i + 1] === '*') { inBlock = true; i += 2; continue; }
        line += c;
        i++;
      }
      const t = line.replace(/\s+$/, '');
      if (!t) continue; // blank
      if (!inBlock && !inStr && !isCss && /^\/\//.test(t.trim())) continue; // full-line comment
      if (!inBlock && !inStr && isCss && /^\/\//.test(t.trim())) continue;
      outL.push(t.replace(/^\s+/, ''));
    }
    return outL.join('\n');
  };
  let saved = 0, files = 0, failed = 0;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      const isJs = e.name.endsWith('.js') && e.name !== 'sw.js';
      const isCss = e.name.endsWith('.css');
      if (!isJs && !isCss) continue;
      const src = fs.readFileSync(full, 'utf8');
      // Skip files that look already-minified (single very long line)
      const lines0 = src.split('\n');
      const avgLen = src.length / Math.max(lines0.length, 1);
      if (avgLen > 200) continue;
      try {
        const min = stripLines(src, isCss);
        if (min.length >= src.length) continue; // no win, keep original
        // Guard: minified source must still be structurally valid —
        // JS files must parse (new Function compiles without running),
        // CSS must have balanced braces. Any failure ships unminified.
        if (isCss) {
          const open = (min.match(/{/g) || []).length;
          const close = (min.match(/}/g) || []).length;
          if (open !== close) {
            console.warn('  ! minify guard: ' + e.name + ' unbalanced braces — kept original');
            failed++;
            continue;
          }
        } else {
          try { new Function(min); } catch (err) {
            console.warn('  ! minify guard: ' + e.name + ' parse failed — kept original');
            failed++;
            continue;
          }
        }
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
      if (prev && next && !/[{};:,()]/.test(prev) && !/[{};:,()]/.test(next)) {
        out += ' ';
      }
      continue;
    }
    out += c;
    i++;
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

function main() {
  console.log('Building deploy/ ...');
  validateJsonLd(path.join(ROOT, 'index.html'));
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

  console.log('Done: deploy/ ready with ' + count + ' items.');
  console.log('Upload this deploy/ folder to Netlify (drag & drop) or push to Git.');
}

main();
