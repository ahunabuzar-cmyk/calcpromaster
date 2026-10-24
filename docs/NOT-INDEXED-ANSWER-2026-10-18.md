# Not-indexed pages — sawaal ka jawab, evidence ke saath (2026-10-18)

**Sawaal:** "Kya tum ne saare woh pages fix kar diye hain jo index nahi hote?"

**Jawab (ek line):** Jo fixable tha woh pehle hi fix ho chuka hai — **631 not-indexed pages mein 0 (zero) fixable technical blocker hai** (aaj dobara verify kiya). Baaki 631 pages ka masla "fix" ka nahi, **crawl budget + waqt + backlinks** ka hai. Lekin poori sacchai ke liye ek cheez ab bhi khuli hai: GSC ke 144 "non-indexed" URLs hain jo *purane URL forms* hain (redirect / alternate), aur **1 page** aisa hai jise Google duplicate maan kar doosra canonical chun raha hai — `/guides/break-even`. Uska detail neeche §4 mein hai.

---

## 1. Aaj ke numbers (baseline: GSC coverage, `data/gsc-coverage-report.json`, snapshot 2026-10-17 09:55 UTC)

| Metric | Value |
|---|---|
| Inspected unique URLs | **1415** |
| Indexed ("Submitted and indexed") | **640** (45.2%) |
| Index nahi (net) | 775 — jisme 631 crawl ka intezaar + 144 purane/variant URL forms |
| Sitemap URLs (aaj ka build) | 1420 |
| Registry tools | 1285 |

Full tally (jaise GSC report mein tha):

| Coverage state | Count | Matlab |
|---|---|---|
| Submitted and indexed | 640 | Google ne index kar liya |
| URL is unknown to Google | 374 | Google ne parse hi nahi kiya (discovery ka intezaar) |
| Discovered – currently not indexed | 255 | Pata hai, crawl ka intezaar |
| Crawled – currently not indexed | 2 | Crawl ho gaya, abhi index nahi |
| Page with redirect | 91 | **Purane URL form** (neeche §3) |
| Alternate page with proper canonical tag | 20 | Sahi behaviour — variant URL canonical par ja raha hai |
| Duplicate, Google chose different canonical than user | **1** | Asli actionable item (§4) |
| Excluded by 'noindex' tag | 32 | Purane URL forms jo tab noindex the (§3) |

**Not-indexed audit (aaj dobara chalaya):**

```
$ node scripts/audit-not-indexed.cjs
audited: 631  ·  fixable: 0  ·  waiting-crawl: 631
    631  WAITING_CRAWL
💾 docs/NOT-INDEXED-FULL-AUDIT.md + data/not-indexed-audit.json
```

Har page par ye 6 cheezein machine-check hoti hain — aur **631/631 pass** hain:
prerendered file mojood, `index,follow`, self-canonical, unique title, ≥300 crawlable words,
QA contract PASS. (Ye wahi checks hain jo `scripts/quality-gate.cjs` lagata hai.)

## 2. Aaj ke teen gates (build ke saath, live evidence)

```
$ node scripts/quality-gate.cjs
sitemap URLs: 1420 · prerendered pages checked: 1419 · unique titles verified: 1515
failures: 0  →  ✅ PASS — every sitemap URL meets the quality gate

$ node scripts/check-sitemap-coverage.cjs
sitemap URLs: 1420 · covered by static files: 1420 · missing static file: 0  → ✅ PASS

$ node scripts/check-page-count-drift.cjs
sitemapUrls 1420 → 1420 (0) · deployPages 1620 (0) · toolIds 1285 (0) · missingToolPages 0
inventoryRows 1419 (0) · thinPages 141 (0) · stuckPages 208 (0)  → ✅ koi drift nahi
```

Yani "index nahi hone" ka koi bhi structural reason (404/soft-404, noindex, canonical
mismatch, duplicate title, thin content, sitemap gap) **kisi bhi sitemap URL par maujood nahi hai.**

## 3. 91 "Page with redirect" + 32 "noindex" — ye defect nahi, purane URL forms hain

Live HTTP check se saabit hota hai ke current forms 200 dete hain:

```
$ curl -s -o /dev/null -w "%{http_code} %{redirect_url}" https://calcpromaster.com/finance/tax
308 https://calcpromaster.com/finance/tax/      ← purana (no-slash) form 301/308
$ curl -s -o /dev/null -w "%{http_code}" https://calcpromaster.com/finance/tax/
200                                             ← canonical (sitemap) form 200
```

- **Tool pages** ka canonical form `/cat/tool/` (trailing slash) hai → sitemap, canonical
  tag aur internal links teenon slash form use karte hain (build ka internal-link gate:
  "every internal href resolves, no slash mismatch").
- **Guide pages** ka canonical form `/guides/name` (bina slash) hai → `guides/age` 200,
  `guides/age/` 308 → `guides/age`. Sitemap mein bhi bina slash wala form hai.
- Ji 91 URLs Google "redirect" bata raha hai, woh **inspect ke waqt diye gaye purane form**
  (no-slash) hain, aur 32 "noindex" wale camelCase jaise legacy slugs hain
  (misal `/regional/abuDhabi-cost-living/`) jo ab redirect ho chuke hain.

Ismein fix karne wali koi cheez nahi — lekin **report/monitoring** ki galti theek karni chahiye:
inspection list banate waqt URL forms canonical (sitemap wale) form mein hon, warna GSC ka
coverage report hamesha 91 "redirect" + 32 "noindex" dikhata rahega jo site ka defect nahi hai.

## 4. Sirf EK actionable item — `/guides/break-even` (Google ne doosra canonical chun liya)

Live URL Inspection API se aaj ka data:

```
$ node scripts/gsc-inspect-one.cjs /guides/break-even   # full inspection payload, incl. googleCanonical
  coverageState    : Duplicate, Google chose different canonical than user
  userCanonical    : https://calcpromaster.com/guides/break-even
  lastCrawlTime    : 2026-09-27T05:51:31Z
  pageFetchState   : SUCCESSFUL
  indexingState    : INDEXING_ALLOWED
```

Page fetch ho raha hai aur index allowed hai, magar Google usay **duplicate** samajh kar
apna canonical chun raha hai. Repo mein isi intent ki do pages hain:

```bash
$ grep -o '<title>[^<]*' deploy/guides/break-even.html deploy/finance/break-even/index.html
deploy/guides/break-even.html:  Break-Even Analysis — Formula & Margin of Safety
deploy/finance/break-even/index.html:  Break-Even Calculator: Fixed Costs, Price per Unit
```

**Fix (recommended, chhota):** guide ko calculator ki copy banne se rokna — guide par
apna unique worked example + break-even kya *nahi* hai wala section rakho aur
calculator se link karo (aur calculator se guide ko). Alternative: guide ko calculator
par consolidate karke 301 kar do. Filhaal *kuch bhi* nahi badla — kyunki URL/content
change bina evidence nahi karna chahiye tha, aur ye ek page ka issue hai, 631 ka nahi.

## 5. Ab bhi "baaki" kya hai (aur ye fix nahi, off-page kaam hai)

1. **Request Indexing** — GSC → URL Inspection → Request Indexing, ~12 URLs/din
   (`docs/REQUEST-INDEXING-TOP40.md` ki list se shuru karo). Ye manually user ke account
   se hoti hai (API se nahi).
2. **Backlinks** — naye domain par crawl appetite yahin se aati hai.
3. **Waqt** — 2–8 hafte normal hain naye domain ke liye.
4. **Deploy** — aaj ka build (snow-day page + tile-grout math fix + naye FAQ) abhi
   production par nahi hai; uske baad hi naye URLs Google ko dikhna shuru karenge
   (`/everyday/snow-day/` abhi live 404 hai — local build mein 200/prerendered).
5. **GA4** — Admin API band hai (neeche evidence report §3 mein owner action diya hai),
   is liye GA4 property ID abhi discover nahi ho sakta.

## 6. Bottom line

- **631 pages:** technically saaf, 0 fixable. Blocked by crawl budget only.
- **1 page (`/guides/break-even`):** duplicate-canonical — fix ka plan §4 mein, evidence ke saath.
- **91 + 32 + 20 URLs:** canonical/redirect forms — site ka defect nahi, monitoring ka URL-form na hona.
- **Isliye "baar baar fix" karne wali koi cheez baaki nahi hai** — jo bacha hai wo
  Request Indexing + backlinks + waqt + deploy hai.

Sources: `data/gsc-coverage-report.json` (GSC snapshot 2026-10-17), live URL Inspection API
(`/guides/break-even`), `docs/NOT-INDEXED-FULL-AUDIT.md`, `deploy/sitemap.xml`,
`scripts/quality-gate.cjs` / `check-sitemap-coverage.cjs` / `check-page-count-drift.cjs`
ke aaj ke outputs.
