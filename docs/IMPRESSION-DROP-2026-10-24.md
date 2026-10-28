# Impressions: what actually happened (measured, 2026-10-24)

> Written from the GSC Performance export of **2026-10-23** (`data/gsc-performance-export-2026-10-23/Chart.csv`,
> 28 days, 2026-09-24 → 2026-10-21) and a live crawl of the deployed site.
> No number below is estimated or remembered from an older report.

## 1. The old comparison was not a comparison

Two different measures were being subtracted from each other:

| Number | What it actually is | Window |
|---|---|---|
| 1,241/day (~37,767/month) | best 7-day week, at the ramp peak | 2026-09-28 → 2026-10-04 |
| 770/day | trailing 28-day average of the whole export | 28 days, including pre-ramp days |
| **564/day** | **current 7-day run-rate** | **2026-10-12 → 2026-10-18** |

The first is a peak week, the second is a long average. Their difference is mostly the
difference between the windows, so neither "impressions grew" nor "impressions fell" can be
read from them. `data/run-rate-history.json` had the *same* week written four times
(11, 14, 15 and 17 Oct all recorded 2026-09-28 → 2026-10-04) because the only coverage
export in the repository stopped at 4 Oct — so the history looked flat while the chart moved.

## 2. The decline is real, on equal-length weeks

Seven-day windows from the same export, so every row is comparable:

| Week | Impressions | Per day | Clicks | Avg position |
|---|---|---|---|---|
| 2026-09-28 → 10-04 | 8,685 | 1,241 | 9 | 40.4 |
| 2026-10-05 → 10-11 | 5,574 | 796 | 6 | 28.1 |
| 2026-10-12 → 10-18 | 3,950 | **564** | 2 | 23.6 |

Week over week: **−36%**, then **−29%**. From the peak week to the latest settled week:
**−55%**. That is a fall, not a window artefact.

What makes it a specific kind of fall: **average position improved while impressions dropped**
(40.4 → 28.1 → 23.6). The site is not ranking lower on the queries it still serves; it is
being shown for **fewer** queries. Losing breadth, keeping position, is what a young site's
re-evaluation looks like — Google keeps the pages it trusts and drops the long tail of
marginal matches. It is also what a quality demotion looks like. Those two cannot be told
apart from the Performance chart alone.

## 3. The last three days are not a collapse

| Day | Impressions |
|---|---|
| 2026-10-16 | 681 |
| 2026-10-17 | 419 |
| 2026-10-18 | 345 |
| 2026-10-19 | 2 |
| 2026-10-20 | 4 |
| 2026-10-21 | 1 |

Those three days are **unfinished data**, not a site that went dark. GSC fills a day over the
following two to three days, so a day still being collected reads as a handful of impressions.
The export itself was taken on 23 Oct, i.e. two days after the last row. Every script now
drops days newer than the newest day minus three (`trimUnfinalized`), so this tail can no
longer be averaged into a rate — before this change the same tail produced a fake
"290/day" headline in one report and "564/day" in another.

## 4. What is ruled out (checked today, not assumed)

- **Serving**: all **1,420** sitemap URLs returned **200** in a live crawl; none 404, none 5xx.
- **Indexability**: **0** of those pages carry a `noindex`; every canonical points at itself;
  no page is under 300 words.
- **robots.txt / sitemap**: both 200, robots.txt allows Googlebot and the AI crawlers, the
  sitemap serves 1,420 URLs.
- **Recent edits**: no content, title or routing commit exists between 1 Oct and 20 Oct
  (`git log` in that range is empty apart from docs and the index panel). The 66 new
  calculators and the redirect fix landed 22–24 Oct, *after* the fall started — they cannot
  be its cause.

## 5. What is still unknown, and the one thing that closes it

The Performance chart cannot say **why** breadth was lost. Two things that would say it are
only visible inside Search Console with a working token:

1. **Manual actions / Security issues** (Search Console → Manual actions). One screenshot
   there would settle "quality demotion vs manual action" immediately.
2. **Query-level diff** — which of the 4,141 queries the site used to appear for stopped
   appearing. That needs the API pull (`npm run seo:weekly`), not the UI export.

The stored OAuth refresh token is dead (`invalid_grant`, obtained 2026-10-14) because the
OAuth app is still in **Testing** publishing status, where Google expires every refresh token
after **7 days**. That is why the data stopped: not a bug in the scripts.

Permanent fix, one time, ~2 minutes:

1. <https://console.cloud.google.com/apis/credentials/consent> → **Publishing status → PUBLISH APP**
   (the app stays unverified; you keep clicking "Continue" once). A published app's refresh
   token no longer expires after 7 days — 6 months of disuse is the only timeout.
2. `npm run gsc:login` (or `npm run gsc:login -- --paste` if the browser cannot reach
   localhost:3737), sign in, approve.
3. `npm run gsc:verify` → expect three ✅ lines. Then `npm run seo:weekly` refreshes every
   report from live data, and the run-rate history gets a real new week instead of the same
   window again.

Details and the full checklist: [`docs/api-credentials-setup.md`](api-credentials-setup.md) — section
“Plan B ka 7-din wala trap”, plus the troubleshooting table for `invalid_grant`.

## 6. Update — 2026-10-25: the tail did not fill in, so §3 no longer holds

Section 3 called 19–21 Oct unfinished data. Re-measured two days later with a live
token (`data/gsc-performance-export-2026-10-25/Chart.csv`, pulled 16:04 UTC), those
same days are **still empty**, and two more days joined them:

| Day | 10-16 | 10-17 | 10-18 | 10-19 | 10-20 | 10-21 | 10-22 | 10-23 |
|---|---|---|---|---|---|---|---|---|
| impressions | 681 | 419 | 345 | 2 | 4 | 1 | 7 | 3 |

Five settled days at 1–7 impressions each is not a pipeline artefact. What the same
pull adds, and what it rules out:

- **Run-rate:** 290/day over 2026-10-15 → 2026-10-21 (`data/run-rate-history.json`),
  with the trailing 3-day rate at **2/day**. The week before it was 564/day.
- **The only query left is an operator.** GSC 19–23 Oct returns exactly one query —
  `site:calcpromaster.com` (6 impressions) — spread over 27 pages at 1–4 impressions
  each. Demand-shaped queries stopped being served entirely.
- **The pages are still crawlable.** Homepage inspects as `PASS` / “Submitted and
  indexed”, `lastCrawlTime` 2026-10-23, canonical self; apex 200, `robots.txt` allows
  Googlebot, sitemap 1,420 URLs, resubmit returned HTTP 204 today. So this is not
  blocking, DNS or serving.
- **The sitemap has nothing indexed.** `sitemaps.list` reports submitted 1,420 /
  indexed **0** (that field is historically unreliable, but it agrees with the API
  inspection panel below).
- **Index panel (2026-10-25, 590 tracked URLs):** 6 “Submitted and indexed”, 429 “URL
  is unknown to Google”, 154 “Discovered”, 1 redirect. Over the 10 days since
  2026-10-15 exactly **1 page became indexed while 99 fell back to “unknown”**
  (`docs/INDEX-PANEL.md`).

Together that is the shape of a **site-level visibility loss**, not a crawl-rate
problem: Google has the URLs, returns them for nothing, and new ones do not enter.
The two things that would still distinguish algorithmic demotion from a manual
action are UI-only — Search Console → **Manual actions** and **Security issues**
(there is no API for either), plus the query-level diff of what stopped appearing.
