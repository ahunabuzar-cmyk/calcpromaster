# SEO fix pass — 2026-10-18 (reported issues, deploy, indexing start)

Teen reported problems (third-party audit panel se):

| # | Report | Before | After (measured live) |
|---|---|---|---|
| 1 | 2 pages low word count | audit panel par 2 pages <300 words | **0** (median 2,272 words, min above 300) |
| 2 | 2 pages duplicate `<title>` | 2 pairs | **0** duplicate titles, **0** duplicate meta descriptions |
| 3 | 27 pages poorly formatted URL | 27 (camelCase slug + stopword slugs) | **0** format failures (0 FAIL, 9+ WARN/INFO advisory only) |

Source of the "after" column is a full live crawl, not the build:
`node scripts/audit-live-pages.cjs --concurrency 24`

```
sitemap URLs: 1420 · fetched: 1420 · errors: 0 · noindex: 0
median words: 2272
DUPLICATE TITLES: 0
DUPLICATE META DESCRIPTIONS: 0
THIN PAGES (<300 words): 0
URL ISSUES: 0
```

Earlier in the same day the same crawl reported 1 duplicate title (`/guides/cagr` vs
`/finance/cagr/`) and 2 URL issues (`/regional/abuDhabi-cost-living/`, uppercase +
non-slug chars). Both are gone.

## 1. URL format — what was actually fixed vs what is deliberate

- `/regional/abuDhabi-cost-living` (camelCase, the only sitemap slug that failed U1/U7) was
  renamed to `/regional/abu-dhabi-cost-living/`, and **both** legacy forms (with and without
  trailing slash) now 301 to the canonical page in one hop:

  ```
  /regional/abuDhabi-cost-living   → 301 → /regional/abu-dhabi-cost-living/
  /regional/abuDhabi-cost-living/  → 301 → /regional/abu-dhabi-cost-living/
  ```

  The trailing-slash rule is pinned by `tests/unit/redirect-old-slug.test.js` (it must sit
  above the `/regional/*` SPA rewrite, otherwise the old URL would soft-404 with a 200).
- The remaining 9 WARN + 26 INFO rows in `scripts/audit-url-format.cjs` are **kept on
  purpose**: they are English multi-word slugs (`rule-of-72`, `cost-of-living`,
  `family-budget`). Renaming them would 301 URLs Google already crawled and drop the query
  history attached to them — a net loss for zero ranking gain. The audit treats them as
  advisory, and the gate is `FAIL: 0`.

## 2. The one page that was genuinely still broken — `/guides/break-even`

URL Inspection said:

```
coverageState : Duplicate, Google chose different canonical than user
lastCrawlTime : 2026-09-27T05:51:31Z
```

And the paired calculator page (`/finance/break-even/`) was still
`Discovered - currently not indexed`. Root cause: the guide was a 619-word subset of the
2,296-word calculator page — same formula, same café example, same FAQ. Google crawled it
once, called it a duplicate, and stopped.

Fix (content, not a redirect — the guide answers a different, informational intent):

| | before | after |
|---|---|---|
| words | 619 | **1,285** |
| unique sections | — | price-sensitivity table, service-business break-even (billable hours, utilisation), "what break-even does not tell you", break-even vs payback vs ROI |
| title | Break-Even Analysis — Formula & Margin of Safety | Break-Even Analysis: Formula, Example & Margin of Safety |
| description | ended in a truncated `…` | 134 chars, complete sentence |

Also fixed a malformed table row (`<td>` without `<tr>`) that was there before.

## 3. Deploy and indexing actions taken

| Action | Result |
|---|---|
| `npm run deploy:build` | deploy/ rebuilt: 1,619 HTML minified, 0 broken internal links, 0 slash mismatches |
| `npx wrangler pages deploy deploy --project-name=calcpromaster --branch=main` | deployed to **production** (`main`), deployment `97b439d2` |
| GSC sitemap resubmit (`PUT /webmasters/v3/sites/:site/sitemaps/:feed`) | **HTTP 204** accepted |
| URL Inspection batch after deploy | 40 inspected → 26 indexed, 14 waiting (batch hit the 2,000/day pacing, rest continues next run) |
| `node ping-indexnow.js` | **1,420 / 1,420 URLs submitted, 0 failed** (Bing / Yandex / Seznam / Naver) |
| `node scripts/audit-not-indexed.cjs` | 631 waiting-crawl · **0 fixable** |

Request Indexing on Google itself cannot be automated (the Indexing API only covers job
posting / livestream pages); the list to click through is
`docs/REQUEST-INDEXING-TOP40.md`.

## 4. "Impression itni kam kyun hai?" — measured answer

GSC API, pulled today:

| window | impressions | clicks | CTR | avg position |
|---|---|---|---|---|
| last 7 days | 3,186 | 1 | 0.03% | 23.1 |
| last 28 days | 20,176 | 21 | 0.09% | 28.8 |
| Sep 16 – Oct 14, per page (625 pages) | 19,465 | 21 | 0.11% | — |

Where those impressions actually come from (28-day page data):

| avg position | impressions | share |
|---|---|---|
| 1–3 | 30 | 0.2% |
| 4–10 | 4,295 | 22% |
| 11–20 | 3,471 | 18% |
| 21–50 | 6,385 | 33% |
| 51+ | 5,284 | 27% |

- **60% of impressions land on position 21+**, i.e. page 3 or worse, where CTR is
  effectively zero. 411 pages with ≥5 impressions got **0 clicks** and carry **92%** of all
  impressions.
- Only **30 pages** cleared 100 impressions in a month. The ceiling is set by how few pages
  rank anywhere near page 1 for a query with real volume.
- Indexation is still the binding constraint: **640 of 1,415** inspected URLs are indexed
  (45%); 631 are waiting for crawl and 374 are unknown to Google.
- The average position *improved* (34.9 → 23.1) while impressions fell. That is the normal
  signature of long-tail consolidation: pages that used to appear at position 60–90 for
  thousands of near-zero-volume queries dropped out, and the pages that remain rank higher.
  Impressions down + position up is not a regression, but it is also not growth.

So the number is low for three stacked reasons, in this order: (1) 55% of the site is not
indexed yet, (2) of the indexed part, almost nothing is on page 1 for a query with volume,
(3) the queries the site does appear for are 1–3-impression tails (see the top-query list:
`100 mbps to download 100gb`, `28 lakh home loan emi`, …).

What moves it: index coverage (crawl + internal links + backlinks), then SERP position on
the ~81 pages already on page 1 for *some* query (`docs/TOP10-PUSH-LIST.md`), then CTR work
on those. Content volume is not the bottleneck — 1,420 pages already ship.
