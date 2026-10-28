#!/usr/bin/env node
// ============================================================
// CalcProMaster — keyword implementation map
// ------------------------------------------------------------
// Turns the keyword-gap audit (data/keyword-gap.json) into the deliverable
// docs/KEYWORD-IMPLEMENTATION-MAP.md: EVERY audited keyword gets exactly one
// decision, one target URL and one reason. Nothing may be dropped silently.
//
// Inputs (all read-only):
//   data/keyword-gap.json      — the audit (604 keywords, from scripts/audit-keyword-gap.cjs)
//   deploy/sitemap.xml         — which URLs exist in the current build
//   js/data/*.js + js/tool-intros.js — the live registry (ids, names, descriptions)
//
// Classification (A–E) and priority are RULE-BASED and printed with the rule that
// fired, so a wrong decision is inspectable rather than hidden. The rules never
// invent metrics: volume/difficulty/CPC come straight from the audit row, and a
// keyword with no row-level evidence is reported as such.
//
// Usage: node scripts/build-keyword-implementation-map.cjs [--json]
// Exit:  0 always (report); exit 1 if the audit file is missing.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sitemapDate } = require('./lib/sitemap-date.cjs');
const { MANUAL_TARGETS } = require('./lib/keyword-target-overrides.cjs');

const ROOT = path.join(__dirname, '..');
const GAP = path.join(ROOT, 'data', 'keyword-gap.json');
// Optional: the applier's per-row result, so the map's `status` column tells the
// truth about what is actually implemented rather than a blanket "not implemented".
const RESOLUTION = path.join(ROOT, 'data', 'keyword-target-resolution.json');
const SITEMAP = path.join(ROOT, 'deploy', 'sitemap.xml');
const OUT_MD = path.join(ROOT, 'docs', 'KEYWORD-IMPLEMENTATION-MAP.md');
const JSON_ONLY = process.argv.includes('--json');
// Deterministic provenance for both artifacts written below. `npm run
// keywords:check` regenerates them and then `git diff --exit-code`s them, so a
// wall-clock `new Date()` in the JSON made that gate fail on EVERY run no matter
// what was committed — which is why the check was being dismissed as
// "pre-existing noise" instead of doing its job. See
// scripts/lib/sitemap-date.cjs.
const SITEMAP_DATE = sitemapDate(ROOT) || 'unknown';

// Concepts whose answer depends on a LIVE EXTERNAL FEED (weather, a brand's own
// nutrition database, a venue's menu, a sports league's scoring table). The repo
// holds no such dataset, and rule 6 of the brief forbids fabricating values, so
// these are classified E (no implementation) even when the volume is high.
const NEEDS_EXTERNAL_DATA = [
  /snow day/, /\bchipotle\b/, /\bnetflix\b/, /\bstarbucks\b/, /\bmenu\b/, /\brestaurant\b/,
  /\bdynasty\b/, /\bfantasy\b/, /\bweather\b/, /\bflight\b/, /\bhotel\b/, /\bgas price/
];
// Concepts that need jurisdiction-specific rules we would have to invent.
const NEEDS_OFFICIAL_RULES = [/\bvisa\b/, /\bgreen card\b/, /\bpension rule\b/, /\bchild support\b/, /\balimony\b/];

// ---------- registry ----------
function loadRegistry() {
  const ctx = { window: {}, console };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  const dir = path.join(ROOT, 'js', 'data');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
  }
  const W = ctx.window;
  const tools = [];
  for (const k of Object.keys(W)) {
    if (/_TOOLS$/.test(k) && Array.isArray(W[k])) for (const t of W[k]) tools.push(t);
  }
  return tools;
}

function loadSitemap() {
  try {
    return new Set([...fs.readFileSync(SITEMAP, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => m[1].replace(/^https?:\/\/[^/]+/, '').replace(/\/+$/, '') || '/'));
  } catch (e) {
    return new Set();
  }
}

// Manual corrections where the token heuristics CANNOT see the overlap, each with
// the evidence that justifies it. Kept explicit so the reason is reviewable and
// the decision cannot drift silently. Verified against the live sitemap on
// 2026-10-13 (page present in deploy/sitemap.xml).
const CONCEPT_OVERRIDES = {
  // "ft2" (square feet) shares no token with "ft squared" (tokens ft, squared),
  // so equality-based clustering reported it as a new tool. The site already
  // ships /conversion/area/ ("Area Converter — convert between area units"),
  // which is where a sqft↔m² query belongs.
  'ft2 calculator': { page: '/conversion/area/', why: 'sq ft ↔ m² conversion is the Area Converter that already ships at /conversion/area/ (verified in deploy/sitemap.xml) — improve that page instead of adding an /<category>/ft2-calculator duplicate' },

  // ---- 2026-10-13: the ten remaining code-A rows resolved from repo evidence ----
  // Each entry was checked against the LIVE registry and deploy/sitemap.xml before
  // being written. Rule A fires when nothing matches, but A is a candidate signal,
  // not a build order: five of these are answered by an existing page, and five are
  // not calculation intents at all. Building ten new URLs would have created five
  // duplicates and five pages no searcher wants.

  // 1. Peptide tool shipped this campaign as /health/peptide-reconstitution/.
  'polypeptide calculator': { page: '/health/peptide-reconstitution/', why: 'the peptide calculator already ships as /health/peptide-reconstitution/ ("Peptide Reconstitution Calculator", verified in deploy/sitemap.xml) — the generic keyword points at that page; a second /<category>/polypeptide-calculator would duplicate one intent' },
  // 2. "simplify" = simplify fractions/ratios, which two live tools already do.
  'simplify calculator': { page: '/utilities/ratio-simplifier/', why: 'the "simplify" intent is already answered by the Ratio Simplifier (/utilities/ratio-simplifier/, "Simplify and work with ratios") and the Fraction Calculator (/math/fraction/, "Simplify and calculate fractions") — both verified live; improve metadata/internal links there' },
  // 3. FV is the standard finance abbreviation for future value.
  'fv calculator': { page: '/finance/future-value/', why: 'FV is the standard abbreviation for future value and the site ships /finance/future-value/ (Future Value Calculator, verified in deploy/sitemap.xml) — the acronym belongs on that page' },
  // 4. Date of birth -> exact age, which is a live tool.
  'dob calculator': { page: '/utilities/age-exact/', why: 'date-of-birth is the input to an age calculation, and /utilities/age-exact/ (Exact Age Calculator) plus /everyday/age/ already ship and are verified in the sitemap — no new page' },

  // 5-10. Not calculation intents: no page can honestly answer them.
  'open calculator': { code: 'E', why: 'navigational/OS-action intent ("open calculator" means launch the device app) — there is no calculation to build and no page can satisfy it' },
  'smart calculator': { code: 'E', why: 'ambiguous device/product term, not a calculation (difficulty 51) — the searcher wants a physical calculator or an app, so a templated page would be a thin mismatch' },
  'downloadable calculator': { code: 'E', why: 'software-download intent, not a calculation — the site is a browser tool with no installable build, so no page can answer it truthfully' },
  'show calculator': { code: 'E', why: 'navigational intent ("show calculator" = reveal the calculator UI) with no calculable answer' },
  'google math calculator': { code: 'E', why: 'branded intent for Google\u2019s own calculator — not our content to target and no unique calculation behind it' },
  'calculator that prints': { code: 'E', why: 'ambiguous device intent (difficulty 100) — it describes a physical printing calculator, not a calculation the site can compute' },

  // ---- 2026-10-13: the two P1 rows that clustered to D with NO target page ----
  // Clustering reported these as a shared-intent pair but neither row carried a
  // live URL, so the deliverable had a P1 item with nowhere to go. The generic
  // intent ("convert currency") is owned by a page that already ships; "xe" is a
  // competitor brand we do not target, and the target page's copy must not name it.
  'convert currency xe': { page: '/finance/currency-converter/', why: 'the generic intent behind the branded query (convert a currency) is owned by /finance/currency-converter/ ("Convert between 150+ currencies with live rates", verified in deploy/sitemap.xml); "xe" is the competitor brand, so improve that page\u2019s metadata/internal links and do not target the brand name' },
  'convert xe currency': { page: '/finance/currency-converter/', why: 'same intent as "convert currency xe" — word order only; both point at /finance/currency-converter/ (verified live) so one page owns the cluster, and no copy names the competitor brand' },

  // The token heuristic mapped "calendar calculator" to /guides/age via the
  // shared word "calendar" (from "age calendar"). The date-arithmetic intent is
  // served by a real date tool, which is the closer match.
  'calendar calculator': { page: '/everyday/date-diff/', why: 'the token heuristic attached this to /guides/age through the shared word "calendar" (from "age calendar"), but the calendar/date-arithmetic intent is served by /everyday/date-diff/ (verified in deploy/sitemap.xml) — improve that page instead' },

  // ---- 2026-10-27: the one code-A row left by the gap re-audit ----
  // Rule A fires when no title/slug states the keyword. It fired for "taxable
  // calculator" only because the wording is generic: the calculation it asks for
  // (tax on a taxable amount) is the Income Tax Bracket tool, which already ships
  // and is verified in deploy/sitemap.xml. A standalone /<category>/taxable-
  // calculator would state nothing new and duplicate that page's intent, so the
  // row points at the existing owner instead of ordering a build.
  'taxable calculator': { page: '/career/tax-bracket/', why: 'the taxable-amount → tax calculation is what /career/tax-bracket/ ("Income Tax Bracket Calculator") already does; the query is generic wording, not a new tool, so improve that page (metadata, FAQ, internal links) and do not build /<category>/taxable-calculator' }
};

// ---------- intent clustering ----------
// Two keywords share an intent when their normalised token sets are equal.
// Normalisation removes the generic tail ("calculator", "online", "free") and
// folds simple plurals, so "snow day calculator" == "snow days calculator".
const FILLER = new Set(['calculator', 'calculators', 'calc', 'tool', 'tools', 'online', 'free', 'the', 'a', 'an', 'for', 'of', 'to', 'in', 'my', 'how', 'much', 'what', 'is']);
function intentKey(kw) {
  return String(kw).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((t) => t && !FILLER.has(t))
    .map((t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t))
    .sort().join(' ');
}
function tokens(kw) {
  return String(kw).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t && !FILLER.has(t));
}

// Does some existing tool already answer this concept? Match on the concept's
// tokens against the tool id/name/description — an id/name hit is strong, a
// description-only hit is weak (recorded separately, never treated as coverage
// of a whole intent by itself).
function matchTool(kw, tools) {
  const tk = tokens(kw);
  if (!tk.length) return null;
  const strong = /^[a-z0-9-]+$/;
  let best = null;
  for (const t of tools) {
    const hay = [String(t.id || ''), String(t.name || '')].join(' ').toLowerCase();
    const hits = tk.filter((x) => hay.includes(x)).length;
    if (!hits) continue;
    const score = hits / tk.length + (tk.every((x) => hay.includes(x)) ? 1 : 0);
    if (!best || score > best.score) best = { id: t.id, name: t.name, score, hits, need: tk.length, idShape: strong.test(String(t.id)) };
  }
  return best;
}

function classify(row, cluster, tools, sitemap, liveByToken) {
  const kw = row.keyword;
  const ov = CONCEPT_OVERRIDES[String(kw).toLowerCase()];
  if (ov) return { code: ov.code || 'B', page: ov.page, why: ov.why };
  const onSitemap = (u) => u && sitemap.has(String(u).replace(/\/+$/, ''));
  const closest = row.closest || row.page || '';
  const closestLive = onSitemap(closest);
  const m = matchTool(kw, tools);

  if (NEEDS_EXTERNAL_DATA.some((re) => re.test(kw)))
    return { code: 'E', why: 'answer needs a live external feed the repo does not hold (rule: no fabricated values)' };
  if (NEEDS_OFFICIAL_RULES.some((re) => re.test(kw)))
    return { code: 'E', why: 'needs jurisdiction-specific official rules we cannot verify from the repo' };
  if (cluster.length > 1)
    return { code: 'D', why: 'shares one search intent with ' + (cluster.length - 1) + ' other keyword(s) in this audit — one page must own all of them' };
  if (m && m.hits === m.need)
    return { code: 'B', why: 'an existing registry tool already covers every concept token — improve that page, do not create a duplicate' };
  if (closest && closestLive)
    return { code: 'B', why: 'the audit maps this to the live page ' + closest + ' — improve that page (metadata/content/functionality), no new URL' };
  if (m)
    return { code: 'C', why: 'partial match with registry tool ' + m.id + ' (' + m.hits + '/' + m.need + ' concept tokens) — resolve by internal linking/metadata first' };
  if (closest && !closestLive && sitemap.size)
    return { code: 'B', why: 'audit points at ' + closest + ' which is NOT in the current sitemap — verify the route before building anything new' };
  // NEAR-SYNONYM GUARD. Token-equality clustering misses a candidate whose extra
  // word hides the shared concept (measured: "bank certificate calculator" and
  // "ft2 calculator" were reported as A while another audit row with the same
  // noun already maps to a LIVE page — "calculator for certificate of deposit"
  // → /finance/cd-calculator, "ft squared calculator" → C). If any concept token
  // of this keyword is carried by a row that already points at a live page, this
  // is not a new tool: it is that page's intent to win.
  for (const t of tokens(kw)) {
    const hit = liveByToken && liveByToken.get(t);
    if (hit) return { code: 'B', page: hit.page, why: 'shares the concept token "' + t + '" with "' + hit.keyword + '", which the audit already maps to the live page ' + hit.page + ' — improve that page instead of adding a near-duplicate calculator' };
  }
  return { code: 'A', why: 'no existing tool and no live page covers these concept tokens — candidate for a standalone calculator' };
}

function priorityFor(code, row, cluster) {
  if (code === 'E') return 'P3';
  if (code === 'A') return (row.volume || 0) >= 100000 ? 'P1' : 'P2';
  if (code === 'B') return (row.volume || 0) >= 50000 ? 'P1' : 'P2';
  if (code === 'C') return 'P2';
  if (code === 'D') return (row.volume || 0) >= 100000 ? 'P1' : 'P2';
  return 'P3';
}

function slugFor(kw) {
  return String(kw).toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

function main() {
  if (!fs.existsSync(GAP)) {
    console.error('missing ' + GAP + ' — run: node scripts/audit-keyword-gap.cjs');
    return 1;
  }
  const audit = JSON.parse(fs.readFileSync(GAP, 'utf8'));
  const tools = loadRegistry();
  const sitemap = loadSitemap();
  const rows = [].concat(
    (audit.gap || []).map((r) => ({ ...r, verdict: 'GAP' })),
    (audit.weak || []).map((r) => ({ ...r, verdict: 'WEAK' }))
  );

  const byIntent = new Map();
  for (const r of rows) {
    const k = intentKey(r.keyword);
    if (!byIntent.has(k)) byIntent.set(k, []);
    byIntent.get(k).push(r);
  }

  // Concept token → the audit row (with a LIVE page) that already owns it. Used by
  // the near-synonym guard so a candidate cannot become a new page while another
  // row for the same noun already has a live target.
  const liveByToken = new Map();
  for (const r of rows) {
    const page = r.closest || r.page || '';
    if (!page || !sitemap.has(String(page).replace(/\/+$/, ''))) continue;
    for (const t of tokens(r.keyword)) if (t.length > 2 && !liveByToken.has(t)) liveByToken.set(t, { keyword: r.keyword, page: page });
  }

  // The reviewed resolution table fills the target column for the rows whose own
  // rule stopped at "resolve by internal linking/metadata first". `route: null` is
  // an honest no-owner verdict, not a missing value.
  const applied = new Map();
  try {
    const rep = JSON.parse(fs.readFileSync(RESOLUTION, 'utf8'));
    for (const row of rep.rows || []) applied.set(row.keyword, row);
  } catch (e) { /* applier has not run yet — statuses stay as recorded */ }

  const decisions = rows.map((r) => {
    const cluster = byIntent.get(intentKey(r.keyword)) || [r];
    const c = classify(r, cluster, tools, sitemap, liveByToken);
    const slug = slugFor(r.keyword);
    const mt = MANUAL_TARGETS[String(r.keyword).toLowerCase()];
    const manualUrl = mt ? (mt.route ? String(mt.route).replace(/\/+$/, '') : '') : null;
    const baseUrl = c.code === 'A' ? '/<category>/' + slug : (c.page || r.closest || r.page || '');
    // An E row is a recorded "do not build" verdict (external feed, official rules,
    // device/navigational intent), so it must not carry a target URL at all: the
    // audit's `closest` page is the nearest *existing* page, not an owner, and
    // printing it made the map look like it wanted a build that the rule forbade
    // (caught by tests/unit/keyword-implementation-map.test.js).
    const proposedUrl = c.code === 'E' ? '' : (manualUrl !== null ? manualUrl : baseUrl);
    const done = applied.get(r.keyword);
    let status = 'not implemented — decision recorded, no page built yet';
    if (done && (done.status === 'IMPROVED' || done.status === 'ALREADY')) {
      status = 'implemented — keyword answered by a rendered FAQ on ' + done.resolvedTarget;
    } else if (done && done.status === 'NO_OWNER') {
      status = 'no implementation — ' + (mt ? mt.note : 'no page can own this intent');
    } else if (c.code === 'E') {
      status = 'no implementation — ' + c.why;
    }
    const why = mt && mt.route ? c.why + ' · resolved: ' + mt.note : (mt && !mt.route ? mt.note : c.why);
    return {
      keyword: r.keyword, volume: r.volume, difficulty: r.difficulty, cpc: r.cpc == null ? null : r.cpc,
      source: r.source, verdict: r.verdict, auditClosest: r.closest || r.page || '',
      cluster: cluster.map((x) => x.keyword), code: c.code, why,
      priority: priorityFor(c.code, r, cluster),
      proposedUrl,
      status,
      opportunity: r.opportunity
    };
  }).sort((a, b) => (b.volume || 0) - (a.volume || 0));

  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  const pri = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const d of decisions) { counts[d.code]++; pri[d.priority]++; }

  // one row per intent (the unit of work), listing its keywords
  const intents = new Map();
  for (const d of decisions) {
    const k = intentKey(d.keyword);
    if (!intents.has(k)) intents.set(k, { key: k, keywords: [], code: d.code, why: d.why, priority: d.priority, volume: d.volume, url: d.proposedUrl, difficulty: d.difficulty });
    const e = intents.get(k);
    e.keywords.push(d.keyword + ' (' + Number(d.volume || 0).toLocaleString('en-US') + ')');
    if ((d.volume || 0) > (e.volume || 0)) { e.volume = d.volume; e.difficulty = d.difficulty; }
    if (d.priority < e.priority) e.priority = d.priority;
  }

  const out = {
    generatedFor: SITEMAP_DATE,
    source: 'data/keyword-gap.json (scripts/audit-keyword-gap.cjs)',
    totals: {
      auditedKeywords: (audit.counts && Object.values(audit.counts).reduce((a, b) => a + b, 0)) || rows.length,
      auditCounts: audit.counts || null,
      pagesIndexedInAudit: audit.pagesIndexed || null,
      opportunities: rows.length,
      intentClusters: intents.size,
      decisions: counts,
      priorities: pri,
      registryTools: tools.length,
      sitemapUrls: sitemap.size
    },
    decisions
  };

  fs.writeFileSync(path.join(ROOT, 'data', 'keyword-implementation-map.json'), JSON.stringify(out, null, 2) + '\n');

  const L = [];
  L.push('# Keyword implementation map');
  L.push('');
  L.push('_Generated by `scripts/build-keyword-implementation-map.cjs` from `data/keyword-gap.json` (the output of');
  L.push('`scripts/audit-keyword-gap.cjs`). Do not edit by hand — regenerate and commit._');
  L.push('');
  L.push('**Generated for the ' + SITEMAP_DATE + ' sitemap tree** · **pages indexed in the audit:** ' + (audit.pagesIndexed || '—') +
    ' · **registry tools:** ' + tools.length + ' · **sitemap URLs:** ' + sitemap.size);
  L.push('**Audit inputs:** ' + ((audit.inputs || []).join(', ') || '—'));
  L.push('');
  L.push('## Verified audit totals (re-run, not copied from an earlier report)');
  L.push('');
  L.push('| Verdict | Count |');
  L.push('|---|---:|');
  for (const k of Object.keys(audit.counts || {})) L.push('| ' + k + ' | ' + audit.counts[k] + ' |');
  L.push('| **total keywords** | **' + Object.values(audit.counts || {}).reduce((a, b) => a + b, 0) + '** |');
  L.push('');
  L.push('## Decisions (this run)');
  L.push('');
  L.push('| Code | Meaning | Keywords | Intents |');
  L.push('|---|---|---:|---:|');
  const meaning = {
    A: 'new standalone calculator required',
    B: 'existing page needs improvement (no new URL)',
    C: 'existing page covers it — linking/metadata only',
    D: 'shares one intent with other keywords — one shared page',
    E: 'insufficient evidence / external data / no worthwhile implementation'
  };
  const intentByCode = {};
  for (const e of intents.values()) intentByCode[e.code] = (intentByCode[e.code] || 0) + 1;
  for (const c of ['A', 'B', 'C', 'D', 'E']) L.push('| ' + c + ' | ' + meaning[c] + ' | ' + counts[c] + ' | ' + (intentByCode[c] || 0) + ' |');
  L.push('');
  L.push('**Priority:** ' + Object.keys(pri).map((p) => p + ' ' + pri[p]).join(' · '));
  L.push('');
  L.push('## How to read the decision rules');
  L.push('');
  L.push('A decision is produced by the first rule that matches, and the rule is printed with the row:');
  L.push('');
  L.push('1. **E** — the answer needs a live external feed (weather, a brand menu, a league scoring table) or official');
  L.push('   jurisdiction rules we cannot verify from the repo. No fabricated data, so no page.');
  L.push('2. **D** — a second keyword in this audit normalises to the same intent (generic tail words dropped,');
  L.push('   plurals folded). One page must own the cluster.');
  L.push('3. **B** — every concept token already matches an existing registry tool, or the audit maps the keyword to a');
  L.push('   live sitemap URL. Improve that page; never create a duplicate calculator.');
  L.push('4. **C** — only a partial tool match. Resolve with internal links / metadata before any new page.');
  L.push('5. **A** — nothing matches: a genuine candidate for a standalone calculator.');
  L.push('');
  L.push('Priority: **P1** = code A with volume ≥ 100k, or code B with volume ≥ 50k · **P2** = remaining A/B/C/D ·');
  L.push('**P3** = E (no implementation). Volume/difficulty/CPC come from the audit row and are never estimated here.');
  L.push('');
  L.push('## One row per intent (the unit of work)');
  L.push('');
  L.push('| Priority | Code | Intent (canonical keyword) | Volume | Diff | Keywords in cluster | Target URL |');
  L.push('|---|---|---|---:|---:|---|---|');
  const sorted = [...intents.values()].sort((a, b) => (b.volume || 0) - (a.volume || 0));
  for (const e of sorted) {
    L.push('| ' + e.priority + ' | ' + e.code + ' | ' + e.keywords[0].replace(/\s*\(.*\)$/, '') + ' | ' +
      Number(e.volume || 0).toLocaleString('en-US') + ' | ' + (e.difficulty == null ? '—' : e.difficulty) + ' | ' +
      e.keywords.map((k) => '`' + k + '`').join('<br>') + ' | ' + (e.url ? '`' + e.url + '`' : (e.code === 'A' ? '_new page required — see code A_' : '_no page — see the reason column_')) + ' |');
  }
  L.push('');
  L.push('## Every audited keyword and its final decision');
  L.push('');
  L.push('| Keyword | Verdict | Vol | Diff | CPC | Code | Priority | Target | Why |');
  L.push('|---|---|---:|---:|---:|---|---|---|---|');
  for (const d of decisions) {
    L.push('| ' + d.keyword.replace(/\|/g, '\\|') + ' | ' + d.verdict + ' | ' + Number(d.volume || 0).toLocaleString('en-US') +
      ' | ' + (d.difficulty == null ? '—' : d.difficulty) + ' | ' + (d.cpc == null ? '—' : d.cpc) + ' | **' + d.code +
      '** | ' + d.priority + ' | ' + (d.proposedUrl ? '`' + d.proposedUrl + '`' : '—') + ' | ' + d.why.replace(/\|/g, '\\|') + ' |');
  }
  L.push('');
  const impl = decisions.filter((d) => /^implemented/.test(d.status)).length;
  const noImpl = decisions.filter((d) => /^no implementation/.test(d.status)).length;
  L.push('## Implementation status');
  L.push('');
  L.push('| Status | Rows |');
  L.push('|---|---:|');
  L.push('| implemented (FAQ added on the owner page) | ' + impl + ' |');
  L.push('| no implementation (no page can own the intent) | ' + noImpl + ' |');
  L.push('| still open | ' + (decisions.length - impl - noImpl) + ' |');
  L.push('');
  L.push('The `What` for each implemented row is a rendered FAQ on the owner page (§ Target), applied by');
  L.push('`scripts/apply-keyword-targets.cjs`; see [KEYWORD-TARGET-RESOLUTION.md](KEYWORD-TARGET-RESOLUTION.md) for the per-row evidence.');
  L.push('');
  fs.writeFileSync(OUT_MD, L.join('\n'));

  if (!JSON_ONLY) {
    console.log('keyword implementation map');
    console.log('  audited keywords (audit): ' + Object.values(audit.counts || {}).reduce((a, b) => a + b, 0) +
      '  (COVERED ' + ((audit.counts || {}).COVERED || 0) + ' / WEAK ' + ((audit.counts || {}).WEAK || 0) +
      ' / GAP ' + ((audit.counts || {}).GAP || 0) + ' / IGNORE ' + ((audit.counts || {}).IGNORE || 0) + ')');
    console.log('  actionable rows       : ' + rows.length + ' in ' + intents.size + ' intent cluster(s)');
    console.log('  decisions             : A ' + counts.A + ' · B ' + counts.B + ' · C ' + counts.C + ' · D ' + counts.D + ' · E ' + counts.E);
    console.log('  priority              : ' + Object.keys(pri).map((p) => p + ' ' + pri[p]).join(' · '));
    console.log('💾 data/keyword-implementation-map.json · docs/KEYWORD-IMPLEMENTATION-MAP.md');
  }
  return 0;
}

process.exit(main());
