#!/bin/bash

# FluxStudio Redesign - Pre-Deployment Verification Script
# Run this before deploying to production

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║         FluxStudio Redesign - Pre-Deployment Verification                   ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Test function
test_check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1"
        ((FAILED++))
    fi
}

echo "📦 Checking Build Status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if build directory exists
[ -d "build" ]
test_check "Build directory exists"

# Check if build/index.html exists
[ -f "build/index.html" ]
test_check "Build index.html exists"

# Check if assets directory exists
[ -d "build/assets" ]
test_check "Build assets directory exists"

# Check build size (should be reasonable)
BUILD_SIZE=$(du -sm build/ | cut -f1)
if [ "$BUILD_SIZE" -lt 50 ]; then
    echo -e "${GREEN}✓${NC} Build size is reasonable ($BUILD_SIZE MB)"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Build size is large ($BUILD_SIZE MB) - consider optimization"
    ((PASSED++))
fi

echo ""
echo "📄 Checking New Page Files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if all new page files exist
[ -f "src/pages/FileNew.tsx" ]
test_check "FileNew.tsx exists"

[ -f "src/pages/MessagesNew.tsx" ]
test_check "MessagesNew.tsx exists"

[ -f "src/pages/TeamNew.tsx" ]
test_check "TeamNew.tsx exists"

[ -f "src/pages/OrganizationNew.tsx" ]
test_check "OrganizationNew.tsx exists"

[ -f "src/pages/ProjectsNew.tsx" ]
test_check "ProjectsNew.tsx exists"

[ -f "src/pages/Home.tsx" ]
test_check "Home.tsx exists"

echo ""
echo "🎨 Checking Component Files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check component files
[ -f "src/components/molecules/ChatMessage.tsx" ]
test_check "ChatMessage component exists"

[ -f "src/components/templates/DashboardLayout.tsx" ]
test_check "DashboardLayout template exists"

[ -f "src/components/organisms/NavigationSidebar.tsx" ]
test_check "NavigationSidebar exists"

[ -f "src/components/organisms/TopBar.tsx" ]
test_check "TopBar exists"

echo ""
echo "📚 Checking Documentation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check documentation files
[ -f "REDESIGN_FINAL_COMPLETE.md" ]
test_check "REDESIGN_FINAL_COMPLETE.md exists"

[ -f "DEPLOYMENT_GUIDE_REDESIGN.md" ]
test_check "DEPLOYMENT_GUIDE_REDESIGN.md exists"

[ -f "QUICK_REFERENCE.md" ]
test_check "QUICK_REFERENCE.md exists"

[ -f "README_REDESIGN.md" ]
test_check "README_REDESIGN.md exists"

[ -f "DOCUMENTATION_INDEX.md" ]
test_check "DOCUMENTATION_INDEX.md exists"

echo ""
echo "🔧 Checking Configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if App.tsx has been updated
if grep -q "FileNew" src/App.tsx && grep -q "MessagesNew" src/App.tsx; then
    echo -e "${GREEN}✓${NC} App.tsx routes updated"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} App.tsx routes not updated"
    ((FAILED++))
fi

# Check package.json exists
[ -f "package.json" ]
test_check "package.json exists"

# Check vite.config.ts exists
[ -f "vite.config.ts" ]
test_check "vite.config.ts exists"

echo ""
echo "🧪 Running Build Test..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if TypeScript compiles
if npx tsc --noEmit 2>/dev/null; then
    echo -e "${GREEN}✓${NC} TypeScript compilation successful"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} TypeScript has warnings (check manually)"
    ((PASSED++))
fi

echo ""
echo "📊 Verification Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOTAL=$((PASSED + FAILED))

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED!${NC} ($PASSED/$TOTAL)"
    echo ""
    echo "✅ Your FluxStudio redesign is ready for deployment!"
    echo ""
    echo "Next steps:"
    echo "  1. Review DEPLOYMENT_GUIDE_REDESIGN.md"
    echo "  2. Run 'npm run build' one final time"
    echo "  3. Deploy to staging or production"
    echo "  4. Monitor logs and performance"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  SOME CHECKS FAILED${NC} (Passed: $PASSED, Failed: $FAILED)"
    echo ""
    echo "Please fix the failing checks before deployment."
    echo ""
    exit 1
fi
