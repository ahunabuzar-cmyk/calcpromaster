#!/usr/bin/env bash
# Temporary (uncommitted) resume runner for the e2e sweep. The first pass died
# when the machine restarted mid health-check (1,247/1,285 desktop tests, zero
# failures). This runs the chunks that still have no CHUNK-PASS line, appending
# to the same log so the earlier passes stay on record. Delete after use.
cd "$(dirname "$0")/.." || exit 1
LOG=/tmp/e2e_final.log
FAILED=""

for f in tests/e2e/health-check.spec.js \
         tests/e2e/hub-cls-3g.spec.js \
         tests/e2e/hub-tables.spec.js \
         tests/e2e/mobile-mic-layout.spec.js \
         tests/e2e/mobile-sliders.spec.js \
         tests/e2e/pdf-export-header.spec.js \
         tests/e2e/pwa-install.spec.js \
         tests/e2e/responsive.spec.js \
         tests/e2e/safe-area-tap-targets.spec.js \
         tests/e2e/smart-search-ui.spec.js; do
  for p in desktop-chromium mobile-chromium; do
    if grep -qF "CHUNK-PASS $f [$p]" "$LOG" 2>/dev/null; then
      echo "=== SKIP $f [$p] (already passed)" >>"$LOG"
      continue
    fi
    echo "=== CHUNK $f [$p] $(date +%H:%M:%S)" >>"$LOG"
    if npx playwright test "$f" --project="$p" --reporter=line >>"$LOG" 2>&1; then
      echo "CHUNK-PASS $f [$p]" >>"$LOG"
    else
      echo "CHUNK-FAIL $f [$p]" >>"$LOG"
      FAILED="$FAILED $f:$p"
    fi
  done
done

echo "=== RESUME SUMMARY $(date +%H:%M:%S) ===" >>"$LOG"
grep -E "^CHUNK-" "$LOG" >>"$LOG"
if [ -n "$FAILED" ]; then
  echo "E2E FAILED:$FAILED" >>"$LOG"
  exit 1
fi
echo "E2E ALL CHUNKS PASSED" >>"$LOG"
exit 0
