# CalcProMaster — AdSense Setup Guide (exact steps)

Site: **https://calcpromaster.netlify.app** — ad slots code mein ready hain (`#ad-bottom`
placeholder + consent notice). Sirf **approval + real Publisher ID** chahiye.
AdSense application ka result 1-2 hafte ka hota hai, isliye **aaj hi apply kar do**.

---

## STEP 1 — Apply (Google account chahiye)

1. Kholo: **https://adsense.google.com/start** → **Sign up** (Google account se login).
2. **Site URL**: `https://calcpromaster.netlify.app` (ya apna custom domain jab aaye).
3. **Email preferences**: koi bhi → **Submit**.
4. Application review mein **1-2 hafte** lag sakte hain. Tab tak **kuch mat badlo** site pe
   (traffic + content stable rakho).
5. Approval aane par email milega + AdSense dashboard mein **Account approved** dikhega.

> ⚠️ **Tips (approval ke liye):**
> - 543 calculators ka useful content pehle se hai — ye strong signal hai.
> - GSC verify + sitemap submit (dekho `owner-actions-step-by-step.md`) — indexed pages
>   approval mein help karte hain.
> - Site pe abhi koi ads nahi — ye bhi theek hai; pehle approve, phir ads lagao.

---

## STEP 2 — Publisher ID lo

Approval ke baad:
1. AdSense dashboard → **Account** (left sidebar) → **Account information**.
2. **Publisher ID** dikhega: format `pub-XXXXXXXXXXXXXXXX` (pub- + 16 digits).
3. Copy karo.

---

## STEP 3 — `ads.txt` mein ID daalo

File: **`ads.txt`** (project root, `deploy/` mein copy hoti hai)

Abhi file mein placeholder line **comment** hai. Approve hone ke baad:

```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

ko **uncomment** karke apna real ID daalo — aisa:
```
# AdSense ads.txt
google.com, pub-XXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```
(`f08c47fec0942fa0` AdSense ka standard fixed tag hai — ise change nahi karna.)

---

## STEP 4 — Ad slot enable karo (optional but recommended)

Code mein ek ad placeholder ready hai: `index.html` → `<div id="ad-bottom" ...>`.
AdSense dashboard mein **Ads → By ad unit → Display ads** se apna ad unit banao aur uska
**data-ad-client** / **data-ad-slot** code `index.html` ke script mein lagao — ya mujhse
kah do, main code mein proper ad slot inject kar dunga (UX-safe: calculator ke neeche,
result ke baad — inputs pe kabhi nahi).

---

## STEP 5 — Rebuild + deploy

```bash
node build-deploy.js        # ads.txt + site-config deploy/ mein copy hota hai
# deploy/ Netlify pe upload (ya git push)
```

---

## STEP 6 — Verify

1. Live URL kholo: `https://calcpromaster.netlify.app/ads.txt` → tumhara `pub-...` line
   dikhna chahiye (uncommented).
2. AdSense dashboard → **Sites** → site status **"Getting ready"** / **"Active"**.
3. Pehla traffic aane ke baad (GSC + GA4 laga lo), 24-48h mein ad serving shuru hogi.

---

## UX-SAFE AD RULES (site mein already enforced)

- Ads kabhi calculator inputs ko hide nahi karte (`#ad-bottom` result ke neeche hai).
- Consent-gated: user "Accept" kare tab hi personalized ads (site mein notice ready hai).
- Layout stable — ad block miss hone par koi layout shift nahi (reserved slots).

---

## CHECKLIST

- [ ] adsense.google.com pe apply (site URL: https://calcpromaster.netlify.app)
- [ ] Approval ka intezar (1-2 hafte) — beech mein site stable rakho
- [ ] Publisher ID (`pub-...`) copy
- [ ] `ads.txt` uncomment + real ID
- [ ] `node build-deploy.js` + deploy
- [ ] `https://calcpromaster.netlify.app/ads.txt` verify
- [ ] AdSense → Sites → status check
