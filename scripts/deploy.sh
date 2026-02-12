#!/bin/bash

# FluxStudio - Trigger DigitalOcean App Platform Deployment
# Usage: ./scripts/deploy.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "FluxStudio - Deploy to DigitalOcean"
echo "=========================================="

# Check doctl
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}✗${NC} doctl not installed. Install with: brew install doctl"
    exit 1
fi

# Get app ID
APP_ID=""
if [ -f ".do/app-id.txt" ]; then
    APP_ID=$(cat .do/app-id.txt)
fi

if [ -z "$APP_ID" ]; then
    # Try to find by name
    APP_ID=$(doctl apps list --format ID,Spec.Name --no-header 2>/dev/null | grep fluxstudio | awk '{print $1}')
fi

if [ -z "$APP_ID" ]; then
    echo -e "${RED}✗${NC} Could not find FluxStudio app on DigitalOcean"
    echo "  Run ./scripts/deploy-to-app-platform.sh to create the app first"
    exit 1
fi

echo -e "${GREEN}✓${NC} Found app: $APP_ID"

# Trigger deployment
echo ""
echo "Triggering deployment..."
DEPLOY_OUTPUT=$(doctl apps create-deployment "$APP_ID" --format ID,Phase --no-header 2>&1)

if [ $? -eq 0 ]; then
    DEPLOY_ID=$(echo "$DEPLOY_OUTPUT" | awk '{print $1}')
    echo -e "${GREEN}✓${NC} Deployment triggered: $DEPLOY_ID"
    echo ""
    echo "Monitor with: doctl apps logs $APP_ID --follow"
    echo "Or visit: https://cloud.digitalocean.com/apps/$APP_ID/deployments"
else
    echo -e "${RED}✗${NC} Deployment failed:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi
