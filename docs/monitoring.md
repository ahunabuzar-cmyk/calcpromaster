# CalcProMaster — Monitoring, Alerts & Scheduled Smoke Tests

## Production URL
`https://calcpromaster.com` (until a custom domain is set in `js/site-config.js`).

---

## 1. Monitoring — what detects a failure

| Detector | What it checks | How often | Who runs it |
|---|---|---|---|
| `scripts/uptime-check.cjs` | Homepage + 5 critical routes return HTTP 200 (no 4xx/5xx, no timeout) | Daily 07:00 UTC (GitHub Actions) | CI |
| `scripts/indexing-monitor.cjs` | Indexing-health gate: 778 sitemap locs, robots, canonical, no noindex, true 404s, CLS/LCP, console errors — all vs LIVE URL | Weekly + after every deploy (recommended) | Owner / CI |
| `scripts/scheduled-smoke.cjs` | Full Playwright suites against the **deploy/** artifact: deploy-smoke (27 tests), PDF/export/header, responsive | Daily 07:00 UTC + after every push to `main` | CI |
| `js/monitoring.js` (runtime) | In-browser JS errors, unhandled rejections, `calc:fatal_crash` events | Every page load | User browser |
| Deployment | `node build-deploy.js` fails loudly + smoke suite gate | Every release | Owner / CI |

> **Netlify deploy from CI:** GitHub Actions ke liye 2 secrets — exact click path
> `docs/netlify-secrets-guide.md` (`NETLIFY_AUTH_TOKEN` + `NETLIFY_SITE_ID`).
> GitHub Actions ke bina auto-deploy: `docs/netlify-git-integration.md` (Netlify Git
> integration — `SKIP_NETLIFY_DEPLOY=true` variable se double-deploy avoid hota hai).

---

## 2. Alerts — what triggers, where it goes

**Triggers:**
- Any critical route returns 4xx/5xx or times out (uptime check).
- Any Playwright suite in `scheduled-smoke.cjs` exits non-zero (page broken, PDF/export broken, overflow, console error).
- Production build fails.
- In-browser runtime errors (visible in browser console + monitoring.js diagnostics).

**Destination:**
1. **GitHub Actions failure** — the failing job appears in the repo's Actions tab and (if enabled) sends an email from GitHub.
2. **Alert issue** — a `🚨 Uptime check failed` / smoke-failure GitHub issue is auto-opened on failure.
3. **Webhook** (optional) — if `ALERT_WEBHOOK_URL` is set as a repo **Secret**, the scripts POST a JSON alert (`{"text": "🚨 [channel] ..."}`) to Slack / Discord / Telegram / ntfy.

**How the owner changes the destination:**
- GitHub → repo → Settings → Secrets and variables → Actions → add `ALERT_WEBHOOK_URL`.
- Any service that accepts an incoming-webhook JSON POST works: Slack Incoming Webhook, Discord webhook, Telegram bot (`https://api.telegram.org/bot<TOKEN>/sendMessage?...`), ntfy (`https://ntfy.sh/<topic>`).
- To silence alerts: remove the secret, or delete the `schedule` block in `.github/workflows/smoke.yml`.

**How to test an alert:**
```bash
ALERT_WEBHOOK_URL="https://hooks.slack.com/services/<YOUR-TEAM>/<YOUR-CHANNEL>/<YOUR-TOKEN>" node scripts/uptime-check.cjs --test-alert
npm run monitor:test-alert        # same thing via the npm script
```

---

## 2.5 ALERT_WEBHOOK_URL — step-by-step setup (ntfy.sh / Slack)

The scripts POST `{"text": "🚨 [calcpro-master] ..."}` to the webhook URL. Both options below are free and take ~2 minutes. The webhook value is a **GitHub Actions secret** — never commit it.

### Option A — ntfy.sh (fastest, no account needed)
1. Pick a private topic name, e.g. `calcpro-alerts-<something-unique>`.
2. On your phone: install the ntfy app (Android/iOS) → Subscribe to that topic → notifications on.
3. Test immediately from your computer:
   ```bash
   curl -d "🚨 test — CalcProMaster monitoring live" https://ntfy.sh/calcpro-alerts-<something-unique>
   ```
   Your phone should ping within a second.
4. In GitHub: repo → **Settings → Secrets and variables → Actions → New repository secret** → name `ALERT_WEBHOOK_URL` → value `https://ntfy.sh/calcpro-alerts-<something-unique>` → **Add secret**.
5. Verify end-to-end:
   ```bash
   ALERT_WEBHOOK_URL="https://ntfy.sh/calcpro-alerts-<something-unique>" npm run monitor:test-alert
   ```
   (For a self-hosted ntfy server, use your own `https://ntfy.yourdomain.com/<topic>` — plain ntfy.sh needs no auth.)

### Option B — Slack incoming webhook
1. Open Slack → **Apps** → search **Incoming WebHooks** → **Add to Slack**.
2. Choose a channel (e.g. `#monitoring`) → **Add Incoming WebHooks integration**.
3. Copy the **Webhook URL** (looks like `https://hooks.slack.com/services/<TEAM-ID>/<CHANNEL-ID>/<TOKEN>`).
4. In GitHub: **Settings → Secrets and variables → Actions → New repository secret** → name `ALERT_WEBHOOK_URL` → paste the webhook → **Add secret**.
5. Verify: `ALERT_WEBHOOK_URL="https://hooks.slack.com/services/<YOUR-TEAM>/<YOUR-CHANNEL>/<YOUR-TOKEN>" npm run monitor:test-alert` — a `🚨 [calcpro-master] Test alert — monitoring is live` message should appear in the channel.

### What triggers an alert (once configured)
- Uptime check: any of the 6 critical routes returns 4xx/5xx or times out.
- Smoke suite: any Playwright test in `scheduled-smoke.cjs` fails (broken calculator, PDF/export failure, overflow, console error).
- Deploy job failure (Netlify deploy step in the workflow).
- Live-smoke failure against the freshly deployed URL.

### How to change the destination later
Just edit the `ALERT_WEBHOOK_URL` secret in GitHub (or point it at a different ntfy topic / Slack channel). No code change needed.

### To silence alerts
Delete the secret, or remove the `schedule:` block in `.github/workflows/smoke.yml`. (The GitHub issue + email alerts always remain for repo owners.)

---

## 3. Scheduled smoke tests — what they verify

`scripts/scheduled-smoke.cjs` runs (against the real `deploy/` artifact):
1. Homepage + HTTP status
2. Main JS/CSS loads
3. Calculator functionality with **known-answer** results (`$2,051.65` EMI etc.)
4. Search, Calculator of the Day, support widget
5. **PDF report** (contains current result + 543+ count, no stale data)
6. **CSV export** (A/B isolation)
7. No horizontal overflow at 320–1920px (responsive suite)
8. No critical console errors (deploy smoke)
9. Navigation/menu (hamburger opens/closes, Escape closes)
10. Production URL responds

**Run manually:**
```bash
node scripts/scheduled-smoke.cjs        # serves deploy/ itself on :3100
node scripts/uptime-check.cjs           # live production URL
npx playwright test tests/e2e/deploy-smoke.spec.js -c playwright.deploy.config.js --project=deploy-chromium
npx playwright test tests/e2e/pdf-export-header.spec.js -c playwright.deploy.config.js --project=deploy-chromium
```

---

## 4. Deployment & rollback

**Deploy (Netlify drag & drop or git push):**
1. `node build-deploy.js` → produces `deploy/` (28 items, versioned service worker `calcpro-vX.Y.Z-<hash>`).
2. Upload `deploy/` to Netlify, or push to the connected Git repo (workflow smoke gate runs automatically).
3. Verify: open the live URL, check the footer count (543+), run `node scripts/uptime-check.cjs`.

**Rollback:** Netlify → Deploys → click the previous green deploy → "Publish deploy". Service-worker cache busts via version hash, so old cached clients fetch fresh assets after the next visit.

---

## 5. "Website 1 month baad achanak break ho jaye to mujhe kaise pata chalega?"

1. **What detects it:** the daily GitHub Actions workflow — `uptime-check.cjs` (HTTP 200 on 6 routes) + `scheduled-smoke.cjs` (27+ PDF/export/header/responsive Playwright tests on the real artifact).
2. **How frequently:** every day at 07:00 UTC, plus immediately after every push to `main`.
3. **What happens on failure:** the job turns red, GitHub emails the repo owner, a `🚨` alert issue is auto-opened, and a webhook POST fires (if `ALERT_WEBHOOK_URL` secret is set) to your Slack/Discord/Telegram/ntfy.
4. **Where the failure appears:** GitHub → Actions tab (job log), GitHub Issues (auto-opened alert issue), and your webhook channel.
5. **How you receive the alert:** GitHub notification email + the webhook channel you configured.
6. **How to investigate:** (a) open the alert issue → run the failed command locally; (b) `node scripts/uptime-check.cjs`; (c) `node scripts/scheduled-smoke.cjs`; (d) inspect `test-results/` screenshots/traces; (e) check Netlify deploy logs + the deployed version hash in `deploy/sw.js`; (f) open the live site console for runtime errors reported by `js/monitoring.js`.

---

## 2.6 Netlify CI deploy secrets — exact setup (deploy job)

The `deploy` job in `.github/workflows/smoke.yml` publishes `deploy/` to Netlify from CI (on push to `main` + manual `workflow_dispatch`), then the `live-smoke` job tests the deployed URL. It needs two GitHub **secrets** (never commit them):

| Secret | Where to find it | What it does |
|---|---|---|
| `NETLIFY_AUTH_TOKEN` | Netlify → **User settings → Applications → New access token** → name it e.g. `github-actions` → copy the token | Authenticates the deploy |
| `NETLIFY_SITE_ID` | Netlify → **Site → Site settings → Site details → Site ID** (a UUID) | Selects WHICH site gets deployed |

Steps:
1. Create the Netlify site first (or link this repo) so you have a `NETLIFY_SITE_ID`.
2. Generate a personal access token under your Netlify user settings.
3. GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret** → add `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`.
4. Push to `main` — the workflow builds → smokes the artifact → deploys → smokes the **live URL**. Both secrets can be revoked/re-created anytime; no code change.

**Optional guard — `SKIP_NETLIFY_DEPLOY`:** if you prefer Netlify's own Git integration to deploy (instead of CI), set the repo **variable** `SKIP_NETLIFY_DEPLOY=true` (Settings → Variables). The deploy + live-smoke jobs skip themselves; the daily uptime + build-smoke gates still run.

**Testing the deploy job without a real deploy:** run `npm run monitor:smoke` locally — it builds `deploy/` and runs the full suite against it. To validate the live-smoke mechanism against any URL: `PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test tests/e2e/deploy-smoke.spec.js -c playwright.deploy.config.js --project=deploy-chromium`.

---

## 6. Traffic & indexing trackers (GA4 + GSC APIs)

Do extra scripts Google ke official APIs se **real data** fetch karte hain:

| Script | Kya batata hai | Command |
|---|---|---|
| `scripts/ga4-events.cjs` | GA4 Data API se event counts (page_view, calculator_use), top calculators, trend snapshot | `GA4_PROPERTY_ID=123456789 npm run monitor:ga4` |
| `scripts/gsc-indexing.cjs` | Search Console API se index status (URL Inspection) + clicks/impressions/CTR/position + top queries | `npm run monitor:gsc` |

- **Ek-baar setup** (service account + API enable + GA4/GSC access): `docs/api-credentials-setup.md`
- `service-account.json` project root mein rakho (git-ignored — kabhi commit mat karo).
- Exit codes: `0` success · `1` API/credential error · `2` not configured (skip).
- **Weekly auto-run:** `.github/workflows/analytics-trackers.yml` har Monday 07:30 UTC pe dono trackers
  chalata hai (`SERVICE_ACCOUNT_B64` + `GA4_PROPERTY_ID` secrets se; na hote to cleanly skip).
  Failure pe 🚨 issue khul jata hai — see `docs/api-credentials-setup.md` §GitHub Actions.

## Owner configuration still required
- **`ALERT_WEBHOOK_URL`** secret (optional; alerts work via GitHub Actions failures/issues even without it).
- **`NETLIFY_AUTH_TOKEN` + `NETLIFY_SITE_ID`** secrets (required only for CI deploy — upload `deploy/` manually otherwise).
- **`PROD_URL`** variable in Actions settings when a custom domain is added.
- **`SKIP_NETLIFY_DEPLOY`** variable (only if using Netlify Git integration).
- GA4 ID, GSC verification, AdSense publisher ID, custom domain — see `docs/owner-launch-guide.md`.
- GA4 Property ID (numeric) + `service-account.json` for the API trackers — see `docs/api-credentials-setup.md`.

## Environment variables (never committed)
`ALERT_WEBHOOK_URL` (repo secret) · `PROD_URL` (repo variable) · `DEPLOY_PORT` (local, default 3100) · `GOOGLE_APPLICATION_CREDENTIALS` / `GA4_PROPERTY_ID` / `GSC_SITE_URL` (optional — see `docs/api-credentials-setup.md`).
