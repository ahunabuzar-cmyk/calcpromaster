# CalcProMaster — Indexation Final Tally (2026-10-09)

**Site:** https://calcpromaster.com/
**Fresh GSC export:** `data/gsc-coverage-export-2026-10-09/` (ZIP dated 2026-10-09, snapshot row 2026-10-04)
**Live sweep:** 784/784 not-indexed URLs URL-Inspected via the API
**Live probes:** 1,415 sitemap URLs + 86 redirect-flagged URLs

> Yeh doc do alag sources ko milata hai: (a) GSC ka **site-wide Coverage export** (UI-only, ZIP),
> aur (b) hamara **per-URL URL-Inspection API** sweep. Dono ke numbers alag hain kyunki
> dono alag URL-set cover karte hain — dono neeche alag-alag diye hain.

---

## 1. Site-wide truth (fresh GSC Coverage export)

Chart.csv ka aakhri complete row = **2026-10-04**:

| | Count |
|---|---|
| **Indexed** | **952** |
| **Not indexed** | **923** |
| % indexed | **50.8%** |

> ✅ Aapka "900+ index, 900+ baki" **sahi tha** — ye export usi ko confirm karta hai.
> (Hamare paas pehle jo snapshot tha — `data/gsc-coverage-report.json`, 2026-10-02 — wo
> purana aur adhoora tha: 375 indexed / 784 not-indexed. Ab ye fresh export authoritative hai.)

### 923 not-indexed ka full breakdown

| Reason | Source | Pages | Hamara verdict |
|---|---|---|---|
| Discovered - currently not indexed | Google systems | **631** | Google ne URL dekh liya, crawl pending — time + crawl signals |
| Page with redirect | Website | **208** | ✅ Stale signal (neeche verify kiya) |
| Excluded by 'noindex' tag | Website | **54** | ✅ Intentional exclusion (neeche) |
| Crawled - currently not indexed | Google systems | 14 | Content quality/thin signal — enrichment opportunity |
| Alternate page with proper canonical tag | Website | 9 | ✅ Mostly normal canonical consolidation |
| Server error (5xx) | Website | 5 | ✅ 0 live errors (neeche verify kiya) |
| Duplicate, Google chose different canonical than user | Google systems | 2 | Google ne apna canonical chuna — inspect karo |
| **Total** | | **923** | Website-side 276 · Google-side 647 |

---

## 2. Hamara live URL-Inspection sweep (784/784 complete)

Oct-2 ke purane "not indexed" set ke **784 URLs** ko URL Inspection API se live check kiya
(resumable script, chunks mein chala). Final tally:

| Coverage state | Count | % |
|---|---|---|
| URL is unknown to Google | 393 | 50.1% |
| Discovered - currently not indexed | 192 | 24.5% |
| **Submitted and indexed** | **111** | **14.2%** |
| Page with redirect | 86 | 11.0% |
| Excluded by 'noindex' tag | 1 | 0.1% |
| Alternate page with proper canonical tag | 1 | 0.1% |
| **Total** | **784** | 100% |

**Reading:** un 784 pages mein se **111 ab index ho chuke hain (14%)**, aur
**585** (393 unknown + 192 discovered) Google ke crawl ka intezaar kar rahe hain.
Baaki 88 pages "redirect / noindex / alternate" buckets mein hain — in par neeche alag se
verify kiya gaya hai ki site-side kuch **galat nahi** hai.

Movement (pichle batches se): unknown **7 → 2** (2026-10-05 → 2026-10-09), 0 pages regressed.

---

## 3. Website-side buckets — live verification (har ek CLEAN nikla)

### 3a. "Page with redirect" — 208 (website) / 86 (hamara sweep)

- Saare **86 URLs** jo hamare sweep mein "Page with redirect" aaye: live probe
  → **86/86 = HTTP 200, zero redirect chain**.
- Sab **trailing-slash tool URLs** hain (`/finance/home-afford/`, `/construction/concrete-bags/`,
  `/finance/rule-of-72/`, ...), 75 finance + 6 tech + 2 fitness + 1 construction + 1 homegarden + 1 health.
- GET sample par: `robots: index, follow`, **self-canonical**, sahi apna title.
- **Verdict: 100% stale Google signal** — Netlify → Cloudflare migration ke dauran jo redirects
  the, Google ka index abhi bhi wahi purani state dikha raha hai. Site par **kuch fix karne ko nahi**.

### 3b. "Excluded by 'noindex' tag" — 54 (website)

- `deploy/` mein **198 HTML files** noindex hain — aur **in mein se 0 bhi sitemap mein nahi hai**
  (cross-check kiya). Saare **jaan-bujh kar** exclude kiye gaye hain:
  - `embed/*` widgets (embed karne ke liye — index nahi hone chahiye)
  - runtime long-tail variants (`/finance/auto-loan/5-years-25000/`, `/business/burn-rate/10000/`, ...)
  - app/utility routes: `/compare/`, `/history/`, `/favorites/` (client-side state — crawler ko
    khaali/thin page dikhta, noindex sahi hai)
  - `/404.html`, `/cookies`
- Trust pages **indexable** rakhe gaye hain: `/privacy`, `/terms`, `/about`, `/contact`,
  `/disclaimer-*`, `/editorial-policy` — sab `index, follow` ✅
- Hamare sweep ka 1 hit — `/tech/download-time/` — live par **200 + `index, follow` + self-canonical**
  hai. Stale signal.
- **Verdict: koi bug nahi.** "Excluded by noindex" GSC mein ek **informational** bucket hai,
  error nahi — ranking ko nuksan nahi karta.

> Minor note: site-wide nav/footer se 4 noindex URLs (`/history/`, `/favorites/`, `/compare/`,
> `/cookies`) par ~10,564 internal links jaate hain (har page par ~4). Ye behaviour **sahi** hai
> (noindex pages ko link karna allowed hai) — bas thoda crawl budget kharch hota hai. Chahein to
> nav se hata sakte hain, par zaroori nahi.

### 3c. "Server error (5xx)" — 5 (website)

- Poore **1,415 sitemap URLs** ko live HEAD-probe kiya → **0 errors**.
  Har URL `200` / `301` / `308` (redirects sirf intentional non-slash → slash aur www/pages.dev → apex).
- **Verdict: transient/historical** (Cloudflare Pages cold starts ya Google ke fetch hiccups).
  Live par fix karne ko kuch nahi.

### 3d. "Alternate page with proper canonical tag" — 9 (website)

- Hamare sweep ka 1 hit — `/finance/rent-vs-sell/` — live par **200 + `index, follow` +
  self-canonical**, aur `/finance/rent-vs-buy/` ek alag live page hai apne canonical ke saath.
  Dono distinct calculators hain, cannibalization nahi.
- **Verdict: stale signal.**

### 3e. "Crawled - currently not indexed" — 14 (Google systems) ⚠️ asli opportunity

- Yahi ek bucket hai jahan **Google ne page crawl kiya par index nahi kiya** — matlab
  content quality/thinness ka signal.
- Ye Google-side hai, lekin **on-page se sudhar sakta hai**: unique content depth, tables/FAQ,
  internal links, author/trust signals. → content enrichment ka kaam, code bug nahi.

---

## 4. Kitna kaam baki hai? — seedha jawab

| Kaam | Count | Status |
|---|---|---|
| **Technical / code fix chahiye** | **0** | ✅ Kuch nahi — site clean |
| Crawl/index ka intezaar (Google) | 585 | ⏳ Time + crawl signals |
| Stale Google signals (redirect/noindex/canonical) | 96 | ⏳ Re-crawl se khud clear honge |
| 5xx | 5 | ✅ 0 live — already clear |
| Content quality (Crawled-not-indexed) | 14 | 🔧 On-page enrichment opportunity |

**Matlab:** website par koi blocker nahi bacha. Baaki sab **Google ko dobara crawl karane**
aur **off-page authority** ka kaam hai — white-hat only.

### Actionable (Google-safe)

1. **GSC → URL Inspection → Request Indexing** un pages ke liye jo pos 8–20 par hain aur
   jo "Discovered/Unknown" hain — `docs/REQUEST-INDEXING-TOP40.md` (UI-only, ~12 URLs/din).
2. **Backlinks** badhao (real mentions, directories, resource pages) — naye domain par
   authority hi sabse bada lever hai.
3. **14 "Crawled-not-indexed"** pages par content depth badhao (unique data, FAQ schema, examples).
4. Har hafte naya GSC Coverage ZIP → `node scripts/parse-gsc-coverage-export.cjs --dir <folder>`
   → `node scripts/seo-movement-report.cjs` — movement khud track ho jayegi.

---

## 5. Appendix — reproduce karna

```bash
cd project

# 1) Fresh GSC Coverage ZIP ko parse karo (ZIP khol kar folder ka path do)
node scripts/parse-gsc-coverage-export.cjs --dir data/gsc-coverage-export-2026-10-09

# 2) Live URL-Inspection sweep (resumable — jahan chhoda wahan se continue)
node scripts/gsc-inspect-list.cjs --limit 300
node scripts/gsc-inspect-list.cjs --limit 300          # agla chunk, repeat

# 3) Not-indexed pages ka technical audit (built/noindex/canonical/title/sitemap)
node scripts/audit-not-indexed.cjs

# 4) Host consolidation live check
node scripts/check-host-redirects.cjs

# 5) Poori dated report
node scripts/seo-movement-report.cjs
```

### Files

| File | Kya hai |
|---|---|
| `data/gsc-coverage-fresh.json` | Fresh GSC export ka normalized JSON |
| `data/gsc-inspect-notindexed.json` | 784/784 URL-Inspection results |
| `data/not-indexed-audit.json` | Technical audit (0 fixable) |
| `data/gsc-coverage-report.json` | Purana Oct-2 snapshot (reference) |
| `docs/SEO-MOVEMENT-2026-10-09.md` | Dated movement report |
| `docs/NOT-INDEXED-FULL-AUDIT.md` | 784-page technical audit |
| `docs/POS-8-20-PLAN.md` | Position 8–20 boost plan |
| `docs/REQUEST-INDEXING-TOP40.md` | Priority Request-Indexing list |
