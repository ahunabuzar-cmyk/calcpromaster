# Crawl/Index Boost Plan — Discovered 339 + Unknown 445 (2026-09-27)

## Sach (koi jhoot nahi)
Ye 784 URLs par **direct "index karo" ka koi button Google nahi deta.** Jo kaam code/dost
se ho sakta hai wo sab ye plan karta hai; baqi Google ke crawl scheduler ke haath hai —
authority badhne ke sath ye khud khatam hote hain (har naye site ka ye phase hota hai).

## Jo AAJ ho gaya (bina deploy ke jo ho sakta tha)
1. ✅ **IndexNow ping (50 URLs)** — Bing/Yandex ko seedha signal (live site purana build hai,
   isliye 50 limit — poora 1,347 deploy ke BAAD ping karenge).
2. ✅ **Sitemap/canonical slash-fix** — 87 redirecting sitemap URLs theek (crawl budget bacha).
3. ✅ **GSC coverage: 375 indexed** (pehle 81 ka screenshot netlify property ka tha).
4. ✅ Daily tracker ab **asli API data** se bharta hai: `node scripts/gsc-daily-tracker.cjs 2`

## Deploy ke FORAN BAAD (order matters — mujhe bolna, main chala dunga)
1. `node ping-indexnow.js` — **poora 1,347 URLs** IndexNow.
2. GSC UI → Sitemaps → **resubmit** (API readonly hai — tumhe 2 click karna hain).
3. Live verify: sitemap 1,347, exact-200 forms, embed widgets 200.
4. 48h baad GSC → URL Inspection → **top 20 pages par "Request Indexing"** (manual quota-
   limited — main list bana dunga priority pages ki: homepage, 20 hubs, top tools).

## Har hafte ka repeat (jo Google ko tez karta hai)
- **Internal linking:** hub pages se Discovered URLs ko contextual links (build already karta hai;
  guides se bhi deep links add karwa sakte hain — bolo to script likh dunga).
- **3-4 naye backlinks/hafte** (docs/free-backlink-sites-20.md) — authority = crawl rate.
- **Fresh content:** blog posts internal-link to Discovered tools.
- Tracker: roz `node scripts/gsc-daily-tracker.cjs 2` — trend nazar aayega.

## Kab tak
- Deploy + resubmit: Unknown 445 → "Discovered/Submitted" phase 1-2 hafta.
- Discovered 339 → indexed: 2-6 hafte (authority ke sath tez hoga).
- 100,000 impressions ka goal isi crawl/index graph growth par tika hai — isliye
  drag-drop + backlinks sabse high-leverage kaam hain.
