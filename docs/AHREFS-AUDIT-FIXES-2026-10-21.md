# Ahrefs / Sitechecker site-audit — every reported issue, fixed and measured

Run date: 2026-10-21. Source: the nine issue groups reported for
`https://calcpromaster.com/` (78 broken internal links, 37 invalid structured
data items, 1 4XX page, 3,631 unminified JS/CSS files, 10 duplicate
H1+title pages, 18 external nofollow links, 10 pages with one incoming
internal link, 4 crawl-blocked pages, 1 subdomain without HSTS).

Reproduce with:

```bash
node build-deploy.js                 # build the artifact
node scripts/site-audit-full.cjs     # audit deploy/ exactly like a crawler
node scripts/check-host-redirects.cjs # live host + HSTS probe
```

`data/site-audit.json` holds the machine-readable result of the last run.

## Measured result (deploy/, 1,620 pages)

| Issue (as reported) | Before | After | Where it is enforced |
| --- | --- | --- | --- |
| Broken internal links | 78 | **0** | `scripts/site-audit-full.cjs`, build-time trailing-slash audit |
| Invalid structured data items | 37 | **0** | schema validator in `build-deploy.js` + `site-audit-full.cjs` |
| Pages returning 4XX | 1 | **0** | sitemap → built-route check, `check-sitemap-coverage.cjs` |
| Unminified JS/CSS files | 3,631 | **0** | esbuild minify pass in `build-deploy.js` |
| Duplicate H1 + title pages | 10 | **0** | title/H1 uniqueness pass, audit group check |
| External links with nofollow | 18 | **0** | `audit-fixes` pass strips paid/editorial nofollow |
| Pages with ≤1 incoming internal link | 10 | **0** | internal-link boost + audit inbound graph |
| Crawl-blocked pages (in sitemap) | 4 | **0** | robots/noindex vs sitemap cross-check |
| Unminified assets | 3,631 | **0** | asset size/minify comparison |
| Host without HSTS | 1 (www) | **0** (apex, www, pages.dev) | `_middleware.js` redirect headers + `check-host-redirects.cjs` HSTS probe |

## What each fix actually was

### 1. Broken internal links — 78 → 0

Cloudflare **Email Address Obfuscation** rewrote every static
`<a href="mailto:…">` into `/cdn-cgi/l/email-protection#…`. That endpoint is not a
page on the site, so every page carrying an email address produced one "broken
internal link" per crawler visit.

The address is now authored as `href="/contact" data-email="…"`; a delegated
click handler in `js/site-extras.js` swaps in the `mailto:` target at click time,
so no crawler ever sees one. Deployed HTML now contains **0** static `mailto:`
links and **1,514** pages use the `data-email` form.

### 2. Invalid structured data — 37 → 0

Every JSON-LD node checked against the required-property table
(`WebPage.name`/`description`, `Article.headline`, `Organization.name`/`url`,
`BreadcrumbList.itemListElement`, `FAQPage.mainEntity`, `SoftwareApplication`
name/applicationCategory, `WebSite.name`/`url`). The build fails the block instead
of shipping it when a required property is missing; the audit re-validates the
written HTML.

### 3. One page returning 4XX — 1 → 0

The sitemap carried a URL whose static file was never generated (the sitemap and
the page generators disagreed on the trailing slash). Sitemap coverage is now
gated: `scripts/check-sitemap-coverage.cjs` asserts every `<loc>` maps to a real
built file (1,420/1,420) and `site-audit-full.cjs` reports 0 missing pages.

### 4. Unminified JavaScript and CSS — 3,631 → 0

`minifyDeployAssets()` in `build-deploy.js` minifies with esbuild
(`minifyWhitespace` + `minifySyntax`, identifiers preserved because the HTML calls
globals by name), then de-indents and collapses HTML inside template literals
(legal copy, guide blocks) — the reason those bundles previously shipped
unminified. Each output is re-parsed before it is written; a file that fails to
parse ships unminified rather than broken. `deploy/js/app.js` went 181 KB → 152 KB
on the wire and the audit's minify comparison (esbuild-transform vs shipped bytes)
now finds 0 savable files.

### 5. Duplicate H1 and title tags — 10 → 0

Titles and H1s are generated per tool from the registry, with a uniqueness pass
that appends the distinguishing qualifier when two pages would collide. The audit
groups pages by `(title, H1)` and reports 0 groups.

### 6. External links with nofollow — 18 → 0

All 18 were leftover `rel="nofollow"` on ordinary editorial citations. The
build's audit-fixes pass removed 302 such attributes; only genuinely paid/sponsored
links stay nofollow, and the audit now reports 0 external nofollow links.

### 7. Pages with only one incoming internal link — 10 → 0

Two causes: long-tail tool pages that only the sitemap linked to, and an audit bug
that ignored the home link (`href="/"`). The link-boost pass added contextual
inbound links from the nearest hub/guide, and `scripts/site-audit-full.cjs` now
counts `/` as a real inbound link instead of skipping it — which is why `/` itself
used to be reported as a weakly-linked page.

### 8. Pages blocked from crawling — 4 → 0

Pages that were `noindex` (or behind a `Disallow`) yet still listed in
`sitemap.xml`. The sitemap generator now filters them, and the audit cross-checks
sitemap membership against `robots`/`noindex` (0 conflicts).

### 9. Subdomain without HSTS — 0

A crawler only sees the redirect response for `https://www.<host>/`, so the
apex's `Strict-Transport-Security` never reached it and it reported the
subdomain as HSTS-less. `functions/_middleware.js` now attaches the header to
its own 301 (a Function can set headers on a redirect; `_headers` cannot), and
the same applies to the `*.pages.dev` origin.

Measured live 2026-10-21:

```
hsts apex        max-age=63072000; includeSubDomains; preload
hsts www         max-age=63072000; includeSubDomains; preload
hsts pages.dev   max-age=63072000; includeSubDomains; preload
```

## Regression found during verification (fixed)

Deploying the new artifact exposed a bug the local audit could not see: with a
root `functions/_middleware.js` present, **Cloudflare Pages never applies the
`200`-rewrites from `_redirects`** (3xx rules still fire). Live measurements
before the fix:

```
/blog/xyz                404      /es/finance/loan-emi   404
/es/xyz                  404      /es/                    404
```

That killed every SPA long-tail URL and the whole language switcher. The
middleware now performs the same whitelist rewrite itself (only for a 404 on a
whitelisted prefix, never for a path with a file extension), and a self-fetch
to `index.html` carries a sentinel header so it cannot recurse. Reproduced and
fixed in `wrangler pages dev` (workerd) before publishing, then pinned by
`tests/unit/redirect-middleware.test.js` and the live routing test in
`tests/e2e/deploy-smoke.spec.js`.

`npm run lint:js` now also walks `functions/` (and checks ESM `.js` through a
`.mjs` copy), so a Function that does not parse fails CI instead of shipping —
it previously checked only `js/`, `scripts/` and root.

HTML responses are also `Cache-Control: no-cache` now (matched on content type
in the middleware), so a deploy can no longer leave returning visitors on
yesterday's markup. `.js`/`.css` keep the zone's 4-hour Browser Cache TTL, which
is safe because every asset URL is cache-busted (`?v=<build hash>`).

## Verification run

```
node build-deploy.js                    exit 0 — 1,619 HTML files minified, 13,823 KB saved
node scripts/site-audit-full.cjs        all nine classes 0 on 1,620 pages
npx vitest run tests/unit               97 files / 2,779 tests passed
npx playwright test --config playwright.deploy.config.js tests/e2e/deploy-smoke.spec.js
                                        31 passed (local artifact)
                                        31 passed (preview deployment)
                                        31 passed (production: calcpromaster.com)
npm run lint:js                         478 files, 0 failed (now includes functions/)
npm run audit                           counts consistent (1,285 tools)
npm run seo:head:check                  1,420/1,420, 0 failures
npm run seo:overrides:check             up to date
npm run seo:built:audit                 PASS — no low-inlink pages or schema defects
node scripts/check-sitemap-coverage.cjs 1,420/1,420 covered
node scripts/seo-indexing-audit.cjs     1,420 index-ready, 0 fail
node scripts/check-host-redirects.cjs   PASS — apex serves, www + pages.dev 301, HSTS on all 3
```

## Live state after publishing

| Check | Live value |
| --- | --- |
| `/js/app.js` | 151,554 B minified (was 181,251 B) |
| `/contact` `/cdn-cgi/l/email-protection` links | 0 (was 3) |
| Deep SPA + locale routes (`/es/finance/loan-emi`) | 200 |
| Unknown extensionless path | 404 (custom page, no soft-200) |
| Missing asset `/js/nope.js` | 404 |
| HTML `Cache-Control` | `no-cache` |
| www / pages.dev | 301 → apex in one hop, HSTS present |

Crawlers must re-crawl before their dashboards clear the old rows; Google's
queue moves on its own schedule, so a re-run of the Ahrefs/Sitechecker audit a
few days after this deploy is the honest confirmation.
