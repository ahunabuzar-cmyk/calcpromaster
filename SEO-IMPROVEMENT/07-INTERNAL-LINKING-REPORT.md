# 07 — Internal linking report

_2026-10-13_

## Measured

| Measure | Value | Source |
|---|---|---|
| Internal links resolved in the build | 112,120 | build gate |
| Broken internal targets | 0 | build gate |
| Trailing-slash mismatches | 0 | build gate |
| Orphaned indexable pages | 0 | `data/internal-links-audit.json` |
| Weakly-linked pages | 0 | `data/internal-links-audit.json` |
| Mean internal links per page | 59 | `data/site-inventory.json` |

## What was changed

Nothing in the link graph, and that is a finding rather than an omission. The graph is
already dense (mean ~59 inlinks per page), there are **no orphans and no broken links**,
and the build's own gate re-checks it on every build. Adding links to pages that are
neither orphaned nor under-linked would inflate the graph without a user benefit — the
exact padding the brief forbids.

Where the pack does ask for link work, it is targeted and queued rather than bulk-applied:

- the 582 not-indexed pages (P1) benefit from contextual
  links from genuinely related tools, page by page;
- the nine U8 slug-repetition warnings need no link work at all.

## Depth check on the pages this task edited

The two enriched guides sit at the end of their clusters and are linked from their tools
(/guides/room-area: 68 inlinks, /guides/gear-ratio: 79 inlinks). The new sections link
in-context to the matching calculator, the converter and the estimator, so the added depth
is reachable rather than orphaned prose.
