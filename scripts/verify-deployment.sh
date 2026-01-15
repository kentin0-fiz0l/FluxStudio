#!/bin/bash
# FluxStudio Deployment Verification Script
# Usage: ./scripts/verify-deployment.sh [environment]
# Environments: production (default), staging, local

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT="${1:-production}"

case "$ENVIRONMENT" in
  production)
    BASE_URL="https://fluxstudio.art"
    API_URL="https://fluxstudio.art/api"
    ;;
  staging)
    BASE_URL="https://staging.fluxstudio.art"
    API_URL="https://staging.fluxstudio.art/api"
    ;;
  local)
    BASE_URL="http://localhost:5173"
    API_URL="http://localhost:3001"
    ;;
  *)
    echo -e "${RED}Unknown environment: $ENVIRONMENT${NC}"
    echo "Usage: $0 [production|staging|local]"
    exit 1
    ;;
esac

echo -e "${BLUE}FluxStudio Deployment Verification${NC}"
echo "=================================="
echo "Environment: $ENVIRONMENT"
echo "Base URL: $BASE_URL"
echo "API URL: $API_URL"
echo ""

FAILED=0
PASSED=0

check() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"

  printf "%-40s" "Checking $name..."

  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

  if [ "$status" = "$expected" ]; then
    echo -e "${GREEN}OK${NC} ($status)"
    ((PASSED++))
  else
    echo -e "${RED}FAILED${NC} (got $status, expected $expected)"
    ((FAILED++))
  fi
}

check_json() {
  local name="$1"
  local url="$2"
  local jq_filter="$3"
  local expected="$4"

  printf "%-40s" "Checking $name..."

  response=$(curl -s --max-time 10 "$url" 2>/dev/null || echo "{}")
  value=$(echo "$response" | jq -r "$jq_filter" 2>/dev/null || echo "null")

  if [ "$value" = "$expected" ]; then
    echo -e "${GREEN}OK${NC} ($value)"
    ((PASSED++))
  else
    echo -e "${RED}FAILED${NC} (got '$value', expected '$expected')"
    ((FAILED++))
  fi
}

echo -e "${BLUE}=== Frontend Checks ===${NC}"
check "Homepage" "$BASE_URL"
check "Static assets (JS)" "$BASE_URL/assets/" "200"

echo ""
echo -e "${BLUE}=== API Health Checks ===${NC}"
check "API Health" "$API_URL/health"
check_json "API Status" "$API_URL/health" ".status" "ok"

if [ "$ENVIRONMENT" != "local" ]; then
  check "Collaboration Health" "$BASE_URL/collab/health"
fi

echo ""
echo -e "${BLUE}=== API Endpoint Checks ===${NC}"
check "Auth endpoint" "$API_URL/auth/status" "200"
# These should return 401 for unauthenticated requests, not 500
check "Projects endpoint (unauth)" "$API_URL/projects" "401"
check "Organizations endpoint (unauth)" "$API_URL/organizations" "401"

echo ""
echo -e "${BLUE}=== Security Checks ===${NC}"

# Check for security headers
printf "%-40s" "Security headers..."
headers=$(curl -s -I --max-time 10 "$BASE_URL" 2>/dev/null || echo "")
if echo "$headers" | grep -qi "x-frame-options\|content-security-policy"; then
  echo -e "${GREEN}OK${NC}"
  ((PASSED++))
else
  echo -e "${YELLOW}WARN${NC} (some headers missing)"
fi

# Check HTTPS redirect (for production)
if [ "$ENVIRONMENT" = "production" ]; then
  printf "%-40s" "HTTPS redirect..."
  http_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://fluxstudio.art" 2>/dev/null || echo "000")
  if [ "$http_status" = "301" ] || [ "$http_status" = "302" ] || [ "$http_status" = "308" ]; then
    echo -e "${GREEN}OK${NC} (redirects)"
    ((PASSED++))
  else
    echo -e "${YELLOW}WARN${NC} (status: $http_status)"
  fi
fi

echo ""
echo -e "${BLUE}=== Performance Checks ===${NC}"

# Response time check
printf "%-40s" "Response time..."
time_total=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$BASE_URL" 2>/dev/null || echo "999")
time_ms=$(echo "$time_total * 1000" | bc 2>/dev/null | cut -d. -f1 || echo "999")

if [ "$time_ms" -lt 500 ]; then
  echo -e "${GREEN}OK${NC} (${time_ms}ms)"
  ((PASSED++))
elif [ "$time_ms" -lt 2000 ]; then
  echo -e "${YELLOW}SLOW${NC} (${time_ms}ms)"
  ((PASSED++))
else
  echo -e "${RED}TIMEOUT${NC} (${time_ms}ms)"
  ((FAILED++))
fi

# API response time
printf "%-40s" "API response time..."
api_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$API_URL/health" 2>/dev/null || echo "999")
api_ms=$(echo "$api_time * 1000" | bc 2>/dev/null | cut -d. -f1 || echo "999")

if [ "$api_ms" -lt 200 ]; then
  echo -e "${GREEN}OK${NC} (${api_ms}ms)"
  ((PASSED++))
elif [ "$api_ms" -lt 1000 ]; then
  echo -e "${YELLOW}SLOW${NC} (${api_ms}ms)"
  ((PASSED++))
else
  echo -e "${RED}TIMEOUT${NC} (${api_ms}ms)"
  ((FAILED++))
fi

echo ""
echo "=================================="
echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"

if [ "$FAILED" -gt 0 ]; then
  echo -e "${RED}Verification failed!${NC}"
  exit 1
else
  echo -e "${GREEN}All checks passed!${NC}"
  exit 0
fi
