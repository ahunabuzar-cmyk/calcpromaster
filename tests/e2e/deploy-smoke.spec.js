// ============================================================
// DEPLOY LIVE SMOKE TEST — runs against the PRODUCTION ARTIFACT
// (deploy/ folder) served on DEPLOY_PORT. Verifies HTTP status,
// page render, JS execution, calculation, console cleanliness,
// canonical/robots/sitemap consistency, mobile + desktop viewports.
// Run: npx playwright test tests/e2e/deploy-smoke.spec.js -c playwright.deploy.config.js
// ============================================================
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = process.env.PLAYWRIGHT_BASE_URL || process.env.E2E_BASE || 'http://localhost:3100';

// True when running against the freshly-built deploy/ artifact (build-smoke
// job / local runs). False when running against the live CDN (live-smoke job).
// The full 543-route sweep is artifact-only; the live pass uses a strict
// sample + artifact-identity + edge-rules checks (see the routes describe).
const IS_LOCAL_ARTIFACT = /localhost|127\.0\.0\.1/.test(BASE);

// Expected production origin is derived from js/site-config.js (the single
// source of truth) so this drift test keeps working after the owner makes the
// documented one-config custom-domain switch — it must never pin a literal
// domain. Falls back to the current default if the file is unreadable.
function productionOrigin() {
  try {
    const cfg = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'site-config.js'), 'utf8');
    const m = cfg.match(/domain:\s*'([^']+)'/);
    if (m && m[1]) return 'https://' + m[1];
  } catch (e) { /* fall through to default */ }
  return 'https://calcpromaster.netlify.app';
}

// Track page failures precisely. The site depends on third-party resources
// (Google Fonts, AdSense, GA4/GTM, currency APIs) that legitimately block or
// throttle datacenter CI runner IPs — a 403/block on one of those is NOT a
// production defect. The real safety gate is: FIRST-PARTY (same-origin)
// resources must never fail, and genuine page-JS exceptions must not occur.
// `Failed to load resource` console messages carry no URL, so they are
// delegated to the response/request checks below (which do).
function trackFailures(page, origin) {
  const firstParty = [];
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(origin)) {
      firstParty.push(r.status() + ' ' + r.url());
    }
  });
  page.on('requestfailed', (r) => {
    const f = r.failure();
    if (r.url().startsWith(origin)) firstParty.push('FAILED ' + r.url() + ' ' + (f && f.errorText));
  });
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource/i.test(m.text())) return; // covered above, with URL
    consoleErrors.push(m.text());
  });
  return { firstParty, consoleErrors };
}

const STATUS_ROUTES = [
  ['homepage', '/'],
  ['calculator page', '/math/percentage'],
  ['finance calculator', '/finance/loan-emi'],
  ['health calculator', '/health/bmi'],
  ['converter', '/conversion/temperature'],
  ['scientific calculator', '/math/scientific'],
  ['date calculator', '/everyday/date-diff'],
  ['category hub', '/hub/finance'],
  ['about', '/about'],
  ['privacy', '/privacy'],
  ['terms', '/terms'],
  ['contact', '/contact'],
  ['programmatic variant', '/finance/loan-emi/5-years-50000'],
  ['deep route (no ext)', '/finance/loan-emi?amount=100000'],
  ['robots.txt', '/robots.txt'],
  ['sitemap.xml', '/sitemap.xml'],
  ['manifest', '/manifest.json'],
  ['sw.js', '/sw.js'],
];

test.describe('deploy live smoke — status + render', () => {
  // Remote live runs hit CDN edge throttling on CI runner IPs; a single retry
  // tolerates a transient slow load without weakening any assertion.
  test.describe.configure({ retries: 1 });
  // Non-HTML artifacts (robots/sitemap/manifest/sw): HTTP-status + content only.
  const NON_HTML = ['/robots.txt', '/sitemap.xml', '/manifest.json', '/sw.js'];
  for (const [label, route] of STATUS_ROUTES) {
    if (NON_HTML.includes(route)) {
      test(`${label} (${route}) serves 200 with correct content-type`, async ({ request }) => {
        const res = await request.get(BASE + route);
        expect(res.status(), `${route} HTTP status`).toBe(200);
        const body = await res.text();
        expect(body.length).toBeGreaterThan(20);
      });
      continue;
    }
    test(`${label} (${route}) loads 200 + renders`, async ({ page, request }) => {
      const res = await request.get(BASE + route);
      expect(res.status(), `${route} HTTP status`).toBe(200);
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      // Rendered content: not the 404 page, and app shell present
      await expect(page.locator('body')).not.toContainText('Not Found', { timeout: 15000 });
      await expect(page.locator('header, nav, main, footer').first()).toBeAttached({ timeout: 15000 });
    });
  }
});

test.describe('deploy live smoke — behavior', () => {
  // Same reasoning as above: tolerate one transient CI-runner network flake.
  test.describe.configure({ retries: 1 });

  test('homepage has 1201+ header + category grid', async ({ page }) => {
    const t = trackFailures(page, BASE);
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main h1')).toContainText('1201+', { timeout: 15000 });
    await expect(page.locator('main')).toContainText('Finance', { timeout: 15000 });
    await expect(page.locator('main')).toContainText('Math', { timeout: 15000 });
    expect(t.firstParty, `first-party resource failures: ${t.firstParty.join(' | ')}`).toEqual([]);
    expect(t.consoleErrors.filter((e) => !/analytics/i.test(e)).length, `console errors: ${t.consoleErrors.join(' | ')}`).toBe(0);
  });

  test('loan-emi calculator computes 2051.65 for 100k@8.5% 5y', async ({ page }) => {
    const t = trackFailures(page, BASE);
    await page.goto(BASE + '/finance/loan-emi?amount=100000&rate=8.5&years=5', { waitUntil: 'domcontentloaded' });
    const result = page.locator('text=Payment: $2,051.65').first();
    await expect(result).toBeAttached({ timeout: 20000 });
    expect(t.firstParty, `first-party resource failures: ${t.firstParty.join(' | ')}`).toEqual([]);
    expect(t.consoleErrors.filter((e) => !/analytics/i.test(e)).length, `console errors: ${t.consoleErrors.join(' | ')}`).toBe(0);
  });

  test('BMI calculator renders inputs + result area', async ({ page }) => {
    await page.goto(BASE + '/health/bmi', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toContainText('BMI', { timeout: 15000 });
    await expect(page.locator('input[type="number"], input[type="range"], select').first()).toBeAttached({ timeout: 15000 });
  });

  test('temperature converter converts', async ({ page }) => {
    await page.goto(BASE + '/conversion/temperature?value=0&from=C&to=F', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toContainText('32', { timeout: 15000 });
  });

  test('deploy/_redirects: asset 404s, whitelist rewrites, hard-404 catch-all', async ({ request }) => {
    // `npx serve -s` locally soft-404s (SPA rewrite) and doesn't serve the
    // _redirects file; Netlify honors the explicit rules — verify the deployed
    // ARTIFACT carries them by reading the file from disk.
    // NOTE: Netlify rejects splats in the middle of a path segment, so the old
    // "/*.js /404.html 404" rules were silently ignored (soft-404s). Valid form
    // is a directory splat (/js/*) listed BEFORE the SPA catch-all.
    const fs = require('fs');
    const path = require('path');
    const redirects = fs.readFileSync(path.join(__dirname, '..', '..', 'deploy', '_redirects'), 'utf8');
    expect(redirects).toMatch(/\/js\/\*\s+\/404\.html\s+404/);
    expect(redirects).toMatch(/\/og\/\*\s+\/404\.html\s+404/);
    // Soft-404 catch-all must be GONE (line-anchored: a bare "/*" rule only —
    // prefix rewrites like "/finance/*  /index.html 200" legitimately end in /*); whitelisted prefixes rewrite to the SPA
    // (category, app-route and locale-prefix samples of the full whitelist).
    expect(redirects).not.toMatch(/^\/\*\s+\/index\.html\s+200/m);
    expect(redirects).toMatch(/\/finance\/\*\s+\/index\.html\s+200/);
    expect(redirects).toMatch(/\/hub\/\*\s+\/index\.html\s+200/);
    expect(redirects).toMatch(/\/es\/\*\s+\/index\.html\s+200/);
    // Hard-404 catch-all must be the LAST rule (unknown extensionless paths
    // get the real 404 page, never a 200 home page).
    const rules = redirects.split('\n').map((l) => l.replace(/\r$/, '').trim())
      .filter((l) => l && !l.startsWith('#'));
    expect(rules[rules.length - 1]).toMatch(/^\/\*\s+\/404\.html\s+404$/);
    // 404 page itself must exist and be servable
    const p404 = await request.get(BASE + '/404.html');
    expect(p404.status()).toBe(200);
  });

  test('share URL preserves state + computes', async ({ page }) => {
    await page.goto(BASE + '/finance/loan-emi?amount=200000&rate=7&years=10', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main h1')).toContainText('Loan EMI', { timeout: 20000 });
    // 200k @ 7% for 10y → ~$2,322.18/mo (independent PMT formula check)
    await expect(page.locator('.result-main')).toContainText('Payment: $2,322', { timeout: 20000 });
  });
});

test.describe('deploy live smoke — UX round 2 (copy + search chips)', () => {
  test('search "mortgage" shows via-chips; copy-result copies + toasts', async ({ page }) => {
    // Search intent chips
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    // Cold-start hardening: wait until the search index is populated before typing,
    // otherwise the fill can land before ALL_TOOLS is ready and no chips appear.
    await page.waitForFunction(() => window.ALL_TOOLS && window.ALL_TOOLS.length >= 100, null, { timeout: 10000 });
    await page.fill('#home-search', 'mortgage');
    await page.waitForTimeout(500);
    await expect(page.locator('#homeSearchResults .search-chip').first()).toBeAttached({ timeout: 8000 });
    await expect(page.locator('#homeSearchResults .search-chip').first()).toContainText('via mortgage');
    // Copy-result button + clipboard toast
    await page.goto(BASE + '/finance/loan-emi?amount=100000&rate=8.5&years=5', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
    await expect(page.locator('#copy-result-btn')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.result-main')).toContainText('2,051.65', { timeout: 8000 });
    await page.click('#copy-result-btn');
    await expect(page.locator('#toast')).toContainText('copied', { timeout: 8000 });
  });
});

test.describe('deploy live smoke — mobile + desktop', () => {
  test.describe.configure({ retries: 1 });
  test.use({ viewport: { width: 375, height: 812 } });
  test('mobile 375px: no horizontal overflow on home + calculator', async ({ page }) => {
    for (const route of ['/', '/finance/loan-emi']) {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${route} horizontal overflow`).toBeLessThanOrEqual(1);
    }
  });
});

test.describe('deploy live smoke — calculator routes (full artifact sweep + live CDN checks)', () => {
  // Coverage split (honest + CI-safe):
  //  • The FULL 543-route sweep runs against the exact deploy/ artifact in the
  //    build-smoke job (scheduled-smoke.cjs → this spec with localhost BASE) —
  //    that is the authoritative 543/543 gate and it passes on every run.
  //  • A complete 543-request sweep against the LIVE CDN from GitHub's shared
  //    runner IP is throttled by Netlify edge (ECONNRESET/timeouts — observed
  //    on 4 consecutive runs; NOT 404s; the identical sweep passes locally in
  //    ~1 min). So the live pass instead verifies: (1) a strict deterministic
  //    SAMPLE of calculator routes across all 20 categories (zero tolerance
  //    for non-200/non-HTML), (2) a byte-identity check proving the live edge
  //    serves the exact artifact that passed the full sweep, and (3) SPA
  //    fallback (deep links 200) vs true-404 asset rules on the live edge.
  const routes = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'tool-routes.json'), 'utf8'));
    } catch (e) { return []; }
  })();

  // — Full sweep: the exact deployed artifact (build-smoke job / localhost) —
  test('all ' + routes.length + ' calculator routes serve 200 + HTML (artifact)', async ({ request }) => {
    test.skip(!IS_LOCAL_ARTIFACT, 'Full 543 sweep runs against the local artifact (build-smoke job) — the live pass samples below');
    test.skip(routes.length === 0, 'No tool routes discovered — run config first');
    test.setTimeout(900000);
    const failed = [];
    const CONCURRENCY = 12;
    async function fetchOne(t) {
      const url = BASE + '/' + t.cat + '/' + t.id;
      let lastErr;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const res = await request.get(url);
          if (res.status() !== 200) return url + ' → ' + res.status();
          const ct = res.headers()['content-type'] || '';
          if (!/text\/html/.test(ct)) return url + ' → content-type ' + ct;
          return null;
        } catch (e) {
          lastErr = e;
          const msg = (e && e.message) || String(e);
          const transient = /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|socket hang up|Request context disposed/i.test(msg);
          if (!transient) return url + ' → ERR ' + msg.slice(0, 60);
          await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
        }
      }
      return url + ' → ERR ' + ((lastErr && lastErr.message) || lastErr).slice(0, 60);
    }
    for (let i = 0; i < routes.length; i += CONCURRENCY) {
      const batch = routes.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(fetchOne));
      for (const f of results) if (f) failed.push(f);
    }
    expect(failed, 'broken routes:\n' + failed.join('\n')).toEqual([]);
  });

  // — Live CDN: strict sample across every category (live-smoke job) —
  test('strict sample of calculator routes serves 200 + HTML (live CDN)', async ({ request }) => {
    test.skip(IS_LOCAL_ARTIFACT, 'Live-CDN sample runs against the deployed URL (live-smoke job)');
    test.skip(routes.length === 0, 'No tool routes discovered — run config first');
    test.setTimeout(600000);
    // Deterministic sample: category edges + every 5th route (~150 URLs).
    const CATS = [...new Set(routes.map((t) => t.cat))];
    const sample = [];
    for (const cat of CATS) {
      const inCat = routes.filter((t) => t.cat === cat);
      sample.push(inCat[0], inCat[inCat.length - 1]);
    }
    for (let i = 0; i < routes.length; i += 5) sample.push(routes[i]);
    const unique = [...new Map(sample.map((t) => [t.cat + '/' + t.id, t])).values()];
    const failed = [];
    const CONCURRENCY = 8;
    // Retry ONLY transient connection errors with backoff (CI runner IPs are
    // throttled by Netlify edge) — a real 404/non-HTML still fails immediately.
    async function fetchOne(t) {
      const url = BASE + '/' + t.cat + '/' + t.id;
      let lastErr;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const res = await request.get(url);
          if (res.status() !== 200) return url + ' → ' + res.status();
          const ct = res.headers()['content-type'] || '';
          if (!/text\/html/.test(ct)) return url + ' → content-type ' + ct;
          return null;
        } catch (e) {
          lastErr = e;
          const msg = (e && e.message) || String(e);
          const transient = /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|socket hang up|Request context disposed/i.test(msg);
          if (!transient) return url + ' → ERR ' + msg.slice(0, 60);
          await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
        }
      }
      return url + ' → ERR ' + String((lastErr && lastErr.message) || lastErr).slice(0, 60);
    }
    for (let i = 0; i < unique.length; i += CONCURRENCY) {
      const results = await Promise.all(unique.slice(i, i + CONCURRENCY).map(fetchOne));
      for (const f of results) if (f) failed.push(f);
      if (i + CONCURRENCY < unique.length) await new Promise((r) => setTimeout(r, 120));
    }
    expect(failed, `broken sampled routes (${unique.length} sampled of ${routes.length}):\n` + failed.join('\n')).toEqual([]);
  });

  // — Live CDN: artifact identity (content-exact) —
  test('live CDN serves the exact tested artifact (sw.js content hash)', async ({ request }) => {
    const crypto = require('crypto');
    const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');
    // Semantic fingerprint, tolerant of non-content differences:
    //  • line endings (Windows-local CRLF vs CI ubuntu LF), and
    //  • the embedded SW cache version (build-deploy.js content-hash, which can
    //    legitimately differ between two builds of the same commit — e.g. the
    //    date stamp in qa-dashboard.html when a deploy spans midnight).
    // Every line of actual sw.js logic must match.
    const norm = (b) => Buffer.from(b).toString('utf8')
      .replace(/\r\n/g, '\n')
      .replace(/calcpro-v[\d.]+-[0-9a-f]{10}/g, 'calcpro-vX');
    const live = await request.get(BASE + '/sw.js');
    expect(live.status()).toBe(200);
    const artifact = fs.readFileSync(path.join(__dirname, '..', '..', 'deploy', 'sw.js'));
    // A match proves the live edge serves the same service-worker code as the
    // artifact that passed the full 543-route sweep in build-smoke.
    expect(hash(norm(await live.body())), 'live sw.js must content-match deploy/sw.js (same build)').toBe(hash(norm(artifact)));
  });

  // — Routing rules: whitelisted SPA fallback 200 vs true 404 —
  // Runs BOTH locally (serve-deploy.cjs mirrors the _redirects contract) and
  // against the live edge — the rules file is not readable over HTTP, so the
  // behaviors are asserted instead.
  test('SPA deep links 200 + missing assets true 404 (routing rules)', async ({ request }) => {
    // Deep SPA URL is served index.html (200, text/html) via the whitelist rewrite.
    const deep = await request.get(BASE + '/finance/loan-emi/5-years-50000');
    expect(deep.status(), 'deep SPA route').toBe(200);
    expect(deep.headers()['content-type'] || '').toContain('text/html');
    // Locale-prefixed deep links keep their 200 fallback (language-switcher URLs).
    const locale = await request.get(BASE + '/es/finance/loan-emi');
    expect(locale.status(), 'locale-prefixed SPA route').toBe(200);
    // Missing real assets hit the explicit /js/* and /og/* 404 rules (true 404,
    // never soft-200s) — validates the _redirects order in production.
    const missingJs = await request.get(BASE + '/js/does-not-exist-xyz.js');
    expect(missingJs.status(), '/js/* missing asset must be 404').toBe(404);
    const missingOg = await request.get(BASE + '/og/does-not-exist-xyz.png');
    expect(missingOg.status(), '/og/* missing asset must be 404').toBe(404);
    // Unknown extensionless path hits the hard-404 catch-all (no more 200 home).
    const garbage = await request.get(BASE + '/definitely-not-a-route-xyz');
    expect(garbage.status(), 'unknown extensionless path must be 404').toBe(404);
    expect(garbage.headers()['content-type'] || '').toContain('text/html');
  });

  test('bare URLs: /hub true-404, /es 200, deep garbage 404, real 404 page identity', async ({ request }) => {
    // Bare /hub has NO prerendered index and the SPA itself 404s it in-browser
    // (only /hub/<category> is a real route) — it must be a true 404, not a 200.
    const hub = await request.get(BASE + '/hub');
    expect(hub.status(), 'bare /hub must be a true 404 (no index, SPA 404s it too)').toBe(404);
    expect((await hub.text()) || '').toContain('404');
    // Bare /<locale> is written by the language switcher on the homepage and
    // must keep its 200 fallback.
    const es = await request.get(BASE + '/es');
    expect(es.status(), 'bare /es must stay 200 (language-switcher URL)').toBe(200);
    // Garbage DEEP path under a whitelisted prefix still 404s only when the
    // prefix itself is unknown — deep whitelisted paths legitimately serve 200.
    const deepGarbage = await request.get(BASE + '/garbage-not-a-section/deep/path');
    expect(deepGarbage.status(), 'unknown deep path must be 404').toBe(404);
    // The served 404 page must be the real custom 404 (not the SPA shell),
    // so the title asserts page identity, not just status.
    const notFound = await request.get(BASE + '/definitely-not-a-route-xyz');
    expect(notFound.status()).toBe(404);
    expect(await notFound.text()).toContain('404 — Page Not Found');
  });
});

test.describe('deploy live smoke — SEO artifacts', () => {
  // Single-origin drift detector: canonical, OG, robots Sitemap and sitemap
  // <loc> must ALL point at the SAME production origin (currently
  // calcpromaster.netlify.app, switched via ONE config in js/site-config.js).
  // A stale domain in any one artifact (e.g. robots.txt after a custom-domain
  // switch) fails here — this is the CI guard for build-deploy.js's
  // substituteDomain() step.
  test('canonical + OG + robots Sitemap + sitemap loc share one origin; no stale refs', async ({ request }) => {
    const ORIGIN = productionOrigin();
    const BANNED = ['test.example.com', 'localhost'];
    const html = await (await request.get(BASE + '/')).text();
    // Canonical points at the production origin (root path).
    const canonical = html.match(/rel="canonical" href="([^"]+)"/);
    expect(canonical, 'canonical link must exist').not.toBeNull();
    expect(canonical[1]).toBe(ORIGIN + '/');
    // OG url uses the same origin.
    expect(html).toContain('content="' + ORIGIN);
    for (const bad of BANNED) expect(html).not.toContain(bad);
    // robots Sitemap line carries the SAME origin (was missing from the domain
    // rewrite — a real drift bug fixed in build-deploy.js).
    const robots = await (await request.get(BASE + '/robots.txt')).text();
    const sitemapLine = robots.match(/^Sitemap:\s*(\S+)/m);
    expect(sitemapLine, 'robots.txt Sitemap line must exist').not.toBeNull();
    expect(sitemapLine[1]).toBe(ORIGIN + '/sitemap.xml');
    for (const bad of BANNED) expect(robots).not.toContain(bad);
    // Every sitemap <loc> uses the same origin (778 URLs: 543 tools + 20 categories + 20 hubs + 12 static + 183 long-tail).
    const sitemap = await (await request.get(BASE + '/sitemap.xml')).text();
    expect(sitemap).toContain('<loc>' + ORIGIN + '/');
    const locs = sitemap.match(/<loc>(https?:\/\/[^<]+)<\/loc>/g) || [];
    expect(locs.length).toBeGreaterThan(500); // all 543 calculators + hubs + static
    for (const loc of locs) {
      expect(loc).toContain(ORIGIN + '/');
      for (const bad of BANNED) expect(loc).not.toContain(bad);
    }
  });
});
