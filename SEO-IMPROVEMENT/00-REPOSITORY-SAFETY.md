# 00 — Repository safety

_Written 2026-10-13 · branch `seo/daily-index-panel`_

## What the working tree looked like before this task

| Check | Value |
|---|---|
| Branch | `seo/daily-index-panel` |
| Uncommitted files | 450 |
| HEAD commit | 53f70d3 Index panel: measure the whole queue daily instead of a 100-URL sample |

A large body of uncommitted work already existed (guides, SEO reports, data files,
workflows). **Nothing in it was reverted, stashed, discarded or reset.** Every change
made by this task is additive or a surgical, named edit, and each one is listed in
`05-CONTENT-CHANGE-LOG.csv`.

## Rules this task followed

- No `git reset`, `git checkout --`, `git stash`, or file deletion of other work.
- No commit, push, deploy, redirect change or production setting change.
- No page deleted and no URL changed without the owner's authorisation
  (the one candidate is parked as `BLOCKED` — see `06-TECHNICAL-SEO-REPORT.md`).
- Generated files were regenerated **with the repo's own builders**, never hand-edited:
  `js/tool-intros.js`, `data/site-inventory.*`, `docs/KEYWORD-*.md`, `docs/INTENT-AUDIT.md`,
  `data/thin-pages.json`, `docs/THIN-PAGES-REPORT.md`. Each has a `--check` guard that
  would fail if it drifted.

## Generated vs source

| Kind | Examples | Rule applied |
|---|---|---|
| Source of truth | `js/data/*.js`, `js/seo-content.js`, `guides/*.html`, `js/topic-guide-depth.js` | edited directly |
| Generated | `deploy/**`, `data/*.json` reports, `docs/*.md` reports, `sitemap.xml`, `stats.html`, `changelog.html` | regenerated with their builder |
| Must not be overwritten | other contributors' uncommitted edits in the same files | left intact; changes limited to the exact lines named in the change log |

## Files this task touched

- `/guides/room-area` — content + schema (VERIFIED)
- `/guides/gear-ratio` — content + schema (VERIFIED)
- `/everyday/carbon` — cannibalization owner (NO_CHANGE_JUSTIFIED)
- `/homegarden/carbon-offset` — cannibalization fix (VERIFIED)
- `/regional/umrah-cost` — cannibalization owner (NO_CHANGE_JUSTIFIED)
- `/finance/hajj-cost` — cannibalization fix (VERIFIED)
- `/guides/cagr` — duplicate title fix (VERIFIED)
- `/regional/abuDhabi-cost-living` — URL format — fix AWAITING AUTHORIZATION (BLOCKED)

New tooling added (all under the repo's existing conventions, nothing replaced):

- `scripts/apply-topic-guide-depth.cjs` + `js/topic-guide-depth.js` — marker-wrapped,
  idempotent content injection for topic guides (the pattern `apply-guide-depth.cjs`
  already uses for category guides).
- `tests/unit/apply-topic-guide-depth.test.js` — 11 tests, including byte-level
  idempotency on the real files and FAQ-schema/visible-text agreement.
- `scripts/audit-url-format.cjs` — the written slug rule set behind
  `docs/URL-FORMAT-AUDIT.md`.
- `scripts/build-seo-improvement-pack.cjs` — builds this folder.
- `package.json`: `seo:topic-depth`, `seo:topic-depth:check`.

## Recovery

Every change is reversible with `git checkout --` on the named file, because no
change touched more than the lines listed in the change log. The one irreversible
step would have been the URL rename, which was deliberately not taken.
