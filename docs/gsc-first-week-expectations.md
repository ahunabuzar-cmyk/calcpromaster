# CalcProMaster — Google Search Console: First-Week Expectations

GSC sitemap submit karne ke baad kya hoga, kya normal hai, aur kya monitor karna hai.
Timeline rough hai — Google ka crawl pace aapke control mein nahi hai. Ye guide aapko
bataata hai ki **kya expected hai** vs **kya problem hai**.

---

## Day 0 (submit ke din)

| Action | Expected |
|---|---|
| Sitemap submit | "Success" message. Error nahi. |
| Sitemap status (Sitemaps page) | "Success" ya "Couldn't fetch" ki jagah "Success" dikhe. |
| URL Inspection → Request Indexing | Homepage + top 5 calculators submit karo. |

**Normal:** Pehle 24-48 ghante mein sitemap se URLs "Discovered" ho jaate hain.
Sitemap page pe "Discovered URLs: 778" type count aayega.

---

## Days 1-3

| Signal | Expected | Problem agar... |
|---|---|---|
| Performance report | 0 impressions ya very low | Normal. Naya site hai. |
| Indexing report | 778 URLs "Discovered" | `Crawled - currently not indexed` bhi normal hai is stage pe. |
| Sitemap errors | 0 errors, 0 warnings | Error aa raha hai → sitemap mein broken URL hai (report karo). |

**Important:** *Crawled - currently not indexed* aur *Discovered - currently not indexed*
ka matlab **kuch galat nahi hai** — Google ne dekha par quality/crawl-budget ke hisaab
se abhi index nahi kiya. 778 mein se 50-200 is state mein honge. Ye aam baat hai,
especially naye sites ke liye. Sirf 1-2 hafte baad bhi **0 indexed** ho to chinta karo.

---

## Days 4-7

| Signal | Expected | Problem agar... |
|---|---|---|
| Indexed pages | Pehle 5-30 pages "Indexed" dikhne lagain | 0 indexed + 7 din ho gaye → URL Inspection se 2-3 pages manually request karo |
| Impressions | Dozens se hundreds | Kuch nahi bhi aaye to bhi normal (naya domain, low competition keywords) |
| Clicks | 0-5 | Normal. CTR tabhi banta hai jab ranking aaye (weeks). |
| Core Web Vitals report | No data | Nahi hai — data hone mein 2-4 hafte lagte hain. |

---

## Week 2-4 (longer view)

- Indexed count slowly 50 → 200 → 500+ tak jata hai. **Sab URLs 1 din mein index nahi hote.**
- Performance slowly rise karega agar content quality + relevance hai.
- "Crawled - currently not indexed" kam ho kar "Indexed" mein convert hoga — ya permanently
  low-value pages ke liye wahi reh jayega (e.g. thin/duplicate content). Ye bhi normal hai.

---

## Monitor karna hai (weekly, 5 min)

`npm run monitor:indexing` — ye live checks chala kar bata deta hai ki site technically
healthy hai ya nahi (routes, sitemap, canonical, noindex, CLS). Agar site down ho ya
sitemap break ho, GSC indexing ruk jaati hai.

GSC mein weekly:
1. **Performance** → kya impressions aaye? Kahan se?
2. **Indexing** → Indexed count badh raha hai? Naye "not indexed" spike to nahi?
3. **URL Inspection** → 2-3 important calculators check karo (crawlable? indexable?).

---

## RED FLAGS (asli problems — ye normal nahi)

| Flag | Matlab |
|---|---|
| 500/404 spikes in Coverage | Server/routing problem — report karo |
| "Submitted URL has crawl issue" | Sitemap mein URL 404 de raha hai |
| robots.txt blocked warnings | Koi Disallow galat lag gaya |
| Sitemap errors > 0 | Sitemap invalid |
| 2+ hafte, 0 indexed, 0 impressions, sab "not indexed" | Content quality ya crawl issue — deep check |

---

## Sabse zaroori line

**"Indexed" na hona 2-4 hafte tak error nahi hai.** Google indexing ka process slow hai.
Technical readiness (ye project pehle hi verify kar chuka hai: routes 200, sitemap valid,
canonical correct, no noindex, CLS 0.000) ka matlab hai ki **jab Google crawl karega,
site ready hai**. Ab bas patience + weekly monitoring.
