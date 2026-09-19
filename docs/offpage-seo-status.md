# Off-Page SEO — Status & Roadmap (Sept 2026)

## 1. Current state (measured, not guessed)

- **External backlinks found in Google:** 0 (brand search "calcpromaster/CalcProMaster" returns only our own pages — one unrelated lemon8 mention of an HP calculator).
- **Third-party view (SEMrush):** 1 referring domain, ~1 backlink — consistent with the above. Off-page authority is effectively zero.
- **What this means honestly:** technical + on-page SEO are strong (see final SEO report), but for a **1,331-URL site with zero external authority**, competitive rankings are not realistic yet. Off-page is THE blocker — no code change can substitute for it.

## 2. Why it's zero (no mystery)

- Site is young on a `netlify.app` subdomain (no domain history, no inherited trust).
- Nothing has ever been submitted, pitched, or posted anywhere — the link-building system (tracker, packs, widgets) was built only in the last week and **nothing has been executed yet**.

## 3. What's ready to execute (all built, verified, waiting on you)

| Asset | File | What it gets you |
|---|---|---|
| Twelve.Tools listing (P1) | `docs/directory-submission-pack.md` | DR 82 dofollow — footer link already added, goes live next deploy |
| SaaSHub listing (P2) | same file | DR 70 dofollow |
| Slant.co entry (P3) | same file | DR 70, needs an honest pros/cons write-up |
| AlternativeTo package | `docs/alternativeto-listing.md` | DR 85, the strongest classic directory |
| 6 Reddit/community answers | `docs/reddit-community-answers.md` | Traffic + brand queries first; links are nofollow but real users convert |
| 10 unique directory descriptions | `docs/backlink-outreach-content.md` | Avoids duplicate-listing footgun |
| 4 embeddable widgets | `embed/` | Passive link magnet once linked from the site |
| Tracker + velocity rules | `backlink-tracker.csv`, `backlink-action-plan.md` | Keeps growth natural, no spam penalty |

## 4. Execution plan (your part: ~10 min/week)

- **Week 1:** Twelve.Tools submit + AlternativeTo (2 links max — velocity rule).
- **Week 2:** SaaSHub + 1 Indie Hackers post.
- **Week 3:** Slant entry + 1–2 Reddit answers (account 6+ months old, genuine history).
- **Week 4+:** 2–3/week steady; first guest-post pitch (drafts in outreach pack).
- **Every submission:** log in tracker same day.
- **After deploy:** GSC → URL Inspection → request re-index of /about, /contact, /history, /compare (their cached snippets still show the old "543+" count).

## 5. What NOT to expect

- No rank movement in week 1–2 — links need discovery + trust accumulation (weeks, often months).
- Directory links alone won't rank "loan calculator" — they establish the base trust layer that makes *future content + one or two strong editorial links* effective.
- Nofollow (Reddit) links don't pass PageRank but do create brand-query demand, which helps discovery of your other assets.

## 6. Metrics to watch (monthly)

1. Referring domains (Ahrefs free Webmaster Tools / GSC links report): target 5 → 15 → 30 over 3 months.
2. Brand searches for "CalcProMaster" in GSC (effect rising after community posts).
3. First non-brand impressions on mid-tail terms (e.g. "emi calculator with prepayment").
