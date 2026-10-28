# Non-indexed pages — full data (769 URLs) + jo aaj fix hua (2026-10-28)

> Sab kuch **aaj (2026-10-28)** ke runs se: GSC URL Inspection API (1,326 URLs),
> live HTTP probe (1,326 URLs), live `curl` checks (38 URLs), Search Analytics API
> (query + daily), sitemaps API, aur build ke andar content duplication ka
> measurement. Koi number purani report se copy nahi kiya gaya.

Files is report ke saath:

| File | Kya hai |
|---|---|
| `data/gsc-inspect-all-progress.json` | 1,326 URLs ka raw URL Inspection result (aaj ka) |
| `data/nonindexed-live-probe.json` | un 1,326 URLs ka live HTTP probe (status, robots, canonical, words) |
| `data/nonindexed-full.json` | dono ka join + per-URL state, impressions, live state |
| `data/nonindexed-actions-2026-10-28.csv` | **769 non-indexed URLs, ek-ek line par, action ke saath** |
| `data/uniqueness-measure.json` | 1,421 indexable pages ka 7-word-shingle uniqueness (per page) |
| `data/request-indexing-queue-2026-10-28.txt` | 769 URLs, paste-ready queue — pehle woh jin ke pichhle 120 din mein impressions the |
| `data/gsc-truth-check.json` | sitemaps API status (lastDownloaded, errors) |

---

## 1. Aaj ka coverage data (pura, per URL)

| Metric | Value |
|---|---|
| Sitemap URLs | 1,420 |
| Aaj inspect hue | **1,326** |
| Quota ki wajah se baaki | 94 (URL Inspection API 429 — "Quota exceeded", aaj khatam ho gaya) |
| **Indexed** ("Submitted and indexed") | **557** |
| **Non-indexed** | **769** |

Non-indexed 769 ka breakdown (GSC ne jo record kiya, wo *snapshot* hai — aaj ka nahi):

| GSC coverage state | URLs | Matlab |
|---|---|---|
| URL is unknown to Google | **371** | Google ke paas URL ka record hi nahi |
| Discovered – currently not indexed | **213** | Pata hai, crawl ka intezaar |
| Page with redirect | **107** | Google ne redirect dekha tha |
| Excluded by 'noindex' tag | **30** | Google ne noindex dekha tha |
| Crawled – currently not indexed | **29** | Fetch hua, index nahi kiya |
| Alternate page with proper canonical tag | 19 | Google ne doosra canonical chuna |

Category-wise (total / indexed / non-indexed) — `data/nonindexed-full.json` ke `byCat` se:
finance 218/54/164 · math 121/34/87 · regional 82/43/39 · science 82/40/42 · guides 73/50/23 ·
health 68/42/26 · engineering 67/9/58 · construction 57/24/33 · homegarden 52/32/20 ·
lifestyle 49/31/18 · auto 47/29/18 · career 46/7/39 · business 45/7/38 · education 42/25/17 ·
fitness 42/26/16 · family 40/20/20 · food 37/8/29 · conversion 36/5/31 · tech 12/9/3 ·
hub 19/13/6 · flat pages 34/14/20 · blog 6/5/1.

---

## 2. Live truth: 769 mein se 769 technically theek hain

Aaj ke live probe ne har non-indexed URL par ye check kiya — status, meta robots,
`X-Robots-Tag`, canonical, title, H1, visible words:

```
live-verified indexable (200 + index,follow + self-canonical): 769/769
```

Iske upar maine 38 URLs **alag `curl` se** dobara check kiye (sample, kyunki probe bhi
wahi machine hai):

| URL | GSC state | Aaj ka live HTTP |
|---|---|---|
| `/auto/mileage-calculator/` | Page with redirect | **200**, `index, follow`, canonical = khud |
| `/regional/dubai-salary/` | Page with redirect | **200**, `index, follow`, canonical = khud |
| `/science/moment-of-inertia/` | Page with redirect | **200**, `index, follow`, canonical = khud |
| `/business/tool-depreciation/` | Excluded by noindex | **200**, no meta noindex, **no `X-Robots-Tag`** |
| `/business/sponsorship-rate/` | Alternate canonical | **200**, canonical = khud |
| `/finance/` | Alternate canonical | **200**, canonical = khud |
| `/about`, `/guides/emi` | URL unknown to Google | **200**, `index, follow`, canonical = khud |

**Iska matlab saaf hai:** 107 "redirect", 30 "noindex" aur 19 "alternate canonical"
**aaj koi defect nahi hain** — ye Google ke purane crawl ke record hain (22–24 Oct wale
deploy se pehle ke). Inhe "fix" karne ke liye code mein kuch nahi hai; inhe Google ke
dobara crawl karne par hi clear hoga.

Ye wahi baat hai jo pehli report ne kahi thi — lekin usne isi ko "0 fixable, sab theek"
bana diya, jo adhoora tha: **technically theek hona** aur **index mein hona** do alag
cheezein hain. Neeche wahi doosri cheez measure ki gayi hai.

---

## 3. Asli masla: 2026-10-19 ko site-level visibility khatam hui

Search Analytics API se aaj ka daily data (`scripts/dev-gsc-query-truth.cjs`):

| Date | Impressions | Clicks |
|---|---|---|
| 2026-10-14 | 632 | 1 |
| 2026-10-15 | 578 | 0 |
| 2026-10-16 | 681 | 0 |
| 2026-10-17 | 419 | 0 |
| 2026-10-18 | 345 | 1 |
| **2026-10-19** | **2** | 0 |
| 2026-10-20 | 4 | 0 |
| 2026-10-21 | 1 | 0 |
| 2026-10-22 | 7 | 0 |
| 2026-10-23 | 3 | 0 |
| 2026-10-24 | 1 | 0 |
| 2026-10-25 | 2 | 0 |
| 2026-10-26 | 2 | 0 |

Aur query dimension (jo cheez Google ab bhi dikha raha hai):

```
before cliff 2026-10-10..10-16 : hundreds of long-tail queries (awg to mm, 28 lakh home
                                 loan emi, 18 awg in mm …), positions 40–120
after  cliff 2026-10-20..10-27 : exactly ONE query — "site:calcpromaster.com", 8 impressions
```

Ye **crawl-budget ka slow effect nahi** hai. Ye ek raat ka site-level event hai:
Google ne demand queries par site dikhana band kar diya aur sirf `site:` operator
par bacha. 900+ → 700+ indexed ka jo aap dekh rahe hain, wahi is event ka doosra
rukh hai.

### Jo cheezein is event ki wajah **nahi** hain (aaj check ki gayi)

| Check | Result |
|---|---|
| Koi URL 404/5xx? | Nahi — 769/769 non-indexed URLs bhi 200 |
| noindex / X-Robots-Tag? | Nahi — 38/38 checked clean |
| Canonical mismatch? | Nahi — sab self-canonical |
| robots.txt block? | Nahi — Googlebot `Allow: /` |
| Duplicate host (www / netlify / pages.dev)? | Nahi — teeno 301 → `https://calcpromaster.com/` |
| Sitemap fetch fail? | Nahi — `lastDownloaded 2026-10-26`, **errors 0**, warnings 0, 1,420 submitted |

### Jo cheez **fixable** thi aur aaj fix hui: sitemap ka jhoota `lastmod`

Measured: live `sitemap.xml` mein **1,345 URLs ka `lastmod` = 2026-09-28** tha, jabke
`deploy/` ke **1,619 pages 2026-10-24 ke baad** build hue the (content 27 Oct ko rewrite
hua). Matlab Google ko bataya ja raha tha "kuch nahi badla" — jabke poora content badal
chuka tha. Google `lastmod` ko recrawl scheduling ke liye use karta hai; har URL par ek
mahine purani date = recrawl queue mein peeche.

**Fix (aaj apply + verify):**

```
$ npm run sitemap
sitemap.xml regenerated: 1420 URLs
  lastmod: 1420 URL(s) changed, 0 kept their previous date      ← pehla run: sab stale the

$ npm run sitemap                                                ← dobara chalaya (integrity test)
  lastmod: 0 URL(s) changed, 1420 kept their previous date       ← stable, ghadi nahi
```

Sab 1,420 URLs par ab **2026-10-28** hai, aur dobara chalane par kuch nahi badla — yani
date content-hash se aa rahi hai, "aaj ki date" se nahi (warna har build par badalti aur
Google ignore kar deta). `deploy/sitemap.xml` bhi sync kiya.

Gates (dono pass):

```
$ node scripts/check-sitemap-coverage.cjs
covered by static files: 1420 · missing static file: 0 → PASS
$ node scripts/check-page-count-drift.cjs
✅ page counts to baseline ke mutabiq hain
$ npx vitest run tests/unit
Test Files 104 passed · Tests 2899 passed
```

---

## 4. Content duplication — measured, aur ye index hone se correlated hai

Har built page ka `<main>` text le kar 7-word shingles nikale, phir dekha kaunsa
shingle sirf usi page par hai (`data/uniqueness-measure.json`):

| Metric (1,421 indexable pages) | Value |
|---|---|
| Median visible `<main>` words | 1,113 |
| Median word jo **boilerplate** hai (doosre pages par bhi) | **527 (≈47%)** |
| Median unique-shingle ratio (7-word) | 52.3% |
| Median unique-shingle ratio (10-word) | **64.8%** |
| Median unique-shingle ratio (15-word) | 78.7% |

Yani long passages duplicate nahi hain — chhote repeated fragments hain (FAQ headings,
trust/methodology lines, disclaimers, nav labels). Wahi wajah hai ke 7-word par 52% aur
15-word par 79% aata hai.

**Aur ye index hone se correlated hai** (aaj ke inspection × uniqueness join se):

Ye correlation 29 "crawled, not indexed" pages par poori tarah lagu nahi hoti: unme se 23 ka
unique text < 60% hai, lekin `/engineering/` (81%), `/science/` (85%), `/guides/water-intake`
(86%), `/guides/calories` (92%) aur `/embed/` (100%) ka unique text zyada hone ke bawajood
Google ne index nahi kiya. Yani duplication ek factor hai, **woh akela factor nahi**.

| Page ka unique text | Indexed / total | Index rate |
|---|---|---|
| < 45% | 28 / 91 | **31%** |
| 45–55% | 325 / 843 | **39%** |
| 55–65% | 109 / 234 | **47%** |
| 65%+ | 95 / 158 | **60%** |

Ye gradient hai, guarantee nahi. Lekin jab 769 pages technically perfect hain aur unmein
se sirf 557 index hain, to farq page ki apni value ka hi hai — aur unique text uska ek
measurable hissa hai.

Side note (aaj verify kiya): 183 modifier-variant pages (`/finance/auto-loan/5-years-25000/`
jahaz) **noindex + canonical→parent** hain — sahi policy hai, unhe Google index nahi karega,
aur woh 1620 built pages mein se 199 noindex hain (183 variants + 16 utility shells).
Inhe is report ke 769 mein nahi gina gaya.

---

## 5. Har non-indexed URL ka action (769 rows)

Poori list: [`data/nonindexed-actions-2026-10-28.csv`](../data/nonindexed-actions-2026-10-28.csv)
— columns: `url, category, gsc_state, indexing_state, live_status, live_kind, live_words,
impressions_last_120d, unique_text_pct_proxy, action, why`.

Summary:

| Action | URLs | Kya karna hai |
|---|---|---|
| NO CODE FIX — GSC record stale, re-crawl request | **156** (107 redirect + 30 noindex + 19 alternate) | GSC → URL Inspection → **Request Indexing** (12–15 URLs/din) |
| DISCOVERY — request indexing + internal link | **371** (unknown to Google) | Wahi, plus ensure har URL kisi crawled page se linked ho |
| CRAWL BUDGET — crawl ka intezaar | **213** (discovered) | Request indexing; page ki value barhao |
| PAGE VALUE — Google ne fetch kiya, index nahi kiya | **29** (crawled, not indexed) | Page ko siblings se alag karo; inme se 6 ka unique text 60%+ hai, yani wahan duplication wajah nahi |

**In 769 mein se 100 URLs ne pichhle 120 din mein 2,502 impressions kamaye the** — yani
ye dead pages nahi hain, ye woh pages hain jin ki traffic aap kho chuke hain. Sabse zyada:
`/regional/dubai-salary/` (388), `/lifestyle/renters-insurance/` (203), `/finance/va-loan/` (132),
`/finance/royalty-payment/` (131), `/auto/mileage-calculator/` (103), `/regional/pk-salary/` (96),
`/everyday/gift-wrap/` (95), `/hub/fitness/` (95).

---

## 6. Jo code se fix **nahi** hota (aur isliye jhoot bolna hoga ke "sab fix ho gaya")

| Cheez | Kyun code se nahi | Aap kya karein |
|---|---|---|
| **Manual action hai ya nahi** | Search Console API mein manual-actions endpoint nahi hai (UI-only) | GSC → **Manual actions** → screenshot/status. Yahan "Thin content with little or no added value" ya "Scaled content abuse" likha ho to wahi asli wajah hai |
| **Security issues / hack** | Wahi — UI-only | GSC → **Security issues** |
| **Request Indexing** | API endpoint maujood nahi | GSC → URL Inspection → Request Indexing, roz 12–15 |
| **Crawl budget / re-evaluation** | Google ka decision | Waqt + content quality + backlinks |
| **94 URLs ka inspection** | Aaj ka 2,000/din quota khatam (429) | Kal `node scripts/gsc-inspect-all.cjs` (resume khud kar lega) |

---

## 7. Tajweez — tarteeb ke saath

1. **Aaj:** GSC → Manual actions aur Security issues khol kar dekhein. Ye ek minute ka kaam
   hai aur poori diagnosis ko band kar deta hai. (Agar action hai to "sab technically theek
   hai" ka matlab kuch nahi — Google ne site ko value ke liye rok rakha hai.)
2. **Ho gaya — 2026-10-28:** sitemap fix **production par live hai** (deployment
   `26abd8a4`, branch `main`). Live `https://calcpromaster.com/sitemap.xml` ab **1,420 URLs,
   sab ka `lastmod` 2026-10-28**. Uski tasdeeq §9 mein hai.
3. **Roz:** `data/request-indexing-queue-2026-10-28.txt` se 12–15 URLs par Request Indexing —
   file already usi tarteeb mein hai (pehle woh 100 URLs jo impressions laa rahe the).
4. **Agla hafta:** 29 "crawled, not indexed" pages ko manually behtar karein — inme Google
   ne dekha aur reject kiya; ye sabse saaf signal hai.
5. **Strategic — aapka faisla (2026-10-28): 2–3 hafte observe karein, abhi kuch delete na karein.**
   Iska matlab: page count aaj nahi chhua jayega, aur agla faisla data se hoga. Observation
   ke liye teen numbers har hafte likhein: (a) GSC → Pages → *indexed* count, (b) roz ki
   impressions, (c) *Discovered / Crawled – not indexed* ka count. Agar 2–3 hafte mein
   indexed count na badhe aur impressions 1–7/din par atke rahein, tab page-count decision
   (1,285 → ~300 strong pages) lena hoga. Is period mein jo cheez sab se zyada asar karegi wo
   §7.1 (Manual actions) ka jawab hai — agar wahan action likha hai to observation se pehle
   wahi theek karna hoga.

---

## 8. Is report ki honest limits

- GSC coverage states **snapshots** hain (kuch Sep/Oct ke crawl ke), live HTTP nahi. Isliye
  §2 mein har state ko live fetch se cross-check kiya gaya.
- 94 URLs aaj inspect nahi ho paye (quota). Wo 1,420 mein se baaki hain, 769 mein nahi.
- Site-level event ki **wajah** (manual action vs algorithmic demotion) is data se decide
  nahi ho sakti — sirf UI bata sakti hai. Jo keh sakta hoon: ye crawl/serving/indexability
  ka masla nahi hai, ye visibility ka masla hai.
- Duplication ka metric 7/10/15-word shingles par based hai — Google ka internal
  near-duplicate model isse milta-julta hai lekin wahi nahi. Isliye ise "correlation,
  proven cause nahi" ki tarah padhein.

---

## 9. Deploy receipt — 2026-10-28 (sitemap `lastmod` fix, production)

Sab kuch deploy ke **baad** live URL se dobara check kiya gaya, local build se nahi.

| Cheez | Result |
|---|---|
| Production deployment | `26abd8a4` · branch `main` · Cloudflare Pages project `calcpromaster` |
| Preview deployment (pehla attempt, galat branch) | `fbb20d10` · branch `seo/daily-index-panel` — **publish nahi hua**, sirf preview |
| Live sitemap | `https://calcpromaster.com/sitemap.xml` → **1,420 URLs**, `<lastmod>` sab **2026-10-28** (pehle: 1,345 × `2026-09-28`, 75 × `2026-10-24`) |
| Sitemap resubmit (GSC API) | HTTP **204**, `lastSubmitted 2026-10-28 16:20Z`, `errors: none`, 1,420 URLs |
| Live page spot-check (10 URLs, `.com` se) | 200 · `index, follow` · self-canonical ( `/about.html` → 308, jaan-boojh kar, slash-less URL par) |
| GSC token | ✅ live (`gsc:verify`: token, property, searchAnalytics sab OK) |

**Deploy ke baad bhi visibility waisi hi hai — ye jhooth nahi bolunga.** GSC daily data (3 din settle hone ke baad, 11–25 Oct) ab bhi wahi dikha raha hai:

`15 Oct: 578 → 18 Oct: 345 → 19 Oct: 2 → 20 Oct: 4 → 21 Oct: 1 → 22 Oct: 7 → 23 Oct: 3 → 24 Oct: 1 → 25 Oct: 2`

Sitemap/`lastmod` fix **crawl signal** theek karta hai — wo recovery ka switch nahi hai. Recovery tab shuru hoti hai jab Google dobara crawl kare aur content ko value de. Isliye §7 ke items 1 (Manual actions), 3 (Request Indexing) aur 5 (page-count / unique content) ab bhi baaki hain.

**Doosri baat jo saaf-saaf likhni chahiye:** production deploy current working tree se bana `deploy/` folder tha, isliye 24–27 Oct ke content changes bhi uske saath live gaye (wahi build jispar gates + 2,899 tests pass hain). Sirf sitemap.xml nahi badla.

---

## 10. "900+ se 700+" — kaunse pages nikle (per-URL diff, 2026-10-28)

Aapne poocha: pehle 900+ index tha, ab 700+ — kaunse pages **dobara** non-index hue. Ye sawaal
per-URL history maangta hai, aur GSC API per-URL index history deta hi nahi. Isliye jo do
measurements repo mein maujood thin unka diff liya gaya — dono URL Inspection API se, ek hi
instrument, isliye comparable:

| Kab | Kya | Indexed |
|---|---|---|
| 2026-10-04 | GSC coverage UI export (`data/indexation-history.json`) | **952** |
| 2026-10-17 | URL Inspection, 1,415 URLs (`data/gsc-coverage-report.json`) | **640** |
| 2026-10-28 | URL Inspection, 1,326 URLs (`data/gsc-inspect-all-progress.json`) | **557** |

**952 aur 557 ko seedha minus na karein** — pehla GSC ka apna count hai (usme non-sitemap URLs
bhi hain, aur wo crawl ke hisaab se late update hota hai), doosra API ka per-URL state. Jo
cheez honest hai wo 17 → 28 Oct ka diff hai, kyunki dono ek hi tareeke se nape gaye:

| 17 Oct indexed | 28 Oct still indexed | **Nikle** | Re-measure nahi ho paye | Naye indexed |
|---|---|---|---|---|
| 640 | 541 | **55** | 44 | **16** |

Yani 11 din mein **55 pages index se nikle, 16 naye aaye — net −39**, aur 44 pages aaj ke
1,326-URL run mein quota ki wajah se shaamil nahi the (unka state "unknown" hai, "lost" nahi).

### 55 nikle hue pages kahan gaye

| 28 Oct state | Count | Live check (aaj) |
|---|---|---|
| Page with redirect | 30 | **sab 200**, `index, follow`, self-canonical — Googlebot UA se bhi 200, koi cloaking nahi |
| Crawled – currently not indexed | 24 | 21 × 200 indexable, 3 × 308 (legacy trailing-slash form) |
| Alternate page with proper canonical tag | 1 | `/lifestyle/` — live canonical khud par hai |

Un 55 mein **51 pages ne pichhle 120 din mein impressions diye the (total 1,649)** — yani ye
sirf "kabhi index nahi hue" pages nahi, ye **pehle traffic laa rahe the**. Isi liye inka
reindex-queue alag banaya: [reindex-queue-2026-10-28.txt](data/reindex-queue-2026-10-28.txt)
(52 URLs, impressions ke hisaab se order).

### 24 "crawled, not indexed" — Google ne dekhe aur reject kiye

Ye sabse saaf signal hai (Google ne page padha, phir bhi index nahi kiya). Sab live 200 +
`index, follow` + self-canonical hain, isliye blocker technical nahi:

| Impressions (120d) | Words | URL |
|---|---|---|
| 95 | 1,818 | `/everyday/gift-wrap/` |
| 95 | 1,343 | `/hub/fitness/` |
| 64 | 1,611 | `/auto/trip-time/` |
| 48 | 1,677 | `/lifestyle/road-trip-cost/` |
| 44 | 308→ | `/guides/water-intake/` (ab `/guides/water-intake`) |
| 33 | 1,689 | `/regional/home-loan-emi-india/` |
| 32 | 1,534 | `/math/scientific-notation/` |
| 24 | 308→ | `/guides/calories/` (ab `/guides/calories`) |
| 21 | 792 | `/embed/` |
| 8 | 1,680 | `/regional/lpg-cost/` |
| 6 | 1,604 | `/education/plagiarism-check/` |
| 3 | 1,174 | `/engineering/` (category root) |
| 3 | 1,425 | `/math/scientific/` |
| 2 | 1,682 | `/education/exam-score-needed/` |
| 2 | 1,628 | `/lifestyle/baby-cost/` |
| 1 | 1,517 | `/business/cac/` |
| 1 | 308→ | `/disclaimer-finance/` |
| 1 | 1,520 | `/food/intermittent-fasting/` |
| 1 | 1,569 | `/health/calorie-burn/` |
| 1 | 1,096 | `/science/` (category root) |
| 1 | 1,490 | `/science/work-calculator/` |
| 0 | 1,473 | `/conversion/speed/` |
| 0 | 1,615 | `/everyday/budget-allocator/` |
| 0 | 1,747 | `/lifestyle/coffee-habit/` |

Poori list + har URL ka state/wajah/action: [deindexed-2026-10-28.csv](data/deindexed-2026-10-28.csv).

### 30 "Page with redirect" — defect nahi, URL-form consolidation ka price

Ye 30 pages 17 Oct tak **slash form** (`/regional/dubai-salary/`) par indexed the. Aaj wahi URL
200 deta hai, lekin Google ne beech mein aisi form dekhi jo redirect karti thi (22–24 Oct ke
canonical-URL fix se pehle). Verify kiya: Googlebot aur normal browser UA — **dono ko 200**,
koi `X-Robots-Tag` nahi, koi host/geo redirect nahi. Yani ab redirect nahi hai; record purana hai.
Inhe "fix" karne ke liye code mein kuch nahi — Request Indexing hi rasta hai, aur wahi queue
mein sabse upar hain.

### Jo 3 asli redirect hain (aur fix karne layak nahi)

`/guides/water-intake/`, `/guides/calories/`, `/disclaimer-finance/` → **308** slash-less form
par. Sitemap mein pehle se **slash-less** form hai (`<loc>.../guides/water-intake</loc>`), yani
sitemap sahi hai aur redirect bhi sahi hai (ek URL form, ek canonical). Ye pages purane slash
form par indexed the; ab Google naye form ko index karega. Isse count temporarily kam dikhta
hai — permanent loss nahi, lekin reindex chahiye.

### Category root aur hub — pehle duplicate laga, naapa to duplicate nahi (correction)

Is diff ko dekhte hue lagta hai ki 19 categories mein `/cat/` aur `/hub/cat/` do duplicate list
pages hain. Maine pehle **poore page** ka text naapa aur 48–57% overlap mila. Wo galat tha:
usme site ka nav/footer/boilerplate bhi shamil tha. Jab sirf `<main>` (asli content) naapa —
wahi tareeka jo `data/uniqueness-measure.json` istemal karta hai — to tasveer badal gayi:

| Category | `/cat/` main words | `/hub/cat/` main words | Shared 7-word shingles (main only) |
|---|---|---|---|
| lifestyle | 851 | 1,393 | 33% |
| regional | 858 | 1,282 | 33% |
| homegarden | 795 | 1,377 | 31% |
| career | 732 | 1,208 | 27% |
| business | 701 | 1,057 | 25% |
| … (baaki 15) | 516–795 | 631–1,149 | **11–24%** |

Median **21%**, aur site ka average is se **zyada** hai (median page apne 48% shingles doosre
pages par bhi rakhta hai). Yani ye do pages duplicate nahi hain: root category listing hai,
hub deep guide hub hai. Internal links bhi bilkul alag tarah batte hain — `/cat/` ko **15,666**
internal links milte hain (site-wide nav se), `/hub/cat/` ko **1,493**; impressions 8 categories
mein root 98 vs hub 141.

**Faisla (aapka "jo best hai wo karo", evidence ke saath): kuch consolidate nahi kiya.**
Canonical badalna yahan faayde ke bajaye nuksan tha — jo URL site-wide linked hai use index se
hatana, jabke overlap duplicate-level par nahi hai. GSC ke `/engineering/` aur `/science/`
"crawled, not indexed" states value/crawl ke hain, duplicate-canonical ke nahi; `/lifestyle/`
ka "alternate canonical" record bhi purana hai (live canonical khud par hai).
Isliye is item par koi page, canonical ya sitemap entry nahi badli.
