# 🚀 CalcProMaster — Pre-Launch Checklist

**Status:** Code-side complete. Ye checklist deploy se pehle, deploy ke waqt, aur deploy ke baad ke steps cover karti hai.
**Deploy folder:** `deploy/` (1500 URLs ready) · **Kabhi bhi `deploy/` ke andar files manually edit mat karo** — wo build output hai.

---

## Phase 0 — Deploy se pehle (5 min)

- [ ] **Build fresh hai:** `node generate-sitemap.js && node build-deploy.js` — output me "✅ PASS — every sitemap URL meets the quality gate" aur "✅ PASS — all budgets met" dikhna chahiye
- [ ] **Unit tests:** `npx vitest run` → 1563/1563 pass
- [ ] **Deploy folder content spot-check:**
  - `deploy/index.html` (homepage, 710+ words content)
  - `deploy/sitemap.xml` (1500 URLs)
  - `deploy/robots.txt` (Sitemap line declared)
  - `deploy/llms.txt`
  - `deploy/_headers` (security headers)
  - `deploy/_redirects` (SPA fallback + 404 rules)
  - `deploy/blog/` (7 posts + hub)
  - `deploy/guides/` (64 pages + glossary)
- [ ] **Koi sensitive file deploy me na ho:** `.env`, secrets, admin dashboards (qa-dashboard noindex hai — theek hai)

## Phase 1 — Deploy (aapka main action)

- [ ] **Netlify upload:** deploy/ folder drag-and-drop karo ya Git push (agar Git integration set hai)
- [ ] **Live spot-checks (browser me, deploy ke turant baad):**
  - `https://calcpromaster.netlify.app/` — homepage loads
  - `https://calcpromaster.netlify.app/health/bmi` — ek calculator works (input daal ke result check karo)
  - `https://calcpromaster.netlify.app/guides/ohms-law` — nayi guide loads
  - `https://calcpromaster.netlify.app/blog/rule-of-72` — naya post loads
  - `https://calcpromaster.netlify.app/sitemap.xml` — browser me XML dikhna chahiye (raw XML, error nahi)
  - `https://calcpromaster.netlify.app/robots.txt` — "Sitemap:" line dikhni chahiye
  - Ek random purana URL bhi kholo — kuch break nahi hua?

## Phase 2 — GSC (Search Console) — deploy ke turant baad

- [ ] **Sitemap resubmit:**
  1. GSC → Sitemaps
  2. Purana sitemap entry (agar error status me hai) remove karo
  3. `sitemap.xml` submit karo
  4. Expected: "Success" status + ~1500 discovered URLs. Ye "Couldn't fetch" problem ko permanently close karta hai
- [ ] **URL Inspection — 7 priority URLs request-index (is order me):**
  1. `/` (homepage)
  2. `/math/random-generator` (aapki top GSC query)
  3. `/finance/loan-emi`
  4. `/health/bmi`
  5. `/blog/how-emi-works` (best blog post)
  6. `/guides/ohms-law` (nayi guide)
  7. `/blog/rule-of-72` (naya post)
- [ ] **Enhancements reports check karo (next 2 weeks me):** Breadcrumbs, FAQ (schema-rich results), Core Web Vitals — new valid items aani chahiye

## Phase 3 — Analytics

- [ ] **GA4:** Realtime report me apna visit dikhta hai? Guide: `docs/ga4-setup-guide.md`
- [ ] **Events (optional):** calculator-compute, guide-read events verify — `docs/ga4-verify-events.md`

## Phase 4 — 1 hafte baad (verification loop)

- [ ] **GSC → Pages report:** "Discovered – currently not indexed" count girta hua dikhna chahiye (718 → kam)
- [ ] **GSC → Sitemaps:** status abhi bhi "Success" hai?
- [ ] **GSC → Crawl stats:** robots.txt fetch errors 0?
- [ ] **PageSpeed Insights (live URL):** Desktop + Mobile score — pichhla 75 desktop ab 90+ expect karo (prerendered HTML + 205KB lighter JS)
- [ ] **Rich results test:** kisi calculator page pe FAQ/Breadcrumb schema "valid" dikhna chahiye

## Phase 5 — Ongoing (har mahine)

- [ ] New content (guides/blog) ke liye: likhte hi sitemap regen + GSC me URL inspection
- [ ] `docs/indexing-monitor.md` + `docs/indexing-weekly-report.md` follow karo
- [ ] Zakat nisab / tax slabs / FD rates guide numbers — quarterly review (roadmap me noted)
- [ ] Backlink outreach: 64 guides + 7 blog posts linkable assets hain — har mahine 2–4 quality outreach emails

## 🚫 Kya NAHI karna

- `deploy/` folder files manually edit — build dobara chalao, source edit karo
- Sitemap me noindex pages daalna (quality gate already rokta hai)
- robots.txt me `Disallow: /` kahin bhi
- Purane URLs hata kar naye banana (backlink equity loss)
- `git push --force` ya deploy automation ke bina delete

---

## Quick reference — sab commands

```bash
cd C:/Users/ok/Documents/Calculator/project
node generate-sitemap.js      # sitemap regenerate (1500 URLs)
node build-deploy.js          # deploy/ rebuild + quality gate + budgets
npx vitest run                # unit tests (1563)
node scripts/check-sitemap-coverage.cjs   # sitemap ↔ files match
```

## Kya kya complete hai (code-side)

✅ 1201 calculators · 20 category guides · 64 guide pages · 7 blog posts · 1500-URL sitemap · quality gate (0 failures) · security headers (CSP, COOP, XCTO, Referrer, Permissions, HSTS) · minified JS (−205KB) · heading-order clean · FAQ/Article/Breadcrumb schema · llms.txt (AI citation) · formula QA (1199 PASS) · llms/GSC docs ready

**Aakhri baat:** is checklist ke Phase 1 ke baad mujhe bolna — **live re-audit** karunga (PageSpeed before/after, live sitemap fetch, headers verify, GSC status follow-up).
