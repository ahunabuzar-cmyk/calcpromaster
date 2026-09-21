# Keyword Quality Audit — CalcProMaster

_Deterministic audit over the same extraction as docs/KEYWORD-TARGETS.md. Nothing hand-added. Re-run with: `npm run keywords:audit`._

**Inventory:** 1334 indexable pages · 1206 tools · 2242 curated phrases.

## Verdict at a glance

| Check | Finding |
|---|---|
| C1 · Title cannibalization | ✅ none |
| C2 · Phrase cannibalization (2+ pages target same phrase) | ✅ none |
| C3 · Duplicate phrase inside one tool | ✅ none |
| Q1 · Year-stamped phrases | ✅ none |
| Q2 · App/download-intent phrases on web tools | ✅ none |
| Q3 · Phrases sharing no word with tool name | ℹ️ 82 (review, not always wrong) |
| S1 · Overlong phrases (>70 chars) | ✅ none |
| S2 · Single generic word | ✅ none |

**Modifier coverage:** 39 phrases use feature modifiers ("with …", "solve for …"), 56 carry locale/currency intent, 1016 say "free".

## Q3 — Phrases sharing no word with the tool name (review list)

Often legitimate (synonyms, problem-space queries like "how many bags of concrete do i need") — but each should get a deliberate paragraph, not just the kw tag.

| Page | Phrase |
|---|---|
| `/auto/fuel-price-compare` | petrol vs diesel |
| `/business/cac` | customer acquisition cost |
| `/business/roas` | return on ad spend |
| `/business/mrr` | monthly recurring revenue |
| `/business/discount-rate` | cost of capital |
| `/business/saas-unit-metrics` | ARPU calculator |
| `/business/saas-unit-metrics` | LTV calculator |
| `/business/saas-unit-metrics` | CAC calculator |
| `/career/salary-converter` | hourly to annual |
| `/conversion/length` | meters to feet and inches converter |
| `/conversion/pressure-conv` | pascal bar psi |
| `/conversion/temperature` | celsius to fahrenheit |
| `/conversion/temperature` | temp conversion |
| `/conversion/temperature` | kelvin converter |
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
| `/finance/bond-yield` | YTM calculator |
| `/finance/bond-yield` | fixed income |
| `/finance/retirement-income` | 401k calculator |
| `/finance/retirement-income` | IRA calculator |
| `/finance/sip` | mutual fund |
| `/finance/crypto-profit` | cryptocurrency gains |
| `/finance/stock-profit` | capital gains |
| … | +32 more |

## Method & honest limits

- Extraction source is the deployed site + `js/data/*.js` — same pipeline as KEYWORD-TARGETS.md, so both documents always describe the same inventory.
- This audit measures **on-page targeting quality only**. It cannot measure search volume, difficulty, or current positions: that needs GSC + a rank tracker (credentials currently unconfigured — see docs/api-credentials-setup.md).
- Live-SERP spot checks (2026-09-18, small sample, en/US): brand term → site #4; "calcpromaster calculators" → **GitHub repo #1/#3, site not in top 10**; "loan emi calculator", "concrete volume calculator in cubic yards", "cgpa to percentage conversion calculator", "home loan emi calculator with monthly prepayment" → site not in top 10. Site IS indexed (site: returns pages, but titles are stale: "543+" era).