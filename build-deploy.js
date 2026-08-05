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
  'styles.css',
  'sw.js',
  'manifest.json',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
  'ads.txt',
  'icon.svg',
  'og-image.png',
  '_redirects',
  '_headers',
  '.htaccess',
  // IndexNow verification key — MUST stay public so Bing can verify
  '0e1100ec6bc9d4c2c6037d993fc2ba55.txt',
];

const DIRS = ['js']; // copyDir('js') already recurses into data/ + workers/ subdirs

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
const EXCLUDE_FILES = ['seo-content.js'];

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

function main() {
  console.log('Building deploy/ ...');
  validateJsonLd(path.join(ROOT, 'index.html'));
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

  // Auto-bump service-worker cache version from content hash of deploy bundle.
  // Removes manual sw.js edit before every deploy (old process was error-prone).
  (function bumpSwVersion() {
    const swPath = path.join(OUT, 'sw.js');
    if (!fs.existsSync(swPath)) return;
    const crypto = require('crypto');
    let hash = crypto.createHash('sha256');
    for (const f of FILES) {
      const p = path.join(OUT, f);
      if (fs.existsSync(p)) hash.update(fs.readFileSync(p));
    }
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
