# calcpro-next — Audit & Recommendation

Date: 2026-08-17 · Author: Phase 3 QA audit

## What it is

`calcpro-next/` is a prototype **Next.js 15 / React 19** re-implementation of the CalcProMaster
calculator platform. It is a *schema-driven engine* that reuses the **same** `js/data/*.js`
tool-suite files as the production vanilla SPA (single source of truth, no forked data).

- **Stack:** `next@15.1.6`, `react@19`, `recharts`, `tailwindcss`
- **Routes:** `/` (home), `/[category]`, `/[category]/[toolId]` (4 pages)
- **Engine:** `ToolEngine.jsx` — schema parser, debounced real-time calc, async-aware
  execution, URL query-param serialization (shareable results), scenario comparison,
  amortization table, export panel, km↔mi unit switcher, display-currency conversion
- **Shared data:** `lib/tools.js` imports all 20 `js/data/*.js` suites via a webpack alias
  (`@calcpro-js` → `../js`); `lib/runtime.js` side-effect imports `core.js` + `qrcode.js`
- **Git:** 25 files tracked; last modified **Aug 3, 2026** (2 weeks stale)

## Verification performed

| Check | Result |
|---|---|
| `next build` (production) | ✅ Compiled, 4 pages generated, no errors |
| Reuses shared `js/data` source of truth | ✅ (zero data drift risk) |
| Forward calculation via shared `calc()` | ✅ (uses same `Security`/`Charts` runtime) |
| Unit/currency conversion wrappers | ✅ implemented in `runCalc.js` |
| Reverse calculation (SolveFor) | ❌ **not wired** — no Goal-Seek/Solve-For UI |
| `calc-modes.js` runtime shim | ❌ **missing** — `LoanSolver`/`Compounding` are not imported |
| Service worker / offline / PWA | ❌ not present |
| SEO content / i18n / analytics | ❌ partial (`seo-content-lookup.js` exists, rest absent) |
| Production deployment | ❌ not deployed, not referenced in README/docs |
| CI coverage | ❌ not in any GitHub Actions workflow |

## Risk assessment

1. **No data drift** — the single most important property holds: `calcpro-next` consumes the
   exact same `js/data/*.js` files as production, so Phase 2/3 fixes (edge-case caps, Infinity
   guard, reverse declarations) are automatically shared. No consolidation of data needed.
2. **Missing `calc-modes.js` shim** — `lib/runtime.js` imports only `core.js` + `qrcode.js`.
   The finance suites reference `LoanSolver`/`Compounding` (e.g. `loan-emi.reverse`). A forward
   calc does not hit these, but any future reverse/advanced finance feature in Next would
   throw `LoanSolver is not defined`. One-line fix if ever used.
3. **Feature gap vs production** — no PWA/offline, no reverse calc, no trust layer, no a11y
   suite, no SEO meta injection beyond a lookup file. It is a *prototype*, not a replacement.

## Recommendation: KEEP as prototype — do NOT deploy, do NOT delete

**Consolidate (recommended):** Keep `calcpro-next/` in the repo as a documented migration
prototype. It is harmless (self-contained, shares data, builds clean) and preserves the
Next.js migration work for a future phase. Do **not** deploy it as the production site until
it reaches feature parity (PWA, reverse calc, SEO, a11y, analytics).

**Decommission only if:** the team has no near-term plan to migrate off the vanilla SPA.
Then delete the folder (it is fully reconstructible from `js/data/*` + this doc).

### If kept, two cheap hardening steps
1. Add `import '@calcpro-js/calc-modes.js'` to `lib/runtime.js` (fixes the LoanSolver gap).
2. Add a `next build` step to CI (in `ci.yml`) so the prototype never silently rots.

**Decision:** ✅ CONSOLIDATE — keep as prototype, do not deploy, do not delete.
