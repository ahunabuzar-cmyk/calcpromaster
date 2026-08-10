# CalcProMaster — GA4 Setup Guide (Measurement ID)

GA4 code **already fully wired** in the site (consent-gated, event-ready). Sirf aapka real
Measurement ID (`G-XXXX`) chahiye jo aapke Google account se banta hai. Ye guide 10 minute ka hai.

## Code jo pehle se live hai (kuch nahi karna)

| Piece | Kahan | Status |
|---|---|---|
| gtag.js loader | `index.html` | sirf load hota hai jab `SITE_GA4_READY` true ho |
| Consent Mode | `index.html` (`gtag('consent', 'default', ...)`) | `analytics_storage: denied` default — user "Accept" pe update |
| `calculator_use` event | `js/app.js:1529` | har calculation pe fire: `{ tool_id, tool_category }` — **koi input values/PII nahi** |
| Gate | `js/site-config.js` | `SITE_GA4_READY = /^G-[A-Z0-9]{6,}$/.test(ga4Id)` — placeholder kabhi load nahi hota |

## STEP 1 — Property + Measurement ID banao (10 min)

1. **https://analytics.google.com** kholo (wahi Google account jo GSC ke liye use karoge).
2. Niche left corner → **Admin** (⚙️) → **Create property** → naame: `CalcProMaster`.
3. Reporting timezone → apna (e.g. `(GMT+05:00) Asia/Karachi`) → currency → **Create**.
4. Industry → koi bhi → **Create**. (Business details skip ho sakti hain.)
5. **Data streams** → **Add stream** → **Web** → Website URL: `https://calcpromaster.netlify.app` →
   Stream name: `CalcProMaster Web` → **Create stream**.
6. **Measurement ID** screen pe dikhega: `G-XXXXXXXXXX` → **copy**.

## STEP 2 — ID paste karo + redeploy (1 command, ~2 min)

Measurement ID milte hi — **sab kuch ek command mein** (config update + build + Netlify deploy + live verify):

```bash
node scripts/set-ga4.cjs G-AB12CD34EF5
```

Ye script khud karti hai:
1. ID format validate (`G-` + 6+ alphanumerics, placeholder reject)
2. `js/site-config.js` mein `ga4Id` update (+ `gsc` bhi live code set)
3. `node build-deploy.js` (production artifact rebuild)
4. Netlify production deploy
5. 25s CDN wait + LIVE verify (homepage meta, app.js mein ID, gtag loader)

Manual alternative: `js/site-config.js` mein `ga4Id: 'G-XXXXXXXXXX'` paste karo →
`node build-deploy.js` → `deploy/` upload.

## STEP 3 — LIVE verify (3 min)

1. Live site kholo → **F12** → **Network** tab → filter: `gtag` → `googletagmanager.com/gtag/js?id=G-...` request dikhni chahiye (HTTP 200).
2. Koi calculator kholo (e.g. `/finance/loan-emi`) → Calculate dabao → Network mein `collect` request aani chahiye with `en=calculator_use` & `tool_id=loan-emi` (query param).
3. **GA4 dashboard** → **Realtime** report → apna page-view + `calculator_use` event 5-30 sec mein dikhega.

## Automatically verify by script

```bash
# Deployed app.js mein event present? (2 min quick check)
curl -s https://calcpromaster.netlify.app/js/app.js | grep -c calculator_use
```

`1` aaye = event deployed. (Fire hone ka confirmation browser/GA4 Realtime mein hota hai.)

## Best practices (built-in)

- **Consent-gated:** user "Accept" kare tab hi GA4 data jaata hai — GDPR/consent-safe.
- **No PII:** `calculator_use` event mein sirf `tool_id` + `tool_category` — input values, loan amounts,
  health data, email, kuch bhi nahi.
- **CSP safe:** Content-Security-Policy mein `googletagmanager.com` / `google-analytics.com` already allowlisted (`netlify.toml`).
- **placeholder-safe:** jab tak `G-XXXX` nahi aata, gtag script **load hi nahi hoti** — koi broken request nahi.

## Typical timeline

- Real-time data: turant (Realtime report).
- Standard reports (Traffic acquisition, Pages, Events): 24-48 hours.
- GSC mein queries/clicks data: 1-2 hafte baad (alag system hai — GA4 traffic aur GSC search data combine karo).
