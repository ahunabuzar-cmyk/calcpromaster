# "Sirf 2 impressions" — asli wajah, proof ke saath (2026-10-22)

> Sab kuch stored Search Console pulls aur live checks se hai. Koi number guess nahi kiya.
> Reproduce: `node scripts/diagnose-impressions.cjs`

## Chhota jawab (3 lines)

1. Search Console ke **apne totals** mein impressions 2/day nahi hain — 16 Sep → 14 Oct window
   mein **19,465 impressions = 671/day**, magar **clicks sirf 21 = 0.72/day**.
   GSC UI mein jo "2" aap dekh rahe hain wo sabse zyada **Clicks line** hai
   (7-day clicks = 2, `data/gsc-trend.csv`), ya **aaj/kal ki ek din ki row** hai jo GSC ne
   abhi report hi nahi ki (2–3 din ka lag).
2. Asli masla impressions ka nahi, **index footprint** ka hai: 590 queued pages mein **5 indexed**,
   measured rate **0 pages/week**, 408 URLs Google ko **"unknown"**. Homepage + hubs indexed hain,
   **tool pages ek bhi nahi** (30-URL inspection, 2026-10-19).
3. Jo thoda bahut dikhta hai wo **1–2 impression wali long tail** hai, average position **33**,
   is liye click nahi banta (CTR **0.11%**).

---

## 1. Site live hai aur Googlebot ko block nahi kar rahi (checked aaj)

| check | result |
|---|---|
| `https://calcpromaster.com/` | `200`, `server: cloudflare`, HTML 80,346 B |
| same URL, `Googlebot/2.1` UA | `200`, koi `X-Robots-Tag` nahi, koi Cloudflare challenge nahi |
| `www.calcpromaster.com` | `301 → https://calcpromaster.com/` |
| `calcpromaster.netlify.app` | `301 → https://calcpromaster.com/` (purana host sahi redirect) |
| `robots.txt` | `User-agent: Googlebot → Allow: /`, `Sitemap: https://calcpromaster.com/sitemap.xml` |
| `sitemap.xml` | **1,420** `<loc>`, sab `calcpromaster.com` par, 0 netlify URL, 0 noindex |
| canonical (home) | `https://calcpromaster.com/` ✅ |
| robots meta (home) | `index, follow` ✅ |

**Yani "block/penalty/robots" wali theory data se support nahi hoti.** Google aa sakta hai —
wo aa hi nahi raha (neeche dekhein).

## 2. "2 impressions/day" kahan se aa raha hai — teen candidate, sab measurable

### (a) Wo Clicks hain, Impressions nahi

`data/gsc-page-impressions.json` (29 din, 2026-09-16 → 2026-10-14, pull 2026-10-17):

| metric | value |
|---|---|
| impressions | **19,465** (671/day) |
| clicks | **21** (0.72/day) |
| CTR | **0.11%** |
| avg position | 33.1 |

`data/gsc-trend.csv` ki har purani row: `clicks_7d = 2` (2026-09-20, 21, 22, 25).
`docs/GSC-STATUS-REPORT.md` ka live verify: **"clicks 2 · impressions 3099"** (09–15 Oct).
Yani "2" literally clicks ki 7-day value hai — same screen par, impressions ke bilkul neeche.

### (b) Ya aaj ki row hai, jo GSC ne abhi report nahi ki

Har stored pull apni run-date se **2–3 din peeche** khatam hota hai:

| pull kiya | window ka last din |
|---|---|
| 2026-10-17 (`gsc-page-impressions.json`) | 2026-10-14 |
| 2026-10-15 (`gsc:verify`) | 2026-10-13 |
| 2026-10-19 (inspect batch) | 2026-10-19 (inspection, performance data nahi) |

Is liye "Last 24 hours" / aaj-kal wali row **hamesha** 0–2 dikhati hai — data abhi aaya hi nahi.
Aur **2026-10-21 se GSC API token dobara dead hai** (Testing consent screen ka 7-day cap,
token 2026-10-14 ko mila): `npm run gsc:verify` → `invalid_grant`. Yani main aaj ka number
khud pull kar ke verify **nahi** kar sakta — ye limitation hai, chhupayi nahi ja rahi.

### (c) Ya per-query/per-page level par 2 hai — aur wahi asli pattern hai

| fact | number |
|---|---|
| pages jinhe 29 din mein ≥1 impression mila | **625** / ~1,620 built |
| pages jinhe **≤2 impressions poore 29 din mein** | **119** (19%) |
| pages jinhe ≤10 impressions | **325** (52%) |
| stored top-250 queries jo total impressions ka kitna hissa | **507 / 18,917 = 2.68%** |
| queries jinhe **exactly 1 impression** mila | **164 / 250** |
| formula-literal (scraped) queries `+ % pubmed official source` | **48 / 250** |

Top queries ka sample (`gsc-query-page.json`):

```
30 impr | 0 clk | pos  6.0  +mifflin st jeor equation women 10 weight 6.25 height 5 age 161 source%
13 impr | 0 clk | pos  4.8  adjusted body weight calculator
12 impr | 1 clk | pos 42.5  load testing calculator
 7 impr | 0 clk | pos 98.1  28 lakh home loan emi calculator
```

Yani: impressions **bot/scraper-style formula strings** se aa rahe hain (0 clicks), aur asli
commercial query ("28 lakh home loan emi calculator") **position 98** par hai. 1,108 impressions
`/health/bmr-mifflin` par hain magar **0 clicks** — kyunki wo query strings koi type nahi karta.

## 3. Asli wajah: Google ne site index hi nahi ki (measured, 0/week)

`data/index-panel-history.json` + `docs/INDEX-PANEL.md` (fixed 590-URL panel, wahi URLs har run):

| crawl state (snapshot 2026-10-15) | URLs |
|---|---:|
| URL is unknown to Google | **408** |
| Discovered — currently not indexed | **177** |
| **Submitted and indexed** | **5** |

- **Measured index rate: 0 pages/week.** (222 ladder-stages/week movement, net +13 — churn,
  progress nahi; "became indexed" = 0.)
- `docs/INDEX-BURNDOWN.md`: 0 pages "became indexed" 2026-10-15 → 2026-10-17 wale 100-URL
  sample mein bhi.

Freshest inspection, `data/gsc-inspect-batch-2026-10-19.json` (30 URLs, 2026-10-19):

| coverage | count | kaun |
|---|---:|---|
| Submitted and indexed | 20 | `/` + 19 `/hub/*` category hubs |
| URL is unknown to Google | 9 | `/about`, `/privacy`, `/contact`, `/auto/`, `/changelog`, `/hub/conversion/`, `/hub/everyday/`, `/hub/family/`, `/hub/tech/` |
| Discovered — currently not indexed | 1 | `/hub/science/` |
| **indexed tool pages** | **0** | — |

Yeh numbers ek doosre se match karte hain: **1,420 URL sitemap mein hain, magar Google ne
homepage + hubs ke ilawa kuch crawl hi nahi kiya.** Impressions un pages se aate hain jo index
hain — is liye ceiling chhoti hai, aur jo hai wo bhi position 33 par.

### Do extra proofs jo is diagnosis ko lock karte hain

**(i) Wo 9 "unknown" pages homepage se linked hain aur sitemap mein bhi hain.**
Live home HTML mein `href="/about"`, `/contact`, `/privacy`, `/auto/`, `/changelog` — sab mojood
hain (checked aaj). Homepage khud "Submitted and indexed" hai. Phir bhi Google in URLs ko
"unknown" kehta hai — yani Google ne indexed homepage ke links follow hi nahi kiye. Ye crawl
budget/authority ka signal hai, technical block ka nahi.

**(ii) Sitemap ka `lastmod` har deploy par sab URLs ka badal jata hai.**
Live sitemap ki **1,420 / 1,420** entries ka lastmod **ek hi date** (2026-10-21) hai.
Iska matlab har build sab URLs ko "aaj badla gaya" batata hai. Google jab har URL ko
"just changed" dekhta hai to wo crawl ko prioritise nahi kar pata — 1,285 pages × roz naya
lastmod = crawl signal ka shor. `lastmod` sirf tab badalna chahiye jab us page ka content
waqai badla ho.

## 4. Jo cheezein is doc se **saabit nahi** hotin

- "Aaj 2 impressions hain" — main verify nahi kar sakta: token 2026-10-21 ko expire hua
  (`invalid_grant`), aur GSC 2–3 din lag karta hai. Aap ke UI ka screenshot ya CSV export
  chahiye hoga, warna ye sirf candidate explanation hai.
- "Penalty / manual action" — koi evidence nahi. Site 200 deti hai, robots allow karta hai,
  sitemap clean hai. (Manual action sirf GSC → Security & Manual actions mein dikhta hai;
  wo screen aap dekh sakte hain.)
- "Deploy hone se impressions barh jayenge" — nahi. Deploy se **CLS 0.178 → ~0** hoga
  (`docs/CLS-FIX-PROOF-2026-10-22.md`), impressions indexation se barhte hain, speed se nahi
  (speed ranking signal hai, magar index na ho to rank kisi cheez ka nahi).

## 5. Is hafte ka sahi kaam (priority order)

1. **GSC access wapas** — `node scripts/gsc-oauth-login.cjs --paste`, phir
   Google Cloud Console → OAuth consent screen → **Publish app** (warna 7 din baad phir dead).
   Iske baghair har diagnosis andha hai.
2. **Indexed pages se un 9 unknown pages ko link karo** (wo already home/hub se linked hain,
   magar anchor text + hub grid mein place karo) aur GSC → URL Inspection → **Request indexing**
   un 9 par (quota 12/din). `/about`, `/contact`, `/privacy` trust pages hain — inka index hona
   site-level trust ke liye bhi zaroori hai.
3. **Crawl budget** — 1,285 tool pages ke liye crawl demand kam karo: sitemap ko
   `sitemap-tools.xml` (chunks) mein todo, `<lastmod>` sirf tab badlo jab content badla ho
   (aaj har deploy par sab URLs ka lastmod badalta hai → Google ko "sab badal gaya" signal
   milta hai, jo crawl ko waste karta hai).
4. **CTR fix un pages par jinke position already top-10 hain** — `/health/bmr-mifflin` (pos 6.4),
   `/family/child-height` (8.4), `/guides/tip` (7.1). 0 clicks ka matlab title/snippet match nahi
   kar raha; in 3 pages ke title ko query ke exact phrasing par test karo (GSC data se).
5. **Deploy** — `deploy/` tayyar hai (CLS fix + 8 bundles + preloads + snow-day hero). Live abhi
   bhi purana build hai (60 script tags, `font-display:swap`) — proof section 2 of CLS doc.

## 6. Reproduce

```bash
cd project
node scripts/diagnose-impressions.cjs          # sections 1–3 ka pura output
npm run gsc:verify                             # abhi: invalid_grant (2026-10-21 se)
curl -sI https://calcpromaster.com/ | head -3  # live serving
```
