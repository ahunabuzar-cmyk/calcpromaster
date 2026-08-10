# CalcProMaster — Weekly Indexing Monitor

GSC sitemap submit karne ke baad, site indexing-ready rahe ya nahi — ye ek command batata hai.
Koi signup/API nahi chahiye. Bas Node.js (project mein already installed) + optional Playwright.

## Ek command

```bash
node scripts/indexing-monitor.cjs
```

Exit code: **0** = sab healthy · **1** = koi indexing-health issue mila.

## Kya check hota hai (8 sections, sab LIVE URL ke khilaf)

| # | Check | Kyun zaroori hai |
|---|---|---|
| 1 | Homepage + 6 critical routes → HTTP 200 | Agar route 404/5xx hai to Google usse drop kar deta hai |
| 2 | sitemap.xml → 200, valid XML, ≥500 locs, 0 localhost, 0 dupes | Sitemap submit ho chuki hai — uska health = Google ka crawl plan |
| 3 | robots.txt → 200, no `Disallow: /`, sitemap declared | Ek galat rule poore site ko de-index kar sakta hai |
| 4 | Homepage canonical → live domain self-reference | Canonical wrong ho to ranking consolidation fail |
| 5 | Home/calculator/about → no `noindex` | Accidental noindex = page search se gayab |
| 6 | Missing assets → **true 404** (soft-404 nahi) | Soft-404 Google ko confuse karta hai |
| 7 | Core Web Vitals: CLS < 0.1 (GOOD), LCP measured | CWV ranking signal + user experience |
| 8 | Console errors = 0 (homepage, Playwright) | JS errors Googlebot rendering ko tod sakte hain |

## Example output (healthy)

```
RESULT: 23 passed · 0 failed
🟢 ALL INDEXING HEALTH CHECKS PASS — site remains indexing-ready.
   (sitemap: 778 URLs, all on live domain)
```

## Kab chalao

- **Har hafte** (recommended) — indexing process 2-4 hafte hoti hai, weekly check pehle 2-3 hafte zaroori.
- **Har deploy ke baad** — naya code indexing health tode na, isse confirm hota hai.
- **GSC mein koi drop/crash dikhe** — issue reproduce karne ka pehla tool.

## Alerts ke saath combine karo (optional)

GitHub Actions cron mein add karo taaki fail hone par issue/webhook mile:

```yaml
# .github/workflows/indexing-monitor.yml (example)
name: indexing-monitor
on:
  schedule:
    - cron: '0 5 * * 1'   # har Monday 05:00 UTC
  workflow_dispatch:
jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install chromium --with-deps
      - run: node scripts/indexing-monitor.cjs
```

Fail hone par job red hoti hai → GitHub Actions tab + (agar configure hai) email/webhook alert.

## GSC ke saath saath — real indexing data kahan dekho

Ye script **technical health** check karti hai. **Actually indexed pages** Google ke paas hota hai:

1. GSC → **Performance** → total clicks/impressions (traffic data)
2. GSC → **Pages** → "Indexed" count (crawl hone ke baad)
3. GSC → **URL Inspection** → kisi bhi calculator URL pe "Indexing allowed" / "Indexed"

> **Timeline:** sitemap submit ke baad Google 2-4 hafte mein crawl karta hai.
> Pehle hafta: "Discovered – not yet indexed" normal hai. 2-3 hafton mein "Indexed" dikhega.
