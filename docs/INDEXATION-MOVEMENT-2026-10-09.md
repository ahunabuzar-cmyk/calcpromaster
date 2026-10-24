# CalcProMaster — Redirect Regression Check + Indexation Movement

**Date:** 9 October 2026
**Site:** https://calcpromaster.com/ (Cloudflare Pages)
**Related:** docs/FULL-SEO-CHECK-2026-10-08.md · docs/HOSTING-MIGRATION-CLOUDFLARE.md

---

## 0. Sabse pehle aapka sawaal: kaunsi GSC property check ho rahi hai?

**Aapka shak sahi tha — lekin ab theek ho chuka hai. Confirm karta hoon:**

| Property | Kya ye script query kar rahi hai? | Proof (28-din, is run mein) |
|---|---|---|
| `https://calcpromaster.netlify.app/` (purani/paused) | ❌ **Nahi** (sirf historical data pada hai) | 12 clicks · 8,313 impressions |
| `https://calcpromaster.com/` (asli) | ✅ **Haan — yahi query hoti hai** | **17 clicks · 13,445 impressions** |

**Kaise confirm kiya (hard evidence, guess nahi):**

1. Refresh token **dono** properties tak pahunch sakta hai, isliye dono ko alag-alag query kiya — `.com` wale se live numbers aaye (17/13,445), `.netlify.app` wale se purane numbers (12/8,313). Yani jo script asli data dikha rahi hai woh **`.com`** se aa raha hai.
2. `js/site-config.js` mein `domain: 'calcpromaster.com'` hai — `gsc-queries.cjs` aur `gsc-export-pages.cjs` apna `SITE_URL` **isi se auto-derive** karte hain.
3. `gsc-batch-inspect.cjs` pehle **`.netlify.app` pe hardcoded** tha — yahi asli bug tha — ab wo bhi site-config se derive karta hai (env `GSC_SITE_URL` se override ho sakta hai).
4. Coverage snapshot file (`data/gsc-coverage-report.json`) mein `site: "https://calcpromaster.com"` likha hai.
5. Inspection + sitemap PUT dono **registered property form** `https://calcpromaster.com/` (trailing slash ke saath) use karte hain.

**Natija:** aaj se jo bhi GSC data aata hai (impressions, clicks, index status, sitemap resubmit) wo **asli calcpromaster.com** ki property se hai, netlify se nahi. Netlify ki property ab sirf history ke liye padi hai.

---

## 1. Redirect regression check ✅ (naya automated guard)

Host consolidation (www + pages.dev → apex) ab ek **script + test + weekly step** se protect ho gayi hai, taake koi bhi future deploy ise dobara na today.

**Naya tool:** `scripts/check-host-redirects.cjs` (`npm run seo:hosts`)
- Live edge se 6 probes karta hai; koi bhi regression ho to **exit 1**.
- Apex = `js/site-config.js` se, project = `wrangler.toml` se derive hota hai.

**Aaj ka live run — ✅ PASS (6/6):**

| Probe | Expected | Actual |
|---|---|---|
| apex home | 200 | ✅ 200 |
| apex deep link (`/health/pf-ratio/`) | 200 | ✅ 200 |
| www root | 301 → apex | ✅ 301 → `https://calcpromaster.com/` |
| www deep link | 301 → apex + path | ✅ 301 → `.../health/pf-ratio/` |
| pages.dev root | 301 → apex | ✅ 301 → `https://calcpromaster.com/` |
| pages.dev deep link | 301 → apex + path | ✅ 301 → `.../health/pf-ratio/` |

**Test:** `tests/unit/check-host-redirects.test.js` (7 tests) + `tests/unit/redirect-middleware.test.js` (5 tests) — **sab pass**.

**Weekly refresh mein wire:** `scripts/weekly-seo-refresh.cjs` mein **step 5** add hua hai jo ye check chalata hai (non-fatal — fail hone par warn karta hai, baaki refresh chalta rehta hai). Skip karne ke liye `--skip-hosts`.

---

## 2. Indexation movement (2 Oct snapshot → 9 Oct live)

### 2a. GSC 28-din totals — trend up hai

| Window | Clicks | Impressions | CTR | Avg position |
|---|---|---|---|---|
| 7 Sep → 5 Oct (purana doc) | 16 | 12,473 | 0.1% | 37.5 |
| **Latest 28-din (aaj)** | **17** | **13,445** | 0.1% | **36.7** |

→ **+1 click, +972 impressions, position 37.5 → 36.7** (behtar). Trend positive hai, bas chhota hai (site naya + backlinks ~0).

Per-page impressions ab **186 pages** (pehle 191) mil rahi hain.

### 2b. Same-URL URL-Inspection movement (clean comparison)

Teen batches, **wahi 20 priority URLs** (homepage, about/contact/privacy, saare `/hub/*`), taake apples-to-apples ho:

| Tally | 5 Oct | 8 Oct | **9 Oct** |
|---|---|---|---|
| Submitted and indexed | 13 | 14 | **14** |
| Discovered – currently not indexed | 0 | 1 | **4** |
| URL is unknown to Google | 7 | 5 | **2** |

**Jo URLs aage badhe (5), state change:**

| URL | 5 Oct | 9 Oct |
|---|---|---|
| `/hub/education` | unknown | **Submitted and indexed** ⬆ |
| `/contact` | unknown | Discovered – currently not indexed ⬆ |
| `/hub/conversion` | unknown | Discovered – currently not indexed ⬆ |
| `/hub/everyday` | unknown | Discovered – currently not indexed ⬆ |
| `/privacy` | unknown | Discovered – currently not indexed ⬆ |

**Padhne ka tareeqa:** "**URL is unknown to Google**" (Google ko pata hi nahi) **7 → 2** ho gaya — ye asli progress hai. Baaki 4 ab "**Discovered – currently not indexed**" hain, yani Google ab unhe **jaanta hai** aur crawl queue mein daal chuka hai (agli step = actually crawl + index). Koi URL **peeche nahi** gaya.

### 2c. Site-wide coverage snapshot (abhi bhi 2 Oct ka hai)

`data/gsc-coverage-report.json` (2 Oct, 1,167 URLs, **site = calcpromaster.com**) — ye wo baseline hai jiske against movement measure karni hai:

| Verdict | Count |
|---|---|
| INDEXED | 375 |
| UNKNOWN | 445 |
| DISCOVERED | 339 |
| CANONICAL (duplicate) | 3 |
| REDIRECT | 2 |
| OTHER | 3 |

**Note:** GSC ki **Coverage report** ka poora export sirf GSC UI se milta hai (public API nahi hai). Isliye site-wide numbers tab hi update honge jab aap GSC se **naya Coverage export** dein. Beech ka movement hum **URL Inspection API** (upar 2b) se track kar rahe hain, jo har run mein fresh hota hai.

**Sitemap resubmit:** aaj **HTTP 204 OK** (Google ne re-fetch kiya).

---

## 3. Aage ka plan (kuch automated, kuch aapke haath)

**Automated (live):**
- Weekly host-redirect guard (step 5 of `seo:weekly`).
- Weekly sitemap resubmit + URL inspection batch.
- Crawl-link gate: 784/784 not-indexed targets ko INDEXED page se inlink.

**Aapke haath (manual, white-hat):**
1. GSC → URL Inspection → **Request Indexing** — `docs/REQUEST-INDEXING-TOP40.md` ki 40 URLs (pehla: `/finance/pmi-calculator/`).
2. GSC → **Coverage** → naya export dein taake site-wide movement (375 se aage) measure ho sake.
3. Backlink outreach — genuine mentions only (koi paid/PBN nahi).

---

## Appendix — dobara chalane ke commands

```bash
node scripts/check-host-redirects.cjs            # host-consolidation guard (exit 1 on regression)
npm run seo:hosts                                # same, npm alias
node scripts/gsc-queries.cjs --days 28           # totals + top queries/pages
node scripts/gsc-export-pages.cjs --days 28      # per-page impressions
node scripts/gsc-batch-inspect.cjs --limit 20    # index status + sitemap resubmit
npm run seo:weekly                               # full weekly refresh (incl. host check)
```
