#!/usr/bin/env bash
# =============================================================================
# gh-verify-workflows.sh — check CalcProMaster GitHub Actions run status
#
# Usage:
#   ./scripts/gh-verify-workflows.sh              # show latest run of each workflow
#   ./scripts/gh-verify-workflows.sh --watch      # poll until all running jobs finish
#   ./scripts/gh-verify-workflows.sh --wait 300   # poll with custom timeout (sec)
#
# Shows the three workflows:
#   ci.yml                → lint + audit + unit tests + build (every push)
#   smoke.yml             → uptime + build-smoke + Netlify deploy + live-smoke (main)
#   analytics-trackers.yml → GA4 + GSC trackers (weekly / manual)
# =============================================================================
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "❌ gh CLI not installed. Install: winget install GitHub.cli / brew install gh"
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "❌ gh not authenticated. Run: gh auth login"
  exit 1
fi

MODE="list"
TIMEOUT=300
case "${1:-}" in
  --watch) MODE="watch" ;;
  --wait)  MODE="watch"; TIMEOUT="${2:-300}" ;;
esac

list_runs() {
  echo "──────────────────────────────────────────────"
  echo "Latest run per workflow:"
  for wf in ci.yml smoke.yml analytics-trackers.yml; do
    echo ""
    echo "▶ $wf"
    gh run list --workflow="$wf" --limit 3 2>/dev/null \
      || echo "   (no runs yet — workflow appears after first push)"
  done
}

watch_runs() {
  echo "📡 Polling in-progress runs (timeout ${TIMEOUT}s)…"
  local waited=0
  while [ "$waited" -lt "$TIMEOUT" ]; do
    # Run IDs of all queued/in-progress runs across the three workflows
    # (JSON API — robust against `gh run list` table layout changes)
    local pending
    pending=$(gh run list --json databaseId,status \
      --jq '.[] | select(.status=="queued" or .status=="in_progress") | .databaseId' 2>/dev/null \
      | sort -u || true)
    if [ -z "$pending" ]; then
      echo "✅ No queued/in-progress runs."
      break
    fi
    echo "⏳ Waiting on runs: $(echo "$pending" | tr '\n' ' ')"
    sleep 15
    waited=$((waited + 15))
  done
  echo ""
  list_runs
  echo ""
  echo "🏁 Final status:"
  gh run list --limit 6 2>/dev/null || true
}

if [ "$MODE" = "watch" ]; then watch_runs; else list_runs; fi
