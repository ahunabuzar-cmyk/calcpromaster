# CalcProMaster — SEO change audit, validation and reconciliation

**Audit date:** 2026-10-13 · **Repository root:** `C:/Users/ok/Documents/Calculator/project`
**Branch:** `seo/daily-index-panel` · **HEAD:** `53f70d3`
**Scope:** read-only review of the pending SEO change set + one verified guard fix.
**Deployment:** none. **Push:** none. **Commit:** none (see §7).

---

## 1. Executive summary

| Question | Answer |
|---|---|
| Did the audit pass? | Yes — 21/21 commands I ran exited 0 (the single expected non-zero is the documented `keywords:check` staleness gate, §5.6). |
| Production build | Passes: 1,509 SSG pages written, 1,617 HTML files in `deploy/`, 0 broken links, all perf budgets met. |
| Unit tests | 80 files / 2,542 tests, all pass. |
| Build vs sitemap gap | **Fully explained with evidence, not a defect** — §4. |
| Was a commit created? | **No.** Phase 12 forbids it and one Phase 7 precondition fails (`git diff --check`, §6.8). |
| Working tree | Intentionally preserved: 212 modified + 264 untracked files, 0 staged. My only source edit is the one guard fix in §3.6. |

---

## 2. Initial Git baseline (Phase 1)

```
pwd                        → /c/Users/ok/Documents/Calculator/project
git rev-parse --show-toplevel → C:/Users/ok/Documents/Calculator/project
git branch --show-current  → seo/daily-index-panel
git log -5 --oneline       → 53f70d3 Index panel: measure the whole queue daily instead of a 100-URL sample
                             4faa736 SaaSHub verified: listing live, review in approval queue (DR74 backlink secured)
                             4c556c8 HN Show HN temp-restricted by mods: karma route, retry locked for Oct 6
                             d9f9906 HN unlock received: shrink Show HN title to 62 chars (80-char limit)
                             d55852e Launch-week tracker live: Reddit day-0 logged, GSC API baseline seeded
```

`git status --porcelain` → **476 entries**: `212 M` (modified, unstaged) + `264 ??` (untracked).
Staged changes: **0**. Deletions: **0**. Renames: **0**.

| Command | Result |
|---|---|
| `git diff --stat` | `212 files changed, 34331 insertions(+), 24073 deletions(-)` |
| `git diff --check` | **exit 1** — 306 trailing-whitespace findings in 18 files (§6.8) |
| `git diff --cached --stat` | empty |
| `git diff --cached --check` | exit 0, empty |

Because nothing is staged, the working tree *can* in principle be isolated from pre-existing
index state (classification D is empty). It is **not** committed: see §6.8 and §7.

Changed-file shape (212 modified): `guides/` 74 · `js/` 51 · root 27 · `scripts/` 22 · `docs/` 16 ·
`tests/` 8 · `blog/` 7 · `data/` 4 · `.github/workflows/` 2 · `embed/` 1.
Untracked shape (264): `scripts/` 74 · `docs/` 73 · `data/` 46 · `tests/unit/` 44 · `js/` 11 · plus
root files (`changelog.html`, `geometry-lab.html`, `graph.html`, `stats.html`, `wrangler.toml`) and
local-only dirs (`.tmp-scan/`, `.wrangler/`, `.well-known/`, `functions/`, `reels/`).

**Sample diff evidence (what most of the 212 are):** `guides/emi.html` and the other guides/hubs are
almost entirely trailing-slash internal-link normalisation (`href="/guides"` → `href="/guides/"`,
`/finance/loan-emi` → `/finance/loan-emi/`). 15 modified files are exactly a 1-line/1-line change.

---

## 3. Phase 2 — review of every relevant change

### 3.1 `js/tool-intros.js` — the "only abu-dhabi-cost-living changed" claim is **false**

Measured by parsing `git show HEAD:js/tool-intros.js` and the working-tree file into objects and
diffing them:

| Metric | HEAD | Working tree |
|---|---:|---:|
| keys | 1,206 | **1,282** |
| keys added | — | **76** |
| keys removed | — | **0** |
| values changed | — | **1,100** |
| duplicate keys | 0 | 0 |

* `abu-dhabi-cost-living` is **one of the 76 added keys**, not a renamed one: HEAD contains **no**
  key matching `/abu.?dhabi/`, and **0** keys were removed, so nothing was renamed at the map level.
* Header changed `Generated: 2026-09-21 — 1219+ tools` → `Generated: 2026-10-13 — 1282 intros for 1282
  registry tools`; the `1211+`/`1219+` count strings inside the paragraphs became `1282+`.
* Whole-file rewrite (2,278 changed lines, 460 in `generate-intros.js`), so a line-by-line review is
  not meaningful. Invariants verified instead: no duplicate keys, no missing entries, generator
  ownership intact.
* `npm run intros:check` → **exit 0**, `✓ js/tool-intros.js matches the generator (1282 intros, 1282 unique)`.
  `generate-intros.js` is the single writer (test §3.4), and `scripts/seo-regen-v5.cjs` now delegates
  to it via `execFileSync` instead of writing the file itself.

### 3.2 Query-quality audit + ledger

`scripts/audit-query-quality.cjs` (313 lines, new), `data/query-quality-ledger.json`,
`docs/QUERY-QUALITY.md`, `data/query-quality-audit.json`:

* **URL normalisation** — `normPath()` strips origin and the trailing slash; `/` stays `/`. This is
  the regression the tests pin: GSC reports `/health/bmr-mifflin` and `/health/bmr-mifflin/`, which
  used to become two pages with 53%/91% shares. Both raw forms are kept in the report (`paths[]`).
* **Machine-shape detection** — 5 named rules, Unicode-aware (`\p{L}`, so Hebrew/Russian/Japanese/
  Arabic queries are not flagged). Pasted equations (`e=mc2 calculator`) are deliberately **not**
  flagged, and `4.5% apy on 10000` is deliberately not flagged.
* **Thresholds** — a page trips on **volume AND share** (`≥20` machine impressions and `≥25%` of the
  page), so neither a 3-impression page nor a large clean page fires.
* **Ledger** — one accepted finding (`/health/bmr-mifflin`, note > 40 chars, with measured numbers and
  a written justification). It is **not** a blanket suppression: `classify()` re-alerts on growth
  (`share +0.10` or `+25` machine impressions), growth is checked before "known", and a corrupt or
  missing ledger returns `[]` (silences nothing).
* **Exit codes** — exits 0 with a skip notice when `data/gsc-query-page.json` is absent (so CI does not
  fail on data it never had), exits 1 on any new/grown finding. Current run: **exit 0**, 1 flagged
  page, 1 accepted, 0 pending.
* **Reproducibility caveat** — `data/query-quality-audit.json` embeds `ranAt` (a timestamp), so the
  JSON is not byte-deterministic; `docs/QUERY-QUALITY.md` is (no timestamp).

### 3.3 Cannibalization audit

`scripts/audit-cannibalization.cjs` (444 lines, new) + `docs/CANNIBALIZATION-REPORT.md`:

* Pairs only when **two distinct pages of this site collected impressions for the same query** in the
  GSC join; `/x` and `/x/` are collapsed first. Keyword lists/title clustering are explicitly
  delegated to `KEYWORD-AUDIT.md` C2 and `INTENT-AUDIT.md` I1.
* Rules D1–D6 applied mechanically; actionable = D1/D2/D3_LINK_MISSING with `≥3` impressions still
  reaching the weaker page; `--fail-on-actionable` → exit 1.
* **Independent verification of the "0 actionable / 0 D3 missing" result** (my own re-check, not the
  script's own claim): for all **17** D3 pairs I re-read the guide HTML from `deploy/` and looked for
  `href="<tool>/"` — **17/17 really do link the calculator**, 0 unreadable, 0 missing. The clean
  result is genuine, not a silent exclusion.
* Suppression points to keep in view (both are *printed* in the report, so nothing is hidden):
  **D5** downgrades a pair to "accept" when one page holds ≥80% and ≥10× the other — but never
  overrides D1; **D1/D2 → `*_LINKED`** downgrades a pair that shares a `js/cluster-map.js` cluster,
  accepting it on the existence of a cluster link rather than on a measured link in the deployed HTML.
  Current counts: D1 18 (2 linked), D2 14 (2 linked), D5 2, D6 31, D3 17, actionable 0.
* **Defect found and fixed** — `linksTool()` returns `null` when the guide HTML is not readable, and
  the old branch fell through to `note = 'guide links the calculator — guide↔tool split is by design'`,
  i.e. an **unverified link reported as verified** whenever `deploy/` is absent. Fix: a distinct
  `linked === null` branch whose note says the link was not verified (decision/actionability
  unchanged, so the gate is neither weakened nor made over-strict). After the fix `seo:cannibal:check`
  is **exit 0** with identical counts (D3 0, actionable 0) and `lint:js` + all 2,542 tests still pass.

### 3.4 Tests — `tests/unit/seo-audit-guards.test.js` (264 lines, new)

Substantive, and they exercise real failure modes rather than happy paths:

* intro-freshness ignoring only the date line, **and** "a missing file must never look up to date";
* single-writer ownership of `js/tool-intros.js` (a repo-wide regex scan for other `writeFileSync` writers);
* `seo-regen-v5.cjs` delegation (`not.toMatch(/OUT_INTROS/)`, `not.toMatch(/buildIntro\(/)`);
* P10 site-copy shapes firing on **each claimed defect shape** and **not** firing on correct prose;
* machine-shape rules flagging the 7 real shapes and leaving 8 real searches (incl. 4 non-Latin) alone;
* the volume+share threshold, the slash-normalisation regression (`pagesInJoin === 1`, `paths` both forms);
* ledger purity: known vs grown vs new, growth re-alert **by volume**, corrupt ledger silences nothing;
* "accepts the committed ledger entry for the real finding, and nothing else" (every ledger entry must
  still be flagged, carry a reason > 40 chars, and `summary.newPages === 0`);
* the skip-cleanly path is asserted against the script source.

`npm run test:unit` → **80 files, 2,542 tests, 0 failures, exit 0** (re-run after my guard fix).

### 3.5 CI workflows

YAML parsed with the real `yaml` package (installed in a temp dir, nothing added to the repo):
`ci.yml` → jobs `quality,build` OK · `seo-panel-daily.yml` → job `panel` OK ·
`seo-weekly-refresh.yml` → jobs `host-check,refresh` OK.

* `ci.yml` (modified, +152) wires `seo:overrides:check`, the machine-shaped query guard
  (`npm run seo:query-quality`), `npm run test:unit`, `seo:cannibal:check`, the keyword-docs freshness
  gate and the rest. Every gate is invoked as `npm run <script>` inside `run:` with no `|| true` and no
  `continue-on-error`, so a failing gate fails the step → the job (exit-code propagation intact).
* `seo-panel-daily.yml` (modified, +53) adds the index-regression step, index velocity, the extra
  generated files to the snapshot commit and artifact upload, and a dedicated regression issue.
  **The regression step is `continue-on-error: true` by design** (comment explains: the snapshot must be
  written before the issue opens) — the only non-blocking gate in the set. Alerting is via issue.
  The file contains a `git push` of the generated snapshot: **pre-existing at HEAD (line 110)** and
  covered by `permissions: contents: write`. This task's diff does not add it.
* No workflow deploys or publishes: grep for `pages deploy|netlify deploy|npm publish|gh release|
  wrangler deploy|npm run deploy|deploy:cf` across `.github/workflows/*.yml` → **no matches**.
  `npm run deploy:cf` exists in `package.json` but no workflow calls it.

### 3.6 Generated keyword / intent documentation

`docs/KEYWORD-TARGETS.md`, `KEYWORD-AUDIT.md`, `INTENT-AUDIT.md`, `KEYWORD-DIFFICULTY.md`,
`HARD-KEYWORDS.md` are generated by `scripts/build-keyword-map.cjs`, `audit-keyword-quality.cjs`,
`audit-title-intent.cjs`, `build-difficulty-report.cjs`, `build-hard-keywords-doc.cjs`.

* **Deterministic**: `npm run keywords:fresh` twice → MD5 of all five files **identical** on re-run.
* **No fabricated metrics**: a scan for volume/KD/CPC/rank claims returns only false positives
  (`CKD-EPI`, `cpm cpc impressions`). `docs/KEYWORD-AUDIT.md:92` states outright that the audit
  *cannot* measure search volume, difficulty or positions; the one volume-ish figure is labelled
  `low (10–100/mo est.)`.
* Diff vs HEAD is 741 insertions / 392 deletions (§5.6).

### 3.7 `package.json` and other task files

`package.json` (modified) adds the task's own scripts (`intros:check`, `keywords:research`,
`check:page-drift`, `check:category-dup`, `seo:exposure`, `seo:crawl-gate`, `seo:query-quality`,
`seo:cannibal(:check)`, `seo:regen`, `seo:index-regressions`, `seo:guide-depth`, …). Generated trees
regenerated in this change set: `sitemap.xml`, `all-tool-ids.json`, `tool-inventory.txt`,
`seo-indexing-audit.{json,csv}`, `data/*` snapshots.

---

## 4. Phase 3 — 1,617 build pages vs 1,417 sitemap URLs (resolved)

**Sources of the two numbers** (from `deploy/`, the actual build output):

| Counter | Where it comes from | Value |
|---|---|---|
| HTML files in `deploy/` | `SSG complete: 1509 static pages` + copied repo pages; reported by the CRAWL-LINK GATE as `pages scanned` | **1,617** |
| sitemap URLs | `generate-sitemap.js`; reported by `QUALITY GATE — sitemap eligibility` | **1,417** |

**Set comparison** (my normalisation: strip host, trailing `/`, `.html` and `/index`):

| Comparison | Count |
|---|---|
| pages in build, absent from sitemap | **200** |
| sitemap URLs with no built file | **0** |
| duplicate slash / `.html` variants | **0** |

**The 200-item difference is exactly this:**

* **199 pages are `noindex` by design** — 197 carry `robots: noindex, follow`, 2 carry `robots: noindex`
  (`/404`, `/og-image`). Buckets: `finance/` 160, `business/` 20, `homegarden/` 3, `embed/` 9, plus
  `/404`, `/cookies`, `/compare`, `/favorites`, `/history`, `/qa-dashboard`, `/og-image`.
  Code evidence: `scripts/ssg-pages.cjs` — "LONG-TAIL NOINDEX GUARD (SEO consolidation, option a) …
  emitted with robots noindex + canonical pointing at the PARENT tool page, and excluded from the
  sitemap (generate-sitemap.js mirrors this guard)"; user-dashboard pages (`favorites`/`history`/
  `compare`) noindex; `scripts/fix-deploy-seo.cjs` noindexes `qa-dashboard`/`og-image`;
  `scripts/generate-static-pages.cjs:126` sets `/cookies` to `noindex, follow`.
  Samples: `/finance/amortization/10-years-150000`, `/business/burn-rate/25000`, `/homegarden/solar-panel/10000`.
* **1 page is the Search Console verification file** `/googled1ac20b54b36e7cf` — it must never be in
  the sitemap.

`1417 + 199 + 1 = 1617` ✓. The build's own gates already encode this: the title-length gate reports
`pages scanned: 1417 (noindex skipped: 197)` and the crawl-link gate scans all `1617`.

**Conclusion: deliberate indexing policy, not a sitemap/build defect.** No important indexable page is
missing: 0 sitemap URLs lack a file, and all **1,417** sitemap URLs carry
`canonical = https://calcpromaster.com` (0 staging canonicals). Nothing was added to or removed from
the sitemap for this audit.

---

## 5. Tests and SEO gates — commanded, with exit codes

### 5.1 Gates run directly

| # | Command | Exit | Evidence |
|---|---|---:|---|
| 1 | `npm run lint:js` | 0 | 433 files checked, 0 failed |
| 2 | `npm run audit` | 0 | tool audit + `sync-counts --check`; all count refs match registry (1,282) |
| 3 | `npm run intros:check` | 0 | `matches the generator (1282 intros, 1282 unique)` |
| 4 | `npm run seo:overrides:check` | 0 | 66 CTR overrides, 47 label repairs, 0 undefined placeholders |
| 5 | `npm run seo:query-quality` | 0 | 1 flagged page — 1 accepted, 0 need a look |
| 6 | `npm run seo:url-format:check` | 0 | 1 WARN (U8 `/family/family-tree-generation/` category word repeated) |
| 7 | `npm run seo:guide-depth:check` | 0 | 17 guides up to date |
| 8 | `npm run seo:topic-depth:check` | 0 | 2 topic guides up to date |
| 9 | `npm run seo:index-regressions` | 0 | no new regressions or duplicate canonicals |
| 10 | `npm run cluster:check` | 0 | 70 cluster slugs in sitemap; 60 spokes→hub, 10 hubs→≥2 spokes |
| 11 | `npm run check:page-drift` | 0 | counts match baseline, no contentless pages |
| 12 | `npm run check:category-dup` | 0 | 20 pairs, mean overlap 54.2% (limit 65%), one owner per block |
| 13 | `npm run seo:overrides:verify` | 0 | 66 overrides + 47 repairs rendered in `deploy/` |
| 14 | `node scripts/audit-seo-placeholders.cjs` | 0 | P10 machine shapes in guide/hub/blog/premium: 0 findings |
| 15 | `node scripts/check-sitemap-coverage.cjs` | 0 | missing static file 0; 404 catch-all safe |
| 16 | `node scripts/seo-indexing-audit.cjs` | 0 | 1,417 URLs: 1,369 PASS / 48 WARN / **0 FAIL** / 0 noindex |
| 17 | `node scripts/audit-crawl-links.cjs` | 0 | uncovered 0 — every not-indexed page has an indexed inlink |
| 18 | `npm run seo:staleness` | 0 | every published artifact at least as new as its data |
| 19 | `node scripts/check-host-redirects.cjs` | 0 | pages.dev deep path 301 → apex; apex serves |
| 20 | `node build-deploy.js` | 0 | 1,509 SSG pages, sitemap 1,417, 0 broken links, all budgets met |
| 21 | `npm run test:unit` | 0 | 80 files / 2,542 tests passed |

### 5.2 Build gates inside `build-deploy.js` (all PASS, exit 0)

`QUALITY GATE — sitemap eligibility: 1417 URLs, 1416 prerendered checked, 0 failures` ·
`PERFORMANCE BUDGETS: eager-js 895KB/1600, index-html 82KB/90, styles 91KB/110, fonts 69KB/120, sitemap 250KB/600` ·
`TITLE-LENGTH GATE: 0 too short, 0 too long` · `CRAWL-LINK GATE: 112,124 internal links, 0 mismatches,
0 broken targets` · `fix-deploy-seo: 98 pages updated` · `review-dates: 1465 stamped`.

### 5.3 Warnings I investigated rather than hiding

* **48 indexing-audit WARNINGs**: 40 on `type: "other"` pages (`/guides/*`, `/blog/*`, `/stats`, `/embed`…)
  where `indexable` is false only because the audit's `indexable` flag whitelists
  `tool|category|home|hub|longtail|legal` (`seo-indexing-audit.cjs:185`) — the pages themselves are
  `canonical` + `robots: index, follow` + HTTP 200 + content (`/guides/emi`: 1,254 words). These are
  audit *classification* gaps, not page defects. Pre-existing (file unmodified by this task).
* The same report's metadata field `report.domain` is hard-coded to the retired
  `https://calcpromaster.netlify.app` (`seo-indexing-audit.cjs:28`, `:230`). Pre-existing at HEAD.
* `git diff --check` whitespace errors (§6.8) — a real Phase 7 blocking condition.

### 5.4 Non-existent scripts

Everything named in the task's gate list exists and ran, except **`overrides:check`** (the real name is
`seo:overrides:check` — run, #4) and **`placeholders`/`index-regressions` etc.** which exist only under
their `seo:`-prefixed names. No substitution was made silently.

### 5.5 Google Search Console (Phases 2–4 of the execution brief): **BLOCKED — verified live**

A read-only probe of the saved credential (no token values printed, nothing written):

```
getAccessToken(...) → OAuth refresh-token exchange failed (HTTP 400):
  {"error":"invalid_grant","error_description":"Token has been expired or revoked."}
```

So no fresh clicks/impressions/CTR/position, no Page Indexing export and no URL Inspection batch could
be retrieved. Every GSC-fed number in this report is therefore **cached evidence, not a live reading**:

| Cached GSC artifact | Window / date | Values |
|---|---|---|
| `data/gsc-query-page.json` (join) | 2026-09-09 → 2026-10-07 (28d) | 3,971 query→page rows; 9,900 pair impressions / 8 clicks; 14,338 total impressions / 18 clicks |
| `data/gsc-trend.csv` (last row) | 2026-09-29 (7d 2026-09-23..29, `.com`) | 5 clicks, 2,731 impressions, CTR 0.18%, avg position 26.9 |
| `data/gsc-coverage-report.json` | 2026-10-02 14:08 UTC | 1,167 URLs inspected: INDEXED 375 (32%), DISCOVERED 339, UNKNOWN 445, CANONICAL 3, REDIRECT 2, OTHER 3 |
| `docs/GSC-STATUS-REPORT.md` | — | documents the same dead token, 1,415-URL sitemap |

**Cannot conclude anything about a traffic decline.** The 7-day numbers moved 194 → 2,731 impressions
across the Netlify→Cloudflare property migration, which the existing report already attributes to the
new property starting to report; Search Console latency and the property switch make a like-for-like
read impossible without re-authorization. **No ranking, traffic or indexing claim is made here.**

To unblock: `node scripts/gsc-oauth-login.cjs --paste` (browser consent, then paste the
`localhost:3737/...` callback back into the terminal; the token lands in the gitignored
`gsc-refresh-token.json`). I cannot do that step for you.

### 5.6 Why `keywords:check` fails (expected, explained)

```
npm run keywords:check → exit 1
::error::keyword docs stale — run npm run keywords:fresh and commit
docs/KEYWORD-TARGETS.md   | 987 ++++++----
docs/KEYWORD-AUDIT.md     |  59 +--
docs/INTENT-AUDIT.md      |  44 +--
docs/HARD-KEYWORDS.md     |  23 +-
docs/KEYWORD-DIFFICULTY.md|  20 +-
5 files changed, 741 insertions(+), 392 deletions(-)
```

The script's contract is `keywords:fresh && git diff --exit-code -- <5 docs>`: it fails when
regeneration produces a **diff against `HEAD`**. These five files are regenerated from the current
`deploy/` tree + data modules and are **uncommitted in this working tree**, so the gate is red *by
construction* until they are committed. It is not evidence of invalid data: regeneration is
deterministic (§3.6). Nothing in the docs was edited by hand.

---

## 6. Final inventory, allowlist and blockers (Phase 6)

Baseline snapshot vs final snapshot **for this audit run**: `git status --porcelain` before = 476
entries, after = 476 entries, **identical** (`diff` produced no output) — i.e. the audit itself added no
untracked file at that point, and its gate runs rewrote only files that were already dirty. This report
file was then added (+1), and later work in the same session added the keyword maps (+4 more). My gate runs rewrote only files that were already
modified/untracked, `deploy/` is gitignored, and my scratch scripts/packages live in `%TEMP%`.

### 6.1 Files I changed

| File | Change | Why it is safe |
|---|---|---|
| `scripts/audit-cannibalization.cjs` | +8 lines: separate `linked === null` branch so an unread link is reported as unverified instead of as a working link | New file from this task; no decision/exit-code change (`seo:cannibal:check` still exit 0, same 0 actionable); `lint:js` and all 2,542 tests re-run green |

### 6.2 New file I created

`docs/SEO-CHANGE-AUDIT-2026-10-13.md` (this report) — documentation only, no runtime effect.

### 6.3 Allowlist — files a task-specific commit *could* contain once §6.8 is resolved

New guard + its artifacts: `scripts/audit-query-quality.cjs`, `scripts/audit-cannibalization.cjs`,
`data/query-quality-ledger.json`, `data/query-quality-audit.json`, `docs/QUERY-QUALITY.md`,
`docs/CANNIBALIZATION-REPORT.md`, `tests/unit/seo-audit-guards.test.js`, `.github/workflows/ci.yml`,
`.github/workflows/seo-panel-daily.yml`, `.github/workflows/seo-weekly-refresh.yml`, `package.json`,
`generate-intros.js`, `js/tool-intros.js`, the five `docs/KEYWORD-*.md` / `INTENT-AUDIT.md` docs.

### 6.4 Must be excluded (local-only or non-task)

`gsc-client-secret.json`, `gsc-refresh-token.json` (both gitignored — never stage), `.tmp-scan/`
(build logs + `gsc-daily.cjs` scratch), `.wrangler/`, `deploy/` (gitignored build output),
`wrangler.toml`, `stats.html`/`changelog.html`/`graph.html`/`geometry-lab.html` unless the owner
confirms they belong to this change set.

### 6.5 Needs owner clarification before staging (ambiguous ownership)

The other **190** modified files and most of the 264 untracked ones. They are a coherent-looking
trailing-slash/URL-format + content + generator-refresh change set on the branch
`seo/daily-index-panel`, but nothing in the prompt identifies them as this task's, and 44 untracked
`tests/unit/*.js` plus 73 untracked `docs/*` files cannot be assumed safe to include. I did not stage,
revert or delete any of them.

### 6.6 Pre-existing issues found (NOT introduced by this task → reported, not fixed)

1. `scripts/seo-indexing-audit.cjs:28` — `const DOMAIN = 'https://calcpromaster.netlify.app'`, published as
   `report.domain` at `:230`. Present at HEAD, and the script is unmodified in this working tree.
   Fix = point it at `https://calcpromaster.com` (the audit already validates the real host everywhere
   else, so this is report metadata + the `--live` probe target).
2. `js/site-config.js:19`, `index.html` (21 refs), `about.html` (3 refs) still reference the retired
   staging host. **Verified harmless in the build**: 0 of the 1,617 `deploy/` HTML files contain
   `calcpromaster.netlify.app`, and all 1,417 sitemap URLs have a `.com` canonical. Latent risk only —
   any path that ever serves the source shell verbatim (or the local `node server.js` preview) would
   emit a staging canonical. I did not touch these files.
3. `seo-indexing-audit.cjs:185` `indexable` whitelist omits `guide`/`blog`/`static`, producing 40
   false-negative WARNINGs.
4. `docs/GSC-STATUS-REPORT.md` still says the sitemap has 1,415 URLs; the build now emits 1,417.

### 6.7 Open risk: `js/tool-intros.js` regeneration scope

The single biggest review risk in this change set: 1,282 intro paragraphs were rewritten (1,100
changed values) rather than the one slug the brief describes. It is internally consistent and matches
its generator, but it is a site-wide copy change and deserves the owner's explicit sign-off before it
ships.

### 6.8 Phase 7 blocker: `git diff --check` fails

`git diff --check` exits **1** with **306 trailing-whitespace findings in 18 files**:
`js/data/regional.js` (272) plus `guides/{auto,business,career,construction,engineering,everyday,family,food,health-fitness,homegarden,lifestyle,loans-mortgages,math-statistics,regional,science,tax-salary,utilities}.html`
(2 each). Phase 7 requires `git diff --check` **and** `git diff --cached --check` to pass before a
commit, and `git diff --cached --check` already passes (nothing staged). I did not strip the
whitespace: it sits inside other contributors' in-flight edits, and rule 5/12 forbid touching work I
cannot attribute.

---

## 7. Commit details (Phase 7) — **no commit created**

Phase 12 of the execution brief says "Do not commit. Do not push. Do not deploy", and Phase 7's own
preconditions are not all met anyway:

| Precondition | Status |
|---|---|
| All required tests and SEO gates pass | ✅ 21/21 exit 0 (plus the documented `keywords:check` staleness gate) |
| 1,617 vs 1,417 explained with evidence, no unresolved indexing defect | ✅ §4 |
| Every proposed file reviewed | ⚠️ review targets ✅; 190 other modified + ~250 untracked files unreviewed/ambiguous |
| Staged set isolable from unrelated/pre-existing work | ✅ nothing staged (classification D empty) |
| `git diff --check` / `--cached --check` pass | ❌ `git diff --check` exit 1 (§6.8) |
| No deletions/churn/secrets/local artifacts | ✅ 0 deletions, secrets gitignored |

So: **nothing staged, nothing committed, nothing pushed, nothing deployed.** If a commit is wanted
later, the smallest safe path is (1) resolve §6.8 ownership, (2) stage by explicit path from §6.3 only,
(3) commit with `fix(seo): validate query quality and prevent audit regressions`, (4) re-run
`git status --short`, `git log -1 --oneline`, `git show --stat --oneline HEAD`.

---

## 8. Deployment and traffic status

* **NO production deployment. NO publish. NO remote push.** No workflow was triggered, no host
  configuration was changed, no DNS/hosting setting was touched.
* **No ranking, impressions, clicks or organic-traffic improvement is claimed.** All search data in
  this report is cached (last GSC pull 2026-09-29 trend / 2026-10-02 coverage / 2026-10-07 join) and
  the live credential is dead (`invalid_grant`). Any ranking or traffic statement requires fresh
  Search Console evidence after re-authorization and after deployment.
