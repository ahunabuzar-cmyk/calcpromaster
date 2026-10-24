# Teen kaam — crawl plan, weekly tracker, thin pages

**Date:** 2026-10-10 · **Scope:** crawl plan (631 bucket), weekly indexation tracker, thin-page fix
**Status:** ✅ teeno complete · sab unit tests green (53 files / 2,043 tests)

---

## 1. Crawl plan — "Discovered - currently not indexed" (631)

`npm run seo:crawl-plan` → [CRAWL-PLAN-DISCOVERED.md](CRAWL-PLAN-DISCOVERED.md) + `data/crawl-plan.json`

- GSC site-wide bucket: **631**. Hamara URL-level actionable set: **585** crawl-pending pages
  (live sweep se — 1511 pages scan hui, link graph inlinks ke saath).
- Tiering: **P1** = impressions mil rahe hain par index nahi → request-indexing (2 URLs),
  **P2** = reachable (3+ inlinks), zero impressions → internal-link priority (583),
  **P3** = weak graph (0 — koi orphan nahi).
- **Diagnosis:** discovery missing nahi hai, crawl budget + page value hai. Is liye plan ka pehla
  hissa crawl waste kam karna hai aur doosra priority signals dena.

> 631 vs 585: 631 GSC ka site-wide count hai (URL list export mein nahi aata), 585 woh subset hai
> jise hum live inspect kar chuke hain — sirf usi par action liya ja sakta hai.

## 2. Weekly indexation tracker

`npm run seo:indexation-tracker` → `data/indexation-history.json` (snapshot rows + `+/-` deltas)

```
snapshot : 2026-10-04  (new row added)
Indexed      :    952
Not indexed  :    923   (50.8%)
  Discovered - currently not indexed   631
  Page with redirect                   208
  Excluded by 'noindex' tag             54
  Crawled - currently not indexed       14
  Alternate page with proper canonical   9
  Server error (5xx)                     5
  Duplicate canonical                    2
```

- Har naye GSC Coverage ZIP par ek row append hoti hai; per-bucket delta aur trend khud ban jata hai.
- Weekly loop: naya ZIP → `npm run seo:coverage-parse -- --dir <folder>` → `npm run seo:indexation-tracker`
  → `npm run seo:report`.

## 3. Thin pages — 14 "Crawled - currently not indexed" ka on-page fix

GSC's is bucket ka **URL list nahi aata** (export mein sirf count hai), is liye proxy wahi banaya jo
measurable hai: site ke sab se chhote **indexable** pages. Do families mili, dono link junctions:

| Family | Pehle | Ab | Mechanism |
|---|---|---|---|
| 20 hubs `/hub/<cat>/` | catalog-only, editorial ~314–645 words | **+249–318 words/hub** | `js/category-depth.js` → SSG + client renderer |
| 17 category guides `/guides/<cat>` | **315–375 words**, koi FAQ nahi | **589+ words** (avg 615) | `js/guide-depth.js` → `scripts/apply-guide-depth.cjs` |

Guide pages par jo add hua (har page par unique, koi templated duplicate nahi):

1. ek **lede paragraph** — us cluster ka asli idea (2 sentences),
2. **"Where these answers go wrong"** — 4 concrete pitfalls usi topic ke,
3. **FAQ section + FAQPage JSON-LD** — 3 guide-level Q&A.

Naya measurement tool: `npm run seo:thin` → [THIN-PAGES-REPORT.md](THIN-PAGES-REPORT.md) + `data/thin-pages.json`

```
pages scanned : 1407
thin pages    : 22   (bare: 0 · focused guides: 22)
thinnest      : 400 words
```

- **bare = 0**: koi aisa short indexable page nahi bacha jisme na FAQ ho na subheadings.
- Bache hue 22 pages "focused" shape ke hain (FAQ + multiple h2 + worked examples) — 400–487 words.
- Report khud inlink counts bhi dikhati hai (kis page par site kitni depend karti hai) — jaise
  `/graph.html` (1,510 inlinks), `/guides/screen-time.html` (143).

Isi ke saath:

- `/blog/` index (456 words, no FAQ) par 3-question FAQ section + FAQPage schema add hua.
- `og-image.html` (internal 1200×630 render template, sirf 50 words) par `noindex, follow` lag gaya —
  ye content page nahi hai, index mein nahi jaana chahiye.
- Legal/utility pages (`/privacy`, `/terms`, `/contact`, `/editorial-policy`, `/disclaimer-*`) report mein
  documented short-by-design hain — thin pages nahi gine jaate.

---

## Commands

```bash
npm run seo:crawl-plan            # 585 crawl-pending pages → tiers + queue + docs
npm run seo:indexation-tracker    # weekly snapshot + per-bucket deltas
npm run seo:coverage-parse -- --dir data/gsc-coverage-export-<date>
npm run seo:thin                  # thin indexable pages (threshold + shape)
npm run seo:guide-depth           # re-apply guide depth after editing js/guide-depth.js
npm run seo:guide-depth:check     # CI gate: guides stale hain to fail
npm run deploy:build              # deploy/ rebuild (guides root se copy hote hain)
```

## Files

| File | Kya hai |
|---|---|
| `js/guide-depth.js` | 17 guides ka unique depth content (lede + 4 pitfalls + 3 FAQs) |
| `js/category-depth.js` | 20 hubs ka unique depth content |
| `scripts/apply-guide-depth.cjs` | idempotent injector (`--check` gate) |
| `scripts/thin-page-report.cjs` | thin-page scan + shape classification |
| `scripts/build-crawl-plan.cjs` | crawl plan (631 bucket → actionable tiers) |
| `scripts/gsc-indexation-tracker.cjs` | weekly snapshot + deltas |
| `tests/unit/guide-depth.test.js` · `apply-guide-depth.test.js` · `thin-page-report.test.js` | 26 tests |

## Aage kya

1. **Deploy** — hubs + guides ka naya depth live karo, phir GSC se un URLs ko request karo.
2. **Bache hue 22 focused guides** (400–487 words) — inke paas FAQ aur worked examples already hain;
   agar inhe 500+ words par le jaana hai to per-guide depth (same mechanism, naya content) chahiye.
3. **Crawl waste** — nav/footer se noindex URLs (`/history/`, `/favorites/`, `/compare/`, `/cookies`) hatao.
4. **Measure** — agla GSC ZIP → `seo:coverage-parse` → `seo:indexation-tracker`; 631/14 buckets
   neeche aane chahiye (4–8 hafte).
