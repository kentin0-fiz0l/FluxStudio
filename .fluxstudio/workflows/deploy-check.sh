#!/bin/bash

# Flux Studio Pre-Deployment Checklist
# Run this before any production deployment

echo "==================================="
echo "🚀 Pre-Deployment Checklist"
echo "==================================="
echo ""

PASS=0
FAIL=0

# Test Suite
echo "🧪 Running Test Suite..."
if ./.fluxstudio/flux-agent workflow deployment > /dev/null 2>&1; then
    echo "  ✅ All tests passed"
    ((PASS++))
else
    echo "  ❌ Tests failed"
    ((FAIL++))
fi
echo ""

# Security Audit
echo "🔒 Security Audit..."
if ./.fluxstudio/flux-agent security-audit > /dev/null 2>&1; then
    echo "  ✅ Security audit passed"
    ((PASS++))
else
    echo "  ⚠️  Security issues found"
    ((FAIL++))
fi
echo ""

# Build Check
echo "📦 Production Build..."
if npm run build > /dev/null 2>&1; then
    echo "  ✅ Build successful"
    ((PASS++))
else
    echo "  ❌ Build failed"
    ((FAIL++))
fi
echo ""

# Health Check
echo "🏥 Current Production Health..."
if curl -sf https://fluxstudio.art/api/health > /dev/null 2>&1; then
    echo "  ✅ Production healthy"
    ((PASS++))
else
    echo "  ❌ Production unhealthy"
    ((FAIL++))
fi
echo ""

# Environment Variables
echo "⚙️  Environment Configuration..."
if ssh root@167.172.208.61 "test -f /var/www/fluxstudio/.env"; then
    echo "  ✅ Environment variables configured"
    ((PASS++))
else
    echo "  ❌ Environment variables missing"
    ((FAIL++))
fi
echo ""

# Results
echo "==================================="
echo "📊 Results: $PASS passed, $FAIL failed"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "✅ READY TO DEPLOY"
    echo ""
    echo "Deploy with:"
    echo "  flux-agent deploy production"
    exit 0
else
    echo "❌ NOT READY TO DEPLOY"
    echo ""
    echo "Fix the issues above before deploying"
    exit 1
fi
