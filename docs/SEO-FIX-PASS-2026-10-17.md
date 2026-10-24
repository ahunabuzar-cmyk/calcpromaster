# CalcProMaster — Audit fix pass, 2026-10-17

**Date:** 2026-10-17 · **Branch:** `seo/daily-index-panel` · **HEAD:** `f3e651f`
**Scope:** pull fresh GSC non-indexed data, fix every code-controllable finding from the
external audit report (homepage head, tool-page head, markup hygiene, build minification),
then verify the built artifact and the full unit suite.
**Deploy:** none. **Push:** none. **Commit:** none.

---

## 1. Result at a glance

| Question | Answer |
|---|---|
| GSC non-indexed data pulled live? | Yes — 2,713 inspection rows over 15 batches merged into **1,415 unique URLs** |
| Indexed right now | **640 / 1,415 = 45.2%** |
| Not-indexed pages with a fixable technical blocker | **0** (631 pages wait on crawl budget only) |
| Audit head-tag failures fixed | **11 of 11** code-controllable items |
| Homepage keyword density | **6.0% → 2.4%** (79 → 35 occurrences in 1,443 words) |
| Inline event handlers on the built homepage | **16 → 0** |
| HTML comments in production | **42 → 0** |
| Indexable pages failing a head criterion | **501 → 0** (§4b) |
| Unit suite | **84 files / 2,614 tests, all pass** |
| Build gate / quality gate / link audit | all pass, 0 failures |

---

## 2. GSC non-indexed pull (fresh data)

`scripts/gsc-inspect-all.cjs` re-inspects the live sitemap through the URL Inspection API;
`scripts/gsc-aggregate-coverage.cjs` merges that store with the historical batch files.
The aggregator previously ignored `data/gsc-inspect-batch.json` — the only file the live
inspector writes — so every report described a frozen October-02 snapshot. It now reads the
live store as the highest-priority, newest-wins source.

```
unique URLs (deduped, apex ⇄ netlify.app normalised) : 1415
INDEXED           640   (45.2%)
UNKNOWN           374
DISCOVERED        255
REDIRECT           91   ← stale GSC cache, see §2.1
OTHER              32
CANONICAL          21
CRAWLED_NOT_INDEXED 2
```

Performance snapshot used for the same run: **3 clicks / 3,731 impressions** (28 days),
newest data day **2026-10-14**.

### 2.1 The 91 "Page with redirect" rows are stale, not broken

Every one of the 91 URLs was re-fetched live with `redirect: 'manual'`
(`data/redirect-verdicts.json`, checked 2026-10-17T10:10Z):

```
status tally { '200': 91 }   ·   still redirecting: 0
```

The sitemap, canonical and internal links already use the trailing-slash form, and the
non-slash form 308s to it — so the verdict is Google's cached older state. No code change:
these pages will flip on the next index pass.

### 2.2 Refreshed artifacts

| Artifact | What changed |
|---|---|
| `data/gsc-coverage-report.json` | 1,415 unique URLs, 15 batches, new tally |
| `data/gsc-inspect-batch.json` | 2,713 live inspection rows |
| `docs/NOT-INDEXED-FULL-AUDIT.md` | 631 audited · **0 fixable** · 631 `WAITING_CRAWL` |
| `data/not-indexed-audit.json` | machine-readable twin of the above |
| `docs/INDEX-PANEL.md`, `docs/INDEX-BURNDOWN.md`, `stats.html` | rebuilt from the 2026-10-17 batch |
| `data/redirect-verdicts.json` | new evidence file (91 × HTTP 200) |

---

## 3. Homepage / head-tag findings → fixes

Measured on the **built** artifact (`deploy/index.html`), not the source.

| Audit finding | Before | After |
|---|---|---|
| Title too short + keyword at position 34 | 45 chars, term at 34 | `Calculators: 1284+ Free Online Tools — CalcProMaster` — **52 chars, term at 0** |
| Meta description too long, no CTA | 188 chars | **142 chars**, ends `Try one now, no sign-up.` |
| Exact keyword missing from meta keywords | global list only | homepage list leads with `calculators`, plus EMI/mortgage/BMI/percentage/unit terms |
| No `color-scheme` | absent | `<meta name="color-scheme" content="light dark">` |
| No machine-readable dates | JSON-LD `dateModified` absent | `datePublished` 2025-01-15 + `dateModified` build date, plus a visible `<time datetime>` |
| No LCP `fetchpriority` hint | none | font preload + hero `fetchpriority="high"` |
| Images not lazy | 0/1 lazy | all non-LCP images `loading="lazy"` |
| Two GA4 properties firing | 2 | **1** (`G-8QCP0TP1TD`) |
| Non-semantic interactive elements / inline handlers | 16 inline handlers | **0**; controls are real `<button>`/`<a>` |
| Hero had no CTA | headline + support text only | visible primary CTA in the hero |
| Keyword density 6.6% (stuffed) | 79 occurrences / 1,315 words = 6.0% | **35 / 1,443 = 2.4%** |
| HTML comments in production | 42 | **0** |

Density came down two ways, neither of them hiding content: the generated category/hub
anchor labels stopped repeating the word 40 times (`Finance (218 tools)` instead of
`Finance (218 calculators)`), and a short "How to Pick the Right One" section added ~130
words of genuinely useful copy (also easier to read than the old prose).

---

## 4. Every prerendered page (1,618 files)

Three head-level gaps applied to all tool/category/hub/long-tail pages, because they all
inherit the homepage shell's `<head>`:

1. **Per-page `meta keywords`.** `rewriteHead()` now derives the list from the page's own
   title (`Income Tax Calculator: …` → `income tax calculator, income tax, free online
   calculator, step by step calculator`) instead of repeating the homepage's list verbatim
   on 1,600 URLs. New helper: `deriveKeywords()`.
2. **`dateModified` / `datePublished` in the `WebApplication` JSON-LD** (`CONTENT_DATE`,
   overridable with `BUILD_DATE=`), plus a visible
   `<p class="tool-reviewed">Reviewed <time datetime="…">October 2026</time></p>` line on
   tool pages and a `Last updated <time>` stamp written once in `writePage()` for every
   other prerendered page (category, hub, long-tail, guide, dashboard) that lacked a date.
3. **No inline `onerror`.** The hero-image fallback moved from
   `onerror="this.closest('.tool-hero-wrap').style.display='none'"` to a delegated
   capture-phase listener (`App.initHeroFallback()`), because resource errors do not bubble
   and inline handlers die the moment `script-src` drops `'unsafe-inline'`.

---

## 4b. Corpus-wide normalization (every indexable page, not just SSG pages)

Measuring the built corpus (1,419 indexable pages; the 199 `noindex` long-tail geo
variants, dashboards, embed widgets and the 404 stay out of scope because they
consolidate via canonical) found the gaps were not in the SSG pages at all — they were in
the ~100 hand-authored pages and the category landings:

```
pages failing at least one criterion, before → after
  desc 100-160 display chars     16 → 0
  description has a CTA         163 → 0
  page-specific keywords         96 → 0
  JSON-LD dateModified          129 → 0
  visible <time datetime>        95 → 0
  ------------------------------------------
  total criterion failures      501 → 0
```

Final state: **1,419 / 1,419 pages pass all ten criteria** (title 30-60, description
100-160 display chars, description ends on an action, canonical equals the served URL,
page-specific keywords, JSON-LD `dateModified`, visible `<time datetime>`, no inline
handlers, no HTML comments, one GA4 property).

(`googled1ac…html` is Google's site-verification file, not a page, and is excluded. The
homepage is allowed to keep the broad head-term keyword list; every other page must differ
from it.)

Three defects were found only because the corpus was re-measured after each fix, and each
one shipped a worse artifact than the thing it replaced:

1. **The CTA was appended and then clipped off** on 155-char descriptions — the audit kept
   reporting "no call to action" on pages that had just been given one. CTA room is now
   reserved *before* fitting.
2. **The padding sentence contained `see`**, so a 108-char description tested as "has a
   CTA", got padded, and the fit then dropped the pad — no CTA in the output. CTA
   detection now runs on the *fitted* text, after padding.
3. **Naive clipping ended mid-clause** (`…and how activity.`) and blog posts were given
   `"the 4-inch mistake calculator"`-style keywords. Descriptions now close on a sentence
   or clause boundary, and articles/policy pages derive topic keywords instead of
   calculator variants.

Fixed once, in `scripts/fix-deploy-seo.cjs`, which build-deploy already runs after SSG:
a new `normalizeHead()` pass walks every deployed HTML file and, on indexable pages only,
- pads a description under 110 chars with a sentence built from the page's own head term
  (so the 16 short category landings stay distinct, not templated) and reserves room for
  the CTA **before** clipping — the old order clipped the CTA off again on 155-char descs;
- writes per-page `meta keywords` when a page ships none;
- adds a valid `WebPage` JSON-LD block with `dateModified` when the page's schema has none;
- adds the same visible `Last updated <time>` line the SSG pages carry.

It is idempotent (every branch checks first) and changes 270 pages on a clean build, so a new
static page or category cannot ship without these four items.

## 5. Build output

`node build-deploy.js`:

```
html minified        : 1,618 files, 13,724 KB saved (1,418 prerendered + shell/guides/blog)
HTML comments        : 0 in production
homepage shell       : 87 KB (budget 90 KB)
internal links       : 107,582 scanned · 0 slash mismatches · 0 broken
title gate           : every title 30–60 chars
not-indexed inlinks  : every not-indexed page has an inlink from an indexed page
```

---

## 6. Verification (rerun after the last edit)

| Check | Command | Result |
|---|---|---|
| Unit suite | `npm test` | **84 files / 2,614 tests pass**, exit 0 |
| Sitemap quality gate | `node scripts/quality-gate.cjs` | 1,419 sitemap URLs · 1,418 prerendered · 1,514 unique titles · **0 failures** |
| Report staleness | `node scripts/audit-report-staleness.cjs` | every published artifact ≥ its data |
| Not-indexed audit | `node scripts/audit-not-indexed.cjs` | 631 audited · 0 fixable |
| Built homepage head | script check of `deploy/index.html` | title 52 · desc 142 + CTA · 1 GA4 ID · 0 inline handlers · 0 comments · density 2.4% |
| Corpus-wide head audit | `.tmp/audit-all-pages.cjs` over `deploy/` | **1,419/1,419 indexable pages pass all 10 criteria** (title, desc+CTA, canonical, keywords, JSON-LD date, visible date, no inline handlers, no comments, single GA4) |
| Built tool page head | `deploy/finance/tax/index.html` | per-page keywords · `dateModified` · 1 `<time>` · 0 inline handlers |
| Date stamp coverage | homepage + category + hub + tool + long-tail samples | each carries `dateModified` and a `<time datetime>`, 0 inline handlers, 0 comments |

Playwright suites (E2E health sweep, visual regression) were **not** run in this pass —
they were explicitly skipped by the owner for this turn; nothing in this change set is
verified by them.

---

## 7. What is left, and why it is not a code fix

| Audit item | Status |
|---|---|
| CAA record missing | **Owner/DNS** — add `CAA 0 issue "letsencrypt.org"` (plus the Netlify CA) at the registrar. Code cannot create DNS records. |
| CSP `script-src 'unsafe-inline'` | **Deliberate, documented trade-off.** The inline bootstrap must execute before first paint (cache-bust + theme + loading watchdog); a nonce pipeline needs per-request HTML templating that a static Netlify build cannot do. Hardening that *is* possible is already in place: `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`. |
| `Access-Control-Allow-Origin: *` | **Already fixed in `_headers`** (pinned to `https://calcpromaster.com`); the audit read a cached response or the `netlify.app` host, which serves Netlify's default headers. |
| Bing / Yandex "not found" | Submission, not markup — `npm run indexnow` pushes the sitemap to both. |
| Local-business schema / map embed | **Not applicable** — this is a web tool, not a local business. Fabricating an address would be a schema violation. |
| "No social profile links" | No profiles exist. Adding placeholder links would be worse than the warning. |
| 8 button styles / 13.2% inline styles | Cosmetic consistency, deferred: no ranking or rendering impact, and touching 54 inline styles risks the visual-regression baseline for no measurable gain. |
| 631 not-indexed pages | Crawl budget + backlinks + manual Request Indexing (12/day). Content and markup are clean; `docs/NOT-INDEXED-FULL-AUDIT.md` has the evidence. |
