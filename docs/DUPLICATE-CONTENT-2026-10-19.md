# Duplicate content — measurement, fixes, and the 3-week check

> Ran **2026-10-19** on the built `deploy/` tree (1,515 pages: 1,329 indexable +
> 186 noindex long-tail variants).
> Tools: `npm run seo:dup` (audit) · `npm run seo:dup:save` (baseline) ·
> `npm run seo:dup:compare` (regression gate).
> Next review: **2026-11-09** (3 weeks) — see the last section.

## Why this pass exists

The site is generated, so the risk is not "two pages copied each other" — it is
one template sentence rendered 1,285 times with only the tool name swapped.
The previous content pass reported "globally unique sentences", but that check
compared *whole sentences*: because every sentence embedded the tool name, each
rendering was technically unique while the rest of the words were identical.
A 7-gram scan of the built HTML showed the actual size of the problem.

## What was measured

Script: `scripts/audit-n-gram-duplication.cjs` (reads `deploy/`, not source).

- **7-gram duplicated share** — of all 7-word windows on a page, the fraction
  that also appear on **6 or more** other indexable pages.
- **Pages over 40% shared** — pages whose text is mostly template.
- **Repeated editorial sentences** — whole sentences (≥12 words) on 4+ pages,
  excluding legal disclaimers and per-category methodology notes, which are
  *supposed* to be identical.
- **Duplicate titles / meta descriptions**, **pages under 400 words**.

## Results

| Metric | Before (2026-10-19 AM) | After (same page set) | Indexable only |
|---|---|---|---|
| 7-gram duplicated share | **58.0%** | **50.2%** | **40.7%** |
| Pages over 40% shared | 1,439 | 1,149 | 949 |
| Largest repeated editorial sentence | **1,005 pages** | 20 pages | 20 pages |
| Duplicate titles | 0 | 0 | 0 |
| Duplicate meta descriptions | 0 | 0 | 0 |
| Pages under 400 words | 4 | 4 (all noindex) | 1 (`/`, the SPA shell) |

The "before" column counts all 1,515 pages, including the 186 noindex
long-tail variants; the "after (same page set)" column uses the identical basis
(`npm run seo:dup -- --include-noindex`), so the two are comparable.

The 1,005-page sentence figure was measured on the pre-change
`js/seo-content.js` (the whole entry set, one identical template sentence per
page) because the built tree was rebuilt during the pass; the 20-page figure is
the built-HTML measurement from the sentence audit above.

Raw data: `data/duplicate-content-before-2026-10-19.json` (pre-change),
`data/duplicate-content-report.json` (current),
`data/duplicate-content-baseline.json` (locked snapshot for the 3-week compare).

## What was changed

1. **Intro paragraphs** (`generate-intros.js`) — every sentence now names the
   tool (or its input set), so a sentence can no longer repeat across pages.
   Pools were widened, and the length cap now drops optional slots by name
   instead of splicing by index (which removed the wrong sentence).
2. **FAQ answers** (`scripts/seo-regen-v5.cjs`) — the third FAQ was one fixed
   40-word answer, byte-identical on 1,468 pages. It is now one short,
   tool-specific sentence, and a **computed** sixth FAQ was added: the tool's
   own `calc()` is run a second time with one input doubled, quoting the real
   before/after pair. Random/clock-based tools are skipped (two runs must agree).
3. **Worked-example closer** — "X applies the same steps to whatever you type…"
   was identical on 1,234 pages and repeated what the step list already said.
   Removed.
4. **AEO quick answer** — the trailing "Assumptions and limits are summarized
   below." (1,214 pages) removed; the assumptions section still exists.
5. **Sentence rotation** — `pickU()` now picks the *least-used* pool entry
   instead of the first one whose whole sentence was unseen. This is what
   stopped one template sentence appearing on 1,005 pages.
6. **Site shell** (`scripts/ssg-pages.cjs`, `js/app.js`) — the "Reviewed …
   formula and worked example checked against the current rates" tail removed
   (date kept, machine-readable), and the review block shortened.
7. **Semantic coverage** — each tool's generated related-term set (`lsi`) is
   now published as schema.org `keywords` + `about` Thing entities on the
   WebApplication JSON-LD (it was generated but never rendered or published).
   Mirrored in `js/app.js` for the hydrated page.
8. **Duplicate gate** — `npm run seo:dup` + `npm run seo:dup:compare` run in CI
   after the deploy build, so a regen that reintroduces template copy fails.

## What is still repeated (and why that is acceptable)

- **Legal disclaimers** — 391× finance, 187× health. Required to be identical.
- **Per-category methodology notes** — 218×/121×/82×. One note per category by
  design; there are 20 categories, not 1,285 variants.
- **Premium article template** — 34 flagship pages still share four intro
  paragraphs (9–10 pages each) from `generate-premium.js`. These are hand-tuned
  articles merged over the generated body; rewriting them is an editorial job,
  not a rotation, and is the next content task.
- **Hub comparison boilerplate** — 20× "compare calculators by what you enter…"
  (one per category hub).
- **Stock phrases** — "your data never leaves your device", "Reviewed October
  2026", "What do I need to use the …?" These are 4–7 words and are the reason
  the raw 7-gram share stays near 40% even though no editorial *sentence*
  repeats. Cutting them further would mean deleting trust signals.

## Internal links (checked in the same build)

`node build-deploy.js` runs the trailing-slash/broken-link audit on the built
tree:

- 1,620 pages scanned · **107,760 internal links** · **0** slash mismatches ·
  **0** broken (404) targets.
- Crawl gate: 616 not-indexed URLs, **616 covered** by an indexed inlink,
  **0 uncovered**.
- Cluster check: all **70** cluster slugs exist in the sitemap; 60 spokes carry
  a hub link, 10 hubs carry ≥2 spoke links.

No internal-link fixes were required; the numbers above are the current state
and re-run on every build.

## Snippet baseline

`npm run seo:snippet-audit` → `docs/TOP100-SNIPPET-AUDIT.md`
(2026-09-16 → 2026-10-14 demand window): **100/100 top-impression snippets
clean, 0 flagged**. Head criteria (`npm run seo:head:check`): **1,420/1,420
indexable pages pass all ten** (title 30–60, description 100–160 + CTA,
self-canonical, page-specific keywords, JSON-LD dateModified, visible date, no
inline handlers, no comments, one GA4 property).

479 titles are still "Tool name: input 1, input 2" shaped. They pass every
length/intent gate and are unique, so they were **not** mass-rewritten in this
pass; the top-impression 100 have no snippet defects. Rewriting 479 titles
needs per-tool outcome copy and is tracked as a separate content task.

## The 3-week check (2026-11-09)

1. Rebuild and re-measure:

   ```bash
   node build-deploy.js
   npm run seo:dup
   npm run seo:dup:compare
   ```

2. Read the comparison table. Target: 7-gram share down from **40.7%** and
   editorial sentence repeats down from **20**; duplicate titles/metas must stay
   at 0.
3. Cross-check the same window in GSC: indexed pages, impressions per page, and
   whether the pages that used to be 100% template are now being indexed.
4. If a generator regressed, `seo:dup:compare` exits 1 in CI — the commit that
   did it is the one to fix, not the baseline.
5. After a deliberate, accepted change, re-lock the baseline with
   `npm run seo:dup:save` and note the new date here.
