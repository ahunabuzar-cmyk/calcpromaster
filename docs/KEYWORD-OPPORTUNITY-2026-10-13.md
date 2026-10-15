# Keyword opportunity analysis — the 88-keyword export (2026-10-13)

> Source: the export pasted in chat (Keyword, Search Volume, CPC, Difficulty, Intent),
> saved as [`data/keyword-gap/keyword-volume-difficulty.csv`](../data/keyword-gap/keyword-volume-difficulty.csv)
> and added as a fourth input to `npm run seo:gap`.
> Coverage was measured against the built site (`deploy/`, 1,434 pages) and every
> "new tool" claim below was then re-checked by hand against `sitemap.xml`.

## Result for this export

| verdict | keywords | meaning |
|---|---|---|
| COVERED | 61 | a page slug/title already states it |
| WEAK | 3 | page exists, title does not say it |
| GAP | 22 | no page states it |
| IGNORE | 2 | too ambiguous to act on |

The headline: **this export is mostly demand the site already serves.** 61 of 88 keywords
already have a page. Only six distinct tools are genuinely missing, and eight more
keywords are one wording change away from an existing page.

## A. Cheapest wins — the page exists, the wording doesn't

Same intent, different words. These are title/H1 edits on pages we already have, not new builds.

| keywords | volume each | existing page | what to change |
|---|---|---|---|
| `calculator for certificate of deposit`, `deposit certificate calculator`, `certificate deposit calculator`, `certified deposit calculator`, `cd bank calculator`, `bank certificate calculator` | 165,000 | [`/finance/cd-calculator`](../finance) | the page is titled "CD Calculator"; say **Certificate of Deposit** in the title/H1 — six keywords, one edit |
| `time card clock calculator` | 201,000 | `/career/timesheet-hours` | add "time card" to the title/H1 |
| `calculator for cement` | 550,000 | `/construction/concrete-slab` | now matches via a `cement → concrete` synonym; confirm "cement" appears in the page copy |
| `amortisation schedule calculator` | 246,000 | `/finance/amortization` | British spelling now mapped; confirm the page mentions "amortisation" |
| `sci calculator` | 550,000 | `/math/scientific` | now matches via `sci → scientific` |

## B. Genuinely missing — six distinct tools (verified absent from `sitemap.xml`)

| tool | best keyword volume | difficulty | honest assessment |
|---|---|---|---|
| **Square footage calculator** | 165,000 (×8 keyword variants) | 9-10 | **Build this first.** We already have `/homegarden/home-sqft`, `/roof-sqft`, `/countertop-sqft` and `/finance/price-per-sqft` — the math exists, there is just no general "square feet" page to rank. Pure gain, no new risk. |
| **Peptide calculator** | 301,000 | **6** | Real demand, lowest difficulty in the whole export. It is a dosing tool (peptide reconstitution, syringe units), so it is YMYL: needs the same formula-QA and "confirm with a professional" treatment as the health tools. |
| **Snow day calculator** | 368,000 | 17 | Highest volume in the gaps and it is seasonal (US school closures). Off our current 20 categories; it would sit under Everyday/Lifestyle. Score it by season, not by annual average. |
| **Dynasty trade calculator** | 165,000 | 9 | Needs a player-value dataset, not arithmetic — a data-maintenance commitment, and fantasy sports is a different audience from the rest of the site. |
| **Chipotle / restaurant nutrition calculator** | 201,000 (×8 variants) | 7-17 | Also a data play: menu nutrition changes constantly, so the page needs a review cycle or it rots. High volume, real liability. |
| **A/G ratio calculator** | 673,000 | 0 | `a/g` is ambiguous (albumin/globulin ratio is the medical reading). Difficulty 0 with a blank CPC usually means *no data*, not "easy". Verify the SERP before treating this as a 673k opportunity. |

## C. Covered head terms — a ranking problem, not a content problem

The biggest volumes in the export already have pages, which means the bottleneck is
authority and title/position, not another page:

| keyword | volume | page we already have |
|---|---|---|
| `calculator for grading`, `calculator grades`, `calculator grader` | 1,000,000 | `/education/grade`, `/education/letter-grade`, `/education/grade-needed` |
| `calculator gpa` | 823,000 | `/education/gpa`, `/education/semester-gpa`, `/education/cgpa` |
| `calculate age calculator` | 673,000 | `/everyday/age` |
| `concrete calculator` (+16 variants) | 550,000 | `/construction/concrete-slab`, `/concrete-column` |
| `percentage table calculator` | 550,000 | `/math/percentage` |
| `tip calculator`, `tipping calculator` | 450,000 | `/finance/tip` |
| `fractions calculator` | 368,000 | `/math/fraction`, `/math/partial-fractions` |
| `calculator ovulation` | 301,000 | `/health/ovulation`, `/health/ovulation-calculator` |
| `amortization calculator` | 246,000 | `/finance/amortization` |

## Data-quality warnings (read the numbers with these in mind)

- **Blank CPC + difficulty 0 is missing data, not low difficulty.** `snow day calculator`
  and `dating time calculator` both have a blank CPC.
- **These volumes look like ad-group aggregates.** 1,000,000 for four different
  "grading" phrasings and 673,000 for `calculate age calculator` is Keyword-Planner-style
  grouping around one intent, not four keywords each with a million searches. Use the
  relative order, not the absolute numbers, to prioritise.
- **Word-order duplicates inflate the list.** `concrete calculator` appears 17 times in
  the export as near-identical phrasings; the auditor de-dupes them into one row.
- **`dating time calculator`** cannot be actioned: it is either a date/time tool (we have
  `/everyday/days-between`) or a relationship timeline. Not worth a page on this data.

## Reproduce

```bash
npm run seo:gap                                        # all four inputs
node scripts/audit-keyword-gap.cjs --only keyword-volume-difficulty   # just this export
node scripts/audit-keyword-gap.cjs --explain "peptide calculator"     # why a verdict was reached
```
