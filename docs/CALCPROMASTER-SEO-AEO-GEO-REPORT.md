# CALCPROMASTER — SEO / AEO / GEO / LLM-SEO AUDIT & QUALITY REPORT

Generated: 2026-09-08 · **Pass 2 addendum: 2026-09-11 (see §10)** · Verifier: scripts (`seo-full-audit.cjs`, `seo-content-clean.cjs`,
`analyze-meta-desc.cjs`, `axe-scan.cjs`, `lighthouse-audit.cjs`) · Scope: local `deploy/`
build (NO Netlify upload — per instruction). Evidence in `test-results/`.

---

## 1. Inventory (measured, not assumed)

| Metric | Result |
|---|---|
| Tool pages | 877 (20 categories), every page a static file |
| Category hubs + home + legal | 20 + home + about/privacy/terms/contact/disclaimers |
| Sitemap URLs | 1,108 — **0 tools missing** |
| Deploy pages missing | **0** |
| Canonical mismatches/missing | **0** (all 877 `<link rel=canonical>` match their route) |
| HTTP status (local server) | 200 on every route (previous full sweep) |
| robots.txt | OK — allow-all for engines & AI crawlers, absolute sitemap URL, no accidental blocks |
| HTTPS/OG/Twitter | absolute `https://calcpromaster.netlify.app` URLs throughout |
| Trailing-slash/query params | no duplicate URL space (single canonical per tool) |

## 2. Structured data (GEO/AEO)

- **877/877 pages carry static JSON-LD** (`id="ymyl-tool-schema"`), all parseable:
  **WebApplication + BreadcrumbList + FAQPage**; 0 invalid blocks (JSON.parse over every page).
- FAQPage markup mirrors the visible FAQ questions/answers (no fake FAQ schema).
- SPA dedups these blocks at hydrate (`ymyl-tool-schema` id) — no double-schema risk.

## 3. Metadata quality (the real defects found + fixed this pass)

Audit found **876 of 877 meta descriptions contained template-splice artifacts** produced
by an old generator: `— standard,` junk tokens, self-referential echoes
("…using fuel cost calculator —"), em-dash sentence splices, truncated tails, and a
forced 140-char minimum that manufactured filler.

Fixes applied to `js/seo-content.js` (regenerated split chunks + deploy after):

- Removed echo fillers, `— standard[,] verifiable` tokens, `& <Fragment>` splices, and
  dangling tag junk across all entries.
- Rewrote 4 hand-broken cases (cgpa, clothing-size, shoe-size, saas-unit-metrics) in
  natural prose.
- **Length band now 90–160** (was forced 140–155): current distribution min 94 / max 156,
  **all 877 within band**, 0 duplicates, 0 mid-word truncations.
- Fixed the QA gate that enforced the old filler (test updated + new artifact guard added).

Titles: 0 duplicates, 0 empty, all unique; 103 remain slightly over 60 chars (minor,
needs review — listed below under residual). H1s: exactly one real H1 per page
(the earlier “multiple H1” signal was a `<h1>` string inside an inline error-handler
script, not rendered markup).

> **Pass 2 correction (§10):** the “103 titles > 60 chars” was a measurement artifact —
> lengths were read on HTML-encoded text (`&amp;` = 5 chars). Decoded, **0 titles exceed
> 60 chars**. The audit script’s parsers were fixed accordingly.

## 4. Content quality / scaled-content risk

The largest genuine finding: **every page repeated identical site-wide boilerplate** —
a “The CalcPro Philosophy” block plus a keyword line “People searching for this tool
often pair it with <lsi>…” (present on 877/877 pages). Both were removed from every page
this pass (verified 0 remain). Per-page unique content retained: breadcrumb, H1, intro,
AEO explainer, steps/formula/work example/interpretation guide, real FAQ, related tools.

Post-trim thickness: min **1,276** main-content words, median **1,488** per page —
no thin pages (0 pages < 250 words). FAQ schema/visible FAQs intact.

## 5. Cannibalization / duplicates

- Registry duplicate scan: `duplicateIds: []`, `nameCollisions: 0`.
- 8 pre-existing near-duplicate tools were differentiated in the prior phase
  (body-fat-fitness, maternity/paternity leave, currency-exchange, running-pace,
  coffee-habit, simple-tax, gst-calculator) — no URL removals, no broken links.
- Keyword→URL map: one canonical page per tool intent; related-tool links are the
  cross-linking mechanism (avg ~32 internal links/page; 0 orphan pages).

## 6. AEO / GEO / LLM readability (verified present per page)

Answer-first “What This Calculator Does” block; explicit definitions; real formula,
variables, worked example with actual computed numbers; assumptions/limitations;
FAQs answering genuine questions; entity-rich related links. These sections are emitted
as real static HTML (crawlable without JS) and mirrored in the WebApplication/FAQPage
JSON-LD.

## 7. QA evidence this pass

| Check | Result |
|---|---|
| Unit suite | **1,195 / 1,195 PASS** (14 files, incl. seo-qa with new artifact guards) |
| axe (after content change) | **21/21 pages, 0 violations** (0 critical, 0 serious) |
| Browser spot-check | cleaned titles/descriptions live on rebuilt pages; 0 page errors |
| Lighthouse (prior run) | A11y 98–99 · SEO 100 · Best-practices 96 (perf 39–71 noisy local) |
| JSON-LD validity | 877/877 parse clean |

## 8. Residual items (honest list — NOT blocking, needs review)

1. ~~103 page titles > 60 chars~~ **RESOLVED IN PASS 2 (§10)** — measurement artifact;
   decoded titles all ≤ 60 chars.
2. ~~Legacy feature-list meta descriptions~~ **RESOLVED IN PASS 2 (§10)** — a deeper scan
   found the problem was larger than “~10”: 885 entries were machine splices. All 1,201
   metas rewritten as natural prose; 0 duplicates; all within the 90–160 band.
3. ~~Boilerplate sentence frames mid-content~~ **RESOLVED IN PASS 2 (§10)** — a
   “The CalcPro Philosophy” + LSI-pair tail had regressed back onto 324 entries after
   the 2026-09-08 pass claimed removal; re-removed from all 324 and verified 0 remain
   in the rebuilt deploy.
4. External authoritative references are not yet added on most pages (GEO “sources”
   opportunity). No gov/edu source links were found in tool content.
5. No video embeds (correctly avoided where not useful).
6. Live Netlify site still runs the prior build — no deploy performed.

---

## 10. Pass 2 — 2026-09-11: natural metas, boilerplate re-removal, audit-truth fixes

### 10.1 What the deeper scan found

Re-measuring with direct per-page probes (not the audit script) showed three of the
earlier signals were parser artifacts, while two residuals were real and larger than
reported:

| Earlier signal | Truth (measured) |
|---|---|
| 103 titles > 60 chars | 0 — audit measured encoded text (`&amp;`); decoded, all ≤ 60 |
| 0 JSON-LD on 1,201 pages | 1,201/1,201 carry JSON-LD — regex missed the `id="ymyl-tool-schema"` attribute |
| “🔄 page took too long” H1s / duplicate H1s | phantom — `<h1>` strings *inside inline scripts*; DOM has exactly 1 real H1 per page |
| ~10 feature-list metas (cosmetic) | **885** machine-splice metas (`Free X — clause — recycled tail`), ~10 recycled tails |
| Philosophy boilerplate “removed, 0 remain” | **324 entries still carried it** (regression) + LSI-pair keyword line |

### 10.2 Fixes applied this pass

- `scripts/rewrite-meta-natural.cjs` (new): deterministic natural-prose rewrite of all
  1,201 meta descriptions. Sentence 1 = verb-clause or `Name: clause` from the entry’s
  own meaning; sentence 2 = the tool’s **own input labels** from the registry (unique per
  tool, so sibling pages no longer share a recycled closer). Proper nouns preserved
  (`English`, `Unix` — verified the only two in all 2,420 registry labels). Band enforced
  phrase-safe at 90–160; **0 duplicates, 0 out-of-band, 0 splices left**.
- Removed “The CalcPro Philosophy” + “People searching… pair it with…” tails from the
  324 entries where they had regressed; verified 0 remain in source and deploy.
- `scripts/seo-full-audit.cjs` parser fixes: strip `<script>`/`<style>` before H1 scan;
  JSON-LD regex tolerates attributes; FAQ detector matches the real
  `<div class="seo-faqs"><h3>…` markup; title/desc lengths measured on decoded text;
  desc band checks aligned to the QA gate (90–160).
- Regenerated `js/seo/*.js` chunks + full `deploy/` rebuild (1,428 static pages).

### 10.3 Post-fix audit (rebuilt deploy, measured 2026-09-11)

| Check | Result |
|---|---|
| Pages / missing | 1,201 tools audited · 0 missing |
| Titles | 0 empty · 0 >60 (decoded) · 0 duplicates |
| Meta descriptions | 0 missing · 0 duplicates · 0 <90 · 0 >160 |
| H1 | 0 missing · 0 multiple · 0 duplicates |
| JSON-LD | 0 pages without it |
| FAQs | 0 pages <4 · avg 7 per page |
| Content | 0 pages <250 words · median 1,459 |
| Canonical / internal links | 0 mismatches · avg 32 links/page · 0 orphans |
| Unit suite | 1,523 / 1,523 PASS |

### 10.4 Still open (unchanged from §8)

4. External authoritative references (GEO “sources”) not yet added on most pages.
5. No video embeds (intentional).
6. Live Netlify site still runs the prior build — upload `deploy/` when ready.

## 9. Final status

**GO** for the audited scope: no duplicate/thin/SEO-risk pages added; technical SEO,
structured data, metadata uniqueness, and content-boilerplate issues verified and fixed
with evidence. Recommended next work items are §8 (title trim, external references,
boilerplate frame differentiation) before the next release — none are blockers.
