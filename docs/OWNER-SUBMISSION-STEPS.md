# CalcProMaster — Owner Submission Steps (exact, step by step)

Har item ke liye: **kya karo → kahan click → kya likho**. Jahan main (agent) kar sakta hoon
wo 🔵 se mark hai; jahan aap karo ⚪ se.

Site: `https://calcpromaster.com` (ab live, 200). Terminal: Git Bash, folder
`C:\Users\ok\Documents\Calculator\project`.

---

## 1) 🔵 GSC login (ek baar) — phir sitemap resubmit MAIN karunga

**Kyun:** GSC ka refresh token expire ho gaya hai. Naya token sirf browser login se banta hai
(aapka Google account) — isliye ye step aapka hai. Login ke baad submit main karunga.

**Steps:**
1. Terminal kholo, project folder me jao:
   ```
   cd /c/Users/ok/Documents/Calculator/project
   ```
2. Chalao:
   ```
   node scripts/gsc-oauth-login.cjs
   ```
3. Terminal ek **URL** print karega (`https://accounts.google.com/o/oauth2/...`). Us URL ko
   **browser me kholo** (jis browser me `fazliabuzar7@gmail.com` login hai).
4. Google screen: account choose karo → **Allow**.
   - "Google hasn't verified this app" aaye to: **Continue** → **Allow** (normal hai — app sirf aapke liye hai).
5. Browser me **✅ Done** aa jayega → terminal par bhi ✅. Bas.
   - Server na chale / URL na khule to: `node scripts/gsc-oauth-login.cjs --paste` (paste mode).

**⚠️ Ye bhi karo (ek baar, ~2 min) — warna har 7 din ye login dobara karna padega:**

Purana token `2026-10-12` ko isliye mara tha ki OAuth consent screen **"Testing"** status mein hai,
aur Google aise apps ka **har refresh token 7 din** mein expire kar deta hai. Isko band karne ke liye:

> Google Cloud Console → **APIs & Services** → **OAuth consent screen** → **Publishing status**
> → **PUBLISH APP** → <https://console.cloud.google.com/apis/credentials/consent>

App phir bhi *unverified* hi rahega — "Google hasn't verified this app" warning aur **Continue**
waise hi kaam karte rahenge. Farq sirf itna: token 7 din par nahi marega.

**Uske baad mujhe bolo:** "GSC login ho gaya" — main ye chala dunga:
```
node scripts/gsc-batch-inspect.cjs
```
Ye sitemap resubmit karega aur 100 priority URLs ka index-status dikhayega.

---

## 2) 🔵/⚪ GSC sitemap resubmit

- **Aasan (mere through):** Step 1 ke baad main khud chala dunga (upar).
- **Aap khud UI se:** https://search.google.com/search-console → property
  `https://calcpromaster.com/` select karo → left menu **Sitemaps** → "Add a new sitemap" me
  sirf ye likho: `sitemap.xml` → **Submit**. Status "Success" aa jaye.

Agar property list me `calcpromaster.com` nahi hai:
- Search Console → property dropdown → **Add property** → **URL prefix** → `https://calcpromaster.com`
  → verify (**HTML tag** method: tag dega, jo `index.html` me already `googled1ac20b54b36e7cf` ke roop me hai, ya DNS verify).

---

## 3) ⚪ GSC "Request Indexing" (per-URL, sirf UI — API me nahi hai)

Roz 5–10 important URL is tarah bhejo (limit ~10–20/din):

1. https://search.google.com/search-console → property `https://calcpromaster.com/`.
2. Sabse upar **URL Inspection** bar me URL paste karo, e.g. `https://calcpromaster.com/finance/loan-emi/`
3. Enter → "Request Indexing" button → wait → "Indexing requested".

**Pehle ye URLs (priority):**
```
https://calcpromaster.com/
https://calcpromaster.com/about
https://calcpromaster.com/privacy
https://calcpromaster.com/finance/loan-emi/
https://calcpromaster.com/health/bmi/
https://calcpromaster.com/math/percentage/
https://calcpromaster.com/hub/finance/
https://calcpromaster.com/hub/health/
https://calcpromaster.com/guides/
https://calcpromaster.com/embed/
```
> Note: `/about`, `/privacy` wagera abhi **redirect-loop** me hain kyunki naya build deploy nahi hua.
> Jo maine fix kiya hai wo **deploy ke baad** theek honge — pehle deploy, phir inse Request Indexing.

---

## 4) ⚪ Backlink submissions (account + email verify = sirf aap)

File kholo: `docs/BACKLINK-BATCH-01-COPYPASTE.md`. Day 1 ke 5 targets:

1. **Medium** (medium.com) — Google se sign in → New Story → Title + body + 1–2 links → Publish.
2. **Hashnode** (hashnode.com) — GitHub se sign in → New Article → paste → Publish.
3. **Dev.to** (dev.to) — GitHub se sign in → New Post → paste → Publish.
4. **SaaSHub** (saashub.com) — email/Google → Submit product → Short + Long + tags.
5. **Quora** — Google → real question ka genuine answer + apna link.

Har ek ke **exact fields** (Title/Short/Long/Tags) us file me already hain — copy-paste karo.
Submit ke baad `docs/backlink-tracker.csv` me **date + link** likh do.

**Rules:** 5/din se zyada nahi · har site par **unique password** · anchor 90% brand.

---

## 5) ⚪ Netlify cleanup + GSC setting (safe)

**Netlify old host (`calcpromaster.netlify.app` abhi 503):**
- **Recommended (safe, kuch na karo):** Google apne aap `.com` ko canonical maan lega (site ka
  canonical `.com` hai) aur purana host fade ho jayega. Kuch tootega nahi.
- **Turant hataana ho to:** https://app.netlify.com → site selected → **Site settings → General →
  Danger zone → Delete this site**. Isse netlify.app domain unassign ho jayega (Google us host ko drop kar dega).
- ⚠️ **Un-pause mat karo** — account "usage_exceeded" tha, dobara 503 hi dega.
- Agar aap Netlify rakhna chahte ho: us site ka `_redirects` already
  `netlify.app/* → calcpromaster.com/:splat 301` rakhta hai, to un-pause karne par purane backlinks
  `.com` par 301 ho jayenge — par pehle usage limit theek karni padegi.

**GSC setting:**
- Property `https://calcpromaster.com/` verified honi chahiye (dekho Step 2 ka note).
- `sitemap.xml` submit (Step 2).
- (Google ne "Change of Address" tool hata diya hai — uski zaroorat nahi; canonical + sitemap kaafi hai.)

---

## Order (sabse behtar tareeqa)

1. **Netlify `/.com` DNS** — ho chuka ✅ (.com live, 200).
2. **Deploy** karo (redirect-loop + FAQ + embed footer link live karne ke liye) — *mera kaam, aapke "deploy" bolne par*.
3. **`node scripts/gsc-oauth-login.cjs`** — aapka login.
4. Phir **mujhe bolo** → main GSC sitemap resubmit + inspection chalata hoon.
5. **GSC UI** se 10 priority URLs Request Indexing.
6. **Backlinks** — Batch-01 Day 1 ke 5 submissions.
7. **IndexNow** — ho chuka ✅ (Bing/Yandex, 1415 URLs).
