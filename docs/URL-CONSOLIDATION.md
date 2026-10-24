# One canonical URL per page (slash / non-slash consolidation)

**Status: consolidated at the edge, now enforced in the repo.** Re-measured 2026-10-24.

## 1. The problem it fixes

Google's page report had **824 rows for 628 paths** — i.e. ~196 paths existed in two URL
forms at once, and **10,981 impressions (52%) were split between the twins**:

| Path | Form A | Form B |
| --- | --- | --- |
| `/health/bmr-mifflin` | 749 impressions | `/health/bmr-mifflin/` — 359 impressions |
| `/guides/tip` | … | `/guides/tip/` — … |

Two URLs for one page means two ranking candidates, half the link equity on each, and
"Page with redirect" / "Duplicate, Google chose a different canonical" rows in Coverage.
The crawl-stats export (2026-10-23) shows the cost directly: of **11,074 crawl requests**,
**68.7% returned 200 and 25.8% returned a permanent redirect** — a quarter of the crawl
budget spent re-confirming which form of a page is real.

Two more variants were producing a second URL, and both are now fixed in
`functions/_middleware.js` (the two forms Cloudflare does **not** handle):

- **Case.** `/health/BMR-Mifflin` answered **200** — the SPA fallback served the
  app shell and rendered its own "not found" (a soft 404 Google can index). Every
  slug on the site is lowercase, so an uppercase path is always a duplicate: it
  now **301s to the lowercase form** (query preserved).
- **`.html` on a directory page.** `/about.html` was fine (Pages 308s it), but
  `/finance/loan-emi.html` and `/health/bmr-mifflin.html` answered **404** — a
  dead end for any old inbound link. They now **301 straight to the trailing-slash
  URL** (one hop). Root files such as `/og-image.html` and `/404.html` and flat
  pages such as `/guides/tip.html` are untouched, so no loops.

## 2. The rule (this is the contract)

The site builds two kinds of static page, and each has exactly **one** servable form:

| Page family | Files in `deploy/` | Canonical URL |
| --- | --- | --- |
| Home | `index.html` | `/` |
| Category | `<cat>/index.html` | `/<cat>/` |
| Tool | `<cat>/<tool>/index.html` | `/<cat>/<tool>/` |
| Hub | `hub/<cat>/index.html` | `/hub/<cat>/` |
| Guide | `guides/<slug>.html` | `/guides/<slug>` (**no** trailing slash) |
| Blog post | `blog/<slug>.html` | `/blog/<slug>` (**no** trailing slash) |
| Legal / static | `<slug>.html` | `/<slug>` (**no** trailing slash) |

The other form must be a **permanent redirect** to it. Cloudflare Pages emits **308** for
these (`/x` → `/x/` on directory pages, `/x/` → `/x` and `/x.html` → `/x` on flat pages).
308 and 301 are treated identically by Google for consolidation — the guarantee that
matters is *one 200 form*, not the exact status code.

## 3. Measured live state (2026-10-24)

| Check | Result |
| --- | --- |
| Sitemap URLs | 1420, all unique |
| Sitemap URLs that themselves redirect | **0** |
| Pages answering **200 on both forms** (`/x` *and* `/x/`) | **0 of 1420** |
| Twin forms redirecting to the canonical URL | **1419 / 1419** |
| Internal links on a non-canonical form (redirect hop per click) | **0 of 114,315** |
| Canonical tags on a non-canonical form / legacy host | **0** |
| JSON-LD blocks that parse (1620 pages) | **3054 / 3054** |
| Known GSC URLs that answer 404 (645 probed) | **0** |
| Uppercase / `.html`-tool URLs still answering 200 or 404 | **0** (now 301) |

So the "guides abhi bhi `/guides/tip` aur `/guides/tip/` dono 200 dete hain" symptom is
**not reproducible now** — the live site answers `/guides/tip` with 200 and `/guides/tip/`
with 308. The twins that still appear in GSC are historical rows Google has not recrawled
yet, not live duplicates.

## 4. What was actually broken in the repo

1. **The sitemap was stale.** The committed file listed **1350 URLs**:
   - it still submitted `https://calcpromaster.com/regional/abuDhabi-cost-living/`, a URL
     that now **301s** (the slug fix) — submitting a redirecting URL is exactly what turns
     into "Page with redirect";
   - it was **missing 71 real pages** (`/stats`, `/changelog`, `/graph`, `/geometry-lab`,
     and 67 newer tools), so those pages had no sitemap signal at all.
2. **Nothing failed when a twin appeared.** A stray `X/index.html` next to `X.html`, a
   slashed guide in the sitemap, or a canonical tag written on the legacy
   `calcpromaster.netlify.app` host would all have shipped silently.

Rebuilt: **1420 URLs, 0 duplicates, 0 redirecting entries**, every `<loc>` the exact form
that answers 200.

## 5. What is enforced now

| Gate | Command | Catches |
| --- | --- | --- |
| Static (offline, runs in CI after the build) | `npm run check:canonical-urls` | twin collision (`X.html` + `X/index.html`), duplicate/twin `<loc>`, wrong form in sitemap, canonical tag not self-referencing, legacy host, `noindex` page in sitemap, internal link on the twin form |
| Live (network) | `npm run seo:hosts` | a twin answering 200 again, or redirecting somewhere other than its canonical URL — probes one URL per family (tool, category, hub, guide, flat page) |
| Structured data | `npm run check:structured-data` | any JSON-LD block that does not parse — bad escape sequences, lone surrogates, raw control characters — printed with the offending text (this is the Search Console "Unparsable structured data" class) |
| Unit | `tests/unit/canonical-urls.test.js`, `tests/unit/check-host-redirects.test.js`, `tests/unit/redirect-middleware.test.js`, `tests/unit/structured-data.test.js` | the decision logic of every gate above |

The static gate reads the **built** tree, so it sees what a crawler would: 1620 HTML pages,
1420 sitemap URLs, 114k internal links — in about a second, with no network.

## 6. Owner steps after deploying

1. Deploy the rebuilt `sitemap.xml` (it is only a signal once it is live).
2. Search Console → **Sitemaps** → resubmit `sitemap.xml`. This re-reads the canonical set
   and drops the redirecting URL.
3. Do **not** request indexing for a twin form — only the canonical form.
4. Expect a lag: the GSC page/impressions table lags ~2–5 days (the attached crawl export
   covers 09-25 → 10-21 while Coverage's "last update" read 10/16, and the
   committed `data/gsc-page-impressions.json` window ends 2026-10-14). A **site-side bug
   cannot make that table advance** — the numbers only move when Google recrawls and
   re-publishes. The twins collapse over one recrawl cycle, not instantly.
5. If a specific page matters, URL-Inspect its canonical form once and watch
   "Page is indexed" + the canonical Google selected — that is the ground truth, not the aggregate table.

## 7. Structured data ("Unparsable structured data" export, 2026-10-24)

The export's only issue is **"Bad escape sequence in string → Not Started"**, appearing
from **2026-10-19** (4 → 8 → 7 → 6 → 6 pages/day). A scan of every block on the live site
(2867 blocks over 1420 sitemap URLs) and of the built tree (3054 blocks over 1620 pages)
found **0 unparsable blocks** now, so the dated rows are the history of pages crawled
before the fix — the same reporting lag as the duplicate URLs.

The gap that let it ship: `build-deploy.js` validated JSON-LD with a regex that required the
exact string `<script type="application/ld+json">` (single quotes or an extra `id=` were
never checked), and it ran *before* `stampReviewDates()` rewrote `dateModified` inside those
blocks. Both are fixed: the matcher is tolerant, and the whole built tree is validated again
at the end of the build. `npm run check:structured-data` is the CI gate, and it names the
offending escape.

## 8. Honest `<lastmod>` (was: today's date on all 1420 URLs)

A sitemap that stamps every URL with today's date on every rebuild teaches Google to ignore
`<lastmod>`, and recrawl is exactly what consolidates slugs. `generate-sitemap.js` now keeps a
content ledger (`data/sitemap-lastmod.json`): the date only moves when the **served** HTML for
that URL changes, with build noise (`?v=<build>`, the "Last reviewed" stamp, `dateModified`)
normalised out. Measured: a second rebuild changes **0** dates; editing one page changes
exactly **1**.

## 9. Triggering the recrawl

GSC's "Request indexing" has no API, so the queue is generated instead:

```bash
node scripts/build-consolidation-queue.cjs --input <gsc-pages-export.json>
```

It lists every path that appears in two URL forms **with its canonical URL** and the
impressions split between them (`docs/CONSOLIDATION-QUEUE.md`). Submit only the canonical
URL, never the twin. The repo's own export (`data/gsc-page-impressions.json`, window ending
2026-10-14) reports **0 twins** — the redirects predate a full recrawl of that window — so
use a fresher export.

## 10. Deliberately not done

- **No hand-written `_redirects` rules for the ~1400 slash twins.** Cloudflare answers
  1419/1419 correctly; duplicating that in a 1400-line rule list would only add drift and
  loop risk. The gate pins the behaviour instead. (Case and `.html` variants are handled in
  the middleware because the platform does *not* handle those.)
- **The 5.3% 404 crawl responses are not attributable from the export.** The download has
  no per-URL table, and every URL the repo knows (645 GSC paths + edge routes) answers
  200/308. The two 404 sources that were provable — `/cat/tool.html` and uppercase paths —
  are fixed above. For the rest, export Crawl stats → 404 → URLs from the GSC UI.
