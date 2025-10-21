#!/bin/bash

echo "🔍 Google OAuth Configuration Diagnostic"
echo "========================================"
echo ""

# Check production environment variables
echo "📋 Production Environment Variables:"
ssh root@167.172.208.61 "cd /var/www/fluxstudio && grep GOOGLE .env | grep -v '#'" || echo "❌ Could not retrieve environment variables"
echo ""

# Check if Google GSI script is accessible
echo "🌐 Google GSI Script Accessibility:"
curl -sI https://accounts.google.com/gsi/client | grep -E "HTTP|200" || echo "❌ Google GSI script not accessible"
echo ""

# Check frontend build for client ID
echo "🔧 Frontend Configuration:"
if [ -f "build/index.html" ]; then
    echo "✅ Build directory exists"
    grep -o "VITE_GOOGLE_CLIENT_ID" build/index.html >/dev/null && echo "  Found VITE_GOOGLE_CLIENT_ID reference" || echo "  No VITE_GOOGLE_CLIENT_ID in build"
else
    echo "❌ Build directory not found"
fi
echo ""

# Check production build
echo "📦 Production Build Check:"
ssh root@167.172.208.61 "ls -lh /var/www/fluxstudio/build/assets/*.js 2>/dev/null | head -3" || echo "❌ Could not check production build"
echo ""

# Test production login page
echo "🌍 Production Login Page:"
LOGIN_STATUS=$(curl -sI https://fluxstudio.art/login | grep HTTP | head -1)
echo "  Status: $LOGIN_STATUS"
echo ""

# Check if Google OAuth endpoints are working
echo "🔐 Auth Service Status:"
AUTH_STATUS=$(curl -sI https://fluxstudio.art/api/auth/google | grep HTTP | head -1)
echo "  /api/auth/google: $AUTH_STATUS"
echo ""

# Check PM2 services
echo "🚀 PM2 Services:"
ssh root@167.172.208.61 "pm2 status | grep flux-auth" || echo "❌ Could not check PM2 status"
echo ""

echo "========================================"
echo "✅ Diagnostic Complete"
echo ""
echo "Next Steps:"
echo "1. Review GOOGLE_OAUTH_CONFIGURATION_GUIDE.md"
echo "2. Access Google Cloud Console"
echo "3. Verify OAuth client configuration"
echo "4. Update environment variables if needed"
echo ""
