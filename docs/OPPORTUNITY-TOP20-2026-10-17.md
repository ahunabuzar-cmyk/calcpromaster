# Top-20 opportunity pages and what changed — 2026-10-17

**Source:** 28-day GSC query→page export, **2026-09-16 → 2026-10-14**, refreshed
2026-10-17T10:48Z (`data/gsc-query-page.json`).
**Site total in that window:** 21 clicks · 18,917 impressions · **0.11% CTR** · average
position **33.1**.
**Push list:** `docs/TOP10-PUSH-LIST.md` (position ≥ 11, ≥ 5 impressions, 317 tool pages).

## Why the list looks like this

The push list splits the 317 pages by whether the page's copy already answers the query:

| class | pages | impressions | decision |
|---|---|---|---|
| copy already targets the query | 256 | 11,665 | no copy change; position/links problem |
| real on-page defect (title/missing term) | 20 | 700 | fix here — this is the list below |
| explanation-shaped query | 20 | 457 | add an answer section, not a new title |
| missing token is a number/brand/shorthand | 12 | 245 | no change; stuffing the token would be worse |

So "position 21+" is not 65% bad copy. 256 of 317 pages already say what they rank for;
they get no clicks because they rank on page 3, which is an authority-and-time problem.
The 20 pages below are the ones with a measurable on-page gap.

## Batch 1 — first 10 pages (push-list rows)

| # | page | pos | impr | best query | what was weak | change |
|---|---|---|---|---|---|---|
| 1 | `/fitness/situp-test` | 11.5 | 83 | average sit ups per minute | scored bands in JS only; no average explanation | bands + cadence table (158 words) |
| 2 | `/fitness/vo2max` | 24.8 | 60 | vo2 max calculator step test | only a resting-HR formula; query asks for step test | step-test equations + comparison table (161) |
| 3 | `/finance/dividend` | 30.5 | 38 | savings account dividend calculator | stock dividend only; query is savings interest | dividend-vs-interest section + matching balance (144) |
| 4 | `/lifestyle/cleaning-time` | 11.8 | 33 | how to calculate cleaning times | result only; no formula | per-room/bath/floor formula + three worked depths (151) |
| 5 | `/tech/storage-need` | 25.6 | 23 | how to decide how much storage you need | no decision guidance | per-item assumptions + headroom rule + plan table (183) |
| 6 | `/education/percentile-rank` | 12.3 | 12 | how do i calculate my ctrl score? | formula only in steps output | formula + tie table + reverse rank-from-percentile (109) |
| 7 | `/finance/sharpe-ratio` | 65.5 | 11 | sharpe measure calculator | label only, no working | formula + volatility table + label bands (117) |
| 8 | `/health/anion-gap` | 57.2 | 9 | agap calculator | gap only; no albumin correction or delta ratio | correction + delta ratio table (170) |
| 9 | `/math/rms` | 28.3 | 7 | how to find root mean square | no worked example | step table + AC sine RMS (116) |
| 10 | `/science/wavelength` | 50 | 7 | de broglie wavelength calculator | wave equation only; query is matter waves | de Broglie formula + electron example (141) |

## Batch 2 — next 10 pages (explanation-shaped queries)

These pages rank for a question but shipped only a form. The fix is an answer section,
not a title rewrite.

| # | page | pos | impr | query | change |
|---|---|---|---|---|---|
| 11 | `/science/dew-point` | 17.5 | 89 | how is dew point calculated | Magnus formula + RH table (144) |
| 12 | `/health/serum-osmolality` | 75.1 | 57 | serum osmolality normal range | formula + range table + osmolar gap (130) |
| 13 | `/auto/auto-fare` | 11.9 | 49 | auto fare meaning | what the fare is made of + distance table (109) |
| 14 | `/health/winters-formula` | 26.6 | 48 | winters formula | formula + expected range table (101) |
| 15 | `/health/ideal-body-weight` | 39.5 | 20 | devine formula ibw | Devine formula + height table + what it is for (132) |
| 16 | `/finance/bond-price` | 60.4 | 14 | how do you calculate bond price | present-value formula + yield table (139) |
| 17 | `/tech/keyword-density` | 16.9 | 12 | keyword density formula | formula + per-1,000 table + why it is weak (123) |
| 18 | `/construction/wall-area` | 32.7 | 10 | how to calculate area of wall | net-area formula + paint coverage (134) |
| 19 | `/everyday/leap-year` | 14 | 5 | how is a leap year calculated | century rule table (121) |
| 20 | `/education/class-rank` | 47.5 | 10 | how to calculate class rank | official method vs this estimate + table (147) |

## Before → after

| measure | before | after |
|---|---|---|
| clicks on these 20 pages in the window | 0 | 0 — the fix removes an answer gap; it cannot create a click until position moves |
| pages with a query-specific answer section | 0 of 20 | **20 of 20** |
| new words of verified formula/table content | 0 | **2,730** (101–183 per page) |
| numbers cited that are recomputed in a unit test | 0 | **every worked example** (`tests/unit/enhance-claims.test.js`, 62 tests) |
| internal related links added to these pages | — | 41 new crawlable anchors (build link audit: 0 broken) |
| H1 per page | 1 | 1 |
| in sitemap | 20/20 | 20/20 |
| browser render, console/network errors | — | 20/20 clean at 1280×900 |

Titles were **not** rewritten on these 20. The push list's missing tokens were mostly
noise (`australia`, `ctrl`, `agap`, `kalori`, `codecalculator`, `broglie` is real but the
title cannot carry it honestly without a matter-wave formula). Where a token reflected a
real gap, the answer section carries it instead of the title.

## Push-list rows deliberately left unchanged

| page | impr | missing token | why no change |
|---|---|---|---|
| `/science/carbon-dating` | 200 | range | the fresh export's query is "dating range calculator", not a range the C-14 tool computes; no calibration dataset held |
| `/homegarden/pool-chemicals` | 61 | australia | geography modifier; dosing depends on product concentration, not country |
| `/everyday/grocery-budget` | 28 | list | "list" names an input the tool does not have |
| `/fitness/squat-standards` | 28 | average, male | honest fix needs age/sex/bodyweight norms we do not hold |
| `/everyday/laundry-cost` | 23 | weight | the tool prices a load, not a weight |
| `/fitness/treadmill-pace` | 23 | many, min | query is steps-from-speed, a different calculation |
| `/homegarden/tile-grout` | 20 | thinset | **bug, not copy** — see the thinset arithmetic in the sprint report |
| `/lifestyle/streaming-value` | 15 | live | "live streaming cost" is production cost, not subscription value |
| `/health/calorie` | 10 | kalori | Malay/Indonesian for "calorie"; same intent already answered |
| `/tech/code-line-count` | 9 | codecalculator | concatenated brand string, not a query term |

## How to read the result

A new section does not move a page from position 25 to position 3 by itself. It gives the
page a reason to be the best answer for the query it already ranks for, which is what
converts an impression into a click when the position improves. Any CTR change inside 30
days is noise; re-measure on the 2026-11-14 export.
