// ============================================================
// CalcProMaster — SINGLE SOURCE OF TRUTH for calculator counts
//
// The calculator REGISTRY (js/data/*.js, loaded via require()) is the
// ONLY authoritative source of the tool count. Every user-facing number
// ("543+ calculators", "544+ tools", "566 tools") that is hardcoded in
// static files must match the registry — otherwise pages fight each other
// in search and marketing copy lies to users.
//
// Usage:
//   node scripts/sync-counts.cjs          → rewrite all hardcoded counts
//   node scripts/check-counts.cjs         → CI gate (exit 1 on mismatch)
//   node scripts/sync-counts.cjs --check  → same as check-counts
//
// Wired into: npm run audit (check) and build-deploy.js (sync).
// ============================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ---- 1. Compute the REAL count from the registry (require-based) ----
function registryCount() {
  const dir = path.join(ROOT, 'js', 'data');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  let total = 0;
  const perFile = {};
  for (const file of files) {
    // data files export the tools array via module.exports (browser uses window)
    const mod = require(path.join(dir, file));
    const arr = Array.isArray(mod) ? mod : [];
    perFile[file] = arr.length;
    total += arr.length;
  }
  return { total, perFile, files: files.length };
}

// ---- 2. Files that must stay in sync with the registry ----
const FILES = [
  'index.html',
  'about.html',
  'og-image.html',
  'js/data.js',
  'js/tool-intros.js',
  'js/seo-content.js',
  'js/seo-premium.js',
];

// Patterns that identify a user-facing count reference. The captured
// number must equal the registry count. We only touch "5XX+" / "5XX "
// references that appear next to calculator/tool words, never pixels,
// years, or arbitrary numbers.
const COUNT_RE = /(\b5\d{2}\+?\s*(calculators?|tools?|free\s+[\w\s]*?online\s+calculators?|calculators?[,\s]|tools?[,\s])|"numberOfItems":\s*"5\d{2}\+?")/gi;

// Extra targeted fixes for awkward phrasings not caught above.
function fixKnownStrings(content, n) {
  return content
    .replace(/\b5\d{2}\+?\s*calculators?/gi, n + '+ calculators')
    .replace(/\b5\d{2}\+?\s*tools?/gi, n + '+ tools')
    .replace(/\b5\d{2}\+?\s*free\s+[\w\s]*?online\s+calculators?/gi, n + '+ free online calculators')
    .replace(/\b5\d{2}\+?\s*free\s+calculators?/gi, n + '+ free calculators')
    .replace(/"numberOfItems":\s*"5\d{2}\+?"/g, '"numberOfItems": "' + n + '+"');
}

// ---- 3. Sync / check ----
function scanFile(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return { rel, missing: true };
  const original = fs.readFileSync(abs, 'utf8');
  const findings = [];
  let m;
  const re = new RegExp(COUNT_RE.source, COUNT_RE.flags);
  while ((m = re.exec(original)) !== null) {
    // pull the actual 5XX number out of the raw match (works for
    // "544+ calculators" AND '"numberOfItems": "544+"').
    const nm = m[0].match(/5\d{2}/);
    findings.push({ num: nm ? parseInt(nm[0], 10) : NaN, raw: m[0].trim().slice(0, 60) });
  }
  return { rel, abs, original, findings, missing: false };
}

function main() {
  const isCheck = process.argv.includes('--check') || /check-counts/.test(process.argv[1] || '');
  const { total, perFile } = registryCount();
  console.log(`Registry: ${total} calculators across ${Object.keys(perFile).length} data files`);
  let drift = 0;

  for (const rel of FILES) {
    const res = scanFile(rel);
    if (res.missing) { console.log(`  ⚠ SKIP (missing): ${rel}`); continue; }
    let text = res.original;
    let changed = false;
    const bad = [];
    for (const f of res.findings) {
      if (f.num !== total) { bad.push(`${f.num} (${f.raw})`); }
    }
    if (bad.length) {
      drift++;
      console.log(`  ✗ ${rel}: hardcoded counts do NOT match registry → ${bad.join(', ')}`);
    }
    if (!isCheck) {
      const updated = fixKnownStrings(text, total);
      if (updated !== text) {
        fs.writeFileSync(res.abs, updated, 'utf8');
        changed = true;
      }
    }
    if (changed) console.log(`  ✓ ${rel}: counts synced to ${total}+`);
    else if (!bad.length) console.log(`  ✓ ${rel}: consistent`);
  }

  // ---- 3. site-config runtime total (lazy ALL_TOOLS on calc pages) ----
  const cfgPath = path.join(ROOT, 'js', 'site-config.js');
  if (fs.existsSync(cfgPath)) {
    const cfgSrc = fs.readFileSync(cfgPath, 'utf8');
    const cfgRe = /(totalCalculators:\s*)\d+/;
    const cfgMatched = cfgSrc.match(cfgRe);
    if (!cfgMatched) {
      console.error('❌ site-config.js: totalCalculators field missing — add it.');
      process.exit(1);
    }
    const cfgNum = parseInt(cfgMatched[1] ? cfgSrc.slice(cfgMatched.index + cfgMatched[1].length, cfgMatched.index + cfgMatched[0].length) : cfgMatched[0], 10);
    if (cfgNum !== total) {
      drift++;
      console.log(`  ✗ js/site-config.js: totalCalculators=${cfgNum} does NOT match registry ${total}`);
      if (!isCheck) {
        fs.writeFileSync(cfgPath, cfgSrc.replace(cfgRe, `$1${total}`), 'utf8');
        console.log(`  ✓ js/site-config.js: totalCalculators synced to ${total}`);
      }
    } else if (!isCheck) {
      console.log(`  ✓ js/site-config.js: totalCalculators consistent (${total})`);
    }
  }

  if (isCheck) {
    if (drift > 0) {
      console.error(`\n❌ COUNT DRIFT: ${drift} file(s) advertise a count that disagrees with the registry (${total}). Run "node scripts/sync-counts.cjs" then rebuild.`);
      process.exit(1);
    }
    console.log(`\n✅ All user-facing count references match the registry (${total}).`);
  }
}

main();
