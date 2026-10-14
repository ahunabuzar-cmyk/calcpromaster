# Keyword Quality Audit — CalcProMaster

_Deterministic audit over the same extraction as docs/KEYWORD-TARGETS.md. Nothing hand-added. Re-run with: `npm run keywords:audit`._

**Inventory:** 1420 indexable pages · 1284 tools · 2526 curated phrases.

## Verdict at a glance

| Check | Finding |
|---|---|
| C1 · Title cannibalization | ✅ none |
| C2 · Phrase cannibalization (2+ pages target same phrase) | ✅ none |
| C3 · Duplicate phrase inside one tool | ✅ none |
| Q1 · Year-stamped phrases | ⚠️ 2 |
| Q2 · App/download-intent phrases on web tools | ✅ none |
| Q3 · Phrases sharing no word with tool name | ℹ️ 134 (review, not always wrong) |
| S1 · Overlong phrases (>70 chars) | ✅ none |
| S2 · Single generic word | ✅ none |

**Modifier coverage:** 40 phrases use feature modifiers ("with …", "solve for …"), 69 carry locale/currency intent, 1017 say "free".

## Q1 — Year-stamped phrases (stale by next year)

Hard years inside evergreen keywords guarantee staleness. Drop the year — the page can mention recency without baking it into the target.

| Page | Phrase |
|---|---|
| `/regional/bangladesh-income-tax` | nbr tax calculator 2025-26 |
| `/regional/mexico-isr-salary` | calculadora isr 2026 |

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
| `/business/sponsorship-rate` | how much to charge sponsored post |
| `/business/sponsorship-rate` | creator pricing calculator |
| `/business/brand-deal-value` | sponsored package price |
| `/business/brand-deal-value` | influencer campaign cost |
| `/business/ev-charger-business-roi` | public charging station profit |
| `/career/salary-converter` | hourly to annual |
| `/career/career-break-runway` | how long will savings last |
| `/career/interview-to-offer-tracker` | application success rate |
| `/construction/pipe-cutback` | fitting takeout calculator |
| `/construction/pipe-cutback` | elbow takeout chart |
| `/construction/pipe-cutback` | pipefitter cut length |
| `/construction/journeyman-wage-progression` | trade career earnings |
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
| `/education/scholarship-gap` | unmet need calculator |
| `/education/school-fee-inflation` | future tuition cost |
| `/engineering/pipe-pressure-loss` | hazen williams calculator |
| `/engineering/hvac-load` | manual j calculator |
| `/engineering/hvac-load` | btu per square foot air conditioner |
| `/everyday/calorie-counter` | nutrition tracker |
| `/everyday/calorie-counter` | diet plan |
| `/everyday/statute-of-limitations` | claim deadline calculator |
| `/everyday/statute-of-limitations` | time limit to sue |
| `/everyday/statute-of-limitations` | legal filing deadline |
| `/everyday/cost-of-living-compare` | equivalent salary calculator |
| `/finance/loan-emi` | day count convention |
| `/finance/mortgage` | fha vs conventional loan comparison calculator |
| `/finance/mortgage` | home loan affordability calculator with property tax |
| `/finance/compound-interest` | investment growth calculator with monthly sip |
| `/finance/compound-interest` | solve for rate |
| … | +84 more |

## Method & honest limits

- Extraction source is the deployed site + `js/data/*.js` — same pipeline as KEYWORD-TARGETS.md, so both documents always describe the same inventory.
- This audit measures **on-page targeting quality only**. It cannot measure search volume, difficulty, or current positions: that needs GSC + a rank tracker (credentials currently unconfigured — see docs/api-credentials-setup.md).
- Live-SERP spot checks (2026-09-18, small sample, en/US): brand term → site #4; "calcpromaster calculators" → **GitHub repo #1/#3, site not in top 10**; "loan emi calculator", "concrete volume calculator in cubic yards", "cgpa to percentage conversion calculator", "home loan emi calculator with monthly prepayment" → site not in top 10. Site IS indexed (site: returns pages, but titles are stale: "543+" era).