# CalcProMaster — White-Hat Backlink Action Plan

**Site:** https://calcpromaster.com/ · **Goal:** earn real, Google-safe backlinks for a new/low-authority site — and keep every one of them when the custom-domain migration happens.

**Files in this plan:**

| File | What's in it |
|---|---|
| `docs/backlink-tracker.csv` | The tracker — log EVERY link here, same day you create it |
| `docs/backlink-outreach-content.md` | 10 unique directory descriptions, 3 guest-post drafts, 5 forum answers, outreach email |
| `embed/index.html` (live: `/embed`) | Linkable asset — the embeddable-widget landing page to send people to |
| `embed/loan-emi.html` | The widget itself (iframe target) |
| This file | Velocity rules, spam rules, anchor rotation, migration checklist |

---

## Step 2 — Safe velocity rules (why + what)

Google's spam systems look for **link velocity that doesn't match a site's age, size, and popularity**. A 3-month-old site that acquires 50 links in a week looks manufactured, because organic discovery is slow. The fix is not cleverness — it's patience.

**The schedule (follow it literally for the first 8 weeks):**

| Period | Max new links | What kind |
|---|---|---|
| Week 1–2 | 1–2 total | Foundation directories only (AlternativeTo, SaaSHub, Fazier — the instant-approval ones) |
| Week 3–4 | 1–2 per week | Slant, Uneed, Launching Next; start ONE outreach email per week |
| Week 5–8 | 2–3 per week | First guest post pitch; 1–2 genuine forum answers |
| Month 3+ | 3–5 per week, only if organic | Outreach-driven: guest posts live, resource-page placements, widgets embedded by others |

**Hard limits (no exceptions):**
- Never 10+ links in one day. Ever.
- Never two links from the same platform type in the same week (two directories same week = pattern).
- Link acquisition should be *boringly* uneven: 2 this week, 0 next, 3 the week after. Perfectly regular acquisition is itself a signal.

**Why 1–2 is enough at the start:** for a new site, the first ~20 quality links (real directories, one or two editorial mentions) unlock crawling and baseline trust. Beyond that, more links only help if the pages they point to deserve to rank. A new site with 300 directory links and no brand searches looks worse than one with 25.

**Anchor text rotation (mandatory — repeated anchors are a spam signal):**

| Pattern | Share of links | Examples |
|---|---|---|
| Brand / site name | ~40% | "CalcProMaster", "calcpromaster.netlify.app", "CalcProMaster calculators" |
| Partial-match / natural phrase | ~35% | "this free EMI calculator", "their concrete calculator", "a calculator that shows the formula" |
| Naked URL | ~15% | "https://calcpromaster.com/" |
| Generic | ~10% | "this site", "here", "free online calculators" |

Never exact-match keyword anchors ("loan EMI calculator") more than ~10% of the time, and never the same exact anchor twice in any 10 links. Log every anchor in the tracker CSV as you use it.

---

## Step 4 — Spam/scam rules (STRICT — read before every submission)

**Never, under any circumstances:**
1. ❌ Paid link farms, PBNs (Private Blog Networks), or "1000 backlinks for $5" Fiverr packages. These are detectable, and recovery from a manual penalty costs months. No exceptions, no "just one".
2. ❌ Link exchanges ("I link to you, you link to me"). If an outreach reply asks for this, walk away. Excessive reciprocal linking is an explicit Google spam signal.
3. ❌ Comment spam — blog comments, YouTube comments, or forum posts whose real purpose is the link field.
4. ❌ Automated submission tools / GSA / SENuke / scrapers that blast directories. Manual, one at a time, personalized.
5. ❌ Buying aged domains and 301-ing them at the site. That's a scheme, not authority.
6. ❌ Fake personas, fake review accounts, or asking friends to leave fake "reviews" of the site on directories.
7. ❌ Private link networks disguised as "guest post networks" that charge per post. Paying an editorial site with real traffic for a genuinely useful article is a gray zone — for this plan, avoid it entirely while the site is new.

**Only count these as links:** directories with editorial standards, editorial mentions earned by useful content, genuine community answers where the link helps the asker, resource-page placements, and widgets embedded by site owners of their own free will.

**If you're unsure whether a link opportunity is spam:** ask "would I still want this link if Google gave it zero weight?" If the answer is no (it's only for the ranking signal), skip it. That test keeps you on the safe side of every algorithm update.

**Recovery rule:** if a manual action ever lands, the fix is disavowing the bad links and removing them where possible — documented in Google Search Central. Prevention is much cheaper.

---

## Step 5 — Linkable assets (what attracts links on its own)

**Tier 1 (live now): the embeddable calculator widget**
- Landing page: `https://calcpromaster.com/embed` — demo, copy-paste iframe snippet, fair-use rules
- Widget: `https://calcpromaster.com/embed/loan-emi.html` — standalone, zero-dependency Loan EMI calculator with a "Powered by CalcProMaster" attribution link

Why widgets earn links: every blogger who embeds it creates a natural, editorial, topically-relevant backlink — the exact kind Google weights most. One placement in a widely-read personal finance post can produce dozens of secondary embeds.

**How to promote it (white-hat only):**
1. Mention it in the guest posts (§2 drafts reference "a calculator your readers can use inline").
2. In forum answers, only when someone is literally asking "can I put a calculator on my site?" — that's a perfect, genuine fit.
3. Add a "Embed this calculator" line to the outreach email when targeting blogger resource pages.
4. Future: add 2–3 more widgets (mortgage, BMI, percentage) by copying `embed/loan-emi.html` and swapping the calculator logic — announce on the `/embed` page as "More widgets coming".

**Tier 2 (build later, when there's time):**
- An original data page (e.g. "average car-loan EMI by tenure in PKR/INR — computed monthly from the calculator") — data earns citations.
- A genuinely comprehensive guide that becomes *the* reference (e.g. the deepest practical EMI/prepayment explanation in the region languages).

---

## Step 6 — Domain migration safety (netlify.app → custom .com)

**The good news: the codebase is already migration-ready.** Every canonical URL, OG tag, schema URL, sitemap entry, and robots.txt Sitemap line is generated from ONE config value in `js/site-config.js` (`domain: 'calcpromaster.netlify.app'`). The build's `substituteDomain()` rewrites the whole deploy tree from that single value. Changing the domain = edit one line, rebuild, deploy. New pages (including `/embed`) use the same literal-origin pattern, so they're covered automatically.

**Why backlinks survive migration:** a backlink is a URL on someone else's site. If their URL points at `calcpromaster.netlify.app/finance/loan-emi` and that URL **301-redirects** to the same path on the new domain, Google transfers the signal — that's exactly what redirects exist for. Backlinks are only wasted when the old URL dies, chains through multiple hops, or lands on different content.

**The five rules that keep every backlink:**

1. **Same paths, always.** Do not rename slugs, categories, or the URL structure during migration. `netlify.app/finance/loan-emi` → `newdomain.com/finance/loan-emi`. A domain change AND a URL restructuring at the same time doubles risk — never do both together.
2. **Single-hop 301s from every old URL.** Netlify keeps serving the netlify.app subdomain after the custom domain is attached; set a domain-level 301/308 redirect on it. Netlify's Domain admin does this automatically for primary-domain aliasing — verify it returns 301 (not 302) and lands on the exact same path. Test 20 URLs spanning calculators, categories, guides, `/embed`.
3. **Search Console Change of Address.** In GSC, verify the NEW domain property, then use Settings → Change of Address for the old property. This accelerates Google's re-crawl and signal transfer. Submit the new sitemap from the new domain's GSC property.
4. **Update the backlink tracker's anchors afterwards? No — do not chase old links.** Only high-value editorial links (a guest post bio, a big resource page) are worth an email asking to update the URL; directories and forums aren't. The 301 handles the rest automatically.
5. **One canonical origin only.** After migration, the site must emit exactly one hostname everywhere. The build guarantees this via `site-config.js`. The smoke suite (`tests/e2e/deploy-smoke.spec.js`) has a single-origin drift test that FAILS the build on any stale hostname — run it after switching.

**Before-migration checklist (print this):**

- [ ] New domain purchased and DNS configured on Netlify (both apex + www, HTTPS provisioned — wait for the certificate to be live before switching)
- [ ] `js/site-config.js` → `domain:` changed to the new domain (the ONE code change)
- [ ] Full rebuild run: `npm run deploy:build` — 0 gate failures
- [ ] Spot-check deploy output: canonical tags, `robots.txt` Sitemap line, `sitemap.xml` `<loc>`s, OG urls — all show the new domain
- [ ] Smoke suite green: `npx playwright test tests/e2e/deploy-smoke.spec.js`
- [ ] Netlify: custom domain set as primary; netlify.app subdomain redirecting (verify `curl -sI https://calcpromaster.com/finance/loan-emi | head` shows `301`/`308` + new location)
- [ ] No redirect chains: old URL → new URL in ONE hop (check 5 URLs manually)
- [ ] Sitemap submitted in GSC from the NEW domain property
- [ ] Change of Address requested in GSC (old property → new property)
- [ ] `docs/backlink-tracker.csv` — note migration date in the Notes column; re-verify the top 10 links' 301s after a week
- [ ] Analytics/GA4 and AdSense (when approved) re-verified on the new domain
- [ ] Monitor GSC Coverage + Performance daily for 2 weeks post-switch; expect temporary ranking fluctuation (normal, recovers)

**After migration:** keep the netlify.app subdomain alive and redirecting indefinitely. It's free on Netlify and it's what every existing backlink, bookmark, and GSC record points to.

---

## Execution order (start here)

1. **Week 1:** fill the tracker's DR column for the 10 platforms (10 min, Ahrefs free checker or similar). Submit AlternativeTo + SaaSHub + Fazier (use §1.2, §1.3, §1.5 descriptions). Log everything.
2. **Week 2:** Product Hunt prep (gallery images, maker comment draft). Submit BetaList. That's it — 2 links this week max.
3. **Weeks 3–4:** Slant + Uneed + Launching Next. Send the first 2 resource-page outreach emails (template §4). First forum answer (§3.1) — only if a real matching question appears.
4. **Weeks 5–8:** Pitch guest post §2.1 to 3 finance blogs. Indie Hackers post. GitHub Awesome-List PR. Keep velocity at 2–3/week.
5. **Ongoing:** every time someone asks "can I put a calculator on my blog?" — send them `/embed`. Every natural embed is the best link in this entire plan.
6. **Monthly:** review the tracker; re-check live links still resolve; prune anything dead.
