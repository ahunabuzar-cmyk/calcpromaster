# Publish GitHub Pages — Reference Pages (owner steps)

The three reference files are ready and self-contained. Publishing needs the
GitHub account login, which is owner-only (an agent cannot sign in). Follow the
steps below exactly.

## Files ready to upload

In `docs/github-pages/`:

- `README.md` — repo landing page (links back to calcpromaster.com).
- `percentage-reference.html` — one-page formula reference.
- `unit-conversion-chart.html` — exact factor conversion chart.

All three are dependency-free, valid HTML, and reference `calcpromaster.com`
with correct relative links between them.

## Target

Repo: `ahunabuzar-cmyk/calcpromaster-tools`
Live base: `https://ahunabuzar-cmyk.github.io/calcpromaster-tools/`

Currently confirmed live: `index.html` and `emi-table.html` only.

## Steps (GitHub web UI — no CLI needed)

1. Open `https://github.com/ahunabuzar-cmyk/calcpromaster-tools` in a browser
   and sign in.
2. Click **Add file -> Upload files**.
3. Drag in `README.md`, `percentage-reference.html` and `unit-conversion-chart.html`
   from `docs/github-pages/`.
4. Commit directly to the `main` branch (message: `Add percentage and unit
   conversion reference pages`).
5. Wait 1-2 minutes, then open:
   - `https://ahunabuzar-cmyk.github.io/calcpromaster-tools/percentage-reference.html`
   - `https://ahunabuzar-cmyk.github.io/calcpromaster-tools/unit-conversion-chart.html`
   to confirm they load.
6. In **Settings -> Pages**, confirm Source is "Deploy from a branch", branch
   `main`, folder `/ (root)`. If the pages 404, this setting is usually why.

## After publishing (agent can do once the repo is available)

Link these reference pages from the main site (a follow-up, white-hat internal
link) and re-run the backlink tracker. The pages already link back to the
relevant calculators, so the link equity flows both ways.

## Notes

- These are genuine, useful reference pages (not thin or doorway pages), which
  is why they are safe for Google.
- Do not upload the whole deploy. Only these reference pages belong on GitHub
  Pages, to avoid duplicating the main site.
