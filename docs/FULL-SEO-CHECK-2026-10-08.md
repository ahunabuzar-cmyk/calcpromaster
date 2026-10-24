# CalcProMaster — FULL SEO CHECK

**Date:** 8 October 2026
**Site:** https://calcpromaster.com/ (Cloudflare Pages)
**Previous review:** docs/FULL-SEO-REVIEW-2026-10-05.md (deploy ke pehle ki pass)
**Follow-up:** docs/INDEXATION-MOVEMENT-2026-10-09.md (redirect guard + indexation movement)
**Method:** Live GSC data + live raw-HTML crawl + local build-output audit (koi guess nahi, sab numbers real).

---

## 1. TL;DR (ek nazar mein)

| Area | Status |
|---|---|
| Technical SEO (canonical, robots, sitemap, redirects, schema) | 🟢 Full green |
| On-page (titles, meta, H1, uniqueness) | 🟢 Almost green |
| Internal linking | 🟢 Green |
| Google indexation | 🟡 Sabse bada masla — ~65% URLs abhi index nahi (9 Oct ko first movement dekha, §5) |
| Off-page authority (backlinks) | 🔴 Approx zero |

**Overall health: ~84/100** — technical base almost perfect hai, "growth" ki gaadi indexation + authority pe ruki hui hai.

**28-din GSC (7 Sep → 5 Oct 2026):** clicks **16**, impressions **12,473**, CTR **0.1%**, avg position **37.5**.
Pichhle period (12 clicks / 8,600 impressions) se **behtar** hai — matlab trend up hai, bas chhota hai.
**Update (9 Oct):** latest 28-din = **17 clicks · 13,445 impressions · avg pos 36.7** — trend up jaari hai.

---

## 2. Kya-kya check kiya (6 layers)

1. **Live raw HTML** — canonical, title, meta robots, og:title (5 sample pages: home, tool, guide-hub, boosted tool).
2. **Redirects & host** — http→https, www→?, non-slash→slash, pages.dev origin.
3. **robots.txt + sitemap.xml** — crawler allow, URL count, sitemap resubmit status.
4. **Google Search Console** — 28-din totals + per-page impressions (188 pages) + live URL Inspection (20 URLs).
5. **Build-output audit** — 1,615 HTML files ka canonical / title / meta description / H1 / noindex scan.
6. **Internal link graph + crawl gate** — orphan pages, inlink counts, covered targets.

---

## 3. Live technical signals (8 Oct, verified)

| Check | Result |
|---|---|
| Homepage title | `CalcProMaster — 1282+ Free Online Calculators` (45 chars) ✅ |
| Homepage canonical | `https://calcpromaster.com/` ✅ |
| Tool canonical (`/health/pf-ratio/`) | `https://calcpromaster.com/health/pf-ratio/` (slash) ✅ |
| Non-slash tool URL | 301 → slash form ✅ |
| `meta robots` | `index, follow` on real pages ✅ |
| og:title | present on all sampled pages ✅ |
| http:// → https:// | 301 → `https://calcpromaster.com/` ✅ |
| www → apex | ✅ **301 → apex** (Pages middleware se, 8 Oct) |
| pages.dev origin | ✅ **301 → apex** (Pages middleware se, 8 Oct) |
| robots.txt | 200, saare major + AI crawlers allowed, sitemap declared ✅ |
| sitemap.xml | 200, **1,415 URLs**, sab par `<lastmod>` ✅ |
| Sitemap resubmit (GSC) | HTTP **204** (Google ne re-fetch kiya) ✅ |
| Security headers | HSTS, CSP, COOP, nosniff, referrer-policy ✅ |

---

## 4. Google Search Console — 28 din (7 Sep → 5 Oct 2026)

- **Totals:** 16 clicks · 12,473 impressions · CTR 0.1% · avg pos 37.5
- **188 pages** ko impressions mile (koi bhi page 1 pe rank nahi kar raha, mostly pos 8–70).
- **Top pages (impressions):**

| Impressions | Clicks | Avg pos | Page |
|---|---|---|---|
| 307 | 0 | 10.8 | /finance/fha-loan |
| 188 | 0 | 28.6 | /finance/apy-calculator |
| 150 | 0 | 8.2 | /family/child-height |
| 106 | 0 | 9.0 | /family/baby-weight-gain |
| 100 | 0 | 33.9 | /finance/credit-utilization |
| 88 | 0 | 8.1 | /education/presentation-time |
| 73 | 0 | 53.3 | /construction/pipe-volume |
| 64 | 1 | 55.6 | /health/pf-ratio |

**Padhne ka tareeqa:** impressions aa rahi hain (Google jaanta hai pages hain) lekin CTR ~0 hai kyunki zyada tar impressions position 30–70 se aa rahi hain. Sirf **position 10 ke andar** wale pages par actually clickable ho sakte hain — isliye target = position 8–20 wale pages ko top 5 mein push karna.

---

## 5. Google indexation (asli bottleneck)

**Coverage snapshot (GSC, 2 Oct, 1,167 URLs):**

| Verdict | Count |
|---|---|
| INDEXED | 375 |
| UNKNOWN | 445 |
| DISCOVERED (crawled later) | 339 |
| CANONICAL (duplicate) | 3 |
| REDIRECT | 2 |
| OTHER | 3 |

**Fresh URL Inspection (8 Oct, 20 priority URLs):** 14 "Submitted and indexed", 5 "URL is unknown to Google", 1 "Discovered – currently not indexed". Sitemap resubmit = **204 OK**.

**Update (9 Oct, wahi 20 URLs):** 14 "Submitted and indexed", 4 "Discovered – currently not indexed", 2 "URL is unknown to Google". Yaani Google-ko-pata-nahi **7 → 2** ho gaya (5 URLs aage badhe, 0 peeche). Details: docs/INDEXATION-MOVEMENT-2026-10-09.md.

**Matlab:** ~1,415 sitemap URLs mein se ~375 indexed hain. Baaki **"discovered / unknown"** hain — ye Google ki taraf se "hum jaante hain, baad mein dekhenge" wali state hai. Website naya hai + authority ~0, isliye Google crawl budget kam de raha hai. Yeh normal hai lekin yahi #1 blocker hai.

---

## 6. On-page audit — 1,615 HTML pages scanned

| Check | Count | Verdict |
|---|---|---|
| Canonical galat / non-self | **0** | ✅ |
| Canonical missing | 13 | 🟡 sab non-indexable pages (404, 10 embed, og-image, qa-dashboard, google-verify) |
| Meta description missing | 13 | 🟡 wahi set (upar) |
| `noindex` pages | 198 | ✅ ye intentional variant pages hain (e.g. `/business/burn-rate/10000/`) |
| `noindex` page galti se sitemap mein | **0** | ✅ perfect |
| H1 missing | 10 | 🟡 sab embed / full-bleed / verification pages |
| Title > 60 chars (indexable) | **0** (was 43) | ✅ FIXED — naya gate 30–60 enforce karta hai |
| Duplicate title sets | 1 | 🟡 sirf khaali title ×2 (embed + verify) |
| Duplicate description sets | **0** | ✅ |

**Note:** Tool pages ke titles clean hain (build gate 0 long batata hai). **191 lamba titles guides/blog/content pages ke hain** — Google inhe ~600px par kaat deta hai, isliye SERP mein title adhoora dikh sakta hai.

---

## 7. Internal linking ✅

- Internal link audit: **1,615 pages · 109,080 links · 0 broken · 0 mismatch**.
- Crawl-link gate: **784/784 not-indexed targets** ko kisi INDEXED page se ≥1 inlink milta hai — **PASS**.
- Link graph: **0 orphan**, 0 page jiske <3 inlinks ho.
- Crawl-boost block live verify kiya (`/health/pf-ratio/` par `crawl-boost` markup present ✅).

---

## 8. Structured data (rich results) ✅

Live pages par ye schema mil rahe hain:
- `WebApplication`, `FAQPage` (+ `Question`/`Answer`), `HowTo` (+ `HowToStep`), `BreadcrumbList`, `Organization`, `WebSite`, `SearchAction`, `Offer`.
Yeh Google + AI answer engines (AEO/GEO) dono ke liye strong signal hai.

---

## 9. Off-page / authority 🔴

- External backlinks ≈ **0** (SEMrush ~1 referring domain).
- Yeh cheez rankings + indexation dono ko slow karti hai.
- **White-hat hi karenge** — genuine outreach, directories, tool mentions, guest content. Koi PBN / paid link / spam nahi.

---

## 10. Findings (ranked)

| # | Severity | Finding | Fix |
|---|---|---|---|
| **R1** | 🔴 HIGH | ~65% URLs still "discovered/unknown" (375/1,167 indexed) | GSC se top pages Request Indexing (doc ready), weekly auto-refresh, crawl-boost (already live). **9 Oct: first movement — unknown 7→2 (20-URL probe), 28-din impr 12,473→13,445** |
| **R1b** | ✅ MONITORED | Host consolidation regression risk (www/pages.dev dobara 200 de dein) | `scripts/check-host-redirects.cjs` + 7 tests + weekly step 5 (`--skip-hosts`); live 6/6 PASS |
| **R2** | ✅ FIXED | `www.calcpromaster.com` 200 duplicate — ab live **301 → apex** | `functions/_middleware.js` (deployed 8 Oct) |
| **R3** | ✅ FIXED | `calcpromaster.pages.dev` 200 duplicate — ab live **301 → apex** | Same middleware; preview URLs untouched |
| **R4** | ✅ FIXED | Title >60 chars — **asli count 43 indexable** (37 guides + 4 blog + embed + geometry-lab), sab 30–60 me trim (raw 191 ka figure `&amp;` se inflate tha) | Gate `audit-title-length.cjs` 30–60 pe set; `fix-long-titles.cjs` ne source titles shorten kiye |
| **R5** | 🟡 LOW | 13 non-indexable pages par canonical/meta/H1 missing | Ignore kar sakte hain — ye 404/embed/internal pages hain |
| **R6** | 🟡 LOW | `/embed/index.html` noindex nahi (directory listing) | Chhota `noindex` add karo |
| **R7** | 🔵 INFO | Backlinks ~0 | White-hat outreach plan |

---

## 11. Action plan

**Aap (owner) ke haath mein (manual):**
1. **GSC → URL Inspection → Request Indexing** — docs/REQUEST-INDEXING-TOP40.md ki 40 URLs, sabse pehle `https://calcpromaster.com/finance/pmi-calculator/`. (Ye baar-baar manual hai, API nahi hai.)
2. **Cloudflare → www → apex 301** redirect rule.
3. **Cloudflare → Bulk Redirects** for pages.dev → custom domain.
4. **Backlink outreach** — genuine mentions maango (koi paid/PBN nahi).

**Automated (pehle se set hai):**
- Weekly SEO refresh — har Monday 08:15 UTC crawl GH Actions se.
- Sitemap weekly resubmit + crawl-link gate + title-length gate build mein.
- Crawl-boost: har NOT-INDEXED page ko INDEXED page se link milta hai (647 links).

---

## 12. Honest expectation

- Indexation mein 2–8 hafte lagte hain jab domain naya ho — ye normal hai, koi trick nahi.
- Sabse pehla real win = ~50 pages ko position 8–20 se top 5 mein laana (jaise `fha-loan`, `apy-calculator`, `child-height`, `presentation-time`) — yahi impressions ko clicks mein badlega.
- CTR 0.1% isliye hai kyunki page 30–70 pe hain; rank better hote hi CTR khud badhega.
- Backlinks ke bina ceiling low rahegi — off-page pe deyar diya nahi, time do.

---

## Appendix — dobara chalane ke commands

```bash
node scripts/gsc-queries.cjs --days 28 --rows 100      # totals + top queries
node scripts/gsc-export-pages.cjs --days 28            # per-page impressions
node scripts/gsc-batch-inspect.cjs --limit 30          # index status + sitemap resubmit
node scripts/audit-crawl-links.cjs                     # crawl gate
node scripts/link-graph-audit.cjs                      # orphan / weak pages
node scripts/check-host-redirects.cjs                  # host guard (apex 200, www/pages.dev 301)
npm run seo:weekly                                     # full weekly refresh
```
