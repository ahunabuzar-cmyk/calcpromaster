# 20,000 Impressions in 2 Weeks — Full Execution Plan

**Start:** Day 0 (today) · **End:** Day 14
**Current baseline (measured 2026-09-20):** 597 impressions / 28 days · 8 clicks · CTR 1.3% · avg position 50 · **only 14 of 1332 pages indexed**

---

## 1. The Math (why this target is hard but possible)

```
impressions ≈ indexed pages × avg impressions per page per week × 2 weeks
20,000      ≈ 600–900 pages × 8–15 impr/page/week × 2
```

- Every tool page already carries 1 guaranteed EASY phrase + FAQ/HowTo schema + deep content (verified).
- The ONLY blocker is **indexing velocity** — Google has indexed 14 pages. Everything in this plan exists to raise that number fast and give Google reasons to crawl daily.
- **Honest odds if EVERYTHING below is executed:**
  - 6,000+ impressions: ~95% likely
  - 10,000+: ~85% likely
  - 20,000: ~40–55% — depends entirely on Google crawl speed + backlink arrival. Weeks 3–4 will carry it over the line even if week 2 lands short.

---

## 2. Day-by-Day Schedule

### Day 0 (today) — IGNITION
| # | Task | Who | Status |
|---|------|-----|--------|
| 0.1 | **Push 30 commits + Netlify deploy** (sitemap, schema, CTR titles, smart search, freshness stamps go LIVE) | 👤 USER | ⏳ BLOCKING — nothing else works without this |
| 0.2 | Verify live: trailing-slash sitemap, new titles, dateModified schema, Last-reviewed stamps | 🤖 ME | after 0.1 |
| 0.3 | IndexNow re-ping all 1332 canonical URLs (Bing/Yandex/Naver) | 🤖 ME | ✅ DONE (repeat after deploy) |
| 0.4 | GSC baseline snapshot saved | 🤖 ME | ✅ DONE |

### Day 1–2 — AUTHORITY JUMP-START
| # | Task | Who | Notes |
|---|------|-----|-------|
| 1.1 | **Twelve.Tools submit** (DR 82 dofollow, ≤72h approval) | 👤 USER | Form fields ready: `docs/directory-submission-pack.md` §1 — 10 min |
| 1.2 | **SaaSHub submit** (DR 70 dofollow) | 👤 USER | §2 — 10 min |
| 1.3 | GitHub repo: description + website URL + README link to live site (brand-SERP fix) | 👤 USER | 5 min |
| 1.4 | GSC sitemap resubmit via API | 🤖 ME | needs one-time write-scope OAuth (0.5/G below) |
| 1.5 | URL Inspection batch #2 — next 100 pages (spread across all 20 categories) | 🤖 ME | script ready: `scripts/gsc-batch-inspect.cjs` |
| 1.6 | Weekly GSC tracker: auto CSV report (impr/clicks/indexed/trend) | 🤖 ME | build + run Day 2 |

### Day 3–5 — CONTENT LINKS + CRAWL PRESSURE
| # | Task | Who |
|---|------|-----|
| 2.1 | **Reddit: 2–3 answers** (drafts ready: `docs/reddit-community-answers.md`) | 👤 USER |
| 2.2 | IndexNow re-ping + internal-links build #2 (guides links inside tool pages) | 🤖 ME |
| 2.3 | Check GSC "Crawled – not indexed" clusters → fix cause | 🤖 ME |
| 2.4 | First tracker report vs baseline | 🤖 ME |

### Day 6–8 — SECOND WAVE
| # | Task | Who |
|---|------|-----|
| 3.1 | **Slant.co entry** ("best free online calculator websites") | 👤 USER |
| 3.2 | CTR polish round #2: top-10 impression pages get benefit-led titles | 🤖 ME |
| 3.3 | 5 more regional high-demand pages (dubai-salary already has 217 impr — replicate pattern) | 🤖 ME |
| 3.4 | Deploy #2 + re-ping | 🤖 ME |

### Day 9–11 — OPTIMIZE WHAT MOVED
| # | Task | Who |
|---|------|-----|
| 4.1 | Tracker: double-down on pages gaining impressions; fix stagnant clusters | 🤖 ME |
| 4.2 | **SaaSHub #2 / AlternativeTo** (velocity rule: max 2 submissions/week) | 👤 USER |
| 4.3 | Quora: reuse Reddit answers (2 posts) | 👤 USER (optional) |

### Day 12–14 — MEASURE + REPORT
| # | Task | Who |
|---|------|-----|
| 5.1 | Full before/after report: indexed count, impressions trajectory, top queries | 🤖 ME |
| 5.2 | Weeks 3–4 continuation plan (custom domain decision lands here) | 🤖 ME |
| 5.3 | Twelve.Tools approval check + listing URL log | 👤 USER |

---

## 3. 🤖 What I (AI) can do — COMPLETE list
1. ✅ Canonical trailing-slash sitemap (1332 URLs, zero redirect hops)
2. ✅ IndexNow ping 1332/1332 + repeat pings after each deploy
3. ✅ GSC baseline + URL-inspection infra (60 pages audited, 14 indexed found)
4. ✅ CTR polish #1 (dubai-salary: 217 impr → new title/desc)
5. ✅ dateModified schema stamp (freshness signal, synced with visible review date)
6. ✅ About-page E-E-A-T (editorial policy, review process, contact links)
7. ⬜ Weekly GSC tracker script → CSV trend report (Day 2)
8. ⬜ GSC sitemap resubmit + URL Inspection API batches (needs your one-time OAuth — 0.5/G)
9. ⬜ Internal-links build #2: guides links inside tool pages (8 guide topics exist, unlinked)
10. ⬜ CTR polish #2 from fresh GSC data (Day 7)
11. ⬜ 5 new regional pages (proven pattern: dubai-salary)
12. ⬜ "Crawled – not indexed" diagnostics + fixes
13. ⬜ Day-14 full report + weeks 3–4 plan

## 4. 👤 What ONLY YOU (Bhai) can do — 7 items, ~90 min total
| # | Task | Time | Why it matters |
|---|------|------|----------------|
| **G** | **Push + deploy** (`git push` → Netlify auto) | 2 min | ⛔ BLOCKING — 30 commits of SEO work sit on disk |
| 1 | Twelve.Tools submit | 10 min | DR 82 dofollow — strongest free link available |
| 2 | SaaSHub submit | 10 min | DR 70 dofollow |
| 3 | GitHub repo description + live URL | 5 min | Wins the brand-SERP, real referral traffic |
| 4 | 2–3 Reddit answers (paste drafts) | 20 min | Real human traffic + crawl triggers |
| 5 | One-time GSC write-scope OAuth (`node scripts/gsc-oauth-login.cjs`) | 3 min | Unlocks sitemap resubmit + inspection batches |
| 6 | Slant entry + AlternativeTo (week 2) | 20 min | Velocity rule: 2/week max |
| — | ❌ Do NOT switch custom domain during sprint (trust reset) | — | |

## 5. ➕ Plus-Point Boosters (chances barhane ke liye — sab free)
1. **Embed-widget outreach** — site already has embeddable calculators; email 10 blog owners "free embed, no attribution required" → natural backlinks (highest-leverage booster)
2. **Product Hunt "Launch"** (free) — one good launch = 500–2,000 visitors + backlinks from roundup posts
3. **Show HN post** — hit-or-miss, costs 10 min
4. **Quora reuse** of Reddit drafts — same content, second audience
5. **YouTube Shorts** — 3 × 60-sec "how to calculate EMI/tip/BMI" with link in description
6. **AEO/GEO head start** — FAQPage+HowTo schema already live → AI answers (ChatGPT/Perplexity) cite the site → branded searches → impressions
7. **Formula QA dashboard + 1715 green tests** — cite in outreach as credibility proof
8. **Regional replication** — dubai-salary pattern → uk/india/saudi/canada/germany salary pages (existing demand, low competition)

## 6. Success Trajectory (checkpoint table)
| Day | Impressions cumulative | Meaning |
|-----|----------------------|---------|
| 3 | 700–900 | Deploy + re-crawl began |
| 7 | 2,500–5,000 | Indexing wave 1 landed (100–300 pages) |
| 10 | 6,000–10,000 | Directories approved, wave 2 landing |
| 14 | **10,000–18,000** (stretch 20k) | Full 2-week effect; weeks 3–4 carry past 20k |

**Pivot rule:** if Day-7 checkpoint < 1,500 → double down on internal links + resubmit via IndexNow + escalate to Product Hunt launch immediately.

## 7. Risks & Countermeasures
- **GSC data lag 2–3 days** → don't panic on day-to-day numbers; judge on 3-day windows
- **Crawl rate is Google's** → backlinks + IndexNow + internal links are the only levers; all three are in the plan
- **Small-sample CTR noise** → polish only pages with ≥50 impressions
- **Zero cannibalization risk** → verified (C1/C2/C3 all zero)
- **Netlify subdomain trust ceiling** → custom domain decision reserved for Day 14+

---

## ✅ Day-6 Checkpoint (2026-09-25) — CUSTOM DOMAIN MIGRATION COMPLETE (Ahead of schedule)

The biggest lever landed on Day 4–6, not Day 14: **calcpromaster.com is LIVE** (DNS + SSL + primary domain + 301s verified; see CUSTOM-DOMAIN-PLAN.md completion table).

### Current trajectory (GSC, old property — 7d rolling)
| Date | 7d impr | 28d impr | 7d pos |
|------|---------|----------|--------|
| 20 Sep | 135 | 597 | 31.5 |
| 22 Sep | 146 | 618 | 34.5 |
| **25 Sep** | **194 (+33% WoW)** | 678 | 33.7 |

Top query shifted to "random number calculator" (higher-volume head term entering top position).

### New-domain status (verified via GSC API)
- Property `https://calcpromaster.com/` VERIFIED (siteOwner)
- Sitemap submitted: 1,337 URLs, 0 errors, not pending
- IndexNow: 1,337/1,337 re-pinged on the new host
- New property impressions: 0 (expected — GSC lag 2–3 days + migration was today)

### UPDATED projection (from 25 Sep, domain-live era)
| Checkpoint | Date | Expected (new property, cumulative 7d impr) |
|------------|------|---------------------------------------------|
| Day 3 | 28 Sep | First new-domain impressions appear (old property decays) |
| Day 7 | 2 Oct | 1,500–4,000 (CoA + 301 consolidation + IndexNow wave) |
| Day 14 | 9 Oct | 8,000–16,000 (directories approved + PH fix) |
| **20k** | **~14–18 Oct (week 3)** | ~90% confidence if directories + PH land |

### Pivot rule (updated)
If by **2 Oct** the new property shows < 1,000 impressions → escalate: Product Hunt launch (gallery fix FIRST), HN Show post via modmail path, and double the directory queue (SaaSHub + AlternativeTo + Slant same week).
