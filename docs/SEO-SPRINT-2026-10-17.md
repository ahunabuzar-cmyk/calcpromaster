# SEO sprint — 2026-10-17 (head guard · 20 pages · gap re-check)

**Branch:** `seo/daily-index-panel` · **Deploy:** none · **Push:** none · **Commit:** none
**Data window:** GSC 2026-09-16 → 2026-10-14, pulled 2026-10-17T10:48Z.

---

## 1. Result at a glance

| Question | Answer |
|---|---|
| Head-criteria guard in CI? | **Yes** — `scripts/audit-head-criteria.cjs`, 10 criteria, runs on the built `deploy/` |
| Indexable pages passing all 10 | **1,419 / 1,419** (0 failures, 200 excluded) |
| Opportunity pages rewritten | **20** (2,730 words of formula/table content, every number tested) |
| Pages browser-verified | **20 / 20**, no console or network errors |
| Keyword gaps re-checked | **114 rows** → 1 approved new page, 92 covered by existing pages, 11 held, 9 rejected, 1 duplicate |
| Unit suite | **86 files / 2,657 tests pass**, exit 0 |
| Build gates | title · sitemap quality · crawl-link · budgets · internal links all pass |
| Clicks in the window | 21 · 18,917 impressions · 0.11% CTR · position 33.1 |

### Indexing snapshot (same day)

| state | URLs | share |
|---|---|---|
| INDEXED | **640** | **45.2%** |
| UNKNOWN | 374 | 26.4% |
| DISCOVERED — not indexed | 255 | 18.0% |
| REDIRECT (stale GSC cache, all re-fetched 200) | 91 | 6.4% |
| OTHER | 32 | 2.3% |
| CANONICAL (consolidated) | 21 | 1.5% |
| CRAWLED — not indexed | 2 | 0.1% |
| **total unique inspected** | **1,415** | 100% |

Sitemap inventory for the same build: **1,419 URLs**, 1,418 prerendered pages checked,
1,514 unique titles, 1,618 HTML files shipped (including guides, blog and policy pages),
107,623 internal links with **0 broken** and **0 slash mismatches**.

### Comparison with the 2026-10-04 checkpoint — with a caveat

| metric | 2026-10-04 | 2026-10-17 | change |
|---|---|---|---|
| indexed pages | 952 of 1,875 (50.8%) | 640 of 1,415 (45.2%) | not comparable: the inspection universe changed |
| daily impressions | 1,241/day (7-day run-rate) | 676/day (28-day API average) | different windows |
| clicks / CTR / position | not in that checkpoint | 21 · 0.11% · 33.1 | first full property snapshot |

The absolute indexed count fell, but so did the denominator by 460 URLs (the inspection set
was rebuilt from the live sitemap, and 91 stale `REDIRECT` rows were re-checked to 200). The
honest reading is the current one: **640 indexed of 1,415 inspected**, with 255 discovered and
374 unknown. Do not quote a week-over-week index delta from these two numbers.

---

## 2. CI head-criteria guard

The 2026-10-17 audit fix pass took 501 head-criterion failures to 0 with a throwaway
script in `.tmp/`. Nothing stopped the next new page from reintroducing them. That check
is now committed:

- **`scripts/audit-head-criteria.cjs`** walks every HTML file in `deploy/`, excludes
  `noindex` pages, the 404 and Google's verification file, and tests 10 criteria on the
  **built** artifact: title 30–60 · description 100–160 · description CTA · exactly one
  self-referencing canonical · page-specific keywords · JSON-LD `dateModified` · visible
  `<time datetime>` · no inline `on*` handlers · no HTML comments · at most one GA4 ID.
- **`npm run seo:head:check`** (`--json --fail-on-issue`) writes
  `data/head-criteria-audit.json` and exits 1 on any failure.
- **CI** runs it in the build job, after `node build-deploy.js`, and uploads the JSON even
  on failure. A regression is a red build, not a report nobody reads.
- **`tests/unit/head-criteria.test.js`** (14 tests) proves each criterion both ways,
  including the tie between the audit and the served URL.

### The guard caught a real bug in itself

The first run reported `self canonical: 0/1419` — on a site whose audit pass had just
verified 1,419 canonicals. Cause: `js/site-config.js` stores `domain: 'calcpromaster.com'`
without a scheme, and the guard compared `https://calcpromaster.com/...` against
`calcpromaster.com/...`. Fixed by normalising the configured domain to an origin, and the
test now asserts the served-URL mapping. This is why the guard reads the built artifact:
a source-level check would never have seen it.

### Also found: the build fails before minifying

`build-deploy.js` runs the report-staleness gate **before** the HTML minify pass. When a
report is older than its data, the build exits at the gate and leaves the previous
`deploy/` in place — which is why the first head run found only 64 of 1,419 pages free of
HTML comments (and 0 correct canonicals). Re-running after `seo:weekly` regenerated the reports gave
`html: 1618 files minified · 0 comments`. The gate is right to stop the build; the
ordering means a failed build can leave a half-finished artifact. Tracked as sprint item 6.

---

## 3. Twenty pages (details in [OPPORTUNITY-TOP20](OPPORTUNITY-TOP20-2026-10-17.md))

Two batches, chosen from the fresh GSC export, not from a keyword list:

- **Batch 1 (10):** push-list pages whose ranking query exposed a real content hole —
  sit-up average, VO2 max step test, dividend vs savings, cleaning formula, storage
  decision, percentile rank, Sharpe working, anion gap correction, RMS, de Broglie.
- **Batch 2 (10):** explanation-shaped queries on pages that shipped only a form — dew
  point, serum osmolality, auto fare, Winter's formula, Devine IBW, bond price, keyword
  density, wall area, leap year, class rank.

Every new number is recomputed independently in `tests/unit/enhance-claims.test.js`
(62 tests total in that file). The sections are written once in `js/tool-enhance.js` and
baked into the prerendered HTML **and** the hydrated DOM, so Googlebot and the browser see
the same text.

Titles were left alone on these 20: the push list's missing tokens were mostly
misspellings, brand strings or geography. Changing a title to wear `ctrl` or `kalori`
would be stuffing, not optimisation.

---

## 4. Keyword gaps — 108 → 114 rows, one approved page

The old report counted a string mismatch as a gap. Re-checked against fresh demand and
intent ([full report](KEYWORD-GAP-RECHECK.md), generated by
`scripts/recheck-keyword-gaps.cjs`):

| verdict | rows | meaning |
|---|---|---|
| NEW_PAGE | **1** | `snow day calculator` (368k volume) — genuinely different, school-closure model |
| COVER_EXISTING | **92** | same intent as an existing page (`cd bank calculator` → `/finance/cd-calculator`) |
| HOLD | **11** | chipotle nutrition (no dataset), polypeptide (clinical review), dynasty trade (no player data) |
| REJECT_NAVIGATIONAL | **9** | `show calculator`, `calculator that prints`, `google math calculator` |
| DUPLICATE | **1** | `snow days calculator` is the same row as the singular |

The actionable set is **114** (88 GAP + 26 WEAK) from the current 604-keyword export; the
earlier 108 figure came from an older, smaller export. The buildable answer is still
**one** page, because 92 of the "gaps" already have an owner.

---

## 5. Bugs and data caveats found this pass

1. **Tile thinset arithmetic is wrong (real bug, not fixed).** `tile-grout` computes
   `sqft × 5 / 50` bags for a 50 lb bag, i.e. 10 bags (500 lb) for 100 ft². A 50 lb bag
   covers roughly 60–100 ft² at a 1/4-inch notch, so the page overstates mortar by about
   5–8×. The page was **not** given a formula section, because documenting the wrong math
   would make it authoritative. Fix + test is sprint item 1.
2. **91 GSC "Page with redirect" rows are stale.** All 91 re-fetched 200
   (`data/redirect-verdicts.json`); the sitemap, canonical and internal links already use
   the trailing-slash form. No code change.
3. **GSC export coverage is partial.** The query→page join carries 4,465 pairs / 11,567
   impressions (61% of the 18,917 property total), because the API returns top rows per
   request. CTR and position are computed on the rows returned, not the whole property.
4. **Staleness gate ordering** (section 2): a stale-report build leaves the old `deploy/`
   in place, unminified. Not shipped, but worth hardening.
5. **`noindex` count:** 200 of the 1,619 HTML files are intentionally out of scope (198
   noindex + `404.html` + one Google verification file). They consolidate via canonical and
   are not "missing" from the audit.
6. **Category hubs are partly JS-rendered.** Each hub ships roughly 50 static tool anchors
   plus a `data-tool-id` list that JS turns into links. 12 of the 20 changed pages have a
   static hub anchor; the other 8 (`sharpe-ratio`, `anion-gap`, `rms`, `dew-point`,
   `serum-osmolality`, `winters-formula`, `bond-price`, `keyword-density`) are only in the
   JS list. They are still in the sitemap, still linked from related tools (11–12 static
   anchors each) and the build's not-indexed-inlink gate covers orphans, but a static
   anchor on the hub would shorten the crawl path. Tracked as sprint item 7.

---

## 6. Verification (rerun after the last edit)

| Check | Command | Result |
|---|---|---|
| Head criteria (10) | `node scripts/audit-head-criteria.cjs` | **1,419/1,419 pass, 0 failures** |
| Unit suite | `npm test` | **86 files / 2,657 tests pass** |
| Build | `node build-deploy.js` | SSG 1,511 pages · sitemap 1,419 · 1,514 unique titles · 1,618 minified · 0 broken links |
| Browser render | Playwright over the 20 URLs on `:3100` | **20/20** 200 OK, 1 H1, answer section present, 0 console/network errors |
| Sitemap + anchors | per-page check of the 20 | 20/20 in `sitemap.xml`, 11–12 crawlable related anchors each |
| Category hub links | hub HTML scan | 12/20 static anchors; 8 only in the JS tool list (§5.6) |
| Keyword re-check | `node scripts/recheck-keyword-gaps.cjs` | 114 rows, 0 REVIEW left |
| Arithmetic | `tests/unit/enhance-claims.test.js` | 62 tests, every worked example recomputed |

Not run: the full Playwright E2E sweep (566 routes × 2 projects) and axe scan. The 20
changed pages were verified in Chromium instead; the full sweep is the release gate, not a
per-edit check.

---

## 7. Next sprint (in order)

1. **Fix `tile-grout` thinset math** and add a test asserting bags from coverage, not
   `sqft × 5 / 50`.
2. **Build the approved snow-day page** with a transparent closure model and an explicit
   "estimate, not a district decision" disclaimer.
3. **Re-measure CTR on 2026-11-14** for the 20 pages; judge, do not assume.
4. **Request indexing** for the 20 changed URLs (IndexNow + URL Inspection), and confirm
   the canonical/sitemap form each one uses.
5. **Title-term work where honest:** `squat-standards` (average male) needs norms data
   first; `treadmill-pace` needs a steps-from-speed calculation.
6. **Harden the build:** minify before the staleness gate, or clean `deploy/` on gate
   failure, so a red build cannot leave an unminified artifact behind.
7. **Give the eight JS-only hub pages static anchors** on their category page, so the crawl
   path does not depend on rendering the `data-tool-id` list.
8. **Re-check the 11 held gap rows** when their datasets exist (chipotle nutrition,
   fantasy trade values) or when a clinician signs off (polypeptide).
