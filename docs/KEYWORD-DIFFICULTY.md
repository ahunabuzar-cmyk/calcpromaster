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
| **EASY** (go after now) | 1093 | 4+ words with intent qualifier — few strong brands in top-10 |
| **MEDIUM** (secondary) | 1423 | 3+ words — mixed SERPs, needs some links |
| **HARD** (park) | 0 | head terms — brand wall (calculator.net, omnicalculator, Khan Academy…) |
| **BRAND** (own) | 0 | CalcProMaster brand queries — must own #1 |

Total distinct targeted phrases: **2516** across 1334 indexable pages.

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
| free online Acceleration Calculator | `/science/acceleration` | low-mid (50–500/mo est.) |
| free online Acceleration Converter | `/conversion/acceleration-conv` | low-mid (50–500/mo est.) |
| free online Age Calculator | `/everyday/age` | low-mid (50–500/mo est.) |
| free online Angle Converter | `/conversion/angle` | low-mid (50–500/mo est.) |
| free online Annuity Calculator | `/finance/annuity` | low-mid (50–500/mo est.) |
| free online APR Calculator | `/finance/apr` | low-mid (50–500/mo est.) |
| free online Area Calculator | `/utilities/area-calc` | low-mid (50–500/mo est.) |
| free online Area Converter | `/conversion/area` | low-mid (50–500/mo est.) |
| free online Average Calculator | `/math/average` | low-mid (50–500/mo est.) |
| free online CAC Calculator | `/business/cac` | low-mid (50–500/mo est.) |
| free online Capacitor Calculator | `/engineering/capacitor` | low-mid (50–500/mo est.) |
| free online CAPM Calculator | `/finance/capm` | low-mid (50–500/mo est.) |
| free online Carpet Calculator | `/construction/carpet` | low-mid (50–500/mo est.) |
| free online Circle Calculator | `/math/circle` | low-mid (50–500/mo est.) |
| free online Circumradius Calculator | `/math/circle-through-points` | low-mid (50–500/mo est.) |
| free online Color Converter | `/utilities/color-picker` | low-mid (50–500/mo est.) |
| free online Combinations Calculator | `/math/combinations` | low-mid (50–500/mo est.) |
| free online Concrete Calculator | `/everyday/concrete` | low-mid (50–500/mo est.) |
| free online Cooking Converter | `/everyday/cooking` | low-mid (50–500/mo est.) |
| free online Covariance Calculator | `/math/covariance` | low-mid (50–500/mo est.) |
| free online Depreciation Calculator | `/business/depreciation` | low-mid (50–500/mo est.) |
| free online Discount Calculator | `/finance/discount` | low-mid (50–500/mo est.) |
| free online Dividend Calculator | `/finance/dividend` | low-mid (50–500/mo est.) |
| free online Drywall Calculator | `/construction/drywall` | low-mid (50–500/mo est.) |
| free online EBITDA Calculator | `/finance/ebitda` | low-mid (50–500/mo est.) |
| free online Energy Converter | `/conversion/energy` | low-mid (50–500/mo est.) |
| free online Excavation Calculator | `/construction/excavation` | low-mid (50–500/mo est.) |
| free online Exponent Calculator | `/math/exponent` | low-mid (50–500/mo est.) |
| free online Factorial Calculator | `/math/factorial` | low-mid (50–500/mo est.) |
| free online Fence Calculator | `/construction/fence` | low-mid (50–500/mo est.) |
| free online FIRE Calculator | `/finance/fire` | low-mid (50–500/mo est.) |
| free online Flooring Calculator | `/construction/flooring` | low-mid (50–500/mo est.) |
| free online Force Calculator | `/science/force` | low-mid (50–500/mo est.) |
| free online Force Converter | `/conversion/force-conv` | low-mid (50–500/mo est.) |
| free online Fraction Calculator | `/math/fraction` | low-mid (50–500/mo est.) |
| free online Frequency Calculator | `/science/frequency` | low-mid (50–500/mo est.) |
| free online Frequency Converter | `/conversion/frequency-conv` | low-mid (50–500/mo est.) |
| free online GFR Calculator | `/health/gfr` | low-mid (50–500/mo est.) |
| free online GPA Calculator | `/education/gpa` | low-mid (50–500/mo est.) |
| free online Gratuity Calculator | `/regional/gratuity` | low-mid (50–500/mo est.) |
| free online Gravel Calculator | `/construction/gravel` | low-mid (50–500/mo est.) |
| free online Horsepower Calculator | `/engineering/horsepower` | low-mid (50–500/mo est.) |
| free online Hydraulic Calculator | `/engineering/hydraulic` | low-mid (50–500/mo est.) |
| free online Impedance Calculator | `/engineering/impedance` | low-mid (50–500/mo est.) |
| free online Impulse Calculator | `/science/impulse` | low-mid (50–500/mo est.) |
| free online Inductor Calculator | `/engineering/inductor` | low-mid (50–500/mo est.) |
| free online Inflation Calculator | `/finance/inflation` | low-mid (50–500/mo est.) |
| free online Insulation Calculator | `/construction/insulation` | low-mid (50–500/mo est.) |
| free online IRR Calculator | `/finance/irr` | low-mid (50–500/mo est.) |
| free online Lens Calculator | `/science/lens` | low-mid (50–500/mo est.) |
| free online Lever Calculator | `/engineering/lever` | low-mid (50–500/mo est.) |
| free online Logarithm Calculator | `/math/logarithm` | low-mid (50–500/mo est.) |

## 4. PARK list — head terms & brand-wall keywords (sample of 30)

Do **not** chase these with the current authority (zero/backlink-poor). Revisit after the domain move + first real backlinks. Includes HARD-tier phrases and MEDIUM score-4 phrases (head terms whose SERP is brand-dominated).

| Keyword | Best page | Volume proxy |
|---|---|---|
| Adjusted Body Weight Calculator: Measured Weight | `/health/chw` | low (10–100/mo est.) |
| after tax cost of debt calculator | `/finance/cost-of-debt` | low (10–100/mo est.) |
| Age Calculator: Date of Birth | `/everyday/age` | low (10–100/mo est.) |
| APR Calculator: Loan Amount, Fees & Nominal Rate | `/finance/apr` | low (10–100/mo est.) |
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
| Body Surface Area: Weight & Height | `/health/bsa` | low (10–100/mo est.) |
| bond coupon payment calculator semiannual interest face value | `/finance/coupon-payment` | low (10–100/mo est.) |
| Business Days Calculator: Start Date & End Date | `/everyday/business-days` | low (10–100/mo est.) |
| calorie burn calculator at rest | `/health/bmr` | low (10–100/mo est.) |
| Calorie Burn Calculator: Weight, Activity & Duration | `/health/calorie-burn` | low (10–100/mo est.) |
| Calorie Calculator: Weight, Height & Age | `/health/calorie` | low (10–100/mo est.) |
| calorie deficit calculator weight loss | `/health/calorie-deficit` | low (10–100/mo est.) |
| calorie surplus deficit goal calculator | `/health/calorie-goal` | low (10–100/mo est.) |
| Calorie Surplus/Deficit Goal: TDEE & Weeks | `/health/calorie-goal` | low (10–100/mo est.) |
| Capital Gains Tax: Purchase Price, Sale Price & Tax Rate | `/finance/capital-gains` | low (10–100/mo est.) |
| Car Lease Payment Calculator: MSRP, Capitalized Cost | `/finance/car-lease-calculator` | low (10–100/mo est.) |
| car wash cost calculator annual subscription | `/lifestyle/car-wash-annual` | low (10–100/mo est.) |
| carbon dating calculator radiocarbon age c14 half life archaeology fossils | `/science/carbon-dating` | low (10–100/mo est.) |

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
