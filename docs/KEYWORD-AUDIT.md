# Keyword Quality Audit — CalcProMaster

_Deterministic audit over the same extraction as docs/KEYWORD-TARGETS.md. Nothing hand-added. Re-run with: `npm run keywords:audit`._

**Inventory:** 1334 indexable pages · 1206 tools · 2242 curated phrases.

## Verdict at a glance

| Check | Finding |
|---|---|
| C1 · Title cannibalization | ✅ none |
| C2 · Phrase cannibalization (2+ pages target same phrase) | ✅ none |
| C3 · Duplicate phrase inside one tool | ✅ none |
| Q1 · Year-stamped phrases | ⚠️ 3 |
| Q2 · App/download-intent phrases on web tools | ✅ none |
| Q3 · Phrases sharing no word with tool name | ℹ️ 82 (review, not always wrong) |
| S1 · Overlong phrases (>70 chars) | ℹ️ 65 |
| S2 · Single generic word | ℹ️ 10 |

**Modifier coverage:** 39 phrases use feature modifiers ("with …", "solve for …"), 56 carry locale/currency intent, 1016 say "free".

## Q1 — Year-stamped phrases (stale by next year)

Hard years inside evergreen keywords guarantee staleness. Drop the year — the page can mention recency without baking it into the target.

| Page | Phrase |
|---|---|
| `/finance/standard-deduction` | standard deduction vs itemized deduction calculator 2026 |
| `/health/gfr-estimate` | egfr calculator ckd-epi 2021 creatinine kidney function gfr |
| `/health/gfr-estimate` | free online eGFR Calculator (CKD-EPI 2021) |

## Q3 — Phrases sharing no word with the tool name (review list)

Often legitimate (synonyms, problem-space queries like "how many bags of concrete do i need") — but each should get a deliberate paragraph, not just the kw tag.

| Page | Phrase |
|---|---|
| `/auto/fuel-price-compare` | petrol vs diesel |
| `/business/cac` | customer acquisition cost |
| `/business/roas` | return on ad spend |
| `/business/mrr` | monthly recurring revenue |
| `/business/discount-rate` | cost of capital |
| `/business/saas-unit-metrics` | ARPU |
| `/business/saas-unit-metrics` | LTV |
| `/business/saas-unit-metrics` | CAC |
| `/career/salary-converter` | hourly to annual |
| `/conversion/length` | meters to feet and inches converter |
| `/conversion/pressure-conv` | pascal bar psi |
| `/conversion/temperature` | celsius to fahrenheit |
| `/conversion/temperature` | temp conversion |
| `/conversion/temperature` | kelvin |
| `/conversion/time-conv` | hours minutes seconds |
| `/conversion/cooking-conv` | cups to ml |
| `/conversion/cooking-conv` | tbsp to tsp |
| `/conversion/clothing-size` | US to EU |
| `/conversion/torque-conv` | Nm to lb-ft |
| `/conversion/power-conv` | watts to horsepower |
| `/conversion/voltage-conv` | volts amps watts |
| `/conversion/density-conv` | kg/m3 to g/cm3 |
| `/education/reading-speed` | words per minute |
| `/everyday/calorie-counter` | nutrition tracker |
| `/everyday/calorie-counter` | diet plan |
| `/finance/loan-emi` | day count convention |
| `/finance/mortgage` | fha vs conventional loan comparison calculator |
| `/finance/mortgage` | home loan affordability calculator with property tax |
| `/finance/compound-interest` | investment growth calculator with monthly sip |
| `/finance/compound-interest` | solve for rate |
| `/finance/credit-card-payoff` | solve for payment |
| `/finance/retirement` | solve for contribution |
| `/finance/investment` | roi calculator with annual returns |
| `/finance/savings-goal` | solve for time |
| `/finance/npv` | net present value |
| `/finance/irr` | internal rate of return |
| `/finance/roi` | return on investment |
| `/finance/salary` | take home pay calculator with deductions |
| `/finance/home-afford` | how much house can i afford calculator |
| `/finance/home-afford` | how much house |
| `/finance/currency-converter` | usd to pkr live exchange rate converter |
| `/finance/currency-converter` | pkr to usd converter today |
| `/finance/investment-growth` | cagr calculator with monthly contributions |
| `/finance/bond-yield` | YTM |
| `/finance/bond-yield` | fixed income |
| `/finance/retirement-income` | 401k |
| `/finance/retirement-income` | IRA |
| `/finance/sip` | mutual fund |
| `/finance/crypto-profit` | cryptocurrency gains |
| `/finance/stock-profit` | capital gains |
| … | +32 more |

## S1 — Overlong phrases (>70 chars)

Nobody types these. They read like feature notes, not queries. Shorten to the searchable core.

| Page | Phrase |
|---|---|
| `/construction/stair-stringer` | stair stringer calculator riser height tread depth total rise run building code |
| `/construction/siding-squares` | siding squares calculator vinyl wall area waste factor material estimate |
| `/construction/gravel-driveway` | gravel driveway calculator tons cubic yards depth crushed stone coverage |
| `/construction/insulation-batts` | insulation coverage calculator batts rolls r value sq ft bags attic wall |
| `/engineering/section-modulus` | section modulus calculator beam bending rectangle circle elastic design |
| `/engineering/shaft-torsion` | shaft torsion calculator shear stress solid circular torque polar moment |
| `/engineering/manning-flow` | manning equation calculator pipe flow discharge slope roughness gravity main |
| `/engineering/orifice-flow` | orifice flow calculator discharge coefficient tank drainage torricelli head |
| `/engineering/three-phase-power` | three phase power calculator kw voltage current power factor apparent reactive |
| `/engineering/ups-sizing` | ups battery sizing calculator ah runtime backup load inverter efficiency |
| `/engineering/radiation-shielding` | radiation shielding calculator half value layer hvl attenuation gamma xray |
| `/engineering/rcf-gforce` | rcf calculator g force centrifuge rpm rotor radius relative centrifugal force lab |
| `/everyday/poker-flush` | poker flush odds calculator 5 card probability combinations straight flush |
| `/everyday/easter-date` | easter date calculator computus good friday western sunday ash wednesday |
| `/everyday/moon-phase` | moon phase calculator lunar cycle synodic month full moon new moon illumination |
| `/everyday/meeting-cost` | meeting cost calculator attendees hourly rate salary time waste productivity |
| `/finance/cagr` | cagr calculator compound annual growth rate investment return annualized |
| `/finance/rent-affordability` | rent affordability calculator how much rent can i afford 30 percent rule |
| `/finance/dso` | dso calculator days sales outstanding receivables collection period working capital |
| `/finance/market-cap` | market cap calculator market capitalization share price shares outstanding company value |
| `/finance/sortino-ratio` | sortino ratio calculator downside deviation risk adjusted return investment |
| `/finance/cd-ladder` | cd ladder calculator certificates of deposit maturity strategy interest |
| `/finance/position-size` | position size calculator stock trading risk management shares per trade |
| `/finance/cap-rate-conv` | cap rate to value calculator noi capitalization rate property valuation income approach |
| `/finance/rule-of-40` | rule of 40 calculator saas growth margin software company valuation benchmark |
| `/finance/cost-of-delay` | cost of delay calculator product launch revenue lost month project management |
| `/fitness/sweat-rate` | sweat rate calculator hydration fluid loss exercise weight change athlete |
| `/fitness/rpe-load` | session rpe training load calculator perceived exertion load monitoring athletes |
| `/fitness/vo2-beep` | beep test calculator vo2 max shuttle run 20m multistage fitness estimate |
| `/fitness/resting-metabolic` | resting metabolic rate calculator cunningham fat free mass rmr athletes |
| `/food/homebrew-abv` | homebrew abv calculator original gravity final gravity beer alcohol brewing |
| `/health/hba1c-eag` | hba1c to eag converter estimated average glucose mmol mol mg dl diabetes |
| `/health/creatinine-clearance` | creatinine clearance calculator cockcroft gault kidney function renal dosing gfr estimate |
| `/health/anion-gap` | anion gap calculator metabolic acidosis electrolytes sodium chloride bicarbonate |
| `/health/ponderal-index` | ponderal index calculator body mass infant neonatal corpulence height normalized |
| `/health/apgar` | apgar score calculator newborn appearance pulse grimace activity respiration |
| `/health/winters-formula` | winters formula calculator metabolic acidosis compensation pco2 expected |
| `/health/maintenance-fluids` | maintenance fluids calculator 4-2-1 rule pediatric hourly rate Holliday Segar |
| `/health/free-water-deficit` | free water deficit calculator hypernatremia sodium correction dehydration |
| `/health/serum-osmolality` | serum osmolality calculator sodium glucose bun calculated plasma osm gap |
| `/math/linear-regression` | linear regression calculator least squares slope intercept r squared best fit |
| `/math/sample-size` | sample size calculator margin of error confidence level population proportion |
| `/math/quartiles` | quartile calculator q1 q3 interquartile range iqr five number summary box plot |
| `/math/covariance` | covariance calculator sample population correlation direction relationship |
| `/math/exponential-prob` | exponential distribution calculator probability wait time rate lambda reliability |
| `/math/expected-value` | expected value calculator probability weighted average outcomes ev decision making |
| `/science/hooke-law` | hooke's law calculator spring force constant elastic potential energy extension |
| `/science/mach-number` | mach number calculator speed of sound supersonic transonic aircraft aviation |
| `/science/stefan-boltzmann` | stefan boltzmann calculator blackbody radiation thermal emission emissivity |
| `/science/coulomb-law` | coulomb's law calculator electrostatic force point charges permittivity |
| … | +15 more |

## S2 — Single generic word

Single non-head words are unrankable head terms against wikipedia-grade competition. Expand into an intent phrase.

| Page | Phrase |
|---|---|
| `/business/saas-unit-metrics` | ARPU |
| `/business/saas-unit-metrics` | LTV |
| `/business/saas-unit-metrics` | CAC |
| `/conversion/temperature` | kelvin |
| `/finance/bond-yield` | YTM |
| `/finance/retirement-income` | 401k |
| `/finance/retirement-income` | IRA |
| `/finance/esop` | RSU |
| `/health/fatigue-score` | wellness |
| `/math/random-generator` | lottery |

## Method & honest limits

- Extraction source is the deployed site + `js/data/*.js` — same pipeline as KEYWORD-TARGETS.md, so both documents always describe the same inventory.
- This audit measures **on-page targeting quality only**. It cannot measure search volume, difficulty, or current positions: that needs GSC + a rank tracker (credentials currently unconfigured — see docs/api-credentials-setup.md).
- Live-SERP spot checks (2026-09-18, small sample, en/US): brand term → site #4; "calcpromaster calculators" → **GitHub repo #1/#3, site not in top 10**; "loan emi calculator", "concrete volume calculator in cubic yards", "cgpa to percentage conversion calculator", "home loan emi calculator with monthly prepayment" → site not in top 10. Site IS indexed (site: returns pages, but titles are stale: "543+" era).