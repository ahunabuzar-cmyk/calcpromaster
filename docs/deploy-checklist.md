# CALCPROMASTER — PRODUCTION DEPLOY + INDEXING CHECKLIST

When Netlify credits are available, follow this exact order. The `deploy/`
folder is already built and **774/774 SEO index-ready** — the live site is
still serving the old SPA shell, which is the root cause of the
"Crawled/Discovered – currently not indexed" GSC report.

---

## STEP 1 — Build locally (already done, re-run to be safe)

```bash
cd project
npm run lint:js          # 113 files, 0 failed
npm run test:unit        # 800+ tests
node build-deploy.js     # writes deploy/ with 774 static pages + SW cache
node scripts/seo-indexing-audit.cjs   # must show PASS: 774 | FAIL: 0
```

## STEP 2 — Deploy to Netlify

### Option A — Drag & drop (no CLI needed)
1. Open https://app.netlify.com → your site → **Deploys** → **Drag and drop**
2. Drop the **`deploy/`** folder (not the repo root).
3. Wait for the deploy to finish (the 774 static pages take a few minutes).

### Option B — Netlify CLI (if you want it scriptable)
```bash
npx netlify deploy --prod --dir=deploy
```

### Option C — Git push (if CI deploy is configured)
The `smoke.yml` workflow deploys on push to `main` when the Netlify token
secret is set.

## STEP 3 — Verify the deploy (critical, do NOT skip)

```bash
# Every route must now serve UNIQUE HTML (not the shared SPA shell)
curl -sL https://calcpromaster.com/finance/loan-emi | grep -o "<title>[^<]*</title>"
#   → must show "Loan EMI Calculator – Monthly Payment & Interest"
curl -sL https://calcpromaster.com/health/bmi | grep -o "<title>[^<]*</title>"
#   → must show the BMI-specific title

# Full 774-URL audit against the LIVE site
node scripts/seo-indexing-audit.cjs --live
#   → must show PASS: 774 | FAIL: 0 (it was 6 PASS / 766 FAIL before deploy)
```

Also verify:
- `/robots.txt` → 200, `Allow: /`, `Sitemap: https://calcpromaster.com/sitemap.xml`
- `/sitemap.xml` → 200, valid XML, 774 URLs
- `/cookies` → **noindex** (intentional — thin compliance page)
- `/favicon.ico`, `/manifest.webmanifest`, `/sw.js` → all 200

## STEP 4 — IndexNow (Bing) — instant discovery

```bash
# dry run first (no network)
npm run indexnow:dry

# real submission — pings Bing/Yandex/Seznam/Naver for all 774 URLs
npm run indexnow
```

Requires the key file `0e1100ec6bc9d4c2c6037d993fc2ba55.txt` at the site
root (already in deploy/). Verify at
https://www.bing.com/webmasters → URL Submission.

## STEP 5 — Google Search Console crawl requests

1. https://search.google.com/search-console → **URL Inspection**
2. Paste the homepage → **Request Indexing**.
3. Repeat for the most important pages (Google allows limited requests):
   - `/`
   - `/finance/loan-emi`
   - `/health/bmi`
   - `/math/percentage`
   - `/conversion/length`
4. In **Sitemaps**, re-submit `https://calcpromaster.com/sitemap.xml`.

## STEP 6 — Monitor indexing recovery (1–4 weeks)

GSC **Page indexing** should shift from:

| Before | After (expected) |
|---|---|
| Indexed: 60 | Indexed: grows week over week |
| Discovered not indexed: 718 | → mostly indexed / crawled |
| Crawled not indexed: 3 | → 0 (pages now have unique content) |
| Excluded by noindex: 1 | → 1 (cookies — intentional) |

**Do NOT expect 774/774 indexed immediately.** Google decides indexing
priority. The deploy makes every genuinely valuable page *technically
eligible*; the crawl requests + IndexNow accelerate discovery.

## Rollback

If anything breaks, Netlify keeps previous deploys — open the site →
**Deploys** → click the last good deploy → **Publish deploy**.

---

## Current status (at the time of writing)

| Check | Status |
|---|---|
| deploy/ SSG audit | ✅ 774/774 PASS |
| Live site audit | 🔴 766 FAIL (old shell — deploy pending) |
| IndexNow script | ✅ ready (774 URLs, 1 batch) |
| CI gate (SEO audit) | ✅ wired into `.github/workflows/ci.yml` |
| Reverse calc | ✅ 56 tools enabled |
| Voice input | ✅ every numeric input on every tool |