# CalcProMaster — Google API Credentials Setup (service account)

`scripts/ga4-events.cjs` (GA4 event counts) aur `scripts/gsc-indexing.cjs`
(GSC indexing/performance tracker) dono Google Cloud ke **service account** se chalti
hain — ek baar setup, phir kabhi kuch nahi karna.

> ⏱ Total: **~10-15 min**. Free hai. Koi credit card nahi.
> 🔒 Service-account JSON kabhi **commit/upload** mat karna — `.gitignore` mein already
> ignore hai (`service-account*.json`, `google-creds*`).

---

## Step 1 — Google Cloud project (2 min)

1. **https://console.cloud.google.com** kholo (wahi Google account).
2. Agar pehli baar hai: **Create Project** → name `calcpro-analytics` → **Create**.
3. Project selected ho (top bar) — confirm karo.

## Step 2 — APIs enable karo (1 min)

1. **APIs & Services → Library** (left sidebar).
2. Search karo aur **enable** karo:
   - **Google Analytics Data API** (GA4 events ke liye)
   - **Google Search Console API** (GSC tracker ke liye)
3. Dono ka status "Enabled" dikhna chahiye.

## Step 3 — Service account banao + key download (3 min)

1. **APIs & Services → Credentials**.
2. **+ Create Credentials → Service account**:
   - Name: `calcpro-reader`
   - Role: **Skip** (no role needed) → **Done**.
3. Service account list mein uske **email** pe click karo →
   **Keys** tab → **Add Key → Create new key → JSON → Create**.
4. Download hua file rename kar do: **`service-account.json`**
   (ya koi bhi naam — bas `service-account` se shuru ho, git-ignored hai).
5. File ko **project root** mein daal do (jahan `package.json` hai).
   Final path: `C:\Users\ok\Documents\website\project\service-account.json`

## Step 4 — GA4 property mein access do (2 min)

1. **analytics.google.com** → Admin (⚙️ niche left) → property select →
   **Property access management** → **+** (add).
2. Service account ka **email** paste karo (Step 3 wala, e.g.
   `calcpro-reader@xxx.iam.gserviceaccount.com`) → role: **Viewer** → **Add**.
3. **Property ID** note karo: Admin → **Property Settings** →
   "Property ID" (numeric, e.g. `123456789`) — **G-XXXX nahi**, ye numeric ID chahiye.

## Step 5 — GSC property mein access do (2 min)

1. **search.google.com/search-console** → apna property kholo.
2. **Settings → Users and permissions → Add user**.
3. Service account email paste karo → permission: **Full** (ya User minimum)
   → **Add**.

---

## Test karo (1 min)

```bash
# GA4 events (Property ID apna daalo)
GA4_PROPERTY_ID=123456789 node scripts/ga4-events.cjs

# GSC tracker (site URL auto-detected; override bhi kar sakte ho)
node scripts/gsc-indexing.cjs
```

Har baar `G`/`S` access token khud generate hota hai — **kuch aur set karne ki
zaroorat nahi**. Scripts exit code dete hain:
- `0` = success
- `1` = API/credentials error (message mein hint)
- `2` = credentials/property configure nahi hua (skip — normal, jab tak setup na ho)

---

---

## GitHub Actions — weekly auto-run (recommended)

`.github/workflows/analytics-trackers.yml` har **Monday 07:30 UTC** pe dono trackers
khud chala deta hai (manual run bhi: **Actions tab → workflow → Run workflow**).

> **Click-by-click secrets setup:** `docs/github-secrets-setup.md` — base64 nikalne se
> leke GitHub pe paste karne tak, exact steps.

**Repo secrets set karo** (GitHub → repo → **Settings → Secrets and variables → Actions**):

| Secret | Value |
|---|---|
| `SERVICE_ACCOUNT_B64` | `service-account.json` ka **base64** — ek baar nikaalo:
  Git Bash/Linux: `base64 -w0 service-account.json`
  PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))`
  Output ko secret mein paste karo (ek line) |
| `GA4_PROPERTY_ID` | Numeric property ID (e.g. `123456789`) — **G-XXXX nahi** |

**Optional repo variable:** `GSC_SITE_URL` (custom domain lagane pe override — otherwise
site-config se auto-detect hota hai).

Secrets set na hone tak workflow **cleanly skip** hota hai (kuch fail nahi hota).
Failure pe GitHub automatically **🚨 issue** kholta hai. Har run ka snapshot
`data/*.json` artifact ke roop mein download ho sakta hai (Actions run page).

> 💡 **Artifacts ~90 din baad expire** ho jaate hain — agar long-term trend history
> chahiye, har hafte artifacts download karke kahin save karo. GitHub Actions pe
> secrets hamesha **env-variable se** pass hote hain (logs mein kabhi leak nahi hote)
> aur decoded `service-account.json` runner pe hi rehta hai — kabhi commit nahi hota.
>
> macOS pe base64 ke liye `-w0` nahi chalta (BSD base64) — wahan `base64 -b0` use karo.

---

## Env vars (optional, agar file project root mein nahi rakhi)

File root mein ho to **kuch nahi** chahiye. Warna:
```bash
GOOGLE_APPLICATION_CREDENTIALS=C:/path/to/service-account.json
# ya
GA4_SERVICE_ACCOUNT=C:/path/to/service-account.json   # GA4 script ke liye
GSC_SERVICE_ACCOUNT=C:/path/to/service-account.json   # GSC script ke liye
```

## Troubleshooting

| Error | Fix |
|---|---|
| `OAuth token exchange failed (403)` | Service account email ko GA4/GSC mein add nahi kiya (Step 4/5) |
| `GA4 API HTTP 403` | Google Analytics Data API enable nahi (Step 2) — ya property mein Viewer nahi |
| `GSC API HTTP 403` | Search Console API enable nahi — ya GSC property mein user nahi |
| `GA4 API HTTP 404` | `GA4_PROPERTY_ID` galat — numeric ID chahiye, G- nahi |
| `NO_CREDENTIALS` | `service-account.json` project root mein nahi hai |
| Script "0 events" | Normal — GA4 data 24-48h baad hi aata hai. Realtime abhi check karo. |
