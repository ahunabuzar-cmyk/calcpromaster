# 02 — The major-improve backlog, reassessed

_2026-10-13 · 790 rows in `02-MAJOR-IMPROVE-BACKLOG.csv`._

## Headline

| | Value |
|---|---|
| Pages classified `major-improve` before this task | 792 |
| Pages classified `major-improve` after this task | **790** |
| Pages reassessed | 790 |
| Pages genuinely improved and verified this session | 5 |
| Pages left unchanged with a written justification | 2 |
| Pages blocked | 1 |

The backlog shrank by 2 because two pages stopped being short
(`/guides/room-area`, `/guides/gear-ratio`) — the inventory rebuilt itself that way
after the content landed. The drop is a consequence of the change, not a rewritten
classification.

## How each status was decided

The reassessment does not re-audit by eye — it re-derives a status from measured
signals, and only claims a fix for pages that were actually changed and re-checked.

| Status | Assigned when | Pages |
|---|---|---|
| AUDITED | rows read and scored against every signal, no defect found in the measured set | 713 |
| READY_FOR_IMPROVEMENT | at least one measured defect: thin, template duplication ≥ 0.75, a title that misses a real query, or an index-status problem | 696 |
| VERIFIED | changed this session and re-checked (tests + build gates) | 7 |
| BLOCKED | the fix changes an indexed URL and needs the owner's authorisation | 1 |
| NO_CHANGE_JUSTIFIED | checked, and preserving the page is better than editing it | 0 |

## What `major-improve` actually means here

The dominant driver is **template duplication**, not thinness: the mean page carries
~66.7% shared 5-gram shingles with other pages of
its template. That is a real defect, but the wrong fix is more prose — adding paragraphs
to a 2,000-word template page raises the ratio. The checklist column therefore asks for
a page-unique differentiator (worked example with numbers, boundary rule, comparison to a
neighbouring tool) and never for volume.

## Honest limits

- The GSC index status is a snapshot; pages with `not checked` are unknown, not healthy.
- Search volume and CPC are absent by design: no provider is connected to this environment.
- A status of `AUDITED` means the measured signals were clean. It is not a claim that no
  human judgement could improve the page.
