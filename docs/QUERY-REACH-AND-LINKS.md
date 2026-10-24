# Query reach aur links — keyword vs topic, measured

> **Research note** (2026-10-11). Hand-written, auto-generated nahi.
> Ye [`GROWTH-MODEL.md`](GROWTH-MODEL.md) ka saathi hai: wahan **arithmetic** hai, yahan **Google ke sources + is site ka measured query-reach**.
> Har measured number ke saath exact command hai (§8) — dobara chala kar verify kar sakte ho.

## 1. Teen sawal, teen seedhe jawab

| Sawal | Jawab |
|---|---|
| Semantic ka matlab: "keyword ki bajie topic par likho"? | **Haan.** Google khud likhta hai ke uske language systems page ko **"many queries"** se relate kar sakte hain, chahe page par wo exact words na hon. Exact-match keyword repeat karna requirement nahi. |
| Ek page "sau keywords" par rank karta hai? | Google **"many queries"** kehta hai — **koi number nahi deta** (100/1000 ka koi Google statement verify nahi hua). Aap ki site par measured: **median 4 queries/page**, p90 = 20, max = 165 (§3). |
| Keyword target karein, internal links, ya backlinks? | **Content/position pehle** (Illyes: *"The top ranking factor is content"*), **internal links** discovery + priority ke liye (Mueller: *"super critical"*), **backlinks** abhi bhi core systems mein hain magar koi measured "X hafte mein asar" rule nahi. Is site par link-equity routing **already built + gate PASS** hai — wahan naya kaam bacha nahi. |

## 2. Google kya kehta hai — exact quotes

**Meaning, na ke sirf exact string** ([SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)):

> "Google's language matching systems are sophisticated and can understand how your page relates to many queries, even if you don't explicitly use the exact terms in them."

**Systems concept/meaning par kaam karte hain** ([Ranking systems guide](https://developers.google.com/search/docs/appearance/ranking-systems-guide)):

> BERT — "allows us to understand how combinations of words express different meanings and intent."
> Neural matching — "an AI system that Google uses to understand representations of concepts in queries and pages and match them to one another."
> RankBrain — "we can better return relevant content even if it doesn't contain all the exact words used in a search, by understanding the content is related to other words and concepts."

**Topic vs keyword, aur "kitna kaafi hai"** ([People-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)):

> "Does the content provide a substantial, complete, or comprehensive description of the topic?"
> "leave feeling they've learned enough about a topic to help achieve their goal"

**Keyword stuffing** ([Spam policies](https://developers.google.com/search/docs/essentials/spam-policies)) — ye **definition** hai, koi density number nahi:

> "the practice of filling a web page with keywords or numbers in an attempt to manipulate rankings"
> Examples: "Blocks of text that list cities and regions that a web page is trying to rank for", "Repeating the same words or phrases so often that it sounds unnatural."

**Doorway abuse** — yahi wo line hai jo "har query ke liye alag page" ke qareeb hai:

> pages created "to rank for specific, similar search queries" that lead to intermediate pages less useful than the final destination.

Yani **ek intent ke liye ek dedicated page allowed hai**; **ek hi intent ko sau near-duplicate pages mein todna** risky hai.

**Links** ([link best practices](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) + [ranking systems](https://developers.google.com/search/docs/appearance/ranking-systems-guide)):

> "Google uses links as a signal when determining the relevancy of pages and to find new pages to crawl."
> links per page ka **"no magical ideal number"**.
> PageRank — "continues to be part of our core ranking systems."

**Google employees (reported, docs nahi)** — is liye secondary treat karo:

- Gary Illyes (PubCon 2023): *"I don't agree that it's the top 3 and it hasn't been for some time. The top ranking factor is content."* — [SERoundtable](https://www.seroundtable.com/google-links-no-longer-a-top-three-ranking-factor-36094.html)
- John Mueller (internal linking): *"internal linking is super critical for SEO… one of the biggest things that you can do on a website to kind of guide Google and guide visitors to the pages that you think are important."* — [SEJ](https://www.searchenginejournal.com/internal-linking-critical-for-seo/441381/)
- John Mueller (pages count): *"Often few strong pages > many weak ones."* — [SERoundtable](https://www.seroundtable.com/google-few-strong-pages-many-weak-24726.html)

**Jo verify NAHI hua (is liye claim nahi karenge):** "ek page hazaaron keywords par rank karta hai" ek Google statement ke taur par; "query fan-out is why ordinary pages rank for hundreds of keywords"; "backlink ka asar exactly 4–8 hafte mein aata hai".

## 3. Is site par measured: ek page kitne queries par aata hai

`data/gsc-query-page.json` (query→page join, window **2026-09-08 → 2026-10-06**) se, page-wise distinct queries:

| Distinct queries / page | Pages |
|---|---|
| 1 | 95 |
| 2–4 | 151 |
| 5–9 | 97 |
| 10–24 | 83 |
| 25–49 | 21 |
| 50–99 | 7 |
| 100–199 | 1 |
| 200+ | **0** |

**median = 4 · p90 = 20 · max = 165 · min = 1** — total 455 pages jinke paas kam az kam ek query row hai.

Sab se zyada reach wale pages (impressions ke hisaab se):

| Impressions | Distinct queries | Best query pos | Page |
|---|---|---|---|
| 1003 | 75 | 2 | `/lifestyle/home-insurance` |
| 453 | 74 | 5 | `/finance/pmi-calculator` |
| 392 | 24 | 2 | `/finance/fha-loan` |
| 261 | 77 | 1 | `/health/bmr-mifflin` |
| 240 | 63 | 2 | `/finance/apy-calculator` |
| 219 | **165** | 5 | `/guides/business-days` |

**Caveat (zaroori):** GSC ka query→page join poore 14,338 impressions mein se **9,900 (69%)** cover karta hai, aur GSC rows **truncate** karta hai. Is liye "distinct queries per page" ek **floor** hai, ceiling nahi. Phir bhi: ye hundreds/thousands se bohat door hai — aur ye aap ki site ka apna data hai, meri raay nahi.

**`Best query pos` ko galat na parho:** ye us page ki *sab se achi* query ka position hai, average nahi. 1003 impressions par 0 clicks ka matlab "poora page page-1 par hai" nahi — matlab ye ke kuch queries par page uper hai, baqi par neeche (avg position 36.7, §GROWTH-MODEL).

## 4. Ek cheez jis par shak tha, verify kiya: 109 dual-form pages

GSC join mein **109 pages** dono forms par dikhte hain — `/x` aur `/x/` (koi sitemap duplicate pair nahi; ye sirf GSC attribution hai). Split:

| Form | Query-pairs | Impressions |
|---|---|---|
| trailing-slash `/x/` | 879 | 2,306 |
| no-slash `/x` | 929 | 2,274 |

Live probe (2026-10-11) — dono forms 200 **nahi** dete:

```
200  /guides/business-days          canon=https://calcpromaster.com/guides/business-days
308  /guides/business-days/
308  /finance/pmi-calculator
200  /finance/pmi-calculator/       canon=https://calcpromaster.com/finance/pmi-calculator/
200  /finance/margin-call/          canon=https://calcpromaster.com/finance/margin-call/
```

**Verdict: bug nahi hai.** Server galat form ko **308** karta hai, aur GSC coverage mein wohi **208 "Page with redirect"** hain — yani Google apne aap consolidate kar raha hai. GSC ka dual-form data purane window ki residue hai. Is par "naya fix" banane ka koi faida nahi; bas **ek hi form** sitemap + internal links mein use hoti rahe.

## 5. Impressions kahan baithe hain (is liye kaam kahan karna hai)

| Measurement | Value |
|---|---|
| Impressions/indexed page/month | **39.7** |
| Top 10 pages ka share | **32.8%** |
| Top 50 pages ka share | **60.9%** |
| Impressions position 21+ par | **65%** |
| Indexed / not-indexed | **952 / 923** (50.8%) |
| Indexed pages with ≥1 query row | 455 (952 mein se) |

Yani: impressions **concentrated** hain. Naye pages banane se 5.3x nahi aata — **jo pages already impress kar rahe hain** unka position aur query-reach barhta hai tab aata hai.

## 6. Internal links vs backlinks — is site par kya bacha hai

| Lever | Is site ka status | Measured leverage |
|---|---|---|
| Content / position | 81 pages page-1 par (kam az kam ek query), 20 page-2 par | Jo actually impressions de raha hai wahi lever |
| Internal links | Demand-weighted routing already built (`crawl-link-boost.cjs`), 784/784 covered, gate **PASS** | Naya kaam bacha nahi — sirf weekly gate |
| On-page copy→query match | 335/455 pages apni best query already cover karte hain | "poori site dobara likho" **waste** hai |
| Backlinks | Off-page, **koi measured impact abhi tak nahi** | Months ka kaam; koi guaranteed timeline nahi |

Evidence: internal links par sab se saaf Google statement **crawl/discovery** ka hai (links se naye URLs milte hain). Causal-style uplift ka sab se strong public evidence vendor split-tests hai (SearchPilot: ~25% sessions uplift ek grocery site par; Zyppy ka 23-million-link study **correlation** hai, causation nahi). Backlinks: #1 result ke average 3.8x backlinks (Backlinko, 11.8M results) — **correlational**, aur Ahrefs ke 1M-URL study mein sirf **1.74%** URLs ek saal mein top-10 tak pahunche (6.11% newly-created English pages mein). Ye timelines ki sab se qareeb public evidence hai, aur wo bhi "hafte" nahi kehti.

## 7. 200,000/month — is research ke baad arithmetic wahi rehti hai

| Step | Number |
|---|---|
| Aaj ka run-rate (7-day) | **1,241/day ≈ 37,767/month** |
| 200k/month ke liye chahiye | **6,570/day = 5.3x** |
| Poora index hone par (952 → 1,875) | **1.97x → 74,384/month** (phir bhi 2.7x short) |
| Us ke baad per-page exposure chahiye | **2.7x** aur — aur wahi position ka kaam hai (position 36 → ~12 = ~4x exposure) |

**Seedhi baat:** 30 din mein 5.3x ka koi measured path nahi. Jo realistically 30 din mein banta hai: **~2–2.5x (75k–95k/month)**, wo bhi tab jab indexing tezi se chale. 200k **3–6 mahine** ka target hai (40%/month par ~7 mahine, 100%/month par 3 mahine — [`GROWTH-MODEL.md`](GROWTH-MODEL.md) §5).

Jo **nahi** karenge: 923 not-indexed pages ke liye near-duplicate naye pages nahi banayenge (doorway risk), aur keyword density nahi barhayenge (stuffing definition). Measured data ke hisaab se jo bacha hai wo **indexing + position + already-earning pages ki query-reach** hai.

## 8. Reproduce (exact commands)

```bash
# 3. queries per page (median/p90/max + buckets)
node -e "const j=require('./data/gsc-query-page.json');const m=new Map();for(const p of j.pairs){const u=p.page.replace('https://calcpromaster.com','').replace(/\/\$/,'');if(!m.has(u))m.set(u,new Set());m.get(u).add(p.query);}const q=[...m.values()].map(s=>s.size).sort((a,b)=>a-b);const P=x=>q[Math.min(q.length-1,Math.floor(q.length*x))];console.log('pages='+q.length,'median='+P(.5),'p90='+P(.9),'max='+q[q.length-1]);"

# 4. dual-form split
node -e "const j=require('./data/gsc-query-page.json');const f=new Map();for(const p of j.pairs){const u=p.page.replace('https://calcpromaster.com','');const b=u.replace(/\/\$/,'');if(!f.has(b))f.set(b,{s:0,si:0,p:0,pi:0});const o=f.get(b);if(u.endsWith('/')){o.s++;o.si+=p.impressions;}else{o.p++;o.pi+=p.impressions;}}let S=0,SI=0,PP=0,PI=0,N=0;for(const o of f.values())if(o.s&&o.p){N++;S+=o.s;SI+=o.si;PP+=o.p;PI+=o.pi;}console.log('both-forms pages='+N,'slash='+S+'/'+SI+' plain='+PP+'/'+PI);"

# 4. live slash behaviour (308 vs 200)
node -e "const h=require('https');['/guides/business-days','/guides/business-days/','/finance/margin-call','/finance/margin-call/'].forEach(u=>h.get({host:'calcpromaster.com',path:u,headers:{'user-agent':'probe'}},r=>{console.log(r.statusCode,u,r.headers.location||'');r.resume();}));"
```

## 9. Sources (poori list)

Google: [How Search works](https://developers.google.com/search/docs/fundamentals/how-search-works) · [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) · [Ranking systems](https://developers.google.com/search/docs/appearance/ranking-systems-guide) · [People-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) · [Spam policies](https://developers.google.com/search/docs/essentials/spam-policies) · [Link best practices](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) · [Canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) · [Canonicalization troubleshooting](https://developers.google.com/search/docs/crawling-indexing/canonicalization-troubleshooting) · [To slash or not to slash](https://developers.google.com/search/blog/2010/04/to-slash-or-not-to-slash) · [Requesting recrawl](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl) · [Page indexing report](https://support.google.com/webmasters/answer/7440203)

Studies / reported quotes: [SearchPilot internal-link tests](https://www.searchpilot.com/resources/case-studies/impact-of-internal-linking-seo) · [Zyppy 23M-link study](https://zyppy.com/seo/seo-study/) · [Backlinko 11.8M results](https://backlinko.com/search-engine-ranking) · [Ahrefs time-to-rank](https://ahrefs.com/blog/how-long-does-it-take-to-rank-in-google-and-how-old-are-top-ranking-pages/) · [Illyes on links](https://www.seroundtable.com/google-links-no-longer-a-top-three-ranking-factor-36094.html) · [Mueller on internal linking](https://www.searchenginejournal.com/internal-linking-critical-for-seo/441381/) · [Mueller: few strong pages](https://www.seroundtable.com/google-few-strong-pages-many-weak-24726.html)
