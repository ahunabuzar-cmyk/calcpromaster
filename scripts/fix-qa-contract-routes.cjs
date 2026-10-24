#!/usr/bin/env node
// ============================================================
// CalcProMaster — repair stale `route` fields in docs/qa-contracts.json
// ------------------------------------------------------------
// Every QA contract records the page its formula lives on, so a reviewer can open
// the route and check the maths. Measured 2026-10-18: 336 of 1285 contracts pointed
// at a path that does not exist in deploy/sitemap.xml — mostly category renames
// (/auto-transport/car-insurance → /auto/car-insurance, /home-garden/tile-grout →
// /homegarden/tile-grout). Following such a route lands on a 404 or a redirect, so
// the traceability the field exists for was broken for a quarter of the registry.
//
// The calculator id is unique and is the last segment of the real route, so the
// repair is mechanical: look the id up in the sitemap and write back the path that
// actually ships. Anything that cannot be matched is reported, never guessed.
//
// Usage: node scripts/fix-qa-contract-routes.cjs [--check]
//   --check : report only, exit 1 when something is stale (CI/verification)
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'docs', 'qa-contracts.json');
const SITEMAP = path.join(ROOT, 'deploy', 'sitemap.xml');
const CHECK = process.argv.includes('--check');

function sitemapPaths() {
  if (!fs.existsSync(SITEMAP)) {
    console.error('missing ' + path.relative(ROOT, SITEMAP) + ' — run: node build-deploy.js');
    process.exit(2);
  }
  const xml = fs.readFileSync(SITEMAP, 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(/^https?:\/\/[^/]+/, '').replace(/\/+$/, '') || '/');
}

const doc = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const contracts = Array.isArray(doc) ? doc : (doc.contracts || doc.calculators || []);
const paths = sitemapPaths();
const valid = new Set(paths);

// id → route for the two-segment tool pages (/category/tool).
const byId = new Map();
for (const p of paths) {
  const parts = p.split('/').filter(Boolean);
  if (parts.length === 2 && !byId.has(parts[1])) byId.set(parts[1], p);
}

const stale = [];
const unmatched = [];
for (const c of contracts) {
  const id = String(c.calculatorId || c.id || '');
  if (!id) continue;
  const route = c.route == null ? null : String(c.route).replace(/\/+$/, '');
  if (route && valid.has(route)) continue;
  const real = byId.get(id);
  if (real) stale.push({ id, route, real, c });
  else unmatched.push({ id, route });
}

console.log('qa-contract routes');
console.log('  contracts        : ' + contracts.length);
console.log('  route missing/bad: ' + stale.length + (stale.length ? '  (repairable from the sitemap)' : ''));
console.log('  unmatched ids    : ' + unmatched.length);
for (const u of unmatched.slice(0, 20)) console.log('    ! ' + u.id + ' → ' + (u.route || '(no route)'));

if (CHECK) {
  if (stale.length || unmatched.length) {
    console.log('\n✖ ' + (stale.length + unmatched.length) + ' contract route(s) do not resolve to a shipped page');
    process.exit(1);
  }
  console.log('\n✅ every QA-contract route resolves to a URL that ships');
  process.exit(0);
}

if (!stale.length) {
  console.log('\n✅ nothing to repair');
  process.exit(0);
}

for (const s of stale) s.c.route = s.real;
// Keep the file's existing shape: scripts/quality-gate.cjs reads either an array or
// { contracts | calculators }, and every other writer in this repo uses 1-space JSON.
fs.writeFileSync(FILE, JSON.stringify(doc, null, 1) + '\n');
console.log('\n✅ repaired ' + stale.length + ' route field(s)');
for (const s of stale.slice(0, 8)) console.log('   ' + s.id + ': ' + (s.route || '(none)') + ' → ' + s.real);
if (stale.length > 8) console.log('   … and ' + (stale.length - 8) + ' more');
