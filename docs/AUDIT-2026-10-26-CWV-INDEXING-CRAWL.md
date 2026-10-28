# GSC + CWV + crawl-rate audit — 2026-10-26

> Ek hi pass mein: Core Web Vitals (mobile + desktop), not-indexed pages ka asli
> reason, aur crawl-rate ke paanch lever (hosting, theme weight, internal links,
> publishing frequency, backlinks). Sab numbers `deploy/` ke built artifact se
> ya live site se liye gaye hain — koi estimate nahi.

Method: Lighthouse 13 (Playwright Chromium) against the built `deploy/` served
over gzip HTTP by `server.js`, one URL per page template, both form factors.
Raw records: `data/cwv-audit.json`. Re-run: `npm run perf:cwv`.

---

## 1. Ek nazar mein

| # | Aapne kya maanga | Kya mila | Status |
|---|---|---|---|
| 1 | CWV poor URLs, mobile + desktop, fix all | 5 of 6 templates poor on BOTH; cause = eager JS, not CSS/hosting | **1 fix shipped + verified; biggest lever documented §2.5** |
| 2 | Jo 2 pages index nahi hue — kyun, fix | 1 ab indexed ho gaya; 1 ka reason: zero demand, technical blocker nahi | **Diagnosed; remedy neeche (§3)** |
| 3 | Crawl rate: hosting, theme, internal links, publishing, backlinks | 3 theek, 2 mein real gap (publishing freshness, backlinks) | **Audited (§4); 2 gaps** |

---

## 2. Core Web Vitals

### 2.1 Current numbers (built `deploy/`, simulated throttling)

| template | mobile score | mobile LCP | mobile TBT | desktop score | desktop LCP | desktop TBT | page bytes | requests |
|---|---|---|---|---|---|---|---|---|
| `/` | 44 † | 6073 ms † | 656 ms † | 79 | 3746 ms | 373 ms | 390 KB | 19 |
| `/finance/loan-emi/` | 78 | 4379 ms | 310 ms | 72 | 4591 ms | 394 ms | 580 KB | 23 |
| `/health/bmi/` | 80 | 4231 ms | 240 ms | 77 | 4468 ms | 321 ms | 448 KB | 23 |
| `/math/` | 82 | 4118 ms | 200 ms | 91 | 3027 ms | 202 ms | 421 KB | 18 |
| `/hub/math/` | 82 | 4153 ms | 207 ms | 79 | 4200 ms | 258 ms | 421 KB | 20 |
| **`/guides/tip`** | **99** | **903 ms** | **0 ms** | **99** | **903 ms** | **0 ms** | **14 KB** | **4** |

† `/` mobile is unstable between runs: an earlier identical run on an idle
machine gave score **79 / LCP 3883 ms / TBT 340 ms / CLS 0.000**. The starved run
also reported unused-JS ballooning 85 → 307 KiB and TTI 10.1 s, i.e. the page was
still executing while Lighthouse measured. Treat those as load artifacts, not as
a page defect — but always measure on an idle machine.

### 2.2 The control that settles it

`/guides/tip` is **99 with LCP 903 ms and TBT 0 on both form factors**. Same
domain, same Cloudflare, same stylesheet, same fonts — the only difference is
that it loads **14 KB over 4 requests** instead of 390–580 KB over 18–23.

So: hosting, CDN, compression, critical CSS and font delivery are **not** the
bottleneck. The gap between 903 ms and 3–6 s is the application JavaScript.

### 2.3 What Lighthouse attributes it to

| template | unused JS | unused CSS | main-thread work |
|---|---|---|---|
| `/` | 85 KiB (~730 ms) | 14 KiB | — |
| `/finance/loan-emi/` | 115 KiB (~510 ms) | 12 KiB | 3.2 s |
| `/health/bmi/` | 66 KiB (~580 ms) | 12 KiB | 2.6 s |
| `/math/` | 108 KiB (~300 ms) | 15 KiB | — |
| `/hub/math/` | 88 KiB (~450 ms) | 15 KiB | — |

**"Render-blocking resources" never appears** in the opportunities for any
template. That is why this pass did *not* switch the prerendered pages to async
CSS — the data says the blocking stylesheet is not what is costing the time.

Measured directly: the shell now eager-loads **841 KB of JS**
(`npm run perf:budgets`). That is the whole story of the table above.

### 2.4 Fix shipped this pass — shell no longer inlines the whole stylesheet

`build-deploy.js` had an `inlineFullCss()` step (added 2026-08-16) that replaced
the source's own critical-CSS block with the entire minified stylesheet, inside
every shell document. `index.html` has since grown a better version of that idea
itself: a small critical-CSS block inline plus `preload as="style"` swapped to
`rel=stylesheet` by an inline handler — the same cacheable `/styles.css` the
1,420 prerendered pages already link.

`inlineFullCss()` was deleting that and re-sending ~92 KB of CSS that is 81 %
redundant on every client-rendered route.

| | before | after |
|---|---|---|
| `deploy/index.html` raw | 166,865 B | **84,630 B** |
| `index.html` gzipped | ~37 KB | **22 KB** (budget 50 KB) |

Verified: 2,899 unit tests pass; perf budgets pass; real-render LCP held or
improved (391 ms `/`, 548 ms loan-emi, 502 ms BMI observed unthrottled); CLS
**0.000** over 3 runs with page height stable 500 ms → 10 s
(`node scripts/measure-cls.cjs`, verdict GOOD).

### 2.5 Fix shipped — the JS budget gate was dead

`scripts/perf-budgets.cjs` reported `eager-js-total: 0KB / 1600KB` on every run.
The build appends `?v=<hash>` to every script URL, and the budget resolved paths
**with the query string**, so `fs.existsSync()` rejected every entry. The one
budget that guards the resource causing this CWV problem has been silently
measuring nothing since asset versioning landed, and the 1600 KB ceiling was
never validated against a real number.

Fixed: strip `?v=…` before resolving, and set the ceiling to the measured
baseline + 7 % headroom.

```
✓ eager-js-total: 841KB / budget 900KB      (was 0KB / 1600KB)
✓ index-html (gzip): 22KB / budget 50KB
✓ styles-css: 89KB / budget 110KB
✓ fonts-total: 69KB / budget 120KB
✓ sitemap-xml: 250KB / budget 600KB
```

### 2.6 The remaining lever — NOT done, and why

Each page ships 66–115 KiB of JavaScript it never uses. Cutting that is worth
roughly 300–730 ms of simulated LCP and most of the 200–400 ms TBT, and it is
the only change that moves these numbers materially.

I did not do it unilaterally: it means changing **when ~350 KB of feature code
executes across 1,420 pages**, and a wrong split breaks calculator features
silently rather than loudly. That deserves its own pass with per-module
verification, not a side effect of an audit. Recommended shape: keep the boot
bundle critical, move genuinely optional modules (e.g. the enhancement/extra
layers) behind a post-`load` loader, and gate it with the now-working
`eager-js-total` budget.

### 2.7 I could not measure live server response time — and will not fake it

Live TTFB measured ~0.85 s, but my own floor latency to `cloudflare.com` and
`google.com/generate_204` from this machine is **0.8–1.3 s**. The site's response
is therefore indistinguishable from Google's own edge from here. Nothing in this
report shows slow origin hosting, and I am not claiming it.

What *is* verifiable and wrong: **the deployed cache headers do not match the
repo's rules.**

| path | repo `_headers` declares | live returns now |
|---|---|---|
| `/js/*` | `public, max-age=31536000, immutable` | `max-age=14400` + `cf-cache-status: REVALIDATED` |
| `/styles.css` | `public, max-age=31536000, immutable` | `max-age=14400` + `cf-cache-status: REVALIDATED` |
| HTML | `public, max-age=0, must-revalidate` | `no-cache` |

`max-age=14400` appears in neither rule, and `REVALIDATED` (not `HIT`) means
edge and browser re-check every versioned JS/CSS file — repeat visitors and
Googlebot pay origin round trips for assets that are supposed to be immutable
for a year. Either the deployed `_headers` is older than the file, or Cloudflare
Pages is not applying the `Cache-Control` rules; both are fixed by a redeploy,
and if it persists the rules must move to a Cloudflare cache rule.

---

## 3. The not-indexed pages

Coverage snapshot 2026-10-17: **631 not-indexed** = 374 "URL is unknown to
Google" + 255 "Discovered – currently not indexed" + **2 "Crawled – currently not
indexed"**.

Those 2 are:

| URL | 2026-10-09 | 2026-10-17 | **live re-inspection 2026-10-26** |
|---|---|---|---|
| `/math/mean-median-mode/` | Submitted and indexed | Crawled – not indexed | ✅ **Submitted and indexed (PASS)** |
| `/business/newsletter-sponsorship-rate/` | — | Crawled – not indexed | ❌ **Crawled – currently not indexed** |

Fresh inspection run this pass via the URL Inspection API
(`data/gsc-inspect-two-2026-10-26.json`).

**Correction to the standing audit:** `docs/NOT-INDEXED-FULL-AUDIT.md` classified
both as `WAITING_CRAWL — page clean, Google ke crawl ka intezaar`. That is the
wrong reading for this state. "Crawled – currently not indexed" means Google
*crawled and evaluated* the page and chose not to index it; waiting does not fix
it, and it usually needs a material change. It is also not stable — one of the
two went indexed → dropped → indexed again, so this state is re-evaluated.

### Why `/business/newsletter-sponsorship-rate/` is not indexed

Checked, in order, and ruled out:

| hypothesis | test | result |
|---|---|---|
| technical blocker | built HTML head | `index, follow`, self-canonical, in sitemap, 13 inbound internal links |
| thin content | visible text | 2,027 words |
| duplicate of `/business/sponsorship-rate/` | 6-gram Jaccard **after removing boilerplate** | **0.031** vs business-pair median **0.030**, p90 0.052, max 0.118 over 990 pairs → the **52nd percentile**. Not a duplicate. |

What is left, with evidence: **no demand.** In the full 28-day Search Analytics
window (2026-09-24 → 2026-10-22) this page has **zero impressions** — and so does
every other sponsorship page on the site. Google has never had a reason to serve
it, so it has never seen a click signal, so it stays crawled-but-unindexed. The
site-level constraint (631 not-indexed, 374 of which Google has never even
fetched) points the same way: crawl budget and authority, not page defects.

Two remedies, and this is the owner's call — I did **not** redirect anything:

1. **Differentiate** — give it something no sibling has (real newsletter-rate
   data, a worked example with sources, a genuinely different calculation).
   Correct when you believe the query has demand worth owning.
2. **Consolidate** — 301 it into `/business/sponsorship-rate/` and fold its
   unique paragraph in. Correct when you decide one strong URL beats two weak
   ones. The repo already has the tooling (`npm run seo:consolidation-queue`).

---

## 4. Crawl rate — the five levers

### 4.1 Fast hosting — ✅ not the bottleneck

`Content-Encoding: br`, `alt-svc: h3`, `Strict-Transport-Security: preload`,
CSP, COOP `same-origin`, `Referrer-Policy`, and `Permissions-Policy` with
microphone left open for the calculator pages. As above, I cannot measure origin
TTFB from this machine (§2.7). Only the cache-header mismatch needs action.

### 4.2 Lightweight theme — ✅ CSS is fine now, ⚠️ JS is the weight

`/styles.css` is 89 KB raw / ~22 KB on the shell, well inside budget. The
"lightweight" problem is not the theme — it is 841 KB of eager JS and the
66–115 KiB per page that no page uses (§2.5/§2.6).

### 4.3 Internal linking — ✅ healthy, one advisory gap

- `npm run seo:crawl-gate`: **616 targets, 616 covered, `fail: false`** (ran
  2026-10-26 14:41) — every target has at least one internal link.
- `npm run seo:crawl-boost` (14:40 same day): **450 links added, 224
  relevance-matched, 230 pages touched, 0 leftover targets**.
- **Gap:** `docs/LINK-EQUITY-PLAN.md` lists 270 targets with impressions but zero
  clicks at positions 11–50, each with named better sources — and there is **no
  applier**. The plan is generated and then not executed. Either apply it or stop
  regenerating it as if it were closed.

### 4.4 Page publishing frequency — ❌ real gap

Sitemap: 1,420 URLs, all with `<lastmod>`:

| lastmod | URLs |
|---|---|
| 2026-09-28 | **1,345 (94.7 %)** |
| 2026-10-24 | 75 |

The `lastmod` is honest — `data/sitemap-lastmod.json` is a content-hash ledger
and only bumps when a page's content actually changes (so no fake churn, which
is correct). That is exactly why this is a finding: **94.7 % of the site is
telling Google it has not changed in ~4 weeks.** Crawl frequency follows
freshness; a site that never changes gets crawled less.

Nothing here is technically broken — the gap is operational: there is no
publishing cadence. The weekly refresh workflow exists but is not moving page
content. Fix: commit to a schedule (e.g. refresh/enrich N pages a week from the
zero-click and link-equity queues), so `lastmod` naturally moves on a rolling
basis.

### 4.5 Backlinks — ❌ real gap, and mostly the wrong kind

| measure | value |
|---|---|
| attempts logged | 29 |
| **verified live** | **14** |
| blocked / dead | 3 / 2 |
| queue size | 151 rows (150 targets) → **121 never attempted** |
| type mix | WEB2.0 13, PROFILE 6, AWESOME-PR 2, ASSET 2, GIST 1, GITHUB 1, BITBUCKET 1, ACCOUNT 1, TOOLKIT 1, **OUTREACH 1** |

The 14 verified links are almost entirely self-published (web-2.0 posts,
profile pages, a gist). For crawl rate what matters is *referring domains you do
not control* — directories, tool roundups, forum/Reddit answers, Q&A, citations.
There is exactly **1 outreach attempt recorded**. The 150-row queue is the
right list; it is simply 81 % unexecuted. This is owner/off-page work; I cannot
do it from the repo.

---

## 5. Files changed in this pass

| file | change |
|---|---|
| [build-deploy.js](../build-deploy.js) | removed `inlineFullCss()`; shell keeps the source's critical-CSS + `preload as=style` swap |
| [scripts/ssg-pages.cjs](../scripts/ssg-pages.cjs) | per-route pages keep the external cacheable `/styles.css` |
| [scripts/perf-budgets.cjs](../scripts/perf-budgets.cjs) | repaired the dead `eager-js-total` measurement (`?v=` stripped); ceiling 1600 → 900 KB; stale comment corrected |
| [scripts/cwv-audit.cjs](../scripts/cwv-audit.cjs) | new: mobile + desktop × one URL per template, records the Lighthouse opportunities behind each number; merges rather than overwrites when run for one form factor |
| [package.json](../package.json) | added `perf:budgets`, `perf:cwv`, `perf:cwv:mobile` |

## 6. Owner actions (I cannot do these from the repo)

1. **Deploy.** The CSS fix is built and verified locally only — the live homepage
   is still 166,865 bytes with the stylesheet inlined. The same deploy is what
   makes the correct `_headers` rules live.
2. **Re-check headers after deploying**: `/styles.css` and `/js/*` should return
   `max-age=31536000, immutable` and `cf-cache-status: HIT`. If they still show
   `max-age=14400`, the rules need moving to a Cloudflare cache rule.
3. **Decide §3**: differentiate or consolidate
   `/business/newsletter-sponsorship-rate/`.
4. **Request indexing** (GSC → URL Inspection) for the pages in
   `npm run seo:indexing-list`, ~12/day.
5. **Backlinks**: work the 121 unattempted queue rows, weighted to outreach and
   directories instead of more web-2.0.
6. **Approve the JS split** (§2.6) if you want the CWV numbers actually to move.

## 7. Verification log

| check | result |
|---|---|
| `npm run test:unit` | **2,899 passed** |
| `npm run perf:budgets` | **PASS** — JS 841/900 KB, shell gzip 22/50 KB, CSS 89/110 KB, fonts 69/120 KB, sitemap 250/600 KB |
| CWV audit, 12 runs (6 templates × mobile + desktop) | 10 poor, 2 good — `/guides/tip` is good on both form factors |
| `node scripts/measure-cls.cjs` | CLS **0.000** × 3, verdict GOOD, height stable 500 ms → 10 s |
| URL Inspection API, 2 URLs, 2026-10-26 | 1 PASS (indexed), 1 NEUTRAL (crawled, not indexed) |
| live `robots.txt` | all crawlers allowed, no `crawl-delay`, correct sitemap |
