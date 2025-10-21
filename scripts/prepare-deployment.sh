#!/bin/bash

# FluxStudio - Deployment Preparation Script
# This script automates the pre-deployment setup tasks

set -e  # Exit on error

echo "=========================================="
echo "FluxStudio Deployment Preparation"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get GitHub username
echo "Step 1: GitHub Configuration"
echo "----------------------------"
read -p "Enter your GitHub username (default: kentin0-fiz0l): " GITHUB_USERNAME
GITHUB_USERNAME=${GITHUB_USERNAME:-kentin0-fiz0l}

echo -e "${GREEN}✓${NC} Using GitHub username: $GITHUB_USERNAME"
echo ""

# Update app.yaml
echo "Step 2: Updating .do/app.yaml..."
echo "----------------------------"
if [ -f ".do/app.yaml" ]; then
    sed -i '' "s/YOUR_GITHUB_USERNAME/$GITHUB_USERNAME/g" .do/app.yaml
    echo -e "${GREEN}✓${NC} Updated .do/app.yaml"
else
    echo -e "${RED}✗${NC} .do/app.yaml not found!"
    exit 1
fi
echo ""

# Generate production secrets
echo "Step 3: Generating Production Secrets..."
echo "----------------------------"
if [ -f "scripts/generate-production-secrets.sh" ]; then
    chmod +x scripts/generate-production-secrets.sh
    CREDENTIALS_FILE="production-credentials-$(date +%Y%m%d-%H%M%S).txt"
    ./scripts/generate-production-secrets.sh > "$CREDENTIALS_FILE"
    chmod 600 "$CREDENTIALS_FILE"
    echo -e "${GREEN}✓${NC} Generated credentials: $CREDENTIALS_FILE"
    echo -e "${YELLOW}⚠${NC}  IMPORTANT: Save this file to your password manager!"
else
    echo -e "${RED}✗${NC} scripts/generate-production-secrets.sh not found!"
    exit 1
fi
echo ""

# Validate app spec
echo "Step 4: Validating App Spec..."
echo "----------------------------"
if command -v doctl &> /dev/null; then
    if doctl apps validate-spec .do/app.yaml; then
        echo -e "${GREEN}✓${NC} App spec is valid"
    else
        echo -e "${RED}✗${NC} App spec validation failed!"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠${NC}  doctl not installed, skipping validation"
    echo "   Install with: brew install doctl"
fi
echo ""

# Test local build
echo "Step 5: Testing Local Build..."
echo "----------------------------"
read -p "Test local build? (y/n, default: n): " TEST_BUILD
if [ "$TEST_BUILD" = "y" ] || [ "$TEST_BUILD" = "Y" ]; then
    echo "Installing dependencies..."
    npm ci

    echo "Building frontend..."
    npm run build

    if [ -d "build" ]; then
        echo -e "${GREEN}✓${NC} Frontend build successful"
    else
        echo -e "${RED}✗${NC} Frontend build failed!"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠${NC}  Skipping local build test"
fi
echo ""

# Summary
echo "=========================================="
echo "Preparation Complete!"
echo "=========================================="
echo ""
echo -e "${GREEN}✓${NC} GitHub username updated in .do/app.yaml"
echo -e "${GREEN}✓${NC} Production credentials generated: $CREDENTIALS_FILE"
echo ""
echo "Next Steps:"
echo "----------------------------"
echo "1. ${YELLOW}SAVE CREDENTIALS${NC} from $CREDENTIALS_FILE to your password manager"
echo "2. Create GitHub repository: gh repo create FluxStudio --public --source=."
echo "3. Push to GitHub: git push -u origin main"
echo "4. Add GitHub Secrets (see DEPLOYMENT_CHECKLIST.md)"
echo "5. Rotate OAuth credentials (Google, GitHub, Figma, Slack)"
echo "6. Deploy: doctl apps create --spec .do/app.yaml --wait"
echo ""
echo "For detailed instructions, see:"
echo "  - DEPLOYMENT_CHECKLIST.md (step-by-step guide)"
echo "  - DIGITALOCEAN_DEPLOYMENT_GUIDE.md (comprehensive guide)"
echo ""
echo -e "${GREEN}Ready for deployment!${NC}"
echo ""
