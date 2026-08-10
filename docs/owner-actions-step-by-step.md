# CalcProMaster — LIVE SETUP GUIDE (Owner Actions)

Site already live: **https://calcpromaster.netlify.app** — 543 calculators public access par hain.
Ye guide sirf **business config** hai (code ready hai — bas real IDs paste karni hain).
Total time: ~30 minutes. Koi paid tool nahi chahiye.

> ⚠️ **Sabse pehle**: code abhi `js/site-config.js` mein dono values **empty** hain — isliye
> GA4/GSC abhi on nahi hain (by design — placeholder script request nahi jaati). Apne REAL
> codes paste karne ke baad **rebuild + redeploy** karna zaroori hai.

---

## STEP 1 — GA4 Measurement ID (Google Analytics 4)

**Config file:** `js/site-config.js` → `ga4Id` field

1. Browser mein kholo: **https://analytics.google.com** (Google account se login).
2. Niche left corner → **Admin** (⚙️ icon) → **Create Property**.
3. Property name: `CalcProMaster` → Reporting timezone: apna → Currency: apna → **Create**.
4. "Business information" screen → **Next** (koi bhi industry select kar lo) → **Create**.
5. **Data streams** screen → **Web** → Website URL: `https://calcpromaster.netlify.app` →
   Stream name: `CalcProMaster Web` → **Create stream**.
6. Stream page pe **Measurement ID** dikhega — format `G-AB12CD34EF5` (G- se shuru).
   Usse **copy** karo.
7. Project folder mein `js/site-config.js` kholo aur line change karo:
   ```js
   ga4Id: 'G-AB12CD34EF5',   // ← apna real ID yahan
   ```
8. Rebuild + redeploy:
   ```bash
   node build-deploy.js
   # deploy/ folder Netlify pe upload karo (ya git push)
   ```
9. **Verify:** live site kholo → browser console (F12) mein koi error nahi → Chrome DevTools →
   Network tab → `googletagmanager.com` request aani chahiye.
   (Analytics tab mein 24-48 ghante baad real-time traffic dikhega.)

> **Consent:** site pe GA4 consent-gated hai — user "Accept" kare tab hi data bheja jata hai.
> Calculator inputs / sensitive data kabhi nahi bheje jaate — sirf page view + calculator
> events.

---

## STEP 2 — Google Search Console (GSC) Verification

**Config file:** `js/site-config.js` → `gsc` field (sirf content value, tag nahi)

1. Browser mein kholo: **https://search.google.com/search-console** → **Start now** (login).
2. **Add property** → **URL prefix** tab select karo → paste karo:
   ```
   https://calcpromaster.netlify.app
   ```
   → **Continue**.
3. Verification methods list mein **HTML tag** select karo.
   Google kuch aisa dikhayega:
   ```html
   <meta name="google-site-verification" content="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
   ```
   → **`content="..."` ke andar wali value copy karo** (sirf `xxxx...` part, tag ke bina).
4. `js/site-config.js` mein line change karo (optional — static meta tag ab already live hai):
   ```js
   gsc: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',   // ← apna real code (sirf value)
   ```
5. Rebuild + redeploy (upar wala hi command):
   ```bash
   node build-deploy.js
   ```
6. GSC page pe wapas jao → **Verify** button dabao.
7. ✅ **Verified** dikhna chahiye.

> 🟢 **ALREADY DONE — abhi live hai:** HTML file verification method bhi active hai
> (`https://calcpromaster.netlify.app/googled1ac20b54b36e7cf.html` — byte-for-byte exact) aur
> homepage par static meta tag `<meta name="google-site-verification"
> content="googled1ac20b54b36e7cf">` bhi live hai. GSC mein **Add property → URL prefix
> → https://calcpromaster.netlify.app → HTML file method → bas VERIFY dabao** — file already
> uploaded hai, verify turant confirm hoga. (HTML tag method bhi chala sakte ho — dono
> independently work karte hain.)

---

## STEP 3 — Sitemap Submit (GSC mein)

1. GSC dashboard → left sidebar → **Sitemaps**.
2. Add a new sitemap → paste:
   ```
   sitemap.xml
   ```
   → **Submit**.
3. Status check: **Success** + "Found 1 sitemap" aana chahiye.
4. ~1-2 din baad **Pages** report mein URL count dikhne lagega (543 calculators + 20 hubs +
   static pages + long-tail variants — total ~778 URLs).
5. **Request Indexing** (recommended, top-5 calculators ke liye): GSC → **URL inspection** →
   paste koi calculator URL jaise `https://calcpromaster.netlify.app/finance/loan-emi` →
   **Request indexing** → (agar "URL is on Google" dikhe to **Request indexing** button phir se).
   Homepage + 2-3 popular calculators ke liye karo — baaki 778 URLs sitemap se khud mil jayenge.

> Search mein aana shuru hone mein 2-4 hafte lagte hain (normal). GSC mein daily
> "Queries / Impressions / Clicks" report ke liye minimum 1-2 hafte ka data chahiye.
> Weekly technical health check: `node scripts/indexing-monitor.cjs` (see `docs/indexing-monitor.md`).

---

## STEP 4 — AdSense (optional, baad mein)

`ads.txt` (repo root) + `js/site-config.js` — detail `docs/owner-launch-guide.md` §4 mein.
Short: adsense.google.com pe apply karo → approval ke baad `pub-XXXX` ko `ads.txt` mein
uncomment karo → rebuild + redeploy.

---

## STEP 5 — Scheduled Uptime Monitoring + Alerts

Website 1 month baad achanak break ho jaye to **khud pata chalega** — 3 layers hain:

| Layer | Kya check karta hai | Kab | Kaise alert |
|---|---|---|---|
| `scripts/uptime-check.cjs` | Homepage + 5 critical routes HTTP 200 | Daily (07:00 UTC) | GitHub issue + webhook (ntfy/Slack) + email |
| `scripts/scheduled-smoke.cjs` | Full Playwright suites (543 routes, PDF, export, mobile, a11y) | Daily + har push | GitHub issue + webhook |
| Browser runtime | JS errors live detect (`js/monitoring.js`) | Har page load | Console + diagnostics |

### Option A — GitHub pe push karo (RECOMMENDED — sab automatic)

Repo abhi GitHub se connected nahi hai (no remote). Push karne se `.github/workflows/smoke.yml`
active ho jata hai (daily cron + deploy gate + alerts):

**FULL click-by-click command guide:** `docs/github-cli-setup.md` (gh CLI se repo + secrets +
verify — browser sirf login ke liye). Netlify ke 2 secrets (token + site ID) ka exact click
path: `docs/netlify-secrets-guide.md`. Ya ek-shot script:

```bash
# 1. gh CLI install (one time):  winget install GitHub.cli  →  gh auth login
# 2. Repo create + push + secrets — one command:
./scripts/gh-repo-setup.sh calcpromaster
# 3. Push ke baad workflow status:
./scripts/gh-verify-workflows.sh          # ya  --watch (live poll)
```

Manual path (gh ke bina):

1. **GitHub** (github.com) pe free account banao → **New repository** (naam: `calcpromaster`,
   Private/Public — jo chaaho) → copy the repo URL.
2. Project folder mein terminal kholo (**branch `main` honi chahiye** — smoke.yml deploy job
   sirf main pe chalta hai):
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-user>/calcpromaster.git
   git add -A && git commit -m "Launch-ready"     # pehle se committed hai to skip
   git push -u origin main
   ```
> **Ya GitHub Actions ke bina:** Netlify ki built-in Git integration se auto-deploy
> (`docs/netlify-git-integration.md`) — har push pe Netlify khud build+deploy karta hai, koi
> secret nahi chahiye. Agar wo path chuno to `SKIP_NETLIFY_DEPLOY=true` repo variable banao
> (smoke.yml double-deploy na kare).

3. GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - Name: `ALERT_WEBHOOK_URL` → Value: ntfy topic ya Slack webhook (niche Step 6)
   - (Optional, CI deploy ke liye) Name: `NETLIFY_AUTH_TOKEN` + `NETLIFY_SITE_ID`
     → detail `docs/monitoring.md` §7
   - (Trackers ke liye) Name: `SERVICE_ACCOUNT_B64` + `GA4_PROPERTY_ID`
     → detail `docs/github-secrets-setup.md`
4. GitHub → **Actions** tab → pehla workflow run dikhega. Har roz **07:00 UTC** pe uptime +
   smoke suite automatically chalega.
5. Failure pe: GitHub email + auto-opened **🚨 issue** + webhook message.

### Option B — Windows Task Scheduler (GitHub ke bina, local)

Agar GitHub use nahi karna chahte, Windows pe daily check lagao:

1. Pehle manual test:
   ```bash
   node scripts/uptime-check.cjs
   # → "✅ Uptime check PASS — ... all 6 routes healthy."
   ```
2. Task banane ka command (ek baar, admin ki zaroorat nahi):
   ```bash
   schtasks /Create /SC DAILY /TN "CalcProMaster Uptime" /TR "\"C:\Program Files\nodejs\node.exe\" \"C:\Users\ok\Documents\website\project\scripts\scheduled-uptime.bat\"" /ST 12:30
   ```
   (Ya Task Scheduler GUI: **Task Scheduler → Create Basic Task → Daily → 12:30 PM →
   Start a program → browser:`node.exe` → Arguments:`C:\Users\ok\Documents\website\project\scripts\uptime-check.cjs` → Working dir: project folder)
3. Result check karne ke liye `scripts/uptime-check.log` mein har run ka output milega
   (bat file log karta hai). Failure pe exit code non-zero + log mein HTTP error dikhega.

### Step 6 — Alert destination (ntfy / Slack) — ek baar setup

**ntfy (fastest, ~2 min, free):**
1. Mobile pe ntfy app install karo → ek private topic subscribe karo (e.g. `calcpro-alerts-xyz`).
2. Test karo:
   ```bash
   curl -d "🚨 test — CalcProMaster monitoring live" https://ntfy.sh/calcpro-alerts-xyz
   ```
   → phone pe turant notification aana chahiye.
3. GitHub secret `ALERT_WEBHOOK_URL = https://ntfy.sh/calcpro-alerts-xyz` (Option A)
   ya Windows task mein environment variable (Option B).

**Slack:** Incoming Webhooks app → channel → webhook URL (`https://hooks.slack.com/services/<YOUR-TEAM>/<YOUR-CHANNEL>/<YOUR-TOKEN>`)
→ wahi `ALERT_WEBHOOK_URL` secret.

**Test alert:**
```bash
ALERT_WEBHOOK_URL="https://ntfy.sh/calcpro-alerts-xyz" npm run monitor:test-alert
```

---

## AFTER-VERIFY — ab kya karna hai (GSC verify hone ke baad)

1. **GSC → Sitemaps → `sitemap.xml` → Submit → Success** (778 URLs).
2. **Request Indexing** (top-5 calculators + homepage): GSC → **URL inspection** → URL paste →
   **Request indexing**.
3. **GA4 connect** (agar nahi kiya): `docs/ga4-setup-guide.md` — property banao, `ga4Id` paste,
   redeploy. ID set hone ke baad events verify: `docs/ga4-verify-events.md`
   (Network tab method — sabse reliable, 2 min).
4. **Weekly health check:** `node scripts/indexing-monitor.cjs` — 8 checks, sab green hona chahiye
   (`docs/indexing-monitor.md`).
5. **Pehle 2 hafte monitor karo:**
   - GSC → **Pages**: "Discovered – not yet indexed" → 1-2 hafte mein "Indexed" ban jana chahiye.
   - GSC → **Performance**: queries/impressions shuru (2-3 hafte).
   - GSC → **Indexing → Pages**: koi "Crawled – currently not indexed" spike na aaye.
   - GA4 → Realtime: live visitors.
   - Uptime: `npm run monitor:uptime` + alerts configured.
6. **Kya normal hai, kya problem:** `docs/gsc-first-week-expectations.md` — day-by-day timeline
   (pehle 2-4 hafte "indexed nahi" hona **normal hai**, red flags sirf specific hain).
7. **Real data auto-check (optional but powerful):** service account setup karo
   (`docs/api-credentials-setup.md`, ~15 min) → `npm run monitor:ga4` (event counts) +
   `npm run monitor:gsc` (index status + clicks/impressions) — ab manual GSC pe jane ki
   zaroorat nahi, console mein turant milta hai. GitHub pe weekly auto-run ke liye
   secrets: `docs/github-secrets-setup.md`.
8. **2-4 hafte baad:** GSC Performance data aana shuru → usse traffic playbook banao
   (jo calculator top pe, kis category ko aur content chahiye).

---

## CHECKLIST (sab tick karo)

- [ ] GA4: analytics.google.com se `G-...` copy → `js/site-config.js` `ga4Id` → rebuild + deploy
- [ ] GSC: **Add property → URL prefix → HTML file method → VERIFY** (file already live — `docs/owner-actions-step-by-step.md` §2 note) → `js/site-config.js` `gsc` (optional)
- [ ] GSC → Sitemaps → `sitemap.xml` submit → Success
- [ ] GSC → URL inspection → homepage + top-5 calculators → Request indexing
- [ ] Uptime: `node scripts/uptime-check.cjs` → PASS (6/6)
- [ ] Indexing health: `node scripts/indexing-monitor.cjs` → PASS (23 checks)
- [ ] Alerts: ntfy/Slack webhook test → notification mila
- [ ] (Recommended) GitHub push → daily 07:00 UTC automatic monitoring
- [ ] (Optional) AdSense `pub-...` → `ads.txt`
- [ ] (Optional) Custom domain → `js/site-config.js` `domain` → detail §1

**Har config change ke baad:** `node build-deploy.js` → `deploy/` upload → live check.
