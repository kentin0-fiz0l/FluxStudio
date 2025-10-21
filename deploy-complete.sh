#!/bin/bash

# FluxStudio - Complete Deployment Automation
# This script handles the entire deployment process from GitHub to App Platform

set -e

echo "=========================================="
echo "FluxStudio Complete Deployment"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
GITHUB_USERNAME="kentin0-fiz0l"
REPO_NAME="FluxStudio"
APP_NAME="fluxstudio"

echo -e "${BLUE}Step 1: GitHub Repository Setup${NC}"
echo "----------------------------"

# Check if repository exists on GitHub
echo "Checking if GitHub repository exists..."
if git ls-remote "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git" &> /dev/null; then
    echo -e "${GREEN}✓${NC} Repository already exists on GitHub"
    REPO_EXISTS=true
else
    echo -e "${YELLOW}⚠${NC}  Repository does not exist yet"
    REPO_EXISTS=false
fi

if [ "$REPO_EXISTS" = false ]; then
    echo ""
    echo -e "${YELLOW}GitHub repository needs to be created.${NC}"
    echo ""
    echo "Please create the repository manually:"
    echo "1. Go to: https://github.com/new"
    echo "2. Repository name: $REPO_NAME"
    echo "3. Visibility: Public"
    echo "4. Do NOT initialize with README, .gitignore, or license"
    echo "5. Click 'Create repository'"
    echo ""
    read -p "Press Enter after you've created the repository..."
    echo ""
fi

# Configure git remote
echo "Configuring git remote..."
git remote remove origin 2>/dev/null || true
git remote add origin "git@github.com:$GITHUB_USERNAME/$REPO_NAME.git"
echo -e "${GREEN}✓${NC} Git remote configured"

# Ensure we're on main branch
echo "Checking current branch..."
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Renaming branch to main..."
    git branch -M main
fi
echo -e "${GREEN}✓${NC} On main branch"

# Push to GitHub
echo ""
echo "Pushing code to GitHub..."
if git push -u origin main 2>&1; then
    echo -e "${GREEN}✓${NC} Code pushed to GitHub"
else
    echo -e "${RED}✗${NC} Failed to push to GitHub"
    echo ""
    echo "Troubleshooting:"
    echo "1. Ensure SSH key is added: https://github.com/settings/keys"
    echo "2. Test SSH: ssh -T git@github.com"
    echo "3. Or use HTTPS: git remote set-url origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: DigitalOcean Authentication${NC}"
echo "----------------------------"

# Check doctl installation
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}✗${NC} doctl not installed"
    echo ""
    echo "Install with: brew install doctl"
    exit 1
fi
echo -e "${GREEN}✓${NC} doctl installed"

# Check doctl auth
if ! doctl auth list 2>/dev/null | grep -q "current"; then
    echo -e "${YELLOW}⚠${NC}  doctl not authenticated"
    echo ""
    echo "Please authenticate with DigitalOcean:"
    doctl auth init
else
    echo -e "${GREEN}✓${NC} doctl authenticated"
fi

echo ""
echo -e "${BLUE}Step 3: App Platform Deployment${NC}"
echo "----------------------------"

# Validate app spec
echo "Validating app spec..."
if doctl apps validate-spec .do/app.yaml; then
    echo -e "${GREEN}✓${NC} App spec is valid"
else
    echo -e "${RED}✗${NC} App spec validation failed"
    exit 1
fi

echo ""
echo -e "${YELLOW}Deployment Summary:${NC}"
echo "  - Static Frontend (FREE)"
echo "  - Unified Backend (\$15/mo)"
echo "  - Collaboration Service (\$15/mo)"
echo "  - PostgreSQL Database (\$15/mo)"
echo "  - Redis Cache (\$15/mo)"
echo ""
echo -e "${BLUE}Total Monthly Cost: \$60${NC}"
echo ""

read -p "Continue with deployment? (y/n): " DEPLOY_CONFIRM
if [ "$DEPLOY_CONFIRM" != "y" ] && [ "$DEPLOY_CONFIRM" != "Y" ]; then
    echo "Deployment cancelled"
    exit 0
fi

# Create the app
echo ""
echo "Creating DigitalOcean App Platform application..."
echo "This will take 5-10 minutes..."
echo ""

if APP_OUTPUT=$(doctl apps create --spec .do/app.yaml --format ID,DefaultIngress --no-header 2>&1); then
    APP_ID=$(echo "$APP_OUTPUT" | awk '{print $1}')
    APP_URL=$(echo "$APP_OUTPUT" | awk '{print $2}')

    # Save app info
    mkdir -p .do
    echo "$APP_ID" > .do/app-id.txt
    echo "$APP_URL" > .do/app-url.txt

    echo ""
    echo -e "${GREEN}=========================================="
    echo "✓ App Created Successfully!"
    echo "==========================================${NC}"
    echo ""
    echo "App ID: $APP_ID"
    echo "App URL: $APP_URL"
    echo ""

    # Find credentials file
    CRED_FILE=$(ls -t production-credentials-*.txt 2>/dev/null | head -1)

    echo -e "${BLUE}Step 4: Configure Secrets${NC}"
    echo "----------------------------"
    echo ""
    echo "IMPORTANT: You need to add secrets to App Platform"
    echo ""
    echo "1. Open: https://cloud.digitalocean.com/apps/$APP_ID/settings"
    echo ""
    echo "2. Go to: unified-backend → Environment Variables → Edit"
    echo ""
    echo "3. Add these secrets (from $CRED_FILE):"
    echo "   - JWT_SECRET"
    echo "   - SESSION_SECRET"
    echo "   - OAUTH_ENCRYPTION_KEY"
    echo ""
    echo "4. Add OAuth credentials (after creating OAuth apps):"
    echo "   - GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET"
    echo "   - GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET"
    echo "   - FIGMA_CLIENT_ID + FIGMA_CLIENT_SECRET"
    echo "   - SLACK_CLIENT_ID + SLACK_CLIENT_SECRET + SLACK_SIGNING_SECRET"
    echo ""
    echo "5. Add SMTP credentials:"
    echo "   - SMTP_USER"
    echo "   - SMTP_PASSWORD"
    echo ""
    echo "6. Click 'Save' (triggers automatic redeployment)"
    echo ""

    read -p "Press Enter after you've added the secrets..."

    echo ""
    echo -e "${BLUE}Step 5: Configure OAuth Providers${NC}"
    echo "----------------------------"
    echo ""
    echo "Update OAuth redirect URIs in provider consoles:"
    echo ""
    echo "Google Console: https://console.cloud.google.com/apis/credentials"
    echo "  Redirect URI: ${APP_URL}/api/auth/google/callback"
    echo ""
    echo "GitHub Settings: https://github.com/settings/developers"
    echo "  Callback URL: ${APP_URL}/api/auth/github/callback"
    echo ""
    echo "Figma Developer: https://www.figma.com/developers/apps"
    echo "  Callback URL: ${APP_URL}/api/integrations/figma/callback"
    echo ""
    echo "Slack API: https://api.slack.com/apps"
    echo "  Redirect URL: ${APP_URL}/api/integrations/slack/callback"
    echo ""

    read -p "Press Enter after you've updated OAuth redirect URIs..."

    echo ""
    echo -e "${BLUE}Step 6: Verify Deployment${NC}"
    echo "----------------------------"
    echo ""
    echo "Testing health endpoint..."

    sleep 10  # Wait for deployment to start

    for i in {1..30}; do
        if curl -s "${APP_URL}/api/health" | grep -q "healthy"; then
            echo -e "${GREEN}✓${NC} Health check passed!"
            echo ""
            curl -s "${APP_URL}/api/health" | jq . || curl -s "${APP_URL}/api/health"
            break
        else
            echo "Waiting for deployment... ($i/30)"
            sleep 10
        fi
    done

    echo ""
    echo -e "${GREEN}=========================================="
    echo "✓ Deployment Complete!"
    echo "==========================================${NC}"
    echo ""
    echo "Your FluxStudio app is deployed!"
    echo ""
    echo "App URL: $APP_URL"
    echo "App ID: $APP_ID"
    echo ""
    echo "Next steps:"
    echo "1. Test the application: open $APP_URL"
    echo "2. Monitor logs: doctl apps logs $APP_ID --follow"
    echo "3. Configure custom domain (optional)"
    echo ""
    echo "Documentation:"
    echo "  - DEPLOY_NOW.md"
    echo "  - DEPLOYMENT_CHECKLIST.md"
    echo "  - DIGITALOCEAN_DEPLOYMENT_GUIDE.md"
    echo ""

else
    echo ""
    echo -e "${RED}✗ App creation failed${NC}"
    echo ""
    echo "Error: $APP_OUTPUT"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check authentication: doctl auth list"
    echo "2. Verify app spec: doctl apps validate-spec .do/app.yaml"
    echo "3. Check DigitalOcean status: https://status.digitalocean.com"
    exit 1
fi

echo ""
echo -e "${GREEN}Deployment automation complete!${NC}"
echo ""
