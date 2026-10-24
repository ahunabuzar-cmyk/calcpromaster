# 11 — Post-deployment monitoring

_2026-10-13 — nothing has been deployed by this task._

## Baseline

The repo already carries a measured baseline; no new one was invented:

| Metric | Baseline | Source |
|---|---|---|
| Sitemap URLs | 1417 | `deploy/sitemap.xml` |
| Indexed (GSC) | 5 confirmed | `data/index-panel.json` |
| Not indexed | 585 | `data/index-panel.json` |
| Impressions window | 28 days (2026-09-09 → 2026-10-07) | `data/gsc-query-page.json` |

## Checkpoints

| When | What to compare | Tool |
|---|---|---|
| Baseline (now) | indexed %, impressions, clicks, CTR, avg position | `npm run seo:panel` |
| +7 days | the two enriched guides and the two cannibalization pages: impression and click movement; new-title CTR on `/guides/cagr` | `npm run seo:movement` |
| +30 days | did `/finance/hajj-cost` stop appearing for Umrah queries and `/regional/umrah-cost` strengthen? did `/homegarden/carbon-offset` hold the household queries? | GSC query→page export |
| +60 days | index status of the P1 not-indexed queue | `npm run seo:inspect-list` |
| +90 days | net change in indexed pages and impressions vs baseline | `npm run seo:growth` |

## Rules for reading the result

- Seasonality, data delay and normal fluctuation are expected; a single day proves nothing.
- Do not attribute a movement to a specific edit without query-level evidence.
- Requesting indexing does not guarantee indexing — record requests, not outcomes.
- No number in these tables is a promise of traffic, position or indexation.
