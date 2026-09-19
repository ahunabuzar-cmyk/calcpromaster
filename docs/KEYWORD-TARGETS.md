# Keyword Targeting Map — CalcProMaster (complete inventory)

_Machine-extracted from the deploy tree + calculator data modules on 2026-09-18. Nothing hand-added, nothing omitted._

**How to read this document**

- **Primary keyword** = the page `<title>` (what Google shows; the exact-match anchor of every page).
- **Secondary surface** = the `<meta description>` (long-tail + intent modifiers).
- **Curated long-tail phrases** = the `kw` field in `js/data/*.js` — the specific queries each tool was built to rank for (feature + audience + locale modifiers). These are woven into page copy, FAQs and JSON-LD.
- **Difficulty tag** on each keyword = `[TIER/score]` from `scripts/keyword-difficulty.cjs` — EASY (2) = 4+ word long-tail with intent qualifier (few strong brands in top-10 — go after), MEDIUM (3–4) = needs some links, HARD (5) = head term with brand-wall SERP (park until authority grows), BRAND (1) = own brand queries. Model + evidence: **docs/KEYWORD-DIFFICULTY.md**.
- Indexable pages audited: **1334** (noindex variant pages excluded by design).

**Totals:** 1201 calculator pages · 20 category hubs · 73 guides · 6 blog posts · 12 support/static pages.

**Honest scope note:** these are the keywords the site TARGETS (on-page). Whether the site RANKS for them is a different question — that requires Google Search Console data (see docs/SEO-AUDIT-2026-09-17.md: rankings/backlinks cannot be verified without GSC credentials).

---

## 1. Site-wide head terms (homepage + category hubs)

### `/`
- **Title:** CalcProMaster — 1201+ Free Online Calculators
- **Meta:** CalcProMaster — 1201+ free calculators for finance, health, math, science, engineering and everyday life. Step-by-step solutions, formulas, charts. No sign-up.

### `/auto`
- **Title:** Auto & Transport Calculators
- **Meta:** Fuel cost, EV charging, car loan, depreciation and mileage calculators.

### `/business`
- **Title:** Business Calculators
- **Meta:** Free business calculators for ROI, profit margin, cash flow, break-even, CAC, LTV and markup — estimate any business metric in seconds.

### `/career`
- **Title:** Career & Freelance Calculators
- **Meta:** Salary converter, freelance rate, job offer compare and side hustle profit.

### `/construction`
- **Title:** Construction Calculators
- **Meta:** Free construction calculators for concrete volume, rebar, roofing, flooring and building material estimates.

### `/conversion`
- **Title:** Unit Conversion Calculators
- **Meta:** Free unit conversion calculators — length, weight, volume, temperature, speed, area and more with instant results.

### `/education`
- **Title:** Education Calculators
- **Meta:** Free education calculators for GPA, final grades, test scores, study time and grade targets — plan your coursework with real numbers.

### `/engineering`
- **Title:** Engineering Calculators
- **Meta:** Free engineering calculators for electrical, mechanical and civil work — beam loads, wire gauge, Ohm law, torque and more.

### `/everyday`
- **Title:** Everyday Calculators
- **Meta:** Free everyday calculators — age, dates, fuel cost, cooking conversions, tips and time planning for daily life questions.

### `/family`
- **Title:** Parenting & Family Calculators
- **Meta:** Child height prediction, family budget, college savings, childcare cost and estate planning.

### `/finance`
- **Title:** Finance Calculators
- **Meta:** Free financial calculators for loans, mortgages, investments, taxes, retirement and more.

### `/fitness`
- **Title:** Fitness & Exercise Calculators
- **Meta:** Free fitness calculators for running pace, one-rep max, heart-rate zones, calories burned and workout planning.

### `/food`
- **Title:** Food & Nutrition Calculators
- **Meta:** Free food and nutrition calculators — calories, macros, keto limits, meal planning and recipe scaling with instant results.

### `/health`
- **Title:** Health & Fitness Calculators
- **Meta:** Calculate BMI, BMR, calories, body fat, heart rate and other health metrics.

### `/homegarden`
- **Title:** Home & Garden Calculators
- **Meta:** Paint, wallpaper, lighting, AC size, garden soil and DIY project calculators.

### `/lifestyle`
- **Title:** Lifestyle & Home Calculators
- **Meta:** Free lifestyle calculators for moving costs, rent splits, cooking conversions, pet care and everyday home decisions.

### `/math`
- **Title:** Math Calculators
- **Meta:** Scientific calculators, algebra, geometry, statistics and more math tools.

### `/regional`
- **Title:** Regional Calculators (India/PK/UAE)
- **Meta:** Free regional calculators for India, Pakistan and UAE — FD, RD, PPF, GST, zakat, income tax and local salary math.

### `/science`
- **Title:** Science Calculators
- **Meta:** Free science calculators for physics and chemistry — density, molarity, kinetic energy, wave speed and lab conversions.

### `/tech`
- **Title:** Tech & Digital Calculators
- **Meta:** Download time, data usage, password strength, domain value and tech ROI.

### `/utilities`
- **Title:** Utility Calculators
- **Meta:** Free utility calculators — QR codes, password strength, color converters, unit helpers and other handy everyday tools.

## 2. Support & trust pages

| Page | Title target |
|---|---|
| `/about` | About CalcProMaster |
| `/contact` | Contact CalcProMaster |
| `/disclaimer-finance` | Financial Disclaimer |
| `/disclaimer-general` | General Disclaimer |
| `/disclaimer-health` | Health Disclaimer |
| `/editorial-policy` | Editorial Policy |
| `/embed` | Free Calculator Widgets for Your Website — Embed a Calculator |
| `/googled1ac20b54b36e7cf` |  |
| `/` | CalcProMaster — 1201+ Free Online Calculators |
| `/og-image` |  |
| `/privacy` | Privacy Policy |
| `/terms` | Terms of Service |

## 3. Guides (73)

| Guide | Title target |
|---|---|
| `/guides/ac-size` | AC Size Calculator — BTU Formula, Tonnage & the Oversizing Trap |
| `/guides/age` | How to Calculate Your Exact Age in Years, Months & Days |
| `/guides/auto` | Auto & Vehicle Guides — Fuel, ownership & running costs |
| `/guides/baby-cost` | Baby Cost Calculator — First-Year Budget Formula & Worked Example |
| `/guides/bmi` | How to Calculate BMI — Formula, Ranges & What the Number Means |
| `/guides/bmr` | BMR Calculator — Mifflin-St Jeor Formula, Worked Example & Multipliers |
| `/guides/body-fat` | Body Fat Percentage — the US Navy Method, Formula & Limits |
| `/guides/break-even` | Break-Even Analysis — Formula, Margin of Safety & Worked Example |
| `/guides/business-days` | Business Days Calculator — Workday Math, Deadlines & the Complication List |
| `/guides/business` | Business Guides — Break-Even, Margin, Target Profit |
| `/guides/cagr` | CAGR Calculator — Compound Annual Growth Rate Formula & Examples |
| `/guides/calories` | How to Calculate Calories for Weight Loss or Gain — TDEE Explained |
| `/guides/career` | Career & Freelance Guides — Salary, rates & negotiating power |
| `/guides/compound-interest` | How to Calculate Compound Interest — Formula & Worked Examples |
| `/guides/concrete` | How to Calculate Concrete in Cubic Yards — Slabs, Footings, Bags |
| `/guides/construction` | Construction Guides — Concrete, Bags, Bricks |
| `/guides/credit-card-minimum` | Credit Card Minimum Payments — the Math That Keeps You in Debt |
| `/guides/currency-conversion` | How Currency Conversion Works — Rates, Spreads & Hidden Fees |
| `/guides/debt-payoff` | Debt Snowball vs Avalanche — Which Pays Off Debt Faster? |
| `/guides/debt-ratio` | Debt-to-Income Ratio — the 36/43 Rule & Worked Example |
| `/guides/discount` | How to Calculate a Discount — Percent Off, Stacked Discounts & Real Savings |
| `/guides/electricity-bill` | Electricity Bill Calculator — kWh Formula & Appliance Costs |
| `/guides/emi` | How to Calculate Loan EMI — Formula & Step-by-Step Example |
| `/guides/engineering` | Engineering Guides — Electrical, mechanical & structural math |
| `/guides/ev-vs-petrol` | EV vs Petrol Running Cost — The Per-KM Formula & Worked Example |
| `/guides/everyday` | Everyday Calculations Guides — Dates, bills & quick daily math |
| `/guides/family` | Family & Parenting Guides — Growing children, growing budgets |
| `/guides/fd-ppf-sip` | FD vs PPF vs SIP — Same ₹1 Lakh, Three Outcomes (Worked Comparison) |
| `/guides/food` | Food & Nutrition Guides — Calories, macros & kitchen math |
| `/guides/freelance-rate-card` | Rate Card Guide — Hourly, Project & Retainer Pricing for Freelancers |
| `/guides/fuel-cost` | Fuel Cost Calculator — Trip Cost Formula & Efficiency Savings |
| `/guides/gear-ratio` | Gear Ratio Calculator — Formula, RPM & Torque Trade-off |
| `/guides/glossary` | Calculator & Finance Glossary — 36 Terms Explained Simply |
| `/guides/gpa` | How GPA Is Calculated — Weighted vs Unweighted, Step by Step |
| `/guides/grade-needed` | Grade Needed on Final Calculator — The Weighted-Grade Formula |
| `/guides/gst-sales-tax` | GST & Sales Tax Explained — Adding, Removing & Reverse Tax Math |
| `/guides/health-fitness` | Health & Fitness Guides — BMI, Calories, Body Metrics |
| `/guides/heart-rate-zones` | Heart Rate Training Zones — Formulas, Worked Numbers & Sense-Check |
| `/guides/homegarden` | Home & Garden Guides — Rooms, materials & sizing |
| `/guides/hourly-rate` | Freelance Hourly Rate Calculator — The Billable-Hours Formula |
| `/guides/ideal-weight` | Ideal Weight Calculator — Devine Formula, BMI Range & Why They Disagree |
| `/guides/income-tax` | How Income Tax Is Calculated — Brackets, Marginal Rates & Worked Examples |
| `/guides/inflation` | How Inflation Is Calculated — CPI, Purchasing Power & Real Values |
| `/guides/lifestyle` | Lifestyle & Money Habits Guides — Moving, renting & everyday spending |
| `/guides/loans-mortgages` | Loan & Mortgage Guides — EMI, Interest, Affordability |
| `/guides/macro-calculator` | Macro Calculator — Protein, Carb & Fat Grams From Calories |
| `/guides/math-statistics` | Math & Statistics Guides — Percentages, Statistics, Randomness |
| `/guides/mortgage` | How to Calculate a Mortgage Payment — Formula & Example |
| `/guides/net-worth` | How to Calculate Net Worth — Assets, Liabilities & What Counts |
| `/guides/npv-vs-irr` | NPV vs IRR — Which Investment Metric to Trust & Why They Fight |
| `/guides/ohms-law` | Ohm's Law Calculator — V = IR Formula, Worked Examples & Power |
| `/guides/paint-coverage` | Paint Coverage Calculator — Wall Area, Coats & Litres Needed |
| `/guides/passwords` | Password Security — Entropy, Crack Time & Strong Passphrase Math |
| `/guides/percentage` | How to Calculate Percentage — Formula, Examples & Common Mistakes |
| `/guides/profit-margin` | Profit Margin Calculator — Margin vs Markup, Formulas & Worked Example |
| `/guides/protein-intake` | Protein Intake Calculator — g/kg Targets & Food Equivalents |
| `/guides/random-numbers` | How Random Number Generators Work — True vs Pseudo, Seeds & Ranges |
| `/guides/regional` | Regional Finance (India & South Asia) Guides — FD, RD, PPF, SIP & local tax |
| `/guides/rent-vs-buy` | Rent vs Buy — the Breakeven Math Most Comparisons Skip |
| `/guides/retirement` | How Much You Need to Retire — The Retirement Number Explained |
| `/guides/room-area` | Room Area Calculator — Irregular Shapes, Waste % & Material Orders |
| `/guides/salary` | Gross Salary vs In-Hand Salary — How to Calculate Take-Home Pay |
| `/guides/science` | Science Guides — Physics & chemistry fundamentals |
| `/guides/screen-time` | Screen Time Calculator — Weekly Hours, Yearly Days & What the Numbers Mean |
| `/guides/sip` | SIP Calculator — The Future-Value Formula & Compounding |
| `/guides/sleep-cycles` | Sleep Cycle Logic — 90-Minute Cycles & Wake Times Explained |
| `/guides/tax-salary` | Tax & Salary Guides — Income Tax, GST, Take-Home Pay |
| `/guides/tip` | How to Calculate a Tip — Rates, Splitting the Bill & Tipping Abroad |
| `/guides/unit-conversion` | Metric to Imperial Conversion Guide — Exact Factors & How to Convert |
| `/guides/utilities` | Utilities & Developer Tools Guides — Text, codes & security |
| `/guides/water-intake` | How Much Water Should You Drink — the Real Formula & Adjustments |
| `/guides/wedding-budget` | Wedding Budget Planner — Category Splits & the Guest-Count Lever |
| `/guides/zakat` | How to Calculate Zakat — Nisab, Rates & Worked Examples |

## 4. Blog (6)

| Post | Title target |
|---|---|
| `/blog/bmi-honest-look` | BMI Is a Screening Tool, Not a Diagnosis — an Honest Look |
| `/blog/concrete-patio-math` | The 4-Inch Mistake — Why Concrete Orders Go Wrong |
| `/blog/ev-vs-petrol-tco` | EV vs Petrol — the 5-Year Math Nobody Finishes |
| `/blog/how-emi-works` | How Banks Calculate Your EMI — Amortization Demystified |
| `/blog/rule-of-72` | The Rule of 72 — Where Doubling-Time Math Bends |
| `/blog/stacked-discounts` | "Extra 20% Off" Is Less Than You Think — Stacked Discount Math |

## 5. Calculator pages — every curated keyword, category by category

## 5.1 Auto & Transport Calculators — `auto/` (46 tools)

**/auto/fuel-cost — Fuel Cost Calculator**
- Title: Fuel Cost Calculator: Distance, Mileage & Fuel Price
- Keywords: fuel cost calculator [MEDIUM/3]

**/auto/mileage-calculator — Mileage Calculator**
- Title: Mileage Calculator: Distance & Fuel Used
- Keywords: free mileage calculator [MEDIUM/3]

**/auto/fuel-price-compare — Fuel Price Comparison**
- Title: Fuel Price Comparison: Yearly km, Petrol km/L & Petrol $/L
- Keywords: petrol vs diesel [MEDIUM/3]

**/auto/car-loan-emi — Car Loan EMI Calculator**
- Title: Car Loan EMI Calculator: Loan Amount, Rate & Months
- Keywords: auto loan EMI [MEDIUM/4]

**/auto/car-affordability — Car Affordability**
- Title: Car Affordability: Monthly Income, Monthly Expenses
- Keywords: car affordability calculator [MEDIUM/4]

**/auto/lease-vs-buy — Lease vs Buy Car**
- Title: Lease vs Buy Car: Car Price, Down Payment & Loan Rate
- Keywords: lease vs buy [MEDIUM/3]

**/auto/ev-charging-cost — EV Charging Cost**
- Title: EV Charging Cost: Battery, Current % & Target %
- Keywords: ev charging cost [MEDIUM/3]

**/auto/ev-vs-gas-petrol — EV vs Petrol Cost**
- Title: EV vs Petrol Cost: Yearly km, EV kWh/100km
- Keywords: ev vs petrol [MEDIUM/3]

**/auto/ev-range — EV Range Estimator**
- Title: EV Range Estimator: Battery & Efficiency
- Keywords: ev range estimator calculator [MEDIUM/3]

**/auto/car-maintenance — Car Maintenance Cost**
- Title: Car Maintenance Cost: Car Age & Yearly km
- Keywords: car maintenance cost [MEDIUM/4]

**/auto/tire-size — Tire Size Calculator**
- Title: Tire Size Calculator: Old Width, Old Profile & Old Rim
- Keywords: tire size calculator [MEDIUM/3]

**/auto/oil-change — Oil Change Interval**
- Title: Oil Change Interval: When Change Oil
- Keywords: oil change interval [MEDIUM/3]

**/auto/car-insurance — Car Insurance Cost**
- Title: Car Insurance Cost: Age & Car Value
- Keywords: car insurance cost [MEDIUM/4]

**/auto/commute-cost — Commute Cost Calculator**
- Title: Commute Cost Calculator: One-Way Distance, Days/Week
- Keywords: commute cost calculator [MEDIUM/3]

**/auto/ride-share-cost — Ride-Share vs Car Cost**
- Title: Ride-Share vs Car Cost: Daily km, Ride $/km & Car km/L
- Keywords: rideshare vs car cost [EASY/2]

**/auto/public-transport — Public Transport vs Car**
- Title: Public Transport vs Car: One-Way km, Days/Month
- Keywords: public transport vs car [EASY/2]

**/auto/walking-transit — Walk vs Transit Time**
- Title: Walk vs Transit Time: Distance, Walk Speed & Transit Wait
- Keywords: walk vs transit [MEDIUM/3]

**/auto/trip-time — Trip Time Calculator**
- Title: Trip Time Calculator: Distance, Avg Speed & Break every
- Keywords: trip time calculator [MEDIUM/3]

**/auto/speed-distance-time — Speed Distance Time**
- Title: Speed Distance Time: Distance, Speed & Hours
- Keywords: speed distance time [MEDIUM/3]

**/auto/parking-cost — Parking Cost Calculator**
- Title: Parking Cost Calculator: Daily Rate & Days/Month
- Keywords: parking cost calculator [MEDIUM/3]

**/auto/car-depreciation — Car Depreciation**
- Title: Car Depreciation: Purchase Price, Years
- Keywords: car depreciation calculator [MEDIUM/4]

**/auto/trade-in-value — Trade-In Value Estimator**
- Title: Trade-In Value Estimator: Original Price & Age
- Keywords: trade in value [MEDIUM/3]

**/auto/bike-fuel — Motorcycle Fuel Cost**
- Title: Motorcycle Fuel Cost: Monthly km, Mileage & Fuel Price
- Keywords: bike fuel cost [MEDIUM/3]

**/auto/bike-loan — Motorcycle Loan EMI**
- Title: Motorcycle Loan EMI: Bike Price, Rate & Months
- Keywords: bike loan EMI [MEDIUM/4]

**/auto/stopping-distance — Stopping Distance**
- Title: Stopping Distance: Speed & Reaction Time
- Keywords: stopping distance calculator [MEDIUM/3]

**/auto/fuel-efficiency — Fuel Efficiency Savings**
- Title: Fuel Efficiency Savings: Current km/L, Target km/L
- Keywords: fuel efficiency savings [MEDIUM/3]

**/auto/car-rental — Car Rental Cost**
- Title: Car Rental Cost: Days, Daily Rate & Insurance
- Keywords: car rental cost [MEDIUM/4]

**/auto/taxi-fare — Taxi Fare Estimator**
- Title: Taxi Fare Estimator: Distance, Base Fare & Per km
- Keywords: taxi fare estimator [MEDIUM/3]

**/auto/auto-fare — Auto-Rickshaw Fare**
- Title: Auto-Rickshaw Fare: Distance, Base Fare & Per km
- Keywords: auto rickshaw fare [MEDIUM/3]

**/auto/delivery-cost — Delivery Cost Calculator**
- Title: Delivery Cost Calculator: Distance, Fuel Cost & Driver Wage
- Keywords: delivery cost calculator [MEDIUM/3]

**/auto/route-optimizer — Multi-Stop Route Cost**
- Title: Multi-Stop Route Cost: Stops, Total km & Min/Stop
- Keywords: route cost calculator [MEDIUM/3]

**/auto/carbon-footprint-car — Car Carbon Footprint**
- Title: Car Carbon Footprint: Yearly km & km/L
- Keywords: car carbon footprint [MEDIUM/4]

**/auto/fuel-tank-range — Fuel Tank Range Calculator**
- Title: Fuel Tank Range Calculator: Tank Size, Fuel Efficiency
- Keywords: fuel tank range calculator distance full tank [MEDIUM/3]

**/auto/tow-capacity — Tow Capacity Calculator**
- Title: Tow Capacity Calculator: GCWR, Truck Weight & Passengers
- Keywords: tow capacity calculator trailer weight payload [MEDIUM/4]

**/auto/cargo-volume — Cargo Volume Calculator**
- Title: Cargo Volume Calculator: Length, Width & Height
- Keywords: cargo volume calculator trunk van cubic feet [EASY/2]

**/auto/toll-cost — Toll Cost Calculator**
- Title: Toll Cost Calculator: Number of Toll Points, Average Toll
- Keywords: toll cost calculator trip highway fee [MEDIUM/3]

**/auto/carpool-savings — Carpool Savings Calculator**
- Title: Carpool Savings Calculator: Your Weekly Drive Cost
- Keywords: carpool savings calculator commute share fuel [MEDIUM/3]

**/auto/bus-vs-car — Bus vs Car Cost**
- Title: Bus vs Car Cost: Daily Parking, Daily Fuel & Daily Bus Fare
- Keywords: bus vs car cost calculator commute compare [EASY/2]

**/auto/ebike-range — E-Bike Range Calculator**
- Title: E-Bike Range Calculator: Battery & Consumption
- Keywords: e-bike range calculator battery capacity wh [MEDIUM/3]

**/auto/scooter-cost — Scooter Running Cost**
- Title: Scooter Running Cost: Mileage, Fuel Price & Daily Distance
- Keywords: scooter running cost calculator per km petrol electric [EASY/2]

**/auto/registration-cost — Vehicle Registration Cost**
- Title: Vehicle Registration Cost: Vehicle Value, Registration
- Keywords: vehicle registration calculator cost plates title [MEDIUM/3]

**/auto/tire-replacement — Tire Replacement Cost**
- Title: Tire Replacement Cost: Set of 4 Cost, Tread Life
- Keywords: tire replacement cost calculator per mile set [EASY/2]

**/auto/speed-conv — Speed Converter (Auto)**
- Title: Speed Converter (Auto): Mph And Pace
- Keywords: speed converter kmh mph pace calculator [MEDIUM/3]

**/auto/hybrid-savings — Hybrid vs Gas Savings**
- Title: Hybrid vs Gas Savings: Annual km, Gas Car & Hybrid
- Keywords: hybrid vs gas savings calculator mpg fuel cost [EASY/2]

**/auto/power-to-weight — Power-to-Weight Calculator**
- Title: Power-to-Weight Calculator: Horsepower
- Keywords: power to weight ratio calculator hp tonne car [MEDIUM/4]

**/auto/quarter-mile — Quarter-Mile ET Calculator**
- Title: Quarter-Mile ET Calculator: Power & Weight
- Keywords: quarter mile calculator et trap speed horsepower [EASY/2]

## 5.2 Business Calculators — `business/` (39 tools)

**/business/business-roi — Business ROI**
- Title: Business ROI: Revenue & Total Cost
- Keywords: marketing roi calculator with campaign cost [EASY/2]

**/business/profit-margin — Profit Margin Calculator**
- Title: Profit Margin Calculator: Revenue & Cost
- Keywords: profit margin calculator with cost and revenue [EASY/2]

**/business/ltv — Customer LTV**
- Title: Customer LTV: Monthly Revenue/User & Customer Lifespan
- Keywords: customer ltv calculator [MEDIUM/3]

**/business/cac — CAC Calculator**
- Title: CAC Calculator: Marketing Spend & New Customers
- Keywords: customer acquisition cost [MEDIUM/3]

**/business/conversion-rate — Conversion Rate**
- Title: Conversion Rate: Total Visitors & Conversions
- Keywords: conversion rate calculator [MEDIUM/3]

**/business/churn — Churn Rate Calculator**
- Title: Churn Rate Calculator: Starting Customers & Lost Customers
- Keywords: churn rate calculator [MEDIUM/3]

**/business/roas — ROAS Calculator**
- Title: ROAS Calculator: Ad Revenue & Ad Spend
- Keywords: return on ad spend [MEDIUM/3]

**/business/burn-rate — Burn Rate Calculator**
- Title: Burn Rate Calculator: Cash Balance & Monthly Expenses
- Keywords: burn rate calculator [MEDIUM/3]

**/business/mrr — MRR Calculator**
- Title: MRR Calculator: Active Subscribers & Monthly Price
- Keywords: monthly recurring revenue [MEDIUM/3]

**/business/nps — Net Promoter Score (NPS) Calculator**
- Title: Net Promoter Score (NPS) Calculator: Promoters, Passives
- Keywords: net promoter score [MEDIUM/3]

**/business/freelance-rate — Freelance Rate Calculator**
- Title: Freelance Rate Calculator: Desired Annual Income
- Keywords: freelance rate calculator [MEDIUM/3]

**/business/pricing — Pricing Calculator**
- Title: Pricing Calculator: Unit Cost & Desired Margin
- Keywords: free pricing calculator [MEDIUM/3]

**/business/inventory — Inventory Turnover**
- Title: Inventory Turnover: Cost of Goods Sold & Average Inventory
- Keywords: inventory turnover calculator [MEDIUM/3]

**/business/break-even-revenue — Break-Even Revenue**
- Title: Break-Even Revenue: Fixed Costs & Contribution Margin
- Keywords: break even revenue [MEDIUM/3]

**/business/payback — Payback Period**
- Title: Payback Period: Initial Investment & Annual Cash Flow
- Keywords: payback period calculator [MEDIUM/3]

**/business/depreciation — Depreciation Calculator**
- Title: Depreciation Calculator: Asset Cost, Salvage Value
- Keywords: free depreciation calculator [MEDIUM/3]

**/business/discount-rate — Discount Rate Calculator**
- Title: Discount Rate Calculator: Equity, Debt & Cost of Equity
- Keywords: cost of capital [MEDIUM/3]

**/business/saas-unit-metrics — SaaS Unit Metrics Calculator**
- Title: SaaS Unit Metrics Calculator: Monthly Recurring, Number
- Keywords: saas metrics [MEDIUM/3] · ARPU [MEDIUM/3] · LTV [MEDIUM/3] · CAC [MEDIUM/3] · unit economics [MEDIUM/3]

**/business/break-even-point — Break-Even Point Calculator**
- Title: Break-Even Point Calculator: Fixed Costs, Selling Price
- Keywords: break even point calculator with fixed costs [EASY/2] · break even point [MEDIUM/3]

**/business/invoice-due-date — Invoice Due Date & Late Fee**
- Title: Invoice Due Date & Late Fee: Invoice Amount, Days Late
- Keywords: invoice due date [MEDIUM/4]

**/business/employee-cost — True Employee Cost**
- Title: True Employee Cost: Annual Salary, Benefits & Overhead
- Keywords: cost of hire [MEDIUM/3]

**/business/markup-margin — Markup vs Margin**
- Title: Markup vs Margin: Cost & Selling Price
- Keywords: markup margin calculator conversion pricing [MEDIUM/3]

**/business/working-capital — Working Capital Calculator**
- Title: Working Capital Calculator: Current Assets
- Keywords: working capital calculator current ratio liquidity [MEDIUM/3]

**/business/cash-flow-statement — Cash Flow Statement Calculator**
- Title: Cash Flow Statement Calculator: Operating CF, Investing
- Keywords: cash flow calculator net operating investing financing [MEDIUM/3]

**/business/revenue-per-employee — Revenue per Employee**
- Title: Revenue per Employee: Annual Revenue & Employees
- Keywords: revenue per employee calculator productivity [EASY/2]

**/business/cac-payback — CAC Payback Period**
- Title: CAC Payback Period: Customer Acquisition & Gross Margin per
- Keywords: cac payback period calculator months customer acquisition [MEDIUM/3]

**/business/business-valuation — Business Valuation (Revenue Multiple)**
- Title: Business Valuation (Revenue Multiple): Annual
- Keywords: business valuation calculator revenue multiple ebitda [MEDIUM/3]

**/business/gross-margin — Gross Margin Calculator**
- Title: Gross Margin Calculator: Revenue & COGS
- Keywords: gross margin calculator gross profit percentage [EASY/2]

**/business/goal-seek-price — Target Price from Margin**
- Title: Target Price from Margin: Cost & Target Margin
- Keywords: target price calculator margin cost pricing [MEDIUM/3]

**/business/subscription-ltv — Subscription LTV Calculator**
- Title: Subscription LTV Calculator: Monthly Revenue per
- Keywords: subscription ltv calculator lifetime value churn [MEDIUM/3]

**/business/cash-conversion-cycle — Cash Conversion Cycle Calculator**
- Title: Cash Conversion Cycle Calculator: Days Inventory
- Keywords: cash conversion cycle calculator dio dso dpo [MEDIUM/3]

**/business/market-share — Market Share Calculator**
- Title: Market Share Calculator: Your Revenue & Total Market Revenue
- Keywords: market share calculator percentage revenue [EASY/2]

**/business/aov — Average Order Value Calculator**
- Title: Average Order Value Calculator: Total Revenue & Orders
- Keywords: average order value calculator aov ecommerce [MEDIUM/3]

**/business/customer-ltv — Customer Lifetime Value Calculator**
- Title: Customer Lifetime Value Calculator: Monthly Revenue
- Keywords: customer lifetime value calculator ltv arpu churn margin saas [MEDIUM/3]

**/business/csat-score — CSAT Score Calculator**
- Title: CSAT Score Calculator: Satisfied Responses & Total Responses
- Keywords: csat calculator customer satisfaction score survey percent [MEDIUM/3]

**/business/conversion-funnel — Conversion Funnel Calculator**
- Title: Conversion Funnel Calculator: Visitors, Added to Cart
- Keywords: conversion funnel calculator step rate drop off marketing [EASY/2]

**/business/ab-test-significance — A/B Test Significance Calculator**
- Title: A/B Test Significance Calculator: Variant A
- Keywords: ab test significance calculator z score conversion split test [MEDIUM/3]

**/business/project-bid — Project Bid Calculator**
- Title: Project Bid Calculator: Direct Cost, Contingency
- Keywords: project bid calculator price margin contingency contractor estimate [MEDIUM/3]

**/business/retainer-value — Retainer Value Calculator**
- Title: Retainer Value Calculator: Monthly Fee, Term
- Keywords: retainer value calculator monthly contract discount annual [EASY/2]

## 5.3 Career & Freelance Calculators — `career/` (39 tools)

**/career/salary-converter — Salary Converter**
- Title: Salary Converter: Amount
- Keywords: hourly to annual [MEDIUM/3]

**/career/salary-negotiation — Salary Negotiation Calculator**
- Title: Salary Negotiation Calculator: Offered, Asking & Years
- Keywords: salary negotiation calculator [MEDIUM/4]

**/career/raise-calculator — Pay Raise Calculator**
- Title: Pay Raise Calculator: Current Salary & Raise %
- Keywords: pay raise calculator [MEDIUM/3]

**/career/tax-bracket — Income Tax Bracket Calculator**
- Title: Income Tax Bracket Calculator: Annual Income & Deductions
- Keywords: tax bracket calculator [MEDIUM/4]

**/career/freelance-hourly-rate — Freelance Hourly Rate**
- Title: Freelance Hourly Rate: Desired Annual
- Keywords: freelance hourly rate [MEDIUM/3]

**/career/freelance-project — Freelance Project Fee**
- Title: Freelance Project Fee: Estimated Hours, Hourly Rate
- Keywords: freelance project fee [MEDIUM/3]

**/career/contractor-rate — Contractor vs Employee Rate**
- Title: Contractor vs Employee Rate: Employee Salary & Benefits %
- Keywords: contractor vs employee [MEDIUM/3]

**/career/overtime-pay — Overtime Pay Calculator**
- Title: Overtime Pay Calculator: Hourly Rate, Regular Hours/Week
- Keywords: overtime pay calculator [MEDIUM/3]

**/career/bonus-calc — Bonus & Commission Calculator**
- Title: Bonus & Commission Calculator: Base Salary, Bonus %
- Keywords: bonus commission calculator [MEDIUM/3]

**/career/pay-gap — Gender Pay Gap Calculator**
- Title: Gender Pay Gap Calculator: Person A Salary & Person B Salary
- Keywords: pay gap calculator [MEDIUM/3]

**/career/401k-match — 401k Match Calculator**
- Title: 401k Match Calculator: Salary, Your Contribution %
- Keywords: 401k match calculator [MEDIUM/3]

**/career/stock-options — Stock Options Value Calculator**
- Title: Stock Options Value Calculator: Number of Options
- Keywords: stock options calculator [MEDIUM/3]

**/career/side-hustle — Side Hustle Income Calculator**
- Title: Side Hustle Income Calculator: Hours/Week, Rate
- Keywords: side hustle calculator [MEDIUM/3]

**/career/crypto-tax — Cryptocurrency Tax Calculator**
- Title: Cryptocurrency Tax Calculator: Buy Price, Sell Price
- Keywords: crypto tax calculator [MEDIUM/4]

**/career/career-gap — Career Gap Impact Calculator**
- Title: Career Gap Impact Calculator: Current Salary, Gap
- Keywords: career gap calculator [MEDIUM/3]

**/career/remortgage-calc — Remortgage Savings Calculator**
- Title: Remortgage Savings Calculator: Balance, Current Rate %
- Keywords: remortgage savings calculator [MEDIUM/3]

**/career/mortgage-afford — Mortgage Affordability Checker**
- Title: Mortgage Affordability Checker: Annual Income, Deposit
- Keywords: mortgage affordability checker calculator [MEDIUM/4]

**/career/tax-refund — Tax Refund Estimator**
- Title: Tax Refund Estimator: Annual Income, Tax Withheld
- Keywords: tax refund estimator [MEDIUM/4]

**/career/invoicing-calc — Invoice Total Calculator**
- Title: Invoice Total Calculator: Subtotal, Tax Rate % & Discount %
- Keywords: invoice total calculator [MEDIUM/3]

**/career/employment-status — Self-Employed Tax Calculator**
- Title: Self-Employed Tax Calculator: Net Income & Business Expenses
- Keywords: self employed tax [MEDIUM/4]

**/career/commission-plan — Sales Commission Calculator**
- Title: Sales Commission Calculator: Total Sales, Base Rate %
- Keywords: sales commission calculator [MEDIUM/3]

**/career/freelance-budget — Freelance Monthly Budget**
- Title: Freelance Monthly Budget: Monthly Income, Tax Rate %
- Keywords: freelance budget planner [MEDIUM/3]

**/career/redundancy-pay — Redundancy Pay Calculator**
- Title: Redundancy Pay Calculator: Age, Full Years Worked
- Keywords: redundancy pay calculator [MEDIUM/3]

**/career/self-employment-tax — Self-Employment Tax**
- Title: Self-Employment Tax: Net Self-Employment & Other W-2 Income
- Keywords: self employment tax calculator freelancer 15.3 percent [MEDIUM/4]

**/career/freelance-daily — Freelance Daily Rate**
- Title: Freelance Daily Rate: Salary, Benefits %
- Keywords: freelance daily rate calculator contract equivalent salary [EASY/2]

**/career/monthly-goal — Freelance Monthly Goal**
- Title: Freelance Monthly Goal: Monthly Income Goal, Hourly Rate
- Keywords: freelance monthly goal calculator billable hours target [EASY/2]

**/career/retirement-contrib — Retirement Contribution Impact**
- Title: Retirement Contribution Impact: Annual Salary
- Keywords: retirement contribution calculator 401k impact take home [MEDIUM/4]

**/career/benefits-value — Benefits Package Value**
- Title: Benefits Package Value: Base Salary, Insurance Premium
- Keywords: benefits value calculator package compensation insurance [MEDIUM/3]

**/career/pto-calc — PTO Accrual Calculator**
- Title: PTO Accrual Calculator: PTO Days per Year, Days Accrued
- Keywords: pto calculator accrual paid time off hours days [EASY/2]

**/career/job-offer-compare — Job Offer Comparison**
- Title: Job Offer Comparison: Offer A Salary, Offer A Bonus %
- Keywords: job offer compare calculator total compensation two [MEDIUM/3]

**/career/cost-living-adjustment — Cost of Living Adjustment**
- Title: Cost of Living Adjustment: Current Salary, Current
- Keywords: cost of living calculator salary adjustment city compare [MEDIUM/4]

**/career/severance-calc — Severance Calculator**
- Title: Severance Calculator: Annual Salary, Years of Service
- Keywords: severance calculator pay weeks years service [MEDIUM/3]

**/career/side-hustle-profit — Side Hustle Profit**
- Title: Side Hustle Profit: Monthly Revenue, Monthly Expenses
- Keywords: side hustle profit calculator hourly true cost [MEDIUM/3]

**/career/salary-raise-worth — Salary Raise Worth**
- Title: Salary Raise Worth: Current Salary, Raise % & Years
- Keywords: salary raise calculator net worth 5 years [MEDIUM/4]

**/career/wfh-savings — Work-from-Home Savings Calculator**
- Title: Work-from-Home Savings Calculator: Round-Trip Commute
- Keywords: work from home savings calculator commute remote [EASY/2]

**/career/stock-vesting — Stock Vesting Calculator**
- Title: Stock Vesting Calculator: Shares Granted, Vesting Period
- Keywords: stock vesting calculator schedule cliff shares [EASY/2]

**/career/vacation-days — Vacation Accrual Calculator**
- Title: Vacation Accrual Calculator: Annual PTO Days & Months Worked
- Keywords: vacation accrual calculator pto days earned months worked [MEDIUM/3]

**/career/timesheet-hours — Timesheet Decimal Converter**
- Title: Timesheet Decimal Converter: Time entries
- Keywords: timesheet decimal hours calculator hh mm payroll convert [EASY/2]

**/career/shift-differential — Shift Differential Calculator**
- Title: Shift Differential Calculator: Base Rate, Differential
- Keywords: shift differential calculator night shift premium weekend pay [MEDIUM/3]

## 5.4 Construction Calculators — `construction/` (53 tools)

**/construction/concrete-slab — Concrete Slab Calculator**
- Title: Concrete Slab Calculator: Length, Width & Thickness
- Keywords: concrete volume calculator in cubic yards [EASY/2] · how many bags of concrete do i need calculator [EASY/2]

**/construction/wall-area — Wall Area Calculator**
- Title: Wall Area Calculator: Length, Height & Doors Area
- Keywords: wall area calculator [MEDIUM/3]

**/construction/roofing — Roofing Calculator**
- Title: Roofing Calculator: Roof Length, Roof Width & Pitch
- Keywords: roofing calculator shingles area [MEDIUM/3]

**/construction/drywall — Drywall Calculator**
- Title: Drywall Calculator: Wall Area & Sheet Size
- Keywords: free drywall calculator [MEDIUM/3]

**/construction/flooring — Flooring Calculator**
- Title: Flooring Calculator: Floor Area & Waste Factor
- Keywords: free flooring calculator [MEDIUM/3]

**/construction/gravel — Gravel Calculator**
- Title: Gravel Calculator: Length, Width & Depth
- Keywords: free gravel calculator [MEDIUM/4]

**/construction/insulation — Insulation Calculator**
- Title: Insulation Calculator: Area, Desired R-Value
- Keywords: free insulation calculator [MEDIUM/3]

**/construction/stairs — Stair Calculator**
- Title: Stair Calculator: Total Height & Desired Riser Height
- Keywords: free stair calculator [MEDIUM/3]

**/construction/wallpaper — Wallpaper Calculator**
- Title: Wallpaper Calculator: Wall Area & Roll Coverage
- Keywords: free wallpaper calculator [MEDIUM/3]

**/construction/carpet — Carpet Calculator**
- Title: Carpet Calculator: Room Length & Room Width
- Keywords: free carpet calculator [MEDIUM/3]

**/construction/mulch — Mulch Calculator**
- Title: Mulch Calculator: Area & Depth
- Keywords: free mulch calculator [MEDIUM/3]

**/construction/soil — Soil Calculator**
- Title: Soil Calculator: Length, Width & Depth
- Keywords: free soil calculator [MEDIUM/3]

**/construction/bricks — Brick Calculator**
- Title: Brick Calculator: Wall Area & Brick Face Area
- Keywords: brick quantity calculator for wall construction [EASY/2]

**/construction/fence — Fence Calculator**
- Title: Fence Calculator: Fence Length & Post Spacing
- Keywords: free fence calculator [MEDIUM/3]

**/construction/excavation — Excavation Calculator**
- Title: Excavation Calculator: Length, Width & Depth
- Keywords: free excavation calculator [MEDIUM/3]

**/construction/tile-calculator — Tile Calculator**
- Title: Tile Calculator: Area Length, Area Width & Tile Size
- Keywords: free tile calculator [MEDIUM/3]

**/construction/paint-quantity — Paint Quantity Calculator**
- Title: Paint Quantity Calculator: Total Wall Area, Coats & Coverage
- Keywords: paint calculator for room walls [EASY/2] · litres of paint [MEDIUM/3]

**/construction/rebar-calculator — Rebar Calculator**
- Title: Rebar Calculator: Total Length & Bar Diameter
- Keywords: free rebar calculator [MEDIUM/3]

**/construction/formwork — Formwork Area Calculator**
- Title: Formwork Area Calculator: Length, Height & Exposed Faces
- Keywords: formwork area calculator [MEDIUM/3]

**/construction/concrete-column — Concrete Column Calculator**
- Title: Concrete Column Calculator: Column Height, Width & Depth
- Keywords: concrete column calculator circular [MEDIUM/4]

**/construction/lumber-calculator — Lumber Calculator (Board Feet)**
- Title: Lumber Calculator (Board Feet): Number of Pieces, Length
- Keywords: lumber calculator calculator [MEDIUM/3]

**/construction/paver-calculator — Paver Calculator**
- Title: Paver Calculator: Area, Paver Length & Paver Width
- Keywords: free paver calculator [MEDIUM/3]

**/construction/water-tank — Water Tank Capacity**
- Title: Water Tank Capacity: Length, Width & Height
- Keywords: water tank capacity [MEDIUM/3]

**/construction/roof-pitch — Roof Pitch Calculator**
- Title: Roof Pitch Calculator: Rise & Run
- Keywords: roof pitch calculator with slope [EASY/2]

**/construction/deck-calculator — Deck Board Calculator**
- Title: Deck Board Calculator: Deck Length, Deck Width & Board Width
- Keywords: deck board calculator [MEDIUM/3]

**/construction/concrete-bags — Concrete Bag Calculator**
- Title: Concrete Bag Calculator: Length, Width & Depth
- Keywords: concrete bag calculator cement bags volume [MEDIUM/4]

**/construction/block-wall — Concrete Block Wall**
- Title: Concrete Block Wall: Wall Length & Wall Height
- Keywords: block wall calculator concrete blocks cmu [MEDIUM/4]

**/construction/rebar-calc — Rebar Layout Calculator**
- Title: Rebar Layout Calculator: Slab Length, Slab Width & Spacing
- Keywords: rebar calculator spacing length steel [MEDIUM/3]

**/construction/footing-size — Footing Size Calculator**
- Title: Footing Size Calculator: Column Load & Soil Bearing
- Keywords: footing size calculator foundation load bearing [MEDIUM/3]

**/construction/gravel-tonnage — Gravel Tonnage Calculator**
- Title: Gravel Tonnage Calculator: Weight From Area
- Keywords: gravel tonnage calculator weight tons [EASY/2]

**/construction/asphalt-quantity — Asphalt Quantity Calculator**
- Title: Asphalt Quantity Calculator: Length, Width & Thickness
- Keywords: asphalt quantity calculator tons paving [EASY/2]

**/construction/mortar-mix — Mortar Mix Calculator**
- Title: Mortar Mix Calculator: Mortar Volume
- Keywords: mortar mix calculator cement sand ratio [MEDIUM/3]

**/construction/drywall-screws — Drywall Screw Count**
- Title: Drywall Screw Count: Drywall Sheets
- Keywords: drywall screw calculator count per sheet [EASY/2]

**/construction/pipe-volume — Pipe Volume Calculator**
- Title: Pipe Volume Calculator: Inner Diameter & Length
- Keywords: pipe volume calculator gallons liters [MEDIUM/3]

**/construction/retaining-wall — Retaining Wall Blocks**
- Title: Retaining Wall Blocks: Wall Length, Wall Height
- Keywords: retaining wall calculator blocks [MEDIUM/3]

**/construction/scaffolding — Scaffolding Estimate**
- Title: Scaffolding Estimate: Wall Length & Wall Height
- Keywords: scaffolding calculator sections estimate [MEDIUM/3]

**/construction/crown-molding — Crown Molding Length**
- Title: Crown Molding Length: Room Length, Room Width & Waste %
- Keywords: crown molding calculator linear feet perimeter [EASY/2]

**/construction/septic-size — Septic Tank Size**
- Title: Septic Tank Size: Bedrooms & Occupants
- Keywords: septic tank size calculator bedrooms gallons [MEDIUM/3]

**/construction/plaster — Plaster Quantity Calculator**
- Title: Plaster Quantity Calculator: Wall Area & Thickness
- Keywords: plaster calculator cement sand quantity wall [MEDIUM/3]

**/construction/gutter — Gutter Length Calculator**
- Title: Gutter Length Calculator: Roof Perimeter, Section Length
- Keywords: gutter calculator length sections downspout [MEDIUM/3]

**/construction/sod — Sod Calculator**
- Title: Sod Calculator: Lawn Area, Roll Coverage & Waste
- Keywords: sod calculator lawn turf rolls area [MEDIUM/3]

**/construction/ceiling-tile — Ceiling Tile Calculator**
- Title: Ceiling Tile Calculator: Room Length, Room Width & Waste
- Keywords: ceiling tile calculator drop ceiling grid tiles [MEDIUM/3]

**/construction/stair-stringer — Stair Stringer Calculator**
- Title: Stair Stringer Calculator: Total Rise, Number of Risers
- Keywords: stair stringer calculator riser height tread depth total rise run building code [MEDIUM/3]

**/construction/siding-squares — Siding Squares Calculator**
- Title: Siding Squares Calculator: Wall Length, Wall Height
- Keywords: siding squares calculator vinyl wall area waste factor material estimate [MEDIUM/3]

**/construction/soffit-area — Soffit Area Calculator**
- Title: Soffit Area Calculator: Building Length, Building Width
- Keywords: soffit area calculator overhang eave vented panels attic ventilation [MEDIUM/3]

**/construction/post-hole-concrete — Post Hole Concrete Calculator**
- Title: Post Hole Concrete Calculator: Number of Holes
- Keywords: post hole concrete calculator fence posts bags cubic yards volume [EASY/2]

**/construction/fence-panel — Fence Panel Calculator**
- Title: Fence Panel Calculator: Fence Length & Panel Width
- Keywords: fence panel calculator posts pickets linear feet panel spacing [EASY/2]

**/construction/gravel-driveway — Gravel Driveway Calculator**
- Title: Gravel Driveway Calculator: Volume & Tons Needed
- Keywords: gravel driveway calculator tons cubic yards depth crushed stone coverage [EASY/2]

**/construction/insulation-batts — Insulation Coverage Calculator**
- Title: Insulation Coverage Calculator: Area to Insulate
- Keywords: insulation coverage calculator batts rolls r value sq ft bags attic wall [MEDIUM/3]

**/construction/rafter-length — Rafter Length Calculator**
- Title: Rafter Length Calculator: Horizontal Run & Rise
- Keywords: rafter length calculator roof pitch run rise framing [MEDIUM/3]

**/construction/shingle-squares — Shingle Squares Calculator**
- Title: Shingle Squares Calculator: Roof Area & Waste Factor
- Keywords: shingle squares calculator roofing bundles waste factor [MEDIUM/3]

**/construction/drywall-sheets — Drywall Sheets Calculator**
- Title: Drywall Sheets Calculator: Wall Area, Sheet Size
- Keywords: drywall sheets calculator wall area 4x8 boards waste [MEDIUM/3]

**/construction/tile-boxes — Tile Boxes Calculator**
- Title: Tile Boxes Calculator: Floor Area, Coverage per Box
- Keywords: tile boxes calculator floor area coverage breakage waste [MEDIUM/3]

## 5.5 Unit Conversion Calculators — `conversion/` (36 tools)

**/conversion/length — Length Converter**
- Title: Length Converter: Value
- Keywords: meters to feet and inches converter [EASY/2]

**/conversion/weight — Weight Converter**
- Title: Weight Converter: Value
- Keywords: kg to lbs weight converter calculator [EASY/2]

**/conversion/volume — Volume Converter**
- Title: Volume Converter: Value
- Keywords: volume converter calculator [MEDIUM/3]

**/conversion/area — Area Converter**
- Title: Area Converter: Value
- Keywords: area converter calculator [MEDIUM/3]

**/conversion/speed — Speed Converter**
- Title: Speed Converter: Value
- Keywords: speed converter calculator [MEDIUM/3]

**/conversion/data-storage — Data Storage Converter**
- Title: Data Storage Converter: Value
- Keywords: gb to mb data storage conversion calculator [MEDIUM/3]

**/conversion/angle — Angle Converter**
- Title: Angle Converter: Value
- Keywords: angle converter calculator [MEDIUM/3]

**/conversion/energy — Energy Converter**
- Title: Energy Converter: Value
- Keywords: energy converter calculator [MEDIUM/3]

**/conversion/pressure-conv — Pressure Converter**
- Title: Pressure Converter: Value
- Keywords: pascal bar psi [MEDIUM/3]

**/conversion/frequency-conv — Frequency Converter**
- Title: Frequency Converter: Hz, kHz, MHz & More Units
- Keywords: frequency converter calculator [MEDIUM/3]

**/conversion/temperature — Temperature Converter**
- Title: Temperature Converter: Temperature Value
- Keywords: temperature converter [MEDIUM/3] · celsius to fahrenheit [MEDIUM/3] · temp conversion [MEDIUM/3] · kelvin [MEDIUM/3]

**/conversion/time-conv — Time Converter**
- Title: Time Converter: Value
- Keywords: hours minutes seconds [MEDIUM/3]

**/conversion/force-conv — Force Converter**
- Title: Force Converter: Value
- Keywords: force converter calculator [MEDIUM/3]

**/conversion/fuel-efficiency-converter — Fuel Efficiency Converter**
- Title: Fuel Efficiency Converter: Value
- Keywords: fuel efficiency converter [MEDIUM/3]

**/conversion/cooking-conv — Cooking Measurement Converter**
- Title: Cooking Measurement Converter: Amount
- Keywords: cups to ml [MEDIUM/3] · tbsp to tsp [MEDIUM/3]

**/conversion/clothing-size — Clothing Size Converter**
- Title: Clothing Size Converter: US Size
- Keywords: clothing size converter [MEDIUM/3] · US to EU [MEDIUM/3]

**/conversion/shoe-size — Shoe Size Converter**
- Title: Shoe Size Converter: US Shoe Size
- Keywords: shoe size converter [MEDIUM/3] · US to EU shoe [MEDIUM/3]

**/conversion/currency-conv — Currency Converter (Fixed Rate)**
- Title: Currency Converter (Fixed Rate): Amount
- Keywords: currency converter with historical rates [EASY/2] · currency converter fixed rates [MEDIUM/3]

**/conversion/torque-conv — Torque Converter**
- Title: Torque Converter: Torque Value
- Keywords: Nm to lb-ft [MEDIUM/3]

**/conversion/power-conv — Power Converter**
- Title: Power Converter: Power Value
- Keywords: watts to horsepower [MEDIUM/3]

**/conversion/voltage-conv — Electrical Unit Converter**
- Title: Electrical Unit Converter: Value
- Keywords: volts amps watts [MEDIUM/3]

**/conversion/radiation-conv — Radiation Converter**
- Title: Radiation Converter: Value
- Keywords: radiation converter calculator [MEDIUM/3]

**/conversion/density-conv — Density Converter**
- Title: Density Converter: Density Value
- Keywords: kg/m3 to g/cm3 [EASY/2]

**/conversion/viscosity-conv — Viscosity Converter**
- Title: Viscosity Converter: Viscosity Units
- Keywords: viscosity converter calculator [MEDIUM/3]

**/conversion/bit-rate-conv — Bit Rate Converter**
- Title: Bit Rate Converter: Value
- Keywords: bit rate converter mbps gbps kbps calculator [MEDIUM/3]

**/conversion/luminance-conv — Luminance Converter**
- Title: Luminance Converter: Value
- Keywords: luminance converter lux foot candles nits [MEDIUM/3]

**/conversion/molarity-conv — Molarity Converter**
- Title: Molarity Converter: Value
- Keywords: molarity converter molar millimolar nanomolar [MEDIUM/3]

**/conversion/flow-rate-conv — Flow Rate Converter**
- Title: Flow Rate Converter: Value
- Keywords: flow rate converter liters per second gpm [EASY/2]

**/conversion/paper-size-conv — Paper Size Converter**
- Title: Paper Size Converter: Number
- Keywords: paper size converter a4 a5 b5 dimensions [MEDIUM/3]

**/conversion/fraction-percent — Fraction ↔ Percent ↔ Decimal**
- Title: Fraction ↔ Percent ↔ Decimal: Numerator & Denominator
- Keywords: fraction to percent decimal converter calculator [MEDIUM/3]

**/conversion/roman-numeral — Roman Numeral Converter**
- Title: Roman Numeral Converter: Value
- Keywords: roman numeral converter calculator [MEDIUM/3]

**/conversion/ppm-conv — PPM / Concentration Converter**
- Title: PPM / Concentration Converter: Value
- Keywords: ppm converter ppb percent concentration calculator [MEDIUM/3]

**/conversion/thermal-conductivity — Thermal Conductivity Converter**
- Title: Thermal Conductivity Converter: Value
- Keywords: thermal conductivity converter watts meter kelvin btu [MEDIUM/3]

**/conversion/radiation-dose-conv — Radiation Dose Converter**
- Title: Radiation Dose Converter: Value
- Keywords: radiation dose converter gray sievert rad rem [MEDIUM/3]

**/conversion/wire-gauge-conv — Wire Gauge (AWG) Converter**
- Title: Wire Gauge (AWG) Converter: Mm And Mm
- Keywords: awg to mm converter wire gauge diameter area [MEDIUM/3]

**/conversion/acceleration-conv — Acceleration Converter**
- Title: Acceleration Converter: Value
- Keywords: acceleration converter m/s2 g force ft/s2 [MEDIUM/3]

## 5.6 Education Calculators — `education/` (38 tools)

**/education/gpa — GPA Calculator**
- Title: GPA Calculator: Grades
- Keywords: grade point average [MEDIUM/4]

**/education/cgpa — CGPA Calculator**
- Title: CGPA Calculator: Semester GPAs
- Keywords: cgpa to percentage conversion calculator [EASY/2]

**/education/grade — Grade Calculator**
- Title: Grade Calculator: Current Grade, Final Exam Weight
- Keywords: final grade calculator with weightage [EASY/2]

**/education/study-time — Study Time Planner**
- Title: Study Time Planner: Total Study Hours Needed
- Keywords: study time planner calculator [MEDIUM/3]

**/education/reading-speed — Reading Speed Calculator**
- Title: Reading Speed Calculator: Words Read & Time
- Keywords: words per minute [MEDIUM/3]

**/education/test-score — Test Score Calculator**
- Title: Test Score Calculator: Correct Answers & Total Questions
- Keywords: test score calculator [MEDIUM/3]

**/education/exam-countdown — Exam Countdown**
- Title: Exam Countdown: Exam Date
- Keywords: days until exam [MEDIUM/3]

**/education/words-pages — Words to Pages**
- Title: Words to Pages: Word Count
- Keywords: words to pages [MEDIUM/3]

**/education/citation — Citation Generator**
- Title: Citation Generator: Author, Title & Year
- Keywords: citation generator calculator [MEDIUM/3]

**/education/quiz-score — Quiz Score Predictor**
- Title: Quiz Score Predictor: Hours Studied & Past Average
- Keywords: quiz score predictor [MEDIUM/3]

**/education/semester-gpa — Semester GPA Projector**
- Title: Semester GPA Projector: Course 1 Credits, Course 1 Grade
- Keywords: gpa calculator semester with credit hours [EASY/2] · semester gpa projector [MEDIUM/4]

**/education/college-cost-planner — College Cost Planner**
- Title: College Cost Planner: Annual Tuition, Room & Board
- Keywords: college cost planner [MEDIUM/3]

**/education/scholarship-calc — Scholarship Need Calculator**
- Title: Scholarship Need Calculator: Current GPA, Family Income
- Keywords: scholarship need calculator [MEDIUM/3]

**/education/study-break — Study Break Timer**
- Title: Study Break Timer: Total Study Hours
- Keywords: study break timer [MEDIUM/3]

**/education/grade-needed — Final Grade Needed (Weighted)**
- Title: Final Grade Needed (Weighted): Current Grade
- Keywords: final grade needed weighted [EASY/2]

**/education/class-rank — Class Rank Calculator**
- Title: Class Rank Calculator: Your GPA, Class Avg GPA & Class Size
- Keywords: class rank calculator [MEDIUM/3]

**/education/homework-time — Homework Time Estimator**
- Title: Homework Time Estimator: Pages to Read, Problems to Solve
- Keywords: homework time estimator [MEDIUM/3]

**/education/flashcard-count — Flashcard Review Planner**
- Title: Flashcard Review Planner: Total Flashcards, Days Until
- Keywords: flashcard review planner [MEDIUM/3]

**/education/plagiarism-check — Citation Checker**
- Title: Citation Checker: Paper Word Count & Number of Citations
- Keywords: citation checker calculator [MEDIUM/3]

**/education/letter-grade — Letter Grade Converter**
- Title: Letter Grade Converter: Percentage Score
- Keywords: letter grade converter [MEDIUM/4]

**/education/sat-score — SAT Score Estimator**
- Title: SAT Score Estimator: Math Section & Reading & Writing
- Keywords: sat score estimator [MEDIUM/3]

**/education/act-score — ACT Score Calculator**
- Title: ACT Score Calculator: English, Math & Reading
- Keywords: act score calculator [MEDIUM/3]

**/education/exam-score-needed — Final Exam Score Calculator**
- Title: Final Exam Score Calculator: Current Grade, Final
- Keywords: final exam score needed [MEDIUM/3]

**/education/attendance-rate — Attendance Rate Calculator**
- Title: Attendance Rate Calculator: Classes Attended & Total Classes
- Keywords: attendance calculator percentage classes required [EASY/2]

**/education/study-hours — Study Hours Planner**
- Title: Study Hours Planner: Credit Hours
- Keywords: study hours calculator per credit course [EASY/2]

**/education/tuition-cost — Tuition Cost Calculator**
- Title: Tuition Cost Calculator: Cost per Credit, Total Credits
- Keywords: tuition cost calculator degree total fees [MEDIUM/3]

**/education/gpa-target — GPA Target Calculator**
- Title: GPA Target Calculator: Current GPA, Credits Completed
- Keywords: gpa target calculator semester needed cumulative [EASY/2]

**/education/reading-time — Reading Time Calculator**
- Title: Reading Time Calculator: Word Count
- Keywords: reading time calculator words per minute minutes [EASY/2]

**/education/presentation-time — Presentation Time Calculator**
- Title: Presentation Time Calculator: Number of Slides
- Keywords: presentation time calculator slides speaking minutes [EASY/2]

**/education/test-average — Test Score Average**
- Title: Test Score Average: Scores
- Keywords: test average calculator scores mean [MEDIUM/3]

**/education/grade-percentage — Grade Percentage Calculator**
- Title: Grade Percentage Calculator: Points Earned & Total Points
- Keywords: grade percentage calculator score letter grade [EASY/2]

**/education/graduation-date — Graduation Date Calculator**
- Title: Graduation Date Calculator: Credits Remaining & Credits
- Keywords: graduation date calculator credits remaining [MEDIUM/4]

**/education/course-load — Course Load Calculator**
- Title: Course Load Calculator: Credits, Hard Courses & Easy Courses
- Keywords: course load calculator credits workload semester [EASY/2]

**/education/financial-need — Financial Need Calculator**
- Title: Financial Need Calculator: Cost of Attendance
- Keywords: scholarship need calculator financial aid EFC [MEDIUM/3]

**/education/percentile-rank — Percentile Rank Calculator**
- Title: Percentile Rank Calculator: Scores & Score to Rank
- Keywords: percentile rank calculator score dataset class [MEDIUM/3]

**/education/act-sat-compare — ACT to SAT Converter**
- Title: ACT to SAT Converter: ACT Composite Score
- Keywords: act sat concordance converter score [MEDIUM/3]

**/education/assignment-split — Grade Weighting Calculator**
- Title: Grade Weighting Calculator: Current Score & Component Weight
- Keywords: grade weighting calculator current grade needed final exam [MEDIUM/4]

**/education/citation-count — H-Index Calculator**
- Title: H-Index Calculator: Citations per paper
- Keywords: h index calculator citations researcher impact publication [MEDIUM/3]

## 5.7 Engineering Calculators — `engineering/` (65 tools)

**/engineering/voltage-drop — Voltage Drop Calculator**
- Title: Voltage Drop Calculator: Current, Cable Length & Resistance
- Keywords: voltage drop calculator [MEDIUM/3]

**/engineering/power-factor — Power Factor Calculator**
- Title: Power Factor Calculator: Real Power & Apparent Power
- Keywords: power factor calculator [MEDIUM/3]

**/engineering/gear-ratio — Gear Ratio Calculator**
- Title: Gear Ratio Calculator: Driver Teeth & Driven Teeth
- Keywords: gear ratio calculator [MEDIUM/3]

**/engineering/torque — Torque Calculator**
- Title: Torque Calculator: Force, Radius & Angle
- Keywords: free torque calculator [MEDIUM/3]

**/engineering/led-resistor — LED Resistor Calculator**
- Title: LED Resistor Calculator: Supply Voltage, LED Voltage
- Keywords: led resistor calculator [MEDIUM/3]

**/engineering/capacitor — Capacitor Calculator**
- Title: Capacitor Calculator: Charge & Voltage
- Keywords: free capacitor calculator [MEDIUM/3]

**/engineering/battery-life — Battery Life Calculator**
- Title: Battery Life Calculator: Battery Capacity & Consumption
- Keywords: battery life calculator [MEDIUM/3]

**/engineering/wire-gauge — Wire Gauge Calculator**
- Title: Wire Gauge Calculator: Current & Length
- Keywords: wire gauge calculator [MEDIUM/3]

**/engineering/rpm — RPM Calculator**
- Title: RPM Calculator: Frequency
- Keywords: free rpm calculator [MEDIUM/3]

**/engineering/horsepower — Horsepower Calculator**
- Title: Horsepower Calculator: Torque & RPM
- Keywords: free horsepower calculator [MEDIUM/3]

**/engineering/inductor — Inductor Calculator**
- Title: Inductor Calculator: Number of Turns, Cross-section Area
- Keywords: free inductor calculator [MEDIUM/3]

**/engineering/impedance — Impedance Calculator**
- Title: Impedance Calculator: Resistance & Reactance
- Keywords: free impedance calculator [MEDIUM/3]

**/engineering/beam-load — Beam Load Calculator**
- Title: Beam Load Calculator: Force, Beam Length & Moment of Inertia
- Keywords: beam deflection calculator with load [EASY/2]

**/engineering/hydraulic — Hydraulic Calculator**
- Title: Hydraulic Calculator: Force & Piston Area
- Keywords: free hydraulic calculator [MEDIUM/3]

**/engineering/thermal — Thermal Expansion**
- Title: Thermal Expansion: Initial Length, Expansion Coeff
- Keywords: thermal expansion calculator [MEDIUM/3]

**/engineering/kva-kw — kVA to kW Converter**
- Title: kVA to kW Converter: Apparent Power & Power Factor
- Keywords: kva to kw [MEDIUM/3]

**/engineering/belt-length — Belt Length Calculator**
- Title: Belt Length Calculator: Pulley 1 Diameter, Pulley
- Keywords: belt length calculator [MEDIUM/3]

**/engineering/flow-rate — Flow Rate Calculator**
- Title: Flow Rate Calculator: Pipe Diameter & Velocity
- Keywords: flow rate calculator [MEDIUM/3]

**/engineering/sound-level — Sound Level Addition**
- Title: Sound Level Addition: Combined
- Keywords: sound level addition calculator [MEDIUM/3]

**/engineering/shaft-power — Shaft Power Calculator**
- Title: Shaft Power Calculator: Torque & RPM
- Keywords: shaft power calculator [MEDIUM/3]

**/engineering/spring-rate — Spring Rate Calculator**
- Title: Spring Rate Calculator: Force & Deflection
- Keywords: spring rate calculator [MEDIUM/3]

**/engineering/resonant-frequency — Resonant Frequency Calculator**
- Title: Resonant Frequency Calculator: Inductance & Capacitance
- Keywords: resonant frequency calculator [MEDIUM/3]

**/engineering/transformer-ratio — Transformer Ratio Calculator**
- Title: Transformer Ratio Calculator: Primary Voltage
- Keywords: step up transformer [MEDIUM/3]

**/engineering/hydraulic-power — Hydraulic Power Calculator**
- Title: Hydraulic Power Calculator: Flow, Head & Efficiency
- Keywords: hydraulic power calculator [MEDIUM/3]

**/engineering/stress-strain — Stress & Strain Calculator**
- Title: Stress & Strain Calculator: Force, Cross-section Area
- Keywords: stress strain calculator youngs modulus [MEDIUM/3]

**/engineering/beam-deflection — Beam Deflection (Simply Supported)**
- Title: Beam Deflection (Simply Supported): Load, Length & EI
- Keywords: beam deflection calculator simply supported uniform load [MEDIUM/3]

**/engineering/column-buckling — Euler Buckling Load**
- Title: Euler Buckling Load: Young Modulus, Moment of Inertia
- Keywords: euler buckling load calculator column critical load [MEDIUM/3]

**/engineering/pipe-flow — Pipe Flow Rate (Darcy-Weisbach)**
- Title: Pipe Flow Rate (Darcy-Weisbach): Flow Rate, Pipe Diameter
- Keywords: pipe flow calculator darcy weisbach pressure drop [MEDIUM/3]

**/engineering/steel-weight — Steel Weight Calculator**
- Title: Steel Weight Calculator: Dimension 1, Dimension 2
- Keywords: steel weight calculator beam plate bar kg [EASY/2]

**/engineering/concrete-mix — Concrete Mix Design**
- Title: Concrete Mix Design: Volume
- Keywords: concrete mix calculator cement sand gravel ratio [MEDIUM/4]

**/engineering/structural-load — Structural Load Calculator**
- Title: Structural Load Calculator: Dead Load, Live Load & Wind Load
- Keywords: structural load calculator dead live wind LRFD [MEDIUM/3]

**/engineering/electrical-energy — Electrical Energy Cost**
- Title: Electrical Energy Cost: Appliance Wattage, Hours per Day
- Keywords: electricity cost calculator energy bill appliance [MEDIUM/3]

**/engineering/resistor-combination — Resistor Combination**
- Title: Resistor Combination: Series
- Keywords: resistor calculator series parallel combination [MEDIUM/3]

**/engineering/capacitor-energy — Capacitor Energy**
- Title: Capacitor Energy: Capacitance & Voltage
- Keywords: capacitor energy calculator farad voltage joules [MEDIUM/3]

**/engineering/inductor-energy — Inductor Energy**
- Title: Inductor Energy: Inductance & Current
- Keywords: inductor energy calculator henry current joules [MEDIUM/3]

**/engineering/rc-time-constant — RC Time Constant**
- Title: RC Time Constant: Resistance & Capacitance
- Keywords: rc time constant calculator capacitor [MEDIUM/3]

**/engineering/cable-sizing — Cable Sizing Calculator**
- Title: Cable Sizing Calculator: Current, Cable Length
- Keywords: cable sizing calculator wire ampacity voltage drop [MEDIUM/3]

**/engineering/ventilation-cfm — Ventilation CFM Calculator**
- Title: Ventilation CFM Calculator: Room Length, Room Width
- Keywords: ventilation calculator cfm air changes per hour [EASY/2]

**/engineering/torque-wrench — Torque Wrench Setting**
- Title: Torque Wrench Setting: Target Torque, Wrench Length
- Keywords: torque wrench calculator extension adapter setting [MEDIUM/3]

**/engineering/bearing-load — Bearing Load Rating**
- Title: Bearing Load Rating: Dynamic Load, Speed & Required Life
- Keywords: bearing calculator load rating life l10 hours [EASY/2]

**/engineering/engine-efficiency — Engine Efficiency Calculator**
- Title: Engine Efficiency Calculator: Power Output
- Keywords: engine efficiency calculator thermal efficiency bsfc [MEDIUM/3]

**/engineering/pump-power — Pump Power Calculator**
- Title: Pump Power Calculator: Flow Rate, Head & Pump Efficiency
- Keywords: pump power calculator hydraulic power motor size [MEDIUM/3]

**/engineering/tank-volume — Tank Volume Calculator**
- Title: Tank Volume Calculator: Radius or Width & Length or Height
- Keywords: tank volume calculator cylindrical rectangular water storage [MEDIUM/3]

**/engineering/heat-exchanger — Heat Exchanger (LMTD)**
- Title: Heat Exchanger (LMTD): Hot In, Hot Out & Cold In
- Keywords: heat exchanger calculator lmtd approach temperature [MEDIUM/3]

**/engineering/pcb-trace — PCB Trace Width Calculator**
- Title: PCB Trace Width Calculator: Current, Copper Thickness
- Keywords: pcb trace width calculator ipc-2221 current [MEDIUM/3]

**/engineering/bolt-torque — Bolt Torque Calculator**
- Title: Bolt Torque Calculator: Applied Torque, Bolt Diameter
- Keywords: bolt torque calculator clamping force preload [MEDIUM/3]

**/engineering/pulley — Pulley System Calculator**
- Title: Pulley System Calculator: Load, Supporting Ropes
- Keywords: pulley calculator mechanical advantage effort load [MEDIUM/3]

**/engineering/lever — Lever Calculator**
- Title: Lever Calculator: Load, Effort & Load Arm
- Keywords: lever calculator fulcrum effort load mechanical advantage [MEDIUM/3]

**/engineering/wind-load — Wind Load Calculator**
- Title: Wind Load Calculator: Wind Speed, Surface Area
- Keywords: wind load calculator pressure force velocity [MEDIUM/3]

**/engineering/duct-size — Duct Size Calculator**
- Title: Duct Size Calculator: Airflow & Target Velocity
- Keywords: duct size calculator cfm velocity diameter hvac [MEDIUM/3]

**/engineering/head-loss — Pipe Head Loss Calculator**
- Title: Pipe Head Loss Calculator: Friction Factor, Pipe Length
- Keywords: head loss calculator darcy weisbach pipe friction [MEDIUM/3]

**/engineering/breaker-size — Circuit Breaker Size Calculator**
- Title: Circuit Breaker Size Calculator: Continuous Load & Voltage
- Keywords: circuit breaker size calculator amps 125 percent [MEDIUM/3]

**/engineering/power-factor-correction — Power Factor Correction Calculator**
- Title: Power Factor Correction Calculator: Real Power, Current
- Keywords: power factor correction calculator kvar capacitor [MEDIUM/3]

**/engineering/section-modulus — Section Modulus Calculator**
- Title: Section Modulus Calculator: Width b & Height h / Diameter d
- Keywords: section modulus calculator beam bending rectangle circle elastic design [MEDIUM/3]

**/engineering/shaft-torsion — Shaft Torsion Stress Calculator**
- Title: Shaft Torsion Stress Calculator: Torque T & Shaft Diameter
- Keywords: shaft torsion calculator shear stress solid circular torque polar moment [MEDIUM/3]

**/engineering/pulley-speed — Pulley Speed Calculator**
- Title: Pulley Speed Calculator: Driver Diameter, Driver Speed
- Keywords: pulley speed calculator rpm diameter ratio belt drive driven sheave [MEDIUM/3]

**/engineering/manning-flow — Manning Flow Calculator**
- Title: Manning Flow Calculator: Pipe Diameter, Manning n & Slope S
- Keywords: manning equation calculator pipe flow discharge slope roughness gravity main [MEDIUM/4]

**/engineering/orifice-flow — Orifice Flow Calculator**
- Title: Orifice Flow Calculator: Discharge Coefficient Cd
- Keywords: orifice flow calculator discharge coefficient tank drainage torricelli head [MEDIUM/3]

**/engineering/three-phase-power — Three Phase Power Calculator**
- Title: Three Phase Power Calculator: Line Voltage, Line Current
- Keywords: three phase power calculator kw voltage current power factor apparent reactive [MEDIUM/3]

**/engineering/ups-sizing — UPS Battery Sizing Calculator**
- Title: UPS Battery Sizing Calculator: Load, Backup Time
- Keywords: ups battery sizing calculator ah runtime backup load inverter efficiency [MEDIUM/3]

**/engineering/hydraulic-press — Hydraulic Press Force Calculator**
- Title: Hydraulic Press Force Calculator: Input Force, Input
- Keywords: hydraulic press calculator force piston area pascal law [MEDIUM/3]

**/engineering/radiation-shielding — Radiation Shielding Calculator**
- Title: Radiation Shielding Calculator: Initial
- Keywords: radiation shielding calculator half value layer hvl attenuation gamma xray [MEDIUM/3]

**/engineering/steam-consumption — Steam Consumption Calculator**
- Title: Steam Consumption Calculator: Steam Flow & Latent Heat
- Keywords: steam consumption calculator latent heat boiler kg hour kw [EASY/2]

**/engineering/noise-level — Combined Noise Level Calculator**
- Title: Combined Noise Level Calculator: Source 1 & Source 2
- Keywords: combined noise level calculator decibel db addition sound sources [MEDIUM/3]

**/engineering/rcf-gforce — RCF (G-Force) Calculator**
- Title: RCF (G-Force) Calculator: Rotor Speed & Rotor Radius
- Keywords: rcf calculator g force centrifuge rpm rotor radius relative centrifugal force lab [MEDIUM/3]

## 5.8 Everyday Calculators — `everyday/` (47 tools)

**/everyday/age — Age Calculator**
- Title: Age Calculator: Date of Birth
- Keywords: exact age calculator in years months days [MEDIUM/4] · date of birth [MEDIUM/4] · age in days [MEDIUM/4]

**/everyday/date-diff — Date Difference Calculator**
- Title: Date Difference Calculator: Days Between Two
- Keywords: date difference calculator between two dates [EASY/2] · days between dates [MEDIUM/3]

**/everyday/time-calc — Time Calculator**
- Title: Time Calculator: Hours 1, Minutes 1 & Hours 2
- Keywords: free time calculator [MEDIUM/3]

**/everyday/trip-fuel-cost — Trip Fuel Cost Calculator**
- Title: Trip Fuel Cost Calculator: Distance, Efficiency
- Keywords: trip cost calculator [MEDIUM/3]

**/everyday/electricity — Electricity Bill Calculator**
- Title: Electricity Bill Calculator: Power, Hours/Day & Days
- Keywords: electricity bill calculator [MEDIUM/3]

**/everyday/carbon — Carbon Footprint Calculator**
- Title: Carbon Footprint Calculator: Monthly Electricity
- Keywords: carbon footprint calculator [MEDIUM/3]

**/everyday/gst — GST/VAT Calculator**
- Title: GST/VAT Calculator: Amount & Tax Rate
- Keywords: free gst/vat calculator [EASY/2]

**/everyday/paint — Paint Calculator**
- Title: Paint Calculator: Wall Area & Number of Coats
- Keywords: gallons of paint [MEDIUM/3]

**/everyday/concrete — Concrete Calculator**
- Title: Concrete Calculator: Length, Width & Depth
- Keywords: free concrete calculator [MEDIUM/4]

**/everyday/garden — Garden Area Calculator**
- Title: Garden Area Calculator: Length, Width & Plant Spacing
- Keywords: garden area calculator [MEDIUM/3]

**/everyday/cooking — Cooking Converter**
- Title: Cooking Converter: Amount
- Keywords: cooking converter calculator [MEDIUM/3]

**/everyday/weather — Weather Index**
- Title: Weather Index: Temperature & Humidity
- Keywords: weather index calculator [MEDIUM/3]

**/everyday/timezone — Time Zone Converter**
- Title: Time Zone Converter: Time, From UTC Offset & To UTC Offset
- Keywords: time zone converter calculator [MEDIUM/3]

**/everyday/calorie-counter — Daily Calorie Counter**
- Title: Daily Calorie Counter: Weight, Height & Age
- Keywords: calorie calculator [HARD/5] · daily calories [MEDIUM/4] · nutrition tracker [MEDIUM/3] · diet plan [MEDIUM/3]

**/everyday/currency-exchange — Currency Exchange Fee Calculator**
- Title: Currency Exchange Fee Calculator: Amount to
- Keywords: currency exchange fee calculator [MEDIUM/3] · currency exchange margin [MEDIUM/3] · airport exchange rate cost [MEDIUM/3]

**/everyday/sleep-calc — Sleep Cycle Calculator**
- Title: Sleep Cycle Calculator: 90-Minute Cycle Bedtime
- Keywords: sleep cycle calculator wake up time [MEDIUM/3]

**/everyday/walking-steps — Walking Steps Tracker**
- Title: Walking Steps Tracker: Steps Walked & Stride Length
- Keywords: walking steps tracker [MEDIUM/3]

**/everyday/fitness-age — Fitness Age Calculator**
- Title: Fitness Age Calculator: Actual Age, Resting Heart Rate
- Keywords: fitness age calculator [MEDIUM/4]

**/everyday/pet-age — Pet Age Calculator (Dog/Cat)**
- Title: Pet Age Calculator (Dog/Cat): Human Years
- Keywords: dog age to human years calculator [MEDIUM/4]

**/everyday/blood-alcohol — Blood Alcohol Content (BAC)**
- Title: Blood Alcohol Content (BAC): Number of Drinks, Weight
- Keywords: blood alcohol content calculator [MEDIUM/3]

**/everyday/vacation-budget — Vacation Budget Planner**
- Title: Vacation Budget Planner: Flights, Hotel/Night & Nights
- Keywords: vacation budget planner [MEDIUM/3]

**/everyday/laundry-cost — Laundry Cost Calculator**
- Title: Laundry Cost Calculator: Loads/Week, Washer kWh/Load
- Keywords: laundry cost calculator [MEDIUM/3]

**/everyday/coffee-cost — Coffee Habit Cost Calculator**
- Title: Coffee Habit Cost Calculator: Cups/Day, Cost per Cup
- Keywords: coffee cost calculator [MEDIUM/3]

**/everyday/grocery-budget — Grocery Budget Planner**
- Title: Grocery Budget Planner: People in Household
- Keywords: grocery budget planner [MEDIUM/3]

**/everyday/distance-pace — Distance Pace Calculator**
- Title: Distance Pace Calculator: Distance, Hours & Minutes
- Keywords: distance pace calculator [MEDIUM/3]

**/everyday/savings-goal-date — Savings Goal Date**
- Title: Savings Goal Date: Goal Amount, Current Savings
- Keywords: savings goal calculator date time to save [MEDIUM/4]

**/everyday/budget-allocator — Monthly Budget Allocator**
- Title: Monthly Budget Allocator: Housing, Food & Savings %
- Keywords: budget calculator monthly allocation percentages [EASY/2]

**/everyday/event-countdown — Event Countdown**
- Title: Event Countdown: Event Date & Count From
- Keywords: countdown calculator days until event date [MEDIUM/4]

**/everyday/work-hours-weekly — Weekly Work Hours**
- Title: Weekly Work Hours: Days per Week & Hours per Day
- Keywords: work hours calculator weekly annual [EASY/2]

**/everyday/days-between — Days Between Dates**
- Title: Days Between Dates: From Date & To Date
- Keywords: days between dates calculator duration [EASY/2]

**/everyday/compound-savings — Compound Savings Growth**
- Title: Compound Savings Growth: Starting Amount, Monthly Deposit
- Keywords: compound interest savings calculator monthly contribution [EASY/2]

**/everyday/business-days — Business Days Calculator**
- Title: Business Days Calculator: Start Date & End Date
- Keywords: business days calculator working days weekdays between dates [EASY/2]

**/everyday/week-number — ISO Week Number Calculator**
- Title: ISO Week Number Calculator: Date
- Keywords: iso week number calculator week of year [MEDIUM/3]

**/everyday/day-of-year — Day of Year Calculator**
- Title: Day of Year Calculator: Ordinal Day Number
- Keywords: day of year calculator ordinal date [EASY/2]

**/everyday/leap-year — Leap Year Calculator**
- Title: Leap Year Calculator: Is Year Leap
- Keywords: leap year calculator check divisible 4 100 400 [MEDIUM/3]

**/everyday/lottery-odds — Lottery Odds Calculator**
- Title: Lottery Odds Calculator: Balls Drawn, Balls in Pool
- Keywords: lottery odds calculator probability jackpot [MEDIUM/3]

**/everyday/poker-flush — Poker Flush Odds Calculator**
- Title: Poker Flush Odds Calculator: Cards of the Same Suit Needed
- Keywords: poker flush odds calculator 5 card probability combinations straight flush [MEDIUM/3]

**/everyday/easter-date — Easter Date Calculator**
- Title: Easter Date Calculator: Year
- Keywords: easter date calculator computus good friday western sunday ash wednesday [MEDIUM/4]

**/everyday/day-of-week — Day of Week Calculator**
- Title: Day of Week Calculator: Weekday For Any Date
- Keywords: day of week calculator what day was date weekday calendar finder [EASY/2]

**/everyday/moon-phase — Moon Phase Calculator**
- Title: Moon Phase Calculator: Date
- Keywords: moon phase calculator lunar cycle synodic month full moon new moon illumination [MEDIUM/3]

**/everyday/meeting-cost — Meeting Cost Calculator**
- Title: Meeting Cost Calculator: Attendees, Average Loaded Hourly
- Keywords: meeting cost calculator attendees hourly rate salary time waste productivity [MEDIUM/4]

**/everyday/sunrise-sunset-length — Daylight Length Calculator**
- Title: Daylight Length Calculator: Latitude & Solar Declination
- Keywords: daylight hours calculator sunrise sunset length latitude season [EASY/2]

**/everyday/pomodoro-planner — Pomodoro Planner**
- Title: Pomodoro Planner: Pomodoro Sessions, Work Minutes Each
- Keywords: pomodoro calculator sessions breaks 25 5 study planner [MEDIUM/3]

**/everyday/gift-wrap — Gift Wrap Calculator**
- Title: Gift Wrap Calculator: Box Length, Box Width & Box Height
- Keywords: gift wrap calculator wrapping paper box size area [MEDIUM/3]

**/everyday/moving-truck — Moving Truck Size Calculator**
- Title: Moving Truck Size Calculator: Rooms of Furniture
- Keywords: moving truck size calculator rooms cubic feet rental [EASY/2]

**/everyday/jet-lag — Jet Lag Recovery Calculator**
- Title: Jet Lag Recovery Calculator: Time Zones Crossed & Direction
- Keywords: jet lag calculator recovery days time zones east west [MEDIUM/3]

**/everyday/heat-pump-savings — Heat Pump Savings Calculator**
- Title: Heat Pump Savings Calculator: Annual Heating
- Keywords: heat pump savings calculator cop electric resistance annual cost [MEDIUM/3]

## 5.9 Finance Calculators — `finance/` (211 tools)

**/finance/loan-emi — Loan EMI Calculator**
- Title: Loan EMI Calculator: Loan Amount, Interest Rate & Loan Term
- Keywords: loan emi calculator india with prepayment [EASY/2] · home loan emi calculator with monthly prepayment [EASY/2] · car loan emi calculator monthly payment [EASY/2] · day count convention [MEDIUM/3]

**/finance/mortgage — Mortgage Calculator**
- Title: Mortgage Calculator: Home Price, Down Payment
- Keywords: fha vs conventional loan comparison calculator [EASY/2] · home loan affordability calculator with property tax [EASY/2] · mortgage payment calculator with pmi and taxes [EASY/2]

**/finance/compound-interest — Compound Interest Calculator**
- Title: Compound Interest Calculator: Principal Amount, Annual
- Keywords: compound interest calculator with monthly contribution in rupees [EASY/2] · compound interest calculator with yearly deposits [EASY/2] · investment growth calculator with monthly sip [EASY/2] · solve for rate [MEDIUM/3]

**/finance/simple-interest — Simple Interest Calculator**
- Title: Simple Interest Calculator: Principal, Rate & Time
- Keywords: simple interest calculator yearly [EASY/2]

**/finance/auto-loan — Auto Loan Calculator**
- Title: Auto Loan Calculator: Vehicle Price, Down Payment & Rate
- Keywords: auto loan calculator with sales tax [EASY/2]

**/finance/credit-card-payoff — Credit Card Payoff**
- Title: Credit Card Payoff: Current Balance, APR & Monthly Payment
- Keywords: credit card payoff calculator with extra payment [EASY/2] · debt payoff calculator monthly payment plan [EASY/2] · credit card payoff [MEDIUM/3] · solve for payment [MEDIUM/3]

**/finance/retirement — Retirement Calculator**
- Title: Retirement Calculator: Current Savings
- Keywords: retirement savings calculator with monthly contribution [EASY/2] · 401k retirement calculator with employer match [EASY/2] · retirement age calculator based on savings rate [EASY/2] · solve for contribution [MEDIUM/3]

**/finance/investment — Investment Calculator**
- Title: Investment Calculator: Initial Investment, Annual Return
- Keywords: roi calculator with annual returns [EASY/2] · investment return calculator with inflation [EASY/2]

**/finance/savings-goal — Savings Goal Calculator**
- Title: Savings Goal Calculator: Savings Goal, Time & Annual Return
- Keywords: solve for time [MEDIUM/3]

**/finance/tax — Income Tax Calculator**
- Title: Income Tax Calculator: Annual Income, Tax Rate & Deductions
- Keywords: salary income tax calculator pakistan fbr [MEDIUM/4] · take home pay calculator with tax deduction [EASY/2] · pakistan income tax salary calculator [MEDIUM/4]

**/finance/sales-tax — Sales Tax Calculator**
- Title: Sales Tax Calculator: Purchase Amount & Tax Rate
- Keywords: tax on purchase [MEDIUM/4]

**/finance/npv — NPV Calculator**
- Title: NPV Calculator: Discount Rate & Cash Flows
- Keywords: net present value [MEDIUM/3]

**/finance/irr — IRR Calculator**
- Title: IRR Calculator: Cash Flows
- Keywords: internal rate of return [MEDIUM/3]

**/finance/roi — ROI Calculator**
- Title: ROI Calculator: Investment Cost & Current Value
- Keywords: return on investment [MEDIUM/3]

**/finance/tip — Tip Calculator**
- Title: Tip Calculator: Bill Amount, Tip & Number of People
- Keywords: free tip calculator [MEDIUM/4]

**/finance/salary — Salary Calculator**
- Title: Salary Calculator: Hourly Rate, Hours/Week & Weeks/Year
- Keywords: take home pay calculator with deductions [EASY/2] · net salary calculator pakistan monthly [EASY/2] · hourly to salary [MEDIUM/4]

**/finance/annuity — Annuity Calculator**
- Title: Annuity Calculator: Present Value, Rate & Years
- Keywords: future value annuity [MEDIUM/3]

**/finance/inflation — Inflation Calculator**
- Title: Inflation Calculator: Amount, Inflation Rate & Years
- Keywords: free inflation calculator [MEDIUM/3]

**/finance/bonds — Bond Calculator**
- Title: Bond Calculator: Face Value, Coupon Rate & Current Price
- Keywords: bonds yield to maturity calculator [MEDIUM/3] · bond price calculator with coupon rate [EASY/2]

**/finance/debt-ratio — Debt-to-Income Ratio**
- Title: Debt-to-Income Ratio: Monthly Income & Monthly Debts
- Keywords: debt to income [MEDIUM/3]

**/finance/net-worth-calculator — Net Worth Calculator**
- Title: Net Worth Calculator: Total Assets & Total Liabilities
- Keywords: net worth calculator [MEDIUM/3]

**/finance/rent-vs-buy — Rent vs Buy Calculator**
- Title: Rent vs Buy Calculator: Monthly Rent, Home Price
- Keywords: rent vs buy [MEDIUM/3]

**/finance/refinance — Refinance Calculator**
- Title: Refinance Calculator: Current Balance, Current Rate
- Keywords: free refinance calculator [MEDIUM/3]

**/finance/home-afford — Home Affordability Calculator**
- Title: Home Affordability Calculator: Annual Income, Down
- Keywords: how much house can i afford calculator [EASY/2] · home affordability calculator with down payment [EASY/2] · how much house [MEDIUM/3]

**/finance/currency-converter — Currency Converter**
- Title: Currency Converter: Amount
- Keywords: currency exchange rate converter calculator [MEDIUM/3] · usd to pkr live exchange rate converter [EASY/2] · pkr to usd converter today [EASY/2]

**/finance/loan-qualify — Loan Qualification**
- Title: Loan Qualification: Monthly Income, Monthly Debts & Rate
- Keywords: loan qualification calculator [MEDIUM/4]

**/finance/paycheck — Paycheck Calculator**
- Title: Paycheck Calculator: Gross Annual, Tax Rate
- Keywords: take home pay [MEDIUM/4]

**/finance/break-even — Break-Even Calculator**
- Title: Break-Even Calculator: Fixed Costs, Price per Unit
- Keywords: break even analysis calculator units [MEDIUM/3]

**/finance/cash-flow — Cash Flow Calculator**
- Title: Cash Flow Calculator: Monthly Income, Monthly Expenses
- Keywords: cash flow projection [MEDIUM/3]

**/finance/markup — Markup Calculator**
- Title: Markup Calculator: Cost & Markup
- Keywords: free markup calculator [MEDIUM/3]

**/finance/discount — Discount Calculator**
- Title: Discount Calculator: Original Price & Discount
- Keywords: free discount calculator [MEDIUM/4]

**/finance/present-value — Present Value Calculator**
- Title: Present Value Calculator: Future Value, Discount Rate
- Keywords: time value of money [MEDIUM/3]

**/finance/future-value — Future Value Calculator**
- Title: Future Value Calculator: Present Value, Rate & Years
- Keywords: future value calculator lump sum [MEDIUM/3]

**/finance/amortization — Amortization Schedule**
- Title: Amortization Schedule: Loan Amount, Rate & Years
- Keywords: amortization schedule calculator [MEDIUM/3]

**/finance/loan-to-value — Loan-to-Value Ratio**
- Title: Loan-to-Value Ratio: Loan Amount & Property Value
- Keywords: loan to value [MEDIUM/4]

**/finance/apr — APR Calculator**
- Title: APR Calculator: Loan Amount, Fees & Nominal Rate
- Keywords: annual percentage rate [MEDIUM/4]

**/finance/capital-gains — Capital Gains Tax**
- Title: Capital Gains Tax: Purchase Price, Sale Price & Tax Rate
- Keywords: capital gains tax [MEDIUM/4]

**/finance/dividend — Dividend Calculator**
- Title: Dividend Calculator: Number of Shares, Dividend/Share
- Keywords: free dividend calculator [MEDIUM/3]

**/finance/fire — FIRE Calculator**
- Title: FIRE Calculator: Annual Expenses, Current Savings & Return
- Keywords: free fire calculator [MEDIUM/3]

**/finance/social-security — Social Security Calculator**
- Title: Social Security Calculator: Average Annual Income
- Keywords: social security calculator [MEDIUM/3]

**/finance/rental-yield — Rental Yield Calculator**
- Title: Rental Yield Calculator: Property Price, Monthly Rent
- Keywords: rental yield calculator [MEDIUM/3]

**/finance/loan-comparison — Loan Comparison**
- Title: Loan Comparison: Loan Amount, Offer 1 Rate & Offer 1 Term
- Keywords: loan comparison calculator [MEDIUM/4]

**/finance/investment-growth — Investment Growth Comparison**
- Title: Investment Growth Comparison: Initial
- Keywords: cagr calculator with monthly contributions [EASY/2]

**/finance/savings-comparison — Savings Account Comparison**
- Title: Savings Account Comparison: Deposit Amount, Bank 1 Rate
- Keywords: high yield savings [MEDIUM/3]

**/finance/mortgage-payoff — Mortgage Payoff Calculator**
- Title: Mortgage Payoff Calculator: Loan Amount, Rate
- Keywords: mortgage payoff calculator extra payments [MEDIUM/4]

**/finance/graduated-payment — Graduated Payment Mortgage**
- Title: Graduated Payment Mortgage: Loan Amount, Rate & Term
- Keywords: increasing payment mortgage [MEDIUM/4]

**/finance/balloon-payment — Balloon Payment Calculator**
- Title: Balloon Payment Calculator: Loan Amount, Rate & Amortization
- Keywords: lump sum payment [MEDIUM/3]

**/finance/interest-only — Interest-Only Mortgage**
- Title: Interest-Only Mortgage: Loan Amount, Rate & IO Period
- Keywords: interest only mortgage [MEDIUM/4] · interest only payment [MEDIUM/4]

**/finance/emergency-fund — Emergency Fund Calculator**
- Title: Emergency Fund Calculator: Monthly Expenses, Months
- Keywords: rainy day fund [MEDIUM/3]

**/finance/bond-yield — Bond Yield to Maturity**
- Title: Bond Yield to Maturity: Face Value, Coupon Rate
- Keywords: bond yield [MEDIUM/3] · YTM [MEDIUM/3] · current yield [MEDIUM/3] · fixed income [MEDIUM/3]

**/finance/retirement-income — Retirement Income Calculator**
- Title: Retirement Income Calculator: Current Savings
- Keywords: retirement income [MEDIUM/3] · retirement planning [MEDIUM/3] · 401k [MEDIUM/3] · IRA [MEDIUM/3]

**/finance/sip — SIP Calculator (Systematic Investment Plan)**
- Title: SIP Calculator (Systematic Investment Plan)
- Keywords: sip calculator [MEDIUM/3] · mutual fund [MEDIUM/3] · systematic investment plan [MEDIUM/3]

**/finance/crypto-profit — Crypto Profit Calculator**
- Title: Crypto Profit Calculator: Buy, Sell Price & Quantity
- Keywords: crypto calculator [HARD/5] · bitcoin profit [HARD/5] · cryptocurrency gains [MEDIUM/3]

**/finance/stock-profit — Stock Profit Calculator**
- Title: Stock Profit Calculator: Number of Shares, Buy Price
- Keywords: stock profit [MEDIUM/3] · stock calculator [MEDIUM/3] · capital gains [MEDIUM/3]

**/finance/dca — DCA Calculator (Dollar Cost Average)**
- Title: DCA Calculator (Dollar Cost Average): Lump Sum, Monthly
- Keywords: dca calculator [MEDIUM/3] · dollar cost averaging [MEDIUM/3] · lump sum vs dca [EASY/2]

**/finance/college-cost — College Cost Calculator**
- Title: College Cost Calculator: Current Tuition, Years
- Keywords: college calculator [MEDIUM/3] · education savings [MEDIUM/3] · 529 plan [MEDIUM/3] · tuition cost [MEDIUM/3]

**/finance/perpetuity — Perpetuity Calculator**
- Title: Perpetuity Calculator: Payment per Period, Discount Rate
- Keywords: perpetuity calculator [MEDIUM/3] · present value perpetuity [MEDIUM/3] · terminal value [MEDIUM/3]

**/finance/esop — ESOP Calculator (Employee Stock Ownership)**
- Title: ESOP Calculator (Employee Stock Ownership): Strike
- Keywords: esop calculator [MEDIUM/3] · employee stock options [MEDIUM/3] · stock options [MEDIUM/3] · RSU [MEDIUM/3]

**/finance/us-income-tax — US Federal Income Tax Calculator**
- Title: US Federal Income Tax Calculator: Annual Income
- Keywords: us income tax [MEDIUM/4] · federal tax calculator [MEDIUM/4] · irs tax brackets [MEDIUM/4]

**/finance/uk-income-tax — UK Income Tax Calculator**
- Title: UK Income Tax Calculator: Annual Salary
- Keywords: uk income tax calculator [EASY/2] · take home pay uk [EASY/2]

**/finance/canada-income-tax — Canada Income Tax Calculator**
- Title: Canada Income Tax Calculator: Annual Income
- Keywords: canada income tax [MEDIUM/4] · cra tax calculator [MEDIUM/4] · take home canada [MEDIUM/4]

**/finance/australia-income-tax — Australia Income Tax Calculator**
- Title: Australia Income Tax Calculator: Annual Income
- Keywords: australia tax calculator [MEDIUM/4] · take home australia [MEDIUM/4]

**/finance/bond-price — Bond Price Calculator**
- Title: Bond Price Calculator: Present Value From Market Yield
- Keywords: bond price calculator present value [MEDIUM/3]

**/finance/cd-calculator — CD Interest Calculator**
- Title: CD Interest Calculator: Deposit Amount, APY & Term
- Keywords: cd interest calculator certificate of deposit [MEDIUM/4]

**/finance/annuity-payout — Annuity Payout Calculator**
- Title: Annuity Payout Calculator: Retirement Fund, Annual Return
- Keywords: annuity payout calculator retirement withdrawal [MEDIUM/3]

**/finance/dividend-yield — Dividend Yield Calculator**
- Title: Dividend Yield Calculator: Annual Dividend & Share Price
- Keywords: dividend yield calculator [MEDIUM/3]

**/finance/rule-of-72 — Rule of 72 Calculator**
- Title: Rule of 72 Calculator: Annual Return
- Keywords: rule of 72 calculator investment doubling time [MEDIUM/3]

**/finance/loan-payoff — Loan Payoff Calculator**
- Title: Loan Payoff Calculator: Loan Balance, Annual Rate
- Keywords: loan payoff calculator extra payments [MEDIUM/4]

**/finance/retirement-withdrawal — Retirement Withdrawal Calculator**
- Title: Retirement Withdrawal Calculator: Retirement
- Keywords: retirement withdrawal calculator 4 percent rule [MEDIUM/3]

**/finance/inflation-adjusted — Inflation Adjusted Return**
- Title: Inflation Adjusted Return: Nominal Return & Inflation Rate
- Keywords: inflation adjusted return calculator real return [MEDIUM/3]

**/finance/tax-equivalent-yield — Tax Equivalent Yield**
- Title: Tax Equivalent Yield: Municipal Bond Yield & Your Tax Rate
- Keywords: tax equivalent yield calculator municipal bond [MEDIUM/4]

**/finance/529-plan — 529 Plan Calculator**
- Title: 529 Plan Calculator: Current Balance, Monthly
- Keywords: 529 plan calculator education savings [MEDIUM/3]

**/finance/times-interest-earned — Times Interest Earned**
- Title: Times Interest Earned: EBIT & Interest Expense
- Keywords: times interest earned ratio calculator [MEDIUM/4]

**/finance/quick-ratio — Quick Ratio Calculator**
- Title: Quick Ratio Calculator: Cash & Equivalents
- Keywords: quick ratio calculator acid test ratio [EASY/2]

**/finance/ebitda — EBITDA Calculator**
- Title: EBITDA Calculator: Revenue, COGS & Operating Expenses
- Keywords: ebitda calculator [MEDIUM/3]

**/finance/enterprise-value — Enterprise Value Calculator**
- Title: Enterprise Value Calculator: Market Cap, Total Debt
- Keywords: enterprise value calculator ev [MEDIUM/3]

**/finance/wacc — WACC Calculator**
- Title: WACC Calculator: Market Value of Equity, Market Value
- Keywords: wacc calculator weighted average cost of capital [EASY/2]

**/finance/sharpe-ratio — Sharpe Ratio Calculator**
- Title: Sharpe Ratio Calculator: Portfolio Return, Risk-Free Rate
- Keywords: sharpe ratio calculator risk adjusted return [MEDIUM/3]

**/finance/geometric-mean — Geometric Mean Return**
- Title: Geometric Mean Return: Annual Returns
- Keywords: geometric mean return calculator cagr [EASY/2]

**/finance/debt-snowball — Debt Snowball Calculator**
- Title: Debt Snowball Calculator: Debts & Extra Monthly Budget
- Keywords: debt snowball calculator debt payoff strategy [MEDIUM/3]

**/finance/payday-loan-cost — Payday Loan Cost Calculator**
- Title: Payday Loan Cost Calculator: Loan Amount, Fee per $100
- Keywords: payday loan cost calculator true cost [MEDIUM/4]

**/finance/emergency-fund-rate — Emergency Fund Growth**
- Title: Emergency Fund Growth: Monthly Deposit, APY & Months
- Keywords: emergency fund growth high yield savings calculator [MEDIUM/3]

**/finance/property-tax — Property Tax Calculator**
- Title: Property Tax Calculator: Property Value & Tax Rate
- Keywords: property tax calculator annual estimate [MEDIUM/4]

**/finance/closing-costs — Closing Costs Calculator**
- Title: Closing Costs Calculator: Home Price, Down Payment
- Keywords: closing costs calculator home purchase [MEDIUM/4]

**/finance/cap-rate — Cap Rate Calculator**
- Title: Cap Rate Calculator: Net Operating Income & Property Value
- Keywords: cap rate calculator capitalization rate real estate [MEDIUM/3]

**/finance/student-loan-repayment — Student Loan Repayment**
- Title: Student Loan Repayment: Loan Balance, Interest Rate
- Keywords: student loan repayment calculator standard plan [MEDIUM/4]

**/finance/cost-of-debt — Cost of Debt Calculator**
- Title: Cost of Debt Calculator: Pre-tax Interest Rate & Tax Rate
- Keywords: after tax cost of debt calculator [MEDIUM/4]

**/finance/fha-loan — FHA Loan Calculator**
- Title: FHA Loan Calculator: Home Price, Down Payment
- Keywords: fha loan calculator mortgage mip [MEDIUM/4]

**/finance/va-loan — VA Loan Calculator**
- Title: VA Loan Calculator: Home Price, Interest Rate & Loan Term
- Keywords: va loan calculator veteran mortgage [MEDIUM/4]

**/finance/reverse-mortgage — Reverse Mortgage Calculator**
- Title: Reverse Mortgage Calculator: Home Value, Borrower Age
- Keywords: reverse mortgage calculator home equity [MEDIUM/4]

**/finance/house-affordability — House Affordability Calculator**
- Title: House Affordability Calculator: Annual Gross
- Keywords: house affordability calculator how much house can i afford [EASY/2]

**/finance/mortgage-refinance — Mortgage Refinance Calculator**
- Title: Mortgage Refinance Calculator: Current Loan
- Keywords: mortgage refinance calculator should i refinance savings [MEDIUM/4]

**/finance/crypto-gains — Crypto Gains Calculator**
- Title: Crypto Gains Calculator: Trade Profit, Loss & ROI
- Keywords: crypto gains calculator cryptocurrency profit loss [MEDIUM/4]

**/finance/price-to-earnings — P/E Ratio Calculator**
- Title: P/E Ratio Calculator: Share Price & Earnings Per Share
- Keywords: pe ratio calculator price to earnings stock [MEDIUM/3]

**/finance/dividend-discount — Dividend Discount Model**
- Title: Dividend Discount Model: Annual Dividend, Dividend Growth
- Keywords: dividend discount model calculator ddm gordon growth [MEDIUM/4]

**/finance/margin-call — Margin Call Price Calculator**
- Title: Margin Call Price Calculator: Buy Price & Maintenance Margin
- Keywords: margin call calculator stock price threshold [MEDIUM/3]

**/finance/black-scholes — Black-Scholes Option Pricing**
- Title: Black-Scholes Option Pricing: Spot Price, Strike Price
- Keywords: black scholes option pricing calculator [MEDIUM/3]

**/finance/bond-duration — Bond Duration Calculator**
- Title: Bond Duration Calculator: Macaulay & Modified Duration
- Keywords: bond duration calculator macaulay modified duration [EASY/2]

**/finance/growing-perpetuity — Growing Perpetuity Calculator**
- Title: Growing Perpetuity Calculator: Next Payment, Growth Rate
- Keywords: growing perpetuity calculator constant growth [MEDIUM/3]

**/finance/tax-loss-harvest — Tax Loss Harvesting**
- Title: Tax Loss Harvesting: Capital Gains, Capital Losses
- Keywords: tax loss harvesting calculator offset gains losses [MEDIUM/4]

**/finance/savings-rate — Savings Rate Calculator**
- Title: Savings Rate Calculator: Monthly Take-Home & Amount Saved
- Keywords: savings rate calculator personal finance [MEDIUM/3]

**/finance/envelope-budget — 50/30/20 Budget Calculator**
- Title: 50/30/20 Budget Calculator: Monthly Take-Home
- Keywords: 50 30 20 budget calculator envelope method [MEDIUM/3]

**/finance/car-lease-calculator — Car Lease Payment Calculator**
- Title: Car Lease Payment Calculator: MSRP, Capitalized Cost
- Keywords: car lease payment calculator monthly lease estimate [EASY/2]

**/finance/cost-of-living — Cost of Living Calculator**
- Title: Cost of Living Calculator: Current Salary, City A
- Keywords: cost of living calculator compare cities salary adjustment [MEDIUM/4]

**/finance/debt-consolidation — Debt Consolidation Calculator**
- Title: Debt Consolidation Calculator: Current Debts
- Keywords: debt consolidation calculator combine debts [MEDIUM/3]

**/finance/yield-to-maturity — Yield to Maturity Calculator**
- Title: Yield to Maturity Calculator: Face Value, Coupon Rate
- Keywords: yield to maturity calculator bond ytm [MEDIUM/3]

**/finance/gross-rent-multiplier — Gross Rent Multiplier**
- Title: Gross Rent Multiplier: Property Price & Monthly Rent
- Keywords: gross rent multiplier calculator grm real estate [MEDIUM/3]

**/finance/current-ratio-finance — Current Ratio Calculator**
- Title: Current Ratio Calculator: Current Assets
- Keywords: current ratio calculator liquidity [MEDIUM/3]

**/finance/accounts-receivable-turnover — AR Turnover Ratio**
- Title: AR Turnover Ratio: Net Credit Sales & Average Accounts
- Keywords: accounts receivable turnover ratio calculator [MEDIUM/3]

**/finance/operating-margin — Operating Margin Calculator**
- Title: Operating Margin Calculator: Revenue & Operating Income
- Keywords: operating margin calculator [MEDIUM/3]

**/finance/net-profit-margin — Net Profit Margin**
- Title: Net Profit Margin: Revenue & Net Income
- Keywords: net profit margin calculator [MEDIUM/3]

**/finance/coverage-ratio — Debt Coverage Ratio**
- Title: Debt Coverage Ratio: Net Operating Income & Annual
- Keywords: debt coverage ratio calculator dscr [MEDIUM/3]

**/finance/home-equity — Home Equity Calculator**
- Title: Home Equity Calculator: Current Home Value
- Keywords: home equity calculator how much equity do i have [EASY/2]

**/finance/cash-on-cash — Cash-on-Cash Return**
- Title: Cash-on-Cash Return: Annual Pre-Tax Cash Flow & Total
- Keywords: cash on cash return calculator real estate investment [MEDIUM/3]

**/finance/loan-balance — Loan Balance Calculator**
- Title: Loan Balance Calculator: Original Loan, Annual Rate
- Keywords: loan balance calculator remaining balance [MEDIUM/4]

**/finance/price-to-rent — Price-to-Rent Ratio**
- Title: Price-to-Rent Ratio: Median Home Price & Annual Rent
- Keywords: price to rent ratio calculator buy vs rent market [EASY/2]

**/finance/fico-simulator — Credit Score Simulator**
- Title: Credit Score Simulator: Current Score, Credit Utilization
- Keywords: credit score simulator fico estimate impact [EASY/2]

**/finance/discounted-payback — Discounted Payback Period**
- Title: Discounted Payback Period: NPV-Based Recovery Time
- Keywords: discounted payback period calculator [MEDIUM/3]

**/finance/portfolio-return — Portfolio Return Calculator**
- Title: Portfolio Return Calculator: Weights & Returns
- Keywords: portfolio return calculator weighted average [EASY/2]

**/finance/payroll-tax — Payroll Tax Calculator**
- Title: Payroll Tax Calculator: Gross Wages
- Keywords: payroll tax calculator fica medicare social security [MEDIUM/4]

**/finance/standard-deduction — Standard vs Itemized Deduction**
- Title: Standard vs Itemized Deduction: SALT, Mortgage Interest
- Keywords: standard deduction vs itemized deduction calculator 2026 [EASY/2]

**/finance/home-office-deduction — Home Office Deduction**
- Title: Home Office Deduction: Office Square Feet, Total Home Sq
- Keywords: home office deduction calculator simplified vs actual [EASY/2]

**/finance/estimated-tax — Estimated Tax Calculator**
- Title: Estimated Tax Calculator: Expected Annual
- Keywords: estimated tax calculator quarterly self employed [MEDIUM/4]

**/finance/diversification — Portfolio Diversification**
- Title: Portfolio Diversification: Stocks, Bonds & Real Estate
- Keywords: portfolio diversification calculator asset allocation [MEDIUM/3]

**/finance/forex-pip — Forex Pip Calculator**
- Title: Forex Pip Calculator: Lot Size
- Keywords: forex pip calculator value lot size [MEDIUM/3]

**/finance/currency-arbitrage — Currency Arbitrage Detector**
- Title: Currency Arbitrage Detector: Rate A→B, Rate B→C & Rate C→A
- Keywords: triangular arbitrage calculator currency exchange profit [MEDIUM/3]

**/finance/payback-period — Simple Payback Period**
- Title: Simple Payback Period: Years To Recover Investment
- Keywords: payback period calculator investment recovery [MEDIUM/3]

**/finance/t-bill — T-Bill Calculator (Price & Yield)**
- Title: T-Bill Calculator (Price & Yield): Face Value, Days
- Keywords: t bill calculator treasury bill price yield discount [MEDIUM/4]

**/finance/cagr — CAGR Calculator**
- Title: CAGR Calculator: Beginning Value, Ending Value & Years
- Keywords: cagr calculator compound annual growth rate investment return annualized [EASY/2]

**/finance/capm — CAPM Calculator**
- Title: CAPM Calculator: Risk-Free Rate, Beta & Market Return
- Keywords: capm calculator capital asset pricing model expected return beta [MEDIUM/3]

**/finance/dcf — DCF Valuation Calculator**
- Title: DCF Valuation Calculator: Cash Flows, Discount Rate
- Keywords: dcf calculator discounted cash flow valuation terminal value [MEDIUM/3]

**/finance/debt-to-equity — Debt-to-Equity Ratio**
- Title: Debt-to-Equity Ratio: Total Liabilities
- Keywords: debt to equity ratio calculator leverage [MEDIUM/3]

**/finance/sip-step-up — Step-Up SIP Calculator**
- Title: Step-Up SIP Calculator: Starting Monthly, Annual Step-Up
- Keywords: step up sip calculator annual increase systematic investment plan [EASY/2]

**/finance/fixed-deposit-vs-recurring — FD vs RD Calculator**
- Title: FD vs RD Calculator: Monthly Savings, Tenure & Interest Rate
- Keywords: fd vs rd calculator fixed deposit recurring deposit comparison [EASY/2]

**/finance/insurance-surrender-value — Insurance Surrender Value**
- Title: Insurance Surrender Value: Annual Premium, Years
- Keywords: insurance surrender value calculator life policy lapsed [MEDIUM/3]

**/finance/espp — ESPP Calculator (Stock Purchase Plan)**
- Title: ESPP Calculator (Stock Purchase Plan): Annual
- Keywords: espp calculator employee stock purchase plan discount lookback [MEDIUM/4]

**/finance/roth-vs-traditional — Roth vs Traditional 401(k)**
- Title: Roth vs Traditional 401(k): Annual Contribution
- Keywords: roth vs traditional 401k ira comparison after tax [EASY/2]

**/finance/recast-mortgage — Mortgage Recast Calculator**
- Title: Mortgage Recast Calculator: Current Balance, Rate
- Keywords: mortgage recast calculator recasting loan payment [MEDIUM/4]

**/finance/biweekly-mortgage — Biweekly Mortgage Calculator**
- Title: Biweekly Mortgage Calculator: Loan Amount, Rate & Loan Term
- Keywords: biweekly mortgage calculator accelerated payments savings [MEDIUM/4]

**/finance/mortgage-points — Mortgage Points Calculator**
- Title: Mortgage Points Calculator: Loan Amount, Base Rate & Points
- Keywords: mortgage points calculator break even discount points [MEDIUM/4]

**/finance/rent-affordability — Rent Affordability Calculator**
- Title: Rent Affordability Calculator: Monthly Gross Income
- Keywords: rent affordability calculator how much rent can i afford 30 percent rule [EASY/2]

**/finance/dividend-reinvestment — Dividend Reinvestment Calculator**
- Title: Dividend Reinvestment Calculator: Initial
- Keywords: dividend reinvestment calculator drip compounding [MEDIUM/3]

**/finance/stock-split — Stock Split Calculator**
- Title: Stock Split Calculator: Shares Owned, Price per Share
- Keywords: stock split calculator forward reverse ratio [MEDIUM/3]

**/finance/eps-calculator — Earnings Per Share Calculator**
- Title: Earnings Per Share Calculator: Net Income
- Keywords: earnings per share calculator eps [EASY/2]

**/finance/book-value-share — Book Value Per Share Calculator**
- Title: Book Value Per Share Calculator: Shareholders'
- Keywords: book value per share calculator bvps [EASY/2]

**/finance/net-operating-income — NOI Calculator**
- Title: NOI Calculator: Gross Rental Income, Vacancy & Losses
- Keywords: net operating income calculator noi real estate [MEDIUM/3]

**/finance/credit-utilization — Credit Utilization Calculator**
- Title: Credit Utilization Calculator: Total Card Balances
- Keywords: credit utilization calculator credit card ratio [EASY/2]

**/finance/apy-calculator — APY Calculator**
- Title: APY Calculator: Nominal Rate, Principal & Years
- Keywords: apy calculator annual percentage yield compounding [EASY/2]

**/finance/lump-sum-vs-sip — Lump Sum vs SIP Calculator**
- Title: Lump Sum vs SIP Calculator: Lump Sum Amount, Monthly SIP
- Keywords: lump sum vs sip calculator comparison mutual fund [EASY/2]

**/finance/pmi-calculator — PMI Calculator**
- Title: PMI Calculator: Home Price, Down Payment & Annual PMI Rate
- Keywords: pmi calculator private mortgage insurance monthly [EASY/2]

**/finance/pension-lump-sum — Pension Lump Sum vs Annuity Calculator**
- Title: Pension Lump Sum vs Annuity Calculator: Monthly
- Keywords: pension lump sum vs annuity calculator present value [EASY/2]

**/finance/prorated-rent — Prorated Rent Calculator**
- Title: Prorated Rent Calculator: Monthly Rent, Occupied Days
- Keywords: prorated rent calculator partial month move in move out daily rent [EASY/2]

**/finance/dso — Days Sales Outstanding (DSO)**
- Title: Days Sales Outstanding (DSO): Accounts Receivable
- Keywords: dso calculator days sales outstanding receivables collection period working capital [MEDIUM/3]

**/finance/payout-ratio — Dividend Payout Ratio Calculator**
- Title: Dividend Payout Ratio Calculator: Dividend Per Share
- Keywords: dividend payout ratio calculator dividends earnings retention [MEDIUM/3]

**/finance/market-cap — Market Capitalization Calculator**
- Title: Market Capitalization Calculator: Share Price
- Keywords: market cap calculator market capitalization share price shares outstanding company value [MEDIUM/3]

**/finance/sortino-ratio — Sortino Ratio Calculator**
- Title: Sortino Ratio Calculator: Portfolio Return, Risk-Free
- Keywords: sortino ratio calculator downside deviation risk adjusted return investment [MEDIUM/3]

**/finance/max-drawdown — Maximum Drawdown Calculator**
- Title: Maximum Drawdown Calculator: Peak Value & Trough Value
- Keywords: maximum drawdown calculator peak to trough decline portfolio risk [MEDIUM/3]

**/finance/zero-coupon-bond — Zero Coupon Bond Value Calculator**
- Title: Zero Coupon Bond Value Calculator: Face Value, Yield
- Keywords: zero coupon bond calculator present value discount bond face value [MEDIUM/4]

**/finance/cd-ladder — CD Ladder Calculator**
- Title: CD Ladder Calculator: Total to Invest, Number of CDs
- Keywords: cd ladder calculator certificates of deposit maturity strategy interest [MEDIUM/4]

**/finance/ibond-value — I Bond Value Calculator**
- Title: I Bond Value Calculator: Purchase Amount, Composite Rate
- Keywords: i bond calculator series i savings bond composite rate inflation [MEDIUM/3]

**/finance/put-call-parity — Put-Call Parity Calculator**
- Title: Put-Call Parity Calculator: Call Price, Put Price & Strike
- Keywords: put call parity calculator options arbitrage european options [MEDIUM/3]

**/finance/risk-reward-ratio — Risk-Reward Ratio Calculator**
- Title: Risk-Reward Ratio Calculator: Entry Price, Stop-Loss
- Keywords: risk reward ratio calculator trading stop loss target r multiple [MEDIUM/3]

**/finance/position-size — Position Size Calculator**
- Title: Position Size Calculator: Account Size, Risk Per Trade
- Keywords: position size calculator stock trading risk management shares per trade [EASY/2]

**/finance/stop-loss — Stop-Loss Calculator**
- Title: Stop-Loss Calculator: Entry Price, Stop Distance & Direction
- Keywords: stop loss calculator trailing stop exit price trading risk [MEDIUM/3]

**/finance/cost-basis-avg — Average Cost Basis Calculator**
- Title: Average Cost Basis Calculator: First Quantity, First
- Keywords: average cost basis calculator stock purchases investing taxes [MEDIUM/3]

**/finance/dca-calculator — Dollar Cost Average Calculator**
- Title: Dollar Cost Average Calculator: Amount Per Buy & Prices Paid
- Keywords: dollar cost averaging calculator dca average purchase price investing [MEDIUM/3]

**/finance/staking-rewards — Staking Rewards Calculator**
- Title: Staking Rewards Calculator: Staked Amount, Staking APR
- Keywords: staking rewards calculator crypto compound apr yield [MEDIUM/4]

**/finance/kelly-criterion — Kelly Criterion Calculator**
- Title: Kelly Criterion Calculator: Win Probability & Win/Loss Ratio
- Keywords: kelly criterion calculator bet sizing expected edge probability [MEDIUM/3]

**/finance/value-at-risk — Value at Risk (VaR) Calculator**
- Title: Value at Risk (VaR) Calculator: Portfolio Value
- Keywords: value at risk calculator var parametric portfolio loss confidence [MEDIUM/3]

**/finance/ev-ebitda — EV/EBITDA Calculator**
- Title: EV/EBITDA Calculator: Enterprise Value & EBITDA
- Keywords: ev ebitda calculator valuation multiple enterprise value [MEDIUM/3]

**/finance/peg-ratio — PEG Ratio Calculator**
- Title: PEG Ratio Calculator: P/E Ratio & Expected Growth Rate
- Keywords: peg ratio calculator price earnings growth adjusted valuation [MEDIUM/3]

**/finance/free-cash-flow — Free Cash Flow Calculator**
- Title: Free Cash Flow Calculator: Operating Cash Flow
- Keywords: free cash flow calculator fcf operating cash flow capex [EASY/2]

**/finance/interest-coverage — Interest Coverage Ratio Calculator**
- Title: Interest Coverage Ratio Calculator: EBIT / Operating
- Keywords: interest coverage ratio calculator ebit debt service solvency [MEDIUM/4]

**/finance/asset-turnover — Asset Turnover Calculator**
- Title: Asset Turnover Calculator: Revenue & Total Assets
- Keywords: asset turnover ratio calculator efficiency revenue assets [MEDIUM/3]

**/finance/runway-months — Runway Calculator**
- Title: Runway Calculator: Cash on Hand & Monthly Burn
- Keywords: runway calculator startup cash burn months remaining [MEDIUM/3]

**/finance/effective-tax-rate — Effective Tax Rate Calculator**
- Title: Effective Tax Rate Calculator: Total Tax Paid & Total Income
- Keywords: effective tax rate calculator average rate marginal vs effective [EASY/2]

**/finance/quarterly-tax — Quarterly Estimated Tax Calculator**
- Title: Quarterly Estimated Tax Calculator: Expected Annual
- Keywords: quarterly estimated tax calculator self employed freelancer 1099 [MEDIUM/4]

**/finance/late-fee-interest — Late Payment Interest Calculator**
- Title: Late Payment Interest Calculator: Invoice Amount
- Keywords: late payment interest calculator overdue invoice penalty daily rate [EASY/2]

**/finance/factoring-fee — Invoice Factoring Calculator**
- Title: Invoice Factoring Calculator: Invoice Value, Advance Rate
- Keywords: invoice factoring calculator advance rate factor fee receivables [MEDIUM/3]

**/finance/royalty-payment — Royalty Payment Calculator**
- Title: Royalty Payment Calculator: Sales Revenue & Royalty Rate
- Keywords: royalty calculator percentage of sales licensing author [EASY/2]

**/finance/franchise-cost — Franchise Cost Calculator**
- Title: Franchise Cost Calculator: Franchise Fee, Buildout
- Keywords: franchise cost calculator total investment franchise fee buildout [MEDIUM/3]

**/finance/food-cost-percent — Food Cost Percentage Calculator**
- Title: Food Cost Percentage Calculator: Plate Cost & Menu Price
- Keywords: food cost percentage calculator restaurant menu pricing plate cost [EASY/2]

**/finance/menu-price — Menu Pricing Calculator**
- Title: Menu Pricing Calculator: Plate Cost & Target Food Cost
- Keywords: menu price calculator restaurant pricing target food cost margin [MEDIUM/3]

**/finance/rmd — Required Minimum Distribution Calculator**
- Title: Required Minimum Distribution Calculator: Account Balance
- Keywords: rmd calculator required minimum distribution ira 401k retirement [MEDIUM/3]

**/finance/hsa-growth — HSA Growth Calculator**
- Title: HSA Growth Calculator: Current Balance, Annual
- Keywords: hsa calculator health savings account growth triple tax advantage [MEDIUM/4]

**/finance/safe-withdrawal — Safe Withdrawal Rate Calculator**
- Title: Safe Withdrawal Rate Calculator: Portfolio Value
- Keywords: safe withdrawal rate calculator retirement 4 percent rule portfolio [MEDIUM/3]

**/finance/noi — Net Operating Income Calculator**
- Title: Net Operating Income Calculator: Gross Annual Rent
- Keywords: noi calculator net operating income rental property vacancy [MEDIUM/3]

**/finance/price-per-sqft — Price per Square Foot Calculator**
- Title: Price per Square Foot Calculator: Property Price & Area
- Keywords: price per square foot calculator real estate comparison [EASY/2]

**/finance/rent-increase — Rent Increase Calculator**
- Title: Rent Increase Calculator: Current Rent & Increase
- Keywords: rent increase calculator percentage annual raise tenant [EASY/2]

**/finance/deposit-interest — Security Deposit Interest Calculator**
- Title: Security Deposit Interest Calculator: Deposit
- Keywords: security deposit interest calculator landlord tenant simple interest [EASY/2]

**/finance/roommate-rent-split — Roommate Rent Split Calculator**
- Title: Roommate Rent Split Calculator: Total Rent & Incomes
- Keywords: roommate rent split calculator fair division income proportion [MEDIUM/3]

**/finance/purchasing-power — Purchasing Power Calculator**
- Title: Purchasing Power Calculator: Amount, Inflation Rate & Years
- Keywords: purchasing power calculator inflation real value money [MEDIUM/3]

**/finance/refinance-breakeven — Refinance Break-Even Calculator**
- Title: Refinance Break-Even Calculator: Closing Costs
- Keywords: refinance break even calculator closing costs monthly savings mortgage [EASY/2]

**/finance/apr-annual — Loan APR Calculator**
- Title: Loan APR Calculator: Loan Amount, Fees & Points
- Keywords: apr calculator loan fees true cost annual percentage rate [EASY/2]

**/finance/auto-lease-vs-buy — Lease vs Buy Calculator**
- Title: Lease vs Buy Calculator: Monthly Lease, Lease Down
- Keywords: lease vs buy calculator car total cost comparison [EASY/2]

**/finance/heloc-payment — HELOC Interest-Only Payment**
- Title: HELOC Interest-Only Payment: Drawn Balance & Rate
- Keywords: heloc payment calculator interest only home equity line [MEDIUM/4]

**/finance/pmi-drop — PMI Removal Calculator**
- Title: PMI Removal Calculator: Current Balance & Current Home Value
- Keywords: pmi removal calculator ltv 80 percent cancel mortgage insurance [MEDIUM/4]

**/finance/escrow-analysis — Escrow Payment Calculator**
- Title: Escrow Payment Calculator: Annual Property Tax
- Keywords: escrow calculator property tax insurance monthly cushion [EASY/2]

**/finance/portfolio-beta — Portfolio Beta Calculator**
- Title: Portfolio Beta Calculator: Holding 1 Weight, Holding 1
- Keywords: portfolio beta calculator weighted stock market sensitivity [EASY/2]

**/finance/yield-to-worst — Yield to Worst Calculator**
- Title: Yield to Worst Calculator: Yield to Maturity & Yield to Call
- Keywords: yield to worst calculator callable bond ytw ytc ytm [MEDIUM/3]

**/finance/coupon-payment — Bond Coupon Payment Calculator**
- Title: Bond Coupon Payment Calculator: Face Value, Annual
- Keywords: bond coupon payment calculator semiannual interest face value [MEDIUM/4]

**/finance/clean-dirty-price — Clean vs Dirty Bond Price**
- Title: Clean vs Dirty Bond Price: Dirty Price & Accrued Interest
- Keywords: clean dirty price calculator accrued interest bond settlement [MEDIUM/4]

**/finance/convexity — Bond Convexity Calculator**
- Title: Bond Convexity Calculator: Current Price, Price if
- Keywords: bond convexity calculator price sensitivity duration improvement [MEDIUM/3]

**/finance/duration-bond — Modified Duration Calculator**
- Title: Modified Duration Calculator: Macaulay Duration, Yield
- Keywords: modified duration calculator macaulay bond interest rate sensitivity [EASY/2]

**/finance/appreciation-forecast — Property Appreciation Calculator**
- Title: Property Appreciation Calculator: Current Value
- Keywords: property appreciation calculator future home value growth rate [MEDIUM/4]

**/finance/rent-vs-sell — Rent vs Sell Calculator**
- Title: Rent vs Sell Calculator: Net Annual Rent, Sale Proceeds
- Keywords: rent vs sell calculator landlord keep property invest proceeds [EASY/2]

**/finance/seller-net — Seller Net Proceeds Calculator**
- Title: Seller Net Proceeds Calculator: Sale Price, Commission
- Keywords: seller net proceeds calculator home sale commission payoff [MEDIUM/4]

**/finance/points-breakeven — Mortgage Points Break-Even**
- Title: Mortgage Points Break-Even: Points Cost & Monthly Savings
- Keywords: mortgage points break even calculator discount origination [MEDIUM/4]

**/finance/cap-rate-conv — Cap Rate to Value Calculator**
- Title: Cap Rate to Value Calculator: Net Operating Income
- Keywords: cap rate to value calculator noi capitalization rate property valuation income approach [MEDIUM/3]

**/finance/rule-of-40 — Rule of 40 Calculator**
- Title: Rule of 40 Calculator: Revenue Growth Rate & Profit Margin
- Keywords: rule of 40 calculator saas growth margin software company valuation benchmark [MEDIUM/3]

**/finance/cost-of-delay — Cost of Delay Calculator**
- Title: Cost of Delay Calculator: Value at Stake & Delay
- Keywords: cost of delay calculator product launch revenue lost month project management [MEDIUM/3]

## 5.10 Fitness & Exercise Calculators — `fitness/` (42 tools)

**/fitness/running-pace — Running Pace & Split Times**
- Title: Running Pace & Split Times: Distance, Target Pace
- Keywords: running pace calculator splits [MEDIUM/3] · target pace finish time [MEDIUM/3] · race split calculator [MEDIUM/3]

**/fitness/race-predictor — Race Time Predictor**
- Title: Race Time Predictor: Known Distance & Known Time
- Keywords: race time predictor [MEDIUM/3]

**/fitness/steps-to-distance — Steps to Distance Calculator**
- Title: Steps to Distance Calculator: Steps & Height
- Keywords: steps to km calculator [EASY/2]

**/fitness/max-heart-rate — Max Heart Rate Calculator**
- Title: Max Heart Rate Calculator: Age
- Keywords: max heart rate [MEDIUM/3]

**/fitness/recovery-hr — Heart Rate Recovery**
- Title: Heart Rate Recovery: Peak HR & HR After 1 Min
- Keywords: heart rate recovery [MEDIUM/3]

**/fitness/vo2max — VO2 Max Estimator**
- Title: VO2 Max Estimator: Resting HR & Age
- Keywords: vo2 max calculator [MEDIUM/3]

**/fitness/calories-exercise — Exercise Calorie Burn**
- Title: Exercise Calorie Burn: Weight & Duration
- Keywords: calories burned exercise [MEDIUM/4]

**/fitness/body-fat-fitness — Body Fat % from BMI**
- Title: Body Fat % from BMI: Weight, Height & Age
- Keywords: body fat percentage from bmi [EASY/2] · body fat estimate without calipers [EASY/2] · deurenberg body fat formula [EASY/2]

**/fitness/pullup-test — Pull-Up Test Standards**
- Title: Pull-Up Test Standards: Max Pull-ups
- Keywords: pullup test standards [MEDIUM/3]

**/fitness/flexibility-score — Sit & Reach Test**
- Title: Sit & Reach Test: Sit & Reach & Age
- Keywords: flexibility test sit reach [MEDIUM/3]

**/fitness/sports-calories — Sports Calorie Calculator**
- Title: Sports Calorie Calculator: Weight & Duration
- Keywords: sports calories burned [MEDIUM/4]

**/fitness/calories-burned — Calories Burned at Rest (BMR)**
- Title: Calories Burned at Rest (BMR): Weight, Height & Age
- Keywords: resting calories burned [MEDIUM/4]

**/fitness/one-rep-max — One-Rep Max Calculator**
- Title: One-Rep Max Calculator: Weight Lifted & Reps Performed
- Keywords: one rep max calculator [MEDIUM/3]

**/fitness/training-max — Training Max Calculator**
- Title: Training Max Calculator: 1RM
- Keywords: training max calculator [MEDIUM/3]

**/fitness/weight-loss — Weight Loss Pace Calculator**
- Title: Weight Loss Pace Calculator: Current Weight, Goal Weight
- Keywords: weight loss pace calculator [MEDIUM/4]

**/fitness/muscle-gain — Muscle Gain Calculator**
- Title: Muscle Gain Calculator: Current Weight, Height
- Keywords: muscle gain calculator [MEDIUM/3]

**/fitness/pushup-test — Push-Up Test Standards**
- Title: Push-Up Test Standards: Max Push-ups & Age
- Keywords: pushup test standards [MEDIUM/3]

**/fitness/squat-standards — Squat Standards by Body Weight**
- Title: Squat Standards by Body Weight: Max Squat & Body Weight
- Keywords: squat standards by weight [EASY/2]

**/fitness/bench-standards — Bench Press Standards**
- Title: Bench Press Standards: Max Bench & Body Weight
- Keywords: bench press standards [MEDIUM/3]

**/fitness/deadlift-standards — Deadlift Standards by Weight**
- Title: Deadlift Standards by Weight: Max Deadlift & Body Weight
- Keywords: deadlift standards by weight calculator [EASY/2]

**/fitness/overhead-standards — Overhead Press Standards**
- Title: Overhead Press Standards: Max OHP & Body Weight
- Keywords: overhead press standards [MEDIUM/3]

**/fitness/plank-test — Plank Hold Standards**
- Title: Plank Hold Standards: Plank Hold & Age
- Keywords: plank hold standards [MEDIUM/3]

**/fitness/grip-strength — Grip Strength Standards**
- Title: Grip Strength Standards: Grip Strength & Age
- Keywords: grip strength standards [MEDIUM/3]

**/fitness/burpee-test — Burpee Test Calculator**
- Title: Burpee Test Calculator: Burpees in 1 Minute
- Keywords: burpee test calculator fitness level count [MEDIUM/3]

**/fitness/situp-test — Sit-Up Test Calculator**
- Title: Sit-Up Test Calculator: Sit-Ups in 1 Minute
- Keywords: situp test calculator ab endurance minute [MEDIUM/3]

**/fitness/row-standards — Rowing Standards**
- Title: Rowing Standards: 500m Split & Distance
- Keywords: rowing standards calculator split 500m time [MEDIUM/3]

**/fitness/swim-pace — Swim Pace Calculator**
- Title: Swim Pace Calculator: Total Time & Distance
- Keywords: swim pace calculator 100m pool time [MEDIUM/3]

**/fitness/cycling-speed — Cycling Speed & Time**
- Title: Cycling Speed & Time: Distance & Avg Speed
- Keywords: cycling speed calculator time distance km [MEDIUM/3]

**/fitness/cadence-calc — Cycling Cadence Calculator**
- Title: Cycling Cadence Calculator: Cadence, Wheel Diameter
- Keywords: cadence calculator cycling rpm speed gear [MEDIUM/3]

**/fitness/stride-length — Stride Length Calculator**
- Title: Stride Length Calculator: Height
- Keywords: stride length calculator walking running height [MEDIUM/3]

**/fitness/training-volume — Weekly Training Volume**
- Title: Weekly Training Volume: Sets per Exercise, Reps per Set
- Keywords: training volume calculator sets reps weight tonnage [MEDIUM/4]

**/fitness/vertical-jump — Vertical Jump Power**
- Title: Vertical Jump Power: Jump Height & Body Weight
- Keywords: vertical jump calculator power watts test [MEDIUM/3]

**/fitness/beep-test — Beep Test (VO2 Max) Estimator**
- Title: Beep Test (VO2 Max) Estimator: Level Reached & Shuttles
- Keywords: beep test calculator vo2 max shuttle level [MEDIUM/3]

**/fitness/bodyweight-ratio — Bodyweight Strength Ratio**
- Title: Bodyweight Strength Ratio: Your Lift & Body Weight
- Keywords: bodyweight ratio calculator lift standards relative strength [MEDIUM/3]

**/fitness/deload-week — Deload Week Planner**
- Title: Deload Week Planner: Normal Sets/Exercise, Normal 1RM %
- Keywords: deload week planner calculator volume reduce [MEDIUM/3]

**/fitness/workout-rest — Workout Rest Timer**
- Title: Workout Rest Timer: Optimal Rest Between
- Keywords: rest timer calculator workout between sets seconds [EASY/2]

**/fitness/treadmill-pace — Treadmill Incline Pace Calculator**
- Title: Treadmill Incline Pace Calculator: Speed & Incline
- Keywords: treadmill pace calculator incline equivalent effort [MEDIUM/3]

**/fitness/rowing-split — Rowing Split Calculator**
- Title: Rowing Split Calculator: Distance, Minutes & Seconds
- Keywords: rowing split calculator erg watts 500m pace [MEDIUM/3]

**/fitness/sweat-rate — Sweat Rate Calculator**
- Title: Sweat Rate Calculator: Pre-exercise Weight
- Keywords: sweat rate calculator hydration fluid loss exercise weight change athlete [MEDIUM/4]

**/fitness/rpe-load — Training Load Calculator (sRPE)**
- Title: Training Load Calculator (sRPE): Session RPE & Duration
- Keywords: session rpe training load calculator perceived exertion load monitoring athletes [MEDIUM/3]

**/fitness/vo2-beep — Beep Test VO₂ Max Estimator**
- Title: Beep Test VO₂ Max Estimator: Level Reached, Starting
- Keywords: beep test calculator vo2 max shuttle run 20m multistage fitness estimate [MEDIUM/3]

**/fitness/resting-metabolic — Resting Metabolic Rate Calculator (Cunningham)**
- Title: Resting Metabolic Rate Calculator (Cunningham)
- Keywords: resting metabolic rate calculator cunningham fat free mass rmr athletes [EASY/2]

## 5.11 Food & Nutrition Calculators — `food/` (37 tools)

**/food/daily-calorie — Daily Calorie Needs**
- Title: Daily Calorie Needs: Age, Weight & Height
- Keywords: daily calorie calculator [MEDIUM/4]

**/food/macro-split — Macro Split Calculator**
- Title: Macro Split Calculator: Daily Calories
- Keywords: macro split calculator [MEDIUM/3]

**/food/protein-need — Daily Protein Need**
- Title: Daily Protein Need: Weight
- Keywords: protein need calculator [MEDIUM/3]

**/food/daily-water-intake — Daily Water Intake**
- Title: Daily Water Intake: Weight & Exercise
- Keywords: water intake calculator [MEDIUM/3]

**/food/weight-loss-time — Weight Loss Timeline**
- Title: Weight Loss Timeline: Current Weight, Goal Weight
- Keywords: weight loss timeline [MEDIUM/4]

**/food/body-fat-food — Body Fat % (US Navy)**
- Title: Body Fat % (US Navy): Height, Waist & Hip
- Keywords: body fat calculator us navy [MEDIUM/3]

**/food/calorie-burned — Calories Burned (Activity)**
- Title: Calories Burned (Activity): Weight & Duration
- Keywords: calories burned activity [MEDIUM/4]

**/food/recipe-scaler — Recipe Scaler**
- Title: Recipe Scaler: Original Servings, Desired Servings
- Keywords: recipe scaler calculator [MEDIUM/3]

**/food/cooking-time — Cooking Time Adjuster**
- Title: Cooking Time Adjuster: Actual Weight, Recipe Weight
- Keywords: cooking time adjuster [MEDIUM/3]

**/food/meal-prep — Meal Prep Cost**
- Title: Meal Prep Cost: Total Cost & Servings
- Keywords: meal prep cost [MEDIUM/3]

**/food/unit-converter-food — Food Unit Converter**
- Title: Food Unit Converter: Cups
- Keywords: food unit converter [MEDIUM/3]

**/food/eat-out-vs-cook — Eating Out vs Cooking**
- Title: Eating Out vs Cooking: Meals Out/Week, Cost/Meal Out
- Keywords: eat out vs cook [EASY/2]

**/food/fast-food-calories — Fast Food Calories**
- Title: Fast Food Calories: Step-by-Step Calculator
- Keywords: fast food calories [MEDIUM/4]

**/food/keto-macro — Keto Macro Calculator**
- Title: Keto Macro Calculator: Weight, Height & Age
- Keywords: keto macro calculator [MEDIUM/3]

**/food/intermittent-fasting — IF Schedule Planner**
- Title: IF Schedule Planner: Wake Time
- Keywords: if schedule planner calculator [EASY/2]

**/food/vegan-protein — Vegan Protein Sources**
- Title: Vegan Protein Sources: Weight
- Keywords: vegan protein calculator [MEDIUM/3]

**/food/grocery-per-person — Grocery Cost/Person**
- Title: Grocery Cost/Person: Adults & Children
- Keywords: grocery cost per person [EASY/2]

**/food/baking-converter — Baking Substitution**
- Title: Baking Substitution: Baking Substitution Ratios
- Keywords: baking substitution calculator [MEDIUM/3]

**/food/coffee-cost-per-cup — Coffee Cost per Cup**
- Title: Coffee Cost per Cup: Cups per Day, Home Cost per Cup
- Keywords: coffee per cup [MEDIUM/3]

**/food/tea-vs-coffee — Tea vs Coffee Cost**
- Title: Tea vs Coffee Cost: Tea Cups/Day, Tea per Cup
- Keywords: tea vs coffee [MEDIUM/3] · coffee cost comparison [MEDIUM/3]

**/food/sugar-intake — Daily Sugar Intake**
- Title: Daily Sugar Intake: Age, Added Sugar per Day & Weight
- Keywords: daily sugar intake calculator [EASY/2]

**/food/carb-calculator — Carb Calculator**
- Title: Carb Calculator: Daily Calories & Carbs %
- Keywords: carb calculator daily carbs grams percentage [EASY/2]

**/food/fiber-need — Daily Fiber Need**
- Title: Daily Fiber Need: Daily Calories
- Keywords: fiber calculator daily grams need [EASY/2]

**/food/calorie-per-meal — Calories per Meal**
- Title: Calories per Meal: Daily Calories, Meals per Day & Snacks
- Keywords: calories per meal calculator split breakfast lunch dinner [EASY/2]

**/food/rice-water — Rice Water Ratio**
- Title: Rice Water Ratio: Water Needed
- Keywords: rice water ratio calculator cups rice [MEDIUM/3]

**/food/meat-cooking-time — Meat Cooking Time**
- Title: Meat Cooking Time: Weight
- Keywords: meat cooking time calculator roast per pound kg [EASY/2]

**/food/egg-boil — Egg Boiling Time**
- Title: Egg Boiling Time: Perfect Egg Boiling
- Keywords: egg boil time calculator soft medium hard [MEDIUM/3]

**/food/smoothie-calories — Smoothie Calories**
- Title: Smoothie Calories: Fruit, Milk/Yogurt & Bananas
- Keywords: smoothie calorie calculator ingredients fruit yogurt [MEDIUM/4]

**/food/protein-per-dollar — Protein per Dollar**
- Title: Protein per Dollar: Price, Weight & Protein per 100g
- Keywords: protein per dollar calculator value grams cost [EASY/2]

**/food/sodium-intake — Sodium Intake Tracker**
- Title: Sodium Intake Tracker: Processed Foods, Salt Added
- Keywords: sodium intake calculator mg salt daily [EASY/2]

**/food/caffeine-daily — Caffeine Calculator**
- Title: Caffeine Calculator: Coffee, Tea & Energy Drinks
- Keywords: caffeine calculator coffee tea energy drink mg [MEDIUM/3]

**/food/pizza-slices — Pizza Calculator**
- Title: Pizza Calculator: People, Slices per Person & Pizzas Ordered
- Keywords: pizza calculator slices per person party [EASY/2]

**/food/meal-prep-size — Meal Prep Batch Size**
- Title: Meal Prep Batch Size: Recipe Servings, Batches to Make
- Keywords: meal prep batch size calculator portions recipe servings [MEDIUM/3]

**/food/sugar-limit — Added Sugar Limit**
- Title: Added Sugar Limit: Daily Calories & Current Added Sugar
- Keywords: sugar limit calculator added grams daily [EASY/2]

**/food/alcohol-calories — Alcohol Calorie Calculator**
- Title: Alcohol Calorie Calculator: Volume, ABV & Number of Drinks
- Keywords: alcohol calorie calculator beer wine spirits ethanol [MEDIUM/4]

**/food/oven-conversion — Oven Temperature Converter**
- Title: Oven Temperature Converter: Recipe Temp & Recipe Time
- Keywords: oven temperature conversion fan conventional [MEDIUM/3]

**/food/homebrew-abv — Homebrew ABV Calculator**
- Title: Homebrew ABV Calculator: Original Gravity & Final Gravity
- Keywords: homebrew abv calculator original gravity final gravity beer alcohol brewing [MEDIUM/3]

## 5.12 Health & Fitness Calculators — `health/` (66 tools)

**/health/bmi — BMI Calculator**
- Title: BMI Calculator: Weight & Height
- Keywords: bmi calculator for men and women [EASY/2] · body mass index calculator with age [EASY/2] · body mass index [MEDIUM/3]

**/health/bmr — BMR Calculator**
- Title: BMR Calculator: Weight, Height & Age
- Keywords: bmr calculator for women over 50 [EASY/2] · calorie burn calculator at rest [MEDIUM/4] · basal metabolic rate [MEDIUM/3]

**/health/calorie — Calorie Calculator**
- Title: Calorie Calculator: Weight, Height & Age
- Keywords: daily calorie intake calculator to lose weight [EASY/2] · maintenance calorie calculator with activity level [EASY/2]

**/health/body-fat — Body Fat Calculator**
- Title: Body Fat Calculator: Weight, Waist & Neck
- Keywords: body fat percentage navy method calculator [EASY/2] · body fat calculator with measurements [EASY/2] · body fat calculator [MEDIUM/3] · body fat percentage [MEDIUM/4]

**/health/water-intake-health — Water Intake Calculator**
- Title: Water Intake Calculator: Weight & Activity
- Keywords: daily water intake calculator by weight [EASY/2] · how much water should i drink calculator [EASY/2]

**/health/ideal-body-weight — Ideal Weight Calculator**
- Title: Ideal Weight Calculator: Devine Formula
- Keywords: ideal weight calculator [MEDIUM/4]

**/health/heart-rate — Heart Rate Zone Calculator**
- Title: Heart Rate Zone Calculator: Age
- Keywords: max heart rate calculator by age [EASY/2]

**/health/pregnancy — Pregnancy Due Date**
- Title: Pregnancy Due Date: Last Menstrual Period
- Keywords: pregnancy due date calculator by last period [EASY/2] · pregnancy week calculator from conception [EASY/2] · pregnancy due date [MEDIUM/4]

**/health/ovulation — Ovulation Calculator**
- Title: Ovulation Calculator: Last Period Date & Cycle Length
- Keywords: free ovulation calculator [MEDIUM/4]

**/health/macros — Macronutrient Calculator**
- Title: Macronutrient Calculator: Daily Calories, Protein & Carbs
- Keywords: macro calculator for lean bulking [EASY/2] · protein carb fat macro calculator [MEDIUM/3] · protein carbs fat [MEDIUM/3]

**/health/lean-body-mass — Lean Body Mass**
- Title: Lean Body Mass: Weight & Body Fat
- Keywords: lean body mass [MEDIUM/3]

**/health/bsa — Body Surface Area**
- Title: Body Surface Area: Weight & Height
- Keywords: body surface area [MEDIUM/3]

**/health/waist-hip — Waist-to-Hip Ratio**
- Title: Waist-to-Hip Ratio: Whr
- Keywords: waist to hip ratio [MEDIUM/3]

**/health/vo2-max — VO2 Max Calculator**
- Title: VO2 Max Calculator: 1.5 Mile Run & Age
- Keywords: vo2 max estimation cooper test [MEDIUM/3]

**/health/pregnancy-weight — Pregnancy Weight Gain**
- Title: Pregnancy Weight Gain: Pre-pregnancy BMI
- Keywords: pregnancy weight gain [MEDIUM/4]

**/health/blood-pressure — Blood Pressure Category**
- Title: Blood Pressure Category: Systolic & Diastolic
- Keywords: blood pressure category calculator [MEDIUM/3]

**/health/calorie-burn — Calorie Burn Calculator**
- Title: Calorie Burn Calculator: Weight, Activity & Duration
- Keywords: calories burned calculator by activity [EASY/2]

**/health/sleep — Sleep Calculator**
- Title: Sleep Calculator: Best Time To Wake Up
- Keywords: free sleep calculator [MEDIUM/3]

**/health/gfr — GFR Calculator**
- Title: GFR Calculator: Serum Creatinine & Age
- Keywords: free gfr calculator [MEDIUM/3]

**/health/target-heart-rate — Target Heart Rate Zones**
- Title: Target Heart Rate Zones: Age & Resting Heart Rate
- Keywords: target heart rate zone calculator [MEDIUM/3] · target heart rate [MEDIUM/3] · heart rate zones [MEDIUM/3]

**/health/sleep-quality — Sleep Quality Score**
- Title: Sleep Quality Score: Hours in Bed, Hours Asleep
- Keywords: sleep calculator [MEDIUM/3] · sleep quality [MEDIUM/3] · sleep score [MEDIUM/3] · sleep duration [MEDIUM/3]

**/health/fatigue-score — Fatigue Score Calculator**
- Title: Fatigue Score Calculator: Avg Sleep Last 3 Days
- Keywords: fatigue calculator [MEDIUM/3] · tiredness score [MEDIUM/3] · energy level [MEDIUM/3] · wellness [MEDIUM/3]

**/health/body-fat-navy — Navy Body Fat Calculator**
- Title: Navy Body Fat Calculator: Waist, Neck & Height
- Keywords: navy body fat calculator tape measure waist neck [MEDIUM/3]

**/health/calorie-deficit — Calorie Deficit Calculator**
- Title: Calorie Deficit Calculator: Daily Deficit & Duration
- Keywords: calorie deficit calculator weight loss [MEDIUM/4]

**/health/heart-rate-zones — Heart Rate Zones**
- Title: Heart Rate Zones: Age & Resting HR
- Keywords: heart rate zones calculator training karvonen [MEDIUM/3]

**/health/ideal-weight — Ideal Body Weight**
- Title: Ideal Body Weight: Devine, Hamwi & Robinson
- Keywords: ideal body weight calculator ibw hamwi devine [EASY/2]

**/health/fasting-calculator — Fasting Timer Calculator**
- Title: Fasting Timer Calculator: Last Meal Hour
- Keywords: intermittent fasting calculator timer autophagy [MEDIUM/3]

**/health/sleep-debt — Sleep Debt Calculator**
- Title: Sleep Debt Calculator: Hours Needed/Night, Avg Hours
- Keywords: sleep debt calculator deficit recovery [MEDIUM/3]

**/health/met-calories — MET Value / Calories Burned**
- Title: MET Value / Calories Burned: MET Value, Body Weight
- Keywords: met calculator calories burned metabolic equivalent [MEDIUM/4]

**/health/body-type — Body Type Calculator**
- Title: Body Type Calculator: Height, Wrist Circumference
- Keywords: body type calculator somatotype [MEDIUM/3]

**/health/iron-intake — Iron Intake Calculator**
- Title: Iron Intake Calculator: Age
- Keywords: iron intake calculator daily requirement anemia [EASY/2]

**/health/vitamin-d-dosage — Vitamin D Dosage**
- Title: Vitamin D Dosage: Current Level & Target Level
- Keywords: vitamin d dosage calculator supplement iu [MEDIUM/3]

**/health/calorie-goal — Calorie Surplus/Deficit Goal**
- Title: Calorie Surplus/Deficit Goal: TDEE & Weeks
- Keywords: calorie surplus deficit goal calculator [MEDIUM/4]

**/health/burn-severity — Burn Severity Calculator**
- Title: Burn Severity Calculator: Head, Torso & Left Arm
- Keywords: burn calculator rule of nines tbsa severity [MEDIUM/3]

**/health/drug-dosage — Drug Dosage Calculator**
- Title: Drug Dosage Calculator: Patient Weight, Dose per kg
- Keywords: drug dosage calculator medication dose mg/kg [EASY/2]

**/health/trimester-date — Pregnancy Trimester Calculator**
- Title: Pregnancy Trimester Calculator: Last Menstrual Period
- Keywords: pregnancy calculator due date trimester weeks [MEDIUM/4]

**/health/ovulation-calculator — Ovulation & Fertile Window**
- Title: Ovulation & Fertile Window: Cycle Length, Luteal Phase
- Keywords: ovulation calculator fertile window days [MEDIUM/4]

**/health/cholesterol-ratio — Cholesterol Ratio & LDL**
- Title: Cholesterol Ratio & LDL: Total Cholesterol, HDL
- Keywords: cholesterol ratio calculator ldl non hdl friedewald [MEDIUM/3]

**/health/nap-planner — Nap Planner & Sleep Cycles**
- Title: Nap Planner & Sleep Cycles: Wake Time & Wake Time
- Keywords: nap calculator sleep cycle best time to nap [EASY/2]

**/health/maffetone-hr — MAF Heart Rate (Aerobic Base)**
- Title: MAF Heart Rate (Aerobic Base): Age
- Keywords: maffetone method heart rate 180 formula aerobic [EASY/2]

**/health/health-insurance-copay — Health Insurance Cost Share**
- Title: Health Insurance Cost Share: Annual Deductible
- Keywords: health insurance copay coinsurance deductible out of pocket calculator [MEDIUM/3]

**/health/hba1c-eag — HbA1c to eAG Converter**
- Title: HbA1c to eAG Converter: Step-by-Step Calculator
- Keywords: hba1c to eag converter estimated average glucose mmol mol mg dl diabetes [MEDIUM/3]

**/health/glycemic-load — Glycemic Load Calculator**
- Title: Glycemic Load Calculator: Glycemic Index & Carbs per Serving
- Keywords: glycemic load calculator glycemic index carbs per serving [EASY/2]

**/health/waist-height-ratio — Waist-to-Height Ratio Calculator**
- Title: Waist-to-Height Ratio Calculator: Whtr
- Keywords: waist to height ratio calculator whtr health risk [MEDIUM/3]

**/health/map-calculator — Mean Arterial Pressure Calculator**
- Title: Mean Arterial Pressure Calculator: Systolic & Diastolic
- Keywords: mean arterial pressure calculator map blood pressure [MEDIUM/3]

**/health/ldl-calculator — LDL Cholesterol Calculator**
- Title: LDL Cholesterol Calculator: Total Cholesterol, HDL
- Keywords: ldl calculator friedewald cholesterol trig [MEDIUM/3]

**/health/iv-drip-rate — IV Drip Rate Calculator**
- Title: IV Drip Rate Calculator: Volume, Time & Drop Factor
- Keywords: iv drip rate calculator gtt min infusion [MEDIUM/3]

**/health/creatinine-clearance — Creatinine Clearance Calculator**
- Title: Creatinine Clearance Calculator: Age, Weight
- Keywords: creatinine clearance calculator cockcroft gault kidney function renal dosing gfr estimate [MEDIUM/3]

**/health/anion-gap — Anion Gap Calculator**
- Title: Anion Gap Calculator: Sodium Na⁺, Chloride Cl⁻
- Keywords: anion gap calculator metabolic acidosis electrolytes sodium chloride bicarbonate [MEDIUM/3]

**/health/qtc — QTc Calculator (Bazett)**
- Title: QTc Calculator (Bazett): Measured QT & Heart Rate
- Keywords: qtc calculator bazett corrected qt interval ecg long qt syndrome [MEDIUM/3]

**/health/ponderal-index — Ponderal Index Calculator**
- Title: Ponderal Index Calculator: Weight & Height
- Keywords: ponderal index calculator body mass infant neonatal corpulence height normalized [MEDIUM/3]

**/health/bmr-mifflin — Mifflin-St Jeor BMR Calculator**
- Title: Mifflin-St Jeor BMR Calculator: Weight, Height & Age
- Keywords: mifflin st jeor bmr calculator basal metabolic rate [MEDIUM/4]

**/health/tdee-macro — TDEE and Macro Calculator**
- Title: TDEE and Macro Calculator: Weight, Height & Age
- Keywords: tdee calculator macro split protein carb fat daily calories [EASY/2]

**/health/gfr-estimate — eGFR Calculator (CKD-EPI 2021)**
- Title: eGFR Calculator (CKD-EPI 2021): Serum Creatinine, Age & Sex
- Keywords: egfr calculator ckd-epi 2021 creatinine kidney function gfr [MEDIUM/3]

**/health/chw — Adjusted Body Weight Calculator**
- Title: Adjusted Body Weight Calculator: Measured Weight
- Keywords: adjusted body weight calculator amputee limb loss percentage [EASY/2]

**/health/gcs — Glasgow Coma Scale Calculator**
- Title: Glasgow Coma Scale Calculator: Eye response
- Keywords: glasgow coma scale calculator gcs eye verbal motor trauma score [MEDIUM/3]

**/health/apgar — APGAR Score Calculator**
- Title: APGAR Score Calculator: Appearance/color, Pulse
- Keywords: apgar score calculator newborn appearance pulse grimace activity respiration [MEDIUM/3]

**/health/vaccination-schedule — Vaccination Due Calculator**
- Title: Vaccination Due Calculator: Child Age
- Keywords: vaccination schedule calculator child immunization due cdc [EASY/2]

**/health/pediatric-dose — Pediatric Dose Calculator**
- Title: Pediatric Dose Calculator: Child Weight, Dose Rate
- Keywords: pediatric dose calculator mg per kg child weight medication [EASY/2]

**/health/corrected-calcium — Corrected Calcium Calculator**
- Title: Corrected Calcium Calculator: Measured Calcium & Albumin
- Keywords: corrected calcium calculator albumin payne formula hypocalcemia [EASY/2]

**/health/winters-formula — Winter's Formula Calculator**
- Title: Winter's Formula Calculator: Bicarbonate
- Keywords: winters formula calculator metabolic acidosis compensation pco2 expected [EASY/2]

**/health/maintenance-fluids — Maintenance Fluids Calculator (4-2-1)**
- Title: Maintenance Fluids Calculator (4-2-1): Weight
- Keywords: maintenance fluids calculator 4-2-1 rule pediatric hourly rate Holliday Segar [MEDIUM/3]

**/health/free-water-deficit — Free Water Deficit Calculator**
- Title: Free Water Deficit Calculator: Serum Sodium & Weight
- Keywords: free water deficit calculator hypernatremia sodium correction dehydration [EASY/2]

**/health/serum-osmolality — Serum Osmolality Calculator**
- Title: Serum Osmolality Calculator: Sodium, Glucose & BUN
- Keywords: serum osmolality calculator sodium glucose bun calculated plasma osm gap [MEDIUM/3]

**/health/total-body-water — Total Body Water Calculator**
- Title: Total Body Water Calculator: Weight, Height & Age
- Keywords: total body water calculator watson formula tbw hydration [EASY/2]

**/health/pf-ratio — P/F Ratio Calculator**
- Title: P/F Ratio Calculator: PaO₂ & FiO₂
- Keywords: pf ratio calculator pao2 fio2 oxygenation ards berlin criteria [MEDIUM/3]

## 5.13 Home & Garden Calculators — `homegarden/` (49 tools)

**/homegarden/room-area — Room Area & Flooring Calculator**
- Title: Room Area & Flooring Calculator: Length, Width & Waste %
- Keywords: room area & flooring calculator [MEDIUM/3]

**/homegarden/wallpaper-rolls — Wallpaper Rolls Needed Calculator**
- Title: Wallpaper Rolls Needed Calculator: Total Wall
- Keywords: wallpaper rolls needed calculator [MEDIUM/3]

**/homegarden/fence-material — Fence Material Calculator**
- Title: Fence Material Calculator: Perimeter, Fence Height
- Keywords: fence material calculator [MEDIUM/3]

**/homegarden/deck-stain — Deck Stain & Sealant Calculator**
- Title: Deck Stain & Sealant Calculator: Deck Length, Deck Width
- Keywords: deck stain & sealant calculator [MEDIUM/3]

**/homegarden/curtain-length — Curtain Length & Fabric Calculator**
- Title: Curtain Length & Fabric Calculator: Window Width
- Keywords: curtain length & fabric calculator [MEDIUM/3]

**/homegarden/rug-size — Rug Size & Room Fit Calculator**
- Title: Rug Size & Room Fit Calculator: Room Length, Room Width
- Keywords: rug size & room fit calculator [MEDIUM/3]

**/homegarden/lighting-rooms — Room Lighting Needs Calculator**
- Title: Room Lighting Needs Calculator: Room Length, Room Width
- Keywords: room lighting needs calculator [MEDIUM/3]

**/homegarden/paint-cost — Paint Cost Estimator**
- Title: Paint Cost Estimator: Total Sq Ft, Gallons Needed
- Keywords: room painting cost [MEDIUM/3]

**/homegarden/ac-size — AC/BTU Size Calculator**
- Title: AC/BTU Size Calculator: Room Length, Room Width
- Keywords: air conditioner size [MEDIUM/3]

**/homegarden/water-heater — Water Heater Size Calculator**
- Title: Water Heater Size Calculator: Showers per Hour
- Keywords: hot water tank [MEDIUM/3]

**/homegarden/generator-size — Generator Size Calculator**
- Title: Generator Size Calculator: Refrigerator, AC Unit & Lights
- Keywords: generator size calculator [MEDIUM/3]

**/homegarden/garden-soil — Garden Soil & Mulch Calculator**
- Title: Garden Soil & Mulch Calculator: Bed Length, Bed Width
- Keywords: raised bed soil [MEDIUM/3]

**/homegarden/plant-spacing — Plant Spacing & Quantity Calculator**
- Title: Plant Spacing & Quantity Calculator: Bed Length, Bed
- Keywords: how many plants [MEDIUM/3]

**/homegarden/grass-seed — Grass Seed Calculator**
- Title: Grass Seed Calculator: Lawn Area
- Keywords: grass seed calculator [MEDIUM/3]

**/homegarden/fertilizer — Fertilizer Application Calculator**
- Title: Fertilizer Application Calculator: Area & N Needed
- Keywords: fertilizer application calculator [MEDIUM/3]

**/homegarden/compost — Compost Bin Size Calculator**
- Title: Compost Bin Size Calculator: People in Household
- Keywords: compost bin size calculator [MEDIUM/3]

**/homegarden/rain-barrel — Rain Barrel / Rainwater Harvesting Calculator**
- Title: Rain Barrel / Rainwater Harvesting Calculator: Roof
- Keywords: rain barrel / rainwater harvesting calculator [MEDIUM/3]

**/homegarden/irrigation-flow — Garden Irrigation Flow Rate Calculator**
- Title: Garden Irrigation Flow Rate Calculator: Garden Area
- Keywords: garden irrigation flow rate calculator [MEDIUM/3]

**/homegarden/pool-size — Pool Water Volume Calculator**
- Title: Pool Water Volume Calculator: Length, Width & Deep End Depth
- Keywords: pool water volume calculator [MEDIUM/3]

**/homegarden/pool-chemicals — Pool Chemical Balance Calculator**
- Title: Pool Chemical Balance Calculator: Pool Volume
- Keywords: pool chemical balance calculator [MEDIUM/3]

**/homegarden/furniture-arrange — Furniture Room Layout Calculator**
- Title: Furniture Room Layout Calculator: Room Width, Room Length
- Keywords: furniture room layout calculator [MEDIUM/3]

**/homegarden/tv-mount-height — TV Mount Height Calculator**
- Title: TV Mount Height Calculator: TV Size, Seat Eye Height
- Keywords: tv mount height calculator [MEDIUM/3]

**/homegarden/stair-calculator — Staircase Dimensions Calculator**
- Title: Staircase Dimensions Calculator: Total Rise, Max
- Keywords: staircase dimensions calculator [MEDIUM/3]

**/homegarden/countertop-sqft — Countertop Square Footage Calculator**
- Title: Countertop Square Footage Calculator: Section 1
- Keywords: kitchen counter sqft [MEDIUM/3]

**/homegarden/closet-organizer — Closet Organizer Size Calculator**
- Title: Closet Organizer Size Calculator: Closet Width
- Keywords: closet organizer size calculator [MEDIUM/3]

**/homegarden/cabinet-door — Cabinet & Drawer Size Calculator**
- Title: Cabinet & Drawer Size Calculator: Cabinet Width
- Keywords: cabinet & drawer size calculator [MEDIUM/3]

**/homegarden/tile-grout — Tile Grout & Mortar Calculator**
- Title: Tile Grout & Mortar Calculator: Tile Area & Grout Line Width
- Keywords: tile grout & mortar calculator [MEDIUM/3]

**/homegarden/light-bulb-save — LED Bulb Savings Calculator**
- Title: LED Bulb Savings Calculator: Current Bulb Wattage
- Keywords: energy saving bulbs [MEDIUM/3] · LED vs incandescent [MEDIUM/3] · light bulb cost [MEDIUM/3]

**/homegarden/home-sqft — Home Square Footage Calculator**
- Title: Home Square Footage Calculator: Room Length, Room Width
- Keywords: house square footage [MEDIUM/3]

**/homegarden/kitchen-remodel — Kitchen Remodel Budget Calculator**
- Title: Kitchen Remodel Budget Calculator: Step-by-Step Calculator
- Keywords: kitchen remodel budget calculator [MEDIUM/3]

**/homegarden/roof-sqft — Roof Area Calculator**
- Title: Roof Area Calculator: Home Footprint
- Keywords: roof area calculator [MEDIUM/3]

**/homegarden/vinyl-flooring — Vinyl / Laminate Flooring Calculator**
- Title: Vinyl / Laminate Flooring Calculator: Room Area, Per
- Keywords: vinyl / laminate flooring calculator [MEDIUM/3]

**/homegarden/solar-panel — Solar Panel System Size Calculator**
- Title: Solar Panel System Size Calculator: Monthly
- Keywords: solar panel system size calculator [MEDIUM/3]

**/homegarden/solar-battery — Solar Battery / Home Battery Calculator**
- Title: Solar Battery / Home Battery Calculator: Daily Energy
- Keywords: solar battery / home battery calculator [MEDIUM/4]

**/homegarden/ev-charger-home — Home EV Charger Installation Cost**
- Title: Home EV Charger Installation Cost: Distance from Panel
- Keywords: ev charger installation [MEDIUM/3] · level 2 charger [MEDIUM/3] · charger install cost [MEDIUM/3]

**/homegarden/raised-bed-soil — Raised Bed Soil Calculator**
- Title: Raised Bed Soil Calculator: Length, Width & Depth
- Keywords: raised bed soil calculator cubic feet quarts bags [EASY/2]

**/homegarden/garden-fence — Garden Fence Calculator**
- Title: Garden Fence Calculator: Length, Width & Height
- Keywords: garden fence calculator perimeter posts roll [MEDIUM/3]

**/homegarden/lawn-watering — Lawn Watering Calculator**
- Title: Lawn Watering Calculator: Lawn Length, Lawn Width & Water
- Keywords: lawn watering calculator gallons sprinkler inches [EASY/2]

**/homegarden/sprinkler-heads — Sprinkler Head Count**
- Title: Sprinkler Head Count: Zone Length, Zone Width
- Keywords: sprinkler heads calculator coverage spacing zone [MEDIUM/3]

**/homegarden/compost-bin — Compost Bin Calculator**
- Title: Compost Bin Calculator: People in Household & Yard Waste
- Keywords: compost bin calculator size garden waste volume [MEDIUM/3]

**/homegarden/firepit-size — Firepit Size Calculator**
- Title: Firepit Size Calculator: Firepit Diameter, Stone Length
- Keywords: firepit calculator ring stones size diameter [MEDIUM/3]

**/homegarden/deck-post — Deck Post Spacing**
- Title: Deck Post Spacing: Deck Length, Joist Spacing & Max
- Keywords: deck post spacing calculator joist span lumber [MEDIUM/3]

**/homegarden/porch-light — Porch Light Size**
- Title: Porch Light Size: Mounting Height & Door Width
- Keywords: porch light calculator size wattage lumens [MEDIUM/3]

**/homegarden/ceiling-fan-size — Ceiling Fan Size Calculator**
- Title: Ceiling Fan Size Calculator: Room Length, Room Width
- Keywords: ceiling fan size calculator room blade span CFM [MEDIUM/3]

**/homegarden/humidifier-size — Humidifier Size Calculator**
- Title: Humidifier Size Calculator: Room Size, Current RH %
- Keywords: humidifier size calculator gallons room square feet [EASY/2]

**/homegarden/tree-spacing — Tree Spacing Calculator**
- Title: Tree Spacing Calculator: Area Length, Area Width & Spacing
- Keywords: tree spacing calculator planting distance orchard [MEDIUM/3]

**/homegarden/grout-calc — Tile Grout Calculator**
- Title: Tile Grout Calculator: Tile Area, Tile Length & Tile Width
- Keywords: tile grout calculator coverage bags [MEDIUM/3]

**/homegarden/appliance-cost — Appliance Running Cost Calculator**
- Title: Appliance Running Cost Calculator: Appliance Wattage
- Keywords: appliance cost calculator electricity kwh running [MEDIUM/3]

**/homegarden/firewood — Firewood Calculator**
- Title: Firewood Calculator: Stack Length, Stack Height & Log Depth
- Keywords: firewood calculator cord volume cost [MEDIUM/3]

## 5.14 Lifestyle & Home Calculators — `lifestyle/` (47 tools)

**/lifestyle/relocation-cost — Moving Cost Calculator**
- Title: Moving Cost Calculator: Moving Distance, Movers
- Keywords: moving cost calculator [MEDIUM/3]

**/lifestyle/rental-deposit — Rental Deposit Return Calculator**
- Title: Rental Deposit Return Calculator: Security Deposit
- Keywords: rental deposit return calculator [MEDIUM/3]

**/lifestyle/paint-coverage — Paint Coverage Calculator**
- Title: Paint Coverage Calculator: Room Width, Room Length
- Keywords: paint coverage calculator [MEDIUM/3]

**/lifestyle/electricity-bill-saving — Electricity Bill Savings Calculator**
- Title: Electricity Bill Savings Calculator: Current Monthly
- Keywords: electricity bill savings calculator [MEDIUM/3]

**/lifestyle/water-usage — Water Usage & Cost Calculator**
- Title: Water Usage & Cost Calculator: Showers per Week, Avg
- Keywords: water usage & cost calculator [MEDIUM/3]

**/lifestyle/grocery-budget-optimizer — Grocery Budget Optimizer**
- Title: Grocery Budget Optimizer: Adults, Children & Monthly Budget
- Keywords: grocery budget optimizer calculator [MEDIUM/3]

**/lifestyle/food-delivery-vs-cooking — Food Delivery vs Cooking Cost**
- Title: Food Delivery vs Cooking Cost: Menu Price, Delivery Fee
- Keywords: food delivery cost [MEDIUM/3] · cooking vs delivery [MEDIUM/3] · uber eats cost [MEDIUM/3] · door dash cost [MEDIUM/3]

**/lifestyle/coffee-habit — Habit Cost & Opportunity Cost**
- Title: Habit Cost & Opportunity Cost: Cost per Day, Times per
- Keywords: habit cost calculator [MEDIUM/3] · coffee investment opportunity cost [MEDIUM/3] · latte factor calculator [MEDIUM/3]

**/lifestyle/road-trip-cost — Road Trip Cost Calculator**
- Title: Road Trip Cost Calculator: Total Distance, Vehicle MPG
- Keywords: road trip cost [MEDIUM/3] · road trip planner [MEDIUM/3]

**/lifestyle/flight-cost-per-hour — Flight Cost per Hour Calculator**
- Title: Flight Cost per Hour Calculator: Ticket Price, Baggage
- Keywords: cost per hour flying [EASY/2]

**/lifestyle/baby-cost — Baby Cost Calculator**
- Title: Baby Cost Calculator: Diapers per Day, Cost per Diaper
- Keywords: baby cost calculator [MEDIUM/3]

**/lifestyle/parental-leave — Parental Leave Pay Calculator**
- Title: Parental Leave Pay Calculator: Annual Salary, Leave Weeks
- Keywords: parental leave pay calculator [MEDIUM/3]

**/lifestyle/pet-cost — Pet Yearly Cost Calculator**
- Title: Pet Yearly Cost Calculator: Monthly Food, Yearly Vet
- Keywords: pet yearly cost calculator [EASY/2]

**/lifestyle/lawn-mowing — Lawn Mowing Cost Calculator**
- Title: Lawn Mowing Cost Calculator: Lawn Area, Service Cost
- Keywords: lawn mowing cost calculator [MEDIUM/3]

**/lifestyle/gym-cost-per-visit — Gym Cost per Visit Calculator**
- Title: Gym Cost per Visit Calculator: Monthly Fee, Annual Fee
- Keywords: gym membership value [MEDIUM/3] · cost per workout [MEDIUM/3]

**/lifestyle/vacation-savings — Vacation Savings Planner**
- Title: Vacation Savings Planner: Trip Cost, Months Until Trip
- Keywords: vacation savings planner calculator [MEDIUM/3]

**/lifestyle/sale-savings — Sale Savings Calculator**
- Title: Sale Savings Calculator: Original Price, Discount %
- Keywords: sale savings calculator [MEDIUM/3]

**/lifestyle/resell-value — Item Resell Value Estimator**
- Title: Item Resell Value Estimator: Original Price & Years Old
- Keywords: used item value [MEDIUM/3]

**/lifestyle/subscription-audit — Subscription Cost Auditor**
- Title: Subscription Cost Auditor: Streaming, Software
- Keywords: subscription cost auditor calculator [MEDIUM/3]

**/lifestyle/streaming-value — Streaming Service Value Calculator**
- Title: Streaming Service Value Calculator: Monthly Price
- Keywords: cost per hour [MEDIUM/3]

**/lifestyle/charging-time — Phone/Device Charging Time Calculator**
- Title: Phone/Device Charging Time Calculator: Battery
- Keywords: phone/device charging time calculator [MEDIUM/3]

**/lifestyle/gift-split — Group Gift Cost Splitter**
- Title: Group Gift Cost Splitter: Gift Amount, Number of People
- Keywords: group gift cost splitter calculator [MEDIUM/3]

**/lifestyle/hourly-annual-salary — Hourly to Annual Salary Converter**
- Title: Hourly to Annual Salary Converter: Hourly Rate, Hours
- Keywords: hourly to annual salary converter calculator [MEDIUM/4]

**/lifestyle/pet-food-cost — Pet Food Cost Calculator**
- Title: Pet Food Cost Calculator: Food, Treats & Snacks & Vet & Meds
- Keywords: pet food cost [MEDIUM/3] · cat food cost [MEDIUM/3]

**/lifestyle/cleaning-time — Cleaning Time Planner**
- Title: Cleaning Time Planner: Number of Rooms, Bathrooms
- Keywords: cleaning time planner calculator [MEDIUM/3]

**/lifestyle/date-night-cost — Date Night Cost Calculator**
- Title: Date Night Cost Calculator: Dinner, Entertainment
- Keywords: date night cost calculator budget per month [EASY/2]

**/lifestyle/takeout-budget — Takeout Budget Calculator**
- Title: Takeout Budget Calculator: Avg Order & Orders per Week
- Keywords: takeout budget calculator food delivery monthly [EASY/2]

**/lifestyle/home-insurance — Home Insurance Estimate**
- Title: Home Insurance Estimate: Home Value & Rate
- Keywords: home insurance calculator estimate premium coverage [MEDIUM/4]

**/lifestyle/renters-insurance — Renters Insurance Estimate**
- Title: Renters Insurance Estimate: Personal Property Value
- Keywords: renters insurance calculator estimate coverage [MEDIUM/3]

**/lifestyle/car-wash-annual — Car Wash Cost Calculator**
- Title: Car Wash Cost Calculator: Wash Price & Washes per Month
- Keywords: car wash cost calculator annual subscription [MEDIUM/4]

**/lifestyle/haircut-annual — Haircut Annual Cost**
- Title: Haircut Annual Cost: Cost per Visit, Visits per Year & Tip %
- Keywords: haircut cost calculator annual grooming [MEDIUM/3]

**/lifestyle/party-cost — Party Cost Calculator**
- Title: Party Cost Calculator: Guests, Food per Guest & Drinks
- Keywords: party cost calculator per guest budget [EASY/2]

**/lifestyle/gift-budget — Gift Budget Calculator**
- Title: Gift Budget Calculator: People to Gift, Average Gift
- Keywords: gift budget calculator yearly occasions [EASY/2]

**/lifestyle/hobby-cost — Hobby Cost Calculator**
- Title: Hobby Cost Calculator: Supplies, Gear & Classes/Memberships
- Keywords: hobby cost calculator monthly supplies gear [EASY/2]

**/lifestyle/travel-daily — Travel Daily Budget**
- Title: Travel Daily Budget: Lodging, Food & Local Transport
- Keywords: travel daily budget calculator trip cost [EASY/2]

**/lifestyle/furniture-assembly — Furniture Assembly Time**
- Title: Furniture Assembly Time: Number of Pieces
- Keywords: furniture assembly time calculator estimate hours [EASY/2]

**/lifestyle/home-renovation — Home Renovation Budget**
- Title: Home Renovation Budget: Area & Contingency
- Keywords: home renovation budget calculator per square foot [EASY/2]

**/lifestyle/cigarette-cost — Smoking Cost Calculator**
- Title: Smoking Cost Calculator: Price per Pack, Packs per Day
- Keywords: smoking cost calculator cigarettes per year pack [EASY/2]

**/lifestyle/french-press-ratio — French Press Ratio Calculator**
- Title: French Press Ratio Calculator: Water & Ratio
- Keywords: french press ratio calculator coffee grams water brew [EASY/2]

**/lifestyle/cocktail-dilution — Cocktail Dilution Calculator**
- Title: Cocktail Dilution Calculator: Drink Volume, Starting ABV
- Keywords: cocktail dilution calculator abv stir shake ice percent [MEDIUM/3]

**/lifestyle/wine-servings — Wine Servings Calculator**
- Title: Wine Servings Calculator: Bottles & Ounces per Glass
- Keywords: wine servings calculator glasses bottle standard pour [MEDIUM/3]

**/lifestyle/baking-scale — Recipe Scaling Calculator**
- Title: Recipe Scaling Calculator: Original Flour, New Flour
- Keywords: recipe scaling calculator baker percentages flour scale baking [MEDIUM/3]

**/lifestyle/sourdough-hydration — Sourdough Hydration Calculator**
- Title: Sourdough Hydration Calculator: Water & Flour
- Keywords: sourdough hydration calculator dough water flour percent [MEDIUM/3]

**/lifestyle/lawn-fertilizer — Lawn Fertilizer Calculator**
- Title: Lawn Fertilizer Calculator: Lawn Area, Nitrogen Rate
- Keywords: lawn fertilizer calculator nitrogen rate lb per 1000 sq ft product [EASY/2]

**/lifestyle/candle-wax — Candle Wax Calculator**
- Title: Candle Wax Calculator: Number of Jars & Jar Size
- Keywords: candle wax calculator container ounces batch soy [EASY/2]

**/lifestyle/knit-gauge — Knitting Cast-On Calculator**
- Title: Knitting Cast-On Calculator: Finished Width & Gauge
- Keywords: knitting cast on calculator gauge stitches per inch width [EASY/2]

**/lifestyle/quilt-fabric — Quilt Backing Calculator**
- Title: Quilt Backing Calculator: Quilt Width, Quilt Height
- Keywords: quilt backing calculator yardage fabric width seam allowance [MEDIUM/3]

## 5.15 Math Calculators — `math/` (120 tools)

**/math/scientific — Scientific Calculator**
- Title: Scientific Calculator: Advanced Scientific
- Keywords: free scientific calculator [MEDIUM/3]

**/math/quadratic — Quadratic Equation Solver**
- Title: Quadratic Equation Solver: Ax²+Bx+C=0
- Keywords: quadratic equation solver with steps [EASY/2] · solve quadratic equations by factoring calculator [EASY/2]

**/math/percentage — Percentage Calculator**
- Title: Percentage Calculator: Part & Whole
- Keywords: percentage increase calculator between two numbers [EASY/2] · what is the percentage of a number calculator [EASY/2]

**/math/percent-change — Percentage Change**
- Title: Percentage Change: Old Value & New Value
- Keywords: percentage change calculator [MEDIUM/4]

**/math/fraction — Fraction Calculator**
- Title: Fraction Calculator: Numerator 1, Denominator 1
- Keywords: free fraction calculator [MEDIUM/3]

**/math/triangle — Triangle Calculator**
- Title: Triangle Calculator: Side a, Side b & Side c
- Keywords: free triangle calculator [MEDIUM/3]

**/math/circle — Circle Calculator**
- Title: Circle Calculator: Radius
- Keywords: area of circle [MEDIUM/3]

**/math/statistics — Statistics Calculator**
- Title: Statistics Calculator: Data
- Keywords: mean median mode [MEDIUM/3]

**/math/combinations — Combinations Calculator**
- Title: Combinations Calculator: Ncr
- Keywords: free combinations calculator [MEDIUM/3]

**/math/lcm-gcd — LCM & GCD Calculator**
- Title: LCM & GCD Calculator: Number 1 & Number 2
- Keywords: greatest common divisor calculator with steps [EASY/2] · least common multiple calculator of two numbers [MEDIUM/3]

**/math/prime-factor — Prime Factorization**
- Title: Prime Factorization: Number
- Keywords: prime factorization calculator [MEDIUM/3]

**/math/matrix-det — Matrix Determinant**
- Title: Matrix Determinant: Step-by-Step Calculator
- Keywords: matrix determinant calculator [MEDIUM/3]

**/math/logarithm — Logarithm Calculator**
- Title: Logarithm Calculator: Number & Base
- Keywords: free logarithm calculator [MEDIUM/3]

**/math/exponent — Exponent Calculator**
- Title: Exponent Calculator: Base & Exponent
- Keywords: x to the y [MEDIUM/3]

**/math/root — Root Calculator**
- Title: Root Calculator: Number & Root
- Keywords: free root calculator [MEDIUM/3]

**/math/ratio — Ratio Calculator**
- Title: Ratio Calculator: First Term & Second Term
- Keywords: free ratio calculator [MEDIUM/3]

**/math/average — Average Calculator**
- Title: Average Calculator: Numbers
- Keywords: free average calculator [MEDIUM/3]

**/math/pythagorean — Pythagorean Theorem**
- Title: Pythagorean Theorem: Side a & Side b
- Keywords: pythagorean theorem calculator with hypotenuse [EASY/2]

**/math/trigonometry — Trigonometry Calculator**
- Title: Trigonometry Calculator: Angle
- Keywords: sin cos tan [MEDIUM/3]

**/math/distance — Distance Formula**
- Title: Distance Formula: Step-by-Step Calculator
- Keywords: distance formula calculator [MEDIUM/3]

**/math/slope — Slope Calculator**
- Title: Slope Calculator: Step-by-Step Calculator
- Keywords: free slope calculator [MEDIUM/3]

**/math/factorial — Factorial Calculator**
- Title: Factorial Calculator: Headline Value
- Keywords: free factorial calculator [MEDIUM/3]

**/math/modular — Modular Arithmetic**
- Title: Modular Arithmetic: Modulo Operations
- Keywords: modular arithmetic calculator [MEDIUM/3]

**/math/complex — Complex Number Calculator**
- Title: Complex Number Calculator: Real 1, Imag 1 & Real 2
- Keywords: complex number calculator [MEDIUM/3]

**/math/scientific-notation — Scientific Notation Converter**
- Title: Scientific Notation Converter: Number
- Keywords: scientific notation converter calculator [MEDIUM/3]

**/math/random-generator — Random Number Generator**
- Title: Random Number Generator: Min Value, Max Value & How
- Keywords: random generator [MEDIUM/3] · random number [MEDIUM/3] · dice roll [MEDIUM/3] · lottery [MEDIUM/3]

**/math/cubic-equation — Cubic Equation Solver**
- Title: Cubic Equation Solver: Roots
- Keywords: cubic equation solver [MEDIUM/4]

**/math/geometric-seq — Geometric Sequence**
- Title: Geometric Sequence: First Term, Common Ratio & Number
- Keywords: geometric sequence calculator nth term sum [MEDIUM/3]

**/math/arithmetic-seq — Arithmetic Sequence**
- Title: Arithmetic Sequence: First Term, Common Difference
- Keywords: arithmetic sequence calculator [MEDIUM/3]

**/math/polar-rect — Polar ↔ Rectangular**
- Title: Polar ↔ Rectangular: Between Polar
- Keywords: polar to rectangular coordinates converter [MEDIUM/3]

**/math/binomial-prob — Binomial Probability**
- Title: Binomial Probability: Trials, Successes & Probability
- Keywords: binomial probability calculator exact [MEDIUM/3]

**/math/normal-dist — Normal Distribution**
- Title: Normal Distribution: Value, Mean & Std Dev
- Keywords: normal distribution calculator z-score cdf [MEDIUM/3]

**/math/taylor-series — Taylor Series Approximation**
- Title: Taylor Series Approximation: x value & Terms
- Keywords: taylor series approximation calculator polynomial [MEDIUM/3]

**/math/continued-fraction — Continued Fraction**
- Title: Continued Fraction: Partial Numerators
- Keywords: continued fraction calculator evaluate convergent [MEDIUM/3]

**/math/linear-system — System of Linear Equations**
- Title: System of Linear Equations: 2×2 Linear Systems
- Keywords: system of equations solver linear algebra [MEDIUM/3]

**/math/eigenvalue-2x2 — Eigenvalue Finder (2×2)**
- Title: Eigenvalue Finder (2×2): Eigenvalues 2×2 Matrix
- Keywords: eigenvalue calculator 2x2 matrix [MEDIUM/3]

**/math/surface-area-3d — Surface Area Calculator**
- Title: Surface Area Calculator: Dimension 1 & Dimension 2
- Keywords: surface area calculator sphere cylinder cone cube [MEDIUM/3]

**/math/complex-modulus — Complex Number Operations**
- Title: Complex Number Operations: Real Part & Imaginary Part
- Keywords: complex number calculator modulus argument conjugate [MEDIUM/3]

**/math/mean-median-mode — Mean Median Mode Calculator**
- Title: Mean Median Mode Calculator: Data
- Keywords: mean median mode calculator average [MEDIUM/3]

**/math/variance-sd — Variance & Standard Deviation**
- Title: Variance & Standard Deviation: Data
- Keywords: variance standard deviation calculator sample population [MEDIUM/3]

**/math/permutation — Permutation Calculator**
- Title: Permutation Calculator: P(N,R) Ordered Arrangements
- Keywords: permutation calculator npr arrangements [MEDIUM/3]

**/math/binomial-theorem — Binomial Expansion**
- Title: Binomial Expansion: Expand (A+B)ⁿ
- Keywords: binomial expansion calculator coefficient [MEDIUM/3]

**/math/golden-ratio — Golden Ratio Calculator**
- Title: Golden Ratio Calculator: Fibonacci index
- Keywords: golden ratio phi fibonacci calculator [MEDIUM/3]

**/math/checksum-luhn — Luhn Algorithm / Checksum**
- Title: Luhn Algorithm / Checksum: Number to check
- Keywords: luhn algorithm checksum validator calculator [MEDIUM/3]

**/math/run-length — Run-Length Encoding**
- Title: Run-Length Encoding: String to encode
- Keywords: run length encoding compression calculator [MEDIUM/3]

**/math/sieve-prime — Sieve of Eratosthenes**
- Title: Sieve of Eratosthenes: All Primes
- Keywords: sieve of eratosthenes prime numbers calculator [MEDIUM/3]

**/math/fibonacci-seq — Fibonacci Sequence**
- Title: Fibonacci Sequence: Generate n terms
- Keywords: fibonacci sequence generator calculator [MEDIUM/3]

**/math/pascal-triangle — Pascal's Triangle Row**
- Title: Pascal's Triangle Row: Row number
- Keywords: pascal's triangle row calculator [MEDIUM/3]

**/math/collatz — Collatz Sequence Length**
- Title: Collatz Sequence Length: Starting number
- Keywords: collatz conjecture steps calculator 3n+1 [EASY/2]

**/math/modular-exp — Modular Exponentiation**
- Title: Modular Exponentiation: Base, Exponent & Modulus
- Keywords: modular exponentiation calculator fast power [MEDIUM/3]

**/math/norm-dist-range — Normal Distribution Range**
- Title: Normal Distribution Range: Lower bound, Upper bound & Mean
- Keywords: normal distribution probability range calculator [MEDIUM/3]

**/math/dot-cross-product — Dot & Cross Product**
- Title: Dot & Cross Product: Vector Dot Product
- Keywords: vector dot product cross product calculator 3d [MEDIUM/3]

**/math/bayes-theorem — Bayes Theorem Calculator**
- Title: Bayes Theorem Calculator: P Prior, P & P
- Keywords: bayes theorem calculator conditional probability [MEDIUM/3]

**/math/matrix-multiply — Matrix Multiplication**
- Title: Matrix Multiplication: Multiply Two 2×2
- Keywords: matrix multiplication calculator 2x2 [MEDIUM/3]

**/math/distance-formula — Distance Between Two Points**
- Title: Distance Between Two Points: Point 1 x, Point 1 y & Point
- Keywords: distance formula calculator two points euclidean [EASY/2]

**/math/slope-intercept — Slope-Intercept Form**
- Title: Slope-Intercept Form: Point 1 x, Point 1 y & Point 2 x
- Keywords: slope intercept form calculator line equation [MEDIUM/4]

**/math/zscore-calc — Z-Score Calculator**
- Title: Z-Score Calculator: Value, Mean & Std Dev
- Keywords: z score calculator standard score percentile [MEDIUM/3]

**/math/linear-regression — Linear Regression**
- Title: Linear Regression: X values & Y values
- Keywords: linear regression calculator least squares slope intercept r squared best fit [EASY/2]

**/math/pearson-correlation — Pearson Correlation Coefficient**
- Title: Pearson Correlation Coefficient: X values & Y values
- Keywords: pearson correlation coefficient calculator r value linear relationship [MEDIUM/3]

**/math/confidence-interval — Confidence Interval for a Mean**
- Title: Confidence Interval for a Mean: Sample Mean, Sample Std
- Keywords: confidence interval calculator mean z score margin of error [MEDIUM/3]

**/math/sample-size — Sample Size Calculator**
- Title: Sample Size Calculator: Margin of Error
- Keywords: sample size calculator margin of error confidence level population proportion [MEDIUM/3]

**/math/poisson-probability — Poisson Probability**
- Title: Poisson Probability: Mean Rate & Events
- Keywords: poisson distribution probability calculator lambda events [MEDIUM/3]

**/math/harmonic-mean — Harmonic Mean**
- Title: Harmonic Mean: Data
- Keywords: harmonic mean calculator average rates speeds [MEDIUM/3]

**/math/moving-average — Moving Average (SMA)**
- Title: Moving Average (SMA): Data & Window
- Keywords: moving average calculator simple sma time series smoothing [EASY/2]

**/math/standard-error — Standard Error of the Mean**
- Title: Standard Error of the Mean: Data
- Keywords: standard error of the mean calculator sem sampling [MEDIUM/3]

**/math/chi-square — Chi-Square Test**
- Title: Chi-Square Test: Observed & Expected
- Keywords: chi square test calculator goodness of fit observed expected [MEDIUM/3]

**/math/t-test — Two-Sample T-Test**
- Title: Two-Sample T-Test: Welch'S
- Keywords: t test calculator two sample independent welch means [MEDIUM/3]

**/math/hypergeometric — Hypergeometric Probability**
- Title: Hypergeometric Probability: Population, Successes
- Keywords: hypergeometric distribution probability calculator without replacement [EASY/2]

**/math/significant-figures — Significant Figures**
- Title: Significant Figures: Number
- Keywords: significant figures calculator sig figs rounding precision [MEDIUM/3]

**/math/matrix-inverse — 2×2 Matrix Inverse**
- Title: 2×2 Matrix Inverse: Step-by-Step Calculator
- Keywords: matrix inverse calculator 2x2 determinant [MEDIUM/3]

**/math/midpoint — Midpoint Calculator**
- Title: Midpoint Calculator: Point 1 x, Point 1 y & Point 2 x
- Keywords: midpoint calculator two points coordinate [MEDIUM/3]

**/math/trapezoid — Trapezoid Area**
- Title: Trapezoid Area: Base a, Base b & Height
- Keywords: trapezoid area calculator trapezium bases height [MEDIUM/3]

**/math/sector-area — Circle Sector Area**
- Title: Circle Sector Area: Radius & Central Angle
- Keywords: sector area calculator circle radius angle [MEDIUM/3]

**/math/pyramid — Square Pyramid Volume**
- Title: Square Pyramid Volume: Base Side & Height
- Keywords: pyramid volume calculator square base height [MEDIUM/3]

**/math/vector-add — Vector Addition Calculator**
- Title: Vector Addition Calculator: Add
- Keywords: vector addition calculator subtract magnitude [MEDIUM/3]

**/math/angle-between-vectors — Angle Between Vectors Calculator**
- Title: Angle Between Vectors Calculator: Step-by-Step Calculator
- Keywords: angle between two vectors calculator dot product [EASY/2]

**/math/annulus-area — Annulus (Ring) Area Calculator**
- Title: Annulus (Ring) Area Calculator: Outer Radius & Inner Radius
- Keywords: annulus area calculator ring washer outer inner radius [MEDIUM/3]

**/math/hexagon-area — Hexagon Area Calculator**
- Title: Hexagon Area Calculator: Side Length
- Keywords: hexagon area calculator regular side [MEDIUM/3]

**/math/parallelogram-area — Parallelogram Area Calculator**
- Title: Parallelogram Area Calculator: Base & Height
- Keywords: parallelogram area calculator base height [MEDIUM/3]

**/math/ellipse-area — Ellipse Area Calculator**
- Title: Ellipse Area Calculator: Semi-Major Axis & Semi-Minor Axis
- Keywords: ellipse area calculator semi major minor axis [MEDIUM/3]

**/math/law-of-sines — Law of Sines Calculator**
- Title: Law of Sines Calculator: Known Side a, Angle A & Angle B
- Keywords: law of sines calculator side angle triangle [MEDIUM/3]

**/math/law-of-cosines — Law of Cosines Calculator**
- Title: Law of Cosines Calculator: Side a, Side b & Included Angle C
- Keywords: law of cosines calculator side angle [MEDIUM/3]

**/math/weighted-average — Weighted Average Calculator**
- Title: Weighted Average Calculator: Values & Weights
- Keywords: weighted average calculator grades weights [EASY/2]

**/math/coefficient-of-variation — Coefficient of Variation Calculator**
- Title: Coefficient of Variation Calculator: Data
- Keywords: coefficient of variation calculator cv relative standard deviation [MEDIUM/3]

**/math/quartile — Quartile & IQR Calculator**
- Title: Quartile & IQR Calculator: Data
- Keywords: quartile calculator iqr q1 q3 box plot [MEDIUM/3]

**/math/percent-error — Percent Error Calculator**
- Title: Percent Error Calculator: Measured Value
- Keywords: percent error calculator measured true [MEDIUM/3]

**/math/quartiles — Quartile Calculator**
- Title: Quartile Calculator: Data
- Keywords: quartile calculator q1 q3 interquartile range iqr five number summary box plot [MEDIUM/3]

**/math/rms — Root Mean Square Calculator**
- Title: Root Mean Square Calculator: Values
- Keywords: rms calculator root mean square effective value ac signal voltage [MEDIUM/3]

**/math/covariance — Covariance Calculator**
- Title: Covariance Calculator: X values & Y values
- Keywords: covariance calculator sample population correlation direction relationship [MEDIUM/3]

**/math/exponential-prob — Exponential Distribution Calculator**
- Title: Exponential Distribution Calculator: Rate λ & Time
- Keywords: exponential distribution calculator probability wait time rate lambda reliability [MEDIUM/3]

**/math/expected-value — Expected Value Calculator**
- Title: Expected Value Calculator: Outcomes & Probabilities
- Keywords: expected value calculator probability weighted average outcomes ev decision making [EASY/2]

**/math/euler-totient — Euler Totient Calculator**
- Title: Euler Totient Calculator: Integers Are
- Keywords: euler totient calculator phi function coprime rsa number theory [MEDIUM/3]

**/math/completing-square — Completing the Square Calculator**
- Title: Completing the Square Calculator: Coefficient of
- Keywords: completing the square calculator vertex form quadratic solver [MEDIUM/4]

**/math/partial-fractions — Partial Fraction Calculator**
- Title: Partial Fraction Calculator: Split 1/(Px+Q)(Rx+S)
- Keywords: partial fraction decomposition calculator algebra rational expression [MEDIUM/3]

**/math/direct-variation — Direct Variation Calculator**
- Title: Direct Variation Calculator: Known value 1 & Known value 2
- Keywords: direct variation calculator y kx constant of proportionality [MEDIUM/3]

**/math/inverse-variation — Inverse Variation Calculator**
- Title: Inverse Variation Calculator: Known value 1 & Known value 2
- Keywords: inverse variation calculator y equals k over x constant [EASY/2]

**/math/spherical-cap — Spherical Cap Volume Calculator**
- Title: Spherical Cap Volume Calculator: Sphere Radius & Cap Height
- Keywords: spherical cap calculator volume dome segment surface area [MEDIUM/3]

**/math/nth-root — Nth Root Calculator**
- Title: Nth Root Calculator: Number & Root Index
- Keywords: nth root calculator cube root fourth root radical index [MEDIUM/3]

**/math/series-sum-ap — Arithmetic Series Sum**
- Title: Arithmetic Series Sum: First Term, Common Difference
- Keywords: arithmetic series sum calculator sequence common difference gauss [MEDIUM/3]

**/math/sigma-notation — Sum of Squares Calculator**
- Title: Sum of Squares Calculator: Upper Limit n
- Keywords: sum of squares calculator sigma notation series formula [EASY/2]

**/math/combination-repeat — Combinations with Repetition**
- Title: Combinations with Repetition: Distinct Types & Picks
- Keywords: combinations with repetition calculator multiset stars and bars [EASY/2]

**/math/permutation-repeat — Permutations with Repetition**
- Title: Permutations with Repetition: Symbols & Positions
- Keywords: permutations with repetition calculator n^k arrangements passwords [EASY/2]

**/math/probability-odds — Odds to Probability**
- Title: Odds to Probability: Odds For & Odds Against
- Keywords: odds to probability calculator a to b chance convert percent [MEDIUM/3]

**/math/negative-binomial — Negative Binomial Probability**
- Title: Negative Binomial Probability: Target Successes
- Keywords: negative binomial calculator kth success trial probability [MEDIUM/3]

**/math/circle-through-points — Circumradius Calculator**
- Title: Circumradius Calculator: Side a, Side b & Side c
- Keywords: circumradius calculator triangle circumcircle abc 4K [MEDIUM/3]

**/math/secant-tangent — Secant-Tangent Length**
- Title: Secant-Tangent Length: External Secant Segment
- Keywords: secant tangent calculator power of a point circle geometry [MEDIUM/3]

**/math/inscribed-angle — Inscribed Angle Calculator**
- Title: Inscribed Angle Calculator: Central Angle
- Keywords: inscribed angle calculator central angle circle theorem half [MEDIUM/3]

**/math/sector-perimeter — Sector Perimeter Calculator**
- Title: Sector Perimeter Calculator: Radius & Sector Angle
- Keywords: sector perimeter calculator arc length radius angle pie [MEDIUM/3]

**/math/ellipse-perimeter — Ellipse Perimeter Calculator**
- Title: Ellipse Perimeter Calculator: Semi-major Axis
- Keywords: ellipse perimeter calculator circumference ramanujan approximation [MEDIUM/3]

**/math/rectangular-solid — Box Diagonal Calculator**
- Title: Box Diagonal Calculator: Length, Width & Height
- Keywords: rectangular box diagonal calculator 3d cuboid space diagonal [MEDIUM/3]

**/math/triangular-prism — Triangular Prism Volume**
- Title: Triangular Prism Volume: Triangle Base, Triangle Height
- Keywords: triangular prism volume calculator base area length [MEDIUM/3]

**/math/octahedron-volume — Octahedron Volume**
- Title: Octahedron Volume: Regular 8-Faced Solid
- Keywords: octahedron volume calculator regular platonic solid edge [MEDIUM/3]

**/math/icosahedron-volume — Icosahedron Volume**
- Title: Icosahedron Volume: Regular 20-Faced Solid
- Keywords: icosahedron volume calculator platonic solid edge golden ratio [MEDIUM/3]

**/math/bitwise-xor — Bitwise XOR Calculator**
- Title: Bitwise XOR Calculator: First Integer & Second Integer
- Keywords: bitwise xor calculator exclusive or binary bits integer [MEDIUM/3]

**/math/shift-cipher — Caesar Shift Cipher**
- Title: Caesar Shift Cipher: Text, Shift & 1 = encode, 0 = decode
- Keywords: caesar cipher calculator shift encode decode rot13 [MEDIUM/3]

**/math/units-per-person — Per Person Split**
- Title: Per Person Split: Total Amount & People
- Keywords: per person calculator divide total people split share [EASY/2]

**/math/rate-x-time — Distance = Rate × Time**
- Title: Distance = Rate × Time: Known Value 1 & Known Value 2
- Keywords: distance rate time calculator speed travel d rt [MEDIUM/3]

**/math/work-rate-together — Combined Work Rate**
- Title: Combined Work Rate: Worker A Time Alone & Worker B
- Keywords: work rate together calculator combined time two workers job [MEDIUM/3]

**/math/digital-root — Digital Root Calculator**
- Title: Digital Root Calculator: Number
- Keywords: digital root calculator digit sum casting out nines divisibility [MEDIUM/3]

**/math/mixture-percent — Mixture Concentration**
- Title: Mixture Concentration: Volume of Solution 1
- Keywords: mixture calculator concentration percent mixing solutions alligation [MEDIUM/3]

## 5.16 Parenting & Family Calculators — `family/` (38 tools)

**/family/baby-weight-gain — Baby Weight Percentile**
- Title: Baby Weight Percentile: Age & Weight
- Keywords: baby weight percentile [MEDIUM/4]

**/family/baby-feeding — Baby Feeding Schedule**
- Title: Baby Feeding Schedule: Age, Weight & Feedings/Day
- Keywords: baby feeding schedule [MEDIUM/3]

**/family/baby-sleep — Baby Sleep Schedule**
- Title: Baby Sleep Schedule: Age
- Keywords: baby sleep schedule [MEDIUM/3]

**/family/child-height — Child Height Predictor**
- Title: Child Height Predictor: Father & Mother
- Keywords: child height predictor [MEDIUM/3]

**/family/toddler-screen — Screen Time Limits**
- Title: Screen Time Limits: Age & Current
- Keywords: screen time limits [MEDIUM/3]

**/family/child-bmi — Children BMI Percentile**
- Title: Children BMI Percentile: Age, Weight & Height
- Keywords: child bmi percentile [MEDIUM/4]

**/family/family-budget — Family Monthly Budget**
- Title: Family Monthly Budget: Income, Housing & Food Plan
- Keywords: family budget planner [MEDIUM/3]

**/family/childcare-cost — Childcare Cost Comparison**
- Title: Childcare Cost Comparison: Children, Daycare/Child/Week
- Keywords: childcare cost comparison [MEDIUM/3]

**/family/college-savings — 529 College Savings**
- Title: 529 College Savings: Child Age, Monthly Savings
- Keywords: college savings 529 [MEDIUM/3]

**/family/maternity-leave — UK Statutory Maternity Pay**
- Title: UK Statutory Maternity Pay: Average Weekly Earnings
- Keywords: statutory maternity pay uk smp calculator [EASY/2]

**/family/life-insurance — Life Insurance Need**
- Title: Life Insurance Need: Annual Income, Total Debts
- Keywords: life insurance need [MEDIUM/3]

**/family/home-buying — Home Buying Budget**
- Title: Home Buying Budget: Annual Income, Down Payment
- Keywords: home buying budget [MEDIUM/4]

**/family/wedding-budget — Wedding Budget Planner**
- Title: Wedding Budget Planner: Total Budget
- Keywords: wedding budget planner [MEDIUM/3]

**/family/baby-name — Baby Name Popularity**
- Title: Baby Name Popularity: Name & Year
- Keywords: baby name popularity [MEDIUM/3]

**/family/college-savings-monthly — College Savings Calculator**
- Title: College Savings Calculator: Child Age, Annual College
- Keywords: college savings calculator [MEDIUM/3]

**/family/childcare-cost-annual — Childcare Cost Calculator**
- Title: Childcare Cost Calculator: Child Age & Days/Week
- Keywords: childcare cost calculator [MEDIUM/3]

**/family/family-budget-simple — Family Budget Calculator**
- Title: Family Budget Calculator: Quick Monthly Split
- Keywords: family budget calculator [MEDIUM/3]

**/family/maternity-leave-finance — Maternity Leave Budget Planner**
- Title: Maternity Leave Budget Planner: Monthly Expenses
- Keywords: maternity leave budget [MEDIUM/3] · savings needed maternity leave [MEDIUM/3]

**/family/paternity-leave — US Paid Family Leave Planner**
- Title: US Paid Family Leave Planner: Annual Salary, Leave Weeks
- Keywords: paid family leave calculator paternity us state [EASY/2]

**/family/kid-allowance — Allowance Calculator**
- Title: Allowance Calculator: Child Age & Chores Per Week
- Keywords: free allowance calculator [MEDIUM/3]

**/family/babysitter-rate — Babysitter Rate Calculator**
- Title: Babysitter Rate Calculator: Number of Kids & Hours Needed
- Keywords: babysitter rate calculator [MEDIUM/3]

**/family/screen-time — Screen Time Guidelines**
- Title: Screen Time Guidelines: Child Age
- Keywords: screen time guidelines for kids [EASY/2]

**/family/diaper-cost — Diaper Cost Calculator**
- Title: Diaper Cost Calculator: Diapers/Day, Cost per Diaper
- Keywords: diaper cost calculator [MEDIUM/3]

**/family/vacation-with-kids — Family Vacation Cost**
- Title: Family Vacation Cost: Family Size & Days
- Keywords: family vacation cost calculator [MEDIUM/3]

**/family/baby-formula — Baby Formula Amount**
- Title: Baby Formula Amount: Baby Weight, Age & Feedings per Day
- Keywords: baby formula amount calculator per feeding oz ml [EASY/2]

**/family/diaper-needs — Diaper Needs Calculator**
- Title: Diaper Needs Calculator: Diapers per Day, Price per
- Keywords: diaper calculator per day cost newborn stock [EASY/2]

**/family/kids-shoe-size — Kids Shoe Size Converter**
- Title: Kids Shoe Size Converter: US Size
- Keywords: kids shoe size converter toddler US UK EU [EASY/2]

**/family/family-meal-cost — Family Meal Cost**
- Title: Family Meal Cost: Family Members, Cost per Serving
- Keywords: family meal cost calculator per serving weekly [EASY/2]

**/family/school-supplies — School Supplies Budget**
- Title: School Supplies Budget: Children & Budget per Child
- Keywords: school supplies budget calculator back to school per child [EASY/2]

**/family/birthday-party-cost — Kids Birthday Party Cost**
- Title: Kids Birthday Party Cost: Kids Invited, Venue Cost
- Keywords: kids birthday party cost calculator guests venue [MEDIUM/3]

**/family/allowance-calc — Child Allowance Calculator**
- Title: Child Allowance Calculator: Child Age
- Keywords: child allowance calculator weekly chores age [EASY/2]

**/family/teen-budget — Teen Budget Calculator**
- Title: Teen Budget Calculator: Monthly Income, Save % & Spend %
- Keywords: teen budget calculator monthly income spending [EASY/2]

**/family/inheritance-estate — Estate Planning Calculator**
- Title: Estate Planning Calculator: Total Assets, Debts & Exemption
- Keywords: estate planning calculator inheritance tax net worth [MEDIUM/4]

**/family/sibling-age-gap — Sibling Age Gap**
- Title: Sibling Age Gap: Older Child Birth & Younger Child Birth
- Keywords: sibling age gap calculator years difference [MEDIUM/4]

**/family/childcare-weekly — Childcare Weekly Cost**
- Title: Childcare Weekly Cost: Hours per Week, Hourly Rate
- Keywords: childcare cost calculator weekly hourly babysitter daycare [EASY/2]

**/family/baby-milestones — Baby Milestones Guide**
- Title: Baby Milestones Guide: Baby Age
- Keywords: baby milestones calculator month development typical age [MEDIUM/4]

**/family/child-support-split — Child Support Split Calculator**
- Title: Child Support Split Calculator: Your Monthly Income
- Keywords: child support split calculator income share percentage parents [EASY/2]

**/family/family-tree-generation — Ancestor Count Calculator**
- Title: Ancestor Count Calculator: Generations Back
- Keywords: family tree ancestor count calculator generations genealogy doubling [MEDIUM/3]

## 5.17 Regional Calculators (India/PK/UAE) — `regional/` (42 tools)

**/regional/fd-calculator — Fixed Deposit (FD) Calculator**
- Title: Fixed Deposit (FD) Calculator: Deposit Amount
- Keywords: fixed deposit calculator [MEDIUM/3]

**/regional/rd-calculator — Recurring Deposit (RD) Calculator**
- Title: Recurring Deposit (RD) Calculator: Monthly
- Keywords: monthly savings india [MEDIUM/3]

**/regional/ppf-calculator — PPF Calculator**
- Title: PPF Calculator: Annual Investment, PPF Rate & Tenure
- Keywords: public provident fund [MEDIUM/3] · tax saving india [MEDIUM/4]

**/regional/nps-calculator — National Pension System (NPS) Calculator**
- Title: National Pension System (NPS) Calculator: Current
- Keywords: national pension system [MEDIUM/3]

**/regional/sip-return — SIP Return Calculator**
- Title: SIP Return Calculator: Monthly SIP, Expected Return
- Keywords: mutual fund sip [MEDIUM/3] · step-up sip [MEDIUM/3]

**/regional/income-tax-india — Income Tax Calculator India**
- Title: Income Tax Calculator India: Annual Income & Old
- Keywords: income tax calculator india [EASY/2] · old vs new tax [EASY/2]

**/regional/gst-india — GST Calculator India**
- Title: GST Calculator India: Amount
- Keywords: gst calculator india calculator [EASY/2]

**/regional/stamp-duty — Stamp Duty & Registration Calculator**
- Title: Stamp Duty & Registration: Total Property Cost
- Keywords: stamp duty calculator [MEDIUM/3] · property cost india [MEDIUM/3]

**/regional/home-loan-emi-india — Home Loan EMI Calculator India**
- Title: Home Loan EMI Calculator India: Loan Amount, Interest
- Keywords: home loan emi [MEDIUM/4] · home loan tax benefit india [EASY/2]

**/regional/gold-rate — Gold Rate Calculator**
- Title: Gold Rate Calculator: Weight, Gold Rate per Gram
- Keywords: gold rate calculator [MEDIUM/3]

**/regional/pk-salary — Pakistan Salary Calculator**
- Title: Pakistan Salary Calculator: Gross Monthly Salary, Tax
- Keywords: salary calculator pakistan [MEDIUM/4] · income tax pakistan [MEDIUM/4] · take home salary pak [MEDIUM/4]

**/regional/gold-rate-pk — Gold Rate Calculator Pakistan**
- Title: Gold Rate Calculator Pakistan: Gold, Rate per Tola
- Keywords: gold rate pakistan [MEDIUM/3] · gold price karachi [MEDIUM/3] · gold per tola [MEDIUM/3] · 22k gold pakistan [MEDIUM/3]

**/regional/rickshaw-fare — Rickshaw/Auto Fare Calculator**
- Title: Rickshaw/Auto Fare Calculator: Distance, Base Fare & Per
- Keywords: tuk tuk fare [MEDIUM/3] · taxi fare india [MEDIUM/3]

**/regional/electricity-bill-india — Electricity Bill Calculator India**
- Title: Electricity Bill Calculator India: Units Consumed
- Keywords: electricity bill india [MEDIUM/3]

**/regional/lpg-cost — LPG Cylinder Cost Calculator**
- Title: LPG Cylinder Cost Calculator: Cylinder Price, Subsidy
- Keywords: lpg price india [MEDIUM/3]

**/regional/wedding-budget-shaadi — Wedding Budget Calculator (Shaadi)**
- Title: Wedding Budget Calculator (Shaadi): Venue
- Keywords: wedding planner india [MEDIUM/3]

**/regional/dubai-salary — Dubai/UAE Salary Calculator**
- Title: Dubai/UAE Salary Calculator: Annual Salary
- Keywords: tax free salary [MEDIUM/4]

**/regional/gold-silver — Gold to Silver Ratio**
- Title: Gold to Silver Ratio: Gold Rate per Gram & Silver Rate
- Keywords: gold silver ratio [MEDIUM/3] · gold silver price [MEDIUM/3]

**/regional/chit-fund — Chit Fund Calculator**
- Title: Chit Fund Calculator: Chit Amount, Months & Commission
- Keywords: chit fund calculator [MEDIUM/3]

**/regional/gratuity — Gratuity Calculator**
- Title: Gratuity Calculator: Last Basic + DA, Years of Service
- Keywords: 15 days salary [MEDIUM/4]

**/regional/leave-encashment — Leave Encashment Calculator**
- Title: Leave Encashment Calculator: Basic Salary, DA
- Keywords: leave encashment calculator [MEDIUM/3]

**/regional/epf-calculator — EPF Calculator (India)**
- Title: EPF Calculator (India): Basic + DA, Your Age
- Keywords: epf calculator india provident fund balance interest [EASY/2]

**/regional/esic-calculator — ESIC Contribution Calculator**
- Title: ESIC Contribution Calculator: Gross Salary
- Keywords: esic calculator india employee state insurance contribution [EASY/2]

**/regional/tds-calculator — TDS Calculator (Salary)**
- Title: TDS Calculator (Salary): Annual Income & Deductions 80C etc
- Keywords: tds calculator india tax deducted at source salary [EASY/2]

**/regional/hra-exemption — HRA Exemption Calculator**
- Title: HRA Exemption Calculator: Basic Salary, HRA Received
- Keywords: hra exemption calculator india house rent allowance [EASY/2]

**/regional/capital-gains-india — Capital Gains Calculator (India)**
- Title: Capital Gains Calculator (India): Purchase Price
- Keywords: capital gains tax calculator india property shares LTCG [EASY/2]

**/regional/sukanya-samriddhi — Sukanya Samriddhi Account**
- Title: Sukanya Samriddhi Account: Annual Deposit, Years
- Keywords: sukanya samriddhi calculator india girl child scheme [EASY/2]

**/regional/nsc-interest — NSC Interest Calculator**
- Title: NSC Interest Calculator: Investment, Years & Interest Rate
- Keywords: nsc interest calculator india national savings certificate [EASY/2]

**/regional/senior-savings-scheme — Senior Citizens Savings Scheme**
- Title: Senior Citizens Savings Scheme: Deposit & Rate
- Keywords: senior citizens savings scheme calculator india scss [EASY/2]

**/regional/post-office-savings — Post Office Savings Calculator**
- Title: Post Office Savings Calculator: Monthly Deposit, Years
- Keywords: post office savings calculator india recurring deposit RD [EASY/2]

**/regional/uae-vat — UAE VAT Calculator**
- Title: UAE VAT Calculator: Amount
- Keywords: uae vat calculator 5 percent value added tax [EASY/2]

**/regional/zakat-calculator — Zakat Calculator**
- Title: Zakat Calculator: Cash & Bank, Gold/Silver Value
- Keywords: zakat calculator 2.5 percent islamic wealth [MEDIUM/3]

**/regional/pk-income-tax — Pakistan Income Tax**
- Title: Pakistan Income Tax: Annual Income
- Keywords: pakistan income tax calculator salaried FBR [MEDIUM/4]

**/regional/gold-silver-ratio — Gold-Silver Ratio**
- Title: Gold-Silver Ratio: Gold Price/oz & Silver Price/oz
- Keywords: gold silver ratio calculator oz [MEDIUM/3]

**/regional/gratuity-calculator — Gratuity Calculator (India)**
- Title: Gratuity Calculator (India): Last Drawn Basic + DA
- Keywords: gratuity calculator india payment of gratuity act [EASY/2]

**/regional/stamp-duty-india — Stamp Duty & Registration (India)**
- Title: Stamp Duty (India): State-Wise Charges & Fees
- Keywords: stamp duty calculator india property registration charges [EASY/2]

**/regional/gst-calculator — GST Payable (Input Tax Credit)**
- Title: GST Payable (Input Tax Credit): Taxable Sales
- Keywords: gst payable calculator input tax credit itc business liability [EASY/2]

**/regional/uk-ni — UK National Insurance Calculator**
- Title: UK National Insurance Calculator: Annual Salary
- Keywords: uk national insurance calculator ni contributions [EASY/2]

**/regional/us-fica — FICA Tax Calculator**
- Title: FICA Tax Calculator: Annual Wages
- Keywords: fica calculator social security medicare withholding [MEDIUM/3]

**/regional/canada-cpp — Canada CPP Contribution Calculator**
- Title: Canada CPP Contribution Calculator: Annual Employment Income
- Keywords: canada cpp calculator contribution pension [EASY/2]

**/regional/australia-super — Australia Superannuation Calculator**
- Title: Australia Superannuation Calculator: Annual Salary
- Keywords: australia super calculator superannuation guarantee [EASY/2]

**/regional/singapore-cpf — Singapore CPF Calculator**
- Title: Singapore CPF Calculator: Monthly Salary
- Keywords: singapore cpf calculator contribution employee employer [MEDIUM/3]

## 5.18 Science Calculators — `science/` (82 tools)

**/science/ohms-law — Ohm's Law Calculator**
- Title: Ohm's Law Calculator: Voltage & Current
- Keywords: ohms law calculator voltage current resistance [MEDIUM/3] · free ohms law calculator [EASY/2]

**/science/density — Density Calculator**
- Title: Density Calculator: Mass & Volume
- Keywords: density mass volume calculator with units [EASY/2]

**/science/force — Force Calculator**
- Title: Force Calculator: Mass & Acceleration
- Keywords: force mass acceleration calculator [MEDIUM/3]

**/science/pressure — Pressure Calculator**
- Title: Pressure Calculator: Force & Area
- Keywords: free pressure calculator [MEDIUM/3]

**/science/kinetic-energy — Kinetic Energy Calculator**
- Title: Kinetic Energy Calculator: Mass & Velocity
- Keywords: kinetic energy calculator [MEDIUM/3]

**/science/potential-energy — Potential Energy Calculator**
- Title: Potential Energy Calculator: Mass, Height & Gravity
- Keywords: potential energy calculator [MEDIUM/3]

**/science/ph — pH Calculator**
- Title: pH Calculator: H+ Concentration
- Keywords: free ph calculator [MEDIUM/3]

**/science/ideal-gas — Ideal Gas Law**
- Title: Ideal Gas Law: Pressure, Volume & Temperature
- Keywords: ideal gas law [MEDIUM/4]

**/science/momentum — Momentum Calculator**
- Title: Momentum Calculator: Mass & Velocity
- Keywords: free momentum calculator [MEDIUM/3]

**/science/doppler — Doppler Effect Calculator**
- Title: Doppler Effect Calculator: Source Frequency
- Keywords: doppler effect calculator [MEDIUM/3]

**/science/half-life — Half-Life Calculator**
- Title: Half-Life Calculator: Initial Amount, Half-Life
- Keywords: free half-life calculator [EASY/2]

**/science/wavelength — Wavelength Calculator**
- Title: Wavelength Calculator: Wave Speed & Frequency
- Keywords: free wavelength calculator [MEDIUM/3]

**/science/acceleration — Acceleration Calculator**
- Title: Acceleration Calculator: Initial Velocity, Final Velocity
- Keywords: free acceleration calculator [MEDIUM/3]

**/science/power — Power Calculator**
- Title: Power Calculator: Work & Time
- Keywords: energy per time [MEDIUM/3]

**/science/velocity — Velocity Calculator**
- Title: Velocity Calculator: Distance & Time
- Keywords: free velocity calculator [MEDIUM/3]

**/science/free-fall — Free Fall Calculator**
- Title: Free Fall Calculator: Height & Gravity
- Keywords: free fall calculator [MEDIUM/3]

**/science/specific-heat — Specific Heat Calculator**
- Title: Specific Heat Calculator: Mass, Specific Heat & Temp Change
- Keywords: specific heat calculator [MEDIUM/3]

**/science/lens — Lens Calculator**
- Title: Lens Calculator: Focal Length & Object Distance
- Keywords: free lens calculator [MEDIUM/3]

**/science/coulomb — Coulomb's Law**
- Title: Coulomb's Law: Charge 1, Charge 2 & Distance
- Keywords: coulombs law calculator electric force [MEDIUM/3] · free coulombs law calculator [EASY/2]

**/science/frequency — Frequency Calculator**
- Title: Frequency Calculator: Period
- Keywords: free frequency calculator [MEDIUM/3]

**/science/energy-mass — Energy-Mass Equivalence**
- Title: Energy-Mass Equivalence: Step-by-Step Calculator
- Keywords: energy-mass equivalence calculator [MEDIUM/3]

**/science/molar-mass — Molar Mass Calculator**
- Title: Molar Mass Calculator: Chemical formula 2)
- Keywords: molar mass calculator [MEDIUM/3]

**/science/work-calculator — Work Calculator**
- Title: Work Calculator: Force & Distance
- Keywords: free work calculator [MEDIUM/3]

**/science/gravitational-force — Gravitational Force Calculator**
- Title: Gravitational Force Calculator: Mass 1, Mass 2 & Distance
- Keywords: gravitational force calculator newtons [MEDIUM/3]

**/science/escape-velocity — Escape Velocity Calculator**
- Title: Escape Velocity Calculator: Planet Mass & Planet Radius
- Keywords: escape velocity calculator [MEDIUM/3]

**/science/molarity — Molarity Calculator**
- Title: Molarity Calculator: Moles of Solute & Volume
- Keywords: moles per liter [MEDIUM/3]

**/science/dilution — Solution Dilution Calculator**
- Title: Solution Dilution Calculator: Stock Conc., Stock Volume
- Keywords: solution dilution calculator [MEDIUM/3]

**/science/electric-field — Electric Field Calculator**
- Title: Electric Field Calculator: Charge & Distance
- Keywords: electric field strength [MEDIUM/3] · e = kq r2 [MEDIUM/3]

**/science/newtons-second — Newton's Second Law**
- Title: Newton's Second Law: Value 1 & Value 2
- Keywords: newton's second law calculator force mass acceleration [MEDIUM/3]

**/science/power-electrical — Electrical Power**
- Title: Electrical Power: Value 1 & Value 2
- Keywords: electrical power calculator watts [MEDIUM/3]

**/science/speed-of-sound — Speed of Sound**
- Title: Speed of Sound: Temperature
- Keywords: speed of sound calculator air temperature medium [MEDIUM/3]

**/science/wavelength-freq — Wavelength ↔ Frequency**
- Title: Wavelength ↔ Frequency: Light & Wave Physics
- Keywords: wavelength frequency calculator speed of light [MEDIUM/3]

**/science/kepler-third — Kepler's Third Law**
- Title: Kepler's Third Law: Semi-major Axis & Central Mass
- Keywords: kepler's third law calculator orbital period [MEDIUM/3]

**/science/radioactive-decay — Radioactive Decay**
- Title: Radioactive Decay: Initial Atoms, Half-Life & Time
- Keywords: radioactive decay calculator half life activity [MEDIUM/3]

**/science/spring-force — Hooke's Law / Spring Force**
- Title: Hooke's Law / Spring Force: Spring Constant & Displacement
- Keywords: hooke's law calculator spring constant [MEDIUM/3]

**/science/centripetal — Centripetal Acceleration**
- Title: Centripetal Acceleration: Velocity & Radius
- Keywords: centripetal acceleration calculator circular motion [MEDIUM/3]

**/science/orbital-velocity — Orbital Velocity**
- Title: Orbital Velocity: Central Mass & Altitude
- Keywords: orbital velocity calculator satellite earth [MEDIUM/3]

**/science/heat-transfer — Heat Transfer Rate**
- Title: Heat Transfer Rate: Mass, Specific Heat & Temperature Change
- Keywords: heat transfer calculator specific heat capacity [MEDIUM/3]

**/science/boyle-law — Boyle's Law**
- Title: Boyle's Law: P₁, V₁ & Known Value
- Keywords: boyle's law calculator pressure volume gas [MEDIUM/3]

**/science/combined-gas-law — Combined Gas Law**
- Title: Combined Gas Law: Step-by-Step Calculator
- Keywords: combined gas law calculator pressure volume temperature [MEDIUM/3]

**/science/wave-speed — Wave Speed Calculator**
- Title: Wave Speed Calculator: Frequency & Wavelength
- Keywords: wave speed calculator frequency wavelength [MEDIUM/3]

**/science/moment-of-inertia — Moment of Inertia**
- Title: Moment of Inertia: Mass & Radius/Length
- Keywords: moment of inertia calculator rotational inertia [MEDIUM/3]

**/science/buoyancy — Buoyancy Force**
- Title: Buoyancy Force: Fluid Density, Displaced Volume & Gravity
- Keywords: buoyancy force calculator archimedes displaced fluid [MEDIUM/3]

**/science/hydrostatic-pressure — Hydrostatic Pressure**
- Title: Hydrostatic Pressure: Depth, Fluid Density & Gravity
- Keywords: hydrostatic pressure calculator depth fluid [MEDIUM/3]

**/science/solar-energy — Solar Energy Calculator**
- Title: Solar Energy Calculator: Number of Panels, Panel Wattage
- Keywords: solar energy calculator panel output kwh [MEDIUM/3]

**/science/reynolds-number — Reynolds Number**
- Title: Reynolds Number: Density, Velocity & Characteristic Length
- Keywords: reynolds number calculator laminar turbulent flow [MEDIUM/3]

**/science/bernoulli — Bernoulli Equation**
- Title: Bernoulli Equation: ½ρV² ρGh Constant
- Keywords: bernoulli equation calculator fluid dynamics [MEDIUM/4]

**/science/projectile — Projectile Motion**
- Title: Projectile Motion: Launch Velocity, Launch Angle & Gravity
- Keywords: projectile motion calculator range height time launch angle [MEDIUM/3]

**/science/pendulum — Pendulum Period**
- Title: Pendulum Period: Length & Gravity
- Keywords: pendulum period calculator simple length gravity [EASY/2]

**/science/molality — Molality Calculator**
- Title: Molality Calculator: Moles of Solute & Solvent Mass
- Keywords: molality calculator moles solvent kg chemistry [EASY/2]

**/science/percent-yield — Percent Yield**
- Title: Percent Yield: Actual Yield & Theoretical Yield
- Keywords: percent yield calculator chemistry actual theoretical [MEDIUM/3]

**/science/latent-heat — Latent Heat Calculator**
- Title: Latent Heat Calculator: Mass
- Keywords: latent heat calculator fusion vaporization phase change [MEDIUM/3]

**/science/friction — Friction Force Calculator**
- Title: Friction Force Calculator: Friction Coefficient, Mass
- Keywords: friction force calculator coefficient normal kinetic static [MEDIUM/3]

**/science/inclined-plane — Inclined Plane Calculator**
- Title: Inclined Plane Calculator: Mass, Incline Angle
- Keywords: inclined plane calculator friction acceleration angle [MEDIUM/3]

**/science/impulse — Impulse Calculator**
- Title: Impulse Calculator: Force & Time
- Keywords: impulse calculator force time momentum change [MEDIUM/3]

**/science/terminal-velocity — Terminal Velocity Calculator**
- Title: Terminal Velocity Calculator: Mass, Air Density
- Keywords: terminal velocity calculator drag falling object [MEDIUM/3]

**/science/snells-law — Snell's Law Calculator**
- Title: Snell's Law Calculator: Index of Refraction 1
- Keywords: snells law calculator refraction angle index [MEDIUM/3]

**/science/mirror-equation — Mirror Equation Calculator**
- Title: Mirror Equation Calculator: Focal Length & Object Distance
- Keywords: mirror equation calculator concave convex image distance magnification [MEDIUM/4]

**/science/mole-conversion — Mole Conversion Calculator**
- Title: Mole Conversion Calculator: Mass & Molar Mass
- Keywords: mole conversion calculator grams moles avogadro [EASY/2]

**/science/charles-law — Charles's Law Calculator**
- Title: Charles's Law Calculator: Initial Volume, Initial Temp
- Keywords: charles law calculator volume temperature kelvin [MEDIUM/3]

**/science/hooke-law — Hooke's Law Calculator**
- Title: Hooke's Law Calculator: Spring Constant k & Displacement x
- Keywords: hooke's law calculator spring force constant elastic potential energy extension [MEDIUM/3]

**/science/mach-number — Mach Number Calculator**
- Title: Mach Number Calculator: Object Speed & Speed of Sound
- Keywords: mach number calculator speed of sound supersonic transonic aircraft aviation [MEDIUM/3]

**/science/stefan-boltzmann — Stefan-Boltzmann Calculator**
- Title: Stefan-Boltzmann Calculator: Temperature T & Emissivity ε
- Keywords: stefan boltzmann calculator blackbody radiation thermal emission emissivity [MEDIUM/3]

**/science/coulomb-law — Coulomb's Law Calculator**
- Title: Coulomb's Law Calculator: Charge q₁, Charge q₂
- Keywords: coulomb's law calculator electrostatic force point charges permittivity [MEDIUM/3]

**/science/photon-energy — Photon Energy Calculator**
- Title: Photon Energy Calculator: Wavelength
- Keywords: photon energy calculator wavelength planck constant eV joules frequency [MEDIUM/3]

**/science/debroglie — De Broglie Wavelength Calculator**
- Title: De Broglie Wavelength Calculator: Mass & Velocity
- Keywords: de broglie wavelength calculator matter wave electron quantum momentum [MEDIUM/3]

**/science/rocket-equation — Rocket Equation Calculator**
- Title: Rocket Equation Calculator: Effective Exhaust
- Keywords: rocket equation calculator tsiolkovsky delta v exhaust velocity mass ratio propulsion [MEDIUM/4]

**/science/carbon-dating — Carbon Dating Calculator**
- Title: Carbon Dating Calculator: C-14 Remaining & C-14 Half-life
- Keywords: carbon dating calculator radiocarbon age c14 half life archaeology fossils [MEDIUM/4]

**/science/calorimetry — Heat Energy Calculator**
- Title: Heat Energy Calculator: Mass, Specific Heat
- Keywords: heat energy calculator calorimetry specific heat q m c delta t joules [MEDIUM/3]

**/science/freezing-depression — Freezing Point Depression Calculator**
- Title: Freezing Point Depression Calculator: van 't Hoff Factor
- Keywords: freezing point depression calculator colligative property molality kf solvent antifreeze [MEDIUM/3]

**/science/air-density — Air Density Calculator**
- Title: Air Density Calculator: Air Pressure & Temperature
- Keywords: air density calculator atmosphere pressure temperature engine tuning altitude performance [MEDIUM/3]

**/science/angular-momentum — Angular Momentum Calculator**
- Title: Angular Momentum Calculator: Mass, Tangential Velocity
- Keywords: angular momentum calculator mvr rotational physics [MEDIUM/3]

**/science/bullet-drop — Bullet Drop Calculator**
- Title: Bullet Drop Calculator: Horizontal Distance
- Keywords: bullet drop calculator trajectory gravity shooting [MEDIUM/3]

**/science/redshift — Redshift Calculator**
- Title: Redshift Calculator: Rest Wavelength & Observed Wavelength
- Keywords: redshift calculator doppler spectral shift recession velocity astronomy [MEDIUM/3]

**/science/buffer-ph — Buffer pH Calculator**
- Title: Buffer pH Calculator: pKa of Acid & [Base] / [Acid] Ratio
- Keywords: buffer ph calculator henderson hasselbalch pKa conjugate base acid [MEDIUM/3]

**/science/machine-efficiency — Machine Efficiency Calculator**
- Title: Machine Efficiency Calculator: Useful Output & Total Input
- Keywords: machine efficiency calculator mechanical output input energy [MEDIUM/3]

**/science/dew-point — Dew Point Calculator**
- Title: Dew Point Calculator: Air Temperature & Relative Humidity
- Keywords: dew point calculator humidity temperature magnus formula condensation [EASY/2]

**/science/cloud-base-lcl — Cloud Base Calculator**
- Title: Cloud Base Calculator: Surface Temperature & Dew Point
- Keywords: cloud base calculator lifted condensation level lcl spread weather [MEDIUM/3]

**/science/grahams-law — Graham's Law Calculator**
- Title: Graham's Law Calculator: Molar Mass of Gas 1 & Molar
- Keywords: grahams law calculator effusion diffusion rate gas molar mass [MEDIUM/3]

**/science/osmotic-pressure — Osmotic Pressure Calculator**
- Title: Osmotic Pressure Calculator: Molarity & Temperature
- Keywords: osmotic pressure calculator molarity temperature solution chemistry van t hoff [MEDIUM/3]

**/science/sound-intensity — Sound Intensity Addition Calculator**
- Title: Sound Intensity Addition Calculator: Source 1 & Source 2
- Keywords: sound intensity addition calculator decibel db combine two sources logarithmic [MEDIUM/3]

**/science/angular-velocity — Angular Velocity Calculator**
- Title: Angular Velocity Calculator: Rotational Speed
- Keywords: angular velocity calculator rpm rad/s radians per second rotation frequency [EASY/2]

## 5.19 Tech & Digital Calculators — `tech/` (72 tools)

**/tech/internet-speed — Internet Download Time**
- Title: Internet Download Time: File Size & Speed
- Keywords: download time calculator [MEDIUM/3]

**/tech/bandwidth-calc — Bandwidth Calculator**
- Title: Bandwidth Calculator: Devices
- Keywords: free bandwidth calculator [MEDIUM/3]

**/tech/data-usage — Data Usage Calculator**
- Title: Data Usage Calculator: Streaming, Browsing & Gaming
- Keywords: data usage calculator [MEDIUM/3]

**/tech/video-size — Video File Size**
- Title: Video File Size: Duration & Bitrate
- Keywords: video file size [MEDIUM/3]

**/tech/monitor-distance — Monitor Viewing Distance**
- Title: Monitor Viewing Distance: Screen Size
- Keywords: monitor viewing distance [MEDIUM/3]

**/tech/wifi-channels — WiFi Channel Finder**
- Title: WiFi Channel Finder: Nearby Networks
- Keywords: wifi channel finder [MEDIUM/3]

**/tech/cloud-storage — Cloud Storage Cost**
- Title: Cloud Storage Cost: Storage Needed
- Keywords: cloud storage comparison [MEDIUM/3]

**/tech/website-cost — Website Dev Cost**
- Title: Website Dev Cost: Website Development Cost
- Keywords: website development cost [MEDIUM/3]

**/tech/ssd-vs-hdd — SSD vs HDD Speed**
- Title: SSD vs HDD Speed: File Size
- Keywords: ssd vs hdd [MEDIUM/3]

**/tech/battery-life-estimator — Battery Life Estimator**
- Title: Battery Life Estimator: Battery, Usage & Battery Voltage
- Keywords: battery life estimator [MEDIUM/3]

**/tech/screen-resolution — Screen Resolution Guide**
- Title: Screen Resolution Guide: Screen Size & Viewing Distance
- Keywords: screen resolution guide [MEDIUM/3]

**/tech/cable-length — Cable Length Calculator**
- Title: Cable Length Calculator: Distance
- Keywords: cable length calculator [MEDIUM/3]

**/tech/ppi-calc — PPI (Pixels Per Inch)**
- Title: PPI (Pixels Per Inch): Width, Height & Diagonal
- Keywords: free ppi calculator [MEDIUM/3]

**/tech/wattage-psu — Power Supply Calculator**
- Title: Power Supply Calculator: CPU TDP, GPU TDP & RAM Sticks
- Keywords: power supply wattage [MEDIUM/3]

**/tech/print-resolution — Print Resolution Guide**
- Title: Print Resolution Guide: Width & Height
- Keywords: print resolution calculator [MEDIUM/3]

**/tech/password-time — Password Crack Time**
- Title: Password Crack Time: Password Length & Guesses per Second
- Keywords: password crack time calculator [MEDIUM/3]

**/tech/image-file-size — Image File Size Estimator**
- Title: Image File Size Estimator: Width & Height
- Keywords: image file size [MEDIUM/3]

**/tech/hosting-cost — Hosting Cost per Year**
- Title: Hosting Cost per Year: Monthly Price, Setup Fee
- Keywords: hosting cost per year calculator [EASY/2]

**/tech/monitor-refresh — Refresh Rate vs FPS**
- Title: Refresh Rate vs FPS: Monitor Refresh & Game FPS
- Keywords: monitor refresh rate [MEDIUM/3]

**/tech/streaming-bitrate — Streaming Bitrate Guide**
- Title: Streaming Bitrate Guide: Ideal Streaming Bitrate
- Keywords: streaming bitrate guide calculator [MEDIUM/3]

**/tech/raid-capacity — RAID Capacity Calculator**
- Title: RAID Capacity Calculator: Drive Count & Drive Size
- Keywords: raid capacity calculator [MEDIUM/3]

**/tech/uptime-calculator — Uptime / Downtime Calculator**
- Title: Uptime / Downtime Calculator: Step-by-Step Calculator
- Keywords: uptime / downtime calculator [MEDIUM/3]

**/tech/device-charge-time — Device Charging Time**
- Title: Device Charging Time: Battery, Charger Output & Efficiency
- Keywords: device charging time calculator [MEDIUM/3]

**/tech/data-transfer-cost — Cloud Data Transfer Cost**
- Title: Cloud Data Transfer Cost: Data Transferred
- Keywords: cloud egress cost [MEDIUM/3]

**/tech/token-cost — AI Token Cost Estimator**
- Title: AI Token Cost Estimator: Input Tokens & Output Tokens
- Keywords: ai token cost estimator calculator [MEDIUM/3]

**/tech/base64-encode — Base64 Encoder**
- Title: Base64 Encoder: Text Base64
- Keywords: base64 encoder calculator [MEDIUM/3]

**/tech/base64-decode — Base64 Decoder**
- Title: Base64 Decoder: Base64 Back
- Keywords: base64 to text [MEDIUM/3]

**/tech/url-encoder — URL Encoder / Decoder**
- Title: URL Encoder / Decoder: Encode
- Keywords: url encoder / decoder calculator [MEDIUM/3]

**/tech/json-formatter — JSON Formatter**
- Title: JSON Formatter: Pretty-Print
- Keywords: pretty print json [MEDIUM/3]

**/tech/text-counter — Word & Character Counter**
- Title: Word & Character Counter: Words
- Keywords: word & character counter calculator [MEDIUM/3]

**/tech/case-converter — Text Case Converter**
- Title: Text Case Converter: Text Between
- Keywords: text case converter calculator [MEDIUM/3]

**/tech/hash-generator — Hash Generator (MD5/SHA)**
- Title: Hash Generator (MD5/SHA): Step-by-Step Calculator
- Keywords: hash generator calculator [MEDIUM/3]

**/tech/rgb-hex — RGB ↔ Hex Converter**
- Title: RGB ↔ Hex Converter: Red, Green & Blue
- Keywords: rgb to hex [MEDIUM/3] · hex to rgb [MEDIUM/3]

**/tech/uuid-generator — UUID v4 Generator**
- Title: UUID v4 Generator: How Many
- Keywords: uuid v4 generator calculator [MEDIUM/3]

**/tech/password-generator — Strong Password Generator**
- Title: Strong Password Generator: Length & How Many
- Keywords: strong password generator calculator [MEDIUM/3]

**/tech/ip-subnet — IP Subnet Calculator**
- Title: IP Subnet Calculator: IP Address & Prefix Length
- Keywords: ip subnet calculator [MEDIUM/3]

**/tech/cron-validate — Cron Expression Validator**
- Title: Cron Expression Validator: Validate
- Keywords: cron expression validator calculator [MEDIUM/3]

**/tech/resistor-color-code — Resistor Color Code Calculator**
- Title: Resistor Color Code Calculator: 4-Band Resistor
- Keywords: resistor color code [MEDIUM/3] · 4 band resistor [MEDIUM/3] · ohm color code [MEDIUM/3]

**/tech/ascii-table — ASCII Table Reference**
- Title: ASCII Table Reference: Character
- Keywords: ascii code lookup [MEDIUM/3]

**/tech/awg-reference — Wire Gauge (AWG) Reference**
- Title: Wire Gauge (AWG) Reference: AWG Size
- Keywords: american wire gauge [MEDIUM/3]

**/tech/aspect-ratio — Aspect Ratio Calculator**
- Title: Aspect Ratio Calculator: Ratio Width, Ratio Height
- Keywords: aspect ratio calculator 16:9 4:3 resize [MEDIUM/3]

**/tech/color-contrast — Color Contrast Checker**
- Title: Color Contrast Checker: Foreground & Background
- Keywords: color contrast checker wcag ratio accessibility [MEDIUM/3]

**/tech/read-time — Reading Time (Web)**
- Title: Reading Time (Web): Word Count & Words per Minute
- Keywords: reading time calculator words web article minutes [EASY/2]

**/tech/font-size-conv — PX to REM/EM Converter**
- Title: PX to REM/EM Converter: Pixels & Root Font Size
- Keywords: px to rem converter font size em root [MEDIUM/3]

**/tech/storage-need — Storage Needs Calculator**
- Title: Storage Needs Calculator: Photos, Video Hours & Documents
- Keywords: storage calculator GB TB photos videos estimate [MEDIUM/3]

**/tech/latency-bandwidth — Latency-Bandwidth Calculator**
- Title: Latency-Bandwidth Calculator: File Size, Bandwidth
- Keywords: bandwidth latency calculator transfer time file [MEDIUM/3]

**/tech/download-time — Download Time Calculator**
- Title: Download Time Calculator: File Size & Download Speed
- Keywords: download time calculator file size speed [MEDIUM/3]

**/tech/audio-file-size — Audio File Size Calculator**
- Title: Audio File Size Calculator: Duration & Bitrate
- Keywords: audio file size calculator bitrate duration wav mp3 [MEDIUM/3]

**/tech/backup-size — Backup Size Calculator**
- Title: Backup Size Calculator: Full Backup, Daily Change
- Keywords: backup size calculator incremental retention storage [MEDIUM/3]

**/tech/screen-size — TV Screen Size Calculator**
- Title: TV Screen Size Calculator: Viewing Distance
- Keywords: tv size calculator distance viewing recommended [MEDIUM/3]

**/tech/streaming-quality — Streaming Data Calculator**
- Title: Streaming Data Calculator: Hours per Day & Days per Month
- Keywords: streaming data usage calculator netflix youtube quality [MEDIUM/3]

**/tech/code-line-count — Code Line Estimator**
- Title: Code Line Estimator: Features/Screens, Developers
- Keywords: lines of code estimator project size features [MEDIUM/3]

**/tech/dbm-watts — dBm ↔ Watts Converter**
- Title: dBm ↔ Watts Converter: Value
- Keywords: dbm watts converter rf power milliwatts decibel [MEDIUM/3]

**/tech/api-cost — API Cost Calculator**
- Title: API Cost Calculator: Requests per Month & Price per
- Keywords: api cost calculator pricing requests compute [MEDIUM/3]

**/tech/keyword-density — Keyword Density Calculator**
- Title: Keyword Density Calculator: Text & Keyword
- Keywords: keyword density calculator seo percentage [EASY/2]

**/tech/reading-grade — Readability Score Calculator**
- Title: Readability Score Calculator: Total Words, Total
- Keywords: readability score calculator flesch reading ease grade [MEDIUM/4]

**/tech/typing-speed — Typing Speed Calculator**
- Title: Typing Speed Calculator: Characters Typed, Minutes & Errors
- Keywords: typing speed calculator wpm accuracy [MEDIUM/3]

**/tech/ad-revenue — Ad Revenue Calculator**
- Title: Ad Revenue Calculator: Monthly Impressions, CPM
- Keywords: ad revenue calculator cpm cpc impressions [MEDIUM/3]

**/tech/click-through-rate — Click-Through Rate Calculator**
- Title: Click-Through Rate Calculator: Clicks & Impressions
- Keywords: click through rate calculator ctr clicks impressions [MEDIUM/3]

**/tech/subnet-cidr — Subnet Calculator (CIDR)**
- Title: Subnet Calculator (CIDR): IPv4 Address & Prefix
- Keywords: subnet calculator cidr ipv4 netmask broadcast hosts network range [MEDIUM/3]

**/tech/video-bitrate — Video File Size Calculator**
- Title: Video File Size Calculator: Video Bitrate, Duration
- Keywords: video file size calculator bitrate duration mb gb streaming upload estimate [MEDIUM/3]

**/tech/cidr-convert — CIDR to Subnet Calculator**
- Title: CIDR to Subnet Calculator: CIDR Prefix & Network Octet Check
- Keywords: cidr calculator subnet mask hosts broadcast ipv4 network [MEDIUM/3]

**/tech/gpu-comparison-perf — GPU Value Comparison**
- Title: GPU Value Comparison: Benchmark FPS, Card Price
- Keywords: gpu comparison calculator fps per dollar performance watt gaming value [EASY/2]

**/tech/data-center-pue — Data Center PUE Calculator**
- Title: Data Center PUE Calculator: Total Facility Power
- Keywords: pue calculator data center power usage effectiveness efficiency [MEDIUM/3]

**/tech/screen-ppi — Screen PPI Calculator**
- Title: Screen PPI Calculator: Width, Height & Diagonal
- Keywords: ppi calculator pixels per inch screen density resolution diagonal [EASY/2]

**/tech/hash-rate — Mining Yield Calculator**
- Title: Mining Yield Calculator: Your Hashrate, Network Hashrate
- Keywords: hashrate calculator mining yield bitcoin crypto block reward [MEDIUM/4]

**/tech/storage-array — RAID Usable Capacity Calculator**
- Title: RAID Usable Capacity Calculator: Number of Disks, Disk
- Keywords: raid calculator usable capacity raid 5 raid 10 storage array [MEDIUM/3]

**/tech/docker-resource — Container Density Calculator**
- Title: Container Density Calculator: Host RAM, Host vCPUs
- Keywords: docker container density calculator ram cpu limit kubernetes pods per node [EASY/2]

**/tech/load-test-users — Load Test VU Calculator**
- Title: Load Test VU Calculator: Target Requests/sec, Avg
- Keywords: load test virtual users calculator vu target rps response time [MEDIUM/3]

**/tech/wifi-throughput — Wi-Fi Real Throughput Calculator**
- Title: Wi-Fi Real Throughput Calculator: Link Speed
- Keywords: wifi throughput calculator link speed real transfer rate overhead wireless [MEDIUM/3]

**/tech/data-usage-est — Data Usage Estimator**
- Title: Data Usage Estimator: Streaming Hours per Day, Data
- Keywords: data usage estimator calculator monthly mobile gb streaming plan [EASY/2]

**/tech/image-size-calc — Uncompressed Image Size Calculator**
- Title: Uncompressed Image Size Calculator: Width, Height
- Keywords: image size calculator uncompressed bitmap bytes pixels bit depth raw file [MEDIUM/3]

## 5.20 Utility Calculators — `utilities/` (32 tools)

**/utilities/qr-generator — QR Code Generator**
- Title: QR Code Generator: Text or URL
- Keywords: qr code generator [MEDIUM/3]

**/utilities/password-gen — Password Generator**
- Title: Password Generator: Length
- Keywords: password generator calculator [MEDIUM/3]

**/utilities/color-picker — Color Converter**
- Title: Color Converter: HEX Color
- Keywords: color converter calculator [MEDIUM/3]

**/utilities/unit-converter — Universal Unit Converter**
- Title: Universal Unit Converter: Value
- Keywords: universal unit converter calculator [MEDIUM/3]

**/utilities/base-converter — Number Base Converter**
- Title: Number Base Converter: Value & From Base
- Keywords: binary decimal hex [MEDIUM/3]

**/utilities/hash-gen — Hash Generator**
- Title: Hash Generator: Sha-256 Hash
- Keywords: md5 sha256 hash generator online [EASY/2]

**/utilities/lorem-ipsum — Lorem Ipsum Generator**
- Title: Lorem Ipsum Generator: Number of Paragraphs
- Keywords: lorem ipsum generator calculator [MEDIUM/3]

**/utilities/uuid-gen — UUID Generator**
- Title: UUID Generator: Number of UUIDs
- Keywords: uuid generator calculator [MEDIUM/3]

**/utilities/tip-split — Bill Split & Tip**
- Title: Bill Split & Tip: Bill Amount, Tip & Number of People
- Keywords: bill split & tip calculator [MEDIUM/4]

**/utilities/timer-calc — Countdown Timer Calculator**
- Title: Countdown Timer Calculator: Target Date
- Keywords: countdown timer calculator [MEDIUM/3]

**/utilities/file-size — File Size Converter**
- Title: File Size Converter: Step-by-Step Calculator
- Keywords: file size converter [MEDIUM/3] · MB to GB [MEDIUM/3]

**/utilities/salary-hourly — Salary to Hourly Converter**
- Title: Salary to Hourly Converter: Annual Salary & Hours/Week
- Keywords: salary to hourly converter [MEDIUM/4]

**/utilities/area-calc — Area Calculator**
- Title: Area Calculator: Dimension 1 & Dimension 2
- Keywords: free area calculator [MEDIUM/3]

**/utilities/volume-calc — Volume Calculator**
- Title: Volume Calculator: Dimension 1, Dimension 2 & Dimension 3
- Keywords: free volume calculator [MEDIUM/3]

**/utilities/shipping-cost — Shipping Cost Calculator**
- Title: Shipping Cost Calculator: Weight & Distance
- Keywords: shipping cost calculator [MEDIUM/3]

**/utilities/salary-biweekly — Biweekly Pay Calculator**
- Title: Biweekly Pay Calculator: Annual Salary
- Keywords: biweekly pay calculator [MEDIUM/3]

**/utilities/simple-tax — Take-Home Pay Calculator**
- Title: Take-Home Pay Calculator: Annual Gross Income
- Keywords: take home pay calculator [MEDIUM/4] · net pay calculator [MEDIUM/3] · paycheck calculator [MEDIUM/3]

**/utilities/mileage-calc — Mileage Reimbursement Calculator**
- Title: Mileage Reimbursement Calculator: Miles Driven & Rate
- Keywords: mileage reimbursement calculator [MEDIUM/3]

**/utilities/ratio-simplifier — Ratio Simplifier**
- Title: Ratio Simplifier: First Number & Second Number
- Keywords: ratio simplifier calculator aspect divide [MEDIUM/3]

**/utilities/gcd-lcm — GCD & LCM Calculator**
- Title: GCD & LCM Calculator: First Number & Second Number
- Keywords: gcd lcm calculator greatest common divisor least common multiple [MEDIUM/3]

**/utilities/prime-check — Prime Number Checker**
- Title: Prime Number Checker: If Number
- Keywords: prime number checker factors divisor [MEDIUM/3]

**/utilities/rounding-calc — Rounding Calculator**
- Title: Rounding Calculator: Number & Decimal Places
- Keywords: rounding calculator round to nearest decimal places [MEDIUM/3]

**/utilities/coin-flip — Coin Flip Simulator**
- Title: Coin Flip Simulator: Number of Flips
- Keywords: coin flip simulator heads tails probability [MEDIUM/3]

**/utilities/dice-roller — Dice Roll Simulator**
- Title: Dice Roll Simulator: Number of Dice
- Keywords: dice roller simulator d6 probability [MEDIUM/3]

**/utilities/date-add — Date Add/Subtract**
- Title: Date Add/Subtract: Start Date & Days
- Keywords: date add subtract days calculator [MEDIUM/4]

**/utilities/age-exact — Exact Age Calculator**
- Title: Exact Age Calculator: Birth Date & Age on Date
- Keywords: exact age calculator years months days birthday [MEDIUM/4]

**/utilities/units-per — Price Per Unit Calculator**
- Title: Price Per Unit Calculator: Price, Quantity & Unit
- Keywords: price per unit calculator compare value best deal [EASY/2]

**/utilities/random-name — Random Team Generator**
- Title: Random Team Generator: Names & Number of Teams
- Keywords: random team generator split names groups [MEDIUM/3]

**/utilities/password-entropy — Password Entropy Calculator**
- Title: Password Entropy Calculator: Password Length
- Keywords: password entropy calculator bits strength character pool brute force crack time [MEDIUM/3]

**/utilities/speech-time — Speech Time Calculator**
- Title: Speech Time Calculator: Word Count & Speaking Pace
- Keywords: speech time calculator words per minute presentation duration pace toastmasters [EASY/2]

**/utilities/qr-content-size — QR Version Finder**
- Title: QR Version Finder: Payload Size & ECC
- Keywords: qr code version calculator byte capacity payload ecc [MEDIUM/3]

**/utilities/timestamp-convert — Unix Timestamp Converter**
- Title: Unix Timestamp Converter: Epoch Seconds Readable
- Keywords: unix timestamp converter epoch utc date time [MEDIUM/4]

---

## 6. Join-quality audit (extraction honesty)

- Tool↔URL joins with matching title: **1199**
- Joins where the title did not literally contain the tool name (renamed/rebranded tools — kept, flagged here): **2**
- Data entries with no matching indexable page: **0** (data-only tools, groups, or noindex variants)
