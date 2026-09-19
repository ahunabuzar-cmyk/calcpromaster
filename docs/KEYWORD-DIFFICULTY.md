# Keyword Difficulty Report — CalcProMaster

_Generated 2026-09-18 by `scripts/build-difficulty-report.cjs` (deterministic; re-run with `npm run keywords:fresh`). Difficulty model: `scripts/keyword-difficulty.cjs`._

## 0. Honest scope — read this first

- **No real search-volume or backlink data exists in this repo.** Volumes below are structural proxies (word count + head-term class), and difficulty is modeled from phrase structure + the live SERP probes in section 1. Real numbers unlock the moment GSC credentials land (`docs/api-credentials-setup.md`).
- **No live rankings data**: GSC `service-account.json` is not present, so per-keyword position tracking is not possible yet. The six probes in section 1 are the only live evidence.
- The user rule applied throughout: **go after a keyword only if fewer than 20 of the top-10 pages are strong brands, and volume is decent.** Tiers below operationalize that: EASY = long-tail with intent qualifier (few strong brands compete), HARD = head term (brand wall).

## 1. Live SERP probes (2026-09-19, Google)

| Query | Verdict | Strong brands in top-10 (<20 rule) | Notes |
|---|---|---|---|
| home loan emi calculator with monthly prepayment | EASY-MEDIUM | 4/10 — passes <20 rule | No giant in #1; winners were smartemicalc.com, jupiter.money, fisdom, navi.com, groww.in — finance brands but niche-tool SERP. ~4/10 strong brands. Site NOT in top 10. |
| concrete volume calculator in cubic yards | HARD | 4/10 — passes <20 rule | calculator.net #1, concretenetwork.com #2, calculatorsoup #9 — 3-4 strong brands plus niche concrete sites. Site NOT in top 10. |
| cgpa to percentage conversion calculator | MEDIUM | 2/10 — passes <20 rule | Dedicated CGPA microsites rank (cgpatopercentge.com, cgpa2percent.com) + GeeksforGeeks #2. Low-authority niche sites win — winnable with on-page + a few links. Site NOT in top 10. |
| quadratic equation solver with steps | HARD | 6/10 — passes <20 rule | calculatorsoup, mathsisfun, khanacademy, mathpapa, symbolab, vedantu — 6/10 education giants. Site NOT in top 10. |
| gravel driveway calculator tons | MEDIUM-HARD | 4/10 — passes <20 rule | calculator.net #1, inchcalculator.com #2, omnicalculator #4/#10 — 3 strong brands + niche gravel shops. Site NOT in top 10. |
| bmr calculator for women over 50 | MEDIUM | 3/10 — passes <20 rule | No page targets the exact phrase; general BMR tools rank (calculator.net #2, clevelandclinic #3, forbes #7). Intent gap exists — best of the probed set. Site NOT in top 10. |

**Probe conclusion:** CalcProMaster is **not in the top 10 for any probed keyword**. The winnable pattern is exactly what the rule predicts: niche microsites (smartemicalc, cgpatopercentge) beat giants on fully specified long-tails. The site’s 1,331 curated long-tails are the right battleground; head terms are not, yet.

## 2. Portfolio summary (every targeted phrase, tiered)

| Tier | Phrases | Meaning |
|---|---|---|
| **EASY** (go after now) | 409 | 4+ words with intent qualifier — few strong brands in top-10 |
| **MEDIUM** (secondary) | 1468 | 3+ words — mixed SERPs, needs some links |
| **HARD** (park) | 3 | head terms — brand wall (calculator.net, omnicalculator, Khan Academy…) |
| **BRAND** (own) | 0 | CalcProMaster brand queries — must own #1 |

Total distinct targeted phrases: **1880** across 1334 indexable pages.

## 3. GO list — highest-value EASY targets (difficulty 2, best-volume first, sample of 60)

These pass the <20-strong-brands rule with margin. Each already has a dedicated page targeting it — the gap is authority/links, not content.

| Keyword | Page | Volume proxy |
|---|---|---|
| CGPA Calculator: Semester GPAs | `/education/cgpa` | low-mid (50–500/mo est.) |
| cost per hour flying | `/lifestyle/flight-cost-per-hour` | low-mid (50–500/mo est.) |
| Cubic Equation Solver: Roots | `/math/cubic-equation` | low-mid (50–500/mo est.) |
| final grade needed weighted | `/education/grade-needed` | low-mid (50–500/mo est.) |
| free coulombs law calculator | `/science/coulomb` | low-mid (50–500/mo est.) |
| free gst/vat calculator | `/everyday/gst` | low-mid (50–500/mo est.) |
| free half-life calculator | `/science/half-life` | low-mid (50–500/mo est.) |
| free ohms law calculator | `/science/ohms-law` | low-mid (50–500/mo est.) |
| gst calculator india calculator | `/regional/gst-india` | low-mid (50–500/mo est.) |
| GST Calculator India: Amount | `/regional/gst-india` | low-mid (50–500/mo est.) |
| income tax calculator india | `/regional/income-tax-india` | low-mid (50–500/mo est.) |
| IRR Calculator: Cash Flows | `/finance/irr` | low-mid (50–500/mo est.) |
| lump sum vs dca | `/finance/dca` | low-mid (50–500/mo est.) |
| old vs new tax | `/regional/income-tax-india` | low-mid (50–500/mo est.) |
| Percentage Calculator: Part & Whole | `/math/percentage` | low-mid (50–500/mo est.) |
| pet yearly cost calculator | `/lifestyle/pet-cost` | low-mid (50–500/mo est.) |
| Polar ↔ Rectangular: Between Polar | `/math/polar-rect` | low-mid (50–500/mo est.) |
| simple interest calculator yearly | `/finance/simple-interest` | low-mid (50–500/mo est.) |
| take home pay uk | `/finance/uk-income-tax` | low-mid (50–500/mo est.) |
| UAE VAT Calculator: Amount | `/regional/uae-vat` | low-mid (50–500/mo est.) |
| uk income tax calculator | `/finance/uk-income-tax` | low-mid (50–500/mo est.) |
| 2×2 Matrix Inverse: Step-by-Step Calculator | `/math/matrix-inverse` | low (10–100/mo est.) |
| 401k retirement calculator with employer match | `/finance/retirement` | low (10–100/mo est.) |
| 50/30/20 Budget Calculator: Monthly Take-Home | `/finance/envelope-budget` | low (10–100/mo est.) |
| 529 Plan Calculator: Current Balance, Monthly | `/finance/529-plan` | low (10–100/mo est.) |
| adjusted body weight calculator amputee limb loss percentage | `/health/chw` | low (10–100/mo est.) |
| Amortization Schedule: Loan Amount, Rate & Years | `/finance/amortization` | low (10–100/mo est.) |
| angle between two vectors calculator dot product | `/math/angle-between-vectors` | low (10–100/mo est.) |
| Angle Between Vectors Calculator: Step-by-Step Calculator | `/math/angle-between-vectors` | low (10–100/mo est.) |
| angular velocity calculator rpm rad/s radians per second rotation frequency | `/science/angular-velocity` | low (10–100/mo est.) |
| apr calculator loan fees true cost annual percentage rate | `/finance/apr-annual` | low (10–100/mo est.) |
| apy calculator annual percentage yield compounding | `/finance/apy-calculator` | low (10–100/mo est.) |
| AR Turnover Ratio: Net Credit Sales & Average Accounts | `/finance/accounts-receivable-turnover` | low (10–100/mo est.) |
| asphalt quantity calculator tons paving | `/construction/asphalt-quantity` | low (10–100/mo est.) |
| attendance calculator percentage classes required | `/education/attendance-rate` | low (10–100/mo est.) |
| Australia Income Tax Calculator: Annual Income | `/finance/australia-income-tax` | low (10–100/mo est.) |
| australia super calculator superannuation guarantee | `/regional/australia-super` | low (10–100/mo est.) |
| Australia Superannuation Calculator: Annual Salary | `/regional/australia-super` | low (10–100/mo est.) |
| auto loan calculator with sales tax | `/finance/auto-loan` | low (10–100/mo est.) |
| Baby Cost Calculator: Diapers per Day, Cost per Diaper | `/lifestyle/baby-cost` | low (10–100/mo est.) |
| Balloon Payment Calculator: Loan Amount, Rate & Amortization | `/finance/balloon-payment` | low (10–100/mo est.) |
| beam deflection calculator with load | `/engineering/beam-load` | low (10–100/mo est.) |
| bearing calculator load rating life l10 hours | `/engineering/bearing-load` | low (10–100/mo est.) |
| bmi calculator for men and women | `/health/bmi` | low (10–100/mo est.) |
| bmr calculator for women over 50 | `/health/bmr` | low (10–100/mo est.) |
| body fat calculator with measurements | `/health/body-fat` | low (10–100/mo est.) |
| body fat percentage navy method calculator | `/health/body-fat` | low (10–100/mo est.) |
| body mass index calculator with age | `/health/bmi` | low (10–100/mo est.) |
| bond duration calculator macaulay modified duration | `/finance/bond-duration` | low (10–100/mo est.) |
| Bond Duration Calculator: Macaulay & Modified Duration | `/finance/bond-duration` | low (10–100/mo est.) |
| bond price calculator with coupon rate | `/finance/bonds` | low (10–100/mo est.) |
| Bond Price Calculator: Present Value From Market Yield | `/finance/bond-price` | low (10–100/mo est.) |
| book value per share calculator bvps | `/finance/book-value-share` | low (10–100/mo est.) |
| Book Value Per Share Calculator: Shareholders' | `/finance/book-value-share` | low (10–100/mo est.) |
| break even point calculator with fixed costs | `/business/break-even-point` | low (10–100/mo est.) |
| Break-Even Calculator: Fixed Costs, Price per Unit | `/finance/break-even` | low (10–100/mo est.) |
| brick quantity calculator for wall construction | `/construction/bricks` | low (10–100/mo est.) |
| budget calculator monthly allocation percentages | `/everyday/budget-allocator` | low (10–100/mo est.) |
| Burn Rate Calculator: Cash Balance & Monthly Expenses | `/business/burn-rate` | low (10–100/mo est.) |
| business days calculator working days weekdays between dates | `/everyday/business-days` | low (10–100/mo est.) |

## 4. PARK list — head terms & brand-wall keywords (sample of 30)

Do **not** chase these with the current authority (zero/backlink-poor). Revisit after the domain move + first real backlinks. Includes HARD-tier phrases and MEDIUM score-4 phrases (head terms whose SERP is brand-dominated).

| Keyword | Best page | Volume proxy |
|---|---|---|
| bitcoin profit | `/finance/crypto-profit` | high (1k–50k+/mo est.) |
| calorie calculator | `/everyday/calorie-counter` | high (1k–50k+/mo est.) |
| crypto calculator | `/finance/crypto-profit` | high (1k–50k+/mo est.) |
| 15 days salary | `/regional/gratuity` | mid (100–2k/mo est.) |
| Adjusted Body Weight Calculator: Measured Weight | `/health/chw` | low (10–100/mo est.) |
| after tax cost of debt calculator | `/finance/cost-of-debt` | low (10–100/mo est.) |
| Age Calculator: Date of Birth | `/everyday/age` | low (10–100/mo est.) |
| age in days | `/everyday/age` | mid (100–2k/mo est.) |
| annual percentage rate | `/finance/apr` | mid (100–2k/mo est.) |
| APR Calculator: Loan Amount, Fees & Nominal Rate | `/finance/apr` | low (10–100/mo est.) |
| australia tax calculator | `/finance/australia-income-tax` | mid (100–2k/mo est.) |
| Auto Loan Calculator: Vehicle Price, Down Payment & Rate | `/finance/auto-loan` | low (10–100/mo est.) |
| bernoulli equation calculator fluid dynamics | `/science/bernoulli` | low (10–100/mo est.) |
| Bernoulli Equation: ½ρV² ρGh Constant | `/science/bernoulli` | low (10–100/mo est.) |
| bill split & tip calculator | `/utilities/tip-split` | low-mid (50–500/mo est.) |
| Bill Split & Tip: Bill Amount, Tip & Number of People | `/utilities/tip-split` | low (10–100/mo est.) |
| biweekly mortgage calculator accelerated payments savings | `/finance/biweekly-mortgage` | low (10–100/mo est.) |
| Biweekly Mortgage Calculator: Loan Amount, Rate & Loan Term | `/finance/biweekly-mortgage` | low (10–100/mo est.) |
| Biweekly Pay Calculator: Annual Salary | `/utilities/salary-biweekly` | low (10–100/mo est.) |
| block wall calculator concrete blocks cmu | `/construction/block-wall` | low (10–100/mo est.) |
| Blood Alcohol Content (BAC): Number of Drinks, Weight | `/everyday/blood-alcohol` | low (10–100/mo est.) |
| BMI Calculator: Weight & Height | `/health/bmi` | low-mid (50–500/mo est.) |
| BMR Calculator: Weight, Height & Age | `/health/bmr` | low (10–100/mo est.) |
| Body Fat Calculator: Weight, Waist & Neck | `/health/body-fat` | low (10–100/mo est.) |
| body fat percentage | `/health/body-fat` | mid (100–2k/mo est.) |
| Body Surface Area: Weight & Height | `/health/bsa` | low (10–100/mo est.) |
| bond coupon payment calculator semiannual interest face value | `/finance/coupon-payment` | low (10–100/mo est.) |
| Business Days Calculator: Start Date & End Date | `/everyday/business-days` | low (10–100/mo est.) |
| calorie burn calculator at rest | `/health/bmr` | low (10–100/mo est.) |
| Calorie Burn Calculator: Weight, Activity & Duration | `/health/calorie-burn` | low (10–100/mo est.) |

## 5. What actually moves rankings from here (priority order)

1. **GSC data unlock** (user step) — real queries/impressions replace every proxy in this doc. `npm run monitor:gsc` once `service-account.json` exists.
2. **First 3–5 backlinks** — GitHub repo profile already links the site; next: product-hunt-style directories, calculator roundup guest notes, Reddit r/InternetIsBeautiful-style shares of a single best tool (not spam).
3. **Custom domain** (`docs/CUSTOM-DOMAIN-PLAN.md`) — hosted-subdomain caps the ceiling for every EASY keyword too.
4. **Internal linking per cluster** (`docs/CLUSTER-LINKING-PLAN.md`) — free, already planned.
5. **Re-probe before big bets** — the six probes are a snapshot; SERPs shift.

## 6. Method note (reproducibility)

- Tiering: `scripts/keyword-difficulty.cjs` — deterministic phrase-structure model (word count, modifier vocabulary, brand-heavy head list). No randomness, no dates inside the logic.
- Inputs: `scripts/.keywords.jsonl` (regenerated from deploy tree by `scripts/extract-keywords.cjs`).
- Report: byte-stable across runs (sorted output, source-controlled date) — CI gate `npm run keywords:check` fails if docs drift from code.
