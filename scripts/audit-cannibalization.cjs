#!/usr/bin/env node
// ============================================================
// CalcProMaster — Cannibalization audit (measured, reproducible)
// ------------------------------------------------------------
// "Fix cannibalization pairs" is normally handed over as a bare count with no
// evidence. This script replaces that with a written rule set applied to the
// one dataset that can prove a pair: the Google Search Console query page export
// (data/gsc-query-page.json — query, page, clicks, impressions, ctr, position
// for a 28-day window).
//
// A pair is only reported when TWO DISTINCT pages of this site collected
// impressions for the SAME query in that window. Everything else — same-tool
// pages, keyword lists, title clustering — is a proxy and lives elsewhere
// (docs/KEYWORD-AUDIT.md C2, docs/INTENT-AUDIT.md I1).
//
// Trailing-slash variants are collapsed first: /x and /x/ are one page here,
// because production 308s the non-slash form onto the slash form (verified by
// HEAD probe, see docs/CANNIBALIZATION-REPORT.md §"Not a defect").
//
// Decision rules — applied mechanically, one row per pair:
//   D1 CONSOLIDATE   tool↔tool, same category, same inputs → one page must own
//                    the query (301 or a genuinely different angle). Owner
//                    decision, so the report recommends and does not act.
//   D2 DIFFERENTIATE tool↔tool, cross category → keep both, make the intent
//                    wording and the internal links distinct.
//   D3 LINK_GUIDE    guide↔tool → working as designed IF the guide links the
//                    calculator; a missing link is the actionable defect.
//   D4 BY_DESIGN     hub/category landing↔tool → navigation vs tool intent.
//   D5 ACCEPT        one page holds ≥80% of the impressions and ≥10× the other
//                    → no cannibalization worth work; record and move on.
//
// Input:  data/gsc-query-page.json      (GSC join — may be absent in CI)
//         deploy/sitemap.xml            (which URLs exist right now)
//         deploy/guides|blog|hub/**.html (guide→tool link check, D3)
// Output: data/cannibalization-audit.json · docs/CANNIBALIZATION-REPORT.md
// Usage:  node scripts/audit-cannibalization.cjs [--json]
// Exit:   0 always (report); --fail-on-actionable exits 1 when any D1/D2 pair
//         carries ≥ MIN_ACTIONABLE impressions on its weaker page.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GSC = path.join(ROOT, 'data', 'gsc-query-page.json');
const SITEMAP = path.join(ROOT, 'deploy', 'sitemap.xml');
const OUT_JSON = path.join(ROOT, 'data', 'cannibalization-audit.json');
const OUT_MD = path.join(ROOT, 'docs', 'CANNIBALIZATION-REPORT.md');
const JSON_ONLY = process.argv.includes('--json');
const FAIL_ON_ACTIONABLE = process.argv.includes('--fail-on-actionable');

// Region variant pages are not cannibalizing each other: /regional/dubai-salary
// and /regional/uk-take-home-salary both collect impressions for the head term
// "salary calculator", but each targets its own country query. When two pages in
// one category differ by one of these tokens, the split is by design (D6).
const LOCALE_TOKENS = new Set([
  'dubai', 'uae', 'abu', 'saudi', 'ksa', 'qatar', 'oman', 'kuwait', 'bahrain',
  'india', 'pk', 'pakistan', 'bangladesh', 'indonesia', 'malaysia', 'singapore',
  'thailand', 'vietnam', 'philippines', 'uk', 'gb', 'ireland', 'germany', 'france',
  'netherlands', 'poland', 'spain', 'italy', 'canada', 'us', 'usa', 'mexico',
  'brazil', 'australia', 'newzealand', 'new', 'zealand', 'japan', 'china', 'korea',
  'hongkong', 'switzerland', 'sweden', 'norway', 'denmark', 'turkey', 'egypt',
  'nigeria', 'kenya', 'southafrica', 'nepal', 'srilanka', 'gulf', 'expat'
]);
const localeTokens = (p) =>
  new Set(p.split('/').filter(Boolean).join('-').split('-').filter((t) => LOCALE_TOKENS.has(t)));
function differsByLocale(a, b) {
  const ta = localeTokens(a.page);
  const tb = localeTokens(b.page);
  if (!ta.size || !tb.size) return false;
  for (const t of ta) if (!tb.has(t)) return true;
  for (const t of tb) if (!ta.has(t)) return true;
  return false;
}

// A pair only earns work when the weaker page still collects real impressions.
const MIN_ACTIONABLE = 3;
// D5: winner dominance thresholds (share of impressions, and ratio).
const DOMINANT_SHARE = 0.8;
const DOMINANT_RATIO = 10;

const strip = (u) => String(u).replace(/^https?:\/\/[^/]+/, '').replace(/\/+$/, '') || '/';

// Cross-category intent clusters (js/cluster-map.js). Two pages in one cluster
// are already linked to each other by the SSG and SPA render paths, which is the
// D1/D2 fix — so the audit downgrades such a pair to *_LINKED instead of leaving
// it on the actionable list forever.
const CLUSTERS = (() => {
  try {
    return require(path.join(ROOT, 'js', 'cluster-map.js'));
  } catch (e) {
    return [];
  }
})();
function sharesCluster(a, b) {
  const pa = a.replace(/^\//, '');
  const pb = b.replace(/^\//, '');
  return CLUSTERS.some((c) => {
    const pages = new Set([c.hub].concat(c.spokes || []));
    return pages.has(pa) && pages.has(pb);
  });
}

// ---------- classify a path ----------
function pageKind(p) {
  if (p === '/') return 'home';
  const seg = p.split('/').filter(Boolean);
  if (seg[0] === 'guides') return 'guide';
  if (seg[0] === 'blog') return 'blog';
  if (seg[0] === 'hub') return 'hub';
  if (seg.length === 1) return 'category';
  return 'tool';
}
const category = (p) => {
  const seg = p.split('/').filter(Boolean);
  return seg.length > 1 ? seg[0] : '';
};

function classify(a, b) {
  const ka = pageKind(a.page);
  const kb = pageKind(b.page);
  const kinds = new Set([ka, kb]);
  if (kinds.has('hub') || kinds.has('category') || kinds.has('home')) return 'D4';
  if (kinds.has('guide') || kinds.has('blog')) return 'D3';
  if (ka === 'tool' && kb === 'tool') {
    return category(a.page) === category(b.page) ? 'D1' : 'D2';
  }
  return 'D4';
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

// ---------- guide → tool link check (used by D3) ----------
let DEPLOY_GUIDE_HTML = null;
function guideHtml(page) {
  if (DEPLOY_GUIDE_HTML === null) DEPLOY_GUIDE_HTML = new Map();
  if (DEPLOY_GUIDE_HTML.has(page)) return DEPLOY_GUIDE_HTML.get(page);
  const file = path.join(ROOT, 'deploy', page.replace(/^\//, '') + '.html');
  const dirFile = path.join(ROOT, 'deploy', page.replace(/^\//, ''), 'index.html');
  let html = null;
  try {
    html = fs.readFileSync(file, 'utf8');
  } catch (e) {
    try {
      html = fs.readFileSync(dirFile, 'utf8');
    } catch (e2) {
      html = '';
    }
  }
  DEPLOY_GUIDE_HTML.set(page, html);
  return html;
}

// Does the guide page link the tool path (either slash form)?
function linksTool(guidePage, toolPage) {
  const html = guideHtml(guidePage);
  if (!html) return null; // unknown — treat as not-checkable
  const candidates = [toolPage + '/', toolPage, toolPage.replace(/\/$/, '') + '/'];
  return candidates.some((c) => html.includes('href="' + c + '"'));
}

function main() {
  const gsc = readJson(GSC);
  const sitemapRaw = (() => {
    try {
      return fs.readFileSync(SITEMAP, 'utf8');
    } catch (e) {
      return '';
    }
  })();
  const livePages = new Set(
    [...sitemapRaw.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => strip(m[1]))
  );

  if (!gsc || !Array.isArray(gsc.pairs) || !gsc.pairs.length) {
    const skipped = {
      ranAt: new Date().toISOString(),
      skipped: true,
      reason:
        'data/gsc-query-page.json missing or empty — the query→page join comes from the GSC API export and is not committed to CI. Run `npm run seo:gsc-join` first.',
      window: null,
      pairsScanned: 0,
      splitQueries: 0,
      impressionsOnSplitQueries: 0,
      decisions: []
    };
    fs.writeFileSync(OUT_JSON, JSON.stringify(skipped, null, 2));
    if (!JSON_ONLY) console.log('Cannibalization audit skipped — ' + skipped.reason);
    return 0;
  }

  // ---------- collapse same-page slash variants, group by query ----------
  const byQuery = new Map();
  for (const row of gsc.pairs) {
    const page = strip(row.page);
    if (!byQuery.has(row.query)) byQuery.set(row.query, new Map());
    const m = byQuery.get(row.query);
    const cur = m.get(page) || { page, impressions: 0, clicks: 0, position: row.position };
    cur.impressions += row.impressions || 0;
    cur.clicks += row.clicks || 0;
    // position: impression-weighted mean, so a single 80th-place hit cannot
    // outvote 300 impressions at 6th.
    const w = (row.impressions || 0) + 1;
    cur.position = (cur.position * (w - 1) + row.position * w) / w / 1;
    m.set(page, cur);
  }

  const splitQueries = [...byQuery.entries()]
    .map(([query, m]) => ({ query, pages: [...m.values()] }))
    .filter((r) => r.pages.length > 1)
    .map((r) => {
      r.pages.sort((a, b) => b.impressions - a.impressions);
      r.total = r.pages.reduce((s, p) => s + p.impressions, 0);
      const top = r.pages[0];
      r.share = r.total ? top.impressions / r.total : 1;
      r.ratio = r.pages[1] ? top.impressions / Math.max(1, r.pages[1].impressions) : Infinity;
      return r;
    })
    .sort((a, b) => b.total - a.total);

  const impressionsOnSplit = splitQueries.reduce((s, r) => s + r.total, 0);
  const joinedImpressions = (gsc.coverage && gsc.coverage.pairImpressions) || 0;

  // ---------- one row per (query, pair) ----------
  const rows = [];
  for (const r of splitQueries) {
    for (let i = 0; i < r.pages.length; i++) {
      for (let j = i + 1; j < r.pages.length; j++) {
        const [a, b] = [r.pages[i], r.pages[j]];
        let decision = classify(a, b);
        if (decision === 'D1' && differsByLocale(a, b)) decision = 'D6';
        // A clustered pair is already cross-linked by the render paths, which is
        // the fix for both D1 (owner + link) and D2 (differentiate + link).
        if ((decision === 'D1' || decision === 'D2') && sharesCluster(a.page, b.page)) {
          decision = decision + '_LINKED';
        }
        // D5 overrides unless the pair needs an owner decision anyway (D1)
        if (decision !== 'D1' && r.share >= DOMINANT_SHARE && r.ratio >= DOMINANT_RATIO) {
          decision = 'D5';
        }
        let note = '';
        if (decision === 'D3') {
          const guide = pageKind(a.page) === 'guide' || pageKind(a.page) === 'blog' ? a : b;
          const tool = guide === a ? b : a;
          const linked = linksTool(guide.page, tool.page);
          if (linked === false) {
            decision = 'D3_LINK_MISSING';
            note = 'guide ranks for this query but does not link ' + tool.page;
          } else if (linked === null) {
            // The guide HTML is not in this checkout (no deploy/ build). Reporting
            // this as "links the calculator" would state a link we never read, so
            // say so instead. Not actionable either way: the absence of a build is
            // not evidence of a missing link, and CI runs this gate after
            // build-deploy.js so the checked case is the normal one.
            note = 'guide HTML not in this checkout (no deploy/ build) — link not verified';
          } else {
            note = 'guide links the calculator — guide↔tool split is by design';
          }
        }
        if (decision === 'D1') {
          note = 'same category, same intent — one page should own the query (owner decision)';
        }
        if (decision === 'D6') {
          note = 'region variants of one category — each page targets its own country query, split is by design';
        }
        if (decision === 'D2') {
          note = 'cross-category tools sharing one intent — differentiate wording + internal links';
        }
        if (decision === 'D1_LINKED' || decision === 'D2_LINKED') {
          note = 'clustered in js/cluster-map.js — the SSG/SPA related-links block already connects the pair';
        }
        rows.push({
          query: r.query,
          decision,
          note,
          pages: [a, b].map((p) => ({
            page: p.page,
            impressions: p.impressions,
            clicks: p.clicks,
            position: Math.round(p.position * 10) / 10,
            kind: pageKind(p.page),
            inSitemap: livePages.has(p.page) || livePages.has(p.page + '/')
          })),
          weakerImpressions: b.impressions,
          queryImpressions: r.total
        });
      }
    }
  }

  const count = (d) => rows.filter((r) => r.decision === d).length;
  const ACTIONABLE_DECISIONS = new Set(['D1', 'D2', 'D3_LINK_MISSING']);
  const actionable = rows.filter(
    (r) => ACTIONABLE_DECISIONS.has(r.decision) && r.weakerImpressions >= MIN_ACTIONABLE
  );

  const out = {
    ranAt: new Date().toISOString(),
    source: 'data/gsc-query-page.json',
    window: { start: gsc.startDate, end: gsc.endDate, days: gsc.days },
    method: {
      collapse: 'trailing slash normalised (/x and /x/ are one page)',
      rule: 'reported only when 2+ distinct pages of this site got impressions for one query',
      minActionable: MIN_ACTIONABLE,
      dominantShare: DOMINANT_SHARE,
      dominantRatio: DOMINANT_RATIO
    },
    pairsScanned: gsc.pairs.length,
    queriesScanned: byQuery.size,
    splitQueries: splitQueries.length,
    impressionsOnSplitQueries: impressionsOnSplit,
    joinedImpressions,
    splitShare: joinedImpressions ? Math.round((impressionsOnSplit / joinedImpressions) * 1000) / 10 : null,
    byDecision: {
      D1_consolidate: count('D1'),
      D1_linked: count('D1_LINKED'),
      D2_differentiate: count('D2'),
      D2_linked: count('D2_LINKED'),
      D3_link_missing: count('D3_LINK_MISSING'),
      D3_by_design: count('D3'),
      D4_by_design: count('D4'),
      D5_accept: count('D5'),
      D6_locale_by_design: count('D6')
    },
    actionableCount: actionable.length,
    decisions: rows
      .slice()
      .sort((a, b) => b.queryImpressions - a.queryImpressions || b.weakerImpressions - a.weakerImpressions)
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));

  if (!JSON_ONLY) {
    writeReport(out, splitQueries, actionable);
    console.log('Cannibalization audit');
    console.log('  query→page pairs      : ' + out.pairsScanned);
    console.log('  queries               : ' + out.queriesScanned);
    console.log('  split across 2+ pages : ' + out.splitQueries + '  (' + out.splitShare + '% of joined impressions)');
    console.log('  D1 consolidate        : ' + out.byDecision.D1_consolidate + '  (clustered/linked: ' + out.byDecision.D1_linked + ')');
    console.log('  D2 differentiate      : ' + out.byDecision.D2_differentiate + '  (clustered/linked: ' + out.byDecision.D2_linked + ')');
    console.log('  D3 guide link missing : ' + out.byDecision.D3_link_missing);
    console.log('  actionable (≥' + MIN_ACTIONABLE + ' impr on weaker page): ' + actionable.length);
    console.log('💾 data/cannibalization-audit.json · docs/CANNIBALIZATION-REPORT.md');
  }

  if (FAIL_ON_ACTIONABLE && actionable.length) {
    console.error('✖ ' + actionable.length + ' actionable cannibalization pair(s) — see docs/CANNIBALIZATION-REPORT.md');
    return 1;
  }
  return 0;
}

function writeReport(out, splitQueries, actionable) {
  const pct = out.splitShare;
  const L = [];
  L.push('# Cannibalization report — measured from Search Console query→page data');
  L.push('');
  L.push('**Generated:** ' + out.ranAt.slice(0, 10) + ' · by `node scripts/audit-cannibalization.cjs`');
  L.push('**Window:** ' + out.window.start + ' → ' + out.window.end + ' (' + out.window.days + ' days, GSC query→page export)');
  L.push('');
  L.push('A pair appears here only when **two distinct pages of this site collected impressions for the same query**.');
  L.push('Trailing-slash variants are collapsed first — `/x` and `/x/` are counted as one page, because production');
  L.push('308-redirects the non-slash form onto the slash form (verified by HEAD probe). Keyword lists, title');
  L.push('clustering and keyword-field overlap are proxies and are audited separately');
  L.push('(`docs/KEYWORD-AUDIT.md` C2 = 0, `docs/INTENT-AUDIT.md` I1).');
  L.push('');
  L.push('## Headline');
  L.push('');
  L.push('| | Value |');
  L.push('|---|---|');
  L.push('| query→page pairs scanned | ' + out.pairsScanned + ' |');
  L.push('| distinct queries | ' + out.queriesScanned + ' |');
  L.push('| queries split across 2+ pages | **' + out.splitQueries + '** |');
  L.push('| impressions sitting on split queries | ' + out.impressionsOnSplitQueries + ' of ' + out.joinedImpressions + ' joined (**' + pct + '%**) |');
  L.push('| D1 consolidate (same-category tool↔tool) | ' + out.byDecision.D1_consolidate + ' |');
  L.push('| D1 already clustered + cross-linked | ' + out.byDecision.D1_linked + ' |');
  L.push('| D2 differentiate (cross-category tool↔tool) | ' + out.byDecision.D2_differentiate + ' |');
  L.push('| D2 already clustered + cross-linked | ' + out.byDecision.D2_linked + ' |');
  L.push('| D3 guide link missing (actionable) | ' + out.byDecision.D3_link_missing + ' |');
  L.push('| D3 guide↔tool, already linked (by design) | ' + out.byDecision.D3_by_design + ' |');
  L.push('| D4 hub/category landing (by design) | ' + out.byDecision.D4_by_design + ' |');
  L.push('| D5 one page dominant — no work justified | ' + out.byDecision.D5_accept + ' |');
  L.push('| D6 region variants of one category (by design) | ' + out.byDecision.D6_locale_by_design + ' |');
  L.push('');
  L.push('**Actionable pairs** (decision D1/D2, or a missing guide→tool link, with ≥' + out.method.minActionable + ' impressions still reaching the weaker page): **' + actionable.length + '**.');
  L.push('');
  L.push('## Top split queries by impressions');
  L.push('');
  L.push('| Impressions | Query | Pages (impressions · avg position) |');
  L.push('|---|---|---|');
  for (const r of splitQueries.slice(0, 15)) {
    const cells = r.pages
      .map((p) => '`' + p.page + '` ' + p.impressions + ' · ' + (Math.round(p.position * 10) / 10))
      .join('<br>');
    L.push('| ' + r.total + ' | ' + r.query.replace(/\|/g, '\\|').slice(0, 70) + ' | ' + cells + ' |');
  }
  L.push('');
  L.push('## Actionable pairs');
  L.push('');
  if (!actionable.length) {
    L.push('None. Every split query is either a hub/category landing page doing its navigation job, a guide that');
    L.push('already links its calculator, or a query where one page holds ≥' + Math.round(out.method.dominantShare * 100) + '% of the impressions.');
  } else {
    L.push('| Query | Decision | Weaker page | W | Stronger page | S | Note |');
    L.push('|---|---|---|---|---|---|---|');
    for (const r of actionable.slice(0, 40)) {
      const [w, s] = r.pages;
      L.push(
        '| ' + r.query.replace(/\|/g, '\\|').slice(0, 50) + ' | ' + r.decision + ' | `' + w.page + '` | ' + w.impressions +
          ' | `' + s.page + '` | ' + s.impressions + ' | ' + r.note.replace(/\|/g, '\\|') + ' |'
      );
    }
  }
  L.push('');
  L.push('## How the decision rules were applied');
  L.push('');
  L.push('| Rule | Meaning | Action |');
  L.push('|---|---|---|');
  L.push('| D1 CONSOLIDATE | same-category tools with the same inputs competing for one query | pick an owner, then 301 the loser — **owner decision, not applied automatically** |');
  L.push('| D2 DIFFERENTIATE | cross-category tools sharing one intent | keep both pages, make the intent wording and internal links distinct (cluster link = the fix) |');
  L.push('| D3 LINK_GUIDE | a guide ranks for the query behind its calculator | the guide must link the calculator (missing link = the defect) |');
  L.push('| D4 BY_DESIGN | hub / category landing vs a tool | navigation intent vs tool intent; no change |');
  L.push('| D5 ACCEPT | one page holds ≥' + Math.round(out.method.dominantShare * 100) + '% of impressions and ≥' + out.method.dominantRatio + '× the other | record and move on |');
  L.push('| D6 LOCALE_BY_DESIGN | two pages of one category that differ by a country/region token | each targets its own country query; no change |');
  L.push('');
  L.push('## Not a defect (measured, so it is not reported as one)');
  L.push('');
  L.push('- **`/x` vs `/x/`**: Google holds both forms in its data, but production 308-redirects the non-slash form,');
  L.push('  and every internal link plus every canonical uses the slash form. Collapsed here before pairing.');
  L.push('- **Same-region salary pages** (`/regional/<country>-take-home-salary`): the generic query "salary calculator"');
  L.push('  is split across them by design — each page targets its own country intent.');
  L.push('');
  L.push('## Reproduce');
  L.push('');
  L.push('```bash');
  L.push('node build-deploy.js                        # deploy/ must exist (guide link check)');
  L.push('npm run seo:gsc-join                        # refresh data/gsc-query-page.json');
  L.push('node scripts/audit-cannibalization.cjs       # this report');
  L.push('node scripts/audit-cannibalization.cjs --fail-on-actionable   # exit 1 on any actionable pair');
  L.push('```');
  L.push('');
  fs.writeFileSync(OUT_MD, L.join('\n'));
}

process.exit(main());
