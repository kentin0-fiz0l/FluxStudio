#!/bin/bash

# FluxStudio - DigitalOcean App Platform Deployment Script
# This script deploys FluxStudio to DigitalOcean App Platform

set -e

echo "=========================================="
echo "FluxStudio App Platform Deployment"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"
echo "----------------------------"

# Check doctl
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}✗${NC} doctl not installed"
    echo ""
    echo "Install with: brew install doctl"
    echo "Or visit: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
else
    echo -e "${GREEN}✓${NC} doctl installed"
fi

# Check doctl auth
if ! doctl auth list 2>/dev/null | grep -q "current"; then
    echo -e "${YELLOW}⚠${NC}  doctl not authenticated"
    echo ""
    echo "Authenticate with: doctl auth init"
    echo ""
    read -p "Authenticate now? (y/n): " AUTH_NOW
    if [ "$AUTH_NOW" = "y" ] || [ "$AUTH_NOW" = "Y" ]; then
        doctl auth init
    else
        echo "Please authenticate and re-run this script"
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} doctl authenticated"
fi

# Check app spec exists
if [ ! -f ".do/app.yaml" ]; then
    echo -e "${RED}✗${NC} .do/app.yaml not found"
    exit 1
else
    echo -e "${GREEN}✓${NC} App spec found"
fi

# Check GitHub repo exists
echo ""
echo "Checking GitHub repository..."
if git ls-remote origin &> /dev/null; then
    echo -e "${GREEN}✓${NC} GitHub repository accessible"
else
    echo -e "${RED}✗${NC} GitHub repository not accessible"
    echo ""
    echo "Please create the GitHub repository first:"
    echo "./scripts/create-github-repo.sh"
    exit 1
fi

echo ""
echo -e "${BLUE}Validating app spec...${NC}"
echo "----------------------------"
if doctl apps validate-spec .do/app.yaml; then
    echo -e "${GREEN}✓${NC} App spec is valid"
else
    echo -e "${RED}✗${NC} App spec validation failed"
    exit 1
fi

echo ""
echo -e "${BLUE}Creating DigitalOcean App...${NC}"
echo "----------------------------"
echo ""
echo "This will create the following resources:"
echo "  - Static site (frontend)"
echo "  - Unified backend service"
echo "  - Collaboration service"
echo "  - PostgreSQL database (15)"
echo "  - Redis cache (7)"
echo ""
echo "Estimated monthly cost: $60"
echo ""
read -p "Continue with deployment? (y/n): " DEPLOY_CONFIRM

if [ "$DEPLOY_CONFIRM" != "y" ] && [ "$DEPLOY_CONFIRM" != "Y" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "Creating app (this takes 5-10 minutes)..."
echo ""

# Create the app
if APP_OUTPUT=$(doctl apps create --spec .do/app.yaml --format ID,DefaultIngress --no-header 2>&1); then
    APP_ID=$(echo "$APP_OUTPUT" | awk '{print $1}')
    APP_URL=$(echo "$APP_OUTPUT" | awk '{print $2}')

    echo ""
    echo -e "${GREEN}=========================================="
    echo "✓ App Created Successfully!"
    echo "==========================================${NC}"
    echo ""
    echo "App ID: $APP_ID"
    echo "App URL: $APP_URL"
    echo ""

    # Save app info
    echo "$APP_ID" > .do/app-id.txt
    echo "$APP_URL" > .do/app-url.txt

    echo -e "${YELLOW}IMPORTANT: Next Steps${NC}"
    echo "----------------------------"
    echo ""
    echo "1. Add secrets to App Platform:"
    echo "   https://cloud.digitalocean.com/apps/$APP_ID/settings"
    echo ""
    echo "   Required secrets (from production-credentials-*.txt):"
    echo "   - JWT_SECRET"
    echo "   - SESSION_SECRET"
    echo "   - OAUTH_ENCRYPTION_KEY"
    echo "   - GOOGLE_CLIENT_ID"
    echo "   - GOOGLE_CLIENT_SECRET"
    echo "   - GITHUB_CLIENT_ID"
    echo "   - GITHUB_CLIENT_SECRET"
    echo "   - FIGMA_CLIENT_ID"
    echo "   - FIGMA_CLIENT_SECRET"
    echo "   - SLACK_CLIENT_ID"
    echo "   - SLACK_CLIENT_SECRET"
    echo "   - SLACK_SIGNING_SECRET"
    echo "   - SMTP_USER"
    echo "   - SMTP_PASSWORD"
    echo ""
    echo "2. Update OAuth redirect URIs in provider consoles:"
    echo "   Google: ${APP_URL}/api/auth/google/callback"
    echo "   GitHub: ${APP_URL}/api/auth/github/callback"
    echo "   Figma: ${APP_URL}/api/integrations/figma/callback"
    echo "   Slack: ${APP_URL}/api/integrations/slack/callback"
    echo ""
    echo "3. Monitor deployment:"
    echo "   doctl apps logs $APP_ID --follow"
    echo ""
    echo "4. Check health status:"
    echo "   curl ${APP_URL}/api/health"
    echo ""
    echo "5. Configure custom domain (optional):"
    echo "   - Go to App Platform > Settings > Domains"
    echo "   - Add fluxstudio.art"
    echo "   - Update DNS as instructed"
    echo ""

    # Monitor deployment
    echo ""
    read -p "Monitor deployment logs now? (y/n): " MONITOR
    if [ "$MONITOR" = "y" ] || [ "$MONITOR" = "Y" ]; then
        echo ""
        echo "Monitoring deployment logs (Ctrl+C to exit)..."
        echo ""
        doctl apps logs "$APP_ID" --follow
    fi

else
    echo ""
    echo -e "${RED}✗ App creation failed${NC}"
    echo ""
    echo "Error output:"
    echo "$APP_OUTPUT"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check doctl authentication: doctl auth list"
    echo "2. Verify app spec: doctl apps validate-spec .do/app.yaml"
    echo "3. Check DigitalOcean status: https://status.digitalocean.com"
    exit 1
fi

echo ""
echo -e "${GREEN}Deployment initiated successfully!${NC}"
echo ""
echo "Documentation:"
echo "  - QUICKSTART.md - Quick deployment guide"
echo "  - DEPLOYMENT_CHECKLIST.md - Complete checklist"
echo "  - DIGITALOCEAN_DEPLOYMENT_GUIDE.md - Detailed guide"
echo ""
