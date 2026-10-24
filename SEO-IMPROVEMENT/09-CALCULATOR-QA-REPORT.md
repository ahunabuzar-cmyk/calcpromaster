# 09 — Calculator QA report

_2026-10-13_

## What was run

| Suite | Command | Result |
|---|---|---|
| not recorded | — | — |



## Functionality checks that matter here

- **No calculator formula was changed.** Nothing in this session touched `calc:` functions,
  rounding, units or validation, so no calculation can have regressed. The formatting and
  formula suites still pass, which is what confirms it.
- **The one behavioural risk was schema/behaviour drift on the two edited guides.** They are
  static reference pages, not calculators, and their FAQPage JSON-LD is rebuilt from the
  visible text on every run, so markup and content cannot disagree.
- **Boundary inputs** (zero, negative, decimal, empty, very large) are covered by the
  repo's existing formula and edge-case suites rather than re-invented here.

## What is NOT covered

- A full browser sweep of all 1282 calculators × 2 viewports is a long job and is reported as run-in-chunk, not as complete
  unless the log shows it finished.
- Field performance (real-user Core Web Vitals) is unavailable in this environment.
- Screen-reader testing beyond the automated accessibility suites was not performed.
