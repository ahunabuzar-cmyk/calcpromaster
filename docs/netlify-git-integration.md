# Netlify Git Integration — Auto-Deploy Bina GitHub Actions (Exact Click Path)

GitHub Actions setup nahi karna chahte? Netlify ki **built-in Git integration**
se har `git push` pe khud deploy hota hai — koi secret, koi workflow nahi chahiye.

> ⚠️ **Requirement:** Repo pehle GitHub pe hona chahiye (browser se banao ya
> `./scripts/gh-repo-setup.sh`). Netlify Git integration GitHub repo ko connect
> karta hai — local folder ko nahi.

---

## Step 1 — Repo GitHub pe (agar abhi nahi hai)

Browser: [github.com/new](https://github.com/new) → naam `calcpro-master` → Create →
phir local se push:

```bash
cd "C:/Users/ok/Documents/website/project"
git config user.name "Aapka Naam"
git config user.email "aapka@email.com"
git branch -M main
git remote add origin https://github.com/USERNAME/calcpro-master.git
git add -A && git commit -m "Launch-ready"
git push -u origin main
```

## Step 2 — Netlify mein repo connect karo

1. Kholo: **https://app.netlify.com** → apni CalcProMaster site par click karo.
2. Left sidebar → **Deploys** → **Deploy settings** (ya "Build & deploy").
3. **Build settings** section → **Linked repository** → **Link repository** button.
4. **GitHub** provider select → apne repo (`calcpro-master`) ko authorize + choose.
5. Netlify **khud detect karega** (netlify.toml se):
   - **Build command:** `npm run lint:js && npm run audit && node build-deploy.js`
   - **Publish directory:** `deploy`
   (dono pehle se `netlify.toml` mein hain — agar khali dikhe to manually
   yehi values daal do)
6. **Deploy site** button dabao.

## Step 3 — Pehla build + verify

1. **Deploys** tab → build shuru → **Production** mein green tick aana chahiye
   (~1-2 min: lint 112 files → audit 543 → build 30 items).
2. Live check: `node scripts/uptime-check.cjs` → 6/6 PASS.
3. Ab se **har `git push` pe khud deploy** — kuch aur karna nahi.

---

## ⚠️ Double-deploy se bachao (zaroori)

Agar **GitHub Actions ka smoke.yml deploy job bhi** active kiya (2 secrets set)
to DONO deploy karenge — duplicate deploys + waste minutes. Fix:

```
GitHub → repo → Settings → Secrets and variables → Actions → Variables →
New repository variable →
Name: SKIP_NETLIFY_DEPLOY   Value: true
```

Ye variable smoke.yml ke deploy + live-smoke jobs ko skip kar deta hai
(`vars.SKIP_NETLIFY_DEPLOY != 'true'` condition) — CI/test jobs chalti rehti hain,
deploy sirf Netlify Git integration se hota hai.

**Ya phir ulta:** Git integration chhodo, sirf GitHub Actions deploy karo
(`docs/netlify-secrets-guide.md` ke 2 secrets). **Dono nahi — ek chuno.**

---

## Comparison

| | GitHub Actions deploy | Netlify Git integration |
|---|---|---|
| Setup | gh + repo + 2 secrets | Repo + browser mein link |
| Deploy trigger | push pe CI tests ke baad | push pe turant |
| Pre-deploy tests | CI (lint/audit/tests) + live-smoke e2e | Sirf build command (lint+audit+build) |
| Post-deploy live smoke | ✅ Playwright e2e LIVE URL pe | ❌ nahi (uptime manual) |
| Fail hone pe alert | 🚨 GitHub issue + webhook | Netlify email only |

> **Recommendation:** GitHub Actions path zyada robust hai (pre-deploy tests +
> live smoke + alerts). Git integration simple hai. Dono mein se ek choose karo —
> `SKIP_NETLIFY_DEPLOY` var se conflict resolve hota hai.
