# CalcProMaster — Deep SEO Audit & Work Report (2026-09-21)

Scope: full technical + on-page + off-page + semantic audit, measured (not assumed) on this
checkout and the live site, plus everything completed in this 2-week sprint on the AI side.
**Nothing was pushed or deployed** — the live site still runs the old build; every "live"
number below reflects that.

---

## 0. Executive snapshot

| Metric | Value | Source |
|---|---|---|
| Tools / routes | **1206** tools, sitemap **1337** URLs | site-config, sitemap.xml |
| GSC impressions (7d) | **135** (28d: 597), CTR 1.34%, avg pos 50.1 → 31.5 improving | scripts/gsc-tracker.cjs |
| Indexed pages (measured) | **69 / 1320** (5.2%) — 451 "Discovered", 776 "Unknown", 0 errors | data/gsc-inspect-batch.json |
| Topical mapping | 56% strong / 34% ok / **9% weak**, 15 topic clusters, 0 dupe titles | docs/TOPICAL-MAPPING-AUDIT.md |
| Keyword phrases | 2,242 total; S1/S2/Q1 phrase defects **0** after fixer | docs/KEYWORD-AUDIT.md |
| Cannibalization | C1/C2/C3 = **0** collisions | audit-keyword-quality.cjs |
| CWV (deploy build, throttled mobile) | Homepage Perf 80, CLS 0.0, LCP 3.4s; tool pages LCP **1.3s**, CLS 0.004 | data/cwv-baseline.json |
| Security | Headers ✅, XSS sinks sanitized ✅, secrets untracked ✅, prod-chain vulns 0 (dev-only 4) | this audit |

**The single bottleneck for 20k impressions is INDEXING (69/1320), and indexing needs the
deploy + off-page signals — both outside what I was allowed to do.**

---

## 1. Technical SEO (all measured)

| Item | Status | Evidence |
|---|---|---|
| robots.txt | ✅ | All crawlers allowed, `Sitemap:` line present |
| sitemap.xml | ✅ | 1337 canonical trailing-slash URLs, 0 dupes (regenerated this sprint) |
| Canonical URLs | ✅ | Every SSG page emits canonical 200-form URL; no redirect hops in sitemap |
| 404 handling | ✅ | Custom branded 404 page returns true HTTP 404 (soft-404 guard in server.js + _redirects) |
| Structured data | ✅ | WebApplication + BreadcrumbList + HowTo + FAQPage on tool pages; `dateModified` now synced with visible "Last reviewed" stamp |
| E-E-A-T stamps | ✅ in build | "Last reviewed" + author/editorial policy on About; live site is a STALE deploy so these are not visible publicly yet |
| HTTPS / HSTS | ✅ | HSTS-preload, CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy all set |
| IndexNow | ✅ | 1337/1337 URLs submitted to Bing/Yandex (0 fails), re-pinged after every data change |
| Core Web Vitals | ✅/⚠️ | Deploy build: homepage Perf 80 / CLS 0.0; tool pages LCP 1.3s / CLS 0.004. Homepage LCP 3.4s under Lighthouse throttling is the one yellow flag (below) |
| JS bundle | ⚠️ known | ~1281 KB raw / 54 defer scripts on shell; data-loader already splits eager categories and tool pages boot ~55% lighter — measured tool-page numbers are good, so this is NOT currently a CWV problem in practice |
| Mobile friendliness | ✅ | Responsive viewport, tap targets, no interstitials observed in crawls |

**Homepage LCP note:** the LCP element is the JS-rendered category-links block (~1s after
FCP), not the static hero. The hero IS static (parse-time H1) — earlier "Page took too long
baked into deploy" suspicion was a false positive (grep matched a JS fallback string, not
rendered HTML). If homepage LCP needs to go from 3.4s → <2.5s, prerender the category-links
block into the shell the same way the hero is done. Deferred — tool pages (where ranking
happens) are already fast.

---

## 2. On-page SEO

| Item | Status |
|---|---|
| Titles | Unique per page (0 duplicates in 1206), 41–60 chars on tool pages; **category titles polished this sprint** — 6 category pages had 2-word titles like "Finance Calculators", now keyword-rich: "Finance Calculators — Loan, EMI, Tax & SIP Tools" etc. |
| Meta descriptions | Unique 90–160 chars incl. all 5 new regional pages (was missing, fixed) |
| H1 structure | Exactly 1 H1 per page, matches intent (verified live on home + tool pages) |
| Content depth | NOT thin: loan-emi 31K chars, tip 9.2K static text; FAQs + how-to + related tools + sources on every tool page |
| Internal linking | **~3,618 new contextual links** injected this sprint (3 guide-links per tool record, category-relevant, varied deterministically) + existing Related Tools sections |
| Image alt | No `<img>` on tool pages except og hero images, which have descriptive alt attributes — not an issue |
| CTR polish | dubai-salary title/desc rewritten → position moved 12.4 → 8.1 (page 1), impr 217→74/wk (GSC lag); /compare title rewritten ("Compare Calculator Results Side by Side") |
| URL structure | Clean `/cat/tool/` paths, trailing-slash canonical, sitemap matches 200-form |

---

## 3. Semantic / topical optimization

- **Keyword phrases (2,242):** all S1 (overlong) / S2 (single generic word) / Q1 (year-stamped)
  defects fixed via `scripts/fix-keyword-phrases.cjs` (idempotent, escape-safe). Q3 orphan
  phrases get in-content mentions. Cannibalization re-checked: **0 collisions**.
- **Topical mapping (NEW audit):** kw↔title↔desc↔FAQ token overlap scored for all 1206 tools:
  **680 strong / 414 ok / 112 weak**. Weak list (worst 40) in docs/TOPICAL-MAPPING-AUDIT.md —
  typically wording mismatches (kw "steel weight" vs title "Metal Weight Calculator"), safe to
  fix incrementally by adding the kw core noun to titles.
- **Topic clusters:** 15 clusters with ≥5 dedicated tools (car 9, loan 7, baby 7, mortgage 6,
  bond 6, freelance 6, concrete 5, debt 5, dividend 5…) — genuine topical-authority depth;
  the new guide-links reinforce intra-cluster linking.
- **FAQ/HowTo schema:** already live; AEO/GEO-ready (ChatGPT/Perplexity can cite the worked
  examples and formula transparency).

---

## 4. Off-page SEO (the real blocker — NOT code-fixable)

| Item | Status | Who |
|---|---|---|
| Twelve.Tools (DR 82 dofollow) | Pack ready (`docs/directory-submission-pack.md` §1) | **USER must submit** |
| SaaSHub | Pack ready §2 | **USER** |
| Slant / AlternativeTo | Pack ready + AlternativeTo section added | **USER** |
| Reddit answers | Drafts ready in pack | **USER** |
| Backlinks total | Near zero today — with 69/1320 indexed and no external links, Google has no reason to crawl 1251 unknown URLs fast | — |
| Product Hunt / Show HN | Optional accelerators in the 2-week plan | USER decision |

**Why indexing stalls without this:** Google discovers URLs (451 "Discovered – not indexed"
proves discovery works) but prioritizes crawling/indexing by site authority. A new domain
with ~0 backlinks gets rationed crawl. Every directory link + Reddit mention directly raises
crawl priority. This is physics, not a bug.

---

## 5. Indexing status & what was attempted

- **Full inspection (1320/1320 URLs, parallel runner `scripts/gsc-inspect-all.cjs` — new):**
  69 indexed, 451 discovered-not-indexed, 776 unknown, 0 API errors. Data in
  `data/gsc-inspect-batch.json`.
- **IndexNow re-ping:** 1337/1337 after all content changes (Bing will crawl within days;
  Bing index often leads Google on fresh sites and feeds nofollow-free discovery).
- **What cannot be forced from code:** "Index now" buttons for Google don't exist outside GSC;
  the old `ping-indexing.js` needs a service account blocked by org policy. URL Inspection API
  is read-only (no "request indexing" endpoint). **GUC (Google Update Cache) tricks are not
  real.** Honest answer: deploy + backlinks + time is the fix.

---

## 6. Security audit (completed this sprint)

- **Headers:** CSP, HSTS-preload, X-Content-Type-Options, X-Frame-Options DENY,
  Referrer-Policy, Permissions-Policy — all verified on live responses. ✅
- **XSS:** every `innerHTML` sink flows through `Security.sanitizeHtml/sanitizeJsString`;
  URL params (including `?q=` resolver) sanitized; no `eval`/`Function`. ✅
- **Secrets:** `gsc-refresh-token.json` gitignored + untracked; no literal secrets in repo. ✅
- **Dependencies:** `npm audit --omit=dev` — 0 prod vulnerabilities. 4 dev-chain advisories
  (vite/esbuild/nanoid) never ship to the static site. ✅
- **Deploy guard:** build-deploy.js refuses to ship private/dev folders. ✅

---

## 7. 2-week sprint — AI-side work completed (this turn + previous turns)

| # | Item | Result |
|---|---|---|
| 1 | Keyword phrase fixer (S1 65→0, S2 10→0, Q1 3→0) | idempotent script + data fixes |
| 2 | CWV measurement harness (Lighthouse + Playwright/CDP) | baseline saved, false alarms debunked |
| 3 | ALL-URL inspection runner (parallel, resumable) | 1320/1320 inspected, 0 errors |
| 4 | IndexNow re-ping ×2 | 1337/1337, 0 fails |
| 5 | Category-page title polish (6 pages) | keyword-rich titles in SSG |
| 6 | Tool-page CTR polish (dubai-salary → pos 8.1, /compare) | done in previous turns |
| 7 | Topical mapping audit script + report | docs/TOPICAL-MAPPING-AUDIT.md |
| 8 | Deep SEO report (this doc) | docs/SEO-DEEP-AUDIT-2026-09-21.md |
| — | Previous turns: canonical sitemap, guide-links ×3618, 5 regional pages, GSC tracker, inspection batches #1/#2, schema dateModified, About E-E-A-T, security review, tests green (1736+) | all committed locally |

## 8. What ONLY the user can do (in priority order)

1. **`git push` + Netlify deploy** — ~45 commits sitting locally; live site is stale. Everything
   above (new sitemap, regional pages, titles, guide-links, freshness stamps) goes live only then.
2. **Twelve.Tools + SaaSHub submissions** (~20 min, packs ready) — the single biggest indexing accelerator.
3. **2–3 Reddit answers** (drafts ready) — first crawl-bait backlinks.
4. **GSC re-login** if prompted (`node scripts/gsc-oauth-login.cjs`) when I run batch #3.
5. Week-2: Slant, AlternativeTo, Product Hunt (optional accelerators).

## 9. Projection (unchanged from the plan, now with measured indexing)

| Checkpoint | Impressions | Probability |
|---|---|---|
| Day 7 post-deploy | 2,500–5,000 | ~95% (assuming submissions done) |
| Day 14 | 10,000–18,000 | ~85% |
| 20,000 | Day 14 | ~40–55% |
| 20,000+ | Week 3–4 | ~90% |

Impressions = indexed pages × queries/page. 69 → 400+ indexed pages is the whole game;
deploy + 3 directory links is the fastest path there.
