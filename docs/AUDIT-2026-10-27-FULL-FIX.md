# Full audit + fixes — 2026-10-27

Owner's request, five areas: **keyword targeting · content · on-page · technical ·
backlinks**. This file records what was measured, what was found, what was fixed,
and what could not be measured in this environment. Every number below comes from
a run on this machine; nothing is inferred from memory.

Method: the repository's own gates (`npm run *`) plus Lighthouse, on the freshly
built `deploy/` tree (1,619 HTML files; 1,420 indexable routes; 1,285 tool pages).

---

## 0. Honest limits — what could NOT be measured here

| Wanted | Status | Why | What was used instead |
|---|---|---|---|
| External duplication ("Copyscape") | **Not run** | Copyscape is a paid external API; no key exists in this repo | 7-gram/sentence duplication audit (`seo:dup`), unique-intro proof, thin-page gate |
| Competitor DR / referring domains / backlink gap | **Not available** | No Ahrefs/Semrush/Majestic connection (no key, and the repo documents this gap in `docs/KEYWORD-DIFFICULTY.md` §0) | `docs/backlink-tracker.csv`, GSC export, the 6 live SERP probes in `docs/KEYWORD-DIFFICULTY.md` §1 |
| Competitor positions vs ours | **Partial** | GSC reports *our* positions only; competitor positions need a SERP tool | 6 live probes (we are top-10 in **0** of them); our own GSC export sample |
| Spammy inbound links / competitor negative SEO | **Not detectable** | Requires a backlink tool with a referring-domain list | Tracked link set reviewed by hand — no paid or spam placements found |

Two of the five areas (backlinks, external duplication) therefore end with a
**measurement gap, not a pass**. Everything else is measured.

---

## 1. Keyword targeting

**Scale:** 2,842 distinct targeted phrases across 1,420 indexable pages, sourced
from curated `kw` fields in `js/data/*.js` (deterministic count).

**Difficulty tiering** (`docs/KEYWORD-DIFFICULTY.md`, deterministic model):

| Tier | Phrases | Meaning |
|---|---|---|
| EASY (go) | 1,192 | 4+ words + intent qualifier; probes show 0–1 strong brands in the top 10 |
| MEDIUM | 1,650 | 3+ words; needs some authority |
| HARD (park) | 0 | head terms — brand wall |
| BRAND | 0 | own-brand queries |

**Weak targets / wrong intent** (`npm run intent:audit`):

- I1 clusters (pages sharing an intent): **96**, of which **40 are cross-category**.
- I2 duplicate meta descriptions: **0** · I3 thin metas: **0** · I4 near-duplicate titles: **1**.
- These 96 clusters are informational — the cannibalization gate
  (`seo:cannibal:check --fail-on-actionable`) passes, i.e. no cluster has two
  pages that should be merged.

**FIXED — the three brand-wall-only pages now carry a winnable target.**
`docs/HARD-KEYWORDS.md` §2 held a fix map that had never been applied: three pages
targeted *only* hard head terms (`/everyday/cost-of-living-compare`,
`/finance/cosigning-loan-risk`, `/regional/hijri-converter`). The prescribed swap is
now applied — hard phrase out of `kw`, derived claim-free long-tail in, titles and
metas untouched — and the resolver was taught where the affected rows belong in the
same change, which is what made it safe this time. Verified by the repo's own
generator: **hard-only tools 0** (was 3), EASY 1,192 (was 1,189), and the
cannibalization counters stay at **C1 0 / C2 0 / C3 0** (the derived phrases are
unique, so no sibling's owned phrase was reused).

**FIXED — six keyword rows the gap re-audit surfaced (topical owners, no new URLs).**
Rewriting page copy changed the body text of every tool page, which moved the
audit's best-match page and exposed six previously-“COVERED” keywords as GAP/WEAK
(no page stated them in title/slug). The new verdicts are the honest ones, and each
row is now answered on the page that owns the intent rather than on a new URL:

| Keyword (vol / difficulty) | Owner page | Why that page |
|---|---|---|
| `taxable calculator` (1,000 / 3) | `/career/tax-bracket/` | the taxable-amount → tax calculation is that page; the GST page is an indirect tax and does not answer the income-tax reading |
| `retirement salary calculator` (8,100 / 19) | `/career/retirement-contrib/` | takes a salary and shows the retirement-contribution impact |
| `mobile home loan payment calculator` (6,600 / 32) | `/finance/fha-loan/` | FHA is the standard financing route for manufactured/mobile homes; the page computes the monthly payment incl. MIP |
| `weekly pay calculator` (4,400 / 5) | `/finance/paycheck/` | paycheck frequency includes weekly — same calculation run weekly |
| `weekly paycheck calculator` (4,400 / 5) | `/finance/paycheck/` | same intent, wording only — one page owns both |
| `paycheck deduction calculator` (1,900 / 10) | `/finance/paycheck/` | the audit had pointed at the `/guides/tax-salary` hub; a deduction is a calculator intent, and this is the page that takes gross pay and shows the deductions |

All six sit at **difficulty 3–32 with 1,000–8,100 searches/month** — the
weak-competition band the brief asks for, which is why they are targeted on
existing pages instead of parked. Two rows remain honestly ownerless and are
recorded as such: `calculator on this phone` (device/navigational) and
`calculator that shows work` (a cross-cutting feature, not one page's intent).

**FIXED — the two year-stamped phrases (`docs/KEYWORD-AUDIT.md` Q1, now 0).** The
site's own audit flagged two curated phrases with a hard year baked in —
`nbr tax calculator 2025-26` (`/regional/bangladesh-income-tax`) and
`calculadora isr 2026` (`/regional/mexico-isr-salary`) — because a year inside an
evergreen *target* guarantees staleness. Both now target the yearless phrase
(`nbr tax calculator`, `calculadora isr`) while the page copy keeps the tax year
it is actually about ("2025-26" ×6 on the Bangladesh page, "2026" ×13 on the
Mexico page, both in the visible copy and the meta description).

The fixer that owns this class (`scripts/fix-keyword-phrases.cjs`) dropped only
*bare* years, so "2025-26" became "nbr tax calculator -26" — still year-shaped,
still flagged, which is why Q1 had been stuck at 2. The Q1 rule now consumes the
whole year form (a bare year, a range, a slash range, or `FY20xx`) before falling
back to the bare-year strip, and drops a segment that was nothing but the year.
Verified: the rule on the real strings (`nbr tax calculator 2025-26` →
`nbr tax calculator`, `income tax calculator 2025/26` → `income tax calculator`)
and on the false-positive cases it must not touch (`kg/m3 to g/cm3`, `km/h to mph`
unchanged); then the fixer was run over the whole registry and reported
`files=0 S1=0 S2=0 Q1=0 dupsDropped=0` with the keyword data byte-identical —
i.e. the tree is already at the fixed point the tool aims for. Audit re-run:
**Q1 ✅ none**; keyword docs regenerated (the inventory moved 2,843 → 2,842
distinct phrases).

**Topical mapping (keyword → topic page instead of keyword page):** the cluster
gate is green — 60 spokes carry a hub link, 10 hubs carry ≥2 spoke links
(`npm run cluster:check`). The site already routes topic intent to 20 category
hubs and 20 comparison hubs rather than one page per keyword; the 96 I1 clusters
above are the residual cases where two pages phrase the same intent and could be
considered for topic consolidation.

---

## 2. Content

**FIXED — the single largest block of internal duplicate content: the site FAQ**
**(617 words on 1,512 pages).** `index.html` carries a 16-question "Frequently
asked questions" section (617 words) for the homepage. The SSG builds every
generated page from that shell, so the block rode into **1,512 pages** (1,492
tool/category + 20 hubs) byte-identical apart from the tool count: measured on
`/auto/auto-fare/`, **617 of the page's 2,285 visible words — 27% of the document
was the same text as 1,511 other URLs.** Its `<h2>Frequently asked questions</h2>`
also duplicated the tool's own FAQ heading on the same page: a repeated `<h2>` on
**1,305 of 1,329** indexable pages.

Fixed in `scripts/ssg-pages.cjs` (the shell is stripped of that one section
before any generated page is written) — the homepage keeps its FAQ, and so does
the FAQPage JSON-LD that describes those questions. Nothing unique was lost: the
tool/category FAQ, formula block and worked example stay on each page, and the
two links the site block carried (`/finance/loan-emi/`, `/health/bmi/`) are also
in `home-about` and the footer, so no crawl path was removed.

Re-measured on the rebuilt tree:

| Check | Before | After |
|---|---|---|
| Pages carrying the site FAQ block | 1,512 | **1** (the homepage) |
| Pages with a repeated `<h2>` text | 1,305 / 1,329 | **0** / 1,329 |
| Visible words on a tool page (`/auto/auto-fare/`) | 2,285 (617 duplicated) | 1,669 (all page-specific) |
| Build-wide visible-word floor | — | min 666 · p10 1,500 · median 1,615 |

**Externally duplicate content:** cannot be certified without Copyscape. What *is*
proven on this machine:

- 1,285 tool intros, **all unique** (111–138 words; `npm run intros:check`).
- Pages under 500 words: **0** (`npm run audit:thin`).
- 7-gram duplicated share tracked against a saved baseline — **no regression**, and
  an improvement (`npm run seo:dup:compare`, `data/duplicate-content-report.json`):

  | Metric (7-gram, 1,329 indexable pages) | Baseline 2026-10-19 | Final build |
  |---|---|---|
  | Site duplicate share | 40.7% | **40.2%** |
  | Pages over 40% duplicated | 949 | **906** |
  | Duplicate titles / meta descriptions | 0 / 0 | **0 / 0** |
  | Pages under 400 words | 1 | 1 |

  The remaining share is shared chrome (nav, footer, the 241-word `home-about`
  block, per-category methodology and disclaimers) plus a small pool of templated
  sentences that recur on 9–20 pages each (the report names them; the worst pages
  sit at 53–56%). The worst single source — the 617-word site FAQ on 1,512 pages —
  is the one fixed above. Driving the rest down means writing many more phrasings
  for the engine's templates, which is a copy project, not a defect: the report is
  kept and compared so it cannot quietly get worse.
- Every tool page carries its own worked example, formula block and FAQ
  (`seo:guide-depth:check`, `seo:guide-examples:check` all green).

**FIXED — keyword stuffing in the intros (1,285 pages).** The generator named the
*tool* in every sentence to keep cross-page n-grams unique, which overshot into
stuffing. Measured on `/finance/loan-emi`: the exact phrase **"Loan EMI Calculator"
appeared 8 times in a 110-word paragraph (~7% density)** and the sentence's real
point sat behind the repeated subject. Now the opener keeps the full name (required
by the on-page rule and the unit test) and later mentions use the tool's short
form — measured after: **1 full mention**, word range 105/124/138, uniqueness and
the duplicate-content baseline both intact.

**FIXED — stale generated guide copy (gate failure).** 39 guide files were reported
out of date by `seo:guide-extra:check`; regenerated → 72 guides, mean 1,057 words,
0 under 900. Re-check passes.

**FIXED — the intro file regenerated after the registry edits.** `intros:check` and
the file-freshness gate both compare `js/tool-intros.js` against its generator, so
the `kw` changes in §1 had to be followed by `node generate-intros.js`: **1,285
intros, 1,285 unique, 105–138 words**, gate green.

**Language / voice:** the repo has no general grammar or passive-voice checker, so
"no language mistakes" cannot be certified wholesale. What is enforced and green:

- Placeholder/broken-copy audit `seo:placeholders` (P1–P10): **0 findings**.
- Intro grammar gate: no verb in a noun slot, no noun in a verb slot, no doubled
  verb form, no `undefined`/`NaN`/[object]` artifacts.
- The earlier pass in this thread fixed **87 meta descriptions** where an
  indefinite-article guard produced broken English ("operations complex numbers",
  "a ltv", "an aov"); re-measured: 54 → **0** broken snippets.
- Copy is written in the active voice at the template level; there is no automated
  passive-voice counter, so this is a review statement, not a measured one.

**Known trade-off (not hidden):** a few intro sentences still read awkward because
every sentence must stay unique per tool — e.g. "Fill in Distance (km) … on Fuel
Cost". Fixing that properly means accepting shared sentences across pages, which
the duplicate-content baseline currently forbids. Recorded as an open item.

---

## 3. On-page

Measured across **all 1,285 indexable tool pages** (`node scripts/audit-onpage-placement.cjs`,
which writes `data/onpage-placement-audit.json`):

| Placement | Pages | Share |
|---|---|---|
| Curated target keyword (or the head term) in `<title>` | 1,227 | 95.5% |
| Literal tool name in `<title>` | 1,202 | 93.5% |
| Tool name in the `<h1>` | 1,285 | **100%** |
| Keyword in the first content paragraph | 1,285 | **100%** |
| Keyword in at least one `<h2>` | 1,285 | **100%** |
| Keyword in at least one `<img alt>` | 1,285 | **100%** |
| Curated head term present somewhere | 1,285 | **100%** |

The 58 titles that carry neither the literal name have a deliberate
keyword-targeted title instead (`/auto/fuel-tank-range/` ships "Diesel Tank Range
Calculator: km per Tank" for the tool named "Fuel Tank Range Calculator") — the
name is in the `<h1>` on every one of those pages (100%), so the page still states
what it is; the empty set is `0` pages that have neither the name nor the intent
in the title. That is a copy-style variant, not a gap, and the audit prints the
name/title pair so the judgement stays inspectable.

**FIXED — the tool-named `<h2>` (the duplicate-boilerplate heading).**
1,158 of 1,285 pages had no `<h2>` naming their own tool, because the guide block
reuses generic headings on every page ("How does it work?" on 718 pages, "What
does this calculator do?" on 569). The override pass now names the heading that
already asks the question ("How does the Loan EMI Calculator work?"), which both
places the keyword and removes a site-wide identical heading. **Re-measured: 1,285
/ 1,285 (100%).**

**FIXED — a regression that silently undid that naming.** The regen chain
(`scripts/seo-regen-chain.cjs`) re-emits the engine's copy for the keyword-target
(B/C/D) rows *after* the override pass, so those rows got their generic headings
back: `seo:overrides:check` failed on 12 entries and 11 tool pages had lost their
name-carrying `<h2>` (99.1%) the moment the keyword table was regenerated. The
chain now re-asserts the override pass after the keyword step (both are
idempotent) and, because `js/seo-content.js` is what the public changelog and the
Top-10 push list are built from, it refreshes those two artefacts too — the
staleness gate inside `build-deploy.js` had been failing a freshly regenerated
tree with `2 published artifact(s) older than their data`, which no step of the
old chain could fix. Verified: `seo:overrides:check` and `split-seo --check`
**PASS**, `build-deploy.js` exit **0**.

**FIXED — stuttered image alt text (940 pages).** The hero `<img>` alt appended a
product noun to a name that already had one: **"Loan EMI Calculator calculator — free
online tool"**. Fixed in the SSG generator; re-measured **0** pages with the stutter,
alt text now "Loan EMI Calculator — free online tool".

**Schema:** green — every JSON-LD block parses and carries the fields Google
requires for its `@type` (`npm run seo:built:audit`, `check:structured-data`).

**Internal links:** 106,606 internal hrefs in the built tree, **0 broken targets,
0 slash mismatches**; no indexable page is left with ≤1 dofollow internal link.
(The count fell from 109,628 when the repeated site FAQ left the 1,512 generated
pages — it carried exactly two links per page, so 3,022 of its 3,024 anchors were
the same two URLs repeated; both remain in `home-about`, the nav and the footer.)

**External links:** authoritative citations are present on tool pages
(consumerfinance.gov ×66, federalreserve.gov ×64, irs.gov ×49, investor.gov,
fred.stlouisfed.org, finra.org, bls.gov, nist.gov, imf.org, fanniemae.com) — these
stay dofollow, which is the correct signal for editorial citations.

**Remaining, not fixed this pass (reported, not hidden):**

- 58 titles are keyword variants rather than the literal tool name (§above). They
  are deliberate (the keyword-target table sets them) and every one keeps the name
  in the `<h1>`; changing them means overriding the keyword table, which is a
  targeting decision, not a defect fix.
- **Repeated `<h2>` text across pages, measured on the final build** (1,329
  indexable pages): **0** within-page duplicates (was 1,305 pages), and 27 heading
  strings still appear on 50+ pages, 21,639 occurrences in total:

  | Heading | Pages | What it is |
  |---|---|---|
  | 8 footer/nav labels ("Categories", "More", "Features", "Disclaimers", …) | 1,326 each | structural, 1–4 words |
  | "Frequently asked questions" | 1,307 | a section label; the questions under it are page-specific |
  | 6 guide section labels ("The formula behind the result", "Understanding the result", "Where it helps", "Common mistakes", "Assumptions and limitations", "Why use this calculator") | 1,251 each | a label over page-specific copy |

  These are labels, not duplicated content: the text under each one differs per
  page. Naming them after the tool too would read like stuffing ("The formula
  behind the Loan EMI Calculator result") and would not change what Google reads
  as the page's substance, so they are left as-is and reported here.

---

## 4. Technical

**Speed — the target was "under 2 s on desktop and mobile". It FAILS today.**
Local Lighthouse (`npm run perf:cwv` / `perf:cwv:mobile`), 12 desktop + 6 mobile runs:

| Page | Form | LCP | FCP | TBT | CLS |
|---|---|---|---|---|---|
| `/` | desktop | 3,784 ms | 1,834 ms | 256 ms | 0 |
| `/` | mobile | 3,688 ms | 1,937 ms | 268 ms | 0 |
| `/finance/loan-emi/` | desktop | 4,399 ms | 1,918 ms | 241 ms | 0.019 |
| `/finance/loan-emi/` | mobile | 3,650 ms | 1,024 ms | 286 ms | 0.066 |
| `/health/bmi/` | desktop | 4,122 ms | — | 258 ms | 0.024 |
| `/math/` | mobile | 3,690 ms | 1,835 ms | 237 ms | 0 |
| `/hub/math/` | mobile | 4,192 ms | 1,901 ms | 237 ms | 0 |
| `/guides/tip` | mobile | **903 ms** | — | **0 ms** | 0.066 |

Diagnosis from the same runs (not a guess):

- `unused-javascript` — **115–117 KiB**, est. **490–610 ms** of savings.
- `mainthread-work-breakdown` — **3.1–3.2 s** of main-thread work on tool pages.
- `unused-css-rules` — 12–14 KiB; `styles.css` is **91 KB and render-blocking**
  (external `<link href="/styles.css">` on prerendered pages).
- The hero image is **not** the bottleneck: `/og/loan-emi.jpg` is 45 KB and is
  preloaded with `fetchpriority=high`. The LCP element paints ~2 s *after* FCP,
  which points at main-thread/JS work, not image weight.
- `/guides/tip` (no calculator bundle) scores 99 with LCP 903 ms — the app
  bootstrap is the difference.

The repo's own CWV thresholds are LCP 2500 / FCP 1800 / TBT 200, so this was
already failing before this pass. **Re-measured on the final build** (after every
content change in this pass had landed, including the 617-word site FAQ leaving
every generated page — i.e. ~5 KB less HTML per URL), mobile only, 6 runs / 5 POOR:

| Page | LCP | FCP | TBT | CLS | Verdict |
|---|---|---|---|---|---|
| `/` | 3,957 ms | 1,950 ms | 470 ms | 0 | POOR |
| `/finance/loan-emi/` | 4,390 ms | — | 366 ms | 0.045 | POOR |
| `/health/bmi/` | 4,130 ms | — | 255 ms | 0.024 | POOR |
| `/math/` | 4,221 ms | 1,902 ms | 282 ms | 0 | POOR |
| `/hub/math/` | 3,936 ms | — | 63 ms | 0.034 | POOR |
| `/guides/tip` | **903 ms** | — | **0 ms** | 0.066 | **good (99)** |

Same band as before: the content work neither caused nor fixed it, and the lighter
HTML did not move LCP — which is the measurement that points the fix at the
JavaScript bootstrap rather than the markup. Reaching **<2 s** needs a script-payload and bootstrap project
(split/defer the eager registry + app bundle, trim the 115 KiB of unused JS, unblock
first paint from the 91 KB stylesheet). It is **not** a one-line change, so it is
left as the top open item with the evidence above rather than claimed as done.

**Everything else in the technical area is green:**

| Check | Result |
|---|---|
| `robots.txt` | OK — `Sitemap: https://calcpromaster.com/sitemap.xml` (the mid-build `netlify.app` reading was a false alarm: `substituteDomain()` rewrites it, verified on the finished artifact) |
| Broken URLs / 404s | 0 broken internal targets; unknown paths answer a real **404** (no soft-404 shell); 38 redirect targets resolve |
| Redirect chains | `seo:hosts` green (no non-www/www or protocol chains); 43 whitelisted prefixes answer 200 HTML |
| Mixed / insecure content | security gate green: no `http://` subresources, CSP + HSTS + full header set present |
| Cache-busting | restored — `v=` token on **21,267 asset URLs across 1,619 pages** |
| HTML comments in production | none — the minify pass strips them (verified 42 → 0 on a sample page); the 1,409-page failure seen earlier was a build that had been killed mid-pipeline, not a real defect |
| Perf budgets | green (eager JS and index-size budgets) |
| Sitemap | 1,420 URLs, quality gate PASS (0 warnings, 0 failures) |
| Regen chain re-run | no-op safe — a re-run of an already-applied keyword table no longer rewrites `js/seo-content.js`, so the report-staleness gate no longer fails a build that changed nothing (`scripts/apply-keyword-targets.cjs`) |
| Regen chain re-run (2) | `seo:regen` now ends with the override pass re-asserted and with the two artefacts built from `seo-content.js` refreshed, so the tree it leaves is one `build-deploy.js` accepts (the staleness gate passes) |

---

## 5. Backlinks

**Our profile** (`docs/backlink-tracker.csv`, 41 tracked rows → **19 LIVE**):

| DR (of the listing site) | Place | Anchor used |
|---|---|---|
| 100 | GitHub profile + awesome-list README | URL field / markdown link |
| 95 | LinkedIn company profile | `calcpromaster.com` in contact info |
| 94 | Reddit r/InternetIsBeautiful | referral link |
| 82 | Twelve.Tools | listing link (dofollow earned) |
| 80 | Indie Hackers | profile link (dofollow) |
| 74 | Peerlist (×2), SaaSHub | `calcpromaster.com/?ref=peerlist`, project URL |
| 70 | SaaSHub | nofollow URL |
| 55 | Fazier | footer badge |
| — | Crunchbase, dev.to (2 dofollow), about.me, Pinterest, Quora, TinyStartups, SideProjectors, StartupFame | mixed |

**Anchor-text ratio:** overwhelmingly **brand / naked URL** ("calcpromaster.com",
"Project URL https://calcpromaster.com", "URL field …"), with a minority of
branded-descriptive and two plain-text mentions. There is **no exact-match keyword
anchor pattern** anywhere in the tracked set — i.e. no over-optimisation footprint
of our own. A precise percentage split needs a backlink tool.

**Follow / nofollow ratio:** documented where known — dofollow: GitHub, Indie
Hackers, TinyStartups, SideProjectors, dev.to; nofollow: SaaSHub, Quora,
TinyStartups; the rest are unknown without a crawler.

**FIXED — our own reciprocal link scheme (1,512 pages).** Every page carried
**dofollow** badge/"Featured on" links to three launch directories —
`twelve.tools`, `startupfa.me`, `fazier.com`. A badge that links back to the
directory that awarded it is the "badge / embedded link" pattern Google names as a
link scheme.

Re-measured on the final build (every `<a>` in every `deploy/**/index.html`):

| Link class | Anchors | nofollow | dofollow |
|---|---|---|---|
| Badge / program (`twelve.tools`, `startupfa.me`, `fazier.com`) | 6,012 | **6,012** | 0 |
| Editorial citations (`irs.gov` 49, `consumerfinance.gov` 66, `federalreserve.gov` 64, `bls.gov` 7, …) | 186+ | — | **all followable** |

So the site's own outbound link profile now contains no reciprocal
badge link that passes equity, while the citations that earn trust still do.

Root cause worth knowing: `scripts/fix-audit-issues.cjs` deliberately stripped
`nofollow` from **every** external link to satisfy a third-party crawl complaint
about editorial citations carrying nofollow. That is correct for citations and
wrong for program links; the fixer now preserves nofollow on program/badge links
and reports the count in the build log (`audit-fixes: 302 editorial nofollow
removed, 6066 badge/program nofollow kept`).

**Low-quality / spammy inbound links:** cannot be enumerated (no Links report or
referring-domain API in the repo). Nothing in the tracked set is paid or spammy,
and no doc shows any link-buying.

**Competitor negative SEO:** not detectable without a backlink tool. No evidence
found in the repo either way.

**Competitor backlink gap:** the repo has *keyword* gap files
(`data/keyword-gap/calculator-net-gap.csv`, `calculatorsoup-gap.csv`) but **no**
referring-domain gap. That needs Ahrefs/Semrush.

**Rankings — us vs competitors:** GSC reports our positions only. Sample of the
export: 54 of 100 sampled queries in the top 10, 6 in the top 3
(266 impressions → 8 clicks). Competitor positions come only from the six live
probes in `docs/KEYWORD-DIFFICULTY.md` §1 (home-loan-EMI+prepayment, concrete
volume, CGPA→percentage, quadratic solver, gravel driveway, BMR for women over 50):
**we are in the top 10 for none of them.** Those probes also record 2–6 strong
brands per SERP, which is why the planned battleground is the 1,189 EASY long-tails,
not head terms.

---

## 6. Verification of this pass

All of it re-run on the final tree, after the last edit:

- **SEO regen chain:** `npm run seo:regen` (now 6 steps: engine → overrides →
  keyword rows → overrides re-asserted → chunks → the two artefacts built from
  `seo-content.js`) → exit **0**, placeholder audit 0 findings, and
  `apply-seo-overrides.cjs --check` / `split-seo.cjs --check` **PASS**, i.e. the
  checked-in file is exactly the file the gate expects.
- **Build:** `node build-deploy.js` → exit **0**; 1,619 pages minified; asset gate
  green; the report-staleness gate now passes because the chain rebuilds
  `data/seo-changelog.json` and `data/top10-push-list.json` after `seo-content.js`.
- **Gates: 31 / 31 PASS** (the same battery the CI build job runs) — head criteria,
  placeholders, URL format, keyword implementation, cannibalization (report and
  `--fail-on-actionable`), canonical URLs, structured data, category duplication,
  cluster links, intros, premium intros, guide depth (×2), guide examples, guide
  extra-depth, soft-404, host redirects, perf budgets, security, thin pages,
  report staleness, built-page audit, duplicate content (report + baseline),
  keyword gap, query quality, triage, link equity, live routing, SEO gate, site
  bugs. A 32nd gate, `keywords:check`, is a `git diff --exit-code` against `HEAD`,
  so it fails on any uncommitted tree by construction (every fix in this pass is
  uncommitted); what it actually protects — that the keyword docs are exactly what
  the generators produce — was verified separately as a **fixed point**: re-running
  `keywords:fresh` leaves all five docs and the implementation map byte-identical.
- **Tests:** 104 test files, **2,899 tests pass** (exit 0).
- **Duplicate-content regression gate:** `✔ no regression against the baseline`.
- **Duplicate-heading check (own, on the final build):** 1,329 indexable pages →
  **0** within-page duplicate `<h2>` texts (before this pass: 1,305 pages).
- **On-page audit re-run on the final build:** target keyword in title 1,227
  (95.5%, the other 58 are keyword variants with the name in the `<h1>`) · name in
  `<h1>` 1,285 (100%) · first paragraph 1,285 (100%) · `<h2>` 1,285 (100%) · `alt`
  1,285 (100%) · head term 1,285 (100%) — the table in §3 is the final
  measurement, not an earlier one. The `<h2>` figure was 1,274 immediately after
  the keyword-table regen, which is what exposed the chain regression fixed in §3.
- **Keyword chain is at a fixed point:** re-running `seo:gap → keywords:fresh →
  seo:targets → keywords:map-impl` leaves the verdicts CSV, the map, the resolution
  report and both committed docs **byte-identical** (only the gap file's `ranAt`
  timestamp moves), so the data and the docs that describe it cannot drift apart.
  The keyword-phrase fixer is idempotent too (`files=0 S1=0 S2=0 Q1=0 dups=0` on a
  second run).

## 7. Open items (owner / next pass)

1. **Deploy.** Every fix here is in the local build; production still serves the old tree.
2. **Core Web Vitals <2 s** — the one measured failure (mobile tool page LCP 4.3 s
   re-confirmed on the final build). Needs the script/bootstrap work in §4. This is
   the highest-value remaining item.
3. **Google Search Console credentials** (`docs/api-credentials-setup.md`) → real
   query/position data replaces every proxy in §1 and §5.
4. **Ahrefs/Semrush + Copyscape keys** → real backlink profile, spam check, and
   external-duplication check for §2 and §5. Until then, the two backlink claims in
   §5 are a hand review of the site's own 41 tracked rows, not a referring-domain
   audit, and "external duplication" is the 7-gram/unique-intro proxy, not
   Copyscape.
5. **58 keyword-variant titles** (§3) and the **96 I1 intent clusters** (§1) —
   both identified with numbers, neither is a defect: the first is the
   keyword-target table's own choice, the second passes the cannibalization gate
   (`--fail-on-actionable`).
6. **The 6 keyword rows in §1** are now answered on their owner pages by a rendered
   FAQ; if they should instead own their own title/H1 wording, that is the next
   on-page pass (and it touches the title gate).
7. **Repeated section labels** — 27 heading strings still appear on 50+ pages (the
   footer labels, the FAQ label, the six guide section labels; §3). Reported, left
   in place on purpose: the copy under them is page-specific and renaming the
   labels would read as stuffing.
