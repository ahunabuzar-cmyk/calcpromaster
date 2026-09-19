#!/usr/bin/env node
/**
 * check-cluster-links.cjs — asserts the C1–C8 cluster topology is real:
 *   1. every hub/spoke slug in js/cluster-map.js exists in sitemap.xml
 *      (catches typos and renamed tools at CI time, before deploy)
 *   2. every SPOKE's prerendered page links to its HUB  (≥1 hub link)
 *   3. every HUB's prerendered page links to ≥2 of its spokes
 * Run after `npm run deploy:build`. Exit 1 = cluster map and site have drifted.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const clusters = require(path.join(ROOT, 'js', 'cluster-map.js'));

let failures = 0;
const fail = (msg) => { failures++; console.error('  FAIL ' + msg); };
const pass = (msg) => console.log('  ok   ' + msg);

// ---------- 1. map ↔ sitemap ----------
const sitemap = fs.readFileSync(path.join(DEPLOY, 'sitemap.xml'), 'utf8');
const urls = new Set();
for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  urls.add(m[1].replace(/^https?:\/\/[^/]+/, ''));
}
let slugs = 0;
for (const c of clusters) {
  for (const key of [c.hub, ...c.spokes]) {
    slugs++;
    if (!urls.has('/' + key)) fail(`cluster ${c.id}: /${key} not found in sitemap.xml`);
  }
}
if (!failures) pass(`all ${slugs} cluster slugs exist in sitemap.xml`);

// ---------- 2/3. links present on prerendered pages ----------
const pageFile = (key) => {
  // deploy tree holds both layouts: guides as <key>.html, tool pages extensionless
  const base = key.replace('/', path.sep);
  const asFile = path.join(DEPLOY, base + '.html');
  if (fs.existsSync(asFile) && fs.statSync(asFile).isFile()) return asFile;
  const asDir = path.join(DEPLOY, base);
  if (fs.existsSync(asDir)) {
    if (fs.statSync(asDir).isFile()) return asDir;
    const idx = path.join(asDir, 'index.html');
    if (fs.existsSync(idx)) return idx;
  }
  return null;
};
const hasLink = (html, key) => html.includes('href="/' + key + '"');

let spokeChecked = 0, hubChecked = 0;
for (const c of clusters) {
  // spokes → hub
  for (const spoke of c.spokes) {
    const f = pageFile(spoke);
    if (!f) { fail(`cluster ${c.id}: no prerendered page for spoke /${spoke}`); continue; }
    spokeChecked++;
    const html = fs.readFileSync(f, 'utf8');
    if (!hasLink(html, c.hub)) fail(`cluster ${c.id}: spoke /${spoke} has no link to hub /${c.hub}`);
  }
  // hub → ≥2 spokes
  const hf = pageFile(c.hub);
  if (!hf) { fail(`cluster ${c.id}: no prerendered page for hub /${c.hub}`); continue; }
  hubChecked++;
  const html = fs.readFileSync(hf, 'utf8');
  const links = c.spokes.filter(s => hasLink(html, s)).length;
  if (links < Math.min(2, c.spokes.length)) {
    fail(`cluster ${c.id}: hub /${c.hub} links only ${links} of ${c.spokes.length} spokes (need ≥2)`);
  }
}
if (failures === 0) {
  pass(`${spokeChecked} spokes carry a hub link; ${hubChecked} hubs carry ≥2 spoke links`);
} else {
  console.error(`\n${failures} cluster-link failure(s). Rebuild with \`npm run deploy:build\` after fixing js/cluster-map.js.`);
}
process.exit(failures ? 1 : 0);
