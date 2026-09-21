# CalcProMaster

**Live site: https://calcpromaster.netlify.app**

CalcProMaster is a free online calculator suite — **1,206+ calculators** across 20
categories, every page server-rendered with step-by-step results, FAQ schema, and
a mobile-first SPA shell.

## What's inside

| Category | Highlights |
|---|---|
| Finance | Loan EMI (with prepayment), SIP, compound interest, ROI, NPV/IRR |
| Health | BMI, BMR, body-fat, calorie, water intake, heart-rate zones |
| Math | Quadratic solver with steps, percentage, fraction, matrix tools |
| Construction | Concrete volume, paint coverage, tile, roofing, stairs |
| Conversion | 250+ unit converters (length, weight, temperature, data…) |
| …20 categories total | See the [full tool index](https://calcpromaster.netlify.app/hub) |

Also: [73 in-depth guides](https://calcpromaster.netlify.app/guides),
an [editorial policy](https://calcpromaster.netlify.app/editorial-policy), and a
hard-404 contract (unknown URLs return a real 404 — no soft-404 SEO leakage).

## Repo layout

```
index.html, js/, styles.css   # SPA shell + 1,206 tool definitions (js/data/*.js)
guides/, blog/                # static content pages (hand-written)
scripts/                      # build & QA pipeline (see below)
build-deploy.js               # → builds the deploy/ artifact (prerender + sitemap)
deploy/                       # upload target for Netlify (drag & drop or Git)
```

## Key scripts

```bash
node build-deploy.js                      # prerender all pages → deploy/
node scripts/check-sitemap-coverage.cjs   # gate: sitemap ↔ files ↔ 404 contract
npm run keywords:fresh                    # regenerate docs/KEYWORD-TARGETS.md + AUDIT
npm run keywords:check                    # CI: fail if those docs are stale
npm run audit:keywords                    # cannibalization / quality audit
npm run indexnow                          # submit all sitemap URLs to IndexNow
npx playwright test tests/e2e/deploy-smoke.spec.js  # routing + 404 contract tests
```

## SEO engineering notes

- Every sitemap URL is statically covered — enforced by
  `scripts/check-sitemap-coverage.cjs` in CI (1,331/1,331 green).
- Keyword targeting map: [`docs/KEYWORD-TARGETS.md`](docs/KEYWORD-TARGETS.md)
  (machine-extracted, auto-refreshed; quality audit in
  [`docs/KEYWORD-AUDIT.md`](docs/KEYWORD-AUDIT.md)).
- Rankings snapshot & method: [`docs/RANKINGS-CHECK.md`](docs/RANKINGS-CHECK.md).
- Domain plan: [`docs/CUSTOM-DOMAIN-PLAN.md`](docs/CUSTOM-DOMAIN-PLAN.md).
