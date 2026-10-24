# SERP & Competitor Opportunity Report — Phase 3

_Generated 12 October 2026. Evidence: result listings returned for each query plus the
destination pages that could actually be fetched and read. **Nothing here is inferred
from memory**, and no search volume, keyword difficulty, CPC, backlink or ranking
figure appears anywhere in this document — no keyword tool is connected to this
environment (see §6)._

## 0. How to read this, and what it is not

| | |
|---|---|
| Query clusters analysed | 4 (chosen by **measured** impressions, not by guess) |
| Pages observed per cluster | 3–6 organic results |
| Destination pages fetched and read | 24 |
| Search volume / KD / CPC / backlinks | **Not available** — no provider connected |
| Rendered SERP screenshot | **Not captured.** Results come from a search API's result list |
| AI Overview / ads / sitelinks presence | **Unverified** — the API did not expose them (§5.5) |

**Confidence legend** used on every competitor row below:

- **HIGH** — the destination page was fetched and read; the description is from its own text.
- **MEDIUM** — only the returned listing/snippet was available; the page itself blocked the fetch.
- **LOW** — neither page nor reliable listing detail; recorded so the gap is visible, not hidden.

Why these four clusters: `data/query-reach.json` joins the GSC query→page export
(`data/gsc-query-page.json`, 28 days, 2026-09-09 → 2026-10-07, 3,684 distinct queries
joined at 69% impression coverage) to the page that already receives the impressions.
These pages have real measured demand and poor position — the definition of a page
worth improving before writing anything new:

| Page | Measured impressions (28d) | Distinct queries | Clicks | Reach tier |
|---|---|---|---|---|
| `/lifestyle/home-insurance` | 1,003 | 75 | 0 | broad |
| `/finance/apy-calculator` | 263 | 63 | — | — |
| `/health/bmr-mifflin` | 261 | 77 | — | stuck |
| `/guides/business-days` | 219 | 165 | — | — |

---

## 1. Cluster A — "home insurance calculator" → `/lifestyle/home-insurance`

### 1.1 What actually ranks

| Result | Type | Inputs seen | Methodology shown | Table / chart | Omissions | Conf. |
|---|---|---|---|---|---|---|
| usnews.com/insurance/homeowners-insurance/calculator | Interactive premium calculator | Not verified (fetch timed out) | Not verified | Not verified | — | LOW |
| progressive.com/homeowners/insurance-coverages/calculator | **Coverage** calculator, not a cost estimate | Not verified (blocked) | Not verified | Not verified | Estimates limits, not premiums; sits inside a quote flow | LOW |
| matic.com/home-insurance-calculator | Premium calculator + explainer | Address, credit-score band, year built, square footage | No formula; internal averages named | **Yes** — state averages + premium-by-coverage-band | Returns estimates, then asks more questions for a "more accurate" quote | HIGH |
| nerdwallet.com/insurance/homeowners/home-insurance-calculator | ZIP-based cost calculator + methodology | ZIP code (sample policy fixed: $300k liability, $1,000 deductible, good credit, no claims) | **Yes** — county estimates, ZIP→county weighting via **Census** relationship data, sample rates from **Quadrant Information Services** | Coverage-types table | Not a personalised quote; assumptions may not match the home; routes to quote assistance | HIGH |
| libertymutual.com/property/homeowners-insurance/home-insurance-calculator | Coverage calculator (per listing) | Not verified (blocked) | Not verified | Not verified | — | LOW |
| allstate.com/resources/home-insurance/coverage-calculator | Coverage calculator / quote pathway | Not verified (maintenance notice served) | Not verified | Not verified | — | LOW |

**Pattern:** the SERP is split between **insurer lead forms** (Progressive, Liberty
Mutual, Allstate) and **cost-data publishers** (NerdWallet, Matic). The only two pages
that could be read both publish a *stated methodology and a data vendor*; the insurer
pages could not be read at all.

**People Also Ask (verbatim, as returned):**

- "How much is homeowners insurance for a $500,000 house?"
- "How much is insurance on a $400,000 house?"
- "How much is homeowners insurance on a $350,000 house?"
- "How much is homeowners insurance on a $200,000 house?"

Same query family, second pass — "house insurance calculator": PAA repeats
"$500,000", "$400,000", "$300,000" and adds **"How do I calculate my home insurance?"**

### 1.2 What our page already does

`js/tool-enhance.js` (`home-insurance`) ships: the rate-per-$1,000 formula, the
$350,000 @ $3.50 → **$1,225/year · $102.08/month** worked example, a 4×5 value×rate
grid, the UK/Australia sum-insured conversion (480 ÷ 240 = **£2.00 per $1,000**),
and an explicit statement that the tool prices the **dwelling only** — with links to
renters insurance, relocation cost and the mortgage guide.

### 1.3 The gap

Every PAA question is a **value → premium** question. Our grid answers it as a
function of *rate*, but a reader with "$350,000 house" has no rate to type, and the
two competitors that answer with actual dollar averages do so because they license
rate data. **We hold no premium data, so we will not publish an average.**

The honest gap we *can* close:

1. **Invert the formula for the reader.** "If you want to keep the premium under
   $X a month, the rate must be under $Y per $1,000" — pure arithmetic, no data needed,
   and exactly the shape the PAA questions ask for.
2. **Answer "How do I calculate my home insurance?"** with the two-step method plus
   which of the inputs actually move the rate (rebuild cost, deductible, roof age,
   construction, claims) — all already asserted in the card, none of it headed for the query.
3. **Say what we are not.** No quote form, no address, no personal data; unlike the
   insurer pages above and the ZIP-based publisher page, the reader gets a number
   without a sales funnel. That is a real differentiator, not a slogan.
4. **Deductible ↔ premium direction**, which no observed page explained: raising the
   deductible lowers the rate, and the break-even point can be computed from the
   reader's own two quotes.

**Do NOT:** invent US state averages or a "typical" rate; add a quote form; imply a
bound quote.

**Blocked pending evidence:** the observation date reported for this cluster was
inconsistent with the others and most destination pages were unreadable. Re-run this
cluster's probe — including a rendered SERP — before making this page the first batch.

---

## 2. Cluster B — "business days calculator" → `/guides/business-days`

### 2.1 What actually ranks

| Result | Type | Computes | Holidays | Convention stated | Formula / table | Omissions | Conf. |
|---|---|---|---|---|---|---|---|
| timeanddate.com/date/workdays.html | Calculator tool | Between dates | Country holidays excluded (per listing) | Not verifiable (403) | Not verifiable | — | LOW |
| timetrex.com/resources/us-business-day-date-calculator | Calculator tool | **Adds** N business days to a start date | US federal holidays, automatic – no editable list | Start date is the origin; weekends skipped; **explicitly says it does not account for business hours** | Monthly business-day table + holiday list; **no formula** | US-only holidays; no cutoff time | HIGH |
| timeanddate.com/date/weekdayadd.html | Date calculator | Adds/subtracts days (business-day input unconfirmed) | Country selectable (per listing) | Not verifiable (403) | Not verifiable | — | LOW |
| hivedesk.com/calculators/business-days-calculator | Calculator **+ article** | **Both** | US federal toggle | **Day zero = start date, counting begins the next day**; whole dates, not hours; notes institutional cutoffs exist but the tool does not model them | Worked **3–5 business day table** + monthly holiday tables; no explicit formula | US-only; no cutoff/half-day/timezone modelling | HIGH |
| howmanybusinessdays.com | Calculator **+ article** | Between dates (next-business-day described indirectly) | **Country picker + regional holidays + custom days off** | "Mon–Fri excluding public holidays"; start-day convention **not stated** | No formula or reference table; advertises CSV export | Convention ambiguous; leans on an AI helper for explanations | HIGH |
| gigacalculator.com/calculators/working-days-calculator.php | Calculator **+ article** | Both | Calendars for **US, UK, Canada, Australia**; other holidays manual | Mon–Fri excluding official holidays; user chooses whether the last day counts | Date-by-date weekday table; **no formula** | Holiday coverage limited to 4 countries | HIGH |

Related pages that ranked for the long-tail variants: `atomixlogistics.com/blog/business-days-for-shipping`
(**distinguishes the shipping clock — ship date = day zero — from the non-shipping
request clock, which starts the next business day**), `howlongagogo.com/business-days/3-business-days-from-today`
(renders the answer as a **date**, not a weekday), `almanac.com/tool/business-day-calculator`,
`workingdays.us`, `tool.teamzlab.com`.

**People Also Ask (verbatim):**

- "How do you calculate business days?"
- "How long is 3 to 7 business days?"
- "How long is 5 business days from today?"
- "What is 3 business days in days?"

Variant queries add: "How to count 3 business days?", "How long are 3 to 5 business days?",
"What does "3 to 5 business days" mean?"

### 2.2 What our page already does

`guides/business-days.html` has the **only weekday-indexed table in the observed set**
(start weekday → +3 / +5 / +10 business days), the weekday-only formula
`business days = calendar days − weekend days − holidays`, the May 2026 count
(31 days → 21 weekdays → **20 business days** after Memorial Day) and September 2026
(30 days → 8 weekend days → **22 business days**), a complication table
(holidays / direction / regional workweeks / half-days) and a six-question FAQ.

### 2.3 The gap

| Remote gap | Observed evidence | Our page today |
|---|---|---|
| Holiday-aware worked example | hivedesk ships a holiday/business-day table; gigacalculator ships calendars | Complication table only — **no example with a named holiday inside the window** |
| Start-day convention stated as a rule | hivedesk: "start date is day zero"; our table implies it but the FAQ does not say it | Stated in the table caption; **not in the FAQ answers** |
| Shipping clock vs legal clock | Atomix article ranks by separating them | Absent |
| Cutoff/half-day reality | timetrex: "does not account for business hours" | One row in the complication table |
| Answer as a **date**, not a weekday | howlongagogo renders a date | Weekday only (+ "(next week)" hints) |

**Opportunity brief (implement):** add a holiday-adjusted worked example computed
from the page's own rule, state the day-zero convention in the FAQ, add a short
"shipping clock vs legal clock" section, and give the "N business days from today"
answers as **dates derived from an anchored weekday** rather than free-floating weekdays.
Also fix the unclosed `<p>` in the "How many working days are there in a month?" FAQ
answer (invalid HTML today).

**Do NOT:** ship a per-country public-holiday list we cannot verify, or claim live
holiday calendars.

---

## 3. Cluster C — "apy calculator savings account" + "APY vs APR" → `/finance/apy-calculator`

### 3.1 What actually ranks

| Result | Type | Inputs verified | Says APY/APR are the same maths? | Regional naming | Formula / example | Omissions | Conf. |
|---|---|---|---|---|---|---|---|
| bankrate.com/banking/savings/simple-savings-calculator | Savings calculator | APY, months, initial + monthly deposit (per listing) | No | None seen | Formula visible in the listing snippet only (page 405) | Tax and compounding-frequency inputs not confirmed | MEDIUM |
| axosbank.com/tools/calculators/apy-calculator (+ its APY explainer) | Bank APY calculator | Explainer says rate, balance, compounding frequency | Gives `APY = (1 + r ÷ n)^n − 1`; separates deposit APY from borrowing APR, but **does not frame them as one calculation** | **No AER / EAR naming** | Formula yes | No term/monthly-deposit/tax input verified | MEDIUM |
| sofi.com/calculators/apy-calculator | Fintech calculator | "Enter an APY, estimate earnings over time" | Not verified (403) | Not verified | Not verified | — | LOW |
| nerdwallet.com/banking/calculators/savings-calculator | Savings calculator | Not verified (403) | Not verified | Not verified | Not verified | — | LOW |
| marcus.com/…/high-yield-savings-calculator | Bank savings calculator | Not verified (403) | Not verified | Not verified | Listing shows comparison against national-average / competitor rates — i.e. **a marketing surface** | Promotional-rate conditions not assessable | LOW |

For "APY vs APR" the returned set was **all explainer articles, no calculator**:
CIBC Insights (worked $15,000 deposit with a year-by-year balance table), Fidelity
("APR includes fees" emphasis, worked $10,000 example, **no formula**), Ally
(**both** formulas + a 5.10%/5.00% worked comparison → **5.12% APY** in the listing
text), Marcus (403), a Reddit thread. A YouTube explainer appeared below the top five.
Capital One's separate explainer names APY as "**EAR, effective annual interest rate**".

**People Also Ask (verbatim):**

- "What is 5% APY on $1000 monthly?"
- "How much money will I earn on $10,000 with a 4% APY?"
- "Which bank gives 7% interest on savings accounts?"
- "Is 4% APY good for savings?"

From "APY vs APR": "What is the difference between 5% APR and 5% APY?", "What is 5% APY on $1000?".

### 3.2 What our page already does

The `apy-calculator` card ships: the APY formula, the 5% monthly → **5.116%** worked
step, a nominal→APY compounding table (monthly/daily/annual), a $10,000 single-balance
table (interest, balance, and the **correct** monthly rate `(1+APY)^(1/12) − 1`),
the "scale the row" sentence, and explicit naming of **AER** for the UK/Ireland with
"**APR is not interchangeable with APY**". `tests/unit/enhance-claims.test.js` re-derives
every one of those numbers independently and fails if the card and the calculator drift.

### 3.3 The gap

1. **PAA #1 is a monthly-contribution question — and we don't answer it.** "What is
   5% APY on $1,000 **monthly**?" is a regular-deposit accumulation, which is exactly
   what the calculator's monthly-deposit input models, yet the page's only table is a
   single lump sum.
2. **Nobody in the observed set states the core insight plainly:** APY and APR are the
   same compounding arithmetic shown two ways, and the labels only diverge because APR
   on a loan may add fees. Ally comes closest (both formulas, no framing); CIBC and
   Fidelity actively reinforce the "two different things" framing. We already have the
   sentence; the tables don't yet *demonstrate* it side by side.
3. **"What is 5% APY on $1000?"** — a scale row we have ($50), but no PAA-phrased answer.
4. **Temporary/promotional rates** (Marcus-style comparisons): every observed bank page
   is a marketing surface with rate caveats; we should state plainly that a promotional
   APY reverts and the arithmetic only holds for as long as the rate does.
5. **Tax on interest** — an omission in every observed calculator (Bankrate's own
   separate explainer covers it; its calculator does not).

**Do NOT:** rank or recommend specific banks, quote promotional APYs (they change and
are marketing claims), or imply an APY is "good" for a given user.

---

## 4. Cluster D — "bmr calculator" → `/health/bmr-mifflin`

### 4.1 What actually ranks

| Result | Type | Equation disclosure | Inputs seen | BMR vs TDEE | Omissions | Conf. |
|---|---|---|---|---|---|---|
| calculator.net/bmr-calculator.html | Calculator | **All three** — Mifflin-St Jeor, revised Harris-Benedict, Katch-McArdle — named with formulas | US/metric units; age, weight, height, (body-fat % for Katch-McArdle); sex-specific formulas | **Yes** — activity factor → daily calories, TDEE discussed | No older-adult-specific guidance; no worked input→result example | HIGH |
| garnethealth.org/news/basal-metabolic-rate-calculator | Health-system page + calculator | **Harris-Benedict formula shown but not named** | Weight, height, age, sex; no activity input | Not really — conflates BMR/RMR | No worked example; no activity adjustment | HIGH |
| cise.ufl.edu/~kcen/cis4930/assign2/index.html | Academic-hosted calculator | **Mifflin-St Jeor named** | Weight, height, age; activity constant described | Partly (multiplier explained, "TDEE" not used) | Form fields/units unverifiable | HIGH |
| myfitnesspal.com/tools/bmr-calculator | Fitness calculator | **Mifflin-St Jeor named**, formula not shown; claims better accuracy than Harris-Benedict | lb, ft/in — **no metric control seen**; no activity input | Says BMR excludes activity; **gives no TDEE calculation** | No worked example | HIGH |
| aviva.co.uk/…/bmr-calculator | Calculator | Mifflin-style formula in the listing only (403) | Not verified | Not verified | — | LOW |
| healthline.com/health/how-to-calculate-your-basal-metabolic-rate | Article | Formula in the listing only (no readable text) | Not verified | Not verified | — | LOW |

Related: `my.clevelandclinic.org/health/body/basal-metabolic-rate-bmr`, `nasm.org/resources/calorie-calculator`,
and — only when the query is quoted — `fabulous50s.com/bmi-bmr-calculator/`, an
"over 50" audience page that names Mifflin-St Jeor and shows the equations.

**People Also Ask (verbatim):**

- "What is a good BMR for a 50 year old woman?"
- "What is my BMR if I have hypothyroidism?"
- "Is burning 700 active calories a day enough?"
- "How many calories a day to lose 2 lbs a week?"
- "Can I just eat my BMR to lose weight?"

### 4.2 What our page already does

**Nothing in the enhancement layer** — `js/tool-enhance.js` has no `bmr-mifflin`
entry, and `data/query-reach.json` classifies `/health/bmr-mifflin` as a **`write`**
action (query coverage 25%, content coverage 75%, missing bucket: *Table / chart*).
It is one of only 19 pages in the backlog that need content written rather than
re-exposed, and it has the **highest query count on the page list (77)**.

### 4.3 The gap

The SERP's real confusion is **which equation** is being used — one page shows
Harris-Benedict without naming it, one names Mifflin without showing it, one shows all
three. Our page uses Mifflin-St Jeor; that should be visible, with the arithmetic it
produces, plus a worked example and the multiplier that turns BMR into TDEE.

Three PAA questions are **medical/clinical** ("hypothyroidism", "is 700 calories
enough", "can I just eat my BMR") and one is a judgement question ("a good BMR").
Per the card rules and this project's health guardrails, the page states what the
arithmetic is and explicitly is **not** a clinical assessment — it must not answer
those questions with advice.

**Opportunity brief (implement):** a `bmr-mifflin` enhancement card carrying
(a) the equation by name with its variables, (b) a worked example recomputed
independently, (c) an activity-multiplier table → TDEE as arithmetic, (d) a boundary
note ("this estimates resting energy expenditure from four inputs; it does not
diagnose or tell you how much to eat"). No population "good BMR" ranges are published,
because we hold no reference data for them.

---

## 5. Cross-cluster findings

1. **Formula visibility is the differentiator.** Among the pages that could be read,
   the ones with a stated method (NerdWallet: Census + Quadrant; calculator.net: all
   three equations; hivedesk: the day-zero rule; axosbank: the APY formula) are the
   ones worth competing with. Pages that hid their method were unreadable or were lead forms.
2. **Worked tables win the PAA.** Almost every PAA across the four clusters is a
   "how much / how long for this input" question, and the ranking pages answer with a
   table of values. We have tables for two of the four clusters and none for `bmr-mifflin`.
3. **Convention statements are rare and valuable.** Day-zero counting, rate-per-$1,000,
   nominal-vs-effective, Mifflin-vs-Harris-Benedict: stating which convention is in use
   is what separates a trustworthy page from a black box.
4. **Lead-form-free is a genuine advantage** on the insurance cluster, where the
   insurer pages are the ones we could not even read.
5. **SERP features are now measured, not assumed** — the rendered pass happened on
   2026-10-12 (§5.1). An AI Overview is present on three of the four clusters and
   **absent on `bmr calculator`**, which is the cluster where a health answer engine
   block was the biggest unknown. We appear in none of the four SERPs.
6. **We still hold no volume/difficulty data.** Selection among these clusters is based
   on *measured impressions we already receive*, which is a weaker but real signal
   (see `data/query-reach.json` and §6).

---

## 5.1 Rendered-SERP observation pass — 2026-10-12

Captured in the desktop browser (Chromium) on the live `google.com/search` page with
`hl=en&gl=us`, signed out, one query per cluster. Values are read from the **rendered DOM**
(`document.body.innerText` plus element counts) — not from a SERP API or a third-party
summary page — so "AI Overview present" means the block was on screen, and "absent" means
it was not, in this session.

| # | Query | AI Overview | PAA questions | Ad slots | We appear? |
|---|---|---|---|---|---|
| A | `home insurance calculator` | **present** (cites Insure.com, U.S. News & World Report) | 7 | 0 | no (0 mentions) |
| B | `business days calculator` | **present** (cites HiveDesk, timeanddate) | 4 | 0 | no (0 mentions) |
| C | `apy calculator savings account` | **present** (cites Bankrate, Axos Bank) | 4 | 0 | no (0 mentions) |
| D | `bmr calculator` | **absent** (verified twice: DOM + screenshot) | 5 | 0 | no (0 mentions) |

**Verbatim PAA captured (these are the questions to answer, in the SERP's own words):**

- **A** — "How much is homeowners insurance for a $500,000 house?" · "…for a $400,000
  house?" · "…for a $350,000 house?" · "…for a $200,000 house?" · "Is there a way to
  estimate homeowners insurance if I don't have a home yet?" · "Accurate home insurance
  estimate?" · "How do I calculate the cost of home insurance?"
- **B** — "How do you calculate business days?" · "How long is 3 to 7 business days?" ·
  "How long is 5 business days from today?" · "What is 3 business days in days?"
- **C** — "What is 5% APY on $1000 monthly?" · "How much money will I earn on $10,000 with
  a 4% APY?" · "Is 4% APY good for savings?" · "Is 3.3% APY on a savings account good?"
- **D** — "Should I just eat my BMR to lose weight?" · "What is the most accurate BMR
  calculator?" · "How much should I eat to lose weight if my BMR is 1400?" · "What is a
  normal BMR for a woman?" · "Why Does Bmr Matter?"

**Other features observed:**

- **A** — the AI Overview answers with *coverage components* (dwelling at ~$150/sq ft,
  other structures at 10% of dwelling), i.e. it reproduces the aggregator formula, not a
  premium. That is exactly the gap `js/tool-enhance.js` → `home-insurance` inverts into a
  target-premium answer.
- **C** — the SERP itself carries **interactive calculator widgets** (21 form/table
  elements on the page), so the results page competes with the click, not only with the
  ranking. The monthly-contribution case shipped for `apy-calculator` is the PAA #1
  question answered on our own page instead of on the SERP.
- **D** — no AI Overview, and the organic results are *dedicated calculator pages*
  (calculator.net, garnethealth.org, myfitnesspal, cise.ufl.edu). A calculator page with a
  named formula and two worked examples is directly comparable to that set; the five PAA
  questions, four of which are clinical, are answered on the page only as an explicit
  boundary (`bmr-mifflin`), which stays the deliberate choice.
- **No ad block** appeared in any of the four captures, and the related-searches block did
  not render in this session (documented, not assumed absent — see the caveat below).

**Capture caveat (read before reusing):** one observation per query, from one network
location — the browser's geo leaked into cluster D (an `aviva.co.uk` result among US
health sites) even with `gl=us`. Result *ordering* is therefore indicative only; the AI
Overview and PAA **presence/absence** is the part this pass settles. Re-run before each new
batch and update this table rather than treating it as permanent.

**How to re-run it** (manual by design — no scraping, no SERP API): open each query URL,
wait for `People also ask` to render, then read `document.body.innerText` and count
`#tads .uEierd` / `[aria-label="Sponsored"]` for ads and `input, select, table` for
embedded widgets. Queries:

```
https://www.google.com/search?q=home+insurance+calculator&hl=en&gl=us
https://www.google.com/search?q=business+days+calculator&hl=en&gl=us
https://www.google.com/search?q=apy+calculator+savings+account&hl=en&gl=us
https://www.google.com/search?q=bmr+calculator&hl=en&gl=us
```

---

## 6. Limits and requested inputs

| Needed | Why | What it unlocks |
|---|---|---|
| Google Keyword Planner / Ahrefs / Semrush export | Real volume, KD, CPC per keyword | Deliverable **B** columns currently marked *Not available* |
| GSC export with country + device dimensions | Query performance by market | Which clusters are winnable per country; CTR work |
| ~~A rendered-SERP observation pass~~ **done 2026-10-12** for these four clusters (§5.1) | AI Overview / ads / widgets | Confirmed: AI Overview on A, B, C; **none on D**; no ad block; widgets on C. Still needed for clusters beyond these four |
| A geo-controlled capture (proxy or a search-rank tool) | Cluster D leaked a UK result with `gl=us` | Country-accurate ordering; the AI-Overview *presence* answer already stands |
| Insurance rate data (licensed, e.g. Quadrant/NAIC/III) | "How much for a $350,000 house" | The dominant PAA on cluster A — until then we invert the formula instead of inventing an average |

---

## 7. URLs read (grouped by cluster)

**A — home insurance:** matic.com/home-insurance-calculator/ ·
nerdwallet.com/insurance/homeowners/home-insurance-calculator ·
homeinsurancebrokers.com/homeowners-insurance-cost-calculator/ ·
policygenius.com/homeowners-insurance/homeowners-insurance-calculator/ ·
thehartford.com/aarp/homeowners-insurance/rates · statefarm.com/insurance/quotes/homeowners-quote ·
allstate.com/resources/home-insurance/coverage-calculator

**B — business days:** timetrex.com/resources/us-business-day-date-calculator ·
hivedesk.com/calculators/business-days-calculator · howmanybusinessdays.com ·
gigacalculator.com/calculators/working-days-calculator.php ·
omnicalculator.com/everyday-life/working-days · almanac.com/tool/business-day-calculator ·
howlongagogo.com/business-days/3-business-days-from-today ·
tool.teamzlab.com/work/business-day-calculator/ · workingdays.us ·
atomixlogistics.com/blog/business-days-for-shipping
_(timeanddate.com/date/workdays.html and /date/weekdayadd.html returned 403;
reddit.com/r/NoStupidQuestions thread yielded no readable text.)_

**C — APY:** axosbank.com/tools/calculators/apy-calculator ·
axosbank.com/personal/insights/finance/digital-banking/what-is-apy ·
calculator.net/savings-calculator.html · ally.com/stories/save/the-ally-bank-savings-interest-calculator/ ·
capitalone.com/bank/financial-success-hub/savings-calculator/ ·
us.cibc.com/en/personal/cibc-insights/apy-vs-apr-differences.html ·
ally.com/stories/save/apy-vs-apr-what-is-apr-what-is-apy/ ·
capitalone.com/learn-grow/money-management/apr-vs-apy/ ·
fidelity.com/learning-center/smart-money/apr-vs-apy · bankrate.com/banking/savings/what-is-apy/
_(403/405: bankrate simple-savings-calculator, sofi, nerdwallet, marcus ×2.)_

**D — BMR:** calculator.net/bmr-calculator.html ·
garnethealth.org/news/basal-metabolic-rate-calculator ·
cise.ufl.edu/~kcen/cis4930/assign2/index.html · myfitnesspal.com/tools/bmr-calculator ·
my.clevelandclinic.org/health/body/basal-metabolic-rate-bmr · nasm.org/resources/calorie-calculator ·
fabulous50s.com/bmi-bmr-calculator/ · themifflin.com/calculators
_(403: aviva.co.uk; no readable text: healthline.com.)_

---

## 8. Reproduce / refresh

```bash
# the measured half of this report (impressions, queries, reach tiers, backlog)
node scripts/build-query-reach.cjs
```

The SERP half is a manual observation task by design — no scraping, no SERP API abuse.
Re-run it before each new batch of page improvements and update the dates above.

---

## 9. Implementation status — all four clusters shipped 2026-10-12

| Cluster | What was built from the opportunity brief | Where |
|---|---|---|
| **A — home insurance** | Formula inverted (target monthly premium → maximum rate per $1,000, rounded **down**), ceiling table, deductible break-even formula, and the lead-form-free statement the insurer competitors cannot make | `js/tool-enhance.js` → `home-insurance` |
| **B — business days** | Holiday-adjusted worked example with a named holiday inside the window, +10 business days as a date, day-zero convention in the FAQ, shipping-clock vs legal-clock section, unclosed `<p>` fixed | `guides/business-days.html` |
| **C — APY** | The monthly-contribution case PAA #1 asks for, the lump-sum-vs-monthly gap, an APY/APR side-by-side table, and the promotional-rate caveat | `js/tool-enhance.js` → `apy-calculator` |
| **D — BMR** | The page's first enhancement card: the equation named and shown, two worked examples, the activity-multiplier table to TDEE, and an explicit boundary that refuses the three clinical PAA questions rather than answering them | `js/tool-enhance.js` → `bmr-mifflin` |

**What was deliberately NOT done, per the "do NOT" list in each brief:** no invented state-average premiums, no quote form, no per-country holiday list we cannot verify, no bank recommendation or promotional APY, and no clinical or intake advice on the BMR page. Every published digit is re-derived by `tests/unit/enhance-claims.test.js` (42 tests) — including a guard that the BMR card contains none of the advice phrases.

**Closed 2026-10-12:** the rendered-SERP capture (§5.1) — AI Overview presence is now a
measurement for these four clusters (present on home insurance, business days and APY;
absent on BMR), not an assumption.

**Still open from §6:** the volume/CPC/country exports, a geo-controlled capture, and probe
coverage beyond these four clusters.
