# Reviewer Bylines & Per-Category Methodology — CalcProMaster

Snapshot: 2026-10-04

## What this is

Every calculator page and every category page shows:

1. **A per-category methodology note** — one short paragraph explaining how that
   category's numbers are produced (which conventions/formulas are used, and what
   the result does and does not mean).
2. **A "Reviewed by" byline** — shown **only** when a real, named reviewer with
   credentials is configured.

Both are produced by one shared module, `js/category-methodology.js`, so the
pre-rendered HTML (SSG, `scripts/ssg-pages.cjs`) and the hydrated DOM
(`js/app.js`) never disagree.

## Methodology notes

The module ships a paragraph for all 20 categories plus a default:

`finance, health, math, everyday, science, engineering, construction,
conversion, business, education, utilities, lifestyle, regional, food, fitness,
auto, career, homegarden, tech, family`

Rendered as:

```html
<div class="tool-methodology"><strong>Methodology:</strong> …</div>
```

To change a category's wording, edit the `METHODOLOGY` map in
`js/category-methodology.js`. Nothing else needs touching — the next build
(`node build-deploy.js`) propagates it to every page.

## Reviewer bylines — deliberately empty

The system ships with **no reviewers on purpose**. We never invent reviewer
names, credentials, or approval. A byline appears only after a **real person**
agrees to be named.

### How to add a real reviewer (no source edits)

Edit **`data/reviewers.json`** (the only file you touch), then build:

```json
{
  "finance": { "name": "Jane Doe", "credentials": "CFP", "url": "/about" },
  "_default": null
}
```

- `name` (required) — the reviewer's real name. An entry with no name is ignored.
- `credentials` (optional) — shown after the name, e.g. `CFP`, `RD`, `PE`.
- `url` (optional) — a site-relative bio link (must start with `/`).
- `_default` — applies to any category without its own entry.
- Keys starting with `_` (other than `_default`) are treated as comments.

Then run one of:

```
node scripts/apply-reviewers.cjs   # regenerate js/reviewers-data.js only
node build-deploy.js               # full build (runs the step automatically)
```

`scripts/apply-reviewers.cjs` validates the JSON and writes the generated
`js/reviewers-data.js` (do **not** hand-edit that file). `js/category-methodology.js`
reads it in both Node and the browser, so the byline lands in the pre-rendered
HTML and the hydrated DOM together.

Resulting markup:

```html
<div class="tool-byline"><strong>Reviewed by <a href="/about">Jane Doe</a>, CFP</strong></div>
```

## Honesty rules (do not break)

- **No invented names.** Leave a category null until a real reviewer is
  confirmed. A missing byline is correct; a fake one is a liability.
- **No "medically reviewed" / "expert verified" claims** unless that reviewer
  actually reviewed the content and their credentials are stated.
- The byline supplements, and never replaces, the existing "About this page"
  editorial block and the YMYL disclaimer on each page.
- A category-level byline claims review of the **category's content**. If only
  specific tools were reviewed, list those instead of setting a blanket byline.

## Where it renders

| Location | Emitted by |
|---|---|
| Every tool page (prerendered HTML) | `scripts/ssg-pages.cjs` (after the review block) |
| Every tool page (client hydrate) | `js/app.js` `renderTool()` |
| Every category page (prerendered) | `scripts/ssg-pages.cjs` category loop |
| Every category page (client) | `js/app.js` `renderCategory()` |

## Verification

Unit tests:

- `tests/unit/category-methodology.test.js` — asserts the module exposes its API,
  returns non-empty methodology for all categories, falls back for unknown keys,
  renders **no** byline while empty, and renders a correct byline once a reviewer
  object is set.
- `tests/unit/reviewer-flow.test.js` — asserts `data/reviewers.json` validation
  (real names only, site-relative URLs, comment keys ignored) and that the
  generated module exposes the map to Node and the browser.
