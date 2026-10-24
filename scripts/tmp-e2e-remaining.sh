#!/usr/bin/env bash
# Temporary (uncommitted) resumable runner for the remaining e2e chunks.
# Runs one spec file + one Playwright project per process (the single 2,900-test
# run dies on Windows with an unexpected worker exit), and records a marker per
# chunk so a restart resumes instead of redoing work. Delete after use.
cd "$(dirname "$0")/.." || exit 1
LOG=/tmp/e2e_rest.log
MARK=/tmp/e2e-done
mkdir -p "$MARK"
FAILED=""

SPECS="health-check.spec.js hub-cls-3g.spec.js hub-tables.spec.js mobile-mic-layout.spec.js mobile-sliders.spec.js pdf-export-header.spec.js pwa-install.spec.js responsive.spec.js safe-area-tap-targets.spec.js smart-search-ui.spec.js"

for f in $SPECS; do
  for p in desktop-chromium mobile-chromium; do
    key="${f}__${p}"
    if [ -f "$MARK/$key" ]; then continue; fi
    echo "=== CHUNK tests/e2e/$f [$p] $(date +%H:%M:%S)" >>"$LOG"
    if npx playwright test "tests/e2e/$f" --project="$p" --reporter=line >>"$LOG" 2>&1; then
      echo "CHUNK-PASS tests/e2e/$f [$p]" >>"$LOG"
      touch "$MARK/$key"
    else
      echo "CHUNK-FAIL tests/e2e/$f [$p]" >>"$LOG"
      FAILED="$FAILED $f:$p"
    fi
  done
done

echo "=== SUMMARY $(date +%H:%M:%S)" >>"$LOG"
if [ -n "$FAILED" ]; then
  echo "E2E FAILED:$FAILED" >>"$LOG"
  exit 1
fi
echo "E2E ALL REMAINING CHUNKS PASSED" >>"$LOG"
exit 0
