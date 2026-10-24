# DEPLOY HANDOFF — calcpromaster.com (2026-10-03)

Aap ka 2-minute kaam. Agent sab kuch build kar chuka hai; sirf drag-drop baqi hai.

## Kya deploy ho raha hai (aaj ke changes)

- 5 naye regional salary/tax calculators: Kenya, Nigeria, Philippines, Bangladesh, Egypt
- 183 weak meta descriptions clean (0 flagged baqi)
- 26 top-page titles rewrite (page-2 fastest wins + page 3-4)
- 16 extra position 20-50 pages par unique formula + verified table + internal links (ab kul 36 enhanced pages)
- Egypt worked example ka math theek kiya (net EGP 23,472)
- Sitemap ab 1,350 URLs, quality gate PASS

Build status: SSG 1,451 pages · quality gate PASS (0 failures) · perf budgets PASS · review dates stamped 2026-10-03.

## Steps (2 minute)

1. `deploy/` folder tayyar hai (project root ke andar). Netlify par jao: https://app.netlify.com
2. Apni site (calcpromaster.com) kholo → **Deploys** tab.
3. **Drag and drop** area mein poora `deploy/` folder gira do (folder ka andar, repo root nahi).
4. Deploy complete hone tak wait (1,451 pages, kuch minute).
5. Publish ho jaye to niche wala verify step chala lo (agent ne command likh di hai).

## Deploy ke baad verify (agent ye kar sakta hai)

Agent ko bolo "deploy verify karo" — wo ye chalayega:

- `curl -sL https://calcpromaster.com/regional/kenya-take-home-salary | grep title` → Kenya-specific title
- `/sitemap.xml` → 1,350 URLs
- `/robots.txt` → Allow + sitemap line
- 5 naye regional pages 200 return karein
- IndexNow ping (Bing/Yandex) → `npm run indexnow`

## Deploy ke baad user ke 2 aur kaam

1. **Google Search Console** → Sitemaps → `sitemap.xml` resubmit + roz 12 URLs Request Indexing (list: `docs/REQUEST-INDEXING-WEEK-2.md`).
2. **Backlink platforms** → jab agent login-wall par roke, ~20 second login kar do.

## Rollback

Netlify → Deploys → pichla successful deploy → "Publish deploy". 1 click, koi data loss nahi.
