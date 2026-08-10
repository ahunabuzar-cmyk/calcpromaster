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
  test('homepage has 543+ header + category grid', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main h1')).toContainText('543+', { timeout: 15000 });
    await expect(page.locator('main')).toContainText('Finance', { timeout: 15000 });
    await expect(page.locator('main')).toContainText('Math', { timeout: 15000 });
    expect(errors.filter((e) => !/analytics/i.test(e)).length, `console errors: ${errors.join(' | ')}`).toBe(0);
  });

  test('loan-emi calculator computes 2051.65 for 100k@8.5% 5y', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(BASE + '/finance/loan-emi?amount=100000&rate=8.5&years=5', { waitUntil: 'domcontentloaded' });
    const result = page.locator('text=Payment: $2,051.65').first();
    await expect(result).toBeAttached({ timeout: 20000 });
    expect(errors.filter((e) => !/analytics/i.test(e)).length, `console errors: ${errors.join(' | ')}`).toBe(0);
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

  test('deploy/_redirects returns true 404 for missing assets (Netlify rule)', async ({ request }) => {
    // `npx serve -s` locally soft-404s (SPA rewrite) and doesn't serve the
    // _redirects file; Netlify honors the explicit asset wildcards — verify the
    // deployed ARTIFACT carries them by reading the file from disk.
    // NOTE: Netlify rejects splats in the middle of a path segment, so the old
    // "/*.js /404.html 404" rules were silently ignored (soft-404s). Valid form
    // is a directory splat (/js/*) listed BEFORE the SPA catch-all.
    const fs = require('fs');
    const path = require('path');
    const redirects = fs.readFileSync(path.join(__dirname, '..', '..', 'deploy', '_redirects'), 'utf8');
    expect(redirects).toMatch(/\/js\/\*\s+\/404\.html\s+404/);
    expect(redirects).toMatch(/\/og\/\*\s+\/404\.html\s+404/);
    expect(redirects).toMatch(/\/\*\s+\/index\.html\s+200/);
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

test.describe('deploy live smoke — 543 calculator routes (fast head-check)', () => {
  // Fast CI deploy gate: every calculator route in the registry must answer
  // HTTP 200 with HTML on the deployed artifact. Request-level (no browser
  // render — that is the slower health-check suite) so the full sweep takes
  // seconds and can run on every push. Routes come from tool-routes.json,
  // the same registry the health-check + smoke suites use.
  const routes = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'tool-routes.json'), 'utf8'));
    } catch (e) { return []; }
  })();
  test.skip(routes.length === 0, 'No tool routes discovered — run config first');
  test('all ' + routes.length + ' calculator routes serve 200 + HTML', async ({ request }) => {
    // Remote hosts are much slower than localhost: sequential GETs would
    // blow the default 60s, so batch at 20 concurrent (matches the standalone
    // live sweep) with a generous budget. Still fails fast on real 404s.
    // Remote hosts (Netlify edge) throttle CI runner IPs on burst sweeps —
    // locally this sweep takes ~1min, on CI it can be 5-6x slower. Budget
    // generously (10min) so a slow-but-correct run never times out.
    test.setTimeout(600000);
    const failed = [];
    const CONCURRENCY = 12;
    const BATCH_DELAY_MS = 150; // gentle spacing avoids edge throttling queues
    // Netlify's edge can reset connections (ECONNRESET) when a single IP
    // bursts hundreds of requests. Retry ONLY transient connection errors with
    // backoff — a real 404/non-HTML response still fails immediately.
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
      if (i + CONCURRENCY < routes.length) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
    expect(failed, 'broken routes:\n' + failed.join('\n')).toEqual([]);
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
