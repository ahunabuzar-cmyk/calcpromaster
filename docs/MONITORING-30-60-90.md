# 30 / 60 / 90-day monitoring plan — measurable gates, not promises

_Deliverable J. Written 12 October 2026. Every baseline number below is read from a
file in this repo with the date and window it came from; nothing is estimated, and
nothing here promises a ranking or a traffic figure._

## 0. Baseline — measured on the day this plan starts

| Metric | Value | Source (file, generated, window) |
|---|---|---|
| Sitemap URLs | **1,417** | `data/site-inventory.json` · generated 2026-10-12 |
| Sitemap URLs using real data | 1,417 inventoried, 0 without local HTML | same |
| GSC property impressions | **14,338** (clicks **18**, avg position **36.4**) | `data/gsc-query-page.json` · 28-day window 2026-09-09 → 2026-10-07 |
| Query→page join coverage | 9,900 of 14,338 impressions (**69%**) | same |
| Distinct queries with a joined page | **3,684** | `data/query-reach.json` (min 5 impressions) |
| Pages receiving ≥5 impressions | **455** canonical (564 raw URL variants) | same |
| Run-rate (7-day, from the daily series) | **1,240.7 impressions/day ≈ 37,767/month** | `data/growth-model.json` · generated 2026-10-11 · series `data/gsc-coverage-export-2026-10-09` |
| Run-rate (3-day) | 1,380.3/day ≈ 42,017/month | same |
| Index panel (bare-URL inspection) | 590 tracked · **5 indexed** · 585 waiting | `data/index-panel.json` · createdAt 2026-10-11 |
| Live URL inspection, 40-URL sample | **26 indexed · 8 unknown to Google · 5 discovered · 1 alternate-canonical** | `data/gsc-inspect-batch-2026-10-12.json` · run 2026-10-12T14:32Z |
| Sitemap state | resubmitted via API 2026-10-12 (`lastSubmitted 14:27:24Z`, `isPending: true`, 0 warnings, 0 errors); **live file has 1,415 URLs vs 1,417 in the repo build** | GSC Sitemaps API + `https://calcpromaster.com/sitemap.xml` fetched 2026-10-12 |
| GSC coverage snapshot | 784 queued · 696 candidates · **111 indexed** · 585 waiting · 88 not-candidates (86 redirect, 1 noindex, 1 alternate-canonical) | `data/index-burndown.json` · snapshot 2026-10-09 |
| Reach tiers (28d) | `hundreds` 1 page / 219 impr · `broad` 20 / 3,243 · `growing` 91 / 3,477 · `thin` 135 / 1,777 · `stuck` 208 / 1,104 | `data/query-reach.json` |
| Page classifications | `major-improve` 792 · `investigate-indexing` 585 · `minor-update` 28 · `keep-improve` 11 · `investigate-cannibalization` 1 | `data/site-inventory.json` · 2026-10-12 |
| Measured queries in the research table | 599 (≥3 impressions) + 45 targeted phrases | `data/keyword-research.csv` · 2026-10-12 |

**Two impression numbers appear above and they are not the same measurement.**
14,338 is the *property* total from the query→page export. The run-rate (≈37.8k/month)
comes from the *daily coverage series* over a different, later window. Do not average
them or treat one as a correction of the other; always name the source next to the number.

**Three different populations, three different indexing numbers — keep them apart.**
`5 / 590` is the *panel*: a tracked queue of URLs that were previously not indexed, so it
is biased towards failure by construction. `111 / 784` is the GSC coverage export of that
same queue. `26 / 40` is today's sample drawn from the homepage, the category hubs and a
spread of tool pages — a normal population, hence a normal hit rate. None of the three
contradicts another, and none should be quoted as "the site's indexed percentage" without
saying which population it came from.

## 1. Rules this plan follows

1. **Gates, not targets.** Each checkpoint defines a metric, its source, and the action
   taken if it moves the wrong way. No gate is a traffic promise.
2. **No attribution without a comparison.** A change is only called a cause when a
   before/after comparison exists on the same metric, same window length, same source.
   Coincidence is recorded as coincidence.
3. **Average position is not a rank.** It is an impression-weighted mean across many
   queries and markets; read the position *distribution* (`p1to3`, `p4to10`, `p11to20`,
   `p21plus`) in `data/query-reach.json` instead.
4. **Impressions are the leading indicator; clicks follow CTR work.** The measured
   click count in this window is 18 — far too small to read trends from. Until clicks
   are in the hundreds, decisions are made on impressions, query reach, and index state.
5. **Nothing is declared fixed without the artifact being re-checked** (build, tests,
   staleness gate) at the moment it is claimed.

## 2. Cadence — what runs when

| When | Command | Writes | Read it as |
|---|---|---|---|
| Daily (CI) | `seo-panel-daily.yml` → `npm run seo:panel:daily` | `data/index-panel.json`, `data/index-panel-history.json`, `data/index-burndown.json`, `stats.html` | Indexing velocity per day |
| Daily (CI) | `smoke.yml` → `npm run monitor:smoke` + `monitor:uptime` | alert issues / webhook | Site is up and calculators work |
| Weekly | `npm run seo:weekly` | GSC pulls + growth model, run-rate, **keyword research table**, reach, burn-down, stats, build, staleness gate | The one command that refreshes everything measurable |
| Weekly (CI) | `seo-weekly-refresh.yml` | same | Same, unattended |
| On demand | `npm run seo:report` | `docs/SEO-MOVEMENT-<date>.md` | Dated movement record |
| On demand | `npm run seo:staleness` | exit code | Fails if any published report is older than its own data |

If the staleness gate fails, the reports are lying about their age — regenerate before
reading any number in them.

## 3. Days 0–30 — pay down indexing debt, ship one verified content batch

**Work in this window**

1. Owner actions that are blocking everything (unchanged from the master checklist):
   GSC sitemap resubmit, and a `Request Indexing` pass over the top of `docs/REQUEST-INDEXING-WEEK-2.md`.
2. The four probed pages get their SERP-informed improvements, one cluster at a time,
   each with the calculator's own arithmetic — see `docs/SERP-OPPORTUNITY-REPORT.md` §1–§4.
3. Re-run the two technical gates after each batch: `npm run test:unit`,
   `npm run check:page-drift`, `npm run seo:staleness`.

**Gate at day 30**

| Metric | Baseline | Gate | If it fails |
|---|---|---|---|
| `liveState.indexed` in the index panel | 5 / 590 | **any** increase with the panel size unchanged or larger | Do not write more pages. Run `node scripts/audit-not-indexed.cjs`, then `docs/NOT-INDEXED-ACTION-PLAN.md` |
| Run-rate, 7-day (`data/growth-model.json`) | 1,240.7/day | **not below 1,100/day** | Treat as a crawl/demand problem, not a content problem; check `data/query-quality-audit.json` and the coverage diff |
| Distinct queries on the four improved pages | home-insurance 75 · bmr-mifflin 77 · apy-calculator 63 · business-days 165 | **no page loses queries**, at least one gains a bucket that the page did not previously answer | Revert that page's copy change (`git log` per file) and re-probe the SERP |
| Technical regressions | 0 | `test:unit` pass, `check:page-drift` pass, staleness pass | Fix before any further content work |

## 4. Days 31–60 — read the movement, then widen

**What can actually be known by now:** whether indexing responded, whether the improved
pages gained query reach, and whether positions inside page 2–3 started shifting. CTR
and click movement will still be noise if clicks are under ~100/month.

**Gate at day 60**

| Metric | Source | Gate | If it fails |
|---|---|---|---|
| Pages in `growing` + `broad` reach tiers | `data/query-reach.json` `tierTable` | **≥ 111 (baseline 20 + 91)** and `stuck` ≤ 208 | The content layer is not the constraint — go to internal linking (`docs/LINK-EQUITY-PLAN.md`) and indexing |
| Pages with ≥1 impression in the window | `data/query-reach.json` totals (455 of 1,417 = 32%) | **≥ 500** | Crawl/index problem; `node scripts/build-crawl-plan.cjs` and the discovered-URL analysis |
| Position distribution on improved pages | `data/query-reach.json` `positions.p4to10` / `p11to20` | Count in `p4to10` up, `p21plus` down | Stop adding sections; tighten title/H1/intro to the query the page already receives |
| CTR on pages whose titles/metas changed | `data/gsc-query-page.json` `pages` | Reported with the caveat that clicks are < 100 — **informational only** | No action; revisit at day 90 |

**Decision at day 60:** if the index gate moved and reach tiers moved, continue the same
batch process on the next 20 pages from `docs/QUERY-REACH.md` §5. If the index gate did
not move, **stop producing content** and work the indexing and internal-linking levers —
more pages cannot help pages that are not in the index.

## 5. Days 61–90 — evaluate the process, then decide to scale or change course

**Gate at day 90**

| Metric | Baseline | Gate | Meaning |
|---|---|---|---|
| Run-rate vs the 200k/300k targets | 37,767/month (7-day) | Report the multiple honestly (5.3× to 200k, 7.9× to 300k) — this is a report, not a gate | Whether the current rate of leverage can reach the goal at all |
| Indexed share of the sitemap | 111 / 784 GSC-queued; 5 / 590 panel | Indexed count trending up across three consecutive weekly snapshots | Whether Google is accepting the corpus |
| Pages earning clicks | 18 clicks across the whole property | **Any** week with clicks ≥ 50 | Whether CTR work is the next lever |
| Query coverage per page | 8.3 queries/page average, 40.8 for top-25 pages | Rising average on pages that were improved | Whether the semantic layer is doing its job |
| Cumulative quality bar | — | Every shipped page still passes `test:unit`, `check:page-drift`, `seo:staleness`, and its claims are re-derivable from the calculator's own formula (`tests/unit/enhance-claims.test.js` pattern) | Whether the process is safe to scale |

**Scale rule:** the batch process is expanded only when the index gate **and** the reach
gate both moved. Otherwise the finding is that the bottleneck is elsewhere, and the
90-day review says so in one line rather than adding more pages.

## 6. Metrics dictionary (so two people can't read the same number differently)

| Term | Exact meaning here | Where |
|---|---|---|
| Impression (property) | Sum across all queries/pages for the property in the window | `data/gsc-query-page.json` `totals` |
| Joined impressions | The subset where a query could be attributed to a page (69% today) | same `coverage` |
| Distinct queries per page | Unique queries with a joined impression for that page | `data/query-reach.json` `topPages[].distinctQueries` |
| Reach tier | `stuck` 0–3 · `thin` 4–9 · `growing` 10–29 · `broad` 30–99 · `hundreds` 100+ impressions | `data/query-reach.json` `tierTable` |
| Run-rate | Mean impressions/day over the last 7 or 3 days of the daily series × month length | `data/growth-model.json` |
| Indexed (panel) | URL inspection returned "indexed" for the bare tracked URL | `data/index-panel.json` / `…-history.json` |
| Template-share | Duplicate-text ratio between a page and the rest of the corpus | `data/site-inventory.json` |
| Stale report | Published artifact older than any file it was built from | `npm run seo:staleness` |

## 7. Data this plan needs but does not have

| Missing | Effect on this plan | How to get it |
|---|---|---|
| Search volume, provider KD, CPC | Keyword opportunities are ranked on measured impressions we already receive, not on demand | Keyword Planner / Ahrefs / Semrush export |
| Country + device dimensions in the GSC export | Cannot split progress by market or device | GSC export including those dimensions |
| Clicks at a readable scale | CTR and click gates stay "informational" until clicks ≥ ~100/month | Time, plus the CTR work queued in `docs/TOP10-PUSH-LIST.md` |
| A rendered SERP capture | AI Overview/ads exposure stays unverified | Manual rendered-browser probe per cluster |

## 8. Rollback

Every content batch is a separate, reviewable commit touching a small set of files
(mostly `js/tool-enhance.js`, one guide HTML, and the matching test). Rollback is
`git revert <commit>` for that batch, then `npm run deploy:build`. Nothing in this plan
depends on a data migration or an irreversible action, and no page is deleted,
redirected or merged without a written migration plan (`docs/SITE-INVENTORY.md`
classifications are the starting point for those decisions).
