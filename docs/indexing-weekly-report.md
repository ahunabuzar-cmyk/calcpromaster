# CalcProMaster — Weekly Indexing Report

## Baseline (Week 0) — 2026-08-11

> Ye baseline hai. **2 hafte baad** (≈2026-08-25) isi file ko update karke compare karna —
> tab pata chalega indexing aage badhi ya nahi.

| Metric | Baseline (Week 0) | Week 2 check |
|---|---|---|
| Technical health (indexing-monitor) | **23/23 PASS** 🟢 | 23/23 PASS chahiye |
| Sitemap URLs | 778 (sab live domain, 0 duplicates) | 778 |
| GSC sitemap status | Awaited — owner submit (guide: `docs/gsc-sitemap-submit-guide.md`) | "Success" |
| GSC "Discovered URLs" | N/A (sitemap abhi submit nahi hua) | 778 dikhna chahiye |
| Indexed pages (GSC Pages) | N/A | 5–50 (2 hafte baad) |
| Bing/IndexNow | ❌ 403 `SiteVerificationNotCompleted` — Bing verify pending (owner) | Ping PASS |
| GA4 real-data script | ⏭ SKIPPED — `GA4_PROPERTY_ID` set nahi (owner, 2 min) | Config done |
| CLS / LCP (LIVE) | CLS 0.000, LCP 2.14s | Same ya better |
| Console errors (LIVE) | 0 | 0 |

## Kya abhi karna hai (owner, total ~20 min)

1. **GSC:** sitemap submit + top-5 request indexing → `docs/gsc-sitemap-submit-guide.md`
2. **Bing Webmaster:** site verify (file method — key `0e1100ec6bc9d4c2c6037d993fc2ba55.txt`
   already live 200) → phir `npm run indexnow` dobara (778 URLs turant notify honge)
3. **GA4 (optional automation):** Property ID (numeric) → `GA4_PROPERTY_ID=xxxx npm run monitor:ga4`
4. **Final deploy:** jab Netlify credits reset honge → PDF fix + CSP fix live (permission ke baad)

## 2 hafte baad ka comparison (is section ko update karna)

- [ ] GSC Pages → Indexed count likho (5–50 expected, 0 = deep check)
- [ ] GSC Performance → impressions (0 bhi normal agar naya)
- [ ] Indexing-monitor → 23/23 PASS?
- [ ] IndexNow → dobara ping, 778 success?
- [ ] SEO playbook: kaunse calculators top pe lag rahe hain

> **Golden line:** "Indexed nahi hona 2–4 hafte tak error nahi hai." Technical readiness
> verified hai — Google jab crawl karega site ready hai. Bas patience + ye weekly check.
