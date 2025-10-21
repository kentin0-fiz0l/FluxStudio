#!/bin/bash

# FluxStudio - Pre-Deployment Verification
# Checks that everything is ready for deployment

set -e

echo "=========================================="
echo "FluxStudio Pre-Deployment Checklist"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PASS=0
WARN=0
FAIL=0

# Check 1: Git commit ready
echo "1. Checking git commit..."
if git log --oneline -1 2>/dev/null | grep -q "8fcf1dc"; then
    echo -e "   ${GREEN}✓${NC} Commit 8fcf1dc ready"
    ((PASS++))
else
    echo -e "   ${YELLOW}⚠${NC}  Expected commit 8fcf1dc not found"
    echo "      Current commit: $(git log --oneline -1)"
    ((WARN++))
fi

# Check 2: App spec exists
echo "2. Checking app spec..."
if [ -f ".do/app.yaml" ]; then
    echo -e "   ${GREEN}✓${NC} .do/app.yaml exists"
    ((PASS++))
else
    echo -e "   ${RED}✗${NC} .do/app.yaml not found"
    ((FAIL++))
fi

# Check 3: Production credentials generated
echo "3. Checking production credentials..."
if ls production-credentials-*.txt 1> /dev/null 2>&1; then
    CRED_FILE=$(ls -t production-credentials-*.txt | head -1)
    echo -e "   ${GREEN}✓${NC} Credentials file: $CRED_FILE"
    ((PASS++))
else
    echo -e "   ${RED}✗${NC} No credentials file found"
    echo "      Run: ./scripts/generate-production-secrets.sh > production-credentials-\$(date +%Y%m%d).txt"
    ((FAIL++))
fi

# Check 4: Deployment scripts executable
echo "4. Checking deployment scripts..."
if [ -x "scripts/create-github-repo.sh" ] && [ -x "scripts/deploy-to-app-platform.sh" ]; then
    echo -e "   ${GREEN}✓${NC} Deployment scripts executable"
    ((PASS++))
else
    echo -e "   ${YELLOW}⚠${NC}  Scripts not executable (auto-fixing)"
    chmod +x scripts/create-github-repo.sh scripts/deploy-to-app-platform.sh
    ((WARN++))
fi

# Check 5: Server files exist
echo "5. Checking server files..."
MISSING_FILES=()
for file in server-unified.js server-collaboration.js; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo -e "   ${GREEN}✓${NC} All server files present"
    ((PASS++))
else
    echo -e "   ${RED}✗${NC} Missing files: ${MISSING_FILES[*]}"
    ((FAIL++))
fi

# Check 6: doctl installed
echo "6. Checking doctl CLI..."
if command -v doctl &> /dev/null; then
    echo -e "   ${GREEN}✓${NC} doctl installed"
    ((PASS++))
else
    echo -e "   ${YELLOW}⚠${NC}  doctl not installed"
    echo "      Install: brew install doctl"
    ((WARN++))
fi

# Check 7: Node modules (for local testing)
echo "7. Checking node_modules..."
if [ -d "node_modules" ]; then
    echo -e "   ${GREEN}✓${NC} Dependencies installed"
    ((PASS++))
else
    echo -e "   ${YELLOW}⚠${NC}  Dependencies not installed"
    echo "      Run: npm ci"
    ((WARN++))
fi

# Check 8: Build directory (for local testing)
echo "8. Checking build output..."
if [ -d "build" ]; then
    echo -e "   ${GREEN}✓${NC} Build directory exists"
    ((PASS++))
else
    echo -e "   ${YELLOW}⚠${NC}  Build directory not found"
    echo "      Run: npm run build (optional for local testing)"
    ((WARN++))
fi

# Check 9: Documentation
echo "9. Checking documentation..."
DOCS=("DEPLOY_NOW.md" "QUICKSTART.md" "DEPLOYMENT_CHECKLIST.md")
MISSING_DOCS=()
for doc in "${DOCS[@]}"; do
    if [ ! -f "$doc" ]; then
        MISSING_DOCS+=("$doc")
    fi
done

if [ ${#MISSING_DOCS[@]} -eq 0 ]; then
    echo -e "   ${GREEN}✓${NC} All documentation present"
    ((PASS++))
else
    echo -e "   ${YELLOW}⚠${NC}  Missing docs: ${MISSING_DOCS[*]}"
    ((WARN++))
fi

# Check 10: GitHub repository
echo "10. Checking GitHub repository..."
if git ls-remote origin &> /dev/null; then
    REPO_URL=$(git remote get-url origin)
    echo -e "   ${GREEN}✓${NC} Repository: $REPO_URL"
    ((PASS++))
else
    echo -e "   ${YELLOW}⚠${NC}  GitHub repository not created yet"
    echo "      Run: ./scripts/create-github-repo.sh"
    ((WARN++))
fi

# Summary
echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo -e "${GREEN}Passed:${NC}  $PASS checks"
echo -e "${YELLOW}Warnings:${NC} $WARN checks"
echo -e "${RED}Failed:${NC}  $FAIL checks"
echo ""

if [ $FAIL -gt 0 ]; then
    echo -e "${RED}❌ Deployment blocked${NC}"
    echo "Fix failed checks before deploying"
    exit 1
elif [ $WARN -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Ready with warnings${NC}"
    echo "Warnings are acceptable but recommended to fix"
    echo ""
    echo "Next steps:"
    echo "1. Review warnings above"
    echo "2. Create GitHub repository: ./scripts/create-github-repo.sh"
    echo "3. Deploy to App Platform: ./scripts/deploy-to-app-platform.sh"
else
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "Ready to deploy!"
    echo ""
    echo "Next steps:"
    echo "1. Create GitHub repository: ./scripts/create-github-repo.sh"
    echo "2. Deploy to App Platform: ./scripts/deploy-to-app-platform.sh"
    echo ""
    echo "Or read: DEPLOY_NOW.md for step-by-step instructions"
fi

echo ""
echo "Documentation:"
echo "  - DEPLOY_NOW.md (15-minute guide)"
echo "  - QUICKSTART.md (30-minute guide)"
echo "  - DEPLOYMENT_CHECKLIST.md (complete checklist)"
echo ""
