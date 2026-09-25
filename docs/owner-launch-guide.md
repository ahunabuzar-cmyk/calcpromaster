# CalcProMaster — Owner Launch Configuration Guide

Everything below is a **business/owner action** — the code is already production-ready and
gate-locked so that empty or placeholder values never leak broken scripts. Complete these in
order. No paid tools are required for any of this.

> 📌 **Site already live:** https://calcpromaster.com — ye guide sirf business config
> hai. **Exact click-by-click steps (GA4 + GSC + sitemap + scheduled monitoring):**
> [`docs/owner-actions-step-by-step.md`](owner-actions-step-by-step.md) — isse kholo aur order
> mein follow karo.

---

## 0. Quick-Start Checklist (~15 minutes)

Tick these in order. Full details for each step are in the sections below.

**Step 1 — Verify the code (5 min):**
```bash
npm test                 # full unit + formula QA suite (500+ tests)
npm run lint:js          # syntax check all JS
npm run drift:check      # mirror-file drift detector
npm run check:counts     # 543-count consistency
node scripts/inventory-audit.cjs   # registry/routes
node build-deploy.js     # production build → deploy/
```
All must pass. If a gate fails, the deploy is NOT ready — fix and re-run.

**Step 2 — Deploy (5 min):**
1. Create a Netlify account (free) → **New site → Deploy manually**.
2. Drag & drop the `deploy/` folder (or `netlify deploy --prod` with the repo).
3. Site is live at `https://<your-site>.netlify.app` immediately.

**Step 3 — Optional but recommended (5 min each):**
- [ ] GA4: paste your `G-XXXX` ID → `js/site-config.js` → `ga4Id` → rebuild (§2)
- [ ] GSC: verify + submit `sitemap.xml` (§3)
- [ ] AdSense: paste `pub-XXXX` into `ads.txt` → rebuild (§4)
- [ ] Custom domain: change ONE line in `js/site-config.js` → rebuild (§1)

**Step 4 — Verify the live site:**
- [ ] Open homepage + a finance calculator + a health calculator
- [ ] Open a long-tail URL, e.g. `https://<domain>/finance/loan-emi/5-years-50000` —
      inputs must be auto-filled and the result computed on load
- [ ] Check the browser console (0 errors), then run `npm run monitor:uptime`

> **Do not block launch on Step 3** — those are owner configuration items; the site is
> fully functional without them. Launch with Step 1 + Step 2, then complete Step 3.

---

## 1. Custom Domain (optional, one-config change)

**Single source of truth:** `js/site-config.js`

```js
window.SITE_CONFIG = {
  domain: 'calcpromaster.netlify.app',   // ← change ONLY this
  gsc: '',
  ga4Id: ''
};
```

- Change `domain` to your real domain (e.g. `calcpromaster.com`).
- One config change propagates to: canonical tags, Open Graph, Twitter cards, JSON-LD,
  sitemap (778 URLs), robots.txt `Sitemap:` line, share links, QR URLs, service worker scope,
  manifest.
- Then run `node build-deploy.js` and upload `deploy/` again.

### Exact switch flow (3 steps, verified end-to-end)

1. **Edit** `js/site-config.js` → `domain: 'yourdomain.com'` (ONE line).
2. **Rebuild** `node build-deploy.js` — output confirms the rewrite:
   ```
   domain: index.html → yourdomain.com (19 refs rewritten)
   domain: sitemap.xml → yourdomain.com (778 refs rewritten)
   domain: og-image.html → yourdomain.com (1 refs rewritten)
   domain: robots.txt → yourdomain.com (1 refs rewritten)   ← added in latest build
   ```
3. **Deploy** the `deploy/` folder, then attach the domain on Netlify:
   Netlify → **Site settings → Domain management → Add custom domain** → follow the
   DNS CNAME/ALIAS setup → HTTPS (free Let's Encrypt cert, auto-renews).

**Verified with a temporary test domain** (`test.example.com`): 799 total references
(19 index.html + 778 sitemap + 1 og-image + 1 robots.txt) rewritten to the new origin,
**zero** stale `calcpromaster.netlify.app` references left in the artifact, then restored
cleanly. The CI drift test (`tests/e2e/deploy-smoke.spec.js` → *SEO artifacts*) asserts
canonical = robots Sitemap = sitemap `<loc>` share ONE origin and that no
`test.example.com`/`localhost` leaks into the deploy — so a forgotten stale domain
fails the build gate automatically.

**Ownership note:** keep the Netlify subdomain live while the custom domain DNS
propagates; Google Search Console should list the custom domain as the primary property
once HTTPS is active.

---

## 2. Google Analytics 4 (GA4)

**Config location:** `js/site-config.js` → `ga4Id`

1. Go to https://analytics.google.com → Admin → Create Property → name "CalcProMaster".
2. Web data stream → copy the **Measurement ID** (starts with `G-`, e.g. `G-AB12CD34EF5`).
3. Paste into `ga4Id: 'G-AB12CD34EF5'` in `js/site-config.js`.
4. Run `node build-deploy.js` and upload `deploy/`.

**Already implemented (verified):**
- GA4 only loads when `ga4Id` matches `/^G-[A-Z0-9]{6,}$/` (`SITE_GA4_READY` gate) — zero
  broken/placeholder requests while empty.
- Consent-gated: analytics waits for user consent (consent mode) — no PII, no calculator
  inputs are ever sent; only page/calculator events.
- Does not block calculator execution (deferred, async).

---

## 3. Google Search Console (GSC)

**Config location:** `js/site-config.js` → `gsc`

1. https://search.google.com/search-console → **Add property → URL prefix** →
   `https://calcpromaster.com` (or your custom domain).
2. Verification method: **HTML tag** → copy the `content="..."` value only.
3. Paste into `gsc: ''` in `js/site-config.js` (just the value, not the tag).
4. `node build-deploy.js` + upload. The `<meta name="google-site-verification" ...>`
   tag injects automatically into every page.
5. After GSC verifies: **Sitemaps** → submit `https://<domain>/sitemap.xml`
   (sitemap contains 778 URLs — 543 tools + hubs + 183 long-tail + static pages).

**Already implemented:** sitemap.xml, robots.txt, canonical URLs, breadcrumbs, JSON-LD,
404 handling, no accidental noindex.

---

## 4. AdSense

> 📌 **Exact click-by-click AdSense guide:** [`docs/adsense-setup-guide.md`](adsense-setup-guide.md)

**Config location:** `ads.txt` (repo root, copied to deploy)

1. Apply at https://adsense.google.com → add site → approve.
2. After approval, copy your Publisher ID (`pub-XXXXXXXXXXXXXXXX`).
3. In `ads.txt`, uncomment and replace:
   ```
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```
4. Rebuild (`node build-deploy.js`) + upload.

**Already implemented (verified):**
- Consent integration (ads only after consent), sponsored/no-follow link attributes,
  CLS-safe ad containers (fixed min-height bounding boxes), no ad above the calculator,
  result visibility preserved, no ad interferes with calculation.
- No placeholder publisher ID ships anywhere (gate-locked).

---

## 5. After launch (post-launch, do NOT block launch)

| Item | Why | When |
|---|---|---|
| Monitor GA4 + GSC data | real-user optimization | week 1 |
| Improve pages from search queries | ranking growth | week 2+ |
| Build genuine organic backlinks | authority | ongoing, free only |
| AdSense optimization | revenue | after approval |
| Custom domain | branding/trust | when revenue allows |

---

## Verification checklist after each config change

```bash
node scripts/sync-counts.cjs --check   # count consistency (543)
node scripts/inventory-audit.cjs       # registry/routes
node build-deploy.js                   # production build
# then upload deploy/ and smoke-test the live URL
```

Current state (verified this session): **GA4 READY — ID REQUIRED · GSC READY — VERIFICATION
REQUIRED · ADSENSE READY — PUBLISHER ID REQUIRED · CUSTOM DOMAIN READY — ONE CONFIG CHANGE**.
None of these block technical launch.
