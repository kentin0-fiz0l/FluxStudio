#!/usr/bin/env bash
#
# Post-Deployment Smoke Test Runner
#
# Sprint 42: Phase 5.5 Deployment Confidence
#
# Usage:
#   ./tests/smoke/run-smoke.sh https://api.fluxstudio.art
#   ./tests/smoke/run-smoke.sh http://localhost:3001
#

set -euo pipefail

TARGET_URL="${1:-http://localhost:3001}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "============================================"
echo "  FluxStudio Post-Deployment Smoke Tests"
echo "  Target: $TARGET_URL"
echo "============================================"
echo ""

# --- API Health Checks (curl-based, no Playwright needed) ---
echo "--- API Health Checks ---"

check_endpoint() {
  local path="$1"
  local expected_status="$2"
  local label="$3"

  status=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL$path" || echo "000")

  if [ "$status" = "$expected_status" ]; then
    echo "  PASS  $label ($path → $status)"
  else
    echo "  FAIL  $label ($path → $status, expected $expected_status)"
    FAILURES=$((FAILURES + 1))
  fi
}

FAILURES=0

check_endpoint "/health"       "200" "Health endpoint"
check_endpoint "/health/live"  "200" "Liveness probe"
check_endpoint "/health/ready" "200" "Readiness probe"
check_endpoint "/api/auth/me"  "401" "Auth guard (no token → 401)"

echo ""
echo "--- API Health: $((4 - FAILURES))/4 passed ---"
echo ""

# --- Playwright Smoke Tests (if available) ---
if command -v npx &> /dev/null; then
  echo "--- Running Playwright Smoke Tests ---"
  cd "$PROJECT_DIR"

  SMOKE_TEST_URL="$TARGET_URL" npx playwright test tests/smoke/ \
    --config=playwright.config.ts \
    --reporter=list \
    --timeout=30000 \
    2>&1 || {
      echo ""
      echo "Playwright smoke tests had failures (see above)"
      FAILURES=$((FAILURES + 1))
    }
else
  echo "--- Skipping Playwright tests (npx not available) ---"
fi

echo ""
echo "============================================"
if [ "$FAILURES" -eq 0 ]; then
  echo "  ALL SMOKE TESTS PASSED"
  echo "============================================"
  exit 0
else
  echo "  $FAILURES SMOKE TEST(S) FAILED"
  echo "============================================"
  exit 1
fi
