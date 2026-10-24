# Hard Keywords — Full List + Easy Replacement for Every Page

_Generated 2026-10-17 by `scripts/build-hard-keywords-doc.cjs` (deterministic; data: `js/data/*.js` curated `kw` fields + `.keywords.jsonl`). Tiering model: `scripts/keyword-difficulty.cjs`._

## 0. Direct answer — kitne keywords target hue, kitne easy

| Count | Meaning |
|---|---|
| **2529** | total curated keywords targeted across **1285 tool pages** (deterministic count from js/data) |
| **1268** | 🟢 EASY — long-tail (4+ words + intent qualifier); live probes (docs/KEYWORD-DIFFICULTY.md §1) is pattern par top-10 mein **0–1 strong brands** dikhaate hain — microsites rank karti hain |
| **1261** | 🟡 MEDIUM — 3-word ya qualified 2-word; thodi links chahiye |
| **0** | 🔴 HARD — head terms; top-10 = brand wall (calculator.net, omnicalculator, Groww, Khan Academy… DR 70–90) |
| 0 | BRAND — site ke apne queries |

**Pages with at least one hard keyword: 7** — inme se **7 pages ke paas pehle se hi apna EASY keyword mojood hai** (hard wala side-keyword hai, primary nahi). **Sirf 3 pages sirf hard par khade hain** — unke liye §2 mein ek-ek EASY replacement attached hai (same-category sibling).

## 1. HARD list — ranked (sabse pehle: in par waqt MAT lagao)

| Tool | Page | Hard keywords (why: brand wall) |
|---|---|---|
| City Cost of Living Comparison Calculator | `/everyday/cost-of-living-compare` | `equivalent salary calculator` · `relocation salary comparison` |
| Cosigning a Loan Risk Calculator | `/finance/cosigning-loan-risk` | `loan default exposure` |
| Hijri Gregorian Date Converter | `/regional/hijri-converter` | `hijri date converter` |

### Mixed pages (hard keyword rakha hai lekin EASY bhi maujood — koi kaam nahi bacha)

| Tool | Page | Hard (secondary) | Easy (primary — is par jeeto) |
|---|---|---|---|
| Salary Negotiation Range Calculator | `/career/salary-negotiation-range` | `salary negotiation calculator` · `salary range calculator` · `negotiation target salary` | `how much to ask for salary` |
| Inheritance Tax Calculator (UK and India) | `/finance/inheritance-tax-uk-india` | `india inheritance tax` · `estate tax calculator` | `inheritance tax calculator uk` |
| Dubai/UAE Salary Calculator | `/regional/dubai-salary` | `dubai salary calculator` | `uae take home pay calculator` · `dubai tax free salary calculator` |
| Qatar Take-Home Salary Calculator | `/regional/qatar-take-home-salary` | `qatar salary calculator` | `doha salary tax free calculator` |

## 2. FIX MAP — har hard-only page par EASY replacement

Ye pages abhi sirf brand-wall keyword target karte hain. Replacement jaan-boojh kar **derived** hai (tool ke apne naam se, `free online` qualifier ke saath) — kisi sibling ka owned phrase dobara use NAHI kiya, warna C2 cannibalization wapas aa jata. Swap: `kw` field mein hard phrase hatao, derived phrase daalo; titles/meta untouched (wo already long-tail hain).

| Tool | Page | Abhi (hard) | Target karo (easy) |
|---|---|---|---|
| City Cost of Living Comparison Calculator | `/everyday/cost-of-living-compare` | `equivalent salary calculator` · `relocation salary comparison` | `free online City Cost of Living Comparison Calculator` (derived — unique, claim-free) |
| Cosigning a Loan Risk Calculator | `/finance/cosigning-loan-risk` | `loan default exposure` | `free online Cosigning a Loan Risk Calculator` (derived — unique, claim-free) |
| Hijri Gregorian Date Converter | `/regional/hijri-converter` | `hijri date converter` | `free online Hijri Gregorian Date Converter` (derived — unique, claim-free) |

## 3. Rules (probes se derive — docs/EASY-KEYWORD-LIST.md)

- **Hard = reject (abhi):** 1–2 shabd ke head terms jinka SERP strong-brand heavy hai. Ye wahi queries hain jahan DR 80+ brands rank karti hain — user rule (<20 strong in top-10) ka ulta.
- **Easy = go:** 4+ shabd + intent qualifier. Probe-verified niches: SME/invoicing, DIY-construction deep queries, IT/power sizing, lab/engineering single-formula, lawn/garden, speech/productivity.
- **YMYL finance heads** (loan/EMI/CAGR/FD) har probe mein 5+ fintech brands — kabhi bhi head par nahi, sirf feature-qualified long-tail par.
- Tier boundaries deterministic hain (`keyword-difficulty.cjs`); live SERP drift hota hai, isliye GO-list finalize karne se pehle us niche ki 1 probe phir chalao.
