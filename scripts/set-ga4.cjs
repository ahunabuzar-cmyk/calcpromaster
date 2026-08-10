// ============================================================
// CalcProMaster — One-command GA4 Measurement ID setup
// ------------------------------------------------------------
// Updates js/site-config.js with your REAL GA4 Measurement ID
// (+ the live GSC code), rebuilds deploy/, deploys to Netlify,
// and verifies the LIVE site.
//
// Usage:
//   node scripts/set-ga4.cjs G-AB12CD34EF5
//
// Requires: Netlify CLI auth (./node_modules/.bin/netlify status)
// Exits non-zero if the ID format is invalid or deploy fails.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CONFIG = path.join(ROOT, 'js', 'site-config.js');
const GSC_CODE = 'googled1ac20b54b36e7cf'; // already live (HTML file + meta tag)

const id = (process.argv[2] || '').trim();

// Validate GA4 Measurement ID format: G- followed by >=6 alphanumerics,
// and reject any placeholder-like value (3+ consecutive X's).
if (!/^G-[A-Z0-9]{6,}$/.test(id) || /X{3,}/.test(id)) {
  console.error('❌ Invalid Measurement ID: "' + id + '"');
  console.error('   Expected format: G-XXXXXXXXXX (e.g. G-AB12CD34EF5)');
  console.error('   Copy it from: analytics.google.com → Admin → Data streams → your stream → Measurement ID');
  process.exit(1);
}

let src = fs.readFileSync(CONFIG, 'utf8');

// 1. Set ga4Id (single source of truth in SITE_CONFIG)
//    NOTE: multiline anchor `^(\s*)` + /m — comment examples (`e.g. ga4Id: ''`)
//    ko kabhi match nahi karta, sirf REAL object field ko.
if (!/^\s*ga4Id:\s*'[^']*'/m.test(src)) {
  console.error('❌ Could not find ga4Id field in js/site-config.js');
  process.exit(1);
}
src = src.replace(/^(\s*)ga4Id:\s*'[^']*'/m, "$1ga4Id: '" + id + "'");

// 2. Set gsc code too (verification already live; keeps config complete)
if (/^\s*gsc:\s*'[^']*'/m.test(src)) {
  src = src.replace(/^(\s*)gsc:\s*'[^']*'/m, "$1gsc: '" + GSC_CODE + "'");
}

fs.writeFileSync(CONFIG, src);
console.log('✅ js/site-config.js updated: ga4Id = ' + id + ' · gsc = ' + GSC_CODE);

// 3. Rebuild deploy/
console.log('\n🔨 Building deploy/ ...');
try {
  const out = execSync('node build-deploy.js', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const lines = out.trim().split('\n');
  console.log('   ' + lines.slice(-2).join('\n   '));
} catch (e) {
  console.error('❌ Build failed:\n' + (e.stderr || e.message).slice(0, 800));
  process.exit(1);
}

// 4. Deploy to Netlify (production)
//    execSync Windows pe cmd.exe se chalta hai — `./` forward-slash path cmd.exe
//    ko samajh nahi aata (`'.' is not recognized`). Backslash path do (cross-platform
//    safe: path.join darust `node_modules\.bin\netlify.cmd` banata hai).
console.log('\n🚀 Deploying to Netlify (production) ...');
try {
  const netlifyBin = process.platform === 'win32'
    ? path.join('node_modules', '.bin', 'netlify.cmd')
    : path.join('node_modules', '.bin', 'netlify');
  const out = execSync('"' + netlifyBin + '" deploy --dir=deploy --prod --json', { cwd: ROOT, encoding: 'utf8', timeout: 180000 });
  const m = out.match(/"deploy_id":\s*"([^"]+)"/);
  const u = out.match(/"url":\s*"([^"]+)"/);
  console.log('   deploy_id: ' + (m ? m[1] : '?'));
  console.log('   url: ' + (u ? u[1] : '?'));
} catch (e) {
  console.error('❌ Deploy failed:\n' + (e.stderr || e.message).slice(0, 800));
  console.error('   (Netlify CLI auth check: ./node_modules/.bin/netlify status)');
  process.exit(1);
}

// 5. Verify live
console.log('\n⏳ Waiting for CDN propagation (25s) ...');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await sleep(25000);
  const https = require('https');
  function get(p) {
    return new Promise((res, rej) => {
      https.get({ host: 'calcpromaster.netlify.app', path: p, timeout: 10000 }, (r) => {
        let d = ''; r.on('data', (c) => d += c); r.on('end', () => res({ s: r.statusCode, d }));
      }).on('error', rej);
    });
  }
  const cfg = await get('/js/site-config.js');
  const idx = await get('/');
  console.log('LIVE verification:');
  console.log('   homepage:', idx.s, '| meta tag:', /googled1ac20b54b36e7cf/.test(idx.d) ? 'yes' : 'no');
  console.log('   site-config.js:', cfg.s, '| ga4Id deployed:', cfg.d.includes(id) ? 'YES ✓' : 'NO ✗');
  console.log('   gtag loader live:', idx.d.includes('googletagmanager.com/gtag/js') ? 'YES ✓' : 'NO ✗');
  console.log('\n🏁 Done. GA4 Realtime report mein ab page views + calculator_use events aane chahiye.');
  console.log('   (Analytics mein data 24-48h baad standard reports mein aayega.)');
})();
