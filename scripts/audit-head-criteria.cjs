#!/usr/bin/env node
/**
 * Head-criteria audit — every INDEXABLE page in the built deploy/ folder.
 *
 * The 2026-10-17 fix pass took 501 head-criterion failures to 0 with a one-off
 * script in .tmp/. This is that check, committed, so a new page, a new category
 * or a hand edit cannot silently reintroduce the same defects.
 *
 * Criteria (all measured on the built artifact, not the source):
 *   1. title                    30-60 display characters
 *   2. description              100-160 display characters
 *   3. description CTA          contains a verb a searcher can act on
 *   4. canonical                exactly one, equal to the served URL
 *   5. keywords                 present and page-specific (homepage may use the broad list)
 *   6. JSON-LD dateModified     machine-readable freshness
 *   7. visible <time datetime>  human-readable freshness
 *   8. inline event handlers    none (CSP 'unsafe-inline' must be removable)
 *   9. HTML comments            none in production
 *  10. GA4 property             at most one measurement ID
 *
 * noindex pages (long-tail geo variants, dashboards, embed widgets), the 404 and
 * Google's site-verification file are excluded: they consolidate via canonical or
 * are not pages.
 *
 * Usage:
 *   node scripts/audit-head-criteria.cjs                 # report, exit 0
 *   node scripts/audit-head-criteria.cjs --json          # + data/head-criteria-audit.json
 *   node scripts/audit-head-criteria.cjs --fail-on-issue # exit 1 on any failure (CI)
 *
 * Run it after `node build-deploy.js`; it reads deploy/.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const SITE = (() => {
  // Same single source of truth as quality-gate: js/site-config.js.
  const cfg = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
  const m = cfg.match(/domain:\s*'([^']+)'/);
  const host = (m ? m[1] : 'calcpromaster.com').replace(/^https?:\/\//, '').replace(/\/$/, '');
  return 'https://' + host;
})();

const NOINDEX = [
  /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i,
  /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i,
];

// Display length: decode every entity, the way a SERP counts characters.
function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Served-URL form: directory pages end in '/', flat .html pages are pretty-URL'd
// (/about.html -> /about), which returns 200 with no redirect.
function servedPath(rel) {
  const p = rel.split(path.sep).join('/');
  if (p === 'index.html') return '/';
  if (p.endsWith('/index.html')) return '/' + p.slice(0, -'index.html'.length);
  return '/' + p.replace(/\.html$/, '');
}

const CTA = /\b(try|start|calculate|get|see|check|compare|use|explore|find|compute|estimate|read|learn)\b/i;

const criteria = {
  title30to60: {
    label: 'title 30-60 chars',
    test: (h) => {
      const t = decodeEntities((h.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
      return t.length >= 30 && t.length <= 60;
    },
  },
  desc100to160: {
    label: 'description 100-160 chars',
    test: (h) => {
      const d = decodeEntities((h.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [])[1] || '');
      return d.length >= 100 && d.length <= 160;
    },
  },
  descCTA: {
    label: 'description has a CTA',
    test: (h) => {
      const d = decodeEntities((h.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [])[1] || '');
      return CTA.test(d);
    },
  },
  canonicalServed: {
    label: 'self canonical',
    test: (h, rel) => {
      const all = h.match(/<link\s+rel=["']canonical["'][^>]*>/gi) || [];
      if (all.length !== 1) return false;
      const c = (all[0].match(/href=["']([^"']+)["']/i) || [])[1] || '';
      return c === SITE + servedPath(rel);
    },
  },
  keywordsPageSpecific: {
    label: 'page-specific keywords',
    test: (h, rel, ctx) => {
      const k = (h.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']*)["']/i) || [])[1] || '';
      return rel === 'index.html' ? k.length > 10 : k.length > 10 && k !== ctx.homeKeywords;
    },
  },
  jsonLdDates: {
    label: 'JSON-LD dateModified',
    test: (h) => /"dateModified"\s*:/.test(h),
  },
  visibleTime: {
    label: 'visible <time datetime>',
    test: (h) => /<time\s+datetime=["']\d{4}-\d{2}-\d{2}["']/i.test(h),
  },
  noInlineHandlers: {
    label: 'no inline handlers',
    test: (h) => !/\son[a-z]+=["']/i.test(h),
  },
  noComments: {
    label: 'no HTML comments',
    test: (h) => !h.includes('<!--'),
  },
  singleGA4: {
    label: 'one GA4 property',
    test: (h) => new Set([...h.matchAll(/G-[A-Z0-9]{6,}/g)].map((m) => m[0])).size <= 1,
  },
};

function walkHtml(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkHtml(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function isIndexable(html) {
  return !NOINDEX.some((re) => re.test(html));
}

/** Audit one page's HTML. Returns { failed: [criterion keys] }. */
function auditHtml(html, rel, ctx) {
  const failed = [];
  for (const [key, c] of Object.entries(criteria)) {
    let ok = false;
    try {
      ok = c.test(html, rel, ctx);
    } catch {
      ok = false;
    }
    if (!ok) failed.push(key);
  }
  return { failed };
}

function run() {
  const args = new Set(process.argv.slice(2));
  const wantJson = args.has('--json');
  const failOnIssue = args.has('--fail-on-issue');

  if (!fs.existsSync(DEPLOY)) {
    console.error('head-criteria: deploy/ missing — run `node build-deploy.js` first');
    process.exit(2);
  }

  const homeHtml = fs.readFileSync(path.join(DEPLOY, 'index.html'), 'utf8');
  const homeKeywords = (homeHtml.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']*)["']/i) || [])[1] || '';
  const ctx = { homeKeywords };

  const failures = {};
  for (const key of Object.keys(criteria)) failures[key] = [];
  let checked = 0;
  let skipped = 0;

  for (const file of walkHtml(DEPLOY, [])) {
    const rel = path.relative(DEPLOY, file);
    if (rel === '404.html' || /^google[0-9a-z]+\.html$/i.test(rel)) {
      skipped++;
      continue;
    }
    const html = fs.readFileSync(file, 'utf8');
    if (!isIndexable(html)) {
      skipped++;
      continue;
    }
    checked++;
    const { failed } = auditHtml(html, rel, ctx);
    for (const key of failed) failures[key].push(rel.split(path.sep).join('/'));
  }

  const total = Object.values(failures).reduce((n, list) => n + list.length, 0);
  const passingPages = checked - new Set(Object.values(failures).flat()).size;

  console.log(
    'head-criteria: ' + checked + ' indexable pages · ' + passingPages + ' pass all 10 · ' +
    skipped + ' skipped (noindex/404/verification)'
  );
  for (const [key, list] of Object.entries(failures)) {
    const ok = list.length === 0;
    console.log(
      '  ' + (ok ? 'PASS' : 'FAIL') + '  ' + criteria[key].label.padEnd(24) +
      (checked - list.length) + '/' + checked +
      (list.length ? '  e.g. ' + list.slice(0, 3).join(', ') : '')
    );
  }
  console.log('HEAD CRITERION FAILURES: ' + total);

  if (wantJson || failOnIssue) {
    const report = {
      generatedAt: new Date().toISOString(),
      site: SITE,
      checked,
      skipped,
      passingPages,
      totalFailures: total,
      criteria: Object.fromEntries(
        Object.entries(criteria).map(([key, c]) => [key, { label: c.label, failures: failures[key].length, pages: failures[key] }])
      ),
    };
    fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'data', 'head-criteria-audit.json'), JSON.stringify(report, null, 2) + '\n');
  }

  process.exit(failOnIssue && total > 0 ? 1 : 0);
}

module.exports = { criteria, servedPath, decodeEntities, auditHtml, isIndexable, SITE };

if (require.main === module) run();
