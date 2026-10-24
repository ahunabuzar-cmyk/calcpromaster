# Expose tier + drift gate — handoff (12 Oct 2026)

> Ye doc insaan ke liye hai (auto-generated nahi). Har number ka source file/command diya gaya hai,
> aur jo cheez prove nahi hoti wo alag section (§5) mein likhi hai — koi dawa zyada nahi.

## 1. Teen kaam jo maange gaye the, aur unka status

| Kaam | Status | Proof |
|---|---|---|
| **"Prove one page can move"** | ✅ | `docs/PAGE-EXPOSURE-PROOF.md` §4 — do baseline, per-bucket word depth |
| **"Catch page count drift"** | ✅ | `scripts/check-page-count-drift.cjs` + `npm run check:page-drift` + CI step; NUL-padded page par exit 1 |
| **"Fill the #1 page's gap" (expose tier pehle)** | ✅ | `js/tool-enhance.js` — region/year bucket: home-insurance, fha-loan, pmi-calculator |
| Bonus: prerender aur hydrated DOM ka order match | ✅ | `js/tool-enhance.js` injector `appendChild` → `prepend` |
| Bonus: cluster gate 64 jhooti failure | ✅ | `scripts/check-cluster-links.cjs` URL matching |

## 2. Expose tier — kaun sa gap, kis evidence se

`data/query-reach.json` (28-din GSC join) + exposure measurement se milkar ek hi bucket baqi nikla:
**`region` (Region / year variant)**.

| Page | GSC (28d) | Pehle | Ab | Evidence |
|---|---|---|---|---|
| `/lifestyle/home-insurance` (#1 page) | 75 queries · 1,003 impr | coverage 87.5%, region missing + 54.8% depth | **coverage 100%**, region depth **22.2%** | deploy HTML, `measureExposure` |
| `/finance/fha-loan` | 24 queries · 373 impr | coverage 87.5%, region missing | **coverage 100%** | wahi |
| `/finance/pmi-calculator` | 74 queries · 453 impr | coverage 87.5%, region missing | **coverage 100%** | wahi |
| `/guides/business-days` | 165 queries · 219 impr | table 45.3% · question 43.3% | table **18.6%** · question **9.7%** · formula missing→present | pichhla change (doc §4, baseline 1) |

Content ka andaz: **rate per $1,000 hi wo input hai jo location badalti hai** — is liye US/Canada ka
rate-per-$1,000 convention aur UK/Australia ka sum-insured convention samjhaya gaya (conversion
ka arithmetic dikhaya: £480 ÷ £240,000 → £2.00 per $1,000), FHA par county-level limit (annual,
HUD) vs national MIP rate, aur PMI par insurer/state filings vs FHA ka national rate.
Koi nayi market statistic invent nahi ki gayi — sirf convention aur mechanism, aur wo bhi apne
calculator ke apne numbers se verify karke.

## 3. Drift gate — ye kya pakadta hai

`node scripts/check-page-count-drift.cjs`

* **Invariants (baseline ke bina bhi):** koi page contentless nahi (< 50 readable words),
  har tool id ka page mojood, har sitemap URL ka local HTML mojood, sitemap mein duplicate `<loc>` nahi.
* **Drift:** structural counts (sitemap/deploy/tools/inventory) zero tolerance; reach counts
  (stuck/thin/broad) sirf `--tolerance-pct` (default 10%) se zyada hilne par.

Haqeeqat mein test kiya gaya (12 Oct): `deploy/lifestyle/home-insurance/index.html` ko NUL bytes se
badal kar chalaya →

```
  DRIFT contentlessPages      0 → 1 (+1) → structural
FAILED: invariant(s) broken:
  · 1 page(s) have no readable content (< 50 words) — build truncated?
exit=1
```

Note: `deployPages` us waqt **1617 hi raha** — yani file-count ya size based check isay pakad hi
nahi sakta. File wapas restore karne par gate dobara green.

CI: `.github/workflows/ci.yml` mein `Page-count drift gate` step (build ke baad, deploy/ par).
Jaan-boojh kar badla ho to: `npm run check:page-drift -- --update` + baseline commit.

## 4. Jo issues rastey mein mile aur theek kiye

1. **Cluster gate 64 jhooti failure de raha tha.** `hasLink()` sirf `href="/key"` match karta tha,
   magar deploy tree guides ko flat file (`/guides/x`) aur tool pages ko directory (`/finance/loan-emi/`)
   ki tarah likhta hai. Ab dono shakalein qubool hain → **64 → 0 failure**, topology waqai intact hai
   (`ok 56 spokes carry a hub link; 8 hubs carry ≥2 spoke links`). Ye check ab CI mein bhi hai.
2. **Prerender vs hydrated DOM ka order alag tha.** SSG card ko AEO block ke baad rakhta tha, magar
   runtime injector usay explain-block ke *aakhir* mein (yani FAQ ke baad) daal raha tha — user ko
   faida nahi mil raha tha. Ab `prepend` → DOM order prerender se match karta hai (screenshot se verify).

## 5. Ye kya prove NAHI karta (saaf baat)

* **Ranking / clicks / impressions mein koi tabdeeli nahi dikhayi gayi.** GSC ka fresh export is session
  mein nahi hai; is liye koi position ya CTR ka dawa nahi. Exposure ek **mechanism** hai, nateeja nahi.
* **`region` bucket abhi kisi query mein maanga nahi ja raha** (GSC join). Ye page ka interpretation gap
  tha, keyword ka target nahi. Iska matlab: is change se impressions barhne ka koi wada nahi.
* **`/family/child-height` jaan-boojh kar chhoda gaya** — 3 queries · 7 impressions, content coverage
  pehle se 100%. Wahan naya content likhna padding hota (brief ka rule #5). Us page ka masla visibility/
  indexing hai, wording nahi.
* **Measurement content-side hai** (jo HTML crawler ko milta hai). Core Web Vitals, mobile usability ya
  real-user metrics is instrument se nahi naapay jaate.
* **CI mein baseline files commit honi chahiye** (`data/page-count-baseline.json`) — warna gate sirf
  invariants chalata hai aur counts ko "no baseline" dikhata hai. `data/query-reach.json` aur
  `data/site-inventory.json` repo mein nahi hain, is liye CI un counts ko skip karta hai (script ye
  saaf print karta hai).

## 6. Verification (jo actually chalaya gaya)

| Check | Result |
|---|---|
| `npx vitest run tests/unit` | **2444 passed / 73 files** |
| `node scripts/check-page-count-drift.cjs` | pass (+ NUL-padded page par exit 1) |
| `node scripts/check-cluster-links.cjs` | pass (64 FAIL → 0) |
| `npm run lint:js` | 423 files, 0 failed |
| `npm run check:counts` | consistent (1282) |
| `node scripts/check-sitemap-coverage.cjs` | 1417 covered, 0 missing |
| `node scripts/seo-indexing-audit.cjs` | pass |
| `node scripts/audit-report-staleness.cjs` | pass (koi stale artifact nahi) |
| `node scripts/verify-seo-overrides.cjs` | 66 overrides + 47 label repairs rendered |
| `node build-deploy.js` | exit 0 (1617 pages, 112,097 internal links, 0 broken, 0 slash mismatches) |

## 7. Rollback

```bash
git checkout -- js/tool-enhance.js scripts/check-cluster-links.cjs scripts/measure-page-exposure.cjs
git checkout -- .github/workflows/ci.yml package.json
git checkout -- data/page-exposure-changes.json data/page-count-baseline.json
node build-deploy.js            # deploy/ wapas purane content par
```

Sirf content wapas chahiye: `js/tool-enhance.js` ke teen cards se `<h3>` blocks hata do aur
`card.prepend(div)` ko `card.appendChild(div)` kar do (ya file ko git se restore karo) — `registry`
ya `all-tool-ids.json` chhue nahi gaye, is liye koi URL/pages count nahi badla.

## 8. Aage (30/60/90)

* **0–7 din:** GSC se fresh Pages + Queries export → `node scripts/gsc-coverage-diff.cjs` aur
  `node scripts/seo-movement-report.cjs` chala kar pata karo ke in teen pages par region wording ke
  baad koi query shakal badli ya nahi (baseline pehle se docs mein hai).
* **7–30 din:** expose tier ke baqi 2 pages (business-days ke comparison/modifier buckets, child-height)
  par wahi tareeqa: pehle **evidence** (kis query ka intent bucket missing hai), phir section.
* **30–90 din:** write tier (20 pages, 29 buckets) — ek waqt mein 2–3 pages, har batch ke baad
  `measure-page-exposure.cjs --snapshot --baseline data/…-<batch>.json` aur apna compare table.
