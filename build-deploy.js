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

const DIRS = ['js', 'og', 'fonts']; // copyDir('js') recurses into data/ + workers/; 'og' holds per-tool share cards; 'fonts' = self-hosted latin woff2 (no third-party font fetch)

// Safety guard: refuse to deploy if any private/dev folders leak into OUTPUT dir.
const FORBIDDEN_IN_DEPLOY = ['.freebuff', 'node_modules', '.git', 'calcpro-next', 'tests', 'scripts', '.db', '.sqlite'];

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

// Read the production domain from js/site-config.js — the SINGLE source of
// truth. When the user switches to a custom domain they edit ONE file;
// this step rewrites every hardcoded calcpromaster.netlify.app reference in
// deploy/ (index.html canonical/OG/schema, sitemap.xml, og-image.html) so
// the shipped bundle is always domain-consistent (Phase 7 readiness).
function substituteDomain() {
  const cfgPath = path.join(ROOT, 'js', 'site-config.js');
  let domain = null;
  try {
    const cfg = fs.readFileSync(cfgPath, 'utf8');
    const m = cfg.match(/domain:\s*'([^']+)'/);
    if (m && m[1]) domain = m[1];
  } catch (e) { /* fall through */ }
  if (!domain) { console.warn('  ! domain not found in site-config.js — using default'); return; }
  // robots.txt's Sitemap: line is also domain-sensitive — a stale sitemap URL
  // would make GSC fetch the wrong file after a custom-domain switch.
  const targets = ['index.html', 'sitemap.xml', 'og-image.html', 'robots.txt'];
  for (const f of targets) {
    const p = path.join(OUT, f);
    if (!fs.existsSync(p)) continue;
    let html = fs.readFileSync(p, 'utf8');
    const before = (html.match(/calcpromaster\.netlify\.app/g) || []).length;
    if (before === 0) continue;
    html = html.replace(/calcpromaster\.netlify\.app/g, domain);
    fs.writeFileSync(p, html);
    console.log('  domain: ' + f + ' → ' + domain + ' (' + before + ' refs rewritten)');
  }
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

  // Rewrite hardcoded domains in deploy/ to the configured production domain.
  substituteDomain();

  // Static Site Generation (SSG): prerender EVERY route in sitemap.xml as a
  // real static HTML file (deploy/<cat>/<tool>/index.html etc.) with unique
  // title/meta/canonical/JSON-LD + full crawlable content, using the built
  // deploy/index.html as the hydrated SPA shell. Netlify's `/* /index.html 200`
  // rewrite never shadows existing static files (documented Shadowing), so
  // these pages win automatically with zero extra redirect rules.
  try {
    require('./scripts/ssg-pages.cjs');
  } catch (e) {
    console.warn('  ! SSG skipped: ' + e.message);
  }

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
  console.log('Done: deploy/ ready with ' + count + ' items.');
  console.log('Upload this deploy/ folder to Netlify (drag & drop) or push to Git.');
}

main();
