#!/usr/bin/env bash
# Temporary (uncommitted) runner: runs the e2e suite one spec file + one project
# per Playwright process. A single 2,900-test run died on Windows with
# "worker process exited unexpectedly (code=3221225794)" after ~1,350 tests, so
# each chunk gets a fresh process. Delete after use.
cd "$(dirname "$0")/.." || exit 1
LOG=/tmp/e2e_final.log
: > "$LOG"
FAILED=""

for f in tests/e2e/*.spec.js; do
  for p in desktop-chromium mobile-chromium; do
    echo "=== CHUNK $f [$p]" >>"$LOG"
    if npx playwright test "$f" --project="$p" --reporter=line >>"$LOG" 2>&1; then
      echo "CHUNK-PASS $f [$p]" >>"$LOG"
    else
      echo "CHUNK-FAIL $f [$p]" >>"$LOG"
      FAILED="$FAILED $f:$p"
    fi
  done
done

echo "=== CHUNK SUMMARY ===" >>"$LOG"
grep -E "^CHUNK-" "$LOG" >>"$LOG"
if [ -n "$FAILED" ]; then
  echo "E2E FAILED:$FAILED" >>"$LOG"
  exit 1
fi
echo "E2E ALL CHUNKS PASSED" >>"$LOG"
exit 0
