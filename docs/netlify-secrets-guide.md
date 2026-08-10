# Netlify Secrets — NETLIFY_AUTH_TOKEN + NETLIFY_SITE_ID (Exact Click Path)

Ye 2 values `smoke.yml` ke deploy job ke liye GitHub Secrets mein jaati hain.
Values kabhi kisi source file mein nahi — sirf GitHub Secrets mein.

---

## 1. NETLIFY_AUTH_TOKEN (Personal Access Token)

1. Kholo: **https://app.netlify.com** → login (apne Netlify account se).
2. Top-right corner mein apna **avatar** click karo → **User settings**.
3. Left sidebar → **Applications** (ya "Applications & tokens").
4. **Personal access tokens** section → **New access token** button.
5. Description: `github-actions-deploy` (koi bhi naam) → **Create token**.
6. Token **sirf isi screen pe dikhega** (copy karo — phir kabhi nahi dikhega):
   ```
   Copy → GitHub → Settings → Secrets and variables → Actions →
   New repository secret →
   Name: NETLIFY_AUTH_TOKEN   Value: <copied token>   → Add secret
   ```
   (Token `nfp_...` ya alphanumeric format hota hai — kabhi share mat karna.)

> Token bhool gaye? Usse delete karke naya banao — old expire ho jata hai.

---

## 2. NETLIFY_SITE_ID (Site ID)

1. Kholo: **https://app.netlify.com** → apni **CalcProMaster** site par click karo.
2. Left sidebar → **Site configuration** (ya "Site settings").
3. **Site details** section → **Site ID** line (UUID jaisa `a1b2c3d4-...` format).
4. **Copy** karo → GitHub secret:
   ```
   GitHub → Settings → Secrets and variables → Actions →
   New repository secret →
   Name: NETLIFY_SITE_ID   Value: <copied Site ID>   → Add secret
   ```

---

## 3. Optional: ALERT_WEBHOOK_URL

smoke failure pe webhook alert (ntfy/Slack) — `docs/owner-actions-step-by-step.md` §6.
Na do to bhi deploy chalta hai, bas alert nahi jata.

---

## 4. Verify (gh installed hone par)

```bash
gh secret list          # dono names dikhne chahiye (values kabhi nahi dikhti)
```

**Security:** GitHub secrets display `***` — values view/edit nahi hote. Agar kabhi
kisi file/log mein token nazar aaye, Netlify pe token revoke karo aur naya banao.
