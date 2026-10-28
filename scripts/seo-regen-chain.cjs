#!/usr/bin/env node
// ============================================================
// CalcProMaster — SEO copy regen chain (one command)
// ------------------------------------------------------------
// Regenerating the SEO copy is a three-step pipeline, and every step is
// mandatory. Running only the first one used to leave the tree in a state that
// shipped broken copy (measured 2026-10-11: 815 placeholder findings), and
// js/seo/*.js — the chunks the runtime actually loads — were left stale on top
// of that. The steps, in order:
//
//   1. scripts/seo-regen-v5.cjs      → js/seo-content.js (raw engine output)
//                                      + delegates the intros to the one owner
//   2. scripts/apply-seo-overrides.cjs → CTR overrides + raw-result label repairs
//   3. scripts/split-seo.cjs         → js/seo/*.js per-category chunks
//   4. scripts/audit-seo-placeholders.cjs → the gate: must print 0 findings
//
// A step that fails stops the chain, and a chain that ends with any finding
// exits 1 — a regen that is not clean is not committable. The run also reports
// how many titles/meta descriptions/answer blocks changed against the file that
// was on disk before it started, so the diff can be reviewed before committing.
//
// This does NOT reproduce an older committed js/seo-content.js byte for byte:
// the engine has moved on since the last regen. It guarantees the new one is
// defect-free and internally consistent (intros, overrides, chunks, counts).
//
// Usage: node scripts/seo-regen-chain.cjs      (npm run seo:regen)
// Next : node build-deploy.js                  (deploy:build)
// ============================================================
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'js', 'seo-content.js');

// Read an entry set off disk without trusting it: a half-written file is a
// report, not a crash.
function loadSeo(file) {
  try {
    const src = fs.readFileSync(file, 'utf8');
    const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox);
    return sandbox.window.TOOL_SEO || {};
  } catch (e) {
    return null;
  }
}

const STEPS = [
  ['SEO entries + intros', 'seo-regen-v5.cjs'],
  ['CTR overrides + label repairs', 'apply-seo-overrides.cjs'],
  // The B/C/D keyword-target answers live in the same generated file, so a
  // regen that skips this step silently drops them (measured 2026-10-17: all
  // 85 improved rows lost their rendered FAQ until this step was added).
  ['keyword-target answers (B/C/D rows)', 'apply-keyword-targets.cjs'],
  // The keyword-target step re-emits the engine's copy for every row it patches,
  // so it puts the engine's generic headings back and undoes step 2 for those
  // entries: measured 2026-10-27, `seo:overrides:check` failed on 12 entries and
  // 11 tool pages had lost their name-carrying <h2> (site-wide identical
  // headings on those pages, which is the duplicate-boilerplate problem the
  // naming exists to remove). Both passes are idempotent, so re-asserting the
  // overrides after the keyword rows leaves the CTR overrides, the label repairs
  // and the named headings all in place, and makes the checked-in file the file
  // the gate expects.
  ['CTR overrides re-applied (so the keyword rows cannot undo step 2)', 'apply-seo-overrides.cjs'],
  ['per-category chunks (js/seo/*.js)', 'split-seo.cjs'],
  // Two artefacts are built FROM js/seo-content.js (the public changelog and the
  // Top-10 push list) and build-deploy's staleness gate fails the build when
  // either is older than it (measured 2026-10-27: BUILD_EXIT=1 after a clean
  // regen, "2 published artifact(s) older than their data"). Refreshing them used
  // to be a manual follow-up nobody could guess from the chain's own output, so
  // the chain that rewrites seo-content.js now refreshes everything derived from
  // it and the next command is just `node build-deploy.js`.
  ['public changelog (derived from seo-content.js)', 'build-changelog.cjs'],
  ['Top-10 push list (derived from seo-content.js)', 'build-top10-push-list.cjs']
];

const before = loadSeo(SRC);
const started = Date.now();

STEPS.forEach(([label, script], i) => {
  console.log('\n──────── [' + (i + 1) + '/' + (STEPS.length + 1) + '] ' + label + ' ────────');
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', script)], { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.error('\n✖ ' + script + ' failed — chain stopped, nothing further was written.');
    process.exit(1);
  }
});

const after = loadSeo(SRC);
if (before && after) {
  const ids = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed = { title: 0, metaDesc: 0, aeo: 0 };
  for (const id of ids) {
    const x = before[id] || {};
    const y = after[id] || {};
    if (x.title !== y.title) changed.title++;
    if (x.metaDesc !== y.metaDesc) changed.metaDesc++;
    if (JSON.stringify(x.aeo) !== JSON.stringify(y.aeo)) changed.aeo++;
  }
  console.log('\nchanged against the file that was on disk before this run:');
  console.log('  ' + changed.title + ' titles · ' + changed.metaDesc + ' meta descriptions · ' + changed.aeo + ' answer blocks');
}

console.log('\n──────── [' + (STEPS.length + 1) + '/' + (STEPS.length + 1) + '] placeholder audit (gate) ────────');
let auditOk = true;
try {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'audit-seo-placeholders.cjs')], { cwd: ROOT, stdio: 'inherit' });
} catch (e) {
  auditOk = false;
}

const secs = Math.round((Date.now() - started) / 1000);
if (!auditOk) {
  console.error('\n✖ the regenerated copy still has defects — see data/seo-placeholder-audit.json. Do not commit it.');
  process.exit(1);
}
console.log('\n✅ regen chain done in ' + secs + 's — 0 findings across P1-P10.');
console.log('   Next: node build-deploy.js   (rebuild deploy/, then re-run the gates)');
