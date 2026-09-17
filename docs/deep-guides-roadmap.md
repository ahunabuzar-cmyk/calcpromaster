# Deep Guides Roadmap — Top 50 Tools (committed queue)

Status legend:
- **DEEP** = 1500+ words with formula, worked example, tables, FAQ, internal links
- **EXT** = extended this cycle (added substantive sections; 900–1500 words)
- **BASE** = guide exists (~600–900 words) — queued for deepening
- **NONE** = no dedicated guide yet — queued for creation

_GSC evidence_ = query appeared in our Search Console data (random calculator, baby cost calculator, finance calculator, course calculator, home loan tax calculator).

## Completed this cycle

| Guide | Status | What was added |
|---|---|---|
| guides/random-numbers | DEEP (827→1330 w) | uniform vs weighted picks, raffle-odds correction, gambling-fallacy myths, CSPRNG boundary, 2d6 probability table, C(49,6) unique-pick combinatorics |
| guides/percentage | DEEP (580→1100 w) | reverse-percentage patterns, real-decision link map, percentage-points vs percent section (computed $3,012 refinance example) |
| guides/emi | DEEP (624→1340 w) | computed amortization table, prepayment effect, lender-statement differences, floating-rate reset worked example, APR vs nominal rate (12.89% computed) |
| guides/baby-cost | NEW (built deep) | GSC-evidenced query; one-time vs recurring vs childcare structure, computed $4,500 vs $20,088 example, 5-Q FAQ |
| blog (3 posts) | NEW | stacked-discounts, how-emi-works, bmi-honest-look — BlogPosting schema, hub + SPA + sitemap + llms.txt integrated |

## Top-50 queue (priority order)

### Tier 1 — GSC evidence or flagship tools (next batch)
| # | Tool | Guide file | Status | Plan |
|---|---|---|---|---|
| 1 | Random Number Generator | guides/random-numbers | DEEP | done — 2d6 table + combinatorics added |
| 2 | Baby cost / budgeting | guides/baby-cost | NEW | done — review after 90 days of GSC data |
| 3 | Loan EMI | guides/emi | DEEP | done — floating reset + APR sections added |
| 4 | Percentage | guides/percentage | DEEP | done — pp-vs-% section added |
| 5 | BMI | guides/bmi | EXT | done — reverse-BMI range, BMI Prime, Asian cutoffs, Ponderal note |
| 6 | Compound interest | guides/compound-interest | EXT | done — Rule-of-72 accuracy table, inflation reversal, contributions formula |
| 7 | Mortgage | guides/mortgage | EXT | done — computed 15v30 table, prepayment middle path, PMI month-101 math |
| 8 | Income tax (India) | guides/income-tax | EXT | done — verified FY 2025-26 slabs, 87A rebate, ₹16L worked example |
| 9 | Salary | guides/salary | EXT | done — raise net-effect math, India/PK/UAE regional notes |
| 10 | Calories/TDEE | guides/calories | EXT | done — multiplier calibration, macro gram conversion worked example |

### Tier 1 → Tier 2 status note (updated this cycle)
All ten Tier-1 items now EXT or DEEP. **Tier 2 (items 11–20) complete this cycle** — all ten extended with computed numbers only, registry-verified links (one real slug bug caught: /finance/debt-payoff → /finance/debt-snowball), valid JSON-LD re-verified. Next: Tier 3 deepening (21–35).

### Tier 2 — high-traffic core tools
| # | Tool | Guide file | Status | Plan |
|---|---|---|---|---|
| 11 | Concrete | guides/concrete | EXT (1080→1241 w) | done — mix-ratio grades (M10–M25), water-cement trap (25 L per 50 kg bag), bag-yield table |
| 12 | GPA | guides/gpa | EXT (1105→1256 w) | done — cumulative re-sum worked example (110.2÷31 = 3.55), why term-averaging breaks, scale differences |
| 13 | Discount | guides/discount | EXT (773→867 w) | done — successive-discount formula 100−(70×80)÷100 = 44%, blog cross-link |
| 14 | Zakat | guides/zakat | EXT (918→1039 w) | done — nisab table (85 g gold / 595 g silver, illustrative values marked), $270 worked example |
| 15 | Retirement | guides/retirement | EXT (837→949 w) | done — 4%-rule origin + inflation-adjusted drawdown path ($40,000→$45,020, computed) |
| 16 | Debt payoff | guides/debt-payoff | EXT (878→1009 w) | done — simulated snowball vs avalanche (28 mo both, $644.57 vs $827.93 interest), slug fix debt-snowball |
| 17 | Age | guides/age | EXT (835→935 w) | done — Feb 29 legal-birthday edge case (9,131 vs 9,132 days computed) |
| 18 | Unit conversion | guides/unit-conversion | EXT (1131→1205 w) | done — round-trip drift self-check (10 m → 32.8084 ft → 10.000000 m) |
| 19 | GST/Sales tax | guides/gst-sales-tax | EXT (723→841 w) | done — value-added chain worked example (2,160+540+540 = ₹3,240 = 18% of ₹18,000) |
| 20 | Tip | guides/tip | EXT (733→818 w) | done — 5-person split worked example ($184.65 → $43.58 pp) |

### Tier 3 — category anchors (guide exists, deepen over time)
21–35: inflation, break-even, passwords, currency-conversion, ideal-weight, BMR, profit-margin, break-even target-profit, Ohm's law (science), gear ratio (engineering), fuel cost (auto), hourly-rate (career), paint coverage (homegarden), macro calculator (food), SIP (regional)

**Status (final):** COMPLETE. inflation/break-even/passwords/currency-conversion already existed (840–1200 w). The remaining 11 topic guides built this cycle: ideal-weight, bmr, profit-margin, ohms-law, gear-ratio, fuel-cost, hourly-rate, paint-coverage, macro-calculator, sip (+ fd-ppf-sip from Tier 4). All 841–1072 words, computed examples, FAQPage schema generated from visible FAQs.

### Tier 4 — no dedicated guide yet (create when Tier 1–3 are deep)
36–50: loan-amortization deep dive, FD vs PPF vs SIP comparison, EV-vs-petrol TCO, freelance rate card, wedding budget, maternity pay (UK SMP), screen-time, child height prediction, UUID/password tools, electricity bill decode, date-difference business days, grade-needed, room-area, AC sizing, protein intake

**Status (final):** COMPLETE except 3 items deferred with reasons: maternity pay UK SMP (jurisdiction-specific statutory rules — needs per-year verification of official rates, low GSC relevance), child height prediction (guide duplicates the calculator's method section without adding value yet), UUID/password tools (covered by existing guides/passwords 1200 w). Built this cycle: fd-ppf-sip, ev-vs-petrol, wedding-budget, freelance-rate-card, screen-time, electricity-bill, business-days, grade-needed, room-area, ac-size, protein-intake — all with computed worked examples.

## Final state
- Guides hub total: 64 pages (43 existing + 21 new topic guides)
- All topic guides: Article + BreadcrumbList + FAQPage JSON-LD (FAQ schema generated from visible page text), glossary-tooltips included, verified CTA routes only
- All integrations done: sitemap (+21), coverage checker (+21), static hub (+21 cards), SPA hub (+21 cards), llms.txt (+22 references)
- Roadmap complete. Remaining growth work is external: deployment, GSC submission, backlinks/outreach.

## Rules for every new/extended guide
1. Formula stated once, correctly, with variable definitions
2. At least one worked example with hand-verified numbers (compute, never estimate)
3. Honest limitations/assumptions section
4. 3+ verified internal calculator links (registry-checked before build)
5. FAQPage + Article + BreadcrumbList schema, valid JSON-LD
6. Glossary tooltips script included
7. Heading order: no skips (h1→h2→h3)
8. Sitemap + checker + llms.txt + hub integration (static + SPA) before done
