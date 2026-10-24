// ====== Competitor-gap pages: page-level browser verification ======
// The status docs claim every competitive/market gap item is DONE:
//
//   docs/COMPETITIVE-GAP-STATUS.md  — the 12 items benchmarked against leading
//                                     calculator sites (incl. /graph, /geometry-lab)
//   docs/MARKET-GAP-STATUS.md       — the 48 calculators shipped against the
//                                     49 spec items (Part 1 + Part 2)
//
// A table entry in a markdown file is a claim, not evidence. This spec visits
// every one of those pages in a real browser on the built deploy/ artifact and
// asserts the things the claim actually means: the route answers, it has one
// h1, it is indexable, its own JS runs clean, and — for the calculator pages —
// the form still produces a result after a Calculate click.
//
// Every page is also recorded to test-results/gap-pages-<project>.json so the
// verification is a durable artifact, not a one-off manual click-through.
//
// Run: npx playwright test tests/e2e/gap-pages.spec.js
//      npx playwright test tests/e2e/gap-pages.spec.js -c playwright.deploy.config.js
// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = process.env.PLAYWRIGHT_BASE_URL || process.env.E2E_BASE || 'http://localhost:3100';

// Canonicals here are ABSOLUTE, and two writers are in play:
//   * the static SSG output stamps the PRODUCTION origin (from `window.SITE_ORIGIN`
//     in js/site-config.js) — read from the same file the build reads it from;
//   * js/app.js `updateMeta()` then REWRITES it to `window.location.origin`
//     ("auto-detect domain from window.location"), so on localhost/preview the
//     rendered canonical is the serving origin.
// Both are self-canonicals, so the assertion requires the canonical's PATH to match
// the route and its ORIGIN to be one of those two — a stale or foreign host (e.g. the
// retired netlify.app host, or another tool's slug) still fails.
function productionOrigin() {
  try {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'site-config.js'), 'utf8');
    const m = src.match(/\bdomain:\s*'([^']+)'/);
    if (m) return 'https://' + m[1];
  } catch (e) { /* fall through */ }
  return 'https://calcpromaster.com';
}
const PROD_ORIGIN = productionOrigin();

// tool id -> live path, resolved against the built deploy/ tree (all 48 shipped
// gap tools plus the two interactive pages from COMPETITIVE-GAP-STATUS items 1 & 3).
// NOTE on the count: docs/MARKET-GAP-STATUS.md's batch table is headed "48 new
// calculators" and lists `ev-charger-roi` (batch 4) AND `ev-charger-business-roi`
// (batch 5) as separate tools — both are real, deployed, sitemap-listed routes
// (`/auto/ev-charger-roi`, `/business/ev-charger-business-roi`), so the list below
// covers 48 distinct tools — verified against the deploy/ tree, not the table.
const GAP_TOOLS = [
  { item: 'P1-1 trade mini-category', id: 'conduit-fill', path: '/construction/conduit-fill' },
  { item: 'P1-1 trade mini-category', id: 'rolling-offset', path: '/construction/rolling-offset' },
  { item: 'P1-1 trade mini-category', id: 'pipe-cutback', path: '/construction/pipe-cutback' },
  { item: 'P1-1 trade mini-category', id: 'hvac-load', path: '/engineering/hvac-load' },
  { item: 'P2-10 pipe pressure loss', id: 'pipe-pressure-loss', path: '/engineering/pipe-pressure-loss' },
  { item: 'P1-2 portfolio tracking', id: 'rental-portfolio-tracker', path: '/finance/rental-portfolio-tracker' },
  { item: 'P1-3 pet calculators', id: 'pet-insurance-cost', path: '/lifestyle/pet-insurance-cost' },
  { item: 'P1-3 pet calculators', id: 'pet-medication-dose', path: '/health/pet-medication-dose' },
  { item: 'P1-3 pet calculators', id: 'pet-boarding-cost', path: '/lifestyle/pet-boarding-cost' },
  { item: 'P1-4 religious/cultural', id: 'prayer-time', path: '/regional/prayer-time' },
  { item: 'P1-4 religious/cultural', id: 'mirath-calculator', path: '/regional/mirath-calculator' },
  { item: 'P1-4 religious/cultural', id: 'hijri-converter', path: '/regional/hijri-converter' },
  { item: 'P2-23 hajj/umrah cost', id: 'hajj-cost', path: '/finance/hajj-cost' },
  { item: 'P2-23 hajj/umrah cost', id: 'umrah-cost', path: '/regional/umrah-cost' },
  { item: 'P1-5 legal expanded', id: 'alimony-estimator', path: '/family/alimony-estimator' },
  { item: 'P1-5 legal expanded', id: 'statute-of-limitations', path: '/everyday/statute-of-limitations' },
  { item: 'P1-5 legal expanded', id: 'power-of-attorney-cost', path: '/finance/power-of-attorney-cost' },
  { item: 'P1-6 creator economy', id: 'sponsorship-rate', path: '/business/sponsorship-rate' },
  { item: 'P1-6 creator economy', id: 'brand-deal-value', path: '/business/brand-deal-value' },
  { item: 'P1-6 creator economy', id: 'podcast-ad-rate', path: '/business/podcast-ad-rate' },
  { item: 'P1-6 creator economy', id: 'newsletter-sponsorship-rate', path: '/business/newsletter-sponsorship-rate' },
  { item: 'P1-7 visa/immigration', id: 'canada-crs', path: '/career/canada-crs' },
  { item: 'P1-7 visa/immigration', id: 'australia-pr-points', path: '/career/australia-pr-points' },
  { item: 'P1-7 visa/immigration', id: 'us-priority-date', path: '/career/us-priority-date' },
  { item: 'P1-8 regional strength', id: 'gold-price', path: '/regional/gold-price' },
  { item: 'P1-8 regional strength', id: 'qurbani-cost', path: '/regional/qurbani-cost' },
  { item: 'P1-8 regional strength', id: 'remittance-fee', path: '/regional/remittance-fee' },
  { item: 'P1-8 regional strength', id: 'school-fee-inflation', path: '/education/school-fee-inflation' },
  { item: 'P1-9 resume/salary', id: 'ats-resume-score', path: '/career/ats-resume-score' },
  { item: 'P1-9 resume/salary', id: 'salary-negotiation-range', path: '/career/salary-negotiation-range' },
  { item: 'P1-9 resume/salary', id: 'interview-to-offer-tracker', path: '/career/interview-to-offer-tracker' },
  { item: 'P2 divorce/moving', id: 'divorce-cost', path: '/finance/divorce-cost' },
  { item: 'P2 divorce/moving', id: 'moving-abroad-cost', path: '/finance/moving-abroad-cost' },
  { item: 'P2 career break', id: 'career-break-runway', path: '/career/career-break-runway' },
  { item: 'P2 bereavement', id: 'bereavement-checklist', path: '/family/bereavement-checklist' },
  { item: 'P2 co-signing risk', id: 'cosigning-loan-risk', path: '/finance/cosigning-loan-risk' },
  { item: 'P2 inheritance tax', id: 'inheritance-tax-uk-india', path: '/finance/inheritance-tax-uk-india' },
  { item: 'P2 journeyman wage', id: 'journeyman-wage-progression', path: '/construction/journeyman-wage-progression' },
  { item: 'P2 tool depreciation', id: 'tool-depreciation', path: '/business/tool-depreciation' },
  { item: 'P2 cost of living', id: 'cost-of-living-compare', path: '/everyday/cost-of-living-compare' },
  { item: 'P2 solar payback', id: 'solar-payback', path: '/homegarden/solar-payback' },
  { item: 'P2 EV charger ROI', id: 'ev-charger-business-roi', path: '/business/ev-charger-business-roi' },
  { item: 'P2 EV charger ROI', id: 'ev-charger-roi', path: '/auto/ev-charger-roi' },
  { item: 'P2 carbon offset', id: 'carbon-offset', path: '/homegarden/carbon-offset' },
  { item: 'P2 homeowner budget', id: 'homeowner-first-year-budget', path: '/homegarden/homeowner-first-year-budget' },
  { item: 'P2 study abroad', id: 'study-abroad-cost', path: '/education/study-abroad-cost' },
  { item: 'P2 scholarship gap', id: 'scholarship-gap', path: '/education/scholarship-gap' },
  { item: 'P2 loan vs scholarship', id: 'student-loan-vs-scholarship', path: '/education/student-loan-vs-scholarship' }
];

// COMPETITIVE-GAP-STATUS items 1 and 3 — interactive canvas pages, not calc forms.
const INTERACTIVE_PAGES = [
  { item: 'CG-1 function grapher', path: '/graph' },
  { item: 'CG-3 geometry lab', path: '/geometry-lab' }
];

const BAD_RESULT = /Error:|not a function|TypeError|NaN|undefined|Infinity|\bnull\b/;

const reportByProject = {};

function record(projectName, row) {
  reportByProject[projectName] = reportByProject[projectName] || { generated: new Date().toISOString(), pages: [] };
  reportByProject[projectName].pages.push(row);
}

// Same failure contract as tests/e2e/accessibility.spec.js: a FIRST-PARTY
// resource failure or a page exception is fatal; a third-party asset a
// datacenter IP or ORB policy blocks is not a defect in our markup.
function trackFailures(page) {
  const origin = new URL(BASE).origin;
  const firstParty = [];
  const thirdParty = [];
  const errors = [];
  const isFirstParty = (u) => { try { return new URL(u).origin === origin; } catch (e) { return false; } };
  page.on('response', (r) => {
    if (r.status() < 400) return;
    (isFirstParty(r.url()) ? firstParty : thirdParty).push(r.status() + ' ' + r.url());
  });
  page.on('requestfailed', (r) => {
    const f = r.failure();
    const line = 'FAILED ' + r.url() + ' ' + (f && f.errorText);
    (isFirstParty(r.url()) ? firstParty : thirdParty).push(line);
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource/i.test(m.text())) return; // URL-less; covered by the handlers above
    errors.push('console: ' + m.text());
  });
  return { firstParty, thirdParty, errors };
}

test.describe('competitor-gap pages', () => {
  for (const tool of GAP_TOOLS) {
    test(`${tool.id} is live and still calculates (${tool.item})`, async ({ page }, testInfo) => {
      const t = trackFailures(page);
      const resp = await page.goto(tool.path, { waitUntil: 'domcontentloaded' });

      // A gap page that is a 404 — or a redirect away from its own slug — fails
      // the claim it is standing in for.
      expect(resp && resp.status(), `HTTP status for ${tool.path}`).toBe(200);
      expect(new URL(page.url()).pathname.replace(/\/$/, ''), `${tool.path} redirected away`).toBe(tool.path);

      await expect(page.locator('#mainContent h1')).toBeVisible({ timeout: 15_000 });

      // Indexable: these pages exist to be found.
      const robots = await page.locator('meta[name="robots"]').getAttribute('content').catch(() => null);
      expect(String(robots || ''), `noindex on ${tool.path}`).not.toMatch(/noindex/i);

      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href').catch(() => null);
      expect(canonical, `missing canonical on ${tool.path}`).toBeTruthy();
      let canonicalUrl;
      try { canonicalUrl = new URL(canonical); } catch (e) { canonicalUrl = null; }
      expect(canonicalUrl, `canonical is not absolute on ${tool.path}: ${canonical}`).toBeTruthy();
      const servingOrigin = new URL(page.url()).origin;
      expect([PROD_ORIGIN, servingOrigin], `canonical origin on ${tool.path}: ${canonicalUrl.origin}`)
        .toContain(canonicalUrl.origin);
      expect(canonicalUrl.pathname.replace(/\/$/, ''), `canonical is not self-referencing on ${tool.path}`)
        .toBe(tool.path.replace(/\/$/, ''));

      // The calculator still works: fill nothing, press Calculate, expect output.
      const form = page.locator('#calc-form');
      const inputs = form.locator('.calc-input:visible, input:visible, select:visible');
      await expect(inputs.first()).toBeVisible({ timeout: 15_000 });
      const calcBtn = form.locator('.calc-btn, button[type=submit], button');
      if (await calcBtn.count()) await calcBtn.first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(900);

      const resultText = ((await page.locator('#result-area').textContent().catch(() => '')) || '').trim();
      expect(resultText.length, `no result rendered on ${tool.path}`).toBeGreaterThan(0);
      expect(BAD_RESULT.test(resultText), `bad result text on ${tool.path}: ${resultText.slice(0, 200)}`).toBe(false);

      expect(t.errors, `page errors on ${tool.path}: ${t.errors.join(' | ')}`).toEqual([]);
      expect(t.firstParty, `first-party failures on ${tool.path}: ${t.firstParty.join(' | ')}`).toEqual([]);

      record(testInfo.project.name, {
        item: tool.item, id: tool.id, path: tool.path, status: resp.status(),
        canonical, resultChars: resultText.length, thirdParty: t.thirdParty
      });
    });
  }

  for (const pageDef of INTERACTIVE_PAGES) {
    test(`${pageDef.path} interactive page renders (${pageDef.item})`, async ({ page }, testInfo) => {
      const t = trackFailures(page);
      const resp = await page.goto(pageDef.path, { waitUntil: 'domcontentloaded' });
      expect(resp && resp.status(), `HTTP status for ${pageDef.path}`).toBe(200);
      // These two are STANDALONE pages (deploy/graph.html, deploy/geometry-lab.html),
      // not SPA-shell routes like the tool pages: they ship their own markup and have
      // no #mainContent. Assert what the claim means for them — one visible h1, real copy.
      await expect(page.locator('h1'), `h1 count on ${pageDef.path}`).toHaveCount(1);
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
      const h1Text = ((await page.locator('h1').first().innerText()) || '').trim();
      const text = ((await page.locator('body').innerText()) || '').trim();
      expect(text.length, `thin content on ${pageDef.path}`).toBeGreaterThan(400);
      expect(t.errors, `page errors on ${pageDef.path}: ${t.errors.join(' | ')}`).toEqual([]);
      expect(t.firstParty, `first-party failures on ${pageDef.path}: ${t.firstParty.join(' | ')}`).toEqual([]);
      record(testInfo.project.name, {
        item: pageDef.item, id: pageDef.path, path: pageDef.path, status: resp.status(),
        canonical: await page.locator('link[rel="canonical"]').getAttribute('href').catch(() => null),
        h1: h1Text, resultChars: text.length, thirdParty: t.thirdParty
      });
    });
  }

  test.afterAll(() => {
    const outDir = path.join(__dirname, '..', '..', 'test-results');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const perProject = {};
    for (const projectName of Object.keys(reportByProject)) {
      const file = path.join(outDir, 'gap-pages-' + projectName + '.json');
      let accumulated = reportByProject[projectName];
      try {
        const prev = JSON.parse(fs.readFileSync(file, 'utf8'));
        // Merge (not overwrite) so a chunked rerun accumulates instead of wiping.
        const seen = new Set((prev.pages || []).map((p) => p.path));
        accumulated.pages = (prev.pages || []).concat(accumulated.pages.filter((p) => !seen.has(p.path)));
      } catch (e) { /* first run */ }
      fs.writeFileSync(file, JSON.stringify(accumulated, null, 2));
      console.log(`📋 gap-pages report: ${file} (${accumulated.pages.length} pages)`);
    }

    // Re-read BOTH projects off disk before building the durable copy. afterAll runs
    // once per project, in a worker that only knows its own rows — building the durable
    // file from this worker's in-memory map recorded one project and silently dropped
    // the other (measured: the first green run wrote 50 pages / mobile-chromium only,
    // while the desktop report sat right next to it on disk).
    for (const entry of fs.readdirSync(outDir)) {
      const m = /^gap-pages-(.+)\.json$/.exec(entry);
      if (!m) continue;
      try {
        perProject[m[1]] = JSON.parse(fs.readFileSync(path.join(outDir, entry), 'utf8'));
      } catch (e) { /* unreadable project file — skip it rather than abort the evidence */ }
    }

    // DURABLE COPY: test-results/ is gitignored AND wiped at the start of every
    // Playwright run, so a report that only lives there is destroyed by the next
    // suite (this happened — the evidence for a green run was erased by an
    // unrelated health-check sweep). Write the same evidence into data/, which is
    // tracked, so "page-level verification passed" stays checkable after the fact.
    try {
      const durable = { generated: new Date().toISOString(), source: 'tests/e2e/gap-pages.spec.js', base: BASE, projects: {} };
      for (const projectName of Object.keys(perProject)) {
        const pages = perProject[projectName].pages || [];
        durable.projects[projectName] = {
          pages: pages.length,
          allHttp200: pages.every((p) => p.status === 200),
          pages_detail: pages.map((p) => ({
            id: p.id, path: p.path, item: p.item, status: p.status,
            canonical: p.canonical, resultChars: p.resultChars,
            thirdPartyFails: (p.thirdParty || []).length
          }))
        };
      }
      const first = Object.values(durable.projects)[0] || { pages_detail: [] };
      const all = first.pages_detail || [];
      durable.summary = {
        distinct_pages: all.length,
        http_200: all.filter((p) => p.status === 200).length,
        min_result_chars: all.length ? Math.min(...all.map((p) => p.resultChars)) : 0,
        missing_canonical: all.filter((p) => !p.canonical).length
      };
      const durableFile = path.join(__dirname, '..', '..', 'data', 'gap-pages-verification.json');
      fs.writeFileSync(durableFile, JSON.stringify(durable, null, 2) + '\n');
      console.log(`📋 gap-pages durable evidence: ${durableFile}`);
    } catch (e) { /* evidence copy is best-effort */ }
  });
});
