#!/usr/bin/env bash
# =============================================================================
# gh-repo-setup.sh — CalcProMaster GitHub repo create + push + secrets (one-shot)
#
# Usage:
#   ./scripts/gh-repo-setup.sh [repo-name]
#     repo-name defaults to "calcpro-master" if omitted
#
# Optional env vars (only secrets you provide are set — others skipped):
#   SERVICE_ACCOUNT_B64   base64 of Google service-account JSON
#                         (PowerShell: [Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json")))
#   GA4_PROPERTY_ID       numeric GA4 property ID (NOT G-XXXX)
#   NETLIFY_AUTH_TOKEN    Netlify → User settings → Applications → New access token
#   NETLIFY_SITE_ID       Netlify → Site → Site settings → Site details → Site ID
#   ALERT_WEBHOOK_URL     optional alert webhook (for smoke.yml failures)
#   GIT_NAME / GIT_EMAIL  identity for the commit (set locally if unset)
#
# What it does:
#   1. verifies gh CLI is installed + authenticated
#   2. renames branch master → main  (REQUIRED: smoke.yml deploy/live-smoke
#      jobs only run on refs/heads/main)
#   3. creates the GitHub repo (--public unless GH_PRIVATE=1) and pushes
#   4. sets every secret you provided
#   5. lists the workflow runs so you can confirm ci.yml triggered
# =============================================================================
set -euo pipefail

REPO_NAME="${1:-calcpro-master}"
VISIBILITY="public"
if [ "${GH_PRIVATE:-0}" = "1" ]; then VISIBILITY="private"; fi

echo "🚀 CalcProMaster GitHub setup — repo: $REPO_NAME ($VISIBILITY)"

# ---- 1. gh CLI -------------------------------------------------------------
if ! command -v gh >/dev/null 2>&1; then
  echo "❌ gh CLI not installed."
  echo "   Install (one time), then re-run this script:"
  echo "     Windows (PowerShell):   winget install GitHub.cli"
  echo "     macOS (Homebrew):       brew install gh"
  echo "     Linux (apt):            sudo apt install gh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "❌ gh is installed but not authenticated."
  echo "   Run:  gh auth login   (browser flow — paste the code)"
  exit 1
fi
echo "✅ gh CLI authenticated as: $(gh api user -q .login)"

# ---- 2. git identity -------------------------------------------------------
if [ -z "$(git config user.name 2>/dev/null || true)" ]; then
  if [ -n "${GIT_NAME:-}" ]; then git config user.name "$GIT_NAME"; else
    echo "⚠️  git user.name not set — commit will fail. Set GIT_NAME / GIT_EMAIL env vars or run:"
    echo "   git config user.name \"Your Name\""
    echo "   git config user.email \"you@example.com\""
    exit 1
  fi
fi
if [ -z "$(git config user.email 2>/dev/null || true)" ]; then
  if [ -n "${GIT_EMAIL:-}" ]; then git config user.email "$GIT_EMAIL"; else
    echo "⚠️  git user.email not set — set GIT_EMAIL env var or run:"
    echo "   git config user.email \"you@example.com\""
    exit 1
  fi
fi
echo "✅ git identity: $(git config user.name) <$(git config user.email)>"

# ---- 3. branch → main -------------------------------------------------------
if [ "$(git branch --show-current)" != "main" ]; then
  echo "↪️  Renaming branch to main (smoke.yml deploy job requires refs/heads/main)"
  git branch -M main
fi

# ---- 4. create repo + push --------------------------------------------------
GH_USER=$(gh api user -q .login)
if git remote get-url origin >/dev/null 2>&1; then
  echo "ℹ️  origin already set: $(git remote get-url origin)"
elif gh repo view "$REPO_NAME" >/dev/null 2>&1; then
  echo "ℹ️  Repo '$REPO_NAME' already exists on GitHub ($GH_USER) — adding remote + pushing"
  git remote add origin "https://github.com/$GH_USER/$REPO_NAME.git"
  git push -u origin main
else
  echo "↪️  Creating GitHub repo '$REPO_NAME' ($VISIBILITY) and pushing…"
  gh repo create "$REPO_NAME" --"$VISIBILITY" --source=. --remote=origin --push
  echo "✅ Repo created + pushed: https://github.com/$GH_USER/$REPO_NAME"
fi

# ---- 5. secrets --------------------------------------------------------------
# SERVICE_ACCOUNT_B64 not provided but service-account.json exists in the root?
# Encode it directly — avoids the base64 ever touching shell history/scrollback.
if [ -z "${SERVICE_ACCOUNT_B64:-}" ] && [ -f service-account.json ]; then
  SERVICE_ACCOUNT_B64=$(base64 -w0 service-account.json)
  echo "🔑 service-account.json found — encoding automatically (value stays out of shell history)"
fi

set_secret() {
  local name="$1" value="$2"
  if [ -n "$value" ]; then
    if echo "$value" | gh secret set "$name"; then
      echo "✅ Secret set: $name"
    else
      echo "⚠️  Could not set $name — repo must exist on GitHub and gh must be authed"
      echo "   (retry manually:  gh secret set $name < value-file)"
    fi
  else
    echo "⏭  Skipping $name (not provided)"
  fi
}
set_secret SERVICE_ACCOUNT_B64  "${SERVICE_ACCOUNT_B64:-}"
set_secret GA4_PROPERTY_ID      "${GA4_PROPERTY_ID:-}"
set_secret NETLIFY_AUTH_TOKEN   "${NETLIFY_AUTH_TOKEN:-}"
set_secret NETLIFY_SITE_ID      "${NETLIFY_SITE_ID:-}"
set_secret ALERT_WEBHOOK_URL    "${ALERT_WEBHOOK_URL:-}"

# ---- 6. workflow verification -------------------------------------------------
echo ""
echo "📋 Waiting for first workflow runs (ci.yml triggers on push)…"
for i in 1 2 3 4 5 6; do
  RUNS=$(gh run list --limit 5 2>/dev/null || true)
  if [ -n "$RUNS" ]; then break; fi
  sleep 5
done
echo "$RUNS" | head -10 || true

echo ""
echo "✅ Done. Next steps:"
echo "   1. Watch CI:       gh run watch --exit-status (or open the Actions tab)"
echo "   2. Verify details: ./scripts/gh-verify-workflows.sh"
echo "   3. Local test:     npm run lint:js && npm run audit && npm run test:unit"
