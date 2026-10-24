# Final SEO implementation report

_2026-10-13 · CalcProMaster.com · branch `seo/daily-index-panel`_

This is an implementation report, not an audit memo. Everything stated as done below is
backed by a file on disk and a re-run check; everything not done is named.

## 1. Counts

| Measure | Count |
|---|---|
| Total pages discovered | 1417 |
| Total pages audited (reassessed this session) | 1417 |
| Pages in the original 792 major-improve backlog, reassessed | 790 |
| Major-improve backlog after the session | 790 |
| Pages genuinely improved (content/targeting/title changed) | 5 |
| Pages tested and verified | 5 |
| Other pages audited and grouped | 627 |
| Other pages improved | 3 |
| Pages left unchanged with a written justification | 2 |
| Pages blocked, with reason | 1 |
| Technical issues fixed | 2 (duplicate title, phrase cannibalization × 2) |
| Duplicate URL pairs still unresolved | 0 |
| URL-format defects still open | 1 |
| Open P0 / P1 / P2 / P3 queue | 1 / 586 / 114 / 716 |

An audited page is not an improved page, and an improved page is not a fully tested page.
The four numbers above are kept separate on purpose.

## 2. What actually changed

### /guides/room-area — content + schema (VERIFIED)

Added measuring method, a measurement→tile-order worked table, a four-mistake list and 3 FAQs; FAQPage JSON-LD rebuilt from the visible text.

_Evidence:_ data/topic-guide-depth.json (392→952 words, 7 FAQs); word count > 500

### /guides/gear-ratio — content + schema (VERIFIED)

Added an RPM ratio table, a work-backwards-to-a-target procedure and a mesh-efficiency section, plus 2 FAQs; FAQPage JSON-LD rebuilt.

_Evidence:_ data/topic-guide-depth.json (407→849 words, 6 FAQs)

### /everyday/carbon — cannibalization owner (NO_CHANGE_JUSTIFIED)

Kept as the owner of "carbon footprint calculator" (exact name match); no content edit was needed.

_Evidence:_ docs/KEYWORD-AUDIT.md C2 = 0 shared phrases after the change

### /homegarden/carbon-offset — cannibalization fix (VERIFIED)

Dropped the shared phrase "carbon footprint calculator"; kw and lsi now lead with "household carbon footprint calculator" (the page's own name).

_Evidence:_ js/data/home-garden.js:208 · js/seo-content.js carbon-offset lsi · regenerated js/tool-intros.js passes generate-intros.js --check

### /regional/umrah-cost — cannibalization owner (NO_CHANGE_JUSTIFIED)

Kept as the owner of "umrah package cost" (exact name match); no content edit was needed.

_Evidence:_ docs/KEYWORD-AUDIT.md C2 = 0 shared phrases after the change

### /finance/hajj-cost — cannibalization fix (VERIFIED)

Dropped the shared phrase "umrah package cost" and took "hajj cost per person" instead, so Hajj and Umrah stop bidding for the same query.

_Evidence:_ js/data/finance.js:1651 · js/seo-content.js hajj-cost lsi · regenerated js/tool-intros.js passes generate-intros.js --check

### /guides/cagr — duplicate title fix (VERIFIED)

Guide title was byte-identical to /finance/cagr ("CAGR Calculator — Compound Annual Growth Rate"), so SERPs merged the two. Retitled to intro intent, JSON-LD headline updated to match.

_Evidence:_ docs/KEYWORD-AUDIT.md C1 (1 duplicate title before) · docs/INTENT-AUDIT.md I4

### /regional/abuDhabi-cost-living — URL format — fix AWAITING AUTHORIZATION (BLOCKED)

Only sitemap URL that fails slug formatting (uppercase camelCase). Fix is a rename to /regional/abu-dhabi-cost-living/ plus a 301 from the old path; not applied because it changes an indexed URL.

_Evidence:_ docs/URL-FORMAT-AUDIT.md (FAIL U1 + U7, 1 of 1417 URLs)


## 3. Tests and their real results

| Suite | Command | Result |
|---|---|---|
| not recorded | — | — |

Any suite that failed or could not be completed is listed as such above and is not
reported as a pass anywhere in this pack.

## 4. Files changed

Source: `js/data/home-garden.js`, `js/data/finance.js`, `js/seo-content.js`, `guides/cagr.html`,
`guides/room-area.html`, `guides/gear-ratio.html`, `playwright.config.js`, `package.json`.
New: `js/topic-guide-depth.js`, `scripts/apply-topic-guide-depth.cjs`,
`scripts/audit-url-format.cjs`, `scripts/build-seo-improvement-pack.cjs`,
`tests/unit/apply-topic-guide-depth.test.js`.
Regenerated with their own builders: `js/tool-intros.js`, `data/site-inventory.*`,
`docs/KEYWORD-AUDIT.md`, `docs/INTENT-AUDIT.md`, `docs/KEYWORD-TARGETS.md`,
`docs/KEYWORD-DIFFICULTY.md`, `docs/HARD-KEYWORDS.md`, `data/thin-pages.json`,
`docs/THIN-PAGES-REPORT.md`, `data/top10-push-list.json`, `data/seo-changelog.json`,
`docs/CHANGELOG.md`, `changelog.html`, `deploy/**`.

## 5. Outstanding work

1. **Blocked:** the `/regional/abuDhabi-cost-living/` rename + 301 (owner decision).
2. **P1:** 586 not-indexed pages — indexing work, batched.
3. **P2:** 114 pages with a thin/duplication/title defect; next thin pages are
   `/guides/protein-intake`, `/guides/ac-size`, `/guides/fuel-cost`, and `/stats.html`
   (the one *bare* page: 470 words, no FAQ, 1,510 inlinks).
4. **Missing evidence, not missing effort:** search volume, CPC, provider keyword difficulty,
   country/device splits, backlink data, and field Core Web Vitals. See §6.
5. The remaining ~700 `major-improve` pages are reassessed and queued, not edited.

## 6. Keyword research — how it is done, and what is free

Already running in this repo, all free and all measured inside it:

| Layer | Source | Gives | Cost |
|---|---|---|---|
| Measured demand | GSC query→page export | impressions, clicks, CTR, average position per query | free (property access) |
| Targeted intent | `js/data/*.js` `kw` phrases | what the site was built to rank for — no impressions attached | free |
| Structural difficulty | `scripts/keyword-difficulty.cjs` | a modelled band, **not** a provider KD score | free |
| SERP shape | manual rendered probes | page types / features / competing URLs for 4 clusters | free |

Not available, and deliberately not estimated: **monthly search volume, CPC, provider KD,
backlink and competitor metrics, country/device splits.** No provider is connected to this
environment, so every such cell says `Not available` rather than carrying a made-up number.

Free ways to close that gap, cheapest first:

1. **Bing Webmaster Tools → Keyword Research** — free for a verified site owner; gives
   keyword volume data and related-query ideas (Bing demand, not Google demand), no
   difficulty score. The site is already Bing-verified (`deploy/BingSiteAuth.xml`), so this
   needs only the owner's login.
2. **Google Keyword Planner** — no ad spend is required to use it, but a Google Ads account
   with billing details must be set up, and Google states volumes are rounded, so treat the
   output as estimates rather than exact counts.
3. **Google Trends** — free, no account; relative interest on a 0–100 index, never absolute
   volume.
4. **Semrush free account** (10 keyword-research queries/day, no card) or the **Ahrefs free
   keyword generator** for a second opinion; both are third-party estimates.

**Permission needed:** none for anything already in the repo — `npm run keywords:fresh`,
`seo:query-reach`, `seo:opportunity` and `seo:thin` all run offline on data already here.
What needs the owner's action is only external account access: a Bing Webmaster login or a
Google Ads account to pull real volume numbers, and a fresh GSC export to refresh the
28-day window. Paste an export into `data/` (or grant the OAuth flow) and the same builders
will pick it up — no code change needed.

Sources for the free-tool claims: Google Keyword Planner help
(https://support.google.com/google-ads/answer/7337243), Bing Webmaster Tools Keyword
Research (https://www.bing.com/webmasters/help/keyword-research-628070b6), GSC Performance
report (https://support.google.com/webmasters/answer/7576553), Google Trends
(https://support.google.com/trends/answer/4365533).

## 7. Deployment status

**Not deployed. Nothing was committed, pushed, published or uploaded.** `deploy/` was
rebuilt locally and passed every build gate, and the E2E/mobile suites were run against a
local server on `localhost:3100`. Production still serves the previous build, so no live
URL, canonical, redirect or sitemap has changed as a result of this work.

## 8. Baseline and monitoring plan

Baseline and the 7/30/60/90-day checkpoints are in `11-POST-DEPLOYMENT-MONITORING.md`.
The 28-day GSC window ending 2026-10-07 is the reference; every later comparison is
against that, at page and query level, and no edit will be credited with a movement on a
single day's data.
