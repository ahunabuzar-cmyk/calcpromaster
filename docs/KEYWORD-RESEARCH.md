# Keyword research table — CalcProMaster (Phase 2 / deliverable B)

_Generated 2026-10-12 by `node scripts/build-keyword-research-table.cjs`. Machine-generated — nothing hand-added._

**Spreadsheet:** `data/keyword-research.csv` — 763 rows × 22 columns.

## 0. Honesty box — what is measured, modelled, and unavailable

| Class | Columns | Source |
|---|---|---|
| **Measured** | `gsc_impressions_28d`, `gsc_clicks_28d`, `gsc_ctr`, `gsc_avg_position`, `current_calcpro_url` | Google Search Console query→page export, 2026-09-24 → 2026-10-22 (28 days) (pulled 2026-10-25T16:35:08.647Z); 12,224 of 20,954 impressions joined |
| **Observed (SERP)** | `serp_dominant_page_types`, `search_result_features`, `competing_urls` | Phase 3 probe of 4 clusters — pages actually fetched and read. See `docs/SERP-OPPORTUNITY-REPORT.md` |
| **Modelled** | `keyword_difficulty` | `scripts/keyword-difficulty.cjs` structural model. It is **not** a provider KD score and must not be compared to one. |
| **Targeted, not measured** | rows with `row_type = targeted` | curated `kw` phrases in `js/data/*.js` — what the site was built to rank for, with zero impressions as evidence |
| **Not available** | `monthly_search_volume`, `cpc`, provider KD, backlink/competitor metrics, country & device splits | no keyword provider and no country-dimension export is connected to this environment |

Search volume and CPC are **not estimated** in any cell: an estimate that looks like a measurement is worse than a blank.

## 1. Row counts

| | Rows |
|---|---|
| measured queries (≥3 impressions in the window) | 725 |
| targeted phrases on priority pages | 38 |
| **total** | **763** |

The full curated target list (2,500+ phrases across 1,201 tool pages) is not repeated here — it is `docs/KEYWORD-TARGETS.md`. This table carries the phrases for the pages we are actually working on.

## 2. Probed clusters (Phase 3 coverage)

| Cluster | CalcProMaster page | Dominant page types on the SERP | Probe confidence |
|---|---|---|---|
| home insurance cost | `/lifestyle/home-insurance` | insurer lead-form pages (Progressive, Liberty Mutual, Allstate) + cost-data publishers (NerdWallet, Matic) | LOW |
| business days / deadline arithmetic | `/guides/business-days` | calculator tools + explainer articles (timetrex, hivedesk, howmanybusinessdays, gigacalculator, timeanddate) | MEDIUM-HIGH |
| APY / savings yield | `/finance/apy-calculator` | bank & fintech calculators (marketing surfaces) + bank explainer articles; "APY vs APR" has NO calculator in the observed set | MEDIUM |
| BMR / resting energy | `/health/bmr-mifflin` | calculator pages + health-authority articles (calculator.net, garnethealth, myfitnesspal, clevelandclinic, healthline) | MEDIUM-HIGH |

4 of the site’s priority pages have real SERP observations; every other row says `Not probed yet` on purpose. A probe is manual by design — no scraping, no SERP API abuse.

## 3. Top 50 measured queries (by impressions in the window)

| # | keyword | intent | impressions | clicks | CTR | avg pos | current URL |
|---|---|---|---|---|---|---|---|
| 1 | how to calculate tip | informational-question | 385 | 0 | 0.00% | 6.5 | `/guides/tip` |
| 2 | home insurance calculator | transactional-tool | 362 | 0 | 0.00% | 83.8 | `/lifestyle/home-insurance` |
| 3 | fha loan calculator | transactional-tool | 223 | 0 | 0.00% | 11.1 | `/finance/fha-loan` |
| 4 | pmi calculator | transactional-tool | 143 | 0 | 0.00% | 10.0 | `/finance/pmi-calculator` |
| 5 | renters insurance calculator | transactional-tool | 100 | 0 | 0.00% | 6.8 | `/lifestyle/renters-insurance` |
| 6 | credit utilization calculator | transactional-tool | 95 | 0 | 0.00% | 41.0 | `/finance/credit-utilization` |
| 7 | if you spend $3 on coffee per school/work day, how much are you spending per year? under $100 between $100 and $250 between $250 and $750 more than $750 | unclassified | 84 | 0 | 0.00% | 8.7 | `/everyday/coffee-cost` |
| 8 | rgb to hex | unclassified | 84 | 0 | 0.00% | 12.3 | `/tech/rgb-hex` |
| 9 | prorated rent calculator | transactional-tool | 66 | 0 | 0.00% | 13.3 | `/finance/prorated-rent` |
| 10 | fha home loan calculator | transactional-tool | 65 | 0 | 0.00% | 6.9 | `/finance/fha-loan` |
| 11 | rent affordability calculator | transactional-tool | 61 | 0 | 0.00% | 13.3 | `/finance/rent-affordability` |
| 12 | earnings per share calculator | transactional-tool | 60 | 0 | 0.00% | 19.7 | `/finance/eps-calculator` |
| 13 | pmi calculation | unclassified | 58 | 0 | 0.00% | 44.4 | `/finance/pmi-calculator` |
| 14 | last menstrual period calculator | transactional-tool | 57 | 0 | 0.00% | 5.3 | `/health/pregnancy` |
| 15 | calculate annual percentage yield | transactional-tool | 52 | 0 | 0.00% | 9.7 | `/finance/apy-calculator` |
| 16 | harmonic mean calculator | transactional-tool | 49 | 0 | 0.00% | 8.4 | `/math/harmonic-mean` |
| 17 | download speed calculator | transactional-tool | 48 | 0 | 0.00% | 33.9 | `/tech/internet-speed` |
| 18 | cost of capital calculator | transactional-tool | 42 | 0 | 0.00% | 82.2 | `/finance/wacc` |
| 19 | vacation cost calculator | transactional-tool | 40 | 0 | 0.00% | 9.1 | `/lifestyle/vacation-savings` |
| 20 | wallpaper calculator | transactional-tool | 38 | 0 | 0.00% | 88.1 | `/homegarden/wallpaper-rolls` |
| 21 | home insurance estimate calculator | transactional-tool | 37 | 0 | 0.00% | 12.3 | `/lifestyle/home-insurance` |
| 22 | credit utilization ratio calculator | transactional-tool | 35 | 0 | 0.00% | 20.1 | `/finance/credit-utilization` |
| 23 | dividend reinvestment calculator | transactional-tool | 35 | 0 | 0.00% | 14.7 | `/finance/dividend-reinvestment` |
| 24 | raid capacity calculator | transactional-tool | 35 | 0 | 0.00% | 11.0 | `/tech/raid-capacity` |
| 25 | weighted average calculator | transactional-tool | 35 | 0 | 0.00% | 58.2 | `/math/weighted-average` |
| 26 | mifflin st jeor calculator | transactional-tool | 34 | 0 | 0.00% | 2.6 | `/health/bmr-mifflin` |
| 27 | fha payment calculator | transactional-tool | 33 | 0 | 0.00% | 15.5 | `/finance/fha-loan` |
| 28 | pmi rate calculator | transactional-tool | 33 | 0 | 0.00% | 9.2 | `/finance/pmi-calculator` |
| 29 | apy calculator savings account | transactional-tool | 32 | 0 | 0.00% | 9.4 | `/finance/apy-calculator` |
| 30 | pipe volume calculator | transactional-tool | 32 | 0 | 0.00% | 33.9 | `/construction/pipe-volume` |
| 31 | cpf contribution calculator | transactional-tool | 30 | 0 | 0.00% | 79.8 | `/regional/singapore-cpf` |
| 32 | deck stain calculator | transactional-tool | 30 | 0 | 0.00% | 2.0 | `/homegarden/deck-stain` |
| 33 | renters insurance cost calculator | transactional-tool | 30 | 0 | 0.00% | 9.4 | `/lifestyle/renters-insurance` |
| 34 | cpf calculator | transactional-tool | 29 | 0 | 0.00% | 77.4 | `/regional/singapore-cpf` |
| 35 | credit card utilization calculator | transactional-tool | 29 | 0 | 0.00% | 42.4 | `/finance/credit-utilization` |
| 36 | down payment and closing cost calculator | transactional-tool | 29 | 0 | 0.00% | 20.5 | `/finance/closing-costs` |
| 37 | cable length calculator | transactional-tool | 27 | 0 | 0.00% | 83.2 | `/tech/cable-length` |
| 38 | downloadmbps | unclassified | 27 | 0 | 0.00% | 82.7 | `/tech/internet-speed` |
| 39 | pmi removal calculator | transactional-tool | 27 | 0 | 0.00% | 11.4 | `/finance/pmi-calculator` |
| 40 | wacc calculator | transactional-tool | 27 | 0 | 0.00% | 77.4 | `/finance/wacc` |
| 41 | lease vs buy calculator | commercial-comparison | 26 | 0 | 0.00% | 57.9 | `/finance/auto-lease-vs-buy` |
| 42 | calculate home insurance | transactional-tool | 24 | 0 | 0.00% | 77.4 | `/lifestyle/home-insurance` |
| 43 | home insurance cost calculator | transactional-tool | 24 | 0 | 0.00% | 76.4 | `/lifestyle/home-insurance` |
| 44 | house insurance calculator | transactional-tool | 24 | 0 | 0.00% | 82.2 | `/lifestyle/home-insurance` |
| 45 | property insurance calculator | transactional-tool | 24 | 0 | 0.00% | 79.2 | `/lifestyle/home-insurance` |
| 46 | insurance calculator home | transactional-tool | 23 | 0 | 0.00% | 79.0 | `/lifestyle/home-insurance` |
| 47 | laminate flooring calculator | transactional-tool | 23 | 0 | 0.00% | 9.7 | `/homegarden/vinyl-flooring` |
| 48 | +mifflin st jeor equation women 10 weight 6.25 height 5 age 161 source% | unclassified | 22 | 0 | 0.00% | 6.0 | `/health/bmr-mifflin` |
| 49 | mortgage payment formula | informational-definition | 22 | 0 | 0.00% | 87.9 | `/guides/mortgage` |
| 50 | rent split calculator | transactional-tool | 22 | 0 | 0.00% | 13.2 | `/finance/roommate-rent-split` |

Intent is derived by the pattern rules written in `scripts/build-keyword-research-table.cjs` (`INTENT_RULES`) — the rule that fired is inspectable, no model verdict is hidden in the data.

## 4. What the table cannot answer yet

| Missing input | Column it unlocks | How to get it |
|---|---|---|
| Real volume + provider KD + CPC | `monthly_search_volume`, `cpc`, provider KD scale | Google Keyword Planner or an Ahrefs/Semrush export → `data/` |
| Country + device split | `country` | GSC export with the `country` dimension |
| Rendered SERP (AI Overview, ads, sitelinks) | `search_result_features` | A rendered-browser probe pass, cluster by cluster |
| Competitor authority metrics | `competing_urls` (strength) | A backlink provider; today only the URLs themselves are recorded |

## 5. Reproduce

```bash
node scripts/build-keyword-research-table.cjs            # ≥3 impressions
node scripts/build-keyword-research-table.cjs --min 1    # every query with any impression
```

The measured half depends on `data/gsc-query-page.json`, refreshed with `node scripts/gsc-queries.cjs --days 28` (needs GSC credentials).
