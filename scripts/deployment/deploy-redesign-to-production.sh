#!/bin/bash

# FluxStudio Redesign - Production Deployment Script
# Deploys the complete redesigned application to production

set -e  # Exit on any error

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║           FluxStudio Redesign - Production Deployment                       ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER="root@167.172.208.61"
DEPLOY_PATH="/var/www/fluxstudio"
BACKUP_PATH="/var/www/fluxstudio.backup.$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}📦 Step 1: Preparing deployment package...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if build exists
if [ ! -d "build" ]; then
    echo -e "${RED}✗ Build directory not found!${NC}"
    echo "  Please run 'npm run build' first"
    exit 1
fi

echo -e "${GREEN}✓${NC} Build directory found"

# Create deployment package
echo "  Creating deployment package..."
cd build
tar czf ../fluxstudio-redesign-production.tar.gz .
cd ..

if [ -f "fluxstudio-redesign-production.tar.gz" ]; then
    SIZE=$(du -h fluxstudio-redesign-production.tar.gz | cut -f1)
    echo -e "${GREEN}✓${NC} Package created: fluxstudio-redesign-production.tar.gz ($SIZE)"
else
    echo -e "${RED}✗ Failed to create deployment package${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📤 Step 2: Uploading to production server...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Upload package
echo "  Uploading to $SERVER..."
if scp fluxstudio-redesign-production.tar.gz "$SERVER:/tmp/" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Package uploaded successfully"
else
    echo -e "${RED}✗ Failed to upload package${NC}"
    echo "  Please check your SSH connection to $SERVER"
    exit 1
fi

echo ""
echo -e "${BLUE}💾 Step 3: Creating backup of current production...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create backup on server
ssh "$SERVER" << 'ENDSSH'
if [ -d "/var/www/fluxstudio" ]; then
    BACKUP_PATH="/var/www/fluxstudio.backup.$(date +%Y%m%d_%H%M%S)"
    echo "  Creating backup at $BACKUP_PATH..."
    cp -r /var/www/fluxstudio "$BACKUP_PATH"
    echo "  ✓ Backup created"
else
    echo "  ℹ No existing deployment to backup"
fi
ENDSSH

echo ""
echo -e "${BLUE}🚀 Step 4: Deploying new build...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Deploy on server
ssh "$SERVER" << 'ENDSSH'
# Create directory if it doesn't exist
mkdir -p /var/www/fluxstudio

# Remove old build files
echo "  Removing old build files..."
rm -rf /var/www/fluxstudio/*

# Extract new build
echo "  Extracting new build..."
cd /var/www/fluxstudio
tar xzf /tmp/fluxstudio-redesign-production.tar.gz

# Clean up
rm /tmp/fluxstudio-redesign-production.tar.gz

# Set permissions
chmod -R 755 /var/www/fluxstudio

echo "  ✓ Deployment complete"
ENDSSH

echo -e "${GREEN}✓${NC} New build deployed successfully"

echo ""
echo -e "${BLUE}🔄 Step 5: Restarting services...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Restart PM2 processes (if using PM2)
ssh "$SERVER" << 'ENDSSH'
if command -v pm2 &> /dev/null; then
    echo "  Restarting PM2 processes..."
    pm2 restart fluxstudio 2>/dev/null || echo "  ℹ No PM2 process named 'fluxstudio'"
    echo "  ✓ Services restarted"
else
    echo "  ℹ PM2 not installed, skipping restart"
fi
ENDSSH

echo ""
echo -e "${BLUE}✅ Step 6: Verifying deployment...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify deployment
ssh "$SERVER" << 'ENDSSH'
if [ -f "/var/www/fluxstudio/index.html" ]; then
    echo "  ✓ index.html found"
else
    echo "  ✗ index.html not found - deployment may have failed!"
    exit 1
fi

if [ -d "/var/www/fluxstudio/assets" ]; then
    ASSET_COUNT=$(ls -1 /var/www/fluxstudio/assets | wc -l)
    echo "  ✓ Assets directory found ($ASSET_COUNT files)"
else
    echo "  ✗ Assets directory not found - deployment may have failed!"
    exit 1
fi
ENDSSH

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    🎉 DEPLOYMENT SUCCESSFUL! 🎉                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ FluxStudio redesign has been deployed to production!${NC}"
echo ""
echo "📊 Deployment Summary:"
echo "  • Server: $SERVER"
echo "  • Path: $DEPLOY_PATH"
echo "  • Backup: Created automatically"
echo "  • Services: Restarted"
echo ""
echo "🔍 Next Steps:"
echo "  1. Visit https://fluxstudio.art to verify deployment"
echo "  2. Test all 6 redesigned pages:"
echo "     - /home (Dashboard)"
echo "     - /projects (Projects management)"
echo "     - /file (File browser)"
echo "     - /messages (Chat interface)"
echo "     - /team (Team management)"
echo "     - /organization (Organization dashboard)"
echo "  3. Monitor server logs:"
echo "     ssh $SERVER \"pm2 logs fluxstudio\""
echo "  4. Check error logs if any issues occur"
echo ""
echo "📚 Documentation:"
echo "  • README_REDESIGN.md - Overview"
echo "  • DEPLOYMENT_GUIDE_REDESIGN.md - Deployment guide"
echo "  • QUICK_REFERENCE.md - Component reference"
echo ""
echo "🔙 Rollback (if needed):"
echo "  ssh $SERVER"
echo "  cd /var/www"
echo "  rm -rf fluxstudio"
echo "  mv fluxstudio.backup.* fluxstudio"
echo "  pm2 restart fluxstudio"
echo ""
echo -e "${GREEN}🚀 Deployment complete! Enjoy the new FluxStudio design!${NC}"
echo ""
