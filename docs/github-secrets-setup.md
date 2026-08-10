# CalcProMaster — GitHub Secrets Setup Guide (click-by-click)

Har Monday 07:30 UTC pe `.github/workflows/analytics-trackers.yml` GA4 + GSC trackers
khud chalata hai. Iske liye 2 repo secrets chahiye. Ye guide aapko **exact click-by-click**
deta hai — ~10 min, ek baar.

> Pehle karo: `docs/api-credentials-setup.md` — service account banao + APIs enable karo
> (uske bina secrets ka koi matlab nahi).

---

## STEP 1 — Base64 nikaalo (service-account.json se)

`service-account.json` (Google Cloud se download ki hui file) ka **base64** chahiye.
Ek hi line ka output milega.

### Windows PowerShell (recommended)
1. `service-account.json` ko kahin yaad rakhne wali jagah rakho, e.g. `C:\Users\ok\Downloads\`
2. PowerShell kholo (Start → "PowerShell") aur ye paste karo:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\ok\Downloads\service-account.json")) | Set-Content C:\Users\ok\Downloads\service-account-b64.txt
   ```
3. `service-account-b64.txt` kholo — ek lambe string wali line hogi (thousands of chars).
   Usse **poora copy** karo (Ctrl+A → Ctrl+C).

### Git Bash (jo aapke project mein use hota hai)
```bash
base64 -w0 "C:/Users/ok/Downloads/service-account.json" > "C:/Users/ok/Downloads/service-account-b64.txt"
cat "C:/Users/ok/Downloads/service-account-b64.txt"   # copy the single long line
```

> ⚠️ Base64 **newline-free single line** hona chahiye — agar file wrap ho gayi hai to
> secret corrupt hoga (workflow mein "Validate service account" step fail ho jayega).
> `-w0` (Git Bash) / `Set-Content` (PowerShell) dono single-line dete hain.

---

## STEP 2 — GitHub repo se connect (agar abhi nahi hai)

```bash
cd "C:/Users/ok/Documents/website/project"
git remote add origin https://github.com/<your-user>/calcpromaster.git   # agar missing
git push -u origin main
```

---

## STEP 3 — Secrets set karo (GitHub pe)

1. **github.com** → apna `calcpromaster` repo kholo.
2. **Settings** tab (repo ke upar, tabs ke beech) → left sidebar mein
   **Secrets and variables → Actions**.
3. **New repository secret** pe click karo — 2 baar karna hai:

| Secret name | Value |
|---|---|
| `SERVICE_ACCOUNT_B64` | Step 1 ka base64 (poori single line) |
| `GA4_PROPERTY_ID` | Numeric property ID — analytics.google.com → Admin → Property Settings → **Property ID** (e.g. `123456789`, **G-XXXX nahi**) |

   Har baar **Add secret** dabao.

> 🔒 Secrets GitHub pe encrypted rehte hain — koi (aapke alawa) unhe read nahi kar sakta.
> Logs mein kabhi print nahi hote (env-var se pass hote hain).

---

## STEP 4 — Test karo (manual run)

1. Repo → **Actions** tab → left mein **CalcProMaster — Weekly GA4 + GSC Trackers**.
2. **Run workflow** button (right side) → green **Run workflow**.
3. ~1 min baad dono jobs (`ga4-events`, `gsc-indexing`) dikhengi:
   - ✅ green tick = data aagaya — run pe click karke output dekho
   - ⏭ skipped = secret set nahi hua (name galat?) — Steps 3 check karo
   - ❌ red = API error — run logs mein exact error + fix (troubleshooting table niche)

---

## Troubleshooting

| Red error | Fix |
|---|---|
| `Validate service account` fails | Base64 corrupt/wrapped — Step 1 dobara, single-line confirm |
| `NO_CREDENTIALS` | `service-account.json` runner pe nahi bana — secret name check karo |
| `OAuth token exchange failed (403)` | Service-account email GA4/GSC mein add nahi — `docs/api-credentials-setup.md` Steps 4-5 |
| `GA4 API HTTP 403` | Google Analytics Data API enable nahi — `docs/api-credentials-setup.md` Step 2 |
| `GSC API HTTP 403` | Search Console API enable nahi — ya GSC property mein user nahi |
| `GA4 API HTTP 404` | `GA4_PROPERTY_ID` galat — numeric ID, G- nahi |
| Job skipped (⏭) hamesha | Secret name exact match nahi — `SERVICE_ACCOUNT_B64` / `GA4_PROPERTY_ID` spell check |

---

## Weekly flow (kya hoga automatic)

- **Monday 07:30 UTC** → dono trackers chalte hain → snapshots artifacts mein
- **Data dekhne ke liye:** Actions run → job → step output (console mein hi sab kuch)
- **Trend history:** artifacts ~90 din expire — download karke save karo agar history chahiye
- **Failure:** 🚨 GitHub issue khul jata hai (ga4 vs gsc alag title) — bas issue kholo, cause wahi explain hota hai

## Local bhi chalta hai (bina GitHub ke)

```bash
# service-account.json project root mein rakho + GA4_PROPERTY_ID env set karo
GA4_PROPERTY_ID=123456789 npm run monitor:ga4
npm run monitor:gsc
```
