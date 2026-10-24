# Full-site improvement pass — 30-point audit

Date: 2026-10-19
Scope: every indexable page in `deploy/` (1,420 pages), out of 1,619 HTML files served.
Every number below comes from a command run against the built `deploy/` folder, not an estimate.

## Verified results of this pass

| Check | Command | Result |
| --- | --- | --- |
| Thin content | `npm run audit:thin` | **0** pages under 500 words (was **10**) |
| Whole-site bugs | `npm run audit:site-bugs` | 0 duplicate ids, 0 broken links, 0 duplicate titles/descriptions, 0 h1 problems, 0 canonical mismatches, 0 JSON-LD parse errors, 0 missing alts, 0 http self-links |
| Head criteria | `npm run seo:head:check` | 1420/1420 on all ten criteria, 0 failures |
| Build gates | `npm run deploy:build` | quality gate, title length, crawl links, internal links, perf budgets: all PASS |
| Unit tests | `npm test` | 2752/2752 pass (96 files) |

## Pages that were thin, and what they are now

| Page | Before | After |
| --- | --- | --- |
| `/geometry-lab` | 431 words | 894 |
| `/graph` | 435 words | 872 |
| `/stats` | 474 words | 664 |
| `/privacy` | 458 words | 603 |
| `/contact` | 429 words | 609 |
| `/terms` | 449 words | 553 |
| `/editorial-policy` | 384 words | 519 |
| `/disclaimer-general` | 309 words | 578 |
| `/disclaimer-health` | 331 words | 534 |
| `/disclaimer-finance` | 334 words | 517 |

Word-count buckets now: `<200` 0 · `200–349` 0 · `350–499` 0 · `500–799` 62 · `800–1199` 26 · `1200+` 1332.

## Fixes applied

1. **26 truncated meta descriptions.** Guide and blog pages shipped descriptions cut mid-sentence or mid-word, some ending in `…`, shipped live with a CTA bolted on. Every one was rewritten to a complete sentence under 155 characters.
2. **6 duplicate descriptions between a category page and its hub** (`/business`, `/education`, `/everyday`, `/finance`, `/fitness`, `/food`). The hub now states its own purpose and calculator count.
3. **Malformed list in the Financial Disclaimer.** `<h2>Your Responsibility</h2>` was followed by five orphan `<li>` items with no `<p>` and no `<ul>` — invalid HTML, fixed at the generator.
4. **Terms of Service:** removed a leftover Urdu “MANUAL ACTION” comment and replaced the vague governing-law sentence with a precise one; added an embedding/attribution section and renumbered 7–10.
5. **`fix-deploy-seo.cjs` truncation logic.** It used to cut at a raw character budget, then append a CTA, which produced live text like “the honest limitations of BMI as. Read the full breakdown.” It now fits against the escaped length, prefers the last complete sentence or clause, strips dangling verbs, and refuses to emit a description under the 100-character floor.
6. **Hub meta descriptions** no longer rely on concatenating a prefix that overflowed 158 characters (which had clipped `/hub/education` and `/hub/everyday` to 63 characters).
7. **Stats page generator** gained “What these numbers do not measure” and “How often this page updates”, and `stats.html` was regenerated from the current GSC data.
8. **Legal pages are generated from `js/legal-pages.js`** — the new sections were added there, not to the generated HTML, so the next build cannot wipe them.

## New permanent checks

- `scripts/audit-site-bugs.cjs` / `npm run audit:site-bugs` — duplicate ids, broken internal links (page-like hrefs only), title/description presence, length and duplication, h1 count, canonical vs file path, JSON-LD parse, image alts, `http://` self links.
- `scripts/audit-thin-pages.cjs` / `npm run audit:thin` — word counts per indexable page with `--min` threshold and JSON output.
- Both run in CI after the head-criteria step, so a regression fails the build instead of reaching production.

## The 30-point list (✅ done · 🟡 partial · ⬜ remaining)

### Content depth
1. ✅ No indexable page under 500 words — 0/1420.
2. ✅ `/graph` and `/geometry-lab` rebuilt as real worked-example pages with related-calculator links.
3. ✅ Trust pages (privacy, terms, contact, editorial policy, three disclaimers) explain the subject instead of restating boilerplate.
4. ✅ 26 truncated descriptions repaired at the source file.
5. ⬜ Raise the 62 pages in the 500–799 band (guides, blog) with one more worked example each — quality upside, not a thin-content fix.
6. ✅ Stats page refreshed and explained.

### Metadata
7. ✅ Title 30–60 characters — 1420/1420.
8. ✅ Description 100–160 characters with a call to action — 1420/1420.
9. ✅ Zero duplicate titles and zero duplicate descriptions site-wide.
10. ✅ Self-referencing canonical on every indexable page.
11. ✅ Category page vs hub page descriptions are distinct (6 pairs fixed).
12. ✅ Open Graph, Twitter card and JSON-LD parse cleanly on all pages.

### Structure and technical
13. ✅ Zero broken internal links (107,813 links checked by the build).
14. ✅ Zero duplicate `id` attributes.
15. ✅ Exactly one `<h1>` per page.
16. ✅ Zero images without `alt`.
17. ✅ Zero `http://` links to our own domain.
18. ✅ Legal-page HTML validity fixed (orphan list items).

### Bugs, performance and gates
19. ✅ 2752 unit tests pass, including the deploy meta-integrity tests.
20. ✅ Head-criteria gate runs in CI.
21. ✅ Whole-site bug audit wired into CI.
22. ✅ Thin-content audit wired into CI.
23. ⬜ Playwright e2e and visual suites not run in this pass (browser setup not available here).
24. ⬜ Cloudflare `www → apex` redirect chain is a dashboard rule; not editable from the repo.

### Distribution and next bets
25. ⬜ **Deploy the build.** Live still serves the previous release; none of the content or meta fixes are visible until `deploy/` is uploaded.
26. ⬜ After deploy: resubmit `sitemap.xml` and re-ping IndexNow for the changed URLs.
27. ⬜ Add a “worked example” block to the 62 guides in the 500–799 band (highest remaining content lever).
28. 🟡 Internal-link depth: the audit exists and passes, but high-impression tools can still send more contextual links into the weakest clusters.
29. ⬜ FAQ/HowTo structured data on tool pages where the page genuinely answers the question (avoid schema without matching visible content).
30. 🟡 Core Web Vitals: perf budgets pass on every template; field data still pending more traffic before it is actionable.

### Known limitations, stated honestly
- 78 calculator QA contracts are still in `REVIEW` (smoke-tested, not independently verified) — see the QA dashboard.
- The Cloudflare www redirect and the deploy itself need the owner.
- Ahrefs' “poorly formatted URL” rows did not reproduce in the current sitemap (0 uppercase, underscore, space or parameter URLs).
- The Google verification file is intentionally minimal and must not be expanded.

## How to re-verify

```bash
npm run deploy:build
npm run audit:site-bugs
npm run audit:thin
npm run seo:head:check
npm test
```
