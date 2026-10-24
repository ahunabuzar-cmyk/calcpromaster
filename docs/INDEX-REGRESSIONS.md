# Index-regression alert — per-URL transitions

_Generated 2026-10-23T12:10:03.856Z by `scripts/check-index-regressions.cjs`._

The burn-down reports net progress; this report is the per-URL view of the
same snapshots, so a page that fell out of the index (or was consolidated
away as an alternate canonical) cannot hide behind the total.

| snapshot | source | URLs with a status |
|---|---|---|
| 2026-09-27 | `gsc-inspect-batch.json` | 21 |
| 2026-10-05 | `gsc-inspect-batch-2026-10-05.json` | 20 |
| 2026-10-08 | `gsc-inspect-2026-10-08.json` | 20 |
| 2026-10-09 | `gsc-inspect-batch-2026-10-09.json` | 20 |
| 2026-10-09 | `gsc-inspect-notindexed.json` | 784 |
| 2026-10-11 | `index-panel-history.json` | 590 |
| 2026-10-12 | `gsc-inspect-batch-2026-10-12.json` | 40 |
| 2026-10-14 | `gsc-inspect-batch-2026-10-14.json` | 100 |
| 2026-10-14 | `index-panel-history.json` | 590 |
| 2026-10-15 | `gsc-inspect-batch-2026-10-15.json` | 100 |
| 2026-10-15 | `index-panel-history.json` | 590 |
| 2026-10-17 | `gsc-inspect-batch-2026-10-17.json` | 100 |
| 2026-10-18 | `gsc-inspect-batch-2026-10-18.json` | 40 |
| 2026-10-19 | `gsc-inspect-batch-2026-10-19.json` | 30 |

## New findings this run (not in the ledger)

### 1. Regression — was indexed, no longer indexed — 0

_None._

### 2. New not-candidate — left the indexing queue (redirect / noindex / other) — 0

_None._

### 3. New duplicate canonical — Google consolidated this URL into another — 0

_None._

### 4. Current state — non-candidates in the newest snapshot (gsc-inspect-batch-2026-10-19.json#2026-10-19)

_No new non-candidate URLs in the newest snapshot._

_Current-state rows are not transitions: they say what the newest snapshot
shows right now, which is what makes a targeted batch inspection useful._

## Totals

| measure | value |
|---|---|
| transitions scanned | 763 |
| regressions found (all windows) | 0 |
| new not-candidates found | 0 |
| duplicate-canonical findings | 0 |
| non-candidates in newest snapshot | 0 |
| known (in ledger, not alerting) | 1 |
| NEW this run | 0 |

## What to do with a finding

- **Regression on a `/hub/<cat>/` or `/<cat>/` URL** — check the category/hub
  duplication gate first (`npm run check:category-dup`); Google consolidating a
  category pair is exactly what `docs/DUPLICATE-HUBS-FIX.md` removed.
- **Duplicate canonical** — decide which URL should own the intent, then fix the
  losing page (canonical/redirect/merge). Never redirect blindly: brief rule 7
  needs a documented migration plan (`docs/QUERY-REACH.md` for the page map).
- **Accept the finding** (known, low priority) — `node scripts/check-index-regressions.cjs --update`
  adds it to `data/index-regressions-ledger.json`; it then stops alerting.

_A GSC snapshot can lag reality, so a single transition is a prompt to look, not
a verdict. Two consecutive snapshots agreeing is evidence; one is a hint._
