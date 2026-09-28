# Top-20 Request Indexing Priority List — calcpromaster.com

**Kab use karna:** Netlify drag-drop LIVE hone ke BAAD + sitemap resubmit ke baad (warna purani copy index hoti hai).
**Kaise:** GSC → upar search box mein EXACT URL paste → Enter → "Request Indexing". Sirf **12/day** limit hai → 2 din mein poora.
**Rule:** URL bilkul wahi paste karo jo neeche hai (slash/no-slash = sitemap form). Ek character ka farq = "URL is not on Google" / wrong property.

Data source: GSC batches #1–#14 (375 indexed / 339 discovered / 445 unknown) + internal-links audit (0 orphan, 14 weak) + sitemap 1,347 exact-200 verification.

---

## Day 1 (pehle 12) — Money tools + Category pages

| # | URL (exact paste) | Status (batches) | Kyun pehle |
|---|---|---|---|
| 1 | `https://calcpromaster.com/finance/loan-emi/` | noindex-stale (ab clean) | Top money tool; purani property ne noindex dikhaya tha — current build `index, follow` hai, dobara inspect karwao |
| 2 | `https://calcpromaster.com/health/bmi/` | DISCOVERED | Sab se bada search volume; ab hub-guides + tools se inlinks mil gaye |
| 3 | `https://calcpromaster.com/math/percentage/` | DISCOVERED | High-volume math tool |
| 4 | `https://calcpromaster.com/finance/salary/` | UNKNOWN | Salary/pakistan volume; regional traffic ke liye |
| 5 | `https://calcpromaster.com/finance/mortgage/` | NOT-INSPECTED | Core money keyword; 6+ internal links ab guaranteed |
| 6 | `https://calcpromaster.com/finance/` | NOT-INSPECTED | Category page — index hua to 40+ tool links crawl honge |
| 7 | `https://calcpromaster.com/health/` | NOT-INSPECTED | Category hub |
| 8 | `https://calcpromaster.com/math/` | NOT-INSPECTED | Category hub |
| 9 | `https://calcpromaster.com/conversion/` | NOT-INSPECTED | Category hub |
| 10 | `https://calcpromaster.com/guides/loans-mortgages` | UNKNOWN | Guide hub — ab har finance tool page isko link karta hai |
| 11 | `https://calcpromaster.com/guides/health-fitness` | DISCOVERED | Hub guide |
| 12 | `https://calcpromaster.com/guides/math-statistics` | UNKNOWN | Hub guide |

## Day 2 (13–20) — Hub guides + blog

| # | URL (exact paste) | Status (batches) | Kyun |
|---|---|---|---|
| 13 | `https://calcpromaster.com/guides/business` | DISCOVERED | Hub guide |
| 14 | `https://calcpromaster.com/guides/engineering` | UNKNOWN | Hub guide |
| 15 | `https://calcpromaster.com/guides/unit-conversion` | UNKNOWN | Conversion cluster ka hub |
| 16 | `https://calcpromaster.com/guides/rent-vs-buy` | UNKNOWN | Finance guide, ab reciprocal links se strengthen |
| 17 | `https://calcpromaster.com/guides/compound-interest` | NOT-INSPECTED | Money guide (cagr embed page ke saath cluster) |
| 18 | `https://calcpromaster.com/guides/income-tax` | NOT-INSPECTED | Regional/tax cluster |
| 19 | `https://calcpromaster.com/blog/how-emi-works` | NOT-INSPECTED | Blog post — loan-emi ka supporting content |
| 20 | `https://calcpromaster.com/blog/rule-of-72` | NOT-INSPECTED | Blog post — compound-interest cluster |

**Alternate (agar koi fail ho jaye):** `https://calcpromaster.com/guides/debt-payoff` (UNKNOWN) ya `https://calcpromaster.com/guides/calories` (already INDEXED — request ki zaroorat nahi).

---

## Order of operations (zaroori)

1. Netlify drag-drop → live verify (main karunga jab tum kaho)
2. GSC → Sitemaps → `https://calcpromaster.com/sitemap.xml` **resubmit** (1,347 URLs)
3. Upar wali list — 12/day — exact URLs
4. Har request ke 3 din baad `node scripts/gsc-batch-inspect.cjs --urls <file>` se re-inspect (quota: 2,000/day)

## Kya expect karna (30-day goal ke liye)

- Day 1–3: Day-1 walon mein se zyada tar "Indexing requested" → "Indexed" (category pages sab se tez)
- Week 1: guides/blogs slow (content pages ko zyada signals chahiye — ab internal links diye gaye hain)
- Week 2–4: Discovered 339 → crawl rate barhne par girta hoga; Unknown 445 mein se bade hisse submit-inspection se index honay chahiye kyunki ab har page ke 6+ static inlinks hain
- Tracker: `node scripts/gsc-daily-tracker.cjs 2` roz chalao (impressions trend) — 100k/30d goal ka ground truth
