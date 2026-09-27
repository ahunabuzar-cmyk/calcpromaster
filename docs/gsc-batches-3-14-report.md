# GSC Batches #3–#14 — Full-Site Coverage Report (2026-09-27)

## What ran
- Batches #3→#14 (skip 200→1300) via `scripts/gsc-batch-inspect.cjs` on property `https://calcpromaster.com/` — **1,137 URLs inspected today** (100×11 + last 37).
- Run mode: 4 parallel lanes (~30 req/min, well under the 600/min limit; ~1,158 of the 2,000 daily quota used).
- Merged with batch #1 (9 URLs) + batch #2 (21 URLs) → **1,167 unique URLs inspected** of the live 1,337-URL sitemap (87% coverage).
- Aggregator: `scripts/gsc-aggregate-coverage.cjs` → `data/gsc-coverage-report.json`.

## Verdict on the "Not indexed 1.46K / Indexed 81" screenshot
The screenshot is the **netlify.app property** (old host, banner "site is moving"). Inspection of the **calcpromaster.com property** is already far ahead:

| Coverage | URLs | % |
|---|---|---|
| **Indexed** | **375** | **32%** |
| Discovered – currently not indexed | 339 | 29% |
| URL is unknown to Google | 445 | 38% |
| Crawled – currently not indexed | 0 | 0% |
| Page with redirect | 2 | 0.2% |
| Alternate page w/ canonical | 3 | 0.3% |
| Excluded by noindex (tool pages) | 3 | 0.3% |

## Root causes found (and FIXED today)
1. **Sitemap-vs-server slash mismatch (the big one).** 87 sitemap URLs (about, guides/*, blog/*, legal) are flat `.html` pages whose 200 lives at `/path` (non-slash) — the sitemap listed `/path/` which 301s back. Every directory page's canonical ALSO pointed at the non-slash form while its 200 is at `/path/`. This one inconsistency produced GSC's "Page with redirect" (20), part of "Alternate canonical" (3), and burned one redirect hop on ~90 sitemap URLs.
   - **Fix:** `generate-sitemap.js` now picks per-URL the form that actually serves 200 (deploy-tree aware); `scripts/ssg-pages.cjs` `writePage()` now rewrites canonical + og:url to the slash form for directory pages.
   - **Verified:** all 1,347 sitemap locs = exact-200 form (was 1,260/87 split); quality gate PASS; tests 1,827/1,827 PASS.
2. **3 real tool pages noindexed in the OLD live build** (`/finance/loan-emi/`, `/education/letter-grade/`, `/finance/capital-gains/`) — already `index,follow` in the new build; gone after drag-drop.
3. **2 guide URLs redirected live** (`/guides/body-fat/`, `/guides/debt-ratio/`) — same slash issue; new sitemap serves their exact 200 form.

## What needs Google's own time (NOT a bug)
- **Discovered (339):** Google knows the URLs but hasn't crawled them — zero-authority new domain. Faster after deploy + IndexNow ping + backlinks.
- **Unknown (445):** mostly not yet submitted via the NEW sitemap (live = old 1,337-URL build). After drag-drop + sitemap resubmission these get submitted fresh.

## Owner actions (blocked on you only)
1. **Netlify drag-drop of `deploy/`** (1347-URL sitemap, 9 embed widgets, SEO fixes, slash/canonical fixes).
2. Immediately after: GSC UI → Sitemaps → resubmit `sitemap.xml` (API PUT = 403 readonly by design).
3. `node scripts/ping-indexnow.js` (IndexNow re-ping) — I can run this on request once live.
4. Verify live: sitemap count 1,347, `/embed/cagr.html` 200, homepage OG tags present.

## Data files
- `data/batches/batch-skip200..1300.json` + `log-skip*.txt` — raw per-batch results
- `data/gsc-coverage-report.json` — aggregated tally + full per-URL lists per category
- `scripts/gsc-batch-inspect.cjs` — skip-bug fix + `--out` + incremental save (every 10 URLs)
- `scripts/gsc-aggregate-coverage.cjs` — aggregator (batch #1/#2 auto-recovered from git history)
