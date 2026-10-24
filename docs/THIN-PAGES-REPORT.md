# Thin-page report — indexable pages under 500 words

**Generated:** 2026-10-19 · by `node scripts/thin-page-report.cjs`
**Scope:** every real HTML page in the built `deploy/` tree, minus noindex pages, `/embed/` widgets,
non-HTML verification files and the legal disclaimer pages.

## Result

| | Count |
|---|---|
| Indexable HTML pages scanned | 1412 |
| Under 500 words | **3** |
| &nbsp;&nbsp;…of those, **bare** (short *and* no FAQ section) | **1** |
| &nbsp;&nbsp;…of those, focused guides (short but already FAQ + subheadings) | 2 |
| Thinnest page | 431 words |

| # | Page | Words | H2s | FAQ | Inlinks | Shape | Action |
|---|---|---|---|---|---|---|---|
| 1 | `/geometry-lab.html` | 431 | 3 | yes | 1512 | focused | Focused guide: already structured, extend only if you have something real to add |
| 2 | `/graph.html` | 435 | 4 | yes | 1513 | focused | Focused guide: already structured, extend only if you have something real to add |
| 3 | `/stats.html` | 474 | 4 | no | 1513 | bare | Needs work — add unique depth, FAQ + subheadings |

## Why this is the right proxy for "Crawled - currently not indexed"

GSC reports that bucket as a count with no URL list, so it cannot be mapped page by page.
What it *can* be matched against is the property Google keeps implicitly: pages it crawled and
judged too thin to index. Those show up here as the thinnest indexable pages, which is why this
report is the one to drive to zero rather than guessing at GSC’s list.

## Excluded by design

| Path pattern | Why |
|---|---|
| `/disclaimer-*` | Legal disclaimers — short on purpose, no ranking intent |
| `/goog*.html` | Google site-verification files (plain text, not HTML) |
| `noindex` pages | Not candidates for indexing, so thinness is irrelevant |
| `/embed/*` | iframe widgets, deliberately minimal |

## Reproduce

```bash
node build-deploy.js                 # build deploy/ first
node scripts/thin-page-report.cjs    # this report
node scripts/thin-page-report.cjs --threshold 600   # stricter cut
```
