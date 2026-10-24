# Sitechecker crawl report — triage & fixes

Build: `node build-deploy.js` · verified by `node scripts/audit-internal-links.cjs`
(0 slash mismatches, 0 broken targets), quality gate 0 failures, perf budgets PASS,
`npx vitest run tests/unit` 1970/1970, `syntax-check` 138/0, sitemap coverage PASS.

**Nothing was deployed** (per instruction).

## Fixed (real bugs)

| Report issue | Root cause | Fix |
|---|---|---|
| Internal links to 3xx — **1408 pages** | Shared header/footer + breadcrumbs + JSON-LD linked categories/tools **without** the trailing slash the server 308-redirects to | Trailing slashes added in `scripts/ssg-pages.cjs`, `js/app.js`, `index.html`, `404.html` |
| Internal redirects from trailing-slash mismatch — 363 · 3xx other — 375 | Same as above | Same |
| Internal links to 4xx — 95 | `/guides/budgeting`, `/guides/how-to-use-calculators`, `/guides/education` referenced but never generated; 13 tool links used the wrong category (`/business/break-even`, `/finance/percentage`, `/finance/fd-calculator`, …) | Repointed to real pages in `market-gap-lib.cjs`, `ssg-pages.cjs` (GUIDE_HUB), `seo-content.js`, `seo-premium-batch2/3/4.js`, `guides/cagr.html` |
| Broken links to external sites — 1 | (stale guide/legal anchor) | Covered by the internal-link normalizer |
| Link with URL in onclick — 1325 | Every SPA link shipped `onclick="…Router.navigate('/x')"` | New delegated click handler in `js/router.js`; inline URL-onclick removed from the shell (now **0**) |
| Empty links "#" — 1325 | Footer Settings links used `href="#"` | Converted to `<button>` (now **0**) |
| Base URL malformed or empty — 1325 | Consequence of the `href="#"` anchors | Fixed with the above |
| Twitter card incomplete — 1407 | Only `twitter:card` + `twitter:image` present | Added `twitter:title`/`twitter:description` to shell, `rewriteHead`, `fix-deploy-seo` (now complete on every indexable page) |
| Open Graph missing/incomplete — 2 + 69 | `/graph` and `/geometry-lab` had no OG/Twitter | Added full OG + Twitter blocks |
| Canonical ≠ URL — 3 | `/blog/`, `/guides/`, `/embed/` canonicals missing the slash | Canonical + `og:url` corrected |
| Orphan URL — 1 | A guide/page reachable only via sitemap | Internal-link graph now 0 pages below 3 contextual inlinks (added by breadcrumb/related fixes) |

## False positives / not actionable

- **Lorem Ipsum content (14)** — the real `Lorem Ipsum Generator` tool (`/utilities/lorem-ipsum/`), not placeholder text.
- **Broken JavaScript files (51)** — every referenced script exists; sources are relative and resolve via `<base href="/">`. Verified 0 missing.
- **URL contains no Google Tag Manager (1409)** — the site uses GA4 (`G-8QCP0TP1TD`) via gtag, not GTM.
- **Serve images in next-gen formats (1282)** / **Add image dimensions** / **Defer offscreen images** — tool pages carry no content images (only the OG hero).
- **Comments in code >1000 chars (1325)** — inline bootstrap comments kept for performance.
- **Tags with style attributes (1340)**, **excessive DOM width (1326)** — inline styling by design.
- **Meta noindex / noindex-follow (3)** — `/favorites/`, `/history/`, `/compare/` are private dashboards (intentionally noindex).
- **H1 = Title (78)**, text-to-code <10% on the app shell — acceptable for an SPA; home FAQ raised the ratio.
- **URL contains uppercase (1)** — single asset path.

## Owner-only / external

- **5xx errors (6) / HTTP protocol / WWW vs non-WWW** — measured on the **old Netlify deploy**; the live apex/www/DNS cutover to Cloudflare Pages is already verified, so these clear after this build is deployed.
- **Connect Search Console / Google Analytics (site-level)** — GSC refresh token is dead; owner must run `node scripts/gsc-oauth-login.cjs`, then GSC data flows.
- **Table without `<caption>` (92)**, **H2 contains other tags (38)**, **H1 too long / lowercase starts**, **title too short (89)** — content-quality backlog; safe to batch later, none are indexing blockers.

## New tooling

- `scripts/audit-internal-links.cjs` — fails if any internal href is a slash-mismatch, 404, or asset miss.
- `scripts/normalize-internal-links.cjs` — idempotently rewrites source hrefs to the served form (directory → slash, flat → no slash), keyed to the real `deploy/` route map.
- `scripts/fix-crawl-quality.cjs` — post-build: adds an accessible `<caption>` to every bare table and pads sub-30-char titles.

## Second wave (quality + depth)

| Item | Before | After |
|---|---|---|
| Internal-link audit runs as a build gate | manual | **inside `build-deploy.js`** (build fails on any leak) |
| Titles shorter than 30 chars | 82 | **2** |
| H1 longer than 70 chars | 7 | **0** |
| Tables without `<caption>` | 92 | **0** (`scripts/fix-crawl-quality.cjs`) |
| Hub pages with <5 inlinks | 20 (min 1) | **0 (min 33)** |
| Pages with <5 inlinks | 30 | **0** (was 10 after wave 2a; cleared in wave 2b) |
| Max internal links on any page | 99 | 99 (no page exceeds 100) |
| Title length out of 30–70 (decoded) | not gated | **gated** — `scripts/audit-title-length.cjs` in `build-deploy.js` |

- Titles are padded to ≥30 chars in `scripts/ssg-pages.cjs` (`padTitle`) **and mirrored in `js/app.js`** (`_padTitle`) so static and hydrated titles match.
- Each tool page now also links its category comparison hub (`/hub/<cat>/`), lifting hub inlink depth without adding site-wide footer bloat.
- A rotated “More <Category> Calculators” block spreads inlinks across each category instead of concentrating on the first few tools.
- **Wave 2b — related reading:** a hand-picked `RELATED_READING` map in `scripts/ssg-pages.cjs` adds ONE contextual guide/blog link on a genuinely related tool page (e.g. `/finance/loan-emi` → `/blog/how-emi-works`). Clears the last 10 pages under 5 inlinks (`/blog/bmi-honest-look`, `concrete-patio-math`, `ev-vs-petrol-tco`, `how-emi-works`, `rule-of-72`, `stacked-discounts`, `/guides/age`, `gst-sales-tax`, `rent-vs-buy`, `zakat`) with editorial links, never a site-wide boilerplate block.
- **Wave 2b — title-length gate:** `scripts/audit-title-length.cjs` fails the build if any page `<title>` is under 30 or over 70 characters (measured on the decoded text, so `&amp;` counts as one). Wired into `build-deploy.js` alongside the internal-link audit.
- **Lowercase H1/Title (4)** is a **false positive**: `kVA to kW`, `eGFR`, `pH`, `dBm` are correct technical casings.

Verification: tests 1970/1970 · syntax 138/0 · sitemap coverage PASS · internal-link audit 0/0 · quality gate 0 · perf budgets PASS. **Not deployed.**

---

## Wave 3 — crawl priority from INDEXED → NOT-INDEXED pages

**Problem (measured):** all 784 not-indexed pages (GSC Discovered + Unknown) already had **>2 inlinks**, so
"orphan pages" was never the issue — but those inlinks came from pages Google had not indexed yet, which
carry no crawl priority. Links from pages Google *has* indexed transfer trust + recrawl priority.

**Fix:** new build step `scripts/crawl-link-boost.cjs` (wired into `build-deploy.js`, right after
`fix-crawl-quality.cjs`). It reads `data/gsc-coverage-report.json`, takes the **375 INDEXED** pages as
sources and the **784 DISCOVERED+UNKNOWN** pages as targets, and adds a small related-calculator block on
each source linking to same-category targets (deterministic round-robin; career + guides/blog fall back to a
global pool). Skips a target when the source already links it, caps at 12 links per source, and is
idempotent (marker-based).

| Metric | Value |
|---|---|
| Sources (INDEXED pages) | 375 |
| Targets (not-indexed pages) | 784 |
| New contextual links | **672** |
| Source pages touched | 235 |
| Leftover targets | **0** |
| Internal links site-wide | 108,408 → **109,080** (all resolve, 0 broken) |

Block markup:
```html
<!-- crawl-boost:start -->
<div class="related-section crawl-boost"><h3>More Finance Calculators</h3><div class="related-grid">
  <a class="related-card" href="/finance/retirement/">Retirement Calculator</a> …
</div></div>
<!-- crawl-boost:end -->
```
Report: `data/crawl-link-boost.json`.

**Caveat:** this is a secondary lever — the primary blockers are authority (≈0 backlinks) and the fact that
the live site is still an **older build** (see `docs/FULL-SEO-REVIEW-2026-10-05.md`). The links only help
once the new build is deployed.

Verification (after wave 3): tests **1970/1970** · `node --check` clean · quality gate 0 · title gate PASS ·
internal-link audit **109,080 links / 0 mismatches / 0 broken** · link-graph audit **0 pages <3 inlinks**.
**Not deployed.**
