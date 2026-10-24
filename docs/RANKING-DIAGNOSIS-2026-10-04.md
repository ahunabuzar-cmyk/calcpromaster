# Ranking Diagnosis — calcpromaster.com (2026-10-04)

**Sawal:** "Meri website rank nahi kar rahi?"
**Jawab (honest):** Site **rank KAR RAHI hai** — lekin **page 3–4 par** (avg position ~35).
"Rank nahi ho rahi" galat hai; "**low** rank ho rahi hai" sahi hai. Neeche har claim ka proof.

---

## 1) Proof: site INDEXED hai aur rank kar rahi hai

| Evidence | Result | Source |
|---|---|---|
| `site:calcpromaster.com` | Homepage **#1**, 10+ category pages listed | live Google SERP, 2026-10-04 |
| `calcpromaster free online calculators` | Site **position #8** | live Google SERP |
| `calcpromaster regional home-loan-emi-india` | `/regional/home-loan-emi-india/` = **#1** | live Google SERP |
| Brand + EMI query | `/finance/loan-qualify` = **#6**, `/finance/graduated-payment` = **#10** | live Google SERP |
| GSC (7 din window) | **7,220 impressions · 11 clicks · avg pos 34.9** | `data/gsc-trend.csv`, GSC API |
| GSC coverage snapshot | **375 indexed** / 1167 inspected | `data/gsc-coverage-report.json` |

Matlab: Google aap ko jaanta hai, index karta hai, aur long-tail par page 3–4 par dikhata hai.
Problem = **top-10 me nahi aa rahi**, na ki "index hi nahi".

---

## 2) Proof: RANK KYUN KAM HAI (root causes, priority order)

### R1 — Netlify PAUSED tha → `.com` ne 503 serve kiya (SABSE BADA killer)
- Proof: `curl -I https://calcpromaster.netlify.app/` → **HTTP 503** (2026-10-04).
- `.com` domain Netlify par tha; Netlify pause hone par Google ko **503/error** milta raha.
- 503 = Google crawl+trust khota hai. Isi liye **763 pages "Discovered/not indexed"** me atke hain.

### R2 — Sirf 375 / 1167 pages indexed (32%)
- Proof: `data/gsc-coverage-report.json` → tally = INDEXED 375 · UNKNOWN 445 · DISCOVERED 339 · slipped 21.
- Disqualified: naya domain + crawl budget throttle. Fix = content value + internal links + request indexing.

### R3 — Google ka CACHE STALE hai (titles purane)
- Live title: `CalcProMaster — 1282+ Free Online Calculators…` (`curl` verified).
- SERP par: **"1206+ free online calculators"**.
- Matlab Google ne fresh build re-crawl **nahi** kiya → freshness signal kam → CTR kam.

### R4 — Authority ≈ ZERO (backlinks)
- `docs/offpage-seo-status.md`: **0 external backlinks** (SEMrush: 1 referring domain).
- 2 hafte purana domain + zero links = competitive top-10 unrealistic. Halat badal rahi hai:
  dev.to article (#7, 2 din purana) + nicheloom listing live mile.

### R5 — Purana `netlify.app` duplicate abhi bhi rank kar raha hai
- Live SERP me `.netlify.app` pages positions **#2, #4, #8** par hain (jabki wo 503 hain).
- Ye `.com` se compete/confuse karte hain. Netlify ko **un-pause NA karo** — `.com` takeover karega.

### R6 — Domain cutover abhi chal raha hai
- `.com` abhi **SERVFAIL / connect fail** (Cloudflare zone `initializing`). Google crawl temporarily blocked.
- Registry NS ✅ Cloudflare par; zone `active` hone tak wait.

---

## 3) Fix plan — kya ho chuka / kya bacha

| # | Kaam | Status |
|---|---|---|
| 1 | Netlify → Cloudflare Pages migration | ✅ Live `https://calcpromaster.pages.dev` (all 200) |
| 2 | Fresh build, titles 1282+, quality gate PASS | ✅ |
| 3 | Nameservers Cloudflare par | ✅ Registry confirmed; zone `initializing` |
| 4 | Zone `active` → `.com` + `www` attach | ⏳ Agent (owner ko bas wait karna) |
| 5 | GSC: sitemap resubmit + Request Indexing (top 40) | ⏳ Owner (login) |
| 6 | Backlinks: directory submissions (ready packs) | ⏳ Owner, 10 min/week |
| 7 | Netlify ko paused hi rakhna | ✅ Rule — duplicate na banao |

## 4) Honest expectation
Naya domain + zero authority: **top-10 competitive terms 4–8 hafte lagte hain**. Pehle 2 hafte
meim long-tail positions (34 → 20) improve hongi, phir CTR/backlinks ke saath top-10.

**Aakhri sach:** Sabse bada lever = (a) `.com` ko 200 par lana (cutover finish), (b) Google ko
Request Indexing se re-crawl karana, (c) 4–6 asli dofollow backlinks. Teeno white-hat hain.
