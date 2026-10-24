# 08 — Quality and duplication audit

_2026-10-13_

## Duplication

| Signal | Value | What it means |
|---|---|---|
| Mean template duplication (5-gram shingles) | 66.7% | the arithmetic skeleton of a generated page repeats across its template family |
| Same-title groups | 0 | after this session's fix, no two indexable pages share a title |
| Phrase cannibalization | ✅ none | no curated phrase is claimed by two pages |
| Category vs hub overlap | max 60.4% (limit 65%) | category and hub pages are differentiated |

The distinction that matters: **repeated template scaffolding is not the same defect as two
pages answering the same question.** The generator's shared phrasing is a structural
weakness (tracked, P2); cannibalization was a targeting defect and is now zero.

## What was deliberately left alone

- No paragraph was deleted from a generated page just to lower its duplication ratio —
  the pages are long *and* similar, and cutting text would lose the worked example that
  makes them useful.
- No near-duplicate page was merged. Merging needs traffic evidence to pick the survivor
  and a redirect plan, neither of which is available here.

## Content quality of what was added

Every sentence added this session is either a definition, a checkable number, or a stated
limit. The two guides gained:

| Page | Added | Why it is not padding |
|---|---|---|
| `/guides/room-area` | measuring method with unit conversion; a tape-measure→tile-order table (166.25 sq ft → 182.9 sq ft → 13 boxes); four named error modes; 3 FAQs | every figure is arithmetic the reader can redo; each error mode is a distinct, plausible mistake |
| `/guides/gear-ratio` | a 6-row ratio→RPM table; a work-backwards procedure (1,500→400 rpm via 2.00 × 1.875); a mesh-efficiency section (0.98³ ≈ 0.94) | the table answers the actual question; the efficiency figure corrects a common over-estimate |

No word-count target was used. The rule applied was: add a block only if it answers a
question the page already invites and the calculator cannot answer numerically.
