# Crawl plan — Discovered / Unknown pages

**Generated:** 2026-10-10 · by `node scripts/build-crawl-plan.cjs`
**Source data:** `data/gsc-inspect-notindexed.json` (784 URLs inspected live) + `data/gsc-page-impressions.json`

## 1. Situation

| | Count |
|---|---|
| GSC site-wide "Discovered - currently not indexed" | **631** |
| Hamare live sweep ka crawl-pending set (Discovered + Unknown) | **585** |
| In mein se jinhe GSC impressions de raha hai | **2** |
| Zero inbound tool-links | 0 |

**Diagnosis:** discovery ki problem nahi hai — 0 zero-inlink pages hain,
baaki sab 3+ internal links se reachable hain. Rukawat **crawl budget + page value** hai:
Google URL dekh chuka hai, par use crawl/rank karne layak priority nahi de raha.
Is liye plan ka pehla hissa crawl waste kam karna hai, doosra priority signals dena.

## 2. Priority tiers

| Tier | Kya matlab | Count | Action |
|---|---|---|---|
| **P1** | Google already impressions de raha hai — bas index nahi | **2** | GSC → Request Indexing (2 batches) |
| **P2** | Reachable (3+ inlinks), zero impressions | **583** | High-impression page se ek contextual link |
| **P3** | Weak graph (<3 inlinks) | **0** | Pehle link graph fix, phir request |

### Per-category

| Category | Pending | P1 | P2 | P3 | Impressions |
|---|---|---|---|---|---|
| math | 80 | 0 | 80 | 0 | 0 |
| finance | 75 | 0 | 75 | 0 | 0 |
| guides | 61 | 0 | 61 | 0 | 0 |
| engineering | 52 | 0 | 52 | 0 | 0 |
| science | 38 | 0 | 38 | 0 | 0 |
| career | 33 | 0 | 33 | 0 | 0 |
| business | 28 | 1 | 27 | 0 | 1 |
| conversion | 27 | 1 | 26 | 0 | 3 |
| construction | 27 | 0 | 27 | 0 | 0 |
| food | 23 | 0 | 23 | 0 | 0 |
| utilities | 21 | 0 | 21 | 0 | 0 |
| health | 20 | 0 | 20 | 0 | 0 |
| tech | 18 | 0 | 18 | 0 | 0 |
| family | 17 | 0 | 17 | 0 | 0 |
| auto | 15 | 0 | 15 | 0 | 0 |
| homegarden | 13 | 0 | 13 | 0 | 0 |
| fitness | 8 | 0 | 8 | 0 | 0 |
| education | 8 | 0 | 8 | 0 | 0 |
| lifestyle | 8 | 0 | 8 | 0 | 0 |
| everyday | 8 | 0 | 8 | 0 | 0 |
| regional | 4 | 0 | 4 | 0 | 0 |
| blog | 1 | 0 | 1 | 0 | 0 |

## 3. P1 — Request Indexing (2 URLs)

Ye wo crawl-pending pages hain jinko Google **already impressions** de raha hai — sabse aasan wins.
GSC URL Inspection → Request Indexing (~10–12/din, UI-only; koi public API nahi).
Poori site ke liye bada queue pehle se maujood hai: `docs/REQUEST-INDEXING-TOP40.md`.

| # | URL | Category | Impr | Pos | Inlinks |
|---|---|---|---|---|---|
| 1 | `/conversion/thermal-conductivity/` | conversion | 3 | 51.3 | 13 |
| 2 | `/business/cac/` | business | 1 | 7 | 66 |

> **Note:** sirf 2 crawl-pending page ko impressions mil rahe hain. Iska matlab
> Request Indexing yahan **chhota lever** hai — 631 pages ka problem crawl budget + page value hai,
> request-indexing nahi (Google URL dekh chuka hai aur jaan-bujh kar chunk mein index kar raha hai).

## 4. Crawl-waste shopping list (ye crawl budget kha raha hai)

| Item | Count | Kya karein |
|---|---|---|
| noindex pages par internal links (nav/footer: `/history/`, `/favorites/`, `/compare/`, `/cookies`) | ~10,564 links | Nav se hatao — ye crawl budget bachata hai |
| Long-tail modifier pages (noindex, canonical → parent) | 198 files | Rehne do (deep links TODO work karte hain), par nav se link na karo |
| Stale "Page with redirect" signal | 86 URLs live 200 | Sirf re-crawl se clear hoga — request indexing in par waste na karo |

## 4b. Value problem — thin junction pages (asli lever)

"Crawled - currently not indexed" (14 pages) ka matlab Google ne page crawl kiya par index
karne layak nahi samjha. Us bucket ka URL list GSC ke coverage export mein nahi aata — sirf count.
Is liye proxy wahi hai jo measurably thin hai: site ke sab se chhote INDEXABLE pages.
Do page families nikle — dono ek-ek link junction hain, is liye thinness wahan do baar mehngi padti hai.

| Page family | Pehle | Ab | Kya add hua |
|---|---|---|---|
| 20 comparison hubs `/hub/<cat>/` | catalog-heavy, editorial ~314-645 words | +249–318 words/hub | unique intro, "what you can work out" (4 points), 3 category FAQs + FAQPage schema |
| 17 category guides `/guides/<cat>` | 315–375 words, zero FAQ | 589+ words (avg 615) | lede, "where these answers go wrong" (4 pitfalls), 3 guide FAQs + FAQPage schema |

Content genuinely per-page unique hai (unit tests duplicate copy reject karte hain), aur dono families
ke liye prerendered HTML == hydrated DOM, is liye koi cloaking/parity risk nahi.

- Hubs: `js/category-depth.js` + `scripts/ssg-pages.cjs` (SSG + client renderer dono).
- Guides: `js/guide-depth.js` + `scripts/apply-guide-depth.cjs` (`--check` CI gate, idempotent).
- Live number: `npm run seo:thin` → `docs/THIN-PAGES-REPORT.md` (threshold + shape wise);
  abhi < 500 words wale saare bache hue pages "focused" shape ke hain — FAQ + multiple subheadings,
  zero "bare" (short aur bina FAQ) indexable pages.

## 5. Sequence (agla 4 hafte)

1. **Crawl waste band karo** — nav/footer se 4 noindex URLs hatao (ek template edit, har page se 4 links kam).
2. **Depth deploy karo** — hubs + category guides already enrich ho chuke hain; deploy karne ke baad GSC se woh URLs + top tool URLs request karo.
3. **P1 batch 1** — 2 URLs GSC se request karo; baaki ke liye `docs/REQUEST-INDEXING-TOP40.md`.
4. **P2 links** — P2 pages ko high-impression indexed pages se meaningful "related calculator" links do.
5. **Measure** — har hafte: `npm run seo:indexation-tracker` (movement) + `npm run seo:report` (dated report).

> Expectation: P1 pages 1–3 hafte mein index hone chahiye (immediate chunk). Crawl-budget fixes
> ~4–8 hafte mein effect dikhate hain. Har hafte ka GSC Coverage ZIP chalao — movement khud pata chalegi.
