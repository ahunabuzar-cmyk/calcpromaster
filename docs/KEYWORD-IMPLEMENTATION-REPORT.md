# Keyword opportunity implementation report

**Date:** 2026-10-13 · **Repository:** `C:/Users/ok/Documents/Calculator/project` (branch `seo/daily-index-panel`)
**Companion docs:** [KEYWORD-IMPLEMENTATION-MAP.md](KEYWORD-IMPLEMENTATION-MAP.md) (every keyword → decision),
[KEYWORD-GAP.md](KEYWORD-GAP.md) (audit output), [SEO-CHANGE-AUDIT-2026-10-13.md](SEO-CHANGE-AUDIT-2026-10-13.md) (change review).
**Deployment:** none. **Push:** none. **Commit:** none.

---

## 1. Verified audit totals (re-run today, not copied from an earlier report)

```
node scripts/audit-keyword-gap.cjs → exit 0
  inputs        : calculator-net-gap.csv, calculatorsoup-gap.csv, keyword-planner.csv, keyword-volume-difficulty.csv
  pages indexed : 1434
  keywords      : 604  (COVERED 463 / WEAK 12 / GAP 108 / IGNORE 21)
```

The historical figures in the brief (604 / 463 / 12 / 108 / 21 / 1,434 pages) **match the current
repository exactly** — they are verified, not assumed.

**The second ("user-export") audit — re-checked 2026-10-15: the export exists and is now traceable.**
The 88-keyword export is [`data/keyword-gap/keyword-volume-difficulty.csv`](../data/keyword-gap/keyword-volume-difficulty.csv)
— 88 data rows, committed in this repo. Re-audited today it reads
**64 COVERED / 4 WEAK / 18 GAP / 2 IGNORE = 88/88 rows classified**, so no row of that export can now be
silently dropped from the analysis:

```
node scripts/audit-keyword-gap.cjs                          # 604 unique from 608 input rows (4 dupes)
npx vitest run tests/unit/keyword-gap-agreement.test.js      # pins export <-> analysis agreement
```

`data/keyword-gap-verdicts.csv` holds one line per classified keyword (604 rows), and
`data/keyword-gap.json` records `inputRows` / `bySource` / `duplicateKeywords`, which is what reconciles
the counts (608 rows − 4 duplicate keywords = 604 unique). The `88 / 61 / 3 / 22 / 2` split quoted in the
brief **does not match this file** and remains unexplained; what is verified here is the export that
exists, not that number.

Refreshed totals, 2026-10-15 (same command, freshly built `deploy/`):

```
  pages indexed : 1424
  keywords      : 604 unique from 608 input row(s) (4 duplicate keyword(s) merged)
                  (COVERED 469 / WEAK 26 / GAP 88 / IGNORE 21)
  actionable    : 114 rows in 103 intent clusters — decisions B 34 · C 55 · D 7 · E 18
```

## 2. Decisions produced

`node scripts/build-keyword-implementation-map.cjs` (new, deterministic, re-runnable) turns the audit
into one row per keyword: **120 actionable rows** (108 GAP + 12 WEAK) in **108 intent clusters**.

| Code | Meaning | Keywords | Intents |
|---|---|---:|---:|
| A | new standalone calculator required | **11** | 11 |
| B | existing page needs improvement (no new URL) | **17** | 17 |
| C | existing page covers it — linking/metadata only | 69 | 66 |
| D | shares one intent with other keywords — one shared page | 11 | 2 |
| E | insufficient evidence / external data / not worth building | 12 | 12 |

Priorities: **P1 11 · P2 97 · P3 12 · P0 0**

(A/B moved 15/13 → **11/17** after the Phase-1 duplicate review below.)

### Phase 1 validation — the two reported misclassifications are confirmed and corrected

| Candidate | Was | Now | Evidence |
|---|---|---|---|
| `bank certificate calculator` (165,000) | A | **B → `/finance/cd-calculator`** | the audit's own sibling row `calculator for certificate of deposit` already maps to that live page; the shared token "certificate" was hidden by the extra word "bank". Fixed by the generator's **near-synonym guard** (a candidate can no longer become a new page while another row for the same noun has a live target). The guard also rescued `calendar calculator` → `/guides/age` and `compounded annually calculator` → `/regional/post-office-savings` |
| `ft2 calculator` (165,000) | A | **B → `/conversion/area/`** | "ft2" shares no token with the audit's `ft squared calculator` (tokens: ft, squared), so equality clustering could not see it. `/conversion/area/` ("Area Converter — convert between area units") **is in `deploy/sitemap.xml`**. Recorded as an explicit, evidence-commented override in the generator so it cannot drift back |

### The 11 remaining A candidates — Phase 1 verdict

Only **two** look like genuine new-tool intents: **`polypeptide calculator`** (301,000, diff 6) and
**`proportion calculator`** (90,500, diff 0). The other nine (`simplify`, `fv`, `open`, `smart`,
`dob`, `downloadable`, `show`, `google math`, `calculator that prints`) read as ambiguous or navigational
queries, not distinct calculator intents — they should be resolved as C (metadata/internal-link) or E,
and they are **recommended for owner review rather than built**. No page was built for any of the 11 in
this session. (P0 is empty because the audit found no broken page or
critical correction — the 12 WEAK rows are all "existing page exists but targets the query weakly",
which is P1/P2 work, not a defect).

### P1 — the ten highest-evidence opportunities

| Priority | Code | Concept | Volume | Diff | Target |
|---|---|---|---:|---:|---|
| P1 | D | peptides/peptide calculator (2 kw) | 301,000 | 6 | one shared page |
| P1 | A | polypeptide calculator | 301,000 | 6 | new page |
| P1 | D | convert currency xe (2 kw) | 246,000 | 55 | consolidate into the existing converter |
| P1 | A | bank certificate calculator | 165,000 | 2 | new page — **review first: may be the CD calculator** |
| P1 | A | ft2 calculator | 165,000 | 9 | new page — **review first: may be area/square-footage** |
| P1 | D | certificate of deposit (3 kw) → `/finance/cd-calculator` | 165,000 | 2 | improve the live CD page |
| P2… | | (98 remaining rows in the map) | | | |

### Honest limitations of the map

* The classifier is **rule-based** (rules 1–5 are printed next to every row). The **D** clustering and
  the **B** "audit maps it to a live page" results are mechanical and safe.
* The **A** and **C** verdicts are token-match heuristics. Two visible artefacts: `bank certificate
  calculator` and `ft2 calculator` landed in **A** even though a near-synonym sits in the audit
  (`calculator for certificate of deposit` → `/finance/cd-calculator`, `ft squared calculator` → C),
  because the extra token defeats equality-based clustering. Inspect the `Why` column before building
  anything from a A/C row — that is exactly what the printed rule is for.
* No search volume, difficulty, CPC, ranking or traffic figure was invented anywhere: every number
  comes from the audit row, and `—` means the audit had no value.

## 3. What was implemented in this session

| Item | Status | Evidence |
|---|---|---|
| Keyword audit re-run + reconciliation | ✅ done | §1, exit 0, figures match |
| Keyword→URL implementation map (deliverable 1) | ✅ done | [KEYWORD-IMPLEMENTATION-MAP.md](KEYWORD-IMPLEMENTATION-MAP.md) + `data/keyword-implementation-map.json` |
| This report (deliverable 2) | ✅ done | this file |
| `KEYWORD-GAP.md` regenerated | ✅ done | audit writes it |
| GSC status doc refreshed (requested) | ✅ done | [GSC-STATUS-REPORT.md](GSC-STATUS-REPORT.md) — 1417 sitemap, live `invalid_grant` re-check, exact paste-mode steps |
| **Intro rewrites verified (requested)** | ✅ done | §4 — 1,282/1,282, **0 genuine input mismatches** |
| **Lazy-load category data / 101 KiB homepage JS (requested)** | ✅ done + measured | §5 — **104.1 KiB gzip removed from the homepage idle path** |
| **Production deployment safety check (requested)** | ✅ done (read-only) | §6 — no deploy performed |
| Phase-1 validation of the A candidates (duplicate first) | ✅ done | §2 — both reported misclassifications corrected with sitemap evidence; A 15 → 11, B 13 → 17 |
| New calculator pages from A candidates | ❌ **not built** | §7 — 11 candidates validated, none implemented (only 2 read as genuine tool intents) |
| Existing-page improvements from B/C candidates | ❌ **not done** | §7 — 86 rows classified, none edited |
| **Whitespace/line-ending blocker cleared** (requested) | ✅ done + verified | 18 files stripped, `js/data/regional.js` normalised from mixed CRLF to LF → **`git diff --check` now exits 0** (was exit 1, 306 findings). Data integrity re-verified (82 regional tools, identical id/name/desc), then lint 434/0, 80 files / 2,542 tests, build exit 0, 1,417 sitemap URLs, 0 broken links |
| **Intro quality audit** (requested) | ✅ done | [TOOL-INTRO-QUALITY-AUDIT.md](TOOL-INTRO-QUALITY-AUDIT.md) — all 1,282 entries: 0 incorrect, 0 duplicated, 0 input mismatches, 0 category mismatches; 8 superlative flags all false positives; the one real observation is template reuse (15–34% per sentence) |
| Cannibalization cross-check of the A candidates against live pages | ✅ done for the reported cases | §2; the near-synonym guard now covers the same-noun case mechanically |

## 4. Intro rewrites — verification (requested)

Every regenerated intro was checked against the live registry with a read-only script
(no file written, no metric invented):

| Check | Result |
|---|---|
| registry tools (from the 20 `js/data/*.js` files) | **1,282** |
| intros in `js/tool-intros.js` | **1,282** |
| tools with **no** intro | **0** |
| intros with **no** registry tool | **0** |
| **duplicate** intro strings | **0** |
| intros that name concrete input labels | 1,175 |
| intros using generic wording ("Drop in your values") | 107 — honest, just less specific |
| intros naming an input the tool does **not** have | **0 genuine** (15 flags were my parser splitting inside parenthetical hints like `Direction (0=south, +north)`, `Debts (comma sep)`, `(excl GST)`) |

Conclusion: the 1,282-paragraph rewrite is **internally consistent with the registry** — right count, no
duplicates, no intro describing an input its calculator does not have. Its *copy quality* (tone,
repetition across 1,282 paragraphs) is a human editorial judgement this check cannot make.

## 5. Homepage JavaScript — the 101 KiB, fixed and measured

**What the homepage was loading** (measured in the browser on the 2026-10-13 build, before the fix):

| Chunk | raw | gzip |
|---|---:|---:|
| `js/data/finance.js` | 313,415 | **73,611** |
| `js/data/math.js` | 128,443 | **32,984** |
| `js/data/health.js` | 79,060 | 22,280 |
| `js/data/everyday.js` | 58,543 | 16,540 |
| `js/data/utilities.js` | 35,178 | 11,109 |
| **finance + math** | 441,858 | **106,595 = 104.1 KiB** ← the audit's "101 KiB" |

**Cause.** `loadEagerIdle()` warmed the four "popular" chunks at idle on every homepage visit, purely as
a head start for navigation.

**Fix (2 files).** `js/data-loader.js` gains `loadEager()` (warm now, exported) and `js/app.js` warms
those chunks on the **same first-interaction signal** already used for the 16 niche chunks
(`pointerdown` / `keydown` / `touchstart` / `scroll`, `{once:true, passive:true}`).

**Correctness is not affected:** the homepage blocks render from `js/home-tools.js` seeds (164 tools,
names + descriptions), category counts are static (`SITE_CONFIG.catCounts`), and every navigation calls
`DataLoader.ensure()` — which shares the in-flight promise, so the interaction-triggered warm and the
navigation never double-fetch.

**Measured before/after (same local server, same build pipeline):**

| | idle homepage data requests | tools in `ALL_TOOLS` at idle |
|---|---|---|
| before | `utilities, finance, health, math, everyday` (5) | 486 |
| after | `utilities` (1) | 32 |

**141.9 KiB gzip removed from the idle homepage** (204,512 bytes: finance+math+health+everyday), of which
**104.1 KiB is finance+math**.

**Behaviour preserved (verified in the browser after the fix):**
* after a single `pointerdown` all 20 chunks load and `ALL_TOOLS` = **1,282** (full registry) →
  search, category pages and counts recover on first interaction;
* `/finance/loan-emi/` (deep link with query params) renders the calculator — `h1` "Loan EMI Calculator",
  inputs present, result panel present, **no 404**;
* console on both pages: only `CalcPro initialized — calculators loaded`, **0 errors**.

**Honest trade-off:** a visitor whose *first* action is a click into a popular category now waits for that
chunk instead of finding it pre-warmed. That is the intended lazy-loading trade (bytes for bounce
visitors vs a few ms for the first navigation), and it is reversible by calling `loadEagerIdle()` again.

## 6. Production deployment safety check (requested) — nothing deployed

| # | Check | Result |
|---|---|---|
| 1 | SEO fixes present in the latest build | ✅ rebuilt today: `SSG complete: 1509 static pages`, 0 broken internal links, `fix-deploy-seo` applied, review dates stamped |
| 2 | Correct production domain + target | ✅ **calcpromaster.com** (`js/site-config.js: domain: 'calcpromaster.com'`), served from **Cloudflare Pages, project `calcpromaster`, direct upload of `deploy/`** (`wrangler.toml` + `package.json`) |
| 3 | Git diff / secrets | ✅ 0 staged, 0 deletions, `deploy/` is gitignored; `gsc-client-secret.json` + `gsc-refresh-token.json` are **gitignored**; no secrets/tokens/`.env` inside `deploy/` (the two `*token*` hits are legit static pages/og images). ❌ **212 modified + 269 untracked files are still unreviewed as a set** — do not stage blind (baseline before this session: 212 modified + 264 untracked; this session added 5 untracked files: `docs/KEYWORD-IMPLEMENTATION-MAP.md`, `docs/KEYWORD-IMPLEMENTATION-REPORT.md`, `docs/SEO-CHANGE-AUDIT-2026-10-13.md`, `scripts/build-keyword-implementation-map.cjs`, `data/keyword-implementation-map.json`) |
| 4 | Build + required tests | ✅ `build-deploy.js` exit 0 (all perf budgets PASS), `lint:js` 434 files 0 failed, `test:unit` 80 files / 2,542 tests pass, page-drift OK, query-quality 0 pending, `cannibal:check` exit 0 |
| 5 | `npm run deploy:cf` target | `node build-deploy.js && npx --yes wrangler@latest pages deploy deploy --project-name=calcpromaster` → **direct upload of the local `deploy/` folder to the Cloudflare Pages project `calcpromaster`**. It does *not* touch git, DNS or secrets. It **is** a production publish for that project (Pages serves the custom domain) |
| 6 | Risks before you approve | ① `deploy:cf` publishes straight to the live domain — there is no separate staging project, so `wrangler pages deployment` history is the only rollback; ② `_redirects` is Netlify-style but Cloudflare Pages honours it — the current build's redirects are unchanged by this session; ③ the 1,282-paragraph intro rewrite goes live with this build (site-wide copy change, owner sign-off advised); ④ GSC token is dead, so post-deploy indexing can only be measured after re-auth; ⑤ `git diff --check` still reports 306 trailing-whitespace findings in 18 files |

**Exact command (do not run until you approve):**

```bash
cd /c/Users/ok/Documents/Calculator/project
npm run deploy:cf
# = node build-deploy.js && npx --yes wrangler@latest pages deploy deploy --project-name=calcpromaster
```

**Changes that would go live:** everything currently in `deploy/` — i.e. the 1,509 SSG pages + copied
pages (1,617 HTML files), the 1,417-URL sitemap, the regenerated keyword/intent docs (not served),
the label/CTR overrides, and today's lazy-load JS change. Nothing has been uploaded.

## 7. Remaining work (explicit, nothing marked done that is not)

Batch 2 — in priority order, from [KEYWORD-IMPLEMENTATION-MAP.md](KEYWORD-IMPLEMENTATION-MAP.md):

1. **P1-A candidate:** `polypeptide calculator` (301,000) — the only high-volume A row that survived the
   duplicate review with a clear intent. `proportion calculator` (90,500) is the second.
   Each needs: a real `calc()`, an input validation path, examples/formula explanation, registry entry,
   sitemap inclusion, internal links from the category hub, and unit tests for normal + edge + invalid input.
2. **P1-B:** improve `/finance/cd-calculator` for the three certificate-of-deposit variants (165k each)
   — the page exists and ranks weakly; the fix is content/intent alignment, not a new URL.
3. **P1-D:** consolidate `convert currency xe` (246k) and the peptide cluster into one page each.
4. **P2:** the remaining 98 rows (13 B, 66 C intents, 11 D) — metadata, internal links and content depth.
5. **Cross-check every A/B decision against the live page inventory before building** (Phase Seven of the
   brief) — write the conflict list into the map rather than trusting the token heuristic.
6. Re-run `npm run keywords:fresh` + commit the 5 generated docs so `keywords:check` goes green.

## 8. Verification run for this report

| Command | Exit | Result |
|---|---:|---|
| `node scripts/audit-keyword-gap.cjs` | 0 | 604 keywords (463/12/108/21), 1,434 pages |
| `node scripts/build-keyword-implementation-map.cjs` | 0 | 120 rows, 108 clusters, A15/B13/C69/D11/E12 |
| intro verification script (read-only) | 0 | 1,282/1,282, 0 missing, 0 extra, 0 duplicates, 0 real mismatches |
| `node build-deploy.js` | 0 | 1,509 SSG pages, 1,417 sitemap URLs, 0 broken links, all budgets PASS |
| `npm run lint:js` | 0 | 434 files, 0 failed |
| `npm run test:unit` | 0 | 80 files / 2,542 tests passed |
| `npm run check:page-drift` | 0 | counts match baseline, no contentless pages |
| `npm run seo:query-quality` | 0 | 1 flagged page, 1 accepted, 0 pending |
| `node scripts/audit-cannibalization.cjs --fail-on-actionable` | 0 | 0 actionable pairs |
| browser check (local, `deploy/` on :3100) | — | idle: 1 data request; after interaction: 20 chunks, ALL_TOOLS 1,282; `/finance/loan-emi/` renders, 0 console errors |

## 9. Unverified / blocked

* **Google Search Console:** live call fails (`invalid_grant`, "Token has been expired or revoked",
  re-verified 2026-10-13). No live indexing, coverage, query or traffic figure exists. `node
  scripts/gsc-oauth-login.cjs --paste` is the only way forward and needs your browser step.
* **The 88-keyword user-export audit:** its input file is not in the repository → unverified.
* **Rankings / traffic / indexing:** no claim is made anywhere in this report. Local tests prove the
  build, the wiring and the byte counts — nothing more.
