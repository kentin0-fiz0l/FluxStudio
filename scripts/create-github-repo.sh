#!/bin/bash

# FluxStudio - GitHub Repository Creation Script
# This script provides step-by-step instructions for creating the GitHub repository

set -e

echo "=========================================="
echo "FluxStudio GitHub Repository Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}GitHub Repository Creation${NC}"
echo "----------------------------"
echo ""
echo "Option 1: Via GitHub Web UI (Recommended - Takes 2 minutes)"
echo ""
echo "1. Open this URL in your browser:"
echo -e "   ${GREEN}https://github.com/new${NC}"
echo ""
echo "2. Fill in the form:"
echo "   - Repository name: FluxStudio"
echo "   - Description: Creative design collaboration platform"
echo "   - Visibility: Public"
echo "   - DO NOT initialize with README, .gitignore, or license"
echo ""
echo "3. Click 'Create repository'"
echo ""
echo "4. Copy the SSH URL from the next page (should be):"
echo "   git@github.com:kentin0-fiz0l/FluxStudio.git"
echo ""
echo -e "${YELLOW}Press Enter once you've created the repository...${NC}"
read

echo ""
echo -e "${BLUE}Setting up Git remote and pushing code${NC}"
echo "----------------------------"
echo ""

# Check if we have the commit
if git log --oneline -1 2>/dev/null | grep -q "8fcf1dc"; then
    echo -e "${GREEN}✓${NC} Found commit 8fcf1dc"
else
    echo -e "${YELLOW}⚠${NC}  Commit 8fcf1dc not found, checking latest commit..."
    git log --oneline -1
fi

# Remove any existing origin
git remote remove origin 2>/dev/null || true

# Add new origin
echo ""
echo "Adding GitHub remote..."
git remote add origin git@github.com:kentin0-fiz0l/FluxStudio.git

# Check branch name
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${GREEN}✓${NC} Current branch: $CURRENT_BRANCH"

# Rename to main if needed
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Renaming branch to 'main'..."
    git branch -M main
    echo -e "${GREEN}✓${NC} Renamed to main"
fi

# Push to GitHub
echo ""
echo "Pushing code to GitHub..."
if git push -u origin main; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "✓ GitHub Repository Created Successfully!"
    echo "==========================================${NC}"
    echo ""
    echo "Repository URL: https://github.com/kentin0-fiz0l/FluxStudio"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Verify the repository: https://github.com/kentin0-fiz0l/FluxStudio"
    echo "2. Run deployment script: ./scripts/deploy-to-app-platform.sh"
    echo ""
else
    echo ""
    echo -e "${RED}✗ Push failed${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Verify SSH key is added to GitHub:"
    echo "   https://github.com/settings/keys"
    echo ""
    echo "2. Test SSH connection:"
    echo "   ssh -T git@github.com"
    echo ""
    echo "3. Try HTTPS instead:"
    echo "   git remote set-url origin https://github.com/kentin0-fiz0l/FluxStudio.git"
    echo "   git push -u origin main"
    exit 1
fi

echo ""
echo -e "${GREEN}Ready for DigitalOcean deployment!${NC}"
echo ""
