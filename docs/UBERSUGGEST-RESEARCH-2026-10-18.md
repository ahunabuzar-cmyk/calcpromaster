# UberSuggest research pass — 18 Oct 2026

Data: five competitor keyword-gap exports, the site-level "suggested keywords" export,
the head-term list, and the backlink/referring-domain exports. Script:
`node scripts/ubersuggest-research.cjs` (re-runnable; output in
`data/ubersuggest-research-2026-10-18.json` and `data/keyword-gap/ubersuggest-pair-plan.csv`).

## Seedhi baat (TL;DR)

1. **1,285 calculators ke baad bhi sabse bada gap "pages ki kami" nahi, "page ka shape" hai.**
   RapidTables ke top-10 keywords mein se hum sirf **6%** answer karte hain — kyunki woh
   har unit pair ke liye alag page rakhta hai (`cm-to-inch`, `lb-to-kg`), hum ek generic
   `/conversion/length/` page rakhte hain.
2. **56 unit-pair pages = 781,800 searches/month, KD 6–21.** Ye sabse saaf, sabse kam risk
   wala win hai. Top 5: `m-to-ft` 165k, `cm-to-in` 74k, `mm-to-in` 49.5k, `in-to-cm` 40.5k,
   `ft-to-cm` 33.1k.
3. **PKR currency cluster sabse bada single opportunity hai: 7 pairs = 4.24M/month, KD 14–34.**
   UberSuggest ne khud hamare domain ke liye yahi 50 keywords suggest kiye (`dollar to rupee
   pak` 1.5M, `pound to pak rupee` 1M, `euro to pak` 823k). Converter already live rates
   fetch karta hai (`open.er-api.com`, PKR fallback) — sirf 7 pages chahiye.
4. **3 existing pages par chhote sections se 1.05M/month wali wording cover hoti hai** —
   BMI page par "female" lafz hi nahi hai (550k), time page duration nahi karta (301k),
   age page "year of birth" wording nahi rakhta (201k).
5. **Backlink export 500 rows hai, lekin actionable 1 hai** (`awesome-calculators` repo).
   Baaki sab news citations, Wikipedia, forums aur shorteners hain — mat follow karo.
   Asli link strategy: *citable* data pages, kyunki calculator.net ke links aise hi mile.

---

## 1. What was measured

| Input | Rows |
|---|---|
| `keywords gap for calculator.net (1).csv` | 2,000 |
| `keywords gap for omnicalculator.com.csv` | 2,000 |
| `keywords gap for calculatorsoup.com (1).csv` | 1,999 |
| `keywords gap for rapidtables.com.csv` | 2,000 |
| `keywords gap for calculator.io.csv` | 639 |
| `ubersuggest calculator.csv` (head terms) | 502 |
| `ubersuggest CalcProMaster Suggested Keywords.csv` | 50 |
| `ubersuggest opportunity backlinks.csv` / `refDomains.csv` | 500 / 500 |

**5,702 unique keywords** after de-duplication (whitespace-normalised).

Matching rule: a keyword counts as **covered** only when one live page slug holds every
meaningful token (`bmi` ⊂ `/health/bmi/`); a **section gap** when the page's tool noun is
there but the qualifier is absent from the page's own text (verified by reading the built
HTML); **missing** when no page exists; **off-intent** when the query is a product, brand,
world-clock, download or navigational query (606 keywords, 10.6% — excluded, not hidden).

| Verdict | Keywords |
|---|---|
| Covered (exact slug) | 788 |
| Covered (page text answers the qualifier) | 653 |
| Section gap (page exists, qualifier absent) | 760 |
| Missing (no page) | 2,863 |
| Off-intent (excluded) | 606 |

Missing-keyword volume is large (72.4M/month) but that number is not addressable: it is
dominated by `calculator` (55.6M) and other head terms owned by Google's own widget and
calculator.net. The report ranks by *winnable* volume (KD ≤ 40, intent match), not by total.

### Coverage of each competitor's top-10 set

| Competitor | Top-10 keywords | We answer | Exact | Section | No page |
|---|---|---|---|---|---|
| calculator.net | 900 | **75%** | 511 | 166 | 223 |
| calculatorsoup.com | 390 | **66%** | 151 | 105 | 134 |
| omnicalculator.com | 299 | **49%** | 77 | 69 | 153 |
| rapidtables.com | 1,047 | **6%** | 45 | 14 | 988 |
| calculator.io | 2 | 50% | 1 | 0 | 1 |

This is the whole strategy in one table. Against calculator.net (breadth of *tools*) we are
closest. Against RapidTables (breadth of *URLs per intent*) we are nearly absent — and their
1,047 top-10 keywords are the largest set of the five.

---

## 2. Finding 1 — the unit-pair layer (biggest, safest win)

RapidTables ranks with **152 pair URLs for 661 pair queries**. Their `cm-to-inch` page alone
appears for 10 phrasings of one intent. We have `/conversion/length/`, `/conversion/weight/`,
`/conversion/temperature/` — one page per *family*, which cannot rank for `cm to inches`.

Derived build list (`data/keyword-gap/ubersuggest-pair-plan.csv`): **56 pairs, 781,800
searches/month** using the largest phrasing per pair (not the sum — see method note below).
Currency pairs are deliberately excluded here: they need live rates, so they live in the PKR
track (section 3) rather than in the offline unit generator.

| Pair | Volume/mo | Phrasings | Min KD |
|---|---|---|---|
| m-to-ft | 165,000 | 43 | 15 |
| cm-to-in | 74,000 | 96 | 16 |
| mm-to-in | 49,500 | 12 | 17 |
| in-to-cm | 40,500 | 103 | 12 |
| ft-to-cm | 33,100 | 61 | 6 |
| cm-to-ft | 33,100 | 126 | 16 |
| lb-to-kg | 27,100 | 106 | 16 |
| ft-to-m | 27,100 | 31 | 17 |
| in-to-ft / ft-to-in | 27,100 each | 17 / 45 | 17 / 16 |
| in-to-mm / kg-to-lb / mm-to-ft / in-to-m / ft-to-mm | 18,100 each | 2–45 | 16–18 |
| mm-to-cm / mi-to-km | 14,800 | 5 / 9 | 21 / 18 |
| m-to-cm / cm-to-m / f-to-c | 9,900 / 9,900 / 8,100 | 5–21 | 15–17 |

Full 56-row list in the CSV. Family totals: length 635 keywords (min KD 6), weight 182
(min KD 7), temperature 52 (16), time 10 (24), area 12 (17), volume 6 (18), data 7 (18),
pressure 3 (17).

**Method note (important):** UberSuggest repeats the same cluster volume on every phrasing
(`cm to inch`, `cm to an inch`, `centimetres to the inch` all report 74,000). Summing them
inflates demand ~10×. The plan therefore ranks on the single largest phrasing per pair and
keeps phrasing count only as a duplicate-intent signal.

**Effort:** one generator + 60 registry entries (~1 day), each page: fixed from/to units,
live conversion, a pre-computed table for common values, and an inverse link. Must pass the
existing gates (unique intro, QA contract, keyword check, sitemap/count sync).

---

## 3. Finding 2 — PKR conversion cluster (largest volume, highest intent)

UberSuggest's *suggested keywords* export for this domain is 100% Pakistan-rupee conversion,
which means their model already sees us as a PKR-relevant site. 50 phrasings collapse to
**7 pairs, 4,237,000 searches/month**:

| Pair | Volume/mo | Min KD | Top phrasing |
|---|---|---|---|
| usd-to-pkr | 1,500,000 | 34 | dollar to rupee pak |
| gbp-to-pkr | 1,000,000 | 21 | pound sterling to pakistan rupee |
| eur-to-pkr | 823,000 | 29 | euro to pak |
| sar-to-pkr | 368,000 | 25 | riyal to pakistan |
| aed-to-pkr | 246,000 | 16 | dirham to pak rupee |
| aud-to-pkr | 165,000 | 14 | aud to pak rupees |
| cad-to-pkr | 135,000 | 19 | cad to pak rupees |

Why this is cheap for us: `/finance/currency-converter/` already fetches live rates from
`open.er-api.com` with a 1-hour cache and a static fallback that includes PKR
(`js/core.js`, `Currency` module). A pair page is the same converter with `from`/`to`
pre-set, an inverse link, and a rate table — no new data source, no new API key.

**Caveats, stated plainly:** these SERPs show Google's own converter widget, so CTR will be
a fraction of volume; and `usd-to-pkr` at 1.5M is the kind of number UberSuggest inflates.
The right expectation is 2–5% of the *runnable* volume, not 4.24M visits. Even at 2% the
cluster is worth more than any other single item in this report.

---

## 4. Finding 3 — three existing pages that are one section short (verified)

Read from the built HTML, not assumed:

| Page | Title today | Missing wording | Volume/mo |
|---|---|---|---|
| `/health/bmi/` | "BMI Calculator: Weight & Height" | `female` appears **0 times** | 550,000 |
| `/everyday/time-calc/` | "Time Calculator: Hours 1, Minutes 1 & Hours 2" | no duration calculator (it adds two time values) | 301,000 |
| `/everyday/age/` | "Age Calculator: Date of Birth" | `year of birth` appears **0 times** | 201,000 |

- **BMI female**: the intent is a BMI interpretation framed for women (and the healthy-range
  caveats that differ by sex). A 120-word section with a worked example inside the existing
  page covers it — no new URL, no cannibalisation with `/family/child-bmi/`.
- **Time duration**: this one is **not** a section, it is a different tool (duration between
  two clock times / dates, decimal hours). Recommend a dedicated `/everyday/time-duration/`
  and a link from the existing time page.
- **Age from birth year**: the page is DOB-based; queries asking "what is my age if I was born
  in 1998" need the year input path and that exact wording.

Section-gap rows beyond these three are mostly mis-targeted by the token heuristic
(`number in words` → mach number, `avg heart beat` → cost basis). Treat the JSON list as
leads to verify by hand, never as a task list.

---

## 5. Finding 4 — genuinely missing tools (no page at all)

Verified against the 1,419-URL sitemap:

| Concept | Volume/mo | Notes |
|---|---|---|
| logarithm / log calculator | 62,920 | `calculator log` 40,500; `log` 12,100 (KD 49) |
| binary ↔ decimal converter | 32,230 | 25 phrasings, KD 31–36 |
| body shape calculator | 28,920 | we only have body-fat and bodyweight-ratio |
| cube volume / formula | 18,380 | volume page exists, cube not |
| roman numerals 1–100 table + converter | 13,400 | converter exists, counting/table intent not |
| cylinder volume / formula | 10,470 | — |
| sphere volume / formula | 8,600 | — |
| median formula | 8,700 | mean-median-mode page exists, formula intent not |

These are normal registry additions (each needs a unique intro, QA contract and sitemap
entry). None is urgent compared with the pair layer, but each is a clean, low-KD win.

---

## 6. Finding 5 — the backlink export is not an outreach list

500 links, 40 distinct hosts. After removing shorteners (`bit.ly`, `goo.gl`, `tinyurl`),
search engines, Wikipedia mirrors, forums, Q&A pages and scraper sites, **one** target is
actually actionable:

- `github.com/xxczaki/awesome-calculators` — DA 96, a real "awesome list" PR.

Everything else is calculator.net's *earned* profile: NYT/WaPo/Forbes/CNBC/Healthline
articles that cite a calculator when a journalist needed a number, plus hundreds of forum
threads and link shorteners. That pattern is the actual lesson: **links came from being the
citable source for a specific number**, not from directories.

Practical implication: do not spend this week on link building. Build two or three
*citable* assets instead (e.g. a public "how many days in 2026 / 2027" page with the exact
arithmetic, a BMI-by-country table with sources, a "why your bank's rate differs from the
mid-market rate" explainer) and let the existing `open.er-api.com`-backed rate page carry
the citation.

---

## 7. Recommended order (and why this order)

| Priority | Work | Expected | Effort | Risk |
|---|---|---|---|---|
| P0 | 7 PKR pair pages | 4.24M query pool, KD 14–34 | half day | low — reuses live converter |
| P1 | 10 unit pairs from the CSV top (m-ft, cm-in, mm-in, in-cm, ft-cm, cm-ft, lb-kg, ft-m, in-ft, ft-in) | 500k+/mo pool | 1–2 days incl. generator | low |
| P2 | BMI female section + time-duration page + age wording | 1.05M pool | half day | low |
| P3 | Remaining 46 pairs, in batches of 10 | 278k pool | 2–3 days | medium (indexation) |
| P4 | Missing tools (log, binary, body shape, cube/cylinder/sphere, roman table, median formula) | ~183k pool | 2–3 days | low |
| P5 | `awesome-calculators` PR + 2 citable assets | links | 1 day | low |

**Ship in batches, not all at once.** The site currently has ~640 of ~1,415 URLs indexed.
Adding 60 URLs to a site whose indexation is already stalled invites the same stall for the
new pages. Ship P0, then P1's ten, then wait for indexing before the next ten — and link
every new pair page from its family hub (`/conversion/length/`, `/conversion/weight/`) plus
the currency hub, so crawl paths do not depend on the sitemap alone.

---

## 8. What this research does *not* prove

- **No position data for our own pages.** Search Console access is still blocked
  (`invalid_grant`), so every "we do not rank" statement is inferred from coverage, not
  measured. The 6%-of-RapidTables figure measures *content coverage*, not rankings.
- **Volumes are UberSuggest estimates.** Per-phrasing volumes are not additive; the plan uses
  the largest phrasing per pair. Treat all volumes as relative, not as traffic forecasts.
- **KD is UberSuggest's own score.** It is used only to separate "winnable now" (≤25) from
  "needs authority" (>45); it is not comparable across tools.
- **Backlink data is calculator.net's profile**, not ours — it says nothing about our current
  link equity.

## 9. Reproduce

```bash
node scripts/ubersuggest-research.cjs          # rebuilds JSON + pair CSV
cat data/keyword-gap/ubersuggest-pair-plan.csv # 56-row build list
```

Column meanings in the CSV: `family`, `pair_slug`, `phrasings` (how many query variants map
to it), `top_keyword` (largest phrasing, the page's H1 candidate), `monthly_volume` (that
phrasing's volume), `min_kd`, `rival_url` (the competitor page that owns it today).
