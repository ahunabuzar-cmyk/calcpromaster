# Week-2 Roadmap — 20k Impressions Plan (26 Sep – 3 Oct 2026)

> Banayi gayi: 25 Sep 2026 ko, Day-6 checkpoint ke baad. Current: 7d impr 194 (+33% WoW),
> 28d 678, pos 33.7. Domain migration LIVE. Fazier + Launching Next SUBMITTED (tracker updated).

## ⚡ BLOCKER #1 — Drag-drop deploy (aaj hi, 2 min)
Sab kuch is pe depend karta hai. `C:\Users\ok\Documents\Calculator\project\deploy` → poora folder
→ Netlify Deploys tab par drop. Is deploy mein live hoga:
- **Force-301 rule** (`_redirects` top) → `netlify.app` 301 karega → **GSC Change of Address pass hogi**
- **Naya og-image.png** (.com watermark) → PH gallery ke liye asset
- 1,206 re-stamped tool og images

## ⚡ BLOCKER #2 — GSC Change of Address (deploy ke 10 min baad, 2 min)
GSC → purani property (netlify.app) → Settings → Change of address → **TRY AGAIN**.
Deploy se pehle mat karna — 301 test fail hoga.

## Day-by-day plan

### Sat 27 Sep — Verification day (30 min)
- [ ] curl test: `https://calcpromaster.netlify.app/` → 301 hona chahiye
- [ ] PH: Company Info URL → `https://calcpromaster.com` + gallery image replace (`project/og-image.png`)
- [ ] Twelve.Tools listing edit (hash `nj8tsuizv5f5c6swun37`): URL field `.com` karo
- [ ] GSC naye property par 2-3 din ka data dekhna shuru hoga

### Sun 28 Sep — GSC data day (20 min)
- [ ] Naye property ka PEHLA data dikhega (expected: chhota, 50-200 range)
- [ ] `node scripts/gsc-tracker.cjs` chalao (CSV row aaj ki)
- [ ] Sitemap coverage check: Pages report mein "Indexed" count badhna chalu

### Mon 29 Sep – Tue 30 Sep — Directory wave 2 (velocity rule: max 2/week)
- [ ] **SaaSHub** (saashub.com/submit): pack ready `docs/directory-submission-pack.md` §2 —
      subdomain-policy rejection ab apply nahi hoti (.com live)
- [ ] **AlternativeTo** (alternativeto.net/submit): pack §4 — "Add as alternative to
      WolframAlpha + Calculator.net" (ye zaroori hai, traffic wahi se aata hai)
- [ ] Har submission ke baad tracker row + ONE detail edit (duplicate-content se bachne ke liye)

### Wed 1 Oct — Content + community (1 ghanta)
- [ ] Reddit niche comments: `docs/REDDIT-PACK-HN-FIX.md` §4 ke 3 comments
      (r/personalfinance, r/math, r/Fitness — 24-48h purane threads, 1 link max/comment)
- [ ] Indie Hackers build-log post (content: `docs/backlink-outreach-content.md` §1.7)

### Thu 2 Oct — DAY-7 CHECKPOINT (important!)
- [ ] Naye property par **7d impressions ≥ 1,500?** → on track for 20k
- [ ] < 1,500 → pivot: PH launch ko aage badhao + HN modmail + directory queue double
- [ ] Tracker CSV + plan doc update

### Fri 3 Oct — Buffer / outreach
- [ ] Slant.co option entry (pack §3) agar quota bachi ho
- [ ] 1 resource-page outreach email (template: `docs/backlink-outreach-content.md` §4)
- [ ] Week-3 preview: PH launch window (Tue/Wed) — first comment + shoutouts ready rakho

## Success criteria for the week
| Metric | Aaj | Target (3 Oct) |
|---|---|---|
| 7d impressions (naya property) | 0 | 1,500–4,000 |
| Indexed pages (naya property) | 0 | 300+ |
| Directory listings live | 2 (Twelve.Tools) | 4–5 |
| GSC CoA | validation failed | VALIDATED |

## Reminder — baqi pending items
- Netlify token: REVOKE ho chuka? (User settings → Applications) — agar nahi, abhi karo
- GA4 ab bhi purane property par data de raha hoga — site-config `ga4Id` same hai, koi action nahi
- AdSense: abhi apply MAT karna — pehle 20k impressions + custom domain age hone do
