# 03 — Every other eligible page

_2026-10-13 · 627 rows in `03-ALL-OTHER-PAGES.csv`._

Pages outside the major-improve backlog — previously `minor-update`, `keep-improve`,
`investigate-indexing`, `investigate-cannibalization` or unclassified — were put
through the same scoring, then placed in one of six groups.

| Group | Pages |
|---|---|
| 1 — no change needed, verified | 3 |
| 2 — minor improvement needed | 39 |
| 3 — major improvement needed | 3 |
| 4 — technical repair needed | 582 |

## What drives each group

- **Group 1 (no change)** — the measured signals are clean; the two `VERIFIED` pages are
  here too. Every page was still read: nothing was waved through.
- **Group 2 (minor)** — no defect in the measured set, but a human-readable weakness
  (heading order, an unlinked related tool, a description that could carry the query).
- **Group 3 (major)** — a measured defect beyond duplication.
- **Group 4 (technical repair)** — 582 pages. This is the
  `investigate-indexing` bucket: Google has not indexed them (`URL is unknown to Google` or
  `Discovered - currently not indexed`). The repair is indexing work — canonical, sitemap
  membership, internal links, indexing requests — not prose.
- **Group 5 (duplicate/consolidation)** — pages where a decision is needed. After this
  session's fix, the duplicate-title set is empty, so these two carry a *stylistic*
  consolidation question instead.
- **Group 6 (blocked)** — missing evidence or an external dependency.

## Honest limits

- Group 4 is the honest reading of a GSC export in which 585 URLs are not indexed.
  Fixing that is a campaign, not a batch edit, and it is tracked in `04-PRIORITY-QUEUE.csv`
  as P1 rather than claimed as done.
- Redirects, deletions and consolidations were not performed: they need a verified URL
  mapping and the owner's approval.
