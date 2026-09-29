# 📈 GSC PROGRESS — 100,000 Impressions / 30 Din

**Goal:** 100,000 impressions (30 din) | **Start date:** 2026-09-28
**Update method:** GSC → Performance → Last 7 days → Export CSV →
`node scripts/weekly-gsc-report.cjs <csv>` → neeche table update.

## Baseline (2026-09-28, manual GSC dashboard)

| Metric | Value |
|---|---|
| Indexed pages | 375 |
| Discovered (not indexed) | 339 |
| Crawled (unknown status) | 445 |
| Batches requested (#1–#14) | 14 |
| Last-week impressions (approx/manual) | ~200–400/day era (pre-deploy, purana build) |

## Hafta-war Table (har Monday update)

| Week | Dates | Impressions | Clicks | CTR | Notes |
|---|---|---|---|---|---|
| 1 | Sep 28 – Oct 4 | _pending_ | — | — | Deploy pending — baseline week |
| 2 | Oct 5 – Oct 11 | _pending_ | — | — | Deploy + IndexNow + top-20 target |
| 3 | Oct 12 – Oct 18 | _pending_ | — | — | Directory approvals expected |
| 4 | Oct 19 – Oct 25 | _pending_ | — | — | Peak: sab listings live |
| **TOTAL** | 30 din | **_?_ / 100,000** | — | — | Goal %: _?_ |

## Trigger → Expected Impact

| Trigger | Kab | Expected impressions impact |
|---|---|---|
| Netlify deploy (naya build: 1,449 pages, 1,219+ title) | ✅ DONE 2026-09-29 (agent, Netlify CLI ×2 — title-drift bhi fix) | Fresh index sweep live — impressions pehle hi 6x |
| IndexNow 1,350 ping | ✅ DONE 2026-09-29 (0 failed) | 2-5 din mein re-crawl |
| GSC top-20 request-indexing | Deploy + 1 din | Priority pages 1-3 din mein |
| Sitemap resubmit | Deploy + 1 din | Discovery 339 → indexed flow |
| AlternativeTo / LN / StartupBase approvals | In ~2 weeks | DR85/55/60 backlinks → brand queries up |
| OpenAlternative (10 stars) | Stars pe 3/10 ✅ | DR anchor + referral |
| Peerlist Launch (user 1-click) | Ready | Launch-day spike |
| Reddit r/InternetIsBeautiful link post | ✅ LIVE 2026-09-29 (user posted) | Day 1-3 referral + brand queries |
| r/SideProject replacement post | Kal 2026-09-30 6PM PKT (warm-up comments pehle) | Niche referral |
| HN Show HN | ⏸️ TEMP-RESTRICTED 2026-09-29 (HN-wide new-account pause; mod: contribute first, welcome later) | Karma route: 4-5 din genuine comments → retry Tue Oct 6 (title locked, 62 chars) |
| HN Show HN (post-deploy) | Deploy ke baad Tue-Thu | 1-day spike 1-5k if frontpage |

## Honest Math (100k possible hai ya nahi)

- Pre-deploy baseline: ~2-4k/month (sirf brand + kuch long-tail).
- Deploy + indexing sweep: 375 → 1,347 indexed = **3.6x inventory**.
- Long-tail average: 1,347 pages × avg 2-4 impressions/day = 8-16k/month sirf organic.
- Backlinks + directories + HN/PH spikes: +5-15k/month realistic.
- **Realistic band: 15-40k month 1.** 100k month 1 = sab spikes hit + viral element — possible but top-end. Month 2 mein 40-80k normal band.

**Aakhri sach:** 100k ka sabse bada lever = **Netlify deploy**. Uske bina sab estimates 20% par chalte hain.

## 🚀 LAUNCH WEEK TRACKER (shuru: 2026-09-29 = Deploy + Reddit day-0)

**Baseline seed (gsc-trend.csv row 2026-09-29, API se):** clicks 2 · impr 7d **1,177** · CTR 0.17% · pos **21.3** · top page /health/pf-ratio/

⚠️ **Pehle se hi 6x signal:** Sep 25 impr 194 → Sep 29 impr 1,177, position 33.7 → 21.3 — Google .com sweep deploy se PEHLE shuru ho chuka (IndexNow + sitemap ping effect).

| Din | Run karo | Kya dekhna hai |
|---|---|---|
| Roz (ya 2 din mein ek) | `node scripts/gsc-daily-tracker.cjs` | impr_7dReddit-post trend, brand query "calcpromaster" aana shuru? |
| Har Monday | GSC CSV export → `node scripts/weekly-gsc-report.cjs <csv>` | Weekly goal % (100k) |
| Wed + Sat | `node scripts/gsc-queries.cjs --days 7 --rows 50` | Naye queries (IE/NZ/ZA pages, pf-ratio jaisa koi aur breakout?) |

**Reddit impact note:** GSC sirf ORGANIC dikhata hai — Reddit referral GA4 mein dekhna hota (Property ID pending). GSC par Reddit ka indirect asar = brand-query impressions 2-5 din mein.

**Expected bands (7 din):** impr 1,177 → 2.5-5k (indexing sweep + Reddit brand echo). Agar 8k+ cross hua = HN/PH spike bhi jud raha hai.
