# Audit verification, traffic evidence and the GSC blocker — 2026-10-13

> Closes the last open items from this session: verify the external audit's homepage
> claims against production *and* the source, report what the traffic numbers
> actually show, state the Search Console blocker, and triage the Lighthouse items.
> Everything below was measured today; the raw commands are in each section.

## 1. External audit claims vs production vs source

Production was fetched in a browser today (`https://calcpromaster.com/`, rendered DOM
and JSON-LD read from the live page). Local = working tree + `deploy/` rebuilt locally.

| Audit claim | Live production | Working tree / local `deploy/` |
|---|---|---|
| Meta description too long (>160) | **188 chars** — `"CalcProMaster — 1282+ free online calculators: loan EMI, mortgage, BMI, percentage, unit conversion and more across 20 categories. Step-by-step solutions, formulas and charts — no sign-up."` | **158 chars**, within the repo's 90–160 band |
| Stale "211 financial calculators" count | **present once** in the rendered text | **absent** — says 1282+, matching the registry |
| Second `FAQPage` schema | **2 JSON-LD blocks**: one `@graph` containing `Organization/WebSite/WebApplication/BreadcrumbList/FAQPage` and one standalone `FAQPage` | **1** |
| Duplicate visible FAQ block | **not reproduced** — one FAQ `<h2>`, no duplicated question text (37 `<h3>` total, 0 duplicates) | one FAQ block |

**Verdict:** the audit was describing production accurately; the duplicate *visible*
FAQ block could not be reproduced, and the other three claims are real **on the live
site** and already fixed **in the source**.

Which means the finding that matters is not in the audit:

> **Production is serving a stale build.** The live title is the old
> `"…for Finance, Health, Math & More"`, the live description is the pre-trim version,
> and the live page still ships two FAQPage schemas. It is a working-tree state from
> *before* today's homepage fixes: the live page already carries the 1282+ count
> (so it is newer than `HEAD`, whose description is the same 188-char wording at the
> 1219+ count) but not the trimmed description or the single-FAQ fix.
>
> There is **no deploy workflow** in `.github/workflows/` (analytics, ci, indexnow,
> seo-panel-daily, seo-weekly-refresh, smoke). `deploy/` is untracked build output and
> publishing is manual: `npm run deploy:cf` (= `build-deploy.js` + `wrangler pages deploy`).
>
> So the fixes verified locally are **not live**. Launching the deploy is the owner's
> call — it was not authorized in this session, and nothing in the repo deploys
> automatically.

## 2. Traffic: what the data actually shows

Sources: `data/gsc-trend.csv`, `docs/SEO-MOVEMENT-2026-10-11.md`,
`data/gsc-coverage-report.json`, `docs/GSC-STATUS-REPORT.md`.

- **The only literal drop in the data is a property artifact.** The `netlify.app`
  property stops reporting: 2 clicks / 194 impressions on 2026-09-25, then **0** on
  2026-09-26 and 2026-09-27. The site moved to `calcpromaster.com` in that window, so
  those zeros are the old property going quiet, not demand disappearing.
- **The new property's first row (2026-09-29):** 5 clicks, 2,731 impressions,
  CTR 0.18%, average position 26.9 — impressions up ~14× versus the old property's
  last reading (194).
- **Run-rate (2026-10-11 report, window 2026-09-28 → 2026-10-04):** 1,241
  impressions/day ≈ 37,767/month; 3-day 1,380/day; 28-day average 480/day.
- **The real number is clicks, not impressions:** 28-day clicks **17**, CTR **0.1%**,
  average position **36.7**; 186 pages earned impressions.
- **Indexation (2026-10-02):** 375/1,167 indexed (32%), 339 discovered-not-crawled,
  445 unknown, 3 canonical, 2 redirect.

**Read:** there is no measured traffic collapse. The impressions ramp is positive and
the bottleneck is *position and CTR* — the pages rank on page 3–4 and nobody clicks.
The one way to manufacture a "traffic drop" from this data is comparing the 28-day
average (480/day) with the 7-day run-rate (1,241/day): the 28-day window is diluted by
the pre-migration days and lags the ramp by 2.6×. That trap is already documented in
`docs/SEO-MOVEMENT-2026-10-11.md`.

**Limits:** every number above stops at **2026-09-29** (trend) and **2026-10-02**
(coverage). It is not a current reading.

## 3. The blocker: Search Console access is dead

- `gsc-refresh-token.json` (written 2026-10-05) returns `invalid_grant` — expired or
  revoked. The GA4/GSC scripts therefore cannot pull anything new.
- Consequence: today's clicks/impressions/position and the current indexed count are
  **unknown**, and no claim of "traffic dropped after X" can be confirmed or refuted
  from this repo. Reported as a blocker, not a pass.
- To restore: `node scripts/gsc-oauth-login.cjs --paste` (server-mode login cannot work
  in this environment — the `localhost:3737` callback refuses). Approve the consent
  URL, paste the callback URL back; the token rewrites and the scripts work again.
  Then `npm run seo:exposure` + `npm run seo:index-velocity` give a fresh reading.

## 4. Checks re-run after today's edits

| check | command | result |
|---|---|---|
| JS syntax | `node scripts/syntax-check.js` | 432 files, **0 failed** |
| Unit tests | `npx vitest run tests/unit` | **80 files / 2,542 tests pass** (incl. new `tests/unit/keyword-gap.test.js`) |
| Count consistency | `npm run check:counts` | PASS (registry 1282) |
| Guide depth | `npm run seo:guide-depth:check` | up to date (17 guides) |
| Page-count drift | `npm run check:page-drift` | PASS (thin 135, stuck 208 unchanged) |
| Cluster links | `npm run cluster:check` | PASS (70 slugs present) |
| Sitemap coverage | `node scripts/check-sitemap-coverage.cjs` | PASS (1,417/1,417) |
| Performance budgets | `node scripts/perf-budgets.cjs` | PASS (eager JS 1427/1600KB · index 82/90KB · CSS 91/110KB · fonts 69/120KB · sitemap 250/600KB) |

## 5. Lighthouse triage — homepage, `deploy/`, mobile emulation

Two runs on `http://localhost:3210/` (the project's own `server.js` serving `deploy/`):
performance **65** and **77**, SEO **100**, accessibility **98**. LCP 5.0 / 5.5 s,
TBT 60 / 80 ms, CLS 0.065 / 0.216, TTI 5.6 s, page weight 578 KiB.
The perf score itself is noisy on localhost (the committed
`data/cwv-baseline.json` records 80 / LCP 3.4 s for the same page), so the *items* are
more useful than the score.

| # | Item | Evidence | Effort | Action |
|---|---|---|---|---|
| 1 | **Unused JavaScript, 101 KiB** | `js/data/finance.js` 44.6K wasted (of 72K), `js/app.js` 38.4K (of 47.6K), `js/data/math.js` 20.7K (of 33K) — the homepage eagerly loads per-category data it never renders | Medium | Load `js/data/*.js` with the category page instead of the shell. Biggest single win (~590 ms est.) |
| 2 | **CLS from `#daily-tip-widget`** | Layout-shift culprit: `body > main#mainContent > div#daily-tip-widget` — injected into `<main>` after first paint | Low | Reserve its space (`min-height`) or emit it in the SSG output so it exists at first paint |
| 3 | **Heading order** | `div.calc-of-day-card … h3` and `div.tools-grid .tool-card h4` skip a level after the `h1` | Low | Make the sequence h1 → h2 → h3 on the homepage |
| 4 | **A11y name mismatch (WCAG 2.5.3)** | `#reading-toolbar > button` (×2), `#cpm-bottom-nav .bn-item`, `#donation-widget .donation-link` — visible text missing from the accessible name | Low | Align `aria-label` with the visible label |
| 5 | **Unused CSS 14.5 KiB / unminified JS 11 KiB, CSS 2 KiB** | `styles.css` 17.6 KiB transferred, 14.5 KiB unused on the homepage | Low–Medium | Minify in `build-deploy.js`; consider inlining critical CSS for the shell |
| 6 | **LCP 5.0–5.5 s** | One run's biggest fail; the committed baseline says 3.4 s for the same page | — | **Measure on production first** (after deploying) before optimizing — this is the item most likely to be localhost noise |

The perf *budgets* all pass, so nothing here is a build failure; items 2–4 are
contained correctness/a11y fixes, and item 1 is the only one with a meaningful
performance payoff.

## 6. What remains open

1. **Deploy production** (`npm run deploy:cf`) so the homepage fixes are live — until
   then the external audit's claims remain literally true of the site.
2. **Re-auth Search Console** (`--paste` flow) before making any traffic claim.
3. **Optional, from §5:** lazy-load per-category data (item 1), reserve
   `#daily-tip-widget` space (item 2), heading order (item 3), accessible names (item 4).
