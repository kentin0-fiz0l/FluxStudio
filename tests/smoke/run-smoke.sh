#!/usr/bin/env bash
#
# Post-Deployment Smoke Test Runner
#
# Validates all 3 FluxStudio services are healthy after deployment:
# - API server (Express, port 3001)
# - Collaboration server (Yjs WebSocket, port 4000)
# - Frontend (Vite/static, port 5173 or CDN)
#
# Usage:
#   ./tests/smoke/run-smoke.sh https://api.fluxstudio.art
#   ./tests/smoke/run-smoke.sh http://localhost:3001
#

set -euo pipefail

TARGET_URL="${1:-http://localhost:3001}"
COLLAB_URL="${2:-${COLLAB_URL:-}}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "============================================"
echo "  FluxStudio Post-Deployment Smoke Tests"
echo "  Target: $TARGET_URL"
[ -n "$COLLAB_URL" ] && echo "  Collab: $COLLAB_URL"
echo "============================================"
echo ""

FAILURES=0

# --- Helper ---

check_endpoint() {
  local path="$1"
  local expected_status="$2"
  local label="$3"
  local url="${4:-$TARGET_URL}"

  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url$path" || echo "000")

  if [ "$status" = "$expected_status" ]; then
    echo "  PASS  $label ($path -> $status)"
  else
    echo "  FAIL  $label ($path -> $status, expected $expected_status)"
    FAILURES=$((FAILURES + 1))
  fi
}

check_json_field() {
  local path="$1"
  local field="$2"
  local label="$3"

  body=$(curl -s --max-time 10 "$TARGET_URL$path" || echo "{}")
  value=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('$field',''))" 2>/dev/null || echo "")

  if [ -n "$value" ] && [ "$value" != "None" ] && [ "$value" != "false" ]; then
    echo "  PASS  $label ($field=$value)"
  else
    echo "  FAIL  $label ($field missing or falsy)"
    FAILURES=$((FAILURES + 1))
  fi
}

# ─── 1. API Health Checks ───

echo "--- API Health Checks ---"

check_endpoint "/health"       "200" "Health endpoint"
check_endpoint "/health/live"  "200" "Liveness probe"
check_endpoint "/health/ready" "200" "Readiness probe"
check_endpoint "/api/auth/me"  "401" "Auth guard (no token -> 401)"

echo ""

# ─── 2. Database Connectivity ───

echo "--- Database Connectivity ---"

# The /health/ready endpoint typically checks DB connectivity
# Parse the JSON response to verify database is connected
check_json_field "/health/ready" "database" "Database connected"

echo ""

# ─── 3. Redis Connectivity ───

echo "--- Redis Connectivity ---"

check_json_field "/health/ready" "redis" "Redis connected"

echo ""

# ─── 4. Collaboration Service ───

if [ -n "$COLLAB_URL" ]; then
  echo "--- Collaboration Service ---"
  check_endpoint "/health" "200" "Collab health" "$COLLAB_URL"
  echo ""
fi

# ─── 5. API Pricing (public endpoint, validates full stack) ───

echo "--- Functional Checks ---"

check_endpoint "/api/payments/pricing" "200" "Pricing endpoint (public)"

echo ""

# ─── 6. Playwright Smoke Tests (if available) ───

if command -v npx &> /dev/null && [ -f "$PROJECT_DIR/playwright.config.ts" ]; then
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
  echo "--- Skipping Playwright tests (npx or config not available) ---"
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
