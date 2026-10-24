# 01 — Inventory summary

_Built 2026-10-13 by `node scripts/build-seo-improvement-pack.cjs`._

The inventory is **not a new one**. It is the repo's existing authoritative inventory
(`data/site-inventory.json`, built by `scripts/build-site-inventory.cjs` from the
prerendered `deploy/` tree) joined with the audits this task added. Creating a second,
competing inventory is exactly the drift the brief warns about.

## Counts

| Measure | Value |
|---|---|
| Sitemap URLs | 1417 |
| Inventoried pages | 1417 |
| HTML files in deploy/ | the prerendered pages are the source of truth for the build |
| Calculators / hubs / guides / blog / static / home | 1282 / 44 / 73 / 6 / 11 / 1 |
| Sitemap URLs vs inventoried pages | equal — no URL is missing an inventory row |

## Classification carried over (last full inventory run)

| Classification | Pages |
|---|---|
| major-improve | 790 |
| minor-update | 31 |
| keep-improve | 11 |
| investigate-indexing | 585 |

## Columns

url, source_file, page_type, category, primary_topic, title, meta_description, h1_count, canonical, robots, indexability, index_status, http_status_or_build, word_count, main_functionality, internal_link_count, sitemap_inclusion, duplicate_ratio, cannibalization_group, url_format_rules, structured_data, seo_classification, technical_issues, reassessment_status, improvement_checklist, last_audit_date

`structured_data` is read out of the built HTML for each page (not assumed), so a page
that lost its JSON-LD shows up as `none` rather than passing silently.

## Reproduce

```bash
node build-deploy.js                        # prerender deploy/
node scripts/build-site-inventory.cjs       # page table
node scripts/thin-page-report.cjs           # thin pages
node scripts/audit-url-format.cjs           # slug rules
node scripts/build-seo-improvement-pack.cjs # this pack
```
