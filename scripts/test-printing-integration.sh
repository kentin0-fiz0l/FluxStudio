#!/bin/bash

###############################################################################
# FluxPrint Integration Test Script
# Tests all proxy endpoints and verifies integration is working
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:3001"
FLUXPRINT_URL="http://localhost:5001"
FRONTEND_URL="http://localhost:3000"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
    ((TESTS_TOTAL++))
}

print_failure() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
    ((TESTS_TOTAL++))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3

    if curl -s -X "$method" "$endpoint" -o /dev/null -w "%{http_code}" | grep -q "^[23]"; then
        print_success "$description"
        return 0
    else
        print_failure "$description"
        return 1
    fi
}

###############################################################################
# Pre-flight Checks
###############################################################################

print_header "Pre-flight Service Checks"

# Check FluxStudio Backend
if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
    print_success "FluxStudio Backend is running ($BACKEND_URL)"
else
    print_failure "FluxStudio Backend is NOT running ($BACKEND_URL)"
    print_warning "Start with: npm run start:unified"
    exit 1
fi

# Check FluxPrint Service
if curl -s "$FLUXPRINT_URL/api/printer/status" > /dev/null 2>&1; then
    print_success "FluxPrint Service is running ($FLUXPRINT_URL)"
else
    print_warning "FluxPrint Service is NOT running ($FLUXPRINT_URL)"
    print_info "Some tests will fail without FluxPrint service"
fi

# Check FluxPrint Frontend
if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    print_success "FluxPrint Frontend is running ($FRONTEND_URL)"
else
    print_warning "FluxPrint Frontend is NOT running ($FRONTEND_URL)"
    print_info "iframe embedding will not work without frontend"
fi

###############################################################################
# Test Proxy Endpoints
###############################################################################

print_header "Testing Proxy Endpoints"

# Test printer status endpoint
test_endpoint "GET" "$BACKEND_URL/api/printing/status" "GET /api/printing/status - Printer status"

# Test current job endpoint
test_endpoint "GET" "$BACKEND_URL/api/printing/job" "GET /api/printing/job - Current job"

# Test queue endpoint
test_endpoint "GET" "$BACKEND_URL/api/printing/queue" "GET /api/printing/queue - Print queue"

# Test files endpoint
test_endpoint "GET" "$BACKEND_URL/api/printing/files" "GET /api/printing/files - File list"

# Test temperature endpoint
test_endpoint "GET" "$BACKEND_URL/api/printing/temperature" "GET /api/printing/temperature - Temperature data"

# Test camera stream endpoint (just check it responds, don't try to read stream)
if curl -s -I "$BACKEND_URL/api/printing/camera/stream" | grep -q "200\|multipart"; then
    print_success "GET /api/printing/camera/stream - Camera stream"
else
    print_failure "GET /api/printing/camera/stream - Camera stream"
fi

###############################################################################
# Test File Existence
###############################################################################

print_header "Checking File Integration"

# Backend files
if [ -f "/Users/kentino/FluxStudio/server-unified.js" ]; then
    if grep -q "FluxPrint Integration" "/Users/kentino/FluxStudio/server-unified.js"; then
        print_success "Backend proxy code exists in server-unified.js"
    else
        print_failure "Backend proxy code NOT found in server-unified.js"
    fi
else
    print_failure "server-unified.js file not found"
fi

# Frontend component
if [ -f "/Users/kentino/FluxStudio/src/components/printing/PrintingDashboard.tsx" ]; then
    print_success "PrintingDashboard component exists"
else
    print_failure "PrintingDashboard component NOT found"
fi

# Database migration
if [ -f "/Users/kentino/FluxStudio/database/migrations/012_printing_integration.sql" ]; then
    print_success "Database migration file exists"
else
    print_failure "Database migration file NOT found"
fi

# App.tsx route integration
if grep -q "PrintingDashboard" "/Users/kentino/FluxStudio/src/App.tsx"; then
    print_success "PrintingDashboard imported in App.tsx"
else
    print_failure "PrintingDashboard NOT imported in App.tsx"
fi

if grep -q "/printing" "/Users/kentino/FluxStudio/src/App.tsx"; then
    print_success "Printing routes defined in App.tsx"
else
    print_failure "Printing routes NOT defined in App.tsx"
fi

# Navigation integration
if grep -q "Printer" "/Users/kentino/FluxStudio/src/components/DashboardShell.tsx"; then
    print_success "Printer icon imported in DashboardShell"
else
    print_failure "Printer icon NOT imported in DashboardShell"
fi

if grep -q "3D Printing" "/Users/kentino/FluxStudio/src/components/DashboardShell.tsx"; then
    print_success "3D Printing navigation item added"
else
    print_failure "3D Printing navigation item NOT added"
fi

###############################################################################
# Test Environment Configuration
###############################################################################

print_header "Checking Environment Configuration"

if [ -f "/Users/kentino/FluxStudio/.env.production" ]; then
    if grep -q "FLUXPRINT_SERVICE_URL" "/Users/kentino/FluxStudio/.env.production"; then
        print_success "FLUXPRINT_SERVICE_URL in .env.production"
    else
        print_failure "FLUXPRINT_SERVICE_URL NOT in .env.production"
    fi

    if grep -q "FLUXPRINT_ENABLED" "/Users/kentino/FluxStudio/.env.production"; then
        print_success "FLUXPRINT_ENABLED in .env.production"
    else
        print_failure "FLUXPRINT_ENABLED NOT in .env.production"
    fi
else
    print_warning ".env.production file not found"
fi

if [ -f "/Users/kentino/FluxStudio/.env.example" ]; then
    if grep -q "FLUXPRINT_SERVICE_URL" "/Users/kentino/FluxStudio/.env.example"; then
        print_success "FLUXPRINT_SERVICE_URL in .env.example"
    else
        print_failure "FLUXPRINT_SERVICE_URL NOT in .env.example"
    fi
else
    print_warning ".env.example file not found"
fi

###############################################################################
# Database Migration Check
###############################################################################

print_header "Database Migration Status"

print_info "Database migration file created but not yet run"
print_info "Run migration when database is available: node run-migrations.js"

# Try to check if migration has been run (this will fail if DB not running)
if command -v psql > /dev/null 2>&1; then
    if psql -U postgres -d fluxstudio -c "\dt print_jobs" > /dev/null 2>&1; then
        print_success "Database migration has been run (print_jobs table exists)"
    else
        print_warning "Database migration has NOT been run yet"
        print_info "Run: cd /Users/kentino/FluxStudio && node run-migrations.js"
    fi
else
    print_info "psql not available, skipping database check"
fi

###############################################################################
# Documentation Check
###############################################################################

print_header "Documentation Status"

if [ -f "/Users/kentino/FluxStudio/PRINTING_INTEGRATION.md" ]; then
    print_success "Full integration documentation exists"
else
    print_failure "PRINTING_INTEGRATION.md NOT found"
fi

if [ -f "/Users/kentino/FluxStudio/PRINTING_INTEGRATION_SUMMARY.md" ]; then
    print_success "Quick start summary exists"
else
    print_failure "PRINTING_INTEGRATION_SUMMARY.md NOT found"
fi

###############################################################################
# Final Report
###############################################################################

print_header "Test Summary"

echo -e "Total Tests: $TESTS_TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    echo -e "${GREEN}FluxPrint integration is working correctly.${NC}\n"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed.${NC}"
    echo -e "${YELLOW}Please review the failures above.${NC}\n"
    exit 1
fi
