# GitHub CLI Setup — Repo + Secrets + Workflow Verify (No Browser)

Sara kaam `gh` CLI se — browser sirf `gh auth login` ke OAuth window ke liye
kholna padega (ek baar). Baaki sab terminal se.

## 1. Install gh (one time)

`gh` abhi is PC pe install nahi hai — pehle ye:

| OS | Command |
|---|---|
| Windows (PowerShell) | `winget install GitHub.cli` |
| macOS | `brew install gh` |
| Linux | `sudo apt install gh` |

Phir terminal band/khole aur verify: `gh --version`

## 2. Authenticate (one time)

```bash
gh auth login
# → GitHub.com → HTTPS → Login with a web browser → code paste karo → Authorize
```

Verify: `gh auth status` → "Logged in to github.com as ..."

Bonus (credential helper — push pe baar-baar login nahi puchhega):

```bash
gh auth setup-git
```

## 3. Git identity (zaroori — abhi set nahi hai)

```bash
git config user.name "Aapka Naam"
git config user.email "aapka@email.com"
```

## 4. Repo banao + push — EK command (sab kuch)

```bash
cd "C:/Users/ok/Documents/website/project"

# CRITICAL: smoke.yml ka deploy job sirf main branch pe chalta hai
git branch -M main

# Repo create + remote + push ek saath (--push current branch push kar deta hai)
gh repo create calcpro-master --public --source=. --remote=origin --push
# Private chahiye?  →  --private  (Actions dono mein chalta hai)
```

`--source=.` matlab aapki current directory ka content, `--remote=origin` remote
jodta hai, `--push` turant push kar deta hai. Iske baad Actions tab mein teeno
workflows (ci.yml, smoke.yml, analytics-trackers.yml) dikh jayengi.

## 5. Secrets set karo (trackers + deploy ke liye)

```bash
# Google service account — base64 banao (docs/api-credentials-setup.md pehle padho)
# NOTE: value ko terminal history mein mat dalo — file se pipe karo:
base64 -w0 service-account.json > service-account.b64
gh secret set SERVICE_ACCOUNT_B64 < service-account.b64 && rm service-account.b64

gh secret set GA4_PROPERTY_ID -b"123456789"          # numeric ID (G-XXXX nahi)

# Netlify CI deploy ke liye (smoke.yml ka deploy job) — optional agar Netlify
# Git integration use karte ho to skip + SKIP_NETLIFY_DEPLOY=true variable banao
gh secret set NETLIFY_AUTH_TOKEN < netlify-token.txt
gh secret set NETLIFY_SITE_ID -b"YAHAN_SITE_ID"

# Optional: smoke fail hone pe webhook alert
gh secret set ALERT_WEBHOOK_URL -b"https://hooks.example.com/..."
```

> **Secret hygiene:** `-b"value"` se value terminal history (`history` command) aur
> scrollback mein chali jati hai. File se pipe karo (`< file`) — history mein kuch nahi jata.
> `gh-repo-setup.sh` ko `SERVICE_ACCOUNT_B64` na do to wo khud `service-account.json`
> (gitignored) se encode kar leta hai — bilkul history touch nahi hoti.

Verify secrets: `gh secret list`

## 6. Workflows verify karo

```bash
# Sabse recent runs (teeno workflows):
gh run list --limit 6

# CI ka result wait karke dekho (--exit-status: fail pe exit 1):
gh run watch --exit-status

# Hamara helper — latest run per workflow:
./scripts/gh-verify-workflows.sh
# Live poll jab tak sab finish na ho:
./scripts/gh-verify-workflows.sh --watch
```

## 7. Manual workflow trigger (Monday ka wait mat karo)

```bash
gh workflow run analytics-trackers.yml
gh workflow run smoke.yml
gh workflow run ci.yml        # ya bas koi bhi push kar do — CI khud chalta hai
```

## 8. First-run notes

- **Pehli baar push pe** Actions tab mein "Enable" approve karna pad sakta hai
  (security — sirf pehli baar, aapke account se confirm hota hai).
- **`workflow_dispatch` jobs** (smoke/analytics) Action tab → Run workflow button
  se bhi chalti hain — gh ke bina bhi.
- **Local pre-push test** (CI GitHub pe wahi karega):
  ```bash
  npm run lint:js && npm run audit && npm run test:unit && node build-deploy.js
  ```
  Abhi locally 112/0 lint, 726/726 tests, deploy 86 JS files syntax OK — sab green.

## One-shot script (sab upar wale ek command mein)

```bash
# service-account.json root mein ho to base64 khud ban jata hai (history-safe):
GA4_PROPERTY_ID="123456789" \
NETLIFY_AUTH_TOKEN="..." NETLIFY_SITE_ID="..." \
GIT_NAME="Aapka Naam" GIT_EMAIL="aapka@email.com" \
./scripts/gh-repo-setup.sh calcpro-master
```

`scripts/gh-repo-setup.sh` branch rename → repo create (agar pehle se bana hai to sirf
remote + push) → push → secrets (na doge to skip, ya service-account.json se auto-encode)
→ workflow list sab kar deta hai.
