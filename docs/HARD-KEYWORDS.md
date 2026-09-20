# Hard Keywords — Full List + Easy Replacement for Every Page

_Generated 2026-09-18 by `scripts/build-hard-keywords-doc.cjs` (deterministic; data: `js/data/*.js` curated `kw` fields + `.keywords.jsonl`). Tiering model: `scripts/keyword-difficulty.cjs`._

## 0. Direct answer — kitne keywords target hue, kitne easy

| Count | Meaning |
|---|---|
| **2225** | total curated keywords targeted across **1201 tool pages** (deterministic count from js/data) |
| **1226** | 🟢 EASY — long-tail (4+ words + intent qualifier); live probes (docs/KEYWORD-DIFFICULTY.md §1) is pattern par top-10 mein **0–1 strong brands** dikhaate hain — microsites rank karti hain |
| **999** | 🟡 MEDIUM — 3-word ya qualified 2-word; thodi links chahiye |
| **0** | 🔴 HARD — head terms; top-10 = brand wall (calculator.net, omnicalculator, Groww, Khan Academy… DR 70–90) |
| 0 | BRAND — site ke apne queries |

**Pages with at least one hard keyword: 0** — inme se **0 pages ke paas pehle se hi apna EASY keyword mojood hai** (hard wala side-keyword hai, primary nahi). **Sirf 0 pages sirf hard par khade hain** — unke liye §2 mein ek-ek EASY replacement attached hai (same-category sibling).

## 1. HARD list — ranked (sabse pehle: in par waqt MAT lagao)

| Tool | Page | Hard keywords (why: brand wall) |
|---|---|---|

### Mixed pages (hard keyword rakha hai lekin EASY bhi maujood — koi kaam nahi bacha)

_koi nahi_

## 2. FIX MAP — har hard-only page par EASY replacement

Ye pages abhi sirf brand-wall keyword target karte hain. Replacement jaan-boojh kar **derived** hai (tool ke apne naam se, `free online` qualifier ke saath) — kisi sibling ka owned phrase dobara use NAHI kiya, warna C2 cannibalization wapas aa jata. Swap: `kw` field mein hard phrase hatao, derived phrase daalo; titles/meta untouched (wo already long-tail hain).

| Tool | Page | Abhi (hard) | Target karo (easy) |
|---|---|---|---|

## 3. Rules (probes se derive — docs/EASY-KEYWORD-LIST.md)

- **Hard = reject (abhi):** 1–2 shabd ke head terms jinka SERP strong-brand heavy hai. Ye wahi queries hain jahan DR 80+ brands rank karti hain — user rule (<20 strong in top-10) ka ulta.
- **Easy = go:** 4+ shabd + intent qualifier. Probe-verified niches: SME/invoicing, DIY-construction deep queries, IT/power sizing, lab/engineering single-formula, lawn/garden, speech/productivity.
- **YMYL finance heads** (loan/EMI/CAGR/FD) har probe mein 5+ fintech brands — kabhi bhi head par nahi, sirf feature-qualified long-tail par.
- Tier boundaries deterministic hain (`keyword-difficulty.cjs`); live SERP drift hota hai, isliye GO-list finalize karne se pehle us niche ki 1 probe phir chalao.
