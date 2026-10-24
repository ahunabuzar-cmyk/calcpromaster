#!/usr/bin/env bash
# Temporary (uncommitted) runner: reproduces the CI quality + build gate sequence
# locally and records PASS/FAIL per gate. Delete after use.
cd "$(dirname "$0")/.." || exit 1
LOG=/tmp/gates.log
: > "$LOG"
FAIL=0

run() {
  local name="$1"; shift
  echo "=== GATE: $name" | tee -a "$LOG"
  if "$@" >>"$LOG" 2>&1; then
    echo "PASS  $name" | tee -a "$LOG"
  else
    echo "FAIL  $name" | tee -a "$LOG"
    FAIL=1
  fi
}

# --- quality job ---
run "lint:js"               npm run --silent lint:js
run "audit"                 npm run --silent audit
run "seo:placeholders"      npm run --silent seo:placeholders
run "intros:check"          npm run --silent intros:check
run "seo:overrides:check"   npm run --silent seo:overrides:check
run "seo:query-quality"     npm run --silent seo:query-quality

# --- build job (deploy/ already built) ---
echo "=== deploy/js syntax" | tee -a "$LOG"
SYNTAX_FAIL=0
for f in $(find deploy/js -name '*.js'); do node --check "$f" >>"$LOG" 2>&1 || { echo "BAD $f" | tee -a "$LOG"; SYNTAX_FAIL=1; }; done
if [ "$SYNTAX_FAIL" -eq 0 ]; then echo "PASS  deploy/js syntax ($(find deploy/js -name '*.js' | wc -l) files)" | tee -a "$LOG"; else echo "FAIL  deploy/js syntax" | tee -a "$LOG"; FAIL=1; fi

run "seo:head:check"        npm run --silent seo:head:check
run "audit:site-bugs"       npm run --silent audit:site-bugs
run "audit:thin"            npm run --silent audit:thin
run "seo:built:audit"       npm run --silent seo:built:audit
run "premium:intros:check"  npm run --silent premium:intros:check
run "fix-article-schema"    node scripts/fix-article-schema.cjs --check
run "seo:dup"               npm run --silent seo:dup
run "seo:dup:compare"       npm run --silent seo:dup:compare
run "seo:overrides:verify"  npm run --silent seo:overrides:verify
run "sitemap-coverage"      node scripts/check-sitemap-coverage.cjs
run "live-routing-guard"    node scripts/live-routing-guard.cjs
run "seo-indexing-audit"    node scripts/seo-indexing-audit.cjs
run "indexing-summary"      node -e "const r=require('./seo-indexing-audit.json').report;console.log(JSON.stringify(r.summary));process.exit(r.summary.fail>0?1:0)"
run "seo:url-format:check"  npm run --silent seo:url-format:check
run "seo:guide-depth:check" npm run --silent seo:guide-depth:check
run "seo:topic-depth:check" npm run --silent seo:topic-depth:check
run "seo:guide-examples"    npm run --silent seo:guide-examples:check
run "check:page-drift"      npm run --silent check:page-drift
run "check:category-dup"    npm run --silent check:category-dup
run "seo:index-regressions" npm run --silent seo:index-regressions
run "cluster:check"         npm run --silent cluster:check
run "seo:cannibal:check"    npm run --silent seo:cannibal:check

echo "=== SUMMARY ===" | tee -a "$LOG"
grep -E "^(PASS|FAIL)  " "$LOG" | tee -a "$LOG"
exit "$FAIL"
