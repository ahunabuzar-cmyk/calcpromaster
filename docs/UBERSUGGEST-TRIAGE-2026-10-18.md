# UberSuggest export triage — 2026-10-18

**Generated:** 2026-10-18 · by `node scripts/ubersuggest-triage.cjs`
**Inputs:** `backlinks-calculatorio.csv`, `backlinks-rapidtables.csv`, `keywords-currency.csv`, `keywords-head.csv`, `keywords-modifiers.csv`, `refdomains-calculatorio.csv`, `refdomains-omnicalculator.csv`, `refdomains-rapidtables.csv`
**Joined against:** `deploy/sitemap.xml` (1,420 URLs) and `data/gsc-query-page.json` (2026-09-16 → 2026-10-14).

Every figure below is recomputed by the script; nothing is hand-typed.

## Verdict in one table

| Export | Rows | What it actually is | Worth acting on |
|---|---|---|---|
| `keywords-head.csv` | 502 | seeded on the bare word "calculator" | partly — 93 usable clusters, 177 rows name no calculation |
| `keywords-modifiers.csv` | 54 | modifier sweep ("calculator vs", "calculator or") | partly — 1 usable cluster, 11 rows name no calculation |
| `keywords-currency.csv` | 50 | "Suggested keywords" for the currency converter | yes — 7 real currency pairs behind 50 phrasings |
| `backlinks-rapidtables.csv` | 500 | competitor backlinks, 0.6% spun-content link farms | 140 editorial targets |
| `backlinks-calculatorio.csv` | 500 | competitor backlinks, 46.0% spun-content link farms | 4 editorial targets |
| `refdomains-*.csv` (3 files) | 1,500 | three competitors' referring domains | 143 non-platform shared domains |

## 1. The keyword data is mostly the wrong intent

### `keywords-head.csv`

502 rows · 32 with volume 0 · highest volume 55,600,000 · highest CPC 7.68

| Intent class | Rows |
|---|---|
| serve | 291 |
| device | 74 |
| serial | 66 |
| app | 41 |
| code | 21 |
| brand | 9 |

This is the "calculator" seed with no modifier. Its biggest rows are `calculator` (55.6M), `calculator age` (11.1M) and `calculator bmi` (7.5M) — but the tail is shoppers: `calculator price`, `calculator casio`, `calculator watch casio`, `calculator under 100`, `calculator shop near me`, `calculator hide app`. A web calculator cannot answer any of those, and the head terms are owned by Google's own widget. **Verdict: discard as a targeting list.** Keep it only as a commercial-demand signal for future affiliate pages.

### `keywords-modifiers.csv`

54 rows · 23 with volume 0 · highest volume 55,600,000 · highest CPC 0.82

| Intent class | Rows |
|---|---|
| offintent | 25 |
| serve | 13 |
| device | 6 |
| brand | 6 |
| code | 2 |
| serial | 1 |
| app | 1 |

54 rows of `calculator vs <thing>` and `calculator or <thing>`, 23 with zero volume. This is what UberSuggest returns when you ask for keyword ideas for the word "calculator" with modifier expansion on. **Verdict: discard.**

### `keywords-currency.csv`

50 rows · 0 with volume 0 · highest volume 1,500,000 · highest CPC 403.38

That CPC column is priced in PKR: it peaks at 403.38 while the same column peaks at 7.68 in the USD-priced exports. Read as dollars it is inflated by roughly two orders of magnitude, so do not budget against it until the export currency is set to USD.

| Intent class | Rows |
|---|---|
| serve | 50 |

50 rows, all `X to PKR`, no zero-volume noise, SEO difficulty 14–45. This is the only file with intent we can serve: 7 pairs, and the site already runs a live-rate converter, so the data source exists. What is missing is one page aimed at an intent the rate widget cannot answer (§8), not seven pages for seven phrasings.

## 2. 50 phrasings, 7 queries

| Pair | Phrasings | Max volume | Lowest SD | Example |
|---|---|---|---|---|
| USD → PKR | 16 | 1,500,000 | 34 | `dollar to rupee pak` |
| GBP → PKR | 7 | 1,000,000 | 21 | `pound sterling to pakistan rupee` |
| EUR → PKR | 8 | 823,000 | 29 | `euro to pak` |
| SAR → PKR | 6 | 368,000 | 25 | `riyal to pakistan` |
| AED → PKR | 7 | 246,000 | 16 | `dirham pakistan rupees` |
| AUD → PKR | 2 | 165,000 | 14 | `aud to pak rupees` |
| CAD → PKR | 3 | 135,000 | 19 | `cad dollar to pak rupees` |

These volumes are **not additive**. `dollar to pak rupee`, `usd to pak rs` and `1 dollar to pak rupee` are one query to Google; summing them would invent millions of searches. The script takes the max phrasing per pair and says so.

## 3. Backlinks: one profile is earned, one is a link farm

| Class | rapidtables | calculator.io |
|---|---|---|
| news | 86 | 26 |
| edu | 54 | 4 |
| wiki | 20 | 0 |
| forum | 69 | 10 |
| other | 251 | 229 |
| search/shortener | 17 | 1 |
| farm | 3 | 230 |

rapidtables: 0.6% link-farm content. calculator.io: 46.0%. The calculator.io profile is half spun blog posts — the same "taking-control-your-guide-to-home-loan-calculators" post republished on dozens of `*.blogprodesign.com` / `*.storyNNNN` templates. **That is a paid-link footprint, not a link-building model.** Anything that reproduces it puts the domain at risk.

What rapidtables actually earns links from is a specific quotable number: the dog-age formula (NYT, BBC, Guardian, Smithsonian, WaPo), the tip, RGB→hex, temperature conversion. Journalists cite the calculator because it states one memorable number, not because it has a page.

### Cross-competitor overlap: publishers, not a directory

Union of the three referring-domain exports: 1,310 domains. Shared by 2+: 179; all 3: 11. Of the shared set, 36 are platforms that host anyone (wordpress.org, github.com, pages.dev, vercel.app, diigo.com…) — not outreach targets. That leaves **143**. They are publishers, and that is the interesting part: no calculator directory is in this list. Every one of them links because a single article needed a single number — the LED-lantern review, the crossword solution, the covid curve, the car-current explainer. So the overlap is not a target list to email; it is evidence of which pages earn links, and it is the page that gives the cleanest one-line answer per query.

| Domain | DA | Links to |
|---|---|---|
| en.wikipedia.org | 98 | 2/3 |
| es.wikipedia.org | 96 | 2/3 |
| fr.wikipedia.org | 95 | 2/3 |
| nytimes.com | 95 | 2/3 |
| uol.com.br | 95 | 2/3 |
| washingtonpost.com | 94 | 2/3 |
| nasa.gov | 94 | 2/3 |
| news.yahoo.com | 94 | 2/3 |
| bing.com | 94 | 2/3 |
| yandex.com | 94 | 2/3 |
| businessinsider.com | 94 | 2/3 |
| theguardian.com | 94 | 2/3 |
| detik.com | 93 | 2/3 |
| cnet.com | 93 | 2/3 |
| tecmundo.com.br | 93 | 2/3 |

## 4. What Google already shows, and why it does not convert

| Metric | Value |
|---|---|
| Clicks | 21 |
| Impressions | 18,917 |
| CTR | 0.1% |
| Average position | 33.1 |
| URLs with at least one impression | 581 |
| Impressions not attributable to a query-page pair | 7,350 |

### The CTR problem is bigger than the ranking problem

241 pages (279 URL forms, because of the slash split below) have a best position of 10 or better and **zero clicks**, holding 8,109 impressions. At the industry CTR for position 5–8 that should be hundreds of clicks. Two candidates, and they need different fixes:

1. **The SERP has an instant answer.** For `how to calculate tip`, `rgb to hex`, `harmonic mean calculator` Google answers inline above the organic results — ranking 7th there is worth ~0 clicks no matter how good the title is.
2. **The snippet is not being clicked.** Fixable in an afternoon: rewrite the title/meta to lead with the number, city, or state the query implies.

| URL | Impressions | Best position |
|---|---|---|
| `/lifestyle/home-insurance/` | 637 | 2 |
| `/finance/pmi-calculator/` | 561 | 5 |
| `/finance/fha-loan/` | 416 | 2 |
| `/guides/tip` | 327 | 7.03 |
| `/finance/apy-calculator/` | 252 | 2 |
| `/finance/credit-utilization/` | 224 | 4 |
| `/health/bmr-mifflin` | 175 | 1 |
| `/finance/wacc/` | 152 | 6 |
| `/guides/business-days` | 137 | 5.5 |
| `/lifestyle/renters-insurance` | 133 | 6.76 |

### Striking distance is where fast wins live

833 query-page pairs sit at position 3–15, carrying 3,694 impressions and 5 clicks. 32 of those have ≥20 impressions — these are the pages where one on-page change moves real traffic, and none of them came from the UberSuggest exports.

| Query | Page | Impressions | Position |
|---|---|---|---|
| `how to calculate tip` | `/guides/tip` | 327 | 7.0 |
| `fha loan calculator` | `/finance/fha-loan/` | 223 | 11.1 |
| `pmi calculator` | `/finance/pmi-calculator/` | 142 | 9.9 |
| `renters insurance calculator` | `/lifestyle/renters-insurance` | 100 | 6.8 |
| `rgb to hex` | `/tech/rgb-hex/` | 76 | 13.0 |
| `if you spend $3 on coffee per school/work day, how much are you spending per year? under $100 between $100 and $250 between $250 and $750 more than $750` | `/everyday/coffee-cost/` | 68 | 8.5 |
| `prorated rent calculator` | `/finance/prorated-rent` | 66 | 13.3 |
| `fha home loan calculator` | `/finance/fha-loan/` | 65 | 6.9 |
| `rent affordability calculator` | `/finance/rent-affordability/` | 61 | 13.3 |
| `last menstrual period calculator` | `/health/pregnancy/` | 57 | 5.3 |
| `calculate annual percentage yield` | `/finance/apy-calculator/` | 52 | 9.7 |
| `harmonic mean calculator` | `/math/harmonic-mean/` | 49 | 8.4 |

### Legacy URL forms still split the data

112 pages appear in GSC under **both** `/path` and `/path/`, together accounting for 4,967 impressions (26.3% of the property). The server now 308s each family to one canonical (tools → `/path/`, guides → `/path`), so these are stale index entries from before the redirect went in, not a live defect — `data/url-format-audit.json` reports 0 FAILs across 1,420 URLs. Until Google recrawls, any per-URL report reads roughly half the true number.

### Manual check: the head tags are not the problem

Not part of the regeneration — this was three live `curl` requests on 2026-10-18 against the pages holding the most zero-click impressions:

| URL | `<title>` | canonical | robots | JSON-LD |
|---|---|---|---|---|
| `/guides/tip` | How to Calculate a Tip — Rates, Splitting the Bill & Tipping | self | index, follow | 1 block |
| `/finance/pmi-calculator/` | PMI Calculator 2026: Monthly Private Mortgage Insurance Cost | self | index, follow | 1 block |
| `/lifestyle/home-insurance/` | Home Insurance Estimate: Home Value & Rate | self | index, follow | 1 block |

So the zero-click finding is **not** a missing-tag bug: every page is indexable, self-canonical, and has valid structured data. It is either SERP saturation or a snippet that loses the click.

## 5. Keyword clusters vs what ships

| | Clusters |
|---|---|
| Actionable intent clusters in the three keyword files | 100 |
| Owned by a page whose **slug** carries every token | 36 |
| Words appear in a page **title** but the slug says something else | 11 |
| No page **slug** answers them | 53 |
| — of those, already claimed by a tool's `kw` field (§6b) | 14 |

Slug matches are trustworthy. Title matches are leads: "day" matched /engineering/electrical-energy/ because its title says "per day", which is not the same intent.

Uncovered clusters with the largest volume:

| Cluster | Max volume | Phrasings | SD | Nearest page |
|---|---|---|---|---|
| `dollar pkr` | 1,500,000 | 12 | 34 | `/food/protein-per-dollar/` |
| `currency dollar pkr` | 1,500,000 | 2 | 34 | `/guides/currency-conversion` |
| `pkr pound` | 1,000,000 | 7 | 21 | — |
| `bmi female` | 550,000 | 1 | — | `/guides/bmi` |
| `loan personal` | 368,000 | 1 | — | `/auto/car-loan-emi/` |
| `emi loan personal` | 301,000 | 1 | — | `/auto/car-loan-emi/` |
| `duration time` | 301,000 | 1 | — | `/guides/screen-time` |
| `birth year` | 201,000 | 1 | — | `/everyday/day-of-year/` |
| `currency dirham pkr` | 201,000 | 2 | 16 | `/guides/currency-conversion` |
| `feet meter` | 165,000 | 1 | — | — |

## 6. What the list can actually deliver, measured

Two numbers decide whether a keyword list can move a traffic target, and neither is in the UberSuggest export. Both are computed here.

### a. What this site converts stated volume into today

`15` of the 47 covered clusters map onto a page that appears in the per-URL GSC export. Those pages carry **16,918,020** of UberSuggest volume and earned **291 impressions in 28 days** — a capture of **0.0017%**.

That is the multiplier to apply to any new page: stated volume × 0.0017% ≈ the impressions it can be expected to add at today's ranking strength.

### b. How many “uncovered” clusters already touch an existing tool

| | Clusters | Volume |
|---|---:|---:|
| Already claimed by a tool's `kw` field (slug lacks the words) | 14 | 3,477,160 |
| True gaps — nothing on the site answers them | 39 | 3,150,760 |

Already claimed, ranked by volume. The match is on words in the tool's `kw` field — read the third column and confirm the intent before treating a row as covered:

| Cluster | Volume | Tool that claims those words |
|---|---:|---|
| `dollar pkr` | 1,500,000 | `currency-converter` (`js/data/finance.js`) |
| `currency dollar pkr` | 1,500,000 | `currency-converter` (`js/data/finance.js`) |
| `duration time` | 301,000 | `speech-time` (`js/data/utilities.js`) |
| `cgpa percent` | 60,500 | `cgpa` (`js/data/education.js`) |
| `age birthday` | 49,500 | `age-exact` (`js/data/utilities.js`) |
| `hour minute` | 33,100 | `time-conv` (`js/data/conversion.js`) |
| `hour time` | 22,200 | `pto-calc` (`js/data/career-freelance.js`) |
| `between date day two` | 6,600 | `date-diff` (`js/data/everyday.js`) |
| `interest yearly` | 3,600 | `compound-interest` (`js/data/finance.js`) |
| `month year` | 390 | `age` (`js/data/everyday.js`) |
| `day month year` | 170 | `age` (`js/data/everyday.js`) |
| `office post rd` | 70 | `post-office-savings` (`js/data/regional.js`) |
| `5 percent` | 20 | `uae-vat` (`js/data/regional.js`) |
| `binary` | 10 | `bitwise-xor` (`js/data/math.js`) |

Where the match is real (the `cgpa` row is the clearest — the tool is called CGPA Calculator and its `kw` already says “cgpa to percentage”), building a new page duplicates the existing one: the fix is the slug, the title, or an internal link. Where it is only a word collision (`hour time` → `pto-calc`), the row is a lead, not a finding.

True gaps, ranked by volume:

| Cluster | Volume | SD |
|---|---:|---:|
| `pkr pound` | 1,000,000 | 21 |
| `bmi female` | 550,000 | — |
| `loan personal` | 368,000 | — |
| `emi loan personal` | 301,000 | — |
| `birth year` | 201,000 | — |
| `currency dirham pkr` | 201,000 | 16 |
| `feet meter` | 165,000 | — |
| `1 dollar pkr` | 165,000 | 34 |
| `cad dollar pkr` | 135,000 | 34 |
| `dollar inr` | 40,500 | — |
| `401k withdrawal` | 9,900 | — |
| `401k growth` | 6,600 | — |
| `kalkulator zakat` | 2,900 | — |
| `24 clock hour` | 1,900 | — |
| `kaise mein nikale percent` | 1,300 | — |
| _(+ 24 more, see the JSON)_ | | |

### c. Pages that already target a cluster and are still silent

`12` of the claimed clusters map onto a live URL, and that URL has **zero impressions** in the 28-day export:

| Cluster | Volume | Page | Impressions |
|---|---:|---|---:|
| `dollar pkr` | 1,500,000 | `/finance/currency-converter/` | 0 |
| `currency dollar pkr` | 1,500,000 | `/finance/currency-converter/` | 0 |
| `duration time` | 301,000 | `/utilities/speech-time/` | 0 |
| `cgpa percent` | 60,500 | `/education/cgpa/` | 0 |
| `age birthday` | 49,500 | `/utilities/age-exact/` | 0 |
| `hour minute` | 33,100 | `/conversion/time-conv/` | 0 |
| `hour time` | 22,200 | `/career/pto-calc/` | 0 |
| `between date day two` | 6,600 | `/everyday/date-diff/` | 0 |

This is the answer to “will building a page for this keyword bring impressions?”. The page already exists, already carries the keyword, and Google still does not show it. A new URL for the same intent starts from the same place.

### d. What the target costs on these keywords

| Target / month | Impressions / day | × the 28-day average (676/day) | Share of the 6,627,920 list volume needed | × the measured capture |
|---|---:|---:|---:|---:|
| 200,000 | 6,667 | 9.9x | 3.0% | 1,754x |
| 300,000 | 10,000 | 14.8x | 4.5% | 2,631x |

Read the last two columns together. Hitting the target from **this list alone** means earning a capture rate about *2,631x* today's — which is a ranking/authority change on the same URLs, not more keywords. A new page does not carry that multiplier with it.

## 7. Will any of this make us rank fast?

Judgement, not measurement — but it follows from the four sections above:

- **0 of the 605 exported keyword phrasings appear among the 250 queries in the GSC export.** Not one of them overlaps. Every fast win in this data set is already on the site: the striking-distance pairs in §4. (The GSC export is capped at 250 query rows, so this rules out overlap with the queries we have data for, not with every query we appear on.)
- The 7 PKR pairs are the worst possible test case for "rank fast". A currency conversion is the canonical instant-answer SERP: Google puts its own converter above the results. The 241 zero-click pages are the proof — that is what ranking inside the top 10 on an answerable query looks like.
- What the site actually lacks is not keywords. It is 581 URLs with impressions, 21 clicks in 28 days, and average position 33. No keyword list moves that; sub-10 positions on queries with no instant answer do.

## 8. What to do, in order

**P0 — start with what already ranks.** 241 pages are inside the top 10 with zero clicks. Pick the ten with real impressions, check the SERP by hand for an instant answer, and either rewrite the snippet or drop the query. This is the only work here with a measurable payoff inside two weeks.

**P1 — one PKR page, aimed at what Google cannot answer inline.** Not the head `usd to pkr` query (widget), and not seven doorway pages. §6c settles the argument: `/finance/currency-converter/` already carries `dollar pkr` in its keyword field and has 0 impressions in 28 days, so a second URL for the same intent does not start from a better place. The open intents are the ones the widget does not cover: a rate-history table, "why did the rupee fall", and worked conversions for round amounts.

Current rate is already available — `js/currency.js` tries `open.er-api.com` and then `api.frankfurter.app`, caches for an hour, and falls back to a static table that includes PKR (278.5). **History is the open question:** `js/historical-rates.js` exists but holds US macro series only (30-year mortgage, Fed funds, 10-year Treasury, CPI, savings rate) — no FX series at all. 12 months of PKR is a different endpoint on both live upstreams, and whether it is free on either was not tested here. Check that before promising a chart — a stub table with one week of data would be a thin page, not a win.

**P2 — earn one citable number.** The backlink data says links come from a single quotable figure, not from outreach volume. Pick two calculator topics where we can publish a defensible original number and make it the page's answer.

**Do not do:** buy or reproduce the calculator.io blog-farm pattern (46.0% of its profile), target the head terms from `keywords-head.csv`, or build pages for `calculator vs` queries.

## Limits of this analysis

- The capture rate in §6 is a ratio of unlike quantities: the numerator is a page's impressions from *all* its queries, the denominator is one cluster's max-phrasing volume. It is a direction, not a forecast. What it does establish is the order of magnitude — the site converts its stated volume at far below 1%, so volume is not the scarce input.
- GSC query rows are anonymised for low-volume queries: 7,350 impressions cannot be attributed to a query-page pair.
- The backlink exports are one competitor's top 500, which is a sample of the tail, not the full profile.
- The currency API was read from source, not exercised wholesale: live fetch, caching and the static fallback are in the code, but this run did not verify that either upstream serves PKR today or returns a free 12-month series.
- Nothing here was deployed. No page, registry entry, canonical or sitemap was modified.
